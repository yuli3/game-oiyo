using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class SwatBreachPlayer : MonoBehaviour
{
    public enum Language { KO, EN, JA, ES }
    private Language currentLang = Language.KO;

    public enum TileType { Floor, Wall, DoorClosed, DoorOpen, Cover }
    public enum SuspectType { Thug, Shotgunner, Sniper, JuggernautBoss, Bomber }

    public class LocalizedText
    {
        public string ko;
        public string en;
        public string ja;
        public string es;

        public LocalizedText(string ko, string en, string ja, string es)
        {
            this.ko = ko;
            this.en = en;
            this.ja = ja;
            this.es = es;
        }

        public string Get(Language lang)
        {
            switch (lang)
            {
                case Language.KO: return ko;
                case Language.EN: return en;
                case Language.JA: return ja;
                case Language.ES: return es;
                default: return en;
            }
        }
    }

    public class Operator
    {
        public string id;
        public string callsign;
        public string role;
        public Vector2 pos;
        public Vector2 targetPos;
        public float angle;
        public int hp;
        public int maxHp;
        public bool hasShield;
        public List<Vector2Int> waypoints = new List<Vector2Int>();
        public int waypointIdx = 0;
        public float fireCooldown = 0f;
        public GameObject go;
        public GameObject shieldGo;
        public Material mat;
        public bool hasFlashbang = true;
    }

    public class Suspect
    {
        public int id;
        public SuspectType type;
        public Vector2 pos;
        public float angle;
        public int hp;
        public int maxHp;
        public float reactionTimer = 0.5f;
        public float stunTimer = 0f;
        public float fireCooldown = 0f;
        public bool isNeutralized = false;
        public GameObject go;
        public Material mat;
    }

    public class Hostage
    {
        public int id;
        public Vector2 pos;
        public bool isRescued = false;
        public GameObject go;
    }

    public class BombTarget
    {
        public Vector2Int gridPos;
        public float timer = 30f;
        public bool isDefused = false;
        public GameObject go;
    }

    public class MissionDef
    {
        public int missionNum;
        public LocalizedText title;
        public LocalizedText briefing;
        public string[] layout; // 8 rows of 10 chars
        public Vector2Int alphaSpawn;
        public Vector2Int bravoSpawn;
        public List<Vector2Int> alphaAutoPath;
        public List<Vector2Int> bravoAutoPath;
        public List<Tuple<Vector2Int, SuspectType>> suspects;
        public List<Vector2Int> hostages;
        public bool hasBomb;
        public Vector2Int bombPos;
        public bool isBossMission;
    }

    // Grid Dimensions
    private const int GridW = 10;
    private const int GridH = 8;
    private const float CellSize = 1.35f;
    private TileType[,] tiles = new TileType[GridW, GridH];
    private GameObject[,] tileGos = new GameObject[GridW, GridH];

    // Visuals & Camera
    private Camera mainCam;
    private Light dirLight;
    private Material floorMat;
    private Material wallMat;
    private Material doorClosedMat;
    private Material doorOpenMat;
    private Material coverMat;

    // Entities
    private Operator alpha;
    private Operator bravo;
    private List<Suspect> suspects = new List<Suspect>();
    private List<Hostage> hostages = new List<Hostage>();
    private BombTarget currentBomb = null;

    // Bullet Tracers & FX
    private struct BulletTracer
    {
        public Vector3 start;
        public Vector3 end;
        public Color color;
        public float life;
    }
    private List<BulletTracer> tracers = new List<BulletTracer>();

    private struct FloatText
    {
        public string text;
        public Vector3 worldPos;
        public Color color;
        public float life;
        public float maxLife;
    }
    private List<FloatText> floatTexts = new List<FloatText>();

    // Flashbang Whiteout Effect
    private float flashWhiteout = 0f;
    private float cameraTrauma = 0f;

    // Audio
    private AudioSource audioSource;
    private AudioClip sndRadio;
    private AudioClip sndM4Burst;
    private AudioClip sndShotgun;
    private AudioClip sndDoorBreach;
    private AudioClip sndFlashbang;
    private AudioClip sndSuspectDown;
    private AudioClip sndHostageSafe;
    private AudioClip sndMissionSuccess;
    private AudioClip sndMissionFail;

    // Game Phase
    public enum Phase { Planning, Executing, Victory, Failed }
    private Phase phase = Phase.Planning;
    private int currentMissionIdx = 0;
    private bool showMissionSelect = false;
    private int selectedOperator = 0; // 0: Alpha, 1: Bravo
    private int totalScore = 0;
    private float missionTimer = 0f;

    // 12 Tactical CQB Missions (User Rule: Minimum 10 stages accessible)
    private MissionDef[] missions;

    void Awake()
    {
        SetupCameraAndLighting();
        CreateMaterials();
        BuildAudioClips();
        BuildMissionsDatabase();
        LoadMission(0);
    }

    void SetupCameraAndLighting()
    {
        var camGo = new GameObject("Main Camera");
        camGo.tag = "MainCamera";
        mainCam = camGo.AddComponent<Camera>();
        mainCam.clearFlags = CameraClearFlags.SolidColor;
        mainCam.backgroundColor = new Color(0.04f, 0.06f, 0.10f); // tactical night-vision dark slate
        camGo.transform.position = new Vector3(0f, 0.5f, -14.2f);
        camGo.transform.rotation = Quaternion.identity;
        mainCam.fieldOfView = 54f;

        var lightGo = new GameObject("DirLight");
        dirLight = lightGo.AddComponent<Light>();
        dirLight.type = LightType.Directional;
        dirLight.color = new Color(0.92f, 0.95f, 1.0f);
        dirLight.intensity = 1.15f;
        lightGo.transform.rotation = Quaternion.Euler(50f, -25f, 0f);

        audioSource = gameObject.AddComponent<AudioSource>();
        audioSource.playOnAwake = false;
    }

    void CreateMaterials()
    {
        floorMat = CreateMat(new Color(0.12f, 0.16f, 0.24f));
        wallMat = CreateMat(new Color(0.24f, 0.30f, 0.42f));
        doorClosedMat = CreateMat(new Color(0.75f, 0.50f, 0.20f));
        doorOpenMat = CreateMat(new Color(0.35f, 0.40f, 0.30f));
        coverMat = CreateMat(new Color(0.40f, 0.45f, 0.55f));
    }

    Material CreateMat(Color c)
    {
        var mat = new Material(Shader.Find("Sprites/Default"));
        mat.color = c;
        return mat;
    }

    void BuildMissionsDatabase()
    {
        missions = new MissionDef[]
        {
            // Mission 1: Safehouse Recon
            new MissionDef
            {
                missionNum = 1,
                title = new LocalizedText("아파트 은신처 정찰", "Apartment Safehouse Recon", "アパート隠れ家偵察", "Reconocimiento de Refugio"),
                briefing = new LocalizedText("2인 무장 용의자가 아파트를 점거했습니다. 방패로 진입하여 제압하십시오.", "2 armed suspects occupying safehouse. Breach with shield and clear rooms.", "2名の武装容疑者が占拠中。盾で突入し制圧せよ。", "2 sospechosos armados ocupando el piso. Entren con escudo y despejen."),
                layout = new string[] {
                    "##########",
                    "#...#....#",
                    "#...D....#",
                    "#.C.#..C.#",
                    "#...######",
                    "#........#",
                    "#........#",
                    "##########"
                },
                alphaSpawn = new Vector2Int(1, 1),
                bravoSpawn = new Vector2Int(2, 1),
                alphaAutoPath = new List<Vector2Int> { new Vector2Int(1, 2), new Vector2Int(2, 2), new Vector2Int(4, 2), new Vector2Int(6, 2) },
                bravoAutoPath = new List<Vector2Int> { new Vector2Int(2, 2), new Vector2Int(3, 2), new Vector2Int(5, 2), new Vector2Int(7, 2) },
                suspects = new List<Tuple<Vector2Int, SuspectType>> {
                    Tuple.Create(new Vector2Int(6, 2), SuspectType.Thug),
                    Tuple.Create(new Vector2Int(7, 3), SuspectType.Thug)
                },
                hostages = new List<Vector2Int>(),
                hasBomb = false,
                isBossMission = false
            },

            // Mission 2: Downtown Jewelry Store
            new MissionDef
            {
                missionNum = 2,
                title = new LocalizedText("다운타운 귀금속점 강도", "Downtown Jewelry Heist", "ダウンタウン宝石強盗", "Asalto a Joyería Céntrica"),
                briefing = new LocalizedText("귀금속 강도단이 점원 1명을 인질로 잡았습니다. 섬광탄으로 무력화하십시오.", "Robbers holding 1 clerk hostage. Stun with flashbang before engagement.", "強盗団が店員1名を人質に。閃光弾で無力化せよ。", "Ladrones tienen 1 rehén. Usen aturdidora antes de disparar."),
                layout = new string[] {
                    "##########",
                    "#...#....#",
                    "#...D..H.#",
                    "#.C.#.C..#",
                    "#...#....#",
                    "##D#######",
                    "#........#",
                    "##########"
                },
                alphaSpawn = new Vector2Int(1, 1),
                bravoSpawn = new Vector2Int(2, 1),
                alphaAutoPath = new List<Vector2Int> { new Vector2Int(1, 2), new Vector2Int(2, 3), new Vector2Int(2, 5), new Vector2Int(5, 5) },
                bravoAutoPath = new List<Vector2Int> { new Vector2Int(2, 2), new Vector2Int(4, 2), new Vector2Int(6, 2), new Vector2Int(7, 2) },
                suspects = new List<Tuple<Vector2Int, SuspectType>> {
                    Tuple.Create(new Vector2Int(6, 1), SuspectType.Thug),
                    Tuple.Create(new Vector2Int(8, 2), SuspectType.Shotgunner),
                    Tuple.Create(new Vector2Int(5, 6), SuspectType.Thug)
                },
                hostages = new List<Vector2Int> { new Vector2Int(7, 2) },
                hasBomb = false,
                isBossMission = false
            },

            // Mission 3: Warehouse Hostage Crisis
            new MissionDef
            {
                missionNum = 3,
                title = new LocalizedText("물류창고 인질 구출", "Warehouse Hostage Crisis", "倉庫人質救出作戦", "Crisis de Rehenes en Almacén"),
                briefing = new LocalizedText("2명의 인질이 중앙 컨테이너 뒤에 묶여 있습니다. 양방향 동시 진입하십시오.", "2 hostages held behind containers. Coordinate dual-vector breach.", "2名の人質がコンテナ裏に。二方向から同時突入せよ。", "2 rehenes tras contenedores. Coordinen brecha en dos vectores."),
                layout = new string[] {
                    "##########",
                    "#..C#....#",
                    "#...D..H.#",
                    "#C..#.C..#",
                    "#...D.H..#",
                    "#..C#....#",
                    "#........#",
                    "##########"
                },
                alphaSpawn = new Vector2Int(1, 1),
                bravoSpawn = new Vector2Int(1, 6),
                alphaAutoPath = new List<Vector2Int> { new Vector2Int(2, 2), new Vector2Int(4, 2), new Vector2Int(6, 2) },
                bravoAutoPath = new List<Vector2Int> { new Vector2Int(2, 4), new Vector2Int(4, 4), new Vector2Int(6, 4) },
                suspects = new List<Tuple<Vector2Int, SuspectType>> {
                    Tuple.Create(new Vector2Int(5, 1), SuspectType.Thug),
                    Tuple.Create(new Vector2Int(7, 3), SuspectType.Shotgunner),
                    Tuple.Create(new Vector2Int(6, 5), SuspectType.Sniper)
                },
                hostages = new List<Vector2Int> { new Vector2Int(7, 2), new Vector2Int(6, 4) },
                hasBomb = false,
                isBossMission = false
            },

            // Mission 4: Suburban Villa Breach
            new MissionDef
            {
                missionNum = 4,
                title = new LocalizedText("외곽 빌라 무장 점거", "Suburban Villa Siege", "郊外別荘の包囲戦", "Asedio a Villa Suburbana"),
                briefing = new LocalizedText("카르텔 조직원들이 엄폐물 뒤에서 대기 중입니다. 코너 사격에 주의하십시오.", "Cartel gunmen behind heavy cover. Check corners carefully.", "カルテル組員が物陰で待ち伏せ中。死角に注意せよ。", "Sicarios tras coberturas. Cuiden las esquinas."),
                layout = new string[] {
                    "##########",
                    "#....#...#",
                    "#.C..D.C.#",
                    "####.###.#",
                    "#....#...#",
                    "#..C.D.H.#",
                    "#....#...#",
                    "##########"
                },
                alphaSpawn = new Vector2Int(1, 1),
                bravoSpawn = new Vector2Int(1, 2),
                alphaAutoPath = new List<Vector2Int> { new Vector2Int(2, 2), new Vector2Int(5, 2), new Vector2Int(7, 2) },
                bravoAutoPath = new List<Vector2Int> { new Vector2Int(2, 5), new Vector2Int(5, 5), new Vector2Int(7, 5) },
                suspects = new List<Tuple<Vector2Int, SuspectType>> {
                    Tuple.Create(new Vector2Int(6, 1), SuspectType.Thug),
                    Tuple.Create(new Vector2Int(8, 2), SuspectType.Sniper),
                    Tuple.Create(new Vector2Int(6, 6), SuspectType.Shotgunner),
                    Tuple.Create(new Vector2Int(8, 4), SuspectType.Thug)
                },
                hostages = new List<Vector2Int> { new Vector2Int(7, 5) },
                hasBomb = false,
                isBossMission = false
            },

            // Mission 5: Bank Vault Siege [MID BOSS: Juggernaut]
            new MissionDef
            {
                missionNum = 5,
                title = new LocalizedText("은행 금고 포위 [중간보스]", "Bank Vault Siege [MID-BOSS]", "銀行地下金庫包囲 [中ボス]", "Asedio a Bóveda [SUB-JEFE]"),
                briefing = new LocalizedText("중장갑 저거너트가 미니건을 들고 지하 금고를 장악했습니다. 섬광탄으로 기절시키십시오!", "Heavy Juggernaut boss holding vault with body armor. Flashbang him!", "重装甲ジャガーノートがミニガンで地下金庫を占拠。閃光弾で隙を作れ！", "Juggernaut blindado en la bóveda con minigun. ¡Atúrdanlo con granada!"),
                layout = new string[] {
                    "##########",
                    "#..C.#...#",
                    "#....D...#",
                    "#.C..#.C.#",
                    "#....D...#",
                    "#..C.#...#",
                    "#....#...#",
                    "##########"
                },
                alphaSpawn = new Vector2Int(1, 2),
                bravoSpawn = new Vector2Int(1, 4),
                alphaAutoPath = new List<Vector2Int> { new Vector2Int(2, 2), new Vector2Int(5, 2), new Vector2Int(7, 3) },
                bravoAutoPath = new List<Vector2Int> { new Vector2Int(2, 4), new Vector2Int(5, 4), new Vector2Int(7, 3) },
                suspects = new List<Tuple<Vector2Int, SuspectType>> {
                    Tuple.Create(new Vector2Int(7, 3), SuspectType.JuggernautBoss),
                    Tuple.Create(new Vector2Int(8, 1), SuspectType.Thug),
                    Tuple.Create(new Vector2Int(8, 5), SuspectType.Shotgunner)
                },
                hostages = new List<Vector2Int>(),
                hasBomb = false,
                isBossMission = true
            },

            // Mission 6: Harbor Container Maze
            new MissionDef
            {
                missionNum = 6,
                title = new LocalizedText("항구 컨테이너 미로", "Harbor Container Labyrinth", "港湾コンテナ迷路", "Laberinto de Contenedores"),
                briefing = new LocalizedText("좁은 컨테이너 골목마다 샷건 무장 괴한들이 배치되어 있습니다. 방패 전진 필수.", "Tight container corridors with shotgunners. Advance behind shield.", "狭いコンテナ通路に散弾銃部隊。盾を先頭に前進せよ。", "Pasillos estrechos con escopetas. Avancen tras el escudo."),
                layout = new string[] {
                    "##########",
                    "#..#...#.#",
                    "#.C#C#.#.#",
                    "#..D.#.#.#",
                    "####.###.#",
                    "#..C.D.C.#",
                    "#..#...#.#",
                    "##########"
                },
                alphaSpawn = new Vector2Int(1, 1),
                bravoSpawn = new Vector2Int(1, 3),
                alphaAutoPath = new List<Vector2Int> { new Vector2Int(1, 2), new Vector2Int(3, 3), new Vector2Int(5, 3), new Vector2Int(7, 5) },
                bravoAutoPath = new List<Vector2Int> { new Vector2Int(2, 3), new Vector2Int(3, 3), new Vector2Int(5, 5), new Vector2Int(8, 5) },
                suspects = new List<Tuple<Vector2Int, SuspectType>> {
                    Tuple.Create(new Vector2Int(4, 1), SuspectType.Shotgunner),
                    Tuple.Create(new Vector2Int(8, 2), SuspectType.Sniper),
                    Tuple.Create(new Vector2Int(6, 6), SuspectType.Shotgunner),
                    Tuple.Create(new Vector2Int(8, 6), SuspectType.Thug)
                },
                hostages = new List<Vector2Int>(),
                hasBomb = false,
                isBossMission = false
            },

            // Mission 7: Embassy Floor Takeover
            new MissionDef
            {
                missionNum = 7,
                title = new LocalizedText("외교 공관 층 장악", "Embassy Floor Takeover", "大使館フロア占拠", "Toma del Piso de Embajada"),
                briefing = new LocalizedText("대사관 주요 인사 2명이 억류되었습니다. 오발 사격 없이 정밀 제압하십시오.", "2 diplomats held hostage. Zero civilian casualties permitted.", "外交官2名が拘束中。誤射を避け精密に制圧せよ。", "2 diplomáticos retenidos. Cero bajas civiles permitidas."),
                layout = new string[] {
                    "##########",
                    "#....#H..#",
                    "#.C..D...#",
                    "#....#.C.#",
                    "######D###",
                    "#....#...#",
                    "#.H..D...#",
                    "##########"
                },
                alphaSpawn = new Vector2Int(1, 1),
                bravoSpawn = new Vector2Int(1, 5),
                alphaAutoPath = new List<Vector2Int> { new Vector2Int(3, 2), new Vector2Int(5, 2), new Vector2Int(7, 1) },
                bravoAutoPath = new List<Vector2Int> { new Vector2Int(3, 6), new Vector2Int(5, 6), new Vector2Int(2, 6) },
                suspects = new List<Tuple<Vector2Int, SuspectType>> {
                    Tuple.Create(new Vector2Int(8, 1), SuspectType.Sniper),
                    Tuple.Create(new Vector2Int(6, 3), SuspectType.Thug),
                    Tuple.Create(new Vector2Int(8, 5), SuspectType.Shotgunner),
                    Tuple.Create(new Vector2Int(4, 5), SuspectType.Thug)
                },
                hostages = new List<Vector2Int> { new Vector2Int(6, 1), new Vector2Int(2, 6) },
                hasBomb = false,
                isBossMission = false
            },

            // Mission 8: Penthouse Terrorist Cell
            new MissionDef
            {
                missionNum = 8,
                title = new LocalizedText("펜트하우스 무장 점거", "Penthouse Terrorist Cell", "ペントハウス武装占拠", "Célula en Ático de Lujo"),
                briefing = new LocalizedText("스나이퍼와 돌격조가 고지대 시야를 확보하고 있습니다. 섬광탄으로 기습 진압.", "Elite snipers holding high ground. Execute coordinated flashbang breach.", "狙撃手と突撃班が高所を制圧中。閃光弾で急襲せよ。", "Francotiradores dominan el terreno. Ejecuten asalto sorpresa."),
                layout = new string[] {
                    "##########",
                    "#...#....#",
                    "#.C.D.C..#",
                    "#...#....#",
                    "#...D.C..#",
                    "#.C.#....#",
                    "#...#..H.#",
                    "##########"
                },
                alphaSpawn = new Vector2Int(1, 2),
                bravoSpawn = new Vector2Int(1, 4),
                alphaAutoPath = new List<Vector2Int> { new Vector2Int(3, 2), new Vector2Int(5, 2), new Vector2Int(8, 2) },
                bravoAutoPath = new List<Vector2Int> { new Vector2Int(3, 4), new Vector2Int(5, 4), new Vector2Int(7, 6) },
                suspects = new List<Tuple<Vector2Int, SuspectType>> {
                    Tuple.Create(new Vector2Int(7, 1), SuspectType.Sniper),
                    Tuple.Create(new Vector2Int(8, 3), SuspectType.Shotgunner),
                    Tuple.Create(new Vector2Int(6, 5), SuspectType.Thug),
                    Tuple.Create(new Vector2Int(8, 5), SuspectType.Sniper)
                },
                hostages = new List<Vector2Int> { new Vector2Int(7, 6) },
                hasBomb = false,
                isBossMission = false
            },

            // Mission 9: Subway Station Platform
            new MissionDef
            {
                missionNum = 9,
                title = new LocalizedText("지하철 승강장 차단", "Subway Station Infiltration", "地下鉄ホーム遮断作戦", "Infiltración en el Metro"),
                briefing = new LocalizedText("열차 플랫폼에 용의자들이 산개해 있습니다. 빠른 연계 사격으로 무력화하십시오.", "Hostile cell dispersed on train platform. Swift double-tap neutralization.", "列車ホームに敵が散開中。素早い連係射撃で制圧せよ。", "Célula dispersa en la plataforma. Neutralización rápida con doble toque."),
                layout = new string[] {
                    "##########",
                    "#........#",
                    "#.C.C.C..#",
                    "###D######",
                    "#........#",
                    "#.C.C.C..#",
                    "#........#",
                    "##########"
                },
                alphaSpawn = new Vector2Int(1, 1),
                bravoSpawn = new Vector2Int(2, 1),
                alphaAutoPath = new List<Vector2Int> { new Vector2Int(3, 2), new Vector2Int(3, 3), new Vector2Int(4, 4), new Vector2Int(7, 4) },
                bravoAutoPath = new List<Vector2Int> { new Vector2Int(5, 2), new Vector2Int(3, 3), new Vector2Int(6, 5), new Vector2Int(8, 5) },
                suspects = new List<Tuple<Vector2Int, SuspectType>> {
                    Tuple.Create(new Vector2Int(7, 1), SuspectType.Thug),
                    Tuple.Create(new Vector2Int(8, 2), SuspectType.Sniper),
                    Tuple.Create(new Vector2Int(6, 4), SuspectType.Shotgunner),
                    Tuple.Create(new Vector2Int(8, 6), SuspectType.Thug),
                    Tuple.Create(new Vector2Int(5, 6), SuspectType.Thug)
                },
                hostages = new List<Vector2Int>(),
                hasBomb = false,
                isBossMission = false
            },

            // Mission 10: Chemical Plant Bomb Defusal [FINAL BOSS]
            new MissionDef
            {
                missionNum = 10,
                title = new LocalizedText("화학 공장 폭탄 해체 [최종보스]", "Chemical Plant Bomb [FINAL BOSS]", "化学工場爆弾解除 [最終ボス]", "Desactivación de Bomba [JEFE FINAL]"),
                briefing = new LocalizedText("용병 사령관과 폭탄범이 30초 시한폭탄을 가동했습니다! 보스를 제압하고 폭탄을 해체하십시오!", "Mercenary Warlord and bomber armed a 30s C4 explosive! Take him down and defuse!", "傭兵司令官が30秒のC4時限爆弾を起動！ボスを倒し解除せよ！", "¡El Caudillo Mercenario activó una bomba de 30s! ¡Abátanlo y desactiven!"),
                layout = new string[] {
                    "##########",
                    "#...#....#",
                    "#.C.D.B..#",
                    "#...#.C..#",
                    "#####D####",
                    "#...#....#",
                    "#.C.D.C..#",
                    "##########"
                },
                alphaSpawn = new Vector2Int(1, 1),
                bravoSpawn = new Vector2Int(1, 5),
                alphaAutoPath = new List<Vector2Int> { new Vector2Int(3, 2), new Vector2Int(5, 2), new Vector2Int(6, 2) },
                bravoAutoPath = new List<Vector2Int> { new Vector2Int(3, 6), new Vector2Int(5, 6), new Vector2Int(7, 4) },
                suspects = new List<Tuple<Vector2Int, SuspectType>> {
                    Tuple.Create(new Vector2Int(7, 2), SuspectType.JuggernautBoss),
                    Tuple.Create(new Vector2Int(8, 3), SuspectType.Bomber),
                    Tuple.Create(new Vector2Int(6, 5), SuspectType.Shotgunner),
                    Tuple.Create(new Vector2Int(8, 6), SuspectType.Sniper)
                },
                hostages = new List<Vector2Int>(),
                hasBomb = true,
                bombPos = new Vector2Int(6, 2),
                isBossMission = true
            },

            // Mission 11: Secret Black Site [SECRET 1]
            new MissionDef
            {
                missionNum = 11,
                title = new LocalizedText("비밀 지하 벙커 [시크릿 1]", "Secret Black Site [SECRET 1]", "極秘地下バンカー [シークレット1]", "Búnker Secreto [SECRETO 1]"),
                briefing = new LocalizedText("미등록 지하 시설에서 방패 특수부대 용병들이 농성 중입니다. 극도의 화력 교전 예상.", "Unregistered facility held by shielded mercenaries. Extreme CQB expected.", "未登録施設で盾部隊が籠城中。極限の近接銃撃戦に備えよ。", "Instalación clandestina con mercenarios escudados. Máxima hostilidad."),
                layout = new string[] {
                    "##########",
                    "#..#..#..#",
                    "#.CD..D.C#",
                    "#..#..#..#",
                    "#C.D..D.C#",
                    "#..#..#..#",
                    "#..#..#..#",
                    "##########"
                },
                alphaSpawn = new Vector2Int(1, 1),
                bravoSpawn = new Vector2Int(1, 6),
                alphaAutoPath = new List<Vector2Int> { new Vector2Int(3, 2), new Vector2Int(5, 2), new Vector2Int(7, 2) },
                bravoAutoPath = new List<Vector2Int> { new Vector2Int(3, 4), new Vector2Int(5, 4), new Vector2Int(7, 4) },
                suspects = new List<Tuple<Vector2Int, SuspectType>> {
                    Tuple.Create(new Vector2Int(5, 1), SuspectType.Thug),
                    Tuple.Create(new Vector2Int(8, 2), SuspectType.Sniper),
                    Tuple.Create(new Vector2Int(5, 5), SuspectType.Shotgunner),
                    Tuple.Create(new Vector2Int(8, 5), SuspectType.Thug),
                    Tuple.Create(new Vector2Int(7, 3), SuspectType.Shotgunner)
                },
                hostages = new List<Vector2Int>(),
                hasBomb = false,
                isBossMission = true
            },

            // Mission 12: Presidential Bunker Protocol [CHAMPIONSHIP MASTER]
            new MissionDef
            {
                missionNum = 12,
                title = new LocalizedText("대통령 벙커 최종 수호 [마스터]", "Presidential Bunker Protocol [MASTER]", "大統領地下バンカー最終防衛 [マスター]", "Protocolo de Búnker Presidencial [MAESTRO]"),
                briefing = new LocalizedText("국가 최고 요원 2명을 인질로 잡고 최후의 반란군이 벙커를 봉쇄했습니다. 완벽한 전술만이 승리합니다.", "Rebel syndicate locked down bunker with 2 VIP hostages. Flawless breach required.", "反乱軍幹部がVIP2名を拘束しバンカー封鎖。完璧な戦術のみが勝利を掴む。", "Rebeldes atrincherados con 2 rehenes VIP. Se requiere ejecución táctica perfecta."),
                layout = new string[] {
                    "##########",
                    "#H...#..H#",
                    "#.C..D...#",
                    "####.###.#",
                    "#....#...#",
                    "#.C..D.C.#",
                    "#....#...#",
                    "##########"
                },
                alphaSpawn = new Vector2Int(1, 1),
                bravoSpawn = new Vector2Int(1, 2),
                alphaAutoPath = new List<Vector2Int> { new Vector2Int(3, 2), new Vector2Int(5, 2), new Vector2Int(8, 1) },
                bravoAutoPath = new List<Vector2Int> { new Vector2Int(2, 5), new Vector2Int(5, 5), new Vector2Int(8, 5) },
                suspects = new List<Tuple<Vector2Int, SuspectType>> {
                    Tuple.Create(new Vector2Int(7, 1), SuspectType.JuggernautBoss),
                    Tuple.Create(new Vector2Int(8, 2), SuspectType.Sniper),
                    Tuple.Create(new Vector2Int(6, 4), SuspectType.Shotgunner),
                    Tuple.Create(new Vector2Int(8, 5), SuspectType.Sniper),
                    Tuple.Create(new Vector2Int(7, 6), SuspectType.Shotgunner)
                },
                hostages = new List<Vector2Int> { new Vector2Int(1, 1), new Vector2Int(8, 1) },
                hasBomb = false,
                isBossMission = true
            }
        };
    }

    public void LoadMission(int idx)
    {
        currentMissionIdx = Mathf.Clamp(idx, 0, missions.Length - 1);
        var m = missions[currentMissionIdx];

        // Clean up old objects
        for (int x = 0; x < GridW; x++)
        {
            for (int y = 0; y < GridH; y++)
            {
                if (tileGos[x, y] != null) Destroy(tileGos[x, y]);
            }
        }

        foreach (var s in suspects) if (s.go != null) Destroy(s.go);
        suspects.Clear();

        foreach (var h in hostages) if (h.go != null) Destroy(h.go);
        hostages.Clear();

        if (currentBomb != null && currentBomb.go != null) Destroy(currentBomb.go);
        currentBomb = null;

        if (alpha != null && alpha.go != null) Destroy(alpha.go);
        if (bravo != null && bravo.go != null) Destroy(bravo.go);

        // Build Tilemap
        for (int y = 0; y < GridH; y++)
        {
            string row = m.layout[GridH - 1 - y]; // invert Y for standard top-down
            for (int x = 0; x < GridW; x++)
            {
                char c = (x < row.Length) ? row[x] : '.';
                TileType t = TileType.Floor;
                if (c == '#') t = TileType.Wall;
                else if (c == 'D') t = TileType.DoorClosed;
                else if (c == 'C') t = TileType.Cover;

                tiles[x, y] = t;
                tileGos[x, y] = CreateTileVisual(x, y, t);
            }
        }

        // Spawn Operators
        alpha = new Operator
        {
            id = "alpha",
            callsign = "Alpha",
            role = "Shield",
            pos = GridToWorld(m.alphaSpawn.x, m.alphaSpawn.y),
            targetPos = GridToWorld(m.alphaSpawn.x, m.alphaSpawn.y),
            angle = 0f,
            hp = 120,
            maxHp = 120,
            hasShield = true,
            hasFlashbang = false
        };
        alpha.go = CreateOperatorVisual(alpha, new Color(0.2f, 0.75f, 1f));

        bravo = new Operator
        {
            id = "bravo",
            callsign = "Bravo",
            role = "Assault",
            pos = GridToWorld(m.bravoSpawn.x, m.bravoSpawn.y),
            targetPos = GridToWorld(m.bravoSpawn.x, m.bravoSpawn.y),
            angle = 0f,
            hp = 100,
            maxHp = 100,
            hasShield = false,
            hasFlashbang = true
        };
        bravo.go = CreateOperatorVisual(bravo, new Color(0.75f, 0.4f, 1f));

        // Auto plan default waypoints
        ApplyAutoPlan();

        // Spawn Suspects
        int sId = 1;
        foreach (var sTuple in m.suspects)
        {
            var s = new Suspect
            {
                id = sId++,
                type = sTuple.Item2,
                pos = GridToWorld(sTuple.Item1.x, sTuple.Item1.y),
                angle = 180f,
                hp = (sTuple.Item2 == SuspectType.JuggernautBoss) ? 320 : ((sTuple.Item2 == SuspectType.Shotgunner) ? 80 : 50),
                maxHp = (sTuple.Item2 == SuspectType.JuggernautBoss) ? 320 : ((sTuple.Item2 == SuspectType.Shotgunner) ? 80 : 50)
            };
            s.go = CreateSuspectVisual(s);
            suspects.Add(s);
        }

        // Spawn Hostages
        int hId = 1;
        foreach (var hPos in m.hostages)
        {
            var h = new Hostage
            {
                id = hId++,
                pos = GridToWorld(hPos.x, hPos.y),
                isRescued = false
            };
            h.go = CreateHostageVisual(h);
            hostages.Add(h);
        }

        // Spawn Bomb if mission has it
        if (m.hasBomb)
        {
            currentBomb = new BombTarget
            {
                gridPos = m.bombPos,
                timer = 30f,
                isDefused = false
            };
            var bGo = GameObject.CreatePrimitive(PrimitiveType.Cube);
            bGo.name = "BombC4";
            bGo.transform.position = GridToWorld(m.bombPos.x, m.bombPos.y) + Vector3.back * 0.2f;
            bGo.transform.localScale = new Vector3(0.45f, 0.45f, 0.45f);
            bGo.GetComponent<MeshRenderer>().material = CreateMat(new Color(0.95f, 0.2f, 0.1f));
            currentBomb.go = bGo;
        }

        phase = Phase.Planning;
        missionTimer = 0f;
        flashWhiteout = 0f;
        PlayClip(sndRadio, 0.9f);
    }

    Vector3 GridToWorld(int x, int y)
    {
        float wx = (x - GridW * 0.5f + 0.5f) * CellSize;
        float wy = (y - GridH * 0.5f + 0.5f) * CellSize;
        return new Vector3(wx, wy, 0f);
    }

    Vector2Int WorldToGrid(Vector3 worldPos)
    {
        int x = Mathf.FloorToInt((worldPos.x / CellSize) + GridW * 0.5f);
        int y = Mathf.FloorToInt((worldPos.y / CellSize) + GridH * 0.5f);
        return new Vector2Int(Mathf.Clamp(x, 0, GridW - 1), Mathf.Clamp(y, 0, GridH - 1));
    }

    GameObject CreateTileVisual(int x, int y, TileType type)
    {
        var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
        go.name = "Tile_" + x + "_" + y;
        go.transform.position = GridToWorld(x, y) + Vector3.forward * (type == TileType.Wall ? 0f : 0.4f);

        float height = (type == TileType.Wall) ? 1.0f : (type == TileType.Cover ? 0.6f : 0.1f);
        go.transform.localScale = new Vector3(CellSize * 0.96f, CellSize * 0.96f, height);

        var r = go.GetComponent<MeshRenderer>();
        switch (type)
        {
            case TileType.Floor: r.material = floorMat; break;
            case TileType.Wall: r.material = wallMat; break;
            case TileType.DoorClosed: r.material = doorClosedMat; break;
            case TileType.DoorOpen: r.material = doorOpenMat; break;
            case TileType.Cover: r.material = coverMat; break;
        }
        return go;
    }

    GameObject CreateOperatorVisual(Operator op, Color c)
    {
        var root = new GameObject("Operator_" + op.id);
        root.transform.position = op.pos;

        var body = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        body.transform.SetParent(root.transform, false);
        body.transform.rotation = Quaternion.Euler(90f, 0f, 0f);
        body.transform.localScale = new Vector3(0.7f, 0.15f, 0.7f);
        op.mat = CreateMat(c);
        body.GetComponent<MeshRenderer>().material = op.mat;

        if (op.hasShield)
        {
            var shield = GameObject.CreatePrimitive(PrimitiveType.Cube);
            shield.name = "ShieldMesh";
            shield.transform.SetParent(root.transform, false);
            shield.transform.localPosition = new Vector3(0.45f, 0f, -0.1f);
            shield.transform.localScale = new Vector3(0.18f, 0.75f, 0.5f);
            shield.GetComponent<MeshRenderer>().material = CreateMat(new Color(0.9f, 0.95f, 1f));
            op.shieldGo = shield;
        }

        return root;
    }

    GameObject CreateSuspectVisual(Suspect s)
    {
        var root = new GameObject("Suspect_" + s.id);
        root.transform.position = s.pos;

        var body = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        body.transform.SetParent(root.transform, false);
        body.transform.rotation = Quaternion.Euler(90f, 0f, 0f);

        float scale = (s.type == SuspectType.JuggernautBoss) ? 1.1f : 0.68f;
        body.transform.localScale = new Vector3(scale, 0.15f, scale);

        Color c = new Color(0.95f, 0.25f, 0.25f);
        if (s.type == SuspectType.Sniper) c = new Color(1.0f, 0.6f, 0.2f);
        else if (s.type == SuspectType.JuggernautBoss) c = new Color(0.6f, 0.1f, 0.1f);
        else if (s.type == SuspectType.Bomber) c = new Color(0.95f, 0.85f, 0.1f);

        s.mat = CreateMat(c);
        body.GetComponent<MeshRenderer>().material = s.mat;
        return root;
    }

    GameObject CreateHostageVisual(Hostage h)
    {
        var root = new GameObject("Hostage_" + h.id);
        root.transform.position = h.pos;

        var body = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        body.transform.SetParent(root.transform, false);
        body.transform.rotation = Quaternion.Euler(90f, 0f, 0f);
        body.transform.localScale = new Vector3(0.6f, 0.15f, 0.6f);
        body.GetComponent<MeshRenderer>().material = CreateMat(new Color(0.2f, 0.95f, 0.45f));
        return root;
    }

    public void ApplyAutoPlan()
    {
        var m = missions[currentMissionIdx];
        alpha.waypoints.Clear();
        bravo.waypoints.Clear();

        foreach (var pt in m.alphaAutoPath) alpha.waypoints.Add(pt);
        foreach (var pt in m.bravoAutoPath) bravo.waypoints.Add(pt);

        alpha.waypointIdx = 0;
        bravo.waypointIdx = 0;
    }

    public void ClearWaypoints()
    {
        alpha.waypoints.Clear();
        bravo.waypoints.Clear();
        alpha.waypointIdx = 0;
        bravo.waypointIdx = 0;
    }

    public void ExecuteBreach()
    {
        if (phase != Phase.Planning) return;
        phase = Phase.Executing;
        alpha.waypointIdx = 0;
        bravo.waypointIdx = 0;
        PlayClip(sndRadio, 1f);
        SpawnFloatText("3, 2, 1, EXECUTE BREACH!", Vector3.zero, Color.yellow);
    }

    void Update()
    {
        HandleCameraTrauma();
        UpdateFloatingTexts();

        if (flashWhiteout > 0f) flashWhiteout -= Time.deltaTime * 1.5f;

        if (phase == Phase.Planning)
        {
            HandlePlanningInput();
        }
        else if (phase == Phase.Executing)
        {
            missionTimer += Time.deltaTime;
            UpdateExecutingPhase(Time.deltaTime);
        }
    }

    void HandleCameraTrauma()
    {
        if (cameraTrauma > 0f)
        {
            cameraTrauma -= Time.deltaTime * 1.8f;
            float shakeAmt = cameraTrauma * cameraTrauma * 0.4f;
            mainCam.transform.position = new Vector3(
                UnityEngine.Random.Range(-shakeAmt, shakeAmt),
                0.5f + UnityEngine.Random.Range(-shakeAmt, shakeAmt),
                -14.2f
            );
        }
        else
        {
            mainCam.transform.position = new Vector3(0f, 0.5f, -14.2f);
        }
    }

    void HandlePlanningInput()
    {
        if (Input.GetMouseButtonDown(0))
        {
            if (Input.mousePosition.y < Screen.height - 130 && !showMissionSelect)
            {
                Ray ray = mainCam.ScreenPointToRay(Input.mousePosition);
                Plane boardPlane = new Plane(Vector3.forward, Vector3.zero);
                float dist;
                if (boardPlane.Raycast(ray, out dist))
                {
                    Vector3 pt = ray.GetPoint(dist);
                    Vector2Int gPos = WorldToGrid(pt);

                    if (tiles[gPos.x, gPos.y] != TileType.Wall)
                    {
                        var op = (selectedOperator == 0) ? alpha : bravo;
                        op.waypoints.Add(gPos);
                        PlayClip(sndRadio, 0.5f);
                        SpawnFloatText(op.callsign + " -> (" + gPos.x + "," + gPos.y + ")", GridToWorld(gPos.x, gPos.y), Color.cyan);
                    }
                }
            }
        }
    }

    void UpdateExecutingPhase(float dt)
    {
        // Update Bomb Timer
        if (currentBomb != null && !currentBomb.isDefused)
        {
            currentBomb.timer -= dt;
            if (currentBomb.timer <= 0f)
            {
                currentBomb.timer = 0f;
                OnMissionFailed(new LocalizedText("C4 폭탄이 폭발했습니다!", "C4 Bomb detonated!", "C4爆弾が爆発しました！", "¡La bomba C4 ha detonado!"));
                return;
            }
        }

        // Move Operators along waypoints
        StepOperator(alpha, dt);
        StepOperator(bravo, dt);

        // Hostage Rescue Check
        foreach (var h in hostages)
        {
            if (!h.isRescued)
            {
                if (Vector2.Distance(alpha.pos, h.pos) < CellSize * 0.8f || Vector2.Distance(bravo.pos, h.pos) < CellSize * 0.8f)
                {
                    h.isRescued = true;
                    totalScore += 500;
                    PlayClip(sndHostageSafe, 1.0f);
                    SpawnFloatText("HOSTAGE RESCUED! +500", h.pos, Color.green);
                    Destroy(h.go);
                }
            }
        }

        // Bomb Defusal Check
        if (currentBomb != null && !currentBomb.isDefused)
        {
            Vector3 bWorld = GridToWorld(currentBomb.gridPos.x, currentBomb.gridPos.y);
            if (Vector2.Distance(alpha.pos, bWorld) < CellSize * 0.9f || Vector2.Distance(bravo.pos, bWorld) < CellSize * 0.9f)
            {
                currentBomb.isDefused = true;
                totalScore += 1000;
                PlayClip(sndHostageSafe, 1.0f);
                SpawnFloatText("BOMB DEFUSED! +1000", bWorld, Color.yellow);
                Destroy(currentBomb.go);
            }
        }

        // Operator Combat & Suspect Combat
        UpdateCombat(dt);

        // Check Victory / Defeat Conditions
        bool allSuspectsDown = true;
        foreach (var s in suspects)
        {
            if (!s.isNeutralized) { allSuspectsDown = false; break; }
        }

        bool allHostagesSafe = true;
        foreach (var h in hostages)
        {
            if (!h.isRescued) { allHostagesSafe = false; break; }
        }

        bool bombSafe = (currentBomb == null || currentBomb.isDefused);

        if (allSuspectsDown && allHostagesSafe && bombSafe)
        {
            OnMissionVictory();
            return;
        }

        if (alpha.hp <= 0 && bravo.hp <= 0)
        {
            OnMissionFailed(new LocalizedText("모든 요원이 무력화되었습니다.", "All operators KIA.", "全隊員が無力化されました。", "Todos los agentes abatidos."));
        }
    }

    void StepOperator(Operator op, float dt)
    {
        if (op.hp <= 0) return;

        if (op.waypointIdx < op.waypoints.Count)
        {
            Vector2Int targetG = op.waypoints[op.waypointIdx];
            Vector2 targetW = GridToWorld(targetG.x, targetG.y);

            // Door Breach check
            if (tiles[targetG.x, targetG.y] == TileType.DoorClosed)
            {
                BreachDoor(targetG.x, targetG.y);
            }

            Vector2 moveDir = (targetW - op.pos);
            float dist = moveDir.magnitude;

            if (dist > 0.05f)
            {
                moveDir /= dist;
                float speed = op.hasShield ? 2.4f : 3.0f;
                op.pos += moveDir * speed * dt;
                op.angle = Mathf.Atan2(moveDir.y, moveDir.x) * Mathf.Rad2Deg;
                op.go.transform.position = new Vector3(op.pos.x, op.pos.y, -0.3f);
                op.go.transform.rotation = Quaternion.Euler(0f, 0f, op.angle);
            }
            else
            {
                op.pos = targetW;
                op.waypointIdx++;
            }
        }
    }

    void BreachDoor(int x, int y)
    {
        tiles[x, y] = TileType.DoorOpen;
        if (tileGos[x, y] != null)
        {
            tileGos[x, y].GetComponent<MeshRenderer>().material = doorOpenMat;
        }

        PlayClip(sndDoorBreach, 1.0f);
        cameraTrauma = Mathf.Clamp01(cameraTrauma + 0.35f);
        SpawnFloatText("DOOR BREACHED!", GridToWorld(x, y), new Color(1f, 0.7f, 0.2f));

        // Stun suspects within 1.8 units behind door
        Vector3 doorPos = GridToWorld(x, y);
        foreach (var s in suspects)
        {
            if (!s.isNeutralized && Vector2.Distance(s.pos, doorPos) < CellSize * 1.8f)
            {
                s.stunTimer = 2.5f;
                SpawnFloatText("STUNNED!", s.pos, Color.yellow);
            }
        }
    }

    public void ThrowFlashbang()
    {
        if (phase != Phase.Executing || !bravo.hasFlashbang || bravo.hp <= 0) return;
        bravo.hasFlashbang = false;

        // Flashbang throws ahead in direction of Bravo's forward vector
        Vector2 flashPos = bravo.pos + new Vector2(Mathf.Cos(bravo.angle * Mathf.Deg2Rad), Mathf.Sin(bravo.angle * Mathf.Deg2Rad)) * (CellSize * 2.8f);

        PlayClip(sndFlashbang, 1.2f);
        flashWhiteout = 1.0f;
        cameraTrauma = Mathf.Clamp01(cameraTrauma + 0.5f);
        SpawnFloatText("FLASHBANG DETONATED!", flashPos, Color.white);

        foreach (var s in suspects)
        {
            if (!s.isNeutralized && Vector2.Distance(s.pos, flashPos) < CellSize * 3.5f)
            {
                s.stunTimer = 4.5f;
                SpawnFloatText("STUNNED x4s!", s.pos, Color.yellow);
            }
        }
    }

    void UpdateCombat(float dt)
    {
        // Reduce fire cooldowns
        alpha.fireCooldown -= dt;
        bravo.fireCooldown -= dt;

        // Operator firing at suspects in LOS
        TryOperatorShoot(alpha, 25, 0.45f);
        TryOperatorShoot(bravo, 40, 0.22f); // Bravo M4 high ROF

        // Suspects targeting operators
        foreach (var s in suspects)
        {
            if (s.isNeutralized) continue;

            if (s.stunTimer > 0f)
            {
                s.stunTimer -= dt;
                continue;
            }

            s.fireCooldown -= dt;
            if (s.fireCooldown <= 0f)
            {
                // Target closest operator in LOS
                Operator target = null;
                float bestDist = 999f;

                if (alpha.hp > 0 && HasLineOfSight(s.pos, alpha.pos))
                {
                    float d = Vector2.Distance(s.pos, alpha.pos);
                    if (d < bestDist) { bestDist = d; target = alpha; }
                }

                if (bravo.hp > 0 && HasLineOfSight(s.pos, bravo.pos))
                {
                    float d = Vector2.Distance(s.pos, bravo.pos);
                    if (d < bestDist) { bestDist = d; target = bravo; }
                }

                if (target != null && bestDist < CellSize * 6.5f)
                {
                    s.fireCooldown = (s.type == SuspectType.JuggernautBoss) ? 0.35f : 0.85f;
                    int dmg = (s.type == SuspectType.Sniper) ? 45 : (s.type == SuspectType.Shotgunner ? 35 : 20);

                    // Shield mitigation if hitting Alpha from front
                    if (target == alpha && alpha.hasShield)
                    {
                        dmg = Mathf.RoundToInt(dmg * 0.25f); // 75% shielded!
                        SpawnFloatText("BLOCKED! -" + dmg, target.pos, Color.cyan);
                    }
                    else
                    {
                        SpawnFloatText("-" + dmg + " HP", target.pos, Color.red);
                    }

                    target.hp = Mathf.Max(0, target.hp - dmg);
                    cameraTrauma = Mathf.Clamp01(cameraTrauma + 0.15f);
                    PlayClip(sndShotgun, 0.8f);

                    AddTracer(s.pos, target.pos, new Color(1f, 0.4f, 0.1f));
                }
            }
        }
    }

    void TryOperatorShoot(Operator op, int damage, float interval)
    {
        if (op.hp <= 0 || op.fireCooldown > 0f) return;

        Suspect target = null;
        float bestDist = 999f;

        foreach (var s in suspects)
        {
            if (s.isNeutralized) continue;
            if (HasLineOfSight(op.pos, s.pos))
            {
                float d = Vector2.Distance(op.pos, s.pos);
                if (d < bestDist) { bestDist = d; target = s; }
            }
        }

        if (target != null && bestDist < CellSize * 6.5f)
        {
            op.fireCooldown = interval;
            target.hp -= damage;
            PlayClip(sndM4Burst, 0.85f);
            AddTracer(op.pos, target.pos, new Color(0.3f, 0.85f, 1f));

            if (target.hp <= 0)
            {
                target.isNeutralized = true;
                totalScore += 250;
                PlayClip(sndSuspectDown, 1.0f);
                SpawnFloatText("NEUTRALIZED! +250", target.pos, Color.red);
                Destroy(target.go);
            }
            else
            {
                SpawnFloatText("-" + damage, target.pos, Color.yellow);
            }
        }
    }

    bool HasLineOfSight(Vector2 a, Vector2 b)
    {
        // Raycast grid tiles between a and b
        Vector2 dir = (b - a);
        float dist = dir.magnitude;
        int steps = Mathf.CeilToInt(dist / (CellSize * 0.4f));

        for (int i = 1; i < steps; i++)
        {
            Vector2 checkPt = a + dir * ((float)i / steps);
            Vector2Int g = WorldToGrid(new Vector3(checkPt.x, checkPt.y, 0f));

            if (tiles[g.x, g.y] == TileType.Wall || tiles[g.x, g.y] == TileType.DoorClosed)
            {
                return false;
            }
        }
        return true;
    }

    void AddTracer(Vector2 from, Vector2 to, Color c)
    {
        tracers.Add(new BulletTracer
        {
            start = new Vector3(from.x, from.y, -0.4f),
            end = new Vector3(to.x, to.y, -0.4f),
            color = c,
            life = 0.08f
        });
    }

    void OnMissionVictory()
    {
        phase = Phase.Victory;
        PlayClip(sndMissionSuccess, 1.0f);
        cameraTrauma = 0.35f;
    }

    void OnMissionFailed(LocalizedText reason)
    {
        phase = Phase.Failed;
        PlayClip(sndMissionFail, 1.0f);
        SpawnFloatText(reason.Get(currentLang), Vector3.zero, Color.red);
    }

    void SpawnFloatText(string text, Vector3 pos, Color c)
    {
        floatTexts.Add(new FloatText
        {
            text = text,
            worldPos = pos,
            color = c,
            life = 1.3f,
            maxLife = 1.3f
        });
    }

    void UpdateFloatingTexts()
    {
        for (int i = floatTexts.Count - 1; i >= 0; i--)
        {
            var ft = floatTexts[i];
            ft.life -= Time.deltaTime;
            ft.worldPos.y += Time.deltaTime * 0.6f;
            if (ft.life <= 0f) floatTexts.RemoveAt(i);
            else floatTexts[i] = ft;
        }

        for (int i = tracers.Count - 1; i >= 0; i--)
        {
            var tr = tracers[i];
            tr.life -= Time.deltaTime;
            if (tr.life <= 0f) tracers.RemoveAt(i);
            else tracers[i] = tr;
        }
    }

    void OnGUI()
    {
        GUI.skin.label.fontSize = 13;
        GUI.skin.button.fontSize = 12;

        var m = missions[currentMissionIdx];

        // Top Control Header Bar
        GUILayout.BeginArea(new Rect(12, 10, Screen.width - 24, 95));
        GUILayout.BeginHorizontal();

        // Mission Title & Score
        GUILayout.BeginVertical(GUI.skin.box, GUILayout.Width(240));
        GUILayout.Label("<color=#38bdf8><b>MISSION " + m.missionNum + "/12</b></color>: " + m.title.Get(currentLang));
        GUILayout.Label("🏆 Score: <b>" + totalScore + "</b> | Time: <b>" + missionTimer.ToString("F1") + "s</b>");
        GUILayout.EndVertical();

        GUILayout.FlexibleSpace();

        // Operators Status
        GUILayout.BeginVertical(GUI.skin.box, GUILayout.Width(220));
        GUILayout.Label("🛡️ Alpha (Shield): <b>" + alpha.hp + "/" + alpha.maxHp + "</b>");
        GUILayout.Label("⚡ Bravo (Assault): <b>" + bravo.hp + "/" + bravo.maxHp + "</b>" + (bravo.hasFlashbang ? " [💥 Flash]" : ""));
        GUILayout.EndVertical();

        GUILayout.FlexibleSpace();

        // Action Buttons
        if (phase == Phase.Planning)
        {
            if (GUILayout.Button("⚡ AUTO\nPLAN", GUILayout.Width(75), GUILayout.Height(50)))
            {
                ApplyAutoPlan();
            }

            if (GUILayout.Button("🗑️ CLEAR\nPATHS", GUILayout.Width(75), GUILayout.Height(50)))
            {
                ClearWaypoints();
            }

            if (GUILayout.Button("<color=#4ade80><b>▶ EXECUTE\nBREACH</b></color>", GUILayout.Width(95), GUILayout.Height(50)))
            {
                ExecuteBreach();
            }
        }
        else if (phase == Phase.Executing)
        {
            if (bravo.hasFlashbang)
            {
                if (GUILayout.Button("<color=#fde047><b>💥 THROW\nFLASHBANG</b></color>", GUILayout.Width(100), GUILayout.Height(50)))
                {
                    ThrowFlashbang();
                }
            }

            if (GUILayout.Button("🔄 RESTART\nMISSION", GUILayout.Width(85), GUILayout.Height(50)))
            {
                LoadMission(currentMissionIdx);
            }
        }

        // Mission Selector Button
        if (GUILayout.Button("🗺️ MISSIONS\n(1~12)", GUILayout.Width(90), GUILayout.Height(50)))
        {
            showMissionSelect = !showMissionSelect;
        }

        // Language Switcher Toggle Button (User Rule: 언어 현지화)
        if (GUILayout.Button("🌐 " + currentLang.ToString(), GUILayout.Width(60), GUILayout.Height(50)))
        {
            currentLang = (Language)(((int)currentLang + 1) % 4);
        }

        GUILayout.EndHorizontal();
        GUILayout.EndArea();

        // Operator Selector Tab (in Planning Phase)
        if (phase == Phase.Planning)
        {
            Rect selRect = new Rect(15, 110, 240, 45);
            GUILayout.BeginArea(selRect, GUI.skin.box);
            GUILayout.BeginHorizontal();
            if (GUILayout.Toggle(selectedOperator == 0, "🛡️ Alpha (Shield)", "Button")) selectedOperator = 0;
            if (GUILayout.Toggle(selectedOperator == 1, "⚡ Bravo (Assault)", "Button")) selectedOperator = 1;
            GUILayout.EndHorizontal();
            GUILayout.EndArea();
        }

        // Whiteout Flashbang Overlay
        if (flashWhiteout > 0.01f)
        {
            GUI.color = new Color(1f, 1f, 1f, Mathf.Clamp01(flashWhiteout));
            GUI.DrawTexture(new Rect(0, 0, Screen.width, Screen.height), Texture2D.whiteTexture);
            GUI.color = Color.white;
        }

        // Floating Damage / Status Texts
        foreach (var ft in floatTexts)
        {
            Vector3 screenPt = mainCam.WorldToScreenPoint(ft.worldPos);
            if (screenPt.z > 0f)
            {
                float alphaVal = Mathf.Clamp01(ft.life / ft.maxLife);
                GUI.color = new Color(ft.color.r, ft.color.g, ft.color.b, alphaVal);
                GUI.Label(new Rect(screenPt.x - 100, Screen.height - screenPt.y - 12, 200, 24), "<b>" + ft.text + "</b>", GetCenterStyle(ft.color));
            }
        }
        GUI.color = Color.white;

        // Victory Modal
        if (phase == Phase.Victory)
        {
            Rect winRect = new Rect(Screen.width * 0.5f - 200, Screen.height * 0.5f - 100, 400, 200);
            GUI.Box(winRect, "");
            GUILayout.BeginArea(winRect);
            GUILayout.Space(15);
            GUILayout.Label("<size=18><color=#4ade80><b>★ MISSION ACCOMPLISHED ★</b></color></size>", GetCenterStyle(Color.green));
            GUILayout.Space(8);
            GUILayout.Label(m.title.Get(currentLang) + " Cleared in " + missionTimer.ToString("F1") + "s!", GetCenterStyle(Color.white));
            GUILayout.Label("Hostages secured, armed threats neutralized.", GetCenterStyle(Color.cyan));
            GUILayout.Space(15);
            GUILayout.BeginHorizontal();
            GUILayout.FlexibleSpace();
            if (GUILayout.Button(currentMissionIdx < 11 ? "▶ NEXT OPERATION (" + (currentMissionIdx + 2) + ")" : "🏆 PLAY AGAIN", GUILayout.Width(190), GUILayout.Height(40)))
            {
                LoadMission(currentMissionIdx < 11 ? currentMissionIdx + 1 : 0);
            }
            GUILayout.FlexibleSpace();
            GUILayout.EndHorizontal();
            GUILayout.EndArea();
        }

        // Failed Modal
        if (phase == Phase.Failed)
        {
            Rect failRect = new Rect(Screen.width * 0.5f - 200, Screen.height * 0.5f - 90, 400, 180);
            GUI.Box(failRect, "");
            GUILayout.BeginArea(failRect);
            GUILayout.Space(15);
            GUILayout.Label("<size=18><color=#ef4444><b>☠️ MISSION FAILED ☠️</b></color></size>", GetCenterStyle(Color.red));
            GUILayout.Space(8);
            GUILayout.Label("Critical tactical casualty in " + m.title.Get(currentLang), GetCenterStyle(Color.white));
            GUILayout.Space(15);
            GUILayout.BeginHorizontal();
            GUILayout.FlexibleSpace();
            if (GUILayout.Button("🔄 RETRY MISSION", GUILayout.Width(170), GUILayout.Height(40)))
            {
                LoadMission(currentMissionIdx);
            }
            GUILayout.FlexibleSpace();
            GUILayout.EndHorizontal();
            GUILayout.EndArea();
        }

        // 12-Mission Selector Modal (User Rule: Minimum 10 stages accessible)
        if (showMissionSelect)
        {
            Rect modalRect = new Rect(Screen.width * 0.5f - 270, 105, 540, 430);
            GUI.Box(modalRect, "<b>TACTICAL OPERATIONS (1~12)</b>");
            GUILayout.BeginArea(new Rect(modalRect.x + 15, modalRect.y + 35, modalRect.width - 30, modalRect.height - 45));

            int colsCount = 2;
            for (int i = 0; i < missions.Length; i += colsCount)
            {
                GUILayout.BeginHorizontal();
                for (int c = 0; c < colsCount; c++)
                {
                    int idx = i + c;
                    if (idx < missions.Length)
                    {
                        var mis = missions[idx];
                        string bossTag = mis.isBossMission ? " ★ BOSS" : "";
                        string btnText = "<b>M" + mis.missionNum + "</b>: " + mis.title.Get(currentLang) + bossTag;
                        if (GUILayout.Button(btnText, GUILayout.Height(50)))
                        {
                            showMissionSelect = false;
                            LoadMission(idx);
                        }
                    }
                }
                GUILayout.EndHorizontal();
                GUILayout.Space(3);
            }

            GUILayout.Space(6);
            if (GUILayout.Button("❌ CLOSE", GUILayout.Height(28)))
            {
                showMissionSelect = false;
            }
            GUILayout.EndArea();
        }
    }

    GUIStyle GetCenterStyle(Color c)
    {
        GUIStyle s = new GUIStyle(GUI.skin.label);
        s.alignment = TextAnchor.MiddleCenter;
        s.normal.textColor = c;
        return s;
    }

    void PlayClip(AudioClip clip, float vol)
    {
        if (clip != null && audioSource != null)
        {
            audioSource.PlayOneShot(clip, vol);
        }
    }

    void BuildAudioClips()
    {
        sndRadio = SynthAudio(0.12f, t => {
            float noise = (UnityEngine.Random.value * 2f - 1f) * 0.4f;
            float tone = Mathf.Sin(2f * Mathf.PI * 1800f * t) * 0.6f;
            return (noise + tone) * (1f - t);
        });

        sndM4Burst = SynthAudio(0.18f, t => {
            float noise = (UnityEngine.Random.value * 2f - 1f) * 0.7f;
            float punch = Mathf.Sin(2f * Mathf.PI * 150f * t) * Mathf.Exp(-t * 20f);
            return (noise + punch) * 0.8f;
        });

        sndShotgun = SynthAudio(0.28f, t => {
            float noise = (UnityEngine.Random.value * 2f - 1f) * 0.9f;
            float boom = Mathf.Sin(2f * Mathf.PI * 60f * t) * Mathf.Exp(-t * 10f);
            return (noise + boom) * 0.9f;
        });

        sndDoorBreach = SynthAudio(0.35f, t => {
            float crack = (UnityEngine.Random.value * 2f - 1f) * 0.8f;
            float thud = Mathf.Sin(2f * Mathf.PI * 80f * t) * Mathf.Exp(-t * 8f);
            return (crack + thud) * 0.9f;
        });

        sndFlashbang = SynthAudio(0.8f, t => {
            float boom = (UnityEngine.Random.value * 2f - 1f) * Mathf.Exp(-t * 25f);
            float tinnitus = Mathf.Sin(2f * Mathf.PI * 3400f * t) * Mathf.Exp(-t * 3f) * 0.45f;
            return boom + tinnitus;
        });

        sndSuspectDown = SynthAudio(0.16f, t => {
            return (UnityEngine.Random.value * 2f - 1f) * 0.5f + Mathf.Sin(2f * Mathf.PI * 100f * t) * 0.5f;
        });

        sndHostageSafe = SynthAudio(0.35f, t => {
            float f = (t < 0.17f) ? 587.33f : 880.00f; // D5 to A5
            return Mathf.Sin(2f * Mathf.PI * f * t) * (1f - t);
        });

        sndMissionSuccess = SynthAudio(0.7f, t => {
            float f = 523.25f;
            if (t > 0.16f) f = 659.25f;
            if (t > 0.32f) f = 783.99f;
            if (t > 0.48f) f = 1046.50f;
            return Mathf.Sin(2f * Mathf.PI * f * t) * (1f - t);
        });

        sndMissionFail = SynthAudio(0.5f, t => {
            float f = Mathf.Lerp(180f, 60f, t);
            return Mathf.Sin(2f * Mathf.PI * f * t) * (1f - t);
        });
    }

    AudioClip SynthAudio(float length, Func<float, float> generator)
    {
        int sampleRate = 22050;
        int totalSamples = Mathf.FloorToInt(sampleRate * length);
        float[] samples = new float[totalSamples];
        for (int i = 0; i < totalSamples; i++)
        {
            float t = (float)i / sampleRate;
            samples[i] = Mathf.Clamp(generator(t), -1f, 1f);
        }
        var clip = AudioClip.Create("SwatClip", totalSamples, 1, sampleRate, false);
        clip.SetData(samples, 0);
        return clip;
    }
}
