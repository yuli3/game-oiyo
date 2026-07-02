import { useState, useMemo } from "react";
import type { Locale } from "../../lib/i18n";

interface Props {
  locale: Locale;
}

interface VaccineShot {
  vaccineId: string;
  doseLabel: string; // e.g. "1차", "2차"
  minDaysFromBirth: number;
  maxDaysFromBirth: number;
  targetMonths: number; // approximate month for display
}

interface VaccineInfo {
  id: string;
  shortName: string;
  fullName: Record<Locale, string>;
}

const VACCINES: VaccineInfo[] = [
  { id: "bcg", shortName: "BCG", fullName: { ko: "결핵", en: "Tuberculosis (BCG)", ja: "結核（BCG）", fr: "Tuberculose (BCG)", es: "Tuberculosis (BCG)", zh: "结核病（BCG）", } },
  { id: "hepb", shortName: "B형간염", fullName: { ko: "B형 간염", en: "Hepatitis B", ja: "B型肝炎", fr: "Hépatite B", es: "Hepatitis B", zh: "乙型肝炎", } },
  { id: "dtap", shortName: "DTaP", fullName: { ko: "디프테리아·파상풍·백일해", en: "Diphtheria·Tetanus·Pertussis", ja: "ジフテリア・破傷風・百日咳", fr: "Diphtérie·Tétanos·Coqueluche", es: "Difteria·Tétano·Tosferina", zh: "白喉·破伤风·百日咳", } },
  { id: "ipv", shortName: "폴리오", fullName: { ko: "폴리오 (IPV)", en: "Polio (IPV)", ja: "ポリオ（IPV）", fr: "Polio (IPV)", es: "Polio (IPV)", zh: "脊髓灰质炎（IPV）", } },
  { id: "hib", shortName: "Hib", fullName: { ko: "뇌수막염 (Hib)", en: "Haemophilus influenzae type b (Hib)", ja: "Hibインフルエンザ菌", fr: "Hib (méningite)", es: "Hib (meningitis)", zh: "B型流感嗜血杆菌（Hib）", } },
  { id: "pcv", shortName: "폐렴구균", fullName: { ko: "폐렴구균 (PCV)", en: "Pneumococcal (PCV)", ja: "肺炎球菌（PCV）", fr: "Pneumocoque (PCV)", es: "Neumocócica (PCV)", zh: "肺炎球菌（PCV）", } },
  { id: "rota", shortName: "로타바이러스", fullName: { ko: "로타바이러스", en: "Rotavirus", ja: "ロタウイルス", fr: "Rotavirus", es: "Rotavirus", zh: "轮状病毒", } },
  { id: "mmr", shortName: "MMR", fullName: { ko: "홍역·유행성이하선염·풍진 (MMR)", en: "Measles·Mumps·Rubella (MMR)", ja: "麻疹・おたふく風邪・風疹（MMR）", fr: "Rougeole·Oreillons·Rubéole (MMR)", es: "Sarampión·Paperas·Rubéola (MMR)", zh: "麻疹·腮腺炎·风疹（MMR）", } },
  { id: "var", shortName: "수두", fullName: { ko: "수두 (Varicella)", en: "Varicella (Chickenpox)", ja: "水痘（みずぼうそう）", fr: "Varicelle", es: "Varicela", zh: "水痘", } },
  { id: "hepa", shortName: "A형간염", fullName: { ko: "A형 간염", en: "Hepatitis A", ja: "A型肝炎", fr: "Hépatite A", es: "Hepatitis A", zh: "甲型肝炎", } },
  { id: "je_inactive", shortName: "일본뇌염(불활화)", fullName: { ko: "일본뇌염 (불활화)", en: "Japanese Encephalitis (inactivated)", ja: "日本脳炎（不活化）", fr: "Encéphalite japonaise (inactivé)", es: "Encefalitis japonesa (inactivada)", zh: "乙型脑炎（灭活）", } },
  { id: "je_live", shortName: "일본뇌염(생백신)", fullName: { ko: "일본뇌염 (약독화 생백신)", en: "Japanese Encephalitis (live attenuated)", ja: "日本脳炎（弱毒化生ワクチン）", fr: "Encéphalite japonaise (vivant atténué)", es: "Encefalitis japonesa (vivo atenuado)", zh: "乙型脑炎（减毒活疫苗）", } },
  { id: "tdap", shortName: "Tdap/Td", fullName: { ko: "Tdap/Td (추가접종)", en: "Tdap/Td (booster)", ja: "Tdap/Td（追加接種）", fr: "Tdap/Td (rappel)", es: "Tdap/Td (refuerzo)", zh: "Tdap/Td（加强针）", } },
  { id: "hpv", shortName: "HPV", fullName: { ko: "사람유두종바이러스 (HPV)", en: "Human Papillomavirus (HPV)", ja: "ヒトパピローマウイルス（HPV）", fr: "Papillomavirus humain (HPV)", es: "Virus del papiloma humano (HPV)", zh: "人乳头状瘤病毒（HPV）", } },
  { id: "flu", shortName: "인플루엔자", fullName: { ko: "인플루엔자 (독감)", en: "Influenza (Flu)", ja: "インフルエンザ", fr: "Grippe (Influenza)", es: "Influenza (Gripe)", zh: "流行性感冒", } },
  { id: "menv", shortName: "수막구균", fullName: { ko: "수막구균", en: "Meningococcal", ja: "髄膜炎菌", fr: "Méningocoque", es: "Meningocócica", zh: "脑膜炎球菌", } },
];

