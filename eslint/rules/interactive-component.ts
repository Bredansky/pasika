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
