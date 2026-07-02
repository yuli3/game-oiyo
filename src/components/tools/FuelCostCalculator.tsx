import { useState } from "react";
import { GameContainer } from "../ui/game/GamePrimitives";
import type { Locale } from "../../lib/i18n";

interface Props {
  locale: Locale;
}

type Labels = {
  title: string;
  subtitle: string;
  distance: string;
  efficiency: string;
  fuelPrice: string;
  passengers: string;
  totalCost: string;
  perPerson: string;
  routePresets: string;
  fuelPresets: string;
  gasoline: string;
  diesel: string;
  lpg: string;
  reset: string;
  unit: string;
  kmUnit: string;
  lUnit: string;
  personsUnit: string;
};

const LABELS: Record<Locale, Labels> = {
  ko: {
    title: "주유비 계산기",
    subtitle: "Fuel Cost Calculator",
    distance: "총 주행거리 (km)",
    efficiency: "연비 (km/L)",
    fuelPrice: "유가 (원/L)",
    passengers: "인원수 (명)",
    totalCost: "총 연료비",
    perPerson: "1인당 연료비",
    routePresets: "자주 찾는 구간",
    fuelPresets: "유종 선택",
    gasoline: "휘발유",
    diesel: "경유",
    lpg: "LPG",
    reset: "초기화",
    unit: "원",
    kmUnit: "km",
    lUnit: "km/L",
    personsUnit: "명",
  },
  en: {
    title: "Fuel Cost Calculator",
    subtitle: "Trip Cost Estimator",
    distance: "Total Distance (km)",
    efficiency: "Fuel Economy (km/L)",
    fuelPrice: "Fuel Price (KRW/L)",
    passengers: "Passengers",
    totalCost: "Total Fuel Cost",
    perPerson: "Cost per Person",
    routePresets: "Common Routes",
    fuelPresets: "Fuel Type",
    gasoline: "Gasoline",
    diesel: "Diesel",
    lpg: "LPG",
    reset: "Reset",
    unit: "KRW",
    kmUnit: "km",
    lUnit: "km/L",
    personsUnit: "pax",
  },
  ja: {
    title: "ガソリン代計算機",
    subtitle: "Fuel Cost Calculator",
    distance: "走行距離 (km)",
    efficiency: "燃費 (km/L)",
    fuelPrice: "ガソリン代 (ウォン/L)",
    passengers: "乗車人数 (人)",
    totalCost: "総燃料費",
    perPerson: "1人あたりの費用",
    routePresets: "よく使うルート",
    fuelPresets: "燃料種別",
    gasoline: "ガソリン",
    diesel: "ディーゼル",
    lpg: "LPG",
    reset: "リセット",
    unit: "ウォン",
    kmUnit: "km",
    lUnit: "km/L",
    personsUnit: "人",
  },
  fr: {
    title: "Calculateur de coût de carburant",
    subtitle: "Fuel Cost Calculator",
    distance: "Distance totale (km)",
    efficiency: "Consommation (km/L)",
    fuelPrice: "Prix du carburant (KRW/L)",
    passengers: "Nombre de passagers",
    totalCost: "Coût total en carburant",
    perPerson: "Coût par personne",
    routePresets: "Trajets fréquents",
    fuelPresets: "Type de carburant",
    gasoline: "Essence",
    diesel: "Diesel",
    lpg: "GPL",
    reset: "Réinitialiser",
    unit: "KRW",
    kmUnit: "km",
    lUnit: "km/L",
    personsUnit: "pers.",
  },
  es: {
    title: "Calculadora de coste de combustible",
    subtitle: "Fuel Cost Calculator",
    distance: "Distancia total (km)",
    efficiency: "Consumo (km/L)",
    fuelPrice: "Precio del combustible (KRW/L)",
    passengers: "Número de pasajeros",
    totalCost: "Coste total de combustible",
    perPerson: "Coste por persona",
    routePresets: "Rutas habituales",
    fuelPresets: "Tipo de combustible",
    gasoline: "Gasolina",
    diesel: "Diésel",
    lpg: "GLP",
    reset: "Restablecer",
    unit: "KRW",
    kmUnit: "km",
    lUnit: "km/L",
    personsUnit: "pax",
  },
  zh: {
    title: "油费计算器",
    subtitle: "Fuel Cost Calculator",
    distance: "总行驶距离 (km)",
    efficiency: "油耗 (km/L)",
    fuelPrice: "油价（韩元/L）",
    passengers: "乘车人数（人）",
    totalCost: "总燃油费",
    perPerson: "每人费用",
    routePresets: "常用路线",
    fuelPresets: "燃料类型",
    gasoline: "汽油",
    diesel: "柴油",
    lpg: "液化石油气",
    reset: "重置",
    unit: "韩元",
    kmUnit: "km",
    lUnit: "km/L",
    personsUnit: "人",
  },
};

