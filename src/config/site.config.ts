export const AHOXY_URL = 'https://ahoxy.com';
export const OIYO_URL = 'https://oiyo.net';

export const siteConfig = {
  name: "Oiyo",
  title: "OIYO Arcade",
  description: "Free online games — chess, gomoku, reversi, sudoku, solitaire and more. Play against a friend or the built-in AI, right in your browser.",
  url: "https://game.oiyo.net",
  author: "Oiyo Team",
  locale: "en",
  locales: ["en", "ko", "ja", "fr", "es", "zh"],
  themeColor: "#65a30d",
  features: {
    scrollSnap: false,
    // TOC intentionally disabled (commented out in article layout as well)
    toc: false,
    pagination: true,
  },
  // 실존하는 공식 계정이 생기면 채울 것 (가짜 링크 금지). 현재 미운영.
  socials: {
    github: null as string | null,
    twitter: null as string | null,
    linkedin: null as string | null,
  },
  seo: {
    twitterHandle: null as string | null, // 실존 계정 생기면 채울 것
    ogImage: null,
    organization: {
      // 3사(oiyo.net/blog/wiki) 공유 canonical 발행자 — 단일 @id로 권위 통합
      id: "https://oiyo.net/#organization",
      name: "Oiyo",
      canonicalUrl: "https://oiyo.net",
      logo: "https://oiyo.net/icon-512.png",
      // sameAs: 실존하는 외부 공식 프로필이 생기면 추가(가짜 링크는 E-E-A-T에 해로움). 결속은 공유 @id가 담당.
      sameAs: [] as string[]
    }
  },
  analytics: {
    googleAnalyticsId: "G-915L6V38X6",
    googleAdsenseId: "ca-pub-9541920090543312",
  },
  newsletter: {
    // Set to your Buttondown account slug to enable API subscription, or null to use mailto fallback
    buttondownUsername: null as string | null,
    fallbackEmail: "support@oiyo.net",
  }
};

export type SiteConfig = typeof siteConfig;
