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
  "four-in-a-row": { emoji: "🔴", cat: "board", name: {"ko":"사목","en":"Four in a Row","ja":"四目並べ","zh":"四子棋","fr":"Quatre en ligne","es":"Cuatro en raya"} },
  "dominoes": { emoji: "🎴", cat: "board", name: {"ko":"도미노","en":"Dominoes","ja":"ドミノ","zh":"多米诺","fr":"Dominos","es":"Dominó"} },
  "kingdom-tiles": { emoji: "👑", cat: "board", name: {"ko":"킹덤 타일","en":"Kingdom Tiles","ja":"キングダムタイル","zh":"王国拼砖","fr":"Kingdom Tiles","es":"Kingdom Tiles"} },
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
  "number-trail": { emoji: "🔢", cat: "puzzle", name: {"ko":"넘버 트레일","en":"Number Trail","ja":"ナンバートレイル","zh":"数字小径","fr":"Number Trail","es":"Number Trail"} },
  "arrow-walk": { emoji: "🧭", cat: "puzzle", name: {"ko":"애로 워크","en":"Arrow Walk","ja":"アローウォーク","zh":"箭头漫步","fr":"Arrow Walk","es":"Arrow Walk"} },
  "game-2048": { emoji: "🔟", cat: "puzzle", name: {"ko":"2048","en":"2048","ja":"2048","zh":"2048","fr":"2048","es":"2048"} },
  "five-letter-guess": { emoji: "🟩", cat: "puzzle", name: {"ko":"다섯 글자 맞히기","en":"Five Letter Guess","ja":"5文字ワード当て","zh":"五字母猜词","fr":"Mot en 5 lettres","es":"Palabra de 5 letras"} },
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
  "word-warmth": { emoji: "🌊", cat: "puzzle", name: {"ko":"단어 온도","en":"Word Warmth","ja":"単語温度","zh":"词语温度","fr":"Word Warmth","es":"Word Warmth"} },
  "cosmic-merge": { emoji: "🪐", cat: "puzzle", name: {"ko":"코스믹 머지","en":"Cosmic Merge","ja":"コズミック・マージ","zh":"宇宙合成","fr":"Cosmic Merge","es":"Cosmic Merge"} },
  "hexa-sort": { emoji: "🧩", cat: "puzzle", name: {"ko":"헥사 소트 3D","en":"Hexa Sort 3D","ja":"ヘキサソート 3D","zh":"六角排序 3D","fr":"Hexa Sort 3D","es":"Hexa Sort 3D"} },
  "grid-clear": { emoji: "💥", cat: "puzzle", name: {"ko":"그리드 클리어","en":"Grid Clear","ja":"グリッドクリア","zh":"格子消除","fr":"Grid Clear","es":"Grid Clear"} },
  "word-waffle": { emoji: "🧇", cat: "puzzle", name: {"ko":"단어 와플","en":"Word Waffle","ja":"ワードワッフル","zh":"文字华夫饼","fr":"Word Waffle","es":"Word Waffle"} },
  "shadow-dodge": { emoji: "🌑", cat: "arcade", name: {"ko":"섀도우 닷지","en":"Shadow Dodge","ja":"シャドウドッジ","zh":"暗影闪避","fr":"Shadow Dodge","es":"Shadow Dodge"} },
  "neon-katana": { emoji: "🗡️", cat: "arcade", name: {"ko":"네온 카타나","en":"Neon Katana","ja":"ネオン・カタナ","zh":"霓虹武士刀","fr":"Neon Katana","es":"Neon Katana"} },
  "blade-drop-3d": { emoji: "🔪", cat: "arcade", name: {"ko":"블레이드 드롭 3D","en":"Blade Drop 3D","ja":"ブレードドロップ 3D","zh":"落刃切切 3D","fr":"Blade Drop 3D","es":"Blade Drop 3D"} },
  "subway-sketch": { emoji: "🚇", cat: "arcade", name: {"ko":"지하철 노선 스케치","en":"Subway Sketch","ja":"地下鉄スケッチ","zh":"地铁线路速写","fr":"Subway Sketch","es":"Subway Sketch"} },
  "peg-dungeon": { emoji: "🔮", cat: "arcade", name: {"ko":"페그 던전","en":"Peg Dungeon","ja":"ペグダンジョン","zh":"钉板地牢","fr":"Peg Dungeon","es":"Peg Dungeon"} },
  "subway-runner": { emoji: "🏃", cat: "arcade", name: {"ko":"러너 빌더 3D","en":"Subway Mini-Parkour","ja":"ランナービルダー 3D","zh":"跑酷大师 3D","fr":"Subway Mini-Parkour","es":"Subway Mini-Parkour"} },
  "shotgun-chess": { emoji: "♟️", cat: "arcade", name: {"ko":"샷건 체스","en":"Shotgun Chess","ja":"ショットガン チェス","zh":"散弹枪象棋","fr":"Shotgun Chess","es":"Shotgun Chess"} },
  "word-stack": { emoji: "🔤", cat: "puzzle", name: {"ko":"워드 스택","en":"Word Stack","ja":"ワードスタック","zh":"叠字塔","fr":"Word Stack","es":"Word Stack"} },
  "water-sort-3d": { emoji: "🧪", cat: "puzzle", name: {"ko":"워터 소트 3D","en":"Water Sort 3D","ja":"ウォーターソート 3D","zh":"水排序 3D","fr":"Water Sort 3D","es":"Water Sort 3D"} },
  "night-horde": { emoji: "🧛", cat: "arcade", name: {"ko":"나이트 호드","en":"Night Horde","ja":"ナイトホード","zh":"夜潮幸存","fr":"Night Horde","es":"Night Horde"} },
  "satchel-crawl": { emoji: "🎒", cat: "puzzle", name: {"ko":"가방 던전","en":"Satchel Crawl","ja":"かばんダンジョン","zh":"背囊地牢","fr":"Satchel Crawl","es":"Satchel Crawl"} },
  "rule-blocks": { emoji: "🐰", cat: "puzzle", name: {"ko":"룰 블록","en":"Rule Blocks","ja":"ルールブロック","zh":"规则方块","fr":"Rule Blocks","es":"Rule Blocks"} },
  "paper-flight-3d": { emoji: "✈️", cat: "arcade", name: {"ko":"종이비행기 3D","en":"Paper Flight 3D","ja":"紙飛行機 3D","zh":"纸飞机 3D","fr":"Paper Flight 3D","es":"Paper Flight 3D"} },
  "merge-cottage": { emoji: "🏡", cat: "puzzle", name: {"ko":"머지 코티지","en":"Merge Cottage","ja":"マージコテージ","zh":"合成小屋","fr":"Merge Cottage","es":"Merge Cottage"} },
  "loop-road": { emoji: "🔄", cat: "arcade", name: {"ko":"루프 로드","en":"Loop Road","ja":"ループロード","zh":"循环之路","fr":"Loop Road","es":"Loop Road"} },
  "outbreak-map": { emoji: "☣️", cat: "arcade", name: {"ko":"아웃브레이크 맵","en":"Outbreak Map","ja":"アウトブレイクマップ","zh":"疫情地图","fr":"Outbreak Map","es":"Outbreak Map"} },
  "star-skiff": { emoji: "🚀", cat: "arcade", name: {"ko":"스타 스키프","en":"Star Skiff","ja":"スタースキフ","zh":"星舟突围","fr":"Star Skiff","es":"Star Skiff"} },
  "mech-grid-tactics": { emoji: "🤖", cat: "arcade", name: {"ko":"메크 그리드 택틱스","en":"Mech Grid Tactics","ja":"Mech Grid Tactics","zh":"机甲棋盘战术","fr":"Mech Grid Tactics","es":"Mech Grid Tactics"} },
  "narrator-door": { emoji: "🚪", cat: "arcade", name: {"ko":"내레이터의 문","en":"The Narrator's Door","ja":"ナレーターの扉","zh":"旁白之门","fr":"The Narrator's Door","es":"The Narrator's Door"} },
  "hop-across-3d": { emoji: "🐔", cat: "arcade", name: {"ko":"홉 어크로스 3D","en":"Hop Across 3D","ja":"ホップアクロス 3D","zh":"跳跳过马路 3D","fr":"Hop Across 3D","es":"Hop Across 3D"} },
  "potion-bench": { emoji: "🧪", cat: "arcade", name: {"ko":"포션 벤치","en":"Potion Bench","ja":"ポーション工房","zh":"药剂工坊","fr":"Potion Bench","es":"Potion Bench"} },
  "beat-slice-3d": { emoji: "⚡", cat: "arcade", name: {"ko":"비트 슬라이스 3D","en":"Beat Slice 3D","ja":"ビートスライス 3D","zh":"节奏光刃 3D","fr":"Beat Slice 3D","es":"Beat Slice 3D"} },
  "shield-isle-tactics": { emoji: "🛡️", cat: "arcade", name: {"ko":"실드 아일 택틱스","en":"Shield Isle Tactics","ja":"シールド島戦術","zh":"盾岛战术","fr":"Shield Isle Tactics","es":"Shield Isle Tactics"} },
  "sand-dig": { emoji: "🏖️", cat: "puzzle", name: {"ko":"샌드 디그","en":"Sand Dig","ja":"サンドディグ","zh":"挖沙引球","fr":"Sand Dig","es":"Sand Dig"} },
  "pressure-wash-3d": { emoji: "🚿", cat: "arcade", name: {"ko":"압력 세척 3D","en":"Pressure Wash 3D","ja":"高圧洗浄 3D","zh":"高压清洗 3D","fr":"Pressure Wash 3D","es":"Pressure Wash 3D"} },
  "belt-factory": { emoji: "🏭", cat: "arcade", name: {"ko":"벨트 팩토리","en":"Belt Factory","ja":"ベルトファクトリー","zh":"传送带工厂","fr":"Belt Factory","es":"Belt Factory"} },
  "frame-weaver": { emoji: "🖼️", cat: "puzzle", name: {"ko":"프레임 위버","en":"Frame Weaver","ja":"フレームウィーバー","zh":"画框编织","fr":"Frame Weaver","es":"Frame Weaver"} },
  "sticker-cozy": { emoji: "📒", cat: "puzzle", name: {"ko":"스티커북 코지 룸","en":"Sticker Book Cozy Room","ja":"ステッカーブック コージー","zh":"贴纸书：温馨小屋","fr":"Sticker Book Cozy Room","es":"Sticker Book Cozy Room"} },
  "swat-breach": { emoji: "🚨", cat: "arcade", name: {"ko":"택티컬 스왓 브리치","en":"Tactical SWAT Breach","ja":"タクティカル SWAT ブリーチ","zh":"战术特警：破门突击","fr":"Tactical SWAT Breach","es":"Tactical SWAT Breach"} },
  "tower-deck-rogue": { emoji: "🗡️", cat: "card", name: {"ko":"타워 덱 로그","en":"Tower Deck Rogue","ja":"タワーデッキローグ","zh":"塔顶卡牌肉鸽","fr":"Tower Deck Rogue","es":"Tower Deck Rogue"} },
  "fruit-merge-drop": { emoji: "🍉", cat: "puzzle", name: {"ko":"과일 머지 드롭","en":"Fruit Merge Drop","ja":"フルーツマージドロップ","zh":"水果合成掉落","fr":"Fruit Merge Drop","es":"Fruit Merge Drop"} },
  "border-inspector": { emoji: "🛂", cat: "puzzle", name: {"ko":"국경 서류 심사","en":"Border Inspector Desk","ja":"国境書類審査","zh":"边境证件审查","fr":"Border Inspector Desk","es":"Border Inspector Desk"} },
  "truss-bridge": { emoji: "🌉", cat: "puzzle", name: {"ko":"트러스 브리지 빌더","en":"Truss Bridge Builder","ja":"トラス橋ビルダー","zh":"桁架桥梁建造","fr":"Truss Bridge Builder","es":"Truss Bridge Builder"} },
  "slot-rogue": { emoji: "🎰", cat: "luck", name: {"ko":"슬롯 시너지 로그","en":"Slot Synergy Rogue","ja":"スロット・シナジー・ローグ","zh":"老虎机协同肉鸽","fr":"Slot Synergy Rogue","es":"Slot Synergy Rogue"} },
  "harbor-blocks": { emoji: "🏝️", cat: "puzzle", name: {"ko":"하버 블록","en":"Harbor Blocks","ja":"ハーバーブロック","zh":"海港积木","fr":"Harbor Blocks","es":"Harbor Blocks"} },
  "candle-sacrifice": { emoji: "🕯️", cat: "card", name: {"ko":"촛불 제물 덱","en":"Candle Sacrifice Deck","ja":"キャンドル生贄デッキ","zh":"烛光献祭牌组","fr":"Candle Sacrifice Deck","es":"Candle Sacrifice Deck"} },
  "cozy-glider": { emoji: "🪶", cat: "arcade", name: {"ko":"포근한 봉우리 글라이더","en":"Cozy Peak Glider","ja":"コージー・ピーク・グライダー","zh":"暖峰滑翔机","fr":"Cozy Peak Glider","es":"Cozy Peak Glider"} },
  "road-weaver": { emoji: "🛣️", cat: "puzzle", name: {"ko":"로드 위버","en":"Road Weaver","ja":"ロードウィーバー","zh":"道路编织","fr":"Road Weaver","es":"Road Weaver"} },
  "chrono-detective": { emoji: "⏱️", cat: "puzzle", name: {"ko":"회중시계 운명 추리","en":"Memento Mori Chrono","ja":"懐中時計の運命推理","zh":"怀表命运推理","fr":"Memento Mori Chrono","es":"Memento Mori Chrono"} },
  "drill-dome": { emoji: "⛏️", cat: "arcade", name: {"ko":"드릴 돔 디펜스","en":"Drill Dome Defense","ja":"ドリルドーム防衛","zh":"钻探穹顶防卫","fr":"Drill Dome Defense","es":"Drill Dome Defense"} },
  "heat-ring-city": { emoji: "❄️", cat: "puzzle", name: {"ko":"히트 링 시티","en":"Heat Ring City","ja":"ヒートリングシティ","zh":"热环之城","fr":"Heat Ring City","es":"Heat Ring City"} },
  "torch-expedition": { emoji: "🕯️", cat: "arcade", name: {"ko":"횃불 원정대","en":"Torch Expedition","ja":"たいまつ遠征","zh":"火炬远征","fr":"Torch Expedition","es":"Torch Expedition"} },
  "card-village": { emoji: "🃏", cat: "puzzle", name: {"ko":"카드 빌리지","en":"Card Village","ja":"カードビレッジ","zh":"卡牌村庄","fr":"Card Village","es":"Card Village"} },
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
  "charge-climb": { emoji: "🦘", cat: "arcade", name: {"ko":"차지 클라임","en":"Charge Climb","ja":"チャージクライム","zh":"蓄力攀登","fr":"Charge Climb","es":"Charge Climb"} },
  "dot-dungeon-rogue": { emoji: "🗡️", cat: "arcade", name: {"ko":"도트 던전 로그","en":"Dot Dungeon Rogue","ja":"ドットダンジョンローグ","zh":"点点地牢肉鸽","fr":"Dot Dungeon Rogue","es":"Dot Dungeon Rogue"} },
  "dot-miner": { emoji: "⛏️", cat: "arcade", name: {"ko":"도트 마이너","en":"Dot Miner","ja":"ドットマイナー","zh":"点点采矿者","fr":"Dot Miner","es":"Dot Miner"} },
  "dot-farm": { emoji: "🌾", cat: "arcade", name: {"ko":"도트 팜","en":"Dot Farm","ja":"ドットファーム","zh":"点点农场","fr":"Dot Farm","es":"Dot Farm"} },
  "cat-expedition": { emoji: "🐈", cat: "arcade", name: {"ko":"고양이 원정대","en":"Cat Expedition","ja":"ねこ遠征隊","zh":"猫咪远征队","fr":"L'Expédition des chats","es":"La Expedición Gatuna"} },
  "trap-stairs": { emoji: "🪜", cat: "arcade", name: {"ko":"함정 계단","en":"Trap Stairs","ja":"罠の階段","zh":"陷阱台阶","fr":"L'Escalier piégé","es":"La Escalera Trampa"} },
  "alley-appraiser": { emoji: "🔍", cat: "puzzle", name: {"ko":"골목 감정소","en":"Alley Appraiser","ja":"路地裏鑑定所","zh":"胡同鉴定铺","fr":"L'Expert de la ruelle","es":"El Tasador del Callejón"} },
  "rampart-keeper": { emoji: "🏯", cat: "arcade", name: {"ko":"성벽 지기","en":"Rampart Keeper","ja":"城壁の守り手","zh":"城墙守卫","fr":"Gardien du rempart","es":"Guardián de la muralla"} },
  "link-duel": { emoji: "⚔️", cat: "puzzle", name: {"ko":"링크 대결","en":"Link Duel","ja":"リンク対決","zh":"链接对决","fr":"Duel par lien","es":"Duelo por enlace"} },
  "season-workshop": { emoji: "🥣", cat: "arcade", name: {"ko":"절기 공방","en":"Season Workshop","ja":"節気工房","zh":"节气工坊","fr":"L'Atelier des saisons","es":"El Taller de las Estaciones"} },
  "yut-nori": { emoji: "🎋", cat: "board", name: {"ko":"윷놀이","en":"Yut Nori","ja":"ユンノリ","zh":"尤茨游戏","fr":"Yut Nori","es":"Yut Nori"} },
  "snowman-stack": { emoji: "⛄", cat: "arcade", name: {"ko":"눈사람 쌓기","en":"Snowman Stack","ja":"雪だるま積み","zh":"堆雪人","fr":"Bonhomme en équilibre","es":"Torre de muñecos de nieve"} },
  "tidy-nook": { emoji: "🧺", cat: "puzzle", name: {"ko":"아늑한 방 정리","en":"Tidy Nook","ja":"ほっこり片付け","zh":"温馨收纳","fr":"Coin rangé","es":"Rincón ordenado"} },
  "firefly-keeper": { emoji: "🏮", cat: "arcade", name: {"ko":"반딧불 등지기","en":"Firefly Keeper","ja":"ほたるの灯守り","zh":"萤火守灯人","fr":"Gardien des lucioles","es":"Guardián de luciérnagas"} },
  "hanyang-timeslip": { emoji: "⏳", cat: "arcade", name: {"ko":"한양 타임슬립","en":"Hanyang Timeslip","ja":"漢陽タイムスリップ","zh":"汉阳时光穿越","fr":"Hanyang Timeslip","es":"Hanyang Timeslip"} },
  "dot-fishing": { emoji: "🎣", cat: "arcade", name: {"ko":"도트 피싱","en":"Dot Fishing","ja":"ドットフィッシング","zh":"点点钓鱼","fr":"Dot Fishing","es":"Dot Fishing"} },
  "dot-tower": { emoji: "🏰", cat: "arcade", name: {"ko":"도트 타워","en":"Dot Tower","ja":"ドットタワー","zh":"点点塔防","fr":"Dot Tower","es":"Dot Tower"} },
  "animal-pop": { emoji: "🐵", cat: "arcade", name: {"ko":"애니멀 팝","en":"Animal Pop","ja":"アニマルポップ","zh":"动物消消乐","fr":"Animal Pop","es":"Animal Pop"} },
  "block-burst": { emoji: "💎", cat: "arcade", name: {"ko":"블록 버스트","en":"Block Burst","ja":"ブロックバースト","zh":"方块爆裂","fr":"Block Burst","es":"Block Burst"} },
  "five-dice": { emoji: "🎲", cat: "luck", name: {"ko":"파이브 다이스","en":"Five Dice","ja":"ファイブダイス","zh":"五骰计分","fr":"Five Dice","es":"Five Dice"} },
};

