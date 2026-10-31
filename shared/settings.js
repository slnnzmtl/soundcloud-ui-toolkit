/**
 * Shared settings storage (chrome.storage + page cache) for popup + content.
 * Depends on catalogs + apply (sanitize / merge helpers on ScxSettings).
 */
(function (global) {
  const S = global.ScxSettings;
  if (!S) {
    throw new Error("ScxSettings catalogs must load before storage");
  }

  const {
    STORAGE_KEY,
    BOOLEAN_SETTING_KEYS,
    DEFAULT_CUSTOM_PALETTE,
    DEFAULTS,
    sanitizeHeroBackgroundStyle,
    sanitizeHeroWaveformStyle,
    sanitizeCustomPresets,
    sanitizeTheme,
    sanitizeRadius,
    sanitizeFont,
    sanitizeCustomPalette,
    customPalettesEqual,
  } = S;

  const PAGE_CACHE_KEY = "scxSettingsCache";

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

  Object.assign(S, {
    mergeWithDefaults,
    persistableSettings,
    getSettings,
    setSettings,
    readPageCache,
    writePageCache,
    onSettingsChanged,
  });
})(typeof globalThis !== "undefined" ? globalThis : self);
