import { useState, useRef, useCallback, useEffect } from 'react';
import {
  MergeMansionEngine,
  type MergeItem,
  CHAIN_DEFINITIONS,
  TOTAL_CELLS,
} from '../../lib/games/merge-mansion';
import { Button } from '../ui/button';
import { Volume2, VolumeX, RotateCcw, Zap, Sparkles, CheckCircle2, ChevronRight, Lock } from 'lucide-react';
import { useCardTiltPro, MobileHapticsPro } from '../../lib/games/engine-suite-unified';

function TiltMergeCell({
  item,
  def,
  isSelected,
  isCompatible,
  onDragStart,
  onDrop,
  onClick,
}: {
  item: MergeItem | null;
  def: (typeof CHAIN_DEFINITIONS)[keyof typeof CHAIN_DEFINITIONS]['items'][number] | null;
  isSelected: boolean;
  isCompatible: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onClick: () => void;
}) {
  const { transformCss, onPointerMove, onPointerLeave, triggerPop } = useCardTiltPro();

  return (
    <div
      draggable={item !== null && !item.isCobwebbed}
      onDragStart={onDragStart}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      style={
        {
          '--card-tilt': item ? transformCss : 'none',
        } as React.CSSProperties
      }
      onPointerMove={item ? onPointerMove : undefined}
      onPointerLeave={item ? onPointerLeave : undefined}
      onClick={() => {
        if (item) triggerPop(0.15);
        onClick();
      }}
      className={`relative aspect-square rounded-xl border flex flex-col items-center justify-center cursor-pointer transition-all duration-150 will-change-transform transform-(--card-tilt) ${
        isSelected
          ? 'bg-primary/20 border-primary ring-2 ring-primary ring-offset-2 ring-offset-background scale-95 shadow-md'
          : isCompatible
          ? 'bg-warning/20 border-warning ring-2 ring-warning/60 animate-pulse'
          : item
          ? 'bg-card border-border hover:border-primary/40 hover:bg-muted/40 shadow-xs'
          : 'bg-muted/20 border-border/40 hover:bg-muted/40'
      }`}
    >
      {item && def && (
        <>
          {/* Spawner Badge */}
          {item.isSpawner && (
            <span className="absolute top-1 left-1 px-1 py-0.5 rounded bg-warning text-foreground font-black text-xs scale-75 origin-top-left shadow-xs">
              ⚡생성
            </span>
          )}

          {/* Cobweb Lock Icon */}
          {item.isCobwebbed && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-xs rounded-xl flex items-center justify-center">
              <Lock className="w-4 h-4 text-muted-foreground" />
            </div>
          )}

          {/* Item Emoji & Visual */}
          <span className={`text-2xl sm:text-3xl select-none ${item.isCobwebbed ? 'opacity-40' : ''}`}>
            {def.emoji}
          </span>

          {/* Level Pill */}
          <span className="text-xs font-bold text-muted-foreground scale-90">
            Lv.{item.tier}
          </span>
        </>
      )}
    </div>
  );
}

