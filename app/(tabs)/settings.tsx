import { Text, View } from "react-native"
import { useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Button, Spinner } from "heroui-native"

import { apiFetch } from "@/lib/api/client"
import { clearApiKey } from "@/lib/auth/storage"
import type { PublicUser } from "@/lib/cursor/types"

type MeResponse = { user: PublicUser | null }

export default function SettingsScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data, isPending, error } = useQuery({
    queryKey: ["me"],
    queryFn: () => apiFetch<MeResponse>("/api/me"),
  })

  const onSignOut = async () => {
    await clearApiKey()
    queryClient.clear()
    router.replace("/onboarding")
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="px-6 pt-4 gap-6">
        <Text className="text-3xl font-semibold text-foreground">Settings</Text>

        <View className="gap-2">
          <Text className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
            Signed in
          </Text>
          {isPending ? (
            <Spinner />
          ) : error ? (
            <Text className="text-danger">{(error as Error).message}</Text>
          ) : (
            <View className="gap-1">
              <Text className="text-base text-foreground">
                {data?.user?.name ?? "Cursor user"}
              </Text>
              {data?.user?.email ? (
                <Text className="text-sm text-muted-foreground">
                  {data.user.email}
                </Text>
              ) : null}
            </View>
          )}
        </View>

        <View>
          <Button variant="outline" onPress={onSignOut}>
            <Button.Label>Sign out</Button.Label>
          </Button>
        </View>
      </View>
    </SafeAreaView>
  )
}
