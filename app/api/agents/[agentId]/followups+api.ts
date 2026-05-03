import { requireApiKey } from "@/lib/cursor/client"
import { sendFollowup } from "@/lib/cursor/followups"
import { jsonError } from "@/lib/cursor/http"

export async function POST(
  request: Request,
  { agentId }: { agentId: string }
) {
  try {
    const apiKey = requireApiKey(request)
    const body = (await request.json()) as { prompt?: string }
    const prompt = body?.prompt
    if (typeof prompt !== "string") {
      return Response.json(
        { error: "prompt is required (string)." },
        { status: 400 }
      )
    }
    return Response.json(await sendFollowup(apiKey, agentId, prompt))
  } catch (error) {
    return jsonError(error, "Failed to send followup.")
  }
}
