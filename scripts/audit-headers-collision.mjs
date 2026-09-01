#!/usr/bin/env node
// _headers 규칙 충돌 감사 — 2026-09-01.
//
// Cloudflare Pages 는 매칭되는 `_headers` 규칙을 **전부** 적용하고, 같은 헤더
// 이름이 여러 규칙에 있으면 값을 **이어 붙인다**(교체가 아니다). 그래서 넓은
// 규칙(`/*`)에 Cache-Control 을 두면 좁은 규칙과 충돌해
//   `public, max-age=31536000, immutable, public, max-age=0, s-maxage=300, …`
// 처럼 `max-age` 가 두 개인 헤더가 나간다. RFC 9111 은 반복 지시어 처리를 구현에
// 맡기므로 실효 정책이 모호해진다.
//
// 2026-09-01 에 실제로 그 상태였고, 해시가 박힌 `_astro` 자산의 1년 불변 캐시가
// 무효화돼 있었다. 네 사이트 전부. 원인을 대시보드에서 두 번 찾다가 마지막에
// `_headers` 안에 있는 것을 발견했다 — 그래서 코드로 막는다.
//
// usage: node scripts/audit-headers-collision.mjs
import { readFileSync } from "node:fs";

const FILE = "public/_headers";
const text = readFileSync(FILE, "utf8");

// `_headers` 문법: 들여쓰기 없는 줄이 경로, 들여쓴 줄이 헤더.
const rules = [];
let current = null;
for (const raw of text.split(/\r?\n/)) {
  if (!raw.trim() || raw.trimStart().startsWith("#")) continue;
  if (/^\S/.test(raw)) { current = { path: raw.trim(), headers: [] }; rules.push(current); continue; }
  const name = raw.trim().split(":")[0]?.trim().toLowerCase();
  if (name && current) current.headers.push(name);
}

const failures = [];
const fail = (m) => failures.push(m);

// 경로 글롭이 어떤 자산 예시에 매칭되는지 본다. 전수 대조가 아니라, 충돌이
// 실제로 일어나는 대표 경로만 확인한다.
// 대표 경로. repo 마다 구조가 달라도 이 형태들은 공통이라 충돌을 드러낸다.
// 실제 파일 존재 여부와 무관하게 **규칙 매칭**만 본다 — 파일이 나중에 생겨도
// 충돌은 그때 발생하므로 미리 막는 것이 목적이다.
const SAMPLES = [
  "/_astro/app.abc123.js",
  "/fonts/x.woff2",
  "/img/a.webp",
  "/img/a.png",
  "/favicon-32x32.png",
  "/robots.txt",
  "/ads.txt",
  "/manifest.json",
  "/brand-facts.json",
  "/data/x.json",
  "/sitemap-index.xml",
  "/ko/anything/",
  "/2026-01-01/",
];

function matches(glob, path) {
  const re = new RegExp("^" + glob.split("*").map((s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*") + "$");
  return re.test(path);
}

for (const sample of SAMPLES) {
  const hit = rules.filter((r) => matches(r.path, sample));
  const withCache = hit.filter((r) => r.headers.includes("cache-control"));
  if (withCache.length > 1) {
    fail(`${sample} 이 Cache-Control 을 가진 규칙 ${withCache.length}개에 매칭된다: ${withCache.map((r) => r.path).join(" + ")} — Pages 가 값을 이어 붙여 max-age 가 중복된다`);
  }
}

// 넓은 규칙에 Cache-Control 을 두는 것 자체를 막는다. 좁은 규칙이 하나라도 있으면
// 반드시 충돌한다.
for (const rule of rules) {
  if (rule.path === "/*" && rule.headers.includes("cache-control")) {
    fail("`/*` 에 Cache-Control 이 있다 — 모든 경로에 매칭되므로 자산별 정책과 반드시 충돌한다. HTML 경로에만 걸어라");
  }
}

for (const f of failures) console.error(`FAIL ${f}`);
console.log(failures.length
  ? `_headers 충돌 감사: ${failures.length}건 실패`
  : `_headers 충돌 감사: PASS — 규칙 ${rules.length}개 · 표본 ${SAMPLES.length}개에서 Cache-Control 중복 0`);
process.exitCode = failures.length ? 1 : 0;
