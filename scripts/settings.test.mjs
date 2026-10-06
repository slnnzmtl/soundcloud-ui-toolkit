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

  const computedVars = options.computedVars ?? {};
  const context = {
    globalThis: undefined,
    self: undefined,
    document: { documentElement },
    getComputedStyle() {
      return {
        getPropertyValue(name) {
          return computedVars[name] || "";
        },
      };
    },
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
  assert.equal(ScxSettings.sanitizeTheme("custom"), "custom");
  assert.equal(ScxSettings.sanitizeTheme("not-a-theme"), "default");
  assert.equal(ScxSettings.sanitizeTheme(undefined), "default");
  assert.equal(ScxSettings.sanitizeTheme("c_abc123"), "default");
  assert.equal(
    ScxSettings.sanitizeTheme("c_abc123", [
      {
        id: "c_abc123",
        label: "Custom 1",
        palette: ScxSettings.DEFAULT_CUSTOM_PALETTE,
      },
    ]),
    "c_abc123"
  );
});

test("normalizeHexColor accepts common forms and rejects invalid input", () => {
  const { ScxSettings } = loadScxSettings();
  assert.equal(ScxSettings.normalizeHexColor("#abc"), "#aabbcc");
  assert.equal(ScxSettings.normalizeHexColor("ABC"), "#aabbcc");
  assert.equal(ScxSettings.normalizeHexColor("#0b0d12"), "#0b0d12");
  assert.equal(ScxSettings.normalizeHexColor("#0b0d12ff"), "#0b0d12");
  assert.equal(ScxSettings.normalizeHexColor("not-a-color"), null);
  assert.equal(ScxSettings.normalizeHexColor(""), null);
});

