import { listArtifactsForAgent } from "./artifacts"
import { cursorJson } from "./client"
import {
  asRecord,
  extractArray,
  firstRecord,
  firstReposEntry,
  firstString,
  firstStringFromArray,
  firstTimestamp,
  normalizeAgentStatus,
  type UnknownRecord,
} from "./normalize"
import {
  labelFromRepositoryString,
  labelFromRepositoryUrl,
  normalizeRepositoryListUrl,
  resolveRepository,
} from "./repos"
import { listRunsForAgent } from "./runs"
import type {
  AgentCard,
  AgentListResponse,
  CreateAgentInput,
  CreateAgentResponse,
  RunSummary,
} from "./types"

export async function listCloudAgents(
  apiKey: string,
  options: {
    cursor?: string
    includeArchived?: boolean
    limit?: number
    prUrl?: string
  } = {}
): Promise<AgentListResponse> {
  const params = new URLSearchParams()
  params.set("limit", String(options.limit ?? 50))
  if (options.cursor) params.set("cursor", options.cursor)
  if (options.prUrl) params.set("prUrl", options.prUrl)
  if (options.includeArchived) params.set("includeArchived", "true")

  const response = asRecord(
    await cursorJson(apiKey, `/agents?${params.toString()}`)
  )
  const rawAgents = extractArray(response, ["items", "agents", "data"])

  const agents = await Promise.all(
    rawAgents.map(async (rawAgent) => {
      const card = normalizeAgent(rawAgent)
      const [runs, artifacts] = await Promise.all([
        listRunsForAgent(apiKey, card.id).catch(() => []),
        listArtifactsForAgent(apiKey, card.id).catch(() => []),
      ])
      enrichAgentCardFromRuns(card, runs)
      card.artifacts = artifacts
      return card
    })
  )

  return {
    agents,
    nextCursor: firstString(response, ["nextCursor", "next_cursor", "cursor"]),
  }
}

export async function getCloudAgent(
  apiKey: string,
  agentId: string
): Promise<{ agent: AgentCard; runs: RunSummary[] }> {
  const [agentRecord, runs, artifacts] = await Promise.all([
    cursorJson(apiKey, `/agents/${encodeURIComponent(agentId)}`).catch(() => ({})),
    listRunsForAgent(apiKey, agentId).catch(() => []),
    listArtifactsForAgent(apiKey, agentId).catch(() => []),
  ])

  const card = normalizeAgent(agentRecord)
  enrichAgentCardFromRuns(card, runs)
  card.artifacts = artifacts
  return { agent: card, runs }
}

export async function createCloudAgent(
  apiKey: string,
  input: CreateAgentInput
): Promise<CreateAgentResponse> {
  const prompt = input.prompt.trim()
  if (!prompt) {
    throw new Error("A prompt is required to create a cloud agent.")
  }

  const repository = await resolveRepository(apiKey, input.repositoryId)

  const body: UnknownRecord = {
    prompt: { text: prompt },
    repos: [
      {
        url: repository.url,
        ...(input.branch?.trim() ? { startingRef: input.branch.trim() } : {}),
      },
    ],
    autoCreatePR: input.autoCreatePR ?? true,
  }

  if (input.modelId && input.modelId !== "auto") {
    body.model = { id: input.modelId }
  }

  if (input.name?.trim()) {
    body.name = input.name.trim()
  }

  const response = asRecord(
    await cursorJson(apiKey, "/agents", {
      method: "POST",
      body: JSON.stringify(body),
    })
  )

  const rawAgent =
    (response.agent && typeof response.agent === "object" ? response.agent : response) ??
    response
  const card = normalizeAgent(rawAgent)
  card.repository = repository.label
  card.repositoryUrl = repository.url
  card.branch = input.branch?.trim() || repository.defaultBranch
  card.latestMessage = prompt
  card.artifacts = []

  return { agent: card }
}

export async function archiveAgent(apiKey: string, agentId: string): Promise<void> {
  await cursorJson(apiKey, `/agents/${encodeURIComponent(agentId)}/archive`, {
    method: "POST",
  })
}

