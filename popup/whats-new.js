(function () {
  const WHATS_NEW_SEEN_KEY = "scxWhatsNewSeen";
  const WHATS_NEW_BY_VERSION = {
    "1.5.4": [
      "Added a new Hero background style: Cover matching tints the hero from the current track.",
    ],
  };

  function getSeenVersion() {
    return new Promise((resolve) => {
      chrome.storage.local.get(WHATS_NEW_SEEN_KEY, (result) => {
        const value = result[WHATS_NEW_SEEN_KEY];
        resolve(typeof value === "string" ? value : null);
      });
    });
  }

  function setSeenVersion(version) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [WHATS_NEW_SEEN_KEY]: version }, resolve);
    });
  }

  function hideWhatsNew() {
    const root = document.getElementById("whats-new-prompt");
    if (root) {
      root.hidden = true;
    }
  }

  function fillWhatsNew(version, notes) {
    const versionEl = document.getElementById("whats-new-version");
    const list = document.getElementById("whats-new-list");
    if (!versionEl || !list) {
      return;
    }
    versionEl.textContent = version;
    list.replaceChildren();
    notes.forEach((note) => {
      const item = document.createElement("li");
      item.textContent = note;
      list.appendChild(item);
    });
  }

  function showWhatsNew() {
    const root = document.getElementById("whats-new-prompt");
    const dismissBtn = document.getElementById("whats-new-dismiss");
    if (!root || !dismissBtn) {
      return;
    }
    root.hidden = false;
    dismissBtn.focus();
  }

  function coverPermissionPromptVisible() {
    const root = document.getElementById("cover-permission-prompt");
    return Boolean(root && !root.hidden);
  }

  function bindWhatsNew() {
    const root = document.getElementById("whats-new-prompt");
    const backdrop = document.getElementById("whats-new-backdrop");
    const dismissBtn = document.getElementById("whats-new-dismiss");
    if (!root || !backdrop || !dismissBtn) {
      return;
    }

    dismissBtn.addEventListener("click", hideWhatsNew);
    backdrop.addEventListener("click", hideWhatsNew);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !root.hidden) {
        hideWhatsNew();
      }
    });
  }

  function maybeShowWhatsNew() {
    const version = chrome.runtime.getManifest().version;
    bindWhatsNew();
    return getSeenVersion().then((seen) => {
      if (seen == null) {
        return setSeenVersion(version).then(() => false);
      }
      if (seen === version) {
        return false;
      }
      const notes = WHATS_NEW_BY_VERSION[version];
      return setSeenVersion(version).then(() => {
        if (!notes || !notes.length || coverPermissionPromptVisible()) {
          return false;
        }
        fillWhatsNew(version, notes);
        showWhatsNew();
        return true;
      });
    });
  }

  globalThis.__scxMaybeShowWhatsNew = maybeShowWhatsNew;
})();
