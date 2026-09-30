import { describe, ruleTester, srcFile } from "../rule-tester";
import { hookComplexityRule } from "./hook-complexity";

void describe("Single-consumer hook logic MUST be extracted when its extraction score reaches two.", () => {
  ruleTester.run("hook-complexity", hookComplexityRule, {
    valid: [
      // One built-in hook, no side effect: scores 0 — should stay.
      {
        code: "export function useSort(items: Item[]) { return useMemo(() => items.toSorted(byDate), [items]); }",
        filename: srcFile("features/billing/invoice.tsx"),
      },
      // Two distinct built-in hooks score 1 point (capped) — not enough on its own.
      {
        code: "export function usePlayerVolume(src: string) { useEffect(() => { console.log(src); }, [src]); useRef(player); return {}; }",
        filename: srcFile("features/billing/invoice.tsx"),
      },
      // useEffect plus a subscription and resource-lifecycle call: 1 (capped hook diversity is 0, only 1 hook) + 2 side-effect points = 2 — extracted, fine.
      {
        code: "export function usePlayerSetup(src: string) { useEffect(() => { player.on('play', handlePlay); player.load(src); return () => player.destroy(); }, [src]); return {}; }",
        filename: srcFile("features/player/hooks/use-player-setup.ts"),
      },
      // Non-hook functions are not checked
      {
        code: "export function helper() { useState(0); useEffect(() => {}); return 42; }",
        filename: srcFile("features/billing/invoice.tsx"),
      },
      // An unused non-exported hook does not establish a consumer.
      {
        code: "function useHelper() { useState(0); useEffect(() => {}); }",
        filename: srcFile("features/billing/invoice.tsx"),
      },
    ],
    invalid: [
      // useEffect plus a subscription and resource-lifecycle call: scores 2 — should be extracted.
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
              'Hook "useSort" has an extraction score below two and must be inlined directly into its sole consumer instead of remaining a custom hook. See docs/next-codebase-guide/rules/hook-extraction-rule.md',
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
              'Hook "usePlayerVolume" has an extraction score below two and must be inlined directly into its sole consumer instead of remaining a custom hook. See docs/next-codebase-guide/rules/hook-extraction-rule.md',
          },
        ],
      },
    ],
  });
});

void describe("A custom hook with one consumer whose extraction score is below two MUST NOT remain as a custom hook abstraction; its built-in hooks, state, effects, and handlers MUST be declared directly in the consumer.", () => {
  ruleTester.run("hook-complexity", hookComplexityRule, {
    valid: [
      // Simple single-use logic belongs directly in the component; no custom-hook abstraction exists.
      {
        code: "export function Invoice({ items }) { const sortedItems = useMemo(() => items.toSorted(byDate), [items]); return <List items={sortedItems} />; }",
        filename: srcFile("features/billing/invoice.tsx"),
      },
      // Two distinct built-in hooks, not in hooks/ — fine (scores 1, not enough to extract)
      {
        code: "export function usePlayerVolume(src) { useEffect(() => { console.log(src); }, [src]); useRef(player); return {}; }",
        filename: srcFile("features/billing/invoice.tsx"),
      },
      // Three distinct built-in hooks and nothing else — hook diversity still caps at 1 point,
      // so this scores 1, not 3. Hook diversity alone never reaches the threshold.
      {
        code: "export function useThing() { useState(0); useEffect(() => {}); useRef(null); return 1; }",
        filename: srcFile("features/billing/invoice.tsx"),
      },
      // useEffect plus subscription plus lifecycle (scoring 2) already in hooks/ — fine.
      {
        code: "export function usePlayerSetup(src) { useEffect(() => { player.on('play', handlePlay); player.load(src); return () => player.destroy(); }, [src]); return {}; }",
        filename: srcFile("features/player/hooks/use-player-setup.ts"),
      },
    ],
    invalid: [
      // Simple local custom hook with one consumer should disappear as an abstraction.
      {
        code: "function useDeveloperSettings() { const [enabled, setEnabled] = useState(false); return { enabled, setEnabled }; } export function DeveloperSettingsSection() { const settings = useDeveloperSettings(); return <Switch checked={settings.enabled} />; }",
        filename: srcFile("features/editor/developer-settings-section.tsx"),
        errors: [
          {
            message:
              'Hook "useDeveloperSettings" has one local consumer and an extraction score below two; inline its React primitives and handlers directly into the consumer instead of keeping a custom hook. See docs/next-codebase-guide/rules/hook-extraction-rule.md',
          },
        ],
      },
      // Simple hook wrongly in hooks/ folder.
      {
        code: "export function useSort(items) { return useMemo(() => items.toSorted(byDate), [items]); }",
        filename: srcFile("features/billing/hooks/use-sort.ts"),
        errors: [
          {
            message:
              'Hook "useSort" has an extraction score below two and must be inlined directly into its sole consumer instead of remaining a custom hook. See docs/next-codebase-guide/rules/hook-extraction-rule.md',
          },
        ],
      },
      // Two distinct built-in hooks (scoring 1) wrongly in hooks/ folder
      {
        code: "export function usePlayerVolume(src) { useEffect(() => { console.log(src); }, [src]); useRef(player); return {}; }",
        filename: srcFile("features/player/hooks/use-player-volume.ts"),
        errors: [
          {
            message:
              'Hook "usePlayerVolume" has an extraction score below two and must be inlined directly into its sole consumer instead of remaining a custom hook. See docs/next-codebase-guide/rules/hook-extraction-rule.md',
          },
        ],
      },
      // Three distinct built-in hooks and nothing else, wrongly in hooks/ folder — still scores
      // only 1, since hook diversity is capped at one point no matter how many hooks are called.
      {
        code: "export function useThing() { useState(0); useEffect(() => {}); useRef(null); return 1; }",
        filename: srcFile("features/player/hooks/use-thing.ts"),
        errors: [
          {
            message:
              'Hook "useThing" has an extraction score below two and must be inlined directly into its sole consumer instead of remaining a custom hook. See docs/next-codebase-guide/rules/hook-extraction-rule.md',
          },
        ],
      },
    ],
  });
});

