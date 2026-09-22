(function () {
  const {
    FULL_WIDTH_CLASS,
    ENLARGED_QUEUE_CLASS,
    DEFAULTS,
    getSettings,
    onSettingsChanged,
  } = ScxSettings;

  function applySettings(settings) {
    const root = document.documentElement;
    if (!root) {
      return;
    }
    root.classList.toggle(FULL_WIDTH_CLASS, Boolean(settings.fullWidth));
    root.classList.toggle(
      ENLARGED_QUEUE_CLASS,
      Boolean(settings.enlargedQueue)
    );
  }

  applySettings(DEFAULTS);
  getSettings().then(applySettings);

  if (globalThis.__scxContentLoaded) {
    return;
  }
  globalThis.__scxContentLoaded = true;

  onSettingsChanged(applySettings);
})();
