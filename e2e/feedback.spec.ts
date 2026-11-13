import { expect, holdMic, openFeed, pressSkip, sample, screenState, soundsPlayed, test } from "./fixtures";

// The verdict animations must show whether or not the OS "Reduce Motion"
// setting is on (it silently hid them once - see useAnswerFeedback.ts).
for (const reducedMotion of ["no-preference", "reduce"] as const) {
  test.describe(`answer feedback (reduced motion: ${reducedMotion})`, () => {
    test.use({ contextOptions: { reducedMotion } });

    test("wrong answer: red flash, shake, sound, then retry", async ({ page, api }) => {
      await openFeed(page);
      api.reply = { score: 30 };
      await holdMic(page);
      const frames = await sample(page, 1600);

      expect(api.calls).toBe(1);
      expect(Math.max(...frames.map((f) => f.redFlash)), "red flash").toBeGreaterThan(0.5);
      const xs = frames.map((f) => f.wordX);
      expect(Math.max(...xs) - Math.min(...xs), "card shake (px)").toBeGreaterThanOrEqual(10);
      expect(frames.some((f) => f.micDisabled && f.label === "30 / 100"), "mic locked during flash").toBe(true);

      const end = frames.at(-1)!;
      expect(end.word, "stays on the same card").toBe("manzana");
      expect(end.label).toBe("30 / 100");
      expect(end.micDisabled, "mic unlocked after flash").toBe(false);
      expect(end.redFlash).toBeLessThan(0.05);
      expect(await soundsPlayed(page)).toEqual(["incorrect"]);
    });

    test("correct answer: green flash, confetti, sound, then next card", async ({ page, api }) => {
      await openFeed(page);
      api.reply = { score: 92 };
      await holdMic(page);
      const frames = await sample(page, 1900);

      const celebrating = frames.filter((f) => f.word === "manzana" && f.greenFlash > 0.2);
      expect(Math.max(...frames.map((f) => f.greenFlash)), "green flash").toBeGreaterThan(0.5);
      expect(Math.max(...frames.map((f) => f.confetti)), "confetti").toBeGreaterThan(0.5);
      expect(celebrating.length).toBeGreaterThan(0);
      expect(celebrating.every((f) => f.micDisabled), "mic locked during celebration").toBe(true);

      const end = frames.at(-1)!;
      expect(end.word, "advanced to the next card").toBe("perro");
      expect(end.label, "next card starts fresh").toBe("Hold to speak");
      expect(await soundsPlayed(page)).toEqual(["correct"]);
    });
  });
}

test("finishing the last card opens the complete screen", async ({ page, api }) => {
  await openFeed(page);
  await pressSkip(page);
  await expect.poll(async () => (await screenState(page))?.word).toBe("perro");
  await pressSkip(page);
  await expect.poll(async () => (await screenState(page))?.word).toBe("gato");

  api.reply = { score: 95 };
  await holdMic(page);
  await expect(page).toHaveURL(/\/feed\/set1\/complete$/);
});
