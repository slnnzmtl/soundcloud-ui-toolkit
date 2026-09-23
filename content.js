(function () {
  const {
    ENABLED_CLASS,
    FULL_WIDTH_CLASS,
    ENLARGED_QUEUE_CLASS,
    DEFAULTS,
    applyDocumentTheme,
    applyDocumentRadius,
    getSettings,
    onSettingsChanged,
  } = ScxSettings;

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
    applyDocumentTheme(active ? settings.theme : "default");
    applyDocumentRadius(settings.radius, { active });
  }

  applySettings(DEFAULTS);
  getSettings().then(applySettings);

  if (globalThis.__scxContentLoaded) {
    return;
  }
  globalThis.__scxContentLoaded = true;

  onSettingsChanged(applySettings);
})();
