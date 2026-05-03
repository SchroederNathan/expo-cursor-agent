export type PublicUser = {
  name: string
  email?: string
}

export type ModelOption = {
  id: string
  label: string
  description?: string
}

export type RepositoryOption = {
  id: string
  label: string
  url: string
  owner?: string
  name?: string
  defaultBranch?: string
}

export type ArtifactPreview = {
  path: string
  name: string
  size?: number
  contentType?: string
  mediaUrl?: string
  previewKind: "image" | "video" | "file"
}

// SDK-shaped canonical types
//
// These mirror @cursor/sdk's runtime types so the app speaks the same vocabulary as
// the SDK even though it talks to api.cursor.com directly. If a future task adds a
// Node sidecar that imports the real SDK, the swap should be local to the fetch
// URLs in lib/cursor/{agents,runs,followups}.ts.
export type RunStatus =
  | "CREATING"
  | "RUNNING"
  | "FINISHED"
  | "ERROR"
  | "CANCELLED"
  | "EXPIRED"

export type ToolCallStatus = "started" | "running" | "completed" | "failed"

export type ToolCall = {
  name: string
  args?: unknown
  result?: unknown
  status?: ToolCallStatus
}

export type AgentConversationTurn = {
  kind: "agent"
  role: "user" | "assistant" | "system"
  text: string
  toolCalls: ToolCall[]
  createdAt?: string
}

export type ShellConversationTurn = {
  kind: "shell"
  command: string
  output?: string
  exitCode?: number
  durationMs?: number
  createdAt?: string
}

export type ConversationTurn = AgentConversationTurn | ShellConversationTurn

// Discriminated union mirroring the SDK's run.stream() events. We don't emit
// these from the REST proxy yet, but consumers (e.g. a future SSE route) can
// project polled state into this shape so the client side stays SDK-shaped.
export type SDKMessage =
  | { type: "system"; payload: { model?: string; tools?: string[] } }
  | { type: "user"; text: string }
  | { type: "assistant"; text: string; appended?: string }
  | { type: "thinking"; text: string }
  | { type: "tool_call"; name: string; status: ToolCallStatus; args?: unknown; result?: unknown }
  | { type: "status"; status: RunStatus; durationMs?: number }
  | { type: "task"; title: string; status?: ToolCallStatus }
  | { type: "request"; prompt: string }

export type ListResult<T> = {
  items: T[]
  nextCursor?: string
}

export type AgentCard = {
  id: string
  title: string
  status: string
  latestRunId?: string
  durationMs?: number
  repository: string
  repositoryUrl?: string
  branch?: string
  createdBy?: string
  createdAt?: string
  updatedAt?: string
  prUrl?: string
  latestMessage?: string
  artifacts: ArtifactPreview[]
}

export type RunSummary = {
  id?: string
  status?: string
  createdAt?: string
  durationMs?: number
  result?: string
  branch?: string
  prUrl?: string
  repoUrl?: string
}

export type Run = RunSummary & {
  agentId: string
}

export type AgentListResponse = {
  agents: AgentCard[]
  nextCursor?: string
}

export type AgentDetailResponse = {
  agent: AgentCard
  runs: RunSummary[]
}

export type CreateAgentInput = {
  name?: string
  prompt: string
  repositoryId: string
  modelId?: string
  branch?: string
  autoCreatePR?: boolean
}

export type CreateAgentResponse = {
  agent: AgentCard
}

export type SendFollowupInput = {
  prompt: string
}

export type SendFollowupResponse = {
  run: RunSummary | null
}

export type ConversationResponse = {
  turns: ConversationTurn[]
}
