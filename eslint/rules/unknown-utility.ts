/**
 * ESLint rule: pasika/unknown-utility
 *
 * A utility class a component references MUST be a custom @utility, a
 * theme-generated utility, or a built-in Tailwind utility. The rule reads the
 * repository's stylesheets for @utility names and @theme variables, then
 * reports class names that match none of those — the typo class like
 * `bg-primay-canvas` that no other check catches.
 *
 * Built-in Tailwind utilities are covered by a curated inventory of the theme
 * namespaces Tailwind v4 derives utilities from (colors, font sizes, radii,
 * shadows, ...). When the stylesheets reset the default theme with `--*: initial`
 * — which the framework mandates — the defaults are dead, so only the project's
 * own @theme variables and @utility names count. Classes outside those
 * namespaces — structural utilities like `flex`, spacing values like `p-4`,
 * variants, arbitrary values — pass through unchecked, so the rule only claims
 * the surface it can validate soundly.
 *
 * @see docs/next-tailwind-guide/rules/theme-and-utility-definition-rule.md
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import type { Rule } from "eslint";
import type * as ESTree from "estree";
import { sourceRootOf } from "./project-root";

/** The theme-variable namespaces Tailwind turns into utilities, and the utility prefixes that consume each one. */
const PREFIX_NAMESPACES: Record<string, string[]> = {
  bg: ["color"],
  text: ["color", "text"],
  border: ["color"],
  ring: ["color"],
  fill: ["color"],
  stroke: ["color"],
  accent: ["color"],
  caret: ["color"],
  decoration: ["color"],
  outline: ["color"],
  divide: ["color"],
  from: ["color"],
  via: ["color"],
  to: ["color"],
  shadow: ["color", "shadow"],
  rounded: ["radius"],
  font: ["font"],
  tracking: ["tracking"],
  leading: ["leading"],
  opacity: ["opacity"],
  z: ["z"],
  blur: ["blur"],
  "backdrop-blur": ["blur"],
  "ring-offset": ["color"],
};

/** Built-in utilities in a checked prefix that are not theme tokens. */
const PREFIX_BUILTINS: Record<string, string[]> = {
  bg: [
    "none",
    "cover",
    "contain",
    "auto",
    "fixed",
    "local",
    "scroll",
    "center",
    "top",
    "bottom",
    "left",
    "right",
    "left-top",
    "left-bottom",
    "right-top",
    "right-bottom",
    "repeat",
    "no-repeat",
    "repeat-x",
    "repeat-y",
    "repeat-round",
    "repeat-space",
    "clip-border",
    "clip-padding",
    "clip-content",
    "clip-text",
    "origin-border",
    "origin-padding",
    "origin-content",
    "gradient-to-t",
    "gradient-to-tr",
    "gradient-to-r",
    "gradient-to-br",
    "gradient-to-b",
    "gradient-to-bl",
    "gradient-to-l",
    "gradient-to-tl",
    "linear-to-t",
    "linear-to-tr",
    "linear-to-r",
    "linear-to-br",
    "linear-to-b",
    "linear-to-bl",
    "linear-to-l",
    "linear-to-tl",
  ],
  text: [
    "left",
    "center",
    "right",
    "justify",
    "start",
    "end",
    "wrap",
    "nowrap",
    "balance",
    "pretty",
    "ellipsis",
    "clip",
    "truncate",
    "uppercase",
    "lowercase",
    "capitalize",
    "normal-case",
    "underline",
    "overline",
    "line-through",
    "no-underline",
  ],
  border: [
    "solid",
    "dashed",
    "dotted",
    "double",
    "hidden",
    "none",
    "collapse",
    "separate",
    "x",
    "y",
    "t",
    "r",
    "b",
    "l",
    "s",
    "e",
  ],
  ring: ["inset"],
  divide: ["x", "y", "reverse"],
  from: ["t", "r", "b", "l", "tr", "tl", "br", "bl", "top", "right", "bottom", "left"],
  via: ["t", "r", "b", "l", "tr", "tl", "br", "bl", "top", "right", "bottom", "left"],
  to: ["t", "r", "b", "l", "tr", "tl", "br", "bl", "top", "right", "bottom", "left"],
  fill: ["none"],
  stroke: ["none"],
  accent: ["auto"],
  decoration: ["solid", "double", "dotted", "dashed", "wavy", "none"],
  outline: ["none", "hidden", "dashed", "dotted", "double", "solid"],
  font: ["thin", "extralight", "light", "normal", "medium", "semibold", "bold", "extrabold", "black"],
};

