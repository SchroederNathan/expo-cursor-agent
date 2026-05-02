import { jsonError } from "@/lib/cursor/http"
import { listModels, requireApiKey } from "@/lib/cursor/server"

export async function GET(request: Request) {
  try {
    const apiKey = requireApiKey(request)
    return Response.json({ models: await listModels(apiKey) })
  } catch (error) {
    return jsonError(error, "Failed to list models.")
  }
}
