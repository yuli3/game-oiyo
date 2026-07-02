// Reclassify track-as-category files (WW19 fix 2).
// Files with category "Academy"/"Magazine" (a TRACK, not a category) get a
// real category inferred from series base, slug tokens, and tags.
// DRY-RUN by default; --apply rewrites frontmatter `category:`.
//
//   node scripts/classify-track-categories.mjs          # report
//   node scripts/classify-track-categories.mjs --apply
//
// Unmatched files are left untouched (not guessed).

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const APPLY = process.argv.includes("--apply");
const root = process.cwd();
const contentRoot = path.join(root, "src/content/blog");
const LOCALES = ["ko", "en", "ja", "fr", "es", "zh"];
const TRACK_CATS = new Set(["academy", "magazine"]);

// Ordered rules: first regex (tested against "slug series tags") wins.
// Targets reuse existing canonical labels.
const RULES = [
  [/real-estate|jeonse|mortgage|\bapt\b|property|landlord|반전세|부동산|전세|월세|청약/, "Real Estate"],
  [/\btax\b|tax-|vat|withholding|3point3|8point8|소득세|양도소득|상속세|증여세|부가세|연말정산|원천징수|세금|세무/, "Tax"],
  [/law-basics|-law-|procedure|appraiser|appraisal|judicial|scrivener|labor-attorney|patent-|administrative-agent|business-consultant|social-welfare|civil-law|criminal|constitutional|commercial-law|법무사|변리사|감정평가|행정사|노무사/, "Law & Exam"],
  [/exam|기사|자격증|certification|qualification|ncs|toeic|toefl|ielts|\bgre\b|gmat|jlpt|\bhsk\b|시험|수능/, "Exam"],
  [/public-admin|administration-basics|public-document|public-finance|public-administration|civil-servant|행정학|공문서|공공행정|공무원/, "Public Admin"],
  [/^game-|aim-trainer|chimp|connect-four|memory-card|memory-test|reaction|typing-test|minesweeper|sudoku|2048|wordle|solitaire|tetris|gomoku|hitori|puzzle|number-guessing/, "Games"],
  [/accounting|\bcpa\b|acca|\bfrm\b|\bcfa\b|financial-management|financial-accounting|회계|재무관리/, "Finance"],
  [/economics|behavioral-economics|macro|microeconomic|경제학|거시|미시/, "Finance"],
  [/insurance|보험/, "Finance"],
  [/dividend|\betf\b|stock|invest|fire-retire|pension|salary|finance|money|연금|배당|주식|투자|월급|재테크|예금|적금/, "Finance"],
  [/management|\bhrm\b|marketing|business-type|business-start|freelancer-vs-business|incorporation|startup|경영|마케팅|인사관리|창업/, "Business"],
  [/statistics|통계/, "Science & Nature"],
  [/astrology|saju|tarot|zodiac|horoscope|numerology|fortune|점성|사주|타로|별자리|운세|꿈해몽|관상/, "Mysticism"],
  [/mbti|enneagram|personality|psycholog|burnout|stress|attachment|self-esteem|self-discovery|narciss|mental|emotion|adhd|anxiety|depression|\bhsp\b|성격|심리|번아웃|스트레스|애착|자존감|에니어그램|우울|불안/, "Mind & Psychology"],
  [/calorie|\bbmi\b|body-fat|nutrition|fasting|\bdiet\b|water-intake|caffeine|workout|fitness|tdee|sleep|건강|영양|운동|단식|수면|칼로리/, "Health"],
  [/python|developer|\bai-\b|machine-learning|bigdata|big-data|\baws\b|cissp|\bsql\b|programming|\bcode\b|data-analysis|개발|코딩|프로그래밍|인공지능|데이터분석/, "Computer Science"],
  [/career|resume|interview|job-|employment|이직|퇴직|취업|면접|이력서|커리어/, "Career"],
  [/education|study|grammar|english|language|vocab|학습|공부|영어|어학/, "Education"],
  [/photography|design|color-|palette|사진|디자인/, "Design"],
  [/philosophy|stoic|buddhism|taoism|spirit|철학|불교|명상/, "Philosophy & Spirit"],
  [/mythology|myth|history|legend|cold-war|exploration|dynasty|empire|\bwar\b|revolution|civilization|ancient|medieval|roman|greek|신화|역사|전설|중세|고대|전쟁|혁명|문명|왕조|제국/, "Myth & Culture"],
  [/recipe|baking|cooking|\bfood\b|coffee|travel|dday|anniversary|countdown|biorhythm|hobby|wedding|funeral|etiquette|여행|레시피|베이킹|요리|취미|예절|결혼|장례/, "Lifestyle"],
  [/beauty|makeup|perfume|뷰티|화장품|향수/, "Beauty"],
  // ── Magazine catch-all reclassification (review fix ②) ──
  [/lostark|raid-splitter|auction-calc|chess|체스|board-game|보드게임/, "Games"],
  [/renaissance|medici|르네상스/, "Myth & Culture"],
  [/climate-change|기후변화|탄소중립|온실가스/, "Science & Nature"],
  [/apartment-subscription|lease-contract|youth-housing|reconstruction-profit|청약|임대차|youth-welfare|재건축/, "Real Estate"],
  [/college-entrance|대학입시|수능/, "Education"],
  [/mac-buying|macbook|laptop|tech-news|typing-agility|password-generator|uuid|lorem-ipsum|word-counter|애플/, "Computer Science"],
  [/small-business-closure|폐업|소상공인/, "Business"],
  [/commute-productivity|parental-leave|remote-work|work-from-home|annual-leave|출퇴근|육아휴직|재택근무|원격근무|연차/, "Career"],
  [/credit-card|신용카드|bankruptcy|개인회생|개인파산|채무조정|side-hustle|부업|overseas-shopping|해외직구|retirement-abroad|은퇴이민|currency-converter|fuel-cost|tip-calculator|legal-interest/, "Finance"],
  [/love-calculator|blood-type|혈액형/, "Mysticism"],
  [/skin-care|skincare|hair-care|피부관리|모발|헤어/, "Beauty"],
  [/cancer-prevention|chronic-pain|dental|diabetes|gut-health|menopause|migraine|headache|두통|편두통|pilates|posture|pregnancy|quitting-smoking|금연|senior-health|stretching|스트레칭|yoga|요가|exercise-habit|menstrual|만성통증|당뇨|폐경|자세교정|건강/, "Health"],
  [/communication-skill|소통기술|focus-concentration|집중력|game-addiction|게임중독|habit-formation|습관형성|reading-habit|독서습관|speed-reading|속독|smartphone-addiction|스마트폰중독|digital-minimal|디지털미니멀|인터넷중독/, "Mind & Psychology"],
  [/camping|캠핑|hiking|등산|트레킹|cycling|자전거|running|달리기|마라톤|houseplant|반려식물|\btea\b|녹차|홍차|wine|와인|decluttering|정리정돈|minimalism|미니멀|moving-guide|이사|house-cleaning|청소|electric-vehicle|전기차|divorce|이혼|elderly|parents-elder|부모돌봄|노인돌봄|emergency-prepared|재난|volunteer|봉사|zero-waste|제로웨이스트|seasonal-events|pet-age|marriage-age|pomodoro|height-converter|life-utilities|life-guide|hobby|취미/, "Lifestyle"],
];

