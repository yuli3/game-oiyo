using System;
using System.Collections.Generic;
using UnityEngine;

public class SubwayRunnerPlayer : MonoBehaviour
{
    public enum Language { KO, EN, JA, ES }
    private Language currentLang = Language.KO;

    public enum ObstacleType { LowHurdle, HighBarrier, TrainCar, Coin, PowerupMagnet, PowerupJetpack, PowerupMultiplier }

    public class TrackItem
    {
        public int lane; // -1: Left, 0: Center, 1: Right
        public float zDistance;
        public float yHeight = 0f;
        public ObstacleType type;
        public GameObject go;
        public Vector3 size;
        public bool isCollected = false;
        public bool isTrainMoving = false;
        public float trainSpeed = 0f;
    }

    public class ParticleDebris
    {
        public Vector3 position;
        public Vector3 velocity;
        public Color color;
        public float life;
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
        public float targetDistance;
        public float baseSpeed;
        public Action<List<TrackItem>, Transform> generateTrack;
    }

    // World & Lane Constants
    private readonly float[] LaneX = { -2.2f, 0f, 2.2f }; // index 0, 1, 2 correspond to -1, 0, 1

    // Camera & Juice
    private Camera mainCam;
    private Vector3 camOriginPos;
    private float shakeTrauma = 0f;

    // Player State
    private int currentLane = 1; // 0: Left, 1: Center, 2: Right
    private Vector3 playerPos = new Vector3(0f, 0.45f, 0f);
    private float verticalVelocity = 0f;
    private bool isGrounded = true;
    private bool isSliding = false;
    private float slideTimer = 0f;
    private GameObject playerGo;
    private GameObject playerBodyGo;
    private GameObject hoverboardGo;

    // Powerup States
    private float magnetTimer = 0f;
    private float jetpackTimer = 0f;
    private float multiplierTimer = 0f;

    // Game Flow
    private List<TrackItem> items = new List<TrackItem>();
    private List<ParticleDebris> particles = new List<ParticleDebris>();
    private List<StageData> stages = new List<StageData>();

    private int currentStageIndex = 0;
    private float currentDistance = 0f;
    private int score = 0;
    private int coins = 0;
    private int lives = 3;
    private bool isGameOver = false;
    private bool isVictory = false;
    private bool showStageSelect = false;
    private float forwardSpeed = 18f;

    // Toast & Audio
    private string toastMessage = "";
    private float toastTimer = 0f;
    private AudioSource audioSource;
    private bool soundEnabled = true;

    private void Awake()
    {
        InitCamera();
        InitAudio();
        InitStages();
        CreateSubwayTrackVisuals();
        CreatePlayerVisuals();
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
        mainCam.fieldOfView = 58;
        mainCam.transform.position = new Vector3(0f, 3.8f, -5.5f);
        mainCam.transform.rotation = Quaternion.Euler(18f, 0f, 0f);
        mainCam.backgroundColor = new Color(0.04f, 0.05f, 0.12f, 1f);
        mainCam.clearFlags = CameraClearFlags.SolidColor;
        camOriginPos = mainCam.transform.position;

        // Directional Light
        var lightGo = new GameObject("DirectionalLight");
        var light = lightGo.AddComponent<Light>();
        light.type = LightType.Directional;
        light.transform.rotation = Quaternion.Euler(45f, -30f, 0f);
        light.color = new Color(0.95f, 0.95f, 1.0f);
        light.intensity = 1.35f;
    }

    private void InitAudio()
    {
        audioSource = gameObject.AddComponent<AudioSource>();
        audioSource.playOnAwake = false;
    }

    private void CreateSubwayTrackVisuals()
    {
        // 3-lane subway track bed
        var bed = GameObject.CreatePrimitive(PrimitiveType.Cube);
        bed.name = "TrackBed";
        bed.transform.position = new Vector3(0f, -0.1f, 35f);
        bed.transform.localScale = new Vector3(7.5f, 0.2f, 120f);
        var mat = new Material(Shader.Find("Universal Render Pipeline/Unlit") ?? Shader.Find("Sprites/Default"));
        mat.color = new Color(0.08f, 0.10f, 0.18f);
        bed.GetComponent<MeshRenderer>().material = mat;

        // 3 Steel Rails with sleepers
        for (int i = 0; i < 3; i++)
        {
            float x = LaneX[i];
            CreateRail(new Vector3(x - 0.45f, 0.05f, 35f), 120f);
            CreateRail(new Vector3(x + 0.45f, 0.05f, 35f), 120f);
        }

        // Side Tunnel Walls & Neon Ribs
        CreateWall(new Vector3(-4.0f, 2.5f, 35f), new Vector3(0.3f, 5.5f, 120f), new Color(0.12f, 0.15f, 0.24f));
        CreateWall(new Vector3(4.0f, 2.5f, 35f), new Vector3(0.3f, 5.5f, 120f), new Color(0.12f, 0.15f, 0.24f));
    }

    private void CreateRail(Vector3 pos, float length)
    {
        var rail = GameObject.CreatePrimitive(PrimitiveType.Cube);
        rail.name = "SteelRail";
        rail.transform.position = pos;
        rail.transform.localScale = new Vector3(0.08f, 0.1f, length);
        var mat = new Material(Shader.Find("Universal Render Pipeline/Unlit") ?? Shader.Find("Sprites/Default"));
        mat.color = new Color(0.35f, 0.65f, 0.95f);
        rail.GetComponent<MeshRenderer>().material = mat;
    }

