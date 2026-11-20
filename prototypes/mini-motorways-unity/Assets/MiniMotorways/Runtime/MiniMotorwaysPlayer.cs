using System.Collections.Generic;
using UnityEngine;

public sealed class MiniMotorwaysPlayer : MonoBehaviour
{
    const int GridW = 14;
    const int GridH = 10;
    const float CellSize = 1.6f;

    enum CellKind
    {
        Empty,
        River,
        House,
        Mall
    }

    enum ColorGroup
    {
        Red,
        Blue,
        Yellow,
        Green
    }

    sealed class Cell
    {
        public int X;
        public int Y;
        public CellKind Kind;
        public ColorGroup Group;
        public bool HasRoad;
        public bool IsBridge;
        public GameObject RoadGo;
        public GameObject StructureGo;
        public List<GameObject> PinGos = new List<GameObject>();
        public int Demand;
        public float DemandTimer;
        public float OverloadTimer;
        public float SpawnCarCooldown;
    }

    sealed class Motorway
    {
        public Vector2Int Start;
        public Vector2Int End;
        public GameObject ArcGo;
    }

    sealed class Car
    {
        public ColorGroup Group;
        public Cell Home;
        public Cell TargetMall;
        public List<Vector2Int> Path;
        public int PathIdx;
        public bool Returning;
        public GameObject Go;
        public Vector3 Pos;
        public float Speed = 4.6f;
    }

    Camera _cam;
    Cell[,] _grid;
    readonly List<Cell> _houses = new List<Cell>();
    readonly List<Cell> _malls = new List<Cell>();
    readonly List<Car> _cars = new List<Car>();
    readonly List<Motorway> _motorways = new List<Motorway>();

    int _roadTiles = 26;
    int _bridges = 2;
    int _motorwayCount = 1;
    int _trips;
    int _week = 1;
    float _weekTimer;
    const float WeekDuration = 28f;
    bool _pendingUpgradeChoice;
    bool _eraseMode;
    bool _motorwayMode;
    Vector2Int? _motorwayStart;
    bool _isDragging;
    Vector2Int? _lastDragCell;
    bool _gameOver;
    string _statusMsg = "Drag across cells to build roads! Right-click/E erases.";
    float _statusTimer = 5f;

    Material _groundMat;
    Material _riverMat;
    Material _roadMat;
    Material _bridgeMat;
    Material _motorwayMat;
    Material _pinMat;
    readonly Dictionary<ColorGroup, Material> _groupMats = new Dictionary<ColorGroup, Material>();

    void Start()
    {
        Application.targetFrameRate = 60;
        CreateMaterials();
        SetupCameraAndLight();
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
        _groundMat = MakeMat(new Color(0.92f, 0.91f, 0.87f));
        _riverMat = MakeMat(new Color(0.40f, 0.72f, 0.88f));
        _roadMat = MakeMat(new Color(0.24f, 0.26f, 0.30f));
        _bridgeMat = MakeMat(new Color(0.55f, 0.56f, 0.60f));
        _motorwayMat = MakeMat(new Color(0.32f, 0.34f, 0.42f));
        _pinMat = MakeMat(new Color(0.16f, 0.16f, 0.20f));

        _groupMats[ColorGroup.Red] = MakeMat(new Color(0.92f, 0.28f, 0.30f));
        _groupMats[ColorGroup.Blue] = MakeMat(new Color(0.22f, 0.52f, 0.90f));
        _groupMats[ColorGroup.Yellow] = MakeMat(new Color(0.95f, 0.74f, 0.18f));
        _groupMats[ColorGroup.Green] = MakeMat(new Color(0.22f, 0.72f, 0.46f));
    }

    void SetupCameraAndLight()
    {
        var camGo = new GameObject("Main Camera");
        camGo.tag = "MainCamera";
        _cam = camGo.AddComponent<Camera>();
        _cam.clearFlags = CameraClearFlags.SolidColor;
        _cam.backgroundColor = new Color(0.86f, 0.85f, 0.81f);
        _cam.fieldOfView = 44f;
        camGo.transform.position = new Vector3(0f, 22.5f, -6.5f);
        camGo.transform.rotation = Quaternion.Euler(73f, 0f, 0f);

        var lightGo = new GameObject("Sun");
        var l = lightGo.AddComponent<Light>();
        l.type = LightType.Directional;
        l.intensity = 1.2f;
        l.color = new Color(1.0f, 0.98f, 0.94f);
        lightGo.transform.rotation = Quaternion.Euler(55f, -25f, 0f);
    }

