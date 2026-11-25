using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Chalk Roll 3D: the web Chalk Roll (src/components/games/ChalkRoll.tsx, src/lib/games/chalk-roll.ts) rebuilt in
// Unity on the web's own 360 × 560 px field (OiyoField). Draw one chalk line; lift your finger and the marble drops and
// rolls along it. Guide it into the pail, off the thumbtacks. The physics runs on the web's fixed 1/240 s steps; the
// 30 boards are the web's own (ChalkRollStages.cs).
public class ChalkRollPlayer : MonoBehaviour
{
    const string Slug = "chalk-roll";
    const int StageCount = 30;
    const float Gravity = 900f, BallR = 10f, TackR = 10f, DT = 1f / 240f, Bounce = 0.15f, StepMin = 6f, FW = 360f, FH = 560f;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of chalk-roll.ts) ----------------
    ChalkRollStages.Level st;
    int stageIdx, starsWon;
    readonly List<Vector2> line = new List<Vector2>();
    float used, t, x, y, vx, vy, still, acc;
    bool rolling, over, won;
    readonly List<Vector4> segs = new List<Vector4>();

    float PX => st.pail[0];
    float PY => st.pail[1];
    float PW => st.pail[2];
    float PH => st.pail[3];

    bool AddPoint(float px, float py)
    {
        if (rolling || over) return false;
        px = Mathf.Clamp(px, 0f, FW);
        py = Mathf.Clamp(py, 0f, FH);
        if (line.Count == 0) { line.Add(new Vector2(px, py)); return true; }
        var last = line[line.Count - 1];
        float d = Vector2.Distance(last, new Vector2(px, py));
        if (d < StepMin) return false;
        float left = st.ink - used;
        if (left <= 0.5f) return false;
        if (d > left)
        {
            float k = left / d;
            line.Add(new Vector2(last.x + (px - last.x) * k, last.y + (py - last.y) * k));
            used = st.ink;
            return true;
        }
        line.Add(new Vector2(px, py));
        used += d;
        return true;
    }

    void Release()
    {
        if (rolling || over) return;
        rolling = true;
        segs.Clear();
        for (int k = 0; k < st.walls.Length / 4; k++) segs.Add(new Vector4(st.walls[4 * k], st.walls[4 * k + 1], st.walls[4 * k + 2], st.walls[4 * k + 3]));
        segs.Add(new Vector4(PX, PY, PX, PY + PH));
        segs.Add(new Vector4(PX, PY + PH, PX + PW, PY + PH));
        segs.Add(new Vector4(PX + PW, PY, PX + PW, PY + PH));
        for (int i = 1; i < line.Count; i++) segs.Add(new Vector4(line[i - 1].x, line[i - 1].y, line[i].x, line[i].y));
    }

    void Collide(Vector4 s)
    {
        float dx = s.z - s.x, dy = s.w - s.y, l = dx * dx + dy * dy;
        float k = l == 0f ? 0f : Mathf.Clamp01(((x - s.x) * dx + (y - s.y) * dy) / l);
        float qx = s.x + dx * k, qy = s.y + dy * k, ex = x - qx, ey = y - qy;
        float d = Mathf.Sqrt(ex * ex + ey * ey);
        if (d >= BallR || d == 0f) return;
        float nx = ex / d, ny = ey / d;
        x = qx + nx * BallR;
        y = qy + ny * BallR;
        float vn = vx * nx + vy * ny;
        if (vn < 0f) { vx -= (1f + Bounce) * vn * nx; vy -= (1f + Bounce) * vn * ny; }
    }

    bool InPail() => x > PX && x < PX + PW && y > PY + BallR * 0.5f && y < PY + PH;

    void Step()
    {
        if (over || !rolling) return;
        t += DT;
        vy += Gravity * DT;
        x += vx * DT;
        y += vy * DT;
        for (int pass = 0; pass < 2; pass++) foreach (var s in segs) Collide(s);
        vx *= 0.9997f;
        vy *= 0.9997f;
        if (InPail()) { over = true; won = true; return; }
        still = Mathf.Sqrt(vx * vx + vy * vy) < 8f ? still + DT : 0f;
        bool tack = false;
        for (int k = 0; k < st.tacks.Length / 2; k++)
        {
            float tx = st.tacks[2 * k] - x, ty = st.tacks[2 * k + 1] - y;
            if (Mathf.Sqrt(tx * tx + ty * ty) < TackR + BallR) tack = true;
        }
        if (tack || y > FH + 40f || x < -30f || x > FW + 30f || t > 12f || still > 1.5f) over = true;
    }

    int StarsFor()
    {
        if (!won) return 0;
        if (used <= st.par * 1.35f + 20f) return 3;
        if (used <= st.par * 1.8f + 40f) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    OiyoField field;
    Camera cam;
    Transform root, marble, pen;
    readonly List<Transform> chalk = new List<Transform>();
    Material chalkMat;
    Bursts burst;
    Synth synth;
    bool showStages, drawing, penShown, penDown;
    int drawId;
    Vector2 penAt;

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(360f, 560f, new Color(0.14f, 0.27f, 0.23f));
        cam = field.Cam;
        OiyoField.Lights(new Color(0.76f, 0.76f, 0.76f), 0.7f, 50f, -25f);
        burst = new Bursts(transform, 0.5f);
        synth = new Synth(gameObject);
        chalkMat = OiyoArcade.Glow(new Color(0.97f, 0.98f, 0.98f));
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int i, bool ready = true)
    {
        stageIdx = Mathf.Clamp(i, 0, StageCount - 1);
        StopAllCoroutines();
        st = ChalkRollStages.All[stageIdx];
        line.Clear(); segs.Clear();
        used = 0f; t = 0f; x = st.ball[0]; y = st.ball[1]; vx = 0f; vy = 0f; still = 0f; acc = 0f;
        rolling = false; over = false; won = false; starsWon = 0; drawing = false; penShown = false; penDown = false;
        penAt = new Vector2(st.ball[0], st.ball[1] + 30f);
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Blackboard").transform;
        chalk.Clear();
        showStages = false;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Animate();
    }

    Transform Box(string name, Material m, float bx, float by, float w, float h, float z, float d)
    {
        var o = OiyoArcade.Prim(PrimitiveType.Cube, name, m, root).transform;
        o.localScale = new Vector3(OiyoField.U(w), OiyoField.U(h), d);
        o.position = field.W(bx, by, z);
        return o;
    }

    Transform Bar(string name, Material m, float x0, float y0, float x1, float y1, float thick, float z)
    {
        float len = Mathf.Max(1f, Mathf.Sqrt((x1 - x0) * (x1 - x0) + (y1 - y0) * (y1 - y0)));
        var o = Box(name, m, (x0 + x1) / 2f, (y0 + y1) / 2f, len + thick, thick, z, OiyoField.U(thick));
        o.rotation = Quaternion.Euler(0f, 0f, -Mathf.Atan2(y1 - y0, x1 - x0) * Mathf.Rad2Deg);
        return o;
    }

    void BuildScene()
    {
        // the blackboard in its wooden frame
        Box("Board", OiyoArcade.Glow(new Color(0.14f, 0.27f, 0.23f)), 180f, 280f, 1200f, 1600f, 0.8f, 0.2f);
        var line2 = OiyoArcade.Glow(new Color(0.17f, 0.32f, 0.27f));
        for (int yy = -200; yy < 800; yy += 6) Box("Grain", line2, 180f, yy, 1200f, 1f, 0.7f, 0.02f);
        var wood = OiyoArcade.Lit(new Color(0.54f, 0.35f, 0.17f), 0.3f);
        Box("FrameTop", wood, 180f, 4f, 380f, 8f, 0.3f, 0.2f);
        Box("FrameL", wood, 4f, 280f, 8f, 600f, 0.3f, 0.2f);
        Box("FrameR", wood, 356f, 280f, 8f, 600f, 0.3f, 0.2f);
        var ledge = OiyoArcade.Lit(new Color(0.75f, 0.54f, 0.29f), 0.3f);
        for (int k = 0; k < st.walls.Length / 4; k++) Bar("Ledge", ledge, st.walls[4 * k], st.walls[4 * k + 1], st.walls[4 * k + 2], st.walls[4 * k + 3], 6f, -0.1f);
        var tackMat = OiyoField.Sprite("CK/tack");
        for (int k = 0; k < st.tacks.Length / 2; k++) OiyoField.Quad("Tack", tackMat, root, 24f, 24f).position = field.W(st.tacks[2 * k], st.tacks[2 * k + 1], -0.2f);
        float scale = Mathf.Max(4f, Mathf.Round(PW / 14f));
        OiyoField.Quad("Pail", OiyoField.Sprite("CK/pail"), root, 14f * scale, 10f * scale).position = field.W(PX + PW / 2f, PY + PH / 2f + 2f, -0.2f);
        marble = OiyoField.Quad("Marble", OiyoField.Sprite("CK/marble"), root, 24f, 24f);
        pen = Box("Pen", OiyoArcade.Glow(new Color(1f, 0.83f, 0.23f)), 0f, 0f, 10f, 10f, -0.7f, 0.02f);
    }

    void SyncChalk()
    {
        while (chalk.Count < line.Count - 1)
        {
            int i = chalk.Count + 1;
            chalk.Add(Bar("Chalk", chalkMat, line[i - 1].x, line[i - 1].y, line[i].x, line[i].y, 4f, -0.15f));
        }
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("chalk-roll", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick();
        ReadInput();
        if (state == GameState.Playing && rolling && !over)
        {
            acc += dt;
            while (acc >= DT && !over) { acc -= DT; Step(); }
            if (over) End();
        }
        Animate();
    }

    void LetGo()
    {
        if (rolling || over) return;
        if (line.Count < 2)
        {
            line.Clear(); used = 0f;
            foreach (var c in chalk) Destroy(c.gameObject);
            chalk.Clear();
            return;
        }
        Release();
        synth.Tone(523f, 0.06f, Wave.Triangle, 0.1f, 392f);
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
                    // input is read once per frame: press, draw, lift
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (state == GameState.Ready) { state = GameState.Playing; continue; }
                        if (rolling || over || line.Count > 0 || !field.ToField(b.pos, out Vector2 f)) continue;
                        drawing = true; drawId = b.id; penShown = false;
                        AddPoint(f.x, f.y);
                        synth.Tone(880f, 0.03f, Wave.Triangle, 0.05f);
                    }
                    if (drawing)
                    {
                        foreach (var hp in OiyoArcade.Held()) if (hp.id == drawId && field.ToField(hp.pos, out Vector2 f)) AddPoint(f.x, f.y);
                        foreach (var e in OiyoArcade.Ended())
                        {
                            if (e.id != drawId) continue;
                            if (field.ToField(e.pos, out Vector2 f)) AddPoint(f.x, f.y);
                            drawing = false;
                            LetGo();
                        }
                    }
                    // keys: arrows move the chalk, Space puts it down or lifts it, Enter lets the marble roll
                    if (state == GameState.Playing && !rolling && !over)
                    {
                        Vector2 d = Vector2.zero;
                        if (Input.GetKeyDown(KeyCode.LeftArrow)) d = new Vector2(-6f, 0f);
                        else if (Input.GetKeyDown(KeyCode.RightArrow)) d = new Vector2(6f, 0f);
                        else if (Input.GetKeyDown(KeyCode.UpArrow)) d = new Vector2(0f, -6f);
                        else if (Input.GetKeyDown(KeyCode.DownArrow)) d = new Vector2(0f, 6f);
                        if (d != Vector2.zero)
                        {
                            penShown = true;
                            penAt = new Vector2(Mathf.Clamp(penAt.x + d.x, 0f, FW), Mathf.Clamp(penAt.y + d.y, 0f, FH));
                            if (penDown) AddPoint(penAt.x, penAt.y);
                        }
                        if (Input.GetKeyDown(KeyCode.Space))
                        {
                            penShown = true;
                            if (penDown) penDown = false;
                            else if (line.Count == 0) { AddPoint(penAt.x, penAt.y); penDown = true; }
                            else if (Vector2.Distance(line[line.Count - 1], penAt) < 1f) penDown = true;
                        }
                        if (confirm) { penDown = false; LetGo(); }
                    }
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
            OiyoArcade.Record(Slug, stageIdx, starsWon, Mathf.Max(0, Mathf.RoundToInt((st.ink - used) / 10f)), StageCount);
            burst.Emit(field.W(x, y, -1f), new Color(0.45f, 0.75f, 0.99f), 40, 4f, 0.1f, 1f);
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
        field.Fit(56f, 10f, 0f, 30f, 540f);
        SyncChalk();
        marble.gameObject.SetActive(!won);
        marble.position = field.W(x, y, -0.4f);
        marble.rotation = Quaternion.Euler(0f, 0f, -x * 2f);
        pen.gameObject.SetActive(penShown && !rolling);
        pen.position = field.W(penAt.x, penAt.y, -0.7f);
    }

    // ?oiyotest=1 prints the state to the browser console every frame for the automated play check. Before the line is
    // drawn it gives the board's own planned line as screen points (px from the top-left) to draw through.
    bool testLog;
    void TestTick()
    {
        if (!testLog) return;
        string nx = "null";
        if (state == GameState.Playing && !rolling && !over && line.Count == 0)
        {
            var sb = new System.Text.StringBuilder("[");
            for (int k = 0; k < st.plan.Length / 2; k++)
            {
                var sp = cam.WorldToScreenPoint(field.W(st.plan[2 * k], st.plan[2 * k + 1], 0f));
                if (k > 0) sb.Append(',');
                sb.Append($"{sp.x:F2},{Screen.height - sp.y:F2}");
            }
            nx = sb.Append(']').ToString();
        }
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"drawn\":{(line.Count > 0 ? 1 : 0)},\"used\":{used:F0},\"par\":{st.par:F0},\"x\":{x:F0},\"y\":{y:F0},\"next\":{nx},\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.3f, 0.67f, 0.97f, 0.97f);
    static readonly Color Dark = new Color(0.07f, 0.15f, 0.12f, 0.9f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("Thumbtacks {0}", ChalkRollStages.All[i].tacks.Length / 2);

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(0.95f, 0.98f, 0.96f), U("Chalk Roll"),
                U("Draw one chalk line. When you lift your finger the marble drops and rolls along it. Get it into the pail, off the thumbtacks. The less chalk you use, the more stars."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        var bar = new Rect(8f, 8f, w - 16f, 44f);
        OiyoArcade.Panel(bar, Dark);
        int pct = Mathf.RoundToInt(100f * (1f - used / st.ink));
        OiyoArcade.Text(new Rect(20f, 18f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>  " + F("Chalk {0}%", pct), 15, new Color(0.95f, 0.98f, 0.96f));
        OiyoArcade.Bar(new Rect(16f, 58f, w - 32f, 6f), 1f - used / st.ink, new Color(0.1f, 0.19f, 0.16f), pct < 20 ? new Color(1f, 0.53f, 0.53f) : new Color(0.97f, 0.98f, 0.98f));
        if (OiyoArcade.Button(new Rect(w - 56f, 12f, 40f, 36f), "<b>II</b>", OiyoScreens.Slate, 16))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap to start"), U("Draw a line, then lift to roll!"), 120f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            string detail = won ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : "";
            string body = won ? $"<size=14>{F("In with {0}% of the chalk", Mathf.RoundToInt(100f * used / st.ink))}</size>" : "";
            int r = OiyoScreens.Result(w, h, Dark, Accent, won, ResultLive, won ? U("Plop, it's in!") : U("The marble got away"), detail, body,
                won && stageIdx < StageCount - 1 ? U("Next stage") : null, won && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
