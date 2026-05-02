import { ScrollView, View } from "react-native"
import { TagGroup } from "heroui-native"

import type { Filter, GroupBy } from "@/lib/utils/agents"

type Props = {
  groupBy: GroupBy
  onGroupByChange: (groupBy: GroupBy) => void
  filter: Filter
  onFilterChange: (filter: Filter) => void
}

export function AgentFilters({
  groupBy,
  onGroupByChange,
  filter,
  onFilterChange,
}: Props) {
  return (
    <View className="gap-3">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingHorizontal: 24 }}
      >
        <TagGroup
          selectionMode="single"
          selectedKeys={new Set([groupBy])}
          onSelectionChange={(keys) => {
            const next = Array.from(keys)[0] as GroupBy | undefined
            if (next) onGroupByChange(next)
          }}
        >
          <TagGroup.List>
            <TagGroup.Item id="status">By status</TagGroup.Item>
            <TagGroup.Item id="repo">By repo</TagGroup.Item>
            <TagGroup.Item id="date">By date</TagGroup.Item>
          </TagGroup.List>
        </TagGroup>
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingHorizontal: 24 }}
      >
        <TagGroup
          selectionMode="single"
          selectedKeys={new Set([filter])}
          onSelectionChange={(keys) => {
            const next = Array.from(keys)[0] as Filter | undefined
            if (next) onFilterChange(next)
          }}
        >
          <TagGroup.List>
            <TagGroup.Item id="all">All</TagGroup.Item>
            <TagGroup.Item id="withArtifacts">With artifacts</TagGroup.Item>
            <TagGroup.Item id="prAgents">PR open</TagGroup.Item>
            <TagGroup.Item id="recentlyActive">Last 24h</TagGroup.Item>
          </TagGroup.List>
        </TagGroup>
      </ScrollView>
    </View>
  )
}
