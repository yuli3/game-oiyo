import { useState } from "react";
import type { Locale } from "../../lib/i18n";

interface Props {
  locale: Locale;
}

type Destination =
  | "japan"
  | "thailand"
  | "europe"
  | "usa"
  | "southeast_asia"
  | "australia"
  | "china"
  | "taiwan"
  | "vietnam"
  | "other";

type AccomGrade = "hostel" | "3star" | "4star" | "5star";
type FlightClass = "economy" | "business";

interface DestinationData {
  flightEconomy: number; // KRW per person (one-way)
  flightBusiness: number;
  accom: Record<AccomGrade, number>; // KRW per room per night
  food: number; // KRW per person per day
  transport: number; // KRW per person per day
  tourism: number; // KRW per person per day
  tips: Record<Locale, string[]>;
}

const DESTINATION_DATA: Record<Destination, DestinationData> = {
  japan: {
    flightEconomy: 350000,
    flightBusiness: 1200000,
    accom: { hostel: 30000, "3star": 80000, "4star": 150000, "5star": 280000 },
    food: 40000,
    transport: 20000,
    tourism: 30000,
    tips: {
      ko: ["JR패스 구매로 교통비 절약", "코ン비니 음식 활용으로 식비 절감", "숙소는 캡슐호텔 또는 비즈니스호텔 고려"],
      en: ["Buy JR Pass for transport savings", "Eat at convenience stores to save on food", "Consider capsule hotels or business hotels"],
      ja: ["JRパスで交通費節約", "コンビニグルメで食費を抑える", "カプセルホテルやビジネスホテルを検討"],
      fr: ["Achetez le JR Pass pour économiser", "Mangez dans les konbini", "Envisagez les hôtels capsules"],
      es: ["Compra el JR Pass para transporte", "Come en konbini para ahorrar", "Considera hoteles cápsula"],
      zh: ["购买JR Pass节省交通费", "便利店饮食节省餐饮费", "考虑胶囊酒店或商务酒店"],
    },
  },
  thailand: {
    flightEconomy: 400000,
    flightBusiness: 1500000,
    accom: { hostel: 15000, "3star": 50000, "4star": 100000, "5star": 220000 },
    food: 20000,
    transport: 10000,
    tourism: 25000,
    tips: {
      ko: ["그랩 앱 활용으로 교통비 절감", "로컬 시장 음식으로 식비 절약", "시즌 오프(5-10월) 여행으로 항공 및 숙박 절약"],
      en: ["Use Grab app to save on transport", "Eat at local markets for cheap food", "Travel in low season (May-Oct) for deals"],
      ja: ["Grabアプリで交通費節約", "ローカル市場で食費節約", "オフシーズン（5〜10月）旅行で節約"],
      fr: ["Utilisez Grab pour les transports", "Mangez dans les marchés locaux", "Voyagez hors saison (mai-oct)"],
      es: ["Usa Grab para transporte", "Come en mercados locales", "Viaja en temporada baja (may-oct)"],
      zh: ["使用Grab节省交通费", "在当地市场用餐省钱", "淡季（5-10月）旅行省费用"],
    },
  },
  europe: {
    flightEconomy: 900000,
    flightBusiness: 3500000,
    accom: { hostel: 45000, "3star": 130000, "4star": 220000, "5star": 450000 },
    food: 60000,
    transport: 35000,
    tourism: 40000,
    tips: {
      ko: ["유레일패스 구매로 교통비 절감", "에어비앤비 또는 호스텔 활용", "슈퍼마켓 음식으로 식비 절약"],
      en: ["Buy Eurail Pass for train travel", "Use Airbnb or hostels for accommodation", "Shop at supermarkets for budget meals"],
      ja: ["ユーレイルパスで交通費節約", "エアビーやホステル活用", "スーパーで食費節約"],
      fr: ["Achetez un Eurail Pass", "Utilisez Airbnb ou les auberges", "Faites vos courses au supermarché"],
      es: ["Compra un Eurail Pass", "Usa Airbnb o albergues", "Compra en supermercados"],
      zh: ["购买欧铁通票节省交通费", "使用Airbnb或青旅住宿", "在超市购物节省餐费"],
    },
  },
  usa: {
    flightEconomy: 850000,
    flightBusiness: 3200000,
    accom: { hostel: 40000, "3star": 120000, "4star": 200000, "5star": 420000 },
    food: 55000,
    transport: 40000,
    tourism: 45000,
    tips: {
      ko: ["CityPASS로 관광지 할인 혜택", "우버/리프트 앱으로 교통비 절감", "항공권 조기 구매로 비용 절약"],
      en: ["Use CityPASS for attraction discounts", "Uber/Lyft for affordable transport", "Book flights early for best prices"],
      ja: ["CityPASSで観光割引", "ウーバー/リフトで交通費節約", "早期予約で航空券を安く"],
      fr: ["Utilisez CityPASS pour les réductions", "Uber/Lyft pour les transports", "Réservez tôt pour les billets d'avion"],
      es: ["Usa CityPASS para descuentos", "Uber/Lyft para transporte", "Reserva vuelos con antelación"],
      zh: ["使用CityPASS获得景点折扣", "Uber/Lyft节省交通费", "提前购买机票节省费用"],
    },
  },
  southeast_asia: {
    flightEconomy: 450000,
    flightBusiness: 1800000,
    accom: { hostel: 12000, "3star": 45000, "4star": 90000, "5star": 200000 },
    food: 18000,
    transport: 8000,
    tourism: 20000,
    tips: {
      ko: ["저가항공사(에어아시아 등) 활용", "그랩 앱으로 교통비 절감", "로컬 투어 이용으로 관광 비용 절약"],
      en: ["Use budget airlines like AirAsia", "Grab app for cheap transport", "Join local tours for affordable sightseeing"],
      ja: ["格安航空会社（エアアジア等）利用", "Grabで交通費節約", "ローカルツアーで観光費節約"],
      fr: ["Utilisez des low-cost (AirAsia)", "Grab pour les transports", "Rejoignez des tours locaux"],
      es: ["Usa aerolíneas low-cost como AirAsia", "Grab para transporte", "Únete a tours locales"],
      zh: ["使用廉价航空（亚航等）", "Grab节省交通费", "参加当地旅游团节省费用"],
    },
  },
  australia: {
    flightEconomy: 750000,
    flightBusiness: 2800000,
    accom: { hostel: 35000, "3star": 110000, "4star": 190000, "5star": 380000 },
    food: 50000,
    transport: 30000,
    tourism: 40000,
    tips: {
      ko: ["Opal 카드 구매로 대중교통 할인", "한인 마트 활용으로 식비 절감", "워킹홀리데이 시즌 피크 시즌 피하기"],
      en: ["Buy Opal card for transit discounts", "Cook your own meals to save on food", "Avoid peak summer season for lower prices"],
      ja: ["Opalカードで交通費節約", "自炊で食費節約", "ピークシーズンを避けて節約"],
      fr: ["Achetez un Opal card", "Cuisinez vous-même pour économiser", "Évitez la haute saison estivale"],
      es: ["Compra tarjeta Opal para transporte", "Cocina tus propias comidas", "Evita la temporada alta de verano"],
      zh: ["购买Opal卡享受交通折扣", "自炊节省餐饮费用", "避开夏季旺季以降低费用"],
    },
  },
  china: {
    flightEconomy: 300000,
    flightBusiness: 1100000,
    accom: { hostel: 20000, "3star": 60000, "4star": 120000, "5star": 250000 },
    food: 25000,
    transport: 12000,
    tourism: 25000,
    tips: {
      ko: ["VPN 앱 사전 준비 필수", "알리페이/위챗페이 사전 등록으로 결제 편리", "고속철도(고철) 활용으로 교통비 절감"],
      en: ["Install VPN before arriving", "Set up Alipay/WeChat Pay in advance", "Use high-speed rail for affordable travel"],
      ja: ["VPNを事前にインストール", "アリペイ/ウィチャットペイを事前設定", "高速鉄道で交通費節約"],
      fr: ["Installez un VPN avant d'arriver", "Configurez Alipay/WeChat Pay à l'avance", "Utilisez le TGV chinois"],
      es: ["Instala VPN antes de llegar", "Configura Alipay/WeChat Pay antes", "Usa el tren de alta velocidad"],
      zh: ["提前安装VPN", "提前注册支付宝/微信支付", "使用高铁节省交通费"],
    },
  },
  taiwan: {
    flightEconomy: 280000,
    flightBusiness: 1000000,
    accom: { hostel: 22000, "3star": 65000, "4star": 130000, "5star": 260000 },
    food: 22000,
    transport: 10000,
    tourism: 20000,
    tips: {
      ko: ["이지카드로 대중교통 할인 혜택", "야시장 음식으로 저렴하게 식사", "고속철도 조기 예약 할인 활용"],
      en: ["Use EasyCard for transit discounts", "Eat at night markets for cheap eats", "Book HSR tickets early for discounts"],
      ja: ["イージーカードで交通費節約", "夜市グルメで食費節約", "高鉄早期予約割引活用"],
      fr: ["Utilisez l'EasyCard pour les transports", "Mangez dans les night markets", "Réservez le HSR en avance"],
      es: ["Usa EasyCard para transporte", "Come en los mercados nocturnos", "Reserva HSR con anticipación"],
      zh: ["使用悠游卡享受交通折扣", "在夜市吃饭便宜实惠", "提前预订高铁享受折扣"],
    },
  },
  vietnam: {
    flightEconomy: 380000,
    flightBusiness: 1400000,
    accom: { hostel: 10000, "3star": 40000, "4star": 80000, "5star": 180000 },
    food: 15000,
    transport: 7000,
    tourism: 18000,
    tips: {
      ko: ["그랩 바이크로 저렴한 시내 이동", "쌀국수·반미 등 로컬 음식 활용", "하노이·호치민 저가 투어 이용"],
      en: ["Use GrabBike for cheap city travel", "Eat local dishes like pho and banh mi", "Join budget tours in Hanoi/Ho Chi Minh"],
      ja: ["グラブバイクで安く市内移動", "フォーやバインミー等ローカル料理", "ハノイ・ホーチミンのお得なツアー"],
      fr: ["Utilisez GrabBike pour vous déplacer", "Mangez du pho et du bánh mì", "Rejoignez des tours économiques"],
      es: ["Usa GrabBike para moverte", "Come pho y bánh mì locales", "Únete a tours económicos"],
      zh: ["使用Grab摩托车便宜出行", "吃当地河粉、法棍等省钱", "参加河内/胡志明市低价旅游团"],
    },
  },
  other: {
    flightEconomy: 600000,
    flightBusiness: 2200000,
    accom: { hostel: 25000, "3star": 70000, "4star": 140000, "5star": 300000 },
    food: 35000,
    transport: 20000,
    tourism: 30000,
    tips: {
      ko: ["항공권 조기 예약으로 비용 절감", "숙소 예약 시 취소 가능 요금 선택", "환전은 현지 ATM 또는 환전소 비교"],
      en: ["Book flights early for best fares", "Choose refundable rates when booking hotels", "Compare ATM and exchange office rates"],
      ja: ["早期予約で航空券を安く", "キャンセル可能なホテル料金を選択", "ATMと両替所のレートを比較"],
      fr: ["Réservez tôt pour les billets d'avion", "Choisissez des tarifs remboursables", "Comparez ATM et bureaux de change"],
      es: ["Reserva vuelos con antelación", "Elige tarifas reembolsables en hoteles", "Compara tarifas de ATM y casas de cambio"],
      zh: ["提前购买机票节省费用", "预订酒店时选择可取消价格", "比较ATM和换汇点汇率"],
    },
  },
};

