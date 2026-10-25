/**
 * 의도 (2026-10-15 세운): 화면은 손으로 맞춘 네 접근 중 시드가 고른 한 판만 보여 준다.
 * 고장난 계기는 멈춘 눈금만 말하고, 그 축의 지금 값은 적지 않는다.
 * 외측 마커 호출은 시작 순간의 기록이라 조작 뒤에 고치지 않는다.
 * 끌어서 카메라를 돌리면 퍼즐이 아니라 시점이 이기므로 보기는 버튼만 쓴다.
 * 관제 음성은 첫 제스처 뒤에만, 저장된 외측 마커 호출과 끝난 뒤의 설명을 읽는다.
 * 음소거·멈춤·시드 변경은 그 음성을 끊는다. 고장난 축의 지금 값은 읽지 않는다.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, Share2, Check } from "lucide-react";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import type { Locale } from "../../lib/i18n";
import { celebrate } from "../../lib/games/celebration";
import {
  createShareCardCanvas,
  copyShareCardToClipboard,
  downloadShareCard,
} from "../../lib/games/share-card";
import {
  ACTIONS,
  STEP_CAP,
  createPilot,
  needle,
  nextSeed,
  openActions,
  radioOpen,
  radioScript,
  resign,
  stepPilot,
  type Action,
  type Axis,
  type Miss,
  type PilotState,
  type Trim,
} from "../../lib/games/blind-pilot";
import { usePrefersReducedMotion } from "../../lib/games/reduced-motion";
import BlindPilotScene, { type PilotGlide } from "./BlindPilotScene";

interface Copy {
  title: string;
  lead: string;
  keys: string;
  steps: string;
  seed: string;
  apply: string;
  next: string;
  acts: string;
  pitchUp: string;
  pitchDown: string;
  bankRight: string;
  bankLeft: string;
  powerUp: string;
  powerDown: string;
  land: string;
  wingLock: string;
  limit: string;
  wait: string;
  hintPitchUp: string;
  hintPitchDown: string;
  hintBankRight: string;
  hintBankLeft: string;
  hintPowerUp: string;
  hintPowerDown: string;
  landHint: string;
  pitchName: string;
  bankName: string;
  powerName: string;
  stopped: string;
  noseHigh: string;
  noseLevel: string;
  noseLow: string;
  rightWing: string;
  wingsLevel: string;
  leftWing: string;
  thrustHigh: string;
  thrustSet: string;
  thrustLow: string;
  tower: string;
  towerStays: string;
  missLead: string;
  pitchHigh: string;
  pitchLow: string;
  bankHigh: string;
  bankLow: string;
  powerHigh: string;
  powerLow: string;
  pause: string;
  resume: string;
  view: string;
  mute: string;
  sound: string;
  giveUp: string;
  paused: string;
  playing: string;
  none: string;
  win: string;
  cap: string;
  resigned: string;
}

const COPY: Record<Locale, Copy> = {
  ko: {
    title: "블라인드 파일럿",
    lead: "고장난 계기 하나는 바늘이 멈춰 있고, 외측 마커 호출과 나머지 계기로 기수를 맞춰 착륙합니다.",
    keys: "위·W는 기수 들기, 아래·S는 기수 내리기, 왼쪽·A는 왼쪽 날개 내리기, 오른쪽·D는 오른쪽 날개 내리기입니다. Q는 출력을 내리고 E는 올립니다. L은 착륙, V는 보기, Esc는 멈춤. 방향은 카메라가 아니라 기체의 축입니다. 보기를 돌려도 버튼은 그대로입니다. 기본 보기는 계기판 정면이고, 다른 보기는 같은 계기판을 비스듬히 봅니다.",
    steps: "걸음",
    seed: "시드",
    apply: "이 시드",
    next: "다른 접근",
    acts: "조작",
    pitchUp: "기수 들기",
    pitchDown: "기수 내리기",
    bankRight: "오른쪽 날개 내리기",
    bankLeft: "왼쪽 날개 내리기",
    powerUp: "출력 올리기",
    powerDown: "출력 내리기",
    land: "착륙",
    wingLock: "날개가 기울어 기수와 출력이 잠겼습니다",
    limit: "그 방향으로는 더 못 움직입니다",
    wait: "지금은 조작이 멈춥니다",
    hintPitchUp: "기수를 한 칸 듭니다",
    hintPitchDown: "기수를 한 칸 내립니다",
    hintBankRight: "오른쪽 날개를 한 칸 내립니다",
    hintBankLeft: "왼쪽 날개를 한 칸 내립니다",
    hintPowerUp: "출력을 올리고 기수도 한 칸 듭니다",
    hintPowerDown: "출력만 한 칸 내립니다",
    landHint: "세 축이 가운데일 때만 내려앉습니다",
    pitchName: "기수",
    bankName: "날개",
    powerName: "출력",
    stopped: "멈춤",
    noseHigh: "기수 높음",
    noseLevel: "기수 가운데",
    noseLow: "기수 낮음",
    rightWing: "오른쪽 날개 내려감",
    wingsLevel: "날개 수평",
    leftWing: "왼쪽 날개 내려감",
    thrustHigh: "출력 많음",
    thrustSet: "출력 맞춤",
    thrustLow: "출력 부족",
    tower: "외측 마커",
    towerStays: "이 호출은 그 순간의 기록이라 이후에는 바뀌지 않습니다.",
    missLead: "착륙하지 못했습니다.",
    pitchHigh: "기수가 높습니다.",
    pitchLow: "기수가 낮습니다.",
    bankHigh: "오른쪽 날개가 내려가 있습니다.",
    bankLow: "왼쪽 날개가 내려가 있습니다.",
    powerHigh: "출력이 많습니다.",
    powerLow: "출력이 부족합니다.",
    pause: "멈추기",
    resume: "이어하기",
    view: "보기",
    mute: "소리 끄기",
    sound: "소리 켜기",
    giveUp: "포기",
    paused: "멈췄습니다. 이어하기로 돌아옵니다.",
    playing: "갈 수 있는 조작",
    none: "지금은 움직일 수 없습니다.",
    win: "세 축이 가운데라 착륙했습니다.",
    cap: "여덟 번 안에 세 축을 가운데로 맞추지 못했습니다.",
    resigned: "이 접근을 포기했습니다.",
  },
  en: {
    title: "Blind Pilot",
    lead: "One gauge is frozen. Match the landing with the outer-marker call and the needles that still move.",
    keys: "Up or W raises the nose. Down or S lowers it. Left or A drops the left wing. Right or D drops the right wing. Q cuts thrust and E adds it. L lands, V changes the view, Esc pauses. Those directions are the airplane, not the camera. Turning the view leaves the buttons as they are. The first view faces the panel, and the other views look at the same panel from an angle.",
    steps: "Steps",
    seed: "Seed",
    apply: "Use seed",
    next: "Another approach",
    acts: "Controls",
    pitchUp: "Raise the nose",
    pitchDown: "Lower the nose",
    bankRight: "Drop the right wing",
    bankLeft: "Drop the left wing",
    powerUp: "Add thrust",
    powerDown: "Cut thrust",
    land: "Land",
    wingLock: "A wing is down, so the nose and thrust stay locked",
    limit: "That direction is already at its stop",
    wait: "The controls are held",
    hintPitchUp: "Raise the nose one notch",
    hintPitchDown: "Lower the nose one notch",
    hintBankRight: "Drop the right wing one notch",
    hintBankLeft: "Drop the left wing one notch",
    hintPowerUp: "Add thrust, and the nose comes up one notch too",
    hintPowerDown: "Cut thrust one notch, and leave the nose where it is",
    landHint: "The landing holds only when all three axes are centered",
    pitchName: "Nose",
    bankName: "Wings",
    powerName: "Thrust",
    stopped: "Stopped",
    noseHigh: "nose high",
    noseLevel: "nose level",
    noseLow: "nose low",
    rightWing: "right wing down",
    wingsLevel: "wings level",
    leftWing: "left wing down",
    thrustHigh: "thrust high",
    thrustSet: "thrust set",
    thrustLow: "thrust low",
    tower: "Outer marker",
    towerStays: "That call is the moment you passed it, and it does not update.",
    missLead: "The landing did not hold.",
    pitchHigh: "The nose is high.",
    pitchLow: "The nose is low.",
    bankHigh: "The right wing is down.",
    bankLow: "The left wing is down.",
    powerHigh: "Thrust is high.",
    powerLow: "Thrust is low.",
    pause: "Pause",
    resume: "Resume",
    view: "View",
    mute: "Mute",
    sound: "Sound",
    giveUp: "Give up",
    paused: "Paused. Resume to return.",
    playing: "Open controls",
    none: "Nothing can move.",
    win: "All three axes were centered, so the landing held.",
    cap: "Eight tries passed without centering all three axes.",
    resigned: "You left this approach.",
  },
  ja: {
    title: "計器飛行",
    lead: "故障した計器は針が止まったままです。アウターマーカーの通報と、まだ動く針で姿勢を合わせて着陸します。",
    keys: "上・Wは機首上げ、下・Sは機首下げ、左・Aは左翼下げ、右・Dは右翼下げです。Qで出力を下げ、Eで上げます。Lは着陸、Vは視点、Escは一時停止。方向はカメラではなく機体の軸です。視点を回してもボタンはそのままです。最初の視点は計器板の正面で、ほかの視点は同じ計器板を斜めから見ます。",
    steps: "歩数",
    seed: "シード",
    apply: "このシード",
    next: "別の進入",
    acts: "操作",
    pitchUp: "機首を上げる",
    pitchDown: "機首を下げる",
    bankRight: "右翼を下げる",
    bankLeft: "左翼を下げる",
    powerUp: "出力を上げる",
    powerDown: "出力を下げる",
    land: "着陸",
    wingLock: "翼が傾いているので、機首と出力は動きません",
    limit: "その方向はこれ以上動きません",
    wait: "いまは操作が止まります",
    hintPitchUp: "機首を一段階上げます",
    hintPitchDown: "機首を一段階下げます",
    hintBankRight: "右翼を一段階下げます",
    hintBankLeft: "左翼を一段階下げます",
    hintPowerUp: "出力を上げ、機首も一段階上がります",
    hintPowerDown: "出力だけを一段階下げます",
    landHint: "三つの軸が中央のときだけ接地します",
    pitchName: "機首",
    bankName: "翼",
    powerName: "出力",
    stopped: "停止",
    noseHigh: "機首が高い",
    noseLevel: "機首が中央",
    noseLow: "機首が低い",
    rightWing: "右翼が下がっている",
    wingsLevel: "翼が水平",
    leftWing: "左翼が下がっている",
    thrustHigh: "出力が多い",
    thrustSet: "出力が合っている",
    thrustLow: "出力が足りない",
    tower: "アウターマーカー",
    towerStays: "この通報はその瞬間の記録なので、その後は変わりません。",
    missLead: "着陸できませんでした。",
    pitchHigh: "機首が高いです。",
    pitchLow: "機首が低いです。",
    bankHigh: "右翼が下がっています。",
    bankLow: "左翼が下がっています。",
    powerHigh: "出力が多いです。",
    powerLow: "出力が足りません。",
    pause: "一時停止",
    resume: "再開",
    view: "視点",
    mute: "音を消す",
    sound: "音を出す",
    giveUp: "あきらめる",
    paused: "停止中です。再開で戻ります。",
    playing: "使える操作",
    none: "いまは動かせません。",
    win: "三つの軸が中央で、着陸できました。",
    cap: "8回までに三つの軸を中央へ合わせられませんでした。",
    resigned: "この進入をあきらめました。",
  },
  zh: {
    title: "盲飞",
    lead: "有一块仪表的指针停住了。用外指点标的通报，加上还在动的指针，把姿态对准再着陆。",
    keys: "上或 W 抬机头，下或 S 压机头，左或 A 压左翼，右或 D 压右翼。Q 收油门，E 加油门。L 着陆，V 换视角，Esc 暂停。这些方向是飞机的轴，不是摄像机。转动视角不会改按钮。默认视角正对仪表板，其余视角从斜侧看同一块仪表板。",
    steps: "步数",
    seed: "种子",
    apply: "使用种子",
    next: "另一次进近",
    acts: "操作",
    pitchUp: "抬机头",
    pitchDown: "压机头",
    bankRight: "压右翼",
    bankLeft: "压左翼",
    powerUp: "加油门",
    powerDown: "收油门",
    land: "着陆",
    wingLock: "机翼还倾着，机头和油门锁住了",
    limit: "这个方向已经到头",
    wait: "现在不能操作",
    hintPitchUp: "机头抬一格",
    hintPitchDown: "机头压一格",
    hintBankRight: "右翼压一格",
    hintBankLeft: "左翼压一格",
    hintPowerUp: "加油门，机头也跟着抬一格",
    hintPowerDown: "只把油门收一格",
    landHint: "三个轴都在正中才能接地",
    pitchName: "机头",
    bankName: "机翼",
    powerName: "油门",
    stopped: "停住",
    noseHigh: "机头高",
    noseLevel: "机头正",
    noseLow: "机头低",
    rightWing: "右翼压下",
    wingsLevel: "机翼水平",
    leftWing: "左翼压下",
    thrustHigh: "油门大",
    thrustSet: "油门正好",
    thrustLow: "油门小",
    tower: "外指点标",
    towerStays: "这句通报是经过那一刻的记录，之后不再更新。",
    missLead: "没有着陆。",
    pitchHigh: "机头高了。",
    pitchLow: "机头低了。",
    bankHigh: "右翼还压着。",
    bankLow: "左翼还压着。",
    powerHigh: "油门大了。",
    powerLow: "油门小了。",
    pause: "暂停",
    resume: "继续",
    view: "视角",
    mute: "关闭声音",
    sound: "打开声音",
    giveUp: "放弃",
    paused: "已暂停。继续后返回。",
    playing: "可以做的操作",
    none: "现在动不了。",
    win: "三个轴都在正中，着陆了。",
    cap: "八次之内没有把三个轴对准正中。",
    resigned: "放弃了这次进近。",
  },
  fr: {
    title: "Pilote sans visibilité",
    lead: "Un instrument reste figé. Posez l'avion avec l'appel du radioborne extérieur et les aiguilles qui bougent encore.",
    keys: "Haut ou W lève le nez. Bas ou S le baisse. Gauche ou A baisse l'aile gauche. Droite ou D baisse l'aile droite. Q réduit la poussée, E l'augmente. L pose, V change la vue, Esc met en pause. Ces directions sont celles de l'avion, pas de la caméra. Tourner la vue laisse les boutons en place. La première vue est face au tableau, et les autres regardent le même tableau de biais.",
    steps: "Pas",
    seed: "Graine",
    apply: "Cette graine",
    next: "Une autre approche",
    acts: "Commandes",
    pitchUp: "Lever le nez",
    pitchDown: "Baisser le nez",
    bankRight: "Baisser l'aile droite",
    bankLeft: "Baisser l'aile gauche",
    powerUp: "Ajouter de la poussée",
    powerDown: "Réduire la poussée",
    land: "Poser",
    wingLock: "Une aile est basse, le nez et la poussée restent bloqués",
    limit: "Ce sens est déjà en butée",
    wait: "Les commandes sont retenues",
    hintPitchUp: "Lève le nez d'un cran",
    hintPitchDown: "Baisse le nez d'un cran",
    hintBankRight: "Baisse l'aile droite d'un cran",
    hintBankLeft: "Baisse l'aile gauche d'un cran",
    hintPowerUp: "Ajoute de la poussée, et le nez monte aussi d'un cran",
    hintPowerDown: "Réduit seulement la poussée d'un cran",
    landHint: "L'avion se pose seulement si les trois axes sont au centre",
    pitchName: "Nez",
    bankName: "Ailes",
    powerName: "Poussée",
    stopped: "Figé",
    noseHigh: "nez haut",
    noseLevel: "nez au centre",
    noseLow: "nez bas",
    rightWing: "aile droite basse",
    wingsLevel: "ailes à plat",
    leftWing: "aile gauche basse",
    thrustHigh: "poussée forte",
    thrustSet: "poussée réglée",
    thrustLow: "poussée faible",
    tower: "Radioborne extérieure",
    towerStays: "Cet appel est le passage de cet instant, et il ne se met plus à jour.",
    missLead: "L'avion ne s'est pas posé.",
    pitchHigh: "Le nez est haut.",
    pitchLow: "Le nez est bas.",
    bankHigh: "L'aile droite est basse.",
    bankLow: "L'aile gauche est basse.",
    powerHigh: "La poussée est forte.",
    powerLow: "La poussée est faible.",
    pause: "Pause",
    resume: "Reprendre",
    view: "Vue",
    mute: "Couper le son",
    sound: "Remettre le son",
    giveUp: "Abandonner",
    paused: "En pause. Reprendre pour revenir.",
    playing: "Commandes ouvertes",
    none: "Rien ne peut bouger.",
    win: "Les trois axes étaient au centre, l'avion s'est posé.",
    cap: "Huit essais ont passé sans centrer les trois axes.",
    resigned: "Vous avez quitté cette approche.",
  },
  es: {
    title: "Piloto sin visibilidad",
    lead: "Un instrumento se quedó quieto. Alinea el aterrizaje con el aviso de la radiobaliza exterior y con las agujas que siguen vivas.",
    keys: "Arriba o W levanta el morro. Abajo o S lo baja. Izquierda o A baja el ala izquierda. Derecha o D baja el ala derecha. Q quita motor y E lo añade. L aterriza, V cambia la vista, Esc pausa. Esas direcciones son del avión, no de la cámara. Girar la vista deja los botones igual. La primera vista queda de frente al panel, y las otras miran el mismo panel en oblicuo.",
    steps: "Pasos",
    seed: "Semilla",
    apply: "Esta semilla",
    next: "Otra aproximación",
    acts: "Mandos",
    pitchUp: "Levantar el morro",
    pitchDown: "Bajar el morro",
    bankRight: "Bajar el ala derecha",
    bankLeft: "Bajar el ala izquierda",
    powerUp: "Añadir motor",
    powerDown: "Quitar motor",
    land: "Aterrizar",
    wingLock: "Un ala sigue baja, así que el morro y el motor no se mueven",
    limit: "Ese sentido ya está en el tope",
    wait: "Los mandos están retenidos",
    hintPitchUp: "Sube el morro un punto",
    hintPitchDown: "Baja el morro un punto",
    hintBankRight: "Baja el ala derecha un punto",
    hintBankLeft: "Baja el ala izquierda un punto",
    hintPowerUp: "Añade motor, y el morro sube un punto también",
    hintPowerDown: "Solo quita un punto de motor",
    landHint: "El avión se posa solo cuando los tres ejes están al centro",
    pitchName: "Morro",
    bankName: "Alas",
    powerName: "Motor",
    stopped: "Parado",
    noseHigh: "morro alto",
    noseLevel: "morro al centro",
    noseLow: "morro bajo",
    rightWing: "ala derecha baja",
    wingsLevel: "alas niveladas",
    leftWing: "ala izquierda baja",
    thrustHigh: "mucho motor",
    thrustSet: "motor justo",
    thrustLow: "poco motor",
    tower: "Radiobaliza exterior",
    towerStays: "Ese aviso es el paso de ese instante y ya no se actualiza.",
    missLead: "No llegó a posarse.",
    pitchHigh: "El morro está alto.",
    pitchLow: "El morro está bajo.",
    bankHigh: "El ala derecha sigue baja.",
    bankLow: "El ala izquierda sigue baja.",
    powerHigh: "Hay mucho motor.",
    powerLow: "Hay poco motor.",
    pause: "Pausa",
    resume: "Seguir",
    view: "Vista",
    mute: "Silenciar",
    sound: "Activar sonido",
    giveUp: "Rendirse",
    paused: "En pausa. Seguir para volver.",
    playing: "Mandos abiertos",
    none: "Ahora no se mueve nada.",
    win: "Los tres ejes estaban al centro y el avión se posó.",
    cap: "Pasaron ocho intentos sin centrar los tres ejes.",
    resigned: "Dejaste esta aproximación.",
  },
};

type Tick = "nudge" | "block" | "win" | "miss" | "lose";

interface PilotAudio {
  arm: () => void;
  setBed: (on: boolean) => void;
  tick: (kind: Tick) => void;
  close: () => void;
}

function createPilotAudio(): PilotAudio {
  let context: AudioContext | null = null;
  let bed: OscillatorNode | null = null;
  let bedGain: GainNode | null = null;
  let wantBed = false;

  const ensure = () => {
    if (typeof window === "undefined") return null;
    if (context) {
      if (context.state === "suspended") void context.resume();
      return context;
    }
    const scope = window as Window & { webkitAudioContext?: typeof AudioContext };
    const Ctor = window.AudioContext ?? scope.webkitAudioContext;
    if (!Ctor) return null;
    context = new Ctor();
    bed = context.createOscillator();
    bed.type = "sine";
    bed.frequency.value = 52;
    bedGain = context.createGain();
    bedGain.gain.value = wantBed ? 0.012 : 0;
    bed.connect(bedGain).connect(context.destination);
    bed.start();
    return context;
  };

  const blip = (ctx: AudioContext, freq: number, duration: number, peak: number, type: OscillatorType) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(peak, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration + 0.02);
  };

  return {
    arm() {
      ensure();
    },
    setBed(on) {
      wantBed = on;
      if (!context || !bedGain) return;
      if (context.state === "suspended") void context.resume();
      bedGain.gain.setTargetAtTime(on ? 0.012 : 0, context.currentTime, 0.05);
    },
    tick(kind) {
      if (!wantBed) return;
      const ctx = ensure();
      if (!ctx) return;
      if (kind === "nudge") {
        blip(ctx, 246, 0.07, 0.028, "sine");
        return;
      }
      if (kind === "block") {
        blip(ctx, 92, 0.06, 0.02, "sine");
        return;
      }
      if (kind === "win") {
        blip(ctx, 392, 0.18, 0.03, "sine");
        blip(ctx, 523, 0.26, 0.02, "sine");
        return;
      }
      if (kind === "miss") {
        blip(ctx, 74, 0.2, 0.04, "sine");
        return;
      }
      blip(ctx, 84, 0.14, 0.035, "sine");
    },
    close() {
      try {
        bed?.stop();
      } catch {
        // The oscillator may already have stopped with the context.
      }
      const closing = context;
      context = null;
      bed = null;
      bedGain = null;
      if (closing && closing.state !== "closed") void closing.close().catch(() => undefined);
    },
  };
}

const VOICE_LANG: Record<Locale, string> = {
  ko: "ko-KR",
  en: "en-US",
  ja: "ja-JP",
  zh: "zh-CN",
  fr: "fr-FR",
  es: "es-ES",
};

interface TowerVoice {
  arm: () => void;
  say: (text: string) => void;
  /** Drops whatever is talking, then speaks. Chrome ignores speak() in the same turn as cancel(). */
  replace: (text: string) => void;
  cancel: () => void;
  close: () => void;
}

