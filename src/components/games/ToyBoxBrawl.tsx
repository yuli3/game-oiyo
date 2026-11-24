import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, RotateCcw, Swords, Volume2, VolumeX } from "lucide-react";
import StageBar from "./StageBar";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import { RETRO_8BIT_CUES, createCuePlayer, readMutedPref, writeMutedPref, type CoreCue, type CuePlayer } from "../../lib/games/game-audio";
import { createHaptics, readHapticsEnabled, type Haptics } from "../../lib/games/haptics";
import { useRunRecord } from "../../lib/games/use-run-record";
import { finaleLabel, loadClearedStages, markStageCleared, nextOpenStage } from "../../lib/games/stage-progress";
import { normalizeGameLocale } from "../../lib/games/game-text";
import { drawParticles, drawSprite, spawnBurst, stepParticles, type PixelArt, type PixelParticle } from "../../lib/games/pixel-kit";
import { MAX_LINE, SPECS, STAGE_COUNT, TOY_SLUG, TOY_STAGES, battle, starsFor, toy, type BattleResult, type Kind, type Toy } from "../../lib/games/toy-box-brawl";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const NAMES: Record<L, Record<Kind, string>> = {
  ko: { soldier: "병정", teddy: "곰인형", catapult: "투석기", robot: "태엽 로봇", drum: "북치기", knight: "기사", rocket: "로켓", doll: "오뚝이" },
  en: { soldier: "Soldier", teddy: "Teddy", catapult: "Catapult", robot: "Wind-up robot", drum: "Drummer", knight: "Knight", rocket: "Rocket", doll: "Roly-poly" },
  ja: { soldier: "兵隊", teddy: "テディ", catapult: "投石機", robot: "ぜんまいロボ", drum: "太鼓たたき", knight: "騎士", rocket: "ロケット", doll: "起き上がり" },
  zh: { soldier: "士兵", teddy: "泰迪熊", catapult: "投石车", robot: "发条机器人", drum: "鼓手", knight: "骑士", rocket: "火箭", doll: "不倒翁" },
  fr: { soldier: "Soldat", teddy: "Nounours", catapult: "Catapulte", robot: "Robot", drum: "Tambour", knight: "Chevalier", rocket: "Fusée", doll: "Culbuto" },
  es: { soldier: "Soldado", teddy: "Osito", catapult: "Catapulta", robot: "Robot", drum: "Tambor", knight: "Caballero", rocket: "Cohete", doll: "Tentetieso" },
};

