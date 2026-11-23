/**
 * ESLint rule: pasika/constant-spacing
 *
 * Keep adjacent, same-domain const declarations together in constants modules.
 * Do not infer a domain from filename or a single broad prefix; comments and
 * different declaration kinds are deliberate section boundaries.
 *
 * @see docs/next-codebase-guide/rules/constants-rule.md
 */
import type { AST, Rule } from "eslint";

const MESSAGE =
  "Consecutive related const declarations in a constants module must not have blank lines between them. " +
  "See docs/next-codebase-guide/rules/constants-rule.md";

const CONSTANTS_FILE = /(?:^|\/)src\/(?:[^/]+\/)*constants\/[^/]+\.[cm]?[jt]sx?$/u;
const BLANK_LINE = /\r?\n[\t ]*\r?\n/u;

interface Constant {
  name: string;
  exported: boolean;
}

function declaredConstant(node: AST.Program["body"][number]): Constant | undefined {
  const exported = node.type === "ExportNamedDeclaration";
  const declaration = exported ? node.declaration : node;
  if (declaration?.type !== "VariableDeclaration" || declaration.kind !== "const") return undefined;
  if (declaration.declarations.length !== 1) return undefined;
  const binding = declaration.declarations[0]?.id;
  if (binding?.type !== "Identifier") return undefined;
  return { name: binding.name, exported };
}

function domainWords(name: string): string[] {
  return name
    .replace(/(?<left>[a-z\d])(?<right>[A-Z])/gu, "$<left> $<right>")
    .replace(/(?<left>[A-Z])(?<right>[A-Z][a-z])/gu, "$<left> $<right>")
    .split(" ")
    .map((word) => word.toLowerCase());
}

/**
 * Two shared camelCase words is the minimum evidence of a specific domain.
 * A general namespace such as "telegram" alone does not imply relatedness.
 */
function hasSharedDomain(first: string, second: string): boolean {
  const left = domainWords(first);
  const right = domainWords(second);
  if (left.length < 2 || right.length < 2) return false;
  return left[0] === right[0] && left[1] === right[1];
}

function compactBlankLines(gap: string): string {
  const newline = gap.includes("\r\n") ? "\r\n" : "\n";
  const indentation = /[\t ]*$/u.exec(gap)?.[0] ?? "";
  return newline + indentation;
}

export const constantSpacingRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "layout",
    fixable: "whitespace",
    docs: {
      description: "Keep consecutive same-domain constants together without removing semantic section boundaries.",
    },
  },
  create(context) {
    const filename = context.filename.replaceAll("\\", "/");
    if (!CONSTANTS_FILE.test(filename)) return {};
    return {
      Program() {
        const statements = context.sourceCode.ast.body;
        for (let index = 1; index < statements.length; index += 1) {
          const previous = statements[index - 1];
          const current = statements[index];
          if (!previous || !current) continue;

          const first = declaredConstant(previous);
          const second = declaredConstant(current);
          if (first === undefined || second === undefined) continue;
          if (first.exported !== second.exported) continue;
          if (!hasSharedDomain(first.name, second.name)) continue;

          const start = previous.range?.[1];
          const end = current.range?.[0];
          if (start === undefined || end === undefined) continue;
          const gap = context.sourceCode.text.slice(start, end);
          // Any comment acts as an explicit group boundary. Never touch it.
          if (gap.trim() || !BLANK_LINE.test(gap)) continue;

          context.report({
            node: current,
            message: MESSAGE,
            fix(fixer) {
              return fixer.replaceTextRange([start, end], compactBlankLines(gap));
            },
          });
        }
      },
    };
  },
};
