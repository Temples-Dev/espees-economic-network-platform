import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// The web app runs on :5173 in dev and proxies /api to the Django backend on
// the default manage.py runserver port. The backend also trusts this origin
// via CORS (DEBUG allow-all), and production serves both behind the proxy.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
});
