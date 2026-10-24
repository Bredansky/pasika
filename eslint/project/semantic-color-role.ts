/**
 * A boundary-specific color must describe its visual role using the -edge
 * suffix, rather than repeating the CSS property name in the token.
 *
 * Examples: border, retro-border, control-ring -> invalid;
 *           control-edge, primary-soft-edge -> valid.
 */
const BOUNDARY_PROPERTY_WORDS = new Set(["border", "outline", "ring", "stroke"]);

export function violatesBoundaryColorRole(token: string): boolean {
  return !token.endsWith("-edge") && token.split("-").some((word) => BOUNDARY_PROPERTY_WORDS.has(word));
}

/** The suffix fixes which kind of paint a project color token may represent. */
export type SemanticColorRole = "canvas" | "ink" | "edge";

const BACKGROUND_COLOR_UTILITIES = new Set(["bg", "from", "via", "to"]);
const TEXT_COLOR_UTILITIES = new Set(["text"]);
const BOUNDARY_COLOR_UTILITIES = new Set(["border", "divide", "outline", "ring", "stroke"]);

/**
 * A generated Tailwind color utility is not valid merely because the theme
 * defines its token: text-base-edge applies boundary paint to readable text.
 * Other color operations have their own rules (e.g. SVG fill and ring offsets).
 */
export function incompatibleColorUtilityRole(prefix: string, token: string): SemanticColorRole | undefined {
  let role: SemanticColorRole | undefined;
  if (token.endsWith("-canvas")) role = "canvas";
  else if (token.endsWith("-ink")) role = "ink";
  else if (token.endsWith("-edge")) role = "edge";
  if (!role) return undefined;

  if (BACKGROUND_COLOR_UTILITIES.has(prefix)) return role === "canvas" ? undefined : role;
  if (TEXT_COLOR_UTILITIES.has(prefix)) return role === "ink" ? undefined : role;
  if (BOUNDARY_COLOR_UTILITIES.has(prefix)) return role === "edge" ? undefined : role;
  return undefined;
}
