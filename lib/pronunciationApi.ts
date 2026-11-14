import { Platform } from 'react-native';

import { supabase } from './supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error(
    'Missing EXPO_PUBLIC_API_URL. Copy .env.example to .env and fill in your backend URL.'
  );
}

export type WordScore = {
  word: string;
  accuracy_score: number;
  error_type: string;
};

export type PronunciationAssessmentResult = {
  recognized_text: string;
  accuracy_score: number;
  fluency_score: number;
  completeness_score: number;
  pronunciation_score: number;
  words: WordScore[];
};

// Codes the backend sends as `detail.code` (see backend/app/main.py).
const SERVER_CODES = [
  'no_speech',
  'audio_unreadable',
  'audio_too_long',
  'service_unavailable',
  'unauthorized',
  'rate_limited',
] as const;

// Machine-readable reasons an attempt couldn't be scored: the server's codes
// plus ones worked out client-side.
export type PronunciationErrorCode = (typeof SERVER_CODES)[number] | 'network' | 'unknown';

// Short, user-facing copy for each code - this is what the card displays.
const ERROR_MESSAGES: Record<PronunciationErrorCode, string> = {
  no_speech: "Didn't catch that. Try again.",
  audio_unreadable: "Couldn't read that recording. Try again.",
  audio_too_long: 'That recording was too long. Try a shorter one.',
  unauthorized: 'Your session expired. Sign in again.',
  rate_limited: "You're practicing fast! Take a short break.",
  service_unavailable: 'Scoring is unavailable right now.',
  network: "Can't reach the scoring server.",
  unknown: "Couldn't score that attempt.",
};

export class PronunciationApiError extends Error {
  constructor(public readonly code: PronunciationErrorCode) {
    super(ERROR_MESSAGES[code]);
    this.name = 'PronunciationApiError';
  }
}

function errorCodeFrom(status: number, body: string): PronunciationErrorCode {
  try {
    const code = JSON.parse(body)?.detail?.code;
    if (SERVER_CODES.includes(code)) return code;
  } catch {
    // Non-JSON body (proxy error page, etc.) - fall through to status.
  }
  if (status === 401) return 'unauthorized';
  if (status === 429) return 'rate_limited';
  return status >= 500 ? 'service_unavailable' : 'unknown';
}

// `uri` is a local file URI from expo-audio (e.g. what AudioRecorder.uri returns).
// The backend transcodes whatever format that is (m4a/webm/etc) with ffmpeg,
// so the client doesn't need to produce any particular audio format.
export async function assessPronunciation(
  uri: string,
  referenceText: string
): Promise<PronunciationAssessmentResult> {
  const formData = new FormData();
  formData.append('reference_text', referenceText);

  if (Platform.OS === 'web') {
    // Web's FormData requires a real Blob/File - `uri` is a blob: URL here.
    const blob = await (await fetch(uri)).blob();
    formData.append('audio', blob, 'recording.webm');
  } else {
    // React Native's FormData accepts this { uri, name, type } shape in
    // place of a real Blob/File - that's how expo-audio recordings get uploaded.
    formData.append('audio', {
      uri,
      name: 'recording.m4a',
      type: 'audio/m4a',
    } as unknown as Blob);
  }

  // The backend only scores audio for signed-in users. getSession() also
  // refreshes the token first if it has expired.
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new PronunciationApiError('unauthorized');

  let response: Response;
  try {
    response = await fetch(`${API_URL}/pronunciation-assessment`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
  } catch (err) {
    console.warn('Pronunciation request failed to send:', err);
    throw new PronunciationApiError('network');
  }

  if (!response.ok) {
    const body = await response.text();
    // Raw status/body is for developers only - never shown in the UI.
    console.warn(`Pronunciation assessment failed (${response.status}):`, body);
    throw new PronunciationApiError(errorCodeFrom(response.status, body));
  }

  return response.json();
}
