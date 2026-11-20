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

public class GravityRollerPlayer : MonoBehaviour
{
    public enum GameLang { KO, EN, JA, ES }
    public static GameLang CurrentLang = GameLang.KO;

    public enum GameState { Ready, Playing, Falling, Cleared, GameOver }
    public GameState state = GameState.Ready;

    // --- Audio Synthesis ---
    private AudioSource sfxSource;
    private AudioSource rollSource;
    private AudioClip rollLoopClip;

    // --- Visual Materials ---
    private Material ballMat;
    private Material boardMat;
    private Material wallMat;
    private Material holeMat;
    private Material gemMat;
    private Material bumperMat;
    private Material boosterMat;
    private Material goalMat;

    // --- Physics & Ball State (Zero-Collider Math) ---
    private GameObject boardGo;
    private GameObject ballGo;
    private Camera mainCam;

    private Vector3 ballPos;
    private Vector3 ballVel;
    private Quaternion ballRot = Quaternion.identity;
    private float ballRadius = 0.55f;

    private float tiltX = 0f; // Degrees (-18 to +18) - pitch
    private float tiltZ = 0f; // Degrees (-18 to +18) - roll
    private const float MaxTilt = 18f;
    private const float TiltSensitivity = 38f;
    private const float TiltDecay = 28f;
    private const float Gravity = 18.0f;
    private const float Friction = 0.982f;
    private const float Restitution = 0.65f;

    private float stageTimer = 60f;
    private int score = 0;
    private int gemsCollected = 0;
    private int totalGemsInStage = 0;
    private int lives = 3;

    // --- Camera ---
    private Vector3 camVel;

    // --- Stage Definitions ---
    public struct StageDef
    {
        public int id;
        public string nameKo;
        public string nameEn;
        public string nameJa;
        public string nameEs;
        public float timeLimit;
        public Vector2 boardSize; // Width (X), Length (Z)
        public Color boardColor;
        public Color wallColor;
        public int gemCount;
        public int holeCount;
        public int bumperCount;
        public int boosterCount;
    }

    private static readonly StageDef[] Stages = new StageDef[]
    {
        new StageDef { id = 1, nameKo = "초심자 평원", nameEn = "Beginner Flats", nameJa = "ビギナー平原", nameEs = "Llanuras para Principiantes", timeLimit = 45f, boardSize = new Vector2(16f, 22f), boardColor = new Color(0.18f, 0.35f, 0.45f), wallColor = new Color(0.25f, 0.55f, 0.75f), gemCount = 5, holeCount = 1, bumperCount = 0, boosterCount = 0 },
        new StageDef { id = 2, nameKo = "지그재그 회랑", nameEn = "Zigzag Corridors", nameJa = "ジグザグ回廊", nameEs = "Pasillos en Zigzag", timeLimit = 50f, boardSize = new Vector2(18f, 26f), boardColor = new Color(0.25f, 0.22f, 0.42f), wallColor = new Color(0.45f, 0.38f, 0.72f), gemCount = 7, holeCount = 3, bumperCount = 2, boosterCount = 1 },
        new StageDef { id = 3, nameKo = "탄성 범퍼 골목", nameEn = "Bumper Alley", nameJa = "弾性バンパー通り", nameEs = "Callejón de Rebotes", timeLimit = 55f, boardSize = new Vector2(20f, 28f), boardColor = new Color(0.15f, 0.38f, 0.32f), wallColor = new Color(0.2f, 0.72f, 0.55f), gemCount = 8, holeCount = 4, bumperCount = 6, boosterCount = 2 },
        new StageDef { id = 4, nameKo = "구멍 함정 필드", nameEn = "Pitfall Field", nameJa = "落とし穴フィールド", nameEs = "Campo de Trampas", timeLimit = 60f, boardSize = new Vector2(20f, 30f), boardColor = new Color(0.42f, 0.22f, 0.18f), wallColor = new Color(0.85f, 0.45f, 0.25f), gemCount = 10, holeCount = 9, bumperCount = 3, boosterCount = 1 },
        new StageDef { id = 5, nameKo = "스피드 부스트 고속로", nameEn = "Speed Booster Highway", nameJa = "高速ブースター道路", nameEs = "Autovía de Superimpulso", timeLimit = 50f, boardSize = new Vector2(18f, 34f), boardColor = new Color(0.12f, 0.22f, 0.55f), wallColor = new Color(0.25f, 0.55f, 1f), gemCount = 12, holeCount = 5, bumperCount = 4, boosterCount = 5 },
        new StageDef { id = 6, nameKo = "외나무다리 도약", nameEn = "Narrow Bridge Crossing", nameJa = "一本橋の跳躍", nameEs = "Cruce de Puente Estrecho", timeLimit = 55f, boardSize = new Vector2(14f, 36f), boardColor = new Color(0.35f, 0.32f, 0.22f), wallColor = new Color(0.72f, 0.65f, 0.32f), gemCount = 10, holeCount = 7, bumperCount = 2, boosterCount = 2 },
        new StageDef { id = 7, nameKo = "움직이는 장애물 미로", nameEn = "Kinetic Barrier Maze", nameJa = "動く障害物迷路", nameEs = "Laberinto de Barreras Móviles", timeLimit = 65f, boardSize = new Vector2(22f, 32f), boardColor = new Color(0.38f, 0.15f, 0.35f), wallColor = new Color(0.75f, 0.25f, 0.68f), gemCount = 14, holeCount = 6, bumperCount = 6, boosterCount = 3 },
        new StageDef { id = 8, nameKo = "십자 교차로와 회전 날개", nameEn = "Crossroads & Spinners", nameJa = "十字路と回転ブレード", nameEs = "Encrucijada y Aspas", timeLimit = 65f, boardSize = new Vector2(24f, 34f), boardColor = new Color(0.22f, 0.38f, 0.48f), wallColor = new Color(0.35f, 0.75f, 0.95f), gemCount = 15, holeCount = 8, bumperCount = 8, boosterCount = 4 },
        new StageDef { id = 9, nameKo = "경사 램프와 슈퍼 점프", nameEn = "Ramp & Super Jump", nameJa = "傾斜スロープと大ジャンプ", nameEs = "Rampa y Gran Salto", timeLimit = 60f, boardSize = new Vector2(20f, 38f), boardColor = new Color(0.48f, 0.32f, 0.12f), wallColor = new Color(0.95f, 0.65f, 0.22f), gemCount = 16, holeCount = 9, bumperCount = 6, boosterCount = 5 },
        new StageDef { id = 10, nameKo = "핀볼 카오스 정글", nameEn = "Pinball Chaos Jungle", nameJa = "ピンボールカオス", nameEs = "Jungla de Pinball Caótico", timeLimit = 70f, boardSize = new Vector2(24f, 36f), boardColor = new Color(0.12f, 0.45f, 0.25f), wallColor = new Color(0.22f, 0.92f, 0.45f), gemCount = 18, holeCount = 10, bumperCount = 12, boosterCount = 6 },
        new StageDef { id = 11, nameKo = "나선형 타워 하강", nameEn = "Spiral Helix Descent", nameJa = "螺旋塔の降下", nameEs = "Descenso de Torre Helicoidal", timeLimit = 75f, boardSize = new Vector2(26f, 40f), boardColor = new Color(0.18f, 0.15f, 0.42f), wallColor = new Color(0.45f, 0.35f, 0.95f), gemCount = 20, holeCount = 12, bumperCount = 10, boosterCount = 6 },
        new StageDef { id = 12, nameKo = "그랜드 마스터 최종 시련", nameEn = "Grandmaster Final Trial", nameJa = "グランドマスターの最終試練", nameEs = "Prueba Final Gran Maestro", timeLimit = 90f, boardSize = new Vector2(28f, 45f), boardColor = new Color(0.08f, 0.08f, 0.18f), wallColor = new Color(1f, 0.85f, 0.25f), gemCount = 25, holeCount = 15, bumperCount = 14, boosterCount = 8 }
    };