    private void CreateWall(Vector3 pos, Vector3 scale, Color col)
    {
        var wall = GameObject.CreatePrimitive(PrimitiveType.Cube);
        wall.name = "TunnelWall";
        wall.transform.position = pos;
        wall.transform.localScale = scale;
        var mat = new Material(Shader.Find("Universal Render Pipeline/Unlit") ?? Shader.Find("Sprites/Default"));
        mat.color = col;
        wall.GetComponent<MeshRenderer>().material = mat;
    }

    private void CreatePlayerVisuals()
    {
        playerGo = new GameObject("PlayerRoot");
        playerGo.transform.position = playerPos;

        // Hoverboard base
        hoverboardGo = GameObject.CreatePrimitive(PrimitiveType.Cube);
        hoverboardGo.name = "Hoverboard";
        hoverboardGo.transform.SetParent(playerGo.transform);
        hoverboardGo.transform.localPosition = new Vector3(0f, -0.2f, 0f);
        hoverboardGo.transform.localScale = new Vector3(0.65f, 0.12f, 1.2f);
        var boardMat = new Material(Shader.Find("Universal Render Pipeline/Unlit") ?? Shader.Find("Sprites/Default"));
        boardMat.color = new Color(0.1f, 0.9f, 1.0f);
        hoverboardGo.GetComponent<MeshRenderer>().material = boardMat;

        // Player Body (Runner Model)
        playerBodyGo = GameObject.CreatePrimitive(PrimitiveType.Cube);
        playerBodyGo.name = "PlayerBody";
        playerBodyGo.transform.SetParent(playerGo.transform);
        playerBodyGo.transform.localPosition = new Vector3(0f, 0.45f, 0f);
        playerBodyGo.transform.localScale = new Vector3(0.6f, 1.0f, 0.45f);
        var bodyMat = new Material(Shader.Find("Universal Render Pipeline/Unlit") ?? Shader.Find("Sprites/Default"));
        bodyMat.color = new Color(0.95f, 0.35f, 0.15f);
        playerBodyGo.GetComponent<MeshRenderer>().material = bodyMat;

        // Head & Cap
        var head = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        head.name = "PlayerHead";
        head.transform.SetParent(playerGo.transform);
        head.transform.localPosition = new Vector3(0f, 1.15f, 0f);
        head.transform.localScale = Vector3.one * 0.45f;
        var headMat = new Material(Shader.Find("Universal Render Pipeline/Unlit") ?? Shader.Find("Sprites/Default"));
        headMat.color = new Color(0.95f, 0.85f, 0.7f);
        head.GetComponent<MeshRenderer>().material = headMat;
    }

