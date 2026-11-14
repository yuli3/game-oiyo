using System.Collections.Generic;
using UnityEngine;

public sealed class CozyGliderPlayer : MonoBehaviour
{
    struct StageCourse
    {
        public string Name;
        public int RingsRequired;
        public float TargetTime;
        public int Feathers;
        public Vector3[] RingOffsets;
        public Vector3[] ThermalCenters;
        public Vector3 LandingPad;
    }

    struct RingItem
    {
        public Vector3 Pos;
        public bool Collected;
        public GameObject Go;
    }

    struct ThermalZone
    {
        public Vector3 Center;
        public float Radius;
        public GameObject Go;
    }

    const int TotalStages = 12;
    readonly string[] _stageNames =
    {
        "Stage 1: Hawk Peak Valley",
        "Stage 2: Pine Needle Gorge",
        "Stage 3: Azure Coastline",
        "Stage 4: Thermal Spirals",
        "Stage 5: Whispering Cloud Canyon",
        "Stage 6: Golden Sunset Ridge",
        "Stage 7: Feather Sanctuary",
        "Stage 8: Crystal Wind Caverns",
        "Stage 9: Stormy Summit Pass",
        "Stage 10: Celestial Cloud Ring",
        "Stage 11: Falcon Dive Gauntlet",
        "Stage 12: Grand Albatross Odyssey"
    };

    Camera _cam;
    Transform _gliderRoot;
    Transform _gliderWings;

    readonly List<RingItem> _rings = new List<RingItem>();
    readonly List<ThermalZone> _thermals = new List<ThermalZone>();
    readonly List<GameObject> _scenery = new List<GameObject>();
    GameObject _landingPadGo;

    Vector3 _gliderPos;
    Quaternion _gliderRot = Quaternion.identity;
    float _pitch;
    float _yaw;
    float _roll;
    float _speed = 14f;

    int _stage = 1;
    int _feathers = 3;
    int _maxFeathers = 3;
    float _featherRechargeTimer;
    int _shells;
    int _ringsCleared;
    float _stageTimer;
    bool _stageCleared;
    bool _stageFailed;
    bool _showStageMap;
    string _banner = "W/S: Pitch (Dive/Climb) • A/D: Turn • Space: Feather Flap!";
    float _bannerTimer = 4.5f;

    Material _gliderMat;
    Material _wingMat;
    Material _ringMat;
    Material _ringDoneMat;
    Material _thermalMat;
    Material _landMat;
    Material _islandMat;

    void Start()
    {
        Application.targetFrameRate = 60;
        CreateMaterials();
        SetupCameraAndLight();
        BuildGliderModel();
        BuildSceneryIslands();
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
        _gliderMat = MakeMat(new Color(0.92f, 0.44f, 0.22f)); // Cozy Orange
        _wingMat = MakeMat(new Color(0.98f, 0.94f, 0.85f));   // Canvas White
        _ringMat = MakeMat(new Color(0.95f, 0.78f, 0.20f));   // Golden Ring
        _ringDoneMat = MakeMat(new Color(0.35f, 0.82f, 0.42f));
        _thermalMat = MakeMat(new Color(0.40f, 0.75f, 0.95f)); // Sky Blue Thermal
        _landMat = MakeMat(new Color(0.25f, 0.72f, 0.38f));   // Emerald Pad
        _islandMat = MakeMat(new Color(0.32f, 0.52f, 0.35f));  // Pine Green
    }

    void SetupCameraAndLight()
    {
        var camGo = new GameObject("Main Camera");
        camGo.tag = "MainCamera";
        _cam = camGo.AddComponent<Camera>();
        _cam.clearFlags = CameraClearFlags.SolidColor;
        _cam.backgroundColor = new Color(0.45f, 0.72f, 0.88f); // Sunny Sky
        _cam.fieldOfView = 55f;

        var sunGo = new GameObject("Sun");
        var l = sunGo.AddComponent<Light>();
        l.type = LightType.Directional;
        l.intensity = 1.35f;
        l.color = new Color(1.0f, 0.96f, 0.88f);
        sunGo.transform.rotation = Quaternion.Euler(50f, -30f, 0f);
    }

