import type { Locale } from "../i18n";

export interface GameRecommendation {
  slug: string;
  title: string;
  emoji: string;
  href: string;
  cat: string;
}

export interface CatalogEntry {
  emoji: string;
  cat: string;
  name: Record<Locale, string>;
}

export const CATALOG_GAMES: Record<string, CatalogEntry> = {
  "chess": { emoji: "♟️", cat: "board", name: {"ko":"체스","en":"Chess","ja":"チェス","zh":"国际象棋","fr":"Échecs","es":"Ajedrez"} },
  "checkers": { emoji: "🟤", cat: "board", name: {"ko":"체커","en":"Checkers","ja":"チェッカー","zh":"西洋跳棋","fr":"Dames","es":"Damas"} },
  "gomoku": { emoji: "⚫", cat: "board", name: {"ko":"오목","en":"Gomoku","ja":"五目並べ","zh":"五子棋","fr":"Gomoku","es":"Gomoku"} },
  "janggi": { emoji: "♟️", cat: "board", name: {"ko":"장기","en":"Janggi","ja":"チャンギ","zh":"韩国象棋","fr":"Janggi","es":"Janggi"} },
  "connect-four": { emoji: "🔴", cat: "board", name: {"ko":"사목","en":"Connect Four","ja":"四目並べ","zh":"四子棋","fr":"Puissance 4","es":"Conecta 4"} },
  "dominoes": { emoji: "🎴", cat: "board", name: {"ko":"도미노","en":"Dominoes","ja":"ドミノ","zh":"多米诺","fr":"Dominos","es":"Dominó"} },
  "kingdomino": { emoji: "👑", cat: "board", name: {"ko":"킹도미노","en":"Kingdomino","ja":"キングドミノ","zh":"王国骨牌","fr":"Kingdomino","es":"Kingdomino"} },
  "mahjong": { emoji: "🀄", cat: "board", name: {"ko":"마작","en":"Mahjong","ja":"麻雀","zh":"麻将","fr":"Mahjong","es":"Mahjong"} },
  "hitori": { emoji: "🔲", cat: "board", name: {"ko":"히토리","en":"Hitori","ja":"ひとり","zh":"数织","fr":"Hitori","es":"Hitori"} },
  "tents-and-trees": { emoji: "⛺", cat: "board", name: {"ko":"텐트와 나무","en":"Tents & Trees","ja":"テントと木","zh":"帐篷与树","fr":"Tentes & arbres","es":"Tiendas y árboles"} },
  "blackjack": { emoji: "🃏", cat: "card", name: {"ko":"블랙잭","en":"Blackjack","ja":"ブラックジャック","zh":"二十一点","fr":"Blackjack","es":"Blackjack"} },
  "freecell": { emoji: "♠️", cat: "card", name: {"ko":"프리셀","en":"FreeCell","ja":"フリーセル","zh":"空当接龙","fr":"FreeCell","es":"FreeCell"} },
  "solitaire": { emoji: "♣️", cat: "card", name: {"ko":"솔리테어","en":"Solitaire","ja":"ソリティア","zh":"纸牌接龙","fr":"Solitaire","es":"Solitario"} },
  "hearts-game": { emoji: "♥️", cat: "card", name: {"ko":"하트","en":"Hearts","ja":"ハート","zh":"红心大战","fr":"Hearts","es":"Corazones"} },
  "tile-rummy": { emoji: "🟥", cat: "card", name: {"ko":"숫자 타일","en":"Number Tiles","ja":"数字タイル","zh":"数字牌","fr":"Tuiles chiffrées","es":"Fichas numéricas"} },
  "card-surge": { emoji: "🃏", cat: "card", name: {"ko":"카드 서지","en":"Card Surge","ja":"カードサージ","zh":"卡牌狂涌","fr":"Card Surge","es":"Card Surge"} },
  "domino-logic": { emoji: "🁣", cat: "puzzle", name: {"ko":"도미노 칸 맞추기","en":"Domino Cells","ja":"ドミノのマス","zh":"多米诺填格","fr":"Cases de dominos","es":"Casillas de dominó"} },
  "word-groups": { emoji: "🧩", cat: "puzzle", name: {"ko":"네 묶음","en":"Four Groups","ja":"四つのグループ","zh":"四组词","fr":"Quatre groupes","es":"Cuatro grupos"} },
  "sudoku": { emoji: "🔢", cat: "puzzle", name: {"ko":"스도쿠","en":"Sudoku","ja":"数独","zh":"数独","fr":"Sudoku","es":"Sudoku"} },
  "minesweeper": { emoji: "💣", cat: "puzzle", name: {"ko":"지뢰찾기","en":"Minesweeper","ja":"マインスイーパ","zh":"扫雷","fr":"Démineur","es":"Buscaminas"} },
  "water-sort": { emoji: "🧪", cat: "puzzle", name: {"ko":"물 정렬","en":"Water Sort","ja":"水ソート","zh":"水排序","fr":"Tri d'eau","es":"Ordenar agua"} },
  "light-up": { emoji: "💡", cat: "puzzle", name: {"ko":"라이트업","en":"Light Up","ja":"美術館","zh":"点灯","fr":"Light Up","es":"Light Up"} },
  "game-2048": { emoji: "🔟", cat: "puzzle", name: {"ko":"2048","en":"2048","ja":"2048","zh":"2048","fr":"2048","es":"2048"} },
  "wordle": { emoji: "🟩", cat: "puzzle", name: {"ko":"워들","en":"Wordle","ja":"ワードル","zh":"猜词","fr":"Wordle","es":"Wordle"} },
  "letter-swap": { emoji: "🔤", cat: "puzzle", name: {"ko":"글자 맞바꾸기","en":"Letter Swap","ja":"文字入れ替え","zh":"字母对调","fr":"Échange de lettres","es":"Cambio de letras"} },
  "blackout-courier": { emoji: "🔦", cat: "puzzle", name: {"ko":"정전 배달부","en":"Blackout Courier","ja":"停電の配達人","zh":"停电快递员","fr":"Coursier dans le noir","es":"Mensajero a oscuras"} },
  "omission-detective": { emoji: "🔍", cat: "puzzle", name: {"ko":"거짓말 탐정","en":"Omission Detective","ja":"省略の探偵","zh":"省略侦探","fr":"Détective des oublis","es":"Detective de omisiones"} },
  "delay-cursor": { emoji: "⏱️", cat: "puzzle", name: {"ko":"10초 후의 커서","en":"Ten-Second Cursor","ja":"10秒後のカーソル","zh":"十秒后的光标","fr":"Curseur à dix secondes","es":"Cursor de diez segundos"} },
  "untranslatable-creature": { emoji: "🐾", cat: "puzzle", name: {"ko":"번역 불가능한 생물","en":"Untranslatable Creature","ja":"翻訳できない生き物","zh":"无法翻译的生物","fr":"Créature intraduisible","es":"Criatura intraducible"} },
  "time-counsel": { emoji: "⚖️", cat: "puzzle", name: {"ko":"변호사 vs 시간","en":"Counsel Against Time","ja":"弁護士対時間","zh":"律师对时间","fr":"Avocat contre le temps","es":"Abogado contra el tiempo"} },
  "unseen-boss": { emoji: "🌑", cat: "puzzle", name: {"ko":"보이지 않는 보스","en":"Unseen Boss","ja":"見えないボス","zh":"看不见的首领","fr":"Boss invisible","es":"Jefe invisible"} },
  "one-button-civ": { emoji: "🔘", cat: "puzzle", name: {"ko":"버튼 하나짜리 문명","en":"One-Button Realm","ja":"ボタン一つの文明","zh":"一个按钮的文明","fr":"Civilisation à un bouton","es":"Civilización de un botón"} },
  "late-press": { emoji: "⏳", cat: "puzzle", name: {"ko":"기다림 경주","en":"Late Press","ja":"待ちの勝負","zh":"等待比赛","fr":"Course d'attente","es":"Carrera de espera"} },
  "ghost-composer": { emoji: "👻", cat: "puzzle", name: {"ko":"유령 작곡가","en":"Ghost Composer","ja":"幽霊の作曲家","zh":"幽灵作曲家","fr":"Compositeur fantôme","es":"Compositor fantasma"} },
  "firefly-choir": { emoji: "✨", cat: "puzzle", name: {"ko":"반딧불 합창단","en":"Firefly Choir","ja":"ホタルの合唱団","zh":"萤火虫合唱团","fr":"Chœur de lucioles","es":"Coro de luciérnagas"} },
  "patch-dungeon": { emoji: "📜", cat: "puzzle", name: {"ko":"패치노트 던전","en":"Patch Dungeon","ja":"パッチの迷宮","zh":"补丁地牢","fr":"Donjon des correctifs","es":"Mazmorra de parches"} },
  "line-surf": { emoji: "🌊", cat: "arcade", name: {"ko":"파도 서퍼","en":"Line Surf","ja":"ラインサーフ","zh":"划线冲浪","fr":"Surf de ligne","es":"Surf de un trazo"} },
  "last-pixel": { emoji: "🟪", cat: "puzzle", name: {"ko":"마지막 픽셀","en":"Last Pixel","ja":"最後のピクセル","zh":"最后的像素","fr":"Dernier pixel","es":"Último píxel"} },
  "two-hands": { emoji: "🤝", cat: "puzzle", name: {"ko":"두 손의 협상","en":"Two-Hand Deal","ja":"両手の交渉","zh":"双手的谈判","fr":"Négociation à deux mains","es":"Trato a dos manos"} },
  "monster-interview": { emoji: "👹", cat: "puzzle", name: {"ko":"몬스터 면접관","en":"Monster Interview","ja":"モンスター面接官","zh":"怪物面试官","fr":"Entretien avec un monstre","es":"Entrevista con un monstruo"} },
  "chef-physics": { emoji: "🍳", cat: "puzzle", name: {"ko":"셰프의 물리학","en":"Chef Physics","ja":"シェフの物理","zh":"厨师的物理","fr":"Physique du chef","es":"Física del chef"} },
  "liar-onephone": { emoji: "🎭", cat: "quiz", name: {"ko":"라이어 한 폰","en":"One-Phone Liar","ja":"一台ライアー","zh":"一机说谎者","fr":"Menteur, un téléphone","es":"Mentiroso de un móvil"} },
  "spatial-memory": { emoji: "🧭", cat: "puzzle", name: {"ko":"공간 기억","en":"Spatial Memory","ja":"空間記憶","zh":"空间记忆","fr":"Mémoire spatiale","es":"Memoria espacial"} },
  "spirit-vale": { emoji: "🌿", cat: "puzzle", name: {"ko":"정령 골짜기","en":"Spirit Vale","ja":"精霊の谷","zh":"精灵山谷","fr":"Val des Esprits","es":"Valle de los Espíritus"} },
  "korean-semantle": { emoji: "🌊", cat: "puzzle", name: {"ko":"꼬맨틀","en":"Kkomantle","ja":"꼬맨틀","zh":"韩语猜义","fr":"Kkomantle","es":"Kkomantle"} },
  "cosmic-merge": { emoji: "🪐", cat: "puzzle", name: {"ko":"코스믹 머지","en":"Cosmic Merge","ja":"コズミック・マージ","zh":"宇宙合成","fr":"Cosmic Merge","es":"Cosmic Merge"} },
  "hexa-sort": { emoji: "🧩", cat: "puzzle", name: {"ko":"헥사 소트 3D","en":"Hexa Sort 3D","ja":"ヘキサソート 3D","zh":"六角排序 3D","fr":"Hexa Sort 3D","es":"Hexa Sort 3D"} },
  "block-blast": { emoji: "💥", cat: "puzzle", name: {"ko":"블록 블래스트 인피니트","en":"Block Blast Infinite","ja":"ブロックブラスト","zh":"方块爆破","fr":"Block Blast","es":"Block Blast"} },
  "word-waffle": { emoji: "🧇", cat: "puzzle", name: {"ko":"단어 와플","en":"Word Waffle","ja":"ワードワッフル","zh":"文字华夫饼","fr":"Word Waffle","es":"Word Waffle"} },
  "shadow-dodge": { emoji: "🌑", cat: "arcade", name: {"ko":"섀도우 닷지","en":"Shadow Dodge","ja":"シャドウドッジ","zh":"暗影闪避","fr":"Shadow Dodge","es":"Shadow Dodge"} },
  "neon-katana": { emoji: "🗡️", cat: "arcade", name: {"ko":"네온 카타나","en":"Neon Katana","ja":"ネオン・カタナ","zh":"霓虹武士刀","fr":"Neon Katana","es":"Neon Katana"} },
  "slice-master": { emoji: "🔪", cat: "arcade", name: {"ko":"슬라이스 마스터 3D","en":"Slice Master 3D","ja":"スライスマスター 3D","zh":"切片大师 3D","fr":"Slice Master 3D","es":"Slice Master 3D"} },
  "mini-metro": { emoji: "🚇", cat: "arcade", name: {"ko":"미니 메트로 웹","en":"Mini Metro Web","ja":"ミニメトロ ウェブ","zh":"迷你地铁 网页版","fr":"Mini Metro Web","es":"Mini Metro Web"} },
  "peglin-rogue": { emoji: "🔮", cat: "arcade", name: {"ko":"페글린 로그","en":"Peglin Rogue","ja":"ペグリン ローグ","zh":"弹珠地牢 肉鸽","fr":"Peglin Rogue","es":"Peglin Rogue"} },
  "subway-runner": { emoji: "🏃", cat: "arcade", name: {"ko":"러너 빌더 3D","en":"Subway Mini-Parkour","ja":"ランナービルダー 3D","zh":"跑酷大师 3D","fr":"Subway Mini-Parkour","es":"Subway Mini-Parkour"} },
  "shotgun-chess": { emoji: "♟️", cat: "arcade", name: {"ko":"샷건 체스","en":"Shotgun Chess","ja":"ショットガン チェス","zh":"散弹枪象棋","fr":"Shotgun Chess","es":"Shotgun Chess"} },
  "spell-tower": { emoji: "🔤", cat: "puzzle", name: {"ko":"스펠 타워","en":"SpellTower Web","ja":"スペルタワー","zh":"拼字高塔","fr":"SpellTower Web","es":"SpellTower Web"} },
  "water-sort-3d": { emoji: "🧪", cat: "puzzle", name: {"ko":"워터 소트 3D","en":"Water Sort 3D","ja":"ウォーターソート 3D","zh":"水排序 3D","fr":"Water Sort 3D","es":"Water Sort 3D"} },
  "vampire-survivor": { emoji: "🧛", cat: "arcade", name: {"ko":"뱀파이어 서바이벌","en":"Vampire Survivor Web","ja":"ヴァンパイア・サバイバー","zh":"吸血鬼幸存者","fr":"Vampire Survivor Web","es":"Vampire Survivor Web"} },
  "backpack-hero": { emoji: "🎒", cat: "puzzle", name: {"ko":"백팩 히어로","en":"Backpack Hero Web","ja":"バックパック・ヒーロー","zh":"背包英雄","fr":"Backpack Hero Web","es":"Backpack Hero Web"} },
  "baba-rule-shifter": { emoji: "🐰", cat: "puzzle", name: {"ko":"바바 이즈 유 미니","en":"Baba Rule Shifter","ja":"ババ・ルールシフター","zh":"芭芭变形记","fr":"Baba Rule Shifter","es":"Baba Rule Shifter"} },
  "paper-flight-3d": { emoji: "✈️", cat: "arcade", name: {"ko":"종이비행기 3D","en":"Paper Flight 3D","ja":"紙飛行機 3D","zh":"纸飞机 3D","fr":"Paper Flight 3D","es":"Paper Flight 3D"} },
  "merge-mansion": { emoji: "🏡", cat: "puzzle", name: {"ko":"머지 맨션 웹","en":"Merge Mansion Web","ja":"マージマンション Web","zh":"庄园合合乐","fr":"Merge Mansion Web","es":"Merge Mansion Web"} },
  "loop-hero": { emoji: "🔄", cat: "arcade", name: {"ko":"루프 히어로 웹","en":"Loop Hero Mini","ja":"ループヒーロー Web","zh":"循环勇者 Mini","fr":"Loop Hero Mini","es":"Loop Hero Mini"} },
  "plague-mini": { emoji: "☣️", cat: "arcade", name: {"ko":"전염병 주식회사 미니","en":"Plague Mini","ja":"伝染病カンパニー Mini","zh":"瘟疫危机 Mini","fr":"Plague Mini","es":"Plague Mini"} },
  "ftl-mini": { emoji: "🚀", cat: "arcade", name: {"ko":"FTL 우주선 미니","en":"FTL Spaceship Mini","ja":"FTL 宇宙船 Mini","zh":"超越光速 FTL Mini","fr":"FTL Spaceship Mini","es":"FTL Spaceship Mini"} },
  "into-the-breach": { emoji: "🤖", cat: "arcade", name: {"ko":"인투 더 브리치 미니","en":"Into the Breach Mini","ja":"Into the Breach Mini","zh":"陷阵之志 Mini","fr":"Into the Breach Mini","es":"Into the Breach Mini"} },
  "stanley-choice": { emoji: "🚪", cat: "arcade", name: {"ko":"스탠리 패러블 웹","en":"The Stanley Choice","ja":"スタンリー・パラブル Web","zh":"史丹利的寓言 Web","fr":"The Stanley Choice","es":"The Stanley Choice"} },
  "crossy-road-3d": { emoji: "🐔", cat: "arcade", name: {"ko":"크로시 로드 3D","en":"Crossy Road 3D","ja":"クロッシーロード 3D","zh":"天天过马路 3D","fr":"Crossy Road 3D","es":"Crossy Road 3D"} },
  "potion-craft": { emoji: "🧪", cat: "arcade", name: {"ko":"포션 크래프트 미니","en":"Potion Craft Mini","ja":"ポーションクラフト Mini","zh":"药剂工艺 Mini","fr":"Potion Craft Mini","es":"Potion Craft Mini"} },
  "beat-slice-3d": { emoji: "⚡", cat: "arcade", name: {"ko":"비트 슬라이스 3D","en":"Beat Slice 3D","ja":"ビートスライス 3D","zh":"节奏光刃 3D","fr":"Beat Slice 3D","es":"Beat Slice 3D"} },
  "bad-north-tactics": { emoji: "🛡️", cat: "arcade", name: {"ko":"배드 노스 미니","en":"Bad North Tactics","ja":"バッドノース Mini","zh":"绝境北方 Mini","fr":"Bad North Tactics","es":"Bad North Tactics"} },
  "sand-balls": { emoji: "🏖️", cat: "puzzle", name: {"ko":"샌드 볼스 3D","en":"Sand Balls Mini","ja":"サンドボール 3D","zh":"沙球大冲关 3D","fr":"Sand Balls Mini","es":"Sand Balls Mini"} },
  "powerwash-3d": { emoji: "🚿", cat: "arcade", name: {"ko":"파워워시 클린 3D","en":"PowerWash Clean 3D","ja":"パワーウォッシュ 3D","zh":"冲就完事模拟器 3D","fr":"PowerWash Clean 3D","es":"PowerWash Clean 3D"} },
  "factorio-mini": { emoji: "🏭", cat: "arcade", name: {"ko":"팩토리오 미니","en":"Factorio Automation Mini","ja":"ファクトリオ ミニ","zh":"异星工厂 迷你版","fr":"Factorio Automation Mini","es":"Factorio Automation Mini"} },
  "gorogoa-frame": { emoji: "🖼️", cat: "puzzle", name: {"ko":"고르고아 프레임","en":"Gorogoa Frame Weaver","ja":"ゴロゴア フレーム","zh":"画中世界 帧界编织","fr":"Gorogoa Frame Weaver","es":"Gorogoa Frame Weaver"} },
  "sticker-cozy": { emoji: "📒", cat: "puzzle", name: {"ko":"스티커북 코지 룸","en":"Sticker Book Cozy Room","ja":"ステッカーブック コージー","zh":"贴纸书：温馨小屋","fr":"Sticker Book Cozy Room","es":"Sticker Book Cozy Room"} },
  "swat-breach": { emoji: "🚨", cat: "arcade", name: {"ko":"택티컬 스왓 브리치","en":"Tactical SWAT Breach","ja":"タクティカル SWAT ブリーチ","zh":"战术特警：破门突击","fr":"Tactical SWAT Breach","es":"Tactical SWAT Breach"} },
  "spire-rogue": { emoji: "🗡️", cat: "card", name: {"ko":"슬레이 더 스파이어 미니","en":"Spire Deckbuilder Rogue","ja":"スレイ・ザ・スパイア ミニ","zh":"杀戮尖塔迷你版","fr":"Spire Deckbuilder Rogue","es":"Spire Deckbuilder Rogue"} },
  "suika-drop": { emoji: "🍉", cat: "puzzle", name: {"ko":"수박 머지 3D 물리","en":"Suika Fruit Drop Physics","ja":"スイカマージ 3D物理","zh":"合成大西瓜 3D物理","fr":"Suika Fruit Drop Physics","es":"Suika Fruit Drop Physics"} },
  "border-inspector": { emoji: "🛂", cat: "puzzle", name: {"ko":"페이퍼 플리즈 국경 심사","en":"Border Inspector Desk","ja":"ペーパー・プリーズ 国境審査","zh":"请出示证件：边境审查","fr":"Border Inspector Desk","es":"Border Inspector Desk"} },
  "poly-bridge": { emoji: "🌉", cat: "puzzle", name: {"ko":"폴리 브릿지 트러스 물리","en":"Poly Bridge Truss Architect","ja":"ポリブリッジ トラス物理","zh":"建桥专家：桁架物理","fr":"Poly Bridge Truss Architect","es":"Poly Bridge Truss Architect"} },
  "slot-rogue": { emoji: "🎰", cat: "luck", name: {"ko":"럭 비 어 랜드로드 슬롯","en":"Slot Synergy Rogue","ja":"スロット・シナジー・ローグ","zh":"幸运房东协同老虎机","fr":"Slot Synergy Rogue","es":"Slot Synergy Rogue"} },
  "townscaper-island": { emoji: "🏝️", cat: "puzzle", name: {"ko":"타운스케이퍼 아일랜드","en":"Townscaper Island Builder","ja":"タウンスケーパー・アイランド","zh":"城镇叠叠乐海岛","fr":"Townscaper Island Builder","es":"Townscaper Island Builder"} },
  "candle-sacrifice": { emoji: "🕯️", cat: "card", name: {"ko":"인스크립션 캔들 덱","en":"Candle Sacrifice Deck","ja":"インスクリプション・キャンドルデッキ","zh":"邪恶冥刻烛光牌","fr":"Candle Sacrifice Deck","es":"Candle Sacrifice Deck"} },
  "cozy-glider": { emoji: "🪶", cat: "arcade", name: {"ko":"어 숏 하이크 글라이더","en":"Cozy Peak Glider","ja":"コージー・ピーク・グライダー","zh":"短途徒步滑翔机","fr":"Cozy Peak Glider","es":"Cozy Peak Glider"} },
  "mini-motorways": { emoji: "🛣️", cat: "puzzle", name: {"ko":"미니 모터웨이 교차로","en":"Mini Motorways Traffic","ja":"ミニ・モーターウェイズ交差点","zh":"迷你公路交叉口","fr":"Mini Motorways Traffic","es":"Mini Motorways Traffic"} },
  "chrono-detective": { emoji: "⏱️", cat: "puzzle", name: {"ko":"오브라 딘 크로노 추리","en":"Memento Mori Chrono","ja":"オブラ・ディン・クロノ推理","zh":"奥伯拉丁怀表推理","fr":"Memento Mori Chrono","es":"Memento Mori Chrono"} },
  "dome-keeper": { emoji: "⛏️", cat: "arcade", name: {"ko":"돔 키퍼 채굴 디펜스","en":"Dome Keeper Drill Defense","ja":"ドームキーパー採掘防衛","zh":"穹顶守护者：钻探防卫","fr":"Dome Keeper Drill Defense","es":"Dome Keeper Drill Defense"} },
  "frostpunk-ring": { emoji: "❄️", cat: "puzzle", name: {"ko":"프로스트펑크 열기 도시","en":"Frostpunk Heat Ring City","ja":"フロストパンク熱気都市","zh":"冰汽时代：热环之城","fr":"Frostpunk Heat Ring City","es":"Frostpunk Heat Ring City"} },
  "darkest-torch": { emoji: "🕯️", cat: "arcade", name: {"ko":"다키스트 던전 횃불 원정","en":"Torchlight Stress Dungeon","ja":"ダーケスト・トーチ遠征","zh":"暗黑火炬远征","fr":"Torchlight Stress Dungeon","es":"Torchlight Stress Dungeon"} },
  "stacklands-village": { emoji: "🃏", cat: "puzzle", name: {"ko":"스택랜드 카드 빌리지","en":"Stacklands Card Village","ja":"スタックランド・カードビレッジ","zh":"堆叠大陆卡牌村庄","fr":"Stacklands Card Village","es":"Stacklands Card Village"} },
  "viking-longship": { emoji: "⛵", cat: "arcade", name: {"ko":"바이킹 롱쉽 항해","en":"Viking Longship Seas","ja":"ヴァイキング・ロングシップ","zh":"维京长船航路","fr":"Viking Longship Seas","es":"Drakkar Vikingo"} },
  "sushi-conveyor": { emoji: "🍣", cat: "arcade", name: {"ko":"회전초밥 타이쿤","en":"Conveyor Sushi Tycoon","ja":"回転寿司タイクーン","zh":"回转寿司大亨","fr":"Conveyor Sushi","es":"Sushi Giratorio"} },
  "chaos-kitchen": { emoji: "🍳", cat: "arcade", name: {"ko":"카오스 키친","en":"Chaos Kitchen","ja":"カオスキッチン","zh":"混乱厨房","fr":"Chaos Kitchen","es":"Cocina Caótica"} },
  "grappling-boss": { emoji: "🪝", cat: "arcade", name: {"ko":"그래플링 보스","en":"Grappling Boss Arena","ja":"グラップリング・ボス","zh":"抓钩领主","fr":"Grappling Boss","es":"Jefe con Gancho"} },
  "cheese-factory": { emoji: "🧀", cat: "arcade", name: {"ko":"치즈 팩토리 타이쿤","en":"Cheese Factory Tycoon","ja":"チーズ・ファクトリー","zh":"奶酪工厂大亨","fr":"Cheese Factory","es":"Fábrica de Quesos"} },
  "shadow-stealth": { emoji: "🥷", cat: "arcade", name: {"ko":"시노비 잠입 암살","en":"Shinobi Shadow Infiltration","ja":"忍び・シャドウ潜入","zh":"影之潜入极意忍者","fr":"Shinobi Shadow Infiltration","es":"Infiltración Shinobi"} },
  "failure-eater": { emoji: "👾", cat: "arcade", name: {"ko":"실패를 먹는 괴물","en":"Failure Eater","ja":"失敗を食べる怪物","zh":"吃掉失败的怪物","fr":"Monstre des ratés","es":"Monstruo de los fallos"} },
  "snake-game": { emoji: "🐍", cat: "arcade", name: {"ko":"스네이크","en":"Snake","ja":"スネーク","zh":"贪吃蛇","fr":"Snake","es":"Snake"} },
  "aim-trainer": { emoji: "🎯", cat: "arcade", name: {"ko":"에임 트레이너","en":"Aim Trainer","ja":"エイム練習","zh":"瞄准训练","fr":"Entraîneur de visée","es":"Entrenador de puntería"} },
  "emberdeep": { emoji: "⚔️", cat: "arcade", name: {"ko":"잿불 던전","en":"Emberdeep","ja":"残り火の迷宮","zh":"余烬地牢","fr":"Braise profonde","es":"Ascua profunda"} },
  "isometric-city": { emoji: "🏗️", cat: "arcade", name: {"ko":"도시 건설","en":"Isometric City","ja":"都市建設","zh":"等距建城","fr":"Ville isométrique","es":"Ciudad isométrica"} },
  "run-a-business": { emoji: "🍜", cat: "arcade", name: {"ko":"하루 장사","en":"Run a Business","ja":"一日商売","zh":"一天生意","fr":"Une journée de commerce","es":"Un día de negocio"} },
  "village": { emoji: "🏡", cat: "arcade", name: {"ko":"작은 마을 열두 달","en":"Twelve Months, One Village","ja":"小さな村の十二か月","zh":"小村庄的十二个月","fr":"Douze mois, un village","es":"Doce meses, una aldea"} },
  "mallow-isle": { emoji: "🐇", cat: "arcade", name: {"ko":"마시멜로 섬","en":"Mallow Isle","ja":"マロー島","zh":"棉花糖岛","fr":"Île Mallow","es":"Isla Mallow"} },
  "urban-strike": { emoji: "🔫", cat: "arcade", name: {"ko":"시가전","en":"Urban Strike","ja":"市街戦","zh":"巷战","fr":"Assaut urbain","es":"Asalto urbano"} },
  "iron-tempest": { emoji: "💥", cat: "arcade", name: {"ko":"강철 폭풍","en":"Iron Tempest","ja":"鉄の嵐","zh":"钢铁风暴","fr":"Tempête de fer","es":"Tempestad de hierro"} },
  "windward-horizons": { emoji: "⛵", cat: "arcade", name: {"ko":"바람길 항해","en":"Windward Horizons","ja":"風上の航海","zh":"迎风航线","fr":"Horizons au vent","es":"Horizontes de barlovento"} },
  "star-blaster": { emoji: "🚀", cat: "arcade", name: {"ko":"스타 블래스터","en":"Star Blaster","ja":"スターブラスター","zh":"星际爆破","fr":"Star Blaster","es":"Star Blaster"} },
  "neon-survivor": { emoji: "⚡", cat: "arcade", name: {"ko":"네온 서바이버","en":"Neon Survivor","ja":"ネオン・サバイバー","zh":"霓虹幸存者","fr":"Neon Survivor","es":"Neon Survivor"} },
  "brick-breaker": { emoji: "🧱", cat: "arcade", name: {"ko":"벽돌깨기","en":"Brick Breaker","ja":"ブロック崩し","zh":"打砖块","fr":"Casse-briques","es":"Rompeladrillos"} },
  "mini-golf-3d": { emoji: "⛳", cat: "arcade", name: {"ko":"미니 골프 3D","en":"Mini Golf 3D","ja":"ミニゴルフ 3D","zh":"迷你高尔夫 3D","fr":"Mini-Golf 3D","es":"Mini Golf 3D"} },
  "cyber-track": { emoji: "🏎️", cat: "arcade", name: {"ko":"사이버 트랙 3D","en":"CyberTrack 3D","ja":"サイバートラック 3D","zh":"赛博赛道 3D","fr":"CyberTrack 3D","es":"CyberTrack 3D"} },
  "cave-dash": { emoji: "🛸", cat: "arcade", name: {"ko":"케이브 대시","en":"Cave Dash","ja":"ケイブダッシュ","zh":"洞穴冲刺","fr":"Cave Dash","es":"Cave Dash"} },
  "time-loop-rescue": { emoji: "⏱️", cat: "arcade", name: {"ko":"타임루프 구조대","en":"Time Loop Rescue","ja":"タイムループ・レスキュー","zh":"时光回环救援队","fr":"Sauvetage temporel","es":"Rescate temporal"} },
  "memory-palace-thieves": { emoji: "🏛️", cat: "arcade", name: {"ko":"기억 궁전 도둑들","en":"Memory Palace Thieves","ja":"記憶宮殿の盗賊","zh":"记忆宫殿盗贼","fr":"Voleurs du palais mental","es":"Ladrones del palacio mental"} },
  "rivals-mind": { emoji: "⚔️", cat: "arcade", name: {"ko":"라이벌의 마음","en":"The Rival's Mind","ja":"ライバルの心","zh":"对手的心","fr":"Dans la tête du rival","es":"La mente del rival"} },
  "gravity-garden": { emoji: "🌱", cat: "arcade", name: {"ko":"중력 정원","en":"Gravity Garden","ja":"重力の庭","zh":"重力花园","fr":"Jardin gravitationnel","es":"Jardín gravitatorio"} },
  "shadow-architect": { emoji: "◩", cat: "puzzle", name: {"ko":"그림자 건축가","en":"Shadow Architect","ja":"影の建築家","zh":"影子建筑师","fr":"Architecte des ombres","es":"Arquitecto de sombras"} },
  "reverse-dungeon": { emoji: "↻", cat: "puzzle", name: {"ko":"리버스 던전","en":"Reverse Dungeon","ja":"リバースダンジョン","zh":"反向地牢","fr":"Donjon inversé","es":"Mazmorra inversa"} },
  "glass-planet": { emoji: "◎", cat: "puzzle", name: {"ko":"유리 행성","en":"Glass Planet","ja":"ガラス惑星","zh":"玻璃行星","fr":"Planète de verre","es":"Planeta de cristal"} },
  "constellation-shepherd": { emoji: "✦", cat: "puzzle", name: {"ko":"별자리 목동","en":"Constellation Shepherd","ja":"星座の羊飼い","zh":"星座牧人","fr":"Berger des constellations","es":"Pastor de constelaciones"} },
  "dream-elevator": { emoji: "↕", cat: "puzzle", name: {"ko":"꿈의 엘리베이터","en":"Dream Elevator","ja":"夢のエレベーター","zh":"梦之电梯","fr":"Ascenseur des rêves","es":"Ascensor de los sueños"} },
  "blind-pilot": { emoji: "✈", cat: "puzzle", name: {"ko":"블라인드 파일럿","en":"Blind Pilot","ja":"計器飛行","zh":"盲飞","fr":"Pilote sans visibilité","es":"Piloto sin visibilidad"} },
  "deep-photographer": { emoji: "📷", cat: "puzzle", name: {"ko":"심해 사진가","en":"Deep Photographer","ja":"深海の写真家","zh":"深海摄影师","fr":"Photographe des abysses","es":"Fotógrafo del abismo"} },
  "cloud-sculptor": { emoji: "☁️", cat: "puzzle", name: {"ko":"구름 조각사","en":"Cloud Sculptor","ja":"雲の彫刻家","zh":"云雕塑家","fr":"Sculpteur de nuages","es":"Escultor de nubes"} },
  "museum-night": { emoji: "🏺", cat: "puzzle", name: {"ko":"박물관의 밤","en":"Museum Night","ja":"博物館の夜","zh":"博物馆之夜","fr":"Nuit au musée","es":"Noche en el museo"} },
  "ink-ecology": { emoji: "🖋️", cat: "puzzle", name: {"ko":"잉크 생태계","en":"Ink Ecology","ja":"インクの生態系","zh":"墨水生态","fr":"Écologie d'encre","es":"Ecología de tinta"} },
  "doodle-line": { emoji: "🖍️", cat: "puzzle", name: {"ko":"낙서 방어선","en":"Doodle Line","ja":"らくがき防衛線","zh":"涂鸦防线","fr":"Ligne gribouillée","es":"Línea de garabatos"} },
  "sentence-dungeon": { emoji: "📜", cat: "puzzle", name: {"ko":"문장 던전","en":"Sentence Dungeon","ja":"文の迷宮","zh":"句子地牢","fr":"Donjon des phrases","es":"Mazmorra de frases"} },
  "emotion-weather": { emoji: "🌦️", cat: "puzzle", name: {"ko":"감정 기상청","en":"Emotion Weather","ja":"感情気象台","zh":"情绪气象台","fr":"Météo des humeurs","es":"Tiempo de los ánimos"} },
  "subway-conductor": { emoji: "🚇", cat: "puzzle", name: {"ko":"지하철 지휘자","en":"Subway Conductor","ja":"地下鉄の指揮者","zh":"地铁调度员","fr":"Chef de rame","es":"Jefe de andén"} },
  "quiet-hunt": { emoji: "🐾", cat: "puzzle", name: {"ko":"포식자 없는 사냥","en":"Quiet Hunt","ja":"捕食者のいない狩り","zh":"无捕猎的追踪","fr":"Piste sans prise","es":"Rastro sin captura"} },
  "screen-kingdom": { emoji: "🏰", cat: "puzzle", name: {"ko":"한 화면 왕국","en":"One-Screen Kingdom","ja":"一画面の王国","zh":"一屏王国","fr":"Royaume d'un écran","es":"Reino de una pantalla"} },
  "one-room-spaceship": { emoji: "🚀", cat: "arcade", name: {"ko":"한 칸짜리 우주선","en":"One-Room Spaceship","ja":"ワンルーム宇宙船","zh":"单舱飞船","fr":"Vaisseau une pièce","es":"Nave de una habitación"} },
  "rumor-network": { emoji: "◌", cat: "puzzle", name: {"ko":"소문 네트워크","en":"Rumor Network","ja":"うわさネットワーク","zh":"传言网络","fr":"Réseau de rumeurs","es":"Red de rumores"} },
  "echo-shift": { emoji: "◖", cat: "arcade", name: {"ko":"에코 시프트","en":"Echo Shift","ja":"エコーシフト","zh":"回声移位","fr":"Décalage d'écho","es":"Cambio de eco"} },
  "foldworld-delivery": { emoji: "◆", cat: "puzzle", name: {"ko":"폴드월드 택배","en":"Foldworld Delivery","ja":"フォールドワールド便","zh":"折叠世界快递","fr":"Livraison pliée","es":"Reparto plegado"} },
  "living-maze": { emoji: "◇", cat: "puzzle", name: {"ko":"살아 있는 미로","en":"Living Maze","ja":"生きている迷路","zh":"活体迷宫","fr":"Labyrinthe vivant","es":"Laberinto vivo"} },
  "orbit-gardener": { emoji: "◉", cat: "puzzle", name: {"ko":"궤도 정원사","en":"Orbit Gardener","ja":"軌道庭師","zh":"轨道园丁","fr":"Jardinier orbital","es":"Jardinero orbital"} },
  "disaster-control": { emoji: "▦", cat: "arcade", name: {"ko":"재난 관제실","en":"Disaster Control","ja":"災害管制室","zh":"灾害控制室","fr":"Centre de crise","es":"Control de desastres"} },
  "whale-city": { emoji: "◠", cat: "arcade", name: {"ko":"고래 위의 도시","en":"City on a Whale","ja":"クジラの上の街","zh":"鲸背之城","fr":"La ville sur la baleine","es":"La ciudad sobre la ballena"} },
  "stack-tower": { emoji: "🏙️", cat: "arcade", name: {"ko":"스택 타워","en":"Stack Tower","ja":"スタックタワー","zh":"叠塔","fr":"Stack Tower","es":"Stack Tower"} },
  "rhythm-tap": { emoji: "🎵", cat: "arcade", name: {"ko":"리듬 탭","en":"Rhythm Tap","ja":"リズムタップ","zh":"节奏点击","fr":"Rhythm Tap","es":"Rhythm Tap"} },
  "whack-a-mole": { emoji: "🔨", cat: "arcade", name: {"ko":"두더지 잡기","en":"Whack-a-Mole","ja":"モグラたたき","zh":"打地鼠","fr":"Tape-Taupe","es":"Golpea al Topo"} },
  "memory-card-game": { emoji: "🧩", cat: "arcade", name: {"ko":"메모리 카드","en":"Memory Match","ja":"神経衰弱","zh":"记忆翻牌","fr":"Memory","es":"Memoria"} },
  "number-guessing": { emoji: "🔮", cat: "arcade", name: {"ko":"숫자 맞히기","en":"Number Guessing","ja":"数当て","zh":"猜数字","fr":"Devine le nombre","es":"Adivina el número"} },
  "puzzle-15": { emoji: "🔢", cat: "puzzle", name: {"ko":"15 퍼즐","en":"15 Puzzle","ja":"15パズル","zh":"数字华容道","fr":"Taquin","es":"Puzle 15"} },
  "kurodoko": { emoji: "⬛", cat: "puzzle", name: {"ko":"쿠로도코","en":"Kurodoko","ja":"クロドコ","zh":"黑格在哪","fr":"Kurodoko","es":"Kurodoko"} },
  "maze": { emoji: "🌀", cat: "puzzle", name: {"ko":"미로 찾기","en":"Maze Escape","ja":"迷路脱出","zh":"走出迷宫","fr":"Labyrinthe","es":"Laberinto"} },
  "cat-fishing": { emoji: "🐟", cat: "arcade", name: {"ko":"고양이 낚시","en":"Cat Fishing","ja":"ねこ釣り","zh":"猫咪钓鱼","fr":"Pêche au chat","es":"Pesca gatuna"} },
  "dot-runner": { emoji: "🏃", cat: "arcade", name: {"ko":"점프 러너","en":"Dot Runner","ja":"ドットランナー","zh":"点点酷跑","fr":"Dot Runner","es":"Dot Runner"} },
  "dot-jumpking": { emoji: "🦘", cat: "arcade", name: {"ko":"점프 킹","en":"Jump King","ja":"ジャンプキング","zh":"跳跳王","fr":"Jump King","es":"Jump King"} },
  "dot-dungeon-rogue": { emoji: "🗡️", cat: "arcade", name: {"ko":"도트 던전 로그","en":"Dot Dungeon Rogue","ja":"ドットダンジョンローグ","zh":"点点地牢肉鸽","fr":"Dot Dungeon Rogue","es":"Dot Dungeon Rogue"} },
  "dot-miner": { emoji: "⛏️", cat: "arcade", name: {"ko":"도트 마이너","en":"Dot Miner","ja":"ドットマイナー","zh":"点点采矿者","fr":"Dot Miner","es":"Dot Miner"} },
  "dot-farm": { emoji: "🌾", cat: "arcade", name: {"ko":"도트 팜","en":"Dot Farm","ja":"ドットファーム","zh":"点点农场","fr":"Dot Farm","es":"Dot Farm"} },
  "dot-fishing": { emoji: "🎣", cat: "arcade", name: {"ko":"도트 피싱","en":"Dot Fishing","ja":"ドットフィッシング","zh":"点点钓鱼","fr":"Dot Fishing","es":"Dot Fishing"} },
  "dot-tower": { emoji: "🏰", cat: "arcade", name: {"ko":"도트 타워","en":"Dot Tower","ja":"ドットタワー","zh":"点点塔防","fr":"Dot Tower","es":"Dot Tower"} },
  "animal-pop": { emoji: "🐵", cat: "arcade", name: {"ko":"애니멀 팝","en":"Animal Pop","ja":"アニマルポップ","zh":"动物消消乐","fr":"Animal Pop","es":"Animal Pop"} },
  "block-burst": { emoji: "💎", cat: "arcade", name: {"ko":"블록 버스트","en":"Block Burst","ja":"ブロックバースト","zh":"方块爆裂","fr":"Block Burst","es":"Block Burst"} },
  "yahtzee": { emoji: "🎲", cat: "luck", name: {"ko":"야찌","en":"Yahtzee","ja":"ヤッツィー","zh":"快艇骰子","fr":"Yahtzee","es":"Yahtzee"} },
};

