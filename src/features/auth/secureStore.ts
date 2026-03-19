import * as SecureStore from "expo-secure-store";

import { createId } from "@/lib/id";

const LOCAL_PROFILE_ID_KEY = "beyond.local_profile_id";

export async function getOrCreateLocalProfileId() {
  const existing = await SecureStore.getItemAsync(LOCAL_PROFILE_ID_KEY);

  if (existing) {
    return existing;
  }

  const next = createId("profile");
  await SecureStore.setItemAsync(LOCAL_PROFILE_ID_KEY, next);
  return next;
}

export const supabaseSecureStore = {
  async getItem(key: string) {
    return SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string) {
    return SecureStore.setItemAsync(key, value);
  },
  async removeItem(key: string) {
    return SecureStore.deleteItemAsync(key);
  },
};
