using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public enum CyberLanguage { KO, EN, JA, ES }

public static class StringExtensions
{
    public static string Repeat(this string s, int n)
    {
        if (n <= 0 || string.IsNullOrEmpty(s)) return "";
        var sb = new System.Text.StringBuilder(s.Length * n);
        for (int i = 0; i < n; i++) sb.Append(s);
        return sb.ToString();
    }
}

public class CyberHighwayPlayer : MonoBehaviour
{
    public enum GameState { Ready, Playing, StageClear, GameOver, AllCleared }

    [System.Serializable]
    public class StageData
    {
        public int id;
        public string nameKo;
        public string nameEn;
        public string nameJa;
        public string nameEs;
        public string descKo;
        public string descEn;
        public string descJa;
        public string descEs;
        public float targetDistance;
        public float trafficSpeed;
        public float spawnInterval;
        public bool hasPolice;
        public bool hasRain;
        public bool isTunnel;
        public bool isBossStage;
        public Color skyColor;
        public Color neonColor;
    }

    public struct TrafficCar
    {
        public Vector3 pos;
        public float speed;
        public int type; // 0: Sedan, 1: Truck, 2: Sports, 3: Police, 10: Boss
        public float length;
        public float width;
        public bool nearMissScored;
        public GameObject go;
    }

    public struct RoadPickup
    {
        public Vector3 pos;
        public int type; // 0: Credit, 1: Nitro, 2: Shield
        public GameObject go;
    }

    // Audio clips
    private AudioSource audioSource;
    private AudioSource engineSource;
    private AudioClip engineClip;
    private AudioClip nitroClip;
    private AudioClip coinClip;
    private AudioClip nearMissClip;
    private AudioClip crashClip;
    private AudioClip clearClip;

    // Game state
    private GameState state = GameState.Ready;
    private CyberLanguage lang = CyberLanguage.KO;

    // Page language beyond the game's own four (scripts/unity/oiyo-i18n).
    string LangCode() => lang == CyberLanguage.EN ? OiyoI18n.ForEnglish : lang.ToString().ToLowerInvariant();
    string U(string en) => OiyoI18n.Ui(en, LangCode());
    string F(string en, params object[] args) => string.Format(U(en), args);
    private int currentStageIndex = 0;
    private bool isEndless = false;
    private bool showStageSelect = false;
    private Vector2 sectorSelectScroll;

    // Car & Physics stats
    private GameObject playerCar;
    private GameObject shieldBubble;
    private Vector3 playerPos = new Vector3(0, 0.45f, 0);
    private float targetLaneX = 0f;
    private float currentSpeedKmh = 140f;
    private float targetSpeedKmh = 140f;
    private float distanceTraveled = 0f;
    private float nitroFuel = 100f;
    private bool isNitroActive = false;
    private int credits = 0;
    private int score = 0;
    private int bestScore = 0;
    private int shields = 1;
    private float steerTilt = 0f;
    private float invulnerableTimer = 0f;
    private string nearMissBanner = "";
    private float nearMissAlpha = 0f;

    // Collections
    private List<TrafficCar> traffic = new List<TrafficCar>();
    private List<RoadPickup> pickups = new List<RoadPickup>();
    private List<Transform> roadSegments = new List<Transform>();
    private List<Transform> streetlights = new List<Transform>();

    // Visual juice
    private Camera mainCam;
    private float camShake = 0f;
    private float targetFov = 60f;
    private ParticleSystem nitroExhaust;
    private ParticleSystem crashSparks;

    // Materials
    private Material carBodyMat;
    private Material wheelMat;
    private Material roadMat;
    private Material lineMat;
    private Material trafficSedanMat;
    private Material trafficTruckMat;
    private Material trafficSportsMat;
    private Material policeMat;
    private Material bossMat;
    private Material shieldMat;
    private Material pickupMat;

    // Boss Data
    private GameObject bossJuggernaut;
    private float bossZ = 65f;
    private float bossHp = 1000f;

    private float trafficSpawnTimer = 0f;

