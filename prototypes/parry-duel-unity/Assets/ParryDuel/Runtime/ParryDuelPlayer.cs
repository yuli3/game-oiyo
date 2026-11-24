using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Parry Duel 3D: the web Parry Duel (src/components/games/ParryDuel.tsx, src/lib/games/parry-duel.ts) rebuilt in
// Unity on the web's own 360 × 560 px field (OiyoField). Turns alternate. Your move: Strike 8, Heavy 18 for 2 focus,
// Mend +16 health for 3 focus. The rival's turn plays its next combo (three, in turn): each swing is raised at its
// time and lands after its wind-up. A tap within ±perfect of the landing parries (no damage, 2 back, +1 focus up to 5),
// within ±good blocks (a quarter of the damage); a tap at nothing fumbles (no defence for 0.35 s); a swing left alone
// lands in full once its window has passed. The 30 rivals are the web's own (ParryDuelStages.cs).
public class ParryDuelPlayer : MonoBehaviour
{
    const string Slug = "parry-duel";
    const int StageCount = 30, PlayerHp = 100, FocusMax = 5, StrikeDmg = 8, HeavyDmg = 18, MendHp = 16, Counter = 2;
    const float Fumble = 0.35f, PlateY = 470f, PlateW = 108f, PlateH = 72f;
    static readonly Vector2 Me = new Vector2(180f, 380f), Foe = new Vector2(180f, 170f);
    static readonly int[] Cost = { 0, 2, 3 };

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of parry-duel.ts) ----------------
    ParryDuelStages.Level st;
    int stageIdx, starsWon, hp, foe, focus, round, swing, parries, blocks, hits;
    bool defending, over, won;
    float t, lockUntil;
    int[] start; // first swing of each combo in the flattened arrays

    int ComboIndex => round % st.lengths.Length;
    int ComboLen => st.lengths[ComboIndex];
    int SwingAt(int k) => start[ComboIndex] + k; // index into the flattened arrays
    float HitTime(int k) => st.at[SwingAt(k)] + st.windup[SwingAt(k)];
    static float PlateX(int k) => 10f + k * 116f;

    void NewDuel()
    {
        start = new int[st.lengths.Length];
        for (int i = 1; i < start.Length; i++) start[i] = start[i - 1] + st.lengths[i - 1];
        hp = PlayerHp; foe = st.hp; focus = 0; round = 0; swing = 0; parries = blocks = hits = 0;
        defending = false; over = false; won = false; t = 0f; lockUntil = -1f;
    }

    bool Choose(int mv)
    {
        if (over || defending || focus < Cost[mv]) return false;
        focus -= Cost[mv];
        if (mv == 0) foe -= StrikeDmg;
        if (mv == 1) foe -= HeavyDmg;
        if (mv == 2) hp = Mathf.Min(PlayerHp, hp + MendHp);
        if (foe <= 0) { foe = 0; over = true; won = true; return true; }
        defending = true; t = 0f; swing = 0; lockUntil = -1f;
        return true;
    }

    // "parry", "block", "fumble", "locked"
    string Tap()
    {
        if (over || !defending) return null;
        if (t < lockUntil) return "locked";
        if (swing >= ComboLen) return null;
        float off = Mathf.Abs(t - HitTime(swing));
        if (off <= st.perfect)
        {
            parries++; focus = Mathf.Min(FocusMax, focus + 1); foe -= Counter; swing++;
            if (foe <= 0) { foe = 0; over = true; won = true; }
            return "parry";
        }
        if (off <= st.good)
        {
            blocks++; Hurt(Mathf.CeilToInt(st.damage[SwingAt(swing)] / 4f)); swing++;
            return "block";
        }
        lockUntil = t + Fumble;
        return "fumble";
    }

    void Hurt(int n) { hp -= n; if (hp <= 0) { hp = 0; over = true; won = false; } }

    bool hitNow;
    void Step(float dt)
    {
        hitNow = false;
        if (over || !defending) return;
        t += dt;
        while (!over && swing < ComboLen && t > HitTime(swing) + st.good)
        {
            hits++; Hurt(st.damage[SwingAt(swing)]); swing++; hitNow = true;
        }
        if (!over && swing >= ComboLen) { round++; defending = false; }
    }

    int StarsFor()
    {
        if (!won) return 0;
        if (hits == 0 && round <= st.par) return 3;
        if (hp >= PlayerHp / 2) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    OiyoField field;
    Camera cam;
    Transform root, hero, rival, ringOuter, ringInner;
    Renderer rivalR, ringR;
    readonly Renderer[] plateR = new Renderer[3];
    Material rivalDown, rivalUp, ringMat, feintMat, innerMat, plateOff, lockMat;
    readonly Material[] plateOn = new Material[3];
    Transform lockFx;
    Bursts sparks;
    Synth synth;
    bool showStages;
    float shake, flash;

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(360f, 560f, new Color(0.1f, 0.08f, 0.14f));
        cam = field.Cam;
        OiyoField.Lights(new Color(0.6f, 0.55f, 0.65f), 0.7f, 35f, -20f);
        sparks = new Bursts(transform, 0.4f);
        synth = new Synth(gameObject);
        rivalDown = OiyoField.Sprite("PD/rival");
        rivalUp = OiyoField.Sprite("PD/rival_up");
        ringMat = OiyoArcade.Transparent(OiyoArcade.Art("PD/ring"), new Color(1f, 0.53f, 0.53f, 1f));
        feintMat = OiyoArcade.Transparent(OiyoArcade.Art("PD/ring"), new Color(0.8f, 0.36f, 0.91f, 1f));
        innerMat = OiyoArcade.Transparent(OiyoArcade.Art("PD/ring"), new Color(1f, 1f, 1f, 0.55f));
        plateOff = OiyoArcade.Lit(new Color(0.2f, 0.23f, 0.25f), 0.2f);
        plateOn[0] = OiyoArcade.Lit(new Color(0.1f, 0.44f, 0.76f), 0.4f);
        plateOn[1] = OiyoArcade.Lit(new Color(0.79f, 0.16f, 0.16f), 0.4f);
        plateOn[2] = OiyoArcade.Lit(new Color(0.17f, 0.54f, 0.24f), 0.4f);
        lockMat = OiyoArcade.Transparent(OiyoArcade.Solid(Color.white), new Color(0.91f, 0.35f, 0.05f, 0.35f));
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int i, bool ready = true)
    {
        stageIdx = Mathf.Clamp(i, 0, StageCount - 1);
        StopAllCoroutines();
        st = ParryDuelStages.All[stageIdx];
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Arena").transform;
        NewDuel();
        starsWon = 0;
        showStages = false;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Animate(0f);
    }

    Transform Box(Material m, float x, float y, float w, float h, float z, float depth)
    {
        var q = OiyoArcade.Prim(PrimitiveType.Cube, "Box", m, root).transform;
        q.position = field.W(x, y, z);
        q.localScale = new Vector3(OiyoField.U(w), OiyoField.U(h), depth);
        return q;
    }

    void BuildScene()
    {
        Box(OiyoArcade.Lit(Color.white, 0.2f, OiyoArcade.Art("PD/floor", true)), 180f, 350f, 2400f, 200f, 0.5f, 0.2f);
        for (int k = -14; k < 20; k++) Box(OiyoArcade.Lit(new Color(0.23f, 0.18f, 0.28f), 0.2f), 20f + k * 64f, 210f, 18f, 120f, 0.3f, 0.6f);
        hero = OiyoField.Quad("Hero", OiyoField.Sprite("PD/hero"), root, 72f, 81f);
        rival = OiyoField.Quad("Rival", rivalDown, root, 72f, 81f);
        rivalR = rival.GetComponent<Renderer>();
        ringOuter = OiyoField.Quad("Ring", ringMat, root, 100f, 100f);
        ringR = ringOuter.GetComponent<Renderer>();
        ringInner = OiyoField.Quad("Beat", innerMat, root, 68f, 68f);
        ringInner.position = field.W(Me.x, Me.y, -0.4f);
        lockFx = OiyoField.Quad("Fumble", lockMat, root, 80f, 100f);
        lockFx.position = field.W(Me.x, Me.y, -0.45f);
        for (int k = 0; k < 3; k++) plateR[k] = Box(plateOff, PlateX(k) + PlateW / 2f, PlateY + PlateH / 2f, PlateW, PlateH, -0.2f, 0.3f).GetComponent<Renderer>();
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("parry-duel", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        if (state == GameState.Playing)
        {
            int hp0 = hp;
            Step(dt);
            if (hitNow)
            {
                Toast(U("Hit"), new Color(1f, 0.42f, 0.42f));
                shake = 0.25f;
                synth.Tone(150f, 0.2f, Wave.Noise, 0.18f, 80f, 6f);
                if (hp < hp0) sparks.Emit(field.W(Me.x, Me.y, -0.6f), new Color(0.98f, 0.32f, 0.32f), 10, 3f, 0.07f, 0.5f);
            }
            if (over) End();
        }
        shake = Mathf.Max(0f, shake - dt);
        flash = Mathf.Max(0f, flash - dt);
        msgT = Mathf.Max(0f, msgT - dt);
        Animate(dt);
    }

    string msg = ""; float msgT; Color msgC = Color.white;
    void Toast(string m, Color c) { msg = m; msgT = 0.6f; msgC = c; }

    void DoMove(int mv)
    {
        if (!Choose(mv)) return;
        if (mv == 2) synth.Tone(660f, 0.2f, Wave.Triangle, 0.15f, 990f, 5f);
        else
        {
            synth.Tone(mv == 1 ? 180f : 320f, 0.12f, Wave.Noise, 0.16f, 90f, 8f);
            sparks.Emit(field.W(Foe.x, Foe.y + 20f, -0.6f), Color.white, mv == 1 ? 14 : 7, 3f, 0.06f, 0.4f);
        }
    }

    void DoTap()
    {
        string r = Tap();
        if (r == "parry")
        {
            Toast(U("Parry!"), new Color(1f, 0.83f, 0.23f));
            flash = 0.12f;
            sparks.Emit(field.W(Me.x, Me.y - 40f, -0.7f), new Color(1f, 0.85f, 0.3f), 12, 4f, 0.07f, 0.4f);
            synth.Tone(1320f, 0.08f, Wave.Square, 0.12f, 1760f, 12f);
        }
        else if (r == "block") { Toast(U("Block"), new Color(0.45f, 0.75f, 0.99f)); synth.Tone(520f, 0.08f, Wave.Triangle, 0.14f, 0f, 12f); }
        else if (r == "fumble") Toast(U("Fumble"), new Color(1f, 0.6f, 0.3f));
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
                    // taps are read once per frame: a move plate on your turn, a parry anywhere on theirs
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (OiyoArcade.OverUi(b.pos) || !field.ToField(b.pos, out Vector2 f)) continue;
                        if (state == GameState.Ready) { state = GameState.Playing; continue; }
                        if (!defending)
                        {
                            for (int k = 0; k < 3; k++)
                                if (f.x >= PlateX(k) && f.x <= PlateX(k) + PlateW && f.y >= PlateY && f.y <= PlateY + PlateH) DoMove(k);
                        }
                        else DoTap();
                    }
                    for (int k = 0; k < 3; k++) if (Input.GetKeyDown(KeyCode.Alpha1 + k)) { if (state == GameState.Ready) state = GameState.Playing; DoMove(k); }
                    if (Input.GetKeyDown(KeyCode.Space)) { if (state == GameState.Ready) state = GameState.Playing; else DoTap(); }
                    if (state == GameState.Ready && confirm) state = GameState.Playing;
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
        if (won)
        {
            starsWon = StarsFor();
            state = GameState.Victory;
            OiyoArcade.Record(Slug, stageIdx, starsWon, hp, StageCount);
            sparks.Emit(field.W(Foe.x, Foe.y, -0.8f), new Color(1f, 0.85f, 0.25f), 30, 4f, 0.1f, 1f);
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
        float sx = shake > 0f ? Mathf.Sin(Time.time * 50f) * 4f : 0f;
        hero.position = field.W(Me.x + sx, Me.y, -0.3f);
        bool live = defending && swing < ComboLen;
        bool raising = live && t >= st.at[SwingAt(swing)];
        rival.position = field.W(Foe.x, Foe.y - (raising ? 6f : 0f), -0.3f);
        rivalR.sharedMaterial = raising ? rivalUp : rivalDown;
        ringOuter.gameObject.SetActive(raising);
        ringInner.gameObject.SetActive(defending);
        if (raising)
        {
            int s = SwingAt(swing);
            float left = Mathf.Max(0f, (HitTime(swing) - t) / st.windup[s]);
            float size = 68f + left * 240f;
            ringOuter.position = field.W(Me.x, Me.y, -0.42f);
            ringOuter.localScale = new Vector3(OiyoField.U(size), OiyoField.U(size), 1f);
            ringR.sharedMaterial = st.feint[s] == 1 ? feintMat : ringMat;
        }
        lockFx.gameObject.SetActive(defending && t < lockUntil);
        for (int k = 0; k < 3; k++) plateR[k].sharedMaterial = !defending && !over && focus >= Cost[k] ? plateOn[k] : plateOff;
        cam.backgroundColor = flash > 0f ? new Color(0.23f, 0.18f, 0.04f) : new Color(0.1f, 0.08f, 0.14f);
    }

    // ?oiyotest=1 prints the state to the browser console for the automated play check: whose turn, the time into the
    // rival's combo, when the next swing lands, focus and health, and the screen points (px from the top-left) of the
    // three move plates.
    bool testLog; float testT;
    Vector2 Scr(Vector2 f) { var sp = cam.WorldToScreenPoint(field.W(f.x, f.y, -0.3f)); return new Vector2(sp.x, Screen.height - sp.y); }
    void TestTick(float dt)
    {
        if (!testLog || (testT -= dt) > 0f) return;
        testT = 0f; // every frame: the bot reacts frame by frame
        float next = defending && swing < ComboLen ? HitTime(swing) : -1f;
        var plates = new System.Text.StringBuilder();
        for (int k = 0; k < 3; k++) { if (k > 0) plates.Append(','); var p = Scr(new Vector2(PlateX(k) + PlateW / 2f, PlateY + PlateH / 2f)); plates.Append('[').Append(p.x.ToString("F1")).Append(',').Append(p.y.ToString("F1")).Append(']'); }
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"defending\":{(defending ? "true" : "false")},\"t\":{t:F4},\"next\":{next:F4},\"swing\":{swing},\"dt\":{Time.deltaTime:F4},\"hp\":{hp},\"foe\":{foe},\"focus\":{focus},\"round\":{round},\"parries\":{parries},\"hits\":{hits},\"plates\":[{plates}],\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.79f, 0.16f, 0.16f, 0.97f);
    static readonly Color Dark = new Color(0.08f, 0.06f, 0.11f, 0.9f);
    static readonly string[] MoveName = { "Strike", "Heavy (2)", "Mend (3)" };

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + U("Rival") + " " + ParryDuelStages.All[i].hp;

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(1f, 0.96f, 0.9f), U("Parry Duel"),
                U("Pick a move on your turn. On the rival's turn, tap as each ring lands to parry and counter."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        var bar = new Rect(8f, 8f, w - 16f, 64f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 12f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>  " + F("Round {0}", round + 1) + " · " + (defending ? U("Defend!") : U("Your turn")), 15, new Color(1f, 0.96f, 0.9f));
        OiyoArcade.Bar(new Rect(20f, 40f, w - 100f, 10f), (float)foe / st.hp, new Color(1f, 1f, 1f, 0.15f), new Color(0.98f, 0.32f, 0.32f));
        OiyoArcade.Text(new Rect(20f, 52f, w - 100f, 18f), $"{U("Rival")} {foe}", 11, Color.white);
        if (OiyoArcade.Button(new Rect(w - 60f, 14f, 44f, 44f), "<b>II</b>", OiyoScreens.Slate, 18))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        {
            var g = OiyoArcade.ToGui(cam.WorldToScreenPoint(field.W(12f, 440f, -0.3f)));
            var g2 = OiyoArcade.ToGui(cam.WorldToScreenPoint(field.W(348f, 455f, -0.3f)));
            float bw = g2.x - g.x;
            OiyoArcade.Text(new Rect(g.x, g.y - 20f, bw, 20f), $"<b>{U("You")} {hp}</b>", 13, Color.white);
            OiyoArcade.Bar(new Rect(g.x, g.y, bw * 0.6f, 10f), (float)hp / PlayerHp, new Color(1f, 1f, 1f, 0.15f), new Color(0.32f, 0.81f, 0.4f));
            OiyoArcade.Text(new Rect(g.x + bw * 0.62f, g.y - 20f, bw * 0.38f, 20f), F("Focus {0}/{1}", focus, FocusMax), 13, new Color(1f, 0.83f, 0.23f), TextAnchor.UpperRight);
            for (int k = 0; k < FocusMax; k++) OiyoArcade.Fill(new Rect(g.x + bw * 0.62f + k * (bw * 0.38f / FocusMax), g.y, bw * 0.38f / FocusMax - 3f, 10f), k < focus ? new Color(1f, 0.83f, 0.23f) : new Color(1f, 1f, 1f, 0.15f));
        }
        for (int k = 0; k < 3; k++)
        {
            var g = OiyoArcade.ToGui(cam.WorldToScreenPoint(field.W(PlateX(k) + PlateW / 2f, PlateY + PlateH / 2f, -0.5f)));
            bool ok = !defending && !over && focus >= Cost[k];
            OiyoArcade.Shadowed(new Rect(g.x - 60f, g.y - 12f, 120f, 24f), "<b>" + U(MoveName[k]) + "</b>", 15, ok ? Color.white : new Color(1f, 1f, 1f, 0.35f), TextAnchor.MiddleCenter);
        }
        if (msgT > 0f)
        {
            var g = OiyoArcade.ToGui(cam.WorldToScreenPoint(field.W(180f, 285f - (0.6f - msgT) * 30f, -0.8f)));
            OiyoArcade.Shadowed(new Rect(8f, g.y - 16f, w - 16f, 32f), "<b>" + msg + "</b>", 22, msgC, TextAnchor.MiddleCenter);
        }
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap to start"), U("Tap as the ring lands: go no-hit."), 200f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            bool w0 = state == GameState.Victory;
            string detail = w0 ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : "";
            string body = $"<size=14>{F("Parries {0} · blocks {1} · hits taken {2}", parries, blocks, hits)}</size>";
            int r = OiyoScreens.Result(w, h, Dark, Accent, w0, ResultLive, w0 ? U("Victory!") : U("You fell"), detail, body,
                w0 && stageIdx < StageCount - 1 ? U("Next stage") : null, w0 && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
