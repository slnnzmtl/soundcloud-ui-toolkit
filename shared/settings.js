/**
 * Shared settings defaults and helpers for popup + content scripts.
 * No build step — loaded as a plain script before consumers.
 */
(function (global) {
  const STORAGE_KEY = "scxSettings";
  const ENABLED_CLASS = "scx-enabled";
  const FULL_WIDTH_CLASS = "scx-full-width";
  const ENLARGED_QUEUE_CLASS = "scx-enlarged-queue";
  const THEME_CLASS = "scx-theme";
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
          id: "terminal",
          label: "Terminal",
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
          id: "teal",
          label: "Teal Hue",
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
          id: "liquid",
          label: "Liquid Glass",
          swatches: Object.freeze(["#090b0f", "#13161b", "#3a8cff"]),
        },
      ]),
    },
    {
      id: "homage",
      label: "Homage",
      themes: Object.freeze([
        {
          id: "spotify",
          label: "Spotify",
          swatches: Object.freeze(["#121212", "#181818", "#1db954"]),
        },
        {
          id: "mimi",
          label: "Mimi",
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
  });

  function themeClass(id) {
    return `${THEME_CLASS}-${id}`;
  }

  function sanitizeTheme(value) {
    if (value === "lifeinvader") {
      value = "blood";
    }
    return THEMES.includes(value) ? value : DEFAULTS.theme;
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
    return merged;
  }

  function getSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(STORAGE_KEY, (result) => {
        resolve(mergeWithDefaults(result[STORAGE_KEY]));
      });
    });
  }

  function setSettings(partial) {
    return getSettings().then((current) => {
      const next = { ...current, ...partial };
      next.theme = sanitizeTheme(next.theme);
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

  global.ScxSettings = {
    STORAGE_KEY,
    ENABLED_CLASS,
    FULL_WIDTH_CLASS,
    ENLARGED_QUEUE_CLASS,
    THEME_CLASS,
    THEME_GROUPS,
    THEMES,
    DEFAULTS,
    themeClass,
    sanitizeTheme,
    mergeWithDefaults,
    getSettings,
    setSettings,
    onSettingsChanged,
  };
})(typeof globalThis !== "undefined" ? globalThis : self);
