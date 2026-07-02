import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Convert inline markdown syntax to HTML for use with set:html in Astro components.
 * Handles: **bold**, *italic*, `code`, and line breaks (\n → <br>).
 * Safe: escapes HTML entities first, so no XSS from user-supplied strings.
 */
export function inlineMd(text: string): string {
  if (!text) return "";
  return text
    // Escape HTML entities first
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // **bold**
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    // *italic* (not preceded/followed by another *)
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>")
    // `code`
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    // line breaks
    .replace(/\n/g, "<br>");
}
