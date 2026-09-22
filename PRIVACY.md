# Privacy Policy — SoundCloud Wide

**Last updated:** 2026-09-22

SoundCloud Wide (“the extension”) is a Chrome browser extension that widens
SoundCloud’s main layout and queue on `https://soundcloud.com/`.

## Data we collect

The extension does **not** collect personal information, browsing history,
audio content, account credentials, or analytics.

The only data stored are two boolean preferences chosen in the toolbar popup:

- Enlarged layout (on/off)
- Enlarged queue (on/off)

These values are saved with Chrome’s `chrome.storage.sync` API so they can sync
across Chrome browsers signed into the same Google account. Chrome manages that
sync; the extension authors do not operate a backend that receives this data.

## Data we do not collect

- No analytics or telemetry
- No remote configuration or remotely hosted code
- No cookies set by the extension
- No transmission of SoundCloud page content to third parties

## Permissions

| Permission / host          | Purpose |
| -------------------------- | ------- |
| `storage`                  | Persist the two toggle preferences |
| `scripting`                | Inject layout styles into SoundCloud’s same-origin player iframe |
| `webNavigation`            | Detect when that iframe is created or navigated |
| `https://soundcloud.com/*` | Apply layout CSS only on SoundCloud |

## Sharing and sale of data

We do not sell, rent, or share user data. The extension has no advertising SDK
and no third-party trackers.

## Changes

If this policy changes, the “Last updated” date will be revised and the new
text will be published in this repository file.

## Contact

Questions about privacy: open an issue on the project repository at
https://github.com/slnnzmtl/soundcloud-wide
