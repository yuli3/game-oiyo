using System.Collections.Generic;
using UnityEngine;

public sealed class SushiConveyorPlayer : MonoBehaviour
{
    enum Topping
    {
        None,
        Salmon,
        Tuna,
        Tamago,
        Ebi,
        Ikura
    }

    sealed class Plate
    {
        public float T; // 0..1 along oval belt
        public Topping Top;
        public GameObject Root;
    }

    sealed class Diner
    {
        public int SeatIdx;
        public float BeltT;
        public Vector3 SeatPos;
        public Topping Wanted;
        public float Patience;
        public float MaxPatience;
        public bool Active;
        public bool IsVip;
        public GameObject Body;
        public float Cooldown;
    }

    const int TotalStages = 12;
    readonly string[] _stageNames =
    {
        "Stage 1: Morning Prep",
        "Stage 2: Lunch Opening",
        "Stage 3: Golden Roe Rush",
        "Stage 4: VIP Critic Visit",
        "Stage 5: Express Belt",
        "Stage 6: Ebi Special",
        "Stage 7: Full Counter",
        "Stage 8: Wasabi Fever",
        "Stage 9: Ginza Night Shift",
        "Stage 10: Omakase Rush",
        "Stage 11: Michelin Audit",
        "Stage 12: Grand Itamae"
    };

    Camera _cam;
    readonly List<Plate> _plates = new List<Plate>();
    readonly List<Diner> _diners = new List<Diner>();
    readonly List<Transform> _beltSlats = new List<Transform>();

    // Prep board state
    bool _hasRice;
    Topping _prepTopping = Topping.None;
    bool _hasWasabi;
    GameObject _prepRiceGo;
    GameObject _prepTopGo;

    int _stage = 1;
    int _cash;
    int _goalCash = 300;
    int _streak;
    int _missedOrders;
    const int MaxMissed = 4;
    float _stageTimeLeft = 75f;
    bool _stageCleared;
    bool _stageFailed;
    bool _showStageMap;
    string _banner = "Prep: 1 Rice → 2-6 Fish → Space/Click Belt to Launch!";
    float _bannerTimer = 4.5f;

    Material _woodMat;
    Material _beltMat;
    Material _boardMat;
    Material _riceMat;
    Material _plateMat;
    Material _vipMat;
    Material _dinerMat;
    readonly Dictionary<Topping, Material> _fishMats = new Dictionary<Topping, Material>();

    void Start()
    {
        Application.targetFrameRate = 60;
        CreateMaterials();
        SetupCameraAndLight();
        BuildBarEnvironment();
        StartStage(1);
    }

    static Material MakeMat(Color c)
    {
        var shader = Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Standard") ?? Shader.Find("Unlit/Color");
        var m = new Material(shader);
        m.color = c;
        return m;
    }

    void CreateMaterials()
    {
        _woodMat = MakeMat(new Color(0.54f, 0.36f, 0.20f));
        _beltMat = MakeMat(new Color(0.20f, 0.22f, 0.26f));
        _boardMat = MakeMat(new Color(0.84f, 0.72f, 0.46f));
        _riceMat = MakeMat(new Color(0.96f, 0.96f, 0.93f));
        _plateMat = MakeMat(new Color(0.90f, 0.92f, 0.95f));
        _vipMat = MakeMat(new Color(0.94f, 0.72f, 0.16f));
        _dinerMat = MakeMat(new Color(0.32f, 0.46f, 0.72f));

        _fishMats[Topping.Salmon] = MakeMat(new Color(0.98f, 0.48f, 0.30f));
        _fishMats[Topping.Tuna] = MakeMat(new Color(0.80f, 0.16f, 0.20f));
        _fishMats[Topping.Tamago] = MakeMat(new Color(0.96f, 0.84f, 0.22f));
        _fishMats[Topping.Ebi] = MakeMat(new Color(0.98f, 0.56f, 0.46f));
        _fishMats[Topping.Ikura] = MakeMat(new Color(0.95f, 0.34f, 0.12f));
    }

    void SetupCameraAndLight()
    {
        var camGo = new GameObject("Main Camera");
        camGo.tag = "MainCamera";
        _cam = camGo.AddComponent<Camera>();
        _cam.clearFlags = CameraClearFlags.SolidColor;
        _cam.backgroundColor = new Color(0.11f, 0.09f, 0.08f);
        _cam.fieldOfView = 45f;
        camGo.transform.position = new Vector3(0f, 13.5f, -7.8f);
        camGo.transform.rotation = Quaternion.Euler(59f, 0f, 0f);

        var sunGo = new GameObject("WarmLanternLight");
        var l = sunGo.AddComponent<Light>();
        l.type = LightType.Directional;
        l.intensity = 1.25f;
        l.color = new Color(1.0f, 0.94f, 0.85f);
        sunGo.transform.rotation = Quaternion.Euler(55f, -20f, 0f);
    }

