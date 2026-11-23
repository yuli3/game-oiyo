using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Snake Garden 3D: the web Snake Game (src/components/games/SnakeGame.tsx, src/lib/games/snake.ts)
// rebuilt as a 30-stage Unity game. Same core rules: one cell per tick, eat to grow, walls and
// your own body end the run, no turning straight back. Stages add rocks, hedges, golden fruit
// and time limits. Keyboard (arrows/WASD) or swipe anywhere on a phone.
public class SnakeGamePlayer : MonoBehaviour
{
    const string Slug = "snake-game";
    const int StageCount = 30;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    struct StageDef
    {
        public int size, goal, rocks, zone;
        public float tps, timeLimit;
        public bool golden, maze;
    }

    static readonly string[] ZoneNames = { "Sunny Meadow", "Fruit Orchard", "Stone Quarry", "Hedge Maze", "Moonlit Garden", "Storm Peak" };
    static readonly Color[] ZoneSky = {
        new Color(0.53f, 0.78f, 0.93f), new Color(0.96f, 0.8f, 0.6f), new Color(0.62f, 0.6f, 0.66f),
        new Color(0.45f, 0.66f, 0.52f), new Color(0.06f, 0.08f, 0.2f), new Color(0.2f, 0.22f, 0.3f) };
    static readonly Color[] ZoneGround = {
        new Color(0.55f, 0.85f, 0.45f), new Color(0.75f, 0.85f, 0.45f), new Color(0.78f, 0.74f, 0.66f),
        new Color(0.5f, 0.78f, 0.5f), new Color(0.35f, 0.45f, 0.7f), new Color(0.55f, 0.6f, 0.62f) };

    StageDef[] stages;
    int stageIdx;
    StageDef S => stages[stageIdx];

    // Board
    readonly List<Vector2Int> body = new List<Vector2Int>();
    readonly List<Vector2Int> prevBody = new List<Vector2Int>();
    readonly HashSet<Vector2Int> blocked = new HashSet<Vector2Int>();
    Vector2Int dir = Vector2Int.up;
    readonly List<Vector2Int> queue = new List<Vector2Int>();
    Vector2Int fruit;
    Vector2Int golden = new Vector2Int(-99, -99);
    float goldenTimer;
    int eaten, score, stars;
    float tickTimer, elapsed, timeLeft;
    bool grewThisTick;
    string endReason = "";
    System.Random rng;

    // Scene
    Camera cam;
    Light sun;
    Transform boardRoot, snakeRoot;
    readonly List<GameObject> segments = new List<GameObject>();
    GameObject headGo, fruitGo, goldenGo, groundGo;
    Material segMat, segMatAlt, headMat, rockMat, hedgeMat, grassMat, rimMat, groundMat, deadMat;
    Bursts bursts;
    Synth synth;
    float shake, headPop, menuOrbit;
    Quaternion headRot = Quaternion.identity;

    // Swipe
    int swipeId = int.MinValue;
    Vector2 swipeStart;
    bool showStages;

    void Awake()
    {
        Application.targetFrameRate = 60;
        BuildStages();
        rng = new System.Random(7);
        SetupScene();
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        LoadStage(stageIdx, false);
        state = GameState.Menu;
    }

    void BuildStages()
    {
        stages = new StageDef[StageCount];
        for (int i = 0; i < StageCount; i++)
        {
            int zone = i / 5, k = i % 5;
            var s = new StageDef
            {
                zone = zone,
                size = 10 + zone + (k >= 3 ? 1 : 0),
                tps = 4.6f + i * 0.17f,
                goal = 5 + zone * 3 + k,
                golden = zone >= 1,
                maze = zone == 3,
            };
            s.rocks = zone switch { 0 => k >= 3 ? k - 2 : 0, 1 => 1 + k, 2 => 5 + k * 2, 3 => 1 + k, 4 => 3 + k, _ => 6 + k * 2 };
            if (zone >= 4) s.timeLimit = s.goal * (zone == 4 ? 5.2f : 4.6f) - k * 1.5f;
            stages[i] = s;
        }
    }

