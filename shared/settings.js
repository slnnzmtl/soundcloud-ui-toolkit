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

  const THEMES = Object.freeze(
    THEME_GROUPS.flatMap((group) => group.themes.map((theme) => theme.id))
  );

  const DEFAULTS = Object.freeze({
    enabled: true,
    fullWidth: true,
    enlargedQueue: true,
    theme: "default",
    radius: "md",
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
    return merged;
  }

  function getSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(STORAGE_KEY, (result) => {
        resolve(mergeWithDefaults(result[STORAGE_KEY]));
      });
    });
  }

  function readPageCache() {
    try {
      const raw = global.localStorage.getItem(PAGE_CACHE_KEY);
      if (!raw) {
        return null;
      }
      return mergeWithDefaults(JSON.parse(raw));
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

  function setSettings(partial) {
    return getSettings().then((current) => {
      const next = { ...current, ...partial };
      next.theme = sanitizeTheme(next.theme);
      next.radius = sanitizeRadius(next.radius);
      return new Promise((resolve) => {
        chrome.storage.sync.set({ [STORAGE_KEY]: next }, () => resolve(next));
      });
    });
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
   * @param {{ includeDefault?: boolean, nativeScheme?: string }} [options]
   *   includeDefault: popup chrome always uses scx-theme-default / scx-theme-{id}.
   *   SoundCloud omits classes when theme is default (stock colors).
   *   nativeScheme: popup-only; with includeDefault + theme default, "dark"
   *   adds scx-native-dark so chrome matches SoundCloud body.theme-dark.
   */
  function applyDocumentTheme(theme, options) {
    const root = document.documentElement;
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

  /**
   * Apply radius classes on a document root.
   * @param {string} radius
   * @param {{ active?: boolean }} [options]
   *   active: when false (SoundCloud disabled), clear radius classes.
   *   Popup always passes active true so chrome previews the setting.
   *   "default" clears all scx-radius-* (stock SoundCloud corners).
   */
  function applyDocumentRadius(radius, options) {
    const root = document.documentElement;
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
    RADII,
    DEFAULTS,
    themeClass,
    radiusClass,
    THEME_ALIASES,
    sanitizeTheme,
    sanitizeRadius,
    mergeWithDefaults,
    getSettings,
    setSettings,
    onSettingsChanged,
    applyDocumentTheme,
    applyDocumentRadius,
    readPageCache,
    writePageCache,
  };
})(typeof globalThis !== "undefined" ? globalThis : self);
