# FluentFeed

Language-learning app shaped like a short-form video feed: each card shows a
word, you hold the mic and say it, and Azure Speech scores your pronunciation.
See README.md for setup and TODO.md for planned work.

## Layout
- `app/`: Expo Router screens (React Native, also runs on web)
- `components/feed/`: the card feed. `VocabularyCard.tsx` composes hooks
  (`usePronunciationAttempt`, `useAnswerFeedback`, `useCardLayout`) and small views.
- `lib/`: Supabase client, recorder (`useVoiceRecorder`), scoring API client
  (`pronunciationApi`), feedback sounds
- `backend/`: FastAPI service that calls Azure Speech pronunciation assessment
- `supabase/migrations/`: database SQL
- `e2e/`: Playwright tests; `.github/workflows/ci.yml`: CI

## Verify before saying you're done
Run what applies to your change and report the actual results:
```bash
npm run typecheck
npm run lint
npm run e2e                                  # Chromium, Firefox (+ WebKit on macOS 15+)
npm run e2e -- --project=chromium            # faster, one browser
cd backend && .venv/bin/ruff check . && .venv/bin/pytest -q
```
- CI runs all of these on every PR, and the PR can't merge until they pass.
- Fix lint/type errors properly. Don't disable or downgrade rules, add
  `eslint-disable`, or use `any` / `@ts-ignore` to make them go away.
- UI or animation changes: check them in Playwright, including with
  `reducedMotion: "reduce"` (see Reduce Motion below).

## Git and secrets
- **Never commit or push without asking.** Show the commit message first.
  The user usually runs git commands themselves.
- Work on a feature branch, never directly on `main`.
- Never print, log, or commit secrets. `.env` and `backend/.env` are
  gitignored. Don't `cat` them; check whether a key is set without echoing it.
- The `EXPO_PUBLIC_*` values in `ci.yml` are deliberate placeholders. Don't
  replace them with real ones.

## Running things
- Stop every dev server (Expo, uvicorn) and Playwright browser you start once
  your task is done. A leftover browser has stuck a blank window on the user's
  desktop before.
- The user's own Expo runs on port 8081; e2e uses 8099. Don't take over 8081.
- If the web app shows old code, Metro is serving a stale bundle: restart with
  `npx expo start --web --clear`.

## App conventions
- **Reduce Motion:** the user's Mac has it enabled. Answer feedback and card
  animations must still play, so pass `ReduceMotion.Never` to Reanimated
  (see the `timing` / `delay` / `sequence` helpers in `useAnswerFeedback.ts`).
- **Backend access:** `/pronunciation-assessment` requires the user's Supabase
  login token (`backend/app/auth.py`) and is rate-limited per user
  (`backend/app/rate_limit.py`). Keep any new endpoint that calls Azure behind both.
- **Errors:** never show raw API errors (status codes, "422 Unprocessable
  Content", HTML) to the user. The backend returns `{detail: {code, message}}`;
  `lib/pronunciationApi.ts` turns it into a friendly message. Add new error
  codes on both sides.
- **React:** follow the React Compiler lint rules. Don't set state inside
  effects. Derive values instead, or use `useEffectEvent` / `useSyncExternalStore`.
- **Structure:** keep components small. Put logic in hooks and keep comments
  short, explaining *why* rather than restating the code.
- **Styles:** use `boxShadow` and `pointerEvents` in styles. The old `shadow*`
  props and the `pointerEvents` prop are deprecated on web.
- **Assets:** sounds and images must be original
  (`scripts/generate_feedback_sounds.py`). Don't copy another app's.
- **Scoring language** is hardcoded to `en-US` in the backend. This is a known
  gap. Don't assume other languages are scored correctly.

## E2E tests
- Tests run the real app, but Supabase and the scoring API are faked
  (`e2e/fixtures.ts`). No real keys or network calls are needed, and tests
  control scores and errors through the `api` fixture.
- If you change a Supabase query or an API response shape, update the fakes in
  `fixtures.ts` to match. Otherwise the tests keep passing against the old shape.
- Press the mic only through `holdMic()`. It skips the test on WebKit, which
  has no microphone in CI.
- Wait for state with `expect.poll`, not fixed `waitForTimeout` delays. Card
  slides take about 280ms, so wait for them to settle before the next key press.
- Wheel/trackpad gestures: never decide a gesture by waiting for the event
  stream to go idle. Test with long decaying scroll bursts, not just short ones.

## Dependencies
- `@playwright/test` is pinned exactly. Update it with
  `npm run update:playwright` (or the monthly Dependabot PR), not by hand.
- The CI runner is pinned to `ubuntu-24.04` on purpose: Playwright must
  support that Ubuntu version to install its browsers.

## Working with the user
- The user is learning. When you introduce a new tool or concept, explain it
  in a sentence or two.
- For visible UI or animation changes, show the result (Playwright screenshot
  or video) and get approval before calling it final.
- When several agents work in parallel (separate worktrees), stay in your own
  branch and files. Mention it if your change needs to touch shared files like
  `VocabularyCard.tsx`.
