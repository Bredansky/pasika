import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, ruleTester } from "../rule-tester";
import { repeatedNumericValueRule } from "./repeated-numeric-value";

const FIXTURE: Record<string, string> = {
  "features/editor/preview.tsx":
    "export function Preview() { const compositionWidth = 360; const compositionHeight = 640; return <Player width={compositionWidth} height={compositionHeight} />; }\n",
  "features/editor/generate.ts": "export const generate = () => make({ width: 360, height: 640 });\n",
  "features/editor/export.ts":
    "const targetWidth = 1080; const targetHeight = 1920; export const order = { targetWidth, targetHeight };\n",
  "features/editor/player.tsx":
    "const previewFps = 30; export function PlayerPreview() { return <Player fps={previewFps} />; }\n",
  "features/remotion/root.tsx":
    "export function Root() { return <Composition width={1080} height={1920} fps={30} />; }\n",
  "features/editor/unique.ts": "export const timeoutMs = 5000;\n",
  "features/editor/identity.ts": "export const objectScale = 1; export const selectedIndex = -1;\n",
  "features/shared/identity.ts": "export const previewScale = 1; export const activeIndex = -1;\n",
  "features/editor/thumbnail.ts": "export const thumbnailWidth = 320;\n",
  "features/editor/thumbnail.test.ts": "export const expectedWidth = 320;\n",
  "features/mocks/thumbnail.ts": "export const mockWidth = 320;\n",
  "features/editor/font.ts": "export const fontSize = 16;\n",
  "features/editor/icon.ts": "export const iconSize = 16;\n",
  "features/editor/duration.ts": "export const duration = 300;\n",
  "features/remotion/custom.tsx": "export const custom = <Composition durationInFrames={300} />;\n",
};

const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-repeated-numeric-value-")));
for (const [relativePath, contents] of Object.entries(FIXTURE)) {
  const filePath = path.join(root, "src", relativePath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, contents);
}
process.chdir(root);

const file = (relativePath: string): string => path.join(root, "src", relativePath);
const read = (relativePath: string): string => FIXTURE[relativePath] ?? "";

const DOC = "See docs/next-codebase-guide/rules/constants-rule.md";

void describe("A raw numeric value MUST NOT be repeated under the same semantic slot across production files; repeated named numeric values MUST use one extracted constant or enum. The values `-1`, `0`, and `1` MAY still be written inline.", () => {
  ruleTester.run("repeated-numeric-value", repeatedNumericValueRule, {
    valid: [
      {
        code: read("features/editor/unique.ts"),
        filename: file("features/editor/unique.ts"),
      },
      {
        code: read("features/editor/identity.ts"),
        filename: file("features/editor/identity.ts"),
      },
      {
        code: read("features/editor/thumbnail.ts"),
        filename: file("features/editor/thumbnail.ts"),
      },
      {
        code: read("features/editor/font.ts"),
        filename: file("features/editor/font.ts"),
      },
      {
        code: read("features/editor/icon.ts"),
        filename: file("features/editor/icon.ts"),
      },
      {
        code: read("features/editor/thumbnail.test.ts"),
        filename: file("features/editor/thumbnail.test.ts"),
      },
      {
        code: read("features/mocks/thumbnail.ts"),
        filename: file("features/mocks/thumbnail.ts"),
      },
    ],
    invalid: [
      {
        code: read("features/editor/generate.ts"),
        filename: file("features/editor/generate.ts"),
        errors: [
          {
            message:
              'The numeric value 360 is repeated for the "width" semantic slot in 2 production files. ' +
              `Extract one constant or enum at their CCF and import it instead. ${DOC}`,
          },
          {
            message:
              'The numeric value 640 is repeated for the "height" semantic slot in 2 production files. ' +
              `Extract one constant or enum at their CCF and import it instead. ${DOC}`,
          },
        ],
      },
      {
        code: read("features/remotion/custom.tsx"),
        filename: file("features/remotion/custom.tsx"),
        errors: [
          {
            message:
              'The numeric value 300 is repeated for the "duration" semantic slot in 2 production files. ' +
              `Extract one constant or enum at their CCF and import it instead. ${DOC}`,
          },
        ],
      },
      {
        code: read("features/remotion/root.tsx"),
        filename: file("features/remotion/root.tsx"),
        errors: [
          {
            message:
              'The numeric value 1080 is repeated for the "width" semantic slot in 2 production files. ' +
              `Extract one constant or enum at their CCF and import it instead. ${DOC}`,
          },
          {
            message:
              'The numeric value 1920 is repeated for the "height" semantic slot in 2 production files. ' +
              `Extract one constant or enum at their CCF and import it instead. ${DOC}`,
          },
          {
            message:
              'The numeric value 30 is repeated for the "fps" semantic slot in 2 production files. ' +
              `Extract one constant or enum at their CCF and import it instead. ${DOC}`,
          },
        ],
      },
    ],
  });
});
