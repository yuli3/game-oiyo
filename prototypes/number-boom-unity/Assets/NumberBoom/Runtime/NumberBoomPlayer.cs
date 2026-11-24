using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Number Boom 3D: the web Number Boom (src/components/games/NumberBoom.tsx, src/lib/games/number-boom.ts) rebuilt in
// Unity on the web's own 360 × 560 px field (OiyoField). Coins per second = base × level of the first machine × the
// product of (1 + step × level) over the rest; the next level of machine i costs cost_i × growth_i^level. A tap gives
// max(0.1 × the first machine's base, 6 % of a second's output). Pass the run's target (the most coins held at once)
// within 60 s. The 30 runs are the web's own (NumberBoomStages.cs); numbers are doubles.
public class NumberBoomPlayer : MonoBehaviour
{
    const string Slug = "number-boom";
    const int StageCount = 30;
    const float RunSeconds = 60f;
    const double TapShare = 0.06;
    const float RowY = 150f, RowH = 46f;
    static readonly Rect TapRect = new Rect(70f, 450f, 220f, 90f);
    static readonly Color[] MachineColours =
    {
        new Color(1f, 0.83f, 0.23f), new Color(1f, 0.57f, 0.17f), new Color(1f, 0.42f, 0.42f),
        new Color(0.8f, 0.36f, 0.91f), new Color(0.36f, 0.49f, 0.98f), new Color(0.13f, 0.72f, 0.81f),
    };

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of number-boom.ts) ----------------
    NumberBoomStages.Level st;
    int stageIdx, starsWon, taps;
    int[] levels;
    double coins, peak;
    float t;
    bool over, won;

    int Machines => st.b.Length;

    double RateOf(int[] lv)
    {
        double r = st.b[0] * lv[0];
        for (int i = 1; i < Machines; i++) r *= 1.0 + st.s[i] * lv[i];
        return r;
    }

    double Rate => RateOf(levels);
    double Cost(int i) => st.c[i] * System.Math.Pow(st.g[i], levels[i]);

    void NewRun()
    {
        levels = new int[Machines];
        levels[0] = 1;
        coins = st.start; peak = st.start; t = 0f; taps = 0; over = false; won = false;
    }

    void Check()
    {
        if (coins > peak) peak = coins;
        if (coins >= st.target) { over = true; won = true; }
    }

    bool Buy(int i)
    {
        if (over || i < 0 || i >= Machines) return false;
        double c = Cost(i);
        if (coins < c) return false;
        coins -= c;
        levels[i]++;
        Check();
        return true;
    }

    double Tap()
    {
        if (over) return 0;
        double g = System.Math.Max(st.b[0] * 0.1, Rate * TapShare);
        coins += g;
        taps++;
        Check();
        return g;
    }

    void Step(float dt)
    {
        if (over) return;
        t += dt;
        coins += Rate * dt;
        Check();
        if (!over && t >= RunSeconds) over = true;
    }

    int BestBuy()
    {
        int best = -1;
        double score = double.NegativeInfinity, now = Rate;
        for (int i = 0; i < Machines; i++)
        {
            var lv = (int[])levels.Clone();
            lv[i]++;
            double s = (RateOf(lv) - now) / Cost(i);
            if (s > score) { score = s; best = i; }
        }
        return best;
    }

    int StarsFor()
    {
        if (!won) return 0;
        if (t <= st.par * 1.1f) return 3;
        if (t <= (st.par + RunSeconds) / 2f) return 2;
        return 1;
    }

    // a big number, short: 만·억·조·경·해·자·양·구 in Korean, Chinese and Japanese, K·M·B·T… elsewhere
    static readonly double[] EastD = { 1e32, 1e28, 1e24, 1e20, 1e16, 1e12, 1e8, 1e4 };
    static readonly Dictionary<string, string[]> EastU = new Dictionary<string, string[]>
    {
        { "ko", new[] { "구", "양", "자", "해", "경", "조", "억", "만" } },
        { "ja", new[] { "溝", "穣", "秭", "垓", "京", "兆", "億", "万" } },
        { "zh", new[] { "沟", "穰", "秭", "垓", "京", "兆", "亿", "万" } },
    };
    static readonly double[] WestD = { 1e33, 1e30, 1e27, 1e24, 1e21, 1e18, 1e15, 1e12, 1e9, 1e6, 1e3 };
    static readonly string[] WestU = { "Dc", "No", "Oc", "Sp", "Sx", "Qi", "Qa", "T", "B", "M", "K" };

    static string Fmt(double x) => x >= 100 ? x.ToString("F0") : x >= 10 ? x.ToString("F1") : x.ToString("F2");

    static string Short(double v)
    {
        string lang = OiyoArcade.Lang;
        if (EastU.TryGetValue(lang, out var units))
        {
            for (int i = 0; i < EastD.Length; i++) if (v >= EastD[i]) return Fmt(v / EastD[i]) + units[i];
        }
        else for (int i = 0; i < WestD.Length; i++) if (v >= WestD[i]) return Fmt(v / WestD[i]) + WestU[i];
        return v >= 100 ? System.Math.Floor(v).ToString("F0") : Fmt(v);
    }

    // ---------------- Scene ----------------
    OiyoField field;
    Camera cam;
    Transform root, progress, clock;
    Renderer[] rowR;
    Material rowOn, rowOff, tapMat, tapEdge, progMat, clockMat, pipeMat;
    Bursts sparks;
    Synth synth;
    bool showStages;
    float tapPunch;

    Rect RowRect(int i) => new Rect(14f, RowY + i * (RowH + 8f), 332f, RowH);

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(360f, 560f, new Color(0.1f, 0.11f, 0.18f));
        cam = field.Cam;
        OiyoField.Lights(new Color(0.6f, 0.6f, 0.7f), 0.8f, 40f, -25f);
        sparks = new Bursts(transform, 0.6f);
        synth = new Synth(gameObject);
        rowOn = OiyoArcade.Lit(new Color(0.17f, 0.18f, 0.29f), 0.4f, OiyoArcade.Art("NB/panel", true));
        rowOff = OiyoArcade.Lit(new Color(0.13f, 0.13f, 0.22f), 0.3f, OiyoArcade.Art("NB/panel", true));
        tapMat = OiyoArcade.LitGlow(new Color(1f, 0.42f, 0.42f), new Color(0.4f, 0.05f, 0.05f), 0.5f);
        tapEdge = OiyoArcade.Lit(new Color(0.88f, 0.19f, 0.19f), 0.4f);
        progMat = OiyoArcade.Glow(new Color(1f, 0.83f, 0.23f));
        clockMat = OiyoArcade.Lit(new Color(1f, 0.42f, 0.42f), 0.3f);
        pipeMat = OiyoArcade.Lit(new Color(0.29f, 0.31f, 0.34f), 0.6f, null, 0.5f);
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int i, bool ready = true)
    {
        stageIdx = Mathf.Clamp(i, 0, StageCount - 1);
        StopAllCoroutines();
        st = NumberBoomStages.All[stageIdx];
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Factory").transform;
        NewRun();
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
        rowR = new Renderer[Machines];
        for (int i = 0; i < Machines; i++)
        {
            var r = RowRect(i);
            rowR[i] = Box(rowOn, r.center.x, r.center.y, r.width, r.height, -0.1f, 0.3f).GetComponent<Renderer>();
            Box(OiyoArcade.Lit(MachineColours[i], 0.5f), r.x + 4f, r.center.y, 8f, r.height, -0.2f, 0.35f);
            if (i < Machines - 1) Box(pipeMat, 180f, r.yMax + 4f, 6f, 8f, 0f, 0.1f);
        }
        Box(tapEdge, TapRect.center.x, TapRect.center.y + 3f, TapRect.width, TapRect.height - 6f, 0f, 0.4f);
        Box(tapMat, TapRect.center.x, TapRect.center.y - 3f, TapRect.width, TapRect.height - 12f, -0.2f, 0.3f);
        Box(OiyoArcade.Lit(new Color(1f, 1f, 1f, 1f), 0.1f), 180f, 107f, 320f, 10f, 0.1f, 0.05f).GetComponent<Renderer>().material.color = new Color(0.25f, 0.26f, 0.35f);
        progress = Box(progMat, 0f, 0f, 1f, 10f, -0.05f, 0.08f);
        clock = Box(clockMat, 0f, 0f, 1f, 4f, -0.05f, 0.05f);
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("number-boom", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        if (state == GameState.Playing)
        {
            Step(dt);
            if (over) End();
        }
        tapPunch = Mathf.Max(0f, tapPunch - dt * 6f);
        msgT = Mathf.Max(0f, msgT - dt);
        Animate(dt);
    }

    string msg = ""; float msgT; Color msgC = Color.white;

    void DoTap()
    {
        double g = Tap();
        msg = "+" + Short(g); msgT = 0.5f; msgC = new Color(1f, 0.88f, 0.4f);
        tapPunch = 1f;
        synth.Tone(660f + (taps % 5) * 60f, 0.03f, Wave.Square, 0.06f, 0f, 20f);
        if (over) End();
    }

    void DoBuy(int i)
    {
        if (!Buy(i)) return;
        var r = RowRect(i);
        sparks.Emit(field.W(r.xMax - 40f, r.center.y, -0.5f), MachineColours[i], 8, 3f, 0.06f, 0.4f);
        synth.Tone(440f + i * 110f, 0.08f, Wave.Triangle, 0.14f, 880f + i * 110f, 8f);
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
                    // taps are read once per frame: the big button taps, a machine's row buys its next level
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (OiyoArcade.OverUi(b.pos) || !field.ToField(b.pos, out Vector2 f)) continue;
                        if (state == GameState.Ready) state = GameState.Playing;
                        if (TapRect.Contains(f)) DoTap();
                        else for (int i = 0; i < Machines; i++) if (RowRect(i).Contains(f)) DoBuy(i);
                        if (over) break;
                    }
                    if (Input.GetKeyDown(KeyCode.Space)) { if (state == GameState.Ready) state = GameState.Playing; DoTap(); }
                    for (int i = 0; i < Mathf.Min(6, Machines); i++) if (Input.GetKeyDown(KeyCode.Alpha1 + i)) { if (state == GameState.Ready) state = GameState.Playing; DoBuy(i); }
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
        if (won)
        {
            starsWon = StarsFor();
            state = GameState.Victory;
            OiyoArcade.Record(Slug, stageIdx, starsWon, Mathf.RoundToInt(RunSeconds - t), StageCount);
            sparks.Emit(field.W(180f, 70f, -0.8f), new Color(1f, 0.85f, 0.25f), 40, 5f, 0.1f, 1f);
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
        field.Fit(80f, 10f, 0f);
        float prog = Mathf.Clamp01((float)(System.Math.Log10(1.0 + peak) / System.Math.Log10(1.0 + st.target)));
        progress.position = field.W(20f + 160f * prog, 107f, -0.05f);
        progress.localScale = new Vector3(OiyoField.U(Mathf.Max(1f, 320f * prog)), OiyoField.U(10f), 0.08f);
        float left = Mathf.Max(0f, 1f - t / RunSeconds);
        clock.position = field.W(20f + 160f * left, 122f, -0.05f);
        clock.localScale = new Vector3(OiyoField.U(Mathf.Max(1f, 320f * left)), OiyoField.U(4f), 0.05f);
        for (int i = 0; i < Machines; i++) rowR[i].sharedMaterial = coins >= Cost(i) && !over ? rowOn : rowOff;
    }

    // ?oiyotest=1 prints the state to the browser console for the automated play check: the clock, coins and target,
    // the best buy (the upgrade adding most coins per second per coin) and whether it can be afforded, and the screen
    // points (px from the top-left) of every machine's row and of the big button.
    bool testLog; float testT;
    Vector2 Scr(Vector2 f) { var sp = cam.WorldToScreenPoint(field.W(f.x, f.y, -0.3f)); return new Vector2(sp.x, Screen.height - sp.y); }
    void TestTick(float dt)
    {
        if (!testLog || (testT -= dt) > 0f) return;
        testT = 0.05f;
        int best = BestBuy();
        var rows = new System.Text.StringBuilder();
        for (int i = 0; i < Machines; i++) { if (i > 0) rows.Append(','); var p = Scr(RowRect(i).center); rows.Append('[').Append(p.x.ToString("F1")).Append(',').Append(p.y.ToString("F1")).Append(']'); }
        var tp = Scr(TapRect.center);
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"t\":{t:F2},\"coins\":{coins:E3},\"peak\":{peak:E3},\"target\":{st.target:E3},\"best\":{best},\"afford\":{(best >= 0 && coins >= Cost(best) ? "true" : "false")},\"rows\":[{rows}],\"tap\":[{tp.x:F1},{tp.y:F1}],\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.88f, 0.19f, 0.19f, 0.97f);
    static readonly Color Dark = new Color(0.07f, 0.07f, 0.13f, 0.92f);

    string StageTitle(int i) => F("Run {0}", i + 1) + " · " + F("Target {0}", Short(NumberBoomStages.All[i].target));

    void OnGUI()
    {
        OiyoArcade.Begin();
        float w = OiyoArcade.W, h = OiyoArcade.H;
        if (state == GameState.Menu)
        {
            if (showStages)
            {
                int pick = OiyoScreens.Stages(w, h, Dark, Accent, Slug, StageCount, U("Choose a run"), U("Back"), U("Stage"));
                if (pick == -2) showStages = false; else if (pick >= 0) LoadStage(pick);
                return;
            }
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(1f, 0.92f, 0.5f), U("Number Boom"),
                U("Thirty one-minute runs. The first machine makes coins, the others multiply them: spend where it pays most, drum the button, and pass the target."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        var bar = new Rect(8f, 8f, w - 16f, 64f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Shadowed(new Rect(20f, 8f, w - 90f, 40f), "<b>" + Short(coins) + "</b>", 30, Color.white);
        OiyoArcade.Text(new Rect(20f, 46f, w - 90f, 22f), F("{0}/s", Short(Rate)) + " · " + F("Target {0}", Short(st.target)) + " · " + F("{0}s", Mathf.Max(0, Mathf.CeilToInt(RunSeconds - t))), 13, new Color(0.85f, 0.87f, 0.9f));
        if (OiyoArcade.Button(new Rect(w - 60f, 14f, 44f, 44f), "<b>II</b>", OiyoScreens.Slate, 18))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        for (int i = 0; i < Machines; i++)
        {
            var r = RowRect(i);
            var g = OiyoArcade.ToGui(cam.WorldToScreenPoint(field.W(r.x + 16f, r.y + 6f, -0.4f)));
            var g2 = OiyoArcade.ToGui(cam.WorldToScreenPoint(field.W(r.xMax, r.yMax, -0.4f)));
            string effect = i == 0 ? "+" + Short(st.b[0] * levels[0]) + "/s" : "×" + (1.0 + st.s[i] * levels[i]).ToString("F2");
            OiyoArcade.Text(new Rect(g.x, g.y, g2.x - g.x, 20f), $"<b>{i + 1}  Lv{levels[i]}  {effect}</b>", 14, Color.white);
            OiyoArcade.Text(new Rect(g.x, g.y + 20f, g2.x - g.x, 18f), "-> " + Short(Cost(i)), 12, coins >= Cost(i) ? new Color(0.55f, 0.91f, 0.6f) : new Color(0.53f, 0.56f, 0.59f));
        }
        {
            var g = OiyoArcade.ToGui(cam.WorldToScreenPoint(field.W(TapRect.center.x, TapRect.center.y - 6f, -0.5f)));
            OiyoArcade.Shadowed(new Rect(g.x - 100f, g.y - 18f - tapPunch * 3f, 200f, 36f), "<b>" + U("TAP") + "</b>", 26, Color.white, TextAnchor.MiddleCenter);
            if (msgT > 0f) OiyoArcade.Shadowed(new Rect(g.x - 100f, g.y - 70f - (0.5f - msgT) * 60f, 200f, 24f), "<b>" + msg + "</b>", 15, msgC, TextAnchor.MiddleCenter);
        }
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap to start"), U("From hundreds to 30 zeros in half an hour."), 200f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            bool w0 = state == GameState.Victory;
            string detail = w0 ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : "";
            string body = $"<size=14>{F("{0} collected", Short(peak))}</size>";
            int r = OiyoScreens.Result(w, h, Dark, Accent, w0, ResultLive, w0 ? U("Boom! Target smashed") : U("The minute is up"), detail, body,
                w0 && stageIdx < StageCount - 1 ? U("Next run") : null, w0 && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
