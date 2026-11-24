using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Cake Thief 3D: the web Cake Thief (src/components/games/CakeThief.tsx, src/lib/games/cake-thief.ts) rebuilt in
// Unity on a 360 × 660 px field (OiyoField). Three grids (animal × room, animal × thing, room × thing) take × and ●
// marks; the clues below pin everything down; the cream clue names the thief's thing. Pick who and where, then name
// the thief. Two wrong guesses and the thief gets away. The 30 cases, with their clues in six languages, are the web's
// own (CakeThiefStages.cs).
public class CakeThiefPlayer : MonoBehaviour
{
    const string Slug = "cake-thief";
    const int StageCount = 30;
    const int MaxWrong = 2;
    const float FW = 360f, FH = 660f, LabelW = 78f, HeadH = 80f;
    const int CluesPerPage = 8;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of cake-thief.ts) ----------------
    CakeThiefStages.Level st;
    int stageIdx, starsWon, wrong;
    int[][,] marks;
    float t;
    bool over, won;
    int N => st.n;

    int Mark(int grid, int a, int b)
    {
        if (over) return -1;
        marks[grid][a, b] = (marks[grid][a, b] + 1) % 3;
        return marks[grid][a, b];
    }

    // 0 nothing, 1 caught, 2 wrong
    int Accuse(int suspect, int room)
    {
        if (over) return 0;
        if (suspect == st.thief && room == st.room[st.thief]) { over = true; won = true; return 1; }
        wrong++;
        if (wrong >= MaxWrong) over = true;
        return 2;
    }

    int StarsFor()
    {
        if (!won) return 0;
        if (wrong == 0 && t <= st.par) return 3;
        if (wrong == 0) return 2;
        return 1;
    }

    // ---------------- Words ----------------
    int LangIdx { get { int i = System.Array.IndexOf(CakeThiefStages.Langs, OiyoArcade.Lang); return i < 0 ? 1 : i; } }
    string Lbl(int kind, int i) => st.labels[LangIdx][kind * N + i]; // kind 0 suspects, 1 rooms, 2 items

    // ---------------- Scene ----------------
    float Cell => Mathf.Min(36f, Mathf.Floor((FW - LabelW - 4f) / (2 * N)));
    Rect CellRect(int grid, int a, int b)
    {
        float s = Cell;
        float x = LabelW + (grid == 0 ? b : N + b) * s;
        float y = HeadH + (grid == 2 ? N + a : a) * s;
        return new Rect(x, y, s, s);
    }
    float GridBottom => HeadH + 2 * N * Cell;
    Rect SuspectBox(int i) => new Rect(8f + i * (344f / N), 548f, 344f / N - 6f, 30f);
    Rect RoomBox(int i) => new Rect(8f + i * (344f / N), 584f, 344f / N - 6f, 30f);
    static readonly Rect AccuseBox = new Rect(70f, 622f, 220f, 32f);
    static readonly Rect PrevBox = new Rect(250f, 512f, 44f, 28f);
    static readonly Rect NextBox = new Rect(304f, 512f, 44f, 28f);

    OiyoField field;
    Camera cam;
    Transform root, cursorMark;
    Transform[,,] cellObj;
    Transform[,,] markObj;
    Transform[] suspectObj, roomObj;
    Transform accusePlate;
    Material[] gridMat;
    Material xMat, oMat, plateMat, plateOn, accuseOn, accuseOff, cursorMat, paperMat, cakeMat, iceMat;
    Bursts sparkle;
    Synth synth;
    bool showStages;
    int who = -1, where = -1, page;
    Vector3Int cursor = new Vector3Int(-1, 0, 0);
    string flash; float flashT;

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(FW, FH, new Color(0.36f, 0.24f, 0.18f));
        cam = field.Cam;
        OiyoField.Lights(new Color(0.75f, 0.74f, 0.72f), 0.6f, 40f, -25f);
        sparkle = new Bursts(transform, 0.5f);
        synth = new Synth(gameObject);
        string[] gc = { "#ffe8cc", "#e7f5ff", "#ebfbee" };
        gridMat = new Material[3];
        for (int g = 0; g < 3; g++) { ColorUtility.TryParseHtmlString(gc[g], out var c); gridMat[g] = OiyoArcade.Glow(c); }
        xMat = OiyoField.Sprite("CK/x");
        oMat = OiyoField.Sprite("CK/o");
        paperMat = OiyoArcade.Glow(new Color(1f, 0.97f, 0.93f));
        plateMat = OiyoArcade.Lit(new Color(0.96f, 0.9f, 0.8f), 0.3f);
        plateOn = OiyoArcade.Lit(new Color(0.91f, 0.35f, 0.05f), 0.3f);
        accuseOn = OiyoArcade.Lit(new Color(0.79f, 0.16f, 0.16f), 0.4f);
        accuseOff = OiyoArcade.Lit(new Color(0.45f, 0.4f, 0.38f), 0.3f);
        cursorMat = OiyoArcade.Transparent(OiyoArcade.Solid(Color.white), new Color(0.1f, 0.44f, 0.76f, 0.45f));
        cakeMat = OiyoArcade.Lit(new Color(0.97f, 0.98f, 0.98f), 0.3f);
        iceMat = OiyoArcade.Lit(new Color(0.97f, 0.51f, 0.67f), 0.3f);
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int i, bool ready = true)
    {
        stageIdx = Mathf.Clamp(i, 0, StageCount - 1);
        StopAllCoroutines();
        st = CakeThiefStages.All[stageIdx];
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Case").transform;
        marks = new int[3][,];
        for (int g = 0; g < 3; g++) marks[g] = new int[N, N];
        t = 0f; wrong = 0; over = false; won = false; starsWon = 0;
        who = -1; where = -1; page = 0; flash = null;
        cursor = new Vector3Int(-1, 0, 0);
        showStages = false;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Animate(0f);
    }

    Transform Box(Material m, Rect r, float z, float depth)
    {
        var q = OiyoArcade.Prim(PrimitiveType.Cube, "Box", m, root).transform;
        q.position = field.W(r.center.x, r.center.y, z);
        q.localScale = new Vector3(OiyoField.U(r.width), OiyoField.U(r.height), depth);
        return q;
    }

    void BuildScene()
    {
        Box(paperMat, new Rect(2f, 2f, FW - 4f, FH - 4f), 0.3f, 0.1f);
        cellObj = new Transform[3, N, N];
        markObj = new Transform[3, N, N];
        for (int g = 0; g < 3; g++)
            for (int a = 0; a < N; a++)
                for (int b = 0; b < N; b++)
                {
                    var r = CellRect(g, a, b);
                    cellObj[g, a, b] = Box(gridMat[g], new Rect(r.x + 1f, r.y + 1f, r.width - 2f, r.height - 2f), 0.1f, 0.05f);
                    var q = OiyoField.Quad("Mark", xMat, root, r.width * 0.6f, r.height * 0.6f);
                    q.position = field.W(r.center.x, r.center.y, 0f);
                    q.gameObject.SetActive(false);
                    markObj[g, a, b] = q;
                }
        // the cake, a bite out of it, in the empty corner
        float cx = LabelW + N * Cell / 2f, cy = HeadH + N * Cell * 1.5f;
        Box(cakeMat, new Rect(cx - 30f, cy - 6f, 60f, 26f), -0.1f, 0.4f);
        Box(iceMat, new Rect(cx - 30f, cy - 12f, 60f, 8f), -0.1f, 0.42f);
        suspectObj = new Transform[N];
        roomObj = new Transform[N];
        for (int i = 0; i < N; i++)
        {
            suspectObj[i] = Box(plateMat, SuspectBox(i), -0.05f, 0.15f);
            roomObj[i] = Box(plateMat, RoomBox(i), -0.05f, 0.15f);
        }
        accusePlate = Box(accuseOff, AccuseBox, -0.05f, 0.2f);
        Box(plateMat, PrevBox, -0.05f, 0.12f);
        Box(plateMat, NextBox, -0.05f, 0.12f);
        cursorMark = Box(cursorMat, new Rect(0f, 0f, 10f, 10f), -0.05f, 0.02f);
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("cake-thief", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        if (state == GameState.Playing && !over) t += dt;
        if (flashT > 0f) flashT -= dt;
        Animate(dt);
    }

    void Tap(Vector2 f)
    {
        int n = N;
        float s = Cell;
        int col = Mathf.FloorToInt((f.x - LabelW) / s), row = Mathf.FloorToInt((f.y - HeadH) / s);
        if (col >= 0 && row >= 0 && col < 2 * n && row < 2 * n && !(row >= n && col < n))
        {
            int g = row < n ? (col < n ? 0 : 1) : 2;
            int a = row < n ? row : row - n, b = col < n ? col : col - n;
            cursor = new Vector3Int(g, a, b);
            int v = Mark(g, a, b);
            synth.Tone(v == 2 ? 784f : 523f, 0.05f, Wave.Triangle, 0.1f, 0f, 14f);
            return;
        }
        for (int i = 0; i < n; i++)
        {
            if (SuspectBox(i).Contains(f)) { who = i; synth.Tone(660f, 0.05f, Wave.Triangle, 0.1f, 0f, 14f); return; }
            if (RoomBox(i).Contains(f)) { where = i; synth.Tone(660f, 0.05f, Wave.Triangle, 0.1f, 0f, 14f); return; }
        }
        if (PrevBox.Contains(f)) { page = Mathf.Max(0, page - 1); return; }
        if (NextBox.Contains(f)) { page = Mathf.Min(Pages - 1, page + 1); return; }
        if (AccuseBox.Contains(f)) DoAccuse();
    }

    int Pages => Mathf.Max(1, Mathf.CeilToInt(st.clues[0].Length / (float)CluesPerPage));

    void DoAccuse()
    {
        if (who < 0 || where < 0 || over) return;
        int r = Accuse(who, where);
        if (r == 2) { flash = U("Not the thief!"); flashT = 1.2f; synth.Tone(180f, 0.2f, Wave.Square, 0.12f, 110f, 8f); }
        if (over) End();
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
                        if (state == GameState.Ready) { state = GameState.Playing; continue; }
                        Tap(f);
                        if (over) break;
                    }
                    if (state == GameState.Ready) { if (confirm || Input.GetKeyDown(KeyCode.Space)) state = GameState.Playing; return; }
                    // keyboard: arrows move over the sheet, Space marks, Enter names the thief
                    int n = N;
                    int row = cursor.x < 0 ? 0 : (cursor.x == 2 ? cursor.y + n : cursor.y);
                    int col = cursor.x < 0 ? 0 : (cursor.x == 0 ? cursor.z : cursor.z + n);
                    bool moved = false;
                    if (Input.GetKeyDown(KeyCode.LeftArrow)) { col = Mathf.Max(0, col - 1); moved = true; }
                    if (Input.GetKeyDown(KeyCode.RightArrow)) { col = Mathf.Min(2 * n - 1, col + 1); moved = true; }
                    if (Input.GetKeyDown(KeyCode.UpArrow)) { row = Mathf.Max(0, row - 1); moved = true; }
                    if (Input.GetKeyDown(KeyCode.DownArrow)) { row = Mathf.Min(2 * n - 1, row + 1); moved = true; }
                    if (moved)
                    {
                        if (row >= n && col < n) col = n;
                        cursor = new Vector3Int(row < n ? (col < n ? 0 : 1) : 2, row < n ? row : row - n, col < n ? col : col - n);
                    }
                    if (Input.GetKeyDown(KeyCode.Space) && cursor.x >= 0) Mark(cursor.x, cursor.y, cursor.z);
                    if (confirm) DoAccuse();
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
        field.Fit(80f, 10f, 0f);
        for (int g = 0; g < 3; g++)
            for (int a = 0; a < N; a++)
                for (int b = 0; b < N; b++)
                {
                    int v = marks[g][a, b];
                    var q = markObj[g, a, b];
                    q.gameObject.SetActive(v != 0);
                    if (v != 0) q.GetComponent<Renderer>().sharedMaterial = v == 1 ? xMat : oMat;
                }
        for (int i = 0; i < N; i++)
        {
            suspectObj[i].GetComponent<Renderer>().sharedMaterial = who == i ? plateOn : plateMat;
            roomObj[i].GetComponent<Renderer>().sharedMaterial = where == i ? plateOn : plateMat;
        }
        accusePlate.GetComponent<Renderer>().sharedMaterial = who >= 0 && where >= 0 && !over ? accuseOn : accuseOff;
        cursorMark.gameObject.SetActive(cursor.x >= 0 && !over);
        if (cursor.x >= 0)
        {
            var r = CellRect(cursor.x, cursor.y, cursor.z);
            cursorMark.position = field.W(r.center.x, r.center.y, -0.01f);
            cursorMark.localScale = new Vector3(OiyoField.U(r.width), OiyoField.U(r.height), 0.02f);
        }
    }

    // ?oiyotest=1 prints the state to the browser console for the automated play check: the clock, wrong guesses, and
    // the screen point (px from the top-left) of the next press: the thief's plate, the room's plate, then Name the thief.
    bool testLog; float testT;
    Vector2 Scr(Vector2 f) { var sp = cam.WorldToScreenPoint(field.W(f.x, f.y, -0.15f)); return new Vector2(sp.x, Screen.height - sp.y); }
    void TestTick(float dt)
    {
        if (!testLog || (testT -= dt) > 0f) return;
        testT = 0.05f;
        Vector2 at = who != st.thief ? SuspectBox(st.thief).center : where != st.room[st.thief] ? RoomBox(st.room[st.thief]).center : AccuseBox.center;
        var p = Scr(at);
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"t\":{t:F2},\"par\":{st.par},\"wrong\":{wrong},\"n\":{N},\"next\":[{p.x:F1},{p.y:F1}],\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.91f, 0.35f, 0.05f, 0.97f);
    static readonly Color Dark = new Color(0.1f, 0.11f, 0.12f, 0.9f);
    static readonly Color Ink = new Color(0.36f, 0.24f, 0.18f);

    Vector2 Gui(Vector2 f, float z = -0.2f) => OiyoArcade.ToGui(cam.WorldToScreenPoint(field.W(f.x, f.y, z)));
    float GuiPerField => field.ScreenPerField() / OiyoArcade.ComputeScale();
    void Label(Rect r, string s, float size, Color c, TextAnchor a = TextAnchor.MiddleCenter, bool bold = true)
    {
        var p = Gui(new Vector2(r.x, r.y)); var q = Gui(new Vector2(r.xMax, r.yMax));
        OiyoArcade.Text(new Rect(p.x, p.y, q.x - p.x, q.y - p.y), s, Mathf.Max(8, Mathf.RoundToInt(size * GuiPerField)), c, a, bold);
    }

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("{0} suspects", CakeThiefStages.All[i].n);

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(1f, 0.92f, 0.85f), U("Cake Thief"),
                U("Mark the grid from the clues: once for ×, twice for ●. Then pick who and where, and name the thief."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        int n = N;
        float s = Cell;
        // column labels on their side, row labels on the left
        for (int k = 0; k < 2 * n; k++)
        {
            string word = k < n ? Lbl(1, k) : Lbl(2, k - n);
            var bottom = Gui(new Vector2(LabelW + k * s + s / 2f, HeadH - 4f));
            var m = GUI.matrix;
            GUIUtility.RotateAroundPivot(-90f, bottom * OiyoArcade.Scale);
            OiyoArcade.Text(new Rect(bottom.x, bottom.y - 9f * GuiPerField, 74f * GuiPerField, 18f * GuiPerField), word, Mathf.Max(8, Mathf.RoundToInt(12f * GuiPerField)), Ink, TextAnchor.MiddleLeft, true);
            GUI.matrix = m;
        }
        for (int k = 0; k < 2 * n; k++)
            Label(new Rect(2f, HeadH + k * s, LabelW - 6f, s), k < n ? Lbl(0, k) : Lbl(1, k - n), 12f, Ink, TextAnchor.MiddleRight);
        // the cream clue and a page of clues
        float y0 = GridBottom + 8f;
        Label(new Rect(10f, y0, 340f, 30f), st.cream[LangIdx], 11f, new Color(0.79f, 0.16f, 0.16f), TextAnchor.MiddleLeft);
        var clues = st.clues[LangIdx];
        int from = page * CluesPerPage;
        float lineH = Mathf.Min(17f, (508f - (y0 + 34f)) / CluesPerPage);
        for (int k = from; k < Mathf.Min(clues.Length, from + CluesPerPage); k++)
            Label(new Rect(10f, y0 + 34f + (k - from) * lineH, 340f, lineH), $"{k + 1}. {clues[k]}", 10.5f, Ink, TextAnchor.MiddleLeft, false);
        Label(new Rect(10f, 512f, 220f, 28f), F("Clues {0}/{1}", page + 1, Pages), 11f, Ink, TextAnchor.MiddleLeft);
        Label(PrevBox, "<", 16f, Ink);
        Label(NextBox, ">", 16f, Ink);
        for (int i = 0; i < n; i++)
        {
            Label(SuspectBox(i), Lbl(0, i), 12f, who == i ? Color.white : Ink);
            Label(RoomBox(i), Lbl(1, i), 12f, where == i ? Color.white : Ink);
        }
        Label(AccuseBox, U("Name the thief"), 15f, Color.white);

        var bar = new Rect(8f, 8f, w - 16f, 64f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 12f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>  " + F("{0} guesses left", MaxWrong - wrong), 15, new Color(1f, 0.92f, 0.85f));
        OiyoArcade.Text(new Rect(20f, 36f, w - 90f, 24f), F("{0}s", Mathf.FloorToInt(t)) + $"   ★★★ <= {st.par}s", 14, Color.white);
        if (OiyoArcade.Button(new Rect(w - 60f, 14f, 44f, 44f), "<b>II</b>", OiyoScreens.Slate, 18))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (flash != null && flashT > 0f && state == GameState.Playing)
            OiyoArcade.Shadowed(new Rect(0f, 80f, w, 30f), flash, 18, new Color(1f, 0.42f, 0.42f), TextAnchor.MiddleCenter);
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap to start"), U("Tap squares to mark × and ●!"), 140f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            string detail = won ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : "";
            string body = won ? $"<size=14>{F("{0}s · {1} wrong guesses", Mathf.RoundToInt(t), wrong)}</size>" : $"<size=14>{F("Thief: {0}, {1}", Lbl(0, st.thief), Lbl(1, st.room[st.thief]))}</size>";
            int r = OiyoScreens.Result(w, h, Dark, Accent, won, ResultLive, won ? U("Thief caught!") : U("The thief got away"), detail, body,
                won && stageIdx < StageCount - 1 ? U("Next stage") : null, won && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
