import { useEffect, useState } from "react";
import { GameContainer } from "../ui/game/GamePrimitives";
import type { Locale } from "../../lib/i18n";

type Method = "16" | "18" | "20";
type Status = "fasting" | "eating";

interface Labels {
  title: string;
  subtitle: string;
  methodLabel: string;
  startTimeLabel: string;
  statusTitle: Record<Status, string>;
  timeRemaining: (hours: number, minutes: number) => string;
  eatingEndsIn: (hours: number, minutes: number) => string;
  completeAt: (time: string) => string;
  started: string;
  progress: string;
  cycleComplete: string;
  elapsed: string;
  remaining: string;
  fastingWindow: string;
  eatingWindow: string;
  disclaimer: string;
  methods: Record<Method, string>;
}

const LABELS: Record<Locale, Labels> = {
  en: {
    title: "Intermittent Fasting Tracker",
    subtitle: "Track your fasting window with 16:8, 18:6, and 20:4 presets.",
    methodLabel: "Fasting method",
    startTimeLabel: "Last meal time",
    statusTitle: { fasting: "You are fasting", eating: "Eating window" },
    timeRemaining: (h, m) => `${h}h ${m}m remaining`,
    eatingEndsIn: (h, m) => `Eating window closes in ${h}h ${m}m`,
    completeAt: (time) => `Goal reached at: ${time}`,
    started: "Started",
    progress: "Progress",
    cycleComplete: "Cycle complete",
    elapsed: "Elapsed",
    remaining: "Remaining",
    fastingWindow: "Fasting window",
    eatingWindow: "Eating window",
    disclaimer: "This timer is for general wellness tracking only and is not medical advice. Adjust fasting plans for your health needs with a qualified professional.",
    methods: { 16: "16:8 - 16h fast, 8h eat", 18: "18:6 - 18h fast, 6h eat", 20: "20:4 - 20h fast, 4h eat" },
  },
  ko: {
    title: "간헐적 단식 트래커",
    subtitle: "16:8, 18:6, 20:4 단식 창을 현재 시간 기준으로 확인합니다.",
    methodLabel: "단식 방식",
    startTimeLabel: "마지막 식사 시간",
    statusTitle: { fasting: "단식 중", eating: "식사 가능 시간" },
    timeRemaining: (h, m) => `${h}시간 ${m}분 남음`,
    eatingEndsIn: (h, m) => `식사 가능 시간이 ${h}시간 ${m}분 뒤 종료됩니다`,
    completeAt: (time) => `목표 도달: ${time}`,
    started: "시작",
    progress: "진행률",
    cycleComplete: "사이클 완료",
    elapsed: "경과",
    remaining: "남은 시간",
    fastingWindow: "단식 시간",
    eatingWindow: "식사 시간",
    disclaimer: "이 타이머는 일반적인 생활 기록용이며 의학적 조언이 아닙니다. 건강 상태에 맞는 단식 계획은 전문가와 확인하세요.",
    methods: { 16: "16:8 - 16시간 단식, 8시간 식사", 18: "18:6 - 18시간 단식, 6시간 식사", 20: "20:4 - 20시간 단식, 4시간 식사" },
  },
  ja: {
    title: "断続的断食トラッカー",
    subtitle: "16:8、18:6、20:4 の断食ウィンドウを現在時刻で確認します。",
    methodLabel: "断食方法",
    startTimeLabel: "最後の食事時刻",
    statusTitle: { fasting: "断食中", eating: "食事ウィンドウ" },
    timeRemaining: (h, m) => `残り ${h}時間 ${m}分`,
    eatingEndsIn: (h, m) => `食事時間は ${h}時間 ${m}分後に終了`,
    completeAt: (time) => `目標到達: ${time}`,
    started: "開始",
    progress: "進捗",
    cycleComplete: "サイクル完了",
    elapsed: "経過",
    remaining: "残り",
    fastingWindow: "断食時間",
    eatingWindow: "食事時間",
    disclaimer: "このタイマーは一般的な健康管理用であり、医学的助言ではありません。体調に合う計画は専門家に相談してください。",
    methods: { 16: "16:8 - 16時間断食、8時間食事", 18: "18:6 - 18時間断食、6時間食事", 20: "20:4 - 20時間断食、4時間食事" },
  },
  fr: {
    title: "Suivi de Jeune Intermittent",
    subtitle: "Suivez les fenetres 16:8, 18:6 et 20:4 avec l'heure actuelle.",
    methodLabel: "Methode",
    startTimeLabel: "Heure du dernier repas",
    statusTitle: { fasting: "Vous jeunez", eating: "Fenetre de repas" },
    timeRemaining: (h, m) => `${h} h ${m} min restantes`,
    eatingEndsIn: (h, m) => `La fenetre repas ferme dans ${h} h ${m} min`,
    completeAt: (time) => `Objectif atteint a : ${time}`,
    started: "Debut",
    progress: "Progression",
    cycleComplete: "Cycle termine",
    elapsed: "Ecoule",
    remaining: "Restant",
    fastingWindow: "Fenetre de jeune",
    eatingWindow: "Fenetre de repas",
    disclaimer: "Ce minuteur sert au suivi bien-etre general et ne constitue pas un avis medical. Adaptez votre jeune avec un professionnel qualifie.",
    methods: { 16: "16:8 - 16 h de jeune, 8 h repas", 18: "18:6 - 18 h de jeune, 6 h repas", 20: "20:4 - 20 h de jeune, 4 h repas" },
  },
  es: {
    title: "Rastreador de Ayuno Intermitente",
    subtitle: "Sigue ventanas 16:8, 18:6 y 20:4 con la hora actual.",
    methodLabel: "Metodo",
    startTimeLabel: "Hora de la ultima comida",
    statusTitle: { fasting: "Estas ayunando", eating: "Ventana de comida" },
    timeRemaining: (h, m) => `Quedan ${h} h ${m} min`,
    eatingEndsIn: (h, m) => `La ventana de comida cierra en ${h} h ${m} min`,
    completeAt: (time) => `Meta alcanzada a las: ${time}`,
    started: "Inicio",
    progress: "Progreso",
    cycleComplete: "Ciclo completo",
    elapsed: "Transcurrido",
    remaining: "Restante",
    fastingWindow: "Ventana de ayuno",
    eatingWindow: "Ventana de comida",
    disclaimer: "Este temporizador es solo para seguimiento general de bienestar y no es consejo medico. Ajusta el ayuno con un profesional cualificado.",
    methods: { 16: "16:8 - 16 h ayuno, 8 h comida", 18: "18:6 - 18 h ayuno, 6 h comida", 20: "20:4 - 20 h ayuno, 4 h comida" },
  },
  zh: {
    title: "间歇性断食追踪器",
    subtitle: "用 16:8、18:6、20:4 预设追踪当前断食窗口。",
    methodLabel: "断食方式",
    startTimeLabel: "上一餐时间",
    statusTitle: { fasting: "正在断食", eating: "进食窗口" },
    timeRemaining: (h, m) => `还剩 ${h} 小时 ${m} 分钟`,
    eatingEndsIn: (h, m) => `进食窗口将在 ${h} 小时 ${m} 分钟后结束`,
    completeAt: (time) => `目标完成时间：${time}`,
    started: "开始",
    progress: "进度",
    cycleComplete: "周期完成",
    elapsed: "已过",
    remaining: "剩余",
    fastingWindow: "断食窗口",
    eatingWindow: "进食窗口",
    disclaimer: "此计时器仅用于一般健康记录，不构成医疗建议。请根据个人健康状况向合格专业人士确认断食计划。",
    methods: { 16: "16:8 - 断食16小时，进食8小时", 18: "18:6 - 断食18小时，进食6小时", 20: "20:4 - 断食20小时，进食4小时" },
  },
};

