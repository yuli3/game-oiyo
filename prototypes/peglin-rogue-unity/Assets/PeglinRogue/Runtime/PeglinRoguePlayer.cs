using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class PeglinRoguePlayer : MonoBehaviour
{
    public enum PegType { Normal, Crit, Refresh, Bomb, Bumper }

    public class PegData
    {
        public int id;
        public Vector3 pos;
        public PegType type;
        public bool isHit;
        public float radius;
        public GameObject go;
        public Material mat;
        public Color baseColor;
    }

    public class StageDef
    {
        public int stageNum;
        public string name;
        public string titleKo;
        public int maxHp;
        public int attack;
        public int shield;
        public int turnsToAttack;
        public Color bossColor;
        public bool isBoss;
    }

    // Camera & Visuals
    private Camera mainCam;
    private Light dirLight;

    // Game Board Dimensions
    private const float BoardWidth = 10.0f;
    private const float BoardHeight = 13.0f;
    private const float HalfW = BoardWidth * 0.5f; // -5 to +5
    private const float HalfH = BoardHeight * 0.5f; // -6.5 to +6.5
    private readonly Vector3 CannonPos = new Vector3(0f, 5.8f, 0f);

    // Ball Physics
    private Vector3 ballPos;
    private Vector3 ballVel;
    private const float BallRadius = 0.28f;
    private const float Gravity = -22.0f;
    private const float Elasticity = 0.84f;
    private bool isBallActive = false;
    private GameObject ballGo;
    private Material ballMat;

    // Cannon & Aiming
    private float aimAngleDeg = 270f; // pointing straight down
    private GameObject cannonBaseGo;
    private GameObject cannonBarrelGo;
    private List<GameObject> trajectoryDots = new List<GameObject>();

    // Pegs
    private List<PegData> pegs = new List<PegData>();
    private Material normalPegMat;
    private Material critPegMat;
    private Material refreshPegMat;
    private Material bombPegMat;
    private Material bumperPegMat;
    private Material hitPegMat;

    // Bottom Catch Buckets
    private struct Bucket
    {
        public float minX;
        public float maxX;
        public float multiplier;
        public string label;
        public Color color;
    }
    private Bucket[] buckets;
    private List<GameObject> bucketDividers = new List<GameObject>();

    // RPG Combat & Stats
    private int playerHp = 100;
    private int maxPlayerHp = 100;
    private int playerShield = 0;
    private int currentStageIdx = 0; // 0 to 11 (12 stages)

    private int enemyHp;
    private int enemyMaxHp;
    private int enemyShield;
    private int turnsUntilEnemyAttack;
    private GameObject enemyGo;
    private Material enemyMat;
    private Vector3 enemyBasePos = new Vector3(3.8f, 5.0f, -0.5f);
    private float enemyShakeTimer = 0f;

    // Turn Accumulators
    private int turnHits = 0;
    private int turnBaseDamage = 0;
    private bool isCritActive = false;
    private int totalScore = 0;
    private int comboCount = 0;

    // UI & State
    public enum GameState { Aiming, BallRolling, TurnResolving, StageClear, GameOver }
    private GameState state = GameState.Aiming;
    private bool showStageSelect = false;
    private string bannerMessage = "";
    private float bannerTimer = 0f;
    private float screenShakeTrauma = 0f;

    // Floating text pops
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
    private AudioClip sndShoot;
    private AudioClip sndCrit;
    private AudioClip sndRefresh;
    private AudioClip sndBomb;
    private AudioClip sndJackpot;
    private AudioClip sndEnemyHurt;
    private AudioClip sndPlayerHurt;
    private AudioClip sndVictory;
    private AudioClip[] sndPegChimes;

    // 12 Mandatory Stages (User Rule: At least 10 stages)
    private StageDef[] stages = new StageDef[]
    {
        new StageDef { stageNum = 1, name = "Jelly Slime", titleKo = "숲의 젤리 슬라임", maxHp = 120, attack = 8, shield = 0, turnsToAttack = 3, bossColor = new Color(0.2f, 0.85f, 0.3f), isBoss = false },
        new StageDef { stageNum = 2, name = "Goblin Scout", titleKo = "고블린 척후병", maxHp = 220, attack = 14, shield = 0, turnsToAttack = 3, bossColor = new Color(0.4f, 0.75f, 0.2f), isBoss = false },
        new StageDef { stageNum = 3, name = "Boar Charger", titleKo = "성난 멧돼지 돌진수", maxHp = 350, attack = 20, shield = 0, turnsToAttack = 2, bossColor = new Color(0.7f, 0.45f, 0.25f), isBoss = false },
        new StageDef { stageNum = 4, name = "Vampire Bat", titleKo = "동굴 흡혈 박쥐 무리", maxHp = 480, attack = 25, shield = 0, turnsToAttack = 3, bossColor = new Color(0.55f, 0.2f, 0.7f), isBoss = false },
        new StageDef { stageNum = 5, name = "Forest Troll [MID BOSS]", titleKo = "고대 숲의 트롤 [중간보스]", maxHp = 780, attack = 35, shield = 50, turnsToAttack = 2, bossColor = new Color(0.3f, 0.6f, 0.4f), isBoss = true },
        new StageDef { stageNum = 6, name = "Skeleton Knight", titleKo = "방패 해골 근위대장", maxHp = 680, attack = 30, shield = 150, turnsToAttack = 3, bossColor = new Color(0.85f, 0.85f, 0.75f), isBoss = false },
        new StageDef { stageNum = 7, name = "Lava Salamander", titleKo = "용암 도롱뇽", maxHp = 920, attack = 40, shield = 0, turnsToAttack = 3, bossColor = new Color(0.95f, 0.4f, 0.1f), isBoss = false },
        new StageDef { stageNum = 8, name = "Shadow Necromancer", titleKo = "그림자 강령술사", maxHp = 1150, attack = 45, shield = 100, turnsToAttack = 2, bossColor = new Color(0.35f, 0.1f, 0.5f), isBoss = false },
        new StageDef { stageNum = 9, name = "Rune Guardian Golem", titleKo = "고대 룬 수호 골렘", maxHp = 1550, attack = 55, shield = 250, turnsToAttack = 3, bossColor = new Color(0.15f, 0.75f, 0.85f), isBoss = false },
        new StageDef { stageNum = 10, name = "Crimson Wyrm [FINAL BOSS]", titleKo = "진홍빛 화룡 드래곤 [최종보스]", maxHp = 2300, attack = 75, shield = 200, turnsToAttack = 2, bossColor = new Color(0.9f, 0.15f, 0.15f), isBoss = true },
        new StageDef { stageNum = 11, name = "Void Behemoth [SECRET]", titleKo = "심연의 공허 베히모스 [시크릿]", maxHp = 3400, attack = 95, shield = 350, turnsToAttack = 2, bossColor = new Color(0.2f, 0.05f, 0.35f), isBoss = true },
        new StageDef { stageNum = 12, name = "Celestial Arbiter [MASTER]", titleKo = "천상의 중재자 대심판 [마스터]", maxHp = 5200, attack = 125, shield = 500, turnsToAttack = 2, bossColor = new Color(0.95f, 0.85f, 0.3f), isBoss = true }
    };

    void Awake()
    {
        SetupCameraAndLighting();
        CreateMaterials();
        BuildAudioClips();
        BuildBoardStructure();
        BuildCannonAndBall();
        InitStage(0);
    }

    void SetupCameraAndLighting()
    {
        var camGo = new GameObject("Main Camera");
        camGo.tag = "MainCamera";
        mainCam = camGo.AddComponent<Camera>();
        mainCam.clearFlags = CameraClearFlags.SolidColor;
        mainCam.backgroundColor = new Color(0.06f, 0.09f, 0.16f); // dark slate blue
        camGo.transform.position = new Vector3(0f, 0f, -14.5f);
        camGo.transform.rotation = Quaternion.identity;
        mainCam.fieldOfView = 56f;

        var lightGo = new GameObject("DirLight");
        dirLight = lightGo.AddComponent<Light>();
        dirLight.type = LightType.Directional;
        dirLight.color = new Color(0.95f, 0.95f, 1.0f);
        dirLight.intensity = 1.25f;
        lightGo.transform.rotation = Quaternion.Euler(45f, -30f, 0f);

        audioSource = gameObject.AddComponent<AudioSource>();
        audioSource.playOnAwake = false;
    }

    void CreateMaterials()
    {
        normalPegMat = CreateEmissiveMat(new Color(0.15f, 0.7f, 0.95f));
        critPegMat = CreateEmissiveMat(new Color(1.0f, 0.85f, 0.15f));
        refreshPegMat = CreateEmissiveMat(new Color(0.2f, 0.95f, 0.4f));
        bombPegMat = CreateEmissiveMat(new Color(1.0f, 0.25f, 0.15f));
        bumperPegMat = CreateEmissiveMat(new Color(0.85f, 0.3f, 0.95f));
        hitPegMat = CreateEmissiveMat(new Color(0.25f, 0.3f, 0.4f));
    }

    Material CreateEmissiveMat(Color c)
    {
        var mat = new Material(Shader.Find("Sprites/Default"));
        mat.color = c;
        return mat;
    }

    void BuildBoardStructure()
    {
        // Board Background Frame
        var bg = GameObject.CreatePrimitive(PrimitiveType.Quad);
        bg.name = "BoardBG";
        bg.transform.position = new Vector3(0f, 0f, 0.5f);
        bg.transform.localScale = new Vector3(BoardWidth + 0.4f, BoardHeight + 0.4f, 1f);
        bg.GetComponent<MeshRenderer>().material = CreateEmissiveMat(new Color(0.08f, 0.12f, 0.22f));

        // Side Walls
        var leftWall = GameObject.CreatePrimitive(PrimitiveType.Cube);
        leftWall.name = "LeftWall";
        leftWall.transform.position = new Vector3(-HalfW - 0.25f, 0f, 0f);
        leftWall.transform.localScale = new Vector3(0.5f, BoardHeight + 1.0f, 1.0f);
        leftWall.GetComponent<MeshRenderer>().material = CreateEmissiveMat(new Color(0.2f, 0.3f, 0.5f));

        var rightWall = GameObject.CreatePrimitive(PrimitiveType.Cube);
        rightWall.name = "RightWall";
        rightWall.transform.position = new Vector3(HalfW + 0.25f, 0f, 0f);
        rightWall.transform.localScale = new Vector3(0.5f, BoardHeight + 1.0f, 1.0f);
        rightWall.GetComponent<MeshRenderer>().material = CreateEmissiveMat(new Color(0.2f, 0.3f, 0.5f));

        var topWall = GameObject.CreatePrimitive(PrimitiveType.Cube);
        topWall.name = "TopWall";
        topWall.transform.position = new Vector3(0f, HalfH + 0.25f, 0f);
        topWall.transform.localScale = new Vector3(BoardWidth + 1.0f, 0.5f, 1.0f);
        topWall.GetComponent<MeshRenderer>().material = CreateEmissiveMat(new Color(0.2f, 0.3f, 0.5f));

        // Bottom Buckets (5 multiplier slots)
        buckets = new Bucket[]
        {
            new Bucket { minX = -5.0f, maxX = -3.0f, multiplier = 1.5f, label = "x1.5", color = new Color(0.3f, 0.7f, 1f) },
            new Bucket { minX = -3.0f, maxX = -1.0f, multiplier = 2.0f, label = "x2.0", color = new Color(0.5f, 0.9f, 0.3f) },
            new Bucket { minX = -1.0f, maxX = 1.0f,  multiplier = 5.0f, label = "★ x5 JACKPOT ★", color = new Color(1.0f, 0.85f, 0.1f) },
            new Bucket { minX = 1.0f,  maxX = 3.0f,  multiplier = 2.0f, label = "x2.0", color = new Color(0.5f, 0.9f, 0.3f) },
            new Bucket { minX = 3.0f,  maxX = 5.0f,  multiplier = 1.5f, label = "x1.5", color = new Color(0.3f, 0.7f, 1f) }
        };

        // Bucket Dividers
        float[] divX = new float[] { -3.0f, -1.0f, 1.0f, 3.0f };
        for (int i = 0; i < divX.Length; i++)
        {
            var div = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            div.name = "BucketDiv_" + i;
            div.transform.position = new Vector3(divX[i], -HalfH + 0.6f, 0f);
            div.transform.localScale = new Vector3(0.25f, 0.7f, 0.25f);
            div.GetComponent<MeshRenderer>().material = CreateEmissiveMat(new Color(0.9f, 0.9f, 0.95f));
            bucketDividers.Add(div);
        }

        // Enemy Model on Top Side
        enemyGo = GameObject.CreatePrimitive(PrimitiveType.Capsule);
        enemyGo.name = "EnemyBoss";
        enemyGo.transform.position = enemyBasePos;
        enemyGo.transform.localScale = new Vector3(1.2f, 1.2f, 1.2f);
        enemyMat = CreateEmissiveMat(Color.green);
        enemyGo.GetComponent<MeshRenderer>().material = enemyMat;
    }

    void BuildCannonAndBall()
    {
        // Cannon Base
        cannonBaseGo = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        cannonBaseGo.name = "CannonBase";
        cannonBaseGo.transform.position = CannonPos;
        cannonBaseGo.transform.localScale = new Vector3(0.9f, 0.9f, 0.9f);
        cannonBaseGo.GetComponent<MeshRenderer>().material = CreateEmissiveMat(new Color(0.85f, 0.6f, 0.1f));

        // Cannon Barrel
        cannonBarrelGo = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        cannonBarrelGo.name = "CannonBarrel";
        cannonBarrelGo.transform.SetParent(cannonBaseGo.transform, false);
        cannonBarrelGo.transform.localPosition = new Vector3(0f, -0.6f, 0f);
        cannonBarrelGo.transform.localScale = new Vector3(0.35f, 0.6f, 0.35f);
        cannonBarrelGo.GetComponent<MeshRenderer>().material = CreateEmissiveMat(new Color(0.3f, 0.35f, 0.45f));

        // Ball
        ballGo = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        ballGo.name = "PachinkoBall";
        ballGo.transform.localScale = Vector3.one * (BallRadius * 2.0f);
        ballMat = CreateEmissiveMat(new Color(1f, 0.95f, 0.8f));
        ballGo.GetComponent<MeshRenderer>().material = ballMat;
        ballGo.SetActive(false);

        // Trajectory preview dots (10 dots)
        for (int i = 0; i < 12; i++)
        {
            var dot = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            dot.name = "TrajDot_" + i;
            dot.transform.localScale = Vector3.one * (0.12f - i * 0.005f);
            dot.GetComponent<MeshRenderer>().material = CreateEmissiveMat(new Color(1f, 0.9f, 0.3f, 0.8f));
            dot.SetActive(false);
            trajectoryDots.Add(dot);
        }
    }

    public void InitStage(int stageIdx)
    {
        currentStageIdx = Mathf.Clamp(stageIdx, 0, stages.Length - 1);
        var s = stages[currentStageIdx];

        enemyMaxHp = s.maxHp;
        enemyHp = s.maxHp;
        enemyShield = s.shield;
        turnsUntilEnemyAttack = s.turnsToAttack;

        enemyMat.color = s.bossColor;
        enemyGo.transform.localScale = s.isBoss ? new Vector3(1.6f, 1.6f, 1.6f) : new Vector3(1.2f, 1.2f, 1.2f);

        state = GameState.Aiming;
        turnHits = 0;
        turnBaseDamage = 0;
        isCritActive = false;
        comboCount = 0;
        isBallActive = false;
        ballGo.SetActive(false);

        ShowBanner("STAGE " + s.stageNum + ": " + s.titleKo + "!", 2.5f);
        GeneratePegsForStage(s.stageNum);
    }

    void GeneratePegsForStage(int stageNum)
    {
        // Clean up existing pegs
        foreach (var p in pegs)
        {
            if (p.go != null) Destroy(p.go);
        }
        pegs.Clear();

        // Staggered grid configuration
        int rows = 8;
        int cols = 9;
        float startY = 4.2f;
        float spacingY = 1.05f;
        float startX = -3.8f;
        float spacingX = 0.95f;

        System.Random rng = new System.Random(1000 + stageNum * 37);

        int pegId = 0;
        for (int r = 0; r < rows; r++)
        {
            float rowOffset = (r % 2 == 1) ? (spacingX * 0.5f) : 0f;
            float y = startY - r * spacingY;

            for (int c = 0; c < cols; c++)
            {
                float x = startX + c * spacingX + rowOffset;
                if (Mathf.Abs(x) > HalfW - 0.7f) continue;

                // Special Peg placement logic
                PegType type = PegType.Normal;
                double roll = rng.NextDouble();

                if (r == 1 && (c == 2 || c == 6)) type = PegType.Crit;
                else if (r == 3 && c == 4) type = PegType.Refresh;
                else if (r == 4 && (c == 1 || c == 7)) type = PegType.Bomb;
                else if (r == 5 && c == 4) type = PegType.Bumper;
                else if (roll < 0.08) type = PegType.Crit;
                else if (roll < 0.15) type = PegType.Bomb;
                else if (roll < 0.20) type = PegType.Refresh;
                else if (roll < 0.25 && r >= 3) type = PegType.Bumper;

                CreatePeg(pegId++, new Vector3(x, y, 0f), type);
            }
        }
    }

    void CreatePeg(int id, Vector3 pos, PegType type)
    {
        var pegGo = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        pegGo.name = "Peg_" + id + "_" + type;
        pegGo.transform.position = pos;
        pegGo.transform.rotation = Quaternion.Euler(90f, 0f, 0f);

        float rad = 0.24f;
        Color col = Color.cyan;
        Material mat = normalPegMat;

        switch (type)
        {
            case PegType.Normal:
                col = new Color(0.2f, 0.75f, 1.0f);
                mat = normalPegMat;
                break;
            case PegType.Crit:
                col = new Color(1.0f, 0.85f, 0.1f);
                mat = critPegMat;
                rad = 0.26f;
                break;
            case PegType.Refresh:
                col = new Color(0.2f, 0.95f, 0.4f);
                mat = refreshPegMat;
                rad = 0.26f;
                break;
            case PegType.Bomb:
                col = new Color(1.0f, 0.25f, 0.1f);
                mat = bombPegMat;
                rad = 0.30f;
                break;
            case PegType.Bumper:
                col = new Color(0.9f, 0.35f, 1.0f);
                mat = bumperPegMat;
                rad = 0.32f;
                break;
        }

        pegGo.transform.localScale = new Vector3(rad * 2f, 0.12f, rad * 2f);
        pegGo.GetComponent<MeshRenderer>().material = mat;

        pegs.Add(new PegData
        {
            id = id,
            pos = pos,
            type = type,
            isHit = false,
            radius = rad,
            go = pegGo,
            mat = mat,
            baseColor = col
        });
    }

    void Update()
    {
        HandleCameraTrauma();
        UpdateFloatingTexts();

        if (bannerTimer > 0f) bannerTimer -= Time.deltaTime;

        if (state == GameState.Aiming)
        {
            UpdateAimingInput();
            UpdateAimTrajectory();
        }
        else if (state == GameState.BallRolling)
        {
            UpdateBallPhysics(Time.deltaTime);
        }
    }

    void HandleCameraTrauma()
    {
        if (screenShakeTrauma > 0f)
        {
            screenShakeTrauma -= Time.deltaTime * 1.6f;
            float shakeAmt = screenShakeTrauma * screenShakeTrauma * 0.35f;
            mainCam.transform.position = new Vector3(
                UnityEngine.Random.Range(-shakeAmt, shakeAmt),
                UnityEngine.Random.Range(-shakeAmt, shakeAmt),
                -14.5f
            );
        }
        else
        {
            mainCam.transform.position = new Vector3(0f, 0f, -14.5f);
        }

        if (enemyShakeTimer > 0f)
        {
            enemyShakeTimer -= Time.deltaTime;
            enemyGo.transform.position = enemyBasePos + new Vector3(
                UnityEngine.Random.Range(-0.15f, 0.15f),
                UnityEngine.Random.Range(-0.15f, 0.15f),
                0f
            );
        }
        else
        {
            enemyGo.transform.position = enemyBasePos;
        }
    }

    void UpdateAimingInput()
    {
        // Follow mouse/touch pointer
        Ray ray = mainCam.ScreenPointToRay(Input.mousePosition);
        Plane boardPlane = new Plane(Vector3.forward, Vector3.zero);
        float dist;
        if (boardPlane.Raycast(ray, out dist))
        {
            Vector3 hitPoint = ray.GetPoint(dist);
            Vector3 dir = (hitPoint - CannonPos);

            // Constrain angle downward (from 195 to 345 deg)
            float angle = Mathf.Atan2(dir.y, dir.x) * Mathf.Rad2Deg;
            if (angle < 0f) angle += 360f;

            aimAngleDeg = Mathf.Clamp(angle, 200f, 340f);
            cannonBaseGo.transform.rotation = Quaternion.Euler(0f, 0f, aimAngleDeg + 90f);
        }

        // Fire on click/tap (unless clicking GUI buttons)
        if (Input.GetMouseButtonDown(0))
        {
            if (Input.mousePosition.y < Screen.height - 130 && !showStageSelect)
            {
                FireBall();
            }
        }
    }

    void UpdateAimTrajectory()
    {
        Vector3 dir = new Vector3(Mathf.Cos(aimAngleDeg * Mathf.Deg2Rad), Mathf.Sin(aimAngleDeg * Mathf.Deg2Rad), 0f);
        Vector3 curPos = CannonPos;
        Vector3 curVel = dir * 16.0f;

        for (int i = 0; i < trajectoryDots.Count; i++)
        {
            float dt = 0.035f;
            curVel += new Vector3(0f, Gravity, 0f) * dt;
            curPos += curVel * dt;

            // Bounce off side walls
            if (curPos.x < -HalfW) { curPos.x = -HalfW; curVel.x = -curVel.x; }
            if (curPos.x > HalfW) { curPos.x = HalfW; curVel.x = -curVel.x; }

            trajectoryDots[i].SetActive(true);
            trajectoryDots[i].transform.position = curPos;
        }
    }

    void FireBall()
    {
        state = GameState.BallRolling;
        isBallActive = true;
        ballGo.SetActive(true);

        Vector3 dir = new Vector3(Mathf.Cos(aimAngleDeg * Mathf.Deg2Rad), Mathf.Sin(aimAngleDeg * Mathf.Deg2Rad), 0f);
        ballPos = CannonPos + dir * 0.7f;
        ballVel = dir * 17.5f;
        ballGo.transform.position = ballPos;

        turnHits = 0;
        turnBaseDamage = 0;
        comboCount = 0;
        isCritActive = false;

        // Hide trajectory dots
        foreach (var dot in trajectoryDots) dot.SetActive(false);

        PlayClip(sndShoot, 0.85f);
    }

    void UpdateBallPhysics(float dt)
    {
        // Sub-step physics integration for tunneling prevention
        int subSteps = 4;
        float subDt = dt / subSteps;

        for (int step = 0; step < subSteps; step++)
        {
            ballVel.y += Gravity * subDt;
            ballPos += ballVel * subDt;

            // Side Wall Collisions
            if (ballPos.x - BallRadius < -HalfW)
            {
                ballPos.x = -HalfW + BallRadius;
                ballVel.x = -ballVel.x * Elasticity;
                AddScreenTrauma(0.04f);
            }
            else if (ballPos.x + BallRadius > HalfW)
            {
                ballPos.x = HalfW - BallRadius;
                ballVel.x = -ballVel.x * Elasticity;
                AddScreenTrauma(0.04f);
            }

            // Top Wall Collision
            if (ballPos.y + BallRadius > HalfH)
            {
                ballPos.y = HalfH - BallRadius;
                ballVel.y = -ballVel.y * Elasticity;
            }

            // Peg Collisions
            for (int i = 0; i < pegs.Count; i++)
            {
                var peg = pegs[i];
                float minDist = BallRadius + peg.radius;
                Vector3 delta = ballPos - peg.pos;
                float distSqr = delta.x * delta.x + delta.y * delta.y;

                if (distSqr < minDist * minDist)
                {
                    float dist = Mathf.Sqrt(distSqr);
                    Vector3 norm = (dist > 0.0001f) ? (delta / dist) : Vector3.up;

                    // Push ball outside peg
                    ballPos = peg.pos + norm * (minDist + 0.01f);

                    // Reflect velocity with impulse
                    float dot = Vector3.Dot(ballVel, norm);
                    if (dot < 0f)
                    {
                        float rest = (peg.type == PegType.Bumper) ? 1.55f : Elasticity;
                        ballVel = (ballVel - (1.0f + rest) * dot * norm);

                        if (peg.type == PegType.Bumper)
                        {
                            ballVel += Vector3.up * 7.5f; // extra upward boost
                        }
                    }

                    OnPegHit(peg);
                }
            }

            // Check if ball fell into bottom drain/bucket
            if (ballPos.y < -HalfH + 0.5f)
            {
                ResolveBucketFall();
                return;
            }
        }

        ballGo.transform.position = ballPos;
    }

    void OnPegHit(PegData peg)
    {
        comboCount++;
        turnHits++;

        // Play musical chime ascending with combo
        int chimeIdx = Mathf.Clamp(comboCount - 1, 0, sndPegChimes.Length - 1);
        PlayClip(sndPegChimes[chimeIdx], 0.7f + Mathf.Min(0.3f, comboCount * 0.02f));

        if (!peg.isHit)
        {
            peg.isHit = true;
            peg.go.GetComponent<MeshRenderer>().material = hitPegMat;
        }

        // Apply special peg properties
        switch (peg.type)
        {
            case PegType.Normal:
                turnBaseDamage += 4;
                SpawnFloatText("+4", peg.pos, Color.cyan);
                break;

            case PegType.Crit:
                turnBaseDamage += 10;
                isCritActive = true;
                AddScreenTrauma(0.18f);
                PlayClip(sndCrit, 1.0f);
                SpawnFloatText("CRIT ACTIVE! x2", peg.pos, Color.yellow);
                break;

            case PegType.Refresh:
                turnBaseDamage += 6;
                PlayClip(sndRefresh, 1.0f);
                RefreshAllHitPegs();
                SpawnFloatText("PEGS REFRESHED!", peg.pos, Color.green);
                break;

            case PegType.Bomb:
                turnBaseDamage += 60;
                AddScreenTrauma(0.4f);
                PlayClip(sndBomb, 1.1f);
                SpawnFloatText("BOMB +60!", peg.pos, new Color(1f, 0.4f, 0.1f));
                DetonateBomb(peg.pos, 2.3f);
                break;

            case PegType.Bumper:
                turnBaseDamage += 8;
                AddScreenTrauma(0.12f);
                SpawnFloatText("BOUNCE +8", peg.pos, new Color(0.9f, 0.3f, 1f));
                break;
        }
    }

    void RefreshAllHitPegs()
    {
        foreach (var p in pegs)
        {
            if (p.isHit)
            {
                p.isHit = false;
                p.go.GetComponent<MeshRenderer>().material = p.mat;
            }
        }
    }

    void DetonateBomb(Vector3 center, float radius)
    {
        for (int i = 0; i < pegs.Count; i++)
        {
            var p = pegs[i];
            float dist = Vector3.Distance(center, p.pos);
            if (dist <= radius)
            {
                if (!p.isHit)
                {
                    p.isHit = true;
                    p.go.GetComponent<MeshRenderer>().material = hitPegMat;
                    turnBaseDamage += 5;
                }
            }
        }
    }

    void ResolveBucketFall()
    {
        isBallActive = false;
        ballGo.SetActive(false);
        state = GameState.TurnResolving;

        // Identify landing bucket
        float dropX = ballPos.x;
        Bucket landedBucket = buckets[2]; // default jackpot center
        for (int i = 0; i < buckets.Length; i++)
        {
            if (dropX >= buckets[i].minX && dropX <= buckets[i].maxX)
            {
                landedBucket = buckets[i];
                break;
            }
        }

        StartCoroutine(ResolveTurnRoutine(landedBucket));
    }

    IEnumerator ResolveTurnRoutine(Bucket bucket)
    {
        // Calculate total damage
        float mult = bucket.multiplier * (isCritActive ? 2.0f : 1.0f);
        int finalDamage = Mathf.RoundToInt(turnBaseDamage * mult);

        PlayClip(sndJackpot, 1.0f);
        AddScreenTrauma(0.25f);
        SpawnFloatText(bucket.label + " -> " + finalDamage + " DMG!", new Vector3(dropXToBucket(bucket), -5.5f, 0f), bucket.color);

        yield return new WaitForSeconds(0.6f);

        // Deal damage to enemy
        enemyShakeTimer = 0.4f;
        AddScreenTrauma(0.3f);
        PlayClip(sndEnemyHurt, 1.0f);

        if (enemyShield > 0)
        {
            int shieldDmg = Mathf.Min(enemyShield, finalDamage);
            enemyShield -= shieldDmg;
            finalDamage -= shieldDmg;
            SpawnFloatText("-" + shieldDmg + " Shield Broken!", enemyBasePos + Vector3.up * 0.8f, Color.white);
        }

        if (finalDamage > 0)
        {
            enemyHp = Mathf.Max(0, enemyHp - finalDamage);
            SpawnFloatText("-" + finalDamage + (isCritActive ? " CRIT!" : ""), enemyBasePos, Color.red);
        }

        totalScore += finalDamage * 10;

        yield return new WaitForSeconds(0.8f);

        // Check if enemy defeated
        if (enemyHp <= 0)
        {
            OnStageVictory();
            yield break;
        }

        // Enemy turn / Attack countdown
        turnsUntilEnemyAttack--;
        if (turnsUntilEnemyAttack <= 0)
        {
            var s = stages[currentStageIdx];
            turnsUntilEnemyAttack = s.turnsToAttack;

            // Enemy attacks player
            PlayClip(sndPlayerHurt, 1.0f);
            AddScreenTrauma(0.5f);
            playerHp = Mathf.Max(0, playerHp - s.attack);
            SpawnFloatText("ENEMY STRIKE! -" + s.attack + " HP", new Vector3(0f, -2f, 0f), Color.red);

            yield return new WaitForSeconds(0.6f);

            if (playerHp <= 0)
            {
                state = GameState.GameOver;
                ShowBanner("GAME OVER - DEFEATED IN STAGE " + (currentStageIdx + 1), 5.0f);
                yield break;
            }
        }

        // Reset for next turn
        RefreshAllHitPegs();
        state = GameState.Aiming;
    }

    float dropXToBucket(Bucket b)
    {
        return (b.minX + b.maxX) * 0.5f;
    }

    void OnStageVictory()
    {
        state = GameState.StageClear;
        PlayClip(sndVictory, 1.0f);
        AddScreenTrauma(0.45f);

        // Heal player 30 HP
        playerHp = Mathf.Min(maxPlayerHp, playerHp + 30);

        if (currentStageIdx >= stages.Length - 1)
        {
            ShowBanner("★ CONGRATULATIONS! ALL 12 STAGES CLEARED! ★", 6.0f);
        }
        else
        {
            ShowBanner("STAGE " + (currentStageIdx + 1) + " CLEARED! HEALED +30 HP", 3.0f);
        }
    }

    void NextStage()
    {
        if (currentStageIdx < stages.Length - 1)
        {
            InitStage(currentStageIdx + 1);
        }
        else
        {
            InitStage(0);
        }
    }

    void RestartGame()
    {
        playerHp = maxPlayerHp;
        totalScore = 0;
        InitStage(0);
    }

    void AddScreenTrauma(float amt)
    {
        screenShakeTrauma = Mathf.Clamp01(screenShakeTrauma + amt);
    }

    void ShowBanner(string msg, float duration)
    {
        bannerMessage = msg;
        bannerTimer = duration;
    }

    void SpawnFloatText(string text, Vector3 pos, Color c)
    {
        floatTexts.Add(new FloatText
        {
            text = text,
            worldPos = pos,
            color = c,
            life = 1.2f,
            maxLife = 1.2f
        });
    }

    void UpdateFloatingTexts()
    {
        for (int i = floatTexts.Count - 1; i >= 0; i--)
        {
            var ft = floatTexts[i];
            ft.life -= Time.deltaTime;
            ft.worldPos.y += Time.deltaTime * 0.8f;
            if (ft.life <= 0f)
            {
                floatTexts.RemoveAt(i);
            }
            else
            {
                floatTexts[i] = ft;
            }
        }
    }

    void OnGUI()
    {
        // Custom Modern High-Contrast RPG HUD
        GUI.skin.label.fontSize = 14;
        GUI.skin.button.fontSize = 13;

        // Top Header Bar
        GUILayout.BeginArea(new Rect(15, 12, Screen.width - 30, 95));
        GUILayout.BeginHorizontal();

        // Player Info
        GUILayout.BeginVertical(GUI.skin.box, GUILayout.Width(190));
        GUILayout.Label("🛡️ <b>HERO</b>: " + playerHp + " / " + maxPlayerHp + " HP" + (playerShield > 0 ? " (Shield: " + playerShield + ")" : ""));
        DrawProgressBar(playerHp / (float)maxPlayerHp, new Color(0.2f, 0.8f, 0.4f), 12);
        GUILayout.Label("🏆 Score: <b>" + totalScore + "</b>");
        GUILayout.EndVertical();

        GUILayout.FlexibleSpace();

        // Center Status / Turn Combo
        GUILayout.BeginVertical(GUI.skin.box, GUILayout.Width(250));
        GUILayout.Label("<color=#facc15><b>STAGE " + (currentStageIdx + 1) + "/12</b></color>: " + stages[currentStageIdx].titleKo);
        string critTag = isCritActive ? " <color=#fde047>[CRIT x2!]</color>" : "";
        GUILayout.Label("🎯 Turn Dmg: <b>" + turnBaseDamage + "</b> (" + turnHits + " hits)" + critTag);
        GUILayout.EndVertical();

        GUILayout.FlexibleSpace();

        // Enemy Info
        var s = stages[currentStageIdx];
        GUILayout.BeginVertical(GUI.skin.box, GUILayout.Width(200));
        GUILayout.Label("👾 <b>" + s.name + "</b>: " + enemyHp + "/" + enemyMaxHp + " HP");
        DrawProgressBar(enemyHp / (float)enemyMaxHp, new Color(0.9f, 0.2f, 0.2f), 12);
        GUILayout.Label("⚔️ Attack in: <b>" + turnsUntilEnemyAttack + " turn(s)</b> (" + s.attack + " Dmg)");
        GUILayout.EndVertical();

        // Stage Select Toggle Button
        if (GUILayout.Button("🗺️ STAGES\n(1~12)", GUILayout.Width(85), GUILayout.Height(50)))
        {
            showStageSelect = !showStageSelect;
        }

        GUILayout.EndHorizontal();
        GUILayout.EndArea();

        // Multiplier Labels at Bottom
        float bottomY = Screen.height - 40;
        GUI.color = Color.white;
        for (int i = 0; i < buckets.Length; i++)
        {
            Vector3 screenPos = mainCam.WorldToScreenPoint(new Vector3(dropXToBucket(buckets[i]), -HalfH + 0.35f, 0f));
            Rect r = new Rect(screenPos.x - 50, Screen.height - screenPos.y - 12, 100, 24);
            GUI.Label(r, "<color=#fde047><b>" + buckets[i].label + "</b></color>", GetCenterStyle(buckets[i].color));
        }

        // Floating Damage/Combo Texts
        foreach (var ft in floatTexts)
        {
            Vector3 screenPt = mainCam.WorldToScreenPoint(ft.worldPos);
            if (screenPt.z > 0f)
            {
                float alpha = Mathf.Clamp01(ft.life / ft.maxLife);
                GUI.color = new Color(ft.color.r, ft.color.g, ft.color.b, alpha);
                GUI.Label(new Rect(screenPt.x - 90, Screen.height - screenPt.y - 15, 180, 30), "<b>" + ft.text + "</b>", GetCenterStyle(ft.color));
            }
        }
        GUI.color = Color.white;

        // Big Banner Overlay
        if (bannerTimer > 0f)
        {
            Rect bannerRect = new Rect(Screen.width * 0.5f - 240, 120, 480, 50);
            GUI.Box(bannerRect, "");
            GUI.Label(bannerRect, "<size=18><b>" + bannerMessage + "</b></size>", GetCenterStyle(Color.yellow));
        }

        // Stage Clear Modal
        if (state == GameState.StageClear)
        {
            Rect clearRect = new Rect(Screen.width * 0.5f - 180, Screen.height * 0.5f - 90, 360, 180);
            GUI.Box(clearRect, "");
            GUILayout.BeginArea(clearRect);
            GUILayout.Space(15);
            GUILayout.Label("<size=18><color=#4ade80><b>★ STAGE CLEARED! ★</b></color></size>", GetCenterStyle(Color.green));
            GUILayout.Space(8);
            GUILayout.Label("Defeated " + stages[currentStageIdx].titleKo + "!", GetCenterStyle(Color.white));
            GUILayout.Label("Hero healed +30 HP! Ready for next encounter.", GetCenterStyle(Color.cyan));
            GUILayout.Space(12);
            GUILayout.BeginHorizontal();
            GUILayout.FlexibleSpace();
            if (GUILayout.Button(currentStageIdx < 11 ? "▶ NEXT STAGE (" + (currentStageIdx + 2) + ")" : "🏆 PLAY AGAIN", GUILayout.Width(170), GUILayout.Height(40)))
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
            Rect overRect = new Rect(Screen.width * 0.5f - 180, Screen.height * 0.5f - 80, 360, 160);
            GUI.Box(overRect, "");
            GUILayout.BeginArea(overRect);
            GUILayout.Space(15);
            GUILayout.Label("<size=18><color=#ef4444><b>☠️ YOU WERE DEFEATED ☠️</b></color></size>", GetCenterStyle(Color.red));
            GUILayout.Space(8);
            GUILayout.Label("Stage " + (currentStageIdx + 1) + ": " + stages[currentStageIdx].titleKo, GetCenterStyle(Color.white));
            GUILayout.Space(12);
            GUILayout.BeginHorizontal();
            GUILayout.FlexibleSpace();
            if (GUILayout.Button("🔄 RESTART FROM STAGE 1", GUILayout.Width(200), GUILayout.Height(40)))
            {
                RestartGame();
            }
            GUILayout.FlexibleSpace();
            GUILayout.EndHorizontal();
            GUILayout.EndArea();
        }

        // 12-Stage Select Modal (User Rule: Minimum 10 stages accessible)
        if (showStageSelect)
        {
            Rect modalRect = new Rect(Screen.width * 0.5f - 260, 110, 520, 420);
            GUI.Box(modalRect, "<b>SELECT STAGE (1~12)</b>");
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
                        string bossTag = st.isBoss ? " ★ BOSS" : "";
                        string btnText = "<b>Stage " + st.stageNum + "</b>: " + st.titleKo + bossTag + "\n(HP: " + st.maxHp + " | Atk: " + st.attack + ")";
                        if (GUILayout.Button(btnText, GUILayout.Height(50)))
                        {
                            showStageSelect = false;
                            InitStage(idx);
                        }
                    }
                }
                GUILayout.EndHorizontal();
                GUILayout.Space(4);
            }

            GUILayout.Space(8);
            if (GUILayout.Button("❌ CLOSE", GUILayout.Height(30)))
            {
                showStageSelect = false;
            }
            GUILayout.EndArea();
        }
    }

    void DrawProgressBar(float pct, Color col, float height)
    {
        Rect r = GUILayoutUtility.GetRect(120, height);
        GUI.color = new Color(0.15f, 0.15f, 0.2f);
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
        sndShoot = SynthAudio(0.12f, t => {
            float freq = Mathf.Lerp(600f, 150f, t);
            return Mathf.Sin(2f * Mathf.PI * freq * t) * (1f - t);
        });

        sndCrit = SynthAudio(0.25f, t => {
            return (Mathf.Sin(2f * Mathf.PI * 880f * t) + Mathf.Sin(2f * Mathf.PI * 1320f * t)) * 0.5f * (1f - t);
        });

        sndRefresh = SynthAudio(0.3f, t => {
            float f = Mathf.Lerp(300f, 900f, t);
            return Mathf.Sin(2f * Mathf.PI * f * t) * (1f - t);
        });

        sndBomb = SynthAudio(0.45f, t => {
            float noise = (UnityEngine.Random.value * 2f - 1f) * 0.8f;
            float bass = Mathf.Sin(2f * Mathf.PI * 65f * t);
            return (noise + bass) * 0.6f * (1f - t * t);
        });

        sndJackpot = SynthAudio(0.5f, t => {
            float f = (t < 0.25f) ? 523.25f : 659.25f;
            return Mathf.Sin(2f * Mathf.PI * f * t) * (1f - t);
        });

        sndEnemyHurt = SynthAudio(0.15f, t => {
            return (UnityEngine.Random.value * 2f - 1f) * 0.5f * (1f - t) + Mathf.Sin(2f * Mathf.PI * 110f * t) * 0.5f;
        });

        sndPlayerHurt = SynthAudio(0.2f, t => {
            return Mathf.Sin(2f * Mathf.PI * 80f * t) * (1f - t);
        });

        sndVictory = SynthAudio(0.6f, t => {
            float f = 523.25f; // C
            if (t > 0.15f) f = 659.25f; // E
            if (t > 0.30f) f = 783.99f; // G
            if (t > 0.45f) f = 1046.50f; // High C
            return Mathf.Sin(2f * Mathf.PI * f * t) * (1f - t);
        });

        // 12 Peg chimes (pentatonic scale ascending)
        float[] freqs = new float[] {
            261.63f, 293.66f, 329.63f, 392.00f, 440.00f,
            523.25f, 587.33f, 659.25f, 783.99f, 880.00f,
            1046.50f, 1174.66f
        };
        sndPegChimes = new AudioClip[freqs.Length];
        for (int i = 0; i < freqs.Length; i++)
        {
            float f = freqs[i];
            sndPegChimes[i] = SynthAudio(0.18f, t => {
                return Mathf.Sin(2f * Mathf.PI * f * t) * Mathf.Exp(-t * 12f);
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
        var clip = AudioClip.Create("SynthClip", totalSamples, 1, sampleRate, false);
        clip.SetData(samples, 0);
        return clip;
    }
}
