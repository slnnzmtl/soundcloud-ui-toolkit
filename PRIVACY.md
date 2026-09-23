# Privacy Policy — SoundCloud UI Toolkit

**Last updated:** 2026-09-22

SoundCloud UI Toolkit (“the extension”) is a Chrome browser extension that
customizes SoundCloud’s layout, queue, appearance, and rounding on
`https://soundcloud.com/`.

## Data we collect

The extension does **not** collect personal information, browsing history,
audio content, account credentials, or analytics.

The only data stored are preferences chosen in the toolbar popup:

- Enabled (master on/off for all styles)
- Enlarged layout (on/off)
- Enlarged queue (on/off)
- Rounding scale (`default`, `none`, `sm`, `md`, `lg`, or `xl`)
- Appearance preset id (`default`, `midnight`, `oled`, `slate`, `matrix`, `fallout`, `cyberpunk`, `purple`, `tide`, `blood`, `minimal`, `frost`, `grove`, or `blush`)

These values are saved with Chrome’s `chrome.storage.sync` API so they can sync
across Chrome browsers signed into the same Google account. Chrome manages that
sync; the extension authors do not operate a backend that receives this data.

Separately, `chrome.storage.local` may hold a short-lived native light/dark flag
(`scxNativeScheme`) so the toolbar popup’s Default chrome can match SoundCloud’s
current `body.theme-light` / `body.theme-dark`. That value does not sync and is
not personal data.

## Data we do not collect

- No analytics or telemetry
- No remote configuration or remotely hosted code
- No cookies set by the extension
- No transmission of SoundCloud page content to third parties

## Permissions

| Permission / host          | Purpose |
| -------------------------- | ------- |
| `storage`                  | Persist the master enable toggle, layout toggles, rounding scale, and the appearance preset id; also a local native light/dark flag for Default popup chrome |
| `scripting`                | Inject layout and theme styles into SoundCloud’s same-origin player iframe |
| `webNavigation`            | Detect when that iframe is created or navigated |
| `https://soundcloud.com/*` | Apply CSS only on SoundCloud |

## Sharing and sale of data

We do not sell, rent, or share user data. The extension has no advertising SDK
and no third-party trackers.

## Changes

If this policy changes, the “Last updated” date will be revised and the new
text will be published in this repository file.

## Contact

Questions about privacy: open an issue on the project repository at
https://github.com/slnnzmtl/soundcloud-wide
