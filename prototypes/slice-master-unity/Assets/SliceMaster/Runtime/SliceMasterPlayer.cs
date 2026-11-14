using System;
using System.Collections.Generic;
using UnityEngine;

public class SliceMasterPlayer : MonoBehaviour
{
    const int MaxStages = 12;

    // Stage Definition
    public struct StageDef
    {
        public int stage;
        public string titleKo;
        public string titleEn;
        public string themeDescKo;
        public Color objColorA;
        public Color objColorB;
        public int targetCount;
        public int hazardCount;
    }

    static readonly StageDef[] Stages = new StageDef[]
    {
        new StageDef { stage = 1, titleKo = "과일 시장", titleEn = "Fruit Market", themeDescKo = "수박과 오렌지를 경쾌하게 슬라이스하세요!", objColorA = new Color(0.9f, 0.2f, 0.2f), objColorB = new Color(1.0f, 0.6f, 0.1f), targetCount = 8, hazardCount = 1 },
        new StageDef { stage = 2, titleKo = "프랑스 베이커리", titleEn = "French Bakery", themeDescKo = "바게트와 크루아상을 얇게 저미세요.", objColorA = new Color(0.85f, 0.65f, 0.35f), objColorB = new Color(0.95f, 0.85f, 0.6f), targetCount = 10, hazardCount = 2 },
        new StageDef { stage = 3, titleKo = "스위트 캔디랜드", titleEn = "Sweet Candyland", themeDescKo = "말랑말랑한 젤리와 마시멜로를 자르세요.", objColorA = new Color(0.95f, 0.4f, 0.7f), objColorB = new Color(0.4f, 0.8f, 0.95f), targetCount = 11, hazardCount = 2 },
        new StageDef { stage = 4, titleKo = "아침 식탁", titleEn = "Breakfast Diner", themeDescKo = "팬케이크와 베이컨, 치즈를 슬라이스하세요.", objColorA = new Color(0.95f, 0.8f, 0.2f), objColorB = new Color(0.75f, 0.3f, 0.2f), targetCount = 12, hazardCount = 3 },
        new StageDef { stage = 5, titleKo = "주방 도마 위기 (중간보스)", titleEn = "Kitchen Havoc", themeDescKo = "철제 분쇄기와 대형 멜론이 있는 고난도 주방!", objColorA = new Color(0.3f, 0.85f, 0.4f), objColorB = new Color(0.9f, 0.25f, 0.25f), targetCount = 14, hazardCount = 4 },
        new StageDef { stage = 6, titleKo = "문구점 연필깎이", titleEn = "Stationery Workshop", themeDescKo = "나무 연필과 알록달록 지우개를 깎으세요.", objColorA = new Color(0.3f, 0.5f, 0.9f), objColorB = new Color(0.95f, 0.7f, 0.2f), targetCount = 13, hazardCount = 3 },
        new StageDef { stage = 7, titleKo = "비누 조각 ASMR", titleEn = "Soap Carving Studio", themeDescKo = "층층이 쌓인 파스텔 비누를 사각사각 베어내세요.", objColorA = new Color(0.6f, 0.9f, 0.8f), objColorB = new Color(0.85f, 0.65f, 0.95f), targetCount = 14, hazardCount = 3 },
        new StageDef { stage = 8, titleKo = "열대 정글 과수원", titleEn = "Tropical Orchard", themeDescKo = "단단한 파인애플과 용과를 일도양단하세요.", objColorA = new Color(0.95f, 0.85f, 0.1f), objColorB = new Color(0.9f, 0.15f, 0.4f), targetCount = 15, hazardCount = 4 },
        new StageDef { stage = 9, titleKo = "빙하 얼음 동굴", titleEn = "Glacier Chill", themeDescKo = "투명한 얼음 큐브와 빙과류를 깨뜨리세요.", objColorA = new Color(0.7f, 0.9f, 1.0f), objColorB = new Color(0.4f, 0.6f, 0.9f), targetCount = 15, hazardCount = 4 },
        new StageDef { stage = 10, titleKo = "초콜릿 공장", titleEn = "Chocolate Factory", themeDescKo = "바삭한 초콜릿 바와 헤이즐넛 웨이퍼를 쪼개세요.", objColorA = new Color(0.45f, 0.25f, 0.15f), objColorB = new Color(0.85f, 0.7f, 0.5f), targetCount = 16, hazardCount = 4 },
        new StageDef { stage = 11, titleKo = "닌자 수련 도장", titleEn = "Ninja Training Dojo", themeDescKo = "공중에 솟은 대나무와 수리검 함정을 피하세요.", objColorA = new Color(0.35f, 0.75f, 0.35f), objColorB = new Color(0.8f, 0.5f, 0.2f), targetCount = 16, hazardCount = 5 },
        new StageDef { stage = 12, titleKo = "궁극의 미식 마스터 (최종보스)", titleEn = "Grand Gourmet Finale", themeDescKo = "5단 웨딩 케이크와 촘촘한 가시 바퀴를 뚫고 전설에 도달하세요!", objColorA = new Color(1.0f, 0.85f, 0.3f), objColorB = new Color(0.95f, 0.3f, 0.5f), targetCount = 20, hazardCount = 6 }
    };

