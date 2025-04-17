import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { TanStackRouterVite } from "npm:@tanstack/router-plugin/vite";
import deno from "@deno/vite-plugin";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // Please make sure that '@tanstack/router-plugin' is passed before '@vitejs/plugin-react'
    TanStackRouterVite({ target: "react", autoCodeSplitting: true }),
    deno(),
    react()
  ],
  server: {
    port: 3000
  },
  build: {
    target: "esnext",
    chunkSizeWarningLimit: 1000000000,
    outDir: "build"
  }
});
