using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Snow Halfpipe 3D: the web Snow Halfpipe (src/components/games/SnowHalfpipe.tsx, src/lib/games/snow-halfpipe.ts)
// rebuilt in Unity. The rules are the web's, in its own px: the rider slides across a pipe whose wall
// height is depth (|x| / half)^2.2, gravity 900 along the wall and a little friction; a press in the
// flat bottom (|x| < 0.22 half) pumps once per pass, a press up the wall is a bobble (-10 % speed). Out
// over the lip the speed becomes height; holding spins at 640°/s, letting go stops, and a landing within
// 30° of a whole half turn scores 5 per half turn plus height / 12, a crooked one wipes out (0 points,
// 35 % speed). The 30 pipes are the web's own (SnowHalfpipeStages.cs). Keyboard: Space.
public class SnowHalfpipePlayer : MonoBehaviour
{
    const string Slug = "snow-halfpipe";
    const int StageCount = 30;
    const float Gravity = 900f, SpinRate = 640f, LandTol = 30f, Bottom = 0.22f, PX = 30f;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of snow-halfpipe.ts) ----------------
    SnowHalfpipeStages.Level pipe;
    int stageIdx;
    float time, x, v, y, vy, side, spin, peak;
    bool air, spinning, pumped, over, won;
    int hit, score, crashes, starsWon;
    float down; // distance travelled down the pipe (visual)

    void NewRider()
    {
        time = 0f; x = -pipe.half; v = 60f; air = false; y = 0f; vy = 0f; side = -1f; spin = 0f; spinning = false; pumped = false;
        hit = 0; score = 0; peak = 0f; crashes = 0; over = false; won = false; down = 0f;
    }

    float WallY(float xx) { float u = Mathf.Min(1f, Mathf.Abs(xx) / pipe.half); return pipe.depth * Mathf.Pow(u, 2.2f); }
    float Slope(float xx) { float u = Mathf.Min(1f, Mathf.Abs(xx) / pipe.half); return Mathf.Sign(xx) * (pipe.depth * 2.2f * Mathf.Pow(u, 1.2f)) / pipe.half; }

    string Press()
    {
        if (over) return null;
        if (air) { spinning = true; return "spin"; }
        if (Mathf.Abs(x) < pipe.half * Bottom)
        {
            if (pumped) return null;
            pumped = true;
            v += (v == 0f ? 1f : Mathf.Sign(v)) * pipe.pump;
            return "pump";
        }
        v *= 0.9f;
        return "bobble";
    }

    static bool LandedClean(float s) { float off = s % 180f; return off <= LandTol || off >= 180f - LandTol; }
    static int PointsFor(float s, float pk) => Mathf.RoundToInt(s / 180f) * 5 + Mathf.FloorToInt(pk / 12f);

    void Step(float dt)
    {
        if (over) return;
        int n = Mathf.Max(1, Mathf.CeilToInt(dt / (1f / 480f)));
        float h = dt / n;
        for (int k = 0; k < n && !over; k++)
        {
            time += h;
            down += 140f * h;
            if (air)
            {
                vy -= Gravity * h;
                y += vy * h;
                peak = Mathf.Max(peak, y);
                if (spinning) spin += SpinRate * h;
                if (y <= 0f && vy < 0f)
                {
                    air = false; y = 0f;
                    bool clean = LandedClean(spin);
                    float speed = Mathf.Abs(vy);
                    int pts = clean ? PointsFor(spin, peak) : 0;
                    score += pts; hit++;
                    if (!clean) crashes++;
                    v = -side * speed * (clean ? 0.97f : 0.35f);
                    x = side * (pipe.half - 0.5f);
                    spinning = false;
                    OnLand(clean, pts, spin);
                    if (hit >= pipe.hits) { over = true; won = score >= pipe.goal; }
                }
                continue;
            }
            float s = Slope(x);
            v += -Gravity * s / (1f + s * s) * h;
            v *= 1f - pipe.friction * h;
            float px = x;
            x += v * h / Mathf.Sqrt(1f + s * s);
            if (Mathf.Sign(px) != Mathf.Sign(x) || px == 0f) pumped = false;
            if (Mathf.Abs(x) >= pipe.half)
            {
                side = Mathf.Sign(x);
                x = side * pipe.half;
                vy = Mathf.Abs(v);
                if (vy < 40f) { v = -v; continue; }
                air = true; y = 0f; peak = 0f; spin = 0f;
                OnLaunch();
            }
        }
    }

    int StarsFor()
    {
        if (!won) return 0;
        if (score >= pipe.goal * 1.12f) return 3;
        if (score >= pipe.goal * 1.05f) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    Camera cam;
    Transform root, rider, ring;
    Renderer ringR;
    Material riderMat, groomedMat, mountMat, blueMat, lipMat;
    Bursts bursts, spray;
    Synth synth;
    bool showStages;
    const float PipeLen = 6000f; // px down the pipe

    // pipe px across, height px, distance down the pipe px -> world
    static Vector3 P(float xx, float hh, float dd) => new Vector3(xx / PX, hh / PX, dd / PX);

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        cam = new GameObject("Camera").AddComponent<Camera>();
        cam.fieldOfView = 50f; cam.nearClipPlane = 0.3f; cam.farClipPlane = 250f;
        cam.clearFlags = CameraClearFlags.SolidColor;
        cam.backgroundColor = new Color(0.35f, 0.65f, 0.95f);
        OiyoField.Lights(new Color(0.6f, 0.65f, 0.74f), 0.9f, 45f, 20f);
        bursts = new Bursts(transform, 0.6f);
        spray = new Bursts(transform, 0.4f);
        synth = new Synth(gameObject);
        riderMat = OiyoField.Sprite("SH/rider");
        groomedMat = OiyoArcade.Lit(Color.white, 0.3f, OiyoArcade.Art("SH/groomed", true));
        mountMat = OiyoField.Sprite("SH/mountains");
        blueMat = OiyoArcade.Transparent(OiyoArcade.Solid(Color.white), new Color(0.11f, 0.49f, 0.84f, 0.3f));
        lipMat = OiyoArcade.Lit(new Color(0.11f, 0.49f, 0.84f), 0.3f);
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int idx, bool ready = true)
    {
        stageIdx = Mathf.Clamp(idx, 0, StageCount - 1);
        StopAllCoroutines();
        pipe = SnowHalfpipeStages.All[stageIdx];
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Pipe").transform;
        NewRider();
        starsWon = 0;
        showStages = false;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Animate(0f);
    }

    void BuildScene()
    {
        // the pipe: the cross-section swept down a long gentle slope, with flat decks beside the lips
        var verts = new List<Vector3>(); var uvs = new List<Vector2>(); var tris = new List<int>();
        int cols = 0;
        var xs = new List<float>();
        xs.Add(-pipe.half - 260f);
        for (float xx = -pipe.half; xx <= pipe.half + 0.01f; xx += 7f) xs.Add(xx);
        xs.Add(pipe.half + 260f);
        cols = xs.Count;
        int rows = 0;
        for (float d = -300f; d <= PipeLen + 600f; d += 150f, rows++)
            for (int c = 0; c < cols; c++)
            {
                float xx = xs[c];
                float hh = Mathf.Abs(xx) > pipe.half ? pipe.depth : WallY(xx);
                verts.Add(P(xx, hh - d * 0.12f, d));
                uvs.Add(new Vector2(xx / 120f, d / 120f));
            }
        for (int r = 0; r + 1 < rows; r++)
            for (int c = 0; c + 1 < cols; c++)
            {
                int i = r * cols + c;
                tris.Add(i); tris.Add(i + cols); tris.Add(i + 1);
                tris.Add(i + 1); tris.Add(i + cols); tris.Add(i + cols + 1);
            }
        var mesh = new Mesh { indexFormat = UnityEngine.Rendering.IndexFormat.UInt32 };
        mesh.SetVertices(verts); mesh.SetUVs(0, uvs); mesh.SetTriangles(tris, 0); mesh.RecalculateNormals(); mesh.RecalculateBounds();
        var go = new GameObject("PipeMesh"); go.transform.SetParent(root, false);
        go.AddComponent<MeshFilter>().sharedMesh = mesh;
        go.AddComponent<MeshRenderer>().sharedMaterial = groomedMat;
        // blue lip lines and the pump zone stripe down the bottom
        for (int s = -1; s <= 1; s += 2)
        {
            var lip = OiyoArcade.Prim(PrimitiveType.Cube, "Lip", lipMat, root);
            lip.transform.position = P(s * pipe.half, pipe.depth + 1f, PipeLen * 0.5f) + new Vector3(0f, -PipeLen * 0.5f * 0.12f / PX, 0f);
            lip.transform.rotation = Quaternion.Euler(Mathf.Atan(0.12f) * Mathf.Rad2Deg, 0f, 0f);
            lip.transform.localScale = new Vector3(0.12f, 0.08f, (PipeLen + 900f) / PX);
        }
        var stripe = OiyoArcade.Prim(PrimitiveType.Cube, "Pump", blueMat, root);
        stripe.transform.position = P(0f, 0.5f, PipeLen * 0.5f) + new Vector3(0f, -PipeLen * 0.5f * 0.12f / PX, 0f);
        stripe.transform.rotation = Quaternion.Euler(Mathf.Atan(0.12f) * Mathf.Rad2Deg, 0f, 0f);
        stripe.transform.localScale = new Vector3(pipe.half * Bottom * 2f / PX, 0.02f, (PipeLen + 900f) / PX);
        for (int k = -1; k <= 1; k++)
        {
            var m = OiyoField.Quad("Mountains", mountMat, root, 1f, 1f);
            m.localScale = new Vector3(90f, 24f, 1f);
            m.position = new Vector3(k * 88f, -6f, 150f);
        }
        rider = OiyoField.Quad("Rider", riderMat, root, 1f, 1f);
        rider.localScale = new Vector3(1.5f, 1.5f, 1f);
        ring = OiyoArcade.GlowQuad("Ring", new Color(0.3f, 0.9f, 0.4f, 0.4f), 2.6f, root).transform;
        ringR = ring.GetComponent<Renderer>();
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("snow-halfpipe", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        if (state == GameState.Playing)
        {
            Step(dt);
            if (over) End();
        }
        msgT = Mathf.Max(0f, msgT - dt);
        Animate(dt);
    }

    string msg = ""; float msgT; Color msgC = Color.white;
    void Toast(string m, Color c) { msg = m; msgT = 1.1f; msgC = c; }

    void OnLaunch()
    {
        spray.Emit(RiderPos(), Color.white, 10, 2f, 0.2f, 0.4f);
        synth.Tone(520f, 0.1f, Wave.Triangle, 0.1f, 780f, 10f);
    }
    void OnLand(bool clean, int pts, float s)
    {
        if (clean)
        {
            Toast($"{Mathf.RoundToInt(s / 180f) * 180}°  +{pts}", new Color(0.55f, 1f, 0.6f));
            synth.Tone(s >= 340f ? 1047f : 784f, 0.16f, Wave.Triangle, 0.2f, 1319f, 7f);
        }
        else
        {
            Toast(U("Wipeout"), new Color(1f, 0.5f, 0.45f));
            bursts.Emit(RiderPos(), Color.white, 30, 3.5f, 0.25f, 0.6f);
            synth.Tone(180f, 0.35f, Wave.Noise, 0.18f, 90f, 6f);
        }
    }

    bool keyHeld;
    void ReadInput()
    {
        bool confirm = Input.GetKeyDown(KeyCode.Return);
        switch (state)
        {
            case GameState.Ready:
            case GameState.Playing:
                {
                    if (state == GameState.Playing && (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P))) { state = GameState.Paused; spinning = false; return; }
                    bool pressed = OiyoArcade.Began().Count > 0;
                    bool released = OiyoArcade.Ended().Count > 0;
                    if (Input.GetKeyDown(KeyCode.Space)) { pressed = true; keyHeld = true; }
                    if (Input.GetKeyUp(KeyCode.Space) && keyHeld) { released = true; keyHeld = false; }
                    if (pressed)
                    {
                        if (state == GameState.Ready) { state = GameState.Playing; return; }
                        string r = Press();
                        if (r == "pump") { Toast(U("Pump!"), new Color(0.55f, 0.8f, 1f)); synth.Tone(400f, 0.06f, Wave.Square, 0.08f, 600f, 16f); spray.Emit(RiderPos(), Color.white, 6, 1.6f, 0.15f, 0.3f); }
                        else if (r == "bobble") Toast(U("Bobble"), new Color(0.8f, 0.82f, 0.85f));
                    }
                    if (released) spinning = false;
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
        spinning = false;
        if (won)
        {
            starsWon = StarsFor();
            state = GameState.Victory;
            OiyoArcade.Record(Slug, stageIdx, starsWon, score, StageCount);
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

    float DownWrap => down % PipeLen;
    Vector3 RiderPos()
    {
        float d = DownWrap;
        float hh = air ? pipe.depth + y : WallY(x);
        float xx = air ? side * (pipe.half + 6f) : x;
        return P(xx, hh - d * 0.12f + 16f, d);
    }

    void Animate(float dt)
    {
        if (root == null) return;
        var pos = RiderPos();
        rider.position = pos;
        float tilt = air ? spin * -side : Mathf.Atan(Slope(x)) * Mathf.Rad2Deg;
        rider.rotation = cam.transform.rotation * Quaternion.Euler(0f, 0f, tilt);
        ring.gameObject.SetActive(air && state == GameState.Playing);
        if (air)
        {
            ring.position = pos + cam.transform.forward * 0.05f;
            ring.rotation = cam.transform.rotation;
            bool ok = LandedClean(spin);
            ringR.material.color = ok ? new Color(0.3f, 0.9f, 0.4f, 0.45f) : new Color(1f, 0.35f, 0.3f, 0.45f);
        }
        // camera: behind and above, looking down the pipe at the rider
        bool portrait = cam.aspect < 1f;
        float d = DownWrap;
        // far enough back that both lips (and a rider above them) fit across the screen
        float halfH = Mathf.Atan(Mathf.Tan(cam.fieldOfView * 0.5f * Mathf.Deg2Rad) * cam.aspect);
        float back = Mathf.Max(300f, (pipe.half + 70f) / Mathf.Tan(halfH) * 0.95f);
        var focus = P(0f, pipe.depth + 70f - d * 0.12f, d + 60f);
        cam.transform.position = P(0f, pipe.depth + back * 0.38f - (d - back) * 0.12f, d - back * 1.1f);
        cam.transform.LookAt(focus);
    }

    // ?oiyotest=1 prints the run state to the browser console for the automated play check.
    bool testLog; float testT;
    void TestTick(float dt)
    {
        if (!testLog || (testT -= dt) > 0f) return;
        testT = 0.02f;
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"x\":{x:F0},\"half\":{pipe.half:F0},\"air\":{(air ? 1 : 0)},\"vy\":{vy:F0},\"y\":{y:F0},\"spin\":{spin:F0},\"spinning\":{(spinning ? 1 : 0)},\"pumped\":{(pumped ? 1 : 0)},\"hit\":{hit},\"score\":{score},\"goal\":{pipe.goal:F0},\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.94f, 0.55f, 0f, 0.97f);
    static readonly Color Dark = new Color(0.05f, 0.15f, 0.28f, 0.86f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("{0} airs", SnowHalfpipeStages.All[i].hits);

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(1f, 0.85f, 0.5f), U("Snow Halfpipe"),
                U("Tap in the bottom to pump, hold in the air to spin, let go to land straight."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        var bar = new Rect(8f, 8f, w - 16f, 64f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 12f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>   " + F("{0} airs left", pipe.hits - hit), 15, new Color(1f, 0.92f, 0.75f));
        OiyoArcade.Text(new Rect(20f, 36f, w - 90f, 24f), F("Score {0}/{1}", score, Mathf.RoundToInt(pipe.goal)), 16, Color.white);
        if (OiyoArcade.Button(new Rect(w - 60f, 14f, 44f, 44f), "<b>II</b>", OiyoScreens.Slate, 18))
        {
            if (state == GameState.Playing) { state = GameState.Paused; spinning = false; }
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (msgT > 0f) OiyoArcade.Shadowed(new Rect(8f, 80f, w - 16f, 36f), msg, 22, msgC, TextAnchor.MiddleCenter);
        if (state == GameState.Playing && air) OiyoArcade.Shadowed(new Rect(8f, 120f, w - 16f, 30f), $"{Mathf.RoundToInt(spin)}°", 22, LandedClean(spin) ? new Color(0.55f, 1f, 0.6f) : new Color(1f, 0.55f, 0.5f), TextAnchor.MiddleCenter);
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap in the bottom, hold in the air"), U("Pump on every pass through the flat bottom. Land within 30° of a half turn, or wipe out."), 170f, 110f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            bool w0 = state == GameState.Victory;
            string detail = w0 ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : F("Score {0}/{1}", score, Mathf.RoundToInt(pipe.goal));
            string body = $"<b>{F("{0} pts", score)}</b>\n<size=14>{F("{0} wipeouts", crashes)}</size>";
            int r = OiyoScreens.Result(w, h, Dark, Accent, w0, ResultLive, w0 ? U("Past the mark!") : U("Not enough points"), detail, body,
                w0 && stageIdx < StageCount - 1 ? U("Next stage") : null, w0 && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
