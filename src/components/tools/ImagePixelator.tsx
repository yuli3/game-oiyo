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
  pixelSize: string;
  preview: string;
  empty: string;
  invalid: string;
  privacy: string;
}

const LABELS: Record<Locale, Labels> = {
  en: {
    title: "Image Pixelator",
    subtitle: "Average color blocks for privacy or pixel-art style.",
    upload: "Select image",
    replace: "Choose another image",
    download: "Download PNG",
    pixelSize: "Pixel size",
    preview: "Pixelated preview",
    empty: "Choose a local image and adjust the block size.",
    invalid: "Please select a valid image file.",
    privacy: "Local-only: the image is read with FileReader and redrawn on canvas.",
  },
  ko: {
    title: "이미지 픽셀화 도구",
    subtitle: "평균 색상 블록으로 개인정보 보호나 픽셀아트 느낌을 만듭니다.",
    upload: "이미지 선택",
    replace: "다른 이미지 선택",
    download: "PNG 다운로드",
    pixelSize: "픽셀 크기",
    preview: "픽셀화 미리보기",
    empty: "로컬 이미지를 선택하고 블록 크기를 조절하세요.",
    invalid: "올바른 이미지 파일을 선택하세요.",
    privacy: "로컬 처리: FileReader로 이미지를 읽고 캔버스에 다시 그립니다.",
  },
  ja: {
    title: "画像ピクセル化ツール",
    subtitle: "平均色のブロックでプライバシー保護やピクセルアート風にします。",
    upload: "画像を選択",
    replace: "別の画像を選択",
    download: "PNGをダウンロード",
    pixelSize: "ピクセルサイズ",
    preview: "ピクセル化プレビュー",
    empty: "ローカル画像を選び、ブロックサイズを調整します。",
    invalid: "有効な画像ファイルを選択してください。",
    privacy: "ローカル処理: FileReaderで読み込み、キャンバスに再描画します。",
  },
  fr: {
    title: "Pixeliseur d'Image",
    subtitle: "Créez des blocs de couleur moyenne pour anonymiser ou styliser.",
    upload: "Choisir une image",
    replace: "Choisir une autre image",
    download: "Télécharger PNG",
    pixelSize: "Taille des pixels",
    preview: "Aperçu pixellisé",
    empty: "Choisissez une image locale et ajustez la taille des blocs.",
    invalid: "Veuillez sélectionner un fichier image valide.",
    privacy: "Traitement local : l'image est lue avec FileReader puis redessinée sur canvas.",
  },
  es: {
    title: "Pixelador de Imágenes",
    subtitle: "Bloques de color promedio para privacidad o estilo pixel art.",
    upload: "Seleccionar imagen",
    replace: "Elegir otra imagen",
    download: "Descargar PNG",
    pixelSize: "Tamaño del píxel",
    preview: "Vista pixelada",
    empty: "Elige una imagen local y ajusta el tamaño del bloque.",
    invalid: "Selecciona un archivo de imagen válido.",
    privacy: "Procesamiento local: la imagen se lee con FileReader y se redibuja en canvas.",
  },
  zh: {
    title: "图片像素化工具",
    subtitle: "用平均色块实现隐私遮挡或像素艺术效果。",
    upload: "选择图片",
    replace: "选择另一张图片",
    download: "下载 PNG",
    pixelSize: "像素大小",
    preview: "像素化预览",
    empty: "选择本地图片，然后调整色块大小。",
    invalid: "请选择有效的图片文件。",
    privacy: "本地处理：图片通过 FileReader 读取，并在画布中重新绘制。",
  },
};

export default function ImagePixelator({ locale }: { locale: Locale }) {
  const t = LABELS[locale] ?? LABELS.en;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [pixelSize, setPixelSize] = useState(20);
  const [error, setError] = useState<string | null>(null);

  const pixelate = (img: HTMLImageElement, size: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    const source = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = source.data;

    for (let y = 0; y < canvas.height; y += size) {
      for (let x = 0; x < canvas.width; x += size) {
        const blockWidth = Math.min(size, canvas.width - x);
        const blockHeight = Math.min(size, canvas.height - y);
        let r = 0;
        let g = 0;
        let b = 0;
        let a = 0;
        let count = 0;

        for (let yy = 0; yy < blockHeight; yy += 1) {
          for (let xx = 0; xx < blockWidth; xx += 1) {
            const index = ((y + yy) * canvas.width + (x + xx)) * 4;
            r += data[index];
            g += data[index + 1];
            b += data[index + 2];
            a += data[index + 3];
            count += 1;
          }
        }

        ctx.fillStyle = `rgba(${Math.round(r / count)}, ${Math.round(g / count)}, ${Math.round(b / count)}, ${a / count / 255})`;
        ctx.fillRect(x, y, blockWidth, blockHeight);
      }
    }
  };

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    if (!file.type.startsWith("image/")) {
      setError(t.invalid);
      return;
    }

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const result = readerEvent.target?.result;
      if (typeof result !== "string") return;

      const img = new Image();
      img.onload = () => {
        imageRef.current = img;
        setImageSrc(result);
        window.requestAnimationFrame(() => pixelate(img, pixelSize));
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const handlePixelSizeChange = (value: number) => {
    setPixelSize(value);
    if (imageRef.current) pixelate(imageRef.current, value);
  };

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas || !imageSrc) return;

    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = "pixelated-image.png";
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

        {!imageSrc ? (
          <button type="button" className="w-full rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-12 text-center transition hover:border-indigo-300 hover:bg-indigo-50" onClick={() => inputRef.current?.click()}>
            <span className="block text-base font-semibold text-slate-900">{t.upload}</span>
            <span className="mt-2 block text-sm text-slate-600">{t.empty}</span>
          </button>
        ) : (
          <>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-xs font-semibold uppercase text-slate-500">{t.preview}</span>
                <span className="rounded-full bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-800">{pixelSize}px</span>
              </div>
              <canvas ref={canvasRef} className="max-h-[520px] w-full rounded-lg object-contain" style={{ imageRendering: "pixelated" }} />
            </div>

            <label className="block rounded-xl border border-slate-200 bg-slate-50 p-4">
              <span className="flex items-center justify-between text-sm font-semibold text-slate-800">
                {t.pixelSize}
                <span>{pixelSize}px</span>
              </span>
              <input
                type="range"
                min="2"
                max="100"
                step="1"
                value={pixelSize}
                onChange={(event) => handlePixelSizeChange(Number(event.target.value))}
                className="mt-3 w-full"
              />
            </label>

            <div className="flex flex-wrap gap-3">
              <button type="button" className={buttonClass} onClick={download}>
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
