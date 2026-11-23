// Six-locale copy for Cheese Factory (2026-11-23). The engine keeps its
// English ids/names; the UI and canvas labels read these tables instead.
import type { CheeseVariety } from "../../lib/games/cheese-factory";

export type CheeseLocale = "ko" | "en" | "ja" | "zh" | "fr" | "es";

export interface CheeseCopy {
  title: string;
  subtitle: string;
  master: string;
  cash: string;
  milk: string;
  shipped: string;
  cellarTemp: string;
  fleet: (n: number) => string;
  inVats: (n: number) => string;
  vatsTitle: string;
  vatsHint: string;
  share: string;
  copied: string;
  climateTitle: string;
  climateHint: string;
  cooler: string;
  warmer: string;
  upgradesTitle: string;
  installed: string;
  report: (o: { revenue: number; wheels: number; cash: number; active: number; temp: string }) => string;
  varieties: Record<CheeseVariety, string>;
  stations: Record<string, string>;
  upgrades: Record<string, string>;
}

export const CHEESE_COPY: Record<CheeseLocale, CheeseCopy> = {
  ko: {
    title: "알프스 치즈 공방",
    subtitle: "우유를 굳히고 숙성시켜 출하하는 공장 경영",
    master: "치즈 장인",
    cash: "금고",
    milk: "원유",
    shipped: "출하한 치즈",
    cellarTemp: "숙성실 온도",
    fleet: (n) => `운반 로봇 ${n}대`,
    inVats: (n) => `공정 중 ${n}개`,
    vatsTitle: "치즈 만들기",
    vatsHint: "원유를 써서 치즈 한 판을 공정에 넣으세요.",
    share: "공장 기록 복사",
    copied: "복사했어요!",
    climateTitle: "숙성실 온도 조절",
    climateHint: "만드는 치즈에 맞게 숙성실 온도를 맞추면 더 빨리 익어요.",
    cooler: "-1°C 시원하게",
    warmer: "+1°C 따뜻하게",
    upgradesTitle: "자동화·확장",
    installed: "설치됨",
    report: (o) => `🧀 알프스 치즈 공방\n• 매출 $${o.revenue} (치즈 ${o.wheels}판 출하)\n• 금고 $${o.cash}\n• 공정 중 ${o.active}개\n• 숙성실 ${o.temp}°C\ngame.oiyo.net`,
    varieties: { mozzarella: "모차렐라", cheddar: "체다", gouda: "고다", roquefort: "블루치즈", parmigiano: "파르미자노" },
    stations: { milk_silo: "원유", pasteurizer: "살균", curd_vat: "응고", press_mold: "압착", salting: "염수", aging_cellar: "숙성", shipping: "출하" },
    upgrades: { milk_pipeline: "대용량 원유 탱크차", automated_agv_1: "운반 로봇 3호기", precision_chiller: "정밀 숙성실 냉각기", artisan_appellation: "장인 원산지 인증" },
  },
  en: {
    title: "Alpine Cheese Workshop",
    subtitle: "Curdle, age and ship cheese in your own factory",
    master: "Master Cheesemaker",
    cash: "Cash",
    milk: "Raw milk",
    shipped: "Cheeses shipped",
    cellarTemp: "Cellar temp",
    fleet: (n) => `${n} carrier bots`,
    inVats: (n) => `${n} in process`,
    vatsTitle: "Make cheese",
    vatsHint: "Spend raw milk to put a batch into the line.",
    share: "Copy factory stats",
    copied: "Copied!",
    climateTitle: "Cellar climate",
    climateHint: "Match the cellar to the cheese you make and it ages faster.",
    cooler: "-1°C cooler",
    warmer: "+1°C warmer",
    upgradesTitle: "Automation & expansion",
    installed: "Installed",
    report: (o) => `🧀 Alpine Cheese Workshop\n• Revenue $${o.revenue} (${o.wheels} wheels shipped)\n• Cash $${o.cash}\n• In process ${o.active}\n• Cellar ${o.temp}°C\ngame.oiyo.net`,
    varieties: { mozzarella: "Mozzarella", cheddar: "Cheddar", gouda: "Gouda", roquefort: "Blue", parmigiano: "Parmesan" },
    stations: { milk_silo: "Milk", pasteurizer: "Heat", curd_vat: "Curd", press_mold: "Press", salting: "Brine", aging_cellar: "Cellar", shipping: "Ship" },
    upgrades: { milk_pipeline: "Big milk tanker", automated_agv_1: "Carrier bot #3", precision_chiller: "Precision cellar chiller", artisan_appellation: "Artisan origin seal" },
  },
  ja: {
    title: "アルプスのチーズ工房",
    subtitle: "牛乳を固めて熟成させ、出荷する工場経営",
    master: "チーズ職人",
    cash: "金庫",
    milk: "生乳",
    shipped: "出荷したチーズ",
    cellarTemp: "熟成庫の温度",
    fleet: (n) => `運搬ロボ ${n}台`,
    inVats: (n) => `工程中 ${n}個`,
    vatsTitle: "チーズを作る",
    vatsHint: "生乳を使ってチーズを1つ工程に入れます。",
    share: "工場の記録をコピー",
    copied: "コピーしました!",
    climateTitle: "熟成庫の温度調整",
    climateHint: "作るチーズに温度を合わせると早く熟成します。",
    cooler: "-1°C 涼しく",
    warmer: "+1°C 暖かく",
    upgradesTitle: "自動化・拡張",
    installed: "設置済み",
    report: (o) => `🧀 アルプスのチーズ工房\n• 売上 $${o.revenue}（チーズ ${o.wheels}個出荷）\n• 金庫 $${o.cash}\n• 工程中 ${o.active}個\n• 熟成庫 ${o.temp}°C\ngame.oiyo.net`,
    varieties: { mozzarella: "モッツァレラ", cheddar: "チェダー", gouda: "ゴーダ", roquefort: "ブルー", parmigiano: "パルミジャーノ" },
    stations: { milk_silo: "生乳", pasteurizer: "殺菌", curd_vat: "凝固", press_mold: "圧搾", salting: "塩水", aging_cellar: "熟成", shipping: "出荷" },
    upgrades: { milk_pipeline: "大容量タンク車", automated_agv_1: "運搬ロボ3号機", precision_chiller: "精密熟成庫クーラー", artisan_appellation: "職人の原産地認証" },
  },
  zh: {
    title: "阿尔卑斯奶酪工坊",
    subtitle: "凝乳、熟成、出货的奶酪工厂经营",
    master: "奶酪大师",
    cash: "金库",
    milk: "生乳",
    shipped: "已出货奶酪",
    cellarTemp: "熟成室温度",
    fleet: (n) => `运输机器人 ${n} 台`,
    inVats: (n) => `加工中 ${n} 个`,
    vatsTitle: "制作奶酪",
    vatsHint: "用生乳把一批奶酪送进生产线。",
    share: "复制工厂记录",
    copied: "已复制！",
    climateTitle: "熟成室温控",
    climateHint: "按所做的奶酪调好熟成室温度，熟得更快。",
    cooler: "-1°C 降温",
    warmer: "+1°C 升温",
    upgradesTitle: "自动化与扩建",
    installed: "已安装",
    report: (o) => `🧀 阿尔卑斯奶酪工坊\n• 收入 $${o.revenue}（出货 ${o.wheels} 个）\n• 金库 $${o.cash}\n• 加工中 ${o.active} 个\n• 熟成室 ${o.temp}°C\ngame.oiyo.net`,
    varieties: { mozzarella: "马苏里拉", cheddar: "切达", gouda: "高达", roquefort: "蓝纹", parmigiano: "帕玛森" },
    stations: { milk_silo: "生乳", pasteurizer: "杀菌", curd_vat: "凝乳", press_mold: "压制", salting: "盐水", aging_cellar: "熟成", shipping: "出货" },
    upgrades: { milk_pipeline: "大容量运奶车", automated_agv_1: "3号运输机器人", precision_chiller: "精密熟成冷却器", artisan_appellation: "匠人原产地认证" },
  },
  fr: {
    title: "Fromagerie alpine",
    subtitle: "Caillez, affinez et expédiez vos fromages",
    master: "Maître fromager",
    cash: "Caisse",
    milk: "Lait cru",
    shipped: "Fromages expédiés",
    cellarTemp: "Température de cave",
    fleet: (n) => `${n} robots porteurs`,
    inVats: (n) => `${n} en cours`,
    vatsTitle: "Fabriquer",
    vatsHint: "Utilisez du lait cru pour lancer une meule dans la chaîne.",
    share: "Copier le bilan",
    copied: "Copié !",
    climateTitle: "Climat de la cave",
    climateHint: "Réglez la cave selon le fromage : il s'affine plus vite.",
    cooler: "-1°C plus frais",
    warmer: "+1°C plus chaud",
    upgradesTitle: "Automatisation et agrandissement",
    installed: "Installé",
    report: (o) => `🧀 Fromagerie alpine\n• Recettes $${o.revenue} (${o.wheels} meules expédiées)\n• Caisse $${o.cash}\n• En cours ${o.active}\n• Cave ${o.temp}°C\ngame.oiyo.net`,
    varieties: { mozzarella: "Mozzarella", cheddar: "Cheddar", gouda: "Gouda", roquefort: "Bleu", parmigiano: "Parmesan" },
    stations: { milk_silo: "Lait", pasteurizer: "Chauffe", curd_vat: "Caillé", press_mold: "Presse", salting: "Saumure", aging_cellar: "Cave", shipping: "Envoi" },
    upgrades: { milk_pipeline: "Grand camion-citerne", automated_agv_1: "Robot porteur n°3", precision_chiller: "Refroidisseur de cave", artisan_appellation: "Label d'origine artisanal" },
  },
  es: {
    title: "Quesería alpina",
    subtitle: "Cuaja, cura y envía quesos en tu propia fábrica",
    master: "Maestro quesero",
    cash: "Caja",
    milk: "Leche cruda",
    shipped: "Quesos enviados",
    cellarTemp: "Temperatura de cava",
    fleet: (n) => `${n} robots de carga`,
    inVats: (n) => `${n} en proceso`,
    vatsTitle: "Hacer queso",
    vatsHint: "Gasta leche cruda para meter una pieza en la línea.",
    share: "Copiar estadísticas",
    copied: "¡Copiado!",
    climateTitle: "Clima de la cava",
    climateHint: "Ajusta la cava al queso que haces y madura más rápido.",
    cooler: "-1°C más fresco",
    warmer: "+1°C más cálido",
    upgradesTitle: "Automatización y ampliación",
    installed: "Instalado",
    report: (o) => `🧀 Quesería alpina\n• Ingresos $${o.revenue} (${o.wheels} piezas enviadas)\n• Caja $${o.cash}\n• En proceso ${o.active}\n• Cava ${o.temp}°C\ngame.oiyo.net`,
    varieties: { mozzarella: "Mozzarella", cheddar: "Cheddar", gouda: "Gouda", roquefort: "Azul", parmigiano: "Parmesano" },
    stations: { milk_silo: "Leche", pasteurizer: "Calor", curd_vat: "Cuajo", press_mold: "Prensa", salting: "Salmuera", aging_cellar: "Cava", shipping: "Envío" },
    upgrades: { milk_pipeline: "Cisterna grande", automated_agv_1: "Robot de carga n.º 3", precision_chiller: "Enfriador de cava", artisan_appellation: "Sello de origen artesanal" },
  },
};

export function cheeseCopy(locale: string | undefined): CheeseCopy {
  return CHEESE_COPY[(locale ?? "en") as CheeseLocale] ?? CHEESE_COPY.en;
}