export default function MergeMansion() {
  const engineRef = useRef<MergeMansionEngine | null>(null);
  if (!engineRef.current) {
    engineRef.current = new MergeMansionEngine();
  }
  const engine = engineRef.current;

  const [board, setBoard] = useState<Array<MergeItem | null>>(() => [...engine.board]);
  const [energy, setEnergy] = useState(() => engine.energy);
  const [stars, setStars] = useState(() => engine.stars);
  const [completedCount, setCompletedCount] = useState(() => engine.completedQuests.length);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [message, setMessage] = useState<string>('스포너를 눌러 도구를 만들고, 같은 도구를 합쳐보세요!');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Audio synthesis
  const audioCtxRef = useRef<AudioContext | null>(null);

  const initAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  }, []);

  const playSfx = useCallback((type: 'tap' | 'merge' | 'unlock' | 'quest') => {
    if (!soundEnabled || !audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (type === 'tap') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.08);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'merge') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(780, now + 0.15);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    } else if (type === 'unlock') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(1040, now + 0.25);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'quest') {
      // Fanfare
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        const startTime = now + idx * 0.09;
        o.type = 'sine';
        o.frequency.setValueAtTime(freq, startTime);
        g.gain.setValueAtTime(0.18, startTime);
        g.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(startTime);
        o.stop(startTime + 0.3);
      });
    }
  }, [soundEnabled]);

  // Periodic Energy Regeneration (1 energy every 15s)
  useEffect(() => {
    const timer = setInterval(() => {
      engine.replenishEnergy(1);
      setEnergy(engine.energy);
    }, 15000);
    return () => clearInterval(timer);
  }, [engine]);

  const updateState = useCallback(() => {
    setBoard([...engine.board]);
    setEnergy(engine.energy);
    setStars(engine.stars);
    setCompletedCount(engine.completedQuests.length);
  }, [engine]);

  // Handle cell click
  const handleCellClick = (idx: number) => {
    initAudio();
    const item = engine.board[idx];

    // If clicking a spawner without moving another item
    if (item?.isSpawner && selectedIdx === null) {
      const res = engine.tapSpawner(idx);
      if (res.success) {
        playSfx('tap');
        MobileHapticsPro.light();
        setMessage(`생성기에서 새로운 아이템을 소환했습니다! (잔여 에너지: ${engine.energy})`);
      } else {
        MobileHapticsPro.warning();
        setMessage(res.reason || '소환할 수 없습니다.');
      }
      updateState();
      return;
    }

    // First click: select item
    if (selectedIdx === null) {
      if (item && !item.isCobwebbed) {
        setSelectedIdx(idx);
        MobileHapticsPro.light();
        const def = CHAIN_DEFINITIONS[item.chain].items[item.tier - 1];
        setMessage(`'${def.name.ko}' 선택됨. 빈 칸으로 이동하거나 같은 아이템과 합치세요.`);
      } else if (item?.isCobwebbed) {
        MobileHapticsPro.warning();
        setMessage('거미줄에 갇혀 있습니다! 동일한 레벨의 아이템을 끌어다 합치면 해제됩니다.');
      }
      return;
    }

    // Second click: move or merge
    if (selectedIdx === idx) {
      // Deselect
      MobileHapticsPro.click();
      setSelectedIdx(null);
      return;
    }

    const res = engine.moveOrMerge(selectedIdx, idx);
    if (res.action === 'merged') {
      playSfx('merge');
      MobileHapticsPro.impact();
      setMessage(`합성 성공! Lv.${res.newTier} 아이템을 제작했습니다! (+${res.starsEarned} 별)`);
    } else if (res.action === 'unlockedCobweb') {
      playSfx('unlock');
      MobileHapticsPro.success();
      setMessage(`거미줄 해제! Lv.${res.newTier} 아이템이 잠금 해제되었습니다!`);
    } else if (res.action === 'moved') {
      playSfx('tap');
      MobileHapticsPro.light();
    }

    setSelectedIdx(null);
    updateState();
  };

  // Drag and drop support
  const handleDragStart = (e: React.DragEvent, idx: number) => {
    initAudio();
    const item = engine.board[idx];
    if (!item || item.isCobwebbed) {
      e.preventDefault();
      return;
    }
    MobileHapticsPro.light();
    e.dataTransfer.setData('text/plain', idx.toString());
  };

  const handleDrop = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    const fromStr = e.dataTransfer.getData('text/plain');
    if (!fromStr) return;
    const fromIdx = parseInt(fromStr, 10);
    if (isNaN(fromIdx) || fromIdx === targetIdx) return;

    const res = engine.moveOrMerge(fromIdx, targetIdx);
    if (res.action === 'merged') {
      playSfx('merge');
      MobileHapticsPro.impact();
      setMessage(`합성 성공! Lv.${res.newTier} 아이템 제작 (+${res.starsEarned} 별)`);
    } else if (res.action === 'unlockedCobweb') {
      playSfx('unlock');
      MobileHapticsPro.success();
      setMessage(`거미줄 해제! Lv.${res.newTier} 잠금 해제!`);
    } else if (res.action === 'moved') {
      playSfx('tap');
      MobileHapticsPro.light();
    }
    updateState();
  };

  // Quest Completion
  const handleCompleteQuest = (questId: string) => {
    initAudio();
    const res = engine.completeQuest(questId);
    if (res.success) {
      playSfx('quest');
      MobileHapticsPro.success();
      setMessage('저택 구역 복원 퀘스트 완료! 별과 보너스 에너지를 획득했습니다!');
      updateState();
    } else {
      MobileHapticsPro.warning();
      setMessage(res.reason || '퀘스트를 완료할 수 없습니다.');
    }
  };

  const handleRestart = () => {
    initAudio();
    MobileHapticsPro.light();
    engine.initBoard();
    engine.energy = 50;
    engine.stars = 0;
    engine.completedQuests = [];
    engine.quests.forEach((q) => (q.completed = false));
    setSelectedIdx(null);
    setMessage('보드가 초기화되었습니다. 즐거운 합성 되세요!');
    updateState();
  };

  // Current quest list (active first, max 2 shown)
  const activeQuests = engine.quests.filter((q) => !q.completed).slice(0, 2);
  const selectedItem = selectedIdx !== null ? board[selectedIdx] : null;
  const progressPct = Math.round((completedCount / engine.quests.length) * 100);

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-4 p-2 sm:p-4 bg-card rounded-2xl border border-border shadow-xl select-none">
      {/* Top Header: Energy & Stars & Mansion Renovation Progress */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl bg-muted/40 border border-border">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          {/* Energy */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card border border-border shadow-sm">
            <Zap className="w-4 h-4 text-warning fill-current" />
            <span className="text-xs text-muted-foreground">에너지</span>
            <span className="text-sm font-black text-foreground font-mono">
              {energy}/{engine.maxEnergy}
            </span>
          </div>

          {/* Stars */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card border border-border shadow-sm">
            <Sparkles className="w-4 h-4 text-warning" />
            <span className="text-xs text-muted-foreground">복원 별</span>
            <span className="text-sm font-black text-primary font-mono">{stars}</span>
          </div>

          {/* Sound Toggle */}
          <button
            type="button"
            className="p-2 rounded-xl bg-card border border-border text-foreground hover:bg-muted ml-auto sm:ml-0"
            onClick={() => setSoundEnabled(!soundEnabled)}
            aria-label="음소거 토글"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-muted-foreground" />}
          </button>
        </div>

        {/* Renovation Progress */}
        <div className="flex items-center gap-3 w-full sm:w-64">
          <div className="flex flex-col w-full gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">대저택 복구율</span>
              <span className="font-bold text-primary">{progressPct}%</span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300 w-(--progress-pct)"
                style={{ '--progress-pct': `${progressPct}%` } as React.CSSProperties}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mansion Quests Drawer */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs px-1 text-muted-foreground">
          <span className="font-semibold text-foreground flex items-center gap-1.5">
            🏡 대저택 복원 의뢰 ({completedCount}/{engine.quests.length} 완료)
          </span>
          <span>아이템을 합쳐 의뢰를 완수하세요</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {activeQuests.map((quest) => {
            // Check if player has all required items
            const canComplete = quest.requiredItems.every((req) => {
              return board.some((it) => it !== null && !it.isCobwebbed && it.chain === req.chain && it.tier === req.tier);
            });

            return (
              <div
                key={quest.id}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                  canComplete
                    ? 'bg-primary/10 border-primary shadow-sm'
                    : 'bg-card border-border'
                }`}
              >
                <div className="flex flex-col gap-1 min-w-0 pr-2">
                  <span className="text-xs text-muted-foreground truncate">{quest.area}</span>
                  <span className="text-sm font-bold text-foreground truncate">{quest.titleKey}</span>
                  <div className="flex items-center gap-2 mt-1">
                    {quest.requiredItems.map((req, idx) => {
                      const itemDef = CHAIN_DEFINITIONS[req.chain].items[req.tier - 1];
                      const hasItem = board.some(
                        (it) => it !== null && !it.isCobwebbed && it.chain === req.chain && it.tier === req.tier,
                      );
                      return (
                        <div
                          key={idx}
                          className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-xs border ${
                            hasItem
                              ? 'bg-card border-primary/50 text-foreground'
                              : 'bg-muted/60 border-border text-muted-foreground opacity-75'
                          }`}
                        >
                          <span>{itemDef.emoji}</span>
                          <span>Lv.{req.tier}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <Button
                  size="sm"
                  variant={canComplete ? 'default' : 'outline'}
                  disabled={!canComplete}
                  onClick={() => handleCompleteQuest(quest.id)}
                >
                  <CheckCircle2 />
                  복원 (+{quest.starsReward}⭐)
                </Button>
              </div>
            );
          })}
          {activeQuests.length === 0 && (
            <div className="col-span-full p-4 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center gap-2 text-primary font-bold text-sm">
              <Sparkles className="w-5 h-5" /> 모든 저택 구역이 완벽히 복원되었습니다! 축하합니다!
            </div>
          )}
        </div>
      </div>

      {/* Guide Banner */}
      <div className="px-3 py-2 rounded-xl bg-muted/50 border border-border text-xs text-muted-foreground flex items-center justify-between">
        <span className="truncate">{message}</span>
        {selectedItem && (
          <span className="font-semibold text-primary ml-2 shrink-0">
            {CHAIN_DEFINITIONS[selectedItem.chain].items[selectedItem.tier - 1].name.ko} (Lv.{selectedItem.tier})
          </span>
        )}
      </div>

      {/* 7x9 Merge Grid Board */}
      <div className="grid grid-cols-7 gap-1.5 p-2 sm:p-3 rounded-2xl bg-muted/20 border border-border">
        {Array.from({ length: TOTAL_CELLS }).map((_, idx) => {
          const item = board[idx];
          const isSelected = selectedIdx === idx;
          const isCompatible =
            selectedItem &&
            item &&
            selectedIdx !== idx &&
            selectedItem.chain === item.chain &&
            selectedItem.tier === item.tier &&
            item.tier < CHAIN_DEFINITIONS[item.chain].maxTier;

          const def = item ? CHAIN_DEFINITIONS[item.chain].items[item.tier - 1] : null;

          return (
            <TiltMergeCell
              key={idx}
              item={item}
              def={def}
              isSelected={isSelected}
              isCompatible={Boolean(isCompatible)}
              onDragStart={(e) => handleDragStart(e, idx)}
              onDrop={(e) => handleDrop(e, idx)}
              onClick={() => handleCellClick(idx)}
            />
          );
        })}
      </div>

      {/* Footer Info & Controls */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>도움말: 동일 레벨 아이템을 드래그하거나 순서대로 클릭하면 다음 레벨로 합성됩니다.</span>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRestart}
        >
          <RotateCcw />
          보드 재설정
        </Button>
      </div>
    </div>
  );
}
