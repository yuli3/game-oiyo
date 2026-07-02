import { useState } from "react";
import type { Locale } from "../../lib/i18n";

interface Props {
  locale: Locale;
}

type Gender = "boy" | "girl" | "neutral";
type Style = "korean-traditional" | "modern" | "english" | "japanese";
type Meaning = "light" | "flower" | "courage" | "wisdom" | "peace" | "love";
type Element = "wood" | "fire" | "earth" | "metal" | "water";

interface NameEntry {
  name: string;
  gender: Gender | "neutral";
  style: Style;
  meaning: Meaning;
  element: Element;
  description: Record<Locale, string>;
}

const NAMES: NameEntry[] = [
  // ── 남아 한국 전통 ──────────────────────────────────────
  { name: "도현", gender: "boy", style: "korean-traditional", meaning: "wisdom", element: "water", description: { ko: "도리와 현명함을 겸비한 이름", en: "Wisdom and virtue combined", ja: "道理と賢さを兼ね備えた名前", fr: "Sagesse et vertu réunies", es: "Sabiduría y virtud combinadas", zh: "兼具道理与智慧的名字", } },
  { name: "준서", gender: "boy", style: "korean-traditional", meaning: "wisdom", element: "wood", description: { ko: "뛰어나고 서로를 이어주는 이름", en: "Excellence and connection", ja: "卓越さとつながりを表す名前", fr: "Excellence et connexion", es: "Excelencia y conexión", zh: "卓越与连结的名字", } },
  { name: "민준", gender: "boy", style: "korean-traditional", meaning: "wisdom", element: "fire", description: { ko: "백성을 이끄는 준수한 인재", en: "Talented leader of the people", ja: "民を率いる優秀な人材", fr: "Talent qui guide le peuple", es: "Talentoso líder del pueblo", zh: "引领百姓的优秀人才", } },
  { name: "서준", gender: "boy", style: "korean-traditional", meaning: "peace", element: "metal", description: { ko: "서쪽의 빛, 평화로운 준재", en: "Light of the west, peaceful presence", ja: "西の光、平和な存在", fr: "Lumière de l'ouest, présence paisible", es: "Luz del oeste, presencia pacífica", zh: "西方之光，平和的存在", } },
  { name: "이준", gender: "boy", style: "korean-traditional", meaning: "wisdom", element: "earth", description: { ko: "이치를 아는 준수한 인물", en: "Wise and understanding person", ja: "道理をわきまえた優れた人物", fr: "Personne sage et compréhensive", es: "Persona sabia y comprensiva", zh: "懂得道理的优秀人物", } },
  { name: "지호", gender: "boy", style: "korean-traditional", meaning: "wisdom", element: "water", description: { ko: "지혜롭고 호탕한 성품", en: "Wise and magnanimous character", ja: "賢明で寛大な性格", fr: "Caractère sage et magnanime", es: "Carácter sabio y magnánimo", zh: "聪慧宽厚的性格", } },
  { name: "현우", gender: "boy", style: "korean-traditional", meaning: "wisdom", element: "wood", description: { ko: "현명한 지우, 사람을 돕는 이름", en: "Wise friend who helps others", ja: "賢い友、人を助ける名前", fr: "Ami sage qui aide les autres", es: "Amigo sabio que ayuda a los demás", zh: "聪明的朋友，帮助他人的名字", } },
  { name: "우진", gender: "boy", style: "korean-traditional", meaning: "courage", element: "fire", description: { ko: "용감하게 나아가는 진실된 인물", en: "Brave and true person", ja: "勇敢に進む真実の人物", fr: "Personne brave et vraie", es: "Persona valiente y verdadera", zh: "勇敢前行的真实人物", } },
  { name: "태양", gender: "boy", style: "korean-traditional", meaning: "light", element: "fire", description: { ko: "태양처럼 밝고 강한 아이", en: "Bright and strong like the sun", ja: "太陽のように明るく強い子", fr: "Lumineux et fort comme le soleil", es: "Brillante y fuerte como el sol", zh: "像太阳一样明亮坚强的孩子", } },
  { name: "하늘", gender: "boy", style: "korean-traditional", meaning: "peace", element: "metal", description: { ko: "하늘처럼 넓은 마음을 가진 아이", en: "Heart as wide as the sky", ja: "空のように広い心を持つ子", fr: "Cœur aussi vaste que le ciel", es: "Corazón tan amplio como el cielo", zh: "有像天空一样宽广心胸的孩子", } },
  { name: "성민", gender: "boy", style: "korean-traditional", meaning: "wisdom", element: "earth", description: { ko: "성스럽고 총명한 백성의 이름", en: "Holy and bright name of the people", ja: "聖なる聡明な民の名前", fr: "Nom saint et brillant du peuple", es: "Nombre sagrado y brillante del pueblo", zh: "圣洁聪明的百姓之名", } },
  { name: "재원", gender: "boy", style: "korean-traditional", meaning: "wisdom", element: "water", description: { ko: "재능이 넘치고 원대한 꿈을 가진 이름", en: "Name overflowing with talent and great dreams", ja: "才能にあふれ大きな夢を持つ名前", fr: "Nom débordant de talent et de grands rêves", es: "Nombre rebosante de talento y grandes sueños", zh: "才华横溢、胸怀大志的名字", } },
  { name: "민재", gender: "boy", style: "korean-traditional", meaning: "courage", element: "wood", description: { ko: "백성을 위한 재능 있는 인물", en: "Talented person for the people", ja: "民のための才能ある人物", fr: "Personne talentueuse pour le peuple", es: "Persona talentosa para el pueblo", zh: "为百姓服务的才华人物", } },
  { name: "강민", gender: "boy", style: "korean-traditional", meaning: "courage", element: "water", description: { ko: "강하고 민첩한 의지의 이름", en: "Strong and agile will", ja: "強くて機敏な意志の名前", fr: "Volonté forte et agile", es: "Voluntad fuerte y ágil", zh: "强壮敏锐的意志之名", } },
  { name: "준혁", gender: "boy", style: "korean-traditional", meaning: "wisdom", element: "fire", description: { ko: "빛나는 준재로 세상을 바꾸는 이름", en: "Brilliant talent that changes the world", ja: "輝く才能で世界を変える名前", fr: "Talent brillant qui change le monde", es: "Talento brillante que cambia el mundo", zh: "以卓越才华改变世界的名字", } },
  // 현대 세련 남아
  { name: "리온", gender: "boy", style: "modern", meaning: "courage", element: "fire", description: { ko: "사자의 용기를 가진 현대적 이름", en: "Modern name with lion's courage", ja: "ライオンの勇気を持つ現代的な名前", fr: "Nom moderne avec le courage du lion", es: "Nombre moderno con el coraje del león", zh: "具有狮子勇气的现代名字", } },
  { name: "시온", gender: "boy", style: "modern", meaning: "peace", element: "metal", description: { ko: "평화의 언덕, 고요한 이름", en: "Hill of peace, serene name", ja: "平和の丘、静かな名前", fr: "Colline de la paix, nom serein", es: "Colina de la paz, nombre sereno", zh: "和平之丘，宁静之名", } },
  { name: "아인", gender: "boy", style: "modern", meaning: "wisdom", element: "water", description: { ko: "눈처럼 순수하고 지혜로운 이름", en: "Pure and wise like eyes", ja: "目のように純粋で賢い名前", fr: "Pur et sage comme les yeux", es: "Puro y sabio como los ojos", zh: "如眼睛般纯洁智慧的名字", } },
  { name: "제이든", gender: "boy", style: "english", meaning: "courage", element: "fire", description: { ko: "신이 심판하시다, 용기 있는 이름", en: "God has heard, courageous name", ja: "神は聞かれた、勇気ある名前", fr: "Dieu a entendu, nom courageux", es: "Dios ha escuchado, nombre valiente", zh: "上帝已经听到，勇敢的名字", } },
  { name: "루카", gender: "boy", style: "modern", meaning: "light", element: "fire", description: { ko: "빛을 가져오는 자, 빛나는 이름", en: "Bringer of light, radiant name", ja: "光をもたらす者、輝く名前", fr: "Porteur de lumière, nom radieux", es: "Portador de luz, nombre radiante", zh: "带来光明的人，光辉之名", } },
  { name: "노아", gender: "boy", style: "english", meaning: "peace", element: "water", description: { ko: "안식과 평화를 주는 이름", en: "Rest and peace", ja: "安らぎと平和を与える名前", fr: "Repos et paix", es: "Descanso y paz", zh: "给予安慰与和平的名字", } },
  { name: "레오", gender: "boy", style: "english", meaning: "courage", element: "fire", description: { ko: "사자처럼 용감한 이름", en: "Brave like a lion", ja: "ライオンのように勇敢な名前", fr: "Courageux comme un lion", es: "Valiente como un León", zh: "像狮子一样勇敢的名字", } },
  { name: "케이", gender: "boy", style: "english", meaning: "wisdom", element: "metal", description: { ko: "열쇠처럼 지혜를 여는 이름", en: "Opens wisdom like a key", ja: "鍵のように知恵を開く名前", fr: "Ouvre la sagesse comme une clé", es: "Abre la sabiduría como una llave", zh: "像钥匙一样开启智慧的名字", } },
  { name: "렌", gender: "boy", style: "japanese", meaning: "love", element: "water", description: { ko: "연꽃처럼 순수한 사랑의 이름", en: "Pure love like a lotus", ja: "蓮のように純粋な愛の名前", fr: "Amour pur comme un lotus", es: "Amor puro como un loto", zh: "如莲花般纯洁的爱之名", } },
  { name: "하루", gender: "boy", style: "japanese", meaning: "light", element: "fire", description: { ko: "봄 햇살처럼 밝은 하루의 이름", en: "Bright as spring sunshine", ja: "春の日差しのように明るい名前", fr: "Lumineux comme le soleil printanier", es: "Brillante como el sol de primavera", zh: "像春日阳光一样明亮的名字", } },
  { name: "카이", gender: "boy", style: "english", meaning: "peace", element: "water", description: { ko: "바다처럼 넓고 평화로운 이름", en: "Wide and peaceful like the sea", ja: "海のように広くて平和な名前", fr: "Large et paisible comme la mer", es: "Amplio y pacífico como el mar", zh: "像大海一样宽广平和的名字", } },
  { name: "다온", gender: "boy", style: "modern", meaning: "love", element: "wood", description: { ko: "좋은 것이 다 오는 이름", en: "All good things come", ja: "良いことが全て来る名前", fr: "Toutes les bonnes choses viennent", es: "Todo lo bueno viene", zh: "好事皆来的名字", } },
  { name: "세준", gender: "boy", style: "modern", meaning: "wisdom", element: "earth", description: { ko: "세상을 준비하는 지혜로운 이름", en: "Wise name preparing for the world", ja: "世界を準備する賢い名前", fr: "Nom sage se préparant au monde", es: "Nombre sabio preparándose para el mundo", zh: "准备迎接世界的智慧之名", } },
  { name: "한결", gender: "boy", style: "korean-traditional", meaning: "peace", element: "metal", description: { ko: "변함없는 한결같은 마음의 이름", en: "Consistent and unwavering heart", ja: "変わらぬ一途な心の名前", fr: "Cœur constant et inébranlable", es: "Corazón constante e inquebrantable", zh: "始终如一的心之名", } },
  { name: "강산", gender: "boy", style: "korean-traditional", meaning: "courage", element: "earth", description: { ko: "산처럼 강하고 든든한 이름", en: "Strong and solid like a mountain", ja: "山のように強く頼もしい名前", fr: "Fort et solide comme une montagne", es: "Fuerte y sólido como una montaña", zh: "像山一样坚强稳固的名字", } },
  { name: "찬우", gender: "boy", style: "korean-traditional", meaning: "wisdom", element: "water", description: { ko: "빛나는 지혜로 세상을 비추는 이름", en: "Illuminating the world with brilliant wisdom", ja: "輝く知恵で世界を照らす名前", fr: "Illuminant le monde de sagesse brillante", es: "Iluminando el mundo con brillante sabiduría", zh: "以辉煌智慧照亮世界的名字", } },
  // 영어풍 남아
  { name: "에단", gender: "boy", style: "english", meaning: "courage", element: "fire", description: { ko: "강하고 굳건한 의지의 이름", en: "Strong and firm will", ja: "強く揺るぎない意志の名前", fr: "Volonté forte et ferme", es: "Voluntad fuerte y firme", zh: "坚强不屈意志的名字", } },
  { name: "오웬", gender: "boy", style: "english", meaning: "wisdom", element: "earth", description: { ko: "젊은 전사, 지혜로운 용사의 이름", en: "Young warrior, wise hero", ja: "若い戦士、賢い英雄の名前", fr: "Jeune guerrier, héros sage", es: "Joven guerrero, héroe sabio", zh: "年轻战士，智慧英雄的名字", } },
  { name: "엘리엇", gender: "boy", style: "english", meaning: "peace", element: "metal", description: { ko: "주님은 나의 하나님, 평화로운 이름", en: "The Lord is my God, peaceful name", ja: "主は私の神、平和な名前", fr: "Le Seigneur est mon Dieu, nom paisible", es: "El Señor es mi Dios, nombre pacífico", zh: "主是我的神，平和之名", } },
  { name: "아서", gender: "boy", style: "english", meaning: "courage", element: "earth", description: { ko: "곰처럼 강하고 용감한 전설의 이름", en: "Legendary name, strong and brave like a bear", ja: "熊のように強く勇敢な伝説の名前", fr: "Nom légendaire, fort et courageux comme un ours", es: "Nombre legendario, fuerte y valiente como un oso", zh: "像熊一样强壮勇敢的传奇名字", } },
  // 일본풍 남아
  { name: "소라", gender: "boy", style: "japanese", meaning: "peace", element: "metal", description: { ko: "하늘처럼 드넓은 마음의 이름", en: "Heart as vast as the sky", ja: "空のように広大な心の名前", fr: "Cœur aussi vaste que le ciel", es: "Corazón tan vasto como el cielo", zh: "如天空般宽广心胸的名字", } },
  { name: "유키", gender: "boy", style: "japanese", meaning: "peace", element: "water", description: { ko: "눈처럼 순수하고 고요한 이름", en: "Pure and tranquil like snow", ja: "雪のように純粋で静かな名前", fr: "Pur et tranquille comme la neige", es: "Puro y tranquilo como la nieve", zh: "如雪般纯洁宁静的名字", } },

  // ── 여아 한국 전통 ──────────────────────────────────────
  { name: "서연", gender: "girl", style: "korean-traditional", meaning: "flower", element: "wood", description: { ko: "서쪽 하늘의 꽃처럼 아름다운 이름", en: "Beautiful like a flower in the western sky", ja: "西の空の花のように美しい名前", fr: "Belle comme une fleur dans le ciel occidental", es: "Hermosa como una flor en el cielo occidental", zh: "如西方天空花朵般美丽的名字", } },
  { name: "지아", gender: "girl", style: "korean-traditional", meaning: "wisdom", element: "earth", description: { ko: "지혜롭고 아름다운 이름", en: "Wise and beautiful", ja: "賢く美しい名前", fr: "Sage et belle", es: "Sabia y hermosa", zh: "聪慧美丽的名字", } },
  { name: "하은", gender: "girl", style: "korean-traditional", meaning: "love", element: "water", description: { ko: "하늘의 은혜를 받은 사랑스러운 이름", en: "Lovely name blessed by heavenly grace", ja: "天の恵みを受けた愛らしい名前", fr: "Nom charmant béni par la grâce céleste", es: "Nombre encantador bendecido por la gracia celestial", zh: "受天恩眷顾的可爱名字", } },
  { name: "수아", gender: "girl", style: "korean-traditional", meaning: "flower", element: "wood", description: { ko: "빼어나게 아름다운 꽃의 이름", en: "Outstandingly beautiful like a flower", ja: "際立って美しい花の名前", fr: "Magnifiquement belle comme une fleur", es: "Extraordinariamente hermosa como una flor", zh: "出众美丽的花之名", } },
  { name: "윤아", gender: "girl", style: "korean-traditional", meaning: "wisdom", element: "metal", description: { ko: "윤택하고 아름다운 지혜의 이름", en: "Lustrous and beautifully wise", ja: "潤いあって美しい知恵の名前", fr: "Sage et radieuse beauté", es: "Brillante y bellamente sabia", zh: "润泽美丽智慧的名字", } },
  { name: "지유", gender: "girl", style: "korean-traditional", meaning: "peace", element: "water", description: { ko: "지혜롭고 자유로운 평화의 이름", en: "Wise and free name of peace", ja: "賢く自由な平和の名前", fr: "Nom sage et libre de la paix", es: "Nombre sabio y libre de paz", zh: "智慧自由和平的名字", } },
  { name: "채원", gender: "girl", style: "korean-traditional", meaning: "flower", element: "wood", description: { ko: "빛나는 꽃처럼 원대한 꿈을 품은 이름", en: "Great dreams like a radiant flower", ja: "輝く花のように大きな夢を抱く名前", fr: "Grands rêves comme une fleur radieuse", es: "Grandes sueños como una flor radiante", zh: "如光辉花朵般怀有远大梦想的名字", } },
  { name: "나윤", gender: "girl", style: "korean-traditional", meaning: "wisdom", element: "earth", description: { ko: "아름다운 윤기와 나눔의 이름", en: "Beautiful luster and sharing", ja: "美しい艶と分かち合いの名前", fr: "Beau lustre et partage", es: "Hermoso brillo y compartir", zh: "美丽光泽与分享的名字", } },
  { name: "이서", gender: "girl", style: "korean-traditional", meaning: "wisdom", element: "metal", description: { ko: "이치와 서화를 알고 지혜를 갖춘 이름", en: "Understanding reason and wisdom", ja: "道理と書画を知り知恵を備えた名前", fr: "Comprenant la raison et la sagesse", es: "Comprendiendo la razón y la sabiduría", zh: "懂得道理与书画，具备智慧的名字", } },
  { name: "예린", gender: "girl", style: "korean-traditional", meaning: "flower", element: "fire", description: { ko: "예쁘고 아름다운 수풀의 이름", en: "Pretty and beautiful like a grove", ja: "可愛らしく美しい木立の名前", fr: "Jolie et belle comme un bocage", es: "Bonita y hermosa como un bosquecillo", zh: "如林木般漂亮美丽的名字", } },
  { name: "서현", gender: "girl", style: "korean-traditional", meaning: "wisdom", element: "water", description: { ko: "서방의 지혜와 현명함의 이름", en: "Wisdom from the west", ja: "西方の知恵と賢さの名前", fr: "Sagesse de l'ouest", es: "Sabiduría del oeste", zh: "西方智慧与聪明的名字", } },
  { name: "민지", gender: "girl", style: "korean-traditional", meaning: "wisdom", element: "earth", description: { ko: "백성을 위한 지혜의 이름", en: "Wisdom for the people", ja: "民のための知恵の名前", fr: "Sagesse pour le peuple", es: "Sabiduría para el pueblo", zh: "为百姓服务的智慧之名", } },
  { name: "유나", gender: "girl", style: "korean-traditional", meaning: "love", element: "fire", description: { ko: "부드럽고 사랑스러운 나비의 이름", en: "Soft and lovely like a butterfly", ja: "柔らかく愛らしい蝶の名前", fr: "Douce et charmante comme un papillon", es: "Suave y encantadora como una mariposa", zh: "如蝴蝶般柔软可爱的名字", } },
  { name: "가은", gender: "girl", style: "korean-traditional", meaning: "wisdom", element: "metal", description: { ko: "아름다운 은혜를 지닌 이름", en: "Possessing beautiful grace", ja: "美しい恵みを持つ名前", fr: "Possédant une belle grâce", es: "Poseyendo bella gracia", zh: "拥有美丽恩典的名字", } },
  { name: "아름", gender: "girl", style: "korean-traditional", meaning: "flower", element: "wood", description: { ko: "아름다움 자체를 뜻하는 순수 우리말 이름", en: "Meaning beauty itself in pure Korean", ja: "美しさそのものを意味する純粋な韓国語の名前", fr: "Signifiant beauté elle-même en coréen pur", es: "Significando belleza en sí misma en coreano puro", zh: "在纯韩语中意味着美丽本身的名字", } },
  // 현대 세련 여아
  { name: "이든", gender: "girl", style: "modern", meaning: "peace", element: "wood", description: { ko: "에덴의 기쁨, 평화로운 낙원의 이름", en: "Joy of Eden, peaceful paradise", ja: "エデンの喜び、平和な楽園の名前", fr: "Joie d'Éden, paradis paisible", es: "Alegría del Edén, paraíso pacífico", zh: "伊甸园的喜悦，平和乐园的名字", } },
  { name: "나은", gender: "girl", style: "modern", meaning: "wisdom", element: "earth", description: { ko: "나날이 더 나아지는 지혜의 이름", en: "Growing wiser each day", ja: "日々より賢くなる知恵の名前", fr: "Devenant plus sage chaque jour", es: "Volviéndose más sabio cada día", zh: "每天都更加智慧的名字", } },
  { name: "하랑", gender: "girl", style: "modern", meaning: "love", element: "fire", description: { ko: "하늘의 사랑을 받는 아이", en: "Child beloved by heaven", ja: "天の愛を受ける子", fr: "Enfant aimé du ciel", es: "Niño amado por el cielo", zh: "受天之爱的孩子", } },
  { name: "소율", gender: "girl", style: "modern", meaning: "wisdom", element: "metal", description: { ko: "작고 지혜로운 별의 이름", en: "Small and wise like a star", ja: "小さくて賢い星の名前", fr: "Petite et sage comme une étoile", es: "Pequeña y sabia como una estrella", zh: "如小星星般聪慧的名字", } },
  { name: "아이린", gender: "girl", style: "english", meaning: "peace", element: "water", description: { ko: "평화의 여신, 고요한 이름", en: "Goddess of peace, serene name", ja: "平和の女神、穏やかな名前", fr: "Déesse de la paix, nom serein", es: "Diosa de la paz, nombre sereno", zh: "和平女神，宁静之名", } },
  { name: "엘라", gender: "girl", style: "english", meaning: "light", element: "fire", description: { ko: "빛나는 아름다운 여신의 이름", en: "Beautiful radiant goddess", ja: "輝く美しい女神の名前", fr: "Belle déesse rayonnante", es: "Hermosa diosa radiante", zh: "光辉美丽女神的名字", } },
  { name: "루나", gender: "girl", style: "english", meaning: "light", element: "water", description: { ko: "달빛처럼 신비로운 이름", en: "Mysterious like moonlight", ja: "月光のように神秘的な名前", fr: "Mystérieux comme le clair de lune", es: "Misterioso como la luz de la luna", zh: "如月光般神秘的名字", } },
  { name: "소피아", gender: "girl", style: "english", meaning: "wisdom", element: "earth", description: { ko: "지혜의 여신, 현명한 이름", en: "Goddess of wisdom, wise name", ja: "知恵の女神、賢い名前", fr: "Déesse de la sagesse, nom sage", es: "Diosa de la sabiduría, nombre sabio", zh: "智慧女神，聪明之名", } },
  { name: "미유", gender: "girl", style: "japanese", meaning: "love", element: "fire", description: { ko: "아름다운 사랑의 이름", en: "Beautiful love name", ja: "美しい愛の名前", fr: "Beau nom d'amour", es: "Hermoso nombre de amor", zh: "美丽的爱之名", } },
  { name: "아야", gender: "girl", style: "japanese", meaning: "flower", element: "wood", description: { ko: "형형색색 무늬의 꽃의 이름", en: "Colorful pattern of flowers", ja: "色とりどりの模様の花の名前", fr: "Motif coloré de fleurs", es: "Colorido patrón de flores", zh: "色彩斑斓花纹的名字", } },
  { name: "하나", gender: "girl", style: "japanese", meaning: "flower", element: "wood", description: { ko: "하나의 꽃처럼 특별한 이름", en: "Special like a single flower", ja: "一輪の花のように特別な名前", fr: "Spécial comme une seule fleur", es: "Especial como una sola flor", zh: "如一朵花般特别的名字", } },
  { name: "사쿠라", gender: "girl", style: "japanese", meaning: "flower", element: "wood", description: { ko: "벚꽃처럼 아름답고 덧없는 이름", en: "Beautiful and fleeting like cherry blossoms", ja: "桜のように美しくはかない名前", fr: "Belle et éphémère comme les fleurs de cerisier", es: "Hermosa y efímera como las flores de cerezo", zh: "如樱花般美丽短暂的名字", } },
  { name: "나리", gender: "girl", style: "korean-traditional", meaning: "flower", element: "wood", description: { ko: "나리꽃처럼 곱고 청초한 이름", en: "Pure and elegant like a lily", ja: "百合のように美しく清楚な名前", fr: "Pur et élégant comme un lis", es: "Puro y elegante como un lirio", zh: "如百合花般美丽清纯的名字", } },
  { name: "봄", gender: "girl", style: "korean-traditional", meaning: "flower", element: "wood", description: { ko: "봄처럼 새로운 시작을 알리는 이름", en: "Heralding new beginnings like spring", ja: "春のように新しい始まりを告げる名前", fr: "Annonçant de nouveaux débuts comme le printemps", es: "Anunciando nuevos comienzos como la primavera", zh: "如春天一样宣告新开始的名字", } },
  { name: "별", gender: "girl", style: "korean-traditional", meaning: "light", element: "fire", description: { ko: "하늘의 별처럼 빛나는 이름", en: "Shining like a star in the sky", ja: "空の星のように輝く名前", fr: "Brillant comme une étoile dans le ciel", es: "Brillando como una estrella en el cielo", zh: "如天上星星一样闪耀的名字", } },

  // ── 중립 이름 ──────────────────────────────────────────
  { name: "다은", gender: "neutral", style: "korean-traditional", meaning: "love", element: "water", description: { ko: "다양한 은혜를 받는 사랑스러운 이름", en: "Lovely name receiving various blessings", ja: "様々な恵みを受ける愛らしい名前", fr: "Nom charmant recevant diverses bénédictions", es: "Nombre encantador recibiendo varias bendiciones", zh: "得到各种恩典的可爱名字", } },
  { name: "유이", gender: "neutral", style: "modern", meaning: "wisdom", element: "earth", description: { ko: "오직 하나뿐인 유일한 이름", en: "One and only unique name", ja: "ただ一つの唯一の名前", fr: "Nom unique et inégalé", es: "Nombre único e inigualable", zh: "唯一无二的名字", } },
  { name: "빛나", gender: "neutral", style: "korean-traditional", meaning: "light", element: "fire", description: { ko: "빛처럼 환하게 빛나는 이름", en: "Shining brightly like light", ja: "光のように明るく輝く名前", fr: "Brillant comme la lumière", es: "Brillando intensamente como la luz", zh: "如光一样明亮闪耀的名字", } },
  { name: "온유", gender: "neutral", style: "korean-traditional", meaning: "peace", element: "water", description: { ko: "온화하고 부드러운 평화의 이름", en: "Gentle and soft, peaceful name", ja: "穏やかで柔らかい平和の名字", fr: "Doux et paisible", es: "Gentil y suave, nombre pacífico", zh: "温和柔软平和的名字", } },
  { name: "새벽", gender: "neutral", style: "korean-traditional", meaning: "light", element: "fire", description: { ko: "새벽빛처럼 새로운 시작을 여는 이름", en: "Opening new beginnings like dawn light", ja: "夜明けの光のように新しい始まりを開く名前", fr: "Ouvrant de nouveaux débuts comme la lumière de l'aube", es: "Abriendo nuevos comienzos como la luz del alba", zh: "如黎明之光开启新开始的名字", } },
  { name: "솔", gender: "neutral", style: "korean-traditional", meaning: "peace", element: "wood", description: { ko: "소나무처럼 변함없는 푸름의 이름", en: "Evergreen and unchanging like a pine tree", ja: "松のように変わらない常緑の名前", fr: "Toujours vert et immuable comme un pin", es: "Siempre verde e inmutable como un pino", zh: "如松树般永恒翠绿的名字", } },
  { name: "해온", gender: "neutral", style: "korean-traditional", meaning: "love", element: "fire", description: { ko: "해처럼 온기를 전하는 사랑의 이름", en: "Warmth like the sun, love's name", ja: "太陽のように温もりを伝える愛の名前", fr: "Chaleur comme le soleil, nom de l'amour", es: "Calidez como el sol, nombre del amor", zh: "如太阳般传递温暖的爱之名", } },
  { name: "나무", gender: "neutral", style: "korean-traditional", meaning: "peace", element: "wood", description: { ko: "나무처럼 깊은 뿌리와 넓은 그늘의 이름", en: "Deep roots and wide shade like a tree", ja: "木のように深い根と広い影の名前", fr: "Racines profondes et large ombre comme un arbre", es: "Raíces profundas y amplia sombra como un árbol", zh: "如树木般深根广荫的名字", } },
  { name: "라온", gender: "neutral", style: "korean-traditional", meaning: "love", element: "fire", description: { ko: "즐거운 우리말 이름, 기쁨을 전하는 이름", en: "Joyful pure Korean name", ja: "楽しい純粋な韓国語の名前", fr: "Nom joyeux en coréen pur", es: "Nombre alegre en coreano puro", zh: "快乐的纯韩语名字", } },
  { name: "미르", gender: "neutral", style: "korean-traditional", meaning: "wisdom", element: "water", description: { ko: "용을 뜻하는 순우리말, 지혜로운 이름", en: "Pure Korean for dragon, wise name", ja: "竜を意味する純粋な韓国語、賢い名前", fr: "Coréen pur pour dragon, nom sage", es: "Coreano puro para dragón, nombre sabio", zh: "意为龙的纯韩语，智慧之名", } },
  { name: "아린", gender: "neutral", style: "korean-traditional", meaning: "wisdom", element: "metal", description: { ko: "알림처럼 세상에 깨달음을 전하는 이름", en: "Spreading enlightenment to the world", ja: "知らせのように世界に悟りを伝える名前", fr: "Répandant l'éveil dans le monde", es: "Difundiendo iluminación al mundo", zh: "如通告般向世界传播启示的名字", } },
  { name: "이안", gender: "neutral", style: "modern", meaning: "peace", element: "water", description: { ko: "평화로운 신의 선물, 현대적 이름", en: "Peaceful gift of God, modern name", ja: "平和な神の贈り物、現代的な名前", fr: "Don pacifique de Dieu, nom moderne", es: "Don pacífico de Dios, nombre moderno", zh: "神的和平礼物，现代名字", } },
  { name: "제이", gender: "neutral", style: "english", meaning: "light", element: "fire", description: { ko: "빛처럼 밝은 현대적인 이름", en: "Bright and modern like light", ja: "光のように明るい現代的な名前", fr: "Lumineux et moderne comme la lumière", es: "Brillante y moderno como la luz", zh: "如光般明亮的现代名字", } },
  { name: "민", gender: "neutral", style: "korean-traditional", meaning: "wisdom", element: "earth", description: { ko: "백성을 아끼는 마음의 이름", en: "Name with a heart for the people", ja: "民を大切にする心の名前", fr: "Nom avec un cœur pour le peuple", es: "Nombre con corazón por el pueblo", zh: "关心百姓的心之名", } },
  { name: "유", gender: "neutral", style: "korean-traditional", meaning: "peace", element: "water", description: { ko: "부드럽고 여유로운 평화의 이름", en: "Soft and leisurely peaceful name", ja: "柔らかく余裕のある平和の名前", fr: "Nom paisible doux et serein", es: "Nombre pacífico suave y sereno", zh: "柔和从容的和平之名", } },
  { name: "찬", gender: "neutral", style: "korean-traditional", meaning: "light", element: "fire", description: { ko: "빛나고 찬란한 이름", en: "Bright and brilliant", ja: "輝かしく燦然たる名前", fr: "Brillant et resplendissant", es: "Brillante y espléndido", zh: "光辉灿烂的名字", } },
  { name: "하람", gender: "neutral", style: "korean-traditional", meaning: "peace", element: "water", description: { ko: "하늘의 람처럼 자유로운 이름", en: "Free like the sky", ja: "空のように自由な名前", fr: "Libre comme le ciel", es: "Libre como el cielo", zh: "如天空般自由的名字", } },
  { name: "가람", gender: "neutral", style: "korean-traditional", meaning: "peace", element: "water", description: { ko: "강을 뜻하는 순우리말, 유유한 흐름의 이름", en: "Pure Korean for river, flowing name", ja: "川を意味する純粋な韓国語、流れる名前", fr: "Coréen pur pour rivière, nom fluide", es: "Coreano puro para río, nombre fluido", zh: "意为河流的纯韩语，流动之名", } },
  { name: "샘", gender: "neutral", style: "korean-traditional", meaning: "love", element: "water", description: { ko: "샘처럼 솟아나는 사랑의 이름", en: "Love welling up like a spring", ja: "泉のように湧き出る愛の名前", fr: "Amour jaillissant comme une source", es: "Amor brotando como un manantial", zh: "如泉水涌出的爱之名", } },
  { name: "하준", gender: "neutral", style: "modern", meaning: "wisdom", element: "earth", description: { ko: "하늘 아래 준비된 지혜의 이름", en: "Wisdom prepared under the sky", ja: "天の下に準備された知恵の名前", fr: "Sagesse préparée sous le ciel", es: "Sabiduría preparada bajo el cielo", zh: "天空下准备好的智慧之名", } },
  { name: "하진", gender: "neutral", style: "modern", meaning: "courage", element: "fire", description: { ko: "하늘의 보배를 지닌 용기 있는 이름", en: "Courageous name with heaven's treasure", ja: "天の宝を持つ勇気ある名前", fr: "Nom courageux avec le trésor du ciel", es: "Nombre valiente con el tesoro del cielo", zh: "拥有天之宝藏的勇敢名字", } },
  { name: "다윤", gender: "neutral", style: "korean-traditional", meaning: "wisdom", element: "water", description: { ko: "다양한 윤택함을 갖춘 이름", en: "Name with various prosperities", ja: "様々な豊かさを持つ名前", fr: "Nom avec diverses prospérités", es: "Nombre con varias prosperidades", zh: "具备多种润泽的名字", } },
  { name: "도윤", gender: "neutral", style: "korean-traditional", meaning: "wisdom", element: "earth", description: { ko: "도리를 갖추고 윤택한 이름", en: "Proper and prosperous", ja: "道理を備えた豊かな名前", fr: "Convenable et prospère", es: "Propio y próspero", zh: "具备道理而润泽的名字", } },
  { name: "아루", gender: "neutral", style: "modern", meaning: "love", element: "wood", description: { ko: "아름다운 사랑을 전하는 이름", en: "Conveying beautiful love", ja: "美しい愛を伝える名前", fr: "Transmettant un bel amour", es: "Transmitiendo hermoso amor", zh: "传递美丽爱意的名字", } },
  { name: "주안", gender: "neutral", style: "modern", meaning: "peace", element: "metal", description: { ko: "주님의 은혜로 평안한 이름", en: "Peaceful name by the Lord's grace", ja: "主の恵みによる平和な名前", fr: "Nom paisible par la grâce du Seigneur", es: "Nombre pacífico por la gracia del Señor", zh: "主的恩典中平安的名字", } },
  { name: "로아", gender: "neutral", style: "modern", meaning: "light", element: "fire", description: { ko: "빛을 찾아 나아가는 이름", en: "Seeking light and moving forward", ja: "光を求めて進む名前", fr: "Cherchant la lumière et avançant", es: "Buscando la luz y avanzando", zh: "寻求光明前进的名字", } },
  { name: "유하", gender: "neutral", style: "korean-traditional", meaning: "wisdom", element: "water", description: { ko: "부드러운 물결처럼 지혜로운 이름", en: "Wise like gentle waves", ja: "穏やかな波のように賢い名前", fr: "Sage comme de douces vagues", es: "Sabio como suaves olas", zh: "如柔和波浪般智慧的名字", } },
  { name: "이로", gender: "neutral", style: "modern", meaning: "courage", element: "fire", description: { ko: "이로운 길을 용감하게 나아가는 이름", en: "Bravely walking a beneficial path", ja: "有益な道を勇敢に進む名前", fr: "Avançant courageusement sur un chemin bénéfique", es: "Avanzando valientemente por un camino beneficioso", zh: "勇敢走上有益之路的名字", } },
  { name: "시우", gender: "neutral", style: "modern", meaning: "peace", element: "water", description: { ko: "시작의 우주처럼 평화로운 이름", en: "Peaceful like the universe of beginnings", ja: "始まりの宇宙のように平和な名前", fr: "Paisible comme l'univers des débuts", es: "Pacífico como el universo de los comienzos", zh: "如起始宇宙般平和的名字", } },
  { name: "지원", gender: "neutral", style: "korean-traditional", meaning: "wisdom", element: "earth", description: { ko: "지혜로운 근원의 이름", en: "Wise and fundamental", ja: "賢い根源の名前", fr: "Sage et fondamental", es: "Sabio y fundamental", zh: "智慧根源的名字", } },
  { name: "태리", gender: "neutral", style: "modern", meaning: "courage", element: "fire", description: { ko: "큰 이로움을 가져오는 이름", en: "Bringing great benefit", ja: "大きな恵みをもたらす名前", fr: "Apportant un grand bienfait", es: "Trayendo gran beneficio", zh: "带来巨大利益的名字", } },
  { name: "율", gender: "neutral", style: "korean-traditional", meaning: "wisdom", element: "metal", description: { ko: "법도와 율기를 갖춘 이름", en: "Name with law and discipline", ja: "法度と律義を備えた名前", fr: "Nom avec loi et discipline", es: "Nombre con ley y disciplina", zh: "具备法度律义的名字", } },
  { name: "윤슬", gender: "neutral", style: "korean-traditional", meaning: "light", element: "water", description: { ko: "햇빛에 반짝이는 물결이라는 뜻의 아름다운 이름", en: "Sparkles of light on water's surface", ja: "日光に輝く水面という意味の美しい名前", fr: "Scintillements de lumière sur la surface de l'eau", es: "Destellos de luz en la superficie del agua", zh: "阳光下水面闪烁之意的美丽名字", } },
  { name: "설", gender: "neutral", style: "korean-traditional", meaning: "peace", element: "water", description: { ko: "눈처럼 순수하고 고요한 이름", en: "Pure and serene like snow", ja: "雪のように純粋で静かな名前", fr: "Pur et serein comme la neige", es: "Puro y sereno como la nieve", zh: "如雪般纯洁宁静的名字", } },
];

