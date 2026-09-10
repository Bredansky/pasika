import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["eslint/**/*.test.ts", "scripts/**/*.test.ts", "utils/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["eslint/**/*.ts", "scripts/**/*.ts", "utils/**/*.ts"],
      exclude: ["**/*.test.ts"],
      thresholds: {
        lines: 87.08,
        functions: 90.09,
        branches: 76.14,
        statements: 82.01,
        autoUpdate: true,
      },
    },
  },
});
