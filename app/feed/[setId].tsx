import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { FlashList } from "@shopify/flash-list";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DesktopCardPager } from "@/components/feed/DesktopCardPager";
import { dummyData } from "@/components/feed/dummyData";
import { BACK_BUTTON_SIZE, BACK_BUTTON_TOP_OFFSET } from "@/components/feed/layout";
import type { VocabularyItem } from "@/components/feed/types";
import { VocabularyCard } from "@/components/feed/VocabularyCard";

export default function FeedScreen() {
  const { setId } = useLocalSearchParams<{ setId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      {/* Go full-bleed: no default header on this route */}
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" />

      <Pressable
        onPress={() => router.back()}
        style={[styles.backButton, { top: insets.top + BACK_BUTTON_TOP_OFFSET }]}
      >
        <FontAwesome6 name="chevron-left" size={18} color="#fff" solid />
      </Pressable>

      {Platform.OS === "web" ? (
        <DesktopCardPager data={dummyData} />
      ) : (
        <FlashList
          data={dummyData}
          keyExtractor={(item: VocabularyItem) => item.id}
          renderItem={({ item }: { item: VocabularyItem }) => (
            <VocabularyCard item={item} />
          )}
          pagingEnabled
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#000",
  },
  backButton: {
    position: "absolute",
    left: 16,
    zIndex: 10,
    width: BACK_BUTTON_SIZE,
    height: BACK_BUTTON_SIZE,
    borderRadius: BACK_BUTTON_SIZE / 2,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
});
