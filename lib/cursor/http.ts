import {
  InvalidCursorApiKeyError,
  MissingCursorApiKeyError,
} from "./server"

export function jsonError(error: unknown, fallback: string) {
  if (
    error instanceof MissingCursorApiKeyError ||
    error instanceof InvalidCursorApiKeyError
  ) {
    const status = error instanceof InvalidCursorApiKeyError ? 401 : 401
    return Response.json(
      {
        code: error.code,
        error: error.message,
      },
      { status }
    )
  }

  return Response.json(
    {
      error: error instanceof Error ? error.message : fallback,
    },
    { status: 500 }
  )
}
