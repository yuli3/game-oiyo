import React, { useCallback, useEffect, useRef, useState } from "react";
import { GameContainer } from "../ui/game/GamePrimitives";
import { usePrefersReducedMotion } from "../../lib/games/reduced-motion";
import type { Locale } from "../../lib/i18n";
import {
  makeSet, shuffle, tileFits, newEndValue, aiChoose, handPips,
  type Tile, type Ends, type End, type AiLevel,
} from "../../lib/games/ai/dominoes";
import { getRecord, recordResult, type GameRecord } from "../../lib/games/records";

const AI_DELAY = 800;

type Placed = { a: number; b: number; id: number };
type Winner = "you" | "cpu" | "draw" | null;

const i18n: Record<Locale, {
  title: string; you: string; cpu: string; turn: string; reset: string; draw: string; pass: string;
  boneyard: string; yourTiles: string; left: string; right: string; pickEnd: string;
  youWin: string; cpuWins: string; blockDraw: string; blocked: string; thinking: string;
  record: string; level1: string; level2: string; level3: string; start: string; noMove: string; tile: string;
}> = {
  ko: { title: "도미노", you: "나", cpu: "AI", turn: "차례", reset: "새 판", draw: "가져오기", pass: "패스", boneyard: "더미", yourTiles: "내 패", left: "◀ 왼쪽", right: "오른쪽 ▶", pickEnd: "어느 쪽에 놓을까요?", youWin: "당신의 승리!", cpuWins: "AI 승리", blockDraw: "무승부 (막힘)", blocked: "막힘 — 남은 패 점수로 승부", thinking: "AI가 생각 중…", record: "전적", level1: "견습생", level2: "숙련가", level3: "명인", start: "게임 시작", noMove: "놓을 패가 없습니다.", tile: "도미노 패" },
  en: { title: "Dominoes", you: "You", cpu: "AI", turn: "Turn", reset: "New Game", draw: "Draw", pass: "Pass", boneyard: "Boneyard", yourTiles: "Your tiles", left: "◀ Left", right: "Right ▶", pickEnd: "Which end?", youWin: "You win!", cpuWins: "AI wins", blockDraw: "Draw (blocked)", blocked: "Blocked — fewest pips wins", thinking: "AI is thinking…", record: "Record", level1: "Apprentice", level2: "Adept", level3: "Master", start: "Start Game", noMove: "No playable tile.", tile: "Domino tile" },
  ja: { title: "ドミノ", you: "あなた", cpu: "AI", turn: "手番", reset: "新しいゲーム", draw: "引く", pass: "パス", boneyard: "山札", yourTiles: "手札", left: "◀ 左", right: "右 ▶", pickEnd: "どちらに置く？", youWin: "あなたの勝ち！", cpuWins: "AIの勝ち", blockDraw: "引き分け（詰み）", blocked: "詰み — 手札の点数で勝負", thinking: "AIが思考中…", record: "戦績", level1: "見習い", level2: "熟練者", level3: "名人", start: "ゲーム開始", noMove: "置ける牌がありません。", tile: "ドミノ牌" },
  zh: { title: "多米诺骨牌", you: "你", cpu: "AI", turn: "回合", reset: "新对局", draw: "摸牌", pass: "过", boneyard: "牌堆", yourTiles: "你的牌", left: "◀ 左", right: "右 ▶", pickEnd: "放在哪一端？", youWin: "你赢了！", cpuWins: "AI 获胜", blockDraw: "平局（封盘）", blocked: "封盘 — 剩余点数少者胜", thinking: "AI 思考中…", record: "战绩", level1: "学徒", level2: "行家", level3: "大师", start: "开始游戏", noMove: "没有可出的牌。", tile: "多米诺牌" },
  fr: { title: "Dominos", you: "Vous", cpu: "IA", turn: "Tour", reset: "Nouvelle partie", draw: "Piocher", pass: "Passer", boneyard: "Pioche", yourTiles: "Vos dominos", left: "◀ Gauche", right: "Droite ▶", pickEnd: "Quel côté ?", youWin: "Vous gagnez !", cpuWins: "L'IA gagne", blockDraw: "Nul (bloqué)", blocked: "Bloqué — le moins de points gagne", thinking: "L'IA réfléchit…", record: "Bilan", level1: "Apprenti", level2: "Adepte", level3: "Maître", start: "Commencer", noMove: "Aucun domino jouable.", tile: "Domino" },
  es: { title: "Dominó", you: "Tú", cpu: "IA", turn: "Turno", reset: "Nueva partida", draw: "Robar", pass: "Pasar", boneyard: "Pozo", yourTiles: "Tus fichas", left: "◀ Izq.", right: "Der. ▶", pickEnd: "¿Qué extremo?", youWin: "¡Has ganado!", cpuWins: "Gana la IA", blockDraw: "Empate (cerrado)", blocked: "Cerrado — gana quien menos puntos tenga", thinking: "La IA está pensando…", record: "Historial", level1: "Aprendiz", level2: "Experto", level3: "Maestro", start: "Empezar", noMove: "Sin ficha jugable.", tile: "Ficha de dominó" },
};

