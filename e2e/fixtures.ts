import { test as base, expect, type Page, type Route } from "@playwright/test";

// Fake data served in place of Supabase.
export const SETS: Record<string, { id: string; target_word: string; native_prompt: string }[]> = {
  set1: [
    { id: "w1", target_word: "manzana", native_prompt: "apple" },
    { id: "w2", target_word: "perro", native_prompt: "dog" },
    { id: "w3", target_word: "gato", native_prompt: "cat" },
  ],
  empty: [],
};

// Shape of a fake response from the scoring API.
type ScoringReply =
  | { score: number }
  | { status: number; json?: unknown; body?: string }
  | { networkError: true };

export type FakeApi = {
  /** What the next pronunciation request returns (default: score 50). */
  reply: ScoringReply;
  /** Extra latency before the scoring API answers, in ms. */
  latencyMs: number;
  /** Number of pronunciation requests received. */
  calls: number;
  /** Authorization header of each request (the backend requires a login). */
  authHeaders: (string | undefined)[];
};

// Matches the localStorage key supabase-js derives from the URL host.
const SESSION_KEY = "sb-fakesb-auth-token";

export const test = base.extend<{
  api: FakeApi;
  vocab: typeof SETS;
  consoleLog: void;
}>({
  vocab: [SETS, { option: true }],

  // On failure, surface the browser's warnings/errors (e.g. why the mic
  // failed to start), not just the on-screen text the assertion saw.
  consoleLog: [
    async ({ page }, use, testInfo) => {
      const lines: Promise<string>[] = [];
      page.on("console", (m) => {
        // Only warnings/errors - info logs and React's dev "timeStamp"
        // markers are noise and push the cause out of view.
        if (m.type() !== "warning" && m.type() !== "error") return;
        // Error objects otherwise print as "JSHandle@object"; read them.
        const args = m.args().map((a) =>
          a
            .evaluate((v) => (v instanceof Error ? `${v.name}: ${v.message}` : String(v)))
            .catch(() => "?")
        );
        lines.push(Promise.all(args).then((parts) => `[${m.type()}] ${parts.join(" ")}`));
      });
      page.on("pageerror", (e) => lines.push(Promise.resolve(`[pageerror] ${e.name}: ${e.message}`)));
      await use();

      if (testInfo.status === testInfo.expectedStatus || !lines.length) return;
      const log = (await Promise.all(lines)).join("\n");
      await testInfo.attach("browser-console.txt", { body: log, contentType: "text/plain" });
      // In CI, raise it as an error so it shows in the PR's annotations
      // (job logs need a login to read; annotations don't).
      if (process.env.CI) throw new Error(`Browser console:\n${log.slice(-1500)}`);
      console.log(`--- browser console (${testInfo.title}) ---\n${log}`);
    },
    { auto: true },
  ],

  // Auto: every test gets a signed-in fake session, fake Supabase, a fake
  // scoring API it can control, and a log of feedback sounds played.
  api: [async ({ page, vocab }, use) => {
    const api: FakeApi = { reply: { score: 50 }, latencyMs: 100, calls: 0, authHeaders: [] };

    await page.addInitScript((key) => {
      const now = Math.floor(Date.now() / 1000);
      localStorage.setItem(
        key,
        JSON.stringify({
          access_token: "fake-access",
          refresh_token: "fake-refresh",
          token_type: "bearer",
          expires_in: 3600,
          expires_at: now + 3600,
          user: {
            id: "user-1",
            aud: "authenticated",
            role: "authenticated",
            email: "test@example.com",
            app_metadata: {},
            user_metadata: {},
            created_at: new Date().toISOString(),
          },
        })
      );
      // Record every sound the page plays.
      const w = window as unknown as { __sounds: string[] };
      w.__sounds = [];
      const play = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function () {
        const src = this.currentSrc || this.src;
        w.__sounds.push(/incorrect/.test(src) ? "incorrect" : /correct/.test(src) ? "correct" : src);
        return play.call(this);
      };
    }, SESSION_KEY);

    await page.route("http://fakesb.test/**", (route) => {
      const url = new URL(route.request().url());
      // Home screen's set list: one set, so tests can open it like a user.
      if (url.pathname === "/rest/v1/vocab_sets") {
        return route.fulfill({
          json: [{ id: "set1", title: "Spanish basics", language: "Spanish", vocab_words: [{ count: 3 }] }],
        });
      }
      if (url.pathname === "/rest/v1/vocab_words") {
        const setId = (url.searchParams.get("set_id") ?? "").replace(/^eq\./, "");
        return route.fulfill({ json: vocab[setId] ?? [] });
      }
      return route.fulfill({ json: [] });
    });

    await page.route("http://fakeapi.test/**", async (route: Route) => {
      api.calls++;
      api.authHeaders.push(await route.request().headerValue("authorization") ?? undefined);
      await new Promise((r) => setTimeout(r, api.latencyMs));
      const reply = api.reply;
      if ("networkError" in reply) return route.abort("connectionrefused");
      if ("score" in reply) {
        const s = reply.score;
        return route.fulfill({
          json: {
            recognized_text: "x",
            accuracy_score: s,
            fluency_score: s,
            completeness_score: s,
            pronunciation_score: s,
            words: [],
          },
        });
      }
      return route.fulfill({
        status: reply.status,
        contentType: reply.body ? "text/html" : "application/json",
        body: reply.body ?? JSON.stringify(reply.json),
      });
    });

    await use(api);
  }, { auto: true }],
});

