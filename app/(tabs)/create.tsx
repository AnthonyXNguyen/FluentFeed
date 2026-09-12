import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useRouter } from 'expo-router';

import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useColorScheme } from '@/components/useColorScheme';

type CardDraft = {
  key: string;
  term: string;
  definition: string;
};

let nextCardKey = 0;
function makeCard(): CardDraft {
  nextCardKey += 1;
  return { key: `card-${nextCardKey}`, term: '', definition: '' };
}

export default function CreateScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [title, setTitle] = useState('');
  const [language, setLanguage] = useState('');
  const [cards, setCards] = useState<CardDraft[]>([makeCard(), makeCard()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateCard = (key: string, field: 'term' | 'definition', value: string) => {
    setCards((prev) => prev.map((c) => (c.key === key ? { ...c, [field]: value } : c)));
  };

  const addCard = () => setCards((prev) => [...prev, makeCard()]);

  const removeCard = (key: string) => setCards((prev) => prev.filter((c) => c.key !== key));

  const resetForm = () => {
    setTitle('');
    setLanguage('');
    setCards([makeCard(), makeCard()]);
  };

  const handleCreate = async () => {
    setError(null);

    const trimmedTitle = title.trim();
    const trimmedLanguage = language.trim();
    const validCards = cards
      .map((c) => ({ term: c.term.trim(), definition: c.definition.trim() }))
      .filter((c) => c.term && c.definition);

    if (!trimmedTitle) {
      setError('Give this set a title.');
      return;
    }
    if (!trimmedLanguage) {
      setError('Enter the language you’re studying.');
      return;
    }
    if (validCards.length === 0) {
      setError('Add at least one card with both a target word and a translation.');
      return;
    }
    if (!session?.user.id) {
      setError('You need to be signed in to create a set.');
      return;
    }

    setSaving(true);

    const { data: newSet, error: setError_ } = await supabase
      .from('vocab_sets')
      .insert({ user_id: session.user.id, title: trimmedTitle, language: trimmedLanguage })
      .select('id')
      .single();

    if (setError_ || !newSet) {
      setSaving(false);
      setError(setError_?.message ?? 'Could not create the set.');
      return;
    }

    const { error: itemsError } = await supabase.from('vocab_words').insert(
      validCards.map((c, index) => ({
        set_id: newSet.id,
        target_word: c.term,
        native_prompt: c.definition,
        position: index,
      }))
    );

    if (itemsError) {
      // Don't leave an empty orphaned set behind if the cards failed to save.
      await supabase.from('vocab_sets').delete().eq('id', newSet.id);
      setSaving(false);
      setError(itemsError.message);
      return;
    }

    setSaving(false);
    resetForm();
    router.replace('/');
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Create a new vocab set</Text>

        <TextInput
          style={[styles.input, { color: colors.text, borderColor: colors.tabIconDefault }]}
          placeholder="Title"
          placeholderTextColor={colors.tabIconDefault}
          value={title}
          onChangeText={setTitle}
        />
        <TextInput
          style={[styles.input, { color: colors.text, borderColor: colors.tabIconDefault }]}
          placeholder="Language (e.g. Spanish)"
          placeholderTextColor={colors.tabIconDefault}
          value={language}
          onChangeText={setLanguage}
        />

        {cards.map((card, index) => (
          <View
            key={card.key}
            style={[styles.cardRow, { borderColor: colors.tabIconDefault }]}>
            <View style={styles.cardRowHeader}>
              <Text style={styles.cardNumber}>{index + 1}</Text>
              <Pressable
                onPress={() => removeCard(card.key)}
                hitSlop={10}
                style={styles.deleteCardButton}>
                <FontAwesome6 name="trash" size={14} color="#e0245e" />
              </Pressable>
            </View>

            <View style={styles.cardFields}>
              <View style={styles.cardField}>
                <TextInput
                  style={[
                    styles.cardInput,
                    { color: colors.text, borderColor: colors.tabIconDefault },
                  ]}
                  placeholder="Enter target word"
                  placeholderTextColor={colors.tabIconDefault}
                  value={card.term}
                  onChangeText={(v) => updateCard(card.key, 'term', v)}
                />
                <Text style={styles.cardFieldLabel}>TARGET WORD</Text>
              </View>
              <View style={styles.cardField}>
                <TextInput
                  style={[
                    styles.cardInput,
                    { color: colors.text, borderColor: colors.tabIconDefault },
                  ]}
                  placeholder="Enter translation"
                  placeholderTextColor={colors.tabIconDefault}
                  value={card.definition}
                  onChangeText={(v) => updateCard(card.key, 'definition', v)}
                />
                <Text style={styles.cardFieldLabel}>TRANSLATION</Text>
              </View>
            </View>
          </View>
        ))}

        <Pressable
          style={[styles.addCardButton, { borderColor: colors.tabIconDefault }]}
          onPress={addCard}>
          <FontAwesome6 name="plus" size={14} color={colors.text} />
          <Text style={styles.addCardText}>Add a card</Text>
        </Pressable>

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          style={[styles.createButton, { backgroundColor: colors.tint }]}
          disabled={saving}
          onPress={handleCreate}>
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.createButtonText}>Create</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 60,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  cardRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  cardRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardNumber: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.6,
  },
  deleteCardButton: {
    padding: 4,
  },
  cardFields: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  cardField: {
    flexGrow: 1,
    flexBasis: 160,
    gap: 4,
  },
  cardInput: {
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  cardFieldLabel: {
    fontSize: 10,
    letterSpacing: 0.5,
    opacity: 0.5,
  },
  addCardButton: {
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'center',
    gap: 8,
    height: 44,
    paddingHorizontal: 20,
    borderRadius: 22,
    borderWidth: 1,
    marginTop: 4,
  },
  addCardText: {
    fontSize: 14,
    fontWeight: '600',
  },
  error: {
    color: '#e0245e',
    fontSize: 13,
  },
  createButton: {
    alignSelf: 'flex-end',
    height: 48,
    paddingHorizontal: 28,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
