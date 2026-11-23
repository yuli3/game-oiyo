using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Animal Pop 3D: the web Animal Pop (src/components/games/AnimalPop.tsx, src/lib/games/animal-pop.ts)
// rebuilt in Unity. The board logic is the web's, line for line: a 7 x 7 board of seven animals
// dealt from the same xorshift generator, swaps that must make a three-in-a-row, cascades of up to
// 20 waves where new animals drop in from the seed, a reshuffle when no move is left, points =
// cleared x 10 x waves (doubled during fever), ten seconds of fever after a five-wave cascade, and
// +1 s for a match, +1 s for four or more cleared and +1 s for a cascade, on a 60 s clock that never
// goes above 60. The web's ten score milestones (1,000 to 100,000) are the ten stages: reach the
// target before the clock runs out. Stars: the target; 20 s or more left on the clock; 40 s or more.
public class AnimalPopPlayer : MonoBehaviour
{
    const string Slug = "animal-pop";
    const int StageCount = 10, N = 7, Kinds = 7;
    const float TimeLimit = 60f;
    static readonly int[] Targets = { 1000, 2000, 3500, 5000, 8000, 12000, 20000, 35000, 60000, 100000 };

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    static readonly Color[] KindColor = { new Color(0.78f, 0.52f, 0.32f), new Color(1f, 0.72f, 0.35f), new Color(1f, 0.62f, 0.72f), new Color(0.7f, 0.72f, 0.8f), new Color(0.95f, 0.95f, 0.98f), new Color(0.85f, 0.65f, 0.45f), new Color(1f, 0.88f, 0.3f) };

    int stageIdx;
    int[,] board = new int[N, N];
    uint seed;
    int score, starsWon, bestWave, swaps;
    float timeLeft, fever, secondT;
    bool busy;

    Camera cam;
    Transform root;
    readonly Transform[,] tiles = new Transform[N, N];
    readonly int[,] tileKind = new int[N, N];
    readonly List<Transform> pool = new List<Transform>();
    Material[] faceMats;
    Material[] bodyMats;
    Bursts bursts;
    Synth synth;
    bool showStages;
    int selR = -1, selC = -1;
    float popupT; string popup = "";

