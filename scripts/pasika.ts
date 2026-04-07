#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderClaude } from "../claude/scripts/render-settings.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot =
  path.basename(path.dirname(__dirname)) === "dist" ? path.resolve(__dirname, "../..") : path.resolve(__dirname, "..");

const args = process.argv.slice(2);

const helpText = `pasika

Usage:
  pasika claude [--target-dir <path>] [--force]

Platforms:
  claude

Examples:
  npx pasika claude
  npx pasika claude --force

Behavior:
  merges into existing .claude/settings.json by default
  replaces it only when --force is passed
`;

const getFlagValue = (flag: string): string | undefined => {
  const index = args.indexOf(flag);
  if (index === -1) {
    return undefined;
  }

  return args[index + 1];
};

const hasFlag = (flag: string): boolean => args.includes(flag);

const platform = args[0];

if (!platform || hasFlag("--help") || hasFlag("-h")) {
  process.stdout.write(helpText);
  process.exit(platform ? 0 : 1);
}

const targetDir = path.resolve(process.cwd(), getFlagValue("--target-dir") ?? ".");
const force = hasFlag("--force");

const run = async (): Promise<string[]> => {
  switch (platform) {
    case "claude":
      return renderClaude(targetDir, force, packageRoot);
    default:
      throw new Error(`Unknown platform: ${platform}`);
  }
};

try {
  const outputs = await run();
  process.stdout.write(`Initialized ${platform} in ${targetDir}\n`);
  for (const output of outputs) {
    process.stdout.write(`Wrote ${output}\n`);
  }
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.stderr.write(helpText);
  process.exit(1);
}
