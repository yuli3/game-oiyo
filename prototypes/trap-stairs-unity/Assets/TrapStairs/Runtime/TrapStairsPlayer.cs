using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Trap Stairs 3D: the web Trap Stairs (src/components/games/TrapStairs.tsx,
// src/lib/games/trap-stairs.ts) rebuilt as a 30-stage Unity trap platformer. The same rules
// in tiles and seconds (gravity 40, jump 14 with a short hop on early release, bounce pads
// 20, run 6, coyote 0.08 s, jump buffer 0.12 s, a 0.7 x 0.9 runner) and the same hand-made
// 12 x 12 chunks, each hiding one trap: spikes, pop-up spikes, floors that crumble, blocks
// that drop on you, blocks that appear when you bump them, a door that runs away. Stages
// are chained from those chunks with the web's seeded picker (the 40 web stages squeezed
// into 30: a new trap family every six stages, one to five trap chunks per stage). A fall
// or a trap sends you back to the start of the stage; hidden blocks you found stay found,
// so every trap teaches its own answer. Stars from the number of fails.
public class TrapStairsPlayer : MonoBehaviour
{
    const string Slug = "trap-stairs";
    const int StageCount = 30, Chunk = 12, Rows = 12;
    const float Gravity = 40f, JumpV = 14f, BounceV = 20f, RunSpeed = 6f, MaxFall = 18f, PW = 0.7f, PH = 0.9f;
    const float Coyote = 0.08f, JumpBuffer = 0.12f, CrumbleDelay = 0.25f, PopRange = 1.5f, DropRange = 2.5f, RunawayRange = 2.5f, Eps = 1e-4f;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Dying, Paused, Victory }
    GameState state = GameState.Menu;

    static readonly string[] TierNames = { "Plain stairs", "Tricky floors", "Hidden blocks", "Falling blocks", "Spike roofs" };
    static readonly Color[] TierColor = { new Color(0.55f, 0.85f, 0.45f), new Color(1f, 0.75f, 0.35f), new Color(0.55f, 0.75f, 1f), new Color(1f, 0.5f, 0.45f), new Color(0.8f, 0.55f, 1f) };
    static readonly string[] Quips = { "Saw that coming?", "The stairs lie.", "Remember every trap you meet.", "This time for real.", "Never trust the floor." };

    // ---------------- Chunks (the web's, row 0 at the top) ----------------
    struct ChunkDef { public string id; public int tier; public int kind; public string[] rows; }
    const string Sky = "............", Ground = "############";
    static string[] Flat(Dictionary<int, string> rows, string b0 = Ground, string b1 = Ground)
    {
        var r = new string[Rows];
        for (int i = 0; i < Rows; i++) r[i] = i == 10 ? b0 : i == 11 ? b1 : (rows != null && rows.TryGetValue(i, out var s) ? s : Sky);
        return r;
    }
    static Dictionary<int, string> R(params (int, string)[] rows) { var d = new Dictionary<int, string>(); foreach (var (k, v) in rows) d[k] = v; return d; }
    static readonly ChunkDef[] Chunks =
    {
        new ChunkDef { id = "start", tier = 0, kind = 0, rows = Flat(R((9, ".S.........."))) },
        new ChunkDef { id = "flat", tier = 0, kind = 1, rows = Flat(R((9, "............"))) },
        new ChunkDef { id = "gap2", tier = 0, kind = 1, rows = Flat(null, "#####..#####", "#####..#####") },
        new ChunkDef { id = "steps", tier = 0, kind = 1, rows = Flat(R((8, "......##...."), (9, "....######.."))) },
        new ChunkDef { id = "spikes", tier = 0, kind = 1, rows = Flat(R((9, ".....^^....."))) },
        new ChunkDef { id = "pit3", tier = 1, kind = 1, rows = Flat(null, "####...#####", "####...#####") },
        new ChunkDef { id = "pop", tier = 1, kind = 1, rows = Flat(R((9, "......p....."))) },
        new ChunkDef { id = "crumble", tier = 1, kind = 1, rows = Flat(null, "####fff#####", "####...#####") },
        new ChunkDef { id = "dropper", tier = 1, kind = 1, rows = Flat(R((5, ".......d...."))) },
        new ChunkDef { id = "bounce", tier = 1, kind = 1, rows = Flat(R((6, ".......##..."), (7, ".......##..."), (8, ".......##..."), (9, ".....b.##..."))) },
        new ChunkDef { id = "bonk", tier = 2, kind = 1, rows = Flat(R((8, ".....hh....."), (9, "......^....."))) },
        new ChunkDef { id = "pop-gap", tier = 2, kind = 1, rows = Flat(R((9, ".......p....")), "####..######", "####..######") },
        new ChunkDef { id = "crumble-isle", tier = 3, kind = 1, rows = Flat(null, "###..fff.###", "###......###") },
        new ChunkDef { id = "pop-pair", tier = 3, kind = 1, rows = Flat(R((9, "...p...p...."))) },
        new ChunkDef { id = "double-drop", tier = 3, kind = 1, rows = Flat(R((4, "....d..d...."))) },
        new ChunkDef { id = "spike-roof", tier = 4, kind = 1, rows = Flat(R((6, "....h......."), (9, ".....^^....."))) },
        new ChunkDef { id = "drop-crumble", tier = 4, kind = 1, rows = Flat(R((5, "........d...")), "###fff######", "###...######") },
        new ChunkDef { id = "end", tier = 0, kind = 2, rows = Flat(R((9, "........E..."))) },
        new ChunkDef { id = "end-ledge", tier = 1, kind = 2, rows = Flat(R((7, ".........E.."), (8, ".......#####"), (9, ".......#####"))) },
        new ChunkDef { id = "end-runaway", tier = 2, kind = 2, rows = Flat(R((9, "..X......E.."))) },
        new ChunkDef { id = "end-runaway-up", tier = 3, kind = 2, rows = Flat(R((5, "..........X."), (6, ".........###"), (9, "......b.E..."))) },
    };

    // the web's seeded picker (mulberry32 over an FNV-style hash)
    static uint Hash(int a, int b)
    {
        unchecked
        {
            int h = (int)2166136261u ^ a;
            h = h * 16777619 ^ b;
            return (uint)(h * 16777619);
        }
    }
    class Mulberry
    {
        uint a;
        public Mulberry(uint seed) { a = seed; }
        public double Next()
        {
            unchecked
            {
                a += 0x6d2b79f5u;
                uint t = a;
                t = (t ^ (t >> 15)) * (t | 1u);
                t ^= t + (t ^ (t >> 7)) * (t | 61u);
                return (t ^ (t >> 14)) / 4294967296.0;
            }
        }
    }

    // ---------------- Level and run state ----------------
    int stageIdx, width, tier;
    char[,] grid;
    Vector2Int startCell, exitCell; Vector2Int? runawayCell;
    class Dropper { public int col; public float y, vy; public int st; public Transform t; } // 0 hang 1 fall 2 landed
    readonly List<Dropper> droppers = new List<Dropper>();
    readonly HashSet<int> popped = new HashSet<int>(), fallen = new HashSet<int>(), revealed = new HashSet<int>();
    readonly Dictionary<int, float> crumble = new Dictionary<int, float>();
    float x, y, vx, vy, coyote, buffer, runTime, attemptTime;
    bool onGround, jumping, doorMoved;
    int facing = 1;
    Vector2Int door;
    int fails, score, stars;
    string quip = ""; float quipT;
    float dieT;

    Camera cam;
    Transform root, player, playerBody, doorT, bg;
    readonly Dictionary<int, Transform> cellObj = new Dictionary<int, Transform>();
    Bursts bursts;
    Synth synth;
    bool showStages;
    float shake, camX;

    int K(int r, int c) => r * 1000 + c;

    void Awake()
    {
        Application.targetFrameRate = 60;
        SetupScene();
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        LoadStage(stageIdx, false);
    }

    void SetupScene()
    {
        cam = new GameObject("Camera").AddComponent<Camera>();
        cam.fieldOfView = 40f;
        cam.clearFlags = CameraClearFlags.SolidColor;
        cam.backgroundColor = new Color(0.55f, 0.75f, 0.95f);
        cam.farClipPlane = 200f;
        var key = new GameObject("Key").AddComponent<Light>();
        key.type = LightType.Directional;
        key.intensity = 1f;
        key.color = new Color(1f, 0.97f, 0.9f);
        key.transform.rotation = Quaternion.Euler(40f, -30f, 0f);
        RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat;
        RenderSettings.ambientLight = new Color(0.55f, 0.55f, 0.62f);
        bursts = new Bursts(transform, 1f);
        synth = new Synth(gameObject);
    }

    void BuildLevel()
    {
        int s = stageIdx + 1;
        tier = Mathf.Min(4, (s - 1) / 6);
        var rnd = new Mulberry(Hash(20261123, s));
        var mids = new List<ChunkDef>(); var newest = new List<ChunkDef>();
        foreach (var c in Chunks) if (c.kind == 1 && c.tier <= tier) { mids.Add(c); if (c.tier == tier) newest.Add(c); }
        var chosen = new List<ChunkDef> { Chunks[0] };
        int n = 1 + (s - 1) / 6;
        int slot = (int)(rnd.Next() * n);
        bool hasNewest = false;
        for (int i = 0; i < n; i++)
        {
            var pool = (i == slot || (i == n - 1 && !hasNewest)) ? newest : mids;
            string prev = chosen[chosen.Count - 1].id;
            var pick = pool[(int)(rnd.Next() * pool.Count)];
            if (pick.id == prev && pool.Count > 1) pick = pool[(pool.IndexOf(pick) + 1) % pool.Count];
            if (pick.tier == tier) hasNewest = true;
            chosen.Add(pick);
        }
        var ends = new List<ChunkDef>();
        foreach (var c in Chunks) if (c.kind == 2 && c.tier <= Mathf.Min(tier, 3)) ends.Add(c);
        chosen.Add(ends[(int)(rnd.Next() * ends.Count)]);
        width = chosen.Count * Chunk;
        grid = new char[Rows, width];
        startCell = new Vector2Int(1, 9); exitCell = new Vector2Int(width - 3, 9); runawayCell = null;
        for (int ci = 0; ci < chosen.Count; ci++)
            for (int r = 0; r < Rows; r++)
                for (int c = 0; c < Chunk; c++)
                {
                    char ch = chosen[ci].rows[r][c];
                    int col = ci * Chunk + c;
                    if (ch == 'S') startCell = new Vector2Int(col, r);
                    else if (ch == 'E') exitCell = new Vector2Int(col, r);
                    else if (ch == 'X') runawayCell = new Vector2Int(col, r);
                    grid[r, col] = ch == 'S' || ch == 'E' || ch == 'X' ? '.' : ch;
                }
    }

    char Cell(int r, int c) => r < 0 || r >= Rows || c < 0 || c >= width ? '.' : grid[r, c];

    bool IsSolid(int r, int c)
    {
        if (c < 0 || c >= width) return true;
        if (r < 0 || r >= Rows) return false;
        char cell = grid[r, c];
        if (cell == '#') return true;
        if (cell == 'f') return !fallen.Contains(K(r, c));
        if (cell == 'h') return revealed.Contains(K(r, c));
        return false;
    }
    bool LandedDropperAt(int r, int c) { foreach (var d in droppers) if (d.st == 2 && d.col == c && Mathf.RoundToInt(d.y) == r) return true; return false; }
    bool Blocked(int r, int c)
    {
        if (IsSolid(r, c) || LandedDropperAt(r, c)) return true;
        foreach (var d in droppers) if (d.st == 0 && d.col == c && Mathf.FloorToInt(d.y) == r) return true;
        return false;
    }
    static bool Overlaps(float ax, float ay, float aw, float ah, float bx, float by, float bw, float bh) => ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;

    // world position of grid space (row down, col right)
    static Vector3 W(float col, float row, float z = 0f) => new Vector3(col, -row, z);

    void BuildScene()
    {
        var accent = TierColor[tier];
        bg = OiyoArcade.Prim(PrimitiveType.Quad, "Backdrop", OiyoArcade.Textured(OiyoArcade.Art("TS/backdrop")), root).transform;
        bg.localScale = new Vector3(48f, 24f, 1f);
        var groundMat = OiyoArcade.Lit(Color.white, 0.15f, OiyoArcade.Art("TS/brick", true));
        var topMat = OiyoArcade.Lit(Color.white, 0.15f, OiyoArcade.Art("TS/turf", true));
        var hiddenMat = OiyoArcade.Lit(new Color(1f, 0.85f, 0.4f), 0.5f, OiyoArcade.Art("TS/mystery"));
        var spikeMat = OiyoArcade.Transparent(OiyoArcade.Art("TS/spike"), Color.white);
        var padMat = OiyoArcade.LitGlow(new Color(0.3f, 0.9f, 0.5f), new Color(0.05f, 0.2f, 0.1f), 0.6f);
        cellObj.Clear();
        for (int r = 0; r < Rows; r++)
            for (int c = 0; c < width; c++)
            {
                char ch = grid[r, c];
                Transform t = null;
                if (ch == '#' || ch == 'f')
                {
                    // fake floors look exactly like the real thing
                    bool top = r == 0 || (grid[r - 1, c] != '#' && grid[r - 1, c] != 'f');
                    var b = OiyoArcade.Prim(PrimitiveType.Cube, "Block", top ? topMat : groundMat, root);
                    b.transform.position = W(c + 0.5f, r + 0.5f);
                    b.transform.localScale = new Vector3(1f, 1f, 2f);
                    t = b.transform;
                }
                else if (ch == 'h')
                {
                    var b = OiyoArcade.Prim(PrimitiveType.Cube, "Hidden", hiddenMat, root);
                    b.transform.position = W(c + 0.5f, r + 0.5f);
                    b.transform.localScale = new Vector3(1f, 1f, 1f);
                    t = b.transform;
                }
                else if (ch == '^' || ch == 'p')
                {
                    var holder = new GameObject(ch == 'p' ? "Pop" : "Spike").transform;
                    holder.SetParent(root, false);
                    for (int k = 0; k < 2; k++)
                    {
                        var q = OiyoArcade.Prim(PrimitiveType.Quad, "Teeth", spikeMat, holder);
                        q.transform.localPosition = new Vector3(0f, 0f, k == 0 ? -0.3f : 0.3f);
                        q.transform.localScale = new Vector3(1f, 0.6f, 1f);
                    }
                    holder.position = W(c + 0.5f, r + 0.7f);
                    t = holder;
                }
                else if (ch == 'b')
                {
                    var holder = new GameObject("Bounce").transform;
                    holder.SetParent(root, false);
                    var pad = OiyoArcade.Prim(PrimitiveType.Cylinder, "Pad", padMat, holder);
                    pad.transform.localScale = new Vector3(0.9f, 0.08f, 0.9f);
                    pad.transform.localPosition = new Vector3(0f, -0.12f, 0f);
                    var spring = OiyoArcade.Prim(PrimitiveType.Cylinder, "Spring", OiyoArcade.Lit(new Color(0.75f, 0.75f, 0.8f), 0.8f, null, 0.6f), holder);
                    spring.transform.localScale = new Vector3(0.4f, 0.16f, 0.4f);
                    spring.transform.localPosition = new Vector3(0f, -0.32f, 0f);
                    holder.position = W(c + 0.5f, r + 0.5f);
                    t = holder;
                }
                if (t != null) cellObj[K(r, c)] = t;
            }
        // droppers: a heavy grumpy block on a chain
        droppers.Clear();
        var dropMat = OiyoArcade.Lit(new Color(0.55f, 0.55f, 0.62f), 0.3f, OiyoArcade.Art("TS/dropper"));
        for (int r = 0; r < Rows; r++)
            for (int c = 0; c < width; c++)
                if (grid[r, c] == 'd')
                {
                    var b = OiyoArcade.Prim(PrimitiveType.Cube, "Dropper", dropMat, root);
                    b.transform.localScale = new Vector3(0.98f, 0.98f, 1.2f);
                    droppers.Add(new Dropper { col = c, y = r, t = b.transform });
                }
        // the exit door
        doorT = new GameObject("Door").transform;
        doorT.SetParent(root, false);
        var frame = OiyoArcade.Prim(PrimitiveType.Cube, "Frame", OiyoArcade.Lit(new Color(0.45f, 0.3f, 0.2f), 0.3f), doorT);
        frame.transform.localScale = new Vector3(0.9f, 1.3f, 0.3f);
        var leaf = OiyoArcade.Prim(PrimitiveType.Quad, "Leaf", OiyoArcade.Transparent(OiyoArcade.Art("TS/door"), Color.white), doorT);
        leaf.transform.localPosition = new Vector3(0f, 0f, -0.16f);
        leaf.transform.localScale = new Vector3(0.8f, 1.2f, 1f);
        var glow = OiyoArcade.GlowQuad("Glow", new Color(1f, 0.9f, 0.5f, 0.45f), 2.4f, doorT);
        glow.transform.localPosition = new Vector3(0f, 0f, 0.3f);

        player = new GameObject("Runner").transform;
        player.SetParent(root, false);
        playerBody = new GameObject("Body").transform;
        playerBody.SetParent(player, false);
        var torso = OiyoArcade.Prim(PrimitiveType.Cube, "Torso", OiyoArcade.LitGlow(new Color(0.95f, 0.35f, 0.4f), new Color(0.1f, 0.02f, 0.03f), 0.4f), playerBody);
        torso.transform.localScale = new Vector3(0.62f, 0.62f, 0.62f);
        torso.transform.localPosition = new Vector3(0f, -0.08f, 0f);
        var face = OiyoArcade.Prim(PrimitiveType.Quad, "Face", OiyoArcade.Transparent(OiyoArcade.Art("TS/face"), Color.white), playerBody);
        face.transform.localPosition = new Vector3(0.05f, -0.02f, -0.32f);
        face.transform.localScale = Vector3.one * 0.56f;
        var hat = OiyoArcade.Prim(PrimitiveType.Cube, "Band", OiyoArcade.Lit(new Color(0.15f, 0.2f, 0.45f), 0.4f), playerBody);
        hat.transform.localScale = new Vector3(0.66f, 0.12f, 0.66f);
        hat.transform.localPosition = new Vector3(0f, 0.2f, 0f);
        for (int s = -1; s <= 1; s += 2)
        {
            var foot = OiyoArcade.Prim(PrimitiveType.Cube, "Foot", OiyoArcade.Lit(new Color(0.2f, 0.2f, 0.25f), 0.3f), playerBody);
            foot.transform.localScale = new Vector3(0.22f, 0.12f, 0.3f);
            foot.transform.localPosition = new Vector3(s * 0.16f, -0.42f, 0f);
        }
    }

    void LoadStage(int idx, bool ready = true)
    {
        stageIdx = Mathf.Clamp(idx, 0, StageCount - 1);
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Stage").transform;
        revealed.Clear();
        BuildLevel();
        BuildScene();
        fails = 0; runTime = 0f; score = 0; stars = 0;
        showStages = false;
        StartAttempt();
        state = ready ? GameState.Ready : GameState.Menu;
        Sync(0f);
        camX = x;
        UpdateCamera(1f, true);
    }

    void StartAttempt()
    {
        x = startCell.x + (1f - PW) / 2f; y = startCell.y + 1f - PH;
        vx = vy = 0f; onGround = false; jumping = false; coyote = buffer = 0f; facing = 1; attemptTime = 0f;
        popped.Clear(); crumble.Clear(); fallen.Clear();
        foreach (var d in droppers) { d.st = 0; d.vy = 0f; }
        for (int r = 0; r < Rows; r++) for (int c = 0; c < width; c++) if (grid[r, c] == 'd') { }
        int i = 0;
        for (int r = 0; r < Rows; r++) for (int c = 0; c < width; c++) if (grid[r, c] == 'd') { droppers[i].y = r; i++; }
        door = exitCell; doorMoved = false;
        foreach (var kv in cellObj) kv.Value.gameObject.SetActive(true);
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("trap-stairs", state, score);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        ReadInput();
        if (state == GameState.Playing)
        {
            runTime += dt;
            int n = Mathf.CeilToInt(dt / (1f / 120f));
            for (int i = 0; i < n && state == GameState.Playing; i++) Step(dt / n, i == 0);
        }
        else if (state == GameState.Dying)
        {
            dieT -= dt;
            if (dieT <= 0f) { StartAttempt(); state = GameState.Playing; }
        }
        quipT -= dt;
        Sync(dt);
        UpdateCamera(dt, false);
    }

    bool inLeft, inRight, inJump, inJumpPressed;
    readonly HashSet<int> jumpFingers = new HashSet<int>();

    // the on-screen pads, in GUI units
    Rect LeftPad(float w, float h) => new Rect(12f, h - 184f, 78f, 72f);
    Rect RightPad(float w, float h) => new Rect(98f, h - 184f, 78f, 72f);
    Rect JumpPad(float w, float h) => new Rect(w - 116f, h - 150f, 100f, 100f);

    void ReadInput()
    {
        float w = OiyoArcade.W, h = OiyoArcade.H;
        Rect lp = LeftPad(w, h), rp = RightPad(w, h), jp = JumpPad(w, h);
        inLeft = Input.GetKey(KeyCode.LeftArrow) || Input.GetKey(KeyCode.A);
        inRight = Input.GetKey(KeyCode.RightArrow) || Input.GetKey(KeyCode.D);
        bool keyJump = Input.GetKey(KeyCode.Space) || Input.GetKey(KeyCode.UpArrow) || Input.GetKey(KeyCode.W);
        bool keyJumpDown = Input.GetKeyDown(KeyCode.Space) || Input.GetKeyDown(KeyCode.UpArrow) || Input.GetKeyDown(KeyCode.W);
        bool touchJump = false, touchJumpDown = false;
        var began = OiyoArcade.Began();
        foreach (var b in began)
        {
            var g = OiyoArcade.ToGui(b.pos);
            // anything that is not a move pad counts as jump, so a tap anywhere starts and hops
            if (!lp.Contains(g) && !rp.Contains(g)) { jumpFingers.Add(b.id); touchJumpDown = true; }
        }
        var heldIds = new HashSet<int>();
        foreach (var p in OiyoArcade.Held())
        {
            heldIds.Add(p.id);
            var g = OiyoArcade.ToGui(p.pos);
            if (jumpFingers.Contains(p.id)) { touchJump = true; continue; }
            if (lp.Contains(g)) inLeft = true;
            else if (rp.Contains(g)) inRight = true;
        }
        jumpFingers.RemoveWhere(id => !heldIds.Contains(id));
        inJump = keyJump || touchJump;
        bool pressed = keyJumpDown || touchJumpDown;
        switch (state)
        {
            case GameState.Ready:
                if (pressed || began.Count > 0 || inLeft || inRight) { state = GameState.Playing; inJumpPressed = pressed; }
                return;
            case GameState.Playing:
            case GameState.Dying:
                if (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P)) { state = GameState.Paused; return; }
                if (pressed) inJumpPressed = true;
                return;
            case GameState.Paused:
                if (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P)) state = GameState.Playing;
                return;
            case GameState.Victory:
                if (Input.GetKeyDown(KeyCode.Return) || keyJumpDown) LoadStage(Mathf.Min(stageIdx + 1, StageCount - 1));
                return;
            case GameState.Menu:
                if (!showStages && (Input.GetKeyDown(KeyCode.Return) || keyJumpDown)) LoadStage(stageIdx);
                return;
        }
    }

    void Step(float dt, bool first)
    {
        attemptTime += dt;
        int dir = (inRight ? 1 : 0) - (inLeft ? 1 : 0);
        vx = dir * RunSpeed;
        if (dir != 0) facing = dir;
        coyote = onGround ? Coyote : Mathf.Max(0f, coyote - dt);
        bool jp = first && inJumpPressed;
        if (first) inJumpPressed = false;
        buffer = jp ? JumpBuffer : Mathf.Max(0f, buffer - dt);
        if (buffer > 0f && coyote > 0f)
        {
            vy = -JumpV; buffer = 0f; coyote = 0f; onGround = false; jumping = true;
            synth.Tone(520f, 0.08f, Wave.Square, 0.12f, 860f, 14f);
        }
        if (jumping && !inJump) { if (vy < -JumpV * 0.35f) vy = -JumpV * 0.35f; jumping = false; }
        if (vy >= 0f) jumping = false;
        vy = Mathf.Min(MaxFall, vy + Gravity * dt);

        // move x
        float nx = x + vx * dt;
        int top = Mathf.FloorToInt(y + Eps), bottom = Mathf.FloorToInt(y + PH - Eps);
        if (vx > 0f) { int col = Mathf.FloorToInt(nx + PW - Eps); for (int r = top; r <= bottom; r++) if (Blocked(r, col)) { nx = col - PW; break; } }
        else if (vx < 0f) { int col = Mathf.FloorToInt(nx + Eps); for (int r = top; r <= bottom; r++) if (Blocked(r, col)) { nx = col + 1; break; } }
        x = nx;

        // move y
        float ny = y + vy * dt;
        int left = Mathf.FloorToInt(x + Eps), right = Mathf.FloorToInt(x + PW - Eps);
        bool wasGround = onGround;
        onGround = false;
        if (vy > 0f)
        {
            int row = Mathf.FloorToInt(ny + PH - Eps);
            for (int c = left; c <= right; c++)
                if (Blocked(row, c))
                {
                    ny = row - PH; if (!wasGround && vy > 8f) { squash = 0.3f; synth.Tone(160f, 0.05f, Wave.Sine, 0.12f, 0f, 20f); }
                    vy = 0f; onGround = true;
                    if (Cell(row, c) == 'f' && !crumble.ContainsKey(K(row, c))) crumble[K(row, c)] = attemptTime;
                }
        }
        else if (vy < 0f)
        {
            int row = Mathf.FloorToInt(ny + Eps);
            for (int c = left; c <= right; c++)
            {
                if (Cell(row, c) == 'h' && !revealed.Contains(K(row, c)))
                {
                    revealed.Add(K(row, c));
                    synth.Tone(880f, 0.12f, Wave.Square, 0.14f, 440f, 10f);
                    bursts.Emit(W(c + 0.5f, row + 0.5f, -0.6f), new Color(1f, 0.85f, 0.4f), 12, 3f, 0.15f, 0.4f);
                }
                if (Blocked(row, c)) { ny = row + 1; vy = 0f; }
            }
        }
        y = ny;

        // crumbling floors
        var drop = new List<int>();
        foreach (var kv in crumble) if (!fallen.Contains(kv.Key) && attemptTime - kv.Value >= CrumbleDelay) drop.Add(kv.Key);
        foreach (var k in drop)
        {
            fallen.Add(k);
            int r = k / 1000, c = k % 1000;
            bursts.Emit(W(c + 0.5f, r + 0.5f, -0.6f), new Color(0.7f, 0.55f, 0.4f), 14, 2.5f, 0.15f, 0.6f);
            synth.Tone(110f, 0.2f, Wave.Noise, 0.16f, 0f, 9f);
        }

        float cx = x + PW / 2f;
        for (int c = Mathf.Max(0, Mathf.FloorToInt(cx - PopRange)); c <= Mathf.Min(width - 1, Mathf.FloorToInt(cx + PopRange)); c++)
            for (int r = 0; r < Rows; r++)
                if (grid[r, c] == 'p' && !popped.Contains(K(r, c)) && Mathf.Abs(cx - (c + 0.5f)) < PopRange)
                {
                    popped.Add(K(r, c));
                    synth.Tone(1200f, 0.06f, Wave.Saw, 0.12f, 600f, 20f);
                }
        foreach (var d in droppers)
        {
            if (d.st == 0 && cx > d.col + 0.5f - DropRange && cx < d.col + 1.2f && y > d.y) { d.st = 1; synth.Tone(300f, 0.25f, Wave.Saw, 0.12f, 120f, 6f); }
            if (d.st == 1)
            {
                d.vy = Mathf.Min(MaxFall, d.vy + Gravity * dt);
                d.y += d.vy * dt;
                int below = Mathf.FloorToInt(d.y + 1f - Eps);
                if (IsSolid(below, d.col) || LandedDropperAt(below, d.col))
                {
                    d.y = below - 1; d.st = 2; shake = 0.25f;
                    synth.Tone(80f, 0.2f, Wave.Noise, 0.2f, 0f, 10f);
                }
                if (Overlaps(x, y, PW, PH, d.col, d.y, 1f, 1f)) { Die(); return; }
            }
            if (d.y > Rows + 2) d.st = 2;
        }
        if (vy >= 0f)
        {
            for (int c = left; c <= right; c++)
            {
                int r = Mathf.FloorToInt(y + PH - Eps);
                if (Cell(r, c) == 'b' && y + PH > r + 0.5f)
                {
                    vy = -BounceV; onGround = false; jumping = false;
                    synth.Tone(400f, 0.18f, Wave.Triangle, 0.18f, 1100f, 8f);
                }
            }
        }
        for (int r = Mathf.FloorToInt(y); r <= Mathf.FloorToInt(y + PH); r++)
            for (int c = Mathf.FloorToInt(x); c <= Mathf.FloorToInt(x + PW); c++)
            {
                char cell = Cell(r, c);
                bool live = cell == '^' || (cell == 'p' && popped.Contains(K(r, c)));
                if (live && Overlaps(x, y, PW, PH, c + 0.15f, r + 0.4f, 0.7f, 0.6f)) { Die(); return; }
            }
        if (y > Rows + 1) { Die(); return; }
        if (runawayCell.HasValue && !doorMoved && Mathf.Abs(cx - (door.x + 0.5f)) < RunawayRange)
        {
            bursts.Emit(W(door.x + 0.5f, door.y + 0.5f, -0.5f), new Color(1f, 0.9f, 0.5f), 16, 3f, 0.2f, 0.5f);
            door = runawayCell.Value; doorMoved = true;
            synth.Tone(1500f, 0.25f, Wave.Square, 0.1f, 2400f, 6f);
            Popup(U("The door ran away!"));
        }
        else if (Overlaps(x, y, PW, PH, door.x + 0.2f, door.y, 0.6f, 1f)) Win();
    }

    float squash;

    void Popup(string s) { quip = s; quipT = 1.6f; }

    void Die()
    {
        fails++;
        state = GameState.Dying;
        dieT = 0.85f;
        shake = 0.3f;
        bursts.Emit(W(x + PW / 2f, y + PH / 2f, -0.6f), new Color(0.95f, 0.35f, 0.4f), 26, 4f, 0.18f, 0.6f);
        synth.Tone(200f, 0.35f, Wave.Saw, 0.2f, 70f, 5f);
        Popup(U(Quips[(fails - 1) % Quips.Length]));
    }

    void Win()
    {
        stars = 1 + (fails <= 4 ? 1 : 0) + (fails <= 1 ? 1 : 0);
        score = Mathf.Max(100, 1000 - fails * 40 - Mathf.FloorToInt(runTime) * 4) + stars * 100 + stageIdx * 10;
        state = GameState.Victory;
        OiyoArcade.Record(Slug, stageIdx, stars, score, StageCount);
        bursts.Emit(W(door.x + 0.5f, door.y + 0.5f, -0.6f), TierColor[tier], 50, 5f, 0.25f, 1f, Vector3.up * 2f);
        StartCoroutine(Arp(new[] { 523f, 659f, 784f, 1047f, 1319f }, 0.09f));
    }

    IEnumerator Arp(float[] fs, float gap)
    {
        foreach (var f in fs) { synth.Tone(f, 0.2f, Wave.Triangle, 0.3f, 0f, 6f); yield return new WaitForSeconds(gap); }
    }

    // ---------------- View ----------------
    void Sync(float dt)
    {
        if (player == null) return;
        bool alive = state != GameState.Dying;
        player.gameObject.SetActive(alive);
        squash = Mathf.MoveTowards(squash, 0f, dt * 2f);
        player.position = W(x + PW / 2f, y + PH / 2f, 0f);
        float run = Mathf.Abs(vx) > 0.1f && onGround ? Mathf.Sin(Time.time * 22f) * 0.06f : 0f;
        playerBody.localScale = new Vector3(1f + squash * 0.5f, 1f - squash + run, 1f);
        playerBody.localRotation = Quaternion.Euler(0f, facing < 0 ? 180f : 0f, onGround ? 0f : -vy * 0.6f * facing);
        foreach (var kv in cellObj)
        {
            int r = kv.Key / 1000, c = kv.Key % 1000;
            char ch = grid[r, c];
            var t = kv.Value;
            if (ch == 'f')
            {
                bool gone = fallen.Contains(kv.Key);
                t.gameObject.SetActive(!gone);
                var basePos = W(c + 0.5f, r + 0.5f);
                t.position = crumble.ContainsKey(kv.Key) && !gone ? basePos + new Vector3(Mathf.Sin(Time.time * 80f) * 0.05f, 0f, 0f) : basePos;
            }
            else if (ch == 'h') t.gameObject.SetActive(revealed.Contains(kv.Key));
            else if (ch == 'p')
            {
                bool up = popped.Contains(kv.Key);
                var target = W(c + 0.5f, r + (up ? 0.7f : 1.25f));
                t.position = Vector3.MoveTowards(t.position, target, dt * 14f);
            }
            else if (ch == 'b')
            {
                bool pressed = Mathf.Abs(x + PW / 2f - (c + 0.5f)) < 0.6f && Mathf.Abs(y + PH - (r + 0.5f)) < 0.3f;
                t.localScale = new Vector3(1f, pressed ? 0.6f : 1f, 1f);
            }
        }
        foreach (var d in droppers) if (d.t != null) d.t.position = W(d.col + 0.5f, d.y + 0.5f) + (d.st == 0 && Mathf.Abs(x - d.col) < 4f ? new Vector3(Mathf.Sin(Time.time * 40f) * 0.03f, 0f, 0f) : Vector3.zero);
        doorT.position = Vector3.Lerp(doorT.position, W(door.x + 0.5f, door.y + 0.38f, 0.4f), doorMoved && state == GameState.Playing ? 1f - Mathf.Exp(-dt * 10f) : 1f);
    }

    void UpdateCamera(float dt, bool snap)
    {
        float aspect = Mathf.Max(0.3f, cam.aspect);
        float tan = Mathf.Tan(cam.fieldOfView * 0.5f * Mathf.Deg2Rad);
        // the whole 12-row slice plus a margin fits the height; an upright phone needs it a bit taller for the pads
        float halfH = aspect < 1f ? 7.5f : 7.6f;
        float dist = halfH / tan;
        float halfW = halfH * aspect;
        float target = x + facing * 1.2f;
        camX = snap ? target : Mathf.Lerp(camX, target, 1f - Mathf.Exp(-dt * 3.5f));
        float cxw = Mathf.Clamp(camX, halfW - 0.5f, width - halfW + 0.5f);
        if (width < halfW * 2f) cxw = width * 0.5f;
        // on a phone the ground sits about 70% down, just above the pads
        float cy = aspect < 1f ? -8.7f : -Rows * 0.5f + 0.2f;
        var pos = new Vector3(cxw, cy + 1f, -dist);
        if (shake > 0f) { pos += Random.insideUnitSphere * shake * 0.25f; shake = Mathf.MoveTowards(shake, 0f, dt); }
        cam.transform.position = pos;
        cam.transform.rotation = Quaternion.LookRotation(new Vector3(pos.x, cy, 0f) - pos);
        if (bg != null)
        {
            bg.position = new Vector3(cxw * 0.85f, cy + 1f, 30f);
            bg.localScale = new Vector3((halfW + 12f) * 4.6f, (halfH + 6f) * 4.6f, 1f);
        }
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.9f, 0.35f, 0.4f, 0.97f);
    static readonly Color Dark = new Color(0.05f, 0.05f, 0.1f, 0.82f);
    static readonly Color Gold = new Color(1f, 0.8f, 0.25f, 0.97f);
    static readonly Color Slate = new Color(0.2f, 0.22f, 0.32f, 0.95f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + U(TierNames[Mathf.Min(4, i / 6)]);

    void OnGUI()
    {
        OiyoArcade.Begin();
        float w = OiyoArcade.W, h = OiyoArcade.H;
        if (state == GameState.Menu) { DrawMenu(w, h); return; }
        var bar = new Rect(8f, 8f, w - 16f, 58f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 12f, w - 140f, 24f), "<b>" + StageTitle(stageIdx) + "</b>", 16, new Color(1f, 0.85f, 0.8f));
        OiyoArcade.Text(new Rect(20f, 36f, w - 90f, 24f), $"{U("Fails")} <b>{fails}</b>   {U("Time")} <b>{runTime:0.0}s</b>", 14, Color.white);
        if (OiyoArcade.Button(new Rect(w - 64f, 14f, 46f, 46f), "<b>II</b>", Slate, 18))
        {
            if (state == GameState.Playing || state == GameState.Dying) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        OiyoArcade.Bar(new Rect(16f, 70f, w - 32f, 6f), Mathf.Clamp01(x / Mathf.Max(1f, door.x)), new Color(0f, 0f, 0f, 0.35f), TierColor[tier]);
        if (quipT > 0f && quip.Length > 0)
            OiyoArcade.Shadowed(new Rect(0f, 92f, w, 34f), quip, 20, new Color(1f, 0.92f, 0.6f, Mathf.Clamp01(quipT * 2f)), TextAnchor.MiddleCenter);
        if (state == GameState.Playing || state == GameState.Dying || state == GameState.Ready)
        {
            // the move pads sit above the page's exit button in the bottom-left corner
            Pad(LeftPad(w, h), "◀", inLeft);
            Pad(RightPad(w, h), "▶", inRight);
            Pad(JumpPad(w, h), U("Jump"), inJump);
        }
        if (state == GameState.Ready)
        {
            var r = new Rect(w * 0.5f - 170f, 130f, 340f, 104f);
            OiyoArcade.Panel(r, Dark);
            OiyoArcade.Text(new Rect(r.x + 12f, r.y + 8f, r.width - 24f, r.height - 16f),
                $"<b>{U("Reach the door. Trust nothing.")}</b>\n<size=14>{U("◀ ▶ to run, tap anywhere else to jump; a short tap is a low hop. Keys: arrows and Space.")}</size>", 16, Color.white, TextAnchor.MiddleCenter);
        }
        if (state == GameState.Paused) DrawPause(w, h);
        if (state == GameState.Victory) DrawResult(w, h);
    }

    void Pad(Rect r, string label, bool down)
    {
        OiyoArcade.Panel(r, new Color(1f, 1f, 1f, down ? 0.32f : 0.14f));
        OiyoArcade.Text(r, "<b>" + label + "</b>", label.Length <= 1 ? 30 : 18, new Color(1f, 1f, 1f, 0.9f), TextAnchor.MiddleCenter);
    }

    void DrawMenu(float w, float h)
    {
        if (showStages)
        {
            float bw = Mathf.Min(w - 16f, 760f);
            var box = new Rect(w * 0.5f - bw * 0.5f, 12f, bw, h - 24f);
            OiyoArcade.Panel(box, new Color(0.05f, 0.05f, 0.1f, 0.94f));
            OiyoArcade.Text(new Rect(box.x + 16f, box.y + 12f, box.width - 120f, 30f), "<b>" + U("Choose a stage") + "</b>", 20, Color.white);
            OiyoArcade.Text(new Rect(box.x + 16f, box.y + 40f, box.width - 32f, 22f), $"★ {OiyoArcade.TotalStars(Slug, StageCount)}/{StageCount * 3}", 15, Gold);
            if (OiyoArcade.Button(new Rect(box.xMax - 100f, box.y + 12f, 86f, 40f), U("Back"), Slate, 16)) showStages = false;
            int pick = OiyoArcade.StageGrid(new Rect(box.x + 14f, box.y + 70f, box.width - 28f, box.height - 84f), Slug, StageCount, Accent, U("Stage"));
            if (pick >= 0) LoadStage(pick);
            return;
        }
        float cw = Mathf.Min(380f, w - 24f);
        var card = new Rect(w * 0.5f - cw * 0.5f, h * 0.5f - 170f, cw, 340f);
        OiyoArcade.Panel(card, Dark);
        OiyoArcade.Shadowed(new Rect(card.x, card.y + 18f, cw, 40f), U("Trap Stairs 3D"), 30, new Color(1f, 0.8f, 0.75f), TextAnchor.MiddleCenter);
        OiyoArcade.Text(new Rect(card.x + 20f, card.y + 62f, cw - 40f, 46f), U("A trap platformer. Every stage hides a nasty surprise; a trap you have seen once never fools you again."), 15, new Color(1f, 1f, 1f, 0.85f), TextAnchor.MiddleCenter);
        OiyoArcade.Text(new Rect(card.x, card.y + 110f, cw, 24f), StageTitle(stageIdx), 15, Gold, TextAnchor.MiddleCenter);
        if (OiyoArcade.Button(new Rect(card.x + 24f, card.y + 142f, cw - 48f, 58f), "<b>▶ " + F("Play stage {0}", stageIdx + 1) + "</b>", Accent, 21)) LoadStage(stageIdx);
        if (OiyoArcade.Button(new Rect(card.x + 24f, card.y + 210f, cw - 48f, 46f), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}", Slate, 17)) showStages = true;
        if (OiyoArcade.Button(new Rect(card.x + 24f, card.y + 266f, cw - 48f, 46f), "Aa  " + OiyoArcade.Lang.ToUpperInvariant(), Slate, 17)) OiyoArcade.NextLang();
    }

    void DrawPause(float w, float h)
    {
        float cw = Mathf.Min(340f, w - 24f);
        var card = new Rect(w * 0.5f - cw * 0.5f, h * 0.5f - 130f, cw, 260f);
        OiyoArcade.Panel(card, Dark);
        OiyoArcade.Shadowed(new Rect(card.x, card.y + 16f, cw, 36f), U("Paused"), 26, Color.white, TextAnchor.MiddleCenter);
        if (OiyoArcade.Button(new Rect(card.x + 24f, card.y + 70f, cw - 48f, 52f), "▶ " + U("Resume"), Accent, 19)) state = GameState.Playing;
        if (OiyoArcade.Button(new Rect(card.x + 24f, card.y + 132f, cw - 48f, 46f), U("Restart"), Slate, 17)) LoadStage(stageIdx);
        if (OiyoArcade.Button(new Rect(card.x + 24f, card.y + 188f, cw - 48f, 46f), U("Stage list"), Slate, 17)) { LoadStage(stageIdx, false); showStages = true; }
    }

    void DrawResult(float w, float h)
    {
        float cw = Mathf.Min(360f, w - 24f);
        float ch = 158f + 58f + 52f + 40f + 18f;
        var card = new Rect(w * 0.5f - cw * 0.5f, h * 0.5f - ch * 0.5f, cw, ch);
        OiyoArcade.Panel(card, Dark);
        OiyoArcade.Shadowed(new Rect(card.x, card.y + 14f, cw, 38f), U("Stage clear!"), 28, new Color(0.6f, 1f, 0.65f), TextAnchor.MiddleCenter);
        OiyoArcade.Text(new Rect(card.x + 16f, card.y + 56f, cw - 32f, 44f), $"<size=30>{OiyoArcade.StarString(stars)}</size>", 16, Color.white, TextAnchor.MiddleCenter);
        OiyoArcade.Text(new Rect(card.x + 16f, card.y + 100f, cw - 32f, 48f),
            $"{U("Score")} <b>{score}</b>   {U("Fails")} <b>{fails}</b>\n<size=14>{U("Time")} {runTime:0.0}s</size>", 16, Color.white, TextAnchor.MiddleCenter);
        float y0 = card.y + 158f;
        if (stageIdx < StageCount - 1)
        {
            if (OiyoArcade.Button(new Rect(card.x + 24f, y0, cw - 48f, 50f), "<b>" + U("Next stage") + " ▶</b>", Accent, 19)) LoadStage(stageIdx + 1);
        }
        else OiyoArcade.Text(new Rect(card.x, y0, cw, 50f), "★ " + U("You cleared all 30 stages!") + " ★", 17, Gold, TextAnchor.MiddleCenter);
        y0 += 58f;
        if (OiyoArcade.Button(new Rect(card.x + 24f, y0, cw - 48f, 44f), U("Retry"), Slate, 17)) LoadStage(stageIdx);
        y0 += 52f;
        if (OiyoArcade.Button(new Rect(card.x + 24f, y0, cw - 48f, 40f), U("Stage list"), Slate, 16)) { LoadStage(stageIdx, false); showStages = true; }
    }
}
