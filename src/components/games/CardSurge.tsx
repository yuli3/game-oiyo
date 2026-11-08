import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useCardTiltPro, MobileHapticsPro } from "../../lib/games/engine-suite-unified";
import {
  initGame,
  toggleCardSelection,
  discardCards,
  playCards,
  openShop,
  buyJoker,
  sellJoker,
  rerollShop,
  advanceToNextBlind,
  evaluatePlayedHand,
  type CardSurgeState,
  type SurgeCard,
  type SurgeJoker,
  type ScoreBreakdown,
  type ScoringStep,
} from "../../lib/games/card-surge";
import {
  loadCardSurgeQuests,
  saveCardSurgeQuests,
  claimCardSurgeQuestReward,
  type CardSurgeQuest,
} from "../../lib/games/card-surge-quests";
import {
  loadCardSurgeMetaSave,
  saveCardSurgeMetaSave,
  calculateCardSurgeModifiers,
  buySurgeVoucher,
  SURGE_VOUCHERS,
  type CardSurgeMetaSave,
} from "../../lib/games/card-surge-meta";
import {
  SURGE_TRANSMISSIONS,
  type SurgeTransmission,
} from "../../lib/games/card-surge-lore";
import {
  createCameraShake,
  addTrauma,
  updateCameraShake,
  type ScreenTraumaState,
} from "../../lib/games/screen-shake";
import { HitStopController } from "../../lib/games/game-juice";
import { celebrate } from "../../lib/games/celebration";
import { CARD_SURGE_SPRITES, CARD_SURGE_UI_SPRITES } from "../../lib/games/sprites";
import { Button } from "../ui/button";

function playWebTone(freq: number, type: OscillatorType = "sine", duration: number = 0.1, gain: number = 0.15) {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, duration * 1000 + 100);
  } catch {
    // Ignore audio context errors
  }
}

function playWebChord(freqs: number[], type: OscillatorType = "triangle", duration: number = 0.3, gain: number = 0.1) {
  for (const f of freqs) {
    playWebTone(f, type, duration, gain);
  }
}

interface CardSurgeProps {
  locale?: string;
  lang?: string;
}

const SUIT_ICONS: Record<string, string> = {
  spades: "♠",
  hearts: "♥",
  clubs: "♣",
  diamonds: "♦",
};

const SUIT_COLORS: Record<string, string> = {
  spades: "text-foreground",
  clubs: "text-primary",
  hearts: "text-destructive",
  diamonds: "text-chart-3",
};

const RANK_LABELS: Record<number, string> = {
  2: "2",
  3: "3",
  4: "4",
  5: "5",
  6: "6",
  7: "7",
  8: "8",
  9: "9",
  10: "10",
  11: "J",
  12: "Q",
  13: "K",
  14: "A",
};

function TiltSurgeCardButton({
  card,
  isSelected,
  isDebuffed,
  disabled,
  locale,
  onClick,
}: {
  card: SurgeCard;
  isSelected: boolean;
  isDebuffed: boolean;
  disabled: boolean;
  locale: string;
  onClick: () => void;
}) {
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
        onClick();
      }}
      disabled={disabled}
      className={`relative flex h-28 w-18 flex-col justify-between rounded-xl border-2 bg-card p-2 shadow-sm transition-all will-change-transform transform-(--card-tilt) sm:h-32 sm:w-20 ${
        isSelected
          ? "-translate-y-4 border-primary shadow-md ring-2 ring-primary/40"
          : "border-border hover:-translate-y-1 hover:border-primary/50"
      } ${isDebuffed ? "opacity-60" : ""}`}
    >
      {/* Top Rank & Suit */}
      <div className={`flex items-center gap-1 font-black ${SUIT_COLORS[card.suit]}`}>
        <span className="text-sm sm:text-base">{RANK_LABELS[card.rank]}</span>
        <span className="text-xs sm:text-sm">{SUIT_ICONS[card.suit]}</span>
      </div>

      {/* Center Large Suit Icon */}
      <div className={`m-auto text-3xl font-black ${SUIT_COLORS[card.suit]}`}>
        {SUIT_ICONS[card.suit]}
      </div>

      {/* Bottom Rank (Inverted) */}
      <div className={`self-end text-xs font-bold ${SUIT_COLORS[card.suit]}`}>
        {RANK_LABELS[card.rank]}
      </div>

      {/* Debuff Banner */}
      {isDebuffed && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/80 font-black text-destructive text-xs uppercase">
          {locale === "ko" ? "무효" : "Debuff"}
        </div>
      )}
    </button>
  );
}

