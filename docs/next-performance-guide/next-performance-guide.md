# Next Performance Guide

This guide describes how to evaluate external React and Next.js performance guidance without changing Pasika's rules automatically.

## How To Review React Performance Guidance

Use this workflow when the Vulyk-pinned Vercel React Best Practices skill changes or when considering one of its recommendations for Pasika.

1. Read the Vulyk-managed `.agents/skills/vercel-react-best-practices/SKILL.md` and the relevant file in its `rules/` directory to understand the original recommendation and its applicability.
2. Compare the recommendation with the existing Pasika rules, their ESLint implementations, and the supported React and Next.js versions to identify duplicate or conflicting behavior.
3. Follow the [Upstream Performance Adoption Rule](rules/upstream-performance-adoption-rule.md) to keep imported guidance advisory until a reviewed local requirement is accepted.
4. Run `npm run test:requirements` after adding or changing a local performance requirement so the existing registry reports any unclassified or outdated requirements.
