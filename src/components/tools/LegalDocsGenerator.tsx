import { useState } from "react";
import { GameContainer } from "../ui/game/GamePrimitives";
import type { Locale } from "../../lib/i18n";

type BusinessType = "ecommerce" | "saas" | "consulting" | "healthcare" | "education" | "technology";
type DocumentType = "about" | "privacy" | "terms";
type DataProcessingType = "minimal" | "moderate" | "extensive";

interface CompanyInfo {
  name: string;
  email: string;
  contact?: string;
  businessType: BusinessType;
  foundingYear?: string;
  teamSize?: string;
  countriesServed?: string;
  founders?: string;
  achievements?: string[];
  hasPaidProducts?: boolean;
  pricingDetails?: string;
  refundPolicy?: string;
  dataProcessing?: DataProcessingType;
  dataProcessingDetails?: string;
  cookiePolicy?: boolean;
  dataRetentionPeriod?: string;
  internationalTransfer?: boolean;
  minAge?: string;
}

interface DocumentSection {
  id: string;
  title: string;
  content?: string;
  isRequired: boolean;
  variations?: string[];
  showIf?: (info: CompanyInfo) => boolean;
}

interface DocumentTemplate {
  id: string;
  type: DocumentType;
  businessType: BusinessType;
  sections: DocumentSection[];
}

interface Labels {
  title: string;
  subtitle: string;
  companyName: string;
  email: string;
  contact: string;
  businessType: string;
  foundingYear: string;
  teamSize: string;
  countriesServed: string;
  founders: string;
  dataProcessing: string;
  dataProcessingDetails: string;
  dataRetentionPeriod: string;
  cookiePolicy: string;
  internationalTransfer: string;
  hasPaidProducts: string;
  pricingDetails: string;
  refundPolicy: string;
  minAge: string;
  documentType: string;
  generate: string;
  shuffle: string;
  copy: string;
  copied: string;
  downloadMd: string;
  downloadTxt: string;
  downloadHtml: string;
  previewEmpty: string;
  previewHint: string;
  privacyNote: string;
  disclaimer: string;
  lastUpdated: string;
  businessTypes: Record<BusinessType, string>;
  documentTypes: Record<DocumentType, string>;
  dataProcessingTypes: Record<DataProcessingType, string>;
}

