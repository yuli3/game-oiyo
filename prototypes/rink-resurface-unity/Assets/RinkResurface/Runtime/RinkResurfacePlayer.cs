using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Rink Resurface 3D: the web Rink Resurface (src/components/games/RinkResurface.tsx, src/lib/games/rink-resurface.ts)
// rebuilt in Unity on the web's own 360 × 560 px field (OiyoField). The rink is a rounded rectangle 300 × 460 px
// (corner 70) around (180, 300), cut into 10 px cells. The machine runs forward at the stage's speed and turns at
// up to its turn rate toward the held finger (steer = angle off × 3, clamped) or by the arrow keys. The blade, 14 px
// behind it and as wide as the stage says, smooths every ice cell under it; a gouge needs two separate passes.
// Touching the boards (16 px in) stalls it 1.2 s and swings it round to face the middle. Smooth the stage's share
// before the clock runs out. The 30 rinks are the web's own (RinkResurfaceStages.cs).
public class RinkResurfacePlayer : MonoBehaviour
{
    const string Slug = "rink-resurface";
    const int StageCount = 30;
    const float CX = 180f, CY = 300f, RX = 150f, RY = 230f, Corner = 70f, Cell = 10f, Stall = 1.2f;
    static readonly int Cols = Mathf.CeilToInt(RX * 2f / Cell), Rows = Mathf.CeilToInt(RY * 2f / Cell);
    const int Px = 8; // texture pixels per cell

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of rink-resurface.ts) ----------------
    RinkResurfaceStages.Level st;
    int stageIdx, starsWon, done, bumps;
    float t, x, y, heading, stalled;
    bool over, won;
    byte[] passes;
    readonly HashSet<int> gouges = new HashSet<int>();
    HashSet<int> visited = new HashSet<int>(), before = new HashSet<int>();
    static readonly List<int> Ice = new List<int>();
    static readonly bool[] IsIce;

    static RinkResurfacePlayer()
    {
        IsIce = new bool[Cols * Rows];
        for (int i = 0; i < Cols * Rows; i++) { var c = CellCentre(i); if (OnIce(c.x, c.y)) { Ice.Add(i); IsIce[i] = true; } }
    }

    static bool OnIce(float px, float py, float margin = 0f)
    {
        float dx = Mathf.Abs(px - CX) - (RX - Corner), dy = Mathf.Abs(py - CY) - (RY - Corner), r = Corner - margin;
        if (dx <= 0f && Mathf.Abs(px - CX) <= RX - margin && Mathf.Abs(py - CY) <= RY - margin) return Mathf.Abs(py - CY) <= RY - margin;
        if (dy <= 0f && Mathf.Abs(px - CX) <= RX - margin) return true;
        return dx > 0f && dy > 0f && dx * dx + dy * dy <= r * r;
    }

    static Vector2 CellCentre(int i) => new Vector2(CX - RX + (i % Cols + 0.5f) * Cell, CY - RY + (i / Cols + 0.5f) * Cell);
    int Needed(int i) => gouges.Contains(i) ? 2 : 1;
    float Coverage => done / (float)Ice.Count;

    void NewMachine()
    {
        t = 0f; x = CX - RX + 40f; y = CY + RY - 40f; heading = -Mathf.PI / 2f; stalled = 0f;
        passes = new byte[Cols * Rows]; done = 0; bumps = 0; over = false; won = false;
        gouges.Clear(); foreach (int g in st.gouges) gouges.Add(g);
        visited.Clear(); before.Clear();
    }

    readonly List<int> smoothedNow = new List<int>();
    void Shave()
    {
        float half = st.blade / 2f;
        float bx = x - Mathf.Cos(heading) * 14f, by = y - Mathf.Sin(heading) * 14f;
        int c0 = Mathf.FloorToInt((bx - half - (CX - RX)) / Cell), c1 = Mathf.FloorToInt((bx + half - (CX - RX)) / Cell);
        int r0 = Mathf.FloorToInt((by - half - (CY - RY)) / Cell), r1 = Mathf.FloorToInt((by + half - (CY - RY)) / Cell);
        for (int r = Mathf.Max(0, r0); r <= Mathf.Min(Rows - 1, r1); r++)
            for (int c = Mathf.Max(0, c0); c <= Mathf.Min(Cols - 1, c1); c++)
            {
                int i = r * Cols + c;
                if (visited.Contains(i)) continue;
                var p = CellCentre(i);
                float across = Mathf.Abs(-(p.x - bx) * Mathf.Sin(heading) + (p.y - by) * Mathf.Cos(heading));
                float along = Mathf.Abs((p.x - bx) * Mathf.Cos(heading) + (p.y - by) * Mathf.Sin(heading));
                if (across > half || along > Cell || !OnIce(p.x, p.y)) continue;
                visited.Add(i);
                if (before.Contains(i)) continue; // still under the blade from the last step: the same pass
                int need = Needed(i);
                if (passes[i] < need)
                {
                    passes[i]++;
                    if (passes[i] == need) done++;
                    smoothedNow.Add(i);
                }
            }
    }

    // returns whether the machine bumped the boards this step
    bool Step(float steer, float dt)
    {
        if (over) return false;
        bool bump = false;
        t += dt;
        if (stalled > 0f) stalled = Mathf.Max(0f, stalled - dt);
        else
        {
            heading += Mathf.Clamp(steer, -1f, 1f) * st.turn * dt;
            float nx = x + Mathf.Cos(heading) * st.speed * dt, ny = y + Mathf.Sin(heading) * st.speed * dt;
            if (!OnIce(nx, ny, 16f))
            {
                bumps++;
                stalled = Stall;
                heading = Mathf.Atan2(CY - y, CX - x);
                bump = true;
            }
            else
            {
                x = nx; y = ny;
                var tmp = before; before = visited; visited = tmp;
                visited.Clear();
                Shave();
            }
        }
        if (Coverage >= st.need) { over = true; won = true; }
        else if (t >= st.time) over = true;
        return bump;
    }

    int StarsFor()
    {
        if (!won) return 0;
        if (bumps == 0 && t <= st.par * 1.2f) return 3;
        if (bumps <= 1) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    OiyoField field;
    Camera cam;
    Transform root, machine, ring;
    Texture2D iceTex;
    Color32[] icePx;
    Material machineMat, boardMat, stripeMat, iceMat;
    Bursts spray;
    Synth synth;
    bool showStages, iceDirty;

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(360f, 560f, new Color(0.2f, 0.23f, 0.25f));
        cam = field.Cam;
        OiyoField.Lights(new Color(0.8f, 0.82f, 0.85f), 0.5f, 30f, -20f);
        spray = new Bursts(transform, 0.5f);
        synth = new Synth(gameObject);
        machineMat = OiyoField.Sprite("RR/machine");
        boardMat = OiyoArcade.Lit(new Color(0.95f, 0.95f, 0.96f), 0.3f);
        stripeMat = OiyoArcade.Lit(new Color(0.79f, 0.16f, 0.16f), 0.3f);
        iceTex = new Texture2D(Cols * Px, Rows * Px, TextureFormat.RGBA32, false) { filterMode = FilterMode.Point, wrapMode = TextureWrapMode.Clamp };
        icePx = new Color32[Cols * Px * Rows * Px];
        iceMat = OiyoArcade.Textured(iceTex);
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int i, bool ready = true)
    {
        stageIdx = Mathf.Clamp(i, 0, StageCount - 1);
        StopAllCoroutines();
        st = RinkResurfaceStages.All[stageIdx];
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Rink").transform;
        NewMachine();
        starsWon = 0;
        showStages = false;
        pressId = int.MinValue;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Animate(0f);
    }

    static uint Hash(int a, int b) { uint h = (uint)(a * 374761393 + b * 668265263); h = (h ^ (h >> 13)) * 1274126177u; return h ^ (h >> 16); }

    // the ice, cell by cell: scratched grey-blue with bright score lines, shining white once smoothed, deep gouges dark
    Color32 IcePixel(int cell, int px, int py)
    {
        int gx = (cell % Cols) * Px + px, gy = (cell / Cols) * Px + py;
        uint h = Hash(gx, gy);
        if (!IsIce[cell]) return new Color32(241, 243, 245, 255);
        int need = Needed(cell), p = passes[cell];
        if (p >= need)
        {
            bool glint = (gx + gy) % 23 == 0 || (h & 63) == 0;
            return glint ? new Color32(255, 255, 255, 255) : new Color32((byte)(222 + (h & 7)), (byte)(238 + (h & 3)), 252, 255);
        }
        if (need == 2) return p == 0 ? new Color32((byte)(108 + (h & 15)), (byte)(122 + (h & 15)), (byte)(134 + (h & 15)), 255) : new Color32(160, 176, 192, 255);
        bool score = (gx * 3 + gy * 7) % 29 == 0 || (gx * 5 - gy * 2 + 400) % 37 == 0;
        if (score) return new Color32(236, 242, 247, 255);
        byte v = (byte)(h & 15);
        return new Color32((byte)(186 + v), (byte)(200 + v), (byte)(212 + v), 255);
    }

    void PaintCell(int cell)
    {
        int w = Cols * Px;
        for (int py = 0; py < Px; py++)
            for (int px = 0; px < Px; px++)
            {
                // texture rows run bottom-up, field rows top-down
                int tx = (cell % Cols) * Px + px, ty = (Rows - 1 - cell / Cols) * Px + (Px - 1 - py);
                icePx[ty * w + tx] = IcePixel(cell, px, py);
            }
        iceDirty = true;
    }

    void BuildScene()
    {
        var board = OiyoArcade.Prim(PrimitiveType.Cube, "Boards", stripeMat, root);
        board.transform.position = field.W(CX, CY, 0.3f);
        board.transform.localScale = new Vector3(OiyoField.U(RX * 2f + 16f), OiyoField.U(RY * 2f + 16f), 0.4f);
        var dasher = OiyoArcade.Prim(PrimitiveType.Cube, "Dasher", boardMat, root);
        dasher.transform.position = field.W(CX, CY, 0.2f);
        dasher.transform.localScale = new Vector3(OiyoField.U(RX * 2f + 8f), OiyoField.U(RY * 2f + 8f), 0.4f);
        for (int i = 0; i < Cols * Rows; i++) PaintCell(i);
        var ice = OiyoField.Quad("Ice", iceMat, root, Cols * Cell, Rows * Cell);
        ice.position = field.W(CX - RX + Cols * Cell / 2f, CY - RY + Rows * Cell / 2f, 0f);
        // the centre line and the face-off circle under the ice
        var line = OiyoField.Quad("Centre line", OiyoArcade.Transparent(OiyoArcade.Solid(Color.white), new Color(0.79f, 0.16f, 0.16f, 0.45f)), root, RX * 2f, 3f);
        line.position = field.W(CX, CY, -0.01f);
        for (int k = 0; k < 24; k++)
        {
            float a = k * Mathf.PI * 2f / 24f;
            var dot = OiyoField.Quad("Circle", OiyoArcade.Transparent(OiyoArcade.Solid(Color.white), new Color(0.1f, 0.44f, 0.76f, 0.45f)), root, 4f, 4f);
            dot.position = field.W(CX + Mathf.Cos(a) * 34f, CY + Mathf.Sin(a) * 34f, -0.01f);
        }
        machine = OiyoField.Quad("Resurfacer", machineMat, root, 44f, 26f);
        ring = OiyoArcade.GlowQuad("Finger", new Color(0.3f, 0.6f, 1f, 0.7f), OiyoField.U(30f), root).transform;
        iceTex.SetPixels32(icePx);
        iceTex.Apply();
        iceDirty = false;
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("rink-resurface", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        float steer = ReadInput();
        if (state == GameState.Playing)
        {
            smoothedNow.Clear();
            if (Step(steer, dt))
            {
                Toast(U("Bump!"), new Color(1f, 0.6f, 0.3f));
                spray.Emit(field.W(x, y, -0.5f), new Color(0.85f, 0.93f, 1f), 10, 2.5f, 0.07f, 0.5f);
                synth.Tone(140f, 0.25f, Wave.Noise, 0.16f, 80f, 6f);
            }
            foreach (int c in smoothedNow) PaintCell(c);
            if (smoothedNow.Count > 0 && Random.value < 0.15f) spray.Emit(field.W(x - Mathf.Cos(heading) * 16f, y - Mathf.Sin(heading) * 16f, -0.4f), new Color(0.9f, 0.96f, 1f), 1, 0.6f, 0.05f, 0.4f);
            if (over) End();
        }
        if (iceDirty) { iceTex.SetPixels32(icePx); iceTex.Apply(); iceDirty = false; }
        msgT = Mathf.Max(0f, msgT - dt);
        Animate(dt);
    }

    string msg = ""; float msgT; Color msgC = Color.white;
    void Toast(string m, Color c) { msg = m; msgT = 0.9f; msgC = c; }

    int pressId = int.MinValue;
    Vector2 finger;
    bool fingerOn;

    // the steer for this frame: toward the held finger, or by the arrow keys
    float ReadInput()
    {
        bool confirm = Input.GetKeyDown(KeyCode.Return);
        switch (state)
        {
            case GameState.Ready:
            case GameState.Playing:
                {
                    if (state == GameState.Playing && (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P))) { state = GameState.Paused; pressId = int.MinValue; fingerOn = false; return 0f; }
                    // the finger is read once per frame
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (OiyoArcade.OverUi(b.pos)) continue;
                        if (state == GameState.Ready) state = GameState.Playing;
                        pressId = b.id;
                    }
                    foreach (var e in OiyoArcade.Ended()) if (e.id == pressId) pressId = int.MinValue;
                    fingerOn = false;
                    foreach (var hp in OiyoArcade.Held())
                        if (hp.id == pressId && field.ToField(hp.pos, out Vector2 f)) { finger = f; fingerOn = true; }
                    if (!fingerOn) pressId = int.MinValue;
                    bool l = Input.GetKey(KeyCode.LeftArrow), r = Input.GetKey(KeyCode.RightArrow);
                    if ((l || r || confirm) && state == GameState.Ready) state = GameState.Playing;
                    if (fingerOn)
                    {
                        float diff = Mathf.Atan2(finger.y - y, finger.x - x) - heading;
                        while (diff > Mathf.PI) diff -= 2f * Mathf.PI;
                        while (diff < -Mathf.PI) diff += 2f * Mathf.PI;
                        return Mathf.Clamp(diff * 3f, -1f, 1f);
                    }
                    return (r ? 1f : 0f) - (l ? 1f : 0f);
                }
            case GameState.Paused:
                if (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P)) state = GameState.Playing;
                return 0f;
            case GameState.Victory:
            case GameState.GameOver:
                if (confirm && ResultLive) LoadStage(state == GameState.Victory ? Mathf.Min(stageIdx + 1, StageCount - 1) : stageIdx);
                return 0f;
            case GameState.Menu:
                if (!showStages && confirm) LoadStage(stageIdx);
                return 0f;
        }
        return 0f;
    }

    float endTime;
    bool ResultLive => Time.unscaledTime - endTime > 0.45f;

    void End()
    {
        if (state != GameState.Playing) return;
        endTime = Time.unscaledTime;
        pressId = int.MinValue;
        fingerOn = false;
        if (won)
        {
            starsWon = StarsFor();
            state = GameState.Victory;
            OiyoArcade.Record(Slug, stageIdx, starsWon, Mathf.RoundToInt(Coverage * 100f), StageCount);
            spray.Emit(field.W(CX, CY, -0.8f), new Color(1f, 0.95f, 0.6f), 30, 4f, 0.1f, 1f);
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
        machine.position = field.W(x, y, -0.3f);
        float shake = stalled > 0f ? Mathf.Sin(Time.time * 60f) * 3f : 0f;
        machine.rotation = Quaternion.Euler(0f, 0f, -heading * Mathf.Rad2Deg + shake);
        ring.gameObject.SetActive(fingerOn && state == GameState.Playing);
        if (fingerOn) ring.position = field.W(finger.x, finger.y, -0.5f);
    }

    // ?oiyotest=1 prints the state to the browser console for the automated play check: the machine (field px and
    // heading), the stage's speed, turn and blade, coverage against the share needed, the clock, and the screen
    // points (px from the top-left) of the field's corners (0, 0) and (360, 560).
    bool testLog; float testT;
    Vector2 Scr(float fx, float fy) { var sp = cam.WorldToScreenPoint(field.W(fx, fy, 0f)); return new Vector2(sp.x, Screen.height - sp.y); }
    void TestTick(float dt)
    {
        if (!testLog || (testT -= dt) > 0f) return;
        testT = 0.03f;
        var a = Scr(0f, 0f); var b = Scr(360f, 560f);
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"t\":{t:F3},\"x\":{x:F2},\"y\":{y:F2},\"h\":{heading:F4},\"stalled\":{stalled:F2},\"speed\":{st.speed:F2},\"turn\":{st.turn:F4},\"blade\":{st.blade:F2},\"cov\":{Coverage:F4},\"need\":{st.need:F3},\"time\":{st.time:F1},\"bumps\":{bumps},\"f0\":[{a.x:F1},{a.y:F1}],\"f1\":[{b.x:F1},{b.y:F1}],\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.1f, 0.44f, 0.76f, 0.97f);
    static readonly Color Dark = new Color(0.1f, 0.12f, 0.15f, 0.88f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("Goal {0}%", Mathf.RoundToInt(RinkResurfaceStages.All[i].need * 100f)) + " · " + F("{0}s", Mathf.RoundToInt(RinkResurfaceStages.All[i].time));

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(0.9f, 0.96f, 1f), U("Rink Resurface"),
                U("Hold where you want to go and the machine turns that way. Lap the rink from the outside in and smooth the ice before the skaters come back."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        var bar = new Rect(8f, 8f, w - 16f, 64f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 12f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>  " + $"{Mathf.RoundToInt(Coverage * 100f)}% / {Mathf.RoundToInt(st.need * 100f)}%", 15, new Color(0.9f, 0.96f, 1f));
        OiyoArcade.Bar(new Rect(20f, 40f, w - 160f, 12f), Mathf.Clamp01(Coverage / st.need), new Color(1f, 1f, 1f, 0.2f), Coverage >= st.need ? new Color(0.25f, 0.75f, 0.34f) : new Color(0.45f, 0.75f, 0.99f));
        OiyoArcade.Text(new Rect(w - 130f, 34f, 60f, 24f), F("{0}s", Mathf.Max(0, Mathf.CeilToInt(st.time - t))), 15, Color.white, TextAnchor.UpperRight);
        if (OiyoArcade.Button(new Rect(w - 60f, 14f, 44f, 44f), "<b>II</b>", OiyoScreens.Slate, 18))
        {
            if (state == GameState.Playing) { state = GameState.Paused; pressId = int.MinValue; fingerOn = false; }
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (msgT > 0f) OiyoArcade.Shadowed(new Rect(8f, 80f, w - 16f, 36f), msg, 20, msgC, TextAnchor.MiddleCenter);
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap to start"), U("Lap from the outside in."), 200f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            bool w0 = state == GameState.Victory;
            string detail = w0 ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : "";
            string body = $"<size=14>{F("{0}% resurfaced · {1} bumps", Mathf.RoundToInt(Coverage * 100f), bumps)}</size>";
            int r = OiyoScreens.Result(w, h, Dark, Accent, w0, ResultLive, w0 ? U("Ice like a mirror!") : U("Scratched ice is left"), detail, body,
                w0 && stageIdx < StageCount - 1 ? U("Next stage") : null, w0 && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
