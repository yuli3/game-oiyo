import { useCallback, useEffect, useRef, useState } from 'react';
import { playSyntheticTone } from '../../lib/games/audio-mixer';
import {
  loadArcadePassProgress,
  reportMissionProgress,
  saveArcadePassProgress,
} from '../../lib/games/arcade-pass';
import { useArcadePortal } from '../../lib/games/arcade-portal';
import { triggerHaptic } from '../../lib/games/juice-engine';
import { recordResult } from '../../lib/games/records';
import {
  BUILDING_COSTS,
  constructFrostBuilding,
  createInitialFrostpunkRingState,
  enactFrostLaw,
  stepFrostpunkHour,
  toggleGeneratorOverdrive,
  upgradeSteamGenerator,
  type FrostBuildingType,
  type FrostLawId,
  type FrostpunkRingState,
} from '../../lib/games/frostpunk-ring';
import type { Locale } from '../../lib/i18n';

interface Props {
  locale?: Locale;
}

const BUILDING_LABELS: Record<
  FrostBuildingType,
  { emoji: string; ko: string; en: string }
> = {
  empty: { emoji: '❄️', ko: '빈 눈밭 구획', en: 'Empty Snow Slot' },
  bunkhouse: { emoji: '🏠', ko: '보온 합숙소', en: 'Insulated Bunkhouse' },
  'coal-thumper': { emoji: '⛏️', ko: '석탄 채굴 파쇄기', en: 'Coal Thumper' },
  sawmill: { emoji: '🪚', ko: '증기 제재·제강소', en: 'Steam Sawmill & Foundry' },
  infirmary: { emoji: '🏥', ko: '의무실 진료소', en: 'Steam Infirmary' },
  beacon: { emoji: '📡', ko: '설원 정찰 관측탑', en: 'Frostland Beacon' },
};

