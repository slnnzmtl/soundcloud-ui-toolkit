/**
 * Shared settings catalogs (constants) for popup + content scripts.
 * No build step — loaded as a plain script before apply + storage.
 */
(function (global) {
  const S = (global.ScxSettings = global.ScxSettings || {});
  const STORAGE_KEY = "scxSettings";
  const CUSTOM_THEME_STYLE_ID = "scx-custom-theme-vars";
  const FONT_STYLE_ID = "scx-font";
  const ENABLED_CLASS = "scx-enabled";
  const FULL_WIDTH_CLASS = "scx-full-width";
  const ENLARGED_QUEUE_CLASS = "scx-enlarged-queue";
  const HIDE_ARTIST_TOOLS_CLASS = "scx-hide-artist-tools";
  const HIDE_AVATAR_PLACEHOLDER_CLASS = "scx-hide-avatar-placeholder";
  const HERO_BG_CLASS = "scx-hero-bg";
  const HERO_WAVEFORM_CLASS = "scx-hero-waveform";
  const THEME_CLASS = "scx-theme";
  const RADIUS_CLASS = "scx-radius";
  const FONT_CLASS = "scx-font";
  const NATIVE_DARK_CLASS = "scx-native-dark";
  const NATIVE_SCHEME_KEY = "scxNativeScheme";
  const RADII = Object.freeze([
    "default",
    "none",
    "small",
    "medium",
    "large",
    "xlarge",
  ]);
  const RADIUS_LABELS = Object.freeze({
    default: "Default",
    none: "None",
    small: "Small",
    medium: "Medium",
    large: "Large",
    xlarge: "X-Large",
  });
  /**
   * Font catalog. axes: Google CSS2 axis list; null = 400/600/700; "" = default style only.
   * category: popup optgroup (see FONT_CATEGORIES).
   */
  const FONT_CATEGORIES = Object.freeze([
    Object.freeze({ id: "default", label: "Default" }),
    Object.freeze({ id: "sans", label: "Sans" }),
    Object.freeze({ id: "mono", label: "Mono" }),
    Object.freeze({ id: "pixel", label: "Pixel" }),
    Object.freeze({ id: "display", label: "Display" }),
    Object.freeze({ id: "script", label: "Script" }),
  ]);
  const FONTS = Object.freeze([
    Object.freeze({
      id: "default",
      label: "Default",
      family: null,
      category: "default",
    }),
    Object.freeze({
      id: "comfortaa",
      label: "Comfortaa",
      family: "Comfortaa",
      category: "sans",
    }),
    Object.freeze({
      id: "inter",
      label: "Inter",
      family: "Inter",
      category: "sans",
    }),
    Object.freeze({
      id: "lato",
      label: "Lato",
      family: "Lato",
      axes: "wght@400;700",
      category: "sans",
    }),
    Object.freeze({
      id: "montserrat",
      label: "Montserrat",
      family: "Montserrat",
      category: "sans",
    }),
    Object.freeze({
      id: "open-sans",
      label: "Open Sans",
      family: "Open Sans",
      category: "sans",
    }),
    Object.freeze({
      id: "poppins",
      label: "Poppins",
      family: "Poppins",
      category: "sans",
    }),
    Object.freeze({
      id: "roboto",
      label: "Roboto",
      family: "Roboto",
      category: "sans",
    }),
    Object.freeze({
      id: "anonymous-pro",
      label: "Anonymous Pro",
      family: "Anonymous Pro",
      axes: "wght@400;700",
      category: "mono",
    }),
    Object.freeze({
      id: "cousine",
      label: "Cousine",
      family: "Cousine",
      axes: "wght@400;700",
      category: "mono",
    }),
    Object.freeze({
      id: "fira-code",
      label: "Fira Code",
      family: "Fira Code",
      category: "mono",
    }),
    Object.freeze({
      id: "fira-mono",
      label: "Fira Mono",
      family: "Fira Mono",
      axes: "wght@400;700",
      category: "mono",
    }),
    Object.freeze({
      id: "ibm-plex-mono",
      label: "IBM Plex Mono",
      family: "IBM Plex Mono",
      category: "mono",
    }),
    Object.freeze({
      id: "jetbrains-mono",
      label: "JetBrains Mono",
      family: "JetBrains Mono",
      category: "mono",
    }),
    Object.freeze({
      id: "noto-sans-mono",
      label: "Noto Sans Mono",
      family: "Noto Sans Mono",
      category: "mono",
    }),
    Object.freeze({
      id: "overpass-mono",
      label: "Overpass Mono",
      family: "Overpass Mono",
      category: "mono",
    }),
    Object.freeze({
      id: "pt-mono",
      label: "PT Mono",
      family: "PT Mono",
      axes: "",
      category: "mono",
    }),
    Object.freeze({
      id: "roboto-mono",
      label: "Roboto Mono",
      family: "Roboto Mono",
      category: "mono",
    }),
    Object.freeze({
      id: "source-code-pro",
      label: "Source Code Pro",
      family: "Source Code Pro",
      category: "mono",
    }),
    Object.freeze({
      id: "ubuntu-mono",
      label: "Ubuntu Mono",
      family: "Ubuntu Mono",
      axes: "wght@400;700",
      category: "mono",
    }),
    Object.freeze({
      id: "handjet",
      label: "Handjet",
      family: "Handjet",
      category: "pixel",
    }),
    Object.freeze({
      id: "jersey-10",
      label: "Jersey 10",
      family: "Jersey 10",
      axes: "",
      category: "pixel",
    }),
    Object.freeze({
      id: "pixelify",
      label: "Pixelify",
      family: "Pixelify Sans",
      category: "pixel",
    }),
    Object.freeze({
      id: "tiny5",
      label: "Tiny5",
      family: "Tiny5",
      axes: "",
      category: "pixel",
    }),
    Object.freeze({
      id: "vt323",
      label: "VT323",
      family: "VT323",
      axes: "",
      category: "pixel",
    }),
    Object.freeze({
      id: "dela-gothic-one",
      label: "Dela Gothic One",
      family: "Dela Gothic One",
      axes: "",
      category: "display",
    }),
    Object.freeze({
      id: "forum",
      label: "Forum",
      family: "Forum",
      axes: "",
      category: "display",
    }),
    Object.freeze({
      id: "oswald",
      label: "Oswald",
      family: "Oswald",
      category: "display",
    }),
    Object.freeze({
      id: "playfair-display",
      label: "Playfair Display",
      family: "Playfair Display",
      category: "display",
    }),
    Object.freeze({
      id: "poiret-one",
      label: "Poiret One",
      family: "Poiret One",
      axes: "",
      category: "display",
    }),
    Object.freeze({
      id: "prata",
      label: "Prata",
      family: "Prata",
      axes: "",
      category: "display",
    }),
    Object.freeze({
      id: "russo-one",
      label: "Russo One",
      family: "Russo One",
      axes: "",
      category: "display",
    }),
    Object.freeze({
      id: "tektur",
      label: "Tektur",
      family: "Tektur",
      category: "display",
    }),
    Object.freeze({
      id: "unbounded",
      label: "Unbounded",
      family: "Unbounded",
      category: "display",
    }),
    Object.freeze({
      id: "yanone-kaffeesatz",
      label: "Yanone Kaffeesatz",
      family: "Yanone Kaffeesatz",
      category: "display",
    }),
    Object.freeze({
      id: "yeseva-one",
      label: "Yeseva One",
      family: "Yeseva One",
      axes: "",
      category: "display",
    }),
    Object.freeze({
      id: "caveat",
      label: "Caveat",
      family: "Caveat",
      category: "script",
    }),
    Object.freeze({
      id: "lobster",
      label: "Lobster",
      family: "Lobster",
      axes: "",
      category: "script",
    }),
    Object.freeze({
      id: "pacifico",
      label: "Pacifico",
      family: "Pacifico",
      axes: "",
      category: "script",
    }),
  ]);
  const HERO_BACKGROUND_STYLES = Object.freeze([
    "default",
    "accent",
    "text",
    "transparent",
    "cover",
  ]);
  const HERO_WAVEFORM_STYLES = Object.freeze(["default", "accent", "text"]);
  const THEME_GROUPS = Object.freeze([
    {
      id: "classic",
      label: "Classic",
      column: "left",
      themes: Object.freeze([
        {
          id: "default",
          label: "Default",
          swatches: Object.freeze(["#f2f2f2", "#ff5500"]),
        },
        {
          id: "midnight",
          label: "Midnight",
          swatches: Object.freeze(["#0b0d12", "#141821", "#ff5a1f"]),
        },
        {
          id: "oled",
          label: "OLED",
          swatches: Object.freeze(["#000000", "#141414", "#ff5a1f"]),
        },
        {
          id: "slate",
          label: "Slate",
          swatches: Object.freeze(["#0e1218", "#161c26", "#ff5a1f"]),
        },
      ]),
    },
    {
      id: "accent",
      label: "Accent",
      column: "right",
      themes: Object.freeze([
        {
          id: "matrix",
          label: "Matrix",
          swatches: Object.freeze(["#000000", "#001a00", "#00ff41"]),
        },
        {
          id: "fallout",
          label: "Fallout",
          swatches: Object.freeze(["#050505", "#1a1400", "#ffcc00"]),
        },
        {
          id: "cyberpunk",
          label: "Cyberpunk",
          swatches: Object.freeze(["#050505", "#bc13fe", "#00ff9f"]),
        },
        {
          id: "purple",
          label: "Purple",
          swatches: Object.freeze(["#0f071e", "#2e1065", "#a78bfa"]),
        },
        {
          id: "tide",
          label: "Tide",
          swatches: Object.freeze(["#050f0f", "#0a1a1a", "#0df2d0"]),
        },
        {
          id: "blood",
          label: "Blood",
          swatches: Object.freeze(["#060606", "#ff2b2b", "#db0000"]),
        },
        {
          id: "azure",
          label: "Azure",
          swatches: Object.freeze(["#061018", "#0b1a28", "#3d8bfd"]),
        },
        {
          id: "flamingo",
          label: "Flamingo",
          swatches: Object.freeze(["#140810", "#1f0e18", "#ff4fa3"]),
        },
      ]),
    },
    {
      id: "style",
      label: "Style",
      column: "left",
      themes: Object.freeze([
        {
          id: "minimal",
          label: "Minimal",
          swatches: Object.freeze(["#171717", "#262626", "#e5e5e5"]),
        },
        {
          id: "frost",
          label: "Frost",
          swatches: Object.freeze(["#090b0f", "#13161b", "#3a8cff"]),
        },
        {
          id: "noir",
          label: "Noir",
          swatches: Object.freeze(["#0a0a0a", "#141414", "#fafafa"]),
        },
        {
          id: "sand",
          label: "Sand",
          swatches: Object.freeze(["#1c1917", "#292524", "#e7b56c"]),
        },
        {
          id: "carbon",
          label: "Carbon",
          swatches: Object.freeze(["#121417", "#1a1d22", "#8ab4ff"]),
        },
        {
          id: "espresso",
          label: "Espresso",
          swatches: Object.freeze(["#1a1412", "#241c18", "#d4a574"]),
        },
      ]),
    },
    {
      id: "homage",
      label: "Homage",
      column: "right",
      themes: Object.freeze([
        {
          id: "grove",
          label: "Grove",
          swatches: Object.freeze(["#121212", "#181818", "#1db954"]),
        },
        {
          id: "blush",
          label: "Blush",
          swatches: Object.freeze(["#12242e", "#e4a2b1", "#fbe2a7"]),
        },
        {
          id: "blurple",
          label: "Blurple",
          swatches: Object.freeze(["#1e1f22", "#2b2d31", "#5865f2"]),
        },
        {
          id: "vinyl",
          label: "Vinyl",
          swatches: Object.freeze(["#0f0f0f", "#1a1a1a", "#ff0033"]),
        },
        {
          id: "harbor",
          label: "Harbor",
          swatches: Object.freeze(["#0d1110", "#161c1a", "#1da09a"]),
        },
      ]),
    },
  ]);

  const PRESET_THEMES = Object.freeze(
    THEME_GROUPS.flatMap((group) => group.themes.map((theme) => theme.id))
  );

  const THEMES = Object.freeze([...PRESET_THEMES, "custom"]);
  const MAX_CUSTOM_PRESETS = 6;
  const CUSTOM_PRESET_LABEL_MAX_LENGTH = 32;

  const CUSTOM_PALETTE_KEYS = Object.freeze([
    "background",
    "surface",
    "text",
    "accent",
  ]);

  /** Stock SoundCloud dark (html.scx-theme-default.scx-native-dark), not Midnight. */
  const DEFAULT_CUSTOM_PALETTE = Object.freeze({
    background: "#111111",
    surface: "#181818",
    text: "#f2f2f2",
    accent: "#ff5500",
  });

  const DEFAULTS = Object.freeze({
    enabled: true,
    fullWidth: true,
    enlargedQueue: true,
    hideArtistTools: false,
    hideAvatarPlaceholder: true,
    heroBackgroundStyle: "default",
    heroWaveformStyle: "default",
    theme: "default",
    radius: "medium",
    font: "default",
    customPalette: DEFAULT_CUSTOM_PALETTE,
    customPresets: Object.freeze([]),
  });

  /** Setting key → layout class. Boolean coerce/persist/dirty-check and content toggles share this. */
  const FEATURE_CLASS_BY_SETTING = Object.freeze({
    enabled: ENABLED_CLASS,
    fullWidth: FULL_WIDTH_CLASS,
    enlargedQueue: ENLARGED_QUEUE_CLASS,
    hideArtistTools: HIDE_ARTIST_TOOLS_CLASS,
    hideAvatarPlaceholder: HIDE_AVATAR_PLACEHOLDER_CLASS,
  });

  const BOOLEAN_SETTING_KEYS = Object.freeze(
    Object.keys(FEATURE_CLASS_BY_SETTING)
  );

  Object.assign(S, {
    STORAGE_KEY,
    CUSTOM_THEME_STYLE_ID,
    FONT_STYLE_ID,
    NATIVE_SCHEME_KEY,
    FEATURE_CLASS_BY_SETTING,
    BOOLEAN_SETTING_KEYS,
    HERO_BG_CLASS,
    HERO_WAVEFORM_CLASS,
    HERO_BACKGROUND_STYLES,
    HERO_WAVEFORM_STYLES,
    THEME_CLASS,
    RADIUS_CLASS,
    FONT_CLASS,
    NATIVE_DARK_CLASS,
    THEME_GROUPS,
    THEMES,
    FONTS,
    FONT_CATEGORIES,
    CUSTOM_PALETTE_KEYS,
    DEFAULT_CUSTOM_PALETTE,
    MAX_CUSTOM_PRESETS,
    CUSTOM_PRESET_LABEL_MAX_LENGTH,
    RADII,
    RADIUS_LABELS,
    DEFAULTS,
  });
})(typeof globalThis !== "undefined" ? globalThis : self);
