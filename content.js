(function () {
  const {
    ENABLED_CLASS,
    FULL_WIDTH_CLASS,
    ENLARGED_QUEUE_CLASS,
    THEME_CLASS,
    THEMES,
    DEFAULTS,
    themeClass,
    getSettings,
    onSettingsChanged,
  } = ScxSettings;

  function applyTheme(theme) {
    const root = document.documentElement;
    if (!root) {
      return;
    }

    root.classList.remove(THEME_CLASS);
    root.classList.remove(themeClass("lifeinvader"));
    for (const id of THEMES) {
      if (id !== "default") {
        root.classList.remove(themeClass(id));
      }
    }

    if (theme && theme !== "default") {
      root.classList.add(THEME_CLASS);
      root.classList.add(themeClass(theme));
    }
  }

  function applySettings(settings) {
    const root = document.documentElement;
    if (!root) {
      return;
    }

    const active = Boolean(settings.enabled);
    root.classList.toggle(ENABLED_CLASS, active);
    root.classList.toggle(
      FULL_WIDTH_CLASS,
      active && Boolean(settings.fullWidth)
    );
    root.classList.toggle(
      ENLARGED_QUEUE_CLASS,
      active && Boolean(settings.enlargedQueue)
    );
    applyTheme(active ? settings.theme : "default");
  }

  applySettings(DEFAULTS);
  getSettings().then(applySettings);

  if (globalThis.__scxContentLoaded) {
    return;
  }
  globalThis.__scxContentLoaded = true;

  onSettingsChanged(applySettings);
})();
