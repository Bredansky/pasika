import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    "eslint/pasika/index": "eslint/index.ts",
    "helpers/cn": "helpers/cn.ts",
    "helpers/http-error": "helpers/http-error.ts",
    "helpers/response-envelope": "helpers/response-envelope.ts",
    "helpers/zod-fetch": "helpers/zod-fetch.ts",
    "helpers/with-response": "helpers/with-response.ts",
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
  // The helper entries share one `HttpError`, so they emit it as a shared chunk
  // instead of inlining a copy each. A route's `instanceof` check has to see the
  // class the helper threw, and two copies would always fail it.
  splitting: true,
  minify: false,
  target: "esnext",
  // The pasika presets ship the parser and the ESLint language blocks, so the
  // TypeScript parser and the ESLint language plugins they wire at runtime stay
  // external imports (never inlined). The parser is a runtime dependency; the
  // language plugins are peerDependencies that consumers already install.
  // The helpers' own imports stay external for the same reason: a consumer's zod,
  // clsx, tailwind-merge, and next are the peer installations the helpers run on.
  external: [
    "@typescript-eslint/parser",
    "@eslint/css",
    "@eslint/json",
    "@eslint/markdown",
    "clsx",
    "tailwind-merge",
    "zod",
    "next",
    "next/server",
  ],
});
