import { resolve } from "node:path";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

/** Separate bundled managed app; normal dist/index.html stays read-only. */
export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    outDir: "dist-managed",
    cssCodeSplit: false,
    assetsInlineLimit: 100000000,
    rollupOptions: { input: resolve(process.cwd(), "managed.html") },
  },
});
