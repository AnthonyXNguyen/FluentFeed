import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  BACK_BUTTON_SIZE,
  BACK_BUTTON_TOP_OFFSET,
  MIC_BUTTON_BOTTOM_OFFSET,
  MIC_BUTTON_SIZE,
  MIC_BUTTON_TO_HINT_GAP,
  MIC_HINT_TEXT_HEIGHT,
} from "./layout";

const CARD_WIDTH_RATIO = 0.82; // card width as a share of screen width
const CARD_ASPECT_RATIO = 1.2; // height : width (portrait)
const MIN_CARD_HEIGHT = 200; // floor for tiny windows
const CARD_EDGE_MARGIN = 20; // gap between the card and the back button / mic

// Sizes the flashcard. It's width-based by default; on wide, short (desktop)
// windows that would overflow onto the back button and mic, so the card is
// capped to the space between them and padded into that gap instead.
export function useCardLayout() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const reservedTop =
    insets.top + BACK_BUTTON_TOP_OFFSET + BACK_BUTTON_SIZE + CARD_EDGE_MARGIN;
  const reservedBottom =
    insets.bottom +
    MIC_BUTTON_BOTTOM_OFFSET +
    MIC_BUTTON_SIZE +
    MIC_BUTTON_TO_HINT_GAP +
    MIC_HINT_TEXT_HEIGHT +
    CARD_EDGE_MARGIN;

  const availableHeight = height - reservedTop - reservedBottom;
  const naturalWidth = width * CARD_WIDTH_RATIO;
  const isCramped = naturalWidth * CARD_ASPECT_RATIO > availableHeight;
  const cardWidth = isCramped
    ? Math.max(availableHeight, MIN_CARD_HEIGHT) / CARD_ASPECT_RATIO
    : naturalWidth;

  return {
    screenHeight: height,
    cardSize: { width: cardWidth, height: cardWidth * CARD_ASPECT_RATIO },
    // Only needed when cramped; otherwise the card is simply centered.
    containerPadding: isCramped
      ? { paddingTop: reservedTop, paddingBottom: reservedBottom }
      : null,
  };
}
