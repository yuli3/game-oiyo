'use client';
import { useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';

// ─────────────────────────────────────────────
// Saju (사주팔자) Core Data & Logic
// ─────────────────────────────────────────────

const STEMS = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'] as const;
const BRANCHES = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'] as const;
type Stem = typeof STEMS[number];
type Branch = typeof BRANCHES[number];

const STEM_ELEMENT: Record<Stem, string> = {
  갑: '목(木)', 을: '목(木)', 병: '화(火)', 정: '화(火)', 무: '토(土)',
  기: '토(土)', 경: '금(金)', 신: '금(金)', 임: '수(水)', 계: '수(水)',
};
const STEM_YINYANG: Record<Stem, string> = {
  갑: '양', 을: '음', 병: '양', 정: '음', 무: '양',
  기: '음', 경: '양', 신: '음', 임: '양', 계: '음',
};
const BRANCH_ELEMENT: Record<Branch, string> = {
  자: '수(水)', 축: '토(土)', 인: '목(木)', 묘: '목(木)', 진: '토(土)', 사: '화(火)',
  오: '화(火)', 미: '토(土)', 신: '금(金)', 유: '금(金)', 술: '토(土)', 해: '수(水)',
};
const BRANCH_ANIMAL: Record<Branch, string> = {
  자: '쥐(鼠)', 축: '소(牛)', 인: '호랑이(虎)', 묘: '토끼(兎)', 진: '용(龍)', 사: '뱀(蛇)',
  오: '말(馬)', 미: '양(羊)', 신: '원숭이(猴)', 유: '닭(鷄)', 술: '개(狗)', 해: '돼지(豬)',
};

// Year pillar: 1984 = 갑자 (year 0 in 60-cycle, stem=갑[0], branch=자[0])
function getYearPillar(year: number): { stem: Stem; branch: Branch } {
  const base = year - 4; // 1984 - 4 = 1980 → offset from base
  const stemIdx = ((base % 10) + 10) % 10;
  const branchIdx = ((base % 12) + 12) % 12;
  return { stem: STEMS[stemIdx], branch: BRANCHES[branchIdx] };
}

// Month pillar: derived from year stem + month (simplified, approximate)
// Proper calculation requires solar terms; this uses month-based approximation
const MONTH_BRANCH: Branch[] = ['인', '묘', '진', '사', '오', '미', '신', '유', '술', '해', '자', '축'];
function getMonthStem(yearStem: Stem, month: number): Stem {
  // Month stem table based on year stem (5-group pattern)
  const yearStemIdx = STEMS.indexOf(yearStem);
  const group = Math.floor(yearStemIdx / 2); // 0-4
  const monthStemStarts = [2, 4, 6, 8, 0]; // 병, 무, 경, 임, 갑
  const startIdx = monthStemStarts[group];
  const monthIdx = month - 1; // 0-based
  return STEMS[(startIdx + monthIdx) % 10];
}

// Day pillar: based on Julian Day Number calculation
function getJulianDay(y: number, m: number, d: number): number {
  const a = Math.floor((14 - m) / 12);
  const yr = y + 4800 - a;
  const mo = m + 12 * a - 3;
  return d + Math.floor((153 * mo + 2) / 5) + 365 * yr + Math.floor(yr / 4) - Math.floor(yr / 100) + Math.floor(yr / 400) - 32045;
}

function getDayPillar(year: number, month: number, day: number): { stem: Stem; branch: Branch } {
  // Reference: 1900-01-01 = 갑자 day (JD = 2415021)
  const jd = getJulianDay(year, month, day);
  const refJd = getJulianDay(1900, 1, 1); // 갑자 day
  const diff = jd - refJd;
  const stemIdx = ((diff % 10) + 10) % 10;
  const branchIdx = ((diff % 12) + 12) % 12;
  return { stem: STEMS[stemIdx], branch: BRANCHES[branchIdx] };
}

// Hour pillar: 12 two-hour periods starting from 자시 (23:00-01:00)
function getHourBranch(hour: number): Branch {
  // 자시=23,0  축시=1,2  인시=3,4  묘시=5,6  진시=7,8  사시=9,10
  // 오시=11,12  미시=13,14  신시=15,16  유시=17,18  술시=19,20  해시=21,22
  if (hour === 23 || hour === 0) return '자';
  return BRANCHES[Math.floor((hour + 1) / 2)];
}
function getHourStem(dayStem: Stem, hour: number): Stem {
  const dayStemIdx = STEMS.indexOf(dayStem);
  const group = Math.floor(dayStemIdx / 2);
  const hourBranchIdx = BRANCHES.indexOf(getHourBranch(hour));
  const stemStarts = [0, 2, 4, 6, 8]; // 갑, 병, 무, 경, 임
  return STEMS[(stemStarts[group] + hourBranchIdx) % 10];
}

interface Pillar { stem: Stem; branch: Branch; label: string; }

function getSaju(year: number, month: number, day: number, hour: number): Pillar[] {
  const yp = getYearPillar(year);
  const mp = { stem: getMonthStem(yp.stem, month), branch: MONTH_BRANCH[month - 1] };
  const dp = getDayPillar(year, month, day);
  const hp = { stem: getHourStem(dp.stem, hour), branch: getHourBranch(hour) };
  return [
    { ...yp, label: '년주(年柱)' },
    { ...mp, label: '월주(月柱)' },
    { ...dp, label: '일주(日柱)' },
    { ...hp, label: '시주(時柱)' },
  ];
}

function getElementCounts(pillars: Pillar[]) {
  const counts: Record<string, number> = { '목(木)': 0, '화(火)': 0, '토(土)': 0, '금(金)': 0, '수(水)': 0 };
  pillars.forEach(p => {
    counts[STEM_ELEMENT[p.stem]] = (counts[STEM_ELEMENT[p.stem]] || 0) + 1;
    counts[BRANCH_ELEMENT[p.branch]] = (counts[BRANCH_ELEMENT[p.branch]] || 0) + 1;
  });
  return counts;
}

const ELEMENT_COLOR: Record<string, string> = {
  '목(木)': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  '화(火)': 'bg-rose-100 text-rose-700 border-rose-200',
  '토(土)': 'bg-amber-100 text-amber-700 border-amber-200',
  '금(金)': 'bg-slate-100 text-slate-700 border-slate-200',
  '수(水)': 'bg-sky-100 text-sky-700 border-sky-200',
};

const DAYMASTER_DESC: Partial<Record<Stem, { ko: string; strength: string }>> = {
  갑: { ko: '갑목(甲木) — 곧게 뻗은 큰 나무. 진취적이고 리더십이 강합니다.', strength: '추진력, 독립심, 성장 지향' },
  을: { ko: '을목(乙木) — 부드럽게 뻗는 덩굴. 유연하고 적응력이 뛰어납니다.', strength: '유연성, 친화력, 세심함' },
  병: { ko: '병화(丙火) — 환한 태양. 밝고 열정적이며 에너지가 넘칩니다.', strength: '열정, 사교성, 활력' },
  정: { ko: '정화(丁火) — 촛불의 따뜻한 빛. 섬세하고 직관이 강합니다.', strength: '직관력, 예술성, 따뜻함' },
  무: { ko: '무토(戊土) — 넓은 산과 대지. 포용력이 크고 신뢰를 줍니다.', strength: '안정감, 포용력, 중재력' },
  기: { ko: '기토(己土) — 비옥한 들판. 성실하고 현실적입니다.', strength: '성실함, 실용성, 세밀함' },
  경: { ko: '경금(庚金) — 날카로운 칼날. 결단력이 있고 원칙을 중시합니다.', strength: '결단력, 정의감, 리더십' },
  신: { ko: '신금(辛金) — 빛나는 보석. 예민하고 완벽을 추구합니다.', strength: '완벽주의, 미적 감각, 분석력' },
  임: { ko: '임수(壬水) — 넓은 바다. 지혜롭고 자유로운 사고를 가집니다.', strength: '지혜, 창의성, 자유로운 사고' },
  계: { ko: '계수(癸水) — 조용한 샘물. 깊은 감수성과 직관을 가집니다.', strength: '감수성, 직관, 사색적 성향' },
};

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export function SajuCalculator() {
  const today = new Date();
  const [birthYear, setBirthYear] = useState(1990);
  const [birthMonth, setBirthMonth] = useState(1);
  const [birthDay, setBirthDay] = useState(1);
  const [birthHour, setBirthHour] = useState(12);
  const [unknownHour, setUnknownHour] = useState(false);
  const [result, setResult] = useState<Pillar[] | null>(null);

  const calculate = useCallback(() => {
    const pillars = getSaju(birthYear, birthMonth, birthDay, unknownHour ? 12 : birthHour);
    setResult(pillars);
  }, [birthYear, birthMonth, birthDay, birthHour, unknownHour]);

  const elementCounts = result ? getElementCounts(result) : null;
  const dayMaster = result ? result[2].stem : null;
  const dayMasterDesc = dayMaster ? DAYMASTER_DESC[dayMaster] : null;

  const HOUR_OPTIONS = [
    { value: 0, label: '자시 (23~01시)' }, { value: 2, label: '축시 (01~03시)' },
    { value: 4, label: '인시 (03~05시)' }, { value: 6, label: '묘시 (05~07시)' },
    { value: 8, label: '진시 (07~09시)' }, { value: 10, label: '사시 (09~11시)' },
    { value: 12, label: '오시 (11~13시)' }, { value: 14, label: '미시 (13~15시)' },
    { value: 16, label: '신시 (15~17시)' }, { value: 18, label: '유시 (17~19시)' },
    { value: 20, label: '술시 (19~21시)' }, { value: 22, label: '해시 (21~23시)' },
  ];

  return (
    <Card className="p-6 bg-white border-slate-200 shadow-xl mt-8">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-black text-slate-900">사주팔자 계산기</h3>
          <p className="text-xs text-slate-400 mt-0.5">생년월일시로 사주팔자(四柱八字)와 일간(日干) 특성을 분석합니다</p>
        </div>

        {/* Input */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500">출생 연도</label>
            <input type="number" value={birthYear} min={1900} max={today.getFullYear()}
              onChange={e => setBirthYear(parseInt(e.target.value) || 1990)}
              className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 font-semibold text-sm focus:border-amber-400 outline-none transition-colors" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500">월</label>
            <select value={birthMonth} onChange={e => setBirthMonth(parseInt(e.target.value))}
              className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 font-semibold text-sm focus:border-amber-400 outline-none transition-colors bg-white">
              {Array.from({length: 12}, (_, i) => <option key={i+1} value={i+1}>{i+1}월</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500">일</label>
            <select value={birthDay} onChange={e => setBirthDay(parseInt(e.target.value))}
              className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 font-semibold text-sm focus:border-amber-400 outline-none transition-colors bg-white">
              {Array.from({length: 31}, (_, i) => <option key={i+1} value={i+1}>{i+1}일</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500">출생 시간</label>
            {unknownHour ? (
              <div className="w-full border-2 border-dashed border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-400 text-center">모름</div>
            ) : (
              <select value={birthHour} onChange={e => setBirthHour(parseInt(e.target.value))}
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 font-semibold text-xs focus:border-amber-400 outline-none transition-colors bg-white">
                {HOUR_OPTIONS.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
              </select>
            )}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
          <input type="checkbox" checked={unknownHour} onChange={e => setUnknownHour(e.target.checked)}
            className="w-4 h-4 rounded accent-amber-500" />
          출생 시간 모름 (오시 정오로 계산)
        </label>

        <button onClick={calculate}
          className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-2xl transition-colors text-base">
          사주팔자 보기
        </button>

        {/* Result */}
        {result && (
          <div className="space-y-5">
            {/* 4 pillars */}
            <div className="grid grid-cols-4 gap-2">
              {result.map((pillar, i) => (
                <div key={i} className="text-center space-y-1">
                  <p className="text-[10px] font-bold text-slate-400">{pillar.label}</p>
                  <div className={`rounded-xl p-3 border ${i === 2 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                    <p className={`text-3xl font-black ${i === 2 ? 'text-amber-700' : 'text-slate-800'}`}>{pillar.stem}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{STEM_ELEMENT[pillar.stem]}</p>
                    <p className={`text-2xl font-black mt-1 ${i === 2 ? 'text-amber-600' : 'text-slate-700'}`}>{pillar.branch}</p>
                    <p className="text-xs text-slate-400">{BRANCH_ELEMENT[pillar.branch]}</p>
                  </div>
                  <p className="text-[10px] text-slate-500">{BRANCH_ANIMAL[pillar.branch]}</p>
                </div>
              ))}
            </div>

            {/* Day master description */}
            {dayMasterDesc && (
              <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 space-y-2">
                <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">일간(日干) · 나의 본질</p>
                <p className="font-bold text-slate-800">{dayMasterDesc.ko}</p>
                <p className="text-sm text-slate-600">주요 특성: {dayMasterDesc.strength}</p>
                <p className="text-xs text-amber-700 font-semibold">
                  {STEM_YINYANG[dayMaster!]} · {STEM_ELEMENT[dayMaster!]}
                </p>
              </div>
            )}

            {/* Element distribution */}
            {elementCounts && (
              <div className="space-y-2">
                <p className="text-sm font-bold text-slate-600">오행(五行) 분포 <span className="text-xs font-normal text-slate-400">(천간+지지 총 8자)</span></p>
                <div className="grid grid-cols-5 gap-1.5">
                  {Object.entries(elementCounts).map(([el, count]) => (
                    <div key={el} className={`text-center p-2 rounded-xl border ${ELEMENT_COLOR[el]}`}>
                      <p className="text-lg font-black">{count}</p>
                      <p className="text-[10px] font-bold">{el}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-400">* 많을수록 해당 오행의 기운이 강합니다. 부족한 오행을 보완하는 것이 사주 활용의 핵심입니다.</p>
              </div>
            )}

            <p className="text-[10px] text-slate-400 italic">
              * 이 계산기는 정통 명리학의 기본 원칙(60갑자, 일간 분석)을 구현한 교육용 도구입니다.
              월주는 태양력 절기 기준이 아닌 월력 기준으로 계산되어 실제와 1-3일 차이가 있을 수 있습니다.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