    private void InitStages()
    {
        stages.Add(new StageData
        {
            id = 1,
            titleKo = "서울역의 새벽", titleEn = "Seoul Station Dawn", titleJa = "ソウル駅の夜明け", titleEs = "Amanecer en Seúl",
            descKo = "3개 차선 이동과 점프, 슬라이드의 기본 파쿠르를 익히세요.",
            descEn = "Master 3-lane parkour, jumps, and slides in the early morning depot.",
            descJa = "3車線移動、ジャンプ、スライディングの基本パルクールを習得。",
            descEs = "Domina el cambio de 3 carriles, saltos y deslizamientos.",
            targetDistance = 400f, baseSpeed = 17f,
            generateTrack = (list, parent) => GenerateTrackLayout(list, parent, 400f, 0.15f, 0.15f, 0.15f, 0.2f)
        });

        stages.Add(new StageData
        {
            id = 2,
            titleKo = "출근길 지하철 러시", titleEn = "Subway Rush Hour", titleJa = "通勤ラッシュアワー", titleEs = "Hora Punta",
            descKo = "선로에 멈춰 선 대형 열차와 교차 바리케이드를 피하세요.",
            descEn = "Dodge stationary subway trains and intersecting barriers during rush hour.",
            descJa = "線路に停車した大型列車と交差バリケードを回避せよ。",
            descEs = "Esquiva trenes detenidos y barricadas en hora punta.",
            targetDistance = 550f, baseSpeed = 18f,
            generateTrack = (list, parent) => GenerateTrackLayout(list, parent, 550f, 0.25f, 0.2f, 0.2f, 0.15f)
        });

        stages.Add(new StageData
        {
            id = 3,
            titleKo = "터널 저상 장애물", titleEn = "Tunnel Low Hurdles", titleJa = "トンネル低層ハードル", titleEs = "Vallas Bajas del Túnel",
            descKo = "연속 낮은 허들과 고가 바리케이드. 점프와 슬라이드의 완벽한 조화.",
            descEn = "Consecutive low hurdles and high signs. Master jumping and sliding.",
            descJa = "連続する低層ハードルと頭上看板。ジャンプとスライドの完璧な調和。",
            descEs = "Vallas bajas y carteles altos consecutivos. Salta y deslízate a tiempo.",
            targetDistance = 700f, baseSpeed = 19f,
            generateTrack = (list, parent) => GenerateTrackLayout(list, parent, 700f, 0.1f, 0.35f, 0.35f, 0.15f)
        });

        stages.Add(new StageData
        {
            id = 4,
            titleKo = "질주하는 특급 열차", titleEn = "Speeding Express Train", titleJa = "疾走する特急列車", titleEs = "Tren Expreso Veloz",
            descKo = "마주 달려오는 고속 열차의 경적음! 반사적으로 빈 차선으로 회피.",
            descEn = "Oncoming high-speed express trains! React quickly to open lanes.",
            descJa = "正面から疾走する特急列車の警笛！空いている車線へ素早く回避。",
            descEs = "¡Trenes de alta velocidad de frente! Cambia rápido de carril.",
            targetDistance = 850f, baseSpeed = 20f,
            generateTrack = (list, parent) => GenerateTrackLayout(list, parent, 850f, 0.35f, 0.15f, 0.15f, 0.15f, true)
        });

        stages.Add(new StageData
        {
            id = 5,
            titleKo = "자석 하이웨이", titleEn = "Magnet Highway", titleJa = "マグネット・ハイウェイ", titleEs = "Autopista Imán",
            descKo = "코인 자석 파워업과 끝없이 펼쳐지는 황금 코인 레일.",
            descEn = "Coin magnet powerups and endless golden coin trails.",
            descJa = "コイン磁石パワーアップと果てしなく広がる黄金コインロード。",
            descEs = "Potenciadores de imán de monedas y carriles dorados infinitos.",
            targetDistance = 1000f, baseSpeed = 20.5f,
            generateTrack = (list, parent) => GenerateTrackLayout(list, parent, 1000f, 0.2f, 0.15f, 0.15f, 0.45f)
        });

        stages.Add(new StageData
        {
            id = 6,
            titleKo = "도쿄 신주쿠 고가 철도", titleEn = "Tokyo Shinjuku Overpass", titleJa = "新宿高架鉄道", titleEs = "Paso Elevado de Shinjuku",
            descKo = "복잡한 3중 철로와 빠른 열차 교행. 고도의 차선 판단력 요구.",
            descEn = "Complex triple railway junction with rapid train crossing.",
            descJa = "複雑な三重高架線路と過密ダイヤ。高度な車線判断が必要。",
            descEs = "Cruce ferroviario complejo de triple vía con trenes continuos.",
            targetDistance = 1200f, baseSpeed = 21.5f,
            generateTrack = (list, parent) => GenerateTrackLayout(list, parent, 1200f, 0.3f, 0.2f, 0.2f, 0.2f, true)
        });

        stages.Add(new StageData
        {
            id = 7,
            titleKo = "제트팩 공중 부양", titleEn = "Jetpack Skyward", titleJa = "ジェットパック飛翔", titleEs = "Propulsión Jetpack",
            descKo = "제트팩을 장착하고 지상 장애물 위 하늘에서 코인 레일을 질주하세요!",
            descEn = "Equip the jetpack to fly over ground hazards and soar on sky coin trails!",
            descJa = "ジェットパックで地上障害物を飛び越え、上空のコインロードを疾走せよ！",
            descEs = "¡Vuela sobre peligros con el jetpack y recoge monedas en el cielo!",
            targetDistance = 1400f, baseSpeed = 22f,
            generateTrack = (list, parent) => GenerateTrackLayout(list, parent, 1400f, 0.25f, 0.2f, 0.2f, 0.35f)
        });

        stages.Add(new StageData
        {
            id = 8,
            titleKo = "한밤의 차량 기지", titleEn = "Midnight Depot", titleJa = "真夜中の車両基地", titleEs = "Depósito de Medianoche",
            descKo = "어두운 밤하늘 아래 조명등과 다가오는 열차들의 연속 습격.",
            descEn = "Under the dark night sky, navigate floodlights and oncoming trains.",
            descJa = "暗闇の車両基地。サーチライトと迫り来る列車の連続襲撃。",
            descEs = "Bajo el cielo nocturno, esquiva reflectores y trenes veloces.",
            targetDistance = 1600f, baseSpeed = 22.5f,
            generateTrack = (list, parent) => GenerateTrackLayout(list, parent, 1600f, 0.35f, 0.2f, 0.2f, 0.2f, true)
        });

        stages.Add(new StageData
        {
            id = 9,
            titleKo = "사이버 메트로 2077", titleEn = "Cyber Metro 2077", titleJa = "サイバーメトロ2077", titleEs = "Ciber Metro 2077",
            descKo = "네온 레이저 바리케이드와 초광속 열차. 극한의 반사신경 요구.",
            descEn = "Neon laser barricades and hypersonic trains. Extreme reflexes needed.",
            descJa = "ネオンレーザーバリケードと超光速列車。極限の反射神経が必要。",
            descEs = "Barricadas láser de neón y trenes hipersónicos. Reflejos extremos.",
            targetDistance = 1850f, baseSpeed = 23.5f,
            generateTrack = (list, parent) => GenerateTrackLayout(list, parent, 1850f, 0.38f, 0.25f, 0.25f, 0.2f, true)
        });

        stages.Add(new StageData
        {
            id = 10,
            titleKo = "보스 추격: 집행자 열차", titleEn = "Boss: Enforcer Train", titleJa = "ボス追撃：執行者列車", titleEs = "Jefe: Tren Ejecutor",
            descKo = "거대 집행자 열차와의 사투! 쉴 새 없이 몰아치는 복합 장애물.",
            descEn = "Dead heat with the giant Enforcer Train! Complex consecutive hazards.",
            descJa = "巨大執行者列車との死闘！息つく暇のない連続複合障害物。",
            descEs = "¡Lucha a muerte con el Tren Ejecutor! Obstáculos continuos.",
            targetDistance = 2100f, baseSpeed = 24f,
            generateTrack = (list, parent) => GenerateTrackLayout(list, parent, 2100f, 0.42f, 0.22f, 0.22f, 0.2f, true)
        });

        stages.Add(new StageData
        {
            id = 11,
            titleKo = "하이퍼 루프 블리츠", titleEn = "Hyper Loop Blitz", titleJa = "ハイパーループ・電撃戦", titleEs = "Blitz Hiperbólico",
            descKo = "음속 진공 튜브 철로의 폭풍 같은 속도감과 초고밀도 바리케이드.",
            descEn = "Sonic speed vacuum tube rush with ultra-dense obstacles.",
            descJa = "音速真空チューブの嵐のような疾走感と超高密度障害物。",
            descEs = "Tubo de vacío a velocidad sónica con densidad extrema de obstáculos.",
            targetDistance = 2400f, baseSpeed = 25f,
            generateTrack = (list, parent) => GenerateTrackLayout(list, parent, 2400f, 0.45f, 0.25f, 0.25f, 0.2f, true)
        });

        stages.Add(new StageData
        {
            id = 12,
            titleKo = "무한 스카이라인", titleEn = "Infinite Skyline", titleJa = "無限スカイライン", titleEs = "Horizonte Infinito",
            descKo = "12단계 최종 파쿠르 그랑프리! 전설의 서브웨이 서퍼 피날레.",
            descEn = "Stage 12 Grand Parkour Finale! The legendary subway runner master trial.",
            descJa = "ステージ12最終パルクールグランプリ！伝説のサーファーへの道。",
            descEs = "¡Gran Final de la Etapa 12! El maestro legendario del metro.",
            targetDistance = 2800f, baseSpeed = 26f,
            generateTrack = (list, parent) => GenerateTrackLayout(list, parent, 2800f, 0.42f, 0.25f, 0.25f, 0.25f, true)
        });
    }

