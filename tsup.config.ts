import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    "eslint/pasika/index": "eslint/index.ts",
  },
  format: ["esm"],
  outDir: "dist",
  clean: true,
  dts: {
    // tsup injects baseUrl into the dts compiler config; TS 6.0 deprecates
    // baseUrl and errors on it unless ignoreDeprecations is set.
    compilerOptions: {
      ignoreDeprecations: "6.0",
    },
  },
  splitting: false,
  minify: false,
  target: "esnext",
  // The pasika presets ship the parser and the ESLint language blocks, so the
  // TypeScript parser and the ESLint language plugins they wire at runtime stay
  // external imports (never inlined). The parser is a runtime dependency; the
  // language plugins are peerDependencies that consumers already install.
  external: ["@typescript-eslint/parser", "@eslint/css", "@eslint/json", "@eslint/markdown"],
});
