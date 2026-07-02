import { useState, useEffect, useRef, useCallback } from "react";
import { GameContainer } from "../ui/game/GamePrimitives";
import type { Locale } from "../../lib/i18n";

// ── Emoji data ────────────────────────────────────────────────────────────────
interface EmojiItem {
  emoji: string;
  name: string;
  ko: string;
}

const EMOJI_DATA: Record<string, EmojiItem[]> = {
  smileys: [
    { emoji: "😀", name: "grinning face", ko: "웃음" },
    { emoji: "😁", name: "beaming face with smiling eyes", ko: "활짝 웃음" },
    { emoji: "😂", name: "face with tears of joy", ko: "웃음 눈물" },
    { emoji: "🤣", name: "rolling on the floor laughing", ko: "배꼽 웃음" },
    { emoji: "😃", name: "grinning face with big eyes", ko: "큰 눈 웃음" },
    { emoji: "😄", name: "grinning face with smiling eyes", ko: "미소 웃음" },
    { emoji: "😅", name: "grinning face with sweat", ko: "식은땀 웃음" },
    { emoji: "😆", name: "grinning squinting face", ko: "눈감고 웃음" },
    { emoji: "😉", name: "winking face", ko: "윙크" },
    { emoji: "😊", name: "smiling face with smiling eyes", ko: "눈웃음" },
    { emoji: "😋", name: "face savoring food", ko: "맛있다" },
    { emoji: "😎", name: "smiling face with sunglasses", ko: "선글라스 멋짐" },
    { emoji: "😍", name: "smiling face with heart eyes", ko: "반한 얼굴" },
    { emoji: "🥰", name: "smiling face with hearts", ko: "사랑" },
    { emoji: "😘", name: "face blowing a kiss", ko: "키스" },
    { emoji: "🤩", name: "star struck", ko: "별눈" },
    { emoji: "🥳", name: "partying face", ko: "파티" },
    { emoji: "😏", name: "smirking face", ko: "비웃음" },
    { emoji: "😒", name: "unamused face", ko: "지겨움" },
    { emoji: "😞", name: "disappointed face", ko: "실망" },
    { emoji: "😔", name: "pensive face", ko: "슬픔" },
    { emoji: "😟", name: "worried face", ko: "걱정" },
    { emoji: "😕", name: "confused face", ko: "혼란" },
    { emoji: "🙁", name: "slightly frowning face", ko: "약간 찡그림" },
    { emoji: "😮", name: "face with open mouth", ko: "놀람" },
    { emoji: "😯", name: "hushed face", ko: "조용히" },
    { emoji: "😲", name: "astonished face", ko: "경악" },
    { emoji: "😳", name: "flushed face", ko: "당황" },
    { emoji: "🥺", name: "pleading face", ko: "애원" },
    { emoji: "😱", name: "face screaming in fear", ko: "공포 비명" },
    { emoji: "😨", name: "fearful face", ko: "무서움" },
    { emoji: "😰", name: "anxious face with sweat", ko: "식은땀 불안" },
    { emoji: "😭", name: "loudly crying face", ko: "엉엉 울음" },
    { emoji: "😢", name: "crying face", ko: "눈물" },
    { emoji: "🤯", name: "exploding head", ko: "머리 폭발" },
    { emoji: "😤", name: "face with steam from nose", ko: "콧김 분노" },
    { emoji: "😠", name: "angry face", ko: "화남" },
    { emoji: "😡", name: "pouting face", ko: "분노" },
    { emoji: "🤬", name: "face with symbols on mouth", ko: "욕설" },
    { emoji: "🤢", name: "nauseated face", ko: "역겨움" },
    { emoji: "🤮", name: "face vomiting", ko: "구토" },
    { emoji: "🤧", name: "sneezing face", ko: "재채기" },
    { emoji: "🥵", name: "hot face", ko: "더위" },
    { emoji: "🥶", name: "cold face", ko: "추위" },
    { emoji: "😴", name: "sleeping face", ko: "졸음" },
    { emoji: "🤤", name: "drooling face", ko: "침흘림" },
    { emoji: "😇", name: "smiling face with halo", ko: "천사" },
    { emoji: "🤠", name: "cowboy hat face", ko: "카우보이" },
    { emoji: "🤡", name: "clown face", ko: "광대" },
    { emoji: "🥸", name: "disguised face", ko: "변장" },
    { emoji: "😈", name: "smiling face with horns", ko: "악마 미소" },
    { emoji: "👻", name: "ghost", ko: "유령" },
    { emoji: "💀", name: "skull", ko: "해골" },
    { emoji: "🤖", name: "robot", ko: "로봇" },
    { emoji: "👽", name: "alien", ko: "외계인" },
    { emoji: "🎭", name: "performing arts", ko: "연극" },
    { emoji: "😐", name: "neutral face", ko: "무표정" },
    { emoji: "🙄", name: "face with rolling eyes", ko: "눈 굴리기" },
    { emoji: "🤔", name: "thinking face", ko: "생각중" },
    { emoji: "🤭", name: "face with hand over mouth", ko: "입막음 웃음" },
  ],
  animals: [
    { emoji: "🐶", name: "dog face", ko: "강아지" },
    { emoji: "🐱", name: "cat face", ko: "고양이" },
    { emoji: "🐭", name: "mouse face", ko: "쥐" },
    { emoji: "🐹", name: "hamster", ko: "햄스터" },
    { emoji: "🐰", name: "rabbit face", ko: "토끼" },
    { emoji: "🦊", name: "fox", ko: "여우" },
    { emoji: "🐻", name: "bear", ko: "곰" },
    { emoji: "🐼", name: "panda", ko: "판다" },
    { emoji: "🐨", name: "koala", ko: "코알라" },
    { emoji: "🐯", name: "tiger face", ko: "호랑이" },
    { emoji: "🦁", name: "lion", ko: "사자" },
    { emoji: "🐮", name: "cow face", ko: "소" },
    { emoji: "🐷", name: "pig face", ko: "돼지" },
    { emoji: "🐸", name: "frog", ko: "개구리" },
    { emoji: "🐵", name: "monkey face", ko: "원숭이" },
    { emoji: "🐔", name: "chicken", ko: "닭" },
    { emoji: "🐧", name: "penguin", ko: "펭귄" },
    { emoji: "🐦", name: "bird", ko: "새" },
    { emoji: "🐤", name: "baby chick", ko: "병아리" },
    { emoji: "🦆", name: "duck", ko: "오리" },
    { emoji: "🦅", name: "eagle", ko: "독수리" },
    { emoji: "🦉", name: "owl", ko: "올빼미" },
    { emoji: "🦇", name: "bat", ko: "박쥐" },
    { emoji: "🐺", name: "wolf", ko: "늑대" },
    { emoji: "🐗", name: "boar", ko: "멧돼지" },
    { emoji: "🐴", name: "horse face", ko: "말" },
    { emoji: "🦄", name: "unicorn", ko: "유니콘" },
    { emoji: "🐝", name: "honeybee", ko: "꿀벌" },
    { emoji: "🐛", name: "bug", ko: "벌레" },
    { emoji: "🦋", name: "butterfly", ko: "나비" },
    { emoji: "🐌", name: "snail", ko: "달팽이" },
    { emoji: "🐞", name: "lady beetle", ko: "무당벌레" },
    { emoji: "🐜", name: "ant", ko: "개미" },
    { emoji: "🦟", name: "mosquito", ko: "모기" },
    { emoji: "🐢", name: "turtle", ko: "거북이" },
    { emoji: "🐍", name: "snake", ko: "뱀" },
    { emoji: "🦎", name: "lizard", ko: "도마뱀" },
    { emoji: "🐊", name: "crocodile", ko: "악어" },
    { emoji: "🦖", name: "t-rex", ko: "티라노사우루스" },
    { emoji: "🐳", name: "spouting whale", ko: "고래" },
    { emoji: "🐬", name: "dolphin", ko: "돌고래" },
    { emoji: "🦈", name: "shark", ko: "상어" },
    { emoji: "🐙", name: "octopus", ko: "문어" },
    { emoji: "🦑", name: "squid", ko: "오징어" },
    { emoji: "🦞", name: "lobster", ko: "바닷가재" },
    { emoji: "🌸", name: "cherry blossom", ko: "벚꽃" },
    { emoji: "🌺", name: "hibiscus", ko: "히비스커스" },
    { emoji: "🌻", name: "sunflower", ko: "해바라기" },
    { emoji: "🌹", name: "rose", ko: "장미" },
    { emoji: "🌷", name: "tulip", ko: "튤립" },
  ],
  food: [
    { emoji: "🍎", name: "red apple", ko: "사과" },
    { emoji: "🍊", name: "tangerine", ko: "귤" },
    { emoji: "🍋", name: "lemon", ko: "레몬" },
    { emoji: "🍇", name: "grapes", ko: "포도" },
    { emoji: "🍓", name: "strawberry", ko: "딸기" },
    { emoji: "🫐", name: "blueberries", ko: "블루베리" },
    { emoji: "🍈", name: "melon", ko: "멜론" },
    { emoji: "🍉", name: "watermelon", ko: "수박" },
    { emoji: "🍑", name: "peach", ko: "복숭아" },
    { emoji: "🍒", name: "cherries", ko: "체리" },
    { emoji: "🍍", name: "pineapple", ko: "파인애플" },
    { emoji: "🥭", name: "mango", ko: "망고" },
    { emoji: "🥥", name: "coconut", ko: "코코넛" },
    { emoji: "🍌", name: "banana", ko: "바나나" },
    { emoji: "🥝", name: "kiwi fruit", ko: "키위" },
    { emoji: "🍅", name: "tomato", ko: "토마토" },
    { emoji: "🥑", name: "avocado", ko: "아보카도" },
    { emoji: "🫒", name: "olive", ko: "올리브" },
    { emoji: "🥦", name: "broccoli", ko: "브로콜리" },
    { emoji: "🥕", name: "carrot", ko: "당근" },
    { emoji: "🌽", name: "ear of corn", ko: "옥수수" },
    { emoji: "🌶️", name: "hot pepper", ko: "고추" },
    { emoji: "🥔", name: "potato", ko: "감자" },
    { emoji: "🍄", name: "mushroom", ko: "버섯" },
    { emoji: "🧅", name: "onion", ko: "양파" },
    { emoji: "🍞", name: "bread", ko: "빵" },
    { emoji: "🥐", name: "croissant", ko: "크루아상" },
    { emoji: "🍕", name: "pizza", ko: "피자" },
    { emoji: "🍔", name: "hamburger", ko: "햄버거" },
    { emoji: "🌮", name: "taco", ko: "타코" },
    { emoji: "🌯", name: "burrito", ko: "부리토" },
    { emoji: "🍜", name: "steaming bowl", ko: "라면" },
    { emoji: "🍣", name: "sushi", ko: "초밥" },
    { emoji: "🍱", name: "bento box", ko: "도시락" },
    { emoji: "🍛", name: "curry rice", ko: "카레" },
    { emoji: "🍲", name: "pot of food", ko: "찌개" },
    { emoji: "🥘", name: "shallow pan of food", ko: "볶음" },
    { emoji: "🍗", name: "poultry leg", ko: "치킨" },
    { emoji: "🥩", name: "cut of meat", ko: "고기" },
    { emoji: "🍦", name: "soft ice cream", ko: "소프트아이스크림" },
    { emoji: "🍰", name: "shortcake", ko: "케이크" },
    { emoji: "🎂", name: "birthday cake", ko: "생일 케이크" },
    { emoji: "🍩", name: "doughnut", ko: "도넛" },
    { emoji: "🍪", name: "cookie", ko: "쿠키" },
    { emoji: "🍫", name: "chocolate bar", ko: "초콜릿" },
    { emoji: "🍬", name: "candy", ko: "사탕" },
    { emoji: "☕", name: "hot beverage", ko: "커피" },
    { emoji: "🧋", name: "bubble tea", ko: "버블티" },
    { emoji: "🥤", name: "cup with straw", ko: "음료수" },
    { emoji: "🍺", name: "beer mug", ko: "맥주" },
    { emoji: "🍷", name: "wine glass", ko: "와인" },
    { emoji: "🥂", name: "clinking glasses", ko: "건배" },
    { emoji: "🍸", name: "cocktail glass", ko: "칵테일" },
    { emoji: "🧃", name: "beverage box", ko: "주스 팩" },
    { emoji: "🥛", name: "glass of milk", ko: "우유" },
  ],
  activities: [
    { emoji: "⚽", name: "soccer ball", ko: "축구" },
    { emoji: "🏀", name: "basketball", ko: "농구" },
    { emoji: "🏈", name: "american football", ko: "미식축구" },
    { emoji: "⚾", name: "baseball", ko: "야구" },
    { emoji: "🥎", name: "softball", ko: "소프트볼" },
    { emoji: "🎾", name: "tennis", ko: "테니스" },
    { emoji: "🏐", name: "volleyball", ko: "배구" },
    { emoji: "🏉", name: "rugby football", ko: "럭비" },
    { emoji: "🥏", name: "flying disc", ko: "프리스비" },
    { emoji: "🎱", name: "pool 8 ball", ko: "당구" },
    { emoji: "🏓", name: "ping pong", ko: "탁구" },
    { emoji: "🏸", name: "badminton", ko: "배드민턴" },
    { emoji: "🥊", name: "boxing glove", ko: "권투" },
    { emoji: "🥋", name: "martial arts uniform", ko: "무술" },
    { emoji: "🎿", name: "skis", ko: "스키" },
    { emoji: "⛷️", name: "skier", ko: "스키 타기" },
    { emoji: "🏂", name: "snowboarder", ko: "스노보드" },
    { emoji: "🏊", name: "person swimming", ko: "수영" },
    { emoji: "🤽", name: "person playing water polo", ko: "수구" },
    { emoji: "🚴", name: "person biking", ko: "자전거" },
    { emoji: "🏋️", name: "person lifting weights", ko: "역도" },
    { emoji: "🤸", name: "person cartwheeling", ko: "체조" },
    { emoji: "🤼", name: "people wrestling", ko: "레슬링" },
    { emoji: "🤺", name: "person fencing", ko: "펜싱" },
    { emoji: "🏇", name: "horse racing", ko: "경마" },
    { emoji: "⛳", name: "flag in hole", ko: "골프" },
    { emoji: "🎯", name: "direct hit", ko: "과녁" },
    { emoji: "🎮", name: "video game", ko: "게임" },
    { emoji: "🎲", name: "game die", ko: "주사위" },
    { emoji: "🎳", name: "bowling", ko: "볼링" },
    { emoji: "🃏", name: "joker", ko: "조커 카드" },
    { emoji: "🧩", name: "puzzle piece", ko: "퍼즐" },
    { emoji: "🎭", name: "performing arts", ko: "연극" },
    { emoji: "🎨", name: "artist palette", ko: "그림" },
    { emoji: "🎬", name: "clapper board", ko: "영화" },
    { emoji: "🎤", name: "microphone", ko: "마이크" },
    { emoji: "🎸", name: "guitar", ko: "기타" },
    { emoji: "🥁", name: "drum", ko: "드럼" },
  ],
  travel: [
    { emoji: "✈️", name: "airplane", ko: "비행기" },
    { emoji: "🚀", name: "rocket", ko: "로켓" },
    { emoji: "🛸", name: "flying saucer", ko: "UFO" },
    { emoji: "🚂", name: "locomotive", ko: "기차" },
    { emoji: "🚃", name: "railway car", ko: "기차칸" },
    { emoji: "🚄", name: "high speed train", ko: "고속철도" },
    { emoji: "🚌", name: "bus", ko: "버스" },
    { emoji: "🚎", name: "trolleybus", ko: "트롤리버스" },
    { emoji: "🚐", name: "minibus", ko: "미니버스" },
    { emoji: "🚑", name: "ambulance", ko: "구급차" },
    { emoji: "🚒", name: "fire engine", ko: "소방차" },
    { emoji: "🚓", name: "police car", ko: "경찰차" },
    { emoji: "🚗", name: "automobile", ko: "자동차" },
    { emoji: "🚕", name: "taxi", ko: "택시" },
    { emoji: "🏎️", name: "racing car", ko: "레이싱카" },
    { emoji: "🚙", name: "sport utility vehicle", ko: "SUV" },
    { emoji: "🚲", name: "bicycle", ko: "자전거" },
    { emoji: "🛵", name: "motor scooter", ko: "스쿠터" },
    { emoji: "🏍️", name: "motorcycle", ko: "오토바이" },
    { emoji: "⛵", name: "sailboat", ko: "범선" },
    { emoji: "🚢", name: "ship", ko: "배" },
    { emoji: "⛽", name: "fuel pump", ko: "주유소" },
    { emoji: "🗺️", name: "world map", ko: "세계 지도" },
    { emoji: "🏔️", name: "snow capped mountain", ko: "설산" },
    { emoji: "🏕️", name: "camping", ko: "캠핑" },
    { emoji: "🏖️", name: "beach with umbrella", ko: "해변" },
    { emoji: "🏜️", name: "desert", ko: "사막" },
    { emoji: "🏝️", name: "desert island", ko: "무인도" },
    { emoji: "🌋", name: "volcano", ko: "화산" },
    { emoji: "🗼", name: "tokyo tower", ko: "도쿄타워" },
    { emoji: "🗽", name: "statue of liberty", ko: "자유의 여신상" },
    { emoji: "⛩️", name: "shinto shrine", ko: "신사" },
    { emoji: "🏯", name: "japanese castle", ko: "일본 성" },
    { emoji: "🏰", name: "european castle", ko: "유럽 성" },
    { emoji: "🌃", name: "night with stars", ko: "밤하늘" },
    { emoji: "🌆", name: "cityscape at dusk", ko: "도시 황혼" },
    { emoji: "🌇", name: "sunset", ko: "일몰" },
    { emoji: "🌉", name: "bridge at night", ko: "야경 다리" },
  ],
  objects: [
    { emoji: "💡", name: "light bulb", ko: "전구" },
    { emoji: "🔦", name: "flashlight", ko: "손전등" },
    { emoji: "🕯️", name: "candle", ko: "촛불" },
    { emoji: "📱", name: "mobile phone", ko: "스마트폰" },
    { emoji: "💻", name: "laptop", ko: "노트북" },
    { emoji: "🖥️", name: "desktop computer", ko: "데스크탑" },
    { emoji: "⌨️", name: "keyboard", ko: "키보드" },
    { emoji: "🖱️", name: "computer mouse", ko: "마우스" },
    { emoji: "📷", name: "camera", ko: "카메라" },
    { emoji: "📸", name: "camera with flash", ko: "플래시 카메라" },
    { emoji: "📺", name: "television", ko: "TV" },
    { emoji: "📻", name: "radio", ko: "라디오" },
    { emoji: "📞", name: "telephone receiver", ko: "전화기" },
    { emoji: "⌚", name: "watch", ko: "시계" },
    { emoji: "📡", name: "satellite antenna", ko: "안테나" },
    { emoji: "🔋", name: "battery", ko: "배터리" },
    { emoji: "🔌", name: "electric plug", ko: "전기 플러그" },
    { emoji: "💽", name: "computer disk", ko: "디스크" },
    { emoji: "📀", name: "dvd", ko: "DVD" },
    { emoji: "📚", name: "books", ko: "책" },
    { emoji: "📖", name: "open book", ko: "열린 책" },
    { emoji: "📝", name: "memo", ko: "메모" },
    { emoji: "✏️", name: "pencil", ko: "연필" },
    { emoji: "🖊️", name: "pen", ko: "펜" },
    { emoji: "📌", name: "pushpin", ko: "압정" },
    { emoji: "📎", name: "paperclip", ko: "클립" },
    { emoji: "✂️", name: "scissors", ko: "가위" },
    { emoji: "🔑", name: "key", ko: "열쇠" },
    { emoji: "🔒", name: "locked", ko: "잠금" },
    { emoji: "🔓", name: "unlocked", ko: "잠금 해제" },
    { emoji: "🔔", name: "bell", ko: "종" },
    { emoji: "🔕", name: "bell with slash", ko: "무음" },
    { emoji: "🎁", name: "wrapped gift", ko: "선물" },
    { emoji: "🎀", name: "ribbon", ko: "리본" },
    { emoji: "🛒", name: "shopping cart", ko: "쇼핑카트" },
    { emoji: "💊", name: "pill", ko: "약" },
    { emoji: "🩺", name: "stethoscope", ko: "청진기" },
    { emoji: "🔬", name: "microscope", ko: "현미경" },
    { emoji: "🔭", name: "telescope", ko: "망원경" },
    { emoji: "🧲", name: "magnet", ko: "자석" },
  ],
  symbols: [
    { emoji: "❤️", name: "red heart", ko: "빨간 하트" },
    { emoji: "🧡", name: "orange heart", ko: "주황 하트" },
    { emoji: "💛", name: "yellow heart", ko: "노란 하트" },
    { emoji: "💚", name: "green heart", ko: "초록 하트" },
    { emoji: "💙", name: "blue heart", ko: "파란 하트" },
    { emoji: "💜", name: "purple heart", ko: "보라 하트" },
    { emoji: "🖤", name: "black heart", ko: "검정 하트" },
    { emoji: "🤍", name: "white heart", ko: "흰 하트" },
    { emoji: "🤎", name: "brown heart", ko: "갈색 하트" },
    { emoji: "💔", name: "broken heart", ko: "실연 하트" },
    { emoji: "💕", name: "two hearts", ko: "두 하트" },
    { emoji: "💞", name: "revolving hearts", ko: "회전 하트" },
    { emoji: "💝", name: "heart with ribbon", ko: "리본 하트" },
    { emoji: "💘", name: "heart with arrow", ko: "화살 하트" },
    { emoji: "✨", name: "sparkles", ko: "반짝임" },
    { emoji: "⭐", name: "star", ko: "별" },
    { emoji: "🌟", name: "glowing star", ko: "빛나는 별" },
    { emoji: "💫", name: "dizzy", ko: "어지러움" },
    { emoji: "⚡", name: "high voltage", ko: "번개" },
    { emoji: "🔥", name: "fire", ko: "불" },
    { emoji: "🌈", name: "rainbow", ko: "무지개" },
    { emoji: "☀️", name: "sun", ko: "태양" },
    { emoji: "🌙", name: "crescent moon", ko: "초승달" },
    { emoji: "❄️", name: "snowflake", ko: "눈송이" },
    { emoji: "💧", name: "droplet", ko: "물방울" },
    { emoji: "🌊", name: "water wave", ko: "파도" },
    { emoji: "✅", name: "check mark button", ko: "체크" },
    { emoji: "❌", name: "cross mark", ko: "엑스" },
    { emoji: "⭕", name: "hollow red circle", ko: "동그라미" },
    { emoji: "❓", name: "question mark", ko: "물음표" },
    { emoji: "❗", name: "exclamation mark", ko: "느낌표" },
    { emoji: "💯", name: "hundred points", ko: "100점" },
    { emoji: "🔝", name: "top arrow", ko: "위로" },
    { emoji: "🆕", name: "new button", ko: "새것" },
    { emoji: "🆓", name: "free button", ko: "무료" },
    { emoji: "🆙", name: "up button", ko: "업" },
    { emoji: "🔴", name: "red circle", ko: "빨간 원" },
    { emoji: "🟠", name: "orange circle", ko: "주황 원" },
    { emoji: "🟡", name: "yellow circle", ko: "노란 원" },
    { emoji: "🟢", name: "green circle", ko: "초록 원" },
    { emoji: "🔵", name: "blue circle", ko: "파란 원" },
    { emoji: "🟣", name: "purple circle", ko: "보라 원" },
    { emoji: "⚫", name: "black circle", ko: "검정 원" },
    { emoji: "⚪", name: "white circle", ko: "흰 원" },
  ],
};

