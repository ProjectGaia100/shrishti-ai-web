import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normalizes a longitude value to be within [-180, 180].
 */
export function normalizeLongitude(lon: number): number {
  return ((lon + 180) % 360 + 360) % 360 - 180;
}
