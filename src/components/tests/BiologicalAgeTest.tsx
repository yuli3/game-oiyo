import { useState, useMemo } from 'react'

type Locale = 'ko' | 'en' | 'ja' | 'fr' | 'es' | 'zh'

const LABELS: Record<Locale, {
  title: string; subtitle: string; calculate: string; reset: string; note: string
  chronoAge: string; bioAge: string; diff: string; older: string; younger: string
  categories: Record<string, string>
}> = {
  ko: { title: '생체 나이 계산기', subtitle: '생활 습관으로 실제 건강 나이를 계산해보세요', calculate: '계산하기', reset: '초기화', note: '이 계산기는 과학적 참고용입니다. 정확한 건강 평가는 전문의와 상담하세요.', chronoAge: '실제 나이', bioAge: '생체 나이', diff: '차이', older: '세 더 늙은 상태', younger: '세 더 젊은 상태',
    categories: { sleep: '수면', exercise: '운동', diet: '식습관', stress: '스트레스', smoking: '흡연', alcohol: '음주', bmi: 'BMI', social: '사회적 연결' } },
  en: { title: 'Biological Age Calculator', subtitle: 'Calculate your real health age based on lifestyle habits', calculate: 'Calculate', reset: 'Reset', note: 'This calculator is for scientific reference. Consult a doctor for accurate health assessment.', chronoAge: 'Chronological Age', bioAge: 'Biological Age', diff: 'Difference', older: 'years biologically older', younger: 'years biologically younger',
    categories: { sleep: 'Sleep', exercise: 'Exercise', diet: 'Diet', stress: 'Stress', smoking: 'Smoking', alcohol: 'Alcohol', bmi: 'BMI', social: 'Social Connection' } },
  ja: { title: '生物学的年齢計算機', subtitle: '生活習慣から実際の健康年齢を計算', calculate: '計算する', reset: 'リセット', note: 'この計算機は科学的な参考用です。正確な健康評価は専門医に相談してください。', chronoAge: '実際の年齢', bioAge: '生物学的年齢', diff: '差', older: '歳生物学的に老化', younger: '歳生物学的に若い',
    categories: { sleep: '睡眠', exercise: '運動', diet: '食習慣', stress: 'ストレス', smoking: '喫煙', alcohol: '飲酒', bmi: 'BMI', social: '社会的つながり' } },
  fr: { title: 'Calculateur d\'Âge Biologique', subtitle: 'Calculez votre âge de santé réel basé sur vos habitudes de vie', calculate: 'Calculer', reset: 'Réinitialiser', note: 'Ce calculateur est à titre scientifique indicatif.', chronoAge: 'Âge chronologique', bioAge: 'Âge biologique', diff: 'Différence', older: 'ans biologiquement plus vieux', younger: 'ans biologiquement plus jeune', categories: { sleep: 'Sommeil', exercise: 'Exercice', diet: 'Alimentation', stress: 'Stress', smoking: 'Tabagisme', alcohol: 'Alcool', bmi: 'IMC', social: 'Connexion sociale' } },
  es: { title: 'Calculadora de Edad Biológica', subtitle: 'Calcula tu edad de salud real basada en hábitos de vida', calculate: 'Calcular', reset: 'Reiniciar', note: 'Esta calculadora es de referencia científica.', chronoAge: 'Edad cronológica', bioAge: 'Edad biológica', diff: 'Diferencia', older: 'años biológicamente mayor', younger: 'años biológicamente más joven', categories: { sleep: 'Sueño', exercise: 'Ejercicio', diet: 'Dieta', stress: 'Estrés', smoking: 'Tabaco', alcohol: 'Alcohol', bmi: 'IMC', social: 'Conexión social' } },
  zh: { title: '生物年龄计算器', subtitle: '根据生活习惯计算您的真实健康年龄', calculate: '计算', reset: '重置', note: '此计算器仅供科学参考。准确健康评估请咨询医生。', chronoAge: '实际年龄', bioAge: '生物年龄', diff: '差异', older: '岁生物老化', younger: '岁生物年轻', categories: { sleep: '睡眠', exercise: '运动', diet: '饮食习惯', stress: '压力', smoking: '吸烟', alcohol: '饮酒', bmi: 'BMI', social: '社交连结' } },
}

interface Factor { key: string; question: { ko: string; en: string }; options: { label: { ko: string; en: string }; delta: number }[] }