const LABELS: Record<Locale, Labels> = {
  en: {
    title: "Legal Docs Generator",
    subtitle: "Create starter About, Privacy Policy, and Terms drafts from templates.",
    companyName: "Company name",
    email: "Email address",
    contact: "Contact (optional)",
    businessType: "Business type",
    foundingYear: "Founding year",
    teamSize: "Team size",
    countriesServed: "Countries served",
    founders: "Founders",
    dataProcessing: "Data processing level",
    dataProcessingDetails: "Additional data processing details",
    dataRetentionPeriod: "Data retention period",
    cookiePolicy: "Website uses cookies",
    internationalTransfer: "Transfer data internationally",
    hasPaidProducts: "Offer paid products or services",
    pricingDetails: "Pricing details",
    refundPolicy: "Refund policy",
    minAge: "Minimum age requirement",
    documentType: "Document type",
    generate: "Generate document",
    shuffle: "Generate with variation",
    copy: "Copy",
    copied: "Copied",
    downloadMd: ".md",
    downloadTxt: ".txt",
    downloadHtml: ".html",
    previewEmpty: "Preview will appear here",
    previewHint: "Fill in your details and click Generate Document.",
    privacyNote: "Inputs are used only in your browser to generate the document. They are not stored or sent.",
    disclaimer: "Template output is for drafting only and is not legal advice. Review requirements with qualified counsel before publishing.",
    lastUpdated: "Last updated",
    businessTypes: { ecommerce: "Ecommerce", saas: "SaaS", consulting: "Consulting", healthcare: "Healthcare", education: "Education", technology: "Technology" },
    documentTypes: { about: "About", privacy: "Privacy", terms: "Terms" },
    dataProcessingTypes: { minimal: "Minimal - essential data only", moderate: "Moderate - service-related data", extensive: "Extensive - comprehensive data" },
  },
  ko: {
    title: "법률 문서 생성기",
    subtitle: "소개, 개인정보 처리방침, 이용약관 초안을 템플릿으로 만듭니다.",
    companyName: "회사명",
    email: "이메일",
    contact: "추가 연락처(선택)",
    businessType: "사업 유형",
    foundingYear: "설립 연도",
    teamSize: "팀 규모",
    countriesServed: "서비스 국가 수",
    founders: "창업자",
    dataProcessing: "데이터 처리 수준",
    dataProcessingDetails: "추가 데이터 처리 설명",
    dataRetentionPeriod: "데이터 보관 기간",
    cookiePolicy: "쿠키 사용",
    internationalTransfer: "국외 이전 포함",
    hasPaidProducts: "유료 상품/서비스 제공",
    pricingDetails: "가격 정책",
    refundPolicy: "환불 정책",
    minAge: "최소 이용 연령",
    documentType: "문서 유형",
    generate: "문서 생성",
    shuffle: "다른 문장으로 생성",
    copy: "복사",
    copied: "복사됨",
    downloadMd: ".md",
    downloadTxt: ".txt",
    downloadHtml: ".html",
    previewEmpty: "미리보기가 여기에 표시됩니다",
    previewHint: "정보를 입력하고 문서 생성을 누르세요.",
    privacyNote: "입력값은 브라우저에서 문서 생성에만 사용되며 저장되거나 전송되지 않습니다.",
    disclaimer: "이 템플릿은 초안 작성용이며 법률 자문이 아닙니다. 게시 전 전문가 검토를 받으세요.",
    lastUpdated: "마지막 생성",
    businessTypes: { ecommerce: "이커머스", saas: "SaaS", consulting: "컨설팅", healthcare: "헬스케어", education: "교육", technology: "기술" },
    documentTypes: { about: "소개", privacy: "개인정보", terms: "약관" },
    dataProcessingTypes: { minimal: "최소 - 필수 정보 중심", moderate: "보통 - 서비스 관련 정보", extensive: "상세 - 포괄적 정보" },
  },
  ja: {
    title: "法務ドキュメント生成ツール",
    subtitle: "会社紹介、プライバシーポリシー、利用規約の下書きを作成します。",
    companyName: "会社名",
    email: "メールアドレス",
    contact: "追加連絡先（任意）",
    businessType: "事業種別",
    foundingYear: "設立年",
    teamSize: "チーム規模",
    countriesServed: "提供国数",
    founders: "創業者",
    dataProcessing: "データ処理レベル",
    dataProcessingDetails: "追加のデータ処理説明",
    dataRetentionPeriod: "データ保存期間",
    cookiePolicy: "Cookieを使用する",
    internationalTransfer: "国際移転を含む",
    hasPaidProducts: "有料商品・サービスを提供",
    pricingDetails: "料金の詳細",
    refundPolicy: "返金ポリシー",
    minAge: "最低利用年齢",
    documentType: "文書種別",
    generate: "文書を生成",
    shuffle: "別表現で生成",
    copy: "コピー",
    copied: "コピー済み",
    downloadMd: ".md",
    downloadTxt: ".txt",
    downloadHtml: ".html",
    previewEmpty: "プレビューがここに表示されます",
    previewHint: "情報を入力して生成してください。",
    privacyNote: "入力内容はブラウザ内の生成にのみ使われ、保存または送信されません。",
    disclaimer: "このテンプレートは下書き用であり、法的助言ではありません。公開前に専門家へ確認してください。",
    lastUpdated: "最終生成",
    businessTypes: { ecommerce: "EC", saas: "SaaS", consulting: "コンサルティング", healthcare: "ヘルスケア", education: "教育", technology: "テクノロジー" },
    documentTypes: { about: "会社紹介", privacy: "プライバシー", terms: "規約" },
    dataProcessingTypes: { minimal: "最小 - 必須データのみ", moderate: "標準 - サービス関連データ", extensive: "広範 - 包括的データ" },
  },
  fr: {
    title: "Generateur de Documents Juridiques",
    subtitle: "Creez des brouillons A propos, Politique de confidentialite et Conditions.",
    companyName: "Nom de l'entreprise",
    email: "Adresse e-mail",
    contact: "Contact supplementaire",
    businessType: "Type d'activite",
    foundingYear: "Annee de creation",
    teamSize: "Taille de l'equipe",
    countriesServed: "Pays servis",
    founders: "Fondateurs",
    dataProcessing: "Niveau de traitement",
    dataProcessingDetails: "Details supplementaires",
    dataRetentionPeriod: "Duree de conservation",
    cookiePolicy: "Le site utilise des cookies",
    internationalTransfer: "Transferts internationaux",
    hasPaidProducts: "Produits ou services payants",
    pricingDetails: "Details de prix",
    refundPolicy: "Politique de remboursement",
    minAge: "Age minimum",
    documentType: "Type de document",
    generate: "Generer",
    shuffle: "Generer une variante",
    copy: "Copier",
    copied: "Copie",
    downloadMd: ".md",
    downloadTxt: ".txt",
    downloadHtml: ".html",
    previewEmpty: "L'apercu apparaitra ici",
    previewHint: "Renseignez les champs puis generez le document.",
    privacyNote: "Les champs sont utilises uniquement dans votre navigateur et ne sont pas envoyes.",
    disclaimer: "Ce modele sert de brouillon et ne constitue pas un conseil juridique. Faites verifier avant publication.",
    lastUpdated: "Derniere generation",
    businessTypes: { ecommerce: "E-commerce", saas: "SaaS", consulting: "Conseil", healthcare: "Sante", education: "Education", technology: "Technologie" },
    documentTypes: { about: "A propos", privacy: "Confidentialite", terms: "Conditions" },
    dataProcessingTypes: { minimal: "Minimal - donnees essentielles", moderate: "Modere - donnees de service", extensive: "Etendu - donnees completes" },
  },
  es: {
    title: "Generador de Documentos Legales",
    subtitle: "Crea borradores de Acerca de, Politica de privacidad y Terminos.",
    companyName: "Nombre de empresa",
    email: "Correo electronico",
    contact: "Contacto adicional",
    businessType: "Tipo de negocio",
    foundingYear: "Ano de fundacion",
    teamSize: "Tamano del equipo",
    countriesServed: "Paises atendidos",
    founders: "Fundadores",
    dataProcessing: "Nivel de tratamiento",
    dataProcessingDetails: "Detalles adicionales",
    dataRetentionPeriod: "Periodo de retencion",
    cookiePolicy: "El sitio usa cookies",
    internationalTransfer: "Transferencia internacional",
    hasPaidProducts: "Ofrece productos o servicios de pago",
    pricingDetails: "Detalles de precios",
    refundPolicy: "Politica de reembolso",
    minAge: "Edad minima",
    documentType: "Tipo de documento",
    generate: "Generar",
    shuffle: "Generar variante",
    copy: "Copiar",
    copied: "Copiado",
    downloadMd: ".md",
    downloadTxt: ".txt",
    downloadHtml: ".html",
    previewEmpty: "La vista previa aparecera aqui",
    previewHint: "Completa los datos y genera el documento.",
    privacyNote: "Los datos se usan solo en tu navegador y no se almacenan ni envian.",
    disclaimer: "Esta plantilla es solo un borrador y no constituye asesoramiento legal. Revisala con un profesional antes de publicarla.",
    lastUpdated: "Ultima generacion",
    businessTypes: { ecommerce: "Comercio electronico", saas: "SaaS", consulting: "Consultoria", healthcare: "Salud", education: "Educacion", technology: "Tecnologia" },
    documentTypes: { about: "Acerca de", privacy: "Privacidad", terms: "Terminos" },
    dataProcessingTypes: { minimal: "Minimo - datos esenciales", moderate: "Moderado - datos del servicio", extensive: "Extenso - datos completos" },
  },
  zh: {
    title: "法律文档生成器",
    subtitle: "根据模板生成关于我们、隐私政策和服务条款草稿。",
    companyName: "公司名称",
    email: "邮箱地址",
    contact: "其他联系方式（可选）",
    businessType: "业务类型",
    foundingYear: "成立年份",
    teamSize: "团队规模",
    countriesServed: "服务国家数",
    founders: "创始人",
    dataProcessing: "数据处理级别",
    dataProcessingDetails: "补充数据处理说明",
    dataRetentionPeriod: "数据保留期限",
    cookiePolicy: "网站使用 Cookie",
    internationalTransfer: "涉及跨境传输",
    hasPaidProducts: "提供付费产品或服务",
    pricingDetails: "价格说明",
    refundPolicy: "退款政策",
    minAge: "最低年龄要求",
    documentType: "文档类型",
    generate: "生成文档",
    shuffle: "生成变体",
    copy: "复制",
    copied: "已复制",
    downloadMd: ".md",
    downloadTxt: ".txt",
    downloadHtml: ".html",
    previewEmpty: "预览会显示在这里",
    previewHint: "填写信息后点击生成文档。",
    privacyNote: "输入内容只在浏览器中用于生成文档，不会存储或发送。",
    disclaimer: "此模板仅用于起草，不构成法律建议。发布前请让合格专业人士审核。",
    lastUpdated: "最后生成",
    businessTypes: { ecommerce: "电商", saas: "SaaS", consulting: "咨询", healthcare: "医疗健康", education: "教育", technology: "科技" },
    documentTypes: { about: "关于我们", privacy: "隐私政策", terms: "服务条款" },
    dataProcessingTypes: { minimal: "最低 - 仅必要数据", moderate: "中等 - 服务相关数据", extensive: "广泛 - 全面数据" },
  },
};

