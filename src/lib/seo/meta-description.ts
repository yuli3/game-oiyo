/**
 * meta-description.ts — game.oiyo.net 전용 SEO(Google·Bing) 및 AIEO 골든 레인지 메타 설명 빌더
 * (Phase A: 기본 사이트 설명 대량 중복 방어 및 장르/게임플레이 특화 확장)
 */
export interface BuildGameMetaOptions {
  title: string;
  description?: string;
  locale: string;
  pathname?: string;
  category?: string;
  tags?: string[];
}

const GAME_LOCALE_CTA: Record<string, {
  gameCta: string;
  utilityCta: string;
  fallback: (title: string) => string;
}> = {
  ko: {
    gameCta: '웹 브라우저에서 설치 없이 즉시 즐기는 무료 캐주얼 게임. 직관적인 조작과 다양한 스테이지에 도전하고 실시간 기록을 달성하세요.',
    utilityCta: '공식 수수료 및 손익분기점 실시간 정밀 계산기. 파티원 입찰가와 최적 분배금을 1초 만에 확인하세요.',
    fallback: (t) => `${t} — game.oiyo.net에서 별도 설치 없이 웹 브라우저로 즉시 즐기는 무료 게임. 다양한 모드와 기록 경쟁에 도전하세요.`,
  },
  en: {
    gameCta: 'Free browser game to play instantly with no installation required. Enjoy responsive controls, challenging stages, and compete for high scores.',
    utilityCta: 'Real-time precision calculator for official raid fees and break-even points. Find optimal party bid recommendations instantly.',
    fallback: (t) => `${t} — Play free browser games instantly on game.oiyo.net. No download required. Enjoy engaging gameplay and challenge your best scores.`,
  },
  ja: {
    gameCta: 'インストール不要でWebブラウザですぐに遊べる無料ゲーム。直感的な操作と多彩なステージを楽しみ、ベストスコアを目指しましょう。',
    utilityCta: '手数料と損益分岐点をリアルタイムで精密計算。パーティーの最適入札価格と分配金を瞬時に確認できます。',
    fallback: (t) => `${t} — game.oiyo.netですぐにプレイできる無料ブラウザゲーム。ダウンロード不要で多彩なゲーム体験を楽しめます。`,
  },
  zh: {
    gameCta: '无需下载安装，在网页浏览器中即开即玩的免费休闲游戏。体验直观操作与丰富关卡，挑战你的最高得分记录。',
    utilityCta: '官方拍卖手续费与保本点实时精准计算器，一键获取团队推荐竞价与最优分红方案。',
    fallback: (t) => `${t} — 在game.oiyo.net上即点即玩的免费网页游戏。无需下载，畅享丰富的互动玩法并挑战纪录。`,
  },
  fr: {
    gameCta: 'Jeu sur navigateur gratuit et jouable instantanément sans installation. Profitez de contrôles fluides et tentez de battre vos meilleurs scores.',
    utilityCta: 'Calculateur précis en temps réel pour optimiser les frais de raid et les enchères équitables de groupe.',
    fallback: (t) => `${t} — Jouez gratuitement sur navigateur sur game.oiyo.net sans aucun téléchargement. Relevez des défis variés et amusez-vous.`,
  },
  es: {
    gameCta: 'Juego de navegador gratuito para jugar al instante sin descargas ni instalación. Disfruta de controles ágiles y supera tus mejores puntuaciones.',
    utilityCta: 'Calculadora en tiempo real para tasas de subasta y distribución óptima en grupos de juego.',
    fallback: (t) => `${t} — Juega gratis al instante en game.oiyo.net desde tu navegador sin descargas. Disfruta de partidas dinámicas y desafiantes.`,
  },
};

function safeTruncate(text: string, maxLen: number): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= maxLen) return cleaned;

  const sub = cleaned.slice(0, maxLen);
  const lastPunct = Math.max(sub.lastIndexOf('. '), sub.lastIndexOf('! '), sub.lastIndexOf('? '));
  if (lastPunct > maxLen * 0.7) {
    return sub.slice(0, lastPunct + 1).trim();
  }

  const lastSpace = sub.lastIndexOf(' ');
  if (lastSpace > maxLen * 0.7) {
    return sub.slice(0, lastSpace).trim() + '...';
  }

  return sub.trim() + '...';
}

export function buildGameMetaDescription(opts: BuildGameMetaOptions): string {
  const { title, locale, pathname = '' } = opts;
  let rawDesc = (opts.description ?? '').trim();
  const cta = GAME_LOCALE_CTA[locale] ?? GAME_LOCALE_CTA.en;
  const isCjk = ['ko', 'ja', 'zh'].includes(locale);
  const minLength = isCjk ? 75 : 95;
  const targetMax = isCjk ? 145 : 170;

  const cleanTitle = title.split('—')[0].split('|')[0].trim();
  const isTitleDuplicate = rawDesc.toLowerCase() === title.toLowerCase() || rawDesc.toLowerCase() === cleanTitle.toLowerCase();
  const isDefaultGeneric = rawDesc.includes('Free browser games to play instantly') || rawDesc.includes('game.oiyo.net');

  const path = pathname.toLowerCase();
  const isUtility = path.includes('lostark') || path.includes('calc') || path.includes('auction');

  if (!rawDesc || isTitleDuplicate || isDefaultGeneric) {
    if (isUtility) {
      rawDesc = `${cleanTitle} — ${cta.utilityCta}`;
    } else {
      rawDesc = `${cleanTitle} — ${cta.gameCta}`;
    }
  } else if (rawDesc.length < minLength) {
    rawDesc = `${rawDesc.replace(/[.]+$/, '')}. ${isUtility ? cta.utilityCta : cta.gameCta}`;
  }

  return safeTruncate(rawDesc, targetMax);
}