    // ---------------- Scene ----------------
    void SetupScene()
    {
        cam = new GameObject("Camera").AddComponent<Camera>();
        cam.fieldOfView = 45f;
        cam.clearFlags = CameraClearFlags.SolidColor;
        cam.nearClipPlane = 0.3f;
        cam.farClipPlane = 200f;

        sun = new GameObject("Sun").AddComponent<Light>();
        sun.type = LightType.Directional;
        sun.shadows = LightShadows.Soft;
        sun.shadowStrength = 0.55f;
        sun.transform.rotation = Quaternion.Euler(55f, -30f, 0f);
        RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat;

        var grass = OiyoArcade.Art("SG/grass", true);
        grassMat = OiyoArcade.Lit(Color.white, 0.1f, grass);
        groundMat = OiyoArcade.Lit(Color.white, 0.05f, grass);
        rockMat = OiyoArcade.Lit(Color.white, 0.2f, OiyoArcade.Art("SG/rock"));
        hedgeMat = OiyoArcade.Lit(Color.white, 0.1f, OiyoArcade.Art("SG/hedge", true));
        rimMat = OiyoArcade.Lit(Color.white, 0.15f, OiyoArcade.Art("SG/stone", true));
        segMat = OiyoArcade.Lit(new Color(0.3f, 0.82f, 0.45f), 0.55f, OiyoArcade.Art("SG/scales"));
        segMatAlt = OiyoArcade.Lit(new Color(0.98f, 0.82f, 0.3f), 0.55f, OiyoArcade.Art("SG/scales"));
        headMat = OiyoArcade.Lit(new Color(0.36f, 0.88f, 0.5f), 0.6f, OiyoArcade.Art("SG/scales"));
        deadMat = OiyoArcade.Lit(new Color(0.85f, 0.3f, 0.3f), 0.4f);

        groundGo = OiyoArcade.Prim(PrimitiveType.Quad, "Ground", groundMat);
        groundGo.transform.rotation = Quaternion.Euler(90f, 0f, 0f);
        groundGo.transform.position = new Vector3(0f, -0.42f, 0f);
        groundGo.transform.localScale = new Vector3(80f, 80f, 1f);
        groundMat.mainTextureScale = new Vector2(20f, 20f);

        snakeRoot = new GameObject("Snake").transform;
        headGo = BuildHead();
        headGo.transform.SetParent(snakeRoot, false);
        fruitGo = BuildFruit(new Color(0.92f, 0.2f, 0.22f), false);
        goldenGo = BuildFruit(new Color(1f, 0.8f, 0.15f), true);
        goldenGo.SetActive(false);

        bursts = new Bursts(transform, 0.8f);
        synth = new Synth(gameObject);
    }

    GameObject BuildHead()
    {
        var head = OiyoArcade.Prim(PrimitiveType.Sphere, "Head", headMat);
        head.transform.localScale = new Vector3(0.92f, 0.78f, 1.0f);
        var white = OiyoArcade.Lit(Color.white, 0.7f);
        var black = OiyoArcade.Lit(new Color(0.06f, 0.06f, 0.08f), 0.9f);
        for (int s = -1; s <= 1; s += 2)
        {
            var eye = OiyoArcade.Prim(PrimitiveType.Sphere, "Eye", white, head.transform);
            eye.transform.localPosition = new Vector3(0.24f * s, 0.32f, 0.26f);
            eye.transform.localScale = Vector3.one * 0.32f;
            var pupil = OiyoArcade.Prim(PrimitiveType.Sphere, "Pupil", black, eye.transform);
            pupil.transform.localPosition = new Vector3(0f, 0.08f, 0.32f);
            pupil.transform.localScale = Vector3.one * 0.55f;
        }
        var cheek = OiyoArcade.Lit(new Color(1f, 0.55f, 0.6f), 0.3f);
        for (int s = -1; s <= 1; s += 2)
        {
            var c = OiyoArcade.Prim(PrimitiveType.Sphere, "Cheek", cheek, head.transform);
            c.transform.localPosition = new Vector3(0.38f * s, 0.02f, 0.3f);
            c.transform.localScale = new Vector3(0.18f, 0.1f, 0.12f);
        }
        return head;
    }

    GameObject BuildFruit(Color c, bool shiny)
    {
        var root = new GameObject(shiny ? "Golden" : "Fruit");
        var mat = shiny ? OiyoArcade.LitGlow(c, c * 0.6f, 0.85f) : OiyoArcade.Lit(c, 0.7f);
        var ball = OiyoArcade.Prim(PrimitiveType.Sphere, "Ball", mat, root.transform);
        ball.transform.localScale = new Vector3(0.68f, 0.62f, 0.68f);
        var stem = OiyoArcade.Prim(PrimitiveType.Cylinder, "Stem", OiyoArcade.Lit(new Color(0.42f, 0.27f, 0.12f)), root.transform);
        stem.transform.localPosition = new Vector3(0f, 0.36f, 0f);
        stem.transform.localScale = new Vector3(0.06f, 0.1f, 0.06f);
        var leaf = OiyoArcade.Prim(PrimitiveType.Sphere, "Leaf", OiyoArcade.Lit(new Color(0.25f, 0.7f, 0.25f), 0.4f), root.transform);
        leaf.transform.localPosition = new Vector3(0.12f, 0.4f, 0f);
        leaf.transform.localRotation = Quaternion.Euler(0f, 0f, -35f);
        leaf.transform.localScale = new Vector3(0.24f, 0.05f, 0.12f);
        if (shiny)
        {
            var g = OiyoArcade.GlowQuad("Halo", new Color(1f, 0.85f, 0.3f, 0.55f), 1.6f, root.transform);
            g.name = "Halo";
        }
        return root;
    }

