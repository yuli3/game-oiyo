using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Bee Lines 3D: the web Bee Lines (src/components/games/BeeLines.tsx, src/lib/games/bee-lines.ts) rebuilt in Unity on
// the web's own 360 × 560 px field (OiyoField). Drag from a flower square by square to its twin to draw a bee's
// trail; trails can't cross, and a new one cuts an old. Join every pair and fill the meadow. The 30 meadows are the
// web's own (BeeLinesStages.cs).
public class BeeLinesPlayer : MonoBehaviour
{
    const string Slug = "bee-lines";
    const int StageCount = 30, Empty = -1;
    const float Top = 84f, Area = 400f;
    static readonly Color[] PairColors =
    {
        C("#f03e3e"), C("#1c7ed6"), C("#f59f00"), C("#37b24d"), C("#ae3ec9"), C("#f76707"), C("#0ca678"), C("#e64980"), C("#4263eb"), C("#82c91e"), C("#868e96"),
    };
    static Color C(string hex) { ColorUtility.TryParseHtmlString(hex, out Color c); return c; }

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of bee-lines.ts) ----------------
    BeeLinesStages.Level st;
    int stageIdx, starsWon, n, k, strokes, drawing = -1;
    List<int>[] trails;
    int[] owner;
    bool won;

    int FlowerAt(int i) { for (int p = 0; p < k; p++) if (st.pairs[2 * p] == i || st.pairs[2 * p + 1] == i) return p; return -1; }
    bool Near(int a, int b) => Mathf.Abs(a % n - b % n) + Mathf.Abs(a / n - b / n) == 1;

    bool Joined(int p)
    {
        var t = trails[p];
        int a = st.pairs[2 * p], b = st.pairs[2 * p + 1];
        return t.Count >= 2 && ((t[0] == a && t[t.Count - 1] == b) || (t[0] == b && t[t.Count - 1] == a));
    }

    void ClearTrail(int p, int keep = 0)
    {
        var t = trails[p];
        for (int j = keep; j < t.Count; j++) if (FlowerAt(t[j]) != p) owner[t[j]] = Empty;
        if (keep < t.Count) t.RemoveRange(keep, t.Count - keep);
    }

    bool Begin(int i)
    {
        if (won) return false;
        int f = FlowerAt(i);
        if (f >= 0) { ClearTrail(f); trails[f].Add(i); drawing = f; strokes++; return true; }
        int p = owner[i];
        if (p < 0) return false;
        int at = trails[p].IndexOf(i);
        if (at < 0) return false;
        ClearTrail(p, at + 1);
        drawing = p; strokes++;
        return true;
    }

    bool Extend(int i)
    {
        int p = drawing;
        if (won || p < 0) return false;
        var t = trails[p];
        int last = t[t.Count - 1];
        if (i == last || !Near(last, i)) return false;
        int back = t.IndexOf(i);
        if (back >= 0) { ClearTrail(p, back + 1); return true; }
        if (Joined(p)) return false;
        int f = FlowerAt(i);
        if (f >= 0 && f != p) return false;
        int other = owner[i];
        if (other >= 0 && other != p)
        {
            int at = trails[other].IndexOf(i);
            ClearTrail(other, Mathf.Max(1, at));
            if (trails[other].Count == 1 && FlowerAt(trails[other][0]) != other) trails[other].Clear();
        }
        t.Add(i);
        owner[i] = p;
        return true;
    }

    void EndStroke()
    {
        drawing = -1;
        bool all = true;
        for (int p = 0; p < k; p++) if (!Joined(p)) all = false;
        foreach (int v in owner) if (v == Empty) all = false;
        if (all) won = true;
    }

    int StarsFor()
    {
        if (!won) return 0;
        if (strokes <= k + Mathf.CeilToInt(k / 2f)) return 3;
        if (strokes <= k * 2 + 2) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    OiyoField field;
    Camera cam;
    Transform root, bee, cursorObj;
    Transform[] tint;
    Renderer[] tintRen;
    Material[] pairMat, washMat;
    readonly List<Transform> segs = new List<Transform>();
    Bursts burst;
    Synth synth;
    bool showStages, keyed;
    int downId = -1, curI;
    float cell, ox, oy;

    Vector2 Centre(int i) => new Vector2(ox + (i % n + 0.5f) * cell, oy + (i / n + 0.5f) * cell);

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(360f, 560f, new Color(0.9f, 0.99f, 0.96f));
        cam = field.Cam;
        OiyoField.Lights(new Color(0.78f, 0.78f, 0.76f), 0.7f, 50f, -25f);
        burst = new Bursts(transform, 0.5f);
        synth = new Synth(gameObject);
        pairMat = new Material[PairColors.Length];
        washMat = new Material[PairColors.Length];
        for (int p = 0; p < PairColors.Length; p++)
        {
            pairMat[p] = OiyoArcade.Lit(PairColors[p], 0.35f);
            washMat[p] = OiyoArcade.Glow(Color.Lerp(new Color(0.8f, 0.97f, 0.88f), PairColors[p], 0.25f));
        }
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int idx, bool ready = true)
    {
        stageIdx = Mathf.Clamp(idx, 0, StageCount - 1);
        StopAllCoroutines();
        st = BeeLinesStages.All[stageIdx];
        n = st.n; k = st.pairs.Length / 2;
        trails = new List<int>[k];
        for (int p = 0; p < k; p++) trails[p] = new List<int>();
        owner = new int[n * n];
        for (int i = 0; i < owner.Length; i++) owner[i] = Empty;
        for (int p = 0; p < k; p++) { owner[st.pairs[2 * p]] = p; owner[st.pairs[2 * p + 1]] = p; }
        strokes = 0; drawing = -1; won = false; starsWon = 0; keyed = false; curI = 0; downId = -1;
        cell = Mathf.Floor(Mathf.Min(340f / n, Area / n));
        ox = Mathf.Round((360f - n * cell) / 2f);
        oy = Mathf.Round(Top + (Area - n * cell) / 2f);
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Meadow").transform;
        segs.Clear();
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
        Box("Back", OiyoArcade.Glow(new Color(0.9f, 0.99f, 0.96f)), 180f, 280f, 1200f, 1600f, 0.8f, 0.2f);
        var a = OiyoArcade.Glow(new Color(0.7f, 0.95f, 0.73f));
        var b = OiyoArcade.Glow(new Color(0.76f, 0.98f, 0.91f));
        tint = new Transform[n * n];
        tintRen = new Renderer[n * n];
        for (int i = 0; i < n * n; i++)
        {
            var c = Centre(i);
            Box("Grass", (i % n + i / n) % 2 == 1 ? a : b, c.x, c.y, cell, cell, 0.4f, 0.02f);
            tint[i] = Box("Wash", washMat[0], c.x, c.y, cell, cell, 0.35f, 0.02f);
            tintRen[i] = tint[i].GetComponent<Renderer>();
        }
        float fs = Mathf.Max(24f, cell * 0.82f);
        for (int p = 0; p < k; p++)
        {
            var fm = OiyoField.Sprite("BL/flower" + (p % PairColors.Length));
            for (int e = 0; e < 2; e++)
            {
                var c = Centre(st.pairs[2 * p + e]);
                OiyoField.Quad("Flower", fm, root, fs, fs).position = field.W(c.x, c.y, -0.3f);
            }
        }
        bee = OiyoField.Quad("Bee", OiyoField.Sprite("BL/bee"), root, cell * 0.7f, cell * 0.55f);
        cursorObj = Box("Cursor", OiyoArcade.Glow(new Color(0.11f, 0.49f, 0.84f)), 0f, 0f, cell - 6f, 3f, -0.6f, 0.02f);
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("bee-lines", state, starsWon);
        TestTick();
        ReadInput();
        Animate();
    }

    int CellAt(Vector2 f)
    {
        int cx = Mathf.FloorToInt((f.x - ox) / cell), cy = Mathf.FloorToInt((f.y - oy) / cell);
        if (cx < 0 || cy < 0 || cx >= n || cy >= n) return -1;
        return cy * n + cx;
    }

    // a quick finger can skip squares: step toward the target one neighbour at a time
    void Reach(int i)
    {
        for (int g = 0; g < n * 2 && drawing >= 0; g++)
        {
            var t = trails[drawing];
            int last = t[t.Count - 1];
            if (last == i) return;
            int dx = i % n - last % n, dy = i / n - last / n;
            int next = Mathf.Abs(dx) >= Mathf.Abs(dy) ? last + (int)Mathf.Sign(dx) : last + (int)Mathf.Sign(dy) * n;
            int p = drawing;
            bool wasJoined = Joined(p);
            if (!Extend(next)) return;
            if (!wasJoined && Joined(p)) synth.Tone(784f, 0.06f, Wave.Triangle, 0.1f);
        }
    }

    void BeginAt(int i)
    {
        if (state != GameState.Playing || won) return;
        if (Begin(i)) synth.Tone(523f, 0.04f, Wave.Triangle, 0.06f);
    }

    void Finish()
    {
        if (drawing < 0) return;
        EndStroke();
        if (won) End();
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
                    // input is read once per frame: press on a flower (or a trail), drag, lift
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (state == GameState.Ready) { state = GameState.Playing; continue; }
                        if (OiyoArcade.OverUi(b.pos) || !field.ToField(b.pos, out Vector2 f)) continue;
                        keyed = false;
                        int i = CellAt(f);
                        if (i >= 0) { BeginAt(i); downId = b.id; }
                    }
                    if (downId >= 0)
                    {
                        foreach (var h in OiyoArcade.Held()) if (h.id == downId && field.ToField(h.pos, out Vector2 f)) { int i = CellAt(f); if (i >= 0) Reach(i); }
                        foreach (var e in OiyoArcade.Ended())
                        {
                            if (e.id != downId) continue;
                            if (field.ToField(e.pos, out Vector2 f)) { int i = CellAt(f); if (i >= 0) Reach(i); }
                            downId = -1;
                            Finish();
                        }
                    }
                    int dxk = Input.GetKeyDown(KeyCode.LeftArrow) ? -1 : Input.GetKeyDown(KeyCode.RightArrow) ? 1 : 0;
                    int dyk = Input.GetKeyDown(KeyCode.UpArrow) ? -1 : Input.GetKeyDown(KeyCode.DownArrow) ? 1 : 0;
                    if (dxk != 0 || dyk != 0)
                    {
                        if (state == GameState.Ready) state = GameState.Playing;
                        if (!keyed) keyed = true;
                        else
                        {
                            int x = Mathf.Clamp(curI % n + dxk, 0, n - 1), y = Mathf.Clamp(curI / n + dyk, 0, n - 1);
                            curI = y * n + x;
                            if (drawing >= 0) Reach(curI);
                        }
                    }
                    if (Input.GetKeyDown(KeyCode.Space))
                    {
                        if (state == GameState.Ready) state = GameState.Playing;
                        else { keyed = true; if (drawing < 0) BeginAt(curI); }
                    }
                    if (confirm && state == GameState.Playing && drawing >= 0) Finish();
                    else if (confirm && state == GameState.Ready) state = GameState.Playing;
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
        OiyoArcade.Record(Slug, stageIdx, starsWon, Mathf.Max(0, (k * 2 - strokes) * 10), StageCount);
        burst.Emit(field.W(180f, 280f, -1f), new Color(1f, 0.83f, 0.23f), 40, 4f, 0.1f, 1f);
        StartCoroutine(Arp(new[] { 523f, 659f, 784f, 1047f }, 0.1f));
    }

    IEnumerator Arp(float[] fs, float gap)
    {
        foreach (var f in fs) { synth.Tone(f, 0.18f, Wave.Triangle, 0.22f, 0f, 6f); yield return new WaitForSeconds(gap); }
    }

    void Animate()
    {
        if (root == null) return;
        field.Fit(56f, 120f, 0f, oy - 20f, oy + n * cell + 20f);
        for (int i = 0; i < n * n; i++)
        {
            int p = owner[i];
            tint[i].gameObject.SetActive(p >= 0);
            if (p >= 0) tintRen[i].sharedMaterial = washMat[p % PairColors.Length];
        }
        // the trails: a bar between each pair of squares in a row
        int used = 0;
        float w = Mathf.Max(6f, cell * 0.34f);
        for (int p = 0; p < k; p++)
        {
            var t = trails[p];
            for (int j = 1; j < t.Count; j++)
            {
                if (used == segs.Count) segs.Add(Box("Trail", pairMat[0], 0f, 0f, 1f, 1f, -0.2f, OiyoField.U(w)));
                var s = segs[used++];
                var a = Centre(t[j - 1]);
                var b = Centre(t[j]);
                bool across = Mathf.Abs(a.y - b.y) < 0.5f;
                s.gameObject.SetActive(true);
                s.position = field.W((a.x + b.x) / 2f, (a.y + b.y) / 2f, -0.2f);
                s.localScale = new Vector3(OiyoField.U(across ? cell + w : w), OiyoField.U(across ? w : cell + w), OiyoField.U(w));
                s.GetComponent<Renderer>().sharedMaterial = pairMat[p % PairColors.Length];
            }
        }
        for (int j = used; j < segs.Count; j++) segs[j].gameObject.SetActive(false);
        bee.gameObject.SetActive(drawing >= 0);
        if (drawing >= 0) { var c = Centre(trails[drawing][trails[drawing].Count - 1]); bee.position = field.W(c.x, c.y - cell / 3f, -0.5f); }
        cursorObj.gameObject.SetActive(keyed);
        if (keyed) { var c = Centre(curI); cursorObj.position = field.W(c.x, c.y + cell / 2f - 4f, -0.6f); }
    }

    // ?oiyotest=1 prints the state to the browser console every frame for the automated play check: while nothing is
    // being drawn, the screen points of the meadow's next planned trail, square by square.
    bool testLog;
    void TestTick()
    {
        if (!testLog) return;
        string nx = "null";
        if (state == GameState.Playing && !won && drawing < 0 && downId < 0)
        {
            int at = 0, next = -1;
            for (int p = 0; p < k; p++) { if (!Joined(p) && next < 0) { next = p; break; } at += st.planLen[p]; }
            if (next >= 0)
            {
                var sb = new System.Text.StringBuilder("[");
                for (int j = 0; j < st.planLen[next]; j++)
                {
                    var c = Centre(st.plan[at + j]);
                    var sp = cam.WorldToScreenPoint(field.W(c.x, c.y, 0f));
                    if (j > 0) sb.Append(',');
                    sb.Append($"{sp.x:F1},{Screen.height - sp.y:F1}");
                }
                nx = sb.Append(']').ToString();
            }
        }
        int joinedCount = 0;
        for (int p = 0; p < k; p++) if (Joined(p)) joinedCount++;
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"taps\":{joinedCount},\"strokes\":{strokes},\"drawn\":0,\"next\":{nx},\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.32f, 0.81f, 0.4f, 0.97f);
    static readonly Color Dark = new Color(0.06f, 0.2f, 0.12f, 0.9f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("{0} × {1} meadow", BeeLinesStages.All[i].n, BeeLinesStages.All[i].n);

    void OnGUI()
    {
        OiyoArcade.Begin();
        float gw = OiyoArcade.W, gh = OiyoArcade.H;
        if (state == GameState.Menu)
        {
            if (showStages)
            {
                int pick = OiyoScreens.Stages(gw, gh, Dark, Accent, Slug, StageCount, U("Choose a stage"), U("Back"), U("Stage"));
                if (pick == -2) showStages = false; else if (pick >= 0) LoadStage(pick);
                return;
            }
            int m = OiyoScreens.Menu(gw, gh, Dark, Accent, new Color(0.9f, 1f, 0.92f), U("Bee Lines"),
                U("Drag from a flower square by square to its twin to draw a bee's trail. Trails can't cross. Join every pair and fill every square of the meadow."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        var bar = new Rect(8f, 8f, gw - 16f, 44f);
        OiyoArcade.Panel(bar, Dark);
        int jc = 0;
        for (int p = 0; p < k; p++) if (Joined(p)) jc++;
        OiyoArcade.Text(new Rect(20f, 18f, gw - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>  " + F("Joined {0}/{1}", jc, k) + "  " + F("Strokes {0}", strokes), 15, new Color(0.9f, 1f, 0.92f));
        if (OiyoArcade.Button(new Rect(gw - 56f, 12f, 40f, 36f), "<b>II</b>", OiyoScreens.Slate, 16))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (state == GameState.Ready)
            OiyoScreens.Hint(gw, gh, Dark, U("Tap to start"), U("Drag from a flower to its twin!"), 110f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(gw, gh, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory)
        {
            string detail = $"<size=30>{OiyoArcade.StarString(starsWon)}</size>";
            string body = $"<size=14>{F("Joined in {0} strokes", strokes)}</size>";
            int r = OiyoScreens.Result(gw, gh, Dark, Accent, true, ResultLive, U("The meadow's full of bee trails!"), detail, body,
                stageIdx < StageCount - 1 ? U("Next stage") : null, stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
