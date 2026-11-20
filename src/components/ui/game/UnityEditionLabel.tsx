import { useEffect, useState } from "react";

/**
 * Label for the link to a game's Unity 3D edition.
 *
 * Those links used to carry hand-written Korean ("3D 실행", "Unity 3D 실시간
 * 에디션 (12스테이지)") that showed on every locale. The game components do not
 * share one locale prop, so the label reads the page language from <html lang>
 * after mount; the server render shows the language-neutral "3D ↗".
 */
const LABELS: Record<string, string> = {
  ko: "3D 버전으로 플레이",
  en: "Play the 3D version",
  ja: "3D版で遊ぶ",
  zh: "玩 3D 版",
  fr: "Jouer en 3D",
  es: "Jugar en 3D",
};

const BLURBS: Record<string, [string, string]> = {
  ko: ["Unity 3D 버전", "같은 게임을 3D로 즐겨요. 새 탭에서 열려요."],
  en: ["Unity 3D version", "The same game in 3D. Opens in a new tab."],
  ja: ["Unity 3D版", "同じゲームを3Dで。新しいタブで開きます。"],
  zh: ["Unity 3D 版", "同一款游戏的 3D 版，在新标签页中打开。"],
  fr: ["Version 3D Unity", "Le même jeu en 3D, dans un nouvel onglet."],
  es: ["Versión 3D en Unity", "El mismo juego en 3D, en una pestaña nueva."],
};

export function unityEditionBlurb(lang: string | null | undefined): [string, string] {
  const key = (lang ?? "").slice(0, 2).toLowerCase();
  return BLURBS[key] ?? BLURBS.en;
}

/** Title and one-line note for the banner next to the Unity link (replaces
 * per-game Korean copy that claimed unverified stage counts and languages). */
export function UnityEditionBlurb() {
  const [text, setText] = useState<[string, string]>(["Unity 3D", ""]);
  useEffect(() => {
    setText(unityEditionBlurb(document.documentElement.lang));
  }, []);
  return (
    <div className="flex flex-col">
      <span className="text-xs font-bold text-foreground">{text[0]}</span>
      <span className="text-xs text-muted-foreground">{text[1]}</span>
    </div>
  );
}

export function unityEditionLabel(lang: string | null | undefined): string {
  const key = (lang ?? "").slice(0, 2).toLowerCase();
  return LABELS[key] ?? LABELS.en;
}

export default function UnityEditionLabel() {
  const [label, setLabel] = useState("3D");
  useEffect(() => {
    setLabel(unityEditionLabel(document.documentElement.lang));
  }, []);
  return (
    <>
      <span>{label}</span>
      <span aria-hidden="true">↗</span>
    </>
  );
}