/**
 * Curated high-relevance clusters for flagship and genre-defining titles.
 * Players finishing or exploring these games receive hand-tuned next-best suggestions.
 */
export const CURATED_CLUSTERS: Record<string, string[]> = {
  "rampart-keeper": ["dot-tower", "truss-bridge", "shield-isle-tactics", "trap-stairs"],
  "link-duel": ["rhythm-tap", "memory-card-game", "aim-trainer", "number-guessing"],
  "season-workshop": ["dot-farm", "cheese-factory", "village", "alley-appraiser"],
  "yut-nori": ["janggi", "gomoku", "checkers", "snowman-stack"],
  "snowman-stack": ["rampart-keeper", "season-workshop", "tidy-nook", "block-burst"],
  "tidy-nook": ["sticker-cozy", "block-burst", "water-sort-3d", "frame-weaver"],
  "cat-expedition": ["cat-fishing", "dot-dungeon-rogue", "tower-deck-rogue", "trap-stairs"],
  "trap-stairs": ["dot-runner", "charge-climb", "cave-dash", "alley-appraiser"],
  "alley-appraiser": ["border-inspector", "dot-farm", "museum-night", "omission-detective"],
  // Dot Retro Arcade Cluster
  "dot-fishing": ["cat-fishing", "dot-farm", "dot-dungeon-rogue", "dot-runner"],
  "dot-farm": ["dot-fishing", "harbor-blocks", "dot-miner", "cheese-factory"],
  "firefly-keeper": ["hanyang-timeslip", "spirit-vale", "constellation-shepherd", "echo-shift"],
  "hanyang-timeslip": ["dot-dungeon-rogue", "dot-farm", "border-inspector", "dot-runner"],
  "dot-dungeon-rogue": ["dot-tower", "dot-runner", "night-horde", "emberdeep"],
  "dot-tower": ["charge-climb", "dot-dungeon-rogue", "drill-dome", "shield-isle-tactics"],
  "dot-runner": ["subway-runner", "charge-climb", "dot-dungeon-rogue", "cave-dash"],
  "charge-climb": ["dot-runner", "dot-tower", "cozy-glider", "cave-dash"],
  "dot-miner": ["drill-dome", "dot-dungeon-rogue", "dot-farm", "belt-factory"],

  // Survivors / Tactical Roguelikes
  "night-horde": ["neon-survivor", "shield-isle-tactics", "iron-tempest", "loop-road"],
  "neon-survivor": ["night-horde", "shadow-stealth", "neon-katana", "iron-tempest"],
  "shield-isle-tactics": ["viking-longship", "mech-grid-tactics", "night-horde", "swat-breach"],
  "mech-grid-tactics": ["shield-isle-tactics", "shotgun-chess", "swat-breach", "star-skiff"],
  "star-skiff": ["mech-grid-tactics", "night-horde", "loop-road", "drill-dome"],
  "loop-road": ["night-horde", "emberdeep", "tower-deck-rogue", "torch-expedition"],
  "tower-deck-rogue": ["satchel-crawl", "candle-sacrifice", "slot-rogue", "card-surge"],
  "peg-dungeon": ["tower-deck-rogue", "slot-rogue", "block-burst", "brick-breaker"],
  "satchel-crawl": ["tower-deck-rogue", "emberdeep", "candle-sacrifice", "patch-dungeon"],
  "swat-breach": ["urban-strike", "border-inspector", "mech-grid-tactics", "shield-isle-tactics"],

  // Board Games
  "chess": ["shotgun-chess", "checkers", "gomoku", "janggi"],
  "shotgun-chess": ["chess", "checkers", "mech-grid-tactics", "tower-deck-rogue"],
  "checkers": ["chess", "gomoku", "four-in-a-row", "janggi"],
  "gomoku": ["four-in-a-row", "chess", "checkers", "janggi"],
  "janggi": ["chess", "gomoku", "checkers", "mahjong"],
  "four-in-a-row": ["gomoku", "checkers", "dominoes", "kingdom-tiles"],
  "kingdom-tiles": ["dominoes", "card-village", "four-in-a-row", "harbor-blocks"],

  // Block & Tile Puzzles
  "grid-clear": ["block-burst", "hexa-sort", "game-2048", "brick-breaker"],
  "block-burst": ["grid-clear", "hexa-sort", "fruit-merge-drop", "sand-dig"],
  "hexa-sort": ["block-burst", "grid-clear", "water-sort-3d", "sand-dig"],
  "water-sort": ["water-sort-3d", "sand-dig", "hexa-sort", "block-burst"],
  "water-sort-3d": ["water-sort", "hexa-sort", "sand-dig", "block-burst"],
  "fruit-merge-drop": ["block-burst", "cosmic-merge", "water-sort", "hexa-sort"],
  "game-2048": ["grid-clear", "cosmic-merge", "hexa-sort", "sudoku"],

  // Word Puzzles
  "five-letter-guess": ["word-stack", "word-groups", "word-waffle", "word-warmth"],
  "word-stack": ["five-letter-guess", "letter-swap", "word-groups", "word-waffle"],
  "word-groups": ["five-letter-guess", "word-waffle", "word-stack", "letter-swap"],
  "word-waffle": ["five-letter-guess", "word-groups", "letter-swap", "word-stack"],
  "word-warmth": ["five-letter-guess", "word-groups", "letter-swap", "word-stack"],

  // Logic & Deduction Puzzles
  "sudoku": ["hitori", "minesweeper", "light-up", "tents-and-trees"],
  "minesweeper": ["sudoku", "light-up", "hitori", "tents-and-trees"],
  "hitori": ["sudoku", "tents-and-trees", "light-up", "minesweeper"],
  "tents-and-trees": ["hitori", "sudoku", "light-up", "minesweeper"],
  "number-trail": ["arrow-walk", "tents-and-trees", "light-up", "sudoku"],
  "arrow-walk": ["number-trail", "tents-and-trees", "light-up", "hitori"],
  "rule-blocks": ["patch-dungeon", "frame-weaver", "mech-grid-tactics", "two-hands"],
  "frame-weaver": ["rule-blocks", "chrono-detective", "shadow-architect", "patch-dungeon"],
  "chrono-detective": ["omission-detective", "border-inspector", "frame-weaver", "blackout-courier"],

  // Simulation & Cooking Tycoon
  "sushi-conveyor": ["chaos-kitchen", "cheese-factory", "run-a-business", "belt-factory"],
  "chaos-kitchen": ["sushi-conveyor", "chef-physics", "cheese-factory", "run-a-business"],
  "cheese-factory": ["sushi-conveyor", "chaos-kitchen", "belt-factory", "village"],
  "run-a-business": ["sushi-conveyor", "village", "harbor-blocks", "cheese-factory"],

  // Action, 3D & Runner
  "subway-runner": ["hop-across-3d", "dot-runner", "paper-flight-3d", "cave-dash"],
  "hop-across-3d": ["subway-runner", "paper-flight-3d", "beat-slice-3d", "blade-drop-3d"],
  "paper-flight-3d": ["hop-across-3d", "subway-runner", "cozy-glider", "beat-slice-3d"],
  "beat-slice-3d": ["blade-drop-3d", "neon-katana", "hop-across-3d", "line-surf"],
  "blade-drop-3d": ["beat-slice-3d", "neon-katana", "chef-physics", "hop-across-3d"],
  "pressure-wash-3d": ["blade-drop-3d", "beat-slice-3d", "water-sort-3d", "sand-dig"],
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