interface TrackerState {
  status: Status;
  progress: number;
  remainingLabel: string;
  targetTime: string;
  elapsedMs: number;
  remainingMs: number;
  fastHours: number;
  eatHours: number;
}

function formatDuration(ms: number) {
  const safe = Math.max(0, ms);
  const h = Math.floor(safe / (1000 * 60 * 60));
  const m = Math.floor((safe % (1000 * 60 * 60)) / (1000 * 60));
  return `${h}h ${m}m`;
}

function calculateState(method: Method, startTime: string, t: Labels): TrackerState {
  const now = new Date();
  const [startH, startM] = startTime.split(":").map(Number);
  const start = new Date(now);
  start.setHours(startH, startM, 0, 0);

  if (start > now) {
    start.setDate(start.getDate() - 1);
  }

  const fastHours = parseInt(method, 10);
  const eatHours = 24 - fastHours;
  const endFast = new Date(start.getTime() + fastHours * 60 * 60 * 1000);
  const cycleEnd = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  if (now < endFast) {
    const totalDuration = endFast.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    const diff = endFast.getTime() - now.getTime();
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return {
      status: "fasting",
      progress: Math.min(100, (elapsed / totalDuration) * 100),
      remainingLabel: t.timeRemaining(h, m),
      targetTime: endFast.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      elapsedMs: elapsed,
      remainingMs: diff,
      fastHours,
      eatHours,
    };
  }

  const diff = cycleEnd.getTime() - now.getTime();
  const h = Math.floor(Math.max(0, diff) / (1000 * 60 * 60));
  const m = Math.floor((Math.max(0, diff) % (1000 * 60 * 60)) / (1000 * 60));
  return {
    status: "eating",
    progress: 100,
    remainingLabel: diff > 0 ? t.eatingEndsIn(h, m) : t.cycleComplete,
    targetTime: cycleEnd.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    elapsedMs: now.getTime() - endFast.getTime(),
    remainingMs: diff,
    fastHours,
    eatHours,
  };
}

