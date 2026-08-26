import { mkdtempSync, realpathSync, writeFileSync, mkdirSync } from "node:fs";
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
  void describe("vulyk dependency check", () => {
    void it("reports when vulyk is in dependencies", () => {
      writeJson("pkg-vulyk-dep/package.json", {
        name: "test",
        dependencies: { vulyk: "^0.12.0" },
      });
      const findings = runDoctor(path.join(root, "pkg-vulyk-dep"));
      assert.ok(findings.some((f) => f.check === "no-vulyk-in-package-json"));
    });

    void it("reports when vulyk is in devDependencies", () => {
      writeJson("pkg-vulyk-dev/package.json", {
        name: "test",
        devDependencies: { vulyk: "^0.12.0" },
      });
      const findings = runDoctor(path.join(root, "pkg-vulyk-dev"));
      assert.ok(findings.some((f) => f.check === "no-vulyk-in-package-json"));
    });

    void it("passes when vulyk is not a dependency", () => {
      writeJson("pkg-no-vulyk/package.json", {
        name: "test",
        dependencies: { react: "^18.0.0" },
      });
      const findings = runDoctor(path.join(root, "pkg-no-vulyk"));
      assert.ok(!findings.some((f) => f.check === "no-vulyk-in-package-json"));
    });
  });

  void describe("cache flag check", () => {
    void it("reports when lint uses --cache", () => {
      writeJson("pkg-cache/package.json", {
        name: "test",
        scripts: { lint: "eslint . --cache" },
      });
      const findings = runDoctor(path.join(root, "pkg-cache"));
      assert.ok(findings.some((f) => f.check === "no-cache-flag"));
    });

    void it("passes when lint does not use --cache", () => {
      writeJson("pkg-no-cache/package.json", {
        name: "test",
        scripts: { lint: "eslint . --no-cache" },
      });
      const findings = runDoctor(path.join(root, "pkg-no-cache"));
      assert.ok(!findings.some((f) => f.check === "no-cache-flag"));
    });
  });

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
});
