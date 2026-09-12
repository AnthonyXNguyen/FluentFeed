import { FlashList, type FlashListRef } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { useRef } from "react";
import { type NativeScrollEvent, type NativeSyntheticEvent, useWindowDimensions } from "react-native";

import { VocabularyCard } from "./VocabularyCard";
import type { VocabularyItem } from "./types";

// Mobile counterpart to DesktopCardPager: same gating rules (can't swipe
// past an uncleared card, clearing one auto-advances), but built on
// FlashList's native paged scrolling instead of a custom wheel/keyboard
// driver, since touch swipes already carry real momentum here.
export const MobileCardPager = ({
  data,
  setId,
}: {
  data: VocabularyItem[];
  setId: string;
}) => {
  const { height: screenHeight } = useWindowDimensions();
  const router = useRouter();
  const listRef = useRef<FlashListRef<VocabularyItem>>(null);
  // Mirrors DesktopCardPager's unlockedIndexRef: the furthest index reachable.
  const unlockedIndexRef = useRef(0);

  const handleCardCleared = (index: number) => {
    if (index >= data.length - 1) {
      router.replace(`/feed/${setId}/complete`);
      return;
    }
    const next = index + 1;
    unlockedIndexRef.current = Math.max(unlockedIndexRef.current, next);
    listRef.current?.scrollToIndex({ index: next, animated: true });
  };

  // A swipe past an uncleared card still plays out natively (there's no way
  // to intercept touch-driven momentum mid-gesture), so once it settles,
  // snap back if it landed beyond what's unlocked.
  const handleMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const landedIndex = Math.round(e.nativeEvent.contentOffset.y / screenHeight);
    if (landedIndex > unlockedIndexRef.current) {
      listRef.current?.scrollToIndex({ index: unlockedIndexRef.current, animated: true });
    }
  };

  return (
    <FlashList
      ref={listRef}
      data={data}
      keyExtractor={(item: VocabularyItem) => item.id}
      renderItem={({ item, index }: { item: VocabularyItem; index: number }) => (
        <VocabularyCard item={item} onCleared={() => handleCardCleared(index)} />
      )}
      pagingEnabled
      showsVerticalScrollIndicator={false}
      onMomentumScrollEnd={handleMomentumScrollEnd}
    />
  );
};