    private int currentStageIndex = 0;
    private bool isEndlessMode = false;
    private bool showStageSelect = false;

    // --- Interactive Mathematical Elements (Zero-Collider) ---
    public class GemObj
    {
        public Vector3 localPos;
        public float radius = 0.75f;
        public bool collected = false;
        public GameObject viewGo;
    }

    public class HoleObj
    {
        public Vector3 localPos;
        public float radius = 0.95f;
        public GameObject viewGo;
    }

    public class BumperObj
    {
        public Vector3 localPos;
        public float radius = 1.25f;
        public float bounceForce = 16f;
        public GameObject viewGo;
    }

    public class BoosterObj
    {
        public Vector3 localPos;
        public Vector3 direction = Vector3.forward;
        public Vector2 size = new Vector2(2.5f, 2.5f);
        public float boostForce = 22f;
        public GameObject viewGo;
    }

    public class GoalObj
    {
        public Vector3 localPos;
        public float radius = 1.6f;
        public GameObject viewGo;
    }

    private List<GemObj> activeGems = new List<GemObj>();
    private List<HoleObj> activeHoles = new List<HoleObj>();
    private List<BumperObj> activeBumpers = new List<BumperObj>();
    private List<BoosterObj> activeBoosters = new List<BoosterObj>();
    private GoalObj activeGoal;

    private List<GameObject> wallVisuals = new List<GameObject>();

    // --- GUI Styling ---
    private GUIStyle headerTitleStyle;
    private GUIStyle headerSubStyle;
    private GUIStyle hudLabelStyle;
    private GUIStyle hudValueStyle;
    private GUIStyle btnStyle;

    private void Awake()
    {
        mainCam = Camera.main;
        if (mainCam == null)
        {
            var camGo = new GameObject("MainCamera");
            mainCam = camGo.AddComponent<Camera>();
            camGo.tag = "MainCamera";
        }
        mainCam.clearFlags = CameraClearFlags.SolidColor;
        mainCam.backgroundColor = new Color(0.04f, 0.06f, 0.12f);
        mainCam.fieldOfView = 58f;

        // Audio components
        sfxSource = gameObject.AddComponent<AudioSource>();
        rollSource = gameObject.AddComponent<AudioSource>();
        rollLoopClip = CreateRollAudioClip();
        rollSource.clip = rollLoopClip;
        rollSource.loop = true;
        rollSource.volume = 0f;
        rollSource.Play();

        // Shaders & Materials
        var unlitShader = Shader.Find("Hidden/Internal-Colored") ?? Shader.Find("Sprites/Default");
        ballMat = new Material(unlitShader) { color = new Color(0.95f, 0.95f, 1f) };
        boardMat = new Material(unlitShader) { color = Stages[0].boardColor };
        wallMat = new Material(unlitShader) { color = Stages[0].wallColor };
        holeMat = new Material(unlitShader) { color = new Color(0.02f, 0.02f, 0.03f) };
        gemMat = new Material(unlitShader) { color = new Color(0.2f, 0.95f, 1f) };
        bumperMat = new Material(unlitShader) { color = new Color(1f, 0.35f, 0.25f) };
        boosterMat = new Material(unlitShader) { color = new Color(1f, 0.85f, 0.15f) };
        goalMat = new Material(unlitShader) { color = new Color(0.35f, 1f, 0.45f) };

        CreateBoardAndBall();
        SetupStage(0);
    }

