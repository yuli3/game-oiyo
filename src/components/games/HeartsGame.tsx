import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GameContainer, PlayingCard } from "../ui/game/GamePrimitives";
import {
  chooseHeartsCpuCard,
  chooseHeartsPassCards,
  clearHeartsSavedGame,
  createHeartsGame,
  legalHeartsCards,
  loadHeartsSavedGame,
  passHeartsCards,
  playHeartsCard,
  saveHeartsGame,
  startNextHeartsRound,
  type HeartsAiLevel,
  type HeartsCard,
  type HeartsPassDirection,
  type HeartsState,
} from "../../lib/games/hearts";

type Locale = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY = {
  ko: { title: "하트 (Hearts)", subtitle: "나 대 컴퓨터 3명", desc: "하트와 스페이드 퀸을 피하세요. 세 장 전달은 좌·우·맞은편·보류 순환이며, 누적 100점에 도달하면 최저점이 승리합니다.", localSave: "경기 상태는 이 브라우저에만 자동 저장됩니다.", you: "나", cpu: "컴퓨터", score: "누적 벌점", roundScore: "이번 라운드", reset: "새 경기", turn: "차례", round: "라운드", trick: "트릭", broken: "하트 공개", notBroken: "하트 미공개", choose: "밝게 표시된 합법적인 카드를 선택하세요.", cpuThinking: "컴퓨터가 카드를 고르고 있습니다…", table: "현재 트릭", previous: "직전 트릭", empty: "카드를 기다리는 중", cardsLeft: "내 손패", roundWinner: "라운드 최저점", gameWinner: "경기 승자", moon: "달 쏘기! 26점을 모두 모았습니다.", card: "카드", selectPass: "전달할 카드 3장을 고르세요", confirmPass: "3장 전달", nextRound: "다음 라운드", passTo: "전달 방향", directions: { left: "왼쪽", right: "오른쪽", across: "맞은편", hold: "보류" }, suits: { clubs: "클럽", diamonds: "다이아몬드", spades: "스페이드", hearts: "하트" }, level1: "견습생", level2: "숙련가", level3: "명인", difficulty: "난이도", sound: "소리", pause: "일시정지", resume: "계속", paused: "경기 일시정지" },
  en: { title: "Hearts Card Game", subtitle: "You vs 3 computers", desc: "Avoid hearts and the Queen of Spades. Pass three cards left, right, across, then hold; the lowest score wins when anyone reaches 100.", localSave: "Game state is saved automatically in this browser only.", you: "You", cpu: "Computer", score: "Total penalty", roundScore: "This round", reset: "New game", turn: "Turn", round: "Round", trick: "Trick", broken: "Hearts broken", notBroken: "Hearts unbroken", choose: "Choose one of the highlighted legal cards.", cpuThinking: "Computer is choosing a card…", table: "Current trick", previous: "Previous trick", empty: "Waiting for a card", cardsLeft: "Your hand", roundWinner: "Round low score", gameWinner: "Game winner", moon: "Shoot the moon! All 26 points captured.", card: "card", selectPass: "Select three cards to pass", confirmPass: "Pass 3 cards", nextRound: "Next round", passTo: "Pass direction", directions: { left: "left", right: "right", across: "across", hold: "hold" }, suits: { clubs: "Clubs", diamonds: "Diamonds", spades: "Spades", hearts: "Hearts" }, level1: "Apprentice", level2: "Adept", level3: "Master", difficulty: "Difficulty", sound: "Sound", pause: "Pause", resume: "Resume", paused: "Match paused" },
  ja: { title: "ハーツ", subtitle: "あなた対CPU 3人", desc: "ハートとスペードのQを避けます。3枚のパスは左・右・向かい・保留の順で、誰かが100点に達した時の最少点が勝者です。", localSave: "ゲーム状態はこのブラウザだけに自動保存されます。", you: "あなた", cpu: "CPU", score: "累計罰点", roundScore: "今回", reset: "新しいゲーム", turn: "手番", round: "ラウンド", trick: "トリック", broken: "ハート解禁", notBroken: "ハート未解禁", choose: "明るく表示された有効なカードを選んでください。", cpuThinking: "CPUがカードを選んでいます…", table: "現在のトリック", previous: "直前のトリック", empty: "カード待ち", cardsLeft: "手札", roundWinner: "ラウンド最少点", gameWinner: "ゲーム勝者", moon: "シュート・ザ・ムーン！26点をすべて獲得。", card: "カード", selectPass: "渡すカードを3枚選択", confirmPass: "3枚を渡す", nextRound: "次のラウンド", passTo: "パス方向", directions: { left: "左", right: "右", across: "向かい", hold: "保留" }, suits: { clubs: "クラブ", diamonds: "ダイヤ", spades: "スペード", hearts: "ハート" }, level1: "見習い", level2: "熟練者", level3: "名人", difficulty: "難易度", sound: "音", pause: "一時停止", resume: "再開", paused: "対局を一時停止" },
  zh: { title: "红心大战", subtitle: "你对战3台电脑", desc: "避开红心和黑桃皇后。传牌按左、右、对面、保留循环；有人达到100分时，最低分获胜。", localSave: "游戏状态只会自动保存在此浏览器中。", you: "你", cpu: "电脑", score: "累计罚分", roundScore: "本轮", reset: "新游戏", turn: "回合", round: "轮", trick: "墩", broken: "红心已破", notBroken: "红心未破", choose: "请选择高亮显示的合法牌。", cpuThinking: "电脑正在选择牌…", table: "当前一墩", previous: "上一墩", empty: "等待出牌", cardsLeft: "你的手牌", roundWinner: "本轮最低分", gameWinner: "比赛胜者", moon: "全收红心！收齐了全部26分。", card: "牌", selectPass: "选择三张要传的牌", confirmPass: "传出3张", nextRound: "下一轮", passTo: "传牌方向", directions: { left: "左边", right: "右边", across: "对面", hold: "保留" }, suits: { clubs: "梅花", diamonds: "方块", spades: "黑桃", hearts: "红心" }, level1: "学徒", level2: "行家", level3: "大师", difficulty: "难度", sound: "声音", pause: "暂停", resume: "继续", paused: "对局已暂停" },
  fr: { title: "La Dame de pique", subtitle: "Vous contre 3 ordinateurs", desc: "Évitez les cœurs et la dame de pique. Passez trois cartes à gauche, à droite, en face, puis gardez-les ; le plus petit score gagne à 100.", localSave: "La partie est enregistrée automatiquement dans ce navigateur uniquement.", you: "Vous", cpu: "Ordinateur", score: "Pénalité totale", roundScore: "Cette manche", reset: "Nouvelle partie", turn: "Tour", round: "Manche", trick: "Pli", broken: "Cœurs ouverts", notBroken: "Cœurs fermés", choose: "Choisissez une carte autorisée mise en évidence.", cpuThinking: "L’ordinateur choisit une carte…", table: "Pli en cours", previous: "Pli précédent", empty: "En attente d’une carte", cardsLeft: "Votre main", roundWinner: "Minimum de la manche", gameWinner: "Vainqueur", moon: "Grand chelem ! Les 26 points ont été ramassés.", card: "carte", selectPass: "Sélectionnez trois cartes à passer", confirmPass: "Passer 3 cartes", nextRound: "Manche suivante", passTo: "Direction", directions: { left: "gauche", right: "droite", across: "en face", hold: "garder" }, suits: { clubs: "Trèfle", diamonds: "Carreau", spades: "Pique", hearts: "Cœur" }, level1: "Apprenti", level2: "Adepte", level3: "Maître", difficulty: "Difficulté", sound: "Son", pause: "Pause", resume: "Reprendre", paused: "Partie en pause" },
  es: { title: "Corazones", subtitle: "Tú contra 3 computadoras", desc: "Evita corazones y la reina de picas. Pasa tres cartas a izquierda, derecha, enfrente y luego conserva; gana la puntuación más baja al llegar alguien a 100.", localSave: "La partida se guarda automáticamente solo en este navegador.", you: "Tú", cpu: "Computadora", score: "Penalización total", roundScore: "Esta ronda", reset: "Partida nueva", turn: "Turno", round: "Ronda", trick: "Baza", broken: "Corazones abiertos", notBroken: "Corazones cerrados", choose: "Elige una de las cartas legales resaltadas.", cpuThinking: "La computadora está eligiendo una carta…", table: "Baza actual", previous: "Baza anterior", empty: "Esperando una carta", cardsLeft: "Tu mano", roundWinner: "Menor de la ronda", gameWinner: "Ganador", moon: "¡Disparo a la luna! Se llevaron los 26 puntos.", card: "carta", selectPass: "Elige tres cartas para pasar", confirmPass: "Pasar 3 cartas", nextRound: "Ronda siguiente", passTo: "Dirección", directions: { left: "izquierda", right: "derecha", across: "enfrente", hold: "conservar" }, suits: { clubs: "Tréboles", diamonds: "Diamantes", spades: "Picas", hearts: "Corazones" }, level1: "Aprendiz", level2: "Adepto", level3: "Maestro", difficulty: "Dificultad", sound: "Sonido", pause: "Pausa", resume: "Continuar", paused: "Partida en pausa" },
} satisfies Record<Locale, Record<string, unknown>>;

