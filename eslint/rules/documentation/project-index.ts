/**
 * @fileoverview Shared project index for cross-document markdown rules.
 * Scans the docs folder and caches document metadata.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

export interface DocMeta {
  /** Absolute path on disk. */
  filePath: string;
  /** Path relative to docs root. */
  doc: string;
  fileName: string;
  kind?: "guide" | "rule" | "reference" | "policy";
  title: string;
}

const KIND_BY_SUFFIX: [string, DocMeta["kind"]][] = [
  ["-rule.md", "rule"],
  ["-guide.md", "guide"],
  ["-reference.md", "reference"],
  ["-policy.md", "policy"],
];

function listMarkdownFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const entryPath = path.join(dir, entry);
    if (statSync(entryPath).isDirectory()) {
      return entry.startsWith("_") ? [] : listMarkdownFiles(entryPath);
    }
    return entry.endsWith(".md") ? [entryPath] : [];
  });
}

function extractTitle(filePath: string): string {
  const content = readFileSync(filePath, "utf8");
  const match = /^# (?<title>.+)$/m.exec(content);
  return match?.groups?.title?.trim() ?? "";
}

// Memoized cache keyed by docsRoot
const cache = new Map<string, DocMeta[]>();

/**
 * Get all documents in the docs folder. Results are cached per docsRoot.
 */
export function getProjectDocs(docsRoot: string): DocMeta[] {
  const cached = cache.get(docsRoot);
  if (cached) return cached;

  const files = listMarkdownFiles(docsRoot);
  const docs: DocMeta[] = files
    .sort((a, b) => a.localeCompare(b))
    .map((filePath) => {
      const fileName = path.basename(filePath);
      const kind = KIND_BY_SUFFIX.find(([suffix]) => fileName.endsWith(suffix))?.[1];
      return {
        filePath,
        doc: path.relative(docsRoot, filePath).split(path.sep).join("/"),
        fileName,
        kind,
        title: extractTitle(filePath),
      };
    });

  cache.set(docsRoot, docs);
  return docs;
}

/**
 * Try to find the docsRoot from a file path by walking up to find the docs/ directory.
 */
export function findDocsRoot(filePath: string): string | undefined {
  let dir = path.dirname(filePath);
  for (;;) {
    if (path.basename(dir) === "docs" && statSync(dir).isDirectory()) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}
