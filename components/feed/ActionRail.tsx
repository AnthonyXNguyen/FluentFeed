import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import Animated, { interpolate, type SharedValue, useAnimatedStyle } from "react-native-reanimated";

const ICON_COLOR = "#3a3427";
const SAVED_COLOR = "#2f6fbd";

// Listen + Save buttons on the card's right edge (like Reels' icon rail).
// Fades out as the card flips past edge-on, since they belong to the front.
export const ActionRail = ({
  flipped,
  isFlipped,
}: {
  flipped: SharedValue<number>;
  isFlipped: boolean;
}) => {
  const [isSaved, setIsSaved] = useState(false);

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(flipped.value, [0, 0.45, 0.55, 1], [1, 0, 0, 0]),
  }));

  return (
    <Animated.View
      style={[styles.rail, fadeStyle]}
      pointerEvents={isFlipped ? "none" : "auto"}
    >
      <Pressable style={styles.button} hitSlop={10}>
        <FontAwesome6 name="volume-high" size={20} color={ICON_COLOR} solid />
        <Text style={styles.label}>Listen</Text>
      </Pressable>
      {/* Wrapped in () => so it toggles on press, not during render. */}
      <Pressable style={styles.button} hitSlop={10} onPress={() => setIsSaved((prev) => !prev)}>
        <FontAwesome6 name="star" size={20} color={isSaved ? SAVED_COLOR : ICON_COLOR} solid />
        <Text style={styles.label}>Save</Text>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  rail: {
    position: "absolute",
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
  },
  button: {
    alignItems: "center",
    gap: 4,
  },
  label: {
    color: ICON_COLOR,
    fontSize: 10,
    fontWeight: "700",
  },
});
