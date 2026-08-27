import type { VocabularyItem } from "./types";

// TODO: replace with real data fetched using `setId` once sets are backed by Supabase.
export const dummyData: VocabularyItem[] = [
  { id: "1", target_word: "Hola", native_prompt: "Hello" },
  { id: "2", target_word: "Gracias", native_prompt: "Thank you" },
  { id: "3", target_word: "Adiós", native_prompt: "Goodbye" },
];
