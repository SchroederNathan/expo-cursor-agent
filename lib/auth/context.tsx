import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

import {
  clearApiKey as clearStoredKey,
  getApiKey,
  setApiKey as setStoredKey,
} from "@/lib/auth/storage"

type AuthContextValue = {
  ready: boolean
  hasKey: boolean
  signIn: (key: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)
  const [hasKey, setHasKey] = useState(false)

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

  const signIn = useCallback(async (key: string) => {
    await setStoredKey(key)
    setHasKey(true)
  }, [])

  const signOut = useCallback(async () => {
    await clearStoredKey()
    setHasKey(false)
  }, [])

  const value = useMemo(
    () => ({ ready, hasKey, signIn, signOut }),
    [ready, hasKey, signIn, signOut]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider")
  return ctx
}
