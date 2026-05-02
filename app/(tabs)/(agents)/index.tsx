import { useQuery } from "@tanstack/react-query"
import { Stack, useRouter } from "expo-router"
import { Spinner } from "heroui-native"
import { useMemo, useState } from "react"
import {
  Pressable,
  RefreshControl,
  SectionList,
  Text,
  View,
} from "react-native"

import { Plus } from "lucide-react-native"

import { AgentCard } from "@/components/AgentCard"
import { AgentFilters } from "@/components/AgentFilters"
import { CreateAgentSheet } from "@/components/CreateAgentSheet"
import { listAgents } from "@/lib/api/agents"
import {
  filterAgents,
  groupAgents,
  type Filter,
  type GroupBy,
} from "@/lib/utils/agents"

export default function AgentsScreen() {
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [groupBy, setGroupBy] = useState<GroupBy>("status")
  const [filter, setFilter] = useState<Filter>("all")

  const { data, isPending, error, refetch } = useQuery({
    queryKey: ["agents"],
    queryFn: () => listAgents(),
    refetchInterval: 30_000,
  })

  const sections = useMemo(() => {
    const filtered = filterAgents(data?.agents ?? [], filter)
    return groupAgents(filtered, groupBy)
  }, [data?.agents, filter, groupBy])

  const onRefresh = async () => {
    setRefreshing(true)
    try {
      await refetch()
    } finally {
      setRefreshing(false)
    }
  }

  const total = data?.agents.length ?? 0
  const visible = sections.reduce((sum, s) => sum + s.data.length, 0)

  return (
    <>
      <Stack.Screen
        options={{
          title: "Agents",
          headerLargeTitle: true,
          headerRight: () => (
            <Pressable
              onPress={() => setSheetOpen(true)}
              hitSlop={12}
              accessibilityLabel="Create Agent"
              className="w-9  items-center justify-center"
            >
              <Plus size={24} className="text-foreground" />
            </Pressable>
          ),
        }}
      />

      {isPending ? (
        <View className="flex-1 items-center justify-center bg-background">
          <Spinner />
        </View>
      ) : error ? (
        <View className="flex-1 bg-background px-6 pt-6">
          <Text className="text-2xl font-semibold text-foreground mb-2">
            Couldn’t load agents
          </Text>
          <Text className="text-muted-foreground">
            {(error as Error).message}
          </Text>
        </View>
      ) : (
        <SectionList
          contentInsetAdjustmentBehavior="automatic"
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}
          stickySectionHeadersEnabled
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListHeaderComponent={
            <View className="pb-2 gap-3">
              <Text className="text-sm text-muted-foreground">
                {visible}
                {visible !== total ? ` of ${total}` : ""} cloud agents
              </Text>
              <AgentFilters
                groupBy={groupBy}
                onGroupByChange={setGroupBy}
                filter={filter}
                onFilterChange={setFilter}
              />
            </View>
          }
          renderSectionHeader={({ section }) => (
            <View className="bg-background py-2">
              <Text className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                {section.title} · {section.data.length}
              </Text>
            </View>
          )}
          renderItem={({ item }) => (
            <AgentCard
              agent={item}
              onPress={(agent) => router.push(`/agent/${agent.id}`)}
            />
          )}
          ListEmptyComponent={
            <View className="items-center mt-16 px-6">
              <Text className="text-base font-semibold text-foreground mb-2">
                {total === 0 ? "No agents yet" : "Nothing matches"}
              </Text>
              <Text className="text-sm text-muted-foreground text-center">
                {total === 0
                  ? "Tap + to create your first cloud agent."
                  : "Try a different filter."}
              </Text>
            </View>
          }
        />
      )}

      <CreateAgentSheet isOpen={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  )
}
