import { cursorJson } from "./client"
import { asRecord, extractArray, firstString } from "./normalize"
import type { RepositoryOption } from "./types"

export async function listRepositories(apiKey: string): Promise<RepositoryOption[]> {
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

export async function resolveRepository(
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

export function normalizeRepository(rawRepository: unknown): RepositoryOption | null {
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

export function normalizeRepositoryUrl(value: string | undefined): string | undefined {
  if (!value) return undefined

  const trimmed = value.trim().replace(/\.git$/, "")
  const sshMatch = trimmed.match(/^git@github\.com:(.+\/.+)$/)
  const sshUrlMatch = trimmed.match(/^ssh:\/\/git@github\.com\/(.+\/.+)$/)
  const httpsMatch = trimmed.match(/^https:\/\/github\.com\/(.+\/.+)$/)
  const repoPath = sshMatch?.[1] ?? sshUrlMatch?.[1] ?? httpsMatch?.[1]
  return repoPath ? `https://github.com/${repoPath}` : undefined
}

export function normalizeRepositoryListUrl(value: string | undefined): string | undefined {
  if (!value) return undefined
  const trimmed = value.trim().replace(/\.git$/, "")
  if (/^https:\/\/github\.com\/.+\/.+/.test(trimmed)) return trimmed
  if (/^github\.com\/.+\/.+/.test(trimmed)) return `https://${trimmed}`
  if (/^[^/]+\/[^/]+$/.test(trimmed)) return `https://github.com/${trimmed}`
  return normalizeRepositoryUrl(trimmed)
}

export function labelFromRepositoryUrl(url: string) {
  return url.replace(/^https:\/\/github\.com\//, "")
}

export function labelFromRepositoryString(value: string) {
  return value
    .trim()
    .replace(/^https:\/\/github\.com\//, "")
    .replace(/^github\.com\//, "")
    .replace(/\.git$/, "")
}
