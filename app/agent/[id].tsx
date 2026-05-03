import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  PlatformColor,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native"
import { Stack, useLocalSearchParams, useRouter } from "expo-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { formatDistanceToNow } from "date-fns"
import {
  Archive,
  ArchiveRestore,
  ExternalLink,
  GitBranch,
  GitPullRequest,
  MessageSquare,
  MoreHorizontal,
  Send,
  Square,
  Trash2,
} from "lucide-react-native"
import {
  Accordion,
  Alert,
  Button,
  Card,
  Dialog,
  Menu,
  PressableFeedback,
  SkeletonGroup,
  Surface,
  TextArea,
  TextField,
} from "heroui-native"
import { useEffect, useRef, useState } from "react"

import { ArtifactGrid } from "@/components/ArtifactGrid"
import { StatusChip } from "@/components/StatusChip"
import {
  archiveAgent,
  cancelRun,
  deleteAgent,
  getAgent,
  sendFollowup,
  unarchiveAgent,
} from "@/lib/api/agents"
import type {
  AgentCard as AgentCardType,
  AgentDetailResponse,
  RunSummary,
} from "@/lib/cursor/types"

const ACTIVE_STATUSES = new Set(["RUNNING", "CREATING", "running", "creating"])

function isActive(status: string | undefined) {
  if (!status) return false
  return ACTIVE_STATUSES.has(status) || ACTIVE_STATUSES.has(status.toUpperCase())
}

function isArchived(status: string | undefined) {
  return status?.toLowerCase() === "archived"
}

export default function AgentDetailScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { id } = useLocalSearchParams<{ id: string }>()
  const agentId = String(id ?? "")

  const { data, isPending, error, refetch, isRefetching } = useQuery({
    queryKey: ["agent", agentId],
    queryFn: () => getAgent(agentId),
    enabled: Boolean(agentId),
    refetchInterval: (query) => {
      const status = query.state.data?.agent?.status
      return isActive(status) ? 1500 : 30_000
    },
  })

  const latestRunId = data?.agent?.latestRunId

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["agent", agentId] })
    queryClient.invalidateQueries({ queryKey: ["agents"] })
  }

  const followupMutation = useMutation({
    mutationFn: (prompt: string) => sendFollowup(agentId, prompt),
    onSuccess: invalidate,
  })

  const cancelMutation = useMutation({
    mutationFn: () => {
      if (!latestRunId) throw new Error("No active run to cancel.")
      return cancelRun(agentId, latestRunId)
    },
    onSuccess: invalidate,
  })

  const archiveMutation = useMutation({
    mutationFn: () =>
      isArchived(data?.agent?.status)
        ? unarchiveAgent(agentId)
        : archiveAgent(agentId),
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteAgent(agentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] })
      router.back()
    },
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
          headerRight: () =>
            data?.agent ? (
              <AgentMenu
                agent={data.agent}
                cancelDisabled={!latestRunId || cancelMutation.isPending}
                onCancel={() => cancelMutation.mutate()}
                onArchive={() => archiveMutation.mutate()}
                onDelete={() => deleteMutation.mutate()}
              />
            ) : null,
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
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1"
          keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
        >
          <DetailBody
            data={data!}
            isRefetching={isRefetching}
            onRefresh={() => refetch()}
          />
          <FollowupComposer
            agent={data!.agent}
            isPending={followupMutation.isPending}
            error={followupMutation.error}
            onSend={(prompt) =>
              followupMutation.mutate(prompt, {
                onSuccess: () => followupMutation.reset(),
              })
            }
          />
        </KeyboardAvoidingView>
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
      contentContainerStyle={{ padding: 20, paddingBottom: 24, gap: 20 }}
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
            <StreamingText text={agent.latestMessage} />
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

