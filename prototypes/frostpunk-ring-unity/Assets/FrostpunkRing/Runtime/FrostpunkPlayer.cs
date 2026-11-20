using System.Collections.Generic;
using UnityEngine;

public sealed class FrostpunkPlayer : MonoBehaviour
{
    enum BuildingType
    {
        Empty,
        Tent,
        CoalThumper,
        Sawmill,
        MedicalPost,
        SteamHub
    }

    sealed class Plot
    {
        public int Ring; // 1 (inner 8) or 2 (outer 12)
        public int Sector;
        public Vector3 Pos;
        public float AngleDeg;
        public BuildingType Type;
        public GameObject BasePad;
        public GameObject Structure;
        public float LocalTempC;
    }

    sealed class SnowFlake
    {
        public GameObject Go;
        public Vector3 Vel;
    }

    Camera _cam;
    Light _genLight;
    Transform _genCore;
    readonly List<Plot> _plots = new List<Plot>();
    readonly List<SnowFlake> _snow = new List<SnowFlake>();
    readonly List<SnowFlake> _steam = new List<SnowFlake>();

    float _camAngle = 25f;
    float _camPitch = 46f;
    float _camDist = 24f;

    float _coal = 60f;
    float _wood = 32f;
    int _citizens = 30;
    int _sick = 2;
    float _hope = 70f;
    int _genPower = 1; // 0, 1, 2
    bool _overdrive;
    float _stress;

    int _day = 1;
    const int MaxDays = 6;
    float _dayTimer;
    const float DayLengthSec = 32f;
    BuildingType _selectedTool = BuildingType.CoalThumper;
    bool _gameOver;
    bool _victory;
    string _alert = "Click concentric snow plots directly to build & keep citizens warm!";
    float _alertTimer = 4f;

    Material _snowMat;
    Material _warmPlotMat;
    Material _coldPlotMat;
    Material _ironMat;
    Material _furnaceMat;
    Material _steamMat;
    readonly Dictionary<BuildingType, Material> _bldgMats = new Dictionary<BuildingType, Material>();

    void Start()
    {
        Application.targetFrameRate = 60;
        CreateMaterials();
        SetupCameraAndLight();
        BuildCraterAndGenerator();
        SpawnSnowParticles();
        ResetCity();
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
        _snowMat = MakeMat(new Color(0.76f, 0.84f, 0.92f));
        _warmPlotMat = MakeMat(new Color(0.86f, 0.56f, 0.30f));
        _coldPlotMat = MakeMat(new Color(0.46f, 0.58f, 0.72f));
        _ironMat = MakeMat(new Color(0.24f, 0.27f, 0.32f));
        _furnaceMat = MakeMat(new Color(1.0f, 0.48f, 0.10f));
        _steamMat = MakeMat(new Color(0.92f, 0.95f, 0.99f));

        _bldgMats[BuildingType.Tent] = MakeMat(new Color(0.82f, 0.74f, 0.54f));
        _bldgMats[BuildingType.CoalThumper] = MakeMat(new Color(0.22f, 0.22f, 0.26f));
        _bldgMats[BuildingType.Sawmill] = MakeMat(new Color(0.56f, 0.36f, 0.18f));
        _bldgMats[BuildingType.MedicalPost] = MakeMat(new Color(0.90f, 0.94f, 0.96f));
        _bldgMats[BuildingType.SteamHub] = MakeMat(new Color(0.96f, 0.55f, 0.16f));
    }