function createTowerVoice(lang: string): TowerVoice {
  let armed = false;
  let last = "";
  let ticket = 0;

  const synth = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) return null;
    return window.speechSynthesis;
  };

  const speakNow = (line: string) => {
    const speech = synth();
    // The same line is not restarted. A new line queues behind whatever is still talking.
    if (!armed || !speech || line.length === 0 || line === last) return;
    const utter = new SpeechSynthesisUtterance(line);
    utter.lang = lang;
    utter.rate = 0.96;
    utter.pitch = 0.84;
    try {
      speech.speak(utter);
      last = line;
    } catch {
      // A missing voice pack leaves the on-screen call in place. 2026-10-15
    }
  };

  return {
    arm() {
      armed = true;
    },
    say(text) {
      speakNow(text.trim());
    },
    replace(text) {
      ticket += 1;
      const mine = ticket;
      const line = text.trim();
      last = "";
      try {
        synth()?.cancel();
      } catch {
        // cancel can throw once the engine is already gone.
      }
      // Chrome drops speak() in the same turn as cancel(), so the next call waits one task. 2026-10-15
      window.setTimeout(() => {
        if (mine !== ticket) return;
        speakNow(line);
      }, 0);
    },
    cancel() {
      ticket += 1;
      last = "";
      try {
        synth()?.cancel();
      } catch {
        // cancel can throw once the engine is already gone.
      }
    },
    close() {
      ticket += 1;
      armed = false;
      last = "";
      try {
        synth()?.cancel();
      } catch {
        // The page is leaving. A failed cancel still drops the utterance.
      }
    },
  };
}