function playerName(player: number, t: (typeof COPY)[Locale]): string { return player === 0 ? t.you : `${t.cpu} ${player}`; }

const HeartsGame: React.FC<{ locale?: string }> = ({ locale = "ko" }) => {
  const t = COPY[(locale in COPY ? locale : "en") as Locale];
  const [game, setGame] = useState<HeartsState>(() => createHeartsGame());
  const [passSelection, setPassSelection] = useState<string[]>([]);
  const [persistenceReady, setPersistenceReady] = useState(false);
  const [level, setLevel] = useState<HeartsAiLevel>(3);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const audioRef = useRef<AudioContext | null>(null);

  const tone = useCallback((frequency: number, duration = 0.05) => {
    if (muted || typeof window === "undefined") return;
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

  const reset = useCallback(() => {
    if (typeof window !== "undefined") clearHeartsSavedGame(window.localStorage);
    setGame(createHeartsGame());
    setPassSelection([]);
    setPaused(false);
  }, []);

  useEffect(() => {
    const restored = loadHeartsSavedGame(window.localStorage);
    if (restored) {
      setGame(restored.state);
      setPassSelection(restored.passSelection);
      setLevel(restored.level ?? 3);
    }
    setPersistenceReady(true);
  }, []);

  useEffect(() => {
    if (!persistenceReady) return;
    if (game.phase === "gameOver") clearHeartsSavedGame(window.localStorage);
    else saveHeartsGame(window.localStorage, { state: game, passSelection, level });
  }, [game, passSelection, level, persistenceReady]);

  // Pause on hidden tab: stop the CPU's pending timer rather than let it fire
  // into a backgrounded, possibly-stale round. The player must explicitly
  // resume, mirroring the pause contract used by the other AI-opponent games.
  useEffect(() => {
    const onHidden = () => { if (document.hidden) setPaused(true); };
    document.addEventListener("visibilitychange", onHidden);
    return () => document.removeEventListener("visibilitychange", onHidden);
  }, []);

  useEffect(() => {
    if (game.phase !== "playing" || game.currentPlayer === 0 || paused) return;
    const timer = window.setTimeout(() => setGame((current) => {
      if (current.phase !== "playing" || current.currentPlayer === 0) return current;
      const choice = chooseHeartsCpuCard(current, current.currentPlayer, level);
      const next = playHeartsCard(current, current.currentPlayer, choice.id);
      tone(next.trick.length === 0 ? 220 : 300, 0.05);
      return next;
    }), 360);
    return () => window.clearTimeout(timer);
  }, [game, level, paused, tone]);

  useEffect(() => {
    if (game.phase === "roundComplete" || game.phase === "gameOver") tone(660, 0.18);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.phase]);

  const legalIds = useMemo(() => new Set(legalHeartsCards(game, 0).map(({ id }) => id)), [game]);
  const shownTrick = game.trick.length > 0 ? game.trick : game.lastTrick;
  const showingPrevious = game.trick.length === 0 && game.lastTrick.length > 0;
  const roundWinners = game.finalScores ? game.finalScores.map((score, player) => ({ score, player })).filter(({ score }) => score === Math.min(...game.finalScores!)).map(({ player }) => player) : [];
  const gameWinners = game.phase === "gameOver" ? game.matchScores.map((score, player) => ({ score, player })).filter(({ score }) => score === Math.min(...game.matchScores)).map(({ player }) => player) : [];
  const moonShooter = game.finalScores && game.capturedPoints.includes(26) ? game.capturedPoints.indexOf(26) : -1;

  const cardLabel = (card: HeartsCard) => `${t.suits[card.suit]} ${card.value} ${t.card}`;
  const togglePass = (card: HeartsCard) => setPassSelection((current) => current.includes(card.id) ? current.filter((id) => id !== card.id) : current.length < 3 ? [...current, card.id] : current);
  const confirmPass = () => {
    if (passSelection.length !== 3) return;
    setGame((current) => passHeartsCards(current, current.hands.map((hand, player) => player === 0 ? passSelection : chooseHeartsPassCards(hand).map(({ id }) => id))));
    setPassSelection([]);
    tone(300, 0.05);
  };
  const play = (card: HeartsCard) => {
    if (!legalIds.has(card.id)) return;
    setGame((current) => {
      const next = playHeartsCard(current, 0, card.id);
      tone(next.trick.length === 0 ? 220 : 300, 0.05);
      return next;
    });
  };
  const nextRound = () => { setGame((current) => startNextHeartsRound(current)); setPassSelection([]); };

  return (
    <GameContainer title={t.title} subtitle={t.subtitle} resetLabel={t.reset} onReset={reset}>
      <p className="mb-5 text-sm font-medium leading-6 text-muted-foreground">{t.desc}</p>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{t.difficulty}</span>
        <div className="inline-flex gap-1">
          {([1, 2, 3] as HeartsAiLevel[]).map((lv) => (
            <button key={lv} onClick={() => setLevel(lv)}
              aria-pressed={level === lv}
              className={`min-h-11 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${level === lv ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:bg-muted"}`}>
              {lv === 1 ? t.level1 : lv === 2 ? t.level2 : t.level3}
            </button>
          ))}
        </div>
        {game.phase === "playing" && (
          <button type="button" onClick={() => setPaused((value) => !value)} className="min-h-11 px-3 rounded-lg border border-border text-xs font-bold text-muted-foreground">
            {paused ? `▶ ${t.resume}` : `Ⅱ ${t.pause}`}
          </button>
        )}
        <button type="button" onClick={() => setMuted((value) => !value)} aria-pressed={muted} className="min-h-11 px-3 rounded-lg border border-border text-xs font-bold text-muted-foreground">
          {muted ? "🔇" : "🔊"} {t.sound}
        </button>
      </div>
      <p className="mb-4 text-center text-xs text-muted-foreground">{t.localSave}</p>
      {paused && game.phase === "playing" && (
        <div className="mb-3 rounded-xl border border-border bg-muted/40 p-3 text-center text-xs font-bold text-muted-foreground" role="status">{t.paused}</div>
      )}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs font-bold" aria-live="polite">
        <span>{t.round} {game.roundNumber} · {t.passTo}: {t.directions[game.passDirection as HeartsPassDirection]}</span>
        {game.phase === "playing" && <span>{t.trick} {game.trickNumber}/13 · {game.heartsBroken ? t.broken : t.notBroken}</span>}
      </div>

      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label={t.score}>
        {game.matchScores.map((score, player) => (
          <div key={player} className={`rounded-xl border px-3 py-2 text-center ${game.currentPlayer === player && game.phase === "playing" ? "border-primary bg-primary/10" : "border-border bg-muted/40"}`}>
            <span className="block text-xs font-bold text-muted-foreground">{playerName(player, t)}</span>
            <span className="text-lg font-black">{score}</span>
            <span className="block text-[10px] text-muted-foreground">{t.roundScore}: {game.finalScores?.[player] ?? game.capturedPoints[player]}</span>
          </div>
        ))}
      </div>

      {game.phase === "playing" && <div className="mb-4 flex flex-wrap justify-end gap-2 text-xs font-bold" aria-live="polite"><span>{t.turn}: {playerName(game.currentPlayer, t)}</span></div>}

      {game.phase === "playing" && (
        <section className="mb-6 min-h-52 rounded-3xl border border-dashed border-chart-1/30 bg-chart-1/10 p-4" aria-label={showingPrevious ? t.previous : t.table}>
          <p className="mb-3 text-center text-[11px] font-black uppercase tracking-widest text-muted-foreground">{showingPrevious ? t.previous : t.table}</p>
          {shownTrick.length > 0 ? <div className="flex flex-wrap items-center justify-center gap-2">{shownTrick.map(({ player, card }) => (
            <div key={`${player}-${card.id}`} className="oiyo-card-deal motion-reduce:transition-none"><span className="mb-1 block text-center text-[10px] font-bold text-muted-foreground">{playerName(player, t)}</span><PlayingCard suit={card.suit} value={card.value} className="pointer-events-none scale-75 cursor-default sm:scale-90" /></div>
          ))}</div> : <p className="py-14 text-center text-sm text-muted-foreground">{t.empty}</p>}
        </section>
      )}

      {game.phase === "passing" && <p className="mb-3 text-center text-sm font-semibold text-muted-foreground" role="status">{t.selectPass} ({passSelection.length}/3)</p>}
      {game.phase === "playing" && <p className="mb-3 min-h-6 text-center text-sm font-semibold text-muted-foreground" role="status">{game.currentPlayer === 0 ? t.choose : t.cpuThinking}</p>}

      {(game.phase === "passing" || game.phase === "playing") && (
        <section aria-label={`${t.cardsLeft}: ${game.hands[0].length}`}>
          <p className="mb-3 text-center text-[11px] font-black uppercase tracking-widest text-muted-foreground">{t.cardsLeft} ({game.hands[0].length})</p>
          <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2">{game.hands[0].map((card) => {
            const legal = legalIds.has(card.id);
            const selected = passSelection.includes(card.id);
            const enabled = !paused && (game.phase === "passing" ? selected || passSelection.length < 3 : legal);
            return <button key={card.id} type="button" disabled={!enabled} onClick={() => game.phase === "passing" ? togglePass(card) : play(card)} aria-label={cardLabel(card)} aria-pressed={game.phase === "passing" ? selected : undefined} className={`min-h-11 min-w-11 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-35 motion-reduce:transition-none ${selected ? "-translate-y-2 ring-2 ring-primary" : ""}`}><PlayingCard suit={card.suit} value={card.value} className={`pointer-events-none ${enabled ? "motion-safe:hover:-translate-y-1" : "cursor-not-allowed"}`} /></button>;
          })}</div>
          {game.phase === "passing" && <div className="mt-5 text-center"><button type="button" disabled={passSelection.length !== 3} onClick={confirmPass} className="min-h-11 rounded-full bg-primary px-8 py-3 font-black text-primary-foreground disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">{t.confirmPass}</button></div>}
        </section>
      )}

      {(game.phase === "roundComplete" || game.phase === "gameOver") && (
        <div className="mt-8 rounded-3xl border border-primary/30 bg-primary/10 p-6 text-center" role="status" aria-live="polite">
          <h4 className="text-2xl font-black">{game.phase === "gameOver" ? t.gameWinner : t.roundWinner}: {(game.phase === "gameOver" ? gameWinners : roundWinners).map((player) => playerName(player, t)).join(" · ")}</h4>
          {moonShooter >= 0 && <p className="mt-2 font-bold text-destructive">{playerName(moonShooter, t)} — {t.moon}</p>}
          <button type="button" onClick={game.phase === "gameOver" ? reset : nextRound} className="mt-5 min-h-11 rounded-full bg-primary px-8 py-3 font-black text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 motion-reduce:transition-none">{game.phase === "gameOver" ? t.reset : t.nextRound}</button>
        </div>
      )}
    </GameContainer>
  );
};

export default HeartsGame;
