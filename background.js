const PLAYER_FRAME_CSS = ["iframe-player.css"];
const PLAYER_FRAME_JS = ["shared/settings.js", "content.js"];
const SOUNDCLOUD_URL_FILTER = { url: [{ hostEquals: "soundcloud.com" }] };

function isSoundCloudUrl(url) {
  return typeof url === "string" && url.startsWith("https://soundcloud.com/");
}

function isPlayerFrameUrl(url) {
  return (
    isSoundCloudUrl(url) &&
    (url.startsWith("https://soundcloud.com/n/") || url.includes("v2_layout="))
  );
}

function injectPlayerFrame(tabId, frameId) {
  const target = { tabId, frameIds: [frameId] };
  chrome.scripting
    .insertCSS({ target, files: PLAYER_FRAME_CSS })
    .catch(() => {});
  chrome.scripting
    .executeScript({ target, files: PLAYER_FRAME_JS })
    .catch(() => {});
}

function onFrameNavigated(details) {
  if (details.frameId === 0 || !isPlayerFrameUrl(details.url)) {
    return;
  }
  injectPlayerFrame(details.tabId, details.frameId);
}

chrome.webNavigation.onCommitted.addListener(
  onFrameNavigated,
  SOUNDCLOUD_URL_FILTER
);
chrome.webNavigation.onCompleted.addListener(
  onFrameNavigated,
  SOUNDCLOUD_URL_FILTER
);
chrome.webNavigation.onHistoryStateUpdated.addListener(
  onFrameNavigated,
  SOUNDCLOUD_URL_FILTER
);

chrome.webNavigation.onDOMContentLoaded.addListener((details) => {
  if (details.frameId !== 0 || !isSoundCloudUrl(details.url)) {
    return;
  }
  chrome.webNavigation.getAllFrames({ tabId: details.tabId }, (frames) => {
    if (chrome.runtime.lastError || !frames) {
      return;
    }
    for (const frame of frames) {
      if (frame.frameId !== 0 && isPlayerFrameUrl(frame.url)) {
        injectPlayerFrame(details.tabId, frame.frameId);
      }
    }
  });
}, SOUNDCLOUD_URL_FILTER);
