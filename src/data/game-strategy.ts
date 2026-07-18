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
      ko: "클론다이크는 무작위 배치의 약 80%만 이론상 클리어 가능하지만, 실제 승률은 순서를 어떻게 두느냐에 크게 좌우됩니다. 아래 전략은 카드를 아무렇게나 옮기는 습관을 체계적인 순서로 바꿔줍니다.",
      en: "Only about 80% of random Klondike deals are theoretically winnable, but your actual win rate depends heavily on move order. These strategies turn haphazard card-moving into a systematic approach.",
      ja: "クロンダイクは理論上クリア可能な配牌が約8割ですが、実際の勝率は手順次第で大きく変わります。以下の戦略は行き当たりばったりの操作を体系的な手順に変えます。",
      zh: "理论上只有约80%的克朗代克随机牌局可解，但实际胜率很大程度取决于出牌顺序。以下策略能把随意移牌变成有条理的打法。",
      fr: "Seuls environ 80 % des donnes Klondike aléatoires sont théoriquement gagnables, mais votre taux de victoire réel dépend surtout de l'ordre des coups. Ces stratégies transforment des mouvements au hasard en méthode.",
      es: "Solo cerca del 80 % de las partidas aleatorias de Klondike son teóricamente ganables, pero tu tasa de victoria real depende sobre todo del orden de tus movimientos. Estas estrategias convierten el azar en un método.",
    },
    tips: [
      {
        heading: { ko: "1. 스톡을 넘기기 전에 테이블로부터 먼저 살펴라", en: "1. Exhaust tableau moves before flipping the stock", ja: "1. 山札をめくる前に場札を確認する", zh: "1. 翻牌库前先检查牌桌区", fr: "1. Épuisez les coups du tableau avant de piocher", es: "1. Agota los movimientos del tablero antes de robar del mazo" },
        body: { ko: "스톡을 넘기면 그 카드들의 순서가 고정되어 나중에 되돌릴 수 없습니다. 테이블로 안에서 할 수 있는 이동을 전부 마친 뒤에만 스톡을 넘기세요.", en: "Flipping the stock locks those cards into a fixed order you can't rearrange later. Only draw from the stock once every safe tableau move is used up.", ja: "山札をめくるとその順序が固定され後で変えられません。場札内でできる移動を全て終えてから山札をめくりましょう。", zh: "翻开牌库会把那些牌的顺序固定，之后无法调整。用尽牌桌区所有安全的移动后再翻牌库。", fr: "Piocher fige l'ordre des cartes de la pioche, impossible à réarranger. Ne piochez qu'une fois tous les coups sûrs du tableau épuisés.", es: "Robar del mazo fija el orden de esas cartas, que ya no podrás reordenar. Solo roba del mazo cuando hayas agotado todos los movimientos seguros del tablero." },
      },
      {
        heading: { ko: "2. 파운데이션으로 너무 일찍 카드를 보내지 마라", en: "2. Don't rush cards to the foundations", ja: "2. 組札へ急いでカードを送らない", zh: "2. 别急着把牌送去基础堆", fr: "2. Ne montez pas les cartes trop vite vers les fondations", es: "2. No subas las cartas demasiado pronto a las bases" },
        body: { ko: "낮은 숫자 카드를 파운데이션에 너무 일찍 올리면, 테이블로에서 색을 교차해 쌓아야 할 때 그 카드가 없어서 막힙니다. 특히 2~4는 필요할 때까지 테이블로에 남겨두는 것이 안전합니다.", en: "Sending low cards to the foundation too early can strand you later when the tableau needs that exact card to continue an alternating-color sequence. Keep 2s through 4s in the tableau until you actually need to move them up.", ja: "低い数字を早く組札に送ると、場札で色違いの並びを続けるためにその札が必要になった時に詰まります。2〜4は必要になるまで場札に残すのが安全です。", zh: "过早把小牌送进基础堆，日后牌桌区需要用它延续红黑交替序列时就会卡住。2到4的牌最好留在牌桌区，直到真正需要时再移上去。", fr: "Monter trop tôt les petites cartes peut vous bloquer quand le tableau a besoin de cette carte pour continuer une séquence alternée. Gardez les 2 à 4 dans le tableau jusqu'au besoin réel.", es: "Subir cartas bajas demasiado pronto puede dejarte atascado cuando el tablero necesite esa carta para continuar una secuencia de colores alternos. Conserva los 2 al 4 en el tablero hasta que realmente los necesites." },
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
      ko: ["에이스·2를 보이는 즉시 무조건 파운데이션으로 보낸다(테이블로 진행을 막을 수 있음)", "빈 열을 아무 카드로나 채운다", "뒤집을 카드가 남은 열을 뒤로 미룬다", "한 번 스톡을 넘겨보고 안 풀리면 바로 새 게임을 시작한다"],
      en: ["Sending every ace/2 to the foundation the instant it appears, even when it blocks tableau progress", "Filling an empty column with whatever's on top instead of saving it for a king", "Leaving columns with face-down cards for later", "Giving up after one stock cycle instead of running through it again as the board changes"],
      ja: ["エース・2が出た瞬間に必ず組札へ送る(場札の進行を止めることがある)", "空いた列を手近な札で埋めてしまう", "裏向きの札が残る列を後回しにする", "山札を一周しただけで詰んだと諦め新しいゲームを始める"],
      zh: ["A、2一出现就立刻送去基础堆(可能阻碍牌桌区进展)", "空列被随便一张牌填满", "把还有暗牌的列往后拖", "翻一轮牌库没解开就直接开新局"],
      fr: ["Monter systématiquement l'as/le 2 dès qu'il apparaît, même si cela bloque le tableau", "Remplir une colonne vide avec la première carte venue au lieu de la garder pour un roi", "Repousser les colonnes qui ont encore des cartes cachées", "Abandonner après un seul passage de la pioche"],
      es: ["Subir el as/2 a la base en cuanto aparece, aunque bloquee el progreso del tablero", "Llenar una columna vacía con lo primero a mano en vez de reservarla para un rey", "Dejar para después las columnas con cartas boca abajo", "Rendirte tras un solo repaso del mazo"],
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
    tips: [
      {
        heading: { ko: "1. '1-1 패턴'을 찾아라", en: "1. Spot the 1-1 pattern", ja: "1. 「1-1パターン」を見つける", zh: "1. 找出“1-1模式”", fr: "1. Repérez le motif « 1-1 »", es: "1. Detecta el patrón «1-1»" },
        body: { ko: "숫자 1이 미공개 칸 2개만 접하고 있고, 그 중 1개가 다른 숫자 1과도 겹쳐 접해 있다면, 겹치지 않는 나머지 칸은 안전합니다 — 각 1이 정확히 지뢰 하나씩만 가리키기 때문입니다.", en: "If a '1' touches exactly two unopened cells and shares one of them with another '1', the non-shared cell of each is safe — each 1 accounts for exactly one mine, and they can't both be pointing at the shared cell alone.", ja: "1が未開のマス2つに接し、その1つが別の1とも重なっている場合、重ならない側のマスは安全です — 各1がちょうど1つの地雷を示すためです。", zh: "如果一个“1”只接触两个未开格，其中一个与另一个“1”共享，那么各自不共享的那格是安全的——因为每个1恰好只指向一颗地雷。", fr: "Si un « 1 » touche exactement deux cases fermées et en partage une avec un autre « 1 », la case non partagée de chacun est sûre — chaque 1 ne pointe que sur une seule mine.", es: "Si un «1» toca exactamente dos casillas cerradas y comparte una con otro «1», la casilla no compartida de cada uno es segura: cada 1 solo señala una mina." },
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
        body: { ko: "가끔은 순수 논리만으로 풀리지 않는 판도 있습니다. 이때는 아직 어떤 숫자와도 접하지 않은 칸(정보가 전혀 없는 칸)이 인접 숫자로 지뢰 확률이 계산되는 칸보다 대체로 더 안전합니다.", en: "Some boards genuinely can't be solved by pure logic alone. When that happens, an unopened cell with no adjacent numbers at all is usually safer than one where you can calculate even a modest mine probability from a nearby clue.", ja: "純粋な論理だけでは解けない盤面も実際にあります。その場合、隣接する数字が全くない未開マスは、近くの手がかりから地雷確率を計算できるマスより概ね安全です。", zh: "有些棋盘确实无法仅凭纯逻辑解开。这时，完全没有相邻数字线索的未开格，通常比能从附近线索算出雷概率的格子更安全。", fr: "Certaines grilles ne se résolvent vraiment pas par la seule logique. Dans ce cas, une case fermée sans aucun chiffre adjacent est généralement plus sûre qu'une case dont on peut calculer une probabilité de mine, même faible.", es: "Algunos tableros de verdad no se resuelven solo con lógica. En ese caso, una casilla cerrada sin ningún número adyacente suele ser más segura que una en la que puedas calcular aunque sea una probabilidad modesta de mina." },
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
      ko: "텍사스 홀덤 기본 전략 — 핸드 선택과 포지션",
      en: "Texas Hold'em Strategy — Starting Hands and Position",
      ja: "テキサスホールデム基本戦略 — ハンド選択とポジション",
      zh: "德州扑克基础策略 — 起手牌选择与位置",
      fr: "Stratégie de base au Texas Hold'em — mains de départ et position",
      es: "Estrategia básica de Texas Hold'em — manos iniciales y posición",
    },
    intro: {
      ko: "이 게임은 베팅 없는 학습용이지만, 어떤 핸드가 강하고 어떤 상황에서 접어야 하는지는 실제 포커와 동일한 원리를 따릅니다. 아래는 초심자가 가장 먼저 익혀야 할 원칙입니다.",
      en: "This is a no-betting learning mode, but which hands are strong and when to fold follow the same principles as real poker. Here's what beginners should learn first.",
      ja: "このゲームはベットなしの学習モードですが、どのハンドが強く、いつフォールドすべきかは実際のポーカーと同じ原則に従います。初心者がまず学ぶべき原則です。",
      zh: "这是无下注的学习模式，但哪些起手牌强、何时该弃牌，遵循与真实扑克相同的原理。以下是初学者应最先掌握的原则。",
      fr: "Ce mode d'apprentissage n'a pas de mise, mais la force des mains et le moment de se coucher suivent les mêmes principes que le vrai poker. Voici ce qu'un débutant doit apprendre en premier.",
      es: "Este es un modo de aprendizaje sin apuestas, pero qué manos son fuertes y cuándo retirarse siguen los mismos principios que el póker real. Esto es lo primero que debe aprender un principiante.",
    },
    tips: [
      {
        heading: { ko: "1. 시작 핸드의 순위를 익혀라", en: "1. Learn starting-hand strength", ja: "1. スターティングハンドの強さを覚える", zh: "1. 熟记起手牌强弱", fr: "1. Apprenez la force des mains de départ", es: "1. Aprende la fuerza de las manos iniciales" },
        body: { ko: "같은 무늬 에이스-킹, 페어(특히 10 이상)처럼 강한 핸드로만 적극적으로 플레이하는 습관을 들이세요. 7-2처럼 서로 무늬도 다르고 순위 차이도 큰 핸드는 대부분의 상황에서 접는 게 정답입니다.", en: "Get in the habit of playing aggressively only with strong hands — suited ace-king, high pairs (tens or better). Something like an offsuit 7-2, with a big rank gap and no suit match, is a fold in almost every situation.", ja: "スート同じA-K、ペア(特に10以上)のような強いハンドの時だけ積極的にプレイする習慣をつけましょう。オフスートの7-2のようにランク差が大きくスートも合わないハンドは、ほとんどの場面でフォールドが正解です。", zh: "养成只用强牌（同花A-K、对子尤其是10以上）积极出牌的习惯。像不同花色的7-2这种牌力差距大又不同花色的牌，几乎所有情况下都该弃牌。", fr: "Prenez l'habitude de jouer activement seulement avec des mains fortes — as-roi assortis, grosses paires (dix ou plus). Un 7-2 dépareillé, avec un grand écart de rang, se couche presque toujours.", es: "Acostúmbrate a jugar de forma activa solo con manos fuertes: as-rey del mismo palo, parejas altas (dieces o más). Algo como un 7-2 descartado, con gran diferencia de rango, se retira casi siempre." },
      },
      {
        heading: { ko: "2. 포지션이 핸드 가치를 바꾼다", en: "2. Position changes what a hand is worth", ja: "2. ポジションでハンドの価値が変わる", zh: "2. 位置会改变牌力的价值", fr: "2. La position change la valeur d'une main", es: "2. La posición cambia el valor de una mano" },
        body: { ko: "상대가 먼저 행동한 뒤에 결정할 수 있는 '늦은 포지션'에서는 더 많은 정보를 갖고 플레이하므로 약간 약한 핸드도 가치가 올라갑니다. 먼저 행동해야 하는 '이른 포지션'에서는 확실히 강한 핸드만 플레이하세요.", en: "Acting after your opponent (late position) means you decide with more information, so a slightly weaker hand gains value there. Acting first (early position) means you should stick to clearly strong hands only.", ja: "相手より後に行動する「レイトポジション」では、より多くの情報を持って判断できるため、やや弱いハンドでも価値が上がります。先に行動する「アーリーポジション」では、明確に強いハンドだけをプレイしましょう。", zh: "在对手先行动后再决定的“后位”，你能掌握更多信息，稍弱的牌也更有价值。而必须先行动的“前位”，只应出明显强的牌。", fr: "Agir après l'adversaire (position tardive) signifie décider avec plus d'informations, ce qui valorise une main un peu plus faible. Agir en premier (position précoce) signifie s'en tenir aux mains clairement fortes.", es: "Actuar después del rival (posición tardía) significa decidir con más información, lo que da valor a una mano algo más débil. Actuar primero (posición temprana) significa ceñirse solo a manos claramente fuertes." },
      },
      {
        heading: { ko: "3. 아웃츠를 세어 확률을 가늠하라", en: "3. Count outs to gauge your odds", ja: "3. アウツを数えて確率を把握する", zh: "3. 数出牌来估算胜率", fr: "3. Comptez vos outs pour évaluer vos chances", es: "3. Cuenta tus outs para calcular tus probabilidades" },
        body: { ko: "'아웃츠'는 내 핸드를 완성시켜줄 남은 카드 수입니다. 플랍 이후 아웃츠가 8~9장(예: 오픈 스트레이트 드로우)이면 턴에서 맞을 확률이 대략 3분의 1 정도입니다. 아웃츠가 적다면 계속 따라가는 비용을 신중히 따지세요.", en: "'Outs' are the remaining cards that complete your hand. After the flop, roughly 8-9 outs (like an open-ended straight draw) gives you about a one-in-three shot on the turn. With few outs, weigh carefully whether it's worth continuing.", ja: "「アウツ」はハンドを完成させる残りの札の数です。フロップ後にアウツが8〜9枚(オープンエンドのストレートドローなど)あれば、ターンで完成する確率はおよそ3分の1です。アウツが少なければ続けるコストを慎重に考えましょう。", zh: "“出牌”是能让你成牌的剩余牌数。翻牌后若出牌数有8到9张（如两头顺子听牌），转牌命中概率约为三分之一。出牌数少时，要谨慎权衡是否值得继续跟注。", fr: "Les « outs » sont les cartes restantes qui complètent votre main. Après le flop, environ 8-9 outs (comme un tirage quinte ouvert) donnent près d'une chance sur trois au turn. Avec peu d'outs, pesez soigneusement l'intérêt de continuer.", es: "Los «outs» son las cartas restantes que completan tu mano. Tras el flop, unos 8-9 outs (como un proyecto de escalera abierta) te dan cerca de una probabilidad entre tres en el turn. Con pocos outs, sopesa con cuidado si vale la pena seguir." },
      },
      {
        heading: { ko: "4. 보드가 위험해지면 핸드를 다시 평가하라", en: "4. Re-evaluate when the board gets scary", ja: "4. ボードが危険になったらハンドを見直す", zh: "4. 牌面变危险时重新评估手牌", fr: "4. Réévaluez votre main quand le board devient dangereux", es: "4. Reevalúa tu mano cuando el board se vuelve peligroso" },
        body: { ko: "커뮤니티 카드에 같은 무늬 3장이 뜨거나 스트레이트가 이어지는 순간, 방금까지 강했던 핸드(예: 탑 페어)가 순식간에 약해질 수 있습니다. 매 스트리트마다 보드를 다시 읽는 습관을 들이세요.", en: "The moment three cards of one suit or a run toward a straight land on the board, a hand that was strong a moment ago (like top pair) can suddenly be behind. Re-read the board fresh at every street.", ja: "コミュニティカードに同じスート3枚やストレートに繋がる並びが出た瞬間、直前まで強かったハンド(トップペアなど)が一気に劣勢になり得ます。各ストリートごとにボードを読み直す習慣をつけましょう。", zh: "一旦公共牌出现三张同花或连续顺子牌型，刚才还很强的牌（如顶对）可能瞬间落后。养成每条街都重新读牌面的习惯。", fr: "Dès que trois cartes de la même couleur ou une suite vers une quinte apparaissent, une main forte l'instant d'avant (comme une top paire) peut soudain être menée. Relisez le board à chaque street.", es: "En cuanto salen tres cartas del mismo palo o una racha hacia una escalera, una mano que era fuerte hace un momento (como pareja alta) puede quedar de repente por detrás. Vuelve a leer el board en cada calle." },
      },
    ],
    mistakes: {
      ko: ["약한 핸드로 이른 포지션에서 계속 참여한다", "아웃츠를 세지 않고 감으로 계속 따라간다", "보드가 위험해져도 처음 핸드 평가를 그대로 유지한다", "포지션을 고려하지 않고 모든 자리에서 같은 기준으로 플레이한다"],
      en: ["Continuing with weak hands from early position", "Calling on instinct without counting outs", "Sticking with your original hand read even after the board turns dangerous", "Playing the same starting-hand standard regardless of position"],
      ja: ["アーリーポジションで弱いハンドを続ける", "アウツを数えず勘でコールし続ける", "ボードが危険になっても最初のハンド評価に固執する", "ポジションを考慮せず全ての席で同じ基準でプレイする"],
      zh: ["前位仍继续跟着弱牌打", "不数出牌数就凭感觉跟注", "牌面变危险后仍固守最初的手牌判断", "不考虑位置，所有座位都用同一标准出牌"],
      fr: ["Continuer avec des mains faibles en position précoce", "Suivre à l'instinct sans compter les outs", "S'accrocher à sa lecture initiale même quand le board devient dangereux", "Jouer le même standard de main de départ quelle que soit la position"],
      es: ["Seguir con manos débiles desde posición temprana", "Pagar por instinto sin contar los outs", "Aferrarte a tu lectura inicial aunque el board se vuelva peligroso", "Jugar el mismo estándar de mano inicial sin importar la posición"],
    },
  },
};
