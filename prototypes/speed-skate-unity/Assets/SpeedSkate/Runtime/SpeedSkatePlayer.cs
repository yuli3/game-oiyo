using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Speed Skate 3D: the web Speed Skate (src/components/games/SpeedSkate.tsx, src/lib/games/speed-skate.ts)
// rebuilt in Unity. The rules are the web's: a 400 m oval of 100 m straights and curves; a tap on the
// left or right half of the screen pushes with that leg. Alternate legs on the straights, right leg
// (crossovers) in the curves; a wrong leg wobbles (85 % of the speed kept). A stroke adds
// 3.5 m/s × quality × (1 − v/16), quality = exp(−((since − cadence)/window)²), nothing under 0.16 s;
// air drag 0.012 v² and friction 0.2 m/s². Beat the rival's time. The 30 races are the web's own
// (SpeedSkateStages.cs). Keyboard: ← and →.
public class SpeedSkatePlayer : MonoBehaviour
{
    const string Slug = "speed-skate";
    const int StageCount = 30;
    const float Lap = 400f, Straight = 100f, VMax = 16f, Push = 3.5f, Drag = 0.012f, Friction = 0.2f, Wobble = 0.85f, MinGap = 0.16f;
    const float S = 0.2f; // world units per metre
    static readonly float Rad = Straight / Mathf.PI; // curve radius (m)

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of speed-skate.ts) ----------------
    SpeedSkateStages.Level race;
    int stageIdx;
    float t, d, v, since, finish;
    int last; // 0 none, -1 left, 1 right
    int strokes, perfects, wobbles, starsWon;
    bool over, won;

    void NewSkater() { t = 0f; d = 0f; v = 0f; last = 0; since = 10f; strokes = 0; perfects = 0; wobbles = 0; over = false; won = false; finish = 0f; }

    static bool Curve(float dd) { float m = ((dd % Lap) + Lap) % Lap; return !(m < Straight || (m >= 2f * Straight && m < 3f * Straight)); }
    int RightLeg() => Curve(d) ? 1 : (last == -1 ? 1 : -1);
    bool LegOk(int side) => Curve(d) ? side == 1 : (last == 0 || side != last);
    float Quality(float s) { if (s < MinGap) return 0f; float e = (s - race.cadence) / race.window; return Mathf.Exp(-e * e); }

    string Stroke(int side)
    {
        if (over) return null;
        if (!LegOk(side)) { v *= Wobble; wobbles++; since = 0f; last = side; return "wrong"; }
        float q = strokes == 0 ? 1f : Quality(since);
        v += Push * q * Mathf.Max(0f, 1f - v / VMax);
        since = 0f; last = side; strokes++;
        if (q > 0.8f) { perfects++; return "perfect"; }
        return q > 0.4f ? "good" : "weak";
    }

    bool Step(float dt)
    {
        if (over) return false;
        int n = Mathf.Max(1, Mathf.CeilToInt(dt / (1f / 240f)));
        float h = dt / n;
        for (int k = 0; k < n; k++)
        {
            t += h; since += h;
            v = Mathf.Max(0f, v - (Drag * v * v + Friction) * h);
            float pd = d;
            d += v * h;
            if (d >= race.length)
            {
                float f = v > 0f ? (race.length - pd) / (v * h) : 1f;
                finish = t - h + h * Mathf.Clamp01(f);
                over = true;
                won = finish <= race.goal;
                return true;
            }
        }
        return false;
    }

    int StarsFor()
    {
        if (!won) return 0;
        if (finish <= race.goal * 0.97f) return 3;
        if (finish <= race.goal * 0.985f) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    Camera cam;
    Transform root, skater, ghost;
    Material skaterMat, ghostMat, iceMat, laneMat, lineMat, standMat, crowdMat, finishMat;
    Bursts bursts;
    Synth synth;
    bool showStages;

    // the oval in metres: up the right straight, round the far curve, down the left, round the near one
    static Vector3 Oval(float dd, out float heading)
    {
        float m = ((dd % Lap) + Lap) % Lap;
        if (m < Straight) { heading = 0f; return new Vector3(Rad, 0f, -Straight / 2f + m) * S; }
        if (m < 2f * Straight)
        {
            float th = (m - Straight) / Straight * Mathf.PI;
            heading = -th * Mathf.Rad2Deg;
            return new Vector3(Rad * Mathf.Cos(th), 0f, Straight / 2f + Rad * Mathf.Sin(th)) * S;
        }
        if (m < 3f * Straight) { heading = 180f; return new Vector3(-Rad, 0f, Straight / 2f - (m - 2f * Straight)) * S; }
        float th2 = (m - 3f * Straight) / Straight * Mathf.PI;
        heading = 180f - th2 * Mathf.Rad2Deg;
        return new Vector3(-Rad * Mathf.Cos(th2), 0f, -Straight / 2f - Rad * Mathf.Sin(th2)) * S;
    }

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        cam = new GameObject("Camera").AddComponent<Camera>();
        cam.fieldOfView = 55f; cam.nearClipPlane = 0.1f; cam.farClipPlane = 200f;
        cam.clearFlags = CameraClearFlags.SolidColor;
        cam.backgroundColor = new Color(0.16f, 0.2f, 0.36f);
        OiyoField.Lights(new Color(0.62f, 0.66f, 0.76f), 0.85f, 55f, 30f);
        bursts = new Bursts(transform, 0.5f);
        synth = new Synth(gameObject);
        skaterMat = OiyoField.Sprite("SS/skater");
        ghostMat = OiyoArcade.Transparent(OiyoArcade.Art("SS/ghost"), new Color(1f, 1f, 1f, 0.55f));
        iceMat = OiyoArcade.Lit(Color.white, 0.75f, OiyoArcade.Art("SS/ice", true));
        laneMat = OiyoArcade.Lit(new Color(0.45f, 0.75f, 0.99f), 0.6f);
        lineMat = OiyoArcade.Lit(new Color(0.92f, 0.96f, 1f), 0.5f);
        standMat = OiyoArcade.Lit(new Color(0.3f, 0.43f, 0.96f), 0.2f);
        crowdMat = OiyoArcade.Lit(Color.white, 0.1f, OiyoArcade.Art("SS/crowd", true));
        finishMat = OiyoArcade.Lit(new Color(0.88f, 0.19f, 0.19f), 0.3f);
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int idx, bool ready = true)
    {
        stageIdx = Mathf.Clamp(idx, 0, StageCount - 1);
        StopAllCoroutines();
        race = SpeedSkateStages.All[stageIdx];
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Rink").transform;
        NewSkater();
        starsWon = 0;
        showStages = false;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Animate(0f);
    }

    void BuildScene()
    {
        // ice sheet and the infield
        var ice = OiyoArcade.Prim(PrimitiveType.Cube, "Ice", iceMat, root);
        ice.transform.localScale = new Vector3((Rad * 2f + 40f) * S, 0.1f, (Straight + Rad * 2f + 40f) * S);
        ice.transform.position = new Vector3(0f, -0.05f, 0f);
        // the lane: short segments laid around the oval, with white edge lines
        for (float m = 0f; m < Lap; m += 2f)
        {
            var a = Oval(m, out float hd);
            var b = Oval(m + 2f, out _);
            var mid = (a + b) * 0.5f;
            var dir = (b - a).normalized;
            var normal = new Vector3(dir.z, 0f, -dir.x);
            var seg = OiyoArcade.Prim(PrimitiveType.Cube, "Lane", laneMat, root);
            seg.transform.position = mid + Vector3.up * 0.01f;
            seg.transform.rotation = Quaternion.LookRotation(dir);
            seg.transform.localScale = new Vector3(4f * S, 0.02f, 2.3f * S);
            for (int s = -1; s <= 1; s += 2)
            {
                var ln = OiyoArcade.Prim(PrimitiveType.Cube, "Line", lineMat, root);
                ln.transform.position = mid + normal * (s * 2.1f * S) + Vector3.up * 0.02f;
                ln.transform.rotation = seg.transform.rotation;
                ln.transform.localScale = new Vector3(0.12f * S, 0.02f, 2.3f * S);
            }
        }
        // finish line across the lane
        var fp = Oval(race.length, out float fh);
        var fin = OiyoArcade.Prim(PrimitiveType.Cube, "Finish", finishMat, root);
        fin.transform.position = fp + Vector3.up * 0.03f;
        fin.transform.rotation = Quaternion.Euler(0f, fh, 0f);
        fin.transform.localScale = new Vector3(5f * S, 0.03f, 0.5f * S);
        // stands with a crowd all round
        float sx = (Rad + 26f) * S, sz = (Straight / 2f + Rad + 26f) * S;
        for (int s = -1; s <= 1; s += 2)
        {
            var side = OiyoArcade.Prim(PrimitiveType.Cube, "Stand", crowdMat, root);
            side.transform.position = new Vector3(s * sx, 1.6f, 0f);
            side.transform.localScale = new Vector3(1.2f, 3.2f, sz * 2f);
            var end = OiyoArcade.Prim(PrimitiveType.Cube, "Stand", crowdMat, root);
            end.transform.position = new Vector3(0f, 1.6f, s * sz);
            end.transform.localScale = new Vector3(sx * 2f, 3.2f, 1.2f);
            var rail = OiyoArcade.Prim(PrimitiveType.Cube, "Rail", standMat, root);
            rail.transform.position = new Vector3(s * (sx - 1f), 0.3f, 0f);
            rail.transform.localScale = new Vector3(0.2f, 0.6f, sz * 2f);
        }
        skater = OiyoField.Quad("Skater", skaterMat, root, 1f, 1f);
        skater.localScale = new Vector3(0.9f, 0.9f, 1f);
        ghost = OiyoField.Quad("Rival", ghostMat, root, 1f, 1f);
        ghost.localScale = new Vector3(0.9f, 0.9f, 1f);
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("speed-skate", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        if (state == GameState.Playing)
        {
            if (Step(dt)) End();
        }
        msgT = Mathf.Max(0f, msgT - dt);
        Animate(dt);
    }

    string msg = ""; float msgT; Color msgC = Color.white;
    void Toast(string m, Color c) { msg = m; msgT = 0.7f; msgC = c; }

    void DoStroke(int side)
    {
        string r = Stroke(side);
        if (r == null) return;
        if (r == "perfect") { Toast(U("Perfect!"), new Color(0.55f, 1f, 0.6f)); synth.Tone(880f, 0.07f, Wave.Triangle, 0.12f, 1100f, 14f); bursts.Emit(skater.position, new Color(0.85f, 0.95f, 1f), 8, 1.6f, 0.12f, 0.35f); }
        else if (r == "good") { Toast(U("Good"), new Color(0.6f, 0.82f, 1f)); synth.Tone(660f, 0.06f, Wave.Triangle, 0.1f, 0f, 16f); }
        else if (r == "weak") { Toast(U("Weak"), new Color(0.8f, 0.82f, 0.85f)); synth.Tone(440f, 0.06f, Wave.Triangle, 0.08f, 0f, 16f); }
        else { Toast(U("Wobble!"), new Color(1f, 0.5f, 0.45f)); synth.Tone(200f, 0.15f, Wave.Square, 0.1f, 140f, 8f); }
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
                    // taps are read once per frame: left half = left leg, right half = right leg
                    var sides = new List<int>();
                    foreach (var b in OiyoArcade.Began()) sides.Add(b.pos.x < Screen.width * 0.5f ? -1 : 1);
                    if (Input.GetKeyDown(KeyCode.LeftArrow) || Input.GetKeyDown(KeyCode.A)) sides.Add(-1);
                    if (Input.GetKeyDown(KeyCode.RightArrow) || Input.GetKeyDown(KeyCode.D)) sides.Add(1);
                    foreach (int s in sides)
                    {
                        if (state == GameState.Ready) state = GameState.Playing;
                        DoStroke(s);
                    }
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
        if (won)
        {
            starsWon = StarsFor();
            state = GameState.Victory;
            OiyoArcade.Record(Slug, stageIdx, starsWon, Mathf.RoundToInt(finish * 100f), StageCount);
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

    float RivalD => state == GameState.Menu || state == GameState.Ready ? 0f : Mathf.Min(race.length, race.length * t / race.goal);

    void Animate(float dt)
    {
        if (root == null) return;
        var p = Oval(d, out float hd);
        var fwd = Quaternion.Euler(0f, hd, 0f) * Vector3.forward;
        var right = Quaternion.Euler(0f, hd, 0f) * Vector3.right;
        // the skater sways toward the pushing leg; the rival skates the outer half of the lane
        float sway = last * Mathf.Exp(-since * 4f) * 0.12f;
        skater.position = p + Vector3.up * 0.45f + right * sway;
        var gp = Oval(RivalD, out float gh);
        ghost.position = gp + Vector3.up * 0.45f + (Quaternion.Euler(0f, gh, 0f) * Vector3.right) * 0.45f;
        // camera: low behind the skater, looking along the lane
        bool portrait = cam.aspect < 1f;
        var camPos = p - fwd * (portrait ? 3.4f : 2.8f) + Vector3.up * (portrait ? 1.9f : 1.4f) - right * 0.2f;
        cam.transform.position = dt <= 0f ? camPos : Vector3.Lerp(cam.transform.position, camPos, 1f - Mathf.Exp(-dt * 6f));
        cam.transform.LookAt(p + fwd * 4f + Vector3.up * 0.2f);
        skater.rotation = cam.transform.rotation * Quaternion.Euler(0f, 0f, -sway * 60f);
        ghost.rotation = cam.transform.rotation;
    }

    // ?oiyotest=1 prints the race state to the browser console for the automated play check.
    bool testLog; float testT;
    void TestTick(float dt)
    {
        if (!testLog || (testT -= dt) > 0f) return;
        testT = 0.02f;
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"t\":{t:F3},\"d\":{d:F2},\"v\":{v:F2},\"since\":{since:F3},\"last\":{last},\"curve\":{(Curve(d) ? 1 : 0)},\"want\":{RightLeg()},\"cadence\":{race.cadence:F3},\"strokes\":{strokes},\"perfects\":{perfects},\"wobbles\":{wobbles},\"length\":{race.length:F0},\"goal\":{race.goal:F2},\"finish\":{finish:F2},\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.88f, 0.19f, 0.19f, 0.97f);
    static readonly Color Dark = new Color(0.07f, 0.11f, 0.3f, 0.86f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + $"{SpeedSkateStages.All[i].length:F0} m";

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(0.75f, 0.88f, 1f), U("Speed Skate"),
                U("Tap left and right in turn on the beat; in the curves, tap only right to cross over."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        var bar = new Rect(8f, 8f, w - 16f, 64f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 12f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>   " + F("Rival {0}s", race.goal.ToString("F1")), 15, new Color(1f, 0.92f, 0.75f));
        OiyoArcade.Text(new Rect(20f, 36f, w - 90f, 24f), $"<b>{t:F1}s</b>   {Mathf.Min(d, race.length):F0}/{race.length:F0} m   {v * 3.6f:F0} km/h", 16, Color.white);
        if (OiyoArcade.Button(new Rect(w - 60f, 14f, 44f, 44f), "<b>II</b>", OiyoScreens.Slate, 18))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (msgT > 0f) OiyoArcade.Shadowed(new Rect(8f, 80f, w - 16f, 36f), msg, 22, msgC, TextAnchor.MiddleCenter);
        if (state == GameState.Playing && Curve(d)) OiyoArcade.Shadowed(new Rect(8f, 116f, w - 16f, 28f), U("Curve: right-leg crossovers"), 17, new Color(1f, 0.66f, 0.3f), TextAnchor.MiddleCenter);
        if (state == GameState.Playing || state == GameState.Ready)
        {
            // the leg to use and the cadence bar
            int want = RightLeg();
            float zh = Mathf.Min(70f, h * 0.11f);
            float zy = h - zh - 10f;
            for (int s = -1; s <= 1; s += 2)
            {
                var r = new Rect(s < 0 ? 8f : w * 0.5f + 4f, zy, w * 0.5f - 12f, zh);
                bool lit = strokes == 0 || want == s;
                OiyoArcade.Fill(r, lit ? (s < 0 ? new Color(0.11f, 0.49f, 0.84f, 0.75f) : new Color(0.88f, 0.19f, 0.19f, 0.75f)) : new Color(0.3f, 0.32f, 0.36f, 0.35f));
                OiyoArcade.Shadowed(r, s < 0 ? "◀ " + U("Left") : U("Right") + " ▶", 20, Color.white, TextAnchor.MiddleCenter);
            }
            float span = race.cadence * 1.8f;
            var cb = new Rect(20f, zy - 26f, w - 40f, 12f);
            OiyoArcade.Fill(cb, new Color(0f, 0f, 0f, 0.35f));
            float g0 = (race.cadence - race.window * 0.47f) / span, g1 = (race.cadence + race.window * 0.47f) / span;
            OiyoArcade.Fill(new Rect(cb.x + cb.width * g0, cb.y - 2f, cb.width * (g1 - g0), 16f), new Color(0.18f, 0.62f, 0.27f, 0.85f));
            if (strokes > 0) OiyoArcade.Fill(new Rect(cb.x + cb.width * Mathf.Min(1f, since / span) - 2f, cb.y - 6f, 4f, 24f), Color.white);
        }
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Left, right, left…"), U("Push when the bar reaches the green band. In the curves, tap only right."), 200f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            bool w0 = state == GameState.Victory;
            string detail = w0 ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : F("Rival {0}s", race.goal.ToString("F1"));
            string body = $"<b>{finish:F2}s</b>\n<size=14>{F("{0} perfect pushes", perfects)}</size>";
            int r = OiyoScreens.Result(w, h, Dark, Accent, w0, ResultLive, w0 ? U("You beat the rival!") : U("The rival was faster"), detail, body,
                w0 && stageIdx < StageCount - 1 ? U("Next stage") : null, w0 && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
