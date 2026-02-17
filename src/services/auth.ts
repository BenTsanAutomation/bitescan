import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const SESSION_TOKEN_KEY = "bitescan_session_token";
const isSecureStoreAvailable = Platform.OS !== "web";

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
}

export async function getSessionToken(): Promise<string | null> {
  if (isSecureStoreAvailable) {
    return SecureStore.getItemAsync(SESSION_TOKEN_KEY);
  }
  return AsyncStorage.getItem(SESSION_TOKEN_KEY);
}

export async function setSessionToken(token: string): Promise<void> {
  if (isSecureStoreAvailable) {
    await SecureStore.setItemAsync(SESSION_TOKEN_KEY, token);
    return;
  }
  await AsyncStorage.setItem(SESSION_TOKEN_KEY, token);
}

export async function clearSessionToken(): Promise<void> {
  if (isSecureStoreAvailable) {
    await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
    return;
  }
  await AsyncStorage.removeItem(SESSION_TOKEN_KEY);
}
