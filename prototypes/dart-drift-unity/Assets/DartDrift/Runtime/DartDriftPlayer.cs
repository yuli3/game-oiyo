using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Dart Drift 3D: the web Dart Drift (src/components/games/DartDrift.tsx, src/lib/games/dart-drift.ts) rebuilt in Unity
// on the web's own 360 × 560 px field (OiyoField, y down). An aiming ring sways over the board along a Lissajous path;
// a tap throws a dart where the ring is. Bull 50, outer bull 25, numbers as marked, ×3 on the inner thin ring, ×2 on the
// outer one. Reach the stage's score with the darts. The 30 stages are the web's own (DartDriftStages.cs).
public class DartDriftPlayer : MonoBehaviour
{
    const string Slug = "dart-drift";
    const int StageCount = 30;
    const float CX = 180f, CY = 250f, R = 140f, Bull = 0.06f, OuterBull = 0.13f, T0 = 0.56f, T1 = 0.64f, D0 = 0.92f;
    static readonly int[] Sectors = { 20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5 };

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of dart-drift.ts) ----------------
    DartDriftStages.Level st;
    int stageIdx, starsWon, thrown, total;
    float t;
    bool over, won;
    readonly List<Vector2> hits = new List<Vector2>();

    Vector2 Reticle(float time) => new Vector2(st.centre[0] + st.amp[0] * Mathf.Sin(st.rate[0] * time + st.phase[0]), st.centre[1] + st.amp[1] * Mathf.Sin(st.rate[1] * time + st.phase[1]));

    static int Sector(float dx, float dy)
    {
        float ang = Mathf.Atan2(dx, -dy) * Mathf.Rad2Deg;
        return Mathf.FloorToInt((((ang + 9f) % 360f) + 360f) % 360f / 18f);
    }

    static int PointsAt(Vector2 p)
    {
        float dx = p.x - CX, dy = p.y - CY;
        float d = Mathf.Sqrt(dx * dx + dy * dy) / R;
        if (d > 1f) return 0;
        if (d < Bull) return 50;
        if (d < OuterBull) return 25;
        int n = Sectors[Sector(dx, dy)];
        if (d >= T0 && d < T1) return n * 3;
        if (d >= D0) return n * 2;
        return n;
    }

    int Throw()
    {
        if (over || thrown >= st.darts) return -1;
        var p = Reticle(t);
        int pts = PointsAt(p);
        hits.Add(p);
        total += pts;
        thrown++;
        if (thrown >= st.darts) { over = true; won = total >= st.need; }
        return pts;
    }

    int StarsFor()
    {
        if (!won) return 0;
        if (total >= st.par) return 3;
        if (total >= Mathf.CeilToInt((st.need + st.par) / 2f)) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    OiyoField field;
    Camera cam;
    Transform root, ring;
    Transform[] ringTicks;
    readonly List<Transform> darts = new List<Transform>();
    Transform[] spare;
    Material shaftMat, flightMat;
    Bursts sparkle;
    Synth synth;
    bool showStages;
    float popT; string popText; Vector2 popAt;

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(360f, 560f, new Color(0.23f, 0.18f, 0.29f));
        cam = field.Cam;
        OiyoField.Lights(new Color(0.7f, 0.7f, 0.72f), 0.7f, 45f, -30f);
        sparkle = new Bursts(transform, 0.5f);
        synth = new Synth(gameObject);
        shaftMat = OiyoArcade.Lit(new Color(0.68f, 0.71f, 0.74f), 0.8f, null, 0.7f);
        flightMat = OiyoArcade.Lit(new Color(0.3f, 0.67f, 0.97f), 0.4f);
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int i, bool ready = true)
    {
        stageIdx = Mathf.Clamp(i, 0, StageCount - 1);
        StopAllCoroutines();
        st = DartDriftStages.All[stageIdx];
        thrown = 0; total = 0; t = 0f; over = false; won = false; starsWon = 0; popT = 0f;
        hits.Clear(); darts.Clear();
        botTapAt = -1f; botCalm = 0.4f;
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Board").transform;
        showStages = false;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Animate(0f);
    }

    static Texture2D BoardTexture()
    {
        const int S = 96;
        var tex = new Texture2D(S, S, TextureFormat.RGBA32, false) { filterMode = FilterMode.Point, wrapMode = TextureWrapMode.Clamp };
        var px = new Color32[S * S];
        for (int y = 0; y < S; y++)
            for (int x = 0; x < S; x++)
            {
                // texture rows run bottom-up; field y runs down
                float dx = (x + 0.5f - S / 2f) / (S / 2f) * 1.08f, dy = -(y + 0.5f - S / 2f) / (S / 2f) * 1.08f;
                float d = Mathf.Sqrt(dx * dx + dy * dy);
                int k = Sector(dx, dy);
                Color32 c;
                if (d > 1.08f) c = new Color32(92, 58, 30, 255);
                else if (d > 1f) c = new Color32(33, 37, 41, 255);
                else if (d < Bull) c = new Color32(224, 49, 49, 255);
                else if (d < OuterBull) c = new Color32(47, 158, 68, 255);
                else if ((d >= T0 && d < T1) || d >= D0) c = k % 2 == 1 ? new Color32(47, 158, 68, 255) : new Color32(224, 49, 49, 255);
                else c = k % 2 == 1 ? new Color32(248, 240, 227, 255) : new Color32(33, 37, 41, 255);
                px[y * S + x] = c;
            }
        tex.SetPixels32(px); tex.Apply(false);
        return tex;
    }

    void BuildScene()
    {
        var wall = OiyoArcade.Prim(PrimitiveType.Cube, "Wall", OiyoArcade.Lit(new Color(0.29f, 0.23f, 0.36f), 0.1f), root).transform;
        wall.localScale = new Vector3(OiyoField.U(420f), OiyoField.U(620f), 0.2f);
        wall.position = field.W(180f, 280f, 0.6f);
        var back = OiyoArcade.Prim(PrimitiveType.Cube, "Backing", OiyoArcade.Lit(new Color(0.36f, 0.23f, 0.12f), 0.2f), root).transform;
        back.localScale = new Vector3(OiyoField.U((R + 16f) * 2f), OiyoField.U((R + 16f) * 2f), 0.2f);
        back.position = field.W(CX, CY, 0.3f);
        var board = OiyoArcade.Prim(PrimitiveType.Cylinder, "Board", OiyoArcade.Lit(Color.white, 0.15f, BoardTexture()), root).transform;
        board.localScale = new Vector3(OiyoField.U(R * 2f * 1.08f), 0.1f, OiyoField.U(R * 2f * 1.08f));
        board.rotation = Quaternion.Euler(-90f, 0f, 0f);
        board.position = field.W(CX, CY, 0.1f);
        var gold = OiyoArcade.Glow(new Color(1f, 0.83f, 0.23f));
        ring = new GameObject("Ring").transform;
        ring.SetParent(root, false);
        for (int k = 0; k < 16; k++)
        {
            float a = k * Mathf.PI / 8f;
            var seg = OiyoArcade.Prim(PrimitiveType.Cube, "Arc", gold, ring).transform;
            seg.localPosition = new Vector3(Mathf.Cos(a) * OiyoField.U(12f), Mathf.Sin(a) * OiyoField.U(12f), 0f);
            seg.localRotation = Quaternion.Euler(0f, 0f, a * Mathf.Rad2Deg);
            seg.localScale = new Vector3(OiyoField.U(3f), OiyoField.U(5.5f), 0.02f);
        }
        ringTicks = new Transform[4];
        for (int k = 0; k < 4; k++)
        {
            ringTicks[k] = OiyoArcade.Prim(PrimitiveType.Cube, "Tick", gold, ring).transform;
            float a = k * Mathf.PI / 2f;
            ringTicks[k].localPosition = new Vector3(Mathf.Cos(a) * OiyoField.U(16f), Mathf.Sin(a) * OiyoField.U(16f), 0f);
            ringTicks[k].localScale = k % 2 == 0 ? new Vector3(OiyoField.U(8f), OiyoField.U(2f), 0.02f) : new Vector3(OiyoField.U(2f), OiyoField.U(8f), 0.02f);
        }
        spare = new Transform[8];
        for (int k = 0; k < spare.Length; k++) spare[k] = MakeDart(new Vector2(24f + k * 30f, 520f), -0.1f);
    }

    Transform MakeDart(Vector2 at, float z)
    {
        var d = new GameObject("Dart").transform;
        d.SetParent(root, false);
        var shaft = OiyoArcade.Prim(PrimitiveType.Cube, "Shaft", shaftMat, d).transform;
        shaft.localScale = new Vector3(OiyoField.U(2f), OiyoField.U(16f), OiyoField.U(2f));
        shaft.localPosition = new Vector3(0f, OiyoField.U(8f), 0f);
        var fl = OiyoArcade.Prim(PrimitiveType.Cube, "Flight", flightMat, d).transform;
        fl.localScale = new Vector3(OiyoField.U(9f), OiyoField.U(8f), OiyoField.U(2f));
        fl.localPosition = new Vector3(0f, OiyoField.U(18f), 0f);
        d.position = field.W(at.x, at.y, z);
        return d;
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("dart-drift", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        if (state == GameState.Playing && !over) t += dt;
        popT = Mathf.Max(0f, popT - dt);
        Animate(dt);
    }

    void Press()
    {
        if (state != GameState.Playing || over) return;
        int pts = Throw();
        if (pts < 0) return;
        var p = hits[hits.Count - 1];
        darts.Add(MakeDart(p, -0.15f));
        popT = 0.9f; popText = pts > 0 ? "+" + pts : "0"; popAt = p;
        sparkle.Emit(field.W(p.x, p.y, -0.4f), pts >= 50 ? new Color(1f, 0.83f, 0.23f) : Color.white, pts >= 40 ? 18 : 6, 3f, 0.07f, 0.4f);
        synth.Tone(pts >= 50 ? 988f : pts >= 20 ? 784f : pts > 0 ? 523f : 196f, 0.1f, Wave.Triangle, 0.14f);
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
                    // input is read once per frame: any tap throws a dart
                    bool fire = false;
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (state == GameState.Ready) { state = GameState.Playing; continue; }
                        if (OiyoArcade.OverUi(b.pos)) continue;
                        fire = true;
                    }
                    if (Input.GetKeyDown(KeyCode.Space) || confirm)
                    {
                        if (state == GameState.Ready) state = GameState.Playing;
                        else fire = true;
                    }
                    if (fire) Press();
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
            OiyoArcade.Record(Slug, stageIdx, starsWon, total, StageCount);
            sparkle.Emit(field.W(CX, CY, -1f), new Color(1f, 0.85f, 0.25f), 40, 5f, 0.1f, 1f);
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
        field.Fit(56f, 10f, 0f, 70f, 545f);
        var p = Reticle(t);
        ring.gameObject.SetActive(!over);
        ring.position = field.W(p.x, p.y, -0.3f);
        for (int k = 0; k < spare.Length; k++) spare[k].gameObject.SetActive(k < st.darts - thrown);
    }

    // ?oiyotest=1 prints the state to the browser console for the automated play check, with the screen point to tap
    // when a careful thrower would: the ring is about to pass over the bull or a big treble.
    bool testLog; float testT, botTapAt = -1f, botCalm;
    void TestTick(float dt)
    {
        if (!testLog) return;
        bool go = false;
        if (state == GameState.Playing && !over && t >= botCalm)
        {
            // the tap is read this frame or the next: throw only when both would land on the bull or a big treble
            if (PointsAt(Reticle(t)) >= 48 && PointsAt(Reticle(t + Mathf.Max(dt, 0.017f))) >= 48) { go = true; botCalm = t + 0.5f; }
        }
        if ((testT -= dt) > 0f && !go) return;
        testT = 0.05f;
        string next = "null";
        if (go) { var sp = cam.WorldToScreenPoint(field.W(CX, 480f, 0f)); next = $"[{sp.x:F1},{Screen.height - sp.y:F1}]"; }
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"thrown\":{thrown},\"of\":{st.darts},\"total\":{total},\"need\":{st.need},\"par\":{st.par},\"next\":{next},\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(1f, 0.83f, 0.23f, 0.97f);
    static readonly Color Dark = new Color(0.1f, 0.08f, 0.14f, 0.9f);

    Vector2 Gui(Vector2 f, float z = -0.3f) => OiyoArcade.ToGui(cam.WorldToScreenPoint(field.W(f.x, f.y, z)));

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("Goal {0}", DartDriftStages.All[i].need);

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(1f, 0.95f, 0.8f), U("Dart Drift"),
                U("The aiming ring sways over the board. Tap to throw when it crosses the bullseye or a treble, and reach the goal with your darts."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        // the numbers round the board
        for (int k = 0; k < 20; k++)
        {
            float a = k * 18f * Mathf.Deg2Rad;
            var p = Gui(new Vector2(CX + Mathf.Sin(a) * (R + 9f), CY - Mathf.Cos(a) * (R + 9f)));
            OiyoArcade.Text(new Rect(p.x - 12f, p.y - 9f, 24f, 18f), Sectors[k].ToString(), 11, new Color(0.97f, 0.97f, 0.98f), TextAnchor.MiddleCenter, true);
        }
        if (popT > 0f)
        {
            var p = Gui(popAt + new Vector2(0f, -26f - (0.9f - popT) * 30f), -0.5f);
            OiyoArcade.Shadowed(new Rect(p.x - 40f, p.y - 16f, 80f, 32f), popText, 20, new Color(1f, 0.83f, 0.23f), TextAnchor.MiddleCenter);
        }
        var bar = new Rect(8f, 8f, w - 16f, 44f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 18f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>  " + F("Goal {0}", st.need) + "   " + F("Points {0}", total) + "   " + F("Darts {0}", st.darts - thrown), 15, new Color(1f, 0.95f, 0.8f));
        if (OiyoArcade.Button(new Rect(w - 56f, 12f, 40f, 36f), "<b>II</b>", OiyoScreens.Slate, 16))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap to start"), U("Tap as the ring passes a good spot!"), 120f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            string detail = won ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : "";
            string body = $"<size=14>{F("{0} points", total)}</size>";
            int r = OiyoScreens.Result(w, h, Dark, Accent, won, ResultLive, won ? U("Goal reached!") : U("Not enough points"), detail, body,
                won && stageIdx < StageCount - 1 ? U("Next stage") : null, won && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
