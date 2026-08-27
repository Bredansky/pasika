import { describe, ruleTester, srcFile } from "../rule-tester";
import { uiStateRule } from "./ui-state";

void describe("A component MUST express a UI state through the native element, attribute, or ARIA state for it and MUST NOT use a custom equivalent.", () => {
  ruleTester.run("ui-state", uiStateRule, {
    valid: [
      {
        code: "<Button loading={loading} aria-busy={loading} />",
        filename: srcFile("shared/button.tsx"),
      },
      {
        code: "<button disabled={disabled} />",
        filename: srcFile("shared/button.tsx"),
      },
    ],
    invalid: [
      {
        code: "<Button loading={loading} />",
        filename: srcFile("shared/button.tsx"),
        errors: 1,
      },
    ],
  });
});
void describe('A component MUST use Tailwind "state variants" when they can express a supported UI state.', () => {
  ruleTester.run("ui-state", uiStateRule, {
    valid: [
      {
        code: '<Button className="opacity-100 disabled:opacity-50" disabled={disabled} />',
        filename: srcFile("shared/button.tsx"),
      },
      {
        code: '<Button className={cn("opacity-100", disabled && "disabled:opacity-50")} disabled={disabled} />',
        filename: srcFile("shared/button.tsx"),
      },
    ],
    invalid: [
      {
        code: '<Button className={loading ? "opacity-50" : "opacity-100"} loading={loading} aria-busy={loading} />',
        filename: srcFile("shared/button.tsx"),
        errors: 1,
      },
    ],
  });
});
