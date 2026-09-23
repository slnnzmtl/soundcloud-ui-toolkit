import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function createClassList(initial = []) {
  const set = new Set(initial);
  return {
    add(...tokens) {
      for (const token of tokens) {
        set.add(token);
      }
    },
    remove(...tokens) {
      for (const token of tokens) {
        set.delete(token);
      }
    },
    contains(token) {
      return set.has(token);
    },
    toggle(token, force) {
      if (force === true) {
        set.add(token);
        return true;
      }
      if (force === false) {
        set.delete(token);
        return false;
      }
      if (set.has(token)) {
        set.delete(token);
        return false;
      }
      set.add(token);
      return true;
    },
    toArray() {
      return [...set].sort();
    },
    forEach(callback) {
      for (const token of set) {
        callback(token);
      }
    },
    [Symbol.iterator]() {
      return set[Symbol.iterator]();
    },
  };
}

function loadScxSettings(options = {}) {
  const classList = createClassList();
  const documentElement = { classList };
  const store = options.store ?? {};
  const pageCache = options.pageCache ?? { value: null };

  const context = {
    globalThis: undefined,
    self: undefined,
    document: { documentElement },
    localStorage: {
      getItem(key) {
        if (key !== "scxSettingsCache") {
          return null;
        }
        return pageCache.value;
      },
      setItem(key, value) {
        if (key === "scxSettingsCache") {
          pageCache.value = value;
        }
      },
    },
    chrome: {
      storage: {
        sync: {
          get(key, cb) {
            cb({ [key]: store[key] });
          },
          set(obj, cb) {
            Object.assign(store, obj);
            if (typeof cb === "function") {
              cb();
            }
          },
        },
        onChanged: {
          addListener() {},
        },
      },
    },
  };
  context.globalThis = context;
  context.self = context;

  const source = fs.readFileSync(
    path.join(ROOT, "shared/settings.js"),
    "utf8"
  );
  vm.runInNewContext(source, context, { filename: "shared/settings.js" });

  return {
    ScxSettings: context.ScxSettings,
    classList,
    documentElement,
    store,
    pageCache,
  };
}

test("getSettings migrates legacy theme aliases into sync storage", async () => {
  const { ScxSettings, store } = loadScxSettings({
    store: {
      scxSettings: {
        enabled: true,
        fullWidth: true,
        enlargedQueue: true,
        theme: "spotify",
        radius: "lg",
      },
    },
  });

  const settings = await ScxSettings.getSettings();
  assert.equal(settings.theme, "grove");
  assert.equal(store.scxSettings.theme, "grove");
  assert.equal(store.scxSettings.radius, "lg");
});

test("getSettings does not rewrite storage when already canonical", async () => {
  const canonical = {
    enabled: true,
    fullWidth: true,
    enlargedQueue: true,
    theme: "midnight",
    radius: "md",
  };
  const { ScxSettings, store } = loadScxSettings({
    store: { scxSettings: { ...canonical } },
  });

  const before = store.scxSettings;
  await ScxSettings.getSettings();
  assert.equal(store.scxSettings, before);
  assert.deepEqual(store.scxSettings, canonical);
});

test("readPageCache rewrites local cache when theme was aliased", () => {
  const { ScxSettings, pageCache } = loadScxSettings({
    pageCache: {
      value: JSON.stringify({
        enabled: true,
        fullWidth: true,
        enlargedQueue: true,
        theme: "lifeinvader",
        radius: "sm",
      }),
    },
  });

  const settings = ScxSettings.readPageCache();
  assert.equal(settings.theme, "blood");
  assert.equal(JSON.parse(pageCache.value).theme, "blood");
});

test("sanitizeTheme maps aliases and rejects unknown ids", () => {
  const { ScxSettings } = loadScxSettings();
  assert.equal(ScxSettings.sanitizeTheme("lifeinvader"), "blood");
  assert.equal(ScxSettings.sanitizeTheme("terminal"), "matrix");
  assert.equal(ScxSettings.sanitizeTheme("teal"), "tide");
  assert.equal(ScxSettings.sanitizeTheme("liquid"), "frost");
  assert.equal(ScxSettings.sanitizeTheme("spotify"), "grove");
  assert.equal(ScxSettings.sanitizeTheme("mimi"), "blush");
  assert.equal(ScxSettings.sanitizeTheme("midnight"), "midnight");
  assert.equal(ScxSettings.sanitizeTheme("not-a-theme"), "default");
  assert.equal(ScxSettings.sanitizeTheme(undefined), "default");
});

