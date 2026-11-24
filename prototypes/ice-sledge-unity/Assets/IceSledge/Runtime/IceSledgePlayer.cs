using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Ice Sledge Race 3D: the web Ice Sledge Race (src/components/games/IceSledge.tsx, src/lib/games/ice-sledge.ts)
// rebuilt in Unity with a chase camera down the frozen stream. The rules are the web's, in its own px:
// a push after a push on the other side adds 44 px/s (26 on the same side, 40 % when tapping faster than
// every 0.12 s), a left push turns the sledge right and a right push turns it left (0.085 rad, 1.25 x on
// the same side), speed bleeds by 10 + 0.9 v per second up to 260 px/s, slush, holes and straw bundles
// work as on the web, and the village kids reach the far bank at their finishing times. The 30 streams
// are the web's own (IceSledgeStages.cs). Keyboard: left/right arrows or A/D.
public class IceSledgePlayer : MonoBehaviour
{
    const string Slug = "ice-sledge";
    const int StageCount = 30;
    const float FW = 360f, PX = 30f, VMax = 260f, PushAlt = 44f, PushSame = 26f, Turn = 0.085f, SledR = 10f;
    const int Slush = 0, Hole = 1, Straw = 2;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of ice-sledge.ts) ----------------
    class Hazard { public int kind; public float x, d, r; public Transform t; }
    IceSledgeStages.Level level;
    int stageIdx;
    readonly List<Hazard> hazards = new List<Hazard>();
    float time, x, d, v, heading, lastPush, fallen, bump;
    int lastSide; // 0 none, -1 left, 1 right
    bool inSlush, finished, won;
    int falls, starsWon;

    float CenterX(float dd) => FW / 2f + level.amp * Mathf.Sin(dd / level.wave + level.phase) + level.amp * 0.35f * Mathf.Sin(dd / (level.wave * 0.43f) + level.phase * 2.1f);
    float LineX(float dd) => CenterX(dd) + level.half * level.weave * Mathf.Sin(dd / 270f + level.phase * 3f);

    void NewRun()
    {
        time = 0f; x = LineX(0f); d = 0f; v = 0f; heading = 0f; lastSide = 0; lastPush = -1f; fallen = 0f; bump = 0f;
        inSlush = false; finished = false; won = false; falls = 0;
    }

    void Push(int side)
    {
        if (finished || fallen > 0f) return;
        bool alt = lastSide != 0 && lastSide != side;
        float gap = time - lastPush;
        float imp = alt || lastSide == 0 ? PushAlt : PushSame;
        if (gap < 0.12f) imp *= 0.4f;
        v = Mathf.Min(VMax, v + imp);
        heading += (side < 0 ? 1f : -1f) * Turn * (alt ? 1f : 1.25f);
        heading = Mathf.Clamp(heading, -1.1f, 1.1f);
        lastSide = side;
        lastPush = time;
        OnPush(side);
    }

    void Step(float dt)
    {
        if (finished) return;
        time += dt;
        if (fallen > 0f)
        {
            fallen -= dt;
            if (fallen <= 0f)
            {
                fallen = 0f; d = Mathf.Max(0f, d - 80f); x = LineX(d); v = 0f; heading = 0f;
                synth.Tone(520f, 0.12f, Wave.Triangle, 0.12f, 700f, 8f);
            }
            return;
        }
        bump = Mathf.Max(0f, bump - dt);
        v = Mathf.Max(0f, v - (10f + 0.9f * v) * dt);
        heading *= Mathf.Exp(-0.5f * dt);
        x += Mathf.Sin(heading) * v * dt;
        d += Mathf.Cos(heading) * v * dt;
        float cx = CenterX(d);
        if (Mathf.Abs(x - cx) > level.half - SledR)
        {
            float side = Mathf.Sign(x - cx);
            x = cx + side * (level.half - SledR);
            if (bump <= 0f)
            {
                v *= 0.6f;
                heading = -side * Mathf.Min(0.25f, Mathf.Abs(heading) * 0.4f);
                bump = 0.3f;
                OnBump(false);
            }
        }
        bool slush = false;
        foreach (var h in hazards)
        {
            if (h.d > d + 60f) break;
            if (h.d < d - 60f) continue;
            float dist = Mathf.Sqrt((h.x - x) * (h.x - x) + (h.d - d) * (h.d - d));
            if (h.kind == Slush && dist < h.r) slush = true;
            else if (h.kind == Hole && dist < h.r)
            {
                fallen = 1.6f; falls++; v = 0f;
                OnFall();
                return;
            }
            else if (h.kind == Straw && dist < h.r + SledR && bump <= 0f)
            {
                v *= 0.35f;
                float s = Mathf.Sign(x - h.x); if (s == 0f) s = 1f;
                heading = s * 0.35f;
                bump = 0.35f;
                OnBump(true);
            }
        }
        if (slush) v *= Mathf.Exp(-2.2f * dt);
        if (slush && !inSlush) Toast(U("Slush!"), new Color(0.75f, 0.8f, 0.85f));
        inSlush = slush;
        if (d >= level.length)
        {
            finished = true;
            won = true;
            foreach (var t in level.rivals) if (time >= t) won = false;
        }
    }

    float RivalD(int k, float t)
    {
        float T = level.rivals[k];
        const float ramp = 1.2f;
        float vt = level.length / (T - ramp / 2f);
        float dd = t < ramp ? vt * t * t / (2f * ramp) : vt * (t - ramp / 2f);
        return Mathf.Min(level.length + 40f, dd);
    }

    int StarsFor()
    {
        if (!won) return 0;
        if (time <= level.par * 1.08f) return 3;
        if (time <= level.par * 1.18f) return 2;
        return 1;
    }

    int Place()
    {
        int p = 1;
        for (int k = 0; k < level.rivals.Length; k++) if (RivalD(k, time) > d) p++;
        return p;
    }

    // ---------------- Scene ----------------
    // Course px -> world: x across, d down the stream (+z), the ice at y = 0.
    static Vector3 P(float px, float dd, float h = 0f) => new Vector3((px - FW * 0.5f) / PX, h, dd / PX);

    Camera cam;
    Transform root, sledge, poleL, poleR;
    readonly List<Transform> rivals = new List<Transform>();
    Material sledgeMat, iceMat, bankMat, strawMat, checkerMat, holeMat, slushMat, poleMat, reedMat;
    Material[] rivalMats;
    Bursts spray;
    Synth synth;
    bool showStages;
    float poleLT, poleRT, camX;

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        cam = new GameObject("Camera").AddComponent<Camera>();
        cam.fieldOfView = 50f; cam.nearClipPlane = 0.3f; cam.farClipPlane = 140f;
        cam.clearFlags = CameraClearFlags.SolidColor;
        cam.backgroundColor = new Color(0.72f, 0.84f, 0.95f);
        OiyoField.Lights(new Color(0.64f, 0.68f, 0.76f), 0.9f, 50f, -30f);
        spray = new Bursts(transform, 0.7f);
        synth = new Synth(gameObject);
        sledgeMat = OiyoField.Sprite("IS/sledge");
        rivalMats = new[] { OiyoField.Sprite("IS/rival"), OiyoField.Sprite("IS/rival2"), OiyoField.Sprite("IS/rival3") };
        iceMat = OiyoArcade.Lit(Color.white, 0.85f, OiyoArcade.Art("IS/ice", true));
        bankMat = OiyoArcade.Lit(Color.white, 0.15f, OiyoArcade.Art("IS/bank", true));
        strawMat = OiyoArcade.Lit(Color.white, 0.1f, OiyoArcade.Art("IS/straw", true));
        checkerMat = OiyoArcade.Textured(OiyoArcade.Art("IS/checker", true));
        holeMat = OiyoField.Sprite("IS/hole");
        slushMat = OiyoArcade.Transparent(OiyoArcade.GlowTexture(), new Color(0.45f, 0.48f, 0.52f, 0.55f));
        poleMat = OiyoArcade.Lit(new Color(0.29f, 0.31f, 0.34f), 0.5f, null, 0.5f);
        reedMat = OiyoField.Sprite("IS/reed");
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int idx, bool ready = true)
    {
        stageIdx = Mathf.Clamp(idx, 0, StageCount - 1);
        StopAllCoroutines();
        level = IceSledgeStages.All[stageIdx];
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Stream").transform;
        hazards.Clear(); rivals.Clear();
        for (int i = 0; i + 3 < level.hazards.Length; i += 4)
            hazards.Add(new Hazard { kind = (int)level.hazards[i], x = level.hazards[i + 1], d = level.hazards[i + 2], r = level.hazards[i + 3] });
        NewRun();
        showStages = false;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        camX = 0f;
        Animate(0f);
    }

    // A strip mesh along the stream (the ice, or a snow bank rising from one of its edges).
    Mesh Strip(float from, float to, bool fromEdge, float lift)
    {
        var verts = new List<Vector3>(); var uvs = new List<Vector2>(); var tris = new List<int>();
        const float step = 15f;
        int rows = 0;
        for (float dd = -400f; dd <= level.length + 900f; dd += step, rows++)
        {
            float cx = CenterX(dd);
            // the ice: from..to around the centre; a bank: from the ice edge on the side of `from`, `to` px wide
            float a = fromEdge ? cx + (from < 0f ? -level.half : level.half) : cx + from;
            float b = fromEdge ? a + (from < 0f ? -to : to) : cx + to;
            verts.Add(P(a, dd, lift)); verts.Add(P(b, dd, fromEdge ? lift + 0.25f : lift));
            uvs.Add(new Vector2(a / 120f, dd / 120f)); uvs.Add(new Vector2(b / 120f, dd / 120f));
        }
        for (int r = 0; r + 1 < rows; r++)
        {
            int i = r * 2;
            bool flip = fromEdge && from < 0f;
            if (!flip) { tris.Add(i); tris.Add(i + 2); tris.Add(i + 1); tris.Add(i + 1); tris.Add(i + 2); tris.Add(i + 3); }
            else { tris.Add(i); tris.Add(i + 1); tris.Add(i + 2); tris.Add(i + 1); tris.Add(i + 3); tris.Add(i + 2); }
        }
        var m = new Mesh { indexFormat = UnityEngine.Rendering.IndexFormat.UInt32 };
        m.SetVertices(verts); m.SetUVs(0, uvs); m.SetTriangles(tris, 0);
        m.RecalculateNormals(); m.RecalculateBounds();
        return m;
    }

    void MeshObject(string name, Mesh m, Material mat)
    {
        var go = new GameObject(name);
        go.transform.SetParent(root, false);
        go.AddComponent<MeshFilter>().sharedMesh = m;
        go.AddComponent<MeshRenderer>().sharedMaterial = mat;
    }

    Transform Flat(string name, Material m, float wPx, float hPx, float px, float dd, float h)
    {
        var q = OiyoArcade.Prim(PrimitiveType.Quad, name, m, root).transform;
        q.rotation = Quaternion.Euler(90f, 0f, 0f);
        q.position = P(px, dd, h);
        q.localScale = new Vector3(wPx / PX, hPx / PX, 1f);
        var r = q.GetComponent<Renderer>();
        r.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
        return q;
    }

    void BuildScene()
    {
        MeshObject("Ice", Strip(-level.half, level.half, false, 0f), iceMat);
        MeshObject("BankL", Strip(-1f, 260f, true, 0f), bankMat);
        MeshObject("BankR", Strip(1f, 260f, true, 0f), bankMat);
        var rs = new System.Random(stageIdx * 37 + 5);
        for (float dd = -300f; dd < level.length + 900f; dd += 55f)
            for (int s = -1; s <= 1; s += 2)
            {
                var reed = OiyoField.Quad("Reed", reedMat, root, 26f, 40f);
                reed.position = P(CenterX(dd) + s * (level.half + 10f + (float)rs.NextDouble() * 30f), dd + (float)rs.NextDouble() * 30f, 0.85f);
                reed.name = "Reed";
            }
        foreach (var ld in new[] { 0f, level.length })
        {
            var line = Flat("Line", checkerMat, level.half * 2f, 12f, CenterX(ld), ld, 0.012f);
            line.position = P(CenterX(ld), ld, 0.012f);
        }
        for (int s = -1; s <= 1; s += 2)
        {
            var post = OiyoArcade.Prim(PrimitiveType.Cylinder, "Post", poleMat, root);
            post.transform.position = P(CenterX(level.length) + s * (level.half + 6f), level.length, 1.3f);
            post.transform.localScale = new Vector3(0.15f, 1.3f, 0.15f);
        }
        var banner = OiyoArcade.Prim(PrimitiveType.Quad, "Banner", checkerMat, root);
        banner.transform.position = P(CenterX(level.length), level.length, 2.5f);
        banner.transform.localScale = new Vector3(level.half * 2f / PX + 0.3f, 0.45f, 1f);
        foreach (var h in hazards)
        {
            if (h.kind == Hole) h.t = Flat("Hole", holeMat, (h.r + 6f) * 2f, (h.r + 6f) * 2f, h.x, h.d, 0.01f);
            else if (h.kind == Slush) h.t = Flat("Slush", slushMat, h.r * 2.3f, h.r * 1.9f, h.x, h.d, 0.008f);
            else
            {
                var b = OiyoArcade.Prim(PrimitiveType.Cylinder, "Straw", strawMat, root).transform;
                b.position = P(h.x, h.d, h.r / PX);
                b.rotation = Quaternion.Euler(0f, 0f, 90f);
                b.localScale = new Vector3(h.r * 2f / PX, h.r * 1.4f / PX, h.r * 2f / PX);
                var band = OiyoArcade.Prim(PrimitiveType.Cylinder, "Band", OiyoArcade.Lit(new Color(0.42f, 0.27f, 0.12f), 0.1f), b);
                band.transform.localScale = new Vector3(1.04f, 0.08f, 1.04f);
                h.t = b;
            }
        }
        for (int k = 0; k < level.rivals.Length; k++) rivals.Add(Flat("Rival", rivalMats[k % rivalMats.Length], 34f, 42f, LineX(0f), 0f, 0.05f));
        sledge = Flat("Sledge", sledgeMat, 36f, 44f, x, 0f, 0.06f);
        poleL = OiyoArcade.Prim(PrimitiveType.Cylinder, "PoleL", poleMat, root).transform;
        poleR = OiyoArcade.Prim(PrimitiveType.Cylinder, "PoleR", poleMat, root).transform;
        foreach (var p in new[] { poleL, poleR }) p.localScale = new Vector3(0.06f, 0.45f, 0.06f);
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("ice-sledge", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        if (state == GameState.Playing)
        {
            Step(dt);
            if (finished) End();
        }
        msgT = Mathf.Max(0f, msgT - dt);
        Animate(dt);
    }

    string msg = ""; float msgT; Color msgC = Color.white;
    void Toast(string s, Color c) { msg = s; msgT = 0.9f; msgC = c; }

    void OnPush(int side)
    {
        if (side < 0) poleLT = 0.18f; else poleRT = 0.18f;
        synth.Tone(side < 0 ? 300f : 340f, 0.06f, Wave.Noise, 0.07f, 0f, 22f);
        spray.Emit(P(x + side * 16f, d - 6f, 0.1f), Color.white, 4, 1.5f, 0.12f, 0.35f, new Vector3(0f, 1f, -1f));
    }
    void OnBump(bool straw)
    {
        Toast(U("Bonk!"), new Color(1f, 0.6f, 0.3f));
        synth.Tone(140f, 0.18f, Wave.Square, 0.12f, 90f, 10f);
        spray.Emit(P(x, d + 10f, 0.4f), straw ? new Color(0.9f, 0.75f, 0.4f) : Color.white, 14, 2.5f, 0.2f, 0.5f);
    }
    void OnFall()
    {
        Toast(U("Splash!"), new Color(0.55f, 0.8f, 1f));
        synth.Tone(220f, 0.45f, Wave.Noise, 0.2f, 80f, 5f);
        spray.Emit(P(x, d, 0.2f), new Color(0.6f, 0.82f, 1f), 30, 4f, 0.28f, 0.7f, new Vector3(0f, 3f, 0f));
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
                    // taps are applied in order, once per frame
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (state == GameState.Ready) state = GameState.Playing;
                        Push(b.pos.x < Screen.width * 0.5f ? -1 : 1);
                    }
                    if (Input.GetKeyDown(KeyCode.LeftArrow) || Input.GetKeyDown(KeyCode.A)) { if (state == GameState.Ready) state = GameState.Playing; Push(-1); }
                    if (Input.GetKeyDown(KeyCode.RightArrow) || Input.GetKeyDown(KeyCode.D)) { if (state == GameState.Ready) state = GameState.Playing; Push(1); }
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
        starsWon = StarsFor();
        spray.Emit(P(x, d + 40f, 1f), new Color(1f, 0.85f, 0.3f), 40, 6f, 0.3f, 0.8f);
        if (won)
        {
            state = GameState.Victory;
            OiyoArcade.Record(Slug, stageIdx, starsWon, starsWon, StageCount);
            StartCoroutine(Arp(new[] { 523f, 659f, 784f, 1047f, 1319f }, 0.09f));
        }
        else
        {
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
        poleLT = Mathf.Max(0f, poleLT - dt); poleRT = Mathf.Max(0f, poleRT - dt);
        float sink = fallen > 0f ? Mathf.Min(1f, (1.6f - fallen) * 3f) : 0f;
        sledge.position = P(x, d, 0.06f - sink * 0.35f);
        sledge.rotation = Quaternion.Euler(0f, heading * Mathf.Rad2Deg, 0f) * Quaternion.Euler(90f, 0f, 0f);
        float sp = Mathf.Clamp01(v / VMax);
        for (int s = -1; s <= 1; s += 2)
        {
            var pole = s < 0 ? poleL : poleR;
            float pt = s < 0 ? poleLT : poleRT;
            float k = pt > 0f ? pt / 0.18f : 0f;
            var basePos = P(x + s * 17f, d - 4f - k * 14f, 0.45f + (1f - k) * 0.15f);
            pole.position = basePos;
            pole.rotation = Quaternion.Euler(-35f - k * 30f, heading * Mathf.Rad2Deg, s * 8f);
            pole.gameObject.SetActive(fallen <= 0f);
        }
        for (int k = 0; k < rivals.Count; k++)
        {
            float rd = state == GameState.Playing || finished ? RivalD(k, time) : 0f;
            rivals[k].position = P(LineX(rd) + (k % 2 == 0 ? 1f : -1f) * (22f + k * 10f), rd, 0.05f);
        }
        // chase camera: high behind the sledge, wide enough for the ice at the sledge
        float halfV = cam.fieldOfView * 0.5f * Mathf.Deg2Rad;
        float halfH = Mathf.Atan(Mathf.Tan(halfV) * cam.aspect);
        float needHalf = (level.half + 30f) / PX;
        float dist = Mathf.Clamp(needHalf / Mathf.Tan(halfH), cam.aspect < 1f ? 8f : 11f, 30f);
        float cxNow = CenterX(d + 100f);
        camX = Mathf.Lerp(camX, (cxNow - FW * 0.5f) / PX + (x - cxNow) / PX * 0.3f, dt > 0f ? Mathf.Min(1f, dt * 3f) : 1f);
        var look = new Vector3(camX, 0f, (d + 130f) / PX);
        var dir = Quaternion.Euler(cam.aspect < 1f ? 46f : 38f, 0f, 0f) * Vector3.forward;
        cam.transform.position = look - dir * dist;
        cam.transform.rotation = Quaternion.LookRotation(dir, Vector3.up);
        var face = Quaternion.Euler(cam.transform.eulerAngles.x * 0.5f, 0f, 0f);
        foreach (Transform c in root) if (c.name == "Reed") c.rotation = face;
    }

    // ?oiyotest=1 prints the run state to the browser console for the automated play check.
    bool testLog; float testT;
    void TestTick(float dt)
    {
        if (!testLog || (testT -= dt) > 0f) return;
        testT = 0.05f;
        float look = 90f;
        float want = Mathf.Clamp(Mathf.Atan2(LineX(d + look) - x, look), -0.6f, 0.6f);
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"t\":{time:F2},\"d\":{d:F0},\"len\":{level.length:F0},\"v\":{v:F0},\"err\":{want - heading:F3},\"last\":{lastSide},\"falls\":{falls},\"place\":{Place()},\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.11f, 0.49f, 0.84f, 0.97f);
    static readonly Color Dark = new Color(0.05f, 0.15f, 0.28f, 0.86f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("{0} kids", IceSledgeStages.All[i].rivals.Length);

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(0.8f, 0.92f, 1f), U("Ice Sledge Race"),
                U("Tap left and right in turn to pole your sledge across the frozen stream. Beat the village kids to the far bank."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        var bar = new Rect(8f, 8f, w - 16f, 78f);
        OiyoArcade.Panel(bar, Dark);
        int place = Place();
        OiyoArcade.Text(new Rect(20f, 12f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>   " + F("Par {0} s", level.par.ToString("F1")), 15, new Color(0.85f, 0.95f, 1f));
        OiyoArcade.Text(new Rect(20f, 34f, w - 90f, 24f), $"{U("Time")} <b>{time:F1}</b>   " + F("Place {0}/{1}", place, level.rivals.Length + 1), 16, Color.white);
        var pb = new Rect(20f, 64f, w - 96f, 8f);
        OiyoArcade.Bar(pb, d / level.length, new Color(0f, 0f, 0f, 0.4f), new Color(0.88f, 0.2f, 0.2f));
        for (int k = 0; k < level.rivals.Length; k++)
        {
            float rd = state == GameState.Playing || finished ? RivalD(k, time) : 0f;
            OiyoArcade.Fill(new Rect(pb.x + pb.width * Mathf.Clamp01(rd / level.length) - 2f, pb.y - 3f, 4f, 14f), new Color(0.3f, 0.85f, 0.4f));
        }
        if (OiyoArcade.Button(new Rect(w - 64f, 14f, 46f, 46f), "<b>II</b>", OiyoScreens.Slate, 18))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (msgT > 0f) OiyoArcade.Shadowed(new Rect(8f, 92f, w - 16f, 36f), msg, 22, msgC, TextAnchor.MiddleCenter);
        if (state == GameState.Ready || state == GameState.Playing)
        {
            // the two push zones
            float zh = 64f;
            OiyoArcade.Panel(new Rect(8f, h - zh - 10f, w * 0.5f - 14f, zh), new Color(1f, 1f, 1f, poleLT > 0f ? 0.4f : 0.16f));
            OiyoArcade.Panel(new Rect(w * 0.5f + 6f, h - zh - 10f, w * 0.5f - 14f, zh), new Color(1f, 1f, 1f, poleRT > 0f ? 0.4f : 0.16f));
            OiyoArcade.Shadowed(new Rect(8f, h - zh - 10f, w * 0.5f - 14f, zh), "◀ L", 24, Color.white, TextAnchor.MiddleCenter);
            OiyoArcade.Shadowed(new Rect(w * 0.5f + 6f, h - zh - 10f, w * 0.5f - 14f, zh), "R ▶", 24, Color.white, TextAnchor.MiddleCenter);
        }
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap left, right, left, right!"), U("A left push turns you right, a right push turns you left. Slush slows you, holes drop you in, straw stops you."), 200f, 110f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            bool w0 = state == GameState.Victory;
            string detail = w0 ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : F("Par {0} s", level.par.ToString("F1"));
            string body = $"<b>{F("{0} s", time.ToString("F1"))}</b>\n<size=14>{F("Fell in {0} times", falls)}</size>";
            int r = OiyoScreens.Result(w, h, Dark, Accent, w0, ResultLive, w0 ? U("First across the stream!") : U("A kid got there first"), detail, body,
                w0 && stageIdx < StageCount - 1 ? U("Next stage") : null, w0 && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
