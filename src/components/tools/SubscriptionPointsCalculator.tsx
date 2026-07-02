import React, { useState } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';

type Locale = 'ko' | 'en' | 'ja' | 'fr' | 'es' | 'zh';

const L: Record<Locale, {
  title: string; subtitle: string;
  dependents: string; depsNote: string;
  bankYears: string; bankNote: string;
  noPropYears: string; noPropNote: string;
  totalScore: string; maxScore: string;
  breakdown: string; score: string;
}> = {
  ko: {
    title: '청약가점 계산기', subtitle: 'Subscription Points Calculator',
    dependents: '부양가족 수', depsNote: '본인 제외 (0~6명). 배우자·직계존속·직계비속. 자녀 1인당 5점, 최대 35점',
    bankYears: '청약통장 가입 기간', bankNote: '가입 후 경과 년수 (0~15년). 최대 17점',
    noPropYears: '무주택 기간', noPropNote: '만 30세 이후 또는 혼인 후 무주택 기간 (0~15년). 최대 32점',
    totalScore: '총 청약가점', maxScore: '만점 84점',
    breakdown: '항목별 점수', score: '점',
  },
  en: {
    title: 'Subscription Points Calculator', subtitle: '청약가점 — Korean Apartment Lottery Score',
    dependents: 'Dependents', depsNote: 'Excluding self (0–6). Spouse, parents, children. 5 pts each, max 35.',
    bankYears: 'Savings Account Years', bankNote: 'Years since opening subscription savings account (0–15). Max 17 pts.',
    noPropYears: 'No-Property Years', noPropNote: 'Years without property since age 30 or marriage (0–15). Max 32 pts.',
    totalScore: 'Total Score', maxScore: 'Max 84 pts',
    breakdown: 'Score Breakdown', score: 'pts',
  },
  ja: {
    title: '청약가점 計算機', subtitle: '韓国マンション抽選スコア',
    dependents: '扶養家族数', depsNote: '本人除く（0〜6名）。最大35点',
    bankYears: '청약通帳加入期間', bankNote: '加入後経過年数（0〜15年）。最大17点',
    noPropYears: '無住宅期間', noPropNote: '30歳以降または婚姻後の無住宅年数（0〜15年）。最大32点',
    totalScore: '合計スコア', maxScore: '満点84点',
    breakdown: '項目別スコア', score: '点',
  },
  fr: {
    title: 'Calculateur de points 청약', subtitle: 'Score loterie logement coréen',
    dependents: 'Personnes à charge', depsNote: 'Hors vous-même (0–6). Max 35 pts.',
    bankYears: 'Ancienneté du compte épargne', bankNote: 'Années depuis ouverture (0–15). Max 17 pts.',
    noPropYears: 'Années sans propriété', noPropNote: 'Depuis 30 ans ou mariage (0–15). Max 32 pts.',
    totalScore: 'Score total', maxScore: 'Max 84 pts',
    breakdown: 'Détail des points', score: 'pts',
  },
  es: {
    title: 'Calculadora de puntos 청약', subtitle: 'Puntuación lotería vivienda coreana',
    dependents: 'Dependientes', depsNote: 'Sin incluirte (0–6). Max 35 pts.',
    bankYears: 'Años cuenta ahorro', bankNote: 'Años desde apertura (0–15). Max 17 pts.',
    noPropYears: 'Años sin propiedad', noPropNote: 'Desde 30 años o matrimonio (0–15). Max 32 pts.',
    totalScore: 'Puntuación total', maxScore: 'Máx. 84 pts',
    breakdown: 'Desglose de puntos', score: 'pts',
  },
  zh: {
    title: '청약加分计算器', subtitle: '韩国公寓抽签积分',
    dependents: '扶养家属数', depsNote: '不含本人（0–6名）。最多35分',
    bankYears: '청약存款账户年数', bankNote: '开户后经过年数（0–15年）。最多17分',
    noPropYears: '无住宅年数', noPropNote: '满30岁或结婚后无住宅年数（0–15年）。最多32分',
    totalScore: '总加分', maxScore: '满分84分',
    breakdown: '各项目分数', score: '分',
  },
};

// Korean 청약가점 scoring tables
function calcDepsScore(n: number): number {
  // 0명=5, 1명=10, 2명=15, 3명=20, 4명=25, 5명=30, 6명이상=35
  if (n <= 0) return 5;
  return Math.min(5 + n * 5, 35);
}

function calcBankScore(years: number): number {
  // 6개월 미만=1, 6개월~1년=2, 1~2년=3, 2~3년=4, 3~4년=5, 4~5년=6, 5~6년=7
  // 6~7년=8, 7~8년=9, 8~9년=10, 9~10년=11, 10~11년=12, 11~12년=13, 12~13년=14
  // 13~14년=15, 14~15년=16, 15년이상=17
  const pts = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
  if (years < 0.5) return 1;
  const idx = Math.min(Math.floor(years), 15);
  return pts[Math.min(idx, pts.length - 1)];
}

