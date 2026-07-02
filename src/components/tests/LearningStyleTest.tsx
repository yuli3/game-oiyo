import { useState } from 'react'

type SupportedLang = 'ko' | 'en' | 'ja'
type StyleType = 'visual' | 'auditory' | 'reading' | 'kinesthetic'

function lang(locale: string): SupportedLang {
  return (['ko', 'en', 'ja'] as const).includes(locale as SupportedLang)
    ? (locale as SupportedLang)
    : 'en'
}

interface Option { type: StyleType; text: string }
interface Question { id: string; text: string; options: Option[] }

const LABELS: Record<SupportedLang, {
  title: string; subtitle: string; questionOf: (c: number, t: number) => string
  restart: string; share: string; shareMsg: string
  yourStyle: string; yourProfile: string; note: string
  styleNames: Record<StyleType, string>
  recommendation: string; dominant: string
}> = {
  ko: {
    title: '학습 유형 테스트 (VARK)',
    subtitle: '나는 어떻게 배울 때 가장 효과적일까?',
    questionOf: (c, t) => `${c} / ${t}`,
    restart: '다시 하기',
    share: '결과 공유',
    shareMsg: '내 학습 유형은',
    yourStyle: '나의 주요 학습 유형',
    yourProfile: 'VARK 학습 프로파일',
    note: '이 결과는 자기 이해를 위한 참고 자료입니다. 학습 스타일은 상황에 따라 달라질 수 있습니다.',
    styleNames: { visual: '시각형', auditory: '청각형', reading: '읽기/쓰기형', kinesthetic: '체험형' },
    recommendation: '추천 학습법',
    dominant: '주 유형',
  },
  en: {
    title: 'Learning Style Test (VARK)',
    subtitle: 'How do you learn most effectively?',
    questionOf: (c, t) => `${c} / ${t}`,
    restart: 'Retake',
    share: 'Share Result',
    shareMsg: 'My learning style is',
    yourStyle: 'Your Primary Learning Style',
    yourProfile: 'VARK Learning Profile',
    note: 'These results are for self-awareness. Learning styles can vary depending on context.',
    styleNames: { visual: 'Visual', auditory: 'Auditory', reading: 'Reading/Writing', kinesthetic: 'Kinesthetic' },
    recommendation: 'Recommended Methods',
    dominant: 'Dominant',
  },
  ja: {
    title: '学習スタイルテスト (VARK)',
    subtitle: 'どのように学ぶと最も効果的ですか？',
    questionOf: (c, t) => `${c} / ${t}`,
    restart: 'もう一度',
    share: '結果を共有',
    shareMsg: '私の学習スタイルは',
    yourStyle: 'あなたの主な学習スタイル',
    yourProfile: 'VARK学習プロファイル',
    note: 'この結果は自己理解のための参考情報です。学習スタイルは状況によって異なる場合があります。',
    styleNames: { visual: '視覚型', auditory: '聴覚型', reading: '読み書き型', kinesthetic: '体験型' },
    recommendation: 'おすすめの学習法',
    dominant: '主タイプ',
  },
}

interface StyleResult {
  icon: string; title: string; subtitle: string; description: string; tips: string[]
}

