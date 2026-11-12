import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";

import { ConfettiBurst } from "./ConfettiBurst";
import { CARD_BORDER_RADIUS } from "./layout";
import type { AnswerFeedback } from "./useAnswerFeedback";

const GREEN = "#2ecc71";
const RED = "#FF3B30";
const BADGE_SIZE = 128; // white disc behind the check / x
const ICON_SIZE = 72;

// Layers drawn over the card for a verdict: a full-card color flash and a
// badge (plus confetti for correct). Driven entirely by useAnswerFeedback.
export const FeedbackOverlay = ({ feedback }: { feedback: AnswerFeedback }) => (
  <>
    <Animated.View
      pointerEvents="none"
      style={[styles.flash, { backgroundColor: GREEN }, feedback.styles.correctFlash]}
    />
    <ConfettiBurst progress={feedback.confetti} />
    <Badge icon="check" color={GREEN} style={feedback.styles.check} />

    <Animated.View
      pointerEvents="none"
      style={[styles.flash, { backgroundColor: RED }, feedback.styles.incorrectFlash]}
    />
    <Badge icon="xmark" color={RED} style={feedback.styles.cross} />
  </>
);

// White disc keeps the glyph readable on top of the same-colored flash.
const Badge = ({
  icon,
  color,
  style,
}: {
  icon: "check" | "xmark";
  color: string;
  style: AnswerFeedback["styles"]["check"];
}) => (
  <Animated.View pointerEvents="none" style={[styles.badgeLayer, style]}>
    <View style={styles.disc}>
      <FontAwesome6 name={icon} size={ICON_SIZE} color={color} solid />
    </View>
  </Animated.View>
);

const styles = StyleSheet.create({
  flash: {
    ...StyleSheet.absoluteFill,
    borderRadius: CARD_BORDER_RADIUS,
  },
  badgeLayer: {
    ...StyleSheet.absoluteFill,
    justifyContent: "center",
    alignItems: "center",
  },
  disc: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
});