    Vector3 CellToWorld(int x, int y, float h = 0f)
    {
        float wx = (x - (GridW - 1) * 0.5f) * CellSize;
        float wz = (y - (GridH - 1) * 0.5f) * CellSize;
        return new Vector3(wx, h, wz);
    }

    Vector2Int? WorldToCell(Vector3 w)
    {
        int gx = Mathf.RoundToInt(w.x / CellSize + (GridW - 1) * 0.5f);
        int gy = Mathf.RoundToInt(w.z / CellSize + (GridH - 1) * 0.5f);
        if (gx < 0 || gx >= GridW || gy < 0 || gy >= GridH) return null;
        return new Vector2Int(gx, gy);
    }

    void ResetCity()
    {
        if (_grid != null)
        {
            for (int x = 0; x < GridW; x++)
            {
                for (int y = 0; y < GridH; y++)
                {
                    var c = _grid[x, y];
                    if (c.RoadGo != null) Destroy(c.RoadGo);
                    if (c.StructureGo != null) Destroy(c.StructureGo);
                    for (int p = 0; p < c.PinGos.Count; p++) Destroy(c.PinGos[p]);
                }
            }
        }
        for (int i = 0; i < _cars.Count; i++) Destroy(_cars[i].Go);
        for (int i = 0; i < _motorways.Count; i++) Destroy(_motorways[i].ArcGo);
        _houses.Clear();
        _malls.Clear();
        _cars.Clear();
        _motorways.Clear();

        _grid = new Cell[GridW, GridH];
        var oldTiles = GameObject.Find("CityGroundRoot");
        if (oldTiles != null) Destroy(oldTiles);
        var groundRoot = new GameObject("CityGroundRoot");

        for (int x = 0; x < GridW; x++)
        {
            for (int y = 0; y < GridH; y++)
            {
                bool river = (x == 7 && y >= 0 && y <= 5) || (x == 8 && y >= 4 && y <= 9);
                var c = new Cell
                {
                    X = x,
                    Y = y,
                    Kind = river ? CellKind.River : CellKind.Empty
                };
                _grid[x, y] = c;

                var tile = GameObject.CreatePrimitive(PrimitiveType.Cube);
                tile.transform.SetParent(groundRoot.transform, false);
                tile.transform.position = CellToWorld(x, y, river ? -0.18f : -0.1f);
                tile.transform.localScale = new Vector3(CellSize * 0.96f, 0.16f, CellSize * 0.96f);
                tile.GetComponent<Renderer>().material = river ? _riverMat : _groundMat;
            }
        }

        _roadTiles = 26;
        _bridges = 2;
        _motorwayCount = 1;
        _trips = 0;
        _week = 1;
        _weekTimer = 0f;
        _pendingUpgradeChoice = false;
        _eraseMode = false;
        _motorwayMode = false;
        _motorwayStart = null;
        _gameOver = false;

        // Starter buildings across the river
        AddHouse(2, 2, ColorGroup.Red);
        AddHouse(3, 7, ColorGroup.Red);
        AddMall(11, 2, ColorGroup.Red);

        AddHouse(1, 5, ColorGroup.Blue);
        AddMall(10, 7, ColorGroup.Blue);

        SetStatus("Connect colored Houses to matching Malls across the river!");
    }

    void AddHouse(int x, int y, ColorGroup group)
    {
        var c = _grid[x, y];
        c.Kind = CellKind.House;
        c.Group = group;
        c.HasRoad = true;
        var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
        go.transform.position = CellToWorld(x, y, 0.35f);
        go.transform.localScale = new Vector3(0.88f, 0.7f, 0.88f);
        go.GetComponent<Renderer>().material = _groupMats[group];
        c.StructureGo = go;
        _houses.Add(c);
    }

