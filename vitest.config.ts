import path from "node:path";
import { defineConfig, ViteUserConfig } from "vitest/config";

export type Runtime = "node" | "deno" | "bun";

export function getRuntime(): Runtime {
  if ("bun" in process.versions) return "bun";
  if ("deno" in process.versions) return "deno";

  return "node";
}

export function getPoolOptions(runtime: Runtime): ViteUserConfig["test"] {
  if (runtime === "node") {
    return {
      pool: "threads",
      poolOptions: {
        threads: {
          singleThread: true,
          minThreads: 2,
          maxThreads: 10
        }
      }
    };
  }

  return {
    pool: "vitest-in-process-pool",
    coverage: {
      enabled: false
    },
    reporters: [["default", { summary: false }]]
  };
}

export default defineConfig({
  test: {
    ...getPoolOptions(getRuntime()),
    include: ["**/*.test.ts"]
  }
});
