(function () {
  const {
    ENABLED_CLASS,
    FULL_WIDTH_CLASS,
    ENLARGED_QUEUE_CLASS,
    DEFAULTS,
    NATIVE_SCHEME_KEY,
    applyDocumentTheme,
    applyDocumentRadius,
    getSettings,
    readPageCache,
    writePageCache,
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

  function readNativeScheme(body) {
    if (!body || !body.classList) {
      return null;
    }
    if (body.classList.contains("theme-dark")) {
      return "dark";
    }
    if (body.classList.contains("theme-light")) {
      return "light";
    }
    return null;
  }

  function writeNativeScheme(scheme) {
    if (scheme !== "dark" && scheme !== "light") {
      return;
    }
    chrome.storage.local.set({ [NATIVE_SCHEME_KEY]: scheme });
  }

  function watchNativeScheme() {
    if (window !== window.top) {
      return;
    }

    let lastScheme = null;
    let observer = null;

    function publish(body) {
      const scheme = readNativeScheme(body);
      if (!scheme || scheme === lastScheme) {
        return;
      }
      lastScheme = scheme;
      writeNativeScheme(scheme);
    }

    function attach(body) {
      publish(body);
      if (observer) {
        observer.disconnect();
      }
      observer = new MutationObserver(() => publish(body));
      observer.observe(body, {
        attributes: true,
        attributeFilter: ["class"],
      });
    }

    if (document.body) {
      attach(document.body);
      return;
    }

    const rootObserver = new MutationObserver(() => {
      if (!document.body) {
        return;
      }
      rootObserver.disconnect();
      attach(document.body);
    });
    rootObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  const alreadyLoaded = Boolean(globalThis.__scxContentLoaded);
  const cached = readPageCache();
  if (cached) {
    applySettings(cached);
  } else if (window === window.top && !alreadyLoaded) {
    applySettings(DEFAULTS);
  }

  getSettings().then((settings) => {
    writePageCache(settings);
    applySettings(settings);
  });

  if (alreadyLoaded) {
    return;
  }
  globalThis.__scxContentLoaded = true;

  onSettingsChanged((settings) => {
    writePageCache(settings);
    applySettings(settings);
  });
  watchNativeScheme();
})();
