import { asRecord, type UnknownRecord } from "./normalize"

export const CURSOR_API_BASE = "https://api.cursor.com/v1"

export class MissingCursorApiKeyError extends Error {
  readonly code = "missing_api_key"

  constructor(message = "Enter a Cursor API key to continue.") {
    super(message)
    this.name = "MissingCursorApiKeyError"
  }
}

export class InvalidCursorApiKeyError extends Error {
  readonly code = "invalid_api_key"

  constructor(message = "The Cursor API key could not be validated.") {
    super(message)
    this.name = "InvalidCursorApiKeyError"
  }
}

export class CursorRateLimitError extends Error {
  readonly code = "rate_limited"
  readonly retryable = true

  constructor(message = "Cursor API rate limit reached. Try again shortly.") {
    super(message)
    this.name = "CursorRateLimitError"
  }
}

export class CursorIntegrationNotConnectedError extends Error {
  readonly code = "integration_not_connected"

  constructor(
    message = "A required integration is not connected.",
    readonly provider?: string,
    readonly helpUrl?: string
  ) {
    super(message)
    this.name = "CursorIntegrationNotConnectedError"
  }
}

export class CursorNetworkError extends Error {
  readonly code = "network_error"
  readonly retryable = true

  constructor(message = "Network error talking to api.cursor.com.", readonly cause?: unknown) {
    super(message)
    this.name = "CursorNetworkError"
  }
}

export function requireApiKey(request: Request): string {
  const header = request.headers.get("authorization") ?? ""
  const match = header.match(/^Bearer\s+(.+)$/i)
  const apiKey = match?.[1]?.trim()
  if (!apiKey) {
    throw new MissingCursorApiKeyError()
  }
  return apiKey
}

function basicAuthHeader(apiKey: string): string {
  const encoded =
    typeof Buffer !== "undefined"
      ? Buffer.from(`${apiKey}:`).toString("base64")
      : btoa(`${apiKey}:`)
  return `Basic ${encoded}`
}

export async function cursorFetch(
  apiKey: string,
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(init.headers)
  headers.set("Authorization", basicAuthHeader(apiKey))
  headers.set("Accept", "application/json")
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }

  let response: Response
  try {
    response = await fetch(`${CURSOR_API_BASE}${path}`, {
      ...init,
      headers,
    })
  } catch (error) {
    throw new CursorNetworkError(undefined, error)
  }

  if (response.status === 401) {
    throw new InvalidCursorApiKeyError(
      "The Cursor API key was rejected by api.cursor.com."
    )
  }

  if (response.status === 429) {
    throw new CursorRateLimitError()
  }

  return response
}

export async function cursorJson<T = unknown>(
  apiKey: string,
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const response = await cursorFetch(apiKey, path, init)
  const text = await response.text()
  let parsed: unknown
  try {
    parsed = text ? JSON.parse(text) : undefined
  } catch {
    parsed = text
  }

  if (!response.ok) {
    const errorRecord: UnknownRecord =
      parsed && typeof parsed === "object" ? (parsed as UnknownRecord) : {}
    const message =
      (typeof errorRecord.error === "string" && errorRecord.error) ||
      (typeof errorRecord.message === "string" && errorRecord.message) ||
      `Cursor API request failed: ${response.status}`

    if (response.status === 409 || response.status === 412) {
      const code = errorRecord.code
      const provider = asRecord(errorRecord.integration).provider
      if (code === "integration_not_connected" || provider) {
        throw new CursorIntegrationNotConnectedError(
          message,
          typeof provider === "string" ? provider : undefined,
          typeof errorRecord.helpUrl === "string" ? errorRecord.helpUrl : undefined
        )
      }
    }

    throw new Error(message)
  }

  return parsed as T
}
