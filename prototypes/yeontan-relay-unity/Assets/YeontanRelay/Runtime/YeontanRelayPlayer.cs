using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Yeontan Relay 3D: the web Yeontan Relay (src/components/games/YeontanRelay.tsx, src/lib/games/yeontan-relay.ts)
// rebuilt in Unity on the web's own 360 × 560 px field (OiyoField). Volunteers stand up a stair from (60, 470)
// to (290, 140). Tapping one passes their briquette to the next (0.25 s in the air; from the top it goes into
// the shed). After a catch each needs their grip time (their usual time × 0.5–1.6, varying catch to catch)
// before passing — earlier and it breaks — and after a pass their rest time before catching again; held
// longer than their strength allows, it breaks. The bottom one takes briquettes off the truck's pile. Fill the
// shed before the truck leaves. The 30 lines are the web's own (YeontanRelayStages.cs).
public class YeontanRelayPlayer : MonoBehaviour
{
    const string Slug = "yeontan-relay";
    const int StageCount = 30;
    const float Flight = 0.25f;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of yeontan-relay.ts) ----------------
    YeontanRelayStages.Level st;
    int stageIdx, n, pile, unloaded, delivered, broken, starsWon;
    float t;
    bool[] holding;
    float[] heldSince, readyAt;
    int[] catches;
    struct Fly { public int to; public float at; }
    readonly List<Fly> inFlight = new List<Fly>();
    bool over, won;

    float Turn(int i) => st.line[i * 3];
    float Reset(int i) => st.line[i * 3 + 1];
    float Hold(int i) => st.line[i * 3 + 2];
    float GripTime(int i, int k)
    {
        double x = System.Math.Sin((k + 1) * 12.9898 + (i + 1) * 78.233 + stageIdx * 3.1) * 43758.5453;
        return Turn(i) * (0.5f + 1.1f * (float)(x - System.Math.Floor(x)));
    }

    void NewAlley()
    {
        n = st.line.Length / 3;
        holding = new bool[n]; heldSince = new float[n]; readyAt = new float[n]; catches = new int[n];
        inFlight.Clear();
        t = 0f; pile = 0; unloaded = 0; delivered = 0; broken = 0; over = false; won = false;
    }

    bool CanReceive(int i)
    {
        if (i >= n) return true;
        if (holding[i]) return false;
        foreach (var f in inFlight) if (f.to == i) return false;
        return readyAt[i] <= t + Flight;
    }

    // "passed", "fumbled", "blocked" or null
    string Pass(int i)
    {
        if (over || i < 0 || i >= n || !holding[i]) return null;
        if (t < readyAt[i]) { holding[i] = false; broken++; readyAt[i] = t + Reset(i); return "fumbled"; }
        if (!CanReceive(i + 1)) return "blocked";
        holding[i] = false;
        readyAt[i] = t + Reset(i);
        inFlight.Add(new Fly { to = i + 1, at = t + Flight });
        return "passed";
    }

    int deliveredNow;
    readonly List<int> droppedNow = new List<int>();
    bool Step(float dt)
    {
        deliveredNow = 0; droppedNow.Clear();
        if (over) return false;
        t += dt;
        while (unloaded < st.arrivals.Length && st.arrivals[unloaded] <= t) { unloaded++; pile++; }
        for (int k = inFlight.Count - 1; k >= 0; k--)
        {
            var f = inFlight[k];
            if (t < f.at) continue;
            if (f.to >= n) { delivered++; deliveredNow++; }
            else { holding[f.to] = true; heldSince[f.to] = f.at; readyAt[f.to] = f.at + GripTime(f.to, catches[f.to]++); }
            inFlight.RemoveAt(k);
        }
        bool coming0 = false;
        foreach (var f in inFlight) if (f.to == 0) coming0 = true;
        if (pile > 0 && !holding[0] && !coming0 && t >= readyAt[0])
        {
            pile--; holding[0] = true; heldSince[0] = t; readyAt[0] = t + GripTime(0, catches[0]++);
        }
        for (int i = 0; i < n; i++)
            if (holding[i] && t - heldSince[i] > Hold(i)) { holding[i] = false; broken++; readyAt[i] = t + Reset(i); droppedNow.Add(i); }
        if (delivered >= st.need) { over = true; won = true; }
        else if (t >= st.time) over = true;
        return over;
    }

    int StarsFor()
    {
        if (!won) return 0;
        if (broken == 0 && t <= st.time * 0.85f) return 3;
        if (broken <= 2) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    OiyoField field;
    Camera cam;
    Transform root;
    readonly List<Transform> people = new List<Transform>(), coals = new List<Transform>(), lights = new List<Transform>(), flying = new List<Transform>();
    readonly List<Renderer> lightR = new List<Renderer>();
    Material personMat, stoneMat, coalMat, wallMat, truckMat, shedMat, redMat, greenMat, offMat;
    Bursts bursts;
    Synth synth;
    bool showStages;

    Vector2 Spot(int i)
    {
        float f = n == 1 ? 0f : i / (float)(n - 1);
        return new Vector2(60f + f * 230f, 470f - f * 330f);
    }

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(360f, 560f, new Color(0.81f, 0.85f, 0.89f));
        cam = field.Cam;
        OiyoField.Lights(new Color(0.6f, 0.62f, 0.66f), 0.8f, 40f, -30f);
        bursts = new Bursts(transform, 1.4f);
        synth = new Synth(gameObject);
        personMat = OiyoField.Sprite("YR/volunteer");
        stoneMat = OiyoArcade.Lit(Color.white, 0.2f, OiyoArcade.Art("YR/stone", true));
        coalMat = OiyoArcade.Lit(new Color(0.13f, 0.14f, 0.16f), 0.2f);
        wallMat = OiyoArcade.Lit(new Color(0.68f, 0.71f, 0.74f), 0.1f);
        truckMat = OiyoArcade.Lit(new Color(0.11f, 0.49f, 0.84f), 0.5f);
        shedMat = OiyoArcade.Lit(new Color(0.42f, 0.27f, 0.14f), 0.2f);
        redMat = OiyoArcade.Glow(new Color(0.98f, 0.32f, 0.32f));
        greenMat = OiyoArcade.Glow(new Color(0.25f, 0.75f, 0.34f));
        offMat = OiyoArcade.Glow(new Color(0.9f, 0.9f, 0.9f));
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int i, bool ready = true)
    {
        stageIdx = Mathf.Clamp(i, 0, StageCount - 1);
        StopAllCoroutines();
        st = YeontanRelayStages.All[stageIdx];
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Alley").transform;
        NewAlley();
        starsWon = 0;
        showStages = false;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Animate(0f);
    }

    Transform Coal(string name)
    {
        var c = OiyoArcade.Prim(PrimitiveType.Cylinder, name, coalMat, root).transform;
        c.localScale = new Vector3(OiyoField.U(18f), OiyoField.U(8f), OiyoField.U(18f));
        return c;
    }

    void BuildScene()
    {
        foreach (float x in new[] { 10f, 345f })
        {
            var wall = OiyoArcade.Prim(PrimitiveType.Cube, "Wall", wallMat, root);
            wall.transform.position = field.W(x, 280f, 0.2f);
            wall.transform.localScale = new Vector3(OiyoField.U(40f), OiyoField.U(600f), 1f);
        }
        for (int k = 0; k < 24; k++)
        {
            float f = k / 23f;
            var step = OiyoArcade.Prim(PrimitiveType.Cube, "Step", stoneMat, root);
            step.transform.position = field.W(75f + f * 240f, 508f - f * 370f, 0.1f);
            step.transform.localScale = new Vector3(OiyoField.U(80f), OiyoField.U(16f), 1.2f);
        }
        var truck = OiyoArcade.Prim(PrimitiveType.Cube, "Truck", truckMat, root);
        truck.transform.position = field.W(60f, 530f, -0.2f);
        truck.transform.localScale = new Vector3(OiyoField.U(110f), OiyoField.U(44f), 1f);
        var shed = OiyoArcade.Prim(PrimitiveType.Cube, "Shed", shedMat, root);
        shed.transform.position = field.W(317f, 86f, 0f);
        shed.transform.localScale = new Vector3(OiyoField.U(70f), OiyoField.U(60f), 1f);
        people.Clear(); coals.Clear(); lights.Clear(); lightR.Clear(); flying.Clear();
        for (int i = 0; i < n; i++)
        {
            var p = Spot(i);
            var q = OiyoField.Quad("Volunteer", personMat, root, 30f, 36f);
            q.position = field.W(p.x, p.y - 8f, -0.9f);
            people.Add(q);
            var c = Coal("Held");
            c.position = field.W(p.x, p.y - 6f, -1.1f);
            coals.Add(c);
            var l = OiyoArcade.Prim(PrimitiveType.Sphere, "Light", offMat, root).transform;
            l.position = field.W(p.x, p.y - 36f, -1f);
            l.localScale = Vector3.one * OiyoField.U(12f);
            lights.Add(l); lightR.Add(l.GetComponent<Renderer>());
        }
        for (int k = 0; k < 12; k++) { var f = Coal("Flying"); f.gameObject.SetActive(false); flying.Add(f); }
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("yeontan-relay", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        if (state == GameState.Playing)
        {
            bool end = Step(dt);
            if (deliveredNow > 0) synth.Tone(523f, 0.1f, Wave.Triangle, 0.14f, 784f, 10f);
            foreach (int i in droppedNow) Broke(i, U("Arms gave out"));
            if (end) End();
        }
        msgT = Mathf.Max(0f, msgT - dt);
        Animate(dt);
    }

    void Broke(int i, string text)
    {
        var p = Spot(i);
        Toast(text, new Color(1f, 0.45f, 0.4f));
        bursts.Emit(field.W(p.x, p.y, -0.8f), new Color(0.15f, 0.15f, 0.17f), 14, 2f, 0.1f, 0.6f);
        synth.Tone(180f, 0.2f, Wave.Noise, 0.12f, 90f, 8f);
    }

    string msg = ""; float msgT; Color msgC = Color.white;
    void Toast(string m, Color c) { msg = m; msgT = 0.8f; msgC = c; }

    void Tap(int i)
    {
        if (state == GameState.Ready) { state = GameState.Playing; return; }
        string r = Pass(i);
        if (r == "passed") synth.Tone(660f, 0.05f, Wave.Triangle, 0.1f, 880f, 14f);
        else if (r == "fumbled") Broke(i, U("Oops, it slipped!"));
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
                    // taps are read once per frame: the nearest volunteer to the finger passes up
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (OiyoArcade.OverUi(b.pos) || !field.ToField(b.pos, out Vector2 f)) continue;
                        int best = 0; float bd = float.MaxValue;
                        for (int i = 0; i < n; i++) { float d = Vector2.Distance(Spot(i), f); if (d < bd) { bd = d; best = i; } }
                        Tap(best);
                    }
                    for (int i = 0; i < n && i < 9; i++) if (Input.GetKeyDown(KeyCode.Alpha1 + i)) Tap(i);
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
                if (!showStages && (confirm || Input.GetKeyDown(KeyCode.Space))) LoadStage(stageIdx);
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
            OiyoArcade.Record(Slug, stageIdx, starsWon, delivered, StageCount);
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
        field.Fit(80f, 10f, 4f);
        for (int i = 0; i < n; i++)
        {
            coals[i].gameObject.SetActive(holding[i]);
            lightR[i].sharedMaterial = !holding[i] ? offMat : t >= readyAt[i] ? greenMat : redMat;
        }
        for (int k = 0; k < flying.Count; k++)
        {
            bool on = k < inFlight.Count;
            flying[k].gameObject.SetActive(on);
            if (!on) continue;
            var f = inFlight[k];
            var from = Spot(f.to - 1);
            var to = f.to >= n ? new Vector2(317f, 80f) : Spot(f.to);
            float p = 1f - Mathf.Max(0f, f.at - t) / Flight;
            var at = Vector2.Lerp(from, to, p);
            flying[k].position = field.W(at.x, at.y - 6f - Mathf.Sin(p * Mathf.PI) * 18f, -1.1f);
        }
    }

    // ?oiyotest=1 prints the state to the browser console for the automated play check: time, every volunteer
    // (holding, ready to pass, can receive, screen x, y from the top-left), the shed, the pile and the mark.
    bool testLog; float testT;
    void TestTick(float dt)
    {
        if (!testLog || (testT -= dt) > 0f) return;
        testT = 0.02f;
        var sb = new System.Text.StringBuilder();
        for (int i = 0; i < n; i++)
        {
            if (i > 0) sb.Append(',');
            var p = Spot(i);
            var sp = cam.WorldToScreenPoint(field.W(p.x, p.y, -0.4f));
            sb.Append('[').Append(holding[i] ? 1 : 0).Append(',').Append(holding[i] && t >= readyAt[i] ? 1 : 0).Append(',').Append(CanReceive(i + 1) ? 1 : 0).Append(',')
              .Append(readyAt[i].ToString("F3")).Append(',').Append(sp.x.ToString("F1")).Append(',').Append((Screen.height - sp.y).ToString("F1")).Append(']');
        }
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"t\":{t:F3},\"people\":[{sb}],\"delivered\":{delivered},\"broken\":{broken},\"pile\":{pile},\"need\":{st.need},\"time\":{st.time:F1},\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.91f, 0.35f, 0.05f, 0.97f);
    static readonly Color Dark = new Color(0.1f, 0.12f, 0.16f, 0.88f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("Goal {0}", YeontanRelayStages.All[i].need);

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(1f, 0.85f, 0.6f), U("Yeontan Relay"),
                U("Pass coal briquettes hand to hand up the stairs. Tap someone with a green light to pass it up; on red it slips and breaks."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        var bar = new Rect(8f, 8f, w - 16f, 64f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 12f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>  " + F("{0}s left", Mathf.Max(0, Mathf.CeilToInt(st.time - t))), 15, new Color(1f, 0.85f, 0.6f));
        OiyoArcade.Text(new Rect(20f, 36f, w - 90f, 24f), F("Shed {0}/{1}", delivered, st.need), 16, Color.white);
        if (OiyoArcade.Button(new Rect(w - 60f, 14f, 44f, 44f), "<b>II</b>", OiyoScreens.Slate, 18))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (state == GameState.Playing || state == GameState.Ready)
            for (int i = 0; i < n; i++)
            {
                // strength left under each person holding a briquette, and their number
                var p = Spot(i);
                var g = OiyoArcade.ToGui(cam.WorldToScreenPoint(field.W(p.x, p.y + 24f, -0.6f)));
                if (holding[i])
                {
                    float left = 1f - Mathf.Min(1f, (t - heldSince[i]) / Hold(i));
                    OiyoArcade.Bar(new Rect(g.x - 16f, g.y, 32f, 5f), left, new Color(0f, 0f, 0f, 0.4f), left > 0.35f ? new Color(0.98f, 0.69f, 0.02f) : new Color(0.98f, 0.32f, 0.32f));
                }
                var nl = OiyoArcade.ToGui(cam.WorldToScreenPoint(field.W(p.x - 24f, p.y, -0.6f)));
                OiyoArcade.Shadowed(new Rect(nl.x - 10f, nl.y - 8f, 20f, 16f), (i + 1).ToString(), 12, Color.white, TextAnchor.MiddleCenter);
            }
        if (msgT > 0f) OiyoArcade.Shadowed(new Rect(8f, 80f, w - 16f, 36f), msg, 20, msgC, TextAnchor.MiddleCenter);
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap to start"), U("Hand to hand, pass on green."), 220f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            bool w0 = state == GameState.Victory;
            string detail = w0 ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : F("Shed {0}/{1}", delivered, st.need);
            string body = $"<size=14>{F("{0} carried · {1} broken", delivered, broken)}</size>";
            int r = OiyoScreens.Result(w, h, Dark, Accent, w0, ResultLive, w0 ? U("The coal shed is full!") : U("The truck had to leave"), detail, body,
                w0 && stageIdx < StageCount - 1 ? U("Next stage") : null, w0 && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
