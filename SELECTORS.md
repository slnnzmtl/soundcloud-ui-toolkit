# SoundCloud CSS selector map

Parsed from `https://soundcloud.com/` and its production assets on
2026-09-22. SoundCloud is client-rendered, so markup returned without running
JavaScript contains only the shell. The semantic class names below also occur
in the current JavaScript bundles.

## Best override surface

SoundCloud already maps most colors to CSS custom properties. Overriding these
on both `body.theme-light` and `body.theme-dark` is more resilient than
redeclaring every component rule.

| Area         | Current variables/selectors                                                               |
| ------------ | ----------------------------------------------------------------------------------------- |
| Surfaces     | `--surface-color`, `--background-surface-color`, `--highlight-color`                      |
| Text         | `--primary-color`, `--secondary-color`, `--font-primary-color`, `--font-secondary-color`  |
| Brand/accent | `--special-color`, `--font-special-color`                                                 |
| Links        | `--link-color`, `--link-standard-color`, `--link-primary-color`, `--link-secondary-color` |
| Buttons      | `--button-primary-*`, `--button-secondary-*`, `--button-tertiary-*`, `--button-special-*` |
| Inputs       | `--input-default-*`, `--input-placeholder-*`, `--input-focused-*`                         |
| Overlays     | `--overlay-color`, `--overlay-default-color`, `--imageBorder-color`                       |
| Typography   | `--font-main`, `--typography-*`                                                           |
| Spacing      | `--spacing-0_25x` through `--spacing-8x`                                                  |
| Radius       | `--borderRadiuses-4`, `--borderRadiuses-8`, `--borderRadiuses-10`, etc.                   |

## Stable semantic classes

| Component    | Useful selectors                                                                                               |
| ------------ | -------------------------------------------------------------------------------------------------------------- |
| App shell    | `#app`, `.l-container`, `.l-content`                                                                           |
| Header       | `.header`, `.header__inner`, `.header__link`, `.headerSearch__input`, `.header__userNavButton`                 |
| Track cards  | `.soundBadge__content`, `.soundBadge__artwork`, `.soundList__item`, `.soundTitle__title`                       |
| Tiles        | `.playableTile__artwork`, `.playableTile__image`, `.playableTile__descriptionContainer`                        |
| Track page   | `.sound__content`, `.sound__waveform`, `.sound__footer`, `.listenContent__inner`                               |
| Lists        | `.trackList__item`, `.searchList__item`, `.userSuggestionList__item`                                           |
| Waveform     | `.waveformWrapper__waveform`, `.waveform__layer`, `.fullHero__waveform`                                        |
| Player       | `.playControls__wrapper`, `.playControls__inner`, `.playControls__play`, `.playControls__timeline`             |
| Timeline     | `.playbackTimeline__progressBackground`, `.playbackTimeline__progressBar`, `.playbackTimeline__progressHandle` |
| Volume       | `.volume__sliderBackground`, `.volume__sliderProgress`, `.volume__sliderHandle`                                |
| Queue        | `.queue__panel`, `.queue__itemWrapper`, `.queueItemView__artworkImage`, `.queueItemView__title`                |
| Buttons      | `.sc-button`, `.sc-button-primary`, `.sc-button-secondary`, `.sc-button-tertiary`, `.sc-button-cta`            |
| Artwork      | `.sc-artwork`, `.sc-artwork-*`                                                                                 |
| Text helpers | `.sc-text-primary`, `.sc-text-secondary`, `.sc-text-special`, `.sc-text-link`                                  |

## Maintenance notes

- Prefer design tokens first, semantic classes second, and structural selectors
  such as `div > div:nth-child(...)` only as a last resort.
- Avoid asset hashes (`app-b80189d4c410fafce6d8.css`); SoundCloud changes them
  on each deployment.
- Chrome content styles are author-origin CSS. `!important` is used on theme
  tokens where SoundCloud may inject later rules with equal specificity.
- Color presets ship in `themes.css` as `html.scx-theme-*` overrides of the
  tokens above — not as selector rewrites in `styles.css` (layout only).
- Re-check selectors after a SoundCloud redesign. The date above identifies
  the snapshot this map was based on.
