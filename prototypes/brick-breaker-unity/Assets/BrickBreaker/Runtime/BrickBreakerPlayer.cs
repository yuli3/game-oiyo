using System;
using System.Collections.Generic;
using UnityEngine;

public class BrickBreakerPlayer : MonoBehaviour
{
    public enum Language { KO, EN, JA, ES }
    private Language currentLang = Language.KO;

    public enum BrickType { Normal, Steel, TNT, MultiBall, Laser, WidePaddle, BossCore }

    public class Brick
    {
        public Vector3 position;
        public Vector3 size = new Vector3(1.1f, 0.45f, 0.5f);
        public BrickType type;
        public int hp;
        public int maxHp;
        public Color baseColor;
        public GameObject go;
        public bool isAlive = true;
        public float flashTime = 0f;
    }

    public class Ball
    {
        public Vector3 position;
        public Vector3 velocity;
        public float radius = 0.22f;
        public bool isAttached = true;
        public float attachOffset = 0f;
        public GameObject go;
        public bool isFireball = false;
    }

    public enum PowerupType { MultiBall, Laser, WidePaddle }

    public class PowerupDrop
    {
        public Vector3 position;
        public PowerupType type;
        public GameObject go;
        public bool isAlive = true;
    }

    public class LaserBeam
    {
        public Vector3 position;
        public GameObject go;
        public bool isAlive = true;
    }

    public class ParticleSpark
    {
        public Vector3 position;
        public Vector3 velocity;
        public Color color;
        public float life;
        public float maxLife;
        public GameObject go;
    }

    public class StageData
    {
        public int id;
        public string titleKo;
        public string titleEn;
        public string titleJa;
        public string titleEs;
        public string descKo;
        public string descEn;
        public string descJa;
        public string descEs;
        public int targetScore;
        public Action<List<Brick>, Transform> setupAction;
    }

    // World & Arena Bounds
    private const float ArenaMinX = -4.8f;
    private const float ArenaMaxX = 4.8f;
    private const float ArenaMinY = -5.8f;
    private const float ArenaMaxY = 6.2f;

    // Paddle State
    private Vector3 paddlePos = new Vector3(0f, -5.0f, 0f);
    private float paddleBaseWidth = 2.2f;
    private float paddleCurrentWidth = 2.2f;
    private float paddleHeight = 0.4f;
    private GameObject paddleGo;

    // Laser & Powerup timers
    private float laserTimer = 0f;
    private float widePaddleTimer = 0f;
    private float laserShootCooldown = 0f;

    // Game Objects
    private List<Ball> balls = new List<Ball>();
    private List<Brick> bricks = new List<Brick>();
    private List<PowerupDrop> powerups = new List<PowerupDrop>();
    private List<LaserBeam> lasers = new List<LaserBeam>();
    private List<ParticleSpark> particles = new List<ParticleSpark>();

    // Game Stats
    private int currentStageIndex = 0;
    private int score = 0;
    private int lives = 3;
    private int combo = 0;
    private int maxCombo = 0;
    private bool isGameOver = false;
    private bool isVictory = false;
    private bool isEndless = false;
    private bool showStageSelect = false;

    // Camera & Juice
    private Camera mainCam;
    private Vector3 camOriginPos;
    private float shakeTrauma = 0f;
    private string toastMessage = "";
    private float toastTimer = 0f;

    // Audio Synth
    private AudioSource audioSource;
    private bool soundEnabled = true;

    // Stage Definitions
    private List<StageData> stages = new List<StageData>();

    private void Awake()
    {
        InitCamera();
        InitAudio();
        InitStages();
        CreateArenaVisuals();
        CreatePaddleVisual();
        StartStage(0);
    }

    private void InitCamera()
    {
        mainCam = Camera.main;
        if (mainCam == null)
        {
            var camGo = new GameObject("MainCamera");
            mainCam = camGo.AddComponent<Camera>();
        }
        mainCam.orthographic = false;
        mainCam.fieldOfView = 50;
        mainCam.transform.position = new Vector3(0f, 0f, -14.5f);
        mainCam.transform.rotation = Quaternion.identity;
        mainCam.backgroundColor = new Color(0.04f, 0.05f, 0.10f, 1f);
        mainCam.clearFlags = CameraClearFlags.SolidColor;
        camOriginPos = mainCam.transform.position;

        // Ambient Light
        var lightGo = new GameObject("DirectionalLight");
        var light = lightGo.AddComponent<Light>();
        light.type = LightType.Directional;
        light.transform.rotation = Quaternion.Euler(45f, -30f, 0f);
        light.color = new Color(0.9f, 0.95f, 1.0f);
        light.intensity = 1.2f;
    }

    private void InitAudio()
    {
        audioSource = gameObject.AddComponent<AudioSource>();
        audioSource.playOnAwake = false;
    }

    private void CreateArenaVisuals()
    {
        // 3D Boundary Frame with glowing neon edges
        CreateWall(new Vector3(ArenaMinX - 0.2f, (ArenaMinY + ArenaMaxY) * 0.5f, 0f), new Vector3(0.35f, ArenaMaxY - ArenaMinY, 0.8f), new Color(0.2f, 0.5f, 1.0f));
        CreateWall(new Vector3(ArenaMaxX + 0.2f, (ArenaMinY + ArenaMaxY) * 0.5f, 0f), new Vector3(0.35f, ArenaMaxY - ArenaMinY, 0.8f), new Color(0.2f, 0.5f, 1.0f));
        CreateWall(new Vector3(0f, ArenaMaxY + 0.2f, 0f), new Vector3(ArenaMaxX - ArenaMinX + 0.7f, 0.35f, 0.8f), new Color(0.2f, 0.5f, 1.0f));

        // Dark backplane with grid lines
        var backPlane = GameObject.CreatePrimitive(PrimitiveType.Quad);
        backPlane.name = "BackPlane";
        backPlane.transform.position = new Vector3(0f, (ArenaMinY + ArenaMaxY) * 0.5f, 0.6f);
        backPlane.transform.localScale = new Vector3(ArenaMaxX - ArenaMinX + 1.2f, ArenaMaxY - ArenaMinY + 1.2f, 1f);
        var mat = new Material(Shader.Find("Universal Render Pipeline/Unlit") ?? Shader.Find("Sprites/Default"));
        mat.color = new Color(0.06f, 0.08f, 0.16f);
        backPlane.GetComponent<MeshRenderer>().material = mat;
    }

    private void CreateWall(Vector3 pos, Vector3 scale, Color color)
    {
        var wall = GameObject.CreatePrimitive(PrimitiveType.Cube);
        wall.name = "Wall";
        wall.transform.position = pos;
        wall.transform.localScale = scale;
        var mat = new Material(Shader.Find("Universal Render Pipeline/Unlit") ?? Shader.Find("Sprites/Default"));
        mat.color = color;
        wall.GetComponent<MeshRenderer>().material = mat;
    }

    private void CreatePaddleVisual()
    {
        paddleGo = GameObject.CreatePrimitive(PrimitiveType.Cube);
        paddleGo.name = "Paddle";
        paddleGo.transform.position = paddlePos;
        paddleGo.transform.localScale = new Vector3(paddleCurrentWidth, paddleHeight, 0.6f);
        var mat = new Material(Shader.Find("Universal Render Pipeline/Unlit") ?? Shader.Find("Sprites/Default"));
        mat.color = new Color(0.15f, 0.85f, 1.0f);
        paddleGo.GetComponent<MeshRenderer>().material = mat;
    }

