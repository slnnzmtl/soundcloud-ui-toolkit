# SoundCloud DOM snapshots

The `dom/` directory contains normalized desktop DOM trees for the distinct
SoundCloud page layouts that this extension styles:

- Home
- Discover
- Charts
- Search results
- Artist profile
- Track
- Playlist
- Stream while logged out
- Library while logged out

Snapshots retain element names, stable IDs/classes, accessibility attributes,
and normalized links. They intentionally omit text nodes, volatile attributes,
script/style contents, SVG internals, and the third-party OneTrust consent tree
to keep selector diffs useful.

Each file records both the top-level HTTP response and a capture status:

- `captured`: the requested public page rendered normally.
- `auth-required`: SoundCloud redirected to sign-in or returned its logged-out
  account shell.
- `soundcloud-error`: SoundCloud returned its own error page (for example,
  when entity pages reject the capture host).
- `capture-error`: the browser or capture script failed.

The error and authentication trees are retained intentionally. They make route
coverage explicit and prevent a SoundCloud error shell from being mistaken for
a valid profile, track, or playlist snapshot.

## Refresh

```bash
npm install --include=dev
npm run snapshot:dom
```

Captures use a 1440 × 1000 viewport, UTC, and no SoundCloud login. Review
`dom/metadata.json` after each run for final URLs, page titles, element counts,
HTTP/capture statuses, and partial-capture errors. The cookie consent dialog is
dismissed before serialization.
