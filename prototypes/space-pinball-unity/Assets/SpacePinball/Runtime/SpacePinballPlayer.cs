using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public static class StringExtensions
{
    public static string Repeat(this string s, int n)
    {
        if (n <= 0) return "";
        var sb = new System.Text.StringBuilder(s.Length * n);
        for (int i = 0; i < n; i++) sb.Append(s);
        return sb.ToString();
    }
}

public class SpacePinballPlayer : MonoBehaviour
{
    public enum GameLang { KO, EN, JA, ES }
    public static GameLang CurrentLang = GameLang.KO;

    public enum GameState { Idle, Plunging, InPlay, Drained, GameOver }
    public GameState state = GameState.Idle;

    // --- Audio Synthesis ---
    private AudioSource sfxSource;

    // --- Materials & Visuals ---
    private Material ballMat;
    private Material tableMat;
    private Material wallMat;
    private Material bumperMat;
    private Material flipperMat;
    private Material laneMat;
    private Material saucerMat;

    // --- Camera ---
    private Camera mainCam;
    private Vector3 camVel;

    // --- Pinball Table Geometry (Zero-Collider Math) ---
    private GameObject tableGo;
    private GameObject ballGo;
    private GameObject leftFlipperGo;
    private GameObject rightFlipperGo;

    private Vector2 ballPos; // X, Z in table 2D plane
    private Vector2 ballVel;
    private float ballRadius = 0.45f;

    // Flippers
    private Vector2 leftPivot = new Vector2(-2.4f, -9.0f);
    private Vector2 rightPivot = new Vector2(2.4f, -9.0f);
    private float flipperLength = 2.4f;
    private float leftFlipperAngle = -28f;
    private float rightFlipperAngle = 28f;
    private bool leftFlipperActive = false;
    private bool rightFlipperActive = false;

    // Plunger
    private float plungerPower = 0f;
    private bool isPlunging = false;
    private float shooterLaneX = 7.0f;

    // Physics
    private const float TableGravity = -28.0f; // Downwards pull on slanted table
    private const float BallFriction = 0.994f;
    private const float WallRestitution = 0.72f;

    // Game Metrics
    private int score = 0;
    private int ballsLeft = 3;
    private int multiplier = 1;
    private float tiltWarnings = 0;
    private float tiltCooldown = 0f;
    private bool isTilted = false;

    // Rollover Lanes (A, B, C)
    private bool[] lanesLit = new bool[3];

    // Wormhole Saucer
    private Vector2 saucerPos = new Vector2(0f, 6.5f);
    private float saucerRadius = 0.85f;
    private bool saucerTrapped = false;
    private float saucerTimer = 0f;

    // --- Stage Definitions ---
    public struct StageDef
    {
        public int id;
        public string nameKo;
        public string nameEn;
        public string nameJa;
        public string nameEs;
        public Color tableColor;
        public Color neonColor;
        public float gravityScale;
        public float bumperBounciness;
        public int targetScore;
    }

