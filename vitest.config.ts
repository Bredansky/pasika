import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["eslint/**/*.test.ts", "scripts/**/*.test.ts", "helpers/**/*.test.ts", "utils/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["eslint/**/*.ts", "scripts/**/*.ts", "helpers/**/*.ts", "utils/**/*.ts"],
      exclude: ["**/*.test.ts"],
      thresholds: {
        lines: 91.77,
        functions: 95.81,
        branches: 80.26,
        statements: 86.92,
        autoUpdate: true,
      },
    },
  },
});
