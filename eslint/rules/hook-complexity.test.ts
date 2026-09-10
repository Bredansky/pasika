import { describe, ruleTester, srcFile } from "../rule-tester";
import { hookComplexityRule } from "./hook-complexity";

void describe("A custom hook with exactly one consumer MUST be extracted when its extraction score reaches two.", () => {
  ruleTester.run("hook-complexity", hookComplexityRule, {
    valid: [
      // Simple hook in a component file (one category, scores 0 — should stay)
      {
        code: "export function useSort(items: Item[]) { return useMemo(() => items.toSorted(byDate), [items]); }",
        filename: srcFile("features/billing/invoice.tsx"),
      },
      // Two distinct built-in hooks score 1 (the first is free) — not enough on its own.
      {
        code: "export function usePlayerVolume(src: string) { useEffect(() => { console.log(src); }, [src]); useRef(player); return {}; }",
        filename: srcFile("features/billing/invoice.tsx"),
      },
      // useEffect plus a subscription and resource-lifecycle call: 3 categories, scoring 2 — extracted, fine.
      {
        code: "export function usePlayerSetup(src: string) { useEffect(() => { player.on('play', handlePlay); player.load(src); return () => player.destroy(); }, [src]); return {}; }",
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
      // useEffect plus a subscription and resource-lifecycle call: 3 categories, scoring 2 — should be extracted.
      {
        code: "export function usePlayerSetup(src: string) { useEffect(() => { player.on('play', handlePlay); player.load(src); return () => player.destroy(); }, [src]); return {}; }",
        filename: srcFile("features/player/player.tsx"),
        errors: [
          {
            message:
              'Hook "usePlayerSetup" has an extraction score of 2 and must be extracted to a hooks/ folder. See docs/next-codebase-guide/rules/hook-extraction-rule.md',
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
              'Hook "useSort" has an extraction score below two and must stay inline in its consumer file. See docs/next-codebase-guide/rules/hook-extraction-rule.md',
          },
        ],
      },
      // Two distinct built-in hooks (scoring 1) wrongly in hooks/ folder
      {
        code: "export function usePlayerVolume(src: string) { useEffect(() => { console.log(src); }, [src]); useRef(player); return {}; }",
        filename: srcFile("features/player/hooks/use-player-volume.ts"),
        errors: [
          {
            message:
              'Hook "usePlayerVolume" has an extraction score below two and must stay inline in its consumer file. See docs/next-codebase-guide/rules/hook-extraction-rule.md',
          },
        ],
      },
    ],
  });
});

void describe("A custom hook with one consumer whose extraction score is below two MUST stay inline in its consumer file.", () => {
  ruleTester.run("hook-complexity", hookComplexityRule, {
    valid: [
      // Simple hook not in hooks/ — fine (not extracted yet)
      {
        code: "export function useSort(items) { return useMemo(() => items.toSorted(byDate), [items]); }",
        filename: srcFile("features/billing/invoice.tsx"),
      },
      // Two distinct built-in hooks, not in hooks/ — fine (scores 1, not enough to extract)
      {
        code: "export function usePlayerVolume(src) { useEffect(() => { console.log(src); }, [src]); useRef(player); return {}; }",
        filename: srcFile("features/billing/invoice.tsx"),
      },
      // useEffect plus subscription plus lifecycle (3 categories, scoring 2) already in hooks/ — fine.
      {
        code: "export function usePlayerSetup(src) { useEffect(() => { player.on('play', handlePlay); player.load(src); return () => player.destroy(); }, [src]); return {}; }",
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
        code: "export function usePlayerVolume(src) { useEffect(() => { console.log(src); }, [src]); useRef(player); return {}; }",
        filename: srcFile("features/player/hooks/use-player-volume.ts"),
        errors: 1,
      },
    ],
  });
});

void describe("An imperative category is either a distinct built-in hook called by name, or one of four kinds of imperative work a hook body's other calls can perform: subscriptions, external I/O and persistence, DOM manipulation, or resource lifecycle.", () => {
  ruleTester.run("hook-complexity", hookComplexityRule, {
    valid: [],
    invalid: [
      // useEffect (free) + subscription (on/off) + resource lifecycle (destroy): 3 categories, scoring 2.
      {
        code: "export function useVideoPlayer(src: string) { useEffect(() => { player.on('play', handlePlay); return () => { player.off('play', handlePlay); player.destroy(); }; }, [src]); return {}; }",
        filename: srcFile("features/player/player.tsx"),
        errors: [
          {
            message:
              'Hook "useVideoPlayer" has an extraction score of 2 and must be extracted to a hooks/ folder. See docs/next-codebase-guide/rules/hook-extraction-rule.md',
          },
        ],
      },
      // useEffect (free) + an awaited fetch (external I/O) + DOM manipulation (classList): 3 categories, scoring 2.
      {
        code: "export function useHighlightOnLoad(ref) { useEffect(() => { async function run() { await fetch('/api/data'); ref.current.classList.add('ready'); } run(); }, [ref]); return {}; }",
        filename: srcFile("features/dashboard/dashboard.tsx"),
        errors: [
          {
            message:
              'Hook "useHighlightOnLoad" has an extraction score of 2 and must be extracted to a hooks/ folder. See docs/next-codebase-guide/rules/hook-extraction-rule.md',
          },
        ],
      },
      // useEffect (free) + storage read/write, both the same External I/O category: 2 categories, scoring 1.
      {
        code: "export function useCachedFlag(key) { useEffect(() => { const cached = localStorage.getItem(key); if (!cached) localStorage.setItem(key, '1'); }, [key]); return {}; }",
        filename: srcFile("features/dashboard/hooks/use-cached-flag.ts"),
        errors: [
          {
            message:
              'Hook "useCachedFlag" has an extraction score below two and must stay inline in its consumer file. See docs/next-codebase-guide/rules/hook-extraction-rule.md',
          },
        ],
      },
    ],
  });
});
