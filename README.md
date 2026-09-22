# SoundCloud Style Overrides

A dependency-free Chrome Manifest V3 extension that overrides SoundCloud's
layout and styles. Settings live in a toolbar popup control center.

## Install locally

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this directory.
5. Open or reload `https://soundcloud.com/`.

## Control center

Click the extension icon in the Chrome toolbar to open the **Control center**.

| Setting     | Default | Effect                                      |
| ----------- | ------- | ------------------------------------------- |
| Full width  | On      | Widens the main layout (`.l-container`, etc.) |

Preferences sync via `chrome.storage.sync` and apply immediately on open
SoundCloud tabs. More settings (themes, features) will land here later.

## Customize theme tokens

Edit the `--scx-*` values at the top of `styles.css`, then click the extension's
**Reload** button on `chrome://extensions` and refresh SoundCloud.

The rest of the stylesheet maps those values to SoundCloud's own theme tokens.
`SELECTORS.md` records the production selectors found during inspection.

## Scope

- Runs only on `https://soundcloud.com/*`.
- Requests the `storage` permission for control-center settings.
- Covers the app shell, header, cards, buttons, forms, waveform progress,
  fixed player, and queue.
- Uses semantic class names and CSS variables to reduce breakage when
  SoundCloud deploys new asset hashes.
