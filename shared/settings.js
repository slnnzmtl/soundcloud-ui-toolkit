/**
 * Shared settings defaults and helpers for popup + content scripts.
 * No build step — loaded as a plain script before consumers.
 */
(function (global) {
  const STORAGE_KEY = "scxSettings";
  const PAGE_CACHE_KEY = "scxSettingsCache";
  const CUSTOM_THEME_STYLE_ID = "scx-custom-theme-vars";
  const FONT_STYLE_ID = "scx-font";
  /** Stock SoundCloud played-waveform orange (#ff5500 / #f50). */
  const STOCK_WAVEFORM_ORANGE_HSL = Object.freeze({ h: 20, s: 100, l: 50 });
  const ENABLED_CLASS = "scx-enabled";
  const FULL_WIDTH_CLASS = "scx-full-width";
  const ENLARGED_QUEUE_CLASS = "scx-enlarged-queue";
  const HIDE_ARTIST_TOOLS_CLASS = "scx-hide-artist-tools";
  const HERO_BG_CLASS = "scx-hero-bg";
  const HERO_WAVEFORM_CLASS = "scx-hero-waveform";
  const THEME_CLASS = "scx-theme";
  const RADIUS_CLASS = "scx-radius";
  const FONT_CLASS = "scx-font";
  const NATIVE_DARK_CLASS = "scx-native-dark";
  const NATIVE_SCHEME_KEY = "scxNativeScheme";
  const RADII = Object.freeze(["default", "none", "sm", "md", "lg", "xl"]);
  const FONT_FALLBACK =
    '"Lucida Sans Unicode","Lucida Sans","Garuda","Verdana","Tahoma",sans-serif';
  /**
   * Font catalog. axes: Google CSS2 axis list; null = 400/600/700; "" = default style only.
   * category: popup optgroup (see FONT_CATEGORIES).
   */
  const FONT_CATEGORIES = Object.freeze([
    Object.freeze({ id: "default", label: "Default" }),
    Object.freeze({ id: "sans", label: "Sans" }),
    Object.freeze({ id: "mono", label: "Mono" }),
    Object.freeze({ id: "pixel", label: "Pixel" }),
    Object.freeze({ id: "display", label: "Display" }),
    Object.freeze({ id: "script", label: "Script" }),
  ]);
  const FONTS = Object.freeze([
    Object.freeze({
      id: "default",
      label: "Default",
      family: null,
      category: "default",
    }),
    Object.freeze({
      id: "comfortaa",
      label: "Comfortaa",
      family: "Comfortaa",
      category: "sans",
    }),
    Object.freeze({
      id: "inter",
      label: "Inter",
      family: "Inter",
      category: "sans",
    }),
    Object.freeze({
      id: "lato",
      label: "Lato",
      family: "Lato",
      axes: "wght@400;700",
      category: "sans",
    }),
    Object.freeze({
      id: "montserrat",
      label: "Montserrat",
      family: "Montserrat",
      category: "sans",
    }),
    Object.freeze({
      id: "open-sans",
      label: "Open Sans",
      family: "Open Sans",
      category: "sans",
    }),
    Object.freeze({
      id: "poppins",
      label: "Poppins",
      family: "Poppins",
      category: "sans",
    }),
    Object.freeze({
      id: "roboto",
      label: "Roboto",
      family: "Roboto",
      category: "sans",
    }),
    Object.freeze({
      id: "anonymous-pro",
      label: "Anonymous Pro",
      family: "Anonymous Pro",
      axes: "wght@400;700",
      category: "mono",
    }),
    Object.freeze({
      id: "cousine",
      label: "Cousine",
      family: "Cousine",
      axes: "wght@400;700",
      category: "mono",
    }),
    Object.freeze({
      id: "fira-code",
      label: "Fira Code",
      family: "Fira Code",
      category: "mono",
    }),
    Object.freeze({
      id: "fira-mono",
      label: "Fira Mono",
      family: "Fira Mono",
      axes: "wght@400;700",
      category: "mono",
    }),
    Object.freeze({
      id: "ibm-plex-mono",
      label: "IBM Plex Mono",
      family: "IBM Plex Mono",
      category: "mono",
    }),
    Object.freeze({
      id: "jetbrains-mono",
      label: "JetBrains Mono",
      family: "JetBrains Mono",
      category: "mono",
    }),
    Object.freeze({
      id: "noto-sans-mono",
      label: "Noto Sans Mono",
      family: "Noto Sans Mono",
      category: "mono",
    }),
    Object.freeze({
      id: "overpass-mono",
      label: "Overpass Mono",
      family: "Overpass Mono",
      category: "mono",
    }),
    Object.freeze({
      id: "pt-mono",
      label: "PT Mono",
      family: "PT Mono",
      axes: "",
      category: "mono",
    }),
    Object.freeze({
      id: "roboto-mono",
      label: "Roboto Mono",
      family: "Roboto Mono",
      category: "mono",
    }),
    Object.freeze({
      id: "source-code-pro",
      label: "Source Code Pro",
      family: "Source Code Pro",
      category: "mono",
    }),
    Object.freeze({
      id: "ubuntu-mono",
      label: "Ubuntu Mono",
      family: "Ubuntu Mono",
      axes: "wght@400;700",
      category: "mono",
    }),
    Object.freeze({
      id: "handjet",
      label: "Handjet",
      family: "Handjet",
      category: "pixel",
    }),
    Object.freeze({
      id: "jersey-10",
      label: "Jersey 10",
      family: "Jersey 10",
      axes: "",
      category: "pixel",
    }),
    Object.freeze({
      id: "pixelify",
      label: "Pixelify",
      family: "Pixelify Sans",
      category: "pixel",
    }),
    Object.freeze({
      id: "tiny5",
      label: "Tiny5",
      family: "Tiny5",
      axes: "",
      category: "pixel",
    }),
    Object.freeze({
      id: "vt323",
      label: "VT323",
      family: "VT323",
      axes: "",
      category: "pixel",
    }),
    Object.freeze({
      id: "dela-gothic-one",
      label: "Dela Gothic One",
      family: "Dela Gothic One",
      axes: "",
      category: "display",
    }),
    Object.freeze({
      id: "forum",
      label: "Forum",
      family: "Forum",
      axes: "",
      category: "display",
    }),
    Object.freeze({
      id: "oswald",
      label: "Oswald",
      family: "Oswald",
      category: "display",
    }),
    Object.freeze({
      id: "playfair-display",
      label: "Playfair Display",
      family: "Playfair Display",
      category: "display",
    }),
    Object.freeze({
      id: "poiret-one",
      label: "Poiret One",
      family: "Poiret One",
      axes: "",
      category: "display",
    }),
    Object.freeze({
      id: "prata",
      label: "Prata",
      family: "Prata",
      axes: "",
      category: "display",
    }),
    Object.freeze({
      id: "russo-one",
      label: "Russo One",
      family: "Russo One",
      axes: "",
      category: "display",
    }),
    Object.freeze({
      id: "tektur",
      label: "Tektur",
      family: "Tektur",
      category: "display",
    }),
    Object.freeze({
      id: "unbounded",
      label: "Unbounded",
      family: "Unbounded",
      category: "display",
    }),
    Object.freeze({
      id: "yanone-kaffeesatz",
      label: "Yanone Kaffeesatz",
      family: "Yanone Kaffeesatz",
      category: "display",
    }),
    Object.freeze({
      id: "yeseva-one",
      label: "Yeseva One",
      family: "Yeseva One",
      axes: "",
      category: "display",
    }),
    Object.freeze({
      id: "caveat",
      label: "Caveat",
      family: "Caveat",
      category: "script",
    }),
    Object.freeze({
      id: "lobster",
      label: "Lobster",
      family: "Lobster",
      axes: "",
      category: "script",
    }),
    Object.freeze({
      id: "pacifico",
      label: "Pacifico",
      family: "Pacifico",
      axes: "",
      category: "script",
    }),
  ]);
  const FONT_IDS = Object.freeze(FONTS.map((font) => font.id));
  const HERO_BACKGROUND_STYLES = Object.freeze([
    "default",
    "accent",
    "text",
    "transparent",
  ]);
  const HERO_WAVEFORM_STYLES = Object.freeze(["default", "accent", "text"]);
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
        {
          id: "azure",
          label: "Azure",
          swatches: Object.freeze(["#061018", "#0b1a28", "#3d8bfd"]),
        },
        {
          id: "flamingo",
          label: "Flamingo",
          swatches: Object.freeze(["#140810", "#1f0e18", "#ff4fa3"]),
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
        {
          id: "paper",
          label: "Paper",
          swatches: Object.freeze(["#f4f1ea", "#ffffff", "#c2410c"]),
        },
        {
          id: "noir",
          label: "Noir",
          swatches: Object.freeze(["#0a0a0a", "#141414", "#fafafa"]),
        },
        {
          id: "sand",
          label: "Sand",
          swatches: Object.freeze(["#1c1917", "#292524", "#e7b56c"]),
        },
        {
          id: "carbon",
          label: "Carbon",
          swatches: Object.freeze(["#121417", "#1a1d22", "#8ab4ff"]),
        },
        {
          id: "espresso",
          label: "Espresso",
          swatches: Object.freeze(["#1a1412", "#241c18", "#d4a574"]),
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
        {
          id: "blurple",
          label: "Blurple",
          swatches: Object.freeze(["#1e1f22", "#2b2d31", "#5865f2"]),
        },
        {
          id: "vinyl",
          label: "Vinyl",
          swatches: Object.freeze(["#0f0f0f", "#1a1a1a", "#ff0033"]),
        },
        {
          id: "harbor",
          label: "Harbor",
          swatches: Object.freeze(["#0d1110", "#161c1a", "#1da09a"]),
        },
      ]),
    },
  ]);

  const PRESET_THEMES = Object.freeze(
    THEME_GROUPS.flatMap((group) => group.themes.map((theme) => theme.id))
  );

  const THEMES = Object.freeze([...PRESET_THEMES, "custom"]);
  const MAX_CUSTOM_PRESETS = 6;
  const CUSTOM_PRESET_LABEL_MAX_LENGTH = 32;
  const CUSTOM_PRESET_ID_RE = /^c_[a-z0-9]+$/;

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
    "--scx-waveform-filter",
    "--scx-waveform-filter-text",
  ]);

  const DEFAULTS = Object.freeze({
    enabled: true,
    fullWidth: true,
    enlargedQueue: true,
    hideArtistTools: false,
    heroBackgroundStyle: "accent",
    heroWaveformStyle: "accent",
    theme: "default",
    radius: "md",
    font: "default",
    customPalette: DEFAULT_CUSTOM_PALETTE,
    customPresets: Object.freeze([]),
  });

  /** Setting key → layout class. Boolean coerce/persist/dirty-check and content toggles share this. */
  const FEATURE_CLASS_BY_SETTING = Object.freeze({
    enabled: ENABLED_CLASS,
    fullWidth: FULL_WIDTH_CLASS,
    enlargedQueue: ENLARGED_QUEUE_CLASS,
    hideArtistTools: HIDE_ARTIST_TOOLS_CLASS,
  });

  const BOOLEAN_SETTING_KEYS = Object.freeze(
    Object.keys(FEATURE_CLASS_BY_SETTING)
  );

  function coerceBooleanSettings(target) {
    for (const key of BOOLEAN_SETTING_KEYS) {
      target[key] = Boolean(target[key]);
    }
    return target;
  }

  function pickBooleanSettings(settings) {
    const out = {};
    for (const key of BOOLEAN_SETTING_KEYS) {
      out[key] = settings[key];
    }
    return out;
  }

  function booleanSettingsChanged(raw, merged) {
    return BOOLEAN_SETTING_KEYS.some((key) => raw[key] !== merged[key]);
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
  });

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

  function customPresetsEqual(a, b) {
    if (a === b) {
      return true;
    }
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
      return false;
    }
    return a.every((preset, index) => {
      const other = b[index];
      return (
        preset &&
        other &&
        preset.id === other.id &&
        preset.label === other.label &&
        customPalettesEqual(preset.palette, other.palette)
      );
    });
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

  function mergeWithDefaults(stored) {
    const raw = stored && typeof stored === "object" ? stored : {};
    const merged = coerceBooleanSettings({
      ...DEFAULTS,
      ...raw,
    });
    delete merged.heroBackdrop;
    if (
      raw.heroBackgroundStyle == null &&
      Object.prototype.hasOwnProperty.call(raw, "heroBackdrop")
    ) {
      merged.heroBackgroundStyle = raw.heroBackdrop ? "accent" : "default";
    }
    merged.heroBackgroundStyle = sanitizeHeroBackgroundStyle(
      merged.heroBackgroundStyle
    );
    merged.heroWaveformStyle = sanitizeHeroWaveformStyle(
      merged.heroWaveformStyle
    );
    merged.customPresets = sanitizeCustomPresets(raw.customPresets);
    merged.theme = sanitizeTheme(merged.theme, merged.customPresets);
    merged.radius = sanitizeRadius(merged.radius);
    merged.font = sanitizeFont(merged.font);
    if (raw.customPalette && typeof raw.customPalette === "object") {
      merged.customPalette = sanitizeCustomPalette(raw.customPalette);
    } else if (merged.theme === "custom") {
      merged.customPalette = sanitizeCustomPalette(raw.customPalette);
    } else {
      merged.customPalette = { ...DEFAULT_CUSTOM_PALETTE };
    }
    return merged;
  }

  function persistableSettings(settings) {
    const out = {
      ...pickBooleanSettings(settings),
      heroBackgroundStyle: sanitizeHeroBackgroundStyle(
        settings.heroBackgroundStyle
      ),
      heroWaveformStyle: sanitizeHeroWaveformStyle(settings.heroWaveformStyle),
      theme: settings.theme,
      radius: settings.radius,
      font: sanitizeFont(settings.font),
    };
    const presets = sanitizeCustomPresets(settings.customPresets);
    if (presets.length) {
      out.customPresets = presets;
    }
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
      booleanSettingsChanged(raw, merged) ||
      Object.prototype.hasOwnProperty.call(raw, "heroBackdrop") ||
      raw.heroBackgroundStyle !== merged.heroBackgroundStyle ||
      raw.heroWaveformStyle !== merged.heroWaveformStyle ||
      raw.theme !== merged.theme ||
      raw.radius !== merged.radius ||
      raw.font !== merged.font ||
      paletteChanged ||
      !customPresetsEqual(raw.customPresets || [], merged.customPresets)
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
      const next = coerceBooleanSettings({ ...current, ...partial });
      delete next.heroBackdrop;
      next.heroBackgroundStyle = sanitizeHeroBackgroundStyle(
        next.heroBackgroundStyle
      );
      next.heroWaveformStyle = sanitizeHeroWaveformStyle(
        next.heroWaveformStyle
      );
      next.customPresets = sanitizeCustomPresets(next.customPresets);
      next.theme = sanitizeTheme(next.theme, next.customPresets);
      next.radius = sanitizeRadius(next.radius);
      next.font = sanitizeFont(next.font);
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

  global.ScxSettings = {
    STORAGE_KEY,
    CUSTOM_THEME_STYLE_ID,
    FONT_STYLE_ID,
    NATIVE_SCHEME_KEY,
    ENABLED_CLASS,
    FULL_WIDTH_CLASS,
    ENLARGED_QUEUE_CLASS,
    HIDE_ARTIST_TOOLS_CLASS,
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
    FONT_CATEGORIES,
    CUSTOM_PALETTE_KEYS,
    DEFAULT_CUSTOM_PALETTE,
    MAX_CUSTOM_PRESETS,
    CUSTOM_PRESET_LABEL_MAX_LENGTH,
    RADII,
    DEFAULTS,
    themeClass,
    radiusClass,
    heroBackgroundClass,
    heroWaveformClass,
    THEME_ALIASES,
    sanitizeTheme,
    sanitizeHeroBackgroundStyle,
    sanitizeHeroWaveformStyle,
    desiredHeroClasses,
    sanitizeCustomPresets,
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
    applyDocumentHero,
    applyDocumentRadius,
    applyDocumentFont,
    paintDocumentFont,
  };
})(typeof globalThis !== "undefined" ? globalThis : self);
