import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Coins, Heart, Maximize2, Minimize2, RefreshCw, Swords, Trash2, Volume2, VolumeX } from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import { RETRO_8BIT_CUES, createCuePlayer, readMutedPref, writeMutedPref, type CoreCue, type CuePlayer } from "../../lib/games/game-audio";
import { createHaptics, readHapticsEnabled, type Haptics } from "../../lib/games/haptics";
import { useRunRecord } from "../../lib/games/use-run-record";
import { normalizeGameLocale } from "../../lib/games/game-text";
import {
  BENCH_SIZE, FIELD_SIZE, GUILDS, MERC_SLUG, REROLL_COST, ROUND_COUNT, UNITS,
  afterFight, buy, costOf, enemyBand, fieldCap, fieldCount, guildCounts, guildLevel, isBossRound, newRun, place, reroll, runScore, sell, sellValue, startBattle, stepBattle,
  type Battle, type Guild, type Merc, type RunState, type Slot, type UnitId,
} from "../../lib/games/market-mercenaries";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const EMOJI: Record<UnitId, string> = {
  stick: "🪵", sword: "🗡️", twin: "⚔️", lid: "🛡️", gate: "🚪", ox: "🐂", sling: "🪨", bow: "🏹", xbow: "🎯", granny: "🌿", doctor: "💊", sage: "🧙", boss: "👹",
};
const GUILD_EMOJI: Record<Guild, string> = { blade: "⚔️", guard: "🛡️", archer: "🏹", herb: "🌿" };
const TIER_CLASS = ["border-transparent", "border-border", "border-primary", "border-warning"];

const NAMES: Record<L, Record<UnitId, string>> = {
  ko: { stick: "막대기 소년", sword: "칼 장수", twin: "쌍검 무사", lid: "솥뚜껑 방패", gate: "성문지기", ox: "철갑 황소", sling: "새총 꼬마", bow: "활 사냥꾼", xbow: "석궁 장인", granny: "약초 할머니", doctor: "주막 의원", sage: "산신령", boss: "장터 깡패 두목" },
  en: { stick: "Stick Kid", sword: "Blade Seller", twin: "Twin Blades", lid: "Pot-Lid Guard", gate: "Gatekeeper", ox: "Iron Ox", sling: "Slingshot Kid", bow: "Bow Hunter", xbow: "Crossbow Smith", granny: "Herb Granny", doctor: "Inn Doctor", sage: "Mountain Sage", boss: "Market Boss" },
  ja: { stick: "棒きれ少年", sword: "刀売り", twin: "二刀の武者", lid: "鍋ぶた盾", gate: "門番", ox: "鉄の牛", sling: "パチンコ小僧", bow: "弓の狩人", xbow: "弩の職人", granny: "薬草ばあさん", doctor: "宿場の医者", sage: "山の仙人", boss: "市場の親分" },
  zh: { stick: "木棍少年", sword: "卖刀人", twin: "双刀武士", lid: "锅盖盾兵", gate: "守门人", ox: "铁甲牛", sling: "弹弓小孩", bow: "弓猎人", xbow: "弩匠", granny: "草药婆婆", doctor: "客栈郎中", sage: "山神仙", boss: "集市恶霸" },
  fr: { stick: "Gamin au bâton", sword: "Marchand de lames", twin: "Double lame", lid: "Garde au couvercle", gate: "Portier", ox: "Bœuf de fer", sling: "Gamin à la fronde", bow: "Chasseur à l'arc", xbow: "Arbalétrier", granny: "Mamie herboriste", doctor: "Médecin d'auberge", sage: "Sage des monts", boss: "Caïd du marché" },
  es: { stick: "Chico del palo", sword: "Vendedor de espadas", twin: "Doble espada", lid: "Guardia de la tapa", gate: "Portero", ox: "Buey de hierro", sling: "Chico de la honda", bow: "Cazador con arco", xbow: "Ballestero", granny: "Abuela herbolaria", doctor: "Médico de posada", sage: "Sabio del monte", boss: "Jefe del mercado" },
};

