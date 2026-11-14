// Daily/classic puzzles other sites may iframe ("embed this puzzle").
// The credit anchor in the copied snippet is what earns a natural backlink,
// so only games that work well in a ~560px frame and have search demand belong here.
import type { Locale } from "../lib/i18n";

export const EMBEDDABLE_GAMES = ["tents-and-trees", "sudoku", "minesweeper", "game-2048", "dominoes"] as const;
export type EmbeddableGame = (typeof EMBEDDABLE_GAMES)[number];

export function isEmbeddableGame(slug: string): slug is EmbeddableGame {
  return (EMBEDDABLE_GAMES as readonly string[]).includes(slug);
}

export const EMBED_HEIGHT = 640;

export function gamePageUrl(locale: Locale, slug: EmbeddableGame): string {
  return `https://game.oiyo.net/${locale}/${slug}/`;
}

export function gameEmbedUrl(locale: Locale, slug: EmbeddableGame): string {
  return `https://game.oiyo.net/${locale}/embed/${slug}/`;
}

/** The copy-paste snippet: iframe + a plain credit link outside the frame. */
export function embedSnippet(locale: Locale, slug: EmbeddableGame, name: string): string {
  return `<iframe src="${gameEmbedUrl(locale, slug)}" width="100%" height="${EMBED_HEIGHT}" style="border:0;border-radius:12px" loading="lazy" title="${name}"></iframe>\n<p><a href="${gamePageUrl(locale, slug)}">${name}</a> · OIYO Games</p>`;
}

export const EMBED_COPY: Record<Locale, { title: string; desc: string; credit: string; more: string }> = {
  ko: { title: "이 게임을 내 블로그에 넣기", desc: "아래 코드를 복사해 블로그나 사이트에 붙여넣으면 게임이 그대로 작동해요. 무료이며, 출처 링크만 함께 남겨 주세요.", credit: "전체 화면으로 하기", more: "OIYO 게임 더 보기" },
  en: { title: "Embed this game on your site", desc: "Copy the code below into your blog or site and the game plays as-is. Free to use — just keep the credit link.", credit: "Play full screen", more: "More free games at OIYO" },
  ja: { title: "このゲームをブログに埋め込む", desc: "以下のコードをブログやサイトに貼り付けると、そのまま遊べます。無料です。出典リンクは残してください。", credit: "全画面で遊ぶ", more: "OIYO のゲームをもっと見る" },
  zh: { title: "把这个游戏嵌入你的网站", desc: "复制下方代码粘贴到你的博客或网站即可直接游玩。免费使用，请保留来源链接。", credit: "全屏游玩", more: "在 OIYO 玩更多免费游戏" },
  fr: { title: "Intégrer ce jeu sur votre site", desc: "Copiez le code ci-dessous dans votre blog ou site : le jeu fonctionne tel quel. Gratuit — conservez simplement le lien de crédit.", credit: "Jouer en plein écran", more: "Plus de jeux gratuits sur OIYO" },
  es: { title: "Inserta este juego en tu sitio", desc: "Copia el código de abajo en tu blog o sitio y el juego funcionará tal cual. Gratis: solo conserva el enlace de crédito.", credit: "Jugar a pantalla completa", more: "Más juegos gratis en OIYO" },
};
