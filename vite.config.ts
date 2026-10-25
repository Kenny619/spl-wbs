import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

/** Phase 0 scaffold. The frozen UI is not a build input. */
export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    cssCodeSplit: false,
    assetsInlineLimit: 100000000,
  },
});