const DESTINATION_NAMES: Record<Destination, Record<Locale, string>> = {
  japan: { ko: "일본", en: "Japan", ja: "日本", fr: "Japon", es: "Japón", zh: "日本", },
  thailand: { ko: "태국", en: "Thailand", ja: "タイ", fr: "Thaïlande", es: "Tailandia", zh: "泰国", },
  europe: { ko: "유럽", en: "Europe", ja: "ヨーロッパ", fr: "Europe", es: "Europa", zh: "欧洲", },
  usa: { ko: "미국", en: "USA", ja: "アメリカ", fr: "États-Unis", es: "EE.UU.", zh: "美国", },
  southeast_asia: { ko: "동남아", en: "SE Asia", ja: "東南アジア", fr: "Asie du Sud-Est", es: "SE Asia", zh: "东南亚", },
  australia: { ko: "호주", en: "Australia", ja: "オーストラリア", fr: "Australie", es: "Australia", zh: "澳大利亚", },
  china: { ko: "중국", en: "China", ja: "中国", fr: "Chine", es: "China", zh: "中国", },
  taiwan: { ko: "대만", en: "Taiwan", ja: "台湾", fr: "Taïwan", es: "Taiwán", zh: "台湾", },
  vietnam: { ko: "베트남", en: "Vietnam", ja: "ベトナム", fr: "Vietnam", es: "Vietnam", zh: "越南", },
  other: { ko: "기타", en: "Other", ja: "その他", fr: "Autre", es: "Otro", zh: "其他", },
};

