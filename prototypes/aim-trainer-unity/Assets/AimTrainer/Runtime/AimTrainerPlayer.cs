using System;
using System.Collections.Generic;
using UnityEngine;

public class AimTrainerPlayer : MonoBehaviour
{
    public enum Language { KO, EN, JA, ES }
    private Language currentLang = Language.KO;

    public enum TargetType { Standard, Moving, Parabolic, Bomb, Gold, BossCore }

    public class AimTarget
    {
        public Vector3 position;
        public Vector3 velocity;
        public float radius = 0.55f;
        public TargetType type;
        public float spawnTime;
        public float lifetime = 2.5f;
        public float currentLife = 0f;
        public int hp = 1;
        public int maxHp = 1;
        public Color baseColor;
        public GameObject go;
        public bool isAlive = true;
        public bool isShrinking = false;
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
        public int targetScore;
        public float stageTime;
        public Action<AimTrainerPlayer> setupMode;
    }

    // World & Arena Bounds
    private const float ArenaMinX = -5.2f;
    private const float ArenaMaxX = 5.2f;
    private const float ArenaMinY = -2.8f;
    private const float ArenaMaxY = 4.2f;
    private const float TargetPlaneZ = 12.0f;

    // Camera & Juice
    private Camera mainCam;
    private Vector3 camOriginPos;
    private float shakeTrauma = 0f;

    // Crosshair & Raycast
    private Vector3 aimWorldPos;
    private GameObject crosshairGo;
    private float recoilSpread = 0f;

    // Game State
    private List<AimTarget> targets = new List<AimTarget>();
    private List<ParticleDebris> particles = new List<ParticleDebris>();
    private List<StageData> stages = new List<StageData>();

    private int currentStageIndex = 0;
    private float stageTimer = 30f;
    private int score = 0;
    private int shotsFired = 0;
    private int shotsHit = 0;
    private int combo = 0;
    private int maxCombo = 0;
    private List<int> reactionTimes = new List<int>();

    private bool isGameOver = false;
    private bool isVictory = false;
    private bool showStageSelect = false;

    // Target Spawning Parameters
    private float spawnCooldown = 0f;
    private float spawnInterval = 0.8f;
    private int maxConcurrentTargets = 4;
    private float targetBaseRadius = 0.55f;
    private bool allowBombs = false;
    private bool allowMoving = false;
    private bool allowParabolic = false;
    private bool allowGold = false;
    private bool isBossStage = false;

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
        CreateArenaVisuals();
        CreateCrosshairVisual();
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
        mainCam.transform.position = new Vector3(0f, 0.6f, 0f);
        mainCam.transform.rotation = Quaternion.identity;
        mainCam.backgroundColor = new Color(0.03f, 0.04f, 0.08f, 1f);
        mainCam.clearFlags = CameraClearFlags.SolidColor;
        camOriginPos = mainCam.transform.position;