    class SliceableTarget
    {
        public Vector3 position;
        public Vector3 size;
        public bool isHazard;
        public bool isSliced;
        public Color color;
        public GameObject leftHalf;
        public GameObject rightHalf;
        public float splitTimer;
    }

    class MultiplierTarget
    {
        public Vector3 position;
        public int multiplier;
        public GameObject meshObj;
    }

    // Knife Physics State
    Vector3 knifePos;
    Vector3 knifeVel;
    float knifeRot; // degrees
    float knifeRotVel; // deg/sec
    bool isEmbedded = false;
    float bladeLength = 0.75f;

    // Level State
    int currentStageIndex = 0;
    int score = 0;
    int comboCount = 0;
    int totalSliced = 0;
    bool isGameOver = false;
    bool isLevelClear = false;
    int earnedMultiplier = 1;
    bool showStageSelectModal = false;

    // Entities
    List<SliceableTarget> targets = new List<SliceableTarget>();
    List<MultiplierTarget> finishTargets = new List<MultiplierTarget>();
    GameObject knifeObj;
    GameObject groundBoard;
    Camera mainCam;
    AudioSource audioSource;

    // Materials
    Material bladeMat;
    Material handleMat;
    Material goldMat;
    Material hazardMat;
    Material boardMat;

    void Awake()
    {
        mainCam = Camera.main;
        if (mainCam == null)
        {
            var camGo = new GameObject("Main Camera");
            mainCam = camGo.AddComponent<Camera>();
            camGo.tag = "MainCamera";
        }
        mainCam.backgroundColor = new Color(0.18f, 0.11f, 0.22f);
        mainCam.clearFlags = CameraClearFlags.SolidColor;
        mainCam.fieldOfView = 45f;

        // Warm Lighting
        var lightGo = new GameObject("SunLight");
        var light = lightGo.AddComponent<Light>();
        light.type = LightType.Directional;
        light.color = new Color(1.0f, 0.95f, 0.88f);
        light.intensity = 1.3f;
        lightGo.transform.rotation = Quaternion.Euler(35f, -30f, 0);

        audioSource = gameObject.AddComponent<AudioSource>();

        CreateMaterials();
        BuildKnife();
        BuildGroundBoard();
        InitStage(0);
    }

    void CreateMaterials()
    {
        Shader diffuse = Shader.Find("Mobile/Diffuse") ?? Shader.Find("Standard");

        bladeMat = new Material(diffuse) { color = new Color(0.92f, 0.94f, 0.96f) }; // Steel
        handleMat = new Material(diffuse) { color = new Color(0.35f, 0.18f, 0.12f) }; // Mahogany
        goldMat = new Material(diffuse) { color = new Color(0.95f, 0.8f, 0.2f) }; // Brass
        hazardMat = new Material(diffuse) { color = new Color(0.85f, 0.15f, 0.25f) }; // Red Iron Spikes
        boardMat = new Material(diffuse) { color = new Color(0.6f, 0.45f, 0.3f) }; // Wooden cutting board
    }

