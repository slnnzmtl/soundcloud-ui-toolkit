# SoundCloud Wide

A dependency-free Chromium Manifest V3 extension that widens SoundCloud's main
layout and queue, with optional color presets. Settings live in a toolbar popup
control center. Supported browsers: Chrome, Edge, Opera, and Brave (Chrome 121+
or equivalent). Firefox and Safari are not supported.

### What’s new in 1.2.0

Master enable switch and appearance presets (Classic, Accent, Style, Homage)
gated by `html.scx-theme-*` in `themes.css`. Layout and queue toggles are
unchanged.

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

| Setting          | Default | Effect                                              |
| ---------------- | ------- | --------------------------------------------------- |
| Enabled          | On      | Master switch — turn off to restore stock SoundCloud |
| Enlarged layout  | On      | Widens the main layout (`.l-container`, player UI)  |
| Enlarged queue   | On      | Makes the play-queue panel larger                   |
| Appearance       | Default | Classic (Default, Midnight, OLED, Slate), Accent (Terminal, Fallout, Cyberpunk, Purple, Teal Hue, Blood), Style (Minimal, Liquid Glass), or Homage (Spotify, Mimi) |

Preferences sync via `chrome.storage.sync` and apply immediately on open
SoundCloud tabs.

## Permissions

| Permission / host              | Why it is needed                                                                 |
| ------------------------------ | -------------------------------------------------------------------------------- |
| `storage`                      | Save control-center settings and sync them across browser profiles               |
| `scripting`                    | Inject layout CSS/JS into SoundCloud's same-origin player iframe after SPA loads |
| `webNavigation`                | Detect when that player iframe is created or navigated in-app                    |
| `https://soundcloud.com/*`     | Run only on SoundCloud                                                           |

## Scope

- Runs only on `https://soundcloud.com/*`.
- Layout CSS for the main app shell lives in `styles.css`.
- Appearance presets live in `themes.css` (gated by `html.scx-theme-*`).
- Player iframe layout lives in `iframe-player.css` (also injected by
  `background.js` when frames appear after the parent page has loaded).
- Uses semantic class names where possible to reduce breakage when SoundCloud
  deploys new asset hashes.

Developer notes: `SELECTORS.md` (selector map) is for maintenance only and is
excluded from the store package. Preset catalog lives in `themes.css` and
`THEME_GROUPS` in `shared/settings.js`.

## Publishing

See [`store/LISTING.md`](store/LISTING.md) for Chrome Web Store listing copy,
privacy answers, screenshots, and packaging steps. Build a store zip with:

```bash
./scripts/pack.sh
```

Privacy policy: [`PRIVACY.md`](PRIVACY.md).
