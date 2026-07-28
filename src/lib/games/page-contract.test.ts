import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * 페이지 껍데기 계약. 여기 있는 것들은 전부 게이트가 초록인데 결과가
 * 빠져 있던 항목이라, 빌드나 lighthouse 가 아니라 이 테스트가 지킨다.
 */

const PAGES_DIR = "src/pages/[...lang]";
const pages = readdirSync(PAGES_DIR).filter((f) => f.endsWith(".astro"));
const read = (f: string) => readFileSync(`${PAGES_DIR}/${f}`, "utf8");

describe("게임 페이지 껍데기", () => {
  it("BaseLayout 이 <main> 을 렌더하므로 페이지가 <main> 을 또 열지 않는다", () => {
    // 2026-07-27 이전에는 59페이지 전부가 <main> 안에 <main> 을 넣어
    // 랜드마크가 두 개였다. HTML 로도 무효고 스크린리더에도 main 이 둘로 들린다.
    const nested = pages.filter((f) => /<main\b/.test(read(f)));
    expect(nested).toEqual([]);
  });

  it("게임 페이지는 heading prop 으로 h1 을 낸다", () => {
    // h1 이 없으면 본문 첫 헤딩이 GameGuide 의 h2 라서 주제 신호가 사라진다.
    // StrategyGuide·도구 컴포넌트는 자체 h1 이 있으므로 대상에서 뺀다.
    const missing = pages.filter((f) => {
      const src = read(f);
      if (!/<BaseLayout/.test(src)) return false;
      if (/heading=/.test(src)) return false;
      // 자체 h1 을 렌더하는 컴포넌트를 쓰는 페이지는 통과.
      return !/StrategyGuide|Hero|BlogList|<h1/.test(src);
    });
    expect(missing).toEqual([]);
  });
});

describe("색인 정책", () => {
  it("deindexed-locales 가 SEO 와 사이트맵 양쪽에 배선돼 있다", () => {
    // 파일만 만들고 배선하지 않으면 정책이 있는 것처럼 보이면서
    // 실제로는 계속 색인된다 — game 이 2026-07-27 까지 그 상태였다.
    const locales = JSON.parse(readFileSync("src/config/deindexed-locales.json", "utf8"));
    expect(locales).toEqual(["zh", "fr", "es"]);

    const seo = readFileSync("src/components/SEO.astro", "utf8");
    expect(seo).toContain("deindexed-locales.json");
    expect(seo).toMatch(/isDeindexedLocale/);
    // hreflang 클러스터에서도 빠져야 한다: 구글은 noindex 를 가리키는
    // hreflang 을 폐기하므로 남겨두면 신호만 흐려진다.
    expect(seo).toMatch(/\.filter\(.*=>\s*!DEINDEXED_LOCALES\.has/);

    const config = readFileSync("astro.config.mjs", "utf8");
    expect(config).toContain("deindexed-locales.json");
    expect(config).toMatch(/DEINDEXED_LOCALES\.has\(segs\[0\]\)/);
  });
});