function readSeed(): number {
  if (typeof window === "undefined") return 0;
  const raw = new URLSearchParams(window.location.search).get("seed");
  if (raw === null || raw.trim() === "") return 0;
  const value = Number(raw);
  return Number.isFinite(value) ? Math.trunc(value) : 0;
}

function writeSeed(value: number) {
  const url = new URL(window.location.href);
  url.searchParams.set("seed", String(value));
  window.history.replaceState(null, "", url);
}

function controlClass(tone: "primary" | "quiet" | "danger"): string {
  if (tone === "danger") return "min-h-11 min-w-11 rounded-xl bg-destructive px-3 text-sm font-semibold text-destructive-foreground disabled:opacity-40";
  if (tone === "primary") return "min-h-11 min-w-11 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:opacity-40";
  return "min-h-11 min-w-11 rounded-xl bg-muted px-3 text-sm font-semibold text-foreground disabled:opacity-40";
}

function landClass(ready: boolean): string {
  if (ready) return "min-h-11 w-full rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:opacity-40";
  return "min-h-11 w-full rounded-xl bg-muted px-3 text-sm font-semibold text-foreground disabled:opacity-40";
}

function gaugeClass(dead: boolean): string {
  if (dead) return "rounded-xl bg-muted px-3 py-2 text-sm text-foreground";
  return "rounded-xl bg-card px-3 py-2 text-sm text-muted-foreground";
}

