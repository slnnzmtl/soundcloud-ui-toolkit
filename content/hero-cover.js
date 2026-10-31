(function () {
  const {
    HERO_COVER_CSS_VAR,
    averageRgbFromCoverPixels,
  } = ScxSettings;

  const FRAME_PAINT_DELAYS_MS = [0, 50, 150, 400, 800, 1600, 3200];
  const COVER_SAMPLE_DEBOUNCE_MS = 100;
  const COVER_SAMPLE_SIZE = 24;
  const COVER_ARTWORK_URL_RE = /artworks[-_/]/i;
  const COVER_FETCH_MESSAGE = "scx-fetch-cover";
  const COVER_HOST_GRANTED_MESSAGE = "scx-cover-host-granted";
  /** @type {WeakMap<Element, string>} */
  const lastCoverSampleKeyByRoot = new WeakMap();
  /** @type {WeakMap<Element, string>} */
  const lastCoverPageKeyByRoot = new WeakMap();
  /** @type {WeakMap<Element, ReturnType<typeof setTimeout>>} */
  const coverSampleTimerByRoot = new WeakMap();
  /** @type {WeakMap<Element, ReturnType<typeof setTimeout>[]>} */
  const coverRetryTimersByRoot = new WeakMap();
  /** @type {WeakMap<Document, { canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D }>} */
  const coverSampleSurfaceByDoc = new WeakMap();
  /** @type {WeakSet<Element>} */
  const coverResizeIframes = new WeakSet();

  function getLatestSettings() {
    return globalThis.__scxLatestSettings;
  }

  function isCoverHeroActive(settings) {
    return Boolean(
      settings && settings.enabled && settings.heroBackgroundStyle === "cover"
    );
  }

  function clearHeroCoverVariable(root) {
    if (!root) {
      return;
    }
    root.style.removeProperty(HERO_COVER_CSS_VAR);
    lastCoverSampleKeyByRoot.delete(root);
    lastCoverPageKeyByRoot.delete(root);
  }

  function docFromRoot(root) {
    return root && root.ownerDocument ? root.ownerDocument : document;
  }

  function coverLocationKey(doc) {
    try {
      const loc = doc && doc.defaultView && doc.defaultView.location;
      return loc ? loc.pathname : "";
    } catch {
      return "";
    }
  }

  function isDisplayedElement(el) {
    return Boolean(el && el.getClientRects && el.getClientRects().length);
  }

  function normalizeCoverUrl(url) {
    if (!url) {
      return null;
    }
    let next = String(url).trim();
    if (next.startsWith("//")) {
      next = `https:${next}`;
    } else if (next.startsWith("http://")) {
      next = `https://${next.slice(7)}`;
    }
    return /^https:\/\//i.test(next) ? next : null;
  }

  function parseBackgroundImageUrl(backgroundImage) {
    if (!backgroundImage || backgroundImage === "none") {
      return null;
    }
    const matches = String(backgroundImage).matchAll(
      /url\(\s*["']?([^"')]+)["']?\s*\)/gi
    );
    let last = null;
    for (const match of matches) {
      const url = normalizeCoverUrl(match[1]);
      if (url) {
        last = url;
      }
    }
    return last;
  }

  function coverImgFrom(el) {
    if (!el) {
      return null;
    }
    let fallback = null;
    for (const img of el.querySelectorAll("img")) {
      const src = img.currentSrc || img.src;
      if (!src) {
        continue;
      }
      const found = { kind: "img", img, key: src };
      if (COVER_ARTWORK_URL_RE.test(src)) {
        return found;
      }
      if (!fallback) {
        fallback = found;
      }
    }
    return fallback;
  }

  function lastMatchingCover(nodes, readCover) {
    let fallback = null;
    for (let i = nodes.length - 1; i >= 0; i -= 1) {
      const node = nodes[i];
      const found = readCover(node);
      if (!found) {
        continue;
      }
      if (isDisplayedElement(node)) {
        return found;
      }
      if (!fallback) {
        fallback = found;
      }
    }
    return fallback;
  }

  function coverBackgroundFrom(el, doc) {
    if (!el) {
      return null;
    }
    const view = doc.defaultView || globalThis;
    const inline = el.style && el.style.backgroundImage;
    const computed =
      inline && inline !== "none"
        ? inline
        : view.getComputedStyle(el).backgroundImage;
    const url = parseBackgroundImageUrl(computed);
    if (!url) {
      return null;
    }
    return { kind: "url", url, key: url };
  }

  function coverFromTrackHeader(section, doc) {
    if (!section) {
      return null;
    }
    const fromImg = coverImgFrom(section);
    if (fromImg) {
      return fromImg;
    }
    for (const el of section.querySelectorAll(
      ".image__full, .fullHero__artwork .image__full, .listenArtworkWrapper .image__full"
    )) {
      const fromBg = coverBackgroundFrom(el, doc);
      if (fromBg) {
        return fromBg;
      }
    }
    return null;
  }

  function findListenHeroCoverSource(doc) {
    if (!doc) {
      return null;
    }

    const headers = doc.querySelectorAll('section[aria-label="Track header"]');
    const fromHeader = lastMatchingCover(headers, (section) =>
      coverFromTrackHeader(section, doc)
    );
    if (fromHeader) {
      return fromHeader;
    }

    const scope = doc.getElementById("content") || doc;
    const heroes = scope.querySelectorAll(
      ".fullListenHero, .fullHero, .l-listen-hero"
    );
    return lastMatchingCover(heroes, (hero) => classicCoverFromHero(hero, doc));
  }

  function classicCoverFromHero(hero, doc) {
    if (!hero) {
      return null;
    }
    const fromImg = coverImgFrom(hero);
    if (fromImg) {
      return fromImg;
    }
    const classic = hero.querySelector(
      ".fullHero__artwork .image__full, .listenArtworkWrapper .image__full"
    );
    if (!classic) {
      return null;
    }
    return coverBackgroundFrom(classic, doc);
  }

  function ensureCoverSampleCanvas(doc) {
    if (!doc) {
      return null;
    }
    let surface = coverSampleSurfaceByDoc.get(doc);
    if (!surface) {
      const canvas = doc.createElement("canvas");
      canvas.width = COVER_SAMPLE_SIZE;
      canvas.height = COVER_SAMPLE_SIZE;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        return null;
      }
      surface = { canvas, ctx };
      coverSampleSurfaceByDoc.set(doc, surface);
    }
    return surface.ctx;
  }

  function applyCoverRgbToRoot(root, rgb) {
    if (!root || !rgb) {
      return;
    }
    root.style.setProperty(
      HERO_COVER_CSS_VAR,
      `rgb(${rgb.r} ${rgb.g} ${rgb.b})`
    );
  }

  function sampleRgbFromDrawable(doc, drawable) {
    const ctx = ensureCoverSampleCanvas(doc);
    if (!ctx || !drawable) {
      return null;
    }
    try {
      ctx.clearRect(0, 0, COVER_SAMPLE_SIZE, COVER_SAMPLE_SIZE);
      ctx.drawImage(drawable, 0, 0, COVER_SAMPLE_SIZE, COVER_SAMPLE_SIZE);
      const imageData = ctx.getImageData(
        0,
        0,
        COVER_SAMPLE_SIZE,
        COVER_SAMPLE_SIZE
      );
      return averageRgbFromCoverPixels(imageData);
    } catch {
      return null;
    }
  }

  function fetchCoverViaBackground(url) {
    if (
      typeof chrome === "undefined" ||
      !chrome.runtime ||
      typeof chrome.runtime.sendMessage !== "function"
    ) {
      return Promise.resolve(null);
    }
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(
          { type: COVER_FETCH_MESSAGE, url },
          (response) => {
            if (
              chrome.runtime.lastError ||
              !response ||
              !response.ok ||
              !Number.isFinite(response.r) ||
              !Number.isFinite(response.g) ||
              !Number.isFinite(response.b)
            ) {
              resolve(null);
              return;
            }
            resolve({ r: response.r, g: response.g, b: response.b });
          }
        );
      } catch {
        resolve(null);
      }
    });
  }

  function sampleUrlViaBackground(url) {
    const normalized = normalizeCoverUrl(url);
    if (!normalized) {
      return Promise.resolve(null);
    }
    return fetchCoverViaBackground(normalized);
  }

  function sampleFromCoverSource(doc, source) {
    if (!source) {
      return Promise.resolve(null);
    }
    if (source.kind === "img" && source.img) {
      const img = source.img;
      if (img.complete && img.naturalWidth > 0) {
        const fromPage = sampleRgbFromDrawable(doc, img);
        if (fromPage) {
          return Promise.resolve(fromPage);
        }
      }
      const url = img.currentSrc || img.src || source.key;
      return sampleUrlViaBackground(url);
    }
    if (source.kind === "url" && source.url) {
      return sampleUrlViaBackground(source.url);
    }
    return Promise.resolve(null);
  }

  function applyHeroCoverSample(root) {
    if (!root || !isCoverHeroActive(getLatestSettings())) {
      return;
    }
    const doc = docFromRoot(root);
    const pageKey = coverLocationKey(doc);
    const lastPage = lastCoverPageKeyByRoot.get(root);
    const lastKey = lastCoverSampleKeyByRoot.get(root);
    if (lastPage && lastPage !== pageKey) {
      root.style.removeProperty(HERO_COVER_CSS_VAR);
      lastCoverSampleKeyByRoot.delete(root);
    }
    const source = findListenHeroCoverSource(doc);
    if (!source) {
      return;
    }
    const sampled = root.style.getPropertyValue(HERO_COVER_CSS_VAR).trim();
    if (lastKey === source.key && sampled && sampled !== "transparent") {
      lastCoverPageKeyByRoot.set(root, pageKey);
      return;
    }
    if (lastKey !== source.key && sampled) {
      root.style.removeProperty(HERO_COVER_CSS_VAR);
    }
    sampleFromCoverSource(doc, source).then((rgb) => {
      if (!isCoverHeroActive(getLatestSettings())) {
        return;
      }
      if (coverLocationKey(doc) !== pageKey) {
        return;
      }
      const current = findListenHeroCoverSource(doc);
      if (!current || current.key !== source.key) {
        return;
      }
      if (rgb) {
        lastCoverSampleKeyByRoot.set(root, source.key);
        lastCoverPageKeyByRoot.set(root, pageKey);
        applyCoverRgbToRoot(root, rgb);
        return;
      }
      scheduleHeroCoverRetries(root);
    });
  }

  function scheduleHeroCoverSample(root) {
    if (!root) {
      return;
    }
    const pending = coverSampleTimerByRoot.get(root);
    if (pending) {
      clearTimeout(pending);
    }
    const timer = setTimeout(() => {
      coverSampleTimerByRoot.delete(root);
      applyHeroCoverSample(root);
    }, COVER_SAMPLE_DEBOUNCE_MS);
    coverSampleTimerByRoot.set(root, timer);
  }

  function clearHeroCoverRetries(root) {
    const timers = coverRetryTimersByRoot.get(root);
    if (!timers) {
      return;
    }
    for (const timer of timers) {
      clearTimeout(timer);
    }
    coverRetryTimersByRoot.delete(root);
  }

  function stopHeroCoverSampling(root) {
    const pending = coverSampleTimerByRoot.get(root);
    if (pending) {
      clearTimeout(pending);
      coverSampleTimerByRoot.delete(root);
    }
    clearHeroCoverRetries(root);
    clearHeroCoverVariable(root);
  }

  function scheduleHeroCoverRetries(root) {
    if (!root || !isCoverHeroActive(getLatestSettings())) {
      return;
    }
    clearHeroCoverRetries(root);
    const timers = FRAME_PAINT_DELAYS_MS.map((delay) =>
      setTimeout(() => {
        if (isCoverHeroActive(getLatestSettings())) {
          applyHeroCoverSample(root);
        }
      }, delay)
    );
    coverRetryTimersByRoot.set(root, timers);
  }

  function coverSamplePending(root) {
    if (!root || !isCoverHeroActive(getLatestSettings())) {
      return false;
    }
    const doc = docFromRoot(root);
    const source = findListenHeroCoverSource(doc);
    if (!source) {
      return true;
    }
    const sampled = root.style.getPropertyValue(HERO_COVER_CSS_VAR).trim();
    if (!sampled || sampled === "transparent") {
      return true;
    }
    if (lastCoverSampleKeyByRoot.get(root) !== source.key) {
      return true;
    }
    return lastCoverPageKeyByRoot.get(root) !== coverLocationKey(doc);
  }

  function requestHeroCoverSample(root) {
    if (!root || !isCoverHeroActive(getLatestSettings())) {
      return;
    }
    if (coverSamplePending(root)) {
      scheduleHeroCoverRetries(root);
    }
  }

  function syncHeroCover(root, settings) {
    if (!root) {
      return;
    }
    if (!isCoverHeroActive(settings)) {
      stopHeroCoverSampling(root);
      return;
    }
    requestHeroCoverSample(root);
  }

  function watchHeroCoverArt() {
    if (globalThis.__scxHeroCoverWatch) {
      return;
    }
    globalThis.__scxHeroCoverWatch = true;
    const root = document.documentElement;
    if (!root) {
      return;
    }
    let lastObservedCoverKey = null;
    new MutationObserver(() => {
      if (!isCoverHeroActive(getLatestSettings())) {
        return;
      }
      const source = findListenHeroCoverSource(document);
      const nextKey = source && source.key;
      if (nextKey && nextKey !== lastObservedCoverKey) {
        lastObservedCoverKey = nextKey;
        if (lastCoverSampleKeyByRoot.get(root) !== nextKey) {
          root.style.removeProperty(HERO_COVER_CSS_VAR);
          lastCoverSampleKeyByRoot.delete(root);
          lastCoverPageKeyByRoot.delete(root);
          clearHeroCoverRetries(root);
          scheduleHeroCoverRetries(root);
        }
      }
      scheduleHeroCoverSample(root);
    }).observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src", "style", "class"],
    });
    document.addEventListener(
      "load",
      (event) => {
        if (!isCoverHeroActive(getLatestSettings())) {
          return;
        }
        const target = event.target;
        if (target && target.tagName === "IMG") {
          scheduleHeroCoverSample(root);
        }
      },
      true
    );
    if (document.readyState === "loading") {
      document.addEventListener(
        "DOMContentLoaded",
        () => requestHeroCoverSample(root),
        { once: true }
      );
    } else {
      requestHeroCoverSample(root);
    }
    if (document.readyState !== "complete") {
      window.addEventListener(
        "load",
        () => requestHeroCoverSample(root),
        { once: true }
      );
    }
    function onCoverLocationChange() {
      if (!isCoverHeroActive(getLatestSettings())) {
        return;
      }
      clearHeroCoverVariable(root);
      requestHeroCoverSample(root);
      if (typeof globalThis.__scxScheduleFramePaint === "function") {
        globalThis.__scxScheduleFramePaint();
      }
    }
    window.addEventListener("popstate", onCoverLocationChange);
    if (
      typeof chrome !== "undefined" &&
      chrome.runtime &&
      chrome.runtime.onMessage &&
      typeof chrome.runtime.onMessage.addListener === "function"
    ) {
      chrome.runtime.onMessage.addListener((message) => {
        if (!message || message.type !== COVER_HOST_GRANTED_MESSAGE) {
          return;
        }
        lastCoverSampleKeyByRoot.delete(root);
        lastCoverPageKeyByRoot.delete(root);
        scheduleHeroCoverRetries(root);
      });
    }
    const historyObj = window.history;
    if (historyObj) {
      for (const method of ["pushState", "replaceState"]) {
        const original = historyObj[method];
        if (typeof original !== "function") {
          continue;
        }
        historyObj[method] = function scxCoverHistory() {
          const result = original.apply(this, arguments);
          onCoverLocationChange();
          return result;
        };
      }
    }
  }

  function watchIframeCoverResize(iframe) {
    if (
      !iframe ||
      coverResizeIframes.has(iframe) ||
      typeof ResizeObserver !== "function"
    ) {
      return;
    }
    coverResizeIframes.add(iframe);
    const observer = new ResizeObserver(() => {
      if (!isCoverHeroActive(getLatestSettings())) {
        return;
      }
      try {
        const doc = iframe.contentDocument;
        if (doc && doc.documentElement) {
          scheduleHeroCoverSample(doc.documentElement);
        }
      } catch {
        /* cross-origin */
      }
    });
    observer.observe(iframe);
  }

  globalThis.__scxSyncHeroCover = syncHeroCover;
  globalThis.__scxWatchHeroCoverArt = watchHeroCoverArt;
  globalThis.__scxWatchIframeCoverResize = watchIframeCoverResize;
})();
