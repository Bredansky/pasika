import { describe, ruleTester, srcFile } from "../rule-tester";
import { noRenderRefDomCallsRule } from "./no-render-ref-dom-calls";

const filename = srcFile("features/editor/media-item.tsx");
const message =
  "Do not invoke DOM methods on ref.current during React render. Move the side effect to an event handler or useEffect.";

void describe("A React component MUST NOT invoke imperative DOM methods on ref.current during render.", () => {
  ruleTester.run("no-render-ref-dom-calls", noRenderRefDomCallsRule, {
    valid: [
      {
        filename,
        code: "export function MediaItem({ active }) { useEffect(() => { if (!active) videoRef.current?.pause(); }, [active]); return <video ref={videoRef} />; }",
      },
      {
        filename,
        code: "export function MediaItem() { const onStop = () => videoRef.current.pause(); return <button onClick={onStop}>Stop</button>; }",
      },
      {
        filename,
        code: "export function MediaItem() { return <button onClick={() => videoRef.current.pause()}>Stop</button>; }",
      },
      {
        filename,
        code: "export const MediaItem = () => { function pauseMedia() { videoRef.current.pause(); } return <button onClick={pauseMedia}>Stop</button>; };",
      },
      { filename, code: "export function MediaItem() { someObject.pause(); return <div />; }" },
      {
        filename: srcFile("features/editor/media-utils.ts"),
        code: "export function MediaItem() { videoRef.current.pause(); }",
      },
    ],
    invalid: [
      {
        filename,
        code: "export function MediaItem({ isActive }) { if (!isActive && videoRef.current) videoRef.current.pause(); return <video />; }",
        errors: [{ message }],
      },
      {
        filename,
        code: "export const MediaItem = () => { videoRef.current.focus(); return <input />; };",
        errors: [{ message }],
      },
      {
        filename,
        code: "export function MediaItem() { videoRef.current?.play(); return <video />; }",
        errors: [{ message }],
      },
    ],
  });
});
