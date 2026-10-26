import { noUtilityAliasRule } from "./no-utility-alias";
import { describe, tailwindRuleTester } from "./rule-tester";

void describe("A custom @utility MUST NOT merely rename a single plain Tailwind class through @apply; use that class directly instead.", () => {
  tailwindRuleTester.run("no-utility-alias", noUtilityAliasRule, {
    valid: [
      { code: "@utility bg-mc-button { @apply bg-(--mc-button-surface); }" },
      { code: "@utility shadow-mc-button { @apply [box-shadow:var(--mc-button-shadow)]; }" },
      { code: "@utility text-label-ink { @apply text-(--label-ink); }" },
      { code: "@utility bg-special { @apply bg-gray-500; color: red; }" },
      { code: "@utility hover-treatment { @apply hover:bg-primary-canvas; }" },
      { code: "@utility responsive-panel { @media (min-width: 42rem) { @apply bg-primary-canvas; } }" },
      { code: "@utility unknown-effect { @apply [box-shadow:0_1px_3px_black]; }" },
    ],
    invalid: [
      {
        code: "@utility bg-mc-button { @apply bg-gray-500; }",
        errors: [
          {
            message:
              'Custom utility "bg-mc-button" only renames "bg-gray-500"; use the class directly instead of defining an @utility alias.',
          },
        ],
      },
      {
        code: "@utility center-layout { @apply flex; }",
        errors: [
          {
            message:
              'Custom utility "center-layout" only renames "flex"; use the class directly instead of defining an @utility alias.',
          },
        ],
      },
      {
        code: "@utility badge-ink { @apply text-base-ink; }",
        errors: [
          {
            message:
              'Custom utility "badge-ink" only renames "text-base-ink"; use the class directly instead of defining an @utility alias.',
          },
        ],
      },
      {
        code: "@utility small-rounded { @apply rounded-lg; }",
        errors: [
          {
            message:
              'Custom utility "small-rounded" only renames "rounded-lg"; use the class directly instead of defining an @utility alias.',
          },
        ],
      },
      {
        code: "@utility faded-panel { @apply bg-primary-canvas/50; }",
        errors: [
          {
            message:
              'Custom utility "faded-panel" only renames "bg-primary-canvas/50"; use the class directly instead of defining an @utility alias.',
          },
        ],
      },
      {
        code: "@utility shifted { @apply -translate-x-2; }",
        errors: [
          {
            message:
              'Custom utility "shifted" only renames "-translate-x-2"; use the class directly instead of defining an @utility alias.',
          },
        ],
      },
    ],
  });
});
