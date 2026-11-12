import { useEffect, useRef } from "react";
import {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
  type WithTimingConfig,
} from "react-native-reanimated";

import { playFeedbackSound } from "../../lib/feedbackSounds";

const CORRECT_MS = 1100; // celebration length before the card advances
const INCORRECT_MS = 900; // shake length before the user can retry
const SHAKE_X = [-18, 18, -14, 14, -8, 8, -3, 0]; // px, one step per 50ms

// The verdict is the feedback itself, so it always animates - even with the
// OS "Reduce Motion" setting on (Reanimated would otherwise skip straight to
// each animation's end state, which here is invisible).
const NEVER_REDUCE = ReduceMotion.Never;
const timing = (toValue: number, config: WithTimingConfig = {}) =>
  withTiming(toValue, { ...config, reduceMotion: NEVER_REDUCE });
const delay = (ms: number, animation: number) => withDelay(ms, animation, NEVER_REDUCE);
const sequence = (...animations: number[]) => withSequence(NEVER_REDUCE, ...animations);

// Sound + animation for a scored attempt. Call playCorrect/playIncorrect,
// render <FeedbackOverlay feedback={...} /> inside the card, and apply
// `styles.card` to the card's wrapper for the shake/hop.
export function useAnswerFeedback() {
  // Colored flashes over the card.
  const correctFlash = useSharedValue(0);
  const incorrectFlash = useSharedValue(0);
  // Check badge.
  const checkScale = useSharedValue(0);
  const checkRotate = useSharedValue(0); // deg
  // X badge.
  const crossOpacity = useSharedValue(0);
  const crossScale = useSharedValue(0);
  const crossRotate = useSharedValue(0); // deg
  // Whole-card motion.
  const shakeX = useSharedValue(0);
  const tilt = useSharedValue(0); // deg
  const lift = useSharedValue(0); // px, negative = up
  const pulse = useSharedValue(1);
  // Confetti burst, 0 -> 1.
  const confetti = useSharedValue(0);

  // Fires `onDone` once the animation ends; cancelled on unmount so a
  // scrolled-away card never calls back.
  const doneTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancel = () => {
    if (doneTimer.current) clearTimeout(doneTimer.current);
    doneTimer.current = null;
  };
  useEffect(() => cancel, []);

  const playCorrect = (onDone: () => void) => {
    cancel();
    playFeedbackSound("correct");

    correctFlash.value = sequence(
      timing(0.92, { duration: 120 }),
      delay(450, timing(0, { duration: 450 }))
    );
    // Check spins in with an overshoot.
    checkRotate.value = -45;
    checkRotate.value = timing(0, { duration: 380, easing: Easing.out(Easing.back(2.5)) });
    checkScale.value = sequence(
      timing(1.3, { duration: 220, easing: Easing.out(Easing.back(2)) }),
      timing(1, { duration: 160 })
    );
    // Card hops and pulses.
    lift.value = sequence(
      timing(-18, { duration: 150, easing: Easing.out(Easing.quad) }),
      timing(0, { duration: 380, easing: Easing.bounce })
    );
    pulse.value = sequence(
      timing(1.06, { duration: 150, easing: Easing.out(Easing.quad) }),
      timing(0.98, { duration: 140 }),
      timing(1, { duration: 160 })
    );
    confetti.value = 0;
    confetti.value = timing(1, { duration: 900, easing: Easing.out(Easing.cubic) });

    doneTimer.current = setTimeout(() => {
      doneTimer.current = null;
      checkScale.value = 0;
      confetti.value = 0;
      onDone();
    }, CORRECT_MS);
  };

  const playIncorrect = (onDone: () => void) => {
    cancel();
    playFeedbackSound("incorrect");

    incorrectFlash.value = sequence(
      timing(0.92, { duration: 80 }),
      delay(350, timing(0, { duration: 450 }))
    );
    // X slams in and wobbles "no-no", then fades.
    crossScale.value = sequence(
      timing(1.3, { duration: 160, easing: Easing.out(Easing.back(2)) }),
      timing(1, { duration: 120 })
    );
    crossRotate.value = sequence(
      timing(-14, { duration: 70 }),
      timing(14, { duration: 90 }),
      timing(-9, { duration: 90 }),
      timing(5, { duration: 80 }),
      timing(0, { duration: 80 })
    );
    crossOpacity.value = sequence(
      timing(1, { duration: 80 }),
      delay(560, timing(0, { duration: 220 }))
    );
    // Card shakes with a slight tilt.
    shakeX.value = sequence(...SHAKE_X.map((x) => timing(x, { duration: 50 })));
    tilt.value = sequence(...SHAKE_X.map((x) => timing(x / 7, { duration: 50 })));

    doneTimer.current = setTimeout(() => {
      doneTimer.current = null;
      crossScale.value = 0;
      onDone();
    }, INCORRECT_MS);
  };

  const styles = {
    card: useAnimatedStyle(() => ({
      transform: [
        { translateX: shakeX.value },
        { translateY: lift.value },
        { rotate: `${tilt.value}deg` },
        { scale: pulse.value },
      ],
    })),
    correctFlash: useAnimatedStyle(() => ({ opacity: correctFlash.value })),
    incorrectFlash: useAnimatedStyle(() => ({ opacity: incorrectFlash.value })),
    check: useAnimatedStyle(() => ({
      opacity: checkScale.value === 0 ? 0 : 1,
      transform: [{ scale: checkScale.value }, { rotate: `${checkRotate.value}deg` }],
    })),
    cross: useAnimatedStyle(() => ({
      opacity: crossOpacity.value,
      transform: [{ scale: crossScale.value }, { rotate: `${crossRotate.value}deg` }],
    })),
  };

  return { playCorrect, playIncorrect, confetti, styles };
}

export type AnswerFeedback = ReturnType<typeof useAnswerFeedback>;