    void AddMall(int x, int y, ColorGroup group)
    {
        var c = _grid[x, y];
        c.Kind = CellKind.Mall;
        c.Group = group;
        c.HasRoad = true;
        c.Demand = 1;
        var go = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        go.transform.position = CellToWorld(x, y, 0.45f);
        go.transform.localScale = new Vector3(1.22f, 0.45f, 1.22f);
        go.GetComponent<Renderer>().material = _groupMats[group];
        c.StructureGo = go;
        _malls.Add(c);
        RefreshMallPins(c);
    }

    void RefreshMallPins(Cell mall)
    {
        for (int i = 0; i < mall.PinGos.Count; i++) Destroy(mall.PinGos[i]);
        mall.PinGos.Clear();
        int shown = Mathf.Min(mall.Demand, 6);
        for (int i = 0; i < shown; i++)
        {
            var pin = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            float ang = (i / 6f) * Mathf.PI * 2f;
            pin.transform.position = CellToWorld(mall.X, mall.Y, 1.05f) + new Vector3(Mathf.Cos(ang) * 0.42f, 0f, Mathf.Sin(ang) * 0.42f);
            pin.transform.localScale = Vector3.one * 0.24f;
            pin.GetComponent<Renderer>().material = _pinMat;
            mall.PinGos.Add(pin);
        }
    }

    void SetStatus(string msg)
    {
        _statusMsg = msg;
        _statusTimer = 3.5f;
    }

    void Update()
    {
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        if (_statusTimer > 0f) _statusTimer -= dt;

        if (_gameOver)
        {
            if (Input.GetKeyDown(KeyCode.R)) ResetCity();
            return;
        }

        if (Input.GetKeyDown(KeyCode.E))
        {
            _eraseMode = !_eraseMode;
            if (_eraseMode) _motorwayMode = false;
        }
        if (Input.GetKeyDown(KeyCode.M))
        {
            _motorwayMode = !_motorwayMode;
            if (_motorwayMode) _eraseMode = false;
            _motorwayStart = null;
        }

        HandlePointer();

        if (_pendingUpgradeChoice) return;

        UpdateMallsAndSpawns(dt);
        UpdateCars(dt);

        _weekTimer += dt;
        if (_weekTimer >= WeekDuration)
        {
            _weekTimer = 0f;
            _week++;
            SpawnNewBuildingsForWeek();
            _pendingUpgradeChoice = true;
        }
    }

    void HandlePointer()
    {
        var ray = _cam.ScreenPointToRay(Input.mousePosition);
        if (!new Plane(Vector3.up, Vector3.zero).Raycast(ray, out float enter)) return;
        Vector3 hit = ray.GetPoint(enter);
        Vector2Int? cellPos = WorldToCell(hit);

        if (_motorwayMode)
        {
            if (Input.GetMouseButtonDown(0) && cellPos.HasValue)
            {
                if (!_motorwayStart.HasValue)
                {
                    _motorwayStart = cellPos.Value;
                    SetStatus("Select destination cell for Motorway end!");
                }
                else
                {
                    BuildMotorway(_motorwayStart.Value, cellPos.Value);
                    _motorwayStart = null;
                    _motorwayMode = false;
                }
            }
            return;
        }

        bool rightDown = Input.GetMouseButton(1) || Input.GetMouseButtonDown(1);
        bool leftDown = Input.GetMouseButton(0) || Input.GetMouseButtonDown(0);

        if (Input.GetMouseButtonDown(0) || Input.GetMouseButtonDown(1))
        {
            _isDragging = true;
            _lastDragCell = null;
        }
        if (Input.GetMouseButtonUp(0) || Input.GetMouseButtonUp(1))
        {
            _isDragging = false;
            _lastDragCell = null;
        }

        if (_isDragging && cellPos.HasValue && (leftDown || rightDown))
        {
            var gp = cellPos.Value;
            if (_lastDragCell.HasValue && _lastDragCell.Value == gp) return;

            bool erase = rightDown || _eraseMode || Input.GetKey(KeyCode.LeftShift);
            if (_lastDragCell.HasValue && !erase)
            {
                // Interpolate 1-step Manhattan bridge if pointer moved fast
                Vector2Int prev = _lastDragCell.Value;
                int dx = Mathf.Clamp(gp.x - prev.x, -1, 1);
                int dy = Mathf.Clamp(gp.y - prev.y, -1, 1);
                TryToggleRoad(prev.x + dx, prev.y, false);
                TryToggleRoad(prev.x + dx, prev.y + dy, false);
            }
            TryToggleRoad(gp.x, gp.y, erase);
            _lastDragCell = gp;
        }
    }

