using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Sofa Carry 3D: the web Sofa Carry (src/components/games/SofaCarry.tsx, src/lib/games/sofa-carry.ts) rebuilt in
// Unity on the web's own 360 × 560 px field (OiyoField). The floor is the hall segments (hall wide) and square
// landings (landing wide) at every corner and both ends. Each end of the sofa moves toward its hand at up to 120 px/s;
// the sofa is then set back to its length about its middle, and if any of 13 points along it (less half its
// thickness) would leave the floor, it does not move and a scrape counts (one per 0.5 s). Get the sofa's middle
// within 14 px of the van's spot before the clock runs out. The 30 buildings are the web's own (SofaCarryStages.cs).
public class SofaCarryPlayer : MonoBehaviour
{
    const string Slug = "sofa-carry";
    const int StageCount = 30;
    const float HandSpeed = 120f, ScrapeCooldown = 0.5f;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of sofa-carry.ts) ----------------
    SofaCarryStages.Level st;
    readonly List<Rect> boxes = new List<Rect>();
    Vector2 a, b;
    int stageIdx, starsWon, scrapes;
    float t, cool;
    bool over, won;

    int Points => st.px.Length;
    Vector2 P(int i) => new Vector2(st.px[i], st.py[i]);

    void BuildFloor()
    {
        boxes.Clear();
        float h = st.hall / 2f, l = st.landing / 2f;
        for (int i = 0; i + 1 < Points; i++)
        {
            var p = P(i); var q = P(i + 1);
            boxes.Add(Rect.MinMaxRect(Mathf.Min(p.x, q.x) - h, Mathf.Min(p.y, q.y) - h, Mathf.Max(p.x, q.x) + h, Mathf.Max(p.y, q.y) + h));
        }
        for (int i = 1; i < Points - 1; i++) boxes.Add(Rect.MinMaxRect(st.px[i] - l, st.py[i] - l, st.px[i] + l, st.py[i] + l));
        var e = P(Points - 1); var s0 = P(0);
        boxes.Add(Rect.MinMaxRect(e.x - l, e.y - l, e.x + l, e.y + l));
        boxes.Add(Rect.MinMaxRect(s0.x - l, s0.y - l, s0.x + l, s0.y + l));
    }

    bool InsideAny(Vector2 p, float m)
    {
        foreach (var r in boxes) if (p.x >= r.xMin + m && p.x <= r.xMax - m && p.y >= r.yMin + m && p.y <= r.yMax - m) return true;
        return false;
    }

    bool Clear(Vector2 pa, Vector2 pb)
    {
        float m = st.thick / 2f;
        for (int k = 0; k <= 12; k++) if (!InsideAny(pa + (pb - pa) * (k / 12f), m)) return false;
        return true;
    }

    void NewCarry()
    {
        var p0 = P(0); var p1 = P(1);
        var d = (p1 - p0).normalized;
        float half = st.length / 2f;
        a = p0 - d * half; b = p0 + d * half;
        t = 0f; scrapes = 0; cool = 0f; over = false; won = false;
    }

    Vector2 Middle => (a + b) / 2f;
    bool AtVan => Vector2.Distance(Middle, P(Points - 1)) < 14f;

    static Vector2 Toward(Vector2 p, Vector2? q, float step)
    {
        if (!q.HasValue) return p;
        var d = q.Value - p;
        return d.magnitude <= step ? q.Value : p + d.normalized * step;
    }

    // returns whether it scraped this step
    bool Step(Vector2? handA, Vector2? handB, float dt)
    {
        if (over) return false;
        bool scrape = false;
        t += dt;
        cool = Mathf.Max(0f, cool - dt);
        var na = Toward(a, handA, HandSpeed * dt);
        var nb = Toward(b, handB, HandSpeed * dt);
        var m = (na + nb) / 2f;
        var dir = nb - na;
        if (dir.sqrMagnitude < 1e-6f) dir = Vector2.right; else dir.Normalize();
        float half = st.length / 2f;
        var ca = m - dir * half; var cb = m + dir * half;
        if (Clear(ca, cb)) { a = ca; b = cb; }
        else if (cool <= 0f && (handA.HasValue || handB.HasValue)) { scrapes++; cool = ScrapeCooldown; scrape = true; }
        if (AtVan) { over = true; won = true; }
        else if (t >= st.time) over = true;
        return scrape;
    }

    int StarsFor()
    {
        if (!won) return 0;
        if (scrapes == 0 && t <= st.par * 1.1f) return 3;
        if (scrapes <= 2) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    OiyoField field;
    Camera cam;
    Transform root, sofa, endA, endB, ringA, ringB;
    readonly List<Transform> cushions = new List<Transform>();
    Material wallMat, floorMat, sofaMat, cushionMat, endAMat, endBMat, vanSpot;
    Bursts dust;
    Synth synth;
    bool showStages;

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(360f, 560f, new Color(0.36f, 0.25f, 0.2f));
        cam = field.Cam;
        OiyoField.Lights(new Color(0.7f, 0.66f, 0.62f), 0.7f, 40f, -25f);
        dust = new Bursts(transform, 0.4f);
        synth = new Synth(gameObject);
        wallMat = OiyoArcade.Lit(new Color(0.36f, 0.25f, 0.2f), 0.2f, OiyoArcade.Art("SC/wall", true));
        floorMat = OiyoArcade.Lit(new Color(0.85f, 0.76f, 0.65f), 0.2f, OiyoArcade.Art("SC/floor", true));
        sofaMat = OiyoArcade.Lit(new Color(0.61f, 0.21f, 0.71f), 0.3f, OiyoArcade.Art("SC/fabric", true));
        cushionMat = OiyoArcade.Lit(new Color(0.8f, 0.36f, 0.91f), 0.3f, OiyoArcade.Art("SC/fabric", true));
        endAMat = OiyoArcade.Lit(new Color(0.18f, 0.62f, 0.27f), 0.4f);
        endBMat = OiyoArcade.Lit(new Color(0.97f, 0.4f, 0.03f), 0.4f);
        vanSpot = OiyoArcade.Transparent(OiyoArcade.Solid(Color.white), new Color(0.25f, 0.75f, 0.34f, 0.45f));
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int i, bool ready = true)
    {
        stageIdx = Mathf.Clamp(i, 0, StageCount - 1);
        StopAllCoroutines();
        st = SofaCarryStages.All[stageIdx];
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Building").transform;
        BuildFloor();
        NewCarry();
        grips.Clear();
        starsWon = 0;
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
        Box(wallMat, 180f, 280f, 1600f, 600f, 0.3f, 0.6f);
        foreach (var r in boxes) Box(floorMat, r.center.x, r.center.y, r.width, r.height, -0.05f, 0.1f);
        var e = P(Points - 1);
        var spot = OiyoField.Quad("Van spot", vanSpot, root, 28f, 28f);
        spot.position = field.W(e.x, e.y, -0.12f);
        var van = OiyoField.Quad("Van", OiyoField.Sprite("SC/van"), root, 60f, 30f);
        van.position = field.W(e.x, e.y - 40f, -0.4f);
        sofa = Box(sofaMat, 0f, 0f, st.length, st.thick, -0.3f, 0.5f);
        cushions.Clear();
        for (int q = 0; q < 3; q++) cushions.Add(Box(cushionMat, 0f, 0f, (st.length - 16f) / 3f - 2f, st.thick - 10f, -0.45f, 0.3f));
        endA = Box(endAMat, 0f, 0f, 8f, st.thick, -0.45f, 0.6f);
        endB = Box(endBMat, 0f, 0f, 8f, st.thick, -0.45f, 0.6f);
        ringA = OiyoArcade.GlowQuad("Hand A", new Color(0.18f, 0.62f, 0.27f, 0.7f), OiyoField.U(30f), root).transform;
        ringB = OiyoArcade.GlowQuad("Hand B", new Color(0.97f, 0.4f, 0.03f, 0.7f), OiyoField.U(30f), root).transform;
    }

    // ---------------- Loop ----------------
    class Grip { public int id; public bool endA; public Vector2 at; }
    readonly List<Grip> grips = new List<Grip>();

    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("sofa-carry", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput(out Vector2? ha, out Vector2? hb);
        if (state == GameState.Playing)
        {
            if (Step(ha, hb, dt))
            {
                Toast(U("Screech! A wall"), new Color(1f, 0.45f, 0.45f));
                dust.Emit(field.W(Middle.x, Middle.y, -0.6f), new Color(0.8f, 0.8f, 0.8f), 6, 2f, 0.05f, 0.4f);
                synth.Tone(900f, 0.15f, Wave.Square, 0.08f, 600f, 10f);
            }
            if (over) End();
        }
        msgT = Mathf.Max(0f, msgT - dt);
        Animate(dt);
    }

    string msg = ""; float msgT; Color msgC = Color.white;
    void Toast(string m, Color c) { msg = m; msgT = 0.8f; msgC = c; }

    void ReadInput(out Vector2? ha, out Vector2? hb)
    {
        ha = null; hb = null;
        bool confirm = Input.GetKeyDown(KeyCode.Return);
        switch (state)
        {
            case GameState.Ready:
            case GameState.Playing:
                {
                    if (state == GameState.Playing && (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P))) { state = GameState.Paused; grips.Clear(); return; }
                    // fingers are read once per frame: a new finger takes the nearer end nobody holds, then pulls it along
                    foreach (var p in OiyoArcade.Began())
                    {
                        if (OiyoArcade.OverUi(p.pos) || !field.ToField(p.pos, out Vector2 f)) continue;
                        if (state == GameState.Ready) state = GameState.Playing;
                        bool heldA = grips.Exists(g => g.endA), heldB = grips.Exists(g => !g.endA);
                        bool wantA = Vector2.Distance(f, a) <= Vector2.Distance(f, b);
                        if (wantA && heldA) wantA = false; else if (!wantA && heldB) wantA = true;
                        if ((wantA && heldA) || (!wantA && heldB)) continue;
                        grips.Add(new Grip { id = p.id, endA = wantA, at = f });
                        synth.Tone(520f, 0.04f, Wave.Triangle, 0.1f, 0f, 14f);
                    }
                    foreach (var e in OiyoArcade.Ended()) grips.RemoveAll(g => g.id == e.id);
                    var alive = new HashSet<int>();
                    foreach (var hp in OiyoArcade.Held())
                    {
                        alive.Add(hp.id);
                        var g = grips.Find(q => q.id == hp.id);
                        if (g != null && field.ToField(hp.pos, out Vector2 f)) g.at = f;
                    }
                    grips.RemoveAll(g => !alive.Contains(g.id));
                    foreach (var g in grips) { if (g.endA) ha = g.at; else hb = g.at; }
                    Vector2 KeyDir(KeyCode up, KeyCode left, KeyCode down, KeyCode right) =>
                        new Vector2((Input.GetKey(right) ? 1 : 0) - (Input.GetKey(left) ? 1 : 0), (Input.GetKey(down) ? 1 : 0) - (Input.GetKey(up) ? 1 : 0));
                    var ka = KeyDir(KeyCode.W, KeyCode.A, KeyCode.S, KeyCode.D);
                    var kb = KeyDir(KeyCode.UpArrow, KeyCode.LeftArrow, KeyCode.DownArrow, KeyCode.RightArrow);
                    if (ka != Vector2.zero) { ha = a + ka * 30f; if (state == GameState.Ready) state = GameState.Playing; }
                    if (kb != Vector2.zero) { hb = b + kb * 30f; if (state == GameState.Ready) state = GameState.Playing; }
                    if (state == GameState.Ready && confirm) state = GameState.Playing;
                    return;
                }
            case GameState.Paused:
                if (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P)) state = GameState.Playing;
                return;
            case GameState.Victory:
            case GameState.GameOver:
                if (confirm && ResultLive) LoadStage(state == GameState.Victory ? Mathf.Min(stageIdx + 1, StageCount - 1) : stageIdx);
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
        grips.Clear();
        if (won)
        {
            starsWon = StarsFor();
            state = GameState.Victory;
            OiyoArcade.Record(Slug, stageIdx, starsWon, Mathf.Max(0, Mathf.RoundToInt((st.time - t) * 10f)), StageCount);
            var e = P(Points - 1);
            dust.Emit(field.W(e.x, e.y, -0.8f), new Color(1f, 0.85f, 0.25f), 30, 4f, 0.1f, 1f);
            StartCoroutine(Arp(new[] { 523f, 659f, 784f, 1047f, 1319f }, 0.09f));
        }
        else
        {
            starsWon = 0;
            state = GameState.GameOver;
            synth.Tone(220f, 0.6f, Wave.Triangle, 0.2f, 110f, 3f);
        }
    }

    IEnumerator Arp(float[] fs, float gap)
    {
        foreach (var f in fs) { synth.Tone(f, 0.18f, Wave.Triangle, 0.22f, 0f, 6f); yield return new WaitForSeconds(gap); }
    }

    void Animate(float dt)
    {
        if (root == null) return;
        field.Fit(50f, 10f, 0f);
        var m = Middle;
        float ang = Mathf.Atan2(b.y - a.y, b.x - a.x) * Mathf.Rad2Deg;
        var rot = Quaternion.Euler(0f, 0f, -ang);
        sofa.position = field.W(m.x, m.y, -0.3f);
        sofa.rotation = rot;
        var dir = (b - a).normalized;
        for (int q = 0; q < cushions.Count; q++)
        {
            float off = -st.length / 2f + 8f + (q + 0.5f) * (st.length - 16f) / 3f;
            var c = m + dir * off;
            cushions[q].position = field.W(c.x, c.y, -0.45f);
            cushions[q].rotation = rot;
        }
        var ea = a + dir * 4f; var eb = b - dir * 4f;
        endA.position = field.W(ea.x, ea.y, -0.45f); endA.rotation = rot;
        endB.position = field.W(eb.x, eb.y, -0.45f); endB.rotation = rot;
        var ga = grips.Find(g => g.endA); var gb = grips.Find(g => !g.endA);
        ringA.gameObject.SetActive(ga != null);
        ringB.gameObject.SetActive(gb != null);
        if (ga != null) ringA.position = field.W(ga.at.x, ga.at.y, -0.7f);
        if (gb != null) ringB.position = field.W(gb.at.x, gb.at.y, -0.7f);
    }

    // ?oiyotest=1 prints the state to the browser console for the automated play check: both ends and the sofa's
    // length (field px), the hall's centre line, the clock and the scrapes, and the screen points (px from the
    // top-left) of the field's corners (0, 0) and (360, 560).
    bool testLog; float testT;
    Vector2 Scr(float fx, float fy) { var sp = cam.WorldToScreenPoint(field.W(fx, fy, 0f)); return new Vector2(sp.x, Screen.height - sp.y); }
    void TestTick(float dt)
    {
        if (!testLog || (testT -= dt) > 0f) return;
        testT = 0.03f;
        var f0 = Scr(0f, 0f); var f1 = Scr(360f, 560f);
        var path = new System.Text.StringBuilder();
        for (int i = 0; i < Points; i++) { if (i > 0) path.Append(','); path.Append('[').Append(st.px[i].ToString("F1")).Append(',').Append(st.py[i].ToString("F1")).Append(']'); }
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"t\":{t:F2},\"a\":[{a.x:F2},{a.y:F2}],\"b\":[{b.x:F2},{b.y:F2}],\"len\":{st.length:F1},\"path\":[{path}],\"grips\":{grips.Count},\"scrapes\":{scrapes},\"time\":{st.time:F0},\"f0\":[{f0.x:F1},{f0.y:F1}],\"f1\":[{f1.x:F1},{f1.y:F1}],\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.61f, 0.21f, 0.71f, 0.97f);
    static readonly Color Dark = new Color(0.16f, 0.1f, 0.08f, 0.9f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("{0}s", Mathf.RoundToInt(SofaCarryStages.All[i].time));

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(1f, 0.96f, 0.9f), U("Sofa Carry"),
                U("Two players, one phone: each holds one end of the sofa. It only fits lengthwise and only turns on the landings."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        var bar = new Rect(8f, 8f, w - 16f, 44f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 18f, w - 150f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>  " + F("Scrapes {0}", scrapes), 15, new Color(1f, 0.96f, 0.9f));
        OiyoArcade.Text(new Rect(w - 130f, 18f, 60f, 22f), F("{0}s", Mathf.Max(0, Mathf.CeilToInt(st.time - t))), 15, Color.white, TextAnchor.UpperRight);
        if (OiyoArcade.Button(new Rect(w - 56f, 10f, 40f, 40f), "<b>II</b>", OiyoScreens.Slate, 18))
        {
            if (state == GameState.Playing) { state = GameState.Paused; grips.Clear(); }
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (msgT > 0f) OiyoArcade.Shadowed(new Rect(8f, 58f, w - 16f, 28f), msg, 18, msgC, TextAnchor.MiddleCenter);
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap to start"), U("You take the front, I take the back."), 200f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            bool w0 = state == GameState.Victory;
            string detail = w0 ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : "";
            string body = $"<size=14>{F("{0}s · {1} scrapes", Mathf.RoundToInt(t), scrapes)}</size>";
            int r = OiyoScreens.Result(w, h, Dark, Accent, w0, ResultLive, w0 ? U("In the van! Move done") : U("The van left"), detail, body,
                w0 && stageIdx < StageCount - 1 ? U("Next stage") : null, w0 && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
