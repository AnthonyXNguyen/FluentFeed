import { type AudioPlayer, createAudioPlayer } from 'expo-audio';

// Original sounds synthesized by scripts/generate_feedback_sounds.py.
const SOURCES = {
  correct: require('../assets/sounds/correct.wav'),
  incorrect: require('../assets/sounds/incorrect.wav'),
} as const;

type FeedbackSound = keyof typeof SOURCES;

// One shared player per sound, created on first use - every card in a set
// plays the same two clips, so there's no reason to give each card its own.
const players: Partial<Record<FeedbackSound, AudioPlayer>> = {};

function getPlayer(sound: FeedbackSound): AudioPlayer {
  let player = players[sound];
  if (!player) {
    player = createAudioPlayer(SOURCES[sound]);
    players[sound] = player;
  }
  return player;
}

// Fire-and-forget: a missing/blocked sound must never break the card's
// feedback flow, so failures are only logged.
export function playFeedbackSound(sound: FeedbackSound): void {
  try {
    const player = getPlayer(sound);
    // Rewind so back-to-back attempts replay from the start.
    void player.seekTo(0);
    player.play();
  } catch (err) {
    console.warn(`Couldn't play ${sound} sound:`, err);
  }
}

// Load both clips ahead of time so the first verdict isn't delayed.
export function preloadFeedbackSounds(): void {
  try {
    getPlayer('correct');
    getPlayer('incorrect');
  } catch (err) {
    console.warn("Couldn't preload feedback sounds:", err);
  }
}
