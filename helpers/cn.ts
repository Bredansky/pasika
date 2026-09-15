import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines conditional classes and resolves conflicting Tailwind utilities, so a
 * later class wins within one utility group and the same variant, and a wider
 * class later in the list replaces the narrower ones it covers.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
