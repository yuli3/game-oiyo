// 게임별 가이드/유래/FAQ — SEO·AIEO 콘텐츠 레이어 (GameGuide.astro가 렌더+JSON-LD 발행).
// 6로케일 필수. 항목이 없는 게임은 섹션이 렌더되지 않는다(점진 확충).
import type { Locale } from "../lib/i18n";

export interface GameGuide {
  origin: Record<Locale, string>;   // 유래·역사 1-2문장
  how: Record<Locale, string>;      // 하는 법 1-2문장
  faqs: { q: Record<Locale, string>; a: Record<Locale, string> }[];
  rules?: Record<Locale, string[]>; // 교육용 상세 룰 (주로 카드게임)
  // 관련 읽을거리(패밀리 내 교차링크). 로케일별로 **타깃이 실재할 때만** 넣는다.
  // 없는 로케일에 링크하면 404가 되고 Weekly Link Audit이 깨진다.
  related?: Partial<Record<Locale, { href: string; label: string }[]>>;
}

export const GAME_GUIDES: Record<string, GameGuide> = {
  "mallow-isle": {
    origin: {
      ko: "Mallow Isle는 편안한 섬 생활과 손으로 만지는 듯한 지형 꾸미기를 한 장면에 담은 OIYO 오리지널 3D 브라우저 게임입니다. 섬, 동물, 식물, 구름과 음악은 외부 게임 에셋이나 음원 없이 절차적으로 구성됩니다.",
      en: "Mallow Isle is an original OIYO 3D browser game that brings gentle island life and tactile terrain decorating into one peaceful scene. Its island, animals, plants, clouds and music are procedural, with no external game assets or recordings.",
      ja: "Mallow Isleは、穏やかな島生活と手触りのある地形づくりを一つの風景にまとめたOIYOオリジナルの3Dブラウザゲームです。島・動物・植物・雲・音楽は外部素材や音源なしでプロシージャルに構成されます。",
      zh: "Mallow Isle 是 OIYO 原创3D浏览器游戏，把宁静岛屿生活与触感式地形布置融为一体。岛屿、动物、植物、云朵与音乐均为程序生成，不使用外部游戏素材或录音。",
      fr: "Mallow Isle est un jeu 3D original d'OIYO qui réunit vie insulaire paisible et modelage tactile du terrain. Île, animaux, plantes, nuages et musique sont procéduraux, sans ressources de jeu ni enregistrements externes.",
      es: "Mallow Isle es un juego 3D original de OIYO que une vida isleña tranquila y modelado táctil del terreno. Isla, animales, plantas, nubes y música son procedurales, sin recursos ni grabaciones externas.",
    },
    how: {
      ko: "산책 도구에서는 WASD나 화살표로 토끼를 움직이고 드래그로 낮은 3인칭 카메라를 돌립니다. 올리기·내리기는 땅을 누르거나 드래그해 지형을 빚고, 나무·꽃·벤치는 원하는 풀밭을 눌러 배치합니다. 포근함 100%의 나만의 섬을 만들어보세요.",
      en: "With Roam selected, move the rabbit using WASD or arrows and drag to turn the low third-person camera. Raise and Lower sculpt while you press or drag; Tree, Flowers and Bench place a decoration on open grass. Shape your own island toward 100% Cozy.",
      ja: "散歩ではWASDまたは矢印でうさぎを動かし、ドラッグで低い三人称カメラを回します。盛る・下げるは押すかドラッグして地形を作り、木・花・ベンチは空いた草地を押して配置します。居心地100%の島を作りましょう。",
      zh: "选择散步后，用WASD或方向键移动小兔，拖动旋转低位第三人称镜头。抬高与压低可在按住或拖动时塑造地形；树木、鲜花与长椅可放在空草地上。把自己的岛屿布置到100%温馨吧。",
      fr: "En mode Flâner, déplacez le lapin avec ZQSD ou les flèches et glissez pour tourner la caméra basse. Monter et Baisser sculptent en appuyant ou glissant ; Arbre, Fleurs et Banc se posent sur l'herbe libre. Créez votre île jusqu'à 100 % de douceur.",
      es: "Con Pasear seleccionado, mueve el conejo con WASD o flechas y arrastra para girar la cámara baja. Elevar y Bajar moldean al pulsar o arrastrar; Árbol, Flores y Banco se colocan en césped libre. Lleva tu isla al 100 % de calidez.",
    },
    rules: {
      ko: [
        "해안선은 파도와 이동 경계를 안정적으로 유지하기 위해 지형 도구로 바꿀 수 없습니다.",
        "나무·꽃·벤치는 서로 겹치지 않도록 종류별 최소 간격을 지키며 최대 72개까지 둘 수 있습니다.",
        "토끼와 카메라는 현재 지형 높이를 실시간으로 따라가므로 방금 만든 언덕도 바로 걸어 오를 수 있습니다.",
        "포근함은 장식 종류와 지형을 빚은 횟수로 올라가며 경쟁 점수나 제한 시간은 없습니다.",
        "모든 꾸미기는 독립 localStorage 키에 자동 저장됩니다. 계정, 서버 저장, 실제 화폐는 없습니다.",
      ],
      en: [
        "The shoreline cannot be sculpted so the waves and player boundary remain stable.",
        "Trees, flowers and benches keep type-specific spacing, cannot overlap and are capped at 72 decorations.",
        "The rabbit and camera follow current terrain height in real time, so newly shaped hills are immediately walkable.",
        "Cozy rises with decoration types and terrain shaping. There is no competitive score or time limit.",
        "Every change auto-saves to an independent localStorage key. There is no account, server save or real currency.",
      ],
      ja: [
        "波と移動範囲を安定させるため、島の海岸線は地形道具で変更できません。",
        "木・花・ベンチは種類ごとの間隔を保ち、重ねて置けません。飾りは最大72個です。",
        "うさぎとカメラは現在の地形高をリアルタイムで追うため、作ったばかりの丘にもすぐ登れます。",
        "居心地は飾りの種類と地形を作った回数で上昇。競争スコアや制限時間はありません。",
        "変更は独立localStorageキーに自動保存。アカウント、サーバー保存、実通貨はありません。",
      ],
      zh: [
        "为保持浪花与移动边界稳定，海岸线不能用地形工具修改。",
        "树木、鲜花与长椅按类型保持最小间距，不能重叠，最多可放72件装饰。",
        "小兔与镜头会实时跟随地形高度，因此刚塑造的山丘也能立即走上去。",
        "温馨度随装饰类型与塑造地形次数提高，没有竞技分数或时间限制。",
        "所有修改只自动保存到独立localStorage键。没有账号、服务器存档或真实货币。",
      ],
      fr: [
        "Le rivage n'est pas sculptable afin de préserver les vagues et la limite de déplacement.",
        "Arbres, fleurs et bancs respectent leur espacement, ne se chevauchent pas et sont limités à 72 décorations.",
        "Le lapin et la caméra suivent la hauteur du terrain en direct : toute nouvelle colline est aussitôt praticable.",
        "La douceur augmente avec les décorations et le modelage. Il n'y a ni score compétitif ni limite de temps.",
        "Chaque changement est sauvegardé dans une clé localStorage indépendante. Aucun compte, serveur ou argent réel.",
      ],
      es: [
        "La costa no se puede moldear para mantener estables las olas y el límite de movimiento.",
        "Árboles, flores y bancos respetan su separación, no se solapan y están limitados a 72 adornos.",
        "El conejo y la cámara siguen la altura del terreno en tiempo real; las colinas nuevas se recorren al instante.",
        "La calidez sube con los adornos y el modelado. No hay puntuación competitiva ni límite de tiempo.",
        "Cada cambio se guarda en una clave localStorage independiente. No hay cuenta, servidor ni dinero real.",
      ],
    },
    faqs: [
      {
        q: {
          ko: "섬 꾸미기는 다음에 다시 와도 남아 있나요?", en: "Will my island still be here when I return?", ja: "島の飾り付けは次に来ても残りますか？",
          zh: "下次回来时岛屿布置还会保留吗？", fr: "Mon île sera-t-elle conservée à mon retour ?", es: "¿Seguirá aquí mi isla cuando vuelva?",
        },
        a: {
          ko: "네. 지형과 장식은 이 브라우저의 전용 저장 공간에 자동 저장됩니다. 다른 기기로는 옮겨지지 않으며 브라우저 데이터를 지우면 사라집니다.",
          en: "Yes. Terrain and decorations auto-save to dedicated storage in this browser. They do not transfer to another device and disappear if browser data is cleared.",
          ja: "はい。地形と飾りは、このブラウザの専用領域に自動保存されます。別端末には移らず、ブラウザデータを消すと失われます。",
          zh: "会。地形与装饰会自动保存在本浏览器的专用空间中，不会同步到其他设备；清除浏览器数据后会消失。",
          fr: "Oui. Relief et décorations sont sauvegardés dans ce navigateur. Ils ne passent pas sur un autre appareil et disparaissent si ses données sont effacées.",
          es: "Sí. El relieve y los adornos se guardan en este navegador. No pasan a otro dispositivo y desaparecen al borrar sus datos.",
        },
      },
      {
        q: {
          ko: "lo-fi 음악은 외부 음원인가요?", en: "Does the lo-fi music stream an external recording?", ja: "lo-fi音楽は外部音源ですか？",
          zh: "lo-fi 音乐会播放外部录音吗？", fr: "La lo-fi diffuse-t-elle un enregistrement externe ?", es: "¿La música lo-fi usa una grabación externa?",
        },
        a: {
          ko: "아니요. 잔잔한 코드, 바람과 새소리를 Web Audio로 기기에서 실시간 합성합니다. 소리 버튼으로 언제든 끌 수 있습니다.",
          en: "No. Soft chords, breeze and bird chirps are synthesized in real time on your device with Web Audio and can be muted at any time.",
          ja: "いいえ。穏やかなコード、風、鳥の声をWeb Audioで端末上にリアルタイム合成し、いつでも停止できます。",
          zh: "不会。柔和和弦、风声与鸟鸣会通过 Web Audio 在设备上实时合成，也可随时关闭。",
          fr: "Non. Accords doux, souffle et oiseaux sont synthétisés en direct sur votre appareil via Web Audio et peuvent être coupés.",
          es: "No. Acordes suaves, brisa y pájaros se sintetizan en tiempo real en tu dispositivo con Web Audio y se pueden silenciar.",
        },
      },
    ],
  },
  "isometric-city": {
    origin: {
      ko: "Isometric City는 고전 도시 건설 시뮬레이션의 구역·교통·예산 관리 구조를 가벼운 브라우저 3D로 재해석한 OIYO 오리지널 게임입니다. 건물, 시민, 차량, 날씨는 외부 게임 에셋 없이 절차적으로 구성됩니다.",
      en: "Isometric City is an original OIYO game that reinterprets the zoning, transport and budget systems of classic city-building simulations as lightweight browser 3D. Buildings, citizens, vehicles and weather are procedural, with no external game assets.",
      ja: "Isometric Cityは、古典的な都市建設シミュレーションの区画・交通・予算管理を軽量なブラウザ3Dとして再構成したOIYOオリジナルゲームです。建物・市民・車両・天候は外部ゲーム素材なしでプロシージャルに生成されます。",
      zh: "Isometric City 是 OIYO 原创游戏，把经典城市建造模拟的分区、交通与预算系统重新诠释为轻量浏览器3D。建筑、市民、车辆和天气均为程序生成，不使用外部游戏素材。",
      fr: "Isometric City est un jeu original d'OIYO qui réinterprète en 3D légère pour navigateur les systèmes de zonage, transport et budget des city builders classiques. Bâtiments, habitants, véhicules et météo sont procéduraux, sans ressources de jeux externes.",
      es: "Isometric City es un juego original de OIYO que reinterpreta en 3D ligera para navegador los sistemas de zonificación, transporte y presupuesto de los city builders clásicos. Edificios, habitantes, vehículos y clima son procedurales, sin recursos externos.",
    },
    how: {
      ko: "하단 도구에서 도로·주거·상업·공원·공공·전력을 고르고 격자를 클릭해 배치합니다. 건물은 도로 옆에만 지을 수 있습니다. 인구 수용력, 일자리, 전력, 행복도와 시간당 수지를 맞추고 건물을 3레벨까지 업그레이드하세요.",
      en: "Choose roads, homes, commerce, parks, civic services or power from the toolbar and click the grid to place them. Buildings need road frontage. Balance population capacity, jobs, power, happiness and hourly cash flow, then upgrade buildings to level three.",
      ja: "下のツールから道路・住宅・商業・公園・公共・電力を選び、グリッドをクリックして配置します。建物は道路沿いにのみ建設可能。人口容量、雇用、電力、幸福度、時間収支を整え、建物をレベル3まで強化しましょう。",
      zh: "从底部工具栏选择道路、住宅、商业、公园、公共或电力，再点击网格放置。建筑必须临近道路。平衡人口容量、岗位、电力、幸福度与每小时现金流，并把建筑升级到3级。",
      fr: "Choisissez routes, logements, commerces, parcs, services publics ou énergie dans la barre, puis cliquez sur la grille. Les bâtiments doivent border une route. Équilibrez capacité, emplois, énergie, bonheur et trésorerie horaire, puis améliorez jusqu'au niveau 3.",
      es: "Elige carreteras, viviendas, comercios, parques, servicios o energía y haz clic en la cuadrícula. Los edificios necesitan acceso vial. Equilibra capacidad, empleo, energía, felicidad y flujo horario, y mejora hasta el nivel 3.",
    },
    rules: {
      ko: [
        "주거는 인구 수용력을, 상업·공공·전력 시설은 일자리를 만듭니다. 일자리와 수용력 중 부족한 쪽이 성장 상한이 됩니다.",
        "전력 공급률이 100% 아래로 내려가면 인구 성장과 행복도가 떨어집니다. 전력 시설은 많은 공급량 대신 유지비가 큽니다.",
        "공원과 공공 시설은 행복도를 올리지만 시간당 유지비가 듭니다. 수입은 실제 거주 인구와 채워진 일자리에서 발생합니다.",
        "차량과 보행자는 현재 도로망에서 A* 경로를 다시 계산합니다. 도로가 끊기면 연결 도로 수와 이동 경로가 즉시 바뀝니다.",
        "게임 시간은 자동으로 흐르며 날씨가 세 시간 단위로 바뀔 수 있습니다. 일시정지·일반·4배속과 낮/밤 이동을 사용할 수 있습니다.",
        "도시는 독립 키를 사용해 localStorage에만 자동 저장됩니다. 계정, 서버 저장, 실제 화폐는 없습니다.",
      ],
      en: [
        "Homes create population capacity; commerce, civic services and power create jobs. Whichever of jobs or capacity is scarcer limits growth.",
        "When power coverage falls below 100%, growth and happiness drop. Power facilities add substantial supply but carry higher upkeep.",
        "Parks and civic buildings lift happiness but cost hourly upkeep. Revenue comes from actual residents and filled jobs.",
        "Vehicles and pedestrians recalculate A* routes on the current road graph. Breaking a road changes connected-road counts and mobility immediately.",
        "Game time flows automatically and weather can change every three in-game hours. Pause, normal, 4× speed and day/night jumps are available.",
        "The city auto-saves only to a dedicated localStorage key. There is no account, server save or real currency.",
      ],
      ja: [
        "住宅は人口容量を、商業・公共・電力施設は雇用を生みます。雇用と容量の不足する側が成長上限です。",
        "電力供給率が100%を下回ると成長と幸福度が低下。発電施設は大きな供給力と引き換えに維持費が高くなります。",
        "公園と公共施設は幸福度を上げますが時間維持費が必要。収入は実際の居住人口と充足した雇用から生まれます。",
        "車両と歩行者は現在の道路グラフでA*経路を再計算。道路を切ると接続数と移動が即座に変わります。",
        "時間は自動進行し、天候はゲーム内3時間ごとに変化し得ます。一時停止・通常・4倍速と昼夜移動が可能です。",
        "都市は専用localStorageキーだけに自動保存。アカウント、サーバー保存、実通貨はありません。",
      ],
      zh: [
        "住宅提供人口容量，商业、公共与电力设施创造岗位。岗位与容量中较少的一项会限制增长。",
        "电力覆盖低于100%时，增长和幸福度会下降。电力设施供应量大，但维护费也更高。",
        "公园与公共建筑提高幸福度，但产生每小时维护费。收入来自实际居民与已填补岗位。",
        "车辆和行人会在当前道路图上重新计算A*路径。切断道路会立即改变连通道路数与出行路线。",
        "游戏时间自动流逝，天气可能每三个游戏小时变化。支持暂停、正常、4倍速与昼夜跳转。",
        "城市仅使用独立localStorage键自动保存。没有账号、服务器存档或真实货币。",
      ],
      fr: [
        "Les logements créent de la capacité ; commerce, services publics et énergie créent des emplois. Le plus rare des deux limite la croissance.",
        "Sous 100 % d'alimentation, croissance et bonheur diminuent. Les centrales fournissent beaucoup mais coûtent davantage en entretien.",
        "Parcs et bâtiments publics améliorent le bonheur mais ont un coût horaire. Les recettes viennent des habitants et emplois réellement occupés.",
        "Véhicules et piétons recalculent leurs routes A* sur le réseau actuel. Couper une route change immédiatement connexions et mobilité.",
        "Le temps avance automatiquement et la météo peut changer toutes les trois heures de jeu. Pause, vitesse normale, ×4 et saut jour/nuit sont disponibles.",
        "La ville se sauvegarde seulement dans une clé localStorage dédiée. Aucun compte, serveur ou argent réel.",
      ],
      es: [
        "Las viviendas crean capacidad; comercio, servicios y energía crean empleos. El recurso más escaso entre empleo y capacidad limita el crecimiento.",
        "Por debajo del 100 % de energía, crecimiento y felicidad bajan. Las centrales aportan mucho suministro, pero tienen mayor mantenimiento.",
        "Parques y edificios cívicos mejoran la felicidad, pero cuestan por hora. Los ingresos vienen de residentes y empleos ocupados.",
        "Vehículos y peatones recalculan rutas A* sobre la red actual. Cortar una carretera cambia de inmediato conexiones y movilidad.",
        "El tiempo avanza solo y el clima puede cambiar cada tres horas de juego. Hay pausa, velocidad normal, ×4 y salto día/noche.",
        "La ciudad se guarda solo en una clave localStorage independiente. No hay cuenta, servidor ni dinero real.",
      ],
    },
    faqs: [
      {
        q: {
          ko: "차량과 보행자는 실제로 길을 찾나요?", en: "Do vehicles and pedestrians really find routes?", ja: "車両と歩行者は実際に経路探索しますか？",
          zh: "车辆与行人真的会寻路吗？", fr: "Véhicules et piétons cherchent-ils vraiment leur route ?", es: "¿Vehículos y peatones buscan rutas de verdad?",
        },
        a: {
          ko: "네. 현재 도로 셀을 그래프로 보고 A* 알고리즘으로 출발지와 목적지 사이 최단 경로를 계산합니다. 도로를 새로 놓거나 철거하면 최대 264개 이동 개체의 경로 집합을 다시 만듭니다.",
          en: "Yes. Road cells form a graph and A* computes shortest paths between origins and destinations. Adding or removing a road rebuilds route sets for up to 264 moving agents.",
          ja: "はい。道路セルをグラフとしてA*で出発地と目的地の最短経路を計算。道路の追加・撤去で最大264体の移動経路を再構築します。",
          zh: "是。道路格构成图，A*会计算起点与终点间的最短路径。增删道路会为最多264个移动对象重建路径集。",
          fr: "Oui. Les cases de route forment un graphe et A* calcule les plus courts chemins. Ajouter ou retirer une route reconstruit les itinéraires de jusqu'à 264 agents.",
          es: "Sí. Las casillas viales forman un grafo y A* calcula rutas mínimas. Añadir o quitar una carretera reconstruye los recorridos de hasta 264 agentes.",
        },
      },
      {
        q: {
          ko: "틸트시프트 효과를 끌 수 있나요?", en: "Can I turn off the tilt-shift effect?", ja: "チルトシフト効果をオフにできますか？",
          zh: "可以关闭移轴效果吗？", fr: "Peut-on désactiver l'effet tilt-shift ?", es: "¿Puedo desactivar el efecto tilt-shift?",
        },
        a: {
          ko: "네. 데스크톱 하단의 틸트시프트 버튼으로 끌 수 있습니다. 모바일은 성능과 선명도를 위해 후처리를 기본 비활성화하고 차량·보행자 수와 그림자 해상도도 자동 조절합니다.",
          en: "Yes. Use the Tilt-shift button on desktop. Mobile disables the post-process by default for performance and clarity, and also scales traffic, pedestrians and shadow resolution.",
          ja: "はい。デスクトップ下部のボタンで切替可能。モバイルは性能と視認性のため既定で無効にし、交通量・歩行者数・影解像度も調整します。",
          zh: "可以。桌面端用底部移轴按钮切换。移动端为性能与清晰度默认关闭后处理，并自动调整车流、行人和阴影分辨率。",
          fr: "Oui, avec le bouton Tilt-shift sur ordinateur. Sur mobile, le post-traitement est coupé par défaut et trafic, piétons et ombres sont adaptés.",
          es: "Sí, con el botón Tilt-shift en escritorio. En móvil el posprocesado se desactiva por defecto y también se ajustan tráfico, peatones y sombras.",
        },
      },
      {
        q: {
          ko: "도시 데이터가 서버로 전송되나요?", en: "Is city data sent to a server?", ja: "都市データはサーバーへ送られますか？",
          zh: "城市数据会发送到服务器吗？", fr: "Les données de la ville partent-elles sur un serveur ?", es: "¿Los datos de la ciudad se envían a un servidor?",
        },
        a: {
          ko: "아니요. 18×18 격자, 예산, 인구, 시간과 날씨만 전용 localStorage 키에 저장하며, 저장 형식을 검증한 뒤 복원합니다. 계정이나 개인정보 입력도 없습니다.",
          en: "No. The 18×18 grid, funds, population, time and weather stay in one dedicated localStorage key and are validated before restoration. There is no account or personal-data input.",
          ja: "いいえ。18×18グリッド、予算、人口、時間、天候のみを専用localStorageキーに保存し、検証後に復元します。アカウントや個人情報入力もありません。",
          zh: "不会。18×18网格、资金、人口、时间和天气仅保存在独立localStorage键中，并经格式验证后恢复。无需账号或个人信息。",
          fr: "Non. Grille 18×18, budget, population, heure et météo restent dans une clé localStorage dédiée et sont validés avant restauration. Aucun compte ni donnée personnelle.",
          es: "No. La cuadrícula 18×18, fondos, población, hora y clima quedan en una clave localStorage propia y se validan antes de restaurar. No hay cuenta ni datos personales.",
        },
      },
    ],
  },
  "texas-holdem": {
    origin: {
      ko: "텍사스 홀덤은 20세기 초 미국 텍사스에서 생겨나 현재 가장 널리 플레이되는 포커 변형입니다. 두 장의 개인 패와 다섯 장의 공유 카드로 최고의 다섯 장을 만드는 규칙이 전략 게임으로 사랑받습니다.",
      en: "Texas Hold'em emerged in early-20th-century Texas and is today the most widely played poker variant. Building the best five cards from two private cards and five shared ones makes it a beloved game of strategy.",
      ja: "テキサスホールデムは20世紀初頭の米国テキサスで生まれ、今日最も広くプレイされるポーカーの一種です。2枚の手札と5枚の共有カードで最強の5枚を作る戦略性が愛されています。",
      zh: "德州扑克起源于20世纪初的美国德克萨斯州，如今是最广泛流行的扑克变体。用两张底牌和五张公共牌组成最佳五张牌的规则使其成为备受喜爱的策略游戏。",
      fr: "Le Texas Hold'em est né au Texas au début du XXe siècle et est aujourd'hui la variante de poker la plus jouée. Composer la meilleure main de cinq cartes à partir de deux cartes privées et cinq communes en fait un jeu de stratégie apprécié.",
      es: "El Texas Hold'em surgió en Texas a principios del siglo XX y hoy es la variante de póker más jugada. Formar la mejor mano de cinco cartas con dos cartas privadas y cinco comunitarias lo convierte en un querido juego de estrategia.",
    },
    how: {
      ko: "두 장의 핸드를 받고, 커뮤니티 카드(플랍 3장·턴 1장·리버 1장)를 차례로 공개합니다. 개인 패 2장과 공유 5장 중 가장 강한 다섯 장으로 상대와 겨루며, 언제든 폴드할 수 있습니다. 이 게임은 베팅 없이 족보와 승패를 익히는 학습용입니다.",
      en: "You get two hole cards, then the community cards reveal in turn (flop 3, turn 1, river 1). Make the strongest five from your two and the five shared cards to beat your opponent, and fold any time. This version is for learning hand rankings and showdowns — no betting.",
      ja: "2枚の手札を受け取り、コミュニティカード（フロップ3枚・ターン1枚・リバー1枚）を順に公開します。手札2枚と共有5枚から最強の5枚を作って相手と競い、いつでもフォールドできます。ベットなしで役と勝敗を学ぶ学習版です。",
      zh: "你会拿到两张底牌，然后依次公开公共牌（翻牌3张、转牌1张、河牌1张）。用你的两张牌和五张公共牌组成最强的五张牌与对手比拼，随时可以弃牌。此版本用于学习牌型与比牌，无下注。",
      fr: "Vous recevez deux cartes fermées, puis les cartes communes se révèlent tour à tour (flop 3, turn 1, river 1). Formez la meilleure main de cinq cartes pour battre l'adversaire, et couchez-vous à tout moment. Cette version sert à apprendre les mains et les abattages — sans mise.",
      es: "Recibes dos cartas propias y luego las comunitarias se descubren por turnos (flop 3, turn 1, river 1). Forma la mejor mano de cinco cartas para vencer al rival y retírate cuando quieras. Esta versión es para aprender manos y enfrentamientos, sin apuestas.",
    },
    faqs: [
      {
        q: {
          ko: "포커 족보 순서가 어떻게 되나요?",
          en: "What is the order of poker hands?",
          ja: "ポーカーの役の順番は？",
          zh: "扑克牌型的顺序是怎样的？",
          fr: "Quel est l'ordre des mains au poker ?",
          es: "¿Cuál es el orden de las manos de póker?",
        },
        a: {
          ko: "강한 순서대로 스트레이트 플러시 › 포카드 › 풀하우스 › 플러시 › 스트레이트 › 트리플 › 투페어 › 원페어 › 하이카드입니다. 게임 안의 '포커 족보' 참고표에서 언제든 확인할 수 있습니다.",
          en: "From strongest: straight flush › four of a kind › full house › flush › straight › three of a kind › two pair › one pair › high card. You can check the in-game hand-ranking reference any time.",
          ja: "強い順にストレートフラッシュ › フォーカード › フルハウス › フラッシュ › ストレート › スリーカード › ツーペア › ワンペア › ハイカードです。ゲーム内の「役」参考表でいつでも確認できます。",
          zh: "从强到弱：同花顺 › 四条 › 葫芦 › 同花 › 顺子 › 三条 › 两对 › 一对 › 高牌。你可以随时查看游戏内的牌型参考表。",
          fr: "Du plus fort : quinte flush › carré › full › couleur › quinte › brelan › deux paires › paire › carte haute. Consultez le tableau des mains dans le jeu à tout moment.",
          es: "De más fuerte: escalera de color › póker › full › color › escalera › trío › doble pareja › pareja › carta alta. Consulta la tabla de manos dentro del juego cuando quieras.",
        },
      },
      {
        q: {
          ko: "실제 돈을 걸 수 있나요?",
          en: "Can I bet real money?",
          ja: "実際のお金を賭けられますか？",
          zh: "可以下真钱吗？",
          fr: "Peut-on miser de l'argent réel ?",
          es: "¿Se puede apostar dinero real?",
        },
        a: {
          ko: "아니요. 실제 화폐·베팅·환전이 전혀 없는 무료 교육용 게임으로, 족보와 승패 판정을 익히는 데 목적이 있습니다.",
          en: "No. This is a free educational game with no real money, betting, or cash-out — it exists to teach hand rankings and how showdowns are decided.",
          ja: "いいえ。実際の通貨・ベット・換金は一切ない無料の学習用ゲームで、役と勝敗判定を学ぶことが目的です。",
          zh: "不可以。这是一款没有任何真实货币、下注或兑现的免费教学游戏，目的是学习牌型和比牌判定。",
          fr: "Non. C'est un jeu éducatif gratuit sans argent réel, mise ni retrait — il sert à apprendre les mains et la façon dont les abattages sont tranchés.",
          es: "No. Es un juego educativo gratuito sin dinero real, apuestas ni retiros: existe para enseñar las manos y cómo se deciden los enfrentamientos.",
        },
      },
    ],
  },
  "korean-semantle": {
    origin: {
      ko: "꼬맨틀은 단어 임베딩(의미 벡터) 기반의 의미 유사도 추측 게임으로, 영어 Semantle과 그 한국어 판에서 이어진 형식입니다. 정답 단어와 의미가 가까운 단어일수록 높은 순위를 받습니다.",
      en: "Kkomantle is a semantic-similarity guessing game built on word embeddings, following the lineage of Semantle and its Korean adaptations. Words closer in meaning to the secret rank higher.",
      ja: "꼬맨틀は単語埋め込み（意味ベクトル）に基づく意味類似度あてゲームで、英語のSemantleとその韓国語版の系譜を引き継いでいます。正解と意味が近い単語ほど高い順位になります。",
      zh: "꼬맨틀是基于词嵌入（语义向量）的词义相似度猜词游戏，承袭自英文 Semantle 及其韩语版本。与答案语义越接近的词排名越高。",
      fr: "Kkomantle est un jeu de proximité sémantique fondé sur les plongements lexicaux, dans la lignée de Semantle et de ses versions coréennes. Plus un mot est proche du secret, meilleur est son rang.",
      es: "Kkomantle es un juego de similitud semántica basado en incrustaciones de palabras, en la línea de Semantle y sus versiones coreanas. Cuanto más cercana en significado es la palabra al secreto, mejor es su puesto.",
    },
    how: {
      ko: "한글 단어를 입력하면 숨은 정답과의 의미 유사도 순위를 알려줍니다. 순위가 낮을수록(1에 가까울수록) 정답에 가깝습니다. 순위와 온도 색을 단서 삼아 정답 단어를 찾아내세요.",
      en: "Type a Korean word and see its similarity rank to the hidden answer. A lower rank (closer to 1) means closer in meaning. Use the rank and temperature colors as clues to find the secret word.",
      ja: "ハングルの単語を入力すると、隠れた正解との意味類似度の順位が表示されます。順位が小さいほど（1に近いほど）正解に近づきます。順位と温度色を手がかりに正解を探しましょう。",
      zh: "输入一个韩文词，即可看到它与隐藏答案的语义相似度排名。排名越小（越接近1）表示词义越接近。利用排名和温度颜色作为线索找出答案。",
      fr: "Tapez un mot coréen pour voir son rang de similarité avec la réponse cachée. Un rang plus bas (proche de 1) signifie un sens plus proche. Servez-vous du rang et des couleurs de température comme indices.",
      es: "Escribe una palabra coreana y verás su puesto de similitud con la respuesta oculta. Un puesto más bajo (cercano a 1) indica mayor cercanía de significado. Usa el puesto y los colores de temperatura como pistas.",
    },
    faqs: [
      {
        q: {
          ko: "순위가 표시되지 않고 '순위권 밖'이라고 나오는 이유는?",
          en: "Why do some guesses show 'outside the ranking' with no rank?",
          ja: "一部の推測で順位が出ず「順位圏外」と表示されるのはなぜ？",
          zh: "为什么有些猜测显示“排名之外”而没有排名？",
          fr: "Pourquoi certains essais affichent « hors classement » sans rang ?",
          es: "¿Por qué algunos intentos muestran «fuera del ranking» sin puesto?",
        },
        a: {
          ko: "각 퍼즐은 정답과 가장 가까운 상위 단어 목록만 담고 있어, 그 목록 밖의 단어는 정확한 순위를 매길 수 없습니다. 없는 값을 지어내지 않고 '순위권 밖'으로 정직하게 표시합니다 — 그 단어는 정답과 꽤 멀다는 뜻입니다.",
          en: "Each puzzle ships only the top words nearest the answer, so a word outside that list can't be given an exact rank. Rather than invent a number, we honestly mark it 'outside the ranking' — meaning it's fairly far from the answer.",
          ja: "各パズルは正解に最も近い上位の単語のみを収録しているため、その外の単語には正確な順位を付けられません。値を捏造せず「順位圏外」と正直に表示します。正解からかなり遠いという意味です。",
          zh: "每个谜题只收录与答案最接近的上位词，因此榜单之外的词无法给出精确排名。我们不会编造数字，而是如实标记为“排名之外”，表示该词离答案较远。",
          fr: "Chaque puzzle ne contient que les mots les plus proches de la réponse ; un mot hors de cette liste ne peut recevoir de rang exact. Plutôt qu'inventer un nombre, nous indiquons honnêtement « hors classement » — le mot est assez loin de la réponse.",
          es: "Cada puzle incluye solo las palabras más cercanas a la respuesta, así que una palabra fuera de esa lista no puede recibir un puesto exacto. En lugar de inventar un número, la marcamos honestamente como «fuera del ranking»: está bastante lejos de la respuesta.",
        },
      },
      {
        q: {
          ko: "유사도는 어떻게 계산되나요?",
          en: "How is the similarity computed?",
          ja: "類似度はどのように計算されますか？",
          zh: "相似度是如何计算的？",
          fr: "Comment la similarité est-elle calculée ?",
          es: "¿Cómo se calcula la similitud?",
        },
        a: {
          ko: "단어를 의미 벡터로 바꾸는 fastText 한국어 임베딩(Facebook AI Research, CC BY-SA 3.0)의 코사인 유사도로 순위를 매깁니다. 사람의 주관이 아니라 대규모 말뭉치에서 학습된 통계적 의미 근접도입니다.",
          en: "Ranking uses cosine similarity over fastText Korean word embeddings (Facebook AI Research, CC BY-SA 3.0), which map words to meaning vectors. It reflects statistical meaning-closeness learned from a large corpus, not subjective judgment.",
          ja: "単語を意味ベクトルに変換するfastText韓国語埋め込み（Facebook AI Research, CC BY-SA 3.0）のコサイン類似度で順位を付けます。主観ではなく大規模コーパスから学習された統計的な意味の近さです。",
          zh: "排名基于将词映射为语义向量的 fastText 韩语词嵌入（Facebook AI Research，CC BY-SA 3.0）的余弦相似度。它反映的是从大规模语料中学到的统计性词义接近度，而非主观判断。",
          fr: "Le classement utilise la similarité cosinus des plongements coréens fastText (Facebook AI Research, CC BY-SA 3.0), qui associent les mots à des vecteurs de sens. Il reflète une proximité de sens statistique apprise sur un grand corpus, non un jugement subjectif.",
          es: "El ranking usa la similitud del coseno sobre las incrustaciones coreanas de fastText (Facebook AI Research, CC BY-SA 3.0), que asignan a las palabras vectores de significado. Refleja una cercanía de significado estadística aprendida de un gran corpus, no un juicio subjetivo.",
        },
      },
    ],
  },
  "plinko": {
    origin: { ko: "플린코는 핀볼판에서 유래한 확률 게임으로, 공이 핀에 부딪히며 이항분포를 그리는 물리 현상을 활용한 게임쇼·카지노의 고전 소재입니다.", en: "Plinko traces back to pinball-style peg boards; the ball bouncing off pins traces a binomial distribution, a classic game-show and casino mechanic.", ja: "プリンコはピンボール式のピン板に由来し、ボールがピンに当たって二項分布を描く物理現象を使ったゲームショー・カジノの定番です。", zh: "弹珠机源自钉板式弹球玩法，小球撞击钉子形成二项分布，是经典的游戏节目和赌场元素。", fr: "Le Plinko vient des planches à picots façon flipper ; la bille rebondissant dessine une distribution binomiale, un classique des jeux télévisés et casinos.", es: "El Plinko proviene de los tableros de clavijas estilo pinball; la bola rebotando traza una distribución binomial, un clásico de concursos y casinos." },
    how: { ko: "공을 떨어뜨리면 핀에 부딪히며 무작위로 튕겨 아래 슬롯 중 하나에 도착합니다. 가장자리 슬롯일수록 배당이 높습니다.", en: "Drop the ball — it bounces off pins at random and lands in one of the slots below. Edge slots pay out more than the center.", ja: "ボールを落とすとピンに当たってランダムに跳ね、下のスロットのいずれかに着地します。端のスロットほど配当が高くなります。", zh: "投放小球后，它会撞击钉子随机弹跳，最终落入下方某个格子。边缘格子的倍率更高。", fr: "Lâchez la bille : elle rebondit au hasard sur les picots et atterrit dans une case. Les cases en bord paient plus que le centre.", es: "Suelta la bola: rebota al azar en las clavijas y cae en una ranura. Las ranuras de los bordes pagan más que el centro." },
    faqs: [{ q: { ko: "실제 돈을 걸 수 있나요?", en: "Can I bet real money?", ja: "実際のお金を賭けられますか？", zh: "可以下真实赌注吗？", fr: "Peut-on miser de l'argent réel ?", es: "¿Se puede apostar dinero real?" }, a: { ko: "아니요. 포인트만 사용하는 무료 게임으로, 실제 화폐나 환전 기능은 없습니다.", en: "No — this is a free, points-only game. There's no real currency or cash-out.", ja: "いいえ。ポイントのみを使う無料ゲームで、実際の通貨や換金機能はありません。", zh: "不可以。这是仅使用积分的免费游戏，没有真实货币或兑现功能。", fr: "Non — c'est un jeu gratuit uniquement en points, sans monnaie réelle ni retrait.", es: "No: es un juego gratuito solo con puntos, sin moneda real ni retiro." } }],
  },
  "hearts-game": {
    origin: { ko: "하트는 15세기 유럽 트릭테이킹 게임에서 유래해 미국에서 현재 규칙으로 정착한, 점수를 피하는 독특한 카드게임입니다.", en: "Hearts descends from 15th-century European trick-taking games, settling into its modern point-avoidance rules in America.", ja: "ハーツは15世紀ヨーロッパのトリックテイキングゲームに由来し、アメリカで点を避ける現在のルールに定着しました。", zh: "红心大战源自15世纪欧洲的赢墩类游戏，在美国形成了现今避分的规则。", fr: "Le Hearts descend des jeux de plis européens du XVe siècle, fixé aux États-Unis en règles d'évitement de points.", es: "Hearts desciende de los juegos de bazas europeos del siglo XV, con reglas de evitar puntos en EE. UU." },
    how: { ko: "매 라운드 세 장을 좌·우·맞은편으로 전달하고 네 번째에는 보류합니다. 하트는 1점, 스페이드 Q는 13점이며 누군가 누적 100점에 이르면 최저점이 승리합니다.", en: "Pass three cards left, right, and across, then hold on the fourth round. Hearts are 1 point and the queen of spades 13; the lowest total wins when anyone reaches 100.", ja: "各ラウンド3枚を左・右・向かいへ渡し、4回目は保留します。ハートは1点、スペードQは13点で、誰かが累計100点に達した時の最少点が勝ちです。", zh: "每轮传三张牌，依次传左、右、对面，第四轮保留。红心1分、黑桃Q为13分；有人累计100分时最低分获胜。", fr: "Passez trois cartes à gauche, à droite et en face, puis gardez-les à la quatrième manche. Les cœurs valent 1 point et la dame de pique 13 ; le plus petit total gagne dès qu'un joueur atteint 100.", es: "Pasa tres cartas a izquierda, derecha y enfrente, y consérvalas en la cuarta ronda. Cada corazón vale 1 y la reina de picas 13; gana el menor total cuando alguien llega a 100." },
    faqs: [{ q: { ko: "'슈팅 더 문'이 뭔가요?", en: "What is 'shooting the moon'?", ja: "「シュートザムーン」とは？", zh: "什么是“射月”？", fr: "Qu'est-ce que « shooter la lune » ?", es: "¿Qué es 'disparar a la luna'?" }, a: { ko: "모든 하트와 스페이드 Q를 혼자 다 먹으면, 자신은 0점이 되고 나머지 전원이 26점을 받는 역전 기술입니다.", en: "Taking all hearts and the queen of spades yourself gives you 0 and everyone else 26 — a bold reversal.", ja: "全てのハートとスペードQを一人で取ると、自分は0点、他全員が26点になる逆転技です。", zh: "独揽所有红心和黑桃Q，自己得0分而其他人各得26分，是逆转绝招。", fr: "Prendre tous les cœurs et la dame de pique vous donne 0 et 26 aux autres.", es: "Llevarte todos los corazones y la dama de picas te da 0 y 26 a los demás." } }],
    rules: { ko: ["4명이 각자 13장을 받고 세 장 전달은 좌·우·맞은편·보류 순환입니다.", "리드한 무늬를 따라 내야 하며, 없으면 첫 트릭 벌점 제한 안에서 다른 카드를 냅니다.", "각 트릭에서 리드 무늬 중 가장 높은 카드를 낸 사람이 트릭을 가져갑니다.", "하트 1장당 1점, 스페이드 Q는 13점이며 26점을 모두 모으면 자신 0점·상대 각 26점입니다.", "클럽 2가 첫 트릭을 열고, 누군가 누적 100점에 도달하면 최저점이 승리합니다."], en: ["Four players get 13 cards; passing cycles left, right, across, then hold.", "Follow the led suit; if void, discard subject to the first-trick penalty restriction.", "The highest card of the led suit wins the trick.", "Each heart is 1 point and the queen of spades 13; taking all 26 gives you 0 and each opponent 26.", "The 2 of clubs opens; when any total reaches 100, the lowest total wins."], ja: ["4人に13枚ずつ配り、3枚のパスは左・右・向かい・保留と循環します。", "リードスートに従い、なければ初回の罰点制限内で別の札を出します。", "リードスートの最高札がトリックを取ります。", "ハートは1点、スペードQは13点。26点を全て取ると自分0点・相手各26点です。", "クラブ2が最初に出され、誰かが累計100点に達すると最少点が勝ちです。"], zh: ["四人各持13张，传三张牌按左、右、对面、保留循环。", "必须跟首攻花色；没有时须遵守首墩罚分牌限制。", "首攻花色中最大牌赢得该墩。", "每张红心1分，黑桃Q为13分；全收26分则自己0分、对手各26分。", "梅花2首攻；有人累计100分时最低分获胜。"], fr: ["Quatre joueurs reçoivent 13 cartes ; la passe tourne à gauche, à droite, en face, puis aucune.", "Fournissez à la couleur ; sinon défaussez en respectant la restriction de pénalité au premier pli.", "La plus haute carte de la couleur demandée remporte le pli.", "Chaque cœur vaut 1 et la dame de pique 13 ; prendre les 26 donne 0 à soi et 26 à chaque adversaire.", "Le 2 de trèfle ouvre ; dès qu'un total atteint 100, le plus bas gagne."], es: ["Cuatro jugadores reciben 13 cartas; el pase rota izquierda, derecha, enfrente y sin pase.", "Sigue el palo de salida; si no tienes, descarta respetando la restricción de penalización de la primera baza.", "La carta más alta del palo de salida gana la baza.", "Cada corazón vale 1 y la reina de picas 13; llevarse los 26 da 0 propio y 26 a cada rival.", "El 2 de tréboles abre; cuando alguien llega a 100, gana el total más bajo."] },
  },
  "hitori": {
    origin: { ko: "히토리는 일본 니코리사가 개발·보급한 논리 퍼즐로, '히토리니 시테쿠레(혼자 있게 해줘)'에서 이름을 따왔습니다.", en: "Hitori is a logic puzzle developed and popularized by Japan's Nikoli, its name meaning 'leave me alone'.", ja: "ひとりは日本のニコリが開発・普及した論理パズルで、「ひとりにしてくれ」から名付けられました。", zh: "Hitori是日本Nikoli开发推广的逻辑谜题，名字取自“让我一个人待着”。", fr: "Hitori est un puzzle logique de Nikoli (Japon), son nom signifiant « laissez-moi seul ».", es: "Hitori es un puzle lógico de Nikoli (Japón); su nombre significa 'déjame solo'." },
    how: { ko: "각 행·열에 숫자가 중복되지 않도록 칸을 검게 칠하되, 검은 칸은 인접하지 않고 흰 칸은 모두 연결되어야 합니다.", en: "Shade cells so no number repeats in any row or column; black cells never touch and white cells stay connected.", ja: "各行・列に数字が重複しないようマスを黒く塗り、黒マスは隣接せず白マスは全て繋がる必要があります。", zh: "涂黑格子使每行每列数字不重复；黑格不相邻，白格须全连通。", fr: "Noircissez pour qu'aucun nombre ne se répète ; les cases noires ne se touchent pas, les blanches restent connectées.", es: "Sombrea para que ningún número se repita; las negras no se tocan y las blancas siguen conectadas." },
    faqs: [],
  },
  "janggi": {
    origin: { ko: "장기는 한국의 전통 보드게임으로, 초·한이 겨루는 초한지의 세계관을 담고 있으며 체스·샹치와 뿌리를 공유합니다.", en: "Janggi is Korean chess, themed on the Chu-Han war and sharing roots with chess and xiangqi.", ja: "チャンギ(将棋)は韓国の伝統ボードゲームで、楚漢戦争を題材にし、チェスやシャンチーと起源を共有します。", zh: "将棋（象棋）是韩国传统棋类游戏，以楚汉之争为背景，与国际象棋、中国象棋同源。", fr: "Le janggi est les échecs coréens, sur le thème de la guerre Chu-Han, apparenté aux échecs et au xiangqi.", es: "El janggi es el ajedrez coreano, ambientado en la guerra Chu-Han y emparentado con el ajedrez y el xiangqi." },
    how: { ko: "상대 궁(왕)을 잡으면 승리합니다. 각 기물은 고유한 이동 규칙을 가지며 궁성 안에서만 움직이는 기물도 있습니다.", en: "Win by capturing the enemy general. Each piece has unique moves; some stay inside the palace.", ja: "相手の宮(王)を取れば勝ち。各駒は固有の動きを持ち、宮城内のみ動く駒もあります。", zh: "吃掉对方的将（王）即胜。各子有独特走法，部分子只能在九宫内活动。", fr: "Gagnez en capturant le général adverse. Chaque pièce a ses mouvements ; certaines restent au palais.", es: "Gana capturando al general enemigo. Cada pieza tiene movimientos únicos; algunas solo en el palacio." },
    faqs: [{ q: { ko: "장기와 중국 샹치의 차이는?", en: "How does janggi differ from Chinese xiangqi?", ja: "チャンギとシャンチーの違いは？", zh: "将棋和中国象棋有何不同？", fr: "Différence avec le xiangqi ?", es: "¿En qué difiere del xiangqi?" }, a: { ko: "장기는 강을 건너지 않고 포가 다른 기물을 넘어야만 움직이며, 궁이 궁성 대각선을 쓰는 등 규칙이 다릅니다. 초반 기물 배치도 바꿀 수 있습니다.", en: "Janggi has no river, cannons must jump to move at all, the general uses palace diagonals, and opening setups can be swapped.", ja: "チャンギには河がなく、砲は必ず駒を飛び越えて動き、宮は宮城の対角線を使うなど規則が異なります。", zh: "将棋无河界，炮必须翻子才能移动，将可走九宫对角线，开局布子还可调整。", fr: "Le janggi n'a pas de rivière, les canons doivent sauter, le général utilise les diagonales du palais.", es: "El janggi no tiene río, los cañones deben saltar y el general usa diagonales del palacio." } }],
  },
  "light-up": {
    origin: { ko: "라이트 업(아카리)은 니코리사의 논리 퍼즐로, 격자에 전구를 배치해 모든 흰 칸을 밝히는 게임입니다.", en: "Light Up (Akari) is a Nikoli logic puzzle where you place bulbs to illuminate every white cell.", ja: "ライトアップ(美術館)はニコリの論理パズルで、電球を配置して全ての白マスを照らします。", zh: "点灯（美术馆）是Nikoli的逻辑谜题，放置灯泡照亮所有白格。", fr: "Light Up (Akari) est un puzzle Nikoli : placez des ampoules pour éclairer chaque case blanche.", es: "Light Up (Akari) es un puzle de Nikoli: coloca bombillas para iluminar cada casilla blanca." },
    how: { ko: "전구는 벽에 막힐 때까지 상하좌우를 비춥니다. 숫자 칸은 인접한 전구 개수를 뜻하며, 전구끼리 서로 비추면 안 됩니다.", en: "Bulbs light up/down/left/right until blocked. Numbered cells show adjacent bulb counts, and bulbs must not light each other.", ja: "電球は壁に遮られるまで上下左右を照らします。数字は隣接電球数を示し、電球同士が照らし合ってはいけません。", zh: "灯泡向四方照射直到被墙挡住。数字格表示相邻灯泡数，灯泡不能互相照射。", fr: "Les ampoules éclairent jusqu'à un mur. Les chiffres indiquent les ampoules adjacentes ; elles ne s'éclairent pas entre elles.", es: "Las bombillas iluminan hasta un muro. Los números indican bombillas adyacentes; no deben iluminarse entre sí." },
    faqs: [],
  },
  "lotto-generator": {
    origin: { ko: "로또 번호 생성기는 무작위 추첨 번호를 뽑아주는 도구로, 확률적으로 어떤 조합도 당첨 가능성은 동일합니다.", en: "A lotto number generator picks random draws — statistically every combination has an equal chance.", ja: "ロトナンバー生成器はランダムに番号を選ぶツールで、統計的にどの組み合わせも当選確率は同じです。", zh: "彩票号码生成器随机选号，统计上任何组合中奖概率都相同。", fr: "Un générateur de numéros de loto tire au hasard — statistiquement, chaque combinaison a la même chance.", es: "Un generador de lotería elige al azar; estadísticamente toda combinación tiene igual probabilidad." },
    how: { ko: "번호 범위와 개수를 정하고 생성 버튼을 누르면 무작위 조합이 나옵니다.", en: "Set the number range and count, then generate a random combination.", ja: "番号の範囲と個数を決めて生成ボタンを押すと、ランダムな組み合わせが出ます。", zh: "设定号码范围和数量，点击生成即得随机组合。", fr: "Choisissez la plage et le nombre, puis générez une combinaison aléatoire.", es: "Define el rango y la cantidad, y genera una combinación aleatoria." },
    faqs: [{ q: { ko: "특정 번호가 더 잘 나오나요?", en: "Are some numbers luckier?", ja: "特定の番号が出やすい？", zh: "某些号码更容易中吗？", fr: "Certains numéros sont-ils plus chanceux ?", es: "¿Hay números con más suerte?" }, a: { ko: "아니요. 각 추첨은 독립 사건이라 과거 당첨 이력이 미래 확률에 영향을 주지 않습니다. 재미로만 활용하세요.", en: "No. Each draw is independent — past results don't affect future odds. Use it just for fun.", ja: "いいえ。各抽選は独立した事象で、過去の結果は将来の確率に影響しません。娯楽としてお使いください。", zh: "不会。每次开奖都是独立事件，历史结果不影响未来概率。仅供娱乐。", fr: "Non. Chaque tirage est indépendant ; le passé n'influence pas l'avenir. Juste pour le plaisir.", es: "No. Cada sorteo es independiente; el pasado no afecta el futuro. Solo por diversión." } }],
  },
  "memory-card-game": {
    origin: { ko: "메모리 카드 게임(신경쇠약)은 뒤집힌 카드 쌍을 기억으로 맞추는 고전 집중력 게임으로, 유아 교육에도 널리 쓰입니다.", en: "The memory card game (Concentration) is a classic matching game testing recall, widely used in early education.", ja: "神経衰弱は裏返したカードのペアを記憶で当てる古典的な集中力ゲームで、幼児教育にも使われます。", zh: "记忆翻牌（配对）是靠记忆匹配卡牌的经典专注力游戏，也常用于幼儿教育。", fr: "Le jeu de mémoire (Memory) est un classique de correspondance testant le rappel, très utilisé en éducation.", es: "El juego de memoria (parejas) es un clásico de emparejar que pone a prueba el recuerdo." },
    how: { ko: "모든 카드가 뒤집힌 상태에서 두 장씩 뒤집어 같은 그림 쌍을 찾습니다. 모든 쌍을 최소 시도로 맞추세요.", en: "Flip two cards at a time to find matching pairs. Clear all pairs in the fewest tries.", ja: "全て裏向きのカードを2枚ずつめくり、同じ絵のペアを探します。最少手数で全ペアを揃えましょう。", zh: "每次翻开两张牌寻找相同的一对，用最少次数配完所有对子。", fr: "Retournez deux cartes pour trouver les paires. Terminez en un minimum d'essais.", es: "Voltea dos cartas para hallar parejas. Completa todas en los menos intentos." },
    faqs: [],
  },
  "number-guessing": {
    origin: { ko: "숫자 맞히기는 이분 탐색의 원리를 담은 고전 추리 게임으로, 컴퓨터 과학의 탐색 알고리즘 학습에도 쓰입니다.", en: "Number guessing embodies binary search — a classic deduction game also used to teach search algorithms.", ja: "数当ては二分探索の原理を含む古典的な推理ゲームで、探索アルゴリズムの学習にも使われます。", zh: "猜数字体现二分查找原理，是经典推理游戏，也用于教学搜索算法。", fr: "Le jeu du nombre illustre la recherche binaire — un classique de déduction utilisé en algorithmique.", es: "Adivinar el número ilustra la búsqueda binaria: un clásico de deducción usado en algoritmia." },
    how: { ko: "컴퓨터가 정한 숫자를 '업/다운' 힌트를 보며 맞힙니다. 매번 범위의 중간값을 부르면 가장 빠릅니다.", en: "Guess the hidden number using higher/lower hints. Calling the range midpoint each time is fastest.", ja: "コンピューターが決めた数字を「上/下」のヒントで当てます。毎回範囲の中央値を言うのが最速です。", zh: "根据“大了/小了”提示猜出电脑设定的数字。每次报范围中值最快。", fr: "Devinez le nombre caché via les indices plus/moins. Le milieu de la plage est le plus rapide.", es: "Adivina el número con pistas mayor/menor. Decir el punto medio del rango es lo más rápido." },
    faqs: [],
  },
  "snake-game": {
    origin: { ko: "스네이크는 1976년 아케이드 '블록에이드'에서 시작해 1997년 노키아 휴대폰에 실리며 전 세계 수억 명이 즐긴 게임이 되었습니다.", en: "Snake began with 1976's arcade Blockade and reached hundreds of millions on Nokia phones in 1997.", ja: "スネークは1976年のアーケード「ブロッケード」に始まり、1997年のノキア携帯で世界的に普及しました。", zh: "贪吃蛇源于1976年街机Blockade，1997年内置诺基亚手机后风靡全球。", fr: "Snake est né avec l'arcade Blockade (1976) et a atteint des centaines de millions sur Nokia en 1997.", es: "Snake nació con el arcade Blockade (1976) y llegó a cientos de millones en Nokia en 1997." },
    how: { ko: "먹이를 먹을수록 뱀이 길어집니다. 벽이나 자기 몸에 부딪히지 않으면서 최대한 길게 키우세요.", en: "The snake grows as it eats. Avoid the walls and your own body while growing as long as possible.", ja: "エサを食べるほど蛇が伸びます。壁や自分の体に当たらずできるだけ長く伸ばしましょう。", zh: "吃到食物蛇会变长。避免撞墙和自己的身体，尽量变长。", fr: "Le serpent grandit en mangeant. Évitez les murs et votre corps en grandissant.", es: "La serpiente crece al comer. Evita los muros y tu cuerpo mientras creces." },
    faqs: [],
  },
  "tents-and-trees": {
    origin: { ko: "텐트와 나무는 각 나무마다 텐트를 하나씩 배치하는 논리 퍼즐로, 유럽 퍼즐 잡지에서 대중화되었습니다.", en: "Tents and Trees is a logic puzzle pairing each tree with one tent, popularized in European puzzle magazines.", ja: "テントと木は各木にテントを一つずつ配置する論理パズルで、欧州のパズル誌で普及しました。", zh: "帐篷与树是为每棵树配一顶帐篷的逻辑谜题，在欧洲谜题杂志中流行。", fr: "Tentes et Arbres est un puzzle logique associant chaque arbre à une tente, populaire dans les magazines européens.", es: "Tiendas y Árboles es un puzle lógico que empareja cada árbol con una tienda." },
    how: { ko: "각 나무 옆(상하좌우)에 텐트를 하나씩 놓되, 텐트끼리는 대각선을 포함해 인접하지 않아야 하며 행·열 숫자를 맞춥니다.", en: "Place one tent orthogonally next to each tree; tents never touch (even diagonally) and must match the row/column counts.", ja: "各木の隣(上下左右)にテントを一つ置き、テント同士は斜めも含め隣接せず、行・列の数字に合わせます。", zh: "在每棵树旁（上下左右）放一顶帐篷，帐篷之间（含对角）不相邻，并符合行列数字。", fr: "Placez une tente à côté de chaque arbre ; les tentes ne se touchent jamais et respectent les compteurs.", es: "Coloca una tienda junto a cada árbol; las tiendas nunca se tocan y cumplen los contadores." },
    faqs: [
      { q: { ko: "오늘의 퍼즐은 언제 바뀌나요?", en: "When does the daily puzzle change?", ja: "今日のパズルはいつ変わる？", zh: "每日谜题何时更换？", fr: "Quand le puzzle du jour change-t-il ?", es: "¿Cuándo cambia el puzle diario?" }, a: { ko: "기기 시간 기준 매일 자정에 새 퍼즐로 바뀌며, 같은 날에는 모두가 같은 퍼즐을 풉니다. 오늘의 퍼즐은 정답이 하나뿐인 판만 출제됩니다.", en: "It rolls over at midnight (device time), and everyone gets the same board on the same day. Daily boards are guaranteed to have exactly one solution.", ja: "端末時間の毎日0時に新しいパズルへ切り替わり、同じ日には全員が同じ盤面を解きます。今日のパズルは解が一つだけの盤面のみ出題されます。", zh: "以设备时间为准，每天零点更换新谜题，同一天所有人解同一盘面。每日谜题保证唯一解。", fr: "Il change à minuit (heure de l'appareil) et tout le monde reçoit la même grille le même jour. Les grilles du jour ont une solution unique garantie.", es: "Cambia a medianoche (hora del dispositivo) y todos reciben el mismo tablero el mismo día. Los tableros diarios tienen solución única garantizada." } },
      { q: { ko: "연속 기록(스트릭)은 어떻게 쌓이나요?", en: "How does the streak work?", ja: "連続記録はどう貯まる？", zh: "连续记录如何累积？", fr: "Comment fonctionne la série ?", es: "¿Cómo funciona la racha?" }, a: { ko: "오늘의 퍼즐을 완료한 날이 하루씩 이어질 때마다 스트릭이 1씩 늘고, 하루라도 건너뛰면 다시 1부터 시작합니다. 기록은 이 기기 브라우저에만 저장됩니다.", en: "Solving the daily puzzle on consecutive days grows your streak by one; skipping a day resets it to one. Records are stored only in this device's browser.", ja: "今日のパズルを連続した日に解くごとにストリークが1ずつ増え、1日でも空くと1から再開します。記録はこの端末のブラウザにのみ保存されます。", zh: "连续每天完成每日谜题，连续记录加1；漏掉一天则从1重新开始。记录仅保存在本设备浏览器中。", fr: "Résoudre le puzzle du jour des jours consécutifs augmente la série de un ; sauter un jour la remet à un. Les records restent dans le navigateur de cet appareil.", es: "Resolver el puzle diario en días consecutivos suma uno a la racha; saltarte un día la reinicia. Los récords se guardan solo en el navegador de este dispositivo." } },
    ],
  },
  "water-sort": {
    origin: { ko: "워터 소트는 2020년대 초 모바일에서 폭발적으로 유행한 정렬 퍼즐로, 색깔 액체를 같은 색끼리 모으는 게임입니다.", en: "Water Sort is a sorting puzzle that went viral on mobile in the early 2020s — pour colored liquids until each tube is one color.", ja: "ウォーターソートは2020年代初頭にモバイルで大流行した並べ替えパズルで、色付き液体を同色でまとめます。", zh: "液体分类是2020年代初在移动端爆红的排序谜题，把彩色液体按颜色归类。", fr: "Water Sort est un puzzle de tri devenu viral sur mobile au début des années 2020.", es: "Water Sort es un puzle de clasificación que se viralizó en móvil a principios de 2020." },
    how: { ko: "한 시험관의 맨 위 색을 같은 색 위나 빈 시험관에 부어, 각 시험관을 한 가지 색으로 통일하면 승리합니다.", en: "Pour the top color of a tube onto a matching color or an empty tube; win when each tube holds one color.", ja: "試験管の一番上の色を同色の上か空の試験管に注ぎ、各試験管を一色に揃えれば勝ちです。", zh: "把试管顶部颜色倒到相同颜色上或空试管中，每个试管统一为一色即胜。", fr: "Versez la couleur du haut sur une couleur identique ou un tube vide ; gagnez quand chaque tube est unicolore.", es: "Vierte el color superior sobre uno igual o un tubo vacío; gana cuando cada tubo sea de un color." },
    faqs: [{ q: { ko: "막혔을 때 되돌릴 수 있나요?", en: "Can I undo when stuck?", ja: "詰まったら戻せますか？", zh: "卡住时能撤销吗？", fr: "Peut-on annuler ?", es: "¿Se puede deshacer?" }, a: { ko: "네, 실행 취소로 마지막 붓기를 되돌릴 수 있습니다. 빈 시험관을 여유로 남겨두는 것이 막힘을 푸는 핵심입니다.", en: "Yes, undo reverses your last pour. Keeping an empty tube in reserve is key to escaping dead ends.", ja: "はい、元に戻すで最後の注ぎを取り消せます。空の試験管を残しておくのが行き詰まり回避の鍵です。", zh: "可以，撤销可还原上一次倾倒。留一个空试管是脱困关键。", fr: "Oui, annuler reverse le dernier versement. Garder un tube vide en réserve est essentiel.", es: "Sí, deshacer revierte el último vertido. Reservar un tubo vacío es clave." } }],
  },
  "balance-game": {
    origin: { ko: "밸런스 게임은 2010년대 후반 한국 인터넷 커뮤니티에서 유행한 양자택일 놀이로, '이거 아니면 저거' 식의 질문에 답하며 취향과 가치관을 드러냅니다.", en: "The balance game (양자택일) is a late-2010s Korean internet trend of either-or prompts that reveal preferences and values.", ja: "バランスゲームは2010年代後半に韓国のネットコミュニティで流行した二択遊びで、質問に答えながら好みや価値観が表れます。", zh: "二选一游戏（밸런스 게임）是2010年代后期在韩国网络社区流行的二选一玩法，通过回答问题展现喜好与价值观。", fr: "Le jeu du dilemme est une tendance d'internet coréen de la fin des années 2010 : des choix binaires qui révèlent préférences et valeurs.", es: "El juego del dilema es una tendencia de internet coreano de finales de los 2010: elecciones binarias que revelan preferencias y valores." },
    how: { ko: "두 선택지 중 하나를 고르면 다음 질문으로 넘어갑니다. 정답은 없으며, 68문항을 마치면 내 선택 비율을 볼 수 있습니다.", en: "Pick one of two options to move to the next prompt. There's no right answer — after all 68 you'll see your pick split.", ja: "二つの選択肢から一つ選ぶと次の質問に進みます。正解はなく、68問終えると自分の選択比率が見られます。", zh: "在两个选项中选一个即可进入下一题。没有标准答案，答完68题可查看你的选择比例。", fr: "Choisissez une des deux options pour passer à la question suivante. Il n'y a pas de bonne réponse ; après 68 questions, vous verrez votre répartition.", es: "Elige una de las dos opciones para pasar a la siguiente. No hay respuesta correcta; tras las 68 preguntas verás tu reparto de elecciones." },
    faqs: [],
  },
  "wheel-spinner": {
    origin: { ko: "행운의 돌림판은 무작위 선택 도구로, 이름 뽑기·순서 정하기·의사결정 등 다양한 상황에 쓰입니다.", en: "The wheel spinner is a random picker for drawing names, ordering turns, or making decisions.", ja: "ルーレットはランダム選択ツールで、名前選び・順番決め・意思決定などに使えます。", zh: "幸运转盘是随机选择工具，用于抽名字、定顺序、做决定等。", fr: "La roue de la fortune est un sélecteur aléatoire pour tirer des noms, ordonner ou décider.", es: "La ruleta es un selector aleatorio para sortear nombres, ordenar turnos o decidir." },
    how: { ko: "항목을 입력하고 돌림판을 돌리면 무작위로 하나가 선택됩니다. 회의·수업·모임에서 공정한 추첨에 유용합니다.", en: "Enter items and spin — one is chosen at random. Great for fair picks in meetings, classes and gatherings.", ja: "項目を入力して回すとランダムに一つ選ばれます。会議・授業・集まりの公平な抽選に便利。", zh: "输入项目并转动，随机选出一个。适合会议、课堂、聚会的公平抽选。", fr: "Saisissez des éléments et tournez ; un est choisi au hasard. Idéal pour des tirages équitables.", es: "Introduce elementos y gira; se elige uno al azar. Ideal para sorteos justos." },
    faqs: [],
  },
  "blackjack": {
    origin: { ko: "블랙잭은 18세기 프랑스의 '벵테엉(21)'에서 유래해 미국 카지노에서 현재 규칙으로 완성된, 세계에서 가장 널리 플레이되는 카지노 카드게임입니다.", en: "Blackjack descends from 18th-century French vingt-et-un ('twenty-one'), refined in American casinos into the world's most played casino card game.", ja: "ブラックジャックは18世紀フランスの「ヴァンテアン(21)」に由来し、アメリカのカジノで現在のルールに完成した、世界で最も遊ばれるカジノカードゲームです。", zh: "二十一点源自18世纪法国的“vingt-et-un(21点)”，在美国赌场发展为现行规则，是世界上玩家最多的赌场纸牌游戏。", fr: "Le blackjack descend du vingt-et-un français du XVIIIe siècle, affiné dans les casinos américains.", es: "El blackjack desciende del vingt-et-un francés del siglo XVIII, refinado en los casinos americanos." },
    how: { ko: "카드 합이 21을 넘지 않으면서 딜러보다 높으면 승리합니다. A는 1 또는 11로 계산합니다.", en: "Beat the dealer without going over 21. Aces count as 1 or 11.", ja: "合計21を超えずにディーラーより高ければ勝ち。Aは1または11として数えます。", zh: "点数不超过21且高于庄家即胜。A可算作1或11。", fr: "Battez le croupier sans dépasser 21. L'as vaut 1 ou 11.", es: "Vence al crupier sin pasarte de 21. El as vale 1 u 11." },
    faqs: [{ q: { ko: "언제 히트하고 언제 스탠드해야 하나요?", en: "When should I hit or stand?", ja: "いつヒットしていつスタンドすべき？", zh: "什么时候要牌、什么时候停牌？", fr: "Quand tirer ou rester ?", es: "¿Cuándo pedir o plantarse?" }, a: { ko: "기본 전략상 딜러 오픈카드가 7 이상이면 17까지 히트, 6 이하면 12 이상에서 스탠드가 정석입니다.", en: "Basic strategy: hit to 17 against a dealer 7+, stand on 12+ against a dealer 6 or lower.", ja: "基本戦略では、ディーラーの表カードが7以上なら17までヒット、6以下なら12以上でスタンドが定石です。", zh: "基本策略：庄家明牌7以上时要到17点，6以下时12点以上即停。", fr: "Stratégie de base : tirez jusqu'à 17 contre un 7+, restez à 12+ contre un 6 ou moins.", es: "Estrategia básica: pide hasta 17 contra un 7+, plántate con 12+ contra un 6 o menos." } }],
    rules: { ko: ["카드 값: 2~10은 숫자 그대로, J·Q·K는 10, A는 1 또는 11(유리한 쪽).", "게임 시작: 플레이어와 딜러가 카드 2장씩 받습니다.", "히트(Hit)=카드 추가, 스탠드(Stand)=멈춤. 21을 넘으면 즉시 패배(버스트).", "딜러는 보통 17 이상이 될 때까지 반드시 히트합니다.", "블랙잭(A+10 = 21 두 장)은 일반 21보다 강합니다."], en: ["Card values: 2-10 face value, J/Q/K = 10, A = 1 or 11 (whichever helps).", "Deal: player and dealer each get two cards.", "Hit = take a card, Stand = stop. Going over 21 is an instant loss (bust).", "The dealer must hit until reaching 17 or more.", "A blackjack (A + 10-value in two cards) beats an ordinary 21."], ja: ["カード値: 2〜10はそのまま、J・Q・Kは10、Aは1か11(有利な方)。", "配り: プレイヤーとディーラーが2枚ずつ受け取る。", "ヒット=カード追加、スタンド=停止。21を超えると即敗北(バスト)。", "ディーラーは通常17以上になるまでヒットする。", "ブラックジャック(A+10の2枚=21)は通常の21より強い。"], zh: ["牌值：2~10按面值，J·Q·K为10，A为1或11(取有利者)。", "发牌：玩家和庄家各得两张。", "要牌=加牌，停牌=停止。超过21点立即失败(爆牌)。", "庄家通常必须要牌直到17点或以上。", "黑杰克(两张A+10点=21)胜过普通的21点。"], fr: ["Valeurs : 2-10 nominal, J/Q/K = 10, A = 1 ou 11 (au choix).", "Distribution : joueur et croupier reçoivent deux cartes.", "Tirer = une carte, Rester = stop. Dépasser 21 = perte immédiate (bust).", "Le croupier doit tirer jusqu'à 17 minimum.", "Un blackjack (A + 10 en deux cartes) bat un 21 ordinaire."], es: ["Valores: 2-10 su valor, J/Q/K = 10, A = 1 u 11 (lo que convenga).", "Reparto: jugador y crupier reciben dos cartas.", "Pedir = una carta, Plantarse = parar. Pasarse de 21 = derrota (bust).", "El crupier debe pedir hasta llegar a 17 o más.", "Un blackjack (A + 10 en dos cartas) gana a un 21 normal."] },
  },
  "checkers": {
    origin: { ko: "체커는 기원전 3000년경 우르 지역의 보드게임까지 거슬러 올라가며, 12세기 프랑스에서 체스판을 쓰는 현재 형태가 되었습니다.", en: "Checkers traces back to boards from Ur circa 3000 BC, taking its modern chessboard form in 12th-century France.", ja: "チェッカーは紀元前3000年頃のウルのボードゲームに遡り、12世紀フランスでチェス盤を使う現在の形になりました。", zh: "跳棋可追溯到公元前3000年乌尔的棋盘游戏，12世纪在法国演变为使用棋盘的现代形态。", fr: "Le jeu de dames remonte à Ur vers 3000 av. J.-C. et prend sa forme moderne en France au XIIe siècle.", es: "Las damas se remontan a Ur hacia el 3000 a. C. y tomaron su forma moderna en la Francia del siglo XII." },
    how: { ko: "대각선으로 전진하며 상대 말을 뛰어넘어 잡습니다. 끝줄에 도달하면 킹이 되어 후진도 가능합니다.", en: "Move diagonally forward and capture by jumping. Reach the far row to crown a king that moves backward too.", ja: "斜め前に進み、相手の駒を飛び越えて取ります。最終列に到達するとキングになり後退も可能です。", zh: "沿对角线前进，跳过对方棋子即可吃子。到达底线升王后可后退。", fr: "Avancez en diagonale et capturez en sautant. Atteignez la dernière rangée pour couronner une dame.", es: "Avanza en diagonal y captura saltando. Llega a la última fila para coronar una dama." },
    faqs: [{ q: { ko: "AI 대전에서 이기는 팁은?", en: "Tips to beat the AI?", ja: "AIに勝つコツは？", zh: "战胜AI的技巧？", fr: "Astuces contre l'IA ?", es: "¿Consejos contra la IA?" }, a: { ko: "중앙을 장악하고 말을 2칸 간격의 대형으로 유지해 연속 점프를 막으세요. 킹 승격 경주가 종반의 핵심입니다.", en: "Control the center and keep formations that deny double jumps. The endgame is a race to crown kings.", ja: "中央を制し、連続ジャンプを許さない陣形を保ちましょう。終盤はキング昇格の競争です。", zh: "控制中心，保持不给对方连跳的阵型。残局关键是升王竞赛。", fr: "Contrôlez le centre et bloquez les sauts doubles. La fin de partie est une course au couronnement.", es: "Controla el centro y evita los saltos dobles. El final es una carrera por coronar." } }],
  },
  "connect-four": {
    origin: { ko: "커넥트 포는 1974년 밀턴 브래들리가 상품화한 4목 게임으로, 1988년 수학적으로 완전 해석되어 선공 필승이 증명되었습니다.", en: "Connect Four was commercialized by Milton Bradley in 1974 and solved mathematically in 1988 — first player wins with perfect play.", ja: "コネクトフォーは1974年にミルトン・ブラッドリーが商品化し、1988年に完全解析され先手必勝が証明されました。", zh: "四子棋由Milton Bradley于1974年商品化，1988年被完全破解——先手完美走法必胜。", fr: "Puissance 4, commercialisé en 1974, a été résolu en 1988 : le premier joueur gagne en jeu parfait.", es: "Conecta Cuatro se comercializó en 1974 y se resolvió en 1988: el primer jugador gana con juego perfecto." },
    how: { ko: "번갈아 원반을 열에 떨어뜨려 가로·세로·대각선으로 4개를 먼저 이으면 승리합니다.", en: "Drop discs into columns; first to connect four in any direction wins.", ja: "交互にディスクを列に落とし、先に4つ並べた方が勝ちです。", zh: "轮流将棋子投入列中，先在任意方向连成四子者胜。", fr: "Lâchez des jetons dans les colonnes ; le premier à en aligner quatre gagne.", es: "Deja caer fichas en las columnas; gana el primero en conectar cuatro." },
    faqs: [{ q: { ko: "첫 수는 어디에 두는 게 좋나요?", en: "Where should the first disc go?", ja: "最初の一手はどこ？", zh: "第一子下在哪里好？", fr: "Où jouer le premier jeton ?", es: "¿Dónde va la primera ficha?" }, a: { ko: "중앙 열이 정답입니다 — 완전 해석상 선공이 중앙에 두면 필승, 다른 열은 무승부 또는 패배로 이어집니다.", en: "The center column — the solved game shows a first move there wins, while other columns draw or lose.", ja: "中央の列です。完全解析では中央先手が必勝、他の列は引き分けか敗北につながります。", zh: "中间列——完全解析表明先手下中间必胜，其他列只能平局或落败。", fr: "La colonne centrale — le jeu résolu montre qu'elle gagne.", es: "La columna central: el juego resuelto muestra que gana." } }],
  },
  "whack-a-mole": {
    origin: { ko: "두더지 잡기는 1976년 일본에서 등장한 아케이드 오락기 '모구라 타이지(모그라たたき)'에서 시작된, 반응속도를 겨루는 고전 게임입니다.", en: "Whack-a-Mole descends from the 1976 Japanese arcade cabinet 'Mogura Taiji', a classic reflex game.", ja: "モグラたたきは1976年に日本で登場したアーケード機『モグラ退治』に由来する、反応速度を競う定番ゲームです。", zh: "打地鼠源自1976年日本的街机《打地鼠（モグラ退治）》，是比拼反应速度的经典游戏。", fr: "Le Tape-Taupe vient de la borne d'arcade japonaise « Mogura Taiji » (1976), un classique des jeux de réflexes.", es: "Golpea al Topo proviene de la máquina arcade japonesa « Mogura Taiji » (1976), un clásico de reflejos." },
    how: { ko: "3×3 구멍에서 🐹 두더지가 무작위로 튀어나옵니다. 두더지를 빠르게 두드리면 +1점, 💣 폭탄을 치면 -2점입니다. 30초 동안 시간이 지날수록 두더지가 더 자주·빠르게 나오니 집중력이 필요합니다.", en: "Moles 🐹 pop at random from a 3×3 grid of holes. Tap a mole for +1, but hitting a 💣 bomb costs 2 points. Over 30 seconds the moles appear faster and more often, so stay sharp.", ja: "3×3の穴から🐹モグラがランダムに飛び出します。モグラを叩くと+1点、💣爆弾を叩くと-2点。30秒間、時間が経つほどモグラが速く頻繁に出るので集中が必要です。", zh: "🐹地鼠会从3×3的洞里随机冒出。敲中地鼠+1分，打到💣炸弹-2分。30秒内地鼠会越来越快越频繁，需要专注。", fr: "Les taupes 🐹 sortent au hasard d'une grille de 3×3 trous. Tapez une taupe pour +1, mais toucher une bombe 💣 coûte 2 points. En 30 secondes, les taupes sortent de plus en plus vite.", es: "Los topos 🐹 salen al azar de una cuadrícula de 3×3 agujeros. Golpea un topo para +1, pero golpear una bomba 💣 resta 2 puntos. En 30 segundos, los topos salen cada vez más rápido." },
    faqs: [
      { q: { ko: "점수를 올리는 팁이 있나요?", en: "Any tips for a higher score?", ja: "高得点のコツは？", zh: "有提高分数的技巧吗？", fr: "Des astuces pour un meilleur score ?", es: "¿Consejos para más puntos?" }, a: { ko: "손가락을 화면 가까이 두고 시야를 그리드 전체에 넓게 두세요. 폭탄(💣)은 절대 치지 말고, 애매하면 지나치는 편이 낫습니다. 감점(-2)이 득점(+1)보다 크기 때문입니다.", en: "Keep your finger close to the screen and watch the whole grid with soft focus. Never hit bombs (💣) — when unsure, skip it, since a bomb (−2) hurts more than a mole (+1) helps.", ja: "指を画面近くに置き、グリッド全体をぼんやり見ましょう。爆弾(💣)は絶対に叩かず、迷ったら見送る方が得です。減点(-2)が得点(+1)より大きいからです。", zh: "把手指放在屏幕附近，用余光关注整个网格。绝不要打炸弹(💣)，不确定就跳过，因为扣分(-2)比得分(+1)更大。", fr: "Gardez le doigt près de l'écran et surveillez toute la grille. Ne touchez jamais les bombes (💣) ; dans le doute, laissez, car une bombe (−2) coûte plus qu'une taupe (+1) ne rapporte.", es: "Mantén el dedo cerca de la pantalla y observa toda la cuadrícula. Nunca golpees bombas (💣); ante la duda, déjala, porque una bomba (−2) cuesta más de lo que suma un topo (+1)." } },
      { q: { ko: "최고 점수는 저장되나요?", en: "Is my best score saved?", ja: "自己ベストは保存される？", zh: "最佳成绩会保存吗？", fr: "Mon record est-il sauvegardé ?", es: "¿Se guarda mi récord?" }, a: { ko: "최고 점수가 브라우저(localStorage)에 저장되어 다음에 표시됩니다. 계정은 필요 없습니다.", en: "Your best score is stored in the browser (localStorage) and shown next time. No account needed.", ja: "自己ベストがブラウザ(localStorage)に保存され、次回表示されます。アカウント不要です。", zh: "最佳成绩保存在浏览器(localStorage)，下次显示。无需账号。", fr: "Votre meilleur score est enregistré dans le navigateur (localStorage) et affiché la prochaine fois. Aucun compte requis.", es: "Tu mejor puntuación se guarda en el navegador (localStorage) y se muestra la próxima vez. Sin cuenta." } },
    ],
  },
  "rhythm-tap": {
    origin: { ko: "리듬 탭은 '기타 히어로'·'DDR'·'osu!' 등으로 이어진 리듬 게임 장르를, 떨어지는 노트를 판정선에서 맞히는 4레인 형식으로 단순화한 브라우저 미니 리듬 게임입니다.", en: "Rhythm Tap distills the rhythm-game lineage of Guitar Hero, DDR and osu! into a simple 4-lane falling-note format you play in the browser.", ja: "リズムタップは『ギターヒーロー』『DDR』『osu!』へと続く音ゲーの系譜を、落ちてくるノーツを判定ラインで捉える4レーン形式に簡略化したブラウザ音ゲーです。", zh: "《节奏点击》将《吉他英雄》《DDR》《osu!》的节奏游戏血脉，简化为在判定线接住下落音符的四轨浏览器节奏小游戏。", fr: "Rhythm Tap condense la lignée des jeux de rythme (Guitar Hero, DDR, osu!) en un format simple à 4 voies où l'on frappe les notes qui tombent sur la ligne.", es: "Rhythm Tap resume el linaje de los juegos de ritmo (Guitar Hero, DDR, osu!) en un formato simple de 4 carriles donde golpeas las notas que caen en la línea." },
    how: { ko: "위에서 노트가 4개의 레인을 따라 떨어집니다. 노트가 아래 판정선에 닿는 순간 해당 레인을 탭(데스크탑: D·F·J·K 키)하면 타이밍에 따라 퍼펙트/굿으로 판정되고 점수와 콤보가 오릅니다. 노트를 놓치면 콤보가 끊기고, 5번 놓치면 게임이 끝납니다. 점수가 오를수록 속도가 빨라집니다.", en: "Notes fall down four lanes. Tap the lane (or press D, F, J, K on desktop) the instant its note reaches the hit line — good timing scores Perfect or Good and builds your combo. Missing a note breaks the combo, and five misses end the game. The pace speeds up as your score climbs.", ja: "ノーツが4つのレーンを落ちてきます。ノーツが判定ラインに来た瞬間にそのレーンをタップ(PCはD・F・J・Kキー)すると、タイミングに応じてパーフェクト/グッド判定となり、得点とコンボが上がります。ノーツを逃すとコンボが切れ、5回逃すと終了です。スコアが上がるほど速くなります。", zh: "音符沿四条轨道下落。在音符到达判定线的瞬间点击对应轨道(桌面按 D、F、J、K),根据时机判定为完美/不错并累积连击与分数。漏接音符会中断连击,失误五次即结束。分数越高速度越快。", fr: "Les notes tombent sur quatre voies. Touchez la voie (ou appuyez sur D, F, J, K) à l'instant où sa note atteint la ligne : un bon timing donne Parfait ou Bien et alimente le combo. Rater une note casse le combo, et cinq ratés terminent la partie. Le rythme s'accélère avec le score.", es: "Las notas caen por cuatro carriles. Toca el carril (o pulsa D, F, J, K) justo cuando su nota llega a la línea: un buen timing da Perfecto o Bien y suma combo. Fallar una nota corta el combo, y cinco fallos terminan la partida. El ritmo se acelera al subir la puntuación." },
    faqs: [
      { q: { ko: "소리가 없어도 리듬 게임인가요?", en: "Is it a rhythm game without sound?", ja: "音がなくてもリズムゲーム？", zh: "没有声音也算节奏游戏吗？", fr: "Un jeu de rythme sans son ?", es: "¿Un juego de ritmo sin sonido?" }, a: { ko: "네. 이 게임은 소리 대신 노트의 낙하와 판정선의 시각적 타이밍으로 리듬을 잡는 방식이라, 음소거 환경(도서관·대중교통 등)에서도 편하게 즐길 수 있습니다.", en: "Yes. It uses the visual timing of falling notes and the hit line rather than audio, so you can play comfortably even muted — on the bus, in a library, anywhere.", ja: "はい。音の代わりにノーツの落下と判定ラインの視覚的タイミングでリズムを取る方式なので、消音環境(図書館・公共交通機関など)でも快適に遊べます。", zh: "算。本作用音符下落与判定线的视觉时机来把握节奏,而非声音,因此在静音环境(图书馆、公共交通等)也能舒适游玩。", fr: "Oui. Il repose sur le timing visuel des notes et de la ligne plutôt que sur l'audio, donc jouable en silence — dans le bus, en bibliothèque, partout.", es: "Sí. Se basa en el timing visual de las notas y la línea en vez del audio, así que puedes jugar en silencio: en el bus, en la biblioteca, donde sea." } },
      { q: { ko: "점수를 높이는 팁이 있나요?", en: "Any tips for a higher score?", ja: "高得点のコツは？", zh: "有提高分数的技巧吗？", fr: "Des astuces pour un meilleur score ?", es: "¿Consejos para más puntos?" }, a: { ko: "콤보가 길수록 노트당 점수가 커지므로 미스를 피하는 것이 핵심입니다. 노트를 미리 보고 손가락(또는 손)을 각 레인에 대기시켜 두면 빠른 구간에서도 판정이 안정됩니다.", en: "Longer combos boost the points per note, so avoiding misses matters most. Read notes early and keep a finger (or hand) ready over each lane to stay accurate through the fast sections.", ja: "コンボが長いほどノーツ当たりの得点が増えるので、ミスを避けることが最重要です。ノーツを先読みし、各レーンに指(手)を待機させておくと高速地帯でも安定します。", zh: "连击越长,每个音符得分越高,所以避免失误最关键。提前看音符,并让手指(手)在各轨道待命,能在快节奏段落保持稳定。", fr: "Des combos plus longs augmentent les points par note, donc éviter les ratés prime. Anticipez les notes et gardez un doigt (ou la main) prêt sur chaque voie pour rester précis dans les passages rapides.", es: "Los combos largos aumentan los puntos por nota, así que evitar fallos es lo más importante. Lee las notas con antelación y mantén un dedo (o la mano) listo en cada carril para mantener la precisión en las partes rápidas." } },
      { q: { ko: "최고 점수는 저장되나요?", en: "Is my best score saved?", ja: "自己ベストは保存される？", zh: "最佳成绩会保存吗？", fr: "Mon record est-il sauvegardé ?", es: "¿Se guarda mi récord?" }, a: { ko: "최고 점수가 브라우저(localStorage)에 저장되어 다음에 표시됩니다. 계정은 필요 없습니다.", en: "Your best score is stored in the browser (localStorage) and shown next time. No account needed.", ja: "自己ベストがブラウザ(localStorage)に保存され、次回表示されます。アカウント不要です。", zh: "最佳成绩保存在浏览器(localStorage),下次显示。无需账号。", fr: "Votre meilleur score est enregistré dans le navigateur (localStorage) et affiché la prochaine fois. Aucun compte requis.", es: "Tu mejor puntuación se guarda en el navegador (localStorage) y se muestra la próxima vez. Sin cuenta." } },
    ],
  },
  "cave-dash": {
    origin: { ko: "케이브 대시는 2013년 '플래피 버드'로 폭발적 인기를 끈 원탭 엔들리스 장르를 잇는, 중력과 탭 한 번으로 조작하는 미니 아케이드입니다.", en: "Cave Dash follows the one-tap endless genre that exploded with 2013's 'Flappy Bird' — a mini arcade controlled by gravity and a single tap.", ja: "ケイブダッシュは2013年『フラッピーバード』で大流行したワンタップ・エンドレス系譜を継ぐ、重力とタップだけで遊ぶミニアーケードです。", zh: "《洞穴冲刺》延续了2013年《Flappy Bird》引爆的单点无尽玩法，仅凭重力和一次点击操作的迷你街机。", fr: "Cave Dash s'inscrit dans le genre endless en un tap popularisé par 'Flappy Bird' (2013), un mini-arcade contrôlé par la gravité et un simple tap.", es: "Cave Dash sigue el género endless de un toque que estalló con 'Flappy Bird' (2013), un mini arcade controlado por la gravedad y un solo toque." },
    how: { ko: "화면을 탭(또는 클릭·스페이스)하면 우주선이 위로 떠오르고, 놓으면 중력으로 내려갑니다. 위아래 벽 사이의 틈을 통과할 때마다 점수가 오르며, 점수가 오를수록 속도가 빨라집니다. 벽이나 천장·바닥에 부딪히면 끝납니다.", en: "Tap the screen (or click / press Space) to lift the ship; release and gravity pulls it down. Each gap you pass between the top and bottom walls scores a point, and the pace speeds up as your score climbs. Hitting a wall, the ceiling or the floor ends the run.", ja: "画面をタップ(またはクリック・スペース)すると宇宙船が上昇し、離すと重力で下降します。上下の壁の隙間を抜けるたびに得点し、スコアが上がるほど速くなります。壁や天井・床に当たると終了です。", zh: "点击屏幕(或点鼠标/空格)让飞船上升，松开后重力下坠。每穿过上下墙之间的缝隙得一分，分数越高速度越快。撞到墙、天花板或地面即结束。", fr: "Touchez l'écran (ou cliquez / Espace) pour faire monter le vaisseau ; relâchez et la gravité le fait descendre. Chaque trou franchi entre les murs rapporte un point, et le rythme s'accélère avec le score. Toucher un mur, le plafond ou le sol met fin à la partie.", es: "Toca la pantalla (o clic / Espacio) para elevar la nave; suelta y la gravedad la baja. Cada hueco que cruzas entre los muros suma un punto, y el ritmo se acelera al subir la puntuación. Chocar con un muro, el techo o el suelo termina la partida." },
    faqs: [
      { q: { ko: "조작이 어렵게 느껴져요. 팁이 있나요?", en: "It feels hard to control — any tips?", ja: "操作が難しいです。コツは？", zh: "感觉很难操作，有技巧吗？", fr: "Difficile à contrôler — des astuces ?", es: "Se siente difícil de controlar, ¿algún consejo?" }, a: { ko: "한 번에 크게 탭하기보다 짧게 여러 번 탭해 높이를 미세하게 유지하세요. 틈의 중앙을 노리고, 다음 벽을 미리 보며 리듬을 잡는 것이 핵심입니다.", en: "Instead of one big tap, use short, frequent taps to hover and fine-tune your height. Aim for the middle of each gap and look ahead to the next wall to find a rhythm.", ja: "一度に大きくタップするより、短く小刻みにタップして高さを微調整しましょう。隙間の中央を狙い、次の壁を先読みしてリズムを掴むのがコツです。", zh: "不要一次大力点击，用短促多次的点击来微调高度。瞄准缝隙中央，并提前看下一堵墙来把握节奏。", fr: "Plutôt qu'un grand tap, faites de petits taps fréquents pour ajuster votre hauteur. Visez le milieu de chaque trou et anticipez le mur suivant pour trouver le rythme.", es: "En vez de un toque grande, da toques cortos y frecuentes para ajustar la altura. Apunta al centro de cada hueco y mira el siguiente muro para encontrar el ritmo." } },
      { q: { ko: "키보드로도 할 수 있나요?", en: "Can I play with a keyboard?", ja: "キーボードでも遊べる？", zh: "能用键盘玩吗？", fr: "Puis-je jouer au clavier ?", es: "¿Puedo jugar con teclado?" }, a: { ko: "네. 스페이스바로 상승할 수 있어 데스크탑에서도 편하게 플레이할 수 있고, 모바일에서는 화면 탭으로 조작합니다.", en: "Yes — press Space to lift on desktop, or tap the screen on mobile.", ja: "はい。デスクトップではスペースキーで上昇でき、モバイルでは画面タップで操作します。", zh: "可以。桌面用空格键上升，手机则点击屏幕操作。", fr: "Oui — appuyez sur Espace sur ordinateur, ou touchez l'écran sur mobile.", es: "Sí: pulsa Espacio en el ordenador o toca la pantalla en el móvil." } },
      { q: { ko: "최고 점수는 저장되나요?", en: "Is my best score saved?", ja: "自己ベストは保存される？", zh: "最佳成绩会保存吗？", fr: "Mon record est-il sauvegardé ?", es: "¿Se guarda mi récord?" }, a: { ko: "최고 점수가 브라우저(localStorage)에 저장되어 다음에 표시됩니다. 계정은 필요 없습니다.", en: "Your best score is stored in the browser (localStorage) and shown next time. No account needed.", ja: "自己ベストがブラウザ(localStorage)に保存され、次回表示されます。アカウント不要です。", zh: "最佳成绩保存在浏览器(localStorage)，下次显示。无需账号。", fr: "Votre meilleur score est enregistré dans le navigateur (localStorage) et affiché la prochaine fois. Aucun compte requis.", es: "Tu mejor puntuación se guarda en el navegador (localStorage) y se muestra la próxima vez. Sin cuenta." } },
    ],
  },
  "stack-tower": {
    origin: { ko: "스택 타워는 2016년 켓치업의 'Stack'으로 대중화된 타이밍 기반 블록 쌓기 장르를 잇는 원탭 미니 아케이드입니다.", en: "Stack Tower follows the timing-based block-stacking genre popularized by Ketchapp's 2016 hit 'Stack' — a one-tap mini arcade.", ja: "スタックタワーは2016年Ketchappの『Stack』で広まったタイミング型ブロック積み上げ系譜を継ぐ、ワンタップのミニアーケードです。", zh: "《叠塔》延续了2016年Ketchapp热门作品《Stack》带火的计时型叠方块玩法，是一款单点迷你街机。", fr: "Stack Tower s'inscrit dans le genre d'empilement de blocs basé sur le timing, popularisé par le hit 'Stack' de Ketchapp (2016), un mini-arcade en un tap.", es: "Stack Tower sigue el género de apilar bloques basado en el ritmo, popularizado por el éxito 'Stack' de Ketchapp (2016), un mini arcade de un toque." },
    how: { ko: "블록이 좌우로 움직이는 동안 화면을 탭(또는 클릭·스페이스)하면 그 자리에 떨어집니다. 아래 블록과 겹친 부분만 남고 삐져나온 부분은 잘려 나가, 타워는 점점 좁아집니다. 정중앙에 가깝게 맞추면 '퍼펙트'로 폭이 유지되고 콤보가 쌓입니다. 겹치는 부분이 하나도 없으면 게임이 끝나며, 쌓은 높이가 점수입니다.", en: "While the block slides side to side, tap the screen (or click / press Space) to drop it. Only the part that overlaps the block below survives — the overhang is shaved off, so the tower narrows over time. Land it near dead-centre for a 'perfect': the width holds and your combo grows. If nothing overlaps, the run ends; your height is the score.", ja: "ブロックが左右に動いている間に画面をタップ(またはクリック・スペース)すると落下します。下のブロックと重なった部分だけ残り、はみ出した部分は削られてタワーは徐々に細くなります。ど真ん中に近く合わせると『パーフェクト』で幅が保たれ、コンボが増えます。重なりがゼロだと終了、積んだ高さがスコアです。", zh: "方块左右移动时点击屏幕(或点鼠标/空格)让它落下。只有与下方方块重叠的部分保留，超出部分被削掉，塔会越来越窄。对齐到接近正中即为『完美』，宽度保持并累积连击。若毫无重叠则结束，堆叠高度即为分数。", fr: "Pendant que le bloc glisse, touchez l'écran (ou cliquez / Espace) pour le lâcher. Seule la partie qui chevauche le bloc du dessous reste ; le débord est rogné, donc la tour se rétrécit. Visez le centre pour un « parfait » : la largeur tient et le combo grimpe. Sans chevauchement, la partie s'arrête ; votre hauteur est le score.", es: "Mientras el bloque se desliza, toca la pantalla (o clic / Espacio) para soltarlo. Solo queda la parte que se solapa con el bloque de abajo; lo que sobresale se recorta, así que la torre se estrecha. Céntralo para un «perfecto»: se mantiene el ancho y sube el combo. Si no hay solape, termina la partida; tu altura es la puntuación." },
    faqs: [
      { q: { ko: "'퍼펙트'는 어떻게 내나요?", en: "How do I get a 'perfect'?", ja: "『パーフェクト』はどう出す？", zh: "如何获得『完美』？", fr: "Comment obtenir un « parfait » ?", es: "¿Cómo consigo un «perfecto»?" }, a: { ko: "떨어뜨린 블록이 아래 블록과 거의 정확히 겹치면 퍼펙트입니다. 퍼펙트를 내면 폭이 잘리지 않고 오히려 조금 넓어지며, 연속으로 성공하면 콤보가 쌓입니다. 블록의 왼쪽 끝이 아래 블록의 왼쪽 끝과 맞는 순간을 노리세요.", en: "You get a perfect when the dropped block lines up almost exactly with the one below. A perfect keeps the width — it even grows back slightly — and consecutive perfects build a combo. Watch for the moment the block's left edge matches the edge below it.", ja: "落としたブロックが下のブロックとほぼ正確に重なるとパーフェクトです。パーフェクトなら幅が削られず少し広がり、連続で決めるとコンボが増えます。ブロックの左端が下の左端に揃う瞬間を狙いましょう。", zh: "落下的方块与下方方块几乎完全对齐时即为完美。完美不会削减宽度，甚至略微恢复，连续完美会累积连击。抓住方块左边缘与下方左边缘对齐的瞬间。", fr: "Un parfait s'obtient quand le bloc lâché s'aligne presque exactement avec celui du dessous. Un parfait conserve la largeur — elle repousse même un peu — et les parfaits consécutifs forment un combo. Guettez l'instant où le bord gauche du bloc rejoint celui du dessous.", es: "Consigues un perfecto cuando el bloque soltado se alinea casi exactamente con el de abajo. Un perfecto mantiene el ancho —incluso crece un poco— y los perfectos seguidos forman un combo. Vigila el momento en que el borde izquierdo del bloque coincide con el de abajo." } },
      { q: { ko: "키보드로도 할 수 있나요?", en: "Can I play with a keyboard?", ja: "キーボードでも遊べる？", zh: "能用键盘玩吗？", fr: "Puis-je jouer au clavier ?", es: "¿Puedo jugar con teclado?" }, a: { ko: "네. 스페이스바로 블록을 떨어뜨릴 수 있어 데스크탑에서도 편하게 플레이할 수 있고, 모바일에서는 화면 탭으로 조작합니다.", en: "Yes — press Space to drop the block on desktop, or tap the screen on mobile.", ja: "はい。デスクトップではスペースキーでブロックを落とせ、モバイルでは画面タップで操作します。", zh: "可以。桌面用空格键落下方块，手机则点击屏幕操作。", fr: "Oui — appuyez sur Espace pour lâcher le bloc sur ordinateur, ou touchez l'écran sur mobile.", es: "Sí: pulsa Espacio para soltar el bloque en el ordenador o toca la pantalla en el móvil." } },
      { q: { ko: "최고 점수는 저장되나요?", en: "Is my best score saved?", ja: "自己ベストは保存される？", zh: "最佳成绩会保存吗？", fr: "Mon record est-il sauvegardé ?", es: "¿Se guarda mi récord?" }, a: { ko: "최고 높이가 브라우저(localStorage)에 저장되어 다음에 표시됩니다. 계정은 필요 없습니다.", en: "Your best height is stored in the browser (localStorage) and shown next time. No account needed.", ja: "自己ベストの高さがブラウザ(localStorage)に保存され、次回表示されます。アカウント不要です。", zh: "最高高度保存在浏览器(localStorage)，下次显示。无需账号。", fr: "Votre meilleure hauteur est enregistrée dans le navigateur (localStorage) et affichée la prochaine fois. Aucun compte requis.", es: "Tu mejor altura se guarda en el navegador (localStorage) y se muestra la próxima vez. Sin cuenta." } },
    ],
  },
  "spatial-memory": {
    origin: {
      ko: "공간 기억은 '무엇을' 보았는지가 아니라 '어디에 있었는지'를 붙잡는 기억으로, 심리학에서는 항목 기억과 구분해 다룹니다. 앳킨슨-쉬프린의 다중 기억 모형에서 단기 저장에 들어온 정보는 되뇌기를 거쳐야 장기 저장으로 넘어가는데, 위치 정보는 시공간 잡기장(visuospatial sketchpad)이라는 별도 경로로 처리된다는 것이 정설입니다. 이 게임은 그 차이를 직접 체감하도록 만들어졌습니다.",
      en: "Spatial memory holds on to where something was, not what it was — psychology treats it separately from item memory. In the Atkinson–Shiffrin multi-store model, information entering short-term storage needs rehearsal to reach long-term storage, and positional information is generally held on its own channel, the visuospatial sketchpad. This game is built to let you feel that difference directly.",
      ja: "空間記憶は「何を」見たかではなく「どこにあったか」を保持する記憶で、心理学では項目記憶と区別されます。アトキンソン-シフリンの多重貯蔵モデルでは短期貯蔵に入った情報はリハーサルを経て長期貯蔵へ移りますが、位置情報は視空間スケッチパッドという別経路で処理されるとされます。このゲームはその違いを体感するために作られています。",
      zh: "空间记忆保存的是「在哪里」而不是「是什么」，心理学将它与条目记忆区分开来。在阿特金森-希夫林的多重存储模型中，进入短时存储的信息需经复述才能转入长时存储，而位置信息通常由视空间模板这一独立通道处理。本游戏正是为了让你直接体会这一差异。",
      fr: "La mémoire spatiale retient où se trouvait une chose, pas ce qu'elle était — la psychologie la distingue de la mémoire des items. Dans le modèle multi-magasins d'Atkinson et Shiffrin, l'information en mémoire à court terme doit être répétée pour atteindre la mémoire à long terme, et la position est traitée par un canal propre, le calepin visuo-spatial. Ce jeu vous fait éprouver cette différence.",
      es: "La memoria espacial retiene dónde estaba algo, no qué era — la psicología la distingue de la memoria de ítems. En el modelo multialmacén de Atkinson y Shiffrin, la información en la memoria a corto plazo necesita repaso para pasar a la de largo plazo, y la posición se procesa en un canal propio, la agenda visoespacial. Este juego te hace sentir esa diferencia.",
    },
    how: {
      ko: "표식들이 3D 공간에 흩어져 있고, 그중 몇 개가 순서대로 빛납니다. 빛이 꺼지면 같은 순서로 선택하세요. 레벨이 오르면 표식이 등 뒤까지 퍼지므로 ← → 로 시야를 돌려 찾아야 합니다. 한 번 틀리면 그 판은 끝납니다.",
      en: "Markers are scattered through a 3D space and some of them light up in order. When the lights go out, select them in the same order. As levels rise the markers spread behind you, so use ← → to turn the view and find them. One wrong pick ends the run.",
      ja: "3D空間に散らばったマーカーのいくつかが順番に光ります。光が消えたら同じ順に選んでください。レベルが上がるとマーカーは背後まで広がるので、← → で視点を回して探します。一度間違えるとそのラウンドは終了です。",
      zh: "标记散布在 3D 空间中，其中几个会按顺序发光。灯灭后请按相同顺序选择。随着关卡提升，标记会扩散到你身后，需要用 ← → 转动视角寻找。选错一次本局即结束。",
      fr: "Des repères sont dispersés dans un espace 3D et certains s'allument dans un ordre donné. Quand la lumière s'éteint, sélectionnez-les dans le même ordre. Aux niveaux élevés ils passent derrière vous : utilisez ← → pour tourner la vue. Une seule erreur termine la partie.",
      es: "Los marcadores están repartidos por un espacio 3D y algunos se iluminan en orden. Cuando se apaguen, selecciónalos en el mismo orden. Al subir de nivel se extienden detrás de ti: usa ← → para girar la vista. Un solo fallo termina la partida.",
    },
    faqs: [
      {
        q: { ko: "일반 짝맞추기 기억력 게임과 뭐가 다른가요?", en: "How is this different from a memory match game?", ja: "普通の神経衰弱と何が違いますか？", zh: "这和普通的翻牌记忆游戏有什么不同？", fr: "En quoi est-ce différent d'un jeu de paires ?", es: "¿En qué se diferencia de un juego de parejas?" },
        a: { ko: "짝맞추기는 '어떤 그림이었나'를 묻는 항목 기억이고, 이 게임은 '어느 방향 어느 깊이였나'를 묻는 공간 기억입니다. 표식이 등 뒤에도 놓이기 때문에 평면으로 옮기면 과제 자체가 사라집니다.", en: "A match game asks which picture it was — item memory. This asks which direction and depth it was — spatial memory. Markers sit behind you too, so flattening the space would remove the task itself.", ja: "神経衰弱は「どの絵だったか」を問う項目記憶、こちらは「どの方向・どの奥行きだったか」を問う空間記憶です。マーカーは背後にも置かれるため、平面にすると課題自体が消えます。", zh: "翻牌游戏问的是「是哪张图」，属于条目记忆；本游戏问的是「在哪个方向、多深」，属于空间记忆。标记也会出现在你身后，压成平面后任务本身就不存在了。", fr: "Un jeu de paires demande quelle image c'était — mémoire des items. Ici on demande quelle direction et quelle profondeur — mémoire spatiale. Des repères sont aussi derrière vous : aplatir l'espace supprimerait la tâche.", es: "Un juego de parejas pregunta qué imagen era — memoria de ítems. Este pregunta en qué dirección y profundidad — memoria espacial. También hay marcadores detrás de ti: aplanar el espacio eliminaría la tarea." },
      },
      {
        q: { ko: "마우스 없이 키보드만으로 할 수 있나요?", en: "Can I play with only a keyboard?", ja: "キーボードだけで遊べますか？", zh: "只用键盘可以玩吗？", fr: "Peut-on jouer au clavier seul ?", es: "¿Se puede jugar solo con teclado?" },
        a: { ko: "네. 표식은 실제 버튼이라 Tab으로 이동해 Enter로 선택하고, ← → 로 시야를 돌립니다. 3D를 지원하지 않는 브라우저에서는 같은 표식이 평면으로 배치되며 규칙은 동일합니다.", en: "Yes. The markers are real buttons: Tab to one and press Enter, and use ← → to turn the view. On browsers without 3D support the same markers are laid out flat and the rules are unchanged.", ja: "はい。マーカーは実際のボタンなので Tab で移動し Enter で選択、← → で視点を回します。3D非対応のブラウザでは同じマーカーが平面配置され、ルールは同じです。", zh: "可以。标记是真正的按钮，用 Tab 移动后按 Enter 选择，用 ← → 转动视角。在不支持 3D 的浏览器中，同样的标记会平面排列，规则不变。", fr: "Oui. Les repères sont de vrais boutons : atteignez-les avec Tab et validez avec Entrée, et tournez la vue avec ← →. Sans support 3D, les mêmes repères sont disposés à plat, règles inchangées.", es: "Sí. Los marcadores son botones reales: llega con Tab y pulsa Enter, y gira la vista con ← →. Sin soporte 3D los mismos marcadores se colocan en plano y las reglas no cambian." },
      },
      {
        q: { ko: "기록은 저장되나요?", en: "Are records saved?", ja: "記録は保存されますか？", zh: "记录会保存吗？", fr: "Les records sont-ils sauvegardés ?", es: "¿Se guardan los récords?" },
        a: { ko: "최고 점수와 도달 레벨이 브라우저에만 저장됩니다. 서버로 전송되지 않으며, 다음에 시작할 때 도달했던 레벨에서 이어집니다.", en: "Your best score and reached level are stored in your browser only. Nothing is sent to a server, and your next run starts at the level you reached.", ja: "最高スコアと到達レベルはブラウザ内にのみ保存されます。サーバーには送信されず、次回は到達レベルから始まります。", zh: "最高分和到达的关卡仅保存在浏览器中，不会发送到服务器，下次将从你到达的关卡继续。", fr: "Votre meilleur score et le niveau atteint restent dans votre navigateur. Rien n'est envoyé à un serveur, et la partie suivante reprend à ce niveau.", es: "Tu mejor puntuación y el nivel alcanzado se guardan solo en tu navegador. Nada se envía a un servidor y la siguiente partida empieza en ese nivel." },
      },
    ],
    // ⚠️ 실측(2026-07-27 curl): ko 2개·en 1개만 200이고 ja/zh/fr/es 는 404다.
    // 없는 로케일에는 링크하지 않는다.
    related: {
      ko: [
        { href: "https://blog.oiyo.net/ko/education-psychology-ch8/", label: "기억의 심리학 — 앳킨슨-쉬프린 다중 기억 모형" },
      ],
      en: [
        { href: "https://blog.oiyo.net/en/education-psychology-ch8/", label: "The psychology of memory — the Atkinson–Shiffrin model" },
      ],
      ja: [
        { href: "https://blog.oiyo.net/ja/education-psychology-ch8/", label: "記憶の心理学 — アトキンソン-シフリンモデル" },
      ],
    },
  },
  "spirit-vale": {
    origin: {
      ko: "정령 골짜기는 십이지(十二支)와 오행(五行)이라는 동아시아의 두 분류 체계를 그대로 게임 규칙으로 옮긴 오픈월드 수집 게임입니다. 십이지의 열두 지지에는 전통적으로 각각 오행 속성이 배정되어 있는데(子亥=水, 丑辰未戌=土, 寅卯=木, 巳午=火, 申酉=金) 이 게임의 열두 정령은 그 배정을 그대로 따릅니다. 토(土)에 넷이 몰린 불균형도 임의로 고르지 않고 전통 그대로 두었습니다. 창작 캐릭터를 쓰되 분류 체계만은 지어내지 않는다는 것이 이 게임의 설계 원칙입니다.",
      en: "Spirit Vale is an open-world collector that turns two East Asian classification systems — the twelve earthly branches and the Five Phases (오행/wuxing) — directly into game rules. Each of the twelve branches traditionally carries a phase (rat and pig are water, ox/dragon/goat/dog are earth, tiger and rabbit wood, snake and horse fire, monkey and rooster metal), and the twelve spirits here follow that assignment exactly. Even the lopsided result — four earth spirits against two of everything else — is left as tradition has it rather than evened out. The creatures are original; the taxonomy is not invented.",
      ja: "精霊の谷は、十二支と五行という東アジアの二つの分類体系をそのままゲームのルールに移したオープンワールド収集ゲームです。十二支の各支には伝統的に五行の属性が割り当てられており(子亥=水、丑辰未戌=土、寅卯=木、巳午=火、申酉=金)、本作の十二の精霊はその割り当てに正確に従います。土に四つ偏る不均衡も均さずに伝統のまま残しました。キャラクターは創作、分類体系は創作しない — それが本作の設計原則です。",
      zh: "《精灵山谷》是一款把十二地支与五行这两套东亚分类体系直接转化为游戏规则的开放世界收集游戏。十二地支传统上各自对应五行属性(子亥属水、丑辰未戌属土、寅卯属木、巳午属火、申酉属金)，本作十二精灵完全遵循这一对应。连土占四席的不均衡也照传统保留，未作平均化处理。角色为原创，分类体系则不杜撰。",
      fr: "Val des Esprits est un jeu de collecte en monde ouvert qui transpose directement en règles deux systèmes de classification est-asiatiques : les douze branches terrestres et les Cinq Phases (wuxing). Chaque branche porte traditionnellement une phase (rat et cochon pour l'eau, bœuf/dragon/chèvre/chien pour la terre, tigre et lapin pour le bois, serpent et cheval pour le feu, singe et coq pour le métal), et les douze esprits suivent exactement cette attribution. Même le déséquilibre — quatre esprits de terre contre deux pour les autres — est conservé tel quel. Les créatures sont originales ; la taxonomie ne l'est pas.",
      es: "Valle de los Espíritus es un juego de colección en mundo abierto que convierte directamente en reglas dos sistemas de clasificación de Asia Oriental: las doce ramas terrestres y las Cinco Fases (wuxing). Cada rama lleva tradicionalmente una fase (rata y cerdo son agua; buey, dragón, cabra y perro, tierra; tigre y conejo, madera; serpiente y caballo, fuego; mono y gallo, metal), y los doce espíritus siguen esa asignación exactamente. Incluso el desequilibrio —cuatro espíritus de tierra frente a dos de cada otra fase— se conserva tal cual. Las criaturas son originales; la taxonomía no está inventada.",
    },
    how: {
      ko: "WASD 또는 방향키로 골짜기를 걸어다닙니다(모바일은 화면을 끌어서 이동). 지도 곳곳에 색이 칠해진 수풀이 있고, 그 안을 걸으면 일정 거리마다 정령이 나타날 수 있습니다. 수풀마다 선호하는 오행이 달라서 어느 방향으로 가느냐가 어떤 정령을 만나느냐를 정합니다. 만난 정령은 기록하거나 놓아줄 수 있고, 아래 도감에 채워집니다. '다른 골짜기' 버튼을 누르면 지형·나무·수풀 배치가 전부 새로 생성됩니다.",
      en: "Walk the valley with WASD or the arrow keys (on mobile, drag the screen to move). Tinted thickets are scattered across the map, and walking inside one gives a spirit a chance to appear every so many steps. Each thicket favours a different phase, so the direction you explore decides which spirits you meet. Record or release what you find; recorded spirits fill the collection below. 'New valley' regenerates the terrain, trees and thickets from scratch.",
      ja: "WASDまたは矢印キーで谷を歩きます(モバイルは画面をドラッグ)。マップ各所に色のついた草むらがあり、その中を歩くと一定距離ごとに精霊が現れることがあります。草むらごとに好む五行が異なるため、どの方向へ進むかが出会う精霊を決めます。出会った精霊は記録するか逃がすかを選べ、記録すると下の図鑑が埋まります。「別の谷」を押すと地形・木・草むらの配置がすべて再生成されます。",
      zh: "用 WASD 或方向键在山谷中行走(手机上拖动屏幕移动)。地图各处分布着带颜色的草丛，在其中行走每隔一段距离就可能出现精灵。每片草丛偏好的五行不同，因此你朝哪个方向探索决定了会遇到哪些精灵。遇到的精灵可以记录或放走，记录后会填入下方图鉴。点击「换个山谷」会重新生成地形、树木与草丛布局。",
      fr: "Parcourez la vallée avec ZQSD ou les flèches (sur mobile, glissez l'écran). Des fourrés colorés parsèment la carte : y marcher donne à un esprit une chance d'apparaître tous les quelques pas. Chaque fourré privilégie une phase différente, donc la direction que vous explorez détermine les esprits rencontrés. Enregistrez ou relâchez vos trouvailles ; les esprits enregistrés remplissent la collection ci-dessous. « Autre vallée » régénère entièrement le relief, les arbres et les fourrés.",
      es: "Recorre el valle con WASD o las flechas (en móvil, arrastra la pantalla). Hay matorrales con color repartidos por el mapa, y caminar dentro de uno da a un espíritu la posibilidad de aparecer cada ciertos pasos. Cada matorral favorece una fase distinta, así que la dirección que explores decide qué espíritus encuentras. Registra o libera lo que encuentres; los registrados llenan la colección de abajo. «Otro valle» regenera por completo el terreno, los árboles y los matorrales.",
    },
    faqs: [
      {
        q: { ko: "오행 상성이 일반적인 속성 상성표와 어떻게 다른가요?", en: "How is the Five Phase system different from a normal type chart?", ja: "五行の相性は普通の属性相性表と何が違いますか？", zh: "五行相性和普通的属性克制表有什么不同？", fr: "En quoi les Cinq Phases diffèrent-elles d'un tableau de types classique ?", es: "¿En qué se diferencian las Cinco Fases de una tabla de tipos normal?" },
        a: { ko: "보통의 상성표는 '강함/약함/보통' 세 가지뿐이지만, 오행에는 상생(相生)과 상극(相剋) 두 개의 순환이 따로 있습니다. 그래서 두 속성 사이의 관계가 다섯 가지로 갈립니다 — 내가 극하는 상대(강함), 나를 극하는 상대(약함), 내가 생해주는 상대(내가 상대를 키워주므로 오히려 약해짐), 나를 생해주는 상대(힘을 받아 강해짐), 같은 속성(중립). 목이 화를 공격하면 불을 키워주는 셈이라 위력이 떨어지는 것이 이 체계의 특징입니다.", en: "A typical chart has three outcomes — strong, weak, neutral. 오행 has two separate cycles, generating (相生) and overcoming (相剋), which split the relationship between any two phases five ways: the phase you overcome (strong), the one that overcomes you (weak), the one you generate (weak, because you are feeding it), the one that generates you (strong, because it empowers you), and your own phase (neutral). Wood attacking fire is literally feeding the flame, so it lands softer — that asymmetry is the point.", ja: "普通の相性表は「強い・弱い・普通」の三つですが、五行には相生と相剋という二つの循環が別々に存在します。そのため二つの属性の関係は五通りに分かれます — 自分が剋する相手(強い)、自分を剋する相手(弱い)、自分が生じる相手(相手を育ててしまうため弱くなる)、自分を生じる相手(力を受けて強くなる)、同属性(中立)。木が火を攻めると炎を育てることになり威力が落ちる、という非対称性が本体系の特徴です。", zh: "普通的克制表只有「强、弱、普通」三种结果，而五行有相生与相剋两套独立循环，因此任意两个属性之间的关系分为五种——我所剋者(强)、剋我者(弱)、我所生者(因为在滋养对方，反而变弱)、生我者(受其增益而变强)、同属性(中立)。木攻击火等于助燃，威力反而下降，这种不对称正是该体系的精髓。", fr: "Un tableau classique n'a que trois issues : fort, faible, neutre. Le wuxing possède deux cycles distincts, l'engendrement (相生) et la domination (相剋), qui divisent la relation entre deux phases en cinq cas : celle que vous dominez (fort), celle qui vous domine (faible), celle que vous engendrez (faible, car vous la nourrissez), celle qui vous engendre (fort, car elle vous renforce) et votre propre phase (neutre). Le bois qui attaque le feu alimente littéralement la flamme, donc il frappe moins fort — c'est là tout l'intérêt.", es: "Una tabla típica tiene tres resultados: fuerte, débil, neutro. El wuxing tiene dos ciclos separados, generación (相生) y dominación (相剋), que dividen la relación entre dos fases en cinco casos: la que dominas (fuerte), la que te domina (débil), la que generas (débil, porque la estás alimentando), la que te genera (fuerte, porque te potencia) y tu propia fase (neutro). La madera que ataca al fuego literalmente alimenta la llama, así que golpea más flojo: esa asimetría es la gracia." },
      },
      {
        q: { ko: "골짜기는 매번 똑같나요?", en: "Is the valley the same every time?", ja: "谷は毎回同じですか？", zh: "山谷每次都一样吗？", fr: "La vallée est-elle identique à chaque fois ?", es: "¿El valle es igual cada vez?" },
        a: { ko: "같은 골짜기 번호라면 언제 어느 기기에서 열어도 지형·나무·수풀이 완전히 동일합니다. 난수를 쓰지 않고 번호에서 결정론적으로 생성하기 때문입니다. '다른 골짜기' 버튼을 누르면 번호가 바뀌어 완전히 새로운 지형이 만들어집니다.", en: "For a given valley number the terrain, trees and thickets are byte-for-byte identical on every device and every reload, because the world is generated deterministically from that number rather than from random noise. Press 'New valley' to move to the next number and get an entirely different landscape.", ja: "同じ谷の番号であれば、いつどの端末で開いても地形・木・草むらは完全に同一です。乱数ではなく番号から決定論的に生成しているためです。「別の谷」を押すと番号が変わり、まったく新しい地形が作られます。", zh: "只要山谷编号相同，无论何时在哪台设备打开，地形、树木与草丛都完全一致，因为世界是由该编号确定性生成的，而非随机噪声。点击「换个山谷」会切换编号并生成全新的地貌。", fr: "Pour un numéro de vallée donné, le relief, les arbres et les fourrés sont rigoureusement identiques sur tous les appareils et à chaque rechargement, car le monde est généré de façon déterministe à partir de ce numéro et non d'un bruit aléatoire. « Autre vallée » passe au numéro suivant et produit un paysage entièrement différent.", es: "Para un número de valle dado, el terreno, los árboles y los matorrales son idénticos en todos los dispositivos y en cada recarga, porque el mundo se genera de forma determinista a partir de ese número y no de ruido aleatorio. Pulsa «Otro valle» para pasar al siguiente número y obtener un paisaje completamente distinto." },
      },
      {
        q: { ko: "3D가 안 열리거나 화면이 버벅입니다.", en: "The 3D won't open, or it runs slowly.", ja: "3Dが開かない、または動作が重いです。", zh: "3D 打不开或者运行卡顿。", fr: "La 3D ne s'ouvre pas ou tourne lentement.", es: "El 3D no abre o va lento." },
        a: { ko: "WebGL을 지원하지 않는 브라우저에서는 골짜기 대신 안내 문구가 표시되며, 열두 정령 도감과 오행 상성표는 그대로 볼 수 있습니다. 성능은 기기에 맞춰 자동 조절됩니다 — 화면이 좁거나 CPU 코어가 적은 기기에서는 풀잎 수를 크게 줄여 그립니다. 또한 운영체제에서 '동작 줄이기'를 켜두면 바람에 흔들리는 애니메이션이 모두 정지합니다.", en: "On browsers without WebGL the valley is replaced by a notice, and the twelve-spirit collection and the matchup table remain fully readable. Performance adapts to the device automatically — narrow screens and machines with fewer CPU cores draw far fewer grass blades. If your system has 'reduce motion' enabled, the wind animation is switched off entirely rather than merely slowed.", ja: "WebGL非対応のブラウザでは谷の代わりに案内が表示され、十二精霊の図鑑と五行相性表はそのまま閲覧できます。性能は端末に応じて自動調整され、画面が狭い端末やCPUコアの少ない端末では草の本数を大幅に減らして描画します。またOSで「視差効果を減らす」を有効にしていると、風で揺れるアニメーションは完全に停止します。", zh: "在不支持 WebGL 的浏览器中，山谷会被替换为提示文字，十二精灵图鉴与五行相性表仍可正常查看。性能会根据设备自动调整——屏幕较窄或 CPU 核心较少的设备会大幅减少草叶数量。若系统开启了「减少动态效果」，随风摆动的动画将完全停止而非只是放慢。", fr: "Sur les navigateurs sans WebGL, la vallée est remplacée par un avis, et la collection des douze esprits ainsi que le tableau des correspondances restent entièrement lisibles. Les performances s'adaptent automatiquement : les écrans étroits et les machines à faible nombre de cœurs dessinent beaucoup moins de brins d'herbe. Si « réduire les animations » est activé sur votre système, l'animation du vent est totalement désactivée et non simplement ralentie.", es: "En navegadores sin WebGL el valle se sustituye por un aviso, y la colección de doce espíritus y la tabla de correspondencias siguen siendo legibles. El rendimiento se adapta al dispositivo automáticamente: las pantallas estrechas y los equipos con menos núcleos dibujan muchas menos briznas de hierba. Si tu sistema tiene activado «reducir movimiento», la animación del viento se desactiva por completo en lugar de solo ralentizarse." },
      },
    ],
  },
  "brick-breaker": {
    origin: { ko: "벽돌깨기는 1976년 아타리의 '브레이크아웃'에서 시작된 아케이드 고전으로, 이후 '아르카노이드'로 대중화된 패들·공·벽돌 장르입니다.", en: "Brick Breaker descends from Atari's 1976 'Breakout' and the paddle-ball-brick genre later popularized by 'Arkanoid'.", ja: "ブロック崩しは1976年アタリの『ブレイクアウト』に始まり、後に『アルカノイド』で広まったパドル・ボール・ブロックの定番です。", zh: "打砖块源自1976年雅达利的《Breakout》，后由《Arkanoid》发扬光大的挡板-球-砖块类型。", fr: "Le casse-briques descend du 'Breakout' d'Atari (1976), genre raquette-balle-briques popularisé ensuite par 'Arkanoid'.", es: "El rompeladrillos desciende del 'Breakout' de Atari (1976), género de paleta-bola-ladrillos popularizado luego por 'Arkanoid'." },
    how: { ko: "손가락이나 마우스로 패들을 좌우로 움직여 공을 튕기고, 화면 위쪽 벽돌을 모두 부수면 다음 레벨로 넘어갑니다. 공이 패들 아래로 떨어지면 생명이 줄어듭니다. 공이 패들 가장자리에 맞을수록 더 비스듬히 튕겨 각도를 조절할 수 있습니다.", en: "Move the paddle with your finger or mouse to bounce the ball; clear all the bricks to reach the next level. You lose a life if the ball drops below the paddle. Hitting the ball near the paddle's edge angles it more sharply, letting you aim.", ja: "指かマウスでパドルを動かしてボールを弾き、上のブロックを全部壊すと次のレベルへ。ボールがパドルの下に落ちると残機が減ります。パドルの端で当てるほど角度が鋭くなり、狙いを調整できます。", zh: "用手指或鼠标移动挡板弹球，击碎上方所有砖块即可进入下一关。球掉到挡板下方会失去生命。球打在挡板边缘时弹射角度更大，可用来瞄准。", fr: "Déplacez la raquette au doigt ou à la souris pour renvoyer la balle ; cassez toutes les briques pour passer au niveau suivant. Vous perdez une vie si la balle tombe sous la raquette. Toucher la balle près du bord la renvoie plus en biais, ce qui permet de viser.", es: "Mueve la paleta con el dedo o el ratón para rebotar la bola; rompe todos los ladrillos para pasar de nivel. Pierdes una vida si la bola cae bajo la paleta. Golpear la bola cerca del borde la angula más, para poder apuntar." },
    faqs: [
      { q: { ko: "공의 방향을 어떻게 조절하나요?", en: "How do I control the ball's direction?", ja: "ボールの方向はどう操作する？", zh: "如何控制球的方向？", fr: "Comment contrôler la direction de la balle ?", es: "¿Cómo controlo la dirección de la bola?" }, a: { ko: "공이 패들의 어느 지점에 맞느냐로 각도가 정해집니다. 중앙에 맞으면 거의 수직, 가장자리에 맞을수록 옆으로 비스듬히 튕깁니다.", en: "The angle depends on where the ball hits the paddle: center sends it nearly straight up, while the edges send it off at a sharper sideways angle.", ja: "ボールがパドルのどこに当たるかで角度が決まります。中央ならほぼ真上、端ほど横に鋭く弾みます。", zh: "角度取决于球打在挡板的位置：打中间几乎垂直向上，越靠边弹得越斜。", fr: "L'angle dépend de l'endroit où la balle touche la raquette : au centre elle repart presque droit, sur les bords plus en biais.", es: "El ángulo depende de dónde golpea la bola la paleta: en el centro sale casi recta, en los bordes con más inclinación." } },
      { q: { ko: "레벨이 오르면 뭐가 달라지나요?", en: "What changes as levels go up?", ja: "レベルが上がると何が変わる？", zh: "关卡提升会有什么变化？", fr: "Qu'est-ce qui change à chaque niveau ?", es: "¿Qué cambia al subir de nivel?" }, a: { ko: "레벨마다 공이 빨라지고 벽돌 줄이 늘어나며 패들이 약간 짧아져 난도가 올라갑니다.", en: "Each level makes the ball faster, adds more rows of bricks, and slightly shrinks the paddle for a tougher challenge.", ja: "レベルごとにボールが速くなり、ブロックの列が増え、パドルが少し短くなって難しくなります。", zh: "每关球会更快、砖块行数增加，挡板略微变短，难度提升。", fr: "Chaque niveau accélère la balle, ajoute des rangées de briques et raccourcit un peu la raquette.", es: "Cada nivel acelera la bola, añade más filas de ladrillos y acorta un poco la paleta." } },
      { q: { ko: "점수와 기록은 저장되나요?", en: "Are score and records saved?", ja: "スコアと記録は保存される？", zh: "分数和记录会保存吗？", fr: "Le score et les records sont-ils sauvegardés ?", es: "¿Se guardan la puntuación y los récords?" }, a: { ko: "최고 점수가 브라우저(localStorage)에 저장되어 다음에 표시됩니다. 계정은 필요 없습니다.", en: "Your best score is stored in the browser (localStorage) and shown next time. No account needed.", ja: "自己ベストがブラウザ(localStorage)に保存され、次回表示されます。アカウント不要です。", zh: "最佳成绩保存在浏览器(localStorage)，下次显示。无需账号。", fr: "Votre meilleur score est enregistré dans le navigateur (localStorage) et affiché la prochaine fois. Aucun compte requis.", es: "Tu mejor puntuación se guarda en el navegador (localStorage) y se muestra la próxima vez. Sin cuenta." } },
    ],
  },
  "star-blaster": {
    origin: { ko: "스타 블래스터는 1978년 스페이스 인베이더로 시작된 고전 종스크롤 슈팅(슈뮤프) 장르의 계보를 잇는 브라우저 아케이드 게임입니다.", en: "Star Blaster follows the classic vertical-scrolling shooter (shmup) lineage that began with 1978's Space Invaders, reimagined as a browser arcade game.", ja: "スターブラスターは1978年のスペースインベーダーに始まる縦スクロールシューティング(シューティングゲーム)の系譜を継ぐブラウザアーケードです。", zh: "《星际爆破》延续自1978年《太空侵略者》开创的纵向卷轴射击(shmup)血脉，重制为浏览器街机游戏。", fr: "Star Blaster s'inscrit dans la lignée des shoot'em up à défilement vertical né avec Space Invaders (1978), réinventé en jeu d'arcade navigateur.", es: "Star Blaster sigue el linaje de los shooters de desplazamiento vertical (shmup) iniciado por Space Invaders (1978), reinventado como juego arcade de navegador." },
    how: { ko: "손가락이나 마우스로 우주선을 좌우로 움직이면 자동으로 발사됩니다. 내려오는 적을 격추하고, 적이 지나치거나 부딪히면 생명이 줄어듭니다. 시간이 지날수록 웨이브가 올라 더 빠르고 많은 적이 등장합니다.", en: "Move your ship left/right with finger or mouse — it fires automatically. Shoot the descending enemies; you lose a life if one slips past or hits you. Waves ramp up over time with faster, denser enemies.", ja: "指かマウスで宇宙船を左右に動かすと自動で発射します。降ってくる敵を撃破し、敵が通り抜けたり衝突すると残機が減ります。時間とともにウェーブが上がり、敵が速く多くなります。", zh: "用手指或鼠标左右移动飞船，飞船会自动开火。击落下降的敌人；若敌人溜过或撞到你就会失去生命。随着时间推移波次提升，敌人更快更多。", fr: "Déplacez le vaisseau à gauche/droite au doigt ou à la souris — il tire tout seul. Abattez les ennemis qui descendent ; vous perdez une vie s'ils passent ou vous touchent. Les vagues s'intensifient avec le temps.", es: "Mueve la nave a izquierda/derecha con el dedo o el ratón: dispara sola. Derriba a los enemigos que bajan; pierdes una vida si uno se cuela o te golpea. Las oleadas se intensifican con el tiempo." },
    faqs: [
      { q: { ko: "어떻게 조준하나요?", en: "How do I aim?", ja: "どうやって狙う？", zh: "如何瞄准？", fr: "Comment viser ?", es: "¿Cómo apunto?" }, a: { ko: "조준은 따로 없습니다. 우주선을 적 아래로 이동시키면 자동 발사가 명중시킵니다. 위치 선정과 회피가 핵심입니다.", en: "There's no separate aiming — line your ship up under an enemy and the auto-fire does the rest. Positioning and dodging are the skill.", ja: "個別の照準はありません。宇宙船を敵の下に合わせれば自動発射が当てます。位置取りと回避が鍵です。", zh: "没有单独瞄准——把飞船对到敌人下方，自动开火即可命中。走位和闪避才是关键。", fr: "Pas de visée séparée : placez le vaisseau sous un ennemi et le tir auto s'en charge. Le placement et l'esquive font la différence.", es: "No hay puntería aparte: alinea la nave bajo un enemigo y el disparo automático hace el resto. La clave es el posicionamiento y esquivar." } },
      { q: { ko: "모바일에서도 잘 되나요?", en: "Does it play well on mobile?", ja: "モバイルでも快適？", zh: "手机上流畅吗？", fr: "Est-ce fluide sur mobile ?", es: "¿Va bien en el móvil?" }, a: { ko: "네. 세로 화면에 최적화된 캔버스 게임으로 터치 드래그로 조작합니다. 설치나 로그인이 필요 없습니다.", en: "Yes — it's a portrait-optimized canvas game controlled by touch drag. No install or login needed.", ja: "はい。縦画面に最適化されたキャンバスゲームで、タッチのドラッグで操作します。インストールやログインは不要です。", zh: "流畅。这是为竖屏优化的画布游戏，用触摸拖动操作。无需安装或登录。", fr: "Oui — un jeu canvas optimisé en portrait, contrôlé au glissement tactile. Sans installation ni connexion.", es: "Sí: un juego en canvas optimizado en vertical, controlado arrastrando el dedo. Sin instalación ni inicio de sesión." } },
      { q: { ko: "점수는 저장되나요?", en: "Is my score saved?", ja: "スコアは保存される？", zh: "分数会保存吗？", fr: "Mon score est-il sauvegardé ?", es: "¿Se guarda mi puntuación?" }, a: { ko: "최고 점수가 브라우저(localStorage)에 저장되어 다음 플레이 때 표시됩니다. 계정은 필요 없습니다.", en: "Your best score is stored in the browser (localStorage) and shown on your next visit. No account required.", ja: "自己ベストがブラウザ(localStorage)に保存され、次回表示されます。アカウント不要です。", zh: "最佳成绩保存在浏览器(localStorage)，下次游玩时显示。无需账号。", fr: "Votre meilleur score est enregistré dans le navigateur (localStorage) et affiché à la prochaine visite. Aucun compte requis.", es: "Tu mejor puntuación se guarda en el navegador (localStorage) y se muestra la próxima vez. Sin cuenta." } },
    ],
  },
  "aim-trainer": {
    origin: { ko: "에임 트레이너는 FPS 게이머들의 반응속도·정확도 훈련 도구로 2010년대에 대중화되었습니다.", en: "Aim trainers became popular in the 2010s as reaction and accuracy practice for FPS players.", ja: "エイムトレーナーは2010年代にFPSプレイヤーの反応・精度練習として普及しました。", zh: "瞄准训练器于2010年代流行，用于FPS玩家的反应与精度练习。", fr: "Les aim trainers se sont popularisés dans les années 2010 pour l'entraînement FPS.", es: "Los entrenadores de puntería se popularizaron en los 2010 para práctica de FPS." },
    how: { ko: "4가지 모드로 훈련합니다 — 그리드샷(동시 다중 타깃), 플릭(순간 조준), 트래킹(움직이는 타깃 추적), 정밀샷(작은 타깃). 난이도 4단계이며 반응속도·정확도·초당 처치·일관성을 측정하고 모드별 최고 기록을 저장합니다.", en: "Train across four modes — Gridshot (many targets at once), Flick (snap to one), Tracking (follow a moving target) and Precision (tiny targets). Four difficulties; it measures reaction, accuracy, targets-per-second and consistency, and saves a best per mode.", ja: "4つのモードで練習 — グリッドショット(同時多数)、フリック(瞬間狙撃)、トラッキング(移動追跡)、精密(小さな的)。難易度4段階で、反応・精度・毎秒撃破・一貫性を測定し、モード別のベストを保存します。", zh: "四种模式训练 — 网格射击(同时多目标)、急甩(瞬间瞄准)、跟踪(追踪移动目标)、精准(小目标)。四档难度，测量反应、准确率、每秒击杀与稳定性，并按模式保存最佳记录。", fr: "Entraînez-vous sur quatre modes — Gridshot (plusieurs cibles), Flick (viser d'un coup), Tracking (suivre une cible mobile) et Précision (petites cibles). Quatre difficultés ; mesure réaction, précision, cibles/s et régularité, avec un record par mode.", es: "Entrena en cuatro modos — Gridshot (varias dianas), Flick (apuntar de golpe), Tracking (seguir una diana móvil) y Precisión (dianas pequeñas). Cuatro dificultades; mide reacción, precisión, dianas/s y consistencia, y guarda un récord por modo." },
    rules: {
      ko: [
        "그리드샷: 화면에 동시에 뜬 여러 타깃을 30초간 최대한 많이 제거 — 속도와 처리량을 측정합니다.",
        "플릭: 한 번에 하나씩 뜨는 타깃을 순간적으로 조준·클릭 — 평균 반응속도(ms)를 측정합니다.",
        "트래킹: 움직이는 타깃 위에 커서를 유지한 시간 비율(온타깃 %)로 채점합니다.",
        "정밀샷: 작은 타깃이 사라지기 전에 명중 — 미세 조준 정확도를 훈련합니다.",
        "난이도가 오를수록 타깃이 작아지고 빨라지며(그리드샷은 개수 증가), 정밀샷의 제한시간이 짧아집니다.",
        "결과는 랭크(Bronze→Master)로 표시되고, 모드·난이도별 최고 기록이 브라우저에 저장됩니다. 마우스와 터치 모두 지원합니다.",
      ],
      en: [
        "Gridshot: clear as many simultaneous targets as you can in 30 seconds — raw speed and throughput.",
        "Flick: one target appears at a time; snap to it and click — measures average reaction time (ms).",
        "Tracking: scored by the share of time your cursor stays on a moving target (on-target %).",
        "Precision: hit small targets before they disappear — trains micro-adjustment accuracy.",
        "Higher difficulty shrinks and speeds up targets (Gridshot adds more), and shortens the Precision timer.",
        "Results show a rank (Bronze→Master); best scores per mode and difficulty are saved in your browser. Mouse and touch are both supported.",
      ],
      ja: [
        "グリッドショット: 30秒間、同時に出る複数のターゲットをできるだけ多く撃破 — 速度と処理量。",
        "フリック: 一度に一つ出る的を瞬時に狙ってクリック — 平均反応時間(ms)を測定。",
        "トラッキング: 動く的にカーソルを維持した時間の割合(オンターゲット%)で採点。",
        "精密: 小さな的が消える前に命中 — 微調整の精度を鍛えます。",
        "難易度が上がると的は小さく速くなり(グリッドは数が増加)、精密の制限時間が短くなります。",
        "結果はランク(Bronze→Master)で表示され、モード・難易度別のベストがブラウザに保存されます。マウスとタッチ両対応。",
      ],
      zh: [
        "网格射击：30秒内尽可能多地清除同时出现的多个目标 — 速度与处理量。",
        "急甩：一次出现一个目标，瞬间瞄准并点击 — 测量平均反应时间(毫秒)。",
        "跟踪：以光标停留在移动目标上的时间比例(在目标%)计分。",
        "精准：在小目标消失前命中 — 训练微调准确度。",
        "难度越高，目标越小越快(网格射击数量增加)，精准模式限时更短。",
        "结果以段位(Bronze→Master)显示，各模式与难度的最佳成绩保存在浏览器中。鼠标和触摸均支持。",
      ],
      fr: [
        "Gridshot : éliminez un maximum de cibles simultanées en 30 secondes — vitesse et débit.",
        "Flick : une cible à la fois ; visez d'un coup et cliquez — mesure la réaction moyenne (ms).",
        "Tracking : noté sur la part de temps où le curseur reste sur une cible mobile (sur cible %).",
        "Précision : touchez de petites cibles avant qu'elles disparaissent — micro-ajustements.",
        "Plus la difficulté monte, plus les cibles rétrécissent et accélèrent (Gridshot en ajoute), et le minuteur de Précision raccourcit.",
        "Le résultat affiche un rang (Bronze→Master) ; les records par mode et difficulté sont enregistrés dans le navigateur. Souris et tactile pris en charge.",
      ],
      es: [
        "Gridshot: elimina cuantas dianas simultáneas puedas en 30 segundos — velocidad y volumen.",
        "Flick: aparece una diana a la vez; apunta de golpe y haz clic — mide la reacción media (ms).",
        "Tracking: se puntúa por el tiempo que tu cursor permanece sobre una diana móvil (en objetivo %).",
        "Precisión: acierta dianas pequeñas antes de que desaparezcan — ajuste fino.",
        "A mayor dificultad, las dianas se encogen y aceleran (Gridshot añade más) y el temporizador de Precisión se acorta.",
        "El resultado muestra un rango (Bronze→Master); los récords por modo y dificultad se guardan en tu navegador. Compatible con ratón y táctil.",
      ],
    },
    faqs: [
      {
        q: { ko: "실제 FPS 실력에 도움이 되나요?", en: "Does this actually help my FPS aim?", ja: "実際のFPSの上達に役立ちますか？", zh: "这真的能帮助我的FPS准度吗？", fr: "Est-ce que ça améliore vraiment ma visée FPS ?", es: "¿Ayuda de verdad a mi puntería en FPS?" },
        a: { ko: "네. 반응속도(플릭), 추적(트래킹), 미세 조준(정밀샷)은 FPS의 핵심 스킬입니다. 게임 전 5~10분 워밍업으로 꾸준히 훈련하면 근육 기억이 형성됩니다.", en: "Yes. Flick reaction, tracking and micro-adjustment are core FPS skills. A steady 5–10 minute warm-up before matches builds muscle memory over time.", ja: "はい。フリック反応・トラッキング・微調整はFPSの核心スキルです。試合前に5〜10分のウォームアップを続けると筋肉の記憶が育ちます。", zh: "会。急甩反应、跟踪与微调是FPS的核心技能。赛前坚持5–10分钟热身，久而久之形成肌肉记忆。", fr: "Oui. Réaction flick, tracking et micro-ajustement sont des compétences FPS clés. Un échauffement régulier de 5 à 10 minutes crée la mémoire musculaire.", es: "Sí. La reacción flick, el tracking y el ajuste fino son habilidades clave de FPS. Un calentamiento constante de 5–10 minutos crea memoria muscular." },
      },
      {
        q: { ko: "어떤 모드부터 해야 하나요?", en: "Which mode should I start with?", ja: "どのモードから始めるべき？", zh: "该从哪个模式开始？", fr: "Par quel mode commencer ?", es: "¿Con qué modo empiezo?" },
        a: { ko: "워밍업은 그리드샷·플릭으로 시작하세요. 스프레이/지속사격 무기를 쓴다면 트래킹, 헤드샷 정확도를 원하면 정밀샷을 집중 훈련하세요.", en: "Warm up with Gridshot and Flick. If you play spray/sustained-fire weapons, focus on Tracking; for headshot accuracy, drill Precision.", ja: "ウォームアップはグリッドショットとフリックから。スプレー系武器ならトラッキング、ヘッドショット精度なら精密を重点的に。", zh: "先用网格射击和急甩热身。若使用扫射类武器就练跟踪，追求爆头精度就练精准。", fr: "Échauffez-vous avec Gridshot et Flick. Pour les armes à tir soutenu, travaillez le Tracking ; pour la précision des headshots, la Précision.", es: "Calienta con Gridshot y Flick. Si usas armas de fuego sostenido, enfócate en Tracking; para precisión de headshots, practica Precisión." },
      },
      {
        q: { ko: "마우스 감도는 어떻게 맞추나요?", en: "How should I set my mouse sensitivity?", ja: "マウス感度はどう設定する？", zh: "鼠标灵敏度该如何设置？", fr: "Comment régler la sensibilité de ma souris ?", es: "¿Cómo ajusto la sensibilidad del ratón?" },
        a: { ko: "브라우저는 OS 감도를 따릅니다. 실제 게임과 같은 감도로 연습해야 전이가 잘 되며, 큰 움직임은 팔, 미세 조정은 손목을 쓰는 로우~미드 센스를 권장합니다.", en: "The browser uses your OS sensitivity. Practice at the same sens you play at for transfer, and prefer a low-to-mid sens — big moves from the arm, micro-corrections from the wrist.", ja: "ブラウザはOSの感度に従います。実際のゲームと同じ感度で練習すると転移しやすく、大きな動きは腕・微調整は手首を使うロー〜ミッド感度が有効です。", zh: "浏览器沿用系统灵敏度。用与实战相同的灵敏度练习迁移最好，建议中低灵敏度——大动作用手臂、微调用手腕。", fr: "Le navigateur suit la sensibilité de l'OS. Entraînez-vous à la même sensibilité qu'en jeu, de préférence basse à moyenne — bras pour les grands gestes, poignet pour les corrections.", es: "El navegador usa la sensibilidad del sistema. Practica con la misma sens que juegas para transferir, y prefiere una sens baja-media: brazo para gestos grandes, muñeca para correcciones." },
      },
      {
        q: { ko: "모바일에서도 되나요?", en: "Does it work on mobile?", ja: "モバイルでも動きますか？", zh: "手机上能用吗？", fr: "Ça marche sur mobile ?", es: "¿Funciona en el móvil?" },
        a: { ko: "네, 터치를 지원합니다. 다만 트래킹 모드는 손가락이 타깃을 가리기 쉬워 데스크탑 마우스가 유리합니다.", en: "Yes, touch is supported. Note that Tracking is easier on desktop since your finger can cover the target on a phone.", ja: "はい、タッチ対応です。ただしトラッキングは指で的が隠れやすく、デスクトップのマウスが有利です。", zh: "支持触摸。不过跟踪模式手指容易挡住目标，桌面鼠标更有优势。", fr: "Oui, le tactile est pris en charge. Le Tracking reste plus facile sur ordinateur, le doigt pouvant masquer la cible.", es: "Sí, admite táctil. El modo Tracking va mejor en ordenador, ya que el dedo puede tapar la diana en el móvil." },
      },
      {
        q: { ko: "기록은 저장되나요?", en: "Are my scores saved?", ja: "記録は保存されますか？", zh: "成绩会保存吗？", fr: "Mes scores sont-ils enregistrés ?", es: "¿Se guardan mis puntuaciones?" },
        a: { ko: "모드·난이도별 최고 점수가 브라우저(localStorage)에 저장됩니다. 계정은 필요 없으며, 브라우저 데이터를 지우면 초기화됩니다.", en: "Your best score per mode and difficulty is stored in the browser (localStorage). No account is needed; clearing browser data resets it.", ja: "モード・難易度別のベストがブラウザ(localStorage)に保存されます。アカウント不要で、ブラウザデータを消すとリセットされます。", zh: "各模式与难度的最佳成绩保存在浏览器(localStorage)。无需账号；清除浏览器数据会重置。", fr: "Votre meilleur score par mode et difficulté est stocké dans le navigateur (localStorage). Aucun compte requis ; effacer les données le réinitialise.", es: "Tu mejor puntuación por modo y dificultad se guarda en el navegador (localStorage). No requiere cuenta; borrar los datos la reinicia." },
      },
    ],
  },
  "windward-horizons": {
    origin: {
      ko: "Windward Horizons는 대항해시대의 범선 항해와 고전적인 항구 교역 게임 전통에서 영감을 받은 OIYO 오리지널 3D 브라우저 게임입니다. 외부 게임 모델·텍스처·음원을 복제하지 않고, 선박·항구·파도·음악을 모두 절차적으로 구성했습니다.",
      en: "Windward Horizons is an original OIYO 3D browser game inspired by Age of Sail navigation and the tradition of port-to-port trading games. It copies no external game model, texture or recording; the ship, ports, waves and music are all procedural.",
      ja: "Windward Horizonsは、大航海時代の帆船航海と古典的な港間交易ゲームの伝統に着想を得たOIYOオリジナル3Dブラウザゲームです。外部ゲームのモデル・テクスチャ・音源を複製せず、船・港・波・音楽をすべてプロシージャルに構成しています。",
      zh: "Windward Horizons 是 OIYO 原创3D浏览器游戏，灵感来自大航海时代的帆船航行与经典港口贸易游戏传统。游戏不复制任何外部游戏模型、纹理或录音；船只、港口、波浪与音乐均由程序生成。",
      fr: "Windward Horizons est un jeu 3D original d'OIYO inspiré par la navigation à l'âge de la voile et la tradition des jeux de commerce entre ports. Aucun modèle, texture ou enregistrement externe n'est copié : navire, ports, vagues et musique sont procéduraux.",
      es: "Windward Horizons es un juego 3D original de OIYO inspirado en la navegación de la era de la vela y la tradición de los juegos de comercio entre puertos. No copia modelos, texturas ni grabaciones externas: barco, puertos, olas y música son procedurales.",
    },
    how: {
      ko: "W/S로 돛을 올리고 내리며 A/D로 키를 잡습니다. HUD의 풍향 화살표를 보고 맞바람을 피하면 속력이 붙습니다. 항구 가까이에서 돛을 줄여 1.25 이하로 감속한 뒤 F 또는 입항 버튼을 누르고, 싼 물품을 사서 가격이 높은 다른 항구에 파세요. 세 개의 빛나는 해상 표식을 발견하고 다섯 항구를 방문하면 탐험 점수도 얻습니다.",
      en: "Raise or lower sail with W/S and steer with A/D. Read the HUD wind arrow and avoid pointing into the source to build speed. Near a port, shorten sail, slow below 1.25 and press F or Dock; buy low and sell at a port paying more. Discover the three glowing sea marks and visit all five ports for exploration score.",
      ja: "W/Sで帆を上げ下げし、A/Dで操舵します。HUDの風向矢印を読み、向かい風を避けると速力が上がります。港の近くで帆を縮めて1.25未満に減速し、Fまたは入港ボタンを押します。安く買い、高く買う別の港で売りましょう。三つの光る海標を発見し、五港を巡ると探索点も得られます。",
      zh: "用W/S升降船帆、A/D转舵。观察HUD风向箭头，避免正对来风即可提速。靠近港口后收帆，把速度降至1.25以下，再按F或靠港按钮；低价买入，在报价更高的港口卖出。发现三处发光海标并到访全部五港还能获得探索分。",
      fr: "Réglez les voiles avec Z/S et barrez avec Q/D. Lisez la flèche du vent et évitez de pointer vers sa source pour accélérer. Près d'un port, réduisez la toile, passez sous 1,25 puis appuyez sur F ou Accoster ; achetez bas et revendez là où le prix est meilleur. Trouvez les trois balises lumineuses et visitez les cinq ports pour le score d'exploration.",
      es: "Sube o baja las velas con W/S y gira con A/D. Lee la flecha del viento y evita apuntar contra su origen para ganar velocidad. Cerca de un puerto, reduce vela, baja de 1,25 y pulsa F o Atracar; compra barato y vende donde paguen más. Descubre las tres balizas luminosas y visita los cinco puertos para sumar exploración.",
    },
    rules: {
      ko: [
        "풍향은 바람이 불어가는 방향입니다. 순풍과 측풍은 빠르고, 바람이 오는 쪽으로 정면 항해하면 돛의 효율이 크게 떨어집니다.",
        "돛은 0~100%로 조절됩니다. 큰 돛은 가속하지만 입항하려면 돛을 줄이고 1.25 이하로 감속해야 합니다.",
        "화물창은 30칸이며 물품마다 부피가 다릅니다. 차 1칸, 향신료·비단 2칸, 목재 3칸을 사용합니다.",
        "각 항구의 가격은 고유한 수요와 항해일 변동을 결합합니다. 같은 항해일과 항구에서는 같은 가격이 나옵니다.",
        "항구 시장을 연 동안 항해 시간은 멈춥니다. 계정·네트워크·실제 화폐는 사용하지 않습니다.",
      ],
      en: [
        "The wind arrow shows where the wind travels. Running and beam reaches are fast; pointing into the source sharply reduces sail efficiency.",
        "Sail trim ranges from 0–100%. More sail accelerates, but docking requires shortening sail and slowing below 1.25.",
        "The hold has 30 slots. Tea uses 1, spices and silk use 2, and timber uses 3 per unit.",
        "Prices combine each port's demand with a deterministic voyage-day fluctuation. The same port and day always produce the same quote.",
        "Voyage time pauses in a port market. There is no account, network opponent or real currency.",
      ],
      ja: [
        "風向矢印は風が進む方向です。追い風・横風は速く、風の来る方向へ正面を向けると帆の効率が大きく下がります。",
        "帆は0～100%で調整。帆を増やすと加速しますが、入港には帆を縮めて1.25未満へ減速する必要があります。",
        "船倉は30枠。茶は1、香辛料と絹は2、木材は3枠を1単位ごとに使います。",
        "価格は港固有の需要と航海日の決定論的な変動を組み合わせます。同じ港・同じ日なら同じ価格です。",
        "港の市場を開いている間は航海時間が停止します。アカウント・対戦通信・実通貨はありません。",
      ],
      zh: [
        "风向箭头表示风吹向何方。顺风与侧风速度快，正对来风会大幅降低船帆效率。",
        "船帆可在0～100%之间调整。帆越大加速越快，但靠港前必须收帆并把速度降至1.25以下。",
        "货舱有30格。茶每单位占1格，香料与丝绸占2格，木材占3格。",
        "价格由各港口需求与确定性的航行日波动共同决定。同一港口、同一天始终给出相同报价。",
        "打开港口市场时航行时间暂停。不使用账号、联网对手或真实货币。",
      ],
      fr: [
        "La flèche indique la direction suivie par le vent. Allures portantes et travers sont rapides ; remonter vers la source réduit fortement le rendement.",
        "La toile se règle de 0 à 100 %. Plus de voile accélère, mais il faut réduire et passer sous 1,25 pour accoster.",
        "La cale compte 30 places : thé 1, épices et soie 2, bois 3 par unité.",
        "Les prix combinent la demande propre au port et une variation déterministe du jour de voyage. Même port et même jour donnent le même cours.",
        "Le temps s'arrête au marché. Aucun compte, adversaire réseau ni argent réel.",
      ],
      es: [
        "La flecha muestra hacia dónde viaja el viento. Empopada y través son rápidos; apuntar hacia su origen reduce mucho la eficiencia.",
        "La vela se ajusta entre 0 y 100 %. Más vela acelera, pero para atracar hay que reducirla y bajar de 1,25.",
        "La bodega tiene 30 espacios: té usa 1, especias y seda 2, madera 3 por unidad.",
        "Los precios combinan la demanda de cada puerto con una variación determinista del día. El mismo puerto y día siempre dan la misma cotización.",
        "El tiempo se pausa en el mercado. No hay cuenta, rival en red ni dinero real.",
      ],
    },
    faqs: [
      {
        q: { ko: "바다 그래픽은 미리 렌더한 영상인가요?", en: "Is the ocean a pre-rendered video?", ja: "海は事前レンダリング動画ですか？", zh: "海洋是预渲染视频吗？", fr: "L'océan est-il une vidéo précalculée ?", es: "¿El océano es un vídeo prerenderizado?" },
        a: { ko: "아니요. 네 개 파형이 매 프레임 실제 수면 정점을 변위시키고, 같은 파도 함수를 선체 높이·피치·롤에도 적용합니다. 물마루 포말, 섬 해안 포말, 속력에 따라 퍼지는 선미 항적도 실시간으로 계산합니다.", en: "No. Four wave fields displace the water vertices every frame, and the same function drives the hull's height, pitch and roll. Crest foam, island shore foam and a speed-shaped wake are also computed live.", ja: "いいえ。四つの波形が毎フレーム水面頂点を変位させ、同じ関数を船体の高さ・ピッチ・ロールにも適用します。波頭の泡、島岸の泡、速力に応じて広がる航跡もリアルタイム計算です。", zh: "不是。四组波形每帧实时位移水面顶点，同一函数也驱动船体高度、俯仰和横摇。浪尖泡沫、岛岸白沫与随航速展开的尾迹也实时计算。", fr: "Non. Quatre champs de vagues déplacent les sommets à chaque image, et la même fonction pilote hauteur, tangage et roulis de la coque. Écume de crête, rivage et sillage selon la vitesse sont calculés en direct.", es: "No. Cuatro campos de olas desplazan los vértices en cada fotograma, y la misma función controla altura, cabeceo y balanceo del casco. Espuma de cresta, orilla y estela según la velocidad también se calculan en vivo." },
      },
      {
        q: { ko: "관현악 음악은 어디에서 가져왔나요?", en: "Where does the orchestral music come from?", ja: "管弦楽はどこから来ていますか？", zh: "管弦配乐来自哪里？", fr: "D'où vient la musique orchestrale ?", es: "¿De dónde sale la música orquestal?" },
        a: { ko: "녹음 파일을 내려받지 않습니다. 출항 클릭 뒤 Web Audio가 현악·브라스·팀파니·심벌 음색과 잔향을 기기 안에서 실시간 합성합니다. 언제든 HUD의 스피커 버튼으로 끌 수 있습니다.", en: "No recording is downloaded. After Set sail, Web Audio synthesizes strings, brass, timpani, cymbal and reverb on-device in real time. The HUD speaker button can mute it at any time.", ja: "録音ファイルはダウンロードしません。出航クリック後、Web Audioが弦・金管・ティンパニ・シンバル・残響を端末内でリアルタイム合成します。HUDのスピーカーボタンでいつでも消音できます。", zh: "不会下载录音文件。点击起航后，Web Audio在设备内实时合成弦乐、铜管、定音鼓、铙钹与混响。可随时用HUD扬声器按钮静音。", fr: "Aucun enregistrement n'est téléchargé. Après le clic, Web Audio synthétise cordes, cuivres, timbales, cymbale et réverbération sur l'appareil. Le bouton haut-parleur coupe le son à tout moment.", es: "No se descarga ninguna grabación. Tras pulsar Zarpar, Web Audio sintetiza cuerdas, metales, timbales, platillo y reverberación en el dispositivo. El botón de altavoz permite silenciarlo." },
      },
      {
        q: { ko: "온라인 멀티플레이나 서버 저장이 있나요?", en: "Is there online multiplayer or server saving?", ja: "オンライン対戦やサーバー保存はありますか？", zh: "有在线多人或服务器存档吗？", fr: "Y a-t-il multijoueur ou sauvegarde serveur ?", es: "¿Hay multijugador o guardado en servidor?" },
        a: { ko: "아니요. 현재 항해는 싱글플레이이며 최고 항해 점수만 브라우저 localStorage에 저장됩니다. 항해 경로·교역 내역·개인정보는 서버로 전송하지 않습니다.", en: "No. This voyage is single-player, and only the best voyage score is kept in browser localStorage. Routes, trades and personal data are not sent to a game server.", ja: "いいえ。現在はシングルプレイで、最高航海スコアのみブラウザのlocalStorageに保存します。航路・交易履歴・個人情報をゲームサーバーへ送りません。", zh: "没有。目前为单人游戏，仅把最高航行分数保存在浏览器localStorage中。航线、交易记录与个人信息不会发送到游戏服务器。", fr: "Non. Le voyage est solo et seul le meilleur score reste dans le localStorage du navigateur. Routes, transactions et données personnelles ne sont pas envoyées à un serveur de jeu.", es: "No. El viaje es para un jugador y solo la mejor puntuación queda en localStorage. Rutas, transacciones y datos personales no se envían a un servidor." },
      },
    ],
  },
  "urban-strike": {
    origin: {
      ko: "Urban Strike는 빠른 아레나 슈팅과 전술 밀리터리 FPS의 조작감을 브라우저에 맞게 결합한 OIYO 오리지널 3D 게임입니다. 외부 게임 자산이나 실제 전쟁 데이터를 사용하지 않고, 절차형 도시와 봇 매치로 구성했습니다.",
      en: "Urban Strike is an original OIYO 3D game that adapts the feel of fast arena shooting and tactical military FPS play to the browser. It uses a procedural city and bot match, with no external game assets or real-world conflict data.",
      ja: "Urban Strikeは、高速アリーナシューターと戦術ミリタリーFPSの操作感をブラウザ向けに組み合わせたOIYOオリジナル3Dゲームです。外部ゲーム素材や現実の紛争データを使わず、プロシージャル都市とBOT戦で構成されています。",
      zh: "Urban Strike 是 OIYO 原创 3D 游戏，将快节奏竞技射击与战术军事 FPS 手感带到浏览器。游戏使用程序化城市和机器人对局，不采用外部游戏素材或现实冲突数据。",
      fr: "Urban Strike est un jeu 3D original d'OIYO qui adapte au navigateur le rythme d'un arena shooter et le maniement d'un FPS militaire tactique. Il repose sur une ville procédurale et des bots, sans ressources de jeux externes ni données de conflits réels.",
      es: "Urban Strike es un juego 3D original de OIYO que adapta al navegador el ritmo de un arena shooter y el manejo de un FPS militar táctico. Usa una ciudad procedural y bots, sin recursos externos de otros juegos ni datos de conflictos reales.",
    },
    how: {
      ko: "120초 동안 BLUE 팀으로 RED 봇을 상대하고 중앙 B 거점을 확보하세요. 처치와 거점 유지로 팀 점수가 오르며 40점에 먼저 도달하거나 시간 종료 때 더 높은 팀이 승리합니다. M4·AK·MP5를 즉시 교체할 수 있고, ADS·앉기·정지 사격은 탄퍼짐을 줄입니다.",
      en: "Fight RED bots for 120 seconds as BLUE and secure the central Site B. Eliminations and holding the point raise the team score; first to 40, or the higher score at time, wins. Swap instantly between the M4, AK and MP5; ADS, crouching and firing from a standstill tighten spread.",
      ja: "BLUEチームとして120秒間REDのBOTと戦い、中央のB拠点を確保します。キルと拠点維持でチームスコアが上がり、先に40点、または時間終了時に高得点のチームが勝利。M4・AK・MP5を即時切替でき、ADS・しゃがみ・静止射撃で拡散が小さくなります。",
      zh: "作为 BLUE 队在120秒内对抗 RED 机器人并控制中央 B 点。击杀和占点会增加团队得分；先到40分或时间结束时分数更高的一方获胜。可即时切换 M4、AK、MP5；ADS、蹲下和静止射击会缩小散布。",
      fr: "Combattez les bots RED pendant 120 secondes avec BLUE et sécurisez le site B central. Les éliminations et la tenue du point augmentent le score ; la première équipe à 40, ou la meilleure au temps, gagne. Passez entre M4, AK et MP5 ; ADS, accroupissement et tir immobile resserrent la dispersion.",
      es: "Combate contra los bots RED durante 120 segundos con BLUE y asegura el Sitio B central. Las bajas y mantener el punto suman al equipo; gana quien llegue a 40 o tenga más al acabar. Cambia entre M4, AK y MP5; ADS, agacharse y disparar quieto reducen la dispersión.",
    },
    rules: {
      ko: [
        "M4A1: 균형 잡힌 30발 카빈. 중간 연사율, 빠른 전술 재장전, 가장 안정적인 ADS를 제공합니다.",
        "AK-12: 낮은 연사율과 강한 수직·좌우 반동 대신 높은 탄당 피해를 냅니다. 짧게 끊어 쏘면 효과적입니다.",
        "MP5: 가장 빠른 이동과 연사율, 넉넉한 예비 탄약을 제공하지만 먼 거리에서 피해가 빠르게 감소합니다.",
        "총알은 히트스캔으로 즉시 판정되며, 헤드·몸통 판정과 거리별 피해 감소를 적용합니다.",
        "스프린트 중에는 사격할 수 없고, 이동·점프는 탄퍼짐을 늘립니다. ADS와 앉기는 탄퍼짐을 줄입니다.",
        "실제 온라인 대전이 아닌 기기 내 6대6 봇 시뮬레이션입니다. 기록은 브라우저에만 저장됩니다.",
      ],
      en: [
        "M4A1: balanced 30-round carbine with medium fire rate, quick tactical reload and the steadiest ADS.",
        "AK-12: higher per-shot damage in exchange for a slower rate and stronger vertical/lateral recoil. Short bursts are effective.",
        "MP5: fastest movement and fire rate with ample reserve ammunition, but damage falls off sooner at range.",
        "Shots resolve instantly with hit-scan, separate head/body zones and distance-based damage falloff.",
        "You cannot shoot while sprinting; movement and jumping increase spread, while ADS and crouching reduce it.",
        "This is an on-device 6v6 bot simulation, not real online multiplayer. Records stay in your browser.",
      ],
      ja: [
        "M4A1: バランス型30発カービン。中間の連射速度、速いタクティカルリロード、最も安定したADS。",
        "AK-12: 低い連射速度と強い上下・左右反動の代わりに一発の威力が高い。短いバーストが有効。",
        "MP5: 最速の移動・連射速度と多い予備弾薬を持つ一方、遠距離では威力が早く減衰。",
        "射撃はヒットスキャンで即時判定され、頭・胴体の判定と距離減衰を適用します。",
        "ダッシュ中は射撃不可。移動・ジャンプは拡散を増やし、ADS・しゃがみは減らします。",
        "実際のオンライン対戦ではなく端末内6対6BOTシミュレーションです。記録はブラウザ内のみ。",
      ],
      zh: [
        "M4A1：均衡的30发卡宾枪，中等射速、快速战术换弹和最稳定的ADS。",
        "AK-12：射速较慢、垂直和横向后坐更强，但单发伤害高。短点射最有效。",
        "MP5：移动和射速最快、备弹充足，但远距离伤害衰减更早。",
        "射击以命中扫描即时判定，区分头部与身体，并应用距离伤害衰减。",
        "冲刺时无法射击；移动和跳跃增加散布，ADS和蹲下降低散布。",
        "这是设备内6对6机器人模拟，不是真实在线多人。记录仅保存在浏览器。",
      ],
      fr: [
        "M4A1 : carabine équilibrée de 30 coups, cadence moyenne, rechargement tactique rapide et ADS le plus stable.",
        "AK-12 : dégâts élevés par balle contre cadence plus lente et recul vertical/latéral marqué. Les rafales courtes sont efficaces.",
        "MP5 : déplacement et cadence les plus rapides, réserve généreuse, mais perte de dégâts plus précoce à distance.",
        "Les tirs sont résolus instantanément en hit-scan, avec zones tête/corps et baisse des dégâts selon la distance.",
        "Impossible de tirer en sprint ; déplacement et saut augmentent la dispersion, ADS et accroupissement la réduisent.",
        "Simulation 6v6 de bots sur l'appareil, pas de vrai multijoueur en ligne. Les records restent dans le navigateur.",
      ],
      es: [
        "M4A1: carabina equilibrada de 30 balas, cadencia media, recarga táctica rápida y ADS más estable.",
        "AK-12: más daño por bala a cambio de menor cadencia y fuerte retroceso vertical/lateral. Las ráfagas cortas funcionan mejor.",
        "MP5: movimiento y cadencia más rápidos, mucha reserva, pero el daño cae antes a distancia.",
        "Los disparos se resuelven al instante con hit-scan, zonas de cabeza/cuerpo y caída de daño por distancia.",
        "No puedes disparar al esprintar; moverte y saltar aumentan la dispersión, mientras ADS y agacharse la reducen.",
        "Es una simulación 6v6 con bots en el dispositivo, no multijugador real. Los récords quedan en el navegador.",
      ],
    },
    faqs: [
      {
        q: {
          ko: "실제 온라인 멀티플레이어인가요?", en: "Is this real online multiplayer?", ja: "本当のオンラインマルチプレイ？",
          zh: "这是真实在线多人游戏吗？", fr: "Est-ce un vrai multijoueur en ligne ?", es: "¿Es multijugador real en línea?",
        },
        a: {
          ko: "아니요. 멀티플레이어 경기의 팀 점수·킬피드·거점·리스폰 흐름을 봇으로 재현한 로컬 시뮬레이션입니다. 네트워크 계정이나 다른 플레이어의 데이터가 필요하지 않습니다.",
          en: "No. It is a local bot simulation of team scores, kill feed, hardpoint and respawn flow from a multiplayer match. It needs no network account or other players' data.",
          ja: "いいえ。マルチプレイのチームスコア、キルフィード、拠点、リスポーンの流れをBOTで再現するローカルシミュレーションです。アカウントや他プレイヤーのデータは不要です。",
          zh: "不是。这是在本地用机器人模拟多人对局的团队分数、击杀信息、据点和重生流程，不需要网络账号或其他玩家数据。",
          fr: "Non. C'est une simulation locale par bots des scores d'équipe, du kill feed, du point à tenir et des réapparitions. Aucun compte réseau ni donnée d'autres joueurs.",
          es: "No. Es una simulación local con bots de puntuación por equipos, feed de bajas, punto de control y reapariciones. No necesita cuenta ni datos de otros jugadores.",
        },
      },
      {
        q: {
          ko: "모바일에서도 플레이할 수 있나요?", en: "Can I play on mobile?", ja: "モバイルでも遊べる？",
          zh: "手机上能玩吗？", fr: "Peut-on jouer sur mobile ?", es: "¿Se puede jugar en móvil?",
        },
        a: {
          ko: "네. 왼쪽 가상 스틱, 드래그 조준, FIRE·ADS·점프·앉기·재장전·무기 교체 버튼을 제공합니다. 저사양 모바일에서는 해상도와 그림자 품질을 자동으로 낮춥니다.",
          en: "Yes. It provides a left virtual stick, drag aiming, and FIRE, ADS, jump, crouch, reload and weapon buttons. Resolution and shadow quality are reduced automatically on mobile.",
          ja: "はい。左の仮想スティック、ドラッグ照準、FIRE・ADS・ジャンプ・しゃがみ・リロード・武器切替ボタンを搭載。モバイルでは解像度と影品質を自動で下げます。",
          zh: "可以。提供左侧虚拟摇杆、拖动瞄准，以及FIRE、ADS、跳跃、蹲下、换弹和武器按钮；移动端会自动降低分辨率和阴影质量。",
          fr: "Oui. Stick virtuel gauche, visée au glissement et boutons FIRE, ADS, saut, accroupissement, recharge et arme. La résolution et les ombres sont réduites automatiquement sur mobile.",
          es: "Sí. Incluye stick virtual izquierdo, apuntado al arrastrar y botones FIRE, ADS, salto, agacharse, recarga y arma. En móvil reduce automáticamente resolución y sombras.",
        },
      },
      {
        q: {
          ko: "다운로드나 개인정보 전송이 있나요?", en: "Does it download or send personal data?", ja: "ダウンロードや個人情報送信は？",
          zh: "会下载或发送个人数据吗？", fr: "Télécharge-t-il ou envoie-t-il des données personnelles ?", es: "¿Descarga o envía datos personales?",
        },
        a: {
          ko: "설치 없이 브라우저에서 실행되며, 최고 점수와 경기 요약만 이 브라우저의 localStorage에 저장됩니다. 마이크를 사용하지 않고 공간 오디오는 Web Audio로 기기 안에서 합성합니다.",
          en: "It runs in the browser with no install; only the best score and match summary are kept in this browser's localStorage. It does not use the microphone, and spatial audio is synthesized on-device with Web Audio.",
          ja: "インストール不要でブラウザ実行。最高スコアと試合概要のみこのブラウザのlocalStorageに保存します。マイクは使わず、空間音響はWeb Audioで端末内合成します。",
          zh: "无需安装，在浏览器运行；仅将最高分和比赛摘要保存在本浏览器的localStorage。不使用麦克风，空间音频由Web Audio在设备内合成。",
          fr: "Il fonctionne sans installation ; seuls le meilleur score et le résumé restent dans le localStorage du navigateur. Aucun micro : l'audio spatial est synthétisé sur l'appareil avec Web Audio.",
          es: "Funciona sin instalar; solo guarda la mejor puntuación y el resumen en el localStorage del navegador. No usa micrófono: el audio espacial se sintetiza en el dispositivo con Web Audio.",
        },
      },
    ],
  },
  "dice-roller": {
    origin: { ko: "주사위는 기원전 3000년 메소포타미아 유적에서도 발견되는 가장 오래된 게임 도구입니다.", en: "Dice are humanity's oldest gaming tool, found in Mesopotamian sites from 3000 BC.", ja: "サイコロは紀元前3000年のメソポタミア遺跡でも見つかる最古のゲーム道具です。", zh: "骰子是人类最古老的游戏用具，公元前3000年的美索不达米亚遗址中已有发现。", fr: "Les dés sont le plus ancien outil de jeu, retrouvés dès 3000 av. J.-C.", es: "Los dados son la herramienta de juego más antigua, hallada desde el 3000 a. C." },
    how: { ko: "주사위 개수와 면 수를 고르고 굴리세요. 보드게임·TRPG 대용으로 좋습니다.", en: "Choose dice count and sides, then roll — handy for board games and TTRPGs.", ja: "個数と面数を選んで振るだけ。ボードゲームやTRPGに便利。", zh: "选择骰子数量和面数后掷出，适合桌游与TRPG。", fr: "Choisissez nombre et faces, puis lancez.", es: "Elige cantidad y caras, y lanza." },
    faqs: [],
  },
  "dominoes": {
    origin: { ko: "도미노는 12세기 중국 골패에서 기원해 18세기 이탈리아를 거쳐 유럽 전역으로 퍼졌습니다.", en: "Dominoes originated from 12th-century Chinese tiles, spreading through 18th-century Italy across Europe.", ja: "ドミノは12世紀中国の骨牌に起源し、18世紀イタリア経由で欧州に広まりました。", zh: "多米诺骨牌源自12世纪中国的骨牌，经18世纪意大利传遍欧洲。", fr: "Les dominos viennent des tuiles chinoises du XIIe siècle.", es: "El dominó procede de fichas chinas del siglo XII." },
    how: { ko: "같은 눈끼리 이어 붙이며 손패를 먼저 소진하면 승리합니다.", en: "Match ends of equal pips; empty your hand first to win.", ja: "同じ目をつなげ、先に手札をなくせば勝ち。", zh: "首尾点数相同才能相连，先出完手牌者胜。", fr: "Reliez les extrémités égales ; videz votre main d'abord.", es: "Une extremos iguales; quédate sin fichas primero." },
    faqs: [],
  },
  "freecell": {
    origin: { ko: "프리셀은 1978년 처음 구현되고 윈도우 95에 실리며 대중화된, 거의 모든 판이 클리어 가능한 솔리테어 변형입니다.", en: "FreeCell, first implemented in 1978 and popularized by Windows 95, is a solitaire variant where nearly every deal is winnable.", ja: "フリーセルは1978年に初実装、Windows 95で普及。ほぼ全ての配牌がクリア可能なソリティア変種です。", zh: "空当接龙于1978年首次实现，随Windows 95普及，几乎每局都可解。", fr: "FreeCell (1978, popularisé par Windows 95) : presque toutes les donnes sont gagnables.", es: "FreeCell (1978, popular por Windows 95): casi todos los repartos se pueden ganar." },
    how: { ko: "빈 셀 4개를 임시 저장소로 활용해 모든 카드를 파운데이션으로 올리세요.", en: "Use the four free cells as temporary storage to move every card to the foundations.", ja: "4つのフリーセルを一時置き場に使い、全カードを組札へ。", zh: "利用4个空当作临时存放，把所有牌移入基础堆。", fr: "Utilisez les quatre cellules libres comme stockage temporaire.", es: "Usa las cuatro celdas libres como almacenamiento temporal." },
    faqs: [],
    rules: { ko: ["4개의 프리셀(임시 저장 칸)과 4개의 파운데이션(A→K 쌓는 곳)이 있습니다.", "테이블로에서는 색이 다른 카드를 내림차순으로 쌓습니다(예: 빨강 7 위에 검정 6).", "프리셀에는 카드를 한 장씩 임시로 보관할 수 있습니다.", "목표: 모든 카드를 A부터 K까지 무늬별로 파운데이션에 올리기.", "한 번에 옮길 수 있는 카드 수는 비어 있는 프리셀·열 수에 비례합니다."], en: ["Four free cells (temporary slots) and four foundations (build A→K).", "In the tableau, stack cards in descending order with alternating colors (black 6 on red 7).", "A free cell holds one card temporarily.", "Goal: move every card to the foundations, ace to king by suit.", "How many cards you can move at once scales with empty free cells and columns."], ja: ["4つのフリーセル(一時置き)と4つの組札(A→Kに積む)。", "場札では色違いのカードを降順に重ねる(赤7の上に黒6)。", "フリーセルにはカードを1枚ずつ一時保管できる。", "目標: 全カードをA〜Kのスート別に組札へ。", "一度に動かせる枚数は空きフリーセルと空き列に比例する。"], zh: ["4个空当(临时格)和4个基础堆(按A→K堆叠)。", "牌桌区按红黑交替降序叠牌(红7上放黑6)。", "空当可临时存放一张牌。", "目标：将所有牌按花色从A到K移入基础堆。", "一次可移动的张数取决于空的空当和空列数量。"], fr: ["Quatre cellules libres et quatre fondations (de l'As au Roi).", "Dans le tableau, empilez en ordre décroissant et couleurs alternées (6 noir sur 7 rouge).", "Une cellule libre stocke une carte temporairement.", "But : déplacer toutes les cartes vers les fondations, de l'As au Roi par couleur.", "Le nombre de cartes déplaçables dépend des cellules et colonnes vides."], es: ["Cuatro celdas libres y cuatro bases (del As al Rey).", "En el tablero, apila en orden descendente y colores alternos (6 negro sobre 7 rojo).", "Una celda libre guarda una carta temporalmente.", "Meta: mover todas las cartas a las bases, del As al Rey por palo.", "Cuántas cartas puedes mover depende de celdas y columnas vacías."] },
  },
  chess: {
    origin: { ko: "체스는 6세기 인도의 차투랑가에서 기원해 페르시아를 거쳐 유럽에서 현재의 규칙으로 완성된, 세계에서 가장 널리 연구된 보드게임입니다.", en: "Chess descends from 6th-century Indian chaturanga, refined through Persia into the modern European rules — the most deeply studied board game in the world.", ja: "チェスは6世紀インドのチャトランガに起源を持ち、ペルシャを経てヨーロッパで現在のルールに完成した、世界で最も研究されたボードゲームです。", zh: "国际象棋起源于6世纪印度的恰图兰卡，经波斯传入欧洲并形成现代规则，是世界上被研究最深的棋类游戏。", fr: "Les échecs descendent du chaturanga indien du VIe siècle, affiné via la Perse jusqu'aux règles européennes modernes — le jeu de plateau le plus étudié au monde.", es: "El ajedrez desciende del chaturanga indio del siglo VI, refinado a través de Persia hasta las reglas europeas modernas: el juego de mesa más estudiado del mundo." },
    how: { ko: "16개의 기물로 상대의 킹을 잡을 수밖에 없는 상태(체크메이트)로 만들면 승리합니다. 흰색이 선공입니다.", en: "Win by checkmating the opponent's king with your 16 pieces. White moves first.", ja: "16個の駒で相手のキングをチェックメイトにすれば勝利。白が先手です。", zh: "用16枚棋子将死对方的王即获胜。白方先行。", fr: "Gagnez en mettant le roi adverse échec et mat avec vos 16 pièces. Les blancs jouent en premier.", es: "Gana dando jaque mate al rey rival con tus 16 piezas. Las blancas mueven primero." },
    faqs: [
      { q: { ko: "AI 난이도는 어떻게 다른가요?", en: "How do the AI levels differ?", ja: "AIの難易度はどう違いますか？", zh: "AI难度有什么区别？", fr: "Quelles différences entre les niveaux d'IA ?", es: "¿En qué se diferencian los niveles de IA?" }, a: { ko: "견습생은 가끔 실수하는 1수 탐색, 숙련가는 2수, 명인은 3수 깊이의 네가맥스 탐색으로 둡니다. 탐색은 이 페이지에서 실행되므로 명인 난이도는 복잡한 판에서 잠시 더 걸릴 수 있습니다.", en: "Apprentice searches 1 ply with occasional mistakes, Adept 2 plies, and Master 3 plies with negamax. Search runs on this page, so Master may take a little longer in complex positions.", ja: "見習いは時々ミスをする1手探索、熟練者は2手、名人は3手のネガマックス探索です。探索はこのページで実行されるため、複雑な局面では名人が少し長くかかる場合があります。", zh: "学徒搜索1步且偶有失误，行家搜索2步，大师使用3步负极大搜索。搜索在当前页面运行，因此复杂局面下大师可能稍慢。", fr: "L'apprenti cherche à 1 demi-coup avec quelques erreurs, l'adepte à 2 et le maître à 3 avec negamax. Le calcul s'exécute sur cette page ; le niveau maître peut donc prendre un peu plus de temps dans une position complexe.", es: "El aprendiz busca 1 media jugada con errores ocasionales, el experto 2 y el maestro 3 mediante negamax. La búsqueda se ejecuta en esta página, por lo que el nivel maestro puede tardar algo más en posiciones complejas." } },
      { q: { ko: "캐슬링과 앙파상도 지원하나요?", en: "Are castling and en passant supported?", ja: "キャスリングとアンパッサンは対応していますか？", zh: "支持王车易位和吃过路兵吗？", fr: "Le roque et la prise en passant sont-ils pris en charge ?", es: "¿Se admiten el enroque y la captura al paso?" }, a: { ko: "네. 체크 중이거나 공격받는 칸을 지나는 캐슬링은 금지되며, 앙파상은 상대 폰이 두 칸 전진한 직후 한 수에만 가능합니다. 폰은 퀸·룩·비숍·나이트 중 하나로 승격할 수 있고, 3회 반복·50수·기물 부족 무승부도 판정합니다.", en: "Yes. Castling is forbidden while in check or through an attacked square; en passant is available only on the immediate reply to a two-square pawn move. Pawns may promote to queen, rook, bishop or knight, and the game detects threefold repetition, the fifty-move rule and insufficient material.", ja: "はい。チェック中や攻撃されているマスを通るキャスリングは禁止され、アンパッサンは相手のポーンが2マス進んだ直後の1手だけ可能です。昇格はクイーン・ルーク・ビショップ・ナイトから選べ、同一局面3回・50手・戦力不足の引き分けも判定します。", zh: "支持。被将军时或经过受攻击格时不能王车易位；吃过路兵仅可在对方兵走两格后的紧接一手进行。兵可升变为后、车、象或马，并判定三次重复、五十回合规则和子力不足平局。", fr: "Oui. Le roque est interdit en échec ou à travers une case attaquée ; la prise en passant n'est possible qu'immédiatement après l'avance de deux cases d'un pion. La promotion offre dame, tour, fou ou cavalier, et le jeu détecte triple répétition, règle des cinquante coups et matériel insuffisant.", es: "Sí. No se puede enrocar estando en jaque ni atravesando una casilla atacada; la captura al paso solo está disponible justo después del avance doble de un peón rival. La promoción permite dama, torre, alfil o caballo, y se detectan triple repetición, regla de cincuenta movimientos y material insuficiente." } },
    ],
  },
  gomoku: {
    origin: { ko: "오목은 동아시아에서 수백 년간 즐겨온 오목 놓기 게임으로, 일본에서 '고모쿠나라베'로 정형화되었고 국제 렌주 규칙의 모태가 되었습니다.", en: "Gomoku (five in a row) has been played across East Asia for centuries, formalized in Japan as gomoku-narabe and the ancestor of international Renju rules.", ja: "五目並べは東アジアで数百年親しまれてきたゲームで、日本で定型化され、国際連珠ルールの母体となりました。", zh: "五子棋在东亚流传数百年，在日本被规范化为“五目并べ”，并成为国际连珠规则的前身。", fr: "Le gomoku (cinq en ligne) se joue en Asie de l'Est depuis des siècles, formalisé au Japon et ancêtre des règles internationales du renju.", es: "El gomoku (cinco en línea) se juega en Asia Oriental desde hace siglos; se formalizó en Japón y es el antecesor de las reglas internacionales del renju." },
    how: { ko: "15×15 판에 흑백이 번갈아 돌을 놓아 가로·세로·대각선 어느 방향이든 5개를 먼저 이으면 승리합니다.", en: "Players alternate placing stones on a 15×15 board; first to connect five in any direction wins.", ja: "15×15の盤に交互に石を置き、縦・横・斜めのいずれかに先に5つ並べた方が勝ちです。", zh: "在15×15棋盘上轮流落子，任意方向先连成五子者胜。", fr: "Placez des pierres à tour de rôle sur un plateau 15×15 ; le premier à en aligner cinq gagne.", es: "Coloca piedras por turnos en un tablero de 15×15; gana el primero en alinear cinco." },
    faqs: [
      { q: { ko: "선공(흑)이 유리한가요?", en: "Does the first player (black) have an advantage?", ja: "先手（黒）が有利ですか？", zh: "先手（黑棋）有优势吗？", fr: "Le premier joueur (noir) a-t-il un avantage ?", es: "¿Tiene ventaja el primer jugador (negras)?" }, a: { ko: "네, 제한 없는 오목에서 흑은 이론상 필승입니다. 그래서 공식 렌주 규칙은 흑에게 3-3, 4-4 같은 금수를 둡니다. 이 게임은 캐주얼 자유 규칙입니다.", en: "Yes — with no restrictions, black is a theoretical forced win, which is why official Renju bans double-threes and double-fours for black. This version uses casual free rules.", ja: "はい。制限のない五目並べでは黒は理論上必勝で、公式連珠では三三・四四などの禁手があります。本ゲームはカジュアルな自由ルールです。", zh: "是的——无限制五子棋中黑棋理论必胜，因此正式连珠规则对黑棋设有三三、四四等禁手。本游戏采用休闲自由规则。", fr: "Oui — sans restriction, noir gagne en théorie, d'où les coups interdits du renju officiel. Cette version utilise des règles libres casual.", es: "Sí: sin restricciones, las negras ganan en teoría, por eso el renju oficial les prohíbe dobles-tres y dobles-cuatro. Esta versión usa reglas libres casual." } },
      { q: { ko: "AI를 이기는 팁이 있나요?", en: "Any tips to beat the AI?", ja: "AIに勝つコツは？", zh: "有战胜AI的技巧吗？", fr: "Des astuces pour battre l'IA ?", es: "¿Consejos para vencer a la IA?" }, a: { ko: "열린 3(양쪽이 뚫린 3연속)을 두 개 동시에 만드는 이중 위협이 핵심입니다. AI는 하나는 막아도 둘은 못 막습니다.", en: "Create a double threat — two open threes at once. The AI can block one, not both.", ja: "両端の開いた三を同時に二つ作る二重の脅威が鍵です。AIは片方しか防げません。", zh: "关键是制造双重威胁——同时形成两个活三。AI只能挡住一个。", fr: "Créez une double menace — deux trois ouverts à la fois. L'IA n'en bloque qu'un.", es: "Crea una doble amenaza: dos treses abiertos a la vez. La IA solo puede bloquear uno." } },
    ],
  },
  sudoku: {
    origin: { ko: "스도쿠는 1979년 미국의 '넘버 플레이스'로 시작해 1984년 일본 니코리사가 '스도쿠'라 이름 붙이며 세계적 퍼즐이 되었습니다.", en: "Sudoku began as 'Number Place' in 1979 America and became a global phenomenon after Japan's Nikoli named it 'Sudoku' in 1984.", ja: "数独は1979年アメリカの「ナンバープレース」に始まり、1984年に日本のニコリが「数独」と名付け世界的パズルになりました。", zh: "数独源于1979年美国的“Number Place”，1984年日本Nikoli公司将其命名为“数独”后风靡全球。", fr: "Le sudoku est né en 1979 aux États-Unis sous le nom « Number Place » et est devenu mondial après que le japonais Nikoli l'a nommé « Sudoku » en 1984.", es: "El sudoku nació en 1979 en EE. UU. como 'Number Place' y se volvió global cuando la japonesa Nikoli lo llamó 'Sudoku' en 1984." },
    how: { ko: "9×9 격자의 각 행·열·3×3 박스에 1~9가 한 번씩만 들어가도록 빈칸을 채웁니다.", en: "Fill the 9×9 grid so every row, column and 3×3 box contains the digits 1-9 exactly once.", ja: "9×9の各行・列・3×3ボックスに1〜9が一度ずつ入るように空欄を埋めます。", zh: "填满9×9网格，使每行、每列和每个3×3宫格都恰好包含1-9。", fr: "Remplissez la grille 9×9 pour que chaque ligne, colonne et boîte 3×3 contienne les chiffres 1 à 9 une seule fois.", es: "Rellena la cuadrícula de 9×9 para que cada fila, columna y caja de 3×3 contenga los dígitos 1-9 exactamente una vez." },
    faqs: [
      { q: { ko: "찍지 않고 푸는 기본 기법은?", en: "What are the basic no-guess techniques?", ja: "推測せずに解く基本テクニックは？", zh: "不靠猜的基本技巧有哪些？", fr: "Quelles techniques de base sans deviner ?", es: "¿Cuáles son las técnicas básicas sin adivinar?" }, a: { ko: "행·열·박스에서 한 숫자가 들어갈 칸이 하나뿐인 '히든 싱글', 한 칸에 후보가 하나뿐인 '네이키드 싱글'부터 시작하세요. 모든 표준 퍼즐은 논리만으로 풀립니다.", en: "Start with hidden singles (only one cell in a unit can take a digit) and naked singles (a cell with one candidate). Every proper puzzle is solvable by logic alone.", ja: "ある数字の入る場所が一つしかない「隠れシングル」、候補が一つしかない「裸のシングル」から始めましょう。標準的な問題は論理だけで解けます。", zh: "从“隐性唯一”（某数字在一个单元中只有一个可放位置）和“显性唯一”（某格只剩一个候选数）开始。所有标准题目仅凭逻辑即可解出。", fr: "Commencez par les singletons cachés et nus. Toute grille correcte se résout par pure logique.", es: "Empieza con los únicos ocultos y desnudos. Todo sudoku correcto se resuelve solo con lógica." } },
    ],
  },
  minesweeper: {
    origin: { ko: "지뢰찾기는 1960년대 메인프레임 게임에서 기원해 1992년 윈도우 3.1에 기본 탑재되며 전 세계 사무실의 국민 퍼즐이 되었습니다.", en: "Minesweeper traces back to 1960s mainframe games and became a worldwide office staple when it shipped with Windows 3.1 in 1992.", ja: "マインスイーパは1960年代のメインフレームゲームに起源を持ち、1992年にWindows 3.1へ標準搭載され世界的な定番パズルになりました。", zh: "扫雷起源于1960年代的大型机游戏，1992年随Windows 3.1预装后风靡全球办公室。", fr: "Le démineur remonte aux jeux sur mainframe des années 1960 et est devenu incontournable avec Windows 3.1 en 1992.", es: "El buscaminas se remonta a los juegos de mainframe de los años 60 y se popularizó al incluirse en Windows 3.1 en 1992." },
    how: { ko: "숫자는 인접 8칸의 지뢰 수입니다. 지뢰가 아닌 모든 칸을 열면 승리하며, 길게 누르거나 우클릭으로 깃발을 꽂습니다.", en: "Each number counts mines in the 8 adjacent cells. Clear every safe cell to win; long-press or right-click to flag.", ja: "数字は隣接8マスの地雷数です。地雷以外を全て開ければ勝利。長押しまたは右クリックで旗を立てます。", zh: "数字表示相邻8格中的地雷数。翻开所有安全格即胜，长按或右键插旗。", fr: "Chaque chiffre compte les mines des 8 cases adjacentes. Ouvrez toutes les cases sûres pour gagner ; appui long ou clic droit pour un drapeau.", es: "Cada número cuenta las minas en las 8 casillas adyacentes. Despeja todas las casillas seguras; mantén pulsado o clic derecho para bandera." },
    faqs: [
      { q: { ko: "첫 클릭에 지뢰가 터질 수 있나요?", en: "Can the first click hit a mine?", ja: "最初のクリックで地雷を踏むことはありますか？", zh: "第一下会踩雷吗？", fr: "Le premier clic peut-il toucher une mine ?", es: "¿Puede el primer clic tocar una mina?" }, a: { ko: "아니요. 첫 클릭은 항상 안전하도록 지뢰가 배치됩니다 — 표준 지뢰찾기 관례입니다.", en: "No — mines are placed after your first click so it is always safe, per standard Minesweeper convention.", ja: "いいえ。最初のクリックが常に安全になるよう地雷が配置されます。標準的な仕様です。", zh: "不会。地雷在你首次点击后才布置，确保首击安全——这是扫雷的标准惯例。", fr: "Non — les mines sont placées après votre premier clic, toujours sûr, selon la convention standard.", es: "No: las minas se colocan tras tu primer clic, que siempre es seguro, según la convención estándar." } },
      {
        q: { ko: "초급·중급·고급의 차이는 무엇인가요?", en: "What's the difference between Beginner, Intermediate, and Expert?", ja: "初級・中級・上級の違いは？", zh: "初级、中级、高级有什么区别？", fr: "Quelle est la différence entre Débutant, Intermédiaire et Expert ?", es: "¿Cuál es la diferencia entre Principiante, Intermedio y Experto?" },
        a: {
          ko: "판 크기와 지뢰 수가 다릅니다. 초급은 10×10에 지뢰 10개, 중급은 16×16에 40개(오늘의 도전과 같은 크기), 고급은 30×16에 99개로 훨씬 넓고 촘촘합니다. 오늘의 도전은 모두에게 같은 중급 크기 판이 주어지고 연속 기록이 쌓입니다.",
          en: "The board size and mine density differ. Beginner is 10×10 with 10 mines, Intermediate is 16×16 with 40 (the same size as the Daily Challenge), and Expert is 30×16 with 99 — much larger and denser. The Daily Challenge gives everyone the same Intermediate-sized board and tracks a streak.",
          ja: "盤面サイズと地雷密度が異なります。初級は10×10で地雷10個、中級は16×16で40個(デイリー挑戦と同サイズ)、上級は30×16で99個とはるかに広く密度も高くなります。デイリー挑戦は全員に同じ中級サイズの盤面が与えられ、連続記録が記録されます。",
          zh: "棋盘大小和地雷密度不同。初级为10×10共10个地雷，中级为16×16共40个(与每日挑战同尺寸)，高级为30×16共99个，范围更大更密集。每日挑战为所有人提供相同的中级尺寸棋盘并记录连胜。",
          fr: "La taille de la grille et la densité de mines diffèrent. Débutant fait 10×10 avec 10 mines, Intermédiaire 16×16 avec 40 (même taille que le Défi du jour), et Expert 30×16 avec 99 — bien plus grand et dense. Le Défi du jour donne à tous la même grille Intermédiaire et suit une série.",
          es: "El tamaño del tablero y la densidad de minas difieren. Principiante es 10×10 con 10 minas, Intermedio 16×16 con 40 (el mismo tamaño que el Reto diario), y Experto 30×16 con 99 — mucho más grande y denso. El Reto diario da a todos el mismo tablero Intermedio y registra una racha.",
        },
      },
    ],
  },
  reversi: {
    origin: { ko: "리버시는 1883년 영국에서 만들어졌고, 1973년 일본에서 '오델로'라는 이름과 표준 규칙으로 재탄생해 세계 대회가 열리는 게임이 되었습니다.", en: "Reversi was invented in 1883 England and reborn in 1973 Japan as 'Othello' with standardized rules and world championships.", ja: "リバーシは1883年イギリスで生まれ、1973年に日本で「オセロ」として標準ルールとともに再誕生し、世界大会が開かれるゲームになりました。", zh: "黑白棋于1883年诞生于英国，1973年在日本以“奥赛罗”之名和标准规则重生，并发展出世界锦标赛。", fr: "Le reversi, inventé en Angleterre en 1883, renaît au Japon en 1973 sous le nom d'« Othello » avec des règles standardisées et des championnats du monde.", es: "El reversi se inventó en Inglaterra en 1883 y renació en Japón en 1973 como 'Othello', con reglas estandarizadas y campeonatos mundiales." },
    how: { ko: "상대 돌을 내 돌 사이에 끼우면 전부 내 색으로 뒤집힙니다. 판이 가득 찼을 때 돌이 많은 쪽이 승리합니다.", en: "Bracket opponent discs between yours to flip them. Most discs when the board fills wins.", ja: "相手の石を自分の石で挟むと全て自分の色に裏返ります。盤が埋まった時に多い方が勝ちです。", zh: "用己方棋子夹住对方棋子即可翻转。棋盘填满时棋子多者获胜。", fr: "Encadrez les pions adverses pour les retourner. Le plus de pions à la fin gagne.", es: "Encierra las fichas rivales entre las tuyas para voltearlas. Gana quien tenga más al llenarse el tablero." },
    faqs: [
      { q: { ko: "왜 모서리가 중요한가요?", en: "Why are corners so important?", ja: "なぜ角が重要なのですか？", zh: "为什么角落如此重要？", fr: "Pourquoi les coins sont-ils si importants ?", es: "¿Por qué son tan importantes las esquinas?" }, a: { ko: "모서리 돌은 절대 뒤집히지 않아 주변을 안정시키는 앵커가 됩니다. 초중반에 돌을 많이 먹는 것보다 모서리를 확보하는 것이 훨씬 중요합니다.", en: "Corner discs can never be flipped, anchoring everything around them. Securing corners matters far more than flipping many discs early.", ja: "角の石は絶対に裏返らず、周囲を安定させるアンカーになります。序中盤は石数より角の確保が重要です。", zh: "角上的棋子永远不会被翻转，是稳定周边的锚点。前中期抢角远比多吃子重要。", fr: "Les pions de coin ne peuvent jamais être retournés. Sécuriser les coins compte bien plus que retourner beaucoup de pions tôt.", es: "Las fichas de esquina nunca se voltean y anclan todo a su alrededor. Asegurar esquinas importa mucho más que voltear muchas fichas pronto." } },
    ],
  },
  solitaire: {
    origin: { ko: "클론다이크 솔리테어는 19세기 후반 클론다이크 골드러시 시기에 이름을 얻었고, 1990년 윈도우 기본 게임으로 실리며 역사상 가장 많이 플레이된 카드게임이 되었습니다.", en: "Klondike solitaire took its name from the late-1800s Klondike gold rush and became history's most-played card game after shipping with Windows in 1990.", ja: "クロンダイク・ソリティアは19世紀末のゴールドラッシュに名を由来し、1990年にWindowsに搭載され史上最もプレイされたカードゲームになりました。", zh: "克朗代克接龙得名于19世纪末的克朗代克淘金热，1990年随Windows预装后成为史上被玩最多的纸牌游戏。", fr: "Le solitaire Klondike tire son nom de la ruée vers l'or du Klondike et est devenu le jeu de cartes le plus joué de l'histoire via Windows en 1990.", es: "El solitario Klondike tomó su nombre de la fiebre del oro y se convirtió en el juego de cartas más jugado de la historia gracias a Windows en 1990." },
    how: { ko: "테이블로에서 카드를 색 교차 내림차순으로 옮기며, 에이스부터 무늬별 오름차순으로 파운데이션 4더미를 완성하면 승리합니다.", en: "Build tableau columns down in alternating colors, and win by completing all four foundations up from ace by suit.", ja: "場札は色違いの降順で重ね、エースからスート別の昇順で4つの組札を完成させれば勝利です。", zh: "在牌桌区按红黑交替降序叠牌，把四组花色从A开始升序移入基础堆即获胜。", fr: "Empilez le tableau en ordre décroissant et couleurs alternées ; gagnez en complétant les quatre fondations de l'as au roi par couleur.", es: "Ordena el tablero en descendente alternando colores y gana completando las cuatro bases del as al rey por palo." },
    faqs: [
      { q: { ko: "모든 판이 클리어 가능한가요?", en: "Is every deal winnable?", ja: "全ての配牌はクリア可能ですか？", zh: "每一局都能通关吗？", fr: "Toutes les donnes sont-elles gagnables ?", es: "¿Todas las partidas se pueden ganar?" }, a: { ko: "아니요. 무작위 클론다이크의 약 80% 정도만 이론상 클리어 가능하며, 실제 승률은 훨씬 낮습니다. 막혔다면 당신 탓이 아닐 수 있습니다.", en: "No — only roughly 80% of random Klondike deals are theoretically winnable, and real win rates are far lower. A dead end may not be your fault.", ja: "いいえ。ランダムな配牌のうち理論上クリア可能なのは約8割で、実際の勝率はさらに低いです。詰んでもあなたのせいとは限りません。", zh: "不能。随机发牌中理论可解的约占80%，实际胜率更低。卡住未必是你的问题。", fr: "Non — environ 80 % des donnes aléatoires sont théoriquement gagnables, et le taux réel est bien plus bas.", es: "No: solo cerca del 80 % de los repartos aleatorios se pueden ganar en teoría, y la tasa real es mucho menor." } },
    ],
    rules: { ko: ["클론다이크: 7개 테이블로 열 + 4개 파운데이션 + 예비 더미(스톡).", "테이블로에서는 색이 다른 카드를 내림차순으로 쌓습니다(검정 J 위에 빨강 10).", "빈 열에는 K(또는 K로 시작하는 묶음)만 놓을 수 있습니다.", "파운데이션은 무늬별로 A→K 오름차순으로 완성합니다.", "막히면 스톡에서 카드를 뒤집어 새 선택지를 얻습니다."], en: ["Klondike: 7 tableau columns + 4 foundations + a stock pile.", "Stack the tableau in descending order, alternating colors (red 10 on black J).", "Only a king (or a king-led sequence) can move to an empty column.", "Foundations build up by suit from ace to king.", "When stuck, flip cards from the stock for new options."], ja: ["クロンダイク: 場札7列 + 組札4 + 山札(ストック)。", "場札は色違いを降順に重ねる(黒Jの上に赤10)。", "空き列にはK(またはKで始まる列)だけ置ける。", "組札はスート別にA→Kで昇順に完成させる。", "行き詰まったら山札をめくって新しい選択肢を得る。"], zh: ["克朗代克：7个牌桌列 + 4个基础堆 + 牌库(存牌堆)。", "牌桌区红黑交替降序叠牌(黑J上放红10)。", "空列只能放K(或以K开头的牌组)。", "基础堆按花色从A到K升序完成。", "卡住时从牌库翻牌获得新选择。"], fr: ["Klondike : 7 colonnes de tableau + 4 fondations + une pioche.", "Empilez le tableau en ordre décroissant, couleurs alternées (10 rouge sur J noir).", "Seul un Roi (ou une séquence menée par un Roi) va sur une colonne vide.", "Les fondations montent par couleur de l'As au Roi.", "Bloqué ? Retournez des cartes de la pioche pour de nouvelles options."], es: ["Klondike: 7 columnas de tablero + 4 bases + un mazo (stock).", "Apila el tablero en orden descendente, colores alternos (10 rojo sobre J negro).", "Solo un Rey (o una secuencia encabezada por Rey) va a una columna vacía.", "Las bases suben por palo del As al Rey.", "Si te atascas, voltea cartas del mazo para nuevas opciones."] },
  },
  "game-2048": {
    origin: { ko: "2048은 2014년 19세 개발자 가브리엘레 치룰리가 주말에 만든 오픈소스 게임으로, 공개 직후 전 세계적 신드롬이 되었습니다.", en: "2048 was built in a weekend in 2014 by 19-year-old Gabriele Cirulli as an open-source project and became an instant worldwide phenomenon.", ja: "2048は2014年、当時19歳のガブリエレ・チルッリが週末に作ったオープンソースゲームで、公開直後に世界的ブームになりました。", zh: "2048是2014年19岁开发者Gabriele Cirulli在一个周末做出的开源游戏，发布后立刻风靡全球。", fr: "2048 a été créé en un week-end en 2014 par Gabriele Cirulli, 19 ans, en open source, et est devenu un phénomène mondial immédiat.", es: "2048 fue creado en un fin de semana de 2014 por Gabriele Cirulli, de 19 años, como proyecto de código abierto, y fue un fenómeno mundial inmediato." },
    how: { ko: "상하좌우로 밀어 같은 숫자를 합치고, 2048 타일을 만들면 승리합니다. 판이 가득 차 움직일 수 없으면 종료됩니다.", en: "Swipe to merge equal tiles; reach the 2048 tile to win. The game ends when no move is possible.", ja: "上下左右にスワイプして同じ数字を合体させ、2048タイルを作れば勝利。動かせなくなったら終了です。", zh: "上下左右滑动合并相同数字，合成2048即胜。无法移动时游戏结束。", fr: "Glissez pour fusionner les tuiles égales ; atteignez 2048 pour gagner.", es: "Desliza para fusionar fichas iguales; llega a 2048 para ganar." },
    faqs: [
      { q: { ko: "고득점 전략이 있나요?", en: "What's the high-score strategy?", ja: "ハイスコアのコツは？", zh: "有什么高分策略？", fr: "Quelle stratégie pour un meilleur score ?", es: "¿Cuál es la estrategia para puntuar alto?" }, a: { ko: "최대 타일을 한 구석에 고정하고, 그 구석 반대 방향(보통 한 방향)은 가급적 누르지 않는 것이 정석입니다. 한 줄을 내림차순으로 유지하세요.", en: "Lock your biggest tile in one corner and avoid the direction that would dislodge it. Keep one edge row in descending order.", ja: "最大タイルを角に固定し、それを崩す方向は極力押さないのが定石です。一列を降順に保ちましょう。", zh: "把最大数字固定在一个角落，尽量不按会移动它的方向。保持一条边按降序排列。", fr: "Bloquez votre plus grande tuile dans un coin et évitez la direction qui la délogerait.", es: "Fija tu ficha más grande en una esquina y evita la dirección que la movería." } },
    ],
  },
  wordle: {
    origin: { ko: "워들은 2021년 조시 워들이 파트너를 위해 만든 단어 게임으로, 회색·노랑·초록 공유 격자가 SNS를 뒤덮으며 2022년 뉴욕타임스에 인수되었습니다.", en: "Wordle was created in 2021 by Josh Wardle for his partner; its gray-yellow-green share grids swept social media and the New York Times acquired it in 2022.", ja: "Wordleは2021年にジョシュ・ワードルがパートナーのために作った単語ゲームで、共有グリッドがSNSを席巻し、2022年にNYタイムズに買収されました。", zh: "Wordle是Josh Wardle在2021年为伴侣制作的单词游戏，其灰黄绿分享格风靡社交网络，2022年被《纽约时报》收购。", fr: "Wordle a été créé en 2021 par Josh Wardle pour sa compagne ; ses grilles de partage ont envahi les réseaux et le New York Times l'a racheté en 2022.", es: "Wordle fue creado en 2021 por Josh Wardle para su pareja; sus cuadrículas grises-amarillas-verdes arrasaron en redes y el New York Times lo compró en 2022." },
    how: { ko: "여섯 번 안에 다섯 글자 단어를 맞히세요. 초록=위치까지 정확, 노랑=단어에 있지만 다른 위치, 회색=없는 글자입니다.", en: "Guess the five-letter word in six tries. Green = right letter and spot, yellow = in the word elsewhere, gray = not present.", ja: "6回以内に5文字の単語を当てます。緑=位置も正解、黄=単語にあるが別の位置、灰=含まれない文字。", zh: "六次机会内猜出五字母单词。绿色=字母和位置都对，黄色=在单词中但位置不对，灰色=不存在。", fr: "Devinez le mot de cinq lettres en six essais. Vert = bonne lettre bien placée, jaune = présente ailleurs, gris = absente.", es: "Adivina la palabra de cinco letras en seis intentos. Verde = letra y posición correctas, amarillo = está en otra posición, gris = no está." },
    faqs: [
      { q: { ko: "좋은 시작 단어는 무엇인가요?", en: "What's a good starting word?", ja: "良い初手の単語は？", zh: "开局用什么单词好？", fr: "Quel bon mot de départ ?", es: "¿Cuál es una buena palabra inicial?" }, a: { ko: "모음과 빈출 자음을 많이 포함한 단어가 유리합니다 — SLATE, CRANE, ADIEU가 널리 쓰이는 시작 단어입니다.", en: "Words rich in vowels and common consonants work best — SLATE, CRANE and ADIEU are popular openers.", ja: "母音と頻出子音を多く含む単語が有利です。SLATE、CRANE、ADIEUが定番です。", zh: "含元音和常见辅音多的词最好——SLATE、CRANE、ADIEU是常用开局词。", fr: "Les mots riches en voyelles et consonnes fréquentes marchent le mieux — SLATE, CRANE, ADIEU.", es: "Las palabras ricas en vocales y consonantes comunes funcionan mejor: SLATE, CRANE y ADIEU." } },
    ],
  },
  tamagotchi: {
    origin: { ko: "다마고치는 1996년 반다이가 출시한 휴대용 가상 펫으로, 세계적으로 8천만 대 이상 팔린 육성 게임의 원조입니다. 이 버전은 픽셀 스프라이트와 LCD 화면 감성을 재현했습니다.", en: "The Tamagotchi, released by Bandai in 1996, sold over 80 million units and defined the virtual-pet genre. This version recreates the pixel sprites and LCD-screen feel.", ja: "たまごっちは1996年にバンダイが発売した携帯育成ゲームで、世界で8千万台以上売れた元祖バーチャルペットです。このバージョンはピクセルスプライトとLCD画面の雰囲気を再現しています。", zh: "拓麻歌子是万代1996年推出的掌上电子宠物，全球销量超8000万台，是养成游戏的鼻祖。本版本重现了像素精灵和LCD屏幕的质感。", fr: "Le Tamagotchi, lancé par Bandai en 1996, s'est vendu à plus de 80 millions d'unités et a défini le genre. Cette version recrée les sprites pixel et l'ambiance écran LCD.", es: "El Tamagotchi, lanzado por Bandai en 1996, vendió más de 80 millones de unidades y definió el género. Esta versión recrea los sprites pixel y la estética LCD." },
    how: { ko: "알에 이름을 지어 부화시키고, 실시간으로 줄어드는 포만감·수분·행복·청결을 관리하세요. 하루 세 끼 식사 시간과 4시간마다의 산책을 챙기면 건강하게 어른까지 자랍니다. 방치하면 죽습니다.", en: "Name your egg, hatch it, and manage fullness, hydration, happiness and cleanliness as they decay in real time. Keep three daily meal windows and 4-hourly walks to raise it healthy to adulthood. Neglect is fatal.", ja: "たまごに名前をつけて孵化させ、リアルタイムで減る満腹度・水分・ごきげん・清潔を管理します。1日3食の時間と4時間ごとの散歩を守れば健康に育ちます。放置すると死んでしまいます。", zh: "给蛋起名孵化后，管理实时下降的饱食、水分、快乐和清洁。按时吃三餐、每4小时散步，就能健康长大成年。疏于照顾会死亡。", fr: "Nommez votre œuf, faites-le éclore et gérez satiété, hydratation, bonheur et propreté qui baissent en temps réel. Respectez les trois repas et les promenades pour l'élever jusqu'à l'âge adulte.", es: "Ponle nombre al huevo, haz que eclosione y gestiona saciedad, hidratación, felicidad y limpieza en tiempo real. Cumple las tres comidas y los paseos para criarlo sano hasta adulto." },
    faqs: [
      { q: { ko: "어떤 동물이 나오나요?", en: "Which pets can hatch?", ja: "どんなペットが生まれる？", zh: "会孵出什么宠物？", fr: "Quels animaux peuvent éclore ?", es: "¿Qué mascotas pueden salir?" }, a: { ko: "강아지·고양이·새 중 하나가 무작위로 태어나며, 10% 확률로 숨겨진 드래곤이 나옵니다. 어른이 되면 종별로 성격(움직임)이 달라집니다.", en: "A dog, cat or bird hatches at random — with a 10% chance of a hidden dragon. Adults develop species-specific personalities in how they move.", ja: "犬・猫・鳥のいずれかがランダムで生まれ、10%の確率で隠しドラゴンが出ます。おとなになると種ごとに動きの個性が出ます。", zh: "随机孵出小狗、小猫或小鸟，有10%几率出隐藏的龙。成年后不同物种会有不同的动作个性。", fr: "Un chien, un chat ou un oiseau éclot au hasard — avec 10 % de chances d'obtenir un dragon caché.", es: "Sale un perro, gato o pájaro al azar, con un 10 % de probabilidad de un dragón oculto." } },
    ],
  },
  "dot-runner": {
    origin: { ko: "한 번의 탭으로 즐기는 무한 러너입니다. 크롬 공룡 게임처럼 장애물을 뛰어넘으며 최대한 오래 달리는 장르의 미니멀 버전입니다.", en: "A one-tap endless runner — a minimal take on the genre made famous by Chrome's dinosaur game: jump obstacles and survive as long as you can.", ja: "ワンタップで遊ぶ無限ランナー。Chromeの恐竜ゲームで有名なジャンルのミニマル版で、障害物を跳び越えて走り続けます。", zh: "一键操作的无尽跑酷，是Chrome小恐龙所代表的跑酷玩法的极简版：跳过障碍，尽量跑得更远。", fr: "Un runner infini à un doigt — version minimaliste du genre rendu célèbre par le dinosaure de Chrome.", es: "Un runner infinito de un toque: versión mínima del género que hizo famoso el dinosaurio de Chrome." },
    how: { ko: "탭·클릭·스페이스로 점프해 빨간 장애물을 피하고 노란 코인을 모으세요. 달릴수록 점수가 오릅니다.", en: "Tap, click or press space to jump; dodge red blocks and grab gold coins. Score rises the longer you run.", ja: "タップ・クリック・スペースでジャンプ。赤い障害物を避け、金のコインを集めます。走るほどスコアが上がります。", zh: "点按、点击或按空格跳跃；躲开红色障碍并收集金币。跑得越久分数越高。", fr: "Touchez, cliquez ou appuyez sur espace pour sauter ; évitez les blocs rouges et prenez les pièces.", es: "Toca, haz clic o pulsa espacio para saltar; esquiva los bloques rojos y coge monedas." },
    faqs: [],
  },
  "dot-pet": {
    origin: { ko: "다마고치식 가상 펫 육성 게임입니다. 방치하면 스탯이 떨어지는 것까지 그대로 — 지난 접속 시각을 기억해 자리를 비운 시간만큼 배고파집니다.", en: "A tamagotchi-style virtual pet. It remembers when you last visited — leave it alone and it gets hungry while you're away.", ja: "たまごっち式のバーチャルペット育成。最後の訪問時刻を覚えていて、離れていた分だけお腹が空きます。", zh: "电子宠物式的养成游戏。它会记住你上次来的时间——离开多久，它就饿多久。", fr: "Un animal virtuel façon tamagotchi. Il se souvient de votre dernière visite et a faim pendant votre absence.", es: "Una mascota virtual estilo tamagotchi. Recuerda tu última visita y pasa hambre mientras no estás." },
    how: { ko: "펫을 고르고 먹이 주기·놀아주기·재우기로 스탯을 관리하세요. 경험치가 차면 아기→어린이→청소년→어른으로 성장합니다.", en: "Pick a pet and manage its stats with feed, play and rest. Earn XP to grow it from baby to child, teen and adult.", ja: "ペットを選び、ごはん・遊び・睡眠でステータスを管理。経験値で赤ちゃん→こども→思春期→おとなに成長します。", zh: "选择宠物，通过喂食、玩耍、休息管理数值。攒经验从幼年长到儿童、少年、成年。", fr: "Choisissez un compagnon et gérez ses stats : nourrir, jouer, coucher. L'XP le fait grandir en quatre stades.", es: "Elige una mascota y gestiona sus estadísticas: alimentar, jugar y dormir. La XP la hace crecer en cuatro etapas." },
    faqs: [],
  },
  "dot-jumpking": {
    origin: { ko: "'점프 킹' 장르의 미니 버전입니다. 점프 힘을 얼마나 모을지가 전부인 리스크 관리 게임으로, 원작처럼 한 번의 실수로 추락할 수 있습니다.", en: "A mini take on the 'Jump King' genre — it's all about how much jump power you commit, and one bad leap can send you falling.", ja: "「ジャンプキング」ジャンルのミニ版。ジャンプ力をどれだけ溜めるかが全てで、1回のミスで落下します。", zh: "“Jump King”类玩法的迷你版——蓄多少力起跳就是一切，一次失误就可能坠落。", fr: "Une mini-version du genre « Jump King » : tout est dans la charge du saut, et un mauvais bond vous fait chuter.", es: "Una miniversión del género 'Jump King': todo depende de cuánta potencia cargues, y un mal salto te hace caer." },
    how: { ko: "화면을 꾹 눌러 힘을 모으고, 놓으면 누른 방향으로 점프합니다. 플랫폼을 밟고 최대한 높이 올라가세요.", en: "Hold the screen to charge power; release to jump toward where you hold. Land on platforms and climb as high as you can.", ja: "画面を長押しでチャージ、離すと押した方向へジャンプ。足場に乗って高く登りましょう。", zh: "按住屏幕蓄力，松开朝按住的方向跳。踩住平台尽量往上爬。", fr: "Maintenez l'écran pour charger ; relâchez pour sauter vers ce point. Grimpez le plus haut possible.", es: "Mantén la pantalla para cargar; suelta para saltar hacia ese punto. Sube lo más alto que puedas." },
    faqs: [],
  },
  "block-burst": {
    origin: { ko: "가로 줄을 지우는 테트리스와, 가로·세로를 함께 터뜨리는 블록 퍼즐을 한 판에 섞었습니다. 줄이 사라지는 대신 폭발과 연쇄가 점수를 만듭니다.", en: "A falling-block hybrid: Tetris-style drops, but a full row or a full column detonates. Score comes from explosions and chains, not just line clears.", ja: "テトリス型の落下に、横一列だけでなく縦一列も爆発するルールを足したハイブリッド。スコアは消去そのものより爆発と連鎖で伸びます。", zh: "把俄罗斯方块式下落和行列同时引爆的方块解谜合在一盘。分数来自爆裂与连锁，而不只是消行。", fr: "Un hybride de chute façon Tetris, mais une ligne ou une colonne pleine explose. Le score vient des détonations et des chaînes.", es: "Un híbrido de caída al estilo Tetris, pero una fila o columna llena detona. La puntuación sale de las explosiones y las cadenas." },
    how: { ko: "블록을 좌우로 옮기고 회전해 쌓으세요. 가로 8칸이나 세로 10칸이 가득 차면 그 줄이 터지고, 위의 블록이 떨어지며 연쇄가 이어질 수 있습니다. 탭은 회전, 빠르게 아래로 스와이프하면 하드 드롭입니다.", en: "Move and rotate falling jewel pieces. Fill all 8 cells of a row or all 10 cells of a column to detonate it; blocks above collapse and can chain. Tap to rotate, swipe down fast to hard-drop.", ja: "落下する宝石を左右に動かして回転させます。横8マスまたは縦10マスが埋まると爆発し、上のブロックが落ちて連鎖します。タップで回転、下への素早いスワイプでハードドロップ。", zh: "左右移动并旋转下落的宝石块。填满横8格或竖10格就会引爆，上方方块落下可连锁。轻点旋转，快速下滑硬降。", fr: "Déplacez et tournez les joyaux. Une ligne de 8 ou une colonne de 10 pleine explose ; les blocs au-dessus tombent et peuvent enchaîner. Touchez pour tourner, glissez vite vers le bas pour la chute dure.", es: "Mueve y gira las joyas. Una fila de 8 o una columna de 10 llena detona; los bloques de arriba caen y pueden encadenar. Toca para girar, desliza rápido hacia abajo para la caída dura." },
    faqs: [
      { q: { ko: "세로 줄은 언제 터지나요?", en: "When does a column explode?", ja: "縦列はいつ爆発する？", zh: "竖列什么时候爆？", fr: "Quand une colonne explose-t-elle ?", es: "¿Cuándo explota una columna?" }, a: { ko: "그 열의 10칸이 모두 차 있어야 합니다. 가로 줄과 동시에 차면 교차 폭발이 나고 점수가 두 배가 됩니다.", en: "All 10 cells in that column must be filled. If a row fills at the same time you get a cross burst and double score.", ja: "その列の10マスがすべて埋まっている必要があります。横列と同時ならクロス爆発でスコアが倍になります。", zh: "该列10格必须全满。若同时填满一行，会交叉引爆并双倍得分。", fr: "Les 10 cases de la colonne doivent être pleines. Une ligne pleine en même temps donne une explosion croisée et un score doublé.", es: "Las 10 celdas de esa columna deben estar llenas. Si una fila se llena a la vez, hay detonación cruzada y puntuación doble." } },
    ],
  },
  "animal-pop": {
    origin: { ko: "애니팡으로 익숙한 60초 매치3 장르입니다. 짧은 제한시간 안에 연쇄를 얼마나 이어가느냐가 점수를 가릅니다.", en: "A 60-second match-3 in the style Koreans know from Anipang — the score comes down to how long you keep cascades chaining.", ja: "60秒制限のマッチ3。短い制限時間内にどれだけ連鎖を繋げるかがスコアを分けます。", zh: "60秒限时三消玩法。能否在短时间内持续连锁决定了分数高低。", fr: "Un match-3 de 60 secondes : le score dépend de la longueur de vos cascades enchaînées.", es: "Un match-3 de 60 segundos: la puntuación depende de cuánto encadenes las cascadas." },
    how: { ko: "이웃한 동물 두 마리를 탭해서 맞바꾸고, 가로·세로 3마리 이상을 맞추면 터집니다. 연쇄로 콤보 5를 쌓으면 10초간 점수 2배 피버!", en: "Tap two neighboring animals to swap; matching 3+ in a row or column pops them. Chain 5 combos for a 10-second double-score fever!", ja: "隣り合う動物をタップで入れ替え、縦横3匹以上でポップ。コンボ5で10秒間スコア2倍のフィーバー！", zh: "点两只相邻动物交换，横竖凑齐3只以上即可消除。连击攒到5触发10秒双倍分数狂热！", fr: "Touchez deux animaux voisins pour les échanger ; 3+ alignés éclatent. 5 combos = 10 s de fièvre double score !", es: "Toca dos animales vecinos para intercambiarlos; 3+ en línea explotan. ¡5 combos activan 10 s de fiebre doble!" },
    faqs: [],
  },
  kurodoko: {
    origin: { ko: "쿠로도코(黒どこ, '검은 칸은 어디?')는 일본 니코리사의 논리 퍼즐로, 해외에서는 Kuromasu라는 이름으로도 알려져 있습니다.", en: "Kurodoko ('where are the black cells?') is a Nikoli logic puzzle, also known abroad as Kuromasu.", ja: "クロドコ(黒どこ)は日本のニコリの論理パズルで、海外ではKuromasuの名でも知られています。", zh: "Kurodoko（“黑格在哪”）是日本Nikoli的逻辑谜题，海外也称Kuromasu。", fr: "Le Kurodoko (« où sont les cases noires ? ») est un puzzle logique de Nikoli, aussi connu sous le nom de Kuromasu.", es: "Kurodoko ('¿dónde están las casillas negras?') es un puzle lógico de Nikoli, también conocido como Kuromasu." },
    how: { ko: "숫자 칸에서 상하좌우로 보이는 흰 칸 수(자신 포함)가 그 숫자와 같아지도록 검은 칸을 칠합니다. 검은 칸끼리는 붙을 수 없고 흰 칸은 모두 이어져야 합니다.", en: "Shade black cells so each number equals the white cells visible from it (itself included). Black cells never touch; whites stay connected.", ja: "数字マスから上下左右に見える白マスの数(自分含む)がその数字になるよう黒マスを塗ります。黒マスは隣接不可、白マスは全て連結。", zh: "涂黑格子，使每个数字格上下左右可见的白格数(含自身)等于该数字。黑格不相邻，白格全连通。", fr: "Noircissez des cases pour que chaque nombre égale les cases blanches visibles (lui compris). Les noires ne se touchent pas.", es: "Sombrea casillas para que cada número iguale las blancas visibles (incluida ella). Las negras nunca se tocan." },
    faqs: [
      { q: { ko: "오늘의 퍼즐은 언제 바뀌나요?", en: "When does the daily puzzle change?", ja: "今日のパズルはいつ変わる？", zh: "每日谜题何时更换？", fr: "Quand le puzzle du jour change-t-il ?", es: "¿Cuándo cambia el puzle diario?" }, a: { ko: "기기 시간 기준 매일 자정에 새 6×6 퍼즐로 바뀌며, 같은 날에는 모두가 같은 판을 풉니다. 규칙을 모두 만족하는 배치라면 정답으로 인정됩니다.", en: "It rolls over at midnight (device time) to a new 6×6 board, and everyone gets the same board on the same day. Any arrangement that satisfies all the rules counts as solved.", ja: "端末時間の毎日0時に新しい6×6の盤面へ切り替わり、同じ日には全員が同じ盤面を解きます。ルールを全て満たす配置なら正解と認められます。", zh: "以设备时间为准，每天零点更换新的6×6盘面，同一天所有人解同一盘面。只要满足全部规则的涂法都算解开。", fr: "Il change à minuit (heure de l'appareil) pour une nouvelle grille 6×6, identique pour tous le même jour. Toute configuration respectant les règles compte comme résolue.", es: "Cambia a medianoche (hora del dispositivo) a un nuevo tablero de 6×6, el mismo para todos ese día. Cualquier configuración que cumpla las reglas cuenta como resuelta." } },
      { q: { ko: "연속 기록(스트릭)은 어떻게 쌓이나요?", en: "How does the streak work?", ja: "連続記録はどう貯まる？", zh: "连续记录如何累积？", fr: "Comment fonctionne la série ?", es: "¿Cómo funciona la racha?" }, a: { ko: "오늘의 퍼즐을 완료한 날이 하루씩 이어질 때마다 스트릭이 1씩 늘고, 하루라도 건너뛰면 다시 1부터 시작합니다. 기록은 이 기기 브라우저에만 저장됩니다.", en: "Solving the daily puzzle on consecutive days grows your streak by one; skipping a day resets it to one. Records are stored only in this device's browser.", ja: "今日のパズルを連続した日に解くごとにストリークが1ずつ増え、1日でも空くと1から再開します。記録はこの端末のブラウザにのみ保存されます。", zh: "连续每天完成每日谜题，连续记录加1；漏掉一天则从1重新开始。记录仅保存在本设备浏览器中。", fr: "Résoudre le puzzle du jour des jours consécutifs augmente la série de un ; sauter un jour la remet à un. Les records restent dans le navigateur de cet appareil.", es: "Resolver el puzle diario en días consecutivos suma uno a la racha; saltarte un día la reinicia. Los récords se guardan solo en el navegador de este dispositivo." } },
    ],
  },
  "puzzle-15": {
    origin: { ko: "15 퍼즐은 1870년대 미국에서 만들어져 1880년 전후 세계적인 열풍을 일으킨 최초의 슬라이딩 퍼즐입니다. 새뮤얼 로이드가 '풀 수 없는 배치' 현상금으로 유명세를 더했습니다.", en: "The 15 puzzle, invented in 1870s America, sparked a worldwide craze around 1880 — Sam Loyd famously offered a prize for an impossible configuration.", ja: "15パズルは1870年代アメリカで生まれ、1880年前後に世界的ブームを起こした元祖スライドパズルです。サム・ロイドの「解けない配置」懸賞でも有名です。", zh: "15拼图诞生于1870年代的美国，1880年前后风靡全球。山姆·劳埃德悬赏“无解排列”的故事广为人知。", fr: "Le taquin, inventé dans les années 1870 aux États-Unis, a déclenché une folie mondiale vers 1880 — Sam Loyd offrit un prix pour une configuration impossible.", es: "El puzle 15, inventado en EE. UU. en los años 1870, causó furor mundial hacia 1880; Sam Loyd ofreció un premio por una configuración imposible." },
    how: { ko: "빈 칸 옆의 타일을 밀어 숫자를 1부터 순서대로 정렬합니다. 이동 수와 시간이 기록됩니다.", en: "Slide tiles next to the gap to arrange the numbers in order. Moves and time are tracked.", ja: "空きマスの隣のタイルをスライドして数字を順番に並べます。手数と時間が記録されます。", zh: "滑动空格旁的方块，把数字按顺序排列。会记录步数和时间。", fr: "Faites glisser les tuiles voisines du vide pour ordonner les nombres. Coups et temps sont chronométrés.", es: "Desliza las fichas junto al hueco para ordenar los números. Se registran movimientos y tiempo." },
    faqs: [],
  },
  maze: {
    origin: { ko: "미로는 그리스 신화의 라비린토스까지 거슬러 오르는 인류의 오랜 놀이입니다. 이 게임의 미로는 재귀적 백트래킹 알고리즘으로 매판 새로 생성됩니다.", en: "Mazes date back to the labyrinth of Greek myth. This game generates a fresh maze each round with a recursive-backtracking algorithm.", ja: "迷路はギリシャ神話のラビュリントスに遡る人類の古い遊びです。このゲームの迷路は再帰的バックトラッキングで毎回生成されます。", zh: "迷宫可追溯到希腊神话的拉比林特斯。本游戏用递归回溯算法每局生成全新迷宫。", fr: "Les labyrinthes remontent au mythe grec. Ce jeu en génère un nouveau à chaque partie par backtracking récursif.", es: "Los laberintos se remontan al mito griego. Este juego genera uno nuevo cada ronda con backtracking recursivo." },
    how: { ko: "왼쪽 위에서 출발해 오른쪽 아래 🏁까지 이동하세요. 방향키 또는 스와이프로 조작합니다.", en: "Start at the top-left and reach the 🏁 at the bottom-right. Move with arrow keys or swipe.", ja: "左上からスタートして右下の🏁を目指します。矢印キーまたはスワイプで操作。", zh: "从左上角出发，抵达右下角的🏁。用方向键或滑动操作。", fr: "Partez du coin supérieur gauche et atteignez le 🏁 en bas à droite. Flèches ou glissement.", es: "Empieza arriba a la izquierda y llega al 🏁 abajo a la derecha. Flechas o deslizar." },
    faqs: [],
  },
  "cat-fishing": {
    origin: { ko: "고양이가 물고기를 노리듯 화면 속 물고기를 잡는 캐주얼 반응속도 게임입니다. 난이도가 오르면 물고기가 커서를 피해 달아납니다.", en: "A casual reflex game — catch the on-screen fish like a cat would. On higher difficulties the fish flee your cursor.", ja: "猫が魚を狙うように画面の魚を捕まえるカジュアル反射ゲーム。難易度が上がると魚がカーソルから逃げます。", zh: "像猫抓鱼一样捕捉屏幕上的小鱼的休闲反应游戏。难度越高，鱼越会躲开光标。", fr: "Un jeu de réflexes décontracté — attrapez les poissons comme un chat. Aux niveaux élevés, ils fuient votre curseur.", es: "Un juego casual de reflejos: atrapa los peces como un gato. En dificultades altas huyen de tu cursor." },
    how: { ko: "헤엄치는 물고기를 탭(클릭)해서 모두 잡으세요. 전부 잡는 데 걸린 시간이 기록됩니다.", en: "Tap (click) the swimming fish to catch them all. Your time to catch every fish is recorded.", ja: "泳ぐ魚をタップ(クリック)して全部捕まえましょう。全て捕まえるまでの時間が記録されます。", zh: "点击游动的小鱼全部抓住。会记录抓完所有鱼的用时。", fr: "Touchez les poissons pour tous les attraper. Votre temps total est enregistré.", es: "Toca los peces nadando para atraparlos todos. Se registra tu tiempo total." },
    faqs: [],
  },
  yahtzee: {
    origin: { ko: "야찌는 1940년대 캐나다인 부부가 요트 위에서 즐기던 'Yacht Game'에서 유래했으며, 1956년 게임 사업가 에드윈 로우가 판권을 사서 Yahtzee라는 이름으로 세계에 보급했습니다.", en: "Yahtzee grew out of the 'Yacht Game' a Canadian couple played aboard their yacht in the 1940s; entrepreneur Edwin S. Lowe bought the rights in 1956 and spread it worldwide as Yahtzee.", ja: "ヤッツィーは1940年代にカナダ人夫妻がヨットの上で遊んだ「ヨットゲーム」に由来し、1956年に実業家エドウィン・ロウが権利を買い取りYahtzeeとして世界に広めました。", zh: "快艇骰子源于1940年代一对加拿大夫妇在游艇上玩的“游艇游戏”，1956年商人埃德温·洛购得版权，以Yahtzee之名推广到全世界。", fr: "Le Yahtzee vient du « Yacht Game » qu'un couple canadien jouait sur son yacht dans les années 1940 ; Edwin S. Lowe en acheta les droits en 1956 et le diffusa sous le nom de Yahtzee.", es: "El Yahtzee nació del 'Yacht Game' que una pareja canadiense jugaba en su yate en los años 40; Edwin S. Lowe compró los derechos en 1956 y lo difundió como Yahtzee." },
    how: { ko: "매 라운드 주사위 5개를 최대 3번 굴려 원하는 조합을 만들고, 13개 점수 칸 중 하나를 골라 채웁니다. 총점이 가장 높으면 승리합니다.", en: "Each round, roll five dice up to three times to build a combo, then fill one of 13 scoring boxes. The highest total wins.", ja: "各ラウンドでサイコロ5個を最大3回振って役を作り、13個のスコア欄から1つを埋めます。合計点が最も高い人の勝ちです。", zh: "每轮最多掷五颗骰子三次组成牌型，然后填入13个计分格之一。总分最高者获胜。", fr: "À chaque manche, lancez cinq dés jusqu'à trois fois pour faire une combinaison, puis remplissez l'une des 13 cases. Le plus haut total gagne.", es: "En cada ronda, lanza cinco dados hasta tres veces para formar una combinación y rellena una de las 13 casillas. Gana el total más alto." },
    faqs: [
      { q: { ko: "상단 보너스 35점은 어떻게 받나요?", en: "How do I earn the 35-point upper bonus?", ja: "上段ボーナス35点はどう取る？", zh: "如何获得上区35分奖励？", fr: "Comment obtenir le bonus de 35 points ?", es: "¿Cómo consigo el bono de 35 puntos?" }, a: { ko: "1~6 칸의 합계가 63점 이상이면 자동으로 +35점입니다. 각 숫자를 3개씩만 모으면 정확히 63점이 되므로, 4개 이상 나온 숫자를 우선 채우는 것이 요령입니다.", en: "Score 63+ across the 1s–6s boxes for an automatic +35. Three of each number is exactly 63, so bank rolls with four or more of a number first.", ja: "1〜6の欄の合計が63点以上で自動的に+35点。各数字3個ずつでちょうど63点なので、4個以上出た数字を優先して埋めるのがコツです。", zh: "1~6格合计满63分即自动+35分。每个数字各三个正好63分，所以优先填出现四个以上的数字。", fr: "Totalisez 63+ dans les cases 1 à 6 pour +35 automatique. Trois de chaque nombre font exactement 63.", es: "Suma 63+ en las casillas del 1 al 6 para un +35 automático. Tres de cada número dan exactamente 63." } },
      { q: { ko: "야찌가 두 번 나오면 어떻게 되나요?", en: "What happens on a second Yahtzee?", ja: "2回目のヤッツィーはどうなる？", zh: "第二次快艇怎么算？", fr: "Que se passe-t-il au deuxième Yahtzee ?", es: "¿Qué pasa con un segundo Yahtzee?" }, a: { ko: "야찌 칸에 이미 50점을 기록한 상태에서 또 같은 눈 5개가 나오면, 다른 칸을 채우면서 보너스 100점을 추가로 받습니다.", en: "If your Yahtzee box already holds 50 and you roll five of a kind again, you score another box and collect a 100-point bonus.", ja: "ヤッツィー欄に既に50点がある状態で再び5個同じ目が出たら、別の欄を埋めつつボーナス100点を獲得します。", zh: "若快艇格已记50分又掷出五个相同，可再填一格并额外获得100分奖励。", fr: "Si votre case Yahtzee contient déjà 50 et que vous refaites cinq identiques, vous marquez une autre case plus un bonus de 100.", es: "Si tu casilla de Yahtzee ya tiene 50 y sacas otros cinco iguales, anotas otra casilla y ganas un bono de 100." } },
    ],
  },
  "kingdomino": {
    origin: { ko: "킹도미노는 브뤼노 카탈라가 디자인해 2017년 올해의 게임상(Spiel des Jahres)을 받은 도미노형 왕국 건설 보드게임입니다.", en: "Kingdomino is a domino-style kingdom-building game by Bruno Cathala that won the 2017 Spiel des Jahres (Game of the Year).", ja: "キングドミノはブルーノ・カタラが手がけ、2017年のドイツ年間ゲーム大賞（Spiel des Jahres）を受賞したドミノ型の王国建設ボードゲームです。", zh: "王国骨牌是布鲁诺·卡塔拉设计、荣获2017年德国年度游戏大奖（Spiel des Jahres）的骨牌式王国建造游戏。", fr: "Kingdomino est un jeu de construction de royaume de type domino, de Bruno Cathala, lauréat du Spiel des Jahres 2017.", es: "Kingdomino es un juego de construcción de reinos tipo dominó de Bruno Cathala, ganador del Spiel des Jahres 2017." },
    how: { ko: "지형이 그려진 도미노 타일을 골라 성을 중심으로 5×5 왕국을 넓힙니다. 같은 지형이 이어진 영역마다 칸 수 × 그 영역의 왕관 수만큼 점수를 얻습니다.", en: "Draft terrain dominoes to expand a 5×5 kingdom around your castle. Each connected same-terrain region scores its size times the crowns inside it.", ja: "地形が描かれたドミノを選び、城を中心に5×5の王国を広げます。同じ地形が繋がった領域ごとにマス数×その領域の王冠数で得点します。", zh: "选取绘有地形的骨牌，以城堡为中心扩展5×5王国。每个同类地形连通区域的得分为格数×该区域王冠数。", fr: "Draftez des dominos de terrain pour étendre un royaume 5×5 autour de votre château. Chaque région connectée marque sa taille fois ses couronnes.", es: "Reclama fichas de terreno para ampliar un reino de 5×5 en torno a tu castillo. Cada región conectada puntúa su tamaño por sus coronas." },
    faqs: [
      { q: { ko: "왕관이 없는 영역은 몇 점인가요?", en: "How many points is a region with no crowns?", ja: "王冠のない領域は何点？", zh: "没有王冠的区域得几分？", fr: "Combien vaut une région sans couronne ?", es: "¿Cuántos puntos vale una región sin coronas?" }, a: { ko: "0점입니다. 점수는 '영역 칸 수 × 왕관 수'라서, 아무리 넓어도 왕관이 없으면 0점입니다. 넓은 땅보다 왕관이 있는 지형을 이어 붙이는 것이 핵심입니다.", en: "Zero. Score is size × crowns, so a region with no crowns is worth 0 no matter how large. Connecting crowned terrain matters more than sheer area.", ja: "0点です。得点は『マス数×王冠数』なので、どれだけ広くても王冠が無ければ0点。広さより王冠のある地形を繋ぐことが重要です。", zh: "0分。得分为“格数×王冠数”，无王冠的区域再大也是0分。相比面积，连接带王冠的地形更关键。", fr: "Zéro. Le score est taille × couronnes ; sans couronne, une région vaut 0 quelle que soit sa taille.", es: "Cero. La puntuación es tamaño × coronas; sin coronas una región vale 0 por grande que sea." } },
      { q: { ko: "타일 번호는 왜 중요한가요?", en: "Why do the tile numbers matter?", ja: "タイルの番号はなぜ重要？", zh: "骨牌编号为何重要？", fr: "Pourquoi les numéros de tuiles comptent-ils ?", es: "¿Por qué importan los números de las fichas?" }, a: { ko: "낮은 번호 타일을 고르면 다음 라운드에 먼저 고를 수 있습니다. 강한 타일은 번호가 높은 경우가 많아, '좋은 타일 vs 빠른 순서'를 저울질하는 것이 이 게임의 핵심 전략입니다.", en: "Claiming a lower-numbered tile lets you pick first next round. Strong tiles tend to sit on higher numbers, so weighing 'good tile vs. early turn order' is the core tension.", ja: "番号の小さいタイルを取ると次のラウンドで先に選べます。強いタイルは番号が高いことが多く、『良いタイル対早い手番』の駆け引きが核心です。", zh: "占取编号较小的骨牌可让你下轮先选。强力骨牌往往编号更高，因此权衡“好牌与出手顺序”是核心策略。", fr: "Prendre une tuile à petit numéro vous fait choisir en premier au tour suivant. Les bonnes tuiles ont souvent de grands numéros — d'où le dilemme.", es: "Reclamar una ficha de número bajo te deja elegir primero la próxima ronda. Las fichas buenas suelen tener números altos: ese es el dilema." } },
    ],
    rules: { ko: ["성에서 시작해 도미노 타일을 이어 붙여 최대 5×5 왕국을 만듭니다.", "새 타일은 성이거나 같은 지형과 맞닿아야 놓을 수 있습니다.", "왕국이 5×5를 벗어나면 놓을 수 없고, 놓을 자리가 없으면 그 타일은 버립니다.", "점수: 같은 지형이 이어진 영역마다 '칸 수 × 왕관 수'.", "낮은 번호 타일을 고르면 다음 라운드에 먼저 선택합니다.", "모든 타일을 놓으면 하모니 +5점, 왕국을 둘러싼 5×5 격자의 중앙에 성이 있으면 빈칸이 있어도 중앙 왕국 +10점입니다."], en: ["Start from the castle and connect dominoes into a kingdom no larger than 5×5.", "A new tile must touch the castle or a matching terrain to be placed.", "It can't push the kingdom past 5×5; if there's no legal spot, discard it.", "Scoring: each connected same-terrain region = size × its crowns.", "Claiming a lower-numbered tile lets you choose first next round.", "Place every tile for Harmony +5; keep the castle at the centre of your kingdom's 5×5 bounding grid for Middle Kingdom +10, even if some spaces are empty."], ja: ["城から始め、ドミノを繋げて最大5×5の王国を作ります。", "新しいタイルは城か同じ地形に接していないと置けません。", "王国が5×5を超えると置けず、置ける場所が無ければ捨てます。", "得点: 同じ地形が繋がった領域ごとに『マス数×王冠数』。", "番号の小さいタイルを取ると次のラウンドで先に選べます。", "全タイル配置でハーモニー+5点。空きマスがあっても、王国を囲む5×5枠の中央に城があれば中央王国+10点です。"], zh: ["从城堡开始，连接骨牌构建最大5×5的王国。", "新骨牌须接触城堡或相同地形才能放置。", "不能使王国超出5×5；无合法位置则弃置。", "计分：每个同类地形连通区域＝格数×王冠数。", "占取编号较小的骨牌可让你下轮先选。", "放下全部骨牌获得和谐王国+5分；即使有空格，只要城堡位于王国5×5边界格的中央，也可获得中央王国+10分。"], fr: ["Partez du château et reliez les dominos en un royaume de 5×5 maximum.", "Une tuile doit toucher le château ou un terrain identique pour être posée.", "Elle ne peut dépasser 5×5 ; sans emplacement légal, défaussez-la.", "Score : chaque région de même terrain = taille × couronnes.", "Prendre une tuile à petit numéro fait choisir en premier au tour suivant.", "Posez toutes les tuiles pour Harmonie +5 ; placez le château au centre de la grille 5×5 qui encadre votre royaume pour Royaume du Milieu +10, même s'il reste des cases vides."], es: ["Empieza en el castillo y conecta fichas en un reino de hasta 5×5.", "Una ficha debe tocar el castillo o un terreno igual para colocarse.", "No puede superar el 5×5; sin lugar legal, se descarta.", "Puntuación: cada región del mismo terreno = tamaño × coronas.", "Reclamar una ficha de número bajo te deja elegir primero la próxima ronda.", "Coloca todas las fichas para Armonía +5; mantén el castillo en el centro de la cuadrícula de 5×5 que delimita tu reino para Reino central +10, aunque queden espacios vacíos."] },
  },
  "mahjong": {
    origin: { ko: "마작은 19세기 중국에서 정립된 4인 타일 게임으로, 오늘날 중국식·일본식(리치) 등 다양한 규칙으로 전 세계에서 즐깁니다.", en: "Mahjong is a four-player tile game that took shape in 19th-century China and is now played worldwide in Chinese, Japanese (riichi) and other rule sets.", ja: "麻雀は19世紀の中国で成立した4人用のタイルゲームで、現在は中国式・日本式（リーチ）など多様なルールで世界中で親しまれています。", zh: "麻将是19世纪在中国成型的四人牌类游戏，如今以中式、日式（立直）等多种规则风行世界。", fr: "Le Mahjong est un jeu de tuiles à quatre joueurs né dans la Chine du XIXe siècle, joué aujourd'hui selon des règles chinoises, japonaises (riichi) et autres.", es: "El Mahjong es un juego de fichas para cuatro jugadores surgido en la China del siglo XIX, jugado hoy con reglas chinas, japonesas (riichi) y otras." },
    how: { ko: "패를 뽑고 버리며 손패를 다듬어, 3장짜리 멘츠 4개와 머리(아타마) 1쌍을 완성하면 화료합니다. 직접 뽑아 완성하면 쯔모, 남의 버림패로 완성하면 론입니다.", en: "Draw and discard to shape your hand until you complete four melds (sets of three) plus a pair. Completing on your own draw is tsumo; on another's discard, ron.", ja: "牌を引いて捨て、手牌を整えて3枚の面子4つと雀頭1対を作れば和了。自分で引けばツモ、他家の捨て牌で完成すればロンです。", zh: "摸牌打牌整理手牌，凑齐四组面子（各三张）加一对将牌即和牌。自己摸到叫自摸，靠他人弃牌叫荣和。", fr: "Piochez et défaussez pour former quatre combinaisons de trois tuiles plus une paire. Compléter sur sa propre pioche, c'est tsumo ; sur la défausse d'un autre, ron.", es: "Roba y descarta para formar cuatro grupos de tres fichas más una pareja. Completar con tu propia robada es tsumo; con el descarte de otro, ron." },
    faqs: [
      { q: { ko: "이 간이 마작은 실제 마작과 무엇이 다른가요?", en: "How does this simple version differ from full Mahjong?", ja: "この簡易麻雀は本式と何が違う？", zh: "这个简易麻将与正式麻将有何不同？", fr: "En quoi cette version simple diffère-t-elle du Mahjong complet ?", es: "¿En qué difiere esta versión simple del Mahjong completo?" }, a: { ko: "폰·치·깡 같은 부르기(멜드 콜)와 도라·복잡한 역(야쿠) 계산을 뺀 폐형 전용 규칙입니다. 완성형(4멘츠+1아타마) 또는 치또이쯔(7쌍)면 화료로 인정해 입문하기 쉽게 했습니다.", en: "It drops calls (pon/chi/kan) and dora/complex yaku scoring, keeping closed hands only. Any complete hand — four melds + a pair, or seven pairs — wins, so it's beginner-friendly.", ja: "ポン・チー・カンの鳴きやドラ・複雑な役計算を省いた門前専用ルールです。完成形（4面子1雀頭）か七対子なら和了として入門しやすくしています。", zh: "省去吃碰杠等鸣牌与宝牌、复杂番种计算，仅限门清。凑成四面子一雀头或七对子即算和牌，便于入门。", fr: "Elle retire les appels (pon/chi/kan) et le score dora/yaku complexe, ne gardant que les mains fermées. Toute main complète — quatre combinaisons + paire, ou sept paires — gagne.", es: "Elimina cantos (pon/chi/kan) y la puntuación de dora/yaku compleja, solo manos cerradas. Cualquier mano completa —cuatro grupos + pareja, o siete parejas— gana." } },
      { q: { ko: "텐파이(듣기)가 무슨 뜻인가요?", en: "What does 'tenpai' mean?", ja: "テンパイとは？", zh: "什么是听牌？", fr: "Que signifie « tenpai » ?", es: "¿Qué significa 'tenpai'?" }, a: { ko: "한 장만 더 채우면 화료가 되는 대기 상태를 말합니다. 어떤 타일을 기다리는지 파악하는 것이 마작 실력의 핵심입니다.", en: "It's the ready state where a single tile completes your hand. Knowing exactly which tiles you're waiting on is the heart of the game.", ja: "あと1枚で和了できる待ちの状態です。どの牌を待っているかを把握するのが上達の要です。", zh: "指再来一张即可和牌的听牌状态。清楚自己在等哪些牌是麻将的核心。", fr: "C'est l'état où une seule tuile complète votre main. Savoir quelles tuiles vous attendez est l'essence du jeu.", es: "Es el estado en que una sola ficha completa tu mano. Saber qué fichas esperas es la clave del juego." } },
    ],
    rules: { ko: ["136장(만·통·삭 1~9와 자패)으로 4명이 13장씩 들고 시작합니다.", "차례마다 1장 뽑고 1장 버리며 손패를 다듬습니다.", "3장짜리 멘츠(연속 또는 같은 패) 4개 + 머리 1쌍이면 화료입니다.", "직접 뽑아 완성=쯔모, 남의 버림패로 완성=론.", "패산이 다 떨어지면 유국(무승부)입니다."], en: ["136 tiles (man/pin/sou 1–9 plus honors); four players start with 13 each.", "On your turn draw one tile and discard one, shaping your hand.", "Four melds (runs or triplets) of three plus one pair is a win.", "Completing on your draw is tsumo; on another's discard, ron.", "If the wall runs out, the round is an exhaustive draw."], ja: ["136枚（萬・筒・索の1〜9と字牌）で4人が13枚ずつ持って開始。", "手番ごとに1枚引いて1枚捨て、手牌を整えます。", "3枚の面子（順子か刻子）4つ＋雀頭1対で和了。", "自分で引けばツモ、他家の捨て牌で完成すればロン。", "牌山が尽きたら流局（引き分け）です。"], zh: ["136张（万筒索1~9与字牌），四人各持13张开局。", "每回合摸一张、打一张，整理手牌。", "四组三张面子（顺子或刻子）加一对将牌即和牌。", "自己摸到为自摸，靠他人弃牌为荣和。", "牌山摸完则荒庄（平局）。"], fr: ["136 tuiles (man/pin/sou 1–9 plus honneurs) ; quatre joueurs, 13 chacun.", "À votre tour, piochez une tuile et défaussez-en une.", "Quatre combinaisons de trois (suites ou brelans) plus une paire = victoire.", "Compléter sur sa pioche = tsumo ; sur une défausse = ron.", "Si le mur est épuisé, la manche est nulle."], es: ["136 fichas (man/pin/sou 1–9 más honores); cuatro jugadores, 13 cada uno.", "En tu turno roba una ficha y descarta otra.", "Cuatro grupos de tres (escaleras o tríos) más una pareja = victoria.", "Completar con tu robada = tsumo; con un descarte = ron.", "Si se agota el muro, la ronda es empate."] },
  },
  "run-a-business": {
    origin: {
      ko: "하루 장사는 레모네이드 타이쿤·라면장사 계열의 짧은 장부 놀이입니다. 업종과 기간은 같은 주소에서 팩으로 늘어납니다.",
      en: "Run a Business is a short ledger game in the lemonade-stand / ramen-cart family. More stalls and time horizons share one URL.",
      ja: "一日商売はレモネードタイクーンやラーメン屋台系の短い帳簿ゲームです。業種と期間は同じURLのパックで増えます。",
      zh: "一天生意是柠檬水摊、拉面摊一类的短账本游戏。更多业种和周期共用同一个网址。",
      fr: "Une journée de commerce est un petit jeu de livres, cousin des stands de limonade et de ramen. D'autres stands partagent la même URL.",
      es: "Un día de negocio es un juego corto de libros, de la familia del puesto de limonada y ramyeon. Más puestos comparten la misma URL.",
    },
    how: {
      ko: "아침 날씨와 사건을 보고 면·스프·토핑을 사입하고 가격과 레시피를 고른 뒤 장사를 엽니다. 저녁에 매출·원가·폐기가 남습니다. 남은 재료는 그날 폐기됩니다.",
      en: "Read the morning weather and event, buy noodles, soup and topping, set price and recipe, then open. The evening books show sales, cost and waste. Leftovers spoil the same day.",
      ja: "朝の天気と出来事を見て麺・スープ・トッピングを仕入れ、価格とレシピを決めて開店します。夜に売上・原価・廃棄が残ります。残りは当日廃棄です。",
      zh: "看早晨天气和事件，采购面、汤底和浇头，定价和配方后开张。晚上留下销售额、成本和报废。剩料当天报废。",
      fr: "Lisez la météo et l'événement, achetez nouilles, bouillon et garniture, fixez prix et recette, puis ouvrez. Le soir : ventes, coût, pertes. Les restes sont perdus le jour même.",
      es: "Lee el clima y el suceso, compra fideos, caldo y topping, fija precio y receta y abre. Por la noche: ventas, coste y merma. Lo que sobra se pierde ese día.",
    },
    faqs: [
      {
        q: {
          ko: "이게 회계 수업인가요?",
          en: "Is this an accounting class?",
          ja: "会計の授業ですか？",
          zh: "这是会计课吗？",
          fr: "Est-ce un cours de comptabilité ?",
          es: "¿Es una clase de contabilidad?",
        },
        a: {
          ko: "아닙니다. 숫자는 장사에서 생깁니다. 분류를 배우려면 oiyo 손익 게임을 보세요.",
          en: "No. The numbers come from the stall. Use the oiyo income-statement game to learn the labels.",
          ja: "いいえ。数字は商売から出ます。科目はoiyoの損益ゲームで。",
          zh: "不是。数字来自摆摊。科目请看 oiyo 损益游戏。",
          fr: "Non. Les chiffres viennent du stand. Les libellés sont sur oiyo.",
          es: "No. Los números salen del puesto. Las etiquetas están en oiyo.",
        },
      },
      {
        q: {
          ko: "돈은 어디에 저장되나요?",
          en: "Where is the money saved?",
          ja: "お金はどこに保存されますか？",
          zh: "钱存在哪里？",
          fr: "Où est sauvegardé l'argent ?",
          es: "¿Dónde se guarda el dinero?",
        },
        a: {
          ko: "이 브라우저에만 있습니다. 계정과 서버가 없습니다.",
          en: "Only in this browser. There is no account or server.",
          ja: "このブラウザだけです。アカウントもサーバーもありません。",
          zh: "只在这台浏览器。没有账号和服务器。",
          fr: "Dans ce navigateur seulement. Pas de compte ni de serveur.",
          es: "Solo en este navegador. No hay cuenta ni servidor.",
        },
      },
      {
        q: {
          ko: "피씨방이나 일년은요?",
          en: "What about a PC bang or a year?",
          ja: "ネットカフェや一年は？",
          zh: "网吧或一年呢？",
          fr: "Et un cybercafé ou une année ?",
          es: "¿Y un cibercafé o un año?",
        },
        a: {
          ko: "같은 주소에 나중에 팩으로 붙습니다. 지금 판은 라면·하루·달러입니다.",
          en: "They join this same URL as later packs. This slice is ramen, one day, and USD.",
          ja: "同じURLに後からパックで足します。今はラーメン・一日・ドルです。",
          zh: "之后作为资料包加在同一网址。现在是拉面、一天、美元。",
          fr: "Ils arriveront sur la même URL. Cette version est ramen, un jour, USD.",
          es: "Llegarán en esta misma URL. Esta tajada es ramyeon, un día y USD.",
        },
      },
    ],
    related: {
      ko: [{ href: "https://oiyo.net/ko/income-statement-game/", label: "손익계산서 게임" }],
      en: [{ href: "https://oiyo.net/en/income-statement-game/", label: "Income statement game" }],
    },
  },
};
