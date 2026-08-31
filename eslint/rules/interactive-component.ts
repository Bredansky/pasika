/**
 * ESLint rule: pasika/interactive-component
 *
 * Interactive elements are component boundaries when they are mixed with other
 * content in the same component. Standalone interactive components are valid.
 *
 * @see docs/code-organization-guide/rules/interactive-component-rule.md
 */

import path from "node:path";
import type { Rule } from "eslint";
import type { JsxElementNode, MaybeJsxElement } from "../ast-types";

const INTERACTIVE_TAGS = new Set([
  "a",
  "button",
  "details",
  "embed",
  "iframe",
  "input",
  "label",
  "select",
  "textarea",
  "video",
]);

const NEXT_ROUTING_FILES = new Set([
  "default",
  "error",
  "global-error",
  "instrumentation",
  "layout",
  "loading",
  "middleware",
  "not-found",
  "page",
  "route",
  "template",
  // File conventions Next.js requires to keep their exact names in src/app/
  "apple-icon",
  "icon",
  "manifest",
  "opengraph-image",
  "robots",
  "sitemap",
  "twitter-image",
]);

/** Attributes that make an HTML element actually interactive (handler or link target). */
const INTERACTIVE_ATTRIBUTES = new Set(["onClick", "onChange", "onSubmit", "href", "onKeyDown", "onKeyUp", "onFocus", "onBlur", "htmlFor"]);

function tagName(node: MaybeJsxElement): string | undefined {
  const name = node.openingElement?.name;
  if (name?.type !== "JSXIdentifier") return undefined;
  return name.name;
}

function isInteractive(node: MaybeJsxElement): boolean {
  const name = tagName(node);
  if (name === undefined || !INTERACTIVE_TAGS.has(name)) return false;
  // A decorative element that merely looks interactive (a showcase button with
  // no handler) is not a component boundary. Only elements that actually carry
  // a handler or link target are interactive content.
  const attributes = node.openingElement?.attributes;
  if (!attributes) return false;
  return attributes.some(
    (attribute) =>
      attribute.type === "JSXAttribute" &&
      typeof attribute.name === "object" &&
      "name" in attribute.name &&
      typeof attribute.name.name === "string" &&
      INTERACTIVE_ATTRIBUTES.has(attribute.name.name),
  );
}

function isComponentElement(node: MaybeJsxElement): boolean {
  const name = tagName(node);
  return name !== undefined && /^[A-Z]/.test(name);
}

function isComponentReturn(node: JsxElementNode): boolean {
  const parent = node.parent;
  if (parent.type === "ReturnStatement") return true;
  return parent.type === "ArrowFunctionExpression" && parent.body === node;
}

/** The JSX child shape this rule reads: text, expressions, and nested elements. */
interface JsxChild {
  type?: string;
  value?: unknown;
  expression?: unknown;
  openingElement?: unknown;
  parent?: JsxChild | MaybeJsxElement;
  children?: JsxChild[];
}

/** A JSX element child (has an openingElement), kept structurally minimal. */
interface JsxElementChild extends JsxChild {
  openingElement: { name?: unknown };
}

/** A JSX element with its children, for the local walk. */
interface JsxElementWithChildren extends JsxElementChild {
  children?: JsxChild[];
}

function isJsxElementWithChildren(node: JsxChild): node is JsxElementWithChildren {
  return "children" in node && Array.isArray(node.children);
}

function isJsxElementChild(node: JsxChild | MaybeJsxElement): node is JsxElementChild {
  return "openingElement" in node;
}

function decorativeTagName(node: JsxElementChild): string | undefined {
  const name = node.openingElement.name;
  if (name && typeof name === "object" && "name" in name && typeof name.name === "string") return name.name;
  return undefined;
}

/** Structural equivalents of isInteractive/isComponentElement for the walk. */
function isInteractiveChild(node: JsxElementChild): boolean {
  const name = decorativeTagName(node);
  return name !== undefined && INTERACTIVE_TAGS.has(name);
}

function isComponentChild(node: JsxElementChild): boolean {
  const name = decorativeTagName(node);
  return name !== undefined && /^[A-Z]/.test(name);
}

/**
 * A decorative JSX element is one whose content is not the unit's purpose:
 * icons, images, and text-free visual containers (play glyphs, gradients).
 */
function isDecorative(node: JsxElementChild): boolean {
  const name = decorativeTagName(node);
  if (name === undefined) return false;
  if (INTERACTIVE_TAGS.has(name)) return false;
  if (/^[A-Z]/.test(name)) return false; // a component child is real content
  const children = node.children ?? [];
  const meaningfulText = children.some(
    (child) => child.type === "JSXText" && typeof child.value === "string" && child.value.trim().length > 0,
  );
  return !meaningfulText && !isContentElement(name);
}

/** Elements whose presence marks a wrapper as carrying real content. */
function isContentElement(name: string): boolean {
  return /^(?:h[1-6]|p|li|dt|dd|blockquote|pre|code|figcaption|caption|th|td|form|fieldset|select|textarea)$/.test(name);
}

// The AST here is parsed by @typescript-eslint/parser, whose ESTree types do
// not model JSXElement children. The walk reads children structurally
// (JsxChild) and reuses the rule's own tag helpers, which the type system
// cannot see as the same object, so the structural narrowing is intentional.
function isSoleContentOfWrapper(node: JsxElementNode): boolean {
  const parent = node.parent;
  if (!isJsxElementChild(parent)) return false;
  let current: JsxElementChild | undefined = parent;
  while (current && isJsxElementWithChildren(current) && !isInteractiveChild(current) && !isComponentChild(current)) {
    const children = current.children ?? [];
    const siblings = children.filter(isJsxElementChild);
    const meaningful = siblings.filter((sibling) => !isDecorative(sibling));
    const textContent = children.some(
      (child) => child.type === "JSXText" && typeof child.value === "string" && child.value.trim().length > 0,
    );
    const expressionContent = children.some((child) => {
      if (child.type !== "JSXExpressionContainer") return false;
      const expression = child.expression;
      return typeof expression === "object" && expression !== null && "type" in expression && expression.type !== "Literal";
    });
    if (meaningful.length <= 1 && !textContent && !expressionContent) {
      return true;
    }
    const nextParent = current.parent;
    current = nextParent !== undefined && isJsxElementChild(nextParent) ? nextParent : undefined;
  }
  return false;
}

export const interactiveComponentRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require interactive HTML elements mixed with other content to be extracted into components.",
    },
  },
  create(context) {
    if (!context.filename.endsWith(".tsx") && !context.filename.endsWith(".jsx")) return {};
    const filename = path.resolve(context.filename);
    const base = path.basename(filename, path.extname(filename));
    // Next.js App Router framework files have a rigid structure (error
    // boundaries must render a full document, metadata files are single
    // exports) and are exempt, matching the other framework-aware rules.
    if (NEXT_ROUTING_FILES.has(base)) return {};

    return {
      JSXElement(node: JsxElementNode) {
        if (!isInteractive(node)) return;
        if (isComponentElement(node.parent)) {
          return;
        }
        if (isInteractive(node.parent)) {
          return;
        }
        if (isComponentReturn(node)) {
          return;
        }
        if (isSoleContentOfWrapper(node)) {
          return;
        }

        const name = tagName(node);
        if (name === undefined) return;
        context.report({
          node,
          message:
            `Extract the interactive <${name}> into a descriptive component. ` +
            "See docs/code-organization-guide/rules/interactive-component-rule.md",
        });
      },
    };
  },
};