test("sanitizeRadius accepts catalog values and falls back", () => {
  const { ScxSettings } = loadScxSettings();
  assert.equal(ScxSettings.sanitizeRadius("xl"), "xl");
  assert.equal(ScxSettings.sanitizeRadius("default"), "default");
  assert.equal(ScxSettings.sanitizeRadius("huge"), "md");
  assert.equal(ScxSettings.sanitizeRadius(null), "md");
});

test("mergeWithDefaults fills missing keys and sanitizes", () => {
  const { ScxSettings } = loadScxSettings();
  const fromNull = ScxSettings.mergeWithDefaults(null);
  assert.equal(fromNull.enabled, true);
  assert.equal(fromNull.fullWidth, true);
  assert.equal(fromNull.enlargedQueue, true);
  assert.equal(fromNull.theme, "default");
  assert.equal(fromNull.radius, "md");

  const merged = ScxSettings.mergeWithDefaults({
    enabled: 0,
    fullWidth: 1,
    theme: "spotify",
    radius: "nope",
  });
  assert.equal(merged.enabled, false);
  assert.equal(merged.fullWidth, true);
  assert.equal(merged.enlargedQueue, true);
  assert.equal(merged.theme, "grove");
  assert.equal(merged.radius, "md");
});

test("applyDocumentTheme omits default on SoundCloud; includeDefault keeps it", () => {
  const { ScxSettings, classList } = loadScxSettings();

  ScxSettings.applyDocumentTheme("midnight");
  assert.deepEqual(classList.toArray(), ["scx-theme", "scx-theme-midnight"]);

  ScxSettings.applyDocumentTheme("default");
  assert.deepEqual(classList.toArray(), []);

  ScxSettings.applyDocumentTheme("default", { includeDefault: true });
  assert.deepEqual(classList.toArray(), ["scx-theme-default"]);

  ScxSettings.applyDocumentTheme("lifeinvader");
  assert.ok(!classList.contains("scx-theme-lifeinvader"));
  assert.deepEqual(classList.toArray(), ["scx-theme", "scx-theme-blood"]);

  const other = createClassList();
  ScxSettings.applyDocumentTheme("purple", { root: { classList: other } });
  assert.deepEqual(other.toArray(), ["scx-theme", "scx-theme-purple"]);
});

test("copyScxClasses copies scx-* tokens onto the iframe root", () => {
  const { ScxSettings } = loadScxSettings();
  const from = { classList: createClassList(["scx-theme", "scx-theme-purple", "header"]) };
  const to = { classList: createClassList(["other"]) };

  assert.equal(ScxSettings.copyScxClasses(from, to), true);
  assert.deepEqual(to.classList.toArray(), [
    "other",
    "scx-theme",
    "scx-theme-purple",
  ]);
  assert.equal(ScxSettings.copyScxClasses(from, from), false);
});

test("applyDocumentRadius clears when inactive", () => {
  const { ScxSettings, classList } = loadScxSettings();

  ScxSettings.applyDocumentRadius("lg");
  assert.deepEqual(classList.toArray(), ["scx-radius-lg"]);

  ScxSettings.applyDocumentRadius("xl", { active: false });
  assert.deepEqual(classList.toArray(), []);
});

test("applyDocumentRadius skips class for default", () => {
  const { ScxSettings, classList } = loadScxSettings();

  ScxSettings.applyDocumentRadius("lg");
  assert.deepEqual(classList.toArray(), ["scx-radius-lg"]);

  ScxSettings.applyDocumentRadius("default");
  assert.deepEqual(classList.toArray(), []);
});