const ELEMENT_LABELS: Record<Element, string> = {
  wood: "木",
  fire: "火",
  earth: "土",
  metal: "金",
  water: "水",
};

const ELEMENT_COLORS: Record<Element, string> = {
  wood: "bg-green-100 text-green-700",
  fire: "bg-red-100 text-red-700",
  earth: "bg-yellow-100 text-yellow-700",
  metal: "bg-gray-100 text-gray-700",
  water: "bg-blue-100 text-blue-700",
};

const UI: Record<
  Locale,
  {
    title: string;
    subtitle: string;
    genderLabel: string;
    styleLabel: string;
    meaningLabel: string;
    dollimsLabel: string;
    dollimsPlaceholder: string;
    generateBtn: string;
    resultTitle: string;
    noResult: string;
    disclaimer: string;
    genders: Record<Gender, string>;
    styles: Record<Style, string>;
    meanings: Record<Meaning, string>;
    elementLabel: string;
  }
> = {
  ko: {
    title: "아기 이름 생성기",
    subtitle: "태어날 아이에게 어울리는 이름을 찾아보세요",
    genderLabel: "성별",
    styleLabel: "어감 스타일",
    meaningLabel: "의미 키워드",
    dollimsLabel: "돌림자 (선택)",
    dollimsPlaceholder: "한 글자 입력 (예: 준, 아)",
    generateBtn: "이름 추천받기",
    resultTitle: "추천 이름",
    noResult: "조건에 맞는 이름이 없습니다. 다른 조합을 시도해보세요.",
    disclaimer: "* 이름 추천은 참고용입니다. 작명 전문가와 상담을 권장합니다.",
    elementLabel: "오행",
    genders: { boy: "남아", girl: "여아", neutral: "중립" },
    styles: { "korean-traditional": "한국 전통", modern: "현대 세련", english: "영어풍", japanese: "일본풍" },
    meanings: { light: "빛", flower: "꽃", courage: "용기", wisdom: "지혜", peace: "평화", love: "사랑" },
  },
  en: {
    title: "Baby Name Generator",
    subtitle: "Find the perfect name for your baby",
    genderLabel: "Gender",
    styleLabel: "Name Style",
    meaningLabel: "Meaning",
    dollimsLabel: "Shared syllable (optional)",
    dollimsPlaceholder: "Enter one syllable (e.g. jun, a)",
    generateBtn: "Generate Names",
    resultTitle: "Recommended Names",
    noResult: "No names found for this combination. Try different options.",
    disclaimer: "* Name recommendations are for reference only. Consult a naming expert.",
    elementLabel: "Element",
    genders: { boy: "Boy", girl: "Girl", neutral: "Neutral" },
    styles: { "korean-traditional": "Korean Traditional", modern: "Modern", english: "English", japanese: "Japanese" },
    meanings: { light: "Light", flower: "Flower", courage: "Courage", wisdom: "Wisdom", peace: "Peace", love: "Love" },
  },
  ja: {
    title: "赤ちゃんの名前ジェネレーター",
    subtitle: "生まれてくる赤ちゃんにぴったりの名前を見つけましょう",
    genderLabel: "性別",
    styleLabel: "名前のスタイル",
    meaningLabel: "意味のキーワード",
    dollimsLabel: "共通の音節（任意）",
    dollimsPlaceholder: "1音節を入力（例：じゅん、あ）",
    generateBtn: "名前を生成",
    resultTitle: "おすすめの名前",
    noResult: "この組み合わせに合う名前がありません。別のオプションをお試しください。",
    disclaimer: "* 名前の提案は参考のみです。命名の専門家に相談することをお勧めします。",
    elementLabel: "五行",
    genders: { boy: "男の子", girl: "女の子", neutral: "中性" },
    styles: { "korean-traditional": "韓国伝統", modern: "現代的", english: "英語風", japanese: "日本風" },
    meanings: { light: "光", flower: "花", courage: "勇気", wisdom: "知恵", peace: "平和", love: "愛" },
  },
  fr: {
    title: "Générateur de Prénoms Bébé",
    subtitle: "Trouvez le prénom parfait pour votre bébé",
    genderLabel: "Genre",
    styleLabel: "Style du Prénom",
    meaningLabel: "Signification",
    dollimsLabel: "Syllabe partagée (optionnel)",
    dollimsPlaceholder: "Entrez une syllabe (ex: jun, a)",
    generateBtn: "Générer des Prénoms",
    resultTitle: "Prénoms Recommandés",
    noResult: "Aucun prénom trouvé pour cette combinaison. Essayez d'autres options.",
    disclaimer: "* Les recommandations de prénoms sont à titre indicatif seulement.",
    elementLabel: "Élément",
    genders: { boy: "Garçon", girl: "Fille", neutral: "Neutre" },
    styles: { "korean-traditional": "Traditionnel Coréen", modern: "Moderne", english: "Anglais", japanese: "Japonais" },
    meanings: { light: "Lumière", flower: "Fleur", courage: "Courage", wisdom: "Sagesse", peace: "Paix", love: "Amour" },
  },
  es: {
    title: "Generador de Nombres de Bebé",
    subtitle: "Encuentra el nombre perfecto para tu bebé",
    genderLabel: "Género",
    styleLabel: "Estilo del Nombre",
    meaningLabel: "Significado",
    dollimsLabel: "Sílaba compartida (opcional)",
    dollimsPlaceholder: "Ingresa una sílaba (ej: jun, a)",
    generateBtn: "Generar Nombres",
    resultTitle: "Nombres Recomendados",
    noResult: "No se encontraron nombres para esta combinación. Prueba otras opciones.",
    disclaimer: "* Las recomendaciones de nombres son solo de referencia.",
    elementLabel: "Elemento",
    genders: { boy: "Niño", girl: "Niña", neutral: "Neutro" },
    styles: { "korean-traditional": "Tradicional Coreano", modern: "Moderno", english: "Inglés", japanese: "Japonés" },
    meanings: { light: "Luz", flower: "Flor", courage: "Valentía", wisdom: "Sabiduría", peace: "Paz", love: "Amor" },
  },
  zh: {
    title: "婴儿名字生成器",
    subtitle: "为即将出生的宝宝找到完美的名字",
    genderLabel: "性别",
    styleLabel: "名字风格",
    meaningLabel: "含义关键词",
    dollimsLabel: "共同音节（可选）",
    dollimsPlaceholder: "输入一个音节（例：준，아）",
    generateBtn: "生成名字",
    resultTitle: "推荐名字",
    noResult: "未找到符合条件的名字。请尝试其他选项。",
    disclaimer: "* 名字推荐仅供参考。建议咨询命名专家。",
    elementLabel: "五行",
    genders: { boy: "男孩", girl: "女孩", neutral: "中性" },
    styles: { "korean-traditional": "韩国传统", modern: "现代", english: "英文风", japanese: "日文风" },
    meanings: { light: "光", flower: "花", courage: "勇气", wisdom: "智慧", peace: "和平", love: "爱" },
  },
};

