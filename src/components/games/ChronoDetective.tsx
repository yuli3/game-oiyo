import { useState } from 'react';
import {
  loadArcadePassProgress,
  reportMissionProgress,
  saveArcadePassProgress,
} from '../../lib/games/arcade-pass';
import {
  applyAutoDeductionHint,
  CAUSE_OPTIONS,
  createChronoDetectiveState,
  CULPRIT_OPTIONS,
  FATE_LEDGER_SPECS,
  IDENTITY_OPTIONS,
  inspectSceneClue,
  MARITIME_SCENES,
  updateFateDraft,
  type ChronoDetectiveState,
} from '../../lib/games/chrono-detective';
import { useCardTiltPro, MobileHapticsPro } from '../../lib/games/engine-suite-unified';

interface Props {
  locale: string;
}

function playChronoAudio(type: 'tick' | 'clue' | 'sealed' | 'victory') {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    if (type === 'tick') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.04);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (type === 'clue') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === 'sealed') {
      [220, 330, 440].forEach((freq, idx) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(freq, now + idx * 0.04);
        g.gain.setValueAtTime(0.15, now + idx * 0.04);
        g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.3);
        o.connect(g).connect(ctx.destination);
        o.start(now + idx * 0.04);
        o.stop(now + idx * 0.04 + 0.3);
      });
    } else if (type === 'victory') {
      [440, 554.37, 659.25, 880].forEach((freq, idx) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(freq, now + idx * 0.08);
        g.gain.setValueAtTime(0.15, now + idx * 0.08);
        g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.4);
        o.connect(g).connect(ctx.destination);
        o.start(now + idx * 0.08);
        o.stop(now + idx * 0.08 + 0.4);
      });
    }
    setTimeout(() => ctx.close().catch(() => {}), 500);
  } catch {}
}