const STYLE_RESULTS: Record<StyleType, Record<SupportedLang, StyleResult>> = {
  visual: {
    ko: {
      icon: '👁️',
      title: '시각형',
      subtitle: '그림으로 생각하는 학습자',
      description: '도표, 색상, 공간적 배열로 정보를 처리합니다.',
      tips: ['마인드맵과 다이어그램 활용', '컬러 노트와 형광펜 사용', '인포그래픽과 영상 자료 탐색'],
    },
    en: {
      icon: '👁️',
      title: 'Visual',
      subtitle: 'A learner who thinks in pictures',
      description: 'You process information through diagrams, colors, and spatial arrangements.',
      tips: ['Use mind maps and diagrams', 'Color-code your notes with highlighters', 'Seek out infographics and video materials'],
    },
    ja: {
      icon: '👁️',
      title: '視覚型',
      subtitle: '図で考える学習者',
      description: '図表、色、空間的配置で情報を処理します。',
      tips: ['マインドマップや図を活用する', 'カラーノートと蛍光ペンを使う', 'インフォグラフィックや動画を活用する'],
    },
  },
  auditory: {
    ko: {
      icon: '👂',
      title: '청각형',
      subtitle: '들으면서 배우는 학습자',
      description: '소리, 음률, 토론으로 정보를 흡수합니다.',
      tips: ['강의 녹음 후 반복 청취', '스터디 그룹에서 소리 내어 설명', '팟캐스트와 오디오북 활용'],
    },
    en: {
      icon: '👂',
      title: 'Auditory',
      subtitle: 'A learner who absorbs through listening',
      description: 'You absorb information through sound, rhythm, and discussion.',
      tips: ['Record lectures and replay them', 'Explain concepts aloud in study groups', 'Use podcasts and audiobooks'],
    },
    ja: {
      icon: '👂',
      title: '聴覚型',
      subtitle: '聴いて学ぶ学習者',
      description: '音、リズム、ディスカッションで情報を吸収します。',
      tips: ['講義を録音して繰り返し聴く', 'スタディグループで声に出して説明する', 'ポッドキャストとオーディオブックを活用する'],
    },
  },
  reading: {
    ko: {
      icon: '📖',
      title: '읽기/쓰기형',
      subtitle: '글로 배우는 학습자',
      description: '텍스트를 읽고 쓰면서 가장 잘 이해합니다.',
      tips: ['상세한 필기와 요약 정리', '보고서 및 에세이 작성 연습', '관련 서적과 자료 독서'],
    },
    en: {
      icon: '📖',
      title: 'Reading/Writing',
      subtitle: 'A learner who thrives with text',
      description: 'You understand best by reading and writing text.',
      tips: ['Take detailed notes and write summaries', 'Practice writing reports and essays', 'Read books and reference materials'],
    },
    ja: {
      icon: '📖',
      title: '読み書き型',
      subtitle: '文字で学ぶ学習者',
      description: 'テキストを読み書きすることで最もよく理解します。',
      tips: ['詳細なノートとサマリーを書く', 'レポートやエッセイを書く練習をする', '関連書籍や資料を読む'],
    },
  },
  kinesthetic: {
    ko: {
      icon: '🤸',
      title: '체험형',
      subtitle: '경험으로 배우는 학습자',
      description: '직접 해보고 실습하면서 가장 효과적으로 학습합니다.',
      tips: ['실습 프로젝트와 역할극 활용', '현장 학습과 시뮬레이션 참여', '배운 것을 즉시 적용해보기'],
    },
    en: {
      icon: '🤸',
      title: 'Kinesthetic',
      subtitle: 'A learner who learns by doing',
      description: 'You learn most effectively through hands-on practice and direct experience.',
      tips: ['Use hands-on projects and role-play', 'Participate in field trips and simulations', 'Apply what you learn immediately'],
    },
    ja: {
      icon: '🤸',
      title: '体験型',
      subtitle: '経験で学ぶ学習者',
      description: '直接やってみることで最も効果的に学習します。',
      tips: ['実践プロジェクトやロールプレイを活用する', 'フィールドワークやシミュレーションに参加する', '学んだことをすぐに実践する'],
    },
  },
}