const ACCOM_NAMES: Record<AccomGrade, Record<Locale, string>> = {
  hostel: { ko: "호스텔", en: "Hostel", ja: "ホステル", fr: "Auberge", es: "Albergue", zh: "青旅", },
  "3star": { ko: "3성급", en: "3-Star", ja: "3つ星", fr: "3 étoiles", es: "3 estrellas", zh: "三星级", },
  "4star": { ko: "4성급", en: "4-Star", ja: "4つ星", fr: "4 étoiles", es: "4 estrellas", zh: "四星级", },
  "5star": { ko: "5성급", en: "5-Star", ja: "5つ星", fr: "5 étoiles", es: "5 estrellas", zh: "五星级", },
};

const FLIGHT_NAMES: Record<FlightClass, Record<Locale, string>> = {
  economy: { ko: "이코노미", en: "Economy", ja: "エコノミー", fr: "Économique", es: "Económica", zh: "经济舱", },
  business: { ko: "비즈니스", en: "Business", ja: "ビジネス", fr: "Affaires", es: "Business", zh: "商务舱", },
};

const UI: Record<
  Locale,
  {
    title: string;
    subtitle: string;
    destinationLabel: string;
    nightsLabel: string;
    nightsUnit: string;
    peopleLabel: string;
    peopleUnit: string;
    accomLabel: string;
    flightLabel: string;
    calcBtn: string;
    resetBtn: string;
    breakdownTitle: string;
    totalTitle: string;
    perPersonTitle: string;
    tipsTitle: string;
    flightItem: string;
    accomItem: string;
    foodItem: string;
    transportItem: string;
    tourismItem: string;
    estimateNote: string;
  }
