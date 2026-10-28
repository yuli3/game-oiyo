// Copy for the number-tile title screen, augments, chaos tables and results
// (2026-10-21 quality pass). The table copy stays in TileRummy.tsx.

import type { Locale } from "../../lib/i18n";
import type { AugmentId, ChaosId, TableTheme } from "../../lib/games/tile-rummy-augments";

export interface TileRummyMoreCopy {
  enter: string;
  start: string;
  tagline: string;
  titleLabel: string;
  titles: [string, string, string, string];
  theme: string;
  themes: Record<TableTheme, string>;
  themeLocked: (wins: number) => string;
  pickAugment: string;
  augments: Record<AugmentId, { name: string; desc: string }>;
  chaosBanner: string;
  chaos: Record<ChaosId, { name: string; desc: string }>;
  go: string;
  newLine: string;
  peek: (tile: string) => string;
  mulligan: string;
  restart: string;
  exit: string;
  stars: (n: number) => string;
  newBest: string;
  rules: string;
  dragHint: string;
  controls: string;
  nextTitle: (wins: number) => string;
}

export const MORE: Record<Locale, TileRummyMoreCopy> = {
  ko: {
    enter: "입장하기",
    start: "시작하기",
    tagline: "타일을 끌어 줄을 만들고, 손을 먼저 비우면 이겨요.",
    titleLabel: "칭호",
    titles: ["초보 타일공", "숙련 타일공", "타일 장인", "타일 명인"],
    theme: "테이블",
    themes: { felt: "초록 펠트", walnut: "호두나무", midnight: "한밤" },
    themeLocked: (wins) => `승리 ${wins}번에 열림`,
    pickAugment: "이번 판의 증강을 하나 고르세요",
    augments: {
      opener25: { name: "가벼운 첫 등록", desc: "첫 등록이 30점 대신 25점이면 돼요." },
      starJoker: { name: "별을 쥐고 시작", desc: "시작 패에 별 타일이 한 장 들어와요." },
      slimHand: { name: "가벼운 손", desc: "시작 패가 13장이에요." },
      peek: { name: "더미 엿보기", desc: "더미 맨 위 타일이 보여요." },
      glowHint: { name: "줄 감지", desc: "손에서 줄이 되는 타일이 빛나요." },
      calmRival: { name: "느긋한 상대", desc: "상대가 한 단계 쉽게 둬요." },
      mulligan: { name: "패 다시 받기", desc: "첫 차례에 한 번 패를 새로 받을 수 있어요." },
      heavyRival: { name: "무거운 상대", desc: "상대가 15장으로 시작해요." },
    },
    chaosBanner: "혼돈 판!",
    chaos: {
      shortPool: { name: "짧은 더미", desc: "더미가 24장뿐이에요. 다 떨어지면 손 점수로 끝나요." },
      starRain: { name: "별비", desc: "남은 별 타일이 더미 위쪽에 몰려 있어요." },
    },
    go: "시작!",
    newLine: "새 줄",
    peek: (tile) => `더미 맨 위 ${tile}`,
    mulligan: "패 다시 받기",
    restart: "다시",
    exit: "나가기",
    stars: (n) => `별 ${n}개`,
    newBest: "오늘 기록 갱신!",
    rules: "규칙 보기",
    dragHint: "손의 타일을 판의 줄 앞뒤나 '새 줄'로 끌어 놓으세요. 여러 장을 눌러 고른 뒤 끌거나 그룹·런을 눌러도 돼요. 등록한 뒤에는 판의 타일을 손 쪽으로 끌어 뺄 수 있어요. 빈 판을 위아래로 밀면 화면이 움직여요.",
    controls: "키보드·화면 낭독기용 조작",
    nextTitle: (wins) => `다음 칭호까지 승리 ${wins}번`,
  },
  en: {
    enter: "Enter",
    start: "Start",
    tagline: "Drag tiles into lines. Empty your hand first to win.",
    titleLabel: "Title",
    titles: ["Tile novice", "Tile hand", "Tile artisan", "Tile master"],
    theme: "Table",
    themes: { felt: "Green felt", walnut: "Walnut", midnight: "Midnight" },
    themeLocked: (wins) => `Unlocks at ${wins} wins`,
    pickAugment: "Pick one augment for this table",
    augments: {
      opener25: { name: "Light opener", desc: "The first meld needs 25 points, not 30." },
      starJoker: { name: "Star in hand", desc: "Your opening hand holds a star tile." },
      slimHand: { name: "Slim hand", desc: "You start with 13 tiles." },
      peek: { name: "Peek", desc: "See the top tile of the pool." },
      glowHint: { name: "Line sense", desc: "Hand tiles that can form a line glow." },
      calmRival: { name: "Calm rival", desc: "Rivals play one level easier." },
      mulligan: { name: "Redeal", desc: "Take a fresh hand once on your first turn." },
      heavyRival: { name: "Heavy rival", desc: "Rivals start with 15 tiles." },
    },
    chaosBanner: "Chaos table!",
    chaos: {
      shortPool: { name: "Short pool", desc: "Only 24 tiles in the pool. When it runs out, hands are scored." },
      starRain: { name: "Star rain", desc: "The remaining star tiles sit near the top of the pool." },
    },
    go: "Go!",
    newLine: "New line",
    peek: (tile) => `Pool top ${tile}`,
    mulligan: "Redeal",
    restart: "Again",
    exit: "Leave",
    stars: (n) => `${n} stars`,
    newBest: "New best today!",
    rules: "Rules",
    dragHint: "Drag a hand tile to either end of a line, or onto 'New line'. Tap several tiles, then drag or press Group or Run. After you open, drag a table tile back toward your hand to lift it. Swipe on bare cloth to scroll.",
    controls: "Keyboard and screen reader controls",
    nextTitle: (wins) => `${wins} more wins to the next title`,
  },
  ja: {
    enter: "入場する",
    start: "始める",
    tagline: "牌をドラッグして列を作り、先に手札をなくせば勝ち。",
    titleLabel: "称号",
    titles: ["見習い牌士", "熟練牌士", "牌の職人", "牌の名人"],
    theme: "テーブル",
    themes: { felt: "緑のフェルト", walnut: "ウォールナット", midnight: "真夜中" },
    themeLocked: (wins) => `${wins}勝で解放`,
    pickAugment: "この卓の強化を一つ選んでください",
    augments: {
      opener25: { name: "軽い初公開", desc: "最初の公開が30点ではなく25点で済みます。" },
      starJoker: { name: "星を持って開始", desc: "最初の手札に星の牌が一枚入ります。" },
      slimHand: { name: "身軽な手札", desc: "最初の手札が13枚です。" },
      peek: { name: "山のぞき", desc: "山のいちばん上の牌が見えます。" },
      glowHint: { name: "列の気配", desc: "手札で列になる牌が光ります。" },
      calmRival: { name: "のんびりした相手", desc: "相手が一段やさしく打ちます。" },
      mulligan: { name: "配り直し", desc: "最初の番に一度だけ手札を配り直せます。" },
      heavyRival: { name: "重い相手", desc: "相手は15枚で始まります。" },
    },
    chaosBanner: "混沌の卓！",
    chaos: {
      shortPool: { name: "短い山", desc: "山は24枚だけ。尽きたら手札の点で決まります。" },
      starRain: { name: "星の雨", desc: "残りの星の牌が山の上のほうに集まっています。" },
    },
    go: "スタート！",
    newLine: "新しい列",
    peek: (tile) => `山の上 ${tile}`,
    mulligan: "配り直し",
    restart: "もう一度",
    exit: "退出",
    stars: (n) => `星${n}つ`,
    newBest: "今日の記録を更新！",
    rules: "ルール",
    dragHint: "手札の牌を場の列の前後か「新しい列」へドラッグします。何枚か押して選んでからドラッグしても、グループ・ランを押してもかまいません。公開後は場の牌を手札側へドラッグすると外せます。何もない布の上をなぞると画面が動きます。",
    controls: "キーボード・読み上げ用の操作",
    nextTitle: (wins) => `次の称号まであと${wins}勝`,
  },
  zh: {
    enter: "进入",
    start: "开始",
    tagline: "把牌拖成一列，先出完手牌就赢。",
    titleLabel: "称号",
    titles: ["新手牌士", "熟练牌士", "牌桌匠人", "牌桌名家"],
    theme: "牌桌",
    themes: { felt: "绿色绒布", walnut: "胡桃木", midnight: "午夜" },
    themeLocked: (wins) => `赢${wins}局解锁`,
    pickAugment: "为这一桌选一个增益",
    augments: {
      opener25: { name: "轻松首放", desc: "首次放入只需25分，不是30分。" },
      starJoker: { name: "握星开局", desc: "开局手牌里有一张星牌。" },
      slimHand: { name: "轻手开局", desc: "开局只有13张牌。" },
      peek: { name: "偷看牌堆", desc: "能看到牌堆最上面的牌。" },
      glowHint: { name: "成列感应", desc: "手牌里能组成一列的牌会发光。" },
      calmRival: { name: "从容的对手", desc: "对手降低一级难度。" },
      mulligan: { name: "重新发牌", desc: "第一回合可以重新发一次手牌。" },
      heavyRival: { name: "沉重的对手", desc: "对手开局拿15张。" },
    },
    chaosBanner: "混乱牌桌！",
    chaos: {
      shortPool: { name: "短牌堆", desc: "牌堆只有24张。抽完后按手牌分数结束。" },
      starRain: { name: "星雨", desc: "剩下的星牌集中在牌堆上方。" },
    },
    go: "开始！",
    newLine: "新的一列",
    peek: (tile) => `牌堆顶 ${tile}`,
    mulligan: "重新发牌",
    restart: "再来",
    exit: "离开",
    stars: (n) => `${n}颗星`,
    newBest: "刷新今日纪录！",
    rules: "规则",
    dragHint: "把手牌拖到桌上一列的前后，或拖到“新的一列”。也可以先点选几张再拖，或按一组、顺子。亮出之后，把桌上的牌拖回手牌一侧就能拿下。在空白桌布上滑动可以滚动画面。",
    controls: "键盘与读屏操作",
    nextTitle: (wins) => `再赢${wins}局升到下一称号`,
  },
  fr: {
    enter: "Entrer",
    start: "Commencer",
    tagline: "Glissez les tuiles en lignes. Videz votre main le premier pour gagner.",
    titleLabel: "Titre",
    titles: ["Novice des tuiles", "Joueur confirmé", "Artisan des tuiles", "Maître des tuiles"],
    theme: "Table",
    themes: { felt: "Feutre vert", walnut: "Noyer", midnight: "Minuit" },
    themeLocked: (wins) => `Débloqué à ${wins} victoires`,
    pickAugment: "Choisissez un bonus pour cette table",
    augments: {
      opener25: { name: "Ouverture légère", desc: "La première pose demande 25 points au lieu de 30." },
      starJoker: { name: "Étoile en main", desc: "Votre main de départ contient une tuile étoile." },
      slimHand: { name: "Main légère", desc: "Vous commencez avec 13 tuiles." },
      peek: { name: "Coup d'œil", desc: "La tuile du dessus de la pioche est visible." },
      glowHint: { name: "Flair des lignes", desc: "Les tuiles de la main qui forment une ligne brillent." },
      calmRival: { name: "Adversaire calme", desc: "Les adversaires jouent un niveau plus facile." },
      mulligan: { name: "Nouvelle donne", desc: "Reprenez une main neuve une fois, au premier tour." },
      heavyRival: { name: "Adversaire chargé", desc: "Les adversaires commencent avec 15 tuiles." },
    },
    chaosBanner: "Table du chaos !",
    chaos: {
      shortPool: { name: "Pioche courte", desc: "La pioche n'a que 24 tuiles. Quand elle est vide, on compte les mains." },
      starRain: { name: "Pluie d'étoiles", desc: "Les tuiles étoile restantes sont près du dessus de la pioche." },
    },
    go: "C'est parti !",
    newLine: "Nouvelle ligne",
    peek: (tile) => `Dessus de la pioche ${tile}`,
    mulligan: "Nouvelle donne",
    restart: "Rejouer",
    exit: "Quitter",
    stars: (n) => `${n} étoiles`,
    newBest: "Nouveau record du jour !",
    rules: "Règles",
    dragHint: "Glissez une tuile de la main au bout d'une ligne ou sur « Nouvelle ligne ». Touchez plusieurs tuiles, puis glissez ou appuyez sur Groupe ou Suite. Après l'ouverture, glissez une tuile du plateau vers la main pour la reprendre. Faites glisser le tapis vide pour défiler.",
    controls: "Commandes clavier et lecteur d'écran",
    nextTitle: (wins) => `Encore ${wins} victoires pour le titre suivant`,
  },
  es: {
    enter: "Entrar",
    start: "Empezar",
    tagline: "Arrastra fichas para formar líneas. Vacía tu mano primero para ganar.",
    titleLabel: "Título",
    titles: ["Novato de fichas", "Jugador diestro", "Artesano de fichas", "Maestro de fichas"],
    theme: "Mesa",
    themes: { felt: "Fieltro verde", walnut: "Nogal", midnight: "Medianoche" },
    themeLocked: (wins) => `Se abre con ${wins} victorias`,
    pickAugment: "Elige una mejora para esta mesa",
    augments: {
      opener25: { name: "Apertura ligera", desc: "La primera bajada pide 25 puntos en vez de 30." },
      starJoker: { name: "Estrella en mano", desc: "Tu mano inicial trae una ficha estrella." },
      slimHand: { name: "Mano ligera", desc: "Empiezas con 13 fichas." },
      peek: { name: "Ojeada", desc: "Ves la ficha de arriba del mazo." },
      glowHint: { name: "Olfato de líneas", desc: "Brillan las fichas de la mano que forman una línea." },
      calmRival: { name: "Rival tranquilo", desc: "Los rivales juegan un nivel más fácil." },
      mulligan: { name: "Repartir de nuevo", desc: "Pide una mano nueva una vez en tu primer turno." },
      heavyRival: { name: "Rival cargado", desc: "Los rivales empiezan con 15 fichas." },
    },
    chaosBanner: "¡Mesa del caos!",
    chaos: {
      shortPool: { name: "Mazo corto", desc: "El mazo solo tiene 24 fichas. Al acabarse, se cuentan las manos." },
      starRain: { name: "Lluvia de estrellas", desc: "Las fichas estrella que quedan están arriba del mazo." },
    },
    go: "¡Ya!",
    newLine: "Línea nueva",
    peek: (tile) => `Arriba del mazo ${tile}`,
    mulligan: "Repartir de nuevo",
    restart: "Otra vez",
    exit: "Salir",
    stars: (n) => `${n} estrellas`,
    newBest: "¡Nuevo récord de hoy!",
    rules: "Reglas",
    dragHint: "Arrastra una ficha de la mano a un extremo de una línea o a «Línea nueva». Toca varias fichas y luego arrastra o pulsa Grupo o Escalera. Después de abrir, arrastra una ficha de la mesa hacia la mano para levantarla. Desliza sobre el paño vacío para desplazarte.",
    controls: "Controles de teclado y lector de pantalla",
    nextTitle: (wins) => `${wins} victorias más para el siguiente título`,
  },
};
