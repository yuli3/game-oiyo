import { lazy, Suspense, useState } from "react";
import type { Locale } from "../../lib/i18n";
import { CHESS_PLAY_UI_SPRITES } from "../../lib/games/sprites";
import ChessBoard from "./ChessBoard";

const Table = lazy(() => import("./ChessTable"));

const LABEL = {
  ko: "테이블",
  en: "Table",
  ja: "テーブル",
  zh: "棋桌",
  fr: "Table",
  es: "Mesa",
} as const;

export default function ChessPlay({ locale = "ko" }: { locale?: Locale | string }) {
  const [table, setTable] = useState(false);
  const loc = (LABEL[locale as keyof typeof LABEL] ? locale : "en") as Locale;
  if (table) {
    return (
      <Suspense fallback={null}>
        <Table locale={locale} onBack={() => setTable(false)} />
      </Suspense>
    );
  }
  return (
    <div className="space-y-3">
      <button type="button" data-chess-table-open="true" onClick={() => setTable(true)} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-border px-3 text-sm font-bold">
        <img src={CHESS_PLAY_UI_SPRITES.knight} alt="" className="size-4 object-contain" />
        {LABEL[loc]}
      </button>
      <ChessBoard locale={locale as Locale} />
    </div>
  );
}