    Vector3 W(Vector2Int c) => W(c.x, c.y);
    Vector3 W(float x, float y) { float h = (S.size - 1) * 0.5f; return new Vector3(x - h, 0f, y - h); }

    void LoadStage(int idx, bool ready = true)
    {
        stageIdx = Mathf.Clamp(idx, 0, StageCount - 1);
        rng = new System.Random(1000 + stageIdx * 37);
        if (boardRoot != null) Destroy(boardRoot.gameObject);
        boardRoot = new GameObject("Board").transform;

        int n = S.size;
        cam.backgroundColor = ZoneSky[S.zone];
        groundMat.color = Color.Lerp(ZoneGround[S.zone], new Color(0.1f, 0.25f, 0.12f), 0.55f);
        bool night = S.zone == 4;
        sun.intensity = night ? 0.55f : S.zone == 5 ? 0.85f : 1.15f;
        sun.color = night ? new Color(0.6f, 0.7f, 1f) : new Color(1f, 0.96f, 0.88f);
        RenderSettings.ambientLight = night ? new Color(0.25f, 0.28f, 0.45f) : new Color(0.55f, 0.55f, 0.6f);
        grassMat.color = ZoneGround[S.zone];

        var tile = OiyoArcade.Prim(PrimitiveType.Cube, "Field", grassMat, boardRoot);
        tile.transform.position = new Vector3(0f, -0.25f, 0f);
        tile.transform.localScale = new Vector3(n, 0.5f, n);
        // grass.png holds a 2x2 checker, so one texture repeat covers two cells.
        grassMat.mainTextureScale = new Vector2(n * 0.5f, n * 0.5f);
        tile.GetComponent<Renderer>().receiveShadows = true;

        float half = n * 0.5f + 0.35f;
        for (int s = 0; s < 4; s++)
        {
            var rim = OiyoArcade.Prim(PrimitiveType.Cube, "Rim", rimMat, boardRoot);
            bool xAxis = s < 2;
            float sign = s % 2 == 0 ? 1f : -1f;
            rim.transform.position = xAxis ? new Vector3(0f, -0.05f, sign * half) : new Vector3(sign * half, -0.05f, 0f);
            rim.transform.localScale = xAxis ? new Vector3(n + 1.4f, 0.7f, 0.7f) : new Vector3(0.7f, 0.7f, n + 1.4f);
        }

        // snake
        body.Clear(); prevBody.Clear(); queue.Clear();
        int mid = n / 2;
        body.Add(new Vector2Int(mid, 2));
        body.Add(new Vector2Int(mid, 1));
        body.Add(new Vector2Int(mid, 0));
        prevBody.AddRange(body);
        dir = Vector2Int.up;
        headRot = Quaternion.LookRotation(Vector3.forward);

        // obstacles
        blocked.Clear();
        if (S.maze) BuildHedges();
        int placed = 0, guard = 0;
        while (placed < S.rocks && guard++ < 500)
        {
            var c = new Vector2Int(rng.Next(1, n - 1), rng.Next(1, n - 1));
            if (Mathf.Abs(c.x - mid) <= 1 && c.y <= 6) continue; // keep the start lane open
            if (blocked.Contains(c)) continue;
            blocked.Add(c);
            placed++;
            var rock = OiyoArcade.Prim(PrimitiveType.Sphere, "Rock", rockMat, boardRoot);
            rock.transform.position = W(c) + Vector3.up * 0.2f;
            rock.transform.rotation = Quaternion.Euler(rng.Next(0, 360), rng.Next(0, 360), 0f);
            float sz = 0.8f + (float)rng.NextDouble() * 0.18f;
            rock.transform.localScale = new Vector3(sz, sz * 0.75f, sz * 0.9f);
        }

        eaten = 0; score = 0; elapsed = 0f; tickTimer = 0f; stars = 0;
        timeLeft = S.timeLimit;
        golden = new Vector2Int(-99, -99);
        goldenGo.SetActive(false);
        SpawnFruit();
        RebuildSegments();
        RenderSnake(1f);
        endReason = "";
        showStages = false;
        state = ready ? GameState.Ready : GameState.Menu;
    }

