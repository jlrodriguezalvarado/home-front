#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const ensure = spawnSync("node", ["scripts/ensure-chrome.mjs"], { encoding: "utf8" });
if (ensure.status) {
  process.stderr.write(ensure.stderr || ensure.stdout || "");
  process.exit(ensure.status || 1);
}
const chromeBin = (ensure.stdout || "").trim();
if (!chromeBin) {
  console.error("[test:ci] ensure-chrome returned an empty CHROME_BIN");
  process.exit(1);
}
process.env.CHROME_BIN = chromeBin;
const test = spawnSync(
  "npx",
  ["ng", "test", "--watch=false", "--browsers=ChromeHeadlessCI"],
  { stdio: "inherit", env: process.env, shell: false },
);
process.exit(test.status || 0);