> = {
  ko: {
    title: "여행 예산 계산기",
    subtitle: "목적지별 예상 여행 비용 계산",
    destinationLabel: "여행지",
    nightsLabel: "여행 기간",
    nightsUnit: "박",
    peopleLabel: "인원수",
    peopleUnit: "명",
    accomLabel: "숙소 등급",
    flightLabel: "항공 클래스",
    calcBtn: "예산 계산",
    resetBtn: "다시 계산",
    breakdownTitle: "항목별 예상 비용",
    totalTitle: "총 예산",
    perPersonTitle: "1인당 예산",
    tipsTitle: "예산 절약 팁",
    flightItem: "항공편",
    accomItem: "숙박",
    foodItem: "식비",
    transportItem: "현지 교통",
    tourismItem: "관광·쇼핑",
    estimateNote: "* 예상 비용이며 실제 비용은 다를 수 있습니다",
  },
  en: {
    title: "Travel Budget Calculator",
    subtitle: "Estimate your travel costs by destination",
    destinationLabel: "Destination",
    nightsLabel: "Duration",
    nightsUnit: "nights",
    peopleLabel: "People",
    peopleUnit: "pax",
    accomLabel: "Accommodation",
    flightLabel: "Flight Class",
    calcBtn: "Calculate Budget",
    resetBtn: "Reset",
    breakdownTitle: "Cost Breakdown",
    totalTitle: "Total Budget",
    perPersonTitle: "Per Person",
    tipsTitle: "Money-Saving Tips",
    flightItem: "Flights",
    accomItem: "Accommodation",
    foodItem: "Food",
    transportItem: "Local Transport",
    tourismItem: "Tourism & Shopping",
    estimateNote: "* Estimated costs — actual may vary",
  },
  ja: {
    title: "旅行予算計算機",
    subtitle: "目的地別旅行費用の見積もり",
    destinationLabel: "目的地",
    nightsLabel: "旅行期間",
    nightsUnit: "泊",
    peopleLabel: "人数",
    peopleUnit: "名",
    accomLabel: "宿泊施設",
    flightLabel: "フライトクラス",
    calcBtn: "予算を計算",
    resetBtn: "リセット",
    breakdownTitle: "費用内訳",
    totalTitle: "合計予算",
    perPersonTitle: "1人あたり",
    tipsTitle: "節約のヒント",
    flightItem: "航空券",
    accomItem: "宿泊",
    foodItem: "食費",
    transportItem: "現地交通",
    tourismItem: "観光・ショッピング",
    estimateNote: "* 概算費用です。実際の費用は異なる場合があります",
  },
  fr: {
    title: "Calculateur de budget voyage",
    subtitle: "Estimez vos coûts de voyage par destination",
    destinationLabel: "Destination",
    nightsLabel: "Durée",
    nightsUnit: "nuits",
    peopleLabel: "Personnes",
    peopleUnit: "pers.",
    accomLabel: "Hébergement",
    flightLabel: "Classe de vol",
    calcBtn: "Calculer le budget",
    resetBtn: "Réinitialiser",
    breakdownTitle: "Détail des coûts",
    totalTitle: "Budget total",
    perPersonTitle: "Par personne",
    tipsTitle: "Conseils pour économiser",
    flightItem: "Vols",
    accomItem: "Hébergement",
    foodItem: "Nourriture",
    transportItem: "Transport local",
    tourismItem: "Tourisme & Shopping",
    estimateNote: "* Coûts estimatifs — peut varier",
  },
  es: {
    title: "Calculadora de presupuesto de viaje",
    subtitle: "Estima tus costos de viaje por destino",
    destinationLabel: "Destino",
    nightsLabel: "Duración",
    nightsUnit: "noches",
    peopleLabel: "Personas",
    peopleUnit: "pers.",
    accomLabel: "Alojamiento",
    flightLabel: "Clase de vuelo",
    calcBtn: "Calcular presupuesto",
    resetBtn: "Reiniciar",
    breakdownTitle: "Desglose de costos",
    totalTitle: "Presupuesto total",
    perPersonTitle: "Por persona",
    tipsTitle: "Consejos para ahorrar",
    flightItem: "Vuelos",
    accomItem: "Alojamiento",
    foodItem: "Comida",
    transportItem: "Transporte local",
    tourismItem: "Turismo y compras",
    estimateNote: "* Costos estimados — puede variar",
  },
  zh: {
    title: "旅行预算计算器",
    subtitle: "按目的地估算旅行费用",
    destinationLabel: "目的地",
    nightsLabel: "旅行时长",
    nightsUnit: "晚",
    peopleLabel: "人数",
    peopleUnit: "人",
    accomLabel: "住宿等级",
    flightLabel: "航班舱位",
    calcBtn: "计算预算",
    resetBtn: "重置",
    breakdownTitle: "费用明细",
    totalTitle: "总预算",
    perPersonTitle: "人均费用",
    tipsTitle: "省钱小贴士",
    flightItem: "机票",
    accomItem: "住宿",
    foodItem: "餐饮",
    transportItem: "当地交通",
    tourismItem: "观光·购物",
    estimateNote: "* 估算费用，实际可能有所不同",
  },
};