void describe("Inline component coverage for the single-consumer hook extraction requirement.", () => {
  ruleTester.run("hook-complexity:inline-component", hookComplexityRule, {
    valid: [
      {
        code: [
          "export function InstagramEditor() {",
          "  const [layers, setLayers] = useState([]);",
          "  useEffect(() => { updateCanvasLayers(layers); }, [layers]);",
          "  return <Canvas layers={layers} />;",
          "}",
        ].join("\n"),
        filename: srcFile("features/editor/instagram-editor.tsx"),
      },
      {
        code: "export function Player() { useEffect(() => { localStorage.getItem('volume'); }, []); return <PlayerView />; }",
        filename: srcFile("features/player/player.tsx"),
      },
      {
        code: "export const StaticPanel = () => <Panel />;",
        filename: srcFile("features/panel/static-panel.tsx"),
      },
    ],
    invalid: [
      {
        code: [
          "export function Player({ src }) {",
          "  useEffect(() => {",
          "    player.on('play', handlePlay);",
          "    player.load(src);",
          "    return () => { player.off('play', handlePlay); player.destroy(); };",
          "  }, [src]);",
          "  return <PlayerView />;",
          "}",
        ].join("\n"),
        filename: srcFile("features/player/player.tsx"),
        errors: [
          {
            message:
              'Component "Player" has inline hook logic with an extraction score of 2; extract that logic to a custom hook in a hooks/ folder. See docs/next-codebase-guide/rules/hook-extraction-rule.md',
          },
        ],
      },
      {
        code: [
          "export const AccountPanel = () => {",
          "  const [account, setAccount] = useState(null);",
          "  useEffect(() => { void fetch('/api/account').then(setAccount); }, []);",
          "  return <Panel account={account} />;",
          "};",
        ].join("\n"),
        filename: srcFile("features/account/account-panel.tsx"),
        errors: [
          {
            message:
              'Component "AccountPanel" has inline hook logic with an extraction score of 2; extract that logic to a custom hook in a hooks/ folder. See docs/next-codebase-guide/rules/hook-extraction-rule.md',
          },
        ],
      },
      {
        code: [
          "export function AccountPanel() {",
          "  const [account, setAccount] = useState(null);",
          "  useEffect(() => { void fetch('/api/account').then(setAccount); }, []);",
          "  return <Panel account={account} />;",
          "}",
        ].join("\n"),
        filename: srcFile("features/account/account-panel.tsx"),
        errors: [
          {
            message:
              'Component "AccountPanel" has inline hook logic with an extraction score of 2; extract that logic to a custom hook in a hooks/ folder. See docs/next-codebase-guide/rules/hook-extraction-rule.md',
          },
        ],
      },
    ],
  });
});

void describe("Five imperative categories, each worth at most one point regardless of how many times it occurs: calling two or more distinct built-in hooks, and each of four kinds of imperative work a hook body's other calls can perform — subscriptions, external I/O and persistence, DOM manipulation, or resource lifecycle.", () => {
  ruleTester.run("hook-complexity", hookComplexityRule, {
    valid: [],
    invalid: [
      // useEffect (0 points, one hook) + subscription (on/off, 1 point) + resource lifecycle (destroy, 1 point): scores 2.
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
      // useEffect (0 points) + an awaited fetch (external I/O, 1 point) + DOM manipulation (classList, 1 point): scores 2.
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
      // useEffect (0 points) + storage read/write, both the same External I/O category (1 point): scores 1.
      {
        code: "export function useCachedFlag(key) { useEffect(() => { const cached = localStorage.getItem(key); if (!cached) localStorage.setItem(key, '1'); }, [key]); return {}; }",
        filename: srcFile("features/dashboard/hooks/use-cached-flag.ts"),
        errors: [
          {
            message:
              'Hook "useCachedFlag" has an extraction score below two and must be inlined directly into its sole consumer instead of remaining a custom hook. See docs/next-codebase-guide/rules/hook-extraction-rule.md',
          },
        ],
      },
    ],
  });
});
