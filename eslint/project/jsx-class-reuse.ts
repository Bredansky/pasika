/**
 * Indexes statically knowable JSX class sets across source files.
 * Only native elements of the same tag with identical sets of at least
 * five classes qualify, regardless of class order or children.
 */
import { readFileSync } from "node:fs";
import ts from "typescript";
import { getProjectIndex, type ProjectIndex } from "./index";

const MIN_SHARED_CLASSES = 5;

export interface JsxClassOccurrence {
  file: string;
  line: number;
  column: number;
  tag: string;
  classes: string[];
}

export interface JsxClassReuseGroup {
  tag: string;
  members: JsxClassOccurrence[];
  commonClasses: string[];
}

export interface JsxClassReuse {
  occurrence: JsxClassOccurrence;
  original: JsxClassOccurrence;
  commonClasses: string[];
}

interface JsxReuseAnalysis {
  matches: Map<string, JsxClassReuse[]>;
  groups: JsxClassReuseGroup[];
}

const cache = new WeakMap<ProjectIndex, JsxReuseAnalysis>();

function staticClassText(expression: ts.Expression): string | undefined {
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
    return expression.text;
  }
  if (ts.isParenthesizedExpression(expression)) return staticClassText(expression.expression);
  if (!ts.isCallExpression(expression) || !ts.isIdentifier(expression.expression)) return undefined;
  if (expression.expression.text !== "cn") return undefined;

  const chunks: string[] = [];
  for (const arg of expression.arguments) {
    if (ts.isSpreadElement(arg)) return undefined;
    const text = staticClassText(arg);
    if (text === undefined) return undefined;
    chunks.push(text);
  }
  return chunks.join(" ");
}

function occurrencesInFile(file: string): JsxClassOccurrence[] {
  const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const result: JsxClassOccurrence[] = [];

  const visit = (node: ts.Node): void => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText(source);
      // Component call sites already reuse components; only native markup is a candidate.
      if (/^[a-z][a-z0-9-]*$/.test(tag)) {
        const attribute = node.attributes.properties.find(
          (item) => ts.isJsxAttribute(item) && ts.isIdentifier(item.name) && item.name.text === "className",
        );
        if (attribute && ts.isJsxAttribute(attribute)) {
          const initializer = attribute.initializer;
          let text: string | undefined;
          if (initializer && ts.isStringLiteral(initializer)) {
            text = initializer.text;
          } else if (initializer && ts.isJsxExpression(initializer) && initializer.expression) {
            text = staticClassText(initializer.expression);
          }
          if (text !== undefined) {
            const classes = [...new Set(text.split(/\s+/).filter(Boolean))].sort();
            if (classes.length >= MIN_SHARED_CLASSES) {
              const location = source.getLineAndCharacterOfPosition(attribute.getStart(source));
              result.push({
                file,
                line: location.line + 1,
                column: location.character,
                tag,
                classes,
              });
            }
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return result;
}

function reuseIndex(index: ProjectIndex): JsxReuseAnalysis {
  const byTagAndClasses = new Map<string, JsxClassOccurrence[]>();
  for (const file of [...index.modules.keys()].sort()) {
    if (!/\.(?:tsx|jsx)$/.test(file) || /\.(?:test|spec)\.(?:tsx|jsx)$/.test(file)) continue;
    try {
      for (const occurrence of occurrencesInFile(file)) {
        const key = JSON.stringify([occurrence.tag, occurrence.classes]);
        const members = byTagAndClasses.get(key) ?? [];
        members.push(occurrence);
        byTagAndClasses.set(key, members);
      }
    } catch {
      // An unreadable module cannot establish a safe match.
    }
  }

  const matches = new Map<string, JsxClassReuse[]>();
  const groups: JsxClassReuseGroup[] = [];
  for (const members of byTagAndClasses.values()) {
    if (new Set(members.map((member) => member.file)).size < 2) continue;
    const first = members[0];
    if (!first) continue;
    groups.push({ tag: first.tag, members, commonClasses: first.classes });
    for (const occurrence of members.slice(1)) {
      const original = members.find((member) => member.file !== occurrence.file);
      if (!original) continue;
      const entries = matches.get(occurrence.file) ?? [];
      entries.push({ occurrence, original, commonClasses: first.classes });
      matches.set(occurrence.file, entries);
    }
  }
  return { matches, groups };
}

/** Uses Pasika's file-index lifetime, so unchanged projects are only scanned once. */
export function getJsxReuseAnalysis(sourceRoot: string): JsxReuseAnalysis {
  const index = getProjectIndex(sourceRoot);
  if (!index) return { matches: new Map(), groups: [] };
  const existing = cache.get(index);
  if (existing) return existing;
  const result = reuseIndex(index);
  cache.set(index, result);
  return result;
}

export function getJsxClassReuses(sourceRoot: string): Map<string, JsxClassReuse[]> {
  return getJsxReuseAnalysis(sourceRoot).matches;
}
