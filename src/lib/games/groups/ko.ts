import type { Category } from "./types";

/** Korean foursomes. One word is never shared, so a board has one solution in this bank. */
export const koBank: readonly Category[] = [
  { id: "seasons", name: "계절", level: 0, cousin: "weather", lure: "겨울", words: ["봄", "여름", "가을", "겨울"] },
  { id: "colors", name: "색깔", level: 0, cousin: "citrus", lure: "노랑", words: ["빨강", "파랑", "노랑", "초록"] },
  { id: "face", name: "얼굴", level: 0, cousin: "weather", lure: "눈", words: ["눈", "코", "입", "귀"] },
  { id: "school", name: "학용품", level: 0, cousin: "paper", lure: "연필", words: ["연필", "지우개", "필통", "자"] },
  { id: "balls", name: "공놀이", level: 0, cousin: "racquet", lure: "배구", words: ["축구", "농구", "배구", "야구"] },
  { id: "weather", name: "하늘에서 오는 것", level: 1, cousin: "seasons", lure: "함박눈", words: ["비", "함박눈", "우박", "이슬"] },
  { id: "cardinal", name: "방향", level: 1, cousin: "seasons", lure: "북쪽", words: ["동쪽", "서쪽", "남쪽", "북쪽"] },
  { id: "citrus", name: "신맛 과일", level: 1, cousin: "colors", lure: "레몬", words: ["레몬", "라임", "유자", "자몽"] },
  { id: "janggi", name: "장기 말", level: 1, cousin: "drinks", lure: "차", words: ["차", "포", "마", "상"] },
  { id: "rivers", name: "남한의 강", level: 1, cousin: "metals", lure: "금강", words: ["한강", "낙동강", "금강", "영산강"] },
  { id: "drinks", name: "따뜻한 음료", level: 2, cousin: "grains", lure: "보리차", words: ["녹차", "홍차", "코코아", "보리차"] },
  { id: "paper", name: "종이", level: 2, cousin: "school", lure: "공책", words: ["공책", "편지지", "도화지", "색종이"] },
  { id: "planets", name: "안쪽 행성", level: 2, cousin: "metals", lure: "금성", words: ["수성", "금성", "화성", "목성"] },
  { id: "mountains", name: "남한의 산", level: 2, cousin: "rivers", lure: "한라산", words: ["한라산", "지리산", "설악산", "북한산"] },
  { id: "strings", name: "현악 국악기", level: 2, cousin: "brass", lure: "해금", words: ["가야금", "거문고", "해금", "아쟁"] },
  { id: "metals", name: "금속", level: 3, cousin: "planets", lure: "금", words: ["금", "은", "구리", "철"] },
  { id: "grains", name: "곡식", level: 3, cousin: "drinks", lure: "보리", words: ["쌀", "보리", "밀", "콩"] },
  { id: "racquet", name: "라켓 운동", level: 3, cousin: "balls", lure: "탁구", words: ["테니스", "배드민턴", "탁구", "스쿼시"] },
  { id: "brass", name: "금관악기", level: 3, cousin: "strings", lure: "호른", words: ["트럼펫", "트롬본", "호른", "튜바"] },
  { id: "furniture", name: "가구", level: 3, cousin: "school", lure: "책상", words: ["책상", "의자", "침대", "옷장"] },
];