export async function unarchiveAgent(apiKey: string, agentId: string): Promise<void> {
  await cursorJson(apiKey, `/agents/${encodeURIComponent(agentId)}/unarchive`, {
    method: "POST",
  })
}

export async function deleteAgent(apiKey: string, agentId: string): Promise<void> {
  await cursorJson(apiKey, `/agents/${encodeURIComponent(agentId)}`, {
    method: "DELETE",
  })
}

export function normalizeAgent(rawAgent: unknown): AgentCard {
  const record = asRecord(rawAgent)
  const id =
    firstString(record, ["id", "agentId", "uuid"]) ??
    `agent-${Math.random().toString(36).slice(2, 10)}`
  const status =
    normalizeAgentStatus(record) ?? normalizeAgentStatus(asRecord(record.latestRun))
  const repositoryRecord = firstRecord(record, ["repository", "repo", "cloud"])
  const repoStringFromArray = firstReposEntry(record.repos)
  const repoString = firstStringFromArray(record.repos)
  const repositoryUrl =
    firstString(record, ["repositoryUrl", "repoUrl"]) ??
    firstString(repositoryRecord, ["url", "htmlUrl", "remoteUrl"]) ??
    firstString(repoStringFromArray, ["url", "htmlUrl"]) ??
    normalizeRepositoryListUrl(repoString)
  const repository =
    firstString(record, ["repository", "repo", "repoName"]) ??
    firstString(repositoryRecord, ["fullName", "name", "slug"]) ??
    firstString(repoStringFromArray, ["fullName", "slug", "name"]) ??
    (repoString ? labelFromRepositoryString(repoString) : undefined) ??
    (repositoryUrl ? labelFromRepositoryUrl(repositoryUrl) : "No repository")
  const userRecord = firstRecord(record, ["createdBy", "user", "owner"])
  const createdAt = firstTimestamp(record, ["createdAt", "created_at"])
  const updatedAt =
    firstTimestamp(record, [
      "lastModified",
      "updatedAt",
      "updated_at",
      "lastActivityAt",
    ]) ?? firstTimestamp(asRecord(record.latestRun), ["updatedAt", "completedAt"])

  return {
    id,
    title:
      firstString(record, ["name", "title", "summary"]) ??
      `Agent ${id.slice(0, 8)}`,
    status: status ?? (record.archived === true ? "archived" : "no_status"),
    latestRunId: undefined,
    durationMs: undefined,
    repository,
    repositoryUrl,
    branch:
      firstString(record, ["branch", "branchName", "startingRef", "ref"]) ??
      firstString(repositoryRecord, ["branch", "startingRef", "defaultBranch"]) ??
      firstString(repoStringFromArray, ["branch", "startingRef"]),
    createdBy:
      firstString(userRecord, ["name", "email", "username"]) ??
      firstString(record, ["createdBy"]),
    createdAt,
    updatedAt,
    prUrl:
      firstString(record, ["prUrl", "pullRequestUrl"]) ??
      firstString(asRecord(record.pullRequest), ["url", "htmlUrl"]),
    latestMessage:
      firstString(record, [
        "latestMessage",
        "lastMessage",
        "prompt",
        "description",
      ]) ?? firstString(asRecord(record.latestRun), ["summary", "statusText"]),
    artifacts: [],
  }
}

export function enrichAgentCardFromRuns(card: AgentCard, runs: RunSummary[]) {
  const latestRun = runs[0]
  if (!latestRun) {
    return
  }

  if (card.status !== "archived" && latestRun.status) {
    card.status = latestRun.status
  }

  card.latestRunId = latestRun.id
  card.durationMs = latestRun.durationMs
  card.updatedAt = card.updatedAt ?? latestRun.createdAt
  card.latestMessage = card.latestMessage ?? latestRun.result

  if (latestRun.branch) {
    card.branch = latestRun.branch
  }

  if (latestRun.prUrl) {
    card.prUrl = latestRun.prUrl
  }

  if (latestRun.repoUrl) {
    const normalized = normalizeRepositoryListUrl(latestRun.repoUrl)
    if (normalized) card.repositoryUrl = normalized
    card.repository = labelFromRepositoryString(latestRun.repoUrl)
  }
}
