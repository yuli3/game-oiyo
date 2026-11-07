/**
 * 파워워시 3D - 의뢰인 통신 대사 및 로어 시스템
 */

export type PowerWashLoreSpeaker = "mayor_smith" | "mechanic_mike" | "manager_chloe";

export type PowerWashTrigger =
  | "game_start"
  | "part_cleared"
  | "soap_applied"
  | "mutant_spotted"
  | "stage_cleared";

export interface PowerWashDialogue {
  speaker: PowerWashLoreSpeaker;
  name: Record<string, string>;
  title: Record<string, string>;
  avatar: string;
  text: Record<string, string>;
}

export const POWERWASH_DIALOGUES: Record<PowerWashTrigger, PowerWashDialogue[]> = {
  game_start: [
    {
      speaker: "mayor_smith",
      name: { ko: "스미스 촌장", en: "Mayor Smith", ja: "スミス村長", zh: "史密斯镇长", es: "Alcalde Smith", fr: "Maire Smith" },
      title: { ko: "마을 대표", en: "Town Mayor", ja: "街の代表", zh: "小镇代表", es: "Representante", fr: "Maire" },
      avatar: "👨‍🦳",
      text: {
        ko: "어서 오게나! 우리 마을의 명물들이 흙먼지로 뒤덮여 있네. 자네의 고압 분사기를 기대하지!",
        en: "Welcome! Our town treasures are caked in heavy grime. Show us what that washer can do!",
        ja: "ようこそ！街の名物が泥と砂埃で覆われてしまった。君の高圧洗浄機に期待しているよ！",
        zh: "欢迎！小镇上的标志性物件都蒙满了厚尘。期待你的高压清洗机大显身手！",
        es: "¡Bienvenido! Los tesoros del pueblo están cubiertos de barro. ¡Muéstranos tu destreza!",
        fr: "Bienvenue ! Les trésors de la ville sont couverts de crasse. Montrez-nous votre talent !",
      },
    },
    {
      speaker: "mechanic_mike",
      name: { ko: "정비공 마이크", en: "Mechanic Mike", ja: "技師マイク", zh: "机修工迈克", es: "Mecánico Mike", fr: "Mécano Mike" },
      title: { ko: "장비 튜닝 마스터", en: "Equipment Specialist", ja: "装備チューニング職人", zh: "设备整备大师", es: "Especialista", fr: "Spécialiste atelier" },
      avatar: "🔧",
      text: {
        ko: "노즐 회전(Q 키 또는 탭)을 잊지 마. 수평·수직 패턴을 적절히 바꿔야 모서리 때가 잘 빠진다고.",
        en: "Don't forget to rotate the nozzle (Q key or tap). Switching between horizontal and vertical sweeps is key!",
        ja: "ノズル回転（Qキーまたはタップ）を忘れるなよ。水平と垂直を使い分けるのがコツだ。",
        zh: "别忘了旋转喷嘴（Q键或点击）。适时切换水平和垂直方向，缝隙里的污垢才能彻底冲净！",
        es: "¡No olvides girar la boquilla (tecla Q o pulsar)! Cambiar de orientación facilita las esquinas.",
        fr: "N'oubliez pas d'orienter la buse (touche Q ou toucher) ! Alterner horizontal et vertical est capital.",
      },
    },
  ],
  part_cleared: [
    {
      speaker: "manager_chloe",
      name: { ko: "클로이 점장", en: "Chloe", ja: "クロエ店長", zh: "克洛伊店长", es: "Gerente Chloe", fr: "Chloé" },
      title: { ko: "카페 오너", en: "Cafe Owner", ja: "カフェオーナー", zh: "咖啡店长", es: "Dueña de cafetería", fr: "Gérante" },
      avatar: "✨",
      text: {
        ko: "어머! 방금 부품이 새것처럼 맑게 빛났어요! 청량한 딩 소리가 너무 짜릿하네요!",
        en: "Oh my! That piece just gleamed like brand new! That ding sound is so satisfying!",
        ja: "まあ！今洗ったパーツが新品のように輝きました！あの清らかな音がたまらないですね！",
        zh: "天哪！那个部件现在像新出厂一样反光！清脆的叮当声太解压了！",
        es: "¡Oh! ¡Esa pieza acaba de brillar como nueva! ¡Ese sonido es tan gratificante!",
        fr: "Incroyable ! Cette pièce brille comme un sou neuf ! Ce son de validation est si gratifiant !",
      },
    },
    {
      speaker: "mayor_smith",
      name: { ko: "스미스 촌장", en: "Mayor Smith", ja: "スミス村長", zh: "史密斯镇长", es: "Alcalde Smith", fr: "Maire Smith" },
      title: { ko: "마을 대표", en: "Town Mayor", ja: "街の代表", zh: "小镇代表", es: "Representante", fr: "Maire" },
      avatar: "👏",
      text: {
        ko: "좋아, 아주 훌륭해! 남은 부위도 그 흐름대로 말끔하게 씻어내 주게나!",
        en: "Splendid job! Keep that momentum going and scrub the rest clean!",
        ja: "見事だ、素晴らしい！その調子で残りの部分もピカピカにしてくれたまえ！",
        zh: "太棒了，干得漂亮！保持这个节奏，把剩下的部位也冲洗干净！",
        es: "¡Excelente trabajo! ¡Mantén el ritmo y deja el resto impecable!",
        fr: "Magnifique travail ! Continuez sur cette lancée pour le reste !",
      },
    },
  ],
  soap_applied: [
    {
      speaker: "mechanic_mike",
      name: { ko: "정비공 마이크", en: "Mechanic Mike", ja: "技師マイク", zh: "机修工迈克", es: "Mecánico Mike", fr: "Mécano Mike" },
      title: { ko: "장비 튜닝 마스터", en: "Equipment Specialist", ja: "装備チューニング職人", zh: "设备整备大师", es: "Especialista", fr: "Spécialiste atelier" },
      avatar: "🧼",
      text: {
        ko: "폼 캐논으로 비누 거품을 잔뜩 먹여뒀군! 때가 부드럽게 불었으니 수압 노즐로 단숨에 날려버려!",
        en: "Generous soap foam applied! The grime is softened—now blast it away with high pressure!",
        ja: "フォームキャノンで泡をたっぷり塗ったな！汚れが浮いたから、高圧水で一気に吹き飛ばせ！",
        zh: "泡沫喷淋到位了！顽垢已经软化，现在换上高压喷嘴一气呵成冲掉它！",
        es: "¡Buena capa de espuma! La mugre se ha ablandado: ¡ahora arrasa con la alta presión!",
        fr: "Belle couche de mousse savonneuse ! La crasse est ramollie : décollez-la sous haute pression !",
      },
    },
  ],
  mutant_spotted: [
    {
      speaker: "mechanic_mike",
      name: { ko: "정비공 마이크", en: "Mechanic Mike", ja: "技師マイク", zh: "机修工迈克", es: "Mecánico Mike", fr: "Mécano Mike" },
      title: { ko: "장비 튜닝 마스터", en: "Equipment Specialist", ja: "装備チューニング職人", zh: "设备整备大师", es: "Especialista", fr: "Spécialiste atelier" },
      avatar: "⚠️",
      text: {
        ko: "이봐, 저 짙은 얼룩은 일반 수압으론 끄떡없어! 0° 적색 초고압 노즐로 코어를 뚫어버려!",
        en: "Watch out, that stubborn crust won't budge! Switch to the 0° Red pinpoint nozzle to pierce it!",
        ja: "おい、あの頑固な固着汚れは普通じゃ落ちん！0°赤の超高圧ピンポイントで貫け！",
        zh: "注意，那种顽固凝固污垢普通冲洗没用！换0度红色针状喷嘴集中突破！",
        es: "¡Cuidado, esa costra no saldrá fácil! ¡Usa la boquilla roja de 0° para perforarla!",
        fr: "Attention, cette tache incrustée résiste ! Utilisez la buse rouge 0° pour la percer net !",
      },
    },
  ],
  stage_cleared: [
    {
      speaker: "mayor_smith",
      name: { ko: "스미스 촌장", en: "Mayor Smith", ja: "スミス村長", zh: "史密斯镇长", es: "Alcalde Smith", fr: "Maire Smith" },
      title: { ko: "마을 대표", en: "Town Mayor", ja: "街の代表", zh: "小镇代表", es: "Representante", fr: "Maire" },
      avatar: "🏆",
      text: {
        ko: "100% 완전 정화 완결! 온 마을 주민들이 자네의 손길에 감탄하고 있네. 자네야말로 진정한 장인이야!",
        en: "100% Total Cleansing Complete! The whole town is in awe of your work. You are a true master!",
        ja: "100%完全洗浄完了！街中のみんなが君の腕前に感動しているよ。君こそ真の職人だ！",
        zh: "100%全件深度清洗完成！整个小镇都为这焕然一新的光泽惊叹。你当之无愧是清洗大师！",
        es: "¡Limpieza al 100% completada! Todo el pueblo está asombrado por tu destreza. ¡Eres un maestro!",
        fr: "Nettoyage à 100% achevé ! Toute la ville est émerveillée par votre travail. Quel maître !",
      },
    },
  ],
};

export function pickPowerWashDialogue(trigger: PowerWashTrigger): PowerWashDialogue {
  const list = POWERWASH_DIALOGUES[trigger];
  const idx = Math.floor(Math.random() * list.length);
  return list[idx];
}