// Each row: vaccineId, doseLabel(ko), minDays, maxDays, targetMonths
const SCHEDULE: VaccineShot[] = [
  // BCG: 생후 4주 이내
  { vaccineId: "bcg", doseLabel: "1차", minDaysFromBirth: 0, maxDaysFromBirth: 28, targetMonths: 0 },
  // B형간염: 출생, 1개월, 6개월
  { vaccineId: "hepb", doseLabel: "1차", minDaysFromBirth: 0, maxDaysFromBirth: 7, targetMonths: 0 },
  { vaccineId: "hepb", doseLabel: "2차", minDaysFromBirth: 28, maxDaysFromBirth: 60, targetMonths: 1 },
  { vaccineId: "hepb", doseLabel: "3차", minDaysFromBirth: 152, maxDaysFromBirth: 212, targetMonths: 6 },
  // DTaP: 2, 4, 6, 15~18개월, 4~6세
  { vaccineId: "dtap", doseLabel: "1차", minDaysFromBirth: 56, maxDaysFromBirth: 70, targetMonths: 2 },
  { vaccineId: "dtap", doseLabel: "2차", minDaysFromBirth: 112, maxDaysFromBirth: 126, targetMonths: 4 },
  { vaccineId: "dtap", doseLabel: "3차", minDaysFromBirth: 168, maxDaysFromBirth: 196, targetMonths: 6 },
  { vaccineId: "dtap", doseLabel: "4차", minDaysFromBirth: 456, maxDaysFromBirth: 548, targetMonths: 15 },
  { vaccineId: "dtap", doseLabel: "5차", minDaysFromBirth: 1460, maxDaysFromBirth: 2190, targetMonths: 48 },
  // 폴리오: 2, 4, 6~18개월, 4~6세
  { vaccineId: "ipv", doseLabel: "1차", minDaysFromBirth: 56, maxDaysFromBirth: 70, targetMonths: 2 },
  { vaccineId: "ipv", doseLabel: "2차", minDaysFromBirth: 112, maxDaysFromBirth: 126, targetMonths: 4 },
  { vaccineId: "ipv", doseLabel: "3차", minDaysFromBirth: 168, maxDaysFromBirth: 548, targetMonths: 6 },
  { vaccineId: "ipv", doseLabel: "4차", minDaysFromBirth: 1460, maxDaysFromBirth: 2190, targetMonths: 48 },
  // Hib: 2, 4, 6, 12~15개월
  { vaccineId: "hib", doseLabel: "1차", minDaysFromBirth: 56, maxDaysFromBirth: 70, targetMonths: 2 },
  { vaccineId: "hib", doseLabel: "2차", minDaysFromBirth: 112, maxDaysFromBirth: 126, targetMonths: 4 },
  { vaccineId: "hib", doseLabel: "3차", minDaysFromBirth: 168, maxDaysFromBirth: 196, targetMonths: 6 },
  { vaccineId: "hib", doseLabel: "4차", minDaysFromBirth: 365, maxDaysFromBirth: 456, targetMonths: 12 },
  // PCV: 2, 4, 6, 12~15개월
  { vaccineId: "pcv", doseLabel: "1차", minDaysFromBirth: 56, maxDaysFromBirth: 70, targetMonths: 2 },
  { vaccineId: "pcv", doseLabel: "2차", minDaysFromBirth: 112, maxDaysFromBirth: 126, targetMonths: 4 },
  { vaccineId: "pcv", doseLabel: "3차", minDaysFromBirth: 168, maxDaysFromBirth: 196, targetMonths: 6 },
  { vaccineId: "pcv", doseLabel: "4차", minDaysFromBirth: 365, maxDaysFromBirth: 456, targetMonths: 12 },
  // 로타: 2, 4, 6개월
  { vaccineId: "rota", doseLabel: "1차", minDaysFromBirth: 42, maxDaysFromBirth: 105, targetMonths: 2 },
  { vaccineId: "rota", doseLabel: "2차", minDaysFromBirth: 112, maxDaysFromBirth: 168, targetMonths: 4 },
  { vaccineId: "rota", doseLabel: "3차", minDaysFromBirth: 168, maxDaysFromBirth: 252, targetMonths: 6 },
  // MMR: 12~15개월, 4~6세
  { vaccineId: "mmr", doseLabel: "1차", minDaysFromBirth: 365, maxDaysFromBirth: 456, targetMonths: 12 },
  { vaccineId: "mmr", doseLabel: "2차", minDaysFromBirth: 1460, maxDaysFromBirth: 2190, targetMonths: 48 },
  // 수두: 12~15개월
  { vaccineId: "var", doseLabel: "1차", minDaysFromBirth: 365, maxDaysFromBirth: 456, targetMonths: 12 },
  // A형간염: 12~23개월 2회
  { vaccineId: "hepa", doseLabel: "1차", minDaysFromBirth: 365, maxDaysFromBirth: 700, targetMonths: 12 },
  { vaccineId: "hepa", doseLabel: "2차", minDaysFromBirth: 456, maxDaysFromBirth: 730, targetMonths: 18 },
  // 일본뇌염 불활화: 12~23개월 1·2차, 이후 24~35개월, 만6세, 만12세
  { vaccineId: "je_inactive", doseLabel: "1차", minDaysFromBirth: 365, maxDaysFromBirth: 700, targetMonths: 12 },
  { vaccineId: "je_inactive", doseLabel: "2차", minDaysFromBirth: 393, maxDaysFromBirth: 730, targetMonths: 13 },
  { vaccineId: "je_inactive", doseLabel: "3차", minDaysFromBirth: 730, maxDaysFromBirth: 1095, targetMonths: 24 },
  { vaccineId: "je_inactive", doseLabel: "4차", minDaysFromBirth: 2190, maxDaysFromBirth: 2555, targetMonths: 72 },
  { vaccineId: "je_inactive", doseLabel: "5차", minDaysFromBirth: 4380, maxDaysFromBirth: 4745, targetMonths: 144 },
  // 일본뇌염 생백신: 12~23개월, 24~35개월
  { vaccineId: "je_live", doseLabel: "1차", minDaysFromBirth: 365, maxDaysFromBirth: 700, targetMonths: 12 },
  { vaccineId: "je_live", doseLabel: "2차", minDaysFromBirth: 730, maxDaysFromBirth: 1095, targetMonths: 24 },
  // Tdap/Td: 만11~12세, 이후 10년마다
  { vaccineId: "tdap", doseLabel: "추가", minDaysFromBirth: 4015, maxDaysFromBirth: 4745, targetMonths: 132 },
  // HPV: 만12세 (여아)
  { vaccineId: "hpv", doseLabel: "1차", minDaysFromBirth: 4380, maxDaysFromBirth: 4745, targetMonths: 144 },
  { vaccineId: "hpv", doseLabel: "2차", minDaysFromBirth: 4561, maxDaysFromBirth: 4926, targetMonths: 150 },
  // 인플루엔자: 매년 (6개월~)
  { vaccineId: "flu", doseLabel: "매년", minDaysFromBirth: 182, maxDaysFromBirth: 999999, targetMonths: 6 },
];

