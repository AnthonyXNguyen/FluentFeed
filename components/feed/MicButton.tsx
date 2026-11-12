import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MIC_BUTTON_BOTTOM_OFFSET, MIC_BUTTON_SIZE, MIC_BUTTON_TO_HINT_GAP } from "./layout";

const RECORDING_RED = "#FF3B30";

// Hold-to-speak button with a status line under it, pinned bottom-center.
export const MicButton = ({
  isRecording,
  disabled,
  hint,
  onPressIn,
  onPressOut,
}: {
  isRecording: boolean;
  disabled: boolean;
  hint: string;
  onPressIn: () => void;
  onPressOut: () => void;
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrapper, { bottom: insets.bottom + MIC_BUTTON_BOTTOM_OFFSET }]}>
      <Pressable
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled}
        style={[styles.button, isRecording && styles.buttonActive]}
      >
        <FontAwesome6 name="microphone" size={26} color={isRecording ? "#000" : "#fff"} solid />
      </Pressable>
      <Text style={styles.hint}>{hint}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    alignSelf: "center",
    alignItems: "center",
    gap: MIC_BUTTON_TO_HINT_GAP,
  },
  button: {
    width: MIC_BUTTON_SIZE,
    height: MIC_BUTTON_SIZE,
    borderRadius: MIC_BUTTON_SIZE / 2,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 2,
    borderColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  buttonActive: {
    backgroundColor: RECORDING_RED,
    borderColor: RECORDING_RED,
  },
  hint: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "500",
  },
});
