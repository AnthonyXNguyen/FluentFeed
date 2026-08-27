import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Animated, {
  interpolate,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Flashcard } from "./Flashcard";
import { BACK_BUTTON_SIZE, BACK_BUTTON_TOP_OFFSET } from "./layout";
import type { VocabularyItem } from "./types";

// How much of the screen the card claims, and the reserved space it must
// stay clear of on wide/short desktop windows (see `isCramped` below).
// The mic-button sizes/offsets are also used directly to position it
// (`styles.micWrapper`, `styles.micButton`), so the reserved space can't
// drift out of sync with what's actually on screen - only
// MIC_HINT_TEXT_HEIGHT is an estimate, since text height isn't measured.
// BACK_BUTTON_* comes from ./layout since the back button itself is
// rendered by FeedScreen, not here.
const CARD_WIDTH_RATIO = 0.82; // card width as a fraction of the screen width
const CARD_ASPECT_RATIO = 1.2; // card height : width (portrait) 
const MIN_CARD_HEIGHT = 200; // floor so the card can't collapse on a tiny window

const MIC_BUTTON_BOTTOM_OFFSET = 32; // matches the mic button's `bottom` offset
const MIC_BUTTON_SIZE = 72; // matches styles.micButton width/height
const MIC_BUTTON_TO_HINT_GAP = 8; // matches styles.micWrapper's `gap`
const MIC_HINT_TEXT_HEIGHT = 18; // approx rendered height of the hint label
const CARD_EDGE_MARGIN = 20; // breathing room, card to reserved area

