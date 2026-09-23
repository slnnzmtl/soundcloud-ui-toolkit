(function () {
  const {
    THEME_GROUPS,
    RADII,
    getSettings,
    setSettings,
    sanitizeTheme,
    sanitizeRadius,
    applyDocumentTheme,
    applyDocumentRadius,
    onSettingsChanged,
  } = ScxSettings;

  const switches = [
    { id: "full-width", key: "fullWidth" },
    { id: "enlarged-queue", key: "enlargedQueue" },
  ];

  const body = document.getElementById("control-center-body");
  const enabledInput = document.getElementById("extension-enabled");

  function applyPopupChrome(settings) {
    applyDocumentTheme(settings.theme, { includeDefault: true });
    applyDocumentRadius(settings.radius, { active: true });
  }

  function setBodyActive(active) {
    body.classList.toggle("control-center__body--disabled", !active);
    body.inert = !active;
    body.querySelectorAll("input").forEach((input) => {
      input.disabled = !active;
    });
  }

  function syncSwitch(input, enabled) {
    input.checked = enabled;
    input.setAttribute("aria-checked", enabled ? "true" : "false");
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
      input.checked = input.value === theme;
    });

    const radius = sanitizeRadius(settings.radius);
    document.querySelectorAll('input[name="radius"]').forEach((input) => {
      input.checked = input.value === radius;
    });

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

    document.querySelectorAll('input[name="theme"]').forEach((input) => {
      input.addEventListener("change", () => {
        if (!input.checked) {
          return;
        }
        setSettings({ theme: sanitizeTheme(input.value) }).then(
          applyPopupChrome
        );
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
  }

  renderRadiusList();
  renderThemeList();
  bindControls();
  getSettings().then(syncAllControls);
  onSettingsChanged(syncAllControls);
})();