const COPY: Record<L, {
  stage: string; coins: string; enemy: string; mine: string; shelf: string; fight: string; start: string; win: string; lose: string; result: string; again: string; rearrange: string; next: string;
  lob: string; drum: string; pass: string; rise: string; fall: string;
  help: string; stages: string; full: string; exitFull: string; mute: string; unmute: string;
}> = {
  ko: {
    stage: "{0}단계", coins: "동전 {0}", enemy: "상대 상자", mine: "내 줄 (앞 → 뒤)", shelf: "진열대", fight: "싸우기", start: "진열대에서 장난감을 사서 줄을 세워요!", win: "이겼어요!", lose: "졌어요", result: "살아남은 장난감 {0} / 최고 {1}",
    again: "처음부터", rearrange: "다시 짜기", next: "다음 단계",
    lob: "투석기가 맨 뒤를 맞혀요!", drum: "북소리에 공격 +1!", pass: "로봇이 힘을 넘겨줘요 +2/+2", rise: "오뚝이가 다시 일어나요!", fall: "쓰러졌어요",
    help: "진열대의 장난감을 눌러 동전으로 사면 내 줄 끝에 서요(최대 5개). 줄의 장난감을 하나 누르고 다른 장난감을 누르면 자리가 바뀌고, 고른 장난감을 한 번 더 누르면 진열대로 돌려보내 동전을 돌려받아요. '싸우기'를 누르면 전투는 저절로 흘러가요. 맨 앞끼리 동시에 공격을 주고받고, 쓰러지면 다음 장난감이 나서요. 투석기는 시작할 때 상대 맨 뒤에 3을 던지고, 북치기는 시작할 때 우리 편 모두의 공격을 1 올려요. 태엽 로봇은 쓰러지면 바로 뒤 장난감에게 +2/+2를 넘기고, 기사의 방패는 첫 공격을 막고, 오뚝이는 한 번 다시 일어나요. 살아남은 장난감이 많을수록 별이 늘어요. 키보드: 1~8 사기, 화살표로 고르고 옮기기, Backspace 돌려보내기, Enter 싸우기.",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", coins: "{0} coins", enemy: "Enemy box", mine: "Your line (front → back)", shelf: "Shelf", fight: "Fight", start: "Buy toys from the shelf and line them up!", win: "You win!", lose: "You lost", result: "Toys standing {0} / best {1}",
    again: "Start over", rearrange: "Rearrange", next: "Next stage",
    lob: "The catapult hits their back toy!", drum: "Drums: +1 attack!", pass: "The robot hands on +2/+2", rise: "The roly-poly stands back up!", fall: "Down!",
    help: "Tap a toy on the shelf to buy it with coins; it joins the back of your line (five at most). Tap a toy in your line, then another, to swap them; tap the chosen one again to send it back to the shelf for a refund. Press Fight and the battle plays itself. The two front toys hit each other at the same time; when one falls, the next steps up. A catapult throws 3 at the enemy's back toy as the battle starts; a drummer gives every friend +1 attack. A wind-up robot hands +2/+2 to the toy behind it when it falls, a knight's shield blocks the first hit, and a roly-poly stands back up once. The more toys still standing, the more stars. Keyboard: 1–8 buy, arrows pick and move, Backspace send back, Enter fight.",
    stages: "Choose a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "{0}面", coins: "コイン {0}", enemy: "相手の箱", mine: "自分の列（前 → 後ろ）", shelf: "棚", fight: "戦う", start: "棚のおもちゃを買って並べよう！", win: "勝った！", lose: "負けた", result: "残ったおもちゃ {0} / 最高 {1}",
    again: "最初から", rearrange: "並べ直す", next: "次の面",
    lob: "投石機が一番後ろに命中！", drum: "太鼓で攻撃 +1！", pass: "ロボが力を渡す +2/+2", rise: "起き上がりが立ち上がった！", fall: "倒れた",
    help: "棚のおもちゃを押してコインで買うと、自分の列の最後に並びます（最大5体）。列のおもちゃを押してから別のおもちゃを押すと入れ替わり、選んだものをもう一度押すと棚に戻してコインが返ります。「戦う」を押すと戦いは自動で進みます。先頭どうしが同時に攻撃し合い、倒れると次が前に出ます。投石機は開始時に相手の一番後ろへ3、太鼓たたきは開始時に味方全員の攻撃を+1。ぜんまいロボは倒れると後ろのおもちゃに+2/+2を渡し、騎士の盾は最初の攻撃を防ぎ、起き上がりは一度だけ立ち上がります。残ったおもちゃが多いほど星が増えます。キーボード：1〜8で購入、矢印で選択と移動、Backspaceで戻す、Enterで戦う。",
    stages: "ステージ選択", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关", coins: "金币 {0}", enemy: "对手的箱子", mine: "我的队列（前 → 后）", shelf: "货架", fight: "开战", start: "从货架买玩具排好队！", win: "赢了！", lose: "输了", result: "存活玩具 {0} / 最高 {1}",
    again: "从头开始", rearrange: "重新排列", next: "下一关",
    lob: "投石车砸中对方最后一个！", drum: "鼓声：攻击 +1！", pass: "机器人传力 +2/+2", rise: "不倒翁又站起来了！", fall: "倒下了",
    help: "点货架上的玩具用金币买下，它会排到你队列的末尾（最多5个）。先点队列里的一个玩具再点另一个即可交换位置；再点一次选中的玩具，会退回货架并返还金币。点“开战”后战斗自动进行：最前面的两个玩具同时互相攻击，倒下后由下一个顶上。投石车开局向对方最后一个玩具扔3点伤害，鼓手开局让己方全体攻击+1。发条机器人倒下时把+2/+2传给身后的玩具，骑士的盾挡住第一次攻击，不倒翁能再站起来一次。存活的玩具越多星越多。键盘：1到8购买，方向键选择和移动，Backspace退回，Enter开战。",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", coins: "{0} pièces", enemy: "Boîte adverse", mine: "Votre ligne (avant → arrière)", shelf: "Étagère", fight: "Combattre", start: "Achetez des jouets sur l'étagère et alignez-les !", win: "Victoire !", lose: "Défaite", result: "Jouets debout {0} / record {1}",
    again: "Recommencer", rearrange: "Réorganiser", next: "Niveau suivant",
    lob: "La catapulte touche leur dernier jouet !", drum: "Tambour : +1 attaque !", pass: "Le robot transmet +2/+2", rise: "Le culbuto se relève !", fall: "À terre !",
    help: "Touchez un jouet de l'étagère pour l'acheter : il rejoint l'arrière de votre ligne (cinq au plus). Touchez un jouet de la ligne puis un autre pour les échanger ; touchez de nouveau le jouet choisi pour le rendre et récupérer vos pièces. Appuyez sur Combattre et le combat se joue seul. Les deux jouets de tête frappent en même temps ; quand l'un tombe, le suivant avance. La catapulte lance 3 sur le dernier jouet adverse au début ; le tambour donne +1 attaque à tous ses amis. Le robot transmet +2/+2 au jouet derrière lui en tombant, le bouclier du chevalier bloque le premier coup, et le culbuto se relève une fois. Plus il reste de jouets debout, plus d'étoiles. Clavier : 1–8 acheter, flèches choisir et déplacer, Retour arrière rendre, Entrée combattre.",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", coins: "{0} monedas", enemy: "Caja rival", mine: "Tu fila (delante → detrás)", shelf: "Estante", fight: "Luchar", start: "¡Compra juguetes del estante y ponlos en fila!", win: "¡Ganaste!", lose: "Perdiste", result: "Juguetes en pie {0} / mejor {1}",
    again: "Empezar de nuevo", rearrange: "Reordenar", next: "Siguiente nivel",
    lob: "¡La catapulta acierta a su último juguete!", drum: "Tambor: ¡+1 de ataque!", pass: "El robot pasa +2/+2", rise: "¡El tentetieso se levanta!", fall: "¡Cayó!",
    help: "Toca un juguete del estante para comprarlo con monedas; se pone al final de tu fila (cinco como mucho). Toca un juguete de la fila y luego otro para intercambiarlos; toca otra vez el elegido para devolverlo al estante y recuperar las monedas. Pulsa Luchar y el combate se juega solo. Los dos juguetes de delante se golpean a la vez; cuando uno cae, avanza el siguiente. La catapulta lanza 3 al último juguete rival al empezar; el tambor da +1 de ataque a todos sus amigos. El robot pasa +2/+2 al juguete de detrás al caer, el escudo del caballero para el primer golpe y el tentetieso se levanta una vez. Cuantos más juguetes queden en pie, más estrellas. Teclado: 1–8 comprar, flechas elegir y mover, Retroceso devolver, Intro luchar.",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const SPRITES: Record<Kind, PixelArt> = {
  soldier: { palette: { r: "#e03131", s: "#ffd8a8", k: "#212529", b: "#1971c2", y: "#fab005" }, rows: ["..rrrr..", "..rrrr..", "..ssss..", "..sksk..", "..ssss..", ".bbybb..", ".bbybb..", "..k..k.."] },
  teddy: { palette: { n: "#9c6b4e", l: "#d9a066", k: "#212529" }, rows: [".nn..nn.", "nnnnnnnn", "nknnnnkn", "nnnllnnn", "nnnkknnn", ".nnnnnn.", "nnllllnn", ".nn..nn."] },
  catapult: { palette: { w: "#a87545", g: "#868e96", k: "#212529" }, rows: ["......gg", ".....wgg", "....w...", "...w....", "..w.....", "wwwwwwww", "w.w..w.w", ".k....k."] },
  robot: { palette: { g: "#adb5bd", d: "#495057", c: "#22b8cf" }, rows: ["...dd...", "gggggggg", "gcggggcg", "gggggggg", "gddddddg", ".gggggg.", ".g....g.", ".d....d."] },
  drum: { palette: { r: "#e03131", w: "#f8f9fa", y: "#fab005" }, rows: ["y......y", ".y....y.", "wwwwwwww", "rrrrrrrr", "ryryryry", "rrrrrrrr", "wwwwwwww", "........"] },
  knight: { palette: { s: "#ced4da", d: "#495057", b: "#1971c2" }, rows: ["..ssss..", ".ssddss.", ".ssssss.", "..ssss..", "bbsssss.", "bbbssss.", "bb.ss.s.", "..d..d.."] },
  rocket: { palette: { w: "#f8f9fa", r: "#e03131", o: "#fd7e14", d: "#1c7ed6" }, rows: ["...rr...", "..wwww..", "..wddw..", "..wwww..", "..wwww..", ".rwwwwr.", "rr.oo.rr", "...oo..."] },
  doll: { palette: { r: "#e03131", s: "#ffd8a8", k: "#212529" }, rows: ["...rr...", "..ssss..", "..ksks..", "..ssss..", ".rrrrrr.", "rrrrrrrr", "rrrrrrrr", ".rrrrrr."] },
};

const MUTE_KEY = "oiyo:toy-box-brawl:muted";
const W = 360;
const H = 560;
const SLOT = 62;
const lineX = (i: number) => 32 + i * 74; // slot centres, front (left) to back
const shelfBox = (i: number) => ({ x: 8 + (i % 4) * 87, y: 418 + Math.floor(i / 4) * 66, w: 82, h: 60 });

type Phase = "shop" | "fight" | "done";

export default function ToyBoxBrawl({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [line, setLine] = useState<number[]>([]); // offer indices, front first
  const [phase, setPhase] = useState<Phase>("shop");
  const [over, setOver] = useState<null | { won: boolean; stars: number; left: number }>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lineRef = useRef<number[]>([]);
  lineRef.current = line;
  const phaseRef = useRef<Phase>("shop");
  phaseRef.current = phase;
  const selected = useRef(-1);
  const fightRef = useRef<{ r: BattleResult; at: number; t: number } | null>(null);
  const parts = useRef<PixelParticle[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const copyRef = useRef(c);
  copyRef.current = c;
  const namesRef = useRef(NAMES[locale] ?? NAMES.en);
  namesRef.current = NAMES[locale] ?? NAMES.en;
  const stageRef = useRef(0);
  stageRef.current = stage;
  const st = TOY_STAGES[stage];
  const spent = line.reduce((s, i) => s + SPECS[st.shop[i]].cost, 0);

  useRunRecord(TOY_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number, keep = false) => {
    setStage(s);
    if (!keep) setLine([]);
    selected.current = -1;
    fightRef.current = null;
    parts.current = [];
    setPhase("shop");
    setOver(null);
  }, []);

  useEffect(() => {
    const doneStages = loadClearedStages(TOY_SLUG, STAGE_COUNT);
    setCleared(doneStages);
    start(nextOpenStage(doneStages, STAGE_COUNT));
    const mu = readMutedPref(MUTE_KEY);
    setMuted(mu);
    cues.current = createCuePlayer({ cues: RETRO_8BIT_CUES, muted: mu });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => cues.current?.close();
  }, [start]);

  const buy = useCallback((i: number) => {
    const s = TOY_STAGES[stageRef.current];
    const cur = lineRef.current;
    const used = cur.reduce((a, k) => a + SPECS[s.shop[k]].cost, 0);
    if (phaseRef.current !== "shop" || i >= s.shop.length || cur.includes(i) || cur.length >= MAX_LINE || used + SPECS[s.shop[i]].cost > s.coins) {
      sfx("fail");
      return;
    }
    setLine([...cur, i]);
    sfx("place");
  }, [sfx]);

  const pickSlot = useCallback((j: number) => {
    const cur = lineRef.current;
    if (phaseRef.current !== "shop" || j >= cur.length) return;
    const sel = selected.current;
    if (sel === j) {
      setLine(cur.filter((_, k) => k !== j));
      selected.current = -1;
      sfx("tap");
    } else if (sel >= 0 && sel < cur.length) {
      const nx = cur.slice();
      [nx[sel], nx[j]] = [nx[j], nx[sel]];
      setLine(nx);
      selected.current = -1;
      sfx("place");
    } else {
      selected.current = j;
      sfx("tap");
    }
  }, [sfx]);

  const fight = useCallback(() => {
    const s = TOY_STAGES[stageRef.current];
    const cur = lineRef.current;
    if (phaseRef.current !== "shop" || !cur.length) return;
    const r = battle(cur.map((i) => toy(s.shop[i])), s.enemy, true);
    fightRef.current = { r, at: 0, t: 0 };
    selected.current = -1;
    setPhase("fight");
    sfx("combo");
  }, [sfx]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const drawToy = (ctx: CanvasRenderingContext2D, t: Toy, x: number, y: number, flip: boolean, glow: boolean, dim: boolean) => {
      ctx.globalAlpha = dim ? 0.3 : 1;
      if (glow) {
        ctx.fillStyle = "rgba(255,212,59,0.35)";
        ctx.fillRect(x - SLOT / 2, y - SLOT / 2, SLOT, SLOT);
      }
      drawSprite(ctx, SPRITES[t.kind], x, y - 6, { scale: 5, flipX: flip });
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffd43b";
      ctx.fillText(`⚔${t.atk}`, x - 14, y + 34);
      ctx.fillStyle = "#ff8787";
      ctx.fillText(`♥${Math.max(0, t.hp)}`, x + 14, y + 34);
      ctx.globalAlpha = 1;
    };
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const s = TOY_STAGES[stageRef.current];
      const cp = copyRef.current;
      const names = namesRef.current;
      const f = fightRef.current;
      let shown: [Toy[], Toy[]] = [lineRef.current.map((i) => toy(s.shop[i])), s.enemy];
      let caption = "";
      let hot: { side: number; index: number } | null = null;
      if (f) {
        f.t += dt;
        while (f.t > 0.45 && f.at < f.r.frames.length - 1) {
          f.t -= 0.45;
          f.at++;
          const ev = f.r.frames[f.at].ev;
          const x = lineX(ev.index);
          const y = ev.side === 0 ? 300 : 150;
          if (ev.kind === "hit" && ev.index >= 0) spawnBurst(parts.current, x, y, ["#fff", "#ffd43b"], 4, 60, 2);
          if (ev.kind === "fall") {
            spawnBurst(parts.current, x, y, ["#ff6b6b", "#fff"], 10, 100, 3);
            sfx("tap");
          }
          if (ev.kind === "lob" || ev.kind === "drum" || ev.kind === "pass" || ev.kind === "rise") sfx("success");
        }
        const fr = f.r.frames[f.at];
        shown = fr.lines;
        const ev = fr.ev;
        if (ev.index >= 0) hot = { side: ev.side, index: ev.index };
        caption = ev.kind === "hit" ? "" : cp[ev.kind];
        if (f.at >= f.r.frames.length - 1 && f.t > 0.6 && phaseRef.current === "fight") {
          const stars = starsFor(s, f.r);
          setOver({ won: f.r.won, stars, left: f.r.left });
          setPhase("done");
          if (f.r.won) {
            setCleared(markStageCleared(TOY_SLUG, s.stage, STAGE_COUNT));
            spawnBurst(parts.current, W / 2, 230, ["#ffd43b", "#fff", "#e03131", "#1971c2"], 30, 150, 3);
            sfx("win");
          } else sfx("lose");
        }
      }
      stepParticles(parts.current, dt, 120);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = "#2b2140";
        ctx.fillRect(0, 0, W, H);
        // the toy-box floor between the two lines
        ctx.fillStyle = "#3b2f57";
        ctx.fillRect(0, 196, W, 70);
        ctx.fillStyle = "#c9a27a";
        ctx.fillRect(0, 106, W, 6);
        ctx.fillRect(0, 352, W, 6);
        ctx.font = "bold 12px sans-serif";
        ctx.textAlign = "left";
        ctx.fillStyle = "#e5dbff";
        ctx.fillText(cp.enemy, 10, 100);
        ctx.fillText(cp.mine, 10, 374);
        ctx.textAlign = "right";
        ctx.fillText(fill(cp.coins, s.coins - lineRef.current.reduce((a, k) => a + SPECS[s.shop[k]].cost, 0)), W - 10, 374);
        // enemy line above, front on the left like yours
        shown[1].forEach((t, i) => drawToy(ctx, t, lineX(i), 150, true, hot?.side === 1 && hot.index === i, t.hp <= 0));
        // my line, front on the left
        shown[0].forEach((t, i) => drawToy(ctx, t, lineX(i), 300, false, (hot?.side === 0 && hot.index === i) || (!f && selected.current === i), t.hp <= 0));
        if (!f)
          for (let i = shown[0].length; i < MAX_LINE; i++) {
            ctx.strokeStyle = "rgba(229,219,255,0.3)";
            ctx.strokeRect(lineX(i) - 26, 270, 52, 52);
          }
        if (caption) {
          ctx.font = "bold 15px sans-serif";
          ctx.textAlign = "center";
          ctx.fillStyle = "#ffd43b";
          ctx.fillText(caption, W / 2, 238);
        }
        // the shelf
        ctx.fillStyle = "#4a3b6b";
        ctx.fillRect(0, 384, W, H - 384);
        ctx.font = "bold 12px sans-serif";
        ctx.textAlign = "left";
        ctx.fillStyle = "#e5dbff";
        ctx.fillText(cp.shelf, 10, 404);
        s.shop.forEach((k, i) => {
          const b = shelfBox(i);
          const bought = lineRef.current.includes(i);
          ctx.globalAlpha = bought ? 0.3 : 1;
          ctx.fillStyle = "#5f4b8b";
          ctx.fillRect(b.x, b.y, b.w, b.h);
          drawSprite(ctx, SPRITES[k], b.x + 22, b.y + 26, { scale: 4 });
          ctx.fillStyle = "#ffd43b";
          ctx.font = "bold 13px sans-serif";
          ctx.textAlign = "left";
          ctx.fillText(`●${SPECS[k].cost}`, b.x + 46, b.y + 22);
          ctx.fillStyle = "#e5dbff";
          ctx.font = "11px sans-serif";
          ctx.fillText(`${SPECS[k].atk}/${SPECS[k].hp}`, b.x + 46, b.y + 38);
          ctx.fillText(names[k].slice(0, 6), b.x + 4, b.y + 56);
          ctx.fillStyle = "rgba(255,255,255,0.4)";
          ctx.fillText(String(i + 1), b.x + b.w - 10, b.y + 12);
          ctx.globalAlpha = 1;
        });
        drawParticles(ctx, parts.current);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx]);

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (phaseRef.current !== "shop") return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) * W) / r.width;
    const y = ((e.clientY - r.top) * H) / r.height;
    const s = TOY_STAGES[stageRef.current];
    const offer = s.shop.findIndex((_, i) => {
      const b = shelfBox(i);
      return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
    });
    if (offer >= 0) return buy(offer);
    if (y > 262 && y < 345) {
      const j = Math.round((x - 32) / 74);
      if (j >= 0 && j < MAX_LINE) pickSlot(j);
    }
  };

  const onKey = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (phaseRef.current !== "shop") return;
    const n = Number(e.key);
    const cur = lineRef.current;
    if (n >= 1 && n <= 8) buy(n - 1);
    else if (e.key === "Enter") {
      e.preventDefault();
      fight();
    } else if (e.key === "Backspace" && selected.current >= 0) {
      e.preventDefault();
      pickSlot(selected.current);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      if (!cur.length) return;
      const step = e.key === "ArrowRight" ? 1 : -1;
      if (selected.current < 0) selected.current = 0;
      else {
        const to = selected.current + step;
        if (to >= 0 && to < cur.length) {
          const nx = cur.slice();
          [nx[selected.current], nx[to]] = [nx[to], nx[selected.current]];
          setLine(nx);
          selected.current = to;
        }
      }
    } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      if (cur.length) selected.current = (Math.max(0, selected.current) + (e.key === "ArrowDown" ? 1 : -1) + cur.length) % cur.length;
    }
  };

  const toggleMute = () => {
    const nx = !muted;
    setMuted(nx);
    cues.current?.setMuted(nx);
    writeMutedPref(MUTE_KEY, nx);
  };

  return (
    <div
      ref={containerRef}
      data-game="toy-box-brawl"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.coins, st.coins - spent)}</Badge>
        <div className="ml-auto flex gap-1">
          <Button variant="ghost" size="icon" className="size-11" onClick={() => start(stage)} aria-label={c.again}>
            <RotateCcw className="size-5" />
          </Button>
          <Button variant="ghost" size="icon" className="size-11" onClick={toggleMute} aria-label={muted ? c.unmute : c.mute}>
            {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
          </Button>
          <Button variant="ghost" size="icon" className="size-11" onClick={togglePortal} aria-label={isImmersive ? c.exitFull : c.full}>
            {isImmersive ? <Minimize2 className="size-5" /> : <Maximize2 className="size-5" />}
          </Button>
        </div>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          tabIndex={0}
          onPointerDown={onDown}
          onKeyDown={onKey}
          className="pixelated mx-auto block h-auto w-full max-w-sm touch-none select-none rounded-2xl border-4 border-border"
          aria-label={c.help}
        />
        {phase === "shop" && !line.length ? (
          <div className="pointer-events-none absolute inset-x-4 top-52 text-center" aria-hidden="true">
            <span className="inline-block rounded-2xl bg-background/85 px-4 py-2 text-base font-bold shadow">{c.start}</span>
          </div>
        ) : null}
        {over ? (
          <div className="absolute inset-x-4 top-1/4 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{over.won ? c.win : c.lose}</p>
            <p className="text-sm text-muted-foreground">{fill(c.result, over.left, st.best)}</p>
            {over.won ? <p className="text-2xl tracking-widest text-warning" aria-label={`${over.stars}/3`}>{"★".repeat(over.stars)}{"☆".repeat(3 - over.stars)}</p> : null}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="min-h-12" onClick={() => start(stage, true)}>
                <RotateCcw className="size-4" />
                <span>{c.rearrange}</span>
              </Button>
              <Button className="min-h-12" disabled={!over.won} onClick={() => start(stage >= STAGE_COUNT - 1 ? 0 : stage + 1)}>
                <span>{stage >= STAGE_COUNT - 1 ? finaleLabel(locale) : c.next}</span>
              </Button>
            </div>
          </div>
        ) : null}
      </div>
      <Button className="min-h-12 w-full" disabled={phase !== "shop" || !line.length} onClick={fight}>
        <Swords className="size-5" />
        <span>{c.fight}</span>
      </Button>
      <p className="text-xs text-muted-foreground">{c.help}</p>

      <details className="rounded-lg border border-border p-2">
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">{c.stages}</summary>
        <div className="pt-2">
          <StageBar count={STAGE_COUNT} current={stage} cleared={cleared} locale={locale} onSelect={(i) => start(i)} />
        </div>
      </details>
    </div>
  );
}
