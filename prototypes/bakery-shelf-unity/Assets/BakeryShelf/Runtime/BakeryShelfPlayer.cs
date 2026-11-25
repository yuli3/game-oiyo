using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Bakery Shelf 3D: the web Bakery Shelf (src/components/games/BakeryShelf.tsx, src/lib/games/bakery-shelf.ts) rebuilt in
// Unity on the web's own 360 × 560 px field (OiyoField). Move breads between the shelves; three of a kind on one shelf
// sell, and an empty front pulls the next tray forward. Sell everything within the moves. The 30 deals are the web's
// own (BakeryShelfStages.cs).
public class BakeryShelfPlayer : MonoBehaviour
{
    const string Slug = "bakery-shelf";
    const int StageCount = 30;
    const int Slots = 3, Empty = -1, Kinds = 8;
    const float Top = 70f, Bottom = 540f, ShelfW = 108f, Spot = 34f;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of bakery-shelf.ts) ----------------
    BakeryShelfStages.Level st;
    int stageIdx, starsWon, n, moves, sold;
    int[][] front;
    List<int[]>[] back;
    bool over, won;

    static bool IsEmpty(int[] r) => r[0] == Empty && r[1] == Empty && r[2] == Empty;
    static bool IsTriple(int[] r) => r[0] != Empty && r[0] == r[1] && r[1] == r[2];

    int Settle(int s)
    {
        int got = 0;
        for (;;)
        {
            if (IsTriple(front[s])) { front[s] = new[] { Empty, Empty, Empty }; sold++; got++; continue; }
            if (IsEmpty(front[s]) && back[s].Count > 0) { front[s] = back[s][0]; back[s].RemoveAt(0); continue; }
            return got;
        }
    }

    int ItemsLeft()
    {
        int c = 0;
        for (int s = 0; s < n; s++)
        {
            foreach (int v in front[s]) if (v != Empty) c++;
            foreach (var t in back[s]) foreach (int v in t) if (v != Empty) c++;
        }
        return c;
    }

    int FreeSpot(int s) => System.Array.IndexOf(front[s], Empty);

    bool AnyMove()
    {
        for (int s = 0; s < n; s++)
        {
            bool has = false;
            foreach (int v in front[s]) if (v != Empty) has = true;
            if (!has) continue;
            for (int t = 0; t < n; t++) if (t != s && FreeSpot(t) >= 0) return true;
        }
        return false;
    }

    int Move(int fs, int fi, int ts, int ti)
    {
        if (over || fs == ts || front[fs][fi] == Empty || front[ts][ti] != Empty) return -1;
        front[ts][ti] = front[fs][fi];
        front[fs][fi] = Empty;
        moves++;
        int got = Settle(ts) + Settle(fs);
        if (ItemsLeft() == 0) { over = true; won = true; }
        else if (moves >= st.limit || !AnyMove()) over = true;
        return got;
    }

    int StarsFor()
    {
        if (!won) return 0;
        int p = st.par;
        if (moves <= p + Mathf.CeilToInt(p * 0.15f)) return 3;
        if (moves <= p + Mathf.CeilToInt(p * 0.4f)) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    OiyoField field;
    Camera cam;
    Transform root, cursorObj, heldObj;
    Transform[] boardObj;
    Renderer[] boardRen;
    Transform[,] frontObj, backObj;
    Renderer[,] frontRen, backRen;
    Material[] breadMat, fadedMat;
    Material woodMat, flashMat;
    float[] flash;
    Bursts burst;
    Synth synth;
    bool showStages, keyed;
    int heldS = -1, heldI = -1, dragS = -1, dragI = -1, dragId = -1, curS, curI;

    Vector2 ShelfAt(int s, out float rowH)
    {
        int rows = Mathf.CeilToInt(n / 3f);
        rowH = Mathf.Min(160f, (Bottom - Top) / rows);
        int r = s / 3, inRow = Mathf.Min(3, n - r * 3), c = s % 3;
        float gap = (360f - inRow * ShelfW) / (inRow + 1);
        float x = Mathf.Round(gap + c * (ShelfW + gap));
        float y = Mathf.Round(Top + (Bottom - Top - rows * rowH) / 2f + (r + 1) * rowH - 22f);
        return new Vector2(x, y);
    }

    bool SpotAt(Vector2 f, out int s, out int i)
    {
        for (s = 0; s < n; s++)
        {
            var g = ShelfAt(s, out float rowH);
            if (f.x < g.x - 4f || f.x > g.x + ShelfW + 4f || f.y < g.y - Mathf.Min(110f, rowH - 10f) || f.y > g.y + 14f) continue;
            i = Mathf.Clamp(Mathf.FloorToInt((f.x - g.x - 3f) / Spot), 0, Slots - 1);
            return true;
        }
        s = -1; i = -1;
        return false;
    }

    Vector2 SpotCentre(int s, int i) { var g = ShelfAt(s, out _); return new Vector2(g.x + 3f + Spot * i + Spot / 2f, g.y - 16f); }

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(360f, 560f, new Color(1f, 0.96f, 0.9f));
        cam = field.Cam;
        OiyoField.Lights(new Color(0.78f, 0.76f, 0.74f), 0.7f, 50f, -25f);
        burst = new Bursts(transform, 0.5f);
        synth = new Synth(gameObject);
        breadMat = new Material[Kinds];
        fadedMat = new Material[Kinds];
        for (int k = 0; k < Kinds; k++)
        {
            var tex = OiyoArcade.Art("BS/bread" + k);
            breadMat[k] = OiyoArcade.Transparent(tex, Color.white);
            fadedMat[k] = OiyoArcade.Transparent(tex, new Color(1f, 1f, 1f, 0.4f));
        }
        woodMat = OiyoArcade.Lit(new Color(0.63f, 0.4f, 0.18f), 0.3f);
        flashMat = OiyoArcade.Glow(new Color(1f, 0.83f, 0.23f));
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int idx, bool ready = true)
    {
        stageIdx = Mathf.Clamp(idx, 0, StageCount - 1);
        StopAllCoroutines();
        st = BakeryShelfStages.All[stageIdx];
        n = st.rows.Length;
        front = new int[n][];
        back = new List<int[]>[n];
        int at = 0;
        for (int s = 0; s < n; s++)
        {
            back[s] = new List<int[]>();
            for (int t = 0; t < st.rows[s]; t++)
            {
                var row = new[] { st.items[at], st.items[at + 1], st.items[at + 2] };
                at += 3;
                if (t == 0) front[s] = row; else back[s].Add(row);
            }
        }
        moves = 0; sold = 0; over = false; won = false; starsWon = 0;
        for (int s = 0; s < n; s++) Settle(s);
        sold = 0;
        heldS = -1; dragS = -1; keyed = false; curS = 0; curI = 0; planAt = 0;
        flash = new float[n];
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Bakery").transform;
        showStages = false;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Animate(0f);
    }

    Transform Box(string name, Material m, float x, float y, float w, float h, float z, float d)
    {
        var o = OiyoArcade.Prim(PrimitiveType.Cube, name, m, root).transform;
        o.localScale = new Vector3(OiyoField.U(w), OiyoField.U(h), d);
        o.position = field.W(x, y, z);
        return o;
    }

    void BuildScene()
    {
        // a warm striped bakery wall
        Box("Wall", OiyoArcade.Glow(new Color(1f, 0.96f, 0.9f)), 180f, 280f, 1200f, 1600f, 0.8f, 0.2f);
        var stripe = OiyoArcade.Glow(new Color(1f, 0.91f, 0.8f));
        for (int x = -300; x < 700; x += 30) Box("Stripe", stripe, x + 7f, 280f, 14f, 1600f, 0.7f, 0.02f);
        boardObj = new Transform[n];
        boardRen = new Renderer[n];
        frontObj = new Transform[n, Slots]; frontRen = new Renderer[n, Slots];
        backObj = new Transform[n, Slots]; backRen = new Renderer[n, Slots];
        var lip = OiyoArcade.Lit(new Color(0.44f, 0.26f, 0.1f), 0.2f);
        for (int s = 0; s < n; s++)
        {
            var g = ShelfAt(s, out _);
            boardObj[s] = Box("Shelf", woodMat, g.x + ShelfW / 2f, g.y + 4f, ShelfW, 8f, 0f, OiyoField.U(36f));
            boardRen[s] = boardObj[s].GetComponent<Renderer>();
            Box("Lip", lip, g.x + ShelfW / 2f, g.y + 10f, ShelfW, 4f, -0.05f, OiyoField.U(38f));
            for (int i = 0; i < Slots; i++)
            {
                var c = SpotCentre(s, i);
                frontObj[s, i] = OiyoField.Quad("Bread", breadMat[0], root, 30f, 30f);
                frontObj[s, i].position = field.W(c.x, c.y, -0.3f);
                frontRen[s, i] = frontObj[s, i].GetComponent<Renderer>();
                backObj[s, i] = OiyoField.Quad("Tray", fadedMat[0], root, 20f, 20f);
                backObj[s, i].position = field.W(c.x, g.y - 46f, -0.2f);
                backRen[s, i] = backObj[s, i].GetComponent<Renderer>();
            }
        }
        heldObj = Box("Held", OiyoArcade.Glow(new Color(0.6f, 0.82f, 1f)), 0f, 0f, Spot - 2f, 34f, -0.1f, 0.02f);
        cursorObj = Box("Cursor", OiyoArcade.Glow(new Color(0.11f, 0.49f, 0.84f)), 0f, 0f, Spot - 2f, 3f, -0.6f, 0.02f);
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("bakery-shelf", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        Animate(dt);
    }

    void Place(int ts, int ti)
    {
        if (heldS < 0 || over) return;
        int fs = heldS, fi = heldI;
        heldS = -1;
        if (ts == fs) return;
        int to = front[ts][ti] == Empty ? ti : FreeSpot(ts);
        if (to < 0) { synth.Tone(220f, 0.08f, Wave.Square, 0.06f); return; }
        int got = Move(fs, fi, ts, to);
        if (got < 0) return;
        if (planAt < st.plan.Length / 4 && st.plan[4 * planAt] == fs && st.plan[4 * planAt + 1] == fi && st.plan[4 * planAt + 2] == ts) planAt++;
        if (got > 0)
        {
            flash[ts] = 0.4f;
            var g = ShelfAt(ts, out _);
            burst.Emit(field.W(g.x + ShelfW / 2f, g.y - 16f, -0.6f), new Color(1f, 0.83f, 0.23f), 14, 2.5f, 0.05f, 0.5f);
            StartCoroutine(Arp(new[] { 784f, 988f, 1175f }, 0.06f));
        }
        else synth.Tone(523f, 0.05f, Wave.Triangle, 0.08f);
        if (over) End();
    }

    void Press(int s, int i)
    {
        if (state != GameState.Playing || over) return;
        if (heldS >= 0)
        {
            if (heldS == s && heldI == i) heldS = -1;
            else if (heldS == s && front[s][i] != Empty) { heldS = s; heldI = i; }
            else Place(s, i);
            return;
        }
        if (front[s][i] != Empty) { heldS = s; heldI = i; synth.Tone(660f, 0.04f, Wave.Triangle, 0.06f); }
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
                    // input is read once per frame: tap a bread, then a shelf (or drag it there)
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (state == GameState.Ready) { state = GameState.Playing; continue; }
                        keyed = false;
                        if (!field.ToField(b.pos, out Vector2 f) || !SpotAt(f, out int s, out int i)) { heldS = -1; continue; }
                        bool wasHeld = heldS >= 0;
                        Press(s, i);
                        if (!wasHeld && heldS >= 0) { dragS = s; dragI = i; dragId = b.id; } else dragS = -1;
                    }
                    foreach (var e in OiyoArcade.Ended())
                    {
                        if (dragS < 0 || e.id != dragId) continue;
                        int ds = dragS;
                        dragS = -1;
                        if (field.ToField(e.pos, out Vector2 f) && SpotAt(f, out int s, out int i) && s != ds) Place(s, i);
                    }
                    int flat = curS * Slots + curI;
                    bool k = true;
                    if (Input.GetKeyDown(KeyCode.LeftArrow)) flat = Mathf.Max(0, flat - 1);
                    else if (Input.GetKeyDown(KeyCode.RightArrow)) flat = Mathf.Min(n * Slots - 1, flat + 1);
                    else if (Input.GetKeyDown(KeyCode.UpArrow)) flat = Mathf.Max(0, curS - 3) * Slots + curI;
                    else if (Input.GetKeyDown(KeyCode.DownArrow)) flat = Mathf.Min(n - 1, curS + 3) * Slots + curI;
                    else k = false;
                    if (k) { curS = flat / Slots; curI = flat % Slots; keyed = true; if (state == GameState.Ready) state = GameState.Playing; }
                    if (Input.GetKeyDown(KeyCode.Space) || confirm)
                    {
                        if (state == GameState.Ready) state = GameState.Playing;
                        else { keyed = true; Press(curS, curI); }
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
        heldS = -1;
        if (won)
        {
            state = GameState.Victory;
            OiyoArcade.Record(Slug, stageIdx, starsWon, Mathf.Max(0, (st.limit - moves) * 10), StageCount);
            burst.Emit(field.W(180f, 280f, -1f), new Color(1f, 0.56f, 0.7f), 40, 4f, 0.1f, 1f);
            StartCoroutine(Arp(new[] { 523f, 659f, 784f, 1047f }, 0.1f));
        }
        else
        {
            state = GameState.GameOver;
            StartCoroutine(Arp(new[] { 392f, 330f, 262f }, 0.14f));
        }
    }

    IEnumerator Arp(float[] fs, float gap)
    {
        foreach (var f in fs) { synth.Tone(f, 0.16f, Wave.Triangle, 0.2f, 0f, 6f); yield return new WaitForSeconds(gap); }
    }

    void Animate(float dt)
    {
        if (root == null) return;
        field.Fit(56f, 10f, 0f, Top - 10f, Bottom + 10f);
        for (int s = 0; s < n; s++)
        {
            flash[s] = Mathf.Max(0f, flash[s] - dt);
            boardRen[s].sharedMaterial = flash[s] > 0f ? flashMat : woodMat;
            var next = back[s].Count > 0 ? back[s][0] : null;
            for (int i = 0; i < Slots; i++)
            {
                int v = front[s][i];
                frontObj[s, i].gameObject.SetActive(v != Empty);
                if (v != Empty) frontRen[s, i].sharedMaterial = breadMat[v];
                var c = SpotCentre(s, i);
                bool isHeld = heldS == s && heldI == i;
                frontObj[s, i].position = field.W(c.x, c.y - (isHeld ? 6f : 0f), -0.3f);
                int bv = next != null ? next[i] : Empty;
                backObj[s, i].gameObject.SetActive(bv != Empty);
                if (bv != Empty) backRen[s, i].sharedMaterial = fadedMat[bv];
            }
        }
        heldObj.gameObject.SetActive(heldS >= 0);
        if (heldS >= 0) { var c = SpotCentre(heldS, heldI); heldObj.position = field.W(c.x, c.y - 1f, -0.1f); }
        cursorObj.gameObject.SetActive(keyed);
        if (keyed) { var c = SpotCentre(curS, curI); cursorObj.position = field.W(c.x, c.y + 19f, -0.6f); }
    }

    // ?oiyotest=1 prints the state to the browser console for the automated play check, with the screen points of the
    // next move in the deal's own plan: the bread to pick up, then the spot to put it.
    bool testLog; float testT; int planAt;
    void TestTick(float dt)
    {
        if (!testLog) return;
        if ((testT -= dt) > 0f) return;
        testT = 0.05f;
        string nx = "null";
        if (state == GameState.Playing && !over && planAt < st.plan.Length / 4 && heldS < 0)
        {
            var a = SpotCentre(st.plan[4 * planAt], st.plan[4 * planAt + 1]);
            var b = SpotCentre(st.plan[4 * planAt + 2], st.plan[4 * planAt + 3]);
            var pa = cam.WorldToScreenPoint(field.W(a.x, a.y, 0f));
            var pb = cam.WorldToScreenPoint(field.W(b.x, b.y, 0f));
            nx = $"[{pa.x:F1},{Screen.height - pa.y:F1},{pb.x:F1},{Screen.height - pb.y:F1}]";
        }
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"moves\":{moves},\"par\":{st.par},\"limit\":{st.limit},\"next\":{nx},\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.94f, 0.45f, 0.17f, 0.97f);
    static readonly Color Dark = new Color(0.24f, 0.13f, 0.05f, 0.9f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("{0} shelves", BakeryShelfStages.All[i].rows.Length);

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(1f, 0.93f, 0.82f), U("Bakery Shelf"),
                U("Tap a bread, then a free spot on another shelf, to move it. Three of the same bread on one shelf sell at once, and the tray behind slides forward. Sell every bread within the moves."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        // how many more trays wait behind each shelf
        if (state == GameState.Playing || state == GameState.Ready)
        {
            for (int s = 0; s < n; s++)
            {
                if (back[s].Count == 0) continue;
                var g = ShelfAt(s, out _);
                var sp = cam.WorldToScreenPoint(field.W(g.x + ShelfW - 8f, g.y - 62f, 0f));
                var gp = OiyoArcade.ToGui(new Vector2(sp.x, sp.y));
                OiyoArcade.Text(new Rect(gp.x - 20f, gp.y - 9f, 40f, 18f), $"<b>+{back[s].Count}</b>", 13, new Color(0.54f, 0.35f, 0.17f), TextAnchor.MiddleCenter);
            }
        }
        var bar = new Rect(8f, 8f, w - 16f, 44f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 18f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>  " + F("Moves {0}/{1}", moves, st.limit), 15, new Color(1f, 0.93f, 0.82f));
        if (OiyoArcade.Button(new Rect(w - 56f, 12f, 40f, 36f), "<b>II</b>", OiyoScreens.Slate, 16))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap to start"), U("Tap a bread, then another shelf!"), 120f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            string detail = won ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : "";
            string body = won ? $"<size=14>{F("Sold out in {0} moves", moves)}</size>" : "";
            int r = OiyoScreens.Result(w, h, Dark, Accent, won, ResultLive, won ? U("Sold out!") : U("Out of moves"), detail, body,
                won && stageIdx < StageCount - 1 ? U("Next stage") : null, won && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
