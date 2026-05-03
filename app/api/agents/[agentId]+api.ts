import { deleteAgent, getCloudAgent } from "@/lib/cursor/agents"
import { requireApiKey } from "@/lib/cursor/client"
import { jsonError } from "@/lib/cursor/http"

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

export async function DELETE(
  request: Request,
  { agentId }: { agentId: string }
) {
  try {
    const apiKey = requireApiKey(request)
    await deleteAgent(apiKey, agentId)
    return new Response(null, { status: 204 })
  } catch (error) {
    return jsonError(error, "Failed to delete agent.")
  }
}