function fmtKRW(amount: number): string {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

const DESTINATIONS: Destination[] = [
  "japan", "thailand", "europe", "usa", "southeast_asia",
  "australia", "china", "taiwan", "vietnam", "other",
];

const ACCOM_GRADES: AccomGrade[] = ["hostel", "3star", "4star", "5star"];
const FLIGHT_CLASSES: FlightClass[] = ["economy", "business"];

interface BudgetResult {
  flight: number;
  accom: number;
  food: number;
  transport: number;
  tourism: number;
  total: number;
  perPerson: number;
}

export default function TravelBudgetCalculator({ locale }: Props) {
  const t = UI[locale] ?? UI.en;

  const [destination, setDestination] = useState<Destination>("japan");
  const [nights, setNights] = useState(5);
  const [people, setPeople] = useState(2);
  const [accom, setAccom] = useState<AccomGrade>("3star");
  const [flightClass, setFlightClass] = useState<FlightClass>("economy");
  const [result, setResult] = useState<BudgetResult | null>(null);

  function calculate() {
    const data = DESTINATION_DATA[destination];
    const flightCost =
      (flightClass === "economy" ? data.flightEconomy : data.flightBusiness) *
      2 * // round trip
      people;
    const accomCost = data.accom[accom] * nights;
    const foodCost = data.food * people * nights;
    const transportCost = data.transport * people * nights;
    const tourismCost = data.tourism * people * nights;
    const total = flightCost + accomCost + foodCost + transportCost + tourismCost;

    setResult({
      flight: flightCost,
      accom: accomCost,
      food: foodCost,
      transport: transportCost,
      tourism: tourismCost,
      total,
      perPerson: total / people,
    });
  }

  function reset() {
    setDestination("japan");
    setNights(5);
    setPeople(2);
    setAccom("3star");
    setFlightClass("economy");
    setResult(null);
  }

  const tips = result
    ? DESTINATION_DATA[destination].tips[locale] ??
      DESTINATION_DATA[destination].tips.en
    : null;

  const breakdownItems = result
    ? [
        { label: t.flightItem, value: result.flight },
        { label: t.accomItem, value: result.accom },
        { label: t.foodItem, value: result.food },
        { label: t.transportItem, value: result.transport },
        { label: t.tourismItem, value: result.tourism },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">
          {t.title}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {t.subtitle}
        </p>
      </div>

      {/* Form */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
        {/* Destination */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t.destinationLabel}
          </label>
          <select
            value={destination}
            onChange={(e) => { setDestination(e.target.value as Destination); setResult(null); }}
            className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            {DESTINATIONS.map((d) => (
              <option key={d} value={d}>
                {DESTINATION_NAMES[d][locale] ?? DESTINATION_NAMES[d].en}
              </option>
            ))}
          </select>
        </div>

        {/* Nights & People */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.nightsLabel}
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setNights((n) => Math.max(1, n - 1)); setResult(null); }}
                className="w-9 h-9 rounded-lg border border-gray-300 bg-gray-50 font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
              >
                −
              </button>
              <span className="flex-1 text-center text-lg font-bold text-gray-900">
                {nights}
                <span className="text-sm font-normal ml-1 text-gray-500">{t.nightsUnit}</span>
              </span>
              <button
                onClick={() => { setNights((n) => Math.min(30, n + 1)); setResult(null); }}
                className="w-9 h-9 rounded-lg border border-gray-300 bg-gray-50 font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
              >
                +
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.peopleLabel}
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setPeople((p) => Math.max(1, p - 1)); setResult(null); }}
                className="w-9 h-9 rounded-lg border border-gray-300 bg-gray-50 font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
              >
                −
              </button>
              <span className="flex-1 text-center text-lg font-bold text-gray-900">
                {people}
                <span className="text-sm font-normal ml-1 text-gray-500">{t.peopleUnit}</span>
              </span>
              <button
                onClick={() => { setPeople((p) => Math.min(8, p + 1)); setResult(null); }}
                className="w-9 h-9 rounded-lg border border-gray-300 bg-gray-50 font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Accom & Flight */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.accomLabel}
            </label>
            <select
              value={accom}
              onChange={(e) => { setAccom(e.target.value as AccomGrade); setResult(null); }}
              className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              {ACCOM_GRADES.map((g) => (
                <option key={g} value={g}>
                  {ACCOM_NAMES[g][locale] ?? ACCOM_NAMES[g].en}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.flightLabel}
            </label>
            <select
              value={flightClass}
              onChange={(e) => { setFlightClass(e.target.value as FlightClass); setResult(null); }}
              className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              {FLIGHT_CLASSES.map((fc) => (
                <option key={fc} value={fc}>
                  {FLIGHT_NAMES[fc][locale] ?? FLIGHT_NAMES[fc].en}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={calculate}
          className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3 font-semibold text-white shadow-md hover:from-emerald-600 hover:to-teal-600 transition-all"
        >
          {t.calcBtn}
        </button>
      </div>

      {/* Result */}
      {result !== null && (
        <div className="space-y-4">
          {/* Totals */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-5 text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
                {t.totalTitle}
              </p>
              <p className="mt-2 text-2xl font-extrabold text-emerald-700">
                {fmtKRW(result.total)}
              </p>
            </div>
            <div className="rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 to-cyan-50 p-5 text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-teal-600">
                {t.perPersonTitle}
              </p>
              <p className="mt-2 text-2xl font-extrabold text-teal-700">
                {fmtKRW(result.perPerson)}
              </p>
            </div>
          </div>

          {/* Breakdown */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              {t.breakdownTitle}
            </h3>
            <div className="space-y-2">
              {breakdownItems.map(({ label, value }) => {
                const pct = result.total > 0 ? (value / result.total) * 100 : 0;
                return (
                  <div key={label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{label}</span>
                      <span className="font-semibold text-gray-900">
                        {fmtKRW(value)}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tips */}
          {tips && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <h3 className="text-sm font-semibold text-amber-700 mb-3">
                {t.tipsTitle}
              </h3>
              <ul className="space-y-2">
                {tips.map((tip, i) => (
                  <li key={i} className="flex gap-2 text-sm text-amber-800">
                    <span className="mt-0.5 text-amber-500">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-xs text-center text-gray-400">
            {t.estimateNote}
          </p>

          <button
            onClick={reset}
            className="w-full rounded-xl border border-gray-300 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {t.resetBtn}
          </button>
        </div>
      )}
    </div>
  );
}
