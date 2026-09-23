import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import chromiumBinary, {
  inflate,
  setupLambdaEnvironment
} from "@sparticuz/chromium";
import { chromium } from "playwright";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = resolve(ROOT, "snapshots/dom");
const TIMEOUT_MS = 45_000;

// These routes cover each distinct public desktop layout used by the extension.
// Account-only pages are included to detect when their logged-out shell changes.
const PAGES = [
  { id: "home", label: "Home", path: "/" },
  { id: "discover", label: "Discover", path: "/discover" },
  { id: "charts", label: "Charts", path: "/charts/top" },
  { id: "search", label: "Search results", path: "/search?q=electronic" },
  { id: "artist", label: "Artist profile", path: "/9teenn" },
  {
    id: "track",
    label: "Track",
    path: "/pixychu/legacy-2"
  },
  {
    id: "playlist",
    label: "Playlist",
    path: "/monstercat/sets/monstercat-uncaged-vol-11"
  },
  {
    id: "stream",
    label: "Stream (logged out)",
    path: "/feed",
    authenticationRequired: true
  },
  {
    id: "library",
    label: "Library (logged out)",
    path: "/you/library",
    authenticationRequired: true
  }
];

function snapshotHeader(page, result) {
  return [
    "# Normalized SoundCloud DOM snapshot",
    `# Page: ${page.label}`,
    `# Requested: https://soundcloud.com${page.path}`,
    `# Final URL: ${result.finalUrl}`,
    `# HTTP status: ${result.httpStatus ?? "unknown"}`,
    `# Capture status: ${result.status}`,
    `# Title: ${result.title}`,
    `# Elements: ${result.elementCount}`,
    "# Volatile attributes, text nodes, script/style contents, and SVG internals are omitted.",
    ""
  ].join("\n");
}

async function waitForApp(page) {
  await page.waitForLoadState("domcontentloaded");
  await page.locator("body").waitFor({ state: "attached", timeout: TIMEOUT_MS });

  // SoundCloud is an SPA. A short quiet window captures the hydrated route while
  // avoiding an indefinite network-idle wait caused by analytics and playback.
  await page.waitForTimeout(5_000);
  await page
    .locator("#app, .l-container, main, [role='main']")
    .first()
    .waitFor({ state: "attached", timeout: 10_000 })
    .catch(() => {});

  const rejectCookies = page.locator("#onetrust-reject-all-handler");
  if (await rejectCookies.isVisible().catch(() => false)) {
    await rejectCookies.click();
  }
  await page.waitForTimeout(2_000);
}

async function serializeDom(page) {
  return page.evaluate(() => {
    const OMIT = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"]);
    const OPAQUE = new Set(["svg", "canvas"]);
    const ALLOWED_ATTRIBUTES = [
      "role",
      "aria-label",
      "aria-expanded",
      "aria-selected",
      "aria-current",
      "type",
      "name",
      "title",
      "alt",
      "data-testid"
    ];
    const lines = [];
    let elementCount = 0;

    const clean = (value) =>
      value
        .replace(/\s+/g, " ")
        .replace(/\b\d{2,}\b/g, "<n>")
        .trim()
        .slice(0, 160);

    const quote = (value) => JSON.stringify(clean(value));

    const stableClasses = (element) =>
      [...element.classList]
        .filter((name) => !/^(?:[a-f\d]{8,}|css-[a-z\d]{6,}|sc-[a-z\d]{8,})$/i.test(name))
        .sort();

    const describe = (element) => {
      const tag = element.tagName.toLowerCase();
      let value = tag;

      if (element.id && !/^(?:\d|react-|headlessui-)/i.test(element.id)) {
        value += `#${element.id}`;
      }

      const classes = stableClasses(element);
      if (classes.length) value += `.${classes.join(".")}`;

      for (const attribute of ALLOWED_ATTRIBUTES) {
        const attributeValue = element.getAttribute(attribute);
        if (attributeValue) value += `[${attribute}=${quote(attributeValue)}]`;
      }

      if (element.hasAttribute("href")) {
        const href = element.getAttribute("href");
        if (href && !href.startsWith("javascript:")) {
          try {
            const url = new URL(href, location.href);
            const normalized =
              url.origin === location.origin ? url.pathname : url.origin + url.pathname;
            value += `[href=${quote(normalized)}]`;
          } catch {
            value += `[href=${quote(href)}]`;
          }
        }
      }

      return value;
    };

    const visit = (element, depth) => {
      if (OMIT.has(element.tagName) || element.id === "onetrust-consent-sdk") return;
      elementCount += 1;
      lines.push(`${"  ".repeat(depth)}${describe(element)}`);

      if (OPAQUE.has(element.tagName.toLowerCase())) return;
      for (const child of element.children) visit(child, depth + 1);

      if (element.shadowRoot) {
        lines.push(`${"  ".repeat(depth + 1)}#shadow-root`);
        for (const child of element.shadowRoot.children) visit(child, depth + 2);
      }
    };

    visit(document.documentElement, 0);
    return { tree: lines.join("\n"), elementCount };
  });
}