    private void StartStage(int stageIdx)
    {
        currentStageIndex = Mathf.Clamp(stageIdx, 0, stages.Count - 1);
        var st = stages[currentStageIndex];
        currentDistance = 0f;
        forwardSpeed = st.baseSpeed;
        currentLane = 1;
        playerPos = new Vector3(LaneX[1], 0.45f, 0f);
        verticalVelocity = 0f;
        isGrounded = true;
        isSliding = false;
        slideTimer = 0f;
        magnetTimer = 0f;
        jetpackTimer = 0f;
        multiplierTimer = 0f;
        isGameOver = false;
        isVictory = false;

        // Cleanup previous track items
        foreach (var item in items) if (item.go != null) Destroy(item.go);
        items.Clear();

        foreach (var p in particles) if (p.go != null) Destroy(p.go);
        particles.Clear();

        // Generate Stage Track
        st.generateTrack(items, transform);

        UpdatePlayerVisuals();
        ShowToast($"{GetLocalizedStageTitle(st)} - START!");
        PlayTone(523.25f, 0.15f); // C5 Start
    }

    private void GenerateTrackLayout(List<TrackItem> list, Transform parent, float maxDist, float trainChance, float lowHurdleChance, float highBarrierChance, float powerupChance, bool movingTrains = false)
    {
        for (float z = 35f; z < maxDist; z += 18f)
        {
            // Pick a lane for obstacles
            int obstacleLane = UnityEngine.Random.Range(0, 3);
            float roll = UnityEngine.Random.value;

            if (roll < trainChance)
            {
                CreateTrainCar(list, obstacleLane, z, parent, movingTrains && UnityEngine.Random.value > 0.5f);
            }
            else if (roll < trainChance + lowHurdleChance)
            {
                CreateLowHurdle(list, obstacleLane, z, parent);
            }
            else if (roll < trainChance + lowHurdleChance + highBarrierChance)
            {
                CreateHighBarrier(list, obstacleLane, z, parent);
            }

            // Powerups or Coins in open lanes
            int coinLane = (obstacleLane + UnityEngine.Random.Range(1, 3)) % 3;
            if (UnityEngine.Random.value < powerupChance)
            {
                var pType = UnityEngine.Random.value < 0.4f ? ObstacleType.PowerupMagnet : (UnityEngine.Random.value < 0.7f ? ObstacleType.PowerupJetpack : ObstacleType.PowerupMultiplier);
                CreatePowerup(list, coinLane, z, pType, parent);
            }
            else
            {
                // Coin line (3 coins in a row)
                for (int c = 0; c < 3; c++)
                {
                    CreateCoin(list, coinLane, z + c * 2.5f, parent);
                }
            }
        }
    }

