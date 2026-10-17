(function () {
  const {
    THEME_GROUPS,
    RADII,
    RADIUS_LABELS,
    FONTS,
    FONT_CATEGORIES,
    CUSTOM_PALETTE_KEYS,
    DEFAULT_CUSTOM_PALETTE,
    MAX_CUSTOM_PRESETS,
    CUSTOM_PRESET_LABEL_MAX_LENGTH,
    resolveCustomPalette,
    NATIVE_SCHEME_KEY,
    getSettings,
    setSettings,
    sanitizeTheme,
    sanitizeRadius,
    normalizeHexColor,
    customPalettesEqual,
    isCompleteCustomPaletteInput,
    sanitizeCustomPalette,
    createCustomPreset,
    findCustomPreset,
    isCustomThemeId,
    isSavedCustomThemeId,
    applyDocumentTheme,
    applyDocumentRadius,
    paintDocumentFont,
    applyCustomThemeVariables,
    clearCustomThemeVariables,
    readPresetSourcePalette,
    sanitizeHeroBackgroundStyle,
    sanitizeHeroWaveformStyle,
    sanitizeFont,
    onSettingsChanged,
  } = ScxSettings;

  const switches = [
    { id: "full-width", key: "fullWidth" },
    { id: "enlarged-queue", key: "enlargedQueue" },
    { id: "hide-artist-tools", key: "hideArtistTools" },
  ];

  const appearanceSelects = [
    {
      id: "hero-background-style",
      key: "heroBackgroundStyle",
      sanitize: sanitizeHeroBackgroundStyle,
    },
    {
      id: "hero-waveform-style",
      key: "heroWaveformStyle",
      sanitize: sanitizeHeroWaveformStyle,
    },
    {
      id: "ui-font",
      key: "font",
      sanitize: sanitizeFont,
    },
    {
      id: "ui-radius",
      key: "radius",
      sanitize: sanitizeRadius,
    },
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
  const customReset = document.getElementById("custom-reset");
  const customSave = document.getElementById("custom-save");
  const customFieldsMount = document.getElementById("custom-theme-fields");
  const customPresetList = document.getElementById("custom-preset-list");

  const CUSTOM_PALETTE_PERSIST_MS = 220;
  const LIVE_SETTINGS_MESSAGE = "scx-settings-live";

  let nativeScheme = "light";
  let currentSettings = null;
  let lastPresetTheme = "midnight";
  /** @type {"presets" | "custom" | null} */
  let colorsPanelOverride = null;
  let customPaletteDraft = null;
  let customPalettePersistTimer = null;
  let customPaletteSaveInFlight = false;
  /** @type {HTMLElement | null} */
  let themeSelectRoot = null;
  /** @type {HTMLButtonElement | null} */
  let themeSelectTrigger = null;
  /** @type {HTMLElement | null} */
  let themeSelectPanel = null;
  /** @type {HTMLElement | null} */
  let themeSelectTriggerSwatches = null;
  /** @type {HTMLElement | null} */
  let themeSelectTriggerLabel = null;

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
    const theme = next.theme;
    applyDocumentTheme(theme, {
      includeDefault: true,
      nativeScheme,
    });
    if (isCustomThemeId(theme)) {
      applyCustomThemeVariables(document.documentElement, next);
    } else {
      clearCustomThemeVariables(document.documentElement);
    }
    applyDocumentRadius(next.radius, { active: true });
    paintDocumentFont(document.documentElement, next, {
      preview: true,
      getSettings: () => currentSettings,
    });
    updateCustomPreview(resolveCustomPalette(next));
  }

  function setBodyActive(active) {
    body.classList.toggle("control-center__body--disabled", !active);
    body.inert = !active;
    body.querySelectorAll("input, button, select").forEach((el) => {
      el.disabled = !active;
    });
    syncSavePresetButton(currentSettings);
  }

  function syncSwitch(input, enabled) {
    input.checked = enabled;
    input.setAttribute("aria-checked", enabled ? "true" : "false");
  }

  function rememberCatalogTheme(themeId) {
    if (!isSavedCustomThemeId(themeId) && themeId !== "custom") {
      lastPresetTheme = sanitizeTheme(themeId);
    }
  }

  function currentPresets() {
    return (currentSettings && currentSettings.customPresets) || [];
  }

  function findCatalogTheme(id) {
    for (const group of THEME_GROUPS) {
      const theme = group.themes.find((entry) => entry.id === id);
      if (theme) {
        return { group, theme };
      }
    }
    return null;
  }

  function resolveActivePresetTheme() {
    const checked = document.querySelector(
      '#custom-preset-list input[name="theme"]:checked'
    );
    if (checked) {
      lastPresetTheme = sanitizeTheme(checked.value, currentPresets());
      return lastPresetTheme;
    }
    const catalogValue = themeList && themeList.dataset.themeValue;
    if (catalogValue && findCatalogTheme(catalogValue)) {
      lastPresetTheme = sanitizeTheme(catalogValue);
    }
    return lastPresetTheme;
  }

  function paletteFromLastPreset() {
    resolveActivePresetTheme();
    const preset = findCustomPreset(currentPresets(), lastPresetTheme);
    if (preset) {
      return { ...preset.palette };
    }
    const catalogId = isSavedCustomThemeId(lastPresetTheme)
      ? "midnight"
      : sanitizeTheme(lastPresetTheme);
    return readPresetSourcePalette(
      catalogId,
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
    const derived =
      settings && isCustomThemeId(settings.theme) ? "custom" : "presets";
    const mode = colorsPanelOverride ?? derived;
    const customTab = mode === "custom";
    document.querySelectorAll('input[name="theme-mode"]').forEach((input) => {
      input.checked = customTab
        ? input.value === "custom"
        : input.value === "presets";
    });
    themeList.hidden = customTab;
    customPanel.hidden = !customTab;
    rememberCatalogTheme(settings.theme);
  }

  function updateCustomPreview(palette) {
    if (!customPreview || !palette) {
      return;
    }
    customPreview.style.setProperty("--preview-bg", palette.background);
    customPreview.style.setProperty("--preview-surface", palette.surface);
    customPreview.style.setProperty("--preview-text", palette.text);
    customPreview.style.setProperty("--preview-accent", palette.accent);
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

  function createThemeRow(theme, options) {
    const inputId = `theme-${theme.id}`;
    const deletable = Boolean(options && options.deletable);

    const label = document.createElement("label");
    label.className = "theme-row";
    label.htmlFor = inputId;

    const swatches = document.createElement("span");
    swatches.className = "theme-row__swatches";
    swatches.setAttribute("aria-hidden", "true");
    theme.swatches.forEach((color) => {
      swatches.appendChild(createSwatch(color));
    });

    const name = deletable
      ? document.createElement("input")
      : document.createElement("span");
    name.className = deletable
      ? "theme-row__label theme-row__name"
      : "theme-row__label";
    if (deletable) {
      name.type = "text";
      name.value = theme.label;
      name.readOnly = true;
      name.size = Math.min(
        Math.max(theme.label.length, 1),
        CUSTOM_PRESET_LABEL_MAX_LENGTH
      );
      name.maxLength = CUSTOM_PRESET_LABEL_MAX_LENGTH;
      name.setAttribute("aria-label", `Rename ${theme.label}`);
      name.addEventListener("click", (event) => {
        event.stopPropagation();
        const radioInput = document.getElementById(inputId);
        if (radioInput && !radioInput.checked) {
          radioInput.checked = true;
          radioInput.dispatchEvent(new Event("change", { bubbles: true }));
        }
      });
      name.addEventListener("dblclick", (event) => {
        event.preventDefault();
        event.stopPropagation();
        beginPresetRename(name, theme);
      });
    } else {
      name.textContent = theme.label;
    }

    const input = document.createElement("input");
    input.id = inputId;
    input.className = "theme-row__input";
    input.type = "radio";
    input.name = "theme";
    input.value = theme.id;

    const radio = document.createElement("span");
    radio.className = "theme-row__radio";
    radio.setAttribute("aria-hidden", "true");

    label.append(swatches, name);
    if (deletable) {
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "theme-row__delete";
      remove.dataset.presetId = theme.id;
      remove.setAttribute("aria-label", `Delete ${theme.label}`);
      remove.textContent = "×";
      remove.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        deleteCustomPreset(theme.id);
      });
      label.append(remove);
    }
    label.append(input, radio);
    return label;
  }

  function isPresetNameEditing() {
    const el = document.activeElement;
    return Boolean(
      el &&
        el.classList &&
        el.classList.contains("theme-row__name") &&
        !el.readOnly
    );
  }

  function finishPresetRename(nameField, theme, cancelled) {
    const original = theme.label;
    nameField.readOnly = true;
    nameField.classList.remove("theme-row__name--editing");
    if (cancelled) {
      nameField.value = original;
      return;
    }
    const next = String(nameField.value || "").trim();
    if (!next || next === original) {
      nameField.value = original;
      return;
    }
    renameCustomPreset(theme.id, next);
  }

  function beginPresetRename(nameField, theme) {
    if (!nameField || nameField.readOnly === false) {
      return;
    }
    const original = theme.label;
    let cancelled = false;

    nameField.readOnly = false;
    nameField.classList.add("theme-row__name--editing");
    nameField.focus();
    nameField.select();

    const onKeydown = (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        nameField.blur();
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        cancelled = true;
        nameField.value = original;
        nameField.blur();
      }
    };

    const onBlur = () => {
      nameField.removeEventListener("keydown", onKeydown);
      nameField.removeEventListener("blur", onBlur);
      finishPresetRename(nameField, theme, cancelled);
    };

    nameField.addEventListener("keydown", onKeydown);
    nameField.addEventListener("blur", onBlur);
  }

  function renameCustomPreset(id, label) {
    const nextLabel = String(label || "")
      .trim()
      .slice(0, CUSTOM_PRESET_LABEL_MAX_LENGTH);
    const presets = currentPresets().map((preset) => {
      if (preset.id !== id) {
        return preset;
      }
      return {
        ...preset,
        label: nextLabel || preset.label,
      };
    });
    return setSettings({ customPresets: presets }).then(syncAllControls);
  }

  function fillThemeSwatches(container, colors) {
    container.replaceChildren();
    (colors || []).forEach((color) => {
      container.appendChild(createSwatch(color));
    });
  }

  function setThemeSelectOpen(open) {
    const root = themeSelectRoot;
    const trigger = themeSelectTrigger;
    const panel = themeSelectPanel;
    if (!root || !trigger || !panel) {
      return;
    }
    root.classList.toggle("is-open", open);
    trigger.setAttribute("aria-expanded", open ? "true" : "false");
    panel.hidden = !open;
    if (open) {
      const selected =
        panel.querySelector('[role="option"][aria-selected="true"]') ||
        panel.querySelector('[role="option"]');
      if (selected) {
        selected.focus();
      }
    }
  }

  function syncThemeSelectDisplay(themeId) {
    const resolved =
      findCatalogTheme(themeId) ||
      findCatalogTheme(lastPresetTheme) ||
      findCatalogTheme("default");
    if (!resolved) {
      return;
    }
    const { theme } = resolved;
    themeList.dataset.themeValue = theme.id;
    if (themeSelectTriggerSwatches) {
      fillThemeSwatches(themeSelectTriggerSwatches, theme.swatches);
    }
    if (themeSelectTriggerLabel) {
      themeSelectTriggerLabel.textContent = theme.label;
    }
    if (!themeSelectPanel) {
      return;
    }
    themeSelectPanel.querySelectorAll('[role="option"]').forEach((option) => {
      const selected = option.dataset.themeId === theme.id;
      option.setAttribute("aria-selected", selected ? "true" : "false");
      option.classList.toggle("is-selected", selected);
    });
  }

  function applyThemeChoice(themeId) {
    const next = sanitizeTheme(themeId, currentPresets());
    rememberCatalogTheme(next);
    colorsPanelOverride = findCatalogTheme(next) ? "presets" : "custom";
    setSettings({ theme: next }).then(syncAllControls);
  }

  function renderThemeList() {
    const mount = themeList;
    if (!mount) {
      return;
    }
    const previous = mount.dataset.themeValue || lastPresetTheme || "default";

    const root = document.createElement("div");
    root.className = "theme-select";

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "theme-select__trigger";
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("aria-controls", "theme-select-listbox");

    const triggerSwatches = document.createElement("span");
    triggerSwatches.className =
      "theme-select__trigger-swatches theme-row__swatches";
    triggerSwatches.setAttribute("aria-hidden", "true");

    const triggerLabel = document.createElement("span");
    triggerLabel.className = "theme-select__trigger-label";

    const chevron = document.createElement("span");
    chevron.className = "theme-select__chevron";
    chevron.setAttribute("aria-hidden", "true");

    trigger.append(triggerSwatches, triggerLabel, chevron);

    const panel = document.createElement("div");
    panel.className = "theme-select__panel";
    panel.id = "theme-select-listbox";
    panel.hidden = true;
    panel.setAttribute("role", "listbox");
    panel.setAttribute("tabindex", "-1");
    panel.setAttribute("aria-label", "Theme");

    const leftCol = document.createElement("div");
    leftCol.className = "theme-select__column";
    const rightCol = document.createElement("div");
    rightCol.className = "theme-select__column";

    THEME_GROUPS.forEach((group) => {
      const groupEl = document.createElement("div");
      groupEl.className = `theme-select__group theme-select__group--${group.id}`;
      groupEl.setAttribute("role", "group");
      groupEl.setAttribute("aria-label", group.label);

      const title = document.createElement("div");
      title.className = "theme-select__group-title";
      title.textContent = group.label;

      groupEl.appendChild(title);
      group.themes.forEach((theme) => {
        const option = document.createElement("button");
        option.type = "button";
        option.className = "theme-select__option";
        option.setAttribute("role", "option");
        option.setAttribute("aria-selected", "false");
        option.dataset.themeId = theme.id;
        option.tabIndex = -1;

        const swatches = document.createElement("span");
        swatches.className = "theme-row__swatches";
        swatches.setAttribute("aria-hidden", "true");
        fillThemeSwatches(swatches, theme.swatches);

        const label = document.createElement("span");
        label.className = "theme-select__option-label";
        label.textContent = theme.label;

        option.append(swatches, label);
        groupEl.appendChild(option);
      });
      (group.column === "right" ? rightCol : leftCol).appendChild(groupEl);
    });

    panel.append(leftCol, rightCol);

    root.append(trigger, panel);
    themeSelectRoot = root;
    themeSelectTrigger = trigger;
    themeSelectPanel = panel;
    themeSelectTriggerSwatches = triggerSwatches;
    themeSelectTriggerLabel = triggerLabel;
    mount.replaceChildren(root);
    syncThemeSelectDisplay(previous);
  }

  function renderSavedPresetList(customPresets) {
    if (!customPresetList) {
      return;
    }
    const presets = Array.isArray(customPresets) ? customPresets : [];
    if (!presets.length) {
      customPresetList.hidden = true;
      customPresetList.replaceChildren();
      return;
    }

    const title = document.createElement("h3");
    title.id = "custom-preset-heading";
    title.className = "theme-group__title";
    title.textContent = "Saved";

    const rows = document.createElement("div");
    rows.className = "theme-group__rows";
    presets.forEach((preset) => {
      rows.appendChild(
        createThemeRow(
          {
            id: preset.id,
            label: preset.label,
            swatches: [
              preset.palette.background,
              preset.palette.text,
              preset.palette.accent,
            ],
          },
          { deletable: true }
        )
      );
    });

    customPresetList.hidden = false;
    customPresetList.replaceChildren(title, rows);
  }

  function syncSavePresetButton(settings) {
    if (!customSave) {
      return;
    }
    const count = (settings && settings.customPresets
      ? settings.customPresets
      : []
    ).length;
    const atCap = count >= MAX_CUSTOM_PRESETS;
    customSave.disabled =
      !settings || !settings.enabled || atCap;
    customSave.title = atCap
      ? `Maximum of ${MAX_CUSTOM_PRESETS} saved presets`
      : "";
  }

  function deleteCustomPreset(id) {
    const presets = currentPresets().filter((preset) => preset.id !== id);
    const patch = { customPresets: presets };
    if (currentSettings && currentSettings.theme === id) {
      patch.theme = "default";
      lastPresetTheme = "default";
    }
    setSettings(patch).then(syncAllControls);
  }

  function saveCustomPreset() {
    flushCustomPalettePersist().then((settings) => {
      const current = settings || currentSettings;
      if (!current) {
        return;
      }
      const existing = current.customPresets || [];
      if (existing.length >= MAX_CUSTOM_PRESETS) {
        return;
      }
      const palette = sanitizeCustomPalette(
        customPaletteDraft || current.customPalette
      );
      const preset = createCustomPreset(palette, existing);
      lastPresetTheme = preset.id;
      return setSettings({
        theme: preset.id,
        customPresets: [...existing, preset],
      }).then(syncAllControls);
    });
  }

  function renderRadiusSelect() {
    const select = document.getElementById("ui-radius");
    if (!select) {
      return;
    }
    const fragment = document.createDocumentFragment();
    RADII.forEach((id) => {
      const option = document.createElement("option");
      option.value = id;
      option.textContent = RADIUS_LABELS[id] || id;
      fragment.appendChild(option);
    });
    select.replaceChildren(fragment);
  }

  function renderFontSelect() {
    const select = document.getElementById("ui-font");
    if (!select) {
      return;
    }
    const fragment = document.createDocumentFragment();
    FONT_CATEGORIES.forEach((category) => {
      const fonts = FONTS.filter((font) => font.category === category.id);
      if (!fonts.length) {
        return;
      }
      const group = document.createElement("optgroup");
      group.label = category.label;
      fonts.forEach((font) => {
        const option = document.createElement("option");
        option.value = font.id;
        option.textContent = font.label;
        group.appendChild(option);
      });
      fragment.appendChild(group);
    });
    select.replaceChildren(fragment);
  }

  function syncAllControls(settings) {
    const active = Boolean(settings.enabled);
    syncSwitch(enabledInput, active);
    setBodyActive(active);

    switches.forEach(({ id, key }) => {
      syncSwitch(document.getElementById(id), Boolean(settings[key]));
    });

    appearanceSelects.forEach(({ id, key, sanitize }) => {
      const select = document.getElementById(id);
      if (select) {
        select.value = sanitize(settings[key]);
      }
    });

    const theme = sanitizeTheme(settings.theme, settings.customPresets);
    if (!themeList.querySelector(".theme-select")) {
      renderThemeList();
    }
    if (!isPresetNameEditing()) {
      renderSavedPresetList(settings.customPresets);
    }
    const catalogActive =
      settings.theme !== "custom" && findCatalogTheme(theme) ? theme : null;
    if (catalogActive) {
      rememberCatalogTheme(catalogActive);
      syncThemeSelectDisplay(catalogActive);
    } else {
      syncThemeSelectDisplay(lastPresetTheme);
    }
    const activeTheme = settings.theme === "custom" ? null : theme;
    document
      .querySelectorAll('#custom-preset-list input[name="theme"]')
      .forEach((input) => {
        input.checked = activeTheme !== null && input.value === activeTheme;
      });

    syncThemeModeUi(settings);
    syncCustomFields(resolveCustomPalette(settings));
    syncSavePresetButton(settings);
    applyPopupChrome(settings);
    broadcastLiveSettings();
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

    appearanceSelects.forEach(({ id, key, sanitize }) => {
      const select = document.getElementById(id);
      select.addEventListener("change", () => {
        const value = sanitize(select.value);
        select.value = value;
        setSettings({ [key]: value }).then((settings) => {
          applyPopupChrome(settings);
          broadcastLiveSettings();
        });
      });
    });

    document.querySelectorAll('input[name="theme-mode"]').forEach((input) => {
      input.addEventListener("change", () => {
        if (!input.checked) {
          return;
        }
        if (input.value === "custom") {
          colorsPanelOverride = "custom";
          activateCustomFromPreset();
          return;
        }
        colorsPanelOverride = "presets";
        syncThemeModeUi(currentSettings || {});
      });
    });

    customPresetList.addEventListener("change", (event) => {
      const input = event.target;
      if (!input || input.name !== "theme" || !input.checked) {
        return;
      }
      applyThemeChoice(input.value);
    });

    themeList.addEventListener("click", (event) => {
      const trigger = event.target.closest(".theme-select__trigger");
      if (trigger && themeList.contains(trigger)) {
        event.preventDefault();
        const open = trigger.getAttribute("aria-expanded") === "true";
        setThemeSelectOpen(!open);
        return;
      }
      const option = event.target.closest(".theme-select__option");
      if (option && themeList.contains(option)) {
        event.preventDefault();
        applyThemeChoice(option.dataset.themeId);
      }
    });

    themeList.addEventListener("keydown", (event) => {
      const trigger = themeSelectTrigger;
      const panel = themeSelectPanel;
      if (!trigger || !panel) {
        return;
      }
      const open = trigger.getAttribute("aria-expanded") === "true";
      const options = [...panel.querySelectorAll('[role="option"]')];
      const active = document.activeElement;
      const optionIndex = options.indexOf(active);

      if (event.target === trigger) {
        if (
          event.key === "ArrowDown" ||
          event.key === "Enter" ||
          event.key === " "
        ) {
          event.preventDefault();
          setThemeSelectOpen(true);
          return;
        }
      }

      if (!open) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        setThemeSelectOpen(false);
        trigger.focus();
        return;
      }

      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        if (!options.length) {
          return;
        }
        let nextIndex = optionIndex;
        if (optionIndex < 0) {
          nextIndex = event.key === "ArrowDown" ? 0 : options.length - 1;
        } else if (event.key === "ArrowDown") {
          nextIndex = (optionIndex + 1) % options.length;
        } else {
          nextIndex = (optionIndex - 1 + options.length) % options.length;
        }
        options[nextIndex].focus();
        return;
      }

      if (
        (event.key === "Enter" || event.key === " ") &&
        optionIndex >= 0
      ) {
        event.preventDefault();
        applyThemeChoice(options[optionIndex].dataset.themeId);
      }
    });

    document.addEventListener("click", (event) => {
      if (!themeList.contains(event.target)) {
        setThemeSelectOpen(false);
      }
    });

    customReset.addEventListener("click", () => {
      flushCustomPalettePersist().then(() =>
        setSettings({
          theme: "custom",
          customPalette: { ...DEFAULT_CUSTOM_PALETTE },
        }).then(syncAllControls)
      );
    });

    customSave.addEventListener("click", () => {
      saveCustomPreset();
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

  const REVIEW_PROMPT_KEY = "scxReviewPrompt";
  const REVIEW_PROMPT_OPEN_THRESHOLD = 3;

  function getReviewPromptState() {
    return new Promise((resolve) => {
      chrome.storage.local.get(REVIEW_PROMPT_KEY, (result) => {
        const raw = result[REVIEW_PROMPT_KEY];
        resolve(raw && typeof raw === "object" ? raw : {});
      });
    });
  }

  function setReviewPromptState(next) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [REVIEW_PROMPT_KEY]: next }, resolve);
    });
  }

  function hideReviewPrompt() {
    const root = document.getElementById("review-prompt");
    if (root) {
      root.hidden = true;
    }
  }

  function showReviewPrompt() {
    const root = document.getElementById("review-prompt");
    const firstStar = document.querySelector(".review-prompt__star");
    if (!root || !firstStar) {
      return;
    }
    root.hidden = false;
    firstStar.focus();
  }

  function markReviewPromptDismissed(version) {
    return getReviewPromptState().then((state) =>
      setReviewPromptState({
        ...state,
        lastPromptedVersion: version,
        countVersion: version,
      })
    );
  }

  function markReviewPromptRated(rating) {
    return getReviewPromptState().then((state) =>
      setReviewPromptState({
        ...state,
        rated: true,
        rating,
      })
    );
  }

  function setStarPreview(stars, rating) {
    stars.forEach((star) => {
      star.classList.toggle("is-active", Number(star.dataset.rating) <= rating);
    });
  }

  function clearStarPreview(stars) {
    stars.forEach((star) => {
      star.classList.remove("is-active");
    });
  }

  function bindReviewPrompt(version) {
    const root = document.getElementById("review-prompt");
    const backdrop = document.getElementById("review-prompt-backdrop");
    const dismissBtn = document.getElementById("review-prompt-dismiss");
    const starsRoot = document.getElementById("review-prompt-stars");
    if (!root || !backdrop || !dismissBtn || !starsRoot) {
      return;
    }

    const stars = Array.from(
      starsRoot.querySelectorAll(".review-prompt__star")
    );

    dismissBtn.addEventListener("click", () => {
      markReviewPromptDismissed(version).then(hideReviewPrompt);
    });

    stars.forEach((star) => {
      star.addEventListener("mouseenter", () => {
        setStarPreview(stars, Number(star.dataset.rating));
      });
      star.addEventListener("focus", () => {
        setStarPreview(stars, Number(star.dataset.rating));
      });
      star.addEventListener("click", () => {
        const rating = Number(star.dataset.rating);
        setStarPreview(stars, rating);
        chrome.tabs.create(
          {
            url: "https://chromewebstore.google.com/detail/ejehihdgbonfaddicbenfbakcmcdkpnd/reviews/my-review",
            active: true,
          },
          (tab) => {
            if (tab && tab.windowId != null) {
              chrome.windows.update(tab.windowId, { focused: true });
            }
            markReviewPromptRated(rating).then(hideReviewPrompt);
          }
        );
      });
    });

    starsRoot.addEventListener("mouseleave", () => {
      clearStarPreview(stars);
    });

    backdrop.addEventListener("click", () => {
      hideReviewPrompt();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !root.hidden) {
        hideReviewPrompt();
      }
    });
  }

  function maybeShowReviewPrompt() {
    const version = chrome.runtime.getManifest().version;
    bindReviewPrompt(version);
    return getReviewPromptState().then((state) => {
      if (state.rated || state.lastPromptedVersion === version) {
        return;
      }
      const priorCount = Number(state.openCount);
      let openCount =
        state.countVersion === version && Number.isFinite(priorCount)
          ? priorCount
          : 0;
      openCount += 1;
      const next = {
        ...state,
        countVersion: version,
        openCount,
      };
      return setReviewPromptState(next).then(() => {
        if (openCount >= REVIEW_PROMPT_OPEN_THRESHOLD) {
          showReviewPrompt();
        }
      });
    });
  }

  renderRadiusSelect();
  renderFontSelect();
  renderThemeList();
  renderCustomFields();
  bindControls();
  onNativeSchemeChanged();
  Promise.all([getSettings(), loadNativeScheme()]).then(([settings]) => {
    rememberCatalogTheme(settings.theme);
    syncAllControls(settings);
    maybeShowReviewPrompt();
  });
  onSettingsChanged((settings) => {
    if (isCustomPaletteSyncStale(settings)) {
      return;
    }
    colorsPanelOverride = null;
    syncAllControls(settings);
  });

  window.addEventListener("pagehide", () => {
    flushCustomPalettePersist();
  });
})();
