import * as SecureStore from "expo-secure-store"

const KEY = "cursor_api_key"

export async function getApiKey(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(KEY)
  } catch {
    return null
  }
}

export async function setApiKey(value: string): Promise<void> {
  await SecureStore.setItemAsync(KEY, value)
}

export async function clearApiKey(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY)
}
