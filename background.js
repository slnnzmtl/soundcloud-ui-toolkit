// CSS starts as one #scx-extension-css tag from content.js (not insertCSS /
// manifest css — those stack sheets). This worker strips leftover injected
// sheets from older builds and catch-up-injects JS into frames that missed
// the content script.
const PLAYER_FRAME_JS = [
  "shared/settings/catalogs.js",
  "shared/settings/apply.js",
  "shared/settings.js",
  "content/hero-cover.js",
  "content.js",
];
const LEGACY_CSS_FILES = [
  "styles.css",
  "iframe-player.css",
  "shared/tokens.css",
  "themes.css",
];
const NAV_FILTER = {
  url: [
    { hostEquals: "soundcloud.com" },
    { urlEquals: "about:blank" },
    { urlPrefix: "blob:https://soundcloud.com/" },
  ],
};

function isSoundCloudUrl(url) {
  return typeof url === "string" && url.startsWith("https://soundcloud.com/");
}

function isOpaqueChildUrl(url) {
  return (
    url === "about:blank" ||
    (typeof url === "string" &&
      (url.startsWith("about:srcdoc") ||
        url.startsWith("blob:https://soundcloud.com/")))
  );
}

function removeLeftoverCss(tabId, frameIds) {
  const target = frameIds
    ? { tabId, frameIds }
    : { tabId, allFrames: true };
  return chrome.scripting
    .removeCSS({ target, files: LEGACY_CSS_FILES })
    .catch(() => {});
}

function stripLeftoverCssInSoundCloudTabs() {
  chrome.tabs.query({ url: "https://soundcloud.com/*" }, (tabs) => {
    if (chrome.runtime.lastError || !tabs) {
      return;
    }
    for (const tab of tabs) {
      if (tab.id != null) {
        removeLeftoverCss(tab.id);
      }
    }
  });
}

function injectPlayerFrame(tabId, frameId) {
  const target = { tabId, frameIds: [frameId] };
  removeLeftoverCss(tabId, [frameId]);
  chrome.scripting
    .executeScript({
      target,
      injectImmediately: true,
      func: () => Boolean(globalThis.__scxContentLoaded),
    })
    .then((results) => {
      if (results && results[0] && results[0].result) {
        return;
      }
      return chrome.scripting.executeScript({
        target,
        injectImmediately: true,
        files: PLAYER_FRAME_JS,
      });
    })
    .catch(() => {});
}

function injectChildFrames(tabId) {
  removeLeftoverCss(tabId);
  chrome.webNavigation.getAllFrames({ tabId }, (frames) => {
    if (chrome.runtime.lastError || !frames) {
      return;
    }
    const parent = frames.find((frame) => frame.frameId === 0);
    const parentIsSoundCloud = parent && isSoundCloudUrl(parent.url);
    for (const frame of frames) {
      if (frame.frameId === 0) {
        continue;
      }
      if (
        isSoundCloudUrl(frame.url) ||
        (parentIsSoundCloud && isOpaqueChildUrl(frame.url))
      ) {
        injectPlayerFrame(tabId, frame.frameId);
      }
    }
  });
}

function onNavigated(details) {
  if (details.frameId === 0) {
    if (isSoundCloudUrl(details.url)) {
      injectChildFrames(details.tabId);
    }
    return;
  }
  if (isSoundCloudUrl(details.url)) {
    injectPlayerFrame(details.tabId, details.frameId);
    return;
  }
  if (isOpaqueChildUrl(details.url)) {
    injectChildFrames(details.tabId);
  }
}

const COVER_FETCH_MESSAGE = "scx-fetch-cover";
const COVER_HOST_GRANTED_MESSAGE = "scx-cover-host-granted";
const COVER_HOST_SETTLED_MESSAGE = "scx-cover-host-settled";
const COVER_HOST_PERMISSION = "https://*.sndcdn.com/*";
const COVER_PERMISSION_PENDING_KEY = "scxCoverPermissionPending";
const COVER_HOST_DECLINED_KEY = "scxCoverHostDeclined";
const SETTINGS_KEY = "scxSettings";
const COVER_HOST_RE = /^https:\/\/[\w.-]+\.sndcdn\.com\//i;
const COVER_SAMPLE_SIZE = 24;

