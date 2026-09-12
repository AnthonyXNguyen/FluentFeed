import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';

// Uses each platform's default recording preset (m4a on iOS/Android, webm/opus
// on most browsers) - the backend transcodes whatever comes in, so the format
// doesn't need to match Azure's raw PCM requirement here.
export function useVoiceRecorder() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const start = async () => {
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

  // Returns the local file URI of the finished recording, or null if
  // nothing was recording (e.g. stop() called without a matching start()).
  const stop = async (): Promise<string | null> => {
    if (!recorder.isRecording) return null;

    await recorder.stop();
    await setAudioModeAsync({ allowsRecording: false });
    return recorder.uri;
  };

  return { start, stop };
}
