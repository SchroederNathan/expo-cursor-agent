// Barrel re-export — kept for backwards compatibility while callers migrate to
// the per-resource modules. New code should import from the specific module:
//   import { listCloudAgents } from "@/lib/cursor/agents"
//   import { sendFollowup }    from "@/lib/cursor/followups"
//   import { cancelRun }       from "@/lib/cursor/runs"

export {
  CURSOR_API_BASE,
  CursorIntegrationNotConnectedError,
  CursorNetworkError,
  CursorRateLimitError,
  cursorFetch,
  cursorJson,
  InvalidCursorApiKeyError,
  MissingCursorApiKeyError,
  requireApiKey,
} from "./client"

export {
  archiveAgent,
  createCloudAgent,
  deleteAgent,
  enrichAgentCardFromRuns,
  getCloudAgent,
  listCloudAgents,
  normalizeAgent,
  unarchiveAgent,
} from "./agents"

export {
  cancelRun,
  getRun,
  listRuns,
  listRunsForAgent,
  normalizeRun,
} from "./runs"

export { sendFollowup } from "./followups"

export {
  compareArtifactPreviews,
  contentTypeForArtifactPath,
  downloadArtifact,
  getArtifactPreviewKind,
  listArtifactsForAgent,
  normalizeArtifact,
  readArtifactContent,
  withArtifactMediaUrl,
} from "./artifacts"

export {
  labelFromRepositoryString,
  labelFromRepositoryUrl,
  listRepositories,
  normalizeRepository,
  normalizeRepositoryListUrl,
  normalizeRepositoryUrl,
  resolveRepository,
} from "./repos"

export { listModels, normalizeModel } from "./models"

export { getCurrentUser, validateCursorApiKey } from "./me"
