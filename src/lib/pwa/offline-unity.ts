// "Save for offline" for Unity WebGL builds (about 6 MB each).
//
// public/sw.js never caches Unity builds on its own: 37 builds would be over
// 200 MB. The player saves a build on purpose, this module writes its files
// into the oiyo-unity-v1 cache from the page, and the worker serves them from
// there (revalidating with a cheap 304 while online). At most MAX_SAVED builds
// are kept; saving one more removes the oldest. The list also lives in
// localStorage so /offline.html can show saved games.

export const UNITY_CACHE = "oiyo-unity-v1";
export const SAVED_KEY = "oiyo:pwa:unity-saved";
export const MAX_SAVED = 5;
/** Never fill the last bit of the browser's quota. */
export const QUOTA_HEADROOM_BYTES = 30 * 1024 * 1024;
/** Used before the real size is known (sizes of current builds are 5-7 MB). */
export const TYPICAL_BUILD_BYTES = 7 * 1024 * 1024;

export type SavedUnity = { build: string; slug: string; name: string; page: string; bytes: number; savedAt: number };

const BUILD_RE = /^[a-z0-9-]+-unity$/;

export function isUnityBuild(build: string): boolean {
  return BUILD_RE.test(build);
}

/** Every file a build needs to start (all 37 builds share this layout). */
export function unityBuildFiles(build: string): string[] {
  if (!isUnityBuild(build)) throw new Error(`not a Unity build: ${build}`);
  const base = `/prototypes/${build}`;
  return [
    `${base}/index.html`,
    "/prototypes/unity-frame-bridge.js",
    `${base}/TemplateData/style.css`,
    `${base}/TemplateData/favicon.ico`,
    `${base}/TemplateData/unity-logo-dark.png`,
    `${base}/TemplateData/progress-bar-empty-dark.png`,
    `${base}/TemplateData/progress-bar-full-dark.png`,
    `${base}/Build/WebGL.loader.js`,
    `${base}/Build/WebGL.framework.js.unityweb`,
    `${base}/Build/WebGL.wasm.unityweb`,
    `${base}/Build/WebGL.data.unityweb`,
  ];
}

/** Files only this build uses (the frame bridge is shared, so it stays). */
export function ownFiles(build: string): string[] {
  return unityBuildFiles(build).filter((f) => f.startsWith(`/prototypes/${build}/`));
}

export function parseSaved(raw: string | null): SavedUnity[] {
  if (!raw) return [];
  try {
    const list = JSON.parse(raw) as unknown;
    if (!Array.isArray(list)) return [];
    return list.filter(
      (s): s is SavedUnity =>
        Boolean(s) && typeof s === "object" && isUnityBuild(String((s as SavedUnity).build)) && typeof (s as SavedUnity).page === "string",
    );
  } catch {
    return [];
  }
}

/** Builds to remove so that `incoming` fits under `max` (oldest first). */
export function pickEvictions(saved: readonly SavedUnity[], incoming: string, max = MAX_SAVED): SavedUnity[] {
  const others = saved.filter((s) => s.build !== incoming).sort((a, b) => a.savedAt - b.savedAt);
  const over = others.length + 1 - max;
  return over > 0 ? others.slice(0, over) : [];
}

export function hasRoom(estimate: { quota?: number; usage?: number } | null | undefined, need: number): boolean {
  if (!estimate || !estimate.quota) return true; // unknown: let the browser decide
  const free = estimate.quota - (estimate.usage ?? 0);
  return free - need >= QUOTA_HEADROOM_BYTES;
}

export function upsertSaved(saved: readonly SavedUnity[], entry: SavedUnity): SavedUnity[] {
  return [...saved.filter((s) => s.build !== entry.build), entry];
}

// ── browser side ───────────────────────────────────────────

export function offlineSaveSupported(): boolean {
  return typeof window !== "undefined" && "caches" in window && "serviceWorker" in navigator && window.isSecureContext;
}

function readSaved(): SavedUnity[] {
  try {
    return parseSaved(localStorage.getItem(SAVED_KEY));
  } catch {
    return [];
  }
}

