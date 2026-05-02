import { jsonError } from "@/lib/cursor/http"
import {
  getCurrentUser,
  requireApiKey,
  validateCursorApiKey,
} from "@/lib/cursor/server"

export async function GET(request: Request) {
  try {
    const apiKey = requireApiKey(request)
    await validateCursorApiKey(apiKey)
    const user = await getCurrentUser(apiKey)
    return Response.json({ user })
  } catch (error) {
    return jsonError(error, "Failed to validate Cursor API key.")
  }
}