    private void CreateTrainCar(List<TrackItem> list, int lane, float z, Transform parent, bool moving)
    {
        var item = new TrackItem
        {
            lane = lane,
            zDistance = z,
            type = ObstacleType.TrainCar,
            size = new Vector3(1.7f, 2.8f, 9.0f),
            isTrainMoving = moving,
            trainSpeed = moving ? 12f : 0f
        };

        var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
        go.name = "SubwayTrain";
        go.transform.position = new Vector3(LaneX[lane], 1.4f, z);
        go.transform.localScale = item.size;
        var mat = new Material(Shader.Find("Universal Render Pipeline/Unlit") ?? Shader.Find("Sprites/Default"));
        mat.color = moving ? new Color(0.95f, 0.2f, 0.2f) : new Color(0.2f, 0.4f, 0.8f);
        go.GetComponent<MeshRenderer>().material = mat;
        go.transform.SetParent(parent);
        item.go = go;

        list.Add(item);
    }

    private void CreateLowHurdle(List<TrackItem> list, int lane, float z, Transform parent)
    {
        var item = new TrackItem
        {
            lane = lane,
            zDistance = z,
            type = ObstacleType.LowHurdle,
            size = new Vector3(1.6f, 0.65f, 0.35f)
        };

        var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
        go.name = "LowHurdle";
        go.transform.position = new Vector3(LaneX[lane], 0.35f, z);
        go.transform.localScale = item.size;
        var mat = new Material(Shader.Find("Universal Render Pipeline/Unlit") ?? Shader.Find("Sprites/Default"));
        mat.color = new Color(1.0f, 0.6f, 0.1f);
        go.GetComponent<MeshRenderer>().material = mat;
        go.transform.SetParent(parent);
        item.go = go;

        list.Add(item);
    }

    private void CreateHighBarrier(List<TrackItem> list, int lane, float z, Transform parent)
    {
        var item = new TrackItem
        {
            lane = lane,
            zDistance = z,
            type = ObstacleType.HighBarrier,
            size = new Vector3(1.6f, 1.4f, 0.35f),
            yHeight = 1.3f
        };

        var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
        go.name = "HighBarrier";
        go.transform.position = new Vector3(LaneX[lane], 1.6f, z);
        go.transform.localScale = item.size;
        var mat = new Material(Shader.Find("Universal Render Pipeline/Unlit") ?? Shader.Find("Sprites/Default"));
        mat.color = new Color(0.95f, 0.15f, 0.3f);
        go.GetComponent<MeshRenderer>().material = mat;
        go.transform.SetParent(parent);
        item.go = go;

        list.Add(item);
    }

    private void CreateCoin(List<TrackItem> list, int lane, float z, Transform parent)
    {
        var item = new TrackItem
        {
            lane = lane,
            zDistance = z,
            type = ObstacleType.Coin,
            size = new Vector3(0.5f, 0.5f, 0.5f)
        };

        var go = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        go.name = "GoldCoin";
        go.transform.position = new Vector3(LaneX[lane], 0.65f, z);
        go.transform.localScale = new Vector3(0.45f, 0.08f, 0.45f);
        go.transform.rotation = Quaternion.Euler(90f, 0f, 0f);
        var mat = new Material(Shader.Find("Universal Render Pipeline/Unlit") ?? Shader.Find("Sprites/Default"));
        mat.color = new Color(1.0f, 0.85f, 0.1f);
        go.GetComponent<MeshRenderer>().material = mat;
        go.transform.SetParent(parent);
        item.go = go;

        list.Add(item);
    }

    private void CreatePowerup(List<TrackItem> list, int lane, float z, ObstacleType type, Transform parent)
    {
        var item = new TrackItem
        {
            lane = lane,
            zDistance = z,
            type = type,
            size = new Vector3(0.7f, 0.7f, 0.7f)
        };

        var go = GameObject.CreatePrimitive(type == ObstacleType.PowerupJetpack ? PrimitiveType.Cylinder : PrimitiveType.Sphere);
        go.name = "Powerup_" + type;
        go.transform.position = new Vector3(LaneX[lane], 0.75f, z);
        go.transform.localScale = Vector3.one * 0.65f;

        Color col = Color.green;
        if (type == ObstacleType.PowerupMagnet) col = new Color(0.9f, 0.2f, 0.3f); // Red magnet
        else if (type == ObstacleType.PowerupJetpack) col = new Color(0.2f, 0.85f, 1.0f); // Cyan jetpack
        else if (type == ObstacleType.PowerupMultiplier) col = new Color(0.95f, 0.85f, 0.1f); // 2X Gold

        var mat = new Material(Shader.Find("Universal Render Pipeline/Unlit") ?? Shader.Find("Sprites/Default"));
        mat.color = col;
        go.GetComponent<MeshRenderer>().material = mat;
        go.transform.SetParent(parent);
        item.go = go;

        list.Add(item);
    }