    private static readonly StageDef[] Stages = new StageDef[]
    {
        new StageDef { id = 1, nameKo = "달 탐사 기지", nameEn = "Lunar Outpost", nameJa = "月面探査基地", nameEs = "Base Lunar", tableColor = new Color(0.12f, 0.15f, 0.22f), neonColor = new Color(0.3f, 0.75f, 1f), gravityScale = 0.85f, bumperBounciness = 18f, targetScore = 20000 },
        new StageDef { id = 2, nameKo = "화성 발사대", nameEn = "Mars Launchpad", nameJa = "火星発射台", nameEs = "Plataforma de Marte", tableColor = new Color(0.24f, 0.12f, 0.10f), neonColor = new Color(1f, 0.45f, 0.2f), gravityScale = 0.95f, bumperBounciness = 19f, targetScore = 30000 },
        new StageDef { id = 3, nameKo = "소행성 채굴 벨트", nameEn = "Asteroid Mining Belt", nameJa = "小惑星採掘ベルト", nameEs = "Cinturón de Asteroides", tableColor = new Color(0.15f, 0.18f, 0.16f), neonColor = new Color(0.3f, 1f, 0.5f), gravityScale = 1.0f, bumperBounciness = 20f, targetScore = 40000 },
        new StageDef { id = 4, nameKo = "목성 중력 새총", nameEn = "Jupiter Gravity Slingshot", nameJa = "木星重力スリングショット", nameEs = "Tirachinas de Júpiter", tableColor = new Color(0.26f, 0.18f, 0.12f), neonColor = new Color(1f, 0.75f, 0.25f), gravityScale = 1.15f, bumperBounciness = 22f, targetScore = 55000 },
        new StageDef { id = 5, nameKo = "토성 고리 하이웨이", nameEn = "Saturn Ring Highway", nameJa = "土星リングハイウェイ", nameEs = "Autovía de Anillos de Saturno", tableColor = new Color(0.18f, 0.14f, 0.26f), neonColor = new Color(0.85f, 0.4f, 1f), gravityScale = 1.0f, bumperBounciness = 21f, targetScore = 70000 },
        new StageDef { id = 6, nameKo = "천왕성 얼음 전장", nameEn = "Uranus Ice Field", nameJa = "天王星氷の戦場", nameEs = "Campo de Hielo de Urano", tableColor = new Color(0.08f, 0.22f, 0.28f), neonColor = new Color(0.4f, 0.95f, 1f), gravityScale = 1.05f, bumperBounciness = 23f, targetScore = 85000 },
        new StageDef { id = 7, nameKo = "해왕성 심해 폭풍", nameEn = "Neptune Deep Storm", nameJa = "海王星深海嵐", nameEs = "Tormenta de Neptuno", tableColor = new Color(0.05f, 0.10f, 0.25f), neonColor = new Color(0.2f, 0.6f, 1f), gravityScale = 1.1f, bumperBounciness = 24f, targetScore = 100000 },
        new StageDef { id = 8, nameKo = "명왕성 지평선 전초기지", nameEn = "Pluto Horizon Outpost", nameJa = "冥王星地平線前哨", nameEs = "Avanzada de Plutón", tableColor = new Color(0.14f, 0.14f, 0.18f), neonColor = new Color(0.7f, 0.85f, 1f), gravityScale = 0.9f, bumperBounciness = 22f, targetScore = 120000 },
        new StageDef { id = 9, nameKo = "태양 플레어 코어", nameEn = "Solar Flare Core", nameJa = "太陽フレアコア", nameEs = "Núcleo de Llamarada Solar", tableColor = new Color(0.32f, 0.12f, 0.05f), neonColor = new Color(1f, 0.25f, 0.1f), gravityScale = 1.25f, bumperBounciness = 26f, targetScore = 150000 },
        new StageDef { id = 10, nameKo = "블랙홀 특이점", nameEn = "Black Hole Singularity", nameJa = "ブラックホール特異点", nameEs = "Singularidad Agujero Negro", tableColor = new Color(0.06f, 0.02f, 0.12f), neonColor = new Color(0.6f, 0.1f, 1f), gravityScale = 1.35f, bumperBounciness = 25f, targetScore = 180000 },
        new StageDef { id = 11, nameKo = "안드로메다 초은하단", nameEn = "Andromeda Supercluster", nameJa = "アンドロメダ超銀河団", nameEs = "Supercúmulo de Andrómeda", tableColor = new Color(0.12f, 0.04f, 0.22f), neonColor = new Color(1f, 0.35f, 0.85f), gravityScale = 1.15f, bumperBounciness = 27f, targetScore = 220000 },
        new StageDef { id = 12, nameKo = "우주 패왕 최종 챔피언십", nameEn = "Cosmic Overlord Finale", nameJa = "宇宙覇王ファイナル", nameEs = "Gran Final Cósmica", tableColor = new Color(0.04f, 0.04f, 0.08f), neonColor = new Color(1f, 0.85f, 0.2f), gravityScale = 1.3f, bumperBounciness = 28f, targetScore = 300000 }
    };

    private int currentStageIndex = 0;
    private bool isEndlessMode = false;
    private bool showStageSelect = false;

    // --- Interactive Table Obstacles ---
    public struct BumperDef
    {
        public Vector2 pos;
        public float radius;
    }
    private BumperDef[] bumpers = new BumperDef[]
    {
        new BumperDef { pos = new Vector2(-2.2f, 2.5f), radius = 1.1f },
        new BumperDef { pos = new Vector2(2.2f, 2.5f), radius = 1.1f },
        new BumperDef { pos = new Vector2(0f, 4.8f), radius = 1.2f }
    };
    private GameObject[] bumperGos;

    public struct SlingshotDef
    {
        public Vector2 a;
        public Vector2 b;
        public Vector2 normal;
    }
    private SlingshotDef leftSlingshot;
    private SlingshotDef rightSlingshot;

    // GUI Styles
    private GUIStyle headerTitleStyle;
    private GUIStyle headerSubStyle;
    private GUIStyle hudLabelStyle;
    private GUIStyle hudValueStyle;
    private GUIStyle btnStyle;
    private GUIStyle alertStyle;

    private void Awake()
    {
        switch (OiyoLang.Pick("ko", "en", "ja", "es")) { case "en": CurrentLang = GameLang.EN; break; case "ja": CurrentLang = GameLang.JA; break; case "es": CurrentLang = GameLang.ES; break; default: CurrentLang = GameLang.KO; break; }
        mainCam = Camera.main;
        if (mainCam == null)
        {
            var camGo = new GameObject("MainCamera");
            mainCam = camGo.AddComponent<Camera>();
            camGo.tag = "MainCamera";
        }
        mainCam.clearFlags = CameraClearFlags.SolidColor;
        mainCam.backgroundColor = new Color(0.02f, 0.03f, 0.08f);
        mainCam.fieldOfView = 52f;

        sfxSource = gameObject.AddComponent<AudioSource>();

        // Materials
        var unlitShader = Shader.Find("Hidden/Internal-Colored") ?? Shader.Find("Sprites/Default");
        ballMat = new Material(unlitShader) { color = Color.white };
        tableMat = new Material(unlitShader) { color = Stages[0].tableColor };
        wallMat = new Material(unlitShader) { color = Stages[0].neonColor };
        bumperMat = new Material(unlitShader) { color = new Color(1f, 0.35f, 0.3f) };
        flipperMat = new Material(unlitShader) { color = new Color(1f, 0.85f, 0.2f) };
        laneMat = new Material(unlitShader) { color = new Color(0.2f, 0.9f, 1f) };
        saucerMat = new Material(unlitShader) { color = new Color(0.6f, 0.2f, 1f) };

        BuildTableVisuals();
        SetupStage(0);
    }

