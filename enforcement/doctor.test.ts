import { mkdtempSync, realpathSync, writeFileSync, mkdirSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runDoctor } from "./doctor.js";

const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-doctor-")));

function writeJson(relativePath: string, contents: object): void {
  const filename = path.join(root, relativePath);
  mkdirSync(path.dirname(filename), { recursive: true });
  writeFileSync(filename, JSON.stringify(contents, undefined, 2));
}

void describe("runDoctor", () => {
  void describe("framework packages check", () => {
    void it("reports when pasika is missing", () => {
      writeJson("pkg-no-pasika/package.json", {
        name: "test",
        devDependencies: { zirka: "^0.0.38" },
      });
      const findings = runDoctor(path.join(root, "pkg-no-pasika"));
      assert.ok(findings.some((f) => f.check === "pasika-installed"));
    });

    void it("reports when zirka is missing", () => {
      writeJson("pkg-no-zirka/package.json", {
        name: "test",
        devDependencies: { pasika: "^0.3.0" },
      });
      const findings = runDoctor(path.join(root, "pkg-no-zirka"));
      assert.ok(findings.some((f) => f.check === "zirka-installed"));
    });

    void it("passes when both are installed", () => {
      writeJson("pkg-both/package.json", {
        name: "test",
        devDependencies: { pasika: "^0.3.0", zirka: "^0.0.38" },
      });
      const findings = runDoctor(path.join(root, "pkg-both"));
      assert.ok(!findings.some((f) => f.check === "pasika-installed"));
      assert.ok(!findings.some((f) => f.check === "zirka-installed"));
    });
  });

  void describe("source root check", () => {
    void it("reports when src/ does not exist", () => {
      mkdirSync(path.join(root, "pkg-no-src"), { recursive: true });
      writeJson("pkg-no-src/package.json", { name: "test" });
      const findings = runDoctor(path.join(root, "pkg-no-src"));
      assert.ok(findings.some((f) => f.check === "source-under-src"));
    });

    void it("passes when src/ exists", () => {
      mkdirSync(path.join(root, "pkg-with-src/src"), { recursive: true });
      writeJson("pkg-with-src/package.json", { name: "test" });
      const findings = runDoctor(path.join(root, "pkg-with-src"));
      assert.ok(!findings.some((f) => f.check === "source-under-src" && f.severity === "error"));
    });
  });

  void describe("global stylesheet check", () => {
    void it("reports when no global stylesheet exists", () => {
      mkdirSync(path.join(root, "pkg-no-css/src/app"), { recursive: true });
      writeJson("pkg-no-css/package.json", { name: "test" });
      const findings = runDoctor(path.join(root, "pkg-no-css"));
      assert.ok(findings.some((f) => f.check === "global-stylesheet"));
    });

    void it("passes when a global stylesheet exists, whatever its contents", () => {
      const dir = path.join(root, "pkg-with-css/src/app");
      mkdirSync(dir, { recursive: true });
      writeFileSync(path.join(dir, "globals.css"), "body { color: red; }\n");
      writeJson("pkg-with-css/package.json", { name: "test" });
      const findings = runDoctor(path.join(root, "pkg-with-css"));
      assert.ok(!findings.some((f) => f.check === "global-stylesheet"));
    });
  });

  void describe("config baseline check", () => {
    void it("reports when eslint config is missing", () => {
      mkdirSync(path.join(root, "pkg-no-eslint/src"), { recursive: true });
      writeJson("pkg-no-eslint/package.json", {
        name: "test",
        devDependencies: { pasika: "^0.3.0", zirka: "^0.0.38" },
      });
      const findings = runDoctor(path.join(root, "pkg-no-eslint"));
      assert.ok(findings.some((f) => f.check === "config-baseline"));
    });

    void it("reports when eslint config does not reference zirka", () => {
      mkdirSync(path.join(root, "pkg-no-zirka-ref/src"), { recursive: true });
      writeFileSync(path.join(root, "pkg-no-zirka-ref/eslint.config.ts"), "export default {};\n");
      writeFileSync(path.join(root, "pkg-no-zirka-ref/tsconfig.json"), JSON.stringify({ compilerOptions: {} }));
      writeJson("pkg-no-zirka-ref/package.json", {
        name: "test",
        devDependencies: { pasika: "^0.3.0", zirka: "^0.0.38" },
      });
      const findings = runDoctor(path.join(root, "pkg-no-zirka-ref"));
      assert.ok(findings.some((f) => f.check === "config-baseline" && f.message.includes("zirka")));
    });

    void it("passes when eslint config references zirka", () => {
      mkdirSync(path.join(root, "pkg-good-eslint/src"), { recursive: true });
      writeFileSync(
        path.join(root, "pkg-good-eslint/eslint.config.ts"),
        'import { zirka } from "zirka"; export default zirka();',
      );
      writeFileSync(path.join(root, "pkg-good-eslint/tsconfig.json"), JSON.stringify({ compilerOptions: {} }));
      writeJson("pkg-good-eslint/package.json", {
        name: "test",
        devDependencies: { pasika: "^0.3.0", zirka: "^0.0.38" },
      });
      const findings = runDoctor(path.join(root, "pkg-good-eslint"));
      assert.ok(!findings.some((f) => f.check === "config-baseline"));
    });

    void it("reports when tsconfig is missing", () => {
      mkdirSync(path.join(root, "pkg-no-tsconfig/src"), { recursive: true });
      writeFileSync(
        path.join(root, "pkg-no-tsconfig/eslint.config.ts"),
        'import { zirka } from "zirka"; export default zirka();',
      );
      writeJson("pkg-no-tsconfig/package.json", {
        name: "test",
        devDependencies: { pasika: "^0.3.0", zirka: "^0.0.38" },
      });
      const findings = runDoctor(path.join(root, "pkg-no-tsconfig"));
      assert.ok(findings.some((f) => f.check === "config-baseline" && f.message.includes("tsconfig")));
    });
  });

  void describe("managed file check", () => {
    void it("warns when a managed file is newer than the manifest", () => {
      const pkgDir = path.join(root, "pkg-managed-edit");
      mkdirSync(path.join(pkgDir, ".vulyk"), { recursive: true });
      writeJson("pkg-managed-edit/.vulyk/manifest.json", {
        "agent-policy": { targets: ["docs/agent-policy.md"] },
      });
      // Write manifest first, sleep to ensure a mtime gap, then write the target
      const manifestPath = path.join(pkgDir, ".vulyk", "manifest.json");
      const now = Date.now();
      utimesSync(manifestPath, new Date(now - 5000), new Date(now - 5000));
      mkdirSync(path.join(pkgDir, "docs"), { recursive: true });
      writeFileSync(path.join(pkgDir, "docs/agent-policy.md"), "# Policy\n");
      writeJson("pkg-managed-edit/package.json", {
        name: "test",
        devDependencies: { pasika: "^0.3.0", zirka: "^0.0.38" },
      });
      const findings = runDoctor(pkgDir);
      assert.ok(findings.some((f) => f.check === "managed-file-edit"));
    });
  });

  void describe("complete baseline", () => {
    void it("passes with no error findings", () => {
      const dir = path.join(root, "pkg-complete/src/app");
      mkdirSync(dir, { recursive: true });
      writeFileSync(path.join(dir, "globals.css"), '@import "tailwindcss";\n');
      writeJson("pkg-complete/package.json", {
        name: "test",
        devDependencies: { pasika: "^0.3.0", zirka: "^0.0.38" },
      });
      writeFileSync(
        path.join(root, "pkg-complete/eslint.config.ts"),
        'import { zirka } from "zirka"; export default zirka();',
      );
      writeFileSync(path.join(root, "pkg-complete/tsconfig.json"), JSON.stringify({ compilerOptions: {} }));
      const findings = runDoctor(path.join(root, "pkg-complete"));
      assert.ok(!findings.some((f) => f.severity === "error"));
    });
  });
});
