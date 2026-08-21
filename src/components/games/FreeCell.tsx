import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GameContainer, PlayingCard } from '../ui/game/GamePrimitives';
import { getRecord, recordResult, type GameRecord } from '../../lib/games/records';
import {
  FREECELL_SUITS,
  createSeededFreeCellGame,
  getSourceCards,
  isDescendingAlternatingRun,
  isFreeCellWon,
  moveFreeCellCards,
  type FreeCellCard,
  type FreeCellDestination,
  type FreeCellMoveResult,
  type FreeCellSource,
} from '../../lib/games/freecell';
import { clearFreeCellSaveV2, loadFreeCellSaveV2, storeFreeCellSaveV2 } from '../../lib/games/freecell-save';

const COPY = {
  ko: {
    title: '프리셀 (FreeCell)', desc: '색을 번갈아 내림차순으로 쌓고, 네 무늬를 A부터 K까지 완성하세요.', reset: '다시 시작', win: '모든 무늬를 완성했습니다!', record: '전적',
    instructions: '카드 또는 정렬된 묶음을 선택한 뒤 목적지를 선택하세요. 빈 셀 하나에는 카드 한 장만 둘 수 있습니다.', selected: (count: number) => `${count}장 선택됨. 목적지를 선택하세요.`, moved: '합법적인 이동을 완료했습니다.', invalid: '그곳으로 이동할 수 없습니다. 색·숫자 순서와 빈 공간 수를 확인하세요.', emptyCell: (index: number) => `빈 프리셀 ${index}`, emptyColumn: (index: number) => `빈 열 ${index}`, foundation: (suit: string) => `${suit} 기초 더미`, restart: '새 게임', freeArea: '프리셀', foundationArea: '기초 더미', tableauArea: '게임 열', suits: ['하트', '다이아몬드', '클럽', '스페이드'],
    sound: '소리', moves: '이동', time: '시간', untimed: '이전 버전에서 이어진 판이라 시간 기록은 남지 않습니다.',
  },
  en: {
    title: 'FreeCell', desc: 'Build downward in alternating colors and complete each suit from Ace to King.', reset: 'Restart', win: 'All four suits are complete!', record: 'Record',
    instructions: 'Choose a card or ordered run, then choose its destination. Each free cell holds one card.', selected: (count: number) => `${count} card${count === 1 ? '' : 's'} selected. Choose a destination.`, moved: 'Legal move completed.', invalid: 'That move is not legal. Check color, rank, and available empty spaces.', emptyCell: (index: number) => `Empty free cell ${index}`, emptyColumn: (index: number) => `Empty column ${index}`, foundation: (suit: string) => `${suit} foundation`, restart: 'New game', freeArea: 'Free cells', foundationArea: 'Foundations', tableauArea: 'Tableau', suits: ['Hearts', 'Diamonds', 'Clubs', 'Spades'],
    sound: 'Sound', moves: 'Moves', time: 'Time', untimed: 'This game continued from an older version, so no time record is kept.',
  },
  ja: {
    title: 'フリーセル', desc: '色を交互に数字の降順で並べ、4つのスートをAからKまで完成させます。', reset: 'リスタート', win: '4つのスートが完成しました！', record: '戦績',
    instructions: 'カードまたは整列した列を選び、移動先を選択してください。各フリーセルには1枚だけ置けます。', selected: (count: number) => `${count}枚を選択中。移動先を選んでください。`, moved: '有効な移動が完了しました。', invalid: 'そこには移動できません。色・数字・空きスペースを確認してください。', emptyCell: (index: number) => `空のフリーセル ${index}`, emptyColumn: (index: number) => `空の列 ${index}`, foundation: (suit: string) => `${suit}の組札`, restart: '新しいゲーム', freeArea: 'フリーセル', foundationArea: '組札', tableauArea: '場札', suits: ['ハート', 'ダイヤ', 'クラブ', 'スペード'],
    sound: '音', moves: '手数', time: '時間', untimed: '旧バージョンから続いた盤面のため、時間記録は残りません。',
  },
  zh: {
    title: '空当接龙', desc: '按红黑交替降序排列，并将四种花色从A叠到K。', reset: '重新开始', win: '四种花色全部完成！', record: '战绩',
    instructions: '先选择一张牌或有效牌组，再选择目的地。每个空位只能放一张牌。', selected: (count: number) => `已选择 ${count} 张牌，请选择目的地。`, moved: '已完成合法移动。', invalid: '不能移动到那里。请检查颜色、点数和可用空位。', emptyCell: (index: number) => `空的自由单元 ${index}`, emptyColumn: (index: number) => `空列 ${index}`, foundation: (suit: string) => `${suit}基础牌堆`, restart: '新游戏', freeArea: '自由单元', foundationArea: '基础牌堆', tableauArea: '游戏牌列', suits: ['红桃', '方块', '梅花', '黑桃'],
    sound: '声音', moves: '步数', time: '时间', untimed: '此局从旧版本延续，因此不保留时间记录。',
  },
  fr: {
    title: 'FreeCell', desc: 'Empilez en ordre décroissant en alternant les couleurs, puis complétez chaque couleur de l’As au Roi.', reset: 'Recommencer', win: 'Les quatre couleurs sont complètes !', record: 'Bilan',
    instructions: 'Choisissez une carte ou une suite valide, puis sa destination. Chaque cellule libre contient une seule carte.', selected: (count: number) => `${count} carte${count > 1 ? 's' : ''} sélectionnée${count > 1 ? 's' : ''}. Choisissez une destination.`, moved: 'Déplacement valide effectué.', invalid: 'Ce déplacement est impossible. Vérifiez la couleur, le rang et les espaces libres.', emptyCell: (index: number) => `Cellule libre vide ${index}`, emptyColumn: (index: number) => `Colonne vide ${index}`, foundation: (suit: string) => `Fondation ${suit}`, restart: 'Nouvelle partie', freeArea: 'Cellules libres', foundationArea: 'Fondations', tableauArea: 'Tableau', suits: ['Cœurs', 'Carreaux', 'Trèfles', 'Piques'],
    sound: 'Son', moves: 'Coups', time: 'Temps', untimed: 'Partie reprise d’une ancienne version : aucun temps n’est enregistré.',
  },
  es: {
    title: 'FreeCell', desc: 'Ordena en descenso alternando colores y completa cada palo del As al Rey.', reset: 'Reiniciar', win: '¡Los cuatro palos están completos!', record: 'Historial',
    instructions: 'Elige una carta o secuencia válida y después su destino. Cada celda libre admite una sola carta.', selected: (count: number) => `${count} carta${count === 1 ? '' : 's'} seleccionada${count === 1 ? '' : 's'}. Elige un destino.`, moved: 'Movimiento válido completado.', invalid: 'Ese movimiento no es válido. Comprueba el color, el rango y los espacios libres.', emptyCell: (index: number) => `Celda libre vacía ${index}`, emptyColumn: (index: number) => `Columna vacía ${index}`, foundation: (suit: string) => `Base de ${suit}`, restart: 'Nueva partida', freeArea: 'Celdas libres', foundationArea: 'Bases', tableauArea: 'Tablero', suits: ['Corazones', 'Diamantes', 'Tréboles', 'Picas'],
    sound: 'Sonido', moves: 'Jugadas', time: 'Tiempo', untimed: 'Esta partida continuó de una versión anterior, así que no se guarda el tiempo.',
  },
} as const;