const UI: Record<
  Locale,
  {
    title: string;
    subtitle: string;
    dobLabel: string;
    dobPlaceholder: string;
    generateBtn: string;
    resultTitle: string;
    statusPast: string;
    statusCurrent: string;
    statusUpcoming: string;
    noDate: string;
    ageAtLabel: string;
    monthUnit: string;
    yearUnit: string;
    doseLabel: string;
    legendTitle: string;
  }
> = {
  ko: {
    title: "예방접종 스케줄러",
    subtitle: "아이 생년월일을 입력하면 예방접종 일정을 알려드립니다",
    dobLabel: "아이 생년월일",
    dobPlaceholder: "",
    generateBtn: "일정 확인하기",
    resultTitle: "예방접종 일정",
    statusPast: "완료",
    statusCurrent: "지금 맞을 시기",
    statusUpcoming: "예정",
    noDate: "생년월일을 입력해 주세요.",
    ageAtLabel: "접종 권장 시기",
    monthUnit: "개월",
    yearUnit: "세",
    doseLabel: "차수",
    legendTitle: "범례",
  },
  en: {
    title: "Vaccination Schedule",
    subtitle: "Enter your child's birth date to see the vaccination timeline",
    dobLabel: "Child's Date of Birth",
    dobPlaceholder: "",
    generateBtn: "View Schedule",
    resultTitle: "Vaccination Timeline",
    statusPast: "Done",
    statusCurrent: "Due Now",
    statusUpcoming: "Upcoming",
    noDate: "Please enter the birth date.",
    ageAtLabel: "Recommended Age",
    monthUnit: "mo",
    yearUnit: "yr",
    doseLabel: "Dose",
    legendTitle: "Legend",
  },
  ja: {
    title: "予防接種スケジューラー",
    subtitle: "お子様の生年月日を入力すると予防接種スケジュールが表示されます",
    dobLabel: "お子様の生年月日",
    dobPlaceholder: "",
    generateBtn: "スケジュールを確認",
    resultTitle: "予防接種スケジュール",
    statusPast: "完了",
    statusCurrent: "今が接種時期",
    statusUpcoming: "予定",
    noDate: "生年月日を入力してください。",
    ageAtLabel: "推奨接種時期",
    monthUnit: "ヶ月",
    yearUnit: "歳",
    doseLabel: "回目",
    legendTitle: "凡例",
  },
  fr: {
    title: "Calendrier de Vaccination",
    subtitle: "Entrez la date de naissance de votre enfant pour voir le calendrier",
    dobLabel: "Date de Naissance",
    dobPlaceholder: "",
    generateBtn: "Voir le Calendrier",
    resultTitle: "Calendrier de Vaccination",
    statusPast: "Fait",
    statusCurrent: "À faire maintenant",
    statusUpcoming: "À venir",
    noDate: "Veuillez entrer la date de naissance.",
    ageAtLabel: "Âge recommandé",
    monthUnit: "mois",
    yearUnit: "an",
    doseLabel: "Dose",
    legendTitle: "Légende",
  },
  es: {
    title: "Calendario de Vacunación",
    subtitle: "Ingresa la fecha de nacimiento del niño para ver el calendario de vacunación",
    dobLabel: "Fecha de Nacimiento",
    dobPlaceholder: "",
    generateBtn: "Ver Calendario",
    resultTitle: "Calendario de Vacunación",
    statusPast: "Completado",
    statusCurrent: "Momento Actual",
    statusUpcoming: "Próximo",
    noDate: "Por favor ingresa la fecha de nacimiento.",
    ageAtLabel: "Edad Recomendada",
    monthUnit: "mes",
    yearUnit: "año",
    doseLabel: "Dosis",
    legendTitle: "Leyenda",
  },
  zh: {
    title: "疫苗接种时间表",
    subtitle: "输入孩子的出生日期，查看疫苗接种时间表",
    dobLabel: "孩子出生日期",
    dobPlaceholder: "",
    generateBtn: "查看时间表",
    resultTitle: "疫苗接种时间表",
    statusPast: "已完成",
    statusCurrent: "现在该接种",
    statusUpcoming: "待接种",
    noDate: "请输入出生日期。",
    ageAtLabel: "推荐接种年龄",
    monthUnit: "个月",
    yearUnit: "岁",
    doseLabel: "剂次",
    legendTitle: "图例",
  },
};