/**
 * Default theme tokens per namespace (Tailwind v4's default theme, pinned by
 * the framework's stack). The `text` namespace is the CSS `--text-*` variables
 * that generate font-size utilities, and the value namespaces (`animate`,
 * `ease`, `aspect`) are the ones whose class prefix equals the namespace.
 */
const DEFAULT_TOKENS: Record<string, string[]> = {
  text: ["xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl", "5xl", "6xl", "7xl", "8xl", "9xl"],
  radius: ["none", "xs", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl", "full"],
  font: ["sans", "serif", "mono"],
  shadow: ["2xs", "xs", "sm", "md", "lg", "xl", "2xl", "inner", "none"],
  tracking: ["tighter", "tight", "normal", "wide", "wider", "widest"],
  leading: ["none", "tight", "snug", "normal", "relaxed", "loose"],
  opacity: [
    "0",
    "5",
    "10",
    "15",
    "20",
    "25",
    "30",
    "35",
    "40",
    "45",
    "50",
    "55",
    "60",
    "65",
    "70",
    "75",
    "80",
    "85",
    "90",
    "95",
    "100",
  ],
  z: ["0", "10", "20", "30", "40", "50", "auto"],
  blur: ["none", "xs", "sm", "md", "lg", "xl", "2xl", "3xl"],
  animate: ["none", "spin", "ping", "pulse", "bounce"],
  ease: ["linear", "in", "out", "in-out"],
  // Note: aspect's auto/square, radius's none/full, leading's none, blur's
  // none, animate's none, and ease's linear are static built-ins covered by
  // STATIC_VALUE_TOKENS; the remainder are theme-derived.
  aspect: ["video"],
};

/**
 * Value namespaces whose leading tokens Tailwind v4 bakes in as static
 * utilities, independent of any theme variable, so they survive a
 * `--*: initial` reset. Enumerated from Tailwind v4's `staticValues` tables;
 * each key maps to the theme namespace (the utility prefix for bare
 * namespaces like `aspect`, or the namespace an existing prefix like `rounded`
 * reads from). Treating them as dead theme tokens under the reset reads
 * built-in utilities as unknowns, so the static ones are known regardless of
 * the reset.
 */
const STATIC_VALUE_TOKENS: Record<string, string[]> = {
  aspect: ["auto", "square"],
  radius: ["none", "full"],
  leading: ["none"],
  blur: ["none"],
  animate: ["none"],
  ease: ["linear", "initial"],
  z: ["auto"],
};

/** The default palette families and shades; `--color-*` tokens also cover project families. */
const DEFAULT_PALETTE_FAMILIES = new Set([
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose",
  "slate",
  "gray",
  "zinc",
  "neutral",
  "stone",
]);
const DEFAULT_PALETTE_SHADES = new Set(["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"]);
const DEFAULT_COLOR_SPECIALS = new Set(["white", "black", "transparent", "current", "inherit"]);
/** Color specials Tailwind v4 bakes in as static keywords, surviving a `--*: initial` reset. */
const STATIC_COLOR_SPECIALS = new Set(["transparent", "current", "inherit"]);

/** Numeric-scale values like `border-2`, `to-50%`, `leading-6`, `rounded-2.5`. */
const NUMERIC_TOKEN_RE = /^-?(?:\d+\.?\d*|\.\d+)(?:%|px|rem|em)?$/;
/** Side widths like `border-x-2`, `divide-y-4`. */
const SIDE_WIDTH_TOKEN_RE = /^(?:x|y|t|r|b|l|s|e)-(?:\d+\.?\d*|\.\d+)(?:%|px|rem|em)?$/;
/** Offsets like `outline-offset-2`. */
const OFFSET_TOKEN_RE = /^offset-(?:\d+\.?\d*|\.\d+)(?:%|px|rem|em)?$/;

interface Inventory {
  utilities: Set<string>;
  /** The first segment of every custom @utility, e.g. `primary` for `primary-surface`. */
  utilityPrefixes: Set<string>;
  themeTokens: Map<string, Set<string>>;
  /** The stylesheets reset Tailwind's default theme with `--*: initial`, disabling the default tokens. */
  defaultsReset: boolean;
  /** Class names defined as plain CSS selectors (not `@utility`), so existing-but-unregistered classes get an accurate message. */
  plainClasses: Set<string>;
}

/** Every `.css` file under `dir`, recursively, skipping dot-directories and node_modules. */
function stylesheetFiles(dir: string): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return [];
  }
  return entries.flatMap((entry) => {
    if (entry.startsWith(".") || entry === "node_modules") return [];
    const entryPath = path.join(dir, entry);
    let stats;
    try {
      stats = statSync(entryPath);
    } catch {
      return [];
    }
    if (stats.isDirectory()) return stylesheetFiles(entryPath);
    return path.extname(entry) === ".css" ? [entryPath] : [];
  });
}

