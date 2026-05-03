import { cursorJson } from "./client"
import { asRecord, extractArray, firstNumber, firstString } from "./normalize"
import type { ArtifactPreview } from "./types"

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

export function normalizeArtifact(rawArtifact: unknown): ArtifactPreview {
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

export function withArtifactMediaUrl(
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

export function compareArtifactPreviews(a: ArtifactPreview, b: ArtifactPreview) {
  return artifactRank(a) - artifactRank(b)
}

function artifactRank(artifact: ArtifactPreview) {
  if (artifact.previewKind === "video") return 0
  if (artifact.previewKind === "image") return 1
  return 2
}

export function getArtifactPreviewKind(
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

export function contentTypeForArtifactPath(artifactPath: string) {
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
