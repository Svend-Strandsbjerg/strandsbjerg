import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const PUBLIC_NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/professional", label: "Professional" },
  { href: "/contact", label: "Contact" },
] as const;