    private void InitStages()
    {
        // 12 Hand-crafted stages
        stages.Add(new StageData
        {
            id = 1,
            titleKo = "네온 클래식", titleEn = "Neon Classic", titleJa = "ネオン・クラシック", titleEs = "Neón Clásico",
            descKo = "기본 4행 네온 벽돌. 패들의 타격 각도와 반사각을 익히세요.",
            descEn = "4 rows of classic neon bricks. Master the paddle deflection angle.",
            descJa = "基本4段のネオンブロック。パドルの反射角を掴みましょう。",
            descEs = "4 filas de bloques neón. Domina el ángulo de rebote.",
            targetScore = 800,
            setupAction = (bList, parent) => {
                for (int r = 0; r < 4; r++)
                {
                    Color rowCol = GetRowColor(r);
                    for (int c = -3; c <= 3; c++)
                    {
                        var type = (r == 1 && (c == -1 || c == 1)) ? BrickType.MultiBall : BrickType.Normal;
                        CreateBrick(bList, new Vector3(c * 1.25f, 4.8f - r * 0.65f, 0f), type, 1, type == BrickType.MultiBall ? new Color(0.2f, 1.0f, 0.5f) : rowCol, parent);
                    }
                }
            }
        });

        stages.Add(new StageData
        {
            id = 2,
            titleKo = "피라미드 탑", titleEn = "Pyramid Apex", titleJa = "ピラミッド・タワー", titleEs = "Cúspide Piramidal",
            descKo = "계단식 삼각 피라미드. 정상의 멀티볼 보물을 획득하세요.",
            descEn = "Stepped triangular pyramid. Reach the multi-ball at the apex.",
            descJa = "階段状の三角ピラミッド。頂点のマルチボールを狙え。",
            descEs = "Pirámide escalonada. Alcanza la multibola en la cima.",
            targetScore = 1200,
            setupAction = (bList, parent) => {
                for (int r = 0; r < 5; r++)
                {
                    int span = 4 - r;
                    Color rowCol = GetRowColor(r);
                    for (int c = -span; c <= span; c++)
                    {
                        var type = (r == 4 && c == 0) ? BrickType.Laser : ((r == 2 && (c == -1 || c == 1)) ? BrickType.MultiBall : BrickType.Normal);
                        CreateBrick(bList, new Vector3(c * 1.05f, 5.0f - r * 0.65f, 0f), type, 1, type == BrickType.Laser ? Color.yellow : (type == BrickType.MultiBall ? new Color(0.2f, 1f, 0.5f) : rowCol), parent);
                    }
                }
            }
        });

        stages.Add(new StageData
        {
            id = 3,
            titleKo = "다이너마이트 연쇄", titleEn = "TNT Chains", titleJa = "TNTチェイン", titleEs = "Cadenas de TNT",
            descKo = "폭발 벽돌을 터뜨려 주변 블록들을 일거에 소탕하세요!",
            descEn = "Detonate TNT bricks to clear clustered blocks in one blast!",
            descJa = "TNTブロックを爆破して、周囲のブロックを一気に吹き飛ばせ！",
            descEs = "¡Detona bloques TNT para limpiar clusters de un solo impacto!",
            targetScore = 1600,
            setupAction = (bList, parent) => {
                for (int r = 0; r < 5; r++)
                {
                    for (int c = -3; c <= 3; c++)
                    {
                        bool isTnt = (r == 2 && (c == -2 || c == 0 || c == 2)) || (r == 0 && c == 0);
                        var type = isTnt ? BrickType.TNT : ((r == 4 && (c == -2 || c == 2)) ? BrickType.WidePaddle : BrickType.Normal);
                        Color col = isTnt ? new Color(1f, 0.2f, 0.2f) : GetRowColor(r);
                        CreateBrick(bList, new Vector3(c * 1.25f, 5.0f - r * 0.65f, 0f), type, 1, col, parent);
                    }
                }
            }
        });

        stages.Add(new StageData
        {
            id = 4,
            titleKo = "강철 요새", titleEn = "Steel Fortress", titleJa = "鋼鉄の要塞", titleEs = "Fortaleza de Acero",
            descKo = "단단한 3회 타격 강철 벙커를 레이저와 집중 타격으로 뚫으세요.",
            descEn = "Breach 3-hit reinforced steel bunkers with lasers and precision.",
            descJa = "3回打撃が必要な鋼鉄バンカーをレーザーと集中砲火で突破せよ。",
            descEs = "Traspasa búnkeres de acero de 3 golpes con láser y precisión.",
            targetScore = 2200,
            setupAction = (bList, parent) => {
                for (int r = 0; r < 5; r++)
                {
                    for (int c = -3; c <= 3; c++)
                    {
                        bool isSteel = (r == 1 || r == 3) && (c == -3 || c == -1 || c == 1 || c == 3);
                        var type = isSteel ? BrickType.Steel : ((r == 0 && c == 0) ? BrickType.Laser : BrickType.Normal);
                        int hp = isSteel ? 3 : 1;
                        Color col = isSteel ? new Color(0.6f, 0.65f, 0.75f) : GetRowColor(r);
                        CreateBrick(bList, new Vector3(c * 1.25f, 5.0f - r * 0.65f, 0f), type, hp, col, parent);
                    }
                }
            }
        });

        stages.Add(new StageData
        {
            id = 5,
            titleKo = "쌍둥이 타워", titleEn = "Twin Pillars", titleJa = "双子の巨塔", titleEs = "Torres Gemelas",
            descKo = "좁은 중앙 통로로 공을 침투시켜 상단 벽돌군을 파괴하세요.",
            descEn = "Infiltrate the narrow central corridor to destroy high-tier bricks.",
            descJa = "狭い中央の隙間にボールを送り込み、上部のブロック群を壊せ。",
            descEs = "Infiltra la bola por el pasillo central para destruir el techo.",
            targetScore = 2800,
            setupAction = (bList, parent) => {
                for (int r = 0; r < 6; r++)
                {
                    for (int c = -3; c <= 3; c++)
                    {
                        if (c == 0 && r > 0) continue; // corridor
                        var type = (r == 0 && c == 0) ? BrickType.MultiBall : BrickType.Normal;
                        CreateBrick(bList, new Vector3(c * 1.25f, 5.2f - r * 0.65f, 0f), type, 1, GetRowColor(r), parent);
                    }
                }
            }
        });

        stages.Add(new StageData
        {
            id = 6,
            titleKo = "스페이스 인베이더", titleEn = "Space Invader", titleJa = "スペースインベーダー", titleEs = "Invasor Espacial",
            descKo = "외계 함선 포메이션. 양 날개와 중심 코어 공략.",
            descEn = "Alien mothership formation. Target the wings and core.",
            descJa = "エイリアン母船フォーメーション。両翼とコアを攻略せよ。",
            descEs = "Formación alienígena. Ataca las alas y el núcleo.",
            targetScore = 3500,
            setupAction = (bList, parent) => {
                for (int r = 0; r < 6; r++)
                {
                    for (int c = -3; c <= 3; c++)
                    {
                        if (r == 0 && (c < -1 || c > 1)) continue;
                        if (r == 5 && (c == -2 || c == 0 || c == 2)) continue;
                        var type = (r == 2 && c == 0) ? BrickType.Laser : ((r == 1 && (c == -2 || c == 2)) ? BrickType.TNT : BrickType.Normal);
                        Color col = type == BrickType.TNT ? new Color(1f, 0.2f, 0.2f) : (type == BrickType.Laser ? Color.yellow : GetRowColor(r));
                        CreateBrick(bList, new Vector3(c * 1.25f, 5.2f - r * 0.65f, 0f), type, 1, col, parent);
                    }
                }
            }
        });

        stages.Add(new StageData
        {
            id = 7,
            titleKo = "다이아몬드 금고", titleEn = "Diamond Vault", titleJa = "ダイヤモンド・金庫", titleEs = "Cámara de Diamantes",
            descKo = "외곽의 강철 장벽을 뚫고 내부의 멀티볼 보물창고를 해제하세요.",
            descEn = "Break through the steel outer vault to unlock the multi-ball trove.",
            descJa = "外側の鋼鉄壁を突破し、内部のマルチボール宝物庫を解放せよ。",
            descEs = "Rompe la bóveda de acero para desbloquear el tesoro multibola.",
            targetScore = 4400,
            setupAction = (bList, parent) => {
                for (int r = 0; r < 6; r++)
                {
                    for (int c = -3; c <= 3; c++)
                    {
                        bool isVaultBorder = (r == 0 || r == 5 || c == -3 || c == 3);
                        var type = isVaultBorder ? BrickType.Steel : BrickType.MultiBall;
                        int hp = isVaultBorder ? 2 : 1;
                        Color col = isVaultBorder ? new Color(0.6f, 0.65f, 0.75f) : new Color(0.2f, 1f, 0.5f);
                        CreateBrick(bList, new Vector3(c * 1.25f, 5.2f - r * 0.65f, 0f), type, hp, col, parent);
                    }
                }
            }
        });

        stages.Add(new StageData
        {
            id = 8,
            titleKo = "레이저 스피드웨이", titleEn = "Laser Speedway", titleJa = "レーザー・スピードウェイ", titleEs = "Pista Láser",
            descKo = "초고속 볼 스피드! 다중 레이저로 고밀도 벽돌을 분쇄하세요.",
            descEn = "High velocity balls! Shred high-density grids with double lasers.",
            descJa = "超高速ボール！ツインレーザーで密集ブロックを一掃せよ。",
            descEs = "¡Bolas de alta velocidad! Destruye bloques densos con láser.",
            targetScore = 5400,
            setupAction = (bList, parent) => {
                for (int r = 0; r < 5; r++)
                {
                    for (int c = -3; c <= 3; c++)
                    {
                        var type = (c == -2 || c == 2) ? BrickType.Laser : ((c == 0) ? BrickType.WidePaddle : BrickType.Normal);
                        Color col = type == BrickType.Laser ? Color.yellow : (type == BrickType.WidePaddle ? new Color(0.3f, 0.8f, 1f) : GetRowColor(r));
                        CreateBrick(bList, new Vector3(c * 1.25f, 5.0f - r * 0.65f, 0f), type, 1, col, parent);
                    }
                }
            }
        });

        stages.Add(new StageData
        {
            id = 9,
            titleKo = "체커보드 지뢰밭", titleEn = "Checkerboard Hazard", titleJa = "チェッカー地雷原", titleEs = "Campo de Minas",
            descKo = "강철과 폭탄이 교차 배치된 지뢰밭. 전략적인 연쇄 폭발 유도.",
            descEn = "Alternating steel and explosive TNT mines. Trigger chain reactions.",
            descJa = "鋼鉄とTNTが交互に並ぶ地雷原。戦略的な連鎖爆発を誘発せよ。",
            descEs = "Minas de acero y TNT alternadas. Activa reacciones en cadena.",
            targetScore = 6500,
            setupAction = (bList, parent) => {
                for (int r = 0; r < 5; r++)
                {
                    for (int c = -3; c <= 3; c++)
                    {
                        bool isEven = ((r + c) % 2 == 0);
                        var type = isEven ? BrickType.TNT : BrickType.Steel;
                        int hp = isEven ? 1 : 2;
                        Color col = isEven ? new Color(1f, 0.2f, 0.2f) : new Color(0.6f, 0.65f, 0.75f);
                        CreateBrick(bList, new Vector3(c * 1.25f, 5.0f - r * 0.65f, 0f), type, hp, col, parent);
                    }
                }
            }
        });

        stages.Add(new StageData
        {
            id = 10,
            titleKo = "보스 코어: 드레드노트", titleEn = "Boss: Dreadnought", titleJa = "ボス：ドレッドノート", titleEs = "Jefe: Dreadnought",
            descKo = "HP 12의 거대 보스 코어 출현! 주변 호위 편대를 제거하고 코어를 파괴하라.",
            descEn = "Massive Boss Core with 12 HP! Eliminate escorts and destroy the core.",
            descJa = "HP 12の巨大ボスコア出現！護衛編隊を撃破しコアを粉砕せよ。",
            descEs = "¡Núcleo Jefe masivo con 12 HP! Elimina escoltas y destruye el núcleo.",
            targetScore = 8000,
            setupAction = (bList, parent) => {
                // Giant Boss Core in Center
                CreateBrick(bList, new Vector3(0f, 4.0f, 0f), BrickType.BossCore, 12, new Color(0.95f, 0.2f, 0.85f), parent, new Vector3(2.5f, 1.2f, 0.8f));

                // Escort Bricks surrounding boss
                for (int c = -3; c <= 3; c++)
                {
                    if (c == 0) continue;
                    CreateBrick(bList, new Vector3(c * 1.25f, 5.2f, 0f), BrickType.Steel, 2, new Color(0.6f, 0.65f, 0.75f), parent);
                    CreateBrick(bList, new Vector3(c * 1.25f, 2.8f, 0f), (c == -2 || c == 2) ? BrickType.Laser : BrickType.Normal, 1, Color.yellow, parent);
                }
            }
        });

        stages.Add(new StageData
        {
            id = 11,
            titleKo = "하이퍼 나선", titleEn = "Hyper Helix", titleJa = "ハイパー・ヘリックス", titleEs = "Híper Hélice",
            descKo = "이중 나선 패턴의 복합 전장. 멀티볼과 레이저 파워를 극대화하세요.",
            descEn = "Double helix brick formation. Maximize multi-ball and laser power.",
            descJa = "二重螺旋パターンの複雑な戦場。マルチボールとレーザーを最大活用せよ。",
            descEs = "Formación en doble hélice. Maximiza el poder multibola y láser.",
            targetScore = 9500,
            setupAction = (bList, parent) => {
                for (int i = 0; i < 28; i++)
                {
                    float angle = i * 0.45f;
                    float radius = 1.0f + (i * 0.1f);
                    float x = Mathf.Cos(angle) * radius;
                    float y = 4.2f + Mathf.Sin(angle) * (radius * 0.6f);
                    if (x < ArenaMinX + 0.8f || x > ArenaMaxX - 0.8f) continue;
                    var type = (i % 6 == 0) ? BrickType.MultiBall : ((i % 7 == 0) ? BrickType.Laser : BrickType.Normal);
                    Color col = (type == BrickType.MultiBall) ? new Color(0.2f, 1f, 0.5f) : ((type == BrickType.Laser) ? Color.yellow : GetRowColor(i % 5));
                    CreateBrick(bList, new Vector3(x, y, 0f), type, 1, col, parent);
                }
            }
        });

        stages.Add(new StageData
        {
            id = 12,
            titleKo = "우주 특이점", titleEn = "Cosmic Singularity", titleJa = "宇宙特異点", titleEs = "Singularidad Cósmica",
            descKo = "12단계 최종 결전! 전설의 벽돌깨기 마스터를 향한 궁극의 시험.",
            descEn = "Stage 12 Grand Finale! The ultimate trial for the legendary brick master.",
            descJa = "ステージ12最終決戦！伝説のブロック崩しマスターへの試練。",
            descEs = "¡Gran Final de la Etapa 12! La prueba definitiva del maestro de bloques.",
            targetScore = 12000,
            setupAction = (bList, parent) => {
                // Outer ring
                for (int c = -3; c <= 3; c++)
                {
                    CreateBrick(bList, new Vector3(c * 1.25f, 5.5f, 0f), BrickType.TNT, 1, new Color(1f, 0.2f, 0.2f), parent);
                    CreateBrick(bList, new Vector3(c * 1.25f, 2.5f, 0f), BrickType.Steel, 3, new Color(0.6f, 0.65f, 0.75f), parent);
                }
                // Center boss core & powerups
                CreateBrick(bList, new Vector3(0f, 4.0f, 0f), BrickType.BossCore, 15, new Color(0.2f, 0.9f, 1.0f), parent, new Vector3(2.6f, 1.3f, 0.8f));
                CreateBrick(bList, new Vector3(-2.2f, 4.0f, 0f), BrickType.Laser, 1, Color.yellow, parent);
                CreateBrick(bList, new Vector3(2.2f, 4.0f, 0f), BrickType.MultiBall, 1, new Color(0.2f, 1f, 0.5f), parent);
            }
        });
    }