    private void CreateBoardAndBall()
    {
        // 1. Board GameObject (tilts as a whole)
        boardGo = new GameObject("GravityBoard");
        boardGo.transform.position = Vector3.zero;

        // Visual floor plane
        var floorGo = GameObject.CreatePrimitive(PrimitiveType.Cube);
        floorGo.name = "BoardFloor";
        floorGo.transform.SetParent(boardGo.transform);
        floorGo.transform.localPosition = new Vector3(0, -0.25f, 0);
        floorGo.transform.localScale = new Vector3(16f, 0.5f, 22f);
        var mr = floorGo.GetComponent<Renderer>();
        if (mr) mr.sharedMaterial = boardMat;

        // 2. Marble Ball GameObject
        ballGo = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        ballGo.name = "MarbleBall";
        ballGo.transform.SetParent(boardGo.transform);
        ballGo.transform.localScale = Vector3.one * (ballRadius * 2f);
        var bmr = ballGo.GetComponent<Renderer>();
        if (bmr) bmr.sharedMaterial = ballMat;
    }

    private void SetupStage(int index)
    {
        currentStageIndex = Mathf.Clamp(index, 0, Stages.Length - 1);
        StageDef s = Stages[currentStageIndex];

        stageTimer = s.timeLimit;
        boardMat.color = s.boardColor;
        wallMat.color = s.wallColor;

        tiltX = 0f;
        tiltZ = 0f;
        ballPos = new Vector3(0f, ballRadius, -s.boardSize.y * 0.5f + 2.5f);
        ballVel = Vector3.zero;
        ballRot = Quaternion.identity;
        gemsCollected = 0;
        totalGemsInStage = s.gemCount;

        if (ballGo != null)
        {
            ballGo.transform.localPosition = ballPos;
            ballGo.transform.localRotation = ballRot;
        }

        if (boardGo != null)
        {
            boardGo.transform.rotation = Quaternion.identity;
            var floor = boardGo.transform.Find("BoardFloor");
            if (floor) floor.localScale = new Vector3(s.boardSize.x, 0.5f, s.boardSize.y);
        }

        // Recreate World Elements
        ClearStageElements();
        GenerateStageElements(s);

        state = GameState.Ready;
    }

    private void ClearStageElements()
    {
        foreach (var g in activeGems) if (g.viewGo) Destroy(g.viewGo);
        activeGems.Clear();

        foreach (var h in activeHoles) if (h.viewGo) Destroy(h.viewGo);
        activeHoles.Clear();

        foreach (var b in activeBumpers) if (b.viewGo) Destroy(b.viewGo);
        activeBumpers.Clear();

        foreach (var bs in activeBoosters) if (bs.viewGo) Destroy(bs.viewGo);
        activeBoosters.Clear();

        if (activeGoal != null && activeGoal.viewGo) Destroy(activeGoal.viewGo);
        activeGoal = null;

        foreach (var w in wallVisuals) if (w) Destroy(w);
        wallVisuals.Clear();
    }

