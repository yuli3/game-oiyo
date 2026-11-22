// Web app manifest for game.oiyo.net, one per locale (/pwa/<lang>.webmanifest).
//
// Every locale shares one app identity (`id`), so a player who installs from the
// English page and later from the Korean page gets one app, not two. The id
// stays "/ko/" because the original manifest (start_url "/ko/", no id) was
// installed with that identity; changing it would orphan existing installs.
import { locales, type Locale } from "../i18n";

export const PWA_APP_ID = "/ko/";
// Splash = the site's light background (--background), bar = brand green (siteConfig.themeColor).
export const PWA_BACKGROUND = "#edf0e8";
export const PWA_THEME = "#65a30d";

type Copy = { name: string; short: string; description: string; achievements: string; offline: string };

const COPY: Record<Locale, Copy> = {
  ko: { name: "OIYO 아케이드 — 무료 게임", short: "OIYO 아케이드", description: "설치 없이 바로 하는 무료 게임. 한 번 연 게임은 오프라인에서도 열려요.", achievements: "내 기록", offline: "오프라인 게임" },
  en: { name: "OIYO Arcade — Free Games", short: "OIYO Arcade", description: "Free games that start instantly. Games you open once also work offline.", achievements: "My records", offline: "Offline games" },
  ja: { name: "OIYO アーケード — 無料ゲーム", short: "OIYO アーケード", description: "インストール不要ですぐ遊べる無料ゲーム。一度開いたゲームはオフラインでも遊べます。", achievements: "マイ記録", offline: "オフラインゲーム" },
  zh: { name: "OIYO 街机 — 免费游戏", short: "OIYO 街机", description: "无需安装即可畅玩的免费游戏。打开过一次的游戏离线也能玩。", achievements: "我的记录", offline: "离线游戏" },
  fr: { name: "OIYO Arcade — Jeux gratuits", short: "OIYO Arcade", description: "Des jeux gratuits qui se lancent tout de suite. Un jeu ouvert une fois marche aussi hors ligne.", achievements: "Mes records", offline: "Jeux hors ligne" },
  es: { name: "OIYO Arcade — Juegos gratis", short: "OIYO Arcade", description: "Juegos gratis que empiezan al instante. Un juego abierto una vez también funciona sin conexión.", achievements: "Mis récords", offline: "Juegos sin conexión" },
};

const BCP47: Record<Locale, string> = { ko: "ko-KR", en: "en", ja: "ja-JP", zh: "zh-CN", fr: "fr-FR", es: "es-ES" };

const SHORTCUT_GAMES = ["chess", "sudoku", "game-2048"] as const;
const SHORTCUT_NAMES: Record<(typeof SHORTCUT_GAMES)[number], Partial<Record<Locale, string>> & { en: string }> = {
  chess: { en: "Chess", ko: "체스", ja: "チェス", zh: "国际象棋", fr: "Échecs", es: "Ajedrez" },
  sudoku: { en: "Sudoku", ko: "스도쿠", ja: "数独", zh: "数独" },
  "game-2048": { en: "2048" },
};

export function isPwaLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export function buildManifest(locale: Locale) {
  const c = COPY[locale];
  const icon = (src: string, sizes: string, purpose?: "maskable") => ({ src, sizes, type: "image/png", ...(purpose ? { purpose } : {}) });
  return {
    id: PWA_APP_ID,
    name: c.name,
    short_name: c.short,
    description: c.description,
    lang: BCP47[locale],
    dir: "ltr",
    start_url: `/${locale}/?source=pwa`,
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "any",
    background_color: PWA_BACKGROUND,
    theme_color: PWA_THEME,
    categories: ["games", "entertainment"],
    prefer_related_applications: false,
    icons: [
      icon("/icon-192.png", "192x192"),
      icon("/icon-512.png", "512x512"),
      icon("/pwa/icon-maskable-192.png", "192x192", "maskable"),
      icon("/pwa/icon-maskable-512.png", "512x512", "maskable"),
      { src: "/favicon.svg", sizes: "any", type: "image/svg+xml" },
    ],
    screenshots: [
      { src: "/pwa/screenshot-wide.webp", sizes: "1280x720", type: "image/webp", form_factor: "wide", label: c.name },
      { src: "/pwa/screenshot-narrow.webp", sizes: "540x1170", type: "image/webp", form_factor: "narrow", label: c.name },
    ],
    shortcuts: [
      ...SHORTCUT_GAMES.map((slug) => ({
        name: SHORTCUT_NAMES[slug][locale] ?? SHORTCUT_NAMES[slug].en,
        url: `/${locale}/${slug}/?source=pwa-shortcut`,
        icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
      })),
      {
        name: c.achievements,
        url: `/${locale}/achievements/?source=pwa-shortcut`,
        icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
