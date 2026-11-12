import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';
import { useRef } from 'react';

// Uses each platform's default recording preset (m4a on iOS/Android, webm/opus
// on most browsers) - the backend transcodes whatever comes in, so the format
// doesn't need to match Azure's raw PCM requirement here.
export function useVoiceRecorder() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  // Starting takes a few hundred ms (permission check + mic spin-up). If the
  // user releases the button before it finishes, stop() must wait for it -
  // otherwise it sees "not recording", drops the attempt, and the recorder
  // starts anyway afterwards and keeps the mic open.
  const pendingStart = useRef<Promise<void> | null>(null);

  const doStart = async () => {
    const { granted } = await requestRecordingPermissionsAsync();
    if (!granted) {
      throw new Error('Microphone permission was not granted.');
    }

    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
    });

    await recorder.prepareToRecordAsync();
    recorder.record();
  };

  const start = async () => {
    const promise = doStart();
    pendingStart.current = promise;
    try {
      await promise;
    } finally {
      if (pendingStart.current === promise) pendingStart.current = null;
    }
  };

  // Returns the local file URI of the finished recording, or null if
  // nothing was recording (e.g. stop() called without a matching start()).
  const stop = async (): Promise<string | null> => {
    if (pendingStart.current) {
      // A failed start is already reported by start()'s caller.
      await pendingStart.current.catch(() => {});
    }
    if (!recorder.isRecording) return null;

    await recorder.stop();
    await setAudioModeAsync({ allowsRecording: false });
    return recorder.uri;
  };

  return { start, stop };
}