    private void GenerateStageElements(StageDef s)
    {
        float hw = s.boardSize.x * 0.5f;
        float hl = s.boardSize.y * 0.5f;

        // Outer Bounding Walls (North, South, East, West)
        CreateWall(new Vector3(0, 0.5f, hl), new Vector3(s.boardSize.x + 0.8f, 1f, 0.6f));
        CreateWall(new Vector3(0, 0.5f, -hl), new Vector3(s.boardSize.x + 0.8f, 1f, 0.6f));
        CreateWall(new Vector3(hw, 0.5f, 0), new Vector3(0.6f, 1f, s.boardSize.y));
        CreateWall(new Vector3(-hw, 0.5f, 0), new Vector3(0.6f, 1f, s.boardSize.y));

        // 1. Goal Destination Pad at the far end
        Vector3 goalPos = new Vector3(0f, 0.05f, hl - 3.0f);
        activeGoal = new GoalObj
        {
            localPos = goalPos,
            radius = 1.6f,
            viewGo = CreateGoalVisual(goalPos, 1.6f)
        };

        // 2. Gems distributed along the board
        float gemZStep = (s.boardSize.y - 8f) / (s.gemCount + 1);
        for (int i = 1; i <= s.gemCount; i++)
        {
            float z = -hl + 4f + i * gemZStep;
            float x = Mathf.Sin(i * 1.8f) * (hw - 3f);
            var gem = new GemObj
            {
                localPos = new Vector3(x, 0.6f, z),
                radius = 0.75f,
                collected = false,
                viewGo = CreateGemVisual(new Vector3(x, 0.6f, z))
            };
            activeGems.Add(gem);
        }

        // 3. Trap Holes
        for (int i = 0; i < s.holeCount; i++)
        {
            float z = Mathf.Lerp(-hl + 6f, hl - 5f, (float)(i + 0.5f) / s.holeCount);
            float x = Mathf.Cos(i * 2.2f) * (hw - 3.5f);
            var hole = new HoleObj
            {
                localPos = new Vector3(x, 0.02f, z),
                radius = 0.95f,
                viewGo = CreateHoleVisual(new Vector3(x, 0.02f, z), 0.95f)
            };
            activeHoles.Add(hole);
        }

        // 4. Bumpers
        for (int i = 0; i < s.bumperCount; i++)
        {
            float z = UnityEngine.Random.Range(-hl + 5f, hl - 5f);
            float x = UnityEngine.Random.Range(-hw + 3.5f, hw - 3.5f);
            var bumper = new BumperObj
            {
                localPos = new Vector3(x, 0.5f, z),
                radius = 1.25f,
                bounceForce = 16f,
                viewGo = CreateBumperVisual(new Vector3(x, 0.5f, z), 1.25f)
            };
            activeBumpers.Add(bumper);
        }

        // 5. Booster Pads
        for (int i = 0; i < s.boosterCount; i++)
        {
            float z = Mathf.Lerp(-hl + 8f, hl - 8f, (float)(i + 0.5f) / s.boosterCount);
            float x = (i % 2 == 0 ? -1f : 1f) * (hw * 0.4f);
            var booster = new BoosterObj
            {
                localPos = new Vector3(x, 0.04f, z),
                direction = Vector3.forward,
                boostForce = 22f,
                viewGo = CreateBoosterVisual(new Vector3(x, 0.04f, z), Vector3.forward)
            };
            activeBoosters.Add(booster);
        }
    }

    private void CreateWall(Vector3 localPos, Vector3 scale)
    {
        var wall = GameObject.CreatePrimitive(PrimitiveType.Cube);
        wall.name = "Wall";
        wall.transform.SetParent(boardGo.transform);
        wall.transform.localPosition = localPos;
        wall.transform.localScale = scale;
        var r = wall.GetComponent<Renderer>();
        if (r) r.sharedMaterial = wallMat;
        wallVisuals.Add(wall);
    }

    private GameObject CreateGoalVisual(Vector3 localPos, float radius)
    {
        var go = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        go.name = "GoalPad";
        go.transform.SetParent(boardGo.transform);
        go.transform.localPosition = localPos;
        go.transform.localScale = new Vector3(radius * 2f, 0.05f, radius * 2f);
        var r = go.GetComponent<Renderer>();
        if (r) r.sharedMaterial = goalMat;
        return go;
    }

    private GameObject CreateGemVisual(Vector3 localPos)
    {
        var go = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        go.name = "GemDiamond";
        go.transform.SetParent(boardGo.transform);
        go.transform.localPosition = localPos;
        go.transform.localScale = new Vector3(0.7f, 1.1f, 0.7f);
        var r = go.GetComponent<Renderer>();
        if (r) r.sharedMaterial = gemMat;
        return go;
    }

    private GameObject CreateHoleVisual(Vector3 localPos, float radius)
    {
        var go = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        go.name = "TrapHole";
        go.transform.SetParent(boardGo.transform);
        go.transform.localPosition = localPos;
        go.transform.localScale = new Vector3(radius * 2f, 0.02f, radius * 2f);
        var r = go.GetComponent<Renderer>();
        if (r) r.sharedMaterial = holeMat;
        return go;
    }

    private GameObject CreateBumperVisual(Vector3 localPos, float radius)
    {
        var go = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        go.name = "BumperCylinder";
        go.transform.SetParent(boardGo.transform);
        go.transform.localPosition = localPos;
        go.transform.localScale = new Vector3(radius * 2f, 0.7f, radius * 2f);
        var r = go.GetComponent<Renderer>();
        if (r) r.sharedMaterial = bumperMat;
        return go;
    }

    private GameObject CreateBoosterVisual(Vector3 localPos, Vector3 dir)
    {
        var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
        go.name = "BoosterPad";
        go.transform.SetParent(boardGo.transform);
        go.transform.localPosition = localPos;
        go.transform.localScale = new Vector3(2.4f, 0.04f, 2.8f);
        var r = go.GetComponent<Renderer>();
        if (r) r.sharedMaterial = boosterMat;
        return go;
    }

    private void Update()
    {
        // Global Keyboard Shortcut: L to cycle language
        if (Input.GetKeyDown(KeyCode.L))
        {
            CurrentLang = (GameLang)(((int)CurrentLang + 1) % 4);
        }

        switch (state)
        {
            case GameState.Ready:
                UpdateReady();
                break;
            case GameState.Playing:
                UpdatePlaying();
                break;
            case GameState.Falling:
                UpdateFalling();
                break;
            case GameState.Cleared:
            case GameState.GameOver:
                UpdatePostGame();
                break;
        }

        UpdateCamera();
    }

