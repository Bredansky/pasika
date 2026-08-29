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
  // The pasika presets ship the language blocks, so the ESLint language
  // plugins they wire at runtime stay external imports (never inlined). They
  // are declared as peerDependencies; consumers already install them.
  external: ["@eslint/css", "@eslint/json", "@eslint/markdown"],
});
