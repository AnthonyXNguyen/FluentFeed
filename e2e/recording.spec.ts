import { expect, holdMic, openFeed, screenState, test } from "./fixtures";

// Recording takes a few hundred ms to start. Releasing earlier used to drop
// the attempt silently (and could leave the label stuck on "Listening...").
for (const holdMs of [150, 700]) {
  test(`a ${holdMs}ms press is always scored`, async ({ page, api }) => {
    await openFeed(page);
    api.reply = { score: 50 };
    await holdMic(page, holdMs);

    await expect.poll(() => api.calls).toBe(1);
    await expect.poll(async () => (await screenState(page))?.label).toBe("50 / 100");
  });
}

test("leaving the card while it's scoring causes no navigation or errors", async ({ page, api }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto("/");
  await openFeed(page);
  api.latencyMs = 1000;
  api.reply = { score: 95 };
  await holdMic(page);
  await page.waitForTimeout(150);
  await page.goBack();
  await page.waitForTimeout(2000);

  expect(api.calls).toBe(1);
  expect(page.url()).not.toMatch(/complete/);
  expect(errors).toEqual([]);
});
