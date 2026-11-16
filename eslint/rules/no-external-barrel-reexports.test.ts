import { describe, ruleTester, srcFile } from "../rule-tester";
import { noExternalBarrelReexportsRule } from "./no-external-barrel-reexports";

void describe("A shared index.ts MUST re-export only public modules from its own folder.", () => {
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
