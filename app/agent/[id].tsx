import {
  Linking,
  PlatformColor,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native"
import { Stack, useLocalSearchParams } from "expo-router"
import { useQuery } from "@tanstack/react-query"
import { formatDistanceToNow } from "date-fns"
import {
  ExternalLink,
  GitBranch,
  GitPullRequest,
  MessageSquare,
} from "lucide-react-native"
import {
  Accordion,
  Alert,
  Button,
  Card,
  SkeletonGroup,
  Surface,
} from "heroui-native"

import { ArtifactGrid } from "@/components/ArtifactGrid"
import { StatusChip } from "@/components/StatusChip"
import { getAgent } from "@/lib/api/agents"
import type {
  AgentCard as AgentCardType,
  AgentDetailResponse,
  RunSummary,
} from "@/lib/cursor/types"

export default function AgentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const agentId = String(id ?? "")

  const { data, isPending, error, refetch, isRefetching } = useQuery({
    queryKey: ["agent", agentId],
    queryFn: () => getAgent(agentId),
    enabled: Boolean(agentId),
    refetchInterval: 15_000,
  })

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: data?.agent.title || "Agent",
          headerLargeTitle: false,
          headerTransparent: true,
          headerShadowVisible: false,
          headerBlurEffect: "none",
          headerBackButtonDisplayMode: "minimal",
          headerTitleStyle: {
            color: PlatformColor("label") as unknown as string,
          },
        }}
      />
      {isPending ? (
        <DetailSkeleton />
      ) : error ? (
        <DetailError
          message={(error as Error).message}
          onRetry={() => refetch()}
        />
      ) : (
        <DetailBody
          data={data!}
          isRefetching={isRefetching}
          onRefresh={() => refetch()}
        />
      )}
    </>
  )
}

function DetailBody({
  data,
  isRefetching,
  onRefresh,
}: {
  data: AgentDetailResponse
  isRefetching: boolean
  onRefresh: () => void
}) {
  const { agent, runs } = data

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: 20, paddingBottom: 48, gap: 20 }}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />
      }
    >
      <Hero agent={agent} />

      <ActionRow agent={agent} />

      {agent.latestMessage ? (
        <Card>
          <Card.Header className="flex-row items-center gap-2 pb-1">
            <MessageSquare size={14} className="text-muted-foreground" />
            <Text className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
              Latest message
            </Text>
          </Card.Header>
          <Card.Body>
            <Text className="text-sm text-foreground leading-5">
              {agent.latestMessage}
            </Text>
          </Card.Body>
        </Card>
      ) : null}

      <Section title="Artifacts">
        <ArtifactGrid artifacts={agent.artifacts} />
      </Section>

      <Section title={`Runs${runs.length ? ` · ${runs.length}` : ""}`}>
        {runs.length === 0 ? (
          <Surface
            variant="secondary"
            className="items-center py-8 gap-1 rounded-2xl"
          >
            <Text className="text-sm text-foreground font-medium">
              No runs yet
            </Text>
            <Text className="text-xs text-muted-foreground">
              Runs will appear here once the agent starts working.
            </Text>
          </Surface>
        ) : (
          <Accordion selectionMode="single" variant="surface">
            {runs.map((run, i) => (
              <Accordion.Item key={run.id ?? i} value={run.id ?? String(i)}>
                <Accordion.Trigger>
                  <RunTriggerLabel run={run} index={i} />
                  <Accordion.Indicator />
                </Accordion.Trigger>
                <Accordion.Content>
                  <RunDetails run={run} />
                </Accordion.Content>
              </Accordion.Item>
            ))}
          </Accordion>
        )}
      </Section>
    </ScrollView>
  )
}

function Hero({ agent }: { agent: AgentCardType }) {
  const updated = formatRelative(agent.updatedAt ?? agent.createdAt)
  return (
    <View className="gap-2 px-1">
      <View className="flex-row items-center gap-2">
        <StatusChip status={agent.status} />
        {updated ? (
          <Text className="text-xs text-muted-foreground">
            Updated {updated}
          </Text>
        ) : null}
      </View>
      <View className="flex-row items-center gap-2">
        <GitBranch size={14} className="text-muted-foreground" />
        <Text
          selectable
          className="flex-1 text-sm text-muted-foreground"
          numberOfLines={1}
        >
          {agent.repository}
          {agent.branch ? ` · ${agent.branch}` : ""}
        </Text>
      </View>
    </View>
  )
}

