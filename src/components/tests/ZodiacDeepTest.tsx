import { useState } from 'react'

type Locale = 'ko' | 'en' | 'ja' | 'fr' | 'es' | 'zh'
type Sign = 'aries'|'taurus'|'gemini'|'cancer'|'leo'|'virgo'|'libra'|'scorpio'|'sagittarius'|'capricorn'|'aquarius'|'pisces'

const SIGNS: Record<Sign, { emoji: string; ko: string; en: string; dateRange: string; element: string; ruling: string }> = {
  aries: { emoji: '♈', ko: '양자리', en: 'Aries', dateRange: '3/21–4/19', element: '🔥 Fire', ruling: '♂ Mars' },
  taurus: { emoji: '♉', ko: '황소자리', en: 'Taurus', dateRange: '4/20–5/20', element: '🌍 Earth', ruling: '♀ Venus' },
  gemini: { emoji: '♊', ko: '쌍둥이자리', en: 'Gemini', dateRange: '5/21–6/20', element: '💨 Air', ruling: '☿ Mercury' },
  cancer: { emoji: '♋', ko: '게자리', en: 'Cancer', dateRange: '6/21–7/22', element: '💧 Water', ruling: '☽ Moon' },
  leo: { emoji: '♌', ko: '사자자리', en: 'Leo', dateRange: '7/23–8/22', element: '🔥 Fire', ruling: '☀ Sun' },
  virgo: { emoji: '♍', ko: '처녀자리', en: 'Virgo', dateRange: '8/23–9/22', element: '🌍 Earth', ruling: '☿ Mercury' },
  libra: { emoji: '♎', ko: '천칭자리', en: 'Libra', dateRange: '9/23–10/22', element: '💨 Air', ruling: '♀ Venus' },
  scorpio: { emoji: '♏', ko: '전갈자리', en: 'Scorpio', dateRange: '10/23–11/21', element: '💧 Water', ruling: '♇ Pluto' },
  sagittarius: { emoji: '♐', ko: '사수자리', en: 'Sagittarius', dateRange: '11/22–12/21', element: '🔥 Fire', ruling: '♃ Jupiter' },
  capricorn: { emoji: '♑', ko: '염소자리', en: 'Capricorn', dateRange: '12/22–1/19', element: '🌍 Earth', ruling: '♄ Saturn' },
  aquarius: { emoji: '♒', ko: '물병자리', en: 'Aquarius', dateRange: '1/20–2/18', element: '💨 Air', ruling: '⛢ Uranus' },
  pisces: { emoji: '♓', ko: '물고기자리', en: 'Pisces', dateRange: '2/19–3/20', element: '💧 Water', ruling: '♆ Neptune' },
}