let coverHostGranted = false;

function originGrantsCoverHost(origins) {
  return (
    Array.isArray(origins) &&
    origins.some(
      (origin) =>
        origin === COVER_HOST_PERMISSION ||
        (typeof origin === "string" && origin.includes("sndcdn.com"))
    )
  );
}

function rememberCoverHostGrant() {
  coverHostGranted = true;
  chrome.storage.local.remove(COVER_HOST_DECLINED_KEY);
}

function rememberCoverHostDecline() {
  chrome.storage.local.set({ [COVER_HOST_DECLINED_KEY]: true });
}

function sendTabMessage(tabId, frameId, message) {
  const options = frameId == null ? undefined : { frameId };
  try {
    const sent = options
      ? chrome.tabs.sendMessage(tabId, message, options)
      : chrome.tabs.sendMessage(tabId, message);
    if (sent && typeof sent.catch === "function") {
      sent.catch(() => {});
    }
  } catch {
    /* tab or frame has no listener */
  }
}

function notifyCoverHostGranted() {
  chrome.tabs.query({ url: "https://soundcloud.com/*" }, (tabs) => {
    if (chrome.runtime.lastError || !tabs) {
      return;
    }
    for (const tab of tabs) {
      if (tab.id == null) {
        continue;
      }
      const tabId = tab.id;
      chrome.webNavigation.getAllFrames({ tabId }, (frames) => {
        if (chrome.runtime.lastError || !frames || !frames.length) {
          sendTabMessage(tabId, null, { type: COVER_HOST_GRANTED_MESSAGE });
          return;
        }
        for (const frame of frames) {
          sendTabMessage(tabId, frame.frameId, {
            type: COVER_HOST_GRANTED_MESSAGE,
          });
        }
      });
    }
  });
}

function averageRgbFromCoverPixels(imageData) {
  if (!imageData || !imageData.data || !imageData.data.length) {
    return null;
  }
  const { data } = imageData;
  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  let count = 0;
  let rAll = 0;
  let gAll = 0;
  let bAll = 0;
  let countAll = 0;
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha < 16) {
      continue;
    }
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    rAll += r;
    gAll += g;
    bAll += b;
    countAll += 1;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max < 24 || min > 232 || max - min < 18) {
      continue;
    }
    rSum += r;
    gSum += g;
    bSum += b;
    count += 1;
  }
  const pick =
    count > 0
      ? { r: rSum / count, g: gSum / count, b: bSum / count }
      : countAll > 0
        ? { r: rAll / countAll, g: gAll / countAll, b: bAll / countAll }
        : null;
  if (!pick) {
    return null;
  }
  return {
    r: Math.round(pick.r),
    g: Math.round(pick.g),
    b: Math.round(pick.b),
  };
}

function sampleCoverBuffer(buffer, contentType) {
  const blob = new Blob([buffer], { type: contentType || "image/jpeg" });
  return createImageBitmap(blob).then((bitmap) => {
    const canvas = new OffscreenCanvas(COVER_SAMPLE_SIZE, COVER_SAMPLE_SIZE);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      bitmap.close();
      return null;
    }
    ctx.drawImage(bitmap, 0, 0, COVER_SAMPLE_SIZE, COVER_SAMPLE_SIZE);
    const rgb = averageRgbFromCoverPixels(
      ctx.getImageData(0, 0, COVER_SAMPLE_SIZE, COVER_SAMPLE_SIZE)
    );
    bitmap.close();
    return rgb;
  });
}

function fetchCoverRgb(url, sendResponse) {
  fetch(url, {
    cache: "reload",
    credentials: "omit",
    referrer: "https://soundcloud.com/",
    referrerPolicy: "origin",
  })
    .then(async (response) => {
      if (!response.ok) {
        sendResponse({ ok: false });
        return;
      }
      const buffer = await response.arrayBuffer();
      const rgb = await sampleCoverBuffer(
        buffer,
        response.headers.get("content-type") || "image/jpeg"
      );
      if (!rgb) {
        sendResponse({ ok: false });
        return;
      }
      sendResponse({ ok: true, r: rgb.r, g: rgb.g, b: rgb.b });
    })
    .catch(() => {
      sendResponse({ ok: false });
    });
}

