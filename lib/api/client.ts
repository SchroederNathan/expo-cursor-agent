import Constants from "expo-constants"

import { getApiKey } from "@/lib/auth/storage"

function resolveBaseUrl(): string {
  const envBase = process.env.EXPO_PUBLIC_API_BASE
  if (envBase) return envBase.replace(/\/$/, "")
  const host = (Constants.expoConfig as { hostUri?: string } | null)?.hostUri
  if (host) {
    const cleanHost = host.replace(/\/$/, "")
    return cleanHost.startsWith("http") ? cleanHost : `http://${cleanHost}`
  }
  return ""
}

export const API_BASE = resolveBaseUrl()

export class ApiError extends Error {
  readonly status: number
  readonly code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

type ApiFetchInit = Omit<RequestInit, "headers" | "body"> & {
  headers?: Record<string, string>
  body?: unknown
  apiKey?: string
}

export async function apiFetch<T = unknown>(
  path: string,
  init: ApiFetchInit = {}
): Promise<T> {
  const apiKey = init.apiKey ?? (await getApiKey())
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(init.headers ?? {}),
  }

  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`
  }

  let body: BodyInit | undefined
  if (init.body !== undefined && init.body !== null) {
    if (typeof init.body === "string") {
      body = init.body
    } else {
      body = JSON.stringify(init.body)
      headers["Content-Type"] ??= "application/json"
    }
  }

  const url = `${API_BASE}${path}`
  const response = await fetch(url, {
    ...init,
    headers,
    body,
  })

  const text = await response.text()
  let parsed: unknown
  try {
    parsed = text ? JSON.parse(text) : undefined
  } catch {
    parsed = text
  }

  if (!response.ok) {
    const errorRecord =
      parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {}
    const message =
      (typeof errorRecord.error === "string" && errorRecord.error) ||
      (typeof errorRecord.message === "string" && errorRecord.message) ||
      `Request failed with status ${response.status}`
    const code =
      typeof errorRecord.code === "string" ? errorRecord.code : undefined
    throw new ApiError(message, response.status, code)
  }

  return parsed as T
}

export async function authHeader(): Promise<Record<string, string>> {
  const key = await getApiKey()
  return key ? { Authorization: `Bearer ${key}` } : {}
}