function writeSaved(list: SavedUnity[]) {
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(list));
  } catch {
    /* private mode: the cache still works, only the offline page list is missing */
  }
}

const abs = (path: string) => new URL(path, window.location.origin).href;

/** True when the build's files are really in the cache (the browser may have evicted them). */
export async function isSaved(build: string): Promise<boolean> {
  if (!offlineSaveSupported() || !isUnityBuild(build)) return false;
  try {
    const cache = await caches.open(UNITY_CACHE);
    const hits = await Promise.all(unityBuildFiles(build).map((f) => cache.match(abs(f))));
    const ok = hits.every(Boolean);
    if (!ok && readSaved().some((s) => s.build === build)) writeSaved(readSaved().filter((s) => s.build !== build));
    return ok;
  } catch {
    return false;
  }
}

export async function removeSaved(build: string): Promise<void> {
  const cache = await caches.open(UNITY_CACHE);
  await Promise.all(ownFiles(build).map((f) => cache.delete(abs(f))));
  const saved = readSaved();
  const entry = saved.find((s) => s.build === build);
  writeSaved(saved.filter((s) => s.build !== build));
  if (entry) await cache.delete(abs(entry.page));
}

/** Read a response fully, reporting bytes, and return a storable copy. */
async function download(url: string, onBytes: (n: number) => void): Promise<Response> {
  const res = await fetch(url, { cache: "no-cache", credentials: "same-origin" });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const chunks: Uint8Array[] = [];
  if (res.body) {
    const reader = res.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      onBytes(value.byteLength);
    }
  }
  const headers = new Headers(res.headers);
  // The body is already decoded; keep the validators (etag) for the worker's 304 check.
  headers.delete("content-encoding");
  headers.delete("content-length");
  return new Response(new Blob(chunks as BlobPart[]), { status: 200, statusText: "OK", headers });
}

export type SaveResult = { ok: true; entry: SavedUnity } | { ok: false; reason: "unsupported" | "no-room" | "failed" };

export async function saveUnityBuild(
  input: { build: string; slug: string; name: string; page: string; pageResources?: readonly string[] },
  onProgress: (ratio: number) => void,
): Promise<SaveResult> {
  if (!offlineSaveSupported() || !isUnityBuild(input.build)) return { ok: false, reason: "unsupported" };
  try {
    const estimate = await navigator.storage?.estimate?.();
    if (!hasRoom(estimate, TYPICAL_BUILD_BYTES)) return { ok: false, reason: "no-room" };
    void navigator.storage?.persist?.().catch(() => undefined);

    const cache = await caches.open(UNITY_CACHE);
    for (const old of pickEvictions(readSaved(), input.build)) await removeSaved(old.build);

    const files = unityBuildFiles(input.build);
    let done = 0;
    const expected = TYPICAL_BUILD_BYTES;
    const responses: [string, Response][] = [];
    for (const file of files) {
      const res = await download(abs(file), (n) => {
        done += n;
        onProgress(Math.min(0.97, done / expected));
      });
      responses.push([abs(file), res]);
    }
    // Write only after every file arrived, so a half-saved build never exists.
    for (const [key, res] of responses) await cache.put(key, res);

    // The game page and its scripts/styles, so the page itself opens offline too.
    const extras = [input.page, ...(input.pageResources ?? [])];
    for (const url of extras) {
      try {
        const u = new URL(url, window.location.origin);
        if (u.origin !== window.location.origin || /-unity\//.test(u.pathname) || u.pathname.startsWith("/api/")) continue;
        const key = u.pathname.endsWith("/") ? u.origin + u.pathname : u.href;
        const res = await download(u.href, () => undefined);
        await cache.put(key, res);
      } catch {
        /* optional extras */
      }
    }

    const entry: SavedUnity = { build: input.build, slug: input.slug, name: input.name, page: new URL(input.page, window.location.origin).pathname, bytes: done, savedAt: Date.now() };
    writeSaved(upsertSaved(readSaved(), entry));
    onProgress(1);
    return { ok: true, entry };
  } catch {
    return { ok: false, reason: "failed" };
  }
}