function attitudeOf(state: PilotState): { pitch: Trim; bank: Trim; power: Trim } {
  return { pitch: state.pitch, bank: state.bank, power: state.power };
}

function word(axis: Axis, value: Trim, copy: Copy): string {
  if (axis === "pitch") return value > 0 ? copy.noseHigh : value < 0 ? copy.noseLow : copy.noseLevel;
  if (axis === "bank") return value > 0 ? copy.rightWing : value < 0 ? copy.leftWing : copy.wingsLevel;
  return value > 0 ? copy.thrustHigh : value < 0 ? copy.thrustLow : copy.thrustSet;
}

function towerSentence(call: { pitch: Trim; bank: Trim; power: Trim }, copy: Copy): string {
  return `${copy.tower}. ${word("pitch", call.pitch, copy)}, ${word("bank", call.bank, copy)}, ${word("power", call.power, copy)}.`;
}

function axisName(axis: Axis, copy: Copy): string {
  if (axis === "pitch") return copy.pitchName;
  if (axis === "bank") return copy.bankName;
  return copy.powerName;
}

function gaugeLine(axis: Axis, state: PilotState, copy: Copy): string {
  const shown = needle(state, axis);
  const line = `${axisName(axis, copy)} ${word(axis, shown, copy)}`;
  if (axis === state.dead) return `${line} · ${copy.stopped}`;
  return line;
}