// ── Category config ───────────────────────────────────────────────────────────
const CATEGORIES = [
  { key: "smileys", icon: "😀" },
  { key: "animals", icon: "🐶" },
  { key: "food", icon: "🍎" },
  { key: "activities", icon: "⚽" },
  { key: "travel", icon: "✈️" },
  { key: "objects", icon: "💡" },
  { key: "symbols", icon: "❤️" },
  { key: "recent", icon: "🕐" },
] as const;

type CategoryKey = (typeof CATEGORIES)[number]["key"];

// ── i18n labels ───────────────────────────────────────────────────────────────
type L = Locale;

interface Labels {
  title: string;
  subtitle: string;
  search: string;
  copied: string;
  noResults: string;
  recentEmpty: string;
  catSmileys: string;
  catAnimals: string;
  catFood: string;
  catActivities: string;
  catTravel: string;
  catObjects: string;
  catSymbols: string;
  catRecent: string;
}

const LABELS: Record<L, Labels> = {
  ko: {
    title: "이모지 픽커",
    subtitle: "Emoji Picker",
    search: "이름 또는 한국어로 검색...",
    copied: "복사됨!",
    noResults: "검색 결과 없음",
    recentEmpty: "최근 사용한 이모지가 없습니다",
    catSmileys: "얼굴/감정",
    catAnimals: "동물/자연",
    catFood: "음식/음료",
    catActivities: "활동/스포츠",
    catTravel: "여행/장소",
    catObjects: "사물",
    catSymbols: "기호",
    catRecent: "최근 사용",
  },
  en: {
    title: "Emoji Picker",
    subtitle: "Copy any emoji to clipboard",
    search: "Search by name or keyword...",
    copied: "Copied!",
    noResults: "No results found",
    recentEmpty: "No recently used emoji",
    catSmileys: "Smileys & Emotions",
    catAnimals: "Animals & Nature",
    catFood: "Food & Drink",
    catActivities: "Activities",
    catTravel: "Travel & Places",
    catObjects: "Objects",
    catSymbols: "Symbols",
    catRecent: "Recent",
  },
  ja: {
    title: "絵文字ピッカー",
    subtitle: "絵文字をコピー",
    search: "名前またはキーワードで検索...",
    copied: "コピーしました!",
    noResults: "結果なし",
    recentEmpty: "最近使った絵文字はありません",
    catSmileys: "顔・感情",
    catAnimals: "動物・自然",
    catFood: "食べ物・飲み物",
    catActivities: "アクティビティ",
    catTravel: "旅行・場所",
    catObjects: "物",
    catSymbols: "記号",
    catRecent: "最近使用",
  },
  fr: {
    title: "Sélecteur d'Emoji",
    subtitle: "Copier un emoji dans le presse-papier",
    search: "Rechercher par nom...",
    copied: "Copié!",
    noResults: "Aucun résultat",
    recentEmpty: "Aucun emoji récemment utilisé",
    catSmileys: "Visages et émotions",
    catAnimals: "Animaux et nature",
    catFood: "Nourriture et boissons",
    catActivities: "Activités",
    catTravel: "Voyages et lieux",
    catObjects: "Objets",
    catSymbols: "Symboles",
    catRecent: "Récents",
  },
  es: {
    title: "Selector de Emoji",
    subtitle: "Copia cualquier emoji al portapapeles",
    search: "Buscar por nombre...",
    copied: "¡Copiado!",
    noResults: "Sin resultados",
    recentEmpty: "No hay emoji usados recientemente",
    catSmileys: "Caras y emociones",
    catAnimals: "Animales y naturaleza",
    catFood: "Comida y bebida",
    catActivities: "Actividades",
    catTravel: "Viajes y lugares",
    catObjects: "Objetos",
    catSymbols: "Símbolos",
    catRecent: "Recientes",
  },
  zh: {
    title: "表情符号选择器",
    subtitle: "复制表情符号到剪贴板",
    search: "按名称或关键字搜索...",
    copied: "已复制!",
    noResults: "无搜索结果",
    recentEmpty: "最近没有使用过的表情符号",
    catSmileys: "笑脸和情感",
    catAnimals: "动物和自然",
    catFood: "食物和饮料",
    catActivities: "活动",
    catTravel: "旅游和地点",
    catObjects: "物品",
    catSymbols: "符号",
    catRecent: "最近使用",
  },
};

