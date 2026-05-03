import { archiveAgent } from "@/lib/cursor/agents"
import { requireApiKey } from "@/lib/cursor/client"
import { jsonError } from "@/lib/cursor/http"

export async function POST(
  request: Request,
  { agentId }: { agentId: string }
) {
  try {
    const apiKey = requireApiKey(request)
    await archiveAgent(apiKey, agentId)
    return Response.json({ archived: true })
  } catch (error) {
    return jsonError(error, "Failed to archive agent.")
  }
}
