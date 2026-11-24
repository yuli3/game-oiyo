using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Gulp Hole 3D: the web Gulp Hole (src/components/games/GulpHole.tsx, src/lib/games/gulp-hole.ts) rebuilt in Unity on
// the web's own 360 × 560 px field (OiyoField). Drag (or tap a spot) and the hole heads there; anything clearly
// smaller than the hole drops in and widens it. Fill the meter before the clock runs out. The 30 parks are the web's
// own (GulpHoleStages.cs).
public class GulpHolePlayer : MonoBehaviour
{
    const string Slug = "gulp-hole";
    const int StageCount = 30;
    const float MapTop = 100f, MapH = 420f, StartR = 12f, Speed = 95f;
    static readonly float[] ThingR = { 4f, 5f, 7f, 9f, 10f, 12f, 16f, 20f, 26f, 32f };
    static readonly int[] ThingPoints = { 1, 2, 4, 6, 8, 12, 20, 35, 60, 100 };
    static readonly string[] ThingNames = { "flower", "cone", "bin", "bench", "bush", "bike", "tree", "car", "van", "kiosk" };

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of gulp-hole.ts) ----------------
    GulpHoleStages.Level st;
    int stageIdx, starsWon, points;
    float hx, hy, hr, tx, ty, t;
    bool[] eaten;
    bool over, won;

    int Things => st.things.Length / 3;
    int Kind(int i) => st.things[i * 3];
    float TX(int i) => st.things[i * 3 + 1];
    float TY(int i) => st.things[i * 3 + 2];
    bool Fits(int kind) => ThingR[kind] <= hr * 0.85f;
    static float RadiusFor(int pts) => StartR + 2.2f * Mathf.Sqrt(pts);

    void Steer(float x, float y)
    {
        tx = Mathf.Clamp(x, 0f, 360f);
        ty = Mathf.Clamp(y, MapTop, MapTop + MapH);
    }

    List<int> Step(float dt)
    {
        var got = new List<int>();
        if (over) return got;
        t += dt;
        float dx = tx - hx, dy = ty - hy, d = Mathf.Sqrt(dx * dx + dy * dy);
        float move = Mathf.Min(d, Speed * dt);
        if (d > 0.01f) { hx += dx / d * move; hy += dy / d * move; }
        for (int i = 0; i < Things; i++)
        {
            if (eaten[i] || !Fits(Kind(i))) continue;
            float ex = TX(i) - hx, ey = TY(i) - hy;
            if (Mathf.Sqrt(ex * ex + ey * ey) < hr - ThingR[Kind(i)] * 0.4f)
            {
                eaten[i] = true;
                points += ThingPoints[Kind(i)];
                got.Add(i);
            }
        }
        if (got.Count > 0) hr = RadiusFor(points);
        if (points >= st.goal) { over = true; won = true; }
        else if (t >= st.limit) over = true;
        return got;
    }

    int StarsFor()
    {
        if (!won) return 0;
        if (t <= st.par) return 3;
        if (t <= (st.par + st.limit) / 2f) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    OiyoField field;
    Camera cam;
    Transform root, holeObj, rimObj;
    Transform[] thingObj;
    float[] fallT;
    Material[] thingMat;
    Material holeMat, rimMat, grassMat, pathMat, dotMat;
    readonly List<Transform> dots = new List<Transform>();
    Bursts sparkle;
    Synth synth;
    bool showStages;

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(360f, 560f, new Color(0.17f, 0.18f, 0.23f));
        cam = field.Cam;
        OiyoField.Lights(new Color(0.7f, 0.72f, 0.7f), 0.7f, 50f, -25f);
        sparkle = new Bursts(transform, 0.5f);
        synth = new Synth(gameObject);
        thingMat = new Material[ThingNames.Length];
        // transparent sprites are drawn by render queue, not distance: rim, then hole, then the park's things
        for (int k = 0; k < ThingNames.Length; k++) { thingMat[k] = OiyoField.Sprite("GH/" + ThingNames[k]); thingMat[k].renderQueue = 3010 + k; }
        holeMat = OiyoField.Sprite("GH/hole");
        holeMat.renderQueue = 3001;
        rimMat = OiyoField.Sprite("GH/rim");
        rimMat.renderQueue = 3000;
        grassMat = OiyoArcade.Lit(new Color(0.55f, 0.91f, 0.6f), 0.1f, OiyoArcade.Art("GH/grass", true));
        pathMat = OiyoArcade.Lit(new Color(0.91f, 0.85f, 0.65f), 0.1f);
        dotMat = OiyoArcade.Glow(Color.white);
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int i, bool ready = true)
    {
        stageIdx = Mathf.Clamp(i, 0, StageCount - 1);
        StopAllCoroutines();
        st = GulpHoleStages.All[stageIdx];
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Park").transform;
        eaten = new bool[Things];
        fallT = new float[Things];
        hx = 180f; hy = MapTop + MapH - 40f; hr = StartR; tx = hx; ty = hy;
        t = 0f; points = 0; over = false; won = false; starsWon = 0;
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
        Box(grassMat, 180f, MapTop + MapH / 2f, 360f, MapH, 0.2f, 0.2f);
        Box(pathMat, 180f, MapTop + 209f, 360f, 18f, 0.09f, 0.02f);
        Box(pathMat, 179f, MapTop + MapH / 2f, 18f, MapH, 0.09f, 0.02f);
        holeObj = OiyoField.Quad("Hole", holeMat, root, 24f, 24f);
        rimObj = OiyoField.Quad("Rim", rimMat, root, 28f, 28f);
        thingObj = new Transform[Things];
        dots.Clear();
        for (int i = 0; i < Things; i++)
        {
            float d = ThingR[Kind(i)] * 2.2f;
            // stand things up a little so the park has depth; later (bigger) things sit nearer the camera
            var q = OiyoField.Quad("Thing", thingMat[Kind(i)], root, d, d);
            q.position = field.W(TX(i), TY(i), -0.05f - i * 0.0004f);
            thingObj[i] = q;
            var dot = Box(dotMat, TX(i), TY(i) - ThingR[Kind(i)] - 5f, 2.5f, 2.5f, -0.3f, 0.02f);
            dot.gameObject.SetActive(false);
            dots.Add(dot);
        }
    }

    // ---------------- Loop ----------------
    bool held;

    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("gulp-hole", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        if (state == GameState.Playing && !over)
        {
            var got = Step(dt);
            foreach (int i in got) fallT[i] = 0.0001f;
            if (got.Count > 0)
            {
                bool big = false;
                foreach (int i in got) if (Kind(i) >= 6) big = true;
                synth.Tone(big ? 196f : 523f, big ? 0.25f : 0.06f, big ? Wave.Square : Wave.Triangle, 0.12f, big ? 98f : 330f, 8f);
            }
            if (over) End();
        }
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
                    // input is read once per frame: a touch or a held finger sets where the hole heads
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (OiyoArcade.OverUi(b.pos) || !field.ToField(b.pos, out Vector2 f)) continue;
                        if (state == GameState.Ready) { state = GameState.Playing; continue; }
                        Steer(f.x, f.y);
                    }
                    var heldNow = OiyoArcade.Held();
                    held = heldNow.Count > 0;
                    if (state == GameState.Playing && held && !OiyoArcade.OverUi(heldNow[0].pos) && field.ToField(heldNow[0].pos, out Vector2 g)) Steer(g.x, g.y);
                    float dx = (Input.GetKey(KeyCode.RightArrow) ? 1f : 0f) - (Input.GetKey(KeyCode.LeftArrow) ? 1f : 0f);
                    float dy = (Input.GetKey(KeyCode.DownArrow) ? 1f : 0f) - (Input.GetKey(KeyCode.UpArrow) ? 1f : 0f);
                    if (dx != 0f || dy != 0f)
                    {
                        if (state == GameState.Ready) state = GameState.Playing;
                        Steer(hx + dx * 60f, hy + dy * 60f);
                    }
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
            OiyoArcade.Record(Slug, stageIdx, starsWon, Mathf.Max(0, Mathf.RoundToInt((st.limit - t) * 10f)), StageCount);
            sparkle.Emit(field.W(180f, 300f, -1f), new Color(1f, 0.85f, 0.25f), 40, 5f, 0.1f, 1f);
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
        field.Fit(80f, 30f, 12f, MapTop, MapTop + MapH);
        holeObj.position = field.W(hx, hy, 0.02f);
        holeObj.localScale = new Vector3(OiyoField.U(hr * 2f), OiyoField.U(hr * 2f), 1f);
        rimObj.position = field.W(hx, hy, 0.03f);
        rimObj.localScale = new Vector3(OiyoField.U(hr * 2f + 6f), OiyoField.U(hr * 2f + 6f), 1f);
        for (int i = 0; i < Things; i++)
        {
            var q = thingObj[i];
            if (eaten[i])
            {
                if (fallT[i] > 0f) fallT[i] += dt;
                float k = Mathf.Clamp01(fallT[i] / 0.35f);
                q.gameObject.SetActive(k < 1f);
                if (k >= 1f) { dots[i].gameObject.SetActive(false); continue; }
                float d = ThingR[Kind(i)] * 2.2f * (1f - k);
                q.position = field.W(Mathf.Lerp(TX(i), hx, k), Mathf.Lerp(TY(i), hy, k), 0.01f);
                q.localScale = new Vector3(OiyoField.U(d), OiyoField.U(d), 1f);
                q.rotation = Quaternion.Euler(0f, 0f, k * 180f);
                dots[i].gameObject.SetActive(false);
                continue;
            }
            dots[i].gameObject.SetActive(Kind(i) >= 3 && Fits(Kind(i)));
        }
    }

    // ?oiyotest=1 prints the state to the browser console for the automated play check: the clock, the points, and the
    // screen point (px from the top-left) of the best bite in reach — the thing worth most per step away.
    bool testLog; float testT;
    Vector2 Scr(float x, float y) { var sp = cam.WorldToScreenPoint(field.W(x, y, 0f)); return new Vector2(sp.x, Screen.height - sp.y); }
    void TestTick(float dt)
    {
        if (!testLog || (testT -= dt) > 0f) return;
        testT = 0.05f;
        int best = -1; float bestV = float.MinValue;
        for (int i = 0; i < Things; i++)
        {
            if (eaten[i] || !Fits(Kind(i))) continue;
            float v = ThingPoints[Kind(i)] / (Mathf.Sqrt((TX(i) - hx) * (TX(i) - hx) + (TY(i) - hy) * (TY(i) - hy)) + 30f);
            if (v > bestV) { bestV = v; best = i; }
        }
        string next = "null";
        if (best >= 0) { var p = Scr(TX(best), TY(best)); next = $"[{p.x:F1},{p.y:F1}]"; }
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"t\":{t:F2},\"par\":{st.par},\"limit\":{st.limit},\"points\":{points},\"goal\":{st.goal},\"next\":{next},\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.18f, 0.62f, 0.27f, 0.97f);
    static readonly Color Dark = new Color(0.1f, 0.11f, 0.12f, 0.9f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("{0}s", GulpHoleStages.All[i].limit);

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(0.85f, 1f, 0.88f), U("Gulp Hole"),
                U("Drag the hole around the park. Anything smaller drops in and the hole grows. Fill the bar before time runs out."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        var bar = new Rect(8f, 8f, w - 16f, 64f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 12f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>  " + $"{points}/{st.goal}" + "   " + F("{0}s", Mathf.Max(0, Mathf.CeilToInt(st.limit - t))), 15, new Color(0.85f, 1f, 0.88f));
        OiyoArcade.Bar(new Rect(20f, 40f, w - 100f, 14f), Mathf.Clamp01((float)points / st.goal), new Color(0.2f, 0.23f, 0.25f), new Color(1f, 0.83f, 0.23f));
        if (OiyoArcade.Button(new Rect(w - 60f, 14f, 44f, 44f), "<b>II</b>", OiyoScreens.Slate, 18))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap to start"), U("Hold and drag to move the hole!"), 140f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            string detail = won ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : "";
            string body = $"<size=14>{F("{0}/{1} points", points, st.goal)}</size>";
            int r = OiyoScreens.Result(w, h, Dark, Accent, won, ResultLive, won ? U("You gulped the park!") : U("Time's up"), detail, body,
                won && stageIdx < StageCount - 1 ? U("Next stage") : null, won && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
