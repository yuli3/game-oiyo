using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Charye Table 3D: the web Charye Table (src/components/games/CharyeTable.tsx, src/lib/games/charye-table.ts)
// rebuilt in Unity on the web's own 360 × 560 px field (OiyoField). Four rows (rice & soup, jeon, po·namul·
// sikhye, fruit) at y 56/136/216/296; a dish only goes into its own row, swapping with what is there. Tap a
// fish to turn it. Offering checks the house's rules (rice west of soup, fish east of meat, fish heads east,
// dried fish leftmost and sikhye rightmost, jujube–chestnut–pear–persimmon from the west, or white west of
// red); a wrong offering burns 8 s of incense. The 30 tables are the web's own (CharyeTableStages.cs).
public class CharyeTablePlayer : MonoBehaviour
{
    const string Slug = "charye-table";
    const int StageCount = 30, Rows = 4;
    const float TX = 16f, TW = 328f, RowH = 70f, TrayY = 384f, Penalty = 8f;
    static readonly float[] RowY = { 56f, 136f, 216f, 296f };
    static readonly Rect OfferRect = new Rect(90f, 524f, 180f, 34f);

    // kinds: 0 rice 1 soup 2 meat 3 fish 4 po 5 namul 6 hye 7 jujube 8 chestnut 9 pear 10 persimmon 11 apple 12 hangwa
    static readonly int[] RowOf = { 0, 0, 1, 1, 2, 2, 2, 3, 3, 3, 3, 3, 3 };
    static readonly string[] KindName = { "Rice", "Soup", "Meat", "Fish", "Dried fish", "Greens", "Sikhye", "Jujube", "Chestnut", "Pear", "Persimmon", "Apple", "Sweets" };
    static readonly Color[] KindColor =
    {
        new Color(0.97f, 0.98f, 0.98f), new Color(0.91f, 0.77f, 0.42f), new Color(0.63f, 0.32f, 0.18f), new Color(0.68f, 0.71f, 0.74f),
        new Color(0.85f, 0.63f, 0.4f), new Color(0.36f, 0.58f, 0.05f), new Color(1f, 0.95f, 0.75f), new Color(0.79f, 0.16f, 0.16f),
        new Color(0.55f, 0.33f, 0.14f), new Color(0.95f, 0.95f, 0.77f), new Color(0.94f, 0.55f, 0f), new Color(0.88f, 0.19f, 0.19f), new Color(0.97f, 0.51f, 0.67f),
    };
    // rules: 0 banseo 1 eodong 2 dudong 3 jwapo 4 joyul 5 hongdong
    static readonly string[] RuleName =
    {
        "Rice west (left), soup east (right)", "Fish east, meat west", "Fish heads point east",
        "Dried fish leftmost, sikhye rightmost", "From the west: jujube, chestnut, pear, persimmon", "Red fruit east, white fruit west",
    };

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of charye-table.ts) ----------------
    CharyeTableStages.Level st;
    int stageIdx, offered, wrong, starsWon, n;
    float t;
    int[][] place;
    bool[] east;
    bool over, won;
    readonly List<int> brokenRules = new List<int>();

    int Kind(int id) => st.dishes[id];

    void NewTable()
    {
        n = st.dishes.Length;
        place = new int[Rows][];
        for (int r = 0; r < Rows; r++) { place[r] = new int[st.cols[r]]; for (int c = 0; c < place[r].Length; c++) place[r][c] = -1; }
        east = new bool[n];
        for (int i = 0; i < n; i++) east[i] = i % 2 == 0;
        t = 0f; offered = 0; wrong = 0; over = false; won = false;
        brokenRules.Clear();
    }

    bool WhereIs(int id, out int row, out int col)
    {
        for (row = 0; row < Rows; row++) for (col = 0; col < place[row].Length; col++) if (place[row][col] == id) return true;
        row = col = -1;
        return false;
    }

    bool Put(int id, int row, int col)
    {
        if (over || RowOf[Kind(id)] != row || col < 0 || col >= place[row].Length) return false;
        bool from = WhereIs(id, out int fr, out int fc);
        int other = place[row][col];
        if (from) place[fr][fc] = other;
        place[row][col] = id;
        return true;
    }

    bool Turn(int id) { if (over || Kind(id) != 3) return false; east[id] = !east[id]; return true; }

    static bool IsRed(int k) => k == 7 || k == 11;
    static bool IsWhite(int k) => k == 8 || k == 9;
    static int JoyulIndex(int k) => k == 7 ? 0 : k == 8 ? 1 : k == 9 ? 2 : k == 10 ? 3 : -1;

    bool Complete()
    {
        for (int r = 0; r < Rows; r++) foreach (var v in place[r]) if (v < 0) return false;
        return true;
    }

    void Broken(List<int> outRules)
    {
        outRules.Clear();
        foreach (int rule in st.rules)
        {
            bool ok = true;
            if (rule == 0) ok = MaxPos(0, k => k == 0) < MinPos(0, k => k == 1);
            if (rule == 1) ok = MaxPos(1, k => k == 2) < MinPos(1, k => k == 3);
            if (rule == 2) for (int i = 0; i < n; i++) if (Kind(i) == 3 && !east[i]) ok = false;
            if (rule == 3)
            {
                var row = place[2];
                int po = -1, hye = -1;
                for (int c = 0; c < row.Length; c++) { if (row[c] >= 0 && Kind(row[c]) == 4) po = c; if (row[c] >= 0 && Kind(row[c]) == 6) hye = c; }
                ok = (po < 0 || po == 0) && (hye < 0 || hye == row.Length - 1);
            }
            if (rule == 4)
            {
                int prev = -1;
                foreach (var id in place[3]) { if (id < 0) continue; int j = JoyulIndex(Kind(id)); if (j < 0) continue; if (j < prev) ok = false; prev = j; }
            }
            if (rule == 5) ok = MaxPos(3, IsWhite) < MinPos(3, IsRed);
            if (!ok) outRules.Add(rule);
        }
    }
    int MaxPos(int row, System.Func<int, bool> test) { int m = -1; for (int c = 0; c < place[row].Length; c++) if (place[row][c] >= 0 && test(Kind(place[row][c]))) m = c; return m; }
    int MinPos(int row, System.Func<int, bool> test) { for (int c = 0; c < place[row].Length; c++) if (place[row][c] >= 0 && test(Kind(place[row][c]))) return c; return 99; }

    // 1 ok, 0 wrong, -1 nothing
    int Offer()
    {
        if (over) return -1;
        Broken(brokenRules);
        offered++;
        if (Complete() && brokenRules.Count == 0) { over = true; won = true; return 1; }
        wrong++;
        t += Penalty;
        if (t >= st.time) over = true;
        return 0;
    }

    bool Step(float dt)
    {
        if (over) return false;
        t += dt;
        if (t >= st.time) { t = st.time; over = true; return true; }
        return false;
    }

    int StarsFor()
    {
        if (!won) return 0;
        if (wrong == 0 && t <= st.time * 0.6f) return 3;
        if (wrong <= 1) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    OiyoField field;
    Camera cam;
    Transform root;
    readonly List<Transform> plates = new List<Transform>(), foods = new List<Transform>();
    Material tableMat, wallMat, plateMat, trayMat, offerMat, fishMat, fishWestMat;
    readonly List<Material> foodMats = new List<Material>();
    Bursts bursts;
    Synth synth;
    bool showStages;

    Rect SlotRect(int row, int col)
    {
        int cnt = place[row].Length;
        float w = Mathf.Min(54f, (TW - 8f) / cnt);
        float x0 = TX + (TW - w * cnt) / 2f;
        return new Rect(x0 + col * w, RowY[row], w, RowH - 10f);
    }

    Vector2 TrayPos(int id)
    {
        int k = 0;
        for (int i = 0; i < n; i++)
        {
            if (WhereIs(i, out _, out _)) continue;
            if (i == id) break;
            k++;
        }
        return new Vector2(26f + (k % 8) * 44f, TrayY + 14f + (k / 8) * 50f);
    }

    Vector2 DishPos(int id)
    {
        if (dragId == id) return dragAt;
        if (WhereIs(id, out int r, out int c)) { var s = SlotRect(r, c); return new Vector2(s.x + s.width / 2f, s.y + s.height / 2f - 6f); }
        return TrayPos(id);
    }

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(360f, 560f, new Color(0.9f, 0.83f, 0.7f));
        cam = field.Cam;
        OiyoField.Lights(new Color(0.65f, 0.6f, 0.55f), 0.8f, 40f, -20f);
        bursts = new Bursts(transform, 0.6f);
        synth = new Synth(gameObject);
        tableMat = OiyoArcade.Lit(new Color(0.61f, 0.23f, 0.16f), 0.7f);
        wallMat = OiyoArcade.Lit(Color.white, 0.1f, OiyoArcade.Art("CT/screen", true));
        plateMat = OiyoArcade.Lit(new Color(0.97f, 0.97f, 0.96f), 0.6f);
        trayMat = OiyoArcade.Lit(new Color(0.79f, 0.64f, 0.42f), 0.3f);
        offerMat = OiyoArcade.Lit(new Color(0.55f, 0.16f, 0.12f), 0.5f);
        fishMat = OiyoField.Sprite("CT/fish");
        fishWestMat = OiyoField.Sprite("CT/fish_west");
        foodMats.Clear();
        foreach (var c in KindColor) foodMats.Add(OiyoArcade.Lit(c, 0.4f));
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int i, bool ready = true)
    {
        stageIdx = Mathf.Clamp(i, 0, StageCount - 1);
        StopAllCoroutines();
        st = CharyeTableStages.All[stageIdx];
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Charye").transform;
        NewTable();
        starsWon = 0;
        showStages = false;
        dragId = -1;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Animate(0f);
    }

    void BuildScene()
    {
        var wall = OiyoArcade.Prim(PrimitiveType.Cube, "Screen", wallMat, root);
        wall.transform.position = field.W(180f, 200f, 1.2f);
        wall.transform.localScale = new Vector3(OiyoField.U(420f), OiyoField.U(420f), 0.2f);
        var table = OiyoArcade.Prim(PrimitiveType.Cube, "Table", tableMat, root);
        table.transform.position = field.W(TX + TW / 2f, RowY[0] + RowH * 2f - 8f, 0.3f);
        table.transform.localScale = new Vector3(OiyoField.U(TW + 12f), OiyoField.U(RowH * 4f + 12f), 0.4f);
        var tray = OiyoArcade.Prim(PrimitiveType.Cube, "Tray", trayMat, root);
        tray.transform.position = field.W(180f, TrayY + 72f, 0.3f);
        tray.transform.localScale = new Vector3(OiyoField.U(344f), OiyoField.U(166f), 0.3f);
        var off = OiyoArcade.Prim(PrimitiveType.Cube, "Offer", offerMat, root);
        off.transform.position = field.W(OfferRect.center.x, OfferRect.center.y, -0.1f);
        off.transform.localScale = new Vector3(OiyoField.U(OfferRect.width), OiyoField.U(OfferRect.height), 0.2f);
        plates.Clear(); foods.Clear();
        for (int i = 0; i < n; i++)
        {
            var p = OiyoArcade.Prim(PrimitiveType.Cylinder, "Plate", plateMat, root).transform;
            p.rotation = Quaternion.Euler(90f, 0f, 0f);
            p.localScale = new Vector3(OiyoField.U(40f), 0.05f, OiyoField.U(24f));
            plates.Add(p);
            Transform f;
            if (Kind(i) == 3) f = OiyoField.Quad("Fish", fishMat, root, 34f, 22f);
            else
            {
                f = OiyoArcade.Prim(PrimitiveType.Sphere, KindName[Kind(i)], foodMats[Kind(i)], root).transform;
                f.localScale = new Vector3(OiyoField.U(24f), OiyoField.U(24f), OiyoField.U(14f));
            }
            foods.Add(f);
        }
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("charye-table", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        if (state == GameState.Playing)
        {
            Step(dt);
            if (over) End();
        }
        msgT = Mathf.Max(0f, msgT - dt);
        Animate(dt);
    }

    string msg = ""; float msgT; Color msgC = Color.white;
    void Toast(string m, Color c) { msg = m; msgT = 1.2f; msgC = c; }

    int dragId = -1, pressId = int.MinValue, sel;
    Vector2 dragAt, dragStart;
    bool dragMoved;

    int DishAt(Vector2 f)
    {
        for (int r = 0; r < Rows; r++)
            for (int c = 0; c < place[r].Length; c++)
                if (place[r][c] >= 0 && SlotRect(r, c).Contains(f)) return place[r][c];
        for (int i = 0; i < n; i++)
        {
            if (WhereIs(i, out _, out _)) continue;
            if (Vector2.Distance(TrayPos(i), f) < 22f) return i;
        }
        return -1;
    }

    int SlotAt(int row, Vector2 f)
    {
        for (int c = 0; c < place[row].Length; c++)
        {
            var s = SlotRect(row, c);
            if (f.x >= s.x - 4f && f.x <= s.xMax + 4f && f.y >= s.y - 12f && f.y <= s.yMax + 12f) return c;
        }
        return -1;
    }

    void DoOffer()
    {
        int r = Offer();
        if (r == 1)
        {
            Toast(U("Well set!"), new Color(0.55f, 1f, 0.6f));
            bursts.Emit(field.W(180f, 200f, -0.5f), new Color(1f, 0.83f, 0.23f), 24, 3f, 0.12f, 0.8f);
        }
        else if (r == 0)
        {
            Toast(Complete() ? U("That breaks a rule") : U("There are empty places"), new Color(1f, 0.5f, 0.45f));
            synth.Tone(240f, 0.2f, Wave.Square, 0.08f, 160f, 8f);
        }
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
                    if (state == GameState.Playing && (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P))) { state = GameState.Paused; dragId = -1; return; }
                    // the finger is read once per frame: touch a dish to lift it, carry it, lift off over a place to set it
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (OiyoArcade.OverUi(b.pos) || !field.ToField(b.pos, out Vector2 f)) continue;
                        if (state == GameState.Ready) state = GameState.Playing;
                        if (OfferRect.Contains(f)) { DoOffer(); continue; }
                        int id = DishAt(f);
                        if (id >= 0) { dragId = id; sel = id; pressId = b.id; dragAt = f; dragStart = f; dragMoved = false; }
                    }
                    foreach (var hp in OiyoArcade.Held())
                        if (hp.id == pressId && dragId >= 0 && field.ToField(hp.pos, out Vector2 f)) { dragAt = f; if (Vector2.Distance(f, dragStart) > 8f) dragMoved = true; }
                    foreach (var e in OiyoArcade.Ended())
                    {
                        if (e.id != pressId || dragId < 0) continue;
                        int id = dragId;
                        dragId = -1; pressId = int.MinValue;
                        if (!dragMoved) { if (Turn(id)) synth.Tone(660f, 0.06f, Wave.Triangle, 0.12f, 880f, 14f); continue; }
                        if (field.ToField(e.pos, out Vector2 f)) dragAt = f;
                        int row = RowOf[Kind(id)];
                        int col = SlotAt(row, dragAt);
                        if (col >= 0 && Put(id, row, col)) synth.Tone(520f, 0.06f, Wave.Triangle, 0.12f, 700f, 14f);
                    }
                    // keyboard: [ ] pick a dish, arrows move it in its row, F turns a fish, Enter offers
                    if (Input.GetKeyDown(KeyCode.RightBracket)) sel = (sel + 1) % n;
                    if (Input.GetKeyDown(KeyCode.LeftBracket)) sel = (sel + n - 1) % n;
                    if (Input.GetKeyDown(KeyCode.F)) Turn(sel);
                    if (Input.GetKeyDown(KeyCode.LeftArrow) || Input.GetKeyDown(KeyCode.RightArrow))
                    {
                        int row = RowOf[Kind(sel)];
                        int col;
                        if (WhereIs(sel, out _, out int c0)) col = c0 + (Input.GetKeyDown(KeyCode.RightArrow) ? 1 : -1);
                        else { col = -1; for (int c = 0; c < place[row].Length; c++) if (place[row][c] < 0) { col = c; break; } }
                        if (col >= 0) Put(sel, row, Mathf.Min(col, place[row].Length - 1));
                    }
                    if (confirm && state == GameState.Playing) DoOffer();
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
        dragId = -1;
        if (won)
        {
            starsWon = StarsFor();
            state = GameState.Victory;
            OiyoArcade.Record(Slug, stageIdx, starsWon, Mathf.Max(0, Mathf.RoundToInt(st.time - t)), StageCount);
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
        field.Fit(70f, 10f, 0f);
        for (int i = 0; i < n; i++)
        {
            var p = DishPos(i);
            float lift = dragId == i ? -1.2f : 0f;
            plates[i].position = field.W(p.x, p.y + 6f, -0.1f + lift);
            foods[i].position = field.W(p.x, p.y, -0.35f + lift);
            if (Kind(i) == 3) foods[i].GetComponent<Renderer>().sharedMaterial = east[i] ? fishMat : fishWestMat;
        }
    }

    // ?oiyotest=1 prints the state to the browser console for the automated play check: the incense, every
    // dish (kind, row it is in or −1, its place, a fish's heading east, and the screen point to touch), every
    // place's screen point row by row, the house's rules, the rules the last offering broke, and the offer plate.
    bool testLog; float testT;
    Vector2 Scr(Vector2 f) { var sp = cam.WorldToScreenPoint(field.W(f.x, f.y, -0.35f)); return new Vector2(sp.x, Screen.height - sp.y); }
    void TestTick(float dt)
    {
        if (!testLog || (testT -= dt) > 0f) return;
        testT = 0.05f;
        var ds = new System.Text.StringBuilder();
        for (int i = 0; i < n; i++)
        {
            if (i > 0) ds.Append(',');
            bool at = WhereIs(i, out int r, out int c);
            var s = Scr(DishPos(i));
            ds.Append('[').Append(Kind(i)).Append(',').Append(at ? r : -1).Append(',').Append(at ? c : -1).Append(',').Append(east[i] ? 1 : 0).Append(',').Append(s.x.ToString("F1")).Append(',').Append(s.y.ToString("F1")).Append(']');
        }
        var sl = new System.Text.StringBuilder();
        for (int r = 0; r < Rows; r++)
        {
            if (r > 0) sl.Append(',');
            sl.Append('[');
            for (int c = 0; c < place[r].Length; c++)
            {
                if (c > 0) sl.Append(',');
                var rect = SlotRect(r, c);
                var s = Scr(new Vector2(rect.center.x, rect.center.y - 6f));
                sl.Append('[').Append(s.x.ToString("F1")).Append(',').Append(s.y.ToString("F1")).Append(']');
            }
            sl.Append(']');
        }
        var o = Scr(OfferRect.center);
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"t\":{t:F3},\"time\":{st.time:F1},\"dishes\":[{ds}],\"slots\":[{sl}],\"rules\":[{string.Join(",", st.rules)}],\"broken\":[{string.Join(",", brokenRules)}],\"offered\":{offered},\"wrong\":{wrong},\"offer\":[{o.x:F1},{o.y:F1}],\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.61f, 0.23f, 0.16f, 0.97f);
    static readonly Color Dark = new Color(0.2f, 0.12f, 0.09f, 0.9f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("{0} dishes", CharyeTableStages.All[i].dishes.Length);

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(1f, 0.92f, 0.8f), U("Charye Table"),
                U("Set the Seollal ancestral table by this house's rules: drag each dish to its row, tap a fish to turn it, then offer before the incense burns down."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        // the house's rules, the broken ones in red
        float ry = 8f;
        var panel = new Rect(8f, ry, w - 16f, 26f + st.rules.Length * 17f);
        OiyoArcade.Panel(panel, Dark);
        OiyoArcade.Text(new Rect(18f, ry + 4f, w - 90f, 18f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>  " + U("This house's rules") + $"  · {Mathf.Max(0f, st.time - t):F0}s", 13, new Color(1f, 0.92f, 0.8f));
        for (int k = 0; k < st.rules.Length; k++)
        {
            bool bad = brokenRules.Contains(st.rules[k]);
            OiyoArcade.Text(new Rect(18f, ry + 22f + k * 17f, w - 36f, 17f), (bad ? "<b>x " : "· ") + U(RuleName[st.rules[k]]) + (bad ? "</b>" : ""), 12, bad ? new Color(1f, 0.45f, 0.4f) : Color.white);
        }
        if (OiyoArcade.Button(new Rect(w - 56f, 10f, 44f, 36f), "<b>II</b>", OiyoScreens.Slate, 16))
        {
            if (state == GameState.Playing) { state = GameState.Paused; dragId = -1; }
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (state == GameState.Playing || state == GameState.Ready)
        {
            // names under the dishes, east and west, the incense, and the offer plate's label
            for (int i = 0; i < n; i++)
            {
                var g = OiyoArcade.ToGui(cam.WorldToScreenPoint(field.W(DishPos(i).x, DishPos(i).y + 22f, -0.4f)));
                OiyoArcade.Shadowed(new Rect(g.x - 30f, g.y - 2f, 60f, 14f), U(KindName[Kind(i)]), 10, i == sel ? new Color(1f, 0.83f, 0.23f) : Color.white, TextAnchor.MiddleCenter);
            }
            var wl = OiyoArcade.ToGui(cam.WorldToScreenPoint(field.W(TX + 10f, RowY[0] - 14f, -0.4f)));
            var el = OiyoArcade.ToGui(cam.WorldToScreenPoint(field.W(TX + TW - 10f, RowY[0] - 14f, -0.4f)));
            OiyoArcade.Shadowed(new Rect(wl.x - 20f, wl.y - 9f, 40f, 18f), U("W"), 14, Color.white, TextAnchor.MiddleCenter);
            OiyoArcade.Shadowed(new Rect(el.x - 20f, el.y - 9f, 40f, 18f), U("E"), 14, Color.white, TextAnchor.MiddleCenter);
            var oc = OiyoArcade.ToGui(cam.WorldToScreenPoint(field.W(OfferRect.center.x, OfferRect.center.y, -0.3f)));
            OiyoArcade.Shadowed(new Rect(oc.x - 90f, oc.y - 11f, 180f, 22f), "<b>" + U("Offer the table") + "</b>", 16, Color.white, TextAnchor.MiddleCenter);
            OiyoArcade.Bar(new Rect(16f, h - 12f, w - 32f, 6f), Mathf.Max(0f, 1f - t / st.time), new Color(0f, 0f, 0f, 0.4f), new Color(1f, 0.42f, 0.42f));
        }
        if (msgT > 0f) OiyoArcade.Shadowed(new Rect(8f, h * 0.45f, w - 16f, 36f), msg, 20, msgC, TextAnchor.MiddleCenter);
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap to start"), U("Drag each dish to its row. Tap a fish to turn it."), 220f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            bool w0 = state == GameState.Victory;
            string detail = w0 ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : "";
            string body = $"<size=14>{F("{0} offerings · {1} wrong", offered, wrong)}</size>";
            int r = OiyoScreens.Result(w, h, Dark, Accent, w0, ResultLive, w0 ? U("The table is offered with care!") : U("The incense burned out"), detail, body,
                w0 && stageIdx < StageCount - 1 ? U("Next stage") : null, w0 && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
