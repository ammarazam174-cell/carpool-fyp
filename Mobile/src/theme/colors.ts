export const COLORS = {
  // Brand (Saffar logo)
  primary:     "#14532D",
  primaryMid:  "#166534",
  primaryDark: "#0F3D21",
  accent:      "#22C55E",
  accentSoft:  "rgba(34,197,94,0.15)",
  accentEdge:  "rgba(34,197,94,0.40)",

  // Dark green surfaces (matches Login/Signup)
  bg:        "#052e16",
  card:      "#064e3b",
  cardAlt:   "#065f46",
  border:    "#047857",

  // Text
  textLight: "#ECFDF5",
  textMuted: "#A7F3D0",
  textDim:   "#6EE7B7",

  // Quick-action palette — green-forward
  blue:   "#166534",
  green:  "#22C55E",
  violet: "#15803D",
  cyan:   "#10B981",
  slate:  "#14532D",

  // Stat accents (green-leaning, one warm contrast)
  amber:  "#F59E0B",
  red:    "#EF4444",

  // Status
  dangerBg:     "#450A0A",
  dangerBorder: "#7F1D1D",
  dangerText:   "#FCA5A5",
} as const;

export type ColorKey = keyof typeof COLORS;