const businessTypes: BusinessType[] = ["ecommerce", "saas", "consulting", "healthcare", "education", "technology"];
const documentTypes: DocumentType[] = ["about", "privacy", "terms"];
const dataProcessingTypes: DataProcessingType[] = ["minimal", "moderate", "extensive"];

const defaultCompanyInfo: CompanyInfo = {
  name: "",
  email: "",
  businessType: "technology",
  dataProcessing: "minimal",
  foundingYear: new Date().getFullYear().toString(),
  teamSize: "50+",
  countriesServed: "20+",
  founders: "John Doe and Jane Smith",
  dataRetentionPeriod: "3 years",
  cookiePolicy: true,
  internationalTransfer: false,
  minAge: "16",
  hasPaidProducts: false,
  pricingDetails: "Our services start from $29/month with custom enterprise pricing available.",
  refundPolicy: "We offer a 30-day money-back guarantee for all our subscription plans.",
  achievements: ["Industry leader in technology solutions", "Serving over 1000+ satisfied customers", "Award-winning customer support"],
};

const getAboutTemplate = (businessType: BusinessType): DocumentTemplate => ({
  id: "about",
  type: "about",
  businessType,
  sections: [
    {
      id: "introduction",
      title: "Introduction",
      variations: [
        "Welcome to {{companyName}}. Since our founding in {{foundingYear}}, we've been at the forefront of {{businessType}} innovation. Today, our team of {{teamSize}} professionals serves clients across {{countriesServed}} countries, delivering exceptional solutions that drive growth and efficiency.",
        "At {{companyName}}, we've been revolutionizing the {{businessType}} industry since {{foundingYear}}. Founded by {{founders}}, we've grown into a dynamic team of {{teamSize}} experts, serving clients in {{countriesServed}} countries worldwide.",
      ],
      isRequired: true,
    },
    {
      id: "mission",
      title: "Our Mission",
      variations: [
        "Our mission at {{companyName}} is to transform the {{businessType}} landscape through innovative solutions, fostering growth and efficiency in an ever-evolving digital world.",
        "At {{companyName}}, we're driven by a singular mission: to empower businesses through cutting-edge {{businessType}} solutions that create lasting value and drive sustainable growth.",
      ],
      isRequired: true,
    },
    {
      id: "values",
      title: "Our Values",
      content: "• Innovation: We embrace new technologies and ideas\n• Integrity: We operate with transparency and honesty\n• Excellence: We pursue the highest standards in our work\n• Client Focus: We prioritize our clients' success",
      isRequired: true,
    },
    { id: "achievements", title: "Our Achievements", content: "We're proud of our journey and accomplishments:\n\n{{achievements}}", isRequired: true },
    { id: "contact", title: "Get in Touch", content: "We'd love to hear from you! Reach out to our team at {{email}}{{contact}} to discuss how we can help your business succeed.", isRequired: true },
  ],
});

