import { describe, expect, it } from "vitest";
import { findSimpleRoot, getTestId, parseComponentInfo, type ComponentInfo } from "./component-conventions";

const filename = "/repo/src/features/account/account-panel.tsx";

function componentOf(source: string): ComponentInfo {
  const component = parseComponentInfo(source, filename, { includeNonExported: true })[0];
  if (!component) throw new Error("Expected fixture to define a component");
  return component;
}

describe("component convention helpers", () => {
  it("finds exported and optionally private function components", () => {
    const source = `
      function PrivateCard() { return <article />; }
      export async function AccountPanel() { await zodFetch({ url, responseSchema }); return <section />; }
      export function helper() { return <div />; }
      export function NoMarkup() { return "text"; }
    `;

    expect(parseComponentInfo(source, filename).map(({ name, smart }) => ({ name, smart }))).toEqual([
      { name: "AccountPanel", smart: true },
    ]);
    expect(parseComponentInfo(source, filename, { includeNonExported: true }).map(({ name }) => name)).toEqual([
      "PrivateCard",
      "AccountPanel",
    ]);
  });

  it("finds components exported by a separate named export", () => {
    const source = `
      function Button() { return <button />; }
      const Badge = () => <span />;
      function PrivateCard() { return <article />; }
      export { Button, Badge as StatusBadge };
      export { ExternalCard } from "./external-card";
    `;

    expect(parseComponentInfo(source, filename).map(({ name, smart }) => ({ name, smart }))).toEqual([
      { name: "Button", smart: false },
      { name: "Badge", smart: false },
    ]);
  });

  it("classifies components by data fetching or child handler ownership, not hook usage", () => {
    const components = parseComponentInfo(
      `
        export const AccountPanel = () => { React.useState(false); return <section />; };
        export const ProfileCard = function () { return <article />; };
        export const SavePanel = () => {
          const handleSave = () => save();
          return <ProfileCard onSave={handleSave} />;
        };
        export const MemoizedSavePanel = () => {
          const handleSave = React.useCallback(() => save(), []);
          return <ProfileCard onSave={handleSave} />;
        };
        export const DirectMemoizedSavePanel = () => {
          const handleSave = useCallback(() => save(), []);
          return <UI.ProfileCard onSave={handleSave} />;
        };
        export const FunctionHandlerPanel = () => {
          function handleSave() { save(); }
          return <ProfileCard onSave={handleSave}></ProfileCard>;
        };
        export const NonHandlerPropPanel = () => {
          const handleSave = () => save();
          return <ProfileCard label={handleSave} />;
        };
        export const ValuelessHandlerPanel = () => {
          const handleSave = () => save();
          return <ProfileCard onSave />;
        };
        export const InlineHandlerPanel = () => {
          const handleSave = () => save();
          return <ProfileCard onSave={() => handleSave()} />;
        };
        export const DomHandlerPanel = () => {
          const handleClick = () => save();
          return <button onClick={handleClick} />;
        };
        export const ForwardingPanel = ({ onSave }) => <ProfileCard onSave={onSave} />;
        export const AsyncPanel = async () => <section>{await localCalculation()}</section>;
        export const DataPanel = async () => {
          const data = await zodFetch({ url, responseSchema });
          return <section>{data}</section>;
        };
        export const notAComponent = () => <div />;
        export const MissingInitializer = undefined;
        export const PlainValue = 42;
      `,
      filename,
    );

    expect(components.map(({ name, smart }) => ({ name, smart }))).toEqual([
      { name: "AccountPanel", smart: false },
      { name: "ProfileCard", smart: false },
      { name: "SavePanel", smart: true },
      { name: "MemoizedSavePanel", smart: true },
      { name: "DirectMemoizedSavePanel", smart: true },
      { name: "FunctionHandlerPanel", smart: true },
      { name: "NonHandlerPropPanel", smart: false },
      { name: "ValuelessHandlerPanel", smart: false },
      { name: "InlineHandlerPanel", smart: false },
      { name: "DomHandlerPanel", smart: false },
      { name: "ForwardingPanel", smart: false },
      { name: "AsyncPanel", smart: false },
      { name: "DataPanel", smart: true },
    ]);
  });

  it("finds equivalent simple roots and rejects component or divergent roots", () => {
    const expressionRoot = findSimpleRoot(
      componentOf("const Card = () => <section data-testid='card' />;"),
      "",
      filename,
    );
    expect(expressionRoot?.tagName).toBe("section");

    const matchingRoots = findSimpleRoot(
      componentOf("function Card() { if (ready) return <section />; return <section />; }"),
      "",
      filename,
    );
    expect(matchingRoots?.tagName).toBe("section");

    expect(findSimpleRoot(componentOf("const Card = () => <Panel />;"), "", filename)).toBeUndefined();
    expect(
      findSimpleRoot(componentOf("function Card() { if (ready) return <section />; return <aside />; }"), "", filename),
    ).toBeUndefined();
  });

  it("reads literal, valueless, expression, and absent test IDs", () => {
    const literalRoot = findSimpleRoot(componentOf("const Card = () => <section data-testid='Card' />;"), "", filename);
    const valuelessRoot = findSimpleRoot(componentOf("const Card = () => <section data-testid />;"), "", filename);
    const expressionRoot = findSimpleRoot(
      componentOf("const Card = () => <section data-testid={id} />;"),
      "",
      filename,
    );
    const absentRoot = findSimpleRoot(componentOf("const Card = () => <section />;"), "", filename);
    if (!literalRoot || !valuelessRoot || !expressionRoot || !absentRoot) throw new Error("Expected simple roots");

    expect(getTestId(literalRoot).value).toBe("Card");
    expect(getTestId(valuelessRoot).attribute).toBeDefined();
    expect(getTestId(expressionRoot).value).toBeUndefined();
    expect(getTestId(absentRoot)).toEqual({});
  });
});