    void TryToggleRoad(int x, int y, bool erase)
    {
        if (x < 0 || x >= GridW || y < 0 || y >= GridH) return;
        var c = _grid[x, y];
        if (c.Kind == CellKind.House || c.Kind == CellKind.Mall) return;

        if (erase)
        {
            if (!c.HasRoad) return;
            c.HasRoad = false;
            if (c.IsBridge) _bridges++;
            else _roadTiles++;
            c.IsBridge = false;
            if (c.RoadGo != null) Destroy(c.RoadGo);
            c.RoadGo = null;
        }
        else
        {
            if (c.HasRoad) return;
            if (c.Kind == CellKind.River)
            {
                if (_bridges <= 0)
                {
                    SetStatus("Out of Bridges! Pick Bridges at week end.");
                    return;
                }
                _bridges--;
                c.IsBridge = true;
            }
            else
            {
                if (_roadTiles <= 0)
                {
                    SetStatus("Out of Road Tiles! Erase unused roads or await week supply.");
                    return;
                }
                _roadTiles--;
            }

            c.HasRoad = true;
            var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
            go.transform.position = CellToWorld(x, y, c.IsBridge ? 0.08f : 0.03f);
            go.transform.localScale = new Vector3(CellSize * 0.72f, 0.08f, CellSize * 0.72f);
            go.GetComponent<Renderer>().material = c.IsBridge ? _bridgeMat : _roadMat;
            c.RoadGo = go;
        }
    }

    void BuildMotorway(Vector2Int a, Vector2Int b)
    {
        if (_motorwayCount <= 0)
        {
            SetStatus("No Motorways remaining!");
            return;
        }
        if (a == b) return;
        _motorwayCount--;
        _grid[a.x, a.y].HasRoad = true;
        _grid[b.x, b.y].HasRoad = true;

        Vector3 wa = CellToWorld(a.x, a.y, 0.55f);
        Vector3 wb = CellToWorld(b.x, b.y, 0.55f);
        Vector3 mid = (wa + wb) * 0.5f + Vector3.up * 0.5f;
        var arc = GameObject.CreatePrimitive(PrimitiveType.Cube);
        arc.transform.position = mid;
        arc.transform.rotation = Quaternion.LookRotation((wb - wa).normalized, Vector3.up);
        arc.transform.localScale = new Vector3(0.55f, 0.14f, Vector3.Distance(wa, wb));
        arc.GetComponent<Renderer>().material = _motorwayMat;

        _motorways.Add(new Motorway { Start = a, End = b, ArcGo = arc });
        SetStatus("Express Motorway opened!");
    }

    void SpawnNewBuildingsForWeek()
    {
        ColorGroup[] groups = { ColorGroup.Red, ColorGroup.Blue, ColorGroup.Yellow, ColorGroup.Green };
        var g = groups[(_week - 1) % groups.Length];
        // Spawn a house on left side, mall on right or vice versa
        for (int tries = 0; tries < 30; tries++)
        {
            int hx = Random.Range(0, 6);
            int hy = Random.Range(0, GridH);
            if (_grid[hx, hy].Kind == CellKind.Empty && !_grid[hx, hy].HasRoad)
            {
                AddHouse(hx, hy, g);
                break;
            }
        }
        if (_week % 2 == 0)
        {
            for (int tries = 0; tries < 30; tries++)
            {
                int mx = Random.Range(9, GridW);
                int my = Random.Range(0, GridH);
                if (_grid[mx, my].Kind == CellKind.Empty && !_grid[mx, my].HasRoad)
                {
                    AddMall(mx, my, g);
                    break;
                }
            }
        }
    }

