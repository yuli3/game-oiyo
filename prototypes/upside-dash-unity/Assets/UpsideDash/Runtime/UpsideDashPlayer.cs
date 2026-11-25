using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Upside Dash 3D: the web Upside Dash (src/components/games/UpsideDash.tsx, src/lib/games/upside-dash.ts) rebuilt in
// Unity on the web's own 360 × 560 px field (OiyoField). A magnet robot runs a tunnel on its own; tap and it flips
// between floor and ceiling. Dodge spikes and saws, grab batteries, reach the end with a heart left.
// The physics runs on the web's fixed 1/120 s steps; the 30 tunnels are the web's own (UpsideDashStages.cs).
public class UpsideDashPlayer : MonoBehaviour
{
    const string Slug = "upside-dash";
    const int StageCount = 30;
    const float Floor = 400f, Ceil = 160f, Mid = (Floor + Ceil) / 2f, Half = 12f, FlipT = 0.22f, SafeT = 1f, PlayerX = 90f;
    const int Hearts = 3;
    const float DT = 1f / 120f;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of upside-dash.ts) ----------------
    UpsideDashStages.Level st;
    int stageIdx, starsWon, hearts, hits, batteries, side, flipsMade;
    float t, x, y, safe;
    bool flipping, over, won;
    bool[] got;

    static void Band(int lane, out float y0, out float y1)
    {
        if (lane == 0) { y0 = Floor - 18f; y1 = Floor + 30f; }
        else if (lane == 2) { y0 = Ceil - 30f; y1 = Ceil + 18f; }
        else { y0 = Mid - 22f; y1 = Mid + 22f; }
    }

    bool Flip()
    {
        if (over || flipping) return false;
        side = side == 0 ? 1 : 0;
        flipping = true;
        flipsMade++;
        return true;
    }

    void Step(out bool hit, out bool battery)
    {
        hit = false; battery = false;
        if (over) return;
        t += DT;
        x += st.speed * DT;
        if (flipping)
        {
            float target = side == 0 ? Floor : Ceil;
            float v = (Floor - Ceil) / FlipT * DT;
            if (Mathf.Abs(target - y) <= v) { y = target; flipping = false; }
            else y += Mathf.Sign(target - y) * v;
        }
        safe = Mathf.Max(0f, safe - DT);
        if (safe == 0f)
        {
            int n = st.hazards.Length / 3;
            for (int k = 0; k < n; k++)
            {
                float hx = st.hazards[3 * k], hw = st.hazards[3 * k + 1];
                int lane = (int)st.hazards[3 * k + 2];
                if (hx > x + Half || hx + hw < x - Half) continue;
                Band(lane, out float y0, out float y1);
                if (y + Half > y0 && y - Half < y1) { hearts--; hits++; safe = SafeT; hit = true; break; }
            }
        }
        int nb = st.batteries.Length / 2;
        for (int k = 0; k < nb; k++)
        {
            if (got[k] || Mathf.Abs(st.batteries[2 * k] - x) > 16f || Mathf.Abs(st.batteries[2 * k + 1] - y) > 22f) continue;
            got[k] = true; batteries++; battery = true;
        }
        if (hearts <= 0) over = true;
        else if (x >= st.length) { over = true; won = true; }
    }

    int StarsFor()
    {
        if (!won) return 0;
        if (hits == 0 && batteries >= st.par) return 3;
        if (hits <= 1) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    OiyoField field;
    Camera cam;
    Transform root, world, bot;
    Transform[] batteryObj;
    readonly List<Transform> saws = new List<Transform>();
    Material botMat, batMat;
    Bursts sparkle;
    Synth synth;
    bool showStages;
    float acc, flash;

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(360f, 560f, new Color(0.11f, 0.15f, 0.25f));
        cam = field.Cam;
        OiyoField.Lights(new Color(0.6f, 0.62f, 0.7f), 0.7f, 35f, -30f);
        sparkle = new Bursts(transform, 0.5f);
        synth = new Synth(gameObject);
        botMat = OiyoField.Sprite("UD/bot");
        batMat = OiyoField.Sprite("UD/battery");
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int i, bool ready = true)
    {
        stageIdx = Mathf.Clamp(i, 0, StageCount - 1);
        StopAllCoroutines();
        st = UpsideDashStages.All[stageIdx];
        t = 0f; x = 0f; y = Floor; side = 0; flipping = false; hearts = Hearts; safe = 0f; hits = 0; batteries = 0; flipsMade = 0;
        over = false; won = false; starsWon = 0; acc = 0f; flash = 0f;
        got = new bool[st.batteries.Length / 2];
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Tunnel").transform;
        showStages = false;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Animate(0f);
    }

    Transform Box(Transform parent, string name, Material m, float bx, float by, float w, float h, float z, float d)
    {
        var o = OiyoArcade.Prim(PrimitiveType.Cube, name, m, parent).transform;
        o.localScale = new Vector3(OiyoField.U(w), OiyoField.U(h), d);
        o.position = field.W(bx, by, z);
        return o;
    }

    void BuildScene()
    {
        saws.Clear(); // the old tunnel's saws went with its root
        var rock = OiyoArcade.Lit(new Color(0.29f, 0.31f, 0.34f), 0.2f);
        Box(root, "Back", OiyoArcade.Lit(new Color(0.14f, 0.19f, 0.34f), 0.1f), 180f, 280f, 1400f, 1400f, 1.2f, 0.2f);
        Box(root, "Floor", rock, 180f, Floor + Half + 60f, 1400f, 120f, 0f, 1.2f);
        Box(root, "Ceiling", rock, 180f, Ceil - Half - 60f, 1400f, 120f, 0f, 1.2f);
        world = new GameObject("World").transform;
        world.SetParent(root, false);
        var stripe = OiyoArcade.Lit(new Color(0.18f, 0.24f, 0.4f), 0.1f);
        for (float sx = 0f; sx < st.length + 400f; sx += 120f) Box(world, "Stripe", stripe, sx, Mid, 40f, Floor - Ceil + 2 * Half, 1f, 0.05f);
        var spike = OiyoArcade.Lit(new Color(1f, 0.42f, 0.42f), 0.4f);
        var sawMat = OiyoArcade.Lit(new Color(0.8f, 0.83f, 0.86f), 0.8f, null, 0.6f);
        int n = st.hazards.Length / 3;
        for (int k = 0; k < n; k++)
        {
            float hx = st.hazards[3 * k], hw = st.hazards[3 * k + 1];
            int lane = (int)st.hazards[3 * k + 2];
            if (lane == 1)
            {
                var s = new GameObject("Saw").transform;
                s.SetParent(world, false);
                s.position = field.W(hx + hw / 2f, Mid, -0.2f);
                var disc = OiyoArcade.Prim(PrimitiveType.Cylinder, "Disc", sawMat, s).transform;
                disc.localScale = new Vector3(OiyoField.U(30f), OiyoField.U(4f), OiyoField.U(30f));
                disc.localRotation = Quaternion.Euler(-90f, 0f, 0f);
                for (int q = 0; q < 8; q++)
                {
                    var tooth = OiyoArcade.Prim(PrimitiveType.Cube, "Tooth", sawMat, s).transform;
                    float a = q * Mathf.PI / 4f;
                    tooth.localPosition = new Vector3(Mathf.Cos(a) * OiyoField.U(18f), Mathf.Sin(a) * OiyoField.U(18f), 0f);
                    tooth.localRotation = Quaternion.Euler(0f, 0f, a * Mathf.Rad2Deg + 45f);
                    tooth.localScale = Vector3.one * OiyoField.U(8f);
                }
                saws.Add(s);
                continue;
            }
            // a row of teeth: cubes turned 45° and half sunk into the floor or ceiling
            for (float sx = hx + 6f; sx < hx + hw - 2f; sx += 12f)
            {
                var tooth = Box(world, "Spike", spike, sx, lane == 0 ? Floor + Half : Ceil - Half, 10f, 10f, -0.1f, OiyoField.U(14f));
                tooth.rotation = Quaternion.Euler(0f, 0f, 45f);
            }
        }
        // the finish line
        var white = OiyoArcade.Lit(Color.white, 0.2f);
        var black = OiyoArcade.Lit(new Color(0.13f, 0.15f, 0.16f), 0.2f);
        for (float fy = Ceil - Half; fy < Floor + Half; fy += 12f) Box(world, "Finish", ((int)(fy / 12f)) % 2 == 0 ? white : black, st.length + 6f, fy + 6f, 12f, 12f, 0.3f, 0.05f);
        int nb = st.batteries.Length / 2;
        batteryObj = new Transform[nb];
        for (int k = 0; k < nb; k++)
        {
            batteryObj[k] = OiyoField.Quad("Battery", batMat, world, 24f, 24f);
            batteryObj[k].position = field.W(st.batteries[2 * k], st.batteries[2 * k + 1], -0.3f);
        }
        bot = OiyoField.Quad("Bot", botMat, root, 30f, 30f);
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("upside-dash", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        if (state == GameState.Playing && !over)
        {
            acc += dt;
            while (acc >= DT && !over)
            {
                acc -= DT;
                Step(out bool hit, out bool battery);
                if (hit)
                {
                    flash = 0.4f;
                    sparkle.Emit(field.W(PlayerX, y, -0.6f), new Color(1f, 0.42f, 0.42f), 14, 3f, 0.06f, 0.5f);
                    synth.Tone(180f, 0.15f, Wave.Square, 0.12f);
                }
                if (battery)
                {
                    sparkle.Emit(field.W(PlayerX, y, -0.6f), new Color(1f, 0.83f, 0.23f), 8, 2f, 0.05f, 0.4f);
                    synth.Tone(988f, 0.06f, Wave.Triangle, 0.1f);
                }
            }
            if (over) End();
        }
        flash = Mathf.Max(0f, flash - dt);
        Animate(dt);
    }

    void Tap()
    {
        if (state == GameState.Ready) { state = GameState.Playing; return; }
        if (state != GameState.Playing) return;
        if (Flip()) synth.Tone(523f, 0.06f, Wave.Triangle, 0.1f, 0f, 2f);
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
                    // input is read once per frame: a tap flips
                    bool tap = OiyoArcade.Began().Count > 0;
                    if (Input.GetKeyDown(KeyCode.Space) || Input.GetKeyDown(KeyCode.UpArrow) || Input.GetKeyDown(KeyCode.DownArrow) || confirm) tap = true;
                    if (tap) Tap();
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
            OiyoArcade.Record(Slug, stageIdx, starsWon, batteries * 10 + hearts * 5, StageCount);
            sparkle.Emit(field.W(180f, Mid, -1f), new Color(0.45f, 0.75f, 0.99f), 40, 4f, 0.1f, 1f);
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
        field.Fit(56f, 10f, 0f, Ceil - 40f, Floor + 40f);
        float camX = x - PlayerX;
        world.localPosition = new Vector3(-OiyoField.U(camX), 0f, 0f);
        foreach (var s in saws) s.Rotate(0f, 0f, -dt * 600f, Space.Self);
        for (int k = 0; k < batteryObj.Length; k++) batteryObj[k].gameObject.SetActive(!got[k]);
        bot.position = field.W(PlayerX, y, -0.4f);
        float turn = (1f - (y - Ceil) / (Floor - Ceil)) * 180f;
        bot.rotation = Quaternion.Euler(0f, 0f, turn);
        bot.gameObject.SetActive(safe == 0f || Mathf.FloorToInt(t * 12f) % 2 == 0);
    }

    // ?oiyotest=1 prints the state to the browser console for the automated play check, with the screen point to tap
    // once the robot reaches the next flip of the tunnel's own plan.
    bool testLog; float testT;
    void TestTick(float dt)
    {
        if (!testLog) return;
        bool due = state == GameState.Playing && !over && !flipping && flipsMade < st.flips.Length && x >= st.flips[flipsMade];
        if ((testT -= dt) > 0f && !due) return;
        testT = 0.05f;
        string nx = "null";
        if (due) { var sp = cam.WorldToScreenPoint(field.W(180f, Mid, 0f)); nx = $"[{sp.x:F1},{Screen.height - sp.y:F1}]"; }
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"flips\":{flipsMade},\"x\":{x:F0},\"hits\":{hits},\"batteries\":{batteries},\"par\":{st.par},\"next\":{nx},\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.3f, 0.67f, 0.97f, 0.97f);
    static readonly Color Dark = new Color(0.07f, 0.09f, 0.16f, 0.9f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("Batteries {0}", UpsideDashStages.All[i].par);

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(0.65f, 0.85f, 1f), U("Upside Dash"),
                U("A magnet robot runs the tunnel on its own. Tap and it flips between floor and ceiling. Dodge the spikes and saws, grab batteries and reach the end with a heart left."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        if (flash > 0f) OiyoArcade.Fill(new Rect(0f, 0f, w, h), new Color(1f, 0.42f, 0.42f, flash));
        var bar = new Rect(8f, 8f, w - 16f, 44f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 18f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>  <color=#ff6b6b>" + HeartGlyphs.Substring(0, Mathf.Max(0, hearts)) + "</color>   " + F("Batteries {0}", batteries + "/" + st.par), 15, new Color(0.65f, 0.85f, 1f));
        OiyoArcade.Bar(new Rect(16f, 58f, w - 32f, 6f), Mathf.Clamp01(x / st.length), new Color(0.2f, 0.23f, 0.25f), new Color(0.3f, 0.67f, 0.97f));
        if (OiyoArcade.Button(new Rect(w - 56f, 12f, 40f, 36f), "<b>II</b>", OiyoScreens.Slate, 16))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap to start"), U("Tap to flip upside down!"), 120f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            string detail = won ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : "";
            string body = $"<size=14>{F("{0} batteries · {1} bumps", batteries, hits)}</size>";
            int r = OiyoScreens.Result(w, h, Dark, Accent, won, ResultLive, won ? U("Through the tunnel!") : U("Out of hearts"), detail, body,
                won && stageIdx < StageCount - 1 ? U("Next stage") : null, won && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }

    const string HeartGlyphs = "♥♥♥";
}
