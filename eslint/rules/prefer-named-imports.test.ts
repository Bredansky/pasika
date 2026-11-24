import { describe, ruleTester, srcFile } from "../rule-tester";
import { preferNamedImportsRule } from "./prefer-named-imports";

const MESSAGE =
  "Import the referenced named exports directly instead of using a namespace import. " +
  "See docs/next-codebase-guide/rules/exports-and-imports-rule.md";

void describe("Internal imports MUST use named imports when only specific named exports are needed.", () => {
  const filename = srcFile("features/editor/utils/example.tsx");

  ruleTester.run("prefer-named-imports", preferNamedImportsRule, {
    valid: [
      { code: 'import { postSchema } from "@/schemas"; export const schema = postSchema;', filename },
      { code: 'import * as schemas from "@/schemas"; export const entries = Object.entries(schemas);', filename },
      {
        code: 'import * as schemas from "@/schemas"; export const pick = (key: keyof typeof schemas) => schemas[key];',
        filename,
      },
      {
        code: 'import * as schemas from "@/schemas"; export const schema = schemas.postSchema; export const all = schemas;',
        filename,
      },
      { code: 'import * as schemas from "@/schemas"; export type SchemaModule = typeof schemas;', filename },
      { code: 'import * as schemas from "@/schemas"; export { schemas };', filename },
      { code: 'import * as schemas from "@/schemas"; export const { postSchema } = schemas;', filename },
      {
        code: 'import * as schemas from "@/schemas"; export const example = (schemas: { postSchema: string }) => schemas.postSchema;',
        filename,
      },
      { code: 'import * as schemas from "@/schemas";', filename },
      { code: 'import * as module from "./module"; export const value = module.default;', filename },
      { code: 'import * as React from "react"; export type Props = React.ComponentProps<"div">;', filename },
      { code: 'import * as fs from "node:fs"; export const read = fs.readFileSync;', filename },
    ],
    invalid: [
      {
        code: 'import * as schemas from "@/schemas"; export const schema = schemas.postSchema;',
        filename,
        errors: [{ message: MESSAGE }],
      },
      {
        code: 'import * as schemas from "@/schemas"; export const pair = [schemas.postSchema, schemas.userSchema];',
        filename,
        errors: [{ message: MESSAGE }],
      },
      {
        code: 'import * as schemas from "../schemas"; export const schema = schemas.postSchema;',
        filename,
        errors: [{ message: MESSAGE }],
      },
      {
        code: 'import * as schemas from "./schemas"; export const schema = schemas["postSchema"];',
        filename,
        errors: [{ message: MESSAGE }],
      },
      {
        code: 'import type * as models from "@/types"; export type Post = models.Post;',
        filename,
        errors: [{ message: MESSAGE }],
      },
      {
        code: 'import * as schemas from "@/schemas"; export type PostSchema = typeof schemas.postSchema;',
        filename,
        errors: [{ message: MESSAGE }],
      },
      {
        code: 'import * as ui from "@/shared/ui"; export const view = <ui.Button />;',
        filename,
        errors: [{ message: MESSAGE }],
      },
      {
        code: 'import * as schemas from "@/schemas"; export const value = schemas.postSchema.parse({});',
        filename,
        errors: [{ message: MESSAGE }],
      },
      {
        code: 'import * as schemas from "@/schemas"; export const schema = schemas.postSchema; export const example = (schemas: object) => schemas;',
        filename,
        errors: [{ message: MESSAGE }],
      },
    ],
  });
});