function TiltMemoryTabButton({
  isSelected,
  label,
  onClick,
}: {
  isSelected: boolean;
  label: string;
  onClick: () => void;
}) {
  const { transformCss, onPointerMove, onPointerLeave, triggerPop } = useCardTiltPro();

  return (
    <button
      type="button"
      style={
        {
          '--card-tilt': transformCss,
        } as React.CSSProperties
      }
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onClick={() => {
        triggerPop(0.15);
        MobileHapticsPro.light();
        onClick();
      }}
      className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition will-change-transform transform-(--card-tilt) ${
        isSelected
          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
          : 'border-border bg-background text-foreground hover:bg-accent'
      }`}
    >
      {label}
    </button>
  );
}

export default function ChronoDetective({ locale }: Props) {
  const isKo = locale === 'ko';
  const [state, setState] = useState<ChronoDetectiveState>(() =>
    createChronoDetectiveState()
  );

  const recordArcadePass = (casesSolved: number) => {
    try {
      const dateKey = new Date().toISOString().slice(0, 10);
      const current = loadArcadePassProgress(dateKey);
      const updated = reportMissionProgress(
        current,
        'chrono-detective',
        casesSolved
      );
      saveArcadePassProgress(updated);
    } catch {
      // Safe fallback in SSR/test
    }
  };

  const handleUpdateDraft = (
    entryId: string,
    field: 'identity' | 'cause' | 'culprit',
    value: string
  ) => {
    playChronoAudio('tick');
    MobileHapticsPro.click();
    const next = updateFateDraft(state, entryId, field, value);
    setState(next);
    if (next.status === 'case-solved') {
      playChronoAudio('victory');
      MobileHapticsPro.success();
      recordArcadePass(1);
    } else if (next.confirmedTriadsCount > state.confirmedTriadsCount) {
      playChronoAudio('sealed');
      MobileHapticsPro.success();
    }
  };

  const handleAutoSolve = () => {
    playChronoAudio('victory');
    MobileHapticsPro.success();
    const next = applyAutoDeductionHint(state);
    setState(next);
    recordArcadePass(1);
  };

  const activeScene = MARITIME_SCENES[state.activeSceneIndex];

  return (
    <div className="mx-auto max-w-5xl p-4 text-foreground">
      {/* Top Pocket Watch & Rule of Three HUD */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-xl border border-border bg-secondary px-3.5 py-2 text-secondary-foreground">
            <div className="text-xs text-muted-foreground">
              {isKo ? '⏱️ 3인의 법칙 검증 (Rule of Three)' : '⏱️ Rule of Three Validation'}
            </div>
            <div className="text-xl font-extrabold text-primary">
              📖 {state.confirmedTriadsCount} / 3{' '}
              <span className="text-xs font-semibold text-foreground">
                {state.status === 'case-solved'
                  ? isKo
                    ? '· 장부 봉인 완료!'
                    : '· Ledger Sealed!'
                  : isKo
                    ? '· 3인 모두 정답 시 확정'
                    : '· Locks when all 3 match'}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-secondary px-3.5 py-2 text-secondary-foreground">
            <div className="text-xs text-muted-foreground">
              {isKo ? '단서 조사 현황' : 'Inspected Clues'}
            </div>
            <div className="text-lg font-bold text-foreground">
              🔍 {state.inspectedClueIds.length} / 4
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAutoSolve}
            className="rounded-xl border border-border bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground hover:bg-accent"
          >
            {isKo ? '⚡ 회중시계 진실 계시 (자동 추리)' : '⚡ Reveal True Fates (Auto-Deduce)'}
          </button>
          <button
            type="button"
            onClick={() => setState(createChronoDetectiveState())}
            className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold hover:bg-accent"
          >
            {isKo ? '초기화' : 'Reset'}
          </button>
        </div>
      </div>

      {/* Case Solved Banner */}
      {state.status === 'case-solved' && (
        <div className="mb-4 rounded-2xl border border-primary bg-primary/10 p-4 text-center">
          <h3 className="text-lg font-extrabold text-primary">
            {isKo
              ? '🏆 [3인의 법칙 달성!] 상선 오브라 딘 호의 3대 비극과 진범이 장부에 영구 기록되었습니다!'
              : '🏆 [Rule of Three Complete!] All 3 Maritime Fates Have Been Permanently Sealed in the Ledger!'}
          </h3>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-12">
        {/* Left Column: Memento Mori Frozen Time Diorama & Hotspots */}
        <div className="lg:col-span-6 flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
          {/* Scene Switcher Tabs */}
          <div className="flex flex-wrap gap-1.5">
            {MARITIME_SCENES.map((scene, idx) => (
              <TiltMemoryTabButton
                key={scene.id}
                isSelected={state.activeSceneIndex === idx}
                label={`⏱️ ${isKo ? `기억 #${idx + 1}` : `Memory #${idx + 1}`}`}
                onClick={() => {
                  playChronoAudio('tick');
                  setState((prev) => ({ ...prev, activeSceneIndex: idx }));
                }}
              />
            ))}
          </div>

          {/* 1-Bit Monochrome Style Diorama Box */}
          <div className="rounded-xl border-2 border-foreground bg-background p-4">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-primary">
                {activeScene.timestamp}
              </span>
              <span className="rounded bg-secondary px-2 py-0.5 text-xs font-bold text-secondary-foreground">
                MEMENTO MORI
              </span>
            </div>

            <h3 className="mt-3 text-base font-extrabold text-foreground">
              {isKo ? activeScene.titleKo : activeScene.titleEn}
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              {isKo ? activeScene.summaryKo : activeScene.summaryEn}
            </p>

            {/* Interactive Evidence Hotspots */}
            <div className="mt-4 space-y-2">
              <div className="text-xs font-bold text-foreground">
                {isKo
                  ? '현장 정밀 조사 포인트 (클릭하여 단서 해금):'
                  : 'Interactive Evidence Hotspots (Click to Inspect):'}
              </div>
              {activeScene.clues.map((clue) => {
                const inspected = state.inspectedClueIds.includes(clue.id);
                return (
                  <button
                    key={clue.id}
                    type="button"
                    onClick={() => {
                      playChronoAudio('clue');
                      MobileHapticsPro.light();
                      setState(inspectSceneClue(state, clue.id));
                    }}
                    className={`flex w-full items-center justify-between rounded-xl border p-3 text-left text-xs font-bold transition ${
                      inspected
                        ? 'border-primary bg-primary/15 text-foreground'
                        : 'border-border bg-secondary text-secondary-foreground hover:bg-accent'
                    }`}
                  >
                    <span>{isKo ? clue.labelKo : clue.labelEn}</span>
                    <span className="text-primary">
                      {inspected
                        ? isKo
                          ? '✓ 단서 확보됨'
                          : '✓ Inspected'
                        : isKo
                          ? '조사하기 →'
                          : 'Inspect →'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pocket Watch Investigation Note */}
          <div className="rounded-xl border border-border bg-secondary p-3 text-xs leading-relaxed text-secondary-foreground">
            <strong className="text-primary">
              {isKo ? '📜 현장 검시 기록:' : '📜 Coroner Note:'}
            </strong>{' '}
            {isKo ? state.feedbackKo : state.feedbackEn}
          </div>
        </div>

        {/* Right Column: Obra Dinn / Golden Idol Fate Ledger */}
        <div className="lg:col-span-6 flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">
              📖 {isKo ? '선원 운명 추리 장부 (The Fate Ledger)' : 'The Crew Fate Ledger'}
            </h3>
            <span className="text-xs text-muted-foreground">
              {isKo ? '신원 · 사인 · 가해자 3요소 기입' : 'Fill Identity · Cause · Culprit'}
            </span>
          </div>

          <div className="space-y-3">
            {FATE_LEDGER_SPECS.map((spec) => {
              const draft = state.drafts.find((d) => d.entryId === spec.id)!;
              return (
                <div
                  key={spec.id}
                  className={`rounded-xl border p-3.5 ${
                    draft.lockedCorrect
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-background'
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-extrabold text-foreground">
                      {spec.portraitIcon}{' '}
                      {isKo ? spec.silhouetteTitleKo : spec.silhouetteTitleEn}
                    </span>
                    {draft.lockedCorrect && (
                      <span className="rounded bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                        {isKo ? '✓ 진실 봉인됨' : '✓ Fate Sealed'}
                      </span>
                    )}
                  </div>

                  <div className="grid gap-2 sm:grid-cols-3">
                    {/* 1. Identity */}
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                        {isKo ? '1. 신원 (Identity)' : '1. Identity'}
                      </label>
                      <select
                        disabled={draft.lockedCorrect}
                        value={draft.identity}
                        onChange={(e) =>
                          handleUpdateDraft(spec.id, 'identity', e.target.value)
                        }
                        className="w-full rounded-lg border border-border bg-card px-2 py-1.5 text-xs font-semibold text-foreground"
                      >
                        <option value="">
                          {isKo ? '-- 신원 선택 --' : '-- Select Identity --'}
                        </option>
                        {IDENTITY_OPTIONS.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {isKo ? opt.ko : opt.en}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 2. Cause of Fate */}
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                        {isKo ? '2. 사인 (Cause)' : '2. Cause of Fate'}
                      </label>
                      <select
                        disabled={draft.lockedCorrect}
                        value={draft.cause}
                        onChange={(e) =>
                          handleUpdateDraft(spec.id, 'cause', e.target.value)
                        }
                        className="w-full rounded-lg border border-border bg-card px-2 py-1.5 text-xs font-semibold text-foreground"
                      >
                        <option value="">
                          {isKo ? '-- 사인 선택 --' : '-- Select Cause --'}
                        </option>
                        {CAUSE_OPTIONS.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {isKo ? opt.ko : opt.en}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 3. Culprit / Source */}
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                        {isKo ? '3. 가해자/원인 (Source)' : '3. Culprit / Source'}
                      </label>
                      <select
                        disabled={draft.lockedCorrect}
                        value={draft.culprit}
                        onChange={(e) =>
                          handleUpdateDraft(spec.id, 'culprit', e.target.value)
                        }
                        className="w-full rounded-lg border border-border bg-card px-2 py-1.5 text-xs font-semibold text-foreground"
                      >
                        <option value="">
                          {isKo ? '-- 가해자 선택 --' : '-- Select Culprit --'}
                        </option>
                        {CULPRIT_OPTIONS.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {isKo ? opt.ko : opt.en}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
