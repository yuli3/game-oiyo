using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Tug of War 3D: the web Tug of War (src/components/games/TugOfWar.tsx, src/lib/games/tug-of-war.ts)
// rebuilt in Unity. The rules are the web's: the other village heaves (force heaveF) after a 0.35 s
// shout and rests between heaves (slackF). Holding pulls with 1.2, or 0 when you pull into their heave
// (yanked); letting go braces with 0.65. The flag moves 0.25 per unit of net force per second; at +1
// you win, at −1 or when time runs out you lose. The 30 stages are the web's own (TugOfWarStages.cs).
// Keyboard: Space.
public class TugOfWarPlayer : MonoBehaviour
{
    const string Slug = "tug-of-war";
    const int StageCount = 30;
    const float Pull = 1.2f, Yanked = 0f, Brace = 0.65f, Move = 0.25f, Warn = 0.35f;
    const float LineDX = 4f; // world units from the middle to each line

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of tug-of-war.ts) ----------------
    TugOfWarStages.Level st;
    int stageIdx;
    float t, x;
    bool holding, over, won;
    int starsWon;

    void NewTug() { t = 0f; x = 0f; holding = false; over = false; won = false; }

    // 0 slack, 1 warn, 2 heave
    int PhaseAt(float tt)
    {
        for (int i = 0; i + 1 < st.waves.Length; i += 2)
        {
            float start = st.waves[i], heave = st.waves[i + 1];
            if (tt < start - Warn) return 0;
            if (tt < start) return 1;
            if (tt < start + heave) return 2;
        }
        return 0;
    }
    float Theirs(float tt) => PhaseAt(tt) == 2 ? st.heaveF : st.slackF;
    float Yours(float tt) => !holding ? Brace : PhaseAt(tt) == 2 ? Yanked : Pull;

    bool Step(float dt)
    {
        if (over) return false;
        int n = Mathf.Max(1, Mathf.CeilToInt(dt / (1f / 240f)));
        float h = dt / n;
        for (int k = 0; k < n; k++)
        {
            x += (Yours(t) - Theirs(t)) * Move * h;
            t += h;
            if (x >= 1f) { over = true; won = true; return true; }
            if (x <= -1f || t >= st.limit) { over = true; won = false; return true; }
        }
        return false;
    }

    int StarsFor()
    {
        if (!won) return 0;
        float left = (st.limit - t) / st.limit;
        if (left >= 0.1f) return 3;
        if (left >= 0.05f) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    Camera cam;
    Transform root, rope, flag;
    readonly List<Transform> us = new List<Transform>(), them = new List<Transform>();
    Material usMat, themMat, ropeMat, fieldMat, flagMat, redMat, blueMat, moonMat, poleMat;
    Bursts bursts;
    Synth synth;
    bool showStages;
    int lastPhase;

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        cam = new GameObject("Camera").AddComponent<Camera>();
        cam.fieldOfView = 45f; cam.nearClipPlane = 0.1f; cam.farClipPlane = 200f;
        cam.clearFlags = CameraClearFlags.SolidColor;
        cam.backgroundColor = new Color(0.11f, 0.12f, 0.23f);
        OiyoField.Lights(new Color(0.55f, 0.58f, 0.75f), 0.8f, 40f, -10f);
        bursts = new Bursts(transform, 0.5f);
        synth = new Synth(gameObject);
        usMat = OiyoField.Sprite("TW/us");
        themMat = OiyoField.Sprite("TW/them");
        ropeMat = OiyoArcade.Lit(Color.white, 0.2f, OiyoArcade.Art("TW/rope", true));
        fieldMat = OiyoArcade.Lit(Color.white, 0.2f, OiyoArcade.Art("TW/field", true));
        flagMat = OiyoArcade.Lit(new Color(0.88f, 0.19f, 0.19f), 0.3f);
        poleMat = OiyoArcade.Lit(new Color(0.98f, 0.69f, 0.02f), 0.3f);
        redMat = OiyoArcade.Glow(new Color(0.79f, 0.16f, 0.16f));
        blueMat = OiyoArcade.Glow(new Color(0.1f, 0.44f, 0.76f));
        moonMat = OiyoArcade.Glow(new Color(1f, 0.95f, 0.75f));
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int idx, bool ready = true)
    {
        stageIdx = Mathf.Clamp(idx, 0, StageCount - 1);
        StopAllCoroutines();
        st = TugOfWarStages.All[stageIdx];
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Field").transform;
        NewTug();
        starsWon = 0;
        showStages = false;
        keyHeld = false;
        lastPhase = 0;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Animate(0f);
    }

    void BuildScene()
    {
        var field = OiyoArcade.Prim(PrimitiveType.Cube, "Field", fieldMat, root);
        field.transform.position = new Vector3(0f, -0.1f, 2f);
        field.transform.localScale = new Vector3(60f, 0.2f, 20f);
        for (int s = -1; s <= 1; s += 2)
        {
            var line = OiyoArcade.Prim(PrimitiveType.Cube, "Line", s < 0 ? redMat : blueMat, root);
            line.transform.position = new Vector3(s * LineDX, 0.02f, 0f);
            line.transform.localScale = new Vector3(0.15f, 0.04f, 4f);
        }
        var moon = OiyoArcade.Prim(PrimitiveType.Sphere, "Moon", moonMat, root);
        moon.transform.position = new Vector3(9f, 9f, 30f);
        moon.transform.localScale = Vector3.one * 4f;
        rope = OiyoArcade.Prim(PrimitiveType.Cylinder, "Rope", ropeMat, root).transform;
        rope.rotation = Quaternion.Euler(0f, 0f, 90f);
        rope.localScale = new Vector3(0.22f, 18f, 0.22f);
        flag = new GameObject("Flag").transform;
        flag.SetParent(root, false);
        var pole = OiyoArcade.Prim(PrimitiveType.Cube, "Pole", poleMat, flag);
        pole.transform.localPosition = new Vector3(0f, 0.8f, 0f);
        pole.transform.localScale = new Vector3(0.08f, 1.6f, 0.08f);
        var cloth = OiyoArcade.Prim(PrimitiveType.Cube, "Cloth", flagMat, flag);
        cloth.transform.localPosition = new Vector3(0.35f, 1.4f, 0f);
        cloth.transform.localScale = new Vector3(0.6f, 0.4f, 0.04f);
        us.Clear(); them.Clear();
        for (int k = 0; k < 5; k++)
        {
            var a = OiyoField.Quad("Us", usMat, root, 1f, 1f); a.localScale = new Vector3(1.3f, 1.7f, 1f); us.Add(a);
            var b = OiyoField.Quad("Them", themMat, root, 1f, 1f); b.localScale = new Vector3(1.3f, 1.7f, 1f); them.Add(b);
        }
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("tug-of-war", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        if (state == GameState.Playing)
        {
            int ph = PhaseAt(t);
            if (ph == 1 && lastPhase != 1) synth.Tone(330f, 0.12f, Wave.Square, 0.1f, 440f, 10f); // the shout (shown on screen while it lasts)
            lastPhase = ph;
            if (holding && ph == 2 && (yankT -= dt) <= 0f)
            {
                yankT = 0.6f;
                Toast(U("Yanked!"), new Color(1f, 0.5f, 0.45f));
                bursts.Emit(us[0].position + Vector3.down * 0.8f, new Color(0.85f, 0.85f, 0.85f), 8, 1.6f, 0.1f, 0.4f);
                synth.Tone(150f, 0.2f, Wave.Noise, 0.12f, 90f, 8f);
            }
            if (Step(dt)) End();
        }
        msgT = Mathf.Max(0f, msgT - dt);
        Animate(dt);
    }
    float yankT;

    string msg = ""; float msgT; Color msgC = Color.white;
    void Toast(string m, Color c) { msg = m; msgT = 0.7f; msgC = c; }

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
                    // the button is read once per frame: held pulls, let go braces
                    bool pressed = OiyoArcade.Began().Count > 0;
                    bool released = OiyoArcade.Ended().Count > 0 && OiyoArcade.Held().Count == 0;
                    if (Input.GetKeyDown(KeyCode.Space)) { pressed = true; keyHeld = true; }
                    if (Input.GetKeyUp(KeyCode.Space) && keyHeld) { released = true; keyHeld = false; }
                    if (pressed)
                    {
                        if (state == GameState.Ready) state = GameState.Playing;
                        holding = true;
                    }
                    if (released) holding = false;
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
            OiyoArcade.Record(Slug, stageIdx, starsWon, Mathf.RoundToInt(t * 10f), StageCount);
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
        float off = x * LineDX;
        int ph = state == GameState.Playing ? PhaseAt(t) : 0;
        rope.position = new Vector3(off, 1.1f, 0f);
        flag.position = new Vector3(off, 1.1f, 0f);
        float theirLean = ph == 2 ? 26f : ph == 1 ? 10f : 3f;
        float ourLean = holding ? (ph == 2 ? -18f : 26f) : 10f;
        bool portrait = cam.aspect < 1f;
        cam.transform.position = new Vector3(0f, portrait ? 4.2f : 3.2f, portrait ? -19f : -12f);
        cam.transform.LookAt(new Vector3(0f, 1.2f, 0f));
        for (int k = 0; k < us.Count; k++)
        {
            us[k].position = new Vector3(off + 1.6f + k * 1.4f, 0.85f, -0.05f * k);
            us[k].rotation = cam.transform.rotation * Quaternion.Euler(0f, 0f, -ourLean);
            them[k].position = new Vector3(off - 1.6f - k * 1.4f, 0.85f, -0.05f * k);
            them[k].rotation = cam.transform.rotation * Quaternion.Euler(0f, 0f, theirLean);
        }
    }

    // ?oiyotest=1 prints the state to the browser console for the automated play check.
    bool testLog; float testT;
    void TestTick(float dt)
    {
        if (!testLog || (testT -= dt) > 0f) return;
        testT = 0.02f;
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"t\":{t:F3},\"x\":{x:F3},\"phase\":{(state == GameState.Playing ? PhaseAt(t) : 0)},\"holding\":{(holding ? 1 : 0)},\"limit\":{st.limit:F1},\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.1f, 0.44f, 0.76f, 0.97f);
    static readonly Color Dark = new Color(0.07f, 0.08f, 0.2f, 0.86f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + $"{TugOfWarStages.All[i].limit:F0}s";

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(1f, 0.92f, 0.6f), U("Tug of War"),
                U("Hold to pull while they rest; let go and brace when they shout 'Yeongcha!'"),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        var bar = new Rect(8f, 8f, w - 16f, 64f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 12f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>   " + F("{0}s left", Mathf.Max(0f, st.limit - t).ToString("F1")), 15, new Color(1f, 0.92f, 0.75f));
        OiyoArcade.Text(new Rect(20f, 36f, w - 90f, 24f), holding ? "<b>" + U("Pull!") + "</b>" : U("Brace!"), 16, holding ? new Color(0.55f, 1f, 0.6f) : Color.white);
        if (OiyoArcade.Button(new Rect(w - 60f, 14f, 44f, 44f), "<b>II</b>", OiyoScreens.Slate, 18))
        {
            if (state == GameState.Playing) { state = GameState.Paused; holding = false; }
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (state == GameState.Playing && PhaseAt(t) >= 1)
            OiyoArcade.Shadowed(new Rect(8f, h * 0.3f, w * 0.5f, 40f), U("Yeongcha!"), 28, new Color(1f, 0.45f, 0.4f), TextAnchor.MiddleCenter);
        if (state == GameState.Playing || state == GameState.Ready)
        {
            // where the flag is between their line (red) and yours (blue)
            var r = new Rect(20f, h - 40f, w - 40f, 12f);
            OiyoArcade.Fill(r, new Color(1f, 1f, 1f, 0.2f));
            OiyoArcade.Fill(new Rect(r.x, r.y - 4f, 4f, 20f), new Color(0.79f, 0.16f, 0.16f));
            OiyoArcade.Fill(new Rect(r.xMax - 4f, r.y - 4f, 4f, 20f), new Color(0.1f, 0.44f, 0.76f));
            OiyoArcade.Fill(new Rect(r.x + r.width * (x + 1f) * 0.5f - 4f, r.y - 6f, 8f, 24f), new Color(0.98f, 0.69f, 0.02f));
        }
        if (msgT > 0f) OiyoArcade.Shadowed(new Rect(8f, 80f, w - 16f, 36f), msg, 22, msgC, TextAnchor.MiddleCenter);
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Pull in their rest"), U("When they shout, let go and brace. Pulling into their heave gets you yanked."), 200f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            bool w0 = state == GameState.Victory;
            string detail = w0 ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : "";
            string body = w0 ? $"<b>{F("Won in {0}s", t.ToString("F1"))}</b>" : "";
            int res = OiyoScreens.Result(w, h, Dark, Accent, w0, ResultLive, w0 ? U("The flag crossed your line!") : U("You lost the tug of war"), detail, body,
                w0 && stageIdx < StageCount - 1 ? U("Next stage") : null, w0 && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (res == 1) LoadStage(stageIdx + 1); else if (res == 2) LoadStage(stageIdx); else if (res == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
