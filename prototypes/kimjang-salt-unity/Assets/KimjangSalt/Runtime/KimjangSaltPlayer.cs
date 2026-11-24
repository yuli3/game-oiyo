using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Kimjang Salt 3D: the web Kimjang Salt (src/components/games/KimjangSalt.tsx, src/lib/games/kimjang-salt.ts)
// rebuilt in Unity on the web's own 360 × 560 px field (OiyoField). The cabbage is 4 × 5 patches of 60 px
// from (60, 130). While held, the hand salts every patch at rate × exp(−(d/34)²) per second, d its distance
// from the patch's middle. A patch within target × (1 ± tol) is well salted. Each cabbage is judged when
// its clock runs out or Done is pressed. The 30 stages are the web's own (KimjangSaltStages.cs).
public class KimjangSaltPlayer : MonoBehaviour
{
    const string Slug = "kimjang-salt";
    const int StageCount = 30, Cols = 4, Rows = 5, N = Cols * Rows;
    const float Cell = 60f, GridX = 60f, GridY = 130f, Spread = 34f;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of kimjang-salt.ts) ----------------
    KimjangSaltStages.Level st;
    int stageIdx, idx, good, raw, salty, starsWon;
    float t, total;
    readonly float[] salt = new float[N];
    bool hand;
    Vector2 handAt;
    bool over, won;

    float Target(int i) => st.targets[Mathf.Min(idx, st.cabbages - 1) * N + i];
    float Lo(int i) => Target(i) * (1f - st.tol);
    float Hi(int i) => Target(i) * (1f + st.tol);
    static Vector2 Center(int i) => new Vector2(GridX + (i % Cols + 0.5f) * Cell, GridY + (i / Cols + 0.5f) * Cell);
    static float Kernel(float dx, float dy) => Mathf.Exp(-(dx * dx + dy * dy) / (Spread * Spread));

    void NewTray()
    {
        idx = 0; t = 0f; total = 0f; good = 0; raw = 0; salty = 0; hand = false; over = false; won = false;
        System.Array.Clear(salt, 0, N);
    }

    int lastGood = -1;
    void Done()
    {
        if (over) return;
        int g = 0;
        for (int i = 0; i < N; i++)
        {
            if (salt[i] < Lo(i)) raw++;
            else if (salt[i] > Hi(i)) salty++;
            else g++;
        }
        good += g; lastGood = g;
        idx++; t = 0f; hand = false;
        System.Array.Clear(salt, 0, N);
        if (idx >= st.cabbages) { over = true; won = good >= st.need; }
    }

    // returns true when a cabbage was judged this step
    bool Step(float dt)
    {
        if (over) return false;
        t += dt; total += dt;
        if (hand)
            for (int i = 0; i < N; i++) { var c = Center(i); salt[i] += st.rate * dt * Kernel(handAt.x - c.x, handAt.y - c.y); }
        if (t >= st.time) { Done(); return true; }
        return false;
    }

    int StarsFor()
    {
        if (!won) return 0;
        if (good >= st.par - 2) return 3;
        if (good >= Mathf.CeilToInt((st.need + st.par) / 2f)) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    OiyoField field;
    Camera cam;
    Transform root, handT;
    readonly Renderer[] cellR = new Renderer[N];
    readonly Material[] cellM = new Material[N];
    readonly Color[] cellBase = new Color[N];
    Material floorMat, basinMat, handMat;
    Bursts bursts;
    Synth synth;
    bool showStages;

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(360f, 560f, new Color(0.79f, 0.64f, 0.42f));
        cam = field.Cam;
        OiyoField.Lights(new Color(0.5f, 0.47f, 0.44f), 0.75f, 45f, -20f);
        bursts = new Bursts(transform, 1.2f);
        synth = new Synth(gameObject);
        floorMat = OiyoArcade.Lit(Color.white, 0.2f, OiyoArcade.Art("KS/floor", true));
        basinMat = OiyoArcade.Lit(new Color(0.79f, 0.16f, 0.16f), 0.6f);
        handMat = OiyoField.Sprite("KS/hand");
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int i, bool ready = true)
    {
        stageIdx = Mathf.Clamp(i, 0, StageCount - 1);
        StopAllCoroutines();
        st = KimjangSaltStages.All[stageIdx];
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Tray").transform;
        NewTray();
        starsWon = 0;
        showStages = false;
        pressId = int.MinValue;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Animate(0f);
    }

    void BuildScene()
    {
        var floor = OiyoArcade.Prim(PrimitiveType.Cube, "Floor", floorMat, root);
        floor.transform.position = field.W(180f, 280f, 0.6f);
        floor.transform.localScale = new Vector3(OiyoField.U(520f), OiyoField.U(700f), 0.4f);
        var basin = OiyoArcade.Prim(PrimitiveType.Cylinder, "Basin", basinMat, root);
        basin.transform.position = field.W(180f, GridY + Rows * Cell * 0.5f, 0.3f);
        basin.transform.rotation = Quaternion.Euler(90f, 0f, 0f);
        basin.transform.localScale = new Vector3(OiyoField.U(340f), 0.2f, OiyoField.U(380f));
        for (int i = 0; i < N; i++)
        {
            float g = (i / Cols) / (float)(Rows - 1);
            cellBase[i] = new Color((70f + 150f * g) / 255f, (160f + 70f * g) / 255f, (50f + 160f * g) / 255f);
            cellM[i] = OiyoArcade.Lit(cellBase[i], 0.35f, OiyoArcade.Art("KS/leaf", true));
            var cube = OiyoArcade.Prim(PrimitiveType.Cube, "Patch", cellM[i], root);
            var c = Center(i);
            cube.transform.position = field.W(c.x, c.y, -0.05f - g * 0.15f);
            cube.transform.localScale = new Vector3(OiyoField.U(Cell - 4f), OiyoField.U(Cell - 4f), 0.2f + g * 0.3f);
            cellR[i] = cube.GetComponent<Renderer>();
        }
        handT = OiyoField.Quad("Hand", handMat, root, 40f, 40f);
        handT.gameObject.SetActive(false);
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("kimjang-salt", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        if (state == GameState.Playing)
        {
            if (Step(dt)) Judged();
            if (hand && Mathf.FloorToInt(total * 20f) != Mathf.FloorToInt((total - dt) * 20f))
                bursts.Emit(field.W(handAt.x, handAt.y - 14f, -0.9f), Color.white, 3, 0.8f, 0.06f, 0.4f, Vector3.down * 0.5f);
            if (over) End();
        }
        msgT = Mathf.Max(0f, msgT - dt);
        Animate(dt);
    }

    void Judged()
    {
        bool fine = lastGood >= N * 0.6f;
        Toast(F("This cabbage: {0} patches well salted", lastGood), fine ? new Color(0.55f, 1f, 0.6f) : new Color(1f, 0.6f, 0.3f));
        if (fine) synth.Tone(784f, 0.14f, Wave.Triangle, 0.18f, 1175f, 8f);
        else synth.Tone(240f, 0.2f, Wave.Square, 0.08f, 160f, 8f);
    }

    string msg = ""; float msgT; Color msgC = Color.white;
    void Toast(string m, Color c) { msg = m; msgT = 1.2f; msgC = c; }

    int pressId = int.MinValue;
    int keyCol = 1, keyRow = 2;
    bool keyActive;

    void ReadInput()
    {
        bool confirm = Input.GetKeyDown(KeyCode.Return);
        switch (state)
        {
            case GameState.Ready:
            case GameState.Playing:
                {
                    if (state == GameState.Playing && (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P))) { state = GameState.Paused; pressId = int.MinValue; hand = false; return; }
                    // the finger is read once per frame: held down it salts where it is
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (OiyoArcade.OverUi(b.pos)) continue;
                        if (state == GameState.Ready) { state = GameState.Playing; continue; }
                        pressId = b.id;
                    }
                    foreach (var e in OiyoArcade.Ended()) if (e.id == pressId) pressId = int.MinValue;
                    bool held = false;
                    foreach (var hp in OiyoArcade.Held())
                        if (hp.id == pressId && field.ToField(hp.pos, out Vector2 f)) { held = true; handAt = f; }
                    if (!held) pressId = int.MinValue;
                    // keyboard: arrows pick a patch, Space salts it, Enter is Done
                    if (Input.GetKeyDown(KeyCode.LeftArrow)) { keyCol = Mathf.Max(0, keyCol - 1); keyActive = true; }
                    if (Input.GetKeyDown(KeyCode.RightArrow)) { keyCol = Mathf.Min(Cols - 1, keyCol + 1); keyActive = true; }
                    if (Input.GetKeyDown(KeyCode.UpArrow)) { keyRow = Mathf.Max(0, keyRow - 1); keyActive = true; }
                    if (Input.GetKeyDown(KeyCode.DownArrow)) { keyRow = Mathf.Min(Rows - 1, keyRow + 1); keyActive = true; }
                    bool key = Input.GetKey(KeyCode.Space);
                    if (key && state == GameState.Ready) state = GameState.Playing;
                    if (key && !held) { held = true; handAt = Center(keyRow * Cols + keyCol); keyActive = true; }
                    hand = held && state == GameState.Playing;
                    if (confirm && state == GameState.Playing) { Done(); Judged(); if (over) End(); }
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
        pressId = int.MinValue;
        hand = false;
        if (won)
        {
            starsWon = StarsFor();
            state = GameState.Victory;
            OiyoArcade.Record(Slug, stageIdx, starsWon, good, StageCount);
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
        field.Fit(80f, 70f, 14f, 100f, 470f);
        for (int i = 0; i < N; i++)
        {
            // salt whitens the patch; too much tints it grey-pink
            float share = over ? 0f : Mathf.Min(1.6f, salt[i] / Target(i));
            var col = Color.Lerp(cellBase[i], Color.white, Mathf.Min(0.6f, share * 0.35f));
            if (!over && salt[i] > Hi(i)) col = Color.Lerp(col, new Color(0.9f, 0.6f, 0.6f), 0.5f);
            cellM[i].color = col;
        }
        handT.gameObject.SetActive(hand);
        if (hand) handT.position = field.W(handAt.x, handAt.y - 26f, -1.2f);
    }

    // ?oiyotest=1 prints the state to the browser console for the automated play check: the cabbage, its
    // clock, every patch (salt, target, low, high, screen x, y from the top-left), the rate and the mark.
    bool testLog; float testT;
    void TestTick(float dt)
    {
        if (!testLog || (testT -= dt) > 0f) return;
        testT = 0.02f;
        var sb = new System.Text.StringBuilder();
        for (int i = 0; i < N; i++)
        {
            if (i > 0) sb.Append(',');
            var c = Center(i);
            var sp = cam.WorldToScreenPoint(field.W(c.x, c.y, -0.2f));
            sb.Append('[').Append(salt[i].ToString("F4")).Append(',').Append(Target(i).ToString("F4")).Append(',').Append(Lo(i).ToString("F4")).Append(',').Append(Hi(i).ToString("F4")).Append(',').Append(sp.x.ToString("F1")).Append(',').Append((Screen.height - sp.y).ToString("F1")).Append(']');
        }
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"idx\":{idx},\"t\":{t:F3},\"time\":{st.time:F2},\"rate\":{st.rate:F3},\"hand\":{(hand ? "true" : "false")},\"cells\":[{sb}],\"good\":{good},\"need\":{st.need},\"cabbages\":{st.cabbages},\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.18f, 0.62f, 0.27f, 0.97f);
    static readonly Color Dark = new Color(0.2f, 0.14f, 0.09f, 0.88f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("Goal {0} patches", KimjangSaltStages.All[i].need);

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(0.85f, 1f, 0.8f), U("Kimjang Salt"),
                U("Hold and rub to salt the cabbage: lots on the thick stems, a little on the leaves. Bring every patch into the green."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        var bar = new Rect(8f, 8f, w - 16f, 64f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 12f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>  " + F("Cabbage {0}/{1}", Mathf.Min(idx + 1, st.cabbages), st.cabbages), 15, new Color(0.85f, 1f, 0.8f));
        OiyoArcade.Text(new Rect(20f, 36f, w - 90f, 24f), F("Well salted {0}/{1}", good, st.need), 16, Color.white);
        if (OiyoArcade.Button(new Rect(w - 60f, 14f, 44f, 44f), "<b>II</b>", OiyoScreens.Slate, 18))
        {
            if (state == GameState.Playing) { state = GameState.Paused; pressId = int.MinValue; hand = false; }
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (state == GameState.Playing || state == GameState.Ready)
        {
            // a bar on every patch: green band, and the salt so far (yellow short, white right, red too much)
            for (int i = 0; i < N; i++)
            {
                var c = Center(i);
                var top = OiyoArcade.ToGui(cam.WorldToScreenPoint(field.W(c.x + 20f, c.y - 22f, -0.6f)));
                var bot = OiyoArcade.ToGui(cam.WorldToScreenPoint(field.W(c.x + 20f, c.y + 22f, -0.6f)));
                float bh = Mathf.Max(10f, bot.y - top.y), scale = Hi(i) * 1.4f;
                System.Func<float, float> yOf = v => top.y + bh - Mathf.Min(1f, v / scale) * bh;
                OiyoArcade.Fill(new Rect(top.x - 3f, top.y, 7f, bh), new Color(0f, 0f, 0f, 0.45f));
                OiyoArcade.Fill(new Rect(top.x - 3f, yOf(Hi(i)), 7f, yOf(Lo(i)) - yOf(Hi(i))), new Color(0.25f, 0.75f, 0.34f, 0.9f));
                var mc = salt[i] > Hi(i) ? new Color(0.98f, 0.32f, 0.32f) : salt[i] >= Lo(i) ? Color.white : new Color(1f, 0.83f, 0.23f);
                OiyoArcade.Fill(new Rect(top.x - 5f, yOf(salt[i]) - 2f, 11f, 4f), mc);
            }
            if (keyActive && !hand)
            {
                var c = Center(keyRow * Cols + keyCol);
                var g = OiyoArcade.ToGui(cam.WorldToScreenPoint(field.W(c.x, c.y, -0.6f)));
                OiyoArcade.Fill(new Rect(g.x - 4f, g.y - 4f, 8f, 8f), Color.white);
            }
            // the cabbage's clock and the Done button
            OiyoArcade.Bar(new Rect(16f, h - 100f, w - 32f, 10f), Mathf.Max(0f, 1f - t / st.time), new Color(0f, 0f, 0f, 0.4f), new Color(0.11f, 0.49f, 0.84f));
            if (state == GameState.Playing && OiyoArcade.Button(new Rect(w * 0.5f - 80f, h - 80f, 160f, 52f), "<b>" + U("Done") + "</b>", Accent, 18))
            {
                Done(); Judged(); if (over) End();
            }
        }
        if (msgT > 0f) OiyoArcade.Shadowed(new Rect(8f, 80f, w - 16f, 36f), msg, 20, msgC, TextAnchor.MiddleCenter);
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap to start"), U("Lots on the stems, a little on the leaves."), 240f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            bool w0 = state == GameState.Victory;
            string detail = w0 ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : F("Well salted {0}/{1}", good, st.need);
            string body = $"<size=14>{F("{0} well salted · {1} raw · {2} too salty", good, raw, salty)}</size>";
            int r = OiyoScreens.Result(w, h, Dark, Accent, w0, ResultLive, w0 ? U("Ready for kimjang!") : U("Not enough patches salted well"), detail, body,
                w0 && stageIdx < StageCount - 1 ? U("Next stage") : null, w0 && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
