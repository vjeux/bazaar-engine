import { defineConfig } from "vite";
import { configDefaults } from "vitest/config";

export default defineConfig({
  test: {
    exclude: ["src/wip_peggy_parser/*", ...configDefaults.exclude],
  },
});
