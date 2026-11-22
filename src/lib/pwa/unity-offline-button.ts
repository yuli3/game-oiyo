// Wires the "Save for offline" button in UnityMainShell.astro.
import { isSaved, offlineSaveSupported, removeSaved, saveUnityBuild } from "./offline-unity";

export type OfflineLabels = { offline: string; saving: string; saved: string; removeHint: string; noRoom: string; saveFailed: string };

export function initUnityOfflineButton(shell: HTMLElement, labels: OfflineLabels): void {
  const button = shell.querySelector<HTMLButtonElement>("[data-offline-save]");
  const label = button?.querySelector<HTMLElement>("[data-offline-label]");
  const build = shell.dataset.build ?? "";
  if (!button || !label || !offlineSaveSupported()) return;

  const slug = shell.dataset.unityMain ?? "";
  const name = shell.dataset.name ?? document.title;
  let busy = false;

  const track = (event: string, extra: Record<string, unknown> = {}) => {
    try {
      (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag?.("event", event, { game_id: slug, ...extra });
    } catch {
      /* analytics is optional */
    }
  };

  const show = (state: "idle" | "saved" | "saving" | "no-room" | "failed", ratio = 0) => {
    button.dataset.state = state;
    button.setAttribute("aria-pressed", state === "saved" ? "true" : "false");
    button.title = state === "saved" ? labels.removeHint : "";
    if (state === "saving") label.textContent = `${labels.saving} ${Math.round(ratio * 100)}%`;
    else if (state === "saved") label.textContent = labels.saved;
    else if (state === "no-room") label.textContent = labels.noRoom;
    else if (state === "failed") label.textContent = labels.saveFailed;
    else label.textContent = labels.offline;
  };

  void isSaved(build).then((saved) => {
    show(saved ? "saved" : "idle");
    button.hidden = false;
  });

  button.addEventListener("click", async () => {
    if (busy) return;
    busy = true;
    try {
      if (button.dataset.state === "saved") {
        await removeSaved(build);
        show("idle");
        track("unity_offline_remove");
        return;
      }
      show("saving", 0);
      const resources = performance
        .getEntriesByType("resource")
        .map((e) => e.name)
        .filter((u) => /\/(_astro|fonts)\//.test(u));
      const result = await saveUnityBuild(
        { build, slug, name, page: window.location.pathname, pageResources: resources },
        (ratio) => show("saving", ratio),
      );
      if (result.ok) {
        show("saved");
        track("unity_offline_save", { bytes: result.entry.bytes });
      } else {
        show(result.reason === "no-room" ? "no-room" : "failed");
        track("unity_offline_save_failed", { reason: result.reason });
        window.setTimeout(() => show("idle"), 4000);
      }
    } finally {
      busy = false;
    }
  });
}