    private void BuildTableVisuals()
    {
        tableGo = new GameObject("PinballTable");

        // Table surface (Width 16, Length 24)
        var floor = GameObject.CreatePrimitive(PrimitiveType.Cube);
        floor.name = "TableFloor";
        floor.transform.SetParent(tableGo.transform);
        floor.transform.localPosition = new Vector3(0, -0.2f, 0);
        floor.transform.localScale = new Vector3(16f, 0.4f, 24f);
        var r = floor.GetComponent<Renderer>();
        if (r) r.sharedMaterial = tableMat;

        // Ball
        ballGo = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        ballGo.name = "PinballSphere";
        ballGo.transform.SetParent(tableGo.transform);
        ballGo.transform.localScale = Vector3.one * (ballRadius * 2f);
        var br = ballGo.GetComponent<Renderer>();
        if (br) br.sharedMaterial = ballMat;

        // Flippers
        leftFlipperGo = CreateFlipperVisual("LeftFlipper", leftPivot);
        rightFlipperGo = CreateFlipperVisual("RightFlipper", rightPivot);

        // Bumpers
        bumperGos = new GameObject[bumpers.Length];
        for (int i = 0; i < bumpers.Length; i++)
        {
            var bg = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            bg.name = $"Bumper_{i}";
            bg.transform.SetParent(tableGo.transform);
            bg.transform.localPosition = new Vector3(bumpers[i].pos.x, 0.4f, bumpers[i].pos.y);
            bg.transform.localScale = new Vector3(bumpers[i].radius * 2f, 0.6f, bumpers[i].radius * 2f);
            var bmr = bg.GetComponent<Renderer>();
            if (bmr) bmr.sharedMaterial = bumperMat;
            bumperGos[i] = bg;
        }

        // Slingshots setup
        leftSlingshot = new SlingshotDef
        {
            a = new Vector2(-4.6f, -4.5f),
            b = new Vector2(-3.0f, -8.0f),
            normal = new Vector2(0.9f, 0.4f).normalized
        };
        rightSlingshot = new SlingshotDef
        {
            a = new Vector2(4.6f, -4.5f),
            b = new Vector2(3.0f, -8.0f),
            normal = new Vector2(-0.9f, 0.4f).normalized
        };
    }

    private GameObject CreateFlipperVisual(string name, Vector2 pivot)
    {
        var root = new GameObject(name);
        root.transform.SetParent(tableGo.transform);
        root.transform.localPosition = new Vector3(pivot.x, 0.3f, pivot.y);

        var blade = GameObject.CreatePrimitive(PrimitiveType.Cube);
        blade.name = "FlipperBlade";
        blade.transform.SetParent(root.transform);
        blade.transform.localPosition = new Vector3(flipperLength * 0.5f, 0, 0);
        blade.transform.localScale = new Vector3(flipperLength, 0.5f, 0.55f);
        var r = blade.GetComponent<Renderer>();
        if (r) r.sharedMaterial = flipperMat;

        return root;
    }

    private void SetupStage(int index)
    {
        currentStageIndex = Mathf.Clamp(index, 0, Stages.Length - 1);
        StageDef s = Stages[currentStageIndex];

        tableMat.color = s.tableColor;
        wallMat.color = s.neonColor;

        score = 0;
        ballsLeft = 3;
        multiplier = 1;
        isTilted = false;
        tiltWarnings = 0;

        for (int i = 0; i < lanesLit.Length; i++) lanesLit[i] = false;

        ResetBallToShooter();
    }

    private void ResetBallToShooter()
    {
        ballPos = new Vector2(shooterLaneX, -9.5f);
        ballVel = Vector2.zero;
        saucerTrapped = false;
        state = GameState.Idle;

        if (ballGo != null)
        {
            ballGo.transform.localPosition = new Vector3(ballPos.x, ballRadius, ballPos.y);
        }
    }

