import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import type { Locale } from "../../lib/i18n";
import {
  CHESS_TABLE_ENGINE,
  chessTableAiReply,
  chessTableClock,
  chessTablePick,
  chessTableResign,
  createChessTable,
  type ChessTableState,
} from "../../lib/games/chess-table";

const Scene = lazy(() => import("./ChessTableScene"));

const COPY = {
  ko: { title: "체스 테이블", back: "평면 체스", resign: "기권", thinking: "상대가 수를 읽고 있습니다", you: "당신의 승리", ai: "AI 승리", draw: "무승부", time: "시간 초과", checkmate: "체크메이트", stalemate: "스테일메이트", loading: "테이블을 준비하는 중", clock: "남은 시간 10분", square: "칸", engine: "엔진은 이 저장소의 체스 규칙입니다. Unity·Playground는 쓰지 않습니다." },
  en: { title: "Chess table", back: "Flat chess", resign: "Resign", thinking: "Your opponent is thinking", you: "You win", ai: "AI wins", draw: "Draw", time: "Time", checkmate: "Checkmate", stalemate: "Stalemate", loading: "Setting the table", clock: "10 minutes left", square: "square", engine: "The engine is this repo's chess rules. Unity and Playground are not used." },
  ja: { title: "チェス盤", back: "平面チェス", resign: "投了", thinking: "相手が考えています", you: "あなたの勝ち", ai: "AIの勝ち", draw: "引き分け", time: "時間切れ", checkmate: "チェックメイト", stalemate: "ステイルメイト", loading: "テーブルを準備中", clock: "残り10分", square: "マス", engine: "エンジンはこのリポジトリのチェス規則です。UnityとPlaygroundは使いません。" },
  zh: { title: "国际象棋桌", back: "平面棋盘", resign: "认输", thinking: "对手正在思考", you: "你赢了", ai: "AI 获胜", draw: "平局", time: "超时", checkmate: "将死", stalemate: "逼和", loading: "正在摆桌", clock: "剩余10分钟", square: "格", engine: "引擎是本仓库的国际象棋规则。不使用 Unity 或 Playground。" },
  fr: { title: "Table d'échecs", back: "Échiquier plat", resign: "Abandonner", thinking: "Votre adversaire réfléchit", you: "Vous gagnez", ai: "L'IA gagne", draw: "Nulle", time: "Temps", checkmate: "Échec et mat", stalemate: "Pat", loading: "Préparation de la table", clock: "10 minutes", square: "case", engine: "Le moteur est les règles d'échecs de ce dépôt. Unity et Playground ne sont pas utilisés." },
  es: { title: "Mesa de ajedrez", back: "Tablero plano", resign: "Rendirse", thinking: "Tu rival está pensando", you: "Has ganado", ai: "Gana la IA", draw: "Tablas", time: "Tiempo", checkmate: "Jaque mate", stalemate: "Ahogado", loading: "Preparando la mesa", clock: "10 minutos", square: "casilla", engine: "El motor son las reglas de ajedrez de este repositorio. No se usan Unity ni Playground." },
} as const;

function hasWebgl(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

function tone() {
  const AudioCtor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) return;
  try {
    const context = new AudioCtor();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = 520;
    gain.gain.setValueAtTime(0.03, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.08);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.09);
    oscillator.addEventListener("ended", () => void context.close().catch(() => {}), { once: true });
  } catch { /* Sound must not block a move. */ }
}

export default function ChessTable({ locale = "ko", onBack }: { locale?: Locale | string; onBack: () => void }) {
  const loc = (COPY[locale as keyof typeof COPY] ? locale : "en") as Locale;
  const t = COPY[loc];
  const [table, setTable] = useState<ChessTableState>(createChessTable);
  const [webgl] = useState(hasWebgl);
  const status = useMemo(() => {
    if (!table.end) return table.position.whiteToMove ? t.thinking.replace("상대가 수를 읽고 있습니다", "").trim() : "";
    if (table.end === "resign" || table.end === "time" && table.winner === "black") return t.ai;
    if (table.winner === "white") return t.you;
    if (table.end === "draw" || table.end === "stalemate") return t.draw;
    return t.ai;
  }, [table, t]);

  useEffect(() => {
    if (table.end) return;
    const timer = window.setInterval(() => setTable((current) => chessTableClock(current, 1)), 1000);
    return () => window.clearInterval(timer);
  }, [table.end]);

  useEffect(() => {
    if (table.end || table.position.whiteToMove) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (!cancelled) setTable((current) => current.end || current.position.whiteToMove ? current : chessTableAiReply(current));
    }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [table.end, table.position.whiteToMove, table.history.length]);

  const pick = (square: [number, number]) => {
    if (table.end || !table.position.whiteToMove) return;
    const next = chessTablePick(table, square);
    if (next !== table) {
      tone();
      setTable(next);
    }
  };
  const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
  const label = (row: number, column: number) => `${t.square} ${String.fromCharCode(97 + column)}${8 - row}`;

  return (
    <div data-chess-table="true" data-chess-engine={CHESS_TABLE_ENGINE} className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={onBack} className="min-h-11 rounded-xl border border-border px-3 text-sm font-bold">{t.back}</button>
        <button type="button" data-chess-resign="true" onClick={() => setTable((current) => chessTableResign(current))} disabled={Boolean(table.end)} className="min-h-11 rounded-xl bg-slate-900 px-3 text-sm font-bold text-white disabled:opacity-40">{t.resign}</button>
        <span className="text-sm font-bold tabular-nums">{clock(table.whiteSeconds)} / {clock(table.blackSeconds)}</span>
      </div>
      <p className="text-sm text-muted-foreground">{t.engine}</p>
      <div className="relative h-[28rem] overflow-x-auto rounded-2xl bg-slate-900">
        <div className="h-full min-w-[352px]">
          {webgl ? (
            <Suspense fallback={<p className="p-4 text-sm text-white">{t.loading}</p>}>
              <Scene table={table} label={label} onPick={pick} />
            </Suspense>
          ) : (
            <div className="grid h-full grid-cols-8">
              {table.position.board.map((rank, row) => rank.map((piece, column) => (
                <button key={`${row}-${column}`} type="button" aria-label={label(row, column)} onClick={() => pick([row, column])} className={`min-h-11 text-xs font-black ${(row + column) % 2 ? "bg-amber-900 text-amber-50" : "bg-amber-100 text-slate-900"}`}>
                  {piece ?? ""}
                </button>
              )))}
            </div>
          )}
        </div>
      </div>
      <p role="status" className="min-h-6 text-sm font-bold">{table.end ? `${status} · ${table.end}` : !table.position.whiteToMove ? t.thinking : t.clock}</p>
    </div>
  );
}
