import { Stack } from "expo-router";

// Collapses everything under app/feed/ into a single "feed" screen in the
// root Stack (mirrors (tabs)/_layout.tsx) - without this, the root layout's
// <Stack.Screen name="feed"> guard has nothing to match, since the nested
// routes register under their own leaf names instead.
export default function FeedLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
