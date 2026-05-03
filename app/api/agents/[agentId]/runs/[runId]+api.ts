import { requireApiKey } from "@/lib/cursor/client"
import { jsonError } from "@/lib/cursor/http"
import { getRun } from "@/lib/cursor/runs"

export async function GET(
  request: Request,
  { agentId, runId }: { agentId: string; runId: string }
) {
  try {
    const apiKey = requireApiKey(request)
    const run = await getRun(apiKey, agentId, runId)
    if (!run) {
      return Response.json({ error: "Run not found." }, { status: 404 })
    }
    return Response.json({ run })
  } catch (error) {
    return jsonError(error, "Failed to load run.")
  }
}