export const VocabularyCard = ({ item }: { item: VocabularyItem }) => {
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  // Cards keep a 1:1.2 portrait ratio, but on wide/short desktop windows
  // sizing purely from width makes them taller than the page itself and
  // they bleed into the cards above/below (and cover the mic button) - so
  // reserve room for the back button and mic CTA, cap the card to what's
  // left, and shift it up into that space. Mobile is naturally width-
  // constrained and never hits this, so it's untouched.
  const backButtonArea =
    insets.top + BACK_BUTTON_TOP_OFFSET + BACK_BUTTON_SIZE + CARD_EDGE_MARGIN;
  const micArea =
    insets.bottom +
    MIC_BUTTON_BOTTOM_OFFSET +
    MIC_BUTTON_SIZE +
    MIC_BUTTON_TO_HINT_GAP +
    MIC_HINT_TEXT_HEIGHT +
    CARD_EDGE_MARGIN;
  const safeHeight = screenHeight - backButtonArea - micArea;
  const naturalCardWidth = screenWidth * CARD_WIDTH_RATIO;
  const isCramped = naturalCardWidth * CARD_ASPECT_RATIO > safeHeight;
  const cardWidth = isCramped
    ? Math.max(safeHeight, MIN_CARD_HEIGHT) / CARD_ASPECT_RATIO
    : naturalCardWidth;
  const cardSize = { width: cardWidth, height: cardWidth * CARD_ASPECT_RATIO };
  const [isSaved, setIsSaved] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const flipped = useSharedValue(0);

  const handleFlip = () => {
    // The flip reveals the translation, so it's content, not decoration -
    // keep it animating even when the OS "reduce motion" setting is on.
    flipped.value = withTiming(isFlipped ? 0 : 1, {
      duration: 400,
      reduceMotion: ReduceMotion.Never,
    });
    // sets isFlipped to the opposite of its current value - a toggle.
    // isFlipped initially starts at false, then becomes true if flipped,
    // then becomes false again after flipping back to the front, etc...
    // prev contains the actual current value of isFlipped which is 
    // maintained by React. In the next render, is when isFlipped
    // value will either become true or false. 
    setIsFlipped((prev) => !prev);
  };

  // Fades Listen/Save out as the card turns past its edge-on point, and
  // back in once the target-word side is facing forward again.
  // Side buttons, Listen/Save are called the "rail"
  const railStyle = useAnimatedStyle(() => ({
    opacity: interpolate(flipped.value, [0, 0.45, 0.55, 1], [1, 0, 0, 0]),
  }));

  return (
    <LinearGradient
      colors={["#081b3f", "#123a6e", "#2f6fbd"]}
      style={{ height: screenHeight }}
    >
      <View
        style={[
          styles.flashcardContainer,
          // common condition && value JS shorthand
          // if the screen is cramped, then there will be additional paddingTop
          // and paddingBottom. If false, righthand of the statement will
          // never be executed
          isCramped && { paddingTop: backButtonArea, paddingBottom: micArea },
        ]}
      >
        <View style={cardSize}>
          <Flashcard
            item={item}
            flipped={flipped}
            onFlip={handleFlip}
            cardSize={cardSize}
          />

          {/* Listen + Save, mounted on the card's right edge like Reels'
              icon rail sits over the video - inset so it always stays
              inside the card's own box, never past the screen edge. */}
          <Animated.View
            style={[styles.actionRail, railStyle]}
            pointerEvents={isFlipped ? "none" : "auto"}
          >
            <Pressable style={styles.actionButton} hitSlop={10}>
              <FontAwesome6 name="volume-high" size={20} color="#3a3427" solid />
              <Text style={styles.actionLabel}>Listen</Text>
            </Pressable>
            <Pressable
              style={styles.actionButton}
              hitSlop={10}
              // onPress needs a () instead of just setIsSaved anonymous 
              // function because without (), setIsSaved would run 
              // immediately, but that is not supposed to happen bc
              // the functional updater is not in a function like handleFlip
              // for example. 
              // Without (), setIsSaved would run, which triggers a re-render,
              // and then once this line is hit again another re-render would
              // happen, creating an infinite loop, and cause a crash.

              // Claude Explanation:
              // Any setState call schedules a (usually batched) re-render,
              // unless the resulting value is identical to what's already
              // there — the functional-updater syntax itself doesn't change
              // that behavior, it just makes sure the "old value" it computes from is never stale.
              // Just doing setIsSaved(!prev) might result in a stale value
              // in the rendered batch
              onPress={() => setIsSaved((prev) => !prev)}
            >
              <FontAwesome6
                name="star"
                size={20}
                color={isSaved ? "#2f6fbd" : "#3a3427"}
                solid
              />
              <Text style={styles.actionLabel}>Save</Text>
            </Pressable>
          </Animated.View>
        </View>
      </View>

      {/* Primary CTA: hold to record a pronunciation attempt */}
      <View
        style={[
          styles.micWrapper,
          { bottom: insets.bottom + MIC_BUTTON_BOTTOM_OFFSET },
        ]}
      >
        <Pressable
          onPressIn={() => setIsRecording(true)}
          onPressOut={() => setIsRecording(false)}
          style={[styles.micButton, isRecording && styles.micButtonActive]}
        >
          <FontAwesome6
            name="microphone"
            size={26}
            color={isRecording ? "#000" : "#fff"}
            solid
          />
        </Pressable>
        <Text style={styles.micHint}>
          {isRecording ? "Listening..." : "Hold to speak"}
        </Text>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  flashcardContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  actionRail: {
    position: "absolute",
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
  },
  actionButton: {
    alignItems: "center",
    gap: 4,
  },
  actionLabel: {
    color: "#3a3427",
    fontSize: 10,
    fontWeight: "700",
  },
  micWrapper: {
    position: "absolute",
    alignSelf: "center",
    alignItems: "center",
    gap: MIC_BUTTON_TO_HINT_GAP,
  },
  micButton: {
    width: MIC_BUTTON_SIZE,
    height: MIC_BUTTON_SIZE,
    borderRadius: MIC_BUTTON_SIZE / 2,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 2,
    borderColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  micButtonActive: {
    backgroundColor: "#FF3B30",
    borderColor: "#FF3B30",
  },
  micHint: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "500",
  },
});
