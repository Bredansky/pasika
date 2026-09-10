import { describe, ruleTester, srcFile } from "../rule-tester";
import { hookComplexityRule } from "./hook-complexity";

void describe("A custom hook with exactly one consumer MUST be extracted when it contains two or more imperative categories and can be described as one coherent behavior.", () => {
  ruleTester.run("hook-complexity", hookComplexityRule, {
    valid: [
      // Simple hook in a component file (fewer than 2 imperative categories — should stay)
      {
        code: "export function useSort(items: Item[]) { return useMemo(() => items.toSorted(byDate), [items]); }",
        filename: srcFile("features/billing/invoice.tsx"),
      },
      // Two distinct built-in hooks score 1 (the first is free) — not enough on its own.
      {
        code: "export function usePlayerVolume(src: string) { useEffect(() => { player.load(src); }, [src]); useRef(player); return {}; }",
        filename: srcFile("features/billing/invoice.tsx"),
      },
      // Complex hook already in hooks/ folder (3 distinct built-in hooks, scoring 2 — extracted, fine)
      {
        code: "export function usePlayerSetup(src: string) { const [ready, setReady] = useState(false); useEffect(() => { subscribe(src); return () => unsubscribe(src); }, [src]); useRef(player); return ready; }",
        filename: srcFile("features/player/hooks/use-player-setup.ts"),
      },
      // Non-hook functions are not checked
      {
        code: "export function helper() { useState(0); useEffect(() => {}); return 42; }",
        filename: srcFile("features/billing/invoice.tsx"),
      },
      // Non-exported hooks are not checked
      {
        code: "function useHelper() { useState(0); useEffect(() => {}); }",
        filename: srcFile("features/billing/invoice.tsx"),
      },
    ],
    invalid: [
      // Complex hook NOT in hooks/ folder (3 distinct built-in hooks, scoring 2 — should be extracted)
      {
        code: "export function usePlayerSetup(src: string) { const [ready, setReady] = useState(false); useEffect(() => { subscribe(src); return () => unsubscribe(src); }, [src]); useRef(player); return ready; }",
        filename: srcFile("features/player/player.tsx"),
        errors: [
          {
            message:
              'Hook "usePlayerSetup" has 2 imperative categories and must be extracted to a hooks/ folder. See docs/next-codebase-guide/rules/hook-extraction-rule.md',
          },
        ],
      },
      // Simple hook in hooks/ folder (should stay inline)
      {
        code: "export function useSort(items: Item[]) { return useMemo(() => items.toSorted(byDate), [items]); }",
        filename: srcFile("features/billing/hooks/use-sort.ts"),
        errors: [
          {
            message:
              'Hook "useSort" has fewer than two imperative categories and must stay inline in its consumer file. See docs/next-codebase-guide/rules/hook-extraction-rule.md',
          },
        ],
      },
      // Two distinct built-in hooks (scoring 1) wrongly in hooks/ folder
      {
        code: "export function usePlayerVolume(src: string) { useEffect(() => { player.load(src); }, [src]); useRef(player); return {}; }",
        filename: srcFile("features/player/hooks/use-player-volume.ts"),
        errors: [
          {
            message:
              'Hook "usePlayerVolume" has fewer than two imperative categories and must stay inline in its consumer file. See docs/next-codebase-guide/rules/hook-extraction-rule.md',
          },
        ],
      },
    ],
  });
});

void describe("A custom hook with one consumer that contains fewer than two imperative categories MUST stay inline in its consumer file.", () => {
  ruleTester.run("hook-complexity", hookComplexityRule, {
    valid: [
      // Simple hook not in hooks/ — fine (not extracted yet)
      {
        code: "export function useSort(items) { return useMemo(() => items.toSorted(byDate), [items]); }",
        filename: srcFile("features/billing/invoice.tsx"),
      },
      // Two distinct built-in hooks, not in hooks/ — fine (scores 1, not enough to extract)
      {
        code: "export function usePlayerVolume(src) { useEffect(() => { player.load(src); }, [src]); useRef(player); return {}; }",
        filename: srcFile("features/billing/invoice.tsx"),
      },
      // Complex hook (3 distinct built-in hooks, scoring 2) already in hooks/ — fine (already extracted)
      {
        code: "export function usePlayerSetup(src) { const [ready, setReady] = useState(false); useEffect(() => { subscribe(src); }, [src]); useRef(player); return ready; }",
        filename: srcFile("features/player/hooks/use-player-setup.ts"),
      },
    ],
    invalid: [
      // Simple hook wrongly in hooks/ folder
      {
        code: "export function useSort(items) { return useMemo(() => items.toSorted(byDate), [items]); }",
        filename: srcFile("features/billing/hooks/use-sort.ts"),
        errors: 1,
      },
      // Two distinct built-in hooks (scoring 1) wrongly in hooks/ folder
      {
        code: "export function usePlayerVolume(src) { useEffect(() => { player.load(src); }, [src]); useRef(player); return {}; }",
        filename: srcFile("features/player/hooks/use-player-volume.ts"),
        errors: 1,
      },
    ],
  });
});