    private Color GetRowColor(int r)
    {
        switch (r % 5)
        {
            case 0: return new Color(0.95f, 0.25f, 0.45f); // Neon Magenta/Red
            case 1: return new Color(1.0f, 0.55f, 0.15f);  // Orange
            case 2: return new Color(1.0f, 0.85f, 0.2f);   // Yellow
            case 3: return new Color(0.2f, 0.85f, 0.4f);   // Neon Green
            default: return new Color(0.2f, 0.6f, 1.0f);   // Cyan
        }
    }

    private void CreateBrick(List<Brick> list, Vector3 pos, BrickType type, int hp, Color color, Transform parent, Vector3? customSize = null)
    {
        var b = new Brick
        {
            position = pos,
            type = type,
            hp = hp,
            maxHp = hp,
            baseColor = color
        };
        if (customSize.HasValue) b.size = customSize.Value;

        var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
        go.name = "Brick_" + type;
        go.transform.position = pos;
        go.transform.localScale = b.size;
        go.transform.SetParent(parent);

        var mat = new Material(Shader.Find("Universal Render Pipeline/Unlit") ?? Shader.Find("Sprites/Default"));
        mat.color = color;
        go.GetComponent<MeshRenderer>().material = mat;
        b.go = go;

        list.Add(b);
    }

