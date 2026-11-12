import { expect, type FakeApi, holdMic, openFeed, screenState, test } from "./fixtures";

// Scoring failures must show a short, friendly message - never status
// codes, JSON, or Azure internals - and leave the mic usable.
const CASES: { name: string; reply: FakeApi["reply"]; message: string }[] = [
  {
    name: "Azure unavailable (503)",
    reply: { status: 503, json: { detail: { code: "service_unavailable", message: "x" } } },
    message: "Scoring is unavailable right now.",
  },
  {
    name: "no speech (422)",
    reply: { status: 422, json: { detail: { code: "no_speech", message: "x" } } },
    message: "Didn't catch that. Try again.",
  },
  {
    name: "unreadable audio (422)",
    reply: { status: 422, json: { detail: { code: "audio_unreadable", message: "x" } } },
    message: "Couldn't read that recording. Try again.",
  },
  {
    name: "unknown 422 body",
    reply: { status: 422, json: { detail: "Speech not recognized (reason: ResultReason.Canceled)" } },
    message: "Couldn't score that attempt.",
  },
  {
    name: "proxy HTML error (502)",
    reply: { status: 502, body: "<html>Bad Gateway</html>" },
    message: "Scoring is unavailable right now.",
  },
  {
    name: "network down",
    reply: { networkError: true },
    message: "Can't reach the scoring server.",
  },
];

for (const { name, reply, message } of CASES) {
  test(`scoring error: ${name}`, async ({ page, api }) => {
    await openFeed(page);
    api.reply = reply;
    await holdMic(page);

    await expect.poll(async () => (await screenState(page))?.label).toBe(message);
    const body = await page.evaluate(() => document.body.innerText);
    expect(body).not.toMatch(/\b(422|502|503)\b|\{|detail|ResultReason|Bad Gateway/);
    expect((await screenState(page))?.micDisabled).toBe(false);
  });
}
