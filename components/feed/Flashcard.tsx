import { Pressable, StyleSheet, Text } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated"; //third-party library 

import type { VocabularyItem } from "./types";

// The flip widget itself: two faces (front = target word, back =
// translation) that rotate on the X axis as `flipped` goes 0 -> 1. This is
// only ever used inside VocabularyCard, which owns the surrounding page
// (background, buttons, sizing) and just tells this component how big to
// be via `cardSize`.
export const Flashcard = ({
  item,
  flipped,
  onFlip,
  cardSize,
}: {
  item: VocabularyItem;
  flipped: SharedValue<number>;
  onFlip: () => void;
  cardSize: { width: number; height: number };
}) => {
  const frontStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1200 },
      // 0 = facing front, 1 = fully flipped | 0 -> 180 degrees
      { rotateX: `${interpolate(flipped.value, [0, 1], [0, 180])}deg` },
    ],
  }));

  const backStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1200 },
      // 0 = facing front, 1 = fully flipped | 180 -> 360 degrees
      { rotateX: `${interpolate(flipped.value, [0, 1], [180, 360])}deg` },
    ],
  }));

  return (
    <Pressable onPress={onFlip} style={cardSize}>
      <Animated.View
        style={[styles.flashcard,
                styles.flashcardFace,
                cardSize,
                frontStyle
              ]}
      >
        <Text style={styles.cardLabel}>Target Word</Text>
        <Text style={styles.cardWord}>{item.target_word}</Text>
        <Text style={styles.cardHint}>Tap to reveal translation</Text>
      </Animated.View>

      <Animated.View
        style={[
          styles.flashcard,
          styles.flashcardFace,
          styles.flashcardBack,
          cardSize,
          backStyle,
        ]}
      >
        <Text style={styles.cardLabel}>Translation</Text>
        <Text style={styles.cardWord}>{item.native_prompt}</Text>
        <Text style={styles.cardHint}>Tap to flip back</Text>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  flashcard: {
    borderRadius: 28,
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fdfaf3",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  // Depending on value of flipped (0 or 1), either the front card
  // is considered the back card, or the back card is considered
  // the back card
  flashcardFace: {
    backfaceVisibility: "hidden",
  },
  // Aligns the backcard to the front card, making 2 cards appear as 1
  flashcardBack: {
    position: "absolute",
    top: 0,
    left: 0,
    backgroundColor: "#eef0ff",
  },
  cardLabel: {
    color: "#8a8578",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  cardWord: {
    color: "#1a1a1a",
    fontSize: 40,
    fontWeight: "bold",
    textAlign: "center",
  },
  cardHint: {
    color: "#a5a196",
    fontSize: 13,
    marginTop: 16,
  },
});

/*
Notes:

props object VocabularyItem
{ item:      { id: "1", target_word: "Hola", native_prompt: "Hello" } }

The props object is what React passes to every component

I was confused what : is in typescript
({ item, language, cardIndex }: { item: VocabularyItem, language: string, cardIndex: number })

The : is how TypeScript says: "here's what type that thing on the left is."
So, item is of type VocabularyItem, language is type string, and cardIndex is type number

*/
