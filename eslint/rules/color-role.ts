/** Shared semantic role checker for statically named Tailwind colors. */
export function colorRoleUsageMessage(className: string): string | undefined {
  const segments = className.replace(/!+$/u, "").split(":");
  const utility = ((segments[segments.length - 1] ?? "").split("/")[0] ?? "").replace(/^!/u, "");
  if (utility.includes("[") || utility.includes("(")) return undefined;
  const role = /-(?<role>canvas|ink|edge)$/u.exec(utility)?.groups?.role;
  if (!role) return undefined;
  let expected: string | undefined;
  let purpose: string | undefined;
  if (/^(?:bg|from|via|to|fill|ring-offset)-/u.test(utility)) {
    expected = "canvas";
    purpose = "backgrounds, fills, or gradients";
  } else if (/^(?:text|caret|decoration)-/u.test(utility)) {
    expected = "ink";
    purpose = "text, carets, or text decoration";
  } else if (/^(?:border|outline|ring|divide|stroke)-/u.test(utility)) {
    expected = "edge";
    purpose = "borders, outlines, rings, dividers, or strokes";
  }
  if (!expected || !purpose || role === expected) return undefined;
  return `Color utility "${className}" uses a "${role}" token for ${purpose}; use a "${expected}" token instead.`;
}
