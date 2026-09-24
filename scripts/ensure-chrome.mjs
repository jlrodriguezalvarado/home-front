#!/usr/bin/env node
/**
 * Ensures CHROME_BIN points to a usable Chrome/Chromium for Karma.
 * Downloads Chrome for Testing via @puppeteer/browsers when missing.
 * Exits non-zero with a clear message if no browser can be resolved.
 */
import { spawnSync } from "node:child_process";
import {
  accessSync,
  constants,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cacheDir = join(homedir(), ".cache", "home-front-chrome");
const markerPath = join(cacheDir, "chrome-bin-path.txt");

function canExecute(path) {
  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function probeChrome(path) {
  return spawnSync(path, ["--version"], {
    encoding: "utf8",
    timeout: 15000,
    env: { ...process.env, CHROME_DEVEL_SANDBOX: "" },
  });
}

function isChromeBinary(path) {
  if (!path || !existsSync(path) || !canExecute(path)) return false;
  const probe = probeChrome(path);
  if (probe.status === 0) return true;
  const out = `${probe.stdout || ""}${probe.stderr || ""}`.toLowerCase();
  if (
    out.includes("error while loading shared libraries") ||
    out.includes("libnspr") ||
    out.includes("libnss")
  ) {
    console.error(
      "[ensure-chrome] WARNING: Chrome binary found but shared libraries are missing.\n" +
        "Install Chromium runtime libs, then re-run tests:\n" +
        "  sudo apt-get install -y libnspr4 libnss3 libatk-bridge2.0-0 libcups2 libdrm2 \\\n" +
        "    libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 libgbm1 libgtk-3-0 \\\n" +
        "    libx11-xcb1 libxcb-dri3-0 libxshmfence1 fonts-liberation \\\n" +
        "    libasound2t64 || sudo apt-get install -y libasound2\n" +
        `Binary: ${path}`,
    );
    return true;
  }
  return out.includes("chrom");
}

function findDownloadedChrome(root) {
  if (!existsSync(root)) return null;
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    let entries = [];
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
        continue;
      }
      if (entry.name === "chrome" || entry.name === "google-chrome" || entry.name === "chromium") {
        if (isChromeBinary(full)) return full;
      }
    }
  }
  return null;
}

function readMarker() {
  try {
    return readFileSync(markerPath, "utf8").trim();
  } catch {
    return null;
  }
}

function resolveExisting() {
  const candidates = [
    process.env.CHROME_BIN,
    readMarker(),
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/snap/bin/chromium",
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (isChromeBinary(candidate)) return candidate;
  }
  return findDownloadedChrome(cacheDir);
}

function installChrome() {
  mkdirSync(cacheDir, { recursive: true });
  console.error(`[ensure-chrome] Installing Chrome for Testing into ${cacheDir} …`);
  const result = spawnSync(
    "npx",
    ["--yes", "@puppeteer/browsers", "install", "chrome@stable", `--path=${cacheDir}`],
    { stdio: "inherit", encoding: "utf8", env: process.env },
  );
  if (result.status !== 0) {
    console.error(
      "[ensure-chrome] FAILED: could not download Chrome for Testing.\n" +
        "Install Google Chrome/Chromium, set CHROME_BIN, then re-run.\n" +
        "WSL tip: npm run test:ci uses a managed Chrome binary under ~/.cache/home-front-chrome.",
    );
    process.exit(result.status || 1);
  }
  const installed = findDownloadedChrome(cacheDir);
  if (!installed) {
    console.error("[ensure-chrome] FAILED: download finished but chrome binary was not found.");
    process.exit(1);
  }
  writeFileSync(markerPath, `${installed}\n`, "utf8");
  return installed;
}

const resolved = resolveExisting() || installChrome();
if (!isChromeBinary(resolved)) {
  console.error(
    "[ensure-chrome] FAILED: no usable Chrome/Chromium.\n" +
      `Tried CHROME_BIN=${process.env.CHROME_BIN || "(unset)"}.\n` +
      "Set CHROME_BIN to an absolute chrome path or run: npm run test:install-chrome",
  );
  process.exit(1);
}
const probe = probeChrome(resolved);
if (probe.status !== 0) {
  console.error(
    "[ensure-chrome] FAILED: Chrome binary cannot start (missing shared libraries).\n" +
      "Install the packages listed above, then re-run npm run test:ci.\n" +
      `stderr: ${(probe.stderr || probe.stdout || "").trim()}`,
  );
  process.exit(1);
}
writeFileSync(markerPath, `${resolved}\n`, "utf8");
process.stdout.write(resolved);
