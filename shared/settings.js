/**
 * Shared settings defaults and helpers for popup + content scripts.
 * No build step — loaded as a plain script before consumers.
 */
(function (global) {
  const STORAGE_KEY = "scxSettings";
  const PAGE_CACHE_KEY = "scxSettingsCache";
  const ENABLED_CLASS = "scx-enabled";
  const FULL_WIDTH_CLASS = "scx-full-width";
  const ENLARGED_QUEUE_CLASS = "scx-enlarged-queue";
  const THEME_CLASS = "scx-theme";
  const RADIUS_CLASS = "scx-radius";
  const NATIVE_DARK_CLASS = "scx-native-dark";
  const NATIVE_SCHEME_KEY = "scxNativeScheme";
  const RADII = Object.freeze(["default", "none", "sm", "md", "lg", "xl"]);
  const THEME_GROUPS = Object.freeze([
    {
      id: "classic",
      label: "Classic",
      themes: Object.freeze([
        {
          id: "default",
          label: "Default",
          swatches: Object.freeze(["#f2f2f2", "#ff5500"]),
        },
        {
          id: "midnight",
          label: "Midnight",
          swatches: Object.freeze(["#0b0d12", "#141821", "#ff5a1f"]),
        },
        {
          id: "oled",
          label: "OLED",
          swatches: Object.freeze(["#000000", "#141414", "#ff5a1f"]),
        },
        {
          id: "slate",
          label: "Slate",
          swatches: Object.freeze(["#0e1218", "#161c26", "#ff5a1f"]),
        },
      ]),
    },
    {
      id: "accent",
      label: "Accent",
      themes: Object.freeze([
        {
          id: "matrix",
          label: "Matrix",
          swatches: Object.freeze(["#000000", "#001a00", "#00ff41"]),
        },
        {
          id: "fallout",
          label: "Fallout",
          swatches: Object.freeze(["#050505", "#1a1400", "#ffcc00"]),
        },
        {
          id: "cyberpunk",
          label: "Cyberpunk",
          swatches: Object.freeze(["#050505", "#bc13fe", "#00ff9f"]),
        },
        {
          id: "purple",
          label: "Purple",
          swatches: Object.freeze(["#0f071e", "#2e1065", "#a78bfa"]),
        },
        {
          id: "tide",
          label: "Tide",
          swatches: Object.freeze(["#050f0f", "#0a1a1a", "#0df2d0"]),
        },
        {
          id: "blood",
          label: "Blood",
          swatches: Object.freeze(["#060606", "#ff2b2b", "#db0000"]),
        },
      ]),
    },
    {
      id: "style",
      label: "Style",
      themes: Object.freeze([
        {
          id: "minimal",
          label: "Minimal",
          swatches: Object.freeze(["#171717", "#262626", "#e5e5e5"]),
        },
        {
          id: "frost",
          label: "Frost",
          swatches: Object.freeze(["#090b0f", "#13161b", "#3a8cff"]),
        },
      ]),
    },
    {
      id: "homage",
      label: "Homage",
      themes: Object.freeze([
        {
          id: "grove",
          label: "Grove",
          swatches: Object.freeze(["#121212", "#181818", "#1db954"]),
        },
        {
          id: "blush",
          label: "Blush",
          swatches: Object.freeze(["#12242e", "#e4a2b1", "#fbe2a7"]),
        },
      ]),
    },
  ]);

  const PRESET_THEMES = Object.freeze(
    THEME_GROUPS.flatMap((group) => group.themes.map((theme) => theme.id))
  );

  const THEMES = Object.freeze([...PRESET_THEMES, "custom"]);

  const CUSTOM_PALETTE_KEYS = Object.freeze([
    "background",
    "surface",
    "text",
    "accent",
  ]);

  /** Stock SoundCloud dark (html.scx-theme-default.scx-native-dark), not Midnight. */
  const DEFAULT_CUSTOM_PALETTE = Object.freeze({
    background: "#111111",
    surface: "#181818",
    text: "#f2f2f2",
    accent: "#ff5500",
  });

  const SCX_DERIVED_VAR_NAMES = Object.freeze([
    "--scx-background",
    "--scx-surface",
    "--scx-surface-raised",
    "--scx-border",
    "--scx-text",
    "--scx-text-muted",
    "--scx-accent",
    "--scx-link",
    "--scx-focus",
    "--scx-shadow",
    "--scx-surface-rgb",
    "--scx-highlight-rgb",
    "--scx-primary-rgb",
    "--scx-secondary-rgb",
    "--scx-special-rgb",
    "--scx-link-rgb",
    "--scx-color-scheme",
    "--scx-overlay",
    "--scx-overlay-default",
    "--scx-image-border",
    "--scx-scrollbar",
    "--scx-scrollbar-hover",
    "--scx-player-shadow",
  ]);

  const DEFAULTS = Object.freeze({
    enabled: true,
    fullWidth: true,
    enlargedQueue: true,
    theme: "default",
    radius: "md",
    customPalette: DEFAULT_CUSTOM_PALETTE,
  });

  function themeClass(id) {
    return `${THEME_CLASS}-${id}`;
  }

  function radiusClass(id) {
    return `${RADIUS_CLASS}-${id}`;
  }

  const THEME_ALIASES = Object.freeze({
    lifeinvader: "blood",
    terminal: "matrix",
    teal: "tide",
    liquid: "frost",
    spotify: "grove",
    mimi: "blush",
  });

  function sanitizeTheme(value) {
    if (THEME_ALIASES[value]) {
      value = THEME_ALIASES[value];
    }
    return THEMES.includes(value) ? value : DEFAULTS.theme;
  }

  function sanitizeRadius(value) {
    return RADII.includes(value) ? value : DEFAULTS.radius;
  }

  function normalizeHexColor(value) {
    if (value == null) {
      return null;
    }
    let raw = String(value).trim().toLowerCase();
    if (!raw) {
      return null;
    }
    if (!raw.startsWith("#")) {
      raw = `#${raw}`;
    }
    if (/^#[0-9a-f]{3}$/.test(raw)) {
      raw = `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`;
    } else if (/^#[0-9a-f]{4}$/.test(raw)) {
      raw = `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}${raw[4]}${raw[4]}`;
    } else if (/^#[0-9a-f]{8}$/.test(raw)) {
      raw = raw.slice(0, 7);
    }
    if (!/^#[0-9a-f]{6}$/.test(raw)) {
      return null;
    }
    return raw;
  }

  function parseHexColor(hex) {
    const normalized = normalizeHexColor(hex);
    if (!normalized) {
      return null;
    }
    return {
      r: parseInt(normalized.slice(1, 3), 16),
      g: parseInt(normalized.slice(3, 5), 16),
      b: parseInt(normalized.slice(5, 7), 16),
    };
  }

  function rgbToHex({ r, g, b }) {
    const clamp = (n) => Math.max(0, Math.min(255, Math.round(n)));
    const toPart = (n) => clamp(n).toString(16).padStart(2, "0");
    return `#${toPart(r)}${toPart(g)}${toPart(b)}`;
  }

  function mixRgb(a, b, weightB) {
    const w = Math.max(0, Math.min(1, weightB));
    return {
      r: a.r + (b.r - a.r) * w,
      g: a.g + (b.g - a.g) * w,
      b: a.b + (b.b - a.b) * w,
    };
  }

  function relativeLuminance({ r, g, b }) {
    const channel = (c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  }

  function contrastRatio(foreground, background) {
    const fg = parseHexColor(foreground);
    const bg = parseHexColor(background);
    if (!fg || !bg) {
      return null;
    }
    const l1 = relativeLuminance(fg);
    const l2 = relativeLuminance(bg);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  function detectColorScheme(backgroundHex, override) {
    if (override === "light" || override === "dark") {
      return override;
    }
    const rgb = parseHexColor(backgroundHex);
    if (!rgb) {
      return "dark";
    }
    return relativeLuminance(rgb) > 0.4 ? "light" : "dark";
  }

  function rgbTriplet(hex) {
    const rgb = parseHexColor(hex);
    if (!rgb) {
      return "0, 0, 0";
    }
    return `${rgb.r}, ${rgb.g}, ${rgb.b}`;
  }

  function sanitizeCustomPalette(value) {
    const source =
      value && typeof value === "object" ? value : DEFAULT_CUSTOM_PALETTE;
    const next = {};
    let valid = true;
    for (const key of CUSTOM_PALETTE_KEYS) {
      const normalized = normalizeHexColor(source[key]);
      if (!normalized) {
        valid = false;
        break;
      }
      next[key] = normalized;
    }
    if (!valid) {
      return { ...DEFAULT_CUSTOM_PALETTE };
    }
    return next;
  }

  function customPalettesEqual(a, b) {
    if (!a || !b) {
      return false;
    }
    return CUSTOM_PALETTE_KEYS.every((key) => a[key] === b[key]);
  }

  function isCompleteCustomPaletteInput(value) {
    if (!value || typeof value !== "object") {
      return false;
    }
    return CUSTOM_PALETTE_KEYS.every((key) => normalizeHexColor(value[key]));
  }

  /**
   * Deterministic supporting palette from four source colors.
   * @param {{ background: string, surface: string, text: string, accent: string }} palette
   */
  function derivePalette(palette) {
    const base = sanitizeCustomPalette(palette);
    const bg = parseHexColor(base.background);
    const surface = parseHexColor(base.surface);
    const text = parseHexColor(base.text);
    const accent = parseHexColor(base.accent);
    if (!bg || !surface || !text || !accent) {
      return derivePalette(DEFAULT_CUSTOM_PALETTE);
    }

    const scheme = detectColorScheme(base.background);
    const isDark = scheme === "dark";

    const surfaceRaised = rgbToHex(
      mixRgb(surface, text, isDark ? 0.1 : 0.06)
    );
    const border = rgbToHex(mixRgb(surface, text, isDark ? 0.38 : 0.18));
    const textMuted = rgbToHex(mixRgb(text, bg, 0.42));
    const linkBlue = { r: 138, g: 180, b: 255 };
    const link = isDark
      ? rgbToHex(mixRgb(linkBlue, accent, 0.12))
      : rgbToHex(mixRgb(accent, text, 0.35));
    const focus = isDark ? rgbToHex(mixRgb(linkBlue, accent, 0.2)) : link;

    const shadow = isDark
      ? "0 12px 32px rgb(0 0 0 / 35%)"
      : "0 8px 24px rgb(0 0 0 / 12%)";
    const playerShadow = isDark
      ? "0 -1px 0 var(--scx-border), 0 -12px 32px rgb(0 0 0 / 22%)"
      : "0 -1px 0 var(--scx-border), 0 -8px 24px rgb(0 0 0 / 12%)";
    const overlay = isDark ? "rgb(0 0 0 / 62%)" : "rgb(0 0 0 / 45%)";
    const imageBorder = isDark
      ? "rgb(255 255 255 / 12%)"
      : "rgb(0 0 0 / 12%)";
    const scrollbar = isDark
      ? "rgb(255 255 255 / 28%)"
      : "rgb(0 0 0 / 28%)";
    const scrollbarHover = isDark
      ? "rgb(255 255 255 / 45%)"
      : "rgb(0 0 0 / 45%)";

    const raisedRgb = parseHexColor(surfaceRaised);
    const mutedRgb = parseHexColor(textMuted);
    const linkRgb = parseHexColor(link);

    return {
      "--scx-background": base.background,
      "--scx-surface": base.surface,
      "--scx-surface-raised": surfaceRaised,
      "--scx-border": border,
      "--scx-text": base.text,
      "--scx-text-muted": textMuted,
      "--scx-accent": base.accent,
      "--scx-link": link,
      "--scx-focus": focus,
      "--scx-shadow": shadow,
      "--scx-surface-rgb": rgbTriplet(base.surface),
      "--scx-highlight-rgb": raisedRgb
        ? `${raisedRgb.r}, ${raisedRgb.g}, ${raisedRgb.b}`
        : rgbTriplet(surfaceRaised),
      "--scx-primary-rgb": rgbTriplet(base.text),
      "--scx-secondary-rgb": mutedRgb
        ? `${mutedRgb.r}, ${mutedRgb.g}, ${mutedRgb.b}`
        : rgbTriplet(textMuted),
      "--scx-special-rgb": rgbTriplet(base.accent),
      "--scx-link-rgb": linkRgb
        ? `${linkRgb.r}, ${linkRgb.g}, ${linkRgb.b}`
        : rgbTriplet(link),
      "--scx-color-scheme": scheme,
      "--scx-overlay": overlay,
      "--scx-overlay-default": overlay,
      "--scx-image-border": imageBorder,
      "--scx-scrollbar": scrollbar,
      "--scx-scrollbar-hover": scrollbarHover,
      "--scx-player-shadow": playerShadow,
    };
  }

  function mergeWithDefaults(stored) {
    const merged = {
      ...DEFAULTS,
      ...(stored && typeof stored === "object" ? stored : {}),
    };
    merged.enabled = Boolean(merged.enabled);
    merged.fullWidth = Boolean(merged.fullWidth);
    merged.enlargedQueue = Boolean(merged.enlargedQueue);
    merged.theme = sanitizeTheme(merged.theme);
    merged.radius = sanitizeRadius(merged.radius);
    if (
      stored &&
      typeof stored === "object" &&
      stored.customPalette &&
      typeof stored.customPalette === "object"
    ) {
      merged.customPalette = sanitizeCustomPalette(stored.customPalette);
    } else if (merged.theme === "custom") {
      merged.customPalette = sanitizeCustomPalette(stored && stored.customPalette);
    } else {
      merged.customPalette = { ...DEFAULT_CUSTOM_PALETTE };
    }
    return merged;
  }

  function persistableSettings(settings) {
    const out = {
      enabled: settings.enabled,
      fullWidth: settings.fullWidth,
      enlargedQueue: settings.enlargedQueue,
      theme: settings.theme,
      radius: settings.radius,
    };
    if (settings.theme === "custom") {
      out.customPalette = sanitizeCustomPalette(settings.customPalette);
    }
    return out;
  }

  function settingsNeedPersist(raw, merged) {
    if (!raw || typeof raw !== "object") {
      return true;
    }
    const palettePersist =
      merged.theme === "custom" ||
      (raw.customPalette && typeof raw.customPalette === "object");
    const paletteChanged =
      palettePersist &&
      !customPalettesEqual(
        raw.customPalette && typeof raw.customPalette === "object"
          ? raw.customPalette
          : null,
        merged.customPalette
      );
    return (
      raw.enabled !== merged.enabled ||
      raw.fullWidth !== merged.fullWidth ||
      raw.enlargedQueue !== merged.enlargedQueue ||
      raw.theme !== merged.theme ||
      raw.radius !== merged.radius ||
      paletteChanged
    );
  }

  function getSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(STORAGE_KEY, (result) => {
        const raw = result[STORAGE_KEY];
        const merged = mergeWithDefaults(raw);
        if (!settingsNeedPersist(raw, merged)) {
          resolve(merged);
          return;
        }
        chrome.storage.sync.set(
          { [STORAGE_KEY]: persistableSettings(merged) },
          () => resolve(merged)
        );
      });
    });
  }

  let settingsWriteTail = Promise.resolve();

  function applySettingsPartial(partial) {
    return getSettings().then((current) => {
      const next = { ...current, ...partial };
      next.enabled = Boolean(next.enabled);
      next.fullWidth = Boolean(next.fullWidth);
      next.enlargedQueue = Boolean(next.enlargedQueue);
      next.theme = sanitizeTheme(next.theme);
      next.radius = sanitizeRadius(next.radius);
      if (partial && partial.customPalette) {
        next.customPalette = sanitizeCustomPalette(partial.customPalette);
      } else {
        next.customPalette = sanitizeCustomPalette(next.customPalette);
      }
      return new Promise((resolve, reject) => {
        chrome.storage.sync.set(
          { [STORAGE_KEY]: persistableSettings(next) },
          () => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
              return;
            }
            resolve(next);
          }
        );
      });
    });
  }

  function setSettings(partial) {
    const result = settingsWriteTail.then(() => applySettingsPartial(partial));
    settingsWriteTail = result.catch(() => {});
    return result;
  }

  function readPageCache() {
    try {
      const raw = global.localStorage.getItem(PAGE_CACHE_KEY);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw);
      const merged = mergeWithDefaults(parsed);
      if (settingsNeedPersist(parsed, merged)) {
        writePageCache(merged);
      }
      return merged;
    } catch {
      return null;
    }
  }

  function writePageCache(settings) {
    try {
      global.localStorage.setItem(PAGE_CACHE_KEY, JSON.stringify(settings));
    } catch {
      /* private mode or blocked storage */
    }
  }

  function onSettingsChanged(callback) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "sync" || !changes[STORAGE_KEY]) {
        return;
      }
      callback(mergeWithDefaults(changes[STORAGE_KEY].newValue));
    });
  }

  /**
   * Apply theme classes on a document root.
   * @param {string} theme
   * @param {{ includeDefault?: boolean, nativeScheme?: string, root?: Element }} [options]
   *   includeDefault: popup chrome always uses scx-theme-default / scx-theme-{id}.
   *   SoundCloud omits classes when theme is default (stock colors).
   *   nativeScheme: popup-only; with includeDefault + theme default, "dark"
   *   adds scx-native-dark so chrome matches SoundCloud body.theme-dark.
   *   root: optional documentElement (iframe paint).
   */
  function applyDocumentTheme(theme, options) {
    const root = (options && options.root) || document.documentElement;
    if (!root) {
      return;
    }

    const includeDefault = Boolean(options && options.includeDefault);
    const nativeScheme = options && options.nativeScheme;
    const next = sanitizeTheme(theme);

    root.classList.remove(THEME_CLASS);
    root.classList.remove(NATIVE_DARK_CLASS);
    for (const legacyId of Object.keys(THEME_ALIASES)) {
      root.classList.remove(themeClass(legacyId));
    }
    for (const id of THEMES) {
      root.classList.remove(themeClass(id));
    }

    if (includeDefault) {
      root.classList.add(themeClass(next));
      if (next === "default" && nativeScheme === "dark") {
        root.classList.add(NATIVE_DARK_CLASS);
      }
      return;
    }

    if (next && next !== "default") {
      root.classList.add(THEME_CLASS);
      root.classList.add(themeClass(next));
    }
  }

  function clearCustomThemeVariables(root) {
    const el = root || document.documentElement;
    if (!el || !el.style) {
      return;
    }
    for (const name of SCX_DERIVED_VAR_NAMES) {
      el.style.removeProperty(name);
    }
  }

  /**
   * Apply resolved custom palette variables on a document root.
   * @param {Element} root
   * @param {{ customPalette?: object, colorScheme?: string }} settings
   */
  function applyCustomThemeVariables(root, settings) {
    const el = root || document.documentElement;
    if (!el || !el.style) {
      return;
    }
    const palette = derivePalette(settings && settings.customPalette);
    for (const name of SCX_DERIVED_VAR_NAMES) {
      if (palette[name] != null) {
        el.style.setProperty(name, palette[name]);
      }
    }
  }

  /**
   * Read four source colors from computed preset tokens (popup preview).
   * @param {string} presetId
   * @param {Element} [root]
   * @param {{ nativeScheme?: string }} [options]
   */
  function readPresetSourcePalette(presetId, root, options) {
    const el = root || document.documentElement;
    if (!el) {
      return { ...DEFAULT_CUSTOM_PALETTE };
    }
    const nativeScheme = options && options.nativeScheme;
    applyDocumentTheme(presetId, {
      root: el,
      includeDefault: true,
      nativeScheme,
    });
    const style = global.getComputedStyle(el);
    return sanitizeCustomPalette({
      background: style.getPropertyValue("--scx-background"),
      surface: style.getPropertyValue("--scx-surface"),
      text: style.getPropertyValue("--scx-text"),
      accent: style.getPropertyValue("--scx-accent"),
    });
  }

  /**
   * Apply radius classes on a document root.
   * @param {string} radius
   * @param {{ active?: boolean, root?: Element }} [options]
   *   active: when false (SoundCloud disabled), clear radius classes.
   *   Popup always passes active true so chrome previews the setting.
   *   "default" clears all scx-radius-* (stock SoundCloud corners).
   */
  function applyDocumentRadius(radius, options) {
    const root = (options && options.root) || document.documentElement;
    if (!root) {
      return;
    }

    const active = !options || options.active !== false;
    for (const id of RADII) {
      if (id === "default") {
        continue;
      }
      root.classList.remove(radiusClass(id));
    }

    if (!active) {
      return;
    }

    const next = sanitizeRadius(radius || DEFAULTS.radius);
    if (next !== "default") {
      root.classList.add(radiusClass(next));
    }
  }

  global.ScxSettings = {
    STORAGE_KEY,
    NATIVE_SCHEME_KEY,
    ENABLED_CLASS,
    FULL_WIDTH_CLASS,
    ENLARGED_QUEUE_CLASS,
    THEME_CLASS,
    RADIUS_CLASS,
    NATIVE_DARK_CLASS,
    THEME_GROUPS,
    THEMES,
    CUSTOM_PALETTE_KEYS,
    DEFAULT_CUSTOM_PALETTE,
    RADII,
    DEFAULTS,
    themeClass,
    radiusClass,
    THEME_ALIASES,
    sanitizeTheme,
    sanitizeRadius,
    normalizeHexColor,
    contrastRatio,
    customPalettesEqual,
    isCompleteCustomPaletteInput,
    sanitizeCustomPalette,
    derivePalette,
    mergeWithDefaults,
    persistableSettings,
    getSettings,
    setSettings,
    readPageCache,
    writePageCache,
    onSettingsChanged,
    applyDocumentTheme,
    applyCustomThemeVariables,
    clearCustomThemeVariables,
    readPresetSourcePalette,
    applyDocumentRadius,
  };
})(typeof globalThis !== "undefined" ? globalThis : self);
