import { mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, ruleTester } from "../rule-tester";
import { noRedundantClientBoundaryRule, requireClientBoundaryRule } from "./client-boundary";

const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-client-boundary-")));
const file = (rel: string): string => path.join(root, "src", rel);
const write = (rel: string, source: string): void => {
  const filename = file(rel);
  mkdirSync(path.dirname(filename), { recursive: true });
  writeFileSync(filename, source);
};
const fixture = (rel: string): { filename: string; code: string } => ({
  filename: file(rel),
  code: readFileSync(file(rel), "utf8"),
});

write("app/required/error.tsx", "export default function Error() { return <p>Error</p>; }");
write("app/global-error.tsx", "export default function GlobalError() { return <p>Error</p>; }");
write("app/allowed/error.tsx", '"use client";\nexport default function Error() { return <p>Error</p>; }');
write("app/allowed/global-error.tsx", '"use client";\nexport default function GlobalError() { return <p>Error</p>; }');

write(
  "app/missing/page.tsx",
  'import { Button } from "@/features/missing/button"; export default function Page() { return <Button />; }',
);
write(
  "features/missing/button.tsx",
  "export function Button() { return <button onClick={() => alert('Hi')}>Hi</button>; }",
);
write(
  "app/marked/page.tsx",
  'import { Button } from "@/features/marked/button"; export default function Page() { return <Button />; }',
);
write(
  "features/marked/button.tsx",
  '"use client";\nexport function Button() { return <button onClick={() => alert("Hi")}>Hi</button>; }',
);

write(
  "app/browser/page.tsx",
  'import { Browser } from "@/features/browser/browser"; export default function Page() { return <Browser />; }',
);
write("features/browser/browser.tsx", "export function Browser() { return <p>{window.location.href}</p>; }");

write(
  "app/barrel/page.tsx",
  'import { Button } from "@/features/barrel"; export default function Page() { return <Button />; }',
);
write("features/barrel/index.ts", 'export { Button } from "./button";');
write(
  "features/barrel/button.tsx",
  'export function Button() { return <button onClick={() => alert("Hi")}>Hi</button>; }',
);

write(
  "app/client-only/page.tsx",
  'import { Widget } from "@/features/client-only/widget"; export default function Page() { return <Widget />; }',
);
write("features/client-only/widget.tsx", 'import "client-only"; export function Widget() { return <div />; }');

write(
  "app/nested/page.tsx",
  'import { Parent } from "@/features/nested/parent"; export default function Page() { return <Parent />; }',
);
write(
  "features/nested/parent.tsx",
  '"use client";\nimport { Child } from "./child"; import { useCount } from "./use-count"; export function Parent() { const count = useCount(); return <button onClick={() => alert(count)}><Child /></button>; }',
);
write("features/nested/child.tsx", '"use client";\nexport function Child() { return <svg />; }');
write(
  "features/nested/use-count.ts",
  'import { useState } from "react"; export function useCount() { return useState(0)[0]; }',
);

write(
  "app/presentation/page.tsx",
  'import { Badge } from "@/features/presentation/badge"; export default function Page() { return <Badge />; }',
);
write("features/presentation/badge.tsx", '"use client";\nexport function Badge() { return <span>Ready</span>; }');
write("app/unused-client/page.tsx", '"use client";\nexport default function Page() { return <span>Static</span>; }');

write(
  "app/id/page.tsx",
  'import { Name } from "@/features/id/name"; export default function Page() { return <Name />; }',
);
write(
  "features/id/name.tsx",
  'import { useId } from "react"; export function Name() { return <span id={useId()} />; }',
);

write(
  "app/types/page.tsx",
  'import type { ClientState } from "@/features/types/client-state"; export default function Page() { return <span />; }',
);
write(
  "features/types/client-state.ts",
  'import { useState } from "react"; export type ClientState = string; export function useClientState() { return useState(0); }',
);

write(
  "app/external/page.tsx",
  'import { CarouselWrapper } from "@/features/external/carousel-wrapper"; export default function Page() { return <CarouselWrapper />; }',
);
write(
  "features/external/carousel-wrapper.tsx",
  '"use client";\nimport Carousel from "third-party-carousel"; export function CarouselWrapper() { return <Carousel />; }',
);

write("features/unconsumed/pure.tsx", '"use client";\nexport function Pure() { return <span />; }');

process.chdir(root);

void describe('A Next.js App Router `error.tsx` or `global-error.tsx` file MUST declare `"use client"` as its first directive (Next.js error file convention).', () => {
  ruleTester.run("require-client-boundary", requireClientBoundaryRule, {
    valid: [fixture("app/allowed/error.tsx"), fixture("app/allowed/global-error.tsx")],
    invalid: [
      { ...fixture("app/required/error.tsx"), errors: [{ message: /error boundaries require "use client"/u }] },
      { ...fixture("app/global-error.tsx"), errors: [{ message: /error boundaries require "use client"/u }] },
    ],
  });
});

void describe('A Server Component MUST NOT use client-only React hooks, JSX event handlers, or browser-only APIs in its own file or through imported modules unless the client-only code is behind a "use client" boundary.', () => {
  ruleTester.run("require-client-boundary", requireClientBoundaryRule, {
    valid: [
      fixture("features/marked/button.tsx"),
      fixture("features/nested/use-count.ts"),
      fixture("features/id/name.tsx"),
      fixture("features/types/client-state.ts"),
      fixture("app/id/page.tsx"),
      fixture("app/types/page.tsx"),
    ],
    invalid: [
      { ...fixture("features/missing/button.tsx"), errors: [{ message: /Client-only behavior is reachable/u }] },
      { ...fixture("features/browser/browser.tsx"), errors: [{ message: /Client-only behavior is reachable/u }] },
      { ...fixture("features/barrel/button.tsx"), errors: [{ message: /Client-only behavior is reachable/u }] },
      { ...fixture("features/client-only/widget.tsx"), errors: [{ message: /Client-only behavior is reachable/u }] },
    ],
  });
});

void describe('A file imported only by code already behind a `"use client"` boundary MUST NOT repeat the directive.', () => {
  ruleTester.run("no-redundant-client-boundary", noRedundantClientBoundaryRule, {
    valid: [
      fixture("features/nested/parent.tsx"),
      fixture("features/nested/use-count.ts"),
      fixture("features/marked/button.tsx"),
    ],
    invalid: [{ ...fixture("features/nested/child.tsx"), errors: [{ message: /all runtime consumers are already/u }] }],
  });
});

void describe('Except for the error files above, a file used by the App Router MUST NOT declare `"use client"` unless it or its imports need client-only features.', () => {
  ruleTester.run("no-redundant-client-boundary", noRedundantClientBoundaryRule, {
    valid: [
      fixture("features/marked/button.tsx"),
      fixture("features/external/carousel-wrapper.tsx"),
      fixture("features/unconsumed/pure.tsx"),
      fixture("app/allowed/error.tsx"),
    ],
    invalid: [
      {
        ...fixture("features/presentation/badge.tsx"),
        errors: [{ message: /unnecessary for this server-compatible module/u }],
      },
      {
        ...fixture("app/unused-client/page.tsx"),
        errors: [{ message: /unnecessary for this server-compatible module/u }],
      },
    ],
  });
});
