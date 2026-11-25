using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Sunny Pots 3D: the web Sunny Pots (src/components/games/SunnyPots.tsx, src/lib/games/sunny-pots.ts) rebuilt in Unity
// on the web's own 360 × 560 px field (OiyoField). Walk the gardener around the sunroom and push every flower pot onto
// a patch of sun; pots only push, never pull, and undo takes back any step. The 30 rooms are the web's own
// (SunnyPotsStages.cs).
public class SunnyPotsPlayer : MonoBehaviour
{
    const string Slug = "sunny-pots";
    const int StageCount = 30;
    const float Top = 80f, Area = 400f, StepS = 0.09f;
    static readonly int[] DX = { 0, 1, 0, -1 };
    static readonly int[] DY = { -1, 0, 1, 0 };

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of sunny-pots.ts) ----------------
    SunnyPotsStages.Level st;
    int stageIdx, starsWon, player, pushes;
    int[] pots;
    readonly List<int[]> history = new List<int[]>(); // [player before, pot index pushed or −1]
    bool won;

    int Moves => history.Count;

    int Step(int i, int d)
    {
        int x = i % st.w + DX[d], y = i / st.w + DY[d];
        if (x < 0 || y < 0 || x >= st.w || y >= st.h) return -1;
        return y * st.w + x;
    }

    bool Open(int i) => i >= 0 && st.cells[i] == 0;
    bool Solved() { foreach (int p in pots) if (System.Array.IndexOf(st.marks, p) < 0) return false; return true; }

    bool Walk(int d)
    {
        if (won) return false;
        int to = Step(player, d);
        if (!Open(to)) return false;
        int k = System.Array.IndexOf(pots, to);
        if (k >= 0)
        {
            int beyond = Step(to, d);
            if (!Open(beyond) || System.Array.IndexOf(pots, beyond) >= 0) return false;
            pots[k] = beyond;
            pushes++;
        }
        history.Add(new[] { player, k });
        player = to;
        if (Solved()) won = true;
        return true;
    }

    bool Undo()
    {
        if (history.Count == 0 || won) return false;
        var last = history[history.Count - 1];
        history.RemoveAt(history.Count - 1);
        if (last[1] >= 0) { pots[last[1]] = player; pushes--; }
        player = last[0];
        return true;
    }

    int StarsFor()
    {
        if (!won) return 0;
        int p = st.par, m = Moves;
        if (m <= Mathf.CeilToInt(p * 1.25f) + 2) return 3;
        if (m <= Mathf.CeilToInt(p * 1.7f) + 6) return 2;
        return 1;
    }

    List<int> PathTo(int goal)
    {
        var prev = new Dictionary<int, int[]> { [player] = new[] { -1, -1 } };
        var q = new Queue<int>();
        q.Enqueue(player);
        while (q.Count > 0)
        {
            int i = q.Dequeue();
            if (i == goal) break;
            for (int d = 0; d < 4; d++)
            {
                int j = Step(i, d);
                if (!Open(j) || System.Array.IndexOf(pots, j) >= 0 || prev.ContainsKey(j)) continue;
                prev[j] = new[] { i, d };
                q.Enqueue(j);
            }
        }
        var outPath = new List<int>();
        if (!prev.ContainsKey(goal)) return outPath;
        for (int cur = goal; cur != player;) { var pv = prev[cur]; outPath.Add(pv[1]); cur = pv[0]; }
        outPath.Reverse();
        return outPath;
    }

    // ---------------- Scene ----------------
    OiyoField field;
    Camera cam;
    Transform root, gardener;
    Transform[] potObj;
    Renderer[] potRen;
    Material potMat, bloomMat;
    Bursts burst;
    Synth synth;
    bool showStages;
    readonly Queue<int> queue = new Queue<int>();
    float wait, cell, ox, oy;
    Vector2 swipeFrom;
    int swipeId = -1;

    Vector2 Centre(int i) => new Vector2(ox + (i % st.w + 0.5f) * cell, oy + (i / st.w + 0.5f) * cell);

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(360f, 560f, new Color(0.92f, 0.98f, 0.93f));
        cam = field.Cam;
        OiyoField.Lights(new Color(0.78f, 0.78f, 0.75f), 0.7f, 50f, -25f);
        burst = new Bursts(transform, 0.5f);
        synth = new Synth(gameObject);
        potMat = OiyoField.Sprite("SP/pot");
        bloomMat = OiyoField.Sprite("SP/bloom");
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int i, bool ready = true)
    {
        stageIdx = Mathf.Clamp(i, 0, StageCount - 1);
        StopAllCoroutines();
        st = SunnyPotsStages.All[stageIdx];
        pots = (int[])st.pots.Clone();
        player = st.player; pushes = 0; history.Clear(); queue.Clear();
        won = false; starsWon = 0; wait = 0f; planAt = 0;
        cell = Mathf.Floor(Mathf.Min(340f / st.w, Area / st.h));
        ox = Mathf.Round((360f - st.w * cell) / 2f);
        oy = Mathf.Round(Top + (Area - st.h * cell) / 2f);
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Sunroom").transform;
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
        Box("Back", OiyoArcade.Glow(new Color(0.92f, 0.98f, 0.93f)), 180f, 280f, 1200f, 1600f, 0.8f, 0.2f);
        var floorA = OiyoArcade.Lit(new Color(0.95f, 0.85f, 0.69f), 0.15f);
        var floorB = OiyoArcade.Lit(new Color(0.93f, 0.82f, 0.64f), 0.15f);
        var hedge = OiyoArcade.Lit(new Color(0.55f, 0.91f, 0.6f), 0.2f);
        var sun = OiyoArcade.Glow(new Color(1f, 0.88f, 0.4f));
        var sunHi = OiyoArcade.Glow(new Color(1f, 0.95f, 0.75f));
        for (int i = 0; i < st.cells.Length; i++)
        {
            var c = Centre(i);
            if (st.cells[i] == 1) { Box("Hedge", hedge, c.x, c.y, cell - 1f, cell - 1f, 0f, OiyoField.U(cell * 0.6f)); continue; }
            Box("Floor", (i % st.w + i / st.w) % 2 == 0 ? floorA : floorB, c.x, c.y, cell, cell, 0.3f, 0.05f);
            if (System.Array.IndexOf(st.marks, i) >= 0)
            {
                Box("Sun", sun, c.x, c.y, cell - 6f, cell - 6f, 0.2f, 0.02f);
                Box("Glint", sunHi, c.x - cell / 6f, c.y - cell / 3f + 4f, cell / 3f, 3f, 0.15f, 0.02f);
            }
        }
        potObj = new Transform[pots.Length];
        potRen = new Renderer[pots.Length];
        float s = cell * 0.95f;
        for (int k = 0; k < pots.Length; k++)
        {
            potObj[k] = OiyoField.Quad("Pot", potMat, root, s, s);
            potRen[k] = potObj[k].GetComponent<Renderer>();
        }
        gardener = OiyoField.Quad("Gardener", OiyoField.Sprite("SP/gardener"), root, s, s);
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("sunny-pots", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        wait = Mathf.Max(0f, wait - dt);
        if (state == GameState.Playing && wait == 0f && queue.Count > 0 && !won) { Go(queue.Dequeue()); wait = StepS; }
        Animate(dt);
    }

    void Go(int d)
    {
        if (state != GameState.Playing || won) return;
        int before = pushes;
        if (!Walk(d)) { queue.Clear(); return; }
        if (planAt < st.plan.Length && st.plan[planAt] == d) planAt++; else planAt = st.plan.Length + 1;
        synth.Tone(pushes > before ? 392f : 523f, 0.05f, Wave.Triangle, 0.08f);
        if (won) End();
    }

    void Back()
    {
        if (state != GameState.Playing || won) return;
        queue.Clear();
        if (Undo()) synth.Tone(330f, 0.05f, Wave.Triangle, 0.06f);
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
                    // input is read once per frame: a swipe is a step; a tap next to the gardener a step; further away, a walk
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (state == GameState.Ready) { state = GameState.Playing; continue; }
                        if (OiyoArcade.OverUi(b.pos)) continue;
                        swipeFrom = b.pos; swipeId = b.id;
                    }
                    foreach (var e in OiyoArcade.Ended())
                    {
                        if (e.id != swipeId) continue;
                        swipeId = -1;
                        if (!field.ToField(swipeFrom, out Vector2 f0) || !field.ToField(e.pos, out Vector2 f1)) continue;
                        Vector2 dv = f1 - f0;
                        if (dv.magnitude >= 24f) { queue.Clear(); Go(Mathf.Abs(dv.x) > Mathf.Abs(dv.y) ? (dv.x > 0 ? 1 : 3) : dv.y > 0 ? 2 : 0); continue; }
                        int cx = Mathf.FloorToInt((f1.x - ox) / cell), cy = Mathf.FloorToInt((f1.y - oy) / cell);
                        if (cx < 0 || cy < 0 || cx >= st.w || cy >= st.h) continue;
                        int px = player % st.w, py = player / st.w, dir = -1;
                        for (int d = 0; d < 4; d++) if (px + DX[d] == cx && py + DY[d] == cy) dir = d;
                        queue.Clear();
                        if (dir >= 0) Go(dir); else foreach (int d in PathTo(cy * st.w + cx)) queue.Enqueue(d);
                    }
                    int key = Input.GetKeyDown(KeyCode.UpArrow) || Input.GetKeyDown(KeyCode.W) ? 0 : Input.GetKeyDown(KeyCode.RightArrow) || Input.GetKeyDown(KeyCode.D) ? 1 : Input.GetKeyDown(KeyCode.DownArrow) || Input.GetKeyDown(KeyCode.S) ? 2 : Input.GetKeyDown(KeyCode.LeftArrow) || Input.GetKeyDown(KeyCode.A) ? 3 : -1;
                    if (key >= 0) { if (state == GameState.Ready) state = GameState.Playing; queue.Clear(); Go(key); }
                    if (Input.GetKeyDown(KeyCode.Z) || Input.GetKeyDown(KeyCode.Backspace)) Back();
                    if ((Input.GetKeyDown(KeyCode.Space) || confirm) && state == GameState.Ready) state = GameState.Playing;
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
        starsWon = StarsFor();
        state = GameState.Victory;
        OiyoArcade.Record(Slug, stageIdx, starsWon, Mathf.Max(0, (st.par * 2 - Moves) * 10), StageCount);
        foreach (int p in pots) { var c = Centre(p); burst.Emit(field.W(c.x, c.y, -0.8f), new Color(0.97f, 0.51f, 0.67f), 14, 3f, 0.08f, 0.8f); }
        StartCoroutine(Arp(new[] { 523f, 659f, 784f, 1047f }, 0.1f));
    }

    IEnumerator Arp(float[] fs, float gap)
    {
        foreach (var f in fs) { synth.Tone(f, 0.18f, Wave.Triangle, 0.22f, 0f, 6f); yield return new WaitForSeconds(gap); }
    }

    void Animate(float dt)
    {
        if (root == null) return;
        field.Fit(56f, 110f, 0f, oy - 20f, oy + st.h * cell + 20f);
        for (int k = 0; k < pots.Length; k++)
        {
            var c = Centre(pots[k]);
            potObj[k].position = field.W(c.x, c.y, -0.3f);
            potRen[k].sharedMaterial = System.Array.IndexOf(st.marks, pots[k]) >= 0 ? bloomMat : potMat;
        }
        var g = Centre(player);
        gardener.position = field.W(g.x, g.y, -0.35f);
        float bob = state == GameState.Victory ? Mathf.Abs(Mathf.Sin(Time.time * 8f)) * 0.12f : 0f;
        gardener.localScale = new Vector3(OiyoField.U(cell * 0.95f), OiyoField.U(cell * 0.95f) * (1f + bob), 1f);
    }

    // ?oiyotest=1 prints the state to the browser console for the automated play check, with the screen point of the
    // square next to the gardener that the room's own plan steps onto next.
    bool testLog; float testT; int planAt;
    void TestTick(float dt)
    {
        if (!testLog) return;
        if ((testT -= dt) > 0f) return;
        testT = 0.05f;
        string nx = "null";
        if (state == GameState.Playing && !won && planAt < st.plan.Length && queue.Count == 0)
        {
            var c = Centre(Step(player, st.plan[planAt]));
            var sp = cam.WorldToScreenPoint(field.W(c.x, c.y, 0f));
            nx = $"[{sp.x:F1},{Screen.height - sp.y:F1}]";
        }
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"taps\":{Moves},\"par\":{st.par},\"next\":{nx},\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.25f, 0.75f, 0.34f, 0.97f);
    static readonly Color Dark = new Color(0.1f, 0.2f, 0.12f, 0.9f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("Pots {0}", SunnyPotsStages.All[i].pots.Length);

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(0.9f, 1f, 0.9f), U("Sunny Pots"),
                U("Walk the gardener around the sunroom and push every flower pot onto a patch of sun. Pots only push, never pull. Stuck? Undo as many steps as you like."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        var bar = new Rect(8f, 8f, w - 16f, 44f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 18f, w - 160f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>  " + F("Steps {0}", Moves), 15, new Color(0.9f, 1f, 0.9f));
        if (OiyoArcade.Button(new Rect(w - 128f, 12f, 66f, 36f), "<b>" + U("Undo") + "</b>", OiyoScreens.Slate, 13)) Back();
        if (OiyoArcade.Button(new Rect(w - 56f, 12f, 40f, 36f), "<b>II</b>", OiyoScreens.Slate, 16))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap to start"), U("Push the pots into the sun!"), 120f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory)
        {
            string detail = $"<size=30>{OiyoArcade.StarString(starsWon)}</size>";
            string body = $"<size=14>{F("Tidied in {0} steps", Moves)}</size>";
            int r = OiyoScreens.Result(w, h, Dark, Accent, true, ResultLive, U("Everything's in bloom!"), detail, body,
                stageIdx < StageCount - 1 ? U("Next stage") : null, stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
