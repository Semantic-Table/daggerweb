import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 5174 },
  // Rapier (wasm) est chargé via un top-level await -> cible moderne requise.
  build: { target: "esnext" },
  esbuild: { target: "esnext" },
});
