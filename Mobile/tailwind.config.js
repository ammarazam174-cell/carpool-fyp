/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.tsx", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#14532D",
        primaryDark: "#0F3D21",
        primaryMid: "#166534",
        secondary: "#16A34A",
        accent: "#D4AF37",
        accentDark: "#A88A2B",
        bgSoft: "#F3F6F4",
        inputBg: "#F9FAFB",
        textDark: "#111827",
        textMuted: "#6B7280",
      },
    },
  },
  plugins: [],
};
