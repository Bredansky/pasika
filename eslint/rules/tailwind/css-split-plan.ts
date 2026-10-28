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

export interface CssSplitSegment {
  /** Every block, including unresolved ones, belongs to exactly one segment. */
  ownership: string;
  blockIds: number[];
  /** Exact source-byte slice, including trivia after the last block in the segment. */
  startOffset: number;
  endOffset: number;
}

export interface CssSplitOrderConstraint {
  kind: "interleaved-owner" | "cross-segment-dependency" | "repeated-definition" | "repeated-selector" | "late-import";
  blockIds: number[];
  detail: string;
}

export interface CssSplitOwnerStableWindow {
  /** Contiguous block range needed when every resolved owner must stay whole. */
  blockIds: number[];
  startLine: number;
  endLine: number;
  owners: string[];
  unresolvedBlocks: number;
}

export interface CssSplitOrderAudit {
  /** All text before the first non-import top-level block stays at the entry point. */
  entryPrefixEndOffset: number;
  /** Ordered, lossless source ranges: NEVER sort by ownership. */
  segments: CssSplitSegment[];
  /** Maximal order-preserving partition if each resolved owner appears in only one file. */
  ownerStableWindows: CssSplitOwnerStableWindow[];
  /** These require review before treating the segments as physical files. */
  constraints: CssSplitOrderConstraint[];
}

export interface CssSplitProjection {
  /** Virtual entry point that imports every fragment in original source order. */
  entry: string;
  fragments: { specifier: string; content: string }[];
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
  order: CssSplitOrderAudit;
}

/**
 * Produce an in-memory candidate split for a compiler equivalence check.
 * Exact source slices retain comments/trivia, but import expansion and the
 * Tailwind compiler MAY still change semantics. Never apply this blindly.
 */
