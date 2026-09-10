import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["eslint/**/*.test.ts", "scripts/**/*.test.ts", "utils/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["eslint/**/*.ts", "scripts/**/*.ts", "utils/**/*.ts"],
      exclude: ["**/*.test.ts"],
      thresholds: {
        lines: 86.3,
        functions: 89.44,
        branches: 75.22,
        statements: 81.23,
        autoUpdate: true,
      },
    },
  },
});
