import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["eslint/**/*.test.ts", "scripts/**/*.test.ts", "utils/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["eslint/**/*.ts", "scripts/**/*.ts", "utils/**/*.ts"],
      exclude: ["**/*.test.ts"],
      thresholds: {
        lines: 86.11,
        functions: 89.33,
        branches: 75.03,
        statements: 81.08,
        autoUpdate: true,
      },
    },
  },
});
