/**
 * Shared settings defaults and helpers for popup + content scripts.
 * No build step — loaded as a plain script before consumers.
 */
(function (global) {
  const STORAGE_KEY = "scxSettings";
  const FULL_WIDTH_CLASS = "scx-full-width";
  const ENLARGED_QUEUE_CLASS = "scx-enlarged-queue";

  const DEFAULTS = Object.freeze({
    fullWidth: true,
    enlargedQueue: true,
  });

  function mergeWithDefaults(stored) {
    return {
      ...DEFAULTS,
      ...(stored && typeof stored === "object" ? stored : {}),
    };
  }

  function getSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(STORAGE_KEY, (result) => {
        resolve(mergeWithDefaults(result[STORAGE_KEY]));
      });
    });
  }

  function setSettings(partial) {
    return getSettings().then((current) => {
      const next = { ...current, ...partial };
      return new Promise((resolve) => {
        chrome.storage.sync.set({ [STORAGE_KEY]: next }, () => resolve(next));
      });
    });
  }

  function onSettingsChanged(callback) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "sync" || !changes[STORAGE_KEY]) {
        return;
      }
      callback(mergeWithDefaults(changes[STORAGE_KEY].newValue));
    });
  }

  global.ScxSettings = {
    STORAGE_KEY,
    FULL_WIDTH_CLASS,
    ENLARGED_QUEUE_CLASS,
    DEFAULTS,
    mergeWithDefaults,
    getSettings,
    setSettings,
    onSettingsChanged,
  };
})(typeof globalThis !== "undefined" ? globalThis : self);
