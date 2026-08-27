import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    "cli/index": "cli/index.ts",
    "eslint/pasika/index": "eslint/pasika/index.ts",
  },
  format: ["esm"],
  outDir: "dist",
  clean: true,
  dts: true,
  splitting: false,
  minify: false,
  target: "esnext",
  external: [
    "commander",
    "zod",
    "eslint",
    "typescript",
    "@typescript-eslint/parser",
    "@eslint/css",
    "@eslint/css-tree",
    "@eslint/json",
    "@eslint/markdown",
  ],
});
