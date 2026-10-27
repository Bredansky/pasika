/**
 * Advisory CSS split analysis. It never rewrites stylesheets: moving rules
 * requires checking both the CSS cascade and Tailwind's compiled output.
 */
import path from "node:path";
import { generate, parse } from "@eslint/css-tree";
import type { CssDependencyGraph, CssReference, CssSymbol } from "./css-dependency-graph";

export interface CssSplitBlock {
  id: number;
  startLine: number;
  endLine: number;
  label: string;
  ownership: string;
  definitions: string[];
  /** Source modules that lexically reference a definition in this block. */
  consumers: string[];
  /** Other block IDs referenced by this block's CSS. */
  dependencies: number[];
}

export interface CssSplitRun {
  ownership: string;
  startLine: number;
  endLine: number;
  blockIds: number[];
}

export interface CssSplitCohort {
  ownership: string;
  blockIds: number[];
  contiguousRuns: number;
  /** Cross-ownership edges must be checked before moving blocks. */
  externalDependencies: number;
}

export interface CssTokenUsage {
  name: string;
  cssSites: number;
  moduleSites: number;
  files: number;
}

/** All counts are lexical candidates, not measured runtime usage. */
export interface CssSplitPlan {
  blocks: CssSplitBlock[];
  /** Contiguous, order-preserving candidates only; not proposed filenames. */
  runs: CssSplitRun[];
  /** Logical responsibility groups, even when interrupted in source order. */
  cohorts: CssSplitCohort[];
  tokens: CssTokenUsage[];
  unresolvedBlocks: number;
}

function matches(reference: CssReference, symbol: CssSymbol): boolean {
  if (reference.kind === "theme-class") return symbol.kind === "theme-token" && reference.token === symbol.name;
  if (reference.kind === "variable") {
    return (symbol.kind === "root-variable" || symbol.kind === "theme-token") && symbol.name === reference.name;
  }
  return reference.kind === symbol.kind && reference.name === symbol.name;
}

function commonOwner(files: string[], sourceRoot: string): string | undefined {
  if (files.length === 0) return undefined;
  const directories = files.map((file) => path.relative(sourceRoot, file).split(path.sep).slice(0, -1));
  const first = directories[0] ?? [];
  const common: string[] = [];
  for (let i = 0; i < first.length; i++) {
    const part = first[i];
    if (part === undefined || !directories.every((dir) => dir[i] === part)) break;
    common.push(part);
  }
  // A generic "components" or "app" ancestor is not evidence of ownership.
  return common.length >= 2 ? common.slice(0, 3).join("/") : undefined;
}

/**
 * Retain top-level CSS blocks as indivisible atoms (including nested @layer /
 * @media content). A later code-mod may split these, but not by accident.
 */
