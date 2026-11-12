#!/usr/bin/env node
// Updates @playwright/test (and the Chromium build it bundles) to the newest
// stable release that is at least MIN_AGE_DAYS old - recent enough to stay
// current, old enough that bad releases have usually been caught.
//
//   npm run update:playwright                     # update + run e2e tests
//   npm run update:playwright -- --dry-run        # just show what it would do
//   npm run update:playwright -- --min-age-days 30
//   npm run update:playwright -- --skip-tests
//
// On any failure (unsupported CI OS, failing tests) it restores
// package.json / package-lock.json so nothing is left half-updated.
// Dependabot (.github/dependabot.yml) does the same thing on a schedule.

import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const PKG = "@playwright/test";
const BROWSERS = ["chromium", "firefox", "webkit"]; // must match playwright.config.ts projects

// Playwright lists the OSes it can install browsers on (e.g. "ubuntu24.04-x64")
// somewhere in its code; the file moves between versions, so search them all.
const playwrightMentions = (marker) => {
  const lib = join(ROOT, "node_modules", "playwright-core", "lib");
  return readdirSync(lib, { recursive: true })
    .filter((f) => String(f).endsWith(".js"))
    .some((f) => readFileSync(join(lib, String(f)), "utf8").includes(marker));
};
const ROOT = new URL("..", import.meta.url).pathname;

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name, fallback) => {
  const i = args.indexOf(name);
  return i === -1 ? fallback : Number(args[i + 1]);
};
const MIN_AGE_DAYS = option("--min-age-days", 14);
const DRY_RUN = flag("--dry-run");
const SKIP_TESTS = flag("--skip-tests");

const run = (cmd, cmdArgs) => execFileSync(cmd, cmdArgs, { cwd: ROOT, stdio: "inherit" });
const read = (file) => readFileSync(join(ROOT, file), "utf8");
const semver = (v) => v.split(".").map(Number);
const newer = (a, b) => {
  const [x, y] = [semver(a), semver(b)];
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i];
  return false;
};

// 1. Pick the newest stable version old enough to trust.
const registry = await fetch(`https://registry.npmjs.org/${PKG.replace("/", "%2F")}`);
if (!registry.ok) throw new Error(`npm registry returned ${registry.status}`);
const { time } = await registry.json();
const cutoff = Date.now() - MIN_AGE_DAYS * 24 * 60 * 60 * 1000;
const eligible = Object.entries(time)
  .filter(([v, date]) => /^\d+\.\d+\.\d+$/.test(v) && Date.parse(date) <= cutoff)
  .map(([v]) => v)
  .reduce((best, v) => (!best || newer(v, best) ? v : best), null);

const pkgJson = JSON.parse(read("package.json"));
const current = (pkgJson.devDependencies?.[PKG] ?? "").replace(/^[\^~]/, "");
const ageDays = (v) => Math.floor((Date.now() - Date.parse(time[v])) / 86_400_000);

console.log(`Current:  ${PKG}@${current} (${ageDays(current)} days old)`);
console.log(`Eligible: ${PKG}@${eligible} (newest release >= ${MIN_AGE_DAYS} days old, ${ageDays(eligible)} days)`);

if (!newer(eligible, current)) {
  console.log("Already up to date - nothing to do.");
  process.exit(0);
}
if (DRY_RUN) {
  console.log(`Dry run: would update ${current} -> ${eligible}.`);
  process.exit(0);
}

// 2. Install it, remembering the old files so failures can be undone.
const backup = { "package.json": read("package.json"), "package-lock.json": read("package-lock.json") };
const rollback = (reason) => {
  console.error(`\n✗ ${reason}\n  Rolling back to ${PKG}@${current}...`);
  for (const [file, contents] of Object.entries(backup)) writeFileSync(join(ROOT, file), contents);
  run("npm", ["install", "--no-audit", "--no-fund"]);
  // Installing the new version's browsers deletes the old ones from the
  // cache, so download the restored version's browsers again.
  run("npx", ["playwright", "install", ...BROWSERS]);
  process.exit(1);
};

try {
  run("npm", ["install", "--save-dev", "--save-exact", "--no-audit", "--no-fund", `${PKG}@${eligible}`]);

  // 3. The CI runner's Ubuntu must be one this Playwright can install Chromium on.
  const ciUbuntu = read(".github/workflows/ci.yml").match(/runs-on:\s*ubuntu-(\d+\.\d+)/)?.[1];
  if (ciUbuntu && !playwrightMentions(`ubuntu${ciUbuntu}-x64`)) {
    rollback(`Playwright ${eligible} doesn't support the CI runner (ubuntu-${ciUbuntu}).`);
  }

  // 4. Download the matching browsers and prove the app still works with them.
  run("npx", ["playwright", "install", ...BROWSERS]);
  if (!SKIP_TESTS) run("npx", ["playwright", "test"]);

  const chromium = JSON.parse(read(join("node_modules", "playwright-core", "browsers.json"))).browsers.find(
    (b) => b.name === "chromium"
  );
  console.log(`\n✓ Updated ${PKG} ${current} -> ${eligible} (Chromium ${chromium?.browserVersion}).`);
  console.log("  Commit package.json + package-lock.json and push; CI re-verifies it.");
} catch (err) {
  rollback(err instanceof Error ? err.message.split("\n")[0] : String(err));
}
