import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import electron from "vite-plugin-electron";
import renderer from "vite-plugin-electron-renderer";

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: "src/main/index.ts",
        onstart(o) { o.startup(); },
        vite: { build: { outDir: "dist-electron/main", sourcemap: true } }
      },
      {
        entry: "src/preload/index.ts",
        onstart(o) { o.reload(); },
        vite: { build: { outDir: "dist-electron/preload", sourcemap: true } }
      }
    ]),
    renderer()
  ]
});