    void BuildHedges()
    {
        int n = S.size;
        int k = stageIdx % 5;
        int[] rows = { n / 3, (2 * n) / 3 };
        for (int r = 0; r < rows.Length; r++)
        {
            int y = rows[r];
            int gapA = 1 + (k * 3 + r * 5) % (n - 4);
            int gapB = (gapA + n / 2) % (n - 2) + 1;
            for (int x = 0; x < n; x++)
            {
                if (Mathf.Abs(x - gapA) <= 0 || Mathf.Abs(x - gapA - 1) == 0 || x == gapB || x == gapB + 1) continue;
                if (x == 0 || x == n - 1) continue;
                AddHedge(new Vector2Int(x, y));
            }
        }
        if (k >= 2)
        {
            int x = k % 2 == 0 ? 2 : n - 3;
            for (int y = rows[0] + 2; y < rows[1] - 1; y++) AddHedge(new Vector2Int(x, y));
        }
    }

    void AddHedge(Vector2Int c)
    {
        if (!blocked.Add(c)) return;
        var h = OiyoArcade.Prim(PrimitiveType.Cube, "Hedge", hedgeMat, boardRoot);
        h.transform.position = W(c) + Vector3.up * 0.35f;
        h.transform.localScale = new Vector3(0.98f, 0.75f, 0.98f);
    }

    bool Free(Vector2Int c)
    {
        if (blocked.Contains(c) || c == fruit || c == golden) return false;
        foreach (var b in body) if (b == c) return false;
        return true;
    }

    void SpawnFruit()
    {
        int n = S.size;
        for (int tries = 0; tries < 400; tries++)
        {
            var c = new Vector2Int(rng.Next(0, n), rng.Next(0, n));
            if (Free(c)) { fruit = c; fruitGo.transform.position = W(c); return; }
        }
        fruit = new Vector2Int(-50, -50);
    }

    void SpawnGolden()
    {
        int n = S.size;
        for (int tries = 0; tries < 400; tries++)
        {
            var c = new Vector2Int(rng.Next(0, n), rng.Next(0, n));
            if (Free(c)) { golden = c; goldenTimer = 7f; goldenGo.SetActive(true); goldenGo.transform.position = W(c); return; }
        }
    }

    void RebuildSegments()
    {
        while (segments.Count < body.Count - 1)
        {
            var seg = OiyoArcade.Prim(PrimitiveType.Sphere, "Seg", segMat, snakeRoot);
            segments.Add(seg);
        }
        for (int i = 0; i < segments.Count; i++)
        {
            bool on = i < body.Count - 1;
            segments[i].SetActive(on);
            if (on) segments[i].GetComponent<Renderer>().sharedMaterial = (i % 3 == 2) ? segMatAlt : segMat;
        }
        headGo.GetComponent<Renderer>().sharedMaterial = headMat;
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("snake-game", state, score);
        ReadInput();
        float dt = Time.deltaTime;
        if (state == GameState.Playing)
        {
            elapsed += dt;
            if (S.timeLimit > 0f)
            {
                timeLeft -= dt;
                if (timeLeft <= 0f) { timeLeft = 0f; Die(U("Time is up!")); }
            }
            if (golden.x >= 0)
            {
                goldenTimer -= dt;
                if (goldenTimer <= 0f) { golden = new Vector2Int(-99, -99); goldenGo.SetActive(false); }
            }
            tickTimer += dt;
            float step = 1f / S.tps;
            while (tickTimer >= step && state == GameState.Playing)
            {
                tickTimer -= step;
                Tick();
            }
        }
        float frac = state == GameState.Playing ? Mathf.Clamp01(tickTimer * S.tps) : 1f;
        RenderSnake(frac);
        AnimateProps(dt);
        UpdateCamera(dt);
    }