    // 30 Defined Stages
    private StageData[] stages = new StageData[]
    {
        new StageData {
            id = 1,
            nameKo = "섹터 1: 네온 도심 고속도로", nameEn = "Sector 1: Neon Downtown", nameJa = "セクター1：ネオン都心高速", nameEs = "Sector 1: Centro de Neón",
            descKo = "완만한 직선 도로에서 차선 변경과 기본 크루징을 익히세요.",
            descEn = "Master lane changing and cruising along wide open neon expressways.",
            descJa = "緩やかな直線道路で車線変更と基本巡航を習得しましょう。",
            descEs = "Domina el cambio de carril y la velocidad de crucero en la autopista.",
            targetDistance = 1500f, trafficSpeed = 65f, spawnInterval = 1.6f,
            skyColor = new Color(0.04f, 0.06f, 0.15f), neonColor = Color.cyan
        },
        new TrackData_StageAlias {
            id = 2,
            nameKo = "섹터 2: 심야 고속화 도로", nameEn = "Sector 2: Midnight Express", nameJa = "セクター2：深夜エクスプレス", nameEs = "Sector 2: Expreso de Medianoche",
            descKo = "야간 트래픽을 아슬아슬하게 추월하며 니트로 부스트를 가속하세요.",
            descEn = "Weave through dense midnight traffic while triggering nitro bursts.",
            descJa = "夜間トラフィックをすり抜けながらニトロブーストを加速！",
            descEs = "Esquiva el tráfico nocturno mientras aceleras con nitro.",
            targetDistance = 2200f, trafficSpeed = 75f, spawnInterval = 1.35f,
            skyColor = new Color(0.02f, 0.03f, 0.1f), neonColor = Color.magenta
        }.ToStageData(),
        new TrackData_StageAlias {
            id = 3,
            nameKo = "섹터 3: 사이버 항만 방파제", nameEn = "Sector 3: Cyber Harbour Causeway", nameJa = "セクター3：サイバー港湾防波堤", nameEs = "Sector 3: Calzada del Puerto",
            descKo = "길게 늘어선 대형 화물 트럭 사이를 고속으로 빠져나가세요.",
            descEn = "Overtake long convoys of heavy cargo haulers along the coast.",
            descJa = "長く連なる大型貨物トラックの間を高速で駆け抜けましょう。",
            descEs = "Adelanta convoyes de camiones pesados por la costa.",
            targetDistance = 3000f, trafficSpeed = 70f, spawnInterval = 1.25f,
            skyColor = new Color(0.06f, 0.15f, 0.22f), neonColor = new Color(0.2f, 1f, 0.8f)
        }.ToStageData(),
        new TrackData_StageAlias {
            id = 4,
            nameKo = "섹터 4: 자기부상 지하 터널", nameEn = "Sector 4: Mag-Lev Tunnel Grid", nameJa = "セクター4：リニア地下トンネル", nameEs = "Sector 4: Túnel Mag-Lev",
            descKo = "밀폐된 4차선 터널 안에서 벽면 반사광과 초고속 트래픽을 돌파하세요.",
            descEn = "Blaze through enclosed 4-lane subterranean tunnels at breakneck speed.",
            descJa = "密閉された4車線トンネル内で超高速トラフィックを突破！",
            descEs = "Atraviesa túneles subterráneos de 4 carriles a velocidad vertiginosa.",
            targetDistance = 3800f, trafficSpeed = 85f, spawnInterval = 1.15f, isTunnel = true,
            skyColor = new Color(0.12f, 0.08f, 0.05f), neonColor = Color.yellow
        }.ToStageData(),
        new TrackData_StageAlias {
            id = 5,
            nameKo = "섹터 5: 네오 도쿄 스카이브릿지", nameEn = "Sector 5: Neo Tokyo Skybridge", nameJa = "セクター5：ネオ東京スカイブリッジ", nameEs = "Sector 5: Puente Celeste Neo Tokio",
            descKo = "상공 500m 고공 교량 위에서 날렵한 스포츠카들의 급격한 차선 변경을 예측하세요.",
            descEn = "Anticipate erratic sports car maneuvers 500m above the megalopolis.",
            descJa = "上空500mの高架橋で素早いスポーツカーの急な車線変更を予測せよ。",
            descEs = "Anticipa maniobras de deportivos a 500m sobre la megalópolis.",
            targetDistance = 4600f, trafficSpeed = 90f, spawnInterval = 1.05f,
            skyColor = new Color(0.15f, 0.05f, 0.25f), neonColor = new Color(1f, 0.2f, 0.8f)
        }.ToStageData(),
        new TrackData_StageAlias {
            id = 6,
            nameKo = "섹터 6: 사이버 경찰 추격전", nameEn = "Sector 6: Police Pursuit Alert", nameJa = "セクター6：サイバー警察追走警報", nameEs = "Sector 6: Persecución Policial",
            descKo = "경광등을 켜고 길을 가로막는 사이버 경찰 순찰차의 포위망을 뚫으세요!",
            descEn = "Break through roadblocks of interceptor squad cars with flashing sirens!",
            descJa = "パトランプを点滅させ前方を遮る警察パトカーの包囲網を突破！",
            descEs = "¡Rompe los bloqueos de patrullas policiales con sirenas parpadeantes!",
            targetDistance = 5500f, trafficSpeed = 95f, spawnInterval = 1.0f, hasPolice = true,
            skyColor = new Color(0.05f, 0.05f, 0.2f), neonColor = Color.red
        }.ToStageData(),
        new TrackData_StageAlias {
            id = 7,
            nameKo = "섹터 7: 산성비 고속도로", nameEn = "Sector 7: Acid Rain Expressway", nameJa = "セクター7：酸性雨の高速道路", nameEs = "Sector 7: Autopista de Lluvia Ácida",
            descKo = "네온 불빛이 젖은 노면에 반사되는 빗길에서 미끄러짐을 제어하세요.",
            descEn = "Control wet-tarmac drifts through pouring neon acid showers.",
            descJa = "濡れた路面にネオンが反射する雨天の中、スリップを制御せよ。",
            descEs = "Controla los derrapes en asfalto mojado bajo la lluvia ácida de neón.",
            targetDistance = 6400f, trafficSpeed = 88f, spawnInterval = 0.95f, hasRain = true,
            skyColor = new Color(0.08f, 0.18f, 0.15f), neonColor = new Color(0.3f, 1f, 0.4f)
        }.ToStageData(),
        new TrackData_StageAlias {
            id = 8,
            nameKo = "섹터 8: 공업 지구 매연 지대", nameEn = "Sector 8: Industrial Smog Zone", nameJa = "セクター8：工業地帯スモッグ", nameEs = "Sector 8: Zona Industrial de Smog",
            descKo = "안개 속에서 갑자기 나타나는 중장비 트럭과 바리케이드를 돌파하세요.",
            descEn = "Navigate dense toxic smog where heavy construction rigs loom ahead.",
            descJa = "濃霧の中から突如現れる重機トラックとバリケードを突破せよ。",
            descEs = "Navega a través del denso smog donde acechan camiones de construcción.",
            targetDistance = 7300f, trafficSpeed = 92f, spawnInterval = 0.9f,
            skyColor = new Color(0.2f, 0.15f, 0.05f), neonColor = Color.yellow
        }.ToStageData(),
        new TrackData_StageAlias {
            id = 9,
            nameKo = "섹터 9: 하이퍼루프 고가 도로", nameEn = "Sector 9: Hyperloop Overpass", nameJa = "セクター9：ハイパーループ高架", nameEs = "Sector 9: Viaducto Hyperloop",
            descKo = "220 km/h 초고속 트래픽의 빈틈을 면도날처럼 파고드는 니어 미스 향연!",
            descEn = "Thread needle-thin gaps through traffic cruising at over 220 km/h!",
            descJa = "220 km/h超高速トラフィックの隙間をミリ単位で縫うニアミスの嵐！",
            descEs = "¡Atraviesa huecos milimétricos en el tráfico a más de 220 km/h!",
            targetDistance = 8300f, trafficSpeed = 105f, spawnInterval = 0.82f,
            skyColor = new Color(0.18f, 0.04f, 0.28f), neonColor = Color.magenta
        }.ToStageData(),
        new TrackData_StageAlias {
            id = 10,
            nameKo = "섹터 10: 보스: 사이버 저거너트", nameEn = "Sector 10: Boss: Cyber Juggernaut", nameJa = "セクター10：ボス：サイバージャガーノート", nameEs = "Sector 10: Jefe: Juggernaut Cibernético",
            descKo = "후방에서 지뢰를 살포하며 길을 가로막는 거대 무장 트레일러를 추월하세요!",
            descEn = "Overtake the heavily armored military Juggernaut deploying spike mines!",
            descJa = "後方に機雷を散布し進路を塞ぐ巨大重武装トレーラーを追い抜け！",
            descEs = "¡Adelanta al titánico Juggernaut militar blindado que despliega minas!",
            targetDistance = 9400f, trafficSpeed = 85f, spawnInterval = 1.4f, isBossStage = true,
            skyColor = new Color(0.3f, 0.05f, 0.05f), neonColor = Color.red
        }.ToStageData(),
        new TrackData_StageAlias {
            id = 11,
            nameKo = "섹터 11: 궤도 엘리베이터 진입로", nameEn = "Sector 11: Orbital Elevator Approach", nameJa = "セクター11：軌道エレベータ進入路", nameEs = "Sector 11: Acceso al Ascensor Orbital",
            descKo = "우주로 뻗어 나가는 수직 상승 고속도로의 극한 트래픽 서핑!",
            descEn = "High-altitude vertical expressway with extreme traffic density.",
            descJa = "宇宙へ延びる垂直上昇高速道路での極限トラフィックサーフィン！",
            descEs = "Autopista vertical de gran altitud con densidad de tráfico extrema.",
            targetDistance = 10600f, trafficSpeed = 110f, spawnInterval = 0.78f, hasPolice = true,
            skyColor = new Color(0.04f, 0.12f, 0.3f), neonColor = Color.cyan
        }.ToStageData(),
        new TrackData_StageAlias {
            id = 12,
            nameKo = "섹터 12: 사이버 제니스 그랜드 피날레", nameEn = "Sector 12: Cyber Zenith Finale", nameJa = "セクター12：サイバー・ゼニス終曲", nameEs = "Sector 12: Gran Final Cyber Zenith",
            descKo = "시속 300km 궁극의 한계 돌파! 12개 섹터를 완주하고 전설의 드라이버로 등극하세요.",
            descEn = "Surpass 300 km/h in the ultimate climax to crown yourself the Apex Driver.",
            descJa = "時速300km極限突破！全12セクターを制覇し伝説のドライバーとなれ。",
            descEs = "¡Supera los 300 km/h en el clímax definitivo y conviértete en el Conductor Supremo!",
            targetDistance = 12000f, trafficSpeed = 120f, spawnInterval = 0.72f, hasPolice = true, hasRain = true,
            skyColor = new Color(0.35f, 0.2f, 0.05f), neonColor = Color.yellow
        }.ToStageData(),
        // 13-30: +600 m and a slightly shorter spawn gap per sector; bosses again at 20 and 30
        new TrackData_StageAlias {
            id = 13,
            nameKo = "섹터 13: 유리 협곡 고속도로", nameEn = "Sector 13: Glass Canyon Freeway", nameJa = "セクター13：ガラス峡谷フリーウェイ", nameEs = "Sector 13: Autovía del Cañón de Cristal",
            descKo = "유리벽에 비친 차들 사이로 진짜 차선을 골라내세요.",
            descEn = "Pick out the real lanes between cars reflected in glass walls.",
            descJa = "ガラスの壁に映る車の間から本物の車線を見極めよう。",
            descEs = "Distingue los carriles reales entre coches reflejados en paredes de cristal.",
            targetDistance = 12600f, trafficSpeed = 121f, spawnInterval = 0.71f, hasPolice = true,
            skyColor = new Color(0.06f, 0.14f, 0.2f), neonColor = Color.cyan
        }.ToStageData(),
        new TrackData_StageAlias {
            id = 14,
            nameKo = "섹터 14: 홀로 시장 우회로", nameEn = "Sector 14: Holo Market Bypass", nameJa = "セクター14：ホロ市場バイパス", nameEs = "Sector 14: Desvío del Mercado Holo",
            descKo = "광고 홀로그램이 번쩍이는 시장 옆길. 배달 트럭이 끊임없이 끼어들어요.",
            descEn = "A side road by a market of flashing holo ads. Delivery trucks keep cutting in.",
            descJa = "ホロ広告がきらめく市場の脇道。配送トラックが次々割り込む。",
            descEs = "Una vía junto a un mercado de anuncios holográficos. Los camiones se cuelan sin parar.",
            targetDistance = 13200f, trafficSpeed = 122f, spawnInterval = 0.70f, hasPolice = true,
            skyColor = new Color(0.2f, 0.05f, 0.18f), neonColor = Color.magenta
        }.ToStageData(),
        new TrackData_StageAlias {
            id = 15,
            nameKo = "섹터 15: 태양광 농장 직선로", nameEn = "Sector 15: Solar Farm Straight", nameJa = "セクター15：ソーラー農場ストレート", nameEs = "Sector 15: Recta de la Granja Solar",
            descKo = "끝없는 직선로. 니트로를 아껴 두었다가 빈틈에서 한꺼번에 쓰세요.",
            descEn = "An endless straight. Save nitro and spend it all in the gaps.",
            descJa = "果てしない直線。ニトロを温存して隙間で一気に使おう。",
            descEs = "Una recta sin fin. Guarda el nitro y gástalo en los huecos.",
            targetDistance = 13800f, trafficSpeed = 123f, spawnInterval = 0.69f, hasPolice = true,
            skyColor = new Color(0.22f, 0.16f, 0.04f), neonColor = Color.yellow
        }.ToStageData(),
        new TrackData_StageAlias {
            id = 16,
            nameKo = "섹터 16: 해저 튜브 연결로", nameEn = "Sector 16: Undersea Tube Link", nameJa = "セクター16：海底チューブ連絡路", nameEs = "Sector 16: Enlace del Tubo Submarino",
            descKo = "바다 밑 투명 튜브 안. 좁은 시야에서 차선 변경 타이밍을 잡으세요.",
            descEn = "Inside a clear tube under the sea. Time lane changes with little view ahead.",
            descJa = "海底の透明チューブ内。狭い視界で車線変更のタイミングをつかもう。",
            descEs = "Dentro de un tubo transparente bajo el mar. Cambia de carril con poca visibilidad.",
            targetDistance = 14400f, trafficSpeed = 124f, spawnInterval = 0.68f, hasPolice = true, isTunnel = true,
            skyColor = new Color(0.02f, 0.1f, 0.22f), neonColor = new Color(0.2f, 0.8f, 1f)
        }.ToStageData(),
        new TrackData_StageAlias {
            id = 17,
            nameKo = "섹터 17: 데이터센터 나선로", nameEn = "Sector 17: Data Center Spiral", nameJa = "セクター17：データセンター螺旋路", nameEs = "Sector 17: Espiral del Centro de Datos",
            descKo = "서버 타워를 감아 도는 길. 순찰차가 더 자주 나타나요.",
            descEn = "A road wrapped around server towers. Patrol cars show up more often.",
            descJa = "サーバータワーを巻く道。パトカーがより頻繁に現れる。",
            descEs = "Una vía que rodea torres de servidores. Las patrullas aparecen más a menudo.",
            targetDistance = 15000f, trafficSpeed = 125f, spawnInterval = 0.67f, hasPolice = true,
            skyColor = new Color(0.04f, 0.12f, 0.08f), neonColor = new Color(0.3f, 1f, 0.4f)
        }.ToStageData(),
        new TrackData_StageAlias {
            id = 18,
            nameKo = "섹터 18: 뇌우 둑길", nameEn = "Sector 18: Thunderstorm Causeway", nameJa = "セクター18：雷雨の堤防道路", nameEs = "Sector 18: Calzada de la Tormenta",
            descKo = "번개가 치는 둑길 위. 빗길에서도 차간 거리를 끝까지 읽으세요.",
            descEn = "A causeway under lightning. Keep reading the gaps on wet asphalt.",
            descJa = "稲妻の走る堤防道路。雨の路面でも車間を読み続けよう。",
            descEs = "Una calzada bajo los rayos. Sigue leyendo los huecos en el asfalto mojado.",
            targetDistance = 15600f, trafficSpeed = 126f, spawnInterval = 0.66f, hasPolice = true, hasRain = true,
            skyColor = new Color(0.08f, 0.08f, 0.16f), neonColor = Color.white
        }.ToStageData(),
        new TrackData_StageAlias {
            id = 19,
            nameKo = "섹터 19: 드론 떼 회랑", nameEn = "Sector 19: Drone Swarm Corridor", nameJa = "セクター19：ドローン群の回廊", nameEs = "Sector 19: Corredor del Enjambre de Drones",
            descKo = "배송 드론이 머리 위를 메운 회랑. 보스 직전의 촘촘한 트래픽이에요.",
            descEn = "A corridor packed with delivery drones overhead. Dense traffic right before the boss.",
            descJa = "頭上を配送ドローンが埋める回廊。ボス直前の密な交通。",
            descEs = "Un corredor lleno de drones de reparto. Tráfico denso justo antes del jefe.",
            targetDistance = 16200f, trafficSpeed = 127f, spawnInterval = 0.65f, hasPolice = true,
            skyColor = new Color(0.14f, 0.1f, 0.02f), neonColor = new Color(1f, 0.6f, 0.1f)
        }.ToStageData(),
        new TrackData_StageAlias {
            id = 20,
            nameKo = "섹터 20: 보스: 강철 리바이어던 화물차", nameEn = "Sector 20: Boss: Iron Leviathan Hauler", nameJa = "セクター20：ボス：鋼鉄リヴァイアサン輸送車", nameEs = "Sector 20: Jefe: Carguero Leviatán de Hierro",
            descKo = "지뢰를 뿌리는 두 번째 거대 화물차. 경찰까지 합세했어요.",
            descEn = "The second giant hauler drops mines, and the police join in.",
            descJa = "機雷をまく第2の巨大輸送車。警察まで加勢してくる。",
            descEs = "El segundo carguero gigante suelta minas y la policía se une.",
            targetDistance = 16800f, trafficSpeed = 100f, spawnInterval = 1.10f, hasPolice = true, isBossStage = true,
            skyColor = new Color(0.3f, 0.04f, 0.08f), neonColor = Color.red
        }.ToStageData(),
        new TrackData_StageAlias {
            id = 21,
            nameKo = "섹터 21: 오로라 순환도로", nameEn = "Sector 21: Aurora Ring Road", nameJa = "セクター21：オーロラ環状道路", nameEs = "Sector 21: Anillo Vial Aurora",
            descKo = "오로라 아래 순환도로. 보스를 넘긴 뒤 트래픽이 한층 빨라져요.",
            descEn = "A ring road under the aurora. Traffic gets quicker after the boss.",
            descJa = "オーロラの下の環状道路。ボスの後で交通が一段と速くなる。",
            descEs = "Un anillo vial bajo la aurora. El tráfico se acelera tras el jefe.",
            targetDistance = 17400f, trafficSpeed = 129f, spawnInterval = 0.63f, hasPolice = true,
            skyColor = new Color(0.03f, 0.16f, 0.14f), neonColor = new Color(0.3f, 1f, 0.8f)
        }.ToStageData(),
        new TrackData_StageAlias {
            id = 22,
            nameKo = "섹터 22: 수정 사막 고속도로", nameEn = "Sector 22: Crystal Desert Highway", nameJa = "セクター22：水晶砂漠ハイウェイ", nameEs = "Sector 22: Autopista del Desierto de Cristal",
            descKo = "수정이 반짝이는 사막의 긴 구간. 연료 아이템을 놓치지 마세요.",
            descEn = "A long desert stretch glittering with crystals. Don't miss the fuel pickups.",
            descJa = "水晶がきらめく砂漠の長い区間。燃料アイテムを逃さないで。",
            descEs = "Un largo tramo de desierto con cristales. No pierdas el combustible.",
            targetDistance = 18000f, trafficSpeed = 130f, spawnInterval = 0.62f, hasPolice = true,
            skyColor = new Color(0.25f, 0.18f, 0.08f), neonColor = new Color(1f, 0.85f, 0.4f)
        }.ToStageData(),
        new TrackData_StageAlias {
            id = 23,
            nameKo = "섹터 23: 정전 지구", nameEn = "Sector 23: Blackout District", nameJa = "セクター23：停電地区", nameEs = "Sector 23: Distrito del Apagón",
            descKo = "가로등이 꺼진 지구. 헤드라이트만 믿고 달려야 해요.",
            descEn = "A district with the streetlights out. Drive on headlights alone.",
            descJa = "街灯が消えた地区。ヘッドライトだけを頼りに走ろう。",
            descEs = "Un distrito sin farolas. Conduce solo con los faros.",
            targetDistance = 18600f, trafficSpeed = 131f, spawnInterval = 0.61f, hasPolice = true, isTunnel = true,
            skyColor = new Color(0.02f, 0.02f, 0.04f), neonColor = new Color(0.6f, 0.6f, 1f)
        }.ToStageData(),
        new TrackData_StageAlias {
            id = 24,
            nameKo = "섹터 24: 자기 레일 합류로", nameEn = "Sector 24: Magnet Rail Merge", nameJa = "セクター24：磁気レール合流", nameEs = "Sector 24: Incorporación del Riel Magnético",
            descKo = "자기부상 차량이 합류하는 구간. 네 차선이 동시에 막히기 쉬워요.",
            descEn = "Maglev cars merge in here. All four lanes clog up at once.",
            descJa = "リニア車両が合流する区間。4車線が同時に詰まりやすい。",
            descEs = "Aquí se incorporan coches maglev. Los cuatro carriles se llenan a la vez.",
            targetDistance = 19200f, trafficSpeed = 132f, spawnInterval = 0.60f, hasPolice = true,
            skyColor = new Color(0.12f, 0.04f, 0.22f), neonColor = Color.magenta
        }.ToStageData(),
        new TrackData_StageAlias {
            id = 25,
            nameKo = "섹터 25: 태풍 방조제", nameEn = "Sector 25: Typhoon Seawall", nameJa = "セクター25：台風の防潮堤", nameEs = "Sector 25: Malecón del Tifón",
            descKo = "파도가 넘치는 방조제 위. 폭우 속 고속 추월이 이어져요.",
            descEn = "A seawall with waves crashing over. High-speed passing in a downpour.",
            descJa = "波が越える防潮堤の上。豪雨の中の高速追い越しが続く。",
            descEs = "Un malecón azotado por las olas. Adelantamientos rápidos bajo el aguacero.",
            targetDistance = 19800f, trafficSpeed = 133f, spawnInterval = 0.59f, hasPolice = true, hasRain = true,
            skyColor = new Color(0.05f, 0.1f, 0.14f), neonColor = Color.cyan
        }.ToStageData(),
        new TrackData_StageAlias {
            id = 26,
            nameKo = "섹터 26: 옥상 고속도로", nameEn = "Sector 26: Rooftop Expressway", nameJa = "セクター26：屋上エクスプレスウェイ", nameEs = "Sector 26: Vía Rápida de las Azoteas",
            descKo = "고층 빌딩 옥상을 잇는 고가도로. 차간 거리가 확 좁아져요.",
            descEn = "An elevated road linking skyscraper roofs. The gaps get much tighter.",
            descJa = "高層ビルの屋上をつなぐ高架道路。車間がぐっと狭くなる。",
            descEs = "Una vía elevada entre azoteas de rascacielos. Los huecos se estrechan mucho.",
            targetDistance = 20400f, trafficSpeed = 134f, spawnInterval = 0.58f, hasPolice = true,
            skyColor = new Color(0.16f, 0.08f, 0.2f), neonColor = new Color(1f, 0.3f, 0.8f)
        }.ToStageData(),
        new TrackData_StageAlias {
            id = 27,
            nameKo = "섹터 27: 플라스마 주조소 구간", nameEn = "Sector 27: Plasma Foundry Run", nameJa = "セクター27：プラズマ鋳造所区間", nameEs = "Sector 27: Tramo de la Fundición de Plasma",
            descKo = "용광로 불빛이 번지는 공장 지대. 대형 트럭 행렬을 뚫으세요.",
            descEn = "A factory zone glowing with furnaces. Break through convoys of big trucks.",
            descJa = "溶鉱炉の光がにじむ工場地帯。大型トラックの列を突破しよう。",
            descEs = "Una zona industrial iluminada por hornos. Rompe los convoyes de camiones.",
            targetDistance = 21000f, trafficSpeed = 135f, spawnInterval = 0.57f, hasPolice = true,
            skyColor = new Color(0.3f, 0.1f, 0.02f), neonColor = new Color(1f, 0.45f, 0.1f)
        }.ToStageData(),
        new TrackData_StageAlias {
            id = 28,
            nameKo = "섹터 28: 성층권 진입로", nameEn = "Sector 28: Stratosphere Ramp", nameJa = "セクター28：成層圏ランプ", nameEs = "Sector 28: Rampa a la Estratosfera",
            descKo = "하늘로 올라가는 진입로. 마지막 세 섹터의 시작이에요.",
            descEn = "A ramp climbing into the sky. The last three sectors begin here.",
            descJa = "空へ昇るランプ。最後の3セクターの始まり。",
            descEs = "Una rampa que sube al cielo. Empiezan los tres últimos sectores.",
            targetDistance = 21600f, trafficSpeed = 136f, spawnInterval = 0.56f, hasPolice = true,
            skyColor = new Color(0.06f, 0.1f, 0.3f), neonColor = new Color(0.5f, 0.8f, 1f)
        }.ToStageData(),
        new TrackData_StageAlias {
            id = 29,
            nameKo = "섹터 29: 유성우 차로", nameEn = "Sector 29: Meteor Shower Lanes", nameJa = "セクター29：流星群レーン", nameEs = "Sector 29: Carriles de la Lluvia de Meteoros",
            descKo = "유성이 쏟아지는 하늘 아래 가장 촘촘한 트래픽. 최종 보스 직전이에요.",
            descEn = "The densest traffic under a meteor shower, right before the final boss.",
            descJa = "流星が降る空の下、最も密な交通。最終ボス直前。",
            descEs = "El tráfico más denso bajo una lluvia de meteoros, justo antes del jefe final.",
            targetDistance = 22200f, trafficSpeed = 137f, spawnInterval = 0.55f, hasPolice = true, hasRain = true,
            skyColor = new Color(0.08f, 0.04f, 0.16f), neonColor = Color.white
        }.ToStageData(),
        new TrackData_StageAlias {
            id = 30,
            nameKo = "섹터 30: 보스: 별빛 드레드노트", nameEn = "Sector 30: Boss: Starlight Dreadnought", nameJa = "セクター30：ボス：星明かりのドレッドノート", nameEs = "Sector 30: Jefe: Acorazado Luz Estelar",
            descKo = "최종 보스. 22,800m를 달려 30개 섹터를 모두 정복하세요.",
            descEn = "The final boss. Drive 22,800 m to conquer all 30 sectors.",
            descJa = "最終ボス。22,800mを走り抜けて全30セクターを制覇しよう。",
            descEs = "El jefe final. Recorre 22.800 m para conquistar los 30 sectores.",
            targetDistance = 22800f, trafficSpeed = 110f, spawnInterval = 0.80f, hasPolice = true, isBossStage = true,
            skyColor = new Color(0.35f, 0.25f, 0.08f), neonColor = Color.yellow
        }.ToStageData()
    };

