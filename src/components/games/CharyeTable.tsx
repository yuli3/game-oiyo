import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, RotateCcw, Send, Volume2, VolumeX } from "lucide-react";
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
import { CHARYE_SLUG, CHARYE_STAGES, ROWS, ROW_OF, STAGE_COUNT, newTable, offer, put, starsFor, stepTable, turn, whereIs, type Kind, type Rule, type Table } from "../../lib/games/charye-table";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const RULE_NAME: Record<L, Record<Rule, string>> = {
  ko: { banseo: "반서갱동: 밥은 서(왼쪽), 국은 동(오른쪽)", eodong: "어동육서: 생선은 동, 고기는 서", dudong: "두동미서: 생선 머리는 동쪽", jwapo: "좌포우혜: 포는 맨 왼쪽, 식혜는 맨 오른쪽", joyul: "조율이시: 서쪽부터 대추·밤·배·감", hongdong: "홍동백서: 붉은 과일은 동, 흰 과일은 서" },
  en: { banseo: "Rice west (left), soup east (right)", eodong: "Fish east, meat west", dudong: "Fish heads point east", jwapo: "Dried fish leftmost, sikhye rightmost", joyul: "From the west: jujube, chestnut, pear, persimmon", hongdong: "Red fruit east, white fruit west" },
  ja: { banseo: "ご飯は西（左）、汁は東（右）", eodong: "魚は東、肉は西", dudong: "魚の頭は東向き", jwapo: "干物は左端、シッケは右端", joyul: "西から ナツメ・栗・梨・柿", hongdong: "赤い果物は東、白い果物は西" },
  zh: { banseo: "饭在西（左），汤在东（右）", eodong: "鱼在东，肉在西", dudong: "鱼头朝东", jwapo: "鱼干最左，甜米露最右", joyul: "自西起：枣、栗、梨、柿", hongdong: "红果在东，白果在西" },
  fr: { banseo: "Riz à l'ouest (gauche), soupe à l'est (droite)", eodong: "Poisson à l'est, viande à l'ouest", dudong: "Têtes des poissons vers l'est", jwapo: "Poisson séché tout à gauche, sikhye tout à droite", joyul: "Depuis l'ouest : jujube, châtaigne, poire, kaki", hongdong: "Fruits rouges à l'est, blancs à l'ouest" },
  es: { banseo: "Arroz al oeste (izquierda), sopa al este (derecha)", eodong: "Pescado al este, carne al oeste", dudong: "Cabezas de pescado hacia el este", jwapo: "Pescado seco a la izquierda, sikhye a la derecha", joyul: "Desde el oeste: azufaifa, castaña, pera, caqui", hongdong: "Fruta roja al este, blanca al oeste" },
};

const KIND_NAME: Record<L, Record<Kind, string>> = {
  ko: { rice: "밥", soup: "국", meat: "육전", fish: "생선", po: "북어포", namul: "나물", hye: "식혜", jujube: "대추", chestnut: "밤", pear: "배", persimmon: "감", apple: "사과", hangwa: "한과" },
  en: { rice: "Rice", soup: "Soup", meat: "Meat", fish: "Fish", po: "Dried fish", namul: "Greens", hye: "Sikhye", jujube: "Jujube", chestnut: "Chestnut", pear: "Pear", persimmon: "Persimmon", apple: "Apple", hangwa: "Sweets" },
  ja: { rice: "ご飯", soup: "汁", meat: "肉", fish: "魚", po: "干物", namul: "ナムル", hye: "シッケ", jujube: "ナツメ", chestnut: "栗", pear: "梨", persimmon: "柿", apple: "りんご", hangwa: "韓菓" },
  zh: { rice: "饭", soup: "汤", meat: "肉", fish: "鱼", po: "鱼干", namul: "野菜", hye: "甜米露", jujube: "枣", chestnut: "栗", pear: "梨", persimmon: "柿", apple: "苹果", hangwa: "韩果" },
  fr: { rice: "Riz", soup: "Soupe", meat: "Viande", fish: "Poisson", po: "Séché", namul: "Légumes", hye: "Sikhye", jujube: "Jujube", chestnut: "Châtaigne", pear: "Poire", persimmon: "Kaki", apple: "Pomme", hangwa: "Douceurs" },
  es: { rice: "Arroz", soup: "Sopa", meat: "Carne", fish: "Pescado", po: "Seco", namul: "Verduras", hye: "Sikhye", jujube: "Azufaifa", chestnut: "Castaña", pear: "Pera", persimmon: "Caqui", apple: "Manzana", hangwa: "Dulces" },
};