function classify(item) {
  const hay = `${item.slug} ${item.series ?? ""} ${(item.tags ?? []).join(" ")}`.toLowerCase();
  for (const [re, cat] of RULES) if (re.test(hay)) return cat;
  return null;
}

function listMdx(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith(".mdx")).map((f) => path.join(dir, f));
}

let total = 0, matched = 0;
const dist = {};
const unmatched = [];
const slugify = (c) => c.toLowerCase().replace(/[^a-z0-9]+/g, "-");

for (const locale of LOCALES) {
  for (const file of listMdx(path.join(contentRoot, locale))) {
    const text = fs.readFileSync(file, "utf8");
    let data;
    try { data = matter(text).data; } catch { continue; }
    const raw = (data.category ?? "").toString().replace(/^["']|["']$/g, "").trim();
    if (!TRACK_CATS.has(raw.toLowerCase())) continue;
    total++;
    const base = path.basename(file, ".mdx");
    const chMatch = base.match(/-ch(\d+)$/);
    const item = { slug: base, series: data.series, tags: Array.isArray(data.tags) ? data.tags : [] };
    const cat = classify(item);
    if (!cat) { unmatched.push(base); continue; }
    matched++;
    dist[cat] = (dist[cat] ?? 0) + 1;
    if (APPLY) {
      const next = text.replace(/^(category:\s*)["']?[^"'\n]+["']?\s*$/m, `$1"${cat}"`);
      if (next !== text) fs.writeFileSync(file, next);
    }
  }
}

console.log(APPLY ? "=== APPLIED ===" : "=== DRY-RUN ===");
console.log(`track-as-category files: ${total}`);
console.log(`classified: ${matched} (${((matched / total) * 100).toFixed(1)}%) · unmatched (left as-is): ${unmatched.length}`);
console.log("\nResulting category distribution:");
Object.entries(dist).sort((a, b) => b[1] - a[1]).forEach(([c, n]) => console.log(`  ${n}  ${c}`));
if (unmatched.length) {
  console.log(`\nUnmatched sample (first 25):`);
  unmatched.slice(0, 25).forEach((s) => console.log(`  ${s}`));
}
