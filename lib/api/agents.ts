import { apiFetch } from "@/lib/api/client"
import type {
  AgentDetailResponse,
  AgentListResponse,
  CreateAgentInput,
  CreateAgentResponse,
  ListResult,
  ModelOption,
  RepositoryOption,
  RunSummary,
  SendFollowupResponse,
} from "@/lib/cursor/types"

export function listAgents(params?: {
  cursor?: string
  includeArchived?: boolean
}): Promise<AgentListResponse> {
  const search = new URLSearchParams()
  if (params?.cursor) search.set("cursor", params.cursor)
  if (params?.includeArchived) search.set("includeArchived", "true")
  const qs = search.toString()
  return apiFetch<AgentListResponse>(`/api/agents${qs ? `?${qs}` : ""}`)
}

export function getAgent(id: string): Promise<AgentDetailResponse> {
  return apiFetch<AgentDetailResponse>(
    `/api/agents/${encodeURIComponent(id)}`
  )
}

export function createAgent(
  input: CreateAgentInput
): Promise<CreateAgentResponse> {
  return apiFetch<CreateAgentResponse>("/api/agents", {
    method: "POST",
    body: input,
  })
}

export function deleteAgent(id: string): Promise<void> {
  return apiFetch<void>(`/api/agents/${encodeURIComponent(id)}`, {
    method: "DELETE",
  })
}

export function archiveAgent(id: string): Promise<{ archived: boolean }> {
  return apiFetch<{ archived: boolean }>(
    `/api/agents/${encodeURIComponent(id)}/archive`,
    { method: "POST" }
  )
}

export function unarchiveAgent(id: string): Promise<{ archived: boolean }> {
  return apiFetch<{ archived: boolean }>(
    `/api/agents/${encodeURIComponent(id)}/unarchive`,
    { method: "POST" }
  )
}

export function sendFollowup(
  id: string,
  prompt: string
): Promise<SendFollowupResponse> {
  return apiFetch<SendFollowupResponse>(
    `/api/agents/${encodeURIComponent(id)}/followups`,
    {
      method: "POST",
      body: { prompt },
    }
  )
}

export function listRuns(
  agentId: string,
  params?: { cursor?: string; limit?: number }
): Promise<ListResult<RunSummary>> {
  const search = new URLSearchParams()
  if (params?.cursor) search.set("cursor", params.cursor)
  if (params?.limit) search.set("limit", String(params.limit))
  const qs = search.toString()
  return apiFetch<ListResult<RunSummary>>(
    `/api/agents/${encodeURIComponent(agentId)}/runs${qs ? `?${qs}` : ""}`
  )
}

export function cancelRun(agentId: string, runId: string): Promise<{ cancelled: boolean }> {
  return apiFetch<{ cancelled: boolean }>(
    `/api/agents/${encodeURIComponent(agentId)}/runs/${encodeURIComponent(runId)}/cancel`,
    { method: "POST" }
  )
}

export function getRepositories(): Promise<{ repositories: RepositoryOption[] }> {
  return apiFetch<{ repositories: RepositoryOption[] }>("/api/repositories")
}

export function getModels(): Promise<{ models: ModelOption[] }> {
  return apiFetch<{ models: ModelOption[] }>("/api/models")
}
