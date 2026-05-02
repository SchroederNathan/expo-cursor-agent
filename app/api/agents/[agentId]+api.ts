import { jsonError } from "@/lib/cursor/http"
import { getCloudAgent, requireApiKey } from "@/lib/cursor/server"

export async function GET(
  request: Request,
  { agentId }: { agentId: string }
) {
  try {
    const apiKey = requireApiKey(request)
    return Response.json(await getCloudAgent(apiKey, agentId))
  } catch (error) {
    return jsonError(error, "Failed to load agent.")
  }
}
