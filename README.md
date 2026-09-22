# SoundCloud Style Overrides

A dependency-free Chrome Manifest V3 extension that overrides SoundCloud's
current design tokens and key semantic component styles.

## Install locally

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this directory.
5. Open or reload `https://soundcloud.com/`.

## Customize

Edit the `--scx-*` values at the top of `styles.css`, then click the extension's
**Reload** button on `chrome://extensions` and refresh SoundCloud.

The rest of the stylesheet maps those values to SoundCloud's own theme tokens.
`SELECTORS.md` records the production selectors found during inspection.

## Scope

- Runs only on `https://soundcloud.com/*`.
- Requests no permissions and runs no JavaScript.
- Covers the app shell, header, cards, buttons, forms, waveform progress,
  fixed player, and queue.
- Uses semantic class names and CSS variables to reduce breakage when
  SoundCloud deploys new asset hashes.