    public class TrackData_StageAlias
    {
        public int id;
        public string nameKo; public string nameEn; public string nameJa; public string nameEs;
        public string descKo; public string descEn; public string descJa; public string descEs;
        public float targetDistance; public float trafficSpeed; public float spawnInterval;
        public bool hasPolice; public bool hasRain; public bool isTunnel; public bool isBossStage;
        public Color skyColor; public Color neonColor;

        public StageData ToStageData()
        {
            return new StageData {
                id = id, nameKo = nameKo, nameEn = nameEn, nameJa = nameJa, nameEs = nameEs,
                descKo = descKo, descEn = descEn, descJa = descJa, descEs = descEs,
                targetDistance = targetDistance, trafficSpeed = trafficSpeed, spawnInterval = spawnInterval,
                hasPolice = hasPolice, hasRain = hasRain, isTunnel = isTunnel, isBossStage = isBossStage,
                skyColor = skyColor, neonColor = neonColor
            };
        }
    }

    void Awake()
    {
        switch (OiyoLang.Pick("ko", "en", "ja", "es")) { case "en": lang = CyberLanguage.EN; break; case "ja": lang = CyberLanguage.JA; break; case "es": lang = CyberLanguage.ES; break; default: lang = CyberLanguage.KO; break; }
        Application.targetFrameRate = 60;
        mainCam = Camera.main;
        if (mainCam == null)
        {
            var camGo = new GameObject("MainCamera");
            mainCam = camGo.AddComponent<Camera>();
            camGo.tag = "MainCamera";
        }
        mainCam.backgroundColor = new Color(0.03f, 0.04f, 0.09f);
        mainCam.clearFlags = CameraClearFlags.SolidColor;
        mainCam.transform.position = new Vector3(0, 3.4f, -6.0f);
        mainCam.transform.rotation = Quaternion.Euler(14f, 0, 0);

        audioSource = gameObject.AddComponent<AudioSource>();
        audioSource.playOnAwake = false;

        engineSource = gameObject.AddComponent<AudioSource>();
        engineSource.playOnAwake = false;
        engineSource.loop = true;

        GenerateAudioClips();
        CreateMaterials();
        CreatePlayerCar();
        CreateRoadEnvironment();
        CreateParticleSystems();

        bestScore = PlayerPrefs.GetInt("CyberHighway_BestScore", 0);
        ResetToStage(0);
    }

