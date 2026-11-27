import { describe, ruleTester, srcFile } from "../rule-tester";
import { constantCasingRule } from "./constant-casing";

const message = /Function and interface declarations must be separated/;
const boundary = /Different declaration groups must be separated/;
const filename = srcFile("features/credentials/utils/platform-credentials.ts");

void describe("Module-level functions and interfaces have individual blank-line boundaries, regardless of export visibility.", () => {
  ruleTester.run("constant-casing:function-interface-spacing", constantCasingRule, {
    valid: [
      { code: "type A = string;\ntype B = number;", filename },
      { code: "interface A {}\n\ninterface B {}", filename },
      { code: "export interface A {}\n\nexport interface B {}", filename },
      { code: "function first() {}\n\nexport async function second() {}", filename },
      {
        code: "export function first(x: string): string;\nexport function first(x: number): number;\nexport function first(x: string | number) { return x; }",
        filename,
      },
      { code: "function first() {}\n// Next helper\nfunction second() {}", filename },
      { code: "interface A {}\n/** Next interface */\ninterface B {}", filename },
      { code: "function first() { function inner() {} function another() {} }", filename },
      { code: "function first() {}\nfunction second() {}", filename: "scripts/build.ts" },
    ],
    invalid: [
      {
        code: "type CredentialRow = ReturnType<typeof schema.parse>;\ninterface NewCredentialInput {\n  userAccountId: string;\n}\ninterface RenameCredentialInput {\n  credentialId: string;\n}",
        output:
          "type CredentialRow = ReturnType<typeof schema.parse>;\n\ninterface NewCredentialInput {\n  userAccountId: string;\n}\n\ninterface RenameCredentialInput {\n  credentialId: string;\n}",
        filename,
        errors: [{ message: boundary }, { message }],
      },
      {
        code: "function previewToken() {}\nfunction credentialPreview() {}\nfunction toPlatformCredentialApi() {}\nexport async function listCredentials() {}\nexport async function createCredential() {}\nexport async function renameCredential() {}\nexport async function deleteCredential() {}",
        output:
          "function previewToken() {}\n\nfunction credentialPreview() {}\n\nfunction toPlatformCredentialApi() {}\n\nexport async function listCredentials() {}\n\nexport async function createCredential() {}\n\nexport async function renameCredential() {}\n\nexport async function deleteCredential() {}",
        filename,
        errors: [{ message }, { message }, { message }, { message }, { message }, { message }],
      },
      {
        code: "export interface A {}\r\nexport interface B {}",
        output: "export interface A {}\r\n\r\nexport interface B {}",
        filename,
        errors: [{ message }],
      },
      {
        code: "interface A {}\ntype B = string;",
        output: "interface A {}\n\ntype B = string;",
        filename,
        errors: [{ message: boundary }],
      },
      {
        code: "interface A {}\nexport interface B {}",
        output: "interface A {}\n\nexport interface B {}",
        filename,
        errors: [{ message }],
      },
      {
        code: "export function first() {}\nexport default function second() {}",
        output: "export function first() {}\n\nexport default function second() {}",
        filename,
        errors: [{ message }],
      },
      {
        code: "export function first(x: string): string;\nexport function first(x: string) { return x; }\nexport function second() {}",
        output:
          "export function first(x: string): string;\nexport function first(x: string) { return x; }\n\nexport function second() {}",
        filename,
        errors: [{ message }],
      },
    ],
  });
});