export function planCssSplit(options: {
  cssPath: string;
  content: string;
  sourceRoot: string;
  graph: CssDependencyGraph;
}): CssSplitPlan {
  const cssPath = path.normalize(options.cssPath);
  const ast = parse(options.content, { positions: true, parseAtrulePrelude: false });
  if (ast.type !== "StyleSheet") throw new Error("Expected a CSS stylesheet.");
  const blocks: CssSplitBlock[] = [];
  for (const node of ast.children) {
    if (!node.loc || node.type === "Comment") continue;
    if (node.type === "Atrule" && node.name === "import") continue;
    let label: string = node.type;
    if (node.type === "Atrule") {
      label = `@${node.name}`;
      if (node.prelude) label += ` ${generate(node.prelude).trim()}`;
    } else if (node.type === "Rule") {
      label = generate(node.prelude).trim();
    }
    const globalBase = node.type === "Atrule" && node.name === "layer" && label === "@layer base";
    const foundation =
      (node.type === "Rule" && label === ":root") ||
      (node.type === "Atrule" && (node.name === "theme" || node.name === "custom-variant"));
    let ownership = "unresolved";
    if (globalBase) ownership = "global-base";
    else if (foundation) ownership = "shared-foundation";
    blocks.push({
      id: blocks.length,
      startLine: node.loc.start.line,
      endLine: node.loc.end.line,
      label,
      ownership,
      definitions: [],
      consumers: [],
      dependencies: [],
    });
  }

  const definitions = options.graph.definitions.filter((definition) => path.normalize(definition.file) === cssPath);
  const symbols = new Map<number, CssSymbol[]>();
  for (const block of blocks) {
    const contained = definitions.filter(
      (definition) => definition.line >= block.startLine && definition.line <= block.endLine,
    );
    symbols.set(block.id, contained);
    block.definitions = [...new Set(contained.map((definition) => definition.name))];
    const consumerSet = new Set<string>();
    for (const symbol of contained) {
      for (const reference of options.graph.references) {
        if (reference.source === "module" && matches(reference, symbol)) {
          consumerSet.add(path.normalize(reference.file));
        }
      }
    }
    block.consumers = [...consumerSet].sort();
    if (block.ownership === "unresolved") {
      block.ownership = commonOwner(block.consumers, options.sourceRoot) ?? "unresolved";
    }
  }

  for (const block of blocks) {
    const links = new Set<number>();
    for (const reference of options.graph.references) {
      if (reference.source !== "css" || path.normalize(reference.file) !== cssPath) continue;
      if (reference.line < block.startLine || reference.line > block.endLine) continue;
      for (const target of blocks) {
        if (target.id === block.id) continue;
        if ((symbols.get(target.id) ?? []).some((symbol) => matches(reference, symbol))) {
          links.add(target.id);
        }
      }
    }
    block.dependencies = [...links].sort((a, b) => a - b);
  }

  // A keyframe referenced only by a feature utility can inherit its owner's
  // evidence. Shared foundation blocks intentionally never inherit ownership.
  for (const block of blocks) {
    if (block.ownership !== "unresolved") continue;
    const owners = new Set(
      blocks
        .filter((consumer) => consumer.dependencies.includes(block.id))
        .map((consumer) => consumer.ownership)
        .filter((owner) => owner !== "unresolved" && owner !== "shared-foundation"),
    );
    if (owners.size === 1) block.ownership = [...owners][0] ?? "unresolved";
  }

  // A contiguous run preserves INTERNAL order, not the entire cascade.
  // Hoisting @imports can still change order against other runs, so these are
  // advisory boundaries only. Never merge noncontiguous runs automatically.
  const runs: CssSplitRun[] = [];
  for (const block of blocks) {
    if (block.ownership === "unresolved") continue;
    const previous = runs[runs.length - 1];
    if (previous?.ownership === block.ownership && previous.blockIds.at(-1) === block.id - 1) {
      previous.endLine = block.endLine;
      previous.blockIds.push(block.id);
    } else {
      runs.push({
        ownership: block.ownership,
        startLine: block.startLine,
        endLine: block.endLine,
        blockIds: [block.id],
      });
    }
  }

  const cohorts = [...new Set(blocks.map((block) => block.ownership))]
    .filter((ownership) => ownership !== "unresolved")
    .map((ownership) => {
      const owned = blocks.filter((block) => block.ownership === ownership);
      return {
        ownership,
        blockIds: owned.map((block) => block.id),
        contiguousRuns: runs.filter((run) => run.ownership === ownership).length,
        externalDependencies: owned.reduce(
          (count, block) => count + block.dependencies.filter((id) => blocks[id]?.ownership !== ownership).length,
          0,
        ),
      };
    })
    .sort((a, b) => b.blockIds.length - a.blockIds.length || a.ownership.localeCompare(b.ownership));

  const tokens = definitions
    .filter((symbol) => symbol.kind === "theme-token" || symbol.kind === "root-variable")
    .map((symbol) => {
      const refs = options.graph.references.filter((ref) => matches(ref, symbol));
      return {
        name: symbol.name,
        cssSites: refs.filter((ref) => ref.source === "css").length,
        moduleSites: refs.filter((ref) => ref.source === "module").length,
        files: new Set(refs.map((ref) => path.normalize(ref.file))).size,
      };
    })
    .sort((a, b) => b.moduleSites - a.moduleSites || a.name.localeCompare(b.name));

  return {
    blocks,
    runs,
    cohorts,
    tokens,
    unresolvedBlocks: blocks.filter((block) => block.ownership === "unresolved").length,
  };
}
