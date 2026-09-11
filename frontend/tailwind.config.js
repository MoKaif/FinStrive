/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Premium Palette
        primary: {
          light: "#818cf8", // Indigo 400
          DEFAULT: "#6366f1", // Indigo 500
          dark: "#4f46e5", // Indigo 600
        },
        secondary: {
          light: "#38bdf8", // Sky 400
          DEFAULT: "#0ea5e9", // Sky 500
        },
        accent: {
          light: "#f472b6", // Pink 400
          DEFAULT: "#ec4899", // Pink 500
        },
        background: {
          light: "#f8fafc", // Slate 50
          dark: "#020617", // Slate 950 (Darker, richer)
          card: "#1e293b", // Slate 800
        },
        text: {
          primary: "#f8fafc", // Slate 50
          secondary: "#94a3b8", // Slate 400
          muted: "#64748b", // Slate 500
        },
        // FinStrive brand kit. Keep these canonical values aligned with the
        // reference board and use the additional shades only for hierarchy.
        term: {
          ink: "#0B0B0C",    // canonical background
          panel: "#151517",  // intermediate surface
          raised: "#1F1F23", // canonical surface / hover
          rule: "#303036",   // hairlines
          text: "#E5E7EB",   // canonical text
          muted: "#9CA3AF",
          dim: "#737B89",
          accent: "#F59E0B", // canonical primary
          gain: "#10B981",   // canonical positive
          loss: "#EF4444",   // canonical negative
          // Categorical slots for asset classes. Validated as a set against
          // the panel surface for lightness, chroma, CVD separation and
          // contrast; do not re-order or substitute individually.
          s1: "#3987e5", // Mutual Funds
          s2: "#d95926", // Stocks & ETFs
          s3: "#199e70", // REITs & InvITs
          s4: "#c98500", // PPF
        },
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        display: ["Outfit", "sans-serif"],
        mono: ['"IBM Plex Mono"', "ui-monospace", "SFMono-Regular", "monospace"],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'pulse-slow': 'pulse 3s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      spacing: {
        180: "32rem",
      },
    },
  },
  plugins: [],
};
