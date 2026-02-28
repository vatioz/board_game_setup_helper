import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: path.resolve(__dirname, "../backend/static"),
    emptyOutDir: true,
  },
  server: {
    // Proxy API calls to the FastAPI backend during local dev
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