    void BuildKnife()
    {
        knifeObj = new GameObject("Knife");

        // Blade
        var blade = GameObject.CreatePrimitive(PrimitiveType.Cube);
        blade.transform.SetParent(knifeObj.transform);
        blade.transform.localPosition = new Vector3(0, 0.35f, 0);
        blade.transform.localScale = new Vector3(0.06f, bladeLength, 0.22f);
        blade.GetComponent<MeshRenderer>().sharedMaterial = bladeMat;

        // Brass Bolster
        var bolster = GameObject.CreatePrimitive(PrimitiveType.Cube);
        bolster.transform.SetParent(knifeObj.transform);
        bolster.transform.localPosition = new Vector3(0, -0.05f, 0);
        bolster.transform.localScale = new Vector3(0.08f, 0.1f, 0.24f);
        bolster.GetComponent<MeshRenderer>().sharedMaterial = goldMat;

        // Handle
        var handle = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        handle.transform.SetParent(knifeObj.transform);
        handle.transform.localPosition = new Vector3(0, -0.4f, 0);
        handle.transform.localScale = new Vector3(0.12f, 0.3f, 0.12f);
        handle.GetComponent<MeshRenderer>().sharedMaterial = handleMat;
    }

    void BuildGroundBoard()
    {
        groundBoard = GameObject.CreatePrimitive(PrimitiveType.Cube);
        groundBoard.name = "CuttingBoard";
        groundBoard.transform.position = new Vector3(25f, -0.6f, 0);
        groundBoard.transform.localScale = new Vector3(60f, 0.4f, 3.5f);
        groundBoard.GetComponent<MeshRenderer>().sharedMaterial = boardMat;
    }

    void InitStage(int stageIdx)
    {
        currentStageIndex = Mathf.Clamp(stageIdx, 0, MaxStages - 1);
        StageDef def = Stages[currentStageIndex];

        score = 0;
        comboCount = 0;
        totalSliced = 0;
        isGameOver = false;
        isLevelClear = false;
        earnedMultiplier = 1;

        // Reset Knife
        knifePos = new Vector3(0, 1.2f, 0);
        knifeVel = Vector3.zero;
        knifeRot = -35f;
        knifeRotVel = 0f;
        isEmbedded = true;
        UpdateKnifeTransform();

        // Clear existing targets
        foreach (var t in targets)
        {
            if (t.leftHalf != null) Destroy(t.leftHalf);
            if (t.rightHalf != null) Destroy(t.rightHalf);
        }
        targets.Clear();

        foreach (var ft in finishTargets)
        {
            if (ft.meshObj != null) Destroy(ft.meshObj);
        }
        finishTargets.Clear();

        // Generate Targets
        float spawnX = 3.5f;
        for (int i = 0; i < def.targetCount; i++)
        {
            spawnX += UnityEngine.Random.Range(2.2f, 3.2f);
            bool isHazard = (i > 1 && i % 3 == 0 && def.hazardCount > 0);
            Color col = isHazard ? hazardMat.color : ((i % 2 == 0) ? def.objColorA : def.objColorB);

            SpawnTarget(new Vector3(spawnX, 0.35f, 0), new Vector3(0.7f, 0.7f, 0.7f), isHazard, col);
        }

        // Generate Finish Multiplier Targets at end
        spawnX += 4.0f;
        int[] mults = { 2, 3, 5, 10, 25 };
        for (int m = 0; m < mults.Length; m++)
        {
            float targetY = 0.2f + m * 0.85f;
            var ft = new MultiplierTarget
            {
                position = new Vector3(spawnX, targetY, 0),
                multiplier = mults[m]
            };

            var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
            go.name = "Finish_x" + mults[m];
            go.transform.position = ft.position;
            go.transform.localScale = new Vector3(0.5f, 0.75f, 2.0f);

            Material mat = new Material(Shader.Find("Mobile/Diffuse") ?? Shader.Find("Standard"));
            mat.color = Color.Lerp(new Color(0.3f, 0.8f, 0.4f), new Color(1.0f, 0.85f, 0.2f), (float)m / (mults.Length - 1));
            go.GetComponent<MeshRenderer>().sharedMaterial = mat;

            ft.meshObj = go;
            finishTargets.Add(ft);
        }

        PlaySound(440f, 0.15f);
    }

