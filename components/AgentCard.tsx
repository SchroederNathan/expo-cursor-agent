import { Image } from "expo-image"
import { formatDistanceToNow } from "date-fns"
import { Text, View } from "react-native"
import { Card, Chip, PressableFeedback, Separator } from "heroui-native"
import { GitPullRequest } from "lucide-react-native"

import { StatusChip } from "@/components/StatusChip"
import type {
  AgentCard as AgentCardType,
  ArtifactPreview,
} from "@/lib/cursor/types"
import { authHeader } from "@/lib/api/client"
import { useEffect, useState } from "react"

type Props = {
  agent: AgentCardType
  onPress: (agent: AgentCardType) => void
}

export function AgentCard({ agent, onPress }: Props) {
  return (
    <PressableFeedback
      onPress={() => onPress(agent)}
      accessibilityRole="button"
      accessibilityLabel={`Open agent ${agent.title}`}
      className="mb-3"
    >
      <Card>
        <Card.Header className="flex-row items-start gap-3">
          <View className="flex-1 gap-0.5">
            <Card.Title numberOfLines={2}>{agent.title}</Card.Title>
            {agent.repository ? (
              <Card.Description numberOfLines={1}>
                {agent.repository}
                {agent.branch ? ` · ${agent.branch}` : ""}
              </Card.Description>
            ) : null}
          </View>
          <StatusChip status={agent.status} />
        </Card.Header>

        {agent.latestMessage || agent.artifacts.length > 0 ? (
          <Card.Body className="gap-3 pt-3">
            {agent.latestMessage ? (
              <Text
                className="text-sm text-foreground leading-5"
                numberOfLines={2}
              >
                {agent.latestMessage}
              </Text>
            ) : null}

            {agent.artifacts.length > 0 ? (
              <ArtifactStrip artifacts={agent.artifacts} />
            ) : null}
          </Card.Body>
        ) : null}

        <Separator className="mt-3" />
        <Card.Footer className="flex-row items-center justify-between pt-3">
          <Text className="text-xs text-muted-foreground">
            {formatRelative(agent.updatedAt ?? agent.createdAt)}
          </Text>
          {agent.prUrl ? (
            <Chip color="accent" variant="soft" size="sm">
              <GitPullRequest size={12} className="text-accent" />
              <Chip.Label>PR open</Chip.Label>
            </Chip>
          ) : null}
        </Card.Footer>
      </Card>
    </PressableFeedback>
  )
}

function ArtifactStrip({ artifacts }: { artifacts: ArtifactPreview[] }) {
  const previewable = artifacts.filter(
    (a) => a.previewKind === "image" && a.mediaUrl
  )
  if (previewable.length === 0) return null

  return (
    <View className="flex-row gap-2">
      {previewable.slice(0, 4).map((artifact) => (
        <ArtifactThumbnail key={artifact.path} artifact={artifact} />
      ))}
    </View>
  )
}

function ArtifactThumbnail({ artifact }: { artifact: ArtifactPreview }) {
  const [headers, setHeaders] = useState<Record<string, string>>({})

  useEffect(() => {
    let cancelled = false
    authHeader().then((h) => {
      if (!cancelled) setHeaders(h)
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (!artifact.mediaUrl) return null

  return (
    <Image
      source={{ uri: artifact.mediaUrl, headers }}
      style={{ width: 56, height: 56, borderRadius: 8 }}
      contentFit="cover"
    />
  )
}

function formatRelative(value: string | undefined): string {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  try {
    return formatDistanceToNow(date, { addSuffix: true })
  } catch {
    return ""
  }
}
