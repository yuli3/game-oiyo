using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Bridge Walk 3D: the web Bridge Walk (src/components/games/BridgeWalk.tsx, src/lib/games/bridge-walk.ts)
// rebuilt in Unity. The rules are the web's: the walker walks at 1.4 m/s and tips like an inverted
// pendulum, lean'' = g sin(lean) − 1.2 lean' + push + wind, with a higher g on icy planks. Dragging
// right from where you touched pushes the lean left: push = −6 × clamp(drag / 70 px). Past 0.62 rad
// they fall in. The 30 crossings are the web's own (BridgeWalkStages.cs). Keyboard: ← and →.
public class BridgeWalkPlayer : MonoBehaviour
{
    const string Slug = "bridge-walk";
    const int StageCount = 30;
    const float Fall = 0.62f, Damp = 1.2f, UMax = 6f, DragFull = 70f, Speed = 1.4f;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of bridge-walk.ts) ----------------
    BridgeWalkStages.Level st;
    int stageIdx;
    float t, x, lean, spin, push, sumLean;
    bool over, won, fell;
    int starsWon;

    void NewWalker() { t = 0f; x = 0f; lean = 0.02f; spin = 0f; push = 0f; sumLean = 0f; over = false; won = false; fell = false; }

    bool OnIce(float at)
    {
        for (int i = 0; i + 1 < st.ice.Length; i += 2) if (at >= st.ice[i] && at < st.ice[i + 1]) return true;
        return false;
    }
    float WindAt(float tt)
    {
        float w = 0f;
        for (int i = 0; i + 2 < st.gusts.Length; i += 3)
        {
            float at = st.gusts[i], len = st.gusts[i + 1];
            if (tt >= at && tt < at + len) w += st.gusts[i + 2] * Mathf.Sin(Mathf.PI * (tt - at) / len);
        }
        return w;
    }
    void SetDrag(float dx) { push = -UMax * Mathf.Clamp(dx / DragFull, -1f, 1f); }

    bool Step(float dt)
    {
        if (over) return false;
        int n = Mathf.Max(1, Mathf.CeilToInt(dt / (1f / 240f)));
        float h = dt / n;
        for (int k = 0; k < n; k++)
        {
            float g = OnIce(x) ? st.iceGravity : st.gravity;
            float a = g * Mathf.Sin(lean) - Damp * spin + push + WindAt(t);
            spin += a * h;
            lean += spin * h;
            t += h;
            x += Speed * h;
            sumLean += Mathf.Abs(lean) * h;
            if (Mathf.Abs(lean) > Fall) { over = true; fell = true; return true; }
            if (x >= st.length) { over = true; won = true; return true; }
        }
        return false;
    }

    int StarsFor()
    {
        if (!won) return 0;
        float avg = sumLean / Mathf.Max(1e-6f, t);
        if (avg <= 0.09f) return 3;
        if (avg <= 0.14f) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    Camera cam;
    Transform root, walker, pivot;
    Material walkerMat, plankMat, iceMat, postMat, waterMat, moonMat, bankMat;
    Bursts bursts;
    Synth synth;
    bool showStages;
    const float M = 1f; // world units per metre

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        cam = new GameObject("Camera").AddComponent<Camera>();
        cam.fieldOfView = 45f; cam.nearClipPlane = 0.1f; cam.farClipPlane = 200f;
        cam.clearFlags = CameraClearFlags.SolidColor;
        cam.backgroundColor = new Color(0.08f, 0.1f, 0.23f);
        OiyoField.Lights(new Color(0.5f, 0.55f, 0.75f), 0.75f, 35f, -20f);
        bursts = new Bursts(transform, 0.5f);
        synth = new Synth(gameObject);
        walkerMat = OiyoField.Sprite("BW/walker");
        plankMat = OiyoArcade.Lit(Color.white, 0.2f, OiyoArcade.Art("BW/wood", true));
        iceMat = OiyoArcade.Lit(new Color(0.82f, 0.92f, 1f), 0.9f);
        postMat = OiyoArcade.Lit(new Color(0.36f, 0.24f, 0.18f), 0.2f);
        waterMat = OiyoArcade.Lit(Color.white, 0.8f, OiyoArcade.Art("BW/water", true));
        moonMat = OiyoArcade.Glow(new Color(1f, 0.95f, 0.75f));
        bankMat = OiyoArcade.Lit(new Color(0.85f, 0.88f, 0.92f), 0.3f);
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int idx, bool ready = true)
    {
        stageIdx = Mathf.Clamp(idx, 0, StageCount - 1);
        StopAllCoroutines();
        st = BridgeWalkStages.All[stageIdx];
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Bridge").transform;
        NewWalker();
        starsWon = 0;
        showStages = false;
        grabId = int.MinValue; keyDx = 0f;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Animate(0f);
    }

    void BuildScene()
    {
        var water = OiyoArcade.Prim(PrimitiveType.Cube, "Stream", waterMat, root);
        water.transform.position = new Vector3(st.length * 0.5f, -2.2f, 4f);
        water.transform.localScale = new Vector3(st.length + 60f, 0.2f, 30f);
        for (float m = -3f; m < st.length + 4f; m += 1f)
        {
            var plank = OiyoArcade.Prim(PrimitiveType.Cube, "Plank", OnIce(m + 0.5f) ? iceMat : plankMat, root);
            plank.transform.position = new Vector3((m + 0.5f) * M, -0.1f, 0f);
            plank.transform.localScale = new Vector3(0.92f * M, 0.2f, 1.6f);
            if (((int)Mathf.Floor(m)) % 3 == 0)
            {
                var post = OiyoArcade.Prim(PrimitiveType.Cube, "Post", postMat, root);
                post.transform.position = new Vector3((m + 0.5f) * M, -1.2f, 0f);
                post.transform.localScale = new Vector3(0.2f, 2.1f, 0.2f);
            }
        }
        for (int s = 0; s < 2; s++)
        {
            var bank = OiyoArcade.Prim(PrimitiveType.Cube, "Bank", bankMat, root);
            bank.transform.position = new Vector3(s == 0 ? -10f : st.length + 10f, -0.6f, 2f);
            bank.transform.localScale = new Vector3(14f, 1.2f, 20f);
        }
        var moon = OiyoArcade.Prim(PrimitiveType.Sphere, "Moon", moonMat, root);
        moon.transform.localScale = Vector3.one * 5f;
        moonT = moon.transform;
        pivot = new GameObject("Feet").transform;
        pivot.SetParent(root, false);
        walker = OiyoField.Quad("Walker", walkerMat, pivot, 1f, 1f);
        walker.localScale = new Vector3(1.3f, 1.6f, 1f);
        walker.localPosition = new Vector3(0f, 0.8f, 0f);
    }
    Transform moonT;

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("bridge-walk", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        if (state == GameState.Playing)
        {
            bool ice = OnIce(x);
            if (ice && !wasIce) { Toast(U("Ice!"), new Color(0.6f, 0.85f, 1f)); synth.Tone(1400f, 0.08f, Wave.Triangle, 0.06f, 1800f, 14f); }
            wasIce = ice;
            if (Step(dt))
            {
                if (fell) { bursts.Emit(pivot.position + new Vector3(Mathf.Sign(lean) * 1f, -1.5f, 0f), new Color(0.65f, 0.85f, 1f), 30, 4f, 0.2f, 0.7f); synth.Tone(200f, 0.4f, Wave.Noise, 0.2f, 80f, 5f); }
                End();
            }
        }
        msgT = Mathf.Max(0f, msgT - dt);
        Animate(dt);
    }
    bool wasIce;

    string msg = ""; float msgT; Color msgC = Color.white;
    void Toast(string m, Color c) { msg = m; msgT = 0.7f; msgC = c; }

    int grabId = int.MinValue;
    float grabX, keyDx;
    // screen px -> the web's px (a drag across a phone screen is about the web canvas width)
    float ToPx(float screenDx) => screenDx * 400f / Mathf.Max(1f, Mathf.Min(Screen.width, Screen.height));

    // The finger is read once per frame: how far it is dragged from where it touched.
    void ReadInput()
    {
        bool confirm = Input.GetKeyDown(KeyCode.Return);
        switch (state)
        {
            case GameState.Ready:
            case GameState.Playing:
                {
                    if (state == GameState.Playing && (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P))) { state = GameState.Paused; grabId = int.MinValue; SetDrag(0f); return; }
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (grabId != int.MinValue) continue;
                        if (state == GameState.Ready) state = GameState.Playing;
                        grabId = b.id; grabX = b.pos.x;
                    }
                    float dx = 0f;
                    foreach (var hp in OiyoArcade.Held()) if (hp.id == grabId) dx = ToPx(hp.pos.x - grabX);
                    foreach (var e in OiyoArcade.Ended()) if (e.id == grabId) { grabId = int.MinValue; dx = 0f; }
                    if (Input.GetKey(KeyCode.LeftArrow) || Input.GetKey(KeyCode.A)) keyDx = -DragFull * 0.5f;
                    else if (Input.GetKey(KeyCode.RightArrow) || Input.GetKey(KeyCode.D)) keyDx = DragFull * 0.5f;
                    else keyDx = 0f;
                    if (keyDx != 0f && state == GameState.Ready) state = GameState.Playing;
                    SetDrag(keyDx != 0f ? keyDx : dx);
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
            OiyoArcade.Record(Slug, stageIdx, starsWon, Mathf.RoundToInt(1000f - sumLean / Mathf.Max(0.01f, t) * 1000f), StageCount);
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
        float shown = fell ? Mathf.Sign(lean) * 1.4f : lean;
        pivot.position = new Vector3(x * M, 0f, -0.2f);
        bool portrait = cam.aspect < 1f;
        cam.transform.position = new Vector3(x * M + 0.5f, portrait ? 2.2f : 1.6f, portrait ? -11f : -8f);
        cam.transform.LookAt(new Vector3(x * M + 0.5f, 1.1f, 0f));
        // the walker leans toward or away from the camera's right (+ lean is to the right on screen)
        pivot.rotation = cam.transform.rotation * Quaternion.Euler(0f, 0f, -shown * Mathf.Rad2Deg);
        moonT.position = new Vector3(x * M + 8f, 9f, 40f);
    }

    // ?oiyotest=1 prints the state to the browser console for the automated play check.
    bool testLog; float testT;
    void TestTick(float dt)
    {
        if (!testLog || (testT -= dt) > 0f) return;
        testT = 0.02f;
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"t\":{t:F3},\"x\":{x:F2},\"lean\":{lean:F4},\"spin\":{spin:F4},\"push\":{push:F3},\"length\":{st.length:F1},\"fell\":{(fell ? 1 : 0)},\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.9f, 0.29f, 0.5f, 0.97f);
    static readonly Color Dark = new Color(0.05f, 0.07f, 0.2f, 0.86f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + $"{BridgeWalkStages.All[i].length:F0} m";

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(1f, 0.95f, 0.75f), U("Bridge Walk"),
                U("Press and drag left or right to lean against the tip. Gusts and ice push; don't over-correct."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        var bar = new Rect(8f, 8f, w - 16f, 64f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 12f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>", 15, new Color(1f, 0.92f, 0.75f));
        OiyoArcade.Text(new Rect(20f, 36f, w - 90f, 24f), $"<b>{Mathf.Min(x, st.length):F0}/{st.length:F0} m</b>", 16, Color.white);
        if (OiyoArcade.Button(new Rect(w - 60f, 14f, 44f, 44f), "<b>II</b>", OiyoScreens.Slate, 18))
        {
            if (state == GameState.Playing) { state = GameState.Paused; grabId = int.MinValue; SetDrag(0f); }
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (msgT > 0f) OiyoArcade.Shadowed(new Rect(8f, 80f, w - 16f, 36f), msg, 22, msgC, TextAnchor.MiddleCenter);
        if (state == GameState.Playing || state == GameState.Ready)
        {
            float wind = WindAt(t);
            if (state == GameState.Playing && Mathf.Abs(wind) > 0.5f)
                OiyoArcade.Shadowed(new Rect(8f, 120f, w - 16f, 30f), wind > 0f ? U("Gust!") + " →→" : "←← " + U("Gust!"), 22, Color.white, TextAnchor.MiddleCenter);
            // the lean gauge: the green middle is steady, the ends are the stream
            var g = new Rect(30f, h - 50f, w - 60f, 14f);
            OiyoArcade.Fill(g, new Color(0f, 0f, 0f, 0.4f));
            OiyoArcade.Fill(new Rect(g.x + g.width * 0.35f, g.y, g.width * 0.3f, g.height), new Color(0.25f, 0.75f, 0.34f, 0.7f));
            OiyoArcade.Fill(new Rect(g.x + g.width * 0.5f + lean / Fall * g.width * 0.5f - 3f, g.y - 4f, 6f, 22f), Mathf.Abs(lean) > Fall * 0.7f ? new Color(0.88f, 0.19f, 0.19f) : new Color(0.98f, 0.69f, 0.02f));
        }
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Drag against the lean"), U("If they tip right, drag a little left. Small drags, early."), 200f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            bool w0 = state == GameState.Victory;
            string detail = w0 ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : $"{Mathf.Min(x, st.length):F0}/{st.length:F0} m";
            string body = w0 ? $"<b>{F("Average lean {0}°", (sumLean / Mathf.Max(0.01f, t) * Mathf.Rad2Deg).ToString("F1"))}</b>" : "";
            int r = OiyoScreens.Result(w, h, Dark, Accent, w0, ResultLive, w0 ? U("You crossed the bridge!") : U("Splash! Into the stream"), detail, body,
                w0 && stageIdx < StageCount - 1 ? U("Next stage") : null, w0 && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
