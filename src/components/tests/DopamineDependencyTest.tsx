import { useState } from 'react'

type Locale = 'ko' | 'en' | 'ja' | 'fr' | 'es' | 'zh'
type Level = 'low' | 'medium' | 'high' | 'critical'

const LABELS: Record<Locale, {
  title: string; subtitle: string; restart: string; result: string
  yourLevel: string; scoreLabel: string; outOf: string
  symptoms: string; tips: string; note: string
  scaleLabels: [string, string, string, string, string]
  progress: (c: number, t: number) => string
}> = {
  ko: {
    title: '도파민 의존도 자가 진단',
    subtitle: '당신의 즉각적 보상 추구 패턴을 확인해보세요',
    restart: '다시 하기', result: '진단 결과',
    yourLevel: '나의 도파민 의존 수준',
    scoreLabel: '의존도 점수', outOf: '/ 50점',
    symptoms: '나타나는 패턴', tips: '균형 회복 전략',
    note: '이 진단은 의학적 진단을 대체하지 않습니다. 심각하다면 전문가의 도움을 받으세요.',
    scaleLabels: ['전혀 없다', '거의 없다', '가끔', '자주', '항상'],
    progress: (c, t) => `${c} / ${t}`,
  },
  en: {
    title: 'Dopamine Dependency Self-Check',
    subtitle: 'Check your instant gratification seeking patterns',
    restart: 'Retake', result: 'Your Result',
    yourLevel: 'Your Dopamine Dependency Level',
    scoreLabel: 'Dependency Score', outOf: '/ 50',
    symptoms: 'Observed Patterns', tips: 'Balance Recovery Strategies',
    note: 'This test does not replace medical diagnosis. Seek professional help if symptoms are severe.',
    scaleLabels: ['Never', 'Rarely', 'Sometimes', 'Often', 'Always'],
    progress: (c, t) => `${c} / ${t}`,
  },
  ja: {
    title: 'ドーパミン依存度自己診断',
    subtitle: 'あなたの即時報酬追求パターンを確認しましょう',
    restart: 'もう一度', result: '診断結果',
    yourLevel: 'ドーパミン依存レベル',
    scoreLabel: '依存度スコア', outOf: '/ 50点',
    symptoms: 'パターン分析', tips: 'バランス回復戦略',
    note: 'この診断は医療診断の代替ではありません。症状が深刻な場合は専門家に相談してください。',
    scaleLabels: ['全くない', 'ほとんどない', 'たまに', 'よく', 'いつも'],
    progress: (c, t) => `${c} / ${t}`,
  },
  fr: { title: 'Auto-diagnostic de Dépendance à la Dopamine', subtitle: 'Vérifiez vos schémas de recherche de gratification instantanée', restart: 'Recommencer', result: 'Résultat', yourLevel: 'Niveau de Dépendance à la Dopamine', scoreLabel: 'Score de dépendance', outOf: '/ 50', symptoms: 'Schémas observés', tips: 'Stratégies de rééquilibrage', note: 'Ce test ne remplace pas un diagnostic médical.', scaleLabels: ['Jamais', 'Rarement', 'Parfois', 'Souvent', 'Toujours'], progress: (c, t) => `${c} / ${t}` },
  es: { title: 'Autodiagnóstico de Dependencia a la Dopamina', subtitle: 'Verifica tus patrones de búsqueda de gratificación instantánea', restart: 'Repetir', result: 'Resultado', yourLevel: 'Nivel de Dependencia a la Dopamina', scoreLabel: 'Puntuación de dependencia', outOf: '/ 50', symptoms: 'Patrones observados', tips: 'Estrategias de recuperación del equilibrio', note: 'Este test no reemplaza un diagnóstico médico.', scaleLabels: ['Nunca', 'Raramente', 'A veces', 'A menudo', 'Siempre'], progress: (c, t) => `${c} / ${t}` },
  zh: { title: '多巴胺依赖自我诊断', subtitle: '检查您的即时奖励追求模式', restart: '重新测试', result: '诊断结果', yourLevel: '多巴胺依赖水平', scoreLabel: '依赖分数', outOf: '/ 50', symptoms: '观察到的模式', tips: '平衡恢复策略', note: '此测试不能替代医疗诊断。', scaleLabels: ['从不', '几乎不', '有时', '经常', '总是'], progress: (c, t) => `${c} / ${t}` },
}

