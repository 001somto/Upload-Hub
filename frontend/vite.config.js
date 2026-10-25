// vite.config.js
// WHAT THIS FILE IS: the settings for Vite, the tool that runs the website on your
// computer ("npm run dev") and packages it for hosting ("npm run build").
// WHAT IT DOES: turns on two plugins - one so Vite understands React (JSX files),
// and one so Tailwind CSS can create the styles used across the site.

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // The website opens at http://localhost:5173 while you are developing.
    port: 5173,
  },
});
