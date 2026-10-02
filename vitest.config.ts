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
        lines: 93.22,
        functions: 96.36,
        branches: 82.87,
        statements: 88.88,
        autoUpdate: true,
      },
    },
  },
});