export { expect };

// ---------- helpers ----------

export async function openFeed(page: Page, setId = "set1") {
  await page.goto(`/feed/${setId}`);
  await expect.poll(async () => (await screenState(page))?.label, { timeout: 120_000 }).toBe("Hold to speak");
}

/** Press and hold the on-screen card's mic for `ms`, then release. */
export async function holdMic(page: Page, ms = 700) {
  // CI's Linux WebKit has no working microphone (getUserMedia is refused), so
  // any test that records is skipped there. Recording is covered by Chromium
  // and Firefox; check real Safari recording by hand.
  test.skip(test.info().project.name === "webkit", "No microphone in CI's WebKit build");
  const s = await screenState(page);
  if (!s) throw new Error("no card on screen");
  await page.mouse.move(s.micX, s.micY);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
}

/** What's on screen right now: the visible card's word, label, and overlays. */
export function screenState(page: Page) {
  return page.evaluate(() => {
    const H = window.innerHeight;
    const inView = (el: Element) => {
      const r = el.getBoundingClientRect();
      return r.height > 0 && r.top >= -1 && r.bottom <= H + 1;
    };
    const texts = [...document.querySelectorAll("div[dir=auto]")];
    // The status label sits right after the mic (a focusable Pressable).
    const label = texts.find(
      (d) => d.parentElement?.firstElementChild?.hasAttribute("tabindex") && d !== d.parentElement.firstElementChild && inView(d)
    );
    if (!label) return null;
    const mic = label.parentElement!.firstElementChild!;
    // The card's page is the ancestor that fills the screen.
    let pageEl: Element | null = label.parentElement;
    while (pageEl && pageEl.getBoundingClientRect().height < H - 1) pageEl = pageEl.parentElement;
    const word = pageEl
      ? [...pageEl.querySelectorAll("div[dir=auto]")].find(
          (d) => parseFloat(getComputedStyle(d).fontSize) > 30 && inView(d)
        )
      : undefined;
    const overlayOpacity = (color: string) => {
      const el = pageEl && [...pageEl.querySelectorAll("div")].find((d) => getComputedStyle(d).backgroundColor === color && d.getBoundingClientRect().width > 150);
      return el ? Number(getComputedStyle(el).opacity) : 0;
    };
    const confetti = pageEl
      ? Math.max(0, ...[...pageEl.querySelectorAll("div")].filter((d) => getComputedStyle(d).backgroundColor === "rgb(255, 209, 102)").map((d) => Number(getComputedStyle(d).opacity)))
      : 0;
    const micBox = mic.getBoundingClientRect();
    return {
      micX: micBox.left + micBox.width / 2,
      micY: micBox.top + micBox.height / 2,
      word: word?.textContent ?? null,
      wordX: word ? word.getBoundingClientRect().left : 0,
      wordTop: word ? word.getBoundingClientRect().top : 0,
      label: label.textContent ?? "",
      micDisabled: mic.getAttribute("aria-disabled") === "true",
      redFlash: overlayOpacity("rgb(255, 59, 48)"),
      greenFlash: overlayOpacity("rgb(46, 204, 113)"),
      confetti,
    };
  });
}

export type ScreenState = NonNullable<Awaited<ReturnType<typeof screenState>>>;

/** Sample screenState every ~25ms for `ms`. */
export async function sample(page: Page, ms: number) {
  const out: (ScreenState & { t: number })[] = [];
  const start = Date.now();
  while (Date.now() - start < ms) {
    const s = await screenState(page);
    if (s) out.push({ t: Date.now() - start, ...s });
    await page.waitForTimeout(25);
  }
  return out;
}

export const soundsPlayed = (page: Page) =>
  page.evaluate(() => (window as unknown as { __sounds: string[] }).__sounds);

/** The skip button sits in the bottom-right corner. */
export async function pressSkip(page: Page) {
  const { width, height } = page.viewportSize()!;
  await page.mouse.click(width - 44, height - 44);
}
