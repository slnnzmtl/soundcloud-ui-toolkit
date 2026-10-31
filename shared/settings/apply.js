/**
 * Shared settings apply helpers (DOM + color/preset math) for popup + content.
 * Depends on shared/settings/catalogs.js (ScxSettings constants).
 */
(function (global) {
  const S = global.ScxSettings;
  if (!S) {
    throw new Error("ScxSettings catalogs must load before apply");
  }

  const {
    CUSTOM_THEME_STYLE_ID,
    FONT_STYLE_ID,
    FEATURE_CLASS_BY_SETTING,
    BOOLEAN_SETTING_KEYS,
    HERO_BG_CLASS,
    HERO_WAVEFORM_CLASS,
    HERO_BACKGROUND_STYLES,
    HERO_WAVEFORM_STYLES,
    THEME_CLASS,
    RADIUS_CLASS,
    FONT_CLASS,
    NATIVE_DARK_CLASS,
    THEME_GROUPS,
    THEMES,
    FONTS,
    CUSTOM_PALETTE_KEYS,
    DEFAULT_CUSTOM_PALETTE,
    MAX_CUSTOM_PRESETS,
    CUSTOM_PRESET_LABEL_MAX_LENGTH,
    RADII,
    DEFAULTS,
  } = S;

  /** Stock SoundCloud played-waveform orange (#ff5500 / #f50). */
  const STOCK_WAVEFORM_ORANGE_HSL = Object.freeze({ h: 20, s: 100, l: 50 });
  const RADIUS_ALIASES = Object.freeze({
    sm: "small",
    md: "medium",
    lg: "large",
    xl: "xlarge",
  });
  const FONT_FALLBACK =
    '"Lucida Sans Unicode","Lucida Sans","Garuda","Verdana","Tahoma",sans-serif';
  const FONT_IDS = Object.freeze(FONTS.map((font) => font.id));
  const CUSTOM_PRESET_ID_RE = /^c_[a-z0-9]+$/;
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
    "--scx-waveform-filter",
    "--scx-waveform-filter-text",
  ]);

  function featureClassWant(key, settings) {
    if (key === "enabled") {
      return Boolean(settings && settings.enabled);
    }
    return (
      Boolean(settings && settings.enabled) && Boolean(settings && settings[key])
    );
  }

  function featureClassesNeedPaint(root, settings) {
    if (!root) {
      return false;
    }
    return BOOLEAN_SETTING_KEYS.some(
      (key) =>
        root.classList.contains(FEATURE_CLASS_BY_SETTING[key]) !==
        featureClassWant(key, settings)
    );
  }

  function applyDocumentFeatureClasses(settings, options) {
    const root = (options && options.root) || document.documentElement;
    if (!root) {
      return;
    }
    for (const key of BOOLEAN_SETTING_KEYS) {
      root.classList.toggle(
        FEATURE_CLASS_BY_SETTING[key],
        featureClassWant(key, settings)
      );
    }
  }

  function themeClass(id) {
    return `${THEME_CLASS}-${id}`;
  }

  function radiusClass(id) {
    return `${RADIUS_CLASS}-${id}`;
  }

  function fontClass(id) {
    return `${FONT_CLASS}-${id}`;
  }

  function findFont(id) {
    return FONTS.find((font) => font.id === id) || null;
  }

  function sanitizeFont(value) {
    return FONT_IDS.includes(value) ? value : DEFAULTS.font;
  }

  function googleFontsCssUrl(family, axes) {
    const param = family.replace(/ /g, "+");
    const style = axes == null ? "wght@400;600;700" : axes;
    const familyParam = style ? `${param}:${style}` : param;
    return `https://fonts.googleapis.com/css2?family=${familyParam}&display=swap`;
  }

  function buildFontOverrideCss(entry) {
    const family = entry.family;
    const quoted = `"${family}"`;
    return [
      `html.scx-enabled.scx-font, html.scx-enabled.scx-font *, html.scx-enabled.scx-font body, html.scx-enabled.scx-font body._a3wf {`,
      `  font-family: ${quoted}, serif !important;`,
      `}`,
      `html.scx-enabled.scx-font, html.scx-enabled.scx-font .theme-dark, html.scx-enabled.scx-font .theme-light {`,
      `  --font-inter: ${quoted}, ${FONT_FALLBACK} !important;`,
      `  --typography-heading4-font: 400 var(--font-inter) !important;`,
      `  font-weight: 400 !important;`,
      `}`,
    ].join("\n");
  }

  /** @type {Map<string, string>} */
  const fontFaceCache = new Map();
  /** @type {Map<string, Promise<string>>} */
  const fontFaceInflight = new Map();

  function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    let binary = "";
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode.apply(
        null,
        bytes.subarray(i, i + chunkSize)
      );
    }
    return btoa(binary);
  }

  async function inlineGoogleFontCss(cssText) {
    const urlRe = /url\((?:'|"|)([^'")]+)(?:'|"|)\)/g;
    const urls = new Set();
    let match;
    while ((match = urlRe.exec(cssText))) {
      let url = match[1].trim();
      if (url.startsWith("//")) {
        url = `https:${url}`;
      }
      if (url.startsWith("https://")) {
        urls.add(url);
      }
    }
    let out = cssText;
    for (const url of urls) {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          continue;
        }
        const buffer = await response.arrayBuffer();
        const mime = response.headers.get("content-type") || "font/woff2";
        const dataUrl = `data:${mime.split(";")[0]};base64,${arrayBufferToBase64(buffer)}`;
        out = out.split(url).join(dataUrl);
      } catch {
        /* keep remote url as fallback */
      }
    }
    return out;
  }

  function ensureFontFaceCss(entry) {
    if (fontFaceCache.has(entry.id)) {
      return Promise.resolve(fontFaceCache.get(entry.id));
    }
    if (fontFaceInflight.has(entry.id)) {
      return fontFaceInflight.get(entry.id);
    }
    const promise = fetch(googleFontsCssUrl(entry.family, entry.axes), {
      credentials: "omit",
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`font css ${response.status}`);
        }
        return response.text();
      })
      .then(inlineGoogleFontCss)
      .then((faceCss) => {
        fontFaceInflight.delete(entry.id);
        if (faceCss) {
          fontFaceCache.set(entry.id, faceCss);
        }
        return faceCss || "";
      })
      .catch(() => {
        fontFaceInflight.delete(entry.id);
        return "";
      });
    fontFaceInflight.set(entry.id, promise);
    return promise;
  }

  function heroBackgroundClass(id) {
    return `${HERO_BG_CLASS}-${id}`;
  }

  function heroWaveformClass(id) {
    return `${HERO_WAVEFORM_CLASS}-${id}`;
  }

  const HERO_COVER_CSS_VAR = "--scx-hero-cover";

  /**
   * Dominant RGB from downscaled cover art (skips near-black/white/grey pixels).
   * @param {ImageData} imageData
   * @returns {{ r: number, g: number, b: number } | null}
   */
  function averageRgbFromCoverPixels(imageData) {
    if (!imageData || !imageData.data || !imageData.data.length) {
      return null;
    }
    const { data } = imageData;
    let rSum = 0;
    let gSum = 0;
    let bSum = 0;
    let count = 0;
    let rAll = 0;
    let gAll = 0;
    let bAll = 0;
    let countAll = 0;

    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3];
      if (alpha < 16) {
        continue;
      }
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      rAll += r;
      gAll += g;
      bAll += b;
      countAll += 1;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      if (max < 24 || min > 232 || max - min < 18) {
        continue;
      }
      rSum += r;
      gSum += g;
      bSum += b;
      count += 1;
    }

    const pick =
      count > 0
        ? { r: rSum / count, g: gSum / count, b: bSum / count }
        : countAll > 0
          ? { r: rAll / countAll, g: gAll / countAll, b: bAll / countAll }
          : null;
    if (!pick) {
      return null;
    }
    return {
      r: Math.round(pick.r),
      g: Math.round(pick.g),
      b: Math.round(pick.b),
    };
  }

  function sanitizeHeroBackgroundStyle(value) {
    return HERO_BACKGROUND_STYLES.includes(value)
      ? value
      : DEFAULTS.heroBackgroundStyle;
  }

  function sanitizeHeroWaveformStyle(value) {
    return HERO_WAVEFORM_STYLES.includes(value)
      ? value
      : DEFAULTS.heroWaveformStyle;
  }

  /**
   * Hero class names to apply when extension is enabled (excludes "default" styles).
   * @param {{ enabled?: boolean, heroBackgroundStyle?: string, heroWaveformStyle?: string }} settings
   * @returns {string[]}
   */
  function desiredHeroClasses(settings) {
    const classes = [];
    if (!settings || !settings.enabled) {
      return classes;
    }
    const bg = sanitizeHeroBackgroundStyle(settings.heroBackgroundStyle);
    const wf = sanitizeHeroWaveformStyle(settings.heroWaveformStyle);
    if (bg !== "default") {
      classes.push(heroBackgroundClass(bg));
    }
    if (wf !== "default") {
      classes.push(heroWaveformClass(wf));
    }
    return classes;
  }

  const THEME_ALIASES = Object.freeze({
    lifeinvader: "blood",
    terminal: "matrix",
    teal: "tide",
    liquid: "frost",
    spotify: "grove",
    mimi: "blush",
    paper: "default",
  });

  /**
   * @param {string} themeId
   * @returns {{ group: object, theme: object } | null}
   */
  function findCatalogTheme(themeId) {
    if (!themeId) {
      return null;
    }
    const id = THEME_ALIASES[themeId] || themeId;
    for (const group of THEME_GROUPS) {
      const theme = group.themes.find((entry) => entry.id === id);
      if (theme) {
        return { group, theme };
      }
    }
    return null;
  }

  /**
   * Suggested hero styles when switching catalog themes while the popup
   * session still has Default for that control (snapshot at popup open).
   * Default theme uses default hero styles; Classic / Style / Homage use
   * cover matching; Accent themes use accent background.
   * @param {string} themeId
   * @returns {{ heroBackgroundStyle: string, heroWaveformStyle: string } | null}
   */
  function heroStylesForTheme(themeId) {
    const found = findCatalogTheme(themeId);
    if (!found) {
      return null;
    }
    if (found.theme.id === "default") {
      return {
        heroBackgroundStyle: "default",
        heroWaveformStyle: "default",
      };
    }
    return {
      heroBackgroundStyle: found.group.id === "accent" ? "accent" : "cover",
      heroWaveformStyle: "accent",
    };
  }

  function isSavedCustomThemeId(value) {
    return typeof value === "string" && CUSTOM_PRESET_ID_RE.test(value);
  }

  function isCustomThemeId(value) {
    return value === "custom" || isSavedCustomThemeId(value);
  }

  function findCustomPreset(presets, id) {
    if (!Array.isArray(presets) || !id) {
      return null;
    }
    for (const preset of presets) {
      if (preset && preset.id === id) {
        return preset;
      }
    }
    return null;
  }

  function nextCustomPresetLabel(existingLabels) {
    const labels = existingLabels instanceof Set ? existingLabels : new Set();
    let n = 1;
    while (labels.has(`Custom ${n}`)) {
      n += 1;
    }
    return `Custom ${n}`;
  }

  function generateCustomPresetId() {
    const bytes = new Uint8Array(6);
    const crypto = global.crypto || globalThis.crypto;
    if (crypto && crypto.getRandomValues) {
      crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < bytes.length; i += 1) {
        bytes[i] = Math.floor(Math.random() * 256);
      }
    }
    let id = "c_";
    for (const byte of bytes) {
      id += byte.toString(16).padStart(2, "0");
    }
    return id;
  }

  function sanitizeCustomPreset(value, usedIds, usedLabels) {
    if (!value || typeof value !== "object") {
      return null;
    }
    if (!isSavedCustomThemeId(value.id) || usedIds.has(value.id)) {
      return null;
    }
    if (!isCompleteCustomPaletteInput(value.palette)) {
      return null;
    }
    let label = typeof value.label === "string" ? value.label.trim() : "";
    if (label.length > CUSTOM_PRESET_LABEL_MAX_LENGTH) {
      label = label.slice(0, CUSTOM_PRESET_LABEL_MAX_LENGTH).trim();
    }
    if (!label) {
      label = nextCustomPresetLabel(usedLabels);
    }
    return {
      id: value.id,
      label,
      palette: sanitizeCustomPalette(value.palette),
    };
  }

  function sanitizeCustomPresets(value) {
    if (!Array.isArray(value)) {
      return [];
    }
    const usedIds = new Set();
    const usedLabels = new Set();
    const out = [];
    for (const item of value) {
      if (out.length >= MAX_CUSTOM_PRESETS) {
        break;
      }
      const next = sanitizeCustomPreset(item, usedIds, usedLabels);
      if (!next) {
        continue;
      }
      usedIds.add(next.id);
      usedLabels.add(next.label);
      out.push(next);
    }
    return out;
  }

  function createCustomPreset(palette, existingPresets) {
    const presets = sanitizeCustomPresets(existingPresets);
    const usedLabels = new Set(presets.map((preset) => preset.label));
    const id = generateCustomPresetId();
    return {
      id,
      label: nextCustomPresetLabel(usedLabels),
      palette: sanitizeCustomPalette(palette),
    };
  }

  function resolveCustomPalette(settings) {
    if (!settings) {
      return { ...DEFAULT_CUSTOM_PALETTE };
    }
    if (isSavedCustomThemeId(settings.theme)) {
      const preset = findCustomPreset(settings.customPresets, settings.theme);
      if (preset) {
        return { ...preset.palette };
      }
    }
    return sanitizeCustomPalette(settings.customPalette);
  }

  function sanitizeTheme(value, presets) {
    if (THEME_ALIASES[value]) {
      value = THEME_ALIASES[value];
    }
    if (THEMES.includes(value)) {
      return value;
    }
    if (findCustomPreset(presets, value)) {
      return value;
    }
    return DEFAULTS.theme;
  }

  function sanitizeRadius(value) {
    if (RADIUS_ALIASES[value]) {
      value = RADIUS_ALIASES[value];
    }
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

  function rgbToHsl({ r, g, b }) {
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const l = (max + min) / 2;
    if (max === min) {
      return { h: 0, s: 0, l: l * 100 };
    }
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h;
    if (max === rn) {
      h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
    } else if (max === gn) {
      h = ((bn - rn) / d + 2) / 6;
    } else {
      h = ((rn - gn) / d + 4) / 6;
    }
    return { h: h * 360, s: s * 100, l: l * 100 };
  }

  /**
   * CSS filter that maps stock SoundCloud orange waveform bars to a color.
   * Gray unplayed bars have no hue and stay mostly unchanged.
   * @param {string} hex
   * @returns {string}
   */
  function waveformFilterFromColor(hex) {
    const rgb = parseHexColor(hex);
    if (!rgb) {
      return "none";
    }
    const hsl = rgbToHsl(rgb);
    if (hsl.s < 5) {
      return "none";
    }
    const hue = Math.round(hsl.h - STOCK_WAVEFORM_ORANGE_HSL.h);
    const sat =
      Math.round((hsl.s / STOCK_WAVEFORM_ORANGE_HSL.s) * 100) / 100;
    const bright =
      Math.round(
        (Math.max(1, hsl.l) / STOCK_WAVEFORM_ORANGE_HSL.l) * 100
      ) / 100;
    if (
      Math.abs(hue) < 6 &&
      Math.abs(sat - 1) < 0.08 &&
      Math.abs(bright - 1) < 0.15
    ) {
      return "none";
    }
    return `hue-rotate(${hue}deg) saturate(${sat}) brightness(${bright})`;
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
      "--scx-waveform-filter": waveformFilterFromColor(base.accent),
      "--scx-waveform-filter-text": waveformFilterFromColor(base.text),
    };
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
    const next = isCustomThemeId(theme) ? "custom" : sanitizeTheme(theme);

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

  function customThemeStyleHost(root) {
    const el = root || document.documentElement;
    if (!el) {
      return null;
    }
    const doc = el.ownerDocument || document;
    if (!doc) {
      return null;
    }
    let styleEl = doc.getElementById(CUSTOM_THEME_STYLE_ID);
    if (!styleEl) {
      styleEl = doc.createElement("style");
      styleEl.id = CUSTOM_THEME_STYLE_ID;
      const parent = doc.head || doc.documentElement;
      parent.appendChild(styleEl);
    }
    return styleEl;
  }

  function clearCustomThemeVariables(root) {
    const el = root || document.documentElement;
    const doc = el && (el.ownerDocument || document);
    const styleEl = doc && doc.getElementById(CUSTOM_THEME_STYLE_ID);
    if (styleEl) {
      styleEl.textContent = "";
    }
    if (el && el.style) {
      for (const name of SCX_DERIVED_VAR_NAMES) {
        el.style.removeProperty(name);
      }
    }
  }

  /**
   * Apply resolved custom palette variables on a document root.
   * Uses a dedicated style tag so SoundCloud cannot wipe vars from html[style].
   * @param {Element} root
   * @param {{ customPalette?: object, colorScheme?: string }} settings
   */
  function applyCustomThemeVariables(root, settings) {
    const el = root || document.documentElement;
    if (!el) {
      return;
    }
    const palette = derivePalette(resolveCustomPalette(settings));
    const lines = [];
    for (const name of SCX_DERIVED_VAR_NAMES) {
      if (palette[name] != null) {
        lines.push(`  ${name}: ${palette[name]};`);
      }
    }
    const styleEl = customThemeStyleHost(el);
    if (styleEl) {
      styleEl.textContent = `html.scx-theme-custom {\n${lines.join("\n")}\n}`;
    }
    if (el.style) {
      for (const name of SCX_DERIVED_VAR_NAMES) {
        el.style.removeProperty(name);
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
   * Apply hero background + waveform style classes on a document root.
   * @param {Element} root
   * @param {{ enabled?: boolean, heroBackgroundStyle?: string, heroWaveformStyle?: string }} settings
   */
  function applyDocumentHero(root, settings) {
    const el = root || document.documentElement;
    if (!el) {
      return;
    }
    // Drop pre-Hero-section class so SPA tabs don't keep the old toggle.
    el.classList.remove("scx-hero-backdrop");
    for (const id of HERO_BACKGROUND_STYLES) {
      if (id === "default") {
        continue;
      }
      el.classList.remove(heroBackgroundClass(id));
    }
    for (const id of HERO_WAVEFORM_STYLES) {
      if (id === "default") {
        continue;
      }
      el.classList.remove(heroWaveformClass(id));
    }
    for (const name of desiredHeroClasses(settings)) {
      el.classList.add(name);
    }
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
    for (const legacyId of Object.keys(RADIUS_ALIASES)) {
      root.classList.remove(radiusClass(legacyId));
    }
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

  function fontDoc(root) {
    const el = root || document.documentElement;
    if (!el) {
      return null;
    }
    return el.ownerDocument || document;
  }

  function fontStyleHost(root) {
    const el = root || document.documentElement;
    const doc = fontDoc(el);
    if (!doc) {
      return null;
    }
    let styleEl = doc.getElementById(FONT_STYLE_ID);
    if (!styleEl) {
      styleEl = doc.createElement("style");
      styleEl.id = FONT_STYLE_ID;
      const parent = doc.head || doc.documentElement;
      parent.appendChild(styleEl);
    }
    return styleEl;
  }

  function clearDocumentFont(root) {
    const el = root || document.documentElement;
    if (!el) {
      return;
    }
    el.classList.remove(FONT_CLASS);
    for (const id of FONT_IDS) {
      if (id === "default") {
        continue;
      }
      el.classList.remove(fontClass(id));
    }
    const doc = fontDoc(el);
    const styleEl = doc && doc.getElementById(FONT_STYLE_ID);
    if (styleEl) {
      styleEl.textContent = "";
    }
  }

  /**
   * Apply font override classes + CSS on root.
   * faceCss: inlined @font-face rules; without it, family override applies with system fallback.
   * Default / disabled clears the override so stock Inter/Lucida remains.
   * @param {Element} root
   * @param {{ enabled?: boolean, font?: string }} settings
   * @param {string} [faceCss]
   */
  function applyDocumentFont(root, settings, faceCss) {
    const el = root || document.documentElement;
    if (!el) {
      return;
    }
    const active = Boolean(settings && settings.enabled);
    const next = sanitizeFont(settings && settings.font);
    const entry = findFont(next);
    if (!active || !entry || !entry.family) {
      clearDocumentFont(el);
      return;
    }
    el.classList.add(FONT_CLASS);
    for (const id of FONT_IDS) {
      if (id === "default") {
        continue;
      }
      el.classList.toggle(fontClass(id), id === next);
    }
    const override = buildFontOverrideCss(entry);
    const styleEl = fontStyleHost(el);
    if (styleEl) {
      styleEl.textContent =
        typeof faceCss === "string" && faceCss
          ? `${faceCss}\n${override}`
          : override;
    }
  }

  /**
   * Fetch + cache Google Font faces, then apply on root.
   * @param {Element} root
   * @param {{ enabled?: boolean, font?: string }} settings
   * @param {{ preview?: boolean, getSettings?: () => object|null, onLoaded?: (settings: object) => void }} [options]
   *   preview: force enabled (popup chrome).
   *   getSettings: latest settings for async race checks.
   *   onLoaded: after inlined faces apply (e.g. repaint iframes).
   */
  function paintDocumentFont(root, settings, options) {
    const opts = options || {};
    const preview = Boolean(opts.preview);
    const paintSettings = preview
      ? { ...(settings || {}), enabled: true }
      : settings;
    const entry = findFont(sanitizeFont(settings && settings.font));
    const active = Boolean(paintSettings && paintSettings.enabled);
    if (!active || !entry || !entry.family) {
      applyDocumentFont(root, paintSettings);
      return;
    }
    const fontId = entry.id;
    const cached = fontFaceCache.get(fontId);
    applyDocumentFont(root, paintSettings, cached || undefined);
    if (cached) {
      return;
    }
    ensureFontFaceCss(entry).then((faceCss) => {
      if (!faceCss) {
        return;
      }
      const latest =
        typeof opts.getSettings === "function" ? opts.getSettings() : settings;
      if (!latest) {
        return;
      }
      if (!preview && !latest.enabled) {
        return;
      }
      if (sanitizeFont(latest.font) !== fontId) {
        return;
      }
      const nextPaint = preview ? { ...latest, enabled: true } : latest;
      applyDocumentFont(root, nextPaint, faceCss);
      if (typeof opts.onLoaded === "function") {
        opts.onLoaded(latest);
      }
    });
  }

  Object.assign(S, {
    themeClass,
    radiusClass,
    heroBackgroundClass,
    heroWaveformClass,
    THEME_ALIASES,
    HERO_COVER_CSS_VAR,
    sanitizeTheme,
    averageRgbFromCoverPixels,
    sanitizeHeroBackgroundStyle,
    sanitizeHeroWaveformStyle,
    heroStylesForTheme,
    desiredHeroClasses,
    sanitizeCustomPresets,
    findCatalogTheme,
    findCustomPreset,
    isCustomThemeId,
    isSavedCustomThemeId,
    createCustomPreset,
    resolveCustomPalette,
    sanitizeRadius,
    sanitizeFont,
    normalizeHexColor,
    customPalettesEqual,
    isCompleteCustomPaletteInput,
    sanitizeCustomPalette,
    derivePalette,
    applyDocumentTheme,
    applyDocumentFeatureClasses,
    featureClassesNeedPaint,
    applyCustomThemeVariables,
    clearCustomThemeVariables,
    readPresetSourcePalette,
    applyDocumentHero,
    applyDocumentRadius,
    applyDocumentFont,
    paintDocumentFont,
  });
})(typeof globalThis !== "undefined" ? globalThis : self);