const COPY: Record<L, {
  stage: string; rules: string; offer: string; start: string; win: string; lose: string; result: string; again: string; next: string; help: string; stages: string;
  full: string; exitFull: string; mute: string; unmute: string; good: string; bad: string; missing: string; west: string; east: string; incense: string;
}> = {
  ko: {
    stage: "{0}단계", rules: "이 집의 법도", offer: "차례 올리기", start: "음식을 끌어 자기 줄에 놓아요. 생선은 탭해서 돌려요", win: "정성껏 차례를 올렸어요!", lose: "향이 다 타 버렸어요", result: "올린 횟수 {0} · 틀린 횟수 {1}",
    again: "다시 하기", next: "다음 단계", good: "잘 차렸어요!", bad: "법도에 어긋나요", missing: "아직 빈자리가 있어요", west: "서", east: "동", incense: "향",
    help: "설날 아침 차례상을 차려요. 상은 네 줄이에요. 맨 뒤는 밥과 국, 그다음은 전, 그다음은 포·나물·식혜, 맨 앞은 과일과 한과예요. 음식을 끌어 자기 줄의 빈자리에 놓고, 놓인 음식끼리는 끌어서 자리를 바꿔요. 생선은 탭하면 머리 방향이 바뀌어요. 상을 바라볼 때 오른쪽이 동쪽이에요. 집집마다 예법이 달라서(가가례) 단계마다 이 집이 따르는 법도가 위에 나와요. 다 놓았으면 '차례 올리기'를 눌러요. 법도에 어긋나면 어긋난 법도가 빨갛게 표시되고 향이 더 타요. 향이 다 타기 전에 바르게 올리면 통과예요.",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", rules: "This house's rules", offer: "Offer the table", start: "Drag each dish to its row. Tap a fish to turn it", win: "The table is offered with care!", lose: "The incense burned out", result: "{0} offerings · {1} wrong",
    again: "Try again", next: "Next stage", good: "Well set!", bad: "That breaks a rule", missing: "There are empty places", west: "W", east: "E", incense: "Incense",
    help: "Set the Seollal ancestral table (charye). It has four rows: rice and soup at the back, then jeon, then dried fish, greens and sikhye, and fruit and sweets at the front. Drag a dish to an empty place in its row; drag dishes on the table to swap them. Tap a fish to turn its head. East is the right side as you face the table. Every house keeps its own rites (gagarye), so each stage lists the rules this house follows. When every place is filled, tap Offer. A broken rule is marked in red and burns extra incense. Offer a correct table before the incense burns out.",
    stages: "Choose a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "{0}面", rules: "この家のしきたり", offer: "茶礼を供える", start: "料理を自分の列へドラッグ。魚はタップで向きを変える", win: "心をこめて茶礼を供えた！", lose: "線香が燃え尽きた", result: "供えた回数 {0} · 間違い {1}",
    again: "もう一度", next: "次の面", good: "きれいに整った！", bad: "しきたりに合っていない", missing: "まだ空いている場所がある", west: "西", east: "東", incense: "線香",
    help: "ソルラルの朝の茶礼の膳を整えます。膳は4列です。いちばん奥はご飯と汁、次はチヂミ（チョン）、次は干物・ナムル・シッケ、手前は果物と韓菓。料理を自分の列の空いた場所へドラッグし、置いた料理どうしはドラッグで入れ替えます。魚はタップすると頭の向きが変わります。膳に向かって右が東です。家ごとにしきたりが違う（家家礼）ので、面ごとにこの家のしきたりが上に出ます。全部置いたら「茶礼を供える」を押しましょう。しきたりに合わないと赤く示され、線香が余計に燃えます。線香が燃え尽きる前に正しく供えればクリア。",
    stages: "ステージ選択", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关", rules: "这家的规矩", offer: "上供", start: "把菜拖到它那一排。点鱼可以掉头", win: "用心摆好了茶礼桌！", lose: "香烧完了", result: "上供 {0}次 · 出错 {1}次",
    again: "再来一次", next: "下一关", good: "摆得好！", bad: "不合规矩", missing: "还有空位", west: "西", east: "东", incense: "香",
    help: "摆春节早晨的茶礼桌（차례상）。桌子有四排：最里面是饭和汤，接着是煎饼（전），再是鱼干、野菜和甜米露，最前面是水果和韩果。把菜拖到它那一排的空位，桌上的菜可以互相拖动换位。点鱼可以让鱼头掉转方向。面对桌子时右边是东。各家礼数不同（家家礼），所以每关上方会列出这家遵守的规矩。都摆好后按“上供”。不合规矩的地方会标红，并多烧一段香。在香烧完前正确上供即过关。",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", rules: "Les règles de cette maison", offer: "Présenter la table", start: "Glissez chaque plat dans sa rangée. Touchez un poisson pour le tourner", win: "La table est présentée avec soin !", lose: "L'encens s'est consumé", result: "{0} présentations · {1} erreurs",
    again: "Réessayer", next: "Niveau suivant", good: "Bien dressée !", bad: "Une règle n'est pas respectée", missing: "Il reste des places vides", west: "O", east: "E", incense: "Encens",
    help: "Dressez la table rituelle des ancêtres de Seollal (charye). Elle a quatre rangées : riz et soupe au fond, puis les jeon, puis poisson séché, légumes et sikhye, et devant les fruits et douceurs. Glissez un plat vers une place libre de sa rangée ; glissez les plats déjà posés pour les échanger. Touchez un poisson pour tourner sa tête. L'est est à droite quand on fait face à la table. Chaque maison a ses rites (gagarye) : chaque niveau indique les règles de cette maison. Quand tout est placé, touchez Présenter. Une règle enfreinte s'affiche en rouge et brûle de l'encens. Présentez une table correcte avant que l'encens ne soit consumé.",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", rules: "Las reglas de esta casa", offer: "Presentar la mesa", start: "Arrastra cada plato a su fila. Toca un pescado para girarlo", win: "¡La mesa se presentó con esmero!", lose: "El incienso se consumió", result: "{0} presentaciones · {1} errores",
    again: "Reintentar", next: "Siguiente nivel", good: "¡Bien puesta!", bad: "Se rompe una regla", missing: "Quedan sitios vacíos", west: "O", east: "E", incense: "Incienso",
    help: "Pon la mesa ritual a los antepasados de Seollal (charye). Tiene cuatro filas: arroz y sopa al fondo, luego los jeon, luego pescado seco, verduras y sikhye, y delante fruta y dulces. Arrastra un plato a un sitio libre de su fila; arrastra los platos ya puestos para intercambiarlos. Toca un pescado para girar su cabeza. El este es la derecha mirando la mesa. Cada casa tiene sus ritos (gagarye), así que cada nivel muestra las reglas de esta casa. Cuando esté todo puesto, toca Presentar. Una regla rota se marca en rojo y quema incienso. Presenta una mesa correcta antes de que se consuma el incienso.",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:charye-table:muted";
const W = 360;
const H = 560;
const TX = 16;
const TW = 328;
const ROW_Y = [56, 136, 216, 296];
const ROW_H = 70;
const TRAY_Y = 384;

const COLOR: Record<Kind, string> = { rice: "#f8f9fa", soup: "#e9c46a", meat: "#a0522d", fish: "#adb5bd", po: "#d9a066", namul: "#5c940d", hye: "#fff3bf", jujube: "#c92a2a", chestnut: "#8d5524", pear: "#f1f3c4", persimmon: "#f08c00", apple: "#e03131", hangwa: "#f783ac" };
const FISH: PixelArt = { palette: { b: "#adb5bd", d: "#495057", e: "#212529" }, rows: ["..bbb.", "bbbbbe", "bdbbbb", "..bbb."] };

interface Pop { text: string; t: number; color: string; x: number; y: number }
type Input = { kind: "down"; x: number; y: number } | { kind: "move"; x: number; y: number } | { kind: "up"; x: number; y: number } | { kind: "offer" } | { kind: "key"; key: string };

function slotRect(tb: Table, row: number, col: number) {
  const n = tb.place[row].length;
  const w = Math.min(54, (TW - 8) / n);
  const x0 = TX + (TW - w * n) / 2;
  return { x: x0 + col * w, y: ROW_Y[row], w, h: ROW_H - 10 };
}

function trayPos(tb: Table, id: number) {
  const off = tb.stage.dishes.filter((d) => !whereIs(tb, d.id)).map((d) => d.id);
  const k = off.indexOf(id);
  return { x: 26 + (k % 8) * 44, y: TRAY_Y + 14 + Math.floor(k / 8) * 50 };
}

export default function CharyeTable({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const names = KIND_NAME[locale] ?? KIND_NAME.en;
  const ruleNames = RULE_NAME[locale] ?? RULE_NAME.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [over, setOver] = useState<null | { won: boolean; stars: number; offered: number; wrong: number }>(null);
  const [touched, setTouched] = useState(false);
  const [brokenRules, setBrokenRules] = useState<Rule[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const tRef = useRef<Table>(newTable(CHARYE_STAGES[0]));
  const started = useRef(false);
  const input = useRef<Input[]>([]);
  const drag = useRef<{ id: number; x: number; y: number; sx: number; sy: number; moved: boolean } | null>(null);
  const sel = useRef(0);
  const overShown = useRef(false);
  const parts = useRef<PixelParticle[]>([]);
  const pops = useRef<Pop[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const copyRef = useRef(c);
  copyRef.current = c;
  const namesRef = useRef(names);
  namesRef.current = names;
  const st = CHARYE_STAGES[stage];

  useRunRecord(CHARYE_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    tRef.current = newTable(CHARYE_STAGES[s]);
    started.current = false;
    input.current = [];
    drag.current = null;
    sel.current = 0;
    overShown.current = false;
    parts.current = [];
    pops.current = [];
    setBrokenRules([]);
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const done = loadClearedStages(CHARYE_SLUG, STAGE_COUNT);
    setCleared(done);
    start(nextOpenStage(done, STAGE_COUNT));
    const mu = readMutedPref(MUTE_KEY);
    setMuted(mu);
    cues.current = createCuePlayer({ cues: RETRO_8BIT_CUES, muted: mu });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => cues.current?.close();
  }, [start]);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (tRef.current.over) return;
      if (["ArrowLeft", "ArrowRight", "[", "]", "f", "F", "Enter"].includes(ev.key)) {
        ev.preventDefault();
        input.current.push(ev.key === "Enter" ? { kind: "offer" } : { kind: "key", key: ev.key });
        setTouched(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let smoke = 0;
    const dishAt = (tb: Table, x: number, y: number): number => {
      for (let r = 0; r < ROWS; r++)
        for (let col = 0; col < tb.place[r].length; col++) {
          const s = slotRect(tb, r, col);
          const id = tb.place[r][col];
          if (id !== null && x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) return id;
        }
      for (const d of tb.stage.dishes) {
        if (whereIs(tb, d.id)) continue;
        const p = trayPos(tb, d.id);
        if (Math.hypot(x - p.x, y - p.y) < 22) return d.id;
      }
      return -1;
    };
    const slotAt = (tb: Table, row: number, x: number, y: number): number => {
      for (let col = 0; col < tb.place[row].length; col++) {
        const s = slotRect(tb, row, col);
        if (x >= s.x - 4 && x <= s.x + s.w + 4 && y >= s.y - 12 && y <= s.y + s.h + 12) return col;
      }
      return -1;
    };
    const doOffer = (tb: Table) => {
      const cp = copyRef.current;
      started.current = true;
      const res = offer(tb);
      if (!res) return;
      if (res.ok) {
        setBrokenRules([]);
        pops.current.push({ text: cp.good, t: 1.2, color: "#2f9e44", x: W / 2, y: 30 });
        spawnBurst(parts.current, W / 2, 200, ["#ffd43b", "#ff8787", "#ffffff"], 24, 140, Math.floor(tb.t * 1000));
      } else {
        setBrokenRules(res.rules);
        pops.current.push({ text: res.complete ? cp.bad : cp.missing, t: 1.2, color: "#e03131", x: W / 2, y: 30 });
        sfx("fail");
      }
    };
    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      smoke += dt;
      const tb = tRef.current;
      // input is read once per frame
      for (const e of input.current.splice(0)) {
        if (tb.over) break;
        if (e.kind === "offer") doOffer(tb);
        else if (e.kind === "key") {
          started.current = true;
          const ids = tb.stage.dishes.map((d) => d.id);
          if (e.key === "]") sel.current = (sel.current + 1) % ids.length;
          else if (e.key === "[") sel.current = (sel.current + ids.length - 1) % ids.length;
          else if (e.key === "f" || e.key === "F") {
            if (turn(tb, sel.current)) sfx("tap");
          } else {
            const row = ROW_OF[tb.stage.dishes[sel.current].kind];
            const at = whereIs(tb, sel.current);
            const col = at ? at.col + (e.key === "ArrowRight" ? 1 : -1) : tb.place[row].findIndex((v) => v === null);
            if (col >= 0 && put(tb, sel.current, row, Math.min(col, tb.place[row].length - 1))) sfx("place");
          }
        } else if (e.kind === "down") {
          const id = dishAt(tb, e.x, e.y);
          if (id >= 0) {
            drag.current = { id, x: e.x, y: e.y, sx: e.x, sy: e.y, moved: false };
            sel.current = id;
          }
        } else if (e.kind === "move") {
          const d = drag.current;
          if (d) {
            d.x = e.x;
            d.y = e.y;
            if (Math.hypot(d.x - d.sx, d.y - d.sy) > 8) d.moved = true;
          }
        } else {
          const d = drag.current;
          drag.current = null;
          if (!d) continue;
          started.current = true;
          if (!d.moved) {
            if (turn(tb, d.id)) sfx("tap");
            continue;
          }
          const row = ROW_OF[tb.stage.dishes[d.id].kind];
          const col = slotAt(tb, row, e.x, e.y);
          if (col >= 0 && put(tb, d.id, row, col)) sfx("place");
        }
      }
      if (started.current && !tb.over) stepTable(tb, dt);
      if (tb.over && !overShown.current) {
        overShown.current = true;
        setOver({ won: tb.won, stars: starsFor(tb), offered: tb.offered, wrong: tb.wrong });
        if (tb.won) {
          setCleared(markStageCleared(CHARYE_SLUG, tb.stage.stage, STAGE_COUNT));
          sfx("win");
        } else sfx("lose");
      }
      stepParticles(parts.current, dt, 120);
      pops.current = pops.current.filter((pp) => (pp.t -= dt) > 0);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        const cp = copyRef.current;
        const nm = namesRef.current;
        // the room, a folding screen behind, the lacquered table
        ctx.fillStyle = "#e6d3b3";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#d4bd94";
        for (let x = 0; x < W; x += 60) ctx.fillRect(x, 0, 2, 50);
        ctx.fillStyle = "#7a2e1f";
        ctx.fillRect(TX - 6, ROW_Y[0] - 10, TW + 12, ROW_H * ROWS + 12);
        ctx.fillStyle = "#9c3b28";
        ctx.fillRect(TX, ROW_Y[0] - 4, TW, ROW_H * ROWS);
        ctx.font = "bold 13px sans-serif";
        ctx.fillStyle = "#fff4e6";
        ctx.textAlign = "left";
        ctx.fillText(cp.west, TX + 4, ROW_Y[0] - 16);
        ctx.textAlign = "right";
        ctx.fillText(cp.east, TX + TW - 4, ROW_Y[0] - 16);
        const drawDish = (id: number, x: number, y: number, lifted: boolean) => {
          const k = tb.stage.dishes[id].kind;
          ctx.fillStyle = lifted ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.18)";
          ctx.beginPath();
          ctx.ellipse(x, y + 12, 20, 6, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#f8f9fa";
          ctx.beginPath();
          ctx.ellipse(x, y + 4, 20, 10, 0, 0, Math.PI * 2);
          ctx.fill();
          if (k === "fish") drawSprite(ctx, FISH, x, y, { scale: 5, flipX: !tb.east[id] });
          else {
            ctx.fillStyle = COLOR[k];
            ctx.beginPath();
            ctx.arc(x, y, 12, 0, Math.PI * 2);
            ctx.fill();
          }
          if (id === sel.current && started.current) {
            ctx.strokeStyle = "#fab005";
            ctx.lineWidth = 2;
            ctx.strokeRect(x - 22, y - 16, 44, 40);
          }
          ctx.font = "10px sans-serif";
          ctx.textAlign = "center";
          ctx.fillStyle = "#3d2b1f";
          ctx.fillText(nm[k], x, y + 26);
        };
        for (let r = 0; r < ROWS; r++)
          for (let col = 0; col < tb.place[r].length; col++) {
            const s = slotRect(tb, r, col);
            ctx.fillStyle = "rgba(255,244,230,0.18)";
            ctx.fillRect(s.x + 2, s.y + 2, s.w - 4, s.h - 4);
            const id = tb.place[r][col];
            if (id !== null && drag.current?.id !== id) drawDish(id, s.x + s.w / 2, s.y + s.h / 2 - 6, false);
          }
        // the tray of dishes still to set
        ctx.fillStyle = "#c9a26b";
        ctx.fillRect(8, TRAY_Y - 10, W - 16, 166);
        for (const d of tb.stage.dishes) {
          if (whereIs(tb, d.id) || drag.current?.id === d.id) continue;
          const p = trayPos(tb, d.id);
          drawDish(d.id, p.x, p.y, false);
        }
        if (drag.current) drawDish(drag.current.id, drag.current.x, drag.current.y - 10, true);
        // the incense stick burning down
        const left = Math.max(0, 1 - tb.t / tb.stage.time);
        ctx.fillStyle = "#3d2b1f";
        ctx.fillRect(W - 24, H - 12 - 90 * left, 4, 90 * left);
        ctx.fillStyle = "#ff6b6b";
        ctx.fillRect(W - 25, H - 14 - 90 * left, 6, 4);
        ctx.fillStyle = "rgba(200,200,200,0.5)";
        for (let k = 0; k < 4; k++) ctx.fillRect(W - 24 + Math.sin(smoke * 2 + k) * 4, H - 22 - 90 * left - k * 9, 3, 6);
        drawParticles(ctx, parts.current);
        ctx.textAlign = "center";
        for (const pp of pops.current) {
          ctx.font = "bold 16px sans-serif";
          const tw = ctx.measureText(pp.text).width + 12;
          const x = Math.max(tw / 2 + 4, Math.min(W - tw / 2 - 4, pp.x));
          ctx.fillStyle = "rgba(255,255,255,0.94)";
          ctx.fillRect(x - tw / 2, pp.y - 20, tw, 26);
          ctx.fillStyle = pp.color;
          ctx.fillText(pp.text, x, pp.y - 2);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx]);

  const toCanvas = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * W) / r.width, y: ((e.clientY - r.top) * H) / r.height };
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    cues.current?.setMuted(next);
    writeMutedPref(MUTE_KEY, next);
  };

  return (
    <div
      ref={containerRef}
      data-game="charye-table"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{`${c.incense} ${st.time}s`}</Badge>
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

      <div className="rounded-lg border border-border p-2">
        <p className="text-sm font-bold">{c.rules}</p>
        <ul className="mt-1 space-y-0.5 text-sm">
          {st.rules.map((r) => (
            <li key={r} className={brokenRules.includes(r) ? "font-bold text-destructive" : "text-muted-foreground"}>
              {ruleNames[r]}
            </li>
          ))}
        </ul>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          onPointerDown={(e) => {
            if (tRef.current.over) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            setTouched(true);
            input.current.push({ kind: "down", ...toCanvas(e) });
          }}
          onPointerMove={(e) => {
            if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
            input.current.push({ kind: "move", ...toCanvas(e) });
          }}
          onPointerUp={(e) => input.current.push({ kind: "up", ...toCanvas(e) })}
          onPointerCancel={(e) => input.current.push({ kind: "up", ...toCanvas(e) })}
          className="pixelated mx-auto block h-auto w-full max-w-sm touch-none select-none rounded-2xl border-4 border-border"
          aria-label={c.help}
        />
        {!touched && !over ? (
          <div className="pointer-events-none absolute inset-x-4 top-1/2 text-center" aria-hidden="true">
            <span className="inline-block rounded-2xl bg-background/85 px-4 py-2 text-base font-bold shadow">{c.start}</span>
          </div>
        ) : null}
        {over ? (
          <div className="absolute inset-x-4 top-1/4 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{over.won ? c.win : c.lose}</p>
            <p className="text-sm text-muted-foreground">{fill(c.result, over.offered, over.wrong)}</p>
            {over.won ? <p className="text-2xl tracking-widest text-warning" aria-label={`${over.stars}/3`}>{"★".repeat(over.stars)}{"☆".repeat(3 - over.stars)}</p> : null}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="min-h-12" onClick={() => start(stage)}>
                <RotateCcw className="size-4" />
                <span>{c.again}</span>
              </Button>
              <Button className="min-h-12" disabled={!over.won} onClick={() => start(stage >= STAGE_COUNT - 1 ? 0 : stage + 1)}>
                <span>{stage >= STAGE_COUNT - 1 ? finaleLabel(locale) : c.next}</span>
              </Button>
            </div>
          </div>
        ) : null}
      </div>
      <Button className="min-h-12 w-full" disabled={Boolean(over)} onClick={() => input.current.push({ kind: "offer" })}>
        <Send className="size-4" />
        <span>{c.offer}</span>
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