test("applyDocumentTheme adds scx-native-dark for default + dark scheme", () => {
  const { ScxSettings, classList } = loadScxSettings();

  ScxSettings.applyDocumentTheme("default", {
    includeDefault: true,
    nativeScheme: "dark",
  });
  assert.deepEqual(classList.toArray().sort(), [
    "scx-native-dark",
    "scx-theme-default",
  ]);

  ScxSettings.applyDocumentTheme("midnight", {
    includeDefault: true,
    nativeScheme: "dark",
  });
  assert.deepEqual(classList.toArray(), ["scx-theme-midnight"]);

  ScxSettings.applyDocumentTheme("default", {
    includeDefault: true,
    nativeScheme: "light",
  });
  assert.deepEqual(classList.toArray(), ["scx-theme-default"]);
});

test("ScxSettings export matches content + popup usage", () => {
  const { ScxSettings } = loadScxSettings();
  assert.deepEqual(
    Object.keys(ScxSettings).sort(),
    [
      "DEFAULTS",
      "ENABLED_CLASS",
      "ENLARGED_QUEUE_CLASS",
      "FULL_WIDTH_CLASS",
      "NATIVE_DARK_CLASS",
      "NATIVE_SCHEME_KEY",
      "RADII",
      "RADIUS_CLASS",
      "STORAGE_KEY",
      "THEME_ALIASES",
      "THEME_CLASS",
      "THEME_GROUPS",
      "THEMES",
      "applyDocumentRadius",
      "applyDocumentTheme",
      "copyScxClasses",
      "getSettings",
      "mergeWithDefaults",
      "onSettingsChanged",
      "radiusClass",
      "readPageCache",
      "sanitizeRadius",
      "sanitizeTheme",
      "setSettings",
      "themeClass",
      "writePageCache",
    ].sort()
  );
  assert.deepEqual([...ScxSettings.RADII], ["default", "none", "sm", "md", "lg", "xl"]);
  assert.equal(ScxSettings.NATIVE_SCHEME_KEY, "scxNativeScheme");
  assert.equal(ScxSettings.NATIVE_DARK_CLASS, "scx-native-dark");
});

