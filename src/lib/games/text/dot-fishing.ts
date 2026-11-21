import type { GameTextTable } from "../game-text";

/** dot-fishing: Korean source → other locales (see game-text.ts). */
export const DOT_FISHING_TEXT: GameTextTable = {
  "거리: {0}m": { en: "Distance: {0}m", ja: "距離：{0}m", zh: "距离：{0}m", fr: "Distance : {0} m", es: "Distancia: {0} m" },
  "줄 텐션 (Tension)": { en: "Line tension", ja: "ラインの張り", zh: "鱼线张力", fr: "Tension de la ligne", es: "Tensión del sedal" },
  "최대: {0}cm": { en: "Max: {0}cm", ja: "最大：{0}cm", zh: "最大：{0}cm", fr: "Max : {0} cm", es: "Máx.: {0} cm" },
  "포획: {0}회": { en: "Caught: {0}", ja: "捕獲：{0}回", zh: "捕获：{0} 次", fr: "Prises : {0}", es: "Capturas: {0}" },
  "가치: {0}G~": { en: "Value: {0}G+", ja: "価値：{0}G〜", zh: "价值：{0}G 起", fr: "Valeur : {0}G+", es: "Valor: {0}G+" },
  "미발견 어종": { en: "Not found yet", ja: "未発見の魚", zh: "未发现鱼种", fr: "Pas encore trouvé", es: "Aún sin descubrir" },
  "낚싯대: {0} (Lv.{1})": { en: "Rod: {0} (Lv.{1})", ja: "釣り竿：{0} (Lv.{1})", zh: "鱼竿：{0} (Lv.{1})", fr: "Canne : {0} (Niv.{1})", es: "Caña: {0} (Nv.{1})" },
  "내구도 x{0} / 인장력 x{1}": { en: "Durability x{0} / Pull x{1}", ja: "耐久 x{0} / 引張力 x{1}", zh: "耐久 x{0} / 拉力 x{1}", fr: "Solidité x{0} / Traction x{1}", es: "Resistencia x{0} / Tirón x{1}" },
  "최고 등급 로드 달성!": { en: "Best rod unlocked!", ja: "最高ランクの竿！", zh: "已获得顶级鱼竿！", fr: "Meilleure canne obtenue !", es: "¡Mejor caña conseguida!" },
  "선박: {0} (Lv.{1})": { en: "Boat: {0} (Lv.{1})", ja: "船：{0} (Lv.{1})", zh: "船只：{0} (Lv.{1})", fr: "Bateau : {0} (Niv.{1})", es: "Barco: {0} (Nv.{1})" },
  "해역: {0}": { en: "Zone: {0}", ja: "海域：{0}", zh: "海域：{0}", fr: "Zone : {0}", es: "Zona: {0}" },
  "최고 등급 탐사선 달성!": { en: "Best boat unlocked!", ja: "最高ランクの船！", zh: "已获得顶级探险船！", fr: "Meilleur bateau obtenu !", es: "¡Mejor barco conseguido!" },
  "도감: {0} / 30종": { en: "Logbook: {0} / 30", ja: "図鑑：{0} / 30種", zh: "图鉴：{0} / 30 种", fr: "Carnet : {0} / 30", es: "Bitácora: {0} / 30" },
  "총 골드: {0} G": { en: "Total gold: {0} G", ja: "合計ゴールド：{0} G", zh: "总金币：{0} G", fr: "Or total : {0} G", es: "Oro total: {0} G" },
  "입질 시간이 지나 물고기가 미끼만 먹고 도망쳤습니다.": { en: "Too slow: the fish took the bait and swam off.", ja: "遅すぎた！魚はエサだけ食べて逃げた。", zh: "太慢了，鱼吃了饵就跑了。", fr: "Trop lent : le poisson a pris l'appât et filé.", es: "Demasiado lento: el pez se llevó el cebo y huyó." },
  "바다에 찌를 던져 낚시를 시작하세요!": { en: "Cast your line to start fishing!", ja: "仕掛けを投げて釣りを始めよう！", zh: "抛出浮标开始钓鱼吧！", fr: "Lancez votre ligne pour pêcher !", es: "¡Lanza el sedal para empezar a pescar!" },
  "찌를 던졌습니다... 입질을 기다리는 중...": { en: "Line cast... waiting for a bite...", ja: "仕掛けを投げた……アタリを待っている……", zh: "已抛竿……等待咬钩……", fr: "Ligne lancée... on attend une touche...", es: "Sedal lanzado... esperando que piquen..." },
  "찌가 크게 흔들립니다! 지금 릴을 감아 챔질하세요! (!)": { en: "The float is jerking! Hook it now! (!)", ja: "ウキが大きく揺れた！今すぐ合わせよう！ (!)", zh: "浮标剧烈晃动！快收线扬竿！(!)", fr: "Le flotteur s'agite ! Ferrez maintenant ! (!)", es: "¡El flotador se agita! ¡Engancha ya! (!)" },
  "{0}의 챔질에 성공했습니다! 릴을 감아 끌어당기세요!": { en: "{0} is hooked! Reel it in!", ja: "{0}が掛かった！リールを巻いて引き寄せよう！", zh: "{0} 上钩了！收线把它拉上来！", fr: "{0} est ferré ! Moulinez !", es: "¡{0} enganchado! ¡Recoge el sedal!" },
  "낚싯줄이 팽팽하게 당겨져 끊어졌습니다! 물고기가 도망쳤습니다.": { en: "The line snapped! The fish got away.", ja: "ラインが切れた！魚に逃げられた。", zh: "鱼线绷断了！鱼跑掉了。", fr: "La ligne a cassé ! Le poisson s'est échappé.", es: "¡Se rompió el sedal! El pez escapó." },
  "대물 낚시 성공! [{0}] {1}cm (+{2}G)": { en: "Great catch! [{0}] {1}cm (+{2}G)", ja: "大物ゲット！[{0}] {1}cm (+{2}G)", zh: "钓到大鱼！[{0}] {1}cm (+{2}G)", fr: "Belle prise ! [{0}] {1} cm (+{2}G)", es: "¡Buena pieza! [{0}] {1} cm (+{2}G)" },
  "조업 해역을 [{0}] 구역으로 이동했습니다.": { en: "Moved to the [{0}] zone.", ja: "[{0}] 海域へ移動した。", zh: "已移动到 [{0}] 海域。", fr: "Direction la zone [{0}].", es: "Te moviste a la zona [{0}]." },
  "새 낚싯대 [{0}] 장착 완료!": { en: "New rod equipped: [{0}]!", ja: "新しい竿 [{0}] を装備！", zh: "已装备新鱼竿 [{0}]！", fr: "Nouvelle canne équipée : [{0}] !", es: "¡Nueva caña equipada: [{0}]!" },
  "선박 업그레이드 [{0}] 완료! 새로운 해역이 개방되었습니다!": { en: "Boat upgraded to [{0}]! A new zone is open!", ja: "船を [{0}] に強化！新しい海域が開放された！", zh: "船只升级为 [{0}]！新海域已开放！", fr: "Bateau amélioré : [{0}] ! Nouvelle zone ouverte !", es: "¡Barco mejorado a [{0}]! ¡Nueva zona abierta!" },
};