export function projectCssSplit(content: string, plan: CssSplitPlan): CssSplitProjection {
  if (plan.order.constraints.some((constraint) => constraint.kind === "late-import")) {
    throw new Error("Cannot project a stylesheet with @import after non-import top-level rules.");
  }
  const { entryPrefixEndOffset, segments } = plan.order;
  const fragments = segments.map((segment, index) => ({
    specifier: `./pasika-split-${String(index).padStart(3, "0")}.css`,
    content: content.slice(segment.startOffset, segment.endOffset),
  }));
  const restored = content.slice(0, entryPrefixEndOffset) + fragments.map((fragment) => fragment.content).join("");
  if (restored !== content) throw new Error("Split projection does not reproduce the original source.");
  const entry =
    content.slice(0, entryPrefixEndOffset) + fragments.map((fragment) => `@import "${fragment.specifier}";\n`).join("");
  return { entry, fragments };
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
  const blockOffsets: number[] = [];
  const ruleSelectors = new Map<number, string>();
  const imports: { afterBlockId: number | undefined }[] = [];
  for (const node of ast.children) {
    if (!node.loc || node.type === "Comment") continue;
    if (node.type === "Atrule" && node.name === "import") {
      imports.push({ afterBlockId: blocks.at(-1)?.id });
      continue;
    }
    blockOffsets.push(node.loc.start.offset);
    let label: string = node.type;
    if (node.type === "Atrule") {
      label = `@${node.name}`;
      if (node.prelude) label += ` ${generate(node.prelude).trim()}`;
    } else if (node.type === "Rule") {
      label = generate(node.prelude).trim();
      ruleSelectors.set(blocks.length, label);
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

  // Order audit is intentionally separate from responsibility grouping.
  // Source offsets allow a future virtual import projection to reconstruct
  // every byte, including comments and whitespace, in its original order.
  const segments: CssSplitSegment[] = [];
  for (const block of blocks) {
    const previous = segments.at(-1);
    if (previous?.ownership === block.ownership) {
      previous.blockIds.push(block.id);
    } else {
      segments.push({
        ownership: block.ownership,
        blockIds: [block.id],
        startOffset: blockOffsets[block.id] ?? 0,
        endOffset: options.content.length,
      });
    }
  }
  for (let index = 0; index < segments.length - 1; index++) {
    const next = segments[index + 1];
    const current = segments[index];
    if (next && current) current.endOffset = next.startOffset;
  }
  // For a single file per known owner WITHOUT reordering, every pair of
  // occurrences forces all intervening blocks into the same CSS file.
  // Overlapping forced intervals merge. Unknown owners never act as a shared
  // constraint: "unresolved" is not evidence that blocks belong together.
  const ownerLastIndex = new Map<string, number>();
  for (const block of blocks) {
    if (block.ownership !== "unresolved") ownerLastIndex.set(block.ownership, block.id);
  }
  const ownerStableWindows: CssSplitOwnerStableWindow[] = [];
  let first = 0;
  let end = -1;
  for (const block of blocks) {
    end = Math.max(end, ownerLastIndex.get(block.ownership) ?? block.id);
    if (block.id !== end) continue;
    const within = blocks.slice(first, block.id + 1);
    const firstBlock = within[0];
    if (firstBlock) {
      ownerStableWindows.push({
        blockIds: within.map((item) => item.id),
        startLine: firstBlock.startLine,
        endLine: block.endLine,
        owners: [...new Set(within.map((item) => item.ownership))].filter((owner) => owner !== "unresolved"),
        unresolvedBlocks: within.filter((item) => item.ownership === "unresolved").length,
      });
    }
    first = block.id + 1;
  }
  const segmentOf = new Map(segments.flatMap((segment, index) => segment.blockIds.map((id) => [id, index] as const)));
  const constraints: CssSplitOrderConstraint[] = [];
  for (const cohort of cohorts) {
    if (cohort.contiguousRuns < 2) continue;
    constraints.push({
      kind: "interleaved-owner",
      blockIds: cohort.blockIds,
      detail: `${cohort.ownership} spans ${String(cohort.contiguousRuns)} separated source runs; merging them reorders intervening CSS`,
    });
  }
  for (const block of blocks) {
    for (const dependency of block.dependencies) {
      if (segmentOf.get(block.id) === segmentOf.get(dependency)) continue;
      constraints.push({
        kind: "cross-segment-dependency",
        blockIds: [block.id, dependency],
        detail: `CSS in block ${String(block.id)} references a definition in block ${String(dependency)}`,
      });
    }
  }
  const byDefinition = new Map<string, number[]>();
  for (const symbol of definitions) {
    const id = blocks.find((block) => symbol.line >= block.startLine && symbol.line <= block.endLine)?.id;
    if (id === undefined) continue;
    const key = `${symbol.kind}:${symbol.name}`;
    byDefinition.set(key, [...(byDefinition.get(key) ?? []), id]);
  }
  for (const [name, ids] of byDefinition) {
    const distinct = [...new Set(ids)];
    if (new Set(distinct.map((id) => segmentOf.get(id))).size < 2) continue;
    constraints.push({
      kind: "repeated-definition",
      blockIds: distinct,
      detail: `${name} is defined in multiple source segments; preserve registration/cascade order`,
    });
  }
  const bySelector = new Map<string, number[]>();
  for (const [id, selector] of ruleSelectors) {
    bySelector.set(selector, [...(bySelector.get(selector) ?? []), id]);
  }
  for (const [selector, ids] of bySelector) {
    if (new Set(ids.map((id) => segmentOf.get(id))).size < 2) continue;
    constraints.push({
      kind: "repeated-selector",
      blockIds: ids,
      detail: `${selector} appears in multiple source segments; later rules may override earlier ones`,
    });
  }
  for (const imported of imports) {
    if (imported.afterBlockId === undefined) continue;
    constraints.push({
      kind: "late-import",
      blockIds: [imported.afterBlockId],
      detail: `@import after block ${String(imported.afterBlockId)} cannot be treated as an entry-point-only prefix`,
    });
  }

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
    order: {
      entryPrefixEndOffset: blockOffsets[0] ?? options.content.length,
      segments,
      ownerStableWindows,
      constraints,
    },
  };
}