/** The raw contents of every `@theme` / `@theme inline` block, brace-matched. */
function themeBlocks(css: string): string[] {
  const blocks: string[] = [];
  let index = 0;
  while (index < css.length) {
    const match = /@theme(?:\s+inline)?\s*\{/.exec(css.slice(index));
    if (!match) break;
    const open = index + match.index + match[0].length - 1;
    let depth = 1;
    let cursor = open + 1;
    for (; cursor < css.length && depth > 0; cursor++) {
      if (css[cursor] === "{") depth++;
      else if (css[cursor] === "}") depth--;
    }
    blocks.push(css.slice(open + 1, cursor - 1));
    index = cursor;
  }
  return blocks;
}

/** Class names declared as `.<name>` selectors in a stylesheet, i.e. defined outside `@utility`/`@theme`. */
function classSelectors(css: string): string[] {
  // Do not descend into @utility blocks, whose `@apply` bodies can contain
  // parenthesized variable utilities like `bg-(--primary-canvas)`.
  const blocks: string[] = [];
  let index = 0;
  while (index < css.length) {
    const match = /@utility\s*\{/.exec(css.slice(index));
    if (!match) break;
    const open = index + match.index + match[0].length - 1;
    let depth = 1;
    let cursor = open + 1;
    for (; cursor < css.length && depth > 0; cursor++) {
      if (css[cursor] === "{") depth++;
      else if (css[cursor] === "}") depth--;
    }
    blocks.push(css.slice(open + 1, cursor - 1));
    index = cursor;
  }
  let selectors = css;
  for (const block of blocks) selectors = selectors.replace(block, "");
  const names: string[] = [];
  // A class name in a selector is followed by optional whitespace then one of
  // `{`, `,`, `.`, `:`, `#`, `>`, or end of string. This skips `url(...)` and
  // value tokens, which never precede those characters directly after a name.
  for (const match of selectors.matchAll(/\.(?<className>[a-z][a-z0-9_-]*)(?=\s*[.,:#>{]|$)/gi)) {
    const className = match.groups?.className;
    if (className) names.push(className);
  }
  return names;
}

/** Builds the repository's custom-utility and theme-token inventory from its stylesheets. */
function readInventory(files: string[]): Inventory {
  const utilities = new Set<string>();
  const utilityPrefixes = new Set<string>();
  const themeTokensByNamespace = new Map<string, Set<string>>();
  const plainClasses = new Set<string>();
  let defaultsReset = false;
  for (const file of files) {
    let css: string;
    try {
      css = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    for (const name of css.matchAll(/@utility\s+(?<utilityName>[a-zA-Z0-9_-]+)/g)) {
      const utilityName = name.groups?.utilityName;
      if (!utilityName) continue;
      utilities.add(utilityName);
      const dash = utilityName.indexOf("-");
      if (dash > 0) utilityPrefixes.add(utilityName.slice(0, dash));
    }
    for (const plainClass of classSelectors(css)) plainClasses.add(plainClass);
    for (const block of themeBlocks(css)) {
      if (/--\*\s*:\s*initial\b/.test(block)) defaultsReset = true;
      for (const decl of block.matchAll(/--(?<namespace>[a-z][a-z0-9]*)-(?<token>[a-z0-9][a-z0-9_-]*)\s*:/g)) {
        const namespace = decl.groups?.namespace;
        const token = decl.groups?.token;
        if (!namespace || !token) continue;
        let set = themeTokensByNamespace.get(namespace);
        if (!set) {
          set = new Set();
          themeTokensByNamespace.set(namespace, set);
        }
        set.add(token);
      }
    }
  }
  return { utilities, utilityPrefixes, themeTokens: themeTokensByNamespace, defaultsReset, plainClasses };
}

function isColorToken(token: string, inventory: Inventory): boolean {
  if (inventory.themeTokens.get("color")?.has(token)) return true;
  // `transparent`, `current`, and `inherit` are static keywords that survive a
  // `--*: initial` reset; `white`/`black` and the palette are theme-derived.
  if (STATIC_COLOR_SPECIALS.has(token)) return true;
  if (inventory.defaultsReset) return false; // --*: initial disables the default palette
  if (DEFAULT_COLOR_SPECIALS.has(token)) return true;
  const hyphen = token.lastIndexOf("-");
  if (hyphen === -1) return false; // a bare family like `bg-red` is not a Tailwind v4 utility
  return DEFAULT_PALETTE_FAMILIES.has(token.slice(0, hyphen)) && DEFAULT_PALETTE_SHADES.has(token.slice(hyphen + 1));
}

/** Whether the class is provably a custom utility, a theme-generated utility, or a built-in. */
function isKnown(className: string, inventory: Inventory): boolean {
  // Arbitrary values and parenthesized CSS-variable utilities can't be validated here.
  if (className.includes("[") || className.includes("(")) return true;
  // Strip the trailing `!` marker and the `/opacity` modifier.
  const base = className.replace(/!+$/, "").split("/")[0] ?? "";
  // Variants (`hover:bg-x`, `sm:text-y`) don't change the utility itself.
  const segments = base.split(":");
  const utility = segments[segments.length - 1] ?? "";
  if (!utility.includes("-")) return true; // single-word built-ins like `flex` are out of scope
  const dash = utility.indexOf("-");
  // A compound prefix like `ring-offset-<color>` or `backdrop-blur-<token>`
  // keeps its own namespace instead of splitting at the first dash.
  const firstTwo = utility.split("-").slice(0, 2).join("-");
  const compound = PREFIX_NAMESPACES[firstTwo] ? firstTwo : undefined;
  const prefix = compound ?? utility.slice(0, dash);
  const token = compound ? utility.slice(compound.length + 1) : utility.slice(dash + 1);
  if (!token) return true;
  if (inventory.utilities.has(utility)) return true;
  const namespaces = PREFIX_NAMESPACES[prefix];
  if (!namespaces) {
    // A static value built in to Tailwind (aspect-auto, aspect-square) is
    // known even when the project resets the default theme — the project may
    // also define its own tokens in the same namespace (`--aspect-video`).
    if (STATIC_VALUE_TOKENS[prefix]?.includes(token)) return true;
    // A bare prefix is either a theme namespace the project defines itself
    // (`--animate-float` makes `animate-float` valid) or a custom-utility
    // family (`primary-surfce` is a typo of `primary-surface`). Classes like
    // `items-center` and `flex`, with neither, pass through.
    const projectTokens = inventory.themeTokens.get(prefix);
    if (projectTokens) {
      if (projectTokens.has(token)) return true;
      if (!inventory.defaultsReset && DEFAULT_TOKENS[prefix]?.includes(token)) return true;
      return false;
    }
    return !inventory.utilityPrefixes.has(prefix);
  }
  if (NUMERIC_TOKEN_RE.test(token) || SIDE_WIDTH_TOKEN_RE.test(token) || OFFSET_TOKEN_RE.test(token)) return true;
  if (PREFIX_BUILTINS[prefix]?.includes(token)) return true;
  for (const namespace of namespaces) {
    if (namespace === "color") {
      if (isColorToken(token, inventory)) return true;
      continue;
    }
    if (inventory.themeTokens.get(namespace)?.has(token)) return true;
    // Static built-ins (leading-none, rounded-full) exist even after the reset.
    if (STATIC_VALUE_TOKENS[namespace]?.includes(token)) return true;
    // Without the reset the default tokens exist; with `--*: initial` they are dead.
    if (!inventory.defaultsReset && DEFAULT_TOKENS[namespace]?.includes(token)) return true;
  }
  return false;
}

/** ESTree carries no JSX types, so the JSX shapes this rule reads are declared here. */
interface JsxExpressionContainer {
  type: "JSXExpressionContainer";
  expression: ESTree.Expression;
}

type JsxAttributeNode = Rule.Node & {
  name?: { name?: unknown };
  value?: ESTree.Literal | JsxExpressionContainer | null;
};

const CLASS_HELPERS = new Set(["cn", "clsx", "twMerge", "twJoin"]);

export const unknownUtilityRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require component class names to be a custom utility, theme-generated utility, or built-in.",
    },
  },
  create(context) {
    const sourceRoot = sourceRootOf(context);
    let inventory: Inventory;
    try {
      if (!statSync(sourceRoot).isDirectory()) return {};
      inventory = readInventory(stylesheetFiles(sourceRoot));
    } catch {
      // No src/ tree: the rule is inert, like the other cross-file rules.
      return {};
    }

    function reportUnknownClasses(node: Rule.Node, value: string): void {
      const seen = new Set<string>();
      for (const candidate of value.split(/\s+/)) {
        if (!candidate || seen.has(candidate)) continue;
        seen.add(candidate);
        if (isKnown(candidate, inventory)) continue;
        // A class defined as a plain CSS selector is real but not registered as
        // an @utility/theme utility. Give it an actionable message instead of the
        // unknown-verdict that reads like a typo; the framework requires the
        // utility be defined with @utility (or a @theme variable).
        const plainBase = candidate.replace(/!+$/, "").split(":").pop() ?? "";
        if (inventory.plainClasses.has(plainBase)) {
          context.report({
            node,
            message:
              `Utility class "${candidate}" is defined as a plain CSS selector in a stylesheet, not as an ` +
              "@utility (or @theme variable). Define it with @utility so the framework can own and validate it.",
          });
          continue;
        }
        context.report({
          node,
          message: `Utility class "${candidate}" is not a custom @utility, a theme-generated utility, or a built-in Tailwind utility.`,
        });
      }
    }

    /** Walks every expression a class name can hide in: conditionals, arrays, and object keys. */
    function checkExpression(node: Rule.Node, expression: ESTree.Node | null | undefined): void {
      if (!expression) return;

      if (expression.type === "Literal") {
        if (typeof expression.value === "string") reportUnknownClasses(node, expression.value);
        return;
      }

      if (expression.type === "TemplateLiteral") {
        for (const quasi of expression.quasis) reportUnknownClasses(node, quasi.value.raw);
        return;
      }

      if (expression.type === "LogicalExpression") {
        checkExpression(node, expression.left);
        checkExpression(node, expression.right);
        return;
      }

      if (expression.type === "ConditionalExpression") {
        checkExpression(node, expression.consequent);
        checkExpression(node, expression.alternate);
        return;
      }

      if (expression.type === "ArrayExpression") {
        for (const element of expression.elements) checkExpression(node, element);
        return;
      }

      if (expression.type === "ObjectExpression") {
        // clsx and cn accept `{ "px-3": isActive }`, so the keys carry classes.
        for (const property of expression.properties) {
          if (property.type === "Property") checkExpression(node, property.key);
        }
      }
    }

    return {
      JSXAttribute(node: JsxAttributeNode) {
        const attributeName = node.name?.name;
        if (attributeName !== "className" && attributeName !== "class") return;

        const value = node.value;
        if (!value) return;
        checkExpression(node, value.type === "JSXExpressionContainer" ? value.expression : value);
      },

      CallExpression(node) {
        if (node.callee.type !== "Identifier" || !CLASS_HELPERS.has(node.callee.name)) return;
        for (const argument of node.arguments) {
          checkExpression(node, argument);
        }
      },
    };
  },
};