    Vector3 BeltPoint(float t)
    {
        float ang = t * Mathf.PI * 2f;
        return new Vector3(Mathf.Cos(ang) * 5.6f, 0.28f, Mathf.Sin(ang) * 2.9f + 0.7f);
    }

    void BuildBarEnvironment()
    {
        var counter = GameObject.CreatePrimitive(PrimitiveType.Cube);
        counter.transform.position = new Vector3(0f, -0.45f, 0f);
        counter.transform.localScale = new Vector3(16f, 1f, 10f);
        counter.GetComponent<Renderer>().material = _woodMat;

        // Bamboo Cutting Board at bottom center
        var board = GameObject.CreatePrimitive(PrimitiveType.Cube);
        board.transform.position = new Vector3(0f, 0.12f, -3.5f);
        board.transform.localScale = new Vector3(3.4f, 0.14f, 2.0f);
        board.GetComponent<Renderer>().material = _boardMat;

        // Conveyor slats
        for (int i = 0; i < 28; i++)
        {
            var slat = GameObject.CreatePrimitive(PrimitiveType.Cube);
            slat.transform.localScale = new Vector3(1.1f, 0.08f, 1.1f);
            slat.GetComponent<Renderer>().material = _beltMat;
            _beltSlats.Add(slat.transform);
        }

        // 4 Diner Seats along top & sides
        float[] seatTs = { 0.08f, 0.22f, 0.36f, 0.48f };
        for (int i = 0; i < 4; i++)
        {
            Vector3 p = BeltPoint(seatTs[i]) + new Vector3(0f, 0.45f, 1.45f);
            var body = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            body.transform.position = p;
            body.transform.localScale = new Vector3(0.95f, 0.85f, 0.95f);
            body.GetComponent<Renderer>().material = _dinerMat;
            _diners.Add(new Diner
            {
                SeatIdx = i,
                BeltT = seatTs[i],
                SeatPos = p,
                Body = body
            });
        }
    }

    void StartStage(int st)
    {
        _stage = Mathf.Clamp(st, 1, TotalStages);
        for (int i = 0; i < _plates.Count; i++) Destroy(_plates[i].Root);
        _plates.Clear();
        ClearPrepBoard();

        _cash = 0;
        _streak = 0;
        _missedOrders = 0;
        _goalCash = 300 + (_stage - 1) * 200;
        _stageTimeLeft = 80f;
        _stageCleared = false;
        _stageFailed = false;
        _showStageMap = false;

        int activeSeats = _stage == 1 ? 2 : (_stage < 6 ? 3 : 4);
        for (int i = 0; i < _diners.Count; i++)
        {
            var d = _diners[i];
            d.Active = i < activeSeats;
            d.IsVip = (_stage >= 4 && i == 1) || (_stage >= 10 && i == 2);
            d.Body.SetActive(d.Active);
            d.Body.GetComponent<Renderer>().material = d.IsVip ? _vipMat : _dinerMat;
            d.Wanted = Topping.None;
            d.Cooldown = 0.6f + i * 0.9f;
        }
        SetBanner($"Stage {_stage}/12 ({_stageNames[_stage - 1]}): Goal ¥{_goalCash}");
    }

    void SetBanner(string msg)
    {
        _banner = msg;
        _bannerTimer = 3.2f;
    }

    void ClearPrepBoard()
    {
        _hasRice = false;
        _prepTopping = Topping.None;
        _hasWasabi = false;
        if (_prepRiceGo != null) Destroy(_prepRiceGo);
        if (_prepTopGo != null) Destroy(_prepTopGo);
        _prepRiceGo = null;
        _prepTopGo = null;
    }

    void AddRice()
    {
        if (_hasRice) return;
        _hasRice = true;
        _prepRiceGo = GameObject.CreatePrimitive(PrimitiveType.Cube);
        _prepRiceGo.transform.position = new Vector3(0f, 0.35f, -3.5f);
        _prepRiceGo.transform.localScale = new Vector3(0.95f, 0.36f, 0.65f);
        _prepRiceGo.GetComponent<Renderer>().material = _riceMat;
    }

