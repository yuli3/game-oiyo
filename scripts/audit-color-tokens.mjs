#!/usr/bin/env node
// 색 토큰 감사 — 2026-09-02. SSOT: shared/tokens/oiyo-light.css
//
// 두 가지를 본다.
//
// **① 토큰이 원본과 어긋났는가.** 2026-09-02 이전에 `--primary` 가 oiyo 만
// 다른 값이었다 — oiyo 는 더 탁하고 노랬다. 값을 맞춰도 원본이 없으면 다시
// 갈라지므로, 원본을 두고 어긋나면 실패시킨다.
//
// **② 토큰 밖 하드코딩이 늘었는가.** 이게 더 큰 문제다. 실측하면 oiyo 는 색
// 사용의 **81%가 토큰 밖**이다(`text-green-950` 706회, `bg-white` 581회…).
// 그래서 토큰을 바꿔도 화면의 일부에만 적용된다 — 지면·카드·경계는 바뀌고
// 제목·본문은 Tailwind 팔레트 색 그대로 남는다. 깨지지는 않지만 일관되지도
// 않다.
//
// 한 번에 고칠 수 없는 규모라 **예산으로 잡는다.** 지금 수치를 기록해 두고
// 늘면 실패한다. 줄이는 방향으로만 갱신한다.
//
// usage: node scripts/audit-color-tokens.mjs
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { join, basename, dirname } from "node:path";

// repo 이름 → 토큰 밖 색 사용 예산. 2026-09-02 실측.
//
// oiyo 는 2026-09-02 에 `bg-white`→`bg-card`(516), `text-green-950`→
// `text-foreground`(704) 를 치환해 7,915 → 6,695 로 줄였다(토큰 비율
// 18.6% → 31.1%). 투명도 변형(`bg-white/[0.04]` 등 67곳)은 건드리지 않았다 —
// 어두운 패널 위의 반투명 흰색이라 "떠 있는 표면"과 뜻이 다르다.
//
// 2026-09-02 두 번째 라운드: `bg-green-50`(308) → `bg-surface-subtle`.
// 기존 토큰 중에는 맞는 값이 없어서 **원본에 토큰을 하나 더했다** —
// `--accent`(0.915)로 옮기면 눈에 띄게 어두워진다. 6,695 → 6,388 (34.3%).
//
// 이 감사가 첫 실행에서 세 가지를 잡았다 — blog 에 팔레트가 아예 적용되지
// 않았고(폰트만 했다), wiki·game 은 `--card-foreground` 를 빠뜨렸고, oiyo 는
// 기록해 둔 예산보다 17개가 늘어 있었다. 셋 다 눈으로는 안 보이는 것들이다.
// 줄이는 방향으로만 갱신한다 — 늘리는 것은 하드코딩을 승인하는 것이다.
const PALETTE_BUDGET = {
  oiyo: 6388,
  blog: 10764,
  wiki: 5370,
  game: 7428,
  news: 0, // news 는 처음부터 var(--*) 만 쓴다. 이 0 을 지킨다.
  ai: 0,
};

// news 는 토큰 어휘가 다르다. shadcn 을 쓰지 않고 더 짧은 이름을 쓴다 —
// `--ink` 가 foreground 이고 `--muted` 는 배경이 아니라 **흐린 글자색**이다.
// 이름을 통일하는 것이 더 깨끗하지만 그건 news 전체를 건드리는 일이라,
// 지금은 대응만 적어 둔다. 값이 갈라지는 것을 막는 것이 목적이므로 충분하다.
const ALIAS = {
  news: {
    "--background": "--bg",
    "--foreground": "--ink",
    "--card": "--card",
    "--muted-foreground": "--muted",
    "--primary": "--accent",
    "--accent": "--accent-soft",
    "--border": "--border",
  },
};

// 토큰이 사는 곳. news 는 global.css 가 없고 레이아웃에 인라인이다.
const TOKEN_FILES = [
  "src/styles/global.css",
  "src/layouts/BaseLayout.astro",
  "src/layouts/Layout.astro",
];

const TOKEN_CLASS = new RegExp(
  String.raw`\b(?:bg|text|border|ring|fill|stroke|from|to|via|divide|outline|decoration|shadow|accent|caret|placeholder)-` +
    String.raw`(?:background|foreground|card|card-foreground|popover|popover-foreground|primary|primary-foreground|` +
    String.raw`secondary|secondary-foreground|muted|muted-foreground|accent|accent-foreground|destructive|border|input|ring|chart-[1-5]|surface-subtle|sidebar[\w-]*)\b`,
  "g",
);
const PALETTE_CLASS = new RegExp(
  String.raw`\b(?:bg|text|border|ring|fill|stroke|from|to|via|divide|outline|decoration|placeholder)-` +
    String.raw`(?:white|black|(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3})\b`,
  "g",
);

const repoRoot = process.cwd();
// 워크트리 디렉터리명은 repo 이름이 아니다(`.worktrees/oiyotok`). 원격 URL 로
// 판정하되 **규칙으로 유추하지 않는다** — 이름이 제각각이라(`oiyo-astro`,
// `blog-oiyo`, `wiki-oiyo`…) 접두사를 떼는 식의 규칙은 `oiyo-astro` 를
// `astro` 로 만든다. 대응표를 적어 두는 편이 짧고 틀리지 않는다.
const REMOTE_TO_REPO = {
  "oiyo-astro": "oiyo",
  "blog-oiyo": "blog",
  "wiki-oiyo": "wiki",
  "game-oiyo": "game",
  "news-oiyo": "news",
};
let repo = basename(repoRoot);
try {
  const url = execSync("git config --get remote.origin.url", { cwd: repoRoot, encoding: "utf8" }).trim();
  const m = url.match(/([^/]+?)(?:\.git)?$/);
  if (m && REMOTE_TO_REPO[m[1]]) repo = REMOTE_TO_REPO[m[1]];
} catch { /* git 이 없거나 remote 가 없으면 디렉터리명을 쓴다 */ }
const failures = [];

