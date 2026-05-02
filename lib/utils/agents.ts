import type { AgentCard } from "@/lib/cursor/types"
import { formatStatusLabel } from "@/components/StatusChip"

export type GroupBy = "status" | "repo" | "date"
export type Filter = "all" | "withArtifacts" | "prAgents" | "recentlyActive"

const DATE_BUCKET_ORDER = new Map<string, number>([
  ["Today", 0],
  ["Yesterday", 1],
  ["This week", 2],
  ["This month", 3],
  ["Older", 4],
  ["No date", 5],
])

const STATUS_ORDER = [
  "Running",
  "Creating",
  "In Progress",
  "Queued",
  "Pending",
  "Finished",
  "Completed",
  "Cancelled",
  "Expired",
  "Failed",
  "Error",
  "Archived",
  "No Status",
]

function dateBucket(value: string | undefined): string {
  if (!value) return "No date"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "No date"

  const diffMs = Date.now() - date.getTime()
  const diffDays = Math.floor(diffMs / 86_400_000)

  if (diffDays <= 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return "This week"
  if (diffDays < 30) return "This month"
  return "Older"
}

function groupTitle(agent: AgentCard, groupBy: GroupBy): string {
  if (groupBy === "date") return dateBucket(agent.updatedAt ?? agent.createdAt)
  if (groupBy === "status") return formatStatusLabel(agent.status)
  return agent.repository || "Unassigned"
}

function groupRank(title: string, groupBy: GroupBy): number {
  if (groupBy === "date") {
    return DATE_BUCKET_ORDER.get(title) ?? DATE_BUCKET_ORDER.size
  }
  if (groupBy === "status") {
    const idx = STATUS_ORDER.indexOf(title)
    return idx === -1 ? STATUS_ORDER.length : idx
  }
  return 0
}

export function groupAgents(
  agents: AgentCard[],
  groupBy: GroupBy
): { title: string; data: AgentCard[] }[] {
  const groups = new Map<string, AgentCard[]>()
  for (const agent of agents) {
    const title = groupTitle(agent, groupBy)
    const list = groups.get(title) ?? []
    list.push(agent)
    groups.set(title, list)
  }
  return Array.from(groups.entries())
    .map(([title, data]) => ({ title, data }))
    .sort(
      (a, b) =>
        groupRank(a.title, groupBy) - groupRank(b.title, groupBy) ||
        a.title.localeCompare(b.title)
    )
}

export function filterAgents(agents: AgentCard[], filter: Filter): AgentCard[] {
  if (filter === "withArtifacts") {
    return agents.filter((a) => a.artifacts.length > 0)
  }
  if (filter === "prAgents") {
    return agents.filter((a) => Boolean(a.prUrl))
  }
  if (filter === "recentlyActive") {
    return agents.filter((a) => isRecentlyActive(a.updatedAt ?? a.createdAt))
  }
  return agents
}

function isRecentlyActive(value: string | undefined): boolean {
  if (!value) return false
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false
  const diffMs = Date.now() - date.getTime()
  return diffMs >= 0 && diffMs <= 86_400_000
}
