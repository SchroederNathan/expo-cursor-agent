import { jsonError } from "@/lib/cursor/http"
import { listRepositories, requireApiKey } from "@/lib/cursor/server"

export async function GET(request: Request) {
  try {
    const apiKey = requireApiKey(request)
    return Response.json({ repositories: await listRepositories(apiKey) })
  } catch (error) {
    return jsonError(error, "Failed to list repositories.")
  }
}
