# Shorts Mode: Plan

The flagship feature. Users scroll short videos in the language they're learning, and after each one they get a quick quiz before the next video loads. It sits alongside the existing vocab-card mode; users can use either or both.

## The experience
1. User picks a **target language** and optionally a **category** (comedy, cooking, travel...) or a **specific channel**.
2. A Short plays full-screen in the feed.
3. On swipe up, a **quiz card** slides in instead of the next video. Answer it to continue ("to get to the next card, you have to speak" still applies).
4. Results feed into the user's progress; words they missed can become vocab cards.

### Quiz types (build in this order)
| Type | What the user does | How it's graded | Difficulty to build |
|---|---|---|---|
| **Comprehension (MCQ)** | "What happened in the video?" pick 1 of 4 | Exact match | Easy |
| **Shadowing** | Hear a phrase from the video again, then say it | Existing Azure pronunciation assessment, with the phrase as reference text | Easy (reuses the backend) |
| **Translation** | Translate a phrase into their native language (typed or spoken) | LLM judges whether the meaning matches; exact-match won't work | Medium |

## The hard part: content and transcripts
Every quiz needs to know what was said in the video and when (a timestamped transcript). There are three ways to get one, and **the obvious ones have problems:**

- **YouTube's official captions API** (`captions.download`) only works for videos you own. You can't use it on other creators' Shorts.
- **Scraping captions** (e.g. the `youtube-transcript-api` Python package) is unofficial. It goes against YouTube's Terms, breaks without warning, and YouTube often blocks it from cloud servers like AWS.
- **Downloading the audio and transcribing it yourself** (yt-dlp + Whisper/Azure) gives the best transcripts, but downloading YouTube content is explicitly against YouTube's Terms of Service. That's a real risk for an App Store app.

**Options that stay within the rules:**
- **Creative Commons videos.** YouTube search can filter by `videoLicense=creativeCommon`. CC-BY videos allow reuse with attribution, so transcribing them is defensible. The catch is a smaller pool, especially for Shorts in every language.
- **Hand-curated seed set.** For the MVP, pick 20–50 Shorts per language yourself and write or verify the transcripts. Doesn't scale, but it's enough to find out whether the feature is fun before building a pipeline.
- **Creator partnerships / own content later.** Language creators who opt in and provide transcripts. A long-term option.

> Before writing pipeline code, read the [YouTube API Services Terms](https://developers.google.com/youtube/terms/api-services-terms-of-service) and [Developer Policies](https://developers.google.com/youtube/terms/developer-policies). They cover embedding, how long you can store API data, and what you can't do with videos.

### Other YouTube constraints
- **Playback must use YouTube's embedded player.** In React Native that means `react-native-youtube-iframe` (a WebView around the IFrame player). No custom video player, no hiding YouTube's branding.
- **API quota is small.** The default is 10,000 units/day and one `search.list` call costs 100, so about 100 searches a day for the whole app. Searches have to happen on the backend and get cached; the app should never call the YouTube API per user.
- **"Short" isn't an API filter.** `videoDuration=short` means under 4 minutes, so you'll need to filter further (duration ≤ 60–180s, vertical aspect ratio).

## Architecture
Precompute everything. When a user scrolls, the video, transcript, and quiz should already be sitting in Supabase. Nothing is transcribed or generated live.

```
Ingestion job (backend, runs on a schedule or by hand)
  1. Find candidates  → YouTube Data API search (language, category, channel)
  2. Filter           → duration, has speech, language matches, license
  3. Get transcript   → curated / CC transcription (Azure or Whisper)
  4. Generate quizzes → LLM reads transcript → MCQ + shadowing phrases + translation prompts
  5. Store            → Supabase

App
  Feed asks backend/Supabase for the next N videos → plays via IFrame → shows quiz card → posts result
```

### New Supabase tables (draft)
- `videos`: `youtube_id`, `language`, `category`, `channel_id`, `title`, `duration_s`, `license`, `fetched_at`
- `video_transcripts`: `video_id`, `segments` (JSON: `[{start, end, text}]`), `source` (curated / azure / whisper)
- `video_quizzes`: `video_id`, `type` (mcq / shadowing / translation), `payload` (JSON: question, choices, answer, or phrase + timestamp)
- `video_attempts`: `user_id`, `quiz_id`, `score`, `answer`, `created_at` (RLS: users see only their own)
- `profiles`: add `native_language` (only `target_language` exists today)

### New backend endpoints (draft)
- `GET /shorts/feed?language=&category=&channel=`: next batch of videos with their quizzes
- `POST /shorts/grade-translation`: LLM checks a user's translation against the transcript
- Shadowing reuses the existing pronunciation endpoint with the phrase as reference text

## Build phases
**Phase 0: Spike (a few days).** Answer the risky questions before committing.
- [ ] Read the YouTube API terms; decide on content sourcing (curated / CC / other)
- [ ] Get a YouTube Data API key; check how many CC Shorts exist per target language
- [ ] Embed one Short in the feed with `react-native-youtube-iframe`; confirm it plays on iOS, Android, and web

**Phase 1: Playback in the feed.**
- [ ] Shorts feed screen reusing the existing pager (`components/feed`)
- [ ] Hardcoded list of ~10 video IDs; swipe between them
- [ ] Mode picker: Vocab cards / Shorts / Mixed

**Phase 2: Curated content + first quizzes (MVP).**
- [ ] Supabase tables above
- [ ] Seed 20–50 videos per language with verified transcripts
- [ ] Quiz card component; MCQ and shadowing quizzes
- [ ] Shadowing: replay the phrase's segment (`seekTo(start)`), then grade with Azure
- [ ] Add `native_language` to profiles and onboarding
- [ ] **Playtest: is it fun?** Decide whether to keep going before Phase 3

**Phase 3: Quiz generation + translation grading.**
- [ ] LLM step that turns a transcript into quizzes (structured JSON output)
- [ ] Translation quiz with LLM grading (lenient on wording, strict on meaning)
- [ ] Human review screen or flag so bad generated quizzes can be fixed

**Phase 4: Discovery.**
- [ ] Backend ingestion job with caching to stay under the API quota
- [ ] Category picker and channel search
- [ ] Refresh/expire stored YouTube data as the API policies require

**Phase 5: Tie-ins.**
- [ ] Missed words from videos become vocab cards
- [ ] Spaced repetition across both modes
- [ ] Streaks/XP shared across modes
- [ ] *(Maybe)* "From your subscriptions": request the `youtube.readonly` scope on top of the existing Google sign-in. This needs Google's OAuth verification (privacy policy, demo video), and most subscribed channels won't be Creative Commons, so it's for picking channels, not a content source

## Open questions
- Which native languages do we support for translation quizzes at launch?
- Are subtitles shown while the video plays (easier) or hidden (harder, more learning)? Maybe a toggle.
- Should a wrong answer let you rewatch the video, or just show the answer and move on?
- Content sourcing decision from Phase 0. This shapes everything after it.
