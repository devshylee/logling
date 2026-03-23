import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatXP(xp: number) {
  return xp.toLocaleString();
}

export const XP_PER_LEVEL = 10000;

export function getLevelProgress(xp: number) {
  const currentXP = xp % XP_PER_LEVEL;
  return (currentXP / XP_PER_LEVEL) * 100;
}
