import type { Locale } from "../lib/i18n";

type Copy = Record<Locale, string>;

export interface OriginalGameRelease {
  slug: string;
  prototype: string;
  name: Copy;
  title: Copy;
  description: Copy;
  controls: Copy;
}

const names = (ko: string, en: string, ja: string, zh: string, fr: string, es: string): Copy => ({ ko, en, ja, zh, fr, es });

export const ORIGINAL_GAME_RELEASES: Record<string, OriginalGameRelease> = {
  "one-room-spaceship": {
    slug: "one-room-spaceship", prototype: "one-room-spaceship.html",
    name: names("한 칸짜리 우주선", "One-Room Spaceship", "ワンルーム宇宙船", "单舱飞船", "Vaisseau une pièce", "Nave de una habitación"),
    title: names("한 칸짜리 우주선 — 둘이서 운용하는 생존 항해", "One-Room Spaceship — A Two-Pilot Survival Voyage", "ワンルーム宇宙船 — 二人で挑む生存航海", "单舱飞船 — 双人协作生存航行", "Vaisseau une pièce — Survie à deux pilotes", "Nave de una habitación — Supervivencia para dos"),
    description: names("한 공간의 네 계통을 나눠 맡고 사고를 수습해 고향까지 항해하는 협동 우주선 게임.", "Share four ship systems, resolve incidents, and make it home in this cooperative voyage.", "4つの船内系統を分担し、事故を解決して故郷を目指す協力航海ゲーム。", "分管四套飞船系统、处理事故并返回家园的合作航行游戏。", "Partagez quatre systèmes, gérez les incidents et ramenez le vaisseau au foyer.", "Reparte cuatro sistemas, resuelve incidentes y lleva la nave de vuelta a casa."),
    controls: names("버튼 또는 키보드로 계통을 맡고 출항하세요.", "Use the controls or keyboard to assign systems and launch.", "ボタンまたはキーボードで系統を担当し出航します。", "使用按钮或键盘分配系统并起航。", "Utilisez les commandes ou le clavier pour répartir les systèmes et décoller.", "Usa los controles o el teclado para repartir sistemas y despegar."),
  },
  "rumor-network": {
    slug: "rumor-network", prototype: "rumor-network.html",
    name: names("소문 네트워크", "Rumor Network", "うわさネットワーク", "传言网络", "Réseau de rumeurs", "Red de rumores"),
    title: names("소문 네트워크 — 왜곡을 추적하는 정보 퍼즐", "Rumor Network — Trace the Distortion", "うわさネットワーク — 歪みを追う情報パズル", "传言网络 — 追踪信息失真", "Réseau de rumeurs — Traquez la déformation", "Red de rumores — Sigue la distorsión"),
    description: names("사람을 거칠 때마다 달라지는 메시지를 추적하고 제한된 예산으로 진실을 복원하세요.", "Track how a message changes from person to person and restore the truth on a limited budget.", "人から人へ変わるメッセージを追い、限られた予算で真実を復元します。", "追踪消息在人际传播中的变化，并用有限预算还原真相。", "Suivez les mutations d'un message et restaurez la vérité avec un budget limité.", "Sigue cómo cambia un mensaje y restaura la verdad con un presupuesto limitado."),
    controls: names("인물과 대응 행동을 선택해 전파 경로를 관리하세요.", "Choose contacts and interventions to manage the route.", "人物と対応を選び伝播経路を管理します。", "选择人物和应对方式来管理传播路径。", "Choisissez les contacts et les interventions pour gérer le parcours.", "Elige contactos e intervenciones para gestionar la ruta."),
  },
  "echo-shift": {
    slug: "echo-shift", prototype: "echo-shift.html",
    name: names("에코 시프트", "Echo Shift", "エコーシフト", "回声移位", "Décalage d'écho", "Cambio de eco"),
    title: names("에코 시프트 — 소리로 보는 잠입 작전", "Echo Shift — See Through Sound", "エコーシフト — 音で見る潜入作戦", "回声移位 — 用声音看见", "Décalage d'écho — Voir par le son", "Cambio de eco — Ver con sonido"),
    description: names("빛 없는 시설에서 음파를 보내 지형과 위협을 읽고 유물을 회수하는 잠입 게임.", "Send sound pulses through a dark facility, read the echoes, and recover the relic.", "暗闇の施設で音波を放ち、地形と脅威を読み取って秘宝を回収します。", "在黑暗设施中发出声波、读取回声并取回遗物。", "Émettez des impulsions dans un complexe obscur, lisez les échos et récupérez la relique.", "Emite pulsos en una instalación oscura, interpreta los ecos y recupera la reliquia."),
    controls: names("방향키로 이동하고 약한·강한 음파를 선택하세요.", "Move with arrow keys and choose soft or loud pulses.", "方向キーで移動し、弱音波か強音波を選びます。", "使用方向键移动，并选择弱或强声波。", "Déplacez-vous avec les flèches et choisissez une impulsion faible ou forte.", "Muévete con las flechas y elige pulsos suaves o fuertes."),
  },
  "foldworld-delivery": {
    slug: "foldworld-delivery", prototype: "foldworld-delivery.html",
    name: names("폴드월드 택배", "Foldworld Delivery", "フォールドワールド便", "折叠世界快递", "Livraison pliée", "Reparto plegado"),
    title: names("폴드월드 택배 — 지도를 접어 길을 만드는 퍼즐", "Foldworld Delivery — Fold the Map, Make the Route", "フォールドワールド便 — 地図を折って道を作る", "折叠世界快递 — 折地图造路线", "Livraison pliée — Pliez la carte", "Reparto plegado — Pliega el mapa"),
    description: names("평면 지도를 접어 멀리 떨어진 칸을 연결하고 화물을 목적지까지 배달하세요.", "Fold a flat map to connect distant tiles and deliver the parcel.", "平面地図を折って離れたマスをつなぎ、荷物を届けます。", "折叠平面地图连接远处格子，把货物送达目的地。", "Pliez la carte pour relier des cases éloignées et livrer le colis.", "Pliega el mapa para conectar casillas lejanas y entregar la carga."),
    controls: names("방향키로 이동하고 접기·겹친 칸 이동을 사용하세요.", "Move with arrows, then fold and cross between matched tiles.", "方向キーで移動し、折りと重なり移動を使います。", "使用方向键移动，再折叠并跨越重合格。", "Déplacez-vous, pliez puis traversez les cases superposées.", "Muévete, pliega y cruza entre casillas superpuestas."),
  },
  "living-maze": {
    slug: "living-maze", prototype: "living-maze.html",
    name: names("살아 있는 미로", "Living Maze", "生きている迷路", "活体迷宫", "Labyrinthe vivant", "Laberinto vivo"),
    title: names("살아 있는 미로 — 벽과 협상하는 탈출 퍼즐", "Living Maze — Negotiate With the Walls", "生きている迷路 — 壁と交渉する脱出", "活体迷宫 — 与墙协商逃生", "Labyrinthe vivant — Négociez avec les murs", "Laberinto vivo — Negocia con los muros"),
    description: names("빛과 침착함을 관리하며 살아 있는 문을 관찰하고 설득해 출구를 찾으세요.", "Manage light and stress while observing and persuading living gates on the way out.", "光と平静を管理し、生きた扉を観察・説得して出口を探します。", "管理光亮与压力，观察并说服活门以找到出口。", "Gérez lumière et stress, observez les portes vivantes et persuadez-les.", "Gestiona luz y estrés, observa las puertas vivas y convéncelas."),
    controls: names("방향키로 이동하고 문 앞에서 관찰·제안·기다리기를 선택하세요.", "Move with arrows and choose how to approach each living gate.", "方向キーで移動し、扉の前で接し方を選びます。", "使用方向键移动，并在活门前选择行动。", "Déplacez-vous avec les flèches et choisissez votre approche devant chaque porte.", "Muévete con las flechas y elige cómo tratar cada puerta."),
  },
  "orbit-gardener": {
    slug: "orbit-gardener", prototype: "orbit-gardener.html",
    name: names("궤도 정원사", "Orbit Gardener", "軌道庭師", "轨道园丁", "Jardinier orbital", "Jardinero orbital"),
    title: names("궤도 정원사 — 꽃으로 궤도를 조율하는 우주 정원", "Orbit Gardener — Tune Orbits With Flowers", "軌道庭師 — 花で軌道を整える宇宙庭園", "轨道园丁 — 用花朵调节轨道", "Jardinier orbital — Réglez les orbites avec des fleurs", "Jardinero orbital — Ajusta órbitas con flores"),
    description: names("세 행성에 꽃을 심고 가지치기하며 생명력과 최소 궤도 간격을 함께 지키세요.", "Plant and prune flowers across three planets while protecting both health and orbital spacing.", "3つの惑星で花を植え剪定し、生命力と最小軌道間隔を同時に守ります。", "在三颗行星上种花和修剪，同时维持生命值与最小轨道间距。", "Plantez et taillez sur trois planètes tout en préservant santé et écart orbital.", "Planta y poda flores en tres planetas manteniendo la salud y la separación orbital."),
    controls: names("행성을 골라 꽃을 심거나 가지치기한 뒤 하루를 진행하세요.", "Choose a planet, plant or prune, then advance one day.", "惑星を選び、植えるか剪定してから一日進めます。", "选择行星，种花或修剪，然后推进一天。", "Choisissez une planète, plantez ou taillez, puis avancez d'un jour.", "Elige un planeta, planta o poda y avanza un día."),
  },
  "disaster-control": {
    slug: "disaster-control", prototype: "disaster-control.html",
    name: names("재난 관제실", "Disaster Control", "災害管制室", "灾害控制室", "Centre de crise", "Control de desastres"),
    title: names("재난 관제실 — 동시에 무너지는 도시를 지켜라", "Disaster Control — Hold a City Together", "災害管制室 — 崩れる都市を守れ", "灾害控制室 — 守住崩溃中的城市", "Centre de crise — Maintenez la ville debout", "Control de desastres — Mantén la ciudad en pie"),
    description: names("한정된 구조대를 배치해 여러 구역의 화재·침수·붕괴를 동시에 통제하세요.", "Deploy limited response crews to control fire, flooding, and collapse across the city.", "限られた救助隊を配置し、火災・浸水・崩壊を同時に制御します。", "部署有限救援队，同时控制城区火灾、洪水与坍塌。", "Déployez des équipes limitées contre incendies, inondations et effondrements.", "Despliega equipos limitados contra incendios, inundaciones y derrumbes."),
    controls: names("구역을 고르고 구조대 행동을 배정한 뒤 다음 단계를 실행하세요.", "Select a district, assign crew actions, then advance the crisis.", "区域を選び救助隊の行動を割り当てて危機を進めます。", "选择区域、分配救援行动并推进灾情。", "Choisissez un quartier, affectez les équipes puis avancez la crise.", "Elige un distrito, asigna equipos y avanza la crisis."),
  },
  "whale-city": {
    slug: "whale-city", prototype: "whale-city.html",
    name: names("고래 위의 도시", "City on a Whale", "クジラの上の街", "鲸背之城", "La ville sur la baleine", "La ciudad sobre la ballena"),
    title: names("고래 위의 도시 — 파도 위의 생존 도시", "City on a Whale — A Settlement Above the Waves", "クジラの上の街 — 波上の生存都市", "鲸背之城 — 浪尖上的生存城市", "La ville sur la baleine — Une cité sur les vagues", "La ciudad sobre la ballena — Una ciudad sobre las olas"),
    description: names("고래의 움직임과 파도를 예측해 건물을 옮기고 주민을 항구까지 지키세요.", "Read the whale and the waves, move buildings, and protect every resident to harbor.", "クジラと波を読み、建物を移して住民を港まで守ります。", "预判鲸鱼与海浪、移动建筑并保护居民抵达港口。", "Lisez la baleine et les vagues, déplacez les bâtiments et protégez les habitants.", "Lee a la ballena y las olas, mueve edificios y protege a sus habitantes."),
    controls: names("건물을 선택해 안전한 칸으로 옮기고 파도 전 행동을 결정하세요.", "Select buildings, move them to safety, and prepare before each wave.", "建物を選び安全なマスへ移し、波の前に備えます。", "选择建筑移至安全格，并在每次海浪前做好准备。", "Sélectionnez les bâtiments, mettez-les à l'abri et préparez chaque vague.", "Selecciona edificios, ponlos a salvo y prepárate antes de cada ola."),
  },
};
