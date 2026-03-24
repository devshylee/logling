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

import crypto from 'crypto';

export function githubIdToUUID(githubId: string | number): string {
  const hash = crypto.createHash('md5').update(String(githubId)).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}