function Pips({ n }: { n: number }) {
  const pos = [[], [4], [0, 8], [0, 4, 8], [0, 2, 6, 8], [0, 2, 4, 6, 8], [0, 2, 3, 5, 6, 8]][n];
  return (
    <div className="grid grid-cols-3 grid-rows-3 w-6 h-6 gap-0.5">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className={`rounded-full ${pos.includes(i) ? "bg-foreground" : "bg-transparent"}`} />
      ))}
    </div>
  );
}

const Dominoes: React.FC<{ locale?: Locale }> = ({ locale = "ko" }) => {
  const t = i18n[locale] ?? i18n.en;
  const reducedMotion = usePrefersReducedMotion();
  const [level, setLevel] = useState<AiLevel>(2);
  const [started, setStarted] = useState(false);

  const [player, setPlayer] = useState<Tile[]>([]);
  const [cpu, setCpu] = useState<Tile[]>([]);
  const [bone, setBone] = useState<Tile[]>([]);
  const [board, setBoard] = useState<Placed[]>([]);
  const [turn, setTurn] = useState<"you" | "cpu">("you");
  const [winner, setWinner] = useState<Winner>(null);
  const [pendingTile, setPendingTile] = useState<Tile | null>(null); // fits both ends → ask
  const [record, setRecord] = useState<GameRecord>({ w: 0, l: 0, d: 0 });
  const passRef = useRef(0);
  const recorded = useRef(false);

  useEffect(() => { setRecord(getRecord("dominoes")); }, []);

  const ends: Ends = board.length
    ? { left: board[0].a, right: board[board.length - 1].b }
    : { left: -1, right: -1 };

  const newGame = useCallback(() => {
    const deck = shuffle(makeSet());
    const p = deck.slice(0, 7);
    const c = deck.slice(7, 14);
    const rest = deck.slice(14);
    const opening = rest.shift()!;                 // opening tile on the board
    setPlayer(p); setCpu(c); setBone(rest);
    setBoard([{ a: opening.a, b: opening.b, id: opening.id }]);
    setTurn("you"); setWinner(null); setPendingTile(null);
    passRef.current = 0; recorded.current = false;
    setStarted(true);
  }, []);

  const finish = useCallback((w: Winner) => {
    setWinner(w);
    if (!recorded.current) {
      recorded.current = true;
      const r = w === "you" ? "w" : w === "cpu" ? "l" : "d";
      setRecord(recordResult("dominoes", r as "w" | "l" | "d"));
    }
  }, []);

  // Place a tile onto the board at a given end, keeping adjacency invariant.
  const placeTile = (bd: Placed[], tile: Tile, end: End): Placed[] => {
    if (end === "left") {
      const L = bd[0].a;
      const other = newEndValue(tile, L);
      return [{ a: other, b: L, id: tile.id }, ...bd];
    }
    const R = bd[bd.length - 1].b;
    const other = newEndValue(tile, R);
    return [...bd, { a: R, b: other, id: tile.id }];
  };

  const humanPlay = (tile: Tile, end: End) => {
    if (turn !== "you" || winner) return;
    if (!tileFits(tile, end === "left" ? ends.left : ends.right)) return;
    const nb = placeTile(board, tile, end);
    const nh = player.filter((x) => x.id !== tile.id);
    setBoard(nb); setPlayer(nh); setPendingTile(null);
    passRef.current = 0;
    if (nh.length === 0) { finish("you"); return; }
    setTurn("cpu");
  };

  const clickHandTile = (tile: Tile) => {
    if (turn !== "you" || winner) return;
    const fitsL = tileFits(tile, ends.left);
    const fitsR = tileFits(tile, ends.right);
    if (fitsL && fitsR) setPendingTile(tile);         // ask which end
    else if (fitsL) humanPlay(tile, "left");
    else if (fitsR) humanPlay(tile, "right");
  };

  const humanHasMove = player.some((tl) => tileFits(tl, ends.left) || tileFits(tl, ends.right));

  const humanDrawOrPass = () => {
    if (turn !== "you" || winner) return;
    if (bone.length > 0) {
      const [drawn, ...rest] = bone;
      setPlayer((h) => [...h, drawn]);
      setBone(rest);
      return; // player may now have a move; re-evaluate on next render
    }
    // boneyard empty and no move → pass
    passRef.current += 1;
    if (passRef.current >= 2) {
      const pa = handPips(player), pb = handPips(cpu);
      finish(pa === pb ? "draw" : pa < pb ? "you" : "cpu");
    } else {
      setTurn("cpu");
    }
  };

  // CPU turn.
  useEffect(() => {
    if (!started || winner || turn !== "cpu") return;
    const id = setTimeout(() => {
      let hand = cpu.slice();
      let pool = bone.slice();
      let move = aiChoose(hand, ends, level);
      while (!move && pool.length) {
        hand = [...hand, pool[0]]; pool = pool.slice(1);
        move = aiChoose(hand, ends, level);
      }
      if (move) {
        const nb = placeTile(board, move.tile, move.end);
        const nh = hand.filter((x) => x.id !== move!.tile.id);
        setBoard(nb); setCpu(nh); setBone(pool);
        passRef.current = 0;
        if (nh.length === 0) { finish("cpu"); return; }
        setTurn("you");
      } else {
        setCpu(hand); setBone(pool);
        passRef.current += 1;
        if (passRef.current >= 2) {
          const pa = handPips(player), pb = handPips(hand);
          finish(pa === pb ? "draw" : pa < pb ? "you" : "cpu");
        } else {
          setTurn("you");
        }
      }
    }, AI_DELAY);
    return () => clearTimeout(id);
  }, [started, winner, turn, cpu, bone, board, level]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!started) {
    return (
      <GameContainer title={t.title}>
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="flex gap-2">
            {([1, 2, 3] as AiLevel[]).map((lv) => (
              <button type="button" key={lv} onClick={() => setLevel(lv)} aria-pressed={level === lv}
                className={`px-3 py-1.5 rounded-md text-sm font-bold border ${level === lv ? "bg-primary text-primary-foreground border-primary" : "border-gray-300 text-gray-600"}`}>
                {lv === 1 ? t.level1 : lv === 2 ? t.level2 : t.level3}
              </button>
            ))}
          </div>
          <button type="button" onClick={newGame} className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-bold">{t.start}</button>
          <p className="text-xs text-gray-400">{t.record}: {record.w}W {record.l}L {record.d}D</p>
        </div>
      </GameContainer>
    );
  }

  return (
    <GameContainer title={t.title} subtitle={`${t.cpu}: ${cpu.length} · ${t.boneyard}: ${bone.length}`} onReset={newGame}>
      {/* Turn / status */}
      <div className="flex justify-between items-center mb-4">
        <div className={`px-4 py-2 rounded-2xl border ${turn === "you" && !winner ? "bg-primary/10 border-primary" : "bg-muted border-transparent opacity-50"}`}>
          <span className="text-xs font-black uppercase tracking-widest">
            {winner ? "—" : turn === "you" ? `${t.you} ${t.turn}` : t.thinking}
          </span>
        </div>
        <div className="text-[10px] font-bold text-muted-foreground uppercase">{t.record}: {record.w}/{record.l}/{record.d}</div>
      </div>

      {/* Board */}
      <div className="h-40 bg-muted/40 rounded-3xl border border-border flex items-center p-4 overflow-x-auto gap-1 shadow-inner mb-6">
        {board.map((d) => (
          <div key={d.id} className="flex flex-shrink-0 bg-card border border-border rounded-md shadow-sm divide-x divide-border">
            <div className="p-1"><Pips n={d.a} /></div>
            <div className="p-1"><Pips n={d.b} /></div>
          </div>
        ))}
      </div>

      {/* Pending end-choice */}
      {pendingTile && (
        <div className="flex items-center justify-center gap-3 mb-4">
          <span className="text-xs font-bold text-muted-foreground">{t.pickEnd}</span>
          <button type="button" onClick={() => humanPlay(pendingTile, "left")} className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-bold">{t.left}</button>
          <button type="button" onClick={() => humanPlay(pendingTile, "right")} className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-bold">{t.right}</button>
        </div>
      )}

      {/* Hand */}
      <div className="space-y-3">
        <p className="text-[10px] font-black text-muted-foreground uppercase text-center tracking-widest">{t.yourTiles}</p>
        <div className="flex flex-wrap justify-center gap-2">
          {player.map((d) => {
            const playable = turn === "you" && !winner && (tileFits(d, ends.left) || tileFits(d, ends.right));
            return (
              <button type="button" key={d.id} onClick={() => clickHandTile(d)} disabled={!playable} aria-disabled={!playable} aria-pressed={pendingTile?.id === d.id} aria-label={`${t.tile}: ${d.a}-${d.b}`}
                className={`bg-card border-2 rounded-lg shadow-sm flex flex-col divide-y divide-border ${!reducedMotion ? "transition-all" : ""} ${
                  playable ? `border-primary ${!reducedMotion ? "hover:-translate-y-1 active:scale-95" : ""}` : "border-border opacity-60"
                } ${pendingTile?.id === d.id ? "ring-2 ring-primary" : ""}`}>
                <div className="p-2 sm:p-3"><Pips n={d.a} /></div>
                <div className="p-2 sm:p-3"><Pips n={d.b} /></div>
              </button>
            );
          })}
        </div>
        {/* Draw / pass */}
        {turn === "you" && !winner && !humanHasMove && (
          <div className="flex flex-col items-center gap-1">
            <button type="button" onClick={humanDrawOrPass} className="px-5 py-2 rounded-lg bg-amber-500 text-white font-bold">
              {bone.length > 0 ? `${t.draw} (${bone.length})` : t.pass}
            </button>
            <span className="text-[10px] text-muted-foreground">{t.noMove}</span>
          </div>
        )}
      </div>

      {winner && (
        <div className={`absolute inset-0 z-20 bg-background/80 backdrop-blur-md rounded-4xl flex flex-col items-center justify-center ${!reducedMotion ? "animate-in fade-in zoom-in-95" : ""}`}>
          <h4 className="text-3xl font-black text-primary mb-2">
            {winner === "you" ? `🎉 ${t.youWin}` : winner === "cpu" ? t.cpuWins : t.blockDraw}
          </h4>
          <p className="text-xs text-muted-foreground mb-4">{t.record}: {record.w}W {record.l}L {record.d}D</p>
          <button type="button" onClick={newGame} className="px-10 py-3 bg-primary text-primary-foreground rounded-full font-bold shadow-lg">{t.reset}</button>
        </div>
      )}
    </GameContainer>
  );
};

export default Dominoes;
