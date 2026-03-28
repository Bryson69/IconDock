import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Relative base so JS/CSS load correctly when the bundle is opened from the Designer iframe.
  base: "./",
  server: {
    proxy: {
      // Dev convenience: lets the frontend call the backend without CORS setup.
      "^/api": {
        target: "http://localhost:8787",
        changeOrigin: true
      }
    }
  }
});