    private void Update()
    {
        if (Input.GetKeyDown(KeyCode.L))
        {
            CurrentLang = (GameLang)(((int)CurrentLang + 1) % 4);
        }

        // Flipper Inputs (A/D, Left/Right Arrows, or Mouse buttons)
        leftFlipperActive = Input.GetKey(KeyCode.A) || Input.GetKey(KeyCode.LeftArrow) || Input.GetMouseButton(0);
        rightFlipperActive = Input.GetKey(KeyCode.D) || Input.GetKey(KeyCode.RightArrow) || Input.GetMouseButton(1);

        // Sound on press
        if ((Input.GetKeyDown(KeyCode.A) || Input.GetKeyDown(KeyCode.LeftArrow)) && !isTilted) PlaySoundFlipper();
        if ((Input.GetKeyDown(KeyCode.D) || Input.GetKeyDown(KeyCode.RightArrow)) && !isTilted) PlaySoundFlipper();

        // Plunger Control (Space or Down Arrow hold & release)
        if (state == GameState.Idle || state == GameState.Plunging)
        {
            if (Input.GetKey(KeyCode.Space) || Input.GetKey(KeyCode.DownArrow) || Input.GetKey(KeyCode.S))
            {
                state = GameState.Plunging;
                plungerPower = Mathf.Min(plungerPower + Time.deltaTime * 32f, 42f);
            }
            else if (state == GameState.Plunging)
            {
                // Release Plunger!
                ballVel = new Vector2(0f, Mathf.Max(24f, plungerPower));
                state = GameState.InPlay;
                PlaySoundPlunger();
                plungerPower = 0f;
            }
        }

        // Table Nudge (Space key during InPlay)
        if (state == GameState.InPlay && Input.GetKeyDown(KeyCode.Space))
        {
            ApplyNudge();
        }

        if (tiltCooldown > 0f) tiltCooldown -= Time.deltaTime;
        else if (tiltWarnings > 0f) tiltWarnings -= Time.deltaTime * 0.5f;

        // Flipper Animation
        UpdateFlippers(Time.deltaTime);

        // Main Ball Physics Loop
        if (state == GameState.InPlay)
        {
            UpdateBallPhysics(Time.deltaTime);
        }

        UpdateCamera();
    }

    private void ApplyNudge()
    {
        if (isTilted) return;
        tiltWarnings += 1.0f;
        tiltCooldown = 0.8f;

        if (tiltWarnings >= 3.5f)
        {
            isTilted = true;
            PlaySoundTiltWarning();
        }
        else
        {
            float nudgeX = UnityEngine.Random.Range(-3.5f, 3.5f);
            ballVel += new Vector2(nudgeX, 2.5f);
            PlaySoundNudge();
        }
    }

    private void UpdateFlippers(float dt)
    {
        // Left Flipper
        float targetLeft = (leftFlipperActive && !isTilted) ? 36f : -28f;
        leftFlipperAngle = Mathf.MoveTowards(leftFlipperAngle, targetLeft, dt * 850f);
        if (leftFlipperGo)
        {
            leftFlipperGo.transform.localRotation = Quaternion.Euler(0, -leftFlipperAngle, 0);
        }

        // Right Flipper
        float targetRight = (rightFlipperActive && !isTilted) ? -36f : 28f;
        rightFlipperAngle = Mathf.MoveTowards(rightFlipperAngle, targetRight, dt * 850f);
        if (rightFlipperGo)
        {
            rightFlipperGo.transform.localRotation = Quaternion.Euler(0, 180f - rightFlipperAngle, 0);
        }
    }