const REASON:Record<keyof typeof COPY,Record<Extract<FreeCellMoveResult,{ok:false}>['reason'],string>>={
 ko:{'empty-source':'옮길 카드가 없습니다.','invalid-run':'묶음은 색을 번갈아 한 단계씩 내려가야 합니다.','occupied-cell':'그 프리셀은 이미 차 있습니다.','wrong-foundation':'같은 무늬를 A부터 차례대로 올려야 합니다.','blocked-tableau':'목적지보다 한 단계 낮고 색이 다른 카드만 놓을 수 있습니다.','supermove-limit':'빈 프리셀과 빈 열이 부족해 이 묶음을 한 번에 옮길 수 없습니다.','same-pile':'같은 위치로는 옮길 수 없습니다.'},
 en:{'empty-source':'There is no card to move.','invalid-run':'The run must descend by one in alternating colors.','occupied-cell':'That free cell is already occupied.','wrong-foundation':'Build the matching suit from Ace upward.','blocked-tableau':'Place it on the next higher rank of the opposite color.','supermove-limit':'There are not enough empty cells and columns to move this run.','same-pile':'It is already in that position.'},
 ja:{'empty-source':'移動するカードがありません。','invalid-run':'列は色を交互に1つずつ降順にします。','occupied-cell':'そのフリーセルは使用中です。','wrong-foundation':'同じスートをAから順に置きます。','blocked-tableau':'色が異なる1つ上の数字の上に置きます。','supermove-limit':'空きセルと空き列が足りず、この列をまとめて移動できません。','same-pile':'同じ場所には移動できません。'},
 zh:{'empty-source':'没有可移动的牌。','invalid-run':'牌组必须红黑交替并逐级递减。','occupied-cell':'该自由单元已被占用。','wrong-foundation':'同花色必须从A开始依次放置。','blocked-tableau':'只能放在异色且大一级的牌上。','supermove-limit':'空单元和空列不足，无法一次移动这组牌。','same-pile':'不能移到原位置。'},
 fr:{'empty-source':'Aucune carte à déplacer.','invalid-run':'La suite doit descendre en alternant les couleurs.','occupied-cell':'Cette cellule libre est occupée.','wrong-foundation':'Construisez la même couleur à partir de l’as.','blocked-tableau':'Placez-la sous la valeur supérieure de couleur opposée.','supermove-limit':'Pas assez de cellules et colonnes vides pour cette suite.','same-pile':'La carte est déjà à cet endroit.'},
 es:{'empty-source':'No hay carta para mover.','invalid-run':'La secuencia debe bajar alternando colores.','occupied-cell':'Esa celda libre está ocupada.','wrong-foundation':'Construye el mismo palo desde el as.','blocked-tableau':'Colócala bajo el rango superior de color opuesto.','supermove-limit':'No hay suficientes celdas y columnas vacías para mover la secuencia.','same-pile':'Ya está en esa posición.'},
};
const RETRY:Record<keyof typeof COPY,{same:string;fresh:string}>={ko:{same:'같은 판 재도전',fresh:'새 판'},en:{same:'Retry same deal',fresh:'New deal'},ja:{same:'同じ配りで再挑戦',fresh:'新しい配り'},zh:{same:'重试同一牌局',fresh:'新牌局'},fr:{same:'Rejouer la même donne',fresh:'Nouvelle donne'},es:{same:'Reintentar reparto',fresh:'Nuevo reparto'}};
const freshSeed=()=>typeof crypto!=='undefined'&&crypto.getRandomValues?crypto.getRandomValues(new Uint32Array(1))[0]:Date.now()>>>0;