    private void StartStage(int stageIdx)
    {
        currentStageIndex = Mathf.Clamp(stageIdx, 0, stages.Count - 1);
        isVictory = false;
        isGameOver = false;
        combo = 0;
        laserTimer = 0f;
        widePaddleTimer = 0f;

        // Cleanup Bricks, Balls, Powerups, Lasers
        ClearObjects();

        // Spawn Stage Bricks
        var stageData = stages[currentStageIndex];
        stageData.setupAction(bricks, transform);

        // Spawn Primary Ball
        SpawnBall(true);

        ShowToast(GetLocalizedStageTitle(stageData) + " - START!");
        PlayTone(523.25f, 0.15f); // C5 Start Jingle
    }

    private void ClearObjects()
    {
        foreach (var b in bricks) if (b.go != null) Destroy(b.go);
        bricks.Clear();

        foreach (var ball in balls) if (ball.go != null) Destroy(ball.go);
        balls.Clear();

        foreach (var p in powerups) if (p.go != null) Destroy(p.go);
        powerups.Clear();

        foreach (var l in lasers) if (l.go != null) Destroy(l.go);
        lasers.Clear();

        foreach (var ps in particles) if (ps.go != null) Destroy(ps.go);
        particles.Clear();
    }

    private void SpawnBall(bool attachToPaddle, Vector3? customPos = null, Vector3? customVel = null)
    {
        var ball = new Ball();
        ball.isAttached = attachToPaddle;
        ball.attachOffset = 0f;

        var go = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        go.name = "Ball";
        go.transform.localScale = Vector3.one * (ball.radius * 2f);
        var mat = new Material(Shader.Find("Universal Render Pipeline/Unlit") ?? Shader.Find("Sprites/Default"));
        mat.color = new Color(0.9f, 0.95f, 1.0f);
        go.GetComponent<MeshRenderer>().material = mat;
        ball.go = go;

        if (attachToPaddle)
        {
            ball.position = paddlePos + new Vector3(0f, paddleHeight * 0.5f + ball.radius, 0f);
            ball.velocity = Vector3.zero;
        }
        else
        {
            ball.position = customPos ?? (paddlePos + Vector3.up);
            ball.velocity = customVel ?? new Vector3(UnityEngine.Random.Range(-3f, 3f), 6.5f, 0f);
        }
        go.transform.position = ball.position;
        balls.Add(ball);
    }

    private void Update()
    {
        HandleInput();
        UpdatePaddle();
        UpdateLasers();
        UpdateBalls();
        UpdatePowerups();
        UpdateParticles();
        UpdateCameraShake();
        CheckStageClear();

        if (toastTimer > 0f) toastTimer -= Time.deltaTime;
        if (laserTimer > 0f) laserTimer -= Time.deltaTime;
        if (widePaddleTimer > 0f)
        {
            widePaddleTimer -= Time.deltaTime;
            paddleCurrentWidth = paddleBaseWidth * 1.5f;
        }
        else
        {
            paddleCurrentWidth = paddleBaseWidth;
        }
        if (paddleGo != null) paddleGo.transform.localScale = new Vector3(paddleCurrentWidth, paddleHeight, 0.6f);
    }

