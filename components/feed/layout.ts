// The back button lives in FeedScreen, but VocabularyCard needs to know its
// footprint to reserve space for it on cramped desktop windows (see
// VocabularyCard.tsx). Shared here so both stay in sync automatically -
// FeedScreen's actual button uses these same numbers for its own layout.
export const BACK_BUTTON_TOP_OFFSET = 12; // offset from the top safe-area inset
export const BACK_BUTTON_SIZE = 36; // width/height of the circular button