const FACTORS: Factor[] = [
  { key: 'age', question: { ko: '현재 나이', en: 'Current age' }, options: [] }, // special
  { key: 'sleep', question: { ko: '하루 평균 수면 시간은?', en: 'Average daily sleep?' },
    options: [{ label:{ko:'7~8시간(최적)',en:'7-8h (optimal)'}, delta:-1.5 }, { label:{ko:'6~7시간',en:'6-7h'}, delta:-0.5 }, { label:{ko:'5~6시간',en:'5-6h'}, delta:1.0 }, { label:{ko:'5시간 미만/9시간 이상',en:'<5h or >9h'}, delta:2.5 }] },
  { key: 'exercise', question: { ko: '주당 유산소+근력 운동 빈도는?', en: 'Weekly aerobic+strength exercise?' },
    options: [{ label:{ko:'주 5회 이상(적극적)',en:'5+/week (active)'}, delta:-3.0 }, { label:{ko:'주 3~4회',en:'3-4/week'}, delta:-1.5 }, { label:{ko:'주 1~2회',en:'1-2/week'}, delta:0.5 }, { label:{ko:'거의 없음',en:'Rarely'}, delta:3.0 }] },
  { key: 'diet', question: { ko: '식단 습관은?', en: 'Diet habits?' },
    options: [{ label:{ko:'채소·과일 충분·가공식품 적음',en:'Plenty of veg/fruit, low processed'}, delta:-2.0 }, { label:{ko:'보통 균형',en:'Moderately balanced'}, delta:0 }, { label:{ko:'가공식품·외식 많음',en:'High processed/eating out'}, delta:1.5 }, { label:{ko:'불규칙·패스트푸드 위주',en:'Irregular, mostly fast food'}, delta:3.0 }] },
  { key: 'stress', question: { ko: '평소 스트레스 수준은?', en: 'Usual stress level?' },
    options: [{ label:{ko:'낮음·효과적 관리',en:'Low, managed well'}, delta:-1.5 }, { label:{ko:'보통',en:'Moderate'}, delta:0 }, { label:{ko:'높음·자주 긴장',en:'High, often tense'}, delta:2.0 }, { label:{ko:'매우 높음·만성 스트레스',en:'Very high, chronic stress'}, delta:4.0 }] },
  { key: 'smoking', question: { ko: '흡연 여부는?', en: 'Smoking?' },
    options: [{ label:{ko:'비흡연',en:'Non-smoker'}, delta:0 }, { label:{ko:'금연 5년 이상',en:'Quit 5+ years ago'}, delta:0.5 }, { label:{ko:'금연 1~5년',en:'Quit 1-5 years ago'}, delta:1.5 }, { label:{ko:'현재 흡연',en:'Current smoker'}, delta:5.0 }] },
  { key: 'alcohol', question: { ko: '음주 빈도와 양은?', en: 'Drinking frequency and amount?' },
    options: [{ label:{ko:'음주 안 함/매우 가끔',en:'None / very rarely'}, delta:0 }, { label:{ko:'주 1~2회·적당량',en:'1-2/week, moderate'}, delta:0.5 }, { label:{ko:'주 3~4회 또는 과음',en:'3-4/week or heavy'}, delta:2.0 }, { label:{ko:'매일·과음',en:'Daily, heavy'}, delta:4.0 }] },
  { key: 'bmi', question: { ko: 'BMI 범위는? (체중kg ÷ 키m²)', en: 'BMI range? (weight kg ÷ height m²)' },
    options: [{ label:{ko:'18.5~22.9 (정상)',en:'18.5-22.9 (Normal)'}, delta:-1.0 }, { label:{ko:'23~24.9 (과체중 경계)',en:'23-24.9 (Borderline overweight)'}, delta:0.5 }, { label:{ko:'25~29.9 (과체중)',en:'25-29.9 (Overweight)'}, delta:1.5 }, { label:{ko:'30 이상 또는 18.5 미만',en:'30+ or under 18.5'}, delta:3.0 }] },
  { key: 'social', question: { ko: '사회적 연결(친밀한 관계)은?', en: 'Social connection (close relationships)?' },
    options: [{ label:{ko:'풍부한 관계·자주 교류',en:'Rich relationships, frequent interaction'}, delta:-1.5 }, { label:{ko:'보통 수준',en:'Moderate'}, delta:0 }, { label:{ko:'가끔 외로움',en:'Occasionally lonely'}, delta:1.0 }, { label:{ko:'자주 고립감',en:'Frequently isolated'}, delta:2.5 }] },
]

