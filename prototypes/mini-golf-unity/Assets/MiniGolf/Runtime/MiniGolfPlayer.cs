using System;
using System.Collections.Generic;
using UnityEngine;

public class MiniGolfPlayer : MonoBehaviour
{
    const int TotalHoles = 12;
    const float BallRadius = 0.15f;
    const float CupRadius = 0.35f;

    // Hole Course Definition
    public struct HoleDef
    {
        public int holeNum;
        public string titleKo;
        public string titleEn;
        public int par;
        public Vector3 teePos;
        public Vector3 cupPos;
        public Vector2 boundsMin;
        public Vector2 boundsMax;
        public bool hasWindmill;
        public bool hasBunker;
        public bool hasWater;
    }

    static readonly HoleDef[] Holes = new HoleDef[]
    {
        new HoleDef { holeNum = 1, titleKo = "그린 스타터", titleEn = "Green Starter", par = 2, teePos = new Vector3(0, 0.15f, -6f), cupPos = new Vector3(0, 0.05f, 6f), boundsMin = new Vector2(-2.5f, -7.5f), boundsMax = new Vector2(2.5f, 7.5f), hasWindmill = false, hasBunker = false, hasWater = false },
        new HoleDef { holeNum = 2, titleKo = "도그레그 엘보우", titleEn = "Dogleg Elbow", par = 3, teePos = new Vector3(-3f, 0.15f, -6f), cupPos = new Vector3(4f, 0.05f, 5f), boundsMin = new Vector2(-4.5f, -7.5f), boundsMax = new Vector2(5.5f, 7.5f), hasWindmill = false, hasBunker = false, hasWater = false },
        new HoleDef { holeNum = 3, titleKo = "샌드 벙커 아일랜드", titleEn = "Bunker Island", par = 3, teePos = new Vector3(0, 0.15f, -6f), cupPos = new Vector3(0, 0.05f, 6.5f), boundsMin = new Vector2(-3.5f, -7.5f), boundsMax = new Vector2(3.5f, 8f), hasWindmill = false, hasBunker = true, hasWater = false },
        new HoleDef { holeNum = 4, titleKo = "풍차 회전 날개", titleEn = "The Windmill", par = 3, teePos = new Vector3(0, 0.15f, -6.5f), cupPos = new Vector3(0, 0.05f, 6.5f), boundsMin = new Vector2(-3f, -8f), boundsMax = new Vector2(3f, 8f), hasWindmill = true, hasBunker = false, hasWater = false },
        new HoleDef { holeNum = 5, titleKo = "캐슬 스톤 브릿지", titleEn = "Castle Bridge", par = 4, teePos = new Vector3(0, 0.15f, -7f), cupPos = new Vector3(0, 0.05f, 7f), boundsMin = new Vector2(-3f, -8.5f), boundsMax = new Vector2(3f, 8.5f), hasWindmill = false, hasBunker = false, hasWater = true },
        new HoleDef { holeNum = 6, titleKo = "스플릿 페어웨이", titleEn = "Split Fairways", par = 3, teePos = new Vector3(0, 0.15f, -6f), cupPos = new Vector3(0, 0.05f, 6f), boundsMin = new Vector2(-4f, -7.5f), boundsMax = new Vector2(4f, 7.5f), hasWindmill = false, hasBunker = true, hasWater = false },
        new HoleDef { holeNum = 7, titleKo = "스피드 루프 언덕", titleEn = "Loop-the-Loop", par = 4, teePos = new Vector3(0, 0.15f, -7f), cupPos = new Vector3(0, 0.05f, 7f), boundsMin = new Vector2(-3.5f, -8.5f), boundsMax = new Vector2(3.5f, 8.5f), hasWindmill = false, hasBunker = false, hasWater = false },
        new HoleDef { holeNum = 8, titleKo = "워터릴리 연못", titleEn = "Water Lily Pond", par = 4, teePos = new Vector3(-2f, 0.15f, -6.5f), cupPos = new Vector3(2.5f, 0.05f, 6.5f), boundsMin = new Vector2(-4f, -8f), boundsMax = new Vector2(4f, 8f), hasWindmill = false, hasBunker = false, hasWater = true },
        new HoleDef { holeNum = 9, titleKo = "트윈 터널 미로", titleEn = "Twin Tunnels", par = 3, teePos = new Vector3(0, 0.15f, -6f), cupPos = new Vector3(0, 0.05f, 6.5f), boundsMin = new Vector2(-3.5f, -7.5f), boundsMax = new Vector2(3.5f, 8f), hasWindmill = false, hasBunker = true, hasWater = false },
        new HoleDef { holeNum = 10, titleKo = "피라미드 정상", titleEn = "Pyramid Slopes", par = 4, teePos = new Vector3(0, 0.15f, -7f), cupPos = new Vector3(0, 0.05f, 6f), boundsMin = new Vector2(-4f, -8.5f), boundsMax = new Vector2(4f, 8f), hasWindmill = false, hasBunker = false, hasWater = false },
        new HoleDef { holeNum = 11, titleKo = "화산 분화구 림", titleEn = "Volcano Rim", par = 4, teePos = new Vector3(0, 0.15f, -6.5f), cupPos = new Vector3(0, 0.05f, 6.5f), boundsMin = new Vector2(-4f, -8f), boundsMax = new Vector2(4f, 8f), hasWindmill = false, hasBunker = true, hasWater = true },
        new HoleDef { holeNum = 12, titleKo = "챔피언십 18번홀 파이널", titleEn = "Championship Final", par = 5, teePos = new Vector3(0, 0.15f, -8f), cupPos = new Vector3(0, 0.05f, 8f), boundsMin = new Vector2(-4.5f, -9.5f), boundsMax = new Vector2(4.5f, 9.5f), hasWindmill = true, hasBunker = true, hasWater = true }
    };

