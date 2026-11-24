using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Paint Flood 3D: the web Paint Flood (src/components/games/PaintFlood.tsx, src/lib/games/paint-flood.ts) rebuilt in
// Unity on the web's own 360 × 560 px field (OiyoField). Your paint starts in the top-left square; pick a colour and
// the whole patch turns it, soaking up every touching square of it. Paint the canvas one colour within the strokes.
// The 30 canvases are the web's own (PaintFloodStages.cs).
public class PaintFloodPlayer : MonoBehaviour
{
    const string Slug = "paint-flood";
    const int StageCount = 30;
    const float Board = 336f, BX = 12f, BY = 40f, SwatchY = 450f;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of paint-flood.ts) ----------------
    PaintFloodStages.Level st;
    int n, stageIdx, starsWon, moves;
    int[] cells;
    bool[] owned;
    bool over, won;

    int Grow()
    {
        int colour = cells[0], added = 0;
        var stack = new Stack<int>();
        for (int i = 0; i < owned.Length; i++) if (owned[i]) stack.Push(i);
        while (stack.Count > 0)
        {
            int i = stack.Pop();
            int r = i / n, c = i % n;
            foreach (int nb in new[] { r > 0 ? i - n : -1, r < n - 1 ? i + n : -1, c > 0 ? i - 1 : -1, c < n - 1 ? i + 1 : -1 })
            {
                if (nb < 0 || owned[nb] || cells[nb] != colour) continue;
                owned[nb] = true;
                added++;
                stack.Push(nb);
            }
        }
        return added;
    }

    int Paint(int colour)
    {
        if (over || colour == cells[0] || colour < 0 || colour >= st.colours) return -1;
        for (int i = 0; i < cells.Length; i++) if (owned[i]) cells[i] = colour;
        int got = Grow();
        moves++;
        bool all = true;
        foreach (bool o in owned) if (!o) all = false;
        if (all) { over = true; won = true; }
        else if (moves >= st.limit) over = true;
        return got;
    }

    int StarsFor()
    {
        if (!won) return 0;
        if (moves <= st.par) return 3;
        if (moves <= st.par + 2) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    static readonly Color[] Paints = { new Color(0.88f, 0.19f, 0.19f), new Color(0.1f, 0.44f, 0.76f), new Color(0.96f, 0.62f, 0f), new Color(0.18f, 0.62f, 0.27f), new Color(0.61f, 0.21f, 0.71f), new Color(0.05f, 0.52f, 0.6f) };
    OiyoField field;
    Camera cam;
    Transform root;
    Transform[] cellObj;
    Renderer[] cellR;
    Transform[] potPaint;
    Material[] paintMat;
    Bursts sparkle;
    Synth synth;
    bool showStages;
    float wave;

    float Cell => Mathf.Floor(Board / n);
    float OX => BX + (Board - Cell * n) / 2f;
    float SwatchW => Mathf.Floor((360f - 24f) / st.colours);

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(360f, 560f, new Color(0.95f, 0.89f, 0.78f));
        cam = field.Cam;
        OiyoField.Lights(new Color(0.72f, 0.72f, 0.72f), 0.7f, 50f, -25f);
        sparkle = new Bursts(transform, 0.5f);
        synth = new Synth(gameObject);
        paintMat = new Material[Paints.Length];
        for (int k = 0; k < Paints.Length; k++) paintMat[k] = OiyoArcade.Lit(Paints[k], 0.55f);
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int i, bool ready = true)
    {
        stageIdx = Mathf.Clamp(i, 0, StageCount - 1);
        StopAllCoroutines();
        st = PaintFloodStages.All[stageIdx];
        n = st.size;
        cells = (int[])st.cells.Clone();
        owned = new bool[cells.Length];
        owned[0] = true;
        Grow();
        moves = 0; over = false; won = false; starsWon = 0; wave = 0f;
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Easel").transform;
        showStages = false;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Animate(0f);
    }

    void BuildScene()
    {
        var frame = OiyoArcade.Prim(PrimitiveType.Cube, "Frame", OiyoArcade.Lit(new Color(0.66f, 0.46f, 0.27f), 0.3f), root).transform;
        frame.localScale = new Vector3(OiyoField.U(Board + 16f), OiyoField.U(Board + 16f), 0.4f);
        frame.position = field.W(BX + Board / 2f, BY + Board / 2f, 0.3f);
        cellObj = new Transform[n * n];
        cellR = new Renderer[n * n];
        for (int i = 0; i < n * n; i++)
        {
            var c = OiyoArcade.Prim(PrimitiveType.Cube, "Square", paintMat[cells[i]], root);
            c.transform.localScale = new Vector3(OiyoField.U(Cell - 1f), OiyoField.U(Cell - 1f), 0.2f);
            cellObj[i] = c.transform;
            cellR[i] = c.GetComponent<Renderer>();
        }
        potPaint = new Transform[st.colours];
        for (int k = 0; k < st.colours; k++)
        {
            float x = 12f + k * SwatchW + SwatchW / 2f;
            // a pot (behind) with its paint in front; the current colour's paint sits low, as if used
            var pot = OiyoArcade.Prim(PrimitiveType.Cube, "Pot", OiyoArcade.Lit(new Color(0.29f, 0.31f, 0.34f), 0.4f), root).transform;
            pot.localScale = new Vector3(OiyoField.U(SwatchW - 8f), OiyoField.U(84f), 0.3f);
            pot.position = field.W(x, SwatchY + 42f, 0.1f);
            var paint = OiyoArcade.Prim(PrimitiveType.Cube, "Paint", paintMat[k], root).transform;
            paint.localScale = new Vector3(OiyoField.U(SwatchW - 16f), OiyoField.U(60f), 0.3f);
            potPaint[k] = paint;
        }
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("paint-flood", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        wave = Mathf.Max(0f, wave - dt * 2f);
        Animate(dt);
    }

    void Pick(int colour)
    {
        if (state != GameState.Playing || over) return;
        int got = Paint(colour);
        if (got < 0) { synth.Tone(180f, 0.06f, Wave.Square, 0.05f); return; }
        wave = 1f;
        if (got >= 4)
        {
            sparkle.Emit(field.W(OX + Cell, BY + Cell, -0.6f), Paints[colour], Mathf.Min(30, got), 4f, 0.08f, 0.5f);
            synth.Tone(660f, 0.12f, Wave.Triangle, 0.14f, 990f, 8f);
        }
        else synth.Tone(440f, 0.08f, Wave.Triangle, 0.1f);
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
                    // input is read once per frame: a pot or a square picks its colour
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (state == GameState.Ready) { state = GameState.Playing; continue; }
                        if (OiyoArcade.OverUi(b.pos) || !field.ToField(b.pos, out Vector2 f)) continue;
                        if (f.y >= SwatchY - 10f) { int k = Mathf.FloorToInt((f.x - 12f) / SwatchW); if (k >= 0 && k < st.colours) Pick(k); continue; }
                        int col = Mathf.FloorToInt((f.x - OX) / Cell), row = Mathf.FloorToInt((f.y - BY) / Cell);
                        if (col >= 0 && col < n && row >= 0 && row < n) Pick(cells[row * n + col]);
                    }
                    for (int k = 0; k < st.colours; k++)
                        if (Input.GetKeyDown(KeyCode.Alpha1 + k))
                        {
                            if (state == GameState.Ready) state = GameState.Playing;
                            else Pick(k);
                        }
                    if (state == GameState.Ready && (confirm || Input.GetKeyDown(KeyCode.Space))) state = GameState.Playing;
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
            OiyoArcade.Record(Slug, stageIdx, starsWon, Mathf.Max(0, (st.limit - moves) * 100), StageCount);
            sparkle.Emit(field.W(180f, 200f, -1.5f), new Color(1f, 0.85f, 0.25f), 40, 5f, 0.1f, 1f);
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
        field.Fit(60f, 10f, 12f, 30f, 545f);
        for (int i = 0; i < n * n; i++)
        {
            cellR[i].sharedMaterial = paintMat[cells[i]];
            float lift = owned[i] ? 0.12f + wave * 0.15f : 0f;
            cellObj[i].position = field.W(OX + (i % n + 0.5f) * Cell, BY + (i / n + 0.5f) * Cell, -lift);
        }
        for (int k = 0; k < st.colours; k++)
        {
            bool now = cells[0] == k;
            float x = 12f + k * SwatchW + SwatchW / 2f;
            potPaint[k].localScale = new Vector3(OiyoField.U(SwatchW - 16f), OiyoField.U(now ? 34f : 72f), 0.3f);
            potPaint[k].position = field.W(x, SwatchY + (now ? 63f : 44f), -0.15f);
        }
    }

    // ?oiyotest=1 prints the state to the browser console for the automated play check, with the screen point (px from
    // the top-left) of the paint pot a careful painter (two moves ahead) picks next; its strokes come with the stage.
    bool testLog; float testT;
    void TestTick(float dt)
    {
        if (!testLog) return;
        if ((testT -= dt) > 0f) return;
        testT = 0.05f;
        string next = "null";
        if (state == GameState.Playing && !over && moves < st.plan.Length)
        {
            var sp = cam.WorldToScreenPoint(field.W(12f + st.plan[moves] * SwatchW + SwatchW / 2f, SwatchY + 42f, -0.2f));
            next = $"[{sp.x:F1},{Screen.height - sp.y:F1}]";
        }
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"moves\":{moves},\"limit\":{st.limit},\"par\":{st.par},\"next\":{next},\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.1f, 0.44f, 0.76f, 0.97f);
    static readonly Color Dark = new Color(0.1f, 0.11f, 0.12f, 0.9f);

    Vector2 Gui(Vector2 f, float z = -0.3f) => OiyoArcade.ToGui(cam.WorldToScreenPoint(field.W(f.x, f.y, z)));
    float GuiPerField => field.ScreenPerField() / OiyoArcade.ComputeScale();

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("{0} × {0} canvas", PaintFloodStages.All[i].size);

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(1f, 0.95f, 0.85f), U("Paint Flood"),
                U("Pick a colour and your paint, from the top-left corner, soaks up every touching square of it. Paint the whole canvas one colour within the strokes."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        for (int k = 0; k < st.colours; k++)
        {
            var p = Gui(new Vector2(12f + k * SwatchW + SwatchW / 2f, SwatchY + 96f));
            OiyoArcade.Text(new Rect(p.x - 20f, p.y - 10f, 40f, 20f), (k + 1).ToString(), Mathf.Max(10, Mathf.RoundToInt(13f * GuiPerField)), new Color(0.13f, 0.15f, 0.16f), TextAnchor.MiddleCenter, true);
        }
        var bar = new Rect(8f, 8f, w - 16f, 44f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 18f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>  " + F("Strokes {0}/{1}", moves, st.limit), 15, new Color(1f, 0.95f, 0.85f));
        if (OiyoArcade.Button(new Rect(w - 56f, 12f, 40f, 36f), "<b>II</b>", OiyoScreens.Slate, 16))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap to start"), U("Tap a paint below to spread from the top-left!"), 260f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            string detail = won ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : "";
            string body = won ? $"<size=14>{F("Painted in {0} strokes", moves)}</size>" : "";
            int r = OiyoScreens.Result(w, h, Dark, Accent, won, ResultLive, won ? U("The canvas is one colour!") : U("Out of strokes"), detail, body,
                won && stageIdx < StageCount - 1 ? U("Next stage") : null, won && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
