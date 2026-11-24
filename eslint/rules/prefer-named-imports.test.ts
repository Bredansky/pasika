import { describe, ruleTester, srcFile } from "../rule-tester";
import { preferNamedImportsRule } from "./prefer-named-imports";

const MESSAGE =
  "Use named imports instead of namespace imports. " + "See docs/next-codebase-guide/rules/exports-and-imports-rule.md";

void describe("Imports MUST use named imports instead of namespace imports.", () => {
  const filename = srcFile("features/editor/utils/example.tsx");

  ruleTester.run("prefer-named-imports", preferNamedImportsRule, {
    valid: [
      'import { postSchema } from "@/schemas";',
      'import { postSchema, userSchema } from "../schemas";',
      'import type { ComponentProps } from "react";',
      'import { readFileSync } from "node:fs";',
      'import { Root, Trigger } from "@radix-ui/react-dialog";',
      'import React from "react";',
      'import "server-only";',
      'import { default as value } from "./module";',
      'export * from "./module";',
      'export * as module from "./module";',
      'const module = await import("./module");',
    ].map((code) => ({ code, filename })),
    invalid: [
      'import * as schemas from "@/schemas";',
      'import * as schemas from "../schemas";',
      'import * as schemas from "./schemas";',
      'import * as schemas from ".";',
      'import * as schemas from "..";',
      'import type * as models from "@/types";',
      'import * as React from "react";',
      'import * as fs from "node:fs";',
      'import * as Dialog from "@radix-ui/react-dialog";',
      'import React, * as ReactNamespace from "react";',
      'import * as schemas from "@/schemas"; export const entries = Object.entries(schemas);',
      'import * as schemas from "@/schemas"; export const pick = (key: keyof typeof schemas) => schemas[key];',
      'import * as schemas from "@/schemas"; export const { postSchema } = schemas;',
      'import * as schemas from "@/schemas"; export type SchemaModule = typeof schemas;',
      'import * as schemas from "@/schemas"; export { schemas };',
      'import * as ui from "@/shared/ui"; export const view = <ui.Button />;',
    ].map((code) => ({ code, filename, errors: [{ message: MESSAGE }] })),
  });
});