const CAT_LABEL_KEYS: Record<CategoryKey, keyof Labels> = {
  smileys: "catSmileys",
  animals: "catAnimals",
  food: "catFood",
  activities: "catActivities",
  travel: "catTravel",
  objects: "catObjects",
  symbols: "catSymbols",
  recent: "catRecent",
};

const RECENT_STORAGE_KEY = "emoji-picker-recent";
const MAX_RECENT = 24;

// ── Component ─────────────────────────────────────────────────────────────────
interface Props {
  locale: Locale;
}

export default function EmojiPicker({ locale }: Props) {
  const t = LABELS[locale] ?? LABELS.en;

  const [activeTab, setActiveTab] = useState<CategoryKey>("smileys");
  const [search, setSearch] = useState("");
  const [recent, setRecent] = useState<EmojiItem[]>([]);
  const [toast, setToast] = useState("");
  const [tooltip, setTooltip] = useState<{ emoji: string; name: string } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Load recent from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_STORAGE_KEY);
      if (stored) {
        setRecent(JSON.parse(stored) as EmojiItem[]);
      }
    } catch {
      // ignore
    }
  }, []);

  const copyEmoji = useCallback(
    (item: EmojiItem) => {
      navigator.clipboard.writeText(item.emoji).catch(() => {
        // fallback
        const ta = document.createElement("textarea");
        ta.value = item.emoji;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        try { document.execCommand("copy"); } catch { /* ignore */ }
        document.body.removeChild(ta);
      });

      // Update recent
      setRecent((prev) => {
        const filtered = prev.filter((r) => r.emoji !== item.emoji);
        const next = [item, ...filtered].slice(0, MAX_RECENT);
        try {
          localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });

      // Toast
      if (toastTimerRef.current !== undefined) {
        clearTimeout(toastTimerRef.current);
      }
      setToast(item.emoji);
      toastTimerRef.current = setTimeout(() => {
        setToast("");
        toastTimerRef.current = undefined;
      }, 1500);
    },
    []
  );

  // Determine displayed emojis
  const isSearching = search.trim().length > 0;
  const query = search.trim().toLowerCase();

  const displayedEmojis: EmojiItem[] = isSearching
    ? Object.values(EMOJI_DATA)
        .flat()
        .filter(
          (item) =>
            item.name.toLowerCase().includes(query) ||
            item.ko.includes(query) ||
            item.emoji.includes(query)
        )
    : activeTab === "recent"
    ? recent
    : EMOJI_DATA[activeTab] ?? [];

  return (
    <GameContainer
      title={t.title}
      subtitle={t.subtitle}
      onReset={() => {
        setSearch("");
        setActiveTab("smileys");
      }}
    >
      <div className="flex flex-col gap-4">
        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t.search}
          className="w-full px-4 py-3 bg-muted/30 rounded-2xl border border-border font-medium text-sm outline-none focus:ring-2 focus:ring-primary/40"
        />

        {/* Tabs */}
        {!isSearching && (
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setActiveTab(cat.key)}
                title={t[CAT_LABEL_KEYS[cat.key]] as string}
                className={`flex-shrink-0 flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-xs font-black transition-colors ${
                  activeTab === cat.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/30 text-muted-foreground hover:bg-muted"
                }`}
              >
                <span className="text-lg">{cat.icon}</span>
                <span className="text-[9px] hidden sm:block">
                  {t[CAT_LABEL_KEYS[cat.key]] as string}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Emoji Grid */}
        <div className="relative">
          {displayedEmojis.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-10">
              {activeTab === "recent" && !isSearching
                ? t.recentEmpty
                : t.noResults}
            </p>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(44px,1fr))] gap-1">
              {displayedEmojis.map((item) => (
                <div key={item.emoji} className="relative group">
                  <button
                    onClick={() => copyEmoji(item)}
                    onMouseEnter={() =>
                      setTooltip({ emoji: item.emoji, name: item.ko || item.name })
                    }
                    onMouseLeave={() => setTooltip(null)}
                    className="w-10 h-10 text-2xl rounded-xl hover:bg-muted/60 active:scale-90 transition-all flex items-center justify-center"
                    aria-label={item.name}
                  >
                    {item.emoji}
                  </button>
                  {/* Tooltip */}
                  {tooltip?.emoji === item.emoji && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-foreground text-background text-[10px] rounded-lg whitespace-nowrap z-10 pointer-events-none shadow-lg">
                      {tooltip.name}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Toast */}
        {toast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 text-sm font-black z-50 animate-in fade-in slide-in-from-bottom-4">
            <span className="text-xl">{toast}</span>
            <span>{t.copied}</span>
          </div>
        )}
      </div>
    </GameContainer>
  );
}