type Status = "past" | "current" | "upcoming";

interface ScheduleRow {
  shot: VaccineShot;
  vaccine: VaccineInfo;
  scheduledDate: Date;
  windowStart: Date;
  windowEnd: Date;
  status: Status;
  ageMonths: number;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDate(date: Date, locale: Locale): string {
  return date.toLocaleDateString(
    locale === "ko" ? "ko-KR" : locale === "ja" ? "ja-JP" : locale === "zh" ? "zh-CN" : "en-US",
    { year: "numeric", month: "short", day: "numeric" }
  );
}

export default function VaccinationSchedule({ locale }: Props) {
  const t = UI[locale] ?? UI.en;
  const [dob, setDob] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const scheduleRows = useMemo<ScheduleRow[]>(() => {
    if (!dob) return [];
    const birthDate = new Date(dob);
    if (isNaN(birthDate.getTime())) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return SCHEDULE.map((shot) => {
      const windowStart = addDays(birthDate, shot.minDaysFromBirth);
      const windowEnd = addDays(birthDate, shot.maxDaysFromBirth === 999999 ? shot.minDaysFromBirth + 365 : shot.maxDaysFromBirth);
      const scheduledDate = addDays(birthDate, Math.round((shot.minDaysFromBirth + Math.min(shot.maxDaysFromBirth, shot.minDaysFromBirth + 60)) / 2));

      let status: Status;
      if (windowEnd < today) {
        status = "past";
      } else if (windowStart <= today && today <= windowEnd) {
        status = "current";
      } else {
        status = "upcoming";
      }

      const vaccine = VACCINES.find((v) => v.id === shot.vaccineId)!;

      return {
        shot,
        vaccine,
        scheduledDate,
        windowStart,
        windowEnd,
        status,
        ageMonths: shot.targetMonths,
      };
    }).sort((a, b) => a.shot.minDaysFromBirth - b.shot.minDaysFromBirth);
  }, [dob]);

  const getAgeLabel = (months: number): string => {
    if (months < 12) return `${months}${t.monthUnit}`;
    const years = Math.floor(months / 12);
    const rem = months % 12;
    if (rem === 0) return `${years}${t.yearUnit}`;
    return `${years}${t.yearUnit} ${rem}${t.monthUnit}`;
  };

  const statusStyle: Record<Status, string> = {
    past: "border-l-4 border-l-gray-300 bg-gray-50 opacity-60",
    current: "border-l-4 border-l-red-500 bg-red-50 shadow-md",
    upcoming: "border-l-4 border-l-yellow-400 bg-yellow-50",
  };

  const statusBadge: Record<Status, string> = {
    past: "bg-gray-200 text-gray-600",
    current: "bg-red-500 text-white animate-pulse",
    upcoming: "bg-yellow-400 text-yellow-900",
  };

  const statusText: Record<Status, string> = {
    past: t.statusPast,
    current: t.statusCurrent,
    upcoming: t.statusUpcoming,
  };

  // Group by approximate age band
  const ageBands = useMemo(() => {
    const groups: Record<string, ScheduleRow[]> = {};
    for (const row of scheduleRows) {
      const key = getAgeLabel(row.ageMonths);
      if (!groups[key]) groups[key] = [];
      groups[key].push(row);
    }
    return Object.entries(groups);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleRows, locale]);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
        <p className="mt-1 text-gray-500">{t.subtitle}</p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t.dobLabel}</label>
          <input
            type="date"
            value={dob}
            onChange={(e) => { setDob(e.target.value); setSubmitted(false); }}
            max={new Date().toISOString().split("T")[0]}
            className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <button
          onClick={() => setSubmitted(true)}
          disabled={!dob}
          className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 py-3 font-semibold text-white shadow-md hover:from-blue-600 hover:to-cyan-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {t.generateBtn}
        </button>
      </div>

