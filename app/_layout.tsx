import "../global.css"

import { useEffect } from "react"
import { ActivityIndicator, View } from "react-native"
import { Stack, useRouter, useSegments } from "expo-router"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { HeroUINativeProvider } from "heroui-native"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import { AuthProvider, useAuth } from "@/lib/auth/context"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

function AuthGate({ children }: { children: React.ReactNode }) {
  const { ready, hasKey } = useAuth()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (!ready) return
    const inOnboarding = segments[0] === "onboarding"
    if (!hasKey && !inOnboarding) {
      router.replace("/onboarding")
    } else if (hasKey && inOnboarding) {
      router.replace("/")
    }
  }, [ready, hasKey, segments, router])

  if (!ready) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </View>
    )
  }

  return <>{children}</>
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <HeroUINativeProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <AuthGate>
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="onboarding" />
                  <Stack.Screen name="index" />
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="agent/[id]" />
                </Stack>
              </AuthGate>
            </AuthProvider>
          </QueryClientProvider>
        </HeroUINativeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