    private void Update()
    {
        if (isGameOver || isVictory || showStageSelect) return;

        HandleInput();
        UpdatePlayerPhysics();
        UpdateTrackItems();
        UpdateParticles();
        UpdateCameraFollow();

        // Advance Distance & Score
        currentDistance += forwardSpeed * Time.deltaTime;
        int multiplier = multiplierTimer > 0f ? 2 : 1;
        score += (int)(forwardSpeed * Time.deltaTime * 5f * multiplier);

        // Powerup Timers
        if (magnetTimer > 0f) magnetTimer -= Time.deltaTime;
        if (jetpackTimer > 0f)
        {
            jetpackTimer -= Time.deltaTime;
            // Float at high altitude
            playerPos.y = Mathf.Lerp(playerPos.y, 3.8f, 10f * Time.deltaTime);
        }
        if (multiplierTimer > 0f) multiplierTimer -= Time.deltaTime;
        if (toastTimer > 0f) toastTimer -= Time.deltaTime;

        // Check Victory
        var st = stages[currentStageIndex];
        if (currentDistance >= st.targetDistance)
        {
            isVictory = true;
            PlayTone(880f, 0.4f);
            ShowToast(GetLocalizedText("STAGE CLEAR!", "스테이지 클리어!", "ステージクリア！", "¡ETAPA SUPERADA!"));
        }
    }

    private void HandleInput()
    {
        // Lane Switching (A/D or Left/Right Arrow)
        if (Input.GetKeyDown(KeyCode.A) || Input.GetKeyDown(KeyCode.LeftArrow))
        {
            ShiftLane(-1);
        }
        if (Input.GetKeyDown(KeyCode.D) || Input.GetKeyDown(KeyCode.RightArrow))
        {
            ShiftLane(1);
        }

        // Jump (W, Up Arrow, Space)
        if ((Input.GetKeyDown(KeyCode.W) || Input.GetKeyDown(KeyCode.UpArrow) || Input.GetKeyDown(KeyCode.Space)) && isGrounded && jetpackTimer <= 0f)
        {
            verticalVelocity = 11.5f;
            isGrounded = false;
            isSliding = false;
            PlayTone(587.33f, 0.08f); // D5 Jump
        }

        // Slide (S, Down Arrow)
        if ((Input.GetKeyDown(KeyCode.S) || Input.GetKeyDown(KeyCode.DownArrow)) && jetpackTimer <= 0f)
        {
            if (!isGrounded)
            {
                // Fast drop slam
                verticalVelocity = -18f;
            }
            isSliding = true;
            slideTimer = 0.65f;
            PlayTone(330f, 0.08f);
            SpawnSparks(playerPos, new Color(0.2f, 0.8f, 1f), 8);
        }
    }

    private void ShiftLane(int dir)
    {
        int nextLane = Mathf.Clamp(currentLane + dir, 0, 2);
        if (nextLane != currentLane)
        {
            currentLane = nextLane;
            PlayTone(440f, 0.05f);
        }
    }

    private void UpdatePlayerPhysics()
    {
        // Smooth Lane Lerp
        float targetX = LaneX[currentLane];
        playerPos.x = Mathf.Lerp(playerPos.x, targetX, 24f * Time.deltaTime);

        // Vertical Gravity & Jump (when not in jetpack)
        if (jetpackTimer <= 0f)
        {
            if (!isGrounded)
            {
                playerPos.y += verticalVelocity * Time.deltaTime;
                verticalVelocity -= 28f * Time.deltaTime; // Gravity

                if (playerPos.y <= 0.45f)
                {
                    playerPos.y = 0.45f;
                    verticalVelocity = 0f;
                    isGrounded = true;
                }
            }

            if (isSliding)
            {
                slideTimer -= Time.deltaTime;
                if (slideTimer <= 0f) isSliding = false;
            }
        }

        UpdatePlayerVisuals();
    }

    private void UpdatePlayerVisuals()
    {
        if (playerGo != null)
        {
            playerGo.transform.position = playerPos;

            // Squash profile when sliding
            if (isSliding && jetpackTimer <= 0f)
            {
                playerBodyGo.transform.localScale = new Vector3(0.6f, 0.35f, 0.85f);
                playerBodyGo.transform.localPosition = new Vector3(0f, 0.15f, 0f);
            }
            else
            {
                playerBodyGo.transform.localScale = new Vector3(0.6f, 1.0f, 0.45f);
                playerBodyGo.transform.localPosition = new Vector3(0f, 0.45f, 0f);
            }
        }
    }

    private void UpdateTrackItems()
    {
        for (int i = items.Count - 1; i >= 0; i--)
        {
            var item = items[i];

            // Oncoming moving train update
            if (item.isTrainMoving)
            {
                item.zDistance -= item.trainSpeed * Time.deltaTime;
            }

            float relZ = item.zDistance - currentDistance;

            if (item.go != null)
            {
                float y = item.yHeight > 0f ? item.yHeight : (item.type == ObstacleType.TrainCar ? 1.4f : 0.45f);
                item.go.transform.position = new Vector3(LaneX[item.lane], y, relZ);

                // Rotate coins
                if (item.type == ObstacleType.Coin || item.type >= ObstacleType.PowerupMagnet)
                {
                    item.go.transform.Rotate(0f, 150f * Time.deltaTime, 0f);
                }
            }

            // Magnet pulling coins
            if (magnetTimer > 0f && item.type == ObstacleType.Coin && !item.isCollected)
            {
                float dist = Vector3.Distance(playerPos, new Vector3(LaneX[item.lane], 0.65f, relZ));
                if (dist < 7.5f)
                {
                    item.lane = currentLane; // Pull toward runner
                }
            }

            // Collision check
            if (!item.isCollected && Mathf.Abs(relZ) < (item.type == ObstacleType.TrainCar ? 4.8f : 0.75f))
            {
                if (currentLane == item.lane)
                {
                    CheckCollision(item);
                }
            }

            // Cleanup passed items
            if (relZ < -15f)
            {
                if (item.go != null) Destroy(item.go);
                items.RemoveAt(i);
            }
        }
    }

