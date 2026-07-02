import { useMemo, useState } from "react";
import { GameContainer } from "../ui/game/GamePrimitives";
import type { Locale } from "../../lib/i18n";

type DataType = "profile" | "name" | "email" | "number" | "integer" | "prime" | "uuid" | "mac" | "ipv4" | "hex" | "alphanumeric" | "date" | "time";
type OutputFormat = "list" | "csv" | "json";

interface Labels {
  title: string;
  subtitle: string;
  typeLabel: string;
  countLabel: string;
  minLabel: string;
  maxLabel: string;
  decimalsLabel: string;
  lengthLabel: string;
  startDateLabel: string;
  endDateLabel: string;
  formatLabel: string;
  generate: string;
  copy: string;
  copied: string;
  download: string;
  outputTitle: string;
  empty: string;
  invalidPrime: string;
  dataTypes: Record<DataType, string>;
  formats: Record<OutputFormat, string>;
}

const LABELS: Record<Locale, Labels> = {
  en: {
    title: "Random Data Generator",
    subtitle: "Generate synthetic names, emails, numbers, UUIDs, dates, and network values.",
    typeLabel: "Data type",
    countLabel: "Rows",
    minLabel: "Min",
    maxLabel: "Max",
    decimalsLabel: "Decimals",
    lengthLabel: "String length",
    startDateLabel: "Start date",
    endDateLabel: "End date",
    formatLabel: "Output format",
    generate: "Generate",
    copy: "Copy",
    copied: "Copied",
    download: "Download",
    outputTitle: "Output",
    empty: "Choose options and generate sample data.",
    invalidPrime: "Set max to 2 or higher to generate a prime number.",
    dataTypes: {
      profile: "Profile: name + email",
      name: "Name",
      email: "Email",
      number: "Decimal number",
      integer: "Integer",
      prime: "Prime number",
      uuid: "UUID",
      mac: "MAC address",
      ipv4: "IPv4 address",
      hex: "Hex string",
      alphanumeric: "Alphanumeric",
      date: "Date",
      time: "Time",
    },
    formats: { list: "List", csv: "CSV", json: "JSON" },
  },
  ko: {
    title: "랜덤 데이터 생성기",
    subtitle: "이름, 이메일, 숫자, UUID, 날짜, 네트워크 값을 테스트용으로 생성합니다.",
    typeLabel: "데이터 유형",
    countLabel: "행 수",
    minLabel: "최소값",
    maxLabel: "최대값",
    decimalsLabel: "소수 자리",
    lengthLabel: "문자열 길이",
    startDateLabel: "시작일",
    endDateLabel: "종료일",
    formatLabel: "출력 형식",
    generate: "생성",
    copy: "복사",
    copied: "복사됨",
    download: "다운로드",
    outputTitle: "출력",
    empty: "옵션을 선택한 뒤 샘플 데이터를 생성하세요.",
    invalidPrime: "소수를 생성하려면 최대값을 2 이상으로 설정하세요.",
    dataTypes: {
      profile: "프로필: 이름 + 이메일",
      name: "이름",
      email: "이메일",
      number: "소수",
      integer: "정수",
      prime: "소수",
      uuid: "UUID",
      mac: "MAC 주소",
      ipv4: "IPv4 주소",
      hex: "16진 문자열",
      alphanumeric: "영숫자 문자열",
      date: "날짜",
      time: "시간",
    },
    formats: { list: "목록", csv: "CSV", json: "JSON" },
  },
  ja: {
    title: "ランダムデータ生成ツール",
    subtitle: "名前、メール、数値、UUID、日付、ネットワーク値をテスト用に生成します。",
    typeLabel: "データ種別",
    countLabel: "行数",
    minLabel: "最小値",
    maxLabel: "最大値",
    decimalsLabel: "小数桁",
    lengthLabel: "文字列の長さ",
    startDateLabel: "開始日",
    endDateLabel: "終了日",
    formatLabel: "出力形式",
    generate: "生成",
    copy: "コピー",
    copied: "コピー済み",
    download: "ダウンロード",
    outputTitle: "出力",
    empty: "オプションを選んでサンプルデータを生成してください。",
    invalidPrime: "素数を生成するには最大値を2以上にしてください。",
    dataTypes: {
      profile: "プロフィール: 名前 + メール",
      name: "名前",
      email: "メール",
      number: "小数",
      integer: "整数",
      prime: "素数",
      uuid: "UUID",
      mac: "MACアドレス",
      ipv4: "IPv4アドレス",
      hex: "16進文字列",
      alphanumeric: "英数字",
      date: "日付",
      time: "時刻",
    },
    formats: { list: "リスト", csv: "CSV", json: "JSON" },
  },
  fr: {
    title: "Generateur de Donnees Aleatoires",
    subtitle: "Creez des noms, e-mails, nombres, UUID, dates et valeurs reseau synthetiques.",
    typeLabel: "Type de donnee",
    countLabel: "Lignes",
    minLabel: "Min",
    maxLabel: "Max",
    decimalsLabel: "Decimales",
    lengthLabel: "Longueur",
    startDateLabel: "Date de debut",
    endDateLabel: "Date de fin",
    formatLabel: "Format de sortie",
    generate: "Generer",
    copy: "Copier",
    copied: "Copie",
    download: "Telecharger",
    outputTitle: "Sortie",
    empty: "Choisissez les options puis genereez des donnees d'exemple.",
    invalidPrime: "Choisissez un maximum de 2 ou plus pour generer un nombre premier.",
    dataTypes: {
      profile: "Profil : nom + e-mail",
      name: "Nom",
      email: "E-mail",
      number: "Nombre decimal",
      integer: "Entier",
      prime: "Nombre premier",
      uuid: "UUID",
      mac: "Adresse MAC",
      ipv4: "Adresse IPv4",
      hex: "Chaine hex",
      alphanumeric: "Alphanumerique",
      date: "Date",
      time: "Heure",
    },
    formats: { list: "Liste", csv: "CSV", json: "JSON" },
  },
  es: {
    title: "Generador de Datos Aleatorios",
    subtitle: "Genera nombres, correos, numeros, UUID, fechas y valores de red sinteticos.",
    typeLabel: "Tipo de dato",
    countLabel: "Filas",
    minLabel: "Min",
    maxLabel: "Max",
    decimalsLabel: "Decimales",
    lengthLabel: "Longitud",
    startDateLabel: "Fecha inicial",
    endDateLabel: "Fecha final",
    formatLabel: "Formato",
    generate: "Generar",
    copy: "Copiar",
    copied: "Copiado",
    download: "Descargar",
    outputTitle: "Salida",
    empty: "Elige opciones y genera datos de ejemplo.",
    invalidPrime: "Usa un maximo de 2 o mas para generar un numero primo.",
    dataTypes: {
      profile: "Perfil: nombre + correo",
      name: "Nombre",
      email: "Correo",
      number: "Numero decimal",
      integer: "Entero",
      prime: "Numero primo",
      uuid: "UUID",
      mac: "Direccion MAC",
      ipv4: "Direccion IPv4",
      hex: "Cadena hex",
      alphanumeric: "Alfanumerico",
      date: "Fecha",
      time: "Hora",
    },
    formats: { list: "Lista", csv: "CSV", json: "JSON" },
  },
  zh: {
    title: "随机数据生成器",
    subtitle: "生成用于测试的姓名、邮箱、数字、UUID、日期和网络值。",
    typeLabel: "数据类型",
    countLabel: "行数",
    minLabel: "最小值",
    maxLabel: "最大值",
    decimalsLabel: "小数位",
    lengthLabel: "字符串长度",
    startDateLabel: "开始日期",
    endDateLabel: "结束日期",
    formatLabel: "输出格式",
    generate: "生成",
    copy: "复制",
    copied: "已复制",
    download: "下载",
    outputTitle: "输出",
    empty: "选择选项后生成样本数据。",
    invalidPrime: "生成质数时最大值需为 2 或更高。",
    dataTypes: {
      profile: "资料：姓名 + 邮箱",
      name: "姓名",
      email: "邮箱",
      number: "小数",
      integer: "整数",
      prime: "质数",
      uuid: "UUID",
      mac: "MAC 地址",
      ipv4: "IPv4 地址",
      hex: "十六进制字符串",
      alphanumeric: "字母数字字符串",
      date: "日期",
      time: "时间",
    },
    formats: { list: "列表", csv: "CSV", json: "JSON" },
  },
};

