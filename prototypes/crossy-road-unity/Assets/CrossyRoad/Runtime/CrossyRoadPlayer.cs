using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class CrossyRoadPlayer : MonoBehaviour
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

    public enum LaneType { Grass, Road, Rail, River }

    public class Vehicle
    {
        public float x;
        public float speed;
        public float width;
        public Color color;
        public GameObject go;
    }

    public class FloatingLog
    {
        public float x;
        public float speed;
        public float width;
        public GameObject go;
    }

    public class CoinItem
    {
        public float x;
        public bool isCollected = false;
        public GameObject go;
    }

    public class Lane
    {
        public int index;
        public LaneType type;
        public float worldZ;
        public int direction = 1; // 1: right, -1: left
        public float baseSpeed;
        public List<int> treeCols = new List<int>();
        public List<GameObject> treeGos = new List<GameObject>();
        public List<Vehicle> vehicles = new List<Vehicle>();
        public List<FloatingLog> logs = new List<FloatingLog>();
        public CoinItem coin = null;
        public GameObject groundGo;

        // Train specifics
        public bool trainWarning = false;
        public float trainTimer = 0f;
        public float trainX = -40f;
        public GameObject trainGo = null;
    }

    public class StageDef
    {
        public int stageNum;
        public LocalizedText name;
        public LocalizedText briefing;
        public int targetDistance;
        public int requiredCoins;
        public float vehicleSpeedScale;
        public float trainFrequency;
    }

    // Grid Dimensions
    private const int GridWidth = 11; // -5 to +5
    private const float LanePitch = 1.4f;
    private const float ColPitch = 1.3f;

    // Player State
    private int playerCol = 0;
    private int playerLaneIdx = 0;
    private Vector3 currentPos;
    private Vector3 hopStartPos;
    private Vector3 hopTargetPos;
    private bool isHopping = false;
    private float hopProgress = 0f;
    private const float HopDuration = 0.16f;
    private Quaternion targetRotation = Quaternion.identity;
    private float idleTimer = 0f;
    private const float MaxIdleBeforeEagle = 7.5f;
    private bool eagleActive = false;
    private Vector3 eaglePos;
    private GameObject eagleGo;

    // Visuals & Entities
    private GameObject chickenBodyGo;
    private GameObject chickenCrestGo;
    private GameObject chickenBeakGo;
    private Camera mainCam;
    private Light dirLight;

    // Materials
    private Material grassMat;
    private Material roadMat;
    private Material railMat;
    private Material riverMat;
    private Material treeMat;
    private Material woodMat;
    private Material chickenMat;
    private Material beakMat;
    private Material crestMat;
    private Material coinMat;
    private Material trainMat;

    // Lanes
    private List<Lane> activeLanes = new List<Lane>();
    private int furthestLaneReached = 0;

    // Gameplay Stats
    public enum GameState { Playing, Victory, GameOver }
    private GameState state = GameState.Playing;
    private int score = 0;
    private int bestScore = 0;
    private int coinsCollected = 0;
    private int currentStageIdx = 0;
    private bool isEndlessMode = false;
    private bool showStageSelect = false;
    private LocalizedText deathCauseText = null;
    private float shakeTrauma = 0f;

    // Audio
    private AudioSource sfxSource;

    // Stages (12 Stages)
    private List<StageDef> stages = new List<StageDef>();

    private void Awake()
    {
        InitLocalization();
        InitStages();
        SetupCameraAndLighting();
        CreateMaterials();
        BuildChickenModel();
        SetupAudio();
        LoadStage(0);
    }

    private void InitLocalization()
    {
        if (Application.systemLanguage == SystemLanguage.Korean) currentLang = Language.KO;
        else if (Application.systemLanguage == SystemLanguage.Japanese) currentLang = Language.JA;
        else if (Application.systemLanguage == SystemLanguage.Spanish) currentLang = Language.ES;
        else currentLang = Language.EN;
    }

    private void InitStages()
    {
        stages.Clear();

        // Stage 1
        stages.Add(new StageDef
        {
            stageNum = 1,
            name = new LocalizedText("Stage 1: 교외의 조용한 도로", "Stage 1: Suburban Meadow", "Stage 1: 郊外の静かな道", "Etapa 1: Prado Suburbano"),
            briefing = new LocalizedText("나무를 피해 전진하며 25m 거리에 도달하세요!", "Hop forward dodging trees and cars to reach 25m!", "木を避けて前進し、25mの距離に到達しましょう！", "¡Avanza esquivando árboles y autos hasta llegar a 25m!"),
            targetDistance = 25,
            requiredCoins = 0,
            vehicleSpeedScale = 1.0f,
            trainFrequency = 0f
        });

        // Stage 2
        stages.Add(new StageDef
        {
            stageNum = 2,
            name = new LocalizedText("Stage 2: 고속도로 출퇴근길", "Stage 2: Highway Rush", "Stage 2: ハイウェイラッシュ", "Etapa 2: Autopista en Hora Punta"),
            briefing = new LocalizedText("연속된 아스팔트 차선을 신속하게 건너 35m에 도달하세요!", "Cross multiple consecutive road lanes to reach 35m!", "連続する車線を素早く横断して35mに到達しましょう！", "¡Cruza carriles consecutivos de autos y llega a 35m!"),
            targetDistance = 35,
            requiredCoins = 0,
            vehicleSpeedScale = 1.25f,
            trainFrequency = 0f
        });

        // Stage 3
        stages.Add(new StageDef
        {
            stageNum = 3,
            name = new LocalizedText("Stage 3: 통나무 뗏목 건너기", "Stage 3: River Rapids", "Stage 3: 丸太いかだ渡り", "Etapa 3: Rápidos del Río"),
            briefing = new LocalizedText("흘러가는 통나무 뗏목을 타고 강물을 건너 45m에 도달하세요!", "Jump across floating logs on rushing rivers to reach 45m!", "流れる丸太に乗って川を渡り、45mに到達しましょう！", "¡Salta sobre troncos flotantes en el río y llega a 45m!"),
            targetDistance = 45,
            requiredCoins = 0,
            vehicleSpeedScale = 1.15f,
            trainFrequency = 0f
        });

        // Stage 4
        stages.Add(new StageDef
        {
            stageNum = 4,
            name = new LocalizedText("Stage 4: KTX 고속철도 질주", "Stage 4: Bullet Train Junction", "Stage 4: 新幹線高速交差", "Etapa 4: Cruce de Tren Bala"),
            briefing = new LocalizedText("적색 경보등이 켜지면 멈추고 고속 열차를 피해 55m에 도달하세요!", "Watch the red signal bells and dodge bullet trains to reach 55m!", "赤信号が鳴ったら停止し、高速列車を避けて55mに到達しましょう！", "¡Atento a la señal roja y esquiva los trenes bala hasta 55m!"),
            targetDistance = 55,
            requiredCoins = 0,
            vehicleSpeedScale = 1.3f,
            trainFrequency = 1.0f
        });

        // Stage 5
        stages.Add(new StageDef
        {
            stageNum = 5,
            name = new LocalizedText("Stage 5: 메가 트래픽 교차로 [중간 챌린지]", "Stage 5: Mega Traffic Hub [Mid-Boss]", "Stage 5: メガトラフィック交差点 [中ボス]", "Etapa 5: Intercambiador Mega Tráfico [Jefe Medio]"),
            briefing = new LocalizedText("고속 스포츠카와 대형 트럭이 쏟아지는 교차로를 뚫고 70m에 도달하세요!", "Navigate intensive sports cars and semi-trucks to reach 70m!", "高速スポーツカーと大型トラックを突破して70mに到達しましょう！", "¡Cruza un tráfico denso de camiones y autos rápidos hasta 70m!"),
            targetDistance = 70,
            requiredCoins = 0,
            vehicleSpeedScale = 1.55f,
            trainFrequency = 1.2f
        });

        // Stage 6
        stages.Add(new StageDef
        {
            stageNum = 6,
            name = new LocalizedText("Stage 6: 황금 코인 수집가", "Stage 6: Golden Coin Trail", "Stage 6: 黄金コインコレクター", "Etapa 6: Sendero de Monedas de Oro"),
            briefing = new LocalizedText("길 위의 황금 코인을 8개 수집하고 80m를 돌파하세요!", "Collect at least 8 golden coins and traverse 80m!", "道中の黄金コインを8個集めて80mを突破しましょう！", "¡Recoge al menos 8 monedas de oro y cruza 80m!"),
            targetDistance = 80,
            requiredCoins = 8,
            vehicleSpeedScale = 1.35f,
            trainFrequency = 1.0f
        });

        // Stage 7
        stages.Add(new StageDef
        {
            stageNum = 7,
            name = new LocalizedText("Stage 7: 얼음 빙판과 설원 도로", "Stage 7: Glacial Frostway", "Stage 7: 氷河の雪原道路", "Etapa 7: Autovía Glacial"),
            briefing = new LocalizedText("얼어붙은 차가운 강물과 눈길을 건너 90m에 도달하세요!", "Cross icy glacial rivers and frosty highways to reach 90m!", "凍った氷河と雪道を渡り、90mに到達しましょう！", "¡Cruza ríos helados y caminos con nieve hasta 90m!"),
            targetDistance = 90,
            requiredCoins = 0,
            vehicleSpeedScale = 1.45f,
            trainFrequency = 1.2f
        });

        // Stage 8
        stages.Add(new StageDef
        {
            stageNum = 8,
            name = new LocalizedText("Stage 8: 심야의 야간 질주", "Stage 8: Midnight Neon Highway", "Stage 8: 深夜のネオンハイウェイ", "Etapa 8: Autopista de Medianoche"),
            briefing = new LocalizedText("어두운 심야 도로를 뚫고 100m 거리를 정복하세요!", "Conquer the dark midnight road full of rushing speeders to reach 100m!", "暗い深夜の道路を突破し、100mの距離を征服しましょう！", "¡Conquista la autopista nocturna a toda velocidad hasta 100m!"),
            targetDistance = 100,
            requiredCoins = 0,
            vehicleSpeedScale = 1.6f,
            trainFrequency = 1.4f
        });

        // Stage 9
        stages.Add(new StageDef
        {
            stageNum = 9,
            name = new LocalizedText("Stage 9: 폭풍우 급류와 번개", "Stage 9: Stormy Rapids", "Stage 9: 嵐の急流と雷鳴", "Etapa 9: Rápidos Tormentosos"),
            briefing = new LocalizedText("초고속으로 흘러가는 급류 통나무를 연속 점프하여 110m에 도달하세요!", "Rapidly jump across fast river streams to reach 110m!", "超高速で流れる丸太を連続ジャンプして110mに到達しましょう！", "¡Salta velozmente sobre troncos en corrientes rápidas hasta 110m!"),
            targetDistance = 110,
            requiredCoins = 0,
            vehicleSpeedScale = 1.5f,
            trainFrequency = 1.5f
        });

        // Stage 10
        stages.Add(new StageDef
        {
            stageNum = 10,
            name = new LocalizedText("Stage 10: 초고속 신칸센 특급 [최종보스]", "Stage 10: Shinkansen Express [Boss]", "Stage 10: 超高速新幹線特急 [最終ボス]", "Etapa 10: Expreso Shinkansen [Jefe Final]"),
            briefing = new LocalizedText("연속 3개 레일에서 쏟아지는 고속 열차를 돌파하고 125m를 달성하세요!", "Dodge 3 consecutive high-speed railway tracks to reach 125m!", "連続する3本のレールから現れる高速列車を突破し、125mを達成しましょう！", "¡Supera 3 vías consecutivas de trenes bala y alcanza 125m!"),
            targetDistance = 125,
            requiredCoins = 0,
            vehicleSpeedScale = 1.7f,
            trainFrequency = 2.2f
        });

        // Stage 11
        stages.Add(new StageDef
        {
            stageNum = 11,
            name = new LocalizedText("Stage 11: 안개 속 무한 크로싱 [시크릿]", "Stage 11: Foggy Crossway [Secret]", "Stage 11: 霧のクロスウェイ [シークレット]", "Etapa 11: Cruce Nebuloso [Secreto]"),
            briefing = new LocalizedText("안개 너머 예측불허의 장애물을 뚫고 140m를 달성하세요!", "Hop through dense fog and surprise hazards to reach 140m!", "霧の向こうの障害物を突破し、140mを達成しましょう！", "¡Avanza entre densa niebla y peligros sorpresa hasta 140m!"),
            targetDistance = 140,
            requiredCoins = 0,
            vehicleSpeedScale = 1.75f,
            trainFrequency = 1.8f
        });

        // Stage 12
        stages.Add(new StageDef
        {
            stageNum = 12,
            name = new LocalizedText("Stage 12: 궁극의 로드 마스터 [마스터 피날레]", "Stage 12: Ultimate Road Master [Finale]", "Stage 12: 究極のロードマスター [フィナーレ]", "Etapa 12: Maestro Supremo del Camino [Final]"),
            briefing = new LocalizedText("차량, 급류, 고속열차의 대혼란을 뚫고 160m를 돌파하여 전설이 되세요!", "Survive the ultimate onslaught of cars, rapids, and bullet trains to reach 160m!", "車、急流、新幹線のカオスを乗り越えて160mを突破しましょう！", "¡Supera el caos supremo de autos, rápidos y trenes hasta 160m!"),
            targetDistance = 160,
            requiredCoins = 12,
            vehicleSpeedScale = 1.9f,
            trainFrequency = 2.4f
        });
    }

    private void SetupCameraAndLighting()
    {
        var camGo = new GameObject("Follow Camera");
        mainCam = camGo.AddComponent<Camera>();
        mainCam.transform.position = new Vector3(-8f, 13f, -8f);
        mainCam.transform.rotation = Quaternion.Euler(48f, 45f, 0f);
        mainCam.clearFlags = CameraClearFlags.SolidColor;
        mainCam.backgroundColor = new Color(0.12f, 0.18f, 0.28f, 1f); // Sky Blue Fog
        mainCam.orthographic = true;
        mainCam.orthographicSize = 8.5f;

        var lightGo = new GameObject("SunLight");
        dirLight = lightGo.AddComponent<Light>();
        dirLight.type = LightType.Directional;
        dirLight.color = new Color(1f, 0.98f, 0.92f);
        dirLight.intensity = 1.25f;
        lightGo.transform.rotation = Quaternion.Euler(50f, -35f, 0f);
    }

    private void CreateMaterials()
    {
        Shader lit = Shader.Find("Universal Render Pipeline/Lit");
        if (lit == null) lit = Shader.Find("Standard");

        grassMat = new Material(lit);
        grassMat.color = new Color(0.32f, 0.72f, 0.28f);

        roadMat = new Material(lit);
        roadMat.color = new Color(0.22f, 0.24f, 0.28f);

        railMat = new Material(lit);
        railMat.color = new Color(0.42f, 0.32f, 0.24f);

        riverMat = new Material(lit);
        riverMat.color = new Color(0.18f, 0.52f, 0.88f, 0.9f);

        treeMat = new Material(lit);
        treeMat.color = new Color(0.18f, 0.55f, 0.22f);

        woodMat = new Material(lit);
        woodMat.color = new Color(0.55f, 0.35f, 0.18f);

        chickenMat = new Material(lit);
        chickenMat.color = new Color(0.98f, 0.98f, 0.98f);

        beakMat = new Material(lit);
        beakMat.color = new Color(1.0f, 0.65f, 0.05f);

        crestMat = new Material(lit);
        crestMat.color = new Color(0.95f, 0.15f, 0.15f);

        coinMat = new Material(lit);
        coinMat.color = new Color(1.0f, 0.85f, 0.10f);

        trainMat = new Material(lit);
        trainMat.color = new Color(0.92f, 0.25f, 0.25f);
    }

    private void BuildChickenModel()
    {
        var chickenRoot = new GameObject("PlayerChicken");
        chickenRoot.transform.position = Vector3.zero;

        // Body Cube
        chickenBodyGo = GameObject.CreatePrimitive(PrimitiveType.Cube);
        chickenBodyGo.name = "Body";
        chickenBodyGo.transform.SetParent(chickenRoot.transform);
        chickenBodyGo.transform.localPosition = new Vector3(0f, 0.45f, 0f);
        chickenBodyGo.transform.localScale = new Vector3(0.7f, 0.8f, 0.7f);
        chickenBodyGo.GetComponent<Renderer>().material = chickenMat;

        // Red Crest
        chickenCrestGo = GameObject.CreatePrimitive(PrimitiveType.Cube);
        chickenCrestGo.name = "Crest";
        chickenCrestGo.transform.SetParent(chickenRoot.transform);
        chickenCrestGo.transform.localPosition = new Vector3(0f, 0.92f, 0.05f);
        chickenCrestGo.transform.localScale = new Vector3(0.2f, 0.25f, 0.4f);
        chickenCrestGo.GetComponent<Renderer>().material = crestMat;

        // Yellow Beak
        chickenBeakGo = GameObject.CreatePrimitive(PrimitiveType.Cube);
        chickenBeakGo.name = "Beak";
        chickenBeakGo.transform.SetParent(chickenRoot.transform);
        chickenBeakGo.transform.localPosition = new Vector3(0f, 0.52f, 0.42f);
        chickenBeakGo.transform.localScale = new Vector3(0.25f, 0.18f, 0.25f);
        chickenBeakGo.GetComponent<Renderer>().material = beakMat;

        chickenRoot.transform.position = new Vector3(0f, 0f, 0f);
    }

    private void SetupAudio()
    {
        sfxSource = gameObject.AddComponent<AudioSource>();
        sfxSource.playOnAwake = false;
        sfxSource.volume = 0.85f;
    }

    private void PlayTone(float freq, float duration, string wave = "sine", float vol = 0.45f)
    {
        int sampleRate = 44100;
        int count = Mathf.CeilToInt(sampleRate * duration);
        float[] samples = new float[count];

        for (int i = 0; i < count; i++)
        {
            float t = (float)i / sampleRate;
            float env = Mathf.Exp(-t * 6f);
            float angle = 2f * Mathf.PI * freq * t;
            float val = 0f;

            if (wave == "sine") val = Mathf.Sin(angle);
            else if (wave == "triangle") val = Mathf.PingPong(t * freq * 4f, 2f) - 1f;
            else if (wave == "square") val = Mathf.Sin(angle) > 0f ? 0.5f : -0.5f;
            else val = (UnityEngine.Random.value * 2f - 1f);

            samples[i] = val * env * vol;
        }

        AudioClip clip = AudioClip.Create("Tone", count, 1, sampleRate, false);
        clip.SetData(samples, 0);
        sfxSource.PlayOneShot(clip);
    }

    private void PlayHopSound()
    {
        PlayTone(480f, 0.08f, "sine", 0.4f);
    }

    private void PlaySplashSound()
    {
        PlayTone(220f, 0.35f, "noise", 0.6f);
    }

    private void PlayCarHonk()
    {
        PlayTone(380f, 0.25f, "square", 0.55f);
    }

    private void PlayCoinDing()
    {
        PlayTone(987.77f, 0.22f, "triangle", 0.5f);
    }

    public void LoadStage(int stageIdx)
    {
        currentStageIdx = Mathf.Clamp(stageIdx, 0, stages.Count - 1);
        StageDef stage = stages[currentStageIdx];

        state = GameState.Playing;
        playerCol = 0;
        playerLaneIdx = 0;
        currentPos = Vector3.zero;
        hopStartPos = Vector3.zero;
        hopTargetPos = Vector3.zero;
        isHopping = false;
        furthestLaneReached = 0;
        score = 0;
        coinsCollected = 0;
        idleTimer = 0f;
        eagleActive = false;
        showStageSelect = false;
        deathCauseText = null;

        if (eagleGo != null) Destroy(eagleGo);

        ClearAllLanes();
        GenerateInitialLanes(stage);

        if (chickenBodyGo != null)
        {
            chickenBodyGo.transform.parent.position = currentPos;
            chickenBodyGo.transform.parent.rotation = Quaternion.identity;
        }
    }

    private void ClearAllLanes()
    {
        foreach (var lane in activeLanes)
        {
            if (lane.groundGo != null) Destroy(lane.groundGo);
            foreach (var tg in lane.treeGos) if (tg != null) Destroy(tg);
            foreach (var v in lane.vehicles) if (v.go != null) Destroy(v.go);
            foreach (var l in lane.logs) if (l.go != null) Destroy(l.go);
            if (lane.coin != null && lane.coin.go != null) Destroy(lane.coin.go);
            if (lane.trainGo != null) Destroy(lane.trainGo);
        }
        activeLanes.Clear();
    }

    private void GenerateInitialLanes(StageDef stage)
    {
        // First 3 lanes are safe Grass
        for (int i = -2; i <= 2; i++)
        {
            CreateLane(i, LaneType.Grass, stage);
        }

        // Generate forward lanes up to targetDistance + 10
        int targetMax = stage.targetDistance + 15;
        for (int i = 3; i <= targetMax; i++)
        {
            LaneType type = PickLaneTypeForIndex(i, stage);
            CreateLane(i, type, stage);
        }
    }

    private LaneType PickLaneTypeForIndex(int idx, StageDef stage)
    {
        float val = UnityEngine.Random.value;
        if (stage.trainFrequency > 0f && val < 0.16f) return LaneType.Rail;
        if (val < 0.45f) return LaneType.Road;
        if (val < 0.72f) return LaneType.River;
        return LaneType.Grass;
    }

    private void CreateLane(int idx, LaneType type, StageDef stage)
    {
        var lane = new Lane();
        lane.index = idx;
        lane.type = type;
        lane.worldZ = idx * LanePitch;
        lane.direction = (UnityEngine.Random.value > 0.5f) ? 1 : -1;
        lane.baseSpeed = UnityEngine.Random.Range(2.5f, 5.0f) * stage.vehicleSpeedScale;

        // Ground Strip
        var ground = GameObject.CreatePrimitive(PrimitiveType.Cube);
        ground.name = string.Format("Lane_{0}_{1}", idx, type);
        ground.transform.position = new Vector3(0f, -0.4f, lane.worldZ);
        ground.transform.localScale = new Vector3(GridWidth * ColPitch + 4f, 0.8f, LanePitch);

        Material mat = (type == LaneType.Grass) ? grassMat :
                       (type == LaneType.Road) ? roadMat :
                       (type == LaneType.Rail) ? railMat : riverMat;
        ground.GetComponent<Renderer>().material = mat;
        lane.groundGo = ground;

        // Grass: Trees
        if (type == LaneType.Grass && idx > 0)
        {
            int treeCount = UnityEngine.Random.Range(1, 4);
            for (int t = 0; t < treeCount; t++)
            {
                int col = UnityEngine.Random.Range(-5, 6);
                if (!lane.treeCols.Contains(col))
                {
                    lane.treeCols.Add(col);

                    var treeGo = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                    treeGo.name = "Tree";
                    treeGo.transform.position = new Vector3(col * ColPitch, 0.7f, lane.worldZ);
                    treeGo.transform.localScale = new Vector3(0.75f, 1.4f, 0.75f);
                    treeGo.GetComponent<Renderer>().material = treeMat;
                    lane.treeGos.Add(treeGo);
                }
            }
        }

        // Road: Vehicles
        if (type == LaneType.Road)
        {
            int vehCount = UnityEngine.Random.Range(2, 4);
            float spacing = 22f / vehCount;
            for (int v = 0; v < vehCount; v++)
            {
                var veh = new Vehicle();
                veh.x = -11f + v * spacing + UnityEngine.Random.Range(-1.5f, 1.5f);
                veh.speed = lane.baseSpeed * lane.direction;
                veh.width = UnityEngine.Random.value > 0.4f ? 1.8f : 3.0f; // Sedan or Truck
                veh.color = GetRandomVehicleColor();

                var vGo = GameObject.CreatePrimitive(PrimitiveType.Cube);
                vGo.name = "Vehicle";
                vGo.transform.position = new Vector3(veh.x, 0.45f, lane.worldZ);
                vGo.transform.localScale = new Vector3(veh.width, 0.8f, 1.0f);
                vGo.GetComponent<Renderer>().material = new Material(Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Standard"));
                vGo.GetComponent<Renderer>().material.color = veh.color;
                veh.go = vGo;

                lane.vehicles.Add(veh);
            }
        }

        // River: Logs
        if (type == LaneType.River)
        {
            int logCount = UnityEngine.Random.Range(2, 4);
            float spacing = 20f / logCount;
            for (int l = 0; l < logCount; l++)
            {
                var log = new FloatingLog();
                log.x = -10f + l * spacing + UnityEngine.Random.Range(-1f, 1f);
                log.speed = (lane.baseSpeed * 0.75f) * lane.direction;
                log.width = UnityEngine.Random.Range(2.4f, 3.8f);

                var lGo = GameObject.CreatePrimitive(PrimitiveType.Cube);
                lGo.name = "Log";
                lGo.transform.position = new Vector3(log.x, 0.1f, lane.worldZ);
                lGo.transform.localScale = new Vector3(log.width, 0.35f, 0.95f);
                lGo.GetComponent<Renderer>().material = woodMat;
                log.go = lGo;

                lane.logs.Add(log);
            }
        }

        // Rail: Warning timer & train
        if (type == LaneType.Rail)
        {
            lane.trainTimer = UnityEngine.Random.Range(4f, 8f);
            lane.trainX = -40f;

            var train = GameObject.CreatePrimitive(PrimitiveType.Cube);
            train.name = "Train";
            train.transform.position = new Vector3(lane.trainX, 0.9f, lane.worldZ);
            train.transform.localScale = new Vector3(16f, 1.5f, 1.15f);
            train.GetComponent<Renderer>().material = trainMat;
            lane.trainGo = train;
        }

        // Coins (Random spawn on safe tiles or logs)
        if (idx > 0 && UnityEngine.Random.value < 0.28f)
        {
            var coin = new CoinItem();
            coin.x = UnityEngine.Random.Range(-4, 5) * ColPitch;

            var cGo = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            cGo.name = "Coin";
            cGo.transform.position = new Vector3(coin.x, 0.5f, lane.worldZ);
            cGo.transform.localScale = new Vector3(0.45f, 0.08f, 0.45f);
            cGo.transform.rotation = Quaternion.Euler(90f, 0f, 0f);
            cGo.GetComponent<Renderer>().material = coinMat;
            coin.go = cGo;

            lane.coin = coin;
        }

        activeLanes.Add(lane);
    }

    private Color GetRandomVehicleColor()
    {
        Color[] cols = {
            new Color(0.95f, 0.2f, 0.2f),
            new Color(0.2f, 0.5f, 0.95f),
            new Color(1.0f, 0.85f, 0.1f),
            new Color(0.95f, 0.5f, 0.1f),
            new Color(0.7f, 0.2f, 0.95f)
        };
        return cols[UnityEngine.Random.Range(0, cols.Length)];
    }

    private void Update()
    {
        HandlePlayerInput();
        UpdateHopAnimation();
        UpdateLanes();
        UpdateIdleAndEagle();
        UpdateCameraFollow();
    }

    private void HandlePlayerInput()
    {
        if (state != GameState.Playing) return;
        if (isHopping) return;

        int moveX = 0;
        int moveZ = 0;

        if (Input.GetKeyDown(KeyCode.W) || Input.GetKeyDown(KeyCode.UpArrow)) moveZ = 1;
        else if (Input.GetKeyDown(KeyCode.S) || Input.GetKeyDown(KeyCode.DownArrow)) moveZ = -1;
        else if (Input.GetKeyDown(KeyCode.A) || Input.GetKeyDown(KeyCode.LeftArrow)) moveX = -1;
        else if (Input.GetKeyDown(KeyCode.D) || Input.GetKeyDown(KeyCode.RightArrow)) moveX = 1;

        if (moveX != 0 || moveZ != 0)
        {
            TryHop(moveX, moveZ);
        }
    }

    public void OnVirtualButtonHop(string dir)
    {
        if (state != GameState.Playing || isHopping) return;

        if (dir == "up") TryHop(0, 1);
        else if (dir == "down") TryHop(0, -1);
        else if (dir == "left") TryHop(-1, 0);
        else if (dir == "right") TryHop(1, 0);
    }

    private void TryHop(int deltaCol, int deltaLane)
    {
        int targetCol = Mathf.Clamp(playerCol + deltaCol, -5, 5);
        int targetLaneIdx = playerLaneIdx + deltaLane;

        // Can't move backward past start
        if (targetLaneIdx < 0) return;

        Lane targetLane = GetLaneByIndex(targetLaneIdx);
        if (targetLane != null)
        {
            // Check tree collision
            if (targetLane.type == LaneType.Grass && targetLane.treeCols.Contains(targetCol))
            {
                PlayTone(180f, 0.08f, "square");
                return; // Blocked by tree!
            }
        }

        // Valid Hop!
        playerCol = targetCol;
        playerLaneIdx = targetLaneIdx;
        hopStartPos = currentPos;
        hopTargetPos = new Vector3(playerCol * ColPitch, 0f, playerLaneIdx * LanePitch);
        isHopping = true;
        hopProgress = 0f;
        idleTimer = 0f; // Reset idle timer!

        // Rotation towards hop direction
        if (deltaLane > 0) targetRotation = Quaternion.Euler(0f, 0f, 0f);
        else if (deltaLane < 0) targetRotation = Quaternion.Euler(0f, 180f, 0f);
        else if (deltaCol > 0) targetRotation = Quaternion.Euler(0f, 90f, 0f);
        else if (deltaCol < 0) targetRotation = Quaternion.Euler(0f, -90f, 0f);

        PlayHopSound();

        // Update score
        if (playerLaneIdx > furthestLaneReached)
        {
            furthestLaneReached = playerLaneIdx;
            score = furthestLaneReached;
            if (score > bestScore) bestScore = score;
            CheckVictoryConditions();
        }
    }

    private Lane GetLaneByIndex(int idx)
    {
        foreach (var l in activeLanes)
        {
            if (l.index == idx) return l;
        }
        return null;
    }

    private void UpdateHopAnimation()
    {
        if (isHopping)
        {
            hopProgress += Time.deltaTime / HopDuration;

            // Parabolic hop
            Vector3 pos = Vector3.Lerp(hopStartPos, hopTargetPos, hopProgress);
            pos.y = Mathf.Sin(hopProgress * Mathf.PI) * 0.65f;
            currentPos = pos;

            if (chickenBodyGo != null)
            {
                chickenBodyGo.transform.parent.position = currentPos;
                chickenBodyGo.transform.parent.rotation = Quaternion.Slerp(chickenBodyGo.transform.parent.rotation, targetRotation, hopProgress);
            }

            if (hopProgress >= 1.0f)
            {
                isHopping = false;
                currentPos = hopTargetPos;
                currentPos.y = 0f;
                if (chickenBodyGo != null) chickenBodyGo.transform.parent.position = currentPos;

                // Check coin pickup
                CheckCoinPickup();

                // Post-hop lane hazard checks (River drown check)
                CheckPostHopHazards();
            }
        }
    }

    private void CheckCoinPickup()
    {
        Lane lane = GetLaneByIndex(playerLaneIdx);
        if (lane != null && lane.coin != null && !lane.coin.isCollected)
        {
            if (Mathf.Abs(currentPos.x - lane.coin.x) < 0.75f)
            {
                lane.coin.isCollected = true;
                if (lane.coin.go != null) Destroy(lane.coin.go);
                coinsCollected++;
                PlayCoinDing();
            }
        }
    }

    private void CheckPostHopHazards()
    {
        Lane lane = GetLaneByIndex(playerLaneIdx);
        if (lane != null && lane.type == LaneType.River)
        {
            // Check if player is on ANY floating log
            bool onLog = false;
            foreach (var log in lane.logs)
            {
                if (Mathf.Abs(currentPos.x - log.x) < (log.width * 0.5f + 0.25f))
                {
                    onLog = true;
                    break;
                }
            }

            if (!onLog)
            {
                // Drowned!
                TriggerGameOver(new LocalizedText("강물에 빠져 익사했습니다!", "Drowned in the rushing river!", "急流に落ちて溺れてしまいました！", "¡Te ahogaste en el río caudaloso!"));
                PlaySplashSound();
            }
        }
    }

    private void UpdateLanes()
    {
        Lane playerCurrentLane = GetLaneByIndex(playerLaneIdx);

        foreach (var lane in activeLanes)
        {
            // 1. Vehicles
            if (lane.type == LaneType.Road)
            {
                foreach (var veh in lane.vehicles)
                {
                    veh.x += veh.speed * Time.deltaTime;

                    // Wrap around
                    if (lane.direction > 0 && veh.x > 14f) veh.x = -14f;
                    else if (lane.direction < 0 && veh.x < -14f) veh.x = 14f;

                    if (veh.go != null) veh.go.transform.position = new Vector3(veh.x, 0.45f, lane.worldZ);

                    // Check collision with player
                    if (state == GameState.Playing && lane.index == playerLaneIdx)
                    {
                        if (Mathf.Abs(currentPos.x - veh.x) < (veh.width * 0.5f + 0.35f))
                        {
                            TriggerGameOver(new LocalizedText("빠르게 달리는 차량에 치였습니다!", "Hit by a speeding car!", "走ってくる車に衝突しました！", "¡Atropellado por un auto!"));
                            PlayCarHonk();
                            shakeTrauma = 0.5f;
                        }
                    }
                }
            }

            // 2. River Logs
            if (lane.type == LaneType.River)
            {
                foreach (var log in lane.logs)
                {
                    log.x += log.speed * Time.deltaTime;

                    // Wrap around
                    if (log.speed > 0 && log.x > 13f) log.x = -13f;
                    else if (log.speed < 0 && log.x < -13f) log.x = 13f;

                    if (log.go != null) log.go.transform.position = new Vector3(log.x, 0.1f, lane.worldZ);
                }

                // If player is standing on this river lane, drift with the log!
                if (state == GameState.Playing && !isHopping && lane.index == playerLaneIdx)
                {
                    bool onLog = false;
                    foreach (var log in lane.logs)
                    {
                        if (Mathf.Abs(currentPos.x - log.x) < (log.width * 0.5f + 0.25f))
                        {
                            currentPos.x += log.speed * Time.deltaTime;
                            if (chickenBodyGo != null) chickenBodyGo.transform.parent.position = currentPos;
                            onLog = true;
                            break;
                        }
                    }

                    // Drifted out of bounds or off log
                    if (!onLog || Mathf.Abs(currentPos.x) > 7.5f)
                    {
                        TriggerGameOver(new LocalizedText("강물에 떠내려가 익사했습니다!", "Swept away by the rapid river!", "川に流されてしまいました！", "¡Arrastrado por la corriente del río!"));
                        PlaySplashSound();
                    }
                }
            }

            // 3. Railway Trains
            if (lane.type == LaneType.Rail)
            {
                lane.trainTimer -= Time.deltaTime;
                if (lane.trainTimer <= 0f)
                {
                    // Train rush!
                    lane.trainX += 34f * Time.deltaTime;
                    if (lane.trainGo != null) lane.trainGo.transform.position = new Vector3(lane.trainX, 0.9f, lane.worldZ);

                    // Train collision check
                    if (state == GameState.Playing && lane.index == playerLaneIdx)
                    {
                        if (Mathf.Abs(currentPos.x - lane.trainX) < 8.5f)
                        {
                            TriggerGameOver(new LocalizedText("초고속 열차에 치였습니다!", "Hit by a high-speed bullet train!", "超高速新幹線に衝突しました！", "¡Impactado por el tren bala!"));
                            PlayTone(120f, 0.5f, "noise");
                            shakeTrauma = 0.8f;
                        }
                    }

                    if (lane.trainX > 45f)
                    {
                        lane.trainX = -45f;
                        lane.trainTimer = UnityEngine.Random.Range(5f, 10f);
                    }
                }
            }
        }
    }

    private void UpdateIdleAndEagle()
    {
        if (state != GameState.Playing) return;

        idleTimer += Time.deltaTime;

        if (idleTimer >= MaxIdleBeforeEagle && !eagleActive)
        {
            // Eagle swoop!
            eagleActive = true;
            PlayTone(880f, 0.45f, "sawtooth");

            eagleGo = GameObject.CreatePrimitive(PrimitiveType.Cube);
            eagleGo.name = "Eagle";
            eaglePos = currentPos + new Vector3(-8f, 12f, -8f);
            eagleGo.transform.position = eaglePos;
            eagleGo.transform.localScale = new Vector3(2.2f, 0.5f, 1.4f);
            eagleGo.GetComponent<Renderer>().material = new Material(Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Standard"));
            eagleGo.GetComponent<Renderer>().material.color = new Color(0.2f, 0.15f, 0.1f);
        }

        if (eagleActive && eagleGo != null)
        {
            eaglePos = Vector3.MoveTowards(eaglePos, currentPos, Time.deltaTime * 22f);
            eagleGo.transform.position = eaglePos;

            if (Vector3.Distance(eaglePos, currentPos) < 1.2f)
            {
                // Snatched!
                TriggerGameOver(new LocalizedText("독수리에게 낚아채였습니다!", "Snagged by a giant hunting eagle!", "巨大なワシにさらわれました！", "¡Atrapado por un águila cazadora!"));
                if (chickenBodyGo != null) chickenBodyGo.transform.parent.gameObject.SetActive(false);
            }
        }
    }

    private void UpdateCameraFollow()
    {
        if (mainCam != null)
        {
            Vector3 targetCamPos = currentPos + new Vector3(-8f, 13f, -8f);
            mainCam.transform.position = Vector3.Lerp(mainCam.transform.position, targetCamPos, Time.deltaTime * 4.5f);

            if (shakeTrauma > 0f)
            {
                mainCam.transform.position += new Vector3(UnityEngine.Random.Range(-shakeTrauma, shakeTrauma), UnityEngine.Random.Range(-shakeTrauma, shakeTrauma), 0f);
                shakeTrauma = Mathf.Max(0f, shakeTrauma - Time.deltaTime * 1.5f);
            }
        }
    }

    private void CheckVictoryConditions()
    {
        if (isEndlessMode) return;

        StageDef stage = stages[currentStageIdx];
        bool reachedDist = (playerLaneIdx >= stage.targetDistance);
        bool collectedCoins = (stage.requiredCoins == 0 || coinsCollected >= stage.requiredCoins);

        if (reachedDist && collectedCoins)
        {
            state = GameState.Victory;
            PlayFanfare();
        }
    }

    private void TriggerGameOver(LocalizedText reason)
    {
        state = GameState.GameOver;
        deathCauseText = reason;
    }

    private void PlayFanfare()
    {
        StartCoroutine(FanfareRoutine());
    }

    private IEnumerator FanfareRoutine()
    {
        float[] notes = { 440f, 554.37f, 659.25f, 880f };
        foreach (var n in notes)
        {
            PlayTone(n, 0.25f, "triangle");
            yield return new WaitForSeconds(0.12f);
        }
    }

    // GUI HUD & Modals
    private void OnGUI()
    {
        GUI.skin.label.fontSize = 15;
        GUI.skin.button.fontSize = 14;

        // Top Navigation Bar
        GUILayout.BeginArea(new Rect(16, 14, Screen.width - 32, 60));
        GUILayout.BeginHorizontal();

        StageDef def = stages[currentStageIdx];
        string title = isEndlessMode ? (currentLang == Language.KO ? "무한 자유 홉 모드" : "Endless Mode") : def.name.Get(currentLang);
        GUILayout.Label(string.Format("<b><color=#00f0ff>{0}</color></b>", title), GUILayout.Width(280));

        // Score (Meters)
        string scoreLabel = currentLang == Language.KO ? "거리" : currentLang == Language.JA ? "距離" : currentLang == Language.ES ? "Distancia" : "Dist";
        GUILayout.Label(string.Format("🚶 {0}: <b><color=#ffd700>{1}m</color></b> (최고: {2}m)", scoreLabel, score, bestScore), GUILayout.Width(220));

        // Coins
        GUILayout.Label(string.Format("🪙 {0}", coinsCollected), GUILayout.Width(80));

        GUILayout.FlexibleSpace();

        // Stage Select Modal Button
        string stageBtn = currentLang == Language.KO ? "📑 스테이지" : currentLang == Language.JA ? "📑 ステージ" : currentLang == Language.ES ? "📑 Etapas" : "📑 Stages";
        if (GUILayout.Button(stageBtn, GUILayout.Width(110), GUILayout.Height(34)))
        {
            showStageSelect = !showStageSelect;
        }

        // Language Switcher Button
        string langBtn = string.Format("🌐 {0}", currentLang);
        if (GUILayout.Button(langBtn, GUILayout.Width(88), GUILayout.Height(34)))
        {
            currentLang = (Language)(((int)currentLang + 1) % 4);
        }

        GUILayout.EndHorizontal();
        GUILayout.EndArea();

        // On-Screen Virtual D-Pad Touch Controls (Bottom Center)
        RenderVirtualDPad();

        // Stage Select Modal
        if (showStageSelect)
        {
            RenderStageSelectModal();
        }

        // Game Over Modal
        if (state == GameState.GameOver)
        {
            RenderGameOverModal();
        }

        // Victory Modal
        if (state == GameState.Victory)
        {
            RenderVictoryModal();
        }
    }

    private void RenderVirtualDPad()
    {
        float cx = Screen.width * 0.5f;
        float by = Screen.height - 110;

        // Up Button
        if (GUI.Button(new Rect(cx - 35, by - 65, 70, 50), "▲\nUP"))
        {
            OnVirtualButtonHop("up");
        }

        // Down Button
        if (GUI.Button(new Rect(cx - 35, by + 5, 70, 50), "▼\nDOWN"))
        {
            OnVirtualButtonHop("down");
        }

        // Left Button
        if (GUI.Button(new Rect(cx - 115, by - 30, 70, 50), "◀\nLEFT"))
        {
            OnVirtualButtonHop("left");
        }

        // Right Button
        if (GUI.Button(new Rect(cx + 45, by - 30, 70, 50), "▶\nRIGHT"))
        {
            OnVirtualButtonHop("right");
        }
    }

    private void RenderStageSelectModal()
    {
        GUI.Box(new Rect(Screen.width * 0.5f - 240, Screen.height * 0.5f - 230, 480, 460), "");
        GUILayout.BeginArea(new Rect(Screen.width * 0.5f - 220, Screen.height * 0.5f - 210, 440, 420));

        string mapHeader = currentLang == Language.KO ? "<b><color=#00f0ff>월드 스테이지 선택 (12 Stages)</color></b>" : "<b><color=#00f0ff>Select Stage (12 Stages)</color></b>";
        GUILayout.Label(mapHeader, GUILayout.Height(30));

        for (int i = 0; i < stages.Count; i++)
        {
            if (i % 2 == 0) GUILayout.BeginHorizontal();

            StageDef s = stages[i];
            string btnLabel = string.Format("#{0} {1}", s.stageNum, s.name.Get(currentLang).Split(':')[1].Trim());
            if (GUILayout.Button(btnLabel, GUILayout.Height(42)))
            {
                isEndlessMode = false;
                LoadStage(i);
            }

            if (i % 2 == 1 || i == stages.Count - 1) GUILayout.EndHorizontal();
        }

        GUILayout.Space(8);

        // Endless Mode Toggle
        string endlessTxt = isEndlessMode ? (currentLang == Language.KO ? "★ 무한 모드 플레이 중 ★" : "★ Playing Endless Mode ★") : (currentLang == Language.KO ? "무한 자유 모드 전환" : "Switch to Endless Mode");
        if (GUILayout.Button(endlessTxt, GUILayout.Height(38)))
        {
            isEndlessMode = true;
            LoadStage(0);
        }

        if (GUILayout.Button(currentLang == Language.KO ? "닫기" : "Close", GUILayout.Height(36)))
        {
            showStageSelect = false;
        }

        GUILayout.EndArea();
    }

    private void RenderGameOverModal()
    {
        GUI.Box(new Rect(Screen.width * 0.5f - 190, Screen.height * 0.5f - 140, 380, 280), "");
        GUILayout.BeginArea(new Rect(Screen.width * 0.5f - 170, Screen.height * 0.5f - 120, 340, 240));

        GUILayout.Label("<b><color=#ef4444>GAME OVER</color></b>", GUILayout.Height(30));
        if (deathCauseText != null)
        {
            GUILayout.Label(string.Format("<color=#fca5a5>{0}</color>", deathCauseText.Get(currentLang)));
        }

        GUILayout.Label(string.Format("Distance: <b><color=#ffd700>{0}m</color></b>", score));
        GUILayout.Label(string.Format("Coins: <b><color=#38bdf8>{0}</color></b>", coinsCollected));

        GUILayout.Space(12);

        string retryTxt = currentLang == Language.KO ? "다시 도전" : "Retry";
        if (GUILayout.Button(retryTxt, GUILayout.Height(40)))
        {
            LoadStage(currentStageIdx);
        }

        string stageTxt = currentLang == Language.KO ? "스테이지 목록" : "Stage Select";
        if (GUILayout.Button(stageTxt, GUILayout.Height(36)))
        {
            showStageSelect = true;
        }

        GUILayout.EndArea();
    }

    private void RenderVictoryModal()
    {
        GUI.Box(new Rect(Screen.width * 0.5f - 190, Screen.height * 0.5f - 140, 380, 280), "");
        GUILayout.BeginArea(new Rect(Screen.width * 0.5f - 170, Screen.height * 0.5f - 120, 340, 240));

        GUILayout.Label("<b><color=#22c55e>★ STAGE COMPLETED! ★</color></b>", GUILayout.Height(30));
        GUILayout.Label(string.Format("Distance: <b><color=#ffd700>{0}m</color></b>", score));
        GUILayout.Label(string.Format("Coins Collected: <b><color=#38bdf8>{0}</color></b>", coinsCollected));

        GUILayout.Space(12);

        if (currentStageIdx < stages.Count - 1)
        {
            string nextTxt = currentLang == Language.KO ? "다음 스테이지 ➔" : "Next Stage ➔";
            if (GUILayout.Button(nextTxt, GUILayout.Height(42)))
            {
                LoadStage(currentStageIdx + 1);
            }
        }
        else
        {
            string masterTxt = currentLang == Language.KO ? "★ 12개 전 스테이지 정복 완료! ★" : "★ All 12 Stages Mastered! ★";
            GUILayout.Label(masterTxt, GUILayout.Height(36));
        }

        string replayTxt = currentLang == Language.KO ? "현재 스테이지 다시하기" : "Replay Stage";
        if (GUILayout.Button(replayTxt, GUILayout.Height(36)))
        {
            LoadStage(currentStageIdx);
        }

        GUILayout.EndArea();
    }
}
