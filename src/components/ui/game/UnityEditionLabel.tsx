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
