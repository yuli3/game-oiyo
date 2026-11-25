using System.Collections;
using UnityEngine;

// Boing Up 3D: the web Boing Up (src/components/games/BoingUp.tsx, src/lib/games/boing-up.ts) rebuilt in Unity on the
// web's own 360 px wide field (OiyoField). A springy bean bounces up a beanstalk on its own; hold and slide (or the
// arrow keys) to steer it. Reach the top without falling off the bottom. The physics runs on the web's fixed 1/120 s
// steps; the 30 beanstalks are the web's own (BoingUpStages.cs).
public class BoingUpPlayer : MonoBehaviour
{
    const string Slug = "boing-up";
    const int StageCount = 30;
    const float Width = 360f, Gravity = 1500f, Jump = 760f, Spring = 1.45f, MaxVx = 280f, Steer = 10f, Half = 12f, LeafW = 64f;
    const float DT = 1f / 120f, View = 440f, Below = 300f, ViewTop = 70f;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of boing-up.ts) ----------------
    BoingUpStages.Level st;
    int stageIdx, starsWon, nLeaves, nBerries, berries, last;
    float t, x, h, vx, vh, target, floorH;
    bool[] withered, got;
    bool over, won;

    float LX(int k) => st.leaves[5 * k];
    float LH(int k) => st.leaves[5 * k + 1];
    int Kind(int k) => (int)st.leaves[5 * k + 2];
    float LeafX(int k, float time) => Kind(k) == 1 ? LX(k) + st.leaves[5 * k + 3] * Mathf.Sin(st.leaves[5 * k + 4] * time) : LX(k);

    void Step(out int bounce, out bool berry, out int wither)
    {
        bounce = -1; berry = false; wither = -1;
        if (over) return;
        t += DT;
        vx = Mathf.Clamp((target - x) * Steer, -MaxVx, MaxVx);
        x = Mathf.Clamp(x + vx * DT, Half, Width - Half);
        float before = h;
        vh -= Gravity * DT;
        h += vh * DT;
        if (vh < 0f)
        {
            for (int k = 0; k < nLeaves; k++)
            {
                if (withered[k]) continue;
                if (before >= LH(k) && h < LH(k) && Mathf.Abs(x - LeafX(k, t)) < LeafW / 2f + Half * 0.6f)
                {
                    h = LH(k);
                    vh = Kind(k) == 3 ? Jump * Spring : Jump;
                    last = k; bounce = k;
                    if (Kind(k) == 2) { withered[k] = true; wither = k; }
                    break;
                }
            }
        }
        for (int k = 0; k < nBerries; k++)
        {
            if (got[k] || Mathf.Abs(st.berries[2 * k] - x) > 20f || Mathf.Abs(st.berries[2 * k + 1] - h) > 22f) continue;
            got[k] = true; berries++; berry = true;
        }
        floorH = Mathf.Max(floorH, h - Below);
        if (h >= st.top) { over = true; won = true; }
        else if (h < floorH - Half * 2f) over = true;
    }

    int StarsFor()
    {
        if (!won) return 0;
        if (berries >= st.par) return 3;
        if (berries >= Mathf.CeilToInt(st.par / 2f)) return 2;
        return 1;
    }

    float TimeTo(float hh)
    {
        float a = -Gravity / 2f, b = vh, c = h - hh, d = b * b - 4f * a * c;
        if (d < 0f) return -1f;
        float tt = (-b - Mathf.Sqrt(d)) / (2f * a);
        return tt >= 0f ? tt : -1f;
    }

    /** The planned climb's next leaf, aimed where it will be on the way down onto it (the web's steerFor "plan"). */
    float PlanTarget()
    {
        int i = System.Array.IndexOf(st.path, last);
        int next = st.path[Mathf.Min(st.path.Length - 1, i + 1)];
        float land = TimeTo(LH(next));
        return LeafX(next, t + Mathf.Max(0f, land));
    }

    // ---------------- Scene ----------------
    OiyoField field;
    Camera cam;
    Transform root, bean, stem, topLine;
    Transform[] leafObj, berryObj;
    Material[] leafMat;
    Material berryMat, beanMat;
    Bursts sparkle;
    Synth synth;
    bool showStages, steering;
    int steerId, keyDir;
    float acc;

    float SY(float hh) => ViewTop + View - (hh - floorH);

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(360f, 560f, new Color(0.82f, 0.92f, 1f));
        cam = field.Cam;
        OiyoField.Lights(new Color(0.75f, 0.76f, 0.78f), 0.7f, 50f, -25f);
        sparkle = new Bursts(transform, 0.5f);
        synth = new Synth(gameObject);
        leafMat = new[] { OiyoField.Sprite("BU/leaf"), OiyoField.Sprite("BU/leaf"), OiyoField.Sprite("BU/wilt"), OiyoField.Sprite("BU/shroom") };
        berryMat = OiyoField.Sprite("BU/berry");
        beanMat = OiyoField.Sprite("BU/bean");
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int i, bool ready = true)
    {
        stageIdx = Mathf.Clamp(i, 0, StageCount - 1);
        StopAllCoroutines();
        st = BoingUpStages.All[stageIdx];
        nLeaves = st.leaves.Length / 5; nBerries = st.berries.Length / 2;
        withered = new bool[nLeaves]; got = new bool[nBerries];
        t = 0f; x = LX(0); h = LH(0); vx = 0f; vh = Jump; target = x; floorH = h - Below; berries = 0; last = 0;
        over = false; won = false; starsWon = 0; acc = 0f; steering = false; keyDir = 0;
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Beanstalk").transform;
        showStages = false;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Animate();
    }

    void BuildScene()
    {
        var sky = OiyoArcade.Prim(PrimitiveType.Cube, "Sky", OiyoArcade.Lit(new Color(0.82f, 0.92f, 1f), 0.05f), root).transform;
        sky.localScale = new Vector3(OiyoField.U(1200f), OiyoField.U(1600f), 0.2f);
        sky.position = field.W(180f, 280f, 1f);
        stem = OiyoArcade.Prim(PrimitiveType.Cube, "Stem", OiyoArcade.Lit(new Color(0.18f, 0.62f, 0.27f), 0.2f), root).transform;
        stem.localScale = new Vector3(OiyoField.U(6f), OiyoField.U(1600f), 0.1f);
        stem.position = field.W(180f, 280f, 0.5f);
        topLine = OiyoArcade.Prim(PrimitiveType.Cube, "Top", OiyoArcade.Glow(new Color(1f, 0.83f, 0.23f)), root).transform;
        topLine.localScale = new Vector3(OiyoField.U(360f), OiyoField.U(8f), 0.05f);
        leafObj = new Transform[nLeaves];
        for (int k = 0; k < nLeaves; k++)
        {
            bool shroom = Kind(k) == 3;
            leafObj[k] = OiyoField.Quad("Leaf", leafMat[Kind(k)], root, 64f, shroom ? 24f : 16f);
        }
        berryObj = new Transform[nBerries];
        for (int k = 0; k < nBerries; k++) berryObj[k] = OiyoField.Quad("Berry", berryMat, root, 24f, 24f);
        bean = OiyoField.Quad("Bean", beanMat, root, 32f, 32f);
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("boing-up", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        if (keyDir != 0) target = Mathf.Clamp(target + keyDir * 320f * dt, 0f, Width);
        if (state == GameState.Playing && !over)
        {
            acc += dt;
            while (acc >= DT && !over)
            {
                acc -= DT;
                Step(out int bounce, out bool berry, out int wither);
                if (bounce >= 0) synth.Tone(Kind(bounce) == 3 ? 880f : 523f, 0.06f, Wave.Triangle, 0.08f, 0f, 3f);
                if (wither >= 0) sparkle.Emit(field.W(LeafX(wither, t), SY(LH(wither)), -0.5f), new Color(0.85f, 0.63f, 0.4f), 8, 2f, 0.05f, 0.4f);
                if (berry) { sparkle.Emit(field.W(x, SY(h), -0.5f), new Color(0.85f, 0.47f, 0.95f), 8, 2f, 0.05f, 0.4f); synth.Tone(988f, 0.05f, Wave.Triangle, 0.1f); }
            }
            if (over) End();
        }
        Animate();
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
                    // input is read once per frame: the held finger's x is where the bean steers
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (state == GameState.Ready) state = GameState.Playing;
                        steering = true; steerId = b.id;
                        if (field.ToField(b.pos, out Vector2 f)) target = f.x;
                    }
                    if (steering)
                    {
                        foreach (var hp in OiyoArcade.Held()) if (hp.id == steerId && field.ToField(hp.pos, out Vector2 f)) target = f.x;
                        foreach (var e in OiyoArcade.Ended()) if (e.id == steerId) steering = false;
                    }
                    keyDir = (Input.GetKey(KeyCode.LeftArrow) || Input.GetKey(KeyCode.A) ? -1 : 0) + (Input.GetKey(KeyCode.RightArrow) || Input.GetKey(KeyCode.D) ? 1 : 0);
                    if (keyDir != 0 && state == GameState.Ready) state = GameState.Playing;
                    if ((Input.GetKeyDown(KeyCode.Space) || confirm) && state == GameState.Ready) state = GameState.Playing;
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
        steering = false;
        if (won)
        {
            state = GameState.Victory;
            OiyoArcade.Record(Slug, stageIdx, starsWon, berries * 10, StageCount);
            sparkle.Emit(field.W(x, SY(h), -1f), new Color(0.32f, 0.81f, 0.4f), 40, 4f, 0.1f, 1f);
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

    void Animate()
    {
        if (root == null) return;
        field.Fit(56f, 10f, 0f, ViewTop, ViewTop + View);
        for (int k = 0; k < nLeaves; k++)
        {
            float y = SY(LH(k));
            bool vis = !withered[k] && y > -40f && y < 620f;
            leafObj[k].gameObject.SetActive(vis);
            if (vis) leafObj[k].position = field.W(LeafX(k, t), y + (Kind(k) == 3 ? -6f : 4f), -0.2f);
        }
        for (int k = 0; k < nBerries; k++)
        {
            float y = SY(st.berries[2 * k + 1]);
            bool vis = !got[k] && y > -40f && y < 620f;
            berryObj[k].gameObject.SetActive(vis);
            if (vis) berryObj[k].position = field.W(st.berries[2 * k], y, -0.25f);
        }
        float ty = SY(st.top);
        topLine.gameObject.SetActive(ty > -20f && ty < 600f);
        topLine.position = field.W(180f, ty, -0.1f);
        bean.position = field.W(x, SY(h) - 14f, -0.4f);
        float squash = Mathf.Clamp(vh / 4000f, -0.1f, 0.15f);
        bean.localScale = new Vector3(OiyoField.U(32f) * (1f - squash * 0.6f), OiyoField.U(32f) * (1f + squash), 1f);
    }

    // ?oiyotest=1 prints the state to the browser console every frame for the automated play check, with the screen
    // point (px from the top-left) to hold the finger at: where the planned climb's next leaf will be.
    bool testLog;
    void TestTick(float dt)
    {
        if (!testLog) return;
        string nx = "null";
        if (state == GameState.Playing && !over)
        {
            var sp = cam.WorldToScreenPoint(field.W(PlanTarget(), 300f, 0f));
            nx = $"[{sp.x:F2},{Screen.height - sp.y:F2}]";
        }
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"h\":{h:F0},\"top\":{st.top:F0},\"berries\":{berries},\"par\":{st.par},\"next\":{nx},\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.32f, 0.81f, 0.4f, 0.97f);
    static readonly Color Dark = new Color(0.08f, 0.14f, 0.22f, 0.9f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("Berries {0}", BoingUpStages.All[i].par);

    void OnGUI()
    {
        OiyoArcade.Begin();
        float w = OiyoArcade.W, hh = OiyoArcade.H;
        if (state == GameState.Menu)
        {
            if (showStages)
            {
                int pick = OiyoScreens.Stages(w, hh, Dark, Accent, Slug, StageCount, U("Choose a stage"), U("Back"), U("Stage"));
                if (pick == -2) showStages = false; else if (pick >= 0) LoadStage(pick);
                return;
            }
            int m = OiyoScreens.Menu(w, hh, Dark, Accent, new Color(0.9f, 1f, 0.9f), U("Boing Up"),
                U("A springy bean bounces up the beanstalk on its own. Hold and slide to steer it left and right. Reach the top without falling off the bottom, picking berries on the way."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        var bar = new Rect(8f, 8f, w - 16f, 44f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 18f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>  " + F("Berries {0}", berries + "/" + st.par), 15, new Color(0.9f, 1f, 0.9f));
        OiyoArcade.Bar(new Rect(16f, 58f, w - 32f, 6f), Mathf.Clamp01(h / st.top), new Color(0.2f, 0.23f, 0.25f), new Color(0.32f, 0.81f, 0.4f));
        if (OiyoArcade.Button(new Rect(w - 56f, 12f, 40f, 36f), "<b>II</b>", OiyoScreens.Slate, 16))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, hh, Dark, U("Tap to start"), U("Hold and slide to steer the bean!"), 120f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, hh, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            string detail = won ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : "";
            string body = won ? $"<size=14>{F("Up top with {0} berries", berries)}</size>" : "";
            int r = OiyoScreens.Result(w, hh, Dark, Accent, won, ResultLive, won ? U("Made it to the top!") : U("Fell off the bottom"), detail, body,
                won && stageIdx < StageCount - 1 ? U("Next stage") : null, won && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
