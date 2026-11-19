import { describe, ruleTester, srcFile } from "../rule-tester";
import { stableExternalStoreSubscribeRule } from "./stable-external-store-subscribe";

const filename = srcFile("features/editor/hooks/use-mobile.ts");
const message =
  "Pass a stable subscribe function to useSyncExternalStore (module-level or useCallback), not an inline function recreated each render.";

void describe("A useSyncExternalStore subscription MUST have a stable function identity.", () => {
  ruleTester.run("stable-external-store-subscribe", stableExternalStoreSubscribeRule, {
    valid: [
      {
        filename,
        code: "const subscribe = (onChange) => store.subscribe(onChange); export function useStore() { return useSyncExternalStore(subscribe, getSnapshot); }",
      },
      {
        filename,
        code: "export function useStore(id) { const subscribe = useCallback((callback) => store.subscribe(id, callback), [id]); return useSyncExternalStore(subscribe, getSnapshot); }",
      },
      {
        filename,
        code: "export function useStore() { const subscribe = () => {}; return useSomethingElse(subscribe); }",
      },
    ],
    invalid: [
      {
        filename,
        code: "export function useStore() { return useSyncExternalStore((callback) => store.subscribe(callback), getSnapshot); }",
        errors: [{ message }],
      },
      {
        filename,
        code: "export function useStore() { return React.useSyncExternalStore(function(callback) { return store.subscribe(callback); }, getSnapshot); }",
        errors: [{ message }],
      },
    ],
  });
});
