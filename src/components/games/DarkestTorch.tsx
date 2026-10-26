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
  createInitialDarkestTorchState,
  executeHeroSkill,
  getTorchLightTier,
  ignitePackTorch,
  swapHeroRanks,
  type DarkestTorchState,
  type HeroSkillId,
} from '../../lib/games/darkest-torch';
import type { Locale } from '../../lib/i18n';

interface Props {
  locale?: Locale;
}

export default function DarkestTorch({ locale = 'en' }: Props) {
  const isKo = locale === 'ko';
  const [state, setState] = useState<DarkestTorchState>(() =>
    createInitialDarkestTorchState(20261028)
  );
  const [selectedEnemyId, setSelectedEnemyId] = useState<string | undefined>(
    undefined
  );
  const [copied, setCopied] = useState(false);
  const audioRef = useRef<AudioContext | null>(null);
  const { isImmersive, containerRef, togglePortal, labels: portalLabels } =
    useArcadePortal({ locale });

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
        const updated = reportMissionProgress(current, 'darkest-torch', 1);
        saveArcadePassProgress(updated);
      } catch {
        // ignore storage errors
      }
      recordResult('darkest-torch', 'w');
    }
  }, [state.status]);

  const torchTier = getTorchLightTier(state.torch);

  const onSkill = (skillId: HeroSkillId) => {
    triggerHaptic('heavy');
    playSyntheticTone(ensureAudio(), {
      freq: state.lastVoiceFormantHz || 420,
      duration: 0.14,
      type: 'sawtooth',
      gain: 0.14,
    });
    setState((prev) => executeHeroSkill(prev, skillId, selectedEnemyId));
  };

  const onRelightTorch = () => {
    triggerHaptic('medium');
    playSyntheticTone(ensureAudio(), {
      freq: 560,
      duration: 0.14,
      type: 'triangle',
      gain: 0.15,
    });
    setState((prev) => ignitePackTorch(prev));
  };

  const onSwap = (rankA: 1 | 2 | 3 | 4, rankB: 1 | 2 | 3 | 4) => {
    triggerHaptic('light');
    setState((prev) => swapHeroRanks(prev, rankA, rankB));
  };

  const handleShare = async () => {
    const text = `🕯️ ${isKo ? '다키스트 던전 횃불 원정' : 'Torchlight Stress Dungeon'}\nRoom ${state.room}/${state.maxRooms} | Torch: ${state.torch}% | Gold: ${state.gold} | Score: ${state.score}\nhttps://game.oiyo.net/${locale === 'en' ? '' : `${locale}/`}darkest-torch`;
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
              ? '🕯️ 다키스트 던전 횃불 원정 (Torchlight Stress Dungeon)'
              : '🕯️ Torchlight Stress Dungeon'}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground md:text-sm">
            {isKo
              ? '4열 파티 포지셔닝(Rank 1~4), 횃불 광량(Torchlight), 스트레스 100 결의 판정(영웅적 각성 vs 붕괴)을 관리하며 강령술사 군주를 토벌하세요.'
              : 'Command a 4-Rank expedition, manage Torchlight & Stress 100 Resolve Checks (Virtue vs Affliction), and vanquish the Necromancer Lord.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={state.torchesInPack <= 0}
            onClick={onRelightTorch}
            className="rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow hover:opacity-90 disabled:opacity-45"
          >
            {isKo
              ? `🔥 횃불 점화 (+30 광량 · 잔여 ${state.torchesInPack}개)`
              : `🔥 Light Torch (+30 · ${state.torchesInPack} left)`}
          </button>
          <button
            type="button"
            onClick={() => setState(createInitialDarkestTorchState(Date.now()))}
            className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted"
          >
            {isKo ? '새 원정' : 'New Expedition'}
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

      {/* Torchlight & Dungeon Status Bar */}
      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-5">
        <div className="rounded-2xl border border-border bg-background p-2.5">
          <div className="text-xs font-semibold text-muted-foreground">
            {isKo ? '지하 묘지 구역' : 'Crypt Room'}
          </div>
          <div className="mt-1 text-sm font-black text-foreground">
            🚪 Room {state.room}/{state.maxRooms} · T{state.turn}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-background p-2.5">
          <div className="text-xs font-semibold text-muted-foreground">
            {isKo ? '횃불 광량 단계' : 'Torchlight Tier'}
          </div>
          <div className="mt-1 text-sm font-black text-primary">
            🕯️ {state.torch}% ({torchTier.toUpperCase()})
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-background p-2.5">
          <div className="text-xs font-semibold text-muted-foreground">
            {isKo ? '전리품 금화' : 'Looted Gold'}
          </div>
          <div className="mt-1 text-sm font-black text-foreground">
            🪙 {state.gold} G
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-background p-2.5">
          <div className="text-xs font-semibold text-muted-foreground">
            {isKo ? '각성 보정 스택' : 'Virtue Pity'}
          </div>
          <div className="mt-1 text-sm font-black text-foreground">
            🌟 {state.virtuePityCounter}/3
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-background p-2.5">
          <div className="text-xs font-semibold text-muted-foreground">
            {isKo ? '원정 점수' : 'Expedition Score'}
          </div>
          <div className="mt-1 text-sm font-black text-foreground">
            🏆 {state.score}
          </div>
        </div>
      </div>

      {/* 4-Rank Party vs Dungeon Enemies Arena */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Heroes 4-Rank Formation */}
        <div className="rounded-2xl border border-border bg-background p-4 lg:col-span-7">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-wider text-foreground">
              {isKo
                ? '🛡️ 원정대 4열 대형 (Rank 4 후열 ← Rank 1 전열)'
                : '🛡️ Hero 4-Rank Formation (Rank 1 Front → Rank 4 Back)'}
            </h2>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => onSwap(1, 2)}
                className="rounded-lg border border-border bg-secondary px-2 py-1 text-xs font-bold text-secondary-foreground hover:opacity-90"
              >
                ⇄ R1↔R2
              </button>
              <button
                type="button"
                onClick={() => onSwap(2, 3)}
                className="rounded-lg border border-border bg-secondary px-2 py-1 text-xs font-bold text-secondary-foreground hover:opacity-90"
              >
                ⇄ R2↔R3
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {state.heroes.map((hero) => (
              <div
                key={hero.id}
                className="flex flex-col justify-between rounded-xl border border-border bg-card p-3"
              >
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                    <span>RANK {hero.rank}</span>
                    <span>
                      {hero.resolve === 'virtuous'
                        ? '🌟 각성'
                        : hero.resolve === 'afflicted'
                          ? '🌑 붕괴'
                          : '⚖️ 평정'}
                    </span>
                  </div>
                  <div className="mt-1.5 text-lg">{hero.emoji}</div>
                  <div className="mt-1 text-xs font-black text-foreground">
                    {isKo ? hero.nameKo : hero.nameEn}
                  </div>
                </div>

                <div className="mt-3 space-y-1 text-xs">
                  <div className="flex justify-between font-bold text-foreground">
                    <span>HP</span>
                    <span>
                      {hero.hp}/{hero.maxHp}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-primary">
                    <span>STRESS</span>
                    <span>{hero.stress}/100</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Tactical Skill Bar */}
          <div className="mt-4">
            <div className="mb-2 text-xs font-black uppercase tracking-wider text-muted-foreground">
              {isKo
                ? '전술 스킬 발동 (스킬마다 전열 타격·넉백 교대·역병·성녀 치유·횃불 고무 수행):'
                : 'Execute Tactical Skill:'}
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => onSkill('smite')}
                className="rounded-xl bg-primary px-3 py-2.5 text-left text-xs font-bold text-primary-foreground shadow hover:opacity-90"
              >
                ⚔️{' '}
                {isKo
                  ? '성전사 강타 (Smite — 단일 강타 + 치명타 보정)'
                  : 'Crusader Smite (Single Target Strike)'}
              </button>
              <button
                type="button"
                onClick={() => onSkill('point-blank')}
                className="rounded-xl border border-border bg-secondary px-3 py-2.5 text-left text-xs font-bold text-secondary-foreground hover:opacity-90"
              >
                🔫{' '}
                {isKo
                  ? '노상강도 영거리 사격 (135% 피해 + R1↔R2 전열 교대)'
                  : 'Point Blank Shot (135% DMG + R1↔R2 Shift)'}
              </button>
              <button
                type="button"
                onClick={() => onSkill('plague-grenade')}
                className="rounded-xl border border-border bg-secondary px-3 py-2.5 text-left text-xs font-bold text-secondary-foreground hover:opacity-90"
              >
                🧪{' '}
                {isKo
                  ? '역병의사 맹독 수류탄 (적 전체 광역 역병 타격)'
                  : 'Plague Grenade (AoE Blight All Enemies)'}
              </button>
              <button
                type="button"
                onClick={() => onSkill('divine-comfort')}
                className="rounded-xl border border-border bg-secondary px-3 py-2.5 text-left text-xs font-bold text-secondary-foreground hover:opacity-90"
              >
                ✨{' '}
                {isKo
                  ? '성녀 신성한 위로 (파티 전원 +14 HP & -6 스트레스)'
                  : 'Vestal Divine Comfort (+14 Party HP & -6 Stress)'}
              </button>
              <button
                type="button"
                onClick={() => onSkill('inspiring-torch')}
                className="rounded-xl border border-border bg-card px-3 py-2.5 text-left text-xs font-bold text-foreground hover:border-primary sm:col-span-2"
              >
                🕯️{' '}
                {isKo
                  ? '성전사 고무의 외침 (횃불 광량 +22 & 파티 전원 스트레스 -14)'
                  : 'Inspiring Cry (+22 Torchlight & -14 Party Stress)'}
              </button>
            </div>
          </div>
        </div>

        {/* Enemies & Combat Chronicle */}
        <div className="flex flex-col justify-between gap-4 rounded-2xl border border-border bg-background p-4 lg:col-span-5">
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-foreground">
              {isKo
                ? '💀 심연의 적군 진영 (클릭하여 타겟 지정)'
                : '💀 Abyssal Enemy Ranks (Click to Target)'}
            </h2>
            <div className="mt-3 space-y-2.5">
              {state.enemies.map((enemy) => {
                const isTarget =
                  (selectedEnemyId ?? state.enemies[0]?.id) === enemy.id;
                return (
                  <button
                    key={enemy.id}
                    type="button"
                    onClick={() => setSelectedEnemyId(enemy.id)}
                    className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition ${
                      isTarget
                        ? 'border-primary bg-primary/15'
                        : 'border-border bg-card hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{enemy.emoji}</span>
                      <div>
                        <div className="text-xs font-black text-foreground">
                          [Rank {enemy.rank}]{' '}
                          {isKo ? enemy.nameKo : enemy.nameEn}
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          ATK {enemy.atk} · Stress +{enemy.stressAtk}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="rounded-lg bg-secondary px-2.5 py-1 text-xs font-black text-secondary-foreground">
                        HP {enemy.hp}/{enemy.maxHp}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Combat Log */}
          <div className="rounded-xl border border-border bg-card p-3">
            <div className="text-xs font-black uppercase tracking-wider text-muted-foreground">
              {isKo ? '📜 원정 연대기 로그' : '📜 Expedition Chronicle'}
            </div>
            <ul className="mt-2 space-y-1 text-xs text-foreground">
              {state.combatLog.map((line, idx) => (
                <li key={`${idx}-${line}`} className="truncate">
                  • {line}
                </li>
              ))}
            </ul>
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
                  ? '🏆 강령술사 군주 토벌 완료! 폐허의 어둠 속에서 원정대가 승리했습니다!'
                  : '🏆 Necromancer Lord Vanquished! The Expedition Triumphed!'
                : isKo
                  ? '💀 원정대가 심연의 공포에 쓰러졌습니다.'
                  : '💀 The Expedition Fell Into the Abyss.'}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Score: {state.score} · Gold: {state.gold} G · Torch: {state.torch}%
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
                ? '원정 기록 공유'
                : 'Share Result'}
          </button>
        </div>
      )}
    </div>
  );
}
