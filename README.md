# FluentFeed
FluentFeed is an "addictive" language-learning platform that reimagines pronunciation practice through the lens of short-form social media. By merging the high-engagement, infinite-scroll UI of Instagram Reels with advanced AI-driven speech analysis, FluentFeed forces active vocal participation in every "scroll." 

Most language apps are passive; FluentFeed is active. To get to the next card, you have to speak.

Background of Product:
The "Reels" Feed: A buttery-smooth vertical paging interface built with React Native.

Active Output: Each card presents a word or phrase (with native audio shadowing) that the user must pronounce to trigger the next item in the feed.

AI-Powered Grading: Real-time analysis of accuracy, fluency, and prosody (pitch/intonation) using the Azure Speech SDK.

Active Recall Mode: A "Translation" challenge where users see an English prompt and must speak the target language translation from memory to proceed.

Tech Stack:
Frontend: React Native (Expo), FlashList for high-performance paging, and Reanimated for haptic/UI feedback loops.
Backend: FastAPI (Python) for high-concurrency audio processing and AI orchestration.
Database & Auth: Supabase (PostgreSQL) for managing user streaks, vocabulary mastery, and relational progress tracking.

AI Engine:
Azure Speech Service: Granular pronunciation assessment (Phoneme-level scoring).
OpenAI Whisper: Speech-to-text for the translation/active-recall mode.
Infrastructure: Deployments managed via AWS App Runner and Expo EAS.

Key Features:
Tonal Language Support: Specialized prosody assessment designed to help learners master the nuances of languages like Vietnamese.
Spaced Repetition (SRS): An intelligent backend algorithm that re-injects missed or low-score words back into the feed at optimal intervals.
Dark Mode Minimalist UI: An ultra-sleek, high-contrast aesthetic designed for focus and "doom-scrolling" productivity.

Project Status:
FluentFeed is currently in active development. The current MVP supports English and Spanish, and offers Vietnamese tone-matching logic. Potential to expand to other tonal languages like Chinese, Japanese, Korean. 

# Download Dependencies
npm install

## Dependencies
- expo `~54.0.36` — core Expo SDK/runtime
- expo-router `~6.0.24` — file-based navigation
- expo-av `~16.0.8` — audio/video playback (pronunciation audio)
- expo-constants `~18.0.13` — access to app/device config at runtime
- expo-font `~14.0.12` — custom font loading
- expo-linking `~8.0.11` — deep linking
- expo-splash-screen `~31.0.13` — splash screen control
- expo-status-bar `~3.0.9` — status bar styling
- expo-web-browser `~15.0.10` — in-app browser (OAuth/external links)
- react `19.1.0` — UI library
- react-dom `19.1.0` — React renderer for the web build
- react-native `0.81.5` — native app framework
- react-native-reanimated `~4.1.1` — animations for haptic/UI feedback
- react-native-worklets `0.5.1` — worklet runtime backing Reanimated
- react-native-safe-area-context `~5.6.0` — safe-area insets
- react-native-screens `~4.16.0` — native screen primitives for navigation
- react-native-web `~0.21.0` — web support for React Native components
- @expo/vector-icons `^15.0.3` — icon sets (FontAwesome6, etc.)
- @react-navigation/native `^7.1.8` — navigation core (used by expo-router)
- @shopify/flash-list `2.0.2` — high-performance list powering the Reels-style feed

### Dev Dependencies
- typescript `~5.9.2`
- @types/react `~19.1.0`
- react-test-renderer `19.1.0`

# How to Run
npx expo start