function FollowupComposer({
  agent,
  isPending,
  error,
  onSend,
}: {
  agent: AgentCardType
  isPending: boolean
  error: unknown
  onSend: (prompt: string) => void
}) {
  const [value, setValue] = useState("")
  const disabled =
    agent.status?.toUpperCase() === "EXPIRED" ||
    agent.status?.toUpperCase() === "ERROR"

  const trimmed = value.trim()

  return (
    <View className="border-t border-border bg-background px-4 pt-3 pb-6 gap-2">
      {error ? (
        <Text className="text-xs text-danger">
          {(error as Error).message}
        </Text>
      ) : null}
      <View className="flex-row items-end gap-2">
        <TextField className="flex-1">
          <TextArea
            placeholder={
              disabled
                ? "Agent is no longer available."
                : "Send a follow-up to the agent…"
            }
            value={value}
            onChangeText={setValue}
            editable={!disabled && !isPending}
            multiline
            numberOfLines={3}
          />
        </TextField>
        <Button
          variant="primary"
          size="md"
          isDisabled={disabled || isPending || !trimmed}
          onPress={() => {
            if (!trimmed) return
            onSend(trimmed)
            setValue("")
          }}
        >
          <Send size={16} className="text-accent-foreground" />
          <Button.Label>{isPending ? "Sending…" : "Send"}</Button.Label>
        </Button>
      </View>
    </View>
  )
}

function StreamingText({ text }: { text: string }) {
  const previousLength = useRef(text.length)
  const [appendedAt, setAppendedAt] = useState<number>(0)

  useEffect(() => {
    if (text.length > previousLength.current) {
      setAppendedAt(Date.now())
    }
    previousLength.current = text.length
  }, [text])

  // appendedAt is read so a re-render is triggered when text grows; the visual
  // animation hook is intentionally minimal — RN doesn't need extra props here.
  void appendedAt

  return (
    <Text className="text-sm text-foreground leading-5" selectable>
      {text}
    </Text>
  )
}

function AgentMenu({
  agent,
  cancelDisabled,
  onCancel,
  onArchive,
  onDelete,
}: {
  agent: AgentCardType
  cancelDisabled: boolean
  onCancel: () => void
  onArchive: () => void
  onDelete: () => void
}) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const archived = isArchived(agent.status)
  const canCancel = isActive(agent.status) && !cancelDisabled

  return (
    <>
      <Menu>
        <Menu.Trigger>
          <PressableFeedback
            hitSlop={12}
            accessibilityLabel="Agent actions"
            className="w-9 h-9 items-center justify-center"
          >
            <MoreHorizontal size={22} className="text-foreground" />
          </PressableFeedback>
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Overlay />
          <Menu.Content presentation="popover" width={220}>
            {canCancel ? (
              <Menu.Item onPress={onCancel}>
                <Square size={14} className="text-foreground" />
                <Menu.ItemTitle>Cancel run</Menu.ItemTitle>
              </Menu.Item>
            ) : null}
            <Menu.Item onPress={onArchive}>
              {archived ? (
                <ArchiveRestore size={14} className="text-foreground" />
              ) : (
                <Archive size={14} className="text-foreground" />
              )}
              <Menu.ItemTitle>
                {archived ? "Unarchive" : "Archive"}
              </Menu.ItemTitle>
            </Menu.Item>
            <Menu.Item onPress={() => setConfirmOpen(true)}>
              <Trash2 size={14} className="text-danger" />
              <Menu.ItemTitle>Delete</Menu.ItemTitle>
            </Menu.Item>
          </Menu.Content>
        </Menu.Portal>
      </Menu>

      <Dialog isOpen={confirmOpen} onOpenChange={setConfirmOpen}>
        <Dialog.Portal>
          <Dialog.Overlay />
          <Dialog.Content>
            <Dialog.Close />
            <Dialog.Title>Delete agent?</Dialog.Title>
            <Dialog.Description>
              This will permanently remove the agent and its runs. This cannot
              be undone.
            </Dialog.Description>
            <View className="flex-row gap-2 pt-3">
              <Button
                variant="ghost"
                className="flex-1"
                onPress={() => setConfirmOpen(false)}
              >
                <Button.Label>Cancel</Button.Label>
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onPress={() => {
                  setConfirmOpen(false)
                  onDelete()
                }}
              >
                <Button.Label>Delete</Button.Label>
              </Button>
            </View>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    </>
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
