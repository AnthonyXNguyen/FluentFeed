import { expect, openFeed, pressSkip, screenState, test } from "./fixtures";

type Page = Parameters<typeof screenState>[0];
const wordOnScreen = async (page: Page) => (await screenState(page))?.word;

// Waits for `word` to be on screen AND the page slide to finish - the pager
// deliberately ignores arrow keys mid-slide (280ms), so pressing too early
// would be a no-op.
async function expectSettledOn(page: Page, word: string) {
  await expect.poll(() => wordOnScreen(page)).toBe(word);
  await expect
    .poll(async () => {
      const a = (await screenState(page))?.wordTop;
      await page.waitForTimeout(80);
      return a === (await screenState(page))?.wordTop;
    })
    .toBe(true);
}

test("arrow keys page through unlocked cards only", async ({ page }) => {
  await openFeed(page);

  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(700);
  expect(await wordOnScreen(page), "next card is still locked").toBe("manzana");

  await pressSkip(page); // unlocks card 2
  await expectSettledOn(page, "perro");

  await page.keyboard.press("ArrowUp");
  await expectSettledOn(page, "manzana");
  await page.keyboard.press("ArrowDown");
  await expectSettledOn(page, "perro");

  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(700);
  expect(await wordOnScreen(page), "card 3 is still locked").toBe("perro");
});

test("arrow keys stay aligned after the window is resized", async ({ page }) => {
  await openFeed(page);
  await pressSkip(page);
  await expectSettledOn(page, "perro");

  await page.setViewportSize({ width: 1000, height: 600 });
  await page.waitForTimeout(500);
  await page.keyboard.press("ArrowUp");
  await expectSettledOn(page, "manzana");
  const first = (await screenState(page))!;

  await page.keyboard.press("ArrowDown");
  await expectSettledOn(page, "perro");
  const second = (await screenState(page))!;

  // Both cards land at the same spot, i.e. paging uses the new height.
  expect(Math.abs(second.wordTop - first.wordTop)).toBeLessThan(2);
  expect(first.wordTop).toBeGreaterThan(0);
  expect(first.wordTop).toBeLessThan(600);
});

test("shows a spinner while the set loads, then the cards", async ({ page }) => {
  await page.route("http://fakesb.test/rest/v1/vocab_words**", async (route) => {
    await new Promise((r) => setTimeout(r, 1500));
    await route.fallback();
  });
  await page.goto("/feed/set1");
  await expect(page.locator("[role=progressbar]:visible").first()).toBeVisible({ timeout: 120_000 });
  await expectSettledOn(page, "manzana");
});

test("an empty set shows a message", async ({ page }) => {
  await page.goto("/feed/empty");
  await expect(page.getByText("This set has no cards yet.")).toBeVisible({ timeout: 120_000 });
});

test("home tab renders its header on the client", async ({ page }) => {
  await page.goto("/");
  const title = page.getByText("Your Vocab Sets");
  await expect(title).toBeVisible({ timeout: 120_000 });
  expect((await title.boundingBox())!.y, "header pushes the title down").toBeGreaterThan(50);
});