    void BuildGliderModel()
    {
        var root = new GameObject("GliderRoot");
        _gliderRoot = root.transform;

        // Fuselage
        var body = GameObject.CreatePrimitive(PrimitiveType.Capsule);
        body.transform.SetParent(_gliderRoot, false);
        body.transform.localRotation = Quaternion.Euler(90f, 0f, 0f);
        body.transform.localScale = new Vector3(0.55f, 1.2f, 0.55f);
        body.GetComponent<Renderer>().material = _gliderMat;

        // Main Wings (Delta shape)
        var wings = GameObject.CreatePrimitive(PrimitiveType.Cube);
        _gliderWings = wings.transform;
        _gliderWings.SetParent(_gliderRoot, false);
        _gliderWings.localPosition = new Vector3(0f, 0.15f, 0.25f);
        _gliderWings.localScale = new Vector3(3.8f, 0.08f, 1.25f);
        wings.GetComponent<Renderer>().material = _wingMat;

        // Tail fin
        var tail = GameObject.CreatePrimitive(PrimitiveType.Cube);
        tail.transform.SetParent(_gliderRoot, false);
        tail.transform.localPosition = new Vector3(0f, 0.45f, -1.0f);
        tail.transform.localScale = new Vector3(0.12f, 0.75f, 0.55f);
        tail.GetComponent<Renderer>().material = _gliderMat;
    }

    void BuildSceneryIslands()
    {
        // Floating archipelago / mountain peaks below
        float[] xs = { -40f, 30f, -60f, 50f, 0f, -20f, 45f };
        float[] zs = { 30f, 70f, 120f, 160f, 210f, 280f, 340f };
        for (int i = 0; i < xs.Length; i++)
        {
            var island = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            island.transform.position = new Vector3(xs[i], -12f, zs[i]);
            island.transform.localScale = new Vector3(35f + (i % 3) * 15f, 15f, 35f + (i % 3) * 15f);
            island.GetComponent<Renderer>().material = _islandMat;
            _scenery.Add(island);
        }
    }

    void StartStage(int st)
    {
        _stage = Mathf.Clamp(st, 1, TotalStages);
        _gliderPos = new Vector3(0f, 28f + _stage * 1.5f, 0f);
        _pitch = 4f;
        _yaw = 0f;
        _roll = 0f;
        _speed = 15f;

        _ringsCleared = 0;
        _stageTimer = 0f;
        _maxFeathers = 3 + (_stage / 4);
        _feathers = _maxFeathers;
        _stageCleared = false;
        _stageFailed = false;
        _showStageMap = false;

        GenerateCourseForStage(_stage);
        SetBanner($"Stage {_stage}/12: {_stageNames[_stage - 1]}");
    }

    void GenerateCourseForStage(int st)
    {
        // Clear existing stage items
        for (int i = 0; i < _rings.Count; i++) if (_rings[i].Go != null) Destroy(_rings[i].Go);
        for (int i = 0; i < _thermals.Count; i++) if (_thermals[i].Go != null) Destroy(_thermals[i].Go);
        if (_landingPadGo != null) Destroy(_landingPadGo);
        _rings.Clear();
        _thermals.Clear();

        int ringCount = 5 + (st / 2);
        float forwardStep = 32f + st * 2f;
        Vector3 cur = _gliderPos + new Vector3(0f, -2f, 28f);

        for (int i = 0; i < ringCount; i++)
        {
            float sweep = Mathf.Sin((i + st) * 0.85f) * (14f + st * 1.5f);
            float elev = Mathf.Cos(i * 0.9f) * 6f;
            cur = new Vector3(sweep, Mathf.Clamp(cur.y + elev, 10f, 48f), cur.z + forwardStep);

            var ringGo = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            ringGo.name = $"Ring_{i + 1}";
            ringGo.transform.position = cur;
            ringGo.transform.rotation = Quaternion.Euler(90f, 0f, 0f);
            ringGo.transform.localScale = new Vector3(4.8f, 0.25f, 4.8f);
            ringGo.GetComponent<Renderer>().material = _ringMat;

            _rings.Add(new RingItem { Pos = cur, Collected = false, Go = ringGo });

            // Place a thermal every few rings
            if (i % 3 == 1)
            {
                Vector3 thPos = cur - new Vector3(sweep * 0.3f, cur.y * 0.5f, forwardStep * 0.4f);
                var thGo = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                thGo.name = $"Thermal_{i}";
                thGo.transform.position = new Vector3(thPos.x, 15f, thPos.z);
                thGo.transform.localScale = new Vector3(7.5f, 15f, 7.5f);
                thGo.GetComponent<Renderer>().material = _thermalMat;
                _thermals.Add(new ThermalZone { Center = thGo.transform.position, Radius = 6.5f, Go = thGo });
            }
        }

        // Landing pad at end of course
        Vector3 padPos = new Vector3(0f, 4.5f, cur.z + 42f);
        _landingPadGo = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        _landingPadGo.name = "LandingPad";
        _landingPadGo.transform.position = padPos;
        _landingPadGo.transform.localScale = new Vector3(14f, 0.8f, 14f);
        _landingPadGo.GetComponent<Renderer>().material = _landMat;
    }

