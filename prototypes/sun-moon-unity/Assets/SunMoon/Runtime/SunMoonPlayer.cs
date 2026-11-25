using System.Collections;
using UnityEngine;

// Sun & Moon 3D: the web Sun & Moon (src/components/games/SunMoon.tsx, src/lib/games/sun-moon.ts) rebuilt in Unity on
// the web's own 360 × 560 px field (OiyoField). Fill the grid with suns and moons: as many of each in every row and
// column, never three alike in a line, and the = and × marks between squares kept. Tap a square to cycle it: sun,
// moon, empty. The 30 grids are the web's own (SunMoonStages.cs).
public class SunMoonPlayer : MonoBehaviour
{
    const string Slug = "sun-moon";
    const int StageCount = 30;
    const int SUN = 1, MOON = 2;
    const float Top = 110f;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of sun-moon.ts) ----------------
    SunMoonStages.Level st;
    int n, stageIdx, starsWon, taps;
    int[] cells;
    bool[] fixedCell;
    bool over, won;

    int Partner(int k) => st.clues[3 * k + 1] == 0 ? st.clues[3 * k] + 1 : st.clues[3 * k] + n;

    bool Valid()
    {
        foreach (int v in cells) if (v == 0) return false;
        for (int k = 0; k < n; k++)
        {
            int rs = 0, cs = 0;
            for (int j = 0; j < n; j++)
            {
                if (cells[k * n + j] == SUN) rs++;
                if (cells[j * n + k] == SUN) cs++;
                if (j >= 2)
                {
                    if (cells[k * n + j] == cells[k * n + j - 1] && cells[k * n + j] == cells[k * n + j - 2]) return false;
                    if (cells[j * n + k] == cells[(j - 1) * n + k] && cells[j * n + k] == cells[(j - 2) * n + k]) return false;
                }
            }
            if (rs * 2 != n || cs * 2 != n) return false;
        }
        for (int k = 0; k < st.clues.Length / 3; k++)
            if ((cells[st.clues[3 * k]] == cells[Partner(k)]) != (st.clues[3 * k + 2] == 1)) return false;
        return true;
    }

    void Tap(int i)
    {
        if (over || i < 0 || i >= cells.Length || fixedCell[i]) return;
        cells[i] = (cells[i] + 1) % 3;
        taps++;
        if (Valid()) { over = true; won = true; }
        else if (taps >= st.limit) over = true;
    }

    int StarsFor()
    {
        if (!won) return 0;
        if (taps <= st.par) return 3;
        if (taps <= st.par + 6) return 2;
        return 1;
    }

    /** Squares that break a rule as they stand: three alike in a line, too many of one in a line, or a broken mark. */
    bool[] Clashes()
    {
        var bad = new bool[cells.Length];
        for (int k = 0; k < n; k++)
        {
            for (int pass = 0; pass < 2; pass++)
            {
                int Idx(int j) => pass == 0 ? k * n + j : j * n + k;
                int suns = 0, moons = 0;
                for (int j = 0; j < n; j++) { if (cells[Idx(j)] == SUN) suns++; else if (cells[Idx(j)] == MOON) moons++; }
                for (int j = 0; j < n; j++)
                {
                    int v = cells[Idx(j)];
                    if (v == 0) continue;
                    if ((v == SUN ? suns : moons) * 2 > n) bad[Idx(j)] = true;
                    if (j >= 2 && v == cells[Idx(j - 1)] && v == cells[Idx(j - 2)]) bad[Idx(j)] = bad[Idx(j - 1)] = bad[Idx(j - 2)] = true;
                }
            }
        }
        for (int k = 0; k < st.clues.Length / 3; k++)
        {
            int a = st.clues[3 * k], b = Partner(k);
            if (cells[a] == 0 || cells[b] == 0) continue;
            if ((cells[a] == cells[b]) != (st.clues[3 * k + 2] == 1)) bad[a] = bad[b] = true;
        }
        return bad;
    }

    // ---------------- Scene ----------------
    OiyoField field;
    Camera cam;
    Transform root, cursorObj;
    Transform[] sunObj, moonObj, tileObj;
    Renderer[] tileRen;
    float[] pop;
    Material tileMat, fixedMat, badMat;
    Bursts sparkle;
    Synth synth;
    bool showStages, keyed;
    int cursor;
    float cell, ox, oy;

    Vector2 Centre(int i) => new Vector2(ox + (i % n + 0.5f) * cell, oy + (i / n + 0.5f) * cell);

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(360f, 560f, new Color(0.16f, 0.18f, 0.36f));
        cam = field.Cam;
        OiyoField.Lights(new Color(0.7f, 0.7f, 0.78f), 0.75f, 50f, -25f);
        sparkle = new Bursts(transform, 0.5f);
        synth = new Synth(gameObject);
        tileMat = OiyoArcade.Lit(new Color(0.93f, 0.9f, 0.98f), 0.15f);
        fixedMat = OiyoArcade.Lit(new Color(0.78f, 0.75f, 0.9f), 0.1f);
        badMat = OiyoArcade.Lit(new Color(1f, 0.66f, 0.66f), 0.15f);
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int i, bool ready = true)
    {
        stageIdx = Mathf.Clamp(i, 0, StageCount - 1);
        StopAllCoroutines();
        st = SunMoonStages.All[stageIdx];
        n = st.n;
        cells = new int[n * n];
        fixedCell = new bool[n * n];
        foreach (int g in st.given) { cells[g] = st.answer[g]; fixedCell[g] = true; }
        taps = 0; over = false; won = false; starsWon = 0; keyed = false; planAt = 0;
        cursor = 0;
        while (cursor < cells.Length - 1 && fixedCell[cursor]) cursor++;
        pop = new float[cells.Length];
        cell = Mathf.Floor(Mathf.Min(64f, 320f / n));
        ox = Mathf.Round((360f - n * cell) / 2f);
        oy = Top + Mathf.Round((360f - n * cell) / 2f);
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Sky").transform;
        showStages = false;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Animate(0f);
    }

    Transform Box(Transform parent, string name, Material m, float x, float y, float w, float h, float z, float d)
    {
        var o = OiyoArcade.Prim(PrimitiveType.Cube, name, m, parent).transform;
        o.localScale = new Vector3(OiyoField.U(w), OiyoField.U(h), d);
        o.position = field.W(x, y, z);
        return o;
    }

    void BuildScene()
    {
        Box(root, "Night", OiyoArcade.Lit(new Color(0.16f, 0.18f, 0.36f), 0.05f), 180f, 280f, 1200f, 1600f, 0.6f, 0.2f);
        // a few far stars
        var starMat = OiyoArcade.Glow(new Color(1f, 0.95f, 0.75f));
        var rng = OiyoField.Mulberry((uint)(stageIdx * 97 + 11));
        for (int k = 0; k < 24; k++)
        {
            float sx = (float)rng() * 360f, sy = 70f + (float)rng() * 480f;
            if (sx > ox - 8f && sx < ox + n * cell + 8f && sy > oy - 8f && sy < oy + n * cell + 8f) continue;
            Box(root, "Star", starMat, sx, sy, 3f, 3f, 0.4f, 0.02f);
        }
        Box(root, "Frame", OiyoArcade.Lit(new Color(0.42f, 0.36f, 0.7f), 0.3f), ox + n * cell / 2f, oy + n * cell / 2f, n * cell + 12f, n * cell + 12f, 0.25f, 0.4f);
        var sunMat = OiyoArcade.LitGlow(new Color(1f, 0.72f, 0.2f), new Color(0.5f, 0.28f, 0f), 0.5f);
        var rayMat = OiyoArcade.Glow(new Color(1f, 0.85f, 0.35f));
        var moonMat = OiyoArcade.LitGlow(new Color(0.36f, 0.45f, 0.95f), new Color(0.08f, 0.1f, 0.35f), 0.5f);
        sunObj = new Transform[cells.Length];
        moonObj = new Transform[cells.Length];
        tileObj = new Transform[cells.Length];
        tileRen = new Renderer[cells.Length];
        for (int i = 0; i < cells.Length; i++)
        {
            var c = Centre(i);
            tileObj[i] = Box(root, "Tile", fixedCell[i] ? fixedMat : tileMat, c.x, c.y, cell - 4f, cell - 4f, 0.05f, OiyoField.U(fixedCell[i] ? 4f : 8f));
            tileRen[i] = tileObj[i].GetComponent<Renderer>();
            // the sun: a glowing ball with four little rays
            var s = new GameObject("Sun").transform;
            s.SetParent(root, false);
            s.position = field.W(c.x, c.y, -0.15f);
            var ball = OiyoArcade.Prim(PrimitiveType.Sphere, "Ball", sunMat, s).transform;
            ball.localScale = Vector3.one * OiyoField.U(cell * 0.46f);
            for (int r = 0; r < 4; r++)
            {
                var ray = OiyoArcade.Prim(PrimitiveType.Cube, "Ray", rayMat, s).transform;
                ray.localScale = new Vector3(OiyoField.U(cell * 0.72f), OiyoField.U(Mathf.Max(2f, cell * 0.06f)), OiyoField.U(2f));
                ray.localRotation = Quaternion.Euler(0f, 0f, 45f * r);
            }
            sunObj[i] = s;
            // the moon: a pale ball with a bite taken out by a tile-coloured one in front
            var m = new GameObject("Moon").transform;
            m.SetParent(root, false);
            m.position = field.W(c.x, c.y, -0.15f);
            var disc = OiyoArcade.Prim(PrimitiveType.Sphere, "Disc", moonMat, m).transform;
            disc.localScale = new Vector3(OiyoField.U(cell * 0.56f), OiyoField.U(cell * 0.56f), OiyoField.U(cell * 0.2f));
            var bite = OiyoArcade.Prim(PrimitiveType.Sphere, "Bite", fixedCell[i] ? fixedMat : tileMat, m).transform;
            bite.localScale = new Vector3(OiyoField.U(cell * 0.46f), OiyoField.U(cell * 0.46f), OiyoField.U(cell * 0.2f));
            bite.localPosition = new Vector3(OiyoField.U(cell * 0.16f), OiyoField.U(cell * 0.1f), -OiyoField.U(cell * 0.06f));
            moonObj[i] = m;
        }
        // the = and × marks sit on the line between the two squares
        var markMat = OiyoArcade.Glow(new Color(0.2f, 0.16f, 0.4f));
        var markBack = OiyoArcade.Lit(new Color(1f, 0.98f, 0.9f), 0.2f);
        for (int k = 0; k < st.clues.Length / 3; k++)
        {
            Vector2 a = Centre(st.clues[3 * k]), b = Centre(Partner(k)), mid = (a + b) / 2f;
            float sz = Mathf.Max(14f, cell * 0.34f);
            Box(root, "Mark", markBack, mid.x, mid.y, sz, sz, -0.3f, OiyoField.U(4f)).rotation = Quaternion.Euler(0f, 0f, 45f);
            bool same = st.clues[3 * k + 2] == 1;
            for (int j = 0; j < 2; j++)
            {
                var bar = Box(root, "Bar", markMat, mid.x, mid.y + (same ? (j == 0 ? -3f : 3f) : 0f), sz * 0.6f, 2.5f, -0.4f, OiyoField.U(2f));
                if (!same) bar.rotation = Quaternion.Euler(0f, 0f, j == 0 ? 45f : -45f);
            }
        }
        cursorObj = Box(root, "Cursor", OiyoArcade.Glow(new Color(1f, 0.85f, 0.3f)), 0f, 0f, cell - 6f, 4f, -0.6f, 0.02f);
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("sun-moon", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        Animate(dt);
    }

    void Press(int i)
    {
        if (state != GameState.Playing || over || fixedCell[i]) return;
        pop[i] = 1f;
        Tap(i);
        if (planAt < st.plan.Length && st.plan[planAt] == i) planAt++;
        synth.Tone(cells[i] == SUN ? 784f : cells[i] == MOON ? 523f : 330f, 0.06f, Wave.Triangle, 0.1f);
        if (over) End();
    }

    void ReadInput()
    {
        bool confirm = Input.GetKeyDown(KeyCode.Return);
        switch (state)
        {
            case GameState.Ready:
            case GameState.Playing:
                {
                    if (state == GameState.Playing && (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P))) { state = GameState.Paused; return; }
                    // input is read once per frame: a tap on a square cycles it
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (state == GameState.Ready) { state = GameState.Playing; continue; }
                        if (!field.ToField(b.pos, out Vector2 f)) continue;
                        int c = Mathf.FloorToInt((f.x - ox) / cell), r = Mathf.FloorToInt((f.y - oy) / cell);
                        if (c >= 0 && c < n && r >= 0 && r < n) { cursor = r * n + c; Press(cursor); }
                    }
                    int r0 = cursor / n, c0 = cursor % n;
                    bool moved = true;
                    if (Input.GetKeyDown(KeyCode.UpArrow)) cursor = Mathf.Max(0, r0 - 1) * n + c0;
                    else if (Input.GetKeyDown(KeyCode.DownArrow)) cursor = Mathf.Min(n - 1, r0 + 1) * n + c0;
                    else if (Input.GetKeyDown(KeyCode.LeftArrow)) cursor = r0 * n + Mathf.Max(0, c0 - 1);
                    else if (Input.GetKeyDown(KeyCode.RightArrow)) cursor = r0 * n + Mathf.Min(n - 1, c0 + 1);
                    else moved = false;
                    if (moved) { keyed = true; if (state == GameState.Ready) state = GameState.Playing; }
                    if (Input.GetKeyDown(KeyCode.Space) || confirm)
                    {
                        if (state == GameState.Ready) state = GameState.Playing;
                        else { keyed = true; Press(cursor); }
                    }
                    return;
                }
            case GameState.Paused:
                if (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P)) state = GameState.Playing;
                return;
            case GameState.Victory:
            case GameState.GameOver:
                if (confirm && ResultLive) LoadStage(won ? Mathf.Min(stageIdx + 1, StageCount - 1) : stageIdx);
                return;
            case GameState.Menu:
                if (!showStages && confirm) LoadStage(stageIdx);
                return;
        }
    }

    float endTime;
    bool ResultLive => Time.unscaledTime - endTime > 0.45f;

    void End()
    {
        if (state != GameState.Playing) return;
        endTime = Time.unscaledTime;
        starsWon = StarsFor();
        if (won)
        {
            state = GameState.Victory;
            OiyoArcade.Record(Slug, stageIdx, starsWon, Mathf.Max(0, (st.limit - taps) * 10), StageCount);
            sparkle.Emit(field.W(180f, 290f, -1f), new Color(1f, 0.8f, 0.3f), 40, 4f, 0.1f, 1f);
            StartCoroutine(Arp(new[] { 523f, 659f, 784f, 1047f }, 0.1f));
        }
        else
        {
            state = GameState.GameOver;
            StartCoroutine(Arp(new[] { 392f, 330f, 262f }, 0.14f));
        }
    }

    IEnumerator Arp(float[] fs, float gap)
    {
        foreach (var f in fs) { synth.Tone(f, 0.18f, Wave.Triangle, 0.22f, 0f, 6f); yield return new WaitForSeconds(gap); }
    }

    void Animate(float dt)
    {
        if (root == null) return;
        field.Fit(56f, 10f, 0f, oy - 30f, oy + n * cell + 20f);
        var bad = Clashes();
        float spin = Time.time * 30f;
        for (int i = 0; i < cells.Length; i++)
        {
            pop[i] = Mathf.Max(0f, pop[i] - dt * 6f);
            float s = 1f + pop[i] * 0.25f;
            sunObj[i].gameObject.SetActive(cells[i] == SUN);
            moonObj[i].gameObject.SetActive(cells[i] == MOON);
            sunObj[i].localScale = Vector3.one * s;
            sunObj[i].rotation = Quaternion.Euler(0f, 0f, spin);
            moonObj[i].localScale = Vector3.one * s;
            if (!fixedCell[i]) tileRen[i].sharedMaterial = bad[i] ? badMat : tileMat;
        }
        cursorObj.gameObject.SetActive(keyed);
        var cc = Centre(cursor);
        cursorObj.position = field.W(cc.x, cc.y + cell / 2f - 5f, -0.6f);
    }

    // ?oiyotest=1 prints the state to the browser console for the automated play check, with the screen point of the
    // next square in the answer's own order of taps (the web's planTaps).
    bool testLog; float testT; int planAt;
    void TestTick(float dt)
    {
        if (!testLog) return;
        if ((testT -= dt) > 0f) return;
        testT = 0.05f;
        string nx = "null";
        if (state == GameState.Playing && !over && planAt < st.plan.Length)
        {
            var c = Centre(st.plan[planAt]);
            var sp = cam.WorldToScreenPoint(field.W(c.x, c.y, 0f));
            nx = $"[{sp.x:F1},{Screen.height - sp.y:F1}]";
        }
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"taps\":{taps},\"par\":{st.par},\"limit\":{st.limit},\"next\":{nx},\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.55f, 0.45f, 0.95f, 0.97f);
    static readonly Color Dark = new Color(0.08f, 0.07f, 0.2f, 0.9f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("{0} × {1} grid", SunMoonStages.All[i].n, SunMoonStages.All[i].n);

    void OnGUI()
    {
        OiyoArcade.Begin();
        float w = OiyoArcade.W, h = OiyoArcade.H;
        if (state == GameState.Menu)
        {
            if (showStages)
            {
                int pick = OiyoScreens.Stages(w, h, Dark, Accent, Slug, StageCount, U("Choose a stage"), U("Back"), U("Stage"));
                if (pick == -2) showStages = false; else if (pick >= 0) LoadStage(pick);
                return;
            }
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(1f, 0.92f, 0.7f), U("Sun & Moon"),
                U("Fill the grid with suns and moons. Every row and column holds as many suns as moons, never three alike in a line, and = joins two that match, × two that differ. Tap a square: sun, moon, empty."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        var bar = new Rect(8f, 8f, w - 16f, 44f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 18f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>  " + F("Taps {0}/{1}", taps, st.limit), 15, new Color(1f, 0.95f, 0.8f));
        if (OiyoArcade.Button(new Rect(w - 56f, 12f, 40f, 36f), "<b>II</b>", OiyoScreens.Slate, 16))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap to start"), U("Tap a square: sun, moon, empty!"), 120f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            string detail = won ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : "";
            string body = won ? $"<size=14>{F("Solved in {0} taps", taps)}</size>" : "";
            int r = OiyoScreens.Result(w, h, Dark, Accent, won, ResultLive, won ? U("Sun and moon in balance!") : U("Out of taps"), detail, body,
                won && stageIdx < StageCount - 1 ? U("Next stage") : null, won && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
