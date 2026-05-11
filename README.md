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


# How to Run
npx expo start