    void SetBanner(string msg)
    {
        _banner = msg;
        _bannerTimer = 3.2f;
    }

    void Update()
    {
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        if (_bannerTimer > 0f) _bannerTimer -= dt;

        if (_stageCleared || _stageFailed || _showStageMap)
        {
            if (Input.GetKeyDown(KeyCode.R)) StartStage(_stage);
            return;
        }

        HandleFlightInput(dt);
        SimulateGliderAerodynamics(dt);
        CheckRingAndThermalCollisions();
        UpdateCameraFollow(dt);

        _stageTimer += dt;
        _featherRechargeTimer += dt;
        if (_featherRechargeTimer >= 4.5f)
        {
            _featherRechargeTimer = 0f;
            if (_feathers < _maxFeathers) _feathers++;
        }

        // Crash condition (hit ground below elevation 1.5m without clearing rings)
        if (_gliderPos.y <= 2.0f)
        {
            if (_ringsCleared >= _rings.Count * 0.7f && _landingPadGo != null &&
                Vector2.Distance(new Vector2(_gliderPos.x, _gliderPos.z), new Vector2(_landingPadGo.transform.position.x, _landingPadGo.transform.position.z)) < 9.5f)
            {
                _stageCleared = true;
                _shells += 50 + _stage * 15;
                SetBanner($"TOUCHDOWN! Stage {_stage} Complete! +Shells!");
            }
            else
            {
                _stageFailed = true;
                SetBanner("Glider stalled or crash-landed! Press R to relaunch.");
            }
        }
    }

    void HandleFlightInput(float dt)
    {
        float pitchInput = 0f;
        float rollInput = 0f;

        if (Input.GetKey(KeyCode.W) || Input.GetKey(KeyCode.UpArrow)) pitchInput += 1f;    // Dive down to gain speed
        if (Input.GetKey(KeyCode.S) || Input.GetKey(KeyCode.DownArrow)) pitchInput -= 1f;  // Pull up to climb (loses speed)
        if (Input.GetKey(KeyCode.A) || Input.GetKey(KeyCode.LeftArrow)) rollInput -= 1f;  // Bank turn left
        if (Input.GetKey(KeyCode.D) || Input.GetKey(KeyCode.RightArrow)) rollInput += 1f;  // Bank turn right

        // Feather Flap Boost
        if ((Input.GetKeyDown(KeyCode.Space) || Input.GetMouseButtonDown(0)) && _feathers > 0)
        {
            _feathers--;
            _speed = Mathf.Min(32f, _speed + 7.5f);
            _gliderPos += Vector3.up * 4.2f;
            SetBanner($"🪶 Feather Flap! Speed {_speed:0} m/s (Feathers: {_feathers}/{_maxFeathers})");
        }

        // Smooth pitch and roll responses
        _pitch = Mathf.Clamp(_pitch + pitchInput * 48f * dt, -35f, 35f);
        _roll = Mathf.Lerp(_roll, rollInput * -45f, dt * 6.5f);
        _yaw += rollInput * 38f * dt;
    }

    void SimulateGliderAerodynamics(float dt)
    {
        // Dive gains speed, climb burns speed
        float diveFactor = Mathf.Sin(_pitch * Mathf.Deg2Rad);
        _speed = Mathf.Clamp(_speed + diveFactor * 9.8f * dt - 1.2f * dt, 7.5f, 34f);

        // Forward vector derived from Euler angles
        _gliderRot = Quaternion.Euler(_pitch, _yaw, _roll);
        Vector3 fwd = _gliderRot * Vector3.forward;

        // Base glide sink rate (-1.6 m/s base sink modified by pitch)
        float verticalRate = fwd.y * _speed - 0.75f;
        Vector3 velocity = new Vector3(fwd.x * _speed, verticalRate, fwd.z * _speed);

        _gliderPos += velocity * dt;
        _gliderRoot.position = _gliderPos;
        _gliderRoot.rotation = _gliderRot;
    }

