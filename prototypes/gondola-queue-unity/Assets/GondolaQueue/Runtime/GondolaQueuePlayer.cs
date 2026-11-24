using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Gondola Queue 3D: the web Gondola Queue (src/components/games/GondolaQueue.tsx, src/lib/games/gondola-queue.ts)
// rebuilt in Unity on the web's own 360 × 560 px field (OiyoField). Hikers fill a 6-wide station; one can leave if it
// is on the top row or empty cells lead there. A gondola seats three of its colour; anyone else waits on a five-seat
// bench and hops on when a gondola of their colour arrives. Five on the bench jams the station. The 30 stations are
// the web's own (GondolaQueueStages.cs).
public class GondolaQueuePlayer : MonoBehaviour
{
    const string Slug = "gondola-queue";
    const int StageCount = 30;
    const int Cols = 6, Seats = 3, Bench = 5, Empty = -1, Rock = -2;
    const float CW = 54f, CH = 46f, GY = 186f;
    static readonly float GX = (360f - Cols * CW) / 2f;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of gondola-queue.ts) ----------------
    GondolaQueueStages.Level st;
    int[] grid;
    int rows, stageIdx, starsWon, next, aboard, peak, taps;
    readonly List<int> bench = new List<int>();
    bool over, won;

    int Current => next < st.gondolas.Length ? st.gondolas[next] : -1;

    bool CanLeave(int i)
    {
        if (grid[i] < 0) return false;
        if (i < Cols) return true;
        var seen = new HashSet<int> { i };
        var q = new Queue<int>();
        q.Enqueue(i);
        while (q.Count > 0)
        {
            int c = q.Dequeue();
            int r = c / Cols, k = c % Cols;
            foreach (int nb in new[] { r > 0 ? c - Cols : -1, r < rows - 1 ? c + Cols : -1, k > 0 ? c - 1 : -1, k < Cols - 1 ? c + 1 : -1 })
            {
                if (nb < 0 || seen.Contains(nb) || grid[nb] != Empty) continue;
                if (nb < Cols) return true;
                seen.Add(nb);
                q.Enqueue(nb);
            }
        }
        return false;
    }

    bool Board()
    {
        bool left = false;
        while (aboard >= Seats)
        {
            aboard = 0;
            next++;
            left = true;
            int c = Current;
            if (c < 0) break;
            while (aboard < Seats)
            {
                int k = bench.IndexOf(c);
                if (k < 0) break;
                bench.RemoveAt(k);
                aboard++;
            }
        }
        return left;
    }

    // 1 boarded, 2 benched, 3 departed, 4 blocked
    int Tap(int i)
    {
        if (over) return 0;
        if (!CanLeave(i)) return 4;
        int colour = grid[i];
        grid[i] = Empty;
        taps++;
        int res;
        if (colour == Current) { aboard++; res = Board() ? 3 : 1; }
        else { bench.Add(colour); res = 2; }
        peak = Mathf.Max(peak, bench.Count);
        if (next >= st.gondolas.Length) { over = true; won = true; }
        else if (bench.Count >= Bench) over = true;
        return res;
    }

    int StarsFor()
    {
        if (!won) return 0;
        if (peak <= st.par) return 3;
        if (peak <= st.par + 1) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    static readonly Color[] Jackets = { new Color(0.88f, 0.19f, 0.19f), new Color(0.1f, 0.44f, 0.76f), new Color(0.96f, 0.62f, 0f), new Color(0.18f, 0.54f, 0.24f), new Color(0.44f, 0.28f, 0.91f), new Color(0.91f, 0.35f, 0.05f) };
    OiyoField field;
    Camera cam;
    Transform root, gondola, cursorObj;
    Renderer gondolaR;
    Transform[] people, benchPeople, riders, nextBoxes;
    Renderer[] peopleR, benchR, ridersR, nextR;
    Material[] hikerMat, hikerDim, jacketMat;
    Material rockMat, tileA, tileB, cursorMat;
    Bursts sparkle;
    Synth synth;
    bool showStages, keyed;
    int cursor;
    float ride;

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(360f, 560f, new Color(0.65f, 0.85f, 1f));
        cam = field.Cam;
        OiyoField.Lights(new Color(0.72f, 0.72f, 0.72f), 0.7f, 50f, -25f);
        sparkle = new Bursts(transform, 0.5f);
        synth = new Synth(gameObject);
        hikerMat = new Material[6]; hikerDim = new Material[6]; jacketMat = new Material[6];
        for (int k = 0; k < 6; k++)
        {
            hikerMat[k] = OiyoField.Sprite("GQ/hiker" + k);
            hikerMat[k].renderQueue = 3001;
            hikerDim[k] = OiyoArcade.Transparent(OiyoArcade.Art("GQ/hiker" + k), new Color(1f, 1f, 1f, 0.55f));
            hikerDim[k].renderQueue = 3000;
            jacketMat[k] = OiyoArcade.Lit(Jackets[k], 0.5f);
        }
        rockMat = OiyoArcade.Lit(new Color(0.53f, 0.56f, 0.59f), 0.2f);
        tileA = OiyoArcade.Lit(new Color(0.91f, 0.93f, 0.94f), 0.2f);
        tileB = OiyoArcade.Lit(new Color(0.87f, 0.89f, 0.9f), 0.2f);
        cursorMat = OiyoArcade.Glow(new Color(0.1f, 0.44f, 0.76f));
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int i, bool ready = true)
    {
        stageIdx = Mathf.Clamp(i, 0, StageCount - 1);
        StopAllCoroutines();
        st = GondolaQueueStages.All[stageIdx];
        rows = st.rows;
        grid = (int[])st.grid.Clone();
        bench.Clear();
        next = 0; aboard = 0; peak = 0; taps = 0; over = false; won = false; starsWon = 0; ride = 0f; cursor = 0; keyed = false;
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Station").transform;
        showStages = false;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Animate(0f);
    }

    Vector2 CellCentre(int i) => new Vector2(GX + (i % Cols + 0.5f) * CW, GY + (i / Cols + 0.5f) * CH);

    Transform Sprite(Material m, float size, Vector2 at, float z)
    {
        var q = OiyoField.Quad("Hiker", m, root, size, size);
        q.position = field.W(at.x, at.y, z);
        return q;
    }

    void BuildScene()
    {
        // the mountain behind
        var hill = OiyoArcade.Lit(new Color(0.55f, 0.91f, 0.6f), 0.1f);
        for (int k = 0; k < 6; k++)
        {
            var m = OiyoArcade.Prim(PrimitiveType.Sphere, "Hill", hill, root).transform;
            m.localScale = new Vector3(OiyoField.U(160f), OiyoField.U(120f), 0.5f);
            m.position = field.W(-20f + k * 80f, 170f + (k % 2) * 20f, 1.5f);
        }
        var cable = OiyoArcade.Prim(PrimitiveType.Cube, "Cable", OiyoArcade.Lit(new Color(0.29f, 0.31f, 0.34f), 0.5f), root).transform;
        cable.localScale = new Vector3(OiyoField.U(420f), OiyoField.U(3f), 0.05f);
        cable.position = field.W(180f, 23f, 0.2f);
        gondolaR = OiyoArcade.Prim(PrimitiveType.Cube, "Gondola", jacketMat[0], root).GetComponent<Renderer>();
        gondola = gondolaR.transform;
        gondola.localScale = new Vector3(OiyoField.U(100f), OiyoField.U(52f), 0.6f);
        var window = OiyoArcade.Prim(PrimitiveType.Cube, "Window", OiyoArcade.Lit(new Color(0.9f, 0.96f, 1f), 0.6f), gondola).transform;
        window.localScale = new Vector3(0.84f, 0.42f, 1.02f);
        window.localPosition = new Vector3(0f, 0.08f, 0f);
        riders = new Transform[Seats]; ridersR = new Renderer[Seats];
        for (int k = 0; k < Seats; k++) { riders[k] = Sprite(hikerMat[0], 26f, Vector2.zero, -0.4f); ridersR[k] = riders[k].GetComponent<Renderer>(); }
        nextBoxes = new Transform[4]; nextR = new Renderer[4];
        for (int k = 0; k < 4; k++)
        {
            var b = OiyoArcade.Prim(PrimitiveType.Cube, "Next", jacketMat[0], root);
            b.transform.localScale = new Vector3(OiyoField.U(18f), OiyoField.U(18f), 0.2f);
            b.transform.position = field.W(180f + 60f + (k + 1) * 24f + 9f, 43f, 0f);
            nextBoxes[k] = b.transform; nextR[k] = b.GetComponent<Renderer>();
        }
        var seat = OiyoArcade.Prim(PrimitiveType.Cube, "Bench", OiyoArcade.Lit(new Color(0.66f, 0.46f, 0.27f), 0.3f), root).transform;
        seat.localScale = new Vector3(OiyoField.U(320f), OiyoField.U(8f), 0.4f);
        seat.position = field.W(180f, 112f, 0f);
        benchPeople = new Transform[Bench]; benchR = new Renderer[Bench];
        for (int k = 0; k < Bench; k++)
        {
            var slot = OiyoArcade.Prim(PrimitiveType.Cube, "Seat", tileA, root).transform;
            slot.localScale = new Vector3(OiyoField.U(52f), OiyoField.U(52f), 0.1f);
            slot.position = field.W(30f + k * 62f + 26f, 142f, 0.1f);
            benchPeople[k] = Sprite(hikerMat[0], 40f, new Vector2(30f + k * 62f + 26f, 142f), -0.2f);
            benchR[k] = benchPeople[k].GetComponent<Renderer>();
        }
        var floor = OiyoArcade.Prim(PrimitiveType.Cube, "Floor", OiyoArcade.Lit(new Color(0.81f, 0.83f, 0.85f), 0.2f), root).transform;
        floor.localScale = new Vector3(OiyoField.U(Cols * CW + 12f), OiyoField.U(rows * CH + 14f), 0.2f);
        floor.position = field.W(180f, GY - 8f + (rows * CH + 14f) / 2f, 0.25f);
        people = new Transform[rows * Cols]; peopleR = new Renderer[rows * Cols];
        for (int i = 0; i < rows * Cols; i++)
        {
            var c = CellCentre(i);
            var t = OiyoArcade.Prim(PrimitiveType.Cube, "Cell", (i / Cols + i % Cols) % 2 == 1 ? tileA : tileB, root).transform;
            t.localScale = new Vector3(OiyoField.U(CW), OiyoField.U(CH), 0.1f);
            t.position = field.W(c.x, c.y, 0.1f);
            if (grid[i] == Rock)
            {
                var r = OiyoArcade.Prim(PrimitiveType.Cube, "Rock", rockMat, root).transform;
                r.localScale = new Vector3(OiyoField.U(CW - 12f), OiyoField.U(CH - 12f), 0.5f);
                r.position = field.W(c.x, c.y, -0.2f);
            }
            else if (grid[i] >= 0) { people[i] = Sprite(hikerMat[grid[i]], 40f, c, -0.1f); peopleR[i] = people[i].GetComponent<Renderer>(); }
        }
        cursorObj = OiyoArcade.Prim(PrimitiveType.Cube, "Cursor", cursorMat, root).transform;
        cursorObj.localScale = new Vector3(OiyoField.U(CW - 6f), OiyoField.U(4f), 0.05f);
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("gondola-queue", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        ride = Mathf.Max(0f, ride - dt * 1.5f);
        Animate(dt);
    }

    void Press(int i)
    {
        if (state != GameState.Playing || over || i < 0 || i >= rows * Cols) return;
        var c = CellCentre(i);
        int r = Tap(i);
        if (r == 4) { synth.Tone(180f, 0.08f, Wave.Square, 0.06f); return; }
        if (people[i] != null) { Destroy(people[i].gameObject); people[i] = null; }
        if (r == 3)
        {
            ride = 1f;
            sparkle.Emit(field.W(180f, 60f, -0.8f), new Color(1f, 0.83f, 0.23f), 18, 4f, 0.08f, 0.5f);
            synth.Tone(784f, 0.15f, Wave.Triangle, 0.14f, 1175f, 8f);
        }
        else if (r == 1)
        {
            sparkle.Emit(field.W(c.x, c.y, -0.6f), new Color(0.55f, 0.91f, 0.6f), 8, 2f, 0.06f, 0.3f);
            synth.Tone(523f, 0.06f, Wave.Triangle, 0.1f);
        }
        else synth.Tone(392f, 0.06f, Wave.Square, 0.06f);
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
                    // input is read once per frame: a tap on a hiker sends them out
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (state == GameState.Ready) { state = GameState.Playing; continue; }
                        if (OiyoArcade.OverUi(b.pos) || !field.ToField(b.pos, out Vector2 f)) continue;
                        int col = Mathf.FloorToInt((f.x - GX) / CW), row = Mathf.FloorToInt((f.y - GY) / CH);
                        if (col >= 0 && col < Cols && row >= 0 && row < rows) { cursor = row * Cols + col; Press(cursor); }
                    }
                    int r0 = cursor / Cols, k0 = cursor % Cols;
                    bool moved = true;
                    if (Input.GetKeyDown(KeyCode.UpArrow)) cursor = Mathf.Max(0, r0 - 1) * Cols + k0;
                    else if (Input.GetKeyDown(KeyCode.DownArrow)) cursor = Mathf.Min(rows - 1, r0 + 1) * Cols + k0;
                    else if (Input.GetKeyDown(KeyCode.LeftArrow)) cursor = r0 * Cols + Mathf.Max(0, k0 - 1);
                    else if (Input.GetKeyDown(KeyCode.RightArrow)) cursor = r0 * Cols + Mathf.Min(Cols - 1, k0 + 1);
                    else moved = false;
                    if (moved) { keyed = true; if (state == GameState.Ready) state = GameState.Playing; }
                    if (Input.GetKeyDown(KeyCode.Space) || confirm)
                    {
                        if (state == GameState.Ready) state = GameState.Playing;
                        else { keyed = true; Press(cursor); }
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
            OiyoArcade.Record(Slug, stageIdx, starsWon, Mathf.Max(0, (Bench - peak) * 100), StageCount);
            sparkle.Emit(field.W(180f, 280f, -1f), new Color(1f, 0.85f, 0.25f), 40, 5f, 0.1f, 1f);
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
        field.Fit(56f, 10f, 0f, 0f, GY + rows * CH + 10f);
        int col = Current;
        gondola.gameObject.SetActive(col >= 0);
        float gx = 180f - ride * ride * 220f;
        if (col >= 0)
        {
            gondolaR.sharedMaterial = jacketMat[col];
            gondola.position = field.W(gx, 60f, 0f);
            for (int k = 0; k < Seats; k++)
            {
                riders[k].gameObject.SetActive(k < aboard);
                ridersR[k].sharedMaterial = hikerMat[col];
                riders[k].position = field.W(gx - 28f + k * 28f, 62f, -0.4f);
            }
        }
        else foreach (var r in riders) r.gameObject.SetActive(false);
        for (int k = 0; k < 4; k++)
        {
            bool on = next + k + 1 < st.gondolas.Length;
            nextBoxes[k].gameObject.SetActive(on);
            if (on) nextR[k].sharedMaterial = jacketMat[st.gondolas[next + k + 1]];
        }
        for (int k = 0; k < Bench; k++)
        {
            benchPeople[k].gameObject.SetActive(k < bench.Count);
            if (k < bench.Count) benchR[k].sharedMaterial = hikerMat[bench[k]];
        }
        for (int i = 0; i < rows * Cols; i++)
            if (people[i] != null) peopleR[i].sharedMaterial = CanLeave(i) ? hikerMat[grid[i]] : hikerDim[grid[i]];
        cursorObj.gameObject.SetActive(keyed);
        var cc = CellCentre(cursor);
        cursorObj.position = field.W(cc.x, cc.y + CH / 2f - 4f, -0.3f);
    }

    // ?oiyotest=1 prints the state to the browser console for the automated play check, with the screen point (px from
    // the top-left) of the hiker the web's careful player taps next (its taps are exported with the stage).
    bool testLog; float testT;
    void TestTick(float dt)
    {
        if (!testLog) return;
        if ((testT -= dt) > 0f) return;
        testT = 0.05f;
        string nx = "null";
        if (state == GameState.Playing && !over && taps < st.plan.Length)
        {
            var c = CellCentre(st.plan[taps]);
            var sp = cam.WorldToScreenPoint(field.W(c.x, c.y, 0f));
            nx = $"[{sp.x:F1},{Screen.height - sp.y:F1}]";
        }
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"taps\":{taps},\"gondola\":{next},\"of\":{st.gondolas.Length},\"bench\":{bench.Count},\"peak\":{peak},\"par\":{st.par},\"next\":{nx},\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.1f, 0.44f, 0.76f, 0.97f);
    static readonly Color Dark = new Color(0.1f, 0.11f, 0.12f, 0.9f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("{0} gondolas", GondolaQueueStages.All[i].gondolas.Length);

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(0.85f, 0.93f, 1f), U("Gondola Queue"),
                U("Tap hikers with a clear way out. Three of the gondola's colour ride up; anyone else waits on the bench. Five on the bench jams the station."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        var bar = new Rect(8f, 8f, w - 16f, 44f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 18f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>  " + F("Gondola {0}/{1}", Mathf.Min(next + 1, st.gondolas.Length), st.gondolas.Length) + "   " + F("Bench {0}/{1}", bench.Count, Bench), 15, new Color(0.85f, 0.93f, 1f));
        if (OiyoArcade.Button(new Rect(w - 56f, 12f, 40f, 36f), "<b>II</b>", OiyoScreens.Slate, 16))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap to start"), U("Tap a hiker with a clear way out!"), 120f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            string detail = won ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : "";
            string body = $"<size=14>{F("Bench peaked at {0}", peak)}</size>";
            int r = OiyoScreens.Result(w, h, Dark, Accent, won, ResultLive, won ? U("Everyone is up the mountain!") : U("The bench is full"), detail, body,
                won && stageIdx < StageCount - 1 ? U("Next stage") : null, won && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