    void ReadInput()
    {
        if (state == GameState.Playing || state == GameState.Ready)
        {
            if (Input.GetKeyDown(KeyCode.UpArrow) || Input.GetKeyDown(KeyCode.W)) Steer(Vector2Int.up);
            if (Input.GetKeyDown(KeyCode.DownArrow) || Input.GetKeyDown(KeyCode.S)) Steer(Vector2Int.down);
            if (Input.GetKeyDown(KeyCode.LeftArrow) || Input.GetKeyDown(KeyCode.A)) Steer(Vector2Int.left);
            if (Input.GetKeyDown(KeyCode.RightArrow) || Input.GetKeyDown(KeyCode.D)) Steer(Vector2Int.right);
            if (Input.GetKeyDown(KeyCode.P) || Input.GetKeyDown(KeyCode.Escape)) { if (state == GameState.Playing) state = GameState.Paused; }

            foreach (var p in OiyoArcade.Began()) { swipeId = p.id; swipeStart = p.pos; }
            foreach (var p in OiyoArcade.Held())
            {
                if (p.id != swipeId) continue;
                Vector2 d = (p.pos - swipeStart) / OiyoArcade.ComputeScale();
                if (d.magnitude < 24f) continue;
                Vector2Int want = Mathf.Abs(d.x) > Mathf.Abs(d.y)
                    ? (d.x > 0 ? Vector2Int.right : Vector2Int.left)
                    : (d.y > 0 ? Vector2Int.up : Vector2Int.down);
                Steer(want);
                swipeStart = p.pos;
            }
            foreach (var p in OiyoArcade.Ended()) if (p.id == swipeId) swipeId = int.MinValue;
        }
        else if (state == GameState.Paused)
        {
            if (Input.GetKeyDown(KeyCode.P) || Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.Space)) state = GameState.Playing;
        }
        else if (state == GameState.Victory || state == GameState.GameOver)
        {
            if (Input.GetKeyDown(KeyCode.Space) || Input.GetKeyDown(KeyCode.Return))
                LoadStage(state == GameState.Victory ? Mathf.Min(stageIdx + 1, StageCount - 1) : stageIdx);
        }
        else if (state == GameState.Menu && !showStages)
        {
            if (Input.GetKeyDown(KeyCode.Space) || Input.GetKeyDown(KeyCode.Return)) LoadStage(stageIdx);
        }
    }

    void Steer(Vector2Int d)
    {
        Vector2Int last = queue.Count > 0 ? queue[queue.Count - 1] : dir;
        // the snake faces up at the start, so an up swipe (the natural first move) just starts it
        if (state == GameState.Ready && d == dir) { state = GameState.Playing; tickTimer = 0f; return; }
        if (d == last || d == -last) return;
        if (queue.Count >= 3) return;
        queue.Add(d);
        if (state == GameState.Ready) { state = GameState.Playing; tickTimer = 0f; }
        synth.Tone(320f, 0.04f, Wave.Triangle, 0.15f, 0f, 30f);
    }

    void Tick()
    {
        prevBody.Clear();
        prevBody.AddRange(body);
        if (queue.Count > 0) { dir = queue[0]; queue.RemoveAt(0); }
        var head = body[0] + dir;
        int n = S.size;
        if (head.x < 0 || head.y < 0 || head.x >= n || head.y >= n) { Die(U("You hit the garden wall!")); return; }
        if (blocked.Contains(head)) { Die(S.maze ? U("You ran into a hedge!") : U("You crashed into a rock!")); return; }
        bool eat = head == fruit;
        bool eatGolden = head == golden;
        // the tail cell frees up this tick unless the snake grows
        int checkCount = eat || eatGolden ? body.Count : body.Count - 1;
        for (int i = 0; i < checkCount; i++)
            if (body[i] == head) { Die(U("You bit your own tail!")); return; }

        body.Insert(0, head);
        grewThisTick = eat || eatGolden;
        if (!grewThisTick) body.RemoveAt(body.Count - 1);
        else prevBody.Add(prevBody[prevBody.Count - 1]);

        if (eat)
        {
            eaten++;
            score += 10 + stageIdx * 2;
            headPop = 1f;
            bursts.Emit(W(head) + Vector3.up * 0.3f, new Color(1f, 0.35f, 0.3f), 18, 4f, 0.3f);
            synth.Tone(620f, 0.12f, Wave.Triangle, 0.35f, 980f, 10f);
            RebuildSegments();
            if (eaten >= S.goal) { Win(); return; }
            SpawnFruit();
            if (S.golden && golden.x < 0 && rng.NextDouble() < 0.3) SpawnGolden();
        }
        else if (eatGolden)
        {
            eaten++;
            score += 60 + stageIdx * 4;
            if (S.timeLimit > 0f) timeLeft += 4f;
            headPop = 1.4f;
            golden = new Vector2Int(-99, -99);
            goldenGo.SetActive(false);
            bursts.Emit(W(head) + Vector3.up * 0.3f, new Color(1f, 0.85f, 0.25f), 36, 6f, 0.35f);
            StartCoroutine(Arp(new[] { 784f, 988f, 1175f, 1568f }, 0.06f));
            RebuildSegments();
            if (eaten >= S.goal) { Win(); return; }
        }
    }

    void Die(string reason)
    {
        if (state != GameState.Playing) return;
        endReason = reason;
        state = GameState.GameOver;
        shake = 0.6f;
        headGo.GetComponent<Renderer>().sharedMaterial = deadMat;
        foreach (var s in segments) if (s.activeSelf) s.GetComponent<Renderer>().sharedMaterial = deadMat;
        bursts.Emit(W(body[0]) + Vector3.up * 0.4f, new Color(1f, 0.4f, 0.35f), 40, 6f, 0.35f);
        synth.Tone(300f, 0.5f, Wave.Saw, 0.3f, 80f, 3f);
        synth.Tone(120f, 0.35f, Wave.Noise, 0.25f, 0f, 8f);
    }

    void Win()
    {
        state = GameState.Victory;
        float par = S.goal * S.size * 0.75f / S.tps * 1.25f;
        stars = 1 + (elapsed <= par * 1.4f ? 1 : 0) + (elapsed <= par ? 1 : 0);
        score += Mathf.Max(0, Mathf.RoundToInt((par * 1.5f - elapsed) * 5f));
        OiyoArcade.Record(Slug, stageIdx, stars, score, StageCount);
        bursts.Emit(W(body[0]) + Vector3.up * 0.5f, new Color(0.5f, 1f, 0.6f), 60, 7f, 0.35f);
        StartCoroutine(Arp(new[] { 523f, 659f, 784f, 1047f, 1319f }, 0.09f));
    }

    IEnumerator Arp(float[] notes, float gap)
    {
        foreach (var f in notes)
        {
            synth.Tone(f, 0.18f, Wave.Triangle, 0.3f, 0f, 7f);
            yield return new WaitForSeconds(gap);
        }
    }

    // ---------------- Rendering ----------------
    void RenderSnake(float frac)
    {
        float t = Time.time;
        for (int i = 0; i < body.Count; i++)
        {
            Vector2Int a = i < prevBody.Count ? prevBody[i] : body[i];
            Vector2Int b = body[i];
            Vector3 pa = W(a), pb = W(b);
            Vector3 pos = Vector3.Lerp(pa, pb, frac);
            float wiggle = state == GameState.GameOver ? 0f : Mathf.Sin(t * 8f - i * 0.7f) * 0.05f;
            if (i == 0)
            {
                headGo.transform.position = pos + new Vector3(0f, 0.38f + wiggle, 0f);
                Vector3 fwd = new Vector3(dir.x, 0f, dir.y);
                headRot = Quaternion.Slerp(headRot, Quaternion.LookRotation(fwd), Time.deltaTime * 14f);
                headGo.transform.rotation = headRot;
                float pop = 1f + headPop * 0.25f;
                headGo.transform.localScale = new Vector3(0.92f, 0.78f, 1.0f) * pop;
            }
            else
            {
                var seg = segments[i - 1];
                float k = 1f - (i / (float)Mathf.Max(6, body.Count)) * 0.4f;
                seg.transform.position = pos + new Vector3(0f, 0.32f + wiggle, 0f);
                seg.transform.localScale = Vector3.one * 0.78f * k;
            }
        }
        headPop = Mathf.MoveTowards(headPop, 0f, Time.deltaTime * 4f);
    }

    void AnimateProps(float dt)
    {
        float t = Time.time;
        fruitGo.SetActive(fruit.x >= 0 && state != GameState.Victory);
        fruitGo.transform.position = W(fruit) + new Vector3(0f, 0.38f + Mathf.Sin(t * 3f) * 0.08f, 0f);
        fruitGo.transform.rotation = Quaternion.Euler(0f, t * 60f, 0f);
        if (goldenGo.activeSelf)
        {
            goldenGo.transform.position = W(golden) + new Vector3(0f, 0.45f + Mathf.Sin(t * 5f) * 0.1f, 0f);
            goldenGo.transform.rotation = Quaternion.Euler(0f, t * 140f, 0f);
            bool blink = goldenTimer < 2f && Mathf.Repeat(t * 6f, 1f) < 0.4f;
            foreach (var r in goldenGo.GetComponentsInChildren<Renderer>()) r.enabled = !blink;
            var halo = goldenGo.transform.Find("Halo");
            if (halo != null && cam != null) halo.rotation = cam.transform.rotation;
        }
    }

    void UpdateCamera(float dt)
    {
        float n = S.size;
        float half = n * 0.5f + 1.2f;
        float vfov = cam.fieldOfView * Mathf.Deg2Rad;
        float hfov = 2f * Mathf.Atan(Mathf.Tan(vfov * 0.5f) * cam.aspect);
        float fit = Mathf.Min(vfov, hfov);
        float dist = half * 1.02f / Mathf.Tan(fit * 0.5f) + 0.8f;
        float pitch = 58f;
        float yaw = 0f;
        if (state == GameState.Menu)
        {
            menuOrbit += dt * 8f;
            yaw = Mathf.Sin(menuOrbit * Mathf.Deg2Rad * 2f) * 25f;
            dist *= 1.05f;
        }
        var rot = Quaternion.Euler(pitch, yaw, 0f);
        Vector3 target = new Vector3(0f, 0f, cam.aspect < 1f ? -0.6f : -0.2f);
        Vector3 pos = target + rot * new Vector3(0f, 0f, -dist);
        if (shake > 0f)
        {
            pos += Random.insideUnitSphere * shake * 0.4f;
            shake = Mathf.MoveTowards(shake, 0f, dt * 1.5f);
        }
        cam.transform.SetPositionAndRotation(pos, rot);
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.2f, 0.72f, 0.42f, 0.97f);
    static readonly Color Dark = new Color(0.05f, 0.08f, 0.12f, 0.82f);
    static readonly Color Gold = new Color(1f, 0.78f, 0.2f, 0.97f);

    void OnGUI()
    {
        OiyoArcade.Begin();
        float w = OiyoArcade.W, h = OiyoArcade.H;
        if (state == GameState.Menu) { DrawMenu(w, h); return; }
        DrawHud(w, h);
        if (state == GameState.Ready)
        {
            var r = new Rect(w * 0.5f - 170f, h - 150f, 340f, 84f);
            OiyoArcade.Panel(r, Dark);
            OiyoArcade.Text(new Rect(r.x + 12f, r.y + 8f, r.width - 24f, r.height - 16f),
                $"<b>{U("Swipe or press an arrow key to start")}</b>\n<size=14>{GoalText()}</size>", 17, Color.white, TextAnchor.MiddleCenter);
        }
        if (state == GameState.Paused) DrawPause(w, h);
        if (state == GameState.Victory || state == GameState.GameOver) DrawResult(w, h);
    }

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + U(ZoneNames[stages[i].zone]);

    string GoalText()
    {
        string g = F("Eat {0} fruits", S.goal);
        if (S.timeLimit > 0f) g += " · " + F("within {0}s", Mathf.RoundToInt(S.timeLimit));
        return g;
    }

    void DrawHud(float w, float h)
    {
        var bar = new Rect(8f, 8f, w - 16f, 58f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 12f, w - 140f, 24f), "<b>" + StageTitle(stageIdx) + "</b>", 16, new Color(0.7f, 1f, 0.75f));
        string info = $"{U("Fruits")} <b>{eaten}/{S.goal}</b>   {U("Score")} <b>{score}</b>";
        if (S.timeLimit > 0f) info += $"   {U("Time")} <b><color={(timeLeft < 8f ? "#ff7b7b" : "#ffffff")}>{Mathf.CeilToInt(timeLeft)}s</color></b>";
        OiyoArcade.Text(new Rect(20f, 36f, w - 140f, 24f), info, 15, Color.white);
        if (OiyoArcade.Button(new Rect(w - 64f, 14f, 46f, 46f), "<b>II</b>", new Color(0.2f, 0.26f, 0.36f, 0.95f), 18))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) { showStages = false; state = GameState.Menu; }
        }
        OiyoArcade.Bar(new Rect(16f, 70f, w - 32f, 8f), eaten / (float)S.goal, new Color(0f, 0f, 0f, 0.35f), Gold);
        if (golden.x >= 0 && state == GameState.Playing)
            OiyoArcade.Shadowed(new Rect(0f, 84f, w, 24f), "★ " + U("Golden fruit! Grab it fast") + " ★", 15, Gold, TextAnchor.MiddleCenter);
    }

    void DrawMenu(float w, float h)
    {
        float cw = Mathf.Min(380f, w - 24f);
        if (showStages)
        {
            var box = new Rect(w * 0.5f - Mathf.Min(w - 16f, 760f) * 0.5f, 12f, Mathf.Min(w - 16f, 760f), h - 24f);
            OiyoArcade.Panel(box, new Color(0.04f, 0.07f, 0.1f, 0.93f));
            OiyoArcade.Text(new Rect(box.x + 16f, box.y + 12f, box.width - 120f, 30f), "<b>" + U("Choose a stage") + "</b>", 20, Color.white);
            OiyoArcade.Text(new Rect(box.x + 16f, box.y + 40f, box.width - 32f, 22f), $"★ {OiyoArcade.TotalStars(Slug, StageCount)}/{StageCount * 3}", 15, Gold);
            if (OiyoArcade.Button(new Rect(box.xMax - 100f, box.y + 12f, 86f, 40f), U("Back"), new Color(0.25f, 0.3f, 0.4f, 0.95f), 16)) showStages = false;
            int pick = OiyoArcade.StageGrid(new Rect(box.x + 14f, box.y + 70f, box.width - 28f, box.height - 84f), Slug, StageCount, Accent, U("Stage"));
            if (pick >= 0) LoadStage(pick);
            return;
        }
        var card = new Rect(w * 0.5f - cw * 0.5f, h * 0.5f - 170f, cw, 340f);
        OiyoArcade.Panel(card, Dark);
        OiyoArcade.Shadowed(new Rect(card.x, card.y + 18f, cw, 40f), U("Snake Garden 3D"), 30, new Color(0.7f, 1f, 0.7f), TextAnchor.MiddleCenter);
        OiyoArcade.Text(new Rect(card.x + 20f, card.y + 62f, cw - 40f, 46f), U("Eat fruit, grow longer, and never bite your own tail."), 15, new Color(1f, 1f, 1f, 0.85f), TextAnchor.MiddleCenter);
        OiyoArcade.Text(new Rect(card.x, card.y + 110f, cw, 24f), $"{StageTitle(stageIdx)}", 15, Gold, TextAnchor.MiddleCenter);
        if (OiyoArcade.Button(new Rect(card.x + 24f, card.y + 142f, cw - 48f, 58f), "<b>▶ " + F("Play stage {0}", stageIdx + 1) + "</b>", Accent, 21)) LoadStage(stageIdx);
        if (OiyoArcade.Button(new Rect(card.x + 24f, card.y + 210f, cw - 48f, 46f), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}", new Color(0.22f, 0.3f, 0.42f, 0.95f), 17)) showStages = true;
        if (OiyoArcade.Button(new Rect(card.x + 24f, card.y + 266f, cw - 48f, 46f), "Aa  " + OiyoArcade.Lang.ToUpperInvariant(), new Color(0.22f, 0.3f, 0.42f, 0.95f), 17)) OiyoArcade.NextLang();
    }

    void DrawPause(float w, float h)
    {
        float cw = Mathf.Min(340f, w - 24f);
        var card = new Rect(w * 0.5f - cw * 0.5f, h * 0.5f - 130f, cw, 260f);
        OiyoArcade.Panel(card, Dark);
        OiyoArcade.Shadowed(new Rect(card.x, card.y + 16f, cw, 36f), U("Paused"), 26, Color.white, TextAnchor.MiddleCenter);
        if (OiyoArcade.Button(new Rect(card.x + 24f, card.y + 70f, cw - 48f, 52f), "▶ " + U("Resume"), Accent, 19)) state = GameState.Playing;
        if (OiyoArcade.Button(new Rect(card.x + 24f, card.y + 132f, cw - 48f, 46f), U("Restart"), new Color(0.22f, 0.3f, 0.42f, 0.95f), 17)) LoadStage(stageIdx);
        if (OiyoArcade.Button(new Rect(card.x + 24f, card.y + 188f, cw - 48f, 46f), U("Stage list"), new Color(0.22f, 0.3f, 0.42f, 0.95f), 17)) { LoadStage(stageIdx, false); showStages = true; }
    }

    void DrawResult(float w, float h)
    {
        bool won = state == GameState.Victory;
        float cw = Mathf.Min(360f, w - 24f);
        // sized to its buttons so a loss card has no empty band at the bottom
        float ch = 140f + (won ? 58f : 0f) + 52f + 40f + 18f;
        var card = new Rect(w * 0.5f - cw * 0.5f, h * 0.5f - ch * 0.5f, cw, ch);
        OiyoArcade.Panel(card, Dark);
        OiyoArcade.Shadowed(new Rect(card.x, card.y + 14f, cw, 38f), won ? U("Stage clear!") : U("Game over"), 28, won ? new Color(0.6f, 1f, 0.65f) : new Color(1f, 0.55f, 0.5f), TextAnchor.MiddleCenter);
        string detail = won ? $"<size=30>{OiyoArcade.StarString(stars)}</size>" : endReason;
        OiyoArcade.Text(new Rect(card.x + 16f, card.y + 56f, cw - 32f, 44f), detail, 16, Color.white, TextAnchor.MiddleCenter);
        OiyoArcade.Text(new Rect(card.x + 16f, card.y + 102f, cw - 32f, 24f), $"{U("Score")} <b>{score}</b>   {U("Fruits")} <b>{eaten}/{S.goal}</b>", 16, Color.white, TextAnchor.MiddleCenter);
        float y = card.y + 140f;
        if (won && stageIdx < StageCount - 1)
        {
            if (OiyoArcade.Button(new Rect(card.x + 24f, y, cw - 48f, 50f), "<b>" + U("Next stage") + " ▶</b>", Accent, 19)) LoadStage(stageIdx + 1);
            y += 58f;
        }
        else if (won)
        {
            OiyoArcade.Text(new Rect(card.x, y, cw, 50f), "★ " + U("You cleared all 30 stages!") + " ★", 17, Gold, TextAnchor.MiddleCenter);
            y += 58f;
        }
        if (OiyoArcade.Button(new Rect(card.x + 24f, y, cw - 48f, 44f), U("Retry"), won ? new Color(0.22f, 0.3f, 0.42f, 0.95f) : Accent, 17)) LoadStage(stageIdx);
        y += 52f;
        if (OiyoArcade.Button(new Rect(card.x + 24f, y, cw - 48f, 40f), U("Stage list"), new Color(0.22f, 0.3f, 0.42f, 0.95f), 16)) { LoadStage(stageIdx, false); showStages = true; }
    }
}
