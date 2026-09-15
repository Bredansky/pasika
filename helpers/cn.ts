import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines conditional classes and resolves conflicting Tailwind utilities, so a
 * later class wins over an earlier one that sets the same property.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
