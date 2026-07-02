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
    name: "Oiyo Blog",
    url: "https://blog.oiyo.net/",
    role: "explanation",
    contentRole: "Long-form guides, lessons, comparisons, and practical context.",
    knowledgeManifest: "https://blog.oiyo.net/knowledge/index.json",
    primaryCatalog: "https://blog.oiyo.net/knowledge/guides.json",
    llms: "https://blog.oiyo.net/llms.txt",
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
    attribution: "Oiyo Blog",
    preferredUrl: "https://blog.oiyo.net/",
    machineReadableEntryPoints: [
      "https://blog.oiyo.net/llms.txt",
      "https://blog.oiyo.net/knowledge/index.json",
      "https://blog.oiyo.net/knowledge/guides.json",
    ],
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
