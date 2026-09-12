import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { useWindowDimensions, View } from "react-native";
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { runOnJS } from "react-native-worklets";

import { VocabularyCard } from "./VocabularyCard";
import type { VocabularyItem } from "./types";

// Mobile's native pagingEnabled scroll carries real touch momentum into the
// snap point, so it already animates correctly there. Desktop wheel/trackpad
// scrolling has no such momentum, and getting the browser's own CSS
// scroll-snap to animate it turned out to be unreliable (verified: even a
// plain keyboard PageDown landed short of the snap point). Reanimated's
// withTiming doesn't depend on any of that - it drives the transform
// directly on the JS/UI side - so it's what actually plays a consistent
// animation on desktop.
//
// A trackpad swipe (and even a single mouse wheel notch, which browsers
// often expand into several synthetic events) fires a burst of wheel
// events, often tapering off with a decaying momentum tail that keeps
// trickling in after the finger lifts. One gesture should trigger exactly
// one page change: react quickly to size up the start of it, then ignore
// the rest of that same gesture (including its tail) until it's genuinely
// gone quiet. A `wheelPhase` state machine tracks this per gesture:
//   idle    - ready for a new gesture
//   pending - sizing up a gesture's first WHEEL_DECISION_MS of events
//   settling - just acted (or decided not to); ignoring this gesture's
//              tail until WHEEL_SETTLE_MS passes with no more events
//
// A long settle window blocks legitimate quick re-scrolls (flipping
// through cards fast), but a short one lets a strong flick's still-above-
// threshold momentum tail sneak through as a second trigger. Rather than
// leaning on settle duration alone to fully outlast every possible tail,
// keep it short (responsive) and raise the threshold instead: weak
// trailing momentum stays under it, while an actual mouse notch (~100px+)
// or deliberate trackpad flick clears it easily.
const WHEEL_DECISION_MS = 30;
const WHEEL_SETTLE_MS = 100;
const WHEEL_THRESHOLD = 25;
const PAGE_DURATION_MS = 280;

// Desktop-web-only paging for the vocabulary feed: wheel/trackpad and
// arrow-key driven, animated with Reanimated instead of relying on native
// browser scrolling. See FeedScreen, which renders this only when
// `Platform.OS === "web"` and falls back to a plain FlashList elsewhere.
export const DesktopCardPager = ({
  data,
  setId,
}: {
  data: VocabularyItem[];
  setId: string;
}) => {
  const { height: screenHeight } = useWindowDimensions();
  const router = useRouter();
  const translateY = useSharedValue(0);
  const indexRef = useRef(0);
  const isAnimating = useRef(false);
  const wheelPhase = useRef<"idle" | "pending" | "settling">("idle");
  const wheelDelta = useRef(0);
  const wheelTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The furthest index the user has unlocked by clearing (correctly
  // pronouncing, or skipping) every card before it. Forward paging can't
  // pass this; backward paging (reviewing earlier cards) always can.
  const unlockedIndexRef = useRef(0);

  const setAnimatingFalse = () => {
    isAnimating.current = false;
  };

  const goToIndex = (nextIndex: number) => {
    indexRef.current = nextIndex;
    isAnimating.current = true;
    translateY.value = withTiming(
      -nextIndex * screenHeight,
      {
        duration: PAGE_DURATION_MS,
        easing: Easing.out(Easing.cubic),
        reduceMotion: ReduceMotion.Never,
      },
      (finished) => {
        "worklet";
        if (finished) {
          runOnJS(setAnimatingFalse)();
        }
      }
    );
  };

  const attemptStep = (direction: 1 | -1) => {
    if (isAnimating.current) return;
    const nextIndex = indexRef.current + direction;
    if (nextIndex < 0 || nextIndex > data.length - 1) return;
    if (direction === 1 && nextIndex > unlockedIndexRef.current) return;
    goToIndex(nextIndex);
  };

  // Called when the card at `index` is cleared (correct pronunciation, or
  // skipped). Advances to the next card, or - on the last card - hands off
  // to the set-complete screen.
  const handleCardCleared = (index: number) => {
    if (index >= data.length - 1) {
      router.replace(`/feed/${setId}/complete`);
      return;
    }
    const next = index + 1;
    unlockedIndexRef.current = Math.max(unlockedIndexRef.current, next);
    goToIndex(next);
  };

  const armWheelTimer = (ms: number, onFire: () => void) => {
    if (wheelTimer.current) clearTimeout(wheelTimer.current);
    wheelTimer.current = setTimeout(onFire, ms);
  };

  // Enters (or re-enters) settling: keeps ignoring this gesture's tail,
  // pushing the "gone quiet" deadline out each time it's called.
  const settle = () => {
    wheelPhase.current = "settling";
    armWheelTimer(WHEEL_SETTLE_MS, () => {
      wheelPhase.current = "idle";
    });
  };

  const handleWheel = (e: { deltaY?: number }) => {
    if (wheelPhase.current === "settling") {
      settle(); // same gesture's tail is still talking - keep waiting it out
      return;
    }
    wheelDelta.current += e?.deltaY ?? 0;
    if (wheelPhase.current === "pending") return; // already sizing this gesture up
    wheelPhase.current = "pending";
    armWheelTimer(WHEEL_DECISION_MS, () => {
      const total = wheelDelta.current;
      wheelDelta.current = 0;
      if (Math.abs(total) < WHEEL_THRESHOLD) {
        // Too little movement to call it yet - a slow-starting gesture
        // (trackpad acceleration ramps up) deserves another chance rather
        // than having its whole tail swallowed for a false start.
        wheelPhase.current = "idle";
        return;
      }
      attemptStep(total > 0 ? 1 : -1);
      settle();
    });
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        attemptStep(1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        attemptStep(-1);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [data.length, screenHeight]);

  const stackStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <View
      style={{ flex: 1, overflow: "hidden" }}
      {...({ onWheel: handleWheel } as any)}
    >
      <Animated.View style={stackStyle}>
        {data.map((item, index) => (
          <View key={item.id} style={{ height: screenHeight }}>
            <VocabularyCard item={item} onCleared={() => handleCardCleared(index)} />
          </View>
        ))}
      </Animated.View>
    </View>
  );
};
