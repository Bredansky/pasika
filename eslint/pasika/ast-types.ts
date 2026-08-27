/**
 * Local AST node types for the parser-specific shapes ESLint's ESTree types
 * do not carry: JSX nodes and TypeScript type nodes.
 *
 * Every extra field is optional so that any `Rule.Node` is assignable to these
 * types — the handler parameters of the rules must accept whatever the parser
 * hands them. Narrowing happens with `type`-discriminant checks inside each
 * rule, exactly as in `no-arbitrary-tailwind.ts`.
 */
import type { Rule } from "eslint";
import type * as ESTree from "estree";

/** JSXIdentifier — the parser-specific name node of a JSX element or attribute. */
export interface JsxIdentifier {
  type: "JSXIdentifier";
  name: string;
}

/** JSXMemberExpression — `<Foo.Bar>`, used by element and attribute names. */
export interface JsxMemberExpression {
  type: "JSXMemberExpression";
  object: JsxIdentifier | JsxMemberExpression;
  property: JsxIdentifier;
}

/** JSXExpressionContainer — the `{expression}` part of a JSX attribute value. */
export interface JsxExpressionContainer {
  type: "JSXExpressionContainer";
  expression: ESTree.Expression;
}

/** JSXAttribute — `name="value"` or `name={expression}`. */
export type JsxAttribute = Omit<Rule.Node, "type"> & {
  type: string;
  name: JsxIdentifier;
  value: ESTree.Literal | JsxExpressionContainer | null;
  parent?: JsxOpeningElementNode;
};

/** JSXSpreadAttribute — `{...props}`. */
export interface JsxSpreadAttribute {
  type: "JSXSpreadAttribute";
  name?: never;
  value?: never;
  argument: ESTree.Expression;
}

/** Anything that can appear inside `attributes` of a JSX opening element. */
export type JsxAttributeLike = JsxAttribute | JsxSpreadAttribute;

/** JSXOpeningElement — the part before the closing `>` of an element. */
export interface JsxOpeningElement {
  type: "JSXOpeningElement";
  name: JsxIdentifier | JsxMemberExpression;
  attributes: JsxAttributeLike[];
}

/** A node that may be a JSX element — used for parents and helper parameters. */
export type MaybeJsxElement = Rule.Node & {
  openingElement?: JsxOpeningElement;
};

/** JSXElement as received by a `JSXElement` visitor. */
export type JsxElementNode = MaybeJsxElement & {
  parent?: MaybeJsxElement;
};

/** JSXAttribute as received by a `JSXAttribute` visitor, with its parent chain. */
export type JsxAttributeNode = Rule.Node & {
  name?: JsxIdentifier;
  value?: ESTree.Literal | JsxExpressionContainer | null;
  parent?: JsxOpeningElementNode;
};

/** JSXOpeningElement reached through a parent chain. */
export type JsxOpeningElementNode = Rule.Node & {
  name?: JsxIdentifier;
  attributes?: JsxAttributeLike[];
  parent?: JsxElementNode;
};

/**
 * FunctionDeclaration as seen by a rule visitor. ESLint's ESTree typing says
 * `id` is always present, but an anonymous `export default function () {}`
 * reaches the visitor with `id: null`, so the field is kept nullable.
 */
export type FunctionDeclarationNode = Rule.Node & {
  id?: { name?: string } | null;
  body?: ESTree.BlockStatement;
};

/**
 * TSTypeAliasDeclaration — `type X = ...`, from the typescript-eslint parser.
 *
 * Kept as a plain `Rule.Node` intersection so it can be passed to
 * `context.report`, which requires an ESTree node.
 */
export type TsTypeAliasDeclarationNode = Rule.Node & {
  id?: { type?: string; name?: string };
  typeAnnotation?: TsTypeNode;
};

/**
 * A member of a type literal (TSPropertySignature, TSIndexSignature, ...).
 *
 * The `type` field is widened (via Omit) so it can be compared against the
 * parser-specific "TSPropertySignature" string that ESTree's union lacks.
 */
export type TsTypeElementNode = Omit<Rule.Node, "type"> & {
  type: string;
  key?: { type?: string; name?: string };
  typeAnnotation?: TsTypeAnnotationNode;
};

/** TSTypeAnnotation — the `: T` wrapper around a type node. */
export type TsTypeAnnotationNode = Omit<Rule.Node, "type"> & {
  type: string;
  typeAnnotation?: TsTypeNode;
};

/** Any TypeScript type node the rules read (TSTypeLiteral, TSUnionType, ...). */
export type TsTypeNode = Omit<Rule.Node, "type"> & {
  type: string;
  members?: TsTypeElementNode[];
  types?: TsTypeNode[];
  literal?: { type?: string; value?: unknown };
};
