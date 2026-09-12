import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Platform, Pressable, StyleSheet } from "react-native";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { Link } from "expo-router";
import { useFocusEffect } from "expo-router/react-navigation";

import { Text, View } from "@/components/Themed";
import { supabase } from "@/lib/supabase";

type VocabularySet = {
  id: string;
  title: string;
  language: string;
  wordCount: number;
};

export default function HomeScreen() {
  const [sets, setSets] = useState<VocabularySet[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSets = useCallback(async () => {
    const { data, error } = await supabase
      .from("vocab_sets")
      .select("id, title, language, vocab_words(count)")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setSets(
        data.map((row: any) => ({
          id: row.id,
          title: row.title,
          language: row.language,
          wordCount: row.vocab_words?.[0]?.count ?? 0,
        }))
      );
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchSets();
    }, [fetchSets])
  );

  const handleDelete = (id: string, title: string) => {
    const doDelete = async () => {
      setSets((prev) => prev.filter((s) => s.id !== id));
      await supabase.from("vocab_sets").delete().eq("id", id);
    };

    if (Platform.OS === "web") {
      if (window.confirm(`Delete "${title}"? This can't be undone.`)) {
        doDelete();
      }
    } else {
      Alert.alert('Delete set?', `"${title}" and its cards will be permanently deleted.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Your Vocab Sets</Text>

      {loading ? (
        <ActivityIndicator style={styles.loading} />
      ) : sets.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            No flashcard sets yet. Create one from the Create tab to get started.
          </Text>
        </View>
      ) : (
        <FlatList
          data={sets}
          keyExtractor={(set) => set.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Link href={`/feed/${item.id}`} asChild style={styles.cardLink}>
                <Pressable style={styles.card}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.cardSubtitle}>
                    {item.language} · {item.wordCount} words
                  </Text>
                </Pressable>
              </Link>
              <Pressable
                onPress={() => handleDelete(item.id, item.title)}
                hitSlop={10}
                style={styles.deleteButton}>
                <FontAwesome6 name="trash" size={16} color="#e0245e" />
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
  },
  loading: {
    marginTop: 40,
  },
  empty: {
    marginTop: 40,
    paddingHorizontal: 8,
  },
  emptyText: {
    fontSize: 15,
    opacity: 0.6,
    textAlign: "center",
  },
  list: {
    gap: 12,
    paddingBottom: 100,
  },
  row: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 8,
  },
  cardLink: {
    flex: 1,
    minWidth: 0,
  },
  card: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ccc",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#888",
    marginTop: 4,
  },
  deleteButton: {
    width: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ccc",
  },
});
