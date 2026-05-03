import { requireApiKey } from "@/lib/cursor/client"
import { jsonError } from "@/lib/cursor/http"
import { listRuns } from "@/lib/cursor/runs"

export async function GET(
  request: Request,
  { agentId }: { agentId: string }
) {
  try {
    const apiKey = requireApiKey(request)
    const url = new URL(request.url)
    const limitParam = url.searchParams.get("limit")
    const limit = limitParam ? Number(limitParam) : undefined

    return Response.json(
      await listRuns(apiKey, agentId, {
        cursor: url.searchParams.get("cursor") ?? undefined,
        limit: limit && Number.isFinite(limit) ? limit : undefined,
      })
    )
  } catch (error) {
    return jsonError(error, "Failed to list runs.")
  }
}
