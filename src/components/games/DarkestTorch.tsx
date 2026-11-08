import { useCallback, useEffect, useRef, useState } from 'react';
import { playSyntheticTone } from '../../lib/games/audio-mixer';
import {
  loadArcadePassProgress,
  reportMissionProgress,
  saveArcadePassProgress,
} from '../../lib/games/arcade-pass';
import { useArcadePortal } from '../../lib/games/arcade-portal';
import { celebrate } from '../../lib/games/celebration';
import {
  useCardTiltPro,
  MobileHapticsPro,
  useGameJuicePro,
} from '../../lib/games/engine-suite-unified';
import { createInputGenerosity } from '../../lib/games/input-generosity';
import { recordResult } from '../../lib/games/records';
import { DARKEST_TORCH_SPRITES, getSpriteUrl } from '../../lib/games/sprites';
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

function TiltTorchButton({
  children,
  onClick,
  disabled,
  className,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  const { transformCss, onPointerMove, onPointerLeave, triggerPop } = useCardTiltPro();
  return (
    <button
      type="button"
      disabled={disabled}
      style={{ '--card-tilt': transformCss } as React.CSSProperties}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onClick={() => {
        triggerPop(0.2);
        onClick();
      }}
      className={`will-change-transform transform-(--card-tilt) ${className ?? ''}`}
    >
      {children}
    </button>
  );
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
  const inputGenerosityRef = useRef(createInputGenerosity());
  const { isImmersive, containerRef, togglePortal, labels: portalLabels } =
    useArcadePortal({ locale });

  const { shakeCssVars, addTrauma, triggerHitStop } = useGameJuicePro();
  const [combatPops, setCombatPops] = useState<Array<{ id: number; enemyId?: string; text: string; color: string }>>([]);

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
      MobileHapticsPro.success();
      if (containerRef.current) {
        celebrate(containerRef.current, { preset: 'stardust' });
      }
      try {
        const dateKey = new Date().toISOString().slice(0, 10);
        const current = loadArcadePassProgress(dateKey);
        const updated = reportMissionProgress(current, 'darkest-torch', 1);
        saveArcadePassProgress(updated);
      } catch {
        // ignore storage errors
      }
      recordResult('darkest-torch', 'w');
    } else if (state.status === 'lost') {
      MobileHapticsPro.warning();
    }
  }, [containerRef, state.status]);

  const torchTier = getTorchLightTier(state.torch);

  const onSkill = (skillId: HeroSkillId) => {
    inputGenerosityRef.current.bufferPress(`skill-${skillId}`, 0.16);
    if (skillId === 'smite' || skillId === 'point-blank') {
      MobileHapticsPro.heavy();
    } else if (skillId === 'plague-grenade') {
      MobileHapticsPro.impact();
    } else {
      MobileHapticsPro.light();
    }
    playSyntheticTone(ensureAudio(), {
      freq: state.lastVoiceFormantHz || 420,
      duration: 0.14,
      type: 'sawtooth',
      gain: 0.14,
    });

    const prevEnemies = state.enemies;
    const targetId = selectedEnemyId ?? prevEnemies[0]?.id;
    const nextState = executeHeroSkill(state, skillId, selectedEnemyId);

    const prevTarget = prevEnemies.find((e) => e.id === targetId);
    const nextTarget = nextState.enemies.find((e) => e.id === targetId);
    const dmg = (prevTarget?.hp ?? 0) - (nextTarget?.hp ?? 0);

    if (dmg > 0) {
      addTrauma(Math.min(0.8, 0.35 + dmg * 0.015));
      triggerHitStop(dmg >= 25 ? 90 : 50);
      const isKill = (nextTarget?.hp ?? 0) <= 0;
      const popText = isKill
        ? `-${dmg} 처치! 💀`
        : `-${dmg}${dmg >= 25 ? ' 치명타! 💥' : ''}`;
      const newPop = {
        id: Date.now() + Math.random(),
        enemyId: targetId,
        text: popText,
        color: dmg >= 25 ? 'text-destructive font-black' : 'text-primary font-bold',
      };
      setCombatPops((prev) => [...prev, newPop]);
      setTimeout(() => {
        setCombatPops((prev) => prev.filter((p) => p.id !== newPop.id));
      }, 1200);
    } else if (skillId === 'divine-comfort') {
      addTrauma(0.12);
      const newPop = {
        id: Date.now() + Math.random(),
        text: '+14 전체 치유! ✨',
        color: 'text-success font-black',
      };
      setCombatPops((prev) => [...prev, newPop]);
      setTimeout(() => {
        setCombatPops((prev) => prev.filter((p) => p.id !== newPop.id));
      }, 1200);
    }

    setState(nextState);
  };

  const onRelightTorch = () => {
    MobileHapticsPro.medium();
    playSyntheticTone(ensureAudio(), {
      freq: 560,
      duration: 0.14,
      type: 'triangle',
      gain: 0.15,
    });
    setState((prev) => ignitePackTorch(prev));
  };

  const onSwap = (rankA: 1 | 2 | 3 | 4, rankB: 1 | 2 | 3 | 4) => {
    MobileHapticsPro.selection();
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
      style={{
        '--shake-x': shakeCssVars['--shake-x'] ?? '0px',
        '--shake-y': shakeCssVars['--shake-y'] ?? '0px',
        '--shake-rot': shakeCssVars['--shake-rot'] ?? '0deg',
      } as React.CSSProperties}
      className={`mx-auto max-w-4xl rounded-3xl border border-border bg-card p-4 text-card-foreground shadow-xl md:p-6 transform translate-x-(--shake-x) translate-y-(--shake-y) rotate-(--shake-rot) ${
        isImmersive
          ? 'fixed inset-0 z-50 max-w-none overflow-y-auto rounded-none'
          : ''
      }`}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <img
            src={DARKEST_TORCH_SPRITES.torch}
            alt="Expedition Torch"
            width={44}
            height={44}
            className="size-11 object-contain drop-shadow-md"
          />
          <div>
            <h1 className="text-xl font-black tracking-tight md:text-2xl">
              {isKo
                ? '다키스트 던전 횃불 원정 (Torchlight Stress Dungeon)'
                : 'Torchlight Stress Dungeon'}
            </h1>
            <p className="mt-1 text-xs text-muted-foreground md:text-sm">
              {isKo
                ? '4열 파티 포지셔닝(Rank 1~4), 횃불 광량(Torchlight), 스트레스 100 결의 판정(영웅적 각성 vs 붕괴)을 관리하며 강령술사 군주를 토벌하세요.'
                : 'Command a 4-Rank expedition, manage Torchlight & Stress 100 Resolve Checks (Virtue vs Affliction), and vanquish the Necromancer Lord.'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TiltTorchButton
            disabled={state.torchesInPack <= 0}
            onClick={onRelightTorch}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow hover:opacity-90 disabled:opacity-45"
          >
            <img src={DARKEST_TORCH_SPRITES.torch} alt="" width={16} height={16} className="size-4 object-contain" />
            {isKo
              ? `횃불 점화 (+30 광량 · 잔여 ${state.torchesInPack}개)`
              : `Light Torch (+30 · ${state.torchesInPack} left)`}
          </TiltTorchButton>
          <TiltTorchButton
            onClick={() => setState(createInitialDarkestTorchState(Date.now()))}
            className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted"
          >
            {isKo ? '새 원정' : 'New Expedition'}
          </TiltTorchButton>
          <TiltTorchButton
            onClick={togglePortal}
            className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted"
          >
            {isImmersive ? portalLabels.exit : portalLabels.enter}
          </TiltTorchButton>
        </div>
      </div>

      {/* Torchlight Ambient Overlay (Darkest Dungeon Visual Juice) */}
      <div
        className={`pointer-events-none mt-2 rounded-2xl border border-border/50 p-2 transition-all duration-500 ${
          state.torch > 75
            ? 'shadow-inner'
            : state.torch > 50
              ? 'ring-1 ring-primary/30'
              : state.torch > 25
                ? 'ring-2 ring-destructive/40'
                : 'ring-2 ring-destructive/80 bg-destructive/5'
        }`}
      >
        {/* Torchlight & Dungeon Status Bar */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
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
            <div className="mt-1 flex items-center gap-1.5 text-sm font-black text-primary">
              <img src={DARKEST_TORCH_SPRITES.torch} alt="" width={16} height={16} className="size-4 object-contain" />
              {state.torch}% ({torchTier.toUpperCase()})
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-background p-2.5">
            <div className="text-xs font-semibold text-muted-foreground">
              {isKo ? '전리품 금화' : 'Looted Gold'}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-sm font-black text-foreground">
              <img src={getSpriteUrl('coin', 64)} alt="" width={16} height={16} className="size-4 object-contain" />
              {state.gold} G
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
              <TiltTorchButton
                onClick={() => onSwap(1, 2)}
                className="rounded-lg border border-border bg-secondary px-2 py-1 text-xs font-bold text-secondary-foreground hover:opacity-90"
              >
                ⇄ R1↔R2
              </TiltTorchButton>
              <TiltTorchButton
                onClick={() => onSwap(2, 3)}
                className="rounded-lg border border-border bg-secondary px-2 py-1 text-xs font-bold text-secondary-foreground hover:opacity-90"
              >
                ⇄ R2↔R3
              </TiltTorchButton>
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

                <div className="mt-3 space-y-1.5 text-xs">
                  <div>
                    <div className="flex justify-between font-bold text-foreground">
                      <span>HP</span>
                      <span>
                        {hero.hp}/{hero.maxHp}
                      </span>
                    </div>
                    <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-300 w-(--hp-pct)"
                        style={{
                          '--hp-pct': `${Math.max(0, Math.min(100, (hero.hp / hero.maxHp) * 100))}%`,
                        } as React.CSSProperties}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between font-bold text-muted-foreground">
                      <span>STRESS</span>
                      <span>{hero.stress}/100</span>
                    </div>
                    <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-destructive transition-all duration-300 w-(--stress-pct)"
                        style={{
                          '--stress-pct': `${Math.max(0, Math.min(100, hero.stress))}%`,
                        } as React.CSSProperties}
                      />
                    </div>
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
              <TiltTorchButton
                onClick={() => onSkill('smite')}
                className="rounded-xl bg-primary px-3 py-2.5 text-left text-xs font-bold text-primary-foreground shadow hover:opacity-90"
              >
                ⚔️{' '}
                {isKo
                  ? '성전사 강타 (Smite — 단일 강타 + 치명타 보정)'
                  : 'Crusader Smite (Single Target Strike)'}
              </TiltTorchButton>
              <TiltTorchButton
                onClick={() => onSkill('point-blank')}
                className="rounded-xl border border-border bg-secondary px-3 py-2.5 text-left text-xs font-bold text-secondary-foreground hover:opacity-90"
              >
                🔫{' '}
                {isKo
                  ? '노상강도 영거리 사격 (135% 피해 + R1↔R2 전열 교대)'
                  : 'Point Blank Shot (135% DMG + R1↔R2 Shift)'}
              </TiltTorchButton>
              <TiltTorchButton
                onClick={() => onSkill('plague-grenade')}
                className="rounded-xl border border-border bg-secondary px-3 py-2.5 text-left text-xs font-bold text-secondary-foreground hover:opacity-90"
              >
                🧪{' '}
                {isKo
                  ? '역병의사 맹독 수류탄 (적 전체 광역 역병 타격)'
                  : 'Plague Grenade (AoE Blight All Enemies)'}
              </TiltTorchButton>
              <TiltTorchButton
                onClick={() => onSkill('divine-comfort')}
                className="rounded-xl border border-border bg-secondary px-3 py-2.5 text-left text-xs font-bold text-secondary-foreground hover:opacity-90"
              >
                ✨{' '}
                {isKo
                  ? '성녀 신성한 위로 (파티 전원 +14 HP & -6 스트레스)'
                  : 'Vestal Divine Comfort (+14 Party HP & -6 Stress)'}
              </TiltTorchButton>
              <TiltTorchButton
                onClick={() => onSkill('inspiring-torch')}
                className="rounded-xl border border-border bg-card px-3 py-2.5 text-left text-xs font-bold text-foreground hover:border-primary sm:col-span-2"
              >
                🕯️{' '}
                {isKo
                  ? '성전사 고무의 외침 (횃불 광량 +22 & 파티 전원 스트레스 -14)'
                  : 'Inspiring Cry (+22 Torchlight & -14 Party Stress)'}
              </TiltTorchButton>
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
                    onClick={() => {
                      MobileHapticsPro.light();
                      setSelectedEnemyId(enemy.id);
                    }}
                    className={`relative flex w-full items-center justify-between rounded-xl border p-3 text-left transition ${
                      isTarget
                        ? 'border-destructive bg-destructive/10 ring-2 ring-destructive/40 shadow-sm'
                        : 'border-border bg-card hover:border-primary/50'
                    }`}
                  >
                    {isTarget && (
                      <span className="absolute -top-2.5 right-3 text-xs bg-destructive text-destructive-foreground px-2 py-0.5 rounded-full font-black animate-pulse shadow-sm">
                        🎯 TARGET
                      </span>
                    )}
                    {combatPops
                      .filter((p) => p.enemyId === enemy.id)
                      .map((pop) => (
                        <span
                          key={pop.id}
                          className={`absolute -top-5 left-1/2 -translate-x-1/2 text-sm drop-shadow-md z-20 animate-fade-up ${pop.color}`}
                        >
                          {pop.text}
                        </span>
                      ))}
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
          <div className="flex items-center gap-3">
            {state.status === 'won' ? (
              <img
                src={DARKEST_TORCH_SPRITES.trophy}
                alt="Expedition Trophy"
                width={56}
                height={56}
                className="size-14 object-contain animate-bounce drop-shadow-md"
              />
            ) : (
              <img
                src={DARKEST_TORCH_SPRITES.skull}
                alt="Necromancer Skull"
                width={52}
                height={52}
                className="size-13 object-contain drop-shadow-md"
              />
            )}
            <div>
              <div className="text-sm font-black text-foreground">
                {state.status === 'won'
                  ? isKo
                    ? '강령술사 군주 토벌 완료! 폐허의 어둠 속에서 원정대가 승리했습니다!'
                    : 'Necromancer Lord Vanquished! The Expedition Triumphed!'
                  : isKo
                    ? '원정대가 심연의 공포에 쓰러졌습니다.'
                    : 'The Expedition Fell Into the Abyss.'}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Score: {state.score} · Gold: {state.gold} G · Torch: {state.torch}%
              </div>
            </div>
          </div>
          <TiltTorchButton
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
          </TiltTorchButton>
        </div>
      )}
    </div>
  );
}
