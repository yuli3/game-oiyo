using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Draft Manor 3D: the web Draft Manor (src/components/games/DraftManor.tsx, src/lib/games/draft-manor.ts) rebuilt in
// Unity on the web's own 360 × 560 px field (OiyoField). The manor is a grid of plots; the entrance (doors N, E, W)
// is at the bottom middle and the vault (doors all round) at the top middle. Walking through a door into an empty
// plot draws the next three cards of the stage's deck; the one picked is built turned so its back door meets yours
// (forward, left and right are relative to the way you walked). Every room walked into costs a step; a pantry gives
// steps back and a key room a key the first time. Between built rooms a door on either side lets you through; an
// empty plot with no door your side can be reached by knocking through for 3 steps more. The vault opens with the
// stage's keys. The 30 manors and decks are the web's own (DraftManorStages.cs).
public class DraftManorPlayer : MonoBehaviour
{
    const string Slug = "draft-manor";
    const int StageCount = 30, Knock = 3;
    const float GridTop = 70f, GridH = 380f, CardY = 462f, CardW = 104f, CardH = 92f;
    static readonly int[] DX = { 0, 1, 0, -1 }, DY = { -1, 0, 1, 0 };

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of draft-manor.ts) ----------------
    class Room { public int doors, effect, gain; public bool used; }
    DraftManorStages.Level st;
    int stageIdx, starsWon, at, steps, keys, drawn, knocks;
    Room[] rooms;
    bool over, won;
    int offerCell = -1, offerDir;
    readonly int[] offer = new int[3]; // deck indices offered (−1 = the plain hall stand-in)

    int Cells => st.cols * st.rows;
    int Col(int i) => i % st.cols;
    int Row(int i) => i / st.cols;
    int Entrance => (st.rows - 1) * st.cols + st.cols / 2;
    int Vault => st.cols / 2;
    int Next(int i, int dir)
    {
        int c = Col(i) + DX[dir], r = Row(i) + DY[dir];
        return c < 0 || r < 0 || c >= st.cols || r >= st.rows ? -1 : r * st.cols + c;
    }
    int Exits(int k) => k < 0 ? 1 : st.exits[k];
    int Effect(int k) => k < 0 ? 0 : st.effect[k];
    int Gain(int k) => k < 0 ? 0 : st.gain[k];
    static int DoorsOf(int exits, int dir)
    {
        int m = 1 << ((dir + 2) % 4);
        if ((exits & 1) != 0) m |= 1 << dir;
        if ((exits & 2) != 0) m |= 1 << ((dir + 3) % 4);
        if ((exits & 4) != 0) m |= 1 << ((dir + 1) % 4);
        return m;
    }
    static bool HasDoor(Room r, int dir) => r != null && (r.doors & (1 << dir)) != 0;
    bool Passage(int i, int dir, int j) => rooms[j] != null && (HasDoor(rooms[i], dir) || HasDoor(rooms[j], (dir + 2) % 4));

    void NewManor()
    {
        rooms = new Room[Cells];
        rooms[Entrance] = new Room { doors = 1 | 2 | 8, used = true };
        rooms[Vault] = new Room { doors = 15, used = true };
        at = Entrance; steps = st.steps; keys = 0; drawn = 0; knocks = 0; offerCell = -1; over = false; won = false;
    }

    // "moved", "draft", "locked", "wall"
    string Move(int dir)
    {
        if (over || offerCell >= 0) return null;
        var here = rooms[at];
        int to = Next(at, dir);
        if (to < 0) return "wall";
        var there = rooms[to];
        if (there != null && !HasDoor(here, dir) && !HasDoor(there, (dir + 2) % 4)) return "wall";
        if (to == Vault)
        {
            if (keys < st.keys) return "locked";
            Step(to);
            if (!over) { over = true; won = true; }
            return "moved";
        }
        if (there != null) { Step(to); return "moved"; }
        if (drawn + 3 > st.exits.Length) return "wall";
        if (!HasDoor(here, dir))
        {
            if (steps <= Knock + 1) return "wall";
            steps -= Knock;
            knocks++;
        }
        bool any = false;
        for (int k = 0; k < 3; k++) { offer[k] = drawn + k; if (Exits(drawn + k) != 0) any = true; }
        if (!any) offer[2] = -1; // an offer always holds a room with a way on
        offerCell = to; offerDir = dir;
        drawn += 3;
        return "draft";
    }

    void Step(int to)
    {
        at = to;
        steps--;
        var room = rooms[to];
        if (!room.used)
        {
            room.used = true;
            if (room.effect == 1) steps += room.gain;
            if (room.effect == 2) keys++;
        }
        if (steps <= 0 && to != Vault) { over = true; return; }
        if (!over && to != Vault && !CanGoOn()) over = true;
    }

    bool Pick(int k)
    {
        if (over || offerCell < 0 || k < 0 || k > 2) return false;
        int card = offer[k];
        rooms[offerCell] = new Room { doors = DoorsOf(Exits(card), offerDir), effect = Effect(card), gain = Gain(card) };
        int cell = offerCell;
        offerCell = -1;
        BuildRoom(cell);
        Step(cell);
        return true;
    }

    int[] Distances()
    {
        var d = new int[Cells];
        for (int i = 0; i < d.Length; i++) d[i] = int.MaxValue;
        d[at] = 0;
        var q = new Queue<int>();
        q.Enqueue(at);
        while (q.Count > 0)
        {
            int i = q.Dequeue();
            if (i == Vault) continue;
            for (int dir = 0; dir < 4; dir++)
            {
                int j = Next(i, dir);
                if (j < 0 || j == Vault || !Passage(i, dir, j)) continue;
                if (d[j] > d[i] + 1) { d[j] = d[i] + 1; q.Enqueue(j); }
            }
        }
        return d;
    }

    struct Way { public int room, dir, to, cost; }
    List<Way> Frontier()
    {
        var d = Distances();
        var outp = new List<Way>();
        for (int i = 0; i < Cells; i++)
        {
            if (d[i] == int.MaxValue || i == Vault) continue;
            for (int dir = 0; dir < 4; dir++)
            {
                int j = Next(i, dir);
                if (j < 0) continue;
                bool door = HasDoor(rooms[i], dir);
                if (j == Vault) outp.Add(new Way { room = i, dir = dir, to = j, cost = d[i] + 1 });
                else if (rooms[j] == null) outp.Add(new Way { room = i, dir = dir, to = j, cost = d[i] + 1 + (door ? 0 : Knock) });
            }
        }
        return outp;
    }

    bool CanGoOn()
    {
        foreach (var f in Frontier())
            if ((f.to == Vault ? keys >= st.keys : drawn + 3 <= st.exits.Length) && f.cost <= steps) return true;
        return false;
    }

    List<int> Route(int target)
    {
        var prev = new Dictionary<int, (int, int)>();
        var seen = new HashSet<int> { at };
        var q = new Queue<int>();
        q.Enqueue(at);
        while (q.Count > 0)
        {
            int i = q.Dequeue();
            if (i == target) break;
            for (int dir = 0; dir < 4; dir++)
            {
                int j = Next(i, dir);
                if (j < 0 || seen.Contains(j) || j == Vault || !Passage(i, dir, j)) continue;
                seen.Add(j);
                prev[j] = (i, dir);
                q.Enqueue(j);
            }
        }
        var path = new List<int>();
        int c = target;
        while (c != at)
        {
            if (!prev.TryGetValue(c, out var p)) return new List<int>();
            path.Insert(0, p.Item2);
            c = p.Item1;
        }
        return path;
    }

    int StarsFor()
    {
        if (!won) return 0;
        if (steps >= st.par) return 3;
        if (steps >= Mathf.CeilToInt(st.par / 2f)) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    OiyoField field;
    Camera cam;
    Transform root, me;
    readonly List<GameObject> cardObjs = new List<GameObject>();
    GameObject[] roomObjs;
    Material plotMat, floorMat, pantryMat, keyRoomMat, vaultMat, wallMat, cardMat, meMat, keyMat, breadMat, frameMat;
    Transform frame;
    Bursts dust;
    Synth synth;
    bool showStages;

    float Cell => Mathf.Floor(Mathf.Min(330f / st.cols, GridH / st.rows));
    float X0 => Mathf.Floor((360f - Cell * st.cols) / 2f);
    float Y0 => GridTop + Mathf.Floor((GridH - Cell * st.rows) / 2f);
    Vector2 Centre(int i) => new Vector2(X0 + (Col(i) + 0.5f) * Cell, Y0 + (Row(i) + 0.5f) * Cell);
    static float CardX(int k) => 12f + k * (CardW + 12f);

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(360f, 560f, new Color(0.11f, 0.08f, 0.19f));
        cam = field.Cam;
        OiyoField.Lights(new Color(0.62f, 0.58f, 0.66f), 0.7f, 35f, -25f);
        dust = new Bursts(transform, 0.6f);
        synth = new Synth(gameObject);
        var wood = OiyoArcade.Art("DM/floor", true);
        plotMat = OiyoArcade.Lit(new Color(0.17f, 0.14f, 0.27f), 0.1f);
        floorMat = OiyoArcade.Lit(new Color(0.85f, 0.72f, 0.55f), 0.2f, wood);
        pantryMat = OiyoArcade.Lit(new Color(0.72f, 0.45f, 0.27f), 0.2f, wood);
        keyRoomMat = OiyoArcade.Lit(new Color(0.62f, 0.55f, 0.18f), 0.2f, wood);
        vaultMat = OiyoArcade.Lit(new Color(0.37f, 0.24f, 0.77f), 0.5f);
        wallMat = OiyoArcade.Lit(new Color(0.24f, 0.17f, 0.12f), 0.2f);
        cardMat = OiyoArcade.Lit(new Color(0.97f, 0.94f, 0.89f), 0.2f);
        frameMat = OiyoArcade.Lit(new Color(0.99f, 0.83f, 0.23f), 0.4f);
        meMat = OiyoField.Sprite("DM/me");
        keyMat = OiyoField.Sprite("DM/key");
        breadMat = OiyoField.Sprite("DM/bread");
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int i, bool ready = true)
    {
        stageIdx = Mathf.Clamp(i, 0, StageCount - 1);
        StopAllCoroutines();
        st = DraftManorStages.All[stageIdx];
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Manor").transform;
        NewManor();
        starsWon = 0;
        showStages = false;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Animate(0f);
    }

    Transform Box(Material m, float x, float y, float w, float h, float z, float depth, Transform parent)
    {
        var q = OiyoArcade.Prim(PrimitiveType.Cube, "Box", m, parent).transform;
        q.position = field.W(x, y, z);
        q.localScale = new Vector3(OiyoField.U(w), OiyoField.U(h), depth);
        return q;
    }

    // a room: its floor and the walls around it, with gaps for its doors
    GameObject RoomModel(int doors, int effect, float cx, float cy, float size, Transform parent, bool vault)
    {
        var g = new GameObject("Room").transform;
        g.SetParent(parent);
        Box(vault ? vaultMat : effect == 1 ? pantryMat : effect == 2 ? keyRoomMat : floorMat, cx, cy, size - 2f, size - 2f, 0f, 0.3f, g);
        float t = Mathf.Max(3f, Mathf.Floor(size / 10f)), gap = Mathf.Floor(size / 3f), x = cx - size / 2f, y = cy - size / 2f;
        for (int dir = 0; dir < 4; dir++)
        {
            bool open = (doors & (1 << dir)) != 0;
            void Seg(float a, float b)
            {
                if (dir == 0) Box(wallMat, x + (a + b) / 2f, y + t / 2f, b - a, t, -0.25f, 0.5f, g);
                if (dir == 2) Box(wallMat, x + (a + b) / 2f, y + size - t / 2f, b - a, t, -0.25f, 0.5f, g);
                if (dir == 3) Box(wallMat, x + t / 2f, y + (a + b) / 2f, t, b - a, -0.25f, 0.5f, g);
                if (dir == 1) Box(wallMat, x + size - t / 2f, y + (a + b) / 2f, t, b - a, -0.25f, 0.5f, g);
            }
            if (open) { Seg(0f, gap); Seg(size - gap, size); } else Seg(0f, size);
        }
        if (effect == 2 || effect == 1)
        {
            var icon = OiyoField.Quad("Icon", effect == 2 ? keyMat : breadMat, g, size * 0.5f, size * (effect == 2 ? 0.25f : 0.35f));
            icon.position = field.W(cx, cy, -0.45f);
        }
        return g.gameObject;
    }

    void BuildRoom(int i)
    {
        if (roomObjs[i] != null) Destroy(roomObjs[i]);
        var c = Centre(i);
        roomObjs[i] = RoomModel(rooms[i].doors, rooms[i].used ? 0 : rooms[i].effect, c.x, c.y, Cell, root, i == Vault);
    }

    void BuildScene()
    {
        roomObjs = new GameObject[Cells];
        for (int i = 0; i < Cells; i++)
        {
            var c = Centre(i);
            Box(plotMat, c.x, c.y, Cell - 4f, Cell - 4f, 0.2f, 0.1f, root);
            if (rooms[i] != null) BuildRoom(i);
        }
        me = OiyoField.Quad("You", meMat, root, Cell * 0.4f, Cell * 0.5f);
        frame = Box(frameMat, 0f, 0f, Cell, Cell, 0.1f, 0.05f, root);
    }

    void ShowOffer()
    {
        foreach (var o in cardObjs) Destroy(o);
        cardObjs.Clear();
        if (offerCell < 0) return;
        for (int k = 0; k < 3; k++)
        {
            float x = CardX(k);
            var plate = Box(cardMat, x + CardW / 2f, CardY + CardH / 2f, CardW, CardH, -0.6f, 0.2f, root);
            cardObjs.Add(plate.gameObject);
            cardObjs.Add(RoomModel(DoorsOf(Exits(offer[k]), offerDir), Effect(offer[k]), x + CardW / 2f, CardY + CardH / 2f + 4f, 54f, root, false));
            foreach (Transform tr in cardObjs[cardObjs.Count - 1].transform) tr.position += new Vector3(0f, 0f, -0.8f);
        }
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("draft-manor", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        if (state == GameState.Playing && over) End();
        msgT = Mathf.Max(0f, msgT - dt);
        Animate(dt);
    }

    string msg = ""; float msgT; Color msgC = Color.white;
    void Toast(string m, Color c) { msg = m; msgT = 1f; msgC = c; }

    string Walk(int dir)
    {
        int k0 = keys, s0 = steps, n0 = knocks;
        string r = Move(dir);
        if (r == "locked") Toast(U("You need more keys"), new Color(1f, 0.6f, 0.3f));
        if (knocks > n0) { Toast(U("Knocked through a wall (-3 steps)"), new Color(1f, 0.6f, 0.3f)); synth.Tone(120f, 0.2f, Wave.Noise, 0.15f, 60f, 6f); }
        if (r == "moved")
        {
            synth.Tone(440f, 0.04f, Wave.Triangle, 0.08f, 0f, 14f);
            if (keys > k0) { synth.Tone(1046f, 0.15f, Wave.Triangle, 0.15f, 1318f, 6f); BuildRoom(at); }
            if (steps > s0) { synth.Tone(660f, 0.12f, Wave.Triangle, 0.15f, 880f, 6f); BuildRoom(at); }
        }
        if (r == "draft") ShowOffer();
        return r;
    }

    void TapCell(int target)
    {
        var d = Distances();
        if (d[target] != int.MaxValue && target != at)
        {
            foreach (int dir in Route(target)) if (Walk(dir) != "moved" || over) break;
            return;
        }
        if (d[target] != int.MaxValue) return;
        // an empty plot (or the vault): walk to the built room beside it with the cheapest way through, then step in
        int best = -1, bestDir = -1, bestCost = int.MaxValue;
        for (int dir = 0; dir < 4; dir++)
        {
            int from = Next(target, (dir + 2) % 4);
            if (from < 0 || d[from] == int.MaxValue) continue;
            int cost = d[from] + (HasDoor(rooms[from], dir) || target == Vault ? 0 : Knock);
            if (cost < bestCost) { best = from; bestDir = dir; bestCost = cost; }
        }
        if (best < 0) return;
        foreach (int dir in Route(best)) if (Walk(dir) != "moved" || over) break;
        if (!over && at == best) Walk(bestDir);
    }

    void DoPick(int k)
    {
        int k0 = keys;
        if (!Pick(k)) return;
        ShowOffer();
        dust.Emit(field.W(Centre(at).x, Centre(at).y, -0.5f), new Color(0.9f, 0.8f, 0.6f), 8, 2f, 0.06f, 0.5f);
        synth.Tone(keys > k0 ? 1046f : 520f, 0.08f, Wave.Triangle, 0.14f, 0f, 10f);
        if (keys > k0 || rooms[at].used) BuildRoom(at);
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
                    // taps are read once per frame: a card is picked, or a plot or room is walked to
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (OiyoArcade.OverUi(b.pos) || !field.ToField(b.pos, out Vector2 f)) continue;
                        if (state == GameState.Ready) state = GameState.Playing;
                        if (offerCell >= 0)
                        {
                            for (int k = 0; k < 3; k++)
                                if (f.x >= CardX(k) && f.x <= CardX(k) + CardW && f.y >= CardY && f.y <= CardY + CardH) DoPick(k);
                            continue;
                        }
                        int col = Mathf.FloorToInt((f.x - X0) / Cell), row = Mathf.FloorToInt((f.y - Y0) / Cell);
                        if (col >= 0 && row >= 0 && col < st.cols && row < st.rows) TapCell(row * st.cols + col);
                        if (over) break;
                    }
                    int kd = Input.GetKeyDown(KeyCode.UpArrow) ? 0 : Input.GetKeyDown(KeyCode.RightArrow) ? 1 : Input.GetKeyDown(KeyCode.DownArrow) ? 2 : Input.GetKeyDown(KeyCode.LeftArrow) ? 3 : -1;
                    if (kd >= 0) { if (state == GameState.Ready) state = GameState.Playing; Walk(kd); }
                    for (int k = 0; k < 3; k++) if (Input.GetKeyDown(KeyCode.Alpha1 + k)) DoPick(k);
                    if (state == GameState.Ready && (confirm || Input.GetKeyDown(KeyCode.Space))) state = GameState.Playing;
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
        if (won)
        {
            starsWon = StarsFor();
            state = GameState.Victory;
            OiyoArcade.Record(Slug, stageIdx, starsWon, steps, StageCount);
            dust.Emit(field.W(Centre(Vault).x, Centre(Vault).y, -0.8f), new Color(1f, 0.85f, 0.25f), 30, 4f, 0.1f, 1f);
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
        field.Fit(80f, 10f, 0f);
        var c = Centre(at);
        me.position = field.W(c.x, c.y + Mathf.Sin(Time.time * 6f) * 1.5f, -0.6f);
        frame.gameObject.SetActive(offerCell >= 0);
        if (offerCell >= 0) frame.position = field.W(Centre(offerCell).x, Centre(offerCell).y, 0.12f);
    }

    // ---------------- Test hints (the web's planner, for the automated play check) ----------------
    int Manhattan(int a, int b) => Mathf.Abs(Col(a) - Col(b)) + Mathf.Abs(Row(a) - Row(b));

    float CardScore(int card, int cell, int dir)
    {
        int doors = DoorsOf(Exits(card), dir);
        float best = float.PositiveInfinity;
        int open = 0;
        for (int dd = 0; dd < 4; dd++)
        {
            if (dd == (dir + 2) % 4 || (doors & (1 << dd)) == 0) continue;
            int j = Next(cell, dd);
            if (j < 0) continue;
            if (j == Vault) { best = Mathf.Min(best, keys + (Effect(card) == 2 ? 1 : 0) >= st.keys ? -1 : 1); open++; }
            else if (rooms[j] == null) { best = Mathf.Min(best, Manhattan(j, Vault)); open++; }
        }
        float score = float.IsInfinity(best) ? 20f : best;
        score -= Mathf.Min(open, 2) * 0.3f;
        int others = 0;
        foreach (var f in Frontier()) if (f.to != cell) others++;
        if (others + open == 0) score += 40f;
        else if (others + open == 1) score += 6f;
        if (Effect(card) == 2 && keys < st.keys) score -= 6f;
        if (Effect(card) == 1) score -= steps < 8 ? Gain(card) * 0.8f : Gain(card) * 0.25f;
        return score;
    }

    // the card the web's careful drafter would pick, or the plot it would head for
    int HintCard()
    {
        int bestK = 0; float bestS = float.PositiveInfinity;
        for (int k = 0; k < 3; k++) { float s = CardScore(offer[k], offerCell, offerDir); if (s < bestS) { bestS = s; bestK = k; } }
        return bestK;
    }

    int HintPlot()
    {
        float bestS = float.PositiveInfinity; int to = -1;
        foreach (var f in Frontier())
        {
            if ((f.to == Vault && keys < st.keys) || f.cost > steps) continue;
            float s = f.to == Vault ? -100f : f.cost * 1.2f + Manhattan(f.to, Vault);
            if (s < bestS) { bestS = s; to = f.to; }
        }
        return to;
    }

    // ?oiyotest=1 prints the state to the browser console for the automated play check: steps, keys, whether a draft
    // is waiting, the planner's hint (a card 0–2, or a plot to tap), and the screen points (px from the top-left) of
    // the hinted plot and of the three card plates.
    bool testLog; float testT;
    Vector2 Scr(Vector2 f) { var sp = cam.WorldToScreenPoint(field.W(f.x, f.y, -0.3f)); return new Vector2(sp.x, Screen.height - sp.y); }
    void TestTick(float dt)
    {
        if (!testLog || (testT -= dt) > 0f) return;
        testT = 0.05f;
        bool drafting = offerCell >= 0;
        int hint = over ? -1 : drafting ? HintCard() : HintPlot();
        var hp = hint >= 0 && !drafting ? Scr(Centre(hint)) : Vector2.zero;
        var cards = new System.Text.StringBuilder();
        for (int k = 0; k < 3; k++) { if (k > 0) cards.Append(','); var p = Scr(new Vector2(CardX(k) + CardW / 2f, CardY + CardH / 2f)); cards.Append('[').Append(p.x.ToString("F1")).Append(',').Append(p.y.ToString("F1")).Append(']'); }
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"at\":{at},\"steps\":{steps},\"keys\":{keys},\"need\":{st.keys},\"drafting\":{(drafting ? "true" : "false")},\"drawn\":{drawn},\"hint\":{hint},\"plot\":[{hp.x:F1},{hp.y:F1}],\"cards\":[{cards}],\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.37f, 0.24f, 0.77f, 0.97f);
    static readonly Color Dark = new Color(0.09f, 0.07f, 0.16f, 0.9f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("Steps {0}", DraftManorStages.All[i].steps) + " · " + F("Keys {0}/{1}", 0, DraftManorStages.All[i].keys);

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(0.95f, 0.94f, 1f), U("Draft Manor"),
                U("At every door, pick one of three room cards and build it. Reach the vault at the top before your steps run out."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        var bar = new Rect(8f, 8f, w - 16f, 64f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 12f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>  " + F("Steps {0}", steps), 15, new Color(0.95f, 0.94f, 1f));
        OiyoArcade.Text(new Rect(20f, 36f, w - 90f, 24f), F("Keys {0}/{1}", keys, st.keys) + (offerCell >= 0 ? "   " + U("Which room will you build?") : ""), 15, Color.white);
        if (OiyoArcade.Button(new Rect(w - 60f, 14f, 44f, 44f), "<b>II</b>", OiyoScreens.Slate, 18))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (offerCell >= 0)
            for (int k = 0; k < 3; k++)
            {
                var g = OiyoArcade.ToGui(cam.WorldToScreenPoint(field.W(CardX(k) + 10f, CardY + 10f, -0.9f)));
                OiyoArcade.Shadowed(new Rect(g.x - 8f, g.y - 10f, 20f, 20f), $"<b>{k + 1}</b>", 14, Color.white);
                if (Effect(offer[k]) == 1)
                {
                    var gg = OiyoArcade.ToGui(cam.WorldToScreenPoint(field.W(CardX(k) + CardW / 2f, CardY + CardH - 10f, -0.9f)));
                    OiyoArcade.Shadowed(new Rect(gg.x - 30f, gg.y - 10f, 60f, 20f), $"<b>+{Gain(offer[k])}</b>", 14, Color.white, TextAnchor.MiddleCenter);
                }
            }
        {
            var v = OiyoArcade.ToGui(cam.WorldToScreenPoint(field.W(Centre(Vault).x, Centre(Vault).y, -0.5f)));
            OiyoArcade.Shadowed(new Rect(v.x - 30f, v.y - 10f, 60f, 20f), $"<b>{Mathf.Min(keys, st.keys)}/{st.keys}</b>", 14, new Color(1f, 0.83f, 0.23f), TextAnchor.MiddleCenter);
        }
        if (msgT > 0f) OiyoArcade.Shadowed(new Rect(8f, 76f, w - 16f, 30f), msg, 17, msgC, TextAnchor.MiddleCenter);
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap to start"), U("Tap the empty plot above the entrance to draft your first room!"), 200f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            bool w0 = state == GameState.Victory;
            string detail = w0 ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : "";
            string body = $"<size=14>{F("{0} steps left", steps)}</size>";
            int r = OiyoScreens.Result(w, h, Dark, Accent, w0, ResultLive, w0 ? U("Into the vault!") : U("Out of steps"), detail, body,
                w0 && stageIdx < StageCount - 1 ? U("Next stage") : null, w0 && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
