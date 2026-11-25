using System.Collections;
using UnityEngine;

// Carton Flip 3D: the web Carton Flip (src/components/games/CartonFlip.tsx, src/lib/games/carton-flip.ts) rebuilt in
// Unity on the web's own 360 × 560 px field (OiyoField). Press, pull down and let go to flick the milk carton toward
// the next shelf; it tumbles at its own steady spin, so the strength sets how long it flies and how far it turns.
// Land it standing up on every shelf to the top of the fridge. The physics runs on the web's fixed 1/240 s steps; the
// 30 kitchens are the web's own (CartonFlipStages.cs).
public class CartonFlipPlayer : MonoBehaviour
{
    const string Slug = "carton-flip";
    const int StageCount = 30;
    const float Gravity = 1400f, CartonW = 26f, CartonH = 44f, MinPower = 300f, MaxPower = 900f, Upright = 0.36f, DT = 1f / 240f;
    const float Pull = 3.2f; // flick strength per px pulled
    const int Hearts = 3;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of carton-flip.ts) ----------------
    CartonFlipStages.Level st;
    int stageIdx, starsWon, nShelves, on, hearts, flicks;
    float x, y, vx, vy, a, w;
    bool flying, over, won;

    float X0(int k) => st.shelves[3 * k];
    float X1(int k) => st.shelves[3 * k + 1];
    float SY(int k) => st.shelves[3 * k + 2];

    void StandOn(int k) { x = (X0(k) + X1(k)) / 2f; y = SY(k) - CartonH / 2f; vx = vy = a = w = 0f; flying = false; }

    static float AirTime(float v, float y0, float y1)
    {
        float qa = Gravity / 2f, qb = -v, qc = y0 - y1, d = qb * qb - 4f * qa * qc;
        if (d < 0f) return -1f;
        return (-qb + Mathf.Sqrt(d)) / (2f * qa);
    }

    bool Flick(float power)
    {
        if (over || flying) return false;
        float p = Mathf.Clamp(power, MinPower, MaxPower);
        float tx = (X0(on + 1) + X1(on + 1)) / 2f;
        float tt = AirTime(p, y + CartonH / 2f, SY(on + 1));
        float flight = tt > 0f ? tt : 2f * p / Gravity;
        vx = (tx - x) / flight;
        vy = -p;
        w = (tx >= x ? 1f : -1f) * st.spin;
        flying = true;
        flicks++;
        return true;
    }

    static float Wrap(float v)
    {
        v %= 2f * Mathf.PI;
        if (v > Mathf.PI) v -= 2f * Mathf.PI;
        if (v < -Mathf.PI) v += 2f * Mathf.PI;
        return v;
    }

    void Step(out bool landed, out bool crashed)
    {
        landed = false; crashed = false;
        if (over || !flying) return;
        float prevBottom = y + CartonH / 2f;
        vy += Gravity * DT;
        x += vx * DT;
        y += vy * DT;
        a += w * DT;
        int nx = on + 1;
        float bottom = y + CartonH / 2f;
        if (vy > 0f && prevBottom <= SY(nx) && bottom >= SY(nx) && x >= X0(nx) - 2f && x <= X1(nx) + 2f)
        {
            if (Mathf.Abs(Wrap(a)) <= Upright)
            {
                on++;
                float lx = x;
                StandOn(on);
                x = lx;
                landed = true;
                if (on == nShelves - 1) { over = true; won = true; }
                return;
            }
            Crash(); crashed = true;
            return;
        }
        if (y > 640f || x < -60f || x > 420f) { Crash(); crashed = true; }
    }

    void Crash()
    {
        hearts--;
        StandOn(on);
        if (hearts <= 0) over = true;
    }

    int StarsFor() => won ? hearts : 0;

    // ---------------- Scene ----------------
    OiyoField field;
    Camera cam;
    Transform root, carton, meterBack, meterFill;
    Transform[] glow;
    Renderer meterRen;
    Material okMat, hotMat;
    Bursts burst;
    Synth synth;
    bool showStages, dragging, charging;
    int dragId;
    float dragFromY, power, chargeT, acc;

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(360f, 560f, new Color(1f, 0.96f, 0.9f));
        cam = field.Cam;
        OiyoField.Lights(new Color(0.76f, 0.75f, 0.74f), 0.75f, 45f, -30f);
        burst = new Bursts(transform, 0.5f);
        synth = new Synth(gameObject);
        okMat = OiyoArcade.Glow(new Color(0.32f, 0.81f, 0.4f));
        hotMat = OiyoArcade.Glow(new Color(1f, 0.42f, 0.42f));
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int i, bool ready = true)
    {
        stageIdx = Mathf.Clamp(i, 0, StageCount - 1);
        StopAllCoroutines();
        st = CartonFlipStages.All[stageIdx];
        nShelves = st.shelves.Length / 3;
        on = 0; hearts = Hearts; flicks = 0; over = false; won = false; starsWon = 0;
        StandOn(0);
        dragging = false; charging = false; power = 0f; acc = 0f;
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Kitchen").transform;
        showStages = false;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Animate();
    }

    Transform Box(Transform parent, string name, Material m, float bx, float by, float bw, float bh, float z, float d)
    {
        var o = OiyoArcade.Prim(PrimitiveType.Cube, name, m, parent).transform;
        o.localScale = new Vector3(OiyoField.U(bw), OiyoField.U(bh), d);
        o.position = field.W(bx, by, z);
        return o;
    }

    void BuildScene()
    {
        // a tiled kitchen wall
        Box(root, "Wall", OiyoArcade.Glow(new Color(1f, 0.95f, 0.88f)), 180f, 280f, 1200f, 1600f, 0.8f, 0.2f);
        var tile = OiyoArcade.Glow(new Color(1f, 0.88f, 0.76f));
        for (int ty = 0; ty < 600; ty += 24) for (int tx = (ty / 24) % 2 == 0 ? 0 : 12; tx < 380; tx += 24) Box(root, "Tile", tile, tx + 11f, ty + 11f, 22f, 22f, 0.7f, 0.02f);
        var wood = OiyoArcade.Lit(new Color(0.54f, 0.35f, 0.17f), 0.3f);
        var woodDark = OiyoArcade.Lit(new Color(0.36f, 0.23f, 0.12f), 0.2f);
        var steel = OiyoArcade.Lit(new Color(0.91f, 0.93f, 0.94f), 0.6f, null, 0.4f);
        var flag = OiyoArcade.Glow(new Color(1f, 0.83f, 0.23f));
        var hint = OiyoArcade.Glow(new Color(0.2f, 0.6f, 0.94f));
        glow = new Transform[nShelves];
        for (int k = 0; k < nShelves; k++)
        {
            bool goal = k == nShelves - 1;
            float cx = (X0(k) + X1(k)) / 2f, sw = X1(k) - X0(k);
            Box(root, "Shelf", goal ? steel : wood, cx, SY(k) + 5f, sw, 10f, 0f, OiyoField.U(40f));
            Box(root, "Lip", goal ? steel : woodDark, cx, SY(k) + 12f, sw, 4f, -0.05f, OiyoField.U(42f));
            glow[k] = Box(root, "Next", hint, cx, SY(k) - 1.5f, sw, 3f, -0.3f, OiyoField.U(2f));
            if (goal)
            {
                Box(root, "Pole", flag, cx, SY(k) - 13f, 4f, 26f, -0.1f, OiyoField.U(4f));
                Box(root, "Flag", flag, cx + 9f, SY(k) - 21f, 14f, 10f, -0.1f, OiyoField.U(3f));
            }
        }
        // the carton: white box, grey roof, blue band, a little red cap
        carton = new GameObject("Carton").transform;
        carton.SetParent(root, false);
        void Part(Material m, float px, float py, float pw, float ph, float pd)
        {
            var o = OiyoArcade.Prim(PrimitiveType.Cube, "Part", m, carton).transform;
            o.localScale = new Vector3(OiyoField.U(pw), OiyoField.U(ph), OiyoField.U(pd));
            o.localPosition = new Vector3(OiyoField.U(px), -OiyoField.U(py), 0f);
        }
        Part(OiyoArcade.Lit(new Color(0.97f, 0.98f, 0.98f), 0.3f), 0f, 3f, CartonW, CartonH - 6f, 20f);
        Part(OiyoArcade.Lit(new Color(0.87f, 0.89f, 0.9f), 0.3f), 0f, -CartonH / 2f + 4f, CartonW, 8f, 18f);
        Part(OiyoArcade.Lit(new Color(0.3f, 0.67f, 0.97f), 0.3f), 0f, 4f, CartonW + 0.5f, 12f, 20.5f);
        Part(OiyoArcade.Lit(new Color(0.88f, 0.19f, 0.19f), 0.3f), 7.5f, -CartonH / 2f - 1.5f, 7f, 5f, 6f);
        meterBack = Box(root, "Meter", OiyoArcade.Lit(new Color(0.29f, 0.31f, 0.34f), 0.2f), 26f, 160f, 12f, 200f, -0.5f, 0.02f);
        meterFill = Box(root, "Fill", okMat, 26f, 160f, 12f, 200f, -0.55f, 0.02f);
        meterRen = meterFill.GetComponent<Renderer>();
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("carton-flip", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick();
        ReadInput();
        if (charging)
        {
            // the strength meter rises and falls while Space is held
            chargeT += dt;
            float ph = (chargeT * 0.8f) % 2f;
            power = MinPower + (MaxPower - MinPower) * (ph < 1f ? ph : 2f - ph);
        }
        if (state == GameState.Playing && flying)
        {
            acc += dt;
            while (acc >= DT && flying)
            {
                acc -= DT;
                Step(out bool landed, out bool crashed);
                if (landed)
                {
                    burst.Emit(field.W(x, y + CartonH / 2f, -0.5f), new Color(0.45f, 0.75f, 0.99f), 12, 2f, 0.05f, 0.4f);
                    synth.Tone(659f + on * 60f, 0.08f, Wave.Triangle, 0.12f);
                }
                if (crashed) synth.Tone(196f, 0.15f, Wave.Square, 0.08f, 110f);
            }
            if (!flying) acc = 0f;
            if (over) End();
        }
        Animate();
    }

    void Throw(float p)
    {
        if (state != GameState.Playing || !Flick(p)) return;
        power = 0f;
        synth.Tone(440f, 0.05f, Wave.Triangle, 0.1f, 660f);
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
                    // a flick is read once per frame: press, pull down, let go
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (state == GameState.Ready) { state = GameState.Playing; continue; }
                        if (flying || over || !field.ToField(b.pos, out Vector2 f)) continue;
                        dragging = true; dragId = b.id; dragFromY = f.y; power = 0f;
                    }
                    if (dragging)
                    {
                        foreach (var hp in OiyoArcade.Held())
                            if (hp.id == dragId && field.ToField(hp.pos, out Vector2 f)) power = Mathf.Min(MaxPower, MinPower + Mathf.Max(0f, f.y - dragFromY) * Pull);
                        foreach (var e in OiyoArcade.Ended())
                        {
                            if (e.id != dragId) continue;
                            dragging = false;
                            float d = field.ToField(e.pos, out Vector2 f) ? Mathf.Max(0f, f.y - dragFromY) : 0f;
                            if (d >= 10f) Throw(Mathf.Min(MaxPower, MinPower + d * Pull));
                            else power = 0f;
                        }
                    }
                    if (Input.GetKeyDown(KeyCode.Space) || confirm)
                    {
                        if (state == GameState.Ready) { state = GameState.Playing; return; }
                        if (!flying && !over) { charging = true; chargeT = 0f; }
                    }
                    if (charging && !Input.GetKey(KeyCode.Space) && !Input.GetKey(KeyCode.Return)) { charging = false; Throw(power); }
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
        dragging = false; charging = false;
        if (won)
        {
            state = GameState.Victory;
            OiyoArcade.Record(Slug, stageIdx, starsWon, hearts * 10, StageCount);
            burst.Emit(field.W(x, y, -1f), new Color(1f, 0.83f, 0.23f), 40, 4f, 0.1f, 1f);
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
        field.Fit(56f, 10f, 0f, 70f, 540f);
        for (int k = 0; k < nShelves; k++) glow[k].gameObject.SetActive(k == on + 1 && !over);
        carton.position = field.W(x, y, -0.3f);
        carton.rotation = Quaternion.Euler(0f, 0f, -a * Mathf.Rad2Deg);
        bool show = !flying && !over && power > 0f;
        meterBack.gameObject.SetActive(show);
        meterFill.gameObject.SetActive(show);
        if (show)
        {
            float f = (power - MinPower) / (MaxPower - MinPower);
            meterFill.localScale = new Vector3(OiyoField.U(12f), OiyoField.U(Mathf.Max(1f, 200f * f)), 0.02f);
            meterFill.position = field.W(26f, 260f - 100f * f, -0.55f);
            meterRen.sharedMaterial = f > 0.8f ? hotMat : okMat;
        }
    }

    // ?oiyotest=1 prints the state to the browser console every frame for the automated play check: while the carton
    // stands, the screen points of a pull (from, to) that gives the kitchen's own planned flick for this shelf.
    bool testLog;
    void TestTick()
    {
        if (!testLog) return;
        string nx = "null";
        if (state == GameState.Playing && !over && !flying && on < st.plan.Length)
        {
            float pull = (st.plan[on] - MinPower) / Pull;
            var p0 = cam.WorldToScreenPoint(field.W(180f, 200f, 0f));
            var p1 = cam.WorldToScreenPoint(field.W(180f, 200f + pull, 0f));
            nx = $"[{p0.x:F1},{Screen.height - p0.y:F1},{p1.x:F1},{Screen.height - p1.y:F1}]";
        }
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"on\":{on},\"flicks\":{flicks},\"hearts\":{hearts},\"next\":{nx},\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.3f, 0.67f, 0.97f, 0.97f);
    static readonly Color Dark = new Color(0.1f, 0.14f, 0.22f, 0.9f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("Shelves {0}", CartonFlipStages.All[i].shelves.Length / 3 - 1);

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
            int m = OiyoScreens.Menu(gw, gh, Dark, Accent, new Color(0.85f, 0.93f, 1f), U("Carton Flip"),
                U("Press, pull down and let go to flick the milk carton toward the next shelf. The harder the flick, the longer it flies and the more it turns. Land it standing up on every shelf to the top of the fridge."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        var bar = new Rect(8f, 8f, gw - 16f, 44f);
        OiyoArcade.Panel(bar, Dark);
        string heartLine = $"<color=#ff6b6b>{new string('♥', Mathf.Max(0, hearts))}</color><color=#ffffff44>{new string('♥', Hearts - Mathf.Max(0, hearts))}</color>";
        OiyoArcade.Text(new Rect(20f, 18f, gw - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>  " + F("Shelf {0}/{1}", on, nShelves - 1) + "  " + heartLine, 15, new Color(0.9f, 0.95f, 1f));
        if (OiyoArcade.Button(new Rect(gw - 56f, 12f, 40f, 36f), "<b>II</b>", OiyoScreens.Slate, 16))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (state == GameState.Ready)
            OiyoScreens.Hint(gw, gh, Dark, U("Tap to start"), U("Pull down and let go to flick!"), 120f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(gw, gh, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            string detail = won ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : "";
            string body = won ? $"<size=14>{F("Up top in {0} flicks", flicks)}</size>" : "";
            int r = OiyoScreens.Result(gw, gh, Dark, Accent, won, ResultLive, won ? U("On top of the fridge!") : U("Out of hearts"), detail, body,
                won && stageIdx < StageCount - 1 ? U("Next stage") : null, won && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
