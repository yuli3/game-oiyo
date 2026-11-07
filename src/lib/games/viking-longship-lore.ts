/**
 * 바이킹 롱쉽 (VikingLongship) - 노르드 선원 로어 & 통신 대사 HUD 시스템
 */

export type VikingLongshipSpeaker = "chieftain_ragnar" | "navigator_astrid" | "shipwright_eirik";

export type VikingLongshipTrigger =
  | "voyage_start"
  | "island_explore"
  | "monster_attack"
  | "storm_danger"
  | "bifrost_victory";

export interface VikingLongshipDialogue {
  speaker: VikingLongshipSpeaker;
  name: Record<string, string>;
  title: Record<string, string>;
  avatar: string;
  text: Record<string, string>;
}

export const VIKING_LONGSHIP_DIALOGUES: Record<VikingLongshipTrigger, VikingLongshipDialogue[]> = {
  voyage_start: [
    {
      speaker: "chieftain_ragnar",
      name: { ko: "족장 라그나르", en: "Chieftain Ragnar", ja: "族長ラグナル", zh: "酋长拉格纳", es: "Caudillo Ragnar", fr: "Chef Ragnar" },
      title: { ko: "롱쉽의 사령관", en: "Longship Commander", ja: "ロングシップ司令官", zh: "维京长船总指挥", es: "Comandante de la nave", fr: "Commandant du drakkar" },
      avatar: "🪓",
      text: {
        ko: "용맹한 전사들이여, 닻을 올리고 돛을 펼쳐라! 신비의 군도에 잠든 룬스톤을 찾아 비프로스트를 열 것이다!",
        en: "Brave warriors, weigh anchor and trim the sail! We seek the hidden runestones to open the Bifrost!",
        ja: "勇敢なる戦士たちよ、錨を上げ帆を張れ！神秘の諸島に眠るルーンストーンを探しビフレストを開くのだ！",
        zh: "勇敢的维京勇士们，起锚扬帆！我们要找齐沉睡在神秘群岛的符文石，开启通往英灵殿的彩虹桥！",
        es: "¡Guerreros valientes, izad anclas y ajustad velas! ¡Busquemos las runas para abrir el Bifrost!",
        fr: "Braves guerriers, levez l'ancre et bordez la voile ! Trouvons les pierres runiques pour ouvrir le Bifrost !",
      },
    },
    {
      speaker: "navigator_astrid",
      name: { ko: "항해사 아스트리드", en: "Navigator Astrid", ja: "航海士アストリッド", zh: "航海士阿斯特丽德", es: "Navegante Astrid", fr: "Navigatrice Astrid" },
      title: { ko: "바람과 별의 인도자", en: "Wind & Star Reader", ja: "風と星の導き手", zh: "风与群星指引者", es: "Guía del viento y estrellas", fr: "Guide des vents et étoiles" },
      avatar: "🧭",
      text: {
        ko: "바람의 방향(흰색 화살표)을 주시하세요. 돛 각도를 바람과 나란히 맞추면 롱쉽이 최고의 속도로 전진합니다!",
        en: "Watch the wind arrow carefully. Trim the sail to match the wind angle for maximum nautical knots!",
        ja: "風向き（白の矢印）を注視してください。帆の角度を風に合わせればロングシップは最高速で進みます！",
        zh: "密切观察风向指示箭头。调整风帆迎风角度，长船即可发挥出最极致的航行速度！",
        es: "Atento a la flecha del viento. ¡Ajusta el velamen para alcanzar la máxima velocidad!",
        fr: "Surveillez la flèche du vent. Ajustez la voilure pour tirer le meilleur parti des nœuds marins !",
      },
    },
  ],
  island_explore: [
    {
      speaker: "shipwright_eirik",
      name: { ko: "목수 에이릭", en: "Shipwright Eirik", ja: "船大工エイリク", zh: "船匠埃里克", es: "Carpintero Eirik", fr: "Charpentier Eirik" },
      title: { ko: "조선소 선박 장인", en: "Master Shipwright", ja: "造船所の巨匠", zh: "维京船厂大师", es: "Maestro de astilleros", fr: "Maître charpentier" },
      avatar: "🔨",
      text: {
        ko: "섬에 상륙했습니다! 목재와 철광석을 넉넉히 수확하여 선체 수리와 조선소 강화에 보태겠습니다!",
        en: "We've made landfall! Harvesting timber and iron to repair our hull and forge shipyard upgrades!",
        ja: "島に上陸しました！木材と鉄鉱石を豊富に収穫し、船体修理と造船所強化に役立てます！",
        zh: "成功登上岛屿！正在采集木料与铁矿石，用于加固长船船身以及在造船厂进行永久强化！",
        es: "¡Hemos tocado tierra! Recogiendo madera y hierro para reparar el casco y mejorar el astillero.",
        fr: "Terre en vue ! Nous récoltons bois et fer pour réparer la coque et améliorer le chantier !",
      },
    },
    {
      speaker: "chieftain_ragnar",
      name: { ko: "족장 라그나르", en: "Chieftain Ragnar", ja: "族長ラグナル", zh: "酋长拉格纳", es: "Caudillo Ragnar", fr: "Chef Ragnar" },
      title: { ko: "롱쉽의 사령관", en: "Longship Commander", ja: "ロングシップ司令官", zh: "维京长船总指挥", es: "Comandante de la nave", fr: "Commandant du drakkar" },
      avatar: "✨",
      text: {
        ko: "고대의 룬스톤이 찬란한 빛을 발하고 있다! 오딘의 가호가 우리 원정대와 함께하리라!",
        en: "The ancient runestone shines with celestial light! Odin's blessing is upon our expedition!",
        ja: "古代のルーンストーンが眩い光を放っている！オーディンの加護が我ら遠征隊と共にある！",
        zh: "远古符文石正散发着璀璨夺目的神光！奥丁的庇佑与维京远征舰队同在！",
        es: "¡La piedra rúnica brilla con luz estelar! ¡La bendición de Odín acompaña nuestra travesía!",
        fr: "La pierre runique brille d'une lumière éclatante ! La bénédiction d'Odin repose sur nous !",
      },
    },
  ],
  monster_attack: [
    {
      speaker: "chieftain_ragnar",
      name: { ko: "족장 라그나르", en: "Chieftain Ragnar", ja: "族長ラグナル", zh: "酋长拉格纳", es: "Caudillo Ragnar", fr: "Chef Ragnar" },
      title: { ko: "롱쉽의 사령관", en: "Longship Commander", ja: "ロングシップ司令官", zh: "维京长船总指挥", es: "Comandante de la nave", fr: "Commandant du drakkar" },
      avatar: "🦑",
      text: {
        ko: "심해의 괴수가 솟구쳐 올랐다! 작살포 발사 준비(F 키)! 놈의 심장을 꿰뚫어 바다의 제물로 삼아라!",
        en: "The deep sea beast surfaces! Ready the harpoon ballista (F key)! Pierce its dark heart!",
        ja: "深海の魔獣が浮上してきた！銛砲発射用意（Fキー）！奴の心臓を貫き海の生贄にしてやれ！",
        zh: "深海巨兽破浪而出！全体就位准备发射鱼叉炮（F键）！贯穿它的心脏祭奠大海！",
        es: "¡La bestia de las profundidades emerge! ¡Preparen el arpón (tecla F)! ¡Atraviesen su corazón!",
        fr: "Le monstre des profondeurs surgit ! Armez le harpon (touche F) ! Transpercez son cœur !",
      },
    },
  ],
  storm_danger: [
    {
      speaker: "shipwright_eirik",
      name: { ko: "목수 에이릭", en: "Shipwright Eirik", ja: "船大工エイリク", zh: "船匠埃里克", es: "Carpintero Eirik", fr: "Charpentier Eirik" },
      title: { ko: "조선소 선박 장인", en: "Master Shipwright", ja: "造船所の巨匠", zh: "维京船厂大师", es: "Maestro de astilleros", fr: "Maître charpentier" },
      avatar: "⚠️",
      text: {
        ko: "선체 균열 경고! 내구도가 30% 이하입니다! 즉시 긴급 수리를 가동하거나 암초에서 멀어지세요!",
        en: "Hull breach warning! Integrity below 30%! Engage emergency repairs or clear the reefs immediately!",
        ja: "船体亀裂警告！耐久度が30%以下です！至急緊急修理を行うか暗礁から離れてください！",
        zh: "长船破损警告！船体耐久度已跌破30%！请立即使用紧急修船技能，或迅速远离暗礁！",
        es: "¡Alerta de vía de agua! ¡Casco al 30%! ¡Usa la reparación de emergencia o aléjate de las rocas!",
        fr: "Alerte brèche de coque ! Intégrité sous 30% ! Utilisez la réparation d'urgence au plus vite !",
      },
    },
  ],
  bifrost_victory: [
    {
      speaker: "chieftain_ragnar",
      name: { ko: "족장 라그나르", en: "Chieftain Ragnar", ja: "族長ラグナル", zh: "酋长拉格纳", es: "Caudillo Ragnar", fr: "Chef Ragnar" },
      title: { ko: "롱쉽의 사령관", en: "Longship Commander", ja: "ロングシップ司令官", zh: "维京长船总指挥", es: "Comandante de la nave", fr: "Commandant du drakkar" },
      avatar: "🌈",
      text: {
        ko: "비프로스트의 무지개 문이 열렸다! 위대한 항해 끝에 발할라의 전당이 눈앞에 펼쳐진다! 승리다!",
        en: "The rainbow gates of Bifrost have opened! Valhalla awaits us after a legendary voyage! Victory!",
        ja: "ビフレストの虹の門が開かれた！偉大なる航海の果てにヴァルハラの殿堂が広がる！勝利だ！",
        zh: "彩虹桥的大门赫然展开！历经史诗般的狂澜航海，英灵殿的神殿就在眼前！维京永恒之胜！",
        es: "¡Las puertas del arcoíris del Bifrost se han abierto! ¡El Valhalla nos espera! ¡Victoria legendaria!",
        fr: "Les portes arc-en-ciel du Bifrost sont ouvertes ! Le Valhalla nous attend ! Victoire légendaire !",
      },
    },
  ],
};

export function pickVikingLongshipDialogue(trigger: VikingLongshipTrigger): VikingLongshipDialogue {
  const list = VIKING_LONGSHIP_DIALOGUES[trigger];
  const idx = Math.floor(Math.random() * list.length);
  return list[idx];
}