function calcNoPropScore(years: number): number {
  // 1년 미만=2, 1~2년=4, 2~3년=6, ..., 15년이상=32
  if (years < 1) return 2;
  return Math.min(Math.ceil(years) * 2, 32);
}

const SubscriptionPointsCalculator: React.FC<{ locale?: Locale }> = ({ locale = 'ko' }) => {
  const t = L[locale] ?? L.ko;

  const [deps, setDeps] = useState(0);
  const [bankYears, setBankYears] = useState(5);
  const [noPropYears, setNoPropYears] = useState(5);
  const [hasProperty, setHasProperty] = useState(false);

  const depsScore = calcDepsScore(deps);
  const bankScore = calcBankScore(bankYears);
  const noPropScore = hasProperty ? 0 : calcNoPropScore(noPropYears);
  const total = depsScore + bankScore + noPropScore;

  const pct = Math.round((total / 84) * 100);
  const barColor = pct >= 75 ? 'bg-success' : pct >= 50 ? 'bg-info' : pct >= 25 ? 'bg-warning' : 'bg-muted-foreground/30';

  return (
    <GameContainer
      title={t.title}
      subtitle={t.subtitle}
      onReset={() => { setDeps(0); setBankYears(5); setNoPropYears(5); setHasProperty(false); }}
    >
      <div className="flex flex-col gap-8">

        {/* Dependents */}
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t.dependents}</label>
            <p className="text-[10px] text-muted-foreground mt-0.5">{t.depsNote}</p>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setDeps(d => Math.max(0, d - 1))} className="w-11 h-11 rounded-2xl bg-muted border border-border font-black text-xl hover:bg-accent transition-colors">−</button>
            <span className="text-4xl font-black w-12 text-center">{deps}</span>
            <button onClick={() => setDeps(d => Math.min(6, d + 1))} className="w-11 h-11 rounded-2xl bg-muted border border-border font-black text-xl hover:bg-accent transition-colors">+</button>
            <span className="text-xs font-bold text-muted-foreground ml-2">→ {depsScore}{t.score}</span>
          </div>
        </div>

        {/* Bank years */}
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t.bankYears}</label>
            <p className="text-[10px] text-muted-foreground mt-0.5">{t.bankNote}</p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={15}
              step={0.5}
              value={bankYears}
              onChange={e => setBankYears(Number(e.target.value))}
              className="flex-1 accent-primary"
            />
            <span className="w-24 text-right font-black">{bankYears}년 → {bankScore}{t.score}</span>
          </div>
        </div>

        {/* No-property section */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="has-property"
              checked={hasProperty}
              onChange={e => setHasProperty(e.target.checked)}
              className="w-4 h-4 accent-primary rounded"
            />
            <label htmlFor="has-property" className="text-sm font-bold cursor-pointer">
              {locale === 'ko' ? '현재 주택 보유 중' : 'Currently owns property (no-property score = 0)'}
            </label>
          </div>
          {!hasProperty && (
            <>
              <div>
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t.noPropYears}</label>
                <p className="text-[10px] text-muted-foreground mt-0.5">{t.noPropNote}</p>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={15}
                  step={0.5}
                  value={noPropYears}
                  onChange={e => setNoPropYears(Number(e.target.value))}
                  className="flex-1 accent-primary"
                />
                <span className="w-24 text-right font-black">{noPropYears}년 → {noPropScore}{t.score}</span>
              </div>
            </>
          )}
        </div>

        {/* Result */}
        <div className="space-y-4">
          <div className="p-8 rounded-[32px] bg-muted/30 border-2 border-border text-center space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t.totalScore}</p>
            <p className="text-6xl font-black">{total}</p>
            <p className="text-sm font-bold text-muted-foreground">{t.maxScore}</p>
            <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
              <div className={`h-3 rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
            </div>
            <p className="text-sm font-black text-muted-foreground">{pct}%</p>
          </div>

          {/* Breakdown */}
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t.breakdown}</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: t.dependents, val: depsScore, max: 35 },
                { label: t.bankYears, val: bankScore, max: 17 },
                { label: t.noPropYears, val: noPropScore, max: 32 },
              ].map(({ label, val, max }) => (
                <div key={label} className="p-4 rounded-2xl bg-muted/20 border border-border text-center space-y-1">
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground line-clamp-1">{label}</p>
                  <p className="text-2xl font-black">{val}</p>
                  <p className="text-[10px] text-muted-foreground">/ {max}</p>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div className="h-1.5 rounded-full bg-primary/70 transition-all" style={{ width: `${(val / max) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </GameContainer>
  );
};

export default SubscriptionPointsCalculator;