async function capture(target) {
  const browser = await chromium.launch({
    args: chromiumBinary.args,
    executablePath: await chromiumBinary.executablePath(),
    headless: true
  });
  const context = await browser.newContext({
    locale: "en-US",
    timezoneId: "UTC",
    viewport: { width: 1440, height: 1000 },
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36"
  });
  const page = await context.newPage();
  let error = null;

  try {
    const response = await page.goto(`https://soundcloud.com${target.path}`, {
      waitUntil: "domcontentloaded",
      timeout: TIMEOUT_MS
    });
    await waitForApp(page);
    const dom = await serializeDom(page);
    const title = await page.title();
    const isSignInRedirect = new URL(page.url()).pathname === "/signin";
    const isSoundCloudError =
      title === "Something went wrong on SoundCloud" ||
      (await page.locator(".errorPage").count()) > 0;
    const status =
      isSignInRedirect || (target.authenticationRequired && isSoundCloudError)
        ? "auth-required"
        : isSoundCloudError
          ? "soundcloud-error"
          : "captured";
    const result = {
      id: target.id,
      label: target.label,
      requestedUrl: `https://soundcloud.com${target.path}`,
      finalUrl: page.url(),
      httpStatus: response?.status() ?? null,
      status,
      title,
      elementCount: dom.elementCount,
      error
    };

    const output = snapshotHeader(target, result) + dom.tree + "\n";
    await writeFile(resolve(OUTPUT_DIR, `${target.id}.dom.txt`), output);
    return result;
  } catch (captureError) {
    error = captureError instanceof Error ? captureError.message : String(captureError);
    return {
      id: target.id,
      label: target.label,
      requestedUrl: `https://soundcloud.com${target.path}`,
      finalUrl: page.url(),
      httpStatus: null,
      status: "capture-error",
      title: await page.title().catch(() => ""),
      elementCount: 0,
      error
    };
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

await mkdir(OUTPUT_DIR, { recursive: true });

// The bundled Chromium libraries make captures work in minimal containers as
// well as on developer workstations without requiring root package installs.
const chromiumModuleDir = dirname(
  fileURLToPath(import.meta.resolve("@sparticuz/chromium"))
);
const chromiumBinDir = resolve(chromiumModuleDir, "../bin");
const chromiumLibDir = await inflate(resolve(chromiumBinDir, "al2023.tar.br"));
setupLambdaEnvironment(resolve(chromiumLibDir, "lib"));

const results = [];

for (const target of PAGES) {
  process.stdout.write(`Capturing ${target.id}... `);
  const result = await capture(target);
  results.push(result);
  console.log(`${result.elementCount} elements${result.error ? " (partial)" : ""}`);
}

const metadata = {
  capturedAt: new Date().toISOString(),
  viewport: { width: 1440, height: 1000 },
  authenticated: false,
  pages: results
};
await writeFile(resolve(OUTPUT_DIR, "metadata.json"), JSON.stringify(metadata, null, 2) + "\n");

if (results.some((result) => result.error)) process.exitCode = 1;
