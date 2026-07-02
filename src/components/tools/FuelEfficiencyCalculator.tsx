import { useState, useEffect, useRef, useCallback } from "react";
import { GameContainer } from "../ui/game/GamePrimitives";
import type { Locale } from "../../lib/i18n";

type Labels = {
  title: string;
  subtitle: string;
  sec1Title: string;
  sec1Desc: string;
  distance: string;
  fuelUsed: string;
  calcResult: string;
  sec2Title: string;
  sec2Desc: string;
  kmpL: string;
  lPer100: string;
  mpg: string;
  sec3Title: string;
  sec3Desc: string;
  annualDist: string;
  efficiency: string;
  fuelPrice: string;
  annualCost: string;
  monthlyCost: string;
  sec4Title: string;
  fuelType: string;
  avgEfficiency: string;
  pricePerL: string;
  gasoline: string;
  diesel: string;
  lpg: string;
  hybrid: string;
  electric: string;
  distanceUnit: string;
  fuelUnit: string;
  priceUnit: string;
  reset: string;
};

const LABELS: Record<Locale, Labels> = {
  ko: {
    title: "연비 계산기",
    subtitle: "Fuel Efficiency Calculator",
    sec1Title: "실제 연비 계산",
    sec1Desc: "주행 거리와 주유량을 입력하여 실제 연비를 확인하세요.",
    distance: "주행 거리 (km)",
    fuelUsed: "주유량 (L)",
    calcResult: "실제 연비",
    sec2Title: "단위 변환기",
    sec2Desc: "세 단위 중 하나를 수정하면 나머지가 자동으로 업데이트됩니다.",
    kmpL: "km/L",
    lPer100: "L/100km",
    mpg: "MPG (미국)",
    sec3Title: "연간 유류비 계산",
    sec3Desc: "연간 주행거리, 연비, 유가를 입력하세요.",
    annualDist: "연간 주행거리 (km/년)",
    efficiency: "연비 (km/L)",
    fuelPrice: "리터당 유가 (원)",
    annualCost: "연간 유류비",
    monthlyCost: "월평균 유류비",
    sec4Title: "차량별 연비 참고표",
    fuelType: "연료 유형",
    avgEfficiency: "평균 연비",
    pricePerL: "리터당 단가",
    gasoline: "휘발유",
    diesel: "경유",
    lpg: "LPG",
    hybrid: "하이브리드",
    electric: "전기차",
    distanceUnit: "km",
    fuelUnit: "L",
    priceUnit: "원",
    reset: "초기화",
  },
  en: {
    title: "Fuel Efficiency Calculator",
    subtitle: "Mileage & Cost Estimator",
    sec1Title: "Real Fuel Economy",
    sec1Desc: "Enter distance driven and fuel used to calculate actual fuel economy.",
    distance: "Distance Driven (km)",
    fuelUsed: "Fuel Used (L)",
    calcResult: "Fuel Economy",
    sec2Title: "Unit Converter",
    sec2Desc: "Edit any field to auto-update the other two.",
    kmpL: "km/L",
    lPer100: "L/100km",
    mpg: "MPG (US)",
    sec3Title: "Annual Fuel Cost",
    sec3Desc: "Enter annual mileage, fuel economy, and price per liter.",
    annualDist: "Annual Mileage (km/yr)",
    efficiency: "Fuel Economy (km/L)",
    fuelPrice: "Price per Liter (KRW)",
    annualCost: "Annual Fuel Cost",
    monthlyCost: "Monthly Avg Cost",
    sec4Title: "Fuel Economy Reference",
    fuelType: "Fuel Type",
    avgEfficiency: "Avg Economy",
    pricePerL: "Price/L",
    gasoline: "Gasoline",
    diesel: "Diesel",
    lpg: "LPG",
    hybrid: "Hybrid",
    electric: "Electric",
    distanceUnit: "km",
    fuelUnit: "L",
    priceUnit: "KRW",
    reset: "Reset",
  },
  ja: {
    title: "燃費計算機",
    subtitle: "Fuel Efficiency Calculator",
    sec1Title: "実燃費計算",
    sec1Desc: "走行距離と給油量を入力して実際の燃費を確認します。",
    distance: "走行距離 (km)",
    fuelUsed: "給油量 (L)",
    calcResult: "実燃費",
    sec2Title: "単位変換",
    sec2Desc: "いずれかの入力を変更すると、残り2つが自動更新されます。",
    kmpL: "km/L",
    lPer100: "L/100km",
    mpg: "MPG (米国)",
    sec3Title: "年間燃料費計算",
    sec3Desc: "年間走行距離・燃費・1リットルあたりの価格を入力してください。",
    annualDist: "年間走行距離 (km/年)",
    efficiency: "燃費 (km/L)",
    fuelPrice: "1リットル単価 (ウォン)",
    annualCost: "年間燃料費",
    monthlyCost: "月平均燃料費",
    sec4Title: "燃料別参考燃費",
    fuelType: "燃料種別",
    avgEfficiency: "平均燃費",
    pricePerL: "単価/L",
    gasoline: "ガソリン",
    diesel: "ディーゼル",
    lpg: "LPG",
    hybrid: "ハイブリッド",
    electric: "電気自動車",
    distanceUnit: "km",
    fuelUnit: "L",
    priceUnit: "ウォン",
    reset: "リセット",
  },
  fr: {
    title: "Calculateur de consommation",
    subtitle: "Fuel Efficiency Calculator",
    sec1Title: "Consommation réelle",
    sec1Desc: "Entrez la distance parcourue et le carburant utilisé pour calculer la consommation réelle.",
    distance: "Distance parcourue (km)",
    fuelUsed: "Carburant utilisé (L)",
    calcResult: "Consommation réelle",
    sec2Title: "Convertisseur d'unités",
    sec2Desc: "Modifiez un champ pour mettre les deux autres à jour automatiquement.",
    kmpL: "km/L",
    lPer100: "L/100km",
    mpg: "MPG (US)",
    sec3Title: "Coût annuel en carburant",
    sec3Desc: "Entrez le kilométrage annuel, la consommation et le prix par litre.",
    annualDist: "Kilométrage annuel (km/an)",
    efficiency: "Consommation (km/L)",
    fuelPrice: "Prix par litre (KRW)",
    annualCost: "Coût annuel",
    monthlyCost: "Coût mensuel moyen",
    sec4Title: "Référence de consommation",
    fuelType: "Type de carburant",
    avgEfficiency: "Conso. moy.",
    pricePerL: "Prix/L",
    gasoline: "Essence",
    diesel: "Diesel",
    lpg: "GPL",
    hybrid: "Hybride",
    electric: "Électrique",
    distanceUnit: "km",
    fuelUnit: "L",
    priceUnit: "KRW",
    reset: "Réinitialiser",
  },
  es: {
    title: "Calculadora de consumo",
    subtitle: "Fuel Efficiency Calculator",
    sec1Title: "Consumo real",
    sec1Desc: "Ingresa la distancia recorrida y el combustible usado para calcular el consumo real.",
    distance: "Distancia recorrida (km)",
    fuelUsed: "Combustible usado (L)",
    calcResult: "Consumo real",
    sec2Title: "Conversor de unidades",
    sec2Desc: "Edita cualquier campo para actualizar los otros dos automáticamente.",
    kmpL: "km/L",
    lPer100: "L/100km",
    mpg: "MPG (EE.UU.)",
    sec3Title: "Costo anual de combustible",
    sec3Desc: "Ingresa el kilometraje anual, el consumo y el precio por litro.",
    annualDist: "Kilometraje anual (km/año)",
    efficiency: "Consumo (km/L)",
    fuelPrice: "Precio por litro (KRW)",
    annualCost: "Costo anual",
    monthlyCost: "Costo mensual promedio",
    sec4Title: "Referencia de consumo",
    fuelType: "Tipo de combustible",
    avgEfficiency: "Consumo prom.",
    pricePerL: "Precio/L",
    gasoline: "Gasolina",
    diesel: "Diésel",
    lpg: "GLP",
    hybrid: "Híbrido",
    electric: "Eléctrico",
    distanceUnit: "km",
    fuelUnit: "L",
    priceUnit: "KRW",
    reset: "Restablecer",
  },
  zh: {
    title: "燃油效率计算器",
    subtitle: "Fuel Efficiency Calculator",
    sec1Title: "实际油耗计算",
    sec1Desc: "输入行驶里程和加油量，计算实际油耗。",
    distance: "行驶里程 (km)",
    fuelUsed: "加油量 (L)",
    calcResult: "实际油耗",
    sec2Title: "单位换算",
    sec2Desc: "修改任意字段，其他两个将自动更新。",
    kmpL: "km/L",
    lPer100: "L/100km",
    mpg: "MPG（美制）",
    sec3Title: "年度燃油费计算",
    sec3Desc: "输入年度里程、油耗和每升油价。",
    annualDist: "年度里程 (km/年)",
    efficiency: "油耗 (km/L)",
    fuelPrice: "每升油价（韩元）",
    annualCost: "年度燃油费",
    monthlyCost: "月均燃油费",
    sec4Title: "各燃料类型参考油耗",
    fuelType: "燃料类型",
    avgEfficiency: "平均油耗",
    pricePerL: "每升单价",
    gasoline: "汽油",
    diesel: "柴油",
    lpg: "液化石油气",
    hybrid: "油电混合",
    electric: "电动车",
    distanceUnit: "km",
    fuelUnit: "L",
    priceUnit: "韩元",
    reset: "重置",
  },
};

