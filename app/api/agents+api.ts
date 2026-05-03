import { createCloudAgent, listCloudAgents } from "@/lib/cursor/agents"
import { requireApiKey } from "@/lib/cursor/client"
import { jsonError } from "@/lib/cursor/http"
import type { CreateAgentInput } from "@/lib/cursor/types"

export async function GET(request: Request) {
  try {
    const apiKey = requireApiKey(request)
    const url = new URL(request.url)
    return Response.json(
      await listCloudAgents(apiKey, {
        cursor: url.searchParams.get("cursor") ?? undefined,
        prUrl: url.searchParams.get("prUrl") ?? undefined,
        includeArchived: url.searchParams.get("includeArchived") === "true",
      })
    )
  } catch (error) {
    return jsonError(error, "Failed to list cloud agents.")
  }
}

export async function POST(request: Request) {
  try {
    const apiKey = requireApiKey(request)
    const body = (await request.json()) as CreateAgentInput
    return Response.json(await createCloudAgent(apiKey, body))
  } catch (error) {
    return jsonError(error, "Failed to create a cloud agent.")
  }
}