const getPrivacyTemplate = (businessType: BusinessType): DocumentTemplate => ({
  id: "privacy",
  type: "privacy",
  businessType,
  sections: [
    {
      id: "introduction",
      title: "Introduction",
      variations: [
        `Last Updated: ${new Date().toLocaleDateString()}\n\nAt {{companyName}}, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our {{businessType}} services.`,
        "Welcome to {{companyName}}'s Privacy Policy. This document outlines our commitment to protecting your privacy and managing your data responsibly while providing our {{businessType}} services.",
      ],
      isRequired: true,
    },
    { id: "data-collection", title: "Information We Collect", content: "{{dataProcessing}}\n\nWe retain your data for {{dataRetentionPeriod}} to fulfill the purposes outlined in this policy.", isRequired: true },
    {
      id: "data-usage",
      title: "How We Use Your Information",
      variations: [
        "We use your information to:\n\n• Provide and improve our services\n• Communicate with you about our services\n• Send important updates and announcements\n• Respond to your inquiries\n• Comply with legal obligations\n\nWe do not sell your personal information to third parties.",
        "Your information helps us:\n\n• Deliver personalized services\n• Enhance user experience\n• Maintain service quality\n• Send relevant updates\n• Meet regulatory requirements\n\nWe never sell your personal data.",
      ],
      isRequired: true,
    },
    { id: "data-rights", title: "Your Data Rights", content: "You have the right to:\n\n• Access your personal data\n• Correct inaccurate data\n• Request deletion of your data\n• Opt-out of marketing communications\n\nTo exercise these rights, contact us at {{email}}.", isRequired: true },
    { id: "contact", title: "Contact Us", content: "If you have questions about this Privacy Policy or our privacy practices, please contact our Data Protection Officer at {{email}}{{contact}}.", isRequired: true },
  ],
});