    void SpawnTarget(Vector3 pos, Vector3 size, bool isHazard, Color col)
    {
        var target = new SliceableTarget
        {
            position = pos,
            size = size,
            isHazard = isHazard,
            isSliced = false,
            color = col,
            splitTimer = 0f
        };

        // Left Half
        var left = GameObject.CreatePrimitive(isHazard ? PrimitiveType.Cylinder : PrimitiveType.Cube);
        left.transform.position = pos - new Vector3(size.x * 0.25f, 0, 0);
        left.transform.localScale = new Vector3(size.x * 0.5f, size.y, size.z);
        Material mat = new Material(Shader.Find("Mobile/Diffuse") ?? Shader.Find("Standard")) { color = col };
        left.GetComponent<MeshRenderer>().sharedMaterial = mat;
        target.leftHalf = left;

        // Right Half
        var right = GameObject.CreatePrimitive(isHazard ? PrimitiveType.Cylinder : PrimitiveType.Cube);
        right.transform.position = pos + new Vector3(size.x * 0.25f, 0, 0);
        right.transform.localScale = new Vector3(size.x * 0.5f, size.y, size.z);
        right.GetComponent<MeshRenderer>().sharedMaterial = mat;
        target.rightHalf = right;

        targets.Add(target);
    }

    void Update()
    {
        HandleInput();
        SimulateKnifePhysics();
        AnimateSlicedSplits();
        UpdateCameraFollow();
    }

    void HandleInput()
    {
        if (isGameOver || isLevelClear || showStageSelectModal)
        {
            if (Input.GetKeyDown(KeyCode.R)) InitStage(currentStageIndex);
            if (Input.GetKeyDown(KeyCode.M)) showStageSelectModal = !showStageSelectModal;
            return;
        }

        if (Input.GetMouseButtonDown(0) || Input.GetKeyDown(KeyCode.Space))
        {
            // Tap to Jump & Flip
            isEmbedded = false;
            knifeVel = new Vector3(3.8f, 7.8f, 0);
            knifeRotVel = -520f; // Rapid forward flip

            PlaySwishSound();
        }
    }

    void SimulateKnifePhysics()
    {
        if (isEmbedded || isGameOver || isLevelClear) return;

        float dt = Time.deltaTime;

        // Gravity & Velocity integration
        knifeVel.y -= 19.8f * dt;
        knifePos += knifeVel * dt;
        knifeRot += knifeRotVel * dt;

        Vector3 tipPos = GetKnifeTipPos();

        // 1. Check Target Slicing
        foreach (var t in targets)
        {
            if (!t.isSliced && (Mathf.Abs(tipPos.x - t.position.x) < t.size.x * 0.6f) && (Mathf.Abs(tipPos.y - t.position.y) < t.size.y * 0.7f))
            {
                if (t.isHazard)
                {
                    // Hit metal hazard! Shatter & Game Over
                    isGameOver = true;
                    PlaySound(180f, 0.4f);
                    return;
                }
                else
                {
                    // Clean ASMR Slice!
                    t.isSliced = true;
                    comboCount++;
                    totalSliced++;
                    score += 10 * comboCount;

                    PlaySliceSound(comboCount);

                    // Micro bounce upwards
                    knifeVel.y = Mathf.Max(knifeVel.y, 4.5f);
                    knifeRotVel = -380f;
                    break;
                }
            }
        }

        // 2. Check Finish Multiplier Target
        foreach (var ft in finishTargets)
        {
            if (Mathf.Abs(tipPos.x - ft.position.x) < 0.4f && Mathf.Abs(tipPos.y - ft.position.y) < 0.5f)
            {
                // Embedded in finish target!
                isLevelClear = true;
                isEmbedded = true;
                earnedMultiplier = ft.multiplier;
                score *= earnedMultiplier;
                PlayFanfare();
                return;
            }
        }

        // 3. Ground / Cutting Board Collision (Embed or Bounce)
        float groundY = -0.4f;
        if (tipPos.y <= groundY)
        {
            // Normalize angle to 0..360
            float normAngle = Mathf.Repeat(knifeRot, 360f);
            // Upright stick angle: tip pointing down (around 240..300 deg or -120..-60 deg)
            bool isUpright = (normAngle >= 230f && normAngle <= 310f);

            if (isUpright)
            {
                // Knife sticks into cutting board!
                isEmbedded = true;
                knifeVel = Vector3.zero;
                knifeRotVel = 0f;
                comboCount = 0; // Combo resets on landing
                PlayThudSound();
            }
            else
            {
                // Dull handle hit! Bounce forward
                knifePos.y = groundY + 0.6f;
                knifeVel.y = 5.0f;
                knifeVel.x = 2.0f;
                knifeRotVel = -300f;
                PlaySound(280f, 0.1f);
            }
        }

        // Pit fall death
        if (knifePos.y < -3.0f)
        {
            isGameOver = true;
            PlaySound(160f, 0.35f);
        }

        UpdateKnifeTransform();
    }