const PROFILES: Record<Sign, { ko: { strengths: string[]; weaknesses: string[]; compatibility: Sign[]; desc: string; career: string }; en: { strengths: string[]; weaknesses: string[]; compatibility: Sign[]; desc: string; career: string } }> = {
  aries: { ko: { strengths: ['열정', '리더십', '용감함', '행동력'], weaknesses: ['충동적', '인내심 부족', '자기중심적'], compatibility: ['leo', 'sagittarius', 'gemini', 'aquarius'], desc: '화성의 지배를 받는 양자리는 태양이 가장 먼저 도달하는 첫 번째 별자리입니다. 개척자 정신과 넘치는 에너지로 항상 새로운 것을 시작하고 싶어합니다.', career: '기업가, 군인, 스포츠, 마케팅, 소방관' }, en: { strengths: ['Passion', 'Leadership', 'Courage', 'Decisive action'], weaknesses: ['Impulsive', 'Impatient', 'Self-centered'], compatibility: ['leo', 'sagittarius', 'gemini', 'aquarius'], desc: 'Ruled by Mars, Aries is the first sign of the zodiac. Pioneer spirit and boundless energy make them natural leaders always ready to start something new.', career: 'Entrepreneur, Military, Sports, Marketing, Firefighter' } },
  taurus: { ko: { strengths: ['안정감', '인내심', '실용적', '신뢰성'], weaknesses: ['고집스러움', '변화 거부', '물질주의'], compatibility: ['virgo', 'capricorn', 'cancer', 'pisces'], desc: '금성의 지배를 받는 황소자리는 오감의 쾌락과 안정을 추구합니다. 느리지만 꾸준하며, 한번 결심하면 어떤 어려움도 이겨냅니다.', career: '요리사, 금융, 부동산, 원예, 예술가' }, en: { strengths: ['Stability', 'Patience', 'Practical', 'Reliable'], weaknesses: ['Stubborn', 'Resistant to change', 'Materialistic'], compatibility: ['virgo', 'capricorn', 'cancer', 'pisces'], desc: 'Ruled by Venus, Taurus seeks sensory pleasures and stability. Slow but steady, once committed they overcome any obstacle.', career: 'Chef, Finance, Real Estate, Horticulture, Artist' } },
  gemini: { ko: { strengths: ['적응력', '소통 능력', '호기심', '재치'], weaknesses: ['변덕스러움', '집중력 부족', '이중성'], compatibility: ['libra', 'aquarius', 'aries', 'leo'], desc: '수성의 지배를 받는 쌍둥이자리는 정보와 아이디어의 화신입니다. 다재다능하고 사교적이며 끊임없이 새로운 것을 배우고 싶어합니다.', career: '기자, 교사, 번역가, 세일즈, 작가' }, en: { strengths: ['Adaptability', 'Communication', 'Curiosity', 'Wit'], weaknesses: ['Inconsistent', 'Indecisive', 'Dual nature'], compatibility: ['libra', 'aquarius', 'aries', 'leo'], desc: 'Ruled by Mercury, Gemini embodies information and ideas. Versatile and social, they constantly seek new knowledge.', career: 'Journalist, Teacher, Translator, Sales, Writer' } },
  cancer: { ko: { strengths: ['공감 능력', '충성심', '직관력', '보호 본능'], weaknesses: ['감정 기복', '지나친 감수성', '집착'], compatibility: ['scorpio', 'pisces', 'taurus', 'virgo'], desc: '달의 지배를 받는 게자리는 가장 감성적이고 직관적인 별자리입니다. 가족과 가정을 최우선으로 여기며 사랑하는 사람들을 헌신적으로 돌봅니다.', career: '간호사, 사회복지사, 교사, 요리사, 상담사' }, en: { strengths: ['Empathy', 'Loyalty', 'Intuition', 'Protectiveness'], weaknesses: ['Mood swings', 'Over-sensitivity', 'Clinginess'], compatibility: ['scorpio', 'pisces', 'taurus', 'virgo'], desc: 'Ruled by the Moon, Cancer is the most emotional and intuitive sign. Family-oriented and devoted to caring for loved ones.', career: 'Nurse, Social Worker, Teacher, Chef, Counselor' } },
  leo: { ko: { strengths: ['자신감', '창의성', '너그러움', '카리스마'], weaknesses: ['자아도취', '허영심', '지배욕'], compatibility: ['aries', 'sagittarius', 'gemini', 'libra'], desc: '태양의 지배를 받는 사자자리는 자연스러운 무대의 중심입니다. 따뜻한 심장과 빛나는 존재감으로 주변을 밝히며, 진심으로 사람들을 돕습니다.', career: '배우, 연예인, CEO, 정치인, 예술감독' }, en: { strengths: ['Confidence', 'Creativity', 'Generosity', 'Charisma'], weaknesses: ['Ego', 'Vanity', 'Domineering'], compatibility: ['aries', 'sagittarius', 'gemini', 'libra'], desc: 'Ruled by the Sun, Leo is a natural center stage. Warm-hearted with a radiant presence, they genuinely help those around them.', career: 'Actor, Entertainer, CEO, Politician, Art Director' } },
  virgo: { ko: { strengths: ['분석력', '완벽주의', '근면함', '세심함'], weaknesses: ['지나친 비판', '걱정이 많음', '완고함'], compatibility: ['taurus', 'capricorn', 'cancer', 'scorpio'], desc: '수성의 지배를 받는 처녀자리는 완벽을 추구하는 분석의 달인입니다. 세부사항에 주의를 기울이고 실용적인 해결책을 찾는 데 탁월합니다.', career: '의사, 과학자, 회계사, 편집자, 영양사' }, en: { strengths: ['Analytical', 'Perfectionist', 'Diligent', 'Detail-oriented'], weaknesses: ['Over-critical', 'Worrisome', 'Rigid'], compatibility: ['taurus', 'capricorn', 'cancer', 'scorpio'], desc: 'Ruled by Mercury, Virgo is a master of analysis pursuing perfection. Exceptional at paying attention to detail and finding practical solutions.', career: 'Doctor, Scientist, Accountant, Editor, Nutritionist' } },
  libra: { ko: { strengths: ['균형감각', '외교술', '공정함', '매력'], weaknesses: ['우유부단함', '회피성', '의존성'], compatibility: ['gemini', 'aquarius', 'leo', 'sagittarius'], desc: '금성의 지배를 받는 천칭자리는 조화와 균형의 화신입니다. 타고난 외교관으로 양쪽의 관점을 이해하고 공정한 해결책을 추구합니다.', career: '변호사, 외교관, 패션디자이너, 중재인, 상담사' }, en: { strengths: ['Balanced', 'Diplomatic', 'Fair-minded', 'Charming'], weaknesses: ['Indecisive', 'Avoidant', 'Dependent'], compatibility: ['gemini', 'aquarius', 'leo', 'sagittarius'], desc: 'Ruled by Venus, Libra embodies harmony and balance. A natural diplomat who understands both sides and seeks fair solutions.', career: 'Lawyer, Diplomat, Fashion Designer, Mediator, Counselor' } },
  scorpio: { ko: { strengths: ['통찰력', '의지력', '집중력', '변화 능력'], weaknesses: ['질투심', '복수심', '비밀주의'], compatibility: ['cancer', 'pisces', 'virgo', 'capricorn'], desc: '명왕성의 지배를 받는 전갈자리는 가장 강렬하고 신비로운 별자리입니다. 표면 아래 숨겨진 진실을 꿰뚫어 보는 능력이 있으며, 깊은 변화를 두려워하지 않습니다.', career: '심리학자, 형사, 외과의사, 연구원, 전략가' }, en: { strengths: ['Insight', 'Willpower', 'Focus', 'Transformative'], weaknesses: ['Jealous', 'Vengeful', 'Secretive'], compatibility: ['cancer', 'pisces', 'virgo', 'capricorn'], desc: 'Ruled by Pluto, Scorpio is the most intense and mysterious sign. Able to see through surface truths, they embrace deep transformation.', career: 'Psychologist, Detective, Surgeon, Researcher, Strategist' } },
  sagittarius: { ko: { strengths: ['낙관주의', '철학적 사고', '모험심', '자유로움'], weaknesses: ['무책임함', '과장됨', '방랑벽'], compatibility: ['aries', 'leo', 'libra', 'aquarius'], desc: '목성의 지배를 받는 사수자리는 영원한 탐험가이자 철학자입니다. 새로운 문화와 아이디어를 끊임없이 탐구하며 삶의 의미를 찾습니다.', career: '여행가, 교수, 철학자, 코치, 출판인' }, en: { strengths: ['Optimism', 'Philosophical', 'Adventurous', 'Free-spirited'], weaknesses: ['Irresponsible', 'Exaggerating', 'Restless'], compatibility: ['aries', 'leo', 'libra', 'aquarius'], desc: 'Ruled by Jupiter, Sagittarius is the eternal explorer and philosopher. Constantly seeking new cultures and ideas to find life\'s meaning.', career: 'Traveler, Professor, Philosopher, Coach, Publisher' } },
  capricorn: { ko: { strengths: ['야망', '책임감', '자제력', '실용성'], weaknesses: ['냉정함', '일중독', '비관적'], compatibility: ['taurus', 'virgo', 'scorpio', 'pisces'], desc: '토성의 지배를 받는 염소자리는 가장 야심차고 끈질긴 별자리입니다. 목표를 향해 꾸준히 오르며, 성공을 위해 무엇이든 희생할 준비가 되어 있습니다.', career: 'CEO, 정치인, 관리자, 건축가, 금융전문가' }, en: { strengths: ['Ambitious', 'Responsible', 'Self-control', 'Practical'], weaknesses: ['Cold', 'Workaholic', 'Pessimistic'], compatibility: ['taurus', 'virgo', 'scorpio', 'pisces'], desc: 'Ruled by Saturn, Capricorn is the most ambitious and persistent sign. Steadily climbing toward goals, willing to sacrifice anything for success.', career: 'CEO, Politician, Manager, Architect, Financial Expert' } },
  aquarius: { ko: { strengths: ['독창성', '인도주의', '독립심', '진보적'], weaknesses: ['고집스러움', '감정 표현 서툼', '반항적'], compatibility: ['gemini', 'libra', 'aries', 'sagittarius'], desc: '천왕성의 지배를 받는 물병자리는 시대를 앞서가는 혁신가입니다. 집단보다 개인을 중시하면서도 인류 전체를 위한 더 나은 세상을 꿈꿉니다.', career: '과학자, 사회운동가, IT 전문가, 발명가, 미래학자' }, en: { strengths: ['Original', 'Humanitarian', 'Independent', 'Progressive'], weaknesses: ['Stubborn', 'Emotionally detached', 'Rebellious'], compatibility: ['gemini', 'libra', 'aries', 'sagittarius'], desc: 'Ruled by Uranus, Aquarius is an ahead-of-its-time innovator. Values individuality while dreaming of a better world for all humanity.', career: 'Scientist, Social Activist, IT Expert, Inventor, Futurist' } },
  pisces: { ko: { strengths: ['창의성', '공감 능력', '직관', '자기희생'], weaknesses: ['우유부단', '현실 도피', '지나친 감수성'], compatibility: ['cancer', 'scorpio', 'taurus', 'capricorn'], desc: '해왕성의 지배를 받는 물고기자리는 황도대의 마지막 별자리로, 앞선 11개 별자리의 특성을 모두 흡수합니다. 깊은 공감 능력과 예술적 감수성으로 세상과 연결됩니다.', career: '예술가, 음악가, 간호사, 심리치료사, 영화감독' }, en: { strengths: ['Creative', 'Empathetic', 'Intuitive', 'Self-sacrificing'], weaknesses: ['Indecisive', 'Escapist', 'Over-sensitive'], compatibility: ['cancer', 'scorpio', 'taurus', 'capricorn'], desc: 'Ruled by Neptune, Pisces is the last zodiac sign absorbing traits of all 11 preceding signs. Connects to the world through deep empathy and artistic sensitivity.', career: 'Artist, Musician, Nurse, Psychotherapist, Film Director' } },
}

