import { jsonError } from "@/lib/cursor/http"
import { listArtifactsForAgent, requireApiKey } from "@/lib/cursor/server"

export async function GET(
  request: Request,
  { agentId }: { agentId: string }
) {
  try {
    const apiKey = requireApiKey(request)
    return Response.json({
      artifacts: await listArtifactsForAgent(apiKey, agentId),
    })
  } catch (error) {
    return jsonError(error, "Failed to list artifacts.")
  }
}
