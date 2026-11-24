using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Duck Parade 3D: the web Duck Parade (src/components/games/DuckParade.tsx, src/lib/games/duck-parade.ts) rebuilt in
// Unity on the web's own 360 × 560 px field (OiyoField). The parade walks up a two-lane park path; pairs of gates
// (+, −, ×, ÷) work on the whole parade, a fox in a lane snaps up a share of it, and at the end the stream needs so
// many ducklings to cross. Tap the left or right half to switch lanes. The 30 paths are the web's own
// (DuckParadeStages.cs).
public class DuckParadePlayer : MonoBehaviour
{
    const string Slug = "duck-parade";
    const int StageCount = 30;
    const int Start = 5;
    const float Speed = 60f, RowGap = 150f, ParadeY = 440f;
    static readonly string[] OpGlyph = { "+", "−", "×", "÷" };

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of duck-parade.ts) ----------------
    DuckParadeStages.Level st;
    int stageIdx, starsWon, lane, passed, count;
    float dist;
    bool over, won;

    int Rows => st.rows.Length / 5;
    bool IsFox(int i) => st.rows[i * 5] == 1;
    int FoxLane(int i) => st.rows[i * 5 + 1];
    int Bite(int i) => st.rows[i * 5 + 2];
    int Op(int i, int l) => st.rows[i * 5 + 1 + l * 2];
    int N(int i, int l) => st.rows[i * 5 + 2 + l * 2];
    static float RowAt(int i) => RowGap * (i + 1);
    float FinishAt => RowAt(Rows) + RowGap / 2f;

    static int Apply(int op, int n, int c) => op == 0 ? c + n : op == 1 ? Mathf.Max(0, c - n) : op == 2 ? c * n : c / n;

    List<int> Step(float dt)
    {
        var done = new List<int>();
        if (over) return done;
        dist += Speed * dt;
        while (passed < Rows && dist >= RowAt(passed))
        {
            if (!IsFox(passed)) count = Apply(Op(passed, lane), N(passed, lane), count);
            else if (FoxLane(passed) == lane) count = Mathf.Max(0, count - Mathf.CeilToInt(count * Bite(passed) / 100f));
            done.Add(passed);
            passed++;
            if (count <= 0) { over = true; return done; }
        }
        if (dist >= FinishAt) { over = true; won = count >= st.need; }
        return done;
    }

    int StarsFor()
    {
        if (!won) return 0;
        if (count >= st.best * 0.8f) return 3;
        if (count >= st.need * 1.5f) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    static float LaneX(int l) => l == 0 ? 110f : 250f;
    float YOf(float d) => ParadeY - (d - dist);

    OiyoField field;
    Camera cam;
    Transform root, mom, stream;
    readonly List<Transform> gateObj = new List<Transform>(), foxObj = new List<Transform>(), ducklings = new List<Transform>(), dashes = new List<Transform>();
    Material goodMat, badMat, pathMat, grassMat, dashMat, waterMat, foxMat, duckMat, momMat;
    Bursts sparkle;
    Synth synth;
    bool showStages;
    float xNow;
    readonly List<(string text, float x, float t, bool good)> pops = new List<(string, float, float, bool)>();

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(360f, 560f, new Color(0.55f, 0.91f, 0.6f));
        cam = field.Cam;
        OiyoField.Lights(new Color(0.72f, 0.72f, 0.72f), 0.75f, 45f, -25f);
        sparkle = new Bursts(transform, 0.5f);
        synth = new Synth(gameObject);
        goodMat = OiyoArcade.Lit(new Color(0.3f, 0.67f, 0.97f), 0.4f);
        badMat = OiyoArcade.Lit(new Color(0.98f, 0.32f, 0.32f), 0.4f);
        pathMat = OiyoArcade.Lit(new Color(0.91f, 0.85f, 0.65f), 0.1f);
        grassMat = OiyoArcade.Lit(new Color(0.55f, 0.91f, 0.6f), 0.1f, OiyoArcade.Art("DP/grass", true));
        dashMat = OiyoArcade.Lit(new Color(0.85f, 0.76f, 0.55f), 0.1f);
        waterMat = OiyoArcade.Lit(new Color(0.3f, 0.67f, 0.97f), 0.7f);
        foxMat = OiyoField.Sprite("DP/fox");
        duckMat = OiyoField.Sprite("DP/duckling");
        momMat = OiyoField.Sprite("DP/mother");
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int i, bool ready = true)
    {
        stageIdx = Mathf.Clamp(i, 0, StageCount - 1);
        StopAllCoroutines();
        st = DuckParadeStages.All[stageIdx];
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Park").transform;
        lane = 0; passed = 0; count = Start; dist = 0f; over = false; won = false; starsWon = 0;
        xNow = LaneX(0);
        pops.Clear();
        showStages = false;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Animate(0f);
    }

    Transform Box(Material m, float x, float y, float w, float h, float z, float depth)
    {
        var q = OiyoArcade.Prim(PrimitiveType.Cube, "Box", m, root).transform;
        q.position = field.W(x, y, z);
        q.localScale = new Vector3(OiyoField.U(w), OiyoField.U(h), depth);
        return q;
    }

    void BuildScene()
    {
        Box(grassMat, 180f, 280f, 420f, 700f, 0.3f, 0.2f);
        Box(pathMat, 180f, 280f, 260f, 700f, 0.15f, 0.1f);
        dashes.Clear();
        for (int k = 0; k < 16; k++) dashes.Add(Box(dashMat, 180f, 0f, 4f, 20f, 0.09f, 0.02f));
        gateObj.Clear(); foxObj.Clear();
        for (int i = 0; i < Rows; i++)
        {
            gateObj.Add(Box(goodMat, 0f, 0f, 120f, 34f, -0.2f, 0.4f));
            gateObj.Add(Box(goodMat, 0f, 0f, 120f, 34f, -0.2f, 0.4f));
            var f = OiyoField.Quad("Fox", foxMat, root, 34f, 34f);
            foxObj.Add(f);
        }
        stream = Box(waterMat, 180f, 0f, 420f, 40f, 0.05f, 0.1f);
        mom = OiyoField.Quad("Mother", momMat, root, 34f, 34f);
        ducklings.Clear();
        for (int k = 0; k < 24; k++) ducklings.Add(OiyoField.Quad("Duckling", duckMat, root, 13f, 13f));
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("duck-parade", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        if (state == GameState.Playing && !over)
        {
            int before = count;
            foreach (int i in Step(dt))
            {
                int diff = count - before;
                pops.Add(((diff >= 0 ? "+" : "") + diff, LaneX(lane), 1f, diff >= 0));
                synth.Tone(diff >= 0 ? 784f : 196f, 0.1f, diff >= 0 ? Wave.Triangle : Wave.Square, 0.12f, diff >= 0 ? 988f : 147f, 10f);
                if (diff > 0) sparkle.Emit(field.W(LaneX(lane), ParadeY - 20f, -1f), new Color(1f, 0.83f, 0.23f), 8, 3f, 0.08f, 0.5f);
                before = count;
            }
            if (over) End();
        }
        for (int k = pops.Count - 1; k >= 0; k--) { var p = pops[k]; p.t -= dt; if (p.t <= 0f) pops.RemoveAt(k); else pops[k] = p; }
        Animate(dt);
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
                    // lane taps are read once per frame
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (OiyoArcade.OverUi(b.pos) || !field.ToField(b.pos, out Vector2 f)) continue;
                        if (state == GameState.Ready) { state = GameState.Playing; continue; }
                        SetLane(f.x < 180f ? 0 : 1);
                    }
                    if (Input.GetKeyDown(KeyCode.LeftArrow)) { if (state == GameState.Ready) state = GameState.Playing; SetLane(0); }
                    if (Input.GetKeyDown(KeyCode.RightArrow)) { if (state == GameState.Ready) state = GameState.Playing; SetLane(1); }
                    if (state == GameState.Ready && (confirm || Input.GetKeyDown(KeyCode.Space))) state = GameState.Playing;
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

    void SetLane(int l)
    {
        if (over || l == lane) return;
        lane = l;
        synth.Tone(523f, 0.04f, Wave.Triangle, 0.08f, 0f, 16f);
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
            OiyoArcade.Record(Slug, stageIdx, starsWon, count, StageCount);
            sparkle.Emit(field.W(180f, 200f, -1f), new Color(1f, 0.85f, 0.25f), 40, 5f, 0.1f, 1f);
            StartCoroutine(Arp(new[] { 523f, 659f, 784f, 1047f, 1319f }, 0.09f));
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
        field.Fit(80f, 10f, 18f);
        float off = dist % 40f;
        for (int k = 0; k < dashes.Count; k++) dashes[k].position = field.W(180f, -40f + off + k * 40f, 0.09f);
        for (int i = 0; i < Rows; i++)
        {
            float y = YOf(RowAt(i));
            bool on = i >= passed - 1 && y > -60f && y < 620f;
            var g0 = gateObj[i * 2];
            var g1 = gateObj[i * 2 + 1];
            var fx = foxObj[i];
            bool fox = IsFox(i);
            g0.gameObject.SetActive(on && !fox);
            g1.gameObject.SetActive(on && !fox);
            fx.gameObject.SetActive(on && fox);
            if (!on) continue;
            if (fox) fx.position = field.W(LaneX(FoxLane(i)), y, -0.3f);
            else
                for (int l = 0; l < 2; l++)
                {
                    var g = l == 0 ? g0 : g1;
                    g.position = field.W(LaneX(l), y, -0.2f);
                    g.GetComponent<Renderer>().sharedMaterial = Op(i, l) == 0 || Op(i, l) == 2 ? goodMat : badMat;
                }
        }
        stream.position = field.W(180f, YOf(FinishAt) - 10f, 0.05f);
        xNow += (LaneX(lane) - xNow) * Mathf.Min(1f, dt * 12f);
        mom.position = field.W(xNow, ParadeY - 26f, -0.3f);
        int shown = Mathf.Min(24, count);
        for (int k = 0; k < ducklings.Count; k++)
        {
            ducklings[k].gameObject.SetActive(k < shown);
            float bob = Mathf.Sin(Time.time * 10f + k) * 1.5f;
            ducklings[k].position = field.W(xNow - 36f + (k % 6) * 14f, ParadeY + 6f + (k / 6) * 12f + bob, -0.3f);
        }
    }

    // ?oiyotest=1 prints the state to the browser console for the automated play check: rows passed, the parade, and
    // the screen point (px from the top-left) of the lane to be in for the next row: the bigger gate, or away from the fox.
    bool testLog; float testT;
    Vector2 Scr(float x, float y) { var sp = cam.WorldToScreenPoint(field.W(x, y, 0f)); return new Vector2(sp.x, Screen.height - sp.y); }
    void TestTick(float dt)
    {
        if (!testLog || (testT -= dt) > 0f) return;
        testT = 0.05f;
        string next = "null";
        if (passed < Rows)
        {
            int want = IsFox(passed) ? 1 - FoxLane(passed) : Apply(Op(passed, 0), N(passed, 0), count) >= Apply(Op(passed, 1), N(passed, 1), count) ? 0 : 1;
            if (want != lane) { var p = Scr(want == 0 ? 90f : 270f, 300f); next = $"[{p.x:F1},{p.y:F1}]"; }
        }
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"passed\":{passed},\"rows\":{Rows},\"count\":{count},\"need\":{st.need},\"best\":{st.best},\"next\":{next},\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.99f, 0.49f, 0.08f, 0.97f);
    static readonly Color Dark = new Color(0.1f, 0.11f, 0.12f, 0.9f);

    Vector2 Gui(Vector2 f, float z = -0.45f) => OiyoArcade.ToGui(cam.WorldToScreenPoint(field.W(f.x, f.y, z)));
    float GuiPerField => field.ScreenPerField() / OiyoArcade.ComputeScale();
    void Label(Rect r, string s, float size, Color c, float z = -0.45f)
    {
        var p = Gui(new Vector2(r.x, r.y), z); var q = Gui(new Vector2(r.xMax, r.yMax), z);
        OiyoArcade.Text(new Rect(p.x, p.y, q.x - p.x, q.y - p.y), s, Mathf.Max(9, Mathf.RoundToInt(size * GuiPerField)), c, TextAnchor.MiddleCenter, true);
    }

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("Stepping stones: {0} needed", DuckParadeStages.All[i].need);

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(1f, 0.95f, 0.75f), U("Duck Parade"),
                U("Steer the ducklings through the better gates, dodge the fox, and bring enough to cross the stream."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        for (int i = Mathf.Max(0, passed - 1); i < Rows; i++)
        {
            float y = YOf(RowAt(i));
            if (y < -40f || y > 600f || IsFox(i)) continue;
            for (int l = 0; l < 2; l++) Label(new Rect(LaneX(l) - 60f, y - 17f, 120f, 34f), OpGlyph[Op(i, l)] + N(i, l), 20f, Color.white);
        }
        float sy = YOf(FinishAt);
        if (sy > -40f) Label(new Rect(0f, sy - 60f, 360f, 20f), F("Stepping stones: {0} needed", st.need), 13f, new Color(0.11f, 0.26f, 0.2f), 0f);
        Label(new Rect(xNow + 20f, ParadeY - 44f, 60f, 24f), count.ToString(), 18f, new Color(0.13f, 0.15f, 0.16f));
        foreach (var p in pops) Label(new Rect(p.x - 50f, ParadeY - 80f - (1f - p.t) * 30f, 100f, 22f), p.text, 16f, p.good ? new Color(0.1f, 0.44f, 0.76f) : new Color(0.79f, 0.16f, 0.16f));

        var bar = new Rect(8f, 8f, w - 16f, 64f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 12f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>  " + F("{0} ducklings", count), 15, new Color(1f, 0.95f, 0.75f));
        OiyoArcade.Bar(new Rect(20f, 40f, w - 100f, 12f), Mathf.Clamp01(dist / FinishAt), new Color(0.2f, 0.23f, 0.25f), new Color(0.99f, 0.49f, 0.08f));
        if (OiyoArcade.Button(new Rect(w - 60f, 14f, 44f, 44f), "<b>II</b>", OiyoScreens.Slate, 18))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap to start"), U("Tap left or right to switch lanes!"), 140f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            string detail = won ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : "";
            string body = $"<size=14>{F("{0} ducklings · {1} needed", count, st.need)}</size>";
            int r = OiyoScreens.Result(w, h, Dark, Accent, won, ResultLive, won ? U("Across the stream!") : U("Couldn't cross the stream"), detail, body,
                won && stageIdx < StageCount - 1 ? U("Next stage") : null, won && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
