import { useMemo, useState } from "react"
import {
  RefreshControl,
  SectionList,
  Text,
  View,
} from "react-native"
import { useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { useQuery } from "@tanstack/react-query"
import { Spinner } from "heroui-native"

import { AgentCard } from "@/components/AgentCard"
import { AgentFilters } from "@/components/AgentFilters"
import { CreateAgentSheet } from "@/components/CreateAgentSheet"
import { Fab } from "@/components/Fab"
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

  if (isPending) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <Spinner />
      </SafeAreaView>
    )
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-background px-6 pt-12">
        <Text className="text-2xl font-semibold text-foreground mb-2">
          Couldn’t load agents
        </Text>
        <Text className="text-muted-foreground">
          {(error as Error).message}
        </Text>
      </SafeAreaView>
    )
  }

  const total = data?.agents.length ?? 0
  const visible = sections.reduce((sum, s) => sum + s.data.length, 0)

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="px-6 pt-4 pb-2">
        <Text className="text-3xl font-semibold text-foreground">Agents</Text>
        <Text className="text-sm text-muted-foreground mt-1">
          {visible}
          {visible !== total ? ` of ${total}` : ""} cloud agents
        </Text>
      </View>

      <View className="pb-2">
        <AgentFilters
          groupBy={groupBy}
          onGroupByChange={setGroupBy}
          filter={filter}
          onFilterChange={setFilter}
        />
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 96 }}
        stickySectionHeadersEnabled
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
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
      <Fab onPress={() => setSheetOpen(true)} />
      <CreateAgentSheet isOpen={sheetOpen} onOpenChange={setSheetOpen} />
    </SafeAreaView>
  )
}
