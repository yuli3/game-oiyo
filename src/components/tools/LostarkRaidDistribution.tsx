import { useState } from "react";
import type { Locale } from "../../lib/i18n";
import { distributionAnalyticsPayload, type DistributionAnalyticsEvent } from "../../lib/lostark/distribution-analytics";
import { formatDistributionShare } from "../../lib/lostark/distribution-share";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "../ui/item";
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
  nextTitle: string;
  busTool: string;
  busToolDescription: string;
  auctionTool: string;
  auctionToolDescription: string;
  shareHeader: string;
  shareRoom: string;
}

const L: Record<string, UiLabels> = {
  en: {
    raidSettings: "Raid settings", method13: "1 Main / 3 Alt", method11: "1 Main / 1 Alt", partySize: "Party size",
    partyInput: "Party input", party: "Party", placeholder: "Enter characters (e.g. DDDS)", clear: "Clear",
    analyze: "Distribute", result: "Result", player: "Player", game: "Game", copyAll: "Copy all", copied: "Copied!",
    reqSup: "Recommended supporters", curSup: "Current supporters", roomBtn: "Generate room / password", room: "Room", pw: "Password",
    errCount: "Player count mismatch — expected {expected}, got {actual}.", errInvalid: "Check line(s) {lines}: each line needs exactly {games} letters, D or S only.",
    nextTitle: "Continue with a Lost Ark tool", busTool: "Raid bus fee calculator", busToolDescription: "Calculate the optimal auction and trade price.",
    auctionTool: "Lost Ark auction calculator", auctionToolDescription: "Compare party auction break-even prices.",
    shareHeader: "Lost Ark {method} split · {games} games", shareRoom: "Room {room} · Password {pw}",
  },
  ko: {
    raidSettings: "레이드 설정", method13: "본1부3", method11: "본1부1", partySize: "파티 인원",
    partyInput: "파티 입력", party: "파티", placeholder: "캐릭터 정보 입력 (예: ㄷㄷㄷㅍ)", clear: "비우기",
    analyze: "분배하기", result: "결과", player: "플레이어", game: "게임", copyAll: "전체 복사", copied: "복사됨!",
    reqSup: "권장 서포터", curSup: "현재 서포터", roomBtn: "랜덤 방제/비번 생성", room: "방제", pw: "비밀번호",
    errCount: "예상 플레이어 수: {expected}, 실제 입력: {actual}", errInvalid: "{lines}번째 줄을 확인해 주세요. 한 줄에 ㄷ 또는 ㅍ만 {games}글자로 적어요.",
    nextTitle: "로스트아크 도구 이어서 사용하기", busTool: "레이드 버스비 계산기", busToolDescription: "경매·거래 최적 가격을 계산합니다.",
    auctionTool: "로스트아크 경매 계산기", auctionToolDescription: "파티 경매 손익분기 가격을 비교합니다.",
    shareHeader: "로스트아크 {method} 품앗이 분배 · {games}판", shareRoom: "방제 {room} · 비번 {pw}",
  },
  ja: {
    raidSettings: "レイド設定", method13: "本1副3", method11: "本1副1", partySize: "パーティ人数",
    partyInput: "パーティ入力", party: "パーティ", placeholder: "キャラ情報入力 (例: ㄷㄷㄷㅍ)", clear: "クリア",
    analyze: "分配する", result: "結果", player: "プレイヤー", game: "ゲーム", copyAll: "全てコピー", copied: "コピーしました!",
    reqSup: "推奨サポーター", curSup: "現在のサポーター", roomBtn: "ランダム部屋名/パスワード生成", room: "部屋名", pw: "パスワード",
    errCount: "予想プレイヤー数: {expected}, 実際の入力: {actual}", errInvalid: "{lines}行目を確認してください。1行にㄷかㅍだけを{games}文字で入力します。",
    nextTitle: "Lost Arkツールを続けて使う", busTool: "レイドバス料金計算機", busToolDescription: "オークション・取引の最適価格を計算します。",
    auctionTool: "Lost Arkオークション計算機", auctionToolDescription: "パーティオークションの損益分岐価格を比較します。",
    shareHeader: "ロストアーク {method} 分配 · {games}ゲーム", shareRoom: "部屋名 {room} · パスワード {pw}",
  },
  zh: {
    raidSettings: "团本设置", method13: "本1副3", method11: "本1副1", partySize: "队伍人数",
    partyInput: "队伍输入", party: "队伍", placeholder: "输入角色信息（例：DDDS）", clear: "清空",
    analyze: "分配", result: "结果", player: "玩家", game: "场次", copyAll: "全部复制", copied: "已复制！",
    reqSup: "建议辅助", curSup: "当前辅助", roomBtn: "随机生成房名/密码", room: "房名", pw: "密码",
    errCount: "玩家人数不符：应为 {expected}，实际输入 {actual}。", errInvalid: "请检查第 {lines} 行：每行只能输入 {games} 个字母（D 或 S）。",
    nextTitle: "继续使用命运方舟工具", busTool: "团本巴士费用计算器", busToolDescription: "计算拍卖与交易的最佳价格。",
    auctionTool: "命运方舟拍卖计算器", auctionToolDescription: "比较队伍拍卖的保本价格。",
    shareHeader: "命运方舟 {method} 互助分配 · 共{games}场", shareRoom: "房名 {room} · 密码 {pw}",
  },
  fr: {
    raidSettings: "Réglages du raid", method13: "1 main / 3 alt", method11: "1 main / 1 alt", partySize: "Taille du groupe",
    partyInput: "Saisie des groupes", party: "Groupe", placeholder: "Saisissez les personnages (ex. DDDS)", clear: "Effacer",
    analyze: "Répartir", result: "Résultat", player: "Joueur", game: "Partie", copyAll: "Tout copier", copied: "Copié !",
    reqSup: "Supports conseillés", curSup: "Supports actuels", roomBtn: "Générer salon / mot de passe", room: "Salon", pw: "Mot de passe",
    errCount: "Nombre de joueurs incorrect : {expected} attendus, {actual} saisis.", errInvalid: "Vérifiez la ou les lignes {lines} : chaque ligne doit contenir exactement {games} lettres, D ou S.",
    nextTitle: "Continuer avec un outil Lost Ark", busTool: "Calculateur de frais de bus", busToolDescription: "Calcule le meilleur prix d'enchère et d'échange.",
    auctionTool: "Calculateur d'enchères Lost Ark", auctionToolDescription: "Compare les prix d'équilibre des enchères de groupe.",
    shareHeader: "Lost Ark · répartition {method} · {games} parties", shareRoom: "Salon {room} · Mot de passe {pw}",
  },
  es: {
    raidSettings: "Ajustes de la raid", method13: "1 main / 3 alt", method11: "1 main / 1 alt", partySize: "Tamaño del grupo",
    partyInput: "Entrada de grupos", party: "Grupo", placeholder: "Escribe los personajes (ej. DDDS)", clear: "Borrar",
    analyze: "Repartir", result: "Resultado", player: "Jugador", game: "Partida", copyAll: "Copiar todo", copied: "¡Copiado!",
    reqSup: "Supports recomendados", curSup: "Supports actuales", roomBtn: "Generar sala / contraseña", room: "Sala", pw: "Contraseña",
    errCount: "Número de jugadores incorrecto: se esperaban {expected}, hay {actual}.", errInvalid: "Revisa la(s) línea(s) {lines}: cada línea necesita exactamente {games} letras, solo D o S.",
    nextTitle: "Sigue con otra herramienta de Lost Ark", busTool: "Calculadora de tarifa de bus", busToolDescription: "Calcula el mejor precio de subasta e intercambio.",
    auctionTool: "Calculadora de subastas de Lost Ark", auctionToolDescription: "Compara los precios de equilibrio de las subastas de grupo.",
    shareHeader: "Lost Ark · reparto {method} · {games} partidas", shareRoom: "Sala {room} · Contraseña {pw}",
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

  const track = (event: DistributionAnalyticsEvent, details: { playerCount?: number; errorType?: "count" | "invalid" } = {}) => {
    const analytics = window as Window & { gtag?: (...args: unknown[]) => void };
    analytics.gtag?.("event", event, distributionAnalyticsPayload({ raidType, partySize, gameCount: games, ...details }));
  };

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
      track("distribution_error", { errorType: "count" });
      setError(t.errCount.replace("{expected}", String(out.errorDetail?.expected)).replace("{actual}", String(out.errorDetail?.actual)));
      setResult(null);
    } else if (out.error === "invalid") {
      track("distribution_error", { errorType: "invalid" });
      // 2026-10-05: a bare line number did not say what was wrong; name the expected length too.
      setError(t.errInvalid.replace("{lines}", out.errorDetail?.lines ?? "").replace("{games}", String(games)));
      setResult(null);
    } else {
      const distribution = out.result;
      if (!distribution) return;
      track("distribution_complete", { playerCount: distribution.length });
      setError(null);
      setResult(distribution);
    }
  };

  const copyAll = () => {
    if (!result) return;
    track("result_copy");
    const text = formatDistributionShare({
      result,
      header: t.shareHeader.replace("{method}", raidType === "1-3" ? t.method13 : t.method11).replace("{games}", String(result[0].length)),
      url: `https://game.oiyo.net/${locale}/lostark-raid-distribution/`,
      room,
      roomLine: t.shareRoom,
    });
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const trackRelatedClick = (itemId: string) => {
    const analytics = window as Window & { gtag?: (...args: unknown[]) => void };
    analytics.gtag?.("event", "select_content", { content_type: "related_tool", item_id: itemId });
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

          <button type="button" onClick={() => { track("room_code_generate"); setRoom(generateRoomCode()); }} className="mt-4 rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:border-primary/40">{t.roomBtn}</button>
          {room && (
            <div className="mt-2 flex gap-4 text-sm text-foreground">
              <span>{t.room}: <b className="font-mono">{room.roomCode}</b></span>
              <span>{t.pw}: <b className="font-mono">{room.password}</b></span>
            </div>
          )}

          <div className="mt-6 border-t border-border pt-5">
            <p className="mb-2 text-sm font-bold text-foreground">{t.nextTitle}</p>
            <ItemGroup>
              <a href={`/${locale}/lostark-bus-calculator/`} role="listitem" onClick={() => trackRelatedClick("lostark-bus-calculator")}>
                <Item variant="outline" size="sm" className="hover:border-primary/40 hover:bg-primary/5">
                  <ItemMedia aria-hidden="true">🚌</ItemMedia>
                  <ItemContent>
                    <ItemTitle>{t.busTool}</ItemTitle>
                    <ItemDescription>{t.busToolDescription}</ItemDescription>
                  </ItemContent>
                  <ItemActions aria-hidden="true" className="text-primary">→</ItemActions>
                </Item>
              </a>
              <a href={`/${locale}/lostark-auction-calculator/`} role="listitem" onClick={() => trackRelatedClick("lostark-auction-calculator")}>
                <Item variant="outline" size="sm" className="hover:border-primary/40 hover:bg-primary/5">
                  <ItemMedia aria-hidden="true">⚖️</ItemMedia>
                  <ItemContent>
                    <ItemTitle>{t.auctionTool}</ItemTitle>
                    <ItemDescription>{t.auctionToolDescription}</ItemDescription>
                  </ItemContent>
                  <ItemActions aria-hidden="true" className="text-primary">→</ItemActions>
                </Item>
              </a>
            </ItemGroup>
          </div>
        </div>
      )}
    </div>
  );
}
