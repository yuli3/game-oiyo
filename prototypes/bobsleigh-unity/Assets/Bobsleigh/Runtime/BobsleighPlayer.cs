using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Bobsleigh 3D: the web Bobsleigh (src/components/games/Bobsleigh.tsx, src/lib/games/bobsleigh.ts) rebuilt
// in Unity. The rules are the web's: the sled runs down the chute by itself (gravity 1.25 m/s², drag
// 0.0011 v²). Its height on the wall h (0..1) climbs 0.9/s while held and falls 1.6/s otherwise. In a bend
// the ideal line is min(0.92, v² × tightness); more than 0.12 below it the runners skid (speed lost in
// proportion), above it by more than the stage's margin (and above 0.55) the sled flips. Beat the rival's time. The 30
// tracks are the web's own (BobsleighStages.cs). Keyboard: Space.
public class BobsleighPlayer : MonoBehaviour
{
    const string Slug = "bobsleigh";
    const int StageCount = 30;
    const float Gravity = 1.25f, Drag = 0.0011f, Climb = 0.9f, Drop = 1.6f, SkidTol = 0.12f, Skid = 0.9f, MaxLine = 0.92f, FlipFloor = 0.55f;
    const float R = 3f; // chute radius (world units)
    static readonly float MaxAng = 100f * Mathf.Deg2Rad;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of bobsleigh.ts) ----------------
    BobsleighStages.Level track;
    int stageIdx;
    float t, s, v, h, skidT, finish;
    bool holding, over, won, flipped;
    int starsWon;

    void NewSled() { t = 0f; s = 0f; v = 8f; h = 0f; holding = false; skidT = 0f; over = false; won = false; flipped = false; finish = 0f; }

    float Curve(float at)
    {
        float c = 0f;
        for (int i = 0; i + 2 < track.bends.Length; i += 3)
        {
            float u = (at - track.bends[i]) / track.bends[i + 1];
            if (u > -1f && u < 1f) { float k = Mathf.Cos(u * Mathf.PI * 0.5f); c += track.bends[i + 2] / 900f * k * k; }
        }
        return c;
    }
    float LineAt(float at, float vv) => Mathf.Min(MaxLine, vv * vv * Curve(at));
    float FlipHeight(float line) => Mathf.Max(FlipFloor, line + track.flip);

    // "flip", "finish" or null
    string Step(float dt)
    {
        if (over) return null;
        int n = Mathf.Max(1, Mathf.CeilToInt(dt / (1f / 240f)));
        float hh = dt / n;
        for (int k = 0; k < n; k++)
        {
            t += hh;
            h = Mathf.Clamp01(h + (holding ? Climb : -Drop) * hh);
            float line = LineAt(s, v);
            float e = h - line;
            if (h > FlipHeight(line)) { over = true; flipped = true; won = false; return "flip"; }
            float a = Gravity - Drag * v * v;
            if (e < -SkidTol) { a -= Skid * (-e - SkidTol) * v; skidT += hh; }
            v = Mathf.Max(1f, v + a * hh);
            float ps = s;
            s += v * hh;
            if (s >= track.length)
            {
                finish = t - hh + hh * (track.length - ps) / (s - ps);
                over = true;
                won = finish <= track.goal;
                return "finish";
            }
        }
        return null;
    }

    int StarsFor()
    {
        if (!won) return 0;
        if (finish <= track.goal * 0.98f) return 3;
        if (finish <= track.goal * 0.99f) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    Camera cam;
    Transform root, sled;
    readonly List<Transform> band = new List<Transform>();
    Transform flipBar;
    Material sledMat, iceMat, bandMat, flipMat, nightMat;
    Bursts bursts;
    Synth synth;
    bool showStages;

    static Vector3 Wall(float hh, float z, float r = R)
    {
        float a = hh * MaxAng;
        return new Vector3(r * Mathf.Sin(a), R - r * Mathf.Cos(a), z);
    }

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        cam = new GameObject("Camera").AddComponent<Camera>();
        cam.fieldOfView = 60f; cam.nearClipPlane = 0.1f; cam.farClipPlane = 300f;
        cam.clearFlags = CameraClearFlags.SolidColor;
        cam.backgroundColor = new Color(0.11f, 0.15f, 0.25f);
        OiyoField.Lights(new Color(0.6f, 0.64f, 0.75f), 0.9f, 50f, 20f);
        bursts = new Bursts(transform, 0.5f);
        synth = new Synth(gameObject);
        sledMat = OiyoField.Sprite("BO/sled");
        iceMat = OiyoArcade.Lit(Color.white, 0.8f, OiyoArcade.Art("BO/ice", true));
        bandMat = OiyoArcade.Transparent(OiyoArcade.Solid(Color.white), new Color(0.25f, 0.75f, 0.34f, 0.6f));
        flipMat = OiyoArcade.Glow(new Color(0.88f, 0.19f, 0.19f));
        nightMat = OiyoArcade.Lit(new Color(0.2f, 0.25f, 0.4f), 0.1f);
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int idx, bool ready = true)
    {
        stageIdx = Mathf.Clamp(idx, 0, StageCount - 1);
        StopAllCoroutines();
        track = BobsleighStages.All[stageIdx];
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Track").transform;
        NewSled();
        starsWon = 0;
        showStages = false;
        keyHeld = false;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Animate(0f);
    }

    void BuildScene()
    {
        // the chute: a U of ice swept down the whole track
        var verts = new List<Vector3>(); var uvs = new List<Vector2>(); var tris = new List<int>();
        int cols = 33;
        int rows = 0;
        for (float z = -20f; z <= track.length + 60f; z += 4f, rows++)
            for (int c = 0; c < cols; c++)
            {
                float hh = Mathf.Lerp(-1f, 1f, c / (cols - 1f));
                var p = Wall(Mathf.Abs(hh), z);
                if (hh < 0f) p.x = -p.x;
                verts.Add(p);
                uvs.Add(new Vector2(c / 4f, z / 6f));
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
        var go = new GameObject("Chute"); go.transform.SetParent(root, false);
        go.AddComponent<MeshFilter>().sharedMesh = mesh;
        var mr = go.AddComponent<MeshRenderer>(); mr.sharedMaterial = iceMat;
        // dark hills either side and a finish gate
        for (int sd = -1; sd <= 1; sd += 2)
        {
            var hill = OiyoArcade.Prim(PrimitiveType.Cube, "Bank", nightMat, root);
            hill.transform.position = new Vector3(sd * (R + 6f), R - 0.5f, track.length * 0.5f);
            hill.transform.localScale = new Vector3(10f, 1f, track.length + 200f);
        }
        var gate = OiyoArcade.Prim(PrimitiveType.Cube, "Finish", flipMat, root);
        gate.transform.position = new Vector3(0f, R * 2f + 0.5f, track.length);
        gate.transform.localScale = new Vector3(R * 2.6f, 0.3f, 0.3f);
        band.Clear();
        for (int i = 0; i < 8; i++)
        {
            var b = OiyoArcade.Prim(PrimitiveType.Cube, "Line", bandMat, root).transform;
            band.Add(b);
        }
        flipBar = OiyoArcade.Prim(PrimitiveType.Cube, "Flip", flipMat, root).transform;
        sled = OiyoField.Quad("Sled", sledMat, root, 1f, 1f);
        sled.localScale = new Vector3(1.6f, 1.4f, 1f);
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("bobsleigh", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        if (state == GameState.Playing)
        {
            float before = skidT;
            string ev = Step(dt);
            if (skidT > before && (skidMsgT -= dt) <= 0f)
            {
                skidMsgT = 0.5f;
                Toast(U("Skid!"), new Color(1f, 0.6f, 0.3f));
                bursts.Emit(sled.position, Color.white, 5, 1.4f, 0.1f, 0.3f);
                synth.Tone(900f, 0.06f, Wave.Noise, 0.06f, 500f, 20f);
            }
            if (ev == "flip") bursts.Emit(sled.position, new Color(0.9f, 0.2f, 0.2f), 30, 4f, 0.2f, 0.7f);
            if (ev != null) End();
        }
        msgT = Mathf.Max(0f, msgT - dt);
        Animate(dt);
    }
    float skidMsgT;

    string msg = ""; float msgT; Color msgC = Color.white;
    void Toast(string m, Color c) { msg = m; msgT = 0.6f; msgC = c; }

    bool keyHeld;
    void ReadInput()
    {
        bool confirm = Input.GetKeyDown(KeyCode.Return);
        switch (state)
        {
            case GameState.Ready:
            case GameState.Playing:
                {
                    if (state == GameState.Playing && (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P))) { state = GameState.Paused; holding = false; return; }
                    // the button is read once per frame: held climbs the wall
                    bool pressed = OiyoArcade.Began().Count > 0;
                    bool released = OiyoArcade.Ended().Count > 0 && OiyoArcade.Held().Count == 0;
                    if (Input.GetKeyDown(KeyCode.Space)) { pressed = true; keyHeld = true; }
                    if (Input.GetKeyUp(KeyCode.Space) && keyHeld) { released = true; keyHeld = false; }
                    if (pressed)
                    {
                        if (state == GameState.Ready) state = GameState.Playing;
                        holding = true;
                    }
                    if (released) holding = false;
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
        holding = false;
        if (won)
        {
            starsWon = StarsFor();
            state = GameState.Victory;
            OiyoArcade.Record(Slug, stageIdx, starsWon, Mathf.RoundToInt(finish * 100f), StageCount);
            StartCoroutine(Arp(new[] { 523f, 659f, 784f, 1047f, 1319f }, 0.09f));
        }
        else
        {
            starsWon = 0;
            state = GameState.GameOver;
            if (flipped) synth.Tone(160f, 0.4f, Wave.Noise, 0.2f, 70f, 5f);
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
        var p = Wall(h, s, R - 0.45f);
        sled.position = p;
        // the green band (the ideal line, a skid's worth below to half the flip margin above) and the red flip line
        float line = LineAt(s, v);
        float lo = Mathf.Max(0f, line - SkidTol), hi = Mathf.Min(1f, line + track.flip * 0.5f);
        for (int i = 0; i < band.Count; i++)
        {
            float a = Mathf.Lerp(lo, hi, (i + 0.5f) / band.Count);
            var b = band[i];
            var q = Wall(a, s + 4f, R - 0.05f);
            b.position = q;
            b.rotation = Quaternion.Euler(0f, 0f, a * MaxAng * Mathf.Rad2Deg);
            b.localScale = new Vector3(Mathf.Max(0.05f, (hi - lo) * MaxAng * R / band.Count + 0.02f), 0.04f, 14f);
        }
        float fl = Mathf.Min(1f, FlipHeight(line));
        flipBar.position = Wall(fl, s + 4f, R - 0.05f);
        flipBar.rotation = Quaternion.Euler(0f, 0f, fl * MaxAng * Mathf.Rad2Deg);
        flipBar.localScale = new Vector3(0.12f, 0.06f, 14f);
        // camera: behind the sled down the chute, rolled a little with it
        bool portrait = cam.aspect < 1f;
        var camPos = new Vector3(p.x * 0.35f, R * (portrait ? 1.35f : 1.1f), s - (portrait ? 7.5f : 6f));
        cam.transform.position = camPos;
        cam.transform.rotation = Quaternion.LookRotation(new Vector3(p.x * 0.5f, R * 0.55f, s + 10f) - camPos, Vector3.up) * Quaternion.Euler(0f, 0f, h * MaxAng * Mathf.Rad2Deg * 0.25f);
        sled.rotation = cam.transform.rotation * Quaternion.Euler(0f, 0f, h * MaxAng * Mathf.Rad2Deg * 0.75f);
    }

    // ?oiyotest=1 prints the run state to the browser console for the automated play check.
    bool testLog; float testT;
    void TestTick(float dt)
    {
        if (!testLog || (testT -= dt) > 0f) return;
        testT = 0.02f;
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"t\":{t:F3},\"pos\":{s:F2},\"v\":{v:F2},\"h\":{h:F3},\"line\":{LineAt(s, v):F3},\"holding\":{(holding ? 1 : 0)},\"flip\":{track.flip:F3},\"skid\":{skidT:F2},\"goal\":{track.goal:F2},\"finish\":{finish:F2},\"flipped\":{(flipped ? 1 : 0)},\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.88f, 0.19f, 0.19f, 0.97f);
    static readonly Color Dark = new Color(0.06f, 0.09f, 0.2f, 0.86f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + $"{BobsleighStages.All[i].length:F0} m";

    void OnGUI()
    {
        OiyoArcade.Begin();
        float w = OiyoArcade.W, hgt = OiyoArcade.H;
        if (state == GameState.Menu)
        {
            if (showStages)
            {
                int pick = OiyoScreens.Stages(w, hgt, Dark, Accent, Slug, StageCount, U("Choose a stage"), U("Back"), U("Stage"));
                if (pick == -2) showStages = false; else if (pick >= 0) LoadStage(pick);
                return;
            }
            int m = OiyoScreens.Menu(w, hgt, Dark, Accent, new Color(0.75f, 0.88f, 1f), U("Bobsleigh"),
                U("Hold to ride up the wall in the bends and stay in the green band. Too low skids, too high flips."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        var bar = new Rect(8f, 8f, w - 16f, 64f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 12f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>   " + F("Rival {0}s", track.goal.ToString("F2")), 15, new Color(1f, 0.92f, 0.75f));
        OiyoArcade.Text(new Rect(20f, 36f, w - 90f, 24f), $"<b>{t:F1}s</b>   {v * 3.6f:F0} km/h", 16, Color.white);
        if (OiyoArcade.Button(new Rect(w - 60f, 14f, 44f, 44f), "<b>II</b>", OiyoScreens.Slate, 18))
        {
            if (state == GameState.Playing) { state = GameState.Paused; holding = false; }
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (state == GameState.Playing || state == GameState.Ready)
        {
            // the line over the next 160 m, and where the sled is now
            float px = 20f, pw = w - 40f, py = 160f, ph = 70f;
            OiyoArcade.Fill(new Rect(px, py - ph, pw, ph), new Color(0f, 0f, 0f, 0.35f));
            for (int k = 0; k < 40; k++)
            {
                float ln = LineAt(s + k / 40f * 160f, v);
                OiyoArcade.Fill(new Rect(px + k / 40f * pw, py - ln * ph - 2f, pw / 40f + 1f, 4f), new Color(0.41f, 0.86f, 0.49f));
            }
            OiyoArcade.Fill(new Rect(px - 4f, py - h * ph - 4f, 8f, 8f), new Color(0.98f, 0.69f, 0.02f));
            OiyoArcade.Shadowed(new Rect(px, py - ph - 20f, pw, 18f), U("Bends ahead"), 12, new Color(0.8f, 0.82f, 0.85f));
            OiyoArcade.Bar(new Rect(20f, hgt - 24f, w - 40f, 8f), Mathf.Clamp01(s / track.length), new Color(1f, 1f, 1f, 0.2f), new Color(0.3f, 0.67f, 0.97f));
        }
        if (msgT > 0f) OiyoArcade.Shadowed(new Rect(8f, 170f, w - 16f, 36f), msg, 22, msgC, TextAnchor.MiddleCenter);
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, hgt, Dark, U("Hold to climb the wall"), U("Ride in the green band through each bend. Watch the graph for bends coming."), 200f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, hgt, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            bool w0 = state == GameState.Victory;
            string detail = w0 ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : F("Rival {0}s", track.goal.ToString("F2"));
            string body = flipped ? $"<b>{U("The sled flipped!")}</b>" : $"<b>{finish:F2}s</b>";
            int r = OiyoScreens.Result(w, hgt, Dark, Accent, w0, ResultLive, w0 ? U("You beat the rival!") : flipped ? U("The sled flipped!") : U("The rival was faster"), detail, body,
                w0 && stageIdx < StageCount - 1 ? U("Next stage") : null, w0 && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
