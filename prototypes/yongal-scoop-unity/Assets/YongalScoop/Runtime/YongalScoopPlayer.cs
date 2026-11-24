using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Yongal Scoop 3D: the web Yongal Scoop (src/components/games/YongalScoop.tsx, src/lib/games/yongal-scoop.ts)
// rebuilt in Unity on the web's own 360 × 560 px field (OiyoField), looking down the well. The dipper swings
// at 180 + A sin(2πt/P); let go at t it lands at x(t) + x'(t) × fall (kept inside the water's 150 px radius).
// The moon's reflection sits at 180 + amp sin(2πt/Q + stage), pushed by 26 px × (1 − s/ripple) sin(14 s) for
// s seconds after a splash. Landing within its radius scoops it; after a splash the dipper is back once the
// ripple time has passed. Scoop the mark before dawn. The 30 wells are the web's own (YongalScoopStages.cs).
public class YongalScoopPlayer : MonoBehaviour
{
    const string Slug = "yongal-scoop";
    const int StageCount = 30;
    const float Center = 180f, WellR = 150f, Wobble = 26f, CY = 300f;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of yongal-scoop.ts) ----------------
    YongalScoopStages.Level st;
    int stageIdx, scooped, missed, starsWon;
    float t, readyAt, splashAt, dropAt, dropX;
    bool ready, over, won;

    float SwingX(float at) => Center + st.swingAmp * Mathf.Sin(2f * Mathf.PI * at / st.swingPeriod);
    float SwingV(float at) => st.swingAmp * (2f * Mathf.PI / st.swingPeriod) * Mathf.Cos(2f * Mathf.PI * at / st.swingPeriod);
    float LandingX(float at) => Mathf.Clamp(SwingX(at) + SwingV(at) * st.fall, Center - WellR, Center + WellR);
    float MoonX(float at)
    {
        float calm = Center + st.moonAmp * Mathf.Sin(2f * Mathf.PI * at / st.moonPeriod + stageIdx);
        float since = at - splashAt;
        if (since < 0f || since >= st.ripple) return calm;
        return calm + Wobble * (1f - since / st.ripple) * Mathf.Sin(since * 14f);
    }

    void NewWell() { t = 0f; ready = true; readyAt = 0f; splashAt = -1e9f; dropAt = -1f; dropX = 0f; scooped = 0; missed = 0; over = false; won = false; }

    bool Drop()
    {
        if (over || !ready) return false;
        ready = false; dropAt = t; dropX = LandingX(t);
        return true;
    }

    int landed; // 0 nothing, 1 moon, -1 miss
    bool Step(float dt)
    {
        landed = 0;
        if (over) return false;
        t += dt;
        if (dropAt >= 0f && t >= dropAt + st.fall)
        {
            float hit = dropAt + st.fall;
            bool moon = Mathf.Abs(dropX - MoonX(hit)) <= st.moonR;
            if (moon) scooped++; else missed++;
            landed = moon ? 1 : -1;
            splashAt = hit; dropAt = -1f; readyAt = hit + st.ripple;
        }
        if (!ready && dropAt < 0f && t >= readyAt) ready = true;
        if (scooped >= st.need) { over = true; won = true; return true; }
        if (t >= st.time && dropAt < 0f) { over = true; won = false; return true; }
        return false;
    }

    int StarsFor()
    {
        if (!won) return 0;
        if (missed == 0 && t <= st.par * 1.25f) return 3;
        if (missed <= 2) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    OiyoField field;
    Camera cam;
    Transform root, moon, dipper, rope;
    readonly List<Transform> rings = new List<Transform>();
    readonly List<float> ringAge = new List<float>();
    Material stoneMat, waterMat, moonMat, ropeMat, dipperMat, ringMat;
    Bursts bursts;
    Synth synth;
    bool showStages;

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(360f, 560f, new Color(0.08f, 0.09f, 0.24f));
        cam = field.Cam;
        OiyoField.Lights(new Color(0.45f, 0.48f, 0.6f), 0.7f, 30f, -20f);
        bursts = new Bursts(transform, 0.8f);
        synth = new Synth(gameObject);
        stoneMat = OiyoArcade.Lit(Color.white, 0.2f, OiyoArcade.Art("YS/stone", true));
        waterMat = OiyoArcade.Lit(new Color(0.04f, 0.11f, 0.2f), 0.9f);
        moonMat = OiyoArcade.Glow(new Color(1f, 0.95f, 0.75f));
        ropeMat = OiyoArcade.Lit(new Color(0.79f, 0.64f, 0.42f), 0.1f);
        dipperMat = OiyoField.Sprite("YS/dipper");
        ringMat = OiyoArcade.Transparent(OiyoArcade.Art("YS/ring"), new Color(0.65f, 0.85f, 1f, 0.6f));
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int i, bool readyNow = true)
    {
        stageIdx = Mathf.Clamp(i, 0, StageCount - 1);
        StopAllCoroutines();
        st = YongalScoopStages.All[stageIdx];
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Well").transform;
        NewWell();
        starsWon = 0;
        showStages = false;
        BuildScene();
        state = readyNow ? GameState.Ready : GameState.Menu;
        Animate(0f);
    }

    void BuildScene()
    {
        // the stone rim and the dark water far below, seen from above
        var rim = OiyoArcade.Prim(PrimitiveType.Cylinder, "Rim", stoneMat, root);
        rim.transform.position = field.W(Center, CY, 0.2f);
        rim.transform.rotation = Quaternion.Euler(90f, 0f, 0f);
        rim.transform.localScale = new Vector3(OiyoField.U((WellR + 28f) * 2f), 0.3f, OiyoField.U((WellR + 28f) * 2f));
        var water = OiyoArcade.Prim(PrimitiveType.Cylinder, "Water", waterMat, root);
        water.transform.position = field.W(Center, CY, -0.15f);
        water.transform.rotation = Quaternion.Euler(90f, 0f, 0f);
        water.transform.localScale = new Vector3(OiyoField.U(WellR * 2f), 0.02f, OiyoField.U(WellR * 2f));
        moon = OiyoArcade.Prim(PrimitiveType.Cylinder, "Moon", moonMat, root).transform;
        moon.rotation = Quaternion.Euler(90f, 0f, 0f);
        moon.localScale = new Vector3(OiyoField.U(st.moonR * 2f), 0.01f, OiyoField.U(st.moonR * 2f));
        rope = OiyoArcade.Prim(PrimitiveType.Cube, "Rope", ropeMat, root).transform;
        dipper = OiyoField.Quad("Dipper", dipperMat, root, 64f, 64f);
        rings.Clear(); ringAge.Clear();
        for (int k = 0; k < 3; k++)
        {
            var r = OiyoField.Quad("Ripple", ringMat, root, 40f, 24f);
            r.gameObject.SetActive(false);
            rings.Add(r); ringAge.Add(9f);
        }
    }

    // ---------------- Loop ----------------
    float ringX;
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("yongal-scoop", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        if (state == GameState.Playing)
        {
            bool end = Step(dt);
            if (landed != 0)
            {
                ringX = dropX;
                for (int k = 0; k < rings.Count; k++) ringAge[k] = -k * 0.25f;
                if (landed > 0)
                {
                    Toast(U("The dragon's egg!"), new Color(1f, 0.85f, 0.4f));
                    bursts.Emit(field.W(dropX, CY, -0.5f), new Color(1f, 0.9f, 0.5f), 18, 2.5f, 0.12f, 0.7f);
                    synth.Tone(880f, 0.16f, Wave.Triangle, 0.2f, 1320f, 7f);
                }
                else
                {
                    Toast(U("Splash…"), new Color(0.55f, 0.8f, 1f));
                    bursts.Emit(field.W(dropX, CY, -0.5f), new Color(0.6f, 0.82f, 1f), 10, 2f, 0.1f, 0.5f);
                    synth.Tone(260f, 0.18f, Wave.Noise, 0.1f, 140f, 9f);
                }
            }
            if (end) End();
        }
        msgT = Mathf.Max(0f, msgT - dt);
        Animate(dt);
    }

    string msg = ""; float msgT; Color msgC = Color.white;
    void Toast(string m, Color c) { msg = m; msgT = 0.9f; msgC = c; }

    void Tap()
    {
        if (state == GameState.Ready) { state = GameState.Playing; return; }
        if (Drop()) synth.Tone(520f, 0.06f, Wave.Triangle, 0.12f, 360f, 12f);
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
                    // taps are read once per frame: the first starts the dawn clock, the rest let the rope go
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (OiyoArcade.OverUi(b.pos)) continue;
                        Tap();
                    }
                    if (Input.GetKeyDown(KeyCode.Space)) Tap();
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
            OiyoArcade.Record(Slug, stageIdx, starsWon, scooped, StageCount);
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
        field.Fit(80f, 60f, 0f, 120f, 480f);
        float dawn = Mathf.Min(1f, t / st.time);
        cam.backgroundColor = Color.Lerp(new Color(0.08f, 0.09f, 0.24f), new Color(0.55f, 0.45f, 0.62f), dawn);
        moon.position = field.W(MoonX(t), CY, -0.2f);
        float x, scale, z;
        if (dropAt >= 0f)
        {
            float p = Mathf.Min(1f, (t - dropAt) / st.fall);
            float x0 = SwingX(dropAt);
            x = x0 + (dropX - x0) * p;
            scale = Mathf.Lerp(64f, 28f, p);
            z = Mathf.Lerp(-2.5f, -0.3f, p);
            rope.gameObject.SetActive(false);
            dipper.gameObject.SetActive(true);
        }
        else
        {
            x = SwingX(t); scale = 64f; z = -2.5f;
            rope.gameObject.SetActive(ready);
            dipper.gameObject.SetActive(ready);
        }
        dipper.position = field.W(x, CY - 6f, z);
        dipper.localScale = new Vector3(OiyoField.U(scale), OiyoField.U(scale), 1f);
        // the rope hangs from the windlass above the rim
        var top = field.W(Center, 120f, -3f);
        var end = field.W(x, CY - 24f, -2.5f);
        rope.position = (top + end) * 0.5f;
        rope.up = (end - top).normalized;
        rope.localScale = new Vector3(0.06f, (end - top).magnitude, 0.06f);
        for (int k = 0; k < rings.Count; k++)
        {
            ringAge[k] += dt;
            bool on = ringAge[k] >= 0f && ringAge[k] < 1.4f;
            rings[k].gameObject.SetActive(on);
            if (!on) continue;
            float s = 1f + ringAge[k] * 4f;
            rings[k].position = field.W(ringX, CY, -0.25f);
            rings[k].localScale = new Vector3(OiyoField.U(40f * s), OiyoField.U(24f * s), 1f);
        }
    }

    // ?oiyotest=1 prints the state to the browser console for the automated play check: the time, whether the
    // dipper is ready, the last splash, the stage's swing, fall, moon and ripple numbers, and the counts.
    bool testLog; float testT;
    void TestTick(float dt)
    {
        if (!testLog || (testT -= dt) > 0f) return;
        testT = 0.01f;
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"t\":{t:F4},\"ready\":{(ready ? "true" : "false")},\"splash\":{(splashAt < -1e8f ? -1e9f : splashAt):F4},\"amp\":{st.swingAmp:F4},\"period\":{st.swingPeriod:F4},\"fall\":{st.fall:F4},\"moonR\":{st.moonR:F4},\"moonAmp\":{st.moonAmp:F4},\"moonPeriod\":{st.moonPeriod:F4},\"ripple\":{st.ripple:F4},\"time\":{st.time:F1},\"scooped\":{scooped},\"missed\":{missed},\"need\":{st.need},\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.9f, 0.6f, 0.15f, 0.97f);
    static readonly Color Dark = new Color(0.06f, 0.08f, 0.2f, 0.88f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("Goal {0}", YongalScoopStages.All[i].need);

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(1f, 0.95f, 0.75f), U("Yongal Scoop"),
                U("Tap to let the swinging dipper go. It keeps its swing as it falls, so let go early and land it on the moon."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        var bar = new Rect(8f, 8f, w - 16f, 64f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 12f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>", 15, new Color(1f, 0.95f, 0.75f));
        OiyoArcade.Text(new Rect(20f, 36f, w - 90f, 24f), F("Moons {0}/{1}", scooped, st.need), 16, Color.white);
        if (OiyoArcade.Button(new Rect(w - 60f, 14f, 44f, 44f), "<b>II</b>", OiyoScreens.Slate, 18))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (state == GameState.Playing || state == GameState.Ready)
        {
            OiyoArcade.Text(new Rect(16f, h - 46f, w - 32f, 16f), U("Until dawn"), 12, Color.white);
            OiyoArcade.Bar(new Rect(16f, h - 28f, w - 32f, 10f), Mathf.Min(1f, t / st.time), new Color(0f, 0f, 0f, 0.4f), new Color(1f, 0.66f, 0.3f));
        }
        if (msgT > 0f) OiyoArcade.Shadowed(new Rect(8f, 80f, w - 16f, 36f), msg, 22, msgC, TextAnchor.MiddleCenter);
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap to start"), U("Let go early: the swing carries the dipper."), 200f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            bool w0 = state == GameState.Victory;
            string detail = w0 ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : F("Moons {0}/{1}", scooped, st.need);
            string body = $"<size=14>{F("{0} moons scooped · {1} dippers missed", scooped, missed)}</size>";
            int r = OiyoScreens.Result(w, h, Dark, Accent, w0, ResultLive, w0 ? U("You scooped the dragon's egg! A lucky year!") : U("Dawn came first"), detail, body,
                w0 && stageIdx < StageCount - 1 ? U("Next stage") : null, w0 && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
