import { useState } from 'react'

type Locale = 'ko' | 'en' | 'ja' | 'fr' | 'es' | 'zh'
type Element = 'wood' | 'fire' | 'earth' | 'metal' | 'water'
type MbtiType = 'INTJ'|'INTP'|'ENTJ'|'ENTP'|'INFJ'|'INFP'|'ENFJ'|'ENFP'|'ISTJ'|'ISFJ'|'ESTJ'|'ESFJ'|'ISTP'|'ISFP'|'ESTP'|'ESFP'

const MBTI_ELEMENT: Record<MbtiType, Element> = {
  INTJ: 'metal', INTP: 'water', ENTJ: 'fire', ENTP: 'wood',
  INFJ: 'water', INFP: 'wood', ENFJ: 'fire', ENFP: 'fire',
  ISTJ: 'earth', ISFJ: 'earth', ESTJ: 'metal', ESFJ: 'earth',
  ISTP: 'metal', ISFP: 'wood', ESTP: 'fire', ESFP: 'fire',
}

const ELEMENTS: Record<Element, {
  ko: { name: string; symbol: string; color: string; traits: string[]; desc: string; season: string; direction: string }
  en: { name: string; symbol: string; color: string; traits: string[]; desc: string; season: string; direction: string }
  emoji: string; bg: string; border: string; text: string
}> = {
  wood: { emoji:'🌳', bg:'bg-green-50', border:'border-green-300', text:'text-green-800',
    ko:{name:'목(木)',symbol:'甲乙',color:'청색',traits:['성장','창의','유연','인내','이상주의'],desc:'봄의 에너지를 가진 목 기운은 끊임없이 성장하고 새로운 것을 창조합니다. 이상을 추구하며 유연하게 변화에 적응합니다.',season:'봄',direction:'동쪽'},
    en:{name:'Wood (木)',symbol:'甲乙',color:'Green',traits:['Growth','Creativity','Flexibility','Idealism','Patience'],desc:'Wood energy, like spring, constantly grows and creates new things. It pursues ideals and adapts flexibly to change.',season:'Spring',direction:'East'} },
  fire: { emoji:'🔥', bg:'bg-red-50', border:'border-red-300', text:'text-red-800',
    ko:{name:'화(火)',symbol:'丙丁',color:'적색',traits:['열정','리더십','카리스마','직관','표현력'],desc:'여름의 불꽃 같은 화 기운은 뜨겁고 열정적입니다. 타고난 리더십과 강한 표현력으로 주변을 밝힙니다.',season:'여름',direction:'남쪽'},
    en:{name:'Fire (火)',symbol:'丙丁',color:'Red',traits:['Passion','Leadership','Charisma','Intuition','Expression'],desc:'Fire energy, like summer flames, is hot and passionate. Natural leadership and strong expression illuminate surroundings.',season:'Summer',direction:'South'} },
  earth: { emoji:'🌍', bg:'bg-amber-50', border:'border-amber-300', text:'text-amber-800',
    ko:{name:'토(土)',symbol:'戊己',color:'황색',traits:['안정','신뢰','포용','실용','균형'],desc:'중앙의 땅 기운인 토는 모든 것을 포용하고 안정시킵니다. 신뢰감과 실용적인 지혜로 중심을 잡습니다.',season:'간절기',direction:'중앙'},
    en:{name:'Earth (土)',symbol:'戊己',color:'Yellow',traits:['Stability','Trust','Inclusivity','Practicality','Balance'],desc:'Earth energy, the center of all elements, embraces and stabilizes everything. Holds the center with trustworthiness and practical wisdom.',season:'Transition',direction:'Center'} },
  metal: { emoji:'⚡', bg:'bg-slate-50', border:'border-slate-300', text:'text-slate-800',
    ko:{name:'금(金)',symbol:'庚辛',color:'백색',traits:['분석력','원칙','결단력','완벽주의','독립심'],desc:'가을의 금속 기운은 날카롭고 예리합니다. 원칙과 기준을 중시하며 분석적이고 독립적으로 사고합니다.',season:'가을',direction:'서쪽'},
    en:{name:'Metal (金)',symbol:'庚辛',color:'White',traits:['Analysis','Principles','Decisiveness','Perfectionism','Independence'],desc:'Metal energy, like autumn, is sharp and precise. Values principles and standards, thinks analytically and independently.',season:'Autumn',direction:'West'} },
  water: { emoji:'💧', bg:'bg-blue-50', border:'border-blue-300', text:'text-blue-800',
    ko:{name:'수(水)',symbol:'壬癸',color:'흑색',traits:['직관','지혜','내성적','깊이','유연성'],desc:'겨울의 물 기운은 깊고 조용합니다. 심층적인 사고와 강한 직관력으로 본질을 통찰하며 흐르듯 적응합니다.',season:'겨울',direction:'북쪽'},
    en:{name:'Water (水)',symbol:'壬癸',color:'Black',traits:['Intuition','Wisdom','Introspective','Depth','Flexibility'],desc:'Water energy, like winter, is deep and quiet. Insightful with deep thinking and strong intuition, adapts like flowing water.',season:'Winter',direction:'North'} },
}

const MBTI_TYPES: MbtiType[] = ['INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP','ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP']

interface Props { locale: Locale }

