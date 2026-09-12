import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { assessPronunciation, type PronunciationAssessmentResult } from "../../lib/pronunciationApi";
import { useVoiceRecorder } from "../../lib/useVoiceRecorder";
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

// A pronunciation_score at/above this (Azure's 0-100 scale) counts as
// "correct" and triggers the green celebration + auto-advance.
const CORRECT_SCORE_THRESHOLD = 80;

const SKIP_BUTTON_SIZE = 48;
const SKIP_BUTTON_EDGE_OFFSET = 20; // distance from the screen's bottom-right corner
const CELEBRATION_MS = 700; // how long the green flash plays before advancing
const INCORRECT_FLASH_MS = 650; // how long the red flash + shake plays before the user can retry
const FEEDBACK_ICON_SIZE = 96; // check/x badge size - big enough to read as a clear verdict at a glance
const FEEDBACK_FLASH_RADIUS = 28; // matches Flashcard's own borderRadius so the flash doesn't poke out past rounded corners

// `onCleared` fires once the card is "done" - either the user skipped it or
// scored a correct pronunciation attempt (after the celebration animation
// plays). The pager owning this card decides what "done" means next:
// advance to the next card, or navigate to the set-complete screen.
export const VocabularyCard = ({
  item,
  onCleared,
}: {
  item: VocabularyItem;
  onCleared: () => void;
}) => {
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
  const [isAssessing, setIsAssessing] = useState(false);
  const [assessment, setAssessment] = useState<PronunciationAssessmentResult | null>(null);
  const [assessmentError, setAssessmentError] = useState<string | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isCelebrating, setIsCelebrating] = useState(false);
  const [isWrongFlashing, setIsWrongFlashing] = useState(false);
  const flipped = useSharedValue(0);
  const correctFlashOpacity = useSharedValue(0);
  const checkScale = useSharedValue(0);
  const incorrectFlashOpacity = useSharedValue(0);
  const xOpacity = useSharedValue(0);
  const xScale = useSharedValue(0);
  const cardShakeX = useSharedValue(0);
  const { start: startRecording, stop: stopRecording } = useVoiceRecorder();

  const handleRecordStart = async () => {
    setAssessment(null);
    setAssessmentError(null);
    try {
      await startRecording();
      setIsRecording(true);
    } catch (err) {
      setAssessmentError(err instanceof Error ? err.message : "Couldn't start recording.");
    }
  };

  const handleRecordEnd = async () => {
    setIsRecording(false);
    const uri = await stopRecording();
    if (!uri) return;

    setIsAssessing(true);
    try {
      const result = await assessPronunciation(uri, item.target_word);
      setAssessment(result);
    } catch (err) {
      setAssessmentError(err instanceof Error ? err.message : "Couldn't score that attempt.");
    } finally {
      setIsAssessing(false);
    }
  };

  // Plays the green flash + checkmark once a correct attempt lands, then
  // hands off to the pager via onCleared. Re-attempts before that fire
  // produce a new `assessment` object each time, so this only re-runs on an
  // actual new result - never on an unrelated re-render.
  useEffect(() => {
    if (!assessment || assessment.pronunciation_score < CORRECT_SCORE_THRESHOLD) return;

    setIsCelebrating(true);
    correctFlashOpacity.value = withSequence(
      withTiming(1, { duration: 150 }),
      withTiming(0, { duration: CELEBRATION_MS - 150 })
    );
    checkScale.value = withSequence(
      withTiming(1.15, { duration: 200, easing: Easing.out(Easing.back(2)) }),
      withTiming(1, { duration: 100 })
    );

    const timer = setTimeout(() => {
      checkScale.value = 0;
      setIsCelebrating(false);
      setAssessment(null);
      onCleared();
    }, CELEBRATION_MS);
    return () => clearTimeout(timer);
  }, [assessment]);

  // Plays the red flash + shake + X once a low-scoring attempt lands. Unlike
  // the correct case, this doesn't advance the card - the user just retries
  // the same word - so it only needs to reset its own animated values, not
  // call onCleared.
  useEffect(() => {
    if (!assessment || assessment.pronunciation_score >= CORRECT_SCORE_THRESHOLD) return;

    setIsWrongFlashing(true);
    incorrectFlashOpacity.value = withSequence(
      withTiming(1, { duration: 100 }),
      withTiming(0, { duration: INCORRECT_FLASH_MS - 100 })
    );
    xScale.value = withSequence(
      withTiming(1.15, { duration: 150, easing: Easing.out(Easing.back(2)) }),
      withTiming(1, { duration: 100 })
    );
    xOpacity.value = withSequence(
      withTiming(1, { duration: 100 }),
      withDelay(INCORRECT_FLASH_MS - 350, withTiming(0, { duration: 150 }))
    );
    cardShakeX.value = withSequence(
      withTiming(-10, { duration: 55 }),
      withTiming(10, { duration: 55 }),
      withTiming(-8, { duration: 55 }),
      withTiming(8, { duration: 55 }),
      withTiming(0, { duration: 55 })
    );

    const timer = setTimeout(() => {
      xScale.value = 0;
      setIsWrongFlashing(false);
    }, INCORRECT_FLASH_MS);
    return () => clearTimeout(timer);
  }, [assessment]);

  const handleSkip = () => {
    setAssessment(null);
    setAssessmentError(null);
    onCleared();
  };

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

  const correctFlashStyle = useAnimatedStyle(() => ({
    opacity: correctFlashOpacity.value,
  }));
  const checkStyle = useAnimatedStyle(() => ({
    opacity: checkScale.value === 0 ? 0 : 1,
    transform: [{ scale: checkScale.value }],
  }));
  const incorrectFlashStyle = useAnimatedStyle(() => ({
    opacity: incorrectFlashOpacity.value,
  }));
  const xStyle = useAnimatedStyle(() => ({
    opacity: xOpacity.value,
    transform: [{ scale: xScale.value }],
  }));
  const cardShakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: cardShakeX.value }],
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
        <Animated.View style={[cardSize, cardShakeStyle]}>
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

          {/* Correct-pronunciation celebration: the whole card flashes
              green and a checkmark pops in, then onCleared fires. */}
          <Animated.View
            pointerEvents="none"
            style={[styles.correctFlash, correctFlashStyle]}
          />
          <Animated.View pointerEvents="none" style={[styles.checkBadge, checkStyle]}>
            <FontAwesome6 name="circle-check" size={FEEDBACK_ICON_SIZE} color="#2ecc71" solid />
          </Animated.View>

          {/* Incorrect-pronunciation feedback: the whole card flashes red
              and shakes, and an X pops in, then fades - the card stays put
              so the user can just try again. */}
          <Animated.View
            pointerEvents="none"
            style={[styles.incorrectFlash, incorrectFlashStyle]}
          />
          <Animated.View pointerEvents="none" style={[styles.checkBadge, xStyle]}>
            <FontAwesome6 name="circle-xmark" size={FEEDBACK_ICON_SIZE} color="#FF3B30" solid />
          </Animated.View>
        </Animated.View>
      </View>

      {/* Skip CTA: pinned to the screen's bottom-right corner (not the
          card's, so it stays put across card sizes/aspect ratios). */}
      <Pressable
        onPress={handleSkip}
        disabled={isAssessing || isCelebrating || isWrongFlashing}
        hitSlop={10}
        style={[
          styles.skipButton,
          { bottom: insets.bottom + SKIP_BUTTON_EDGE_OFFSET, right: insets.right + SKIP_BUTTON_EDGE_OFFSET },
        ]}
      >
        <FontAwesome6 name="forward-step" size={20} color="#fff" solid />
      </Pressable>

      {/* Primary CTA: hold to record a pronunciation attempt */}
      <View
        style={[
          styles.micWrapper,
          { bottom: insets.bottom + MIC_BUTTON_BOTTOM_OFFSET },
        ]}
      >
        <Pressable
          onPressIn={handleRecordStart}
          onPressOut={handleRecordEnd}
          disabled={isAssessing || isWrongFlashing}
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
          {isRecording
            ? "Listening..."
            : isAssessing
              ? "Scoring..."
              : assessmentError
                ? assessmentError
                : assessment
                  ? `${Math.round(assessment.pronunciation_score)} / 100`
                  : "Hold to speak"}
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
  correctFlash: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#2ecc71",
    borderRadius: FEEDBACK_FLASH_RADIUS,
  },
  incorrectFlash: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#FF3B30",
    borderRadius: FEEDBACK_FLASH_RADIUS,
  },
  checkBadge: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
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
