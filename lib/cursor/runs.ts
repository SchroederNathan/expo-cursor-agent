import { cursorJson } from "./client"
import {
  asRecord,
  extractArray,
  firstNumber,
  firstRecordFromArray,
  firstString,
  firstTimestamp,
  normalizeAgentStatus,
} from "./normalize"
import type { ListResult, Run, RunSummary } from "./types"

export async function listRunsForAgent(
  apiKey: string,
  agentId: string,
  options: { limit?: number; cursor?: string } = {}
): Promise<RunSummary[]> {
  const result = await listRuns(apiKey, agentId, options)
  return result.items
}

export async function listRuns(
  apiKey: string,
  agentId: string,
  options: { limit?: number; cursor?: string } = {}
): Promise<ListResult<RunSummary>> {
  try {
    const params = new URLSearchParams()
    params.set("limit", String(options.limit ?? 10))
    if (options.cursor) params.set("cursor", options.cursor)

    const response = asRecord(
      await cursorJson(
        apiKey,
        `/agents/${encodeURIComponent(agentId)}/runs?${params.toString()}`
      )
    )
    const rawRuns = extractArray(response, ["items", "runs", "data", "results"])
    return {
      items: rawRuns.map(normalizeRun),
      nextCursor: firstString(response, ["nextCursor", "next_cursor", "cursor"]),
    }
  } catch {
    return { items: [] }
  }
}

export async function getRun(
  apiKey: string,
  agentId: string,
  runId: string
): Promise<Run | null> {
  try {
    const record = asRecord(
      await cursorJson(
        apiKey,
        `/agents/${encodeURIComponent(agentId)}/runs/${encodeURIComponent(runId)}`
      )
    )
    const summary = normalizeRun(record)
    return {
      ...summary,
      agentId,
    }
  } catch {
    return null
  }
}

export async function cancelRun(
  apiKey: string,
  agentId: string,
  runId: string
): Promise<void> {
  await cursorJson(
    apiKey,
    `/agents/${encodeURIComponent(agentId)}/runs/${encodeURIComponent(runId)}/cancel`,
    { method: "POST" }
  )
}

export function normalizeRun(rawRun: unknown): RunSummary {
  const record = asRecord(rawRun)
  const gitRecord = asRecord(record.git ?? record._git)
  const branchRecord = firstRecordFromArray(gitRecord.branches)

  return {
    id: firstString(record, ["id", "runId"]),
    status: normalizeAgentStatus(record),
    createdAt: firstTimestamp(record, ["createdAt", "created_at"]),
    durationMs: firstNumber(record, ["durationMs", "_durationMs"]),
    result: firstString(record, ["result", "_result"]),
    branch: firstString(branchRecord, ["branch", "name"]),
    prUrl: firstString(branchRecord, ["prUrl", "pullRequestUrl"]),
    repoUrl: firstString(branchRecord, ["repoUrl", "repositoryUrl"]),
  }
}