    private void HandleInput()
    {
        if (isGameOver || isVictory || showStageSelect) return;

        // Mouse or Touch positioning
        if (Input.GetMouseButton(0) || Input.touchCount > 0)
        {
            Vector3 screenPos = Input.touchCount > 0 ? (Vector3)Input.GetTouch(0).position : Input.mousePosition;
            Ray ray = mainCam.ScreenPointToRay(screenPos);
            Plane plane = new Plane(Vector3.forward, Vector3.zero);
            if (plane.Raycast(ray, out float enter))
            {
                Vector3 hitPoint = ray.GetPoint(enter);
                paddlePos.x = Mathf.Clamp(hitPoint.x, ArenaMinX + paddleCurrentWidth * 0.5f, ArenaMaxX - paddleCurrentWidth * 0.5f);
            }
        }

        // Keyboard Arrow / AD
        float horizontal = Input.GetAxisRaw("Horizontal");
        if (Mathf.Abs(horizontal) > 0.01f)
        {
            paddlePos.x += horizontal * 11f * Time.deltaTime;
            paddlePos.x = Mathf.Clamp(paddlePos.x, ArenaMinX + paddleCurrentWidth * 0.5f, ArenaMaxX - paddleCurrentWidth * 0.5f);
        }

        // Launch Ball
        if (Input.GetKeyDown(KeyCode.Space) || (Input.GetMouseButtonDown(0) && AnyBallAttached()))
        {
            LaunchAttachedBalls();
        }

        // Fire Lasers if armed
        if (laserTimer > 0f)
        {
            laserShootCooldown -= Time.deltaTime;
            if ((Input.GetKey(KeyCode.Space) || Input.GetMouseButton(0)) && laserShootCooldown <= 0f)
            {
                ShootLasers();
                laserShootCooldown = 0.22f;
            }
        }
    }

    private bool AnyBallAttached()
    {
        foreach (var b in balls) if (b.isAttached) return true;
        return false;
    }

    private void LaunchAttachedBalls()
    {
        foreach (var b in balls)
        {
            if (b.isAttached)
            {
                b.isAttached = false;
                float angleVariance = UnityEngine.Random.Range(-0.35f, 0.35f);
                b.velocity = new Vector3(angleVariance * 4.5f, 7.5f, 0f);
                PlayTone(440f, 0.1f);
            }
        }
    }

    private void ShootLasers()
    {
        SpawnLaser(paddlePos + new Vector3(-paddleCurrentWidth * 0.35f, paddleHeight * 0.5f + 0.2f, 0f));
        SpawnLaser(paddlePos + new Vector3(paddleCurrentWidth * 0.35f, paddleHeight * 0.5f + 0.2f, 0f));
        PlayTone(880f, 0.05f);
    }

    private void SpawnLaser(Vector3 pos)
    {
        var laser = new LaserBeam { position = pos };
        var go = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        go.name = "LaserBeam";
        go.transform.position = pos;
        go.transform.localScale = new Vector3(0.08f, 0.4f, 0.08f);
        var mat = new Material(Shader.Find("Universal Render Pipeline/Unlit") ?? Shader.Find("Sprites/Default"));
        mat.color = Color.yellow;
        go.GetComponent<MeshRenderer>().material = mat;
        laser.go = go;
        lasers.Add(laser);
    }

    private void UpdatePaddle()
    {
        if (paddleGo != null)
        {
            paddleGo.transform.position = paddlePos;
            // Tint paddle if laser armed
            var rend = paddleGo.GetComponent<MeshRenderer>();
            if (rend != null)
            {
                if (laserTimer > 0f) rend.material.color = new Color(1f, 0.85f, 0.1f);
                else if (widePaddleTimer > 0f) rend.material.color = new Color(0.2f, 1f, 0.6f);
                else rend.material.color = new Color(0.15f, 0.85f, 1.0f);
            }
        }
    }

    private void UpdateLasers()
    {
        for (int i = lasers.Count - 1; i >= 0; i--)
        {
            var l = lasers[i];
            l.position.y += 18f * Time.deltaTime;
            l.go.transform.position = l.position;

            // Check hit against bricks
            bool hit = false;
            foreach (var br in bricks)
            {
                if (!br.isAlive) continue;
                if (Mathf.Abs(l.position.x - br.position.x) < br.size.x * 0.5f + 0.1f &&
                    Mathf.Abs(l.position.y - br.position.y) < br.size.y * 0.5f + 0.2f)
                {
                    DamageBrick(br, 1);
                    hit = true;
                    break;
                }
            }

            if (hit || l.position.y > ArenaMaxY + 0.5f)
            {
                Destroy(l.go);
                lasers.RemoveAt(i);
            }
        }
    }

    private void UpdateBalls()
    {
        for (int i = balls.Count - 1; i >= 0; i--)
        {
            var b = balls[i];

            if (b.isAttached)
            {
                b.position = paddlePos + new Vector3(b.attachOffset, paddleHeight * 0.5f + b.radius, 0f);
                b.go.transform.position = b.position;
                continue;
            }

            // Move ball
            b.position += b.velocity * Time.deltaTime;

            // Fireball status based on combo
            b.isFireball = (combo >= 3);
            var ballRend = b.go.GetComponent<MeshRenderer>();
            if (ballRend != null)
            {
                ballRend.material.color = b.isFireball ? new Color(1f, 0.35f, 0.05f) : new Color(0.9f, 0.95f, 1.0f);
            }

            // Arena Walls Collision (Left, Right, Top)
            if (b.position.x - b.radius < ArenaMinX)
            {
                b.position.x = ArenaMinX + b.radius;
                b.velocity.x = Mathf.Abs(b.velocity.x);
                PlayTone(330f, 0.05f);
            }
            else if (b.position.x + b.radius > ArenaMaxX)
            {
                b.position.x = ArenaMaxX - b.radius;
                b.velocity.x = -Mathf.Abs(b.velocity.x);
                PlayTone(330f, 0.05f);
            }

            if (b.position.y + b.radius > ArenaMaxY)
            {
                b.position.y = ArenaMaxY - b.radius;
                b.velocity.y = -Mathf.Abs(b.velocity.y);
                PlayTone(330f, 0.05f);
            }

            // Paddle Collision (Deflection angle based on hit offset)
            if (b.velocity.y < 0f &&
                b.position.y - b.radius <= paddlePos.y + paddleHeight * 0.5f &&
                b.position.y + b.radius >= paddlePos.y - paddleHeight * 0.5f &&
                b.position.x >= paddlePos.x - paddleCurrentWidth * 0.5f - b.radius &&
                b.position.x <= paddlePos.x + paddleCurrentWidth * 0.5f + b.radius)
            {
                b.position.y = paddlePos.y + paddleHeight * 0.5f + b.radius;
                float hitOffset = (b.position.x - paddlePos.x) / (paddleCurrentWidth * 0.5f);
                hitOffset = Mathf.Clamp(hitOffset, -0.92f, 0.92f);

                float currentSpeed = Mathf.Max(b.velocity.magnitude, 7.5f);
                float bounceAngle = hitOffset * 65f * Mathf.Deg2Rad; // up to 65 deg deflection
                b.velocity = new Vector3(Mathf.Sin(bounceAngle) * currentSpeed, Mathf.Cos(bounceAngle) * currentSpeed, 0f);

                combo = 0; // Reset combo on paddle return
                shakeTrauma = Mathf.Max(shakeTrauma, 0.12f);
                PlayTone(220f, 0.08f);
            }

            // Brick Collisions
            foreach (var br in bricks)
            {
                if (!br.isAlive) continue;

                float halfW = br.size.x * 0.5f;
                float halfH = br.size.y * 0.5f;

                if (b.position.x + b.radius >= br.position.x - halfW &&
                    b.position.x - b.radius <= br.position.x + halfW &&
                    b.position.y + b.radius >= br.position.y - halfH &&
                    b.position.y - b.radius <= br.position.y + halfH)
                {
                    // Calculate penetration side
                    float overlapX = (halfW + b.radius) - Mathf.Abs(b.position.x - br.position.x);
                    float overlapY = (halfH + b.radius) - Mathf.Abs(b.position.y - br.position.y);

                    if (!b.isFireball || br.type == BrickType.Steel || br.type == BrickType.BossCore)
                    {
                        if (overlapX < overlapY)
                        {
                            b.velocity.x *= -1f;
                            b.position.x += (b.position.x > br.position.x ? overlapX : -overlapX);
                        }
                        else
                        {
                            b.velocity.y *= -1f;
                            b.position.y += (b.position.y > br.position.y ? overlapY : -overlapY);
                        }
                    }

                    combo++;
                    if (combo > maxCombo) maxCombo = combo;
                    DamageBrick(br, b.isFireball ? 2 : 1);
                    break;
                }
            }

            // Ball dropped below bottom arena
            if (b.position.y < ArenaMinY - 0.8f)
            {
                Destroy(b.go);
                balls.RemoveAt(i);
            }
            else
            {
                b.go.transform.position = b.position;
            }
        }

        // If all balls lost, deduct life and respawn attached ball
        if (balls.Count == 0 && !isGameOver && !isVictory)
        {
            lives--;
            combo = 0;
            laserTimer = 0f;
            widePaddleTimer = 0f;
            shakeTrauma = 0.45f;
            PlayTone(146.83f, 0.35f); // D3 Loss

            if (lives <= 0)
            {
                isGameOver = true;
                ShowToast(GetLocalizedText("GAME OVER!", "게임 오버!", "ゲームオーバー！", "¡FIN DEL JUEGO!"));
            }
            else
            {
                SpawnBall(true);
            }
        }
    }

