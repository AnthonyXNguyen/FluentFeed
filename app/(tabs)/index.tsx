import { Link } from "expo-router";
import { FlatList, Pressable, StyleSheet } from "react-native";

import { Text, View } from "@/components/Themed";

type VocabularySet = {
  id: string;
  title: string;
  language: string;
  wordCount: number;
};

// TODO: replace with real sets fetched from Supabase once auth/data are wired up.
const dummySets: VocabularySet[] = [
  { id: "1", title: "Spanish Basics", language: "Spanish", wordCount: 3 },
];

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Your Flashcard Sets</Text>
      <FlatList
        data={dummySets}
        keyExtractor={(set) => set.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Link href={`/feed/${item.id}`} asChild>
            <Pressable style={styles.card}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardSubtitle}>
                {item.language} · {item.wordCount} words
              </Text>
            </Pressable>
          </Link>
        )}
      />
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
  list: {
    gap: 12,
  },
  card: {
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
});
