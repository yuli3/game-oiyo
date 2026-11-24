using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Screw Jam 3D: the web Screw Jam (src/components/games/ScrewJam.tsx, src/lib/games/screw-jam.ts) rebuilt in Unity on
// the web's own 360 × 560 px field (OiyoField). Wooden plates lie screwed down on top of one another. A tap takes a
// screw out unless a higher plate covers it; it goes into a waiting box of its colour, or into the spare tray. A full
// box (three) leaves and the next one comes in; tray screws move into a box of their colour when one arrives. A plate
// with no screws left drops away. Empty the board before the tray overflows. The 30 boards are the web's own
// (ScrewJamStages.cs).
public class ScrewJamPlayer : MonoBehaviour
{
    const string Slug = "screw-jam";
    const int StageCount = 30;
    const int BoxSize = 3, ActiveBoxes = 2;
    static readonly string[] Colours = { "#e03131", "#1971c2", "#2f9e44", "#f08c00", "#7048e8", "#0c8599", "#d6336c" };
    static readonly string[] PlateColours = { "#d9b38c", "#c9a27a", "#e0c097", "#b88a5c", "#d4a373", "#c19a6b" };

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of screw-jam.ts) ----------------
    ScrewJamStages.Level st;
    int stageIdx, starsWon, moves, nextBox, most;
    bool[] outs, fallen;
    int[] boxColour, boxFilled; // the waiting boxes (colour −1 = none)
    readonly List<int> tray = new List<int>();
    bool over, won;

    int Plates => st.plates.Length / 5;
    int Screws => st.screws.Length / 4;
    float PX_(int k) => st.plates[k * 5];
    float PY(int k) => st.plates[k * 5 + 1];
    float PW(int k) => st.plates[k * 5 + 2];
    float PH(int k) => st.plates[k * 5 + 3];
    float Layer(int k) => st.plates[k * 5 + 4];
    float SX(int i) => st.screws[i * 4];
    float SY(int i) => st.screws[i * 4 + 1];
    int SPlate(int i) => (int)st.screws[i * 4 + 2];
    int SColour(int i) => (int)st.screws[i * 4 + 3];

    bool Covers(int k, int i) => SX(i) > PX_(k) - 4f && SX(i) < PX_(k) + PW(k) + 4f && SY(i) > PY(k) - 4f && SY(i) < PY(k) + PH(k) + 4f;

    bool Blocked(int i)
    {
        int own = SPlate(i);
        for (int k = 0; k < Plates; k++) if (!fallen[k] && k != own && Layer(k) > Layer(own) && Covers(k, i)) return true;
        return false;
    }

    bool Free(int i) => !outs[i] && !Blocked(i);

    void TakeBox(int slot)
    {
        if (nextBox >= st.boxes.Length) { boxColour[slot] = -1; boxFilled[slot] = 0; return; }
        boxColour[slot] = st.boxes[nextBox++];
        boxFilled[slot] = 0;
    }

    void Settle()
    {
        bool moved = true;
        while (moved)
        {
            moved = false;
            for (int k = 0; k < ActiveBoxes; k++)
            {
                if (boxColour[k] < 0) continue;
                int t = tray.IndexOf(boxColour[k]);
                if (t >= 0 && boxFilled[k] < BoxSize) { tray.RemoveAt(t); boxFilled[k]++; moved = true; }
                if (boxFilled[k] >= BoxSize) { TakeBox(k); moved = true; }
            }
        }
    }

    // 0 nothing, 1 boxed, 2 tray, 3 stuck
    int Unscrew(int i)
    {
        if (over || i < 0 || i >= Screws || outs[i]) return 0;
        if (Blocked(i)) return 3;
        outs[i] = true;
        moves++;
        int result = 2;
        int c = SColour(i);
        for (int k = 0; k < ActiveBoxes; k++)
            if (boxColour[k] == c && boxFilled[k] < BoxSize) { boxFilled[k]++; result = 1; break; }
        if (result == 2) { tray.Add(c); most = Mathf.Max(most, tray.Count); }
        int p = SPlate(i);
        bool empty = true;
        for (int k = 0; k < Screws; k++) if (SPlate(k) == p && !outs[k]) empty = false;
        if (empty) { fallen[p] = true; fallT[p] = 0.001f; }
        Settle();
        bool all = true, anyFree = false;
        for (int k = 0; k < Screws; k++) { if (!outs[k]) all = false; if (Free(k)) anyFree = true; }
        if (all && tray.Count == 0) { over = true; won = true; }
        else if (tray.Count > st.tray) over = true;
        else if (!anyFree) over = true;
        return result;
    }

    int StarsFor()
    {
        if (!won) return 0;
        if (most <= st.best) return 3;
        if (most <= st.best + 1) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    OiyoField field;
    Camera cam;
    Transform root, cursorMark;
    Transform[] plateObj, screwObj;
    float[] fallT;
    float[] shake;
    Transform[] boxObj, boxDots, nextObj, trayObj;
    Material[] colourMat, colourDim, plateMat;
    Color[] colourOf;
    Material boardMat, slotMat, emptyMat, shadowMat, cursorMat;
    Bursts sparkle;
    Synth synth;
    bool showStages;
    int cursor = -1;
    string pop; float popT;

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(360f, 560f, new Color(0.2f, 0.23f, 0.25f));
        cam = field.Cam;
        OiyoField.Lights(new Color(0.8f, 0.8f, 0.82f), 0.75f, 40f, -25f);
        sparkle = new Bursts(transform, 0.5f);
        synth = new Synth(gameObject);
        var head = OiyoArcade.Art("SJ/screw");
        var wood = OiyoArcade.Art("SJ/wood", true);
        colourMat = new Material[Colours.Length];
        colourDim = new Material[Colours.Length];
        colourOf = new Color[Colours.Length];
        for (int i = 0; i < Colours.Length; i++)
        {
            ColorUtility.TryParseHtmlString(Colours[i], out var c);
            colourOf[i] = c;
            colourMat[i] = OiyoArcade.Transparent(head, c);
            colourDim[i] = OiyoArcade.Transparent(head, Color.Lerp(c, Color.black, 0.45f));
        }
        plateMat = new Material[PlateColours.Length];
        for (int i = 0; i < PlateColours.Length; i++)
        {
            ColorUtility.TryParseHtmlString(PlateColours[i], out var c);
            c.a = 0.9f;
            plateMat[i] = OiyoArcade.Transparent(wood, c);
        }
        boardMat = OiyoArcade.Lit(new Color(0.27f, 0.3f, 0.33f), 0.2f);
        slotMat = OiyoArcade.Lit(new Color(0.13f, 0.15f, 0.16f), 0.2f);
        emptyMat = OiyoArcade.Transparent(OiyoArcade.Solid(Color.white), new Color(1f, 1f, 1f, 0.14f));
        shadowMat = OiyoArcade.Transparent(OiyoArcade.Solid(Color.white), new Color(0f, 0f, 0f, 0.28f));
        cursorMat = OiyoArcade.Transparent(OiyoArcade.Solid(Color.white), new Color(1f, 0.83f, 0.23f, 0.6f));
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int i, bool ready = true)
    {
        stageIdx = Mathf.Clamp(i, 0, StageCount - 1);
        StopAllCoroutines();
        st = ScrewJamStages.All[stageIdx];
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Bench").transform;
        outs = new bool[Screws];
        fallen = new bool[Plates];
        fallT = new float[Plates];
        shake = new float[Screws];
        boxColour = new int[ActiveBoxes];
        boxFilled = new int[ActiveBoxes];
        tray.Clear();
        nextBox = 0; most = 0; moves = 0; over = false; won = false;
        for (int k = 0; k < ActiveBoxes; k++) TakeBox(k);
        starsWon = 0;
        cursor = -1;
        pop = null;
        showStages = false;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Animate(0f);
    }

    Transform Box(Material m, float x, float y, float w, float h, float z, float depth)
    {
        var q = OiyoArcade.Prim(PrimitiveType.Cube, "Box", m, root).transform;
        q.position = field.W(x, y, z);
        q.localScale = new Vector3(OiyoField.U(w), OiyoField.U(h), depth);
        return q;
    }

    Transform Flat(Material m, float x, float y, float w, float h, float z)
    {
        var q = OiyoField.Quad("Flat", m, root, w, h);
        q.position = field.W(x, y, z);
        return q;
    }

    float PlateZ(int k) => -0.2f - Layer(k) * 0.14f;

    void BuildScene()
    {
        Box(boardMat, 180f, 280f, 352f, 360f, 0.3f, 0.3f);
        plateObj = new Transform[Plates];
        for (int k = 0; k < Plates; k++)
        {
            var p = new GameObject("Plate").transform;
            p.SetParent(root, false);
            var sh = OiyoField.Quad("Shadow", shadowMat, p, PW(k), PH(k));
            sh.localPosition = new Vector3(OiyoField.U(4f), OiyoField.U(-5f), 0.02f);
            var top = OiyoField.Quad("Wood", plateMat[k % plateMat.Length], p, PW(k), PH(k));
            top.localPosition = Vector3.zero;
            p.position = field.W(PX_(k) + PW(k) / 2f, PY(k) + PH(k) / 2f, PlateZ(k));
            plateObj[k] = p;
        }
        screwObj = new Transform[Screws];
        for (int i = 0; i < Screws; i++)
        {
            var q = OiyoField.Quad("Screw", colourMat[SColour(i)], root, 22f, 22f);
            q.position = field.W(SX(i), SY(i), PlateZ(SPlate(i)) - 0.05f);
            screwObj[i] = q;
        }
        boxObj = new Transform[ActiveBoxes];
        boxDots = new Transform[ActiveBoxes * BoxSize];
        for (int k = 0; k < ActiveBoxes; k++)
        {
            float x = 100f + k * 160f;
            Box(slotMat, x, 42f, 140f, 56f, 0.1f, 0.2f);
            boxObj[k] = Box(boardMat, x, 42f, 130f, 46f, -0.05f, 0.12f);
            for (int j = 0; j < BoxSize; j++) boxDots[k * BoxSize + j] = Flat(emptyMat, x - 40f + j * 40f, 42f, 22f, 22f, -0.2f);
        }
        nextObj = new Transform[4];
        for (int k = 0; k < 4; k++) nextObj[k] = Flat(emptyMat, 144f + k * 24f, 82f, 18f, 10f, -0.1f);
        Box(slotMat, 180f, 500f, 320f, 60f, 0.1f, 0.2f);
        trayObj = new Transform[st.tray];
        for (int k = 0; k < st.tray; k++) trayObj[k] = Flat(emptyMat, 20f + (k + 0.5f) * (320f / st.tray), 500f, 28f, 28f, -0.1f);
        cursorMark = Flat(cursorMat, 0f, 0f, 30f, 30f, -3f);
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("screw-jam", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        if (popT > 0f) popT -= dt;
        Animate(dt);
    }

    void DoTap(int i)
    {
        int fallenBefore = 0;
        foreach (bool f in fallen) if (f) fallenBefore++;
        int r = Unscrew(i);
        if (r == 0) return;
        if (r == 3)
        {
            shake[i] = 0.35f;
            pop = U("A plate is over it"); popT = 0.9f;
            synth.Tone(180f, 0.12f, Wave.Square, 0.12f, 120f, 10f);
            return;
        }
        sparkle.Emit(field.W(SX(i), SY(i), -2f), colourOf[SColour(i)], 8, 3f, 0.08f, 0.5f);
        synth.Tone(r == 1 ? 880f : 523f, 0.06f, Wave.Triangle, 0.12f, 0f, 14f);
        int fallenNow = 0;
        foreach (bool f in fallen) if (f) fallenNow++;
        if (fallenNow > fallenBefore) synth.Tone(330f, 0.2f, Wave.Sine, 0.15f, 160f, 6f);
        if (over) End();
    }

    int ScrewAt(Vector2 f)
    {
        int best = -1; float bestLayer = -1f;
        for (int i = 0; i < Screws; i++)
        {
            if (outs[i] || Vector2.Distance(new Vector2(SX(i), SY(i)), f) > 18f) continue;
            float layer = Layer(SPlate(i)) + (Blocked(i) ? 0f : 100f);
            if (layer > bestLayer) { best = i; bestLayer = layer; }
        }
        return best;
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
                        if (state == GameState.Ready) { state = GameState.Playing; }
                        int i = ScrewAt(f);
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
                        for (int i = 0; i < Screws; i++) if (!outs[i]) left.Add(i);
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
            OiyoArcade.Record(Slug, stageIdx, starsWon, Mathf.Max(0, 100 - most * 10), StageCount);
            sparkle.Emit(field.W(180f, 280f, -2f), new Color(1f, 0.85f, 0.25f), 40, 5f, 0.1f, 1f);
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
        field.Fit(80f, 10f, 0f);
        for (int k = 0; k < Plates; k++)
        {
            if (!fallen[k]) continue;
            fallT[k] += dt;
            var p = plateObj[k];
            p.position = field.W(PX_(k) + PW(k) / 2f, PY(k) + PH(k) / 2f + fallT[k] * fallT[k] * 1400f, PlateZ(k));
            p.localRotation = Quaternion.Euler(0f, 0f, fallT[k] * 40f);
            if (fallT[k] > 0.6f) p.gameObject.SetActive(false);
        }
        for (int i = 0; i < Screws; i++)
        {
            screwObj[i].gameObject.SetActive(!outs[i]);
            if (outs[i]) continue;
            if (shake[i] > 0f) shake[i] -= dt;
            float jig = shake[i] > 0f ? Mathf.Sin(Time.time * 40f) * 3f : 0f;
            screwObj[i].position = field.W(SX(i) + jig, SY(i), PlateZ(SPlate(i)) - 0.05f);
            screwObj[i].GetComponent<Renderer>().sharedMaterial = Blocked(i) ? colourDim[SColour(i)] : colourMat[SColour(i)];
        }
        for (int k = 0; k < ActiveBoxes; k++)
        {
            bool has = boxColour[k] >= 0;
            boxObj[k].GetComponent<Renderer>().sharedMaterial = has ? OiyoBoxMat(boxColour[k]) : boardMat;
            for (int j = 0; j < BoxSize; j++)
            {
                boxDots[k * BoxSize + j].gameObject.SetActive(has);
                boxDots[k * BoxSize + j].GetComponent<Renderer>().sharedMaterial = j < boxFilled[k] ? colourMat[boxColour[k] < 0 ? 0 : boxColour[k]] : emptyMat;
            }
        }
        for (int k = 0; k < 4; k++)
        {
            int idx = nextBox + k;
            nextObj[k].gameObject.SetActive(idx < st.boxes.Length);
            if (idx < st.boxes.Length) nextObj[k].GetComponent<Renderer>().sharedMaterial = OiyoBoxMat(st.boxes[idx]);
        }
        for (int k = 0; k < st.tray; k++) trayObj[k].GetComponent<Renderer>().sharedMaterial = k < tray.Count ? colourMat[tray[k]] : emptyMat;
        cursorMark.gameObject.SetActive(cursor >= 0 && cursor < Screws && !outs[cursor] && !over);
        if (cursor >= 0 && cursor < Screws) cursorMark.position = field.W(SX(cursor), SY(cursor), PlateZ(SPlate(cursor)) - 0.03f);
    }

    readonly Dictionary<int, Material> boxMats = new Dictionary<int, Material>();
    Material OiyoBoxMat(int c)
    {
        if (!boxMats.TryGetValue(c, out var m))
        {
            ColorUtility.TryParseHtmlString(Colours[c], out var col);
            m = OiyoArcade.Lit(col, 0.3f);
            boxMats[c] = m;
        }
        return m;
    }

    // ?oiyotest=1 prints the state to the browser console for the automated play check: the clock, the tray, and the
    // screen point (px from the top-left) of the next screw in a full answer.
    bool testLog; float testT;
    Vector2 Scr(float x, float y, float z) { var sp = cam.WorldToScreenPoint(field.W(x, y, z)); return new Vector2(sp.x, Screen.height - sp.y); }
    void TestTick(float dt)
    {
        if (!testLog || (testT -= dt) > 0f) return;
        testT = 0.05f;
        string next = "null";
        if (moves < st.answer.Length)
        {
            int i = st.answer[moves];
            var p = Scr(SX(i), SY(i), PlateZ(SPlate(i)) - 0.05f);
            next = $"[{i},{p.x:F1},{p.y:F1}]";
        }
        int left = 0;
        foreach (bool o in outs) if (!o) left++;
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"moves\":{moves},\"left\":{left},\"tray\":{tray.Count},\"most\":{most},\"best\":{st.best},\"next\":{next},\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.94f, 0.55f, 0f, 0.97f);
    static readonly Color Dark = new Color(0.1f, 0.11f, 0.12f, 0.9f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("{0} screws", ScrewJamStages.All[i].screws.Length / 4);

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(1f, 0.92f, 0.8f), U("Screw Jam"),
                U("Take out screws no plate covers. Each goes into a box of its colour, or the spare tray. Empty the board before the tray overflows."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        int left = 0;
        foreach (bool o in outs) if (!o) left++;
        var bar = new Rect(8f, 8f, w - 16f, 64f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 12f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>  " + F("{0} screws left", left), 15, new Color(1f, 0.92f, 0.8f));
        OiyoArcade.Text(new Rect(20f, 36f, w - 90f, 24f), F("Tray {0}/{1}", tray.Count, st.tray) + $"   ★★★ <= {st.best}", 14, Color.white);
        if (OiyoArcade.Button(new Rect(w - 60f, 14f, 44f, 44f), "<b>II</b>", OiyoScreens.Slate, 18))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (pop != null && popT > 0f && state == GameState.Playing)
            OiyoArcade.Shadowed(new Rect(0f, 84f, w, 30f), pop, 18, new Color(1f, 0.6f, 0.3f), TextAnchor.MiddleCenter);
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap to start"), U("Tap a screw with no plate over it to take it out!"), 140f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            string detail = won ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : "";
            string body = $"<size=14>{F("Most screws in the tray at once: {0}", most)}</size>";
            int r = OiyoScreens.Result(w, h, Dark, Accent, won, ResultLive, won ? U("Every screw is out!") : U("The tray is full"), detail, body,
                won && stageIdx < StageCount - 1 ? U("Next stage") : null, won && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
