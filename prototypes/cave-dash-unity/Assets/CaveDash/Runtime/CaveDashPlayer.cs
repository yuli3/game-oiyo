using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public enum CaveLanguage { KO, EN, JA, ES }

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

public class CaveDashPlayer : MonoBehaviour
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
        public float baseSpeed;
        public float caveGap;
        public float waveAmp;
        public float waveFreq;
        public bool hasWind;
        public bool hasGravityFlip;
        public bool hasMovingLasers;
        public bool hasFallingDebris;
        public bool isBoss;
        public Color ambientColor;
        public Color caveColor;
        public Color crystalColor;
    }

    public struct CaveSegment
    {
        public float x;
        public float topY;
        public float bottomY;
        public float centerY;
    }

    public struct CavePickup
    {
        public Vector3 pos;
        public int type; // 0: Coin, 1: Energy/Boost, 2: Shield, 3: Hazard Spike
        public bool collected;
        public GameObject go;
    }

    public struct LaserBarrier
    {
        public float x;
        public float minY;
        public float maxY;
        public float currentY;
        public float speed;
        public float height;
        public GameObject go;
    }

    public struct DebrisPillar
    {
        public float x;
        public float y;
        public bool falling;
        public float fallSpeed;
        public GameObject go;
    }

    // Audio clips
    private AudioSource audioSource;
    private AudioClip thrustClip;
    private AudioClip coinClip;
    private AudioClip shieldClip;
    private AudioClip warningClip;
    private AudioClip crashClip;
    private AudioClip clearClip;
    private AudioClip gravityClip;

    // Game state
    private GameState state = GameState.Ready;
    private CaveLanguage lang = CaveLanguage.KO;
    private int currentStageIndex = 0;
    private bool isEndless = false;
    private bool showStageSelect = false;

    // Ship mechanics
    private GameObject shipRoot;
    private GameObject shipHull;
    private GameObject shieldBubble;
    private Light shipHeadlight;
    private Vector3 shipPos;
    private float velocityY = 0f;
    private float shipDistance = 0f;
    private int coinsCollected = 0;
    private int score = 0;
    private int bestScore = 0;
    private int shields = 1;
    private float energy = 100f;
    private bool isThrusting = false;
    private bool gravityInverted = false;
    private float gravityFlipTimer = 0f;
    private float invulnerableTimer = 0f;
    private float stageStartDistance = 0f;

    // Boss Mechanics (Stage 10)
    private GameObject bossWyrmRoot;
    private float bossX = -15f;
    private float bossY = 0f;
    private float bossTargetY = 0f;
    private float bossChargeTimer = 0f;

    // Cavern geometry
    private List<CaveSegment> caveSegments = new List<CaveSegment>();
    private List<GameObject> caveBlockPool = new List<GameObject>();
    private List<CavePickup> pickups = new List<CavePickup>();
    private List<LaserBarrier> lasers = new List<LaserBarrier>();
    private List<DebrisPillar> debris = new List<DebrisPillar>();
    private List<ParticleSystem> particlePool = new List<ParticleSystem>();

    // Visual juice
    private Camera mainCam;
    private float camShake = 0f;
    private float targetFov = 58f;
    private Material shipMat;
    private Material caveMat;
    private Material crystalMat;
    private Material shieldMat;
    private Material laserMat;
    private Material bossMat;

    // Particle exhaust
    private ParticleSystem thrustParticles;
    private ParticleSystem sparkParticles;

    // 12 Defined Stages
    private StageData[] stages = new StageData[]
    {
        new StageData {
            id = 1,
            nameKo = "메아리 동굴 입구", nameEn = "Echo Cavern Entrance", nameJa = "残響の洞窟 入口", nameEs = "Entrada Caverna Eco",
            descKo = "완만한 곡선과 넓은 통로에서 기본 비행을 익히세요.",
            descEn = "Master basic flight through gentle curves and wide passages.",
            descJa = "緩やかな曲線と広い通路で基本飛行を習得しましょう。",
            descEs = "Domina el vuelo básico en pasajes amplios y curvas suaves.",
            targetDistance = 400f, baseSpeed = 13.5f, caveGap = 7.5f, waveAmp = 1.2f, waveFreq = 0.04f,
            ambientColor = new Color(0.1f, 0.2f, 0.35f), caveColor = new Color(0.2f, 0.3f, 0.45f), crystalColor = new Color(0.2f, 0.8f, 1f)
        },
        new StageData {
            id = 2,
            nameKo = "종유석 미로", nameEn = "Stalactite Maze", nameJa = "鍾乳石の迷宮", nameEs = "Laberinto de Estalactitas",
            descKo = "날카롭게 솟아오른 종유석과 석순을 피해 코인을 모으세요.",
            descEn = "Dodge sharp stalactites and stalagmites while collecting coins.",
            descJa = "鋭い鍾乳石と石筍を回避しながらコインを集めましょう。",
            descEs = "Esquiva estalactitas afiladas y estalagmitas mientras recoges monedas.",
            targetDistance = 550f, baseSpeed = 15.0f, caveGap = 6.6f, waveAmp = 1.8f, waveFreq = 0.05f,
            ambientColor = new Color(0.15f, 0.18f, 0.3f), caveColor = new Color(0.35f, 0.32f, 0.45f), crystalColor = new Color(0.3f, 1f, 0.6f)
        },
        new StageData {
            id = 3,
            nameKo = "발광 균류 동굴", nameEn = "Bioluminescent Grotto", nameJa = "発光キノコの洞穴", nameEs = "Gruta Bioluminiscente",
            descKo = "신비로운 네온 버섯과 크리스탈이 어둠을 밝힙니다.",
            descEn = "Mystic neon mushrooms and glowing crystals light the dark abyss.",
            descJa = "神秘的なネオンキノコと結晶が闇を照らします。",
            descEs = "Hongos de neón y cristales brillantes iluminan el abismo oscuro.",
            targetDistance = 720f, baseSpeed = 16.5f, caveGap = 6.2f, waveAmp = 2.0f, waveFreq = 0.055f,
            ambientColor = new Color(0.12f, 0.28f, 0.25f), caveColor = new Color(0.2f, 0.45f, 0.4f), crystalColor = new Color(0.2f, 1f, 0.8f)
        },
        new StageData {
            id = 4,
            nameKo = "마그마 분출구", nameEn = "Magma Vent Rapids", nameJa = "マグマ噴出の急流", nameEs = "Rápidos de Magma",
            descKo = "뜨거운 화염 기둥과 상승 열기류를 조심하세요!",
            descEn = "Watch out for blazing thermal plumes and rising volcanic updrafts!",
            descJa = "熱い火炎柱と上昇気流に注意してください！",
            descEs = "¡Cuidado con las columnas de fuego y las corrientes térmicas!",
            targetDistance = 900f, baseSpeed = 17.5f, caveGap = 5.8f, waveAmp = 2.2f, waveFreq = 0.06f,
            ambientColor = new Color(0.35f, 0.12f, 0.1f), caveColor = new Color(0.5f, 0.2f, 0.15f), crystalColor = new Color(1f, 0.5f, 0.1f)
        },
        new StageData {
            id = 5,
            nameKo = "크리스탈 협곡", nameEn = "Crystal Crevasse", nameJa = "水晶の狭隘峡谷", nameEs = "Grieta de Cristal",
            descKo = "극도로 좁은 석영 틈새를 면도날처럼 날카롭게 통과하세요.",
            descEn = "Thread razor-thin passages between sparkling quartz needles.",
            descJa = "極めて狭い水晶の隙間をミリ単位で通り抜けましょう。",
            descEs = "Cruza pasajes ultrafinos entre brillantes agujas de cuarzo.",
            targetDistance = 1100f, baseSpeed = 18.5f, caveGap = 5.3f, waveAmp = 2.4f, waveFreq = 0.065f,
            ambientColor = new Color(0.25f, 0.1f, 0.35f), caveColor = new Color(0.4f, 0.2f, 0.55f), crystalColor = new Color(0.9f, 0.4f, 1f)
        },
        new StageData {
            id = 6,
            nameKo = "강풍 터널", nameEn = "Turbulent Wind Tunnel", nameJa = "強風乱流トンネル", nameEs = "Túnel de Viento Turbulento",
            descKo = "불규칙한 돌풍 기류가 비행선의 고도를 뒤흔듭니다.",
            descEn = "Erratic subterranean gale currents push and buffet your ship.",
            descJa = "不規則な突風気流が機体の高度を大きく揺さぶります。",
            descEs = "Corrientes de viento subterráneas azotan tu nave.",
            targetDistance = 1300f, baseSpeed = 19.5f, caveGap = 5.5f, waveAmp = 2.6f, waveFreq = 0.07f, hasWind = true,
            ambientColor = new Color(0.1f, 0.3f, 0.35f), caveColor = new Color(0.2f, 0.4f, 0.45f), crystalColor = new Color(0.4f, 1f, 0.9f)
        },
        new StageData {
            id = 7,
            nameKo = "중력 역전 지대", nameEn = "Gravity Well Anomaly", nameJa = "重力反転の異常地帯", nameEs = "Anomalía de Gravedad",
            descKo = "경고: 중력이 주기적으로 천장 방향으로 반전됩니다!",
            descEn = "Warning: Periodic gravitational anomalies invert gravity to the ceiling!",
            descJa = "警告：重力が周期的に天井方向へ反転します！",
            descEs = "¡Advertencia: La gravedad se invierte periódicamente hacia el techo!",
            targetDistance = 1550f, baseSpeed = 20.5f, caveGap = 5.2f, waveAmp = 2.8f, waveFreq = 0.075f, hasGravityFlip = true,
            ambientColor = new Color(0.3f, 0.05f, 0.35f), caveColor = new Color(0.45f, 0.1f, 0.5f), crystalColor = new Color(1f, 0.2f, 0.8f)
        },
        new StageData {
            id = 8,
            nameKo = "보호막과 레이저 요새", nameEn = "Laser Barrier Fortress", nameJa = "レーザー防壁の要塞", nameEs = "Fortaleza de Barreras Láser",
            descKo = "상하로 순찰하는 레이저 트랩을 타이밍 맞춰 돌파하세요.",
            descEn = "Time your thrust perfectly through oscillating vertical laser grids.",
            descJa = "上下に巡回するレーザートラップをタイミング良く突破しましょう。",
            descEs = "Atraviesa barreras láser oscilantes con precisión milimétrica.",
            targetDistance = 1800f, baseSpeed = 21.5f, caveGap = 5.4f, waveAmp = 3.0f, waveFreq = 0.08f, hasMovingLasers = true,
            ambientColor = new Color(0.08f, 0.18f, 0.4f), caveColor = new Color(0.2f, 0.3f, 0.6f), crystalColor = new Color(0.2f, 0.6f, 1f)
        },
        new StageData {
            id = 9,
            nameKo = "지하 고대 유적", nameEn = "Subterranean Ruins", nameJa = "古代の地下遺跡", nameEs = "Ruinas Subterráneas",
            descKo = "접근 시 무너져 내리는 고대 석조 기둥 잔해를 피하세요.",
            descEn = "Evade crumbling stone arches that crash down as you approach.",
            descJa = "接近すると崩れ落ちる古代石柱の瓦礫を回避しましょう。",
            descEs = "Evita los arcos de piedra que se derrumban al acercarte.",
            targetDistance = 2100f, baseSpeed = 22.5f, caveGap = 5.0f, waveAmp = 3.2f, waveFreq = 0.085f, hasFallingDebris = true,
            ambientColor = new Color(0.35f, 0.3f, 0.15f), caveColor = new Color(0.55f, 0.45f, 0.25f), crystalColor = new Color(1f, 0.85f, 0.2f)
        },
        new StageData {
            id = 10,
            nameKo = "심연의 거대 지룡 보스전", nameEn = "Boss: Wyrm of the Deep", nameJa = "ボス：深淵の地龍戦", nameEs = "Jefe: Gusano Abisal",
            descKo = "후방에서 맹렬히 추격해오는 고대 거대 지룡의 공격을 피하세요!",
            descEn = "Survive the terrifying assault of the ancient subterranean mechanical Wyrm!",
            descJa = "後方から激しく追撃してくる古代の巨大地龍を振り切りましょう！",
            descEs = "¡Sobrevive al asalto del titánico Gusano Mecánico Abisal!",
            targetDistance = 2450f, baseSpeed = 24.0f, caveGap = 6.2f, waveAmp = 3.4f, waveFreq = 0.09f, isBoss = true,
            ambientColor = new Color(0.45f, 0.08f, 0.08f), caveColor = new Color(0.6f, 0.15f, 0.12f), crystalColor = new Color(1f, 0.2f, 0.2f)
        },
        new StageData {
            id = 11,
            nameKo = "하이퍼 심연 블리츠", nameEn = "Hyper Abyss Blitz", nameJa = "ハイパー深淵ブリッツ", nameEs = "Asalto Hiper Abisal",
            descKo = "시속 100km 초고속으로 휘몰아치는 심연 터널 릴레이!",
            descEn = "Supersonic 100km/h sprint through winding subterranean wormholes!",
            descJa = "時速100km超高速で疾走する深淵トンネルリレー！",
            descEs = "¡Carrera supersónica a más de 100 km/h por túneles sinuosos!",
            targetDistance = 2850f, baseSpeed = 27.0f, caveGap = 4.8f, waveAmp = 3.6f, waveFreq = 0.095f, hasWind = true, hasMovingLasers = true,
            ambientColor = new Color(0.2f, 0.05f, 0.4f), caveColor = new Color(0.4f, 0.1f, 0.65f), crystalColor = new Color(0.9f, 0.3f, 1f)
        },
        new StageData {
            id = 12,
            nameKo = "지구의 중심 피날레", nameEn = "Core of the Earth", nameJa = "地球の中心 フィナーレ", nameEs = "Núcleo Terrestre Final",
            descKo = "지구 중심 핵의 마그마와 중력 이상을 돌파하는 12단계 궁극의 시험!",
            descEn = "The ultimate climax through pulsating magma core and shifting vortexes!",
            descJa = "地球中心核のマグマと重力異常を突破する最終試練！",
            descEs = "¡El desafío supremo a través del núcleo ardiente de la Tierra!",
            targetDistance = 3300f, baseSpeed = 29.0f, caveGap = 4.6f, waveAmp = 3.8f, waveFreq = 0.1f, hasGravityFlip = true, hasFallingDebris = true, hasMovingLasers = true,
            ambientColor = new Color(0.5f, 0.2f, 0.05f), caveColor = new Color(0.7f, 0.3f, 0.1f), crystalColor = new Color(1f, 0.8f, 0.3f)
        }
    };

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
        mainCam.backgroundColor = new Color(0.02f, 0.03f, 0.06f);
        mainCam.clearFlags = CameraClearFlags.SolidColor;
        mainCam.fieldOfView = 58f;

        audioSource = gameObject.AddComponent<AudioSource>();
        audioSource.playOnAwake = false;

        GenerateAudioClips();
        CreateMaterials();
        CreateShip();
        CreateBossWyrm();
        CreateParticleSystems();
        InitCavePool();

        bestScore = PlayerPrefs.GetInt("CaveDash_BestScore", 0);
        ResetToStage(0);
    }

    private void CreateMaterials()
    {
        var shader = Shader.Find("Mobile/Diffuse");
        if (shader == null) shader = Shader.Find("Diffuse");
        if (shader == null) shader = Shader.Find("Standard");

        shipMat = new Material(shader);
        shipMat.color = new Color(0.9f, 0.95f, 1f);

        caveMat = new Material(shader);
        caveMat.color = stages[0].caveColor;

        crystalMat = new Material(shader);
        crystalMat.color = stages[0].crystalColor;

        shieldMat = new Material(shader);
        shieldMat.color = new Color(0.1f, 0.8f, 1f, 0.4f);

        laserMat = new Material(shader);
        laserMat.color = new Color(1f, 0.1f, 0.2f);

        bossMat = new Material(shader);
        bossMat.color = new Color(0.85f, 0.15f, 0.1f);
    }

    private void CreateShip()
    {
        shipRoot = new GameObject("CaveShip");
        shipPos = new Vector3(0f, 0f, 0f);
        shipRoot.transform.position = shipPos;

        // Fuselage (Cone/Wedge)
        shipHull = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        shipHull.name = "Fuselage";
        shipHull.transform.SetParent(shipRoot.transform);
        shipHull.transform.localPosition = Vector3.zero;
        shipHull.transform.localRotation = Quaternion.Euler(0, 0, -90);
        shipHull.transform.localScale = new Vector3(0.42f, 0.85f, 0.42f);
        shipHull.GetComponent<Renderer>().material = shipMat;

        // Nose Cone
        var nose = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        nose.transform.SetParent(shipRoot.transform);
        nose.transform.localPosition = new Vector3(0.85f, 0, 0);
        nose.transform.localScale = new Vector3(0.5f, 0.38f, 0.38f);
        var noseMat = new Material(shipMat);
        noseMat.color = new Color(0.1f, 0.8f, 1f);
        nose.GetComponent<Renderer>().material = noseMat;

        // Wings
        var leftWing = GameObject.CreatePrimitive(PrimitiveType.Cube);
        leftWing.transform.SetParent(shipRoot.transform);
        leftWing.transform.localPosition = new Vector3(-0.2f, 0, 0.65f);
        leftWing.transform.localRotation = Quaternion.Euler(0, 25, 0);
        leftWing.transform.localScale = new Vector3(0.6f, 0.08f, 0.85f);
        leftWing.GetComponent<Renderer>().material = noseMat;

        var rightWing = GameObject.CreatePrimitive(PrimitiveType.Cube);
        rightWing.transform.SetParent(shipRoot.transform);
        rightWing.transform.localPosition = new Vector3(-0.2f, 0, -0.65f);
        rightWing.transform.localRotation = Quaternion.Euler(0, -25, 0);
        rightWing.transform.localScale = new Vector3(0.6f, 0.08f, 0.85f);
        rightWing.GetComponent<Renderer>().material = noseMat;

        // Thruster Engine Core
        var thruster = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        thruster.transform.SetParent(shipRoot.transform);
        thruster.transform.localPosition = new Vector3(-0.85f, 0, 0);
        thruster.transform.localRotation = Quaternion.Euler(0, 0, 90);
        thruster.transform.localScale = new Vector3(0.32f, 0.22f, 0.32f);
        var thrusterMat = new Material(shipMat);
        thrusterMat.color = new Color(1f, 0.5f, 0.1f);
        thruster.GetComponent<Renderer>().material = thrusterMat;

        // Shield Bubble
        shieldBubble = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        shieldBubble.name = "ShieldBubble";
        shieldBubble.transform.SetParent(shipRoot.transform);
        shieldBubble.transform.localPosition = Vector3.zero;
        shieldBubble.transform.localScale = new Vector3(1.75f, 1.75f, 1.75f);
        shieldBubble.GetComponent<Renderer>().material = shieldMat;
        shieldBubble.SetActive(true);

        // Headlight
        var lightGo = new GameObject("ShipHeadlight");
        lightGo.transform.SetParent(shipRoot.transform);
        lightGo.transform.localPosition = new Vector3(0.5f, 0.1f, 0);
        shipHeadlight = lightGo.AddComponent<Light>();
        shipHeadlight.type = LightType.Spot;
        shipHeadlight.range = 22f;
        shipHeadlight.spotAngle = 65f;
        shipHeadlight.intensity = 2.4f;
        shipHeadlight.color = new Color(0.7f, 0.95f, 1f);
        lightGo.transform.localRotation = Quaternion.Euler(0, 90, 0);

        // Sun Directional Light
        var sunGo = new GameObject("DirectionalLight");
        var sun = sunGo.AddComponent<Light>();
        sun.type = LightType.Directional;
        sun.intensity = 0.55f;
        sun.color = new Color(0.6f, 0.7f, 0.9f);
        sunGo.transform.rotation = Quaternion.Euler(35, 45, 0);
    }

    private void CreateBossWyrm()
    {
        bossWyrmRoot = new GameObject("BossWyrm");
        bossWyrmRoot.SetActive(false);

        // Head
        var head = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        head.transform.SetParent(bossWyrmRoot.transform);
        head.transform.localPosition = Vector3.zero;
        head.transform.localScale = new Vector3(2.4f, 2.0f, 2.0f);
        head.GetComponent<Renderer>().material = bossMat;

        // Glowing Eyes
        var eyeMat = new Material(bossMat);
        eyeMat.color = Color.yellow;

        var eyeL = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        eyeL.transform.SetParent(head.transform);
        eyeL.transform.localPosition = new Vector3(0.4f, 0.25f, 0.35f);
        eyeL.transform.localScale = new Vector3(0.25f, 0.25f, 0.25f);
        eyeL.GetComponent<Renderer>().material = eyeMat;

        var eyeR = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        eyeR.transform.SetParent(head.transform);
        eyeR.transform.localPosition = new Vector3(0.4f, 0.25f, -0.35f);
        eyeR.transform.localScale = new Vector3(0.25f, 0.25f, 0.25f);
        eyeR.GetComponent<Renderer>().material = eyeMat;

        // Jaws
        var jaw = GameObject.CreatePrimitive(PrimitiveType.Cube);
        jaw.transform.SetParent(head.transform);
        jaw.transform.localPosition = new Vector3(0.45f, -0.2f, 0);
        jaw.transform.localScale = new Vector3(0.5f, 0.3f, 0.6f);
        jaw.GetComponent<Renderer>().material = bossMat;

        // 3 Body Segments
        for (int i = 1; i <= 3; i++)
        {
            var seg = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            seg.transform.SetParent(bossWyrmRoot.transform);
            seg.transform.localPosition = new Vector3(-i * 1.6f, 0, 0);
            seg.transform.localScale = new Vector3(2.1f - i * 0.3f, 1.8f - i * 0.25f, 1.8f - i * 0.25f);
            seg.GetComponent<Renderer>().material = bossMat;
        }
    }

    private void CreateParticleSystems()
    {
        // Thruster sparks
        var pGo = new GameObject("ThrusterParticles");
        pGo.transform.SetParent(shipRoot.transform);
        pGo.transform.localPosition = new Vector3(-0.95f, 0, 0);
        pGo.transform.localRotation = Quaternion.Euler(0, -90, 0);

        thrustParticles = pGo.AddComponent<ParticleSystem>();
        var main = thrustParticles.main;
        main.startSize = 0.2f;
        main.startLifetime = 0.35f;
        main.startSpeed = 8f;
        main.startColor = new Color(0.2f, 0.8f, 1f, 0.8f);
        main.simulationSpace = ParticleSystemSimulationSpace.World;

        var emission = thrustParticles.emission;
        emission.rateOverTime = 45f;
        emission.enabled = false;

        // Crash sparks
        var sGo = new GameObject("SparkParticles");
        sparkParticles = sGo.AddComponent<ParticleSystem>();
        var sm = sparkParticles.main;
        sm.startSize = 0.3f;
        sm.startLifetime = 0.5f;
        sm.startSpeed = 12f;
        sm.startColor = new Color(1f, 0.7f, 0.2f);
        sm.simulationSpace = ParticleSystemSimulationSpace.World;
        var se = sparkParticles.emission;
        se.rateOverTime = 0f;
    }

    private void InitCavePool()
    {
        for (int i = 0; i < 90; i++)
        {
            var topBlock = GameObject.CreatePrimitive(PrimitiveType.Cube);
            topBlock.name = "CaveTop_" + i;
            topBlock.GetComponent<Renderer>().material = caveMat;
            topBlock.SetActive(false);
            caveBlockPool.Add(topBlock);

            var btmBlock = GameObject.CreatePrimitive(PrimitiveType.Cube);
            btmBlock.name = "CaveBtm_" + i;
            btmBlock.GetComponent<Renderer>().material = caveMat;
            btmBlock.SetActive(false);
            caveBlockPool.Add(btmBlock);
        }
    }

    private void ResetToStage(int index)
    {
        currentStageIndex = Mathf.Clamp(index, 0, stages.Length - 1);
        var stg = stages[currentStageIndex];

        caveMat.color = stg.caveColor;
        crystalMat.color = stg.crystalColor;
        RenderSettings.ambientLight = stg.ambientColor;

        shipPos = new Vector3(0f, 0f, 0f);
        velocityY = 0f;
        shipDistance = 0f;
        stageStartDistance = 0f;
        shields = 1;
        energy = 100f;
        gravityInverted = false;
        gravityFlipTimer = 0f;
        invulnerableTimer = 0f;
        camShake = 0f;

        // Clear existing pickups & obstacles
        foreach (var p in pickups) if (p.go != null) Destroy(p.go);
        pickups.Clear();
        foreach (var l in lasers) if (l.go != null) Destroy(l.go);
        lasers.Clear();
        foreach (var d in debris) if (d.go != null) Destroy(d.go);
        debris.Clear();

        caveSegments.Clear();
        for (int i = 0; i < caveBlockPool.Count; i++) caveBlockPool[i].SetActive(false);

        // Pre-generate initial cavern corridor
        float genX = -10f;
        while (genX < 75f)
        {
            AddCaveSegment(genX);
            genX += 1.5f;
        }

        if (stg.isBoss)
        {
            bossWyrmRoot.SetActive(true);
            bossX = -18f;
            bossY = 0f;
            bossWyrmRoot.transform.position = new Vector3(bossX, bossY, 0);
        }
        else
        {
            bossWyrmRoot.SetActive(false);
        }

        state = GameState.Ready;
        UpdateVisuals();
    }

    private void AddCaveSegment(float x)
    {
        var stg = stages[currentStageIndex];
        float centerY = Mathf.Sin(x * stg.waveFreq) * stg.waveAmp + Mathf.Cos(x * 0.025f) * (stg.waveAmp * 0.6f);
        float gap = stg.caveGap;

        // In later stages or high distance, narrow the gap slightly
        if (isEndless)
        {
            gap = Mathf.Max(3.8f, 7.5f - (shipDistance / 800f));
        }

        float topY = centerY + gap * 0.5f;
        float bottomY = centerY - gap * 0.5f;

        caveSegments.Add(new CaveSegment { x = x, topY = topY, bottomY = bottomY, centerY = centerY });

        // Spawn occasional pickups
        if (x > 15f && UnityEngine.Random.value < 0.28f)
        {
            SpawnPickup(x, UnityEngine.Random.Range(bottomY + 1.2f, topY - 1.2f));
        }

        // Spawn dynamic stage obstacles
        if (stg.hasMovingLasers && x > 25f && UnityEngine.Random.value < 0.12f)
        {
            SpawnLaser(x, bottomY + 0.5f, topY - 0.5f);
        }

        if (stg.hasFallingDebris && x > 30f && UnityEngine.Random.value < 0.1f)
        {
            SpawnDebris(x, topY);
        }
    }

    private void SpawnPickup(float x, float y)
    {
        float roll = UnityEngine.Random.value;
        int type = 0; // 0: Coin, 1: Energy, 2: Shield
        if (roll < 0.72f) type = 0;
        else if (roll < 0.90f) type = 1;
        else type = 2;

        var go = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        go.transform.position = new Vector3(x, y, 0);
        var r = go.GetComponent<Renderer>();

        if (type == 0)
        {
            go.transform.localScale = new Vector3(0.55f, 0.55f, 0.15f);
            var m = new Material(crystalMat);
            m.color = new Color(1f, 0.85f, 0.1f);
            r.material = m;
        }
        else if (type == 1)
        {
            go.transform.localScale = new Vector3(0.6f, 0.6f, 0.6f);
            var m = new Material(crystalMat);
            m.color = new Color(0.2f, 1f, 0.4f);
            r.material = m;
        }
        else
        {
            go.transform.localScale = new Vector3(0.7f, 0.7f, 0.7f);
            var m = new Material(shieldMat);
            m.color = new Color(0.1f, 0.7f, 1f);
            r.material = m;
        }

        pickups.Add(new CavePickup { pos = new Vector3(x, y, 0), type = type, collected = false, go = go });
    }

    private void SpawnLaser(float x, float minY, float maxY)
    {
        var go = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        go.transform.position = new Vector3(x, (minY + maxY) * 0.5f, 0);
        go.transform.localScale = new Vector3(0.15f, (maxY - minY) * 0.4f, 0.15f);
        go.GetComponent<Renderer>().material = laserMat;

        lasers.Add(new LaserBarrier {
            x = x, minY = minY, maxY = maxY, currentY = (minY + maxY) * 0.5f,
            speed = UnityEngine.Random.Range(2.5f, 4.5f) * (UnityEngine.Random.value > 0.5f ? 1 : -1),
            height = (maxY - minY) * 0.45f, go = go
        });
    }

    private void SpawnDebris(float x, float topY)
    {
        var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
        go.transform.position = new Vector3(x, topY, 0);
        go.transform.localScale = new Vector3(0.8f, 2.2f, 0.8f);
        go.GetComponent<Renderer>().material = caveMat;

        debris.Add(new DebrisPillar { x = x, y = topY, falling = false, fallSpeed = 0f, go = go });
    }

    void Update()
    {
        float dt = Time.deltaTime;

        // Global inputs
        if (Input.GetKeyDown(KeyCode.Escape))
        {
            showStageSelect = !showStageSelect;
        }

        // Camera shake decay
        if (camShake > 0)
        {
            camShake = Mathf.Max(0, camShake - dt * 2.5f);
        }

        if (state == GameState.Ready)
        {
            if (Input.GetKeyDown(KeyCode.Space) || Input.GetMouseButtonDown(0))
            {
                state = GameState.Playing;
            }
        }
        else if (state == GameState.Playing)
        {
            UpdateFlight(dt);
            UpdateCavern(dt);
            UpdateObstacles(dt);
            CheckCollisions();
            CheckStageProgression();
        }

        UpdateVisuals();
    }

    private void UpdateFlight(float dt)
    {
        var stg = stages[currentStageIndex];

        // Controls: Space, Left Click, or Touch
        bool thrustInput = Input.GetKey(KeyCode.Space) || Input.GetMouseButton(0);
        if (Input.touchCount > 0) thrustInput = true;

        isThrusting = thrustInput && energy > 0f;

        // Gravity & Thrust Forces
        float gravity = gravityInverted ? 28f : -28f;
        float thrust = gravityInverted ? -58f : 58f;

        // Periodic gravity flip in stages with gravity anomaly
        if (stg.hasGravityFlip)
        {
            gravityFlipTimer += dt;
            if (gravityFlipTimer > 6.0f)
            {
                gravityFlipTimer = 0f;
                gravityInverted = !gravityInverted;
                PlaySound(gravityClip, 0.7f);
                camShake = 0.4f;
            }
        }

        // Wind turbulence
        float windForce = 0f;
        if (stg.hasWind)
        {
            windForce = Mathf.Sin(Time.time * 3.5f + shipPos.x * 0.1f) * 8.5f;
        }

        if (isThrusting)
        {
            velocityY += (thrust + windForce) * dt;
            energy = Mathf.Max(0f, energy - 15f * dt);
            if (!audioSource.isPlaying && thrustClip != null)
            {
                audioSource.clip = thrustClip;
                audioSource.loop = true;
                audioSource.volume = 0.4f;
                audioSource.Play();
            }
        }
        else
        {
            velocityY += (gravity + windForce) * dt;
            energy = Mathf.Min(100f, energy + 25f * dt);
            if (audioSource.isPlaying && audioSource.clip == thrustClip)
            {
                audioSource.Stop();
            }
        }

        velocityY = Mathf.Clamp(velocityY, -18f, 18f);
        shipPos.y += velocityY * dt;

        // Forward speed
        float forwardSpeed = stg.baseSpeed;
        if (Input.GetKey(KeyCode.LeftShift) && energy > 20f)
        {
            forwardSpeed *= 1.35f;
            energy -= 20f * dt;
        }
        shipPos.x += forwardSpeed * dt;
        shipDistance = shipPos.x;

        score = (int)(shipDistance * 10) + coinsCollected * 50;
        if (score > bestScore)
        {
            bestScore = score;
            PlayerPrefs.SetInt("CaveDash_BestScore", bestScore);
        }

        if (invulnerableTimer > 0f) invulnerableTimer -= dt;
    }

    private void UpdateCavern(float dt)
    {
        // Maintain continuous cavern corridor ahead of ship
        float leadDistance = shipPos.x + 85f;
        float lastX = caveSegments.Count > 0 ? caveSegments[caveSegments.Count - 1].x : shipPos.x - 10f;

        while (lastX < leadDistance)
        {
            lastX += 1.5f;
            AddCaveSegment(lastX);
        }

        // Clean up old segments behind ship
        while (caveSegments.Count > 0 && caveSegments[0].x < shipPos.x - 30f)
        {
            caveSegments.RemoveAt(0);
        }

        // Clean up passed pickups
        for (int i = pickups.Count - 1; i >= 0; i--)
        {
            if (pickups[i].pos.x < shipPos.x - 20f)
            {
                if (pickups[i].go != null) Destroy(pickups[i].go);
                pickups.RemoveAt(i);
            }
        }
    }

    private void UpdateObstacles(float dt)
    {
        var stg = stages[currentStageIndex];

        // Boss Wyrm behavior (Stage 10)
        if (stg.isBoss && bossWyrmRoot != null && bossWyrmRoot.activeSelf)
        {
            bossChargeTimer += dt;
            // Target Y tracks ship with delay
            bossTargetY = Mathf.Lerp(bossTargetY, shipPos.y, dt * 2.5f);
            bossY = Mathf.Lerp(bossY, bossTargetY, dt * 3.0f);

            // Wyrm chases 8m behind ship, occasionally lunges forward
            float targetBossX = shipPos.x - 7.5f;
            if (Mathf.Sin(bossChargeTimer * 1.5f) > 0.6f)
            {
                targetBossX = shipPos.x - 3.0f; // lunging attack!
            }

            bossX = Mathf.Lerp(bossX, targetBossX, dt * 4.0f);
            bossWyrmRoot.transform.position = new Vector3(bossX, bossY, 0);

            // Boss collision with ship
            if (Vector3.Distance(bossWyrmRoot.transform.position, shipPos) < 1.8f)
            {
                HitHazard();
            }
        }

        // Laser barriers
        for (int i = 0; i < lasers.Count; i++)
        {
            var l = lasers[i];
            l.currentY += l.speed * dt;
            if (l.currentY > l.maxY - l.height * 0.5f || l.currentY < l.minY + l.height * 0.5f)
            {
                l.speed = -l.speed;
            }
            if (l.go != null)
            {
                l.go.transform.position = new Vector3(l.x, l.currentY, 0);
            }
            lasers[i] = l;
        }

        // Debris pillars
        for (int i = 0; i < debris.Count; i++)
        {
            var d = debris[i];
            if (!d.falling && d.x - shipPos.x < 18f)
            {
                d.falling = true;
            }
            if (d.falling)
            {
                d.fallSpeed += 30f * dt;
                d.y -= d.fallSpeed * dt;
                if (d.go != null)
                {
                    d.go.transform.position = new Vector3(d.x, d.y, 0);
                }
            }
            debris[i] = d;
        }
    }

    private void CheckCollisions()
    {
        if (invulnerableTimer > 0f) return;

        float shipRadius = 0.38f;

        // Zero-Collider ceiling & floor math check
        CaveSegment currentSeg = GetSegmentAt(shipPos.x);

        if (shipPos.y + shipRadius >= currentSeg.topY || shipPos.y - shipRadius <= currentSeg.bottomY)
        {
            HitHazard();
            return;
        }

        // Pickups check
        for (int i = 0; i < pickups.Count; i++)
        {
            var p = pickups[i];
            if (!p.collected && Vector3.Distance(p.pos, shipPos) < 1.1f)
            {
                p.collected = true;
                if (p.go != null) Destroy(p.go);

                if (p.type == 0) // Coin
                {
                    coinsCollected++;
                    PlaySound(coinClip, 0.6f);
                }
                else if (p.type == 1) // Energy
                {
                    energy = Mathf.Min(100f, energy + 45f);
                    PlaySound(shieldClip, 0.5f);
                }
                else if (p.type == 2) // Shield
                {
                    shields = Mathf.Min(3, shields + 1);
                    PlaySound(shieldClip, 0.8f);
                }

                pickups[i] = p;
            }
        }

        // Lasers collision
        for (int i = 0; i < lasers.Count; i++)
        {
            var l = lasers[i];
            if (Mathf.Abs(l.x - shipPos.x) < 0.65f && Mathf.Abs(l.currentY - shipPos.y) < l.height * 0.5f + shipRadius)
            {
                HitHazard();
                return;
            }
        }

        // Debris collision
        for (int i = 0; i < debris.Count; i++)
        {
            var d = debris[i];
            if (Mathf.Abs(d.x - shipPos.x) < 0.8f && Mathf.Abs(d.y - shipPos.y) < 1.3f)
            {
                HitHazard();
                return;
            }
        }
    }

    private void HitHazard()
    {
        if (shields > 0)
        {
            shields--;
            invulnerableTimer = 1.6f;
            camShake = 0.6f;
            PlaySound(shieldClip, 0.9f);
            sparkParticles.transform.position = shipPos;
            sparkParticles.Emit(25);
            return;
        }

        // Fatal crash
        state = GameState.GameOver;
        camShake = 1.0f;
        PlaySound(crashClip, 1.0f);
        sparkParticles.transform.position = shipPos;
        sparkParticles.Emit(50);
        if (audioSource.isPlaying && audioSource.clip == thrustClip)
        {
            audioSource.Stop();
        }
    }

    private void CheckStageProgression()
    {
        if (isEndless) return;

        var stg = stages[currentStageIndex];
        if (shipDistance >= stg.targetDistance)
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

    private CaveSegment GetSegmentAt(float x)
    {
        for (int i = 0; i < caveSegments.Count - 1; i++)
        {
            if (x >= caveSegments[i].x && x <= caveSegments[i + 1].x)
            {
                float t = (x - caveSegments[i].x) / (caveSegments[i + 1].x - caveSegments[i].x);
                return new CaveSegment
                {
                    x = x,
                    topY = Mathf.Lerp(caveSegments[i].topY, caveSegments[i + 1].topY, t),
                    bottomY = Mathf.Lerp(caveSegments[i].bottomY, caveSegments[i + 1].bottomY, t),
                    centerY = Mathf.Lerp(caveSegments[i].centerY, caveSegments[i + 1].centerY, t)
                };
            }
        }
        if (caveSegments.Count > 0) return caveSegments[caveSegments.Count - 1];
        return new CaveSegment { x = x, topY = 4f, bottomY = -4f, centerY = 0f };
    }

    private void UpdateVisuals()
    {
        // Ship Position & Pitch Rotation
        shipRoot.transform.position = shipPos;
        float targetPitch = Mathf.Clamp(velocityY * 3.8f, -42f, 42f);
        shipRoot.transform.rotation = Quaternion.Euler(0, 0, targetPitch);

        // Shield bubble visibility & flicker
        if (shieldBubble != null)
        {
            shieldBubble.SetActive(shields > 0);
            if (shields > 0)
            {
                float scale = 1.75f + Mathf.Sin(Time.time * 6f) * 0.1f;
                shieldBubble.transform.localScale = new Vector3(scale, scale, scale);
            }
        }

        // Particle emission toggle
        var emission = thrustParticles.emission;
        emission.enabled = isThrusting;

        // Camera Follow
        Vector3 targetCamPos = new Vector3(shipPos.x + 4.2f, shipPos.y * 0.45f + 0.5f, -9.5f);
        if (camShake > 0)
        {
            targetCamPos += new Vector3(UnityEngine.Random.Range(-camShake, camShake), UnityEngine.Random.Range(-camShake, camShake), 0);
        }
        mainCam.transform.position = Vector3.Lerp(mainCam.transform.position, targetCamPos, Time.deltaTime * 6.5f);

        // Render cavern blocks from pool
        int blockIdx = 0;
        for (int i = 0; i < caveSegments.Count; i += 2)
        {
            if (blockIdx >= caveBlockPool.Count - 1) break;

            var seg = caveSegments[i];
            if (seg.x < shipPos.x - 15f || seg.x > shipPos.x + 65f) continue;

            // Top Stalactite
            var topGo = caveBlockPool[blockIdx++];
            topGo.SetActive(true);
            float topHeight = 12f;
            topGo.transform.position = new Vector3(seg.x, seg.topY + topHeight * 0.5f, 0);
            topGo.transform.localScale = new Vector3(2.8f, topHeight, 3.5f);

            // Bottom Stalagmite
            var btmGo = caveBlockPool[blockIdx++];
            btmGo.SetActive(true);
            float btmHeight = 12f;
            btmGo.transform.position = new Vector3(seg.x, seg.bottomY - btmHeight * 0.5f, 0);
            btmGo.transform.localScale = new Vector3(2.8f, btmHeight, 3.5f);
        }

        // Deactivate unused blocks
        for (int i = blockIdx; i < caveBlockPool.Count; i++)
        {
            caveBlockPool[i].SetActive(false);
        }
    }

    private void PlaySound(AudioClip clip, float vol = 1.0f)
    {
        if (clip != null)
        {
            audioSource.PlayOneShot(clip, vol);
        }
    }

    private void GenerateAudioClips()
    {
        thrustClip = CreateSynthClip("thrust", 0.4f, (t) => (Mathf.PerlinNoise(t * 120f, 0) - 0.5f) * 0.6f + Mathf.Sin(t * 180f) * 0.2f);
        coinClip = CreateSynthClip("coin", 0.2f, (t) => Mathf.Sin(t * 1850f * Mathf.PI * 2f) * Mathf.Exp(-t * 12f));
        shieldClip = CreateSynthClip("shield", 0.35f, (t) => Mathf.Sin((440f + t * 600f) * Mathf.PI * 2f * t) * Mathf.Exp(-t * 6f));
        warningClip = CreateSynthClip("warn", 0.18f, (t) => Mathf.Sin(880f * Mathf.PI * 2f * t) * 0.5f);
        crashClip = CreateSynthClip("crash", 0.55f, (t) => (UnityEngine.Random.value - 0.5f) * Mathf.Exp(-t * 4.5f));
        clearClip = CreateSynthClip("clear", 0.65f, (t) => Mathf.Sin((523.25f + t * 450f) * Mathf.PI * 2f * t) * 0.6f);
        gravityClip = CreateSynthClip("gravity", 0.45f, (t) => Mathf.Sin((300f + Mathf.Sin(t * 30f) * 200f) * Mathf.PI * 2f * t));
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
        int w = Screen.width;
        int h = Screen.height;

        GUI.skin.label.fontSize = 14;
        GUI.skin.button.fontSize = 14;

        // Top Navigation Bar (Language Switcher & Stage Select)
        GUILayout.BeginArea(new Rect(15, 12, w - 30, 42));
        GUILayout.BeginHorizontal();

        GUI.color = Color.white;
        GUILayout.Label($"<b>CAVE DASH 3D</b>", GUILayout.Width(130));

        // Language Buttons
        GUI.color = lang == CaveLanguage.KO ? Color.cyan : Color.white;
        if (GUILayout.Button("KO", GUILayout.Width(45), GUILayout.Height(28))) lang = CaveLanguage.KO;
        GUI.color = lang == CaveLanguage.EN ? Color.cyan : Color.white;
        if (GUILayout.Button("EN", GUILayout.Width(45), GUILayout.Height(28))) lang = CaveLanguage.EN;
        GUI.color = lang == CaveLanguage.JA ? Color.cyan : Color.white;
        if (GUILayout.Button("JA", GUILayout.Width(45), GUILayout.Height(28))) lang = CaveLanguage.JA;
        GUI.color = lang == CaveLanguage.ES ? Color.cyan : Color.white;
        if (GUILayout.Button("ES", GUILayout.Width(45), GUILayout.Height(28))) lang = CaveLanguage.ES;

        GUILayout.FlexibleSpace();

        // Stage Select Button
        GUI.color = showStageSelect ? Color.yellow : Color.white;
        string stagesLabel = GetText("스테이지 선택", "Stages", "ステージ選択", "Etapas");
        if (GUILayout.Button(stagesLabel, GUILayout.Width(110), GUILayout.Height(28)))
        {
            showStageSelect = !showStageSelect;
        }

        // Endless Toggle
        GUI.color = isEndless ? Color.green : Color.white;
        string endlessLabel = GetText("무한 모드", "Endless", "エンドレス", "Infinito");
        if (GUILayout.Button(endlessLabel, GUILayout.Width(95), GUILayout.Height(28)))
        {
            isEndless = !isEndless;
            ResetToStage(currentStageIndex);
        }

        GUILayout.EndHorizontal();
        GUILayout.EndArea();

        // HUD Overlay during Gameplay
        if (state == GameState.Playing || state == GameState.Ready)
        {
            var stg = stages[currentStageIndex];
            GUILayout.BeginArea(new Rect(20, 60, 320, 240));

            GUI.color = Color.white;
            string stageTitle = isEndless ? GetText("무한 동굴 런", "Endless Cave Run", "エンドレス洞窟ラン", "Carrera Infinita")
                                          : $"Stage {stg.id}: {GetStageName(stg)}";
            GUILayout.Label($"<size=17><b>{stageTitle}</b></size>");

            GUILayout.Space(4);
            string distLabel = GetText("거리", "Distance", "距離", "Distancia");
            string targetLabel = isEndless ? "∞" : $"{stg.targetDistance:0}m";
            GUILayout.Label($"{distLabel}: <b>{shipDistance:0.0}m / {targetLabel}</b>");

            string coinsLabel = GetText("코인", "Coins", "コイン", "Monedas");
            GUILayout.Label($"{coinsLabel}: <b>{coinsCollected}</b> | Score: <b>{score}</b> (Best: {bestScore})");

            string shieldLabel = GetText("쉴드", "Shields", "シールド", "Escudos");
            string shieldIcons = shields > 0 ? "🛡️".Repeat(shields) : GetText("없음", "None", "なし", "Ninguno");
            GUILayout.Label($"{shieldLabel}: {shieldIcons}");

            // Energy Bar
            string energyLabel = GetText("추진 연료", "Fuel Energy", "推進燃料", "Combustible");
            GUILayout.Label($"{energyLabel}: {energy:0}%");
            Rect energyRect = GUILayoutUtility.GetRect(200, 10);
            GUI.Box(energyRect, "");
            GUI.color = energy > 25f ? Color.green : Color.red;
            GUI.Box(new Rect(energyRect.x, energyRect.y, energyRect.width * (energy / 100f), energyRect.height), "");
            GUI.color = Color.white;

            // Gravity Inverted Alert
            if (gravityInverted)
            {
                GUI.color = Color.magenta;
                GUILayout.Label($"<b>⚠️ {GetText("중력 역전 활성화!", "GRAVITY REVERSED!", "重力反転中！", "¡GRAVEDAD INVERTIDA!")}</b>");
                GUI.color = Color.white;
            }

            GUILayout.EndArea();
        }

        // Center Modals (Ready, Clear, Game Over, All Cleared, Stage Select)
        if (showStageSelect)
        {
            RenderStageSelectModal(w, h);
        }
        else if (state == GameState.Ready)
        {
            RenderReadyModal(w, h);
        }
        else if (state == GameState.StageClear)
        {
            RenderStageClearModal(w, h);
        }
        else if (state == GameState.GameOver)
        {
            RenderGameOverModal(w, h);
        }
        else if (state == GameState.AllCleared)
        {
            RenderAllClearedModal(w, h);
        }
    }

    private void RenderReadyModal(int w, int h)
    {
        var stg = stages[currentStageIndex];
        float mw = 420;
        float mh = 260;
        Rect r = new Rect((w - mw) * 0.5f, (h - mh) * 0.5f, mw, mh);
        GUI.Box(r, "");

        GUILayout.BeginArea(new Rect(r.x + 20, r.y + 15, r.width - 40, r.height - 30));
        GUI.color = Color.cyan;
        GUILayout.Label($"<size=22><b>STAGE {stg.id}: {GetStageName(stg)}</b></size>", GUILayout.Height(32));
        GUI.color = Color.white;

        GUILayout.Space(8);
        GUILayout.Label(GetStageDesc(stg));

        GUILayout.Space(8);
        string targetText = isEndless ? GetText("목표: 최대 거리 생존", "Goal: Survive Maximum Distance", "目標：最大距離生存", "Meta: Sobrevive distancia máxima")
                                      : $"{GetText("목표 지점", "Target Goal", "目標地点", "Meta")}: <b>{stg.targetDistance:0}m</b>";
        GUILayout.Label(targetText);

        string controlInfo = GetText("조작: [스페이스] 또는 [클릭/터치] 추진 상승", "Controls: [Space] or [Click/Touch] to Thrust Up", "操作：[Space]または[クリック/タップ]で上昇", "Controles: [Espacio] o [Clic/Tocar] para propulsión");
        GUILayout.Label($"<color=#aaa>{controlInfo}</color>");

        GUILayout.FlexibleSpace();
        GUI.color = Color.green;
        string startBtn = GetText("비행 시작 (Start Flight)", "Start Flight", "フライト開始", "Iniciar Vuelo");
        if (GUILayout.Button($"<b>{startBtn}</b>", GUILayout.Height(44)))
        {
            state = GameState.Playing;
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
        GUILayout.Label($"<size=22><b>🎉 STAGE {stg.id} {GetText("완료!", "CLEARED!", "クリア！", "¡COMPLETADA!")}</b></size>", GUILayout.Height(32));
        GUI.color = Color.white;

        GUILayout.Space(8);
        GUILayout.Label($"{GetText("달성 거리", "Distance Reached", "到達距離", "Distancia")}: <b>{shipDistance:0.0}m</b>");
        GUILayout.Label($"{GetText("획득 코인", "Coins Collected", "獲得コイン", "Monedas")}: <b>+{coinsCollected}</b>");
        GUILayout.Label($"Score: <b>{score}</b> (Best: {bestScore})");

        GUILayout.FlexibleSpace();
        GUI.color = Color.green;
        string nextBtn = GetText("다음 스테이지 ▶", "Next Stage ▶", "次のステージ ▶", "Siguiente Etapa ▶");
        if (GUILayout.Button($"<b>{nextBtn}</b>", GUILayout.Height(44)))
        {
            ResetToStage(currentStageIndex + 1);
            state = GameState.Playing;
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
        GUILayout.Label($"<size=22><b>💥 {GetText("비행선 파괴!", "SHIP DESTROYED!", "機体大破！", "¡NAVE DESTRUIDA!")}</b></size>", GUILayout.Height(32));
        GUI.color = Color.white;

        GUILayout.Space(8);
        GUILayout.Label($"{GetText("최종 거리", "Final Distance", "最終到達距離", "Distancia Final")}: <b>{shipDistance:0.0}m</b>");
        GUILayout.Label($"Score: <b>{score}</b> (Best: {bestScore})");

        GUILayout.FlexibleSpace();
        GUILayout.BeginHorizontal();

        GUI.color = Color.yellow;
        string retryBtn = GetText("다시 시도 (Retry)", "Retry", "リトライ", "Reintentar");
        if (GUILayout.Button($"<b>{retryBtn}</b>", GUILayout.Height(44)))
        {
            ResetToStage(currentStageIndex);
            state = GameState.Playing;
        }

        GUI.color = Color.white;
        string menuBtn = GetText("스테이지 목록", "Stage Select", "ステージ選択", "Etapas");
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
        GUILayout.Label($"<size=23><b>🏆 {GetText("12스테이지 전 구역 제패!", "ALL 12 STAGES CONQUERED!", "全12ステージ制覇！", "¡TODAS LAS ETAPAS SUPERADAS!")}</b></size>", GUILayout.Height(34));
        GUI.color = Color.white;

        GUILayout.Space(8);
        GUILayout.Label(GetText("축하합니다! 지구 중심핵을 뚫고 궁극의 비행 마스터로 거듭났습니다.",
                                "Incredible! You pierced the Earth's molten core and mastered the deep abyss.",
                                "おめでとうございます！地球中心核を突破し、究極の飛行マスターとなりました。",
                                "¡Felicidades! Has atravesado el núcleo de la Tierra y dominado el abismo."));

        GUILayout.Space(8);
        GUILayout.Label($"Final Score: <b>{score}</b> | Coins: <b>{coinsCollected}</b>");

        GUILayout.FlexibleSpace();
        GUI.color = Color.green;
        string endlessBtn = GetText("무한 모드 도전 ▶", "Challenge Endless Mode ▶", "エンドレスモード挑戦 ▶", "Modo Infinito ▶");
        if (GUILayout.Button($"<b>{endlessBtn}</b>", GUILayout.Height(44)))
        {
            isEndless = true;
            ResetToStage(0);
            state = GameState.Playing;
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
        GUILayout.Label($"<size=20><b>{GetText("스테이지 선택 (12 Stages)", "Select Stage (12 Stages)", "ステージ選択 (全12ステージ)", "Seleccionar Etapa (12 Etapas)")}</b></size>");
        GUI.color = Color.white;
        GUILayout.FlexibleSpace();
        if (GUILayout.Button("✕", GUILayout.Width(35), GUILayout.Height(28)))
        {
            showStageSelect = false;
        }
        GUILayout.EndHorizontal();

        GUILayout.Space(10);

        // 4x3 Grid of 12 Stages
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

                    string btnText = $"<b>Stage {stg.id}</b>\n<size=11>{GetStageName(stg)}</size>";
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
            case CaveLanguage.KO: return ko;
            case CaveLanguage.EN: return en;
            case CaveLanguage.JA: return ja;
            case CaveLanguage.ES: return es;
            default: return en;
        }
    }

    private string GetStageName(StageData s)
    {
        switch (lang)
        {
            case CaveLanguage.KO: return s.nameKo;
            case CaveLanguage.EN: return s.nameEn;
            case CaveLanguage.JA: return s.nameJa;
            case CaveLanguage.ES: return s.nameEs;
            default: return s.nameEn;
        }
    }

    private string GetStageDesc(StageData s)
    {
        switch (lang)
        {
            case CaveLanguage.KO: return s.descKo;
            case CaveLanguage.EN: return s.descEn;
            case CaveLanguage.JA: return s.descJa;
            case CaveLanguage.ES: return s.descEs;
            default: return s.descEn;
        }
    }
}