const firstNames = ["Ari", "Mina", "Theo", "Jia", "Noah", "Lina", "Kai", "Sofia", "Leo", "Hana"];
const lastNames = ["Kim", "Lee", "Park", "Choi", "Smith", "Garcia", "Martin", "Tanaka", "Chen", "Lopez"];
const domains = ["example.com", "test.local", "demo.io", "sample.dev"];

function generateNumber(min: number, max: number, decimals: number) {
  const random = Math.random() * (max - min) + min;
  return Number(random.toFixed(decimals));
}

function generateInteger(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generatePrime(max: number): number | null {
  if (max < 2) return null;
  const isPrime = (num: number): boolean => {
    for (let i = 2; i <= Math.sqrt(num); i += 1) {
      if (num % i === 0) return false;
    }
    return num > 1;
  };

  let num = 2;
  do {
    num = Math.floor(Math.random() * max) + 1;
  } while (!isPrime(num));
  return num;
}

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function generateMACAddress(): string {
  return Array.from({ length: 6 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, "0")).join(":");
}

function generateIPv4(): string {
  return Array.from({ length: 4 }, () => Math.floor(Math.random() * 256)).join(".");
}

function generateHex(length: number): string {
  return Array.from({ length }, () => Math.floor(Math.random() * 16).toString(16)).join("");
}

function generateAlphanumeric(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join("");
}

function generateDate(start?: Date, end?: Date): Date {
  const startDate = start || new Date(1970, 0, 1);
  const endDate = end || new Date();
  return new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()));
}