    private void UpdateReady()
    {
        // Click, Space, Enter, or Arrow key to start
        if (Input.GetKeyDown(KeyCode.Space) || Input.GetKeyDown(KeyCode.Return) || Input.GetMouseButtonDown(0) ||
            Input.GetAxisRaw("Horizontal") != 0f || Input.GetAxisRaw("Vertical") != 0f)
        {
            state = GameState.Playing;
            PlaySoundStart();
        }
    }

    private void UpdatePlaying()
    {
        float dt = Time.deltaTime;
        stageTimer -= dt;
        if (stageTimer <= 0f)
        {
            stageTimer = 0f;
            state = GameState.GameOver;
            PlaySoundGameOver();
            return;
        }

        // 1. Tilt Input Controls (Keyboard WASD, Arrows, or Mouse Drag)
        float inputPitch = 0f;
        float inputRoll = 0f;

        if (Input.GetKey(KeyCode.W) || Input.GetKey(KeyCode.UpArrow)) inputPitch += 1f;
        if (Input.GetKey(KeyCode.S) || Input.GetKey(KeyCode.DownArrow)) inputPitch -= 1f;
        if (Input.GetKey(KeyCode.A) || Input.GetKey(KeyCode.LeftArrow)) inputRoll -= 1f;
        if (Input.GetKey(KeyCode.D) || Input.GetKey(KeyCode.RightArrow)) inputRoll += 1f;

        if (Input.GetMouseButton(0))
        {
            float normX = (Input.mousePosition.x / Screen.width - 0.5f) * 2f;
            float normY = (Input.mousePosition.y / Screen.height - 0.5f) * 2f;
            if (Mathf.Abs(normX) > 0.1f) inputRoll = Mathf.Clamp(normX * 1.4f, -1f, 1f);
            if (Mathf.Abs(normY) > 0.1f) inputPitch = Mathf.Clamp(normY * 1.4f, -1f, 1f);
        }

        // Update Tilt angles
        if (Mathf.Abs(inputPitch) > 0.05f)
        {
            tiltX += inputPitch * TiltSensitivity * dt;
        }
        else
        {
            tiltX = Mathf.MoveTowards(tiltX, 0f, TiltDecay * dt);
        }

        if (Mathf.Abs(inputRoll) > 0.05f)
        {
            tiltZ -= inputRoll * TiltSensitivity * dt;
        }
        else
        {
            tiltZ = Mathf.MoveTowards(tiltZ, 0f, TiltDecay * dt);
        }

        tiltX = Mathf.Clamp(tiltX, -MaxTilt, MaxTilt);
        tiltZ = Mathf.Clamp(tiltZ, -MaxTilt, MaxTilt);

        // Apply tilt rotation to board
        boardGo.transform.rotation = Quaternion.Euler(tiltX, 0f, tiltZ);

        // 2. Physics Simulation (Zero-Collider Math)
        // Downhill acceleration on tilted board
        float radX = tiltX * Mathf.Deg2Rad;
        float radZ = tiltZ * Mathf.Deg2Rad;

        // tiltX > 0 tilts board forward, ball rolls forward (+Z)
        float accelZ = Mathf.Sin(radX) * Gravity;
        // tiltZ < 0 tilts board right, ball rolls right (+X)
        float accelX = -Mathf.Sin(radZ) * Gravity;

        ballVel.x += accelX * dt;
        ballVel.z += accelZ * dt;

        // Friction / drag
        ballVel.x *= Mathf.Pow(Friction, dt * 60f);
        ballVel.z *= Mathf.Pow(Friction, dt * 60f);

        // Update position in board local space
        ballPos.x += ballVel.x * dt;
        ballPos.z += ballVel.z * dt;

        // 3. Wall Collisions & Bouncing
        StageDef s = Stages[currentStageIndex];
        float hw = s.boardSize.x * 0.5f - ballRadius;
        float hl = s.boardSize.y * 0.5f - ballRadius;

        if (ballPos.x < -hw)
        {
            ballPos.x = -hw;
            ballVel.x = -ballVel.x * Restitution;
            PlaySoundBounce(Mathf.Abs(ballVel.x));
        }
        else if (ballPos.x > hw)
        {
            ballPos.x = hw;
            ballVel.x = -ballVel.x * Restitution;
            PlaySoundBounce(Mathf.Abs(ballVel.x));
        }

        if (ballPos.z < -hl)
        {
            ballPos.z = -hl;
            ballVel.z = -ballVel.z * Restitution;
            PlaySoundBounce(Mathf.Abs(ballVel.z));
        }
        else if (ballPos.z > hl)
        {
            ballPos.z = hl;
            ballVel.z = -ballVel.z * Restitution;
            PlaySoundBounce(Mathf.Abs(ballVel.z));
        }

        // 4. Gem Proximity & Collection
        foreach (var g in activeGems)
        {
            if (g.collected) continue;
            float dx = ballPos.x - g.localPos.x;
            float dz = ballPos.z - g.localPos.z;
            float distSq = dx * dx + dz * dz;

            if (distSq <= (ballRadius + g.radius) * (ballRadius + g.radius))
            {
                g.collected = true;
                gemsCollected++;
                score += 250;
                stageTimer += 2.0f; // Time bonus
                if (g.viewGo) g.viewGo.SetActive(false);
                PlaySoundGemCollect();
            }
            else if (g.viewGo)
            {
                // Gentle spin
                g.viewGo.transform.localRotation = Quaternion.Euler(0, Time.time * 90f, 0);
            }
        }

        // 5. Bumper Proximity & Elastic Push
        foreach (var b in activeBumpers)
        {
            float dx = ballPos.x - b.localPos.x;
            float dz = ballPos.z - b.localPos.z;
            float distSq = dx * dx + dz * dz;
            float minDist = ballRadius + b.radius;

            if (distSq <= minDist * minDist)
            {
                float dist = Mathf.Max(0.01f, Mathf.Sqrt(distSq));
                Vector3 normal = new Vector3(dx / dist, 0f, dz / dist);
                ballPos.x = b.localPos.x + normal.x * (minDist + 0.05f);
                ballPos.z = b.localPos.z + normal.z * (minDist + 0.05f);
                ballVel = normal * b.bounceForce;
                score += 75;
                PlaySoundBumper();
            }
        }

        // 6. Booster Pad Surge
        foreach (var bs in activeBoosters)
        {
            float dx = Mathf.Abs(ballPos.x - bs.localPos.x);
            float dz = Mathf.Abs(ballPos.z - bs.localPos.z);
            if (dx <= bs.size.x * 0.5f && dz <= bs.size.y * 0.5f)
            {
                ballVel += bs.direction * bs.boostForce * dt * 4f;
                PlaySoundBooster();
            }
        }

        // 7. Hole Traps Check (Fall into abyss)
        foreach (var h in activeHoles)
        {
            float dx = ballPos.x - h.localPos.x;
            float dz = ballPos.z - h.localPos.z;
            if (dx * dx + dz * dz <= h.radius * h.radius)
            {
                state = GameState.Falling;
                PlaySoundHoleFall();
                StartCoroutine(HandleHoleFall());
                return;
            }
        }

        // 8. Goal Pad Check (Clear stage)
        if (activeGoal != null)
        {
            float dx = ballPos.x - activeGoal.localPos.x;
            float dz = ballPos.z - activeGoal.localPos.z;
            if (dx * dx + dz * dz <= activeGoal.radius * activeGoal.radius)
            {
                state = GameState.Cleared;
                int timeBonus = Mathf.RoundToInt(stageTimer * 30f);
                int gemBonus = gemsCollected * 200;
                score += 1000 + timeBonus + gemBonus;
                PlaySoundVictory();
            }
        }

        // 9. Ball Visual Transform & Rolling Rotation
        ballGo.transform.localPosition = ballPos;

        // Angular rotation from linear velocity (omega = v / r)
        float speed = new Vector2(ballVel.x, ballVel.z).magnitude;
        if (speed > 0.05f)
        {
            Vector3 rollAxis = Vector3.Cross(Vector3.up, new Vector3(ballVel.x, 0, ballVel.z)).normalized;
            float angle = (speed / ballRadius) * Mathf.Rad2Deg * dt;
            ballRot = Quaternion.AngleAxis(angle, rollAxis) * ballRot;
            ballGo.transform.localRotation = ballRot;
        }

        // 10. Roll Sound Volume & Pitch
        if (rollSource != null)
        {
            float normSpeed = Mathf.Clamp01(speed / 18f);
            rollSource.volume = Mathf.Lerp(0.0f, 0.45f, normSpeed);
            rollSource.pitch = Mathf.Lerp(0.6f, 1.3f, normSpeed);
        }
    }