    void SetupCameraAndLight()
    {
        var camGo = new GameObject("Main Camera");
        camGo.tag = "MainCamera";
        _cam = camGo.AddComponent<Camera>();
        _cam.clearFlags = CameraClearFlags.SolidColor;
        _cam.backgroundColor = new Color(0.08f, 0.12f, 0.19f);
        _cam.fieldOfView = 45f;

        var sunGo = new GameObject("Moonlight");
        var sun = sunGo.AddComponent<Light>();
        sun.type = LightType.Directional;
        sun.intensity = 0.85f;
        sun.color = new Color(0.72f, 0.84f, 1.0f);
        sunGo.transform.rotation = Quaternion.Euler(50f, -35f, 0f);

        var genLightGo = new GameObject("GeneratorWarmth");
        _genLight = genLightGo.AddComponent<Light>();
        _genLight.type = LightType.Point;
        _genLight.range = 18f;
        _genLight.intensity = 5.5f;
        _genLight.color = new Color(1.0f, 0.56f, 0.18f);
        genLightGo.transform.position = new Vector3(0f, 3.5f, 0f);
    }

    void BuildCraterAndGenerator()
    {
        var ground = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        ground.transform.position = new Vector3(0f, -0.5f, 0f);
        ground.transform.localScale = new Vector3(26f, 0.5f, 26f);
        ground.GetComponent<Renderer>().material = _snowMat;

        // Central Steam Generator
        var genBase = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        genBase.transform.position = new Vector3(0f, 1.1f, 0f);
        genBase.transform.localScale = new Vector3(2.4f, 1.1f, 2.4f);
        genBase.GetComponent<Renderer>().material = _ironMat;

        var chimney = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        chimney.transform.position = new Vector3(0f, 3.0f, 0f);
        chimney.transform.localScale = new Vector3(1.1f, 1.5f, 1.1f);
        chimney.GetComponent<Renderer>().material = _ironMat;

        var coreGo = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        _genCore = coreGo.transform;
        _genCore.position = new Vector3(0f, 1.4f, 0f);
        _genCore.localScale = Vector3.one * 1.9f;
        coreGo.GetComponent<Renderer>().material = _furnaceMat;

        // Concentric radial plots: Ring 1 (8 sectors, r=4.8), Ring 2 (12 sectors, r=8.6)
        CreateRingPlots(1, 8, 4.8f);
        CreateRingPlots(2, 12, 8.6f);
    }

    void CreateRingPlots(int ring, int count, float radius)
    {
        for (int i = 0; i < count; i++)
        {
            float angDeg = (i * 360f / count);
            float rad = angDeg * Mathf.Deg2Rad;
            Vector3 pos = new Vector3(Mathf.Cos(rad) * radius, 0.05f, Mathf.Sin(rad) * radius);

            var pad = GameObject.CreatePrimitive(PrimitiveType.Cube);
            pad.transform.position = pos;
            pad.transform.rotation = Quaternion.Euler(0f, -angDeg, 0f);
            pad.transform.localScale = ring == 1 ? new Vector3(2.1f, 0.14f, 2.3f) : new Vector3(2.3f, 0.14f, 2.6f);
            pad.GetComponent<Renderer>().material = _coldPlotMat;

            _plots.Add(new Plot
            {
                Ring = ring,
                Sector = i,
                Pos = pos,
                AngleDeg = angDeg,
                Type = BuildingType.Empty,
                BasePad = pad
            });
        }
    }

