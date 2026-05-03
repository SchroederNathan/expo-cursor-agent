import { cursorJson } from "./client"
import { asRecord, extractArray, firstString } from "./normalize"
import type { ModelOption } from "./types"

export async function listModels(apiKey: string): Promise<ModelOption[]> {
  try {
    const response = await cursorJson(apiKey, "/models")
    return extractArray(response, ["models", "items", "data"]).flatMap((model) => {
      const normalized = normalizeModel(model)
      return normalized ? [normalized] : []
    })
  } catch {
    return []
  }
}

export function normalizeModel(rawModel: unknown): ModelOption | null {
  if (typeof rawModel === "string") {
    return { id: rawModel, label: rawModel }
  }
  const record = asRecord(rawModel)
  const id = firstString(record, ["id", "name"])
  if (!id) return null

  return {
    id,
    label: firstString(record, ["displayName", "label", "name"]) ?? id,
    description: firstString(record, ["description"]),
  }
}
