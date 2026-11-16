import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, ruleTester, srcFile } from "../rule-tester";
import { noExternalBarrelReexportsRule } from "./no-external-barrel-reexports";

void describe("An index.ts or support-folder server.ts MUST NOT re-export modules from outside its own folder.", () => {
  const configEntry = srcFile("config/social/index.ts");
  const constantsEntry = srcFile("constants/index.ts");
  const componentEntry = srcFile("features/social/platform-cards/index.ts");

  ruleTester.run("no-external-barrel-reexports", noExternalBarrelReexportsRule, {
    valid: [
      { code: 'export * from "./social-urls";', filename: constantsEntry },
      { code: 'export type * from "./types";', filename: configEntry },
      { code: 'export { PlatformCards } from "./platform-cards";', filename: componentEntry },
      { code: "export const socialConfig = {};", filename: configEntry },
      {
        code: 'import { twitchUrl } from "@/constants"; export const socialConfig = { twitchUrl };',
        filename: configEntry,
      },
      { code: 'export { value } from "@/constants";', filename: srcFile("config/social/social.ts") },
      { code: 'export { value } from "@/constants";', filename: srcFile("config/social/not-index.ts") },
    ],
    invalid: [
      {
        code: 'export { twitchUrl, youtubeUrl } from "@/constants";',
        filename: configEntry,
        errors: [{ message: /must re-export only modules within their own folder/ }],
      },
      {
        code: 'export * from "../constants";',
        filename: configEntry,
        errors: [{ message: /Import directly from the owning module/ }],
      },
      {
        code: 'export type * from "@/types";',
        filename: configEntry,
        errors: 1,
      },
      {
        code: 'export { value } from "./../other";',
        filename: configEntry,
        errors: 1,
      },
      {
        code: 'export { external } from "some-package";',
        filename: constantsEntry,
        errors: 1,
      },
      {
        code: 'export * from "./local"; export { twitchUrl } from "@/constants";',
        filename: configEntry,
        errors: 1,
      },
    ],
  });
});

void describe("Nested server barrels MUST NOT re-export from outside their folder", () => {
  const root = mkdtempSync(path.join(tmpdir(), "pasika-nested-barrel-"));
  const directory = path.join(root, "src", "schemas", "api");
  mkdirSync(directory, { recursive: true });
  writeFileSync(path.join(directory, "index.ts"), "export const sharedValue = 1;");
  const server = path.join(directory, "server.ts");
  ruleTester.run("no-external-barrel-reexports", noExternalBarrelReexportsRule, {
    valid: [{ filename: server, code: 'import "server-only"; export * from "./private";' }],
    invalid: [
      { filename: server, code: 'import "server-only"; export * from "../private";', errors: 1 },
      { filename: server, code: 'import "server-only"; export * from "@/schemas/private";', errors: 1 },
    ],
  });
});
