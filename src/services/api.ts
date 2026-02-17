// BiteScan API Service
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system';
import { AnalyzeFoodResponse, UserPreferences, ScanResult } from '../types';

const extra = (Constants.expoConfig?.extra ?? {}) as {
  apiBaseUrl?: string;
  apiToken?: string;
  requestTimeoutMs?: number;
};

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  extra.apiBaseUrl ||
  'https://bitescan-api.sharkmastertest.cfd';
const REQUEST_TIMEOUT_MS = extra.requestTimeoutMs ?? 45_000;
const API_TOKEN = process.env.EXPO_PUBLIC_API_TOKEN || extra.apiToken;

function withTimeout<T>(operation: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  return operation(controller.signal).finally(() => {
    clearTimeout(timeoutId);
  });
}

export async function analyzeFoodImage(
  imageBase64: string,
  userPreferences: UserPreferences
): Promise<ScanResult> {
  return withTimeout(async (signal) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (API_TOKEN) {
      headers['X-API-Token'] = API_TOKEN;
    }

    const response = await fetch(`${API_BASE_URL}/analyze`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        imageBase64,
        userPreferences,
      }),
      signal,
    });

    if (!response.ok) {
      let detail = `API error: ${response.status}`;
      try {
        const err = await response.json();
        detail = err?.detail || err?.error || detail;
      } catch {
        // keep fallback detail
      }
      throw new Error(detail);
    }

    const data: AnalyzeFoodResponse = await response.json();

    if (!data.success || !data.result) {
      throw new Error(data.error || 'Analysis failed');
    }

    return data.result;
  });
}

export async function checkApiHealth(): Promise<boolean> {
  try {
    const response = await withTimeout((signal) => fetch(`${API_BASE_URL}/health`, { signal }));
    return response.ok;
  } catch {
    return false;
  }
}

// Convert image file to base64
export async function imageToBase64(uri: string): Promise<string> {
  const convertFromBlob = async (): Promise<string> => {
    const response = await fetch(uri);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }

    const blob = await response.blob();

    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result;
        if (typeof result !== 'string') {
          reject(new Error('Unexpected file reader result type'));
          return;
        }

        const parts = result.split(',');
        if (parts.length < 2 || !parts[1]) {
          reject(new Error('Failed to convert image to base64'));
          return;
        }

        resolve(parts[1]);
      };

      reader.onerror = () => {
        reject(new Error('Failed reading image blob'));
      };

      reader.readAsDataURL(blob);
    });
  };

  const convertFromFileSystem = async (): Promise<string> => {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64' as const,
    });

    if (!base64 || base64.trim().length === 0) {
      throw new Error('FileSystem returned empty base64 string');
    }

    return base64;
  };

  try {
    return await convertFromBlob();
  } catch (primaryError) {
    console.warn('Blob/FileReader image conversion failed, falling back to FileSystem:', primaryError);
    try {
      return await convertFromFileSystem();
    } catch (fallbackError) {
      console.error('Fallback FileSystem conversion failed:', fallbackError);
      throw new Error('Failed to convert image to base64');
    }
  }
}
