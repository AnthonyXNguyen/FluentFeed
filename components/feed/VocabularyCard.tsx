import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { ReduceMotion, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ActionRail } from "./ActionRail";
import { FeedbackOverlay } from "./FeedbackOverlay";
import { Flashcard } from "./Flashcard";
import { MicButton } from "./MicButton";
import type { VocabularyItem } from "./types";
import { useAnswerFeedback } from "./useAnswerFeedback";
import { useCardLayout } from "./useCardLayout";
import { usePronunciationAttempt } from "./usePronunciationAttempt";

const SKIP_BUTTON_SIZE = 48;
const SKIP_BUTTON_EDGE_OFFSET = 20; // from the screen's bottom-right corner

// One full-screen page of the feed: the flip card, its feedback, and the
// mic/skip controls. `onCleared` fires when the card is done (correct
// answer or skip); the pager decides what comes next.
export const VocabularyCard = ({
  item,
  onCleared,
}: {
  item: VocabularyItem;
  onCleared: () => void;
}) => {
  const insets = useSafeAreaInsets();
  const { screenHeight, cardSize, containerPadding } = useCardLayout();
  const feedback = useAnswerFeedback();
  const attempt = usePronunciationAttempt({
    targetWord: item.target_word,
    feedback,
    onCleared,
  });

  const flipped = useSharedValue(0); // 0 = word side, 1 = translation side
  const [isFlipped, setIsFlipped] = useState(false);

  const handleFlip = () => {
    // The flip reveals content, so it runs even with OS "reduce motion" on.
    flipped.value = withTiming(isFlipped ? 0 : 1, {
      duration: 400,
      reduceMotion: ReduceMotion.Never,
    });
    setIsFlipped((prev) => !prev);
  };

  return (
    <LinearGradient colors={["#081b3f", "#123a6e", "#2f6fbd"]} style={{ height: screenHeight }}>
      <View style={[styles.cardArea, containerPadding]}>
        <Animated.View style={[cardSize, feedback.styles.card]}>
          <Flashcard item={item} flipped={flipped} onFlip={handleFlip} cardSize={cardSize} />
          <ActionRail flipped={flipped} isFlipped={isFlipped} />
          <FeedbackOverlay feedback={feedback} />
        </Animated.View>
      </View>

      {/* Pinned to the screen corner, not the card, so it never moves. */}
      <Pressable
        onPress={attempt.skip}
        disabled={attempt.isBusy}
        hitSlop={10}
        style={[
          styles.skipButton,
          {
            bottom: insets.bottom + SKIP_BUTTON_EDGE_OFFSET,
            right: insets.right + SKIP_BUTTON_EDGE_OFFSET,
          },
        ]}
      >
        <FontAwesome6 name="forward-step" size={20} color="#fff" solid />
      </Pressable>

      <MicButton
        isRecording={attempt.phase === "recording"}
        disabled={attempt.isBusy}
        hint={attempt.hint}
        onPressIn={attempt.start}
        onPressOut={attempt.end}
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  cardArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  skipButton: {
    position: "absolute",
    width: SKIP_BUTTON_SIZE,
    height: SKIP_BUTTON_SIZE,
    borderRadius: SKIP_BUTTON_SIZE / 2,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
});
