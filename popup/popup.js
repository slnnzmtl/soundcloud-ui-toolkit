(function () {
  const { THEME_GROUPS, getSettings, setSettings, sanitizeTheme } = ScxSettings;

  const switches = [
    { id: "full-width", key: "fullWidth" },
    { id: "enlarged-queue", key: "enlargedQueue" },
  ];

  const body = document.getElementById("control-center-body");
  const enabledInput = document.getElementById("extension-enabled");

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

  function bindSwitch(id, key) {
    const input = document.getElementById(id);

    function sync(settings) {
      syncSwitch(input, Boolean(settings[key]));
    }

    getSettings().then(sync);

    input.addEventListener("change", () => {
      const enabled = input.checked;
      syncSwitch(input, enabled);
      setSettings({ [key]: enabled });
    });
  }

  function bindEnabledSwitch() {
    function sync(settings) {
      const active = Boolean(settings.enabled);
      syncSwitch(enabledInput, active);
      setBodyActive(active);
    }

    getSettings().then(sync);

    enabledInput.addEventListener("change", () => {
      const active = enabledInput.checked;
      syncSwitch(enabledInput, active);
      setBodyActive(active);
      setSettings({ enabled: active });
    });
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

  function renderThemeList() {
    const mount = document.getElementById("theme-list");
    const fragment = document.createDocumentFragment();

    THEME_GROUPS.forEach((group) => {
      const section = document.createElement("div");
      section.className = "theme-group";

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

  function bindThemeRadios() {
    const inputs = Array.from(
      document.querySelectorAll('input[name="theme"]')
    );

    function sync(settings) {
      const theme = sanitizeTheme(settings.theme);
      inputs.forEach((input) => {
        input.checked = input.value === theme;
      });
    }

    getSettings().then(sync);

    inputs.forEach((input) => {
      input.addEventListener("change", () => {
        if (!input.checked) {
          return;
        }
        setSettings({ theme: sanitizeTheme(input.value) });
      });
    });
  }

  switches.forEach(({ id, key }) => bindSwitch(id, key));
  renderThemeList();
  bindThemeRadios();
  bindEnabledSwitch();
})();

