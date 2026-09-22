(function () {
  const { getSettings, setSettings } = ScxSettings;
  const fullWidthInput = document.getElementById("full-width");

  function syncSwitch(settings) {
    fullWidthInput.checked = Boolean(settings.fullWidth);
    fullWidthInput.setAttribute(
      "aria-checked",
      settings.fullWidth ? "true" : "false"
    );
  }

  getSettings().then(syncSwitch);

  fullWidthInput.addEventListener("change", () => {
    const fullWidth = fullWidthInput.checked;
    fullWidthInput.setAttribute("aria-checked", fullWidth ? "true" : "false");
    setSettings({ fullWidth });
  });
})();