    private void UpdateBallPhysics(float dt)
    {
        if (saucerTrapped)
        {
            saucerTimer += dt;
            ballPos = saucerPos;
            if (saucerTimer >= 1.2f)
            {
                saucerTrapped = false;
                saucerTimer = 0f;
                ballVel = new Vector2(UnityEngine.Random.Range(-4f, 4f), 26f);
                PlaySoundSaucerEject();
            }
            ballGo.transform.localPosition = new Vector3(ballPos.x, ballRadius, ballPos.y);
            return;
        }

        StageDef s = Stages[currentStageIndex];

        // Apply Gravity
        ballVel.y += TableGravity * s.gravityScale * dt;
        ballVel *= Mathf.Pow(BallFriction, dt * 60f);

        // Sub-stepping for accurate zero-collider collision
        int steps = 4;
        float subDt = dt / steps;
        for (int step = 0; step < steps; step++)
        {
            ballPos += ballVel * subDt;

            // 1. Outer Boundaries
            // Left Wall
            if (ballPos.x < -7.2f + ballRadius)
            {
                ballPos.x = -7.2f + ballRadius;
                ballVel.x = -ballVel.x * WallRestitution;
                PlaySoundBounce();
            }
            // Right Wall (Plunger lane divider or outer right)
            float maxRight = (ballPos.y < -3.0f && ballVel.y < 0) ? 6.2f : 7.6f;
            if (ballPos.x > maxRight - ballRadius)
            {
                ballPos.x = maxRight - ballRadius;
                ballVel.x = -ballVel.x * WallRestitution;
                PlaySoundBounce();
            }
            // Top Arc Arch
            if (ballPos.y > 11.2f - ballRadius)
            {
                ballPos.y = 11.2f - ballRadius;
                ballVel.y = -ballVel.y * WallRestitution;
                PlaySoundBounce();
            }

            // 2. Bumpers
            foreach (var b in bumpers)
            {
                float dx = ballPos.x - b.pos.x;
                float dy = ballPos.y - b.pos.y;
                float distSq = dx * dx + dy * dy;
                float minDist = ballRadius + b.radius;

                if (distSq <= minDist * minDist)
                {
                    float dist = Mathf.Max(0.01f, Mathf.Sqrt(distSq));
                    Vector2 normal = new Vector2(dx / dist, dy / dist);
                    ballPos = b.pos + normal * (minDist + 0.05f);
                    ballVel = normal * s.bumperBounciness;
                    score += 150 * multiplier;
                    PlaySoundBumper();
                }
            }

            // 3. Slingshots
            CheckSlingshot(ref ballPos, ref ballVel, leftSlingshot);
            CheckSlingshot(ref ballPos, ref ballVel, rightSlingshot);

            // 4. Flippers Collision
            CheckFlipperCollision(ref ballPos, ref ballVel, leftPivot, flipperLength, -leftFlipperAngle * Mathf.Deg2Rad, leftFlipperActive);
            CheckFlipperCollision(ref ballPos, ref ballVel, rightPivot, flipperLength, (180f - rightFlipperAngle) * Mathf.Deg2Rad, rightFlipperActive);

            // 5. Rollover Lanes Check (Y ~ 8.5)
            if (Mathf.Abs(ballPos.y - 8.5f) < 0.6f)
            {
                if (Mathf.Abs(ballPos.x + 3.0f) < 0.8f && !lanesLit[0]) { lanesLit[0] = true; score += 500; CheckJackpot(); }
                if (Mathf.Abs(ballPos.x) < 0.8f && !lanesLit[1]) { lanesLit[1] = true; score += 500; CheckJackpot(); }
                if (Mathf.Abs(ballPos.x - 3.0f) < 0.8f && !lanesLit[2]) { lanesLit[2] = true; score += 500; CheckJackpot(); }
            }

            // 6. Saucer Sinkhole Check
            float sDx = ballPos.x - saucerPos.x;
            float sDy = ballPos.y - saucerPos.y;
            if (sDx * sDx + sDy * sDy <= saucerRadius * saucerRadius && !saucerTrapped)
            {
                saucerTrapped = true;
                saucerTimer = 0f;
                score += 2500 * multiplier;
                PlaySoundSaucer();
                break;
            }
        }

        // 7. Gutter Drain Check
        if (ballPos.y < -11.5f)
        {
            ballsLeft--;
            PlaySoundDrain();
            if (ballsLeft > 0)
            {
                ResetBallToShooter();
            }
            else
            {
                state = GameState.GameOver;
            }
        }

        // Update Ball Transform
        if (ballGo)
        {
            ballGo.transform.localPosition = new Vector3(ballPos.x, ballRadius, ballPos.y);
        }
    }

    private void CheckSlingshot(ref Vector2 pos, ref Vector2 vel, SlingshotDef s)
    {
        Vector2 ab = s.b - s.a;
        Vector2 ap = pos - s.a;
        float t = Mathf.Clamp01(Vector2.Dot(ap, ab) / ab.sqrMagnitude);
        Vector2 closest = s.a + ab * t;

        float distSq = (pos - closest).sqrMagnitude;
        if (distSq <= (ballRadius + 0.35f) * (ballRadius + 0.35f))
        {
            pos = closest + s.normal * (ballRadius + 0.36f);
            vel = s.normal * 20f;
            score += 200 * multiplier;
            PlaySoundSlingshot();
        }
    }

    private void CheckFlipperCollision(ref Vector2 pos, ref Vector2 vel, Vector2 pivot, float length, float radAngle, bool active)
    {
        Vector2 tip = pivot + new Vector2(Mathf.Cos(radAngle), Mathf.Sin(radAngle)) * length;
        Vector2 ab = tip - pivot;
        Vector2 ap = pos - pivot;
        float t = Mathf.Clamp01(Vector2.Dot(ap, ab) / ab.sqrMagnitude);
        Vector2 closest = pivot + ab * t;

        float distSq = (pos - closest).sqrMagnitude;
        float thickness = 0.45f;
        if (distSq <= (ballRadius + thickness) * (ballRadius + thickness))
        {
            Vector2 normal = new Vector2(-Mathf.Sin(radAngle), Mathf.Cos(radAngle));
            if (Vector2.Dot(vel, normal) < 0f)
            {
                pos = closest + normal * (ballRadius + thickness + 0.05f);
                float impulse = active ? 24f : 8f;
                vel = Vector2.Reflect(vel, normal) * 0.65f + normal * impulse;
                score += 50;
            }
        }
    }

    private void CheckJackpot()
    {
        if (lanesLit[0] && lanesLit[1] && lanesLit[2])
        {
            multiplier++;
            score += 10000 * multiplier;
            PlaySoundJackpot();
            for (int i = 0; i < lanesLit.Length; i++) lanesLit[i] = false;
        }
    }

    private void UpdateCamera()
    {
        if (mainCam == null) return;
        Vector3 targetPos = new Vector3(0f, 26f, -1.5f);
        mainCam.transform.position = Vector3.SmoothDamp(mainCam.transform.position, targetPos, ref camVel, 0.1f);
        mainCam.transform.LookAt(new Vector3(0, 0, 0));
    }