    private IEnumerator HandleHoleFall()
    {
        float t = 0f;
        Vector3 startPos = ballPos;
        while (t < 0.6f)
        {
            t += Time.deltaTime;
            ballPos.y = Mathf.Lerp(ballRadius, -3.5f, t / 0.6f);
            ballGo.transform.localPosition = ballPos;
            yield return null;
        }

        lives--;
        if (lives > 0)
        {
            // Respawn ball at stage start
            StageDef s = Stages[currentStageIndex];
            ballPos = new Vector3(0f, ballRadius, -s.boardSize.y * 0.5f + 2.5f);
            ballVel = Vector3.zero;
            ballGo.transform.localPosition = ballPos;
            state = GameState.Playing;
        }
        else
        {
            state = GameState.GameOver;
            PlaySoundGameOver();
        }
    }

    private void UpdateFalling()
    {
        // Smoothly fade roll sound
        if (rollSource && rollSource.volume > 0.01f)
        {
            rollSource.volume = Mathf.Lerp(rollSource.volume, 0f, Time.deltaTime * 6f);
        }
    }

    private void UpdatePostGame()
    {
        if (rollSource && rollSource.volume > 0.01f)
        {
            rollSource.volume = Mathf.Lerp(rollSource.volume, 0f, Time.deltaTime * 4f);
        }
    }

    private void UpdateCamera()
    {
        if (mainCam == null || boardGo == null) return;

        // Isometric overhead follower looking down on board
        StageDef s = Stages[currentStageIndex];
        float boardSpan = Mathf.Max(s.boardSize.x, s.boardSize.y);
        Vector3 targetCamPos = boardGo.transform.position + new Vector3(0f, boardSpan * 1.15f, -boardSpan * 0.75f);

        mainCam.transform.position = Vector3.SmoothDamp(mainCam.transform.position, targetCamPos, ref camVel, 0.12f);
        mainCam.transform.LookAt(boardGo.transform.position + new Vector3(0, 0, 1.5f));
    }

