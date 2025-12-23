import type { Config } from "tailwindcss";

// Tailwind v4 works with CSS-first setup, but we keep a config file so:
// - future plugins/extensions have a single home
// - content paths are explicit for long-term maintainability
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;


