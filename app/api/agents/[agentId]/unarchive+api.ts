import { unarchiveAgent } from "@/lib/cursor/agents"
import { requireApiKey } from "@/lib/cursor/client"
import { jsonError } from "@/lib/cursor/http"

export async function POST(
  request: Request,
  { agentId }: { agentId: string }
) {
  try {
    const apiKey = requireApiKey(request)
    await unarchiveAgent(apiKey, agentId)
    return Response.json({ archived: false })
  } catch (error) {
    return jsonError(error, "Failed to unarchive agent.")
  }
}