    // ---- Painted art (scripts/make_art.py -> Resources/CH/Art) ----
    private static readonly Dictionary<string, Texture2D> artTex = new Dictionary<string, Texture2D>();
    private Material roadArtMat, skylineMat;
    private float roadScroll;

    private static Texture2D ArtTex(string name, bool repeat = false)
    {
        if (!artTex.TryGetValue(name, out var t))
        {
            t = Resources.Load<Texture2D>("CH/Art/" + name);
            artTex[name] = t;
        }
        if (t != null) t.wrapMode = repeat ? TextureWrapMode.Repeat : TextureWrapMode.Clamp;
        return t;
    }

    // Unlit painted material (the night scene is lit by the paint itself).
    private static Material ArtMat(string tex, Color tint, bool blended = false)
    {
        var sh = blended ? null : Shader.Find("OIYO/UnlitCutout");
        var m = new Material(sh != null ? sh : Shader.Find("Sprites/Default"));
        m.mainTexture = ArtTex(tex);
        m.color = tint;
        return m;
    }

    // Painted rear view stuck to the back face of a unit box (child of the scaled box).
    private static void RearPlate(GameObject box, string tex, float heightFrac = 1f)
    {
        var q = GameObject.CreatePrimitive(PrimitiveType.Quad);
        q.name = "Rear";
        Destroy(q.GetComponent<Collider>());
        q.transform.SetParent(box.transform, false);
        q.transform.localPosition = new Vector3(0f, (heightFrac - 1f) * -0.5f + 0.02f, -0.505f);
        q.transform.localScale = new Vector3(1.04f, heightFrac, 1f);
        q.GetComponent<Renderer>().material = ArtMat(tex, Color.white);
    }

    private static readonly string[] RearArt = { "rear_sedan", "rear_truck", "rear_sports", "rear_police" };

    private void CreateMaterials()
    {
        var shader = Shader.Find("Mobile/Diffuse");
        if (shader == null) shader = Shader.Find("Diffuse");
        if (shader == null) shader = Shader.Find("Standard");

        carBodyMat = new Material(shader);
        carBodyMat.color = new Color(0.0f, 0.95f, 1.0f);

        wheelMat = new Material(shader);
        wheelMat.color = new Color(0.12f, 0.12f, 0.15f);

        roadMat = new Material(shader);
        roadMat.color = new Color(0.06f, 0.07f, 0.11f);

        lineMat = new Material(shader);
        lineMat.color = new Color(0.3f, 0.6f, 1.0f);

        trafficSedanMat = new Material(shader);
        trafficSedanMat.color = new Color(0.95f, 0.2f, 0.4f);

        trafficTruckMat = new Material(shader);
        trafficTruckMat.color = new Color(0.3f, 0.35f, 0.5f);

        trafficSportsMat = new Material(shader);
        trafficSportsMat.color = new Color(1.0f, 0.8f, 0.1f);

        policeMat = new Material(shader);
        policeMat.color = new Color(0.1f, 0.15f, 0.3f);

        bossMat = new Material(shader);
        bossMat.color = new Color(0.55f, 0.1f, 0.15f);

        shieldMat = new Material(shader);
        shieldMat.color = new Color(0.1f, 0.85f, 1.0f, 0.5f);

        pickupMat = new Material(shader);
        pickupMat.color = Color.yellow;

        // painted versions (body paint keeps each traffic type's colour)
        trafficSedanMat = ArtMat("paint", new Color(0.85f, 0.2f, 0.36f));
        trafficTruckMat = ArtMat("paint", new Color(0.36f, 0.4f, 0.5f));
        trafficSportsMat = ArtMat("paint", new Color(0.95f, 0.76f, 0.2f));
        policeMat = ArtMat("paint", new Color(0.14f, 0.18f, 0.3f));
        bossMat = ArtMat("trailer", Color.white);
        carBodyMat = ArtMat("paint", new Color(0.1f, 0.78f, 0.85f));
        roadArtMat = ArtMat("road", Color.white);
        roadArtMat.mainTexture.wrapMode = TextureWrapMode.Repeat;
        roadArtMat.mainTextureScale = new Vector2(1f, 2f);
        skylineMat = ArtMat("skyline", Color.white);
        skylineMat.renderQueue = 1000;
    }

    private void CreatePlayerCar()
    {
        playerCar = new GameObject("PlayerSupercar");
        playerCar.transform.position = playerPos;

        // Chassis
        var chassis = GameObject.CreatePrimitive(PrimitiveType.Cube);
        chassis.name = "Chassis";
        chassis.transform.SetParent(playerCar.transform);
        chassis.transform.localPosition = new Vector3(0, 0.25f, 0);
        chassis.transform.localScale = new Vector3(1.4f, 0.45f, 2.8f);
        chassis.GetComponent<Renderer>().material = carBodyMat;

        // Cabin / Glass Canopy
        var cabin = GameObject.CreatePrimitive(PrimitiveType.Cube);
        cabin.transform.SetParent(playerCar.transform);
        cabin.transform.localPosition = new Vector3(0, 0.55f, -0.2f);
        cabin.transform.localScale = new Vector3(1.1f, 0.4f, 1.3f);
        var cabinMat = ArtMat("glass", Color.white);
        cabin.GetComponent<Renderer>().material = cabinMat;

        // Rear Spoiler Wing
        var spoiler = GameObject.CreatePrimitive(PrimitiveType.Cube);
        spoiler.transform.SetParent(playerCar.transform);
        spoiler.transform.localPosition = new Vector3(0, 0.65f, -1.25f);
        spoiler.transform.localScale = new Vector3(1.5f, 0.08f, 0.35f);
        spoiler.GetComponent<Renderer>().material = carBodyMat;
        RearPlate(chassis, "rear_player");

        // 4 Wheels
        float[] wx = new float[] { -0.75f, 0.75f };
        float[] wz = new float[] { 0.85f, -0.85f };
        for (int i = 0; i < 2; i++)
        {
            for (int j = 0; j < 2; j++)
            {
                var wheel = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                wheel.transform.SetParent(playerCar.transform);
                wheel.transform.localPosition = new Vector3(wx[i], 0.2f, wz[j]);
                wheel.transform.localRotation = Quaternion.Euler(0, 0, 90);
                wheel.transform.localScale = new Vector3(0.42f, 0.22f, 0.42f);
                wheel.GetComponent<Renderer>().material = wheelMat;
            }
        }

        // Shield Bubble
        shieldBubble = GameObject.CreatePrimitive(PrimitiveType.Quad);
        Destroy(shieldBubble.GetComponent<Collider>());
        shieldBubble.transform.SetParent(playerCar.transform);
        shieldBubble.transform.localPosition = new Vector3(0, 0.5f, -1.6f);
        shieldBubble.transform.localScale = new Vector3(2.4f, 1.6f, 3.8f);
        shieldBubble.GetComponent<Renderer>().material = ArtMat("shield", new Color(1f, 1f, 1f, 0.55f), true);

        // Headlight Light
        var lightGo = new GameObject("CarHeadlight");
        lightGo.transform.SetParent(playerCar.transform);
        lightGo.transform.localPosition = new Vector3(0, 0.4f, 1.2f);
        var light = lightGo.AddComponent<Light>();
        light.type = LightType.Spot;
        light.range = 35f;
        light.spotAngle = 75f;
        light.intensity = 2.8f;
        light.color = new Color(0.7f, 0.95f, 1f);
        lightGo.transform.localRotation = Quaternion.Euler(10, 0, 0);

        // Directional Light
        var sunGo = new GameObject("SunLight");
        var sun = sunGo.AddComponent<Light>();
        sun.type = LightType.Directional;
        sun.intensity = 0.65f;
        sun.color = new Color(0.7f, 0.8f, 1f);
        sunGo.transform.rotation = Quaternion.Euler(45, 30, 0);
    }

