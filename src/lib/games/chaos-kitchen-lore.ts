/**
 * 카오스 키친 (ChaosKitchen) - 3인 셰프 페르소나 및 6대 주방 현장 무전 통신 로어 시스템
 */

export interface KitchenSpeaker {
  name: Record<string, string>;
  role: Record<string, string>;
  avatar: string;
}

export const KITCHEN_SPEAKERS: Record<string, KitchenSpeaker> = {
  gordon: {
    name: { ko: "마스터 고든", en: "Master Gordon", ja: "マスター・ゴードン", zh: "戈登总厨", es: "Chef Gordon", fr: "Chef Gordon" },
    role: { ko: "총괄 헤드 셰프", en: "Executive Head Chef", ja: "総括ヘッドシェフ", zh: "行政总厨", es: "Chef Ejecutivo", fr: "Chef Exécutif" },
    avatar: "👨‍🍳",
  },
  olivia: {
    name: { ko: "수셰프 올리비아", en: "Sous Chef Olivia", ja: "スーシェフ・オリビア", zh: "副主厨奥利维亚", es: "Sous Chef Olivia", fr: "Sous-Cheffe Olivia" },
    role: { ko: "라인 조율 및 플레이팅", en: "Line Expediter", ja: "ライン進行・盛り付け", zh: "传菜调度与摆盘", es: "Expedidora de cocina", fr: "Cheffe de partie" },
    avatar: "👩‍🍳",
  },
  charlie: {
    name: { ko: "인턴 찰리", en: "Commis Charlie", ja: "見習いチャーリー", zh: "学徒查理", es: "Aprendiz Charlie", fr: "Commis Charlie" },
    role: { ko: "재료 손질 및 설거지", en: "Prep & Dishwashing", ja: "下ごしらえ・洗い場", zh: "备料与清洗", es: "Preparación y lavado", fr: "Plonge et découpe" },
    avatar: "🧑‍🍳",
  },
};

export interface KitchenTransmission {
  speaker: KitchenSpeaker;
  text: Record<string, string>;
  tag: "order" | "fire" | "prep" | "cheer" | "warn";
}