    enum GameStatus { Aiming, Dragging, Rolling, Holed, TournamentComplete }

    // State Variables
    int currentHoleIndex = 0;
    int strokesThisHole = 0;
    int totalStrokes = 0;
    int[] holeScores = new int[TotalHoles];
    GameStatus status = GameStatus.Aiming;

    // Ball Physics State
    Vector3 ballPos;
    Vector3 ballVel;
    GameObject ballObj;
    GameObject cupObj;
    GameObject flagPole;
    GameObject windmillBlades;
    List<GameObject> courseObjects = new List<GameObject>();

    // Aiming State
    Vector2 dragStartMousePos;
    Vector3 aimDirection = Vector3.forward;
    float aimPower = 0f; // 0 to 1
    bool showHoleSelectModal = false;
    string celebrationTitle = "";

    // Visuals & Camera
    Camera mainCam;
    AudioSource audioSource;
    Material greenMat;
    Material borderMat;
    Material bunkerMat;
    Material waterMat;
    Material ballMat;
    Material cupMat;
    Material flagMat;

    void Awake()
    {
        mainCam = Camera.main;
        if (mainCam == null)
        {
            var camGo = new GameObject("Main Camera");
            mainCam = camGo.AddComponent<Camera>();
            camGo.tag = "MainCamera";
        }
        mainCam.backgroundColor = new Color(0.12f, 0.22f, 0.15f);
        mainCam.clearFlags = CameraClearFlags.SolidColor;
        mainCam.fieldOfView = 50f;

        // Warm Sunlight
        var lightGo = new GameObject("CourseSun");
        var light = lightGo.AddComponent<Light>();
        light.type = LightType.Directional;
        light.color = new Color(1.0f, 0.98f, 0.9f);
        light.intensity = 1.35f;
        lightGo.transform.rotation = Quaternion.Euler(45f, -25f, 0);

        audioSource = gameObject.AddComponent<AudioSource>();

        CreateMaterials();
        BuildBall();
        BuildCupAndFlag();
        InitHole(0);
    }

