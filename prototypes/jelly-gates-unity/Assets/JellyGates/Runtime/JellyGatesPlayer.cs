using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Jelly Gates 3D: the web Jelly Gates (src/components/games/JellyGates.tsx, src/lib/games/jelly-gates.ts) rebuilt in
// Unity on the web's own 360 × 560 px field (OiyoField). Swipe a jelly: it slides until something stops it, and out
// through a gate of its colour in the rim. Clear the tray within the moves. The 30 trays are the web's own.
public class JellyGatesPlayer : MonoBehaviour
{
    const string Slug = "jelly-gates";
    const int StageCount = 30;
    const float Top = 100f;
    static readonly int[] DX = { 0, 1, 0, -1 };
    static readonly int[] DY = { -1, 0, 1, 0 };

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of jelly-gates.ts) ----------------
    JellyGatesStages.Level st;
    int stageIdx, starsWon, cols, rows, moves, nBlocks;
    int[] bw, bh, bc;
    int[] px, py; // -1 once out
    bool over, won;

    bool Out(int k) => px[k] < 0;

    bool Free(int k, int x, int y)
    {
        if (x < 0 || y < 0 || x + bw[k] > cols || y + bh[k] > rows) return false;
        for (int j = 0; j < nBlocks; j++)
        {
            if (j == k || Out(j)) continue;
            if (x < px[j] + bw[j] && px[j] < x + bw[k] && y < py[j] + bh[j] && py[j] < y + bh[k]) return false;
        }
        return true;
    }

    bool FitsGate(int k, int x, int y, int d)
    {
        int n = st.gates.Length / 4;
        for (int g = 0; g < n; g++)
        {
            int side = st.gates[4 * g], from = st.gates[4 * g + 1], len = st.gates[4 * g + 2], color = st.gates[4 * g + 3];
            if (side != d || color != bc[k]) continue;
            if (d == 0 || d == 2)
            {
                if ((d == 0 && y != 0) || (d == 2 && y + bh[k] != rows)) continue;
                if (x >= from && x + bw[k] <= from + len) return true;
            }
            else
            {
                if ((d == 3 && x != 0) || (d == 1 && x + bw[k] != cols)) continue;
                if (y >= from && y + bh[k] <= from + len) return true;
            }
        }
        return false;
    }

    /** The web's flick(): out through a gate if it can (dist -1), else as far as it goes (0: can't move). */
    int Flick(int k, int d)
    {
        if (Out(k)) return 0;
        int x = px[k], y = py[k], dist = 0;
        for (;;)
        {
            int nx = x + DX[d], ny = y + DY[d];
            if (nx < 0 || ny < 0 || nx + bw[k] > cols || ny + bh[k] > rows) return FitsGate(k, x, y, d) ? -1 : dist;
            if (!Free(k, nx, ny)) return dist;
            x = nx; y = ny; dist++;
        }
    }

    bool Slide(int k, int d, int dist)
    {
        if (over || Out(k) || dist == 0) return false;
        if (dist < 0) { px[k] = -1; py[k] = -1; }
        else { px[k] += DX[d] * dist; py[k] += DY[d] * dist; }
        moves++;
        bool all = true;
        for (int j = 0; j < nBlocks; j++) if (!Out(j)) all = false;
        if (all) { over = true; won = true; }
        else if (moves >= st.limit) over = true;
        return true;
    }

    int StarsFor()
    {
        if (!won) return 0;
        if (moves <= st.par) return 3;
        if (moves <= st.par + 2) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    OiyoField field;
    Camera cam;
    Transform root, cursorObj;
    Transform[] jelly;
    Vector2[] shown;
    float[] wobble, popT;
    Vector2[] popDir;
    Material[] jellyMat;
    Bursts sparkle;
    Synth synth;
    bool showStages, keyed;
    int selected;
    float cell, ox, oy;
    readonly Dictionary<int, (Vector2 at, int block)> downAt = new Dictionary<int, (Vector2, int)>();
    static readonly Color[] Colors = { new Color(1f, 0.42f, 0.51f), new Color(0.3f, 0.67f, 0.97f), new Color(1f, 0.83f, 0.23f), new Color(0.41f, 0.86f, 0.49f) };

    Vector2 Centre(int k, Vector2 at) => new Vector2(ox + (at.x + bw[k] / 2f) * cell, oy + (at.y + bh[k] / 2f) * cell);

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(360f, 560f, new Color(1f, 0.94f, 0.96f));
        cam = field.Cam;
        OiyoField.Lights(new Color(0.75f, 0.72f, 0.74f), 0.75f, 50f, -25f);
        sparkle = new Bursts(transform, 0.5f);
        synth = new Synth(gameObject);
        jellyMat = new Material[4];
        for (int k = 0; k < 4; k++) jellyMat[k] = OiyoArcade.Lit(Colors[k], 0.85f);
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int i, bool ready = true)
    {
        stageIdx = Mathf.Clamp(i, 0, StageCount - 1);
        StopAllCoroutines();
        st = JellyGatesStages.All[stageIdx];
        cols = st.cols; rows = st.rows; nBlocks = st.blocks.Length / 5;
        bw = new int[nBlocks]; bh = new int[nBlocks]; bc = new int[nBlocks]; px = new int[nBlocks]; py = new int[nBlocks];
        shown = new Vector2[nBlocks]; wobble = new float[nBlocks]; popT = new float[nBlocks]; popDir = new Vector2[nBlocks];
        for (int k = 0; k < nBlocks; k++)
        {
            px[k] = st.blocks[5 * k]; py[k] = st.blocks[5 * k + 1]; bw[k] = st.blocks[5 * k + 2]; bh[k] = st.blocks[5 * k + 3]; bc[k] = st.blocks[5 * k + 4];
            shown[k] = new Vector2(px[k], py[k]);
        }
        moves = 0; over = false; won = false; starsWon = 0; selected = 0; keyed = false;
        downAt.Clear();
        cell = Mathf.Floor(Mathf.Min(52f, 300f / cols, 400f / rows));
        ox = Mathf.Round((360f - cols * cell) / 2f);
        oy = Top + Mathf.Round((400f - rows * cell) / 2f);
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Tray").transform;
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
        float tw = cols * cell, th = rows * cell;
        Box("Table", OiyoArcade.Lit(new Color(1f, 0.87f, 0.92f), 0.1f), 180f, 280f, 1200f, 1600f, 0.6f, 0.2f);
        Box("Rim", OiyoArcade.Lit(new Color(0.68f, 0.71f, 0.74f), 0.4f), ox + tw / 2f, oy + th / 2f, tw + 20f, th + 20f, 0.25f, 0.4f);
        var a = OiyoArcade.Lit(new Color(0.97f, 0.98f, 0.98f), 0.3f);
        var b = OiyoArcade.Lit(new Color(0.91f, 0.93f, 0.94f), 0.3f);
        for (int y = 0; y < rows; y++) for (int x = 0; x < cols; x++) Box("Square", (x + y) % 2 == 0 ? a : b, ox + (x + 0.5f) * cell, oy + (y + 0.5f) * cell, cell, cell, 0.02f, 0.1f);
        int n = st.gates.Length / 4;
        for (int g = 0; g < n; g++)
        {
            int side = st.gates[4 * g], from = st.gates[4 * g + 1], len = st.gates[4 * g + 2], color = st.gates[4 * g + 3];
            var m = OiyoArcade.Glow(Colors[color]);
            if (side == 0) Box("Gate", m, ox + (from + len / 2f) * cell, oy - 5f, len * cell, 10f, -0.1f, 0.3f);
            else if (side == 2) Box("Gate", m, ox + (from + len / 2f) * cell, oy + th + 5f, len * cell, 10f, -0.1f, 0.3f);
            else if (side == 3) Box("Gate", m, ox - 5f, oy + (from + len / 2f) * cell, 10f, len * cell, -0.1f, 0.3f);
            else Box("Gate", m, ox + tw + 5f, oy + (from + len / 2f) * cell, 10f, len * cell, -0.1f, 0.3f);
        }
        jelly = new Transform[nBlocks];
        var eye = OiyoArcade.Lit(new Color(0.2f, 0.23f, 0.25f), 0.3f);
        for (int k = 0; k < nBlocks; k++)
        {
            jelly[k] = new GameObject("Jelly").transform;
            jelly[k].SetParent(root, false);
            var body = OiyoArcade.Prim(PrimitiveType.Cube, "Body", jellyMat[bc[k]], jelly[k]).transform;
            body.localScale = new Vector3(OiyoField.U(bw[k] * cell - 6f), OiyoField.U(bh[k] * cell - 6f), OiyoField.U(26f));
            for (int e = -1; e <= 1; e += 2)
            {
                var ey = OiyoArcade.Prim(PrimitiveType.Cube, "Eye", eye, jelly[k]).transform;
                ey.localScale = new Vector3(OiyoField.U(5f), OiyoField.U(5f), OiyoField.U(2f));
                ey.localPosition = new Vector3(OiyoField.U(e * 7f), OiyoField.U(3f), -OiyoField.U(14f));
            }
            var shine = OiyoArcade.Prim(PrimitiveType.Cube, "Shine", OiyoArcade.Glow(new Color(1f, 1f, 1f, 0.7f)), jelly[k]).transform;
            shine.localScale = new Vector3(OiyoField.U(Mathf.Max(6f, bw[k] * cell / 4f)), OiyoField.U(4f), OiyoField.U(1f));
            shine.localPosition = new Vector3(-OiyoField.U(bw[k] * cell / 2f - 12f), OiyoField.U(bh[k] * cell / 2f - 10f), -OiyoField.U(14f));
        }
        cursorObj = Box("Cursor", OiyoArcade.Glow(new Color(0.13f, 0.15f, 0.16f)), 0f, 0f, 10f, 10f, -0.9f, 0.02f);
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("jelly-gates", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        for (int k = 0; k < nBlocks; k++)
        {
            wobble[k] = Mathf.Max(0f, wobble[k] - dt);
            if (popT[k] > 0f) { popT[k] -= dt; shown[k] += popDir[k] * dt * 8f; }
            else if (!Out(k)) shown[k] = Vector2.Lerp(shown[k], new Vector2(px[k], py[k]), Mathf.Min(1f, dt * 18f));
        }
        Animate(dt);
    }

    bool Settled()
    {
        for (int k = 0; k < nBlocks; k++)
        {
            if (popT[k] > 0f) return false;
            if (!Out(k) && Vector2.Distance(shown[k], new Vector2(px[k], py[k])) > 0.05f) return false;
        }
        return true;
    }

    void Push(int k, int d)
    {
        if (state != GameState.Playing || over || k < 0 || k >= nBlocks || Out(k)) return;
        int dist = Flick(k, d);
        if (dist == 0) { wobble[k] = 0.3f; synth.Tone(196f, 0.05f, Wave.Square, 0.05f); return; }
        var from = new Vector2(px[k], py[k]);
        Slide(k, d, dist);
        if (dist < 0)
        {
            popT[k] = 0.5f; popDir[k] = new Vector2(DX[d], DY[d]); shown[k] = from;
            var c = Centre(k, from);
            sparkle.Emit(field.W(c.x + DX[d] * 40f, c.y + DY[d] * 40f, -0.8f), Colors[bc[k]], 16, 3f, 0.07f, 0.5f);
            synth.Tone(784f, 0.1f, Wave.Triangle, 0.15f);
            if (Out(selected)) for (int j = 0; j < nBlocks; j++) if (!Out(j)) { selected = j; break; }
        }
        else { wobble[k] = 0.25f; synth.Tone(392f, 0.06f, Wave.Triangle, 0.1f); }
        if (over) End();
    }

    int BlockAt(Vector2 f)
    {
        float gx = (f.x - ox) / cell, gy = (f.y - oy) / cell;
        for (int k = 0; k < nBlocks; k++) if (!Out(k) && gx >= px[k] && gx < px[k] + bw[k] && gy >= py[k] && gy < py[k] + bh[k]) return k;
        return -1;
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
                    // input is read once per frame: a swipe on a jelly pushes it
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (state == GameState.Ready) { state = GameState.Playing; continue; }
                        if (!field.ToField(b.pos, out Vector2 f)) continue;
                        int k = BlockAt(f);
                        if (k >= 0) { downAt[b.id] = (b.pos, k); selected = k; }
                    }
                    foreach (var e in OiyoArcade.Ended())
                    {
                        if (!downAt.TryGetValue(e.id, out var s)) continue;
                        downAt.Remove(e.id);
                        Vector2 d = e.pos - s.at; // screen y points up
                        if (d.magnitude < 14f * OiyoArcade.ComputeScale()) continue;
                        Push(s.block, Mathf.Abs(d.x) > Mathf.Abs(d.y) ? (d.x > 0 ? 1 : 3) : (d.y > 0 ? 0 : 2));
                    }
                    if (Input.GetKeyDown(KeyCode.Tab))
                    {
                        if (state == GameState.Ready) state = GameState.Playing;
                        bool back = Input.GetKey(KeyCode.LeftShift) || Input.GetKey(KeyCode.RightShift);
                        for (int j = 1; j <= nBlocks; j++) { int c = (selected + (back ? nBlocks - j : j)) % nBlocks; if (!Out(c)) { selected = c; break; } }
                        keyed = true;
                    }
                    int kd = -1;
                    if (Input.GetKeyDown(KeyCode.UpArrow)) kd = 0;
                    else if (Input.GetKeyDown(KeyCode.RightArrow)) kd = 1;
                    else if (Input.GetKeyDown(KeyCode.DownArrow)) kd = 2;
                    else if (Input.GetKeyDown(KeyCode.LeftArrow)) kd = 3;
                    if (kd >= 0) { if (state == GameState.Ready) state = GameState.Playing; keyed = true; Push(selected, kd); }
                    if ((Input.GetKeyDown(KeyCode.Space) || confirm) && state == GameState.Ready) state = GameState.Playing;
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
            OiyoArcade.Record(Slug, stageIdx, starsWon, Mathf.Max(0, (st.limit - moves) * 10), StageCount);
            sparkle.Emit(field.W(180f, 300f, -1f), new Color(1f, 0.42f, 0.51f), 40, 4f, 0.1f, 1f);
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

    void Animate(float dt)
    {
        if (root == null) return;
        field.Fit(56f, 10f, 0f, oy - 20f, oy + rows * cell + 20f);
        for (int k = 0; k < nBlocks; k++)
        {
            bool vis = !Out(k) || popT[k] > 0f;
            jelly[k].gameObject.SetActive(vis);
            if (!vis) continue;
            var c = Centre(k, shown[k]);
            float sq = Mathf.Sin(wobble[k] * 40f) * wobble[k] * 0.4f;
            jelly[k].position = field.W(c.x, c.y, -OiyoField.U(13f) - 0.05f);
            jelly[k].localScale = new Vector3(1f + sq, 1f - sq, 1f) * (popT[k] > 0f ? popT[k] * 2f : 1f);
        }
        cursorObj.gameObject.SetActive(keyed && !Out(selected));
        if (!Out(selected))
        {
            var cc = Centre(selected, shown[selected]);
            cursorObj.position = field.W(cc.x, cc.y - bh[selected] * cell / 2f - 8f, -0.9f);
        }
    }

    // ?oiyotest=1 prints the state to the browser console for the automated play check, with the swipe (screen px from
    // the top-left: start and end) for the next move of the tray's own answer, once everything has settled.
    bool testLog; float testT;
    void TestTick(float dt)
    {
        if (!testLog) return;
        if ((testT -= dt) > 0f) return;
        testT = 0.05f;
        string nx = "null";
        if (state == GameState.Playing && !over && Settled() && 3 * moves + 2 < st.plan.Length)
        {
            int k = st.plan[3 * moves], d = st.plan[3 * moves + 1];
            var c = Centre(k, new Vector2(px[k], py[k]));
            var a = cam.WorldToScreenPoint(field.W(c.x, c.y, 0f));
            var b = cam.WorldToScreenPoint(field.W(c.x + DX[d] * 40f, c.y + DY[d] * 40f, 0f));
            nx = $"[{a.x:F1},{Screen.height - a.y:F1},{b.x:F1},{Screen.height - b.y:F1}]";
        }
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"moves\":{moves},\"par\":{st.par},\"limit\":{st.limit},\"next\":{nx},\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(1f, 0.42f, 0.51f, 0.97f);
    static readonly Color Dark = new Color(0.2f, 0.1f, 0.15f, 0.9f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("Jellies left {0}", JellyGatesStages.All[i].blocks.Length / 5);

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(1f, 0.9f, 0.94f), U("Jelly Gates"),
                U("Swipe a jelly and it slides until something stops it. Slide it into a gate of its own colour and it pops out. Get every jelly out within the moves."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        int left = 0; for (int k = 0; k < nBlocks; k++) if (!Out(k)) left++;
        var bar = new Rect(8f, 8f, w - 16f, 44f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 18f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>  " + F("Moves {0}/{1}", moves, st.limit) + "   " + F("Jellies left {0}", left), 15, new Color(1f, 0.9f, 0.94f));
        if (OiyoArcade.Button(new Rect(w - 56f, 12f, 40f, 36f), "<b>II</b>", OiyoScreens.Slate, 16))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap to start"), U("Push a jelly out through the gate of its colour!"), 120f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            string detail = won ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : "";
            string body = won ? $"<size=14>{F("All out in {0} moves", moves)}</size>" : "";
            int r = OiyoScreens.Result(w, h, Dark, Accent, won, ResultLive, won ? U("All out!") : U("Out of moves"), detail, body,
                won && stageIdx < StageCount - 1 ? U("Next stage") : null, won && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
