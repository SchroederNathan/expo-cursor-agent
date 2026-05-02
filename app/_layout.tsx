import "../global.css"

import { useEffect, useState } from "react"
import { ActivityIndicator, View } from "react-native"
import { Stack, useRouter, useSegments } from "expo-router"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { HeroUINativeProvider } from "heroui-native"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import { getApiKey } from "@/lib/auth/storage"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

function AuthGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)
  const [hasKey, setHasKey] = useState(false)
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    let cancelled = false
    getApiKey().then((key) => {
      if (cancelled) return
      setHasKey(Boolean(key))
      setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

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
            <AuthGate>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="onboarding" />
                <Stack.Screen name="index" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="agent/[id]" />
              </Stack>
            </AuthGate>
          </QueryClientProvider>
        </HeroUINativeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
