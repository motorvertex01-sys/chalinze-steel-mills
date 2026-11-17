import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:4173",
        changeOrigin: true,
        configure(proxy) {
          proxy.on("proxyReq", (proxyRequest, request) => {
            const origin = request.headers.origin;
            const host = request.headers.host;
            if (!origin || !host) return;
            try {
              if (new URL(origin).host.toLowerCase() === host.toLowerCase()) {
                proxyRequest.setHeader("origin", "http://127.0.0.1:4173");
              }
            } catch {
              // Invalid origins remain unchanged and are rejected by the API.
            }
          });
        },
      },
      "/uploads": "http://127.0.0.1:4173",
    },
  },
  build: {
    chunkSizeWarningLimit: 550,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("/node_modules/three/")) return "three";
          if (id.includes("/node_modules/")) return "vendor";
        },
      },
    },
  },
});
