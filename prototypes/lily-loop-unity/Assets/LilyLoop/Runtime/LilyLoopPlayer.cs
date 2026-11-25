using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Lily Loop 3D: the web Lily Loop (src/components/games/LilyLoop.tsx, src/lib/games/lily-loop.ts) rebuilt in Unity on
// the web's own 360 × 560 px field (OiyoField). Send frogs onto the lily-pad loop: each rides once around the berry
// mosaic, eating the berries of its colour it can see from the edge; hungry ones wait on a pad. Eat the whole picture.
// The 30 ponds are the web's own (LilyLoopStages.cs).
public class LilyLoopPlayer : MonoBehaviour
{
    const string Slug = "lily-loop";
    const int StageCount = 30;
    const int Empty = -1, BeltMax = 4;
    const float TickS = 1f / 12f, Board = 264f, Top = 92f, Ring = 18f, PadY = 432f, LaneY = 500f;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of lily-loop.ts) ----------------
    class Frog { public int color, ammo, pos; }
    LilyLoopStages.Level st;
    int stageIdx, starsWon, sends, rows, cols;
    int[] cells;
    List<int[]>[] lanes;
    int[][] pads;
    readonly List<Frog> belt = new List<Frog>();
    bool over, won;
    string why = "";

    int Lap => 2 * (rows + cols);

    IEnumerable<int> LineAt(int p)
    {
        if (p < cols) { for (int r = 0; r < rows; r++) yield return r * cols + p; }
        else if (p < cols + rows) { for (int c = cols - 1; c >= 0; c--) yield return (p - cols) * cols + c; }
        else if (p < 2 * cols + rows) { int c = cols - 1 - (p - cols - rows); for (int r = rows - 1; r >= 0; r--) yield return r * cols + c; }
        else { int r = rows - 1 - (p - 2 * cols - rows); for (int c = 0; c < cols; c++) yield return r * cols + c; }
    }

    bool CanSend()
    {
        if (over || belt.Count >= BeltMax) return false;
        foreach (var f in belt) if (f.pos < 2) return false;
        return true;
    }

    bool Send(int choice)
    {
        if (!CanSend()) return false;
        int[] frog;
        if (choice >= 100) { frog = pads[choice - 100]; if (frog == null) return false; pads[choice - 100] = null; }
        else { if (choice >= lanes.Length || lanes[choice].Count == 0) return false; frog = lanes[choice][0]; lanes[choice].RemoveAt(0); }
        belt.Add(new Frog { color = frog[0], ammo = frog[1], pos = -1 });
        sends++;
        return true;
    }

    void Tick(List<int> ate)
    {
        if (over) return;
        foreach (var f in belt)
        {
            f.pos++;
            if (f.pos >= Lap) continue;
            foreach (int i in LineAt(f.pos))
            {
                if (cells[i] == Empty) continue;
                if (cells[i] != f.color || f.ammo <= 0) break;
                cells[i] = Empty;
                f.ammo--;
                ate.Add(i);
            }
        }
        var done = belt.FindAll(f => f.pos >= Lap);
        belt.RemoveAll(f => f.pos >= Lap);
        foreach (var f in done)
        {
            if (f.ammo <= 0) continue;
            int k = System.Array.IndexOf(pads, null);
            if (k < 0) { over = true; why = "jam"; return; }
            pads[k] = new[] { f.color, f.ammo };
        }
        bool any = false;
        foreach (int v in cells) if (v != Empty) any = true;
        if (!any) { over = true; won = true; return; }
        bool frogsLeft = belt.Count > 0;
        foreach (var l in lanes) if (l.Count > 0) frogsLeft = true;
        foreach (var p in pads) if (p != null) frogsLeft = true;
        if (!frogsLeft) { over = true; why = "hungry"; }
    }

    int StarsFor()
    {
        if (!won) return 0;
        if (sends <= st.par + 1) return 3;
        if (sends <= st.par + 3) return 2;
        return 1;
    }

    List<int> Choices()
    {
        var cs = new List<int>();
        for (int k = 0; k < lanes.Length; k++) if (lanes[k].Count > 0) cs.Add(k);
        for (int k = 0; k < pads.Length; k++) if (pads[k] != null) cs.Add(100 + k);
        return cs;
    }

    // ---------------- Scene ----------------
    OiyoField field;
    Camera cam;
    Transform root, pickObj;
    Transform[] berryObj;
    Material[] berryMat, frogMat;
    readonly List<Transform> beltObj = new List<Transform>();
    Transform[] padFrog;
    Transform[][] laneFrog;
    Bursts burst;
    Synth synth;
    bool showStages, keyed;
    int pickI;
    float acc, cell, ox, oy;

    Color ColorOf(int k) => new Color(st.colors[3 * k], st.colors[3 * k + 1], st.colors[3 * k + 2]);
    float PadX(int k) => 180f + (k - (pads.Length - 1) / 2f) * 64f;
    float LaneX(int k) => 180f + (k - (lanes.Length - 1) / 2f) * 104f;

    Vector2 RingAt(int p)
    {
        int q = Mathf.Max(0, p);
        if (q < cols) return new Vector2(ox + (q + 0.5f) * cell, oy - Ring);
        if (q < cols + rows) return new Vector2(ox + cols * cell + Ring, oy + (q - cols + 0.5f) * cell);
        if (q < 2 * cols + rows) return new Vector2(ox + (cols - 1 - (q - cols - rows) + 0.5f) * cell, oy + rows * cell + Ring);
        return new Vector2(ox - Ring, oy + (rows - 1 - (q - 2 * cols - rows) + 0.5f) * cell);
    }

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(360f, 560f, new Color(0.77f, 0.96f, 0.98f));
        cam = field.Cam;
        OiyoField.Lights(new Color(0.78f, 0.78f, 0.78f), 0.7f, 50f, -25f);
        burst = new Bursts(transform, 0.5f);
        synth = new Synth(gameObject);
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int i, bool ready = true)
    {
        stageIdx = Mathf.Clamp(i, 0, StageCount - 1);
        StopAllCoroutines();
        st = LilyLoopStages.All[stageIdx];
        rows = st.rows; cols = st.cols;
        cells = (int[])st.cells.Clone();
        lanes = new List<int[]>[st.laneLen.Length];
        int at = 0;
        for (int k = 0; k < lanes.Length; k++)
        {
            lanes[k] = new List<int[]>();
            for (int j = 0; j < st.laneLen[k]; j++) { lanes[k].Add(new[] { st.frogs[at], st.frogs[at + 1] }); at += 2; }
        }
        pads = new int[st.pads][];
        belt.Clear();
        sends = 0; over = false; won = false; why = ""; starsWon = 0; acc = 0f; keyed = false; pickI = 0;
        cell = Mathf.Floor(Mathf.Min(Board / cols, Board / rows));
        ox = Mathf.Round((360f - cols * cell) / 2f);
        oy = Mathf.Round(Top + (Board - rows * cell) / 2f);
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Pond").transform;
        beltObj.Clear();
        showStages = false;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Animate();
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
        Box("Water", OiyoArcade.Glow(new Color(0.77f, 0.96f, 0.98f)), 180f, 280f, 1200f, 1600f, 0.8f, 0.2f);
        var ripple = OiyoArcade.Glow(new Color(0.6f, 0.91f, 0.95f));
        for (int y = 8; y < 600; y += 22) Box("Ripple", ripple, (y * 7) % 40 + 13f, y, 26f, 2f, 0.7f, 0.02f);
        // the lily-pad loop around the mosaic, and the mosaic's backing
        var pad = OiyoArcade.Lit(new Color(0.55f, 0.91f, 0.6f), 0.2f);
        float bw = cols * cell + 2f * Ring, bh = rows * cell + 2f * Ring;
        Box("LoopT", pad, ox + cols * cell / 2f, oy - Ring, bw + 18f, 18f, 0.2f, 0.05f);
        Box("LoopB", pad, ox + cols * cell / 2f, oy + rows * cell + Ring, bw + 18f, 18f, 0.2f, 0.05f);
        Box("LoopL", pad, ox - Ring, oy + rows * cell / 2f, 18f, bh + 18f, 0.2f, 0.05f);
        Box("LoopR", pad, ox + cols * cell + Ring, oy + rows * cell / 2f, 18f, bh + 18f, 0.2f, 0.05f);
        Box("Backing", OiyoArcade.Glow(new Color(0.89f, 0.98f, 0.99f)), ox + cols * cell / 2f, oy + rows * cell / 2f, cols * cell + 4f, rows * cell + 4f, 0.25f, 0.02f);
        int nColors = st.colors.Length / 3;
        berryMat = new Material[nColors];
        frogMat = new Material[nColors];
        var frogTex = OiyoArcade.Art("LL/frog");
        for (int k = 0; k < nColors; k++)
        {
            berryMat[k] = OiyoArcade.Lit(ColorOf(k), 0.45f);
            frogMat[k] = OiyoArcade.Transparent(frogTex, ColorOf(k));
        }
        berryObj = new Transform[cells.Length];
        for (int i = 0; i < cells.Length; i++)
        {
            if (cells[i] == Empty) continue;
            float x = ox + (i % cols + 0.5f) * cell, y = oy + (i / cols + 0.5f) * cell;
            berryObj[i] = Box("Berry", berryMat[cells[i]], x, y, cell - 2f, cell - 2f, -0.05f, OiyoField.U(cell * 0.5f));
        }
        var padMat = OiyoField.Sprite("LL/pad");
        padFrog = new Transform[pads.Length];
        for (int k = 0; k < pads.Length; k++)
        {
            OiyoField.Quad("Pad", padMat, root, 40f, 28f).position = field.W(PadX(k), PadY, -0.1f);
            padFrog[k] = OiyoField.Quad("PadFrog", frogMat[0], root, 30f, 24f);
        }
        laneFrog = new Transform[lanes.Length][];
        for (int k = 0; k < lanes.Length; k++)
        {
            laneFrog[k] = new Transform[3];
            for (int j = 0; j < 3; j++) laneFrog[k][j] = OiyoField.Quad("LaneFrog", frogMat[0], root, j == 0 ? 40f : 20f, j == 0 ? 32f : 16f);
        }
        pickObj = Box("Pick", OiyoArcade.Glow(new Color(0.11f, 0.49f, 0.84f)), 0f, 0f, 48f, 3f, -0.6f, 0.02f);
    }

    // ---------------- Loop ----------------
    readonly List<int> ate = new List<int>();

    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("lily-loop", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick();
        ReadInput();
        if (state == GameState.Playing && !over && belt.Count > 0)
        {
            acc += dt;
            while (acc >= TickS && !over)
            {
                acc -= TickS;
                int padsBefore = 0; foreach (var p in pads) if (p != null) padsBefore++;
                ate.Clear();
                Tick(ate);
                foreach (int i in ate)
                {
                    if (berryObj[i] == null) continue;
                    burst.Emit(berryObj[i].position + new Vector3(0f, 0f, -0.3f), ColorOf(st.cells[i]), 3, 1.5f, 0.04f, 0.3f);
                }
                if (ate.Count > 0) synth.Tone(700f + ate.Count * 40f, 0.03f, Wave.Triangle, 0.05f);
                int padsAfter = 0; foreach (var p in pads) if (p != null) padsAfter++;
                if (padsAfter > padsBefore) synth.Tone(330f, 0.08f, Wave.Triangle, 0.08f);
                if (belt.Count == 0) acc = 0f;
            }
            if (over) End();
        }
        Animate();
    }

    void SendOne(int choice)
    {
        if (state != GameState.Playing) return;
        if (Send(choice)) synth.Tone(523f, 0.06f, Wave.Triangle, 0.1f, 784f);
        else synth.Tone(196f, 0.06f, Wave.Square, 0.05f);
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
                    // input is read once per frame: tap a line's front frog or a waiting one
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (state == GameState.Ready) { state = GameState.Playing; continue; }
                        keyed = false;
                        if (!field.ToField(b.pos, out Vector2 f)) continue;
                        if (Mathf.Abs(f.y - PadY) < 28f) { for (int k = 0; k < pads.Length; k++) if (pads[k] != null && Mathf.Abs(f.x - PadX(k)) < 30f) SendOne(100 + k); }
                        else if (f.y > LaneY - 30f) { for (int k = 0; k < lanes.Length; k++) if (lanes[k].Count > 0 && Mathf.Abs(f.x - LaneX(k)) < 48f) SendOne(k); }
                    }
                    var cs = Choices();
                    int dir = Input.GetKeyDown(KeyCode.LeftArrow) ? -1 : Input.GetKeyDown(KeyCode.RightArrow) ? 1 : 0;
                    if (dir != 0 && cs.Count > 0)
                    {
                        if (state == GameState.Ready) state = GameState.Playing;
                        if (!keyed) keyed = true; else pickI = (pickI + dir + cs.Count) % cs.Count;
                    }
                    if (Input.GetKeyDown(KeyCode.Space) || confirm)
                    {
                        if (state == GameState.Ready) state = GameState.Playing;
                        else if (!keyed) keyed = true;
                        else if (cs.Count > 0) SendOne(cs[pickI % cs.Count]);
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
            OiyoArcade.Record(Slug, stageIdx, starsWon, Mathf.Max(0, (st.par * 2 - sends) * 10), StageCount);
            burst.Emit(field.W(180f, 220f, -1f), new Color(0.41f, 0.86f, 0.49f), 40, 4f, 0.1f, 1f);
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
        foreach (var f in fs) { synth.Tone(f, 0.18f, Wave.Triangle, 0.22f, 0f, 6f); yield return new WaitForSeconds(gap); }
    }

    void Animate()
    {
        if (root == null) return;
        field.Fit(56f, 10f, 0f, 60f, 545f);
        for (int i = 0; i < cells.Length; i++) if (berryObj[i] != null) berryObj[i].gameObject.SetActive(cells[i] != Empty);
        while (beltObj.Count < belt.Count) beltObj.Add(OiyoField.Quad("Rider", frogMat[0], root, 24f, 20f));
        for (int k = 0; k < beltObj.Count; k++)
        {
            bool on = k < belt.Count;
            beltObj[k].gameObject.SetActive(on);
            if (!on) continue;
            var rp = RingAt(belt[k].pos);
            beltObj[k].position = field.W(rp.x, rp.y, -0.4f);
            beltObj[k].GetComponent<Renderer>().sharedMaterial = frogMat[belt[k].color];
        }
        for (int k = 0; k < pads.Length; k++)
        {
            padFrog[k].gameObject.SetActive(pads[k] != null);
            if (pads[k] == null) continue;
            padFrog[k].position = field.W(PadX(k), PadY - 6f, -0.3f);
            padFrog[k].GetComponent<Renderer>().sharedMaterial = frogMat[pads[k][0]];
        }
        for (int k = 0; k < lanes.Length; k++)
        {
            for (int j = 0; j < 3; j++)
            {
                bool on = j < lanes[k].Count;
                laneFrog[k][j].gameObject.SetActive(on);
                if (!on) continue;
                laneFrog[k][j].position = field.W(LaneX(k), LaneY + j * 22f, -0.3f + j * 0.05f);
                laneFrog[k][j].GetComponent<Renderer>().sharedMaterial = frogMat[lanes[k][j][0]];
            }
        }
        var cs = Choices();
        pickObj.gameObject.SetActive(keyed && cs.Count > 0 && !over);
        if (keyed && cs.Count > 0)
        {
            int c0 = cs[pickI % cs.Count];
            pickObj.position = c0 >= 100 ? field.W(PadX(c0 - 100), PadY + 20f, -0.6f) : field.W(LaneX(c0), LaneY + 22f, -0.6f);
        }
    }

    // ?oiyotest=1 prints the state to the browser console every frame for the automated play check: when the loop is
    // empty, the screen point of the frog the pond's own plan sends next.
    bool testLog;
    void TestTick()
    {
        if (!testLog) return;
        string nx = "null";
        if (state == GameState.Playing && !over && belt.Count == 0 && sends < st.plan.Length)
        {
            int c0 = st.plan[sends];
            var sp = cam.WorldToScreenPoint(c0 >= 100 ? field.W(PadX(c0 - 100), PadY - 6f, 0f) : field.W(LaneX(c0), LaneY, 0f));
            nx = $"[{sp.x:F1},{Screen.height - sp.y:F1}]";
        }
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"taps\":{sends},\"par\":{st.par},\"why\":\"{why}\",\"next\":{nx},\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.13f, 0.72f, 0.81f, 0.97f);
    static readonly Color Dark = new Color(0.04f, 0.2f, 0.24f, 0.9f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("{0} colours", LilyLoopStages.All[i].colors.Length / 3);

    void Label(Vector2 fieldPt, string text, int size)
    {
        var sp = cam.WorldToScreenPoint(field.W(fieldPt.x, fieldPt.y, 0f));
        var gp = OiyoArcade.ToGui(new Vector2(sp.x, sp.y));
        OiyoArcade.Shadowed(new Rect(gp.x - 20f, gp.y - 10f, 40f, 20f), $"<b>{text}</b>", size, Color.white, TextAnchor.MiddleCenter);
    }

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(0.9f, 1f, 1f), U("Lily Loop"),
                U("Tap a frog to send it once around the berry picture: it eats the berries of its colour it can see from the edge. A hungry frog waits on a pad. Don't let the pads fill up. Eat the whole picture."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        // how many berries each frog can still eat
        if (state == GameState.Playing || state == GameState.Ready)
        {
            foreach (var f in belt) Label(RingAt(f.pos), f.ammo.ToString(), 11);
            for (int k = 0; k < pads.Length; k++) if (pads[k] != null) Label(new Vector2(PadX(k), PadY - 4f), pads[k][1].ToString(), 13);
            for (int k = 0; k < lanes.Length; k++)
            {
                if (lanes[k].Count > 0) Label(new Vector2(LaneX(k), LaneY + 2f), lanes[k][0][1].ToString(), 14);
                if (lanes[k].Count > 3) Label(new Vector2(LaneX(k) + 34f, LaneY + 40f), "+" + (lanes[k].Count - 3), 11);
            }
        }
        var bar = new Rect(8f, 8f, w - 16f, 44f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 18f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>  " + F("Frogs sent {0}", sends), 15, new Color(0.9f, 1f, 1f));
        if (OiyoArcade.Button(new Rect(w - 56f, 12f, 40f, 36f), "<b>II</b>", OiyoScreens.Slate, 16))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap to start"), U("Tap a frog to send it round!"), 150f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            string detail = won ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : "";
            string body = won ? $"<size=14>{F("Eaten up in {0} sends", sends)}</size>" : "";
            string head = won ? U("The whole picture's eaten!") : why == "jam" ? U("The waiting pads are full") : U("No hungry frogs left");
            int r = OiyoScreens.Result(w, h, Dark, Accent, won, ResultLive, head, detail, body,
                won && stageIdx < StageCount - 1 ? U("Next stage") : null, won && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
