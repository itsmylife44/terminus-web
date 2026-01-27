import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getPtyBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_OPENCODE_URL) {
    return process.env.NEXT_PUBLIC_OPENCODE_URL;
  }

  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  return 'http://localhost:3001';
}