const REFERENCE_DATA = (t: Labels) => [
  { type: t.gasoline, efficiency: "12 km/L", price: "1,650원" },
  { type: t.diesel, efficiency: "15 km/L", price: "1,550원" },
  { type: t.lpg, efficiency: "10 km/L", price: "950원" },
  { type: t.hybrid, efficiency: "20 km/L", price: "1,650원" },
  { type: t.electric, efficiency: "6 km/kWh", price: "180원/kWh" },
];

function fmtKRW(n: number) {
  return Math.round(n).toLocaleString("ko-KR");
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

const FuelEfficiencyCalculator: React.FC<{ locale?: Locale }> = ({ locale = "ko" }) => {
  const t = LABELS[locale] ?? LABELS.en;

  // Section 1: Real fuel economy
  const [sec1Dist, setSec1Dist] = useState(300);
  const [sec1Fuel, setSec1Fuel] = useState(25);
  const sec1Result = sec1Fuel > 0 ? round2(sec1Dist / sec1Fuel) : 0;

  // Section 2: Unit converter
  const [kmpL, setKmpL] = useState<string>("12");
  const [lPer100, setLPer100] = useState<string>("8.33");
  const [mpg, setMpg] = useState<string>("28.23");
  const lastEdited = useRef<"kmpL" | "lPer100" | "mpg">(undefined);

  const handleKmpLChange = useCallback((val: string) => {
    setKmpL(val);
    lastEdited.current = "kmpL";
    const v = parseFloat(val);
    if (!isNaN(v) && v > 0) {
      setLPer100(round2(100 / v).toString());
      setMpg(round2(v * 2.35215).toString());
    }
  }, []);

  const handleLPer100Change = useCallback((val: string) => {
    setLPer100(val);
    lastEdited.current = "lPer100";
    const v = parseFloat(val);
    if (!isNaN(v) && v > 0) {
      setKmpL(round2(100 / v).toString());
      setMpg(round2(235.215 / v).toString());
    }
  }, []);

  const handleMpgChange = useCallback((val: string) => {
    setMpg(val);
    lastEdited.current = "mpg";
    const v = parseFloat(val);
    if (!isNaN(v) && v > 0) {
      setKmpL(round2(v / 2.35215).toString());
      setLPer100(round2(235.215 / v).toString());
    }
  }, []);

  // Section 3: Annual fuel cost
  const [annualDist, setAnnualDist] = useState(15000);
  const [efficiency, setEfficiency] = useState(12);
  const [fuelPrice, setFuelPrice] = useState(1700);
  const annualCost = efficiency > 0 ? (annualDist / efficiency) * fuelPrice : 0;
  const monthlyCost = annualCost / 12;

  const refData = REFERENCE_DATA(t);

  const handleReset = () => {
    setSec1Dist(300);
    setSec1Fuel(25);
    setKmpL("12");
    setLPer100("8.33");
    setMpg("28.23");
    setAnnualDist(15000);
    setEfficiency(12);
    setFuelPrice(1700);
  };

  return (
    <GameContainer title={t.title} subtitle={t.subtitle} onReset={handleReset}>
      <div className="flex flex-col gap-10">

        {/* Section 1: Real fuel economy */}
        <section className="space-y-5">
          <div>
            <h4 className="text-base font-black text-foreground">{t.sec1Title}</h4>
            <p className="text-xs text-muted-foreground mt-1">{t.sec1Desc}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                {t.distance}
              </label>
              <input
                type="number"
                min={0}
                value={sec1Dist}
                onChange={(e) => setSec1Dist(Math.max(0, Number(e.target.value)))}
                className="w-full p-4 bg-muted/30 rounded-2xl border border-border font-black text-lg outline-none focus:border-primary transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                {t.fuelUsed}
              </label>
              <input
                type="number"
                min={0}
                step={0.1}
                value={sec1Fuel}
                onChange={(e) => setSec1Fuel(Math.max(0, Number(e.target.value)))}
                className="w-full p-4 bg-muted/30 rounded-2xl border border-border font-black text-lg outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>
          <div className="p-6 bg-foreground rounded-3xl text-background text-center shadow-lg">
            <p className="text-[10px] font-black text-background/60 uppercase tracking-widest mb-2">{t.calcResult}</p>
            <p className="text-5xl font-black text-primary">{sec1Result > 0 ? sec1Result.toFixed(2) : "—"} <span className="text-xl font-bold text-background/50">km/L</span></p>
          </div>
        </section>

        <div className="border-t border-border" />

        {/* Section 2: Unit converter */}
        <section className="space-y-5">
          <div>
            <h4 className="text-base font-black text-foreground">{t.sec2Title}</h4>
            <p className="text-xs text-muted-foreground mt-1">{t.sec2Desc}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: t.kmpL, value: kmpL, onChange: handleKmpLChange },
              { label: t.lPer100, value: lPer100, onChange: handleLPer100Change },
              { label: t.mpg, value: mpg, onChange: handleMpgChange },
            ].map(({ label, value, onChange }) => (
              <div key={label} className="space-y-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                  {label}
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  className="w-full p-4 bg-muted/30 rounded-2xl border border-border font-black text-lg outline-none focus:border-primary transition-colors"
                />
              </div>
            ))}
          </div>
        </section>

        <div className="border-t border-border" />

        {/* Section 3: Annual fuel cost */}
        <section className="space-y-5">
          <div>
            <h4 className="text-base font-black text-foreground">{t.sec3Title}</h4>
            <p className="text-xs text-muted-foreground mt-1">{t.sec3Desc}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                {t.annualDist}
              </label>
              <input
                type="number"
                min={0}
                step={1000}
                value={annualDist}
                onChange={(e) => setAnnualDist(Math.max(0, Number(e.target.value)))}
                className="w-full p-4 bg-muted/30 rounded-2xl border border-border font-black text-base outline-none focus:border-primary transition-colors"
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
                className="w-full p-4 bg-muted/30 rounded-2xl border border-border font-black text-base outline-none focus:border-primary transition-colors"
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
                className="w-full p-4 bg-muted/30 rounded-2xl border border-border font-black text-base outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-6 bg-foreground rounded-3xl text-background text-center shadow-lg">
              <p className="text-[10px] font-black text-background/60 uppercase tracking-widest mb-2">{t.annualCost}</p>
              <p className="text-3xl font-black text-primary">₩{fmtKRW(annualCost)}</p>
            </div>
            <div className="p-6 bg-muted/40 border border-border rounded-3xl text-center">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">{t.monthlyCost}</p>
              <p className="text-3xl font-black text-foreground">₩{fmtKRW(monthlyCost)}</p>
            </div>
          </div>
        </section>

        <div className="border-t border-border" />

        {/* Section 4: Reference table */}
        <section className="space-y-4">
          <h4 className="text-base font-black text-foreground">{t.sec4Title}</h4>
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left px-4 py-3 text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t.fuelType}</th>
                  <th className="text-right px-4 py-3 text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t.avgEfficiency}</th>
                  <th className="text-right px-4 py-3 text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t.pricePerL}</th>
                </tr>
              </thead>
              <tbody>
                {refData.map((row, i) => (
                  <tr
                    key={row.type}
                    className={`border-b border-border last:border-0 ${i % 2 === 0 ? "bg-background" : "bg-muted/20"}`}
                  >
                    <td className="px-4 py-3 font-bold text-foreground">{row.type}</td>
                    <td className="px-4 py-3 text-right font-black text-primary">{row.efficiency}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground font-medium">{row.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </GameContainer>
  );
};

export default FuelEfficiencyCalculator;