const ROUTE_PRESETS = [
  { ko: "서울↔부산", en: "Seoul↔Busan", ja: "ソウル↔釜山", fr: "Séoul↔Busan", es: "Seúl↔Busan", zh: "首爾↔釜山", km: 325 },
  { ko: "서울↔강릉", en: "Seoul↔Gangneung", ja: "ソウル↔江陵", fr: "Séoul↔Gangneung", es: "Seúl↔Gangneung", zh: "首爾↔江陵", km: 230 },
  { ko: "서울↔여수", en: "Seoul↔Yeosu", ja: "ソウル↔麗水", fr: "Séoul↔Yeosu", es: "Seúl↔Yeosu", zh: "首爾↔麗水", km: 410 },
  { ko: "서울↔목포항", en: "Seoul↔Mokpo Port", ja: "ソウル↔木浦港", fr: "Séoul↔Port Mokpo", es: "Seúl↔Puerto Mokpo", zh: "首爾↔木浦港", km: 460 },
] as const;

const FUEL_PRESETS = [
  { key: "gasoline" as const, price: 1650 },
  { key: "diesel" as const, price: 1480 },
  { key: "lpg" as const, price: 900 },
];

function fmtKRW(n: number) {
  return Math.round(n).toLocaleString("ko-KR");
}

const FuelCostCalculator = ({ locale }: Props) => {
  const t = LABELS[locale] ?? LABELS.en;

  const [distance, setDistance] = useState(325);
  const [efficiency, setEfficiency] = useState(12);
  const [fuelPrice, setFuelPrice] = useState(1650);
  const [passengers, setPassengers] = useState(1);

  const totalCost = efficiency > 0 ? (distance / efficiency) * fuelPrice : 0;
  const perPerson = passengers > 0 ? totalCost / passengers : totalCost;

  const routeLabel = (preset: (typeof ROUTE_PRESETS)[number]) => {
    const key = locale as keyof typeof preset;
    if (key in preset && typeof preset[key] === "string") {
      return preset[key] as string;
    }
    return preset.en;
  };

  const handleReset = () => {
    setDistance(325);
    setEfficiency(12);
    setFuelPrice(1650);
    setPassengers(1);
  };

  return (
    <GameContainer title={t.title} subtitle={t.subtitle} onReset={handleReset}>
      <div className="flex flex-col gap-8">
        {/* Route presets */}
        <div className="space-y-3">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
            {t.routePresets}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {ROUTE_PRESETS.map((preset) => (
              <button
                key={preset.km}
                onClick={() => setDistance(preset.km)}
                className={`px-3 py-2 rounded-xl text-xs font-black border transition-colors ${
                  distance === preset.km
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/30 border-border hover:border-primary text-foreground"
                }`}
              >
                {routeLabel(preset)}
                <span className="block text-[10px] font-medium opacity-70">{preset.km} km</span>
              </button>
            ))}
          </div>
        </div>

        {/* Fuel type presets */}
        <div className="space-y-3">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
            {t.fuelPresets}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {FUEL_PRESETS.map((fp) => (
              <button
                key={fp.key}
                onClick={() => setFuelPrice(fp.price)}
                className={`px-3 py-2 rounded-xl text-xs font-black border transition-colors ${
                  fuelPrice === fp.price
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/30 border-border hover:border-primary text-foreground"
                }`}
              >
                {t[fp.key]}
                <span className="block text-[10px] font-medium opacity-70">
                  {fp.price.toLocaleString()}원/L
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
              {t.distance}
            </label>
            <input
              type="number"
              min={0}
              value={distance}
              onChange={(e) => setDistance(Math.max(0, Number(e.target.value)))}
              className="w-full p-4 bg-muted/30 rounded-2xl border border-border font-black text-lg outline-none focus:border-primary transition-colors"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
              {t.efficiency}
            </label>
            <input
              type="number"
              min={0.1}
              step={0.5}
              value={efficiency}
              onChange={(e) => setEfficiency(Math.max(0.1, Number(e.target.value)))}
              className="w-full p-4 bg-muted/30 rounded-2xl border border-border font-black text-lg outline-none focus:border-primary transition-colors"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
              {t.fuelPrice}
            </label>
            <input
              type="number"
              min={0}
              step={10}
              value={fuelPrice}
              onChange={(e) => setFuelPrice(Math.max(0, Number(e.target.value)))}
              className="w-full p-4 bg-muted/30 rounded-2xl border border-border font-black text-lg outline-none focus:border-primary transition-colors"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
              {t.passengers}
            </label>
            <input
              type="number"
              min={1}
              max={20}
              value={passengers}
              onChange={(e) => setPassengers(Math.max(1, Number(e.target.value)))}
              className="w-full p-4 bg-muted/30 rounded-2xl border border-border font-black text-lg outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

        {/* Results */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-6 bg-foreground rounded-3xl text-background shadow-lg text-center">
            <p className="text-[10px] font-black text-background/60 uppercase tracking-widest mb-2">
              {t.totalCost}
            </p>
            <p className="text-3xl font-black text-primary">
              ₩{fmtKRW(totalCost)}
            </p>
          </div>
          <div className="p-6 bg-muted/40 border border-border rounded-3xl text-center">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">
              {t.perPerson}
            </p>
            <p className="text-3xl font-black text-foreground">
              ₩{fmtKRW(perPerson)}
            </p>
          </div>
        </div>
      </div>
    </GameContainer>
  );
};

export default FuelCostCalculator;