    Vector3 GetKnifeTipPos()
    {
        float rad = knifeRot * Mathf.Deg2Rad;
        Vector3 dir = new Vector3(-Mathf.Sin(rad), Mathf.Cos(rad), 0);
        return knifePos + dir * bladeLength;
    }

    void UpdateKnifeTransform()
    {
        if (knifeObj != null)
        {
            knifeObj.transform.position = knifePos;
            knifeObj.transform.rotation = Quaternion.Euler(0, 0, knifeRot);
        }
    }

    void AnimateSlicedSplits()
    {
        foreach (var t in targets)
        {
            if (t.isSliced && t.splitTimer < 1.0f)
            {
                t.splitTimer += Time.deltaTime * 2.5f;
                float offX = t.splitTimer * 0.45f;
                float dropY = -t.splitTimer * t.splitTimer * 0.8f;

                if (t.leftHalf != null)
                {
                    t.leftHalf.transform.position = t.position - new Vector3(t.size.x * 0.25f + offX, -dropY, 0);
                    t.leftHalf.transform.rotation = Quaternion.Euler(0, 0, t.splitTimer * 45f);
                }
                if (t.rightHalf != null)
                {
                    t.rightHalf.transform.position = t.position + new Vector3(t.size.x * 0.25f + offX, dropY, 0);
                    t.rightHalf.transform.rotation = Quaternion.Euler(0, 0, -t.splitTimer * 45f);
                }
            }
        }
    }

    void UpdateCameraFollow()
    {
        if (mainCam == null) return;
        Vector3 targetCamPos = new Vector3(knifePos.x + 3.2f, Mathf.Max(2.0f, knifePos.y + 0.8f), -8.5f);
        mainCam.transform.position = Vector3.Lerp(mainCam.transform.position, targetCamPos, Time.deltaTime * 7f);
        mainCam.transform.LookAt(new Vector3(knifePos.x + 3.2f, 1.2f, 0));
    }

    void PlaySwishSound()
    {
        if (audioSource == null) return;
        int sampleRate = 44100;
        int count = (int)(sampleRate * 0.08f);
        float[] samples = new float[count];
        for (int i = 0; i < count; i++)
        {
            float t = (float)i / sampleRate;
            float env = Mathf.Exp(-t * 35f);
            float noise = (UnityEngine.Random.value * 2f - 1f) * 0.2f;
            samples[i] = noise * env;
        }
        AudioClip clip = AudioClip.Create("Swish", count, 1, sampleRate, false);
        clip.SetData(samples, 0);
        audioSource.PlayOneShot(clip);
    }

    void PlaySliceSound(int combo)
    {
        if (audioSource == null) return;
        int sampleRate = 44100;
        int count = (int)(sampleRate * 0.12f);
        float[] samples = new float[count];
        float[] scale = { 523.25f, 587.33f, 659.25f, 783.99f, 880f, 1046.5f };
        float freq = scale[Mathf.Min(combo - 1, scale.Length - 1)];

        for (int i = 0; i < count; i++)
        {
            float t = (float)i / sampleRate;
            float env = Mathf.Exp(-t * 22f);
            samples[i] = Mathf.Sin(2 * Mathf.PI * freq * t) * env * 0.35f;
        }
        AudioClip clip = AudioClip.Create("Slice", count, 1, sampleRate, false);
        clip.SetData(samples, 0);
        audioSource.PlayOneShot(clip);
    }