test("derivePalette builds deterministic supporting tokens", () => {
  const { ScxSettings } = loadScxSettings();
  const palette = ScxSettings.derivePalette({
    background: "#0b0d12",
    surface: "#141821",
    text: "#f5f7fb",
    accent: "#ff5500",
  });
  assert.equal(palette["--scx-background"], "#0b0d12");
  assert.equal(palette["--scx-accent"], "#ff5500");
  assert.equal(palette["--scx-color-scheme"], "dark");
  assert.match(palette["--scx-surface-rgb"], /^\d+, \d+, \d+$/);
  assert.match(palette["--scx-overlay"], /^rgb\(/);
  assert.match(palette["--scx-scrollbar"], /^rgb\(/);
});

test("derivePalette sets light color-scheme for bright backgrounds", () => {
  const { ScxSettings } = loadScxSettings();
  const light = ScxSettings.derivePalette({
    background: "#f2f2f2",
    surface: "#ffffff",
    text: "#121212",
    accent: "#ff5500",
  });
  assert.equal(light["--scx-color-scheme"], "light");
  const dark = ScxSettings.derivePalette({
    background: "#0b0d12",
    surface: "#141821",
    text: "#f5f7fb",
    accent: "#ff5500",
  });
  assert.equal(dark["--scx-color-scheme"], "dark");
});

test("persistableSettings keeps customPalette only for custom theme", () => {
  const { ScxSettings } = loadScxSettings();
  const preset = ScxSettings.persistableSettings({
    enabled: true,
    fullWidth: true,
    enlargedQueue: true,
    theme: "midnight",
    radius: "md",
    customPalette: ScxSettings.DEFAULT_CUSTOM_PALETTE,
  });
  assert.equal(preset.customPalette, undefined);

  const custom = ScxSettings.persistableSettings({
    enabled: true,
    fullWidth: true,
    enlargedQueue: true,
    theme: "custom",
    radius: "md",
    customPalette: ScxSettings.DEFAULT_CUSTOM_PALETTE,
  });
  assert.equal(custom.customPalette.background, "#111111");
  assert.equal(custom.customPalette.accent, "#ff5500");
});

test("sanitizeCustomPresets keeps valid unique presets and drops junk", () => {
  const { ScxSettings } = loadScxSettings();
  const palette = { ...ScxSettings.DEFAULT_CUSTOM_PALETTE };
  const cleaned = ScxSettings.sanitizeCustomPresets([
    { id: "midnight", label: "Nope", palette },
    { id: "c_abc123", label: "  My theme  ", palette },
    { id: "c_abc123", label: "Duplicate id", palette },
    { id: "c_def456", label: "", palette: { background: "bad" } },
    { id: "c_def456", label: "", palette },
  ]);
  assert.equal(cleaned.length, 2);
  assert.equal(cleaned[0].id, "c_abc123");
  assert.equal(cleaned[0].label, "My theme");
  assert.equal(cleaned[1].id, "c_def456");
  assert.equal(cleaned[1].label, "Custom 1");
});

test("persistableSettings keeps customPalette for saved custom theme ids", () => {
  const { ScxSettings } = loadScxSettings();
  const out = ScxSettings.persistableSettings({
    enabled: true,
    fullWidth: true,
    enlargedQueue: true,
    theme: "c_abc123",
    radius: "md",
    customPalette: ScxSettings.DEFAULT_CUSTOM_PALETTE,
    customPresets: [
      {
        id: "c_abc123",
        label: "Custom 1",
        palette: {
          background: "#0b0d12",
          surface: "#141821",
          text: "#f5f7fb",
          accent: "#ff5a1f",
        },
      },
    ],
  });
  assert.equal(out.customPalette.background, "#0b0d12");
  assert.equal(out.customPresets.length, 1);
});

test("persistableSettings keeps customPresets for built-in themes", () => {
  const { ScxSettings } = loadScxSettings();
  const preset = {
    id: "c_abc123",
    label: "Custom 1",
    palette: { ...ScxSettings.DEFAULT_CUSTOM_PALETTE },
  };
  const out = ScxSettings.persistableSettings({
    enabled: true,
    fullWidth: true,
    enlargedQueue: true,
    theme: "midnight",
    radius: "md",
    customPalette: ScxSettings.DEFAULT_CUSTOM_PALETTE,
    customPresets: [preset],
  });
  assert.equal(out.theme, "midnight");
  assert.equal(out.customPalette, undefined);
  assert.equal(out.customPresets.length, 1);
  assert.equal(out.customPresets[0].id, "c_abc123");
});

test("resolveCustomPalette uses saved preset over leftover editor palette", () => {
  const { ScxSettings } = loadScxSettings();
  const saved = {
    background: "#0b0d12",
    surface: "#141821",
    text: "#f5f7fb",
    accent: "#ff5a1f",
  };
  const palette = ScxSettings.resolveCustomPalette({
    theme: "c_abc123",
    customPalette: ScxSettings.DEFAULT_CUSTOM_PALETTE,
    customPresets: [
      { id: "c_abc123", label: "Custom 1", palette: saved },
    ],
  });
  assert.equal(palette.background, "#0b0d12");
  assert.equal(palette.accent, "#ff5a1f");

  const live = ScxSettings.resolveCustomPalette({
    theme: "custom",
    customPalette: saved,
    customPresets: [],
  });
  assert.equal(live.background, "#0b0d12");
});

test("applyDocumentTheme maps saved custom ids to scx-theme-custom", () => {
  const { ScxSettings, classList } = loadScxSettings();
  ScxSettings.applyDocumentTheme("c_abc123");
  assert.deepEqual(classList.toArray(), ["scx-theme", "scx-theme-custom"]);
  assert.ok(ScxSettings.isCustomThemeId("c_abc123"));
  assert.ok(ScxSettings.isCustomThemeId("custom"));
  assert.equal(ScxSettings.isCustomThemeId("midnight"), false);
});

test("mergeWithDefaults drops unknown saved theme ids", () => {
  const { ScxSettings } = loadScxSettings();
  const merged = ScxSettings.mergeWithDefaults({
    theme: "c_missing",
    customPresets: [],
  });
  assert.equal(merged.theme, "default");
});

test("createCustomPreset assigns Custom N labels and c_ ids", () => {
  const { ScxSettings } = loadScxSettings();
  const first = ScxSettings.createCustomPreset(
    ScxSettings.DEFAULT_CUSTOM_PALETTE,
    []
  );
  assert.match(first.id, /^c_[a-z0-9]+$/);
  assert.equal(first.label, "Custom 1");
  const second = ScxSettings.createCustomPreset(
    ScxSettings.DEFAULT_CUSTOM_PALETTE,
    [first]
  );
  assert.equal(second.label, "Custom 2");
  assert.notEqual(second.id, first.id);
});

test("getSettings does not persist default customPalette for preset-only storage", async () => {
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
  const settings = await ScxSettings.getSettings();
  assert.equal(settings.theme, "midnight");
  assert.equal(store.scxSettings, before);
  assert.deepEqual(settings.customPalette, ScxSettings.DEFAULT_CUSTOM_PALETTE);
});

test("applyCustomThemeVariables sets and clearCustomThemeVariables removes style tag vars", () => {
  const { ScxSettings, documentElement } = loadScxSettings();
  const styleNodes = [];
  const document = {
    documentElement,
    head: { appendChild(node) { styleNodes.push(node); } },
    getElementById(id) {
      return styleNodes.find((node) => node.id === id) || null;
    },
    createElement() {
      return { id: "", textContent: "" };
    },
  };
  documentElement.ownerDocument = document;
  documentElement.style = {
    props: {},
    removeProperty(name) {
      delete this.props[name];
    },
  };

  ScxSettings.applyCustomThemeVariables(documentElement, {
    customPalette: ScxSettings.DEFAULT_CUSTOM_PALETTE,
  });
  const styleEl = document.getElementById(ScxSettings.CUSTOM_THEME_STYLE_ID);
  assert.ok(styleEl);
  assert.match(styleEl.textContent, /--scx-background:\s*#111111/);
  assert.match(styleEl.textContent, /--scx-border:/);

  ScxSettings.clearCustomThemeVariables(documentElement);
  assert.equal(styleEl.textContent, "");
});

test("applyDocumentTheme applies custom class like other non-default themes", () => {
  const { ScxSettings, classList } = loadScxSettings();
  ScxSettings.applyDocumentTheme("custom");
  assert.deepEqual(classList.toArray(), ["scx-theme", "scx-theme-custom"]);
  ScxSettings.applyDocumentTheme("default");
  assert.deepEqual(classList.toArray(), []);
});

test("switching from custom to preset clears custom theme style tag", () => {
  const { ScxSettings, documentElement, classList } = loadScxSettings();
  const styleNodes = [];
  const document = {
    documentElement,
    head: { appendChild(node) { styleNodes.push(node); } },
    getElementById(id) {
      return styleNodes.find((node) => node.id === id) || null;
    },
    createElement() {
      return { id: "", textContent: "" };
    },
  };
  documentElement.ownerDocument = document;
  documentElement.style = {
    props: {},
    removeProperty(name) {
      delete this.props[name];
    },
  };
  ScxSettings.applyDocumentTheme("custom");
  ScxSettings.applyCustomThemeVariables(documentElement, {
    customPalette: ScxSettings.DEFAULT_CUSTOM_PALETTE,
  });
  const styleEl = document.getElementById(ScxSettings.CUSTOM_THEME_STYLE_ID);
  assert.ok(styleEl && styleEl.textContent);
  ScxSettings.applyDocumentTheme("midnight");
  ScxSettings.clearCustomThemeVariables(documentElement);
  assert.deepEqual(classList.toArray(), ["scx-theme", "scx-theme-midnight"]);
  assert.equal(styleEl.textContent, "");
});

test("readPresetSourcePalette applies scx-native-dark for default + dark scheme", () => {
  const { ScxSettings, documentElement, classList } = loadScxSettings();
  ScxSettings.readPresetSourcePalette("default", documentElement, {
    nativeScheme: "dark",
  });
  assert.ok(classList.contains("scx-theme-default"));
  assert.ok(classList.contains("scx-native-dark"));
});

test("readPresetSourcePalette maps computed preset tokens to source colors", () => {
  const { ScxSettings, documentElement } = loadScxSettings({
    computedVars: {
      "--scx-background": "#0b0d12",
      "--scx-surface": "#141821",
      "--scx-text": "#f5f7fb",
      "--scx-accent": "#ff5a1f",
    },
  });
  const palette = ScxSettings.readPresetSourcePalette("midnight", documentElement);
  assert.equal(palette.background, "#0b0d12");
  assert.equal(palette.surface, "#141821");
  assert.equal(palette.text, "#f5f7fb");
  assert.equal(palette.accent, "#ff5a1f");
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
      "CUSTOM_PALETTE_KEYS",
      "DEFAULTS",
      "DEFAULT_CUSTOM_PALETTE",
      "MAX_CUSTOM_PRESETS",
      "createCustomPreset",
      "findCustomPreset",
      "isCustomThemeId",
      "isSavedCustomThemeId",
      "resolveCustomPalette",
      "sanitizeCustomPresets",
      "ENABLED_CLASS",
      "ENLARGED_QUEUE_CLASS",
      "FULL_WIDTH_CLASS",
      "NATIVE_DARK_CLASS",
      "NATIVE_SCHEME_KEY",
      "RADII",
      "RADIUS_CLASS",
      "STORAGE_KEY",
      "CUSTOM_THEME_STYLE_ID",
      "THEME_ALIASES",
      "THEME_CLASS",
      "THEME_GROUPS",
      "THEMES",
      "applyCustomThemeVariables",
      "applyDocumentRadius",
      "applyDocumentTheme",
      "clearCustomThemeVariables",
      "contrastRatio",
      "customPalettesEqual",
      "derivePalette",
      "getSettings",
      "isCompleteCustomPaletteInput",
      "mergeWithDefaults",
      "normalizeHexColor",
      "onSettingsChanged",
      "persistableSettings",
      "radiusClass",
      "readPageCache",
      "readPresetSourcePalette",
      "sanitizeCustomPalette",
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
    /html\.scx-enabled\.scx-theme,\s*\nhtml\.scx-enabled\.scx-theme \*\s*\{[\s\S]*?scrollbar-color:\s*var\(--scx-scrollbar/
  );
  assert.match(
    themes,
    /color-scheme:\s*var\(--scx-color-scheme,\s*dark\)/
  );
});

test("popup uses shared custom theme helpers for chrome preview", () => {
  const popupJs = fs.readFileSync(path.join(ROOT, "popup/popup.js"), "utf8");
  const popupCss = fs.readFileSync(path.join(ROOT, "popup/popup.css"), "utf8");
  const html = fs.readFileSync(path.join(ROOT, "popup/popup.html"), "utf8");
  assert.match(popupJs, /applyCustomThemeVariables/);
  assert.match(popupJs, /clearCustomThemeVariables/);
  assert.match(popupJs, /commitCustomPalette/);
  assert.match(popupJs, /readPresetSourcePalette/);
  assert.match(html, /id="custom-theme-panel"/);
  assert.match(html, /name="theme-mode"/);
  assert.match(html, /id="custom-save"/);
  assert.match(html, /Save preset/);
  assert.match(popupJs, /createCustomPreset/);
  assert.match(popupJs, /custom-preset-list/);
  assert.match(popupJs, /renderSavedPresetList/);
  assert.match(popupJs, /lastPresetTheme = preset\.id/);
  assert.match(popupJs, /themeList\.addEventListener\("change"/);
  assert.match(popupJs, /broadcastLiveSettings\(\)/);
  assert.match(popupCss, /custom-theme__presets/);
  assert.match(html, /id="custom-preset-list"/);
});

test("content paintRoot applies and clears custom variables", () => {
  const content = fs.readFileSync(path.join(ROOT, "content.js"), "utf8");
  assert.match(content, /applyCustomThemeVariables\(root, settings\)/);
  assert.match(content, /clearCustomThemeVariables\(root\)/);
  assert.match(content, /isCustomThemeId\(theme\)/);
  assert.match(content, /CUSTOM_THEME_STYLE_ID/);
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
