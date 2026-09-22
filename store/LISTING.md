# Chrome Web Store listing — SoundCloud Wide

Paste these fields into the [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole).
Do not upload until icons, promo tile, screenshots, and privacy URL are ready.

## Package

```bash
./scripts/pack.sh
```

Upload: `dist/soundcloud-wide-1.1.0.zip`

Runtime-only zip (no README, THEME.md, SELECTORS.md, store docs, or LICENSE).

## Store listing

| Field | Value |
| ----- | ----- |
| **Name** | SoundCloud Wide |
| **Short description** (manifest / store summary, ≤132 chars) | Widen SoundCloud's main layout and queue. Toggle settings from the toolbar popup. |
| **Category** | Productivity |
| **Language** | English |

### Detailed description

```
SoundCloud Wide makes better use of large screens on soundcloud.com.

Features
• Enlarged layout — widen the main content area and related player UI
• Enlarged queue — make the play queue panel larger and easier to browse
• Toolbar control center — turn each feature on or off; preferences sync via Chrome sync

The extension only runs on https://soundcloud.com/. It does not change audio playback, does not inject ads, and does not collect personal data.

Open the extension icon while on SoundCloud to adjust settings.
```

### Single purpose

Widen SoundCloud’s web layout (main content and queue) with optional user toggles.

## Permission justifications (Privacy practices)

Use these answers in the dashboard Privacy tab.

| Permission / host | Justification |
| ----------------- | ------------- |
| `storage` | Stores two boolean settings (enlarged layout, enlarged queue) so preferences persist and sync with Chrome sync. |
| `scripting` | Injects layout CSS/JS into SoundCloud’s same-origin player iframe (`/n/*`) when that frame is created after the parent page loads (SPA navigation). |
| `webNavigation` | Detects committed/completed navigations and history updates for SoundCloud frames so the player iframe can receive layout styles. |
| Host: `https://soundcloud.com/*` | Content scripts and injection run only on SoundCloud. |

### Remote code / user data

- **Does this extension collect user data?** No personal data. Only local/sync boolean preferences.
- **Does this extension sell user data?** No.
- **Does this extension use remote code?** No. All scripts ship inside the extension package.
- **Privacy policy URL** (after `PRIVACY.md` is on the default branch):  
  `https://github.com/slnnzmtl/soundcloud-wide/blob/main/PRIVACY.md`

## Images

| Asset | Path | Size | Required |
| ----- | ---- | ---- | -------- |
| Extension icons | `icons/icon-{16,32,48,128}.png` | 16 / 32 / 48 / 128 | Yes (in zip) |
| Small promo tile | `store/promo-small.png` | 440×280 | Yes (upload in dashboard) |
| Screenshots | `store/screenshots/*.png` | 1280×800 | Yes (≥1) |
| Marquee promo | — | 1400×560 | Optional |

### Screenshots (upload in this order)

| # | File | Shows |
| - | ---- | ----- |
| 1 | [`store/screenshots/01-after-layout.png`](screenshots/01-after-layout.png) | **After** — enlarged layout (wide playlist + sidebar) |
| 2 | [`store/screenshots/02-after-queue.png`](screenshots/02-after-queue.png) | **After** — enlarged queue (“Next up” panel) |
| 3 | [`store/screenshots/03-before.png`](screenshots/03-before.png) | **Before** — default SoundCloud width (comparison) |

These are full-bleed 1280×800 PNGs ready for the dashboard. They are **not** included in the store zip (upload separately).

Do not submit screenshots that imply a full theme/recolor if the shipped CSS is layout-only.

## Pre-submit checklist

- [ ] `./scripts/pack.sh` succeeds and zip opens cleanly
- [ ] Icons appear on `chrome://extensions` after Load unpacked
- [ ] Enlarged layout and enlarged queue work on main SoundCloud UI
- [ ] Player iframe (`/n/*`) still gets wide layout after in-app navigation
- [ ] `PRIVACY.md` is public on GitHub `main`
- [ ] At least one 1280×800 screenshot uploaded (`store/screenshots/`)
- [ ] `store/promo-small.png` uploaded as small promo tile
- [ ] Permission justifications pasted and match the zip
- [ ] Listing name/description say **SoundCloud Wide** (layout), not “theme”
