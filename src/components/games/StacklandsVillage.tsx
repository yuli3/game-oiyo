import { useEffect, useRef, useState } from "react";
import { useAudioContext } from "../../lib/games/use-audio-context";
import { useClipboardShare } from "../../lib/games/use-clipboard-share";
import { GameStatTile } from "../ui/game/GameStatTile";
import { playSyntheticTone } from "../../lib/games/audio-mixer";
import { triggerHaptic } from "../../lib/games/juice-engine";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import { recordResult } from "../../lib/games/records";
import {
  loadArcadePassProgress,
  reportMissionProgress,
  saveArcadePassProgress,
} from "../../lib/games/arcade-pass";
import {
  buyBoosterPack,
  createInitialStacklandsState,
  getFullStack,
  sellCardForCoins,
  stackCardOn,
  stepVillageSeconds,
  VILLAGE_RECIPES,
  type CardType,
  type StacklandsVillageState,
  type VillageCard,
} from "../../lib/games/stacklands-village";
import type { Locale } from "../../lib/i18n";

interface Props {
  locale?: Locale;
}

const CARD_META: Record<
  CardType,
  { emoji: string; nameKo: string; nameEn: string; colorClass: string }
> = {
  villager: { emoji: "🧑‍🌾", nameKo: "주민", nameEn: "Villager", colorClass: "border-primary bg-primary/10" },
  militia: { emoji: "🛡️", nameKo: "민병대", nameEn: "Militia", colorClass: "border-amber-500 bg-amber-500/10" },
  tree: { emoji: "🌲", nameKo: "나무", nameEn: "Tree", colorClass: "border-emerald-600 bg-emerald-600/10" },
  rock: { emoji: "🪨", nameKo: "바위", nameEn: "Rock", colorClass: "border-slate-500 bg-slate-500/10" },
  "berry-bush": { emoji: "🫐", nameKo: "베리 덤불", nameEn: "Berry Bush", colorClass: "border-purple-500 bg-purple-500/10" },
  wood: { emoji: "🪵", nameKo: "목재", nameEn: "Wood", colorClass: "border-amber-700 bg-amber-700/10" },
  stone: { emoji: "🧱", nameKo: "석재", nameEn: "Stone", colorClass: "border-slate-400 bg-slate-400/10" },
  berry: { emoji: "🍓", nameKo: "열매(식량)", nameEn: "Berry (Food)", colorClass: "border-rose-500 bg-rose-500/10" },
  house: { emoji: "🏡", nameKo: "초가집", nameEn: "House", colorClass: "border-orange-500 bg-orange-500/10" },
  goblin: { emoji: "👺", nameKo: "고블린", nameEn: "Goblin", colorClass: "border-red-600 bg-red-600/10" },
};

