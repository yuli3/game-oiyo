using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Ice Climb 3D: the web Ice Climb (src/components/games/IceClimb.tsx, src/lib/games/ice-climb.ts) rebuilt
// in Unity. The rules are the web's: holding winds up a swing whose power rises 0→1 over `rise` seconds
// and falls back (a triangle wave); letting go strikes the patch above. Thin ice wants 0.15–0.45, firm
// 0.38–0.72, hard 0.65–0.95, each band shrunk toward its centre by `narrow`. Inside the band the axe
// bites (+1 step); below it glances; above it shatters (−1 step). 0.25 s to recover after a swing.
// Reach the top within the limit. The 30 walls are the web's own (IceClimbStages.cs). Keyboard: Space.
public class IceClimbPlayer : MonoBehaviour
{
    const string Slug = "ice-climb";
    const int StageCount = 30;
    const float Recover = 0.25f;
    static readonly float[] BandLo = { 0.15f, 0.38f, 0.65f };
    static readonly float[] BandHi = { 0.45f, 0.72f, 0.95f };
    const float StepH = 1.6f; // world units per step

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of ice-climb.ts) ----------------
    IceClimbStages.Level wall;
    int stageIdx;
    float t, hold, recover;
    int step, bites, shatters, glances, starsWon;
    bool holding, over, won;

    void NewClimber() { t = 0f; step = 0; holding = false; hold = 0f; recover = 0f; bites = 0; shatters = 0; glances = 0; over = false; won = false; }

    float Lo(int ice) { float c = (BandLo[ice] + BandHi[ice]) * 0.5f, w = (BandHi[ice] - BandLo[ice]) * 0.5f * (1f - wall.narrow); return c - w; }
    float Hi(int ice) { float c = (BandLo[ice] + BandHi[ice]) * 0.5f, w = (BandHi[ice] - BandLo[ice]) * 0.5f * (1f - wall.narrow); return c + w; }
    float Power(float h) { float u = (h / wall.rise) % 2f; return u <= 1f ? u : 2f - u; }

    bool Press()
    {
        if (over || holding || recover > 0f) return false;
        holding = true; hold = 0f;
        return true;
    }

    string Release()
    {
        if (over || !holding) return null;
        holding = false;
        recover = Recover;
        float p = Power(hold);
        int ice = wall.wall[step];
        if (p < Lo(ice)) { glances++; return "glance"; }
        if (p > Hi(ice)) { shatters++; step = Mathf.Max(0, step - 1); return "shatter"; }
        bites++; step++;
        if (step >= wall.wall.Length) { over = true; won = t <= wall.limit; }
        return "bite";
    }

    bool Step(float dt)
    {
        if (over) return false;
        t += dt;
        if (holding) hold += dt;
        recover = Mathf.Max(0f, recover - dt);
        if (t >= wall.limit) { over = true; won = false; holding = false; return true; }
        return false;
    }

    int StarsFor()
    {
        if (!won) return 0;
        float left = (wall.limit - t) / wall.limit;
        if (left >= 0.18f) return 3;
        if (left >= 0.09f) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    Camera cam;
    Transform root, climber;
    readonly List<Renderer> patches = new List<Renderer>();
    Material climberMat, rockMat, snowMat, frameMat;
    Material[] iceMats;
    Transform frame;
    Bursts bursts;
    Synth synth;
    bool showStages;
    float camY;

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        cam = new GameObject("Camera").AddComponent<Camera>();
        cam.fieldOfView = 50f; cam.nearClipPlane = 0.1f; cam.farClipPlane = 200f;
        cam.clearFlags = CameraClearFlags.SolidColor;
        cam.backgroundColor = new Color(0.11f, 0.24f, 0.42f);
        OiyoField.Lights(new Color(0.6f, 0.66f, 0.78f), 0.9f, 35f, -30f);
        bursts = new Bursts(transform, 0.5f);
        synth = new Synth(gameObject);
        climberMat = OiyoField.Sprite("IC/climber");
        rockMat = OiyoArcade.Lit(Color.white, 0.15f, OiyoArcade.Art("IC/rock", true));
        snowMat = OiyoArcade.Lit(new Color(0.96f, 0.97f, 1f), 0.3f);
        var iceTex = OiyoArcade.Art("IC/ice", true);
        iceMats = new[]
        {
            OiyoArcade.Lit(new Color(0.62f, 0.84f, 1f), 0.85f, iceTex),
            OiyoArcade.Lit(new Color(0.95f, 0.97f, 1f), 0.6f, iceTex),
            OiyoArcade.Lit(new Color(0.62f, 0.66f, 0.7f), 0.4f, iceTex),
        };
        frameMat = OiyoArcade.Glow(new Color(1f, 0.83f, 0.23f));
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int idx, bool ready = true)
    {
        stageIdx = Mathf.Clamp(idx, 0, StageCount - 1);
        StopAllCoroutines();
        wall = IceClimbStages.All[stageIdx];
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Wall").transform;
        NewClimber();
        starsWon = 0;
        showStages = false;
        keyHeld = false;
        BuildScene();
        camY = 0f;
        state = ready ? GameState.Ready : GameState.Menu;
        Animate(0f);
    }

    void BuildScene()
    {
        patches.Clear();
        int n = wall.wall.Length;
        // the frozen fall: one slab of ice per step, set in grey rock, with snow at the foot and the top
        for (int i = 0; i < n; i++)
        {
            var slab = OiyoArcade.Prim(PrimitiveType.Cube, "Ice", iceMats[wall.wall[i]], root);
            slab.transform.position = new Vector3(0f, (i + 0.5f) * StepH + 0.9f, 0.3f + 0.05f * Mathf.Sin(i * 1.7f));
            slab.transform.localScale = new Vector3(4.4f, StepH * 0.96f, 0.8f);
            patches.Add(slab.GetComponent<Renderer>());
        }
        for (int s = -1; s <= 1; s += 2)
        {
            var rock = OiyoArcade.Prim(PrimitiveType.Cube, "Rock", rockMat, root);
            rock.transform.position = new Vector3(s * 6.5f, n * StepH * 0.5f, 0.6f);
            rock.transform.localScale = new Vector3(8.6f, n * StepH + 30f, 2f);
        }
        var foot = OiyoArcade.Prim(PrimitiveType.Cube, "Snow", snowMat, root);
        foot.transform.position = new Vector3(0f, -1.5f, -2f);
        foot.transform.localScale = new Vector3(30f, 3f, 8f);
        var top = OiyoArcade.Prim(PrimitiveType.Cube, "Top", snowMat, root);
        top.transform.position = new Vector3(0f, n * StepH + 2.4f, 0f);
        top.transform.localScale = new Vector3(30f, 1.4f, 4f);
        // an outline round the patch above the climber
        frame = new GameObject("Target").transform;
        frame.SetParent(root, false);
        for (int k = 0; k < 4; k++)
        {
            var bar = OiyoArcade.Prim(PrimitiveType.Cube, "Edge", frameMat, frame).transform;
            bool horiz = k < 2;
            bar.localPosition = horiz ? new Vector3(0f, (k == 0 ? -1f : 1f) * StepH * 0.47f, 0f) : new Vector3((k == 2 ? -1f : 1f) * 2.18f, 0f, 0f);
            bar.localScale = horiz ? new Vector3(4.44f, 0.08f, 0.04f) : new Vector3(0.08f, StepH * 0.98f, 0.04f);
        }
        climber = OiyoField.Quad("Climber", climberMat, root, 1f, 1f);
        climber.localScale = new Vector3(1.8f, 1.8f, 1f);
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("ice-climb", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        if (state == GameState.Playing)
        {
            if (Step(dt) || over) End();
        }
        msgT = Mathf.Max(0f, msgT - dt);
        Animate(dt);
    }

    string msg = ""; float msgT; Color msgC = Color.white;
    void Toast(string m, Color c) { msg = m; msgT = 0.7f; msgC = c; }

    void DoRelease()
    {
        string r = Release();
        var at = new Vector3(0f, (step + 0.2f) * StepH + 0.9f, -0.2f);
        if (r == "bite") { Toast(U("Thunk!"), new Color(0.55f, 1f, 0.6f)); synth.Tone(180f, 0.08f, Wave.Noise, 0.16f, 90f, 18f); synth.Tone(660f, 0.08f, Wave.Triangle, 0.1f, 880f, 14f); bursts.Emit(at, Color.white, 10, 2f, 0.12f, 0.4f); }
        else if (r == "glance") { Toast(U("Glanced off"), new Color(0.8f, 0.82f, 0.85f)); synth.Tone(1200f, 0.05f, Wave.Square, 0.06f, 900f, 20f); }
        else if (r == "shatter") { Toast(U("Crash! You slip"), new Color(1f, 0.5f, 0.45f)); synth.Tone(400f, 0.3f, Wave.Noise, 0.2f, 120f, 6f); bursts.Emit(at, new Color(0.65f, 0.85f, 1f), 30, 4f, 0.2f, 0.7f); }
    }

    bool keyHeld;
    void ReadInput()
    {
        bool confirm = Input.GetKeyDown(KeyCode.Return);
        switch (state)
        {
            case GameState.Ready:
            case GameState.Playing:
                {
                    if (state == GameState.Playing && (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P))) { state = GameState.Paused; holding = false; return; }
                    // the button is read once per frame: a press winds up, the release strikes
                    bool pressed = OiyoArcade.Began().Count > 0;
                    bool released = OiyoArcade.Ended().Count > 0 && OiyoArcade.Held().Count == 0;
                    if (Input.GetKeyDown(KeyCode.Space)) { pressed = true; keyHeld = true; }
                    if (Input.GetKeyUp(KeyCode.Space) && keyHeld) { released = true; keyHeld = false; }
                    if (pressed)
                    {
                        if (state == GameState.Ready) state = GameState.Playing;
                        Press();
                    }
                    if (released && state == GameState.Playing) DoRelease();
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
        holding = false;
        if (won)
        {
            starsWon = StarsFor();
            state = GameState.Victory;
            OiyoArcade.Record(Slug, stageIdx, starsWon, step, StageCount);
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
        float y = step * StepH;
        camY = dt <= 0f ? y : Mathf.Lerp(camY, y, 1f - Mathf.Exp(-dt * 8f));
        float swing = holding ? Power(hold) : 0f;
        climber.position = new Vector3(0f, camY + 0.9f, -0.4f);
        bool active = !over && step < wall.wall.Length;
        frame.gameObject.SetActive(active && state != GameState.Menu);
        if (active)
        {
            frame.position = new Vector3(0f, (step + 0.5f) * StepH + 0.9f, -0.12f);
        }
        bool portrait = cam.aspect < 1f;
        cam.transform.position = new Vector3(0f, camY + (portrait ? 2.2f : 1.8f), portrait ? -15f : -10f);
        cam.transform.LookAt(new Vector3(0f, camY + 2.4f, 0f));
        climber.rotation = cam.transform.rotation * Quaternion.Euler(0f, 0f, swing * 18f);
    }

    // ?oiyotest=1 prints the state to the browser console for the automated play check.
    bool testLog; float testT;
    void TestTick(float dt)
    {
        if (!testLog || (testT -= dt) > 0f) return;
        testT = 0.02f;
        int ice = step < wall.wall.Length ? wall.wall[step] : 0;
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"t\":{t:F3},\"step\":{step},\"steps\":{wall.wall.Length},\"ice\":{ice},\"lo\":{Lo(ice):F3},\"hi\":{Hi(ice):F3},\"holding\":{(holding ? 1 : 0)},\"hold\":{hold:F3},\"power\":{(holding ? Power(hold) : 0f):F3},\"rise\":{wall.rise:F3},\"recover\":{recover:F3},\"bites\":{bites},\"shatters\":{shatters},\"glances\":{glances},\"limit\":{wall.limit:F1},\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.91f, 0.35f, 0.05f, 0.97f);
    static readonly Color Dark = new Color(0.05f, 0.14f, 0.27f, 0.86f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("{0} steps", IceClimbStages.All[i].wall.Length);

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(0.75f, 0.88f, 1f), U("Ice Climb"),
                U("Hold to raise the axe, let go at the right power: thin ice gently, hard ice with a full swing."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        var bar = new Rect(8f, 8f, w - 16f, 64f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 12f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>   " + F("{0}s left", Mathf.Max(0f, wall.limit - t).ToString("F1")), 15, new Color(1f, 0.92f, 0.75f));
        int iceNow = step < wall.wall.Length ? wall.wall[step] : 0;
        string iceName = iceNow == 0 ? U("Thin ice: gently") : iceNow == 1 ? U("Firm ice: medium") : U("Hard ice: full swing");
        OiyoArcade.Text(new Rect(20f, 36f, w - 90f, 24f), $"<b>{step}/{wall.wall.Length}</b>   {(over ? "" : iceName)}", 16, Color.white);
        if (OiyoArcade.Button(new Rect(w - 60f, 14f, 44f, 44f), "<b>II</b>", OiyoScreens.Slate, 18))
        {
            if (state == GameState.Playing) { state = GameState.Paused; holding = false; }
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (msgT > 0f) OiyoArcade.Shadowed(new Rect(8f, 80f, w - 16f, 36f), msg, 22, msgC, TextAnchor.MiddleCenter);
        if ((state == GameState.Playing || state == GameState.Ready) && !over)
        {
            // the power meter with this patch's band
            float mh = Mathf.Min(300f, h * 0.45f), mx = w - 46f, my = h * 0.5f - mh * 0.5f;
            OiyoArcade.Fill(new Rect(mx, my, 28f, mh), new Color(0f, 0f, 0f, 0.55f));
            OiyoArcade.Fill(new Rect(mx, my + mh * (1f - Hi(iceNow)), 28f, mh * (Hi(iceNow) - Lo(iceNow))), new Color(0.25f, 0.75f, 0.34f, 0.9f));
            float p = holding ? Power(hold) : 0f;
            OiyoArcade.Fill(new Rect(mx - 5f, my + mh * (1f - p) - 3f, 38f, 6f), new Color(0.98f, 0.69f, 0.02f));
        }
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Hold, then let go in the green band"), U("Too soft glances off; too hard shatters the ice and you slip a step."), 200f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            bool w0 = state == GameState.Victory;
            string detail = w0 ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : $"{step}/{wall.wall.Length}";
            string body = $"<b>{t:F1}s</b>\n<size=14>{F("{0} bites · {1} shattered", bites, shatters)}</size>";
            int r = OiyoScreens.Result(w, h, Dark, Accent, w0, ResultLive, w0 ? U("You topped out!") : U("The sun softened the ice"), detail, body,
                w0 && stageIdx < StageCount - 1 ? U("Next stage") : null, w0 && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