    void CheckRingAndThermalCollisions()
    {
        // Check Rings
        for (int i = 0; i < _rings.Count; i++)
        {
            var r = _rings[i];
            if (r.Collected) continue;

            float dist = Vector3.Distance(_gliderPos, r.Pos);
            if (dist < 3.8f)
            {
                r.Collected = true;
                r.Go.GetComponent<Renderer>().material = _ringDoneMat;
                _rings[i] = r;
                _ringsCleared++;
                _shells += 25;
                _speed = Mathf.Min(32f, _speed + 4f); // Speed ring boost
                SetBanner($"Ring Passed! ({_ringsCleared}/{_rings.Count}) +25 Shells 🐚");
            }
        }

        // Check Thermal Columns (Lift zones)
        for (int i = 0; i < _thermals.Count; i++)
        {
            var th = _thermals[i];
            float horizDist = Vector2.Distance(new Vector2(_gliderPos.x, _gliderPos.z), new Vector2(th.Center.x, th.Center.z));
            if (horizDist < th.Radius && _gliderPos.y < 46f)
            {
                _gliderPos += Vector3.up * (14.5f * Time.deltaTime);
                SetBanner("♨️ Inside Thermal Column! Soaring upwards!");
            }
        }

        // Check Landing Pad auto-touchdown when nearing end
        if (_landingPadGo != null && _ringsCleared >= _rings.Count * 0.75f)
        {
            Vector3 padPos = _landingPadGo.transform.position;
            float padDist = Vector3.Distance(_gliderPos, padPos + Vector3.up * 1.5f);
            if (padDist < 7.5f)
            {
                _stageCleared = true;
                _shells += 60 + _stage * 20;
                SetBanner($"STAGE {_stage} CLEARED! Perfect Hawk Landing!");
            }
        }
    }

    void UpdateCameraFollow(float dt)
    {
        Vector3 camOffset = _gliderRot * new Vector3(0f, 2.4f, -6.8f);
        Vector3 desiredCam = _gliderPos + camOffset;
        _cam.transform.position = Vector3.Lerp(_cam.transform.position, desiredCam, dt * 8f);
        _cam.transform.LookAt(_gliderPos + _gliderRot * Vector3.forward * 4.5f);
    }

    void OnGUI()
    {
        var bold = new GUIStyle(GUI.skin.box) { fontSize = 14, fontStyle = FontStyle.Bold };
        GUI.Box(new Rect(14, 10, Screen.width - 28, 58), "");
        GUI.Label(new Rect(26, 16, 620, 24),
            $"COZY GLIDER 3D UNITY  |  STAGE {_stage}/{TotalStages} ({_stageNames[_stage - 1]})  |  RINGS: {_ringsCleared}/{_rings.Count}  |  SHELLS: {_shells} 🐚", bold);
        GUI.Label(new Rect(26, 38, 620, 20),
            $"Speed: {_speed:0.0} m/s  •  Alt: {_gliderPos.y:0} m  •  Feathers: {'🪶'.ToString()}{_feathers}/{_maxFeathers}  •  Time: {_stageTimer:0.0}s");

        if (GUI.Button(new Rect(Screen.width - 170, 16, 144, 38), _showStageMap ? "Close Stages" : "12 Stages Map"))
        {
            _showStageMap = !_showStageMap;
        }

        if (_showStageMap)
        {
            GUI.Box(new Rect(Screen.width * 0.5f - 280, 80, 560, 330), "");
            GUI.Label(new Rect(Screen.width * 0.5f - 260, 90, 520, 26), "SELECT GLIDER EXPEDITION (STAGES 1 - 12)", bold);
            for (int i = 0; i < TotalStages; i++)
            {
                int col = i % 3;
                int row = i / 3;
                float bx = Screen.width * 0.5f - 260 + col * 176;
                float by = 126 + row * 64;
                if (GUI.Button(new Rect(bx, by, 166, 54), $"{_stageNames[i]}\nFeathers: {3 + (i / 4)}"))
                {
                    StartStage(i + 1);
                }
            }
            return;
        }

        if (_bannerTimer > 0f)
        {
            GUI.Box(new Rect(Screen.width * 0.5f - 230, 74, 460, 28), _banner, bold);
        }

        if (_stageCleared || _stageFailed)
        {
            GUI.Box(new Rect(Screen.width * 0.5f - 180, Screen.height * 0.5f - 65, 360, 130), "");
            GUI.Label(new Rect(Screen.width * 0.5f - 155, Screen.height * 0.5f - 48, 310, 28),
                _stageCleared ? $"STAGE {_stage} EXPEDITION COMPLETE!" : $"STAGE {_stage} CRASH-LANDED!", bold);
            GUI.Label(new Rect(Screen.width * 0.5f - 155, Screen.height * 0.5f - 20, 310, 24),
                $"Rings: {_ringsCleared}/{_rings.Count} • Time: {_stageTimer:0.0}s • Shells: {_shells} 🐚");

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
                if (GUI.Button(new Rect(Screen.width * 0.5f - 70, Screen.height * 0.5f + 16, 140, 34), "Relaunch (R)"))
                {
                    StartStage(_stage);
                }
            }
        }
    }
}
