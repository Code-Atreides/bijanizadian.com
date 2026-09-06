import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * The class-name helper every shadcn component imports as `cn`.
 *
 * clsx resolves conditionals and arrays into a string; tailwind-merge then
 * removes Tailwind classes that a later class overrides, so `cn('p-2', 'p-4')`
 * is `p-4` rather than the two fighting on specificity. This is why both
 * packages are dependencies rather than just one.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
