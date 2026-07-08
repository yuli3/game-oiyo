import React, { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { GameContainer } from "../ui/game/GamePrimitives";
import type { Locale } from "../../lib/i18n";
import {
  startGame, place, claim, aiPlace, aiClaim, finalResult,
  type GameState, type AiLevel, type Kingdom,
} from "../../lib/games/ai/kingdomino";
import {
  isLegal, scoreBoard, GRID, type Cell, type Tile, type Placement,
} from "../../lib/games/kingdomino";
import { getRecord, recordResult, type GameRecord } from "../../lib/games/records";

const AI_DELAY = 620;
const DIRS = [[0, 1], [1, 0], [0, -1], [-1, 0]]; // right, down, left, up

const TERRAIN_COLOR: Record<string, string> = {
  wheat: "#e3b341", forest: "#2f7d4f", water: "#3b95d3",
  grass: "#8cc152", swamp: "#7d6b57", mine: "#3a3530", castle: "#b45309",
};

const i18n: Record<Locale, {
  title: string; you: string; ai: string; draft: string; toPlace: string; toClaim: string;
  claimHint: string; placeHint: string; rotate: string; discard: string; noSpot: string;
  thinking: string; reset: string; score: string; youWin: string; aiWins: string; draw: string;
  record: string; level1: string; level2: string; level3: string; start: string; crowns: string; round: string;
}> = {
  ko: { title: "킹도미노", you: "나의 왕국", ai: "AI 왕국", draft: "고를 타일", toPlace: "놓을 타일", toClaim: "타일 확보", claimHint: "가져올 타일을 고르세요 (낮은 번호일수록 다음 턴 순서가 빨라집니다).", placeHint: "왕국에 놓을 칸을 누르세요. 회전으로 방향을 바꿀 수 있어요.", rotate: "회전", discard: "버리기", noSpot: "놓을 자리가 없어 이 타일은 버려집니다.", thinking: "AI가 생각 중…", reset: "새 게임", score: "점수", youWin: "당신의 승리!", aiWins: "AI 승리", draw: "무승부", record: "전적", level1: "견습생", level2: "숙련가", level3: "명인", start: "게임 시작", crowns: "왕관", round: "라운드" },
  en: { title: "Kingdomino", you: "Your Kingdom", ai: "AI Kingdom", draft: "Draft", toPlace: "Place tile", toClaim: "Claim a tile", claimHint: "Pick a tile to claim (a lower number moves you earlier next round).", placeHint: "Tap a spot in your kingdom to place it. Rotate to change orientation.", rotate: "Rotate", discard: "Discard", noSpot: "No legal spot — this tile is discarded.", thinking: "AI is thinking…", reset: "New Game", score: "Score", youWin: "You win!", aiWins: "AI wins", draw: "Draw", record: "Record", level1: "Apprentice", level2: "Adept", level3: "Master", start: "Start Game", crowns: "crowns", round: "Round" },
  ja: { title: "キングドミノ", you: "あなたの王国", ai: "AIの王国", draft: "選択タイル", toPlace: "配置するタイル", toClaim: "タイル獲得", claimHint: "獲得するタイルを選びます（番号が小さいほど次の手番が早くなります）。", placeHint: "王国の置くマスをタップ。回転で向きを変えられます。", rotate: "回転", discard: "捨てる", noSpot: "置ける場所がなく、このタイルは捨てられます。", thinking: "AIが思考中…", reset: "新しいゲーム", score: "スコア", youWin: "あなたの勝ち！", aiWins: "AIの勝ち", draw: "引き分け", record: "戦績", level1: "見習い", level2: "熟練者", level3: "名人", start: "ゲーム開始", crowns: "王冠", round: "ラウンド" },
  zh: { title: "王国骨牌", you: "你的王国", ai: "AI 王国", draft: "可选骨牌", toPlace: "放置骨牌", toClaim: "占取骨牌", claimHint: "选择要占取的骨牌（编号越小，下轮出手越早）。", placeHint: "点击王国中的格子放置。可旋转改变方向。", rotate: "旋转", discard: "弃置", noSpot: "无合法位置，此骨牌被弃置。", thinking: "AI 思考中…", reset: "新对局", score: "分数", youWin: "你赢了！", aiWins: "AI 获胜", draw: "平局", record: "战绩", level1: "学徒", level2: "行家", level3: "大师", start: "开始游戏", crowns: "王冠", round: "回合" },
  fr: { title: "Kingdomino", you: "Votre royaume", ai: "Royaume IA", draft: "Tuiles", toPlace: "Placer la tuile", toClaim: "Choisir une tuile", claimHint: "Choisissez une tuile (un numéro plus bas vous fait jouer plus tôt au tour suivant).", placeHint: "Touchez une case de votre royaume pour la placer. Pivotez pour changer l'orientation.", rotate: "Pivoter", discard: "Défausser", noSpot: "Aucune case légale — cette tuile est défaussée.", thinking: "L'IA réfléchit…", reset: "Nouvelle partie", score: "Score", youWin: "Vous gagnez !", aiWins: "L'IA gagne", draw: "Match nul", record: "Bilan", level1: "Apprenti", level2: "Adepte", level3: "Maître", start: "Commencer", crowns: "couronnes", round: "Tour" },
  es: { title: "Kingdomino", you: "Tu reino", ai: "Reino IA", draft: "Fichas", toPlace: "Colocar ficha", toClaim: "Reclamar ficha", claimHint: "Elige una ficha (un número más bajo te hace jugar antes la próxima ronda).", placeHint: "Toca una casilla de tu reino para colocarla. Rota para cambiar la orientación.", rotate: "Rotar", discard: "Descartar", noSpot: "Sin lugar legal: esta ficha se descarta.", thinking: "La IA está pensando…", reset: "Nueva partida", score: "Puntos", youWin: "¡Has ganado!", aiWins: "Gana la IA", draw: "Empate", record: "Historial", level1: "Aprendiz", level2: "Experto", level3: "Maestro", start: "Empezar", crowns: "coronas", round: "Ronda" },
};

function Crowns({ n, size = 8 }: { n: number; size?: number }) {
  if (!n) return null;
  return (
    <div className="absolute inset-0 flex items-start justify-end gap-[1px] p-[2px] pointer-events-none">
      {Array.from({ length: n }).map((_, i) => (
        <span key={i} style={{ fontSize: size }} className="leading-none drop-shadow">👑</span>
      ))}
    </div>
  );
}

function CellView({ cell, crowns, highlight, onClick }: {
  cell: Cell; crowns: number; highlight?: "legal" | "preview" | null; onClick?: () => void;
}) {
  const bg = cell ? TERRAIN_COLOR[cell] : "#f4f1ea";
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`relative aspect-square w-full rounded-[3px] border transition-transform ${
        highlight === "legal" ? "border-emerald-500 ring-2 ring-emerald-400/60 cursor-pointer hover:scale-[1.05]"
        : highlight === "preview" ? "border-amber-500 ring-2 ring-amber-400/70"
        : "border-black/10"
      }`}
      style={{ background: bg }}
      aria-label={cell ?? "empty"}
    >
      {cell === "castle" && <span className="absolute inset-0 flex items-center justify-center text-white text-[10px]">🏰</span>}
      <Crowns n={crowns} />
    </button>
  );
}

