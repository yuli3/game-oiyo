import { useState } from "react";
import type { ChangeEvent } from "react";
import { GameContainer } from "../ui/game/GamePrimitives";
import type { Locale } from "../../lib/i18n";

interface Labels {
  title: string;
  subtitle: string;
  upload: string;
  replace: string;
  download: string;
  downloadAll: string;
  frame: string;
  delay: string;
  empty: string;
  invalid: string;
  unsupported: string;
  decoding: string;
  extracted: string;
  privacy: string;
}

interface GifFrame {
  index: number;
  url: string;
  width: number;
  height: number;
  delayMs: number | null;
}

type DrawableFrame = CanvasImageSource & {
  close?: () => void;
  displayWidth?: number;
  displayHeight?: number;
  codedWidth?: number;
  codedHeight?: number;
};

type ImageDecoderResult = {
  image: DrawableFrame;
  duration?: number | null;
};

type ImageDecoderInstance = {
  tracks: {
    ready: Promise<unknown>;
    selectedTrack?: {
      frameCount?: number;
    };
  };
  decode: (options?: { frameIndex?: number }) => Promise<ImageDecoderResult>;
  close: () => void;
};

type ImageDecoderConstructor = new (options: { data: Blob; type: string }) => ImageDecoderInstance;

const LABELS: Record<Locale, Labels> = {
  en: {
    title: "GIF Splitter",
    subtitle: "Extract animated GIF frames with the browser ImageDecoder API.",
    upload: "Select GIF",
    replace: "Choose another GIF",
    download: "Download frame",
    downloadAll: "Download all frames",
    frame: "Frame",
    delay: "Delay",
    empty: "Choose a local .gif file. Supported browsers will decode each frame as PNG.",
    invalid: "Please select a GIF file.",
    unsupported: "This browser does not expose ImageDecoder for GIF files. Try a Chromium-based browser, or use a GIF tool with decoder-library support.",
    decoding: "Decoding frames...",
    extracted: "frames extracted",
    privacy: "Local-only: the GIF is decoded in your browser and is not uploaded.",
  },
  ko: {
    title: "GIF 프레임 분리기",
    subtitle: "브라우저 ImageDecoder API로 GIF 프레임을 PNG로 추출합니다.",
    upload: "GIF 선택",
    replace: "다른 GIF 선택",
    download: "프레임 다운로드",
    downloadAll: "전체 프레임 다운로드",
    frame: "프레임",
    delay: "지연",
    empty: "로컬 .gif 파일을 선택하세요. 지원 브라우저에서는 각 프레임을 PNG로 추출합니다.",
    invalid: "GIF 파일을 선택하세요.",
    unsupported: "이 브라우저는 GIF용 ImageDecoder를 제공하지 않습니다. Chromium 계열 브라우저를 사용하거나 디코더 라이브러리를 쓰는 도구가 필요합니다.",
    decoding: "프레임을 추출하는 중...",
    extracted: "개 프레임 추출됨",
    privacy: "로컬 처리: GIF는 브라우저에서 디코딩되며 업로드되지 않습니다.",
  },
  ja: {
    title: "GIFフレーム分割",
    subtitle: "ブラウザのImageDecoder APIでGIFフレームをPNGとして抽出します。",
    upload: "GIFを選択",
    replace: "別のGIFを選択",
    download: "フレームを保存",
    downloadAll: "全フレームを保存",
    frame: "フレーム",
    delay: "遅延",
    empty: "ローカルの.gifファイルを選択してください。対応ブラウザでは各フレームをPNGにします。",
    invalid: "GIFファイルを選択してください。",
    unsupported: "このブラウザはGIF用ImageDecoderを公開していません。Chromium系ブラウザ、またはデコーダーライブラリ対応ツールが必要です。",
    decoding: "フレームを抽出しています...",
    extracted: "フレームを抽出しました",
    privacy: "ローカル処理: GIFはブラウザ内でデコードされ、アップロードされません。",
  },
  fr: {
    title: "Séparateur de GIF",
    subtitle: "Extrayez les images d'un GIF avec l'API ImageDecoder du navigateur.",
    upload: "Choisir un GIF",
    replace: "Choisir un autre GIF",
    download: "Télécharger l'image",
    downloadAll: "Tout télécharger",
    frame: "Image",
    delay: "Délai",
    empty: "Choisissez un fichier .gif local. Les navigateurs compatibles exportent chaque image en PNG.",
    invalid: "Veuillez sélectionner un fichier GIF.",
    unsupported: "Ce navigateur n'expose pas ImageDecoder pour les GIF. Essayez un navigateur Chromium ou un outil avec bibliothèque de décodage.",
    decoding: "Décodage des images...",
    extracted: "images extraites",
    privacy: "Traitement local : le GIF est décodé dans votre navigateur et n'est pas téléversé.",
  },
  es: {
    title: "Separador de GIF",
    subtitle: "Extrae fotogramas GIF con la API ImageDecoder del navegador.",
    upload: "Seleccionar GIF",
    replace: "Elegir otro GIF",
    download: "Descargar fotograma",
    downloadAll: "Descargar todo",
    frame: "Fotograma",
    delay: "Retraso",
    empty: "Elige un archivo .gif local. Los navegadores compatibles extraen cada fotograma como PNG.",
    invalid: "Selecciona un archivo GIF.",
    unsupported: "Este navegador no expone ImageDecoder para GIF. Prueba un navegador basado en Chromium o una herramienta con biblioteca de decodificación.",
    decoding: "Decodificando fotogramas...",
    extracted: "fotogramas extraídos",
    privacy: "Procesamiento local: el GIF se decodifica en tu navegador y no se sube.",
  },
  zh: {
    title: "GIF 帧拆分器",
    subtitle: "使用浏览器 ImageDecoder API 将 GIF 帧导出为 PNG。",
    upload: "选择 GIF",
    replace: "选择另一个 GIF",
    download: "下载帧",
    downloadAll: "下载全部帧",
    frame: "帧",
    delay: "延迟",
    empty: "选择本地 .gif 文件。支持的浏览器会把每一帧导出为 PNG。",
    invalid: "请选择 GIF 文件。",
    unsupported: "此浏览器没有提供 GIF 的 ImageDecoder。请尝试 Chromium 系浏览器，或使用带解码库的 GIF 工具。",
    decoding: "正在解码帧...",
    extracted: "帧已提取",
    privacy: "本地处理：GIF 在你的浏览器中解码，不会上传。",
  },
};

