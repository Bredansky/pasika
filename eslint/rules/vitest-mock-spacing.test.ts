import tsParser from "@typescript-eslint/parser";
import { vi } from "vitest";
import { CwdAwareRuleTester, describe, srcFile } from "../rule-tester";
import { constantCasingRule } from "./constant-casing";

vi.setConfig({ testTimeout: 120_000 });

const ordinaryMessage = /Consecutive const declarations/;
const callableMessage = /Callable const declarations/;
const structuredMessage = /Multiline object and array const declarations/;
const visibilityMessage = /Exported and non-exported const declarations/;

const typedRuleTester = new CwdAwareRuleTester({
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 2022,
    sourceType: "module",
    parserOptions: {
      projectService: { allowDefaultProject: ["src/utils/*.ts"] },
      tsconfigRootDir: process.cwd(),
    },
  },
});

void describe("Imported Vitest mock factories are ordinary constants for spacing, not function implementations.", () => {
  typedRuleTester.run("constant-casing:vitest-mock-spacing", constantCasingRule, {
    valid: [
      {
        code: 'import { vi } from "vitest";\n\nconst encode = vi.hoisted(() => vi.fn());\nconst set = vi.hoisted(() => vi.fn());',
        filename: srcFile("utils/mock-spacing.test.ts"),
      },
      {
        code: 'import { vi } from "vitest";\n\ntype Session = { user: string };\ntype UserAccount = { id: string };\n\nconst getServerSession = vi.hoisted(() => vi.fn<() => Promise<Session | null>>());\nconst getUserAccountByUserId = vi.hoisted(() => vi.fn<(userId: string) => Promise<UserAccount | null>>());',
        filename: srcFile("utils/mock-spacing.test.ts"),
      },
      {
        code: 'import { vi as mock } from "vitest";\n\nconst first = mock.fn();\nconst second = mock.hoisted(() => mock.fn());',
        filename: srcFile("utils/mock-spacing.test.ts"),
      },
      {
        code: 'import { vitest } from "vitest";\n\nconst first = vitest.fn();\nconst second = vitest.fn();',
        filename: srcFile("utils/mock-spacing.test.ts"),
      },
      {
        code: 'import { vi } from "vitest";\n\nconst first = vi.fn();\n// Another mock\nconst second = vi.fn();',
        filename: srcFile("utils/mock-spacing.test.ts"),
      },
    ],
    invalid: [
      {
        code: 'import { vi } from "vitest";\n\nconst encode = vi.hoisted(() => vi.fn());\n\nconst set = vi.hoisted(() => vi.fn());',
        output:
          'import { vi } from "vitest";\n\nconst encode = vi.hoisted(() => vi.fn());\nconst set = vi.hoisted(() => vi.fn());',
        filename: srcFile("utils/mock-spacing.test.ts"),
        errors: [{ message: ordinaryMessage }],
      },
      {
        code: 'import { vi } from "vitest";\n\ntype Session = { user: string };\ntype UserAccount = { id: string };\n\nconst getServerSession = vi.hoisted(() => vi.fn<() => Promise<Session | null>>());\n\nconst getUserAccountByUserId = vi.hoisted(() => vi.fn<(userId: string) => Promise<UserAccount | null>>());',
        output:
          'import { vi } from "vitest";\n\ntype Session = { user: string };\ntype UserAccount = { id: string };\n\nconst getServerSession = vi.hoisted(() => vi.fn<() => Promise<Session | null>>());\nconst getUserAccountByUserId = vi.hoisted(() => vi.fn<(userId: string) => Promise<UserAccount | null>>());',
        filename: srcFile("utils/mock-spacing.test.ts"),
        errors: [{ message: ordinaryMessage }],
      },
      {
        code: 'import { vi } from "vitest";\n\nconst first = vi.fn();\n\nconst second = vi.fn();',
        output: 'import { vi } from "vitest";\n\nconst first = vi.fn();\nconst second = vi.fn();',
        filename: srcFile("utils/mock-spacing.test.ts"),
        errors: [{ message: ordinaryMessage }],
      },
      {
        code: 'import { vi } from "vitest";\n\nconst first = vi.fn();\nconst second = () => 1;',
        output: 'import { vi } from "vitest";\n\nconst first = vi.fn();\n\nconst second = () => 1;',
        filename: srcFile("utils/mock-spacing.test.ts"),
        errors: [{ message: callableMessage }],
      },
      {
        code: 'import { vi } from "vitest";\n\nconst first = vi.fn();\nconst second = vi.hoisted(() => () => 1);',
        output: 'import { vi } from "vitest";\n\nconst first = vi.fn();\n\nconst second = vi.hoisted(() => () => 1);',
        filename: srcFile("utils/mock-spacing.test.ts"),
        errors: [{ message: callableMessage }],
      },
      {
        code: "const vi = { fn: () => () => 1 };\nconst first = vi.fn();\nconst second = vi.fn();",
        output: "const vi = { fn: () => () => 1 };\n\nconst first = vi.fn();\n\nconst second = vi.fn();",
        filename: srcFile("utils/mock-spacing.test.ts"),
        errors: [{ message: callableMessage }, { message: callableMessage }],
      },
      {
        code: 'import { vi } from "vitest";\n\nconst first = vi.fn();\nconst second = {\n  first,\n};',
        output: 'import { vi } from "vitest";\n\nconst first = vi.fn();\n\nconst second = {\n  first,\n};',
        filename: srcFile("utils/mock-spacing.test.ts"),
        errors: [{ message: structuredMessage }],
      },
      {
        code: 'import { vi } from "vitest";\n\nconst first = vi.fn();\nexport const second = vi.fn();',
        output: 'import { vi } from "vitest";\n\nconst first = vi.fn();\n\nexport const second = vi.fn();',
        filename: srcFile("utils/mock-spacing.test.ts"),
        errors: [{ message: visibilityMessage }],
      },
    ],
  });
});
