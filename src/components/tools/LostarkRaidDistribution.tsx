import { useState } from "react";
import type { Locale } from "../../lib/i18n";
import {
  generateDistribution,
  calculateSupporterInfo,
  cleanChar,
  isMainChar,
  isDealerChar,
  generateRoomCode,
  getGameCount,
  type RaidType,
  type PartySize,
} from "../../lib/lostark/distribution";

interface UiLabels {
  raidSettings: string;
  method13: string;
  method11: string;
  partySize: string;
  partyInput: string;
  party: string;
  placeholder: string;
  clear: string;
  analyze: string;
  result: string;
  player: string;
  game: string;
  copyAll: string;
  copied: string;
  reqSup: string;
  curSup: string;
  roomBtn: string;
  room: string;
  pw: string;
  errCount: string;
  errInvalid: string;
}

const L: Record<string, UiLabels> = {
  en: {
    raidSettings: "Raid settings", method13: "1 Main / 3 Alt", method11: "1 Main / 1 Alt", partySize: "Party size",
    partyInput: "Party input", party: "Party", placeholder: "Enter characters (e.g. DDDS)", clear: "Clear",
    analyze: "Distribute", result: "Result", player: "Player", game: "Game", copyAll: "Copy all", copied: "Copied!",
    reqSup: "Recommended supporters", curSup: "Current supporters", roomBtn: "Generate room / password", room: "Room", pw: "Password",
    errCount: "Player count mismatch — expected {expected}, got {actual}.", errInvalid: "Invalid input on line(s): {lines}",
  },
  ko: {
    raidSettings: "레이드 설정", method13: "본1부3", method11: "본1부1", partySize: "파티 인원",
    partyInput: "파티 입력", party: "파티", placeholder: "캐릭터 정보 입력 (예: ㄷㄷㄷㅍ)", clear: "비우기",
    analyze: "분배하기", result: "결과", player: "플레이어", game: "게임", copyAll: "전체 복사", copied: "복사됨!",
    reqSup: "권장 서포터", curSup: "현재 서포터", roomBtn: "랜덤 방제/비번 생성", room: "방제", pw: "비밀번호",
    errCount: "예상 플레이어 수: {expected}, 실제 입력: {actual}", errInvalid: "잘못된 입력 줄 번호: {lines}",
  },
  ja: {
    raidSettings: "レイド設定", method13: "本1副3", method11: "本1副1", partySize: "パーティ人数",
    partyInput: "パーティ入力", party: "パーティ", placeholder: "キャラ情報入力 (例: ㄷㄷㄷㅍ)", clear: "クリア",
    analyze: "分配する", result: "結果", player: "プレイヤー", game: "ゲーム", copyAll: "全てコピー", copied: "コピーしました!",
    reqSup: "推奨サポーター", curSup: "現在のサポーター", roomBtn: "ランダム部屋名/パスワード生成", room: "部屋名", pw: "パスワード",
    errCount: "予想プレイヤー数: {expected}, 実際の入力: {actual}", errInvalid: "無効な入力の行番号: {lines}",
  },
};

const PRESETS_4 = ["ㄷㄷㄷㄷ", "ㄷㄷㄷㅍ", "ㄷㄷㅍㅍ", "ㄷㅍㅍㅍ", "ㅍㄷㄷㄷ", "ㅍㅍㄷㄷ", "ㅍㅍㅍㄷ", "ㅍㅍㅍㅍ"];
const PRESETS_2 = ["ㄷㄷ", "ㄷㅍ", "ㅍㄷ", "ㅍㅍ"];

interface Props {
  locale: Locale;
}

