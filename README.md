# SoundCloud UI Toolkit

A dependency-free Chromium Manifest V3 extension that customizes SoundCloud's
layout, queue, listen-page hero, appearance, and rounding. Settings live in a
toolbar popup control center; every feature defaults on after install. Supported
browsers: Chrome, Edge, Opera, and Brave (Chrome 121+ or equivalent). Firefox
and Safari are not supported.

### What’s new in 1.4.0

- **Accent hero backdrop** — optional accent gradient and blur on track / listen heroes
- **Enlarged listen hero** — taller artwork band at wide viewports when Enlarged layout is on
- **Master switch hardening** — all SoundCloud overrides require `html.scx-enabled`, so Enabled off restores stock UI even if a feature class leaks
- Feature toggles (Enabled, layout, queue, hero backdrop) default **on** after install

### What’s new in 1.3.0

- **Custom themes** — pick four source colors in the control center; derived tokens apply live on SoundCloud
- **Saved custom presets** — store and rename up to six custom palettes; switch without losing Default / catalog presets
- Live preview in the popup chrome while editing

## Install locally

1. Open the extensions page for your browser:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
   - Brave: `brave://extensions`
   - Opera: `opera://extensions`
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this directory.
5. Open or reload `https://soundcloud.com/`.

## Control center

Click the extension icon in the toolbar to open the **Control center**.

| Setting              | Default | Effect |
| -------------------- | ------- | ------ |
| Enabled              | On      | Master switch — clears all toolkit classes to restore stock SoundCloud (extension stays installed for instant re-enable) |
| Enlarged layout      | On      | Widens the main layout (`.l-container`, player UI) and enlarges listen-page hero at wide viewports |
| Enlarged queue       | On      | Makes the play-queue panel larger |
| Accent hero backdrop | On      | Accent gradient and blur on track / listen hero |
| Rounding             | md      | Corner radius for artwork, buttons, and play (`default` = native; `none` / `sm` / `md` / `lg` / `xl`; play is circular at `xl`) |
| Appearance           | Default | Classic (Default follows SoundCloud light/dark in the popup; Midnight, OLED, Slate), Accent (Matrix, Fallout, Cyberpunk, Purple, Tide, Blood), Style (Minimal, Frost), or Homage (Grove, Blush); custom presets supported |

Preferences sync via `chrome.storage.sync` and apply immediately on open
SoundCloud tabs. The control-center chrome follows the selected appearance
preset and rounding scale so you can preview them in the popup.

## Permissions

| Permission / host              | Why it is needed                                                                 |
| ------------------------------ | -------------------------------------------------------------------------------- |
| `storage`                      | Save control-center settings and sync them across browser profiles               |
| `scripting`                    | Inject layout CSS/JS into SoundCloud's same-origin player iframe after SPA loads |
| `webNavigation`                | Detect when that player iframe is created or navigated in-app                    |
| `https://soundcloud.com/*`     | Run only on SoundCloud                                                           |

## Scope

- Runs only on `https://soundcloud.com/*`.
- Layout CSS for the main app shell lives in `styles.css` (features also require
  `html.scx-enabled`).
- Appearance presets live in `shared/tokens.css` (gated by `html.scx-theme-*`).
- Rounding scale lives in `shared/tokens.css` (gated by `html.scx-radius-*`);
  SoundCloud mapping for theme and radius lives in `themes.css` under
  `html.scx-enabled`.
- Player iframe layout lives in `iframe-player.css` (also injected by
  `background.js` when frames appear after the parent page has loaded).
- Uses semantic class names where possible to reduce breakage when SoundCloud
  deploys new asset hashes.

Developer notes: `SELECTORS.md` (selector map) and `snapshots/` (normalized
browser-rendered DOM trees) are for maintenance only and are excluded from the
store package. Refresh route snapshots with `npm install --include=dev` and
`npm run snapshot:dom`. Preset catalog lives in `shared/tokens.css`
and `THEME_GROUPS` / `RADII` in `shared/settings.js`. SoundCloud token mapping
lives in `themes.css`.

## Publishing

See [`store/LISTING.md`](store/LISTING.md) for Chrome Web Store listing copy,
privacy answers, screenshots, and packaging steps. Build a store zip with:

```bash
./scripts/pack.sh
```

Privacy policy: [`PRIVACY.md`](PRIVACY.md).
