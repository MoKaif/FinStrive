/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    screens: {
      sm: "480px",
      md: "768px",
      lg: "1020px",
      xl: "1440px",
    },
    extend: {
      colors: {
        lightBlue: "hsl(22, 80%, 43%)",
        darkBlue: "hsl(22, 80%, 43%)",
        lightGreen: "hsl(250, 47%, 33%)",
      },
      fontFamily: {
        spartan: ["Spartan-MB-SemiBold"],
      },
      spacing: {
        180: "32rem",
      },
    },
  },
  plugins: [],
};