// ── 원본 찾기 ───────────────────────────────────────────────────────────────
// repo 안에서 돌 수도 있고(동기화된 사본) 루트에서 돌 수도 있다.
// 위로 올라가며 찾는다. repo 가 루트 하네스 바로 아래 있다고 가정하면
// **워크트리에서 깨진다** — `.worktrees/<name>/` 은 한 단계 더 깊다.
let ssotPath = null;
for (let dir = repoRoot, i = 0; i < 6; i++) {
  const candidate = join(dir, "shared", "tokens", "oiyo-light.css");
  if (existsSync(candidate)) { ssotPath = candidate; break; }
  const parent = dirname(dir);
  if (parent === dir) break;
  dir = parent;
}

if (!ssotPath) {
  console.log("색 토큰 감사 SKIP — shared/tokens/oiyo-light.css 를 찾지 못했다(루트 하네스 밖에서 도는 중).");
  process.exit(0);
}

const ssot = new Map();
for (const m of readFileSync(ssotPath, "utf8").matchAll(/^\s*(--[\w-]+):\s*([^;]+);/gm)) {
  ssot.set(m[1], m[2].trim());
}

// ── ① 토큰 값이 원본과 같은가 ───────────────────────────────────────────────
const tokenFile = TOKEN_FILES.map((f) => join(repoRoot, f)).find((f) => existsSync(f));
if (!tokenFile) {
  failures.push(`토큰을 정의하는 파일을 찾지 못했다(${TOKEN_FILES.join(", ")}).`);
} else {
  const src = readFileSync(tokenFile, "utf8");
  // 문자열이 아니라 **숫자로** 비교한다. `0.520` 과 `0.52` 는 같은 색인데
  // 문자열로 재면 다르다 — 첫 실행에서 실제로 그것 때문에 실패했다.
  const norm = (v) => {
    const nums = v.match(/-?\d*\.?\d+/g);
    if (!nums) return v.replace(/\s+/g, " ").trim();
    const fn = v.replace(/-?\d*\.?\d+/g, "#").replace(/\s+/g, " ").trim();
    return fn + "|" + nums.map((x) => Number(x).toFixed(4)).join(",");
  };
  const alias = ALIAS[repo] ?? null;
  for (const [name, want] of ssot) {
    // alias 를 쓰는 repo 는 대응표에 있는 토큰만 본다 — 이름이 겹쳐도 뜻이
    // 다를 수 있어서(news 의 `--muted` 는 흐린 글자색이다) 이름만 보고
    // 비교하면 안 된다.
    const local = alias ? alias[name] : name;
    if (!local) continue;
    // 각 사이트가 정의하지 않는 토큰도 있다(news 는 --card-foreground 가 없다).
    const found = src.match(new RegExp(String.raw`${local}\s*:\s*([^;}]+)`));
    if (!found) continue;
    if (norm(found[1]) !== norm(want)) {
      failures.push(
        `${local === name ? name : `${local}(← ${name})`} 이 원본과 다르다.\n      원본  ${want}\n      여기  ${found[1].trim()}\n` +
          `      원본: shared/tokens/oiyo-light.css — 값을 바꾸려면 거기서 바꾸고 5개 사이트에 함께 반영한다.`,
      );
    }
  }
}

// ── ② 토큰 밖 하드코딩이 늘었는가 ──────────────────────────────────────────
const budget = PALETTE_BUDGET[repo];
if (budget === undefined) {
  console.log(`색 토큰 감사 SKIP — ${repo} 는 예산이 등록되지 않았다.`);
} else {
  const exts = /\.(tsx?|jsx?|astro|css|mdx)$/;
  let tokenCount = 0;
  let paletteCount = 0;
  const top = new Map();
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      if (name === "node_modules" || name === "dist" || name === ".git") continue;
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (exts.test(name)) {
        const s = readFileSync(p, "utf8");
        tokenCount += (s.match(TOKEN_CLASS) ?? []).length;
        for (const hit of s.match(PALETTE_CLASS) ?? []) {
          paletteCount++;
          top.set(hit, (top.get(hit) ?? 0) + 1);
        }
      }
    }
  };
  if (existsSync(join(repoRoot, "src"))) walk(join(repoRoot, "src"));

  if (paletteCount > budget) {
    const worst = [...top].sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([k, v]) => `${k}(${v})`).join(" ");
    failures.push(
      `토큰 밖 색 사용이 ${paletteCount.toLocaleString()}개다(기록된 ${budget.toLocaleString()}개보다 ${(paletteCount - budget).toLocaleString()}개 늘었다).\n` +
        `      가장 흔한 것: ${worst}\n` +
        `      새 코드는 --background/--foreground/--primary 같은 토큰을 쓴다. 팔레트 색을 직접 쓰면 토큰을 바꿔도 그 화면은 따라오지 않는다.\n` +
        `      기존 것을 줄였다면 예산을 그 수치로 낮춰 잠근다.`,
    );
  }
  if (!failures.length) {
    const pct = tokenCount + paletteCount ? (tokenCount / (tokenCount + paletteCount)) * 100 : 100;
    console.log(
      `색 토큰 감사 PASS — 원본과 일치, 토큰 밖 ${paletteCount.toLocaleString()}/${budget.toLocaleString()}개 ` +
        `(토큰 비율 ${pct.toFixed(1)}%).`,
    );
  }
}

if (failures.length) {
  console.error("색 토큰 감사 FAIL\n");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