function fmt(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

const SUIT_SYMBOLS = ['♥', '♦', '♣', '♠'];

const FreeCell: React.FC<{ locale?: string }> = ({ locale = 'ko' }) => {
  const t = COPY[locale as keyof typeof COPY] ?? COPY.en;
  const reasonCopy=REASON[locale as keyof typeof COPY]??REASON.en;
  const retryCopy=RETRY[locale as keyof typeof COPY]??RETRY.en;
  const [restored] = useState(loadFreeCellSaveV2);
  const initialSeed=useRef<number|null>(restored?null:freshSeed()).current;
  const [game, setGame] = useState(() => restored?.state ?? createSeededFreeCellGame(initialSeed!));
  const [selected, setSelected] = useState<FreeCellSource | null>(null);
  const [status, setStatus] = useState<string>(t.instructions);
  const [record, setRecord] = useState<GameRecord | null>(() => getRecord('freecell'));
  const [moves, setMoves] = useState(restored?.moves ?? 0);
  const [seconds, setSeconds] = useState(restored?.elapsedSeconds ?? 0);
  const [legacyMigrated, setLegacyMigrated] = useState(restored?.legacyMigrated ?? false);
  const [muted, setMuted] = useState(false);
  const seedRef=useRef<number|null>(initialSeed);
  const moveMadeRef = useRef(Boolean(restored));
  const wonRef = useRef(false);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const winDialogRef = useRef<HTMLDivElement | null>(null);
  const startedAt = useRef<number>(performance.now() - (restored?.elapsedSeconds ?? 0) * 1000);
  const audioRef = useRef<AudioContext | null>(null);

  const tone = useCallback((frequency: number, duration = 0.05) => {
    if (muted || typeof window === 'undefined') return;
    const context = audioRef.current ?? new AudioContext();
    audioRef.current = context;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.05, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
  }, [muted]);
  useEffect(() => () => { void audioRef.current?.close(); }, []);

  useEffect(() => { setStatus(t.instructions); }, [t]);
  useEffect(() => {
    if (moveMadeRef.current && !isFreeCellWon(game)) {
      storeFreeCellSaveV2({ state: game, moves, elapsedSeconds: seconds, legacyMigrated, savedAtEpochMs: Date.now() });
    }
  }, [game, moves, seconds, legacyMigrated]);

  const isWon = isFreeCellWon(game);
  useEffect(() => {
    if (isWon || legacyMigrated) return;
    const id = setInterval(() => {
      setSeconds(Math.max(0, Math.floor((performance.now() - startedAt.current) / 1000)));
    }, 250);
    return () => clearInterval(id);
  }, [isWon, legacyMigrated]);

  const initGame = useCallback((seedOverride?:number) => {
    if (moveMadeRef.current && !wonRef.current) setRecord(recordResult('freecell', 'l'));
    moveMadeRef.current = false;
    wonRef.current = false;
    clearFreeCellSaveV2();
    const seed=seedOverride??freshSeed();seedRef.current=seed;
    setGame(createSeededFreeCellGame(seed));
    setSelected(null);
    setStatus(t.instructions);
    setMoves(0);
    setSeconds(0);
    setLegacyMigrated(false);
    startedAt.current = performance.now();
  }, [t.instructions]);

  useEffect(() => {
    if (isWon && !wonRef.current) {
      wonRef.current = true;
      clearFreeCellSaveV2();
      setRecord(recordResult('freecell', 'w'));
      tone(660, 0.18);
    }
  }, [isWon, tone]);
  useEffect(() => {
    if (isWon) winDialogRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
  }, [isWon]);

  const chooseSource = (source: FreeCellSource) => {
    const cards = getSourceCards(game, source);
    if (!cards.length || (source.type === 'tableau' && !isDescendingAlternatingRun(cards))) {
      setStatus(t.invalid);
      tone(150, 0.06);
      return;
    }
    setSelected(source);
    setStatus(t.selected(cards.length));
  };

  const tryDestination = (destination: FreeCellDestination): boolean => {
    if (!selected) return false;
    const result = moveFreeCellCards(game, selected, destination);
    if (!result.ok) {
      setStatus(reasonCopy[result.reason]);
      tone(150, 0.06);
      return false;
    }
    if (!moveMadeRef.current) startedAt.current = performance.now();
    moveMadeRef.current = true;
    setGame(result.state);
    setSelected(null);
    setMoves((count) => count + 1);
    setStatus(t.moved);
    tone(300, 0.05);
    return true;
  };

  const activateOccupied = (source: FreeCellSource, destination: FreeCellDestination) => {
    if (selected && tryDestination(destination)) return;
    chooseSource(source);
  };

  const cardLabel = (card: FreeCellCard) => `${card.value} ${t.suits[FREECELL_SUITS.indexOf(card.suit)]}`;
  const isSelected = (source: FreeCellSource) => selected?.type === source.type && selected.index === source.index
    && (source.type !== 'tableau' || (selected.type === 'tableau' && selected.cardIndex === source.cardIndex));
  const keyActivate = (event: React.KeyboardEvent, action: () => void) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
  };
  const closeWin = (same=false) => {
    initGame(same&&seedRef.current!==null?seedRef.current:undefined);
    requestAnimationFrame(() => lastFocusedRef.current?.focus());
  };
  const trapWinFocus = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') { event.preventDefault(); closeWin(); }
  };

  return (
    <GameContainer title={t.title} subtitle={t.desc} resetLabel={t.reset} onReset={() => initGame()}>
      <div className="space-y-5" onFocusCapture={(event) => { lastFocusedRef.current = event.target instanceof HTMLElement ? event.target : null; }}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">{t.instructions}</p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setMuted((value) => !value)} aria-pressed={muted} className="min-h-11 rounded-lg border border-border px-3 text-xs font-bold text-muted-foreground">
              {muted ? '🔇' : '🔊'} {t.sound}
            </button>
            {record && record.w + record.l > 0 && (
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t.record} {record.w}–{record.l}</p>
            )}
          </div>
        </div>
        {legacyMigrated && <p className="text-[11px] font-medium text-muted-foreground">{t.untimed}</p>}
        <p className="min-h-6 text-sm font-semibold text-primary" aria-live="polite">{status}</p>

        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-[600px] justify-between gap-6">
            <div className="flex gap-2" aria-label={t.freeArea}>
              {game.freeCells.map((card, index) => {
                const action = card
                  ? () => activateOccupied({ type: 'free', index }, { type: 'free', index })
                  : () => { if (!tryDestination({ type: 'free', index })) setStatus(selected ? t.invalid : t.instructions); };
                return (
                  <div key={index} className="relative h-24 w-16 sm:h-28 sm:w-18">
                    {card ? (
                      <div role="button" tabIndex={0} aria-pressed={isSelected({ type: 'free', index })} aria-label={cardLabel(card)} onClick={action} onKeyDown={(event) => keyActivate(event, action)} className={`rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${isSelected({ type: 'free', index }) ? 'ring-4 ring-primary' : ''}`}>
                        <PlayingCard suit={card.suit} value={card.value} className="pointer-events-none !h-24 !w-16 sm:!h-28 sm:!w-18 motion-reduce:transition-none" />
                      </div>
                    ) : (
                      <button type="button" onClick={action} aria-label={t.emptyCell(index + 1)} className="h-full w-full rounded-xl border-2 border-dashed border-border bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2" aria-label={t.foundationArea}>
              {game.foundation.map((pile, index) => {
                const card = pile[pile.length - 1];
                const action = card
                  ? () => activateOccupied({ type: 'foundation', index }, { type: 'foundation', index })
                  : () => { if (!tryDestination({ type: 'foundation', index })) setStatus(selected ? t.invalid : t.instructions); };
                return (
                  <div key={index} className="relative flex h-24 w-16 items-center justify-center rounded-xl border-2 border-dashed border-border sm:h-28 sm:w-18">
                    <span aria-hidden="true" className={`absolute text-3xl opacity-20 ${index < 2 ? 'text-destructive' : 'text-foreground'}`}>{SUIT_SYMBOLS[index]}</span>
                    {card ? (
                      <div role="button" tabIndex={0} aria-pressed={isSelected({ type: 'foundation', index })} aria-label={cardLabel(card)} onClick={action} onKeyDown={(event) => keyActivate(event, action)} className={`absolute inset-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${isSelected({ type: 'foundation', index }) ? 'ring-4 ring-primary' : ''}`}>
                        <PlayingCard suit={card.suit} value={card.value} className="pointer-events-none !h-24 !w-16 sm:!h-28 sm:!w-18 motion-reduce:transition-none" />
                      </div>
                    ) : (
                      <button type="button" onClick={action} aria-label={t.foundation(t.suits[index])} className="absolute inset-0 min-h-11 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto pb-3">
          <div className="grid min-h-[430px] min-w-[600px] grid-cols-8 gap-2" aria-label={t.tableauArea}>
            {game.tableau.map((pile, pileIndex) => (
              <div key={pileIndex} className="relative flex min-w-16 flex-col">
                {pile.length === 0 && (
                  <button type="button" onClick={() => { if (!tryDestination({ type: 'tableau', index: pileIndex })) setStatus(selected ? t.invalid : t.instructions); }} aria-label={t.emptyColumn(pileIndex + 1)} className="h-24 min-h-11 w-16 rounded-xl border-2 border-dashed border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:h-28 sm:w-18" />
                )}
                {pile.map((card, cardIndex) => {
                  const source: FreeCellSource = { type: 'tableau', index: pileIndex, cardIndex };
                  const action = () => activateOccupied(source, { type: 'tableau', index: pileIndex });
                  return (
                    <div key={card.id} role="button" tabIndex={0} aria-pressed={isSelected(source)} aria-label={cardLabel(card)} onClick={action} onKeyDown={(event) => keyActivate(event, action)} style={{ marginTop: cardIndex === 0 ? 0 : -62 }} className={`relative rounded-xl focus-visible:z-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${isSelected(source) ? 'z-20 ring-4 ring-primary' : 'z-10'}`}>
                      <PlayingCard suit={card.suit} value={card.value} className="pointer-events-none !h-24 !w-16 shadow-md sm:!h-28 sm:!w-18 motion-reduce:transition-none" />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {isWon && (
        <div ref={winDialogRef} onKeyDown={trapWinFocus} className="fixed inset-0 z-30 flex flex-col items-center justify-center bg-background/90 p-6 text-center backdrop-blur-xl motion-reduce:animate-none" role="dialog" aria-modal="true" aria-labelledby="freecell-win-title">
          <h4 id="freecell-win-title" className="mb-2 text-4xl font-black text-primary">{t.win}</h4>
          <p className="mb-6 text-sm font-bold text-muted-foreground">
            {legacyMigrated ? `${t.moves} ${moves}` : `${t.time} ${fmt(seconds)} · ${t.moves} ${moves}`}
          </p>
          <div className="flex flex-wrap justify-center gap-2"><button type="button" onClick={() => closeWin(true)} disabled={seedRef.current===null} className="min-h-11 rounded-full border border-primary px-6 py-3 font-black text-primary disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{retryCopy.same}</button><button type="button" onClick={() => closeWin(false)} className="min-h-11 rounded-full bg-primary px-8 py-3 font-black text-primary-foreground shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">{retryCopy.fresh}</button></div>
        </div>
      )}
    </GameContainer>
  );
};

export default FreeCell;