        // Ambient Light
        var lightGo = new GameObject("DirectionalLight");
        var light = lightGo.AddComponent<Light>();
        light.type = LightType.Directional;
        light.transform.rotation = Quaternion.Euler(35f, -20f, 0f);
        light.color = new Color(0.95f, 0.95f, 1.0f);
        light.intensity = 1.25f;
    }

    private void InitAudio()
    {
        audioSource = gameObject.AddComponent<AudioSource>();
        audioSource.playOnAwake = false;
    }

    private void CreateArenaVisuals()
    {
        // 3D Shooting Range Backwall with subtle grid
        var backWall = GameObject.CreatePrimitive(PrimitiveType.Quad);
        backWall.name = "RangeBackWall";
        backWall.transform.position = new Vector3(0f, 0.7f, TargetPlaneZ + 0.5f);
        backWall.transform.localScale = new Vector3(16f, 11f, 1f);
        var wallMat = new Material(Shader.Find("Universal Render Pipeline/Unlit") ?? Shader.Find("Sprites/Default"));
        wallMat.color = new Color(0.06f, 0.08f, 0.16f);
        backWall.GetComponent<MeshRenderer>().material = wallMat;

        // Neon Range Boundaries
        CreateNeonLine(new Vector3(ArenaMinX - 0.2f, 0.7f, TargetPlaneZ), new Vector3(0.12f, 8.5f, 0.12f), new Color(0.2f, 0.6f, 1.0f));
        CreateNeonLine(new Vector3(ArenaMaxX + 0.2f, 0.7f, TargetPlaneZ), new Vector3(0.12f, 8.5f, 0.12f), new Color(0.2f, 0.6f, 1.0f));
        CreateNeonLine(new Vector3(0f, ArenaMaxY + 0.2f, TargetPlaneZ), new Vector3(11f, 0.12f, 0.12f), new Color(0.2f, 0.6f, 1.0f));
        CreateNeonLine(new Vector3(0f, ArenaMinY - 0.2f, TargetPlaneZ), new Vector3(11f, 0.12f, 0.12f), new Color(0.2f, 0.6f, 1.0f));
    }

    private void CreateNeonLine(Vector3 pos, Vector3 scale, Color col)
    {
        var line = GameObject.CreatePrimitive(PrimitiveType.Cube);
        line.name = "NeonFrame";
        line.transform.position = pos;
        line.transform.localScale = scale;
        var mat = new Material(Shader.Find("Universal Render Pipeline/Unlit") ?? Shader.Find("Sprites/Default"));
        mat.color = col;
        line.GetComponent<MeshRenderer>().material = mat;
    }

    private void CreateCrosshairVisual()
    {
        crosshairGo = new GameObject("CrosshairRoot");
        // Crosshair Center Dot
        var dot = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        dot.transform.SetParent(crosshairGo.transform);
        dot.transform.localScale = Vector3.one * 0.08f;
        var dotMat = new Material(Shader.Find("Universal Render Pipeline/Unlit") ?? Shader.Find("Sprites/Default"));
        dotMat.color = Color.cyan;
        dot.GetComponent<MeshRenderer>().material = dotMat;

        // Ring
        var ring = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        ring.transform.SetParent(crosshairGo.transform);
        ring.transform.localScale = new Vector3(0.35f, 0.01f, 0.35f);
        ring.transform.rotation = Quaternion.Euler(90f, 0f, 0f);
        var ringMat = new Material(Shader.Find("Universal Render Pipeline/Unlit") ?? Shader.Find("Sprites/Default"));
        ringMat.color = new Color(0.2f, 0.8f, 1.0f, 0.6f);
        ring.GetComponent<MeshRenderer>().material = ringMat;
    }

    private void InitStages()
    {
        stages.Add(new StageData
        {
            id = 1,
            titleKo = "그리드 웜업", titleEn = "Grid Warmup", titleJa = "グリッド・ウォームアップ", titleEs = "Calentamiento de Cuadrícula",
            descKo = "기본 3x3 정적 표적 플릭 훈련. 표적 중심을 신속 정확하게 저격하세요.",
            descEn = "Basic 3x3 static target flicking. Strike target centers swiftly and accurately.",
            descJa = "基本3x3静的標的フリック訓練。標的の中心を素早く正確に射撃せよ。",
            descEs = "Práctica estática 3x3 básica. Dispara al centro con rapidez y precisión.",
            targetScore = 1500, stageTime = 30f,
            setupMode = (p) => {
                p.spawnInterval = 0.75f; p.maxConcurrentTargets = 4; p.targetBaseRadius = 0.55f;
                p.allowBombs = false; p.allowMoving = false; p.allowParabolic = false; p.allowGold = false; p.isBossStage = false;
            }
        });

        stages.Add(new StageData
        {
            id = 2,
            titleKo = "마이크로 정밀도", titleEn = "Micro Precision", titleJa = "マイクロ精密射撃", titleEs = "Micro Precisión",
            descKo = "작아진 핀포인트 표적! 미세 마우스 조작과 침착한 조준력 시험.",
            descEn = "Downsized pinpoint targets! Tests fine-tuned motor control and patience.",
            descJa = "縮小された極小ピンポイント標的！微細なエイム操作と集中力を試せ。",
            descEs = "¡Blancos diminutos! Pon a prueba tu control motor fino y puntería.",
            targetScore = 2000, stageTime = 30f,
            setupMode = (p) => {
                p.spawnInterval = 0.65f; p.maxConcurrentTargets = 3; p.targetBaseRadius = 0.35f;
                p.allowBombs = false; p.allowMoving = false; p.allowParabolic = false; p.allowGold = false; p.isBossStage = false;
            }
        });

        stages.Add(new StageData
        {
            id = 3,
            titleKo = "레일 글라이딩", titleEn = "Gliding Rails", titleJa = "グライディング・レール", titleEs = "Rieles Planeadores",
            descKo = "좌우로 일정 속도로 활공하는 이동 표적을 예측하고 트래킹하세요.",
            descEn = "Predict and track moving targets gliding horizontally across the range.",
            descJa = "左右に一定速度で滑走する移動標的を予測して追従射撃せよ。",
            descEs = "Predice y sigue objetivos que se desplazan horizontalmente.",
            targetScore = 2600, stageTime = 30f,
            setupMode = (p) => {
                p.spawnInterval = 0.7f; p.maxConcurrentTargets = 4; p.targetBaseRadius = 0.5f;
                p.allowBombs = false; p.allowMoving = true; p.allowParabolic = false; p.allowGold = false; p.isBossStage = false;
            }
        });

        stages.Add(new StageData
        {
            id = 4,
            titleKo = "클레이 사격", titleEn = "Clay Skeet Shoot", titleJa = "クレー射撃", titleEs = "Tiro al Plato",
            descKo = "공중으로 포물선을 그리며 솟구쳐 오르는 비행 표적을 정점에서 요격!",
            descEn = "Intercept clay targets launched upward in parabolic trajectories at their peak!",
            descJa = "空中へ放物線を描いて打ち上げられるクレー標的を頂点で迎撃せよ！",
            descEs = "¡Intercepta platos de arcilla lanzados en arco en su punto más alto!",
            targetScore = 3400, stageTime = 30f,
            setupMode = (p) => {
                p.spawnInterval = 0.8f; p.maxConcurrentTargets = 4; p.targetBaseRadius = 0.52f;
                p.allowBombs = false; p.allowMoving = false; p.allowParabolic = true; p.allowGold = false; p.isBossStage = false;
            }
        });

        stages.Add(new StageData
        {
            id = 5,
            titleKo = "지뢰 식별 사격", titleEn = "Bomb Decoy Hazard", titleJa = "地雷識別射撃", titleEs = "Peligro de Señuelos",
            descKo = "해골 폭탄 표적을 피하고 정상 표적만 골라 쏘는 신속한 피아식별 훈련.",
            descEn = "Avoid skull bomb decoys (-500pts) and strike only valid bullseyes.",
            descJa = "ドクロ爆弾標的を避け、正常な的だけを選び抜く素早い敵味方識別訓練。",
            descEs = "Evita los señuelos de calavera (-500) y dispara solo a dianas válidas.",
            targetScore = 4200, stageTime = 30f,
            setupMode = (p) => {
                p.spawnInterval = 0.6f; p.maxConcurrentTargets = 5; p.targetBaseRadius = 0.5f;
                p.allowBombs = true; p.allowMoving = false; p.allowParabolic = false; p.allowGold = false; p.isBossStage = false;
            }
        });

        stages.Add(new StageData
        {
            id = 6,
            titleKo = "초고속 플릭 오버드라이브", titleEn = "Flick Reflex Overdrive", titleJa = "超高速フリック・激突", titleEs = "Sobremarcha de Reflejos",
            descKo = "표적 수명 단 0.8초! 시야에 들어오는 즉시 전광석화 플릭 샷을 날려라.",
            descEn = "Target lifetime only 0.8s! Lightning fast reaction time required.",
            descJa = "標的の寿命わずか0.8秒！視界に入った瞬間に電光石火のフリックを放て。",
            descEs = "¡Objetivos de solo 0.8s de vida! Se requiere una velocidad de reacción extrema.",
            targetScore = 5200, stageTime = 30f,
            setupMode = (p) => {
                p.spawnInterval = 0.45f; p.maxConcurrentTargets = 4; p.targetBaseRadius = 0.48f;
                p.allowBombs = false; p.allowMoving = false; p.allowParabolic = false; p.allowGold = false; p.isBossStage = false;
            }
        });

        stages.Add(new StageData
        {
            id = 7,
            titleKo = "구형 트래킹", titleEn = "Spherical Tracking", titleJa = "球体トラッキング", titleEs = "Seguimiento Esférico",
            descKo = "벽면을 튕기며 불규칙하게 반사되는 고속 볼 표적을 연속 사격.",
            descEn = "Strike high-speed balls bouncing erratically off range boundaries.",
            descJa = "壁を跳ね返り不規則に反射する高速ボール標的を連続射撃。",
            descEs = "Dispara a bolas rápidas que rebotan por los bordes del campo.",
            targetScore = 6500, stageTime = 30f,
            setupMode = (p) => {
                p.spawnInterval = 0.6f; p.maxConcurrentTargets = 5; p.targetBaseRadius = 0.45f;
                p.allowBombs = false; p.allowMoving = true; p.allowParabolic = false; p.allowGold = false; p.isBossStage = false;
            }
        });

        stages.Add(new StageData
        {
            id = 8,
            titleKo = "골드 러시", titleEn = "Shrinking Gold Rush", titleJa = "ゴールドラッシュ", titleEs = "Fiebre del Oro",
            descKo = "황금 보너스 표적이 급격히 축소됩니다. 신속하게 타격해 대량 득점!",
            descEn = "Golden bonus targets rapidly shrink. Strike quickly for massive scores!",
            descJa = "黄金ボーナス標的が急激に縮小します。素早く撃ち抜き大量得点！",
            descEs = "¡Los blancos dorados encogen rápido! ¡Aciértalos para puntos masivos!",
            targetScore = 7800, stageTime = 30f,
            setupMode = (p) => {
                p.spawnInterval = 0.55f; p.maxConcurrentTargets = 5; p.targetBaseRadius = 0.5f;
                p.allowBombs = false; p.allowMoving = false; p.allowParabolic = false; p.allowGold = true; p.isBossStage = false;
            }
        });

        stages.Add(new StageData
        {
            id = 9,
            titleKo = "카오스 스웜", titleEn = "Chaos Swarm", titleJa = "カオス・スワーム", titleEs = "Enjambre Caótico",
            descKo = "8개 이상 표적이 동시 스폰! 폭탄과 일반 표적이 뒤섞인 난전.",
            descEn = "Over 8 simultaneous targets! Intense chaotic swarm with bombs and gliders.",
            descJa = "8個以上の標的が同時出現！爆弾と通常標的が入り乱れる大乱戦。",
            descEs = "¡Más de 8 blancos simultáneos! Enjambre caótico de bombas y planeadores.",
            targetScore = 9200, stageTime = 30f,
            setupMode = (p) => {
                p.spawnInterval = 0.4f; p.maxConcurrentTargets = 8; p.targetBaseRadius = 0.45f;
                p.allowBombs = true; p.allowMoving = true; p.allowParabolic = false; p.allowGold = true; p.isBossStage = false;
            }
        });

        stages.Add(new StageData
        {
            id = 10,
            titleKo = "사이버 보스: 사이버의 눈", titleEn = "Boss: Eye of Cyber", titleJa = "ボス：サイバーの瞳", titleEs = "Jefe: Ojo Ciber",
            descKo = "HP 12의 거대 보스 코어 출현! 주변 회전 드론을 뚫고 코어를 파괴하라.",
            descEn = "Massive Boss Core with 12 HP! Penetrate orbiting shield drones and destroy the eye.",
            descJa = "HP 12の巨大ボスコア出現！旋回ドローンを突破し瞳のコアを粉砕せよ。",
            descEs = "¡Núcleo Jefe masivo de 12 HP! Traspasa drones escudo y destruye el núcleo.",
            targetScore = 11000, stageTime = 35f,
            setupMode = (p) => {
                p.spawnInterval = 1.0f; p.maxConcurrentTargets = 4; p.targetBaseRadius = 0.45f;
                p.allowBombs = false; p.allowMoving = false; p.allowParabolic = false; p.allowGold = false; p.isBossStage = true;
            }
        });

        stages.Add(new StageData
        {
            id = 11,
            titleKo = "하이퍼 시냅스 아레나", titleEn = "Hyper Synapse Arena", titleJa = "ハイパー・シナプス", titleEs = "Arena Hiper Sináptica",
            descKo = "이동+축소+포물선+폭탄의 극한 융합. 인간 반사신경의 한계에 도전.",
            descEn = "Ultimate fusion of moving, shrinking, clays, and bombs. Test human reflex limits.",
            descJa = "移動＋縮小＋放物線＋爆弾の極限融合。人間の反射神経の限界へ挑め。",
            descEs = "Fusión definitiva de movimiento, reducción, platos y bombas.",
            targetScore = 13500, stageTime = 30f,
            setupMode = (p) => {
                p.spawnInterval = 0.35f; p.maxConcurrentTargets = 7; p.targetBaseRadius = 0.42f;
                p.allowBombs = true; p.allowMoving = true; p.allowParabolic = true; p.allowGold = true; p.isBossStage = false;
            }
        });

        stages.Add(new StageData
        {
            id = 12,
            titleKo = "그랜드 마스터 스나이퍼", titleEn = "Grand Master Sniper", titleJa = "グランドマスタースナイパー", titleEs = "Gran Maestro Francotirador",
            descKo = "12단계 최종 결전! 전설의 FPS 에임 마스터를 향한 궁극의 시험.",
            descEn = "Stage 12 Grand Finale! The ultimate test for the legendary FPS aim master.",
            descJa = "ステージ12最終決戦！伝説のFPSエイムマスターへの道。",
            descEs = "¡Gran Final de la Etapa 12! La prueba suprema del maestro de puntería.",
            targetScore = 16000, stageTime = 35f,
            setupMode = (p) => {
                p.spawnInterval = 0.32f; p.maxConcurrentTargets = 8; p.targetBaseRadius = 0.4f;
                p.allowBombs = true; p.allowMoving = true; p.allowParabolic = true; p.allowGold = true; p.isBossStage = true;
            }
        });
    }

    private void StartStage(int stageIdx)
    {
        currentStageIndex = Mathf.Clamp(stageIdx, 0, stages.Count - 1);
        var st = stages[currentStageIndex];
        stageTimer = st.stageTime;
        score = 0;
        shotsFired = 0;
        shotsHit = 0;
        combo = 0;
        maxCombo = 0;
        reactionTimes.Clear();
        isGameOver = false;
        isVictory = false;

        // Cleanup
        foreach (var t in targets) if (t.go != null) Destroy(t.go);
        targets.Clear();

        foreach (var p in particles) if (p.go != null) Destroy(p.go);
        particles.Clear();

        st.setupMode(this);

        if (isBossStage)
        {
            SpawnBossCore();
        }

        // Spawn initial targets
        for (int i = 0; i < maxConcurrentTargets; i++)
        {
            SpawnNewTarget();
        }

        ShowToast($"{GetLocalizedStageTitle(st)} - START!");
        PlayTone(523.25f, 0.15f);
    }

    private void SpawnBossCore()
    {
        var boss = new AimTarget
        {
            position = new Vector3(0f, 0.7f, TargetPlaneZ),
            type = TargetType.BossCore,
            radius = 1.3f,
            hp = 12,
            maxHp = 12,
            lifetime = 999f,
            baseColor = new Color(0.95f, 0.15f, 0.85f),
            spawnTime = Time.time
        };

        var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
        go.name = "BossCore";
        go.transform.position = boss.position;
        go.transform.localScale = Vector3.one * (boss.radius * 2f);
        var mat = new Material(Shader.Find("Universal Render Pipeline/Unlit") ?? Shader.Find("Sprites/Default"));
        mat.color = boss.baseColor;
        go.GetComponent<MeshRenderer>().material = mat;
        boss.go = go;

        targets.Add(boss);
    }

    private void Update()
    {
        UpdateCrosshairPosition();
        UpdateCameraShake();

        if (isGameOver || isVictory || showStageSelect) return;

        HandleShootingInput();
        UpdateTargets();
        UpdateParticles();

        stageTimer -= Time.deltaTime;
        if (toastTimer > 0f) toastTimer -= Time.deltaTime;

        // Spawn timer
        spawnCooldown -= Time.deltaTime;
        if (spawnCooldown <= 0f && targets.Count < maxConcurrentTargets)
        {
            SpawnNewTarget();
            spawnCooldown = spawnInterval;
        }

        // Check Stage End
        if (stageTimer <= 0f)
        {
            var st = stages[currentStageIndex];
            if (score >= st.targetScore)
            {
                isVictory = true;
                PlayTone(880f, 0.4f);
                ShowToast(GetLocalizedText("STAGE CLEAR!", "스테이지 클리어!", "ステージクリア！", "¡ETAPA SUPERADA!"));
            }
            else
            {
                isGameOver = true;
                PlayTone(146.83f, 0.35f);
                ShowToast(GetLocalizedText("TIME UP! SCORE DEFICIT", "시간 초과! 목표 점수 미달", "タイムアップ！目標未達", "¡TIEMPO AGOTADO!"));
            }
        }
    }

    private void UpdateCrosshairPosition()
    {
        Ray ray = mainCam.ScreenPointToRay(Input.mousePosition);
        Plane plane = new Plane(Vector3.forward, new Vector3(0f, 0f, TargetPlaneZ - 0.2f));
        if (plane.Raycast(ray, out float enter))
        {
            aimWorldPos = ray.GetPoint(enter);
            if (crosshairGo != null)
            {
                crosshairGo.transform.position = aimWorldPos;
                if (recoilSpread > 0f)
                {
                    recoilSpread -= Time.deltaTime * 3f;
                    crosshairGo.transform.localScale = Vector3.one * (1f + recoilSpread * 0.4f);
                }
                else
                {
                    crosshairGo.transform.localScale = Vector3.one;
                }
            }
        }
    }

    private void HandleShootingInput()
    {
        if (Input.GetMouseButtonDown(0))
        {
            Shoot();
        }
    }

    private void Shoot()
    {
        shotsFired++;
        recoilSpread = 1.0f;
        shakeTrauma = Mathf.Max(shakeTrauma, 0.15f);
        PlayTone(600f, 0.05f); // Gunshot click

        // Zero-Collider Raycast check against targets
        bool hitSomething = false;
        AimTarget hitTarget = null;
        float closestDist = float.MaxValue;

        for (int i = targets.Count - 1; i >= 0; i--)
        {
            var t = targets[i];
            if (!t.isAlive) continue;

            float distToCenter = Vector2.Distance(new Vector2(aimWorldPos.x, aimWorldPos.y), new Vector2(t.position.x, t.position.y));
            if (distToCenter <= t.radius)
            {
                if (distToCenter < closestDist)
                {
                    closestDist = distToCenter;
                    hitTarget = t;
                    hitSomething = true;
                }
            }
        }

        if (hitSomething && hitTarget != null)
        {
            OnTargetHit(hitTarget, closestDist);
        }
        else
        {
            // Miss
            combo = 0;
            PlayTone(200f, 0.05f); // Miss dull blip
        }
    }

    private void OnTargetHit(AimTarget t, float distFromCenter)
    {
        shotsHit++;
        combo++;
        if (combo > maxCombo) maxCombo = combo;

        int reactionMs = (int)((Time.time - t.spawnTime) * 1000f);
        reactionTimes.Add(reactionMs);

        if (t.type == TargetType.Bomb)
        {
            // Hit a bomb decoy!
            score = Mathf.Max(0, score - 500);
            combo = 0;
            shakeTrauma = 0.5f;
            PlayTone(110f, 0.3f); // Boom
            SpawnDebris(t.position, Color.red, 18);
            ShowToast("BOMB HIT! -500");
            DestroyTarget(t);
            return;
        }

        // Bullseye calculation
        bool isBullseye = (distFromCenter < t.radius * 0.35f);
        int basePts = isBullseye ? 150 : 100;
        if (t.type == TargetType.Gold) basePts = 300;

        float comboMultiplier = 1f + (combo * 0.1f);
        int gainedPts = (int)(basePts * comboMultiplier);
        score += gainedPts;

        // Visual and Audio feedback
        shakeTrauma = Mathf.Max(shakeTrauma, 0.2f);
        PlayTone(isBullseye ? 880f : 700f, 0.08f); // High-pitched ping
        SpawnDebris(t.position, t.baseColor, 12);

        if (isBullseye)
        {
            ShowToast($"★ BULLSEYE! {reactionMs}ms (+{gainedPts}) ★");
        }
        else
        {
            ShowToast($"HIT! {reactionMs}ms (+{gainedPts})");
        }

        t.hp--;
        if (t.hp <= 0)
        {
            DestroyTarget(t);
        }
        else
        {
            // Dim boss color
            if (t.go != null)
            {
                var rend = t.go.GetComponent<MeshRenderer>();
                if (rend != null) rend.material.color = Color.Lerp(Color.white, t.baseColor, (float)t.hp / t.maxHp);
            }
        }
    }

    private void DestroyTarget(AimTarget t)
    {
        t.isAlive = false;
        if (t.go != null) Destroy(t.go);
        targets.Remove(t);
    }

    private void SpawnNewTarget()
    {
        var target = new AimTarget();
        target.spawnTime = Time.time;
        target.position = new Vector3(
            UnityEngine.Random.Range(ArenaMinX + 0.6f, ArenaMaxX - 0.6f),
            UnityEngine.Random.Range(ArenaMinY + 0.6f, ArenaMaxY - 0.6f),
            TargetPlaneZ
        );
        target.radius = targetBaseRadius;
        target.lifetime = UnityEngine.Random.Range(2.0f, 2.8f);

        // Determine Type
        float roll = UnityEngine.Random.value;
        if (allowBombs && roll < 0.18f)
        {
            target.type = TargetType.Bomb;
            target.baseColor = new Color(0.2f, 0.2f, 0.25f); // Black skull
        }
        else if (allowGold && roll < 0.35f)
        {
            target.type = TargetType.Gold;
            target.baseColor = new Color(1.0f, 0.85f, 0.1f); // Gold
            target.isShrinking = true;
            target.lifetime = 1.8f;
        }
        else if (allowParabolic && roll < 0.55f)
        {
            target.type = TargetType.Parabolic;
            target.baseColor = new Color(1.0f, 0.45f, 0.15f); // Clay Orange
            target.position.y = ArenaMinY + 0.2f;
            target.velocity = new Vector3(UnityEngine.Random.Range(-2.5f, 2.5f), UnityEngine.Random.Range(5.5f, 7.5f), 0f);
        }
        else if (allowMoving && roll < 0.75f)
        {
            target.type = TargetType.Moving;
            target.baseColor = new Color(0.2f, 0.85f, 1.0f); // Cyan
            target.velocity = new Vector3(UnityEngine.Random.value > 0.5f ? 3.0f : -3.0f, 0f, 0f);
        }
        else
        {
            target.type = TargetType.Standard;
            target.baseColor = new Color(0.95f, 0.2f, 0.3f); // Red Bullseye
        }

        // 3D Visual Mesh
        var go = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        go.name = "Target_" + target.type;
        go.transform.position = target.position;
        go.transform.localScale = new Vector3(target.radius * 2f, 0.05f, target.radius * 2f);
        go.transform.rotation = Quaternion.Euler(90f, 0f, 0f);
        var mat = new Material(Shader.Find("Universal Render Pipeline/Unlit") ?? Shader.Find("Sprites/Default"));
        mat.color = target.baseColor;
        go.GetComponent<MeshRenderer>().material = mat;
        target.go = go;

        targets.Add(target);
    }

    private void UpdateTargets()
    {
        for (int i = targets.Count - 1; i >= 0; i--)
        {
            var t = targets[i];
            t.currentLife += Time.deltaTime;

            if (t.type == TargetType.Moving)
            {
                t.position += t.velocity * Time.deltaTime;
                if (t.position.x < ArenaMinX + t.radius)
                {
                    t.position.x = ArenaMinX + t.radius;
                    t.velocity.x = Mathf.Abs(t.velocity.x);
                }
                else if (t.position.x > ArenaMaxX - t.radius)
                {
                    t.position.x = ArenaMaxX - t.radius;
                    t.velocity.x = -Mathf.Abs(t.velocity.x);
                }
            }
            else if (t.type == TargetType.Parabolic)
            {
                t.position += t.velocity * Time.deltaTime;
                t.velocity.y -= 9.8f * Time.deltaTime; // Gravity
            }

            if (t.isShrinking)
            {
                float shrinkScale = Mathf.Max(0.1f, 1f - (t.currentLife / t.lifetime));
                t.radius = targetBaseRadius * shrinkScale;
            }

            if (t.go != null)
            {
                t.go.transform.position = t.position;
                t.go.transform.localScale = new Vector3(t.radius * 2f, 0.05f, t.radius * 2f);
            }

            // Lifetime expiration
            if (t.currentLife >= t.lifetime && t.type != TargetType.BossCore)
            {
                if (t.type != TargetType.Bomb)
                {
                    // Target expired without being hit (resets combo)
                    combo = 0;
                }
                DestroyTarget(t);
            }
        }
    }

    private void SpawnDebris(Vector3 pos, Color col, int count)
    {
        for (int i = 0; i < count; i++)
        {
            var p = new ParticleDebris
            {
                position = pos,
                velocity = new Vector3(UnityEngine.Random.Range(-4f, 4f), UnityEngine.Random.Range(-4f, 4f), UnityEngine.Random.Range(-2f, 2f)),
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
            shakeTrauma -= Time.deltaTime * 2.0f;
            float shake = shakeTrauma * shakeTrauma * 0.25f;
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
        toastTimer = 2.0f;
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
        GUILayout.BeginArea(new Rect(10, 10, Screen.width - 20, 65));
        GUILayout.BeginHorizontal();

        // Title and Stage
        GUILayout.BeginVertical();
        GUILayout.Label($"<b>AIM TRAINER 3D</b> · STAGE {currentStageIndex + 1}/{stages.Count}", GetLabelStyle(16, Color.cyan));
        var st = stages[currentStageIndex];
        GUILayout.Label(GetLocalizedStageTitle(st), GetLabelStyle(12, Color.white));
        GUILayout.EndVertical();

        GUILayout.FlexibleSpace();

        // Score & Time & Accuracy
        float accuracy = shotsFired > 0 ? ((float)shotsHit / shotsFired) * 100f : 100f;
        int avgReaction = reactionTimes.Count > 0 ? (int)(GetSum(reactionTimes) / reactionTimes.Count) : 0;

        GUILayout.BeginVertical();
        GUILayout.Label($"{GetLocalizedText("SCORE", "점수", "スコア", "PUNTOS")}: <b>{score} / {st.targetScore}</b> · TIME: <b>{Mathf.Max(0, (int)stageTimer)}s</b>", GetLabelStyle(13, Color.yellow));
        string comboStr = combo > 1 ? $" <color=#ff8800>({combo}x COMBO!)</color>" : "";
        GUILayout.Label($"{GetLocalizedText("ACC", "정확도", "命中率", "PRECISIÓN")}: <b>{accuracy:F1}%</b> · REACTION: <b>{avgReaction}ms</b>{comboStr}", GetLabelStyle(12, Color.white));
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

        // Crosshair Guidance
        GUI.Label(new Rect(10, Screen.height - 35, Screen.width - 20, 25),
            GetLocalizedText(
                "조작: [마우스 클릭: 정밀 사격] · 표적 중심 저격 시 불스아이 보너스 획득",
                "Controls: [Mouse Click: Precision Fire] · Hit target centers for Bullseye bonus",
                "操作: [マウスクリック: 精密射撃] · 的の中心射撃でブルズアイボーナス獲得",
                "Controles: [Clic: Fuego de Precisión] · Acierta al centro para bonificación de diana"),
            GetLabelStyle(12, Color.gray));
    }

    private float GetSum(List<int> list)
    {
        float sum = 0f;
        for (int i = 0; i < list.Count; i++) sum += list[i];
        return sum;
    }

    private void DrawStageSelectModal()
    {
        GUI.Box(new Rect(0, 0, Screen.width, Screen.height), "");
        float w = Mathf.Min(650, Screen.width - 40);
        float h = Mathf.Min(480, Screen.height - 40);
        Rect rect = new Rect((Screen.width - w) * 0.5f, (Screen.height - h) * 0.5f, w, h);

        GUI.Box(rect, $"<b>{GetLocalizedText("SELECT STAGE", "스테이지 선택", "ステージ選択", "SELECCIONAR ETAPA")} (1~12)</b>");

        GUILayout.BeginArea(new Rect(rect.x + 20, rect.y + 40, rect.width - 40, rect.height - 50));
        GUILayout.Label(GetLocalizedText("12개 에임 트레이너 사격장 중 도전할 스테이지를 선택하세요.", "Select from 12 shooting range training formations.", "12のエイム訓練射撃場から挑戦を選択してください。", "Selecciona entre 12 campos de entrenamiento de tiro."), GetLabelStyle(12, Color.gray));

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
        float h = 290;
        Rect rect = new Rect((Screen.width - w) * 0.5f, (Screen.height - h) * 0.5f, w, h);

        GUI.Box(rect, $"<b>🏆 {GetLocalizedText("STAGE CLEAR!", "스테이지 클리어!", "ステージクリア！", "¡ETAPA SUPERADA!")}</b>");

        GUILayout.BeginArea(new Rect(rect.x + 20, rect.y + 40, rect.width - 40, rect.height - 50));
        GUILayout.Label($"{GetLocalizedText("스테이지", "Stage", "ステージ", "Etapa")} {currentStageIndex + 1} {GetLocalizedStageTitle(stages[currentStageIndex])}", GetLabelStyle(15, Color.green));
        GUILayout.Space(8);
        float accuracy = shotsFired > 0 ? ((float)shotsHit / shotsFired) * 100f : 100f;
        int avgReaction = reactionTimes.Count > 0 ? (int)(GetSum(reactionTimes) / reactionTimes.Count) : 0;

        GUILayout.Label($"{GetLocalizedText("최종 점수", "Final Score", "最終スコア", "Puntuación Final")}: <b>{score}</b>", GetLabelStyle(14, Color.white));
        GUILayout.Label($"{GetLocalizedText("사격 정확도", "Accuracy", "命中率", "Precisión")}: <b>{accuracy:F1}%</b> · REACTION: <b>{avgReaction}ms</b>", GetLabelStyle(13, Color.yellow));
        GUILayout.Label($"{GetLocalizedText("최대 콤보", "Max Combo", "最大コンボ", "Combo Máximo")}: <b>{maxCombo}x</b>", GetLabelStyle(13, Color.cyan));

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
            if (GUILayout.Button(GetLocalizedText("스나이퍼 피날레 완료! (다시하기)", "Grand Master Completed! (Restart)", "スナイパー制覇達成！（再挑戦）", "¡Gran Maestro Completado!"), GUILayout.Height(44)))
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
        GUILayout.Label(GetLocalizedText("목표 점수에 도달하지 못했습니다!", "Target score was not reached in time!", "制限時間内に目標スコアへ届きませんでした！", "¡No se alcanzó la puntuación objetivo a tiempo!"), GetLabelStyle(14, Color.red));
        GUILayout.Space(8);
        GUILayout.Label($"{GetLocalizedText("달성 점수", "Reached Score", "スコア", "Puntuación")}: <b>{score}</b> / {stages[currentStageIndex].targetScore}", GetLabelStyle(14, Color.white));

        GUILayout.Space(15);
        GUILayout.BeginHorizontal();
        if (GUILayout.Button(GetLocalizedText("다시 도전", "Retry", "リトライ", "Reintentar"), GUILayout.Height(44)))
        {
            StartStage(currentStageIndex);
        }
        if (GUILayout.Button(GetLocalizedText("스테이지 선택", "Stage Select", "ステージ選択", "Elegir Etapa"), GUILayout.Height(44)))
        {
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