    // --- Procedural Sound Synthesis ---
    private AudioClip CreateRollAudioClip()
    {
        int sampleRate = 22050;
        int length = sampleRate;
        float[] samples = new float[length];
        System.Random rnd = new System.Random(88);

        float lastVal = 0f;
        for (int i = 0; i < length; i++)
        {
            float noise = (float)(rnd.NextDouble() * 2.0 - 1.0);
            lastVal = Mathf.Lerp(lastVal, noise, 0.12f);
            samples[i] = lastVal * 0.35f;
        }

        AudioClip clip = AudioClip.Create("RollRumble", length, 1, sampleRate, false);
        clip.SetData(samples, 0);
        return clip;
    }

    private void PlaySoundStart()
    {
        PlayTone(440f, 660f, 0.2f, 0.25f, true);
    }

    private void PlaySoundBounce(float impact)
    {
        float vol = Mathf.Clamp(impact / 12f, 0.1f, 0.4f);
        PlayTone(160f, 90f, 0.12f, vol, false);
    }

    private void PlaySoundGemCollect()
    {
        PlayTone(659.25f, 987.77f, 0.18f, 0.35f, true);
    }

    private void PlaySoundBumper()
    {
        PlayTone(280f, 540f, 0.22f, 0.38f, false);
    }

    private void PlaySoundBooster()
    {
        PlayTone(380f, 720f, 0.25f, 0.32f, true);
    }

    private void PlaySoundHoleFall()
    {
        PlayTone(320f, 80f, 0.45f, 0.4f, false);
    }

    private void PlaySoundGameOver()
    {
        PlayTone(220f, 110f, 0.5f, 0.45f, false);
    }

    private void PlaySoundVictory()
    {
        StartCoroutine(PlayVictoryFanfare());
    }

    private IEnumerator PlayVictoryFanfare()
    {
        PlayTone(523.25f, 523.25f, 0.15f, 0.3f, true);
        yield return new WaitForSeconds(0.15f);
        PlayTone(659.25f, 659.25f, 0.15f, 0.3f, true);
        yield return new WaitForSeconds(0.15f);
        PlayTone(783.99f, 783.99f, 0.2f, 0.3f, true);
        yield return new WaitForSeconds(0.2f);
        PlayTone(1046.50f, 1046.50f, 0.4f, 0.35f, true);
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

        AudioClip clip = AudioClip.Create("Tone", count, 1, sampleRate, false);
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
                    case "title": return "Gravity Roller 3D: Marble Maze";
                    case "ready_prompt": return "TILT TO ROLL OR PRESS SPACE!";
                    case "time": return "Time Left";
                    case "score": return "Score";
                    case "gems": return "Gems";
                    case "lives": return "Lives";
                    case "stage": return "Stage";
                    case "endless": return "Endless Rolling";
                    case "clear_title": return "STAGE COMPLETED!";
                    case "gameover_title": return "TIME OUT OR FALLEN!";
                    case "restart": return "RETRY [R]";
                    case "next_stage": return "NEXT STAGE";
                    case "stage_select": return "SELECT STAGE";
                    case "controls_hint": return "WASD / Arrows / Mouse Drag: Tilt Board | Space: Start | L: Language";
                }
                break;
            case GameLang.JA:
                switch (key)
                {
                    case "title": return "グラビティローラー3D：マーブル迷路";
                    case "ready_prompt": return "ボードを傾けるかSPACEでスタート！";
                    case "time": return "残り時間";
                    case "score": return "スコア";
                    case "gems": return "ジェム";
                    case "lives": return "残機";
                    case "stage": return "ステージ";
                    case "endless": return "エンドレス転がり";
                    case "clear_title": return "ステージクリア！";
                    case "gameover_title": return "時間切れまたは転落！";
                    case "restart": return "再挑戦 [R]";
                    case "next_stage": return "次のステージ";
                    case "stage_select": return "ステージ選択";
                    case "controls_hint": return "WASD / 矢印 / マウスドラッグ: ボード傾斜 | Space: 開始 | L: 言語切替";
                }
                break;
            case GameLang.ES:
                switch (key)
                {
                    case "title": return "Gravity Roller 3D: Laberinto de Canicas";
                    case "ready_prompt": return "¡INCLINA O PULSA ESPACIO PARA RODAR!";
                    case "time": return "Tiempo";
                    case "score": return "Puntos";
                    case "gems": return "Gemas";
                    case "lives": return "Vidas";
                    case "stage": return "Fase";
                    case "endless": return "Rodaje Infinito";
                    case "clear_title": return "¡FASE COMPLETADA!";
                    case "gameover_title": return "¡TIEMPO AGOTADO O CAÍDA!";
                    case "restart": return "REINTENTAR [R]";
                    case "next_stage": return "SIGUIENTE FASE";
                    case "stage_select": return "ELEGIR FASE";
                    case "controls_hint": return "WASD / Flechas / Arrastre: Inclinar tablero | Espacio: Iniciar | L: Idioma";
                }
                break;
            default: // KO
                switch (key)
                {
                    case "title": return "그래비티 롤러 3D: 마블 메이즈";
                    case "ready_prompt": return "보드를 기울이거나 SPACE로 롤링 시작!";
                    case "time": return "남은 시간";
                    case "score": return "점수";
                    case "gems": return "보석";
                    case "lives": return "생명";
                    case "stage": return "스테이지";
                    case "endless": return "무한 롤링";
                    case "clear_title": return "스테이지 클리어 성공!";
                    case "gameover_title": return "시간 초과 또는 추락!";
                    case "restart": return "다시 도전 [R]";
                    case "next_stage": return "다음 스테이지";
                    case "stage_select": return "스테이지 선택";
                    case "controls_hint": return "WASD / 방향키 / 마우스 드래그: 보드 기울이기 | Space: 시작 | L: 언어 변경";
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
    }

