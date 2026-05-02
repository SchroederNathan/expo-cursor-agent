import {
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { useQuery } from "@tanstack/react-query"
import { formatDistanceToNow } from "date-fns"
import { ChevronLeft, ExternalLink, GitBranch } from "lucide-react-native"
import {
  Accordion,
  Button,
  Card,
  Spinner,
} from "heroui-native"

import { ArtifactGrid } from "@/components/ArtifactGrid"
import { StatusChip } from "@/components/StatusChip"
import { getAgent } from "@/lib/api/agents"

export default function AgentDetailScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const agentId = String(id ?? "")

  const { data, isPending, error } = useQuery({
    queryKey: ["agent", agentId],
    queryFn: () => getAgent(agentId),
    enabled: Boolean(agentId),
    refetchInterval: 15_000,
  })

  if (isPending) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <Spinner />
      </SafeAreaView>
    )
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-background px-6 pt-12 gap-3">
        <Text className="text-2xl font-semibold text-foreground">
          Couldn’t load agent
        </Text>
        <Text className="text-muted-foreground">
          {(error as Error).message}
        </Text>
        <Button onPress={() => router.back()}>
          <Button.Label>Back</Button.Label>
        </Button>
      </SafeAreaView>
    )
  }

  const agent = data!.agent
  const runs = data!.runs

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="flex-row items-center px-2 py-2">
        <Pressable
          onPress={() => router.back()}
          className="p-2 rounded-full active:opacity-60"
          hitSlop={8}
        >
          <ChevronLeft size={24} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 0, gap: 16 }}>
        <View className="gap-2">
          <View className="flex-row items-start justify-between gap-3">
            <Text className="flex-1 text-2xl font-semibold text-foreground">
              {agent.title}
            </Text>
            <StatusChip status={agent.status} />
          </View>
          <Text className="text-sm text-muted-foreground">
            {agent.repository}
            {agent.branch ? ` · ${agent.branch}` : ""}
          </Text>
          {agent.updatedAt || agent.createdAt ? (
            <Text className="text-xs text-muted-foreground">
              Updated {formatRelative(agent.updatedAt ?? agent.createdAt)}
            </Text>
          ) : null}
        </View>

        {agent.prUrl ? (
          <Button
            variant="outline"
            onPress={() => Linking.openURL(agent.prUrl!).catch(() => {})}
          >
            <GitBranch size={16} />
            <Button.Label>View pull request</Button.Label>
            <ExternalLink size={16} />
          </Button>
        ) : null}

        {agent.latestMessage ? (
          <Card>
            <Card.Body className="gap-2">
              <Text className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                Latest message
              </Text>
              <Text className="text-sm text-foreground">
                {agent.latestMessage}
              </Text>
            </Card.Body>
          </Card>
        ) : null}

        <View className="gap-2">
          <Text className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
            Artifacts
          </Text>
          <ArtifactGrid artifacts={agent.artifacts} />
        </View>

        {runs.length > 0 ? (
          <View className="gap-2">
            <Text className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
              Runs
            </Text>
            <Accordion selectionMode="single">
              {runs.map((run, i) => (
                <Accordion.Item key={run.id ?? i} value={run.id ?? String(i)}>
                  <Accordion.Trigger>
                    <View className="flex-1 flex-row items-center justify-between gap-3">
                      <Text
                        className="flex-1 text-sm text-foreground"
                        numberOfLines={1}
                      >
                        {run.id?.slice(0, 8) ?? `Run ${i + 1}`}
                      </Text>
                      {run.status ? <StatusChip status={run.status} /> : null}
                    </View>
                    <Accordion.Indicator />
                  </Accordion.Trigger>
                  <Accordion.Content>
                    <View className="gap-1">
                      {run.createdAt ? (
                        <Text className="text-xs text-muted-foreground">
                          Started {formatRelative(run.createdAt)}
                        </Text>
                      ) : null}
                      {run.durationMs ? (
                        <Text className="text-xs text-muted-foreground">
                          Duration {(run.durationMs / 1000).toFixed(1)}s
                        </Text>
                      ) : null}
                      {run.branch ? (
                        <Text className="text-xs text-muted-foreground">
                          Branch {run.branch}
                        </Text>
                      ) : null}
                      {run.result ? (
                        <Text className="text-sm text-foreground mt-1">
                          {run.result}
                        </Text>
                      ) : null}
                    </View>
                  </Accordion.Content>
                </Accordion.Item>
              ))}
            </Accordion>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
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