    void UpdateMallsAndSpawns(float dt)
    {
        for (int i = 0; i < _malls.Count; i++)
        {
            var m = _malls[i];
            m.DemandTimer += dt;
            if (m.DemandTimer >= Mathf.Max(2.8f, 6.2f - _week * 0.4f))
            {
                m.DemandTimer = 0f;
                m.Demand++;
                RefreshMallPins(m);
            }

            if (m.Demand >= 6)
            {
                m.OverloadTimer += dt;
                if (m.OverloadTimer >= 12f)
                {
                    _gameOver = true;
                    return;
                }
            }
            else
            {
                m.OverloadTimer = Mathf.Max(0f, m.OverloadTimer - dt * 1.5f);
            }
        }

        for (int i = 0; i < _houses.Count; i++)
        {
            var h = _houses[i];
            h.SpawnCarCooldown -= dt;
            if (h.SpawnCarCooldown > 0f) continue;

            // Find matching mall with highest demand and reachable path
            Cell bestMall = null;
            List<Vector2Int> bestPath = null;
            int bestDemand = 0;
            for (int j = 0; j < _malls.Count; j++)
            {
                var m = _malls[j];
                if (m.Group != h.Group || m.Demand <= 0) continue;
                var path = FindPath(new Vector2Int(h.X, h.Y), new Vector2Int(m.X, m.Y));
                if (path != null && m.Demand > bestDemand)
                {
                    bestDemand = m.Demand;
                    bestMall = m;
                    bestPath = path;
                }
            }

            if (bestMall != null && bestPath != null)
            {
                h.SpawnCarCooldown = 2.6f;
                var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
                go.transform.position = CellToWorld(h.X, h.Y, 0.24f);
                go.transform.localScale = new Vector3(0.45f, 0.28f, 0.65f);
                go.GetComponent<Renderer>().material = _groupMats[h.Group];
                _cars.Add(new Car
                {
                    Group = h.Group,
                    Home = h,
                    TargetMall = bestMall,
                    Path = bestPath,
                    PathIdx = 0,
                    Returning = false,
                    Go = go,
                    Pos = go.transform.position
                });
            }
        }
    }

    List<Vector2Int> FindPath(Vector2Int start, Vector2Int goal)
    {
        var q = new Queue<Vector2Int>();
        var cameFrom = new Dictionary<Vector2Int, Vector2Int>();
        q.Enqueue(start);
        cameFrom[start] = start;

        Vector2Int[] dirs = { Vector2Int.up, Vector2Int.down, Vector2Int.left, Vector2Int.right };
        while (q.Count > 0)
        {
            var cur = q.Dequeue();
            if (cur == goal)
            {
                var path = new List<Vector2Int>();
                var step = goal;
                while (step != start)
                {
                    path.Add(step);
                    step = cameFrom[step];
                }
                path.Add(start);
                path.Reverse();
                return path;
            }

            // 4-dir neighbors
            for (int i = 0; i < 4; i++)
            {
                var nxt = cur + dirs[i];
                if (nxt.x < 0 || nxt.x >= GridW || nxt.y < 0 || nxt.y >= GridH) continue;
                if (cameFrom.ContainsKey(nxt)) continue;
                var cell = _grid[nxt.x, nxt.y];
                if (!cell.HasRoad) continue;
                cameFrom[nxt] = cur;
                q.Enqueue(nxt);
            }

            // Motorway shortcuts
            for (int m = 0; m < _motorways.Count; m++)
            {
                var mw = _motorways[m];
                if (cur == mw.Start && !cameFrom.ContainsKey(mw.End))
                {
                    cameFrom[mw.End] = cur;
                    q.Enqueue(mw.End);
                }
                else if (cur == mw.End && !cameFrom.ContainsKey(mw.Start))
                {
                    cameFrom[mw.Start] = cur;
                    q.Enqueue(mw.Start);
                }
            }
        }
        return null;
    }