    void CreateMaterials()
    {
        Shader diffuse = Shader.Find("Mobile/Diffuse") ?? Shader.Find("Standard");

        greenMat = new Material(diffuse) { color = new Color(0.24f, 0.62f, 0.32f) }; // Putting Green
        borderMat = new Material(diffuse) { color = new Color(0.45f, 0.32f, 0.2f) }; // Wood Cushion
        bunkerMat = new Material(diffuse) { color = new Color(0.85f, 0.78f, 0.55f) }; // Sand Bunker
        waterMat = new Material(diffuse) { color = new Color(0.18f, 0.45f, 0.75f) }; // Water Hazard
        ballMat = new Material(diffuse) { color = Color.white };
        cupMat = new Material(diffuse) { color = new Color(0.15f, 0.15f, 0.18f) };
        flagMat = new Material(diffuse) { color = new Color(0.95f, 0.25f, 0.2f) }; // Red Flag
    }

    void BuildBall()
    {
        ballObj = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        ballObj.name = "GolfBall";
        ballObj.transform.localScale = Vector3.one * (BallRadius * 2f);
        ballObj.GetComponent<MeshRenderer>().sharedMaterial = ballMat;
    }

    void BuildCupAndFlag()
    {
        cupObj = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        cupObj.name = "HoleCup";
        cupObj.transform.localScale = new Vector3(CupRadius * 2f, 0.05f, CupRadius * 2f);
        cupObj.GetComponent<MeshRenderer>().sharedMaterial = cupMat;

        flagPole = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        flagPole.name = "FlagPole";
        flagPole.transform.localScale = new Vector3(0.04f, 1.2f, 0.04f);
        flagPole.GetComponent<MeshRenderer>().sharedMaterial = ballMat;

        var flag = GameObject.CreatePrimitive(PrimitiveType.Cube);
        flag.name = "FlagCloth";
        flag.transform.SetParent(flagPole.transform);
        flag.transform.localPosition = new Vector3(0.25f, 0.8f, 0);
        flag.transform.localScale = new Vector3(0.5f, 0.3f, 0.02f);
        flag.GetComponent<MeshRenderer>().sharedMaterial = flagMat;
    }

    void InitHole(int holeIdx)
    {
        currentHoleIndex = Mathf.Clamp(holeIdx, 0, TotalHoles - 1);
        HoleDef def = Holes[currentHoleIndex];

        strokesThisHole = 0;
        status = GameStatus.Aiming;
        celebrationTitle = "";

        // Position Ball & Cup
        ballPos = def.teePos;
        ballVel = Vector3.zero;
        ballObj.transform.position = ballPos;

        cupObj.transform.position = new Vector3(def.cupPos.x, 0.02f, def.cupPos.z);
        flagPole.transform.position = new Vector3(def.cupPos.x, 1.2f, def.cupPos.z);

        // Clear Old Course
        foreach (var go in courseObjects) Destroy(go);
        courseObjects.Clear();
        windmillBlades = null;

        // Build Course Geometry
        BuildCourseMesh(def);

        PlaySound(440f, 0.15f);
    }

