# Chrome Web Store listing — SoundCloud UI Toolkit

Paste these fields into the [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole).
Do not upload until icons, promo tile, screenshots, and privacy URL are ready.

The same zip loads unpacked on other Chromium browsers (Edge, Opera, Brave;
requires Chrome 121+ / equivalent via `minimum_chrome_version`). Store publish
here remains Chrome Web Store only.

## Package

```bash
./scripts/pack.sh
```

Upload: `dist/soundcloud-wide-1.2.0.zip`

Runtime-only zip (no README, THEME.md, SELECTORS.md, store docs, or LICENSE).

## What’s new in 1.2.0

- Master enable switch — turn all styles off without clearing other preferences
- Appearance presets — Classic, Accent, Style, and Homage groups in the toolbar popup

## Store listing

| Field | Value |
| ----- | ----- |
| **Name** | SoundCloud UI Toolkit |
| **Short description** (manifest / store summary, ≤132 chars) | Customize SoundCloud layout, queue, themes, and rounding. Toggle everything from the toolbar popup. |
| **Category** | Productivity |
| **Language** | English |

### Detailed description

```
SoundCloud UI Toolkit customizes soundcloud.com for larger screens and personal taste.

Features
• Master enable switch — turn all styles off to restore stock SoundCloud without changing your other settings
• Enlarged layout — widen the main content area and related player UI
• Enlarged queue — make the play queue panel larger and easier to browse
• Appearance presets — Classic, Accent, Style, and Homage color groups (Default keeps native SoundCloud colors)
• Rounding scale — adjust corner radius for artwork, buttons, and the play control
• Toolbar control center — turn each feature on or off; preferences sync via Chrome sync

The extension only runs on https://soundcloud.com/. It is not affiliated with SoundCloud. It does not change audio playback, does not inject ads, and does not collect personal data.

Open the extension icon while on SoundCloud to adjust settings.
```

### Single purpose

Customize SoundCloud’s web UI with layout, queue, appearance, and rounding controls.

## Permission justifications (Privacy practices)

Use these answers in the dashboard Privacy tab.

| Permission / host | Justification |
| ----------------- | ------------- |
| `storage` | Stores the master enable toggle, layout toggles (enlarged layout, enlarged queue), and an appearance preset id so preferences persist and sync with Chrome sync. |
| `scripting` | Injects layout/theme CSS/JS into SoundCloud’s same-origin player iframe (`/n/*`) when that frame is created after the parent page loads (SPA navigation). |
| `webNavigation` | Detects committed/completed navigations and history updates for SoundCloud frames so the player iframe can receive layout and theme styles. |
| Host: `https://soundcloud.com/*` | Content scripts and injection run only on SoundCloud. |

### Remote code / user data

- **Does this extension collect user data?** No personal data. Only local/sync preferences (booleans + appearance preset id).
- **Does this extension sell user data?** No.
- **Does this extension use remote code?** No. All scripts ship inside the extension package.
- **Privacy policy URL** (after `PRIVACY.md` is on the default branch):  
  `https://github.com/slnnzmtl/soundcloud-wide/blob/main/PRIVACY.md`

## Images

| Asset | Path | Size | Required |
| ----- | ---- | ---- | -------- |
| Extension icons | `icons/icon-{16,32,48,128}.png` | 16 / 32 / 48 / 128 | Yes (in zip) |
| Small promo tile | `store/promo-small.png` | 440×280 | Yes (upload in dashboard) |
| Marquee promo | `store/promo-marquee.png` | 1400×560 | Optional |
| Screenshots | `store/screenshots/*.png` | 1280×800 | Yes (≥1) |

Sources: `store/promo-small.svg`, `store/promo-marquee.svg` (regenerate PNGs with `rsvg-convert`).

### Screenshots (upload in this order)

| # | File | Shows |
| - | ---- | ----- |
| 1 | [`store/screenshots/01-before.png`](screenshots/01-before.png) | **Before** — default SoundCloud width (comparison) |
| 2 | [`store/screenshots/02-enlarged.png`](screenshots/02-enlarged.png) | **After** — enlarged layout + queue |
| 3 | [`store/screenshots/03-purple.png`](screenshots/03-purple.png) | Appearance preset (Accent / Purple) |
| 4 | [`store/screenshots/04-control-panel.png`](screenshots/04-control-panel.png) | Toolbar popup + Cyberpunk theme |

These are full-bleed 1280×800 PNGs ready for the dashboard. They are **not** included in the store zip (upload separately).

Screenshots may show enlarged layout/queue; optional color presets are controlled from the popup and default to native SoundCloud colors.

## Local smoke-test (before upload)

Load unpacked from this repo (or from the unzipped store package):

- [ ] Enabled off restores stock SoundCloud UI
- [ ] Enlarged layout and enlarged queue toggles work
- [ ] Default appearance leaves native colors
- [ ] At least one Classic, Accent (including Blood), and Homage preset apply
- [ ] Player iframe (`/n/*`) still gets wide layout / theme after in-app navigation

## Pre-submit checklist

- [ ] `./scripts/pack.sh` succeeds and zip opens cleanly
- [ ] Icons appear on `chrome://extensions` after Load unpacked
- [ ] Enlarged layout and enlarged queue work on main SoundCloud UI
- [ ] Appearance presets apply (and Default leaves native colors)
- [ ] Player iframe (`/n/*`) still gets wide layout / theme after in-app navigation
- [ ] `PRIVACY.md` is public on GitHub `main`
- [ ] At least one 1280×800 screenshot uploaded (`store/screenshots/`)
- [ ] `store/promo-small.png` uploaded as small promo tile (optional: `store/promo-marquee.png`)
- [ ] Permission justifications pasted and match the zip
- [ ] Listing name/description say **SoundCloud UI Toolkit** (layout + optional presets; groups only, no third-party brand names)
