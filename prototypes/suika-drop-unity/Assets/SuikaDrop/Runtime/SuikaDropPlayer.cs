using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class SuikaDropPlayer : MonoBehaviour
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

    public class FruitTierDef
    {
        public int tier;
        public LocalizedText name;
        public string emoji;
        public float radius;
        public int score;
        public Color color;
    }

    public class Fruit
    {
        public int id;
        public int tier;
        public Vector2 pos;
        public Vector2 vel;
        public float radius;
        public float mass;
        public float popAnim = 1.0f;
        public bool isSpecialJoker = false;
        public bool isPendingMerge = false;
        public GameObject go;
        public Material mat;
    }

    public class Bumper
    {
        public Vector2 pos;
        public float radius;
        public GameObject go;
    }

    public class StageDef
    {
        public int stageNum;
        public LocalizedText title;
        public LocalizedText briefing;
        public int targetTier; // target fruit tier to reach (e.g. 4 Persimmon, 9 Watermelon)
        public int targetScore; // alternative score target
        public float gravityScale;
        public float containerWidth;
        public bool allowJoker;
        public List<Bumper> bumpers;
    }

    // Container Dimensions
    private float containerW = 6.4f;
    private const float ContainerH = 8.8f;
    private const float BottomY = -4.6f;
    private const float DeadlineY = 3.2f;
    private const float DropSpawnY = 4.2f;

    // Dropper State
    private float dropperX = 0f;
    private int currentDropTier = 0;
    private int nextDropTier = 0;
    private float dropCooldown = 0f;
    private GameObject dropperGuideGo;

    // Simulation Entities
    private List<Fruit> fruits = new List<Fruit>();
    private List<Bumper> activeBumpers = new List<Bumper>();
    private GameObject leftWallGo;
    private GameObject rightWallGo;
    private GameObject bottomWallGo;
    private GameObject deadlineLineGo;

    // Camera & Visuals
    private Camera mainCam;
    private Light dirLight;
    private Material glassMat;

    // Combat / Score / State
    public enum GameState { Playing, Victory, GameOver }
    private GameState state = GameState.Playing;
    private int score = 0;
    private int mergesCount = 0;
    private int comboChain = 0;
    private float comboTimer = 0f;
    private float overfillTimer = 0f;
    private int currentStageIdx = 0;
    private bool showStageSelect = false;
    private float cameraTrauma = 0f;

    // Particles & Floating Text
    private struct BurstParticle
    {
        public Vector3 pos;
        public Vector3 vel;
        public Color color;
        public float life;
        public float maxLife;
    }
    private List<BurstParticle> burstParticles = new List<BurstParticle>();

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
    private AudioClip sndDrop;
    private AudioClip sndWatermelon;
    private AudioClip sndWarning;
    private AudioClip sndShake;
    private AudioClip sndGameOver;
    private AudioClip[] sndMergeChimes;

    // 10 Evolution Tiers
    private FruitTierDef[] fruitTiers;

    // 12 Mandatory Stages (User Rule: Minimum 10 stages accessible)
    private StageDef[] stages;

    void Awake()
    {
        SetupCameraAndLighting();
        BuildFruitTiersDatabase();
        BuildAudioClips();
        BuildContainerVisuals();
        BuildStagesDatabase();
        LoadStage(0);
    }

    void SetupCameraAndLighting()
    {
        var camGo = new GameObject("Main Camera");
        camGo.tag = "MainCamera";
        mainCam = camGo.AddComponent<Camera>();
        mainCam.clearFlags = CameraClearFlags.SolidColor;
        mainCam.backgroundColor = new Color(0.06f, 0.08f, 0.14f); // dark indigo acrylic
        camGo.transform.position = new Vector3(0f, 0f, -13.5f);
        camGo.transform.rotation = Quaternion.identity;
        mainCam.fieldOfView = 54f;

        var lightGo = new GameObject("DirLight");
        dirLight = lightGo.AddComponent<Light>();
        dirLight.type = LightType.Directional;
        dirLight.color = new Color(1.0f, 0.98f, 0.92f);
        dirLight.intensity = 1.25f;
        lightGo.transform.rotation = Quaternion.Euler(45f, -25f, 0f);

        audioSource = gameObject.AddComponent<AudioSource>();
        audioSource.playOnAwake = false;
    }

    void BuildFruitTiersDatabase()
    {
        fruitTiers = new FruitTierDef[]
        {
            new FruitTierDef { tier = 0, name = new LocalizedText("체리", "Cherry", "さくらんぼ", "Cereza"), emoji = "🍒", radius = 0.28f, score = 2, color = new Color(0.96f, 0.25f, 0.37f) },
            new FruitTierDef { tier = 1, name = new LocalizedText("딸기", "Strawberry", "いちご", "Fresa"), emoji = "🍓", radius = 0.36f, score = 4, color = new Color(0.98f, 0.44f, 0.52f) },
            new FruitTierDef { tier = 2, name = new LocalizedText("포도", "Grape", "ぶどう", "Uva"), emoji = "🍇", radius = 0.45f, score = 8, color = new Color(0.66f, 0.33f, 0.97f) },
            new FruitTierDef { tier = 3, name = new LocalizedText("한라봉", "Dekopon", "デコポン", "Mandarina"), emoji = "🍊", radius = 0.55f, score = 16, color = new Color(0.98f, 0.57f, 0.24f) },
            new FruitTierDef { tier = 4, name = new LocalizedText("감", "Persimmon", "柿", "Caqui"), emoji = "🍅", radius = 0.65f, score = 32, color = new Color(0.98f, 0.45f, 0.09f) },
            new FruitTierDef { tier = 5, name = new LocalizedText("사과", "Apple", "りんご", "Manzana"), emoji = "🍎", radius = 0.76f, score = 64, color = new Color(0.94f, 0.27f, 0.27f) },
            new FruitTierDef { tier = 6, name = new LocalizedText("배", "Pear", "梨", "Pera"), emoji = "🍐", radius = 0.88f, score = 128, color = new Color(0.64f, 0.90f, 0.21f) },
            new FruitTierDef { tier = 7, name = new LocalizedText("복숭아", "Peach", "桃", "Melocotón"), emoji = "🍑", radius = 1.02f, score = 256, color = new Color(0.96f, 0.45f, 0.71f) },
            new FruitTierDef { tier = 8, name = new LocalizedText("파인애플", "Pineapple", "パイナップル", "Piña"), emoji = "🍍", radius = 1.18f, score = 512, color = new Color(0.98f, 0.80f, 0.08f) },
            new FruitTierDef { tier = 9, name = new LocalizedText("수박", "Watermelon", "スイカ", "Sandía"), emoji = "🍉", radius = 1.38f, score = 1024, color = new Color(0.13f, 0.77f, 0.37f) }
        };
    }

    void BuildContainerVisuals()
    {
        glassMat = new Material(Shader.Find("Sprites/Default"));
        glassMat.color = new Color(0.2f, 0.35f, 0.55f);

        // Background Backdrop
        var bg = GameObject.CreatePrimitive(PrimitiveType.Quad);
        bg.name = "Backdrop";
        bg.transform.position = new Vector3(0f, -0.2f, 0.5f);
        bg.transform.localScale = new Vector3(containerW + 0.2f, ContainerH, 1f);
        var bgMat = new Material(Shader.Find("Sprites/Default"));
        bgMat.color = new Color(0.08f, 0.12f, 0.20f);
        bg.GetComponent<MeshRenderer>().material = bgMat;

        // Container Walls
        leftWallGo = GameObject.CreatePrimitive(PrimitiveType.Cube);
        leftWallGo.name = "LeftWall";
        leftWallGo.transform.localScale = new Vector3(0.35f, ContainerH, 0.6f);
        leftWallGo.GetComponent<MeshRenderer>().material = glassMat;

        rightWallGo = GameObject.CreatePrimitive(PrimitiveType.Cube);
        rightWallGo.name = "RightWall";
        rightWallGo.transform.localScale = new Vector3(0.35f, ContainerH, 0.6f);
        rightWallGo.GetComponent<MeshRenderer>().material = glassMat;

        bottomWallGo = GameObject.CreatePrimitive(PrimitiveType.Cube);
        bottomWallGo.name = "BottomWall";
        bottomWallGo.transform.position = new Vector3(0f, BottomY - 0.2f, 0f);
        bottomWallGo.transform.localScale = new Vector3(containerW + 0.8f, 0.4f, 0.6f);
        bottomWallGo.GetComponent<MeshRenderer>().material = glassMat;

        // Deadline Warning Line
        deadlineLineGo = GameObject.CreatePrimitive(PrimitiveType.Cube);
        deadlineLineGo.name = "DeadlineLine";
        deadlineLineGo.transform.position = new Vector3(0f, DeadlineY, -0.1f);
        deadlineLineGo.transform.localScale = new Vector3(containerW, 0.08f, 0.2f);
        var redLineMat = new Material(Shader.Find("Sprites/Default"));
        redLineMat.color = new Color(0.95f, 0.25f, 0.25f, 0.85f);
        deadlineLineGo.GetComponent<MeshRenderer>().material = redLineMat;

        // Dropper Aim Indicator
        dropperGuideGo = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        dropperGuideGo.name = "DropperGuide";
        dropperGuideGo.transform.position = new Vector3(0f, DropSpawnY, -0.2f);
        dropperGuideGo.transform.localScale = Vector3.one * 0.45f;
        var guideMat = new Material(Shader.Find("Sprites/Default"));
        guideMat.color = new Color(1f, 1f, 1f, 0.8f);
        dropperGuideGo.GetComponent<MeshRenderer>().material = guideMat;

        UpdateContainerWallPositions();
    }

    void UpdateContainerWallPositions()
    {
        float halfW = containerW * 0.5f;
        leftWallGo.transform.position = new Vector3(-halfW - 0.175f, -0.2f, 0f);
        rightWallGo.transform.position = new Vector3(halfW + 0.175f, -0.2f, 0f);
        bottomWallGo.transform.localScale = new Vector3(containerW + 0.7f, 0.4f, 0.6f);
        deadlineLineGo.transform.localScale = new Vector3(containerW, 0.08f, 0.2f);
    }

    void BuildStagesDatabase()
    {
        stages = new StageDef[]
        {
            // Stage 1: Cherry Starter
            new StageDef
            {
                stageNum = 1,
                title = new LocalizedText("체리 과수원 입문", "Cherry Orchard Starter", "さくらんぼ果樹園入門", "Iniciación en el Huerto"),
                briefing = new LocalizedText("과일을 떨어뜨려 같은 과일끼리 합체시키세요. 감(Persimmon) 합성을 달성하십시오!", "Drop and merge matching fruits. Evolve up to a Persimmon (Tier 4)!", "同じ果物をぶつけて合体させよう。柿の合成を達成せよ！", "Suelta frutas y fusiona iguales. ¡Alcanza el Caqui!"),
                targetTier = 4,
                targetScore = 300,
                gravityScale = 1.0f,
                containerWidth = 6.4f,
                allowJoker = false,
                bumpers = new List<Bumper>()
            },

            // Stage 2: Citrus Grove
            new StageDef
            {
                stageNum = 2,
                title = new LocalizedText("달콤한 시트러스 밭", "Citrus Grove", "甘いシトラス畑", "Campo de Cítricos"),
                briefing = new LocalizedText("한라봉을 거쳐 새콤달콤한 사과(Apple)까지 합체를 연결하십시오.", "Chain merges from Dekopon up to an Apple (Tier 5).", "デコポンから甘酸っぱいりんごへの合体をつなげよう。", "Encadena fusiones hasta la Manzana."),
                targetTier = 5,
                targetScore = 600,
                gravityScale = 1.0f,
                containerWidth = 6.4f,
                allowJoker = false,
                bumpers = new List<Bumper>()
            },

            // Stage 3: Apple Harvest
            new StageDef
            {
                stageNum = 3,
                title = new LocalizedText("사과 수확 바구니", "Apple Basket Harvest", "りんご収穫バスケット", "Cosecha de Manzanas"),
                briefing = new LocalizedText("바구니 안에서 큼직한 배(Pear)를 합성하십시오.", "Synthesize a large green Pear (Tier 6) in the harvest basket.", "バスケットの中で大きな梨の合成を目指せ。", "Sintetiza una gran Pera verde."),
                targetTier = 6,
                targetScore = 1000,
                gravityScale = 1.0f,
                containerWidth = 6.4f,
                allowJoker = false,
                bumpers = new List<Bumper>()
            },

            // Stage 4: Peach Valley
            new StageDef
            {
                stageNum = 4,
                title = new LocalizedText("복숭아 무릉도원", "Peach Valley", "桃の武陵桃源", "Valle del Melocotón"),
                briefing = new LocalizedText("탐스러운 분홍빛 복숭아(Peach)를 만들어내십시오.", "Grow a luscious pink Peach (Tier 7). Check your overfill deadline!", "みずみずしいピンクの桃を作り出そう。落下限界線に注意！", "Cultiva un Melocotón rosa. ¡Cuidado con el límite!"),
                targetTier = 7,
                targetScore = 1500,
                gravityScale = 1.0f,
                containerWidth = 6.4f,
                allowJoker = false,
                bumpers = new List<Bumper>()
            },

            // Stage 5: Tropical Pineapple [MID-BOSS CHALLENGE]
            new StageDef
            {
                stageNum = 5,
                title = new LocalizedText("열대 파인애플 섬 [중간 챌린지]", "Tropical Pineapple [MID-BOSS]", "熱帯パイナップル島 [中間試練]", "Isla de la Piña [SUB-DESAFÍO]"),
                briefing = new LocalizedText("거대한 파인애플(Pineapple)을 합성하십시오. 용적 관리가 승리의 열쇠입니다!", "Evolve into a giant Pineapple (Tier 8). Volume management is crucial!", "巨大なパイナップルを合成せよ。スペース管理が勝利の鍵！", "¡Fusiona una Piña gigante! Controla el espacio."),
                targetTier = 8,
                targetScore = 2400,
                gravityScale = 1.0f,
                containerWidth = 6.4f,
                allowJoker = false,
                bumpers = new List<Bumper>()
            },

            // Stage 6: The Golden Watermelon
            new StageDef
            {
                stageNum = 6,
                title = new LocalizedText("황금 수박의 탄생", "The Golden Watermelon", "黄金スイカの誕生", "El Nacimiento de la Sandía"),
                briefing = new LocalizedText("두 개의 파인애플을 합쳐 궁극의 거대 수박(Watermelon)을 완성하십시오!", "Merge two pineapples to create the ultimate Watermelon (Tier 9)!", "2つのパイナップルを合体させ、究極の巨大スイカを完成させよ！", "¡Une dos piñas para crear la Sandía final!"),
                targetTier = 9,
                targetScore = 3500,
                gravityScale = 1.0f,
                containerWidth = 6.4f,
                allowJoker = false,
                bumpers = new List<Bumper>()
            },

            // Stage 7: Bumper Glass Jar
            new StageDef
            {
                stageNum = 7,
                title = new LocalizedText("핀볼 범퍼가 설치된 수조", "Bumper Glass Jar", "ピンボールバンパーの水槽", "Tarro con Parachoques"),
                briefing = new LocalizedText("수조 내부에 탄성 범퍼가 설치되어 과일이 튀어 오릅니다. 탄성을 역이용하십시오.", "Interior bumpers bounce fruits around. Use the rebounds tactically.", "水槽内の弾性バンパーが果物を弾く。リバウンドを活用せよ。", "Parachoques interiores rebotan las frutas. Úsalos a favor."),
                targetTier = 8,
                targetScore = 3000,
                gravityScale = 1.0f,
                containerWidth = 6.6f,
                allowJoker = false,
                bumpers = new List<Bumper> {
                    new Bumper { pos = new Vector2(-1.5f, -1.0f), radius = 0.45f },
                    new Bumper { pos = new Vector2(1.5f, -1.0f), radius = 0.45f }
                }
            },

            // Stage 8: Low Gravity Space Jar
            new StageDef
            {
                stageNum = 8,
                title = new LocalizedText("저중력 우주 유리병", "Low Gravity Space Jar", "低重力宇宙ボトル", "Tarro Espacial de Baja Gravedad"),
                briefing = new LocalizedText("우주 저중력 환경: 과일들이 둥둥 떠오르며 우아한 슬로우 모션 합체가 일어납니다.", "Low gravity environment: Fruits float gently for graceful slow-mo fusions.", "低重力環境: 果物がふわふわ浮遊し優雅な合体が発生する。", "Baja gravedad: Frutas flotantes en cámara lenta."),
                targetTier = 8,
                targetScore = 3200,
                gravityScale = 0.45f,
                containerWidth = 6.4f,
                allowJoker = false,
                bumpers = new List<Bumper>()
            },

            // Stage 9: Rainbow Joker Magic
            new StageDef
            {
                stageNum = 9,
                title = new LocalizedText("무지개 조커 과일 마법", "Rainbow Joker Magic", "虹色ジョーカーフルーツの魔法", "Magia del Comodín Arcoíris"),
                briefing = new LocalizedText("어떤 과일과도 즉시 합체되는 무지개 조커 과일이 확률적으로 등장합니다!", "Rainbow Joker fruits spawn occasionally, merging with ANY fruit!", "どんな果物とも即座に合体できる虹色ジョーカーが登場！", "¡Aparecen comodines arcoíris que fusionan con cualquier fruta!"),
                targetTier = 9,
                targetScore = 4000,
                gravityScale = 1.0f,
                containerWidth = 6.4f,
                allowJoker = true,
                bumpers = new List<Bumper>()
            },

            // Stage 10: Twin Watermelon Fusion [FINAL CHALLENGE]
            new StageDef
            {
                stageNum = 10,
                title = new LocalizedText("쌍둥이 수박 대합체 [최종 챌린지]", "Twin Watermelon Fusion [FINAL]", "ツインスイカ大合体 [最終試練]", "Fusión Doble Sandía [FINAL]"),
                briefing = new LocalizedText("전설의 과수원 최종 퀘스트: 두 개의 수박(Watermelon)을 동시에 합성하십시오!", "Ultimate Quest: Synthesize TWO Watermelons in the same jar!", "伝説の果樹園最終試練: 2つの巨大スイカを同時に作り出せ！", "Desafío Máximo: ¡Crea DOS Sandías en el mismo tarro!"),
                targetTier = 9,
                targetScore = 6000,
                gravityScale = 1.0f,
                containerWidth = 6.8f,
                allowJoker = true,
                bumpers = new List<Bumper>()
            },

            // Stage 11: Narrow Tube Challenge [SECRET 1]
            new StageDef
            {
                stageNum = 11,
                title = new LocalizedText("좁은 수직 튜브 챌린지 [시크릿 1]", "Narrow Tube Challenge [SECRET 1]", "細身垂直チューブ [シークレット1]", "Tubo Estrecho [SECRETO 1]"),
                briefing = new LocalizedText("극도로 좁은 수직 튜브에서 과일을 정밀하게 수직 적층하십시오. 한 치의 오차도 금물!", "Extremely narrow container. Precision drops only or instant overflow!", "極細の垂直チューブ。正確な落下のみが生き残る道！", "Tarro muy estrecho. Precisión milimétrica requerida."),
                targetTier = 7,
                targetScore = 2500,
                gravityScale = 1.05f,
                containerWidth = 4.4f,
                allowJoker = false,
                bumpers = new List<Bumper>()
            },

            // Stage 12: Grand Master 10,000-Point Harvest [CHAMPIONSHIP]
            new StageDef
            {
                stageNum = 12,
                title = new LocalizedText("만점 과수원 피날레 [마스터]", "Grand Master 10K Harvest [MASTER]", "万点果樹園フィナーレ [マスター]", "Gran Maestro 10K Cosecha [MAESTRO]"),
                briefing = new LocalizedText("챔피언십 최종 작전: 10,000점 스코어 돌파를 달성하는 궁극의 과일 물리 합체!", "Championship Finale: Surpass 10,000 points in a single legendary run!", "チャンピオンシップ最終章: 10,000点突破を達成する究極の果物物理合体！", "Gran Final: Supera los 10,000 puntos en una partida legendaria."),
                targetTier = 9,
                targetScore = 10000,
                gravityScale = 1.0f,
                containerWidth = 6.8f,
                allowJoker = true,
                bumpers = new List<Bumper>()
            }
        };
    }

    public void LoadStage(int idx)
    {
        currentStageIdx = Mathf.Clamp(idx, 0, stages.Length - 1);
        var s = stages[currentStageIdx];

        // Clear existing fruits
        foreach (var f in fruits) if (f.go != null) Destroy(f.go);
        fruits.Clear();

        foreach (var bmp in activeBumpers) if (bmp.go != null) Destroy(bmp.go);
        activeBumpers.Clear();

        containerW = s.containerWidth;
        UpdateContainerWallPositions();

        // Spawn Bumpers
        foreach (var bDef in s.bumpers)
        {
            var b = new Bumper { pos = bDef.pos, radius = bDef.radius };
            var bGo = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            bGo.name = "Bumper";
            bGo.transform.position = new Vector3(b.pos.x, b.pos.y, -0.1f);
            bGo.transform.rotation = Quaternion.Euler(90f, 0f, 0f);
            bGo.transform.localScale = new Vector3(b.radius * 2f, 0.2f, b.radius * 2f);
            var m = new Material(Shader.Find("Sprites/Default"));
            m.color = new Color(0.9f, 0.35f, 0.95f);
            bGo.GetComponent<MeshRenderer>().material = m;
            b.go = bGo;
            activeBumpers.Add(b);
        }

        score = 0;
        mergesCount = 0;
        comboChain = 0;
        comboTimer = 0f;
        overfillTimer = 0f;
        dropCooldown = 0f;
        state = GameState.Playing;

        // Roll first drop fruits (Tiers 0~3)
        currentDropTier = UnityEngine.Random.Range(0, 4);
        nextDropTier = UnityEngine.Random.Range(0, 4);
        UpdateDropperVisual();

        PlayClip(sndDrop, 0.8f);
        SpawnFloatText(s.title.Get(currentLang), new Vector3(0f, 1.5f, 0f), Color.yellow);
    }

    void Update()
    {
        HandleCameraTrauma();
        UpdateFloatingTexts();
        UpdateBurstParticles();

        if (comboTimer > 0f)
        {
            comboTimer -= Time.deltaTime;
            if (comboTimer <= 0f) comboChain = 0;
        }

        if (state == GameState.Playing)
        {
            HandleDropperInput();
            UpdatePhysics(Time.deltaTime);
            CheckOverfillWarning(Time.deltaTime);
        }
    }

    void HandleCameraTrauma()
    {
        if (cameraTrauma > 0f)
        {
            cameraTrauma -= Time.deltaTime * 1.6f;
            float shakeAmt = cameraTrauma * cameraTrauma * 0.35f;
            mainCam.transform.position = new Vector3(
                UnityEngine.Random.Range(-shakeAmt, shakeAmt),
                UnityEngine.Random.Range(-shakeAmt, shakeAmt),
                -13.5f
            );
        }
        else
        {
            mainCam.transform.position = new Vector3(0f, 0f, -13.5f);
        }
    }

    void HandleDropperInput()
    {
        if (dropCooldown > 0f) dropCooldown -= Time.deltaTime;

        // Follow mouse/touch pointer horizontally
        Ray ray = mainCam.ScreenPointToRay(Input.mousePosition);
        Plane boardPlane = new Plane(Vector3.forward, Vector3.zero);
        float dist;
        if (boardPlane.Raycast(ray, out dist))
        {
            Vector3 worldPt = ray.GetPoint(dist);
            float limitX = (containerW * 0.5f) - fruitTiers[currentDropTier].radius - 0.1f;
            dropperX = Mathf.Clamp(worldPt.x, -limitX, limitX);
            dropperGuideGo.transform.position = new Vector3(dropperX, DropSpawnY, -0.2f);
        }

        // Release fruit on click/tap
        if (Input.GetMouseButtonDown(0))
        {
            if (Input.mousePosition.y < Screen.height - 130 && !showStageSelect)
            {
                if (dropCooldown <= 0f)
                {
                    DropFruit();
                }
            }
        }
    }

    void DropFruit()
    {
        dropCooldown = 0.55f;
        PlayClip(sndDrop, 0.85f);

        var s = stages[currentStageIdx];
        bool isJoker = (s.allowJoker && UnityEngine.Random.value < 0.08f);

        SpawnFruit(currentDropTier, new Vector2(dropperX, DropSpawnY), isJoker);

        currentDropTier = nextDropTier;
        nextDropTier = UnityEngine.Random.Range(0, 4);
        UpdateDropperVisual();
    }

    void UpdateDropperVisual()
    {
        var tierDef = fruitTiers[currentDropTier];
        dropperGuideGo.transform.localScale = Vector3.one * (tierDef.radius * 2f);
        dropperGuideGo.GetComponent<MeshRenderer>().material.color = tierDef.color;
    }

    void SpawnFruit(int tier, Vector2 pos, bool isJoker)
    {
        var tierDef = fruitTiers[tier];
        var fGo = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        fGo.name = "Fruit_T" + tier;
        fGo.transform.position = new Vector3(pos.x, pos.y, -0.1f);
        fGo.transform.localScale = Vector3.one * (tierDef.radius * 2f);

        var mat = new Material(Shader.Find("Sprites/Default"));
        mat.color = isJoker ? new Color(1f, 1f, 1f) : tierDef.color;
        fGo.GetComponent<MeshRenderer>().material = mat;

        fruits.Add(new Fruit
        {
            id = 100 + fruits.Count,
            tier = tier,
            pos = pos,
            vel = new Vector2(UnityEngine.Random.Range(-0.2f, 0.2f), -1.0f),
            radius = tierDef.radius,
            mass = Mathf.Pow(tierDef.radius, 2.5f) * 10f,
            popAnim = 1.0f,
            isSpecialJoker = isJoker,
            isPendingMerge = false,
            go = fGo,
            mat = mat
        });
    }

    void UpdatePhysics(float dt)
    {
        var s = stages[currentStageIdx];
        float gravity = -17.0f * s.gravityScale;
        float halfW = containerW * 0.5f;

        int subSteps = 4;
        float subDt = dt / subSteps;

        for (int step = 0; step < subSteps; step++)
        {
            // Apply Gravity & Velocity
            for (int i = 0; i < fruits.Count; i++)
            {
                var f = fruits[i];
                if (f.isPendingMerge) continue;

                f.vel.y += gravity * subDt;
                f.pos += f.vel * subDt;

                // Wall Bounds Collisions
                if (f.pos.x - f.radius < -halfW)
                {
                    f.pos.x = -halfW + f.radius;
                    f.vel.x = -f.vel.x * 0.35f;
                }
                else if (f.pos.x + f.radius > halfW)
                {
                    f.pos.x = halfW - f.radius;
                    f.vel.x = -f.vel.x * 0.35f;
                }

                // Bottom Floor Collision
                if (f.pos.y - f.radius < BottomY)
                {
                    f.pos.y = BottomY + f.radius;
                    f.vel.y = -f.vel.y * 0.3f;
                    f.vel.x *= 0.94f; // friction
                }

                // Bumper Collisions
                foreach (var bmp in activeBumpers)
                {
                    float dist = Vector2.Distance(f.pos, bmp.pos);
                    if (dist < f.radius + bmp.radius)
                    {
                        Vector2 norm = (f.pos - bmp.pos).normalized;
                        f.pos = bmp.pos + norm * (f.radius + bmp.radius + 0.02f);
                        f.vel = norm * 13.0f;
                    }
                }
            }

            // Fruit-to-Fruit Collisions & Fusion
            for (int i = 0; i < fruits.Count; i++)
            {
                var fA = fruits[i];
                if (fA.isPendingMerge) continue;

                for (int j = i + 1; j < fruits.Count; j++)
                {
                    var fB = fruits[j];
                    if (fB.isPendingMerge) continue;

                    float minDist = fA.radius + fB.radius;
                    Vector2 delta = fB.pos - fA.pos;
                    float distSqr = delta.x * delta.x + delta.y * delta.y;

                    if (distSqr < minDist * minDist)
                    {
                        float dist = Mathf.Sqrt(distSqr);
                        Vector2 norm = (dist > 0.0001f) ? (delta / dist) : Vector2.up;

                        // Check Same-Tier Fusion
                        bool canMerge = (fA.tier == fB.tier) || fA.isSpecialJoker || fB.isSpecialJoker;
                        if (canMerge && fA.tier < 9)
                        {
                            ExecuteFruitMerge(fA, fB);
                            break;
                        }
                        else
                        {
                            // Elastic bounce resolution
                            float overlap = minDist - dist;
                            fA.pos -= norm * (overlap * 0.5f);
                            fB.pos += norm * (overlap * 0.5f);

                            Vector2 relVel = fB.vel - fA.vel;
                            float velAlongNorm = Vector2.Dot(relVel, norm);
                            if (velAlongNorm < 0f)
                            {
                                float rest = 0.32f;
                                float impulseMag = -(1.0f + rest) * velAlongNorm / (1.0f / fA.mass + 1.0f / fB.mass);
                                fA.vel -= (impulseMag / fA.mass) * norm;
                                fB.vel += (impulseMag / fB.mass) * norm;
                            }
                        }
                    }
                }
            }
        }

        // Clean up pending merged fruits
        for (int i = fruits.Count - 1; i >= 0; i--)
        {
            if (fruits[i].isPendingMerge)
            {
                if (fruits[i].go != null) Destroy(fruits[i].go);
                fruits.RemoveAt(i);
            }
            else
            {
                // Update visuals and pop scale anim
                var f = fruits[i];
                if (f.popAnim > 1.0f) f.popAnim = Mathf.Max(1.0f, f.popAnim - dt * 3f);
                f.go.transform.position = new Vector3(f.pos.x, f.pos.y, -0.1f);
                f.go.transform.localScale = Vector3.one * (f.radius * 2f * f.popAnim);
            }
        }
    }

    void ExecuteFruitMerge(Fruit a, Fruit b)
    {
        a.isPendingMerge = true;
        b.isPendingMerge = true;

        Vector2 midPos = (a.pos + b.pos) * 0.5f;
        int nextTier = Mathf.Min(9, Math.Max(a.tier, b.tier) + 1);

        mergesCount++;
        comboChain++;
        comboTimer = 2.2f;

        var nextDef = fruitTiers[nextTier];
        score += nextDef.score * comboChain;

        // Audio & Visual Juice
        int chimeIdx = Mathf.Clamp(comboChain - 1, 0, sndMergeChimes.Length - 1);
        PlayClip(sndMergeChimes[chimeIdx], 0.85f);
        cameraTrauma = Mathf.Clamp01(cameraTrauma + 0.18f);

        SpawnFloatText("+" + (nextDef.score * comboChain) + (comboChain > 1 ? " COMBO x" + comboChain : ""), midPos, nextDef.color);

        // Spawn burst confetti particles
        for (int p = 0; p < 8; p++)
        {
            burstParticles.Add(new BurstParticle
            {
                pos = new Vector3(midPos.x, midPos.y, -0.2f),
                vel = UnityEngine.Random.insideUnitCircle * 5.0f,
                color = nextDef.color,
                life = 0.4f,
                maxLife = 0.4f
            });
        }

        // Spawn evolved fruit
        SpawnFruit(nextTier, midPos, false);
        var evolved = fruits[fruits.Count - 1];
        evolved.popAnim = 1.45f;

        // Watermelon Victory check
        if (nextTier >= 9)
        {
            PlayClip(sndWatermelon, 1.0f);
            cameraTrauma = 0.5f;
            SpawnFloatText("★ WATERMELON! ★", midPos, Color.green);
        }

        // Check Stage Clear Target
        var st = stages[currentStageIdx];
        if ((nextTier >= st.targetTier) || (score >= st.targetScore))
        {
            StartCoroutine(VictoryRoutine());
        }
    }

    IEnumerator VictoryRoutine()
    {
        yield return new WaitForSeconds(0.6f);
        state = GameState.Victory;
        PlayClip(sndWatermelon, 1.0f);
        cameraTrauma = 0.4f;
    }

    void CheckOverfillWarning(float dt)
    {
        bool isAnyFruitOverDeadline = false;
        for (int i = 0; i < fruits.Count; i++)
        {
            var f = fruits[i];
            // If settled above deadline
            if (f.pos.y + f.radius > DeadlineY && Mathf.Abs(f.vel.y) < 0.5f)
            {
                isAnyFruitOverDeadline = true;
                break;
            }
        }

        if (isAnyFruitOverDeadline)
        {
            overfillTimer += dt;
            if (overfillTimer > 3.2f)
            {
                state = GameState.GameOver;
                PlayClip(sndGameOver, 1.0f);
            }
        }
        else
        {
            overfillTimer = Mathf.Max(0f, overfillTimer - dt * 2f);
        }
    }

    public void NudgeContainerShake()
    {
        PlayClip(sndShake, 0.8f);
        cameraTrauma = 0.35f;

        // Nudge all fruits randomly
        foreach (var f in fruits)
        {
            f.vel += new Vector2(UnityEngine.Random.Range(-2.5f, 2.5f), UnityEngine.Random.Range(2.0f, 4.5f));
        }
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

    void UpdateBurstParticles()
    {
        for (int i = burstParticles.Count - 1; i >= 0; i--)
        {
            var p = burstParticles[i];
            p.life -= Time.deltaTime;
            p.pos += p.vel * Time.deltaTime;
            if (p.life <= 0f) burstParticles.RemoveAt(i);
            else burstParticles[i] = p;
        }
    }

    void OnGUI()
    {
        GUI.skin.label.fontSize = 13;
        GUI.skin.button.fontSize = 12;

        var s = stages[currentStageIdx];

        // Top Control Header Bar
        GUILayout.BeginArea(new Rect(12, 10, Screen.width - 24, 95));
        GUILayout.BeginHorizontal();

        // Stage Title & Target
        GUILayout.BeginVertical(GUI.skin.box, GUILayout.Width(250));
        GUILayout.Label("<color=#22c55e><b>STAGE " + s.stageNum + "/12</b></color>: " + s.title.Get(currentLang));
        var targetDef = fruitTiers[s.targetTier];
        GUILayout.Label("🎯 " + GetLocalizedTargetLabel() + ": <b>" + targetDef.name.Get(currentLang) + " " + targetDef.emoji + "</b> (or " + s.targetScore + " pts)");
        GUILayout.EndVertical();

        GUILayout.FlexibleSpace();

        // Current Score & Next Fruit Preview
        GUILayout.BeginVertical(GUI.skin.box, GUILayout.Width(230));
        GUILayout.Label("🏆 Score: <b>" + score + "</b>" + (comboChain > 1 ? " <color=#fde047>[x" + comboChain + "!]</color>" : ""));
        var nextDef = fruitTiers[nextDropTier];
        GUILayout.Label("🔮 " + GetLocalizedNextLabel() + ": <b>" + nextDef.name.Get(currentLang) + " " + nextDef.emoji + "</b>");
        GUILayout.EndVertical();

        GUILayout.FlexibleSpace();

        // Shake Button
        if (GUILayout.Button("📳 SHAKE\nNUDGE", GUILayout.Width(75), GUILayout.Height(50)))
        {
            NudgeContainerShake();
        }

        // Restart Stage Button
        if (GUILayout.Button("🔄 RESTART\nSTAGE", GUILayout.Width(80), GUILayout.Height(50)))
        {
            LoadStage(currentStageIdx);
        }

        // Stage Selector Button
        if (GUILayout.Button("🗺️ STAGES\n(1~12)", GUILayout.Width(80), GUILayout.Height(50)))
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

        // Overfill Warning Indicator
        if (overfillTimer > 0.5f)
        {
            float warnAlpha = Mathf.PingPong(Time.time * 4f, 1f);
            GUI.color = new Color(1f, 0.2f, 0.2f, warnAlpha);
            Rect warnRect = new Rect(Screen.width * 0.5f - 160, 115, 320, 32);
            GUI.Box(warnRect, "");
            GUI.Label(warnRect, "<b>⚠️ OVERFILL WARNING! " + (3.2f - overfillTimer).ToString("F1") + "s ⚠️</b>", GetCenterStyle(Color.red));
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
        if (state == GameState.Victory)
        {
            Rect winRect = new Rect(Screen.width * 0.5f - 200, Screen.height * 0.5f - 95, 400, 190);
            GUI.Box(winRect, "");
            GUILayout.BeginArea(winRect);
            GUILayout.Space(15);
            GUILayout.Label("<size=18><color=#4ade80><b>★ STAGE CLEARED! ★</b></color></size>", GetCenterStyle(Color.green));
            GUILayout.Space(8);
            GUILayout.Label(s.title.Get(currentLang) + " Target Achieved! Score: " + score, GetCenterStyle(Color.white));
            GUILayout.Label("Congratulations! Evolved fruit target accomplished.", GetCenterStyle(Color.yellow));
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

        // Game Over Modal
        if (state == GameState.GameOver)
        {
            Rect failRect = new Rect(Screen.width * 0.5f - 200, Screen.height * 0.5f - 85, 400, 170);
            GUI.Box(failRect, "");
            GUILayout.BeginArea(failRect);
            GUILayout.Space(15);
            GUILayout.Label("<size=18><color=#ef4444><b>☠️ OVERFLOW GAME OVER ☠️</b></color></size>", GetCenterStyle(Color.red));
            GUILayout.Space(8);
            GUILayout.Label("Fruit exceeded top deadline in " + s.title.Get(currentLang), GetCenterStyle(Color.white));
            GUILayout.Space(12);
            GUILayout.BeginHorizontal();
            GUILayout.FlexibleSpace();
            if (GUILayout.Button("🔄 RETRY STAGE", GUILayout.Width(170), GUILayout.Height(40)))
            {
                LoadStage(currentStageIdx);
            }
            GUILayout.FlexibleSpace();
            GUILayout.EndHorizontal();
            GUILayout.EndArea();
        }

        // 12-Stage Selector Modal (User Rule: Minimum 10 stages accessible)
        if (showStageSelect)
        {
            Rect modalRect = new Rect(Screen.width * 0.5f - 260, 105, 520, 420);
            GUI.Box(modalRect, "<b>SELECT SUIKA STAGE (1~12)</b>");
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
                        var tgDef = fruitTiers[st.targetTier];
                        string btnText = "<b>Stage " + st.stageNum + "</b>: " + st.title.Get(currentLang) + "\n(Target: " + tgDef.name.Get(currentLang) + " " + tgDef.emoji + ")";
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

    string GetLocalizedTargetLabel()
    {
        switch (currentLang)
        {
            case Language.KO: return "합성 목표";
            case Language.EN: return "Target Fruit";
            case Language.JA: return "合成目標";
            case Language.ES: return "Objetivo";
            default: return "Target";
        }
    }

    string GetLocalizedNextLabel()
    {
        switch (currentLang)
        {
            case Language.KO: return "다음 과일";
            case Language.EN: return "Next Fruit";
            case Language.JA: return "次の果物";
            case Language.ES: return "Siguiente";
            default: return "Next";
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
        sndDrop = SynthAudio(0.12f, t => {
            float f = Mathf.Lerp(400f, 200f, t);
            return Mathf.Sin(2f * Mathf.PI * f * t) * (1f - t);
        });

        sndWatermelon = SynthAudio(0.7f, t => {
            float f = 523.25f;
            if (t > 0.16f) f = 659.25f;
            if (t > 0.32f) f = 783.99f;
            if (t > 0.48f) f = 1046.50f;
            return Mathf.Sin(2f * Mathf.PI * f * t) * (1f - t);
        });

        sndWarning = SynthAudio(0.25f, t => {
            return Mathf.Sin(2f * Mathf.PI * 900f * t) * (1f - t);
        });

        sndShake = SynthAudio(0.22f, t => {
            float noise = (UnityEngine.Random.value * 2f - 1f) * 0.7f;
            float low = Mathf.Sin(2f * Mathf.PI * 75f * t) * 0.6f;
            return (noise + low) * (1f - t);
        });

        sndGameOver = SynthAudio(0.45f, t => {
            float f = Mathf.Lerp(350f, 100f, t);
            return Mathf.Sin(2f * Mathf.PI * f * t) * (1f - t);
        });

        // 8 Pentatonic Merge Chimes
        float[] freqs = new float[] { 261.63f, 293.66f, 329.63f, 392.00f, 440.00f, 523.25f, 587.33f, 659.25f };
        sndMergeChimes = new AudioClip[freqs.Length];
        for (int i = 0; i < freqs.Length; i++)
        {
            float f = freqs[i];
            sndMergeChimes[i] = SynthAudio(0.2f, t => {
                float pop = (UnityEngine.Random.value * 2f - 1f) * Mathf.Exp(-t * 30f) * 0.4f;
                float tone = Mathf.Sin(2f * Mathf.PI * f * t) * Mathf.Exp(-t * 12f) * 0.8f;
                return pop + tone;
            });
        }
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
        var clip = AudioClip.Create("SuikaClip", totalSamples, 1, sampleRate, false);
        clip.SetData(samples, 0);
        return clip;
    }
}
