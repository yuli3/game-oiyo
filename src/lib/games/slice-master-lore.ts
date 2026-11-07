/**
 * 상황별 도검 장인 및 감정사 대사 통신 HUD for SliceMaster 3D
 */

export interface SliceLoreSpeaker {
  id: string;
  name: Record<string, string>;
  role: Record<string, string>;
  avatar: string;
}

export const SLICE_SPEAKERS: Record<string, SliceLoreSpeaker> = {
  hanzo: {
    id: "hanzo",
    name: {
      ko: "장인 한조",
      en: "Master Hanzo",
      ja: "匠・半蔵",
      zh: "匠人半藏",
      es: "Maestro Hanzo",
      fr: "Maître Hanzo",
    },
    role: {
      ko: "전설의 대장장이",
      en: "Legendary Bladesmith",
      ja: "伝説の刀鍛冶",
      zh: "传说道匠",
      es: "Herrero Legendario",
      fr: "Forgeron Légendaire",
    },
    avatar: "⚔️",
  },
  ren: {
    id: "ren",
    name: {
      ko: "감정사 렌",
      en: "Ren the Appraiser",
      ja: "鑑定士レン",
      zh: "鉴宝师莲",
      es: "Ren el Tasador",
      fr: "Ren l'Expert",
    },
    role: {
      ko: "골동품 및 명검 수집가",
      en: "Antique & Blade Collector",
      ja: "古美術・名刀コレクター",
      zh: "古董与名剑收藏家",
      es: "Coleccionista de Espadas",
      fr: "Collectionneur de Lames",
    },
    avatar: "📜",
  },
  apprentice: {
    id: "apprentice",
    name: {
      ko: "제자 유우키",
      en: "Apprentice Yuuki",
      ja: "弟子ユウキ",
      zh: "学徒勇树",
      es: "Aprendiz Yuuki",
      fr: "Apprenti Yuuki",
    },
    role: {
      ko: "대장간 조수",
      en: "Forge Assistant",
      ja: "鍛冶場助手",
      zh: "铁匠学徒",
      es: "Asistente de Forja",
      fr: "Assistant de Forge",
    },
    avatar: "🔨",
  },
};

export interface SliceCommsLog {
  id: string;
  speakerId: "hanzo" | "ren" | "apprentice";
  message: Record<string, string>;
}

export const SLICE_COMMS_LOGS: Record<string, SliceCommsLog> = {
  start: {
    id: "start",
    speakerId: "hanzo",
    message: {
      ko: "칼날의 호흡을 느껴라. 칼끝이 과녁을 향할 때 뛰어오르는 거다!",
      en: "Feel the rhythm of the edge. Leap when the tip faces your mark!",
      ja: "刃の呼吸を感じろ。切っ先が的を向いた瞬間に跳ぶのだ！",
      zh: "感受刀刃的呼吸。当刀尖指向目标时腾空而起！",
      es: "Siente el ritmo del filo. ¡Salta cuando la punta señale tu objetivo!",
      fr: "Ressentez le souffle de la lame. Sautez quand la pointe vise la cible !",
    },
  },
  center_cut: {
    id: "center_cut",
    speakerId: "hanzo",
    message: {
      ko: "일도양단! 군더더기 없는 아름다운 절단선이다!",
      en: "Clean slice! An immaculate, effortless cut!",
      ja: "見事な一刀両断！無駄のない美しい切断面だ！",
      zh: "漂亮的一刀两断！毫无杂质的完美切线！",
      es: "¡Corte perfecto! ¡Una línea de corte impecable!",
      fr: "Coupe nette ! Une trajectoire de lame absolument sublime !",
    },
  },
  combo_streak: {
    id: "combo_streak",
    speakerId: "ren",
    message: {
      ko: "오오! 공중에서 춤추듯 사물을 베어가르는군요. 최고의 손맛입니다!",
      en: "Magnificent! Slicing through the air like a dancer. Peak tactile bliss!",
      ja: "おお！空中を舞うように斬り抜ける…最高の極みです！",
      zh: "噢！如在空中起舞般的连击斩切，绝妙的手感！",
      es: "¡Magnífico! Cortando en el aire como una danza. ¡Pura satisfacción!",
      fr: "Magnifique ! Trancher en plein vol telle une danse aérienne !",
    },
  },
  golden_found: {
    id: "golden_found",
    speakerId: "ren",
    message: {
      ko: "저 번쩍이는 것은… 전설의 황금 피냐타입니다! 반드시 베어내세요!",
      en: "Look at that gleam... It's the legendary Golden Piñata! Slice it open!",
      ja: "あの輝きは…伝説の黄金ピニャータ！必ずや斬り落としてください！",
      zh: "那闪烁的光芒是…传说的黄金皮纳塔！请务必将其斩开！",
      es: "Ese brillo... ¡Es la mítica piñata dorada! ¡Córtala ya!",
      fr: "Cet éclat doré... C'est la piñata légendaire ! Tranchez-la !",
    },
  },
  finish: {
    id: "finish",
    speakerId: "apprentice",
    message: {
      ko: "과녁 정중앙에 명중! 장인님, 역사에 남을 명검의 탄생입니다!",
      en: "Bullseye right in the center! Master, this blade makes history!",
      ja: "的の中心に見事命中！師匠、歴史に残る名刀の誕生です！",
      zh: "命中靶心！师父，这是足以载入史册的名剑出世！",
      es: "¡Blanco directo al centro! ¡Maestro, esta espada pasa a la historia!",
      fr: "En plein dans le mille ! Maître, une lame légendaire est née !",
    },
  },
  failed: {
    id: "failed",
    speakerId: "hanzo",
    message: {
      ko: "칼자루로 떨어지면 부러질 뿐이다. 칼날의 각도를 다시 다듬어라.",
      en: "Landing flat only breaks the steel. Recalibrate your blade angle.",
      ja: "柄から落ちては折れるだけだ。刃の角度を立て直せ。",
      zh: "以刀柄着地只会折损钢刃。重新校准你的刀尖角度吧。",
      es: "Caer sobre el mango solo romperá el acero. Reajusta tu ángulo.",
      fr: "Atterrir sur le manche brisera l'acier. Réajustez l'angle de coupe.",
    },
  },
};
