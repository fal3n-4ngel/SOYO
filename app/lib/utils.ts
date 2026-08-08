import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Standard shadcn/ui helper — merges conditional classes without Tailwind class collisions. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
