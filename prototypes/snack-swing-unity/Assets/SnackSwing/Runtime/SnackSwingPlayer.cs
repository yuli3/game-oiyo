using System.Collections;
using UnityEngine;

// Snack Swing 3D: the web Snack Swing (src/components/games/SnackSwing.tsx, src/lib/games/snack-swing.ts) rebuilt in
// Unity on the web's own 360 × 560 px field (OiyoField). A cookie hangs from a few ropes over a hungry hamster: tap or
// swipe a rope to snip it, and time the snips so the cookie swings and drops into the hamster's mouth, picking up the
// sparkles and missing the thorns. The physics runs on the web's fixed 1/120 s steps; the 30 stages are the web's own
// (SnackSwingStages.cs).
public class SnackSwingPlayer : MonoBehaviour
{
    const string Slug = "snack-swing";
    const int StageCount = 30;
    const float Gravity = 900f, SnackR = 14f, MouthR = 24f, SparkleR = 20f, ThornR = 16f, DT = 1f / 120f, TapR = 18f;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of snack-swing.ts) ----------------
    SnackSwingStages.Level st;
    int stageIdx, starsWon, nRopes, nSparkles, nThorns, sparkles, snips;
    float t, x, y, vx, vy;
    bool[] cut, got;
    bool over, won;

    float AX(int k) => st.ropes[3 * k];
    float AY(int k) => st.ropes[3 * k + 1];
    float Len(int k) => st.ropes[3 * k + 2];

    bool Snip(int k)
    {
        if (over || k < 0 || k >= nRopes || cut[k]) return false;
        cut[k] = true; snips++;
        return true;
    }

    static float SegDist(float px, float py, float ax, float ay, float bx, float by)
    {
        float dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy;
        float k = l == 0f ? 0f : Mathf.Clamp01(((px - ax) * dx + (py - ay) * dy) / l);
        return Mathf.Sqrt((px - (ax + dx * k)) * (px - (ax + dx * k)) + (py - (ay + dy * k)) * (py - (ay + dy * k)));
    }

    int RopeAt(float px, float py)
    {
        int best = -1; float bestD = TapR;
        for (int k = 0; k < nRopes; k++)
        {
            if (cut[k]) continue;
            float d = SegDist(px, py, AX(k), AY(k), x, y);
            if (d < bestD) { bestD = d; best = k; }
        }
        return best;
    }

    void Step(out bool sparkle)
    {
        sparkle = false;
        if (over) return;
        t += DT;
        vy += Gravity * DT;
        x += vx * DT;
        y += vy * DT;
        for (int pass = 0; pass < 3; pass++)
        {
            for (int k = 0; k < nRopes; k++)
            {
                if (cut[k]) continue;
                float dx = x - AX(k), dy = y - AY(k), d = Mathf.Sqrt(dx * dx + dy * dy);
                if (d <= Len(k) || d == 0f) continue;
                float nx = dx / d, ny = dy / d;
                x = AX(k) + nx * Len(k);
                y = AY(k) + ny * Len(k);
                float outV = vx * nx + vy * ny;
                if (outV > 0f) { vx -= outV * nx; vy -= outV * ny; }
            }
        }
        vx *= 0.9995f;
        vy *= 0.9995f;
        for (int k = 0; k < nSparkles; k++)
        {
            float sx = st.sparkles[2 * k] - x, sy = st.sparkles[2 * k + 1] - y;
            if (got[k] || Mathf.Sqrt(sx * sx + sy * sy) > SparkleR + SnackR * 0.5f) continue;
            got[k] = true; sparkles++; sparkle = true;
        }
        float mx = st.mouth[0] - x, my = st.mouth[1] - y;
        if (Mathf.Sqrt(mx * mx + my * my) < MouthR) { over = true; won = true; return; }
        for (int k = 0; k < nThorns; k++)
        {
            float tx = st.thorns[2 * k] - x, ty = st.thorns[2 * k + 1] - y;
            if (Mathf.Sqrt(tx * tx + ty * ty) < ThornR + SnackR) { over = true; return; }
        }
        if (y > 620f || x < -40f || x > 400f || t > 30f) over = true;
    }

    int StarsFor() => won ? Mathf.Max(1, sparkles) : 0;

    // ---------------- Scene ----------------
    OiyoField field;
    Camera cam;
    Transform root, cookie, hamster;
    Transform[] ropeObj, pegObj, sparkleObj;
    Bursts burst;
    Synth synth;
    bool showStages, swiping;
    int swipeId, planAt;
    float acc, chew;

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(360f, 560f, new Color(1f, 0.95f, 0.86f));
        cam = field.Cam;
        OiyoField.Lights(new Color(0.76f, 0.74f, 0.72f), 0.7f, 50f, -25f);
        burst = new Bursts(transform, 0.5f);
        synth = new Synth(gameObject);
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int i, bool ready = true)
    {
        stageIdx = Mathf.Clamp(i, 0, StageCount - 1);
        StopAllCoroutines();
        st = SnackSwingStages.All[stageIdx];
        nRopes = st.ropes.Length / 3; nSparkles = st.sparkles.Length / 2; nThorns = st.thorns.Length / 2;
        cut = new bool[nRopes]; got = new bool[nSparkles];
        t = 0f; x = st.start[0]; y = st.start[1]; vx = 0f; vy = 0f; sparkles = 0; snips = 0;
        over = false; won = false; starsWon = 0; acc = 0f; swiping = false; planAt = 0; chew = 0f;
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Kitchen").transform;
        showStages = false;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Animate();
    }

    Transform Box(string name, Material m, float bx, float by, float w, float h, float z, float d)
    {
        var o = OiyoArcade.Prim(PrimitiveType.Cube, name, m, root).transform;
        o.localScale = new Vector3(OiyoField.U(w), OiyoField.U(h), d);
        o.position = field.W(bx, by, z);
        return o;
    }

    void BuildScene()
    {
        // a cosy wallpaper of soft squares, and a wooden beam the ropes hang from
        Box("Wall", OiyoArcade.Glow(new Color(1f, 0.95f, 0.86f)), 180f, 280f, 1200f, 1600f, 0.8f, 0.2f);
        var dot = OiyoArcade.Glow(new Color(1f, 0.87f, 0.7f));
        for (int gy = 0; gy < 600; gy += 48) for (int gx = (gy / 48) % 2 == 0 ? 0 : 24; gx < 380; gx += 48) Box("Dot", dot, gx, gy, 10f, 10f, 0.7f, 0.02f);
        Box("Beam", OiyoArcade.Lit(new Color(0.62f, 0.42f, 0.24f), 0.3f), 180f, 58f, 400f, 18f, 0.3f, 0.3f);
        var ropeMat = OiyoArcade.Lit(new Color(0.55f, 0.36f, 0.2f), 0.2f);
        var pegMat = OiyoArcade.Lit(new Color(0.45f, 0.5f, 0.58f), 0.6f, null, 0.5f);
        ropeObj = new Transform[nRopes]; pegObj = new Transform[nRopes];
        for (int k = 0; k < nRopes; k++)
        {
            ropeObj[k] = OiyoArcade.Prim(PrimitiveType.Cube, "Rope", ropeMat, root).transform;
            pegObj[k] = OiyoArcade.Prim(PrimitiveType.Sphere, "Peg", pegMat, root).transform;
            pegObj[k].localScale = Vector3.one * OiyoField.U(12f);
            pegObj[k].position = field.W(AX(k), AY(k), -0.2f);
        }
        sparkleObj = new Transform[nSparkles];
        var sparkleMat = OiyoField.Sprite("SS/sparkle");
        for (int k = 0; k < nSparkles; k++) sparkleObj[k] = OiyoField.Quad("Sparkle", sparkleMat, root, 28f, 28f);
        var thornMat = OiyoField.Sprite("SS/thorn");
        for (int k = 0; k < nThorns; k++) OiyoField.Quad("Thorn", thornMat, root, 32f, 32f).position = field.W(st.thorns[2 * k], st.thorns[2 * k + 1], -0.25f);
        hamster = OiyoField.Quad("Hamster", OiyoField.Sprite("SS/hamster"), root, 60f, 50f);
        hamster.position = field.W(st.mouth[0], st.mouth[1] + 14f, -0.3f);
        cookie = OiyoField.Quad("Cookie", OiyoField.Sprite("SS/cookie"), root, 32f, 32f);
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("snack-swing", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick();
        ReadInput();
        while (planAt < st.plan.Length / 2 && cut[(int)st.plan[2 * planAt + 1]]) planAt++;
        if (state == GameState.Playing && !over)
        {
            acc += dt;
            while (acc >= DT && !over)
            {
                // the play check holds the swing at each planned snip until the bot has snipped it
                if (testLog && Due()) { acc = Mathf.Min(acc, DT); break; }
                acc -= DT;
                Step(out bool sparkle);
                if (sparkle) { burst.Emit(field.W(x, y, -0.5f), new Color(1f, 0.83f, 0.23f), 10, 2f, 0.05f, 0.4f); synth.Tone(988f + sparkles * 120f, 0.06f, Wave.Triangle, 0.1f); }
            }
            if (over) End();
        }
        chew = Mathf.Max(0f, chew - dt);
        Animate();
    }

    bool Due() => planAt < st.plan.Length / 2 && t >= st.plan[2 * planAt];

    void Cut(int k)
    {
        if (state != GameState.Playing || !Snip(k)) return;
        Vector2 mid = new Vector2((AX(k) + x) / 2f, (AY(k) + y) / 2f);
        burst.Emit(field.W(mid.x, mid.y, -0.5f), new Color(0.55f, 0.36f, 0.2f), 6, 1.5f, 0.04f, 0.3f);
        synth.Tone(660f, 0.05f, Wave.Square, 0.06f, 330f);
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
                    // snips are read once per frame: a touch over a rope, or a finger swiped across one
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (state == GameState.Ready) { state = GameState.Playing; continue; }
                        swiping = true; swipeId = b.id;
                        if (field.ToField(b.pos, out Vector2 f)) Cut(RopeAt(f.x, f.y));
                    }
                    if (swiping)
                    {
                        foreach (var hp in OiyoArcade.Held()) if (hp.id == swipeId && field.ToField(hp.pos, out Vector2 f)) Cut(RopeAt(f.x, f.y));
                        foreach (var e in OiyoArcade.Ended()) if (e.id == swipeId) swiping = false;
                    }
                    int key = Input.GetKeyDown(KeyCode.Alpha1) ? 0 : Input.GetKeyDown(KeyCode.Alpha2) ? 1 : Input.GetKeyDown(KeyCode.Alpha3) ? 2 : -1;
                    bool first = Input.GetKeyDown(KeyCode.Space) || confirm;
                    if (state == GameState.Ready) { if (key >= 0 || first) state = GameState.Playing; return; }
                    if (key >= 0) Cut(key);
                    else if (first) for (int k = 0; k < nRopes; k++) if (!cut[k]) { Cut(k); break; }
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
        swiping = false;
        if (won)
        {
            state = GameState.Victory;
            chew = 1.2f;
            OiyoArcade.Record(Slug, stageIdx, starsWon, sparkles * 10, StageCount);
            burst.Emit(field.W(st.mouth[0], st.mouth[1], -1f), new Color(1f, 0.53f, 0.53f), 40, 4f, 0.1f, 1f);
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
        field.Fit(56f, 10f, 0f, 50f, 540f);
        for (int k = 0; k < nRopes; k++)
        {
            ropeObj[k].gameObject.SetActive(!cut[k]);
            if (cut[k]) continue;
            float dx = x - AX(k), dy = y - AY(k), len = Mathf.Sqrt(dx * dx + dy * dy);
            ropeObj[k].position = field.W((AX(k) + x) / 2f, (AY(k) + y) / 2f, -0.15f);
            ropeObj[k].localScale = new Vector3(OiyoField.U(len), OiyoField.U(4f), OiyoField.U(4f));
            ropeObj[k].rotation = Quaternion.Euler(0f, 0f, -Mathf.Atan2(dy, dx) * Mathf.Rad2Deg);
        }
        for (int k = 0; k < nSparkles; k++)
        {
            sparkleObj[k].gameObject.SetActive(!got[k]);
            sparkleObj[k].position = field.W(st.sparkles[2 * k], st.sparkles[2 * k + 1] + Mathf.Sin(t * 5f + k) * 2f, -0.25f);
        }
        cookie.gameObject.SetActive(!won);
        cookie.position = field.W(x, y, -0.4f);
        cookie.rotation = Quaternion.Euler(0f, 0f, -x * 0.02f * Mathf.Rad2Deg);
        float bob = chew > 0f ? Mathf.Abs(Mathf.Sin(chew * 18f)) * 0.12f : Mathf.Sin(Time.time * 3f) * 0.03f;
        hamster.localScale = new Vector3(OiyoField.U(60f) * (1f + bob * 0.5f), OiyoField.U(50f) * (1f - bob), 1f);
    }

    // ?oiyotest=1 prints the state to the browser console every frame for the automated play check. When the stage's
    // own plan says it is time to snip a rope, it gives the screen point of a spot on that rope that a tap would snip.
    bool testLog;
    void TestTick()
    {
        if (!testLog) return;
        string nx = "null";
        if (state == GameState.Playing && !over && Due())
        {
            int k = (int)st.plan[2 * planAt + 1];
            foreach (float f in new[] { 0.5f, 0.35f, 0.65f, 0.2f, 0.8f, 0.1f, 0.9f })
            {
                float px = AX(k) + (x - AX(k)) * f, py = AY(k) + (y - AY(k)) * f;
                if (RopeAt(px, py) != k) continue;
                var sp = cam.WorldToScreenPoint(field.W(px, py, 0f));
                nx = $"[{sp.x:F1},{Screen.height - sp.y:F1}]";
                break;
            }
        }
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"t\":{t:F2},\"taps\":{snips},\"sparkles\":{sparkles},\"next\":{nx},\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.96f, 0.62f, 0f, 0.97f);
    static readonly Color Dark = new Color(0.22f, 0.13f, 0.06f, 0.9f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("Ropes {0}", SnackSwingStages.All[i].ropes.Length / 3);

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(1f, 0.93f, 0.8f), U("Snack Swing"),
                U("A cookie hangs from a few ropes over a hungry hamster. Tap or swipe a rope to snip it. Time the snips so the cookie swings into the hamster's mouth, picking up the sparkles and missing the thorns."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        var bar = new Rect(8f, 8f, w - 16f, 44f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 18f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>  " + F("Sparkles {0}", sparkles + "/" + nSparkles), 15, new Color(1f, 0.93f, 0.8f));
        if (OiyoArcade.Button(new Rect(w - 56f, 12f, 40f, 36f), "<b>II</b>", OiyoScreens.Slate, 16))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap to start"), U("Tap or swipe a rope to snip it!"), 120f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            string detail = won ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : "";
            string body = won ? $"<size=14>{F("Fed with {0} sparkles", sparkles)}</size>" : "";
            int r = OiyoScreens.Result(w, h, Dark, Accent, won, ResultLive, won ? U("Yum, so tasty!") : U("The cookie got away"), detail, body,
                won && stageIdx < StageCount - 1 ? U("Next stage") : null, won && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
