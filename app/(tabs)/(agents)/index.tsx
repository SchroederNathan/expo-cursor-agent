import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import { Stack, useRouter } from "expo-router"
import {
  Alert,
  Button,
  Card,
  Chip,
  PressableFeedback,
  SkeletonGroup,
} from "heroui-native"
import { useMemo, useState } from "react"
import { ActivityIndicator, RefreshControl, SectionList, Text, View } from "react-native"

import { Plus } from "lucide-react-native"

import { AgentFilters } from "@/components/AgentFilters"
import { CreateAgentSheet } from "@/components/CreateAgentSheet"
import { SwipeableAgentRow } from "@/components/SwipeableAgentRow"
import {
  archiveAgent,
  deleteAgent,
  listAgents,
  unarchiveAgent,
} from "@/lib/api/agents"
import type { AgentCard as AgentCardType } from "@/lib/cursor/types"
import {
  filterAgents,
  groupAgents,
  type Filter,
  type GroupBy,
} from "@/lib/utils/agents"

function isArchived(status: string | undefined) {
  return status?.toLowerCase() === "archived"
}

export default function AgentsScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [refreshing, setRefreshing] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [groupBy, setGroupBy] = useState<GroupBy>("status")
  const [filter, setFilter] = useState<Filter>("all")

  const {
    data,
    isPending,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["agents"],
    queryFn: ({ pageParam }) =>
      listAgents({ cursor: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor,
    refetchInterval: 30_000,
  })

  const agents = useMemo(
    () => data?.pages.flatMap((p) => p.agents) ?? [],
    [data]
  )

  const sections = useMemo(() => {
    const filtered = filterAgents(agents, filter)
    return groupAgents(filtered, groupBy)
  }, [agents, filter, groupBy])

  const archiveMutation = useMutation({
    mutationFn: (agent: AgentCardType) =>
      isArchived(agent.status) ? unarchiveAgent(agent.id) : archiveAgent(agent.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["agents"] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (agent: AgentCardType) => deleteAgent(agent.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["agents"] }),
  })

  const onRefresh = async () => {
    setRefreshing(true)
    try {
      await refetch()
    } finally {
      setRefreshing(false)
    }
  }

  const total = agents.length

  return (
    <>
      <Stack.Screen
        options={{
          title: "Agents",
          headerLargeTitle: true,
          headerRight: () => (
            <PressableFeedback
              onPress={() => setSheetOpen(true)}
              hitSlop={12}
              accessibilityLabel="Create Agent"
              className="w-9 h-9 items-center justify-center"
            >
              <Plus size={24} className="text-foreground" />
            </PressableFeedback>
          ),
        }}
      />

      {isPending ? (
        <AgentsLoadingState />
      ) : error ? (
        <AgentsErrorState
          message={(error as Error).message}
          onRetry={() => refetch()}
        />
      ) : (
        <SectionList
          contentInsetAdjustmentBehavior="automatic"
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32, overflow: "visible" }}
          stickySectionHeadersEnabled
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage()
          }}
          ListHeaderComponent={
            <View className="pb-3 -mx-6 pt-2">
              <AgentFilters
                groupBy={groupBy}
                onGroupByChange={setGroupBy}
                filter={filter}
                onFilterChange={setFilter}
              />
            </View>
          }
          renderSectionHeader={({ section }) => (
            <View className="pt-3 pb-2 flex-row items-center gap-2">
              <Text className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                {section.title}
              </Text>
              <Chip variant="soft" color="default" size="sm">
                <Chip.Label>{section.data.length}</Chip.Label>
              </Chip>
            </View>
          )}
          renderItem={({ item }) => (
            <SwipeableAgentRow
              agent={item}
              onPress={(agent) => router.push(`/agent/${agent.id}`)}
              onArchive={(agent) => archiveMutation.mutate(agent)}
              onDelete={(agent) => deleteMutation.mutate(agent)}
            />
          )}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View className="py-4 items-center">
                <ActivityIndicator />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <AgentsEmptyState
              total={total}
              onCreate={() => setSheetOpen(true)}
            />
          }
        />
      )}

      <CreateAgentSheet isOpen={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  )
}

function AgentsLoadingState() {
  return (
    <View
      className="flex-1 bg-background px-6 pt-4 gap-3"
      pointerEvents="none"
    >
      <SkeletonGroup isLoading isSkeletonOnly className="gap-3">
        <SkeletonGroup.Item className="h-16 rounded-2xl" />
        <View className="gap-3 pt-1">
          {[0, 1, 2].map((i) => (
            <Card key={i} variant="default">
              <Card.Header className="flex-row items-start gap-3">
                <SkeletonGroup.Item className="h-8 w-8 rounded-full" />
                <View className="flex-1 gap-2">
                  <SkeletonGroup.Item className="h-4 w-3/4 rounded-md" />
                  <SkeletonGroup.Item className="h-3 w-1/2 rounded-md" />
                </View>
                <SkeletonGroup.Item className="h-5 w-14 rounded-full" />
              </Card.Header>
              <Card.Body className="gap-2 pt-3">
                <SkeletonGroup.Item className="h-3 w-full rounded-md" />
                <SkeletonGroup.Item className="h-3 w-2/3 rounded-md" />
              </Card.Body>
            </Card>
          ))}
        </View>
      </SkeletonGroup>
    </View>
  )
}

function AgentsErrorState({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <View className="flex-1 bg-background px-6 pt-6">
      <Alert status="danger">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>Couldn’t load agents</Alert.Title>
          <Alert.Description>{message}</Alert.Description>
        </Alert.Content>
        <Button size="sm" variant="danger" onPress={onRetry}>
          <Button.Label>Retry</Button.Label>
        </Button>
      </Alert>
    </View>
  )
}

function AgentsEmptyState({
  total,
  onCreate,
}: {
  total: number
  onCreate: () => void
}) {
  const isInitial = total === 0
  return (
    <View className="items-center mt-16 px-6 gap-3">
      <Text className="text-base font-semibold text-foreground">
        {isInitial ? "No agents yet" : "Nothing matches"}
      </Text>
      <Text className="text-sm text-muted-foreground text-center">
        {isInitial
          ? "Spin up your first cloud agent to get started."
          : "Try a different filter."}
      </Text>
      {isInitial ? (
        <Button variant="primary" onPress={onCreate} className="mt-2">
          <Plus size={16} className="text-accent-foreground" />
          <Button.Label>New agent</Button.Label>
        </Button>
      ) : null}
    </View>
  )
}