    // --- Procedural Audio ---
    private void PlaySoundPlunger() { PlayTone(180f, 420f, 0.25f, 0.35f, false); }
    private void PlaySoundFlipper() { PlayTone(380f, 220f, 0.08f, 0.22f, false); }
    private void PlaySoundBumper() { PlayTone(650f, 1100f, 0.16f, 0.35f, true); }
    private void PlaySoundSlingshot() { PlayTone(480f, 820f, 0.14f, 0.3f, false); }
    private void PlaySoundBounce() { PlayTone(140f, 90f, 0.06f, 0.15f, false); }
    private void PlaySoundSaucer() { PlayTone(440f, 880f, 0.35f, 0.3f, true); }
    private void PlaySoundSaucerEject() { PlayTone(320f, 680f, 0.25f, 0.4f, false); }
    private void PlaySoundDrain() { PlayTone(240f, 60f, 0.5f, 0.35f, false); }
    private void PlaySoundJackpot() { StartCoroutine(PlayJackpotFanfare()); }
    private void PlaySoundTiltWarning() { PlayTone(160f, 120f, 0.4f, 0.45f, false); }
    private void PlaySoundNudge() { PlayTone(200f, 240f, 0.1f, 0.2f, false); }

    private IEnumerator PlayJackpotFanfare()
    {
        PlayTone(523.25f, 523.25f, 0.12f, 0.35f, true);
        yield return new WaitForSeconds(0.12f);
        PlayTone(659.25f, 659.25f, 0.12f, 0.35f, true);
        yield return new WaitForSeconds(0.12f);
        PlayTone(783.99f, 783.99f, 0.16f, 0.35f, true);
        yield return new WaitForSeconds(0.16f);
        PlayTone(1046.50f, 1046.50f, 0.4f, 0.4f, true);
    }

    private void PlayTone(float startFreq, float endFreq, float duration, float volume, bool sine)
    {
        int sampleRate = 22050;
        int count = Mathf.CeilToInt(sampleRate * duration);
        float[] samples = new float[count];

        for (int i = 0; i < count; i++)
        {
            float t = (float)i / count;
            float freq = Mathf.Lerp(startFreq, endFreq, t);
            float phase = 2f * Mathf.PI * freq * (i / (float)sampleRate);
            float env = Mathf.Sin(t * Mathf.PI);

            float s = sine ? Mathf.Sin(phase) : (Mathf.Sin(phase) > 0 ? 0.6f : -0.6f);
            samples[i] = s * env * volume;
        }

        AudioClip clip = AudioClip.Create("PinballTone", count, 1, sampleRate, false);
        clip.SetData(samples, 0);
        sfxSource.PlayOneShot(clip);
    }

    // --- Localization Texts ---
    private string GetText(string key)
    {
        switch (CurrentLang)
        {
            case GameLang.EN:
                switch (key)
                {
                    case "title": return "Space Pinball 3D: Cosmic Arc";
                    case "ready_prompt": return "HOLD SPACE OR DRAG PLUNGER TO LAUNCH!";
                    case "score": return "Score";
                    case "balls": return "Balls";
                    case "multiplier": return "Multiplier";
                    case "stage": return "Stage";
                    case "endless": return "Endless Pinball";
                    case "clear_title": return "MISSION ACCOMPLISHED!";
                    case "gameover_title": return "GAME OVER";
                    case "restart": return "NEW GAME [R]";
                    case "next_stage": return "NEXT MISSION";
                    case "stage_select": return "SELECT MISSION";
                    case "controls_hint": return "A/D: Flippers | Space/Down: Plunger | Space (Play): Nudge | L: Language";
                }
                break;
            case GameLang.JA:
                switch (key)
                {
                    case "title": return "スペースピンボール3D：コズミックアーク";
                    case "ready_prompt": return "SPACEキーを長押ししてボールを発射！";
                    case "score": return "スコア";
                    case "balls": return "残ボール";
                    case "multiplier": return "倍率";
                    case "stage": return "ミッション";
                    case "endless": return "エンドレスピンボール";
                    case "clear_title": return "ミッション達成！";
                    case "gameover_title": return "ゲームオーバー";
                    case "restart": return "再挑戦 [R]";
                    case "next_stage": return "次のミッション";
                    case "stage_select": return "ミッション選択";
                    case "controls_hint": return "A/D: フリッパー | Space/↓: 発射 | Space (プレイ中): 台揺らし | L: 言語切替";
                }
                break;
            case GameLang.ES:
                switch (key)
                {
                    case "title": return "Pinball Espacial 3D: Arco Cósmico";
                    case "ready_prompt": return "¡MANTÉN ESPACIO PARA LANZAR LA BOLA!";
                    case "score": return "Puntos";
                    case "balls": return "Bolas";
                    case "multiplier": return "Multiplicador";
                    case "stage": return "Misión";
                    case "endless": return "Pinball Infinito";
                    case "clear_title": return "¡MISIÓN CUMPLIDA!";
                    case "gameover_title": return "FIN DE LA PARTIDA";
                    case "restart": return "REINTENTAR [R]";
                    case "next_stage": return "SIGUIENTE MISIÓN";
                    case "stage_select": return "ELEGIR MISIÓN";
                    case "controls_hint": return "A/D: Paletas | Espacio/↓: Émbolo | Espacio: Sacudir | L: Idioma";
                }
                break;
            default: // KO
                switch (key)
                {
                    case "title": return "스페이스 핀볼 3D: 코스믹 아크";
                    case "ready_prompt": return "SPACE 키를 길게 눌러 플런저를 당기세요!";
                    case "score": return "점수";
                    case "balls": return "남은 공";
                    case "multiplier": return "배율";
                    case "stage": return "미션";
                    case "endless": return "무한 핀볼";
                    case "clear_title": return "미션 달성 성공!";
                    case "gameover_title": return "게임 오버";
                    case "restart": return "다시 도전 [R]";
                    case "next_stage": return "다음 미션";
                    case "stage_select": return "미션 선택";
                    case "controls_hint": return "A/D / 방향키: 플리퍼 | Space/↓: 플런저 발사 | Space(게임중): 넛지(흔들기) | L: 언어 변경";
                }
                break;
        }
        return key;
    }