function label(action: Action, copy: Copy): string {
  if (action === "pitch+") return copy.pitchUp;
  if (action === "pitch-") return copy.pitchDown;
  if (action === "bank+") return copy.bankRight;
  if (action === "bank-") return copy.bankLeft;
  if (action === "power+") return copy.powerUp;
  if (action === "power-") return copy.powerDown;
  return copy.land;
}

function hint(action: Action, copy: Copy): string {
  if (action === "pitch+") return copy.hintPitchUp;
  if (action === "pitch-") return copy.hintPitchDown;
  if (action === "bank+") return copy.hintBankRight;
  if (action === "bank-") return copy.hintBankLeft;
  if (action === "power+") return copy.hintPowerUp;
  if (action === "power-") return copy.hintPowerDown;
  return copy.landHint;
}

function shortcut(action: Action): string {
  if (action === "pitch+") return "ArrowUp W";
  if (action === "pitch-") return "ArrowDown S";
  if (action === "bank+") return "ArrowRight D";
  if (action === "bank-") return "ArrowLeft A";
  if (action === "power+") return "E";
  if (action === "power-") return "Q";
  return "L";
}

function detailFor(state: PilotState, action: Action, copy: Copy): string {
  if (state.status !== "play") return copy.wait;
  const steering = action.startsWith("pitch") || action.startsWith("power");
  if (steering && state.bank !== 0) return copy.wingLock;
  if (stepPilot(state, action) === state) return copy.limit;
  return hint(action, copy);
}