const COPY: Record<L, {
  round: string; boss: string; gold: string; wins: string; shop: string; bench: string; field: string; reroll: string; fight: string; sell: string;
  cap: string; won: string; lost: string; runWon: string; runLost: string; next: string; again: string; rival: string; you: string; guilds: Record<Guild, string>;
  bonus: Record<Guild, string>; help: string; full: string; exitFull: string; mute: string; unmute: string; pick: string; score: string;
}> = {
  ko: {
    round: "{0}/{1} 라운드", boss: "두목전", gold: "{0}냥", wins: "{0}승", shop: "장터 (누르면 구매)", bench: "대기석", field: "전장", reroll: "새로 진열 ({0})", fight: "싸우러 가기", sell: "팔기 +{0}",
    cap: "전장 {0}/{1}명", won: "이겼어요!", lost: "졌어요… 하트 -{0}", runWon: "20라운드 완주! 장터 최고의 용병단", runLost: "용병단이 흩어졌어요", next: "다음 라운드", again: "새로 시작", rival: "상대 용병단", you: "우리 용병단",
    guilds: { blade: "칼잡이", guard: "방패꾼", archer: "궁수", herb: "약초꾼" },
    bonus: { blade: "공격력 +25% / +55%", guard: "방어 +3 / +7, 동료 방어 +1", archer: "공격 속도 +30% / +65%", herb: "치유 +40% / +80%, 3종이면 모두 회복" },
    help: "장터에서 용병을 사서 전장에 세우세요. 같은 용병 3명은 별 하나 더 단 1명으로 합쳐집니다. 칼·방패는 앞줄, 활·약초꾼은 뒷줄이 좋아요. 같은 조합 2종·3종이면 보너스! 용병을 누른 뒤 빈칸을 누르면 옮깁니다.",
    full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기", pick: "옮길 자리를 누르세요", score: "점수 {0}",
  },
  en: {
    round: "Round {0}/{1}", boss: "Boss", gold: "{0} gold", wins: "{0} wins", shop: "Market (tap to buy)", bench: "Bench", field: "Field", reroll: "Restock ({0})", fight: "Fight", sell: "Sell +{0}",
    cap: "Field {0}/{1}", won: "Victory!", lost: "Defeat… hearts -{0}", runWon: "All 20 rounds! Best band in the market", runLost: "Your band scattered", next: "Next round", again: "New run", rival: "Rival band", you: "Your band",
    guilds: { blade: "Blades", guard: "Guards", archer: "Archers", herb: "Herbalists" },
    bonus: { blade: "Attack +25% / +55%", guard: "Armor +3 / +7, allies +1", archer: "Attack speed +30% / +65%", herb: "Healing +40% / +80%, 3 kinds: everyone regenerates" },
    help: "Buy mercenaries at the market and put them on the field. Three of the same merge into one with an extra star. Blades and guards like the front row, archers and herbalists the back. Two or three kinds from one guild give a bonus. Tap a unit, then a slot, to move it.",
    full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Sound on", pick: "Tap where to move it", score: "Score {0}",
  },
  ja: {
    round: "{0}/{1}ラウンド", boss: "親分戦", gold: "{0}両", wins: "{0}勝", shop: "市場（タップで購入）", bench: "控え", field: "戦場", reroll: "品替え ({0})", fight: "戦いへ", sell: "売る +{0}",
    cap: "戦場 {0}/{1}人", won: "勝ちました！", lost: "負けました… ハート -{0}", runWon: "20ラウンド完走！市場一の傭兵団", runLost: "傭兵団は散り散りに", next: "次のラウンド", again: "最初から", rival: "相手の傭兵団", you: "自分の傭兵団",
    guilds: { blade: "剣士", guard: "盾持ち", archer: "弓兵", herb: "薬師" },
    bonus: { blade: "攻撃 +25% / +55%", guard: "防御 +3 / +7、味方 +1", archer: "攻撃速度 +30% / +65%", herb: "回復 +40% / +80%、3種で全員回復" },
    help: "市場で傭兵を買って戦場に並べましょう。同じ傭兵3人は星が1つ増えた1人に合体します。剣と盾は前列、弓と薬師は後列向き。同じ組の2種・3種でボーナス！傭兵をタップしてから空きマスをタップで移動。",
    full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音をオン", pick: "移動先をタップ", score: "スコア {0}",
  },
  zh: {
    round: "第{0}/{1}回合", boss: "头目战", gold: "{0}两", wins: "{0}胜", shop: "集市（点击购买）", bench: "候补席", field: "战场", reroll: "换一批 ({0})", fight: "出战", sell: "卖出 +{0}",
    cap: "战场 {0}/{1}人", won: "胜利！", lost: "失败… 心 -{0}", runWon: "20回合全通！集市第一佣兵团", runLost: "佣兵团散了", next: "下一回合", again: "重新开始", rival: "对手佣兵团", you: "我的佣兵团",
    guilds: { blade: "剑客", guard: "盾兵", archer: "弓手", herb: "药师" },
    bonus: { blade: "攻击 +25% / +55%", guard: "护甲 +3 / +7，队友 +1", archer: "攻速 +30% / +65%", herb: "治疗 +40% / +80%，3种时全体回血" },
    help: "在集市买佣兵放上战场。3个相同佣兵会合成多一颗星的1个。剑客和盾兵适合前排，弓手和药师适合后排。同一组凑齐2种、3种有加成！先点佣兵再点空格即可移动。",
    full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音", pick: "点击要移动到的位置", score: "得分 {0}",
  },
  fr: {
    round: "Manche {0}/{1}", boss: "Caïd", gold: "{0} or", wins: "{0} victoires", shop: "Marché (touchez pour acheter)", bench: "Banc", field: "Terrain", reroll: "Réassort ({0})", fight: "Au combat", sell: "Vendre +{0}",
    cap: "Terrain {0}/{1}", won: "Victoire !", lost: "Défaite… cœurs -{0}", runWon: "Les 20 manches ! Meilleure bande du marché", runLost: "Votre bande s'est dispersée", next: "Manche suivante", again: "Nouvelle partie", rival: "Bande rivale", you: "Votre bande",
    guilds: { blade: "Lames", guard: "Gardes", archer: "Archers", herb: "Herboristes" },
    bonus: { blade: "Attaque +25 % / +55 %", guard: "Armure +3 / +7, alliés +1", archer: "Vitesse +30 % / +65 %", herb: "Soins +40 % / +80 %, 3 sortes : tous se régénèrent" },
    help: "Achetez des mercenaires au marché et placez-les sur le terrain. Trois identiques fusionnent en un seul avec une étoile de plus. Lames et gardes devant, archers et herboristes derrière. Deux ou trois sortes d'une guilde donnent un bonus. Touchez une unité puis une case pour la déplacer.",
    full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son", pick: "Touchez la case de destination", score: "Score {0}",
  },
  es: {
    round: "Ronda {0}/{1}", boss: "Jefe", gold: "{0} oro", wins: "{0} victorias", shop: "Mercado (toca para comprar)", bench: "Banquillo", field: "Campo", reroll: "Reponer ({0})", fight: "A luchar", sell: "Vender +{0}",
    cap: "Campo {0}/{1}", won: "¡Victoria!", lost: "Derrota… corazones -{0}", runWon: "¡Las 20 rondas! La mejor banda del mercado", runLost: "Tu banda se dispersó", next: "Siguiente ronda", again: "Nueva partida", rival: "Banda rival", you: "Tu banda",
    guilds: { blade: "Espadas", guard: "Guardias", archer: "Arqueros", herb: "Herbolarios" },
    bonus: { blade: "Ataque +25 % / +55 %", guard: "Armadura +3 / +7, aliados +1", archer: "Velocidad +30 % / +65 %", herb: "Curación +40 % / +80 %, 3 tipos: todos regeneran" },
    help: "Compra mercenarios en el mercado y colócalos en el campo. Tres iguales se fusionan en uno con una estrella más. Espadas y guardias van delante; arqueros y herbolarios, detrás. Dos o tres tipos de un gremio dan bonus. Toca una unidad y luego una casilla para moverla.",
    full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido", pick: "Toca dónde moverla", score: "Puntos {0}",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:market-mercenaries:muted";
const W = 360;
const H = 330;
const COL_X = [54, 138, 222, 306];
// enemy back, enemy front, player front, player back
const ROW_Y = [42, 110, 214, 284];

function slotPos(side: 0 | 1, slot: number): [number, number] {
  const back = slot >= 4;
  const col = slot % 4;
  const row = side === 1 ? (back ? 0 : 1) : back ? 3 : 2;
  return [COL_X[col], ROW_Y[row]];
}

function drawUnit(ctx: CanvasRenderingContext2D, id: UnitId, star: number, x: number, y: number, side: 0 | 1, hpFrac: number, flash: boolean, picked: boolean, lunge: [number, number]): void {
  const r = id === "boss" ? 30 : 24;
  ctx.save();
  ctx.translate(x + lunge[0], y + lunge[1]);
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.beginPath();
  ctx.ellipse(0, r * 0.9, r * 0.9, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = flash ? "#ffe3e3" : side === 0 ? "#e7f5ff" : "#fff4e6";
  ctx.strokeStyle = picked ? "#f59f00" : side === 0 ? "#1c7ed6" : "#e8590c";
  ctx.lineWidth = picked ? 4 : 3;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.font = `${id === "boss" ? 30 : 24}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(EMOJI[id], 0, 1);
  if (star > 1) {
    ctx.font = "bold 12px system-ui, sans-serif";
    ctx.fillStyle = "#f59f00";
    ctx.fillText("★".repeat(star - 1), 0, -r - 6);
  }
  if (hpFrac < 1) {
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(-r, r + 4, r * 2, 5);
    ctx.fillStyle = hpFrac > 0.5 ? "#40c057" : hpFrac > 0.25 ? "#fab005" : "#fa5252";
    ctx.fillRect(-r, r + 4, r * 2 * Math.max(0, hpFrac), 5);
  }
  ctx.restore();
}

export default function MarketMercenaries({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const names = NAMES[locale] ?? NAMES.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [run, setRun] = useState<RunState>(() => newRun(1));
  const [picked, setPicked] = useState<Slot | null>(null);
  const [phase, setPhase] = useState<"shop" | "battle" | "result">("shop");
  const [result, setResult] = useState<boolean | null>(null);
  const [muted, setMuted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const battleRef = useRef<Battle | null>(null);
  const floatRef = useRef<Array<{ x: number; y: number; text: string; color: string; t: number }>>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);

  const finished = run.status !== "shop";
  useRunRecord(MERC_SLUG, finished, runScore(run));

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  useEffect(() => {
    setRun(newRun(Math.floor(Math.random() * 1e9)));
    const m = readMutedPref(MUTE_KEY);
    setMuted(m);
    cues.current = createCuePlayer({ cues: RETRO_8BIT_CUES, muted: m });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => cues.current?.close();
  }, []);

  const rival = useMemo(() => enemyBand(run.round), [run.round]);

  // drawing loop (also runs the battle)
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const ctx = canvasRef.current?.getContext("2d");
      const b = battleRef.current;
      if (b && phase === "battle") {
        for (let k = 0; k < 3; k++) {
          const evs = stepBattle(b, dt / 2);
          for (const e of evs) {
            const f = b.fighters[e.to];
            const [x, y] = slotPos(f.side as 0 | 1, f.slot);
            if (e.kind === "hit") floatRef.current.push({ x, y: y - 20, text: `-${Math.round(e.amount)}`, color: "#e03131", t: 0.8 });
            if (e.kind === "heal" && e.amount >= 1) floatRef.current.push({ x, y: y - 20, text: `+${Math.round(e.amount)}`, color: "#2f9e44", t: 0.8 });
          }
          if (evs.some((e) => e.kind === "down")) cues.current?.play("place");
          if (b.winner !== null) break;
        }
        if (b.winner !== null) {
          const won = b.winner === 0;
          setResult(won);
          setPhase("result");
          sfx(won ? "success" : "fail");
        }
      }
      if (ctx) {
        ctx.clearRect(0, 0, W, H);
        const grd = ctx.createLinearGradient(0, 0, 0, H);
        grd.addColorStop(0, "#ffe8cc");
        grd.addColorStop(0.5, "#fff9db");
        grd.addColorStop(1, "#d3f9d8");
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = "rgba(0,0,0,0.12)";
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(10, H / 2 - 4);
        ctx.lineTo(W - 10, H / 2 - 4);
        ctx.stroke();
        ctx.setLineDash([]);
        // empty slot marks for the player's side
        for (let s = 0; s < FIELD_SIZE; s++) {
          const [x, y] = slotPos(0, s);
          ctx.strokeStyle = picked && phase === "shop" ? "rgba(245,159,0,0.7)" : "rgba(0,0,0,0.15)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x, y, 26, 0, Math.PI * 2);
          ctx.stroke();
        }
        if (b && phase !== "shop") {
          b.fighters.forEach((f) => {
            if (f.hp <= 0) return;
            const [x, y] = slotPos(f.side as 0 | 1, f.slot);
            let lunge: [number, number] = [0, 0];
            if (f.acted < 0.15 && f.target >= 0) {
              const t = b.fighters[f.target];
              const [tx, ty] = slotPos(t.side as 0 | 1, t.slot);
              const k = (1 - f.acted / 0.15) * (f.ranged ? 4 : 14);
              const d = Math.hypot(tx - x, ty - y) || 1;
              lunge = [((tx - x) / d) * k, ((ty - y) / d) * k];
            }
            drawUnit(ctx, f.id, f.star, x, y, f.side as 0 | 1, f.hp / f.maxHp, f.flash > 0, false, lunge);
          });
        } else {
          rival.forEach((m, s) => { if (m) { const [x, y] = slotPos(1, s); drawUnit(ctx, m.id, m.star, x, y, 1, 1, false, false, [0, 0]); } });
          run.field.forEach((m, s) => {
            if (!m) return;
            const [x, y] = slotPos(0, s);
            drawUnit(ctx, m.id, m.star, x, y, 0, 1, false, picked?.where === "field" && picked.i === s, [0, 0]);
          });
        }
        floatRef.current = floatRef.current.filter((f) => (f.t -= dt) > 0);
        ctx.font = "bold 14px system-ui, sans-serif";
        ctx.textAlign = "center";
        for (const f of floatRef.current) {
          ctx.globalAlpha = Math.min(1, f.t * 2);
          ctx.fillStyle = f.color;
          ctx.fillText(f.text, f.x, f.y - (0.8 - f.t) * 30);
        }
        ctx.globalAlpha = 1;
        ctx.font = "12px system-ui, sans-serif";
        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.textAlign = "left";
        ctx.fillText(c.rival, 8, 14);
        ctx.fillText(c.you, 8, H - 8);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase, run, picked, rival, c, sfx]);

  const tapSlot = (slot: Slot) => {
    if (phase !== "shop" || run.status !== "shop") return;
    const arr = slot.where === "field" ? run.field : run.bench;
    if (!picked) {
      if (arr[slot.i]) { setPicked(slot); sfx("tap"); }
      return;
    }
    if (picked.where === slot.where && picked.i === slot.i) { setPicked(null); return; }
    const next = place(run, picked, slot);
    if (next === run) { sfx("fail"); if (arr[slot.i]) setPicked(slot); return; }
    setRun(next);
    setPicked(null);
    sfx("place");
  };

  const onCanvas = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const y = ((e.clientY - rect.top) / rect.height) * H;
    for (let s = 0; s < FIELD_SIZE; s++) {
      const [sx, sy] = slotPos(0, s);
      if (Math.hypot(x - sx, y - sy) < 34) { tapSlot({ where: "field", i: s }); return; }
    }
  };

  const doBuy = (i: number) => {
    const id = run.shop[i];
    if (!id) return;
    const before = [...run.field, ...run.bench].filter(Boolean).map((m) => m!.star).join("");
    const next = buy(run, i);
    if (next === run) { sfx("fail"); return; }
    setRun(next);
    setPicked(null);
    const after = [...next.field, ...next.bench].filter(Boolean).map((m) => m!.star).join("");
    sfx(after.length < before.length + 1 ? "combo" : "tap");
  };

  const doReroll = () => {
    const next = reroll(run);
    if (next === run) { sfx("fail"); return; }
    setRun(next);
    sfx("tap");
  };

  const doSell = () => {
    if (!picked) return;
    setRun(sell(run, picked));
    setPicked(null);
    sfx("place");
  };

  const doFight = () => {
    if (!fieldCount(run)) { sfx("fail"); return; }
    setPicked(null);
    battleRef.current = startBattle(run.field, rival);
    floatRef.current = [];
    setResult(null);
    setPhase("battle");
    sfx("tap");
  };

  const doNext = () => {
    if (result === null) return;
    const next = afterFight(run, result);
    setRun(next);
    battleRef.current = null;
    setPhase("shop");
    if (next.status === "won") sfx("win");
    else if (next.status === "lost") sfx("lose");
  };

  const restart = () => {
    setRun(newRun(Math.floor(Math.random() * 1e9)));
    battleRef.current = null;
    setPhase("shop");
    setPicked(null);
    setResult(null);
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    cues.current?.setMuted(next);
    writeMutedPref(MUTE_KEY, next);
  };

  const counts = guildCounts(run.field);
  const pickedMerc: Merc | null = picked ? (picked.where === "field" ? run.field : run.bench)[picked.i] : null;
  const heartsLost = isBossRound(run.round) ? 2 : 1;

  return (
    <div
      ref={containerRef}
      data-game="market-mercenaries"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.round, run.round + 1, ROUND_COUNT)}{isBossRound(run.round) ? ` · ${c.boss}` : ""}</Badge>
        <Badge variant="outline"><Heart className="size-3.5 text-destructive" />{run.hearts}</Badge>
        <Badge variant="outline"><Coins className="size-3.5 text-warning" />{fill(c.gold, run.gold)}</Badge>
        <Badge variant="outline">{fill(c.wins, run.wins)}</Badge>
        <div className="ml-auto flex gap-1">
          <Button variant="ghost" size="icon" className="size-11" onClick={toggleMute} aria-label={muted ? c.unmute : c.mute}>
            {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
          </Button>
          <Button variant="ghost" size="icon" className="size-11" onClick={togglePortal} aria-label={isImmersive ? c.exitFull : c.full}>
            {isImmersive ? <Minimize2 className="size-5" /> : <Maximize2 className="size-5" />}
          </Button>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        onPointerDown={onCanvas}
        className="mx-auto block w-full max-w-md touch-none select-none rounded-xl border border-border"
        aria-label={c.help}
      />

      {phase === "result" && result !== null ? (
        <div className="space-y-2 rounded-lg border border-primary/40 bg-primary/10 p-3 text-center" role="status">
          <p className="text-lg font-bold">{result ? c.won : fill(c.lost, heartsLost)}</p>
          <Button className="min-h-12 w-full" onClick={doNext}>{c.next}</Button>
        </div>
      ) : null}

      {run.status !== "shop" ? (
        <div className="space-y-2 rounded-lg border border-primary/40 bg-primary/10 p-3 text-center" role="status">
          <p className="text-lg font-bold">{run.status === "won" ? c.runWon : c.runLost}</p>
          <p className="text-sm">{fill(c.wins, run.wins)} · {fill(c.score, runScore(run))}</p>
          <Button className="min-h-12 w-full" onClick={restart}>{c.again}</Button>
        </div>
      ) : null}

      {phase === "shop" && run.status === "shop" ? (
        <>
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="font-medium">{fill(c.cap, fieldCount(run), fieldCap(run.round))}</span>
            {GUILDS.map((g) => {
              const lv = guildLevel(counts[g]);
              return (
                <span key={g} title={c.bonus[g]} className={`rounded-full border px-2 py-0.5 ${lv ? "border-primary bg-primary/10 font-semibold" : "border-border text-muted-foreground"}`}>
                  {GUILD_EMOJI[g]} {c.guilds[g]} {counts[g]}/3
                </span>
              );
            })}
          </div>

          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">{c.bench}{picked ? ` · ${c.pick}` : ""}</p>
            <div className="grid grid-cols-4 gap-1.5">
              {Array.from({ length: BENCH_SIZE }, (_, i) => {
                const m = run.bench[i];
                const on = picked?.where === "bench" && picked.i === i;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => tapSlot({ where: "bench", i })}
                    className={`flex min-h-14 flex-col items-center justify-center rounded-lg border text-xs ${on ? "border-warning bg-warning/10" : "border-border bg-card"}`}
                    aria-label={m ? `${names[m.id]} ${"★".repeat(m.star)}` : c.bench}
                  >
                    {m ? (
                      <>
                        <span className="text-xl leading-none">{EMOJI[m.id]}</span>
                        <span className="text-warning">{"★".repeat(m.star)}</span>
                      </>
                    ) : <span className="text-muted-foreground">·</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">{c.shop}</p>
            <div className="grid grid-cols-5 gap-1.5">
              {run.shop.map((id, i) => (
                <button
                  key={i}
                  type="button"
                  disabled={!id || run.gold < costOf(id)}
                  onClick={() => doBuy(i)}
                  className={`flex min-h-20 flex-col items-center justify-center gap-0.5 rounded-lg border-2 bg-card px-0.5 text-center disabled:opacity-40 ${TIER_CLASS[id ? UNITS[id].tier : 0]}`}
                  aria-label={id ? `${names[id]}, ${costOf(id)}` : ""}
                >
                  {id ? (
                    <>
                      <span className="text-xl leading-none">{EMOJI[id]}</span>
                      <span className="line-clamp-2 text-xs leading-tight">{names[id]}</span>
                      <span className="text-xs font-semibold text-warning">{GUILD_EMOJI[UNITS[id].guild!]} {costOf(id)}</span>
                    </>
                  ) : null}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" className="min-h-12" onClick={doReroll} disabled={run.gold < REROLL_COST}>
              <RefreshCw className="size-4" />
              <span>{fill(c.reroll, REROLL_COST)}</span>
            </Button>
            <Button variant="outline" className="min-h-12" onClick={doSell} disabled={!pickedMerc}>
              <Trash2 className="size-4" />
              <span>{fill(c.sell, pickedMerc ? sellValue(pickedMerc) : 0)}</span>
            </Button>
            <Button className="min-h-12" onClick={doFight} disabled={!fieldCount(run)}>
              <Swords className="size-4" />
              <span>{c.fight}</span>
            </Button>
          </div>
        </>
      ) : null}

      <p className="text-xs text-muted-foreground">{c.help}</p>
    </div>
  );
}
