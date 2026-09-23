// CSS starts as one #scx-extension-css tag from content.js (not insertCSS /
// manifest css — those stack sheets). This worker strips leftover injected
// sheets from older builds and catch-up-injects JS into frames that missed
// the content script.
const PLAYER_FRAME_JS = ["shared/settings.js", "content.js"];
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

chrome.runtime.onInstalled.addListener(stripLeftoverCssInSoundCloudTabs);
chrome.runtime.onStartup.addListener(stripLeftoverCssInSoundCloudTabs);

chrome.webNavigation.onCommitted.addListener(onNavigated, NAV_FILTER);
chrome.webNavigation.onCompleted.addListener(onNavigated, NAV_FILTER);
chrome.webNavigation.onDOMContentLoaded.addListener(onNavigated, NAV_FILTER);
chrome.webNavigation.onHistoryStateUpdated.addListener(onNavigated, NAV_FILTER);
