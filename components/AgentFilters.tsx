import { ScrollView, Text, View } from "react-native"
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
      <FilterRow label="Group by">
        <TagGroup
          selectionMode="single"
          selectedKeys={new Set([groupBy])}
          onSelectionChange={(keys) => {
            const next = Array.from(keys)[0] as GroupBy | undefined
            if (next) onGroupByChange(next)
          }}
        >
          <TagGroup.List>
            <TagGroup.Item id="status">Status</TagGroup.Item>
            <TagGroup.Item id="repo">Repo</TagGroup.Item>
            <TagGroup.Item id="date">Date</TagGroup.Item>
          </TagGroup.List>
        </TagGroup>
      </FilterRow>

      <FilterRow label="Filter">
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
      </FilterRow>
    </View>
  )
}

function FilterRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <View className="gap-1.5">
      <Text className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold px-6">
        {label}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingHorizontal: 24 }}
      >
        {children}
      </ScrollView>
    </View>
  )
}
