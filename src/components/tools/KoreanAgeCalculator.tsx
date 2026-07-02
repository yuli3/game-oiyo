import { useState } from "react";
import type { Locale } from "../../lib/i18n";

interface UiLabels {
  birth: string;
  year: string;
  month: string;
  day: string;
  intlAge: string; // 만나이 (international)
  countingAge: string; // 세는나이 (Korean counting)
  yearAge: string; // 연나이
  yearsOld: string;
  invalid: string;
  note: string;
}

const L: Record<string, UiLabels> = {
  en: { birth: "Date of birth", year: "Year", month: "Month", day: "Day", intlAge: "International age (만나이)", countingAge: "Korean counting age (세는나이)", yearAge: "Year age (연나이)", yearsOld: "years old", invalid: "Enter a valid date", note: "Since June 2023, Korea uses international age (만나이) by law." },
  ko: { birth: "생년월일", year: "년", month: "월", day: "일", intlAge: "만 나이", countingAge: "세는 나이", yearAge: "연 나이", yearsOld: "세", invalid: "올바른 날짜를 입력하세요", note: "2023년 6월부터 법적으로 만 나이로 통일되었습니다." },
  ja: { birth: "生年月日", year: "年", month: "月", day: "日", intlAge: "満年齢 (만나이)", countingAge: "数え年 (세는나이)", yearAge: "年年齢 (연나이)", yearsOld: "歳", invalid: "正しい日付を入力してください", note: "2023年6月から韓国は法的に満年齢に統一されました。" },
  zh: { birth: "出生日期", year: "年", month: "月", day: "日", intlAge: "周岁 (만나이)", countingAge: "虚岁 (세는나이)", yearAge: "年龄 (연나이)", yearsOld: "岁", invalid: "请输入有效日期", note: "自2023年6月起，韩国法律统一使用周岁。" },
  fr: { birth: "Date de naissance", year: "Année", month: "Mois", day: "Jour", intlAge: "Âge international (만나이)", countingAge: "Âge coréen (세는나이)", yearAge: "Âge par année (연나이)", yearsOld: "ans", invalid: "Saisissez une date valide", note: "Depuis juin 2023, la Corée utilise légalement l'âge international." },
  es: { birth: "Fecha de nacimiento", year: "Año", month: "Mes", day: "Día", intlAge: "Edad internacional (만나이)", countingAge: "Edad coreana (세는나이)", yearAge: "Edad por año (연나이)", yearsOld: "años", invalid: "Introduce una fecha válida", note: "Desde junio de 2023, Corea usa legalmente la edad internacional." },
};

interface Props {
  locale: Locale;
}

export default function KoreanAgeCalculator({ locale }: Props) {
  const t = L[locale] ?? L.en;
  const now = new Date();
  const [year, setYear] = useState("1995");
  const [month, setMonth] = useState("5");
  const [day, setDay] = useState("15");

  const y = parseInt(year);
  const mo = parseInt(month);
  const d = parseInt(day);
  const valid =
    y >= 1900 && y <= now.getFullYear() && mo >= 1 && mo <= 12 && d >= 1 && d <= 31;

  const cy = now.getFullYear();
  const cm = now.getMonth() + 1;
  const cd = now.getDate();

  // International (만나이): subtract 1 if this year's birthday hasn't passed
  let intl = cy - y;
  if (cm < mo || (cm === mo && cd < d)) intl -= 1;
  const counting = cy - y + 1; // 세는나이
  const yearAge = cy - y; // 연나이

  const inputCls =
    "w-20 rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-2 focus:outline-offset-2 focus:outline-primary";

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <span className="text-sm font-medium text-muted-foreground">{t.birth}</span>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <input className={inputCls} type="number" value={year} onChange={(e) => setYear(e.target.value)} aria-label={t.year} />
        <span className="text-sm text-muted-foreground">{t.year}</span>
        <input className={inputCls} type="number" value={month} onChange={(e) => setMonth(e.target.value)} aria-label={t.month} />
        <span className="text-sm text-muted-foreground">{t.month}</span>
        <input className={inputCls} type="number" value={day} onChange={(e) => setDay(e.target.value)} aria-label={t.day} />
        <span className="text-sm text-muted-foreground">{t.day}</span>
      </div>

      {!valid ? (
        <p className="mt-4 text-sm text-muted-foreground">{t.invalid}</p>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-primary bg-accent px-3 py-3 text-center">
            <p className="text-xs font-medium text-muted-foreground">{t.intlAge}</p>
            <p className="mt-1 font-mono text-2xl font-bold text-primary">
              {intl}
              <span className="ml-1 text-sm font-normal text-muted-foreground">{t.yearsOld}</span>
            </p>
          </div>
          <div className="rounded-md border border-border bg-background px-3 py-3 text-center">
            <p className="text-xs font-medium text-muted-foreground">{t.countingAge}</p>
            <p className="mt-1 font-mono text-2xl font-bold text-foreground">
              {counting}
              <span className="ml-1 text-sm font-normal text-muted-foreground">{t.yearsOld}</span>
            </p>
          </div>
          <div className="rounded-md border border-border bg-background px-3 py-3 text-center">
            <p className="text-xs font-medium text-muted-foreground">{t.yearAge}</p>
            <p className="mt-1 font-mono text-2xl font-bold text-foreground">
              {yearAge}
              <span className="ml-1 text-sm font-normal text-muted-foreground">{t.yearsOld}</span>
            </p>
          </div>
        </div>
      )}
      <p className="mt-4 text-xs text-muted-foreground">{t.note}</p>
    </div>
  );
}