const QUESTIONS: Record<SupportedLang, Question[]> = {
  ko: [
    {
      id: 'q1',
      text: '새로운 도시에서 길을 찾을 때 나는...',
      options: [
        { type: 'visual', text: '지도나 GPS 화면을 보며 이동한다' },
        { type: 'auditory', text: '음성 안내를 듣거나 누군가에게 물어본다' },
        { type: 'reading', text: '목적지까지의 도로명과 방향을 글로 메모한다' },
        { type: 'kinesthetic', text: '일단 걸어 다니며 직접 감을 익힌다' },
      ],
    },
    {
      id: 'q2',
      text: '무언가를 배울 때 가장 효과적인 방법은?',
      options: [
        { type: 'visual', text: '도표, 다이어그램, 영상으로 보는 것' },
        { type: 'auditory', text: '강의, 팟캐스트, 누군가의 설명을 듣는 것' },
        { type: 'reading', text: '책이나 자료를 꼼꼼히 읽는 것' },
        { type: 'kinesthetic', text: '직접 해보거나 실습하는 것' },
      ],
    },
    {
      id: 'q3',
      text: '회의나 수업 중 집중을 유지하는 방법은?',
      options: [
        { type: 'visual', text: '발표자료나 칠판을 시각적으로 따라간다' },
        { type: 'auditory', text: '말하는 내용에 집중해서 듣는다' },
        { type: 'reading', text: '핵심 내용을 노트에 적는다' },
        { type: 'kinesthetic', text: '손으로 무언가를 만지작거리거나 움직인다' },
      ],
    },
    {
      id: 'q4',
      text: '새 스마트폰 사용법을 익힐 때...',
      options: [
        { type: 'visual', text: '설정 화면을 눈으로 보며 탐색한다' },
        { type: 'auditory', text: '유튜브 튜토리얼 영상의 설명을 듣는다' },
        { type: 'reading', text: '사용 설명서나 온라인 가이드를 읽는다' },
        { type: 'kinesthetic', text: '이것저것 직접 눌러보며 익힌다' },
      ],
    },
    {
      id: 'q5',
      text: '발표를 준비할 때 가장 도움이 되는 것은?',
      options: [
        { type: 'visual', text: '슬라이드에 이미지와 차트를 풍부하게 넣는다' },
        { type: 'auditory', text: '내용을 소리 내어 반복 연습한다' },
        { type: 'reading', text: '발표 원고를 꼼꼼히 작성하고 읽는다' },
        { type: 'kinesthetic', text: '실제 발표 상황처럼 서서 연습한다' },
      ],
    },
    {
      id: 'q6',
      text: '공부한 내용을 기억하는 방법은?',
      options: [
        { type: 'visual', text: '색깔 펜으로 마인드맵이나 도식을 만든다' },
        { type: 'auditory', text: '녹음해서 반복 듣거나 친구에게 설명한다' },
        { type: 'reading', text: '핵심 개념을 요약 정리해서 다시 읽는다' },
        { type: 'kinesthetic', text: '플래시카드를 만들거나 직접 써보며 익힌다' },
      ],
    },
    {
      id: 'q7',
      text: '복잡한 개념을 이해할 때...',
      options: [
        { type: 'visual', text: '그림이나 도식으로 표현하면 이해가 빠르다' },
        { type: 'auditory', text: '누군가 말로 설명해주면 금방 이해된다' },
        { type: 'reading', text: '글로 된 상세 설명을 읽으면 잘 이해된다' },
        { type: 'kinesthetic', text: '실제 예시나 사례를 경험해야 이해된다' },
      ],
    },
    {
      id: 'q8',
      text: '시험 공부를 할 때 선호하는 방법은?',
      options: [
        { type: 'visual', text: '핵심 내용을 도표나 그림으로 정리한다' },
        { type: 'auditory', text: '스터디 그룹에서 서로 설명하며 공부한다' },
        { type: 'reading', text: '교재와 노트를 반복해서 읽는다' },
        { type: 'kinesthetic', text: '문제를 풀거나 실습 위주로 공부한다' },
      ],
    },
    {
      id: 'q9',
      text: '낯선 주제에 대한 정보를 얻을 때...',
      options: [
        { type: 'visual', text: '인포그래픽이나 영상 자료를 찾는다' },
        { type: 'auditory', text: '전문가 강연이나 팟캐스트를 듣는다' },
        { type: 'reading', text: '관련 기사나 책을 찾아 읽는다' },
        { type: 'kinesthetic', text: '관련 체험 프로그램이나 워크숍에 참가한다' },
      ],
    },
    {
      id: 'q10',
      text: '친구에게 복잡한 개념을 설명할 때...',
      options: [
        { type: 'visual', text: '종이에 그림을 그려가며 설명한다' },
        { type: 'auditory', text: '말로 예를 들어가며 설명한다' },
        { type: 'reading', text: '메모나 글로 써서 보여준다' },
        { type: 'kinesthetic', text: '비슷한 경험이나 상황을 예로 든다' },
      ],
    },
    {
      id: 'q11',
      text: '좋아하는 취미 활동 유형은?',
      options: [
        { type: 'visual', text: '사진, 그림, 영화 감상' },
        { type: 'auditory', text: '음악 감상, 팟캐스트, 라디오' },
        { type: 'reading', text: '독서, 일기 쓰기, 블로그' },
        { type: 'kinesthetic', text: '요리, 스포츠, 손으로 만드는 것' },
      ],
    },
    {
      id: 'q12',
      text: '온라인 강의를 들을 때...',
      options: [
        { type: 'visual', text: '슬라이드와 자료 화면을 집중해서 본다' },
        { type: 'auditory', text: '강사의 목소리와 설명에 집중한다' },
        { type: 'reading', text: '자막이나 강의 노트를 읽으며 따라간다' },
        { type: 'kinesthetic', text: '강의 중간에 직접 실습 과제를 따라한다' },
      ],
    },
    {
      id: 'q13',
      text: '새로운 레시피로 요리할 때...',
      options: [
        { type: 'visual', text: '완성된 요리 사진을 보며 만든다' },
        { type: 'auditory', text: '요리 영상의 설명을 들으며 따라한다' },
        { type: 'reading', text: '단계별 레시피를 읽으며 진행한다' },
        { type: 'kinesthetic', text: '재료를 직접 맛보고 양을 조절하며 만든다' },
      ],
    },
    {
      id: 'q14',
      text: '기억이 잘 나는 정보 유형은?',
      options: [
        { type: 'visual', text: '색상이나 이미지와 함께 본 것' },
        { type: 'auditory', text: '누군가에게 직접 들은 것' },
        { type: 'reading', text: '글로 읽거나 직접 쓴 것' },
        { type: 'kinesthetic', text: '몸으로 경험하거나 실습한 것' },
      ],
    },
    {
      id: 'q15',
      text: '집중이 잘 되는 학습 환경은?',
      options: [
        { type: 'visual', text: '깔끔하고 정돈된 시각적 환경' },
        { type: 'auditory', text: '배경 음악이나 적당한 소리가 있는 곳' },
        { type: 'reading', text: '조용하고 필기 도구가 갖춰진 공간' },
        { type: 'kinesthetic', text: '걷거나 움직일 수 있는 공간' },
      ],
    },
    {
      id: 'q16',
      text: '새로운 게임이나 스포츠를 배울 때...',
      options: [
        { type: 'visual', text: '규칙 설명 영상을 먼저 본다' },
        { type: 'auditory', text: '경험자의 설명을 듣는다' },
        { type: 'reading', text: '규칙서나 설명서를 읽는다' },
        { type: 'kinesthetic', text: '일단 해보면서 배운다' },
      ],
    },
  ],
  en: [
    {
      id: 'q1',
      text: 'When finding your way in an unfamiliar city...',
      options: [
        { type: 'visual', text: 'I look at maps or the GPS screen' },
        { type: 'auditory', text: 'I use voice navigation or ask someone' },
        { type: 'reading', text: 'I write down street names and directions' },
        { type: 'kinesthetic', text: 'I wander around until I get a feel for it' },
      ],
    },
    {
      id: 'q2',
      text: 'What is the most effective way to learn something new?',
      options: [
        { type: 'visual', text: 'Seeing charts, diagrams, or videos' },
        { type: 'auditory', text: 'Listening to lectures, podcasts, or explanations' },
        { type: 'reading', text: 'Reading books or detailed materials' },
        { type: 'kinesthetic', text: 'Doing it hands-on or practicing' },
      ],
    },
    {
      id: 'q3',
      text: 'How do you stay focused during a meeting or class?',
      options: [
        { type: 'visual', text: 'I follow the slides or whiteboard visually' },
        { type: 'auditory', text: 'I focus on listening to what is being said' },
        { type: 'reading', text: 'I write down key points in my notes' },
        { type: 'kinesthetic', text: 'I fidget or move around slightly' },
      ],
    },
    {
      id: 'q4',
      text: 'When learning to use a new smartphone...',
      options: [
        { type: 'visual', text: 'I visually explore the settings screen' },
        { type: 'auditory', text: 'I watch YouTube tutorial explanations' },
        { type: 'reading', text: 'I read the manual or an online guide' },
        { type: 'kinesthetic', text: 'I tap around and figure it out by trying' },
      ],
    },
    {
      id: 'q5',
      text: 'What helps most when preparing a presentation?',
      options: [
        { type: 'visual', text: 'Adding lots of images and charts to slides' },
        { type: 'auditory', text: 'Practicing by saying the content aloud repeatedly' },
        { type: 'reading', text: 'Writing and reading a detailed script' },
        { type: 'kinesthetic', text: 'Standing and rehearsing as if it were real' },
      ],
    },
    {
      id: 'q6',
      text: 'How do you remember what you studied?',
      options: [
        { type: 'visual', text: 'Creating mind maps or diagrams with colored pens' },
        { type: 'auditory', text: 'Recording and replaying, or explaining to a friend' },
        { type: 'reading', text: 'Summarizing key concepts and re-reading them' },
        { type: 'kinesthetic', text: 'Making flashcards or writing things out by hand' },
      ],
    },
    {
      id: 'q7',
      text: 'When trying to understand a complex concept...',
      options: [
        { type: 'visual', text: 'Drawing or diagramming it helps me understand quickly' },
        { type: 'auditory', text: 'Someone explaining it verbally works best for me' },
        { type: 'reading', text: 'Reading a detailed written explanation works best' },
        { type: 'kinesthetic', text: 'I need to experience an actual example or case' },
      ],
    },
    {
      id: 'q8',
      text: 'What is your preferred way to study for an exam?',
      options: [
        { type: 'visual', text: 'Organizing key content into charts and diagrams' },
        { type: 'auditory', text: 'Explaining topics to each other in a study group' },
        { type: 'reading', text: 'Re-reading textbooks and notes repeatedly' },
        { type: 'kinesthetic', text: 'Solving practice problems or doing exercises' },
      ],
    },
    {
      id: 'q9',
      text: 'When gathering information on an unfamiliar topic...',
      options: [
        { type: 'visual', text: 'I search for infographics or video materials' },
        { type: 'auditory', text: 'I listen to expert talks or podcasts' },
        { type: 'reading', text: 'I read related articles or books' },
        { type: 'kinesthetic', text: 'I join a hands-on workshop or experience program' },
      ],
    },
    {
      id: 'q10',
      text: 'When explaining a complex concept to a friend...',
      options: [
        { type: 'visual', text: 'I draw diagrams on paper as I explain' },
        { type: 'auditory', text: 'I explain verbally using examples' },
        { type: 'reading', text: 'I write it down in a note to show them' },
        { type: 'kinesthetic', text: 'I use a similar experience or situation as an example' },
      ],
    },
    {
      id: 'q11',
      text: 'What type of hobby activities do you prefer?',
      options: [
        { type: 'visual', text: 'Photography, drawing, watching films' },
        { type: 'auditory', text: 'Listening to music, podcasts, or radio' },
        { type: 'reading', text: 'Reading, journaling, blogging' },
        { type: 'kinesthetic', text: 'Cooking, sports, making things by hand' },
      ],
    },
    {
      id: 'q12',
      text: 'When watching an online lecture...',
      options: [
        { type: 'visual', text: 'I focus closely on the slides and visual materials' },
        { type: 'auditory', text: 'I focus on the instructor\'s voice and explanations' },
        { type: 'reading', text: 'I follow along by reading subtitles or lecture notes' },
        { type: 'kinesthetic', text: 'I do the hands-on exercises mid-lecture' },
      ],
    },
    {
      id: 'q13',
      text: 'When cooking a new recipe...',
      options: [
        { type: 'visual', text: 'I look at a photo of the finished dish as I cook' },
        { type: 'auditory', text: 'I follow along while listening to a cooking video' },
        { type: 'reading', text: 'I read through each step of the recipe' },
        { type: 'kinesthetic', text: 'I taste and adjust as I go' },
      ],
    },
    {
      id: 'q14',
      text: 'What type of information do you remember best?',
      options: [
        { type: 'visual', text: 'Things I saw alongside colors or images' },
        { type: 'auditory', text: 'Things I heard directly from someone' },
        { type: 'reading', text: 'Things I read or wrote down myself' },
        { type: 'kinesthetic', text: 'Things I experienced or practiced physically' },
      ],
    },
    {
      id: 'q15',
      text: 'What kind of environment helps you concentrate best?',
      options: [
        { type: 'visual', text: 'A clean, tidy, visually organized space' },
        { type: 'auditory', text: 'A place with background music or ambient sound' },
        { type: 'reading', text: 'A quiet space with writing tools on hand' },
        { type: 'kinesthetic', text: 'A space where I can walk or move around' },
      ],
    },
    {
      id: 'q16',
      text: 'When learning a new game or sport...',
      options: [
        { type: 'visual', text: 'I watch a video explaining the rules first' },
        { type: 'auditory', text: 'I listen to an experienced player explain it' },
        { type: 'reading', text: 'I read the rulebook or instruction manual' },
        { type: 'kinesthetic', text: 'I just jump in and learn by doing' },
      ],
    },
  ],
  ja: [
    {
      id: 'q1',
      text: '見知らぬ街で道を探す時...',
      options: [
        { type: 'visual', text: '地図やGPS画面を見ながら移動する' },
        { type: 'auditory', text: '音声ガイドを聴くか、誰かに聞く' },
        { type: 'reading', text: '目的地までの道路名と方向をメモする' },
        { type: 'kinesthetic', text: 'とりあえず歩き回って感覚をつかむ' },
      ],
    },
    {
      id: 'q2',
      text: '何かを学ぶ時、最も効果的な方法は？',
      options: [
        { type: 'visual', text: '図表、ダイアグラム、動画で見る' },
        { type: 'auditory', text: '講義、ポッドキャスト、説明を聴く' },
        { type: 'reading', text: '本や資料をじっくり読む' },
        { type: 'kinesthetic', text: '直接やってみたり実践する' },
      ],
    },
    {
      id: 'q3',
      text: '会議や授業中に集中を保つ方法は？',
      options: [
        { type: 'visual', text: 'スライドや黒板を視覚的に追う' },
        { type: 'auditory', text: '話している内容に集中して聴く' },
        { type: 'reading', text: 'ノートに要点を書き取る' },
        { type: 'kinesthetic', text: '手で何かをいじったり、動かしたりする' },
      ],
    },
    {
      id: 'q4',
      text: '新しいスマートフォンの使い方を覚える時...',
      options: [
        { type: 'visual', text: '設定画面を目で見ながら探る' },
        { type: 'auditory', text: 'YouTubeチュートリアルの説明を聴く' },
        { type: 'reading', text: 'マニュアルやオンラインガイドを読む' },
        { type: 'kinesthetic', text: 'いろいろ直接タップして覚える' },
      ],
    },
    {
      id: 'q5',
      text: 'プレゼンを準備する時、最も役立つことは？',
      options: [
        { type: 'visual', text: 'スライドに画像やグラフを豊富に入れる' },
        { type: 'auditory', text: '内容を声に出して繰り返し練習する' },
        { type: 'reading', text: '発表原稿をしっかり書いて読む' },
        { type: 'kinesthetic', text: '実際の発表のように立って練習する' },
      ],
    },
    {
      id: 'q6',
      text: '勉強した内容を覚える方法は？',
      options: [
        { type: 'visual', text: 'カラーペンでマインドマップや図を作る' },
        { type: 'auditory', text: '録音して繰り返し聴くか、友人に説明する' },
        { type: 'reading', text: '重要な概念をまとめてもう一度読む' },
        { type: 'kinesthetic', text: 'フラッシュカードを作ったり、書いて覚える' },
      ],
    },
    {
      id: 'q7',
      text: '複雑な概念を理解する時...',
      options: [
        { type: 'visual', text: '絵や図で表現すると理解が早い' },
        { type: 'auditory', text: '誰かが言葉で説明してくれるとすぐ理解できる' },
        { type: 'reading', text: '文章での詳しい説明を読むとよく理解できる' },
        { type: 'kinesthetic', text: '実際の例や事例を体験しないと理解できない' },
      ],
    },
    {
      id: 'q8',
      text: '試験勉強をする時、好きな方法は？',
      options: [
        { type: 'visual', text: '重要な内容を図や表で整理する' },
        { type: 'auditory', text: 'スタディグループで互いに説明し合う' },
        { type: 'reading', text: '教科書やノートを繰り返し読む' },
        { type: 'kinesthetic', text: '問題を解いたり実践中心に勉強する' },
      ],
    },
    {
      id: 'q9',
      text: '知らないテーマについて情報を集める時...',
      options: [
        { type: 'visual', text: 'インフォグラフィックや動画を探す' },
        { type: 'auditory', text: '専門家の講演やポッドキャストを聴く' },
        { type: 'reading', text: '関連記事や本を探して読む' },
        { type: 'kinesthetic', text: '体験プログラムやワークショップに参加する' },
      ],
    },
    {
      id: 'q10',
      text: '友人に複雑な概念を説明する時...',
      options: [
        { type: 'visual', text: '紙に絵を描きながら説明する' },
        { type: 'auditory', text: '例を挙げながら口頭で説明する' },
        { type: 'reading', text: 'メモや文章を書いて見せる' },
        { type: 'kinesthetic', text: '似た経験や状況を例として使う' },
      ],
    },
    {
      id: 'q11',
      text: '好きな趣味の種類は？',
      options: [
        { type: 'visual', text: '写真、絵、映画鑑賞' },
        { type: 'auditory', text: '音楽鑑賞、ポッドキャスト、ラジオ' },
        { type: 'reading', text: '読書、日記、ブログ' },
        { type: 'kinesthetic', text: '料理、スポーツ、手作り' },
      ],
    },
    {
      id: 'q12',
      text: 'オンライン講義を受ける時...',
      options: [
        { type: 'visual', text: 'スライドと資料画面に集中して見る' },
        { type: 'auditory', text: '講師の声と説明に集中する' },
        { type: 'reading', text: '字幕や講義ノートを読みながら進める' },
        { type: 'kinesthetic', text: '講義の途中で直接実習課題をこなす' },
      ],
    },
    {
      id: 'q13',
      text: '新しいレシピで料理する時...',
      options: [
        { type: 'visual', text: '完成した料理の写真を見ながら作る' },
        { type: 'auditory', text: '料理動画の説明を聴きながら真似する' },
        { type: 'reading', text: 'ステップごとのレシピを読みながら進める' },
        { type: 'kinesthetic', text: '材料を直接味見して分量を調整しながら作る' },
      ],
    },
    {
      id: 'q14',
      text: 'よく覚えている情報のタイプは？',
      options: [
        { type: 'visual', text: '色やイメージと一緒に見たもの' },
        { type: 'auditory', text: '誰かから直接聞いたもの' },
        { type: 'reading', text: '文章で読んだり自分で書いたもの' },
        { type: 'kinesthetic', text: '体で経験したり実習したもの' },
      ],
    },
    {
      id: 'q15',
      text: '集中できる学習環境は？',
      options: [
        { type: 'visual', text: 'すっきりと整理された視覚的な環境' },
        { type: 'auditory', text: 'BGMや適度な音がある場所' },
        { type: 'reading', text: '静かで筆記用具が揃っている空間' },
        { type: 'kinesthetic', text: '歩いたり動いたりできる空間' },
      ],
    },
    {
      id: 'q16',
      text: '新しいゲームやスポーツを学ぶ時...',
      options: [
        { type: 'visual', text: 'ルール説明動画をまず見る' },
        { type: 'auditory', text: '経験者の説明を聴く' },
        { type: 'reading', text: 'ルールブックや説明書を読む' },
        { type: 'kinesthetic', text: 'とりあえずやってみながら覚える' },
      ],
    },
  ],
}

