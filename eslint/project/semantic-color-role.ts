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
