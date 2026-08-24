/**
 * Generates `vulyk.json` from the typed `vulyk.config.ts` source.
 *
 * Run with: npx tsx scripts/generate-vulyk-json.ts
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment -- dynamic import of .ts config returns any */

import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputPath = path.resolve(__dirname, "..", "vulyk.json");
const configUrl = pathToFileURL(path.resolve(__dirname, "..", "vulyk.config.ts")).href;

interface ManifestLike {
  groups: Record<string, unknown>;
  entries: Record<string, unknown>;
}

const config: { default: ManifestLike } = await import(configUrl);
const manifest = config.default;

writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);

process.stdout.write(`Generated ${outputPath}\n`);

/* eslint-enable @typescript-eslint/no-unsafe-assignment -- re-enable after dynamic import block */