    private void CreateRoadEnvironment()
    {
        // 4-Lane Highway Road Mesh (Width 10.5m, 4 lanes of 2.2m each)
        for (int i = 0; i < 4; i++)
        {
            var road = GameObject.CreatePrimitive(PrimitiveType.Cube);
            road.name = "HighwaySection_" + i;
            road.transform.position = new Vector3(0, -0.1f, i * 40f);
            road.transform.localScale = new Vector3(10.5f, 0.2f, 40f);
            road.GetComponent<Renderer>().material = roadArtMat;
            roadSegments.Add(road.transform);
        }

        // Neon skyline far ahead, beyond the end of the road
        var sky = GameObject.CreatePrimitive(PrimitiveType.Quad);
        sky.name = "Skyline";
        Destroy(sky.GetComponent<Collider>());
        sky.transform.position = new Vector3(0f, 14f, 150f);
        sky.transform.localScale = new Vector3(200f, 75f, 1f);
        sky.GetComponent<Renderer>().material = skylineMat;

        // Side Guardrails & Streetlights
        for (int i = 0; i < 16; i++)
        {
            var poleL = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            poleL.transform.position = new Vector3(-5.4f, 3.0f, i * 10f);
            poleL.transform.localScale = new Vector3(0.12f, 3.0f, 0.12f);
            poleL.GetComponent<Renderer>().material = lineMat;
            streetlights.Add(poleL.transform);

            var poleR = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            poleR.transform.position = new Vector3(5.4f, 3.0f, i * 10f);
            poleR.transform.localScale = new Vector3(0.12f, 3.0f, 0.12f);
            poleR.GetComponent<Renderer>().material = lineMat;
            streetlights.Add(poleR.transform);
        }
    }

    private void CreateParticleSystems()
    {
        // Nitro exhaust flames
        var nGo = new GameObject("NitroExhaust");
        nGo.transform.SetParent(playerCar.transform);
        nGo.transform.localPosition = new Vector3(0, 0.25f, -1.45f);
        nGo.transform.localRotation = Quaternion.Euler(0, 180, 0);
        nitroExhaust = nGo.AddComponent<ParticleSystem>();
        var nm = nitroExhaust.main;
        nm.startSize = 0.35f;
        nm.startLifetime = 0.28f;
        nm.startSpeed = 12f;
        nm.startColor = new Color(0.0f, 0.9f, 1f, 0.9f);
        nm.simulationSpace = ParticleSystemSimulationSpace.World;
        var ne = nitroExhaust.emission;
        ne.rateOverTime = 60f;
        var sparkMat = ArtMat("spark", Color.white, true);
        nGo.GetComponent<ParticleSystemRenderer>().material = sparkMat;
        ne.enabled = false;

        // Crash sparks
        var sGo = new GameObject("CrashSparks");
        crashSparks = sGo.AddComponent<ParticleSystem>();
        var sm = crashSparks.main;
        sm.startSize = 0.3f;
        sm.startLifetime = 0.5f;
        sm.startSpeed = 14f;
        sm.startColor = new Color(1f, 0.6f, 0.1f);
        sm.simulationSpace = ParticleSystemSimulationSpace.World;
        sGo.GetComponent<ParticleSystemRenderer>().material = sparkMat;
        var se = crashSparks.emission;
        se.rateOverTime = 0f;
    }

    private void ResetToStage(int index)
    {
        currentStageIndex = Mathf.Clamp(index, 0, stages.Length - 1);
        var stg = stages[currentStageIndex];

        mainCam.backgroundColor = stg.skyColor;
        lineMat.color = stg.neonColor;

        playerPos = new Vector3(0, 0.45f, 0);
        playerCar.transform.position = playerPos;
        targetLaneX = 0f;
        currentSpeedKmh = 140f;
        targetSpeedKmh = 140f;
        distanceTraveled = 0f;
        nitroFuel = 100f;
        isNitroActive = false;
        steerTilt = 0f;
        invulnerableTimer = 0.5f;
        camShake = 0f;
        nearMissAlpha = 0f;

        // Clear existing traffic & pickups
        foreach (var t in traffic) if (t.go != null) Destroy(t.go);
        traffic.Clear();
        foreach (var p in pickups) if (p.go != null) Destroy(p.go);
        pickups.Clear();

        if (bossJuggernaut != null)
        {
            Destroy(bossJuggernaut);
            bossJuggernaut = null;
        }

        if (stg.isBossStage)
        {
            SpawnBossJuggernaut();
        }

        state = GameState.Ready;
    }

    private void SpawnBossJuggernaut()
    {
        bossJuggernaut = new GameObject("BossJuggernaut");
        bossZ = 75f;
        bossJuggernaut.transform.position = new Vector3(0, 1.2f, bossZ);
        bossHp = 1000f;

        // Giant Double Trailer
        var body1 = GameObject.CreatePrimitive(PrimitiveType.Cube);
        body1.transform.SetParent(bossJuggernaut.transform);
        body1.transform.localPosition = new Vector3(0, 0, 0);
        body1.transform.localScale = new Vector3(3.2f, 2.2f, 6.5f);
        body1.GetComponent<Renderer>().material = bossMat;
        RearPlate(body1, "boss_rear");

        var body2 = GameObject.CreatePrimitive(PrimitiveType.Cube);
        body2.transform.SetParent(bossJuggernaut.transform);
        body2.transform.localPosition = new Vector3(0, 0, -6.8f);
        body2.transform.localScale = new Vector3(3.0f, 2.0f, 5.8f);
        body2.GetComponent<Renderer>().material = bossMat;
        RearPlate(body2, "boss_rear");
    }

    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("cyber-highway-3d", state, score);
        float dt = Time.deltaTime;

        if (Input.GetKeyDown(KeyCode.Escape))
        {
            showStageSelect = !showStageSelect;
        }

        // Camera Shake decay
        if (camShake > 0)
        {
            camShake = Mathf.Max(0, camShake - dt * 3.5f);
        }

        // Near Miss banner fade
        if (nearMissAlpha > 0)
        {
            nearMissAlpha = Mathf.Max(0, nearMissAlpha - dt * 1.8f);
        }

        if (state == GameState.Ready)
        {
            if (Input.GetKeyDown(KeyCode.Space) || Input.GetMouseButtonDown(0))
            {
                state = GameState.Playing;
                engineSource.clip = engineClip;
                engineSource.volume = 0.4f;
                engineSource.Play();
            }
        }
        else if (state == GameState.Playing)
        {
            UpdatePlayer(dt);
            UpdateRoadScroll(dt);
            UpdateTrafficSpawns(dt);
            UpdateTraffic(dt);
            UpdatePickups(dt);
            CheckCollisions();
            CheckStageProgression();
        }