    private string GetStageName(int index)
    {
        if (index < 0 || index >= Stages.Length) return "";
        StageDef s = Stages[index];
        switch (CurrentLang)
        {
            case GameLang.EN: return s.nameEn;
            case GameLang.JA: return s.nameJa;
            case GameLang.ES: return s.nameEs;
            default: return s.nameKo;
        }
    }

    private void InitGUIStyles()
    {
        if (headerTitleStyle != null) return;

        headerTitleStyle = new GUIStyle(GUI.skin.label)
        {
            fontSize = 18,
            fontStyle = FontStyle.Bold,
            alignment = TextAnchor.MiddleLeft
        };
        headerTitleStyle.normal.textColor = Color.white;

        headerSubStyle = new GUIStyle(GUI.skin.label)
        {
            fontSize = 11,
            alignment = TextAnchor.MiddleLeft
        };
        headerSubStyle.normal.textColor = new Color(0.85f, 0.85f, 0.95f);

        hudLabelStyle = new GUIStyle(GUI.skin.label)
        {
            fontSize = 12,
            fontStyle = FontStyle.Normal,
            alignment = TextAnchor.MiddleCenter
        };
        hudLabelStyle.normal.textColor = new Color(0.8f, 0.85f, 0.95f);

        hudValueStyle = new GUIStyle(GUI.skin.label)
        {
            fontSize = 15,
            fontStyle = FontStyle.Bold,
            alignment = TextAnchor.MiddleCenter
        };
        hudValueStyle.normal.textColor = Color.white;

        btnStyle = new GUIStyle(GUI.skin.button)
        {
            fontSize = 13,
            fontStyle = FontStyle.Bold,
            alignment = TextAnchor.MiddleCenter
        };

        alertStyle = new GUIStyle(GUI.skin.label)
        {
            fontSize = 16,
            fontStyle = FontStyle.Bold,
            alignment = TextAnchor.MiddleCenter
        };
        alertStyle.normal.textColor = new Color(1f, 0.3f, 0.3f);
    }