    private void DamageBrick(Brick br, int amount)
    {
        br.hp -= amount;
        br.flashTime = 0.08f;
        SpawnDebris(br.position, br.baseColor, 5);

        // Pentatonic Scale Chimes based on combo
        float[] pentatonic = { 523.25f, 587.33f, 659.25f, 783.99f, 880.0f, 1046.50f };
        float pitch = pentatonic[Mathf.Min(combo, pentatonic.Length - 1)];
        PlayTone(pitch, 0.08f);

        if (br.hp <= 0)
        {
            br.isAlive = false;
            if (br.go != null) Destroy(br.go);

            int pts = 100 * Mathf.Max(1, combo);
            score += pts;

            // Type special behaviors
            if (br.type == BrickType.TNT)
            {
                DetonateTNT(br.position);
            }
            else if (br.type == BrickType.MultiBall)
            {
                SpawnPowerup(br.position, PowerupType.MultiBall);
            }
            else if (br.type == BrickType.Laser)
            {
                SpawnPowerup(br.position, PowerupType.Laser);
            }
            else if (br.type == BrickType.WidePaddle)
            {
                SpawnPowerup(br.position, PowerupType.WidePaddle);
            }
            else if (br.type == BrickType.BossCore)
            {
                score += 2500;
                shakeTrauma = 0.6f;
                ShowToast("BOSS DESTROYED! +2500");
                PlayTone(659.25f, 0.4f);
            }
        }
        else
        {
            // Dim color for damaged multi-hit bricks
            if (br.go != null)
            {
                var rend = br.go.GetComponent<MeshRenderer>();
                if (rend != null)
                {
                    float ratio = (float)br.hp / br.maxHp;
                    rend.material.color = Color.Lerp(Color.white, br.baseColor, ratio);
                }
            }
        }
    }

    private void DetonateTNT(Vector3 pos)
    {
        shakeTrauma = 0.5f;
        PlayTone(110f, 0.3f); // Bass explosion
        SpawnDebris(pos, new Color(1f, 0.3f, 0.1f), 18);

        // Explode 3x3 radius
        foreach (var other in bricks)
        {
            if (!other.isAlive) continue;
            float dist = Vector3.Distance(pos, other.position);
            if (dist < 2.2f)
            {
                DamageBrick(other, 3);
            }
        }
    }

    private void SpawnPowerup(Vector3 pos, PowerupType type)
    {
        var p = new PowerupDrop { position = pos, type = type };
        var go = GameObject.CreatePrimitive(PrimitiveType.Capsule);
        go.name = "Powerup_" + type;
        go.transform.position = pos;
        go.transform.localScale = new Vector3(0.35f, 0.25f, 0.35f);

        Color pCol = (type == PowerupType.MultiBall) ? new Color(0.2f, 1f, 0.5f) : ((type == PowerupType.Laser) ? Color.yellow : new Color(0.3f, 0.8f, 1f));
        var mat = new Material(Shader.Find("Universal Render Pipeline/Unlit") ?? Shader.Find("Sprites/Default"));
        mat.color = pCol;
        go.GetComponent<MeshRenderer>().material = mat;
        p.go = go;

        powerups.Add(p);
    }

    private void UpdatePowerups()
    {
        for (int i = powerups.Count - 1; i >= 0; i--)
        {
            var p = powerups[i];
            p.position.y -= 3.2f * Time.deltaTime;
            p.go.transform.position = p.position;
            p.go.transform.Rotate(0f, 180f * Time.deltaTime, 90f * Time.deltaTime);

            // Collect by paddle
            if (Mathf.Abs(p.position.y - paddlePos.y) < paddleHeight * 0.5f + 0.3f &&
                Mathf.Abs(p.position.x - paddlePos.x) < paddleCurrentWidth * 0.5f + 0.3f)
            {
                ApplyPowerup(p.type);
                Destroy(p.go);
                powerups.RemoveAt(i);
                continue;
            }

            if (p.position.y < ArenaMinY - 1f)
            {
                Destroy(p.go);
                powerups.RemoveAt(i);
            }
        }
    }

    private void ApplyPowerup(PowerupType type)
    {
        shakeTrauma = 0.2f;
        PlayTone(880f, 0.2f);

        switch (type)
        {
            case PowerupType.MultiBall:
                ShowToast(GetLocalizedText("MULTI-BALL x3!", "멀티볼 3구 분신!", "マルチボール×3！", "¡MULTIBOLA x3!"));
                // Duplicate active balls
                var currentBalls = new List<Ball>(balls);
                foreach (var b in currentBalls)
                {
                    if (!b.isAttached)
                    {
                        SpawnBall(false, b.position, Quaternion.Euler(0, 0, 25f) * b.velocity);
                        SpawnBall(false, b.position, Quaternion.Euler(0, 0, -25f) * b.velocity);
                    }
                    else
                    {
                        SpawnBall(false, paddlePos + Vector3.up, new Vector3(-3f, 6.5f, 0f));
                        SpawnBall(false, paddlePos + Vector3.up, new Vector3(3f, 6.5f, 0f));
                    }
                }
                break;

            case PowerupType.Laser:
                ShowToast(GetLocalizedText("LASER PADDLE ARMED!", "레이저 패들 장착! (스페이스/클릭)", "レーザーパドル装備！", "¡PÁDEL LÁSER ARMADO!"));
                laserTimer = 10f;
                break;

            case PowerupType.WidePaddle:
                ShowToast(GetLocalizedText("WIDE PADDLE +50%!", "패들 확장 1.5배!", "パドル拡張＋50%！", "¡PÁDEL EXPANDIDO!"));
                widePaddleTimer = 12f;
                break;
        }
    }

