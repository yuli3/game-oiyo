import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { GameContainer } from "../ui/game/GamePrimitives";
import type { Locale } from "../../lib/i18n";

interface Labels {
  title: string;
  subtitle: string;
  upload: string;
  replace: string;
  download: string;
  original: string;
  result: string;
  empty: string;
  invalid: string;
  privacy: string;
}

const LABELS: Record<Locale, Labels> = {
  en: {
    title: "Image Grayscale",
    subtitle: "Convert an image to luminance grayscale in your browser.",
    upload: "Select image",
    replace: "Choose another image",
    download: "Download PNG",
    original: "Original",
    result: "Grayscale result",
    empty: "Choose a local image file to preview the grayscale result.",
    invalid: "Please select a valid image file.",
    privacy: "Local-only: the image is read with FileReader and processed on this canvas.",
  },
  ko: {
    title: "이미지 흑백 변환기",
    subtitle: "브라우저에서 이미지를 명도 기반 흑백 PNG로 변환합니다.",
    upload: "이미지 선택",
    replace: "다른 이미지 선택",
    download: "PNG 다운로드",
    original: "원본",
    result: "흑백 결과",
    empty: "로컬 이미지 파일을 선택하면 흑백 결과를 미리 볼 수 있습니다.",
    invalid: "올바른 이미지 파일을 선택하세요.",
    privacy: "로컬 처리: FileReader로 이미지를 읽고 이 캔버스에서만 처리합니다.",
  },
  ja: {
    title: "画像グレースケール変換",
    subtitle: "ブラウザ内で画像を輝度ベースの白黒PNGに変換します。",
    upload: "画像を選択",
    replace: "別の画像を選択",
    download: "PNGをダウンロード",
    original: "元画像",
    result: "変換結果",
    empty: "ローカル画像を選ぶと、白黒変換の結果を確認できます。",
    invalid: "有効な画像ファイルを選択してください。",
    privacy: "ローカル処理: FileReaderで読み込み、このキャンバス上で処理します。",
  },
  fr: {
    title: "Image en Niveaux de Gris",
    subtitle: "Convertissez une image en PNG gris selon la luminance, dans le navigateur.",
    upload: "Choisir une image",
    replace: "Choisir une autre image",
    download: "Télécharger PNG",
    original: "Original",
    result: "Résultat gris",
    empty: "Choisissez une image locale pour prévisualiser la version en niveaux de gris.",
    invalid: "Veuillez sélectionner un fichier image valide.",
    privacy: "Traitement local : l'image est lue avec FileReader puis traitée sur ce canvas.",
  },
  es: {
    title: "Imagen en Escala de Grises",
    subtitle: "Convierte una imagen a PNG gris por luminancia en el navegador.",
    upload: "Seleccionar imagen",
    replace: "Elegir otra imagen",
    download: "Descargar PNG",
    original: "Original",
    result: "Resultado gris",
    empty: "Elige una imagen local para previsualizar la versión en escala de grises.",
    invalid: "Selecciona un archivo de imagen válido.",
    privacy: "Procesamiento local: la imagen se lee con FileReader y se procesa en este canvas.",
  },
  zh: {
    title: "图片灰度转换器",
    subtitle: "在浏览器中按亮度公式把图片转换为灰度 PNG。",
    upload: "选择图片",
    replace: "选择另一张图片",
    download: "下载 PNG",
    original: "原图",
    result: "灰度结果",
    empty: "选择本地图片后，可以预览灰度转换结果。",
    invalid: "请选择有效的图片文件。",
    privacy: "本地处理：图片通过 FileReader 读取，并只在此画布中处理。",
  },
};

export default function ImageGrayscale({ locale }: { locale: Locale }) {
  const t = LABELS[locale] ?? LABELS.en;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [hasResult, setHasResult] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processImage = (src: string) => {
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
      }

      ctx.putImageData(imageData, 0, 0);
      setHasResult(true);
    };
    img.src = src;
  };

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setHasResult(false);
    if (!file.type.startsWith("image/")) {
      setError(t.invalid);
      return;
    }

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const result = readerEvent.target?.result;
      if (typeof result !== "string") return;
      setOriginalImage(result);
      window.requestAnimationFrame(() => processImage(result));
    };
    reader.readAsDataURL(file);
  };

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasResult) return;

    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = "grayscale-image.png";
    link.click();
  };

  const buttonClass =
    "rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700";
  const secondaryButtonClass =
    "cursor-pointer rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50";

  return (
    <GameContainer title={t.title} subtitle={t.subtitle}>
      <div className="space-y-5">
        <p className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900">
          {t.privacy}
        </p>

        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />

        {!originalImage ? (
          <button type="button" className="w-full rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-12 text-center transition hover:border-indigo-300 hover:bg-indigo-50" onClick={() => inputRef.current?.click()}>
            <span className="block text-base font-semibold text-slate-900">{t.upload}</span>
            <span className="mt-2 block text-sm text-slate-600">{t.empty}</span>
          </button>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <figure className="rounded-xl border border-slate-200 bg-white p-3">
                <figcaption className="mb-2 text-xs font-semibold uppercase text-slate-500">{t.original}</figcaption>
                <img src={originalImage} alt={t.original} className="max-h-80 w-full rounded-lg object-contain" />
              </figure>
              <figure className="rounded-xl border border-slate-200 bg-white p-3">
                <figcaption className="mb-2 text-xs font-semibold uppercase text-slate-500">{t.result}</figcaption>
                <canvas ref={canvasRef} className="max-h-80 w-full rounded-lg object-contain" />
              </figure>
            </div>

            <div className="flex flex-wrap gap-3">
              <button type="button" className={buttonClass} onClick={download} disabled={!hasResult}>
                {t.download}
              </button>
              <button type="button" className={secondaryButtonClass} onClick={() => inputRef.current?.click()}>
                {t.replace}
              </button>
            </div>
          </>
        )}

        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800">{error}</p>}
      </div>
    </GameContainer>
  );
}
