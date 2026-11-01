# FluentFeed
An "addictive" language-learning app that turns pronunciation practice into a Reels-style infinite scroll, with AI grading every word you say.

Most language apps are passive; FluentFeed is active. **To get to the next card, you have to speak.**

## How it works
- **The feed:** swipe through vocab cards in a vertical, Reels-style feed.
- **Speak to advance:** each card shows a word or phrase you have to pronounce correctly to move on.
- **AI grading:** Azure Speech scores your accuracy, fluency, and prosody (pitch/intonation) down to the phoneme.
- **Tonal languages:** prosody scoring helps with tone-heavy languages like Vietnamese.

## Tech stack
- **Frontend:** React Native (Expo), FlashList, Reanimated
- **Backend:** FastAPI (Python) for pronunciation grading
- **Database & auth:** Supabase (PostgreSQL); Google, Apple, or email/password sign-in
- **Speech AI:** Azure Speech Service pronunciation assessment

Full dependency list: [docs/DEPENDENCIES.md](docs/DEPENDENCIES.md)

## Status & roadmap
In active development. The MVP supports English and Spanish, with Vietnamese tone-matching.

Planned:
- **Shorts Mode (flagship):** scroll real short-form videos in your target language, pick a category or channel, and answer a quick quiz after each one: say a phrase from the video, pick what happened, or translate a line into your native language. Vocab cards stay available as their own mode, or mix both. Plan: [docs/SHORTS_FEATURE.md](docs/SHORTS_FEATURE.md)
- Native audio so you can hear each word before saying it
- Active Recall mode: see an English prompt, speak the translation from memory (OpenAI Whisper)
- Spaced repetition that brings missed words back into the feed
- More tonal languages (Chinese, Japanese, Korean)
- Deployment via Expo EAS and AWS App Runner

See [TODO.md](TODO.md) for the detailed task list.

## Getting started
**1. Install dependencies**
```bash
npm install
cd backend && python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
```

**2. Set up environment variables**

`.env` in the project root:
```
EXPO_PUBLIC_SUPABASE_URL=       # Supabase > Project Settings > API > Project URL
EXPO_PUBLIC_SUPABASE_ANON_KEY=  # Supabase anon/public key
EXPO_PUBLIC_API_URL=            # backend URL; use your computer's LAN IP on a physical device
```

`backend/.env`:
```
AZURE_SPEECH_KEY=      # Azure Portal > Speech resource > Keys and Endpoint
AZURE_SPEECH_REGION=   # e.g. eastus
CORS_ORIGINS=          # optional, comma-separated allowed origins
YOUTUBE_API_KEY=       # Shorts Mode, backend only; Google Cloud > YouTube Data API v3 > Credentials
```

**3. Run**
```bash
# Frontend
npx expo start

# Backend (separate terminal)
cd backend && source .venv/bin/activate && uvicorn app.main:app --reload --port 8000
```