    private void CheckCollision(TrackItem item)
    {
        if (item.type == ObstacleType.Coin)
        {
            item.isCollected = true;
            if (item.go != null) Destroy(item.go);
            int multiplier = multiplierTimer > 0f ? 2 : 1;
            coins += multiplier;
            score += 100 * multiplier;
            PlayTone(659.25f, 0.05f); // E5 Coin Chime
            SpawnSparks(playerPos + Vector3.up * 0.5f, Color.yellow, 6);
            return;
        }

        if (item.type == ObstacleType.PowerupMagnet)
        {
            item.isCollected = true;
            if (item.go != null) Destroy(item.go);
            magnetTimer = 10f;
            PlayTone(880f, 0.15f);
            ShowToast(GetLocalizedText("COIN MAGNET x10s!", "코인 자석 10초 활성화!", "コイン磁石10秒発動！", "¡IMÁN DE MONEDAS 10s!"));
            return;
        }

        if (item.type == ObstacleType.PowerupJetpack)
        {
            item.isCollected = true;
            if (item.go != null) Destroy(item.go);
            jetpackTimer = 8f;
            PlayTone(1046.50f, 0.2f);
            ShowToast(GetLocalizedText("JETPACK SKYWARD x8s!", "제트팩 8초 공중 비행!", "ジェットパック8秒飛翔！", "¡JETPACK EN EL CIELO 8s!"));
            return;
        }

        if (item.type == ObstacleType.PowerupMultiplier)
        {
            item.isCollected = true;
            if (item.go != null) Destroy(item.go);
            multiplierTimer = 12f;
            PlayTone(784f, 0.15f);
            ShowToast(GetLocalizedText("DOUBLE COINS 2X!", "더블 코인 2X 획득!", "ダブルコイン2X獲得！", "¡MONEDAS DOBLES 2X!"));
            return;
        }

        // If flying with Jetpack, immune to all ground/low hurdles
        if (jetpackTimer > 0f) return;

        // Low Hurdle: Can be jumped over
        if (item.type == ObstacleType.LowHurdle)
        {
            if (playerPos.y > 0.85f)
            {
                // Successfully leaped over
                return;
            }
        }

        // High Barrier: Can be slid under
        if (item.type == ObstacleType.HighBarrier)
        {
            if (isSliding && playerPos.y < 0.6f)
            {
                // Successfully slid underneath
                return;
            }
        }

        // Train Car: Rooftop riding check
        if (item.type == ObstacleType.TrainCar)
        {
            if (playerPos.y >= 2.6f)
            {
                // Riding on train roof!
                playerPos.y = 2.85f;
                verticalVelocity = 0f;
                isGrounded = true;
                return;
            }
        }

        // CRASH!
        item.isCollected = true;
        lives--;
        shakeTrauma = 0.55f;
        PlayTone(110f, 0.35f);
        SpawnSparks(playerPos, Color.red, 20);

        if (lives <= 0)
        {
            isGameOver = true;
            string cause = item.type == ObstacleType.TrainCar ? GetLocalizedText("TRAIN CRASH!", "열차 정면 충돌!", "列車正面衝突！", "¡CHOQUE CON TREN!") : GetLocalizedText("BARRIER CRASH!", "바리케이드 충돌!", "バリケード衝突！", "¡CHOQUE CON VALLA!");
            ShowToast(cause);
        }
        else
        {
            ShowToast($"CRASH! -1 LIFE ({lives} LEFT)");
        }
    }

