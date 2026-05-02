import type {
  AgentCard,
  AgentListResponse,
  ArtifactPreview,
  CreateAgentInput,
  CreateAgentResponse,
  ModelOption,
  PublicUser,
  RepositoryOption,
  RunSummary,
} from "./types"

const CURSOR_API_BASE = "https://api.cursor.com/v1"

type UnknownRecord = Record<string, unknown>

export class MissingCursorApiKeyError extends Error {
  readonly code = "missing_api_key"

  constructor(message = "Enter a Cursor API key to continue.") {
    super(message)
    this.name = "MissingCursorApiKeyError"
  }
}

export class InvalidCursorApiKeyError extends Error {
  readonly code = "invalid_api_key"

  constructor(message = "The Cursor API key could not be validated.") {
    super(message)
    this.name = "InvalidCursorApiKeyError"
  }
}

export function requireApiKey(request: Request): string {
  const header = request.headers.get("authorization") ?? ""
  const match = header.match(/^Bearer\s+(.+)$/i)
  const apiKey = match?.[1]?.trim()
  if (!apiKey) {
    throw new MissingCursorApiKeyError()
  }
  return apiKey
}

function basicAuthHeader(apiKey: string): string {
  const encoded =
    typeof Buffer !== "undefined"
      ? Buffer.from(`${apiKey}:`).toString("base64")
      : btoa(`${apiKey}:`)
  return `Basic ${encoded}`
}

async function cursorFetch(
  apiKey: string,
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(init.headers)
  headers.set("Authorization", basicAuthHeader(apiKey))
  headers.set("Accept", "application/json")
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }

  const response = await fetch(`${CURSOR_API_BASE}${path}`, {
    ...init,
    headers,
  })

  if (response.status === 401) {
    throw new InvalidCursorApiKeyError(
      "The Cursor API key was rejected by api.cursor.com."
    )
  }

  return response
}

async function cursorJson<T = unknown>(
  apiKey: string,
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const response = await cursorFetch(apiKey, path, init)
  const text = await response.text()
  let parsed: unknown
  try {
    parsed = text ? JSON.parse(text) : undefined
  } catch {
    parsed = text
  }

  if (!response.ok) {
    const errorRecord =
      parsed && typeof parsed === "object" ? (parsed as UnknownRecord) : {}
    const message =
      (typeof errorRecord.error === "string" && errorRecord.error) ||
      (typeof errorRecord.message === "string" && errorRecord.message) ||
      `Cursor API request failed: ${response.status}`
    throw new Error(message)
  }

  return parsed as T
}

export async function validateCursorApiKey(apiKey: string): Promise<void> {
  if (!apiKey || !apiKey.startsWith("crsr_")) {
    throw new InvalidCursorApiKeyError(
      "Cursor API keys start with crsr_. Please check the key and try again."
    )
  }

  try {
    await cursorJson(apiKey, "/me")
  } catch (error) {
    if (error instanceof InvalidCursorApiKeyError) throw error
    throw new InvalidCursorApiKeyError(
      "The Cursor API key could not be validated. Please check the key and try again."
    )
  }
}

export async function getCurrentUser(apiKey: string): Promise<PublicUser | null> {
  try {
    const data = asRecord(await cursorJson(apiKey, "/me"))
    const name =
      firstString(data, ["apiKeyName", "name", "displayName", "username"]) ??
      firstString(data, ["userEmail", "email"]) ??
      "Cursor user"
    return {
      name,
      email: firstString(data, ["userEmail", "email"]),
    }
  } catch {
    return null
  }
}

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

export async function listModels(apiKey: string): Promise<ModelOption[]> {
  try {
    const response = await cursorJson(apiKey, "/models")
    return extractArray(response, ["models", "items", "data"]).flatMap((model) => {
      const normalized = normalizeModel(model)
      return normalized ? [normalized] : []
    })
  } catch {
    return []
  }
}

