import { useState } from 'react';
import { useCardTiltPro, MobileHapticsPro } from '../../lib/games/engine-suite-unified';
import {
  loadArcadePassProgress,
  reportMissionProgress,
  saveArcadePassProgress,
} from '../../lib/games/arcade-pass';
import {
  createSlotRogueState,
  draftSymbol,
  injectSynergyComboPreset,
  rerollDraftChoices,
  spinSlotGrid,
  SYMBOL_CATALOG,
  type SlotRogueState,
  type SymbolKey,
} from '../../lib/games/slot-rogue';

interface Props {
  locale: string;
}

const SYMBOL_ICONS: Record<SymbolKey, string> = {
  coin: '🪙',
  cat: '🐱',
  milk: '🥛',
  miner: '⛏️',
  ore: '🪨',
  gem: '💎',
  flower: '🌻',
  sun: '☀️',
  thief: '🦹',
  safe: '🔐',
  king: '🤴',
  crown: '👑',
};

function TiltDraftChoiceButton({
  symKey,
  isKo,
  onSelect,
}: {
  symKey: SymbolKey;
  isKo: boolean;
  onSelect: () => void;
}) {
  const spec = SYMBOL_CATALOG[symKey];
  const { transformCss, onPointerMove, onPointerLeave, triggerPop } = useCardTiltPro();

  return (
    <button
      type="button"
      style={{ '--card-tilt': transformCss } as React.CSSProperties}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onClick={() => {
        triggerPop(0.15);
        MobileHapticsPro.light();
        onSelect();
      }}
      className="flex w-full items-center gap-3 rounded-xl border border-border bg-background p-3 text-left transition hover:border-primary hover:bg-accent will-change-transform transform-(--card-tilt)"
    >
      <span className="shrink-0 text-3xl" aria-hidden="true">
        {SYMBOL_ICONS[symKey]}
      </span>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-foreground">
            {isKo ? spec.nameKo : spec.nameEn}
          </span>
          <span className="rounded bg-secondary px-2 py-0.5 text-xs font-semibold text-primary">
            {isKo ? `기본 +$${spec.baseCoins}` : `Base +$${spec.baseCoins}`}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {isKo ? spec.descKo : spec.descEn}
        </p>
      </div>
    </button>
  );
}