    void UpdateCars(float dt)
    {
        for (int i = _cars.Count - 1; i >= 0; i--)
        {
            var c = _cars[i];
            if (c.Path == null || c.PathIdx >= c.Path.Count)
            {
                Destroy(c.Go);
                _cars.RemoveAt(i);
                continue;
            }

            var wp = c.Path[c.PathIdx];
            Vector3 targetPos = CellToWorld(wp.x, wp.y, 0.24f);
            Vector3 toTarget = targetPos - c.Pos;
            if (toTarget.magnitude < 0.12f)
            {
                c.PathIdx++;
                if (c.PathIdx >= c.Path.Count)
                {
                    if (!c.Returning)
                    {
                        if (c.TargetMall.Demand > 0)
                        {
                            c.TargetMall.Demand--;
                            RefreshMallPins(c.TargetMall);
                            _trips++;
                        }
                        c.Returning = true;
                        c.Path.Reverse();
                        c.PathIdx = 0;
                    }
                    else
                    {
                        Destroy(c.Go);
                        _cars.RemoveAt(i);
                    }
                }
            }
            else
            {
                Vector3 dir = toTarget.normalized;
                c.Pos += dir * (c.Speed * dt);
                c.Go.transform.position = c.Pos;
                c.Go.transform.rotation = Quaternion.LookRotation(dir, Vector3.up);
            }
        }
    }

    void OnGUI()
    {
        var bold = new GUIStyle(GUI.skin.box) { fontSize = 14, fontStyle = FontStyle.Bold };
        GUI.Box(new Rect(14, 12, 470, 62), "");
        GUI.Label(new Rect(24, 18, 450, 24), $"MINI MOTORWAYS UNITY  |  TRIPS: {_trips}  |  WEEK {_week} ({Mathf.CeilToInt(WeekDuration - _weekTimer)}s)", bold);
        GUI.Label(new Rect(24, 44, 450, 22), $"Roads: {_roadTiles}  •  Bridges: {_bridges}  •  Motorways: {_motorwayCount}  •  Mode: {(_motorwayMode ? "MOTORWAY (Click 2 tiles)" : (_eraseMode ? "ERASE" : "DRAW ROAD"))}");

        if (GUI.Button(new Rect(500, 14, 110, 28), _eraseMode ? "Mode: Erase ✓" : "Erase (E)"))
        {
            _eraseMode = !_eraseMode;
            _motorwayMode = false;
        }
        if (GUI.Button(new Rect(618, 14, 130, 28), _motorwayMode ? "Motorway ✓" : $"Motorway (M) [{_motorwayCount}]"))
        {
            _motorwayMode = !_motorwayMode;
            _eraseMode = false;
            _motorwayStart = null;
        }

        if (_statusTimer > 0f)
        {
            GUI.Box(new Rect(Screen.width * 0.5f - 220, Screen.height - 46, 440, 32), _statusMsg, bold);
        }

        if (_pendingUpgradeChoice)
        {
            GUI.Box(new Rect(Screen.width * 0.5f - 210, Screen.height * 0.5f - 70, 420, 140), "");
            GUI.Label(new Rect(Screen.width * 0.5f - 190, Screen.height * 0.5f - 54, 380, 28), $"WEEK {_week} SUPPLY DROP — CHOOSE BUNDLE", bold);
            if (GUI.Button(new Rect(Screen.width * 0.5f - 185, Screen.height * 0.5f - 10, 175, 48), "+12 Road Tiles\n+1 Bridge"))
            {
                _roadTiles += 12;
                _bridges += 1;
                _pendingUpgradeChoice = false;
            }
            if (GUI.Button(new Rect(Screen.width * 0.5f + 10, Screen.height * 0.5f - 10, 175, 48), "+8 Road Tiles\n+1 Express Motorway"))
            {
                _roadTiles += 8;
                _motorwayCount += 1;
                _pendingUpgradeChoice = false;
            }
        }

        if (_gameOver)
        {
            GUI.Box(new Rect(Screen.width * 0.5f - 170, Screen.height * 0.5f - 55, 340, 110), "");
            GUI.Label(new Rect(Screen.width * 0.5f - 150, Screen.height * 0.5f - 36, 300, 28), "GRIDLOCK OVERLOAD!", bold);
            GUI.Label(new Rect(Screen.width * 0.5f - 150, Screen.height * 0.5f - 8, 300, 24), $"Completed {_trips} Trips over {_week} Weeks");
            if (GUI.Button(new Rect(Screen.width * 0.5f - 65, Screen.height * 0.5f + 20, 130, 28), "Rebuild (R)"))
            {
                ResetCity();
            }
        }
    }
}