test("CSS has one avatar-round rule and aliases borderRadiuses to tokens", () => {
  const themes = fs.readFileSync(path.join(ROOT, "themes.css"), "utf8");
  const styles = fs.readFileSync(path.join(ROOT, "styles.css"), "utf8");
  const iframe = fs.readFileSync(
    path.join(ROOT, "iframe-player.css"),
    "utf8"
  );

  const avatarBlocks = themes.match(/\.image__rounded/g) || [];
  assert.equal(avatarBlocks.length, 3, "three selectors in one avatar block");
  assert.ok(
    themes.includes('html[class*="scx-radius-"] .image__rounded'),
    "avatar rounding gated by radius class"
  );
  assert.equal(
    (themes.match(/html\.scx-theme \.image__rounded/g) || []).length,
    0
  );
  assert.doesNotMatch(styles, /\.image__rounded/);
  assert.doesNotMatch(iframe, /\.image__rounded/);

  assert.match(
    themes,
    /--borderRadiuses-4:\s*var\(--scx-radius-small\)/
  );
  assert.match(
    themes,
    /--borderRadiuses-8:\s*var\(--scx-radius-medium\)/
  );
  assert.match(
    themes,
    /--borderRadiuses-10:\s*var\(--scx-radius-medium\)/
  );
  assert.doesNotMatch(themes, /--borderRadiuses-4:\s*\d+px/);

  const inheritBlocks = [
    ...themes.matchAll(
      /fill:\s*currentColor\s*!important;\s*\}/g
    ),
  ];
  assert.ok(inheritBlocks.length >= 1);

  const glyphInherit = themes.match(
    /Button glyphs follow the button color[\s\S]*?fill:\s*currentColor !important;/
  );
  assert.ok(glyphInherit, "single documented glyph inherit block");
  assert.equal(
    (themes.match(/\.sc-button svg,\s*\nhtml\.scx-theme \.sc-button svg \*/g) ||
      []).length,
    1,
    "sc-button svg inherit listed once"
  );

  // Default rounding = no scx-radius-*: theme color rules must not set radius.
  const themeRadiusDecls = [
    ...themes.matchAll(
      /html\.scx-theme[^{]*\{([^}]*)\}/g
    ),
  ].filter((m) => /border-radius\s*:/.test(m[1]));
  assert.equal(
    themeRadiusDecls.length,
    0,
    "html.scx-theme rules must not set border-radius"
  );
  assert.match(
    themes,
    /html\[class\*="scx-radius-"\] \.queue__panel,\s*\nhtml\[class\*="scx-radius-"\] \.playControlsPanel__inner \{\s*\n\s*border-radius:\s*0/
  );
  assert.doesNotMatch(
    themes,
    /html\.scx-theme \.playControls__queue \{[\s\S]*?overflow:\s*hidden/
  );
  assert.match(
    themes,
    /html\.scx-theme\[class\*="scx-radius-"\] \.playControls__queue \{[\s\S]*?overflow:\s*hidden/
  );
});

test("player iframe tags use theme chips; layout CSS stays unthemed", () => {
  const themes = fs.readFileSync(path.join(ROOT, "themes.css"), "utf8");
  const iframe = fs.readFileSync(
    path.join(ROOT, "iframe-player.css"),
    "utf8"
  );

  assert.match(
    themes,
    /html\.scx-theme \.sc-tag,\s*\nhtml\.scx-theme \.MuiChip-root/
  );
  assert.match(
    themes,
    /html\.scx-theme \.MuiChip-root \{[\s\S]*?background-color:\s*var\(--scx-surface-raised\)/
  );
  assert.match(
    themes,
    /html\[class\*="scx-radius-"\] \.MuiChip-root/
  );
  assert.doesNotMatch(iframe, /\.MuiChip-root/);
  assert.doesNotMatch(iframe, /\.sc-tag/);
});

test("popup builds radius radios from RADII; tokens.css is the palette source", () => {
  const html = fs.readFileSync(path.join(ROOT, "popup/popup.html"), "utf8");
  const popupCss = fs.readFileSync(path.join(ROOT, "popup/popup.css"), "utf8");
  const popupJs = fs.readFileSync(path.join(ROOT, "popup/popup.js"), "utf8");

  assert.match(html, /id="radius-list"/);
  assert.doesNotMatch(html, /id="radius-none"/);
  assert.match(popupJs, /function renderRadiusList/);
  assert.match(popupJs, /RADII\.forEach/);
  assert.match(html, /href="\.\.\/shared\/tokens\.css"/);
  assert.match(popupCss, /^:root\s*\{/m);
  assert.match(popupJs, /NATIVE_SCHEME_KEY/);
});

test("pack.sh lists only runtime paths", () => {
  const pack = fs.readFileSync(path.join(ROOT, "scripts/pack.sh"), "utf8");
  const expected = [
    "manifest.json",
    "background.js",
    "content.js",
    "styles.css",
    "themes.css",
    "iframe-player.css",
    "shared",
    "popup",
    "icons",
  ];
  for (const entry of expected) {
    assert.match(pack, new RegExp(`\\b${entry}\\b`));
  }
  assert.doesNotMatch(pack, /\bTHEME\.md\b/);
  assert.doesNotMatch(pack, /\bSELECTORS\.md\b/);
  assert.doesNotMatch(pack, /\bsnapshots\b/);
});

test("content scripts inject JS only; CSS loads once via content.js", () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(ROOT, "manifest.json"), "utf8")
  );
  assert.equal(manifest.content_scripts.length, 1);
  const script = manifest.content_scripts[0];
  assert.deepEqual(script.matches, ["https://soundcloud.com/*"]);
  assert.equal(script.all_frames, true);
  assert.equal(script.match_about_blank, true);
  assert.equal(script.match_origin_as_fallback, true);
  assert.equal(script.run_at, "document_start");
  assert.equal(script.css, undefined);

  const war = manifest.web_accessible_resources;
  assert.ok(Array.isArray(war) && war.length === 1);
  assert.deepEqual(war[0].matches, ["https://soundcloud.com/*"]);
  assert.deepEqual(war[0].resources, [
    "styles.css",
    "iframe-player.css",
    "shared/tokens.css",
    "themes.css",
  ]);

  const content = fs.readFileSync(path.join(ROOT, "content.js"), "utf8");
  const filesMatch = content.match(/const STYLE_FILES = (\[[\s\S]*?\])/);
  assert.ok(filesMatch, "STYLE_FILES present");
  const files = Function(`"use strict"; return ${filesMatch[1]}`)();
  assert.deepEqual(files, war[0].resources);
  assert.match(content, /STYLE_ID = "scx-extension-css"/);
  assert.match(content, /function ensureExtensionStyles/);
  assert.match(content, /function installStyle/);
  assert.match(content, /function inheritStyleFromParent/);
  assert.match(content, /installStyle\(doc, css\)/);
  assert.match(content, /css: readStyleText\(\)/);

  const background = fs.readFileSync(
    path.join(ROOT, "background.js"),
    "utf8"
  );
  const jsMatch = background.match(/const PLAYER_FRAME_JS = (\[[^\]]+\])/);
  assert.ok(jsMatch, "PLAYER_FRAME_JS present");
  const js = Function(`"use strict"; return ${jsMatch[1]}`)();
  assert.deepEqual(js, script.js);

  assert.doesNotMatch(background, /insertCSS\(/);
  assert.match(background, /removeCSS\(/);
  const legacyMatch = background.match(
    /const LEGACY_CSS_FILES = (\[[\s\S]*?\])/
  );
  assert.ok(legacyMatch, "LEGACY_CSS_FILES present");
  const legacy = Function(`"use strict"; return ${legacyMatch[1]}`)();
  assert.deepEqual(legacy, war[0].resources);
  assert.match(background, /onInstalled/);
  assert.match(background, /onStartup/);
  assert.match(background, /about:blank/);
  assert.match(background, /onCompleted/);
});

test("scrollbar color is themed once; styles.css keeps size only on *", () => {
  const styles = fs.readFileSync(path.join(ROOT, "styles.css"), "utf8");
  const themes = fs.readFileSync(path.join(ROOT, "themes.css"), "utf8");

  assert.match(styles, /html\.scx-enabled\s*\{[\s\S]*?scrollbar-width:\s*thin/);
  assert.match(
    styles,
    /html\.scx-enabled\s*\{[\s\S]*?scrollbar-color:\s*rgb\(0 0 0 \/ 28%\)/
  );
  assert.doesNotMatch(
    styles,
    /html\.scx-enabled,\s*\nhtml\.scx-enabled \*\s*\{[\s\S]*?scrollbar-color/
  );
  assert.match(
    themes,
    /html\.scx-enabled\.scx-theme,\s*\nhtml\.scx-enabled\.scx-theme \*\s*\{[\s\S]*?scrollbar-color:\s*rgb\(255 255 255 \/ 28%\)/
  );
});

test("isOpaqueChildUrl and isSoundCloudUrl classify inject targets", () => {
  const background = fs.readFileSync(
    path.join(ROOT, "background.js"),
    "utf8"
  );
  const { isSoundCloudUrl, isOpaqueChildUrl } = vm.runInNewContext(
    `${background}\n({ isSoundCloudUrl, isOpaqueChildUrl });`,
    {
      chrome: {
        scripting: {
          insertCSS() {},
          removeCSS() {
            return Promise.resolve();
          },
          executeScript() {},
        },
        tabs: { query() {} },
        webNavigation: {
          onCommitted: { addListener() {} },
          onCompleted: { addListener() {} },
          onHistoryStateUpdated: { addListener() {} },
          onDOMContentLoaded: { addListener() {} },
          getAllFrames() {},
        },
        runtime: {
          onInstalled: { addListener() {} },
          onStartup: { addListener() {} },
        },
      },
    },
    { filename: "background.js" }
  );

  assert.equal(isSoundCloudUrl("https://soundcloud.com/n/tracks/123"), true);
  assert.equal(
    isSoundCloudUrl("https://soundcloud.com/discover?v2_layout=1"),
    true
  );
  assert.equal(isSoundCloudUrl("https://example.com/n/x"), false);
  assert.equal(isOpaqueChildUrl("about:blank"), true);
  assert.equal(
    isOpaqueChildUrl("blob:https://soundcloud.com/abc"),
    true
  );
  assert.equal(isOpaqueChildUrl("https://soundcloud.com/n/x"), false);
  assert.equal(isOpaqueChildUrl(null), false);
});

test("SPA parent history update strips leftover CSS and injects JS only", () => {
  const background = fs.readFileSync(
    path.join(ROOT, "background.js"),
    "utf8"
  );
  const listeners = {
    onCommitted: [],
    onCompleted: [],
    onHistoryStateUpdated: [],
    onDOMContentLoaded: [],
    onInstalled: [],
    onStartup: [],
  };
  const insertCalls = [];
  const removeCalls = [];
  const execFiles = [];
  let frames = [
    { frameId: 0, url: "https://soundcloud.com/electrypnose/zhglcsi" },
    { frameId: 3, url: "https://soundcloud.com/n/tracks/123" },
  ];
  const soundCloudTabs = [{ id: 9, url: "https://soundcloud.com/" }];

  vm.runInNewContext(background, {
    chrome: {
      scripting: {
        insertCSS(opts) {
          insertCalls.push(opts);
          return Promise.resolve();
        },
        removeCSS(opts) {
          removeCalls.push(opts);
          return {
            then(onFulfilled) {
              return Promise.resolve(onFulfilled());
            },
            catch() {
              return this;
            },
          };
        },
        executeScript(opts) {
          if (opts && opts.files) {
            execFiles.push(opts);
          }
          const result = [{ result: false }];
          return {
            then(onFulfilled) {
              return Promise.resolve(onFulfilled(result));
            },
            catch() {
              return this;
            },
          };
        },
      },
      tabs: {
        query(_query, cb) {
          cb(soundCloudTabs);
        },
      },
      webNavigation: {
        onCommitted: {
          addListener(fn) {
            listeners.onCommitted.push(fn);
          },
        },
        onCompleted: {
          addListener(fn) {
            listeners.onCompleted.push(fn);
          },
        },
        onHistoryStateUpdated: {
          addListener(fn) {
            listeners.onHistoryStateUpdated.push(fn);
          },
        },
        onDOMContentLoaded: {
          addListener(fn) {
            listeners.onDOMContentLoaded.push(fn);
          },
        },
        getAllFrames(_query, cb) {
          cb(frames);
        },
      },
      runtime: {
        lastError: undefined,
        onInstalled: {
          addListener(fn) {
            listeners.onInstalled.push(fn);
          },
        },
        onStartup: {
          addListener(fn) {
            listeners.onStartup.push(fn);
          },
        },
      },
    },
  });

  assert.equal(listeners.onInstalled.length, 1);
  assert.equal(listeners.onStartup.length, 1);
  listeners.onInstalled[0]();
  assert.equal(insertCalls.length, 0);
  assert.ok(removeCalls.length >= 1);
  assert.equal(
    Array.from(removeCalls[0].files).join(","),
    "styles.css,iframe-player.css,shared/tokens.css,themes.css"
  );
  assert.equal(removeCalls[0].target.tabId, 9);
  assert.equal(removeCalls[0].target.allFrames, true);

  const removeBeforeNav = removeCalls.length;
  listeners.onHistoryStateUpdated[0]({
    frameId: 0,
    tabId: 9,
    url: "https://soundcloud.com/electrypnose/zhglcsi",
  });
  assert.equal(insertCalls.length, 0);
  assert.ok(removeCalls.length > removeBeforeNav);
  assert.equal(execFiles.length, 1);
  assert.equal(execFiles[0].target.frameIds[0], 3);

  listeners.onCompleted[0]({
    frameId: 3,
    tabId: 9,
    url: "https://soundcloud.com/n/tracks/123",
  });
  assert.equal(insertCalls.length, 0);

  frames = [
    { frameId: 0, url: "https://example.com/" },
    { frameId: 4, url: "about:blank" },
  ];
  listeners.onCommitted[0]({
    frameId: 4,
    tabId: 9,
    url: "about:blank",
  });
  assert.equal(insertCalls.length, 0);
});
