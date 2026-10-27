import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["eslint/**/*.test.ts", "scripts/**/*.test.ts", "helpers/**/*.test.ts", "utils/**/*.test.ts"],
    maxWorkers: 4,
    coverage: {
      provider: "v8",
      include: ["eslint/**/*.ts", "scripts/**/*.ts", "helpers/**/*.ts", "utils/**/*.ts"],
      exclude: ["**/*.test.ts"],
      thresholds: {
        lines: 94,
        functions: 97.1,
        branches: 83.9,
        statements: 89.3,
        autoUpdate: (newThreshold, previousThreshold) =>
          Math.max(Number(String(previousThreshold)), Math.floor((newThreshold - 0.1) * 10) / 10),
      },
    },
  },
});
