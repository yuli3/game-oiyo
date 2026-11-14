using System;
using System.Collections.Generic;
using UnityEngine;

public class TwoHandsPlayer : MonoBehaviour
{
    public enum Language { KO, EN, JA, ES }
    private Language currentLang = Language.KO;

    public enum ObstacleType { Spike, SyncRing, ShieldOrb, BossLaser }

    public class TrackObstacle
    {
        public bool isRightTrack; // false: Left Track (Cyan), true: Right Track (Magenta)
        public int lane; // 0: inner/left, 1: outer/right
        public float zDistance;
        public ObstacleType type;
        public GameObject go;
        public bool isCollected = false;
        public bool isPassed = false;
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
        public float trackSpeed;
        public bool isMirrored;
        public bool isQuantumInvert;
        public Action<List<TrackObstacle>, Transform> generatePattern;
    }

    // Camera & Track Setup
    private Camera mainCam;
    private Vector3 camOriginPos;
    private float shakeTrauma = 0f;

    // Track Coordinates
    // Left Track centered at X = -2.4f (Lane 0: -3.0f, Lane 1: -1.8f)
    // Right Track centered at X = +2.4f (Lane 0: +1.8f, Lane 1: +3.0f)
    private readonly float[] LeftLanesX = { -3.1f, -1.7f };
    private readonly float[] RightLanesX = { 1.7f, 3.1f };

    // Player State
    private int leftLane = 0;
    private int rightLane = 0;
    private Vector3 leftOrbPos;
    private Vector3 rightOrbPos;
    private GameObject leftOrbGo;
    private GameObject rightOrbGo;
    private GameObject leftShieldGo;
    private GameObject rightShieldGo;
    private bool hasLeftShield = false;
    private bool hasRightShield = false;

    // Game Flow
    private List<TrackObstacle> obstacles = new List<TrackObstacle>();
    private List<ParticleDebris> particles = new List<ParticleDebris>();
    private List<StageData> stages = new List<StageData>();

    private int currentStageIndex = 0;
    private float currentDistance = 0f;
    private int score = 0;
    private int dualSyncCount = 0;
    private int combo = 0;
    private int lives = 3;
    private bool isGameOver = false;
    private bool isVictory = false;
    private bool showStageSelect = false;
    private float trackSpeed = 16f;

    // Sync Gate Tracking
    private float lastLeftRingTime = -1f;
    private float lastRightRingTime = -1f;

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
        CreateTrackVisuals();
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
        mainCam.transform.position = new Vector3(0f, 4.6f, -6.5f);
        mainCam.transform.rotation = Quaternion.Euler(22f, 0f, 0f);
        mainCam.backgroundColor = new Color(0.02f, 0.03f, 0.07f, 1f);
        mainCam.clearFlags = CameraClearFlags.SolidColor;
        camOriginPos = mainCam.transform.position;

