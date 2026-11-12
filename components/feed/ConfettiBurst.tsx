import { StyleSheet, View } from "react-native";
import Animated, { type SharedValue, useAnimatedStyle } from "react-native-reanimated";

// No green - it would vanish against the green celebration flash.
const COLORS = ["#ffd166", "#ff6b9d", "#4cc9f0", "#ff9f1c", "#b388ff", "#ffffff"];
const PARTICLE_COUNT = 32;

// Fixed (not Math.random) so every burst looks the same and renders are
// deterministic - the spread still reads as random to the eye.
const PARTICLES = Array.from({ length: PARTICLE_COUNT }, (_, i) => {
  const jitter = ((i * 37) % 11) / 11; // 0..1, scrambled per index
  return {
    angle: (i / PARTICLE_COUNT) * Math.PI * 2 + jitter * 0.4,
    distance: 170 + jitter * 200,
    size: 12 + ((i * 13) % 5) * 3,
    spin: (i % 2 === 0 ? 1 : -1) * (180 + jitter * 360),
    color: COLORS[i % COLORS.length],
    round: i % 3 === 0,
  };
});

type Particle = (typeof PARTICLES)[number];

const ConfettiPiece = ({ p, progress }: { p: Particle; progress: SharedValue<number> }) => {
  const style = useAnimatedStyle(() => {
    const t = progress.value;
    // Fly outward, then let "gravity" pull the piece down as it slows.
    const x = Math.cos(p.angle) * p.distance * t;
    const y = Math.sin(p.angle) * p.distance * t + 90 * t * t;
    return {
      opacity: t === 0 ? 0 : t < 0.65 ? 1 : 1 - (t - 0.65) / 0.35,
      transform: [
        { translateX: x },
        { translateY: y },
        { rotate: `${p.spin * t}deg` },
        { scale: 1 - 0.3 * t },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.piece,
        {
          width: p.size,
          height: p.round ? p.size : p.size * 0.5,
          borderRadius: p.round ? p.size / 2 : 2,
          backgroundColor: p.color,
          marginLeft: -p.size / 2,
          marginTop: -p.size / 4,
        },
        style,
      ]}
    />
  );
};

// A one-shot burst from the centre of its parent. Drive `progress` 0 -> 1
// to play it; leave it at 0 to keep it hidden.
export const ConfettiBurst = ({ progress }: { progress: SharedValue<number> }) => (
  <View style={styles.container}>
    {PARTICLES.map((p, i) => (
      <ConfettiPiece key={i} p={p} progress={progress} />
    ))}
  </View>
);

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    pointerEvents: "none",
  },
  piece: {
    position: "absolute",
    left: "50%",
    top: "50%",
  },
});
