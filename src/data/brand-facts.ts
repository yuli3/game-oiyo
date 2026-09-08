export const brandFacts = {
  "$schema": "https://oiyo.net/schemas/brand-facts.schema.json",
  brand: {
    name: "Oiyo",
    canonicalName: "OIYO",
    canonicalUrl: "https://oiyo.net/",
    organizationId: "https://oiyo.net/#organization",
    logo: "https://oiyo.net/icon-512.png",
    description:
      "Oiyo is a three-layer knowledge and tool ecosystem: wiki for definitions, blog for explanations, and oiyo.net for interactive execution.",
  },
  currentSite: {
    name: "OIYO Arcade",
    url: "https://game.oiyo.net/",
    role: "gaming",
    contentRole: "Free browser games — board, card, puzzle and arcade — playable instantly, no install.",
    knowledgeManifest: null,
    primaryCatalog: null,
    llms: null,
  },
  network: [
    {
      name: "OIYO Arcade",
      url: "https://game.oiyo.net/",
      role: "gaming",
      knowledgeManifest: null,
    },
    {
      name: "OIYO News",
      url: "https://news.oiyo.net/",
      role: "curation",
      knowledgeManifest: null,
    },
    {
      name: "OIYO AI",
      url: "https://ai.oiyo.net/",
      role: "ax-showcase",
      knowledgeManifest: null,
    },
    // 2026-09-08: wiki 항목을 뺐다 — 문서 0건이라 패밀리에서 정리 중이다.
    // `role` 의 definition/explanation 구분은 2026-08-27 에 폐기된 모델이다
    // (blog·wiki 는 같은 성격의 사이트). 남은 라벨은 이 파일의 다음 개정 대상.
    {
      name: "Oiyo Blog",
      url: "https://blog.oiyo.net/",
      role: "explanation",
      knowledgeManifest: "https://blog.oiyo.net/knowledge/index.json",
    },
    {
      name: "OIYO",
      url: "https://oiyo.net/",
      role: "execution",
      knowledgeManifest: "https://oiyo.net/knowledge/index.json",
    },
  ],
  locales: ["ko", "en", "ja", "zh", "fr", "es"],
  retiredLocales: ["cn"],
  citation: {
    attribution: "OIYO Arcade",
    preferredUrl: "https://game.oiyo.net/",
    machineReadableEntryPoints: [],
  },
};

export function jsonResponse(data: unknown): Response {
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
