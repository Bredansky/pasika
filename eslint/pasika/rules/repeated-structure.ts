/**
 * ESLint rule: pasika/repeated-structure
 *
 * A block of elements MUST be extracted as a named component when two or more
 * places use the same arrangement of elements for the same purpose. Different
 * data or labels do not prevent extraction. The rule compares sibling JSX
 * blocks inside one component for identical markup, ignoring the text and
 * expression contents that carry data, because a block's structure is what a
 * reader sees as repeated.
 *
 * @see docs/code-organization-guide/rules/repeated-structure-rule.md
 */

import type { Rule } from "eslint";
import type * as ESTree from "estree";

/**
 * JSX element/fragment shapes as @typescript-eslint/parser produces them.
 * ESTree carries no JSX types, so the shapes this rule reads are declared here
 * and reached through the widened `type` string, as in `no-arbitrary-tailwind`.
 */
type JsxNode = Rule.Node & {
  openingElement?: {
    name: { name?: string };
    attributes: { type: string; name?: { name?: string }; value?: { type?: string; value?: unknown } }[];
  };
  children?: JsxChild[];
};

/** A JSX child: another element, a fragment, or a non-element (text, expression). */
type JsxChild = Rule.Node | JsxNode;

/** The parser-specific `type` string of any node, JSX included. */
function nodeKind(node: Rule.Node): string {
  return (node as { type?: string }).type ?? "";
}

/** ESTree nodes lack ESLint's `parent` extension; widen to Rule.Node. */
function toRuleNode(node: ESTree.Node): Rule.Node {
  return node as Rule.Node;
}

function isJsxNode(node: Rule.Node): node is JsxNode {
  const kind = nodeKind(node);
  return kind === "JSXElement" || kind === "JSXFragment";
}

/**
 * Walk JSX nodes, descending into expression containers (maps, conditionals,
 * ternaries) so structure inside `{items.map((item) => <li>…</li>)}` counts.
 * Text, identifiers, and member-expression data are not visited, because
 * different data or labels must not change the shape.
 */
function walkJsx(current: Rule.Node, visit: (node: JsxNode) => void): void {
  const kind = nodeKind(current);

  if (kind === "JSXElement" || kind === "JSXFragment") {
    const jsx = current as JsxNode;
    visit(jsx);
    for (const child of jsx.children ?? []) walkJsx(child, visit);
  } else if (kind === "JSXExpressionContainer") {
    const expression = (current as { expression?: ESTree.Node | null }).expression;
    if (expression) walkJsx(toRuleNode(expression), visit);
  } else if (current.type === "ArrowFunctionExpression") {
    walkJsx(toRuleNode(current.body), visit);
  } else if (current.type === "CallExpression") {
    for (const argument of current.arguments) walkJsx(toRuleNode(argument), visit);
  } else if (current.type === "ConditionalExpression") {
    walkJsx(toRuleNode(current.consequent), visit);
    walkJsx(toRuleNode(current.alternate), visit);
  } else if (current.type === "LogicalExpression") {
    walkJsx(toRuleNode(current.left), visit);
    walkJsx(toRuleNode(current.right), visit);
  }
}

/**
 * Structural fingerprint of a JSX block: tag names, attribute names, and
 * class names, with text and expression contents collapsed to a placeholder so
 * different data or labels do not change the shape. JSX inside expressions
 * still contributes its structure, so a map over `<li>` vs `<div>` differs.
 */
function signature(node: JsxNode): string {
  const parts: string[] = [];
  const visit = (current: JsxNode): void => {
    const opening =
      nodeKind(current) === "JSXFragment" ? "<>" : (current.openingElement?.name as { name?: string }).name ?? "<>";
    parts.push(opening);

    if (nodeKind(current) === "JSXElement") {
      const attributes = (current.openingElement?.attributes ?? [])
        .filter((attribute) => attribute.type === "JSXAttribute")
        .map((attribute) => {
          const name = attribute.name?.name ?? "";
          if (name === "className" && attribute.value?.type === "Literal" && typeof attribute.value.value === "string") {
            return `class="${attribute.value.value.split(/\s+/).filter(Boolean).sort().join(" ")}"`;
          }
          return name;
        })
        .sort();
      parts.push(`[${attributes.join(",")}]`);
    }

    for (const child of current.children ?? []) {
      if (isJsxNode(child)) {
        visit(child);
      } else if (nodeKind(child) === "JSXExpressionContainer") {
        walkJsx(child, visit);
        parts.push("{}");
      } else {
        parts.push("{}");
      }
    }
  };
  visit(node);
  return parts.join("/");
}

/** Whether a block is large enough that repeating it reads as real duplication. */
function isSubstantial(node: JsxNode): boolean {
  let count = 0;
  walkJsx(node, () => {
    count += 1;
  });
  return count >= 3;
}

/** Direct JSX element/fragment children of an element or fragment. */
function blockChildren(node: JsxNode): JsxNode[] {
  return (node.children ?? []).filter(isJsxNode);
}

export const repeatedStructureRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require extracting a repeated block of elements as a named component.",
    },
  },
  create(context) {
    if (!context.filename.endsWith(".tsx") && !context.filename.endsWith(".jsx")) return {};

    return {
      JSXElement(node: JsxNode) {
        checkChildren(node);
      },
      JSXFragment(node: JsxNode) {
        checkChildren(node);
      },
    };

    function checkChildren(node: JsxNode): void {
      const children = blockChildren(node);
      const seen = new Map<string, JsxNode[]>();

      for (const child of children) {
        const sig = signature(child);
        const group = seen.get(sig) ?? [];
        group.push(child);
        seen.set(sig, group);
      }

      for (const [, group] of seen) {
        if (group.length < 2) continue;
        const first = group[0];
        if (!first || !isSubstantial(first)) continue;

        context.report({
          node: first,
          message:
            `The same arrangement of elements appears ${String(group.length)} times here; ` +
            "extract it as a named component. Different data or labels do not prevent extraction. " +
            "See docs/code-organization-guide/rules/repeated-structure-rule.md",
        });
      }
    }
  },
};