/**
 * Curated high-relevance clusters for flagship and genre-defining titles.
 * Players finishing or exploring these games receive hand-tuned next-best suggestions.
 */
export const CURATED_CLUSTERS: Record<string, string[]> = {
  // Dot Retro Arcade Cluster
  "dot-fishing": ["cat-fishing", "dot-farm", "dot-dungeon-rogue", "dot-runner"],
  "dot-farm": ["dot-fishing", "townscaper-island", "dot-miner", "cheese-factory"],
  "dot-dungeon-rogue": ["dot-tower", "dot-runner", "vampire-survivor", "emberdeep"],
  "dot-tower": ["dot-jumpking", "dot-dungeon-rogue", "dome-keeper", "bad-north-tactics"],
  "dot-runner": ["subway-runner", "dot-jumpking", "dot-dungeon-rogue", "cave-dash"],
  "dot-jumpking": ["dot-runner", "dot-tower", "cozy-glider", "cave-dash"],
  "dot-miner": ["dome-keeper", "dot-dungeon-rogue", "dot-farm", "factorio-mini"],

  // Survivors / Tactical Roguelikes
  "vampire-survivor": ["neon-survivor", "bad-north-tactics", "iron-tempest", "loop-hero"],
  "neon-survivor": ["vampire-survivor", "shadow-stealth", "neon-katana", "iron-tempest"],
  "bad-north-tactics": ["viking-longship", "into-the-breach", "vampire-survivor", "swat-breach"],
  "into-the-breach": ["bad-north-tactics", "shotgun-chess", "swat-breach", "ftl-mini"],
  "ftl-mini": ["into-the-breach", "vampire-survivor", "loop-hero", "dome-keeper"],
  "loop-hero": ["vampire-survivor", "emberdeep", "spire-rogue", "darkest-torch"],
  "spire-rogue": ["backpack-hero", "candle-sacrifice", "slot-rogue", "card-surge"],
  "peglin-rogue": ["spire-rogue", "slot-rogue", "block-burst", "brick-breaker"],
  "backpack-hero": ["spire-rogue", "emberdeep", "candle-sacrifice", "patch-dungeon"],
  "swat-breach": ["urban-strike", "border-inspector", "into-the-breach", "bad-north-tactics"],

  // Board Games
  "chess": ["shotgun-chess", "checkers", "gomoku", "janggi"],
  "shotgun-chess": ["chess", "checkers", "into-the-breach", "spire-rogue"],
  "checkers": ["chess", "gomoku", "connect-four", "janggi"],
  "gomoku": ["connect-four", "chess", "checkers", "janggi"],
  "janggi": ["chess", "gomoku", "checkers", "mahjong"],
  "connect-four": ["gomoku", "checkers", "dominoes", "kingdomino"],
  "kingdomino": ["dominoes", "stacklands-village", "connect-four", "townscaper-island"],

  // Block & Tile Puzzles
  "block-blast": ["block-burst", "hexa-sort", "game-2048", "brick-breaker"],
  "block-burst": ["block-blast", "hexa-sort", "suika-drop", "sand-balls"],
  "hexa-sort": ["block-burst", "block-blast", "water-sort-3d", "sand-balls"],
  "water-sort": ["water-sort-3d", "sand-balls", "hexa-sort", "block-burst"],
  "water-sort-3d": ["water-sort", "hexa-sort", "sand-balls", "block-burst"],
  "suika-drop": ["block-burst", "cosmic-merge", "water-sort", "hexa-sort"],
  "game-2048": ["block-blast", "cosmic-merge", "hexa-sort", "sudoku"],

  // Word Puzzles
  "wordle": ["spell-tower", "word-groups", "word-waffle", "korean-semantle"],
  "spell-tower": ["wordle", "letter-swap", "word-groups", "word-waffle"],
  "word-groups": ["wordle", "word-waffle", "spell-tower", "letter-swap"],
  "word-waffle": ["wordle", "word-groups", "letter-swap", "spell-tower"],
  "korean-semantle": ["wordle", "word-groups", "letter-swap", "spell-tower"],

  // Logic & Deduction Puzzles
  "sudoku": ["hitori", "minesweeper", "light-up", "tents-and-trees"],
  "minesweeper": ["sudoku", "light-up", "hitori", "tents-and-trees"],
  "hitori": ["sudoku", "tents-and-trees", "light-up", "minesweeper"],
  "tents-and-trees": ["hitori", "sudoku", "light-up", "minesweeper"],
  "baba-rule-shifter": ["patch-dungeon", "gorogoa-frame", "into-the-breach", "two-hands"],
  "gorogoa-frame": ["baba-rule-shifter", "chrono-detective", "shadow-architect", "patch-dungeon"],
  "chrono-detective": ["omission-detective", "border-inspector", "gorogoa-frame", "blackout-courier"],

  // Simulation & Cooking Tycoon
  "sushi-conveyor": ["chaos-kitchen", "cheese-factory", "run-a-business", "factorio-mini"],
  "chaos-kitchen": ["sushi-conveyor", "chef-physics", "cheese-factory", "run-a-business"],
  "cheese-factory": ["sushi-conveyor", "chaos-kitchen", "factorio-mini", "village"],
  "run-a-business": ["sushi-conveyor", "village", "townscaper-island", "cheese-factory"],

  // Action, 3D & Runner
  "subway-runner": ["crossy-road-3d", "dot-runner", "paper-flight-3d", "cave-dash"],
  "crossy-road-3d": ["subway-runner", "paper-flight-3d", "beat-slice-3d", "slice-master"],
  "paper-flight-3d": ["crossy-road-3d", "subway-runner", "cozy-glider", "beat-slice-3d"],
  "beat-slice-3d": ["slice-master", "neon-katana", "crossy-road-3d", "line-surf"],
  "slice-master": ["beat-slice-3d", "neon-katana", "chef-physics", "crossy-road-3d"],
  "powerwash-3d": ["slice-master", "beat-slice-3d", "water-sort-3d", "sand-balls"],
};

