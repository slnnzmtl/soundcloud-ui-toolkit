(function () {
  const REVIEW_PROMPT_KEY = "scxReviewPrompt";
  const REVIEW_PROMPT_OPEN_THRESHOLD = 3;

  function getReviewPromptState() {
    return new Promise((resolve) => {
      chrome.storage.local.get(REVIEW_PROMPT_KEY, (result) => {
        const raw = result[REVIEW_PROMPT_KEY];
        resolve(raw && typeof raw === "object" ? raw : {});
      });
    });
  }

  function setReviewPromptState(next) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [REVIEW_PROMPT_KEY]: next }, resolve);
    });
  }

  function hideReviewPrompt() {
    const root = document.getElementById("review-prompt");
    if (root) {
      root.hidden = true;
    }
  }

  function showReviewPrompt() {
    const root = document.getElementById("review-prompt");
    const firstStar = document.querySelector(".review-prompt__star");
    if (!root || !firstStar) {
      return;
    }
    root.hidden = false;
    firstStar.focus();
  }

  function markReviewPromptDismissed(version) {
    return getReviewPromptState().then((state) =>
      setReviewPromptState({
        ...state,
        lastPromptedVersion: version,
        countVersion: version,
      })
    );
  }

  function markReviewPromptRated(rating) {
    return getReviewPromptState().then((state) =>
      setReviewPromptState({
        ...state,
        rated: true,
        rating,
      })
    );
  }

  function setStarPreview(stars, rating) {
    stars.forEach((star) => {
      star.classList.toggle("is-active", Number(star.dataset.rating) <= rating);
    });
  }

  function clearStarPreview(stars) {
    stars.forEach((star) => {
      star.classList.remove("is-active");
    });
  }

  function bindReviewPrompt(version) {
    const root = document.getElementById("review-prompt");
    const backdrop = document.getElementById("review-prompt-backdrop");
    const dismissBtn = document.getElementById("review-prompt-dismiss");
    const starsRoot = document.getElementById("review-prompt-stars");
    if (!root || !backdrop || !dismissBtn || !starsRoot) {
      return;
    }

    const stars = Array.from(
      starsRoot.querySelectorAll(".review-prompt__star")
    );

    dismissBtn.addEventListener("click", () => {
      markReviewPromptDismissed(version).then(hideReviewPrompt);
    });

    stars.forEach((star) => {
      star.addEventListener("mouseenter", () => {
        setStarPreview(stars, Number(star.dataset.rating));
      });
      star.addEventListener("focus", () => {
        setStarPreview(stars, Number(star.dataset.rating));
      });
      star.addEventListener("click", () => {
        const rating = Number(star.dataset.rating);
        setStarPreview(stars, rating);
        chrome.tabs.create(
          {
            url: "https://chromewebstore.google.com/detail/ejehihdgbonfaddicbenfbakcmcdkpnd/reviews/my-review",
            active: true,
          },
          (tab) => {
            if (tab && tab.windowId != null) {
              chrome.windows.update(tab.windowId, { focused: true });
            }
            markReviewPromptRated(rating).then(hideReviewPrompt);
          }
        );
      });
    });

    starsRoot.addEventListener("mouseleave", () => {
      clearStarPreview(stars);
    });

    backdrop.addEventListener("click", () => {
      hideReviewPrompt();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !root.hidden) {
        hideReviewPrompt();
      }
    });
  }

  function maybeShowReviewPrompt() {
    const version = chrome.runtime.getManifest().version;
    bindReviewPrompt(version);
    return getReviewPromptState().then((state) => {
      if (state.rated || state.lastPromptedVersion === version) {
        return;
      }
      const priorCount = Number(state.openCount);
      let openCount =
        state.countVersion === version && Number.isFinite(priorCount)
          ? priorCount
          : 0;
      openCount += 1;
      const next = {
        ...state,
        countVersion: version,
        openCount,
      };
      return setReviewPromptState(next).then(() => {
        if (openCount >= REVIEW_PROMPT_OPEN_THRESHOLD) {
          showReviewPrompt();
        }
      });
    });
  }

  globalThis.__scxMaybeShowReviewPrompt = maybeShowReviewPrompt;
})();