function generateTime(): string {
  const hours = Math.floor(Math.random() * 24);
  const minutes = Math.floor(Math.random() * 60);
  const seconds = Math.floor(Math.random() * 60);
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function randomName() {
  const first = firstNames[Math.floor(Math.random() * firstNames.length)];
  const last = lastNames[Math.floor(Math.random() * lastNames.length)];
  return `${first} ${last}`;
}

function emailFromName(name: string) {
  const domain = domains[Math.floor(Math.random() * domains.length)];
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, ".")}.${generateInteger(10, 99)}@${domain}`;
}

function csvEscape(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function downloadText(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

interface Row {
  index: number;
  type: DataType;
  value: string;
  name?: string;
  email?: string;
}

export default function RandomDataGenerator({ locale }: { locale: Locale }) {
  const t = LABELS[locale] ?? LABELS.en;
  const [dataType, setDataType] = useState<DataType>("profile");
  const [format, setFormat] = useState<OutputFormat>("list");
  const [count, setCount] = useState(10);
  const [min, setMin] = useState(0);
  const [max, setMax] = useState(100);
  const [decimals, setDecimals] = useState(0);
  const [length, setLength] = useState(10);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [copied, setCopied] = useState(false);

  const makeRow = (index: number): Row => {
    if (dataType === "profile") {
      const name = randomName();
      const email = emailFromName(name);
      return { index, type: dataType, value: `${name} <${email}>`, name, email };
    }
    if (dataType === "name") return { index, type: dataType, value: randomName() };
    if (dataType === "email") return { index, type: dataType, value: emailFromName(randomName()) };
    if (dataType === "number") return { index, type: dataType, value: String(generateNumber(min, max, Math.max(0, Math.min(10, decimals)))) };
    if (dataType === "integer") return { index, type: dataType, value: String(generateInteger(min, max)) };
    if (dataType === "prime") return { index, type: dataType, value: String(generatePrime(max) ?? t.invalidPrime) };
    if (dataType === "uuid") return { index, type: dataType, value: generateUUID() };
    if (dataType === "mac") return { index, type: dataType, value: generateMACAddress() };
    if (dataType === "ipv4") return { index, type: dataType, value: generateIPv4() };
    if (dataType === "hex") return { index, type: dataType, value: generateHex(Math.max(1, length)) };
    if (dataType === "alphanumeric") return { index, type: dataType, value: generateAlphanumeric(Math.max(1, length)) };
    if (dataType === "date") {
      const start = startDate ? new Date(startDate) : undefined;
      const end = endDate ? new Date(endDate) : undefined;
      return { index, type: dataType, value: generateDate(start, end).toISOString() };
    }
    return { index, type: dataType, value: generateTime() };
  };

  const output = useMemo(() => {
    if (rows.length === 0) return "";
    if (format === "json") return JSON.stringify(rows, null, 2);
    if (format === "csv") {
      const header = ["index", "type", "value", "name", "email"].join(",");
      const body = rows.map((row) => [row.index, row.type, csvEscape(row.value), csvEscape(row.name ?? ""), csvEscape(row.email ?? "")].join(","));
      return [header, ...body].join("\n");
    }
    return rows.map((row) => `${row.index}. ${row.value}`).join("\n");
  }, [format, rows]);

  const inputCls = "w-full rounded-lg border border-border px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";
  const buttonCls = "rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50";
  const secondaryButtonCls = "rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-background";

  const handleGenerate = () => {
    const safeCount = Math.max(1, Math.min(200, count));
    setRows(Array.from({ length: safeCount }, (_, i) => makeRow(i + 1)));
    setCopied(false);
  };

  const copyOutput = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
  };

  const downloadOutput = () => {
    if (!output) return;
    const ext = format === "json" ? "json" : format === "csv" ? "csv" : "txt";
    const mime = format === "json" ? "application/json" : format === "csv" ? "text/csv" : "text/plain";
    downloadText(`random-data.${ext}`, output, mime);
  };

  return (
    <GameContainer title={t.title} subtitle={t.subtitle}>
      <div className="grid gap-5">
        <div className="grid gap-4 rounded-xl border border-border bg-white p-4 md:grid-cols-2">
          <label className="text-sm font-medium text-muted-foreground">
            {t.typeLabel}
            <select className={`${inputCls} mt-1`} value={dataType} onChange={(e) => setDataType(e.target.value as DataType)}>
              {(Object.keys(t.dataTypes) as DataType[]).map((type) => (
                <option key={type} value={type}>
                  {t.dataTypes[type]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-muted-foreground">
            {t.formatLabel}
            <select className={`${inputCls} mt-1`} value={format} onChange={(e) => setFormat(e.target.value as OutputFormat)}>
              {(Object.keys(t.formats) as OutputFormat[]).map((item) => (
                <option key={item} value={item}>
                  {t.formats[item]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-muted-foreground">
            {t.countLabel}
            <input className={`${inputCls} mt-1`} type="number" min="1" max="200" value={count} onChange={(e) => setCount(Number(e.target.value))} />
          </label>
          {(dataType === "number" || dataType === "integer" || dataType === "prime") && (
            <>
              <label className="text-sm font-medium text-muted-foreground">
                {t.minLabel}
                <input className={`${inputCls} mt-1`} type="number" value={min} onChange={(e) => setMin(Number(e.target.value))} disabled={dataType === "prime"} />
              </label>
              <label className="text-sm font-medium text-muted-foreground">
                {t.maxLabel}
                <input className={`${inputCls} mt-1`} type="number" value={max} onChange={(e) => setMax(Number(e.target.value))} />
              </label>
            </>
          )}
          {dataType === "number" && (
            <label className="text-sm font-medium text-muted-foreground">
              {t.decimalsLabel}
              <input className={`${inputCls} mt-1`} type="number" min="0" max="10" value={decimals} onChange={(e) => setDecimals(Number(e.target.value))} />
            </label>
          )}
          {(dataType === "hex" || dataType === "alphanumeric") && (
            <label className="text-sm font-medium text-muted-foreground">
              {t.lengthLabel}
              <input className={`${inputCls} mt-1`} type="number" min="1" max="128" value={length} onChange={(e) => setLength(Number(e.target.value))} />
            </label>
          )}
          {dataType === "date" && (
            <>
              <label className="text-sm font-medium text-muted-foreground">
                {t.startDateLabel}
                <input className={`${inputCls} mt-1`} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </label>
              <label className="text-sm font-medium text-muted-foreground">
                {t.endDateLabel}
                <input className={`${inputCls} mt-1`} type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </label>
            </>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" className={buttonCls} onClick={handleGenerate}>
            {t.generate}
          </button>
          <button type="button" className={secondaryButtonCls} onClick={copyOutput} disabled={!output}>
            {copied ? t.copied : t.copy}
          </button>
          <button type="button" className={secondaryButtonCls} onClick={downloadOutput} disabled={!output}>
            {t.download}
          </button>
        </div>

        <div className="rounded-xl border border-border bg-foreground p-4">
          <div className="mb-3 text-sm font-semibold text-background">{t.outputTitle}</div>
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words text-sm leading-6 text-background">{output || t.empty}</pre>
        </div>
      </div>
    </GameContainer>
  );
}