    void SpawnSnowParticles()
    {
        for (int i = 0; i < 65; i++)
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            go.transform.position = new Vector3(Random.Range(-14f, 14f), Random.Range(0.5f, 12f), Random.Range(-14f, 14f));
            go.transform.localScale = Vector3.one * 0.12f;
            go.GetComponent<Renderer>().material = _steamMat;
            _snow.Add(new SnowFlake
            {
                Go = go,
                Vel = new Vector3(Random.Range(-2.5f, -0.8f), Random.Range(-4.5f, -2.5f), Random.Range(-1f, 1f))
            });
        }
    }

    void ResetCity()
    {
        for (int i = 0; i < _plots.Count; i++)
        {
            if (_plots[i].Structure != null) Destroy(_plots[i].Structure);
            _plots[i].Structure = null;
            _plots[i].Type = BuildingType.Empty;
        }
        _coal = 65f;
        _wood = 32f;
        _citizens = 30;
        _sick = 1;
        _hope = 75f;
        _genPower = 1;
        _overdrive = false;
        _stress = 0f;
        _day = 1;
        _dayTimer = 0f;
        _gameOver = false;
        _victory = false;

        // Starter buildings in Ring 1
        BuildOnPlot(_plots[0], BuildingType.Tent, true);
        BuildOnPlot(_plots[2], BuildingType.CoalThumper, true);
        BuildOnPlot(_plots[4], BuildingType.Sawmill, true);
        SetAlert("Survive 6 Days to -70°C! Build in Ring 1 or place Steam Hubs in Ring 2.");
    }

    int BuildCostWood(BuildingType t)
    {
        switch (t)
        {
            case BuildingType.Tent: return 5;
            case BuildingType.CoalThumper: return 6;
            case BuildingType.Sawmill: return 4;
            case BuildingType.MedicalPost: return 8;
            case BuildingType.SteamHub: return 10;
            default: return 0;
        }
    }

    void BuildOnPlot(Plot p, BuildingType t, bool free = false)
    {
        if (p.Type != BuildingType.Empty)
        {
            SetAlert("Plot occupied! Click an empty plot or press X while clicking to demolish.");
            return;
        }
        int cost = free ? 0 : BuildCostWood(t);
        if (_wood < cost)
        {
            SetAlert($"Need {cost} Wood for {t}!");
            return;
        }
        _wood -= cost;
        p.Type = t;

        var go = new GameObject(t.ToString());
        go.transform.position = p.Pos;
        go.transform.rotation = Quaternion.Euler(0f, -p.AngleDeg, 0f);

        if (t == BuildingType.Tent)
        {
            var body = GameObject.CreatePrimitive(PrimitiveType.Cube);
            body.transform.SetParent(go.transform, false);
            body.transform.localPosition = new Vector3(0f, 0.45f, 0f);
            body.transform.localScale = new Vector3(1.5f, 0.8f, 1.5f);
            body.GetComponent<Renderer>().material = _bldgMats[t];
        }
        else if (t == BuildingType.SteamHub)
        {
            var tower = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            tower.transform.SetParent(go.transform, false);
            tower.transform.localPosition = new Vector3(0f, 0.9f, 0f);
            tower.transform.localScale = new Vector3(0.65f, 0.9f, 0.65f);
            tower.GetComponent<Renderer>().material = _bldgMats[t];
        }
        else
        {
            var main = GameObject.CreatePrimitive(PrimitiveType.Cube);
            main.transform.SetParent(go.transform, false);
            main.transform.localPosition = new Vector3(0f, 0.65f, 0f);
            main.transform.localScale = new Vector3(1.6f, 1.2f, 1.6f);
            main.GetComponent<Renderer>().material = _bldgMats[t];
        }

        p.Structure = go;
    }

    void SetAlert(string msg)
    {
        _alert = msg;
        _alertTimer = 3.2f;
    }

    float AmbientTempC()
    {
        // Day 1: -20°C -> Day 4: -40°C -> Day 6 Storm: -70°C
        float prog = ((_day - 1) + (_dayTimer / DayLengthSec)) / MaxDays;
        return Mathf.Lerp(-20f, -70f, prog * prog);
    }

    void Update()
    {
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        if (_alertTimer > 0f) _alertTimer -= dt;

        HandleCameraInput(dt);
        UpdateParticles(dt);

        if (_gameOver || _victory)
        {
            if (Input.GetKeyDown(KeyCode.R)) ResetCity();
            return;
        }

        if (Input.GetKeyDown(KeyCode.Alpha1)) _selectedTool = BuildingType.Tent;
        if (Input.GetKeyDown(KeyCode.Alpha2)) _selectedTool = BuildingType.CoalThumper;
        if (Input.GetKeyDown(KeyCode.Alpha3)) _selectedTool = BuildingType.Sawmill;
        if (Input.GetKeyDown(KeyCode.Alpha4)) _selectedTool = BuildingType.MedicalPost;
        if (Input.GetKeyDown(KeyCode.Alpha5)) _selectedTool = BuildingType.SteamHub;
        if (Input.GetKeyDown(KeyCode.O)) _overdrive = !_overdrive;

        HandlePlotClick();
        SimulateEconomyAndHeat(dt);

        _dayTimer += dt;
        if (_dayTimer >= DayLengthSec)
        {
            _dayTimer = 0f;
            _day++;
            if (_day > MaxDays)
            {
                _victory = true;
            }
            else
            {
                SetAlert($"Day {_day}: Storm deepens! Ambient {Mathf.RoundToInt(AmbientTempC())}°C");
            }
        }
    }

    void HandleCameraInput(float dt)
    {
        if (Input.GetKey(KeyCode.A) || Input.GetKey(KeyCode.Q) || Input.GetKey(KeyCode.LeftArrow)) _camAngle -= 55f * dt;
        if (Input.GetKey(KeyCode.D) || Input.GetKey(KeyCode.E) || Input.GetKey(KeyCode.RightArrow)) _camAngle += 55f * dt;
        if (Input.GetMouseButton(1)) _camAngle += Input.GetAxis("Mouse X") * 4.5f;

        float scroll = Input.GetAxis("Mouse ScrollWheel");
        _camDist = Mathf.Clamp(_camDist - scroll * 10f, 14f, 34f);

        float rad = _camAngle * Mathf.Deg2Rad;
        float pitchRad = _camPitch * Mathf.Deg2Rad;
        float horiz = Mathf.Cos(pitchRad) * _camDist;
        Vector3 pos = new Vector3(Mathf.Cos(rad) * horiz, Mathf.Sin(pitchRad) * _camDist, Mathf.Sin(rad) * horiz);
        _cam.transform.position = pos;
        _cam.transform.LookAt(Vector3.up * 0.8f);
    }

    void HandlePlotClick()
    {
        // Avoid clicking behind top HUD strip
        if (Input.GetMouseButtonDown(0) && Input.mousePosition.y < Screen.height - 90f && Input.mousePosition.y > 75f)
        {
            var ray = _cam.ScreenPointToRay(Input.mousePosition);
            if (new Plane(Vector3.up, Vector3.zero).Raycast(ray, out float enter))
            {
                Vector3 hit = ray.GetPoint(enter);
                Plot best = null;
                float minDist = 1.85f;
                for (int i = 0; i < _plots.Count; i++)
                {
                    float d = Vector3.Distance(_plots[i].Pos, hit);
                    if (d < minDist)
                    {
                        minDist = d;
                        best = _plots[i];
                    }
                }
                if (best != null)
                {
                    if (Input.GetKey(KeyCode.X) && best.Type != BuildingType.Empty)
                    {
                        Destroy(best.Structure);
                        best.Structure = null;
                        best.Type = BuildingType.Empty;
                        _wood += 2;
                        SetAlert("Demolished (+2 Wood)");
                    }
                    else
                    {
                        BuildOnPlot(best, _selectedTool);
                    }
                }
            }
        }
    }

    void SimulateEconomyAndHeat(float dt)
    {
        int coalBuildings = 0, sawmills = 0, medPosts = 0, steamHubs = 0, tents = 0;
        for (int i = 0; i < _plots.Count; i++)
        {
            switch (_plots[i].Type)
            {
                case BuildingType.CoalThumper: coalBuildings++; break;
                case BuildingType.Sawmill: sawmills++; break;
                case BuildingType.MedicalPost: medPosts++; break;
                case BuildingType.SteamHub: steamHubs++; break;
                case BuildingType.Tent: tents++; break;
            }
        }

        float genCoalCost = (_genPower == 0 ? 0f : (_genPower == 1 ? 1.8f : 3.8f)) + steamHubs * 0.7f;
        float coalGain = coalBuildings * 2.4f;
        _coal = Mathf.Max(0f, _coal + (coalGain - genCoalCost) * dt);
        _wood += sawmills * 1.4f * dt;

        bool generatorRunning = _genPower > 0 && _coal > 0.1f;
        if (!generatorRunning && _genPower > 0)
        {
            _overdrive = false;
        }

        if (_overdrive && generatorRunning)
        {
            _stress = Mathf.Min(100f, _stress + 5.5f * dt);
            if (_stress >= 100f)
            {
                SetAlert("GENERATOR OVERPRESSURE EXPLOSION!");
                _gameOver = true;
                return;
            }
        }
        else
        {
            _stress = Mathf.Max(0f, _stress - 3.5f * dt);
        }

        float baseHeat1 = generatorRunning ? (_genPower == 1 ? 24f : 40f) + (_overdrive ? 22f : 0f) : 0f;
        float baseHeat2 = generatorRunning ? (_genPower == 1 ? 10f : 22f) + (_overdrive ? 22f : 0f) : 0f;
        float amb = AmbientTempC();

        int freezingPlots = 0;
        for (int i = 0; i < _plots.Count; i++)
        {
            var p = _plots[i];
            float heat = p.Ring == 1 ? baseHeat1 : baseHeat2;
            // Steam Hub radius warmth in Ring 2
            for (int j = 0; j < _plots.Count; j++)
            {
                if (_plots[j].Type == BuildingType.SteamHub && Vector3.Distance(p.Pos, _plots[j].Pos) < 5.2f)
                {
                    heat += 24f;
                    break;
                }
            }
            p.LocalTempC = amb + heat;
            bool warm = p.LocalTempC >= -20f;
            p.BasePad.GetComponent<Renderer>().material = warm ? _warmPlotMat : _coldPlotMat;
            if (!warm && p.Type != BuildingType.Empty) freezingPlots++;
        }

        _genLight.intensity = generatorRunning ? (_genPower * 3.0f + (_overdrive ? 4.0f : 0f)) : 0.4f;
        _genCore.localScale = Vector3.one * (generatorRunning ? (1.85f + Mathf.Sin(Time.time * 6f) * 0.12f) : 1.3f);

        // Health & Hope
        float sickRate = freezingPlots * 0.45f + (tents * 10 < _citizens ? 0.35f : 0f) - medPosts * 0.65f;
        if (Time.frameCount % 60 == 0)
        {
            if (sickRate > 0.2f && _citizens > 0) _sick = Mathf.Min(_citizens, _sick + 1);
            else if (sickRate < -0.2f && _sick > 0) _sick--;

            _hope = Mathf.Clamp(_hope + (freezingPlots == 0 ? 1.2f : -freezingPlots * 0.8f) - (_sick > 10 ? 1.5f : 0f), 0f, 100f);
            if (_hope <= 0f || _sick >= _citizens)
            {
                _gameOver = true;
            }
        }
    }

    void UpdateParticles(float dt)
    {
        float stormFactor = 1f + (_day / (float)MaxDays) * 1.4f;
        for (int i = 0; i < _snow.Count; i++)
        {
            var sf = _snow[i];
            sf.Go.transform.position += sf.Vel * (dt * stormFactor);
            if (sf.Go.transform.position.y < 0f)
            {
                sf.Go.transform.position = new Vector3(Random.Range(-14f, 14f), 12f, Random.Range(-14f, 14f));
            }
        }

        if (_genPower > 0 && _coal > 0.1f && Time.frameCount % 6 == 0)
        {
            var s = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            s.transform.position = new Vector3(Random.Range(-0.25f, 0.25f), 4.6f, Random.Range(-0.25f, 0.25f));
            s.transform.localScale = Vector3.one * 0.65f;
            s.GetComponent<Renderer>().material = _steamMat;
            _steam.Add(new SnowFlake { Go = s, Vel = new Vector3(-0.6f, 2.2f, 0.3f) });
        }
        for (int i = _steam.Count - 1; i >= 0; i--)
        {
            var st = _steam[i];
            st.Go.transform.position += st.Vel * dt;
            st.Go.transform.localScale *= (1f + dt * 0.7f);
            if (st.Go.transform.position.y > 10.5f)
            {
                Destroy(st.Go);
                _steam.RemoveAt(i);
            }
        }
    }

    void OnGUI()
    {
        var bold = new GUIStyle(GUI.skin.box) { fontSize = 14, fontStyle = FontStyle.Bold };
        int amb = Mathf.RoundToInt(AmbientTempC());

        GUI.Box(new Rect(14, 12, Screen.width - 28, 68), "");
        GUI.Label(new Rect(26, 18, 560, 24),
            $"FROSTPUNK UNITY  |  DAY {_day}/{MaxDays} ({Mathf.CeilToInt(DayLengthSec - _dayTimer)}s)  |  TEMP: {amb}°C  |  HOPE: {Mathf.RoundToInt(_hope)}%", bold);
        GUI.Label(new Rect(26, 44, 720, 22),
            $"Coal: {Mathf.FloorToInt(_coal)}   Wood: {Mathf.FloorToInt(_wood)}   Citizens: {_citizens} (Sick: {_sick})   Stress: {Mathf.RoundToInt(_stress)}%   •  A/D or Right-Drag Orbit Camera");

        // Generator Power Controls
        if (GUI.Button(new Rect(Screen.width - 335, 18, 95, 28), _genPower == 0 ? "Gen: OFF✓" : "Gen OFF")) _genPower = 0;
        if (GUI.Button(new Rect(Screen.width - 234, 18, 70, 28), _genPower == 1 ? "Lv1✓" : "Lv1")) _genPower = 1;
        if (GUI.Button(new Rect(Screen.width - 158, 18, 70, 28), _genPower == 2 ? "Lv2✓" : "Lv2")) _genPower = 2;
        if (GUI.Button(new Rect(Screen.width - 82, 18, 66, 28), _overdrive ? "OD✓" : "OD(O)")) _overdrive = !_overdrive;

        // Build toolbar at bottom
        BuildingType[] tools = { BuildingType.Tent, BuildingType.CoalThumper, BuildingType.Sawmill, BuildingType.MedicalPost, BuildingType.SteamHub };
        string[] labels = { "1: Tent (5w)", "2: Coal (6w)", "3: Sawmill (4w)", "4: MedPost (8w)", "5: SteamHub (10w)" };
        float totalW = tools.Length * 135f;
        float startX = Screen.width * 0.5f - totalW * 0.5f;
        for (int i = 0; i < tools.Length; i++)
        {
            string lbl = (_selectedTool == tools[i] ? "▶ " : "") + labels[i];
            if (GUI.Button(new Rect(startX + i * 135f, Screen.height - 48, 128, 36), lbl))
            {
                _selectedTool = tools[i];
            }
        }

        if (_alertTimer > 0f)
        {
            GUI.Box(new Rect(Screen.width * 0.5f - 240, 88, 480, 30), _alert, bold);
        }

        if (_gameOver || _victory)
        {
            GUI.Box(new Rect(Screen.width * 0.5f - 175, Screen.height * 0.5f - 55, 350, 110), "");
            GUI.Label(new Rect(Screen.width * 0.5f - 150, Screen.height * 0.5f - 36, 300, 28), _victory ? "THE CITY SURVIVED THE WHITEOUT!" : "THE CITY FELL TO THE FROST", bold);
            GUI.Label(new Rect(Screen.width * 0.5f - 150, Screen.height * 0.5f - 8, 300, 24), $"Day {_day}/{MaxDays} • Hope {Mathf.RoundToInt(_hope)}% • Citizens {_citizens}");
            if (GUI.Button(new Rect(Screen.width * 0.5f - 65, Screen.height * 0.5f + 20, 130, 28), "Rebuild (R)"))
            {
                ResetCity();
            }
        }
    }
}
