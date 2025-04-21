import { defineConfig } from "vite";
import { configDefaults } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  test: {
    exclude: ["src/wip_peggy_parser/*", ...configDefaults.exclude],
  },
  plugins: [tsconfigPaths()],
});
