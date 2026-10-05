import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["eslint/**/*.test.ts", "scripts/**/*.test.ts", "helpers/**/*.test.ts", "utils/**/*.test.ts"],
    maxWorkers: 8,
    coverage: {
      provider: "v8",
      include: ["eslint/**/*.ts", "scripts/**/*.ts", "helpers/**/*.ts", "utils/**/*.ts"],
      exclude: ["**/*.test.ts"],
      thresholds: {
        lines: 93.3,
        functions: 96.5,
        branches: 83.1,
        statements: 88.9,
        autoUpdate: (newThreshold, previousThreshold) =>
          Math.max(Number(String(previousThreshold)), Math.floor((newThreshold - 0.1) * 10) / 10),
      },
    },
  },
});
