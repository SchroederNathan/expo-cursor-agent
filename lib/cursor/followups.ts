import { cursorJson } from "./client"
import { asRecord, firstString } from "./normalize"
import { normalizeRun } from "./runs"
import type { RunSummary } from "./types"

export async function sendFollowup(
  apiKey: string,
  agentId: string,
  prompt: string
): Promise<{ run: RunSummary | null }> {
  const trimmed = prompt.trim()
  if (!trimmed) {
    throw new Error("Followup message cannot be empty.")
  }

  // Cursor's REST API treats followups as a new run on the same agent.
  // Endpoint: POST /v1/agents/{id}/runs   body: { prompt: { text } }
  const response = asRecord(
    await cursorJson(apiKey, `/agents/${encodeURIComponent(agentId)}/runs`, {
      method: "POST",
      body: JSON.stringify({
        prompt: { text: trimmed },
      }),
    })
  )

  const rawRun =
    response.run && typeof response.run === "object"
      ? response.run
      : firstString(response, ["runId"])
        ? { id: firstString(response, ["runId"]) }
        : response

  const run = normalizeRun(rawRun)
  return { run: run.id ? run : null }
}
