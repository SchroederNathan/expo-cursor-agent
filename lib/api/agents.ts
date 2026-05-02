import { apiFetch } from "@/lib/api/client"
import type {
  AgentDetailResponse,
  AgentListResponse,
  CreateAgentInput,
  CreateAgentResponse,
  ModelOption,
  RepositoryOption,
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

export function getRepositories(): Promise<{ repositories: RepositoryOption[] }> {
  return apiFetch<{ repositories: RepositoryOption[] }>("/api/repositories")
}

export function getModels(): Promise<{ models: ModelOption[] }> {
  return apiFetch<{ models: ModelOption[] }>("/api/models")
}
