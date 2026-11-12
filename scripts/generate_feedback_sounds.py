"""Synthesizes the app's original correct/incorrect feedback sounds.

Pure stdlib (no samples, no third-party audio) so the sounds are our own and
can be regenerated or tweaked by editing the note lists below:

    python3 scripts/generate_feedback_sounds.py

Writes assets/sounds/correct.wav and assets/sounds/incorrect.wav.
"""

import math
import struct
import wave
from pathlib import Path

RATE = 44100
OUT_DIR = Path(__file__).resolve().parent.parent / "assets" / "sounds"


def bell(freq: float, t: float) -> float:
    # Bright bell/marimba-ish tone: fundamental plus a couple of inharmonic
    # partials that die away faster, giving a "ting" attack.
    return (
        math.sin(2 * math.pi * freq * t)
        + 0.45 * math.sin(2 * math.pi * freq * 2.0 * t) * math.exp(-t * 18)
        + 0.25 * math.sin(2 * math.pi * freq * 3.01 * t) * math.exp(-t * 30)
    )


def soft_square(freq: float, t: float) -> float:
    # Rounded square wave (first few odd harmonics only) - a muted, buzzy
    # "bwomp" rather than a harsh beep.
    return sum(math.sin(2 * math.pi * freq * k * t) / k for k in (1, 3, 5, 7))


def render(notes, total_s: float) -> list[float]:
    """notes: (start_s, duration_s, freq_start, freq_end, voice, decay, gain)"""
    buf = [0.0] * int(RATE * total_s)
    for start, dur, f0, f1, voice, decay, gain in notes:
        phase = 0.0
        n = int(RATE * dur)
        for i in range(n):
            t = i / RATE
            # Glide pitch from f0 to f1 across the note (used for the droop).
            freq = f0 + (f1 - f0) * (i / n)
            phase += freq / RATE
            attack = min(1.0, t / 0.006)  # 6ms fade-in avoids clicks
            release = min(1.0, (dur - t) / 0.03)  # 30ms fade-out
            env = attack * release * math.exp(-t * decay)
            # Evaluate the voice at an "effective time" so the glide stays
            # phase-continuous: freq * t_eff == accumulated phase.
            t_eff = phase / freq if freq else t
            j = int(RATE * start) + i
            if j < len(buf):
                buf[j] += gain * env * voice(freq, t_eff)
    return buf


def write_wav(path: Path, samples: list[float], peak: float = 0.6) -> None:
    scale = peak / max(1e-9, max(abs(s) for s in samples))
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(
            b"".join(struct.pack("<h", int(s * scale * 32767)) for s in samples)
        )


# Correct: quick rising major arpeggio (C6 -> E6 -> A6), bell voice, with the
# last note ringing out a little longer.
CORRECT = [
    (0.000, 0.16, 1046.5, 1046.5, bell, 14, 0.8),
    (0.075, 0.16, 1318.5, 1318.5, bell, 14, 0.8),
    (0.150, 0.42, 1760.0, 1760.0, bell, 7, 1.0),
]

# Incorrect: two low descending notes, the second drooping in pitch -
# a gentle "bwomp-womp", disappointed but not harsh.
INCORRECT = [
    (0.000, 0.16, 233.1, 233.1, soft_square, 6, 0.9),
    (0.150, 0.34, 185.0, 155.6, soft_square, 5, 1.0),
]

if __name__ == "__main__":
    write_wav(OUT_DIR / "correct.wav", render(CORRECT, 0.60))
    # Lower peak: the buzzy voice is denser, so it sounds louder at equal peak.
    write_wav(OUT_DIR / "incorrect.wav", render(INCORRECT, 0.52), peak=0.4)
    print(f"Wrote {OUT_DIR / 'correct.wav'} and {OUT_DIR / 'incorrect.wav'}")
