import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSION_KEY = 'biometric_session';
const ENABLED_KEY = 'biometric_enabled';

// Localized Face ID prompt strings, keyed by the same 'lang' value i18n persists in AsyncStorage
const BIOMETRIC_PROMPTS = {
  ko: { promptMessage: '기도제목에 로그인', fallbackLabel: '전화번호 사용', cancelLabel: '취소' },
  en: { promptMessage: 'Sign in to PrayerRoom', fallbackLabel: 'Use phone number', cancelLabel: 'Cancel' },
};

// expo-secure-store and expo-local-authentication have no web implementation;
// every function here must no-op on web instead of throwing.
const isWeb = Platform.OS === 'web';

export async function isBiometricAvailable(): Promise<boolean> {
  if (isWeb) return false;
  const compatible = await LocalAuthentication.hasHardwareAsync();
  if (!compatible) return false;
  return LocalAuthentication.isEnrolledAsync();
}

export async function isBiometricEnabled(): Promise<boolean> {
  if (isWeb) return false;
  const val = await SecureStore.getItemAsync(ENABLED_KEY);
  return val === 'true';
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  if (isWeb) return;
  await SecureStore.setItemAsync(ENABLED_KEY, enabled ? 'true' : 'false');
}

export async function storeSession(accessToken: string, refreshToken: string): Promise<void> {
  if (isWeb) return;
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify({ access_token: accessToken, refresh_token: refreshToken }));
}

export async function getStoredSession(): Promise<{ access_token: string; refresh_token: string } | null> {
  if (isWeb) return null;
  const val = await SecureStore.getItemAsync(SESSION_KEY);
  if (!val) return null;
  try { return JSON.parse(val); } catch { return null; }
}

export async function clearBiometrics(): Promise<void> {
  if (isWeb) return;
  await SecureStore.deleteItemAsync(SESSION_KEY);
  await SecureStore.deleteItemAsync(ENABLED_KEY);
}

export async function promptBiometric(): Promise<boolean> {
  if (isWeb) return false;
  const stored = await AsyncStorage.getItem('lang');
  const lang = stored === 'en' ? 'en' : 'ko';
  const prompts = BIOMETRIC_PROMPTS[lang];
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: prompts.promptMessage,
    fallbackLabel: prompts.fallbackLabel,
    cancelLabel: prompts.cancelLabel,
    disableDeviceFallback: false,
  });
  return result.success;
}
