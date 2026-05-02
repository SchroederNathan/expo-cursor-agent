import { useState } from "react"
import { Keyboard, Text, View } from "react-native"
import { useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import {
  Alert,
  Button,
  Description,
  FieldError,
  Input,
  Label,
  TextField,
} from "heroui-native"

import { apiFetch, ApiError } from "@/lib/api/client"
import { setApiKey } from "@/lib/auth/storage"
import type { PublicUser } from "@/lib/cursor/types"

type MeResponse = { user: PublicUser | null }

export default function OnboardingScreen() {
  const router = useRouter()
  const [value, setValue] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async () => {
    Keyboard.dismiss()
    const trimmed = value.trim()
    if (!trimmed) {
      setError("Please paste your Cursor API key.")
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      await apiFetch<MeResponse>("/api/me", { apiKey: trimmed })
      await setApiKey(trimmed)
      router.replace("/")
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not validate the API key."
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 px-6 pt-12 gap-6">
        <View className="gap-2">
          <Text className="text-3xl font-semibold text-foreground">
            Connect to Cursor
          </Text>
          <Text className="text-base text-muted-foreground">
            Paste a Cursor API key to manage your cloud agents from this device.
            Keys start with crsr_ and are stored securely on-device.
          </Text>
        </View>

        <TextField isInvalid={Boolean(error)}>
          <Label>API key</Label>
          <Input
            value={value}
            onChangeText={setValue}
            placeholder="crsr_..."
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            spellCheck={false}
            editable={!submitting}
            secureTextEntry
            textContentType="password"
            onSubmitEditing={onSubmit}
          />
          <Description>
            Generate a key from cursor.com/dashboard/integrations.
          </Description>
          {error ? <FieldError>{error}</FieldError> : null}
        </TextField>

        {error ? (
          <Alert status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Couldn’t connect</Alert.Title>
              <Alert.Description>{error}</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}

        <View className="mt-2">
          <Button
            onPress={onSubmit}
            isDisabled={submitting || !value.trim()}
          >
            <Button.Label>
              {submitting ? "Validating…" : "Continue"}
            </Button.Label>
          </Button>
        </View>
      </View>
    </SafeAreaView>
  )
}
