using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Parking Out 3D: the web Parking Out (src/components/games/ParkingOut.tsx, src/lib/games/parking-out.ts) rebuilt in
// Unity on the web's own 360 × 560 px field (OiyoField). The car park is a grid; each car drives only straight ahead,
// the way it faces. A tap sends it out of the car park if its road is clear, or bumps whatever is in the way and it
// stays put. Three bumps and the attendant sends you away. The 30 car parks are the web's own (ParkingOutStages.cs).
public class ParkingOutPlayer : MonoBehaviour
{
    const string Slug = "parking-out";
    const int StageCount = 30;
    const int MaxBumps = 3;
    static readonly int[] DX = { 0, 1, 0, -1 };
    static readonly int[] DY = { -1, 0, 1, 0 };
    static readonly string[] CarColours = { "#e03131", "#1971c2", "#2f9e44", "#f08c00", "#7048e8", "#0c8599", "#d6336c", "#495057" };

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of parking-out.ts) ----------------
    ParkingOutStages.Level st;
    int stageIdx, starsWon, bumps;
    bool[] outs;
    float t;
    bool over, won;

    int Cars => st.cars.Length / 5;
    int CX(int i) => st.cars[i * 5];
    int CY(int i) => st.cars[i * 5 + 1];
    int Dir(int i) => st.cars[i * 5 + 2];
    int Len(int i) => st.cars[i * 5 + 3];
    int Col(int i) => st.cars[i * 5 + 4];
    Vector2Int Sq(int i, int k) => new Vector2Int(CX(i) + DX[Dir(i)] * k, CY(i) + DY[Dir(i)] * k);

    bool Covers(int i, int x, int y)
    {
        for (int k = 0; k < Len(i); k++) { var s = Sq(i, k); if (s.x == x && s.y == y) return true; }
        return false;
    }

    /// <summary>The car in the way (−1 a pillar), or −2 if the road out is clear.</summary>
    int Blocker(int i)
    {
        var f = Sq(i, Len(i) - 1);
        int x = f.x, y = f.y;
        for (;;)
        {
            x += DX[Dir(i)]; y += DY[Dir(i)];
            if (x < 0 || y < 0 || x >= st.w || y >= st.h) return -2;
            foreach (int p in st.pillars) if (p == y * st.w + x) return -1;
            for (int j = 0; j < Cars; j++) if (j != i && !outs[j] && Covers(j, x, y)) return j;
        }
    }

    bool CanLeave(int i) => !outs[i] && Blocker(i) == -2;

    // 0 nothing, 1 out, 2 bump
    int Tap(int i)
    {
        if (over || i < 0 || i >= Cars || outs[i]) return 0;
        if (CanLeave(i))
        {
            outs[i] = true;
            bool all = true;
            foreach (bool o in outs) if (!o) all = false;
            if (all) { over = true; won = true; }
            return 1;
        }
        bumps++;
        if (bumps >= MaxBumps) over = true;
        return 2;
    }

    int StarsFor()
    {
        if (!won) return 0;
        if (bumps == 0 && t <= st.par) return 3;
        if (bumps <= 1) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    OiyoField field;
    Camera cam;
    Transform root, cursorMark;
    Transform[] carObj;
    float[] leaveD, jolt;
    Material[] carMat;
    Material lotMat, lineMat, pillarMat, stripeMat, glassMat, cursorMat, kerbMat;
    Bursts sparkle;
    Synth synth;
    bool showStages;
    int cursor = -1;
    string pop; float popT;

    float Cell => Mathf.Floor(330f / st.w);
    float OX => (360f - Cell * st.w) / 2f;
    float OY => 110f + (380f - Cell * st.h) / 2f;
    Vector2 SqCentre(float x, float y) => new Vector2(OX + (x + 0.5f) * Cell, OY + (y + 0.5f) * Cell);

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(360f, 560f, new Color(0.13f, 0.15f, 0.16f));
        cam = field.Cam;
        OiyoField.Lights(new Color(0.78f, 0.78f, 0.82f), 0.8f, 45f, -30f);
        sparkle = new Bursts(transform, 0.5f);
        synth = new Synth(gameObject);
        carMat = new Material[CarColours.Length];
        for (int i = 0; i < CarColours.Length; i++) { ColorUtility.TryParseHtmlString(CarColours[i], out var c); carMat[i] = OiyoArcade.Lit(c, 0.55f); }
        lotMat = OiyoArcade.Lit(new Color(0.29f, 0.31f, 0.34f), 0.15f, OiyoArcade.Art("PO/asphalt", true));
        lineMat = OiyoArcade.Lit(new Color(0.85f, 0.86f, 0.88f), 0.1f);
        kerbMat = OiyoArcade.Lit(new Color(0.55f, 0.57f, 0.6f), 0.1f);
        pillarMat = OiyoArcade.Lit(new Color(0.68f, 0.71f, 0.74f), 0.2f);
        stripeMat = OiyoArcade.Lit(new Color(0.96f, 0.62f, 0f), 0.2f);
        glassMat = OiyoArcade.Lit(new Color(0.82f, 0.92f, 1f), 0.8f);
        cursorMat = OiyoArcade.Transparent(OiyoArcade.Solid(Color.white), new Color(1f, 0.83f, 0.23f, 0.55f));
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int i, bool ready = true)
    {
        stageIdx = Mathf.Clamp(i, 0, StageCount - 1);
        StopAllCoroutines();
        st = ParkingOutStages.All[stageIdx];
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Lot").transform;
        outs = new bool[Cars];
        leaveD = new float[Cars];
        jolt = new float[Cars];
        t = 0f; bumps = 0; over = false; won = false;
        starsWon = 0;
        cursor = -1;
        pop = null;
        showStages = false;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Animate(0f);
    }

    Transform Box(Material m, float x, float y, float w, float h, float z, float depth, Transform parent = null)
    {
        var q = OiyoArcade.Prim(PrimitiveType.Cube, "Box", m, parent ?? root).transform;
        q.position = field.W(x, y, z);
        q.localScale = new Vector3(OiyoField.U(w), OiyoField.U(h), depth);
        return q;
    }

    void BuildScene()
    {
        float cs = Cell;
        Box(kerbMat, 180f, OY + cs * st.h / 2f, cs * st.w + 12f, cs * st.h + 12f, 0.25f, 0.2f);
        Box(lotMat, 180f, OY + cs * st.h / 2f, cs * st.w, cs * st.h, 0.1f, 0.2f);
        for (int x = 0; x <= st.w; x++) Box(lineMat, OX + x * cs, OY + cs * st.h / 2f, 1.5f, cs * st.h, -0.01f, 0.02f);
        for (int y = 0; y <= st.h; y++) Box(lineMat, 180f, OY + y * cs, cs * st.w, 1.5f, -0.01f, 0.02f);
        foreach (int p in st.pillars)
        {
            var c = SqCentre(p % st.w, p / st.w);
            Box(pillarMat, c.x, c.y, cs * 0.6f, cs * 0.6f, -0.35f, 0.7f);
            Box(stripeMat, c.x, c.y, cs * 0.62f, cs * 0.16f, -0.36f, 0.72f);
        }
        carObj = new Transform[Cars];
        for (int i = 0; i < Cars; i++)
        {
            var car = new GameObject("Car").transform;
            car.SetParent(root, false);
            bool across = Dir(i) % 2 == 1;
            float lenPx = Len(i) * cs - 8f, widPx = cs - 10f;
            var body = OiyoArcade.Prim(PrimitiveType.Cube, "Body", carMat[Col(i) % carMat.Length], car).transform;
            body.localScale = new Vector3(OiyoField.U(across ? lenPx : widPx), OiyoField.U(across ? widPx : lenPx), 0.45f);
            // the windscreen sits toward the front, so the way the car faces is plain to see
            float fwd = OiyoField.U(lenPx / 2f - cs * 0.42f);
            var glass = OiyoArcade.Prim(PrimitiveType.Cube, "Glass", glassMat, car).transform;
            glass.localScale = new Vector3(OiyoField.U(across ? cs * 0.22f : widPx * 0.75f), OiyoField.U(across ? widPx * 0.75f : cs * 0.22f), 0.1f);
            glass.localPosition = new Vector3(DX[Dir(i)] * fwd, -DY[Dir(i)] * fwd, -0.25f);
            var roof = OiyoArcade.Prim(PrimitiveType.Cube, "Roof", carMat[Col(i) % carMat.Length], car).transform;
            roof.localScale = new Vector3(OiyoField.U(across ? lenPx * 0.45f : widPx * 0.8f), OiyoField.U(across ? widPx * 0.8f : lenPx * 0.45f), 0.25f);
            roof.localPosition = new Vector3(-DX[Dir(i)] * OiyoField.U(cs * 0.1f), DY[Dir(i)] * OiyoField.U(cs * 0.1f), -0.3f);
            carObj[i] = car;
        }
        cursorMark = Box(cursorMat, 0f, 0f, cs, cs, -0.02f, 0.02f);
    }

    Vector2 CarCentre(int i, float shift)
    {
        var a = Sq(i, 0); var b = Sq(i, Len(i) - 1);
        var c = (SqCentre(a.x, a.y) + SqCentre(b.x, b.y)) / 2f;
        return c + new Vector2(DX[Dir(i)], DY[Dir(i)]) * shift * Cell;
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("parking-out", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        if (state == GameState.Playing && !over) t += dt;
        if (popT > 0f) popT -= dt;
        Animate(dt);
    }

    void DoTap(int i)
    {
        int r = Tap(i);
        if (r == 0) return;
        if (r == 1) synth.Tone(440f, 0.25f, Wave.Saw, 0.08f, 880f, 5f);
        else
        {
            jolt[i] = 0.3f;
            var f = Sq(i, Len(i) - 1);
            var c = SqCentre(f.x + DX[Dir(i)] * 0.5f, f.y + DY[Dir(i)] * 0.5f);
            sparkle.Emit(field.W(c.x, c.y, -0.5f), new Color(1f, 0.85f, 0.25f), 10, 3f, 0.08f, 0.4f);
            pop = U("Bump! Something's in the way"); popT = 0.9f;
            synth.Tone(120f, 0.15f, Wave.Square, 0.15f, 70f, 10f);
        }
        if (over) End();
    }

    int CarAt(Vector2 f)
    {
        int gx = Mathf.FloorToInt((f.x - OX) / Cell), gy = Mathf.FloorToInt((f.y - OY) / Cell);
        for (int i = 0; i < Cars; i++) if (!outs[i] && Covers(i, gx, gy)) return i;
        return -1;
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
                    // taps are read once per frame
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (OiyoArcade.OverUi(b.pos) || !field.ToField(b.pos, out Vector2 f)) continue;
                        if (state == GameState.Ready) state = GameState.Playing;
                        int i = CarAt(f);
                        if (i < 0) continue;
                        cursor = i;
                        DoTap(i);
                        if (over) break;
                    }
                    int step = Input.GetKeyDown(KeyCode.RightArrow) || Input.GetKeyDown(KeyCode.DownArrow) ? 1 : Input.GetKeyDown(KeyCode.LeftArrow) || Input.GetKeyDown(KeyCode.UpArrow) ? -1 : 0;
                    if (step != 0)
                    {
                        if (state == GameState.Ready) state = GameState.Playing;
                        var left = new List<int>();
                        for (int i = 0; i < Cars; i++) if (!outs[i]) left.Add(i);
                        if (left.Count > 0) cursor = left[(left.IndexOf(cursor) + step + left.Count) % left.Count];
                    }
                    if (Input.GetKeyDown(KeyCode.Space) || confirm)
                    {
                        if (state == GameState.Ready) state = GameState.Playing;
                        else if (cursor >= 0 && !outs[cursor]) DoTap(cursor);
                    }
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
        if (won)
        {
            state = GameState.Victory;
            OiyoArcade.Record(Slug, stageIdx, starsWon, Mathf.Max(0, Mathf.RoundToInt(st.par * 3 - t)), StageCount);
            sparkle.Emit(field.W(180f, 300f, -1f), new Color(1f, 0.85f, 0.25f), 40, 5f, 0.1f, 1f);
            StartCoroutine(Arp(new[] { 523f, 659f, 784f, 1047f, 1319f }, 0.09f));
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

    void Animate(float dt)
    {
        if (root == null) return;
        field.Fit(80f, 10f, 18f, 90f, 520f);
        for (int i = 0; i < Cars; i++)
        {
            if (outs[i]) leaveD[i] += dt * 14f;
            if (jolt[i] > 0f) jolt[i] -= dt;
            var car = carObj[i];
            car.gameObject.SetActive(leaveD[i] < 20f);
            float jig = jolt[i] > 0f ? Mathf.Sin(Time.time * 50f) * 0.12f : 0f;
            var c = CarCentre(i, leaveD[i] + jig);
            car.position = field.W(c.x, c.y, -0.3f);
        }
        cursorMark.gameObject.SetActive(cursor >= 0 && cursor < Cars && !outs[cursor] && !over);
        if (cursor >= 0 && cursor < Cars)
        {
            var c = CarCentre(cursor, 0f);
            bool across = Dir(cursor) % 2 == 1;
            float l = Len(cursor) * Cell;
            cursorMark.position = field.W(c.x, c.y, -0.02f);
            cursorMark.localScale = new Vector3(OiyoField.U(across ? l : Cell), OiyoField.U(across ? Cell : l), 0.02f);
        }
    }

    // ?oiyotest=1 prints the state to the browser console for the automated play check: the clock, the bumps, and the
    // screen point (px from the top-left) of a car whose road out is clear.
    bool testLog; float testT;
    Vector2 Scr(Vector2 f) { var sp = cam.WorldToScreenPoint(field.W(f.x, f.y, -0.3f)); return new Vector2(sp.x, Screen.height - sp.y); }
    void TestTick(float dt)
    {
        if (!testLog || (testT -= dt) > 0f) return;
        testT = 0.05f;
        string next = "null";
        int left = 0;
        for (int i = 0; i < Cars; i++)
        {
            if (outs[i]) continue;
            left++;
            if (next == "null" && CanLeave(i)) { var p = Scr(CarCentre(i, 0f)); next = $"[{i},{p.x:F1},{p.y:F1}]"; }
        }
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"t\":{t:F2},\"par\":{st.par},\"bumps\":{bumps},\"left\":{left},\"next\":{next},\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.1f, 0.44f, 0.76f, 0.97f);
    static readonly Color Dark = new Color(0.1f, 0.11f, 0.12f, 0.9f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + $" · {ParkingOutStages.All[i].w}×{ParkingOutStages.All[i].h} · " + F("{0} cars", ParkingOutStages.All[i].cars.Length / 5);

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(0.85f, 0.93f, 1f), U("Parking Out"),
                U("Every car only drives straight ahead. Tap a car with a clear road to drive it out; three bumps and you're out."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        int left = 0;
        foreach (bool o in outs) if (!o) left++;
        var bar = new Rect(8f, 8f, w - 16f, 64f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 12f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>  " + F("{0} cars left", left), 15, new Color(0.85f, 0.93f, 1f));
        OiyoArcade.Text(new Rect(20f, 36f, w - 90f, 24f), F("Bumps {0}/{1}", bumps, MaxBumps) + "   " + F("{0}s", Mathf.FloorToInt(t)) + $"   ★★★ <= {st.par}s", 14, Color.white);
        if (OiyoArcade.Button(new Rect(w - 60f, 14f, 44f, 44f), "<b>II</b>", OiyoScreens.Slate, 18))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (pop != null && popT > 0f && state == GameState.Playing)
            OiyoArcade.Shadowed(new Rect(0f, 84f, w, 30f), pop, 18, new Color(1f, 0.6f, 0.3f), TextAnchor.MiddleCenter);
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap to start"), U("Tap a car with a clear road ahead to drive it out!"), 140f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            string detail = won ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : "";
            string body = $"<size=14>{F("{0}s · {1} bumps", Mathf.RoundToInt(t), bumps)}</size>";
            int r = OiyoScreens.Result(w, h, Dark, Accent, won, ResultLive, won ? U("The car park is empty!") : U("The attendant sends you away"), detail, body,
                won && stageIdx < StageCount - 1 ? U("Next stage") : null, won && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