    private void SpawnDebris(Vector3 pos, Color col, int count)
    {
        for (int i = 0; i < count; i++)
        {
            var p = new ParticleSpark
            {
                position = pos,
                velocity = new Vector3(UnityEngine.Random.Range(-4f, 4f), UnityEngine.Random.Range(-3f, 5f), UnityEngine.Random.Range(-2f, 2f)),
                color = col,
                life = 0.5f,
                maxLife = 0.5f
            };
            var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
            go.transform.position = pos;
            go.transform.localScale = Vector3.one * UnityEngine.Random.Range(0.08f, 0.16f);
            var mat = new Material(Shader.Find("Universal Render Pipeline/Unlit") ?? Shader.Find("Sprites/Default"));
            mat.color = col;
            go.GetComponent<MeshRenderer>().material = mat;
            p.go = go;
            particles.Add(p);
        }
    }

    private void UpdateParticles()
    {
        for (int i = particles.Count - 1; i >= 0; i--)
        {
            var p = particles[i];
            p.life -= Time.deltaTime;
            p.position += p.velocity * Time.deltaTime;
            p.velocity.y -= 9.8f * Time.deltaTime;
            p.go.transform.position = p.position;

            if (p.life <= 0f)
            {
                Destroy(p.go);
                particles.RemoveAt(i);
            }
        }
    }

    private void UpdateCameraShake()
    {
        if (shakeTrauma > 0f)
        {
            shakeTrauma -= Time.deltaTime * 1.5f;
            float shake = shakeTrauma * shakeTrauma * 0.35f;
            mainCam.transform.position = camOriginPos + new Vector3(
                UnityEngine.Random.Range(-shake, shake),
                UnityEngine.Random.Range(-shake, shake),
                0f
            );
        }
        else
        {
            mainCam.transform.position = camOriginPos;
        }
    }

    private void CheckStageClear()
    {
        if (isGameOver || isVictory) return;

        bool hasTargetRemaining = false;
        foreach (var b in bricks)
        {
            if (b.isAlive && b.type != BrickType.Steel) // Steel is optional or breaks eventually
            {
                hasTargetRemaining = true;
                break;
            }
        }

        if (!hasTargetRemaining)
        {
            isVictory = true;
            PlayTone(659.25f, 0.15f); // E5
            PlayTone(880.0f, 0.35f);  // A5 Victory Fanfare
            ShowToast(GetLocalizedText("STAGE CLEAR!", "스테이지 클리어!", "ステージクリア！", "¡ETAPA SUPERADA!"));
        }
    }

    private void ShowToast(string msg)
    {
        toastMessage = msg;
        toastTimer = 2.4f;
    }

    private void PlayTone(float freq, float duration)
    {
        if (!soundEnabled || audioSource == null) return;
        int sampleRate = 44100;
        int sampleCount = (int)(sampleRate * duration);
        float[] samples = new float[sampleCount];
        for (int i = 0; i < sampleCount; i++)
        {
            float t = (float)i / sampleRate;
            float envelope = 1f - (float)i / sampleCount;
            samples[i] = Mathf.Sin(2 * Mathf.PI * freq * t) * envelope * 0.35f;
        }
        var clip = AudioClip.Create("Tone", sampleCount, 1, sampleRate, false);
        clip.SetData(samples, 0);
        audioSource.PlayOneShot(clip);
    }

    // --- OnGUI Real-Time Multi-Language HUD & Modals ---
    private void OnGUI()
    {
        DrawHUD();

        if (toastTimer > 0f)
        {
            var toastStyle = new GUIStyle(GUI.skin.box);
            toastStyle.fontSize = 20;
            toastStyle.fontStyle = FontStyle.Bold;
            toastStyle.normal.textColor = Color.yellow;
            toastStyle.alignment = TextAnchor.MiddleCenter;
            GUI.Box(new Rect(Screen.width * 0.5f - 220, 75, 440, 45), toastMessage, toastStyle);
        }

        if (showStageSelect)
        {
            DrawStageSelectModal();
        }
        else if (isVictory)
        {
            DrawVictoryModal();
        }
        else if (isGameOver)
        {
            DrawGameOverModal();
        }
    }

    private void DrawHUD()
    {
        GUILayout.BeginArea(new Rect(10, 10, Screen.width - 20, 60));
        GUILayout.BeginHorizontal();

        // Title and Stage
        GUILayout.BeginVertical();
        GUILayout.Label($"<b>BRICK BREAKER 3D</b> · STAGE {currentStageIndex + 1}/{stages.Count}", GetLabelStyle(16, Color.cyan));
        GUILayout.Label(GetLocalizedStageTitle(stages[currentStageIndex]), GetLabelStyle(12, Color.white));
        GUILayout.EndVertical();

        GUILayout.FlexibleSpace();

        // Score, Combo, Lives
        GUILayout.BeginVertical();
        GUILayout.Label($"{GetLocalizedText("SCORE", "점수", "スコア", "PUNTOS")}: <b>{score}</b>", GetLabelStyle(14, Color.white));
        string comboStr = combo > 1 ? $" <color=#ff8800>({combo}x COMBO!)</color>" : "";
        GUILayout.Label($"{GetLocalizedText("LIVES", "생명", "ライフ", "VIDAS")}: {"❤️".Repeat(lives)}{comboStr}", GetLabelStyle(13, Color.yellow));
        GUILayout.EndVertical();

        GUILayout.Space(15);

        // Language Switcher & Controls
        GUILayout.BeginHorizontal();
        if (GUILayout.Button("🌐 KO", GetButtonStyle(currentLang == Language.KO))) currentLang = Language.KO;
        if (GUILayout.Button("EN", GetButtonStyle(currentLang == Language.EN))) currentLang = Language.EN;
        if (GUILayout.Button("JA", GetButtonStyle(currentLang == Language.JA))) currentLang = Language.JA;
        if (GUILayout.Button("ES", GetButtonStyle(currentLang == Language.ES))) currentLang = Language.ES;

        if (GUILayout.Button(soundEnabled ? "🔊" : "🔇", GUILayout.Width(35), GUILayout.Height(30))) soundEnabled = !soundEnabled;
        if (GUILayout.Button(GetLocalizedText("STAGES", "스테이지", "ステージ", "ETAPAS"), GUILayout.Height(30))) showStageSelect = !showStageSelect;
        GUILayout.EndHorizontal();

        GUILayout.EndHorizontal();
        GUILayout.EndArea();

        // Laser & Wide Paddle indicators
        if (laserTimer > 0f || widePaddleTimer > 0f)
        {
            GUILayout.BeginArea(new Rect(10, 75, 200, 50));
            if (laserTimer > 0f) GUILayout.Label($"⚡ LASER: {laserTimer:F1}s", GetLabelStyle(13, Color.yellow));
            if (widePaddleTimer > 0f) GUILayout.Label($"↔ WIDE: {widePaddleTimer:F1}s", GetLabelStyle(13, Color.green));
            GUILayout.EndArea();
        }
    }