export default function StacklandsVillage({ locale = "en" }: Props) {
  const isKo = locale === "ko";
  const [state, setState] = useState<StacklandsVillageState>(() =>
    createInitialStacklandsState(20261031)
  );
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  const getAudio = useAudioContext();
  const { copied, shareText } = useClipboardShare(2000);
  const { isImmersive, containerRef, togglePortal, labels: portalLabels } =
    useArcadePortal({ locale });

  // Ticking loop (~60fps logical step)
  const lastTimeRef = useRef<number>(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = Date.now();
      const dt = Math.min(0.2, (now - lastTimeRef.current) / 1000);
      lastTimeRef.current = now;
      setState((prev) => stepVillageSeconds(prev, dt));
    }, 100);

    return () => window.clearInterval(timer);
  }, []);

  // Win handling
  useEffect(() => {
    if (state.status === "won") {
      try {
        const dateKey = new Date().toISOString().slice(0, 10);
        const current = loadArcadePassProgress(dateKey);
        const updated = reportMissionProgress(current, "stacklands-village", 1);
        saveArcadePassProgress(updated);
      } catch {
        // ignore
      }
      recordResult("stacklands-village", "w");
    }
  }, [state.status]);

  const handleCardClick = (card: VillageCard) => {
    const audio = getAudio();
    if (!selectedCardId) {
      // Select source card
      setSelectedCardId(card.id);
      triggerHaptic("light");
      playSyntheticTone(audio, { freq: 440, duration: 0.08, type: "sine", gain: 0.1 });
    } else if (selectedCardId === card.id) {
      // Deselect or unstack
      if (card.stackedOnId) {
        setState((prev) => stackCardOn(prev, card.id, null));
        triggerHaptic("medium");
        playSyntheticTone(audio, { freq: 350, duration: 0.1, type: "triangle", gain: 0.12 });
      }
      setSelectedCardId(null);
    } else {
      // Stack source onto this card
      triggerHaptic("medium");
      playSyntheticTone(audio, { freq: 520, duration: 0.12, type: "triangle", gain: 0.14 });
      setState((prev) => stackCardOn(prev, selectedCardId, card.id));
      setSelectedCardId(null);
    }
  };

  const onBuyPack = () => {
    const audio = getAudio();
    triggerHaptic("success");
    playSyntheticTone(audio, { freq: 660, duration: 0.15, type: "square", gain: 0.12 });
    setState((prev) => buyBoosterPack(prev));
  };

  const onSellSelected = () => {
    if (!selectedCardId) return;
    const audio = getAudio();
    triggerHaptic("medium");
    playSyntheticTone(audio, { freq: 580, duration: 0.12, type: "sine", gain: 0.14 });
    setState((prev) => sellCardForCoins(prev, selectedCardId));
    setSelectedCardId(null);
  };

  const handleShare = async () => {
    const text = `🃏 ${isKo ? "스택랜드 카드 빌리지" : "Stacklands Card Village"}\nMoon ${state.moon}/${state.maxMoons} | Coins: ${state.coins} | Score: ${state.score}\nhttps://game.oiyo.net/${locale === "en" ? "" : `${locale}/`}stacklands-village`;
    await shareText(text);
  };

  // Group cards into stacks for table rendering
  const rootCards = state.cards.filter((c) => c.stackedOnId === null);

  return (
    <div
      ref={containerRef}
      className={`mx-auto max-w-4xl rounded-3xl border border-border bg-card p-4 text-card-foreground shadow-xl md:p-6 ${
        isImmersive ? "fixed inset-0 z-50 max-w-none overflow-y-auto rounded-none" : ""
      }`}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-black tracking-tight md:text-2xl">
            {isKo
              ? "🃏 스택랜드 카드 빌리지 (Stacklands Card Village)"
              : "🃏 Stacklands Card Village"}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground md:text-sm">
            {isKo
              ? "주민 카드를 자원 위에 포개어 채집하고, 레시피를 조합해 집과 민병대를 세우며 매달 식량 배급과 고블린 습격을 막으세요."
              : "Stack Villagers onto resources to gather, combine cards for recipes, and survive monthly food rationing and goblin raids."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onBuyPack}
            disabled={state.coins < state.boosterCost}
            className="rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow hover:opacity-90 disabled:opacity-40"
          >
            {isKo
              ? `📦 부스터 팩 구매 (${state.boosterCost}코인)`
              : `📦 Buy Booster Pack (${state.boosterCost}c)`}
          </button>
          {selectedCardId && (
            <button
              type="button"
              onClick={onSellSelected}
              className="rounded-xl border border-border bg-secondary px-3 py-1.5 text-xs font-bold text-secondary-foreground hover:opacity-90"
            >
              {isKo ? "💰 선택 카드 판매" : "💰 Sell Selected"}
            </button>
          )}
          <button
            type="button"
            onClick={() => setState(createInitialStacklandsState(Date.now()))}
            className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted"
          >
            {isKo ? "새 마을" : "New Village"}
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

      {/* Telemetry Stat Bar using Reusable GameStatTile */}
      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-5">
        <GameStatTile
          label={isKo ? "달 주기 (생존 목표)" : "Moon Cycle"}
          value={`🌕 Moon ${state.moon}/${state.maxMoons}`}
          icon="🌙"
          highlight={true}
        />
        <GameStatTile
          label={isKo ? "식량 배급 타이머" : "Moon Progress"}
          value={`${Math.round(state.moonProgress)}%`}
          icon="⏳"
        />
        <GameStatTile
          label={isKo ? "보유 코인" : "Coins"}
          value={`🪙 ${state.coins} C`}
          icon="💰"
        />
        <GameStatTile
          label={isKo ? "마을 인구 (주민/군)" : "Population"}
          value={`👥 ${state.cards.filter((c) => c.type === "villager" || c.type === "militia").length}명`}
          icon="🌾"
        />
        <GameStatTile
          label={isKo ? "점수" : "Score"}
          value={`🏆 ${state.score}`}
          icon="✨"
        />
      </div>

      {/* Main Card Playmat */}
      <div className="mt-4 rounded-2xl border border-border bg-background/50 p-4 min-h-95">
        <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground font-semibold">
          <span>{isKo ? "작업대 (카드를 클릭하여 선택 후 다른 카드에 포개세요)" : "Playmat (Click a card to select, then click another to stack)"}</span>
          <span>{isKo ? `활성 카드: ${state.cards.length}장` : `Total Cards: ${state.cards.length}`}</span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {rootCards.map((root) => {
            const stack = getFullStack(state.cards, root.id);
            const isSelected = stack.some((c) => c.id === selectedCardId);

            return (
              <div
                key={root.id}
                className={`relative flex flex-col items-center rounded-2xl border-2 p-2 transition-all cursor-pointer select-none ${
                  isSelected ? "ring-2 ring-primary border-primary bg-primary/5" : "border-border bg-card"
                }`}
              >
                {/* Visual Stack rendering */}
                <div className="w-full space-y-1">
                  {stack.map((card, idx) => {
                    const meta = CARD_META[card.type];
                    const isCardSelected = card.id === selectedCardId;

                    return (
                      <div
                        key={card.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCardClick(card);
                        }}
                        className={`w-full rounded-xl border p-2 text-center transition-all ${
                          meta.colorClass
                        } ${isCardSelected ? "ring-2 ring-primary scale-105" : ""} ${
                          idx > 0 ? "-mt-3" : ""
                        }`}
                      >
                        <div className="text-2xl">{meta.emoji}</div>
                        <div className="mt-1 text-xs font-black truncate text-foreground">
                          {isKo ? meta.nameKo : meta.nameEn}
                        </div>
                        {card.maxHp > 1 && (
                          <div className="mt-0.5 text-xs text-muted-foreground font-semibold">
                            HP {Math.max(0, Math.ceil(card.hp))}/{card.maxHp}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Progress bar if working */}
                {root.isWorking && (
                  <div className="w-full mt-2 bg-secondary rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-primary h-full transition-all w-(--progress)"
                      style={{
                        "--progress": `${Math.min(100, (root.progressSeconds / (root.requiredSeconds || 1)) * 100)}%`,
                      } as React.CSSProperties}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Recipe Reference and Event Log */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="rounded-2xl border border-border bg-background p-3 lg:col-span-7">
          <div className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-2">
            {isKo ? "📜 주요 카드 레시피 안내" : "📜 Village Recipe Guide"}
          </div>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 text-xs">
            {VILLAGE_RECIPES.map((recipe) => (
              <div key={recipe.id} className="rounded-xl border border-border bg-card p-2">
                <div className="font-bold text-foreground">
                  {isKo ? recipe.nameKo : recipe.nameEn}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {recipe.requires.map((r) => CARD_META[r].nameKo).join(" + ")} ➔{" "}
                  {recipe.produces.map((p) => CARD_META[p].nameKo).join(", ")}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-background p-3 lg:col-span-5 flex flex-col justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-2">
              {isKo ? "📜 정착지 기록" : "📜 Village Chronicle"}
            </div>
            <ul className="space-y-1 text-xs text-foreground">
              {state.logs.map((log, idx) => (
                <li key={`${idx}-${log}`} className="truncate">
                  • {log}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Win / Loss Modal Banner */}
      {state.status !== "playing" && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary bg-primary/10 p-4">
          <div>
            <div className="text-sm font-black text-foreground">
              {state.status === "won"
                ? isKo
                  ? "🏆 번영의 달 생존 완료! 전설적인 카드 빌리지를 일구었습니다!"
                  : "🏆 Moon Cycles Survived! Your Village Prospered!"
                : isKo
                  ? "💀 모든 주민이 사망하여 정착지가 버려졌습니다."
                  : "💀 The Village Fell to Starvation or Raids."}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Score: {state.score} · Moon {state.moon}/{state.maxMoons} · Coins: {state.coins}
            </div>
          </div>
          <button
            type="button"
            onClick={handleShare}
            className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow"
          >
            {copied
              ? isKo
                ? "클립보드 복사됨!"
                : "Copied!"
              : isKo
                ? "생존 기록 공유"
                : "Share Result"}
          </button>
        </div>
      )}
    </div>
  );
}