const getTermsTemplate = (businessType: BusinessType): DocumentTemplate => ({
  id: "terms",
  type: "terms",
  businessType,
  sections: [
    {
      id: "introduction",
      title: "Introduction",
      variations: [
        `Last Updated: ${new Date().toLocaleDateString()}\n\nThese Terms of Service ("Terms") govern your use of {{companyName}}'s {{businessType}} services. By using our services, you agree to these Terms. You must be at least {{minAge}} years old to use our services.`,
        "Welcome to {{companyName}}'s Terms of Service. These Terms outline the rules and regulations for using our {{businessType}} services. By accessing or using our services, you agree to these Terms. A minimum age of {{minAge}} years is required to use our services.",
      ],
      isRequired: true,
    },
    { id: "services", title: "Services", content: "We provide {{businessType}} services, including but not limited to:\n\n• Professional consulting\n• Technical solutions\n• Support services\n• Regular updates and maintenance\n\nWe reserve the right to modify or discontinue any service at our discretion.", isRequired: true },
    { id: "pricing", title: "Pricing and Payments", content: "{{pricingDetails}}\n\nRefund Policy:\n{{refundPolicy}}", showIf: (info) => info.hasPaidProducts === true, isRequired: false },
    { id: "user-obligations", title: "User Obligations", content: "You agree to:\n\n• Provide accurate information\n• Maintain the security of your account\n• Comply with applicable laws\n• Use our services responsibly\n\nViolation of these obligations may result in service termination.", isRequired: true },
    { id: "intellectual-property", title: "Intellectual Property", content: "All content, trademarks, and intellectual property related to our services belong to {{companyName}}. You may not use, copy, or distribute our content without explicit permission.", isRequired: true },
    { id: "liability", title: "Limitation of Liability", content: '{{companyName}} provides services "as is" without warranties. We shall not be liable for any indirect, incidental, or consequential damages arising from the use of our services.', isRequired: true },
    { id: "contact", title: "Contact", content: "For questions about these Terms or our services, contact us at {{email}}{{contact}}.", isRequired: true },
  ],
});