export async function listRepositories(
  apiKey: string
): Promise<RepositoryOption[]> {
  try {
    const response = await cursorJson(apiKey, "/repositories")
    const rawRepositories = extractArray(response, [
      "repositories",
      "repos",
      "items",
      "data",
    ])
    return rawRepositories
      .map((rawRepository) => normalizeRepository(rawRepository))
      .filter((repo): repo is RepositoryOption => Boolean(repo))
  } catch {
    return []
  }
}

export async function listArtifactsForAgent(
  apiKey: string,
  agentId: string
): Promise<ArtifactPreview[]> {
  try {
    const response = await cursorJson(
      apiKey,
      `/agents/${encodeURIComponent(agentId)}/artifacts`
    )
    const rawArtifacts = extractArray(response, [
      "artifacts",
      "items",
      "files",
      "data",
    ])

    return rawArtifacts
      .map((rawArtifact) => withArtifactMediaUrl(agentId, normalizeArtifact(rawArtifact)))
      .sort(compareArtifactPreviews)
      .slice(0, 4)
  } catch {
    return []
  }
}

export async function listRunsForAgent(
  apiKey: string,
  agentId: string
): Promise<RunSummary[]> {
  try {
    const response = await cursorJson(
      apiKey,
      `/agents/${encodeURIComponent(agentId)}/runs?limit=10`
    )
    const rawRuns = extractArray(response, ["items", "runs", "data", "results"])
    return rawRuns.map(normalizeRun)
  } catch {
    return []
  }
}

export async function downloadArtifact(
  apiKey: string,
  agentId: string,
  artifactPath: string
): Promise<{ downloadUrl?: string; expiresAt?: string }> {
  const params = new URLSearchParams({ path: artifactPath })
  const response = asRecord(
    await cursorJson(
      apiKey,
      `/agents/${encodeURIComponent(agentId)}/artifacts/download?${params.toString()}`
    )
  )

  return {
    downloadUrl: firstString(response, [
      "url",
      "downloadUrl",
      "href",
      "presignedUrl",
    ]),
    expiresAt: firstString(response, ["expiresAt", "expires_at"]),
  }
}

export async function readArtifactContent(
  apiKey: string,
  agentId: string,
  artifactPath: string
): Promise<{ bytes: Uint8Array; contentType: string }> {
  const { downloadUrl } = await downloadArtifact(apiKey, agentId, artifactPath)
  if (!downloadUrl) {
    throw new Error("Artifact download URL was not returned.")
  }

  const artifactResponse = await fetch(downloadUrl)
  if (!artifactResponse.ok) {
    throw new Error("Artifact download URL returned an error.")
  }

  return {
    bytes: new Uint8Array(await artifactResponse.arrayBuffer()),
    contentType:
      artifactResponse.headers.get("content-type") ??
      contentTypeForArtifactPath(artifactPath),
  }
}

async function resolveRepository(
  apiKey: string,
  repositoryId: string
): Promise<RepositoryOption> {
  const repositories = await listRepositories(apiKey)
  const selected =
    repositories.find((repository) => repository.id === repositoryId) ??
    repositories.find((repository) => repository.url === repositoryId)

  if (selected) {
    return selected
  }

  const fallbackUrl = normalizeRepositoryUrl(repositoryId)
  if (fallbackUrl) {
    return {
      id: fallbackUrl,
      label: labelFromRepositoryUrl(fallbackUrl),
      url: fallbackUrl,
    }
  }

  throw new Error("Select a repository before creating an agent.")
}

function normalizeAgent(rawAgent: unknown): AgentCard {
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

function enrichAgentCardFromRuns(card: AgentCard, runs: RunSummary[]) {
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
    card.repositoryUrl = normalizeRepositoryListUrl(latestRun.repoUrl)
    card.repository = labelFromRepositoryString(latestRun.repoUrl)
  }
}