      {/* Legend */}
      {submitted && (
        <div className="flex flex-wrap gap-3 text-xs">
          <span className="font-medium text-gray-600">{t.legendTitle}:</span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-red-500 inline-block"></span>
            <span className="text-gray-600">{t.statusCurrent}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-yellow-400 inline-block"></span>
            <span className="text-gray-600">{t.statusUpcoming}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-gray-300 inline-block"></span>
            <span className="text-gray-600">{t.statusPast}</span>
          </span>
        </div>
      )}

      {submitted && scheduleRows.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-gray-800">{t.resultTitle}</h2>
          {ageBands.map(([ageKey, rows]) => (
            <div key={ageKey} className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs text-center leading-tight">
                  {ageKey}
                </div>
                <div className="flex-1 h-px bg-gray-200"></div>
              </div>
              <div className="space-y-2 ml-2">
                {rows.map((row, idx) => (
                  <div
                    key={`${row.vaccine.id}-${row.shot.doseLabel}-${idx}`}
                    className={`rounded-xl p-4 ${statusStyle[row.status]}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900 text-sm">
                            {row.vaccine.fullName[locale] ?? row.vaccine.fullName.en}
                          </span>
                          <span className="text-xs text-gray-500">
                            {row.shot.doseLabel}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(row.windowStart, locale)} ~ {formatDate(row.windowEnd, locale)}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${statusBadge[row.status]}`}>
                        {row.status === "past" ? "✓ " : row.status === "current" ? "● " : "○ "}
                        {statusText[row.status]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