function withCoverHost(callback) {
  if (coverHostGranted) {
    callback(true);
    return;
  }
  chrome.permissions.contains({ origins: [COVER_HOST_PERMISSION] }, (granted) => {
    if (granted) {
      coverHostGranted = true;
      callback(true);
      return;
    }
    callback(false);
  });
}

chrome.permissions.contains({ origins: [COVER_HOST_PERMISSION] }, (granted) => {
  if (granted) {
    coverHostGranted = true;
  }
});

function mergeHeroPatchFromPending(patch) {
  const next = {};
  if (patch && typeof patch === "object") {
    if (typeof patch.theme === "string") {
      next.theme = patch.theme;
    }
    if (typeof patch.heroWaveformStyle === "string") {
      next.heroWaveformStyle = patch.heroWaveformStyle;
    }
    if (typeof patch.heroBackgroundStyle === "string") {
      next.heroBackgroundStyle = patch.heroBackgroundStyle;
    }
  }
  return next;
}

function patchSettings(partial, then) {
  chrome.storage.sync.get(SETTINGS_KEY, (stored) => {
    const current =
      stored[SETTINGS_KEY] && typeof stored[SETTINGS_KEY] === "object"
        ? stored[SETTINGS_KEY]
        : {};
    chrome.storage.sync.set(
      {
        [SETTINGS_KEY]: { ...current, ...partial },
      },
      then
    );
  });
}

function completeCoverHostRequest(granted) {
  chrome.storage.local.get(COVER_PERMISSION_PENDING_KEY, (result) => {
    const pending = result[COVER_PERMISSION_PENDING_KEY];
    if (!pending) {
      if (granted) {
        const alreadyKnown = coverHostGranted;
        rememberCoverHostGrant();
        if (!alreadyKnown) {
          notifyCoverHostGranted();
        }
      }
      return;
    }
    chrome.storage.local.remove(COVER_PERMISSION_PENDING_KEY);
    const next = mergeHeroPatchFromPending(pending.patch);
    if (granted) {
      next.heroBackgroundStyle = "cover";
      rememberCoverHostGrant();
      patchSettings(next, notifyCoverHostGranted);
      return;
    }
    rememberCoverHostDecline();
    if (pending.fallbackHeroBackgroundStyle) {
      next.heroBackgroundStyle = pending.fallbackHeroBackgroundStyle;
    }
    if (Object.keys(next).length) {
      patchSettings(next);
    }
  });
}

chrome.permissions.onAdded.addListener((permissions) => {
  if (!originGrantsCoverHost(permissions && permissions.origins)) {
    return;
  }
  completeCoverHostRequest(true);
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message) {
    return undefined;
  }
  if (message.type === COVER_HOST_SETTLED_MESSAGE) {
    completeCoverHostRequest(Boolean(message.granted));
    return undefined;
  }
  if (message.type !== COVER_FETCH_MESSAGE) {
    return undefined;
  }
  const url = message.url;
  if (typeof url !== "string" || !COVER_HOST_RE.test(url)) {
    sendResponse({ ok: false });
    return undefined;
  }
  withCoverHost((granted) => {
    if (!granted) {
      sendResponse({ ok: false });
      return;
    }
    fetchCoverRgb(url, sendResponse);
  });
  return true;
});

chrome.runtime.onInstalled.addListener(stripLeftoverCssInSoundCloudTabs);
chrome.runtime.onStartup.addListener(stripLeftoverCssInSoundCloudTabs);

chrome.webNavigation.onCommitted.addListener(onNavigated, NAV_FILTER);
chrome.webNavigation.onCompleted.addListener(onNavigated, NAV_FILTER);
chrome.webNavigation.onDOMContentLoaded.addListener(onNavigated, NAV_FILTER);
chrome.webNavigation.onHistoryStateUpdated.addListener(onNavigated, NAV_FILTER);
