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
    private int currentStageIndex = 0;
    private bool isEndless = false;
    private bool showStageSelect = false;

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

    // 12 Defined Stages
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
            nameKo = "섹터 6: 사이버 경찰 추격전", nameEn = "Sector 6: Police Pursuit Alert", nameJa = "セクター6：サイバー警察追走警보", nameEs = "Sector 6: Persecución Policial",
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
        var cabinMat = new Material(carBodyMat);
        cabinMat.color = new Color(0.05f, 0.15f, 0.25f);
        cabin.GetComponent<Renderer>().material = cabinMat;

        // Rear Spoiler Wing
        var spoiler = GameObject.CreatePrimitive(PrimitiveType.Cube);
        spoiler.transform.SetParent(playerCar.transform);
        spoiler.transform.localPosition = new Vector3(0, 0.65f, -1.25f);
        spoiler.transform.localScale = new Vector3(1.5f, 0.08f, 0.35f);
        spoiler.GetComponent<Renderer>().material = carBodyMat;

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

        // Taillights
        var tailL = GameObject.CreatePrimitive(PrimitiveType.Cube);
        tailL.transform.SetParent(playerCar.transform);
        tailL.transform.localPosition = new Vector3(-0.55f, 0.3f, -1.41f);
        tailL.transform.localScale = new Vector3(0.28f, 0.12f, 0.06f);
        var redMat = new Material(carBodyMat);
        redMat.color = Color.red;
        tailL.GetComponent<Renderer>().material = redMat;

        var tailR = GameObject.CreatePrimitive(PrimitiveType.Cube);
        tailR.transform.SetParent(playerCar.transform);
        tailR.transform.localPosition = new Vector3(0.55f, 0.3f, -1.41f);
        tailR.transform.localScale = new Vector3(0.28f, 0.12f, 0.06f);
        tailR.GetComponent<Renderer>().material = redMat;

        // Headlights (forward)
        var headL = GameObject.CreatePrimitive(PrimitiveType.Cube);
        headL.transform.SetParent(playerCar.transform);
        headL.transform.localPosition = new Vector3(-0.55f, 0.3f, 1.41f);
        headL.transform.localScale = new Vector3(0.28f, 0.12f, 0.06f);
        var whiteMat = new Material(carBodyMat);
        whiteMat.color = Color.white;
        headL.GetComponent<Renderer>().material = whiteMat;

        var headR = GameObject.CreatePrimitive(PrimitiveType.Cube);
        headR.transform.SetParent(playerCar.transform);
        headR.transform.localPosition = new Vector3(0.55f, 0.3f, 1.41f);
        headR.transform.localScale = new Vector3(0.28f, 0.12f, 0.06f);
        headR.GetComponent<Renderer>().material = whiteMat;

        // Shield Bubble
        shieldBubble = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        shieldBubble.transform.SetParent(playerCar.transform);
        shieldBubble.transform.localPosition = new Vector3(0, 0.35f, 0);
        shieldBubble.transform.localScale = new Vector3(2.4f, 1.6f, 3.8f);
        shieldBubble.GetComponent<Renderer>().material = shieldMat;

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
            road.GetComponent<Renderer>().material = roadMat;
            roadSegments.Add(road.transform);
        }

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

        var body2 = GameObject.CreatePrimitive(PrimitiveType.Cube);
        body2.transform.SetParent(bossJuggernaut.transform);
        body2.transform.localPosition = new Vector3(0, 0, -6.8f);
        body2.transform.localScale = new Vector3(3.0f, 2.0f, 5.8f);
        body2.GetComponent<Renderer>().material = bossMat;
    }

    void Update()
    {
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
                    ShowNearMiss("+500 NEAR MISS!");
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

        var go = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        go.transform.position = pos;
        go.transform.localScale = new Vector3(0.6f, 0.15f, 0.6f);
        go.transform.rotation = Quaternion.Euler(90, 0, 0);

        var m = new Material(pickupMat);
        if (type == 0) m.color = Color.yellow;
        else if (type == 1) m.color = Color.cyan;
        else m.color = Color.green;
        go.GetComponent<Renderer>().material = m;

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
        if (GUILayout.Button("EN", GUILayout.Width(45), GUILayout.Height(28))) lang = CyberLanguage.EN;
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
                                          : $"Sector {stg.id}: {GetStageName(stg)}";
            GUILayout.Label($"<size=17><b>{stageTitle}</b></size>");

            GUILayout.Space(4);
            string distLabel = GetText("거리", "Distance", "距離", "Distancia");
            string targetLabel = isEndless ? "∞" : $"{stg.targetDistance:0}m";
            GUILayout.Label($"{distLabel}: <b>{distanceTraveled:0.0}m / {targetLabel}</b>");

            string speedLabel = GetText("속도", "Speed", "速度", "Velocidad");
            GUILayout.Label($"{speedLabel}: <size=18><b>{currentSpeedKmh:0} KM/H</b></size>");

            string creditsLabel = GetText("크레딧", "Credits", "クレジット", "Créditos");
            GUILayout.Label($"{creditsLabel}: <b>🪙 {credits}</b> | Score: <b>{score}</b> (Best: {bestScore})");

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
            if (GUI.RepeatButton(nitroBtnRect, $"<b>🔥 NITRO\n[SPACE]</b>"))
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
        GUILayout.Label($"<size=22><b>SECTOR {stg.id}: {GetStageName(stg)}</b></size>", GUILayout.Height(32));
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
        GUILayout.Label($"Score: <b>{score}</b> (Best: {bestScore})");

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
        GUILayout.Label($"Score: <b>{score}</b> (Best: {bestScore})");

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
        GUILayout.Label($"<size=23><b>🏆 {GetText("12섹터 전 고속도로 완전 정복!", "ALL 12 SECTORS CONQUERED!", "全12セクター完全制覇！", "¡TODOS LOS SECTORES SUPERADOS!")}</b></size>", GUILayout.Height(34));
        GUI.color = Color.white;

        GUILayout.Space(8);
        GUILayout.Label(GetText("축하합니다! 300km/h 사이버 제니스를 완주하고 전설의 에이펙스 드라이버로 등극했습니다.",
                                "Incredible driving! You conquered the 300 km/h Cyber Zenith as the Apex Driver.",
                                "おめでとうございます！時速300kmサイバーゼニスを制覇し、伝説のドライバーとなりました。",
                                "¡Conducción magistral! Has conquistado el Cyber Zenith a 300 km/h como Conductor Supremo."));

        GUILayout.Space(8);
        GUILayout.Label($"Final Score: <b>{score}</b> | Distance: <b>{distanceTraveled:0.0}m</b>");

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
        GUILayout.Label($"<size=20><b>{GetText("섹터 선택 (12 Sectors)", "Select Sector (12 Sectors)", "セクター選択 (全12セクター)", "Seleccionar Sector (12 Sectores)")}</b></size>");
        GUI.color = Color.white;
        GUILayout.FlexibleSpace();
        if (GUILayout.Button("×", GUILayout.Width(35), GUILayout.Height(28)))
        {
            showStageSelect = false;
        }
        GUILayout.EndHorizontal();

        GUILayout.Space(10);

        for (int row = 0; row < 3; row++)
        {
            GUILayout.BeginHorizontal();
            for (int col = 0; col < 4; col++)
            {
                int idx = row * 4 + col;
                if (idx < stages.Length)
                {
                    var stg = stages[idx];
                    GUI.color = idx == currentStageIndex ? Color.cyan : Color.white;

                    string btnText = $"<b>Sector {stg.id}</b>\n<size=11>{GetStageName(stg)}</size>\n<size=10>{stg.targetDistance:0}m</size>";
                    if (GUILayout.Button(btnText, GUILayout.Height(85), GUILayout.Width((r.width - 50) / 4f)))
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

        GUI.color = Color.white;
        GUILayout.EndArea();
    }

    private string GetText(string ko, string en, string ja, string es)
    {
        switch (lang)
        {
            case CyberLanguage.KO: return ko;
            case CyberLanguage.EN: return en;
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
            case CyberLanguage.EN: return s.nameEn;
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
            case CyberLanguage.EN: return s.descEn;
            case CyberLanguage.JA: return s.descJa;
            case CyberLanguage.ES: return s.descEs;
            default: return s.descEn;
        }
    }
}
