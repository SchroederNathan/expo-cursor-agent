import { useState } from "react"
import { ScrollView, Text, View } from "react-native"
import { BottomSheetScrollView } from "@gorhom/bottom-sheet"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "expo-router"
import {
  BottomSheet,
  Button,
  Description,
  FieldError,
  Input,
  Label,
  Select,
  Spinner,
  Switch,
  TextField,
} from "heroui-native"

import { createAgent, getModels, getRepositories } from "@/lib/api/agents"

type Props = {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

type SelectOption = { value: string; label: string } | undefined

const AUTO_MODEL: SelectOption = { value: "auto", label: "Auto" }

export function CreateAgentSheet({ isOpen, onOpenChange }: Props) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [prompt, setPrompt] = useState("")
  const [repositoryOption, setRepositoryOption] = useState<SelectOption>(undefined)
  const [modelOption, setModelOption] = useState<SelectOption>(AUTO_MODEL)
  const [branch, setBranch] = useState<string>("")
  const [autoCreatePR, setAutoCreatePR] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reposQuery = useQuery({
    queryKey: ["repositories"],
    queryFn: () => getRepositories(),
    enabled: isOpen,
  })

  const modelsQuery = useQuery({
    queryKey: ["models"],
    queryFn: () => getModels(),
    enabled: isOpen,
  })

  const createMutation = useMutation({
    mutationFn: createAgent,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["agents"] })
      onOpenChange(false)
      reset()
      router.push(`/agent/${data.agent.id}`)
    },
    onError: (err: Error) => {
      setError(err.message)
    },
  })

  const reset = () => {
    setPrompt("")
    setRepositoryOption(undefined)
    setModelOption(AUTO_MODEL)
    setBranch("")
    setAutoCreatePR(true)
    setError(null)
  }

  const onSubmit = () => {
    setError(null)
    if (!prompt.trim()) {
      setError("Please describe what the agent should do.")
      return
    }
    if (!repositoryOption?.value) {
      setError("Choose a repository for the agent.")
      return
    }
    createMutation.mutate({
      prompt: prompt.trim(),
      repositoryId: repositoryOption.value,
      modelId: modelOption?.value ?? "auto",
      branch: branch.trim() || undefined,
      autoCreatePR,
    })
  }

  const repositories = reposQuery.data?.repositories ?? []
  const models = modelsQuery.data?.models ?? []

  return (
    <BottomSheet
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) reset()
        onOpenChange(open)
      }}
    >
      <BottomSheet.Portal>
        <BottomSheet.Overlay />
        <BottomSheet.Content snapPoints={["85%"]}>
          <BottomSheetScrollView contentContainerStyle={{ paddingBottom: 32 }}>
            <View className="gap-1 mb-5">
              <BottomSheet.Title>New cloud agent</BottomSheet.Title>
              <BottomSheet.Description>
                Describe the change you want and pick a repository.
              </BottomSheet.Description>
            </View>

            <View className="gap-4">
              <TextField isInvalid={Boolean(error && !prompt.trim())}>
                <Label>Prompt</Label>
                <Input
                  value={prompt}
                  onChangeText={setPrompt}
                  placeholder="e.g. Add a /health endpoint that returns 200 ok"
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                  autoCapitalize="sentences"
                  editable={!createMutation.isPending}
                />
                <Description>Required.</Description>
              </TextField>

              <View className="gap-2">
                <Text className="text-sm font-medium text-foreground">
                  Repository
                </Text>
                {reposQuery.isPending ? (
                  <Spinner />
                ) : repositories.length === 0 ? (
                  <Text className="text-sm text-muted-foreground">
                    No repositories found. Connect Cursor’s GitHub App first.
                  </Text>
                ) : (
                  <Select
                    value={repositoryOption}
                    onValueChange={setRepositoryOption}
                  >
                    <Select.Trigger>
                      <Select.Value placeholder="Choose a repository" />
                      <Select.TriggerIndicator />
                    </Select.Trigger>
                    <Select.Portal>
                      <Select.Overlay />
                      <Select.Content
                        width="trigger"
                        style={{ maxHeight: 320 }}
                      >
                        <ScrollView
                          showsVerticalScrollIndicator
                          keyboardShouldPersistTaps="handled"
                          nestedScrollEnabled
                        >
                          {repositories.map((repo) => (
                            <Select.Item
                              key={repo.id}
                              value={repo.id}
                              label={repo.label}
                            />
                          ))}
                        </ScrollView>
                      </Select.Content>
                    </Select.Portal>
                  </Select>
                )}
              </View>

              <View className="gap-2">
                <Text className="text-sm font-medium text-foreground">Model</Text>
                <Select value={modelOption} onValueChange={setModelOption}>
                  <Select.Trigger>
                    <Select.Value placeholder="Auto" />
                    <Select.TriggerIndicator />
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Overlay />
                    <Select.Content
                      width="trigger"
                      style={{ maxHeight: 320 }}
                    >
                      <ScrollView
                        showsVerticalScrollIndicator
                        keyboardShouldPersistTaps="handled"
                        nestedScrollEnabled
                      >
                        <Select.Item value="auto" label="Auto" />
                        {models.map((model) => (
                          <Select.Item
                            key={model.id}
                            value={model.id}
                            label={model.label}
                          />
                        ))}
                      </ScrollView>
                    </Select.Content>
                  </Select.Portal>
                </Select>
              </View>

              <TextField>
                <Label>Branch (optional)</Label>
                <Input
                  value={branch}
                  onChangeText={setBranch}
                  placeholder="leave blank for the repository default"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!createMutation.isPending}
                />
              </TextField>

              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-3">
                  <Text className="text-sm font-medium text-foreground">
                    Auto-create PR
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    Open a pull request when the agent finishes.
                  </Text>
                </View>
                <Switch
                  isSelected={autoCreatePR}
                  onSelectedChange={setAutoCreatePR}
                />
              </View>

              {error ? <FieldError>{error}</FieldError> : null}

              <View className="mt-2 gap-2">
                <Button
                  onPress={onSubmit}
                  isDisabled={createMutation.isPending}
                >
                  <Button.Label>
                    {createMutation.isPending ? "Creating…" : "Create agent"}
                  </Button.Label>
                </Button>
                <Button
                  variant="ghost"
                  onPress={() => onOpenChange(false)}
                  isDisabled={createMutation.isPending}
                >
                  <Button.Label>Cancel</Button.Label>
                </Button>
              </View>
            </View>
          </BottomSheetScrollView>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  )
}
