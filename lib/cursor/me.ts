import { cursorJson, InvalidCursorApiKeyError } from "./client"
import { asRecord, firstString } from "./normalize"
import type { PublicUser } from "./types"

export async function validateCursorApiKey(apiKey: string): Promise<void> {
  if (!apiKey || !apiKey.startsWith("crsr_")) {
    throw new InvalidCursorApiKeyError(
      "Cursor API keys start with crsr_. Please check the key and try again."
    )
  }

  try {
    await cursorJson(apiKey, "/me")
  } catch (error) {
    if (error instanceof InvalidCursorApiKeyError) throw error
    throw new InvalidCursorApiKeyError(
      "The Cursor API key could not be validated. Please check the key and try again."
    )
  }
}

export async function getCurrentUser(apiKey: string): Promise<PublicUser | null> {
  try {
    const data = asRecord(await cursorJson(apiKey, "/me"))
    const name =
      firstString(data, ["apiKeyName", "name", "displayName", "username"]) ??
      firstString(data, ["userEmail", "email"]) ??
      "Cursor user"
    return {
      name,
      email: firstString(data, ["userEmail", "email"]),
    }
  } catch {
    return null
  }
}
