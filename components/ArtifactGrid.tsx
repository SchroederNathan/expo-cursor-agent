import { useEffect, useState } from "react"
import { Linking, Pressable, Text, View } from "react-native"
import { Image } from "expo-image"
import { useVideoPlayer, VideoView } from "expo-video"

import { authHeader } from "@/lib/api/client"
import type { ArtifactPreview } from "@/lib/cursor/types"

type Props = {
  artifacts: ArtifactPreview[]
}

export function ArtifactGrid({ artifacts }: Props) {
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

  if (artifacts.length === 0) {
    return (
      <Text className="text-sm text-muted-foreground">
        No artifacts yet.
      </Text>
    )
  }

  return (
    <View className="flex-row flex-wrap gap-2">
      {artifacts.map((artifact) => (
        <ArtifactTile key={artifact.path} artifact={artifact} headers={headers} />
      ))}
    </View>
  )
}

function ArtifactTile({
  artifact,
  headers,
}: {
  artifact: ArtifactPreview
  headers: Record<string, string>
}) {
  if (artifact.previewKind === "image" && artifact.mediaUrl) {
    return (
      <Image
        source={{ uri: artifact.mediaUrl, headers }}
        style={{
          width: 156,
          height: 156,
          borderRadius: 12,
          backgroundColor: "#0001",
        }}
        contentFit="cover"
      />
    )
  }

  if (artifact.previewKind === "video" && artifact.mediaUrl) {
    return (
      <VideoTile mediaUrl={artifact.mediaUrl} headers={headers} />
    )
  }

  return (
    <Pressable
      className="w-[156px] h-[156px] items-center justify-center rounded-xl bg-muted px-3"
      onPress={() => {
        if (artifact.mediaUrl) {
          Linking.openURL(artifact.mediaUrl).catch(() => {})
        }
      }}
    >
      <Text className="text-xs text-foreground" numberOfLines={3}>
        {artifact.name}
      </Text>
      {artifact.size ? (
        <Text className="text-xs text-muted-foreground mt-1">
          {formatBytes(artifact.size)}
        </Text>
      ) : null}
    </Pressable>
  )
}

function VideoTile({
  mediaUrl,
  headers,
}: {
  mediaUrl: string
  headers: Record<string, string>
}) {
  const player = useVideoPlayer({ uri: mediaUrl, headers }, (p) => {
    p.loop = false
    p.muted = true
  })

  return (
    <VideoView
      player={player}
      style={{ width: 156, height: 156, borderRadius: 12 }}
      contentFit="cover"
      nativeControls
    />
  )
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
