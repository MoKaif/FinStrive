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
        }
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        display: ["Outfit", "sans-serif"],
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