    void BuildCourseMesh(HoleDef def)
    {
        float w = def.boundsMax.x - def.boundsMin.x;
        float l = def.boundsMax.y - def.boundsMin.y;
        Vector3 center = new Vector3((def.boundsMin.x + def.boundsMax.x) * 0.5f, 0, (def.boundsMin.y + def.boundsMax.y) * 0.5f);

        // 1. Green Floor
        var floor = GameObject.CreatePrimitive(PrimitiveType.Cube);
        floor.transform.position = center - Vector3.up * 0.05f;
        floor.transform.localScale = new Vector3(w, 0.1f, l);
        floor.GetComponent<MeshRenderer>().sharedMaterial = greenMat;
        courseObjects.Add(floor);

        // 2. Wooden Cushion Borders (Left, Right, Bottom, Top)
        float wallThickness = 0.35f;
        float wallHeight = 0.45f;

        // Left
        BuildWall(new Vector3(def.boundsMin.x - wallThickness * 0.5f, wallHeight * 0.5f, center.z), new Vector3(wallThickness, wallHeight, l + wallThickness * 2f));
        // Right
        BuildWall(new Vector3(def.boundsMax.x + wallThickness * 0.5f, wallHeight * 0.5f, center.z), new Vector3(wallThickness, wallHeight, l + wallThickness * 2f));
        // Bottom
        BuildWall(new Vector3(center.x, wallHeight * 0.5f, def.boundsMin.y - wallThickness * 0.5f), new Vector3(w, wallHeight, wallThickness));
        // Top
        BuildWall(new Vector3(center.x, wallHeight * 0.5f, def.boundsMax.y + wallThickness * 0.5f), new Vector3(w, wallHeight, wallThickness));

        // 3. Sand Bunkers
        if (def.hasBunker)
        {
            var bunker = GameObject.CreatePrimitive(PrimitiveType.Cube);
            bunker.transform.position = new Vector3(center.x + 1.2f, 0.01f, center.z);
            bunker.transform.localScale = new Vector3(1.6f, 0.05f, 2.8f);
            bunker.GetComponent<MeshRenderer>().sharedMaterial = bunkerMat;
            courseObjects.Add(bunker);
        }

        // 4. Water Hazards
        if (def.hasWater)
        {
            var water = GameObject.CreatePrimitive(PrimitiveType.Cube);
            water.transform.position = new Vector3(center.x - 1.2f, 0.01f, center.z);
            water.transform.localScale = new Vector3(1.6f, 0.05f, 3.2f);
            water.GetComponent<MeshRenderer>().sharedMaterial = waterMat;
            courseObjects.Add(water);
        }

        // 5. Windmill Obstacle
        if (def.hasWindmill)
        {
            var tower = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            tower.transform.position = new Vector3(0, 1.2f, center.z);
            tower.transform.localScale = new Vector3(1.2f, 1.2f, 1.2f);
            tower.GetComponent<MeshRenderer>().sharedMaterial = borderMat;
            courseObjects.Add(tower);

            windmillBlades = new GameObject("WindmillBlades");
            windmillBlades.transform.position = new Vector3(0, 2.0f, center.z - 0.7f);
            var b1 = GameObject.CreatePrimitive(PrimitiveType.Cube);
            b1.transform.SetParent(windmillBlades.transform);
            b1.transform.localScale = new Vector3(2.5f, 0.35f, 0.08f);
            b1.GetComponent<MeshRenderer>().sharedMaterial = ballMat;

            var b2 = GameObject.CreatePrimitive(PrimitiveType.Cube);
            b2.transform.SetParent(windmillBlades.transform);
            b2.transform.localScale = new Vector3(0.35f, 2.5f, 0.08f);
            b2.GetComponent<MeshRenderer>().sharedMaterial = ballMat;

            courseObjects.Add(windmillBlades);
        }
    }

    void BuildWall(Vector3 pos, Vector3 size)
    {
        var wall = GameObject.CreatePrimitive(PrimitiveType.Cube);
        wall.transform.position = pos;
        wall.transform.localScale = size;
        wall.GetComponent<MeshRenderer>().sharedMaterial = borderMat;
        courseObjects.Add(wall);
    }

    void Update()
    {
        HandleControls();
        SimulateBallPhysics();
        AnimateWindmill();
        UpdateCameraFollow();
    }

    void AnimateWindmill()
    {
        if (windmillBlades != null)
        {
            windmillBlades.transform.Rotate(Vector3.forward, 90f * Time.deltaTime);
        }
    }

