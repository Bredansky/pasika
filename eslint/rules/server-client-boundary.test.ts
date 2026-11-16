import { mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, ruleTester } from "../rule-tester";
import { serverClientBoundaryRule } from "./server-client-boundary";

const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-server-client-boundary-")));
const file = (rel: string): string => path.join(root, "src", rel);

function write(rel: string, code: string): void {
  const filename = file(rel);
  mkdirSync(path.dirname(filename), { recursive: true });
  writeFileSync(filename, code);
}

function fixture(rel: string): { filename: string; code: string } {
  return { filename: file(rel), code: readFileSync(file(rel), "utf8") };
}

write("utils/private.ts", 'import "server-only";\nexport const privateValue = 1;');
write("utils/marked.ts", 'import "server-only";\nexport const privateValue = 2;');
write("utils/bridge.ts", 'export * from "./private";');
write("utils/cycle-a.ts", 'export * from "./cycle-b";');
write("utils/cycle-b.ts", 'export * from "./cycle-a";\nexport * from "./private";');
write("utils/public.ts", "export const publicValue = 1;");
write("utils/arbitrary.server.ts", "export const ordinary = 2;");
write("utils/server.ts", "export const ordinary = 3;");
write("constants/index.ts", 'export * from "./shared";\nexport * from "./leaky";');
write("constants/shared.ts", "export const shared = 1;");
write("constants/leaky.ts", 'export * from "../utils/bridge";');
write("constants/server.ts", 'import "server-only";\nexport * from "./only";');
write("constants/only.ts", 'import "server-only";\nexport const onlyOnServer = 1;');
write("schemas/index.ts", 'export type { PrivateShape } from "./internal";');
write("schemas/internal.ts", 'import "server-only";\nexport type PrivateShape = { id: string };');
write("schemas/server.ts", 'export * from "./internal";');

write(
  "features/demo/direct.tsx",
  '"use client";\nimport { privateValue } from "@/utils/private";\nexport const value = privateValue;',
);
write(
  "features/demo/indirect.tsx",
  '"use client";\nimport { shared } from "@/constants";\nexport const value = shared;',
);
write(
  "features/demo/marked.tsx",
  '"use client";\nimport { privateValue } from "@/utils/marked";\nexport const value = privateValue;',
);
write("features/demo/dynamic.tsx", '"use client";\nexport const value = () => import("@/utils/private");');
write("features/demo/require.tsx", '"use client";\nconst value = require("@/utils/private");\nexport { value };');
write(
  "features/demo/cycle.tsx",
  '"use client";\nimport { privateValue } from "@/utils/cycle-a";\nexport const value = privateValue;',
);
write(
  "features/demo/type-only.tsx",
  '"use client";\nimport type { PrivateShape } from "@/schemas/internal";\nexport type Value = PrivateShape;',
);
write(
  "features/demo/shared.tsx",
  '"use client";\nimport { publicValue } from "@/utils/public";\nexport const value = publicValue;',
);
write("features/demo/server.ts", 'import "server-only";\nexport { onlyOnServer } from "@/constants/server";');
write(
  "features/demo/plain-names.tsx",
  '"use client";\nimport { ordinary as one } from "@/utils/arbitrary.server";\nimport { ordinary as two } from "@/utils/server";\nexport const value = one + two;',
);

process.chdir(root);

void describe("A Client Component MUST NOT depend on a server-only module, directly or through any runtime imports, re-exports, dynamic imports, or require() (Next.js environment poisoning guidance).", () => {
  ruleTester.run("server-client-boundary", serverClientBoundaryRule, {
    valid: [
      fixture("features/demo/type-only.tsx"),
      fixture("features/demo/shared.tsx"),
      fixture("features/demo/plain-names.tsx"),
      fixture("features/demo/server.ts"),
    ],
    invalid: [
      { ...fixture("features/demo/direct.tsx"), errors: 1 },
      { ...fixture("features/demo/indirect.tsx"), errors: 1 },
      { ...fixture("features/demo/marked.tsx"), errors: 1 },
      { ...fixture("features/demo/dynamic.tsx"), errors: 1 },
      { ...fixture("features/demo/require.tsx"), errors: 1 },
      { ...fixture("features/demo/cycle.tsx"), errors: 1 },
    ],
  });
});

void describe("A shared constants/, types/, or schemas/ index.ts barrel (including indexed subgroups) MUST NOT have a transitive runtime dependency on server-only modules.", () => {
  ruleTester.run("server-client-boundary", serverClientBoundaryRule, {
    valid: [fixture("schemas/index.ts")],
    invalid: [{ ...fixture("constants/index.ts"), errors: 1 }],
  });
});

void describe("A support-folder server.ts MUST import server-only so Next.js enforces its server boundary during compilation (Next.js server-only guidance). Pasika also identifies imports of server-only or Node.js built-ins as server-only; filenames alone do not establish a boundary.", () => {
  ruleTester.run("server-client-boundary", serverClientBoundaryRule, {
    valid: [fixture("constants/server.ts")],
    invalid: [{ ...fixture("schemas/server.ts"), errors: 1 }],
  });
});

void describe("Type-only imports and re-exports MAY reference server-only types without creating a browser runtime dependency (TypeScript type-only imports). A shared runtime schema or API contract is **not** server-only just because a route handler uses it.", () => {
  ruleTester.run("server-client-boundary", serverClientBoundaryRule, {
    valid: [fixture("features/demo/type-only.tsx"), fixture("schemas/index.ts"), fixture("features/demo/shared.tsx")],
    invalid: [{ ...fixture("features/demo/marked.tsx"), errors: 1 }],
  });
});

void describe("A server-only constant or API contract MUST NOT be re-exported from constants/index.ts; when exported outside its support folder, it MUST be exported through constants/server.ts, which MUST import server-only. All transitive runtime dependencies of index.ts MUST remain client-safe.", () => {
  ruleTester.run("server-client-boundary", serverClientBoundaryRule, {
    valid: [fixture("constants/server.ts")],
    invalid: [{ ...fixture("constants/index.ts"), errors: 1 }],
  });
});