    private void OnGUI()
    {
        OiyoUiFont.Apply();
        InitGUIStyles();

        // 1. Top Header Bar
        GUILayout.BeginArea(new Rect(16, 14, Screen.width - 32, 60));
        GUILayout.BeginHorizontal();

        GUILayout.BeginVertical(GUILayout.Width(340));
        GUILayout.Label("🚀 " + GetText("title"), headerTitleStyle);
        string modeStr = isEndlessMode ? GetText("endless") : $"{GetText("stage")} {currentStageIndex + 1}: {GetStageName(currentStageIndex)}";
        GUILayout.Label(modeStr, headerSubStyle);
        GUILayout.EndVertical();

        GUILayout.FlexibleSpace();

        // Stage Select Button
        if (GUILayout.Button($"📋 {GetText("stage_select")}", btnStyle, GUILayout.Width(130), GUILayout.Height(36)))
        {
            showStageSelect = !showStageSelect;
        }

        GUILayout.Space(8);

        // Language Switcher
        string[] langs = { "KO", "EN", "JA", "ES" };
        for (int i = 0; i < langs.Length; i++)
        {
            bool isCurrent = ((int)CurrentLang == i);
            GUI.backgroundColor = isCurrent ? new Color(0.2f, 0.7f, 1f) : new Color(0.25f, 0.28f, 0.35f);
            if (GUILayout.Button(langs[i], btnStyle, GUILayout.Width(42), GUILayout.Height(36)))
            {
                CurrentLang = (GameLang)i;
            }
        }
        GUI.backgroundColor = Color.white;

        GUILayout.EndHorizontal();
        GUILayout.EndArea();

        // 2. HUD Instruments (Score, Balls, Multiplier, Plunger Gauge)
        float hudWidth = 560f;
        float hudX = (Screen.width - hudWidth) * 0.5f;
        GUILayout.BeginArea(new Rect(hudX, 80, hudWidth, 66), GUI.skin.box);
        GUILayout.BeginHorizontal();

        // Balls Left
        GUILayout.BeginVertical(GUILayout.Width(100));
        GUILayout.Label(GetText("balls"), hudLabelStyle);
        GUILayout.Label("⚪".Repeat(ballsLeft), hudValueStyle);
        GUILayout.EndVertical();

        // Multiplier
        GUILayout.BeginVertical(GUILayout.Width(90));
        GUILayout.Label(GetText("multiplier"), hudLabelStyle);
        GUILayout.Label($"x{multiplier}", hudValueStyle);
        GUILayout.EndVertical();

        // Lanes Lit
        GUILayout.BeginVertical(GUILayout.Width(110));
        GUILayout.Label("Lanes (A B C)", hudLabelStyle);
        string laneStr = $"[{(lanesLit[0]?"A":"_")} {(lanesLit[1]?"B":"_")} {(lanesLit[2]?"C":"_")}]";
        GUILayout.Label(laneStr, hudValueStyle);
        GUILayout.EndVertical();

        // Plunger Power
        GUILayout.BeginVertical(GUILayout.Width(110));
        GUILayout.Label("Plunger", hudLabelStyle);
        int pBars = Mathf.RoundToInt((plungerPower / 42f) * 10f);
        GUILayout.Label("[" + "|".Repeat(pBars) + ".".Repeat(10 - pBars) + "]", hudValueStyle);
        GUILayout.EndVertical();

        // Score
        GUILayout.BeginVertical(GUILayout.Width(120));
        GUILayout.Label(GetText("score"), hudLabelStyle);
        GUILayout.Label($"{score}", hudValueStyle);
        GUILayout.EndVertical();

        GUILayout.EndHorizontal();
        GUILayout.EndArea();

        // 3. Central Prompts
        if (state == GameState.Idle || state == GameState.Plunging)
        {
            float rw = 500f;
            float rx = (Screen.width - rw) * 0.5f;
            float ry = Screen.height * 0.45f;
            GUILayout.BeginArea(new Rect(rx, ry, rw, 95), GUI.skin.box);
            GUILayout.Label(GetText("ready_prompt"), alertStyle);
            GUILayout.Space(6);
            GUILayout.Label(GetText("controls_hint"), hudLabelStyle);
            GUILayout.EndArea();
        }
        else if (state == GameState.GameOver)
        {
            float modalW = 460f;
            float modalH = 240f;
            float mx = (Screen.width - modalW) * 0.5f;
            float my = (Screen.height - modalH) * 0.5f;

            GUILayout.BeginArea(new Rect(mx, my, modalW, modalH), GUI.skin.window);
            GUILayout.Space(12);

            GUILayout.Label("💥 " + GetText("gameover_title"), headerTitleStyle);
            GUILayout.Space(10);

            GUILayout.Label($"{GetText("score")}: {score}", hudValueStyle);
            GUILayout.Label($"Max Multiplier: x{multiplier}", hudLabelStyle);
            GUILayout.Space(14);

            if (GUILayout.Button(GetText("restart"), btnStyle, GUILayout.Height(40)))
            {
                SetupStage(currentStageIndex);
            }

            GUILayout.EndArea();
        }

        // 4. Stage Select Modal
        if (showStageSelect)
        {
            float ssw = 540f;
            float ssh = 420f;
            float ssx = (Screen.width - ssw) * 0.5f;
            float ssy = (Screen.height - ssh) * 0.5f;

            GUILayout.BeginArea(new Rect(ssx, ssy, ssw, ssh), GUI.skin.window);
            GUILayout.Label($"📋 {GetText("stage_select")} (12 Missions)", headerTitleStyle);
            GUILayout.Space(8);

            for (int r = 0; r < 6; r++)
            {
                GUILayout.BeginHorizontal();
                for (int c = 0; c < 2; c++)
                {
                    int idx = r * 2 + c;
                    if (idx < Stages.Length)
                    {
                        bool isCur = (!isEndlessMode && currentStageIndex == idx);
                        GUI.backgroundColor = isCur ? new Color(0.2f, 0.8f, 0.4f) : Color.white;
                        if (GUILayout.Button($"M{idx + 1}: {GetStageName(idx)}", btnStyle, GUILayout.Height(32)))
                        {
                            isEndlessMode = false;
                            showStageSelect = false;
                            SetupStage(idx);
                        }
                    }
                }
                GUILayout.EndHorizontal();
                GUILayout.Space(3);
            }

            GUILayout.Space(8);

            GUI.backgroundColor = isEndlessMode ? new Color(1f, 0.6f, 0.2f) : new Color(0.3f, 0.5f, 0.9f);
            if (GUILayout.Button($"♾️ {GetText("endless")}", btnStyle, GUILayout.Height(36)))
            {
                isEndlessMode = true;
                showStageSelect = false;
                SetupStage(0);
            }
            GUI.backgroundColor = Color.white;

            GUILayout.Space(6);
            if (GUILayout.Button("Close", btnStyle, GUILayout.Height(28)))
            {
                showStageSelect = false;
            }

            GUILayout.EndArea();
        }

        if (Input.GetKeyDown(KeyCode.R))
        {
            SetupStage(currentStageIndex);
        }
    }
}