    void HandleControls()
    {
        if (status == GameStatus.Holed || status == GameStatus.TournamentComplete || showHoleSelectModal)
        {
            if (Input.GetKeyDown(KeyCode.Space) || Input.GetKeyDown(KeyCode.Return))
            {
                if (status == GameStatus.Holed) NextHole();
            }
            if (Input.GetKeyDown(KeyCode.M)) showHoleSelectModal = !showHoleSelectModal;
            if (Input.GetKeyDown(KeyCode.R)) InitHole(currentHoleIndex);
            return;
        }

        // Mouse Drag Aiming (Slingshot)
        if (status == GameStatus.Aiming)
        {
            if (Input.GetMouseButtonDown(0))
            {
                if (Input.mousePosition.y > 100 && Input.mousePosition.y < Screen.height - 80)
                {
                    status = GameStatus.Dragging;
                    dragStartMousePos = Input.mousePosition;
                }
            }
        }
        else if (status == GameStatus.Dragging)
        {
            Vector2 currentMouse = Input.mousePosition;
            Vector2 delta = dragStartMousePos - currentMouse; // Pullback direction
            float dragDist = delta.magnitude;

            aimPower = Mathf.Clamp01(dragDist / 180f);
            if (dragDist > 10f)
            {
                Vector3 worldDrag = new Vector3(delta.x, 0, delta.y).normalized;
                aimDirection = Quaternion.Euler(0, mainCam.transform.eulerAngles.y, 0) * worldDrag;
            }

            if (Input.GetMouseButtonUp(0))
            {
                if (aimPower > 0.05f)
                {
                    // Execute Putt!
                    ExecutePutt(aimDirection, aimPower);
                }
                else
                {
                    status = GameStatus.Aiming;
                }
            }
        }
    }

    void ExecutePutt(Vector3 dir, float power)
    {
        status = GameStatus.Rolling;
        strokesThisHole++;
        totalStrokes++;

        float speed = Mathf.Lerp(3.5f, 16f, power);
        ballVel = dir.normalized * speed;

        PlaySound(260f + power * 240f, 0.12f);
    }

    void SimulateBallPhysics()
    {
        if (status != GameStatus.Rolling) return;

        float dt = Time.deltaTime;
        HoleDef def = Holes[currentHoleIndex];

        // 1. Ball Movement & Friction
        float friction = 0.985f;

        // Sand bunker drag
        if (def.hasBunker)
        {
            Vector3 center = new Vector3((def.boundsMin.x + def.boundsMax.x) * 0.5f, 0, (def.boundsMin.y + def.boundsMax.y) * 0.5f);
            if (Mathf.Abs(ballPos.x - (center.x + 1.2f)) < 0.8f && Mathf.Abs(ballPos.z - center.z) < 1.4f)
            {
                friction = 0.82f; // Heavy sand resistance
            }
        }

        ballVel *= Mathf.Pow(friction, dt * 60f);
        ballPos += ballVel * dt;

        // 2. Wall Cushion Bounce (Mathematical Reflection)
        if (ballPos.x - BallRadius <= def.boundsMin.x)
        {
            ballPos.x = def.boundsMin.x + BallRadius;
            ballVel.x = -ballVel.x * 0.75f;
            PlayCushionSound();
        }
        else if (ballPos.x + BallRadius >= def.boundsMax.x)
        {
            ballPos.x = def.boundsMax.x - BallRadius;
            ballVel.x = -ballVel.x * 0.75f;
            PlayCushionSound();
        }

        if (ballPos.z - BallRadius <= def.boundsMin.y)
        {
            ballPos.z = def.boundsMin.y + BallRadius;
            ballVel.z = -ballVel.z * 0.75f;
            PlayCushionSound();
        }
        else if (ballPos.z + BallRadius >= def.boundsMax.y)
        {
            ballPos.z = def.boundsMax.y - BallRadius;
            ballVel.z = -ballVel.z * 0.75f;
            PlayCushionSound();
        }

        // 3. Water Hazard Check
        if (def.hasWater)
        {
            Vector3 center = new Vector3((def.boundsMin.x + def.boundsMax.x) * 0.5f, 0, (def.boundsMin.y + def.boundsMax.y) * 0.5f);
            if (Mathf.Abs(ballPos.x - (center.x - 1.2f)) < 0.8f && Mathf.Abs(ballPos.z - center.z) < 1.6f)
            {
                // Splash! Reset to tee with 1 penalty stroke
                strokesThisHole++;
                totalStrokes++;
                ballPos = def.teePos;
                ballVel = Vector3.zero;
                status = GameStatus.Aiming;
                PlaySound(180f, 0.35f);
                return;
            }
        }

        // 4. Hole Cup Sinking Check
        float distToCup = Vector2.Distance(new Vector2(ballPos.x, ballPos.z), new Vector2(def.cupPos.x, def.cupPos.z));
        if (distToCup < CupRadius)
        {
            // Pull into cup center
            Vector3 toCup = (def.cupPos - ballPos).normalized;
            ballVel += toCup * 4.0f * dt;

            if (ballVel.magnitude < 3.8f)
            {
                // Holed!
                ballPos = def.cupPos;
                ballVel = Vector3.zero;
                status = GameStatus.Holed;
                holeScores[currentHoleIndex] = strokesThisHole;

                EvaluateCelebration(strokesThisHole, def.par);
                PlayFanfare();
                return;
            }
        }

        // 5. Ball Stopped
        if (ballVel.magnitude < 0.15f)
        {
            ballVel = Vector3.zero;
            status = GameStatus.Aiming;
        }

        if (ballObj != null)
        {
            ballObj.transform.position = ballPos;
        }
    }