        // Ambient Directional Light
        var lightGo = new GameObject("DirectionalLight");
        var light = lightGo.AddComponent<Light>();
        light.type = LightType.Directional;
        light.transform.rotation = Quaternion.Euler(50f, -25f, 0f);
        light.color = new Color(0.9f, 0.95f, 1.0f);
        light.intensity = 1.3f;
    }

    private void InitAudio()
    {
        audioSource = gameObject.AddComponent<AudioSource>();
        audioSource.playOnAwake = false;
    }

    private void CreateTrackVisuals()
    {
        // Left Track Bed (Cyan glow lines)
        CreateTrackBed(new Vector3(-2.4f, 0f, 20f), new Vector3(2.6f, 0.1f, 80f), new Color(0.05f, 0.12f, 0.25f), new Color(0.1f, 0.8f, 1.0f));

        // Right Track Bed (Magenta glow lines)
        CreateTrackBed(new Vector3(2.4f, 0f, 20f), new Vector3(2.6f, 0.1f, 80f), new Color(0.22f, 0.05f, 0.18f), new Color(1.0f, 0.2f, 0.7f));

        // Central Divider Ridge
        var divider = GameObject.CreatePrimitive(PrimitiveType.Cube);
        divider.name = "CentralDivider";
        divider.transform.position = new Vector3(0f, 0.25f, 20f);
        divider.transform.localScale = new Vector3(0.4f, 0.5f, 80f);
        var mat = new Material(Shader.Find("Universal Render Pipeline/Unlit") ?? Shader.Find("Sprites/Default"));
        mat.color = new Color(0.2f, 0.3f, 0.5f);
        divider.GetComponent<MeshRenderer>().material = mat;
    }

    private void CreateTrackBed(Vector3 pos, Vector3 scale, Color baseCol, Color neonBorder)
    {
        var bed = GameObject.CreatePrimitive(PrimitiveType.Cube);
        bed.name = "TrackBed";
        bed.transform.position = pos;
        bed.transform.localScale = scale;
        var mat = new Material(Shader.Find("Universal Render Pipeline/Unlit") ?? Shader.Find("Sprites/Default"));
        mat.color = baseCol;
        bed.GetComponent<MeshRenderer>().material = mat;

        // Side neon borders
        CreateNeonBorder(new Vector3(pos.x - scale.x * 0.5f, pos.y + 0.1f, pos.z), scale.z, neonBorder);
        CreateNeonBorder(new Vector3(pos.x + scale.x * 0.5f, pos.y + 0.1f, pos.z), scale.z, neonBorder);
    }

    private void CreateNeonBorder(Vector3 pos, float length, Color col)
    {
        var border = GameObject.CreatePrimitive(PrimitiveType.Cube);
        border.name = "NeonBorder";
        border.transform.position = pos;
        border.transform.localScale = new Vector3(0.12f, 0.22f, length);
        var mat = new Material(Shader.Find("Universal Render Pipeline/Unlit") ?? Shader.Find("Sprites/Default"));
        mat.color = col;
        border.GetComponent<MeshRenderer>().material = mat;
    }

    private void CreatePlayerVisuals()
    {
        // Left Orb (Cyan)
        leftOrbGo = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        leftOrbGo.name = "LeftOrb";
        leftOrbGo.transform.localScale = Vector3.one * 0.65f;
        var leftMat = new Material(Shader.Find("Universal Render Pipeline/Unlit") ?? Shader.Find("Sprites/Default"));
        leftMat.color = new Color(0.1f, 0.9f, 1.0f);
        leftOrbGo.GetComponent<MeshRenderer>().material = leftMat;

        leftShieldGo = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        leftShieldGo.name = "LeftShield";
        leftShieldGo.transform.SetParent(leftOrbGo.transform);
        leftShieldGo.transform.localPosition = Vector3.zero;
        leftShieldGo.transform.localScale = Vector3.one * 1.4f;
        var shieldMatL = new Material(Shader.Find("Universal Render Pipeline/Unlit") ?? Shader.Find("Sprites/Default"));
        shieldMatL.color = new Color(0.3f, 0.9f, 1f, 0.35f);
        leftShieldGo.GetComponent<MeshRenderer>().material = shieldMatL;
        leftShieldGo.SetActive(false);

        // Right Orb (Magenta)
        rightOrbGo = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        rightOrbGo.name = "RightOrb";
        rightOrbGo.transform.localScale = Vector3.one * 0.65f;
        var rightMat = new Material(Shader.Find("Universal Render Pipeline/Unlit") ?? Shader.Find("Sprites/Default"));
        rightMat.color = new Color(1.0f, 0.25f, 0.75f);
        rightOrbGo.GetComponent<MeshRenderer>().material = rightMat;

        rightShieldGo = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        rightShieldGo.name = "RightShield";
        rightShieldGo.transform.SetParent(rightOrbGo.transform);
        rightShieldGo.transform.localPosition = Vector3.zero;
        rightShieldGo.transform.localScale = Vector3.one * 1.4f;
        var shieldMatR = new Material(Shader.Find("Universal Render Pipeline/Unlit") ?? Shader.Find("Sprites/Default"));
        shieldMatR.color = new Color(1.0f, 0.3f, 0.8f, 0.35f);
        rightShieldGo.GetComponent<MeshRenderer>().material = shieldMatR;
        rightShieldGo.SetActive(false);
    }

    private void InitStages()
    {
        stages.Add(new StageData
        {
            id = 1,
            titleKo = "평행의 각성", titleEn = "Parallel Awakening", titleJa = "並行の覚醒", titleEs = "Despertar Paralelo",
            descKo = "양손의 기본 조작. 왼손은 A/D, 오른손은 좌우 화살표로 장애물을 피하세요.",
            descEn = "Basic bilateral control. Left: A/D, Right: Left/Right arrows.",
            descJa = "両手の基本操作。左手はA/D、右手は矢印キーで障害物を回避。",
            descEs = "Control bilateral básico. Izq: A/D, Der: Flechas Izq/Der.",
            targetDistance = 350f, trackSpeed = 16f, isMirrored = false, isQuantumInvert = false,
            generatePattern = (list, parent) => GenerateIntervalObstacles(list, parent, 350f, 25f, 0.15f, 0.25f)
        });

        stages.Add(new StageData
        {
            id = 2,
            titleKo = "교차 리듬", titleEn = "Alternate Rhythm", titleJa = "交差リズム", titleEs = "Ritmo Alterno",
            descKo = "엇박자로 쏟아지는 장애물. 왼손과 오른손의 독립적인 타이밍을 유지하세요.",
            descEn = "Syncopated hazards. Maintain independent timing for both hands.",
            descJa = "交互に押し寄せる障害物。左手と右手で独立したリズムを保て。",
            descEs = "Obstáculos sincopados. Mantén tiempos independientes en ambas manos.",
            targetDistance = 450f, trackSpeed = 17f, isMirrored = false, isQuantumInvert = false,
            generatePattern = (list, parent) => GenerateAlternatingObstacles(list, parent, 450f, 22f)
        });

        stages.Add(new StageData
        {
            id = 3,
            titleKo = "양손 동시 통과", titleEn = "Dual Sync Gates", titleJa = "両手同時通過", titleEs = "Puertas de Sincronía",
            descKo = "골든 링을 양손으로 동시에 획득하여 듀얼 싱크 콤보를 달성하세요!",
            descEn = "Collect golden rings simultaneously with both hands for sync combos!",
            descJa = "ゴールデンリングを両手で同時に獲得し、デュアルシンクを決めろ！",
            descEs = "¡Recoge anillos dorados a la vez con ambas manos para lograr combos!",
            targetDistance = 550f, trackSpeed = 18f, isMirrored = false, isQuantumInvert = false,
            generatePattern = (list, parent) => GenerateSyncGatePattern(list, parent, 550f, 24f)
        });

        stages.Add(new StageData
        {
            id = 4,
            titleKo = "거울 차원", titleEn = "Mirror Dimension", titleJa = "ミラー・ディメンション", titleEs = "Dimensión Espejo",
            descKo = "완벽한 좌우 대칭 장애물. 양손을 안쪽/바깥쪽으로 대칭 이동해야 합니다.",
            descEn = "Symmetric hazard walls. Move both hands symmetrically in or out.",
            descJa = "完全左右対称の障害物。両手を内側・外側へ対称に動かせ。",
            descEs = "Paredes simétricas. Mueve ambas manos simétricamente hacia dentro o fuera.",
            targetDistance = 680f, trackSpeed = 18.5f, isMirrored = true, isQuantumInvert = false,
            generatePattern = (list, parent) => GenerateMirrorPattern(list, parent, 680f, 20f)
        });

        stages.Add(new StageData
        {
            id = 5,
            titleKo = "양자 반전", titleEn = "Quantum Inversion", titleJa = "量子反転", titleEs = "Inversión Cuántica",
            descKo = "인지 트위스트! 오른손 조작 방향이 반대로 적용됩니다.",
            descEn = "Cognitive twist! Right hand steering inputs are inverted.",
            descJa = "認知ツイスト！右手の操作方向が反転します。",
            descEs = "¡Giro cognitivo! Los controles de la mano derecha están invertidos.",
            targetDistance = 800f, trackSpeed = 19f, isMirrored = false, isQuantumInvert = true,
            generatePattern = (list, parent) => GenerateIntervalObstacles(list, parent, 800f, 20f, 0.2f, 0.3f)
        });

        stages.Add(new StageData
        {
            id = 6,
            titleKo = "초고속 오버드라이브", titleEn = "Speedway Overdrive", titleJa = "オーバードライブ", titleEs = "Sobremarcha Veloz",
            descKo = "1.5배 가속 전장! 눈 깜짝할 사이에 다가오는 장애물을 전광석화로 회피.",
            descEn = "1.5x accelerated track! Lightning fast reaction time required.",
            descJa = "1.5倍加速戦場！電光石火の反射神経で障害物をかわせ。",
            descEs = "¡Pista a 1.5x de velocidad! Reacciona a la velocidad del rayo.",
            targetDistance = 950f, trackSpeed = 23.5f, isMirrored = false, isQuantumInvert = false,
            generatePattern = (list, parent) => GenerateIntervalObstacles(list, parent, 950f, 26f, 0.2f, 0.3f)
        });

        stages.Add(new StageData
        {
            id = 7,
            titleKo = "지뢰와 보호막", titleEn = "Shield & Hazards", titleJa = "シールドと地雷", titleEs = "Escudo y Peligros",
            descKo = "고밀도 지뢰밭. 블루 쉴드를 전략적으로 획득하여 돌파구를 만드세요.",
            descEn = "Dense minefields. Secure blue shields strategically to survive.",
            descJa = "高密度地雷原。青いシールドを戦略的に確保して突破口を開け。",
            descEs = "Campos de minas densos. Consigue escudos azules para sobrevivir.",
            targetDistance = 1100f, trackSpeed = 20f, isMirrored = false, isQuantumInvert = false,
            generatePattern = (list, parent) => GenerateShieldHazardPattern(list, parent, 1100f, 18f)
        });

        stages.Add(new StageData
        {
            id = 8,
            titleKo = "인지 비대칭", titleEn = "Cognitive Asymmetry", titleJa = "認知非対称", titleEs = "Asimetría Cognitiva",
            descKo = "왼손은 느리고 둔중한 리듬, 오른손은 숨 쉴 틈 없는 연속 회피.",
            descEn = "Slow heavy beats on the left, rapid-fire dodges on the right.",
            descJa = "左手は重くゆったり、右手は休む暇のない連続回避。",
            descEs = "Ritmo pesado a la izquierda, esquivas frenéticas a la derecha.",
            targetDistance = 1250f, trackSpeed = 20.5f, isMirrored = false, isQuantumInvert = false,
            generatePattern = (list, parent) => GenerateAsymmetricPattern(list, parent, 1250f)
        });

        stages.Add(new StageData
        {
            id = 9,
            titleKo = "사이버 보스: 듀얼 골리앗", titleEn = "Boss: Dual Goliath", titleJa = "ボス：デュアル・ゴリアテ", titleEs = "Jefe: Goliat Dual",
            descKo = "보스 거대 레이저 출현! 양쪽 트랙으로 번갈아 발사되는 빔을 회피하라.",
            descEn = "Massive Boss Laser! Dodge alternating beam sweeps on both tracks.",
            descJa = "巨大ボスレーザー出現！両トラックへ交互に放たれる極太ビームをかわせ。",
            descEs = "¡Láser de Jefe masivo! Esquiva los barridos de rayos en ambas pistas.",
            targetDistance = 1400f, trackSpeed = 21f, isMirrored = false, isQuantumInvert = false,
            generatePattern = (list, parent) => GenerateBossPattern(list, parent, 1400f)
        });

        stages.Add(new StageData
        {
            id = 10,
            titleKo = "하이퍼 시냅스", titleEn = "Hyper Synapse", titleJa = "ハイパー・シナプス", titleEs = "Híper Sinapsis",
            descKo = "양손 뇌 분할 멀티태스킹의 극한! 고난도 연속 복합 장애물.",
            descEn = "Extreme split-brain multitasking! Complex consecutive gauntlets.",
            descJa = "両脳分割マルチタスクの極致！超難関の連続複合障害物。",
            descEs = "¡Multitarea cerebral extrema! Desafíos consecutivos complejos.",
            targetDistance = 1600f, trackSpeed = 22f, isMirrored = false, isQuantumInvert = false,
            generatePattern = (list, parent) => GenerateIntervalObstacles(list, parent, 1600f, 16f, 0.25f, 0.35f)
        });

        stages.Add(new StageData
        {
            id = 11,
            titleKo = "카오스 인버전", titleEn = "Chaos Inversion", titleJa = "カオス・インバージョン", titleEs = "Inversión Caótica",
            descKo = "양자 반전과 초고속 엇박자의 악마적 융합 전장.",
            descEn = "Devilish combination of quantum inversion and high-speed alternate rhythm.",
            descJa = "量子反転と超高速交差リズムが融合した悪魔の戦場。",
            descEs = "Combinación diabólica de inversión cuántica y velocidad extrema.",
            targetDistance = 1800f, trackSpeed = 22.5f, isMirrored = false, isQuantumInvert = true,
            generatePattern = (list, parent) => GenerateAlternatingObstacles(list, parent, 1800f, 17f)
        });

        stages.Add(new StageData
        {
            id = 12,
            titleKo = "초월한 정신", titleEn = "Transcendent Mind", titleJa = "超越せし精神", titleEs = "Mente Trascendente",
            descKo = "12단계 최종 마스터 결전! 두 손의 완전한 조화와 반사 신경의 피날레.",
            descEn = "Stage 12 Grand Master Finale! Complete bilateral harmony and reflex mastery.",
            descJa = "ステージ12最終決戦！両手の完全な調和と反射神経のフィナーレ。",
            descEs = "¡Gran Final de la Etapa 12! Armonía bilateral absoluta y reflejos supremos.",
            targetDistance = 2000f, trackSpeed = 24f, isMirrored = false, isQuantumInvert = false,
            generatePattern = (list, parent) => GenerateFinalePattern(list, parent, 2000f)
        });
    }

    private void StartStage(int stageIdx)
    {
        currentStageIndex = Mathf.Clamp(stageIdx, 0, stages.Count - 1);
        var st = stages[currentStageIndex];
        currentDistance = 0f;
        trackSpeed = st.trackSpeed;
        leftLane = 0;
        rightLane = 0;
        hasLeftShield = false;
        hasRightShield = false;
        combo = 0;
        isGameOver = false;
        isVictory = false;

        // Clear existing obstacles and particles
        foreach (var ob in obstacles) if (ob.go != null) Destroy(ob.go);
        obstacles.Clear();

        foreach (var p in particles) if (p.go != null) Destroy(p.go);
        particles.Clear();

        // Generate Stage Obstacles
        st.generatePattern(obstacles, transform);

        UpdateOrbPositions(true);
        ShowToast($"{GetLocalizedStageTitle(st)} - START!");
        PlayTone(523.25f, 0.15f, 0f); // Center C5
    }

    private void GenerateIntervalObstacles(List<TrackObstacle> list, Transform parent, float maxDist, float interval, float shieldChance, float syncChance)
    {
        for (float z = 30f; z < maxDist; z += interval)
        {
            float roll = UnityEngine.Random.value;
            if (roll < syncChance)
            {
                // Sync Gate on both tracks at same Z
                int lLane = UnityEngine.Random.Range(0, 2);
                int rLane = UnityEngine.Random.Range(0, 2);
                CreateObstacle(list, false, lLane, z, ObstacleType.SyncRing, parent);
                CreateObstacle(list, true, rLane, z, ObstacleType.SyncRing, parent);
            }
            else if (roll < syncChance + shieldChance)
            {
                bool right = UnityEngine.Random.value > 0.5f;
                CreateObstacle(list, right, UnityEngine.Random.Range(0, 2), z, ObstacleType.ShieldOrb, parent);
            }
            else
            {
                // Regular Spikes
                CreateObstacle(list, false, UnityEngine.Random.Range(0, 2), z, ObstacleType.Spike, parent);
                CreateObstacle(list, true, UnityEngine.Random.Range(0, 2), z + UnityEngine.Random.Range(-3f, 3f), ObstacleType.Spike, parent);
            }
        }
    }

    private void GenerateAlternatingObstacles(List<TrackObstacle> list, Transform parent, float maxDist, float interval)
    {
        for (float z = 30f; z < maxDist; z += interval)
        {
            // Left spike, followed by Right spike offset by half interval
            CreateObstacle(list, false, UnityEngine.Random.Range(0, 2), z, ObstacleType.Spike, parent);
            CreateObstacle(list, true, UnityEngine.Random.Range(0, 2), z + interval * 0.5f, ObstacleType.Spike, parent);

            if (z % (interval * 3) < interval)
            {
                CreateObstacle(list, false, 0, z + interval * 0.25f, ObstacleType.SyncRing, parent);
                CreateObstacle(list, true, 0, z + interval * 0.25f, ObstacleType.SyncRing, parent);
            }
        }
    }

    private void GenerateSyncGatePattern(List<TrackObstacle> list, Transform parent, float maxDist, float interval)
    {
        for (float z = 25f; z < maxDist; z += interval)
        {
            int lLane = (int)(z / interval) % 2;
            int rLane = (int)(z / interval) % 2;

            // Spikes on other lanes, rings on target lanes
            CreateObstacle(list, false, lLane, z, ObstacleType.SyncRing, parent);
            CreateObstacle(list, true, rLane, z, ObstacleType.SyncRing, parent);

            CreateObstacle(list, false, 1 - lLane, z, ObstacleType.Spike, parent);
            CreateObstacle(list, true, 1 - rLane, z, ObstacleType.Spike, parent);
        }
    }

    private void GenerateMirrorPattern(List<TrackObstacle> list, Transform parent, float maxDist, float interval)
    {
        for (float z = 30f; z < maxDist; z += interval)
        {
            int mirrorType = UnityEngine.Random.Range(0, 2);
            if (mirrorType == 0)
            {
                // Both inner lanes have spikes (must move to outer lanes)
                CreateObstacle(list, false, 1, z, ObstacleType.Spike, parent); // left track outer is 0, inner is 1
                CreateObstacle(list, true, 0, z, ObstacleType.Spike, parent);  // right track inner is 0, outer is 1
            }
            else
            {
                // Both outer lanes have spikes (must move to inner lanes)
                CreateObstacle(list, false, 0, z, ObstacleType.Spike, parent);
                CreateObstacle(list, true, 1, z, ObstacleType.Spike, parent);
            }
        }
    }

    private void GenerateShieldHazardPattern(List<TrackObstacle> list, Transform parent, float maxDist, float interval)
    {
        for (float z = 25f; z < maxDist; z += interval)
        {
            CreateObstacle(list, false, UnityEngine.Random.Range(0, 2), z, ObstacleType.ShieldOrb, parent);
            CreateObstacle(list, false, UnityEngine.Random.Range(0, 2), z + 6f, ObstacleType.Spike, parent);
            CreateObstacle(list, true, UnityEngine.Random.Range(0, 2), z + 3f, ObstacleType.ShieldOrb, parent);
            CreateObstacle(list, true, UnityEngine.Random.Range(0, 2), z + 9f, ObstacleType.Spike, parent);
        }
    }

    private void GenerateAsymmetricPattern(List<TrackObstacle> list, Transform parent, float maxDist)
    {
        // Left hand has slow spaced obstacles (every 35m)
        for (float z = 30f; z < maxDist; z += 35f)
        {
            CreateObstacle(list, false, UnityEngine.Random.Range(0, 2), z, ObstacleType.Spike, parent);
            CreateObstacle(list, false, UnityEngine.Random.Range(0, 2), z + 15f, ObstacleType.SyncRing, parent);
        }
        // Right hand has fast rapid obstacles (every 14m)
        for (float z = 25f; z < maxDist; z += 14f)
        {
            CreateObstacle(list, true, UnityEngine.Random.Range(0, 2), z, ObstacleType.Spike, parent);
        }
    }

    private void GenerateBossPattern(List<TrackObstacle> list, Transform parent, float maxDist)
    {
        for (float z = 30f; z < maxDist; z += 22f)
        {
            bool isBossLaser = (z % 44f < 22f);
            if (isBossLaser)
            {
                // Giant Boss Beam on one full track
                bool leftBeam = UnityEngine.Random.value > 0.5f;
                CreateObstacle(list, leftBeam, 0, z, ObstacleType.BossLaser, parent);
                CreateObstacle(list, leftBeam, 1, z, ObstacleType.BossLaser, parent);
            }
            else
            {
                CreateObstacle(list, false, UnityEngine.Random.Range(0, 2), z, ObstacleType.SyncRing, parent);
                CreateObstacle(list, true, UnityEngine.Random.Range(0, 2), z, ObstacleType.SyncRing, parent);
            }
        }
    }

    private void GenerateFinalePattern(List<TrackObstacle> list, Transform parent, float maxDist)
    {
        for (float z = 25f; z < maxDist; z += 15f)
        {
            CreateObstacle(list, false, UnityEngine.Random.Range(0, 2), z, ObstacleType.Spike, parent);
            CreateObstacle(list, true, UnityEngine.Random.Range(0, 2), z + 5f, ObstacleType.Spike, parent);
            if (z % 30f < 15f)
            {
                CreateObstacle(list, false, UnityEngine.Random.Range(0, 2), z + 10f, ObstacleType.SyncRing, parent);
                CreateObstacle(list, true, UnityEngine.Random.Range(0, 2), z + 10f, ObstacleType.SyncRing, parent);
            }
        }
    }

    private void CreateObstacle(List<TrackObstacle> list, bool rightTrack, int lane, float z, ObstacleType type, Transform parent)
    {
        var ob = new TrackObstacle
        {
            isRightTrack = rightTrack,
            lane = Mathf.Clamp(lane, 0, 1),
            zDistance = z,
            type = type
        };

        float x = rightTrack ? RightLanesX[ob.lane] : LeftLanesX[ob.lane];
        var go = GameObject.CreatePrimitive(type == ObstacleType.SyncRing ? PrimitiveType.Cylinder : (type == ObstacleType.ShieldOrb ? PrimitiveType.Sphere : PrimitiveType.Cube));
        go.name = "Obstacle_" + type;
        go.transform.position = new Vector3(x, 0.45f, z);

        Color col = Color.red;
        if (type == ObstacleType.Spike)
        {
            go.transform.localScale = new Vector3(0.7f, 0.7f, 0.7f);
            col = new Color(1f, 0.2f, 0.25f);
        }
        else if (type == ObstacleType.SyncRing)
        {
            go.transform.localScale = new Vector3(0.9f, 0.15f, 0.9f);
            go.transform.rotation = Quaternion.Euler(90f, 0f, 0f);
            col = new Color(1.0f, 0.85f, 0.1f);
        }
        else if (type == ObstacleType.ShieldOrb)
        {
            go.transform.localScale = Vector3.one * 0.75f;
            col = new Color(0.2f, 0.8f, 1.0f);
        }
        else if (type == ObstacleType.BossLaser)
        {
            go.transform.localScale = new Vector3(1.1f, 1.2f, 2.5f);
            col = new Color(1.0f, 0.1f, 0.9f);
        }

        var mat = new Material(Shader.Find("Universal Render Pipeline/Unlit") ?? Shader.Find("Sprites/Default"));
        mat.color = col;
        go.GetComponent<MeshRenderer>().material = mat;
        go.transform.SetParent(parent);
        ob.go = go;

        list.Add(ob);
    }

    private void Update()
    {
        if (isGameOver || isVictory || showStageSelect) return;

        HandleInput();
        AdvanceDistance();
        UpdateOrbPositions(false);
        UpdateObstacles();
        UpdateParticles();
        UpdateCameraShake();

        if (toastTimer > 0f) toastTimer -= Time.deltaTime;

        // Check Victory
        var st = stages[currentStageIndex];
        if (currentDistance >= st.targetDistance)
        {
            isVictory = true;
            PlayTone(880f, 0.4f, 0f);
            ShowToast(GetLocalizedText("STAGE CLEAR!", "스테이지 클리어!", "ステージクリア！", "¡ETAPA SUPERADA!"));
        }
    }

    private void HandleInput()
    {
        var st = stages[currentStageIndex];

        // Left Hand Controls (A / D, or Left Side Touch)
        if (Input.GetKeyDown(KeyCode.A)) SetLeftLane(0);
        if (Input.GetKeyDown(KeyCode.D)) SetLeftLane(1);

        // Right Hand Controls (Left / Right Arrow, J / L)
        if (Input.GetKeyDown(KeyCode.LeftArrow) || Input.GetKeyDown(KeyCode.J))
        {
            SetRightLane(st.isQuantumInvert ? 1 : 0);
        }
        if (Input.GetKeyDown(KeyCode.RightArrow) || Input.GetKeyDown(KeyCode.L))
        {
            SetRightLane(st.isQuantumInvert ? 0 : 1);
        }

        // Mouse/Touch Screen Split Buttons
        if (Input.GetMouseButtonDown(0))
        {
            Vector3 mPos = Input.mousePosition;
            if (mPos.y < Screen.height * 0.35f) // Bottom Touch Bar
            {
                if (mPos.x < Screen.width * 0.25f) SetLeftLane(0);
                else if (mPos.x < Screen.width * 0.5f) SetLeftLane(1);
                else if (mPos.x < Screen.width * 0.75f) SetRightLane(st.isQuantumInvert ? 1 : 0);
                else SetRightLane(st.isQuantumInvert ? 0 : 1);
            }
        }
    }

    private void SetLeftLane(int lane)
    {
        if (leftLane != lane)
        {
            leftLane = lane;
            PlayTone(350f, 0.05f, -0.7f); // Left pan tone
        }
    }

    private void SetRightLane(int lane)
    {
        if (rightLane != lane)
        {
            rightLane = lane;
            PlayTone(450f, 0.05f, 0.7f); // Right pan tone
        }
    }

    private void AdvanceDistance()
    {
        currentDistance += trackSpeed * Time.deltaTime;
        score += (int)(trackSpeed * Time.deltaTime * 5f);
    }

    private void UpdateOrbPositions(bool instant)
    {
        Vector3 targetLeft = new Vector3(LeftLanesX[leftLane], 0.45f, 0f);
        Vector3 targetRight = new Vector3(RightLanesX[rightLane], 0.45f, 0f);

        if (instant)
        {
            leftOrbPos = targetLeft;
            rightOrbPos = targetRight;
        }
        else
        {
            leftOrbPos = Vector3.Lerp(leftOrbPos, targetLeft, 22f * Time.deltaTime);
            rightOrbPos = Vector3.Lerp(rightOrbPos, targetRight, 22f * Time.deltaTime);
        }

        if (leftOrbGo != null) leftOrbGo.transform.position = leftOrbPos;
        if (rightOrbGo != null) rightOrbGo.transform.position = rightOrbPos;

        if (leftShieldGo != null) leftShieldGo.SetActive(hasLeftShield);
        if (rightShieldGo != null) rightShieldGo.SetActive(hasRightShield);
    }

    private void UpdateObstacles()
    {
        float checkZ = 0f;

        for (int i = obstacles.Count - 1; i >= 0; i--)
        {
            var ob = obstacles[i];
            float relZ = ob.zDistance - currentDistance;

            if (ob.go != null)
            {
                float x = ob.isRightTrack ? RightLanesX[ob.lane] : LeftLanesX[ob.lane];
                ob.go.transform.position = new Vector3(x, 0.45f, relZ);

                // Rotate rings and shield orbs
                if (ob.type == ObstacleType.SyncRing || ob.type == ObstacleType.ShieldOrb)
                {
                    ob.go.transform.Rotate(0f, 120f * Time.deltaTime, 0f);
                }
            }

            // Collision Check with respective Orb
            if (!ob.isCollected && Mathf.Abs(relZ - checkZ) < 0.75f)
            {
                int playerLane = ob.isRightTrack ? rightLane : leftLane;
                if (playerLane == ob.lane)
                {
                    HandleCollision(ob);
                }
            }

            // Cleanup passed obstacles
            if (relZ < -10f)
            {
                if (ob.go != null) Destroy(ob.go);
                obstacles.RemoveAt(i);
            }
        }
    }

    private void HandleCollision(TrackObstacle ob)
    {
        ob.isCollected = true;
        if (ob.go != null) Destroy(ob.go);

        if (ob.type == ObstacleType.Spike || ob.type == ObstacleType.BossLaser)
        {
            // Check shield protection
            if (!ob.isRightTrack && hasLeftShield)
            {
                hasLeftShield = false;
                shakeTrauma = 0.25f;
                ShowToast("LEFT SHIELD BROKEN!");
                PlayTone(220f, 0.1f, -0.6f);
                SpawnSparks(leftOrbPos, Color.cyan, 12);
                return;
            }
            if (ob.isRightTrack && hasRightShield)
            {
                hasRightShield = false;
                shakeTrauma = 0.25f;
                ShowToast("RIGHT SHIELD BROKEN!");
                PlayTone(220f, 0.1f, 0.6f);
                SpawnSparks(rightOrbPos, Color.magenta, 12);
                return;
            }

            // Crash!
            lives--;
            combo = 0;
            shakeTrauma = 0.5f;
            Vector3 crashPos = ob.isRightTrack ? rightOrbPos : leftOrbPos;
            SpawnSparks(crashPos, Color.red, 18);
            PlayTone(110f, 0.25f, ob.isRightTrack ? 0.7f : -0.7f);

            if (lives <= 0)
            {
                isGameOver = true;
                ShowToast(GetLocalizedText("CRASH! GAME OVER", "충돌! 게임 오버", "衝突！ゲームオーバー", "¡CHOQUE! FIN DEL JUEGO"));
            }
            else
            {
                ShowToast($"CRASH! -1 LIFE ({lives} LEFT)");
            }
        }
        else if (ob.type == ObstacleType.SyncRing)
        {
            float now = Time.time;
            if (ob.isRightTrack) lastRightRingTime = now;
            else lastLeftRingTime = now;

            // Check bilateral synchronization (within 0.25s)
            if (Mathf.Abs(lastLeftRingTime - lastRightRingTime) < 0.25f)
            {
                dualSyncCount++;
                combo++;
                score += 500 * combo;
                shakeTrauma = 0.2f;
                ShowToast($"★ DUAL SYNC x{combo}! +{500 * combo} ★");
                PlayTone(880f, 0.15f, 0f);
                SpawnSparks((leftOrbPos + rightOrbPos) * 0.5f, Color.yellow, 20);
            }
            else
            {
                score += 150;
                PlayTone(660f, 0.08f, ob.isRightTrack ? 0.7f : -0.7f);
                SpawnSparks(ob.isRightTrack ? rightOrbPos : leftOrbPos, Color.yellow, 8);
            }
        }
        else if (ob.type == ObstacleType.ShieldOrb)
        {
            if (ob.isRightTrack) hasRightShield = true;
            else hasLeftShield = true;

            shakeTrauma = 0.15f;
            ShowToast(ob.isRightTrack ? "RIGHT SHIELD ACQUIRED!" : "LEFT SHIELD ACQUIRED!");
            PlayTone(784f, 0.15f, ob.isRightTrack ? 0.7f : -0.7f);
        }
    }

    private void SpawnSparks(Vector3 pos, Color col, int count)
    {
        for (int i = 0; i < count; i++)
        {
            var p = new ParticleDebris
            {
                position = pos,
                velocity = new Vector3(UnityEngine.Random.Range(-3f, 3f), UnityEngine.Random.Range(1f, 5f), UnityEngine.Random.Range(-3f, 3f)),
                color = col,
                life = 0.45f
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
            float shake = shakeTrauma * shakeTrauma * 0.4f;
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

    private void PlayTone(float freq, float duration, float pan)
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
        audioSource.panStereo = pan;
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
        DrawMobileTouchControls();

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
        GUILayout.Label($"<b>TWO HANDS 3D</b> · STAGE {currentStageIndex + 1}/{stages.Count}", GetLabelStyle(16, Color.cyan));
        var st = stages[currentStageIndex];
        GUILayout.Label(GetLocalizedStageTitle(st), GetLabelStyle(12, Color.white));
        GUILayout.EndVertical();

        GUILayout.FlexibleSpace();

        // Distance & Score & Lives
        GUILayout.BeginVertical();
        GUILayout.Label($"{GetLocalizedText("DISTANCE", "진행 거리", "距離", "DISTANCIA")}: <b>{(int)currentDistance}m / {(int)st.targetDistance}m</b>", GetLabelStyle(13, Color.white));
        GUILayout.Label($"{GetLocalizedText("SCORE", "점수", "スコア", "PUNTOS")}: <b>{score}</b> · {"❤️".Repeat(lives)}", GetLabelStyle(13, Color.yellow));
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

        // Controls Guidance Bar
        GUI.Label(new Rect(10, Screen.height - 35, Screen.width - 20, 25),
            GetLocalizedText(
                "조작: [왼손: A / D] ◄► [오른손: ◀ / ▶] · 모바일: 하단 좌/우 터치",
                "Controls: [Left: A / D] ◄► [Right: ◀ / ▶] · Mobile: Touch Bottom L/R",
                "操作: [左手: A / D] ◄► [右手: ◀ / ▶] · モバイル: 画面下部タッチ",
                "Controles: [Izq: A / D] ◄► [Der: ◀ / ▶] · Móvil: Tocar abajo"),
            GetLabelStyle(12, Color.gray));
    }

    private void DrawMobileTouchControls()
    {
        // On-screen Touch Guidance Buttons on Bottom
        float h = 60;
        float y = Screen.height - h - 40;
        float w = Screen.width * 0.22f;

        if (GUI.Button(new Rect(20, y, w, h), "◀ LEFT [A]")) SetLeftLane(0);
        if (GUI.Button(new Rect(25 + w, y, w, h), "LEFT [D] ▶")) SetLeftLane(1);

        float rStart = Screen.width - w * 2 - 25;
        var st = stages[currentStageIndex];
        if (GUI.Button(new Rect(rStart, y, w, h), "◀ RIGHT [◀]")) SetRightLane(st.isQuantumInvert ? 1 : 0);
        if (GUI.Button(new Rect(rStart + w + 5, y, w, h), "RIGHT [▶] ▶")) SetRightLane(st.isQuantumInvert ? 0 : 1);
    }

    private void DrawStageSelectModal()
    {
        GUI.Box(new Rect(0, 0, Screen.width, Screen.height), "");
        float w = Mathf.Min(650, Screen.width - 40);
        float h = Mathf.Min(480, Screen.height - 40);
        Rect rect = new Rect((Screen.width - w) * 0.5f, (Screen.height - h) * 0.5f, w, h);

        GUI.Box(rect, $"<b>{GetLocalizedText("SELECT STAGE", "스테이지 선택", "ステージ選択", "SELECCIONAR ETAPA")} (1~12)</b>");

        GUILayout.BeginArea(new Rect(rect.x + 20, rect.y + 40, rect.width - 40, rect.height - 50));
        GUILayout.Label(GetLocalizedText("12개 양손 인지 조율 전장 중 도전할 스테이지를 선택하세요.", "Select from 12 bilateral brain coordination stages.", "12の両手認知調和ステージから挑戦を選択してください。", "Selecciona entre 12 etapas de coordinación cerebral bilateral."), GetLabelStyle(12, Color.gray));

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
        GUILayout.Label($"{GetLocalizedText("듀얼 싱크 횟수", "Dual Syncs", "デュアルシンク回数", "Sincronías Duales")}: <b>{dualSyncCount}회</b>", GetLabelStyle(14, Color.yellow));

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
            if (GUILayout.Button(GetLocalizedText("피날레 정복 완료! (다시하기)", "Grand Finale Completed! (Restart)", "フィナーレ制覇達成！（再挑戦）", "¡Gran Final Completado!"), GUILayout.Height(44)))
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
        GUILayout.Label(GetLocalizedText("장애물에 충돌하여 에너지가 소진되었습니다!", "Energy depleted due to collisions!", "障害物に衝突しエネルギーが尽きました！", "¡Energía agotada por colisiones!"), GetLabelStyle(14, Color.red));
        GUILayout.Space(8);
        GUILayout.Label($"{GetLocalizedText("달성 거리", "Distance Reached", "到達距離", "Distancia Alcanzada")}: <b>{(int)currentDistance}m</b>", GetLabelStyle(14, Color.white));
        GUILayout.Label($"{GetLocalizedText("도달 점수", "Reached Score", "スコア", "Puntuación")}: <b>{score}</b>", GetLabelStyle(13, Color.yellow));

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