interface Props { locale: Locale }

export default function BiologicalAgeTest({ locale }: Props) {
  const l = LABELS[locale] ?? LABELS.en
  const isKo = locale === 'ko'
  const [chrono, setChrono] = useState(30)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [result, setResult] = useState<number | null>(null)

  const allAnswered = FACTORS.filter(f => f.key !== 'age').every(f => answers[f.key] !== undefined)

  const bioAge = useMemo(() => {
    if (result === null) return null
    const total = Object.values(answers).reduce((s, v) => s + v, 0)
    return Math.max(10, Math.round(chrono + total))
  }, [result, answers, chrono])

  const diff = bioAge !== null ? bioAge - chrono : 0

  return (
    <div className="space-y-5 py-4">
      <div className="text-center space-y-1">
        <div className="text-3xl">🧬</div>
        <h1 className="text-xl font-bold">{l.title}</h1>
        <p className="text-sm text-muted-foreground">{l.subtitle}</p>
      </div>

      {result === null ? (
        <>
          {/* Age input */}
          <div className="space-y-1">
            <label className="text-sm font-medium">{isKo ? '현재 나이' : 'Current Age'}</label>
            <div className="flex items-center gap-3">
              <input type="range" min={15} max={80} value={chrono} onChange={e=>setChrono(+e.target.value)} className="flex-1 accent-primary" />
              <span className="text-base font-bold w-12 text-right">{chrono}{isKo?'세':''}</span>
            </div>
          </div>
          {FACTORS.filter(f=>f.key!=='age').map(f => (
            <div key={f.key} className="space-y-2">
              <p className="text-sm font-medium">{isKo ? f.question.ko : f.question.en}</p>
              <div className="grid grid-cols-2 gap-2">
                {f.options.map((opt, i) => (
                  <button key={i} onClick={() => setAnswers(a => ({ ...a, [f.key]: opt.delta }))}
                    className={`text-left px-3 py-2.5 rounded-xl border text-xs transition-all ${answers[f.key] === opt.delta ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent'}`}>
                    {isKo ? opt.label.ko : opt.label.en}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <button onClick={() => setResult(1)} disabled={!allAnswered}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold disabled:opacity-50 hover:bg-primary/90 transition-colors">
            {l.calculate}
          </button>
        </>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">{l.chronoAge}</p>
              <p className="text-3xl font-black">{chrono}</p>
            </div>
            <div className={`rounded-xl border p-4 text-center ${diff > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
              <p className="text-xs text-muted-foreground mb-1">{l.bioAge}</p>
              <p className={`text-3xl font-black ${diff > 0 ? 'text-red-600' : 'text-green-600'}`}>{bioAge}</p>
            </div>
          </div>
          <div className={`rounded-2xl p-4 text-center ${diff > 0 ? 'bg-red-50 border border-red-200' : diff < 0 ? 'bg-green-50 border border-green-200' : 'bg-secondary border'}`}>
            <p className="text-lg font-bold">
              {Math.abs(diff)} {l.diff} {diff > 0 ? `→ ${l.older}` : diff < 0 ? `→ ${l.younger}` : '= 나이와 동일'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {diff > 3 ? (isKo?'생활 습관 개선이 시급합니다':'Lifestyle improvement is urgent')
                : diff > 0 ? (isKo?'조금 더 건강에 신경 써보세요':'Pay a bit more attention to your health')
                : diff < -3 ? (isKo?'훌륭한 생활 습관! 계속 유지하세요':'Excellent lifestyle! Keep it up')
                : (isKo?'현재 건강 상태가 나이에 맞습니다':'Your health is appropriate for your age')}
            </p>
          </div>
          {/* Factor breakdown */}
          <div className="space-y-2">
            {FACTORS.filter(f=>f.key!=='age').map(f=>{
              const delta = answers[f.key] ?? 0
              return (
                <div key={f.key} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{l.categories[f.key]}</span>
                  <span className={`font-medium ${delta < 0 ? 'text-green-600' : delta > 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                    {delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : '±0'}
                  </span>
                </div>
              )
            })}
          </div>
          <p className="text-xs text-muted-foreground border-t pt-3">{l.note}</p>
          <button onClick={() => { setResult(null); setAnswers({}) }} className="w-full py-3 border rounded-xl text-sm font-medium hover:bg-accent transition-colors">{l.reset}</button>
        </div>
      )}
    </div>
  )
}