export default function LostarkRaidDistribution({ locale }: Props) {
  const t = L[locale] ?? L.en;

  const [raidType, setRaidType] = useState<RaidType>("1-3");
  const [partySize, setPartySize] = useState<PartySize>("16");
  const [inputs, setInputs] = useState<string[]>(["", "", "", ""]);
  const [result, setResult] = useState<string[][] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [room, setRoom] = useState<{ roomCode: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const games = getGameCount(raidType);
  const partyCount = parseInt(partySize, 10) / 4;
  const presets = games === 2 ? PRESETS_2 : PRESETS_4;

  const sup = calculateSupporterInfo(inputs, partySize, raidType);

  const setInput = (i: number, v: string) => {
    const next = [...inputs];
    next[i] = v;
    setInputs(next);
  };
  const addPreset = (i: number, value: string) => {
    const cur = inputs[i].trimEnd();
    setInput(i, cur === "" ? value : cur + "\n" + value);
  };

  const analyze = () => {
    setRoom(null);
    const out = generateDistribution(inputs.slice(0, partyCount), raidType, partySize);
    if (out.error === "count") {
      setError(t.errCount.replace("{expected}", String(out.errorDetail?.expected)).replace("{actual}", String(out.errorDetail?.actual)));
      setResult(null);
    } else if (out.error === "invalid") {
      setError(t.errInvalid.replace("{lines}", out.errorDetail?.lines ?? ""));
      setResult(null);
    } else {
      setError(null);
      setResult(out.result);
    }
  };

  const copyAll = () => {
    if (!result) return;
    const text = result
      .map((player, i) => `${Math.floor(i / 4) + 1}-${(i % 4) + 1} ${player.map(cleanChar).join("")}`)
      .join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const inputCls =
    "rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-2 focus:outline-offset-2 focus:outline-primary";
  const btn = (active: boolean) =>
    `rounded-md border px-4 py-2 text-sm font-semibold transition-colors ${active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground hover:border-primary/40"}`;

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      {/* Raid settings */}
      <p className="text-sm font-medium text-muted-foreground">{t.raidSettings}</p>
      <div className="mt-1 flex flex-wrap gap-2">
        <button type="button" className={btn(raidType === "1-3")} onClick={() => { setRaidType("1-3"); setResult(null); }}>{t.method13}</button>
        <button type="button" className={btn(raidType === "1-1")} onClick={() => { setRaidType("1-1"); setResult(null); }}>{t.method11}</button>
        <span className="mx-2 self-center text-border">|</span>
        {(["4", "8", "16"] as PartySize[]).map((s) => (
          <button key={s} type="button" className={btn(partySize === s)} onClick={() => { setPartySize(s); setResult(null); }}>{s}</button>
        ))}
      </div>

      {/* Party inputs */}
      <p className="mt-5 text-sm font-medium text-muted-foreground">{t.partyInput}</p>
      <div className="mt-1 grid gap-3 sm:grid-cols-2">
        {Array.from({ length: partyCount }).map((_, i) => (
          <div key={i} className="rounded-md border border-border p-3">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-bold text-foreground">{t.party} {i + 1}</span>
              <button type="button" className="text-xs text-muted-foreground hover:text-primary" onClick={() => setInput(i, "")}>{t.clear}</button>
            </div>
            <textarea rows={4} value={inputs[i]} placeholder={t.placeholder} onChange={(e) => setInput(i, e.target.value)} className={`w-full font-mono text-sm ${inputCls}`} />
            <div className="mt-2 flex flex-wrap gap-1">
              {presets.map((p) => (
                <button key={p} type="button" onClick={() => addPreset(i, p)} className="rounded-full border border-border px-2 py-0.5 text-[11px] font-mono text-muted-foreground hover:border-primary/40 hover:text-primary">{p}</button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 text-xs text-muted-foreground">
        {t.reqSup}: <b className="text-foreground">{sup.requiredSupporters}</b> · {t.curSup}: <b className={sup.isDeficient ? "text-warning" : "text-foreground"}>{sup.supporterCount}</b>
      </div>

      <button type="button" onClick={analyze} className="mt-4 w-full rounded-md bg-primary px-4 py-2.5 font-semibold text-primary-foreground transition-opacity hover:opacity-90">{t.analyze}</button>

      {error && (
        <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-foreground">{error}</div>
      )}

      {result && (
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-bold text-foreground">{t.result}</p>
            <button type="button" onClick={copyAll} className="rounded-md border border-border px-3 py-1 text-xs font-semibold text-foreground hover:border-primary/40">{copied ? t.copied : t.copyAll}</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-center text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="px-2 py-1 text-left font-medium">{t.player}</th>
                  {result[0].map((_, j) => (<th key={j} className="px-2 py-1 font-medium">{t.game} {j + 1}</th>))}
                </tr>
              </thead>
              <tbody>
                {result.map((player, i) => (
                  <tr key={i} className="border-b border-border/40">
                    <td className="px-2 py-1 text-left font-medium text-foreground">{Math.floor(i / 4) + 1}-{(i % 4) + 1}</td>
                    {player.map((cell, j) => (
                      <td key={j} className="px-2 py-1 font-mono">
                        <span className={`${isDealerChar(cell) ? "text-primary" : "text-warning"} ${isMainChar(cell) ? "font-bold underline" : ""}`}>{cleanChar(cell)}</span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button type="button" onClick={() => setRoom(generateRoomCode())} className="mt-4 rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:border-primary/40">{t.roomBtn}</button>
          {room && (
            <div className="mt-2 flex gap-4 text-sm text-foreground">
              <span>{t.room}: <b className="font-mono">{room.roomCode}</b></span>
              <span>{t.pw}: <b className="font-mono">{room.password}</b></span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
