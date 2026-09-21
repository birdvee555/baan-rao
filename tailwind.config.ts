import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // พื้นหลังและตัวอักษร: พาสเทลใช้เป็นพื้นเท่านั้น ตัวอักษรใช้สีเข้ม
        cream: "#fbf9f2",
        ink: { DEFAULT: "#213a2d", soft: "#586e60" },
        mint: {
          50: "#f2fbf5",
          100: "#e1f6e8",
          200: "#c5ecd3",
          300: "#9bddb6",
          400: "#6dca95",
          500: "#45b378",
          600: "#2f9a63",
          700: "#257c50",
        },
        air: { 50: "#f2f9fd", 100: "#e0f0fa", 200: "#c2e2f4", 300: "#9ccbe6" },
        rose: { soft: "#fdeceb", ink: "#a4413a" },
      },
      fontFamily: {
        sans: ['"Noto Sans Thai"', '"Sarabun"', "system-ui", "sans-serif"],
      },
      keyframes: {
        pop: {
          "0%": { transform: "scale(.8)" },
          "60%": { transform: "scale(1.12)" },
          "100%": { transform: "scale(1)" },
        },
        bump: {
          "0%": { transform: "scale(1)" },
          "40%": { transform: "scale(1.3)" },
          "100%": { transform: "scale(1)" },
        },
        slide: {
          from: { transform: "translateY(28px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        fade: { from: { opacity: "0" }, to: { opacity: "1" } },
      },
      animation: {
        pop: "pop .28s ease-out",
        bump: "bump .2s ease-out",
        slide: "slide .22s ease-out",
        fade: "fade .18s ease-out",
      },
    },
  },
  plugins: [],
};
export default config;
