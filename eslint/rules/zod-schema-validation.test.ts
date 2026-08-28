import { describe, ruleTester } from "../rule-tester";
import { zodSchemaValidationRule } from "./zod-schema-validation";

const MESSAGE =
  "This hand-written type guard validates an unknown value ad hoc. " +
  "Use a Zod schema instead: schema.safeParse(value) returns a discriminated result " +
  "whose .success narrows the type. See docs/repository-policy.md";

void describe("Runtime validation MUST use Zod schemas rather than ad hoc type guards.", () => {
  ruleTester.run("zod-schema-validation", zodSchemaValidationRule, {
    valid: [
      // Delegates to a Zod schema: allowed.
      {
        code: `
import { z } from "zod";
const userSchema = z.object({ name: z.string() });
function isUser(value: unknown): value is User {
  return userSchema.safeParse(value).success;
}
`,
        filename: "src/features/home/home-page.tsx",
      },
      // Delegates to a schema returned by a call: still a delegation.
      {
        code: `
function isUser(value: unknown): value is User {
  return getSchema().safeParse(value).success;
}
`,
        filename: "src/features/home/home-page.tsx",
      },
      // A call that is not a schema delegation (JSON.parse is excluded).
      {
        code: `
function isJson(value: unknown): value is Record<string, unknown> {
  return schema.parse(value).success;
}
`,
        filename: "src/features/home/home-page.tsx",
      },
      // A predicate over a typed parameter is narrowing, not runtime validation.
      {
        code: `
function isAdmin(role: Role): role is AdminRole {
  return role.permissions.includes("admin");
}
`,
        filename: "src/features/home/home-page.tsx",
      },
      // No type predicate at all.
      {
        code: "function readUser(value: unknown): User { return { name: String(value) }; }\n",
        filename: "src/features/home/home-page.tsx",
      },
      // A predicate guarding `this` rather than a parameter.
      {
        code: `
class Guard {
  isUser(this: { kind: string }): this is { kind: "user" } {
    return this.kind === "user";
  }
}
`,
        filename: "src/features/home/home-page.tsx",
      },
    ],
    invalid: [
      // Hand-rolled validation over unknown.
      {
        code: `
function isUser(value: unknown): value is User {
  return typeof value === "object" && value !== null && "name" in value;
}
`,
        filename: "src/features/home/home-page.tsx",
        errors: [{ message: MESSAGE }],
      },
      // Arrow function form.
      {
        code: `
const isUser = (value: unknown): value is User =>
  typeof value === "object" && value !== null && "name" in value;
`,
        filename: "src/features/home/home-page.tsx",
        errors: [{ message: MESSAGE }],
      },
      // Any parameter is also a runtime boundary.
      {
        code: `
function isUser(value: any): value is User {
  return value && value.name !== undefined;
}
`,
        filename: "src/features/home/home-page.tsx",
        errors: [{ message: MESSAGE }],
      },
      // JSON.parse is ad hoc, not a schema delegation.
      {
        code: `
function isJson(value: unknown): value is Record<string, unknown> {
  const parsed = JSON.parse(String(value));
  return typeof parsed === "object" && parsed !== null;
}
`,
        filename: "src/features/home/home-page.tsx",
        errors: [{ message: MESSAGE }],
      },
    ],
  });
});