    void AddTopping(Topping top)
    {
        if (!_hasRice)
        {
            SetBanner("Place Rice (1) on the board first!");
            return;
        }
        if (_prepTopping != Topping.None)
        {
            SetBanner("Topping already added! Press Space to launch onto belt.");
            return;
        }
        _prepTopping = top;
        _prepTopGo = GameObject.CreatePrimitive(PrimitiveType.Cube);
        _prepTopGo.transform.position = new Vector3(0f, 0.62f, -3.5f);
        _prepTopGo.transform.localScale = new Vector3(1.05f, 0.22f, 0.72f);
        _prepTopGo.GetComponent<Renderer>().material = _fishMats[top];
    }

    void LaunchToBelt()
    {
        if (!_hasRice || _prepTopping == Topping.None)
        {
            SetBanner("Assemble Rice + Fish before launching onto conveyor!");
            return;
        }

        var root = new GameObject($"Plate_{_prepTopping}");
        var plate = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        plate.transform.SetParent(root.transform, false);
        plate.transform.localScale = new Vector3(1.1f, 0.08f, 1.1f);
        plate.GetComponent<Renderer>().material = _plateMat;

        var rice = GameObject.CreatePrimitive(PrimitiveType.Cube);
        rice.transform.SetParent(root.transform, false);
        rice.transform.localPosition = new Vector3(0f, 0.2f, 0f);
        rice.transform.localScale = new Vector3(0.65f, 0.24f, 0.45f);
        rice.GetComponent<Renderer>().material = _riceMat;

        var fish = GameObject.CreatePrimitive(PrimitiveType.Cube);
        fish.transform.SetParent(root.transform, false);
        fish.transform.localPosition = new Vector3(0f, 0.36f, 0f);
        fish.transform.localScale = new Vector3(0.72f, 0.16f, 0.52f);
        fish.GetComponent<Renderer>().material = _fishMats[_prepTopping];

        _plates.Add(new Plate
        {
            T = 0.75f, // front-center launch point near chef
            Top = _prepTopping,
            Root = root
        });
        ClearPrepBoard();
    }

    Topping PickStageTopping()
    {
        int maxIdx = _stage == 1 ? 2 : (_stage < 3 ? 3 : (_stage < 6 ? 4 : 5));
        int r = Random.Range(1, maxIdx + 1);
        return (Topping)r;
    }

    void Update()
    {
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        if (_bannerTimer > 0f) _bannerTimer -= dt;

        // Animate belt slats
        float beltSpeed = 0.065f + (_stage - 1) * 0.008f;
        for (int i = 0; i < _beltSlats.Count; i++)
        {
            float st = ((i / (float)_beltSlats.Count) + Time.time * beltSpeed) % 1f;
            _beltSlats[i].position = BeltPoint(st);
        }

        if (_stageCleared || _stageFailed || _showStageMap)
        {
            if (Input.GetKeyDown(KeyCode.R)) StartStage(_stage);
            return;
        }

        HandleInput();
        UpdateBeltPlates(dt, beltSpeed);
        UpdateDiners(dt);

        _stageTimeLeft -= dt;
        if (_cash >= _goalCash)
        {
            _stageCleared = true;
            SetBanner($"STAGE {_stage} CLEARED! ¥{_cash} earned!");
            return;
        }
        if (_stageTimeLeft <= 0f || _missedOrders >= MaxMissed)
        {
            _stageFailed = true;
            SetBanner(_missedOrders >= MaxMissed ? "Too many Angry Diners walked out!" : "Shift time expired!");
        }
    }

