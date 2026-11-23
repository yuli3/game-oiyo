using System.Collections.Generic;
using UnityEngine;

public sealed class CozyGliderPlayer : MonoBehaviour
{
    // Page language for English UI text (scripts/unity/oiyo-i18n).
    static string U(string en) => OiyoI18n.Ui(en, OiyoI18n.Page);
    static string F(string en, params object[] args) => string.Format(OiyoI18n.Ui(en, OiyoI18n.Page), args);
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

    const int TotalStages = 30;
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
        "Stage 12: Grand Albatross Odyssey",
        // 13-30: the Stage* helpers below keep climbing from stage 12
        "Stage 13: Misty Fjord Run",
        "Stage 14: Lantern Lake Loop",
        "Stage 15: Twin Waterfall Gate",
        "Stage 16: Kite Festival Skies",
        "Stage 17: Rocky Arch Slalom",
        "Stage 18: Owl Moon Glide",
        "Stage 19: Lavender Field Drift",
        "Stage 20: Thunderhead Crossing",
        "Stage 21: Glacier Spine Ridge",
        "Stage 22: Coral Reef Coast",
        "Stage 23: Volcano Updraft",
        "Stage 24: Bamboo Forest Weave",
        "Stage 25: Aurora Night Flight",
        "Stage 26: Canyon Needle Run",
        "Stage 27: Monsoon Front",
        "Stage 28: Sky Temple Steps",
        "Stage 29: Jet Stream Edge",
        "Stage 30: Endless Horizon Voyage"
    };

    // Stages 1-12 keep their original formulas. From 13 the course keeps growing (more rings,
    // longer legs, wider sweeps), the launch height and ring size shrink a little,
    // feathers drop from 6 to 4 and thermals thin out from stage 24.
    static float StageStartAlt(int st) => st <= 12 ? 28f + st * 1.5f : 46f - (st - 12) * 0.5f;
    static int StageFeathers(int st) => st <= 12 ? 3 + st / 4 : 6 - (st - 12) / 9;
    static int StageRingCount(int st) => st <= 12 ? 5 + st / 2 : 11 + (st - 12) / 3;
    static float StageForwardStep(int st) => st <= 12 ? 32f + st * 2f : 56f + (st - 12) * 0.8f;
    static float StageSweep(int st) => st <= 12 ? 14f + st * 1.5f : 32f + (st - 12) * 0.6f;
    static float StageElev(int st) => st <= 12 ? 6f : 6f + (st - 12) * 0.2f;
    static int StageThermalEvery(int st) => st < 24 ? 3 : 4;
    static float StageRingRadius(int st) => st <= 12 ? 3.8f : 3.8f - (st - 12) * 0.03f;
    Vector2 _stageMapScroll;

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
    string _banner = U("W/S: Pitch (Dive/Climb) • A/D: Turn • Space: Feather Flap!");
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
        var m = new Material(OiyoShaders.Safe(shader));
        m.color = c;
        return m;
    }

    // ---- Painted art (scripts/make_art.py -> Resources/CG/Art) ----
    static Texture2D ArtTex(string name, bool repeat = false)
    {
        var t = Resources.Load<Texture2D>("CG/Art/" + name);
        if (t != null) t.wrapMode = repeat ? TextureWrapMode.Repeat : TextureWrapMode.Clamp;
        return t;
    }

    static Material LitArt(string tex, float tileX = 1f, float tileY = 1f)
    {
        var m = MakeMat(Color.white);
        m.mainTexture = ArtTex(tex, tileX != 1f || tileY != 1f);
        m.mainTextureScale = new Vector2(tileX, tileY);
        if (m.HasProperty("_Glossiness")) m.SetFloat("_Glossiness", 0.1f);
        return m;
    }

    static Material CutoutArt(string tex)
    {
        var sh = Shader.Find("OIYO/UnlitCutout");
        var m = new Material(sh != null ? sh : Shader.Find("Sprites/Default"));
        m.mainTexture = ArtTex(tex);
        m.color = Color.white;
        return m;
    }

    static GameObject ArtQuad(string name, Material mat)
    {
        var go = GameObject.CreatePrimitive(PrimitiveType.Quad);
        go.name = name;
        Destroy(go.GetComponent<Collider>());
        go.GetComponent<Renderer>().material = mat;
        return go;
    }

    Material _pineMat;

    void CreateMaterials()
    {
        _gliderMat = LitArt("body");
        _wingMat = LitArt("wing");
        _ringMat = CutoutArt("hoop");
        _ringDoneMat = CutoutArt("hoop_done");
        _thermalMat = new Material(Shader.Find("Sprites/Default")); // soft see-through updraft
        _thermalMat.mainTexture = ArtTex("thermal", true);
        _thermalMat.mainTextureScale = new Vector2(3f, 2f);
        _landMat = LitArt("pad");
        _islandMat = LitArt("island", 3f, 1f);
        _pineMat = CutoutArt("pine");
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

        // Painted sky that travels with the camera, far behind everything
        _cam.farClipPlane = 1200f;
        var skyMat = CutoutArt("sky");
        skyMat.renderQueue = 1000;
        var sky = ArtQuad("Sky", skyMat);
        sky.transform.SetParent(_cam.transform, false);
        sky.transform.localPosition = new Vector3(0f, 0f, 1000f);
        sky.transform.localScale = new Vector3(2000f, 1125f, 1f);
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
        // Calm sea far below the course (purely scenic)
        var seaMat = LitArt("sea", 60f, 60f);
        var seaGo = ArtQuad("Sea", seaMat);
        seaGo.transform.position = new Vector3(0f, -3f, 250f);
        seaGo.transform.rotation = Quaternion.Euler(90f, 0f, 0f);
        seaGo.transform.localScale = new Vector3(1400f, 1400f, 1f);
        _scenery.Add(seaGo);

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

            // a few pines on top: two crossed quads each, so they read from any angle
            float r = island.transform.localScale.x * 0.5f;
            for (int k = 0; k < 5; k++)
            {
                float a = (k * 2.4f + i) % 6.283f;
                float rr = r * (0.25f + 0.13f * k);
                var basePos = new Vector3(xs[i] + Mathf.Cos(a) * rr, 3f + 4f, zs[i] + Mathf.Sin(a) * rr);
                for (int c = 0; c < 2; c++)
                {
                    var tree = ArtQuad("Pine", _pineMat);
                    tree.transform.position = basePos;
                    tree.transform.rotation = Quaternion.Euler(0f, a * Mathf.Rad2Deg + c * 90f, 0f);
                    tree.transform.localScale = new Vector3(4f, 8f, 1f);
                    _scenery.Add(tree);
                }
            }
        }
    }

    void StartStage(int st)
    {
        _stage = Mathf.Clamp(st, 1, TotalStages);
        _gliderPos = new Vector3(0f, StageStartAlt(_stage), 0f);
        _pitch = 4f;
        _yaw = 0f;
        _roll = 0f;
        _speed = 15f;

        _ringsCleared = 0;
        _stageTimer = 0f;
        _maxFeathers = StageFeathers(_stage);
        _feathers = _maxFeathers;
        _stageCleared = false;
        _stageFailed = false;
        _showStageMap = false;

        GenerateCourseForStage(_stage);
        SetBanner(F("Stage {0}/30: {1}", _stage, U(_stageNames[_stage - 1])));
    }

    void GenerateCourseForStage(int st)
    {
        // Clear existing stage items
        for (int i = 0; i < _rings.Count; i++) if (_rings[i].Go != null) Destroy(_rings[i].Go);
        for (int i = 0; i < _thermals.Count; i++) if (_thermals[i].Go != null) Destroy(_thermals[i].Go);
        if (_landingPadGo != null) Destroy(_landingPadGo);
        _rings.Clear();
        _thermals.Clear();

        int ringCount = StageRingCount(st);
        float forwardStep = StageForwardStep(st);
        Vector3 cur = _gliderPos + new Vector3(0f, -2f, 28f);

        for (int i = 0; i < ringCount; i++)
        {
            float sweep = Mathf.Sin((i + st) * 0.85f) * StageSweep(st);
            float elev = Mathf.Cos(i * 0.9f) * StageElev(st);
            cur = new Vector3(sweep, Mathf.Clamp(cur.y + elev, 10f, 48f), cur.z + forwardStep);

            var ringGo = ArtQuad($"Ring_{i + 1}", _ringMat);
            ringGo.transform.position = cur;
            ringGo.transform.localScale = new Vector3(5.6f, 5.6f, 1f);

            _rings.Add(new RingItem { Pos = cur, Collected = false, Go = ringGo });

            // Place a thermal every few rings
            if (i % StageThermalEvery(st) == 1)
            {
                Vector3 thPos = cur - new Vector3(sweep * 0.3f, cur.y * 0.5f, forwardStep * 0.4f);
                var thGo = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                thGo.name = $"Thermal_{i}";
                thGo.transform.position = new Vector3(thPos.x, 15f, thPos.z);
                thGo.transform.localScale = new Vector3(7.5f, 15f, 7.5f);
                Destroy(thGo.GetComponent<Collider>());
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
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.TrackEnded("cozy-glider", _stageCleared || _stageFailed, _stageCleared, 0);
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
                SetBanner(F("TOUCHDOWN! Stage {0} Complete! +Shells!", _stage));
            }
            else
            {
                _stageFailed = true;
                SetBanner(U("Glider stalled or crash-landed! Press R to relaunch."));
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
        if ((Input.GetKeyDown(KeyCode.Space) || OiyoPointerInput.GetMouseButtonDown(0)) && _feathers > 0)
        {
            _feathers--;
            _speed = Mathf.Min(32f, _speed + 7.5f);
            _gliderPos += Vector3.up * 4.2f;
            SetBanner(F("🪶 Feather Flap! Speed {0:0} m/s (Feathers: {1}/{2})", _speed, _feathers, _maxFeathers));
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
            if (dist < StageRingRadius(_stage))
            {
                r.Collected = true;
                r.Go.GetComponent<Renderer>().material = _ringDoneMat;
                _rings[i] = r;
                _ringsCleared++;
                _shells += 25;
                _speed = Mathf.Min(32f, _speed + 4f); // Speed ring boost
                SetBanner(F("Ring Passed! ({0}/{1}) +25 Shells 🐚", _ringsCleared, _rings.Count));
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
                SetBanner(U("♨️ Inside Thermal Column! Soaring upwards!"));
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
                SetBanner(F("STAGE {0} CLEARED! Perfect Hawk Landing!", _stage));
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
        OiyoUiFont.Apply();
        var bold = new GUIStyle(GUI.skin.box) { fontSize = 14, fontStyle = FontStyle.Bold };
        GUI.Box(new Rect(14, 10, Screen.width - 28, 58), "");
        GUI.Label(new Rect(26, 16, 620, 24),
            F("COZY GLIDER 3D UNITY  |  STAGE {0}/{1} ({2})  |  RINGS: {3}/{4}  |  SHELLS: {5} 🐚", _stage, TotalStages, U(_stageNames[_stage - 1]), _ringsCleared, _rings.Count, _shells), bold);
        GUI.Label(new Rect(26, 38, 620, 20),
            F("Speed: {0:0.0} m/s  •  Alt: {1:0} m  •  Feathers: 🪶 {2}/{3}  •  Time: {4:0.0}s", _speed, _gliderPos.y, _feathers, _maxFeathers, _stageTimer));

        if (GUI.Button(new Rect(Screen.width - 170, 16, 144, 38), _showStageMap ? U("Close Stages") : U("30 Stages Map")))
        {
            _showStageMap = !_showStageMap;
        }

        if (_showStageMap)
        {
            // 4 columns, scrolling for all 30 stages
            float mh = Mathf.Min(430f, Screen.height - 100f);
            GUI.Box(new Rect(Screen.width * 0.5f - 300, 80, 600, mh), "");
            GUI.Label(new Rect(Screen.width * 0.5f - 280, 90, 560, 26), U("SELECT GLIDER EXPEDITION (STAGES 1 - 30)"), bold);
            var cell = new GUIStyle(GUI.skin.button) { wordWrap = true, fontSize = 11 };
            int rows = (TotalStages + 3) / 4;
            var view = new Rect(Screen.width * 0.5f - 290, 124, 580, mh - 54);
            _stageMapScroll = GUI.BeginScrollView(view, _stageMapScroll, new Rect(0, 0, 560, rows * 64), false, true);
            for (int i = 0; i < TotalStages; i++)
            {
                int col = i % 4;
                int row = i / 4;
                if (GUI.Button(new Rect(col * 140, row * 64, 134, 58), F("{0}\nFeathers: {1}", U(_stageNames[i]), StageFeathers(i + 1)), cell))
                {
                    StartStage(i + 1);
                }
            }
            GUI.EndScrollView();
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
                _stageCleared ? F("STAGE {0} EXPEDITION COMPLETE!", _stage) : F("STAGE {0} CRASH-LANDED!", _stage), bold);
            GUI.Label(new Rect(Screen.width * 0.5f - 155, Screen.height * 0.5f - 20, 310, 24),
                F("Rings: {0}/{1} • Time: {2:0.0}s • Shells: {3} 🐚", _ringsCleared, _rings.Count, _stageTimer, _shells));

            if (_stageCleared && _stage < TotalStages)
            {
                if (GUI.Button(new Rect(Screen.width * 0.5f - 150, Screen.height * 0.5f + 16, 140, 34), F("Next: Stage {0}", _stage + 1)))
                {
                    StartStage(_stage + 1);
                }
                if (GUI.Button(new Rect(Screen.width * 0.5f + 10, Screen.height * 0.5f + 16, 140, 34), U("30 Stages Map")))
                {
                    _showStageMap = true;
                }
            }
            else
            {
                if (GUI.Button(new Rect(Screen.width * 0.5f - 70, Screen.height * 0.5f + 16, 140, 34), U("Relaunch (R)")))
                {
                    StartStage(_stage);
                }
            }
        }
    }
}