function getDataProcessingContent(type: DataProcessingType, details?: string, usesCookies?: boolean, internationalTransfer?: boolean): string {
  const baseContent = {
    minimal: "We collect and process only essential information required to provide our services. This includes basic contact details and account information. We minimize data collection and retain information only for the duration necessary to serve you.",
    moderate: "We collect and process information necessary for service delivery and improvement. This includes contact details, usage data, and preferences. We implement regular data review and deletion processes to ensure data minimization.",
    extensive: "We collect and process comprehensive information to provide personalized services. This includes detailed profile information, usage patterns, and preferences. We maintain strict data protection measures and regular audits to ensure security.",
  }[type];

  let content = baseContent;
  if (usesCookies) content += "\n\nOur website uses cookies and similar tracking technologies to enhance your browsing experience, analyze site traffic, and personalize content. You can control cookie preferences through your browser settings.";
  if (internationalTransfer) content += "\n\nWe may transfer your data to servers located outside your country of residence. We ensure appropriate safeguards are in place to protect your information during such transfers.";
  if (details) content += `\n\nSpecific Processing Details:\n${details}`;
  return content;
}

function getTemplate(type: DocumentType, businessType: BusinessType) {
  if (type === "about") return getAboutTemplate(businessType);
  if (type === "privacy") return getPrivacyTemplate(businessType);
  return getTermsTemplate(businessType);
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function downloadAsFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function LegalDocsGenerator({ locale }: { locale: Locale }) {
  const t = LABELS[locale] ?? LABELS.en;
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(defaultCompanyInfo);
  const [selectedDocType, setSelectedDocType] = useState<DocumentType>("about");
  const [preview, setPreview] = useState("");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [copied, setCopied] = useState(false);

  const setInfo = (patch: Partial<CompanyInfo>) => setCompanyInfo((current) => ({ ...current, ...patch }));

  const generateDocument = () => {
    const template = getTemplate(selectedDocType, companyInfo.businessType);
    let content = template.sections
      .filter((section) => !section.showIf || section.showIf(companyInfo))
      .map((section) => {
        const sectionContent = section.variations ? section.variations[Math.floor(Math.random() * section.variations.length)] : section.content;
        return `## ${section.title}\n\n${sectionContent ?? ""}`;
      })
      .join("\n\n");

    const replacements: Record<string, string> = {
      "{{companyName}}": companyInfo.name || defaultCompanyInfo.name || "[Company Name]",
      "{{email}}": companyInfo.email || defaultCompanyInfo.email || "[Email]",
      "{{businessType}}": companyInfo.businessType,
      "{{foundingYear}}": companyInfo.foundingYear || defaultCompanyInfo.foundingYear || "",
      "{{teamSize}}": companyInfo.teamSize || defaultCompanyInfo.teamSize || "",
      "{{countriesServed}}": companyInfo.countriesServed || defaultCompanyInfo.countriesServed || "",
      "{{founders}}": companyInfo.founders || defaultCompanyInfo.founders || "",
      "{{minAge}}": companyInfo.minAge || defaultCompanyInfo.minAge || "",
      "{{dataRetentionPeriod}}": companyInfo.dataRetentionPeriod || defaultCompanyInfo.dataRetentionPeriod || "",
      "{{pricingDetails}}": companyInfo.pricingDetails || defaultCompanyInfo.pricingDetails || "",
      "{{refundPolicy}}": companyInfo.refundPolicy || defaultCompanyInfo.refundPolicy || "",
      "{{contact}}": companyInfo.contact ? ` or ${companyInfo.contact}` : "",
      "{{achievements}}": (companyInfo.achievements || defaultCompanyInfo.achievements || []).map((achievement) => `• ${achievement}`).join("\n"),
    };

    Object.entries(replacements).forEach(([key, value]) => {
      content = content.split(key).join(value);
    });

    if (selectedDocType === "privacy" && content.includes("{{dataProcessing}}")) {
      content = content.replace(
        "{{dataProcessing}}",
        getDataProcessingContent(companyInfo.dataProcessing || "minimal", companyInfo.dataProcessingDetails, companyInfo.cookiePolicy, companyInfo.internationalTransfer),
      );
    }

    setPreview(content);
    setLastUpdate(new Date());
    setCopied(false);
  };

  const copyToClipboard = async () => {
    if (!preview) return;
    await navigator.clipboard.writeText(preview);
    setCopied(true);
  };

  const downloadAs = (format: "md" | "txt" | "html") => {
    if (!preview) return;
    const baseName = `${selectedDocType}-${companyInfo.name || "document"}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    if (format === "html") {
      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(selectedDocType)} - ${escapeHtml(companyInfo.name || "document")}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 2rem; }
    h2 { color: #2563eb; margin-top: 2rem; }
  </style>
</head>
<body>
${preview
  .split("\n")
  .map((line) => (line.startsWith("## ") ? `<h2>${escapeHtml(line.substring(3))}</h2>` : `<p>${escapeHtml(line)}</p>`))
  .join("\n")}
</body>
</html>`;
      downloadAsFile(`${baseName}.html`, html, "text/html");
      return;
    }
    downloadAsFile(`${baseName}.${format}`, preview, "text/plain");
  };

  const inputCls = "w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100";
  const buttonCls = "rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700";
  const secondaryButtonCls = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50";

  return (
    <GameContainer title={t.title} subtitle={t.subtitle}>
      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
          <label className="block text-sm font-medium text-slate-700">
            {t.companyName}
            <input className={`${inputCls} mt-1`} value={companyInfo.name} onChange={(e) => setInfo({ name: e.target.value })} />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            {t.email}
            <input className={`${inputCls} mt-1`} type="email" value={companyInfo.email} onChange={(e) => setInfo({ email: e.target.value })} />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            {t.contact}
            <input className={`${inputCls} mt-1`} value={companyInfo.contact || ""} onChange={(e) => setInfo({ contact: e.target.value })} />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            {t.businessType}
            <select className={`${inputCls} mt-1`} value={companyInfo.businessType} onChange={(e) => setInfo({ businessType: e.target.value as BusinessType })}>
              {businessTypes.map((type) => (
                <option key={type} value={type}>
                  {t.businessTypes[type]}
                </option>
              ))}
            </select>
          </label>

          {selectedDocType === "about" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                {t.foundingYear}
                <input className={`${inputCls} mt-1`} type="number" value={companyInfo.foundingYear || ""} onChange={(e) => setInfo({ foundingYear: e.target.value })} />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                {t.teamSize}
                <input className={`${inputCls} mt-1`} value={companyInfo.teamSize || ""} onChange={(e) => setInfo({ teamSize: e.target.value })} />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                {t.countriesServed}
                <input className={`${inputCls} mt-1`} value={companyInfo.countriesServed || ""} onChange={(e) => setInfo({ countriesServed: e.target.value })} />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                {t.founders}
                <input className={`${inputCls} mt-1`} value={companyInfo.founders || ""} onChange={(e) => setInfo({ founders: e.target.value })} />
              </label>
            </div>
          )}

          {selectedDocType === "privacy" && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-700">
                {t.dataProcessing}
                <select className={`${inputCls} mt-1`} value={companyInfo.dataProcessing} onChange={(e) => setInfo({ dataProcessing: e.target.value as DataProcessingType })}>
                  {dataProcessingTypes.map((type) => (
                    <option key={type} value={type}>
                      {t.dataProcessingTypes[type]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-700">
                {t.dataProcessingDetails}
                <textarea className={`${inputCls} mt-1 min-h-24`} value={companyInfo.dataProcessingDetails || ""} onChange={(e) => setInfo({ dataProcessingDetails: e.target.value })} />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                {t.dataRetentionPeriod}
                <input className={`${inputCls} mt-1`} value={companyInfo.dataRetentionPeriod || ""} onChange={(e) => setInfo({ dataRetentionPeriod: e.target.value })} />
              </label>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input type="checkbox" checked={Boolean(companyInfo.cookiePolicy)} onChange={(e) => setInfo({ cookiePolicy: e.target.checked })} />
                {t.cookiePolicy}
              </label>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input type="checkbox" checked={Boolean(companyInfo.internationalTransfer)} onChange={(e) => setInfo({ internationalTransfer: e.target.checked })} />
                {t.internationalTransfer}
              </label>
            </div>
          )}

          {selectedDocType === "terms" && (
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input type="checkbox" checked={Boolean(companyInfo.hasPaidProducts)} onChange={(e) => setInfo({ hasPaidProducts: e.target.checked })} />
                {t.hasPaidProducts}
              </label>
              {companyInfo.hasPaidProducts && (
                <>
                  <label className="block text-sm font-medium text-slate-700">
                    {t.pricingDetails}
                    <textarea className={`${inputCls} mt-1 min-h-20`} value={companyInfo.pricingDetails || ""} onChange={(e) => setInfo({ pricingDetails: e.target.value })} />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    {t.refundPolicy}
                    <textarea className={`${inputCls} mt-1 min-h-20`} value={companyInfo.refundPolicy || ""} onChange={(e) => setInfo({ refundPolicy: e.target.value })} />
                  </label>
                </>
              )}
              <label className="block text-sm font-medium text-slate-700">
                {t.minAge}
                <input className={`${inputCls} mt-1`} type="number" value={companyInfo.minAge || ""} onChange={(e) => setInfo({ minAge: e.target.value })} />
              </label>
            </div>
          )}

          <div>
            <div className="mb-2 text-sm font-medium text-slate-700">{t.documentType}</div>
            <div className="grid grid-cols-3 gap-2">
              {documentTypes.map((type) => (
                <button key={type} type="button" className={selectedDocType === type ? buttonCls : secondaryButtonCls} onClick={() => setSelectedDocType(type)}>
                  {t.documentTypes[type]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button type="button" className={`${buttonCls} flex-1`} onClick={generateDocument}>
              {t.generate}
            </button>
            <button type="button" className={secondaryButtonCls} onClick={generateDocument} title={t.shuffle}>
              {t.shuffle}
            </button>
          </div>
          <p className="rounded-lg border border-sky-100 bg-sky-50 px-3 py-2 text-xs leading-5 text-sky-900">{t.privacyNote}</p>
          <p className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">{t.disclaimer}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex flex-wrap gap-2">
            <button type="button" className={secondaryButtonCls} onClick={copyToClipboard} disabled={!preview}>
              {copied ? t.copied : t.copy}
            </button>
            <button type="button" className={secondaryButtonCls} onClick={() => downloadAs("md")} disabled={!preview}>
              {t.downloadMd}
            </button>
            <button type="button" className={secondaryButtonCls} onClick={() => downloadAs("txt")} disabled={!preview}>
              {t.downloadTxt}
            </button>
            <button type="button" className={secondaryButtonCls} onClick={() => downloadAs("html")} disabled={!preview}>
              {t.downloadHtml}
            </button>
          </div>
          <pre className="min-h-96 max-h-[34rem] overflow-auto whitespace-pre-wrap rounded-lg bg-slate-950 p-4 text-sm leading-6 text-slate-100">
            {preview || `${t.previewEmpty}\n\n${t.previewHint}`}
          </pre>
          {lastUpdate && <div className="mt-2 text-right text-xs text-slate-500">{t.lastUpdated}: {lastUpdate.toLocaleTimeString()}</div>}
        </div>
      </div>
    </GameContainer>
  );
}
