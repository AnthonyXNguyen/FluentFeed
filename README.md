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

TODO: Check that login stuff still works on mobile (verified, kind of)

TODO: Implement feature of user adding vocab cards
TODO: Implement feature of AI voice grading. (Lenient, and Hard Mode). Make Azure Microsoft Account
TODO: Publish to App Store
TODO: Improve UI on deleting a set. Its the default alert. 
TODO: Add a finished studying set success screen. Add a back to home screen button

TODO: No red X animation when pronounced wrong. 
TODO: Add audio feedback when a user succeeds and fails pronounciation
TODO: Add a easy/hard mode on grading voice pronoounciation
TODO: Let a user hear a robot pronounce the word, 

TODO: Sign in with Google/Apple also needs to automatically create a profile account, but doesn't
TODO: Migrate expo-av (deprecated, flagged unmaintained by expo-doctor) to expo-audio for the pronunciation recorder in lib/useVoiceRecorder.ts

TODO (for my learning):
Review SQL files
Review User authentication
Review Create page 
Review Backend

Notes: Google auth wrx...supabse.co, will always be present unless paid

# Download Dependencies
npm install
cd backend && pip install -r requirements.txt

## Dependencies
- expo `^57.0.20` — core Expo SDK/runtime
- expo-router `~57.0.19` — file-based navigation (no longer built on react-navigation as of SDK 56+; see `expo-router/react-navigation` for theming/focus-effect APIs)
- expo-av `~16.0.8` — audio/video playback (pronunciation audio) - deprecated upstream, kept for now, see TODO
- expo-blur `~57.0.2` — blur view effects (UI backgrounds/overlays)
- expo-constants `~57.0.17` — access to app/device config at runtime
- expo-font `~57.0.3` — custom font loading
- expo-linear-gradient `~57.0.1` — gradient backgrounds (feed cards)
- expo-linking `~57.0.9` — deep linking
- expo-splash-screen `~57.0.8` — splash screen control (configured via its plugin entry in `app.json`, not a top-level `splash` key)
- expo-status-bar `~57.0.1` — status bar styling
- expo-web-browser `~57.0.2` — in-app browser (OAuth/external links)
- react `19.2.3` — UI library
- react-dom `19.2.3` — React renderer for the web build
- react-native `0.86.3` — native app framework
- react-native-reanimated `4.5.1` — animations for haptic/UI feedback
- react-native-worklets `0.10.1` — worklet runtime backing Reanimated
- react-native-safe-area-context `~5.7.0` — safe-area insets
- react-native-screens `~4.26.0` — native screen primitives for navigation
- react-native-web `~0.21.0` — web support for React Native components
- react-native-url-polyfill `^4.0.0` — URL polyfill required by the Supabase JS client on React Native
- @expo/vector-icons `^15.0.3` — icon sets (FontAwesome6, etc.)
- @react-native-async-storage/async-storage `2.2.0` — persistent local storage (Supabase auth session)
- @react-navigation/native `^7.1.8` — no longer imported directly (superseded by `expo-router/react-navigation`); still installed as a transitive dependency of expo-router
- @shopify/flash-list `2.0.2` — high-performance list powering the Reels-style feed
- @supabase/supabase-js `^2.112.4` — Supabase client (auth, database)

### Dev Dependencies
- typescript `~6.0.3`
- @types/react `~19.2.4`
- @expo/ngrok `^4.1.3` — tunnel support for testing Expo Go on a physical device across networks

### Backend Dependencies (Python, see `backend/requirements.txt`)
- fastapi `0.115.0` — API framework serving the pronunciation-grading backend
- uvicorn[standard] `0.30.6` — ASGI server running FastAPI
- azure-cognitiveservices-speech `1.40.0` — Azure Speech SDK (pronunciation assessment)
- python-dotenv `1.0.1` — loads `backend/.env` config (Azure keys, etc.)
- python-multipart `0.0.9` — parses multipart/form-data (recorded-audio uploads)

# How to Run
Frontend - npx expo start
Backend - cd backend && source .venv/bin/activate && uvicorn app.main:app --reload --port 8000