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
        // Holdings terminal. A colder, flatter ground than the indigo/glass
        // system above, so dense financial tables read as a statement rather
        // than as stacked dashboard cards.
        term: {
          ink: "#05070A",    // page
          panel: "#0C1015",  // block surface
          raised: "#11161D", // hover / header rows
          rule: "#1C232B",   // hairlines
          text: "#E6E9EC",
          muted: "#7E8994",  // 5.4:1 on panel
          dim: "#67727E",    // supplementary labels only
          accent: "#E8A33D", // structural: active state, statement date
          gain: "#46C68C",
          loss: "#E8635F",
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