    void EvaluateCelebration(int strokes, int par)
    {
        int diff = strokes - par;
        if (strokes == 1) celebrationTitle = "★ HOLE IN ONE! (홀인원 대기록!) ★";
        else if (diff <= -2) celebrationTitle = "★ EAGLE! (이글!) ★";
        else if (diff == -1) celebrationTitle = "★ BIRDIE! (버디!) ★";
        else if (diff == 0) celebrationTitle = "★ PAR! (파 세이브) ★";
        else if (diff == 1) celebrationTitle = "BOGEY (보기)";
        else celebrationTitle = "DOUBLE BOGEY+ (더블 보기)";
    }

    void NextHole()
    {
        if (currentHoleIndex < TotalHoles - 1)
        {
            InitHole(currentHoleIndex + 1);
        }
        else
        {
            status = GameStatus.TournamentComplete;
        }
    }

    void UpdateCameraFollow()
    {
        if (mainCam == null) return;

        HoleDef def = Holes[currentHoleIndex];
        Vector3 lookTarget = ballPos;
        Vector3 camOffset = (status == GameStatus.Rolling)
            ? new Vector3(0, 9f, -6f)
            : new Vector3(0, 8f, -5.5f);

        Vector3 targetPos = ballPos + camOffset;
        mainCam.transform.position = Vector3.Lerp(mainCam.transform.position, targetPos, Time.deltaTime * 6f);
        mainCam.transform.LookAt(lookTarget + Vector3.up * 0.2f);
    }

    void PlayCushionSound()
    {
        PlaySound(190f, 0.08f);
    }

    void PlaySound(float freq, float dur)
    {
        if (audioSource == null) return;
        int sampleRate = 44100;
        int count = (int)(sampleRate * dur);
        float[] samples = new float[count];
        for (int i = 0; i < count; i++)
        {
            float t = (float)i / sampleRate;
            float env = Mathf.Exp(-t * (1f / dur) * 3f);
            samples[i] = Mathf.Sin(2 * Mathf.PI * freq * t) * env * 0.25f;
        }
        AudioClip clip = AudioClip.Create("SFX", count, 1, sampleRate, false);
        clip.SetData(samples, 0);
        audioSource.PlayOneShot(clip);
    }

