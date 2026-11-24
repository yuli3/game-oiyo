using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Crane Count 3D: the web Crane Count (src/components/games/CraneCount.tsx, src/lib/games/crane-count.ts) rebuilt in
// Unity on the web's own 360 × 560 px field (OiyoField). Each flock crosses the sky in its own few seconds, from
// x = −130 to 490 (or back), its birds at their offsets from the flock's centre. When it has gone, the count is set
// with the −5 −1 +1 +5 plates and handed in with Record. A count within round(red cranes × tolerance) (at least 1)
// is right; grey white-naped cranes do not count. Get the mark's worth of flocks right. The 30 census days are the
// web's own (CraneCountStages.cs).
public class CraneCountPlayer : MonoBehaviour
{
    const string Slug = "crane-count";
    const int StageCount = 30;
    const float SkyW = 360f;
    static readonly Rect[] Plates =
    {
        new Rect(8f, 486f, 62f, 50f), new Rect(74f, 486f, 62f, 50f), new Rect(140f, 486f, 80f, 50f), new Rect(224f, 486f, 62f, 50f), new Rect(290f, 486f, 62f, 50f),
    };
    static readonly int[] PlateStep = { -5, -1, 0, 1, 5 };

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of crane-count.ts) ----------------
    CraneCountStages.Level st;
    int stageIdx, starsWon, idx, good, dial = 10;
    bool answering, over, won;
    float t;
    readonly List<int> answers = new List<int>();

    CraneCountStages.Flock Cur => st.flocks[Mathf.Min(idx, st.flocks.Length - 1)];
    static int Reds(CraneCountStages.Flock f) { int n = 0; foreach (int r in f.red) n += r; return n; }
    static int RoundJs(float v) => Mathf.FloorToInt(v + 0.5f);
    int Allowed(CraneCountStages.Flock f) => Mathf.Max(1, RoundJs(Reds(f) * st.tolerance));
    bool Close(CraneCountStages.Flock f, int n) => Mathf.Abs(n - Reds(f)) <= Allowed(f);

    Vector2 BirdAt(CraneCountStages.Flock f, int b, float time)
    {
        float span = SkyW + 260f;
        float p = Mathf.Clamp01(time / f.time);
        float cx = f.dir > 0 ? -130f + span * p : SkyW + 130f - span * p;
        return new Vector2(cx + f.dx[b] * f.dir, f.y + f.dy[b] + Mathf.Sin(time * 2f + f.phase[b]) * 3f);
    }

    void NewCensus() { idx = 0; t = 0f; good = 0; answers.Clear(); answering = false; over = false; won = false; }

    // returns true when the flock has just gone
    bool Step(float dt)
    {
        if (over || answering) return false;
        t += dt;
        if (t >= Cur.time) { answering = true; return true; }
        return false;
    }

    bool Answer(int n)
    {
        bool ok = Close(Cur, n);
        answers.Add(n);
        if (ok) good++;
        idx++;
        t = 0f;
        answering = false;
        if (idx >= st.flocks.Length) { over = true; won = good >= st.need; }
        return ok;
    }

    int StarsFor()
    {
        if (!won) return 0;
        int exact = 0;
        for (int i = 0; i < st.flocks.Length; i++) if (answers[i] == Reds(st.flocks[i])) exact++;
        if (good == st.flocks.Length && exact >= Mathf.CeilToInt(st.flocks.Length / 2f)) return 3;
        if (good == st.flocks.Length) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    OiyoField field;
    Camera cam;
    Transform root, flockRoot, timer;
    readonly List<Transform> birds = new List<Transform>();
    readonly List<Renderer> birdR = new List<Renderer>();
    Material redUp, redDown, greyUp, greyDown, ridgeMat, fieldMat, plateMat, recordMat, timerMat;
    Bursts feathers;
    Synth synth;
    bool showStages;
    int shownFlock = -1;

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(360f, 560f, new Color(0.65f, 0.85f, 1f));
        cam = field.Cam;
        OiyoField.Lights(new Color(0.75f, 0.8f, 0.88f), 0.6f, 30f, -20f);
        feathers = new Bursts(transform, 0.3f);
        synth = new Synth(gameObject);
        redUp = OiyoField.Sprite("CC/red_up");
        redDown = OiyoField.Sprite("CC/red_down");
        greyUp = OiyoField.Sprite("CC/grey_up");
        greyDown = OiyoField.Sprite("CC/grey_down");
        ridgeMat = OiyoArcade.Lit(new Color(0.45f, 0.63f, 0.77f), 0.1f);
        fieldMat = OiyoArcade.Lit(Color.white, 0.1f, OiyoArcade.Art("CC/field", true));
        plateMat = OiyoArcade.Lit(new Color(0.11f, 0.24f, 0.35f), 0.3f);
        recordMat = OiyoArcade.Lit(new Color(0.11f, 0.49f, 0.84f), 0.4f);
        timerMat = OiyoArcade.Lit(new Color(0.11f, 0.49f, 0.84f), 0.3f);
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int i, bool ready = true)
    {
        stageIdx = Mathf.Clamp(i, 0, StageCount - 1);
        StopAllCoroutines();
        st = CraneCountStages.All[stageIdx];
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Census").transform;
        NewCensus();
        starsWon = 0;
        showStages = false;
        shownFlock = -1;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Animate(0f);
    }

    void BuildScene()
    {
        for (int k = -10; k < 16; k++)
        {
            var ridge = OiyoArcade.Prim(PrimitiveType.Cube, "Ridge", ridgeMat, root);
            ridge.transform.position = field.W(k * 80f - 20f, 420f, 1.2f);
            ridge.transform.rotation = Quaternion.Euler(0f, 0f, 45f);
            ridge.transform.localScale = new Vector3(OiyoField.U(70f + ((k + 30) % 3) * 18f), OiyoField.U(70f + ((k + 30) % 3) * 18f), 0.4f);
        }
        var ground = OiyoArcade.Prim(PrimitiveType.Cube, "Fields", fieldMat, root);
        ground.transform.position = field.W(180f, 505f, 0.6f);
        ground.transform.localScale = new Vector3(OiyoField.U(2400f), OiyoField.U(130f), 0.4f);
        for (int p = 0; p < Plates.Length; p++)
        {
            var q = OiyoArcade.Prim(PrimitiveType.Cube, "Plate", p == 2 ? recordMat : plateMat, root);
            q.transform.position = field.W(Plates[p].center.x, Plates[p].center.y, -0.2f);
            q.transform.localScale = new Vector3(OiyoField.U(Plates[p].width), OiyoField.U(Plates[p].height), 0.3f);
        }
        timer = OiyoArcade.Prim(PrimitiveType.Cube, "Timer", timerMat, root).transform;
        flockRoot = new GameObject("Flock").transform;
        flockRoot.SetParent(root);
    }

    void ShowFlock()
    {
        shownFlock = idx;
        foreach (Transform c in flockRoot) Destroy(c.gameObject);
        birds.Clear();
        birdR.Clear();
        var f = Cur;
        for (int b = 0; b < f.red.Length; b++)
        {
            var q = OiyoField.Quad("Crane", f.red[b] == 1 ? redUp : greyUp, flockRoot, 24f, 17f);
            if (f.dir < 0) q.localScale = new Vector3(-q.localScale.x, q.localScale.y, 1f);
            birds.Add(q);
            birdR.Add(q.GetComponent<Renderer>());
        }
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("crane-count", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        if (state == GameState.Playing && Step(dt)) synth.Tone(660f, 0.08f, Wave.Triangle, 0.12f, 0f, 10f);
        msgT = Mathf.Max(0f, msgT - dt);
        Animate(dt);
    }

    string msg = ""; float msgT; Color msgC = Color.white;
    void Toast(string m, Color c) { msg = m; msgT = 1.3f; msgC = c; }

    void SetDial(int v) { dial = Mathf.Clamp(v, 0, 199); synth.Tone(520f + dial, 0.04f, Wave.Triangle, 0.08f, 0f, 14f); }

    void Record()
    {
        if (!answering || over) return;
        var f = Cur;
        bool ok = Answer(dial);
        Toast(ok ? F("Right! {0} cranes", Reds(f)) : F("It was {0}", Reds(f)), ok ? new Color(0.6f, 1f, 0.6f) : new Color(1f, 0.7f, 0.45f));
        if (ok)
        {
            feathers.Emit(field.W(180f, 220f, -0.6f), Color.white, 14, 3f, 0.08f, 0.8f);
            synth.Tone(880f, 0.12f, Wave.Triangle, 0.18f, 1100f, 8f);
        }
        else synth.Tone(240f, 0.25f, Wave.Triangle, 0.16f, 180f, 5f);
        if (over) End();
    }

    void Tap(Vector2 f)
    {
        if (state == GameState.Ready) { state = GameState.Playing; return; }
        if (!answering) return;
        for (int p = 0; p < Plates.Length; p++)
            if (Plates[p].Contains(f)) { if (PlateStep[p] == 0) Record(); else SetDial(dial + PlateStep[p]); return; }
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
                    // taps are read once per frame: a plate steps the count or records it
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (OiyoArcade.OverUi(b.pos) || !field.ToField(b.pos, out Vector2 f)) continue;
                        Tap(f);
                    }
                    if (state == GameState.Ready && (confirm || Input.GetKeyDown(KeyCode.Space))) { state = GameState.Playing; return; }
                    if (answering)
                    {
                        if (Input.GetKeyDown(KeyCode.UpArrow)) SetDial(dial + 1);
                        if (Input.GetKeyDown(KeyCode.DownArrow)) SetDial(dial - 1);
                        if (Input.GetKeyDown(KeyCode.RightArrow)) SetDial(dial + 5);
                        if (Input.GetKeyDown(KeyCode.LeftArrow)) SetDial(dial - 5);
                        if (confirm) Record();
                    }
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
            OiyoArcade.Record(Slug, stageIdx, starsWon, good, StageCount);
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
        bool flying = !over && !answering && state != GameState.Menu;
        if (flying && shownFlock != idx) ShowFlock();
        flockRoot.gameObject.SetActive(flying);
        if (flying)
        {
            var f = Cur;
            for (int b = 0; b < birds.Count; b++)
            {
                var p = BirdAt(f, b, t);
                birds[b].position = field.W(p.x, p.y, -0.3f - b * 0.001f);
                bool up = Mathf.Sin(t * 7f + f.phase[b]) > 0f;
                birdR[b].sharedMaterial = f.red[b] == 1 ? (up ? redUp : redDown) : (up ? greyUp : greyDown);
            }
        }
        float left = flying ? Mathf.Clamp01(1f - t / Cur.time) : 0f;
        timer.gameObject.SetActive(flying);
        timer.position = field.W(12f + (336f * left) / 2f, 92f, -0.2f);
        timer.localScale = new Vector3(OiyoField.U(Mathf.Max(1f, 336f * left)), OiyoField.U(6f), 0.1f);
    }

    // ?oiyotest=1 prints the state to the browser console for the automated play check: the flock, whether the count
    // is asked for, the red cranes in the flock just seen (the answer), the dial, the counts, and each plate's screen
    // point (px from the top-left) in the order −5, −1, Record, +1, +5.
    bool testLog; float testT;
    Vector2 Scr(Vector2 f) { var sp = cam.WorldToScreenPoint(field.W(f.x, f.y, -0.35f)); return new Vector2(sp.x, Screen.height - sp.y); }
    void TestTick(float dt)
    {
        if (!testLog || (testT -= dt) > 0f) return;
        testT = 0.05f;
        var pl = new System.Text.StringBuilder();
        for (int p = 0; p < Plates.Length; p++) { if (p > 0) pl.Append(','); var s = Scr(Plates[p].center); pl.Append('[').Append(s.x.ToString("F1")).Append(',').Append(s.y.ToString("F1")).Append(']'); }
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"idx\":{idx},\"flocks\":{st.flocks.Length},\"asking\":{(answering ? "true" : "false")},\"ans\":{Reds(Cur)},\"dial\":{dial},\"good\":{good},\"need\":{st.need},\"plates\":[{pl}],\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.11f, 0.49f, 0.84f, 0.97f);
    static readonly Color Dark = new Color(0.07f, 0.15f, 0.25f, 0.88f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("Right {0}/{1}", CraneCountStages.All[i].need, CraneCountStages.All[i].flocks.Length);

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(0.9f, 0.96f, 1f), U("Crane Count"),
                U("Count the red-crowned cranes while the flock crosses the sky, then record the number. Leave out the grey white-naped cranes!"),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        var bar = new Rect(8f, 8f, w - 16f, 64f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 12f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>  " + F("Flock {0}/{1}", Mathf.Min(idx + 1, st.flocks.Length), st.flocks.Length), 15, new Color(0.9f, 0.96f, 1f));
        OiyoArcade.Text(new Rect(20f, 36f, w - 90f, 24f), F("Right {0}/{1}", good, st.need), 15, Color.white);
        if (OiyoArcade.Button(new Rect(w - 60f, 14f, 44f, 44f), "<b>II</b>", OiyoScreens.Slate, 18))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (state == GameState.Playing && answering)
        {
            var c = OiyoArcade.ToGui(cam.WorldToScreenPoint(field.W(180f, 250f, -0.4f)));
            OiyoArcade.Shadowed(new Rect(8f, c.y - 90f, w - 16f, 30f), U("How many cranes were in that flock?"), 18, Color.white, TextAnchor.MiddleCenter);
            OiyoArcade.Shadowed(new Rect(8f, c.y - 50f, w - 16f, 80f), $"<b>{dial}</b>", 64, Color.white, TextAnchor.MiddleCenter);
            OiyoArcade.Shadowed(new Rect(8f, c.y + 30f, w - 16f, 24f), $"± {Allowed(Cur)}", 15, new Color(0.9f, 0.96f, 1f), TextAnchor.MiddleCenter);
        }
        for (int p = 0; p < Plates.Length; p++)
        {
            var g = OiyoArcade.ToGui(cam.WorldToScreenPoint(field.W(Plates[p].center.x, Plates[p].center.y, -0.4f)));
            string label = PlateStep[p] == 0 ? U("Record") : PlateStep[p] > 0 ? $"+{PlateStep[p]}" : $"{PlateStep[p]}";
            OiyoArcade.Shadowed(new Rect(g.x - 50f, g.y - 12f, 100f, 24f), "<b>" + label + "</b>", 17, answering ? Color.white : new Color(1f, 1f, 1f, 0.4f), TextAnchor.MiddleCenter);
        }
        if (msgT > 0f) OiyoArcade.Shadowed(new Rect(8f, 80f, w - 16f, 36f), msg, 20, msgC, TextAnchor.MiddleCenter);
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap to start"), U("Count only the red-crowned cranes."), 200f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            bool w0 = state == GameState.Victory;
            string detail = w0 ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : "";
            string body = $"<size=14>{F("{1} of {0} flocks right (need {2})", st.flocks.Length, good, st.need)}</size>";
            int r = OiyoScreens.Result(w, h, Dark, Accent, w0, ResultLive, w0 ? U("Census done!") : U("The count was a little off"), detail, body,
                w0 && stageIdx < StageCount - 1 ? U("Next stage") : null, w0 && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
