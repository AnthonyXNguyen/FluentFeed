import { useEffect, useRef, useState } from "react";

import { preloadFeedbackSounds } from "../../lib/feedbackSounds";
import { assessPronunciation, PronunciationApiError } from "../../lib/pronunciationApi";
import { useVoiceRecorder } from "../../lib/useVoiceRecorder";
import type { AnswerFeedback } from "./useAnswerFeedback";

// Azure scores 0-100; at or above this counts as correct.
const CORRECT_SCORE_THRESHOLD = 80;

// idle -> recording -> scoring -> correct | incorrect -> idle
export type AttemptPhase = "idle" | "recording" | "scoring" | "correct" | "incorrect";

// Hold-to-speak flow for one word: record, score, then play the verdict.
// `onCleared` runs after a correct answer's celebration, or on skip.
export function usePronunciationAttempt({
  targetWord,
  feedback,
  onCleared,
}: {
  targetWord: string;
  feedback: AnswerFeedback;
  onCleared: () => void;
}) {
  const [phase, setPhase] = useState<AttemptPhase>("idle");
  const [score, setScore] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recorder = useVoiceRecorder();

  // Scoring is async; ignore results that land after the card unmounts.
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const start = async () => {
    setScore(null);
    setError(null);
    try {
      await recorder.start();
      // Only if the user is still holding - a quick tap may have ended it.
      setPhase((p) => (p === "idle" ? "recording" : p));
    } catch (err) {
      console.warn("Recording failed to start:", err);
      setError("Couldn't access the microphone.");
    }
  };

  const end = async () => {
    const uri = await recorder.stop(); // waits for a start still in progress
    if (!isMounted.current) return;
    if (!uri) {
      setPhase("idle");
      return;
    }
    // Load the verdict sounds while scoring. (Not on mount: on web, creating
    // audio players early slows the first mic start.)
    preloadFeedbackSounds();
    setPhase("scoring");

    try {
      const { pronunciation_score } = await assessPronunciation(uri, targetWord);
      if (!isMounted.current) return;
      setScore(pronunciation_score);
      if (pronunciation_score >= CORRECT_SCORE_THRESHOLD) {
        setPhase("correct");
        feedback.playCorrect(() => {
          setPhase("idle");
          setScore(null);
          onCleared();
        });
      } else {
        setPhase("incorrect");
        feedback.playIncorrect(() => setPhase("idle"));
      }
    } catch (err) {
      if (!isMounted.current) return;
      // Only PronunciationApiError messages are written for users.
      if (!(err instanceof PronunciationApiError)) console.warn("Scoring failed:", err);
      setError(err instanceof PronunciationApiError ? err.message : "Couldn't score that attempt.");
      setPhase("idle");
    }
  };

  const skip = () => {
    setScore(null);
    setError(null);
    onCleared();
  };

  const hint =
    phase === "recording"
      ? "Listening..."
      : phase === "scoring"
        ? "Scoring..."
        : (error ?? (score !== null ? `${Math.round(score)} / 100` : "Hold to speak"));

  return {
    phase,
    hint,
    // Scoring or showing a verdict - mic and skip are locked.
    isBusy: phase === "scoring" || phase === "correct" || phase === "incorrect",
    start,
    end,
    skip,
  };
}