function missSentence(item: Miss, copy: Copy): string {
  if (item.axis === "pitch") return item.value > 0 ? copy.pitchHigh : copy.pitchLow;
  if (item.axis === "bank") return item.value > 0 ? copy.bankHigh : copy.bankLow;
  return item.value > 0 ? copy.powerHigh : copy.powerLow;
}

function codeAction(code: string): Action | null {
  if (code === "ArrowUp" || code === "KeyW") return "pitch+";
  if (code === "ArrowDown" || code === "KeyS") return "pitch-";
  if (code === "ArrowLeft" || code === "KeyA") return "bank-";
  if (code === "ArrowRight" || code === "KeyD") return "bank+";
  if (code === "KeyQ") return "power-";
  if (code === "KeyE") return "power+";
  if (code === "KeyL") return "land";
  return null;
}

const GRID: readonly Action[] = ["pitch+", "pitch-", "bank-", "bank+", "power+", "power-"];
const GAUGE_AXES: readonly Axis[] = ["pitch", "bank", "power"];

export default function BlindPilot({ locale = "en" }: { locale?: Locale }) {
  const copy = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal, labels: portalLabels } = useArcadePortal({ locale });
  const reduce = usePrefersReducedMotion();
  const opening = useRef(createPilot(0));
  const [seed, setSeed] = useState(0);
  const [draft, setDraft] = useState("0");
  const [state, setState] = useState<PilotState>(opening.current);
  const [shown, setShown] = useState<PilotState>(opening.current);
  const [call, setCall] = useState(() => attitudeOf(opening.current));
  const [glide, setGlide] = useState<PilotGlide | null>(null);
  const [busy, setBusy] = useState(false);
  const [paused, setPaused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [muted, setMuted] = useState(false);
  const [view, setView] = useState(0);
  const [voiced, setVoiced] = useState(false);
  const [shareCardCopied, setShareCardCopied] = useState(false);
  const stateRef = useRef(state);
  const pausedRef = useRef(paused);
  const mutedRef = useRef(muted);
  const busyRef = useRef(busy);
  const glideSerial = useRef(0);
  const flightSpoken = useRef<number | null>(null);
  const audio = useRef<PilotAudio | null>(null);
  const voice = useRef<TowerVoice | null>(null);
  if (!audio.current) audio.current = createPilotAudio();
  if (!voice.current) voice.current = createTowerVoice(VOICE_LANG[locale] ?? "en-US");
  stateRef.current = state;
  pausedRef.current = paused;
  mutedRef.current = muted;
  busyRef.current = busy;

  const handleShareCard = useCallback(async () => {
    const s = stateRef.current;
    const canvas = createShareCardCanvas({
      title: "Blind Pilot",
      subtitle: s.status === "win" ? "계기 의존 정밀 착륙 성공" : "계기 비행 기록",
      score: `${s.steps}/${STEP_CAP} STEPS`,
      slug: "blind-pilot",
      customStats: [
        { label: "SEED", value: `${seed}` },
        { label: "OUTCOME", value: s.status === "win" ? "LANDED" : s.status === "lose" ? "MISSED" : "APPROACH" },
        { label: "DAMAGED", value: s.dead.toUpperCase() },
      ],
    });
    const ok = await copyShareCardToClipboard(canvas);
    if (ok) {
      setShareCardCopied(true);
      setTimeout(() => setShareCardCopied(false), 2000);
    } else {
      downloadShareCard(canvas, `blind-pilot-seed${seed}.png`);
    }
  }, [seed]);

  useEffect(() => {
    const player = audio.current;
    const radio = voice.current;
    return () => {
      player?.close();
      radio?.close();
    };
  }, []);

  useEffect(() => {
    const fromUrl = readSeed();
    if (fromUrl === 0) return;
    const next = createPilot(fromUrl);
    setSeed(fromUrl);
    setDraft(String(fromUrl));
    setState(next);
    setShown(next);
    setCall(attitudeOf(next));
    // The address is not a gesture. The call stays on screen until the player touches the page.
    voice.current?.cancel();
  }, []);

  useEffect(() => {
    const sync = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  useEffect(() => {
    audio.current?.setBed(!muted && !paused && !hidden);
  }, [hidden, muted, paused]);

  const arm = useCallback(() => {
    const player = audio.current;
    if (!player) return;
    player.arm();
    player.setBed(!mutedRef.current && !pausedRef.current && !document.hidden);
    voice.current?.arm();
    setVoiced(true);
  }, []);

  const note = useCallback((kind: Tick) => {
    if (mutedRef.current || pausedRef.current) return;
    audio.current?.tick(kind);
  }, []);

  const onSettled = useCallback((id: number) => {
    if (id !== glideSerial.current) return;
    setShown(stateRef.current);
    setGlide(null);
    setBusy(false);
  }, []);

  useEffect(() => {
    if (!busy || !glide || paused || hidden) return;
    const id = glide.id;
    const timer = window.setTimeout(() => {
      if (glideSerial.current !== id) return;
      setShown(stateRef.current);
      setGlide(null);
      setBusy(false);
    }, reduce ? 0 : 900);
    return () => window.clearTimeout(timer);
  }, [busy, glide, hidden, paused, reduce]);

  const begin = useCallback((next: PilotState, kind: Tick) => {
    arm();
    note(kind);
    if (next.status === "win" && containerRef.current) {
      celebrate(containerRef.current, { preset: "stardust" });
    }
    glideSerial.current += 1;
    setShown(stateRef.current);
    setState(next);
    setGlide({ id: glideSerial.current });
    setBusy(true);
  }, [arm, note, containerRef]);

  const move = useCallback((action: Action) => {
    const current = stateRef.current;
    if (pausedRef.current || busyRef.current || current.status !== "play") return;
    const next = stepPilot(current, action);
    if (next === current) {
      arm();
      if (!mutedRef.current && !pausedRef.current) audio.current?.tick("block");
      return;
    }
    const kind: Tick = action === "land" ? (next.status === "win" ? "win" : "miss") : next.status === "lose" ? "lose" : "nudge";
    begin(next, kind);
  }, [arm, begin]);

  const load = useCallback((value: number) => {
    const next = createPilot(value);
    glideSerial.current += 1;
    setSeed(value);
    setDraft(String(value));
    setState(next);
    setShown(next);
    setCall(attitudeOf(next));
    setGlide(null);
    setBusy(false);
    setPaused(false);
    writeSeed(value);
  }, []);

  const giveUp = useCallback(() => {
    const current = stateRef.current;
    if (current.status !== "play") return;
    begin(resign(current), "lose");
  }, [begin]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.closest("input, textarea")) return;
      if (event.code === "Escape") {
        event.preventDefault();
        setPaused((value) => !value);
        return;
      }
      if (event.code === "KeyF") {
        event.preventDefault();
        togglePortal();
        return;
      }
      if (event.code === "KeyV") {
        event.preventDefault();
        setView((value) => (value + 1) % 4);
        return;
      }
      const action = codeAction(event.code);
      if (!action) return;
      event.preventDefault();
      move(action);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move, togglePortal]);

  const locked = paused || busy || state.status !== "play";
  const open = new Set(openActions(state));
  const openNames = ACTIONS.filter((action) => open.has(action)).map((action) => label(action, copy));
  const outcome = state.loseReason === "miss"
    ? `${copy.missLead} ${state.miss.map((item) => missSentence(item, copy)).join(" ")}`
    : state.loseReason === "cap"
      ? copy.cap
      : copy.resigned;
  const debrief = state.status === "win" ? copy.win : state.status === "lose" ? outcome : "";
  const spoken = radioScript(state.status, towerSentence(call, copy), debrief);

  useEffect(() => {
    const radio = voice.current;
    if (!radio) return;
    if (!radioOpen(voiced, muted, paused, hidden)) {
      radio.cancel();
      return;
    }
    if (flightSpoken.current !== seed) {
      flightSpoken.current = seed;
      radio.replace(spoken);
      return;
    }
    radio.say(spoken);
  }, [voiced, muted, paused, hidden, spoken, seed]);

  const live = paused
    ? copy.paused
    : state.status === "win"
      ? copy.win
      : state.status === "lose"
        ? outcome
        : openNames.length === 0
          ? copy.none
          : `${copy.playing} ${openNames.join(" · ")}`;

  return (
    <div
      ref={containerRef}
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-4 overflow-y-auto overscroll-none bg-background" : "space-y-4"}
      onPointerDown={arm}
    >
      <header className="relative shrink-0 space-y-2 pr-12">
        <button
          type="button"
          onClick={togglePortal}
          className="absolute right-0 top-0 flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-border/60 bg-card text-foreground shadow-sm transition hover:bg-muted"
          title={isImmersive ? portalLabels.exit : portalLabels.enter}
          aria-label={isImmersive ? portalLabels.exit : portalLabels.enter}
        >
          {isImmersive ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
        <h2 className="text-2xl font-semibold text-foreground">{copy.title}</h2>
        <p className="text-sm leading-6 text-muted-foreground">{copy.lead}</p>
        <p className="text-xs leading-5 text-muted-foreground">{copy.keys}</p>
      </header>
      <div className="grid grid-cols-2 gap-2 text-center text-sm">
        <div className="rounded-xl bg-muted p-2">
          <b>{copy.steps}</b>
          <br />
          <span className="tabular-nums">{state.steps}/{STEP_CAP}</span>
        </div>
        <div className="rounded-xl bg-muted p-2">
          <b>{copy.seed}</b>
          <br />
          <span className="tabular-nums">{seed}</span>
        </div>
      </div>
      <p className="rounded-xl bg-muted px-3 py-2 text-sm text-foreground">
        <b>{copy.tower}</b> {word("pitch", call.pitch, copy)}, {word("bank", call.bank, copy)}, {word("power", call.power, copy)}. {copy.towerStays}
      </p>
      <ol className="grid gap-2">
        {GAUGE_AXES.map((axis) => (
          <li key={axis} className={gaugeClass(state.dead === axis)}>
            {gaugeLine(axis, state, copy)}
          </li>
        ))}
      </ol>
      <p role="status" aria-live="polite" className="text-sm text-foreground">{live}</p>
      {(state.status === "win" || state.status === "lose") && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleShareCard}
            className="flex-1 py-3 px-4 rounded-xl border border-border bg-card hover:bg-muted font-bold text-sm text-foreground transition-colors flex items-center justify-center gap-1.5 shadow-sm"
          >
            {shareCardCopied ? <Check className="w-4 h-4 text-primary" /> : <Share2 className="w-4 h-4" />}
            {shareCardCopied ? "결과 복사 완료!" : "결과 카드 공유"}
          </button>
          <button
            type="button"
            className="flex-1 py-3 px-4 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-sm hover:bg-primary/90 transition-colors"
            onClick={() => {
              arm();
              load(nextSeed(seed));
            }}
          >
            {copy.next}
          </button>
        </div>
      )}
      <div className={isImmersive ? "relative flex min-h-64 w-full flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card" : "relative overflow-hidden rounded-2xl border border-border bg-card"}>
        <div className={isImmersive ? "h-full min-h-64 w-full flex-1" : "h-96"} aria-hidden="true">
          <BlindPilotScene
            state={state}
            shown={shown}
            glide={glide}
            reduce={reduce}
            paused={paused || hidden}
            view={view}
            onSettled={onSettled}
          />
        </div>
        {paused ? (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <button type="button" className={controlClass("primary")} onClick={() => setPaused(false)}>
              {copy.resume}
            </button>
          </div>
        ) : null}
      </div>
      <div className="space-y-2">
        <p id="blind-pilot-acts" className="text-sm font-semibold text-foreground">{copy.acts}</p>
        <div role="group" aria-labelledby="blind-pilot-acts" className="grid grid-cols-2 gap-2">
          {GRID.map((action) => {
            const available = open.has(action);
            const detail = detailFor(state, action, copy);
            return (
              <button
                key={action}
                type="button"
                className={available ? controlClass("primary") : controlClass("quiet")}
                aria-keyshortcuts={shortcut(action)}
                aria-label={`${label(action, copy)}. ${detail}`}
                disabled={locked || !available}
                onClick={() => move(action)}
              >
                {label(action, copy)}
                <span className="block text-xs font-normal">{detail}</span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className={landClass(!locked)}
          aria-keyshortcuts="L"
          aria-label={`${copy.land}. ${detailFor(state, "land", copy)}`}
          disabled={locked}
          onClick={() => move("land")}
        >
          {copy.land}
          <span className="block text-xs font-normal">{detailFor(state, "land", copy)}</span>
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={paused ? controlClass("primary") : controlClass("quiet")} aria-pressed={paused} onClick={() => setPaused((value) => !value)}>
          {paused ? copy.resume : copy.pause}
        </button>
        <button type="button" className={controlClass("quiet")} onClick={() => setView((value) => (value + 1) % 4)}>
          {copy.view}
        </button>
        <button type="button" className={muted ? controlClass("primary") : controlClass("quiet")} aria-pressed={muted} onClick={() => { arm(); setMuted((value) => !value); }}>
          {muted ? copy.sound : copy.mute}
        </button>
        <button type="button" className={controlClass("danger")} disabled={state.status !== "play"} onClick={giveUp}>
          {copy.giveUp}
        </button>
      </div>
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const value = Number(draft);
          if (!Number.isFinite(value)) return;
          arm();
          load(Math.trunc(value));
        }}
      >
        <label className="space-y-1 text-sm text-foreground">
          <span className="block">{copy.seed}</span>
          <input
            value={draft}
            inputMode="numeric"
            onChange={(event) => setDraft(event.target.value)}
            className="min-h-11 w-28 rounded-xl border border-border bg-card px-3 text-foreground"
          />
        </label>
        <button type="submit" className={controlClass("quiet")}>{copy.apply}</button>
        <button
          type="button"
          className={controlClass("quiet")}
          onClick={() => {
            arm();
            load(nextSeed(seed));
          }}
        >
          {copy.next}
        </button>
      </form>
    </div>
  );
}
