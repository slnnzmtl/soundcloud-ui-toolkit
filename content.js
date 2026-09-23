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

  const SETTINGS_MESSAGE = "scx-settings";
  const STYLE_ID = "scx-extension-css";
  const STYLE_FILES = [
    "styles.css",
    "iframe-player.css",
    "shared/tokens.css",
    "themes.css",
  ];
  const FRAME_PAINT_DELAYS_MS = [0, 50, 150, 400, 800, 1600];
  let latestSettings = null;
  let paintingRoot = false;

  function readStyleText() {
    return (
      globalThis.__scxStyleText ||
      (document.getElementById(STYLE_ID) &&
        document.getElementById(STYLE_ID).textContent) ||
      ""
    );
  }

  function installStyle(doc, css) {
    if (!doc || !doc.documentElement || !css) {
      return false;
    }
    let el = doc.getElementById(STYLE_ID);
    if (!el) {
      el = doc.createElement("style");
      el.id = STYLE_ID;
      doc.documentElement.appendChild(el);
    }
    if (el.textContent !== css) {
      el.textContent = css;
    }
    return true;
  }

  function inheritStyleFromParent() {
    if (window === window.top) {
      return false;
    }
    try {
      const parentEl = window.top.document.getElementById(STYLE_ID);
      const css = parentEl && parentEl.textContent;
      if (!css) {
        return false;
      }
      globalThis.__scxStyleText = css;
      return installStyle(document, css);
    } catch {
      return false;
    }
  }

  function persistExtensionStyles() {
    const root = document.documentElement;
    if (!root) {
      return;
    }
    new MutationObserver(() => {
      const css = readStyleText();
      if (css && !document.getElementById(STYLE_ID)) {
        installStyle(document, css);
      }
    }).observe(root, { childList: true, subtree: true });
  }

  function ensureExtensionStyles() {
    inheritStyleFromParent();
    if (document.getElementById(STYLE_ID) && globalThis.__scxStyleText) {
      return Promise.resolve();
    }
    if (globalThis.__scxStylesLoading) {
      return globalThis.__scxStylesLoading;
    }
    globalThis.__scxStylesLoading = Promise.all(
      STYLE_FILES.map((file) =>
        fetch(chrome.runtime.getURL(file)).then((response) => {
          if (!response.ok) {
            throw new Error(`Failed to load ${file}`);
          }
          return response.text();
        })
      )
    )
      .then((chunks) => {
        const css = chunks.join("\n");
        globalThis.__scxStyleText = css;
        installStyle(document, css);
        if (latestSettings && window === window.top) {
          paintSameOriginFrames(latestSettings);
          broadcastSettings(latestSettings);
        }
      })
      .catch(() => {
        globalThis.__scxStylesLoading = null;
      });
    return globalThis.__scxStylesLoading;
  }

  function paintRoot(root, settings) {
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
    applyDocumentTheme(active ? settings.theme : "default", { root });
    applyDocumentRadius(settings.radius, { active, root });
  }

  function paintSameOriginFrames(settings) {
    if (window !== window.top) {
      return;
    }
    const css = readStyleText();
    for (const iframe of document.querySelectorAll("iframe")) {
      try {
        const doc = iframe.contentDocument;
        if (doc && doc.documentElement) {
          installStyle(doc, css);
          paintRoot(doc.documentElement, settings);
        }
      } catch {
        /* cross-origin */
      }
    }
  }

  function broadcastSettings(settings) {
    const payload = {
      type: SETTINGS_MESSAGE,
      settings,
      css: readStyleText(),
    };
    for (const iframe of document.querySelectorAll("iframe")) {
      try {
        iframe.contentWindow.postMessage(payload, "*");
      } catch {
        /* frame not ready */
      }
    }
  }

  function scheduleFramePaint() {
    if (window !== window.top) {
      return;
    }
    for (const delay of FRAME_PAINT_DELAYS_MS) {
      setTimeout(() => {
        if (!latestSettings) {
          return;
        }
        paintSameOriginFrames(latestSettings);
        broadcastSettings(latestSettings);
      }, delay);
    }
  }

  function applySettings(settings) {
    latestSettings = settings;
    paintRoot(document.documentElement, settings);
    if (window !== window.top) {
      return;
    }
    paintSameOriginFrames(settings);
    broadcastSettings(settings);
    scheduleFramePaint();
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

  function watchChildFrames() {
    if (window !== window.top || !document.documentElement) {
      return;
    }
    document.addEventListener(
      "load",
      (event) => {
        if (event.target && event.target.tagName === "IFRAME" && latestSettings) {
          paintSameOriginFrames(latestSettings);
          broadcastSettings(latestSettings);
        }
      },
      true
    );
    new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (
            node.nodeName === "IFRAME" ||
            (node.querySelectorAll && node.querySelectorAll("iframe").length)
          ) {
            if (latestSettings) {
              scheduleFramePaint();
            }
            return;
          }
        }
      }
    }).observe(document.documentElement, { childList: true, subtree: true });
  }

  function watchOwnRoot() {
    const root = document.documentElement;
    if (!root) {
      return;
    }
    new MutationObserver(() => {
      if (paintingRoot || !latestSettings) {
        return;
      }
      const theme = latestSettings.theme;
      if (
        !latestSettings.enabled ||
        !theme ||
        theme === "default" ||
        root.classList.contains("scx-theme")
      ) {
        return;
      }
      paintingRoot = true;
      paintRoot(root, latestSettings);
      paintingRoot = false;
    }).observe(root, { attributes: true, attributeFilter: ["class"] });
  }

  persistExtensionStyles();
  ensureExtensionStyles();

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

  window.addEventListener("message", (event) => {
    if (event.source !== window.parent && event.source !== window.top) {
      return;
    }
    const data = event.data;
    if (!data || data.type !== SETTINGS_MESSAGE || !data.settings) {
      return;
    }
    if (data.css) {
      globalThis.__scxStyleText = data.css;
      installStyle(document, data.css);
    } else {
      inheritStyleFromParent();
    }
    latestSettings = data.settings;
    paintRoot(document.documentElement, data.settings);
  });

  if (window !== window.top) {
    for (const delay of FRAME_PAINT_DELAYS_MS) {
      setTimeout(() => {
        inheritStyleFromParent();
        if (latestSettings) {
          paintRoot(document.documentElement, latestSettings);
        }
      }, delay);
    }
  }

  watchChildFrames();
  watchOwnRoot();
  watchNativeScheme();
})();
