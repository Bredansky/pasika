import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { isPlatformPropertyEnum, namedProgramDomains } from "./prefer-enum";

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

    for (const name of ["textAlignCenter", "alignItemsCenter"]) {
      expect(detected.has(`${css}:${name}`)).toBe(true);
    }
    expect(detected.has(`${css}:backgroundPosition`)).toBe(false);
    expect(detected.has(`${dom}:lonePresentationRole`)).toBe(false);
    expect(detected.has(`${featureOnly}:divTag`)).toBe(true);
    expect(detected.has(`${unrelated}:categoryTag`)).toBe(false);
    expect(detected.has(`${unrelated}:htmlTag`)).toBe(false);
    expect(detected.has(`${unrelated}:absoluteStatus`)).toBe(false);
  });

  it("derives additional valid HTML tags and CSS keywords from installed specifications", () => {
    const root = mkdtempSync(path.join(tmpdir(), "pasika-native-dom-css-"));
    const sourceRoot = path.join(root, "src");
    const html = path.join(sourceRoot, "constants/html.ts");
    const css = path.join(sourceRoot, "constants/css.ts");
    mkdirSync(path.dirname(html), { recursive: true });
    writeFileSync(html, 'export const dialogTagName = "dialog"; export const pictureTag = "picture";');
    writeFileSync(
      css,
      [
        'export const userSelectText = "text";',
        'export const userSelectNone = "none";',
        'export const textDecorationLineUnderline = "underline";',
        'export const textDecorationLineOverline = "overline";',
        'export const redColor = "red";',
        'export const blueColor = "blue";',
        'export const nonstandardPosition = "nonstandard";',
      ].join("\n"),
    );
    const program = ts.createProgram([html, css], { noEmit: true });
    const detected = namedProgramDomains(program, sourceRoot);
    expect(isPlatformPropertyEnum("HtmlTagEnum", [{ name: "Dialog", value: "dialog" }], program)).toBe(true);
    expect(isPlatformPropertyEnum("HtmlTagEnum", [{ name: "Button", value: "dialog" }], program)).toBe(false);

    for (const name of ["dialogTagName", "pictureTag"]) {
      expect(detected.has(`${html}:${name}`)).toBe(true);
    }
    for (const name of [
      "userSelectText",
      "userSelectNone",
      "textDecorationLineUnderline",
      "textDecorationLineOverline",
    ]) {
      expect(detected.has(`${css}:${name}`)).toBe(true);
    }
    for (const name of ["redColor", "blueColor", "nonstandardPosition"]) {
      expect(detected.has(`${css}:${name}`)).toBe(false);
    }
  });

  it("requires one enum member per verified CSS property even when that keyword is the only one used", () => {
    const root = mkdtempSync(path.join(tmpdir(), "pasika-single-css-domain-"));
    const sourceRoot = path.join(root, "src");
    const css = path.join(sourceRoot, "constants/css.ts");
    mkdirSync(path.dirname(css), { recursive: true });
    writeFileSync(
      css,
      [
        'export const absolutePosition = "absolute";',
        'export const visibilityHidden = "hidden";',
        'export const overflowHidden = "hidden";',
        'export const alignItemsCenter = "center";',
        'export const cssHidden = "hidden";',
        'export const transparent = "transparent";',
        'export const defaultFontStyle = "normal";',
        'export const backgroundPosition = "center";',
        'export const nonstandardPosition = "nonstandard";',
      ].join("\\n"),
    );
    const detected = namedProgramDomains(ts.createProgram([css], { noEmit: true }), sourceRoot);
    for (const name of ["absolutePosition", "visibilityHidden", "overflowHidden", "alignItemsCenter"]) {
      expect(detected.has(`${css}:${name}`)).toBe(true);
    }
    for (const name of ["cssHidden", "transparent", "defaultFontStyle", "backgroundPosition", "nonstandardPosition"]) {
      expect(detected.has(`${css}:${name}`)).toBe(false);
    }
  });

  it("finds CSS property domains through imported constants used in real style slots", () => {
    const root = mkdtempSync(path.join(tmpdir(), "pasika-css-context-"));
    const sourceRoot = path.join(root, "src");
    const constants = path.join(sourceRoot, "constants/css.ts");
    const usage = path.join(sourceRoot, "features/editor/style.tsx");
    mkdirSync(path.dirname(constants), { recursive: true });
    mkdirSync(path.dirname(usage), { recursive: true });
    writeFileSync(
      constants,
      [
        'export const cssHidden = "hidden";',
        'export const alignmentCenter = "center";',
        'export const transparent = "transparent";',
        'export const otherHidden = "hidden";',
        'export const radixAlignOnly = "center";',
      ].join("\n"),
    );
    writeFileSync(
      usage,
      [
        'import { cssHidden, alignmentCenter, transparent, otherHidden, radixAlignOnly } from "../../constants/css";',
        "declare const measurer: HTMLElement;",
        "measurer.style.visibility = cssHidden;",
        "export const rendered = <div style={{ overflow: cssHidden, alignItems: alignmentCenter, backgroundColor: transparent }} />;",
        "export const unrelated = { overflow: otherHidden, align: radixAlignOnly };",
      ].join("\n"),
    );
    const program = ts.createProgram([constants, usage], { noEmit: true, jsx: ts.JsxEmit.Preserve });
    const detected = namedProgramDomains(program, sourceRoot);
    expect(detected.has(`${constants}:cssHidden`)).toBe(true);
    expect(detected.has(`${constants}:alignmentCenter`)).toBe(true);
    expect(detected.has(`${constants}:transparent`)).toBe(false);
    expect(detected.has(`${constants}:otherHidden`)).toBe(false);
    expect(detected.has(`${constants}:radixAlignOnly`)).toBe(false);
  });

  it("does not infer platform HTML tags when the program has no DOM lib", () => {
    const root = mkdtempSync(path.join(tmpdir(), "pasika-nodom-"));
    const sourceRoot = path.join(root, "src");
    const html = path.join(sourceRoot, "constants/html.ts");
    mkdirSync(path.dirname(html), { recursive: true });
    writeFileSync(html, 'export const buttonTagName = "button"; export const spanTag = "span";');
    const program = ts.createProgram([html], { noEmit: true, noLib: true });
    const detected = namedProgramDomains(program, sourceRoot);
    expect(detected.size).toBe(0);
  });
});
