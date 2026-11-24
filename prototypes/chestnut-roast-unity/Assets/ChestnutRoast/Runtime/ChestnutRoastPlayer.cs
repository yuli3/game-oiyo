using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Chestnut Roast 3D: the web Chestnut Roast (src/components/games/ChestnutRoast.tsx, src/lib/games/chestnut-roast.ts)
// rebuilt in Unity, in the web's own px: the pan is centred at (180, 250) with radius 140, its heat
// 0.3 + 0.7 (1 − (r/140)²); a chestnut on the pan roasts at cook × heat per second (not while held).
// Golden is doneness 1 up to the stage's top; past 1.5 it burns. Dropping one in the bag (centre
// (300, 470), radius 52) sells it if golden, hands it back if raw; anywhere else it drops back inside
// the rim. Sell the mark. The 30 stalls are the web's own (ChestnutRoastStages.cs).
public class ChestnutRoastPlayer : MonoBehaviour
{
    const string Slug = "chestnut-roast";
    const int StageCount = 30;
    const float PanX = 180f, PanY = 250f, PanR = 140f, BagX = 300f, BagY = 470f, BagR = 52f, GrabR = 30f, GoldLo = 1f, Burn = 1.5f, PX = 40f;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of chestnut-roast.ts) ----------------
    ChestnutRoastStages.Level st;
    int stageIdx, n;
    float t;
    float[] cx, cy, cd;
    int[] cs; // 0 waiting, 1 pan, 2 sold, 3 raw, 4 burnt
    int held, gold, raw, burnt, starsWon;
    bool over, won;

    float At(int i) => st.arrivals[i * 2];
    float Angle(int i) => st.arrivals[i * 2 + 1];
    static float HeatAt(float x, float y) { float u = Mathf.Min(1f, Mathf.Sqrt((x - PanX) * (x - PanX) + (y - PanY) * (y - PanY)) / PanR); return 0.3f + 0.7f * (1f - u * u); }
    bool Golden(int i) => cd[i] >= GoldLo && cd[i] <= st.goldHi;

    void NewStall()
    {
        t = 0f; n = st.arrivals.Length / 2; cx = new float[n]; cy = new float[n]; cd = new float[n]; cs = new int[n];
        for (int i = 0; i < n; i++) { cx[i] = PanX + Mathf.Cos(Angle(i)) * (PanR - 14f); cy[i] = PanY + Mathf.Sin(Angle(i)) * (PanR - 14f); }
        held = -1; gold = 0; raw = 0; burnt = 0; over = false; won = false;
    }
    int Grab(float x, float y)
    {
        if (over) return -1;
        int best = -1; float bd = GrabR;
        for (int i = 0; i < n; i++)
        {
            if (cs[i] != 1) continue;
            float d = Mathf.Sqrt((cx[i] - x) * (cx[i] - x) + (cy[i] - y) * (cy[i] - y));
            if (d <= bd) { bd = d; best = i; }
        }
        held = best;
        return best;
    }
    void DragTo(float x, float y) { if (held >= 0) { cx[held] = x; cy[held] = y; } }
    // "sold", "raw", "moved" or null
    string Drop()
    {
        int i = held;
        if (i < 0) return null;
        held = -1;
        if (Mathf.Sqrt((cx[i] - BagX) * (cx[i] - BagX) + (cy[i] - BagY) * (cy[i] - BagY)) <= BagR)
        {
            if (Golden(i)) { cs[i] = 2; gold++; return "sold"; }
            if (cd[i] < GoldLo) { cs[i] = 3; raw++; return "raw"; }
        }
        float dx = cx[i] - PanX, dy = cy[i] - PanY, r = Mathf.Sqrt(dx * dx + dy * dy), max = PanR - 12f;
        if (r > max) { cx[i] = PanX + dx / r * max; cy[i] = PanY + dy / r * max; }
        return "moved";
    }

    readonly List<int> burntNow = new List<int>();
    bool Step(float dt)
    {
        burntNow.Clear();
        if (over) return false;
        t += dt;
        for (int i = 0; i < n; i++)
        {
            if (cs[i] == 0 && t >= At(i)) cs[i] = 1;
            if (cs[i] != 1) continue;
            if (held != i) cd[i] += st.cook * HeatAt(cx[i], cy[i]) * dt;
            if (cd[i] > Burn) { cs[i] = 4; burnt++; if (held == i) held = -1; burntNow.Add(i); }
        }
        bool done = true; for (int i = 0; i < n; i++) if (cs[i] <= 1) { done = false; break; }
        if (done) { over = true; won = gold >= st.need; return true; }
        return false;
    }

    int StarsFor()
    {
        if (!won) return 0;
        if (gold >= n) return 3;
        if (gold >= n - 1) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    Camera cam;
    Transform root, bag;
    readonly List<Transform> nuts = new List<Transform>();
    readonly List<Renderer> nutR = new List<Renderer>();
    readonly List<Transform> glows = new List<Transform>();
    Material rawMat, goldMat, burntMat, panMat, coalMat, bagMat, streetMat, glowMat;
    Bursts bursts, steam;
    Synth synth;
    bool showStages;

    // field px (x right, y down) -> world on the pan plane
    static Vector3 P(float x, float y, float h = 0f) => new Vector3((x - PanX) / PX, h, -(y - PanY) / PX);

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        cam = new GameObject("Camera").AddComponent<Camera>();
        cam.fieldOfView = 45f; cam.nearClipPlane = 0.1f; cam.farClipPlane = 100f;
        cam.clearFlags = CameraClearFlags.SolidColor;
        cam.backgroundColor = new Color(0.1f, 0.1f, 0.18f);
        OiyoField.Lights(new Color(0.6f, 0.5f, 0.45f), 0.9f, 60f, -20f);
        bursts = new Bursts(transform, 0.5f);
        steam = new Bursts(transform, 0.4f);
        synth = new Synth(gameObject);
        rawMat = OiyoField.Sprite("CR/raw");
        goldMat = OiyoField.Sprite("CR/gold");
        burntMat = OiyoField.Sprite("CR/burnt");
        panMat = OiyoArcade.Lit(new Color(0.24f, 0.18f, 0.15f), 0.6f, OiyoArcade.Art("CR/iron", true));
        coalMat = OiyoArcade.LitGlow(new Color(0.9f, 0.35f, 0.05f), new Color(0.9f, 0.3f, 0.02f));
        bagMat = OiyoArcade.Lit(Color.white, 0.1f, OiyoArcade.Art("CR/paper", true));
        streetMat = OiyoArcade.Lit(new Color(0.23f, 0.16f, 0.13f), 0.2f);
        glowMat = OiyoArcade.Transparent(OiyoArcade.Solid(Color.white), new Color(1f, 0.83f, 0.23f, 0.4f));
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int idx, bool ready = true)
    {
        stageIdx = Mathf.Clamp(idx, 0, StageCount - 1);
        StopAllCoroutines();
        st = ChestnutRoastStages.All[stageIdx];
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Stall").transform;
        NewStall();
        starsWon = 0;
        showStages = false;
        pressId = int.MinValue;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Animate(0f);
    }

    void BuildScene()
    {
        var street = OiyoArcade.Prim(PrimitiveType.Cube, "Stall top", streetMat, root);
        street.transform.position = new Vector3(0f, -0.6f, -1f);
        street.transform.localScale = new Vector3(16f, 0.4f, 16f);
        var coals = OiyoArcade.Prim(PrimitiveType.Cylinder, "Coals", coalMat, root);
        coals.transform.position = P(PanX, PanY, -0.3f);
        coals.transform.localScale = new Vector3(PanR * 2.15f / PX, 0.15f, PanR * 2.15f / PX);
        var pan = OiyoArcade.Prim(PrimitiveType.Cylinder, "Pan", panMat, root);
        pan.transform.position = P(PanX, PanY, -0.1f);
        pan.transform.localScale = new Vector3(PanR * 2f / PX, 0.1f, PanR * 2f / PX);
        bag = OiyoArcade.Prim(PrimitiveType.Cube, "Bag", bagMat, root).transform;
        bag.position = P(BagX, BagY, 0.7f);
        bag.localScale = new Vector3(BagR * 1.6f / PX, 1.4f, BagR * 1.2f / PX);
        nuts.Clear(); nutR.Clear(); glows.Clear();
        for (int i = 0; i < n; i++)
        {
            var nut = OiyoField.Quad("Chestnut", rawMat, root, 1f, 1f);
            nut.localScale = new Vector3(1f, 1f, 1f);
            nut.gameObject.SetActive(false);
            nuts.Add(nut); nutR.Add(nut.GetComponent<Renderer>());
            var g = OiyoArcade.Prim(PrimitiveType.Cylinder, "Glow", glowMat, root).transform;
            g.localScale = new Vector3(1.1f, 0.01f, 1.1f);
            g.gameObject.SetActive(false);
            glows.Add(g);
        }
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("chestnut-roast", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        if (state == GameState.Playing)
        {
            bool end = Step(dt);
            foreach (int i in burntNow) { Toast(U("Burnt!"), new Color(1f, 0.45f, 0.4f)); bursts.Emit(P(cx[i], cy[i], 0.3f), new Color(0.2f, 0.2f, 0.2f), 14, 2f, 0.15f, 0.6f); synth.Tone(180f, 0.25f, Wave.Noise, 0.14f, 90f, 6f); }
            if (Mathf.FloorToInt(t * 3f) != Mathf.FloorToInt((t - dt) * 3f))
                for (int i = 0; i < n; i++) if (cs[i] == 1 && Golden(i)) steam.Emit(P(cx[i], cy[i], 0.4f), new Color(1f, 1f, 1f, 0.6f), 2, 0.6f, 0.12f, 0.6f, Vector3.up * 1.2f);
            if (end) End();
        }
        msgT = Mathf.Max(0f, msgT - dt);
        Animate(dt);
    }

    string msg = ""; float msgT; Color msgC = Color.white;
    void Toast(string m, Color c) { msg = m; msgT = 0.8f; msgC = c; }

    int pressId = int.MinValue;

    bool FieldPoint(Vector2 screen, out float fx, out float fy)
    {
        var ray = cam.ScreenPointToRay(screen);
        var plane = new Plane(Vector3.up, Vector3.zero);
        fx = fy = 0f;
        if (!plane.Raycast(ray, out float enter)) return false;
        var w = ray.GetPoint(enter);
        fx = w.x * PX + PanX;
        fy = -w.z * PX + PanY;
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
                    if (state == GameState.Playing && (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P))) { state = GameState.Paused; Drop(); pressId = int.MinValue; return; }
                    // the finger is read once per frame: a touch grabs, a drag carries, a lift drops
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (state == GameState.Ready) { state = GameState.Playing; continue; }
                        if (FieldPoint(b.pos, out float fx, out float fy)) { pressId = b.id; Grab(fx, fy); }
                    }
                    foreach (var hp in OiyoArcade.Held()) if (hp.id == pressId && FieldPoint(hp.pos, out float fx, out float fy)) DragTo(fx, fy);
                    foreach (var e in OiyoArcade.Ended())
                        if (e.id == pressId)
                        {
                            if (FieldPoint(e.pos, out float fx, out float fy)) DragTo(fx, fy);
                            pressId = int.MinValue;
                            int i = held;
                            string r = Drop();
                            if (r == "sold") { Toast(U("Hot chestnuts!"), new Color(0.55f, 1f, 0.6f)); bursts.Emit(bag.position + Vector3.up, new Color(1f, 0.83f, 0.23f), 12, 2f, 0.12f, 0.5f); synth.Tone(784f, 0.14f, Wave.Triangle, 0.18f, 1175f, 8f); }
                            else if (r == "raw") { Toast(U("Not done yet"), new Color(1f, 0.6f, 0.3f)); synth.Tone(240f, 0.15f, Wave.Square, 0.08f, 160f, 10f); }
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
            OiyoArcade.Record(Slug, stageIdx, starsWon, gold, StageCount);
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
        for (int i = 0; i < n; i++)
        {
            bool show = cs[i] == 1;
            nuts[i].gameObject.SetActive(show);
            glows[i].gameObject.SetActive(show && Golden(i));
            if (!show) continue;
            nuts[i].position = P(cx[i], cy[i], held == i ? 0.6f : 0.12f);
            nutR[i].sharedMaterial = cd[i] > st.goldHi ? burntMat : Golden(i) ? goldMat : rawMat;
            glows[i].position = P(cx[i], cy[i], 0.02f);
        }
        bool portrait = cam.aspect < 1f;
        float halfH = Mathf.Atan(Mathf.Tan(cam.fieldOfView * 0.5f * Mathf.Deg2Rad) * cam.aspect);
        float dist = Mathf.Max(13f, 5f / Mathf.Tan(halfH));
        var focus = P(210f, 330f);
        cam.transform.position = focus + new Vector3(0f, dist * 0.9f, -dist * 0.55f);
        cam.transform.LookAt(focus);
        foreach (var nut in nuts) nut.rotation = cam.transform.rotation;
    }

    // ?oiyotest=1 prints the state to the browser console for the automated play check: every chestnut on
    // the pan (index, x, y in field px, doneness, screen x, y), the golden window, and screen points of
    // the bag and two spots in the middle.
    bool testLog; float testT;
    void TestTick(float dt)
    {
        if (!testLog || (testT -= dt) > 0f) return;
        testT = 0.02f;
        var sb = new System.Text.StringBuilder();
        for (int i = 0; i < n; i++)
        {
            if (cs[i] != 1) continue;
            if (sb.Length > 0) sb.Append(',');
            var sp = cam.WorldToScreenPoint(P(cx[i], cy[i]));
            sb.Append('[').Append(i).Append(',').Append(cx[i].ToString("F1")).Append(',').Append(cy[i].ToString("F1")).Append(',').Append(cd[i].ToString("F3")).Append(',').Append(sp.x.ToString("F1")).Append(',').Append((Screen.height - sp.y).ToString("F1")).Append(']');
        }
        // screen points (px from the top-left) of the bag and of two spots in the middle of the pan
        var bagS = cam.WorldToScreenPoint(P(BagX, BagY));
        var m1 = cam.WorldToScreenPoint(P(PanX + 28f, PanY));
        var m2 = cam.WorldToScreenPoint(P(PanX - 28f, PanY));
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"t\":{t:F3},\"held\":{held},\"nuts\":[{sb}],\"goldHi\":{st.goldHi:F3},\"cook\":{st.cook:F3},\"gold\":{gold},\"burnt\":{burnt},\"raw\":{raw},\"need\":{st.need},\"bag\":[{bagS.x:F1},{Screen.height - bagS.y:F1}],\"mid\":[{m1.x:F1},{Screen.height - m1.y:F1},{m2.x:F1},{Screen.height - m2.y:F1}],\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.91f, 0.35f, 0.05f, 0.97f);
    static readonly Color Dark = new Color(0.12f, 0.09f, 0.08f, 0.88f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("{0} chestnuts", ChestnutRoastStages.All[i].arrivals.Length / 2);

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(1f, 0.85f, 0.55f), U("Chestnut Roast"),
                U("Drag chestnuts into the hot middle, then into the bag when they glow golden. Don't let them burn."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        var bar = new Rect(8f, 8f, w - 16f, 64f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 12f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>", 15, new Color(1f, 0.92f, 0.75f));
        OiyoArcade.Text(new Rect(20f, 36f, w - 90f, 24f), F("Sold {0}/{1}", gold, st.need), 16, Color.white);
        if (OiyoArcade.Button(new Rect(w - 60f, 14f, 44f, 44f), "<b>II</b>", OiyoScreens.Slate, 18))
        {
            if (state == GameState.Playing) { state = GameState.Paused; Drop(); pressId = int.MinValue; }
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        // a doneness bar under each chestnut
        if (state == GameState.Playing)
            for (int i = 0; i < n; i++)
            {
                if (cs[i] != 1) continue;
                var sp = cam.WorldToScreenPoint(P(cx[i], cy[i] + 22f, 0.35f));
                var g = OiyoArcade.ToGui(new Vector2(sp.x, sp.y));
                var col = cd[i] > st.goldHi ? new Color(0.88f, 0.19f, 0.19f) : Golden(i) ? new Color(0.25f, 0.75f, 0.34f) : new Color(0.98f, 0.69f, 0.02f);
                OiyoArcade.Bar(new Rect(g.x - 16f, g.y, 32f, 5f), Mathf.Min(1f, cd[i] / Burn), new Color(0f, 0f, 0f, 0.55f), col);
                OiyoArcade.Fill(new Rect(g.x - 16f + 32f * GoldLo / Burn, g.y - 2f, 1.5f, 9f), Color.white);
            }
        if (msgT > 0f) OiyoArcade.Shadowed(new Rect(8f, 80f, w - 16f, 36f), msg, 22, msgC, TextAnchor.MiddleCenter);
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap to open the stall"), U("The middle roasts fast, the rim slow. Bag them when they glow."), 200f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            bool w0 = state == GameState.Victory;
            string detail = w0 ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : F("Sold {0}/{1}", gold, st.need);
            string body = $"<size=14>{F("{0} sold · {1} burnt · {2} raw", gold, burnt, raw)}</size>";
            int r = OiyoScreens.Result(w, h, Dark, Accent, w0, ResultLive, w0 ? U("A roaring trade!") : U("Too many burnt"), detail, body,
                w0 && stageIdx < StageCount - 1 ? U("Next stage") : null, w0 && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