    private void DrawStageSelectModal()
    {
        GUI.Box(new Rect(0, 0, Screen.width, Screen.height), "");
        float w = Mathf.Min(650, Screen.width - 40);
        float h = Mathf.Min(480, Screen.height - 40);
        Rect rect = new Rect((Screen.width - w) * 0.5f, (Screen.height - h) * 0.5f, w, h);

        GUI.Box(rect, $"<b>{GetLocalizedText("SELECT STAGE", "스테이지 선택", "ステージ選択", "SELECCIONAR ETAPA")} (1~12)</b>");

        GUILayout.BeginArea(new Rect(rect.x + 20, rect.y + 40, rect.width - 40, rect.height - 50));
        GUILayout.Label(GetLocalizedText("12개 고유 챌린지 스테이지 중 원하는 전장을 선택하세요.", "Select from 12 distinct challenge formations.", "12のステージから挑戦したい戦場を選択してください。", "Selecciona entre 12 formaciones de desafío distintas."), GetLabelStyle(12, Color.gray));

        GUILayout.Space(10);
        int cols = 3;
        for (int i = 0; i < stages.Count; i += cols)
        {
            GUILayout.BeginHorizontal();
            for (int c = 0; c < cols; c++)
            {
                int sIdx = i + c;
                if (sIdx < stages.Count)
                {
                    var st = stages[sIdx];
                    string btnTxt = $"Stage {sIdx + 1}\n{GetLocalizedStageTitle(st)}";
                    if (GUILayout.Button(btnTxt, GUILayout.Height(48)))
                    {
                        showStageSelect = false;
                        StartStage(sIdx);
                    }
                }
            }
            GUILayout.EndHorizontal();
            GUILayout.Space(6);
        }

        GUILayout.FlexibleSpace();
        if (GUILayout.Button(GetLocalizedText("닫기", "Close", "閉じる", "Cerrar"), GUILayout.Height(36)))
        {
            showStageSelect = false;
        }
        GUILayout.EndArea();
    }

    private void DrawVictoryModal()
    {
        float w = Mathf.Min(450, Screen.width - 40);
        float h = 280;
        Rect rect = new Rect((Screen.width - w) * 0.5f, (Screen.height - h) * 0.5f, w, h);

        GUI.Box(rect, $"<b>🏆 {GetLocalizedText("STAGE CLEAR!", "스테이지 클리어!", "ステージクリア！", "¡ETAPA SUPERADA!")}</b>");

        GUILayout.BeginArea(new Rect(rect.x + 20, rect.y + 40, rect.width - 40, rect.height - 50));
        GUILayout.Label($"{GetLocalizedText("스테이지", "Stage", "ステージ", "Etapa")} {currentStageIndex + 1} {GetLocalizedStageTitle(stages[currentStageIndex])}", GetLabelStyle(15, Color.green));
        GUILayout.Space(8);
        GUILayout.Label($"{GetLocalizedText("최종 점수", "Final Score", "最終スコア", "Puntuación Final")}: <b>{score}</b>", GetLabelStyle(14, Color.white));
        GUILayout.Label($"{GetLocalizedText("최대 콤보", "Max Combo", "最大コンボ", "Combo Máximo")}: <b>{maxCombo}x</b>", GetLabelStyle(14, Color.yellow));

        GUILayout.Space(15);
        GUILayout.BeginHorizontal();
        if (currentStageIndex < stages.Count - 1)
        {
            if (GUILayout.Button(GetLocalizedText("다음 스테이지 ▶", "Next Stage ▶", "次のステージ ▶", "Siguiente Etapa ▶"), GUILayout.Height(44)))
            {
                StartStage(currentStageIndex + 1);
            }
        }
        else
        {
            if (GUILayout.Button(GetLocalizedText("전설 피날레 완료! (다시하기)", "Grand Finale Completed! (Restart)", "グランドフィナーレ達成！（再挑戦）", "¡Gran Final Completado!"), GUILayout.Height(44)))
            {
                StartStage(0);
            }
        }
        if (GUILayout.Button(GetLocalizedText("다시 도전", "Retry", "リトライ", "Reintentar"), GUILayout.Height(44)))
        {
            StartStage(currentStageIndex);
        }
        GUILayout.EndHorizontal();
        GUILayout.EndArea();
    }

    private void DrawGameOverModal()
    {
        float w = Mathf.Min(420, Screen.width - 40);
        float h = 260;
        Rect rect = new Rect((Screen.width - w) * 0.5f, (Screen.height - h) * 0.5f, w, h);

        GUI.Box(rect, $"<b>💀 {GetLocalizedText("GAME OVER", "게임 오버", "ゲームオーバー", "FIN DEL JUEGO")}</b>");

        GUILayout.BeginArea(new Rect(rect.x + 20, rect.y + 40, rect.width - 40, rect.height - 50));
        GUILayout.Label(GetLocalizedText("모든 공을 놓쳤습니다!", "All balls were lost!", "すべてのボールを落としました！", "¡Se perdieron todas las bolas!"), GetLabelStyle(14, Color.red));
        GUILayout.Space(8);
        GUILayout.Label($"{GetLocalizedText("도달 점수", "Reached Score", "スコア", "Puntuación")}: <b>{score}</b>", GetLabelStyle(14, Color.white));
        GUILayout.Label($"{GetLocalizedText("도달 스테이지", "Reached Stage", "到達ステージ", "Etapa Alcanzada")}: Stage {currentStageIndex + 1}", GetLabelStyle(13, Color.yellow));

        GUILayout.Space(15);
        GUILayout.BeginHorizontal();
        if (GUILayout.Button(GetLocalizedText("다시 시도", "Retry", "リトライ", "Reintentar"), GUILayout.Height(44)))
        {
            lives = 3;
            StartStage(currentStageIndex);
        }
        if (GUILayout.Button(GetLocalizedText("스테이지 선택", "Stage Select", "ステージ選択", "Elegir Etapa"), GUILayout.Height(44)))
        {
            lives = 3;
            showStageSelect = true;
        }
        GUILayout.EndHorizontal();
        GUILayout.EndArea();
    }

    private string GetLocalizedStageTitle(StageData stage)
    {
        switch (currentLang)
        {
            case Language.KO: return stage.titleKo;
            case Language.EN: return stage.titleEn;
            case Language.JA: return stage.titleJa;
            case Language.ES: return stage.titleEs;
            default: return stage.titleKo;
        }
    }

    private string GetLocalizedText(string en, string ko, string ja, string es)
    {
        switch (currentLang)
        {
            case Language.KO: return ko;
            case Language.EN: return en;
            case Language.JA: return ja;
            case Language.ES: return es;
            default: return ko;
        }
    }

    private GUIStyle GetLabelStyle(int size, Color color)
    {
        var style = new GUIStyle(GUI.skin.label);
        style.fontSize = size;
        style.richText = true;
        style.normal.textColor = color;
        return style;
    }

    private GUIStyle GetButtonStyle(bool active)
    {
        var style = new GUIStyle(GUI.skin.button);
        style.fontSize = 12;
        style.fontStyle = active ? FontStyle.Bold : FontStyle.Normal;
        style.normal.textColor = active ? Color.cyan : Color.white;
        return style;
    }
}

public static class StringExtensions
{
    public static string Repeat(this string s, int n)
    {
        if (n <= 0) return "";
        var sb = new System.Text.StringBuilder();
        for (int i = 0; i < n; i++) sb.Append(s);
        return sb.ToString();
    }
}
