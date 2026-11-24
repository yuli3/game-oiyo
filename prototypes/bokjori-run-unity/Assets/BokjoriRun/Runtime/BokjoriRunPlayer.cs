using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Bokjori Run 3D: the web Bokjori Run (src/components/games/BokjoriRun.tsx, src/lib/games/bokjori-run.ts)
// rebuilt in Unity. The rules are the web's, in its own px: the runner runs at the alley's speed, a
// throw winds up for up to 0.9 s and leaves at 72° with 150 + 330 p px/s plus a quarter of the run speed
// (gravity 900), a strainer over the wall into a yard is a delivery (a dark house counts against you),
// one hitting the wall drops into the alley, one landing on a gate-house or roof is lost, and running
// into a dog without jumping stumbles you and drops a strainer. The 30 alleys are the web's own
// (BokjoriRunStages.cs). Keyboard: Up or Space jumps, hold and release Right or X throws.
public class BokjoriRunPlayer : MonoBehaviour
{
    const string Slug = "bokjori-run";
    const int StageCount = 30;
    const float HandH = 40f, ChargeTime = 0.9f, Gravity = 900f, JumpV = 430f, RunG = 1400f, DogW = 30f, PX = 30f;
    static readonly float ThrowAngle = 72f * Mathf.Deg2Rad;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of bokjori-run.ts) ----------------
    struct House { public float wall, front, wallH, yard, houseH; public bool wants; }
    class Strainer { public float x, y, vx, vy, spin; public bool done; public string result = ""; public int house = -1; public Transform t; public float rest; }
    BokjoriRunStages.Level level;
    int stageIdx;
    House[] houses;
    float time, x, y, vy, stumble, charge;
    bool charging, over, won;
    int left, wrong, missed, bitten, starsWon;
    bool[] delivered;
    readonly List<Strainer> flying = new List<Strainer>();

    float YardStart(House h) => h.wall + h.front;
    float YardEnd(House h) => h.wall + h.front + h.yard;
    float Speed => level.speed * (stumble > 0f ? 0.5f : 1f);
    static float Power(float t) => Mathf.Min(1f, t / ChargeTime);

    void NewRun()
    {
        int n = level.houses.Length / 6;
        houses = new House[n];
        for (int i = 0; i < n; i++)
        {
            var a = level.houses;
            houses[i] = new House { wall = a[i * 6], front = a[i * 6 + 1], wallH = a[i * 6 + 2], yard = a[i * 6 + 3], houseH = a[i * 6 + 4], wants = a[i * 6 + 5] > 0.5f };
        }
        time = 0f; x = 0f; y = 0f; vy = 0f; stumble = 0f; charge = 0f; charging = false; over = false; won = false;
        left = level.strainers; wrong = 0; missed = 0; bitten = 0;
        delivered = new bool[n];
        flying.Clear();
    }

    bool Jump() { if (over || y > 0f) return false; vy = JumpV; return true; }
    void StartCharge() { if (over || left <= 0) return; charging = true; charge = 0f; }
    bool Release()
    {
        if (!charging) return false;
        charging = false;
        if (over || left <= 0) return false;
        float p = Power(charge);
        float sp = 150f + 330f * p;
        var s = new Strainer { x = x + 6f, y = y + HandH, vx = Speed * 0.25f + Mathf.Cos(ThrowAngle) * sp, vy = Mathf.Sin(ThrowAngle) * sp, spin = 8f + p * 10f };
        s.t = OiyoField.Quad("Strainer", strainerMat, root, 24f, 24f);
        flying.Add(s);
        left--;
        return true;
    }

    // one strainer, one substep; true when it comes to rest
    bool StepStrainer(Strainer s, float h)
    {
        float px = s.x;
        s.vy -= Gravity * h;
        s.x += s.vx * h;
        s.y += s.vy * h;
        for (int i = 0; i < houses.Length; i++)
        {
            var hs = houses[i];
            if (px < hs.wall && s.x >= hs.wall && s.y < hs.wallH) { s.x = hs.wall - 1f; s.vx = -Mathf.Abs(s.vx) * 0.2f; s.house = -1; s.result = "wall"; }
            if (s.result != "wall" && s.x >= hs.wall && s.x <= hs.wall + hs.front && s.y <= hs.wallH && s.vy < 0f) { s.y = hs.wallH; s.result = "roof"; s.house = i; return true; }
            float face = YardEnd(hs);
            if (px < face && s.x >= face)
            {
                if (s.y < hs.houseH) { s.x = face - 2f; s.vx = -Mathf.Abs(s.vx) * 0.25f; }
                else { s.result = "roof"; s.house = i; return true; }
            }
        }
        if (s.y <= 0f)
        {
            s.y = 0f;
            if (s.result != "wall")
            {
                int idx = -1;
                for (int i = 0; i < houses.Length; i++) if (s.x >= YardStart(houses[i]) && s.x <= YardEnd(houses[i])) { idx = i; break; }
                s.house = idx;
                s.result = idx >= 0 ? "yard" : "alley";
            }
            return true;
        }
        return false;
    }

    void Step(float dt)
    {
        if (over) return;
        int n = Mathf.Max(1, Mathf.CeilToInt(dt / (1f / 240f)));
        float h = dt / n;
        for (int k = 0; k < n && !over; k++)
        {
            time += h;
            if (charging) charge += h;
            stumble = Mathf.Max(0f, stumble - h);
            float px = x;
            x += Speed * h;
            if (y > 0f || vy > 0f) { vy -= RunG * h; y += vy * h; if (y <= 0f) { y = 0f; vy = 0f; } }
            foreach (var d in level.dogs)
                if (px < d - DogW / 2f + 4f && x >= d - DogW / 2f + 4f && y < 22f)
                {
                    stumble = 0.7f; bitten++;
                    if (left > 0) left--;
                    OnBitten();
                }
            foreach (var s in flying)
            {
                if (s.done) continue;
                if (StepStrainer(s, h))
                {
                    s.done = true;
                    if (s.result == "yard")
                    {
                        var hs = houses[s.house];
                        if (hs.wants && !delivered[s.house]) delivered[s.house] = true;
                        else if (!hs.wants) wrong++;
                        else missed++;
                    }
                    else missed++;
                    OnLanded(s);
                }
            }
            bool allDone = true;
            foreach (var s in flying) if (!s.done) { allDone = false; break; }
            if (x >= level.length && allDone) { over = true; won = Score() >= level.need; }
        }
    }

    int Delivered() { int c = 0; foreach (var d in delivered) if (d) c++; return c; }
    int Score() => Delivered() - wrong;
    int Wanted() { int c = 0; foreach (var hs in houses) if (hs.wants) c++; return c; }

    int StarsFor()
    {
        if (!won) return 0;
        int want = Wanted(), got = Delivered();
        if (got >= want && wrong == 0) return 3;
        if (got >= want - 1 && wrong == 0) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    Camera cam;
    Transform root, runner, chargeBar;
    Renderer runnerR;
    readonly List<Transform> lanternGlows = new List<Transform>();
    Material runAMat, runBMat, dogMat, strainerMat, lanternOnMat, lanternOffMat, stoneMat, hanjiMat, tilesMat, alleyMat, yardLitMat, yardDarkMat, woodMat;
    Bursts bursts;
    Synth synth;
    bool showStages;

    static Vector3 P(float px, float h, float z = 0f) => new Vector3(px / PX, h / PX, z);

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        cam = new GameObject("Camera").AddComponent<Camera>();
        cam.fieldOfView = 45f; cam.nearClipPlane = 0.3f; cam.farClipPlane = 200f;
        cam.clearFlags = CameraClearFlags.SolidColor;
        cam.backgroundColor = new Color(0.06f, 0.08f, 0.2f);
        OiyoField.Lights(new Color(0.36f, 0.38f, 0.55f), 0.45f, 35f, 30f);
        bursts = new Bursts(transform, 0.8f);
        synth = new Synth(gameObject);
        runAMat = OiyoField.Sprite("BR/runner_a"); runBMat = OiyoField.Sprite("BR/runner_b");
        dogMat = OiyoField.Sprite("BR/dog"); strainerMat = OiyoField.Sprite("BR/strainer");
        lanternOnMat = OiyoField.Sprite("BR/lantern_on"); lanternOffMat = OiyoField.Sprite("BR/lantern_off");
        stoneMat = OiyoArcade.Lit(Color.white, 0.1f, OiyoArcade.Art("BR/stone", true));
        hanjiMat = OiyoArcade.Lit(Color.white, 0.1f, OiyoArcade.Art("BR/hanji", true));
        tilesMat = OiyoArcade.Lit(Color.white, 0.4f, OiyoArcade.Art("BR/tiles", true));
        alleyMat = OiyoArcade.Lit(Color.white, 0.1f, OiyoArcade.Art("BR/alley", true));
        yardLitMat = OiyoArcade.Lit(new Color(0.85f, 0.79f, 0.64f), 0.1f);
        yardDarkMat = OiyoArcade.Lit(new Color(0.45f, 0.43f, 0.38f), 0.1f);
        woodMat = OiyoArcade.Lit(new Color(0.42f, 0.27f, 0.15f), 0.3f);
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int idx, bool ready = true)
    {
        stageIdx = Mathf.Clamp(idx, 0, StageCount - 1);
        StopAllCoroutines();
        level = BokjoriRunStages.All[stageIdx];
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Alley").transform;
        lanternGlows.Clear();
        NewRun();
        starsWon = 0;
        showStages = false;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Animate(0f);
    }

    Transform Box(string name, Material m, float x0, float x1, float h0, float h1, float z0, float z1)
    {
        var b = OiyoArcade.Prim(PrimitiveType.Cube, name, m, root).transform;
        b.position = new Vector3((x0 + x1) * 0.5f / PX, (h0 + h1) * 0.5f / PX, (z0 + z1) * 0.5f);
        b.localScale = new Vector3(Mathf.Max(0.01f, (x1 - x0) / PX), Mathf.Max(0.01f, (h1 - h0) / PX), z1 - z0);
        return b;
    }

    void BuildScene()
    {
        var ground = Box("Alley", alleyMat, -400f, level.length + 600f, -20f, 0f, -4f, 6f);
        alleyMat.mainTextureScale = new Vector2((level.length + 1000f) / 240f, 2f);
        var rs = new System.Random(stageIdx * 13 + 5);
        // a far wall of hills and the moon
        var moon = OiyoArcade.GlowQuad("Moon", new Color(1f, 0.95f, 0.75f, 0.95f), 3f, root);
        moon.transform.position = new Vector3(level.length / PX * 0.5f, 14f, 40f);
        moon.transform.localScale = Vector3.one * 6f;
        for (int k = 0; k < 120; k++)
        {
            var st = OiyoArcade.GlowQuad("Star", new Color(1f, 1f, 0.9f, 0.7f), 0.25f, root);
            st.transform.position = new Vector3(-20f + (float)rs.NextDouble() * (level.length / PX + 40f), 6f + (float)rs.NextDouble() * 16f, 38f);
        }
        foreach (var hs in houses)
        {
            // the front wall (or gate-house), the yard, and the hanok house behind it
            Box("Wall", stoneMat, hs.wall, hs.wall + hs.front, 0f, hs.wallH, -0.6f, 3.6f);
            Box("WallCap", tilesMat, hs.wall - 4f, hs.wall + hs.front + 4f, hs.wallH, hs.wallH + 7f, -0.8f, 3.8f);
            Box("Yard", hs.wants ? yardLitMat : yardDarkMat, YardStart(hs), YardEnd(hs), 0f, 2f, -0.6f, 3.6f);
            float face = YardEnd(hs);
            Box("House", hanjiMat, face, face + 70f, 0f, hs.houseH, -0.4f, 3.6f);
            var roof = Box("Roof", tilesMat, face - 14f, face + 84f, hs.houseH, hs.houseH + 10f, -1.2f, 4.2f);
            var ridge = Box("Ridge", tilesMat, face + 4f, face + 66f, hs.houseH + 10f, hs.houseH + 22f, 0f, 3f);
            var lantern = OiyoField.Quad("Lantern", hs.wants ? lanternOnMat : lanternOffMat, root, 22f, 26f);
            lantern.position = P(face + 35f, hs.houseH - 26f, -0.5f);
            if (hs.wants)
            {
                var glow = OiyoArcade.GlowQuad("Glow", new Color(1f, 0.8f, 0.3f, 0.55f), 2.2f, root);
                glow.transform.position = P(face + 35f, hs.houseH - 26f, -0.45f);
                lanternGlows.Add(glow.transform);
            }
            // a side wall back to the next house, so the alley reads as a lane
            Box("Side", stoneMat, face + 70f, face + 110f, 0f, hs.wallH * 0.8f, 3.2f, 3.6f);
        }
        foreach (var d in level.dogs)
        {
            var dog = OiyoField.Quad("Dog", dogMat, root, 40f, 28f);
            dog.position = P(d, 14f, -0.2f);
        }
        runner = OiyoField.Quad("Runner", runAMat, root, 36f, 50f);
        runnerR = runner.GetComponent<Renderer>();
        chargeBar = OiyoArcade.Prim(PrimitiveType.Cube, "Charge", OiyoArcade.Glow(new Color(1f, 0.83f, 0.23f)), root).transform;
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("bokjori-run", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        if (state == GameState.Playing)
        {
            Step(dt);
            if (over) End();
        }
        msgT = Mathf.Max(0f, msgT - dt);
        Animate(dt);
    }

    string msg = ""; float msgT; Color msgC = Color.white;
    void Toast(string m, Color c) { msg = m; msgT = 1f; msgC = c; }

    void OnLanded(Strainer s)
    {
        bool good = s.result == "yard" && s.house >= 0 && houses[s.house].wants;
        string text = s.result == "yard" ? (good ? U("Good luck to you!") : U("That house is dark")) : s.result == "wall" ? U("Hit the wall") : s.result == "roof" ? U("Stuck on the roof") : U("Dropped in the alley");
        Toast(text, good ? new Color(0.55f, 1f, 0.6f) : new Color(1f, 0.55f, 0.5f));
        if (good) { bursts.Emit(P(s.x, s.y + 8f, -0.3f), new Color(1f, 0.83f, 0.23f), 20, 3f, 0.22f, 0.6f); synth.Tone(784f, 0.16f, Wave.Triangle, 0.2f, 1175f, 7f); }
        else synth.Tone(200f, 0.18f, Wave.Square, 0.1f, 140f, 8f);
    }
    void OnBitten()
    {
        Toast(U("Woof! Dropped one"), new Color(1f, 0.6f, 0.3f));
        synth.Tone(320f, 0.08f, Wave.Square, 0.12f, 520f, 14f);
        bursts.Emit(P(x + 10f, 20f, -0.3f), new Color(0.9f, 0.85f, 0.75f), 10, 2f, 0.16f, 0.4f);
    }

    int throwId = int.MinValue;
    void ReadInput()
    {
        bool confirm = Input.GetKeyDown(KeyCode.Return);
        switch (state)
        {
            case GameState.Ready:
            case GameState.Playing:
                {
                    if (state == GameState.Playing && (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P))) { state = GameState.Paused; charging = false; return; }
                    // left half: jump; right half: hold to wind up, let go to throw
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (state == GameState.Ready) state = GameState.Playing;
                        if (b.pos.x < Screen.width * 0.5f) { if (Jump()) synth.Tone(440f, 0.06f, Wave.Triangle, 0.1f, 660f, 16f); }
                        else if (!charging) { throwId = b.id; StartCharge(); }
                    }
                    foreach (var e in OiyoArcade.Ended()) if (e.id == throwId && charging) { throwId = int.MinValue; if (Release()) synth.Tone(520f, 0.08f, Wave.Noise, 0.08f, 0f, 16f); }
                    if (Input.GetKeyDown(KeyCode.UpArrow) || Input.GetKeyDown(KeyCode.Space) || Input.GetKeyDown(KeyCode.W)) { if (state == GameState.Ready) state = GameState.Playing; Jump(); }
                    if (Input.GetKeyDown(KeyCode.RightArrow) || Input.GetKeyDown(KeyCode.X)) { if (state == GameState.Ready) state = GameState.Playing; StartCharge(); }
                    if ((Input.GetKeyUp(KeyCode.RightArrow) || Input.GetKeyUp(KeyCode.X)) && charging) Release();
                    return;
                }
            case GameState.Paused:
                if (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P)) state = GameState.Playing;
                return;
            case GameState.Victory:
            case GameState.GameOver:
                if (confirm && ResultLive) LoadStage(state == GameState.Victory ? Mathf.Min(stageIdx + 1, StageCount - 1) : stageIdx);
                return;
            case GameState.Menu:
                if (!showStages && (confirm || Input.GetKeyDown(KeyCode.Space))) LoadStage(stageIdx);
                return;
        }
    }

    float endTime;
    bool ResultLive => Time.unscaledTime - endTime > 0.45f;

    void End()
    {
        if (state != GameState.Playing) return;
        endTime = Time.unscaledTime;
        charging = false;
        if (won)
        {
            starsWon = StarsFor();
            state = GameState.Victory;
            OiyoArcade.Record(Slug, stageIdx, starsWon, Score(), StageCount);
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
        float t = Time.time;
        runnerR.sharedMaterial = Mathf.FloorToInt(time * 8f) % 2 == 0 ? runAMat : runBMat;
        runner.position = P(x, y + 25f, -0.3f);
        runner.rotation = Quaternion.Euler(0f, 0f, stumble > 0f ? -30f : 0f);
        foreach (var s in flying)
        {
            if (s.t == null) continue;
            bool visible = !s.done || s.result == "yard" || s.result == "roof" || s.result == "wall" || s.result == "alley";
            s.t.gameObject.SetActive(visible);
            s.t.position = P(s.x, s.y + 8f, s.done && s.result == "yard" ? 1.4f : -0.2f);
            s.t.rotation = s.done ? Quaternion.identity : Quaternion.Euler(0f, 0f, -time * s.spin * Mathf.Rad2Deg);
        }
        foreach (var g in lanternGlows) g.localScale = Vector3.one * (2.2f + Mathf.Sin(t * 4f + g.position.x) * 0.2f);
        chargeBar.gameObject.SetActive(charging);
        if (charging)
        {
            float p = Power(charge);
            chargeBar.position = P(x - 26f, 60f + 30f * p, -0.4f);
            chargeBar.localScale = new Vector3(0.18f, Mathf.Max(0.02f, 60f * p / PX), 0.05f);
        }
        // camera: in front of the alley, a little behind the runner, leaning in so the yards ahead show
        bool portrait = cam.aspect < 1f;
        var focus = P(x + (portrait ? 110f : 180f), 60f, 1f);
        cam.transform.position = focus + new Vector3(portrait ? -1.2f : -2.5f, portrait ? 2f : 2f, portrait ? -17f : -13f);
        cam.transform.LookAt(focus);
    }

    // ?oiyotest=1 prints the run state to the browser console for the automated play check.
    bool testLog; float testT;
    void TestTick(float dt)
    {
        if (!testLog || (testT -= dt) > 0f) return;
        testT = 0.02f;
        float next = -1f;
        for (int i = 0; i < houses.Length; i++) if (houses[i].wants && !delivered[i] && YardStart(houses[i]) > x + 30f) { next = (YardStart(houses[i]) + YardEnd(houses[i])) * 0.5f; break; }
        float dog = -1f;
        foreach (var d in level.dogs) if (d > x) { dog = d; break; }
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"x\":{x:F1},\"next\":{next:F0},\"dog\":{dog:F0},\"speed\":{level.speed:F1},\"y\":{y:F0},\"charging\":{(charging ? 1 : 0)},\"charge\":{charge:F3},\"left\":{left},\"got\":{Delivered()},\"wrong\":{wrong},\"need\":{level.need},\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.79f, 0.16f, 0.16f, 0.97f);
    static readonly Color Dark = new Color(0.06f, 0.07f, 0.18f, 0.86f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("{0} homes", BokjoriRunStages.All[i].houses.Length / 6);

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(1f, 0.85f, 0.4f), U("Bokjori Run"),
                U("Run the alley on New Year's Eve and toss lucky strainers over the walls into every lit courtyard."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        var bar = new Rect(8f, 8f, w - 16f, 64f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 12f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>   " + F("Strainers {0}", left), 15, new Color(1f, 0.92f, 0.7f));
        OiyoArcade.Text(new Rect(20f, 36f, w - 90f, 24f), F("Delivered {0}/{1}", Score(), level.need), 16, Color.white);
        OiyoArcade.Bar(new Rect(20f, 62f, w - 96f, 5f), x / level.length, new Color(0f, 0f, 0f, 0.4f), new Color(1f, 0.83f, 0.23f));
        if (OiyoArcade.Button(new Rect(w - 60f, 14f, 44f, 44f), "<b>II</b>", OiyoScreens.Slate, 18))
        {
            if (state == GameState.Playing) { state = GameState.Paused; charging = false; }
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (msgT > 0f) OiyoArcade.Shadowed(new Rect(8f, 80f, w - 16f, 36f), msg, 20, msgC, TextAnchor.MiddleCenter);
        if (state == GameState.Ready || state == GameState.Playing)
        {
            float zh = 64f;
            OiyoArcade.Panel(new Rect(8f, h - zh - 10f, w * 0.5f - 14f, zh), new Color(1f, 1f, 1f, 0.14f));
            OiyoArcade.Panel(new Rect(w * 0.5f + 6f, h - zh - 10f, w * 0.5f - 14f, zh), new Color(1f, 1f, 1f, charging ? 0.35f : 0.14f));
            OiyoArcade.Shadowed(new Rect(8f, h - zh - 10f, w * 0.5f - 14f, zh), "▲ " + U("Jump"), 20, Color.white, TextAnchor.MiddleCenter);
            OiyoArcade.Shadowed(new Rect(w * 0.5f + 6f, h - zh - 10f, w * 0.5f - 14f, zh), U("Throw") + " ⤴", 20, Color.white, TextAnchor.MiddleCenter);
        }
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Hold right to wind up, let go to throw"), U("Lit lanterns want a strainer, dark houses don't. Tap left to jump the dogs."), 200f, 110f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            bool w0 = state == GameState.Victory;
            string detail = w0 ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : F("Delivered {0}/{1}", Score(), level.need);
            string body = $"<b>{F("{0} homes", $"{Delivered()}/{Wanted()}")}</b>\n<size=14>{F("{0} wrong", wrong)}</size>";
            int r = OiyoScreens.Result(w, h, Dark, Accent, w0, ResultLive, w0 ? U("All the luck delivered!") : U("Not enough deliveries"), detail, body,
                w0 && stageIdx < StageCount - 1 ? U("Next stage") : null, w0 && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