export function CardSurge({ locale = "ko", lang }: CardSurgeProps) {
  const activeLang = lang || locale;
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Meta save & Quests & Lore state
  const [metaSave, setMetaSave] = useState<CardSurgeMetaSave>(() => loadCardSurgeMetaSave());
  const [quests, setQuests] = useState<CardSurgeQuest[]>(() => loadCardSurgeQuests());
  const [showQuests, setShowQuests] = useState(false);
  const [showVouchers, setShowVouchers] = useState(false);
  const [transmission, setTransmission] = useState<SurgeTransmission | null>(null);

  const modifiers = useMemo(() => calculateCardSurgeModifiers(metaSave), [metaSave]);

  const [state, setState] = useState<CardSurgeState>(() => initGame(Date.now(), modifiers));
  const [isScoringAnim, setIsScoringAnim] = useState<boolean>(false);
  const [activeStep, setActiveStep] = useState<ScoringStep | null>(null);
  const [sortMode, setSortMode] = useState<"rank" | "suit">("rank");
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  // Initial greeting transmission
  useEffect(() => {
    const starts = SURGE_TRANSMISSIONS.blind_start;
    if (starts && starts.length > 0) {
      setTransmission(starts[0]);
    }
  }, []);

  // Trigger celebration on victory
  useEffect(() => {
    if (state.phase === "victory" && containerRef.current) {
      celebrate(containerRef.current, { preset: "stardust" });
      MobileHapticsPro.success();
    } else if (state.phase === "game-over") {
      MobileHapticsPro.warning();
      const gos = SURGE_TRANSMISSIONS.game_over;
      if (gos && gos.length > 0) setTransmission(gos[0]);
    }
  }, [state.phase]);

  const shakeEngineRef = useRef<ScreenTraumaState>(createCameraShake());
  const hitStopRef = useRef(new HitStopController());
  const [shakeOffset, setShakeOffset] = useState({ x: 0, y: 0 });

  const triggerShake = useCallback((amount: number) => {
    shakeEngineRef.current = addTrauma(shakeEngineRef.current, amount);
    let lastTime = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      const res = updateCameraShake(shakeEngineRef.current, dt);
      shakeEngineRef.current = res.state;
      setShakeOffset({
        x: Math.round(res.offset.offsetX * 10) / 10,
        y: Math.round(res.offset.offsetY * 10) / 10,
      });
      if (res.state.trauma > 0.01) {
        requestAnimationFrame(tick);
      } else {
        setShakeOffset({ x: 0, y: 0 });
      }
    };
    requestAnimationFrame(tick);
  }, []);

  // Audio helper
  const playCardClickSound = useCallback(() => {
    playWebTone(440, "sine", 0.05, 0.1);
  }, []);

  const playScoreStepSound = useCallback((stepIdx: number) => {
    const baseFreq = 300 + stepIdx * 45;
    playWebTone(baseFreq, "triangle", 0.08, 0.15);
  }, []);

  const playBigScoreSound = useCallback(() => {
    playWebChord([523.25, 659.25, 783.99, 1046.5], "triangle", 0.4, 0.25);
  }, []);

  // Sort hand cards
  const sortedHand = useMemo(() => {
    return [...state.hand].sort((a, b) => {
      if (sortMode === "rank") {
        if (b.rank !== a.rank) return b.rank - a.rank;
        return a.suit.localeCompare(b.suit);
      } else {
        if (a.suit !== b.suit) return a.suit.localeCompare(b.suit);
        return b.rank - a.rank;
      }
    });
  }, [state.hand, sortMode]);

  // Selected cards objects
  const selectedCards = useMemo(() => {
    return state.hand.filter((c) => state.selectedCardIds.includes(c.id));
  }, [state.hand, state.selectedCardIds]);

  // Preview poker hand for selected cards
  const handPreview = useMemo(() => {
    if (selectedCards.length === 0) return null;
    const { handType } = evaluatePlayedHand(selectedCards);
    const levelInfo = state.handLevels[handType];
    return {
      handType,
      name: levelInfo.name[activeLang] ?? levelInfo.name.ko,
      chips: levelInfo.chips,
      mult: levelInfo.mult,
    };
  }, [selectedCards, state.handLevels, activeLang]);

  // Handle card click
  const handleCardClick = (cardId: string) => {
    if (isScoringAnim || state.phase !== "play") return;
    playCardClickSound();
    setState((prev) => toggleCardSelection(prev, cardId));
  };

  // Discard action
  const handleDiscard = () => {
    if (isScoringAnim || state.phase !== "play" || state.selectedCardIds.length === 0) return;
    playWebTone(220, "sine", 0.1, 0.12);
    MobileHapticsPro.light();
    setState((prev) => discardCards(prev));
  };

  // Play Hand action with Quest & Lore Integration
  const handlePlayHand = () => {
    if (isScoringAnim || state.phase !== "play" || state.selectedCardIds.length === 0) return;

    const { handType } = evaluatePlayedHand(selectedCards);
    const { nextState, breakdown } = playCards(state);

    setIsScoringAnim(true);
    triggerShake(0.15);

    // Track lifetime hands & quests
    setMetaSave((prev) => {
      const next = { ...prev, lifetimeHandsPlayed: prev.lifetimeHandsPlayed + 1 };
      saveCardSurgeMetaSave(next);
      return next;
    });

    // Check flush quest
    if (handType === "flush" || handType === "straight-flush") {
      setQuests((prevQ) => {
        const nextQ = prevQ.map((q) => {
          if (q.id === "surge_quest_flush_master") {
            return { ...q, progress: Math.min(q.maxProgress, q.progress + 1) };
          }
          return q;
        });
        saveCardSurgeQuests(nextQ);
        return nextQ;
      });
    }

    // Step-by-step scoring animation
    let stepIndex = 0;
    const interval = setInterval(() => {
      if (stepIndex < breakdown.steps.length) {
        const curStep = breakdown.steps[stepIndex];
        setActiveStep(curStep);
        playScoreStepSound(stepIndex);
        MobileHapticsPro.medium();
        if (curStep.type === "joker" || curStep.multMultiplier > 1 || curStep.multAdded > 0) {
          hitStopRef.current.trigger(0.04);
        }
        stepIndex++;
      } else {
        clearInterval(interval);
        setActiveStep(null);
        setIsScoringAnim(false);

        // Huge score check
        if (breakdown.totalScore >= 3000) {
          playBigScoreSound();
          triggerShake(0.4);
          hitStopRef.current.trigger(0.08);
          MobileHapticsPro.heavy();

          const surges = SURGE_TRANSMISSIONS.surge_mult;
          if (surges && surges.length > 0) setTransmission(surges[0]);

          setQuests((prevQ) => {
            const nextQ = prevQ.map((q) => {
              if (q.id === "surge_quest_high_roller") {
                return { ...q, progress: 1 };
              }
              return q;
            });
            saveCardSurgeQuests(nextQ);
            return nextQ;
          });
        }

        // Check round cleared and give Neon Chips
        if (nextState.phase === "round-cleared") {
          MobileHapticsPro.success();
          const earnedNeon = 50 + nextState.ante * 20;
          setMetaSave((prev) => {
            const next = {
              ...prev,
              neonChips: prev.neonChips + earnedNeon,
              highestAnte: Math.max(prev.highestAnte, nextState.ante),
            };
            saveCardSurgeMetaSave(next);
            return next;
          });

          // Check joker synergy quest
          if (nextState.jokers.length >= 3) {
            setQuests((prevQ) => {
              const nextQ = prevQ.map((q) => {
                if (q.id === "surge_quest_joker_synergy") {
                  return { ...q, progress: 1 };
                }
                return q;
              });
              saveCardSurgeQuests(nextQ);
              return nextQ;
            });
          }

          // Check ante 3 boss quest
          if (nextState.ante >= 3) {
            setQuests((prevQ) => {
              const nextQ = prevQ.map((q) => {
                if (q.id === "surge_quest_ante_champion") {
                  return { ...q, progress: 1 };
                }
                return q;
              });
              saveCardSurgeQuests(nextQ);
              return nextQ;
            });
          }
        }

        setState(nextState);
      }
    }, 280);
  };

  // Open shop
  const handleOpenShop = () => {
    setState((prev) => openShop(prev));
    const shops = SURGE_TRANSMISSIONS.shop_visit;
    if (shops && shops.length > 0) setTransmission(shops[0]);
    MobileHapticsPro.light();
  };

  // Buy Joker
  const handleBuyJoker = (offerId: string) => {
    setState((prev) => buyJoker(prev, offerId));
    playWebTone(600, "triangle", 0.1, 0.2);
    MobileHapticsPro.impact();
  };

  // Sell Joker
  const handleSellJoker = (index: number) => {
    setState((prev) => sellJoker(prev, index));
    playWebTone(350, "sine", 0.1, 0.15);
    MobileHapticsPro.light();
  };

  // Reroll Shop
  const handleReroll = () => {
    setState((prev) => rerollShop(prev));
    playWebTone(400, "triangle", 0.08, 0.15);
    MobileHapticsPro.light();
  };

  // Advance to Next Blind
  const handleNextBlind = () => {
    setState((prev) => advanceToNextBlind(prev));
    MobileHapticsPro.medium();

    if (state.blindType === "big") {
      const bosses = SURGE_TRANSMISSIONS.boss_encounter;
      if (bosses && bosses.length > 0) setTransmission(bosses[0]);
    } else {
      const starts = SURGE_TRANSMISSIONS.blind_start;
      if (starts && starts.length > 0) setTransmission(starts[0]);
    }
  };

  // Restart Game with Modifiers
  const handleRestart = () => {
    setState(initGame(Date.now(), modifiers));
    MobileHapticsPro.impact();
  };

  // Share Result
  const handleShareResult = async () => {
    const text = `🃏 Card Surge - Ante ${state.ante} | Score: ${state.currentRoundScore.toLocaleString()}! https://game.oiyo.net/card-surge`;
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
      MobileHapticsPro.success();
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        "--shake-x": `${shakeOffset.x}px`,
        "--shake-y": `${shakeOffset.y}px`,
      } as React.CSSProperties}
      className="relative flex min-h-145 w-full max-w-4xl flex-col items-center justify-between gap-4 rounded-3xl border border-border bg-gradient-to-b from-card via-background to-card p-4 sm:p-6 shadow-xl select-none translate-x-(--shake-x) translate-y-(--shake-y)"
    >
      {/* 3-Persona Casino Lore Transmission HUD */}
      {transmission && (
        <div className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg border border-border bg-card/90 shadow-sm text-sm transition-all animate-in fade-in">
          <span className="text-2xl">{transmission.speaker.avatar}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-foreground text-xs">
                {transmission.speaker.name[activeLang] || transmission.speaker.name.ko}
              </span>
              <span className="text-xs text-muted-foreground">
                ({transmission.speaker.role[activeLang] || transmission.speaker.role.ko})
              </span>
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {transmission.text[activeLang] || transmission.text.ko}
            </p>
          </div>
          <span
            className={`px-2 py-0.5 rounded text-xs font-semibold tracking-wider ${
              transmission.tag === "boss"
                ? "bg-destructive text-destructive-foreground animate-pulse"
                : transmission.tag === "combo"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {transmission.tag.toUpperCase()}
          </span>
        </div>
      )}

      {/* Top Status HUD */}
      <div className="flex w-full flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              {activeLang === "ko" ? "안테" : "Ante"}
            </span>
            <span className="text-xl font-black text-foreground">{state.ante} / 8</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              {activeLang === "ko" ? "블라인드" : "Blind"}
            </span>
            <span className="text-sm font-extrabold capitalize text-primary">
              {state.blindType}
            </span>
          </div>
        </div>

        {/* Target and Round Score */}
        <div className="flex flex-col items-center">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            {activeLang === "ko" ? "목표 점수" : "Target Score"}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-foreground">
              {state.currentRoundScore.toLocaleString()}
            </span>
            <span className="text-sm font-bold text-muted-foreground">
              / {state.targetScore.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Hands, Discards, Money & Neon Chips */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex flex-col items-center">
            <span className="text-xs font-bold text-muted-foreground">Hands</span>
            <span className="text-lg font-black text-foreground">{state.handsRemaining}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-xs font-bold text-muted-foreground">Discards</span>
            <span className="text-lg font-black text-foreground">{state.discardsRemaining}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-xs font-bold text-muted-foreground">Money</span>
            <span className="text-lg font-black text-warning">${state.money}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-xs font-bold text-muted-foreground">Neon Chips</span>
            <span className="text-lg font-black text-chart-3">✨ {metaSave.neonChips}</span>
          </div>
          <div className="flex items-center gap-1.5 ml-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowQuests(true)}
            >
              📜 {activeLang === "ko" ? "지령" : "Quests"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowVouchers(true)}
            >
              🎟️ {activeLang === "ko" ? "바우처" : "Vouchers"}
            </Button>
          </div>
        </div>
      </div>

      {/* Jokers Bar */}
      <div className="flex min-h-24 w-full items-center justify-start gap-2 overflow-x-auto rounded-2xl border border-border/40 bg-muted/30 p-2 sm:p-3">
        <div className="flex flex-col items-center justify-center border-r border-border/40 pr-3">
          <span className="text-xs font-bold text-muted-foreground uppercase">Jokers</span>
          <span className="text-sm font-black text-foreground">{state.jokers.length} / 5</span>
        </div>
        {state.jokers.length === 0 ? (
          <span className="text-xs italic text-muted-foreground ml-2">
            {activeLang === "ko" ? "장착된 조커가 없습니다. 상점에서 영입하세요!" : "No Jokers equipped. Visit shop to draft synergy!"}
          </span>
        ) : (
          state.jokers.map((joker, idx) => (
            <div
              key={`${joker.id}-${idx}`}
              className="group relative flex h-20 w-16 flex-col justify-between rounded-xl border border-primary/40 bg-card p-1.5 shadow-sm transition-transform hover:scale-105"
            >
              <span className="truncate text-xs font-black text-primary">
                {joker.name[activeLang] ?? joker.name.ko}
              </span>
              <span className="line-clamp-2 text-xs font-semibold text-muted-foreground leading-tight">
                {joker.description[activeLang] ?? joker.description.ko}
              </span>
              {state.phase === "shop" && (
                <button
                  type="button"
                  onClick={() => handleSellJoker(idx)}
                  className="rounded bg-destructive/80 text-xs font-bold text-destructive-foreground hover:bg-destructive py-0.5"
                >
                  Sell +${Math.max(1, Math.floor(joker.cost / 2))}
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Live Hand Scoring Preview / Breakdown */}
      <div className="flex min-h-12 w-full items-center justify-center rounded-xl bg-card/60 px-4 py-2 border border-border/50 text-center">
        {activeStep ? (
          <div className="flex items-center gap-3 animate-pulse">
            <span className="text-sm font-black text-primary uppercase">
              {activeStep.sourceName}
            </span>
            <div className="flex items-center gap-2 text-base font-black">
              <span className="text-primary">{activeStep.totalChips} 칩</span>
              <span>×</span>
              <span className="text-destructive">{activeStep.totalMult} 배</span>
              <span>=</span>
              <span className="text-foreground">{(activeStep.totalChips * activeStep.totalMult).toLocaleString()}</span>
            </div>
          </div>
        ) : handPreview ? (
          <div className="flex items-center gap-3">
            <span className="text-sm font-black text-foreground">{handPreview.name}</span>
            <div className="flex items-center gap-1.5 text-sm font-black">
              <span className="rounded bg-primary/20 px-2 py-0.5 text-primary">
                {handPreview.chips} 칩
              </span>
              <span>×</span>
              <span className="rounded bg-destructive/20 px-2 py-0.5 text-destructive">
                {handPreview.mult} 배
              </span>
            </div>
          </div>
        ) : (
          <span className="text-xs font-semibold text-muted-foreground">
            {activeLang === "ko" ? "카드를 최대 5장까지 선택하여 핸드를 제출하세요." : "Select up to 5 cards to play or discard."}
          </span>
        )}
      </div>

      {/* Hand Cards Area */}
      <div className="flex w-full items-center justify-center gap-1 sm:gap-2 overflow-x-auto py-2">
        {sortedHand.map((card) => {
          const isSelected = state.selectedCardIds.includes(card.id);
          return (
            <TiltSurgeCardButton
              key={card.id}
              card={card}
              isSelected={isSelected}
              isDebuffed={!!card.debuffed}
              disabled={isScoringAnim || state.phase !== "play"}
              locale={activeLang}
              onClick={() => handleCardClick(card.id)}
            />
          );
        })}
      </div>

      {/* Action Controls */}
      <div className="flex w-full flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSortMode((prev) => (prev === "rank" ? "suit" : "rank"))}
          >
            {sortMode === "rank" ? "Sort: Rank" : "Sort: Suit"}
          </Button>
        </div>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="secondary"
            size="lg"
            disabled={isScoringAnim || state.phase !== "play" || state.discardsRemaining <= 0 || state.selectedCardIds.length === 0}
            onClick={handleDiscard}
          >
            {activeLang === "ko" ? `버리기 (${state.discardsRemaining})` : `Discard (${state.discardsRemaining})`}
          </Button>

          <Button
            type="button"
            variant="default"
            size="lg"
            disabled={isScoringAnim || state.phase !== "play" || state.selectedCardIds.length === 0}
            onClick={handlePlayHand}
          >
            {activeLang === "ko" ? "핸드 제출" : "Play Hand"}
          </Button>
        </div>
      </div>

      {/* Round Cleared Modal */}
      {state.phase === "round-cleared" && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-3xl bg-background/90 p-6 backdrop-blur-xs animate-in fade-in">
          <h2 className="text-2xl font-black text-primary">
            {activeLang === "ko" ? "블라인드 격파 성공!" : "Blind Conquered!"}
          </h2>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">
            {activeLang === "ko" ? `라운드 달성 점수: ${state.currentRoundScore.toLocaleString()}점` : `Round Score: ${state.currentRoundScore.toLocaleString()}`}
          </p>
          <div className="mt-2 text-xs font-bold text-chart-3">
            +{50 + state.ante * 20} ✨ Neon Chips
          </div>
          <div className="mt-6 flex gap-3">
            <Button type="button" variant="default" size="lg" onClick={handleOpenShop}>
              {activeLang === "ko" ? "상점 방문" : "Visit Shop"}
            </Button>
          </div>
        </div>
      )}

      {/* Shop Modal */}
      {state.phase === "shop" && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-between rounded-3xl bg-background/95 p-6 backdrop-blur-sm animate-in fade-in">
          <div className="flex w-full items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl font-black text-foreground">
                {activeLang === "ko" ? "암시장 상점" : "Black Market Shop"}
              </span>
              <span className="text-sm font-bold text-warning">${state.money}</span>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={state.money < state.shopRerollCost}
                onClick={handleReroll}
              >
                Reroll (${state.shopRerollCost})
              </Button>
              <Button type="button" variant="default" size="sm" onClick={handleNextBlind}>
                {activeLang === "ko" ? "다음 블라인드" : "Next Blind"}
              </Button>
            </div>
          </div>

          <div className="flex w-full flex-1 flex-wrap items-center justify-center gap-4 py-4 overflow-y-auto max-h-96">
            {state.shopOffers.map((joker) => {
              const discountedCost = Math.max(1, Math.round(joker.cost * (1 - modifiers.discountRate)));
              const canAfford = state.money >= discountedCost && state.jokers.length < 5;
              return (
                <div
                  key={joker.id}
                  className="flex h-44 w-32 flex-col justify-between rounded-2xl border-2 border-border bg-card p-3 shadow-md hover:border-primary/60 transition-all"
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-black text-primary">
                      {joker.name[activeLang] ?? joker.name.ko}
                    </span>
                    <span className="text-xs font-semibold text-muted-foreground leading-tight">
                      {joker.description[activeLang] ?? joker.description.ko}
                    </span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant={canAfford ? "default" : "outline"}
                    disabled={!canAfford}
                    onClick={() => handleBuyJoker(joker.id)}
                    className="w-full"
                  >
                    ${discountedCost}
                  </Button>
                </div>
              );
            })}
          </div>

          <div className="text-xs text-muted-foreground">
            {activeLang === "ko" ? "조커는 최대 5개까지 보유 가능합니다." : "You can hold up to 5 Jokers in your active slot."}
          </div>
        </div>
      )}

      {/* Game Over Modal */}
      {state.phase === "game-over" && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-3xl bg-background/95 p-6 backdrop-blur-xs">
          <img src={CARD_SURGE_UI_SPRITES.surge} alt="Surge Energy" className="size-16 object-contain mb-2 animate-pulse drop-shadow" />
          <h2 className="mt-2 text-2xl font-black text-destructive">
            {activeLang === "ko" ? "게임 오버" : "Game Over"}
          </h2>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">
            {activeLang === "ko" ? `안테 ${state.ante}에서 도전을 마쳤습니다.` : `Fell at Ante ${state.ante}.`}
          </p>
          <div className="mt-4 flex flex-col items-center gap-1">
            <span className="text-xs font-bold text-muted-foreground">{activeLang === "ko" ? "달성 점수" : "Final Round Score"}</span>
            <span className="text-3xl font-black text-foreground">
              {state.currentRoundScore.toLocaleString()}점
            </span>
          </div>

          <div className="mt-6 flex gap-3">
            <Button type="button" variant="default" size="lg" onClick={handleRestart}>
              {activeLang === "ko" ? "다시 도전" : "Try Again"}
            </Button>
            <Button type="button" variant="outline" size="lg" onClick={handleShareResult}>
              {copySuccess ? (activeLang === "ko" ? "복사 완료!" : "Copied!") : (activeLang === "ko" ? "결과 공유" : "Share Result")}
            </Button>
          </div>
        </div>
      )}

      {/* Victory Modal */}
      {state.phase === "victory" && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-3xl bg-background/95 p-6 backdrop-blur-xs animate-in zoom-in-95">
          <img
            src={CARD_SURGE_UI_SPRITES.trophy}
            alt="Ante Master Trophy"
            className="size-24 object-contain animate-bounce drop-shadow-2xl mb-3 select-none pointer-events-none"
            draggable={false}
          />
          <h2 className="mt-2 text-3xl font-black text-primary">
            {activeLang === "ko" ? "서지 마스터 등극!" : "Surge Master Victory!"}
          </h2>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">
            {activeLang === "ko" ? "안테 8 보스 블라인드를 모두 격파하고 정상에 올랐습니다!" : "You conquered all 8 Ante Boss Blinds and reached the pinnacle!"}
          </p>
          <div className="mt-6 flex gap-3">
            <Button type="button" variant="default" size="lg" onClick={handleRestart}>
              {activeLang === "ko" ? "새로운 여정 시작" : "New Run"}
            </Button>
            <Button type="button" variant="outline" size="lg" onClick={handleShareResult}>
              {copySuccess ? (activeLang === "ko" ? "복사 완료!" : "Copied!") : (activeLang === "ko" ? "우승 기록 복사" : "Share Victory")}
            </Button>
          </div>
        </div>
      )}

      {/* Quests Modal */}
      {showQuests && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-5 shadow-lg flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-bold text-foreground">📜 Underground Casino Directives</h4>
              <button
                type="button"
                onClick={() => setShowQuests(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-semibold"
              >
                ✕ Close
              </button>
            </div>

            <div className="flex flex-col gap-2.5 max-h-96 overflow-y-auto pr-1">
              {quests.map((q) => {
                const isReady = q.progress >= q.maxProgress && !q.isClaimed;
                return (
                  <div
                    key={q.id}
                    className="p-3 rounded-lg border border-border bg-background flex flex-col gap-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h5 className="text-sm font-bold text-foreground">
                          {q.title[activeLang] || q.title.ko}
                        </h5>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {q.desc[activeLang] || q.desc.ko}
                        </p>
                      </div>
                      <span className="text-xs font-bold text-chart-3 whitespace-nowrap">
                        +{q.rewardNeonChips} ✨
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-1">
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          style={{
                            "--quest-pct": `${Math.min(100, (q.progress / q.maxProgress) * 100)}%`,
                          } as React.CSSProperties}
                          className="h-full w-(--quest-pct) bg-primary transition-all"
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {q.progress}/{q.maxProgress}
                      </span>
                      {q.isClaimed ? (
                        <span className="text-xs font-semibold text-muted-foreground">Claimed</span>
                      ) : isReady ? (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            const updated = claimCardSurgeQuestReward(q.id, quests, (chips) => {
                              setMetaSave((prev) => {
                                const next = { ...prev, neonChips: prev.neonChips + chips };
                                saveCardSurgeMetaSave(next);
                                return next;
                              });
                            });
                            setQuests(updated);
                            saveCardSurgeQuests(updated);
                            MobileHapticsPro.success();
                          }}
                        >
                          Claim
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">In Progress</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Vouchers Modal */}
      {showVouchers && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-5 shadow-lg flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h4 className="text-lg font-bold text-foreground">🎟️ Permanent Black Market Vouchers</h4>
                <span className="text-xs font-bold text-chart-3">
                  ✨ {metaSave.neonChips}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowVouchers(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-semibold"
              >
                ✕ Close
              </button>
            </div>

            <div className="flex flex-col gap-2.5 max-h-96 overflow-y-auto pr-1">
              {Object.keys(SURGE_VOUCHERS).map((key) => {
                const voucher = SURGE_VOUCHERS[key];
                const currentLvlKey = `${key}Lvl` as keyof CardSurgeMetaSave;
                const currentLvl = (metaSave[currentLvlKey] as number) || 0;
                const cost = Math.round(voucher.cost * Math.pow(voucher.costMult, currentLvl));
                const isMax = currentLvl >= voucher.maxLevel;
                const canAfford = metaSave.neonChips >= cost && !isMax;

                return (
                  <div
                    key={key}
                    className="p-3 rounded-lg border border-border bg-background flex items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{voucher.icon}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="text-sm font-bold text-foreground">
                            {voucher.name[activeLang] || voucher.name.ko}
                          </h5>
                          <span className="text-xs font-semibold text-muted-foreground">
                            Lv.{currentLvl}/{voucher.maxLevel}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {voucher.desc[activeLang] || voucher.desc.ko}
                        </p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      disabled={!canAfford}
                      onClick={() => {
                        const res = buySurgeVoucher(key as keyof typeof SURGE_VOUCHERS, metaSave);
                        if (res.success) {
                          setMetaSave(res.newSave);
                          MobileHapticsPro.success();
                        }
                      }}
                      className="whitespace-nowrap"
                    >
                      {isMax ? "MAX" : `✨ ${cost}`}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CardSurge;
