(function () {
  const { FULL_WIDTH_CLASS, getSettings, onSettingsChanged } = ScxSettings;

  function applyFullWidth(enabled) {
    const root = document.documentElement;
    if (!root) {
      return;
    }
    root.classList.toggle(FULL_WIDTH_CLASS, Boolean(enabled));
  }

  // Optimistic default: full width on until storage resolves.
  applyFullWidth(true);

  getSettings().then((settings) => {
    applyFullWidth(settings.fullWidth);
  });

  onSettingsChanged((settings) => {
    applyFullWidth(settings.fullWidth);
  });
})();