/**
 * Deterministically pick recommendations for any game slug.
 * 1. Checks CURATED_CLUSTERS.
 * 2. Fills remaining quota from same category (cat).
 * 3. Fills any leftover quota from other catalog games.
 * 4. Filters out current game slug.
 */
export function getGameRecommendations(
  currentSlug: string,
  locale: Locale,
  count = 4
): GameRecommendation[] {
  const chosenSlugs = new Set<string>();

  // 1. Curated suggestions
  const curated = CURATED_CLUSTERS[currentSlug] ?? [];
  for (const s of curated) {
    if (s !== currentSlug && CATALOG_GAMES[s] && chosenSlugs.size < count) {
      chosenSlugs.add(s);
    }
  }

  // Current entry metadata (if known)
  const currentEntry = CATALOG_GAMES[currentSlug];
  const targetCat = currentEntry?.cat ?? "arcade";

  // Deterministic seed from currentSlug for stable selection
  let hash = 0;
  for (let i = 0; i < currentSlug.length; i++) {
    hash = (hash * 31 + currentSlug.charCodeAt(i)) >>> 0;
  }

  // 2. Same category fallback
  const sameCatSlugs = Object.keys(CATALOG_GAMES).filter(
    (s) => s !== currentSlug && CATALOG_GAMES[s].cat === targetCat && !chosenSlugs.has(s)
  );
  if (sameCatSlugs.length > 0) {
    const startIdx = hash % sameCatSlugs.length;
    for (let i = 0; i < sameCatSlugs.length && chosenSlugs.size < count; i++) {
      const idx = (startIdx + i) % sameCatSlugs.length;
      chosenSlugs.add(sameCatSlugs[idx]);
    }
  }

  // 3. Global catalog fallback if still under count
  if (chosenSlugs.size < count) {
    const allSlugs = Object.keys(CATALOG_GAMES).filter(
      (s) => s !== currentSlug && !chosenSlugs.has(s)
    );
    const startIdx = hash % allSlugs.length;
    for (let i = 0; i < allSlugs.length && chosenSlugs.size < count; i++) {
      const idx = (startIdx + i) % allSlugs.length;
      chosenSlugs.add(allSlugs[idx]);
    }
  }

  // Format into GameRecommendation objects
  return Array.from(chosenSlugs).map((slug) => {
    const g = CATALOG_GAMES[slug];
    const title = g?.name[locale] ?? g?.name.en ?? slug;
    return {
      slug,
      title,
      emoji: g?.emoji ?? "🎮",
      href: `/${locale}/${slug}/`,
      cat: g?.cat ?? "arcade",
    };
  });
}
