import { requireApiKey } from "@/lib/cursor/client"
import { jsonError } from "@/lib/cursor/http"
import { cancelRun } from "@/lib/cursor/runs"

export async function POST(
  request: Request,
  { agentId, runId }: { agentId: string; runId: string }
) {
  try {
    const apiKey = requireApiKey(request)
    await cancelRun(apiKey, agentId, runId)
    return Response.json({ cancelled: true })
  } catch (error) {
    return jsonError(error, "Failed to cancel run.")
  }
}