const QUESTIONS: Record<Locale, string[]> = {
  ko: [
    '스마트폰을 5분마다 확인하지 않으면 불안하다',
    '소셜 미디어의 좋아요·댓글 알림이 오면 즉시 확인한다',
    '유튜브·릴스·숏폼을 시작하면 멈추기가 어렵다',
    '배가 고프지 않아도 심심하거나 스트레스를 받으면 무언가를 먹는다',
    '어떤 일을 시작하기 전에 먼저 보상(커피, 간식, 영상)이 있어야 한다',
    '지루함을 5분 이상 견디는 것이 매우 어렵다',
    '게임·도박·쇼핑을 시작하면 예상보다 훨씬 오래 한다',
    '새로운 자극이 없으면 집중하거나 의욕이 생기지 않는다',
    '중요한 일을 하다가 스마트폰을 확인하거나 다른 것을 본다',
    '"그냥 한 번만"이라고 생각하고 시작했다가 오래 한 적이 있다',
  ],
  en: [
    'I feel anxious if I don\'t check my phone every 5 minutes',
    'I immediately check social media likes/comment notifications when they arrive',
    'Once I start YouTube/Reels/short videos, it\'s hard to stop',
    'Even when not hungry, I eat something when bored or stressed',
    'I need a reward (coffee, snack, video) before starting any task',
    'It\'s very hard to tolerate boredom for more than 5 minutes',
    'Once I start games/gambling/shopping, I do it much longer than planned',
    'Without new stimulation, I can\'t focus or feel motivated',
    'I check my phone or look at other things while doing important work',
    'I\'ve started something thinking "just once" and ended up doing it for a long time',
  ],
  ja: [
    '5分ごとにスマホを確認しないと不安だ',
    'SNSのいいね・コメント通知が来たらすぐに確認する',
    'YouTube・リール・ショート動画を始めると止められない',
    '空腹でなくても暇やストレスがあると何かを食べる',
    '何かを始める前にまず報酬（コーヒー、お菓子、動画）が必要だ',
    '退屈を5分以上耐えることが非常に難しい',
    'ゲーム・ギャンブル・ショッピングを始めると予定より長くやってしまう',
    '新しい刺激がないと集中できず意欲が湧かない',
    '重要な作業中にスマホを確認したり他のものを見る',
    '「一回だけ」と思って始めたら長時間やってしまったことがある',
  ],
  fr: ['Je me sens anxieux si je ne vérifie pas mon téléphone toutes les 5 minutes', 'Je vérifie immédiatement les notifications de likes/commentaires', 'Une fois que je commence YouTube/Reels/courts métrages, il est difficile d\'arrêter', 'Même sans faim, je mange quand je m\'ennuie ou suis stressé', 'J\'ai besoin d\'une récompense avant de commencer une tâche', 'Il est très difficile de tolérer l\'ennui plus de 5 minutes', 'Une fois que je commence des jeux/achats, je le fais beaucoup plus longtemps que prévu', 'Sans nouvelle stimulation, je ne peux pas me concentrer', 'Je vérifie mon téléphone pendant un travail important', 'J\'ai commencé quelque chose en pensant "juste une fois" et j\'ai fini par le faire longtemps'],
  es: ['Me siento ansioso si no reviso el teléfono cada 5 minutos', 'Reviso inmediatamente las notificaciones de likes/comentarios', 'Una vez que empiezo YouTube/Reels/vídeos cortos, es difícil parar', 'Incluso sin hambre, como cuando estoy aburrido o estresado', 'Necesito una recompensa antes de comenzar cualquier tarea', 'Es muy difícil tolerar el aburrimiento más de 5 minutos', 'Una vez que comienzo juegos/compras, lo hago mucho más de lo planeado', 'Sin nueva estimulación, no puedo concentrarme', 'Reviso el teléfono mientras hago trabajo importante', 'He empezado algo pensando "solo una vez" y terminé haciéndolo mucho tiempo'],
  zh: ['如果不每5分钟查一次手机就感到焦虑', '社交媒体通知来了就立即查看', '一旦开始看YouTube/短视频就很难停下来', '即使不饿，无聊或有压力时也会吃东西', '开始任何任务前需要先有奖励', '很难忍受超过5分钟的无聊', '一旦开始游戏/购物就比计划做得更久', '没有新刺激就无法集中注意力', '做重要工作时查看手机或看其他东西', '以为"就一次"开始后却做了很长时间'],
}

