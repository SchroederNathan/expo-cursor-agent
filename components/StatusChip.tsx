import { Chip } from "heroui-native"

type ChipColor = "default" | "accent" | "success" | "warning" | "danger"

const chipColorByNormalizedStatus: Record<string, ChipColor> = {
  running: "accent",
  active: "accent",
  in_progress: "accent",
  creating: "accent",
  queued: "default",
  pending: "default",
  finished: "success",
  completed: "success",
  done: "success",
  succeeded: "success",
  cancelled: "warning",
  expired: "warning",
  archived: "default",
  failed: "danger",
  error: "danger",
}

function classifyStatus(status: string): ChipColor {
  const normalized = status.trim().toLowerCase()
  if (chipColorByNormalizedStatus[normalized]) {
    return chipColorByNormalizedStatus[normalized]
  }
  if (normalized.includes("fail") || normalized.includes("error")) return "danger"
  if (normalized.includes("complete") || normalized.includes("done")) return "success"
  if (normalized.includes("run") || normalized.includes("active")) return "accent"
  if (normalized.includes("cancel")) return "warning"
  return "default"
}

export function formatStatusLabel(status: string): string {
  const normalized = status.trim().toLowerCase()
  if (!normalized || normalized === "unknown" || normalized === "no_status") {
    return "No status"
  }
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function StatusChip({ status }: { status: string }) {
  const color = classifyStatus(status)
  return (
    <Chip color={color} variant="soft" size="sm">
      <Chip.Label>{formatStatusLabel(status)}</Chip.Label>
    </Chip>
  )
}
