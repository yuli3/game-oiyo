// Dedicated "how to win" strategy content — a deeper, separately-titled unit
// from the short FAQ blurbs in game-guides.ts, matching the search intent of
// "<game> strategy" as distinct from "play <game>". Curated to a pilot batch
// of games with genuine strategic depth (not every game has real strategy to
// write about); expand only when a specific game proves the pattern earns
// its keep, per the site's crawl-budget discipline.
import type { Locale } from "../lib/i18n";

export interface StrategyTip {
  heading: Record<Locale, string>;
  body: Record<Locale, string>;
}

export interface StrategyGuide {
  slug: string; // matches the game's own page slug
  title: Record<Locale, string>;
  intro: Record<Locale, string>;
  variantNote: Record<Locale, string>;
  sources: { label: string; href: string }[];
  tips: StrategyTip[];
  mistakes: Record<Locale, string[]>;
}

export const STRATEGY_GUIDES: Record<string, StrategyGuide> = {
  solitaire: {
    slug: "solitaire",
    title: {
      ko: "솔리테어(클론다이크) 승률을 올리는 전략",
      en: "Klondike Solitaire Strategy — How to Win More Often",
      ja: "クロンダイク・ソリティア攻略法 — 勝率を上げる戦略",
      zh: "克朗代克接龙攻略 — 提高胜率的策略",
      fr: "Stratégie du solitaire Klondike — gagner plus souvent",
      es: "Estrategia del solitario Klondike — cómo ganar más partidas",
    },
    intro: {
      ko: "클론다이크는 같은 배치라도 이동 순서에 따라 막히거나 길이 열릴 수 있습니다. 아래 전략은 카드를 아무렇게나 옮기는 습관을 체계적인 순서로 바꿔줍니다.",
      en: "In Klondike, move order can open or close paths even within the same deal. These strategies turn haphazard card-moving into a systematic approach.",
      ja: "クロンダイクは同じ配牌でも手順によって行き詰まることも道が開くこともあります。以下の戦略は行き当たりばったりの操作を体系的な手順に変えます。",
      zh: "克朗代克即使牌局相同，也可能因移动顺序不同而卡住或打开局面。以下策略能把随意移牌变成有条理的打法。",
      fr: "Au Klondike, l'ordre des coups peut ouvrir ou fermer des possibilités dans une même donne. Ces stratégies remplacent les déplacements au hasard par une méthode.",
      es: "En Klondike, el orden de los movimientos puede abrir o cerrar caminos incluso en una misma partida. Estas estrategias convierten movimientos al azar en un método.",
    },
    variantNote: {
      ko: "적용 범위: OIYO 구현은 클론다이크 드로우 1, 스톡 무제한 재순환, 파운데이션에서 테이블로 되돌리기를 사용합니다. 드로우 3이나 재순환 제한 변형에는 일부 조언이 그대로 적용되지 않습니다.",
      en: "Variant scope: OIYO uses draw-one Klondike, unlimited stock recycling, and foundation-to-tableau moves. Some advice will not transfer unchanged to draw-three or limited-redeal variants.",
      ja: "適用範囲: OIYO版は1枚めくり、山札の無制限再利用、組札から場札への戻しを採用しています。3枚めくりや再配布制限のある変則では一部の助言がそのまま当てはまりません。",
      zh: "适用范围：OIYO 采用翻一张、牌库无限重置，并允许从基础堆移回牌桌。翻三张或限制重置次数的变体并不完全适用这些建议。",
      fr: "Portée de la variante : OIYO utilise le tirage d'une carte, des reprises illimitées de la pioche et le retour fondation-tableau. Certains conseils changent en tirage trois ou avec reprises limitées.",
      es: "Alcance de la variante: OIYO usa robo de una carta, reciclaje ilimitado del mazo y movimientos de la base al tablero. Algunos consejos cambian al robar tres o limitar los repasos.",
    },
    sources: [
      { label: "Bicycle Cards — Klondike rules", href: "https://bicyclecards.com/how-to-play/klondike/" },
      { label: "Pagat — Solitaire and patience rule index", href: "https://www.pagat.com/solitaire/card.html" },
    ],
    tips: [
      {
        heading: { ko: "1. 스톡을 넘기기 전에 테이블로부터 먼저 살펴라", en: "1. Exhaust tableau moves before flipping the stock", ja: "1. 山札をめくる前に場札を確認する", zh: "1. 翻牌库前先检查牌桌区", fr: "1. Épuisez les coups du tableau avant de piocher", es: "1. Agota los movimientos del tablero antes de robar del mazo" },
        body: { ko: "스톡을 넘기면 그 카드들의 순서가 고정되어 나중에 되돌릴 수 없습니다. 테이블로 안에서 할 수 있는 이동을 전부 마친 뒤에만 스톡을 넘기세요.", en: "Flipping the stock locks those cards into a fixed order you can't rearrange later. Only draw from the stock once every safe tableau move is used up.", ja: "山札をめくるとその順序が固定され後で変えられません。場札内でできる移動を全て終えてから山札をめくりましょう。", zh: "翻开牌库会把那些牌的顺序固定，之后无法调整。用尽牌桌区所有安全的移动后再翻牌库。", fr: "Piocher fige l'ordre des cartes de la pioche, impossible à réarranger. Ne piochez qu'une fois tous les coups sûrs du tableau épuisés.", es: "Robar del mazo fija el orden de esas cartas, que ya no podrás reordenar. Solo roba del mazo cuando hayas agotado todos los movimientos seguros del tablero." },
      },
      {
        heading: { ko: "2. 파운데이션으로 너무 일찍 카드를 보내지 마라", en: "2. Don't rush cards to the foundations", ja: "2. 組札へ急いでカードを送らない", zh: "2. 别急着把牌送去基础堆", fr: "2. Ne montez pas les cartes trop vite vers les fondations", es: "2. No subas las cartas demasiado pronto a las bases" },
        body: { ko: "에이스와 2는 아래 카드를 받쳐야 하는 테이블로 카드가 아니므로 보통 파운데이션으로 올려도 안전합니다. 3 이상은 반대색 하위 카드를 받치는 데 필요할 수 있으니, 올리기 전에 테이블로 이동을 막지 않는지 확인하세요. OIYO에서는 필요하면 파운데이션 카드를 다시 내릴 수 있습니다.", en: "Aces and 2s do not support lower tableau cards, so they are normally safe to send up. Before moving a 3 or higher, check whether it is still needed to support a lower card of the opposite color. OIYO also lets you bring a foundation card back down when needed.", ja: "Aと2は場札で下位カードを支えないため、通常は組札へ送って安全です。3以上は反対色の下位カードを支える場合があるので、上げる前に場札の進行を妨げないか確認してください。OIYO版では必要なら組札から戻せます。", zh: "A和2不会在牌桌区承接更小的牌，通常可以安全移入基础堆。移动3以上的牌前，应确认它是否仍需承接另一颜色的小牌。OIYO 也允许在需要时把基础牌移回牌桌。", fr: "Les as et les 2 ne servent pas de support à une carte plus basse au tableau : on peut généralement les monter. Pour un 3 ou plus, vérifiez qu'il ne doit pas encore recevoir une carte inférieure de couleur opposée. OIYO permet aussi de redescendre une carte de fondation.", es: "Los ases y doses no sostienen cartas inferiores en el tablero, así que normalmente es seguro subirlos. Antes de subir un 3 o mayor, comprueba si aún debe sostener una carta inferior del color opuesto. OIYO también permite bajar una carta de la base." },
      },
      {
        heading: { ko: "3. 뒤집히지 않은 카드가 있는 열을 우선하라", en: "3. Prioritize columns with face-down cards", ja: "3. 裏向きの札があるレーンを優先する", zh: "3. 优先处理有暗牌的那一列", fr: "3. Priorisez les colonnes avec des cartes face cachée", es: "3. Prioriza las columnas con cartas boca abajo" },
        body: { ko: "새로운 정보(뒤집힌 카드)를 얻는 이동이 이미 앞면인 카드만 옮기는 이동보다 언제나 가치가 높습니다. 동점 상황에서는 뒤집을 카드가 남은 열을 먼저 비우세요.", en: "A move that reveals new information (a face-down card) is always worth more than shuffling cards that are already face-up. When in doubt, clear the column that still has hidden cards first.", ja: "新しい情報(裏向きの札)を明らかにする動きは、既に表向きの札を動かすだけの動きより常に価値が高いです。迷ったら裏向きの札が残る列を先に処理しましょう。", zh: "能揭示新信息（暗牌）的移动，价值总是高于只是挪动已明的牌。犹豫不决时，优先清理还有暗牌的那一列。", fr: "Un coup qui révèle une information nouvelle (une carte cachée) vaut toujours plus que déplacer des cartes déjà visibles. En cas de doute, dégagez d'abord la colonne qui a encore des cartes cachées.", es: "Un movimiento que revela información nueva (una carta boca abajo) siempre vale más que mover cartas que ya están boca arriba. Si dudas, despeja primero la columna que aún tiene cartas ocultas." },
      },
      {
        heading: { ko: "4. 빈 열은 킹을 위해 아껴라", en: "4. Save empty columns for kings", ja: "4. 空いた列はキングのために取っておく", zh: "4. 把空列留给K", fr: "4. Réservez les colonnes vides aux rois", es: "4. Reserva las columnas vacías para los reyes" },
        body: { ko: "빈 열에는 킹(또는 킹으로 시작하는 묶음)만 놓을 수 있습니다. 급하게 아무 카드나 채우면 정작 킹이 나왔을 때 놓을 자리가 없어집니다.", en: "Only a king (or a king-led run) can move into an empty column. Filling it hastily with anything else means you'll have nowhere to put a king when one turns up.", ja: "空いた列にはキング(またはキングで始まる連続)しか置けません。急いで何か別のものを置くと、後でキングが出た時に置き場がなくなります。", zh: "空列只能放K（或以K开头的连续牌组）。若急着塞进别的牌，等真正翻出K时就无处可放。", fr: "Seul un roi (ou une suite menée par un roi) peut occuper une colonne vide. La remplir trop vite avec autre chose vous prive de place quand un roi apparaîtra.", es: "Solo un rey (o una secuencia encabezada por un rey) puede ocupar una columna vacía. Llenarla con cualquier otra cosa te deja sin sitio cuando aparezca un rey." },
      },
      {
        heading: { ko: "5. 붉은/검은 교차만 보지 말고 두 수 앞을 생각하라", en: "5. Look two moves ahead, not just the color alternation", ja: "5. 色違いだけでなく2手先を考える", zh: "5. 不要只看颜色交替，多想两步", fr: "5. Anticipez deux coups à l'avance, pas seulement l'alternance des couleurs", es: "5. Piensa dos movimientos por delante, no solo la alternancia de colores" },
        body: { ko: "합법적인 이동이라고 다 좋은 이동은 아닙니다. 이 카드를 옮기면 다음에 어떤 카드가 드러나고, 그 카드로 또 무엇을 할 수 있는지까지 미리 그려보세요.", en: "A legal move isn't automatically a good one. Before committing, picture what card the move reveals next and whether that card actually opens up further plays.", ja: "合法な手が必ずしも良い手とは限りません。動かす前に、次にどの札が現れ、その札で何ができるかまで想像しましょう。", zh: "合法的走法未必是好走法。落子前先设想这一步会揭开哪张牌，那张牌又能带来什么后续可能。", fr: "Un coup légal n'est pas forcément un bon coup. Avant de jouer, imaginez quelle carte sera révélée ensuite et ce qu'elle permettra de faire.", es: "Un movimiento legal no siempre es bueno. Antes de hacerlo, imagina qué carta se revelará después y si esa carta realmente abre nuevas jugadas." },
      },
      {
        heading: { ko: "6. 막혔다면 스톡을 다시 훑어라", en: "6. Cycle the stock again if you're stuck", ja: "6. 詰まったら山札をもう一周する", zh: "6. 卡住时再翻一轮牌库", fr: "6. Reparcourez la pioche si vous êtes bloqué", es: "6. Vuelve a recorrer el mazo si te atascas" },
        body: { ko: "한 바퀴로 안 풀린다고 포기하지 마세요. 테이블로가 바뀌면 스톡의 같은 카드도 이번엔 놓을 자리가 생길 수 있습니다.", en: "Don't give up after one pass through the stock. As the tableau changes, the same stock cards may suddenly have somewhere to go.", ja: "一周で詰まっても諦めないでください。場札が変われば、同じ山札の札に置き場ができることがあります。", zh: "翻完一轮没解开也别放弃。牌桌区变化后，同一张库存牌可能就有地方可放了。", fr: "Ne renoncez pas après un seul passage. Le tableau évoluant, les mêmes cartes de la pioche peuvent soudain trouver une place.", es: "No te rindas tras un solo repaso. Al cambiar el tablero, las mismas cartas del mazo pueden encontrar un lugar." },
      },
    ],
    mistakes: {
      ko: ["3 이상의 카드를 테이블로 필요 여부를 확인하지 않고 올린다", "빈 열을 아무 카드로나 채우려 한다", "뒤집을 카드가 남은 열을 뒤로 미룬다", "한 번 스톡을 넘겨보고 안 풀리면 바로 새 게임을 시작한다"],
      en: ["Sending a 3 or higher up without checking whether the tableau still needs it", "Trying to fill an empty column with a non-king", "Leaving columns with face-down cards for later", "Giving up after one stock cycle instead of running through it again as the board changes"],
      ja: ["3以上を場札で必要か確認せず組札へ上げる", "空いた列をキング以外で埋めようとする", "裏向きの札が残る列を後回しにする", "山札を一周しただけで詰んだと諦め新しいゲームを始める"],
      zh: ["未确认牌桌是否仍需要3以上的牌就移入基础堆", "试图用非K牌填空列", "把还有暗牌的列往后拖", "翻一轮牌库没解开就直接开新局"],
      fr: ["Monter un 3 ou plus sans vérifier si le tableau en a encore besoin", "Essayer de remplir une colonne vide avec autre chose qu'un roi", "Repousser les colonnes qui ont encore des cartes cachées", "Abandonner après un seul passage de la pioche"],
      es: ["Subir un 3 o mayor sin comprobar si el tablero aún lo necesita", "Intentar llenar una columna vacía con algo que no sea un rey", "Dejar para después las columnas con cartas boca abajo", "Rendirte tras un solo repaso del mazo"],
    },
  },

  chess: {
    slug: "chess",
    title: {
      ko: "체스 전략 — 초보를 벗어나는 다섯 가지 원칙",
      en: "Chess Strategy — Five Principles That Get You Past Beginner",
      ja: "チェス戦略 — 初心者を抜け出す5つの原則",
      zh: "国际象棋策略 — 摆脱新手的五个原则",
      fr: "Stratégie aux échecs — cinq principes pour dépasser le niveau débutant",
      es: "Estrategia de ajedrez — cinco principios para dejar de ser principiante",
    },
    intro: {
      ko: "체스에서 초보와 중급을 가르는 것은 외운 수순의 양이 아니라, 매 수마다 무엇을 확인하는지입니다. 아래 다섯 가지는 오프닝 정석을 하나도 외우지 않아도 바로 쓸 수 있는 판단 기준입니다.",
      en: "What separates a beginner from an intermediate player is not how many opening lines they have memorised — it is what they check before every move. These five principles work without memorising a single opening.",
      ja: "チェスで初心者と中級者を分けるのは、暗記した手順の量ではなく、一手ごとに何を確認するかです。以下の5つは定跡を一つも覚えなくてもすぐ使える判断基準です。",
      zh: "在国际象棋中，区分新手与中级棋手的不是背了多少开局，而是每一步之前检查什么。以下五条原则，不用背任何开局也能立刻使用。",
      fr: "Ce qui sépare un débutant d’un joueur intermédiaire n’est pas le nombre d’ouvertures mémorisées, mais ce qu’il vérifie avant chaque coup. Ces cinq principes fonctionnent sans apprendre la moindre ouverture par cœur.",
      es: "Lo que separa a un principiante de un jugador intermedio no es cuántas aperturas memorizó, sino qué comprueba antes de cada jugada. Estos cinco principios funcionan sin memorizar ni una sola apertura.",
    },
    variantNote: {
      ko: "적용 범위: OIYO 구현은 표준 체스 규칙 전체를 따릅니다 — 캐슬링, 앙파상, 승격(기물 선택), 스테일메이트, 50수 규칙, 3회 반복, 기물 부족 무승부. AI는 견습생·숙련가·명인 3단계이며 시간 제한은 없습니다. 아래 조언은 속기(블리츠)가 아니라 시간 여유가 있는 대국을 전제로 합니다.",
      en: "Variant scope: OIYO implements full standard chess — castling, en passant, promotion with piece choice, stalemate, the fifty-move rule, threefold repetition, and insufficient material. The AI has three levels (Apprentice, Adept, Master) and there is no clock. This advice assumes untimed play rather than blitz.",
      ja: "適用範囲: OIYOの実装は標準ルール全体に従います — キャスリング、アンパッサン、昇格(駒選択)、ステイルメイト、50手ルール、同一局面3回、戦力不足による引き分け。AIは見習い・熟練者・名人の3段階で持ち時間はありません。以下の助言はブリッツではなく時間に余裕のある対局を前提とします。",
      zh: "适用范围：OIYO 实现完整的标准规则 — 王车易位、吃过路兵、升变（可选棋子）、逼和、五十回合规则、三次重复、子力不足和棋。AI 分学徒、行家、大师三档，且没有计时。以下建议以慢棋而非快棋为前提。",
      fr: "Portée : OIYO applique les règles standard complètes — roque, prise en passant, promotion avec choix de la pièce, pat, règle des cinquante coups, triple répétition et matériel insuffisant. L’IA propose trois niveaux (Apprenti, Adepte, Maître) et il n’y a pas de pendule. Ces conseils supposent une partie sans cadence rapide.",
      es: "Alcance: OIYO aplica las reglas estándar completas — enroque, captura al paso, promoción con elección de pieza, rey ahogado, regla de cincuenta movimientos, triple repetición y material insuficiente. La IA tiene tres niveles (Aprendiz, Experto, Maestro) y no hay reloj. Estos consejos suponen partidas sin prisa, no blitz.",
    },
    sources: [
      { label: "FIDE — Laws of Chess", href: "https://handbook.fide.com/chapter/E012023" },
      { label: "Chess.com — Basic opening principles", href: "https://www.chess.com/article/view/chess-opening-principles" },
    ],
    tips: [
      {
        heading: { ko: "1. 오프닝은 외우지 말고 세 가지만 지켜라", en: "1. Do not memorise openings — satisfy three goals instead", ja: "1. 定跡は暗記せず、3つだけ守る", zh: "1. 别背开局，只守三条", fr: "1. N’apprenez pas d’ouvertures : visez trois objectifs", es: "1. No memorices aperturas: cumple tres objetivos" },
        body: { ko: "첫 10수의 목표는 딱 셋입니다. 중앙(e4·d4·e5·d5)에 폰을 두고, 나이트와 비숍을 꺼내고, 캐슬링으로 킹을 치웁니다. 이 셋을 상대보다 먼저 끝내면 정석을 몰라도 좋은 포지션이 됩니다. 나이트를 비숍보다 먼저 꺼내는 편이 대체로 무난한데, 나이트는 갈 자리가 뻔한 반면 비숍은 폰 구조를 보고 정해야 하기 때문입니다.", en: "Your first ten moves have exactly three jobs: put a pawn in the centre (e4/d4/e5/d5), develop your knights and bishops, and castle your king to safety. Finish those three before your opponent does and you will have a good position without knowing any theory. Develop knights before bishops as a default — a knight has obvious squares, while a bishop’s best diagonal depends on how the pawns settle.", ja: "最初の10手の目的は3つだけです。中央(e4・d4・e5・d5)にポーンを置き、ナイトとビショップを展開し、キャスリングでキングを安全にする。この3つを相手より先に終えれば、定跡を知らなくても良い局面になります。基本はナイトを先に展開します — ナイトは行き先が明快ですが、ビショップの最善の斜線はポーン構造が決まってから見えるからです。", zh: "开局十步只有三个任务：把兵推到中心（e4/d4/e5/d5）、出动马和象、王车易位保证王的安全。比对手更早完成这三件事，即使不懂理论也能得到好局面。默认先出马再出象 — 马的好格子一目了然，而象走哪条斜线要看兵形定型后才清楚。", fr: "Vos dix premiers coups n’ont que trois tâches : occuper le centre avec un pion (e4/d4/e5/d5), développer cavaliers et fous, et roquer pour mettre le roi à l’abri. Terminez ces trois choses avant l’adversaire et vous aurez une bonne position sans connaître la théorie. Développez les cavaliers avant les fous par défaut : le cavalier a des cases évidentes, alors que la meilleure diagonale du fou dépend de la structure de pions.", es: "Tus diez primeras jugadas tienen solo tres tareas: poner un peón en el centro (e4/d4/e5/d5), desarrollar caballos y alfiles, y enrocar para poner al rey a salvo. Termina esas tres antes que tu rival y tendrás buena posición sin saber teoría. Desarrolla los caballos antes que los alfiles por defecto: el caballo tiene casillas evidentes, mientras que la mejor diagonal del alfil depende de cómo se fije la estructura de peones." },
      },
      {
        heading: { ko: "2. 두기 전에 상대의 직전 수가 무엇을 노리는지 묻는다", en: "2. Before you move, ask what your opponent’s last move threatened", ja: "2. 指す前に、相手の直前の手が何を狙っているか問う", zh: "2. 落子前先问：对手上一步在威胁什么", fr: "2. Avant de jouer, demandez ce que menaçait le dernier coup adverse", es: "2. Antes de mover, pregunta qué amenazaba la última jugada rival" },
        body: { ko: "초급 대국에서 승패의 대부분은 전략이 아니라 그냥 기물을 공짜로 주는 데서 갈립니다. 매 수마다 두 가지만 확인하세요. 상대의 직전 수가 새로 공격하는 칸이 어디인가, 그리고 내가 두려는 수가 내 기물을 무방비로 남기는가. 특히 상대 나이트가 내 킹과 퀸(또는 룩)을 동시에 노리는 포크 자리에 갈 수 있는지 매번 보세요. 이 확인 하나로 초급 구간의 실수 대부분이 사라집니다.", en: "At beginner level most games are decided not by strategy but by pieces given away for free. Check two things every move: which squares did my opponent’s last move newly attack, and does my intended move leave any of my pieces undefended? Watch especially for squares where an enemy knight would fork your king and queen (or a rook). This single habit removes most beginner losses.", ja: "初級の対局は戦略ではなく、駒をただで渡すことで勝敗が決まります。一手ごとに2点だけ確認しましょう。相手の直前の手が新たに攻撃している升はどこか、そして自分の指そうとする手が駒を無防備に残さないか。特に相手のナイトがキングとクイーン(またはルーク)を同時に狙うフォークの升に入れるかを毎回見てください。この習慣だけで初級の負けの大半が消えます。", zh: "初级对局的胜负多半不取决于战略，而在于白送棋子。每步只查两件事：对手上一步新攻击了哪些格子，我想走的这步会不会让某个子失去保护？尤其要留意对方马能否跳到同时叉击你的王和后（或车）的格子。仅这一个习惯就能消除初学者的大部分败局。", fr: "Au niveau débutant, la plupart des parties se décident non par la stratégie mais par des pièces données gratuitement. Vérifiez deux choses à chaque coup : quelles cases le dernier coup adverse attaque-t-il désormais, et mon coup laisse-t-il une pièce sans défense ? Surveillez surtout les cases d’où un cavalier adverse ferait une fourchette sur votre roi et votre dame (ou une tour). Cette seule habitude supprime l’essentiel des défaites de débutant.", es: "En el nivel principiante la mayoría de partidas no se deciden por estrategia sino por piezas regaladas. Comprueba dos cosas en cada jugada: qué casillas ataca ahora la última jugada rival, y si tu jugada deja alguna pieza sin defensa. Vigila sobre todo las casillas desde las que un caballo rival haría un tenedor a tu rey y tu dama (o una torre). Este único hábito elimina la mayoría de derrotas de principiante." },
      },
      {
        heading: { ko: "3. 교환은 기물 값이 아니라 남는 포지션으로 판단하라", en: "3. Judge trades by the position left behind, not by point count", ja: "3. 交換は駒の点数ではなく、残る局面で判断する", zh: "3. 判断兑子要看留下的局面，而非子力分值", fr: "3. Jugez les échanges à la position qui reste, pas au décompte", es: "3. Juzga los cambios por la posición que queda, no por los puntos" },
        body: { ko: "폰 1, 나이트·비숍 3, 룩 5, 퀸 9라는 값은 출발점일 뿐입니다. 실전에서는 세 가지가 값을 뒤집습니다. 내가 기물이 많으면 교환할수록 유리해지고(적을 때는 반대), 상대의 잘 놓인 기물은 내 나쁜 기물과 바꿔도 이득이며, 상대 킹 앞을 지키는 수비수는 값보다 비쌉니다. 그냥 잡을 수 있어서 잡는 교환이 가장 흔한 손해입니다.", en: "The values — pawn 1, knight and bishop 3, rook 5, queen 9 — are only a starting point. Three things override them in practice: when you are ahead in material, every trade helps you (and hurts you when you are behind); trading your bad piece for their good one is a win even at equal points; and a piece defending the squares around their king is worth more than its value. Trading simply because a capture is available is the most common way to lose ground.", ja: "ポーン1、ナイト・ビショップ3、ルーク5、クイーン9という点数は出発点にすぎません。実戦では3つがこれを覆します。駒得しているなら交換するほど有利になり(劣勢なら逆)、相手の good な駒と自分の悪い駒の交換は同点でも得であり、相手キング周辺を守る駒は点数以上の価値があります。取れるから取る交換が最も多い損です。", zh: "兵1、马象3、车5、后9 只是起点。实战中有三点会推翻它：子力领先时每次兑子都对你有利（落后时相反）；用你的坏子换对方的好子，即使分值相等也是赚；守在对方王前的子价值高于其分值。仅因为能吃就吃，是最常见的亏损方式。", fr: "Les valeurs — pion 1, cavalier et fou 3, tour 5, dame 9 — ne sont qu’un point de départ. Trois éléments les renversent en pratique : quand vous menez au matériel, chaque échange vous aide (et vous nuit si vous êtes en retard) ; échanger votre mauvaise pièce contre leur bonne pièce est un gain même à points égaux ; et une pièce qui défend les cases autour de leur roi vaut plus que sa valeur. Échanger simplement parce qu’une prise est possible est la façon la plus courante de perdre du terrain.", es: "Los valores — peón 1, caballo y alfil 3, torre 5, dama 9 — son solo un punto de partida. Tres cosas los invalidan en la práctica: si vas ganando material, cada cambio te favorece (y te perjudica si vas por detrás); cambiar tu pieza mala por la buena del rival es una ganancia aunque los puntos sean iguales; y una pieza que defiende las casillas junto a su rey vale más que su valor. Cambiar solo porque hay una captura disponible es la forma más común de perder terreno." },
      },
      {
        heading: { ko: "4. 나이트는 막힌 판, 비숍은 열린 판", en: "4. Knights for closed positions, bishops for open ones", ja: "4. ナイトは閉じた局面、ビショップは開いた局面", zh: "4. 封闭局面用马，开放局面用象", fr: "4. Cavaliers en position fermée, fous en position ouverte", es: "4. Caballos en posiciones cerradas, alfiles en abiertas" },
        body: { ko: "나이트와 비숍은 둘 다 3점이지만 어울리는 판이 다릅니다. 폰이 서로 맞물려 막힌 판에서는 기물을 뛰어넘는 나이트가 낫고, 폰이 많이 교환돼 대각선이 뚫린 판에서는 비숍이 훨씬 멉니다. 그래서 두 비숍을 다 가진 쪽은 판을 여는 교환을, 나이트를 가진 쪽은 폰을 맞물리게 하는 수를 노립니다. 나이트는 판 가장자리에서 갈 수 있는 칸이 절반으로 줄어드니 중앙 쪽에 두세요.", en: "Knights and bishops are both worth three, but they want different boards. In a closed position where pawns are locked together, the knight that jumps over pieces is better; in an open position where pawns have been traded off, the bishop reaches much further. So the side holding both bishops looks for trades that open the position, while the side with knights tries to lock the pawns. Keep knights near the centre — on the edge of the board a knight loses half its squares.", ja: "ナイトとビショップはどちらも3点ですが、合う局面が違います。ポーンが噛み合った閉じた局面では駒を飛び越えるナイトが優れ、ポーンが交換されて斜線が開いた局面ではビショップの方がはるかに遠くまで届きます。だから二枚のビショップを持つ側は局面を開く交換を、ナイトを持つ側はポーンを噛み合わせる手を狙います。ナイトは盤の端では利きが半減するので中央寄りに置きましょう。", zh: "马和象都值三分，但适合的局面不同。兵互相锁死的封闭局面里，能跳过棋子的马更强；兵大量兑掉、斜线打开的局面里，象的射程远得多。因此拥有双象的一方会寻求打开局面的兑换，而有马的一方则设法锁住兵形。马要靠近中心 — 在棋盘边缘，马的可走格子少了一半。", fr: "Cavaliers et fous valent tous deux trois points, mais ils veulent des échiquiers différents. En position fermée où les pions sont bloqués, le cavalier qui saute par-dessus les pièces est meilleur ; en position ouverte où les pions ont été échangés, le fou porte bien plus loin. Le camp qui possède les deux fous cherche donc les échanges qui ouvrent le jeu, tandis que celui aux cavaliers tente de bloquer les pions. Gardez les cavaliers vers le centre : au bord, un cavalier perd la moitié de ses cases.", es: "Caballos y alfiles valen ambos tres puntos, pero quieren tableros distintos. En posición cerrada, con los peones trabados, el caballo que salta por encima es mejor; en posición abierta, con peones ya cambiados, el alfil llega mucho más lejos. Por eso quien tiene la pareja de alfiles busca cambios que abran el juego, y quien tiene caballos intenta trabar los peones. Mantén los caballos cerca del centro: en el borde, un caballo pierde la mitad de sus casillas." },
      },
      {
        heading: { ko: "5. 기물이 줄면 킹을 숨기지 말고 앞으로 내보내라", en: "5. Once the pieces come off, march your king forward", ja: "5. 駒が減ったらキングは隠さず前に出す", zh: "5. 子力减少后，让王走向前场", fr: "5. Une fois les pièces échangées, avancez votre roi", es: "5. Cuando quedan pocas piezas, adelanta tu rey" },
        body: { ko: "오프닝과 미들게임 내내 킹은 숨겨야 할 약점이지만, 퀸과 룩이 사라진 엔드게임에서는 킹이 가장 강한 기물 중 하나가 됩니다. 체크메이트당할 위험이 사라진 순간 킹을 중앙으로 걸어 나가게 하세요. 엔드게임의 승패는 대개 폰 하나를 승격시키느냐인데, 그 폰을 밀어주고 상대 폰을 막는 일을 킹이 합니다. 엔드게임에서 킹을 뒤에 남겨두는 것은 기물 하나를 안 쓰고 두는 것과 같습니다.", en: "Through the opening and middlegame the king is a liability to be hidden, but in an endgame with the queens and rooks gone it becomes one of your strongest pieces. The moment there is no mating danger left, walk your king toward the centre. Endgames are usually decided by whether one pawn promotes, and it is the king that escorts your pawn forward and blocks theirs. Leaving your king at the back in an endgame is playing a piece short.", ja: "序盤と中盤を通じてキングは隠すべき弱点ですが、クイーンとルークが消えた終盤では最強クラスの駒になります。詰まされる危険がなくなった瞬間、キングを中央へ歩かせましょう。終盤の勝敗はたいていポーン1枚が昇格できるかで決まり、そのポーンを押し上げ相手のポーンを止めるのがキングです。終盤にキングを後方に残すのは駒を1枚使わずに指すのと同じです。", zh: "开局和中局里王是需要藏起来的弱点，但在后与车都已消失的残局中，王会变成最强的棋子之一。一旦没有被将死的危险，就把王走向中心。残局胜负通常取决于能否升变一个兵，而护送己方兵前进、拦住对方兵的正是王。残局把王留在后方，等于少用一个子在下棋。", fr: "Pendant l’ouverture et le milieu de partie, le roi est une faiblesse à cacher ; mais en finale, dames et tours disparues, il devient l’une de vos pièces les plus fortes. Dès qu’il n’y a plus de danger de mat, avancez votre roi vers le centre. Les finales se décident généralement sur la promotion d’un pion, et c’est le roi qui escorte le vôtre et bloque celui de l’adversaire. Laisser son roi au fond en finale, c’est jouer avec une pièce en moins.", es: "Durante la apertura y el medio juego el rey es una debilidad que hay que esconder, pero en un final sin damas ni torres se convierte en una de tus piezas más fuertes. En cuanto desaparezca el peligro de mate, lleva tu rey hacia el centro. Los finales suelen decidirse por si un peón corona, y es el rey quien escolta al tuyo y frena el suyo. Dejar el rey atrás en un final es jugar con una pieza menos." },
      },
    ],
    mistakes: {
      ko: [
        "퀸을 2~3수 만에 꺼낸다 — 상대가 나이트와 비숍을 전개하면서 퀸을 쫓아내면, 상대는 공짜로 발전하고 나는 같은 퀸만 계속 움직이게 됩니다.",
        "오프닝에서 같은 기물을 두 번 이상 움직인다 — 한 수는 한 기물을 꺼내는 데 쓰는 것이 원칙입니다.",
        "캐슬링을 미루다 판이 열린다 — 중앙 폰이 교환된 뒤의 킹은 그대로 표적입니다.",
        "가장자리 폰을 욕심내다 전개가 늦는다 — 폰 하나 값보다 두세 수의 발전이 큽니다.",
        "내 공격만 계산하고 상대의 응수를 보지 않는다 — 상대가 그 자리에서 무엇을 두는지 한 수만 더 보세요.",
      ],
      en: [
        "Bringing the queen out on move two or three — your opponent develops knights and bishops while chasing her, gaining free moves while you shuffle one piece.",
        "Moving the same piece twice in the opening — as a rule, each move should bring a new piece into play.",
        "Delaying castling until the position opens — once the central pawns are traded, an uncastled king is simply a target.",
        "Grabbing a wing pawn at the cost of development — two or three developing moves are worth more than one pawn.",
        "Calculating only your own attack — always look one move further at what your opponent gets to play in reply.",
      ],
      ja: [
        "2〜3手目でクイーンを出す — 相手はナイトやビショップを展開しながらクイーンを追い払い、無料で駒を発展させます。",
        "序盤に同じ駒を2回以上動かす — 一手で新しい駒を一つ展開するのが原則です。",
        "キャスリングを先延ばしにして局面が開く — 中央のポーンが交換された後の未キャスリングのキングは的でしかありません。",
        "端のポーンを欲張って展開が遅れる — ポーン1枚より2〜3手の発展の方が価値があります。",
        "自分の攻めだけ読んで相手の応手を見ない — 相手がそこで何を指せるかを必ず一手先まで見てください。",
      ],
      zh: [
        "第二三步就出后 — 对手一边出马出象一边驱赶你的后，白赚发展步数，而你只在挪同一个子。",
        "开局阶段同一个子走两次以上 — 原则上每一步都应该带出一个新棋子。",
        "拖延王车易位直到局面打开 — 中心兵一旦兑掉，未易位的王就只是靶子。",
        "为贪边兵而耽误出子 — 两三步发展的价值高于一个兵。",
        "只算自己的进攻，不看对手的应招 — 一定要多看一步，看对手能回什么。",
      ],
      fr: [
        "Sortir la dame au deuxième ou troisième coup : l’adversaire développe cavaliers et fous en la chassant, gagnant des temps pendant que vous déplacez une seule pièce.",
        "Jouer deux fois la même pièce dans l’ouverture : en principe, chaque coup doit mettre en jeu une pièce nouvelle.",
        "Retarder le roque jusqu’à l’ouverture de la position : une fois les pions centraux échangés, un roi non roqué n’est qu’une cible.",
        "Prendre un pion d’aile au prix du développement : deux ou trois coups de développement valent plus qu’un pion.",
        "Ne calculer que votre attaque : regardez toujours un coup plus loin ce que l’adversaire pourra répondre.",
      ],
      es: [
        "Sacar la dama en la segunda o tercera jugada: el rival desarrolla caballos y alfiles mientras la persigue, ganando tiempos mientras tú mueves una sola pieza.",
        "Mover la misma pieza dos veces en la apertura: por norma, cada jugada debe incorporar una pieza nueva.",
        "Retrasar el enroque hasta que la posición se abra: cambiados los peones centrales, un rey sin enrocar es solo un blanco.",
        "Capturar un peón de flanco a costa del desarrollo: dos o tres jugadas de desarrollo valen más que un peón.",
        "Calcular solo tu ataque: mira siempre una jugada más allá, a lo que el rival podrá responder.",
      ],
    },
  },
  minesweeper: {
    slug: "minesweeper",
    title: {
      ko: "지뢰찾기 실력을 늘리는 논리 전략",
      en: "Minesweeper Strategy — Logic Techniques That Actually Win",
      ja: "マインスイーパー攻略 — 実力が上がる論理テクニック",
      zh: "扫雷攻略 — 真正提升胜率的逻辑技巧",
      fr: "Stratégie du Démineur — les techniques logiques qui gagnent",
      es: "Estrategia del Buscaminas — técnicas lógicas que funcionan",
    },
    intro: {
      ko: "지뢰찾기는 운이 아니라 대부분 논리로 풀립니다. 아래 기법을 익히면 추측에 의존하는 상황이 크게 줄어듭니다.",
      en: "Minesweeper is mostly logic, not luck. Learning these techniques dramatically cuts down how often you're forced to guess.",
      ja: "マインスイーパーはほとんどが運ではなく論理で解けます。以下のテクニックを身につけると、推測に頼る場面が大きく減ります。",
      zh: "扫雷主要靠逻辑而非运气。掌握以下技巧能大幅减少被迫瞎猜的情况。",
      fr: "Le Démineur se résout surtout par la logique, pas la chance. Ces techniques réduisent nettement les moments où vous devez deviner.",
      es: "El Buscaminas se resuelve sobre todo con lógica, no con suerte. Estas técnicas reducen mucho las veces que te ves obligado a adivinar.",
    },
    variantNote: {
      ko: "적용 범위: OIYO는 첫 클릭 안전, 논리 풀이 가능 보드 생성 시도, 초급 10×10/10·중급 16×16/40·고급 30×16/99를 사용합니다. 생성 상한 뒤에는 추측이 필요한 보드가 나올 수 있으며 화면에 이를 표시합니다.",
      en: "Variant scope: OIYO uses first-click safety and attempts no-guess generation at 10×10/10, 16×16/40, and 30×16/99. After the generation cap, an honestly labelled fallback board may still require a guess.",
      ja: "適用範囲: OIYO版は初手安全で、10×10/10、16×16/40、30×16/99の論理解法可能盤面を生成しようとします。生成上限後の明示された代替盤面では推測が必要な場合があります。",
      zh: "适用范围：OIYO 保证首次点击安全，并尝试生成10×10/10、16×16/40、30×16/99的无猜测棋盘。达到生成上限后的明确标示备用棋盘仍可能需要猜测。",
      fr: "Portée de la variante : OIYO sécurise le premier clic et tente de générer des grilles sans supposition en 10×10/10, 16×16/40 et 30×16/99. Après la limite, une grille de repli signalée peut exiger un pari.",
      es: "Alcance de la variante: OIYO protege el primer clic e intenta generar tableros sin adivinanzas de 10×10/10, 16×16/40 y 30×16/99. Tras el límite, un tablero alternativo marcado puede exigir adivinar.",
    },
    sources: [
      { label: "MIT OpenCourseWare — SmartSweeper specification", href: "https://ocw.mit.edu/courses/6-871-knowledge-based-applications-systems-spring-2005/1844b6c6f67a8beb9da88171b194e64a_ps1.pdf" },
      { label: "StrategyWiki — Minesweeper walkthrough", href: "https://strategywiki.org/wiki/Minesweeper/Walkthrough" },
    ],
    tips: [
      {
        heading: { ko: "1. 미공개 칸 집합을 비교하라", en: "1. Compare sets of unopened cells", ja: "1. 未開マスの集合を比較する", zh: "1. 比较未开格集合", fr: "1. Comparez les ensembles de cases fermées", es: "1. Compara conjuntos de casillas cerradas" },
        body: { ko: "확정 깃발을 뺀 두 숫자의 미공개 이웃을 집합으로 보세요. 한 집합이 다른 집합에 완전히 포함된다면, 남은 지뢰 수의 차이가 바깥쪽 칸들에 들어갈 지뢰 수입니다. 차이가 0이면 바깥쪽 칸은 모두 안전하고, 차이가 바깥쪽 칸 수와 같으면 모두 지뢰입니다. 단순히 1 두 개가 겹친다는 사실만으로는 안전 칸을 확정할 수 없습니다.", en: "Treat each clue's unopened neighbors as a set after subtracting confirmed flags. If one set is fully contained in another, the difference in their remaining mine counts is the number of mines in the outer cells. A difference of zero makes all outer cells safe; a difference equal to the number of outer cells makes them all mines. Two overlapping 1s alone do not prove that a cell is safe.", ja: "確定した旗を差し引き、各数字の未開の隣接マスを集合として考えます。一方の集合がもう一方に完全に含まれるなら、残りの地雷数の差が外側のマスにある地雷数です。差が0なら外側はすべて安全、差が外側のマス数と同じならすべて地雷です。1が2つ重なるだけでは安全なマスは確定しません。", zh: "扣除已确认的旗子后，把每个数字周围的未开格视为一个集合。若一个集合完全包含于另一个集合，两者剩余雷数之差就是外侧格中的雷数。差为0时外侧格全部安全；差等于外侧格数量时则全部是雷。仅凭两个“1”有重叠并不能确定安全格。", fr: "Après avoir soustrait les drapeaux confirmés, considérez les voisins fermés de chaque indice comme un ensemble. Si un ensemble est entièrement inclus dans l'autre, la différence entre les mines restantes donne le nombre de mines dans les cases extérieures. Une différence nulle les rend toutes sûres ; une différence égale à leur nombre les rend toutes minées. Deux « 1 » qui se chevauchent ne suffisent pas, à eux seuls, à prouver qu'une case est sûre.", es: "Tras restar las banderas confirmadas, trata las vecinas cerradas de cada pista como un conjunto. Si un conjunto está totalmente contenido en otro, la diferencia entre las minas restantes indica cuántas hay en las casillas exteriores. Si la diferencia es cero, todas son seguras; si iguala el número de casillas exteriores, todas son minas. Dos «1» superpuestos por sí solos no demuestran que una casilla sea segura." },
      },
      {
        heading: { ko: "2. 숫자에서 확정 깃발 수를 빼면 남는 칸이 보인다", en: "2. Subtract confirmed flags from the number", ja: "2. 数字から確定した旗の数を引く", zh: "2. 用数字减去已确认的旗子数", fr: "2. Soustrayez les drapeaux confirmés du chiffre", es: "2. Resta las banderas confirmadas del número" },
        body: { ko: "숫자 주변에 이미 깃발이 그 숫자만큼 꽂혀 있다면, 나머지 미공개 칸은 전부 안전합니다. 반대로 숫자와 미공개 칸 수가 같다면 전부 지뢰입니다.", en: "If the flags already placed around a number equal that number, every other unopened neighbor is safe. Conversely, if the number equals the count of unopened neighbors, all of them are mines.", ja: "数字の周りに既にその数だけ旗が立っていれば、残りの未開マスは全て安全です。逆に数字と未開マスの数が同じなら、全て地雷です。", zh: "如果数字周围已插的旗子数等于该数字，其余未开格全部安全。反之若数字等于未开邻格数，则全部是地雷。", fr: "Si les drapeaux déjà posés autour d'un chiffre égalent ce chiffre, toutes les autres cases fermées voisines sont sûres. À l'inverse, si le chiffre égale le nombre de cases fermées voisines, toutes sont minées.", es: "Si las banderas ya colocadas alrededor de un número igualan a ese número, el resto de casillas cerradas vecinas son seguras. Al revés, si el número iguala al recuento de vecinas cerradas, todas son minas." },
      },
      {
        heading: { ko: "3. 모서리와 가장자리부터 정리하라", en: "3. Clear corners and edges first", ja: "3. 隅や端から片付ける", zh: "3. 优先清理角落和边缘", fr: "3. Dégagez d'abord les coins et les bords", es: "3. Despeja primero las esquinas y los bordes" },
        body: { ko: "가장자리 칸은 이웃이 적어(모서리는 3개뿐) 논리가 훨씬 단순합니다. 중앙의 복잡한 숫자 뭉치보다 가장자리를 먼저 확정하면 정보가 빠르게 쌓입니다.", en: "Edge cells have fewer neighbors (corners have just 3), so the logic is simpler. Nailing down edges before tackling a dense central cluster builds up safe information faster.", ja: "端のマスは隣接数が少なく(隅はわずか3つ)、論理が単純です。中央の込み入った数字より先に端を確定させると情報が早く積み上がります。", zh: "边缘格邻居较少（角落只有3个），逻辑更简单。先确定边缘再处理中央密集数字区，能更快积累安全信息。", fr: "Les cases de bord ont moins de voisins (3 seulement pour les coins), donc la logique est plus simple. Réglez les bords avant le centre dense pour accumuler l'information plus vite.", es: "Las casillas de borde tienen menos vecinas (las esquinas solo 3), así que la lógica es más simple. Resuelve los bordes antes que el centro denso para acumular información más rápido." },
      },
      {
        heading: { ko: "4. 정말 논리로 안 풀리면 확률이 가장 낮은 칸을 골라라", en: "4. When truly stuck, guess the lowest-probability cell", ja: "4. 本当に詰まったら確率が最も低いマスを選ぶ", zh: "4. 真的卡住时选概率最低的格子", fr: "4. Si vous êtes vraiment bloqué, devinez la case la moins probable", es: "4. Si de verdad te atascas, adivina la casilla con menor probabilidad" },
        body: { ko: "가끔은 순수 논리만으로 풀리지 않는 판도 있습니다. 추측이 필요하면 가능한 지뢰 배치를 모두 만족시키는 칸별 확률을 비교하고, 남은 전체 지뢰 수와 아직 제약이 없는 칸 수도 함께 계산하세요. 숫자와 접하지 않았다는 이유만으로 그 칸이 더 안전하다고 단정할 수는 없습니다.", en: "Some boards genuinely cannot be solved by logic alone. If you must guess, compare each cell across all mine placements consistent with the clues, including the total mines and unconstrained cells still remaining. A cell is not automatically safer merely because it touches no revealed number.", ja: "純粋な論理だけでは解けない盤面もあります。推測が必要なら、手掛かりと矛盾しない全ての地雷配置で各マスの確率を比較し、残りの総地雷数と制約のないマス数も考慮します。数字に接していないという理由だけで、そのマスが安全とは断定できません。", zh: "有些棋盘确实无法只靠逻辑解开。必须猜测时，应比较所有符合线索的布雷方案中各格的概率，并同时计入剩余总雷数和未受约束的格数。一个格子没有接触已开数字，并不代表它一定更安全。", fr: "Certaines grilles ne se résolvent pas par la seule logique. Si vous devez deviner, comparez chaque case dans toutes les dispositions de mines compatibles avec les indices, en tenant compte du total de mines et des cases encore sans contrainte. Une case n'est pas automatiquement plus sûre parce qu'elle ne touche aucun chiffre révélé.", es: "Algunos tableros no se pueden resolver solo con lógica. Si debes adivinar, compara cada casilla entre todas las distribuciones de minas compatibles con las pistas, incluyendo el total de minas y las casillas aún sin restricciones. Una casilla no es automáticamente más segura solo porque no toque ningún número revelado." },
      },
      {
        heading: { ko: "5. 코드(chord)로 속도를 올려라", en: "5. Use chording to speed up", ja: "5. コード操作(まとめ開け)で速度を上げる", zh: "5. 用连锁开格(chord)提速", fr: "5. Utilisez le chordage pour aller plus vite", es: "5. Usa el «chording» para ir más rápido" },
        body: { ko: "이미 열린 숫자 칸 주변에 그 숫자만큼 깃발을 꽂았다면, 그 숫자를 다시 누르면 나머지 미공개 칸이 한꺼번에 열립니다. 매 칸을 하나씩 여는 것보다 훨씬 빠릅니다.", en: "Once you've flagged exactly as many mines as an open number indicates, pressing that number again opens all its remaining unflagged neighbors at once — far faster than opening each cell individually.", ja: "既に開いた数字の周りにその数だけ旗を立てたら、その数字をもう一度押すと残りの未開マスが一括で開きます。1つずつ開けるより格段に速いです。", zh: "已开数字周围插旗数达到该数字后，再点一次该数字即可一次性打开其余未插旗的邻格，比逐格打开快得多。", fr: "Une fois qu'un chiffre ouvert a autant de drapeaux voisins que sa valeur, cliquez dessus à nouveau pour ouvrir d'un coup toutes ses cases voisines restantes — bien plus rapide qu'une par une.", es: "Cuando un número abierto ya tiene tantas banderas vecinas como su valor, pulsarlo de nuevo abre de golpe todas sus vecinas restantes sin bandera, mucho más rápido que abrirlas una a una." },
      },
    ],
    mistakes: {
      ko: ["숫자와 미공개 칸 수가 같은데도 깃발을 안 꽂고 넘어간다", "중앙의 복잡한 패턴부터 붙잡고 가장자리를 방치한다", "확률 계산 없이 감으로 아무 칸이나 클릭한다", "코드(더블클릭) 기능을 몰라서 한 칸씩 느리게 연다"],
      en: ["Not flagging when a number already equals its unopened-neighbor count", "Tackling the dense center first while ignoring simpler edges", "Clicking cells purely on a hunch instead of comparing probabilities", "Not knowing about chording and opening every cell one at a time"],
      ja: ["数字と未開マス数が同じなのに旗を立てずに進む", "単純な端を放置して込み入った中央から手を付ける", "確率比較なしに勘でマスをクリックする", "コード操作を知らず1つずつゆっくり開ける"],
      zh: ["数字已等于未开邻格数却不插旗", "先啃复杂的中央而忽略更简单的边缘", "不比较概率、凭感觉乱点格子", "不知道连锁开格功能，一格一格慢慢开"],
      fr: ["Ne pas placer de drapeau quand un chiffre égale déjà son nombre de voisines fermées", "S'attaquer au centre dense en négligeant les bords plus simples", "Cliquer au hasard sans comparer les probabilités", "Ignorer le chordage et ouvrir chaque case une par une"],
      es: ["No poner bandera cuando un número ya iguala su recuento de vecinas cerradas", "Atacar primero el centro denso ignorando los bordes más simples", "Hacer clic al azar sin comparar probabilidades", "No conocer el chording y abrir cada casilla una por una"],
    },
  },

  "hearts-game": {
    slug: "hearts-game",
    title: {
      ko: "하트 카드게임 승리 전략",
      en: "Hearts Strategy — How to Win and Avoid Points",
      ja: "ハーツ攻略 — 勝つための戦略とポイント回避術",
      zh: "红心大战策略 — 如何获胜并避免得分",
      fr: "Stratégie de la Dame de pique (Hearts) — comment gagner",
      es: "Estrategia de Corazones — cómo ganar y evitar puntos",
    },
    intro: {
      ko: "하트는 단순히 낮은 카드만 낸다고 이기는 게임이 아닙니다. 손패 구조를 읽고, 언제 위험한 카드를 버릴지 타이밍을 잡는 것이 핵심입니다.",
      en: "Hearts isn't won by simply always playing your lowest card. The real skill is reading your hand's shape and timing when to dump dangerous cards.",
      ja: "ハーツは単に低い札を出すだけで勝てるゲームではありません。手札の構造を読み、危険な札をいつ捨てるかのタイミングが鍵です。",
      zh: "红心大战不是一味出小牌就能赢的游戏。真正的技巧在于读懂手牌结构，把握弃出危险牌的时机。",
      fr: "Aux Hearts, on ne gagne pas juste en jouant toujours sa carte la plus basse. Le vrai talent, c'est de lire la forme de sa main et de savoir quand se débarrasser des cartes dangereuses.",
      es: "En Corazones no se gana solo jugando siempre la carta más baja. La habilidad real está en leer la forma de tu mano y saber cuándo deshacerte de las cartas peligrosas.",
    },
    variantNote: {
      ko: "적용 범위: OIYO는 미국식 4인 규칙을 사용합니다. 클럽 2 선출, 첫 트릭 벌점 카드 제한, 하트 브레이크, 좌·우·맞은편·보류 전달, 100점 종료, 달 쏘기 0/26점 방식입니다. 지역 변형은 다를 수 있습니다.",
      en: "Variant scope: OIYO follows four-player American Hearts: 2♣ opens, penalty cards are restricted on trick one, hearts must be broken, passes cycle left/right/across/hold, play ends at 100, and moon scoring is 0/26. Regional variants differ.",
      ja: "適用範囲: OIYO版は米国式4人制です。クラブ2の初手、最初のトリックの罰点札制限、ハートブレイク、左・右・向かい・保留のパス、100点終了、ムーン0/26点方式を採用します。地域ルールは異なります。",
      zh: "适用范围：OIYO采用美式四人规则：梅花2首出、第一墩限制罚分牌、红心破门后方可领出、左/右/对面/保留传牌、100分结束、全收按0/26计分。地区变体可能不同。",
      fr: "Portée de la variante : OIYO suit la Dame de pique américaine à quatre joueurs : 2♣ en ouverture, cartes de pénalité limitées au premier pli, cœurs à ouvrir, passes gauche/droite/face/garde, fin à 100 et grand chelem 0/26. Les variantes régionales diffèrent.",
      es: "Alcance de la variante: OIYO usa Corazones americano para cuatro: abre el 2♣, se limitan cartas de penalización en la primera baza, hay que abrir corazones, pases izquierda/derecha/enfrente/conservar, final a 100 y luna 0/26. Hay variantes regionales.",
    },
    sources: [
      { label: "Pagat — Hearts rules and variants", href: "https://www.pagat.com/reverse/hearts.html" },
    ],
    tips: [
      {
        heading: { ko: "1. 스페이드 퀸과 높은 스페이드를 일찍 처리하라", en: "1. Get rid of the Queen of Spades early", ja: "1. スペードのQと高いスペードを早めに処理する", zh: "1. 尽早处理黑桃Q和大黑桃", fr: "1. Débarrassez-vous tôt de la dame de pique", es: "1. Deshazte pronto de la reina de picas" },
        body: { ko: "스페이드 퀸(13점)이 손에 있다면, 스페이드 에이스나 킹이 나오기 전에 남에게 넘기거나 스페이드가 여러 번 돌 때 안전하게 버릴 기회를 노리세요. 너무 오래 들고 있으면 마지막까지 위험이 따라다닙니다.", en: "If you're holding the Queen of Spades (13 points), look to pass it away or dump it safely once spades have been led a few times — ideally after the ace and king are gone. Holding it too long means the risk follows you to the end.", ja: "スペードのQ(13点)を持っているなら、パスで手放すか、スペードが何度か出た後(できればAとKが消えた後)に安全に捨てましょう。長く持ちすぎると最後までリスクが付きまといます。", zh: "若手中有黑桃Q(13分)，尽量传牌处理掉，或在黑桃出过几轮后(最好A和K已出)安全弃掉。拖得太久风险会一直跟着你。", fr: "Si vous avez la dame de pique (13 points), essayez de la passer ou de vous en débarrasser sûrement une fois que le pique a été joué plusieurs fois, idéalement après l'as et le roi. La garder trop longtemps vous expose jusqu'à la fin.", es: "Si tienes la reina de picas (13 puntos), intenta pasarla o deshacerte de ella con seguridad tras varias rondas de picas, idealmente después de que salgan el as y el rey. Guardarla demasiado te expone hasta el final." },
      },
      {
        heading: { ko: "2. 짧은 무늬를 만들어 '보이드'를 준비하라", en: "2. Void a short suit on purpose", ja: "2. あえて短いスートをボイドにする", zh: "2. 主动清空一门短花色", fr: "2. Videz volontairement une couleur courte", es: "2. Queda sin palo a propósito en uno corto" },
        body: { ko: "손에 2~3장뿐인 무늬가 있다면, 그 무늬가 나올 때마다 처리해 일찍 '보이드'(그 무늬가 하나도 없는 상태)로 만드세요. 그러면 나중에 그 무늬가 리드될 때 원하는 어떤 카드든(하트나 스페이드 퀸 포함) 대신 낼 수 있습니다.", en: "If you have only 2-3 cards in a suit, play them off whenever that suit is led so you go void early. Once void, you're free to discard any card you want — including hearts or the Queen of Spades — whenever that suit comes up again.", ja: "手札に2〜3枚しかないスートがあれば、そのスートが出るたびに処理して早めにボイドにしましょう。ボイドになれば、そのスートがリードされる度に好きな札(ハートやスペードQ含む)を出せます。", zh: "若某花色手中只剩2到3张，遇到该花色出牌时尽量出掉，尽早清空。清空后，之后每次该花色被领出时都能任意弃牌（包括红心或黑桃Q）。", fr: "Si vous n'avez que 2-3 cartes d'une couleur, jouez-les dès que cette couleur est menée pour vous en vider tôt. Une fois vide, vous pouvez défausser ce que vous voulez (cœurs, dame de pique) à chaque fois que cette couleur revient.", es: "Si solo tienes 2-3 cartas de un palo, juégalas cuando salga ese palo para quedarte sin él pronto. Una vez sin ese palo, puedes descartar lo que quieras (corazones o la reina de picas) cada vez que vuelva a salir." },
      },
      {
        heading: { ko: "3. 남이 무늬가 떨어졌는지 기억하라", en: "3. Track who's void in what", ja: "3. 誰がどのスートをボイドか記憶する", zh: "3. 记住谁在哪门花色已无牌", fr: "3. Repérez qui n'a plus quelle couleur", es: "3. Recuerda quién se quedó sin qué palo" },
        body: { ko: "누군가 특정 무늬를 안 따라가고 다른 무늬를 낸 순간, 그 사람은 그 무늬가 없다는 뜻입니다. 이후 그 무늬를 리드하면 그 사람이 위험한 카드를 버릴 기회를 주게 되니, 상대의 보이드를 활용해 트릭을 조종하세요.", en: "The moment someone doesn't follow suit, you know they're void in it. Leading that suit again lets them dump a dangerous card freely — so track voids and use them to steer who wins each trick.", ja: "誰かがスートに従わなかった瞬間、そのスートがボイドだと分かります。以降そのスートをリードすると危険な札を捨てる機会を与えてしまうので、相手のボイドを把握してトリックの流れを操りましょう。", zh: "一旦有人没跟花色出牌，就说明他这门花色已空。之后再领这门花色，会让对方有机会安全弃掉危险牌——记住谁空了哪门，借此操控每墩的走向。", fr: "Dès que quelqu'un ne suit pas la couleur, vous savez qu'il en est vide. Remener cette couleur lui permet de défausser librement une carte dangereuse — repérez les vides pour orienter qui remporte chaque pli.", es: "En cuanto alguien no sigue el palo, sabes que se quedó sin él. Volver a jugar ese palo le permite descartar libremente una carta peligrosa: rastrea quién se quedó sin qué palo y úsalo para dirigir quién gana cada baza." },
      },
      {
        heading: { ko: "4. 마지막 몇 트릭은 정확히 계산하라", en: "4. Count exactly in the endgame", ja: "4. 終盤は正確に数え切る", zh: "4. 残局要精确计算", fr: "4. Comptez précisément en fin de manche", es: "4. Calcula con precisión en el final de la ronda" },
        body: { ko: "라운드 막바지에는 각자 손에 남은 카드가 몇 장 안 되므로, 누가 어떤 무늬를 몇 장 들고 있는지 거의 확정적으로 계산할 수 있습니다. 이 시점부터는 추측이 아니라 계산으로 플레이하세요.", en: "By the last few tricks, so few cards remain that you can often calculate exactly what everyone is holding. From this point, play by calculation, not by feel.", ja: "終盤は残り札が少ないため、誰が何をどれだけ持っているかほぼ確定的に計算できます。この段階からは勘ではなく計算でプレイしましょう。", zh: "到最后几墩时剩牌很少，几乎可以精确算出每人手里还有什么牌。此时应靠计算而非直觉出牌。", fr: "Dans les derniers plis, si peu de cartes restent que vous pouvez souvent calculer exactement ce que chacun détient. À ce stade, jouez au calcul, pas au feeling.", es: "En las últimas bazas quedan tan pocas cartas que a menudo puedes calcular con exactitud qué tiene cada uno. Desde ese punto, juega por cálculo, no por intuición." },
      },
      {
        heading: { ko: "5. 확실할 때만 '달 쏘기'를 노려라", en: "5. Only attempt to shoot the moon when you're sure", ja: "5. 確信がある時だけシュート・ザ・ムーンを狙う", zh: "5. 只有十拿九稳时才尝试“全收”", fr: "5. Ne tentez le « grand chelem » qu'en étant sûr", es: "5. Solo intenta el «disparo a la luna» cuando estés seguro" },
        body: { ko: "하트와 스페이드 퀸을 전부 가져오면(26점) 자신은 0점, 나머지 전원이 26점을 받습니다. 성공하면 강력하지만, 중간에 실패하면 스스로 대부분의 벌점을 뒤집어씁니다. 초반 손패에 하이 카드가 충분히 몰려 있을 때만 시도하세요.", en: "Capturing every heart and the Queen of Spades (26 points) gives you 0 and everyone else 26. It's devastating when it works, but a failed attempt usually means you eat most of the penalty yourself. Only go for it when your opening hand is genuinely loaded with high cards.", ja: "全てのハートとスペードQ(26点)を取ると自分は0点、他全員が26点になります。成功すれば強力ですが、失敗すると自分がほとんどの罰点を被ります。序盤の手札に高い札が十分揃っている時だけ狙いましょう。", zh: "收齐所有红心和黑桃Q(26分)会让自己得0分、其他人各得26分。成功威力巨大，但一旦失败大部分罚分都会落在自己头上。只有起手牌大牌足够多时才该尝试。", fr: "Prendre tous les cœurs et la dame de pique (26 points) vous donne 0 et 26 aux autres. Dévastateur en cas de réussite, mais un échec vous laisse porter l'essentiel de la pénalité. Ne tentez qu'avec une main d'ouverture vraiment riche en grosses cartes.", es: "Llevarte todos los corazones y la reina de picas (26 puntos) te da 0 y 26 a los demás. Devastador si funciona, pero si falla cargas tú con la mayor parte de la penalización. Inténtalo solo con una mano inicial realmente cargada de cartas altas." },
      },
    ],
    mistakes: {
      ko: ["스페이드 퀸을 너무 오래 들고 있다가 마지막에 걸린다", "보이드를 만들 기회를 놓치고 계속 무늬를 따라간다", "남들의 보이드를 기억하지 않고 무작정 리드한다", "승산 없는 달 쏘기를 시도하다 벌점을 자초한다"],
      en: ["Holding the Queen of Spades too long and getting caught with it at the end", "Missing chances to void a short suit and following suit out of habit instead", "Leading suits without tracking who's already void in them", "Attempting a moonshot with a weak hand and eating the penalty instead"],
      ja: ["スペードQを長く持ちすぎて最後に捕まる", "短いスートをボイドにする機会を逃し習慣で従い続ける", "誰がボイドか把握せずにスートをリードする", "勝算のない手でシュート・ザ・ムーンを狙い自ら罰点を被る"],
      zh: ["黑桃Q拖得太久，最后被迫收下", "错过清空短花色的机会，习惯性跟牌", "不记录谁已空门就贸然领出该花色", "手牌不够强却硬要尝试全收，反而自食罚分"],
      fr: ["Garder la dame de pique trop longtemps et se faire prendre à la fin", "Rater l'occasion de se vider d'une couleur courte par habitude", "Mener une couleur sans savoir qui en est déjà vide", "Tenter un grand chelem avec une main faible et subir la pénalité"],
      es: ["Guardar la reina de picas demasiado tiempo y quedarte con ella al final", "Perder la ocasión de quedarte sin un palo corto por seguir la costumbre", "Jugar un palo sin saber quién ya se quedó sin él", "Intentar un disparo a la luna con una mano débil y cargar con la penalización"],
    },
  },

  "texas-holdem": {
    slug: "texas-holdem",
    title: {
      ko: "텍사스 홀덤 족보 읽기 — 최선의 5장과 아웃츠",
      en: "Texas Hold'em Hand Reading — Best Five Cards and Outs",
      ja: "テキサスホールデムの役読み — 最善の5枚とアウツ",
      zh: "德州扑克牌型阅读 — 最佳五张与补牌",
      fr: "Lire une main de Texas Hold'em — cinq meilleures cartes et outs",
      es: "Lectura de manos de Texas Hold'em — mejores cinco cartas y outs",
    },
    intro: {
      ko: "이 학습기는 베팅 없이 두 장의 홀 카드와 다섯 장의 커뮤니티 카드에서 가장 강한 5장을 찾는 연습에 집중합니다. 각 스트리트에서 족보가 어떻게 바뀌는지 확인하세요.",
      en: "This no-betting trainer focuses on finding the strongest five-card hand from two hole cards and five community cards. Watch how that hand changes on each street.",
      ja: "このベットなし練習では、2枚のホールカードと5枚のコミュニティカードから最強の5枚を見つけます。各ストリートで役がどう変化するか確認しましょう。",
      zh: "这个无下注训练器专注于从两张底牌和五张公共牌中找出最强五张。观察每个阶段牌型如何变化。",
      fr: "Cet exercice sans mise consiste à trouver la meilleure main de cinq cartes parmi deux cartes privées et cinq communes. Observez son évolution à chaque street.",
      es: "Este entrenador sin apuestas se centra en hallar la mejor mano de cinco cartas entre dos privadas y cinco comunitarias. Observa cómo cambia en cada calle.",
    },
    variantNote: {
      ko: "적용 범위: OIYO는 칩·블라인드·베팅·포지션이 없는 헤드업 족보 학습기입니다. 무료로 플랍·턴·리버를 공개하고 최선의 5장을 비교하므로, 실제 포커의 베팅 전략·팟 오즈·뱅크롤 조언을 제공하지 않습니다. 폴드는 자기 판단 연습 버튼일 뿐 비용상 이점이 없습니다.",
      en: "Variant scope: OIYO is a heads-up hand-reading trainer with no chips, blinds, betting, or position. Streets reveal for free and compare the best five cards, so this guide does not teach betting strategy, pot odds, or bankroll play. Fold is only a self-check and has no cost advantage here.",
      ja: "適用範囲: OIYO版はチップ、ブラインド、ベット、ポジションのないヘッズアップ役読み練習です。各ストリートは無料で公開され最善の5枚を比較するため、実戦のベット戦略、ポットオッズ、資金管理は扱いません。フォールドは自己判断の練習で、費用上の利点はありません。",
      zh: "适用范围：OIYO是无筹码、盲注、下注和位置的单挑牌型阅读训练器。各阶段免费揭牌并比较最佳五张，因此不教授真实扑克的下注策略、底池赔率或资金管理。弃牌仅用于自我判断练习，在这里没有成本优势。",
      fr: "Portée de la variante : OIYO est un exercice de lecture des mains en tête-à-tête, sans jetons, blindes, mises ni position. Les streets sont gratuites et comparent les cinq meilleures cartes ; le guide n'enseigne donc ni mises, ni cote du pot, ni gestion de bankroll. Se coucher est seulement un auto-test, sans avantage de coût ici.",
      es: "Alcance de la variante: OIYO es un entrenador de lectura de manos cara a cara, sin fichas, ciegas, apuestas ni posición. Las calles se revelan gratis y se comparan las mejores cinco cartas; no enseña apuestas, pot odds ni gestión de banca. Retirarse es solo una autoevaluación y aquí no ofrece ventaja de coste.",
    },
    sources: [
      { label: "2026 WSOP Official Tournament Rules", href: "https://assets.wsopcdn.com/wsop/1a72ba28-781c-409d-a9c3-5ca13c4c5718.pdf" },
      { label: "Pagat — Texas Hold'em rules", href: "https://www.pagat.com/poker/variants/texasholdem.html" },
    ],
    tips: [
      {
        heading: { ko: "1. 족보와 동률 비교 순서를 익혀라", en: "1. Learn hand categories and tie-breaks", ja: "1. 役と同役の比較順を覚える", zh: "1. 熟悉牌型和同型比较", fr: "1. Apprenez les catégories et les départages", es: "1. Aprende las categorías y los desempates" },
        body: { ko: "스트레이트 플러시부터 하이카드까지 순서를 익히고, 같은 족보끼리는 어떤 숫자를 먼저 비교하는지 확인하세요. 예를 들어 원페어는 페어 숫자를 먼저, 그다음 남은 높은 카드(키커)를 차례로 비교합니다.", en: "Learn the order from straight flush down to high card, then how equal categories break ties. With one pair, compare the pair rank first and then the remaining high cards (kickers) in order.", ja: "ストレートフラッシュからハイカードまでの順序と、同じ役の比較方法を覚えます。ワンペアならペアのランクを先に、その後キッカーを高い順に比べます。", zh: "熟悉从同花顺到高牌的顺序，以及同牌型如何决胜。例如一对先比较对子点数，再依次比较剩余高牌（踢脚牌）。", fr: "Mémorisez l'ordre de la quinte flush à la carte haute, puis les départages à catégorie égale. Pour une paire, comparez d'abord son rang, puis les kickers du plus haut au plus bas.", es: "Aprende el orden desde escalera de color hasta carta alta y cómo se desempata la misma categoría. Con una pareja, compara primero su rango y después los kickers de mayor a menor." },
      },
      {
        heading: { ko: "2. 일곱 장 중 최선의 다섯 장만 센다", en: "2. Use only the best five of seven", ja: "2. 7枚中最善の5枚だけを使う", zh: "2. 七张中只取最佳五张", fr: "2. Ne gardez que les cinq meilleures sur sept", es: "2. Usa solo las mejores cinco de siete" },
        body: { ko: "홀 카드 두 장을 반드시 모두 쓰는 것이 아닙니다. 한 장만 쓰거나, 커뮤니티 카드 다섯 장이 더 강하면 홀 카드를 하나도 쓰지 않을 수도 있습니다. 결과에서 강조되는 최선의 5장을 확인하세요.", en: "You do not have to use both hole cards. The best hand may use one, or none when the five-card board is stronger. Check the five cards highlighted in the result.", ja: "ホールカード2枚を必ず両方使うわけではありません。1枚だけ、またはボード5枚の方が強ければ0枚の場合もあります。結果で強調される最善の5枚を確認してください。", zh: "不必同时使用两张底牌。最佳牌可能只用一张；若公共牌五张更强，也可能一张都不用。请查看结果中高亮的最佳五张。", fr: "Vous n'êtes pas obligé d'utiliser vos deux cartes privées. La meilleure main peut en utiliser une, voire aucune si les cinq cartes du board sont supérieures. Regardez les cinq cartes mises en évidence au résultat.", es: "No tienes que usar las dos cartas privadas. La mejor mano puede usar una o ninguna si las cinco comunitarias son superiores. Revisa las cinco cartas resaltadas en el resultado." },
      },
      {
        heading: { ko: "3. 아웃츠를 세어 확률을 가늠하라", en: "3. Count outs to gauge your odds", ja: "3. アウツを数えて確率を把握する", zh: "3. 数出牌来估算胜率", fr: "3. Comptez vos outs pour évaluer vos chances", es: "3. Cuenta tus outs para calcular tus probabilidades" },
        body: { ko: "'아웃츠'는 원하는 족보를 완성할 수 있는 보이지 않은 카드입니다. 플랍에서 9아웃이면 다음 한 장(턴)에 맞을 확률은 9/47, 약 19%이고 턴 또는 리버 중 한 번 이상 맞을 확률은 약 35%입니다. 상대 홀 카드는 보이지 않으므로 모든 아웃이 실제 승리를 보장하지는 않습니다.", en: "'Outs' are unseen cards that can complete the hand you are drawing to. With 9 outs on the flop, the chance on the next card is 9/47, about 19%; the chance of hitting by either turn or river is about 35%. Hidden opponent cards mean not every apparent out guarantees a win.", ja: "「アウツ」は狙う役を完成させる未見のカードです。フロップで9アウツなら次の1枚で当たる確率は9/47、約19%、ターンかリバーまでに1回以上当たる確率は約35%です。相手の札は見えないため、見かけのアウツ全てが勝利を保証するわけではありません。", zh: "“补牌”是能完成目标牌型的未见牌。翻牌后有9张补牌时，下一张命中概率为9/47，约19%；在转牌或河牌至少命中一次约为35%。对手底牌不可见，因此看似有效的补牌不一定保证获胜。", fr: "Les « outs » sont les cartes invisibles qui peuvent compléter votre tirage. Avec 9 outs au flop, la prochaine carte réussit dans 9/47 des cas, soit environ 19 % ; toucher au turn ou à la river vaut environ 35 %. Les cartes adverses cachées font qu'un out apparent ne garantit pas la victoire.", es: "Los «outs» son cartas no vistas que completan tu proyecto. Con 9 outs en el flop, la siguiente carta acierta 9/47, cerca del 19 %; acertar en turn o river ronda el 35 %. Las cartas ocultas del rival hacen que un out aparente no garantice ganar." },
      },
      {
        heading: { ko: "4. 보드가 위험해지면 핸드를 다시 평가하라", en: "4. Re-evaluate when the board gets scary", ja: "4. ボードが危険になったらハンドを見直す", zh: "4. 牌面变危险时重新评估手牌", fr: "4. Réévaluez votre main quand le board devient dangereux", es: "4. Reevalúa tu mano cuando el board se vuelve peligroso" },
        body: { ko: "커뮤니티 카드에 같은 무늬 3장이 뜨거나 스트레이트가 이어지는 순간, 방금까지 강했던 핸드(예: 탑 페어)가 순식간에 약해질 수 있습니다. 매 스트리트마다 보드를 다시 읽는 습관을 들이세요.", en: "The moment three cards of one suit or a run toward a straight land on the board, a hand that was strong a moment ago (like top pair) can suddenly be behind. Re-read the board fresh at every street.", ja: "コミュニティカードに同じスート3枚やストレートに繋がる並びが出た瞬間、直前まで強かったハンド(トップペアなど)が一気に劣勢になり得ます。各ストリートごとにボードを読み直す習慣をつけましょう。", zh: "一旦公共牌出现三张同花或连续顺子牌型，刚才还很强的牌（如顶对）可能瞬间落后。养成每条街都重新读牌面的习惯。", fr: "Dès que trois cartes de la même couleur ou une suite vers une quinte apparaissent, une main forte l'instant d'avant (comme une top paire) peut soudain être menée. Relisez le board à chaque street.", es: "En cuanto salen tres cartas del mismo palo o una racha hacia una escalera, una mano que era fuerte hace un momento (como pareja alta) puede quedar de repente por detrás. Vuelve a leer el board en cada calle." },
      },
    ],
    mistakes: {
      ko: ["홀 카드 두 장을 항상 모두 써야 한다고 생각한다", "다음 한 장 확률과 턴·리버 누적 확률을 혼동한다", "보드가 바뀌어도 이전 스트리트의 족보 평가를 유지한다", "베팅이 없는 이 학습기의 폴드를 실제 팟 오즈 결정처럼 해석한다"],
      en: ["Assuming both hole cards must always be used", "Confusing next-card probability with the combined turn-or-river chance", "Keeping the prior street's hand reading after the board changes", "Treating this no-betting trainer's Fold button as a real pot-odds decision"],
      ja: ["ホールカード2枚を必ず両方使うと思う", "次の1枚の確率とターン・リバー累積確率を混同する", "ボードが変わっても前ストリートの評価に固執する", "ベットなし練習のフォールドを実戦のポットオッズ判断とみなす"],
      zh: ["认为两张底牌必须全部使用", "混淆下一张概率与转牌或河牌累计概率", "公共牌变化后仍沿用上一阶段的牌型判断", "把无下注训练器的弃牌按钮当成真实底池赔率决策"],
      fr: ["Croire qu'il faut toujours utiliser les deux cartes privées", "Confondre la probabilité de la prochaine carte avec celle cumulée turn-ou-river", "Conserver la lecture de la street précédente après un changement du board", "Traiter le bouton Se coucher sans mise comme une décision réelle de cote du pot"],
      es: ["Creer que siempre deben usarse las dos cartas privadas", "Confundir la probabilidad de la siguiente carta con la acumulada turn-o-river", "Mantener la lectura de la calle anterior tras cambiar el board", "Tratar el botón Retirarse sin apuestas como una decisión real de pot odds"],
    },
  },
};
