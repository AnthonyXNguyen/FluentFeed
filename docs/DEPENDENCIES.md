# Dependencies

Install with `npm install` (frontend) and `pip install -r backend/requirements.txt` (backend).

## Frontend
- expo `^57.0.20` — core Expo SDK/runtime
- expo-router `~57.0.19` — file-based navigation (no longer built on react-navigation as of SDK 56+; see `expo-router/react-navigation` for theming/focus-effect APIs)
- expo-av `~16.0.8` — audio/video playback (pronunciation audio) - deprecated upstream, kept for now, see [TODO.md](../TODO.md)
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

## Dev Dependencies
- typescript `~6.0.3`
- @types/react `~19.2.4`
- @expo/ngrok `^4.1.3` — tunnel support for testing Expo Go on a physical device across networks

## Backend (Python, see `backend/requirements.txt`)
- fastapi `0.115.0` — API framework serving the pronunciation-grading backend
- uvicorn[standard] `0.30.6` — ASGI server running FastAPI
- azure-cognitiveservices-speech `1.40.0` — Azure Speech SDK (pronunciation assessment)
- python-dotenv `1.0.1` — loads `backend/.env` config (Azure keys, etc.)
- python-multipart `0.0.9` — parses multipart/form-data (recorded-audio uploads)
