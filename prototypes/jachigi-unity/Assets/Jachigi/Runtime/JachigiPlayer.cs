using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Jachigi Stick Bat 3D: the web Jachigi (src/components/games/Jachigi.tsx, src/lib/games/jachigi.ts)
// rebuilt in Unity. The rules are the web's, in its own px: the first tap flicks the short stick up at
// 380 px/s (gravity 900), a second tap while it is 14..86 px up bats it away at 240 + 360 q px/s
// (q = how close to 46 px it was) and 12..58° (low hits fly flat, high hits lob), fielders catch it
// below 58 px as it passes, a rolling stick is stopped by a fielder or the frozen ditch, the persimmon
// branch knocks lobs down, and three swings add up in ja (30 px). The 30 fields are the web's own
// (JachigiStages.cs). Keyboard: Space or Enter taps.
public class JachigiPlayer : MonoBehaviour
{
    const string Slug = "jachigi";
    const int StageCount = 30;
    const float FW = 360f, FH = 560f, Ground = 470f, BatX = 40f, Ja = 30f, Gravity = 900f, FlickV = 380f;
    const float ReachLo = 14f, ReachHi = 86f, Sweet = 46f, CatchH = 58f;
    const int Swings = 3;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of jachigi.ts) ----------------
    const int Rest = 0, Up = 1, Flight = 2, Roll = 3, Landed = 4;
    JachigiStages.Level level;
    int stageIdx;
    int phase, lastOutcome; // outcome: 0 none, 1 whiff, 2 caught, 3 branch, 4 ditch, 5 ok
    float time, phaseT, sx, sh, svx, svh, spin, wait;
    bool bounced, branchHit, over, won;
    readonly List<float> distances = new List<float>();
    float total;
    int starsWon;
    bool HasBranch => level.branch != null && level.branch.Length == 3;
    bool HasDitch => level.ditch >= 0f;

    void NewRun()
    {
        time = 0f; phase = Rest; phaseT = 0f; FreshStick(); bounced = false; lastOutcome = 0; distances.Clear(); total = 0f; over = false; won = false; wait = 0f;
    }
    void FreshStick() { sx = BatX + 10f; sh = 0f; svx = 0f; svh = 0f; spin = 0f; branchHit = false; }

    static void HitShot(float h, out float speed, out float angle)
    {
        float q = Mathf.Max(0f, 1f - Mathf.Abs(h - Sweet) / 48f);
        speed = 240f + 360f * q;
        angle = 12f + (h - ReachLo) / (ReachHi - ReachLo) * 46f;
    }

    void Tap()
    {
        if (over || wait > 0f) return;
        if (phase == Rest)
        {
            phase = Up; phaseT = 0f; svh = FlickV; spin = 14f;
            OnFlick();
        }
        else if (phase == Up)
        {
            if (sh < ReachLo || sh > ReachHi) { OnSwish(); return; }
            HitShot(sh, out float speed, out float angle);
            float a = angle * Mathf.Deg2Rad;
            svx = Mathf.Cos(a) * speed; svh = Mathf.Sin(a) * speed;
            spin = 18f + speed / 30f;
            phase = Flight; phaseT = 0f; bounced = false;
            OnHit(speed);
        }
    }

    void EndSwing(int outcome)
    {
        float ja = outcome == 5 || outcome == 4 || outcome == 3 ? Mathf.Max(0f, Mathf.Round((sx - BatX) / Ja * 10f) / 10f) : 0f;
        distances.Add(ja);
        total = Mathf.Round((total + ja) * 10f) / 10f;
        lastOutcome = outcome;
        phase = Landed;
        wait = 1.1f;
        OnSwingEnd(outcome, ja);
        if (distances.Count >= Swings) { over = true; won = total >= level.goal; }
    }

    void Step(float dt)
    {
        if (over) return;
        time += dt;
        if (wait > 0f)
        {
            wait -= dt;
            if (wait <= 0f) { wait = 0f; phase = Rest; FreshStick(); }
            return;
        }
        int n = Mathf.Max(1, Mathf.CeilToInt(dt / (1f / 240f)));
        float h = dt / n;
        for (int k = 0; k < n && !over && phase != Landed; k++)
        {
            phaseT += h;
            if (phase == Up)
            {
                svh -= Gravity * h;
                sh += svh * h;
                if (sh <= 0f) { sh = 0f; EndSwing(1); }
            }
            else if (phase == Flight)
            {
                float prevX = sx;
                svx += level.wind * h;
                svh -= Gravity * h;
                sx += svx * h;
                sh += svh * h;
                if (HasBranch && !bounced && svx > 20f && sx > level.branch[0] && sx < level.branch[1] && sh > level.branch[2] && sh < level.branch[2] + 30f)
                {
                    svx *= 0.15f; svh = -60f; branchHit = true;
                    OnBranch();
                }
                bool caught = false;
                foreach (var fx in level.fielders)
                    if (prevX < fx && sx >= fx && sh < CatchH && sh > 4f && !bounced) { caught = true; break; }
                if (caught) { EndSwing(2); break; }
                if (sh <= 0f)
                {
                    sh = 0f;
                    bounced = true;
                    OnLand();
                    if (Mathf.Abs(svh) > 90f) { svh = -svh * 0.25f; svx *= 0.6f; }
                    else { phase = Roll; svh = 0f; }
                }
                if (HasDitch && prevX < level.ditch && sx >= level.ditch && sh <= 2f) { sx = level.ditch; EndSwing(4); }
            }
            else if (phase == Roll)
            {
                float prevX = sx;
                svx *= Mathf.Exp(-3.2f * h);
                sx += svx * h;
                if (HasDitch && prevX < level.ditch && sx >= level.ditch) { sx = level.ditch; EndSwing(4); }
                else if (Mathf.Abs(svx) < 6f) EndSwing(branchHit ? 3 : 5);
                else foreach (var fx in level.fielders) if (prevX < fx && sx >= fx) { sx = fx; EndSwing(5); break; }
            }
        }
    }

    int StarsFor()
    {
        if (!won) return 0;
        if (total >= level.goal * 1.15f) return 3;
        if (total >= level.goal * 1.07f) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    OiyoField field;
    Transform root, batter, longStick, shortStick, reachBand, sweetBar;
    readonly List<Transform> fielders = new List<Transform>();
    readonly List<Renderer> fielderR = new List<Renderer>();
    readonly List<Transform> trail = new List<Transform>();
    int trailNext;
    Material batterMat, fielderMat, fielderDownMat, fieldMat, hillsMat, woodMat, persimmonMat, leafMat, ditchMat, markMat;
    Bursts bursts;
    Synth synth;
    bool showStages;
    float camX, swingAnim;
    const float Tilt = -6f;

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(FW, FH, new Color(0.78f, 0.86f, 0.94f));
        OiyoField.Lights(new Color(0.64f, 0.64f, 0.66f), 0.85f, 35f, -40f);
        bursts = new Bursts(transform, 0.8f);
        synth = new Synth(gameObject);
        batterMat = OiyoField.Sprite("JC/batter");
        fielderMat = OiyoField.Sprite("JC/fielder");
        fielderDownMat = OiyoField.Sprite("JC/fielder_down");
        fieldMat = OiyoArcade.Lit(Color.white, 0.05f, OiyoArcade.Art("JC/field", true));
        hillsMat = OiyoField.Sprite("JC/hills");
        woodMat = OiyoArcade.Lit(Color.white, 0.3f, OiyoArcade.Art("JC/wood", true));
        persimmonMat = OiyoArcade.Lit(new Color(0.97f, 0.4f, 0.03f), 0.6f);
        leafMat = OiyoArcade.Lit(new Color(0.36f, 0.23f, 0.13f), 0.2f);
        ditchMat = OiyoArcade.Lit(new Color(0.45f, 0.75f, 0.99f), 0.9f);
        markMat = OiyoArcade.Glow(new Color(0.29f, 0.31f, 0.34f));
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int idx, bool ready = true)
    {
        stageIdx = Mathf.Clamp(idx, 0, StageCount - 1);
        StopAllCoroutines();
        level = JachigiStages.All[stageIdx];
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Field").transform;
        fielders.Clear(); fielderR.Clear(); trail.Clear(); trailNext = 0;
        NewRun();
        showStages = false;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        camX = 0f;
        Fit();
        Animate(0f);
    }

    // field px along the ground and height above it -> world
    Vector3 G(float x, float height, float z = 0f) => field.W(x, Ground - height, z);

    void BuildScene()
    {
        // the bare field: a ground slab running far down the field, far hills behind
        var slab = OiyoArcade.Prim(PrimitiveType.Cube, "Field", fieldMat, root);
        slab.transform.position = G(900f, -40f, 3f);
        slab.transform.localScale = new Vector3(OiyoField.U(3200f), OiyoField.U(80f), 10f);
        fieldMat.mainTextureScale = new Vector2(30f, 2f);
        var top = OiyoArcade.Prim(PrimitiveType.Quad, "FieldTop", fieldMat, root);
        top.transform.rotation = Quaternion.Euler(90f, 0f, 0f);
        top.transform.position = G(900f, 0f, 3f) + new Vector3(0f, 0.002f, 0f);
        top.transform.localScale = new Vector3(OiyoField.U(3200f), 10f, 1f);
        for (int k = -1; k < 4; k++)
        {
            var hills = OiyoField.Quad("Hills", hillsMat, root, 1400f, 340f);
            hills.position = G(k * 1300f + 600f, 150f, 14f);
        }
        // distance marks every 5 ja
        for (int ja = 5; ja <= 60; ja += 5)
        {
            var mk = OiyoArcade.Prim(PrimitiveType.Cube, "Mark", markMat, root);
            mk.transform.position = G(BatX + ja * Ja, 5f, -0.2f);
            mk.transform.localScale = new Vector3(OiyoField.U(3f), OiyoField.U(10f), OiyoField.U(3f));
        }
        // the hole
        var hole = OiyoArcade.Prim(PrimitiveType.Cube, "Hole", OiyoArcade.Glow(new Color(0.22f, 0.17f, 0.12f)), root);
        hole.transform.position = G(BatX + 11f, -0.5f, -0.25f);
        hole.transform.localScale = new Vector3(OiyoField.U(20f), OiyoField.U(4f), OiyoField.U(14f));
        if (HasDitch)
        {
            var ditch = OiyoArcade.Prim(PrimitiveType.Cube, "Ditch", ditchMat, root);
            ditch.transform.position = G(level.ditch + 8f, -1f, 0.4f);
            ditch.transform.localScale = new Vector3(OiyoField.U(18f), OiyoField.U(4f), 2.2f);
        }
        if (HasBranch)
        {
            float x0 = level.branch[0], x1 = level.branch[1], bh = level.branch[2];
            var trunk = OiyoArcade.Prim(PrimitiveType.Cylinder, "Trunk", leafMat, root);
            trunk.transform.position = G(x1 + 8f, (bh + 260f) * 0.5f, 1.2f);
            trunk.transform.localScale = new Vector3(OiyoField.U(14f), OiyoField.U((bh + 260f) * 0.5f + 20f), OiyoField.U(14f));
            var limb = OiyoArcade.Prim(PrimitiveType.Cylinder, "Branch", leafMat, root);
            limb.transform.position = G((x0 + x1) * 0.5f, bh + 22f, -0.1f);
            limb.transform.rotation = Quaternion.Euler(0f, 0f, 90f);
            limb.transform.localScale = new Vector3(OiyoField.U(8f), OiyoField.U((x1 - x0) * 0.5f + 8f), OiyoField.U(8f));
            for (float x = x0 + 12f; x < x1; x += 34f)
            {
                var p = OiyoArcade.Prim(PrimitiveType.Sphere, "Persimmon", persimmonMat, root);
                p.transform.position = G(x, bh + 10f, -0.1f);
                p.transform.localScale = Vector3.one * OiyoField.U(11f);
            }
        }
        foreach (var fx in level.fielders)
        {
            var f = OiyoField.Quad("Fielder", fielderMat, root, 32f, 44f);
            fielders.Add(f); fielderR.Add(f.GetComponent<Renderer>());
        }
        batter = OiyoField.Quad("Batter", batterMat, root, 36f, 50f);
        longStick = new GameObject("LongStick").transform; longStick.SetParent(root, false);
        var ls = OiyoArcade.Prim(PrimitiveType.Cube, "Stick", woodMat, longStick);
        ls.transform.localPosition = new Vector3(OiyoField.U(29f), 0f, 0f);
        ls.transform.localScale = new Vector3(OiyoField.U(58f), OiyoField.U(5f), OiyoField.U(5f));
        shortStick = new GameObject("ShortStick").transform; shortStick.SetParent(root, false);
        var ss = OiyoArcade.Prim(PrimitiveType.Cube, "Stick", woodMat, shortStick);
        ss.transform.localScale = new Vector3(OiyoField.U(18f), OiyoField.U(5f), OiyoField.U(5f));
        reachBand = OiyoField.Quad("Reach", OiyoArcade.Transparent(OiyoArcade.GlowTexture(), new Color(1f, 1f, 1f, 0.35f)), root, 10f, ReachHi - ReachLo);
        reachBand.GetComponent<Renderer>().material.mainTexture = OiyoArcade.Solid(Color.white);
        sweetBar = OiyoArcade.Prim(PrimitiveType.Cube, "Sweet", OiyoArcade.Glow(new Color(0.18f, 0.62f, 0.27f)), root).transform;
        sweetBar.localScale = new Vector3(OiyoField.U(16f), OiyoField.U(4f), OiyoField.U(2f));
        for (int i = 0; i < 40; i++)
        {
            var q = OiyoArcade.GlowQuad("Trail", new Color(1f, 1f, 1f, 0f), OiyoField.U(8f), root);
            q.SetActive(false);
            trail.Add(q.transform);
        }
    }

    void Fit()
    {
        bool portrait = field.Cam.aspect < 1f;
        field.Fit(portrait ? 110f : 70f, portrait ? 40f : 20f, Tilt, Ground - 260f, Ground + 30f);
        field.Cam.transform.position += new Vector3(OiyoField.U(camX), 0f, 0f);
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("jachigi", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        if (state == GameState.Playing)
        {
            Step(dt);
            if (over) End();
        }
        // the camera follows the flying stick and slides back for the next swing
        float want = phase == Flight || phase == Roll || phase == Landed ? Mathf.Max(0f, sx - 140f) : 0f;
        camX += (want - camX) * Mathf.Min(1f, dt * (phase == Rest ? 6f : 4f));
        Fit();
        msgT = Mathf.Max(0f, msgT - dt);
        Animate(dt);
    }

    string msg = ""; float msgT; Color msgC = Color.white;
    void Toast(string s, Color c, float t = 1.2f) { msg = s; msgT = t; msgC = c; }

    void OnFlick() { synth.Tone(660f, 0.06f, Wave.Square, 0.08f, 900f, 18f); }
    void OnSwish() { swingAnim = 0.25f; Toast(U("Swish!"), new Color(0.75f, 0.78f, 0.82f), 0.6f); synth.Tone(240f, 0.1f, Wave.Noise, 0.07f, 0f, 16f); }
    void OnHit(float speed)
    {
        swingAnim = 0.25f;
        bursts.Emit(G(sx, sh, -0.3f), new Color(1f, 0.85f, 0.3f), 14, 3f, 0.22f, 0.4f);
        synth.Tone(900f + speed, 0.08f, Wave.Square, 0.16f, 500f, 14f);
    }
    void OnBranch() { synth.Tone(300f, 0.12f, Wave.Noise, 0.1f, 0f, 12f); bursts.Emit(G(sx, sh, -0.2f), new Color(0.97f, 0.45f, 0.1f), 10, 2.5f, 0.2f, 0.5f); }
    void OnLand() { bursts.Emit(G(sx, 0f, -0.2f), new Color(0.85f, 0.85f, 0.85f), 6, 1.6f, 0.16f, 0.4f); synth.Tone(180f, 0.05f, Wave.Noise, 0.06f, 0f, 22f); }
    void OnSwingEnd(int outcome, float ja)
    {
        string text = outcome == 2 ? U("Caught! 0 ja") : outcome == 1 ? U("Missed it") : outcome == 3 ? U("Stuck in the persimmon tree") + " · " + F("{0} ja", ja) : outcome == 4 ? U("Stopped at the ditch") + " · " + F("{0} ja", ja) : U("Whack!") + " " + F("{0} ja", ja);
        bool bad = outcome == 1 || outcome == 2;
        Toast(text, bad ? new Color(1f, 0.5f, 0.45f) : new Color(0.5f, 1f, 0.6f));
        synth.Tone(bad ? 220f : 784f, 0.2f, Wave.Triangle, 0.16f, bad ? 140f : 1047f, 6f);
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
                    int taps = OiyoArcade.Began().Count + (Input.GetKeyDown(KeyCode.Space) || confirm ? 1 : 0);
                    if (taps > 0 && state == GameState.Ready) state = GameState.Playing;
                    for (int k = 0; k < taps; k++) Tap();
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
            OiyoArcade.Record(Slug, stageIdx, starsWon, Mathf.RoundToInt(total), StageCount);
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
        float t = Time.time;
        swingAnim = Mathf.Max(0f, swingAnim - dt);
        batter.position = G(BatX - 18f, 25f, -0.3f);
        float sw = swingAnim > 0f ? 1f - swingAnim / 0.25f : 0f;
        float ang = phase == Rest || phase == Landed ? -12f : 70f - sw * 125f;
        longStick.position = G(BatX - 8f, 24f, -0.45f);
        longStick.rotation = Quaternion.Euler(0f, 0f, ang);
        bool showStick = !(phase == Landed && lastOutcome == 2);
        shortStick.gameObject.SetActive(showStick);
        shortStick.position = G(sx, sh + 3f, -0.3f);
        shortStick.rotation = phase == Rest || phase == Roll || phase == Landed ? Quaternion.identity : Quaternion.Euler(t * 160f, 0f, -time * spin * Mathf.Rad2Deg);
        bool band = phase == Rest || phase == Up;
        reachBand.gameObject.SetActive(band); sweetBar.gameObject.SetActive(band);
        reachBand.position = G(BatX + 34f, (ReachLo + ReachHi) * 0.5f, -0.4f);
        sweetBar.position = G(BatX + 34f, Sweet, -0.42f);
        for (int i = 0; i < fielders.Count; i++)
        {
            float fx = level.fielders[i];
            bool near = phase == Flight && Mathf.Abs(sx - fx) < 80f && sh < CatchH + 30f;
            bool caughtHere = phase == Landed && lastOutcome == 2 && Mathf.Abs(sx - fx) < 30f;
            fielderR[i].sharedMaterial = near || caughtHere ? fielderMat : fielderDownMat;
            fielders[i].position = G(fx, 22f + (near ? 6f : 0f), -0.25f);
        }
        if (phase == Flight && dt > 0f)
        {
            var q = trail[trailNext]; trailNext = (trailNext + 1) % trail.Count;
            q.gameObject.SetActive(true); q.position = G(sx, sh + 3f, -0.28f);
            q.GetComponent<Renderer>().material.color = new Color(1f, 1f, 1f, 0.7f);
        }
        foreach (var q in trail)
        {
            if (!q.gameObject.activeSelf) continue;
            var m = q.GetComponent<Renderer>().material;
            var c = m.color; c.a -= dt * 0.9f; m.color = c;
            if (c.a <= 0f) q.gameObject.SetActive(false);
        }
    }

    // ?oiyotest=1 prints the run state to the browser console for the automated play check.
    bool testLog; float testT;
    void TestTick(float dt)
    {
        if (!testLog || (testT -= dt) > 0f) return;
        testT = 0.02f;
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"t\":{time:F3},\"phase\":{phase},\"phaseT\":{phaseT:F3},\"h\":{sh:F1},\"x\":{sx:F0},\"swing\":{distances.Count},\"total\":{total:F1},\"goal\":{level.goal:F0},\"bestT\":{level.bestT:F3},\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.79f, 0.16f, 0.16f, 0.97f);
    static readonly Color Dark = new Color(0.16f, 0.12f, 0.08f, 0.86f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("Mark {0} ja", JachigiStages.All[i].goal);

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(1f, 0.9f, 0.75f), U("Jachigi Stick Bat"),
                U("Tap to flick the short stick up, tap again to bat it far. Loft it over the kids who catch low shots."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        var bar = new Rect(8f, 8f, w - 16f, 64f);
        OiyoArcade.Panel(bar, Dark);
        string wind = level.wind != 0f ? "   <color=#a5d8ff>" + (level.wind < 0f ? "◀ " + U("Wind") : U("Wind") + " ▶") + "</color>" : "";
        OiyoArcade.Text(new Rect(20f, 12f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>   " + F("Swing {0}/{1}", Mathf.Min(Swings, distances.Count + 1), Swings) + wind, 15, new Color(1f, 0.92f, 0.8f));
        OiyoArcade.Text(new Rect(20f, 36f, w - 90f, 24f), F("{0} / {1} ja", total, level.goal), 16, Color.white);
        if (OiyoArcade.Button(new Rect(w - 60f, 14f, 44f, 44f), "<b>II</b>", OiyoScreens.Slate, 18))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (msgT > 0f) OiyoArcade.Shadowed(new Rect(8f, 80f, w - 16f, 36f), msg, 20, msgC, TextAnchor.MiddleCenter);
        // distance labels under the marks
        if (state != GameState.Paused)
            for (int ja = 5; ja <= 60; ja += 5)
            {
                var sp = field.Cam.WorldToScreenPoint(G(BatX + ja * Ja, -14f));
                if (sp.z <= 0f || sp.x < 0f || sp.x > Screen.width) continue;
                var gp = OiyoArcade.ToGui(sp);
                OiyoArcade.Text(new Rect(gp.x - 30f, gp.y - 9f, 60f, 18f), F("{0} ja", ja), 11, new Color(0.25f, 0.2f, 0.15f, 0.85f), TextAnchor.MiddleCenter);
            }
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap to flick, tap again to bat"), U("Hit at the green line for the strongest whack. Low hits fly flat and get caught; hit higher to loft it over the kids."), h - 84f, 116f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            bool w0 = state == GameState.Victory;
            string detail = w0 ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : F("Mark {0} ja", level.goal);
            var parts = new System.Text.StringBuilder();
            foreach (var dd in distances) { if (parts.Length > 0) parts.Append(" + "); parts.Append(dd.ToString("0.#")); }
            string body = $"<b>{F("{0} ja in all", total)}</b>\n<size=14>{parts}</size>";
            int r = OiyoScreens.Result(w, h, Dark, Accent, w0, ResultLive, w0 ? U("Past the mark!") : U("Just short"), detail, body,
                w0 && stageIdx < StageCount - 1 ? U("Next stage") : null, w0 && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