function normalizeRun(rawRun: unknown): RunSummary {
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

function normalizeAgentStatus(record: UnknownRecord) {
  const rawStatus = firstString(record, [
    "status",
    "_status",
    "state",
    "lifecycleStatus",
    "runStatus",
    "agentStatus",
  ])

  if (!rawStatus) return undefined
  const normalized = rawStatus.toLowerCase()
  if (["unknown", "undefined", "null"].includes(normalized)) return undefined
  return rawStatus
}

function normalizeArtifact(rawArtifact: unknown): ArtifactPreview {
  const record = asRecord(rawArtifact)
  const artifactPath =
    firstString(record, ["path", "name", "filename", "filePath"]) ?? "artifact"
  const name = artifactPath.split("/").filter(Boolean).at(-1) ?? artifactPath
  const contentType = firstString(record, ["contentType", "mimeType", "type"])
  const previewKind = getArtifactPreviewKind(artifactPath, contentType)

  return {
    path: artifactPath,
    name,
    size: firstNumber(record, ["size", "bytes", "contentLength"]),
    contentType,
    previewKind,
  }
}

function withArtifactMediaUrl(
  agentId: string,
  artifact: ArtifactPreview
): ArtifactPreview {
  if (artifact.previewKind === "file") {
    return artifact
  }

  const base = process.env.EXPO_PUBLIC_API_BASE ?? ""
  const path = `/api/agents/${encodeURIComponent(
    agentId
  )}/artifacts/media?path=${encodeURIComponent(artifact.path)}`

  return {
    ...artifact,
    mediaUrl: `${base}${path}`,
  }
}

function compareArtifactPreviews(a: ArtifactPreview, b: ArtifactPreview) {
  return artifactRank(a) - artifactRank(b)
}

function artifactRank(artifact: ArtifactPreview) {
  if (artifact.previewKind === "video") return 0
  if (artifact.previewKind === "image") return 1
  return 2
}

function normalizeModel(rawModel: unknown): ModelOption | null {
  if (typeof rawModel === "string") {
    return { id: rawModel, label: rawModel }
  }
  const record = asRecord(rawModel)
  const id = firstString(record, ["id", "name"])
  if (!id) return null

  return {
    id,
    label: firstString(record, ["displayName", "label", "name"]) ?? id,
    description: firstString(record, ["description"]),
  }
}

function normalizeRepository(rawRepository: unknown): RepositoryOption | null {
  if (typeof rawRepository === "string") {
    const url = normalizeRepositoryUrl(rawRepository)
    if (!url) return null
    return { id: url, label: labelFromRepositoryUrl(url), url }
  }

  const record = asRecord(rawRepository)
  const url =
    normalizeRepositoryUrl(firstString(record, ["url", "htmlUrl", "remoteUrl"])) ??
    normalizeRepositoryUrl(firstString(record, ["cloneUrl", "sshUrl"]))
  if (!url) return null

  const label =
    firstString(record, ["fullName", "slug", "label", "name"]) ??
    labelFromRepositoryUrl(url)
  const [owner, name] = label.includes("/")
    ? label.split("/", 2)
    : labelFromRepositoryUrl(url).split("/", 2)

  return {
    id: firstString(record, ["id"]) ?? url,
    label,
    url,
    owner,
    name,
    defaultBranch: firstString(record, [
      "defaultBranch",
      "default_branch",
      "branch",
    ]),
  }
}

function extractArray(value: unknown, keys: string[]): unknown[] {
  if (Array.isArray(value)) return value
  const record = asRecord(value)
  for (const key of keys) {
    const candidate = record[key]
    if (Array.isArray(candidate)) return candidate
  }
  return []
}

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" ? (value as UnknownRecord) : {}
}

function firstRecord(record: UnknownRecord, keys: string[]): UnknownRecord {
  for (const key of keys) {
    const value = record[key]
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as UnknownRecord
    }
  }
  return {}
}