function KingdomGrid({ k, interactive, legalA, onPlace }: {
  k: Kingdom; interactive: boolean; legalA?: Set<string>; onPlace?: (r: number, c: number) => void;
}) {
  return (
    <div className="grid gap-[2px]" style={{ gridTemplateColumns: `repeat(${GRID}, minmax(0, 1fr))` }}>
      {k.board.map((row, r) =>
        row.map((cell, c) => {
          const key = `${r},${c}`;
          const hl = interactive && legalA?.has(key) ? "legal" : null;
          return (
            <CellView
              key={key}
              cell={cell}
              crowns={k.crowns[r][c]}
              highlight={hl}
              onClick={interactive && legalA?.has(key) && onPlace ? () => onPlace(r, c) : undefined}
            />
          );
        })
      )}
    </div>
  );
}

function TileChip({ tile, owner, dim, onClick, youLabel, aiLabel }: {
  tile: Tile; owner: "you" | "ai" | null; dim?: boolean; onClick?: () => void; youLabel: string; aiLabel: string;
}) {
  const sq = (s: { terrain: string; crowns: number }) => (
    <div className="relative w-6 h-6 rounded-[3px] border border-black/10" style={{ background: TERRAIN_COLOR[s.terrain] }}>
      <Crowns n={s.crowns} size={7} />
    </div>
  );
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`flex items-center gap-[3px] rounded-md border p-1 ${
        onClick ? "border-emerald-500 ring-1 ring-emerald-400/50 hover:bg-emerald-50 cursor-pointer" : "border-black/10"
      } ${dim ? "opacity-40" : ""}`}
      title={`#${tile.id}`}
    >
      <span className="text-[9px] font-bold text-gray-400 w-4 text-center">{tile.id}</span>
      {sq(tile.a)}{sq(tile.b)}
      {owner && (
        <span className={`text-[9px] font-bold px-1 rounded ${owner === "you" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"}`}>
          {owner === "you" ? youLabel : aiLabel}
        </span>
      )}
    </button>
  );
}