    void HandleInput()
    {
        if (Input.GetKeyDown(KeyCode.Alpha1)) AddRice();
        if (Input.GetKeyDown(KeyCode.Alpha2)) AddTopping(Topping.Salmon);
        if (Input.GetKeyDown(KeyCode.Alpha3)) AddTopping(Topping.Tuna);
        if (Input.GetKeyDown(KeyCode.Alpha4)) AddTopping(Topping.Tamago);
        if (Input.GetKeyDown(KeyCode.Alpha5)) AddTopping(Topping.Ebi);
        if (Input.GetKeyDown(KeyCode.Alpha6)) AddTopping(Topping.Ikura);
        if (Input.GetKeyDown(KeyCode.Space)) LaunchToBelt();
        if (Input.GetKeyDown(KeyCode.X)) ClearPrepBoard();

        // Click on cutting board / belt to launch, or click diner to express-serve!
        if (Input.GetMouseButtonDown(0) && Input.mousePosition.y < Screen.height - 80f && Input.mousePosition.y > 70f)
        {
            var ray = _cam.ScreenPointToRay(Input.mousePosition);
            if (new Plane(Vector3.up, Vector3.zero).Raycast(ray, out float enter))
            {
                Vector3 hit = ray.GetPoint(enter);
                // Express serve directly if assembled and clicking a diner
                if (_hasRice && _prepTopping != Topping.None)
                {
                    for (int i = 0; i < _diners.Count; i++)
                    {
                        var d = _diners[i];
                        if (!d.Active || d.Wanted == Topping.None) continue;
                        if (Vector2.Distance(new Vector2(hit.x, hit.z), new Vector2(d.SeatPos.x, d.SeatPos.z)) < 1.5f)
                        {
                            if (d.Wanted == _prepTopping)
                            {
                                ServeDiner(d, true);
                                ClearPrepBoard();
                            }
                            else
                            {
                                SetBanner($"Wrong order! Seat {d.SeatIdx + 1} wants {d.Wanted}.");
                            }
                            return;
                        }
                    }

                    // Click near conveyor belt -> launch to belt
                    if (hit.z > -2.2f && hit.z < 3.8f)
                    {
                        LaunchToBelt();
                    }
                }
            }
        }
    }

    void UpdateBeltPlates(float dt, float beltSpeed)
    {
        for (int i = _plates.Count - 1; i >= 0; i--)
        {
            var p = _plates[i];
            p.T = (p.T + beltSpeed * dt) % 1f;
            p.Root.transform.position = BeltPoint(p.T) + Vector3.up * 0.1f;

            // Check diner match near their seat BeltT
            bool consumed = false;
            for (int dIdx = 0; dIdx < _diners.Count; dIdx++)
            {
                var d = _diners[dIdx];
                if (!d.Active || d.Wanted != p.Top) continue;
                float diff = Mathf.Abs(p.T - d.BeltT);
                if (diff < 0.035f)
                {
                    ServeDiner(d, false);
                    Destroy(p.Root);
                    _plates.RemoveAt(i);
                    consumed = true;
                    break;
                }
            }
            if (consumed) continue;
        }
    }

    void ServeDiner(Diner d, bool expressTip)
    {
        _streak++;
        int basePay = d.IsVip ? 160 : 100;
        int total = basePay + (_streak * 15) + (expressTip ? 50 : 0) + (_hasWasabi ? 25 : 0);
        _cash += total;
        d.Wanted = Topping.None;
        d.Cooldown = Random.Range(1.6f, 3.0f);
        SetBanner($"Served Seat {d.SeatIdx + 1}! +¥{total} (Streak x{_streak})");
    }

    void UpdateDiners(float dt)
    {
        for (int i = 0; i < _diners.Count; i++)
        {
            var d = _diners[i];
            if (!d.Active) continue;
            if (d.Wanted == Topping.None)
            {
                d.Cooldown -= dt;
                if (d.Cooldown <= 0f)
                {
                    d.Wanted = PickStageTopping();
                    d.MaxPatience = Mathf.Max(14f, (d.IsVip ? 19f : 26f) - _stage * 0.7f);
                    d.Patience = d.MaxPatience;
                }
            }
            else
            {
                d.Patience -= dt;
                if (d.Patience <= 0f)
                {
                    _streak = 0;
                    _missedOrders++;
                    SetBanner($"Seat {d.SeatIdx + 1} walked out! ({_missedOrders}/{MaxMissed})");
                    d.Wanted = Topping.None;
                    d.Cooldown = 2.0f;
                }
            }
        }
    }