export default function FrostpunkRing({ locale = 'en' }: Props) {
  const isKo = locale === 'ko';
  const [state, setState] = useState<FrostpunkRingState>(() =>
    createInitialFrostpunkRingState(20261027)
  );
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const { isImmersive, containerRef, togglePortal, labels: portalLabels } =
    useArcadePortal(locale);

  const ensureAudio = useCallback(() => {
    if (typeof window === 'undefined') return null;
    if (!audioRef.current) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (Ctx) audioRef.current = new Ctx();
    }
    return audioRef.current;
  }, []);

  useEffect(() => {
    if (state.status === 'won') {
      try {
        const dateKey = new Date().toISOString().slice(0, 10);
        const current = loadArcadePassProgress(dateKey);
        const updated = reportMissionProgress(current, 'frostpunk-ring', 1);
        saveArcadePassProgress(updated);
      } catch {
        // ignore storage errors
      }
      recordResult('frostpunk-ring', 'w');
    }
  }, [state.status]);

  // Draw concentric Heat Ring city canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;

    ctx.clearRect(0, 0, w, h);

    // Frozen crater background
    const bgGrad = ctx.createRadialGradient(cx, cy, 18, cx, cy, w * 0.52);
    if (state.generatorOn) {
      bgGrad.addColorStop(
        0,
        state.overdriveActive ? 'rgba(239, 68, 68, 0.55)' : 'rgba(249, 115, 22, 0.45)'
      );
      bgGrad.addColorStop(0.45, 'rgba(30, 41, 59, 0.92)');
      bgGrad.addColorStop(1, '#090d16');
    } else {
      bgGrad.addColorStop(0, '#1e293b');
      bgGrad.addColorStop(1, '#090d16');
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Draw 4 concentric rings
    const ringRadii = [52, 88, 124, 158];
    ringRadii.forEach((radius, idx) => {
      const ringNum = (idx + 1) as 1 | 2 | 3 | 4;
      const isHeated =
        state.generatorOn &&
        (ringNum <= state.generatorLevel ||
          (state.overdriveActive && ringNum <= state.generatorLevel + 1));
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = isHeated
        ? state.overdriveActive
          ? 'rgba(248, 113, 113, 0.55)'
          : 'rgba(251, 146, 60, 0.5)'
        : 'rgba(56, 189, 248, 0.25)';
      ctx.lineWidth = isHeated ? 3 : 1.5;
      ctx.stroke();
    });

    // Draw radial slots on rings
    state.slots.forEach((slot) => {
      const sectorsInRing = slot.ring === 1 ? 6 : 8;
      const angle = (slot.sector / sectorsInRing) * Math.PI * 2 - Math.PI / 2;
      const r = ringRadii[slot.ring - 1];
      const sx = cx + Math.cos(angle) * r;
      const sy = cy + Math.sin(angle) * r;

      const isSelected = state.selectedSlotId === slot.id;
      ctx.beginPath();
      ctx.arc(sx, sy, isSelected ? 14 : 11, 0, Math.PI * 2);
      if (slot.building === 'empty') {
        ctx.fillStyle = slot.frozen
          ? 'rgba(30, 58, 138, 0.55)'
          : 'rgba(71, 85, 105, 0.65)';
      } else {
        ctx.fillStyle = slot.frozen ? '#1d4ed8' : '#ea580c';
      }
      ctx.fill();
      ctx.lineWidth = isSelected ? 2.5 : 1.2;
      ctx.strokeStyle = isSelected ? '#facc15' : '#94a3b8';
      ctx.stroke();

      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(BUILDING_LABELS[slot.building].emoji, sx, sy);
    });

    // Central Steam Generator Tower
    ctx.beginPath();
    ctx.arc(cx, cy, 26, 0, Math.PI * 2);
    ctx.fillStyle = state.generatorOn
      ? state.overdriveActive
        ? '#dc2626'
        : '#f97316'
      : '#334155';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#fde047';
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`LV.${state.generatorLevel}`, cx, cy - 3);
    ctx.font = '9px monospace';
    ctx.fillText(`${state.ambientTempC}°C`, cx, cy + 9);
  }, [state]);

  const selectedSlot =
    state.slots.find((s) => s.id === state.selectedSlotId) ?? state.slots[0];

  const onBuild = (building: Exclude<FrostBuildingType, 'empty'>) => {
    if (!selectedSlot) return;
    triggerHaptic('medium');
    playSyntheticTone(ensureAudio(), {
      freq: 360,
      duration: 0.12,
      type: 'triangle',
      gain: 0.14,
    });
    setState((prev) => constructFrostBuilding(prev, selectedSlot.id, building));
  };

  const onAdvanceShift = () => {
    triggerHaptic('light');
    playSyntheticTone(ensureAudio(), {
      freq: 220,
      duration: 0.1,
      type: 'sine',
      gain: 0.12,
    });
    setState((prev) => stepFrostpunkHour(prev, 4));
  };

  const onUpgradeGen = () => {
    triggerHaptic('heavy');
    playSyntheticTone(ensureAudio(), {
      freq: 520,
      duration: 0.16,
      type: 'sawtooth',
      gain: 0.14,
    });
    setState((prev) => upgradeSteamGenerator(prev));
  };

  const onToggleOverdrive = () => {
    triggerHaptic('heavy');
    playSyntheticTone(ensureAudio(), {
      freq: 640,
      duration: 0.14,
      type: 'square',
      gain: 0.14,
    });
    setState((prev) => toggleGeneratorOverdrive(prev));
  };

  const onEnactLaw = (lawId: FrostLawId) => {
    triggerHaptic('medium');
    playSyntheticTone(ensureAudio(), {
      freq: 440,
      duration: 0.12,
      type: 'triangle',
      gain: 0.14,
    });
    setState((prev) => enactFrostLaw(prev, lawId));
  };

  const onQuickAutoSetup = () => {
    triggerHaptic('success');
    setState((prev) => {
      let s = constructFrostBuilding(prev, 'r1-s1', 'coal-thumper');
      s = constructFrostBuilding(s, 'r1-s3', 'coal-thumper');
      s = upgradeSteamGenerator(s);
      return s;
    });
  };

  const handleShare = async () => {
    const text = `❄️ ${isKo ? '프로스트펑크 열기 도시' : 'Frostpunk Heat Ring City'}\nDay ${state.day}/${state.maxDays} (${state.ambientTempC}°C) | Coal: ${state.coal} | Hope: ${state.hope}% | Score: ${state.score}\nhttps://game.oiyo.net/${locale === 'en' ? '' : `${locale}/`}frostpunk-ring`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      ref={containerRef}
      className={`mx-auto max-w-4xl rounded-3xl border border-border bg-card p-4 text-card-foreground shadow-xl md:p-6 ${
        isImmersive
          ? 'fixed inset-0 z-50 max-w-none overflow-y-auto rounded-none'
          : ''
      }`}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-black tracking-tight md:text-2xl">
            {isKo
              ? '❄️ 프로스트펑크 열기 도시 (Frostpunk Heat Ring City)'
              : '❄️ Frostpunk Heat Ring City'}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground md:text-sm">
            {isKo
              ? '중앙 증기 발전기의 동심원 열기 구역(Ring 1~4)을 설계하고 -70°C 대폭설 화이트아웃 6일을 생존하세요.'
              : 'Manage 4 concentric Steam Generator heat rings, coal supply, and laws to survive the -70°C Day 6 Whiteout.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onQuickAutoSetup}
            className="rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow hover:opacity-90"
          >
            {isKo ? '⚡ 발전기 & 탄광 급속 증설' : '⚡ Quick Coal & Gen Setup'}
          </button>
          <button
            type="button"
            onClick={onAdvanceShift}
            className="rounded-xl border border-border bg-secondary px-3 py-1.5 text-xs font-bold text-secondary-foreground hover:opacity-90"
          >
            {isKo ? '⏱️ +4시간 교대 근무 진행' : '⏱️ Advance +4 Hours'}
          </button>
          <button
            type="button"
            onClick={() => setState(createInitialFrostpunkRingState(Date.now()))}
            className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted"
          >
            {isKo ? '새 도시' : 'New City'}
          </button>
          <button
            type="button"
            onClick={togglePortal}
            className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted"
          >
            {isImmersive ? portalLabels.exit : portalLabels.enter}
          </button>
        </div>
      </div>

      {/* Resource & Weather Telemetry Bar */}
      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-6">
        <div className="rounded-2xl border border-border bg-background p-2.5">
          <div className="text-xs font-semibold text-muted-foreground">
            {isKo ? '생존 일차 / 기온' : 'Day / Temp'}
          </div>
          <div className="mt-1 text-sm font-black text-foreground">
            D{state.day}/{state.maxDays} · {state.ambientTempC}°C
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-background p-2.5">
          <div className="text-xs font-semibold text-muted-foreground">
            {isKo ? '석탄 비축량' : 'Coal Reserve'}
          </div>
          <div className="mt-1 text-sm font-black text-foreground">
            🪨 {state.coal}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-background p-2.5">
          <div className="text-xs font-semibold text-muted-foreground">
            {isKo ? '목재 / 강철' : 'Wood / Steel'}
          </div>
          <div className="mt-1 text-sm font-black text-foreground">
            🪵 {state.wood} · ⚙️ {state.steel}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-background p-2.5">
          <div className="text-xs font-semibold text-muted-foreground">
            {isKo ? '시민 / 동상 환자' : 'Citizens / Sick'}
          </div>
          <div className="mt-1 text-sm font-black text-foreground">
            👥 {state.citizens} / 🤒 {state.sickCitizens}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-background p-2.5">
          <div className="text-xs font-semibold text-muted-foreground">
            {isKo ? '희망 / 불만' : 'Hope / Discontent'}
          </div>
          <div className="mt-1 text-sm font-black text-primary">
            🔥 {state.hope}% / 💢 {state.discontent}%
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-background p-2.5">
          <div className="text-xs font-semibold text-muted-foreground">
            {isKo ? '과부하 압력' : 'Generator Stress'}
          </div>
          <div className="mt-1 text-sm font-black text-foreground">
            ⚠️ {state.generatorStress}%
          </div>
        </div>
      </div>

      {/* Main Split Grid: Radial Crater Canvas + District & Generator Controls */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="flex flex-col items-center rounded-2xl border border-border bg-background p-4 lg:col-span-6">
          <div className="mb-2 flex w-full items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {isKo
                ? '동심원 증기 열기 구역 레이더 (Ring 1~4)'
                : 'Concentric Heat Ring Radar (Ring 1~4)'}
            </span>
            <span className="text-xs font-semibold text-primary">
              {state.generatorOn
                ? state.overdriveActive
                  ? isKo
                    ? '🔥 오버드라이브 가동 중'
                    : '🔥 OVERDRIVE ACTIVE'
                  : isKo
                    ? `정상 가동 (Lv.${state.generatorLevel})`
                    : `Generator Lv.${state.generatorLevel}`
                : isKo
                  ? '❄️ 발전기 꺼짐 (석탄 고갈)'
                  : '❄️ Generator Offline'}
            </span>
          </div>
          <canvas
            ref={canvasRef}
            width={350}
            height={350}
            aria-label="Frostpunk concentric radial heat ring map"
            className="w-full max-w-sm rounded-2xl border border-border"
          />

          {/* Quick Ring Slot Selector */}
          <div className="mt-3 w-full">
            <div className="mb-1.5 text-xs font-bold text-muted-foreground">
              {isKo
                ? '구획 선택 (클릭하여 건물 건설/점검):'
                : 'Select Radial District Slot:'}
            </div>
            <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8">
              {state.slots.slice(0, 16).map((slot) => {
                const isSel = slot.id === selectedSlot?.id;
                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() =>
                      setState((prev) => ({ ...prev, selectedSlotId: slot.id }))
                    }
                    className={`flex flex-col items-center rounded-lg border px-1.5 py-1 text-xs font-bold transition ${
                      isSel
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-secondary text-secondary-foreground hover:opacity-90'
                    }`}
                  >
                    <span>{BUILDING_LABELS[slot.building].emoji}</span>
                    <span>R{slot.ring}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Selected Slot Construction + Steam Generator + Book of Laws */}
        <div className="flex flex-col justify-between gap-4 rounded-2xl border border-border bg-background p-4 lg:col-span-6">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-wider text-foreground">
                {isKo
                  ? `선택 구획 [${selectedSlot?.id.toUpperCase()}] — ${BUILDING_LABELS[selectedSlot?.building ?? 'empty'].ko}`
                  : `Slot [${selectedSlot?.id.toUpperCase()}] — ${BUILDING_LABELS[selectedSlot?.building ?? 'empty'].en}`}
              </h2>
              <span className="rounded-lg bg-secondary px-2 py-0.5 text-xs font-bold text-secondary-foreground">
                {selectedSlot?.heatedTempC}°C{' '}
                {selectedSlot?.frozen
                  ? isKo
                    ? '(결빙 위험)'
                    : '(Freezing)'
                  : isKo
                    ? '(보온 안정)'
                    : '(Heated)'}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {(
                [
                  'coal-thumper',
                  'sawmill',
                  'bunkhouse',
                  'infirmary',
                  'beacon',
                ] as const
              ).map((bType) => {
                const cost = BUILDING_COSTS[bType];
                const canBuild =
                  selectedSlot?.building === 'empty' &&
                  state.wood >= cost.wood &&
                  state.steel >= cost.steel;
                return (
                  <button
                    key={bType}
                    type="button"
                    disabled={!canBuild}
                    onClick={() => onBuild(bType)}
                    className="flex items-center justify-between rounded-xl border border-border bg-card p-2.5 text-left text-xs transition hover:border-primary disabled:opacity-45"
                  >
                    <div>
                      <div className="font-bold text-foreground">
                        {BUILDING_LABELS[bType].emoji}{' '}
                        {isKo
                          ? BUILDING_LABELS[bType].ko
                          : BUILDING_LABELS[bType].en}
                      </div>
                      <div className="mt-0.5 text-muted-foreground">
                        🪵{cost.wood} · ⚙️{cost.steel} · +{cost.insulationC}°C
                      </div>
                    </div>
                    <span className="rounded-lg bg-primary px-2 py-1 font-bold text-primary-foreground">
                      {isKo ? '건설' : 'Build'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Central Steam Generator Controls */}
          <div className="rounded-xl border border-border bg-card p-3">
            <div className="text-xs font-black uppercase tracking-wider text-foreground">
              {isKo
                ? '🔥 중앙 증기 발전기 제어실 (Central Steam Generator)'
                : '🔥 Central Steam Generator Controls'}
            </div>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={onUpgradeGen}
                disabled={state.generatorLevel >= 4}
                className="rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground shadow hover:opacity-90 disabled:opacity-45"
              >
                {isKo
                  ? `증기 코어 증폭 Lv.${state.generatorLevel} → Lv.${Math.min(4, state.generatorLevel + 1)} (🪵${state.generatorLevel * 30}/⚙️${state.generatorLevel * 20})`
                  : `Upgrade Core Lv.${state.generatorLevel} → Lv.${Math.min(4, state.generatorLevel + 1)}`}
              </button>
              <button
                type="button"
                onClick={onToggleOverdrive}
                className="rounded-xl border border-border bg-secondary px-3 py-2 text-xs font-bold text-secondary-foreground hover:opacity-90"
              >
                {state.overdriveActive
                  ? isKo
                    ? '🛑 오버드라이브 해제 (압력 냉각)'
                    : '🛑 Disengage Overdrive'
                  : isKo
                    ? '🔥 오버드라이브 가동 (전 구역 +15°C)'
                    : '🔥 Engage Overdrive (+15°C)'}
              </button>
            </div>
          </div>

          {/* Book of Laws */}
          <div className="rounded-xl border border-border bg-card p-3">
            <div className="text-xs font-black uppercase tracking-wider text-foreground">
              {isKo ? '📜 혹한기 비상 법령집 (Book of Laws)' : '📜 Book of Laws'}
            </div>
            <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-3">
              {(
                [
                  {
                    id: 'soup-rations',
                    ko: '묽은 수프 배급령',
                    en: 'Soup Rations',
                  },
                  {
                    id: 'extended-shift',
                    ko: '14시간 연장 근무',
                    en: 'Extended Shift (+35%)',
                  },
                  {
                    id: 'overdrive-couplings',
                    ko: '안전 밸브 커플링',
                    en: 'Safety Couplings',
                  },
                ] as const
              ).map((law) => {
                const enacted = state.laws[law.id].enacted;
                return (
                  <button
                    key={law.id}
                    type="button"
                    disabled={enacted}
                    onClick={() => onEnactLaw(law.id)}
                    className="rounded-lg border border-border bg-background px-2.5 py-2 text-xs font-bold text-foreground hover:border-primary disabled:opacity-50"
                  >
                    {enacted ? '✓ ' : '⚖️ '}
                    {isKo ? law.ko : law.en}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Win / Loss Banner */}
      {state.status !== 'playing' && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary bg-primary/10 p-4">
          <div>
            <div className="text-sm font-black text-foreground">
              {state.status === 'won'
                ? isKo
                  ? '🏆 -70°C 대폭설 화이트아웃 생존 성공! 뉴 런던이 살아남았습니다!'
                  : '🏆 Survived the -70°C Great Whiteout! The City Survived!'
                : isKo
                  ? '💥 증기 발전기 폭발 또는 추방으로 도시가 무너졌습니다.'
                  : '💥 The City Fell — Generator Exploded or Hope Reached Zero.'}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Score: {state.score} · Day {state.day}/{state.maxDays} · Hope{' '}
              {state.hope}%
            </div>
          </div>
          <button
            type="button"
            onClick={handleShare}
            className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow"
          >
            {copied
              ? isKo
                ? '클립보드 복사됨!'
                : 'Copied!'
              : isKo
                ? '생존 기록 공유'
                : 'Share Result'}
          </button>
        </div>
      )}
    </div>
  );
}
