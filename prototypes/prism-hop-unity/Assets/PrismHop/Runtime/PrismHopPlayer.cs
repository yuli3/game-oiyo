using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Prism Hop 3D: the web Prism Hop (src/components/games/PrismHop.tsx, src/lib/games/prism-hop.ts) rebuilt in Unity on
// the web's own px (heights upward from the start ledge). A tap gives the bead an upward speed of 380 px/s against
// 1100 px/s² of gravity. Spinning four-colour rings (crossed at their bottom and top) and sliding bars let the bead
// through only in its own colour; a hit costs a heart and a second of safety. Each prism star catches the bead on a
// ledge, mends a heart and sets the next colour. The 30 towers are the web's own (PrismHopStages.cs).
public class PrismHopPlayer : MonoBehaviour
{
    const string Slug = "prism-hop";
    const int StageCount = 30;
    const int Hearts = 3;
    const float Gravity = 1100f, HopV = 380f, Ball = 9f, Band = 7f, Safe = 1f, Seg = 90f, Tau = Mathf.PI * 2f;
    const float CX = 180f, Foot = 430f;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of prism-hop.ts) ----------------
    struct Gate { public int kind; public float y, r, phase, speed; public int colour; }
    PrismHopStages.Level st;
    Gate[] gates;
    int stageIdx, starsWon, next, hearts, hits, colour;
    float t, y, v, safe;
    bool resting, over, won;

    static float Mod(float a, float n) => ((a % n) + n) % n;

    static int ColourAt(Gate g, bool low, float time)
    {
        if (g.kind == 1) return Mathf.FloorToInt(Mod(g.phase + g.speed * time, Seg * 4f) / Seg);
        float theta = g.phase + g.speed * time;
        float dir = low ? -Mathf.PI / 2f : Mathf.PI / 2f;
        return Mathf.FloorToInt(Mod(dir - theta, Tau) / (Mathf.PI / 2f));
    }

    static bool Clash(Gate g, float by, int c, float time)
    {
        if (g.kind == 1) return Mathf.Abs(by - g.y) < Ball + Band && ColourAt(g, true, time) != c;
        if (Mathf.Abs(by - (g.y - g.r)) < Ball + Band && ColourAt(g, true, time) != c) return true;
        if (Mathf.Abs(by - (g.y + g.r)) < Ball + Band && ColourAt(g, false, time) != c) return true;
        return false;
    }

    void Tap() { if (over) return; v = HopV; resting = false; }

    // bit 1 hit, bit 2 star
    int Step(float dt)
    {
        int ev = 0;
        if (over) return 0;
        t += dt;
        safe = Mathf.Max(0f, safe - dt);
        if (!resting) { v -= Gravity * dt; y += v * dt; }
        float ledge = st.ledges[next];
        if (y <= ledge) { y = ledge; v = 0f; resting = true; }
        for (int k = Mathf.Max(0, next - 1); k <= Mathf.Min(gates.Length - 1, next); k++)
        {
            if (safe <= 0f && Clash(gates[k], y, colour, t))
            {
                hearts--; hits++; safe = Safe; ev |= 1;
                if (hearts <= 0) { over = true; return ev; }
            }
        }
        if (y > st.ledges[next + 1] + Ball)
        {
            next++;
            v = Mathf.Min(v, 0f);
            hearts = Mathf.Min(Hearts, hearts + 1);
            ev |= 2;
            if (next >= gates.Length) { over = true; won = true; return ev; }
            colour = gates[next].colour;
        }
        if (t >= st.limit) over = true;
        return ev;
    }

    int StarsFor()
    {
        if (!won) return 0;
        if (hits == 0) return 3;
        if (hits <= 1) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    static readonly Color[] Hues = { new Color(0.94f, 0.24f, 0.24f), new Color(0.99f, 0.77f, 0.1f), new Color(0.13f, 0.72f, 0.81f), new Color(0.75f, 0.29f, 0.86f) };
    OiyoField field;
    Camera cam;
    Transform root, bead;
    Renderer beadR;
    Transform[] ringPivot, stars;
    Transform[][] barSegs;
    Material[] hueMat, hueGlow;
    Material white;
    Bursts sparkle;
    Synth synth;
    bool showStages;
    float camY;

    float FY(float h) => Foot - h; // field y for a height

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(360f, 560f, new Color(0.11f, 0.11f, 0.18f));
        cam = field.Cam;
        OiyoField.Lights(new Color(0.7f, 0.7f, 0.75f), 0.75f, 40f, -30f);
        sparkle = new Bursts(transform, 0.5f);
        synth = new Synth(gameObject);
        hueMat = new Material[4]; hueGlow = new Material[4];
        for (int k = 0; k < 4; k++) { hueMat[k] = OiyoArcade.Lit(Hues[k], 0.7f); hueGlow[k] = OiyoArcade.LitGlow(Hues[k], Hues[k] * 0.6f, 0.8f); }
        white = OiyoArcade.Glow(Color.white);
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int i, bool ready = true)
    {
        stageIdx = Mathf.Clamp(i, 0, StageCount - 1);
        StopAllCoroutines();
        st = PrismHopStages.All[stageIdx];
        gates = new Gate[st.gates.Length / 6];
        for (int k = 0; k < gates.Length; k++)
            gates[k] = new Gate { kind = Mathf.RoundToInt(st.gates[k * 6]), y = st.gates[k * 6 + 1], r = st.gates[k * 6 + 2], phase = st.gates[k * 6 + 3], speed = st.gates[k * 6 + 4], colour = Mathf.RoundToInt(st.gates[k * 6 + 5]) };
        t = 0f; y = st.ledges[0]; v = 0f; colour = gates[0].colour; next = 0; hearts = Hearts; hits = 0; safe = 0f; resting = true; over = false; won = false; starsWon = 0; camY = 0f;
        botGate = -1; plan = null;
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Tower").transform;
        showStages = false;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Animate(0f);
    }

    void BuildScene()
    {
        var g = OiyoField.Mulberry(17);
        for (int k = 0; k < 60; k++)
        {
            var s = OiyoArcade.Prim(PrimitiveType.Cube, "Star", OiyoArcade.Glow(new Color(0.25f, 0.25f, 0.38f)), root).transform;
            s.localScale = Vector3.one * OiyoField.U(3f);
            s.position = field.W((float)g() * 360f, FY((float)g() * (st.ledges[st.ledges.Length - 1] + 600f) - 200f), 2f);
        }
        ringPivot = new Transform[gates.Length];
        barSegs = new Transform[gates.Length][];
        stars = new Transform[gates.Length];
        for (int k = 0; k < gates.Length; k++)
        {
            var gt = gates[k];
            if (gt.kind == 0)
            {
                var pivot = new GameObject("Ring").transform;
                pivot.SetParent(root, false);
                pivot.position = field.W(CX, FY(gt.y), 0f);
                const int per = 14;
                float step = 90f / per;
                for (int s = 0; s < 4; s++)
                    for (int j = 0; j < per; j++)
                    {
                        float a = (s * 90f + (j + 0.5f) * step) * Mathf.Deg2Rad;
                        var piece = OiyoArcade.Prim(PrimitiveType.Cube, "Arc", hueGlow[s], pivot).transform;
                        piece.localPosition = new Vector3(Mathf.Cos(a) * OiyoField.U(gt.r), Mathf.Sin(a) * OiyoField.U(gt.r), 0f);
                        piece.localRotation = Quaternion.Euler(0f, 0f, a * Mathf.Rad2Deg);
                        piece.localScale = new Vector3(OiyoField.U(Band * 2f), OiyoField.U(2f * Mathf.PI * gt.r / (4 * per) * 0.92f), OiyoField.U(Band * 2f));
                    }
                ringPivot[k] = pivot;
            }
            else
            {
                barSegs[k] = new Transform[6];
                for (int s = 0; s < 6; s++)
                {
                    barSegs[k][s] = OiyoArcade.Prim(PrimitiveType.Cube, "Bar", hueGlow[s % 4], root).transform;
                    barSegs[k][s].localScale = new Vector3(OiyoField.U(Seg - 2f), OiyoField.U(Band * 2f), OiyoField.U(Band * 2f));
                }
            }
            var ledge = OiyoArcade.Prim(PrimitiveType.Cube, "Ledge", OiyoArcade.Lit(new Color(0.29f, 0.31f, 0.34f), 0.4f), root).transform;
            ledge.localScale = new Vector3(OiyoField.U(44f), OiyoField.U(4f), OiyoField.U(20f));
            ledge.position = field.W(CX, FY(st.ledges[k + 1] - Ball - 2f), 0f);
            var star = new GameObject("Prism").transform;
            star.SetParent(root, false);
            for (int s = 0; s < 4; s++)
            {
                var q = OiyoArcade.Prim(PrimitiveType.Cube, "Facet", hueGlow[s], star).transform;
                q.localScale = Vector3.one * OiyoField.U(8f);
                q.localPosition = new Vector3(OiyoField.U((s % 2) * 8f - 4f), OiyoField.U((s / 2) * 8f - 4f), 0f);
            }
            star.position = field.W(CX, FY(st.ledges[k + 1]), -0.2f);
            stars[k] = star;
        }
        var start = OiyoArcade.Prim(PrimitiveType.Cube, "StartLedge", OiyoArcade.Lit(new Color(0.29f, 0.31f, 0.34f), 0.4f), root).transform;
        start.localScale = new Vector3(OiyoField.U(60f), OiyoField.U(6f), OiyoField.U(24f));
        start.position = field.W(CX, FY(-Ball - 3f), 0f);
        bead = OiyoArcade.Prim(PrimitiveType.Sphere, "Bead", hueMat[colour], root).transform;
        bead.localScale = Vector3.one * OiyoField.U(Ball * 2f);
        beadR = bead.GetComponent<Renderer>();
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("prism-hop", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        if (state == GameState.Playing && !over)
        {
            int ev = Step(dt);
            if ((ev & 1) != 0) { sparkle.Emit(field.W(CX, FY(y), -0.4f), Color.white, 14, 3f, 0.07f, 0.4f); synth.Tone(160f, 0.2f, Wave.Square, 0.14f, 90f, 8f); }
            if ((ev & 2) != 0) { sparkle.Emit(field.W(CX, FY(y), -0.4f), Hues[colour], 18, 3.5f, 0.08f, 0.5f); synth.Tone(784f, 0.12f, Wave.Triangle, 0.14f, 1175f, 8f); }
            if (over) End();
        }
        Animate(dt);
    }

    void Press()
    {
        if (state != GameState.Playing || over) return;
        Tap();
        synth.Tone(520f, 0.05f, Wave.Sine, 0.08f, 700f, 12f);
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
                    // input is read once per frame: any tap is a hop
                    bool hop = false;
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (state == GameState.Ready) { state = GameState.Playing; continue; }
                        if (OiyoArcade.OverUi(b.pos)) continue;
                        hop = true;
                    }
                    if (Input.GetKeyDown(KeyCode.Space) || Input.GetKeyDown(KeyCode.UpArrow) || confirm)
                    {
                        if (state == GameState.Ready) state = GameState.Playing;
                        else hop = true;
                    }
                    if (hop) Press();
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
            sparkle.Emit(field.W(CX, FY(y), -1f), new Color(1f, 0.85f, 0.25f), 40, 5f, 0.1f, 1f);
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
        // the camera follows the bead up, never back below its ledge
        float want = Mathf.Max(camY, st.ledges[Mathf.Min(next, gates.Length)] - 20f, y - 260f);
        camY += (want - camY) * Mathf.Min(1f, dt * 4f);
        field.Fit(50f, 10f, 0f, -camY + 20f, 560f - camY);
        for (int k = 0; k < gates.Length; k++)
        {
            var g = gates[k];
            if (g.kind == 0) ringPivot[k].localRotation = Quaternion.Euler(0f, 0f, (g.phase + g.speed * t) * Mathf.Rad2Deg);
            else
            {
                float off = g.phase + g.speed * t;
                // a bar segment s covers bar coordinates [s·SEG, (s+1)·SEG) of a 4-colour repeat; the bead's column reads off
                float first = Mathf.Floor((off - CX - Seg) / Seg) * Seg;
                for (int s = 0; s < 6; s++)
                {
                    float barX = first + s * Seg; // bar coordinate of this segment's left edge
                    float fx = CX + (barX - off) + Seg / 2f;
                    int c = Mathf.FloorToInt(Mod(barX, Seg * 4f) / Seg);
                    barSegs[k][s].position = field.W(fx, FY(g.y), 0f);
                    barSegs[k][s].GetComponent<Renderer>().sharedMaterial = hueGlow[c];
                }
            }
            stars[k].gameObject.SetActive(next <= k);
            stars[k].localRotation = Quaternion.Euler(0f, Time.time * 90f, 45f);
        }
        bead.position = field.W(CX, FY(y), -0.1f);
        beadR.sharedMaterial = safe > 0f && Mathf.FloorToInt(Time.time * 12f) % 2 == 0 ? white : hueMat[colour];
    }

    // ?oiyotest=1 prints the state to the browser console for the automated play check, with the screen point to tap
    // when a careful hopper would: wait on the ledge, climb, float inside a ring, climb on, the first such plan that
    // gets past the gate with timing to spare (the web's planner).
    bool testLog; float testT;
    int botGate = -1; float botT0, botFloatStart; float[] plan;
    static readonly float[] Floats = { 0f, 0.3f, 0.6f, 0.9f, 1.2f, 1.5f, 1.8f, 2.1f, 2.4f, 2.7f, 3f };

    bool WantsTap(float at, float by, float bv, bool rest, float wait, float flt, float floatUntil, Gate g)
    {
        if (at < botT0 + wait) return false;
        bool floating = flt > 0f && g.kind == 0 && by > g.y - 20f && at < floatUntil;
        if (floating) return bv < 0f && by < g.y;
        return rest || bv < 40f;
    }

    bool PlanWorks(float wait, float flt, float margin)
    {
        var g = gates[next];
        float st0 = t, sy = y, sv = v; bool rest = resting;
        float floatStart = -1f;
        float dt = 1f / 60f;
        for (int n = 0; n < 60 * 8; n++)
        {
            if (floatStart < 0f && g.kind == 0 && sy > g.y - 20f && flt > 0f) floatStart = st0;
            float until = floatStart < 0f ? float.PositiveInfinity : floatStart + flt;
            if (WantsTap(st0, sy, sv, rest, wait, flt, until, g)) { sv = HopV; rest = false; }
            st0 += dt;
            sv -= Gravity * dt;
            sy += sv * dt;
            if (sy <= st.ledges[next]) { sy = st.ledges[next]; sv = 0f; rest = true; }
            if (Clash(g, sy, colour, st0 - margin) || Clash(g, sy, colour, st0) || Clash(g, sy, colour, st0 + margin)) return false;
            if (next > 0 && Clash(gates[next - 1], sy, colour, st0)) return false;
            if (sy > st.ledges[next + 1] + Ball) return true;
        }
        return false;
    }

    void TestTick(float dt)
    {
        if (!testLog) return;
        bool go = false;
        if (state == GameState.Playing && !over)
        {
            if (next != botGate) { botGate = next; plan = null; botT0 = t + 0.2f; botFloatStart = -1f; }
            if (plan == null && t >= botT0 && resting)
            {
                botT0 = t;
                for (int w = 0; w < 66 && plan == null; w++)
                    foreach (float f in Floats)
                        if (PlanWorks(w * 0.1f, f, 0.1f)) { plan = new[] { w * 0.1f, f }; break; }
                plan ??= new[] { 0f, 0f };
            }
            if (plan != null)
            {
                var g = gates[next];
                if (botFloatStart < 0f && g.kind == 0 && y > g.y - 20f && plan[1] > 0f) botFloatStart = t;
                float until = botFloatStart < 0f ? float.PositiveInfinity : botFloatStart + plan[1];
                go = WantsTap(t, y, v, resting, plan[0], plan[1], until, g);
            }
        }
        if ((testT -= dt) > 0f && !go) return;
        testT = 0.05f;
        string nx = "null";
        if (go) { var sp = cam.WorldToScreenPoint(field.W(CX, FY(y) + 120f, 0f)); nx = $"[{sp.x:F1},{Screen.height - sp.y:F1}]"; }
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"t\":{t:F2},\"gate\":{next},\"of\":{gates.Length},\"hearts\":{hearts},\"hits\":{hits},\"next\":{nx},\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.75f, 0.29f, 0.86f, 0.97f);
    static readonly Color Dark = new Color(0.08f, 0.08f, 0.14f, 0.9f);
    const string HeartGlyphs = "♥♥♥";

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("{0} gates", PrismHopStages.All[i].gates.Length / 6);

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(0.95f, 0.9f, 1f), U("Prism Hop"),
                U("Tap to hop up through spinning rings and sliding bars. Only your own colour lets you through. Reach the top in time."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        var bar = new Rect(8f, 8f, w - 16f, 44f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 18f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>  " + F("Gates {0}/{1}", next, gates.Length) + "   " + F("{0}s", Mathf.Max(0, Mathf.CeilToInt(st.limit - t))) + "   " + $"<color=#ff6b6b>{HeartGlyphs.Substring(0, Mathf.Max(0, hearts))}</color><color=#ffffff44>{HeartGlyphs.Substring(0, Hearts - Mathf.Max(0, hearts))}</color>", 15, new Color(0.95f, 0.9f, 1f));
        if (OiyoArcade.Button(new Rect(w - 56f, 12f, 40f, 36f), "<b>II</b>", OiyoScreens.Slate, 16))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap to start"), U("Tap to make the bead hop!"), 150f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            string detail = won ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : "";
            string body = $"<size=14>{F("Gates {0}/{1}", next, gates.Length)}</size>";
            int r = OiyoScreens.Result(w, h, Dark, Accent, won, ResultLive, won ? U("You reached the top!") : hearts <= 0 ? U("Out of hearts") : U("Time's up"), detail, body,
                won && stageIdx < StageCount - 1 ? U("Next stage") : null, won && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
