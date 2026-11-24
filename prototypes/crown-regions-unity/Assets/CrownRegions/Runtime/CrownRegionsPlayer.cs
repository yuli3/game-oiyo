using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Crown Regions 3D: the web Crown Regions (src/components/games/CrownRegions.tsx, src/lib/games/crown-regions.ts)
// rebuilt in Unity on the web's own 360 × 560 px field (OiyoField). The n × n board (fitted into 340 px from y = 100)
// is split into n lands. A tap cycles a square empty → × → crown → empty. Crowns that share a row, column or land, or
// touch (diagonals too), are flagged. n crowns with no clash solves it. Every board has one answer. The 30 boards are
// the web's own (CrownRegionsStages.cs).
public class CrownRegionsPlayer : MonoBehaviour
{
    const string Slug = "crown-regions";
    const int StageCount = 30;
    const float GridTop = 100f, Grid = 340f;
    static readonly string[] Lands = { "#ffc9c9", "#ffd8a8", "#ffec99", "#c0eb75", "#96f2d7", "#a5d8ff", "#d0bfff", "#fcc2d7", "#e9ecef" };

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of crown-regions.ts) ----------------
    CrownRegionsStages.Level st;
    int stageIdx, starsWon, moves;
    int[] marks;
    float t;
    bool over, won;

    int N => st.n;

    HashSet<int> Clashes()
    {
        var crowns = new List<int>();
        for (int i = 0; i < marks.Length; i++) if (marks[i] == 2) crowns.Add(i);
        var bad = new HashSet<int>();
        for (int a = 0; a < crowns.Count; a++)
            for (int b = a + 1; b < crowns.Count; b++)
            {
                int i = crowns[a], j = crowns[b];
                int ri = i / N, ci = i % N, rj = j / N, cj = j % N;
                if (ri == rj || ci == cj || st.region[i] == st.region[j] || (Mathf.Abs(ri - rj) <= 1 && Mathf.Abs(ci - cj) <= 1)) { bad.Add(i); bad.Add(j); }
            }
        return bad;
    }

    bool Solved()
    {
        int crowns = 0;
        foreach (int m in marks) if (m == 2) crowns++;
        return crowns == N && Clashes().Count == 0;
    }

    int Tap(int cell)
    {
        if (over || cell < 0 || cell >= marks.Length) return -1;
        marks[cell] = (marks[cell] + 1) % 3;
        moves++;
        if (Solved()) { over = true; won = true; }
        return marks[cell];
    }

    int StarsFor()
    {
        if (!won) return 0;
        if (t <= st.par) return 3;
        if (t <= st.par * 2) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    OiyoField field;
    Camera cam;
    Transform root, cursorBox;
    Transform[] markObj;
    Material crownMat, crownBad, noMat, borderMat, cursorMat;
    readonly Material[] landMat = new Material[9];
    Bursts sparkle;
    Synth synth;
    bool showStages;
    int cursor = -1;

    float Cell => Mathf.Floor(Grid / N);
    float X0 => Mathf.Floor((360f - Cell * N) / 2f);
    Vector2 Centre(int i) => new Vector2(X0 + (i % N + 0.5f) * Cell, GridTop + (i / N + 0.5f) * Cell);

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(360f, 560f, new Color(0.13f, 0.15f, 0.16f));
        cam = field.Cam;
        OiyoField.Lights(new Color(0.8f, 0.8f, 0.82f), 0.7f, 40f, -25f);
        sparkle = new Bursts(transform, 0.5f);
        synth = new Synth(gameObject);
        var paper = OiyoArcade.Art("CR2/paper", true);
        for (int i = 0; i < 9; i++) { ColorUtility.TryParseHtmlString(Lands[i], out var c); landMat[i] = OiyoArcade.Lit(c, 0.2f, paper); }
        crownMat = OiyoField.Sprite("CR2/crown");
        crownBad = OiyoField.Sprite("CR2/crown_bad");
        noMat = OiyoField.Sprite("CR2/no");
        borderMat = OiyoArcade.Lit(new Color(0.13f, 0.15f, 0.16f), 0.2f);
        cursorMat = OiyoArcade.Transparent(OiyoArcade.Solid(Color.white), new Color(0.11f, 0.49f, 0.84f, 0.35f));
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int i, bool ready = true)
    {
        stageIdx = Mathf.Clamp(i, 0, StageCount - 1);
        StopAllCoroutines();
        st = CrownRegionsStages.All[stageIdx];
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Board").transform;
        marks = new int[N * N];
        t = 0f; moves = 0; over = false; won = false;
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
        float cs = Cell;
        Box(borderMat, 180f, GridTop + cs * N / 2f, cs * N + 8f, cs * N + 8f, 0.3f, 0.2f);
        markObj = new Transform[N * N];
        for (int i = 0; i < N * N; i++)
        {
            var c = Centre(i);
            Box(landMat[st.region[i] % 9], c.x, c.y, cs - 1f, cs - 1f, 0f, 0.3f);
            // thick lines where lands meet
            int r = i / N, col = i % N;
            if (col + 1 < N && st.region[i] != st.region[i + 1]) Box(borderMat, c.x + cs / 2f, c.y, 3f, cs, -0.16f, 0.05f);
            if (r + 1 < N && st.region[i] != st.region[i + N]) Box(borderMat, c.x, c.y + cs / 2f, cs, 3f, -0.16f, 0.05f);
            var q = OiyoField.Quad("Mark", noMat, root, cs * 0.6f, cs * 0.6f);
            q.position = field.W(c.x, c.y, -0.3f);
            q.gameObject.SetActive(false);
            markObj[i] = q;
        }
        cursorBox = Box(cursorMat, 0f, 0f, cs - 4f, cs - 4f, -0.2f, 0.05f);
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("crown-regions", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        if (state == GameState.Playing && !over) t += dt;
        Animate(dt);
    }

    void DoTap(int cell)
    {
        int m = Tap(cell);
        if (m < 0) return;
        synth.Tone(m == 2 ? 784f : 523f, 0.05f, Wave.Triangle, 0.1f, 0f, 14f);
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
                    // taps are read once per frame: a square cycles empty, ×, crown
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (OiyoArcade.OverUi(b.pos) || !field.ToField(b.pos, out Vector2 f)) continue;
                        if (state == GameState.Ready) state = GameState.Playing;
                        int col = Mathf.FloorToInt((f.x - X0) / Cell), row = Mathf.FloorToInt((f.y - GridTop) / Cell);
                        if (col < 0 || row < 0 || col >= N || row >= N) continue;
                        cursor = row * N + col;
                        DoTap(cursor);
                        if (over) break;
                    }
                    int dx = Input.GetKeyDown(KeyCode.RightArrow) ? 1 : Input.GetKeyDown(KeyCode.LeftArrow) ? -1 : 0;
                    int dy = Input.GetKeyDown(KeyCode.DownArrow) ? 1 : Input.GetKeyDown(KeyCode.UpArrow) ? -1 : 0;
                    if (dx != 0 || dy != 0)
                    {
                        if (state == GameState.Ready) state = GameState.Playing;
                        int cur = cursor < 0 ? 0 : cursor;
                        cursor = Mathf.Clamp(cur / N + dy, 0, N - 1) * N + Mathf.Clamp(cur % N + dx, 0, N - 1);
                    }
                    if (Input.GetKeyDown(KeyCode.Space)) { if (state == GameState.Ready) state = GameState.Playing; else if (cursor >= 0) DoTap(cursor); }
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
        starsWon = StarsFor();
        state = GameState.Victory;
        OiyoArcade.Record(Slug, stageIdx, starsWon, Mathf.Max(0, Mathf.RoundToInt(st.par * 3 - t)), StageCount);
        sparkle.Emit(field.W(180f, GridTop + Grid / 2f, -0.8f), new Color(1f, 0.85f, 0.25f), 40, 5f, 0.1f, 1f);
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
        var bad = Clashes();
        for (int i = 0; i < marks.Length; i++)
        {
            markObj[i].gameObject.SetActive(marks[i] != 0);
            if (marks[i] == 0) continue;
            markObj[i].GetComponent<Renderer>().sharedMaterial = marks[i] == 1 ? noMat : bad.Contains(i) ? crownBad : crownMat;
            float s = marks[i] == 2 ? Cell * 0.72f : Cell * 0.4f;
            markObj[i].localScale = new Vector3(OiyoField.U(s), OiyoField.U(s), 1f);
        }
        cursorBox.gameObject.SetActive(cursor >= 0 && !over);
        if (cursor >= 0) { var c = Centre(cursor); cursorBox.position = field.W(c.x, c.y, -0.2f); }
    }

    // ?oiyotest=1 prints the state to the browser console for the automated play check: the clock, the marks on the
    // answer's squares, and those squares' screen points (px from the top-left), row by row.
    bool testLog; float testT;
    Vector2 Scr(Vector2 f) { var sp = cam.WorldToScreenPoint(field.W(f.x, f.y, -0.3f)); return new Vector2(sp.x, Screen.height - sp.y); }
    void TestTick(float dt)
    {
        if (!testLog || (testT -= dt) > 0f) return;
        testT = 0.05f;
        var ans = new System.Text.StringBuilder();
        for (int r = 0; r < N; r++)
        {
            if (r > 0) ans.Append(',');
            int cell = r * N + st.answer[r];
            var p = Scr(Centre(cell));
            ans.Append('[').Append(marks[cell]).Append(',').Append(p.x.ToString("F1")).Append(',').Append(p.y.ToString("F1")).Append(']');
        }
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"n\":{N},\"t\":{t:F2},\"par\":{st.par},\"moves\":{moves},\"answer\":[{ans}],\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.98f, 0.69f, 0.02f, 0.97f);
    static readonly Color Dark = new Color(0.1f, 0.11f, 0.12f, 0.9f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + $" · {CrownRegionsStages.All[i].n}×{CrownRegionsStages.All[i].n}";

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(1f, 0.95f, 0.8f), U("Crown Regions"),
                U("One crown in every row, column and land, and no two crowns touching. Tap once for x, twice for a crown."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        int crowns = 0;
        foreach (int mk in marks) if (mk == 2) crowns++;
        var bar = new Rect(8f, 8f, w - 16f, 64f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 12f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>  " + F("Crowns {0}/{1}", crowns, N), 15, new Color(1f, 0.95f, 0.8f));
        OiyoArcade.Text(new Rect(20f, 36f, w - 90f, 24f), F("{0}s", Mathf.FloorToInt(t)) + $"   ★★★ <= {st.par}s", 14, Color.white);
        if (OiyoArcade.Button(new Rect(w - 60f, 14f, 44f, 44f), "<b>II</b>", OiyoScreens.Slate, 18))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap to start"), U("Tap a square once for x, twice for a crown."), 140f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            string detail = $"<size=30>{OiyoArcade.StarString(starsWon)}</size>";
            string body = $"<size=14>{F("Solved in {0}s", Mathf.RoundToInt(t))}</size>";
            int r = OiyoScreens.Result(w, h, Dark, Accent, true, ResultLive, U("Every land is crowned!"), detail, body,
                stageIdx < StageCount - 1 ? U("Next stage") : null, stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
