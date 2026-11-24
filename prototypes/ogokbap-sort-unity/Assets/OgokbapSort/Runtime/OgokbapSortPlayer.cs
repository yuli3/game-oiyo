using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Ogokbap Sort 3D: the web Ogokbap Sort (src/components/games/OgokbapSort.tsx, src/lib/games/ogokbap-sort.ts)
// rebuilt in Unity, in the web's own px: grains pour at their times from the top (y 0) at their x and fall
// at their speed to the bowls at y 470. Five bowls 72 px wide each take one grain kind (the stage's
// order). Touching within 34 px grabs the nearest falling grain; it follows the finger's x while it keeps
// falling; it lands in whichever bowl is under it (+1 right, −1 wrong). Finish at or above the mark.
// The 30 pours are the web's own (OgokbapSortStages.cs). Keyboard: 1 to 5.
public class OgokbapSortPlayer : MonoBehaviour
{
    const string Slug = "ogokbap-sort";
    const int StageCount = 30, Bowls = 5;
    const float FieldW = 360f, BowlY = 470f, BowlW = FieldW / Bowls, GrabR = 34f, PX = 40f;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of ogokbap-sort.ts) ----------------
    OgokbapSortStages.Level st;
    int stageIdx, count;
    float t;
    float[] gx, gy;
    int[] gstate; // 0 waiting, 1 falling, 2 landed
    int held, right, wrong, starsWon;
    bool over, won;

    int Kind(int i) => Mathf.RoundToInt(st.grains[i * 4]);
    float X0(int i) => st.grains[i * 4 + 1];
    float At(int i) => st.grains[i * 4 + 2];
    float Speed(int i) => st.grains[i * 4 + 3];
    static int BowlAt(float x) => Mathf.Clamp(Mathf.FloorToInt(x / BowlW), 0, Bowls - 1);
    static float BowlCentre(int b) => (b + 0.5f) * BowlW;

    void NewPour()
    {
        t = 0f; count = st.grains.Length / 4; gx = new float[count]; gy = new float[count]; gstate = new int[count];
        for (int i = 0; i < count; i++) { gx[i] = X0(i); gy[i] = -1f; }
        held = -1; right = 0; wrong = 0; over = false; won = false;
    }
    int Grab(float x, float y)
    {
        if (over) return -1;
        int best = -1; float bd = GrabR;
        for (int i = 0; i < count; i++)
        {
            if (gstate[i] != 1) continue;
            float d = Mathf.Sqrt((gx[i] - x) * (gx[i] - x) + (gy[i] - y) * (gy[i] - y));
            if (d <= bd) { bd = d; best = i; }
        }
        held = best;
        return best;
    }
    void DragTo(float x) { if (held >= 0 && gstate[held] == 1) gx[held] = Mathf.Clamp(x, 8f, FieldW - 8f); }

    readonly List<int> landedRight = new List<int>(), landedWrong = new List<int>();
    bool Step(float dt)
    {
        landedRight.Clear(); landedWrong.Clear();
        if (over) return false;
        t += dt;
        for (int i = 0; i < count; i++)
        {
            if (gstate[i] == 0 && t >= At(i)) { gstate[i] = 1; gy[i] = 0f; }
            if (gstate[i] != 1) continue;
            gy[i] += Speed(i) * dt;
            if (gy[i] >= BowlY)
            {
                gy[i] = BowlY; gstate[i] = 2;
                if (held == i) held = -1;
                if (st.order[BowlAt(gx[i])] == Kind(i)) { right++; landedRight.Add(i); } else { wrong++; landedWrong.Add(i); }
            }
        }
        bool all = true; for (int i = 0; i < count; i++) if (gstate[i] != 2) { all = false; break; }
        if (all) { over = true; won = right - wrong >= st.need; return true; }
        return false;
    }

    int StarsFor()
    {
        if (!won) return 0;
        int s = right - wrong;
        if (s >= count) return 3;
        if (s >= count - 2) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    Camera cam;
    Transform root;
    readonly List<Transform> grains = new List<Transform>();
    readonly List<Transform> rings = new List<Transform>();
    Material[] grainMats;
    Material bowlMat, matMat, sackMat, ringMat, wallMat;
    Bursts bursts;
    Synth synth;
    bool showStages;
    static readonly string[] KindNames = { "Rice", "Barley", "Millet", "Black bean", "Red bean" };
    static readonly Color[] KindColors = { new Color(0.97f, 0.98f, 0.98f), new Color(0.91f, 0.77f, 0.42f), new Color(1f, 0.83f, 0.23f), new Color(0.2f, 0.23f, 0.25f), new Color(0.65f, 0.12f, 0.3f) };

    // field px (x right, y down from the sacks) -> world
    static Vector3 P(float x, float y) => new Vector3((x - FieldW * 0.5f) / PX, (BowlY - y) / PX + 0.6f, 0f);

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        cam = new GameObject("Camera").AddComponent<Camera>();
        cam.fieldOfView = 45f; cam.nearClipPlane = 0.1f; cam.farClipPlane = 100f;
        cam.clearFlags = CameraClearFlags.SolidColor;
        cam.backgroundColor = new Color(1f, 0.96f, 0.9f);
        OiyoField.Lights(new Color(0.72f, 0.66f, 0.6f), 0.9f, 40f, -20f);
        bursts = new Bursts(transform, 0.5f);
        synth = new Synth(gameObject);
        grainMats = new Material[Bowls];
        for (int k = 0; k < Bowls; k++) grainMats[k] = OiyoField.Sprite("OG/grain" + k);
        bowlMat = OiyoArcade.Lit(Color.white, 0.4f, OiyoArcade.Art("OG/wood", true));
        matMat = OiyoArcade.Lit(new Color(0.91f, 0.76f, 0.62f), 0.15f);
        sackMat = OiyoArcade.Lit(new Color(0.75f, 0.54f, 0.35f), 0.1f);
        ringMat = OiyoArcade.Glow(new Color(0.11f, 0.49f, 0.84f));
        wallMat = OiyoArcade.Lit(Color.white, 0.05f, OiyoArcade.Art("OG/hanji", true));
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int idx, bool ready = true)
    {
        stageIdx = Mathf.Clamp(idx, 0, StageCount - 1);
        StopAllCoroutines();
        st = OgokbapSortStages.All[stageIdx];
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Kitchen").transform;
        NewPour();
        starsWon = 0;
        showStages = false;
        pressId = int.MinValue;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Animate(0f);
    }

    void BuildScene()
    {
        var wall = OiyoArcade.Prim(PrimitiveType.Quad, "Wall", wallMat, root);
        wall.transform.position = new Vector3(0f, 6f, 3f);
        wall.transform.localScale = new Vector3(30f, 20f, 1f);
        var floor = OiyoArcade.Prim(PrimitiveType.Cube, "Mat", matMat, root);
        floor.transform.position = new Vector3(0f, -0.2f, 0f);
        floor.transform.localScale = new Vector3(12f, 0.2f, 4f);
        var sacks = OiyoArcade.Prim(PrimitiveType.Cube, "Sacks", sackMat, root);
        sacks.transform.position = P(FieldW * 0.5f, -14f) + new Vector3(0f, 0f, 0.6f);
        sacks.transform.localScale = new Vector3(9.6f, 0.7f, 0.6f);
        for (int b = 0; b < Bowls; b++)
        {
            var bowl = OiyoArcade.Prim(PrimitiveType.Cylinder, "Bowl", bowlMat, root);
            bowl.transform.position = P(BowlCentre(b), BowlY + 10f) + new Vector3(0f, -0.15f, 0f);
            bowl.transform.localScale = new Vector3(1.6f, 0.3f, 1.2f);
            var fill = OiyoArcade.Prim(PrimitiveType.Cylinder, "Grain", OiyoArcade.Lit(KindColors[st.order[b]], 0.2f), root);
            fill.transform.position = bowl.transform.position + new Vector3(0f, 0.3f, 0f);
            fill.transform.localScale = new Vector3(1.4f, 0.02f, 1.05f);
            var icon = OiyoField.Quad("Icon", grainMats[st.order[b]], root, 1f, 1f);
            icon.localScale = new Vector3(0.7f, 0.7f, 1f);
            icon.position = bowl.transform.position + new Vector3(0f, -0.15f, -0.65f);
        }
        grains.Clear(); rings.Clear();
        for (int i = 0; i < count; i++)
        {
            var g = OiyoField.Quad("Grain", grainMats[Kind(i)], root, 1f, 1f);
            g.localScale = new Vector3(0.9f, 0.9f, 1f);
            g.gameObject.SetActive(false);
            grains.Add(g);
        }
        var ring = OiyoArcade.Prim(PrimitiveType.Cylinder, "Held", ringMat, root).transform;
        ring.localScale = new Vector3(1f, 0.01f, 1f);
        ring.rotation = Quaternion.Euler(90f, 0f, 0f);
        rings.Add(ring);
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("ogokbap-sort", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        if (state == GameState.Playing)
        {
            bool end = Step(dt);
            foreach (int i in landedRight) { bursts.Emit(P(gx[i], BowlY), new Color(1f, 0.83f, 0.23f), 8, 1.5f, 0.1f, 0.35f); synth.Tone(880f, 0.05f, Wave.Triangle, 0.08f, 1100f, 16f); }
            foreach (int i in landedWrong) { Toast(U("Mixed!"), new Color(1f, 0.5f, 0.45f)); synth.Tone(200f, 0.14f, Wave.Square, 0.08f, 140f, 10f); }
            if (end) End();
        }
        msgT = Mathf.Max(0f, msgT - dt);
        Animate(dt);
    }

    string msg = ""; float msgT; Color msgC = Color.white;
    void Toast(string m, Color c) { msg = m; msgT = 0.6f; msgC = c; }

    int pressId = int.MinValue;

    bool FieldPoint(Vector2 screen, out float fx, out float fy)
    {
        var ray = cam.ScreenPointToRay(screen);
        var plane = new Plane(Vector3.back, Vector3.zero);
        fx = fy = 0f;
        if (!plane.Raycast(ray, out float enter)) return false;
        var w = ray.GetPoint(enter);
        fx = w.x * PX + FieldW * 0.5f;
        fy = BowlY - (w.y - 0.6f) * PX;
        return true;
    }

    void ReadInput()
    {
        bool confirm = Input.GetKeyDown(KeyCode.Return);
        switch (state)
        {
            case GameState.Ready:
            case GameState.Playing:
                {
                    if (state == GameState.Playing && (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P))) { state = GameState.Paused; held = -1; return; }
                    // the finger is read once per frame: a touch grabs, a drag moves sideways, a lift lets go
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (state == GameState.Ready) { state = GameState.Playing; continue; }
                        if (FieldPoint(b.pos, out float fx, out float fy)) { pressId = b.id; Grab(fx, fy); }
                    }
                    foreach (var hp in OiyoArcade.Held()) if (hp.id == pressId && FieldPoint(hp.pos, out float fx, out _)) DragTo(fx);
                    foreach (var e in OiyoArcade.Ended()) if (e.id == pressId) { pressId = int.MinValue; held = -1; }
                    for (int k = 0; k < Bowls; k++)
                        if (Input.GetKeyDown(KeyCode.Alpha1 + k) || Input.GetKeyDown(KeyCode.Keypad1 + k))
                        {
                            if (state == GameState.Ready) { state = GameState.Playing; continue; }
                            int pick = -1; float low = -1f;
                            for (int i = 0; i < count; i++) if (gstate[i] == 1 && gy[i] > low) { low = gy[i]; pick = i; }
                            if (pick >= 0) { held = pick; DragTo(BowlCentre(k)); held = -1; }
                        }
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
        held = -1;
        if (won)
        {
            starsWon = StarsFor();
            state = GameState.Victory;
            OiyoArcade.Record(Slug, stageIdx, starsWon, right - wrong, StageCount);
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
        for (int i = 0; i < count; i++)
        {
            bool show = gstate[i] == 1;
            grains[i].gameObject.SetActive(show);
            if (show) grains[i].position = P(gx[i], gy[i]) + new Vector3(0f, 0f, -0.2f);
        }
        rings[0].gameObject.SetActive(held >= 0);
        if (held >= 0) rings[0].position = P(gx[held], gy[held]) + new Vector3(0f, 0f, -0.15f);
        bool portrait = cam.aspect < 1f;
        float halfH = Mathf.Atan(Mathf.Tan(cam.fieldOfView * 0.5f * Mathf.Deg2Rad) * cam.aspect);
        float dist = Mathf.Max(17f, 5.4f / Mathf.Tan(halfH));
        cam.transform.position = new Vector3(0f, 6.4f, -dist);
        cam.transform.LookAt(new Vector3(0f, 6.2f, 0f));
        foreach (var g in grains) g.rotation = cam.transform.rotation;
    }

    // ?oiyotest=1 prints the state to the browser console for the automated play check: every falling
    // grain (index, kind, x, y in field px, speed), the bowl order, and the field-to-screen mapping.
    bool testLog; float testT;
    void TestTick(float dt)
    {
        if (!testLog || (testT -= dt) > 0f) return;
        testT = 0.02f;
        var sb = new System.Text.StringBuilder();
        for (int i = 0; i < count; i++)
        {
            if (gstate[i] != 1) continue;
            if (sb.Length > 0) sb.Append(',');
            sb.Append('[').Append(i).Append(',').Append(Kind(i)).Append(',').Append(gx[i].ToString("F1")).Append(',').Append(gy[i].ToString("F1")).Append(',').Append(Speed(i).ToString("F0")).Append(']');
        }
        var o = cam.WorldToScreenPoint(P(0f, 0f));
        var r = cam.WorldToScreenPoint(P(100f, 0f));
        var d = cam.WorldToScreenPoint(P(0f, 100f));
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"t\":{t:F3},\"held\":{held},\"g\":[{sb}],\"order\":[{string.Join(",", st.order)}],\"right\":{right},\"wrong\":{wrong},\"need\":{st.need},\"ox\":{o.x:F1},\"oy\":{Screen.height - o.y:F1},\"kx\":{(r.x - o.x) / 100f:F4},\"ky\":{(o.y - d.y) / 100f:F4},\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.75f, 0.54f, 0.35f, 0.97f);
    static readonly Color Dark = new Color(0.25f, 0.17f, 0.1f, 0.86f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("{0} grains", OgokbapSortStages.All[i].grains.Length / 4);

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(1f, 0.9f, 0.7f), U("Ogokbap Sort"),
                U("Grab each falling grain and drag it over the bowl for that grain. Wrong bowls get mixed."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        var bar = new Rect(8f, 8f, w - 16f, 64f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 12f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>", 15, new Color(1f, 0.92f, 0.75f));
        OiyoArcade.Text(new Rect(20f, 36f, w - 90f, 24f), F("Sorted {0}/{1}", Mathf.Max(0, right - wrong), st.need), 16, Color.white);
        if (OiyoArcade.Button(new Rect(w - 60f, 14f, 44f, 44f), "<b>II</b>", OiyoScreens.Slate, 18))
        {
            if (state == GameState.Playing) { state = GameState.Paused; held = -1; }
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        // bowl names under the bowls
        if (state == GameState.Playing || state == GameState.Ready)
            for (int b = 0; b < Bowls; b++)
            {
                var sp = cam.WorldToScreenPoint(P(BowlCentre(b), BowlY + 52f));
                var g = OiyoArcade.ToGui(new Vector2(sp.x, sp.y));
                OiyoArcade.Shadowed(new Rect(g.x - 40f, g.y, 80f, 20f), U(KindNames[st.order[b]]), 12, Color.white, TextAnchor.MiddleCenter);
            }
        if (msgT > 0f) OiyoArcade.Shadowed(new Rect(8f, 80f, w - 16f, 36f), msg, 22, msgC, TextAnchor.MiddleCenter);
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap to start the pour"), U("Then grab a grain and drag it over its own bowl."), 220f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            bool w0 = state == GameState.Victory;
            string detail = w0 ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : F("Sorted {0}/{1}", Mathf.Max(0, right - wrong), st.need);
            string body = $"<size=14>{F("{0} sorted · {1} mixed", right, wrong)}</size>";
            int r = OiyoScreens.Result(w, h, Dark, Accent, w0, ResultLive, w0 ? U("The ogokbap is ready!") : U("Too many grains got mixed"), detail, body,
                w0 && stageIdx < StageCount - 1 ? U("Next stage") : null, w0 && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
