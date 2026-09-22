(function () {
  const { getSettings, setSettings } = ScxSettings;

  const switches = [
    { id: "full-width", key: "fullWidth" },
    { id: "enlarged-queue", key: "enlargedQueue" },
  ];

  function bindSwitch(id, key) {
    const input = document.getElementById(id);

    function sync(settings) {
      const enabled = Boolean(settings[key]);
      input.checked = enabled;
      input.setAttribute("aria-checked", enabled ? "true" : "false");
    }

    getSettings().then(sync);

    input.addEventListener("change", () => {
      const enabled = input.checked;
      input.setAttribute("aria-checked", enabled ? "true" : "false");
      setSettings({ [key]: enabled });
    });
  }

  switches.forEach(({ id, key }) => bindSwitch(id, key));
})();
