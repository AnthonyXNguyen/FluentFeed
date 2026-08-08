import { useLocalSearchParams } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { View, Text, Dimensions } from "react-native";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

type VocabularyItem = {
  id: string;
  target_word: string;
  native_prompt: string;
};

// TODO: replace with real data fetched using `setId` once sets are backed by Supabase.
const dummyData: VocabularyItem[] = [
  { id: "1", target_word: "Hola", native_prompt: "Hello" },
  { id: "2", target_word: "Gracias", native_prompt: "Thank you" },
  { id: "3", target_word: "Adiós", native_prompt: "Goodbye" },
];

const VocabularyCard = ({ item }: { item: VocabularyItem }) => {
  return (
    <View style={{ height: SCREEN_HEIGHT, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: '#fff', fontSize: 32, fontWeight: 'bold' }}>{item.target_word}</Text>
      <Text style={{ color: '#aaa', fontSize: 18 }}>{item.native_prompt}</Text>
      {/* Recording Button and UI overlays go here */}
    </View>
  );
};

export default function FeedScreen() {
  const { setId } = useLocalSearchParams<{ setId: string }>();

  return (
    <FlashList
      data={dummyData}
      keyExtractor={(item: VocabularyItem) => item.id}
      renderItem={({ item }: { item: VocabularyItem }) => <VocabularyCard item={item} />}
      pagingEnabled
      showsVerticalScrollIndicator={false}
    />
  );
}

/*
Notes:

props object VocabularyItem
{ item:      { id: "1", target_word: "Hola", native_prompt: "Hello" } }

The props object is what React passes to every component

I was confused what : is in typescript
({ item, language, cardIndex }: { item: VocabularyItem, language: string, cardIndex: number })

The : is how TypeScript says: "here's what type that thing on the left is."
So, item is of type VocabularyItem, language is type string, and cardIndex is type number

*/
