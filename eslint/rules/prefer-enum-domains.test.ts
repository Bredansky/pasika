import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { namedProgramDomains } from "./prefer-enum";

describe("Known, fixed sets of two or more related string or numeric values MUST use a shared TypeScript `enum`, even if each value appears only once.", () => {
  it("finds related status and numeric mode members across separate source files, but ignores unrelated constants", () => {
    const root = mkdtempSync(path.join(tmpdir(), "pasika-inferred-enum-"));
    const sourceRoot = path.join(root, "src");
    function source(relative: string, code: string): string {
      const file = path.join(sourceRoot, relative);
      mkdirSync(path.dirname(file), { recursive: true });
      writeFileSync(file, code);
      return file;
    }
    const publishingPending = source("features/publishing/a.ts", 'export const publicationStatusPending = "pending";');
    const publishingPublished = source(
      "features/publishing/b.ts",
      'export const publicationStatusPublished = "published";',
    );
    const billingPending = source("features/billing/a.ts", 'export const publicationStatusPending = "pending";');
    const editorGrid = source("features/editor/a.ts", "export const editorViewModeGrid = 1;");
    const editorList = source("features/editor/b.ts", "export const editorViewModeList = 2;");
    const unrelated = source(
      "features/publishing/unrelated.ts",
      'export const badgeFocusTokens = "focus"; export const badgeInvalidTokens = "invalid";',
    );
    const testFile = source("features/billing/extra.test.ts", 'export const publicationStatusPublished = "published";');

    const program = ts.createProgram(
      [publishingPending, publishingPublished, billingPending, editorGrid, editorList, unrelated, testFile],
      { noEmit: true },
    );
    const detected = namedProgramDomains(program, sourceRoot);
    expect(detected.has(`${publishingPending}:publicationStatusPending`)).toBe(true);
    expect(detected.has(`${publishingPublished}:publicationStatusPublished`)).toBe(true);
    expect(detected.has(`${editorGrid}:editorViewModeGrid`)).toBe(true);
    expect(detected.has(`${editorList}:editorViewModeList`)).toBe(true);
    expect(detected.has(`${billingPending}:publicationStatusPending`)).toBe(false);
    expect(detected.has(`${unrelated}:badgeFocusTokens`)).toBe(false);
    expect(detected.has(`${testFile}:publicationStatusPublished`)).toBe(false);
  });

  it("groups proven HTML tag and CSS property alternatives, regardless of member-name order", () => {
    const root = mkdtempSync(path.join(tmpdir(), "pasika-semantic-enums-"));
    const sourceRoot = path.join(root, "src");
    function source(relative: string, code: string): string {
      const file = path.join(sourceRoot, relative);
      mkdirSync(path.dirname(file), { recursive: true });
      writeFileSync(file, code);
      return file;
    }
    const dom = source(
      "constants/dom-values.ts",
      'export const buttonTagName = "button"; export const spanTag = "span"; export const lonePresentationRole = "presentation";',
    );
    const css = source(
      "constants/css.ts",
      [
        'export const absolutePosition = "absolute";',
        'export const positionRelative = "relative";',
        'export const overflowHidden = "hidden";',
        'export const overflowVisible = "visible";',
        'export const visibilityHidden = "hidden";',
        'export const visibilityVisible = "visible";',
        'export const displayNone = "none";',
        'export const displayBlock = "block";',
        'export const textAlignCenter = "center";',
        'export const alignItemsCenter = "center";',
        'export const backgroundPosition = "center";',
      ].join("\n"),
    );
    const featureOnly = source(
      "features/editor/measurement.ts",
      'export const divTag = "div"; export const documentDisplay = "block";',
    );
    const unrelated = source(
      "constants/unrelated.ts",
      'export const categoryTag = "category"; export const htmlTag = "tag"; export const absoluteStatus = "absolute";',
    );
    const program = ts.createProgram([dom, css, featureOnly, unrelated], { noEmit: true });
    const detected = namedProgramDomains(program, sourceRoot);

    for (const name of ["buttonTagName", "spanTag"]) expect(detected.has(`${dom}:${name}`)).toBe(true);
    for (const name of [
      "absolutePosition",
      "positionRelative",
      "overflowHidden",
      "overflowVisible",
      "visibilityHidden",
      "visibilityVisible",
      "displayNone",
      "displayBlock",
    ]) {
      expect(detected.has(`${css}:${name}`)).toBe(true);
    }

    for (const name of ["textAlignCenter", "alignItemsCenter", "backgroundPosition"]) {
      expect(detected.has(`${css}:${name}`)).toBe(false);
    }
    expect(detected.has(`${dom}:lonePresentationRole`)).toBe(false);
    expect(detected.has(`${featureOnly}:divTag`)).toBe(false);
    expect(detected.has(`${unrelated}:categoryTag`)).toBe(false);
    expect(detected.has(`${unrelated}:htmlTag`)).toBe(false);
    expect(detected.has(`${unrelated}:absoluteStatus`)).toBe(false);
  });
});
