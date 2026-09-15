import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["eslint/**/*.test.ts", "scripts/**/*.test.ts", "utils/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["eslint/**/*.ts", "scripts/**/*.ts", "utils/**/*.ts"],
      exclude: ["**/*.test.ts"],
      thresholds: {
        lines: 90.02,
        functions: 93.7,
        branches: 79.01,
        statements: 85.16,
        autoUpdate: true,
      },
    },
  },
});
