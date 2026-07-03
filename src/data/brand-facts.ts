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
      name: "Oiyo Wiki",
      url: "https://wiki.oiyo.net/",
      role: "definition",
      knowledgeManifest: "https://wiki.oiyo.net/knowledge/index.json",
    },
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