export default function FastingTracker({ locale }: { locale: Locale }) {
  const t = LABELS[locale] ?? LABELS.en;
  const [method, setMethod] = useState<Method>("16");
  const [startTime, setStartTime] = useState("20:00");
  const [state, setState] = useState<TrackerState>({
    status: "fasting",
    progress: 0,
    remainingLabel: "",
    targetTime: "-",
    elapsedMs: 0,
    remainingMs: 0,
    fastHours: 16,
    eatHours: 8,
  });

  useEffect(() => {
    const update = () => setState(calculateState(method, startTime, t));
    update();
    const interval = window.setInterval(update, 60000);
    return () => window.clearInterval(interval);
  }, [method, startTime, t]);

  const inputCls = "w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100";
  const statusCls = state.status === "fasting" ? "border-indigo-200 bg-indigo-50 text-indigo-900" : "border-emerald-200 bg-emerald-50 text-emerald-900";
  const barCls = state.status === "fasting" ? "bg-indigo-600" : "bg-emerald-600";

  return (
    <GameContainer title={t.title} subtitle={t.subtitle}>
      <div className="space-y-6">
        <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">
            {t.methodLabel}
            <select className={`${inputCls} mt-1`} value={method} onChange={(e) => setMethod(e.target.value as Method)}>
              {(["16", "18", "20"] as Method[]).map((item) => (
                <option key={item} value={item}>
                  {t.methods[item]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700">
            {t.startTimeLabel}
            <input className={`${inputCls} mt-1`} type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </label>
        </div>

        <div className={`rounded-xl border-2 p-5 text-center ${statusCls}`}>
          <div className="text-sm font-semibold uppercase tracking-[0.18em] opacity-75">{state.status === "fasting" ? t.fastingWindow : t.eatingWindow}</div>
          <h3 className="mt-2 text-2xl font-black">{t.statusTitle[state.status]}</h3>
          <p className="mt-2 text-base font-semibold">{state.remainingLabel}</p>

          <div className="mt-6 space-y-2">
            <div className="flex justify-between text-xs font-semibold opacity-80">
              <span>{t.started}: {startTime}</span>
              <span>{t.completeAt(state.targetTime)}</span>
            </div>
            <div className="h-4 overflow-hidden rounded-full bg-white/80">
              <div className={`h-full rounded-full ${barCls}`} style={{ width: `${Math.round(state.progress)}%` }} />
            </div>
            <div className="text-right text-xs font-bold">{t.progress}: {Math.round(state.progress)}%</div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{t.elapsed}</div>
            <div className="mt-2 text-xl font-bold text-slate-900">{formatDuration(state.elapsedMs)}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{t.remaining}</div>
            <div className="mt-2 text-xl font-bold text-slate-900">{formatDuration(state.remainingMs)}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{t.fastingWindow}</div>
            <div className="mt-2 text-xl font-bold text-slate-900">{state.fastHours}h</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{t.eatingWindow}</div>
            <div className="mt-2 text-xl font-bold text-slate-900">{state.eatHours}h</div>
          </div>
        </div>

        <p className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">{t.disclaimer}</p>
      </div>
    </GameContainer>
  );
}