const MONTHS = ['1','2','3','4','5','6','7','8','9','10','11','12']
const DAYS = Array.from({length:31},(_,i)=>String(i+1))

function getSign(month: number, day: number): Sign {
  const d = month * 100 + day
  if (d >= 321 && d <= 419) return 'aries'
  if (d >= 420 && d <= 520) return 'taurus'
  if (d >= 521 && d <= 620) return 'gemini'
  if (d >= 621 && d <= 722) return 'cancer'
  if (d >= 723 && d <= 822) return 'leo'
  if (d >= 823 && d <= 922) return 'virgo'
  if (d >= 923 && d <= 1022) return 'libra'
  if (d >= 1023 && d <= 1121) return 'scorpio'
  if (d >= 1122 && d <= 1221) return 'sagittarius'
  if (d >= 1222 || d <= 119) return 'capricorn'
  if (d >= 120 && d <= 218) return 'aquarius'
  return 'pisces'
}

interface Props { locale: Locale }

export default function ZodiacDeepTest({ locale }: Props) {
  const isKo = locale === 'ko'
  const [month, setMonth] = useState('')
  const [day, setDay] = useState('')
  const [result, setResult] = useState<Sign | null>(null)

  const calculate = () => {
    if (!month || !day) return
    setResult(getSign(+month, +day))
  }

  const labels = {
    title: isKo ? '별자리 심화 분석' : 'Zodiac Deep Analysis',
    subtitle: isKo ? '생일을 입력하면 별자리의 깊은 성격 분석을 제공합니다' : 'Enter your birthday for a deep zodiac personality analysis',
    monthLabel: isKo ? '월' : 'Month',
    dayLabel: isKo ? '일' : 'Day',
    calculate: isKo ? '분석하기' : 'Analyze',
    strengths: isKo ? '강점' : 'Strengths',
    weaknesses: isKo ? '약점' : 'Weaknesses',
    compatible: isKo ? '궁합 좋은 별자리' : 'Compatible Signs',
    career: isKo ? '어울리는 직업' : 'Suitable Careers',
    element: isKo ? '원소' : 'Element',
    ruling: isKo ? '지배 행성' : 'Ruling Planet',
    dateRange: isKo ? '날짜' : 'Date Range',
    reset: isKo ? '다시하기' : 'Reset',
  }

  if (result) {
    const sign = SIGNS[result]
    const profile = PROFILES[result][isKo ? 'ko' : 'en']
    return (
      <div className="space-y-5 py-4">
        <div className="text-center">
          <div className="text-5xl mb-2">{sign.emoji}</div>
          <h2 className="text-2xl font-black">{isKo ? sign.ko : sign.en}</h2>
          <p className="text-sm text-muted-foreground">{sign.dateRange}</p>
          <div className="flex gap-3 justify-center mt-2 text-xs">
            <span className="px-2 py-1 bg-secondary rounded-full">{sign.element}</span>
            <span className="px-2 py-1 bg-secondary rounded-full">{sign.ruling}</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground text-center leading-relaxed">{profile.desc}</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">{labels.strengths}</h3>
            <div className="flex flex-wrap gap-1.5">{profile.strengths.map(s=><span key={s} className="px-2 py-1 bg-green-50 text-green-700 rounded-full text-xs border border-green-200">{s}</span>)}</div>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">{labels.weaknesses}</h3>
            <div className="flex flex-wrap gap-1.5">{profile.weaknesses.map(s=><span key={s} className="px-2 py-1 bg-orange-50 text-orange-700 rounded-full text-xs border border-orange-200">{s}</span>)}</div>
          </div>
        </div>
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">{labels.compatible}</h3>
          <div className="flex gap-3 flex-wrap">
            {profile.compatibility.map(s=><span key={s} className="text-2xl" title={isKo?SIGNS[s].ko:SIGNS[s].en}>{SIGNS[s].emoji} {isKo?SIGNS[s].ko:SIGNS[s].en}</span>)}
          </div>
        </div>
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">{labels.career}</h3>
          <p className="text-sm text-muted-foreground">{profile.career}</p>
        </div>
        <button onClick={()=>setResult(null)} className="w-full py-3 border rounded-xl text-sm font-medium hover:bg-accent transition-colors">{labels.reset}</button>
      </div>
    )
  }

  return (
    <div className="space-y-6 py-4">
      <div className="text-center space-y-2">
        <div className="text-4xl">✨</div>
        <h1 className="text-xl font-bold">{labels.title}</h1>
        <p className="text-sm text-muted-foreground">{labels.subtitle}</p>
      </div>
      <div className="flex gap-3">
        <div className="flex-1 space-y-1">
          <label className="text-xs font-medium text-muted-foreground">{labels.monthLabel}</label>
          <select value={month} onChange={e=>setMonth(e.target.value)} className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="">--</option>
            {MONTHS.map(m=><option key={m} value={m}>{m}{isKo?'월':''}</option>)}
          </select>
        </div>
        <div className="flex-1 space-y-1">
          <label className="text-xs font-medium text-muted-foreground">{labels.dayLabel}</label>
          <select value={day} onChange={e=>setDay(e.target.value)} className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="">--</option>
            {DAYS.map(d=><option key={d} value={d}>{d}{isKo?'일':''}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {(Object.keys(SIGNS) as Sign[]).map(s=>(
          <button key={s} onClick={()=>setResult(s)} className="flex flex-col items-center gap-0.5 p-2 rounded-xl border hover:bg-accent text-xs transition-all">
            <span className="text-xl">{SIGNS[s].emoji}</span>
            <span className="text-muted-foreground">{isKo?SIGNS[s].ko:SIGNS[s].en}</span>
          </button>
        ))}
      </div>
      <button onClick={calculate} disabled={!month||!day} className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors">{labels.calculate}</button>
    </div>
  )
}
