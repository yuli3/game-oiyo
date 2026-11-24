using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Saealsim Roll 3D: the web Saealsim Roll (src/components/games/SaealsimRoll.tsx, src/lib/games/saealsim-roll.ts)
// rebuilt in Unity. The rules are the web's: the game reads how fast the finger's direction of travel
// turns (turns per second, averaged over 0.15 s; moves slower than 60 px/s or near-reversals count as no
// turn). Inside the stage's band the lump rounds off (0.8 per second); above it the dough cracks
// (1.6 per second per turn/s over) and at 1 it crumbles; below it nothing happens. Roll the stage's count
// before time runs out. The 30 stages are the web's own (SaealsimRollStages.cs).
public class SaealsimRollPlayer : MonoBehaviour
{
    const string Slug = "saealsim-roll";
    const int StageCount = 30;
    const float Smooth = 0.15f, MinSpeed = 60f, RollRate = 0.8f, CrackRate = 1.6f, CrackEase = 0.6f;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of saealsim-roll.ts) ----------------
    SaealsimRollStages.Level st;
    int stageIdx;
    float t, round, crack, rate;
    float lastAng; bool hasAng;
    int done, crumbled, starsWon;
    bool over, won;

    void NewDough() { t = 0f; round = 0f; crack = 0f; rate = 0f; hasAng = false; done = 0; crumbled = 0; over = false; won = false; }
    void Lift() { hasAng = false; }

    // "ball", "crumble", "end" or null
    string StepDough(float dx, float dy, float dt)
    {
        if (over || dt <= 0f) return null;
        t += dt;
        float speed = Mathf.Sqrt(dx * dx + dy * dy) / dt;
        float turn = 0f;
        if (speed >= MinSpeed)
        {
            float ang = Mathf.Atan2(dy, dx);
            if (hasAng)
            {
                float da = ang - lastAng;
                while (da > Mathf.PI) da -= 2f * Mathf.PI;
                while (da < -Mathf.PI) da += 2f * Mathf.PI;
                if (Mathf.Abs(da) < Mathf.PI * 2f / 3f) turn = Mathf.Abs(da) / (2f * Mathf.PI) / dt;
            }
            lastAng = ang; hasAng = true;
        }
        else hasAng = false;
        float k = Mathf.Min(1f, dt / Smooth);
        rate += (turn - rate) * k;
        string ev = null;
        if (rate > st.hi) crack += CrackRate * (rate - st.hi) * dt;
        else
        {
            crack = Mathf.Max(0f, crack - CrackEase * dt);
            if (rate >= st.lo) round += RollRate * dt;
        }
        if (crack >= 1f) { crumbled++; round = 0f; crack = 0f; ev = "crumble"; }
        else if (round >= 1f) { done++; round = 0f; crack = 0f; ev = "ball"; }
        if (done >= st.need) { over = true; won = true; return "end"; }
        if (t >= st.limit) { over = true; won = false; return "end"; }
        return ev;
    }

    int StarsFor()
    {
        if (!won) return 0;
        float left = (st.limit - t) / st.limit;
        if (left >= 0.15f && crumbled == 0) return 3;
        if (left >= 0.07f) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    Camera cam;
    Transform root, dough, pot;
    readonly List<Transform> balls = new List<Transform>();
    Material doughMat, boardMat, potMat, soupMat, wallMat;
    Bursts bursts;
    Synth synth;
    bool showStages;

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        cam = new GameObject("Camera").AddComponent<Camera>();
        cam.fieldOfView = 45f; cam.nearClipPlane = 0.1f; cam.farClipPlane = 100f;
        cam.clearFlags = CameraClearFlags.SolidColor;
        cam.backgroundColor = new Color(0.23f, 0.16f, 0.13f);
        OiyoField.Lights(new Color(0.62f, 0.55f, 0.5f), 0.95f, 55f, -25f);
        bursts = new Bursts(transform, 0.5f);
        synth = new Synth(gameObject);
        doughMat = OiyoArcade.Lit(new Color(1f, 0.99f, 0.96f), 0.35f);
        boardMat = OiyoArcade.Lit(Color.white, 0.25f, OiyoArcade.Art("SA/wood", true));
        potMat = OiyoArcade.Lit(new Color(0.29f, 0.31f, 0.34f), 0.5f);
        soupMat = OiyoArcade.Lit(Color.white, 0.6f, OiyoArcade.Art("SA/patjuk", true));
        wallMat = OiyoArcade.Lit(Color.white, 0.05f, OiyoArcade.Art("SA/hanji", true));
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int idx, bool ready = true)
    {
        stageIdx = Mathf.Clamp(idx, 0, StageCount - 1);
        StopAllCoroutines();
        st = SaealsimRollStages.All[stageIdx];
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Kitchen").transform;
        NewDough();
        starsWon = 0;
        showStages = false;
        grabId = int.MinValue; pendingDt = 0f;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Animate(0f);
    }

    void BuildScene()
    {
        var wall = OiyoArcade.Prim(PrimitiveType.Quad, "Wall", wallMat, root);
        wall.transform.position = new Vector3(0f, 3f, 6f);
        wall.transform.localScale = new Vector3(30f, 14f, 1f);
        var board = OiyoArcade.Prim(PrimitiveType.Cube, "Board", boardMat, root);
        board.transform.position = new Vector3(-0.8f, -0.2f, 0f);
        board.transform.localScale = new Vector3(6.4f, 0.3f, 4.4f);
        dough = OiyoArcade.Prim(PrimitiveType.Sphere, "Dough", doughMat, root).transform;
        pot = new GameObject("Pot").transform;
        pot.SetParent(root, false);
        pot.position = new Vector3(3.6f, 0f, 0.6f);
        var body = OiyoArcade.Prim(PrimitiveType.Cylinder, "Pot", potMat, pot);
        body.transform.localPosition = new Vector3(0f, 0.5f, 0f);
        body.transform.localScale = new Vector3(2.4f, 0.6f, 2.4f);
        var soup = OiyoArcade.Prim(PrimitiveType.Cylinder, "Patjuk", soupMat, pot);
        soup.transform.localPosition = new Vector3(0f, 1.12f, 0f);
        soup.transform.localScale = new Vector3(2.1f, 0.02f, 2.1f);
        balls.Clear();
        for (int i = 0; i < st.need; i++)
        {
            var b = OiyoArcade.Prim(PrimitiveType.Sphere, "Ball", doughMat, pot).transform;
            float a = i * 2.4f;
            b.localPosition = new Vector3(Mathf.Cos(a) * (0.25f + 0.07f * i), 1.18f, Mathf.Sin(a) * (0.25f + 0.07f * i));
            b.localScale = Vector3.one * 0.28f;
            b.gameObject.SetActive(false);
            balls.Add(b);
        }
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("saealsim-roll", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput(dt);
        msgT = Mathf.Max(0f, msgT - dt);
        Animate(dt);
    }

    string msg = ""; float msgT; Color msgC = Color.white;
    void Toast(string m, Color c) { msg = m; msgT = 0.7f; msgC = c; }

    int grabId = int.MinValue;
    Vector2 lastPos;
    float pendingDt;
    // screen px -> the web's px
    float ToPx(float screen) => screen * 400f / Mathf.Max(1f, Mathf.Min(Screen.width, Screen.height));

    // The finger's travel is read once per frame; a held frame with no move waits for the next one.
    void ReadInput(float dt)
    {
        bool confirm = Input.GetKeyDown(KeyCode.Return);
        switch (state)
        {
            case GameState.Ready:
            case GameState.Playing:
                {
                    if (state == GameState.Playing && (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P))) { state = GameState.Paused; grabId = int.MinValue; Lift(); return; }
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (grabId != int.MinValue) continue;
                        if (state == GameState.Ready) state = GameState.Playing;
                        grabId = b.id; lastPos = b.pos;
                    }
                    if (state != GameState.Playing) return;
                    Vector2 move = Vector2.zero;
                    bool held = false;
                    foreach (var hp in OiyoArcade.Held()) if (hp.id == grabId) { move = hp.pos - lastPos; lastPos = hp.pos; held = true; }
                    foreach (var e in OiyoArcade.Ended()) if (e.id == grabId) { move += e.pos - lastPos; grabId = int.MinValue; held = false; }
                    float step = dt + pendingDt;
                    string ev;
                    if (held && move == Vector2.zero && step < 0.1f) { pendingDt = step; return; }
                    pendingDt = 0f;
                    ev = StepDough(ToPx(move.x), ToPx(move.y), step);
                    if (!held) Lift();
                    if (ev == "ball")
                    {
                        Toast(U("Plop!"), new Color(1f, 0.6f, 0.7f));
                        if (done - 1 < balls.Count) balls[done - 1].gameObject.SetActive(true);
                        bursts.Emit(pot.position + Vector3.up * 1.3f, new Color(0.65f, 0.12f, 0.3f), 14, 2f, 0.12f, 0.5f);
                        synth.Tone(620f, 0.12f, Wave.Triangle, 0.14f, 360f, 10f);
                    }
                    else if (ev == "crumble")
                    {
                        Toast(U("It crumbled"), new Color(1f, 0.5f, 0.45f));
                        bursts.Emit(dough.position, Color.white, 26, 3f, 0.15f, 0.6f);
                        synth.Tone(300f, 0.25f, Wave.Noise, 0.14f, 120f, 7f);
                    }
                    else if (ev == "end") End();
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
        grabId = int.MinValue;
        if (won)
        {
            starsWon = StarsFor();
            state = GameState.Victory;
            for (int i = 0; i < balls.Count; i++) balls[i].gameObject.SetActive(i < done);
            OiyoArcade.Record(Slug, stageIdx, starsWon, done, StageCount);
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
        // the lump: squashed and wide until round, a little greyer as it cracks, and turning as it rolls
        float squash = 1f - round;
        dough.position = new Vector3(-0.8f, 0.55f - squash * 0.12f, 0f);
        dough.localScale = new Vector3(1.1f * (1f + squash * 0.35f), 1.1f * (1f - squash * 0.3f), 1.1f * (1f + squash * 0.2f));
        dough.Rotate(Vector3.up, rate * 360f * dt, Space.World);
        doughMat.color = Color.Lerp(new Color(1f, 0.99f, 0.96f), new Color(0.72f, 0.7f, 0.68f), Mathf.Clamp01(crack));
        bool portrait = cam.aspect < 1f;
        cam.transform.position = new Vector3(0.6f, portrait ? 6.5f : 4.6f, portrait ? -9.5f : -6.4f);
        cam.transform.LookAt(new Vector3(0.6f, 0.4f, 0.4f));
    }

    // ?oiyotest=1 prints the state to the browser console for the automated play check.
    bool testLog; float testT;
    void TestTick(float dt)
    {
        if (!testLog || (testT -= dt) > 0f) return;
        testT = 0.02f;
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"t\":{t:F3},\"rate\":{rate:F3},\"lo\":{st.lo:F3},\"hi\":{st.hi:F3},\"round\":{round:F3},\"crack\":{crack:F3},\"done\":{done},\"need\":{st.need},\"crumbled\":{crumbled},\"limit\":{st.limit:F1},\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.65f, 0.12f, 0.3f, 0.97f);
    static readonly Color Dark = new Color(0.2f, 0.12f, 0.09f, 0.86f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("{0} balls", SaealsimRollStages.All[i].need);

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(1f, 0.9f, 0.85f), U("Saealsim Roll"),
                U("Draw circles with your finger at a steady pace to roll rice balls for the porridge. Too fast crumbles."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        var bar = new Rect(8f, 8f, w - 16f, 64f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 12f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>   " + F("{0}s left", Mathf.Max(0f, st.limit - t).ToString("F1")), 15, new Color(1f, 0.92f, 0.75f));
        OiyoArcade.Text(new Rect(20f, 36f, w - 90f, 24f), F("Balls {0}/{1}", done, st.need), 16, Color.white);
        if (OiyoArcade.Button(new Rect(w - 60f, 14f, 44f, 44f), "<b>II</b>", OiyoScreens.Slate, 18))
        {
            if (state == GameState.Playing) { state = GameState.Paused; grabId = int.MinValue; Lift(); }
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (msgT > 0f) OiyoArcade.Shadowed(new Rect(8f, 80f, w - 16f, 36f), msg, 22, msgC, TextAnchor.MiddleCenter);
        if (state == GameState.Playing || state == GameState.Ready)
        {
            // the pace gauge against the green band, and this ball's roundness
            float maxRate = st.hi * 1.6f;
            var g = new Rect(30f, h - 64f, w - 60f, 16f);
            OiyoArcade.Fill(g, new Color(0f, 0f, 0f, 0.45f));
            OiyoArcade.Fill(new Rect(g.x + g.width * st.lo / maxRate, g.y, g.width * (st.hi - st.lo) / maxRate, g.height), new Color(0.25f, 0.75f, 0.34f, 0.85f));
            OiyoArcade.Fill(new Rect(g.x + g.width * Mathf.Min(1f, rate / maxRate) - 3f, g.y - 5f, 6f, 26f), rate > st.hi ? new Color(0.88f, 0.19f, 0.19f) : new Color(0.98f, 0.69f, 0.02f));
            string hint = grabId == int.MinValue ? "" : rate > st.hi ? U("Too fast!") : rate < st.lo ? U("A little faster") : U("Nice and round");
            OiyoArcade.Shadowed(new Rect(30f, h - 40f, w - 60f, 22f), hint, 15, Color.white);
            OiyoArcade.Bar(new Rect(w * 0.5f - 70f, h - 96f, 140f, 10f), round, new Color(0f, 0f, 0f, 0.45f), new Color(1f, 0.83f, 0.23f));
        }
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Draw circles anywhere"), U("Keep the needle in the green band. The size of the circle doesn't matter."), 220f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            bool w0 = state == GameState.Victory;
            string detail = w0 ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : F("Balls {0}/{1}", done, st.need);
            string body = $"<b>{t:F1}s</b>\n<size=14>{F("{0} crumbled", crumbled)}</size>";
            int r = OiyoScreens.Result(w, h, Dark, Accent, w0, ResultLive, w0 ? U("All the rice balls are in the porridge!") : U("The porridge boiled over"), detail, body,
                w0 && stageIdx < StageCount - 1 ? U("Next stage") : null, w0 && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
