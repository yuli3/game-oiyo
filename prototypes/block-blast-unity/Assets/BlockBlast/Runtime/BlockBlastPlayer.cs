using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class BlockBlastPlayer : MonoBehaviour
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

    public enum CellType
    {
        Empty = 0,
        Cyan = 1,
        Orange = 2,
        Purple = 3,
        Yellow = 4,
        Green = 5,
        Red = 6,
        Blue = 7,
        Ice = 8,       // Frozen block (requires line clear to melt)
        Gem = 9,       // Golden Gem block (+150 bonus and sparkles)
        Rock = 10,     // Indestructible stone block obstacle
        Bomb = 11,     // Countdown bomb (ticks down every move)
        Boss = 12      // Boss core multi-hit block
    }

    public class PolyShape
    {
        public int id;
        public int[,] matrix; // [row, col]
        public CellType type;
        public int rows;
        public int cols;

        public PolyShape(int id, int[,] m, CellType t)
        {
            this.id = id;
            this.matrix = m;
            this.type = t;
            this.rows = m.GetLength(0);
            this.cols = m.GetLength(1);
        }
    }

    public class HandPiece
    {
        public PolyShape shape;
        public Vector3 baseSlotPos;
        public GameObject rootGo;
        public List<GameObject> blockGos = new List<GameObject>();
        public bool isUsed = false;
    }

    public class FloatingFeedback
    {
        public string text;
        public Vector3 pos;
        public Color color;
        public float timer = 0f;
        public float duration = 1.2f;
    }

    public class ShardParticle
    {
        public Vector3 pos;
        public Vector3 vel;
        public Color color;
        public float scale;
        public float life = 0f;
        public float maxLife = 0.6f;
        public GameObject go;
    }

    public class StageDef
    {
        public int stageNum;
        public LocalizedText title;
        public LocalizedText briefing;
        public int targetScore;
        public int targetGems;
        public int targetCombos;
        public int targetMultiClears;
        public int bombCountdown;
        public int bossHp;
        public bool hasIce;
        public bool hasRocks;
        public bool hasBorderBlock;
    }

    // Grid Dimensions
    public const int GridSize = 8;
    private const float CellPitch = 1.05f;
    private const float CellBlockSize = 0.94f;
    private readonly Vector3 boardCenter = new Vector3(0f, 1.8f, 0f);
    private Vector3 boardBottomLeft;

    // Board State
    private CellType[,] grid = new CellType[GridSize, GridSize];
    private GameObject[,] gridGos = new GameObject[GridSize, GridSize];
    private int[,] bombCounters = new int[GridSize, GridSize];
    private int bossCurrentHp = 0;
    private int gemsCollected = 0;
    private int maxComboAchieved = 0;
    private int multiClearsCount = 0;

    // Hand Slots
    private HandPiece[] handPieces = new HandPiece[3];
    private int draggingSlot = -1;
    private Vector3 dragOffset;
    private Vector3 dragCurrentWorldPos;

    // Ghost Preview
    private List<GameObject> ghostGos = new List<GameObject>();

    // Visual Shards
    private List<ShardParticle> activeShards = new List<ShardParticle>();
    private List<FloatingFeedback> floatingTexts = new List<FloatingFeedback>();

    // Camera & Environment
    private Camera mainCam;
    private Light dirLight;
    private GameObject boardFrameGo;
    private GameObject[,] backgroundCellGos = new GameObject[GridSize, GridSize];

    // Colors & Materials
    private Material baseBlockMat;
    private Material ghostBlockMat;
    private Material boardSlotMat;
    private Material boardBorderMat;
    private Material shardMat;

    // Gameplay Stats
    public enum GameState { Playing, Victory, GameOver }
    private GameState state = GameState.Playing;
    private int currentScore = 0;
    private int bestScore = 0;
    private int currentCombo = 0;
    private int totalLinesCleared = 0;
    private int currentStageIdx = 0;
    private bool isEndlessMode = false;
    private bool showStageSelect = false;

    // Powerups
    private int bombPowerups = 1;
    private int shufflePowerups = 2;
    private float shakeIntensity = 0f;

    // Audio
    private AudioSource sfxSource;

    // Stage Definitions (12 Stages)
    private List<StageDef> stages = new List<StageDef>();

    // Shape Library Templates
    private List<PolyShape> shapeTemplates = new List<PolyShape>();

    private void Awake()
    {
        InitLocalization();
        InitStages();
        InitShapeTemplates();
        SetupCameraAndLighting();
        CreateMaterials();
        BuildBoardStructure();
        SetupAudio();
        LoadStage(0);
    }

    private void InitLocalization()
    {
        // Detected system language or default KO
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
            title = new LocalizedText("Stage 1: 초심자의 숲", "Stage 1: Beginner's Spark", "Stage 1: 初心者の森", "Etapa 1: Chispa Inicial"),
            briefing = new LocalizedText("8x8 네온 보드에 블록을 배치하고 가로/세로 라인을 완성하세요!", "Place blocks on the 8x8 neon grid and clear lines!", "8x8のネオングリッドにブロックを配置してラインを消去しましょう！", "¡Coloca bloques en la cuadrícula 8x8 y completa líneas!"),
            targetScore = 500,
            targetGems = 0,
            targetCombos = 0,
            targetMultiClears = 0,
            bombCountdown = 0,
            bossHp = 0,
            hasIce = false,
            hasRocks = false,
            hasBorderBlock = false
        });

        // Stage 2
        stages.Add(new StageDef
        {
            stageNum = 2,
            title = new LocalizedText("Stage 2: 더블 라인 폭파", "Stage 2: Double Trouble", "Stage 2: ダブルブラスト", "Etapa 2: Doble Explosión"),
            briefing = new LocalizedText("2줄 이상을 동시에 폭파하여 1,000점을 달성하세요!", "Clear 2 or more lines simultaneously and reach 1,000 pts!", "2ライン以上を同時に消去して1,000点を達成しましょう！", "¡Despeja 2 o más líneas a la vez y alcanza 1,000 pts!"),
            targetScore = 1000,
            targetGems = 0,
            targetCombos = 0,
            targetMultiClears = 1,
            bombCountdown = 0,
            bossHp = 0,
            hasIce = false,
            hasRocks = false,
            hasBorderBlock = false
        });

        // Stage 3
        stages.Add(new StageDef
        {
            stageNum = 3,
            title = new LocalizedText("Stage 3: 얼어붙은 수정", "Stage 3: Glacial Frost", "Stage 3: 凍結クリスタル", "Etapa 3: Cristal Helado"),
            briefing = new LocalizedText("얼어붙은 빙결 블록 라인을 완성해 해동하고 1,500점을 얻으세요!", "Melt frozen ice blocks by clearing lines to reach 1,500 pts!", "凍った氷ブロックのラインを揃えて解凍し、1,500点を獲得しましょう！", "¡Derrite los bloques de hielo congelados y llega a 1,500 pts!"),
            targetScore = 1500,
            targetGems = 0,
            targetCombos = 0,
            targetMultiClears = 0,
            bombCountdown = 0,
            bossHp = 0,
            hasIce = true,
            hasRocks = false,
            hasBorderBlock = false
        });

        // Stage 4
        stages.Add(new StageDef
        {
            stageNum = 4,
            title = new LocalizedText("Stage 4: 3단 콤보 연쇄", "Stage 4: Triple Combo Chain", "Stage 4: 3連続コンボ", "Etapa 4: Cadena de Combo x3"),
            briefing = new LocalizedText("블록을 연속으로 놓으며 3연속 콤보를 달성하세요!", "Maintain consecutive line clears to reach a 3-Combo!", "連続でラインを消去して3コンボを達成しましょう！", "¡Encadena despejes consecutivos para lograr un Combo x3!"),
            targetScore = 2000,
            targetGems = 0,
            targetCombos = 3,
            targetMultiClears = 0,
            bombCountdown = 0,
            bossHp = 0,
            hasIce = false,
            hasRocks = false,
            hasBorderBlock = false
        });

        // Stage 5
        stages.Add(new StageDef
        {
            stageNum = 5,
            title = new LocalizedText("Stage 5: 바위 협곡 [중간보스]", "Stage 5: Granite Gorge [Mid-Boss]", "Stage 5: 岩石峡谷 [中ボス]", "Etapa 5: Cañón Rocoso [Jefe Medio]"),
            briefing = new LocalizedText("파괴할 수 없는 단단한 바위들을 우회하여 2,500점을 획득하세요!", "Navigate around indestructible rocks and reach 2,500 pts!", "破壊できない頑丈な岩を回避して2,500点を獲得しましょう！", "¡Esquiva las rocas indestructibles y alcanza 2,500 pts!"),
            targetScore = 2500,
            targetGems = 0,
            targetCombos = 0,
            targetMultiClears = 0,
            bombCountdown = 0,
            bossHp = 0,
            hasIce = false,
            hasRocks = true,
            hasBorderBlock = false
        });

        // Stage 6
        stages.Add(new StageDef
        {
            stageNum = 6,
            title = new LocalizedText("Stage 6: 황금 보석 채굴", "Stage 6: Golden Geode Mine", "Stage 6: 黄金の宝石採掘", "Etapa 6: Mina de Gemas Doradas"),
            briefing = new LocalizedText("빛나는 황금 보석 블록 6개를 수집하고 3,000점을 달성하세요!", "Harvest 6 glowing golden gems and score 3,000 pts!", "輝く黄金の宝石ブロックを6個集めて3,000点を達成しましょう！", "¡Recolecta 6 gemas doradas brillantes y anota 3,000 pts!"),
            targetScore = 3000,
            targetGems = 6,
            targetCombos = 0,
            targetMultiClears = 0,
            bombCountdown = 0,
            bossHp = 0,
            hasIce = false,
            hasRocks = false,
            hasBorderBlock = false
        });

        // Stage 7
        stages.Add(new StageDef
        {
            stageNum = 7,
            title = new LocalizedText("Stage 7: 좁아진 공간 (6x6)", "Stage 7: Constricted Grid (6x6)", "Stage 7: 狭まる領域 (6x6)", "Etapa 7: Cuadrícula Estrecha (6x6)"),
            briefing = new LocalizedText("외곽 벽으로 둘러싸인 6x6 좁은 보드에서 3,500점을 돌파하세요!", "Overcome the blocked border and score 3,500 pts in 6x6 space!", "外枠が封鎖された6x6の狭いボードで3,500点を突破しましょう！", "¡Supera el borde bloqueado y supera 3,500 pts en 6x6!"),
            targetScore = 3500,
            targetGems = 0,
            targetCombos = 0,
            targetMultiClears = 0,
            bombCountdown = 0,
            bossHp = 0,
            hasIce = false,
            hasRocks = false,
            hasBorderBlock = true
        });

        // Stage 8
        stages.Add(new StageDef
        {
            stageNum = 8,
            title = new LocalizedText("Stage 8: 시한폭탄 해체", "Stage 8: Time Bomb Defusal", "Stage 8: 時限爆弾解除", "Etapa 8: Desactivación de Bomba"),
            briefing = new LocalizedText("15턴 카운트다운 폭탄이 터지기 전에 라인을 완성해 해체하세요!", "Clear lines containing countdown bombs before the timer hits 0!", "15ターンの時限爆弾が爆発する前にラインを消去して解除しましょう！", "¡Desactiva las bombas con cuenta atrás antes de que lleguen a 0!"),
            targetScore = 4000,
            targetGems = 0,
            targetCombos = 0,
            targetMultiClears = 0,
            bombCountdown = 15,
            bossHp = 0,
            hasIce = false,
            hasRocks = false,
            hasBorderBlock = false
        });

        // Stage 9
        stages.Add(new StageDef
        {
            stageNum = 9,
            title = new LocalizedText("Stage 9: 5단 콤보 마스터", "Stage 9: 5-Combo Mastery", "Stage 9: 5連続コンボマスター", "Etapa 9: Maestría de Combo x5"),
            briefing = new LocalizedText("환상적인 퍼즐 빌드업으로 5연속 콤보를 완성하세요!", "Chain 5 consecutive line clears to unleash a 5-Combo!", "素晴らしいパズルの組み立てで5連続コンボを達成しましょう！", "¡Encadena 5 despejes seguidos para lograr un Combo x5!"),
            targetScore = 4500,
            targetGems = 0,
            targetCombos = 5,
            targetMultiClears = 0,
            bombCountdown = 0,
            bossHp = 0,
            hasIce = false,
            hasRocks = false,
            hasBorderBlock = false
        });

        // Stage 10
        stages.Add(new StageDef
        {
            stageNum = 10,
            title = new LocalizedText("Stage 10: 크리스탈 골렘 제단 [최종보스]", "Stage 10: Crystal Golem's Altar [Boss]", "Stage 10: クリスタルゴーレムの祭壇 [最終ボス]", "Etapa 10: Altar del Gólem de Cristal [Jefe Final]"),
            briefing = new LocalizedText("중앙 2x2 골렘 핵(HP 6) 주변 라인을 터뜨려 골렘을 파괴하세요!", "Damage the central 2x2 Golem Core (HP 6) by clearing lines!", "中央の2x2ゴーレムコア(HP 6)の周囲を消去して破壊しましょう！", "¡Daña el Núcleo de Gólem central (HP 6) despejando líneas!"),
            targetScore = 5500,
            targetGems = 0,
            targetCombos = 0,
            targetMultiClears = 0,
            bombCountdown = 0,
            bossHp = 6,
            hasIce = false,
            hasRocks = false,
            hasBorderBlock = false
        });

        // Stage 11
        stages.Add(new StageDef
        {
            stageNum = 11,
            title = new LocalizedText("Stage 11: 초신성 트리플 폭발", "Stage 11: Supernova Triple", "Stage 11: 超新星トリプルブラスト", "Etapa 11: Supernova Triple"),
            briefing = new LocalizedText("3줄 동시 폭파를 2회 성공시키고 6,500점을 달성하세요!", "Achieve a 3-line simultaneous clear twice and score 6,500 pts!", "3ライン同時消去を2回成功させ、6,500点を達成しましょう！", "¡Logra un despeje triple de 3 líneas dos veces y suma 6,500 pts!"),
            targetScore = 6500,
            targetGems = 0,
            targetCombos = 0,
            targetMultiClears = 2,
            bombCountdown = 0,
            bossHp = 0,
            hasIce = true,
            hasRocks = true,
            hasBorderBlock = false
        });

        // Stage 12
        stages.Add(new StageDef
        {
            stageNum = 12,
            title = new LocalizedText("Stage 12: 궁극의 블록 마스터 [피날레]", "Stage 12: Ultimate Block Master [Finale]", "Stage 12: 究極のブロックマスター [フィナーレ]", "Etapa 12: Maestro Supremo de Bloques [Final]"),
            briefing = new LocalizedText("모든 장애물을 뚫고 8,000점을 달성하여 전설의 마스터가 되세요!", "Overcome all obstacles and achieve 8,000 points to become a legend!", "全ての障害を乗り越えて8,000点を達成し、伝説のマスターになりましょう！", "¡Supera todos los obstáculos y logra 8,000 puntos para ser leyenda!"),
            targetScore = 8000,
            targetGems = 8,
            targetCombos = 4,
            targetMultiClears = 1,
            bombCountdown = 20,
            bossHp = 0,
            hasIce = true,
            hasRocks = false,
            hasBorderBlock = false
        });
    }

    private void InitShapeTemplates()
    {
        shapeTemplates.Clear();

        // 1x1 Yellow
        shapeTemplates.Add(new PolyShape(1, new int[,] { { 1 } }, CellType.Yellow));

        // 1x2, 2x1 Cyan
        shapeTemplates.Add(new PolyShape(2, new int[,] { { 1, 1 } }, CellType.Cyan));
        shapeTemplates.Add(new PolyShape(3, new int[,] { { 1 }, { 1 } }, CellType.Cyan));

        // 1x3, 3x1 Blue
        shapeTemplates.Add(new PolyShape(4, new int[,] { { 1, 1, 1 } }, CellType.Blue));
        shapeTemplates.Add(new PolyShape(5, new int[,] { { 1 }, { 1 }, { 1 } }, CellType.Blue));

        // 1x4, 4x1 Purple
        shapeTemplates.Add(new PolyShape(6, new int[,] { { 1, 1, 1, 1 } }, CellType.Purple));
        shapeTemplates.Add(new PolyShape(7, new int[,] { { 1 }, { 1 }, { 1 }, { 1 } }, CellType.Purple));

        // 2x2 Orange
        shapeTemplates.Add(new PolyShape(8, new int[,] { { 1, 1 }, { 1, 1 } }, CellType.Orange));

        // 3x3 Red
        shapeTemplates.Add(new PolyShape(9, new int[,] { { 1, 1, 1 }, { 1, 1, 1 }, { 1, 1, 1 } }, CellType.Red));

        // L-Shapes Green
        shapeTemplates.Add(new PolyShape(10, new int[,] { { 1, 0 }, { 1, 0 }, { 1, 1 } }, CellType.Green));
        shapeTemplates.Add(new PolyShape(11, new int[,] { { 0, 1 }, { 0, 1 }, { 1, 1 } }, CellType.Green));
        shapeTemplates.Add(new PolyShape(12, new int[,] { { 1, 1, 1 }, { 1, 0, 0 } }, CellType.Green));
        shapeTemplates.Add(new PolyShape(13, new int[,] { { 1, 1, 1 }, { 0, 0, 1 } }, CellType.Green));

        // T-Shapes Purple
        shapeTemplates.Add(new PolyShape(14, new int[,] { { 1, 1, 1 }, { 0, 1, 0 } }, CellType.Purple));
        shapeTemplates.Add(new PolyShape(15, new int[,] { { 0, 1, 0 }, { 1, 1, 1 } }, CellType.Purple));

        // Corner 2x2 Yellow
        shapeTemplates.Add(new PolyShape(16, new int[,] { { 1, 1 }, { 1, 0 } }, CellType.Yellow));
        shapeTemplates.Add(new PolyShape(17, new int[,] { { 1, 1 }, { 0, 1 } }, CellType.Yellow));
        shapeTemplates.Add(new PolyShape(18, new int[,] { { 1, 0 }, { 1, 1 } }, CellType.Yellow));
        shapeTemplates.Add(new PolyShape(19, new int[,] { { 0, 1 }, { 1, 1 } }, CellType.Yellow));
    }

    private void SetupCameraAndLighting()
    {
        var camGo = new GameObject("Main Camera");
        mainCam = camGo.AddComponent<Camera>();
        mainCam.transform.position = new Vector3(0f, 0.9f, -12.5f);
        mainCam.transform.rotation = Quaternion.Euler(0f, 0f, 0f);
        mainCam.clearFlags = CameraClearFlags.SolidColor;
        mainCam.backgroundColor = new Color(0.02f, 0.04f, 0.08f, 1f); // Deep Cosmic Slate
        mainCam.orthographic = true;
        mainCam.orthographicSize = 7.6f;

        var lightGo = new GameObject("DirLight");
        dirLight = lightGo.AddComponent<Light>();
        dirLight.type = LightType.Directional;
        dirLight.color = new Color(1f, 0.98f, 0.94f);
        dirLight.intensity = 1.15f;
        lightGo.transform.rotation = Quaternion.Euler(45f, -30f, 0f);
    }

    private void CreateMaterials()
    {
        Shader litShader = Shader.Find("Universal Render Pipeline/Lit");
        if (litShader == null) litShader = Shader.Find("Standard");

        baseBlockMat = new Material(litShader);
        baseBlockMat.color = Color.white;

        boardSlotMat = new Material(litShader);
        boardSlotMat.color = new Color(0.08f, 0.12f, 0.18f, 0.9f);

        boardBorderMat = new Material(litShader);
        boardBorderMat.color = new Color(0.04f, 0.06f, 0.10f, 1f);

        ghostBlockMat = new Material(litShader);
        ghostBlockMat.color = new Color(0.2f, 1f, 0.8f, 0.45f);

        shardMat = new Material(litShader);
        shardMat.color = Color.white;
    }

    private void BuildBoardStructure()
    {
        boardBottomLeft = boardCenter - new Vector3((GridSize - 1) * CellPitch * 0.5f, (GridSize - 1) * CellPitch * 0.5f, 0f);

        // Frame
        boardFrameGo = GameObject.CreatePrimitive(PrimitiveType.Cube);
        boardFrameGo.name = "BoardFrame";
        boardFrameGo.transform.position = boardCenter + new Vector3(0f, 0f, 0.3f);
        boardFrameGo.transform.localScale = new Vector3(GridSize * CellPitch + 0.6f, GridSize * CellPitch + 0.6f, 0.4f);
        boardFrameGo.GetComponent<Renderer>().material = boardBorderMat;

        // Slots
        for (int r = 0; r < GridSize; r++)
        {
            for (int c = 0; c < GridSize; c++)
            {
                var slotGo = GameObject.CreatePrimitive(PrimitiveType.Cube);
                slotGo.name = string.Format("Slot_{0}_{1}", r, c);
                slotGo.transform.position = GetCellCenter(r, c) + new Vector3(0f, 0f, 0.15f);
                slotGo.transform.localScale = new Vector3(CellBlockSize, CellBlockSize, 0.2f);
                slotGo.GetComponent<Renderer>().material = boardSlotMat;
                backgroundCellGos[r, c] = slotGo;
            }
        }
    }

    private Vector3 GetCellCenter(int r, int c)
    {
        return boardBottomLeft + new Vector3(c * CellPitch, r * CellPitch, 0f);
    }

    private void SetupAudio()
    {
        sfxSource = gameObject.AddComponent<AudioSource>();
        sfxSource.playOnAwake = false;
        sfxSource.volume = 0.85f;
    }

    private void PlayProceduralTone(float baseFreq, float duration, string waveType = "sine", float pitchMod = 1f)
    {
        int sampleRate = 44100;
        int sampleCount = Mathf.CeilToInt(sampleRate * duration);
        float[] samples = new float[sampleCount];
        float freq = baseFreq * pitchMod;

        for (int i = 0; i < sampleCount; i++)
        {
            float t = (float)i / sampleRate;
            float envelope = Mathf.Exp(-t * 6f);
            float angle = 2f * Mathf.PI * freq * t;
            float val = 0f;

            if (waveType == "sine")
            {
                val = Mathf.Sin(angle);
            }
            else if (waveType == "triangle")
            {
                val = Mathf.PingPong(t * freq * 4f, 2f) - 1f;
            }
            else if (waveType == "square")
            {
                val = Mathf.Sin(angle) > 0f ? 0.6f : -0.6f;
            }
            else // noise
            {
                val = (UnityEngine.Random.value * 2f - 1f);
            }

            samples[i] = val * envelope * 0.45f;
        }

        AudioClip clip = AudioClip.Create("Chime", sampleCount, 1, sampleRate, false);
        clip.SetData(samples, 0);
        sfxSource.PlayOneShot(clip);
    }

    private void PlaySnapSound()
    {
        PlayProceduralTone(340f, 0.12f, "sine");
    }

    private void PlayLineClearSound(int combo, int lineCount)
    {
        float[] pentatonic = { 261.63f, 293.66f, 329.63f, 392.00f, 440.00f, 523.25f, 587.33f, 659.25f };
        int noteIdx = Mathf.Clamp(combo, 0, pentatonic.Length - 1);
        float freq = pentatonic[noteIdx];

        PlayProceduralTone(freq, 0.35f, "triangle");
        if (lineCount >= 2)
        {
            PlayProceduralTone(freq * 1.5f, 0.45f, "sine");
        }
    }

    private void PlayBombSound()
    {
        PlayProceduralTone(120f, 0.6f, "noise");
    }

    private void PlayFanfare()
    {
        StartCoroutine(FanfareRoutine());
    }

    private IEnumerator FanfareRoutine()
    {
        float[] notes = { 392.00f, 523.25f, 659.25f, 783.99f };
        foreach (var n in notes)
        {
            PlayProceduralTone(n, 0.28f, "triangle");
            yield return new WaitForSeconds(0.12f);
        }
    }

    public void LoadStage(int stageIdx)
    {
        currentStageIdx = Mathf.Clamp(stageIdx, 0, stages.Count - 1);
        StageDef stage = stages[currentStageIdx];

        state = GameState.Playing;
        currentScore = 0;
        currentCombo = 0;
        totalLinesCleared = 0;
        gemsCollected = 0;
        maxComboAchieved = 0;
        multiClearsCount = 0;
        showStageSelect = false;

        // Clear Grid
        for (int r = 0; r < GridSize; r++)
        {
            for (int c = 0; c < GridSize; c++)
            {
                grid[r, c] = CellType.Empty;
                bombCounters[r, c] = 0;
                if (gridGos[r, c] != null)
                {
                    Destroy(gridGos[r, c]);
                    gridGos[r, c] = null;
                }
            }
        }

        // Apply Stage Features
        if (stage.hasBorderBlock)
        {
            for (int i = 0; i < GridSize; i++)
            {
                SetCellBlock(0, i, CellType.Rock);
                SetCellBlock(GridSize - 1, i, CellType.Rock);
                SetCellBlock(i, 0, CellType.Rock);
                SetCellBlock(i, GridSize - 1, CellType.Rock);
            }
        }

        if (stage.hasRocks)
        {
            SetCellBlock(2, 2, CellType.Rock);
            SetCellBlock(2, 5, CellType.Rock);
            SetCellBlock(5, 2, CellType.Rock);
            SetCellBlock(5, 5, CellType.Rock);
        }

        if (stage.hasIce)
        {
            SetCellBlock(3, 3, CellType.Ice);
            SetCellBlock(3, 4, CellType.Ice);
            SetCellBlock(4, 3, CellType.Ice);
            SetCellBlock(4, 4, CellType.Ice);
        }

        if (stage.targetGems > 0)
        {
            SetCellBlock(1, 3, CellType.Gem);
            SetCellBlock(1, 4, CellType.Gem);
            SetCellBlock(6, 3, CellType.Gem);
            SetCellBlock(6, 4, CellType.Gem);
        }

        if (stage.bombCountdown > 0)
        {
            SetCellBlock(2, 3, CellType.Bomb);
            bombCounters[2, 3] = stage.bombCountdown;
            SetCellBlock(5, 4, CellType.Bomb);
            bombCounters[5, 4] = stage.bombCountdown;
        }

        if (stage.bossHp > 0)
        {
            bossCurrentHp = stage.bossHp;
            SetCellBlock(3, 3, CellType.Boss);
            SetCellBlock(3, 4, CellType.Boss);
            SetCellBlock(4, 3, CellType.Boss);
            SetCellBlock(4, 4, CellType.Boss);
        }

        SpawnHandPieces();
    }

    private void SetCellBlock(int r, int c, CellType type)
    {
        grid[r, c] = type;
        if (gridGos[r, c] != null) Destroy(gridGos[r, c]);

        if (type != CellType.Empty)
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
            go.name = string.Format("Block_{0}_{1}_{2}", r, c, type);
            go.transform.position = GetCellCenter(r, c);
            go.transform.localScale = new Vector3(CellBlockSize, CellBlockSize, 0.65f);
            go.GetComponent<Renderer>().material = CreateMaterialForType(type);
            gridGos[r, c] = go;
        }
    }

    private Material CreateMaterialForType(CellType type)
    {
        Shader litShader = Shader.Find("Universal Render Pipeline/Lit");
        if (litShader == null) litShader = Shader.Find("Standard");

        var mat = new Material(litShader);
        mat.color = GetColorForCellType(type);
        return mat;
    }

    private Color GetColorForCellType(CellType type)
    {
        switch (type)
        {
            case CellType.Cyan: return new Color(0.06f, 0.85f, 0.95f);
            case CellType.Orange: return new Color(1.0f, 0.52f, 0.12f);
            case CellType.Purple: return new Color(0.68f, 0.32f, 0.98f);
            case CellType.Yellow: return new Color(0.98f, 0.85f, 0.12f);
            case CellType.Green: return new Color(0.18f, 0.88f, 0.42f);
            case CellType.Red: return new Color(0.98f, 0.28f, 0.32f);
            case CellType.Blue: return new Color(0.22f, 0.52f, 0.98f);
            case CellType.Ice: return new Color(0.65f, 0.92f, 1.0f, 0.85f);
            case CellType.Gem: return new Color(1.0f, 0.84f, 0.0f);
            case CellType.Rock: return new Color(0.42f, 0.44f, 0.48f);
            case CellType.Bomb: return new Color(0.95f, 0.15f, 0.15f);
            case CellType.Boss: return new Color(0.85f, 0.10f, 0.75f);
            default: return Color.white;
        }
    }

    private void SpawnHandPieces()
    {
        ClearHandPieces();

        Vector3 trayCenter = new Vector3(0f, -3.9f, 0f);
        float[] xOffsets = { -3.2f, 0f, 3.2f };

        for (int i = 0; i < 3; i++)
        {
            PolyShape template = shapeTemplates[UnityEngine.Random.Range(0, shapeTemplates.Count)];
            Vector3 slotPos = trayCenter + new Vector3(xOffsets[i], 0f, 0f);

            var hp = new HandPiece();
            hp.shape = template;
            hp.baseSlotPos = slotPos;
            hp.rootGo = new GameObject("HandSlot_" + i);
            hp.rootGo.transform.position = slotPos;
            hp.isUsed = false;

            // Build miniature shape in hand
            float pieceScale = 0.58f;
            float rOffset = (template.rows - 1) * 0.5f;
            float cOffset = (template.cols - 1) * 0.5f;

            for (int r = 0; r < template.rows; r++)
            {
                for (int c = 0; c < template.cols; c++)
                {
                    if (template.matrix[r, c] == 1)
                    {
                        var blockGo = GameObject.CreatePrimitive(PrimitiveType.Cube);
                        blockGo.name = string.Format("Piece_{0}_{1}", r, c);
                        blockGo.transform.SetParent(hp.rootGo.transform);
                        blockGo.transform.localPosition = new Vector3((c - cOffset) * CellPitch * pieceScale, (r - rOffset) * CellPitch * pieceScale, 0f);
                        blockGo.transform.localScale = new Vector3(CellBlockSize * pieceScale, CellBlockSize * pieceScale, 0.5f * pieceScale);
                        blockGo.GetComponent<Renderer>().material = CreateMaterialForType(template.type);
                        hp.blockGos.Add(blockGo);
                    }
                }
            }

            handPieces[i] = hp;
        }

        CheckGameOverConditions();
    }

    private void ClearHandPieces()
    {
        for (int i = 0; i < 3; i++)
        {
            if (handPieces[i] != null && handPieces[i].rootGo != null)
            {
                Destroy(handPieces[i].rootGo);
                handPieces[i] = null;
            }
        }
    }

    private void Update()
    {
        HandleInput();
        UpdateShards();
        UpdateFloatingTexts();
        UpdateCameraShake();
    }

    private void HandleInput()
    {
        if (state != GameState.Playing) return;

        Vector3 mouseScreen = Input.mousePosition;
        Plane boardPlane = new Plane(Vector3.forward, Vector3.zero);
        Ray ray = mainCam.ScreenPointToRay(mouseScreen);
        float enter;
        Vector3 worldPoint = Vector3.zero;

        if (boardPlane.Raycast(ray, out enter))
        {
            worldPoint = ray.GetPoint(enter);
        }

        // Pointer Down
        if (Input.GetMouseButtonDown(0))
        {
            draggingSlot = -1;
            for (int i = 0; i < 3; i++)
            {
                if (handPieces[i] != null && !handPieces[i].isUsed)
                {
                    float dist = Vector2.Distance(new Vector2(worldPoint.x, worldPoint.y), new Vector2(handPieces[i].baseSlotPos.x, handPieces[i].baseSlotPos.y));
                    if (dist < 1.4f)
                    {
                        draggingSlot = i;
                        dragOffset = handPieces[i].rootGo.transform.position - worldPoint;
                        PlayProceduralTone(440f, 0.08f, "sine");
                        break;
                    }
                }
            }
        }

        // Pointer Drag
        if (Input.GetMouseButton(0) && draggingSlot >= 0)
        {
            HandPiece hp = handPieces[draggingSlot];
            dragCurrentWorldPos = worldPoint + dragOffset + new Vector3(0f, 1.2f, -0.6f); // Lift up for finger visibility
            hp.rootGo.transform.position = dragCurrentWorldPos;

            // Scale to full size during drag
            float dragScale = 1.0f;
            PolyShape shape = hp.shape;
            float rOffset = (shape.rows - 1) * 0.5f;
            float cOffset = (shape.cols - 1) * 0.5f;
            int idx = 0;

            for (int r = 0; r < shape.rows; r++)
            {
                for (int c = 0; c < shape.cols; c++)
                {
                    if (shape.matrix[r, c] == 1 && idx < hp.blockGos.Count)
                    {
                        hp.blockGos[idx].transform.localPosition = new Vector3((c - cOffset) * CellPitch * dragScale, (r - rOffset) * CellPitch * dragScale, -0.2f);
                        hp.blockGos[idx].transform.localScale = new Vector3(CellBlockSize, CellBlockSize, 0.65f);
                        idx++;
                    }
                }
            }

            UpdateGhostPreview(dragCurrentWorldPos, shape);
        }

        // Pointer Up
        if (Input.GetMouseButtonUp(0) && draggingSlot >= 0)
        {
            HandPiece hp = handPieces[draggingSlot];
            PolyShape shape = hp.shape;

            int targetRow, targetCol;
            if (TryGetPlacementCoordinates(dragCurrentWorldPos, shape, out targetRow, out targetCol))
            {
                PlaceShape(shape, targetRow, targetCol);
                hp.isUsed = true;
                Destroy(hp.rootGo);
                handPieces[draggingSlot] = null;
                draggingSlot = -1;
                ClearGhostPreview();

                CheckHandDepleted();
            }
            else
            {
                // Return to tray
                ResetHandPiecePosition(hp);
                draggingSlot = -1;
                ClearGhostPreview();
            }
        }
    }

    private bool TryGetPlacementCoordinates(Vector3 dragPos, PolyShape shape, out int targetRow, out int targetCol)
    {
        targetRow = -1;
        targetCol = -1;

        float cOffset = (shape.cols - 1) * 0.5f;
        float rOffset = (shape.rows - 1) * 0.5f;

        Vector3 shapeOrigin = dragPos - new Vector3(cOffset * CellPitch, rOffset * CellPitch, 0f);

        int col = Mathf.RoundToInt((shapeOrigin.x - boardBottomLeft.x) / CellPitch);
        int row = Mathf.RoundToInt((shapeOrigin.y - boardBottomLeft.y) / CellPitch);

        if (CanPlaceShape(shape, row, col))
        {
            targetRow = row;
            targetCol = col;
            return true;
        }

        return false;
    }

    private bool CanPlaceShape(PolyShape shape, int startRow, int startCol)
    {
        for (int r = 0; r < shape.rows; r++)
        {
            for (int c = 0; c < shape.cols; c++)
            {
                if (shape.matrix[r, c] == 1)
                {
                    int gr = startRow + r;
                    int gc = startCol + c;

                    if (gr < 0 || gr >= GridSize || gc < 0 || gc >= GridSize) return false;
                    if (grid[gr, gc] != CellType.Empty) return false;
                }
            }
        }
        return true;
    }

    private void UpdateGhostPreview(Vector3 dragPos, PolyShape shape)
    {
        ClearGhostPreview();

        int targetRow, targetCol;
        if (TryGetPlacementCoordinates(dragPos, shape, out targetRow, out targetCol))
        {
            for (int r = 0; r < shape.rows; r++)
            {
                for (int c = 0; c < shape.cols; c++)
                {
                    if (shape.matrix[r, c] == 1)
                    {
                        var ghost = GameObject.CreatePrimitive(PrimitiveType.Cube);
                        ghost.name = "GhostBlock";
                        ghost.transform.position = GetCellCenter(targetRow + r, targetCol + c) + new Vector3(0f, 0f, 0.05f);
                        ghost.transform.localScale = new Vector3(CellBlockSize * 0.98f, CellBlockSize * 0.98f, 0.35f);
                        ghost.GetComponent<Renderer>().material = ghostBlockMat;
                        ghostGos.Add(ghost);
                    }
                }
            }
        }
    }

    private void ClearGhostPreview()
    {
        foreach (var g in ghostGos)
        {
            if (g != null) Destroy(g);
        }
        ghostGos.Clear();
    }

    private void ResetHandPiecePosition(HandPiece hp)
    {
        hp.rootGo.transform.position = hp.baseSlotPos;
        float pieceScale = 0.58f;
        float rOffset = (hp.shape.rows - 1) * 0.5f;
        float cOffset = (hp.shape.cols - 1) * 0.5f;
        int idx = 0;

        for (int r = 0; r < hp.shape.rows; r++)
        {
            for (int c = 0; c < hp.shape.cols; c++)
            {
                if (hp.shape.matrix[r, c] == 1 && idx < hp.blockGos.Count)
                {
                    hp.blockGos[idx].transform.localPosition = new Vector3((c - cOffset) * CellPitch * pieceScale, (r - rOffset) * CellPitch * pieceScale, 0f);
                    hp.blockGos[idx].transform.localScale = new Vector3(CellBlockSize * pieceScale, CellBlockSize * pieceScale, 0.5f * pieceScale);
                    idx++;
                }
            }
        }
    }

    private void PlaceShape(PolyShape shape, int startRow, int startCol)
    {
        int placedCount = 0;

        for (int r = 0; r < shape.rows; r++)
        {
            for (int c = 0; c < shape.cols; c++)
            {
                if (shape.matrix[r, c] == 1)
                {
                    SetCellBlock(startRow + r, startCol + c, shape.type);
                    placedCount++;
                }
            }
        }

        currentScore += placedCount * 10;
        PlaySnapSound();

        // Tick Bomb Counters
        TickBombCounters();

        // Check Line Clears
        CheckAndClearLines();
    }

    private void TickBombCounters()
    {
        for (int r = 0; r < GridSize; r++)
        {
            for (int c = 0; c < GridSize; c++)
            {
                if (grid[r, c] == CellType.Bomb && bombCounters[r, c] > 0)
                {
                    bombCounters[r, c]--;
                    if (bombCounters[r, c] <= 0)
                    {
                        // Bomb exploded! Game Over!
                        TriggerGameOver(new LocalizedText("시한폭탄이 폭발했습니다!", "A time bomb detonated!", "時限爆弾が爆発しました！", "¡Una bomba con temporizador detonó!"));
                        return;
                    }
                }
            }
        }
    }

    private void CheckAndClearLines()
    {
        List<int> fullRows = new List<int>();
        List<int> fullCols = new List<int>();

        // Check Rows
        for (int r = 0; r < GridSize; r++)
        {
            bool full = true;
            for (int c = 0; c < GridSize; c++)
            {
                if (grid[r, c] == CellType.Empty || grid[r, c] == CellType.Rock)
                {
                    full = false;
                    break;
                }
            }
            if (full) fullRows.Add(r);
        }

        // Check Cols
        for (int c = 0; c < GridSize; c++)
        {
            bool full = true;
            for (int r = 0; r < GridSize; r++)
            {
                if (grid[r, c] == CellType.Empty || grid[r, c] == CellType.Rock)
                {
                    full = false;
                    break;
                }
            }
            if (full) fullCols.Add(c);
        }

        int totalLines = fullRows.Count + fullCols.Count;

        if (totalLines > 0)
        {
            currentCombo++;
            if (currentCombo > maxComboAchieved) maxComboAchieved = currentCombo;
            if (totalLines >= 2) multiClearsCount++;

            int comboMultiplier = Mathf.Max(1, currentCombo);
            int linePoints = (totalLines * 100) * comboMultiplier;
            currentScore += linePoints;
            totalLinesCleared += totalLines;

            // Clear blocks and spawn shards
            HashSet<Vector2Int> toClear = new HashSet<Vector2Int>();
            foreach (int r in fullRows)
            {
                for (int c = 0; c < GridSize; c++) toClear.Add(new Vector2Int(r, c));
            }
            foreach (int c in fullCols)
            {
                for (int r = 0; r < GridSize; r++) toClear.Add(new Vector2Int(r, c));
            }

            foreach (var cell in toClear)
            {
                CellType ct = grid[cell.x, cell.y];

                if (ct == CellType.Gem)
                {
                    gemsCollected++;
                    currentScore += 150;
                    SpawnFloatingFeedback("+150 GEM!", GetCellCenter(cell.x, cell.y), Color.yellow);
                }
                else if (ct == CellType.Boss)
                {
                    bossCurrentHp = Mathf.Max(0, bossCurrentHp - 1);
                    SpawnFloatingFeedback(string.Format("BOSS HP: {0}", bossCurrentHp), boardCenter + new Vector3(0f, 1.2f, 0f), Color.magenta);
                }

                SpawnCellShards(GetCellCenter(cell.x, cell.y), GetColorForCellType(ct));
                SetCellBlock(cell.x, cell.y, CellType.Empty);
            }

            PlayLineClearSound(currentCombo, totalLines);
            shakeIntensity = 0.25f + totalLines * 0.12f;

            // Feedback Message
            string praise = GetComboPraise(currentCombo);
            SpawnFloatingFeedback(string.Format("+{0} {1}", linePoints, praise), boardCenter, Color.cyan);

            CheckVictoryConditions();
        }
        else
        {
            currentCombo = 0;
        }

        if (currentScore > bestScore) bestScore = currentScore;
    }

    private string GetComboPraise(int combo)
    {
        if (combo <= 1)
        {
            return currentLang == Language.KO ? "좋아요!" : currentLang == Language.JA ? "ナイス!" : currentLang == Language.ES ? "¡BIEN!" : "GOOD!";
        }
        else if (combo == 2)
        {
            return currentLang == Language.KO ? "멋져요!" : currentLang == Language.JA ? "グレート!" : currentLang == Language.ES ? "¡GENIAL!" : "GREAT!";
        }
        else if (combo == 3)
        {
            return currentLang == Language.KO ? "대단해요!" : currentLang == Language.JA ? "すばらしい!" : currentLang == Language.ES ? "¡INCREÍBLE!" : "AMAZING!";
        }
        else if (combo == 4)
        {
            return currentLang == Language.KO ? "믿을 수 없어요!" : currentLang == Language.JA ? "アンビリーバブル!" : currentLang == Language.ES ? "¡EXTRAORDINARIO!" : "UNBELIEVABLE!";
        }
        else
        {
            return currentLang == Language.KO ? "전설의 폭파!" : currentLang == Language.JA ? "伝説的!" : currentLang == Language.ES ? "¡LEGENDARIO!" : "LEGENDARY!";
        }
    }

    private void SpawnCellShards(Vector3 pos, Color color)
    {
        for (int i = 0; i < 4; i++)
        {
            var shard = new ShardParticle();
            shard.pos = pos;
            shard.vel = new Vector3(UnityEngine.Random.Range(-3.5f, 3.5f), UnityEngine.Random.Range(-3.5f, 3.5f), UnityEngine.Random.Range(-1.5f, 1.5f));
            shard.color = color;
            shard.scale = UnityEngine.Random.Range(0.2f, 0.35f);

            var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
            go.transform.position = pos;
            go.transform.localScale = Vector3.one * shard.scale;
            go.GetComponent<Renderer>().material = CreateMaterialForType(CellType.Cyan);
            go.GetComponent<Renderer>().material.color = color;
            shard.go = go;

            activeShards.Add(shard);
        }
    }

    private void UpdateShards()
    {
        for (int i = activeShards.Count - 1; i >= 0; i--)
        {
            ShardParticle p = activeShards[i];
            p.life += Time.deltaTime;
            p.pos += p.vel * Time.deltaTime;
            p.vel *= 0.94f;

            if (p.go != null)
            {
                p.go.transform.position = p.pos;
                float progress = p.life / p.maxLife;
                p.go.transform.localScale = Vector3.one * (p.scale * (1f - progress));
            }

            if (p.life >= p.maxLife)
            {
                if (p.go != null) Destroy(p.go);
                activeShards.RemoveAt(i);
            }
        }
    }

    private void SpawnFloatingFeedback(string text, Vector3 pos, Color color)
    {
        var fb = new FloatingFeedback();
        fb.text = text;
        fb.pos = pos;
        fb.color = color;
        floatingTexts.Add(fb);
    }

    private void UpdateFloatingTexts()
    {
        for (int i = floatingTexts.Count - 1; i >= 0; i--)
        {
            FloatingFeedback fb = floatingTexts[i];
            fb.timer += Time.deltaTime;
            fb.pos += Vector3.up * 1.5f * Time.deltaTime;

            if (fb.timer >= fb.duration)
            {
                floatingTexts.RemoveAt(i);
            }
        }
    }

    private void UpdateCameraShake()
    {
        if (shakeIntensity > 0f)
        {
            mainCam.transform.position = new Vector3(UnityEngine.Random.Range(-shakeIntensity, shakeIntensity), 0.9f + UnityEngine.Random.Range(-shakeIntensity, shakeIntensity), -12.5f);
            shakeIntensity = Mathf.Max(0f, shakeIntensity - Time.deltaTime * 1.5f);
        }
        else
        {
            mainCam.transform.position = new Vector3(0f, 0.9f, -12.5f);
        }
    }

    private void CheckHandDepleted()
    {
        bool allUsed = true;
        for (int i = 0; i < 3; i++)
        {
            if (handPieces[i] != null && !handPieces[i].isUsed)
            {
                allUsed = false;
                break;
            }
        }

        if (allUsed)
        {
            SpawnHandPieces();
        }
        else
        {
            CheckGameOverConditions();
        }
    }

    private void CheckGameOverConditions()
    {
        if (state != GameState.Playing) return;

        bool anyCanPlace = false;
        for (int i = 0; i < 3; i++)
        {
            if (handPieces[i] != null && !handPieces[i].isUsed)
            {
                PolyShape shape = handPieces[i].shape;
                for (int r = 0; r < GridSize; r++)
                {
                    for (int c = 0; c < GridSize; c++)
                    {
                        if (CanPlaceShape(shape, r, c))
                        {
                            anyCanPlace = true;
                            break;
                        }
                    }
                    if (anyCanPlace) break;
                }
            }
            if (anyCanPlace) break;
        }

        if (!anyCanPlace)
        {
            if (bombPowerups > 0)
            {
                // Can revive using bomb!
                SpawnFloatingFeedback(currentLang == Language.KO ? "배치 불가! 폭탄을 사용하세요!" : "No moves! Use Emergency Bomb!", boardCenter, Color.red);
            }
            else
            {
                TriggerGameOver(new LocalizedText("더 이상 블록을 배치할 수 없습니다!", "No more valid moves!", "これ以上ブロックを配置できません！", "¡No hay más movimientos válidos!"));
            }
        }
    }

    private void CheckVictoryConditions()
    {
        if (isEndlessMode) return;

        StageDef stage = stages[currentStageIdx];
        bool victory = false;

        if (stage.bossHp > 0 && bossCurrentHp <= 0) victory = true;
        else if (stage.targetGems > 0 && gemsCollected >= stage.targetGems) victory = true;
        else if (stage.targetCombos > 0 && maxComboAchieved >= stage.targetCombos) victory = true;
        else if (stage.targetMultiClears > 0 && multiClearsCount >= stage.targetMultiClears) victory = true;
        else if (stage.targetScore > 0 && currentScore >= stage.targetScore) victory = true;

        if (victory)
        {
            state = GameState.Victory;
            PlayFanfare();
        }
    }

    private void TriggerGameOver(LocalizedText reason)
    {
        state = GameState.GameOver;
        PlayProceduralTone(140f, 0.65f, "square");
    }

    // Powerup Actions
    public void UseEmergencyBomb()
    {
        if (bombPowerups <= 0) return;
        bombPowerups--;
        PlayBombSound();
        shakeIntensity = 0.5f;

        // Clear middle 4x4
        for (int r = 2; r <= 5; r++)
        {
            for (int c = 2; c <= 5; c++)
            {
                if (grid[r, c] != CellType.Empty && grid[r, c] != CellType.Rock)
                {
                    SpawnCellShards(GetCellCenter(r, c), GetColorForCellType(grid[r, c]));
                    SetCellBlock(r, c, CellType.Empty);
                }
            }
        }

        SpawnFloatingFeedback(currentLang == Language.KO ? "긴급 폭탄 발동!" : "EMERGENCY BOMB!", boardCenter, Color.yellow);
        CheckGameOverConditions();
    }

    public void UseShuffleHand()
    {
        if (shufflePowerups <= 0) return;
        shufflePowerups--;
        PlayProceduralTone(520f, 0.2f, "triangle");
        SpawnHandPieces();
        SpawnFloatingFeedback(currentLang == Language.KO ? "블록 셔플 완료!" : "PIECES SHUFFLED!", boardCenter, Color.green);
    }

    // GUI HUD & Modals
    private void OnGUI()
    {
        GUI.skin.label.fontSize = 15;
        GUI.skin.button.fontSize = 14;

        // Header Top Bar
        GUILayout.BeginArea(new Rect(16, 14, Screen.width - 32, 60));
        GUILayout.BeginHorizontal();

        // Title & Mode
        StageDef currentDef = stages[currentStageIdx];
        string titleText = isEndlessMode ? (currentLang == Language.KO ? "무한 자유 모드" : "Endless Mode") : currentDef.title.Get(currentLang);
        GUILayout.Label(string.Format("<b><color=#00f0ff>{0}</color></b>", titleText), GUILayout.Width(280));

        // Score
        string scoreLabel = currentLang == Language.KO ? "점수" : currentLang == Language.JA ? "スコア" : currentLang == Language.ES ? "Puntos" : "Score";
        GUILayout.Label(string.Format("💎 {0}: <color=#ffd700><b>{1}</b></color> (최고: {2})", scoreLabel, currentScore, bestScore), GUILayout.Width(220));

        GUILayout.FlexibleSpace();

        // Stage Select Button
        string stageBtn = currentLang == Language.KO ? "📑 스테이지" : currentLang == Language.JA ? "📑 ステージ" : currentLang == Language.ES ? "📑 Etapas" : "📑 Stages";
        if (GUILayout.Button(stageBtn, GUILayout.Width(110), GUILayout.Height(34)))
        {
            showStageSelect = !showStageSelect;
        }

        // Language Switcher
        string langBtnText = string.Format("🌐 {0}", currentLang);
        if (GUILayout.Button(langBtnText, GUILayout.Width(90), GUILayout.Height(34)))
        {
            currentLang = (Language)(((int)currentLang + 1) % 4);
        }

        GUILayout.EndHorizontal();
        GUILayout.EndArea();

        // Bottom Tray Powerup Controls
        GUILayout.BeginArea(new Rect(16, Screen.height - 65, Screen.width - 32, 55));
        GUILayout.BeginHorizontal();

        // Bomb Button
        GUI.enabled = bombPowerups > 0 && state == GameState.Playing;
        string bombText = string.Format("💣 BOMB ({0})", bombPowerups);
        if (GUILayout.Button(bombText, GUILayout.Width(140), GUILayout.Height(44)))
        {
            UseEmergencyBomb();
        }

        // Shuffle Button
        GUI.enabled = shufflePowerups > 0 && state == GameState.Playing;
        string shuffleText = string.Format("🔄 SHUFFLE ({0})", shufflePowerups);
        if (GUILayout.Button(shuffleText, GUILayout.Width(140), GUILayout.Height(44)))
        {
            UseShuffleHand();
        }
        GUI.enabled = true;

        GUILayout.FlexibleSpace();

        // Retry Button
        string retryText = currentLang == Language.KO ? "다시하기" : currentLang == Language.JA ? "リトライ" : currentLang == Language.ES ? "Reintentar" : "Retry";
        if (GUILayout.Button(retryText, GUILayout.Width(100), GUILayout.Height(44)))
        {
            LoadStage(currentStageIdx);
        }

        GUILayout.EndHorizontal();
        GUILayout.EndArea();

        // Floating Screen Feedback Texts
        foreach (var fb in floatingTexts)
        {
            Vector3 screenPos = mainCam.WorldToScreenPoint(fb.pos);
            if (screenPos.z > 0f)
            {
                Rect r = new Rect(screenPos.x - 140, Screen.height - screenPos.y - 30, 280, 50);
                GUI.color = fb.color;
                GUI.skin.label.alignment = TextAnchor.MiddleCenter;
                GUI.skin.label.fontSize = 20;
                GUI.Label(r, string.Format("<b>{0}</b>", fb.text));
                GUI.skin.label.alignment = TextAnchor.UpperLeft;
                GUI.color = Color.white;
            }
        }

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

    private void RenderStageSelectModal()
    {
        GUI.Box(new Rect(Screen.width * 0.5f - 240, Screen.height * 0.5f - 230, 480, 460), "");
        GUILayout.BeginArea(new Rect(Screen.width * 0.5f - 220, Screen.height * 0.5f - 210, 440, 420));

        string selectHeader = currentLang == Language.KO ? "<b><color=#00f0ff>스테이지 선택 (12 Stages)</color></b>" : "<b><color=#00f0ff>Select Stage (12 Stages)</color></b>";
        GUILayout.Label(selectHeader, GUILayout.Height(30));

        for (int i = 0; i < stages.Count; i++)
        {
            if (i % 2 == 0) GUILayout.BeginHorizontal();

            StageDef s = stages[i];
            string btnLabel = string.Format("#{0} {1}", s.stageNum, s.title.Get(currentLang).Split(':')[1].Trim());
            if (GUILayout.Button(btnLabel, GUILayout.Height(42)))
            {
                isEndlessMode = false;
                LoadStage(i);
            }

            if (i % 2 == 1 || i == stages.Count - 1) GUILayout.EndHorizontal();
        }

        GUILayout.Space(8);

        // Endless Mode Toggle Button
        string endlessText = isEndlessMode ? (currentLang == Language.KO ? "★ 무한 모드 플레이 중 ★" : "★ Playing Endless Mode ★") : (currentLang == Language.KO ? "무한 자유 모드 전환" : "Switch to Endless Mode");
        if (GUILayout.Button(endlessText, GUILayout.Height(38)))
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
        GUI.Box(new Rect(Screen.width * 0.5f - 180, Screen.height * 0.5f - 130, 360, 260), "");
        GUILayout.BeginArea(new Rect(Screen.width * 0.5f - 160, Screen.height * 0.5f - 110, 320, 220));

        GUILayout.Label("<b><color=#ef4444>GAME OVER</color></b>", GUILayout.Height(32));
        GUILayout.Label(string.Format("Score: <b><color=#ffd700>{0}</color></b>", currentScore));
        GUILayout.Label(string.Format("Max Combo: <b><color=#06b6d4>{0}</color></b>", maxComboAchieved));

        GUILayout.Space(12);

        string retryText = currentLang == Language.KO ? "다시 도전" : "Retry";
        if (GUILayout.Button(retryText, GUILayout.Height(40)))
        {
            LoadStage(currentStageIdx);
        }

        string stagesText = currentLang == Language.KO ? "스테이지 목록" : "Stage Select";
        if (GUILayout.Button(stagesText, GUILayout.Height(36)))
        {
            showStageSelect = true;
        }

        GUILayout.EndArea();
    }

    private void RenderVictoryModal()
    {
        GUI.Box(new Rect(Screen.width * 0.5f - 190, Screen.height * 0.5f - 140, 380, 280), "");
        GUILayout.BeginArea(new Rect(Screen.width * 0.5f - 170, Screen.height * 0.5f - 120, 340, 240));

        GUILayout.Label("<b><color=#22c55e>★ STAGE CLEAR! ★</color></b>", GUILayout.Height(32));
        GUILayout.Label(string.Format("Score: <b><color=#ffd700>{0}</color></b>", currentScore));
        GUILayout.Label(string.Format("Max Combo: <b><color=#06b6d4>{0}</color></b>", maxComboAchieved));
        GUILayout.Label(string.Format("Lines Cleared: <b><color=#a855f7>{0}</color></b>", totalLinesCleared));

        GUILayout.Space(12);

        if (currentStageIdx < stages.Count - 1)
        {
            string nextText = currentLang == Language.KO ? "다음 스테이지 ➔" : "Next Stage ➔";
            if (GUILayout.Button(nextText, GUILayout.Height(42)))
            {
                LoadStage(currentStageIdx + 1);
            }
        }
        else
        {
            string masterText = currentLang == Language.KO ? "★ 전설의 마스터 달성! 무한 모드 시작 ★" : "★ All 12 Stages Cleared! Start Endless ★";
            if (GUILayout.Button(masterText, GUILayout.Height(42)))
            {
                isEndlessMode = true;
                LoadStage(0);
            }
        }

        string retryText = currentLang == Language.KO ? "현재 스테이지 다시하기" : "Replay Stage";
        if (GUILayout.Button(retryText, GUILayout.Height(36)))
        {
            LoadStage(currentStageIdx);
        }

        GUILayout.EndArea();
    }
}