export default function BabyNameGenerator({ locale }: Props) {
  const t = UI[locale] ?? UI.en;

  const [gender, setGender] = useState<Gender>("neutral");
  const [style, setStyle] = useState<Style>("korean-traditional");
  const [meaning, setMeaning] = useState<Meaning>("wisdom");
  const [dollim, setDollim] = useState("");
  const [results, setResults] = useState<NameEntry[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [generated, setGenerated] = useState(false);

  const handleGenerate = () => {
    const filtered = NAMES.filter((n) => {
      const genderMatch = gender === "neutral" ? true : n.gender === gender || n.gender === "neutral";
      const styleMatch = n.style === style;
      const meaningMatch = n.meaning === meaning;
      const dollimMatch = dollim.trim() === "" || n.name.includes(dollim.trim());
      return genderMatch && styleMatch && meaningMatch && dollimMatch;
    });

    // If too few results relax style filter
    let pool = filtered;
    if (pool.length < 5) {
      pool = NAMES.filter((n) => {
        const genderMatch = gender === "neutral" ? true : n.gender === gender || n.gender === "neutral";
        const meaningMatch = n.meaning === meaning;
        const dollimMatch = dollim.trim() === "" || n.name.includes(dollim.trim());
        return genderMatch && meaningMatch && dollimMatch;
      });
    }

    // Shuffle and take up to 10
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, 10);
    setResults(shuffled);
    setGenerated(true);
    setExpanded(null);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
        <p className="mt-1 text-gray-500">{t.subtitle}</p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
        {/* Gender */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t.genderLabel}</label>
          <div className="flex gap-2">
            {(["boy", "girl", "neutral"] as Gender[]).map((g) => (
              <button
                key={g}
                onClick={() => setGender(g)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  gender === g
                    ? "bg-purple-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-purple-50"
                }`}
              >
                {t.genders[g]}
              </button>
            ))}
          </div>
        </div>

        {/* Style */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t.styleLabel}</label>
          <div className="grid grid-cols-2 gap-2">
            {(["korean-traditional", "modern", "english", "japanese"] as Style[]).map((s) => (
              <button
                key={s}
                onClick={() => setStyle(s)}
                className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                  style === s
                    ? "bg-purple-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-purple-50"
                }`}
              >
                {t.styles[s]}
              </button>
            ))}
          </div>
        </div>

        {/* Meaning */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t.meaningLabel}</label>
          <select
            value={meaning}
            onChange={(e) => setMeaning(e.target.value as Meaning)}
            className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
          >
            {(["light", "flower", "courage", "wisdom", "peace", "love"] as Meaning[]).map((m) => (
              <option key={m} value={m}>{t.meanings[m]}</option>
            ))}
          </select>
        </div>

        {/* Dollim */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t.dollimsLabel}</label>
          <input
            type="text"
            value={dollim}
            onChange={(e) => setDollim(e.target.value.slice(0, 2))}
            placeholder={t.dollimsPlaceholder}
            className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
        </div>

        <button
          onClick={handleGenerate}
          className="w-full rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 py-3 font-semibold text-white shadow-md hover:from-purple-600 hover:to-pink-600 transition-all"
        >
          {t.generateBtn}
        </button>
      </div>

      {/* Results */}
      {generated && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-800">{t.resultTitle}</h2>
          {results.length === 0 ? (
            <p className="text-center text-gray-500 py-6">{t.noResult}</p>
          ) : (
            results.map((entry) => (
              <div
                key={entry.name}
                className="rounded-xl border border-gray-200 bg-white overflow-hidden"
              >
                <button
                  onClick={() => setExpanded(expanded === entry.name ? null : entry.name)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-bold text-gray-900">{entry.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ELEMENT_COLORS[entry.element]}`}>
                      {ELEMENT_LABELS[entry.element]} {t.elementLabel}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">
                      {t.meanings[entry.meaning]}
                    </span>
                  </div>
                  <span className="text-gray-400 text-sm">{expanded === entry.name ? "▲" : "▼"}</span>
                </button>
                {expanded === entry.name && (
                  <div className="px-5 pb-4 pt-1 border-t border-gray-100 bg-gray-50">
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {entry.description[locale] ?? entry.description.en}
                    </p>
                    <div className="mt-2 flex gap-2 flex-wrap">
                      <span className="text-xs px-2 py-1 rounded bg-gray-200 text-gray-600">
                        {t.styles[entry.style]}
                      </span>
                      <span className="text-xs px-2 py-1 rounded bg-gray-200 text-gray-600">
                        {t.genders[entry.gender as Gender] ?? entry.gender}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {generated && (
        <p className="text-xs text-center text-gray-400">{t.disclaimer}</p>
      )}
    </div>
  );
}
