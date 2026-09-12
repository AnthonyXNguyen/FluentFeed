import { useColorScheme as useRNColorScheme } from 'react-native';

// React Native's own type now includes 'unspecified' (Android's "no
// preference set" state) alongside 'light' | 'dark' | null. The rest of the
// app only knows about light/dark, so fold 'unspecified' into null here -
// callers already fall back with `?? 'light'`.
export function useColorScheme(): 'light' | 'dark' | null {
  const scheme = useRNColorScheme();
  return scheme === 'light' || scheme === 'dark' ? scheme : null;
}