        UpdateVisuals();
    }

    private void UpdatePlayer(float dt)
    {
        // Steering: A/D or Arrow Keys
        float steer = 0f;
        if (Input.GetKey(KeyCode.LeftArrow) || Input.GetKey(KeyCode.A)) steer -= 1f;
        if (Input.GetKey(KeyCode.RightArrow) || Input.GetKey(KeyCode.D)) steer += 1f;

        // Mouse or Touch steering
        if (Input.GetMouseButton(0) || Input.touchCount > 0)
        {
            Vector3 mouseScreen = Input.mousePosition;
            Ray ray = mainCam.ScreenPointToRay(mouseScreen);
            Plane plane = new Plane(Vector3.up, new Vector3(0, 0.45f, 0));
            float dist;
            if (plane.Raycast(ray, out dist))
            {
                Vector3 hitPoint = ray.GetPoint(dist);
                float dx = hitPoint.x - playerPos.x;
                steer = Mathf.Clamp(dx * 2.5f, -1f, 1f);
            }
        }

        // Lane Steer Motion
        playerPos.x += steer * 8.5f * dt;
        playerPos.x = Mathf.Clamp(playerPos.x, -4.2f, 4.2f);

        // Tilt Banking Angle
        float targetTilt = -steer * 16f;
        steerTilt = Mathf.Lerp(steerTilt, targetTilt, dt * 10f);

        // Nitro Acceleration (Space / Up / W)
        bool nitroInput = Input.GetKey(KeyCode.Space) || Input.GetKey(KeyCode.UpArrow) || Input.GetKey(KeyCode.W);
        isNitroActive = nitroInput && nitroFuel > 0f;

        if (isNitroActive)
        {
            targetSpeedKmh = 260f;
            nitroFuel = Mathf.Max(0f, nitroFuel - 25f * dt);
            targetFov = 72f;
            if (!nitroExhaust.emission.enabled)
            {
                var ne = nitroExhaust.emission;
                ne.enabled = true;
                PlaySound(nitroClip, 0.7f);
            }
        }
        else
        {
            targetSpeedKmh = 160f;
            nitroFuel = Mathf.Min(100f, nitroFuel + 12f * dt); // slow regen
            targetFov = 60f;
            if (nitroExhaust.emission.enabled)
            {
                var ne = nitroExhaust.emission;
                ne.enabled = false;
            }
        }

        // Braking
        if (Input.GetKey(KeyCode.DownArrow) || Input.GetKey(KeyCode.S))
        {
            targetSpeedKmh = 90f;
        }

        currentSpeedKmh = Mathf.Lerp(currentSpeedKmh, targetSpeedKmh, dt * 3.5f);
        float forwardSpeedMps = currentSpeedKmh / 3.6f;

        distanceTraveled += forwardSpeedMps * dt;
        score = (int)(distanceTraveled * 10) + credits * 100;
        if (score > bestScore)
        {
            bestScore = score;
            PlayerPrefs.SetInt("CyberHighway_BestScore", bestScore);
        }

        // Engine Sound Pitch based on speed
        if (engineSource != null)
        {
            engineSource.pitch = 0.7f + (currentSpeedKmh / 260f) * 0.9f;
        }

        if (invulnerableTimer > 0) invulnerableTimer -= dt;
    }

    private void UpdateRoadScroll(float dt)
    {
        float speed = (currentSpeedKmh / 3.6f) * dt;

        // Scroll Road Segments backwards
        for (int i = 0; i < roadSegments.Count; i++)
        {
            var r = roadSegments[i];
            r.position -= new Vector3(0, 0, speed);
            if (r.position.z < -40f)
            {
                r.position = new Vector3(0, -0.1f, r.position.z + 160f);
            }
        }

        // Scroll Streetlights
        for (int i = 0; i < streetlights.Count; i++)
        {
            var l = streetlights[i];
            l.position -= new Vector3(0, 0, speed);
            if (l.position.z < -20f)
            {
                l.position = new Vector3(l.position.x, l.position.y, l.position.z + 160f);
            }
        }
    }

    private void UpdateTrafficSpawns(float dt)
    {
        var stg = stages[currentStageIndex];
        trafficSpawnTimer += dt;

        if (trafficSpawnTimer >= stg.spawnInterval)
        {
            trafficSpawnTimer = 0f;

            // 4 Lanes: -3.3, -1.1, 1.1, 3.3
            float[] lanes = new float[] { -3.3f, -1.1f, 1.1f, 3.3f };
            float spawnX = lanes[UnityEngine.Random.Range(0, 4)];
            Vector3 pos = new Vector3(spawnX, 0.45f, 75f);

            int type = 0;
            float roll = UnityEngine.Random.value;

            if (stg.hasPolice && roll < 0.22f) type = 3; // Police
            else if (roll < 0.45f) type = 1; // Truck
            else if (roll < 0.75f) type = 2; // Sports
            else type = 0; // Sedan

            SpawnTrafficCar(pos, type, stg.trafficSpeed);

            // Chance to spawn pickup
            if (UnityEngine.Random.value < 0.28f)
            {
                float pickX = lanes[UnityEngine.Random.Range(0, 4)];
                SpawnPickup(new Vector3(pickX, 0.5f, 85f));
            }
        }
    }

    private void SpawnTrafficCar(Vector3 pos, int type, float baseSpeedKmh)
    {
        var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
        go.transform.position = pos;

        float length = 2.8f;
        float width = 1.4f;
        float speedKmh = baseSpeedKmh;

        if (type == 0) // Sedan
        {
            go.transform.localScale = new Vector3(1.4f, 0.6f, 2.8f);
            go.GetComponent<Renderer>().material = trafficSedanMat;
            speedKmh = baseSpeedKmh * UnityEngine.Random.Range(0.85f, 1.0f);
        }
        else if (type == 1) // Heavy Semi-Truck
        {
            length = 5.6f;
            width = 1.6f;
            go.transform.localScale = new Vector3(width, 1.4f, length);
            go.GetComponent<Renderer>().material = trafficTruckMat;
            speedKmh = baseSpeedKmh * 0.7f;
        }
        else if (type == 2) // Sports Car
        {
            go.transform.localScale = new Vector3(1.4f, 0.5f, 2.6f);
            go.GetComponent<Renderer>().material = trafficSportsMat;
            speedKmh = baseSpeedKmh * 1.25f;
        }
        else if (type == 3) // Police Interceptor
        {
            go.transform.localScale = new Vector3(1.5f, 0.65f, 3.0f);
            go.GetComponent<Renderer>().material = policeMat;
            speedKmh = baseSpeedKmh * 1.15f;
        }

        RearPlate(go, RearArt[Mathf.Clamp(type, 0, 3)]);

        traffic.Add(new TrafficCar
        {
            pos = pos, speed = speedKmh, type = type,
            length = length, width = width, nearMissScored = false, go = go
        });
    }

    private void UpdateTraffic(float dt)
    {
        float playerSpeedMps = currentSpeedKmh / 3.6f;

        for (int i = traffic.Count - 1; i >= 0; i--)
        {
            var t = traffic[i];
            float relSpeedMps = (t.speed / 3.6f) - playerSpeedMps;
            t.pos += new Vector3(0, 0, relSpeedMps * dt);

            if (t.go != null) t.go.transform.position = t.pos;

            // Near Miss Check (Passing close side-by-side)
            if (!t.nearMissScored && Mathf.Abs(t.pos.z - playerPos.z) < 1.2f)
            {
                float dx = Mathf.Abs(t.pos.x - playerPos.x);
                if (dx > 1.4f && dx < 2.3f)
                {
                    t.nearMissScored = true;
                    score += 500;
                    PlaySound(nearMissClip, 0.6f);
                    ShowNearMiss(U("+500 NEAR MISS!"));
                }
            }

            if (t.pos.z < -20f || t.pos.z > 95f)
            {
                if (t.go != null) Destroy(t.go);
                traffic.RemoveAt(i);
            }
            else
            {
                traffic[i] = t;
            }
        }

        // Update Boss Juggernaut
        if (bossJuggernaut != null)
        {
            float bossSpeedMps = 95f / 3.6f;
            bossZ += (bossSpeedMps - playerSpeedMps) * dt;
            bossZ = Mathf.Clamp(bossZ, 12f, 75f);
            bossJuggernaut.transform.position = new Vector3(Mathf.Sin(Time.time * 1.2f) * 2.2f, 1.2f, bossZ);
        }
    }

    private void SpawnPickup(Vector3 pos)
    {
        float roll = UnityEngine.Random.value;
        int type = 0; // 0: Credit, 1: Nitro, 2: Shield
        if (roll < 0.6f) type = 0;
        else if (roll < 0.85f) type = 1;
        else type = 2;

        var go = GameObject.CreatePrimitive(PrimitiveType.Quad);
        Destroy(go.GetComponent<Collider>());
        go.transform.position = pos;
        go.transform.localScale = new Vector3(1.0f, 1.0f, 1f);
        go.GetComponent<Renderer>().material = ArtMat(type == 0 ? "pick_credit" : type == 1 ? "pick_nitro" : "pick_shield", Color.white);

        pickups.Add(new RoadPickup { pos = pos, type = type, go = go });
    }

    private void UpdatePickups(float dt)
    {
        float playerSpeedMps = currentSpeedKmh / 3.6f;

        for (int i = pickups.Count - 1; i >= 0; i--)
        {
            var p = pickups[i];
            p.pos -= new Vector3(0, 0, playerSpeedMps * dt);
            if (p.go != null)
            {
                p.go.transform.position = p.pos;
                p.go.transform.Rotate(0, 120f * dt, 0);
            }

            // Collection Check
            if (Vector3.Distance(p.pos, playerPos) < 1.4f)
            {
                PlaySound(coinClip, 0.7f);
                if (p.type == 0) credits += 10;
                else if (p.type == 1) nitroFuel = Mathf.Min(100f, nitroFuel + 40f);
                else shields = Mathf.Min(3, shields + 1);

                if (p.go != null) Destroy(p.go);
                pickups.RemoveAt(i);
            }
            else if (p.pos.z < -15f)
            {
                if (p.go != null) Destroy(p.go);
                pickups.RemoveAt(i);
            }
            else
            {
                pickups[i] = p;
            }
        }
    }

    private void CheckCollisions()
    {
        if (invulnerableTimer > 0f) return;

        // Zero-Collider AABB check against Traffic
        for (int i = 0; i < traffic.Count; i++)
        {
            var t = traffic[i];
            if (Mathf.Abs(t.pos.x - playerPos.x) < (t.width * 0.5f + 0.65f) &&
                Mathf.Abs(t.pos.z - playerPos.z) < (t.length * 0.5f + 1.25f))
            {
                HitCrash();
                return;
            }
        }

        // Boss Juggernaut Collision
        if (bossJuggernaut != null)
        {
            Vector3 bp = bossJuggernaut.transform.position;
            if (Mathf.Abs(bp.x - playerPos.x) < 2.0f && Mathf.Abs(bp.z - playerPos.z) < 5.5f)
            {
                HitCrash();
                return;
            }
        }
    }

    private void HitCrash()
    {
        if (shields > 0)
        {
            shields--;
            invulnerableTimer = 1.6f;
            camShake = 0.6f;
            currentSpeedKmh *= 0.6f; // slowdown
            PlaySound(crashClip, 0.7f);
            crashSparks.transform.position = playerPos;
            crashSparks.Emit(30);
            return;
        }

        // Fatal crash
        state = GameState.GameOver;
        camShake = 1.2f;
        PlaySound(crashClip, 1.0f);
        crashSparks.transform.position = playerPos;
        crashSparks.Emit(80);
        if (engineSource != null) engineSource.Stop();
    }

    private void CheckStageProgression()
    {
        if (isEndless) return;

        var stg = stages[currentStageIndex];
        if (distanceTraveled >= stg.targetDistance)
        {
            PlaySound(clearClip, 0.9f);
            if (currentStageIndex >= stages.Length - 1)
            {
                state = GameState.AllCleared;
            }
            else
            {
                state = GameState.StageClear;
            }
        }
    }

    private void ShowNearMiss(string txt)
    {
        nearMissBanner = txt;
        nearMissAlpha = 1.0f;
    }

    private void UpdateVisuals()
    {
        playerCar.transform.position = playerPos;
        playerCar.transform.rotation = Quaternion.Euler(0, 0, steerTilt);

        if (shieldBubble != null)
        {
            shieldBubble.SetActive(shields > 0);
            if (shields > 0)
            {
                float sc = 1.0f + Mathf.Sin(Time.time * 6f) * 0.05f;
                shieldBubble.transform.localScale = new Vector3(2.4f * sc, 1.6f * sc, 3.8f * sc);
            }
        }

        // Camera follow & FOV
        mainCam.fieldOfView = Mathf.Lerp(mainCam.fieldOfView, targetFov, Time.deltaTime * 5f);
        Vector3 camTarget = new Vector3(playerPos.x * 0.4f, 3.4f, -6.0f);
        if (camShake > 0)
        {
            camTarget += new Vector3(UnityEngine.Random.Range(-camShake, camShake), UnityEngine.Random.Range(-camShake, camShake), 0);
        }
        mainCam.transform.position = Vector3.Lerp(mainCam.transform.position, camTarget, Time.deltaTime * 10f);
    }

    private void PlaySound(AudioClip clip, float vol = 1.0f)
    {
        if (clip != null) audioSource.PlayOneShot(clip, vol);
    }

    private void GenerateAudioClips()
    {
        engineClip = CreateSynthClip("engine", 0.4f, (t) => (Mathf.PerlinNoise(t * 80f, 0) - 0.5f) * 0.5f + Mathf.Sin(t * 120f * Mathf.PI * 2f) * 0.3f);
        nitroClip = CreateSynthClip("nitro", 0.5f, (t) => (Mathf.PerlinNoise(t * 150f, 0) - 0.5f) * 0.8f);
        coinClip = CreateSynthClip("coin", 0.2f, (t) => Mathf.Sin(t * 1800f * Mathf.PI * 2f * t) * Mathf.Exp(-t * 10f));
        nearMissClip = CreateSynthClip("nearmiss", 0.35f, (t) => Mathf.Sin((600f + t * 900f) * Mathf.PI * 2f * t) * 0.6f);
        crashClip = CreateSynthClip("crash", 0.65f, (t) => (UnityEngine.Random.value - 0.5f) * Mathf.Exp(-t * 4.5f));
        clearClip = CreateSynthClip("clear", 0.85f, (t) => Mathf.Sin((523.25f + t * 440f) * Mathf.PI * 2f * t) * 0.65f);
    }

    private AudioClip CreateSynthClip(string name, float duration, Func<float, float> waveFunc)
    {
        int sampleRate = 22050;
        int sampleCount = (int)(duration * sampleRate);
        var clip = AudioClip.Create(name, sampleCount, 1, sampleRate, false);
        float[] data = new float[sampleCount];
        for (int i = 0; i < sampleCount; i++)
        {
            float t = (float)i / sampleRate;
            data[i] = Mathf.Clamp(waveFunc(t), -1f, 1f);
        }
        clip.SetData(data, 0);
        return clip;
    }

    void OnGUI()
    {
        OiyoUiFont.Apply();
        int w = Screen.width;
        int h = Screen.height;

        GUI.skin.label.fontSize = 14;
        GUI.skin.button.fontSize = 14;

        // Top Navigation Bar
        GUILayout.BeginArea(new Rect(15, 12, w - 30, 42));
        GUILayout.BeginHorizontal();

        GUI.color = Color.white;
        GUILayout.Label($"<b>CYBER HIGHWAY 3D</b>", GUILayout.Width(170));

        // Language Buttons
        GUI.color = lang == CyberLanguage.KO ? Color.cyan : Color.white;
        if (GUILayout.Button("KO", GUILayout.Width(45), GUILayout.Height(28))) lang = CyberLanguage.KO;
        GUI.color = lang == CyberLanguage.EN ? Color.cyan : Color.white;
        if (GUILayout.Button(OiyoI18n.ForEnglish.ToUpperInvariant(), GUILayout.Width(45), GUILayout.Height(28))) lang = CyberLanguage.EN;
        GUI.color = lang == CyberLanguage.JA ? Color.cyan : Color.white;
        if (GUILayout.Button("JA", GUILayout.Width(45), GUILayout.Height(28))) lang = CyberLanguage.JA;
        GUI.color = lang == CyberLanguage.ES ? Color.cyan : Color.white;
        if (GUILayout.Button("ES", GUILayout.Width(45), GUILayout.Height(28))) lang = CyberLanguage.ES;

        GUILayout.FlexibleSpace();

        // Stage Select
        GUI.color = showStageSelect ? Color.yellow : Color.white;
        string stagesLabel = GetText("섹터 선택", "Sectors", "セクター選択", "Sectores");
        if (GUILayout.Button(stagesLabel, GUILayout.Width(110), GUILayout.Height(28)))
        {
            showStageSelect = !showStageSelect;
        }

        // Endless Toggle
        GUI.color = isEndless ? Color.green : Color.white;
        string endlessLabel = GetText("무한 주행", "Endless", "エンドレス", "Infinito");
        if (GUILayout.Button(endlessLabel, GUILayout.Width(95), GUILayout.Height(28)))
        {
            isEndless = !isEndless;
            ResetToStage(currentStageIndex);
        }

        GUILayout.EndHorizontal();
        GUILayout.EndArea();

        // Near Miss Flash Banner
        if (nearMissAlpha > 0f)
        {
            GUI.color = new Color(1f, 0.9f, 0.1f, nearMissAlpha);
            GUI.skin.label.alignment = TextAnchor.MiddleCenter;
            GUI.Label(new Rect(w * 0.5f - 160, h * 0.28f, 320, 50), $"<size=26><b>⚡ {nearMissBanner}</b></size>");
            GUI.skin.label.alignment = TextAnchor.UpperLeft;
            GUI.color = Color.white;
        }

        // HUD Overlay
        if (state == GameState.Playing || state == GameState.Ready)
        {
            var stg = stages[currentStageIndex];
            GUILayout.BeginArea(new Rect(20, 60, 320, 240));

            GUI.color = Color.white;
            string stageTitle = isEndless ? GetText("무한 사이버웨이", "Endless Cyberway", "エンドレス・サイバーウェイ", "Autopista Infinita")
                                          : $"{U("Sector")} {stg.id}: {GetStageName(stg)}";
            GUILayout.Label($"<size=17><b>{stageTitle}</b></size>");

            GUILayout.Space(4);
            string distLabel = GetText("거리", "Distance", "距離", "Distancia");
            string targetLabel = isEndless ? "∞" : $"{stg.targetDistance:0}m";
            GUILayout.Label($"{distLabel}: <b>{distanceTraveled:0.0}m / {targetLabel}</b>");

            string speedLabel = GetText("속도", "Speed", "速度", "Velocidad");
            GUILayout.Label($"{speedLabel}: <size=18><b>{currentSpeedKmh:0} KM/H</b></size>");

            string creditsLabel = GetText("크레딧", "Credits", "クレジット", "Créditos");
            GUILayout.Label($"{creditsLabel}: <b>🪙 {credits}</b> | {U("Score")}: <b>{score}</b> ({U("Best")}: {bestScore})");

            string shieldLabel = GetText("쉴드", "Shields", "シールド", "Escudos");
            string shieldIcons = shields > 0 ? "🛡️".Repeat(shields) : GetText("없음", "None", "なし", "Ninguno");
            GUILayout.Label($"{shieldLabel}: {shieldIcons}");

            // Nitro Bar
            string nitroLabel = GetText("니트로 부스트", "Nitro Turbo", "ニトロブースト", "Turbo Nitro");
            GUILayout.Label($"{nitroLabel}: {nitroFuel:0}%");
            Rect nitroRect = GUILayoutUtility.GetRect(200, 10);
            GUI.Box(nitroRect, "");
            GUI.color = isNitroActive ? Color.yellow : Color.cyan;
            GUI.Box(new Rect(nitroRect.x, nitroRect.y, nitroRect.width * (nitroFuel / 100f), nitroRect.height), "");
            GUI.color = Color.white;

            GUILayout.EndArea();

            // Mobile Nitro Boost Button
            Rect nitroBtnRect = new Rect(w - 120, h - 90, 100, 70);
            GUI.color = isNitroActive ? Color.yellow : new Color(0f, 0.9f, 1f, 0.85f);
            if (GUI.RepeatButton(nitroBtnRect, $"<b>🔥 {U("NITRO")}\n[SPACE]</b>"))
            {
                // touch nitro
                isNitroActive = nitroFuel > 0f;
            }
            GUI.color = Color.white;
        }

        // Modals
        if (showStageSelect) RenderStageSelectModal(w, h);
        else if (state == GameState.Ready) RenderReadyModal(w, h);
        else if (state == GameState.StageClear) RenderStageClearModal(w, h);
        else if (state == GameState.GameOver) RenderGameOverModal(w, h);
        else if (state == GameState.AllCleared) RenderAllClearedModal(w, h);
    }

    private void RenderReadyModal(int w, int h)
    {
        var stg = stages[currentStageIndex];
        float mw = 430;
        float mh = 260;
        Rect r = new Rect((w - mw) * 0.5f, (h - mh) * 0.5f, mw, mh);
        GUI.Box(r, "");

        GUILayout.BeginArea(new Rect(r.x + 20, r.y + 15, r.width - 40, r.height - 30));
        GUI.color = Color.cyan;
        GUILayout.Label($"<size=22><b>{U("SECTOR")} {stg.id}: {GetStageName(stg)}</b></size>", GUILayout.Height(32));
        GUI.color = Color.white;

        GUILayout.Space(8);
        GUILayout.Label(GetStageDesc(stg));

        GUILayout.Space(8);
        string targetText = isEndless ? GetText("목표: 최대 거리 무한 질주", "Goal: Max Distance Survival", "目標：最大距離疾走", "Meta: Supervivencia Máxima")
                                      : $"{GetText("목표 거리", "Target Goal", "目標地点", "Meta")}: <b>{stg.targetDistance:0}m</b>";
        GUILayout.Label(targetText);

        string controlInfo = GetText("조작: [A/D 또는 마우스/터치] 조향 • [스페이스] 니트로 부스트",
                                     "Controls: [A/D or Mouse/Touch] Steer • [Space] Nitro Turbo",
                                     "操作：[A/D または マウス/タッチ] 操舵 • [Space] ニトロ",
                                     "Controles: [A/D o Ratón/Táctil] Dirección • [Espacio] Nitro");
        GUILayout.Label($"<color=#aaa>{controlInfo}</color>");

        GUILayout.FlexibleSpace();
        GUI.color = Color.green;
        string startBtn = GetText("드라이브 스타트 (Drive)", "Start Driving", "発進スタート", "Iniciar Carrera");
        if (GUILayout.Button($"<b>{startBtn}</b>", GUILayout.Height(44)))
        {
            state = GameState.Playing;
            engineSource.clip = engineClip;
            engineSource.volume = 0.4f;
            engineSource.Play();
        }
        GUI.color = Color.white;

        GUILayout.EndArea();
    }

    private void RenderStageClearModal(int w, int h)
    {
        var stg = stages[currentStageIndex];
        float mw = 420;
        float mh = 260;
        Rect r = new Rect((w - mw) * 0.5f, (h - mh) * 0.5f, mw, mh);
        GUI.Box(r, "");

        GUILayout.BeginArea(new Rect(r.x + 20, r.y + 15, r.width - 40, r.height - 30));
        GUI.color = Color.yellow;
        GUILayout.Label($"<size=22><b>🎉 SECTOR {stg.id} {GetText("돌파 완료!", "SECTOR CLEARED!", "セクター突破！", "¡SECTOR SUPERADO!")}</b></size>", GUILayout.Height(32));
        GUI.color = Color.white;

        GUILayout.Space(8);
        GUILayout.Label($"{GetText("주행 거리", "Distance Traveled", "走行距離", "Distancia")}: <b>{distanceTraveled:0.0}m</b>");
        GUILayout.Label($"{GetText("획득 크레딧", "Credits Collected", "獲得クレジット", "Créditos")}: <b>🪙 +{credits}</b>");
        GUILayout.Label($"{U("Score")}: <b>{score}</b> ({U("Best")}: {bestScore})");

        GUILayout.FlexibleSpace();
        GUI.color = Color.green;
        string nextBtn = GetText("다음 섹터 진입 ▶", "Next Sector ▶", "次セクター進入 ▶", "Siguiente Sector ▶");
        if (GUILayout.Button($"<b>{nextBtn}</b>", GUILayout.Height(44)))
        {
            ResetToStage(currentStageIndex + 1);
            state = GameState.Playing;
            engineSource.clip = engineClip;
            engineSource.volume = 0.4f;
            engineSource.Play();
        }
        GUI.color = Color.white;

        GUILayout.EndArea();
    }

    private void RenderGameOverModal(int w, int h)
    {
        float mw = 420;
        float mh = 260;
        Rect r = new Rect((w - mw) * 0.5f, (h - mh) * 0.5f, mw, mh);
        GUI.Box(r, "");

        GUILayout.BeginArea(new Rect(r.x + 20, r.y + 15, r.width - 40, r.height - 30));
        GUI.color = Color.red;
        GUILayout.Label($"<size=22><b>💥 {GetText("차량 대파!", "VEHICLE CRASHED!", "車両大破！", "¡VEHÍCULO DESTRUIDO!")}</b></size>", GUILayout.Height(32));
        GUI.color = Color.white;

        GUILayout.Space(8);
        GUILayout.Label($"{GetText("최종 주행 거리", "Final Distance", "最終走行距離", "Distancia Final")}: <b>{distanceTraveled:0.0}m</b>");
        GUILayout.Label($"{U("Score")}: <b>{score}</b> ({U("Best")}: {bestScore})");

        GUILayout.FlexibleSpace();
        GUILayout.BeginHorizontal();

        GUI.color = Color.yellow;
        string retryBtn = GetText("재도전 (Retry)", "Retry Run", "リトライ", "Reintentar");
        if (GUILayout.Button($"<b>{retryBtn}</b>", GUILayout.Height(44)))
        {
            ResetToStage(currentStageIndex);
            state = GameState.Playing;
            engineSource.clip = engineClip;
            engineSource.volume = 0.4f;
            engineSource.Play();
        }

        GUI.color = Color.white;
        string menuBtn = GetText("섹터 목록", "Sectors", "セクター一覧", "Sectores");
        if (GUILayout.Button($"<b>{menuBtn}</b>", GUILayout.Height(44)))
        {
            showStageSelect = true;
        }

        GUILayout.EndHorizontal();
        GUILayout.EndArea();
    }

    private void RenderAllClearedModal(int w, int h)
    {
        float mw = 460;
        float mh = 290;
        Rect r = new Rect((w - mw) * 0.5f, (h - mh) * 0.5f, mw, mh);
        GUI.Box(r, "");

        GUILayout.BeginArea(new Rect(r.x + 20, r.y + 15, r.width - 40, r.height - 30));
        GUI.color = Color.yellow;
        GUILayout.Label($"<size=23><b>🏆 {GetText("30섹터 전 고속도로 완전 정복!", "ALL 30 SECTORS CONQUERED!", "全30セクター完全制覇！", "¡LOS 30 SECTORES SUPERADOS!")}</b></size>", GUILayout.Height(34));
        GUI.color = Color.white;

        GUILayout.Space(8);
        GUILayout.Label(GetText("축하합니다! 별빛 드레드노트까지 따돌리고 30개 섹터를 완주해 전설의 드라이버로 등극했습니다.",
                                "Incredible driving! You outran the Starlight Dreadnought and finished all 30 sectors.",
                                "おめでとうございます！星明かりのドレッドノートを振り切り、全30セクターを完走しました。",
                                "¡Conducción magistral! Dejaste atrás al Acorazado Luz Estelar y completaste los 30 sectores."));

        GUILayout.Space(8);
        GUILayout.Label($"{U("Final Score")}: <b>{score}</b> | {U("Distance")}: <b>{distanceTraveled:0.0}m</b>");

        GUILayout.FlexibleSpace();
        GUI.color = Color.green;
        string endlessBtn = GetText("무한 주행 모드 ▶", "Endless Highway Mode ▶", "無限走行モード ▶", "Modo Infinito ▶");
        if (GUILayout.Button($"<b>{endlessBtn}</b>", GUILayout.Height(44)))
        {
            isEndless = true;
            ResetToStage(0);
            state = GameState.Playing;
            engineSource.clip = engineClip;
            engineSource.volume = 0.4f;
            engineSource.Play();
        }
        GUI.color = Color.white;

        GUILayout.EndArea();
    }

    private void RenderStageSelectModal(int w, int h)
    {
        float mw = Mathf.Min(680, w - 30);
        float mh = Mathf.Min(480, h - 30);
        Rect r = new Rect((w - mw) * 0.5f, (h - mh) * 0.5f, mw, mh);
        GUI.Box(r, "");

        GUILayout.BeginArea(new Rect(r.x + 15, r.y + 15, r.width - 30, r.height - 30));
        GUILayout.BeginHorizontal();
        GUI.color = Color.cyan;
        GUILayout.Label($"<size=20><b>{GetText("섹터 선택 (30 Sectors)", "Select Sector (30 Sectors)", "セクター選択 (全30セクター)", "Seleccionar Sector (30 Sectores)")}</b></size>");
        GUI.color = Color.white;
        GUILayout.FlexibleSpace();
        if (GUILayout.Button("×", GUILayout.Width(35), GUILayout.Height(28)))
        {
            showStageSelect = false;
        }
        GUILayout.EndHorizontal();

        GUILayout.Space(10);

        // 4 columns, scrolling for all 30 sectors
        sectorSelectScroll = GUILayout.BeginScrollView(sectorSelectScroll);
        int rows = (stages.Length + 3) / 4;
        for (int row = 0; row < rows; row++)
        {
            GUILayout.BeginHorizontal();
            for (int col = 0; col < 4; col++)
            {
                int idx = row * 4 + col;
                if (idx < stages.Length)
                {
                    var stg = stages[idx];
                    GUI.color = idx == currentStageIndex ? Color.cyan : Color.white;

                    string btnText = $"<b>{U("Sector")} {stg.id}</b>\n<size=11>{GetStageName(stg)}</size>\n<size=10>{stg.targetDistance:0}m</size>";
                    if (GUILayout.Button(btnText, GUILayout.Height(85), GUILayout.Width((r.width - 74) / 4f)))
                    {
                        showStageSelect = false;
                        isEndless = false;
                        ResetToStage(idx);
                        state = GameState.Ready;
                    }
                }
            }
            GUILayout.EndHorizontal();
            GUILayout.Space(6);
        }
        GUILayout.EndScrollView();

        GUI.color = Color.white;
        GUILayout.EndArea();
    }

    private string GetText(string ko, string en, string ja, string es)
    {
        switch (lang)
        {
            case CyberLanguage.KO: return ko;
            case CyberLanguage.EN: return OiyoI18n.En(en);
            case CyberLanguage.JA: return ja;
            case CyberLanguage.ES: return es;
            default: return en;
        }
    }

    private string GetStageName(StageData s)
    {
        switch (lang)
        {
            case CyberLanguage.KO: return s.nameKo;
            case CyberLanguage.EN: return OiyoI18n.En(s.nameEn);
            case CyberLanguage.JA: return s.nameJa;
            case CyberLanguage.ES: return s.nameEs;
            default: return s.nameEn;
        }
    }

    private string GetStageDesc(StageData s)
    {
        switch (lang)
        {
            case CyberLanguage.KO: return s.descKo;
            case CyberLanguage.EN: return OiyoI18n.En(s.descEn);
            case CyberLanguage.JA: return s.descJa;
            case CyberLanguage.ES: return s.descEs;
            default: return s.descEn;
        }
    }
}