    void OnGUI()
    {
        var bold = new GUIStyle(GUI.skin.box) { fontSize = 14, fontStyle = FontStyle.Bold };
        GUI.Box(new Rect(14, 10, Screen.width - 28, 56), "");
        GUI.Label(new Rect(26, 16, 620, 24),
            $"SUSHI CONVEYOR UNITY  |  STAGE {_stage}/{TotalStages} ({_stageNames[_stage - 1]})  |  ¥{_cash} / ¥{_goalCash}", bold);
        GUI.Label(new Rect(26, 38, 620, 20),
            $"Time Left: {Mathf.CeilToInt(_stageTimeLeft)}s  •  Streak: x{_streak}  •  Missed: {_missedOrders}/{MaxMissed}  •  Board: {(_hasRice ? "Rice✓" : "Empty")} {(_prepTopping != Topping.None ? $"+ {_prepTopping}" : "")}");

        if (GUI.Button(new Rect(Screen.width - 170, 16, 144, 38), _showStageMap ? "Close Stages" : "12 Stages Map"))
        {
            _showStageMap = !_showStageMap;
        }

        if (_showStageMap)
        {
            GUI.Box(new Rect(Screen.width * 0.5f - 280, 90, 560, 320), "");
            GUI.Label(new Rect(Screen.width * 0.5f - 260, 100, 520, 26), "SELECT SUSHI BAR STAGE (STAGES 1 - 12)", bold);
            for (int i = 0; i < TotalStages; i++)
            {
                int col = i % 3;
                int row = i / 3;
                float bx = Screen.width * 0.5f - 260 + col * 176;
                float by = 138 + row * 64;
                if (GUI.Button(new Rect(bx, by, 166, 54), $"{_stageNames[i]}\nGoal ¥{300 + i * 200}"))
                {
                    StartStage(i + 1);
                }
            }
            return;
        }

        // Order bubbles above diners
        for (int i = 0; i < _diners.Count; i++)
        {
            var d = _diners[i];
            if (!d.Active || d.Wanted == Topping.None) continue;
            Vector3 sp = _cam.WorldToScreenPoint(d.SeatPos + Vector3.up * 1.35f);
            if (sp.z <= 0f) continue;
            float sx = sp.x;
            float sy = Screen.height - sp.y;
            GUI.Box(new Rect(sx - 56, sy - 38, 112, 36), $"{(d.IsVip ? "★ " : "")}{d.Wanted}\n{Mathf.CeilToInt(d.Patience)}s");
        }

        // Prep Ingredient Bar at bottom
        if (GUI.Button(new Rect(14, Screen.height - 56, 98, 42), "1: Rice")) AddRice();
        if (GUI.Button(new Rect(118, Screen.height - 56, 98, 42), "2: Salmon")) AddTopping(Topping.Salmon);
        if (GUI.Button(new Rect(222, Screen.height - 56, 98, 42), "3: Tuna")) AddTopping(Topping.Tuna);
        if (_stage >= 1 && GUI.Button(new Rect(326, Screen.height - 56, 98, 42), "4: Tamago")) AddTopping(Topping.Tamago);
        if (_stage >= 6 && GUI.Button(new Rect(430, Screen.height - 56, 92, 42), "5: Ebi")) AddTopping(Topping.Ebi);
        if (_stage >= 3 && GUI.Button(new Rect(528, Screen.height - 56, 92, 42), "6: Ikura")) AddTopping(Topping.Ikura);
        if (GUI.Button(new Rect(Screen.width - 210, Screen.height - 56, 128, 42), "LAUNCH (Space)")) LaunchToBelt();
        if (GUI.Button(new Rect(Screen.width - 76, Screen.height - 56, 62, 42), "Trash (X)")) ClearPrepBoard();

        if (_bannerTimer > 0f)
        {
            GUI.Box(new Rect(Screen.width * 0.5f - 230, 72, 460, 28), _banner, bold);
        }

        if (_stageCleared || _stageFailed)
        {
            GUI.Box(new Rect(Screen.width * 0.5f - 180, Screen.height * 0.5f - 65, 360, 130), "");
            GUI.Label(new Rect(Screen.width * 0.5f - 155, Screen.height * 0.5f - 48, 310, 28),
                _stageCleared ? $"STAGE {_stage} SERVICE CLEARED!" : $"STAGE {_stage} SERVICE FAILED", bold);
            GUI.Label(new Rect(Screen.width * 0.5f - 155, Screen.height * 0.5f - 20, 310, 24),
                $"Sales: ¥{_cash} / ¥{_goalCash} • Stage {_stage}/{TotalStages}");
            if (_stageCleared && _stage < TotalStages)
            {
                if (GUI.Button(new Rect(Screen.width * 0.5f - 150, Screen.height * 0.5f + 16, 140, 34), $"Next: Stage {_stage + 1}"))
                {
                    StartStage(_stage + 1);
                }
                if (GUI.Button(new Rect(Screen.width * 0.5f + 10, Screen.height * 0.5f + 16, 140, 34), "12 Stages Map"))
                {
                    _showStageMap = true;
                }
            }
            else
            {
                if (GUI.Button(new Rect(Screen.width * 0.5f - 70, Screen.height * 0.5f + 16, 140, 34), "Retry Shift (R)"))
                {
                    StartStage(_stage);
                }
            }
        }
    }
}