    void PlayFanfare()
    {
        if (audioSource == null) return;
        int sampleRate = 44100;
        int count = (int)(sampleRate * 0.55f);
        float[] samples = new float[count];
        float[] chord = { 523.25f, 659.25f, 783.99f, 1046.50f };
        for (int i = 0; i < count; i++)
        {
            float t = (float)i / sampleRate;
            float env = Mathf.Exp(-t * 4f);
            float s = 0;
            foreach (var n in chord) s += Mathf.Sin(2 * Mathf.PI * n * t);
            samples[i] = (s / chord.Length) * env * 0.35f;
        }
        AudioClip clip = AudioClip.Create("Fanfare", count, 1, sampleRate, false);
        clip.SetData(samples, 0);
        audioSource.PlayOneShot(clip);
    }

    void OnGUI()
    {
        DrawHeaderHUD();
        DrawAimGuide();

        if (status == GameStatus.Holed) DrawHoledBanner();
        if (status == GameStatus.TournamentComplete) DrawTournamentCompleteBanner();
        if (showHoleSelectModal) DrawHoleSelectModal();
    }

    void DrawHeaderHUD()
    {
        int w = Screen.width;
        int h = Screen.height;

        GUI.Box(new Rect(10, 10, w - 20, 56), GUIContent.none);

        HoleDef def = Holes[currentHoleIndex];

        GUIStyle holeTitle = new GUIStyle(GUI.skin.label)
        {
            fontSize = 17,
            fontStyle = FontStyle.Bold,
            normal = { textColor = new Color(0.3f, 0.95f, 0.45f) }
        };

        GUIStyle subTitle = new GUIStyle(GUI.skin.label)
        {
            fontSize = 12,
            normal = { textColor = Color.white }
        };

        GUI.Label(new Rect(20, 12, 450, 24), "Hole " + def.holeNum + "/12. " + def.titleKo + " (Par " + def.par + ")", holeTitle);
        GUI.Label(new Rect(20, 34, 450, 22), "⛳ 이번 홀 타수: " + strokesThisHole + "타 | 🏆 누적 총타수: " + totalStrokes + "타", subTitle);

        if (GUI.Button(new Rect(w - 180, 15, 75, 42), "🗺️ 홀 선택"))
        {
            showHoleSelectModal = !showHoleSelectModal;
        }

        if (GUI.Button(new Rect(w - 95, 15, 75, 42), "🔄 티 리셋"))
        {
            InitHole(currentHoleIndex);
        }

        // Aim guide bottom
        if (status == GameStatus.Aiming || status == GameStatus.Dragging)
        {
            GUIStyle guide = new GUIStyle(GUI.skin.label)
            {
                fontSize = 13,
                alignment = TextAnchor.MiddleCenter,
                normal = { textColor = new Color(0.9f, 0.95f, 1f) }
            };
            string powerTxt = status == GameStatus.Dragging ? " [파워: " + Mathf.RoundToInt(aimPower * 100) + "%]" : "";
            GUI.Label(new Rect(0, h - 45, w, 30), "화면을 클릭 & 드래그하여 조준 및 퍼팅 파워를 조절하세요!" + powerTxt, guide);
        }
    }

    void DrawAimGuide()
    {
        if (status != GameStatus.Dragging || mainCam == null) return;

        Vector3 screenBall = mainCam.WorldToScreenPoint(ballPos);
        Vector3 aimPoint = ballPos + aimDirection * (aimPower * 3.5f);
        Vector3 screenAim = mainCam.WorldToScreenPoint(aimPoint);

        if (screenBall.z > 0 && screenAim.z > 0)
        {
            Color lineCol = Color.Lerp(Color.green, Color.red, aimPower);
            GUI.color = lineCol;
            GUI.Label(new Rect(screenAim.x - 12, Screen.height - screenAim.y - 12, 24, 24), "⛳");
            GUI.color = Color.white;
        }
    }