    void PlayThudSound()
    {
        PlaySound(140f, 0.12f);
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
        int count = (int)(sampleRate * 0.6f);
        float[] samples = new float[count];
        float[] chord = { 523.25f, 659.25f, 783.99f, 1046.50f };
        for (int i = 0; i < count; i++)
        {
            float t = (float)i / sampleRate;
            float env = Mathf.Exp(-t * 4.5f);
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

        if (isGameOver) DrawGameOverBanner();
        if (isLevelClear) DrawVictoryBanner();
        if (showStageSelectModal) DrawStageSelectModal();
    }

    void DrawHeaderHUD()
    {
        int w = Screen.width;
        int h = Screen.height;

        GUI.Box(new Rect(10, 10, w - 20, 56), GUIContent.none);

        StageDef def = Stages[currentStageIndex];

        GUIStyle stageTitle = new GUIStyle(GUI.skin.label)
        {
            fontSize = 17,
            fontStyle = FontStyle.Bold,
            normal = { textColor = new Color(1f, 0.85f, 0.25f) }
        };

        GUIStyle subTitle = new GUIStyle(GUI.skin.label)
        {
            fontSize = 12,
            normal = { textColor = Color.white }
        };

        string comboStr = comboCount > 1 ? " | 🔥 콤보 x" + comboCount : "";
        GUI.Label(new Rect(20, 12, 420, 24), "Stage " + (currentStageIndex + 1) + ". " + def.titleKo + " (" + def.titleEn + ")", stageTitle);
        GUI.Label(new Rect(20, 34, 450, 22), "⭐ 점수: " + score + "점 | 🔪 슬라이스: " + totalSliced + "/" + def.targetCount + comboStr, subTitle);

        if (GUI.Button(new Rect(w - 180, 15, 75, 42), "🗺️ 스테이지"))
        {
            showStageSelectModal = !showStageSelectModal;
        }

        if (GUI.Button(new Rect(w - 95, 15, 75, 42), "🔄 재시작"))
        {
            InitStage(currentStageIndex);
        }

        // Tap guide at bottom
        GUIStyle guideStyle = new GUIStyle(GUI.skin.label)
        {
            fontSize = 13,
            alignment = TextAnchor.MiddleCenter,
            normal = { textColor = new Color(0.9f, 0.95f, 1f) }
        };
        GUI.Label(new Rect(0, h - 45, w, 30), "화면 클릭 / 스페이스바: 나이프 점프 & 공중 플립 회전", guideStyle);
    }

    void DrawGameOverBanner()
    {
        int w = Screen.width;
        int h = Screen.height;
        Rect r = new Rect(w / 2 - 180, h / 2 - 80, 360, 160);
        GUI.Box(r, GUIContent.none);

        GUIStyle title = new GUIStyle(GUI.skin.label)
        {
            fontSize = 22,
            fontStyle = FontStyle.Bold,
            alignment = TextAnchor.MiddleCenter,
            normal = { textColor = new Color(1f, 0.35f, 0.35f) }
        };
        GUI.Label(new Rect(r.x, r.y + 15, r.width, 35), "칼날이 부러졌습니다!", title);

        if (GUI.Button(new Rect(r.x + 90, r.y + 85, 180, 45), "현재 스테이지 재도전"))
        {
            InitStage(currentStageIndex);
        }
    }

    void DrawVictoryBanner()
    {
        int w = Screen.width;
        int h = Screen.height;
        Rect r = new Rect(w / 2 - 200, h / 2 - 90, 400, 180);
        GUI.Box(r, GUIContent.none);

        GUIStyle title = new GUIStyle(GUI.skin.label)
        {
            fontSize = 22,
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

        GUI.Label(new Rect(r.x, r.y + 15, r.width, 35), "★ STAGE CLEAR! (x" + earnedMultiplier + ") ★", title);
        GUI.Label(new Rect(r.x, r.y + 55, r.width, 25), "골 배율 표적에 칼을 꽂아 최종 " + score + "점을 획득했습니다!", sub);

        if (currentStageIndex < MaxStages - 1)
        {
            if (GUI.Button(new Rect(r.x + 110, r.y + 105, 180, 45), "다음 스테이지 ▶"))
            {
                InitStage(currentStageIndex + 1);
            }
        }
        else
        {
            if (GUI.Button(new Rect(r.x + 110, r.y + 105, 180, 45), "전체 12스테이지 정복!"))
            {
                InitStage(0);
            }
        }
    }

    void DrawStageSelectModal()
    {
        int w = Screen.width;
        int h = Screen.height;
        GUI.Box(new Rect(30, 70, w - 60, h - 140), "🗺️ 스테이지 선택 (Stage Select: Stage 1 ~ 12)");

        int cols = 3;
        int itemW = (w - 120) / cols;
        int itemH = 55;

        for (int i = 0; i < Stages.Length; i++)
        {
            int row = i / cols;
            int col = i % cols;
            Rect btnRect = new Rect(45 + col * (itemW + 10), 105 + row * (itemH + 10), itemW, itemH);

            StageDef s = Stages[i];
            string text = (i + 1) + ". " + s.titleKo + "\n" + s.themeDescKo;

            if (GUI.Button(btnRect, text))
            {
                showStageSelectModal = false;
                InitStage(i);
            }
        }
    }
}
