/**
 * Opt-in, isolated Next.js production-build parity.
 * The target's source files and existing dirty worktrees are never edited.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import type { CssSplitPlan } from "../eslint/rules/tailwind/css-split-plan";
import { projectCssSplit } from "../eslint/rules/tailwind/css-split-plan";

interface CssBuildAssets {
  hashes: string[];
  bytes: number;
}

export interface NextCssSplitVerification {
  matched: boolean;
  bundler: "webpack";
  originalAssets: number;
  projectedAssets: number;
  originalBytes: number;
  projectedBytes: number;
  /** Hashes of compiled CSS assets present in only one of the two builds. */
  onlyOriginal: string[];
  onlyProjected: string[];
}

function runProcess(command: string, args: string[], cwd: string): void {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
  });
  if (result.error || result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed: ${String(result.error ?? result.status)}\n${result.stderr.slice(-6000)}\n${result.stdout.slice(-6000)}`,
    );
  }
}

function findCompiledCss(directory: string): CssBuildAssets {
  const contents: Buffer[] = [];
  function visit(folder: string): void {
    if (!existsSync(folder)) return;
    for (const item of readdirSync(folder, { withFileTypes: true })) {
      const child = path.join(folder, item.name);
      if (item.isDirectory()) visit(child);
      else if (item.isFile() && item.name.endsWith(".css")) contents.push(readFileSync(child));
    }
  }
  visit(path.join(directory, ".next", "static"));
  if (contents.length === 0) throw new Error("Next build emitted no static CSS assets; cannot prove CSS parity.");
  return {
    hashes: contents.map((bytes) => createHash("sha256").update(bytes).digest("hex")).sort(),
    bytes: contents.reduce((total, bytes) => total + bytes.byteLength, 0),
  };
}

function subtractMultiset(items: readonly string[], other: readonly string[]): string[] {
  const remaining = [...other];
  const difference: string[] = [];
  for (const item of items) {
    const index = remaining.indexOf(item);
    if (index < 0) difference.push(item);
    else remaining.splice(index, 1);
  }
  return difference;
}

export async function verifyNextCssSplit(options: {
  root: string;
  cssPath: string;
  content: string;
  plan: CssSplitPlan;
  /** For isolated test fixtures; production always runs Next's own build. */
  build?: (projectRoot: string) => void | Promise<void>;
}): Promise<NextCssSplitVerification> {
  const projection = projectCssSplit(options.content, options.plan);
  const temp = mkdtempSync(path.join(os.tmpdir(), "pasika-next-css-split-"));
  const project = path.join(temp, "project");
  try {
    runProcess("git", ["clone", "--quiet", "--local", "--no-hardlinks", options.root, project], options.root);
    const relativeCss = path.relative(options.root, options.cssPath);
    if (relativeCss.startsWith("..") || path.isAbsolute(relativeCss)) {
      throw new Error("Stylesheet must be inside the target project.");
    }
    const cssPath = path.join(project, relativeCss);
    // Git checkout may convert LF to CRLF on Windows. Compare normalized
    // committed text, then give both builds the same exact input bytes.
    if (readFileSync(cssPath, "utf8").replace(/\r\n/gu, "\n") !== options.content.replace(/\r\n/gu, "\n")) {
      throw new Error("Committed CSS differs from requested source; use --head for isolated Next verification.");
    }
    writeFileSync(cssPath, options.content);
    const nodeModules = path.join(options.root, "node_modules");
    if (!existsSync(nodeModules)) throw new Error("Project node_modules is required to build the isolated clone.");
    symlinkSync(nodeModules, path.join(project, "node_modules"), "junction");
    const build =
      options.build ??
      ((projectRoot: string): void => {
        runProcess(
          process.execPath,
          // Default Turbopack rejects junctions pointing outside its filesystem
          // root. Explicit webpack mode still validates Next production CSS.
          [path.join(projectRoot, "node_modules", "next", "dist", "bin", "next"), "build", "--webpack"],
          projectRoot,
        );
      });

    await build(project);
    const original = findCompiledCss(project);
    rmSync(path.join(project, ".next"), { recursive: true, force: true });
    rmSync(path.join(project, "tsconfig.tsbuildinfo"), { force: true });
    writeFileSync(cssPath, projection.entry);
    for (const fragment of projection.fragments) {
      const destination = path.join(path.dirname(cssPath), path.basename(fragment.specifier));
      if (existsSync(destination)) throw new Error(`Split fragment filename already exists: ${fragment.specifier}`);
      mkdirSync(path.dirname(destination), { recursive: true });
      writeFileSync(destination, fragment.content);
    }

    await build(project);
    const projected = findCompiledCss(project);
    const onlyOriginal = subtractMultiset(original.hashes, projected.hashes);
    const onlyProjected = subtractMultiset(projected.hashes, original.hashes);
    return {
      matched: onlyOriginal.length === 0 && onlyProjected.length === 0,
      bundler: "webpack",
      originalAssets: original.hashes.length,
      projectedAssets: projected.hashes.length,
      originalBytes: original.bytes,
      projectedBytes: projected.bytes,
      onlyOriginal,
      onlyProjected,
    };
  } finally {
    const link = path.join(project, "node_modules");
    if (existsSync(link)) unlinkSync(link);
    rmSync(temp, { recursive: true, force: true });
  }
}