    void DrawHoledBanner()
    {
        int w = Screen.width;
        int h = Screen.height;
        Rect r = new Rect(w / 2 - 200, h / 2 - 90, 400, 180);
        GUI.Box(r, GUIContent.none);

        GUIStyle title = new GUIStyle(GUI.skin.label)
        {
            fontSize = 20,
            fontStyle = FontStyle.Bold,
            alignment = TextAnchor.MiddleCenter,
            normal = { textColor = new Color(1f, 0.85f, 0.2f) }
        };

        GUIStyle sub = new GUIStyle(GUI.skin.label)
        {
            fontSize = 13,
            alignment = TextAnchor.MiddleCenter,
            normal = { textColor = Color.white }
        };

        HoleDef def = Holes[currentHoleIndex];
        GUI.Label(new Rect(r.x, r.y + 15, r.width, 35), celebrationTitle, title);
        GUI.Label(new Rect(r.x, r.y + 55, r.width, 25), "Hole " + def.holeNum + " 완성! (Par " + def.par + " vs " + strokesThisHole + "타)", sub);

        if (currentHoleIndex < TotalHoles - 1)
        {
            if (GUI.Button(new Rect(r.x + 110, r.y + 105, 180, 45), "다음 홀 이동 ▶ (Space)"))
            {
                NextHole();
            }
        }
        else
        {
            if (GUI.Button(new Rect(r.x + 110, r.y + 105, 180, 45), "챔피언십 성적 확인"))
            {
                status = GameStatus.TournamentComplete;
            }
        }
    }

    void DrawTournamentCompleteBanner()
    {
        int w = Screen.width;
        int h = Screen.height;
        Rect r = new Rect(w / 2 - 240, h / 2 - 120, 480, 240);
        GUI.Box(r, "🏆 12홀 토너먼트 완주 축하!");

        GUIStyle title = new GUIStyle(GUI.skin.label)
        {
            fontSize = 20,
            fontStyle = FontStyle.Bold,
            alignment = TextAnchor.MiddleCenter,
            normal = { textColor = new Color(1f, 0.85f, 0.2f) }
        };

        GUIStyle sub = new GUIStyle(GUI.skin.label)
        {
            fontSize = 13,
            alignment = TextAnchor.MiddleCenter,
            normal = { textColor = Color.white }
        };

        int totalPar = 0;
        foreach (var hole in Holes) totalPar += hole.par;
        int diff = totalStrokes - totalPar;
        string diffStr = diff <= 0 ? (diff == 0 ? "E (이븐 파)" : diff + " 언더파!") : "+" + diff + " 오버파";

        GUI.Label(new Rect(r.x, r.y + 40, r.width, 30), "전체 12홀 토너먼트 완주!", title);
        GUI.Label(new Rect(r.x, r.y + 80, r.width, 25), "최종 총타수: " + totalStrokes + "타 (Par " + totalPar + " 대비 " + diffStr + ")", sub);

        if (GUI.Button(new Rect(r.x + 150, r.y + 150, 180, 45), "새 토너먼트 시작"))
        {
            totalStrokes = 0;
            InitHole(0);
        }
    }

    void DrawHoleSelectModal()
    {
        int w = Screen.width;
        int h = Screen.height;
        GUI.Box(new Rect(30, 70, w - 60, h - 140), "🗺️ 12홀 코스 선택 (Mini Golf Course Select)");

        int cols = 3;
        int itemW = (w - 120) / cols;
        int itemH = 55;

        for (int i = 0; i < Holes.Length; i++)
        {
            int row = i / cols;
            int col = i % cols;
            Rect btnRect = new Rect(45 + col * (itemW + 10), 105 + row * (itemH + 10), itemW, itemH);

            HoleDef hdef = Holes[i];
            string scoreInfo = holeScores[i] > 0 ? " [" + holeScores[i] + "타]" : "";
            string text = "Hole " + hdef.holeNum + ". " + hdef.titleKo + scoreInfo + "\nPar " + hdef.par;

            if (GUI.Button(btnRect, text))
            {
                showHoleSelectModal = false;
                InitHole(i);
            }
        }
    }
}
