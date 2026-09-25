import { describe, ruleTester, srcFile } from "../rule-tester";
import { noLiteralInlineStyleRule } from "./no-literal-inline-style";

const componentFile = srcFile("features/credentials/credential-card.tsx");

void describe("Components MUST use Tailwind for static styling; inline styles MAY be used for runtime-sourced values.", () => {
  ruleTester.run("no-literal-inline-style", noLiteralInlineStyleRule, {
    valid: [
      {
        code: `export function Card() { return <div className="text-sm" />; }`,
        filename: componentFile,
      },
      {
        code: `export function Layer({ position }) { return <div style={{ zIndex: position.zIndex }} />; }`,
        filename: componentFile,
      },
      {
        code: `export function BrandedButton({ buttonColor, textColor }) { return <button style={{ backgroundColor: buttonColor, color: textColor }} />; }`,
        filename: componentFile,
      },
      {
        code: `export function Layer({ style }) { return <div style={style} />; }`,
        filename: componentFile,
      },
      {
        code: `export function Layer({ compact, compactStyle, fullStyle }) { return <div style={compact ? compactStyle : fullStyle} />; }`,
        filename: componentFile,
      },
      {
        code: `export function Layer({ preferredStyle, fallbackStyle }) { return <div style={preferredStyle || fallbackStyle} />; }`,
        filename: componentFile,
      },
      {
        code: `export function Layer({ style }) { return <div style={{ ...style }} />; }`,
        filename: componentFile,
      },
      {
        code: `export function Layer({ width }) { return <div style={{ width: \`\${width}px\` }} />; }`,
        filename: componentFile,
      },
      {
        code: `export function Odd() { return <div style={{ 1: "block" }} />; }`,
        filename: componentFile,
      },
    ],
    invalid: [
      {
        code: `export function Card() { return <h3 style={{ fontSize: "0.875rem", fontWeight: 500 }}>Account</h3>; }`,
        filename: componentFile,
        errors: 1,
      },
      {
        code: `export function Canvas({ backgroundColor }) { return <div style={{ width: "100%", backgroundColor }} />; }`,
        filename: componentFile,
        errors: 1,
      },
      {
        code: `export function Grid() { return <div style={{ gridTemplateColumns: "2fr max(0, var(--gutter-width)) calc(var(--gutter-width) + 10px)" }} />; }`,
        filename: componentFile,
        errors: 1,
      },
      {
        code: `export function Glow() { return <div style={{ background: "radial-gradient(circle at center, white 0%, transparent 100%)" }} />; }`,
        filename: componentFile,
        errors: 1,
      },
      {
        code: `export function Pattern() { return <div style={{ backgroundSize: "25px 25px" }} />; }`,
        filename: componentFile,
        errors: 1,
      },
      {
        code: `export function Animated() { return <div style={{ willChange: "transform, filter" }} />; }`,
        filename: componentFile,
        errors: 1,
      },
      {
        code: `export function Menu({ active }) { return <button style={active ? { boxShadow: "0 0 0 2px var(--emphasis-edge)" } : undefined} />; }`,
        filename: componentFile,
        errors: 1,
      },
      {
        code: `export function Menu({ hidden }) { return <div style={{ display: hidden ? "none" : "block" }} />; }`,
        filename: componentFile,
        errors: 1,
      },
      {
        code: `export function Menu({ hidden, display }) { return <div style={{ display: hidden ? display : "block" }} />; }`,
        filename: componentFile,
        errors: 1,
      },
      {
        code: `export function Marker() { return <div style={{ transform: "translateY(-50%)" }} />; }`,
        filename: componentFile,
        errors: 1,
      },
      {
        code: `export function Animated() { return <div style={{ willChange: "transform" }} />; }`,
        filename: componentFile,
        errors: 1,
      },
      {
        code: `export function Marker() { return <div style={{ top: -1 }} />; }`,
        filename: componentFile,
        errors: 1,
      },
      {
        code: "export function Marker() { return <div style={{ width: `100%` }} />; }",
        filename: componentFile,
        errors: 1,
      },
      {
        code: `export function Marker({ hidden }) { return <div style={{ display: hidden && "none" }} />; }`,
        filename: componentFile,
        errors: 1,
      },
      {
        code: `export function Marker({ hidden }) { return <div style={hidden && { display: "none" }} />; }`,
        filename: componentFile,
        errors: 1,
      },
      {
        code: `export function Marker({ active }) { return <div style={active ? { display: "block" } : undefined} />; }`,
        filename: componentFile,
        errors: 1,
      },
      {
        code: `export function Marker() { return <div style={{ zoom: true }} />; }`,
        filename: componentFile,
        errors: 1,
      },
      {
        code: `export function Marker() { return <div style={{ ["display"]: "block" }} />; }`,
        filename: componentFile,
        errors: 1,
      },
      {
        code: `export function Marker({ active, dynamicStyle }) { return <div style={active ? dynamicStyle : { display: "block" }} />; }`,
        filename: componentFile,
        errors: 1,
      },
      {
        code: `export function Marker({ dynamicStyle }) { return <div style={dynamicStyle || { display: "block" }} />; }`,
        filename: componentFile,
        errors: 1,
      },
      {
        code: `export function Marker() { return <div style={{ top: +1 }} />; }`,
        filename: componentFile,
        errors: 1,
      },
      {
        code: `import { ImageResponse } from "next/og"; export function Icon() { return new ImageResponse(<div style={{ display: "flex", width: "100%", height: "100%" }} />); }`,
        filename: componentFile,
        errors: 1,
      },
    ],
  });
});
