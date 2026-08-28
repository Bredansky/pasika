import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    "eslint/pasika/index": "eslint/index.ts",
  },
  format: ["esm"],
  outDir: "dist",
  clean: true,
  dts: true,
  splitting: false,
  minify: false,
  target: "esnext",
  external: [
    "eslint",
    "typescript",
    "@typescript-eslint/parser",
    "@eslint/css",
    "@eslint/css-tree",
    "@eslint/json",
    "@eslint/markdown",
  ],
});
