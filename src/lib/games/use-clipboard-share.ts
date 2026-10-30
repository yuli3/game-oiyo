import { useCallback, useState } from "react";

/**
 * useClipboardShare
 *
 * Provides a standardized clipboard share handler with temporary `copied` state and automatic timer reset.
 * Replaces repetitive `navigator.clipboard.writeText` + `setCopied(true)` + `setTimeout(2000)` boilerplate.
 */
export function useClipboardShare(resetDelayMs: number = 2000): {
  copied: boolean;
  shareText: (text: string) => Promise<boolean>;
} {
  const [copied, setCopied] = useState<boolean>(false);

  const shareText = useCallback(
    async (text: string): Promise<boolean> => {
      if (typeof navigator === "undefined" || !navigator.clipboard) {
        return false;
      }
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        window.setTimeout(() => setCopied(false), resetDelayMs);
        return true;
      } catch {
        return false;
      }
    },
    [resetDelayMs]
  );

  return { copied, shareText };
}