function ActionRow({ agent }: { agent: AgentCardType }) {
  if (!agent.prUrl && !agent.repositoryUrl) return null
  return (
    <View className="flex-row gap-2 flex-wrap">
      {agent.prUrl ? (
        <Button
          size="sm"
          variant="outline"
          onPress={() => Linking.openURL(agent.prUrl!).catch(() => {})}
          className="flex-1 min-w-[140px]"
        >
          <GitPullRequest size={14} className="text-foreground" />
          <Button.Label>Pull request</Button.Label>
          <ExternalLink size={14} className="text-muted-foreground" />
        </Button>
      ) : null}
      {agent.repositoryUrl ? (
        <Button
          size="sm"
          variant="ghost"
          onPress={() =>
            Linking.openURL(agent.repositoryUrl!).catch(() => {})
          }
          className="flex-1 min-w-[140px]"
        >
          <GitBranch size={14} className="text-foreground" />
          <Button.Label>Repository</Button.Label>
          <ExternalLink size={14} className="text-muted-foreground" />
        </Button>
      ) : null}
    </View>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <View className="gap-2">
      <Text className="text-xs uppercase tracking-wide text-muted-foreground font-semibold px-1">
        {title}
      </Text>
      {children}
    </View>
  )
}

function RunTriggerLabel({
  run,
  index,
}: {
  run: RunSummary
  index: number
}) {
  const startedAt = formatRelative(run.createdAt)
  const subtitle = [
    startedAt,
    run.durationMs ? `${(run.durationMs / 1000).toFixed(1)}s` : null,
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <View className="flex-1 flex-row items-center justify-between gap-3 pr-2">
      <View className="flex-1 gap-0.5">
        <Text
          className="text-sm font-medium text-foreground"
          numberOfLines={1}
        >
          Run {index + 1}
          {run.id ? ` · ${run.id.slice(0, 6)}` : ""}
        </Text>
        {subtitle ? (
          <Text className="text-xs text-muted-foreground" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {run.status ? <StatusChip status={run.status} /> : null}
    </View>
  )
}

function RunDetails({ run }: { run: RunSummary }) {
  const rows: { label: string; value: string }[] = []
  if (run.branch) rows.push({ label: "Branch", value: run.branch })
  if (run.createdAt)
    rows.push({ label: "Started", value: formatRelative(run.createdAt) })
  if (run.durationMs)
    rows.push({
      label: "Duration",
      value: `${(run.durationMs / 1000).toFixed(1)}s`,
    })

  return (
    <View className="gap-3 pt-1">
      {rows.length > 0 ? (
        <View className="gap-1.5">
          {rows.map((row) => (
            <View
              key={row.label}
              className="flex-row items-center justify-between gap-3"
            >
              <Text className="text-xs text-muted-foreground">
                {row.label}
              </Text>
              <Text
                className="flex-1 text-right text-xs text-foreground"
                numberOfLines={1}
              >
                {row.value}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      {run.result ? (
        <Text className="text-sm text-foreground leading-5">
          {run.result}
        </Text>
      ) : null}
      {run.prUrl ? (
        <Button
          size="sm"
          variant="ghost"
          onPress={() => Linking.openURL(run.prUrl!).catch(() => {})}
          className="self-start"
        >
          <GitPullRequest size={14} className="text-foreground" />
          <Button.Label>View PR</Button.Label>
          <ExternalLink size={14} className="text-muted-foreground" />
        </Button>
      ) : null}
    </View>
  )
}

function DetailSkeleton() {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: 20, paddingBottom: 48, gap: 20 }}
      pointerEvents="none"
    >
      <SkeletonGroup isLoading isSkeletonOnly className="gap-5">
        <View className="gap-2 px-1">
          <View className="flex-row items-center gap-2">
            <SkeletonGroup.Item className="h-5 w-16 rounded-full" />
            <SkeletonGroup.Item className="h-3 w-24 rounded-md" />
          </View>
          <SkeletonGroup.Item className="h-4 w-2/3 rounded-md" />
        </View>
        <View className="flex-row gap-2">
          <SkeletonGroup.Item className="flex-1 h-9 rounded-xl" />
          <SkeletonGroup.Item className="flex-1 h-9 rounded-xl" />
        </View>
        <SkeletonGroup.Item className="h-24 w-full rounded-2xl" />
        <View className="gap-2">
          <SkeletonGroup.Item className="h-3 w-20 rounded-md" />
          <View className="flex-row gap-2">
            <SkeletonGroup.Item className="h-[156px] w-[156px] rounded-xl" />
            <SkeletonGroup.Item className="h-[156px] w-[156px] rounded-xl" />
          </View>
        </View>
        <View className="gap-2">
          <SkeletonGroup.Item className="h-3 w-16 rounded-md" />
          <SkeletonGroup.Item className="h-14 w-full rounded-xl" />
          <SkeletonGroup.Item className="h-14 w-full rounded-xl" />
        </View>
      </SkeletonGroup>
    </ScrollView>
  )
}

function DetailError({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: 20 }}
    >
      <Alert status="danger">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>Couldn’t load agent</Alert.Title>
          <Alert.Description>{message}</Alert.Description>
        </Alert.Content>
        <Button size="sm" variant="danger" onPress={onRetry}>
          <Button.Label>Retry</Button.Label>
        </Button>
      </Alert>
    </ScrollView>
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