const Kingdomino: React.FC<{ locale?: Locale }> = ({ locale = "ko" }) => {
  const t = i18n[locale] ?? i18n.en;
  const [level, setLevel] = useState<AiLevel>(2);
  const [started, setStarted] = useState(false);
  const gs = useRef<GameState | null>(null);
  const [, force] = useReducer((x) => x + 1, 0);
  const [orient, setOrient] = useState(0);
  const [record, setRecord] = useState<GameRecord>({ w: 0, l: 0, d: 0 });
  const recorded = useRef(false);

  useEffect(() => { setRecord(getRecord("kingdomino")); }, []);

  const newGame = useCallback(() => {
    gs.current = startGame();
    setOrient(0);
    recorded.current = false;
    setStarted(true);
    force();
  }, []);

  // AI turns advance automatically.
  useEffect(() => {
    const s = gs.current;
    if (!s || !started) return;
    const p = s.pending;
    if (p.kind === "gameover") {
      if (!recorded.current) {
        recorded.current = true;
        const res = finalResult(s);
        const r = res.winner === "draw" ? "d" : res.winner === "you" ? "w" : "l";
        setRecord(recordResult("kingdomino", r as "w" | "l" | "d"));
      }
      return;
    }
    if (p.owner === "ai") {
      const id = setTimeout(() => {
        if (p.kind === "claim") claim(s, aiClaim(s, level));
        else place(s, aiPlace(s, level));
        setOrient(0);
        force();
      }, AI_DELAY);
      return () => clearTimeout(id);
    }
  }); // runs after every render; guarded by pending state

  const s = gs.current;
  const pending = s?.pending;

  // For a human place turn: which A-cells are legal under the current orientation,
  // and whether the tile can be placed at all.
  let legalA: Set<string> | undefined;
  let mustDiscard = false;
  if (s && pending?.kind === "place" && pending.owner === "you") {
    const tile = pending.tile;
    mustDiscard = !pending.canPlace;
    legalA = new Set();
    const [dr, dc] = DIRS[orient];
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        const pl: Placement = { a: { r, c }, b: { r: r + dr, c: c + dc } };
        if (isLegal(s.you.board, tile, pl)) legalA.add(`${r},${c}`);
      }
    }
  }

  const doPlace = (r: number, c: number) => {
    if (!s || pending?.kind !== "place") return;
    const [dr, dc] = DIRS[orient];
    const pl: Placement = { a: { r, c }, b: { r: r + dr, c: c + dc } };
    if (!isLegal(s.you.board, pending.tile, pl)) return;
    place(s, pl);
    setOrient(0);
    force();
  };

  const doClaim = (slotIdx: number) => {
    if (!s || pending?.kind !== "claim") return;
    claim(s, slotIdx);
    force();
  };

  const doDiscard = () => {
    if (!s || pending?.kind !== "place") return;
    place(s, null);
    setOrient(0);
    force();
  };

  if (!started || !s) {
    return (
      <GameContainer title={t.title}>
        <div className="flex flex-col items-center gap-4 py-8">
          <p className="text-sm text-gray-500 max-w-md text-center">{t.claimHint}</p>
          <div className="flex gap-2">
            {([1, 2, 3] as AiLevel[]).map((lv) => (
              <button key={lv} onClick={() => setLevel(lv)}
                className={`px-3 py-1.5 rounded-md text-sm font-bold border ${level === lv ? "bg-emerald-600 text-white border-emerald-600" : "border-gray-300 text-gray-600"}`}>
                {lv === 1 ? t.level1 : lv === 2 ? t.level2 : t.level3}
              </button>
            ))}
          </div>
          <button onClick={newGame} className="px-6 py-2.5 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700">
            {t.start}
          </button>
          <p className="text-xs text-gray-400">{t.record}: {record.w}W {record.l}L {record.d}D</p>
        </div>
      </GameContainer>
    );
  }

  const over = pending?.kind === "gameover";
  const res = over ? finalResult(s) : null;
  const owner = pending && pending.kind !== "gameover" ? pending.owner : null;
  const yourTurn = owner === "you";
  const heldTile = pending?.kind === "place" ? pending.tile : null;

  return (
    <GameContainer title={t.title} subtitle={`${t.round} ${s.round}`} onReset={newGame}>
      <div className="flex flex-col gap-4">
        {/* Status bar */}
        <div className="text-center min-h-[24px]">
          {over ? (
            <span className="text-lg font-black">
              {res!.winner === "you" ? `🎉 ${t.youWin}` : res!.winner === "ai" ? t.aiWins : t.draw}
            </span>
          ) : owner === "ai" ? (
            <span className="text-sm text-gray-500">{t.thinking}</span>
          ) : pending?.kind === "claim" ? (
            <span className="text-sm text-emerald-700 font-semibold">{t.claimHint}</span>
          ) : (
            <span className="text-sm text-emerald-700 font-semibold">{mustDiscard ? t.noSpot : t.placeHint}</span>
          )}
        </div>

        {/* Held tile + rotate/discard controls (human place turn) */}
        {yourTurn && pending?.kind === "place" && heldTile && (
          <div className="flex items-center justify-center gap-3">
            <span className="text-xs font-bold text-gray-500">{t.toPlace}</span>
            <TileChip tile={heldTile} owner={null} youLabel="" aiLabel="" />
            {mustDiscard ? (
              <button onClick={doDiscard}
                className="px-3 py-1.5 rounded-md bg-rose-600 text-white text-sm font-bold">{t.discard}</button>
            ) : (
              <button onClick={() => setOrient((o) => (o + 1) % 4)}
                className="px-3 py-1.5 rounded-md border border-gray-300 text-sm font-bold">↻ {t.rotate}</button>
            )}
          </div>
        )}

        {/* Draft lines */}
        <div className="flex flex-col items-center gap-2">
          {s.current.length > 0 && pending?.kind !== "gameover" && (
            <div className="flex flex-wrap justify-center gap-2">
              <span className="text-[10px] font-bold text-gray-400 self-center">{t.toPlace}</span>
              {s.current.map((sl, i) => (
                <TileChip key={`cur-${sl.tile.id}`} tile={sl.tile} owner={sl.owner}
                  dim={i < s.curIdx} youLabel={t.you.slice(0, 2)} aiLabel="AI" />
              ))}
            </div>
          )}
          {s.draft.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2">
              <span className="text-[10px] font-bold text-gray-400 self-center">{t.draft}</span>
              {s.draft.map((sl, i) => {
                const claimable = yourTurn && pending?.kind === "claim" && pending.options.includes(i);
                return (
                  <TileChip key={`draft-${sl.tile.id}`} tile={sl.tile} owner={sl.owner}
                    youLabel={t.you.slice(0, 2)} aiLabel="AI"
                    onClick={claimable ? () => doClaim(i) : undefined} />
                );
              })}
            </div>
          )}
        </div>

        {/* Two kingdoms */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-emerald-700">{t.you}</span>
              <span>{scoreBoard(s.you.board, s.you.crowns)}{over ? ` → ${res!.you}` : ""}</span>
            </div>
            <KingdomGrid k={s.you} interactive={yourTurn && pending?.kind === "place" && !mustDiscard}
              legalA={legalA} onPlace={doPlace} />
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-rose-700">{t.ai}</span>
              <span>{scoreBoard(s.ai.board, s.ai.crowns)}{over ? ` → ${res!.ai}` : ""}</span>
            </div>
            <KingdomGrid k={s.ai} interactive={false} />
          </div>
        </div>

        <p className="text-center text-xs text-gray-400">
          {t.record}: {record.w}W {record.l}L {record.d}D
        </p>
      </div>
    </GameContainer>
  );
};

export default Kingdomino;
