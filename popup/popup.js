(function () {
  const {
    THEME_GROUPS,
    RADII,
    CUSTOM_PALETTE_KEYS,
    DEFAULT_CUSTOM_PALETTE,
    NATIVE_SCHEME_KEY,
    getSettings,
    setSettings,
    sanitizeTheme,
    sanitizeRadius,
    normalizeHexColor,
    contrastRatio,
    customPalettesEqual,
    isCompleteCustomPaletteInput,
    sanitizeCustomPalette,
    applyDocumentTheme,
    applyDocumentRadius,
    applyCustomThemeVariables,
    clearCustomThemeVariables,
    readPresetSourcePalette,
    onSettingsChanged,
  } = ScxSettings;

  const switches = [
    { id: "full-width", key: "fullWidth" },
    { id: "enlarged-queue", key: "enlargedQueue" },
  ];

  const COLOR_FIELD_LABELS = {
    background: "Background",
    surface: "Surface",
    text: "Text",
    accent: "Accent",
  };

  const body = document.getElementById("control-center-body");
  const enabledInput = document.getElementById("extension-enabled");
  const themeList = document.getElementById("theme-list");
  const customPanel = document.getElementById("custom-theme-panel");
  const customPreview = document.getElementById("custom-theme-preview");
  const customContrast = document.getElementById("custom-theme-contrast");
  const customReset = document.getElementById("custom-reset");
  const customFieldsMount = document.getElementById("custom-theme-fields");

  const CUSTOM_PALETTE_PERSIST_MS = 220;
  const LIVE_SETTINGS_MESSAGE = "scx-settings-live";

  let nativeScheme = "light";
  let currentSettings = null;
  let lastPresetTheme = "midnight";
  let customPaletteDraft = null;
  let customPalettePersistTimer = null;
  let customPaletteSaveInFlight = false;

  function isCustomPaletteSyncStale(settings) {
    if (!customPaletteDraft) {
      return false;
    }
    if (customPalettePersistTimer || customPaletteSaveInFlight) {
      return !customPalettesEqual(settings.customPalette, customPaletteDraft);
    }
    return false;
  }

  function applyPopupChrome(settings) {
    const next = settings || currentSettings;
    if (!next) {
      return;
    }
    currentSettings = next;
    const theme = next.theme === "custom" ? "custom" : sanitizeTheme(next.theme);
    applyDocumentTheme(theme, {
      includeDefault: true,
      nativeScheme,
    });
    if (theme === "custom") {
      applyCustomThemeVariables(document.documentElement, {
        customPalette: next.customPalette,
      });
    } else {
      clearCustomThemeVariables(document.documentElement);
    }
    applyDocumentRadius(next.radius, { active: true });
    updateCustomPreview(next.customPalette);
  }

  function setBodyActive(active) {
    body.classList.toggle("control-center__body--disabled", !active);
    body.inert = !active;
    body.querySelectorAll("input, button, select").forEach((el) => {
      el.disabled = !active;
    });
  }

  function syncSwitch(input, enabled) {
    input.checked = enabled;
    input.setAttribute("aria-checked", enabled ? "true" : "false");
  }

  function isCustomMode(settings) {
    return settings && settings.theme === "custom";
  }

  function resolveActivePresetTheme() {
    const checked = document.querySelector('input[name="theme"]:checked');
    if (checked) {
      lastPresetTheme = sanitizeTheme(checked.value);
    }
    return lastPresetTheme;
  }

  function paletteFromLastPreset() {
    return readPresetSourcePalette(
      resolveActivePresetTheme(),
      document.documentElement,
      { nativeScheme }
    );
  }

  function clearCustomPaletteTimer() {
    if (customPalettePersistTimer) {
      clearTimeout(customPalettePersistTimer);
      customPalettePersistTimer = null;
    }
  }

  function applyCustomPaletteLocal(palette) {
    customPaletteDraft = palette;
    currentSettings = {
      ...(currentSettings || {}),
      theme: "custom",
      customPalette: palette,
    };
    applyPopupChrome(currentSettings);
    broadcastLiveSettings();
  }

  function persistCustomPalette(palette) {
    customPaletteSaveInFlight = true;
    return setSettings({
      theme: "custom",
      customPalette: palette,
    })
      .then((settings) => {
        currentSettings = settings;
        if (customPalettesEqual(palette, settings.customPalette)) {
          customPaletteDraft = null;
        }
        applyPopupChrome(settings);
        return settings;
      })
      .finally(() => {
        customPaletteSaveInFlight = false;
      });
  }

  /**
   * @param {object} rawPalette
   * @param {{ immediate?: boolean, syncUi?: boolean }} [options]
   */
  function commitCustomPalette(rawPalette, options) {
    if (!isCompleteCustomPaletteInput(rawPalette)) {
      if (currentSettings && currentSettings.customPalette) {
        syncCustomFields(currentSettings.customPalette);
      }
      return Promise.resolve();
    }
    const palette = sanitizeCustomPalette(rawPalette);
    applyCustomPaletteLocal(palette);
    if (options && options.syncUi) {
      syncThemeModeUi(currentSettings);
      syncCustomFields(palette);
    }
    if (options && options.immediate) {
      clearCustomPaletteTimer();
      return persistCustomPalette(palette);
    }
    clearCustomPaletteTimer();
    customPalettePersistTimer = setTimeout(() => {
      customPalettePersistTimer = null;
      persistCustomPalette(customPaletteDraft);
    }, CUSTOM_PALETTE_PERSIST_MS);
    return Promise.resolve();
  }

  function activateCustomFromPreset() {
    return commitCustomPalette(paletteFromLastPreset(), {
      immediate: true,
      syncUi: true,
    }).then(syncAllControls);
  }

  function syncThemeModeUi(settings) {
    const custom = isCustomMode(settings);
    document.querySelectorAll('input[name="theme-mode"]').forEach((input) => {
      input.checked = custom
        ? input.value === "custom"
        : input.value === "presets";
    });
    themeList.hidden = custom;
    customPanel.hidden = !custom;
    if (!custom && settings.theme !== "custom") {
      lastPresetTheme = sanitizeTheme(settings.theme);
    }
  }

  function updateContrastStatus(palette) {
    const textRatio = contrastRatio(palette.text, palette.background);
    const accentRatio = contrastRatio(palette.accent, palette.background);
    const parts = [];
    if (textRatio != null) {
      parts.push(
        `Text contrast ${textRatio.toFixed(2)}:1${
          textRatio >= 4.5 ? " (OK)" : " (low)"
        }`
      );
    }
    if (accentRatio != null) {
      parts.push(
        `Accent contrast ${accentRatio.toFixed(2)}:1${
          accentRatio >= 3 ? " (OK)" : " (low)"
        }`
      );
    }
    customContrast.textContent = parts.join(" · ");
  }

  function updateCustomPreview(palette) {
    if (!customPreview || !palette) {
      return;
    }
    customPreview.style.setProperty("--preview-bg", palette.background);
    customPreview.style.setProperty("--preview-surface", palette.surface);
    customPreview.style.setProperty("--preview-text", palette.text);
    customPreview.style.setProperty("--preview-accent", palette.accent);
    updateContrastStatus(palette);
  }

  function readCustomFieldsFromDom() {
    const palette = {};
    for (const key of CUSTOM_PALETTE_KEYS) {
      const colorInput = document.getElementById(`custom-color-${key}`);
      const hexInput = document.getElementById(`custom-hex-${key}`);
      palette[key] =
        normalizeHexColor(hexInput && hexInput.value) ||
        normalizeHexColor(colorInput && colorInput.value);
    }
    return palette;
  }

  function syncCustomFields(palette) {
    for (const key of CUSTOM_PALETTE_KEYS) {
      const colorInput = document.getElementById(`custom-color-${key}`);
      const hexInput = document.getElementById(`custom-hex-${key}`);
      const value = palette[key];
      if (colorInput && value) {
        colorInput.value = value;
      }
      if (hexInput) {
        hexInput.value = value || "";
        hexInput.setAttribute("aria-invalid", value ? "false" : "true");
      }
    }
    updateCustomPreview(palette);
  }

  function broadcastLiveSettings() {
    if (!currentSettings || typeof chrome === "undefined" || !chrome.tabs) {
      return;
    }
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs && tabs[0];
      if (!tab || !tab.id || !String(tab.url || "").includes("soundcloud.com")) {
        return;
      }
      chrome.tabs
        .sendMessage(tab.id, {
          type: LIVE_SETTINGS_MESSAGE,
          settings: { ...currentSettings },
        })
        .catch(() => {});
    });
  }

  function flushCustomPalettePersist() {
    clearCustomPaletteTimer();
    if (!customPaletteDraft) {
      return Promise.resolve(currentSettings);
    }
    return persistCustomPalette(customPaletteDraft);
  }

  function createColorField(key) {
    const row = document.createElement("div");
    row.className = "custom-theme__row";

    const label = document.createElement("label");
    label.className = "custom-theme__row-label";
    label.htmlFor = `custom-color-${key}`;
    label.textContent = COLOR_FIELD_LABELS[key];

    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.id = `custom-color-${key}`;
    colorInput.className = "custom-theme__color";
    colorInput.value = DEFAULT_CUSTOM_PALETTE[key];

    const hexInput = document.createElement("input");
    hexInput.type = "text";
    hexInput.id = `custom-hex-${key}`;
    hexInput.className = "custom-theme__hex";
    hexInput.inputMode = "text";
    hexInput.autocomplete = "off";
    hexInput.spellcheck = false;
    hexInput.setAttribute("aria-label", `${COLOR_FIELD_LABELS[key]} hex`);
    hexInput.placeholder = "#rrggbb";

    colorInput.addEventListener("input", () => {
      hexInput.value = colorInput.value;
      commitCustomPalette(readCustomFieldsFromDom());
    });

    hexInput.addEventListener("change", () => {
      const normalized = normalizeHexColor(hexInput.value);
      if (!normalized) {
        hexInput.setAttribute("aria-invalid", "true");
        return;
      }
      colorInput.value = normalized;
      hexInput.value = normalized;
      commitCustomPalette(readCustomFieldsFromDom());
    });

    row.append(label, colorInput, hexInput);
    return row;
  }

  function renderCustomFields() {
    const fragment = document.createDocumentFragment();
    CUSTOM_PALETTE_KEYS.forEach((key) => {
      fragment.appendChild(createColorField(key));
    });
    customFieldsMount.replaceChildren(fragment);
  }

  function createSwatch(color) {
    const swatch = document.createElement("span");
    swatch.className = "theme-row__swatch";
    swatch.style.background = color;
    return swatch;
  }

  function createThemeRow(theme) {
    const inputId = `theme-${theme.id}`;

    const label = document.createElement("label");
    label.className = "theme-row";
    label.htmlFor = inputId;

    const swatches = document.createElement("span");
    swatches.className = "theme-row__swatches";
    swatches.setAttribute("aria-hidden", "true");
    theme.swatches.forEach((color) => {
      swatches.appendChild(createSwatch(color));
    });

    const name = document.createElement("span");
    name.className = "theme-row__label";
    name.textContent = theme.label;

    const input = document.createElement("input");
    input.id = inputId;
    input.className = "theme-row__input";
    input.type = "radio";
    input.name = "theme";
    input.value = theme.id;

    const radio = document.createElement("span");
    radio.className = "theme-row__radio";
    radio.setAttribute("aria-hidden", "true");

    label.append(swatches, name, input, radio);
    return label;
  }

  function createRadiusOption(id) {
    const inputId = `radius-${id}`;

    const label = document.createElement("label");
    label.className = "radius-option";
    label.htmlFor = inputId;

    const input = document.createElement("input");
    input.id = inputId;
    input.className = "radius-option__input";
    input.type = "radio";
    input.name = "radius";
    input.value = id;

    const chip = document.createElement("span");
    chip.className = "radius-option__chip";
    chip.textContent = id;

    label.append(input, chip);
    return label;
  }

  function renderThemeList() {
    const mount = document.getElementById("theme-list");
    const fragment = document.createDocumentFragment();

    THEME_GROUPS.forEach((group) => {
      const section = document.createElement("div");
      section.className = `theme-group theme-group--${group.id}`;

      const title = document.createElement("h3");
      title.className = "theme-group__title";
      title.textContent = group.label;

      const rows = document.createElement("div");
      rows.className = "theme-group__rows";
      group.themes.forEach((theme) => {
        rows.appendChild(createThemeRow(theme));
      });

      section.append(title, rows);
      fragment.appendChild(section);
    });

    mount.replaceChildren(fragment);
  }

  function renderRadiusList() {
    const mount = document.getElementById("radius-list");
    const fragment = document.createDocumentFragment();
    RADII.forEach((id) => {
      fragment.appendChild(createRadiusOption(id));
    });
    mount.replaceChildren(fragment);
  }

  function syncAllControls(settings) {
    const active = Boolean(settings.enabled);
    syncSwitch(enabledInput, active);
    setBodyActive(active);

    switches.forEach(({ id, key }) => {
      syncSwitch(document.getElementById(id), Boolean(settings[key]));
    });

    const theme = sanitizeTheme(settings.theme);
    document.querySelectorAll('input[name="theme"]').forEach((input) => {
      input.checked = !isCustomMode(settings) && input.value === theme;
    });

    const radius = sanitizeRadius(settings.radius);
    document.querySelectorAll('input[name="radius"]').forEach((input) => {
      input.checked = input.value === radius;
    });

    syncThemeModeUi(settings);
    syncCustomFields(settings.customPalette);
    applyPopupChrome(settings);
  }

  function bindControls() {
    enabledInput.addEventListener("change", () => {
      const active = enabledInput.checked;
      syncSwitch(enabledInput, active);
      setBodyActive(active);
      setSettings({ enabled: active }).then(applyPopupChrome);
    });

    switches.forEach(({ id, key }) => {
      const input = document.getElementById(id);
      input.addEventListener("change", () => {
        const enabled = input.checked;
        syncSwitch(input, enabled);
        setSettings({ [key]: enabled });
      });
    });

    document.querySelectorAll('input[name="theme-mode"]').forEach((input) => {
      input.addEventListener("change", () => {
        if (!input.checked) {
          return;
        }
        if (input.value === "custom") {
          activateCustomFromPreset();
          return;
        }
        syncThemeModeUi({
          ...(currentSettings || {}),
          theme: lastPresetTheme,
        });
        setSettings({ theme: lastPresetTheme }).then(syncAllControls);
      });
    });

    document.querySelectorAll('input[name="theme"]').forEach((input) => {
      input.addEventListener("change", () => {
        if (!input.checked) {
          return;
        }
        lastPresetTheme = sanitizeTheme(input.value);
        setSettings({ theme: lastPresetTheme }).then(syncAllControls);
      });
    });

    document.querySelectorAll('input[name="radius"]').forEach((input) => {
      input.addEventListener("change", () => {
        if (!input.checked) {
          return;
        }
        setSettings({ radius: sanitizeRadius(input.value) }).then(
          applyPopupChrome
        );
      });
    });

    customReset.addEventListener("click", () => {
      flushCustomPalettePersist().then(() =>
        setSettings({
          theme: "custom",
          customPalette: { ...DEFAULT_CUSTOM_PALETTE },
        }).then(syncAllControls)
      );
    });

  }

  function loadNativeScheme() {
    return new Promise((resolve) => {
      chrome.storage.local.get(NATIVE_SCHEME_KEY, (result) => {
        const value = result[NATIVE_SCHEME_KEY];
        nativeScheme = value === "dark" || value === "light" ? value : "light";
        resolve(nativeScheme);
      });
    });
  }

  function onNativeSchemeChanged() {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local" || !changes[NATIVE_SCHEME_KEY]) {
        return;
      }
      const value = changes[NATIVE_SCHEME_KEY].newValue;
      nativeScheme = value === "dark" || value === "light" ? value : "light";
      applyPopupChrome();
    });
  }

  renderRadiusList();
  renderThemeList();
  renderCustomFields();
  bindControls();
  onNativeSchemeChanged();
  Promise.all([getSettings(), loadNativeScheme()]).then(([settings]) => {
    if (settings.theme !== "custom") {
      lastPresetTheme = sanitizeTheme(settings.theme);
    }
    syncAllControls(settings);
  });
  onSettingsChanged((settings) => {
    if (isCustomPaletteSyncStale(settings)) {
      return;
    }
    syncAllControls(settings);
  });

  window.addEventListener("pagehide", () => {
    flushCustomPalettePersist();
  });
})();