function firstRecordFromArray(value: unknown): UnknownRecord {
  if (!Array.isArray(value)) return {}
  const record = value.find(
    (item): item is UnknownRecord =>
      Boolean(item) && typeof item === "object" && !Array.isArray(item)
  )
  return record ?? {}
}

function firstReposEntry(value: unknown): UnknownRecord {
  return firstRecordFromArray(value)
}

function firstString(
  record: UnknownRecord,
  keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "string" && value.trim()) {
      return value.trim()
    }
  }
  return undefined
}

function firstNumber(
  record: UnknownRecord,
  keys: string[]
): number | undefined {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "number" && Number.isFinite(value)) return value
  }
  return undefined
}

function firstTimestamp(
  record: UnknownRecord,
  keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "number" && Number.isFinite(value)) {
      return new Date(value).toISOString()
    }
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return undefined
}

function firstStringFromArray(value: unknown): string | undefined {
  if (!Array.isArray(value)) return undefined
  return value.find(
    (item): item is string => typeof item === "string" && Boolean(item.trim())
  )
}

function normalizeRepositoryUrl(value: string | undefined): string | undefined {
  if (!value) return undefined

  const trimmed = value.trim().replace(/\.git$/, "")
  const sshMatch = trimmed.match(/^git@github\.com:(.+\/.+)$/)
  const sshUrlMatch = trimmed.match(/^ssh:\/\/git@github\.com\/(.+\/.+)$/)
  const httpsMatch = trimmed.match(/^https:\/\/github\.com\/(.+\/.+)$/)
  const repoPath = sshMatch?.[1] ?? sshUrlMatch?.[1] ?? httpsMatch?.[1]
  return repoPath ? `https://github.com/${repoPath}` : undefined
}

function normalizeRepositoryListUrl(value: string | undefined): string | undefined {
  if (!value) return undefined
  const trimmed = value.trim().replace(/\.git$/, "")
  if (/^https:\/\/github\.com\/.+\/.+/.test(trimmed)) return trimmed
  if (/^github\.com\/.+\/.+/.test(trimmed)) return `https://${trimmed}`
  if (/^[^/]+\/[^/]+$/.test(trimmed)) return `https://github.com/${trimmed}`
  return normalizeRepositoryUrl(trimmed)
}

function labelFromRepositoryUrl(url: string) {
  return url.replace(/^https:\/\/github\.com\//, "")
}

function labelFromRepositoryString(value: string) {
  return value
    .trim()
    .replace(/^https:\/\/github\.com\//, "")
    .replace(/^github\.com\//, "")
    .replace(/\.git$/, "")
}

function getArtifactPreviewKind(
  artifactPath: string,
  contentType?: string
): ArtifactPreview["previewKind"] {
  if (
    contentType?.startsWith("video/") ||
    /\.(mov|mp4|m4v|webm)$/i.test(artifactPath)
  ) {
    return "video"
  }
  if (contentType?.startsWith("image/")) return "image"
  if (/\.(avif|gif|jpe?g|png|svg|webp)$/i.test(artifactPath)) return "image"
  return "file"
}

function contentTypeForArtifactPath(artifactPath: string) {
  const normalized = artifactPath.toLowerCase()
  if (normalized.endsWith(".mp4") || normalized.endsWith(".m4v")) return "video/mp4"
  if (normalized.endsWith(".mov")) return "video/quicktime"
  if (normalized.endsWith(".webm")) return "video/webm"
  if (normalized.endsWith(".png")) return "image/png"
  if (normalized.endsWith(".jpg") || normalized.endsWith(".jpeg")) return "image/jpeg"
  if (normalized.endsWith(".webp")) return "image/webp"
  if (normalized.endsWith(".gif")) return "image/gif"
  if (normalized.endsWith(".svg")) return "image/svg+xml"
  return "application/octet-stream"
}
