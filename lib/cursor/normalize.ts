export type UnknownRecord = Record<string, unknown>

export function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" ? (value as UnknownRecord) : {}
}

export function firstRecord(record: UnknownRecord, keys: string[]): UnknownRecord {
  for (const key of keys) {
    const value = record[key]
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as UnknownRecord
    }
  }
  return {}
}

export function firstRecordFromArray(value: unknown): UnknownRecord {
  if (!Array.isArray(value)) return {}
  const record = value.find(
    (item): item is UnknownRecord =>
      Boolean(item) && typeof item === "object" && !Array.isArray(item)
  )
  return record ?? {}
}

export function firstReposEntry(value: unknown): UnknownRecord {
  return firstRecordFromArray(value)
}

export function firstString(record: UnknownRecord, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "string" && value.trim()) {
      return value.trim()
    }
  }
  return undefined
}

export function firstNumber(record: UnknownRecord, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "number" && Number.isFinite(value)) return value
  }
  return undefined
}

export function firstTimestamp(record: UnknownRecord, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "number" && Number.isFinite(value)) {
      return new Date(value).toISOString()
    }
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return undefined
}

export function firstStringFromArray(value: unknown): string | undefined {
  if (!Array.isArray(value)) return undefined
  return value.find(
    (item): item is string => typeof item === "string" && Boolean(item.trim())
  )
}

export function extractArray(value: unknown, keys: string[]): unknown[] {
  if (Array.isArray(value)) return value
  const record = asRecord(value)
  for (const key of keys) {
    const candidate = record[key]
    if (Array.isArray(candidate)) return candidate
  }
  return []
}

export function normalizeAgentStatus(record: UnknownRecord) {
  const rawStatus = firstString(record, [
    "status",
    "_status",
    "state",
    "lifecycleStatus",
    "runStatus",
    "agentStatus",
  ])

  if (!rawStatus) return undefined
  const normalized = rawStatus.toLowerCase()
  if (["unknown", "undefined", "null"].includes(normalized)) return undefined
  return rawStatus
}