const RESULTS: Record<Level, Record<Locale, { title: string; color: string; bg: string; symptoms: string[]; tips: string[] }>> = {
  low: {
    ko: { title: '균형 유지형 🌿', color: 'text-green-700', bg: 'bg-green-50 border-green-200', symptoms: ['자기 조절 능력 양호', '즉각적 자극에 덜 의존', '지루함을 잘 견딤'], tips: ['현재 균형을 유지하세요', '디지털 웰빙 습관을 지속하세요', '오프라인 활동을 즐기세요'] },
    en: { title: 'Balanced 🌿', color: 'text-green-700', bg: 'bg-green-50 border-green-200', symptoms: ['Good self-regulation', 'Less reliant on instant stimulation', 'Tolerates boredom well'], tips: ['Maintain current balance', 'Continue digital wellness habits', 'Enjoy offline activities'] },
    ja: { title: 'バランス型 🌿', color: 'text-green-700', bg: 'bg-green-50 border-green-200', symptoms: ['自己調節能力良好', '即時刺激への依存が少ない', '退屈をよく耐える'], tips: ['現在のバランスを維持', 'デジタルウェルネス習慣を継続', 'オフライン活動を楽しむ'] },
    fr: { title: 'Équilibré 🌿', color: 'text-green-700', bg: 'bg-green-50 border-green-200', symptoms: ['Bonne autorégulation', 'Moins dépendant de la stimulation instantanée', 'Tolère bien l\'ennui'], tips: ['Maintenir l\'équilibre actuel', 'Continuer les habitudes de bien-être numérique', 'Profiter des activités hors ligne'] },
    es: { title: 'Equilibrado 🌿', color: 'text-green-700', bg: 'bg-green-50 border-green-200', symptoms: ['Buena autorregulación', 'Menos dependiente de la estimulación instantánea', 'Tolera bien el aburrimiento'], tips: ['Mantener el equilibrio actual', 'Continuar hábitos de bienestar digital', 'Disfrutar actividades sin pantallas'] },
    zh: { title: '平衡型 🌿', color: 'text-green-700', bg: 'bg-green-50 border-green-200', symptoms: ['自我调节能力良好', '对即时刺激依赖较少', '能够忍受无聊'], tips: ['维持现有平衡', '继续数字健康习慣', '享受线下活动'] },
  },
  medium: {
    ko: { title: '주의 필요형 🟡', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', symptoms: ['스마트폰을 습관적으로 확인', '지루할 때 즉각적 자극 찾기', '집중 시간이 점점 짧아짐'], tips: ['스마트폰 알림 30%만 켜두기', '하루 1시간 "지루함 시간" 갖기', '식사 중 스마트폰 내려놓기', '보상을 미루는 연습하기'] },
    en: { title: 'Caution Needed 🟡', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', symptoms: ['Habitual phone checking', 'Seeking instant stimulation when bored', 'Attention span getting shorter'], tips: ['Keep only 30% of phone notifications', 'Have 1 hour "boredom time" daily', 'Put phone down during meals', 'Practice delaying rewards'] },
    ja: { title: '注意が必要 🟡', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', symptoms: ['習慣的なスマホ確認', '退屈時に即時刺激を求める', '集中時間が短くなっている'], tips: ['スマホ通知の30%だけをオン', '毎日1時間「退屈タイム」を設ける', '食事中はスマホを置く', '報酬を遅らせる練習をする'] },
    fr: { title: 'Attention requise 🟡', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', symptoms: ['Vérification habituelle du téléphone', 'Recherche de stimulation instantanée quand ennuyé', 'Durée d\'attention raccourcissant'], tips: ['Ne garder que 30% des notifications', 'Avoir 1h d\'ennui intentionnel par jour', 'Poser le téléphone pendant les repas', 'S\'entraîner à retarder les récompenses'] },
    es: { title: 'Precaución necesaria 🟡', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', symptoms: ['Revisión habitual del teléfono', 'Busca estimulación instantánea cuando está aburrido', 'El tiempo de atención se acorta'], tips: ['Mantener solo el 30% de las notificaciones', 'Tener 1 hora de "tiempo de aburrimiento" diario', 'Dejar el teléfono durante las comidas', 'Practicar el retraso de recompensas'] },
    zh: { title: '需注意 🟡', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', symptoms: ['习惯性查看手机', '无聊时寻求即时刺激', '注意力持续时间越来越短'], tips: ['只保留30%的手机通知', '每天有1小时"无聊时间"', '吃饭时放下手机', '练习延迟奖励'] },
  },
  high: {
    ko: { title: '의존도 높음 🔴', color: 'text-red-700', bg: 'bg-red-50 border-red-200', symptoms: ['디지털 자극 없이 집중 어려움', '즉각적 만족을 못 얻으면 불안', '깊은 사고나 독서가 어려워짐', '현실의 지루한 활동에 재미 없음'], tips: ['도파민 디톡스: 하루 2시간 스마트폰 끄기', '지루함을 의도적으로 경험하기 (산책·멍 때리기)', '긴 글 읽기·취미 활동 다시 시작하기', '운동으로 건강한 도파민 분비 유도'] },
    en: { title: 'High Dependency 🔴', color: 'text-red-700', bg: 'bg-red-50 border-red-200', symptoms: ['Difficulty concentrating without digital stimulation', 'Anxiety when instant gratification is unavailable', 'Deep thinking or reading has become difficult', 'No interest in boring real-world activities'], tips: ['Dopamine detox: turn off phone 2 hours daily', 'Intentionally experience boredom (walking, doing nothing)', 'Restart reading long texts and hobbies', 'Exercise to trigger healthy dopamine release'] },
    ja: { title: '依存度高い 🔴', color: 'text-red-700', bg: 'bg-red-50 border-red-200', symptoms: ['デジタル刺激なしに集中困難', '即時満足が得られないと不安', '深い思考や読書が難しくなった', '現実の退屈な活動に興味がない'], tips: ['ドーパミンデトックス：毎日2時間スマホを切る', '意図的に退屈を経験する（散歩・ぼーっとする）', '長い文章を読む・趣味を再開する', '運動で健康なドーパミン分泌を促す'] },
    fr: { title: 'Haute dépendance 🔴', color: 'text-red-700', bg: 'bg-red-50 border-red-200', symptoms: ['Difficulté à se concentrer sans stimulation numérique', 'Anxiété quand la gratification instantanée est indisponible', 'La pensée profonde ou la lecture est devenue difficile', 'Aucun intérêt pour les activités ennuyeuses du monde réel'], tips: ['Détox dopamine: éteindre le téléphone 2h par jour', 'Expérimenter intentionnellement l\'ennui', 'Reprendre la lecture de longs textes', 'Faire de l\'exercice pour déclencher une libération saine de dopamine'] },
    es: { title: 'Alta dependencia 🔴', color: 'text-red-700', bg: 'bg-red-50 border-red-200', symptoms: ['Dificultad para concentrarse sin estimulación digital', 'Ansiedad cuando la gratificación instantánea no está disponible', 'El pensamiento profundo o la lectura se ha vuelto difícil', 'Sin interés en actividades aburridas del mundo real'], tips: ['Desintoxicación de dopamina: apagar el teléfono 2 horas al día', 'Experimentar intencionalmente el aburrimiento', 'Retomar la lectura de textos largos', 'Ejercitarse para liberar dopamina saludable'] },
    zh: { title: '高度依赖 🔴', color: 'text-red-700', bg: 'bg-red-50 border-red-200', symptoms: ['没有数字刺激就难以集中注意力', '无法获得即时满足时感到焦虑', '深度思考或阅读变得困难', '对现实中无聊的活动失去兴趣'], tips: ['多巴胺排毒：每天关闭手机2小时', '有意识地体验无聊（散步、发呆）', '重新开始阅读长篇文章和爱好', '通过运动促进健康的多巴胺分泌'] },
  },
  critical: {
    ko: { title: '심각한 의존 ⚠️', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200', symptoms: ['즉각적 자극 없이 일상 기능 어려움', '디지털 제한 시 심한 금단 증상', '수면·식사 등 기본 생활 리듬 무너짐', '현실 관계보다 디지털 관계 우선시'], tips: ['전문가 상담(행동 중독 전문의) 권장', '1주일 완전한 디지털 디톡스 시도', '주변 사람들의 지지 적극 활용', '기저 불안·우울증 확인 필요'] },
    en: { title: 'Critical Dependency ⚠️', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200', symptoms: ['Difficulty functioning without instant stimulation', 'Severe withdrawal when digital access is limited', 'Basic life rhythms (sleep, eating) disrupted', 'Prioritizing digital relationships over real ones'], tips: ['Recommend consulting a behavioral addiction specialist', 'Attempt a full week-long digital detox', 'Actively utilize support from people around you', 'Check for underlying anxiety or depression'] },
    ja: { title: '深刻な依存 ⚠️', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200', symptoms: ['即時刺激なしに日常機能が困難', 'デジタル制限時に重篤な禁断症状', '睡眠・食事など基本生活リズムが崩れている', 'リアルな関係よりデジタル関係を優先'], tips: ['専門家相談（行動依存専門医）を推奨', '1週間完全デジタルデトックスを試みる', '周囲の人のサポートを積極的に活用', '基礎的な不安・うつ病の確認が必要'] },
    fr: { title: 'Dépendance critique ⚠️', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200', symptoms: ['Difficulté à fonctionner sans stimulation instantanée', 'Sevrage sévère quand l\'accès numérique est limité', 'Rythmes de vie de base perturbés', 'Prioriser les relations numériques sur les réelles'], tips: ['Consulter un spécialiste en addiction comportementale', 'Tenter une détox numérique complète d\'une semaine', 'Utiliser activement le soutien des proches', 'Vérifier si anxiété ou dépression sous-jacente'] },
    es: { title: 'Dependencia crítica ⚠️', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200', symptoms: ['Dificultad para funcionar sin estimulación instantánea', 'Síndrome de abstinencia severo cuando el acceso digital es limitado', 'Ritmos de vida básicos perturbados', 'Priorizar relaciones digitales sobre reales'], tips: ['Consultar a un especialista en adicciones conductuales', 'Intentar una desintoxicación digital completa de una semana', 'Utilizar activamente el apoyo de personas cercanas', 'Verificar si hay ansiedad o depresión subyacente'] },
    zh: { title: '严重依赖 ⚠️', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200', symptoms: ['没有即时刺激就难以正常运作', '限制数字使用时出现严重戒断症状', '基本生活节奏（睡眠、饮食）被打乱', '优先考虑数字关系而非现实关系'], tips: ['建议咨询行为成瘾专科医生', '尝试一周完全数字排毒', '积极利用身边人的支持', '检查潜在的焦虑或抑鬱症'] },
  },
}

function getLevel(score: number): Level {
  if (score <= 15) return 'low'
  if (score <= 27) return 'medium'
  if (score <= 38) return 'high'
  return 'critical'
}

interface Props { locale: Locale }

export default function DopamineDependencyTest({ locale }: Props) {
  const l = LABELS[locale] ?? LABELS.en
  const questions = QUESTIONS[locale] ?? QUESTIONS.en
  const [answers, setAnswers] = useState<number[]>([])
  const [current, setCurrent] = useState(0)
  const [result, setResult] = useState<Level | null>(null)

  const answer = (val: number) => {
    const next = [...answers, val]
    setAnswers(next)
    if (current + 1 < questions.length) {
      setCurrent(current + 1)
    } else {
      const total = next.reduce((s, a) => s + a, 0)
      setResult(getLevel(total))
    }
  }

  const restart = () => { setAnswers([]); setCurrent(0); setResult(null) }

  if (result) {
    const rd = RESULTS[result][locale] ?? RESULTS[result].en
    const score = answers.reduce((s, a) => s + a, 0)
    return (
      <div className="space-y-5 py-4">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-1">{l.yourLevel}</h2>
          <div className={`inline-block px-4 py-2 rounded-xl border text-lg font-bold ${rd.bg} ${rd.color}`}>{rd.title}</div>
          <p className="text-sm text-muted-foreground mt-2">{l.scoreLabel}: <strong>{score}</strong> {l.outOf}</p>
        </div>
        <div>
          <h3 className="font-semibold text-sm text-muted-foreground uppercase mb-2">{l.symptoms}</h3>
          <ul className="space-y-1">{rd.symptoms.map(s => <li key={s} className="text-sm flex gap-2"><span>•</span>{s}</li>)}</ul>
        </div>
        <div>
          <h3 className="font-semibold text-sm text-muted-foreground uppercase mb-2">{l.tips}</h3>
          <ul className="space-y-1">{rd.tips.map(t => <li key={t} className="text-sm flex gap-2"><span>✓</span>{t}</li>)}</ul>
        </div>
        <p className="text-xs text-muted-foreground border-t pt-4">{l.note}</p>
        <button onClick={restart} className="w-full py-3 border rounded-xl text-sm font-medium hover:bg-accent transition-colors">{l.restart}</button>
      </div>
    )
  }

  return (
    <div className="space-y-6 py-4">
      <div className="text-center space-y-2">
        <div className="text-4xl">🧠</div>
        <h1 className="text-xl font-bold">{l.title}</h1>
        <p className="text-sm text-muted-foreground">{l.subtitle}</p>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{l.progress(current + 1, questions.length)}</span>
        <div className="w-32 h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${((current + 1) / questions.length) * 100}%` }} />
        </div>
      </div>
      <p className="text-base font-semibold text-center py-3">{questions[current]}</p>
      <div className="grid grid-cols-5 gap-2">
        {l.scaleLabels.map((label, i) => (
          <button key={i} onClick={() => answer(i)}
            className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl border hover:bg-accent hover:border-primary transition-all text-center">
            <span className="text-base font-bold">{i}</span>
            <span className="text-[10px] text-muted-foreground leading-tight">{label}</span>
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground text-center">{l.note}</p>
    </div>
  )
}
