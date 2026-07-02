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
  preview: string;
  empty: string;
  invalid: string;
  generated: string;
  privacy: string;
}

interface FaviconPreview {
  size: number;
  url: string;
}

const FAVICON_SIZES = [16, 32, 48, 180, 192, 512] as const;

const LABELS: Record<Locale, Labels> = {
  en: {
    title: "Favicon Generator",
    subtitle: "Create common PNG favicon sizes from one local image.",
    upload: "Select image",
    replace: "Choose another image",
    download: "Download",
    preview: "Preview",
    empty: "Choose a square logo or image. Each PNG is rendered locally on canvas.",
    invalid: "Please select a valid image file.",
    generated: "Generated PNG sizes",
    privacy: "Local-only: the source image is rendered in your browser and is not uploaded.",
  },
  ko: {
    title: "파비콘 생성기",
    subtitle: "로컬 이미지 하나로 주요 PNG 파비콘 크기를 만듭니다.",
    upload: "이미지 선택",
    replace: "다른 이미지 선택",
    download: "다운로드",
    preview: "미리보기",
    empty: "정사각형 로고나 이미지를 선택하세요. 각 PNG는 캔버스에서 로컬로 렌더링됩니다.",
    invalid: "올바른 이미지 파일을 선택하세요.",
    generated: "생성된 PNG 크기",
    privacy: "로컬 처리: 원본 이미지는 브라우저에서 렌더링되며 업로드되지 않습니다.",
  },
  ja: {
    title: "ファビコン生成ツール",
    subtitle: "1つのローカル画像から主要なPNGファビコンサイズを作成します。",
    upload: "画像を選択",
    replace: "別の画像を選択",
    download: "保存",
    preview: "プレビュー",
    empty: "正方形のロゴや画像を選択してください。各PNGはキャンバスでローカル生成されます。",
    invalid: "有効な画像ファイルを選択してください。",
    generated: "生成されたPNGサイズ",
    privacy: "ローカル処理: 元画像はブラウザでレンダリングされ、アップロードされません。",
  },
  fr: {
    title: "Générateur de Favicon",
    subtitle: "Créez les tailles PNG courantes de favicon depuis une image locale.",
    upload: "Choisir une image",
    replace: "Choisir une autre image",
    download: "Télécharger",
    preview: "Aperçu",
    empty: "Choisissez un logo ou une image carrée. Chaque PNG est rendu localement sur canvas.",
    invalid: "Veuillez sélectionner un fichier image valide.",
    generated: "Tailles PNG générées",
    privacy: "Traitement local : l'image source est rendue dans votre navigateur et n'est pas téléversée.",
  },
  es: {
    title: "Generador de Favicon",
    subtitle: "Crea tamaños PNG comunes de favicon desde una imagen local.",
    upload: "Seleccionar imagen",
    replace: "Elegir otra imagen",
    download: "Descargar",
    preview: "Vista previa",
    empty: "Elige un logo o imagen cuadrada. Cada PNG se renderiza localmente en canvas.",
    invalid: "Selecciona un archivo de imagen válido.",
    generated: "Tamaños PNG generados",
    privacy: "Procesamiento local: la imagen fuente se renderiza en tu navegador y no se sube.",
  },
  zh: {
    title: "Favicon 生成器",
    subtitle: "从一张本地图片生成常用 PNG favicon 尺寸。",
    upload: "选择图片",
    replace: "选择另一张图片",
    download: "下载",
    preview: "预览",
    empty: "请选择正方形标志或图片。每个 PNG 都会在画布中本地生成。",
    invalid: "请选择有效的图片文件。",
    generated: "已生成的 PNG 尺寸",
    privacy: "本地处理：源图片在你的浏览器中渲染，不会上传。",
  },
};

function downloadUrl(url: string, name: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
}

async function renderFavicons(file: File): Promise<FaviconPreview[]> {
  const bitmap = await createImageBitmap(file);
  try {
    return FAVICON_SIZES.map((size) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = size;
      canvas.height = size;
      if (ctx) {
        ctx.clearRect(0, 0, size, size);
        ctx.drawImage(bitmap, 0, 0, size, size);
      }
      return { size, url: canvas.toDataURL("image/png") };
    });
  } finally {
    bitmap.close();
  }
}

export default function FaviconGenerator({ locale }: { locale: Locale }) {
  const t = LABELS[locale] ?? LABELS.en;
  const inputRef = useRef<HTMLInputElement>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [previews, setPreviews] = useState<FaviconPreview[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);

  const handleFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    if (!file.type.startsWith("image/")) {
      setError(t.invalid);
      setPreviews([]);
      setSourceUrl(null);
      return;
    }

    setIsRendering(true);
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const result = readerEvent.target?.result;
      if (typeof result === "string") setSourceUrl(result);
    };
    reader.readAsDataURL(file);

    try {
      setPreviews(await renderFavicons(file));
    } catch (renderError) {
      setError(renderError instanceof Error ? renderError.message : t.invalid);
      setPreviews([]);
    } finally {
      setIsRendering(false);
    }
  };

  return (
    <GameContainer title={t.title} subtitle={t.subtitle}>
      <div className="space-y-5">
        <p className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900">
          {t.privacy}
        </p>

        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />

        <button type="button" className="w-full rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center transition hover:border-indigo-300 hover:bg-indigo-50" onClick={() => inputRef.current?.click()}>
          <span className="block text-base font-semibold text-slate-900">{sourceUrl ? t.replace : t.upload}</span>
          <span className="mt-2 block text-sm text-slate-600">{t.empty}</span>
        </button>

        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800">{error}</p>}
        {isRendering && <p className="rounded-lg bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-800">{t.generated}...</p>}

        {sourceUrl && (
          <figure className="rounded-xl border border-slate-200 bg-white p-4">
            <figcaption className="mb-3 text-xs font-semibold uppercase text-slate-500">{t.preview}</figcaption>
            <img src={sourceUrl} alt={t.preview} className="mx-auto h-32 w-32 rounded-lg border border-slate-200 object-contain" />
          </figure>
        )}

        {previews.length > 0 && (
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="font-semibold text-slate-900">{t.generated}</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {previews.map((preview) => (
                <article key={preview.size} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <div className="flex h-28 items-center justify-center rounded-lg bg-white">
                    <img
                      src={preview.url}
                      alt={`${preview.size}x${preview.size}`}
                      className="object-contain"
                      style={{ width: Math.min(preview.size, 96), height: Math.min(preview.size, 96) }}
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-900">{preview.size}x{preview.size}</span>
                    <button
                      type="button"
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 transition hover:bg-slate-50"
                      onClick={() => downloadUrl(preview.url, `favicon-${preview.size}x${preview.size}.png`)}
                    >
                      {t.download}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </GameContainer>
  );
}
