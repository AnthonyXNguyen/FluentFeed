// Layout numbers shared between components, so a size used to *draw*
// something and the space *reserved* for it can't drift apart.

// Back button (rendered by FeedScreen, reserved for by useCardLayout).
export const BACK_BUTTON_TOP_OFFSET = 12; // below the top safe-area inset
export const BACK_BUTTON_SIZE = 36;

// Mic button + hint (rendered by MicButton, reserved for by useCardLayout).
export const MIC_BUTTON_BOTTOM_OFFSET = 32; // above the bottom safe-area inset
export const MIC_BUTTON_SIZE = 72;
export const MIC_BUTTON_TO_HINT_GAP = 8;
export const MIC_HINT_TEXT_HEIGHT = 18; // estimate - text isn't measured

// Flashcard corners; overlays use it too so they don't poke past the card.
export const CARD_BORDER_RADIUS = 28;
