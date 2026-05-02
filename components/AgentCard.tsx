import { Image } from "expo-image"
import { formatDistanceToNow } from "date-fns"
import { Pressable, Text, View } from "react-native"
import { Card } from "heroui-native"

import { StatusChip } from "@/components/StatusChip"
import type { AgentCard as AgentCardType, ArtifactPreview } from "@/lib/cursor/types"
import { authHeader } from "@/lib/api/client"
import { useEffect, useState } from "react"

type Props = {
  agent: AgentCardType
  onPress: (agent: AgentCardType) => void
}

export function AgentCard({ agent, onPress }: Props) {
  return (
    <Pressable onPress={() => onPress(agent)}>
      <Card className="mb-3">
        <Card.Body className="gap-2">
          <View className="flex-row items-start justify-between gap-3">
            <Text
              className="flex-1 text-base font-semibold text-foreground"
              numberOfLines={2}
            >
              {agent.title}
            </Text>
            <StatusChip status={agent.status} />
          </View>

          {agent.repository ? (
            <Text className="text-sm text-muted-foreground" numberOfLines={1}>
              {agent.repository}
              {agent.branch ? ` · ${agent.branch}` : ""}
            </Text>
          ) : null}

          {agent.latestMessage ? (
            <Text className="text-sm text-foreground" numberOfLines={2}>
              {agent.latestMessage}
            </Text>
          ) : null}

          {agent.artifacts.length > 0 ? (
            <ArtifactStrip artifacts={agent.artifacts} />
          ) : null}

          <View className="flex-row items-center justify-between mt-1">
            <Text className="text-xs text-muted-foreground">
              {formatRelative(agent.updatedAt ?? agent.createdAt)}
            </Text>
            {agent.prUrl ? (
              <Text className="text-xs text-accent" numberOfLines={1}>
                PR open
              </Text>
            ) : null}
          </View>
        </Card.Body>
      </Card>
    </Pressable>
  )
}

function ArtifactStrip({ artifacts }: { artifacts: ArtifactPreview[] }) {
  const previewable = artifacts.filter(
    (a) => a.previewKind === "image" && a.mediaUrl
  )
  if (previewable.length === 0) return null

  return (
    <View className="flex-row gap-2 mt-1">
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
