import { jsonError } from "@/lib/cursor/http"
import { readArtifactContent, requireApiKey } from "@/lib/cursor/server"

export async function GET(
  request: Request,
  { agentId }: { agentId: string }
) {
  try {
    const apiKey = requireApiKey(request)
    const url = new URL(request.url)
    const artifactPath = url.searchParams.get("path")
    if (!artifactPath) {
      return Response.json(
        { error: "Missing required path query parameter." },
        { status: 400 }
      )
    }

    const { bytes, contentType } = await readArtifactContent(
      apiKey,
      agentId,
      artifactPath
    )

    return new Response(bytes as unknown as BodyInit, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=300",
      },
    })
  } catch (error) {
    return jsonError(error, "Failed to download artifact.")
  }
}
