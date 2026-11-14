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

test("recordings are sent with the user's login token", async ({ page, api }) => {
  await openFeed(page);
  await holdMic(page);
  await expect.poll(() => api.calls).toBe(1);
  // The fake session's access token (fixtures.ts); the backend verifies it.
  expect(api.authHeaders).toEqual(["Bearer fake-access"]);
});

test("leaving the card while it's scoring causes no navigation or errors", async ({ page, api }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  // Open the set from the home screen like a user (in-app navigation), so
  // the back button below closes the feed without reloading the page.
  await page.goto("/");
  await page.getByText("Spanish basics").click();
  await expect.poll(async () => (await screenState(page))?.label, { timeout: 120_000 }).toBe("Hold to speak");

  api.latencyMs = 1500; // keeps the request in flight while we leave
  api.reply = { score: 95 };
  await holdMic(page);
  // Leave only once the request has really been sent (browsers take
  // different times to finish a recording, so no fixed delay).
  await expect.poll(() => api.calls).toBe(1);
  await page.mouse.click(16 + 18, 12 + 18); // the feed's back button (top-left)
  await expect(page.getByText("Your Vocab Sets")).toBeVisible();
  await page.waitForTimeout(2500); // let the late "correct" response land

  // The unmounted card must not celebrate, advance, or navigate anywhere.
  expect(new URL(page.url()).pathname).toBe("/");
  expect(errors).toEqual([]);
});
