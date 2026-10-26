import { useState } from 'react';
import {
  loadArcadePassProgress,
  reportMissionProgress,
  saveArcadePassProgress,
} from '../../lib/games/arcade-pass';
import {
  applyWinningFormationPreset,
  clickPlayerLane,
  createCandleSacrificeState,
  drawFromDeck,
  ringCombatBell,
  SCALE_WIN_THRESHOLD,
  selectHandCard,
  type BeastCard,
  type CandleSacrificeState,
} from '../../lib/games/candle-sacrifice';

interface Props {
  locale: string;
}

function renderCostBadge(card: BeastCard, isKo: boolean) {
  if (card.bloodCost > 0) {
    return (
      <span className="rounded bg-destructive/15 px-1.5 py-0.5 text-xs font-bold text-destructive">
        🩸×{card.bloodCost}
      </span>
    );
  }
  if (card.boneCost > 0) {
    return (
      <span className="rounded bg-secondary px-1.5 py-0.5 text-xs font-bold text-secondary-foreground">
        🦴×{card.boneCost}
      </span>
    );
  }
  return (
    <span className="rounded bg-primary/15 px-1.5 py-0.5 text-xs font-bold text-primary">
      {isKo ? '무료' : 'FREE'}
    </span>
  );
}

export default function CandleSacrifice({ locale }: Props) {
  const isKo = locale === 'ko';
  const [state, setState] = useState<CandleSacrificeState>(() =>
    createCandleSacrificeState()
  );

  const recordArcadePass = (won: number) => {
    try {
      const dateKey = new Date().toISOString().slice(0, 10);
      const current = loadArcadePassProgress(dateKey);
      const updated = reportMissionProgress(current, 'candle-sacrifice', won);
      saveArcadePassProgress(updated);
    } catch {
      // Safe fallback in SSR/test
    }
  };

  const handleRingBell = () => {
    const next = ringCombatBell(state);
    setState(next);
    if (next.status === 'victory') {
      recordArcadePass(1);
    }
  };

  const selectedCard = state.hand.find((c) => c.id === state.selectedHandCardId);

  return (
    <div className="mx-auto max-w-5xl p-4 text-foreground">
      {/* Top Cabin HUD: Balance Scale, Candles, Bones, Preset */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-xl border border-border bg-secondary px-3.5 py-2 text-secondary-foreground">
            <div className="text-xs text-muted-foreground">
              {isKo ? '⚖️ 이빨 천칭 (-5 패배 ~ +5 승리)' : '⚖️ Teeth Scale (-5 to +5)'}
            </div>
            <div className="text-xl font-extrabold text-primary">
              {state.scaleBalance > 0
                ? `+${state.scaleBalance}`
                : state.scaleBalance}{' '}
              / +{SCALE_WIN_THRESHOLD}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-secondary px-3.5 py-2 text-secondary-foreground">
            <div className="text-xs text-muted-foreground">
              {isKo ? '생명 촛불 / 뼈 토큰' : 'Life Candles / Bone Tokens'}
            </div>
            <div className="text-lg font-bold text-foreground">
              {'🕯️'.repeat(state.candlesRemaining)}{' '}
              <span className="ml-2 text-primary">🦴 {state.bones}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setState(applyWinningFormationPreset(state))}
            className="rounded-xl border border-border bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground hover:bg-accent"
          >
            {isKo ? '⚡ 필승 야수 진형 장착' : '⚡ Load Lethal Beast Formation'}
          </button>
          <button
            type="button"
            onClick={() => setState(createCandleSacrificeState())}
            className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold hover:bg-accent"
          >
            {isKo ? '새 결투' : 'New Duel'}
          </button>
        </div>
      </div>

      {/* Victory / Defeat Banner */}
      {state.status === 'victory' && (
        <div className="mb-4 rounded-2xl border border-primary bg-primary/10 p-4 text-center">
          <h3 className="text-lg font-extrabold text-primary">
            {isKo
              ? '🏆 천칭이 +5까지 기울었습니다! 오두막 그림자 지배자 격파!'
              : '🏆 The Scale Tipped to +5! Cabin Shadow Master Defeated!'}
          </h3>
        </div>
      )}

      {state.status === 'defeat' && (
        <div className="mb-4 rounded-2xl border border-destructive bg-destructive/10 p-4 text-center">
          <h3 className="text-lg font-extrabold text-destructive">
            {isKo
              ? '🕯️ 두 개의 촛불이 모두 꺼졌습니다. 다시 도전하세요!'
              : '🕯️ Both Candles Extinguished! Try Again!'}
          </h3>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-12">
        {/* 4-Lane Opposing Board (3 Rows x 4 Columns) */}
        <div className="lg:col-span-8 flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
          {/* Enemy Queue Row */}
          <div>
            <div className="mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {isKo ? '👁️ 적 예고 열 (다음 턴 전진)' : '👁️ Enemy Queue (Advances Next Turn)'}
            </div>
            <div className="grid grid-cols-4 gap-2.5">
              {state.enemyQueue.map((card, idx) => (
                <div
                  key={`eq-${idx}`}
                  className="flex min-h-20 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-background/60 p-2 text-center"
                >
                  {card ? (
                    <>
                      <span className="text-2xl">{card.icon}</span>
                      <span className="mt-1 text-xs font-bold text-foreground">
                        {isKo ? card.nameKo : card.nameEn}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ⚔️{card.attack} · ❤️{card.hp}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {isKo ? '대기 없음' : 'Empty'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Enemy Active Row */}
          <div>
            <div className="mb-1 text-xs font-bold uppercase tracking-wider text-destructive">
              {isKo ? '🐺 적 전선 열 (현재 교전 중)' : '🐺 Enemy Combat Row'}
            </div>
            <div className="grid grid-cols-4 gap-2.5">
              {state.enemyRow.map((card, idx) => (
                <div
                  key={`er-${idx}`}
                  className="flex min-h-24 flex-col items-center justify-center rounded-xl border border-border bg-secondary/60 p-2.5 text-center"
                >
                  {card ? (
                    <>
                      <span className="text-3xl">{card.icon}</span>
                      <span className="mt-1 text-xs font-bold text-foreground">
                        {isKo ? card.nameKo : card.nameEn}
                      </span>
                      <span className="mt-0.5 rounded bg-background px-2 py-0.5 text-xs font-extrabold text-destructive">
                        ⚔️{card.attack} / ❤️{card.hp}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {isKo ? '빈 전선' : 'Open Lane'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Player Active Row (Interactive for Placement & Blood Sacrifice) */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                {isKo
                  ? '🕯️ 아군 전선 열 (클릭하여 소환 또는 피의 공양)'
                  : '🕯️ Player Row (Click to Summon or Sacrifice Blood)'}
              </span>
              {selectedCard && selectedCard.bloodCost > 0 && (
                <span className="text-xs font-bold text-destructive">
                  {isKo
                    ? `🩸 제물 선택: ${state.sacrificedLanes.length} / ${selectedCard.bloodCost}`
                    : `🩸 Sacrifices: ${state.sacrificedLanes.length} / ${selectedCard.bloodCost}`}
                </span>
              )}
            </div>

            <div className="grid grid-cols-4 gap-2.5">
              {state.playerRow.map((card, idx) => {
                const isSacrificed = state.sacrificedLanes.includes(idx);
                return (
                  <button
                    key={`pr-${idx}`}
                    type="button"
                    onClick={() => setState(clickPlayerLane(state, idx))}
                    className={`flex min-h-28 flex-col items-center justify-center rounded-xl border p-2.5 text-center transition ${
                      isSacrificed
                        ? 'border-destructive bg-destructive/20'
                        : card
                          ? 'border-primary bg-primary/10 hover:bg-primary/20'
                          : 'border-border bg-background hover:border-primary hover:bg-accent'
                    }`}
                  >
                    {card ? (
                      <>
                        <span className="text-3xl">{card.icon}</span>
                        <span className="mt-1 text-xs font-bold text-foreground">
                          {isKo ? card.nameKo : card.nameEn}
                        </span>
                        <span className="mt-0.5 rounded bg-card px-2 py-0.5 text-xs font-extrabold text-primary">
                          ⚔️{card.attack} / ❤️{card.hp}
                        </span>
                        {isSacrificed && (
                          <span className="mt-1 text-xs font-bold text-destructive">
                            {isKo ? '🩸 제물 지정됨' : '🩸 Marked'}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-xs font-semibold text-muted-foreground">
                        {isKo ? `+ ${idx + 1}번 레인 배치` : `+ Place Lane ${idx + 1}`}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Combat Bell & Dual Deck Draw Bar */}
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setState(drawFromDeck(state, 'squirrel'))}
                disabled={state.squirrelsLeft <= 0}
                className="rounded-xl border border-border bg-secondary px-3 py-2 text-xs font-bold text-secondary-foreground hover:bg-accent disabled:opacity-40"
              >
                🐿️ {isKo ? `다람쥐 뽑기 (${state.squirrelsLeft})` : `Draw Squirrel (${state.squirrelsLeft})`}
              </button>
              <button
                type="button"
                onClick={() => setState(drawFromDeck(state, 'main'))}
                disabled={state.mainDeck.length <= 0}
                className="rounded-xl border border-border bg-secondary px-3 py-2 text-xs font-bold text-secondary-foreground hover:bg-accent disabled:opacity-40"
              >
                🐺 {isKo ? `야수 덱 뽑기 (${state.mainDeck.length})` : `Draw Beast (${state.mainDeck.length})`}
              </button>
            </div>

            <button
              type="button"
              onClick={handleRingBell}
              disabled={state.status !== 'player-turn'}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-extrabold text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-40"
            >
              🔔 {isKo ? '전투 종 울리기 (END TURN)' : 'RING COMBAT BELL (STRIKE)'}
            </button>
          </div>
        </div>

        {/* Right Column: Player Hand & Combat Log */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-2 text-sm font-bold text-foreground">
              {isKo ? `✋ 보유 손패 (${state.hand.length}장)` : `✋ Your Hand (${state.hand.length})`}
            </h3>
            <div className="space-y-2">
              {state.hand.map((card) => {
                const isSelected = card.id === state.selectedHandCardId;
                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => setState(selectHandCard(state, card.id))}
                    className={`flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition ${
                      isSelected
                        ? 'border-primary bg-primary/15 shadow-xs'
                        : 'border-border bg-background hover:bg-accent'
                    }`}
                  >
                    <span className="text-2xl">{card.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">
                          {isKo ? card.nameKo : card.nameEn} (⚔️{card.attack}/❤️{card.hp})
                        </span>
                        {renderCostBadge(card, isKo)}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {isKo ? card.sigilDescKo : card.sigilDescEn}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {isKo ? '📜 오두막 결투 기록' : '📜 Cabin Combat Log'}
            </h3>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              {(isKo ? state.combatLogKo : state.combatLogEn).map((line, i) => (
                <li key={i} className="leading-relaxed">
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
