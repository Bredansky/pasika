import { describe, ruleTester, srcFile } from "../rule-tester";
import { componentVariantOwnershipRule } from "./component-variant-ownership";

const file = srcFile("app/components-showcase/ascii-divider/page.tsx");
const DOC = "See docs/next-codebase-guide/rules/constants-rule.md";
const MESSAGE = `A component variant must use a component-owned enum member or imported option, not a consumer-local string constant. Omit the prop for the default variant. ${DOC}`;

void describe("A first-party component's static JSX `variant` MUST use an owner-provided option instead of a consumer-local string constant. Consumers SHOULD omit the prop for the default variant; dynamically selected values and third-party component APIs are unaffected. CVA-backed variants MAY keep their component-owned CVA configuration.", () => {
  ruleTester.run("component-variant-ownership", componentVariantOwnershipRule, {
    valid: [
      {
        filename: file,
        code: 'import { AsciiDivider } from "@/shared/ascii-divider"; const page = <AsciiDivider />;',
      },
      {
        filename: file,
        code: 'import { AsciiDivider } from "@/shared/ascii-divider"; const page = <AsciiDivider variant={AsciiDividerVariant.Diamonds} />;',
      },
      {
        filename: file,
        code: 'import { AsciiDividerVariant } from "@/constants"; import { AsciiDivider } from "@/shared/ascii-divider"; const page = <AsciiDivider variant={AsciiDividerVariant.Stars} />;',
      },
      {
        filename: file,
        code: 'import { AsciiDivider } from "@/shared/ascii-divider"; const page = <AsciiDivider variant={userSelectedVariant} />;',
      },
      {
        filename: file,
        code: 'import { AsciiDivider } from "@/shared/ascii-divider"; const page = <AsciiDivider variant={useVariant()} />;',
      },
      {
        filename: file,
        code: 'import { AsciiDivider } from "@/shared/ascii-divider"; const page = <AsciiDivider variant={cond ? DividerVariant.Stars : DividerVariant.Diamonds} />;',
      },
      {
        filename: file,
        code: 'import { AsciiDivider } from "@/shared/ascii-divider"; const label = "Stars"; const page = <AsciiDivider title={label} />;',
      },
      {
        filename: file,
        code: 'import { ThirdParty } from "third-party"; const localVariant = "primary"; const page = <ThirdParty variant={localVariant} />;',
      },
      {
        filename: file,
        code: 'const localVariant = "primary"; const page = <div data-variant={localVariant} />;',
      },
      {
        filename: file,
        code: 'import { Button } from "@/shared/button"; const selected = options[0]; const page = <Button variant={selected} />;',
      },
      {
        filename: srcFile("features/showcase/constants/index.ts"),
        code: 'const showcaseAsciiDividerVariant = "Stars";',
      },
      {
        filename: srcFile("features/showcase/ascii-divider.test.tsx"),
        code: 'const testVariant = "Stars"; const preview = <AsciiDivider variant={testVariant} />;',
      },
    ],
    invalid: [
      {
        filename: file,
        code: 'import { AsciiDivider } from "@/shared/ascii-divider"; const showcaseAsciiDividerVariant = "Stars"; const page = <AsciiDivider variant={showcaseAsciiDividerVariant} />;',
        errors: [{ message: MESSAGE }],
      },
      {
        filename: file,
        code: 'import { AsciiDivider } from "@/shared/ascii-divider"; const diamondDividerVariant = "Diamonds" as const; const page = <AsciiDivider variant={diamondDividerVariant} />;',
        errors: [{ message: MESSAGE }],
      },
      {
        filename: file,
        code: 'import { AsciiDivider } from "@/shared/ascii-divider"; const selected = "Stars" satisfies string; const page = <AsciiDivider variant={selected} />;',
        errors: [{ message: MESSAGE }],
      },
      {
        filename: file,
        code: 'import { AsciiDivider } from "@/shared/ascii-divider"; const variant = "Stars"; const choice = variant; const page = <AsciiDivider variant={choice} />;',
        errors: [{ message: MESSAGE }],
      },
      {
        filename: file,
        code: 'import { AsciiDivider } from "@/shared/ascii-divider"; const stars = "Stars"; const page = <AsciiDivider variant={active ? stars : AsciiDividerVariant.Diamonds} />;',
        errors: [{ message: MESSAGE }],
      },
      {
        filename: file,
        code: 'import { AsciiDivider } from "@/shared/ascii-divider"; const stars = `Stars`; const page = <AsciiDivider variant={stars} />;',
        errors: [{ message: MESSAGE }],
      },
      {
        filename: file,
        code: 'import { AsciiDivider } from "@/shared/ascii-divider"; function Example() { const stars = "Stars"; return <AsciiDivider variant={stars} />; }',
        errors: [{ message: MESSAGE }],
      },
      {
        filename: file,
        code: 'const stars = "Stars"; const page = <AsciiDivider variant={stars} />;',
        errors: [{ message: MESSAGE }],
      },
    ],
  });
});
