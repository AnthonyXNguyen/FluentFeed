import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DesktopCardPager } from "@/components/feed/DesktopCardPager";
import { BACK_BUTTON_SIZE, BACK_BUTTON_TOP_OFFSET } from "@/components/feed/layout";
import { MobileCardPager } from "@/components/feed/MobileCardPager";
import type { VocabularyItem } from "@/components/feed/types";
import { supabase } from "@/lib/supabase";

export default function FeedScreen() {
  const { setId } = useLocalSearchParams<{ setId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<VocabularyItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    supabase
      .from("vocab_words")
      .select("id, target_word, native_prompt")
      .eq("set_id", setId)
      .order("position", { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error && data) setItems(data);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [setId]);

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />

      <Pressable
        onPress={() => router.back()}
        style={[styles.backButton, { top: insets.top + BACK_BUTTON_TOP_OFFSET }]}
      >
        <FontAwesome6 name="chevron-left" size={18} color="#fff" solid />
      </Pressable>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#fff" />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>This set has no cards yet.</Text>
        </View>
      ) : Platform.OS === "web" ? (
        <DesktopCardPager data={items} setId={setId} />
      ) : (
        <MobileCardPager data={items} setId={setId} />
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
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: "#fff",
    fontSize: 15,
    opacity: 0.7,
  },
});