export default function SlotRogue({ locale }: Props) {
  const isKo = locale === 'ko';
  const [state, setState] = useState<SlotRogueState>(() => createSlotRogueState());

  const recordArcadePass = (rentCyclesCleared: number) => {
    try {
      const dateKey = new Date().toISOString().slice(0, 10);
      const current = loadArcadePassProgress(dateKey);
      const updated = reportMissionProgress(current, 'slot-rogue', rentCyclesCleared);
      saveArcadePassProgress(updated);
    } catch {
      // Safe fallback in SSR/test
    }
  };

  const handleSpin = () => {
    MobileHapticsPro.impact();
    const next = spinSlotGrid(state);
    setState(next);
    if (next.rentCycle > state.rentCycle) {
      recordArcadePass(next.rentCycle);
    }
  };

  const handleDraft = (symbol: SymbolKey | 'skip') => {
    setState(draftSymbol(state, symbol));
  };

  const handleReroll = () => {
    setState(rerollDraftChoices(state));
  };

  const handleInjectCombo = () => {
    setState(injectSynergyComboPreset(state));
  };

  const handleReset = () => {
    setState(createSlotRogueState());
  };

  const currentRentTarget =
    state.rentTargets[state.rentCycle] ??
    state.rentTargets[state.rentTargets.length - 1];

  return (
    <div className="mx-auto max-w-5xl p-4 text-foreground">
      {/* Top Rent & Coin HUD */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-xl border border-border bg-secondary px-3.5 py-2 text-secondary-foreground">
            <div className="text-xs text-muted-foreground">
              {isKo ? '보유 코인 (이번 스핀 수익)' : 'Coins (Last Spin)'}
            </div>
            <div className="text-xl font-bold text-primary">
              ${state.coins}{' '}
              <span className="text-sm font-semibold text-foreground">
                (+${state.lastSpinPayout})
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-secondary px-3.5 py-2 text-secondary-foreground">
            <div className="text-xs text-muted-foreground">
              {isKo
                ? `임대료 납부 #${state.rentCycle + 1} / ${state.rentTargets.length}`
                : `Rent Cycle #${state.rentCycle + 1} / ${state.rentTargets.length}`}
            </div>
            <div className="text-xl font-bold text-destructive">
              ${currentRentTarget}{' '}
              <span className="text-xs font-normal text-muted-foreground">
                ({isKo ? `남은 스핀 ${state.spinsLeftInCycle}회` : `${state.spinsLeftInCycle} spins left`})
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-background px-3.5 py-2">
            <div className="text-xs text-muted-foreground">
              {isKo ? '덱 심볼 / 리롤 토큰' : 'Deck Symbols / Rerolls'}
            </div>
            <div className="text-lg font-bold text-foreground">
              {state.inventory.length} {isKo ? '개' : 'syms'} · 🎲 {state.rerollTokens}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleInjectCombo}
            className="rounded-xl border border-border bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground hover:bg-accent"
          >
            {isKo ? '⚡ 시너지 콤보 세트 장착' : '⚡ Load Synergy Combo Deck'}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground hover:bg-accent"
          >
            {isKo ? '새 게임' : 'New Run'}
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        {/* 5x4 Slot Machine Grid */}
        <div className="lg:col-span-7 rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-primary">
              {isKo ? '5×4 시너지 릴 보드' : '5×4 Synergy Reel Matrix'}
            </h2>
            <span className="text-xs text-muted-foreground">
              {isKo ? `누적 스핀: ${state.totalSpins}회` : `Total Spins: ${state.totalSpins}`}
            </span>
          </div>

          <div className="grid grid-cols-5 gap-2.5 rounded-xl border border-border bg-background p-3">
            {state.grid.flatMap((row) =>
              row.map((cell) => {
                const spec = cell.symbol ? SYMBOL_CATALOG[cell.symbol] : null;
                return (
                  <div
                    key={`${cell.row}-${cell.col}`}
                    className={`relative flex min-h-24 flex-col items-center justify-center rounded-xl border p-2.5 transition-all ${
                      cell.synergyTriggered
                        ? 'border-primary bg-primary/10 shadow-sm'
                        : cell.consumedThisSpin
                          ? 'border-destructive bg-destructive/10'
                          : 'border-border bg-card'
                    }`}
                  >
                    <span className="text-3xl leading-none" aria-hidden="true">
                      {cell.symbol ? SYMBOL_ICONS[cell.symbol] : '·'}
                    </span>
                    <div className="mt-1.5 max-w-full truncate text-center text-xs font-semibold text-foreground">
                      {spec ? (isKo ? spec.nameKo : spec.nameEn) : isKo ? '빈 칸' : 'Empty'}
                    </div>
                    {cell.lastPayout > 0 && (
                      <span
                        className={`mt-1 rounded-full px-2 py-0.5 text-xs font-bold ${
                          cell.synergyTriggered
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-secondary-foreground'
                        }`}
                      >
                        +${cell.lastPayout}
                      </span>
                    )}
                    {cell.consumedThisSpin && (
                      <span className="absolute right-1 top-1 rounded bg-destructive px-1 text-xs font-bold text-destructive-foreground">
                        {isKo ? '소비됨' : 'USED'}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Primary Spin Lever CTA */}
          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleSpin}
              disabled={state.status === 'victory' || state.status === 'evicted'}
              className="flex-1 rounded-xl bg-primary py-3.5 text-base font-extrabold text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-40"
            >
              {isKo ? '🎰 레버 당기기 (SPIN REELS)' : '🎰 PULL SLOT LEVER (SPIN)'}
            </button>
          </div>

          {/* Synergy Feed */}
          {state.synergyEvents.length > 0 && (
            <div className="mt-3 rounded-xl border border-border bg-secondary p-3 text-secondary-foreground">
              <div className="mb-1 text-xs font-bold text-primary">
                {isKo ? '발동한 인접 시너지 로그' : 'Triggered Adjacency Synergies'}
              </div>
              <ul className="space-y-1 text-xs">
                {state.synergyEvents.map((ev, idx) => {
                  const src = SYMBOL_CATALOG[ev.sourceSymbol];
                  const tgt = SYMBOL_CATALOG[ev.targetSymbol];
                  return (
                    <li key={idx}>
                      ✨ {SYMBOL_ICONS[ev.sourceSymbol]} {isKo ? src.nameKo : src.nameEn} ×{' '}
                      {SYMBOL_ICONS[ev.targetSymbol]} {isKo ? tgt.nameKo : tgt.nameEn} →{' '}
                      <strong className="text-primary">+${ev.bonusCoins}</strong>
                      {ev.destroyedTarget
                        ? isKo
                          ? ' (대상 심볼 소비·제거)'
                          : ' (Target consumed)'
                        : ''}
                      {ev.SpawnedSymbol
                        ? isKo
                          ? ' + 💎 사파이어 보석 생성!'
                          : ' + 💎 Sapphire Gem spawned!'
                        : ''}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* Right Column: Post-Spin Symbol Draft & Deck Inspector */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Status Banner for Victory / Evicted */}
          {state.status === 'victory' && (
            <div className="rounded-2xl border border-primary bg-primary/10 p-4 text-center">
              <h3 className="text-lg font-extrabold text-primary">
                {isKo ? '🏆 4차 임대료 완납! 악덕 집주인 격파!' : '🏆 All 4 Rent Cycles Paid! Landlord Defeated!'}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {isKo
                  ? `최종 보유 코인 $${state.coins}로 모든 집세를 정복했습니다.`
                  : `Cleared all rent milestones with $${state.coins} in the bank.`}
              </p>
            </div>
          )}

          {state.status === 'evicted' && (
            <div className="rounded-2xl border border-destructive bg-destructive/10 p-4 text-center">
              <h3 className="text-lg font-extrabold text-destructive">
                {isKo ? '💸 임대료 부족으로 퇴거당했습니다' : '💸 Evicted! Short on Rent'}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {isKo
                  ? '시너지 콤보 세트를 장착하거나 파괴형 심볼(고양이+우유, 괴도+금고)을 조합해 보세요.'
                  : 'Try combining destructive multipliers like Cat+Milk or Thief+Safe.'}
              </p>
            </div>
          )}

          {/* 3-Choice Draft Panel */}
          <div className="rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">
                {isKo ? '🃏 스핀 후 심볼 드래프트 (3택 1)' : '🃏 Post-Spin Symbol Draft (Pick 1)'}
              </h3>
              <button
                type="button"
                onClick={handleReroll}
                disabled={state.rerollTokens <= 0}
                className="rounded-lg border border-border bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground hover:bg-accent disabled:opacity-40"
              >
                🎲 {isKo ? `리롤 (${state.rerollTokens})` : `Reroll (${state.rerollTokens})`}
              </button>
            </div>

            <div className="space-y-2.5">
              {state.draftChoices.map((symKey) => (
                <TiltDraftChoiceButton
                  key={symKey}
                  symKey={symKey}
                  isKo={isKo}
                  onSelect={() => handleDraft(symKey)}
                />
              ))}

              <button
                type="button"
                onClick={() => handleDraft('skip')}
                className="w-full rounded-xl border border-border bg-secondary py-2 text-xs font-semibold text-secondary-foreground hover:bg-accent"
              >
                {isKo ? '⏭️ 심볼 추가 건너뛰기 (덱 압축 유지)' : '⏭️ Skip Draft (Keep Deck Lean)'}
              </button>
            </div>
          </div>

          {/* Current Inventory Bag */}
          <div className="rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {isKo
                ? `보유 덱 심볼 목록 (${state.inventory.length}개)`
                : `Current Deck Inventory (${state.inventory.length})`}
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {state.inventory.map((sym, i) => {
                const spec = SYMBOL_CATALOG[sym];
                return (
                  <span
                    key={`${sym}-${i}`}
                    className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground"
                  >
                    {SYMBOL_ICONS[sym]} {isKo ? spec.nameKo : spec.nameEn} (+${spec.baseCoins})
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