export default function MbtiSajuCross({ locale }: Props) {
  const isKo = locale === 'ko'
  const [selected, setSelected] = useState<MbtiType | null>(null)

  const el = selected ? ELEMENTS[MBTI_ELEMENT[selected]] : null
  const elData = el ? (isKo ? el.ko : el.en) : null

  const compatibility: Record<Element, Element[]> = { wood:['fire','water'], fire:['earth','wood'], earth:['metal','fire'], metal:['water','earth'], water:['wood','metal'] }
  const incompatible: Element[] = selected ? (MBTI_ELEMENT[selected] === 'wood' ? ['metal'] : MBTI_ELEMENT[selected] === 'fire' ? ['water'] : MBTI_ELEMENT[selected] === 'earth' ? ['wood'] : MBTI_ELEMENT[selected] === 'metal' ? ['fire'] : ['earth']) : []

  const labels = { title: isKo?'MBTI × 오행 교차 분석':'MBTI × Five Elements Cross Analysis', subtitle: isKo?'나의 MBTI 유형의 오행적 에너지를 탐구해보세요':'Explore the Five Elements energy of your MBTI type', selectType: isKo?'MBTI 유형을 선택하세요':'Select your MBTI type', element: isKo?'오행 에너지':'Element Energy', traits: isKo?'핵심 특성':'Core Traits', desc: isKo?'에너지 설명':'Energy Description', season: isKo?'계절':'Season', direction: isKo?'방위':'Direction', symbol: isKo?'천간':'Heavenly Stem', compat: isKo?'조화로운 오행 (MBTI와 궁합 좋은 유형)':'Harmonious Elements', incomp: isKo?'충돌 오행 (조심해야 할 유형)':'Conflicting Elements', reset: isKo?'다시 선택':'Reselect' }

  const compat = selected ? (compatibility[MBTI_ELEMENT[selected]] as Element[]) : []
  const compatMbti = MBTI_TYPES.filter(m => compat.includes(MBTI_ELEMENT[m]))
  const incompMbti = MBTI_TYPES.filter(m => incompatible.includes(MBTI_ELEMENT[m]))

  if (selected && el && elData) {
    return (
      <div className="space-y-5 py-4">
        <div className="text-center">
          <div className="text-5xl mb-1">{el.emoji}</div>
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-2xl font-black">{selected}</span>
            <span className="text-xl text-muted-foreground">×</span>
            <span className={`text-xl font-bold px-3 py-0.5 rounded-xl border ${el.bg} ${el.border} ${el.text}`}>{elData.name}</span>
          </div>
          <p className="text-xs text-muted-foreground">{labels.season}: {elData.season} · {labels.direction}: {elData.direction} · {labels.symbol}: {elData.symbol}</p>
        </div>
        <div className={`rounded-2xl border p-4 ${el.bg} ${el.border}`}>
          <p className={`text-sm font-medium ${el.text}`}>{elData.desc}</p>
        </div>
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">{labels.traits}</h3>
          <div className="flex flex-wrap gap-1.5">{elData.traits.map(t=><span key={t} className={`px-3 py-1 rounded-full text-xs border font-medium ${el.bg} ${el.border} ${el.text}`}>{t}</span>)}</div>
        </div>
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">{labels.compat}</h3>
          <div className="flex flex-wrap gap-1.5">
            {compatMbti.slice(0,6).map(m=><span key={m} className="px-2 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full text-xs font-bold">{m}</span>)}
          </div>
        </div>
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">{labels.incomp}</h3>
          <div className="flex flex-wrap gap-1.5">
            {incompMbti.slice(0,4).map(m=><span key={m} className="px-2 py-1 bg-red-50 text-red-700 border border-red-200 rounded-full text-xs font-bold">{m}</span>)}
          </div>
        </div>
        <button onClick={()=>setSelected(null)} className="w-full py-3 border rounded-xl text-sm font-medium hover:bg-accent transition-colors">{labels.reset}</button>
      </div>
    )
  }

  return (
    <div className="space-y-5 py-4">
      <div className="text-center space-y-1">
        <div className="text-4xl">☯️</div>
        <h1 className="text-xl font-bold">{labels.title}</h1>
        <p className="text-sm text-muted-foreground">{labels.subtitle}</p>
      </div>
      {/* Element preview */}
      <div className="flex gap-2 justify-center text-xs">
        {(Object.keys(ELEMENTS) as Element[]).map(e=><span key={e} className={`px-2 py-1 rounded-full border ${ELEMENTS[e].bg} ${ELEMENTS[e].border} ${ELEMENTS[e].text}`}>{ELEMENTS[e].emoji} {isKo?ELEMENTS[e].ko.name:ELEMENTS[e].en.name}</span>)}
      </div>
      <p className="text-sm font-medium text-center">{labels.selectType}</p>
      <div className="grid grid-cols-4 gap-2">
        {MBTI_TYPES.map(t=>{
          const elem = MBTI_ELEMENT[t]
          const el = ELEMENTS[elem]
          return (
            <button key={t} onClick={()=>setSelected(t)}
              className={`p-2.5 rounded-xl border text-xs font-bold transition-all hover:scale-105 ${el.bg} ${el.border} ${el.text}`}>
              {t}
              <div className="text-base mt-0.5">{el.emoji}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