const STYLE_COLORS: Record<StyleType, string> = {
  visual: '#10b981',
  auditory: '#3b82f6',
  reading: '#8b5cf6',
  kinesthetic: '#f59e0b',
}

const STYLE_ORDER: StyleType[] = ['visual', 'auditory', 'reading', 'kinesthetic']

interface Props { locale?: string }

export default function LearningStyleTest({ locale: lp = 'ko' }: Props) {
  const l = lang(lp ?? 'ko')
  const lb = LABELS[l]
  const questions = QUESTIONS[l]

  const [current, setCurrent] = useState(0)
  const [scores, setScores] = useState<Record<StyleType, number>>({ visual: 0, auditory: 0, reading: 0, kinesthetic: 0 })
  const [done, setDone] = useState(false)

  function pick(type: StyleType) {
    const next = { ...scores, [type]: scores[type] + 1 }
    if (current + 1 >= questions.length) {
      setScores(next)
      setDone(true)
    } else {
      setScores(next)
      setCurrent(current + 1)
    }
  }

  function restart() {
    setScores({ visual: 0, auditory: 0, reading: 0, kinesthetic: 0 })
    setCurrent(0)
    setDone(false)
  }

  function share() {
    const dominant = STYLE_ORDER.reduce((a, b) => scores[a] >= scores[b] ? a : b)
    const url = window.location.href
    const text = `${lb.shareMsg} — ${STYLE_RESULTS[dominant][l].title}`
    if (navigator.share) navigator.share({ title: lb.title, text, url })
    else navigator.clipboard.writeText(url)
  }

  if (!done) {
    const q = questions[current]
    const progress = Math.round((current / questions.length) * 100)
    return (
      <div className="space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold">{lb.title}</h1>
          <p className="text-muted-foreground text-sm">{lb.subtitle}</p>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{lb.questionOf(current + 1, questions.length)}</span>
            <span>{progress}%</span>
          </div>
          <div
            className="h-2 rounded-full bg-muted overflow-hidden"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={lb.questionOf(current + 1, questions.length)}
          >
            <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="rounded-xl border bg-card p-6 text-center">
          <p className="text-lg font-bold">{q.text}</p>
        </div>
        <div className="grid gap-2">
          {q.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => pick(opt.type)}
              aria-label={opt.text}
              className="w-full rounded-xl border bg-card px-4 py-3 text-left text-sm hover:bg-accent hover:border-emerald-400 transition-colors flex items-center gap-3"
            >
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-none"
                style={{ backgroundColor: STYLE_COLORS[opt.type] }}
              >
                {opt.type[0].toUpperCase()}
              </span>
              {opt.text}
            </button>
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground">{lb.note}</p>
      </div>
    )
  }

  const dominant = STYLE_ORDER.reduce((a, b) => scores[a] >= scores[b] ? a : b)
  const total = questions.length

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">{lb.yourStyle}</p>
        <div
          className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-xl font-bold text-white"
          style={{ backgroundColor: STYLE_COLORS[dominant] }}
        >
          <span>{STYLE_RESULTS[dominant][l].icon}</span>
          <span>{STYLE_RESULTS[dominant][l].title}</span>
          <span className="text-sm font-normal opacity-80">({lb.dominant})</span>
        </div>
        <p className="font-bold text-muted-foreground">{STYLE_RESULTS[dominant][l].subtitle}</p>
        <p className="text-sm text-muted-foreground leading-relaxed">{STYLE_RESULTS[dominant][l].description}</p>
      </div>

      <div className="rounded-xl border bg-card p-4 space-y-3">
        <h3 className="font-bold text-sm">{lb.yourProfile}</h3>
        {STYLE_ORDER.map(s => {
          const pct = Math.round((scores[s] / total) * 100)
          return (
            <div key={s} className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold" style={{ color: STYLE_COLORS[s] }}>
                  {STYLE_RESULTS[s][l].icon} {lb.styleNames[s]}
                </span>
                <span className="text-muted-foreground">{scores[s]} / {total}</span>
              </div>
              <div
                className="h-2 rounded-full bg-muted overflow-hidden"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={lb.styleNames[s]}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: STYLE_COLORS[s] }}
                />
              </div>
            </div>
          )
        })}
      </div>

      <div className="rounded-xl border bg-card p-4 space-y-2">
        <h3 className="font-bold text-sm text-emerald-600">{lb.recommendation}</h3>
        <ul className="space-y-1">
          {STYLE_RESULTS[dominant][l].tips.map(tip => (
            <li key={tip} className="text-sm text-muted-foreground flex gap-2">
              <span className="text-emerald-500">→</span>{tip}
            </li>
          ))}
        </ul>
      </div>

      <p className="text-center text-xs text-muted-foreground">{lb.note}</p>
      <div className="flex gap-3">
        <button
          onClick={restart}
          aria-label={lb.restart}
          className="flex-1 rounded-xl border bg-card px-4 py-2 text-sm font-bold hover:bg-accent transition-colors"
        >
          {lb.restart}
        </button>
        <button
          onClick={share}
          aria-label={lb.share}
          className="flex-1 rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm font-bold hover:opacity-90 transition-opacity"
        >
          {lb.share}
        </button>
      </div>
    </div>
  )
}
