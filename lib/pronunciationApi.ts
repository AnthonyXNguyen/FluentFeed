import { Platform } from 'react-native';

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

  const response = await fetch(`${API_URL}/pronunciation-assessment`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Pronunciation assessment failed (${response.status}): ${detail}`);
  }

  return response.json();
}