function getImageDecoder() {
  return (globalThis as typeof globalThis & { ImageDecoder?: ImageDecoderConstructor }).ImageDecoder;
}

function downloadUrl(url: string, name: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
}

export default function GifSplitter({ locale }: { locale: Locale }) {
  const t = LABELS[locale] ?? LABELS.en;
  const [frames, setFrames] = useState<GifFrame[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDecoding, setIsDecoding] = useState(false);

  const extractFrames = async (file: File) => {
    const Decoder = getImageDecoder();
    if (!Decoder) {
      setError(t.unsupported);
      return;
    }

    setIsDecoding(true);
    setError(null);
    setStatus(t.decoding);
    setFrames([]);

    let decoder: ImageDecoderInstance | null = null;
    try {
      decoder = new Decoder({ data: file, type: file.type || "image/gif" });
      await decoder.tracks.ready;

      const frameCount = decoder.tracks.selectedTrack?.frameCount;
      const maxFrames = typeof frameCount === "number" && Number.isFinite(frameCount) && frameCount > 0 ? frameCount : 200;
      const extracted: GifFrame[] = [];

      for (let index = 0; index < maxFrames; index += 1) {
        try {
          const decoded = await decoder.decode({ frameIndex: index });
          const image = decoded.image;
          const width = image.displayWidth ?? image.codedWidth ?? 1;
          const height = image.displayHeight ?? image.codedHeight ?? 1;
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            image.close?.();
            continue;
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(image, 0, 0, width, height);
          extracted.push({
            index,
            url: canvas.toDataURL("image/png"),
            width,
            height,
            delayMs: typeof decoded.duration === "number" ? Math.round(decoded.duration / 1000) : null,
          });
          image.close?.();
        } catch (decodeError) {
          if (typeof frameCount === "number") throw decodeError;
          break;
        }
      }

      setFrames(extracted);
      setStatus(`${extracted.length} ${t.extracted}`);
    } catch (decodeError) {
      setError(decodeError instanceof Error ? decodeError.message : t.unsupported);
      setStatus(null);
    } finally {
      decoder?.close();
      setIsDecoding(false);
    }
  };

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isGif = file.type === "image/gif" || file.name.toLowerCase().endsWith(".gif");
    if (!isGif) {
      setError(t.invalid);
      setFrames([]);
      setStatus(null);
      return;
    }

    void extractFrames(file);
  };

  return (
    <GameContainer title={t.title} subtitle={t.subtitle}>
      <div className="space-y-5">
        <p className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900">
          {t.privacy}
        </p>

        <label className="block cursor-pointer rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center transition hover:border-indigo-300 hover:bg-indigo-50">
          <span className="block text-base font-semibold text-slate-900">{frames.length ? t.replace : t.upload}</span>
          <span className="mt-2 block text-sm text-slate-600">{t.empty}</span>
          <input type="file" accept="image/gif,.gif" className="hidden" onChange={handleFileSelect} />
        </label>

        {isDecoding && <p className="rounded-lg bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-800">{t.decoding}</p>}
        {status && !isDecoding && <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-800">{status}</p>}
        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800">{error}</p>}

        {frames.length > 0 && (
          <>
            <button
              type="button"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
              onClick={() => frames.forEach((frame, order) => window.setTimeout(() => downloadUrl(frame.url, `gif-frame-${frame.index + 1}.png`), order * 120))}
            >
              {t.downloadAll}
            </button>

            <div className="grid gap-4 sm:grid-cols-2">
              {frames.map((frame) => (
                <article key={frame.index} className="rounded-xl border border-slate-200 bg-white p-3">
                  <img src={frame.url} alt={`${t.frame} ${frame.index + 1}`} className="h-40 w-full rounded-lg bg-slate-100 object-contain" />
                  <div className="mt-3 flex items-center justify-between gap-2 text-sm">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {t.frame} {frame.index + 1}
                      </p>
                      <p className="text-xs text-slate-500">
                        {frame.width}x{frame.height}
                        {frame.delayMs !== null ? ` · ${t.delay} ${frame.delayMs}ms` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 transition hover:bg-slate-50"
                      onClick={() => downloadUrl(frame.url, `gif-frame-${frame.index + 1}.png`)}
                    >
                      {t.download}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </GameContainer>
  );
}
