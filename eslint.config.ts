import type { Linter } from "eslint";
import { pasikaConfig } from "./eslint/pasika/index.js";

const config: Linter.Config[] = [
  pasikaConfig,
  { ignores: ["dist/**", "node_modules/**", "docs/**"] },
];

export default config;