    int Target => Targets[stageIdx];

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        cam = new GameObject("Camera").AddComponent<Camera>();
        cam.fieldOfView = 35f;
        cam.clearFlags = CameraClearFlags.SolidColor;
        cam.backgroundColor = new Color(0.55f, 0.82f, 0.62f);
        var sun = new GameObject("Sun").AddComponent<Light>();
        sun.type = LightType.Directional; sun.intensity = 1f;
        sun.transform.rotation = Quaternion.Euler(30f, -20f, 0f);
        RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat;
        RenderSettings.ambientLight = new Color(0.62f, 0.62f, 0.66f);
        bursts = new Bursts(transform, 0.8f);
        synth = new Synth(gameObject);
        faceMats = new Material[Kinds]; bodyMats = new Material[Kinds];
        string[] art = { "AP/monkey", "AP/cat", "AP/pig", "AP/mouse", "AP/rabbit", "AP/dog", "AP/chick" };
        for (int k = 0; k < Kinds; k++)
        {
            faceMats[k] = OiyoArcade.Transparent(OiyoArcade.Art(art[k]), Color.white);
            bodyMats[k] = OiyoArcade.Lit(KindColor[k], 0.55f);
        }
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        LoadStage(stageIdx, false);
    }

    // ---------------- Board (the web's rules) ----------------
    static double Next(ref uint x)
    {
        x ^= x << 13; x ^= x >> 17; x ^= x << 5;
        return x / 4294967296.0;
    }
    static uint NextU(uint x) { x ^= x << 13; x ^= x >> 17; x ^= x << 5; return x; }

    static bool[,] Matches(int[,] b)
    {
        var m = new bool[N, N];
        for (int r = 0; r < N; r++)
            for (int c = 0; c < N; c++)
            {
                if (c == 0 || b[r, c - 1] != b[r, c])
                {
                    int n = 1; while (c + n < N && b[r, c + n] == b[r, c]) n++;
                    if (n >= 3) for (int i = 0; i < n; i++) m[r, c + i] = true;
                }
                if (r == 0 || b[r - 1, c] != b[r, c])
                {
                    int n = 1; while (r + n < N && b[r + n, c] == b[r, c]) n++;
                    if (n >= 3) for (int i = 0; i < n; i++) m[r + i, c] = true;
                }
            }
        return m;
    }
    static bool Any(bool[,] m) { foreach (var v in m) if (v) return true; return false; }

    struct Fall { public int kind, fromRow, toRow, col; public bool spawned; }

    static int[,] Collapse(int[,] b, bool[,] m, ref uint rng, List<Fall> falls)
    {
        var o = new int[N, N];
        for (int c = 0; c < N; c++)
        {
            var keepK = new List<int>(); var keepR = new List<int>();
            for (int r = N - 1; r >= 0; r--) if (!m[r, c]) { keepK.Add(b[r, c]); keepR.Add(r); }
            int spawnIndex = 0;
            for (int r = N - 1, i = 0; r >= 0; r--, i++)
            {
                if (i < keepK.Count)
                {
                    o[r, c] = keepK[i];
                    if (keepR[i] != r) falls?.Add(new Fall { kind = keepK[i], fromRow = keepR[i], toRow = r, col = c });
                }
                else
                {
                    rng = NextU(rng);
                    int k = Mathf.Min(Kinds - 1, (int)(rng / 4294967296.0 * Kinds));
                    o[r, c] = k;
                    falls?.Add(new Fall { kind = k, fromRow = -1 - spawnIndex++, toRow = r, col = c, spawned = true });
                }
            }
        }
        return o;
    }

    static bool HasMove(int[,] b)
    {
        var t = (int[,])b.Clone();
        for (int i = 0; i < N * N; i++)
            foreach (int j in new[] { i + 1, i + N })
            {
                if (j >= N * N || (j == i + 1 && i % N == N - 1)) continue;
                int ar = i / N, ac = i % N, br = j / N, bc = j % N;
                int a = t[ar, ac]; t[ar, ac] = t[br, bc]; t[br, bc] = a;
                bool ok = Any(Matches(t));
                a = t[ar, ac]; t[ar, ac] = t[br, bc]; t[br, bc] = a;
                if (ok) return true;
            }
        return false;
    }

    static int[,] Create(ref uint rng)
    {
        var b = new int[N, N];
        for (int r = 0; r < N; r++) for (int c = 0; c < N; c++) b[r, c] = Mathf.Min(Kinds - 1, (int)(Next(ref rng) * Kinds));
        for (int i = 0; i < 30 && Any(Matches(b)); i++) b = Collapse(b, Matches(b), ref rng, null);
        return b;
    }

    static int[,] Reshuffle(int[,] b, ref uint rng, out bool reshuffled)
    {
        reshuffled = false;
        if (HasMove(b)) return b;
        reshuffled = true;
        var tilesFlat = new int[N * N];
        for (int i = 0; i < N * N; i++) tilesFlat[i] = b[i / N, i % N];
        for (int attempt = 0; attempt < 60; attempt++)
        {
            for (int i = tilesFlat.Length - 1; i > 0; i--)
            {
                int j = (int)(Next(ref rng) * (i + 1));
                int t = tilesFlat[i]; tilesFlat[i] = tilesFlat[j]; tilesFlat[j] = t;
            }
            var dealt = new int[N, N];
            for (int i = 0; i < N * N; i++) dealt[i / N, i % N] = tilesFlat[i];
            if (!Any(Matches(dealt)) && HasMove(dealt)) return dealt;
        }
        if (rng == 0) rng = 1;
        var fresh = Create(ref rng);
        for (int attempt = 0; attempt < 20 && !HasMove(fresh); attempt++) { rng++; fresh = Create(ref rng); }
        return fresh;
    }

    // ---------------- Stage ----------------
    void LoadStage(int idx, bool ready = true)
    {
        stageIdx = Mathf.Clamp(idx, 0, StageCount - 1);
        StopAllCoroutines();
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Board").transform;
        pool.Clear();
        seed = (uint)(20261123 + stageIdx * 7919);
        board = Create(ref seed);
        board = Reshuffle(board, ref seed, out _);
        score = 0; starsWon = 0; bestWave = 0; swaps = 0;
        timeLeft = TimeLimit; fever = 0f; secondT = 0f; busy = false;
        selR = selC = -1; showStages = false; popupT = 0f;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        UpdateCamera();
    }

    Vector3 Cell(float r, float c) => new Vector3(c - (N - 1) * 0.5f, (N - 1) * 0.5f - r, 0f);

    void BuildScene()
    {
        var tray = OiyoArcade.Prim(PrimitiveType.Cube, "Tray", OiyoArcade.Lit(new Color(0.98f, 0.92f, 0.78f), 0.3f, OiyoArcade.Art("AP/wood", true)), root);
        tray.transform.position = new Vector3(0f, 0f, 0.55f);
        tray.transform.localScale = new Vector3(N + 0.6f, N + 0.6f, 0.5f);
        var rim = OiyoArcade.Prim(PrimitiveType.Cube, "Rim", OiyoArcade.Lit(new Color(0.55f, 0.36f, 0.22f), 0.3f), root);
        rim.transform.position = new Vector3(0f, 0f, 0.75f);
        rim.transform.localScale = new Vector3(N + 1.1f, N + 1.1f, 0.4f);
        for (int r = 0; r < N; r++)
            for (int c = 0; c < N; c++)
            {
                var slot = OiyoArcade.Prim(PrimitiveType.Quad, "Slot", OiyoArcade.Lit((r + c) % 2 == 0 ? new Color(0.93f, 0.86f, 0.7f) : new Color(0.88f, 0.8f, 0.64f), 0.1f), root);
                slot.transform.position = Cell(r, c) + new Vector3(0f, 0f, 0.29f);
                slot.transform.localScale = Vector3.one * 0.98f;
                slot.transform.rotation = Quaternion.identity;
                tiles[r, c] = MakeTile(board[r, c]);
                tiles[r, c].position = Cell(r, c);
                tileKind[r, c] = board[r, c];
            }
        // a few grass tufts and flowers around the tray
        var rs = new System.Random(stageIdx + 5);
        var leaf = OiyoArcade.Lit(new Color(0.25f, 0.6f, 0.3f), 0.2f);
        for (int i = 0; i < 26; i++)
        {
            float a = (float)rs.NextDouble() * Mathf.PI * 2f, d = 5.2f + (float)rs.NextDouble() * 3f;
            var tuft = OiyoArcade.Prim(PrimitiveType.Sphere, "Bush", i % 4 == 0 ? OiyoArcade.Lit(OiyoArcade.Hsv((float)rs.NextDouble(), 0.5f, 1f), 0.3f) : leaf, root);
            tuft.transform.position = new Vector3(Mathf.Cos(a) * d, Mathf.Sin(a) * d, 1f);
            tuft.transform.localScale = Vector3.one * (0.5f + (float)rs.NextDouble() * 0.7f);
        }
    }

    Transform MakeTile(int kind)
    {
        Transform t;
        if (pool.Count > 0) { t = pool[pool.Count - 1]; pool.RemoveAt(pool.Count - 1); t.gameObject.SetActive(true); }
        else
        {
            t = new GameObject("Tile").transform; t.SetParent(root, false);
            var body = OiyoArcade.Prim(PrimitiveType.Sphere, "Body", bodyMats[0], t);
            body.transform.localScale = new Vector3(0.88f, 0.88f, 0.5f);
            var face = OiyoArcade.Prim(PrimitiveType.Quad, "Face", faceMats[0], t);
            face.transform.localPosition = new Vector3(0f, 0f, -0.26f);
            face.transform.localScale = Vector3.one * 0.86f;
        }
        SetKind(t, kind);
        t.localScale = Vector3.one;
        return t;
    }

    void SetKind(Transform t, int kind)
    {
        t.GetChild(0).GetComponent<Renderer>().sharedMaterial = bodyMats[kind];
        t.GetChild(1).GetComponent<Renderer>().sharedMaterial = faceMats[kind];
    }

    void Recycle(Transform t) { t.gameObject.SetActive(false); pool.Add(t); }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("animal-pop", state, score);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        if (state == GameState.Playing)
        {
            timeLeft = Mathf.Max(0f, timeLeft - dt);
            secondT += dt;
            while (secondT >= 1f) { secondT -= 1f; fever = Mathf.Max(0f, fever - 1f); }
            if (timeLeft <= 0f && !busy) End();
        }
        popupT = Mathf.Max(0f, popupT - dt);
        // ease tiles into their cells
        for (int r = 0; r < N; r++)
            for (int c = 0; c < N; c++)
            {
                var t = tiles[r, c]; if (t == null) continue;
                var target = Cell(r, c);
                if (r == selR && c == selC) target += new Vector3(0f, 0f, -0.25f);
                t.position = Vector3.MoveTowards(t.position, target, dt * 14f);
                float wob = (r == selR && c == selC) ? 1.08f + Mathf.Sin(Time.time * 10f) * 0.04f : 1f;
                t.localScale = Vector3.Lerp(t.localScale, Vector3.one * wob, dt * 12f);
                if (fever > 0f && state == GameState.Playing) t.localRotation = Quaternion.Euler(0f, 0f, Mathf.Sin(Time.time * 8f + r + c) * 6f);
                else t.localRotation = Quaternion.identity;
            }
        cam.backgroundColor = Color.Lerp(cam.backgroundColor, fever > 0f ? new Color(1f, 0.72f, 0.45f) : new Color(0.55f, 0.82f, 0.62f), dt * 3f);
        UpdateCamera();
    }

    int dragId = int.MinValue, dragR, dragC; Vector2 dragStart; bool dragDone;

    void ReadInput()
    {
        bool confirm = Input.GetKeyDown(KeyCode.Return);
        switch (state)
        {
            case GameState.Ready:
            case GameState.Playing:
                {
                    if (state == GameState.Playing && (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P))) { state = GameState.Paused; return; }
                    var began = OiyoArcade.Began();
                    if (state == GameState.Ready && (began.Count > 0 || Input.anyKeyDown)) state = GameState.Playing;
                    foreach (var b in began)
                    {
                        if (!PickCell(b.pos, out int r, out int c)) { selR = selC = -1; continue; }
                        dragId = b.id; dragR = r; dragC = c; dragStart = b.pos; dragDone = false;
                        if (selR >= 0 && Mathf.Abs(selR - r) + Mathf.Abs(selC - c) == 1) { TrySwap(selR, selC, r, c); selR = selC = -1; dragDone = true; }
                        else if (selR == r && selC == c) { selR = selC = -1; dragDone = true; }
                        else { selR = r; selC = c; synth.Tone(880f, 0.04f, Wave.Sine, 0.08f, 0f, 30f); }
                    }
                    if (dragId != int.MinValue && !dragDone)
                    {
                        bool held = false;
                        foreach (var h in OiyoArcade.Held())
                        {
                            if (h.id != dragId) continue;
                            held = true;
                            var d = (h.pos - dragStart) / OiyoArcade.ComputeScale();
                            if (d.magnitude > 22f)
                            {
                                int dr = 0, dc = 0;
                                if (Mathf.Abs(d.x) > Mathf.Abs(d.y)) dc = d.x > 0 ? 1 : -1; else dr = d.y > 0 ? -1 : 1;
                                int r2 = dragR + dr, c2 = dragC + dc;
                                if (r2 >= 0 && r2 < N && c2 >= 0 && c2 < N) TrySwap(dragR, dragC, r2, c2);
                                selR = selC = -1; dragDone = true;
                            }
                        }
                        if (!held) dragId = int.MinValue;
                    }
                    return;
                }
            case GameState.Paused:
                if (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P)) state = GameState.Playing;
                return;
            case GameState.Victory:
            case GameState.GameOver:
                if (confirm) LoadStage(state == GameState.Victory ? Mathf.Min(stageIdx + 1, StageCount - 1) : stageIdx);
                return;
            case GameState.Menu:
                if (!showStages && (confirm || Input.GetKeyDown(KeyCode.Space))) LoadStage(stageIdx);
                return;
        }
    }

    bool PickCell(Vector2 screen, out int r, out int c)
    {
        r = c = -1;
        var ray = cam.ScreenPointToRay(screen);
        if (Mathf.Abs(ray.direction.z) < 1e-4f) return false;
        float t = (0f - ray.origin.z) / ray.direction.z;
        var p = ray.origin + ray.direction * t;
        c = Mathf.RoundToInt(p.x + (N - 1) * 0.5f);
        r = Mathf.RoundToInt((N - 1) * 0.5f - p.y);
        return r >= 0 && r < N && c >= 0 && c < N;
    }

    void TrySwap(int r1, int c1, int r2, int c2)
    {
        if (busy || state != GameState.Playing || timeLeft <= 0f) return;
        var cur = (int[,])board.Clone();
        int a = cur[r1, c1]; cur[r1, c1] = cur[r2, c2]; cur[r2, c2] = a;
        if (!Any(Matches(cur)))
        {
            StartCoroutine(Nope(r1, c1, r2, c2));
            return;
        }
        swaps++;
        // swap the tile objects so they slide past each other
        var t = tiles[r1, c1]; tiles[r1, c1] = tiles[r2, c2]; tiles[r2, c2] = t;
        int k = tileKind[r1, c1]; tileKind[r1, c1] = tileKind[r2, c2]; tileKind[r2, c2] = k;
        StartCoroutine(Resolve(cur));
    }

    IEnumerator Nope(int r1, int c1, int r2, int c2)
    {
        busy = true;
        synth.Tone(180f, 0.12f, Wave.Square, 0.08f, 140f, 12f);
        var a = tiles[r1, c1]; var b = tiles[r2, c2];
        var pa = Cell(r1, c1); var pb = Cell(r2, c2);
        for (float t = 0f; t < 0.16f; t += Time.deltaTime) { a.position = Vector3.Lerp(pa, pb, t / 0.16f * 0.45f); b.position = Vector3.Lerp(pb, pa, t / 0.16f * 0.45f); yield return null; }
        busy = false;
    }

    IEnumerator Resolve(int[,] cur)
    {
        busy = true;
        yield return new WaitForSeconds(0.14f);
        int cleared = 0, waves = 0;
        while (waves < 20)
        {
            var m = Matches(cur);
            if (!Any(m)) break;
            waves++;
            int n = 0;
            for (int r = 0; r < N; r++)
                for (int c = 0; c < N; c++)
                    if (m[r, c])
                    {
                        n++;
                        bursts.Emit(Cell(r, c) + new Vector3(0f, 0f, -0.4f), KindColor[cur[r, c]], 6, 3.5f, 0.22f, 0.45f);
                        Recycle(tiles[r, c]); tiles[r, c] = null;
                    }
            cleared += n;
            synth.Tone(520f + waves * 110f, 0.12f, Wave.Triangle, 0.16f, 760f + waves * 110f, 9f);
            var falls = new List<Fall>();
            var next = Collapse(cur, m, ref seed, falls);
            // move surviving tiles down; drop new ones in from above the board
            var newTiles = new Transform[N, N];
            var leaving = new bool[N, N];
            foreach (var f in falls) if (!f.spawned) leaving[f.fromRow, f.col] = true;
            for (int r = 0; r < N; r++) for (int c = 0; c < N; c++) if (!m[r, c] && !leaving[r, c]) newTiles[r, c] = tiles[r, c];
            foreach (var f in falls)
            {
                if (f.spawned) { var t = MakeTile(f.kind); t.position = Cell(f.fromRow, f.col); newTiles[f.toRow, f.col] = t; }
                else newTiles[f.toRow, f.col] = tiles[f.fromRow, f.col];
            }
            for (int r = 0; r < N; r++) for (int c = 0; c < N; c++) { tiles[r, c] = newTiles[r, c]; tileKind[r, c] = next[r, c]; }
            cur = next;
            yield return new WaitForSeconds(0.24f);
        }
        // score and time as on the web
        if (waves >= 5) { fever = 10f; Popup(U("FEVER! Double score")); StartCoroutine(Arp(new[] { 784f, 988f, 1175f, 1568f }, 0.06f)); }
        int pts = cleared * 10 * waves * (fever > 0f ? 2 : 1);
        score += pts;
        bestWave = Mathf.Max(bestWave, waves);
        int bonus = cleared >= 3 && waves >= 1 ? 1 + (cleared >= 4 ? 1 : 0) + (waves >= 2 ? 1 : 0) : 0;
        timeLeft = Mathf.Min(TimeLimit, timeLeft + bonus);
        if (waves >= 2 && waves < 5) Popup(F("{0} chain!", waves) + $"  +{pts}");
        else if (waves < 5) Popup($"+{pts}");
        cur = Reshuffle(cur, ref seed, out bool reshuffled);
        if (reshuffled)
        {
            Popup(U("No moves left: shuffling"));
            for (int r = 0; r < N; r++)
                for (int c = 0; c < N; c++)
                {
                    if (tiles[r, c] == null) tiles[r, c] = MakeTile(cur[r, c]);
                    SetKind(tiles[r, c], cur[r, c]); tileKind[r, c] = cur[r, c];
                    tiles[r, c].position = Cell(r, c) + new Vector3(0f, 0f, -1.5f);
                }
        }
        board = cur;
        busy = false;
        if (score >= Target || timeLeft <= 0f) End();
    }

    void Popup(string s) { popup = s; popupT = 1.4f; }

    void End()
    {
        if (state != GameState.Playing) return;
        if (score >= Target)
        {
            // the stage clears the moment the goal is reached; the time still on the clock earns the stars
            starsWon = 1 + (timeLeft >= 20f ? 1 : 0) + (timeLeft >= 40f ? 1 : 0);
            state = GameState.Victory;
            OiyoArcade.Record(Slug, stageIdx, starsWon, score, StageCount);
            StartCoroutine(Arp(new[] { 523f, 659f, 784f, 1047f, 1319f }, 0.09f));
        }
        else
        {
            state = GameState.GameOver;
            synth.Tone(220f, 0.6f, Wave.Triangle, 0.2f, 110f, 3f);
        }
    }

    IEnumerator Arp(float[] fs, float gap)
    {
        foreach (var f in fs) { synth.Tone(f, 0.18f, Wave.Triangle, 0.22f, 0f, 6f); yield return new WaitForSeconds(gap); }
    }

    void UpdateCamera()
    {
        bool portrait = cam.aspect < 1f;
        // fit the tray (8.2 units) with room for the HUD on top
        float needW = 8.6f, needH = 8.6f + (portrait ? 5f : 3.6f);
        float halfV = cam.fieldOfView * 0.5f * Mathf.Deg2Rad;
        float distH = needH * 0.5f / Mathf.Tan(halfV);
        float distW = needW * 0.5f / (Mathf.Tan(halfV) * cam.aspect);
        float dist = Mathf.Max(distH, distW);
        cam.transform.position = new Vector3(0f, portrait ? 1.2f : 0.9f, -dist);
        cam.transform.rotation = Quaternion.LookRotation(new Vector3(0f, 0.55f, 0f) - cam.transform.position);
    }

    // ?oiyotest=1 prints the run state to the browser console for the automated play check.
    bool testLog; float testT;
    void TestTick(float dt)
    {
        if (!testLog || (testT -= dt) > 0f) return;
        testT = 0.2f;
        Debug.Log("OIYOTEST " + TestState());
    }
    string TestState() { var sb = new System.Text.StringBuilder(); for (int r = 0; r < N; r++) for (int c = 0; c < N; c++) sb.Append(board[r, c]); var a = cam.WorldToScreenPoint(Cell(0, 0)); var z = cam.WorldToScreenPoint(Cell(N - 1, N - 1)); return $"{{\"s\":\"{state}\",\"score\":{score},\"t\":{timeLeft:F1},\"busy\":{(busy ? 1 : 0)},\"b\":\"{sb}\",\"c0\":[{a.x:F0},{a.y:F0}],\"c6\":[{z.x:F0},{z.y:F0}],\"sw\":{Screen.width},\"sh\":{Screen.height}}}"; }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(1f, 0.45f, 0.4f, 0.97f);
    static readonly Color Dark = new Color(0.12f, 0.08f, 0.06f, 0.82f);
    static readonly Color Gold = new Color(1f, 0.82f, 0.25f, 0.97f);
    static readonly Color Slate = new Color(0.3f, 0.22f, 0.18f, 0.95f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("Goal {0}", Targets[i].ToString("N0"));

    void OnGUI()
    {
        OiyoArcade.Begin();
        float w = OiyoArcade.W, h = OiyoArcade.H;
        if (state == GameState.Menu) { DrawMenu(w, h); return; }
        var bar = new Rect(8f, 8f, w - 16f, 78f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 12f, w - 140f, 22f), "<b>" + StageTitle(stageIdx) + "</b>", 15, new Color(1f, 0.92f, 0.8f));
        string fv = fever > 0f ? $"   <color=#ffb347><b>{U("FEVER")} {Mathf.CeilToInt(fever)}</b></color>" : "";
        OiyoArcade.Text(new Rect(20f, 34f, w - 90f, 24f), $"{U("Score")} <b>{score:N0}</b>   ⏱ <b>{Mathf.CeilToInt(timeLeft)}</b>{fv}", 16, Color.white);
        OiyoArcade.Bar(new Rect(20f, 62f, w - 96f, 9f), score / (float)Target, new Color(0f, 0f, 0f, 0.45f), score >= Target ? new Color(0.5f, 1f, 0.5f) : Gold);
        OiyoArcade.Bar(new Rect(20f, 73f, w - 96f, 4f), timeLeft / TimeLimit, new Color(0f, 0f, 0f, 0.35f), timeLeft < 10f ? new Color(1f, 0.4f, 0.35f) : new Color(0.55f, 0.85f, 1f));
        if (OiyoArcade.Button(new Rect(w - 64f, 14f, 46f, 46f), "<b>II</b>", Slate, 18))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (popupT > 0f) OiyoArcade.Shadowed(new Rect(0f, 96f, w, 34f), popup, 22, fever > 0f ? new Color(1f, 0.6f, 0.2f) : Gold, TextAnchor.MiddleCenter);
        if (state == GameState.Ready)
        {
            var r = new Rect(w * 0.5f - 170f, h - 150f, 340f, 100f);
            OiyoArcade.Panel(r, Dark);
            OiyoArcade.Text(new Rect(r.x + 12f, r.y + 8f, r.width - 24f, r.height - 16f),
                $"<b>{F("Reach {0} points in 60 seconds", Target.ToString("N0"))}</b>\n<size=14>{U("Swipe an animal, or tap two neighbours, to line up three. Five-wave chains start a fever.")}</size>", 16, Color.white, TextAnchor.MiddleCenter);
        }
        if (state == GameState.Paused) DrawPause(w, h);
        if (state == GameState.Victory || state == GameState.GameOver) DrawResult(w, h);
    }

    void DrawMenu(float w, float h)
    {
        if (showStages)
        {
            float bw = Mathf.Min(w - 16f, 760f);
            var box = new Rect(w * 0.5f - bw * 0.5f, 12f, bw, Mathf.Min(h - 24f, 360f));
            OiyoArcade.Panel(box, new Color(0.12f, 0.08f, 0.06f, 0.94f));
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
        OiyoArcade.Shadowed(new Rect(card.x, card.y + 18f, cw, 40f), U("Animal Pop 3D"), 30, new Color(1f, 0.9f, 0.6f), TextAnchor.MiddleCenter);
        OiyoArcade.Text(new Rect(card.x + 20f, card.y + 62f, cw - 40f, 46f), U("Line up three animals, chain the cascades and race the 60-second clock to each goal."), 15, new Color(1f, 1f, 1f, 0.88f), TextAnchor.MiddleCenter);
        OiyoArcade.Text(new Rect(card.x, card.y + 110f, cw, 24f), StageTitle(stageIdx), 15, Gold, TextAnchor.MiddleCenter);
        if (OiyoArcade.Button(new Rect(card.x + 24f, card.y + 142f, cw - 48f, 58f), "<b>▶ " + F("Play stage {0}", stageIdx + 1) + "</b>", Accent, 21)) LoadStage(stageIdx);
        if (OiyoArcade.Button(new Rect(card.x + 24f, card.y + 210f, cw - 48f, 46f), U("All 10 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}", Slate, 17)) showStages = true;
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
        bool won = state == GameState.Victory;
        float cw = Mathf.Min(360f, w - 24f);
        float ch = 158f + (won ? 58f : 0f) + 52f + 40f + 18f;
        var card = new Rect(w * 0.5f - cw * 0.5f, h * 0.5f - ch * 0.5f, cw, ch);
        OiyoArcade.Panel(card, Dark);
        OiyoArcade.Shadowed(new Rect(card.x, card.y + 14f, cw, 38f), won ? U("Goal reached!") : U("Time's up!"), 28, won ? new Color(0.6f, 1f, 0.65f) : new Color(1f, 0.6f, 0.5f), TextAnchor.MiddleCenter);
        string detail = won ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : F("{0} more points needed", (Target - score).ToString("N0"));
        OiyoArcade.Text(new Rect(card.x + 16f, card.y + 56f, cw - 32f, 44f), detail, 16, Color.white, TextAnchor.MiddleCenter);
        OiyoArcade.Text(new Rect(card.x + 16f, card.y + 100f, cw - 32f, 52f),
            $"{U("Score")} <b>{score:N0}</b> / {Target:N0}\n<size=14>{F("{0} s left", Mathf.CeilToInt(timeLeft))} · {F("Longest chain {0}", bestWave)} · {F("{0} swaps", swaps)}</size>", 16, Color.white, TextAnchor.MiddleCenter);
        float y = card.y + 158f;
        if (won && stageIdx < StageCount - 1)
        {
            if (OiyoArcade.Button(new Rect(card.x + 24f, y, cw - 48f, 50f), "<b>" + U("Next stage") + " ▶</b>", Accent, 19)) LoadStage(stageIdx + 1);
            y += 58f;
        }
        else if (won)
        {
            OiyoArcade.Text(new Rect(card.x, y, cw, 50f), "★ " + U("You cleared all 10 stages!") + " ★", 17, Gold, TextAnchor.MiddleCenter);
            y += 58f;
        }
        if (OiyoArcade.Button(new Rect(card.x + 24f, y, cw - 48f, 44f), U("Retry"), won ? Slate : Accent, 17)) LoadStage(stageIdx);
        y += 52f;
        if (OiyoArcade.Button(new Rect(card.x + 24f, y, cw - 48f, 40f), U("Stage list"), Slate, 16)) { LoadStage(stageIdx, false); showStages = true; }
    }
}
