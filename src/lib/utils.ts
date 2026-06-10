import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Conditionally merges Tailwind CSS classes using clsx and tailwind-merge.
 * @param inputs - A list of class values to be merged.
 * @returns A string containing the merged and resolved class names.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
