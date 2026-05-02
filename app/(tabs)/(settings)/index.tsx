import { ScrollView, Text, View } from "react-native"
import { Stack } from "expo-router"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Button, Spinner } from "heroui-native"

import { apiFetch } from "@/lib/api/client"
import { useAuth } from "@/lib/auth/context"
import type { PublicUser } from "@/lib/cursor/types"

type MeResponse = { user: PublicUser | null }

export default function SettingsScreen() {
  const queryClient = useQueryClient()
  const { signOut } = useAuth()

  const { data, isPending, error } = useQuery({
    queryKey: ["me"],
    queryFn: () => apiFetch<MeResponse>("/api/me"),
  })

  const onSignOut = async () => {
    queryClient.clear()
    await signOut()
  }

  return (
    <>
      <Stack.Screen options={{ title: "Settings", headerLargeTitle: true }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 8,
          paddingBottom: 32,
          gap: 24,
        }}
      >
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
      </ScrollView>
    </>
  )
}
