using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Palm Village 3D: the web Palm Village (src/components/games/PalmVillage.tsx, src/lib/games/palm-village.ts) rebuilt
// in Unity on the web's own 360 × 560 px field (OiyoField). The island is cols × rows squares fitted into 330 px from
// y = 90; pieces come in the stage's order and go on any bare land. Cosy points: a house 1 per tree beside it (up to 2),
// +2 with a well in the eight squares round it, +1 with a lantern beside it; a field 1 per house beside it (up to 3);
// a tree 1 at the water's edge or the rim; a well 1 per house round it (up to 4); a lantern 1 per house beside it (up to
// 2). There is no failing: the last piece finishes the village, with stars at the stage's marks. The 30 islands are
// the web's own (PalmVillageStages.cs).
public class PalmVillagePlayer : MonoBehaviour
{
    const string Slug = "palm-village";
    const int StageCount = 30;
    const float GridTop = 90f, Grid = 330f;
    static readonly Rect UndoRect = new Rect(250f, 470f, 100f, 60f);
    static readonly string[] PieceName = { "House", "Tree", "Well", "Field", "Lantern" };
    static readonly int[][] N4 = { new[] { 0, -1 }, new[] { 1, 0 }, new[] { 0, 1 }, new[] { -1, 0 } };
    static readonly int[][] N8 = { new[] { -1, -1 }, new[] { 0, -1 }, new[] { 1, -1 }, new[] { 1, 0 }, new[] { 1, 1 }, new[] { 0, 1 }, new[] { -1, 1 }, new[] { -1, 0 } };

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of palm-village.ts) ----------------
    PalmVillageStages.Level st;
    int stageIdx, starsWon, next;
    int[] placed; // −1 empty, else the piece
    readonly List<int> history = new List<int>();
    bool over;

    int Cells => st.cols * st.rows;
    bool CanPlace(int c) => !over && c >= 0 && c < Cells && st.ground[c] == 0 && placed[c] < 0;

    List<int> Around(int cell, int[][] ns)
    {
        int c = cell % st.cols, r = cell / st.cols;
        var outp = new List<int>();
        foreach (var n in ns) { int x = c + n[0], y = r + n[1]; if (x >= 0 && y >= 0 && x < st.cols && y < st.rows) outp.Add(y * st.cols + x); }
        return outp;
    }

    int Count(List<int> cells, int k) { int n = 0; foreach (int i in cells) if (placed[i] == k) n++; return n; }

    int PieceScore(int cell)
    {
        int p = placed[cell];
        if (p < 0) return 0;
        var n4 = Around(cell, N4); var n8 = Around(cell, N8);
        switch (p)
        {
            case 0: return Mathf.Min(2, Count(n4, 1)) + (Count(n8, 2) > 0 ? 2 : 0) + (Count(n4, 4) > 0 ? 1 : 0);
            case 3: return Mathf.Min(3, Count(n4, 0));
            case 1: { bool water = n4.Count < 4; foreach (int i in n4) if (st.ground[i] == 1) water = true; return water ? 1 : 0; }
            case 2: return Mathf.Min(4, Count(n8, 0));
            default: return Mathf.Min(2, Count(n4, 0));
        }
    }

    int Score() { int s = 0; for (int i = 0; i < Cells; i++) s += PieceScore(i); return s; }

    void NewVillage() { placed = new int[Cells]; for (int i = 0; i < Cells; i++) placed[i] = -1; next = 0; history.Clear(); over = false; }

    bool Place(int cell)
    {
        if (!CanPlace(cell) || next >= st.pieces.Length) return false;
        placed[cell] = st.pieces[next]; next++; history.Add(cell);
        if (next >= st.pieces.Length) over = true;
        return true;
    }

    bool Undo()
    {
        if (over || history.Count == 0) return false;
        int cell = history[history.Count - 1];
        history.RemoveAt(history.Count - 1);
        placed[cell] = -1; next--;
        return true;
    }

    int StarsFor()
    {
        if (!over) return 0;
        int s = Score();
        if (s >= st.great) return 3;
        if (s >= st.good) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    OiyoField field;
    Camera cam;
    Transform root, cursorBox;
    GameObject[] pieceObj;
    readonly List<GameObject> queueObj = new List<GameObject>();
    Material sandMat, grassA, grassB, rockMat, stripMat, slotMat, slotNow, undoMat, cursorMat;
    readonly Material[] pieceMat = new Material[5];
    Bursts petals;
    Synth synth;
    bool showStages;
    int cursor = -1;

    float CellSize => Mathf.Floor(Grid / Mathf.Max(st.cols, st.rows));
    float X0 => Mathf.Floor((360f - CellSize * st.cols) / 2f);
    float Y0 => GridTop + Mathf.Floor((Grid - CellSize * st.rows) / 2f);
    Vector2 Centre(int i) => new Vector2(X0 + (i % st.cols + 0.5f) * CellSize, Y0 + (i / st.cols + 0.5f) * CellSize);

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(360f, 560f, new Color(0.45f, 0.75f, 0.99f));
        cam = field.Cam;
        OiyoField.Lights(new Color(0.75f, 0.78f, 0.8f), 0.8f, 45f, -30f);
        petals = new Bursts(transform, 0.3f);
        synth = new Synth(gameObject);
        var grass = OiyoArcade.Art("PV/grass", true);
        sandMat = OiyoArcade.Lit(new Color(0.91f, 0.85f, 0.65f), 0.2f);
        grassA = OiyoArcade.Lit(new Color(0.55f, 0.91f, 0.6f), 0.2f, grass);
        grassB = OiyoArcade.Lit(new Color(0.7f, 0.95f, 0.73f), 0.2f, grass);
        rockMat = OiyoArcade.Lit(new Color(0.53f, 0.56f, 0.59f), 0.3f);
        stripMat = OiyoArcade.Lit(new Color(0.97f, 0.97f, 0.98f), 0.2f);
        slotMat = OiyoArcade.Lit(new Color(0.85f, 0.88f, 0.9f), 0.2f);
        slotNow = OiyoArcade.Lit(new Color(1f, 0.88f, 0.4f), 0.3f);
        undoMat = OiyoArcade.Lit(new Color(0.11f, 0.24f, 0.35f), 0.3f);
        cursorMat = OiyoArcade.Transparent(OiyoArcade.Solid(Color.white), new Color(1f, 1f, 1f, 0.4f));
        string[] art = { "PV/house", "PV/tree", "PV/well", "PV/field", "PV/lantern" };
        for (int i = 0; i < 5; i++) pieceMat[i] = OiyoField.Sprite(art[i]);
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int i, bool ready = true)
    {
        stageIdx = Mathf.Clamp(i, 0, StageCount - 1);
        StopAllCoroutines();
        st = PalmVillageStages.All[stageIdx];
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Island").transform;
        NewVillage();
        starsWon = 0;
        cursor = -1;
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

    void BuildScene()
    {
        float cs = CellSize;
        for (int i = 0; i < Cells; i++)
        {
            if (st.ground[i] == 1) continue;
            var c = Centre(i);
            Box(sandMat, c.x, c.y + 3f, cs, cs, 0.15f, 0.5f);
            Box(st.ground[i] == 2 ? rockMat : ((i + i / st.cols) % 2 == 0 ? grassB : grassA), c.x, c.y, cs - 1f, cs - 3f, 0f, 0.3f);
            if (st.ground[i] == 2) Box(rockMat, c.x, c.y, cs * 0.5f, cs * 0.4f, -0.3f, 0.4f);
        }
        pieceObj = new GameObject[Cells];
        Box(stripMat, 180f, 500f, 340f, 90f, 0.2f, 0.1f);
        Box(undoMat, UndoRect.center.x, UndoRect.center.y, UndoRect.width, UndoRect.height, -0.1f, 0.3f);
        cursorBox = Box(cursorMat, 0f, 0f, cs - 4f, cs - 4f, -0.25f, 0.05f);
        ShowQueue();
    }

    void ShowPiece(int i)
    {
        if (pieceObj[i] != null) Destroy(pieceObj[i]);
        if (placed[i] < 0) return;
        var q = OiyoField.Quad("Piece", pieceMat[placed[i]], root, CellSize * 0.8f, CellSize * 0.8f);
        var c = Centre(i);
        q.position = field.W(c.x, c.y, -0.4f);
        pieceObj[i] = q.gameObject;
    }

    void ShowQueue()
    {
        foreach (var o in queueObj) Destroy(o);
        queueObj.Clear();
        for (int k = 0; k < 3; k++)
        {
            if (next + k >= st.pieces.Length) break;
            float x = 50f + k * 70f;
            queueObj.Add(Box(k == 0 ? slotNow : slotMat, x, 505f, 56f, 56f, 0.05f, 0.1f).gameObject);
            var q = OiyoField.Quad("Next", pieceMat[st.pieces[next + k]], root, k == 0 ? 46f : 38f, k == 0 ? 46f : 38f);
            q.position = field.W(x, 505f, -0.2f);
            queueObj.Add(q.gameObject);
        }
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("palm-village", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        if (state == GameState.Playing && over) End();
        Animate(dt);
    }

    void DoPlace(int cell)
    {
        int before = Score();
        if (!Place(cell)) return;
        int gain = Score() - before;
        for (int i = 0; i < Cells; i++) if (placed[i] >= 0 && pieceObj[i] == null) ShowPiece(i);
        ShowQueue();
        var c = Centre(cell);
        petals.Emit(field.W(c.x, c.y, -0.6f), gain > 0 ? new Color(1f, 0.53f, 0.53f) : new Color(0.85f, 0.76f, 0.65f), gain > 0 ? 6 + gain * 3 : 4, 2f, 0.05f, 0.6f);
        synth.Tone(gain >= 3 ? 1046f : gain > 0 ? 784f : 523f, 0.1f, Wave.Triangle, 0.14f, 0f, 8f);
    }

    void DoUndo()
    {
        if (!Undo()) return;
        for (int i = 0; i < Cells; i++) if (placed[i] < 0 && pieceObj[i] != null) { Destroy(pieceObj[i]); pieceObj[i] = null; }
        ShowQueue();
        synth.Tone(392f, 0.06f, Wave.Triangle, 0.1f, 0f, 12f);
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
                    // taps are read once per frame: bare land takes the next piece, the plate takes one back
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (OiyoArcade.OverUi(b.pos) || !field.ToField(b.pos, out Vector2 f)) continue;
                        if (state == GameState.Ready) state = GameState.Playing;
                        if (UndoRect.Contains(f)) { DoUndo(); continue; }
                        int col = Mathf.FloorToInt((f.x - X0) / CellSize), row = Mathf.FloorToInt((f.y - Y0) / CellSize);
                        if (col < 0 || row < 0 || col >= st.cols || row >= st.rows) continue;
                        cursor = row * st.cols + col;
                        DoPlace(cursor);
                        if (over) break;
                    }
                    int dx = Input.GetKeyDown(KeyCode.RightArrow) ? 1 : Input.GetKeyDown(KeyCode.LeftArrow) ? -1 : 0;
                    int dy = Input.GetKeyDown(KeyCode.DownArrow) ? 1 : Input.GetKeyDown(KeyCode.UpArrow) ? -1 : 0;
                    if (dx != 0 || dy != 0)
                    {
                        if (state == GameState.Ready) state = GameState.Playing;
                        int cur = cursor < 0 ? (st.rows / 2) * st.cols + st.cols / 2 : cursor;
                        cursor = Mathf.Clamp(cur / st.cols + dy, 0, st.rows - 1) * st.cols + Mathf.Clamp(cur % st.cols + dx, 0, st.cols - 1);
                    }
                    if (Input.GetKeyDown(KeyCode.Space)) { if (state == GameState.Ready) state = GameState.Playing; else if (cursor >= 0) DoPlace(cursor); }
                    if (Input.GetKeyDown(KeyCode.Z)) DoUndo();
                    if (state == GameState.Ready && confirm) state = GameState.Playing;
                    return;
                }
            case GameState.Paused:
                if (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P)) state = GameState.Playing;
                return;
            case GameState.Victory:
            case GameState.GameOver:
                if (confirm && ResultLive) LoadStage(Mathf.Min(stageIdx + 1, StageCount - 1));
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
        // no village fails: every finished village is a win
        starsWon = StarsFor();
        state = GameState.Victory;
        OiyoArcade.Record(Slug, stageIdx, starsWon, Score(), StageCount);
        petals.Emit(field.W(180f, 250f, -0.8f), new Color(1f, 0.85f, 0.3f), 30, 4f, 0.1f, 1f);
        StartCoroutine(Arp(new[] { 523f, 659f, 784f, 1047f, 1319f }, 0.09f));
    }

    IEnumerator Arp(float[] fs, float gap)
    {
        foreach (var f in fs) { synth.Tone(f, 0.18f, Wave.Triangle, 0.22f, 0f, 6f); yield return new WaitForSeconds(gap); }
    }

    void Animate(float dt)
    {
        if (root == null) return;
        field.Fit(80f, 10f, 0f);
        cursorBox.gameObject.SetActive(cursor >= 0 && !over);
        if (cursor >= 0) { var c = Centre(cursor); cursorBox.position = field.W(c.x, c.y, -0.25f); }
        for (int i = 0; i < Cells; i++)
            if (pieceObj[i] != null) pieceObj[i].transform.localScale = new Vector3(OiyoField.U(CellSize * 0.8f), OiyoField.U(CellSize * 0.8f) * (1f + Mathf.Sin(Time.time * 2f + i) * 0.03f), 1f);
    }

    // ---------------- Test hints (the web's greedy builder, for the automated play check) ----------------
    float Gain(int cell, int p)
    {
        int before = Score();
        placed[cell] = p;
        int after = Score();
        placed[cell] = -1;
        int free4 = 0, free8 = 0;
        foreach (int i in Around(cell, N4)) if (st.ground[i] == 0 && placed[i] < 0) free4++;
        foreach (int i in Around(cell, N8)) if (st.ground[i] == 0 && placed[i] < 0) free8++;
        float room = p == 0 ? free4 * 0.35f : p == 2 ? free8 * 0.12f : 0f;
        return after - before + room;
    }

    int Hint()
    {
        if (over || next >= st.pieces.Length) return -1;
        int best = -1; float bestG = float.NegativeInfinity;
        for (int i = 0; i < Cells; i++) { if (!CanPlace(i)) continue; float g = Gain(i, st.pieces[next]); if (g > bestG) { bestG = g; best = i; } }
        return best;
    }

    // ?oiyotest=1 prints the state to the browser console for the automated play check: pieces placed, the cosy score
    // and marks, the greedy builder's next cell and its screen point (px from the top-left).
    bool testLog; float testT;
    Vector2 Scr(Vector2 f) { var sp = cam.WorldToScreenPoint(field.W(f.x, f.y, -0.3f)); return new Vector2(sp.x, Screen.height - sp.y); }
    void TestTick(float dt)
    {
        if (!testLog || (testT -= dt) > 0f) return;
        testT = 0.05f;
        int h = Hint();
        var hp = h >= 0 ? Scr(Centre(h)) : Vector2.zero;
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"next\":{next},\"pieces\":{st.pieces.Length},\"score\":{Score()},\"good\":{st.good},\"great\":{st.great},\"stars\":{starsWon},\"hint\":{h},\"at\":[{hp.x:F1},{hp.y:F1}],\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.18f, 0.62f, 0.27f, 0.97f);
    static readonly Color Dark = new Color(0.07f, 0.2f, 0.3f, 0.88f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + $" · ★★ {PalmVillageStages.All[i].good} · ★★★ {PalmVillageStages.All[i].great}";

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(0.95f, 1f, 0.95f), U("Palm Village"),
                U("Set each piece the boat brings on any bare land. You can't fail: the cosier the village, the more stars."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        var bar = new Rect(8f, 8f, w - 16f, 64f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 12f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>  " + F("Cosy {0}", Score()) + $"   {next}/{st.pieces.Length}", 15, new Color(0.95f, 1f, 0.95f));
        OiyoArcade.Text(new Rect(20f, 36f, w - 90f, 24f), $"★★ {st.good} · ★★★ {st.great}" + (next < st.pieces.Length ? "   " + F("Next: {0}", U(PieceName[st.pieces[next]])) : ""), 14, Color.white);
        if (OiyoArcade.Button(new Rect(w - 60f, 14f, 44f, 44f), "<b>II</b>", OiyoScreens.Slate, 18))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (state == GameState.Playing || state == GameState.Ready)
        {
            var g = OiyoArcade.ToGui(cam.WorldToScreenPoint(field.W(UndoRect.center.x, UndoRect.center.y, -0.4f)));
            OiyoArcade.Shadowed(new Rect(g.x - 60f, g.y - 11f, 120f, 22f), "<b>" + U("Take back one") + "</b>", 13, history.Count > 0 ? Color.white : new Color(1f, 1f, 1f, 0.4f), TextAnchor.MiddleCenter);
            for (int i = 0; i < Cells; i++)
            {
                int pts = PieceScore(i);
                if (pts <= 0) continue;
                var c = Centre(i);
                var p = OiyoArcade.ToGui(cam.WorldToScreenPoint(field.W(c.x + CellSize * 0.3f, c.y - CellSize * 0.32f, -0.6f)));
                OiyoArcade.Shadowed(new Rect(p.x - 20f, p.y - 8f, 40f, 16f), $"<color=#ff6b6b><b>+{pts}</b></color>", 11, Color.white, TextAnchor.MiddleCenter);
            }
        }
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap to start"), U("Tap any bare land to set a piece down. You can't fail!"), 200f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            string detail = $"<size=30>{OiyoArcade.StarString(starsWon)}</size>";
            string body = $"<size=14>{F("{0} cosy points", Score())}</size>";
            int r = OiyoScreens.Result(w, h, Dark, Accent, true, ResultLive, U("Village finished!"), detail, body,
                stageIdx < StageCount - 1 ? U("Next stage") : null, stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Build again"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