    private void SpawnSparks(Vector3 pos, Color col, int count)
    {
        for (int i = 0; i < count; i++)
        {
            var p = new ParticleDebris
            {
                position = pos,
                velocity = new Vector3(UnityEngine.Random.Range(-3f, 3f), UnityEngine.Random.Range(2f, 6f), UnityEngine.Random.Range(-3f, 3f)),
                color = col,
                life = 0.5f
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

    private void UpdateCameraFollow()
    {
        if (shakeTrauma > 0f)
        {
            shakeTrauma -= Time.deltaTime * 1.5f;
            float shake = shakeTrauma * shakeTrauma * 0.45f;
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

    private void ShowToast(string msg)
    {
        toastMessage = msg;
        toastTimer = 2.4f;
    }

    // --- OnGUI Real-Time Multi-Language HUD & Modals ---
    private void OnGUI()
    {
        DrawHUD();
        DrawMobileControls();

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
        GUILayout.BeginArea(new Rect(10, 10, Screen.width - 20, 65));
        GUILayout.BeginHorizontal();

        // Title and Stage
        GUILayout.BeginVertical();
        GUILayout.Label($"<b>SUBWAY RUNNER 3D</b> · STAGE {currentStageIndex + 1}/{stages.Count}", GetLabelStyle(16, Color.cyan));
        var st = stages[currentStageIndex];
        GUILayout.Label(GetLocalizedStageTitle(st), GetLabelStyle(12, Color.white));
        GUILayout.EndVertical();

        GUILayout.FlexibleSpace();

        // Distance & Coins & Score
        GUILayout.BeginVertical();
        GUILayout.Label($"{GetLocalizedText("DISTANCE", "질주 거리", "距離", "DISTANCIA")}: <b>{(int)currentDistance}m / {(int)st.targetDistance}m</b>", GetLabelStyle(13, Color.white));
        string multStr = multiplierTimer > 0f ? " <color=#ffaa00>(2X!)</color>" : "";
        GUILayout.Label($"🪙 <b>{coins}</b>{multStr} · {GetLocalizedText("SCORE", "점수", "スコア", "PUNTOS")}: <b>{score}</b> · {"❤️".Repeat(lives)}", GetLabelStyle(13, Color.yellow));
        GUILayout.EndVertical();

        GUILayout.Space(15);

        // Language Buttons & Sound
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

        // Active Powerups HUD
        if (magnetTimer > 0f || jetpackTimer > 0f || multiplierTimer > 0f)
        {
            GUILayout.BeginArea(new Rect(10, 80, 200, 60));
            if (magnetTimer > 0f) GUILayout.Label($"🧲 MAGNET: {magnetTimer:F1}s", GetLabelStyle(13, Color.red));
            if (jetpackTimer > 0f) GUILayout.Label($"🚀 JETPACK: {jetpackTimer:F1}s", GetLabelStyle(13, Color.cyan));
            if (multiplierTimer > 0f) GUILayout.Label($"⭐ 2X BOOST: {multiplierTimer:F1}s", GetLabelStyle(13, Color.yellow));
            GUILayout.EndArea();
        }

        // Control Guidance
        GUI.Label(new Rect(10, Screen.height - 35, Screen.width - 20, 25),
            GetLocalizedText(
                "조작: [A/D 또는 ◀/▶: 차선 이동] [W/▲/Space: 점프] [S/▼: 슬라이드]",
                "Controls: [A/D or ◀/▶: Lane] [W/▲/Space: Jump] [S/▼: Slide]",
                "操作: [A/D または ◀/▶: 車線変更] [W/▲/Space: ジャンプ] [S/▼: スライド]",
                "Controles: [A/D o ◀/▶: Carril] [W/▲/Espacio: Saltar] [S/▼: Deslizar]"),
            GetLabelStyle(12, Color.gray));
    }

    private void DrawMobileControls()
    {
        float h = 55;
        float y = Screen.height - h - 45;
        float w = 70;

        if (GUI.Button(new Rect(20, y, w, h), "◀ LEFT")) ShiftLane(-1);
        if (GUI.Button(new Rect(100, y, w, h), "RIGHT ▶")) ShiftLane(1);

        float rX = Screen.width - w * 2 - 40;
        if (GUI.Button(new Rect(rX, y, w, h), "▲ JUMP"))
        {
            if (isGrounded && jetpackTimer <= 0f)
            {
                verticalVelocity = 11.5f;
                isGrounded = false;
                PlayTone(587.33f, 0.08f);
            }
        }
        if (GUI.Button(new Rect(rX + w + 15, y, w, h), "▼ SLIDE"))
        {
            if (jetpackTimer <= 0f)
            {
                if (!isGrounded) verticalVelocity = -18f;
                isSliding = true;
                slideTimer = 0.65f;
                PlayTone(330f, 0.08f);
            }
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
        GUILayout.Label(GetLocalizedText("12개 테마별 지하철 파쿠르 전장 중 도전할 스테이지를 선택하세요.", "Select from 12 subway parkour challenge stages.", "12の地下鉄パルクールステージから挑戦を選択してください。", "Selecciona entre 12 etapas de parkour de metro."), GetLabelStyle(12, Color.gray));

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
        GUILayout.Label($"{GetLocalizedText("수집 코인", "Collected Coins", "獲得コイン", "Monedas")}: <b>{coins}개</b>", GetLabelStyle(14, Color.yellow));

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
            if (GUILayout.Button(GetLocalizedText("그랑프리 피날레 완료! (다시하기)", "Grand Prix Completed! (Restart)", "グランプリ制覇達成！（再挑戦）", "¡Gran Prix Completado!"), GUILayout.Height(44)))
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
        GUILayout.Label(GetLocalizedText("충돌로 인해 파쿠르가 중단되었습니다!", "Parkour halted due to collision!", "衝突によりパルクールが中断しました！", "¡Parkour detenido por choque!"), GetLabelStyle(14, Color.red));
        GUILayout.Space(8);
        GUILayout.Label($"{GetLocalizedText("질주 거리", "Distance Run", "到達距離", "Distancia")}: <b>{(int)currentDistance}m</b>", GetLabelStyle(14, Color.white));
        GUILayout.Label($"{GetLocalizedText("수집 코인", "Coins", "コイン", "Monedas")}: <b>{coins}개</b>", GetLabelStyle(13, Color.yellow));

        GUILayout.Space(15);
        GUILayout.BeginHorizontal();
        if (GUILayout.Button(GetLocalizedText("다시 질주", "Retry", "リトライ", "Reintentar"), GUILayout.Height(44)))
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
