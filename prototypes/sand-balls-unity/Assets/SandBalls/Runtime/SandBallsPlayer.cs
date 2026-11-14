using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class SandBallsPlayer : MonoBehaviour
{
    public enum Language { KO, EN, JA, ES }
    private Language currentLang = Language.KO;

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

    public class Ball
    {
        public int id;
        public Vector2 pos;
        public Vector2 vel;
        public float radius;
        public bool isColored;
        public Color color;
        public bool isCollected;
        public GameObject go;
    }

    public class MultiplierGate
    {
        public Vector2 pos;
        public Vector2 size;
        public int multiplier;
        public HashSet<int> passedBallIds = new HashSet<int>();
        public GameObject go;
    }

    public class BumperPeg
    {
        public Vector2 pos;
        public float radius;
        public GameObject go;
    }

    public class RotatingObstacle
    {
        public Vector2 center;
        public float length;
        public float angle;
        public float speed;
        public GameObject go;
    }

    public class StageDef
    {
        public int stageNum;
        public LocalizedText title;
        public LocalizedText briefing;
        public int truckQuota;
        public int initialColoredBalls;
        public int initialDormantBalls;
        public List<Vector2> dormantClusters;
        public List<MultiplierGate> gates;
        public List<BumperPeg> bumpers;
        public List<RotatingObstacle> spinners;
    }

    // Grid Dimensions for Sand Bed
    private const int SandGridW = 44;
    private const int SandGridH = 64;
    private const float BoardW = 8.8f;
    private const float BoardH = 12.8f;
    private const float HalfW = BoardW * 0.5f; // -4.4 to +4.4
    private const float HalfH = BoardH * 0.5f; // -6.4 to +6.4

    private bool[,] isSandDug = new bool[SandGridW, SandGridH];
    private Texture2D sandTexture;
    private GameObject sandQuadGo;

    // Camera & Visuals
    private Camera mainCam;
    private Light dirLight;
    private Material ballMatColored;
    private Material ballMatDormant;

    // Simulation Entities
    private List<Ball> balls = new List<Ball>();
    private List<MultiplierGate> activeGates = new List<MultiplierGate>();
    private List<BumperPeg> activeBumpers = new List<BumperPeg>();
    private List<RotatingObstacle> activeSpinners = new List<RotatingObstacle>();

    // Truck Loading
    private GameObject truckGo;
    private Vector3 truckBasePos = new Vector3(0f, -5.6f, 0f);
    private float truckOffsetAnim = 0f;
    private int collectedCount = 0;
    private int currentQuota = 25;

    // Particles & FX
    private struct DustParticle
    {
        public Vector3 pos;
        public Vector3 vel;
        public Color color;
        public float life;
        public float maxLife;
    }
    private List<DustParticle> dustParticles = new List<DustParticle>();

    private struct FloatText
    {
        public string text;
        public Vector3 worldPos;
        public Color color;
        public float life;
        public float maxLife;
    }
    private List<FloatText> floatTexts = new List<FloatText>();

    // Audio
    private AudioSource audioSource;
    private AudioClip sndCarve;
    private AudioClip sndBallPop;
    private AudioClip sndInfect;
    private AudioClip sndMultiplier;
    private AudioClip sndTruckLoad;
    private AudioClip sndTruckHorn;
    private AudioClip sndVictory;

    // State
    public enum GameState { Playing, Victory, Failed }
    private GameState state = GameState.Playing;
    private int currentStageIdx = 0;
    private bool showStageSelect = false;
    private float cameraTrauma = 0f;
    private float carveSoundCooldown = 0f;

    // 12 Mandatory Stages (User Rule: Minimum 10 stages accessible)
    private StageDef[] stages;

    void Awake()
    {
        SetupCameraAndLighting();
        CreateMaterials();
        BuildAudioClips();
        BuildSandMesh();
        BuildTruckModel();
        BuildStagesDatabase();
        LoadStage(0);
    }

    void SetupCameraAndLighting()
    {
        var camGo = new GameObject("Main Camera");
        camGo.tag = "MainCamera";
        mainCam = camGo.AddComponent<Camera>();
        mainCam.clearFlags = CameraClearFlags.SolidColor;
        mainCam.backgroundColor = new Color(0.11f, 0.10f, 0.09f); // warm desert sand dark quarry
        camGo.transform.position = new Vector3(0f, 0f, -14.2f);
        camGo.transform.rotation = Quaternion.identity;
        mainCam.fieldOfView = 54f;

        var lightGo = new GameObject("DirLight");
        dirLight = lightGo.AddComponent<Light>();
        dirLight.type = LightType.Directional;
        dirLight.color = new Color(1.0f, 0.95f, 0.85f);
        dirLight.intensity = 1.2f;
        lightGo.transform.rotation = Quaternion.Euler(45f, -20f, 0f);

        audioSource = gameObject.AddComponent<AudioSource>();
        audioSource.playOnAwake = false;
    }

    void CreateMaterials()
    {
        ballMatColored = new Material(Shader.Find("Sprites/Default"));
        ballMatColored.color = new Color(0.2f, 0.85f, 1f);

        ballMatDormant = new Material(Shader.Find("Sprites/Default"));
        ballMatDormant.color = new Color(0.55f, 0.58f, 0.65f);
    }

    void BuildSandMesh()
    {
        sandQuadGo = GameObject.CreatePrimitive(PrimitiveType.Quad);
        sandQuadGo.name = "SandQuad";
        sandQuadGo.transform.position = new Vector3(0f, 0f, 0.2f);
        sandQuadGo.transform.localScale = new Vector3(BoardW, BoardH, 1f);

        sandTexture = new Texture2D(SandGridW, SandGridH, TextureFormat.RGBA32, false);
        sandTexture.filterMode = FilterMode.Point;
        sandTexture.wrapMode = TextureWrapMode.Clamp;

        var mat = new Material(Shader.Find("Unlit/Transparent"));
        mat.mainTexture = sandTexture;
        sandQuadGo.GetComponent<MeshRenderer>().material = mat;

        // Board Boundary Walls
        CreateWall(new Vector3(-HalfW - 0.25f, 0f, 0f), new Vector3(0.5f, BoardH + 1f, 1f));
        CreateWall(new Vector3(HalfW + 0.25f, 0f, 0f), new Vector3(0.5f, BoardH + 1f, 1f));
        CreateWall(new Vector3(0f, HalfH + 0.25f, 0f), new Vector3(BoardW + 1f, 0.5f, 1f));
    }

    void CreateWall(Vector3 pos, Vector3 scale)
    {
        var wall = GameObject.CreatePrimitive(PrimitiveType.Cube);
        wall.name = "Wall";
        wall.transform.position = pos;
        wall.transform.localScale = scale;
        var m = new Material(Shader.Find("Sprites/Default"));
        m.color = new Color(0.28f, 0.25f, 0.22f);
        wall.GetComponent<MeshRenderer>().material = m;
    }

    void BuildTruckModel()
    {
        truckGo = new GameObject("DumpTruck");
        truckGo.transform.position = truckBasePos;

        // Truck Flatbed
        var bed = GameObject.CreatePrimitive(PrimitiveType.Cube);
        bed.name = "Bed";
        bed.transform.SetParent(truckGo.transform, false);
        bed.transform.localPosition = new Vector3(-0.6f, -0.1f, -0.1f);
        bed.transform.localScale = new Vector3(2.6f, 0.7f, 1.2f);
        var bedMat = new Material(Shader.Find("Sprites/Default"));
        bedMat.color = new Color(0.15f, 0.55f, 0.95f);
        bed.GetComponent<MeshRenderer>().material = bedMat;

        // Cabin
        var cab = GameObject.CreatePrimitive(PrimitiveType.Cube);
        cab.name = "Cab";
        cab.transform.SetParent(truckGo.transform, false);
        cab.transform.localPosition = new Vector3(1.1f, 0.15f, -0.1f);
        cab.transform.localScale = new Vector3(1.0f, 1.1f, 1.1f);
        var cabMat = new Material(Shader.Find("Sprites/Default"));
        cabMat.color = new Color(0.95f, 0.65f, 0.15f);
        cab.GetComponent<MeshRenderer>().material = cabMat;

        // Wheels
        CreateWheel(truckGo.transform, new Vector3(-1.4f, -0.55f, -0.2f));
        CreateWheel(truckGo.transform, new Vector3(-0.2f, -0.55f, -0.2f));
        CreateWheel(truckGo.transform, new Vector3(1.1f, -0.55f, -0.2f));
    }

    void CreateWheel(Transform parent, Vector3 localPos)
    {
        var wheel = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        wheel.transform.SetParent(parent, false);
        wheel.transform.localPosition = localPos;
        wheel.transform.rotation = Quaternion.Euler(90f, 0f, 0f);
        wheel.transform.localScale = new Vector3(0.55f, 0.15f, 0.55f);
        var m = new Material(Shader.Find("Sprites/Default"));
        m.color = new Color(0.15f, 0.15f, 0.18f);
        wheel.GetComponent<MeshRenderer>().material = m;
    }

    void BuildStagesDatabase()
    {
        stages = new StageDef[]
        {
            // Stage 1: Golden Dunes
            new StageDef
            {
                stageNum = 1,
                title = new LocalizedText("황금빛 모래 언덕", "Golden Dunes", "黄金の砂丘", "Dunas Doradas"),
                briefing = new LocalizedText("마우스/터치로 모래를 드래그하여 길을 파내세요. 구체들을 하단 덤프트럭에 적재하십시오.", "Drag mouse or finger to carve sand. Guide balls into the dump truck below.", "マウスや指で砂を掘って道を作ろう。ボールを下のトラックへ運ぼう。", "Arrastra para cavar la arena. Guía las bolas al camión."),
                truckQuota = 15,
                initialColoredBalls = 18,
                initialDormantBalls = 0,
                dormantClusters = new List<Vector2>(),
                gates = new List<MultiplierGate>(),
                bumpers = new List<BumperPeg>(),
                spinners = new List<RotatingObstacle>()
            },

            // Stage 2: Inactive Stone Herd
            new StageDef
            {
                stageNum = 2,
                title = new LocalizedText("잠든 회색 구체 군집", "Dormant Stone Herd", "眠れる灰色の球体群", "Manada de Bolas Inactivas"),
                briefing = new LocalizedText("채색된 구체가 회색 잠든 구체에 닿으면 활성화됩니다! 모든 구체를 깨워 적재하십시오.", "Colored balls awaken dormant grey balls upon contact! Awaken them all.", "カラーボールが灰色のボールに触れると覚醒！全員を起こして積載しよう。", "¡Las bolas de color despiertan a las grises! Despiértalas todas."),
                truckQuota = 35,
                initialColoredBalls = 8,
                initialDormantBalls = 35,
                dormantClusters = new List<Vector2> { new Vector2(0f, 0.5f), new Vector2(-1.5f, -2.0f) },
                gates = new List<MultiplierGate>(),
                bumpers = new List<BumperPeg> { new BumperPeg { pos = new Vector2(1.5f, -1.0f), radius = 0.45f } },
                spinners = new List<RotatingObstacle>()
            },

            // Stage 3: Multiplier Gateway x2
            new StageDef
            {
                stageNum = 3,
                title = new LocalizedText("x2 증폭 게이트 협곡", "Multiplier Gateway x2", "x2 増殖ゲートの峡谷", "Cañón Multiplicador x2"),
                briefing = new LocalizedText("파란색 x2 게이트를 통과하면 구체가 2배로 복제됩니다! 폭포수처럼 적재하십시오.", "Passing through the blue x2 gate duplicates your balls! Cascade into the truck.", "青いx2ゲートを通るとボールが2倍に増殖！大量に積み込もう。", "¡Cruzar la puerta azul x2 duplica las bolas!"),
                truckQuota = 45,
                initialColoredBalls = 12,
                initialDormantBalls = 20,
                dormantClusters = new List<Vector2> { new Vector2(1.8f, 1.2f) },
                gates = new List<MultiplierGate> {
                    new MultiplierGate { pos = new Vector2(0f, -0.8f), size = new Vector2(2.4f, 0.4f), multiplier = 2 }
                },
                bumpers = new List<BumperPeg>(),
                spinners = new List<RotatingObstacle>()
            },

            // Stage 4: Zig-Zag Bumper Ravine
            new StageDef
            {
                stageNum = 4,
                title = new LocalizedText("지그재그 핀볼 협곡", "Zig-Zag Bumper Ravine", "ジグザグピンボール渓谷", "Barranco de Rebotes"),
                briefing = new LocalizedText("탄성 범퍼가 구체들을 튕겨냅니다. 지그재그 모래 터널을 파내어 안전하게 유도하세요.", "Elastic bumpers deflect balls. Carve a zig-zag tunnel to guide them safely.", "弾性バンパーがボールを弾く。ジグザグトンネルを掘って誘導しよう。", "Los parachoques rebotan las bolas. Cava un túnel en zigzag."),
                truckQuota = 40,
                initialColoredBalls = 15,
                initialDormantBalls = 30,
                dormantClusters = new List<Vector2> { new Vector2(-2.0f, 1.0f), new Vector2(2.0f, -1.5f) },
                gates = new List<MultiplierGate>(),
                bumpers = new List<BumperPeg> {
                    new BumperPeg { pos = new Vector2(-1.2f, 1.8f), radius = 0.5f },
                    new BumperPeg { pos = new Vector2(1.2f, -0.2f), radius = 0.5f },
                    new BumperPeg { pos = new Vector2(-1.0f, -2.2f), radius = 0.5f }
                },
                spinners = new List<RotatingObstacle>()
            },

            // Stage 5: The Funnel Choke [MID-BOSS CHALLENGE]
            new StageDef
            {
                stageNum = 5,
                title = new LocalizedText("모래 깔때기 협착로 [중간 챌린지]", "The Funnel Choke [MID-BOSS]", "砂の漏斗チョーク [中間試練]", "El Embudo Estrecho [SUB-DESAFÍO]"),
                briefing = new LocalizedText("협착된 좁은 모래 깔때기를 뚫어야 합니다. 회전 막대를 피해 대량 구체를 통과시키세요!", "Breach the narrow funnel. Avoid rotating crossbars to deliver the massive cargo!", "狭い漏斗地帯を突破せよ。回転バーを回避して大荷物を届けよう！", "¡Supera el estrecho embudo evitando las barras giratorias!"),
                truckQuota = 60,
                initialColoredBalls = 15,
                initialDormantBalls = 50,
                dormantClusters = new List<Vector2> { new Vector2(0f, 2.0f), new Vector2(-2.2f, -1.0f), new Vector2(2.2f, -1.0f) },
                gates = new List<MultiplierGate> {
                    new MultiplierGate { pos = new Vector2(0f, -2.5f), size = new Vector2(2.0f, 0.4f), multiplier = 2 }
                },
                bumpers = new List<BumperPeg>(),
                spinners = new List<RotatingObstacle> {
                    new RotatingObstacle { center = new Vector2(0f, 0.2f), length = 2.4f, speed = 80f }
                }
            },

            // Stage 6: Twin Pathway Divide
            new StageDef
            {
                stageNum = 6,
                title = new LocalizedText("좌우 분기 트윈 게이트", "Twin Pathway Divide", "左右分岐ツインゲート", "Bifurcación Gemela"),
                briefing = new LocalizedText("좌측과 우측에 각각 x2 게이트가 있습니다. 양 갈래로 길을 파내어 4배 증폭을 노리세요!", "Dual x2 gates on left and right. Split pathways to maximize ball count!", "左右にそれぞれx2ゲート。両方に道を掘って最大増殖を狙え！", "Puertas x2 a izquierda y derecha. ¡Divide para multiplicar al máximo!"),
                truckQuota = 70,
                initialColoredBalls = 20,
                initialDormantBalls = 40,
                dormantClusters = new List<Vector2> { new Vector2(-1.8f, 0.5f), new Vector2(1.8f, 0.5f) },
                gates = new List<MultiplierGate> {
                    new MultiplierGate { pos = new Vector2(-2.2f, -1.5f), size = new Vector2(1.8f, 0.4f), multiplier = 2 },
                    new MultiplierGate { pos = new Vector2(2.2f, -1.5f), size = new Vector2(1.8f, 0.4f), multiplier = 2 }
                },
                bumpers = new List<BumperPeg>(),
                spinners = new List<RotatingObstacle>()
            },

            // Stage 7: Spinning Paddle Mill
            new StageDef
            {
                stageNum = 7,
                title = new LocalizedText("회전 물레방아 채석장", "Spinning Paddle Mill", "回転水車の採石場", "Molino de Aspas Giratorias"),
                briefing = new LocalizedText("두 개의 회전 패들이 구체들을 이리저리 분산시킵니다. 타이밍에 맞춰 터널을 파내세요.", "Two spinning paddles sweep balls across. Time your digging carefully.", "2基の回転パドルがボールを散らす。タイミングよく砂を掘ろう。", "Dos aspas giratorias dispersan las bolas. Cava con buen ritmo."),
                truckQuota = 65,
                initialColoredBalls = 20,
                initialDormantBalls = 45,
                dormantClusters = new List<Vector2> { new Vector2(0f, 1.5f), new Vector2(0f, -1.2f) },
                gates = new List<MultiplierGate>(),
                bumpers = new List<BumperPeg> { new BumperPeg { pos = new Vector2(-2.0f, -2.5f), radius = 0.5f }, new BumperPeg { pos = new Vector2(2.0f, -2.5f), radius = 0.5f } },
                spinners = new List<RotatingObstacle> {
                    new RotatingObstacle { center = new Vector2(-1.5f, 0.2f), length = 2.0f, speed = -70f },
                    new RotatingObstacle { center = new Vector2(1.5f, 0.2f), length = 2.0f, speed = 70f }
                }
            },

            // Stage 8: Mega Multiplier Gate x3
            new StageDef
            {
                stageNum = 8,
                title = new LocalizedText("x3 대량 복제 폭포", "Mega Multiplier Gate x3", "x3 大量複製の大滝", "Mega Cascada Multiplicadora x3"),
                briefing = new LocalizedText("중앙의 강력한 x3 게이트를 통과하여 150구 이상의 거대한 구체 폭포를 만드세요!", "Channel balls through the x3 gate to trigger a 150+ ball cascade!", "中央のx3ゲートを通し、150球以上の巨大な滝を作ろう！", "¡Cruza la puerta x3 para desatar una cascada de más de 150 bolas!"),
                truckQuota = 100,
                initialColoredBalls = 25,
                initialDormantBalls = 50,
                dormantClusters = new List<Vector2> { new Vector2(-2.0f, 1.5f), new Vector2(2.0f, 1.5f) },
                gates = new List<MultiplierGate> {
                    new MultiplierGate { pos = new Vector2(0f, -1.5f), size = new Vector2(3.0f, 0.45f), multiplier = 3 }
                },
                bumpers = new List<BumperPeg>(),
                spinners = new List<RotatingObstacle>()
            },

            // Stage 9: Underground Geyser Vault
            new StageDef
            {
                stageNum = 9,
                title = new LocalizedText("지하 제트 기류 동굴", "Underground Geyser Vault", "地下間欠泉の洞窟", "Bóveda del Géiser Subterráneo"),
                briefing = new LocalizedText("강력한 탄성 범퍼 군집이 구체들을 위로 쏘아 올립니다. 안정적인 배수로를 구축하십시오.", "Cluster of elastic bumpers launch balls upward. Carve stable drainage channels.", "強力バンパー群がボールを上へ跳ね上げる。安定した排水路を掘ろう。", "Potentes rebotadores lanzan las bolas hacia arriba. Cava un canal seguro."),
                truckQuota = 85,
                initialColoredBalls = 25,
                initialDormantBalls = 60,
                dormantClusters = new List<Vector2> { new Vector2(0f, 1.8f), new Vector2(-2.2f, -0.5f), new Vector2(2.2f, -0.5f) },
                gates = new List<MultiplierGate> {
                    new MultiplierGate { pos = new Vector2(0f, -2.8f), size = new Vector2(2.2f, 0.4f), multiplier = 2 }
                },
                bumpers = new List<BumperPeg> {
                    new BumperPeg { pos = new Vector2(-1.5f, 0.2f), radius = 0.55f },
                    new BumperPeg { pos = new Vector2(1.5f, 0.2f), radius = 0.55f },
                    new BumperPeg { pos = new Vector2(0f, -1.4f), radius = 0.6f }
                },
                spinners = new List<RotatingObstacle>()
            },

            // Stage 10: Sand Canyon Labyrinth [FINAL CHALLENGE]
            new StageDef
            {
                stageNum = 10,
                title = new LocalizedText("모래 협곡 대미로 [최종 챌린지]", "Sand Canyon Labyrinth [FINAL]", "砂峡谷の大迷宮 [最終試練]", "Laberinto del Cañón [FINAL]"),
                briefing = new LocalizedText("복합 미로와 3개의 분할 회전 장벽. 모든 잠든 구체를 깨워 전설의 덤프트럭을 완충하십시오!", "Complex multi-room labyrinth. Awaken every dormant sphere to fill the truck!", "多層迷路と3つの回転障壁。全球体を覚醒させ伝説のトラックを満載せよ！", "Laberinto complejo con 3 barreras. ¡Despierta todas las bolas!"),
                truckQuota = 140,
                initialColoredBalls = 30,
                initialDormantBalls = 90,
                dormantClusters = new List<Vector2> {
                    new Vector2(-2.2f, 2.2f), new Vector2(2.2f, 2.2f),
                    new Vector2(0f, 0.2f),
                    new Vector2(-2.2f, -1.8f), new Vector2(2.2f, -1.8f)
                },
                gates = new List<MultiplierGate> {
                    new MultiplierGate { pos = new Vector2(0f, -3.0f), size = new Vector2(2.8f, 0.45f), multiplier = 2 }
                },
                bumpers = new List<BumperPeg> {
                    new BumperPeg { pos = new Vector2(-1.2f, 1.0f), radius = 0.45f },
                    new BumperPeg { pos = new Vector2(1.2f, 1.0f), radius = 0.45f }
                },
                spinners = new List<RotatingObstacle> {
                    new RotatingObstacle { center = new Vector2(-1.8f, -0.6f), length = 1.8f, speed = 65f },
                    new RotatingObstacle { center = new Vector2(1.8f, -0.6f), length = 1.8f, speed = -65f }
                }
            },

            // Stage 11: The Rainbow Cascade [SECRET 1]
            new StageDef
            {
                stageNum = 11,
                title = new LocalizedText("무지개 대격류 [시크릿 1]", "The Rainbow Cascade [SECRET 1]", "虹の大瀑布 [シークレット1]", "La Cascada Arcoíris [SECRETO 1]"),
                briefing = new LocalizedText("4가지 찬란한 네온 컬러 군집이 잠들어 있습니다. 화려한 무지개 폭포수를 만들어내십시오!", "4 vibrant neon color clusters waiting to be awakened. Unleash a rainbow cascade!", "4色のネオン球体クラスターが眠る。鮮やかな虹の滝を作り出そう！", "¡4 cúmulos de colores neón listos para despertar en cascada!"),
                truckQuota = 180,
                initialColoredBalls = 35,
                initialDormantBalls = 120,
                dormantClusters = new List<Vector2> {
                    new Vector2(-2.0f, 2.0f), new Vector2(2.0f, 2.0f),
                    new Vector2(-2.0f, 0.0f), new Vector2(2.0f, 0.0f)
                },
                gates = new List<MultiplierGate> {
                    new MultiplierGate { pos = new Vector2(-1.8f, -2.2f), size = new Vector2(1.8f, 0.4f), multiplier = 2 },
                    new MultiplierGate { pos = new Vector2(1.8f, -2.2f), size = new Vector2(1.8f, 0.4f), multiplier = 2 }
                },
                bumpers = new List<BumperPeg>(),
                spinners = new List<RotatingObstacle>()
            },

            // Stage 12: Grand Master 300-Ball Super Cargo [CHAMPIONSHIP]
            new StageDef
            {
                stageNum = 12,
                title = new LocalizedText("300구 슈퍼 카고 피날레 [마스터]", "Grand Master 300-Ball [MASTER]", "300球スーパーカーゴ [マスター]", "Gran Maestro 300 Bolas [MAESTRO]"),
                briefing = new LocalizedText("챔피언십 최종 작전: 초대형 메가 트럭에 250개 이상의 구체를 적재하는 궁극의 물리 퍼즐!", "Championship finale: Load over 250 balls into the mega truck. Ultimate sand physics!", "チャンピオンシップ最終章: メガトラックへ250球以上積載する究極物理パズル！", "Final de campeonato: Carga más de 250 bolas en el megacamión."),
                truckQuota = 220,
                initialColoredBalls = 40,
                initialDormantBalls = 160,
                dormantClusters = new List<Vector2> {
                    new Vector2(-2.5f, 2.5f), new Vector2(2.5f, 2.5f),
                    new Vector2(-1.5f, 0.5f), new Vector2(1.5f, 0.5f),
                    new Vector2(0f, -1.5f)
                },
                gates = new List<MultiplierGate> {
                    new MultiplierGate { pos = new Vector2(0f, -3.2f), size = new Vector2(3.4f, 0.5f), multiplier = 3 }
                },
                bumpers = new List<BumperPeg> {
                    new BumperPeg { pos = new Vector2(-2.2f, -0.5f), radius = 0.5f },
                    new BumperPeg { pos = new Vector2(2.2f, -0.5f), radius = 0.5f }
                },
                spinners = new List<RotatingObstacle> {
                    new RotatingObstacle { center = new Vector2(0f, 1.2f), length = 2.6f, speed = 80f }
                }
            }
        };
    }

    public void LoadStage(int idx)
    {
        currentStageIdx = Mathf.Clamp(idx, 0, stages.Length - 1);
        var s = stages[currentStageIdx];

        // Reset Sand Grid
        for (int x = 0; x < SandGridW; x++)
        {
            for (int y = 0; y < SandGridH; y++)
            {
                // Top chamber (y > 52) is pre-dug for starting balls
                isSandDug[x, y] = (y >= 54);
            }
        }
        UpdateSandTexture();

        // Clear Old Entities
        foreach (var b in balls) if (b.go != null) Destroy(b.go);
        balls.Clear();

        foreach (var g in activeGates) if (g.go != null) Destroy(g.go);
        activeGates.Clear();

        foreach (var p in activeBumpers) if (p.go != null) Destroy(p.go);
        activeBumpers.Clear();

        foreach (var sp in activeSpinners) if (sp.go != null) Destroy(sp.go);
        activeSpinners.Clear();

        // Setup Truck
        collectedCount = 0;
        currentQuota = s.truckQuota;
        truckOffsetAnim = 0f;
        truckGo.transform.position = truckBasePos;

        // Spawn Starting Colored Balls at Top
        Color[] palette = new Color[] {
            new Color(0.2f, 0.85f, 1.0f), // cyan
            new Color(1.0f, 0.40f, 0.85f), // pink
            new Color(1.0f, 0.85f, 0.15f), // yellow
            new Color(0.2f, 0.95f, 0.45f)  // emerald
        };

        int ballId = 1;
        for (int i = 0; i < s.initialColoredBalls; i++)
        {
            float rx = UnityEngine.Random.Range(-2.2f, 2.2f);
            float ry = UnityEngine.Random.Range(4.6f, 5.8f);
            Color c = palette[i % palette.Length];
            SpawnBall(ballId++, new Vector2(rx, ry), true, c);
        }

        // Spawn Dormant Gray Balls in Clusters
        foreach (var clusterCenter in s.dormantClusters)
        {
            int countPerCluster = s.initialDormantBalls / Mathf.Max(1, s.dormantClusters.Count);
            for (int i = 0; i < countPerCluster; i++)
            {
                Vector2 offset = UnityEngine.Random.insideUnitCircle * 0.9f;
                SpawnBall(ballId++, clusterCenter + offset, false, Color.gray);
            }
        }

        // Spawn Gates
        foreach (var gDef in s.gates)
        {
            var g = new MultiplierGate
            {
                pos = gDef.pos,
                size = gDef.size,
                multiplier = gDef.multiplier
            };
            var gGo = GameObject.CreatePrimitive(PrimitiveType.Cube);
            gGo.name = "MultiplierGate_x" + g.multiplier;
            gGo.transform.position = new Vector3(g.pos.x, g.pos.y, -0.1f);
            gGo.transform.localScale = new Vector3(g.size.x, g.size.y, 0.3f);
            var m = new Material(Shader.Find("Sprites/Default"));
            m.color = (g.multiplier >= 3) ? new Color(1.0f, 0.85f, 0.15f, 0.7f) : new Color(0.2f, 0.8f, 1.0f, 0.7f);
            gGo.GetComponent<MeshRenderer>().material = m;
            g.go = gGo;
            activeGates.Add(g);
        }

        // Spawn Bumpers
        foreach (var pDef in s.bumpers)
        {
            var b = new BumperPeg
            {
                pos = pDef.pos,
                radius = pDef.radius
            };
            var bGo = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            bGo.name = "BumperPeg";
            bGo.transform.position = new Vector3(b.pos.x, b.pos.y, -0.1f);
            bGo.transform.rotation = Quaternion.Euler(90f, 0f, 0f);
            bGo.transform.localScale = new Vector3(b.radius * 2f, 0.2f, b.radius * 2f);
            var m = new Material(Shader.Find("Sprites/Default"));
            m.color = new Color(0.9f, 0.3f, 1.0f);
            bGo.GetComponent<MeshRenderer>().material = m;
            b.go = bGo;
            activeBumpers.Add(b);
        }

        // Spawn Spinners
        foreach (var spDef in s.spinners)
        {
            var sp = new RotatingObstacle
            {
                center = spDef.center,
                length = spDef.length,
                speed = spDef.speed,
                angle = 0f
            };
            var spGo = GameObject.CreatePrimitive(PrimitiveType.Cube);
            spGo.name = "Spinner";
            spGo.transform.position = new Vector3(sp.center.x, sp.center.y, -0.1f);
            spGo.transform.localScale = new Vector3(sp.length, 0.35f, 0.4f);
            var m = new Material(Shader.Find("Sprites/Default"));
            m.color = new Color(0.95f, 0.4f, 0.2f);
            spGo.GetComponent<MeshRenderer>().material = m;
            sp.go = spGo;
            activeSpinners.Add(sp);
        }

        state = GameState.Playing;
        PlayClip(sndTruckHorn, 0.7f);
        SpawnFloatText(s.title.Get(currentLang), new Vector3(0f, 2.5f, 0f), Color.yellow);
    }

    void SpawnBall(int id, Vector2 pos, bool isColored, Color col)
    {
        var ballGo = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        ballGo.name = "Ball_" + id;
        ballGo.transform.position = new Vector3(pos.x, pos.y, -0.2f);
        float rad = 0.19f;
        ballGo.transform.localScale = Vector3.one * (rad * 2f);

        var mat = new Material(Shader.Find("Sprites/Default"));
        mat.color = isColored ? col : new Color(0.55f, 0.58f, 0.65f);
        ballGo.GetComponent<MeshRenderer>().material = mat;

        balls.Add(new Ball
        {
            id = id,
            pos = pos,
            vel = Vector2.zero,
            radius = rad,
            isColored = isColored,
            color = col,
            isCollected = false,
            go = ballGo
        });
    }

    void Update()
    {
        HandleCameraTrauma();
        UpdateFloatingTexts();
        UpdateDustParticles();

        if (carveSoundCooldown > 0f) carveSoundCooldown -= Time.deltaTime;

        if (state == GameState.Playing)
        {
            HandleCarveInput();
            UpdateSpinners(Time.deltaTime);
            UpdateBallsPhysics(Time.deltaTime);
        }
        else if (state == GameState.Victory)
        {
            truckOffsetAnim += Time.deltaTime * 6.5f;
            truckGo.transform.position = truckBasePos + new Vector3(truckOffsetAnim, 0f, 0f);
        }
    }

    void HandleCameraTrauma()
    {
        if (cameraTrauma > 0f)
        {
            cameraTrauma -= Time.deltaTime * 1.6f;
            float shakeAmt = cameraTrauma * cameraTrauma * 0.3f;
            mainCam.transform.position = new Vector3(
                UnityEngine.Random.Range(-shakeAmt, shakeAmt),
                UnityEngine.Random.Range(-shakeAmt, shakeAmt),
                -14.2f
            );
        }
        else
        {
            mainCam.transform.position = new Vector3(0f, 0f, -14.2f);
        }
    }

    void HandleCarveInput()
    {
        if (Input.GetMouseButton(0))
        {
            if (Input.mousePosition.y < Screen.height - 130 && !showStageSelect)
            {
                Ray ray = mainCam.ScreenPointToRay(Input.mousePosition);
                Plane boardPlane = new Plane(Vector3.forward, Vector3.zero);
                float dist;
                if (boardPlane.Raycast(ray, out dist))
                {
                    Vector3 worldPt = ray.GetPoint(dist);
                    CarveSand(worldPt.x, worldPt.y, 0.72f);
                }
            }
        }
    }

    void CarveSand(float wx, float wy, float radius)
    {
        // Convert world coords to grid coords
        int cx = Mathf.FloorToInt(((wx + HalfW) / BoardW) * SandGridW);
        int cy = Mathf.FloorToInt(((wy + HalfH) / BoardH) * SandGridH);
        int radCells = Mathf.CeilToInt((radius / BoardW) * SandGridW);

        bool carvedAny = false;
        for (int dx = -radCells; dx <= radCells; dx++)
        {
            for (int dy = -radCells; dy <= radCells; dy++)
            {
                if (dx * dx + dy * dy <= radCells * radCells)
                {
                    int gx = cx + dx;
                    int gy = cy + dy;
                    if (gx >= 0 && gx < SandGridW && gy >= 0 && gy < SandGridH)
                    {
                        if (!isSandDug[gx, gy])
                        {
                            isSandDug[gx, gy] = true;
                            carvedAny = true;
                        }
                    }
                }
            }
        }

        if (carvedAny)
        {
            UpdateSandTexture();

            if (carveSoundCooldown <= 0f)
            {
                PlayClip(sndCarve, 0.45f);
                carveSoundCooldown = 0.12f;
            }

            // Spawn sand dust particles
            for (int p = 0; p < 2; p++)
            {
                dustParticles.Add(new DustParticle
                {
                    pos = new Vector3(wx + UnityEngine.Random.Range(-0.2f, 0.2f), wy + UnityEngine.Random.Range(-0.2f, 0.2f), -0.3f),
                    vel = new Vector3(UnityEngine.Random.Range(-0.8f, 0.8f), UnityEngine.Random.Range(-0.5f, 0.8f), 0f),
                    color = new Color(0.95f, 0.75f, 0.35f),
                    life = 0.3f,
                    maxLife = 0.3f
                });
            }
        }
    }

    void UpdateSandTexture()
    {
        Color sandColor = new Color(0.86f, 0.68f, 0.38f, 1.0f); // golden sand
        Color dugColor = new Color(0f, 0f, 0f, 0f); // transparent hole

        Color[] pixels = new Color[SandGridW * SandGridH];
        for (int y = 0; y < SandGridH; y++)
        {
            for (int x = 0; x < SandGridW; x++)
            {
                pixels[y * SandGridW + x] = isSandDug[x, y] ? dugColor : sandColor;
            }
        }
        sandTexture.SetPixels(pixels);
        sandTexture.Apply();
    }

    void UpdateSpinners(float dt)
    {
        foreach (var sp in activeSpinners)
        {
            sp.angle += sp.speed * dt;
            sp.go.transform.rotation = Quaternion.Euler(0f, 0f, sp.angle);
        }
    }

    void UpdateBallsPhysics(float dt)
    {
        int subSteps = 3;
        float subDt = dt / subSteps;
        float gravity = -18.0f;

        for (int step = 0; step < subSteps; step++)
        {
            for (int i = 0; i < balls.Count; i++)
            {
                var b = balls[i];
                if (b.isCollected) continue;

                // Dormant balls only move if colored
                if (!b.isColored)
                {
                    // Check if any colored ball touches it
                    for (int j = 0; j < balls.Count; j++)
                    {
                        var other = balls[j];
                        if (other.isColored && !other.isCollected)
                        {
                            if (Vector2.Distance(b.pos, other.pos) < b.radius + other.radius + 0.05f)
                            {
                                b.isColored = true;
                                b.color = other.color;
                                b.go.GetComponent<MeshRenderer>().material.color = b.color;
                                PlayClip(sndInfect, 0.7f);
                                SpawnFloatText("AWAKENED!", b.pos, b.color);
                                break;
                            }
                        }
                    }
                    if (!b.isColored) continue; // stays dormant
                }

                // Apply Gravity
                b.vel.y += gravity * subDt;
                b.pos += b.vel * subDt;

                // Wall Collisions
                if (b.pos.x - b.radius < -HalfW)
                {
                    b.pos.x = -HalfW + b.radius;
                    b.vel.x = -b.vel.x * 0.75f;
                }
                else if (b.pos.x + b.radius > HalfW)
                {
                    b.pos.x = HalfW - b.radius;
                    b.vel.x = -b.vel.x * 0.75f;
                }

                // Sand Bed Collision Check
                int gx = Mathf.FloorToInt(((b.pos.x + HalfW) / BoardW) * SandGridW);
                int gy = Mathf.FloorToInt(((b.pos.y + HalfH) / BoardH) * SandGridH);

                if (gx >= 0 && gx < SandGridW && gy >= 0 && gy < SandGridH)
                {
                    if (!isSandDug[gx, gy])
                    {
                        // Repel from solid sand
                        b.vel *= 0.5f;
                        b.pos.y += 0.04f;
                    }
                }

                // Multiplier Gate Pass-through
                foreach (var g in activeGates)
                {
                    if (!g.passedBallIds.Contains(b.id))
                    {
                        if (Mathf.Abs(b.pos.x - g.pos.x) < g.size.x * 0.5f && Mathf.Abs(b.pos.y - g.pos.y) < g.size.y * 0.6f)
                        {
                            g.passedBallIds.Add(b.id);
                            PlayClip(sndMultiplier, 1.0f);
                            cameraTrauma = Mathf.Clamp01(cameraTrauma + 0.2f);
                            SpawnFloatText("x" + g.multiplier + " DUPLICATED!", g.pos, Color.cyan);

                            // Duplicate ball
                            for (int m = 1; m < g.multiplier; m++)
                            {
                                int newId = 1000 + balls.Count;
                                Vector2 spawnOffset = new Vector2(UnityEngine.Random.Range(-0.15f, 0.15f), UnityEngine.Random.Range(-0.2f, 0f));
                                SpawnBall(newId, b.pos + spawnOffset, true, b.color);
                            }
                        }
                    }
                }

                // Bumper Peg Collisions
                foreach (var bump in activeBumpers)
                {
                    float dist = Vector2.Distance(b.pos, bump.pos);
                    if (dist < b.radius + bump.radius)
                    {
                        Vector2 norm = (b.pos - bump.pos).normalized;
                        b.pos = bump.pos + norm * (b.radius + bump.radius + 0.02f);
                        b.vel = norm * 14.0f; // powerful elastic bounce!
                        PlayClip(sndBallPop, 0.9f);
                    }
                }

                // Truck Cargo Collection
                if (b.pos.y < -5.2f && Mathf.Abs(b.pos.x - truckBasePos.x) < 1.4f)
                {
                    b.isCollected = true;
                    b.go.SetActive(false);
                    collectedCount++;
                    PlayClip(sndTruckLoad, 0.6f);

                    if (collectedCount >= currentQuota && state != GameState.Victory)
                    {
                        OnStageVictory();
                    }
                }

                b.go.transform.position = new Vector3(b.pos.x, b.pos.y, -0.2f);
            }
        }
    }

    void OnStageVictory()
    {
        state = GameState.Victory;
        PlayClip(sndTruckHorn, 1.0f);
        PlayClip(sndVictory, 1.0f);
        cameraTrauma = 0.45f;
    }

    void NextStage()
    {
        if (currentStageIdx < stages.Length - 1)
        {
            LoadStage(currentStageIdx + 1);
        }
        else
        {
            LoadStage(0);
        }
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
            ft.worldPos.y += Time.deltaTime * 0.7f;
            if (ft.life <= 0f) floatTexts.RemoveAt(i);
            else floatTexts[i] = ft;
        }
    }

    void UpdateDustParticles()
    {
        for (int i = dustParticles.Count - 1; i >= 0; i--)
        {
            var p = dustParticles[i];
            p.life -= Time.deltaTime;
            p.pos += p.vel * Time.deltaTime;
            if (p.life <= 0f) dustParticles.RemoveAt(i);
            else dustParticles[i] = p;
        }
    }

    void OnGUI()
    {
        GUI.skin.label.fontSize = 13;
        GUI.skin.button.fontSize = 12;

        var s = stages[currentStageIdx];

        // Top Control Header Bar
        GUILayout.BeginArea(new Rect(12, 10, Screen.width - 24, 90));
        GUILayout.BeginHorizontal();

        // Stage Title & Cargo Progress
        GUILayout.BeginVertical(GUI.skin.box, GUILayout.Width(250));
        GUILayout.Label("<color=#fbbf24><b>STAGE " + s.stageNum + "/12</b></color>: " + s.title.Get(currentLang));
        float pct = Mathf.Clamp01((float)collectedCount / currentQuota);
        GUILayout.Label("🚛 " + GetLocalizedCargoLabel() + ": <b>" + collectedCount + " / " + currentQuota + " (" + Mathf.RoundToInt(pct * 100f) + "%)</b>");
        DrawProgressBar(pct, new Color(0.15f, 0.75f, 0.95f), 10);
        GUILayout.EndVertical();

        GUILayout.FlexibleSpace();

        // Hint Instruction
        GUILayout.BeginVertical(GUI.skin.box, GUILayout.Width(250));
        GUILayout.Label("💡 " + s.briefing.Get(currentLang));
        GUILayout.EndVertical();

        GUILayout.FlexibleSpace();

        // Reset Stage Button
        if (GUILayout.Button("🔄 RESTART\nSTAGE", GUILayout.Width(85), GUILayout.Height(50)))
        {
            LoadStage(currentStageIdx);
        }

        // Stage Selector Button
        if (GUILayout.Button("🗺️ STAGES\n(1~12)", GUILayout.Width(85), GUILayout.Height(50)))
        {
            showStageSelect = !showStageSelect;
        }

        // Language Switcher Toggle Button (User Rule: 언어 현지화)
        if (GUILayout.Button("🌐 " + currentLang.ToString(), GUILayout.Width(60), GUILayout.Height(50)))
        {
            currentLang = (Language)(((int)currentLang + 1) % 4);
        }

        GUILayout.EndHorizontal();
        GUILayout.EndArea();

        // Floating Damage / Status Texts
        foreach (var ft in floatTexts)
        {
            Vector3 screenPt = mainCam.WorldToScreenPoint(ft.worldPos);
            if (screenPt.z > 0f)
            {
                float alphaVal = Mathf.Clamp01(ft.life / ft.maxLife);
                GUI.color = new Color(ft.color.r, ft.color.g, ft.color.b, alphaVal);
                GUI.Label(new Rect(screenPt.x - 110, Screen.height - screenPt.y - 12, 220, 24), "<b>" + ft.text + "</b>", GetCenterStyle(ft.color));
            }
        }
        GUI.color = Color.white;

        // Victory Modal
        if (state == GameState.Victory)
        {
            Rect winRect = new Rect(Screen.width * 0.5f - 200, Screen.height * 0.5f - 95, 400, 190);
            GUI.Box(winRect, "");
            GUILayout.BeginArea(winRect);
            GUILayout.Space(15);
            GUILayout.Label("<size=18><color=#4ade80><b>★ TRUCK FULLY LOADED! ★</b></color></size>", GetCenterStyle(Color.green));
            GUILayout.Space(8);
            GUILayout.Label(s.title.Get(currentLang) + " Cleared! Quota: " + collectedCount + "/" + currentQuota, GetCenterStyle(Color.white));
            GUILayout.Label("The dump truck honks and drives away with full cargo!", GetCenterStyle(Color.yellow));
            GUILayout.Space(12);
            GUILayout.BeginHorizontal();
            GUILayout.FlexibleSpace();
            if (GUILayout.Button(currentStageIdx < 11 ? "▶ NEXT STAGE (" + (currentStageIdx + 2) + ")" : "🏆 PLAY AGAIN", GUILayout.Width(180), GUILayout.Height(40)))
            {
                NextStage();
            }
            GUILayout.FlexibleSpace();
            GUILayout.EndHorizontal();
            GUILayout.EndArea();
        }

        // 12-Stage Selector Modal (User Rule: Minimum 10 stages accessible)
        if (showStageSelect)
        {
            Rect modalRect = new Rect(Screen.width * 0.5f - 260, 105, 520, 420);
            GUI.Box(modalRect, "<b>SELECT SAND STAGE (1~12)</b>");
            GUILayout.BeginArea(new Rect(modalRect.x + 15, modalRect.y + 35, modalRect.width - 30, modalRect.height - 45));

            int colsCount = 2;
            for (int i = 0; i < stages.Length; i += colsCount)
            {
                GUILayout.BeginHorizontal();
                for (int c = 0; c < colsCount; c++)
                {
                    int idx = i + c;
                    if (idx < stages.Length)
                    {
                        var st = stages[idx];
                        string btnText = "<b>Stage " + st.stageNum + "</b>: " + st.title.Get(currentLang) + "\n(Quota: " + st.truckQuota + " balls)";
                        if (GUILayout.Button(btnText, GUILayout.Height(50)))
                        {
                            showStageSelect = false;
                            LoadStage(idx);
                        }
                    }
                }
                GUILayout.EndHorizontal();
                GUILayout.Space(3);
            }

            GUILayout.Space(6);
            if (GUILayout.Button("❌ CLOSE", GUILayout.Height(28)))
            {
                showStageSelect = false;
            }
            GUILayout.EndArea();
        }
    }

    string GetLocalizedCargoLabel()
    {
        switch (currentLang)
        {
            case Language.KO: return "트럭 적재량";
            case Language.EN: return "Truck Cargo";
            case Language.JA: return "トラック積載";
            case Language.ES: return "Carga del Camión";
            default: return "Cargo";
        }
    }

    void DrawProgressBar(float pct, Color col, float height)
    {
        Rect r = GUILayoutUtility.GetRect(160, height);
        GUI.color = new Color(0.18f, 0.16f, 0.14f);
        GUI.DrawTexture(r, Texture2D.whiteTexture);
        GUI.color = col;
        GUI.DrawTexture(new Rect(r.x, r.y, r.width * Mathf.Clamp01(pct), r.height), Texture2D.whiteTexture);
        GUI.color = Color.white;
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
        sndCarve = SynthAudio(0.15f, t => {
            float noise = (UnityEngine.Random.value * 2f - 1f) * 0.8f;
            float scrape = Mathf.Sin(2f * Mathf.PI * 450f * t);
            return (noise + scrape) * 0.5f * (1f - t);
        });

        sndBallPop = SynthAudio(0.12f, t => {
            return Mathf.Sin(2f * Mathf.PI * 720f * t) * Mathf.Exp(-t * 22f);
        });

        sndInfect = SynthAudio(0.25f, t => {
            float f = Mathf.Lerp(440f, 880f, t);
            return Mathf.Sin(2f * Mathf.PI * f * t) * (1f - t);
        });

        sndMultiplier = SynthAudio(0.35f, t => {
            float f = (t < 0.17f) ? 587.33f : 880.00f;
            return (Mathf.Sin(2f * Mathf.PI * f * t) + Mathf.Sin(2f * Mathf.PI * f * 1.5f * t)) * 0.5f * (1f - t);
        });

        sndTruckLoad = SynthAudio(0.14f, t => {
            return Mathf.Sin(2f * Mathf.PI * 95f * t) * Mathf.Exp(-t * 12f);
        });

        sndTruckHorn = SynthAudio(0.45f, t => {
            float horn1 = Mathf.Sin(2f * Mathf.PI * 293.66f * t); // D4
            float horn2 = Mathf.Sin(2f * Mathf.PI * 349.23f * t); // F4
            return (horn1 + horn2) * 0.5f * (1f - t * 0.5f);
        });

        sndVictory = SynthAudio(0.65f, t => {
            float f = 523.25f;
            if (t > 0.15f) f = 659.25f;
            if (t > 0.30f) f = 783.99f;
            if (t > 0.45f) f = 1046.50f;
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
        var clip = AudioClip.Create("SandClip", totalSamples, 1, sampleRate, false);
        clip.SetData(samples, 0);
        return clip;
    }
}