    private void OnGUI()
    {
        OiyoUiFont.Apply();
        InitGUIStyles();

        // 1. Top Header Bar
        GUILayout.BeginArea(new Rect(16, 14, Screen.width - 32, 60));
        GUILayout.BeginHorizontal();

        // Title & Subtitle
        GUILayout.BeginVertical(GUILayout.Width(340));
        GUILayout.Label("🔮 " + GetText("title"), headerTitleStyle);
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

        // Language Switcher (KO / EN / JA / ES)
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

        // 2. HUD Instruments (Time, Score, Gems, Lives, Tilt)
        float hudWidth = 600f;
        float hudX = (Screen.width - hudWidth) * 0.5f;
        GUILayout.BeginArea(new Rect(hudX, 80, hudWidth, 66), GUI.skin.box);
        GUILayout.BeginHorizontal();

        // Time Left
        GUILayout.BeginVertical(GUILayout.Width(100));
        GUILayout.Label(GetText("time"), hudLabelStyle);
        GUI.contentColor = stageTimer < 10f ? Color.red : Color.white;
        GUILayout.Label($"{stageTimer:F1}s", hudValueStyle);
        GUI.contentColor = Color.white;
        GUILayout.EndVertical();

        // Gems
        GUILayout.BeginVertical(GUILayout.Width(100));
        GUILayout.Label(GetText("gems"), hudLabelStyle);
        GUILayout.Label($"💎 {gemsCollected}/{totalGemsInStage}", hudValueStyle);
        GUILayout.EndVertical();

        // Lives
        GUILayout.BeginVertical(GUILayout.Width(90));
        GUILayout.Label(GetText("lives"), hudLabelStyle);
        GUILayout.Label("♥".Repeat(lives), hudValueStyle);
        GUILayout.EndVertical();

        // Tilt
        GUILayout.BeginVertical(GUILayout.Width(110));
        GUILayout.Label("Tilt (X, Z)", hudLabelStyle);
        GUILayout.Label($"{tiltX:F0}°, {tiltZ:F0}°", hudValueStyle);
        GUILayout.EndVertical();

        // Score
        GUILayout.BeginVertical(GUILayout.Width(110));
        GUILayout.Label(GetText("score"), hudLabelStyle);
        GUILayout.Label($"{score}", hudValueStyle);
        GUILayout.EndVertical();

        GUILayout.EndHorizontal();
        GUILayout.EndArea();

        // 3. Central Prompts (Ready / Clear / Game Over)
        if (state == GameState.Ready)
        {
            float rw = 480f;
            float rx = (Screen.width - rw) * 0.5f;
            float ry = Screen.height * 0.45f;
            GUILayout.BeginArea(new Rect(rx, ry, rw, 100), GUI.skin.box);
            GUILayout.Label(GetText("ready_prompt"), headerTitleStyle);
            GUILayout.Space(8);
            GUILayout.Label(GetText("controls_hint"), hudLabelStyle);
            GUILayout.EndArea();
        }
        else if (state == GameState.Cleared || state == GameState.GameOver)
        {
            float modalW = 460f;
            float modalH = 250f;
            float mx = (Screen.width - modalW) * 0.5f;
            float my = (Screen.height - modalH) * 0.5f;

            GUILayout.BeginArea(new Rect(mx, my, modalW, modalH), GUI.skin.window);
            GUILayout.Space(12);

            string titleStr = state == GameState.Cleared ? "🏆 " + GetText("clear_title")
                            : "💥 " + GetText("gameover_title");

            GUILayout.Label(titleStr, headerTitleStyle);
            GUILayout.Space(10);

            GUILayout.Label($"{GetText("score")}: {score}", hudValueStyle);
            GUILayout.Label($"{GetText("gems")}: {gemsCollected}/{totalGemsInStage} | Time Remaining: {stageTimer:F1}s", hudLabelStyle);
            GUILayout.Space(14);

            GUILayout.BeginHorizontal();
            if (GUILayout.Button(GetText("restart"), btnStyle, GUILayout.Height(40)))
            {
                lives = 3;
                SetupStage(currentStageIndex);
            }

            if (state == GameState.Cleared && currentStageIndex + 1 < Stages.Length)
            {
                if (GUILayout.Button(GetText("next_stage"), btnStyle, GUILayout.Height(40)))
                {
                    SetupStage(currentStageIndex + 1);
                }
            }
            GUILayout.EndHorizontal();

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
            GUILayout.Label($"📋 {GetText("stage_select")} (12 Stages)", headerTitleStyle);
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
                        if (GUILayout.Button($"Stage {idx + 1}: {GetStageName(idx)}", btnStyle, GUILayout.Height(32)))
                        {
                            isEndlessMode = false;
                            showStageSelect = false;
                            lives = 3;
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
                lives = 3;
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
            lives = 3;
            SetupStage(currentStageIndex);
        }
    }
}