export const KITCHEN_TRANSMISSIONS: Record<string, KitchenTransmission[]> = {
  kitchen_open: [
    {
      speaker: KITCHEN_SPEAKERS.gordon,
      text: {
        ko: "주방 오픈한다! 손 씻고 도마 닦아! 오늘 손님 한 명이라도 실망시키면 내일 출근할 생각 마!",
        en: "Kitchen open! Wash hands and prep boards! If one customer leaves unsatisfied, you're out!",
        ja: "オープンだ！手洗い板前チェック！1人でも不満客が出たら明日はないと思え！",
        zh: "厨房开市！洗手备案！今天要是怠慢了一位客人，明天就别想踏进这里！",
        es: "¡Cocina abierta! ¡Lavad manos y tablas! ¡Ni un solo cliente insatisfecho hoy!",
        fr: "La cuisine ouvre ! Lavez les mains et préparez les planches ! Zéro erreur tolérée !",
      },
      tag: "order",
    },
    {
      speaker: KITCHEN_SPEAKERS.olivia,
      text: {
        ko: "점심 피크 타임 주문서 들어옵니다! 재료 박스부터 빠르게 채워주세요!",
        en: "Lunch rush tickets incoming! Keep those ingredient crates moving smoothly!",
        ja: "ランチラッシュのオーダーが入ります！まずは木箱の食材を素早く補充しましょう！",
        zh: "午市高峰订单进来了！请优先把各食材箱快速分流！",
        es: "¡Llegan los pedidos de la hora punta! ¡Que no falten ingredientes en la línea!",
        fr: "Le coup de feu du déjeuner commence ! Gardez les ingrédients bien approvisionnés !",
      },
      tag: "prep",
    },
  ],
  chopping_prep: [
    {
      speaker: KITCHEN_SPEAKERS.charlie,
      text: {
        ko: "토마토와 양배추 다다닥 썰고 있습니다! 칼날이 정말 잘 드네요!",
        en: "Chapping tomatoes and crisp lettuce double-time! These knives are razor sharp!",
        ja: "トマトとレタスを高速で千切り中です！包丁の切れ味が最高ですね！",
        zh: "正在飞速切番茄与生菜！这把主厨刀简直太趁手了！",
        es: "¡Picando tomates y lechuga a toda prisa! ¡Estos cuchillos están afiladísimos!",
        fr: "Je découpe les tomates et la laitue à toute allure ! Les lames coupent comme un rasoir !",
      },
      tag: "prep",
    },
  ],
  cooking_stove: [
    {
      speaker: KITCHEN_SPEAKERS.olivia,
      text: {
        ko: "프라이팬에서 고기가 지글지글 익고 있어요! 너무 오래 두면 타버리니 타이밍 보세요!",
        en: "Patties sizzling on the stove! Keep an eye on the heat so they don't scorch to ash!",
        ja: "フライパンでお肉がジューシーに焼けています！焦がさないよう目を離さないで！",
        zh: "牛排正在炉灶上滋滋作响！注意火候，千万别烤焦了！",
        es: "¡La carne chisporrotea en la sartén! ¡Atentos al punto antes de que se queme!",
        fr: "Les steaks crépitent sur le feu ! Surveillez bien la cuisson pour éviter qu'ils ne brûlent !",
      },
      tag: "prep",
    },
  ],
  fire_hazard: [
    {
      speaker: KITCHEN_SPEAKERS.gordon,
      text: {
        ko: "불이야! 프라이팬에 불붙었잖아!! 눈 어디 두고 요리해?! 당장 소화기 가져와!!",
        en: "FIRE! The pan is on bloody fire!! Where are your eyes?! Grab the extinguisher NOW!!",
        ja: "火事だ！フライパンから火が出てるぞ！どこ見て仕事してんだ！消火器を持ってこい！",
        zh: "着火了！平底锅燃起大火了！！眼睛看哪儿呢？！快把灭火器拿过来！！",
        es: "¡FUEGO! ¡La sartén está ardiendo! ¿Dónde tenéis los ojos? ¡Traed el extintor YA!",
        fr: "AU FEU ! La poêle est en flammes !! Où avez-vous la tête ?! L'extincteur, vite !",
      },
      tag: "fire",
    },
    {
      speaker: KITCHEN_SPEAKERS.charlie,
      text: {
        ko: "으악! 하얀 분말 뿜겠습니다! 치이이익-! 주방 불길 진압 완료했어요!",
        en: "Aargh! Spraying safety foam! Pssshhh-! Stove fire suppressed successfully!",
        ja: "うわあ！消火剤噴射します！プシューッ！火勢を完全に鎮圧しました！",
        zh: "哇啊！喷射灭火干粉！呲——！炉灶明火已完全扑灭！",
        es: "¡Aaaah! ¡Rociando espuma de seguridad! ¡Psssshh! ¡Fuego extinguido a tiempo!",
        fr: "Aaaah ! Je pulvérise la mousse ! Pssshhh ! Incendie de la cuisinière éteint !",
      },
      tag: "fire",
    },
  ],
  order_delivered: [
    {
      speaker: KITCHEN_SPEAKERS.gordon,
      text: {
        ko: "좋아! 완벽한 굽기와 플레이팅이야! 팁이 두둑하게 쌓이고 있다, 이 페이스 유지해!",
        en: "Spot on! Perfect sear and presentation! Generous tips pouring in, hold this tempo!",
        ja: "よし！完璧な焼き加減と盛り付けだ！チップが跳ね上がったぞ、このリズムを崩すな！",
        zh: "漂亮！完美的火候与摆盘！丰厚的小费到账了，保持住这个节奏！",
        es: "¡Excelente! ¡Punto de cocción y emplatado impecables! ¡Grandes propinas, mantened el ritmo!",
        fr: "Magnifique ! Cuisson et dressage impeccables ! Les pourboires s'envolent, gardez la cadence !",
      },
      tag: "cheer",
    },
    {
      speaker: KITCHEN_SPEAKERS.olivia,
      text: {
        ko: "손님 테이블 만족도 최고치 달성! 주방 콤보 보너스가 계속 올라가고 있어요!",
        en: "Table satisfaction through the roof! Kitchen combo multipliers are stacking up!",
        ja: "お客様の満足度MAXです！キッチンコンボ倍率がどんどん上がっています！",
        zh: "客席满意度已达巅峰！厨房连击倍率正在一路飙升！",
        es: "¡Satisfacción de los clientes al máximo! ¡Los combos de la cocina se multiplican!",
        fr: "Satisfaction des clients au sommet ! Les multiplicateurs de combo s'accumulent !",
      },
      tag: "cheer",
    },
  ],
  shift_ended: [
    {
      speaker: KITCHEN_SPEAKERS.gordon,
      text: {
        ko: "서비스 종료! 주방 청소하고 장비 재정비해! 오늘 번 별들로 주방 연구소에서 새 칼과 조리기구를 주문하도록!",
        en: "Service closed! Scrub the line and sharpen blades! Spend today's earned stars in the Kitchen Lab!",
        ja: "営業終了！厨房を磨き上げ器具を点検しろ！稼いだスターで研究所から新しい調理器具を揃えろ！",
        zh: "营业结束！清扫灶台打磨刀刃！用今天赚到的金星在后厨研究所购置高级刀具与猛火灶！",
        es: "¡Servicio cerrado! ¡A fregar la línea y afilar hojas! ¡Invertid las estrellas en el Laboratorio!",
        fr: "Service terminé ! Nettoyez le plan de travail ! Dépensez vos étoiles dans le Labo de cuisine !",
      },
      tag: "order",
    },
  ],
};
