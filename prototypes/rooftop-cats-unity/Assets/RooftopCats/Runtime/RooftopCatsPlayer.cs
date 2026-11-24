using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Rooftop Cats 3D: the web Rooftop Cats (src/components/games/RooftopCats.tsx, src/lib/games/rooftop-cats.ts) rebuilt
// in Unity on the web's own 360 × 560 px field (OiyoField). A pixel town's rooftops hide cats — on roof edges, in
// windows, by chimneys, tanks and washing. Tap a cat to find it; a tap on nothing costs 4 seconds. Find them all
// before the clock runs out. The 30 scenes, from noon to dusk to night, are the web's own (RooftopCatsStages.cs).
public class RooftopCatsPlayer : MonoBehaviour
{
    const string Slug = "rooftop-cats";
    const int StageCount = 30;
    const float SceneTop = 100f, SceneH = 420f, CatW = 14f, CatH = 10f, MissPenalty = 4f;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of rooftop-cats.ts) ----------------
    RooftopCatsStages.Level st;
    int stageIdx, starsWon, misses;
    bool[] found;
    float t;
    bool over, won;

    int Cats => st.cats.Length / 5;
    float CX(int i) => st.cats[i * 5];
    float CY(int i) => st.cats[i * 5 + 1];
    bool Peek(int i) => st.cats[i * 5 + 2] > 0.5f;
    int Host(int i) => (int)st.cats[i * 5 + 3];
    float Scale(int i) => st.cats[i * 5 + 4];
    int Props => st.props.Length / 5;

    float TimeLeft => st.limit - t - misses * MissPenalty;

    int CatAt(float x, float y)
    {
        int best = -1; float bestD = float.MaxValue;
        for (int i = 0; i < Cats; i++)
        {
            if (found[i]) continue;
            float hw = CatW * Scale(i) / 2f + 6f;
            float hh = (Peek(i) ? CatH * 0.6f : CatH) * Scale(i) / 2f + 6f;
            float dx = Mathf.Abs(x - CX(i)), dy = Mathf.Abs(y - CY(i));
            if (dx <= hw && dy <= hh && dx + dy < bestD) { best = i; bestD = dx + dy; }
        }
        return best;
    }

    // 0 nothing, 1 found, 2 miss
    int Tap(float x, float y)
    {
        if (over) return 0;
        int i = CatAt(x, y);
        if (i < 0)
        {
            misses++;
            if (TimeLeft <= 0f) over = true;
            return 2;
        }
        found[i] = true;
        bool all = true;
        foreach (bool f in found) if (!f) all = false;
        if (all) { over = true; won = true; }
        return 1;
    }

    int StarsFor()
    {
        if (!won) return 0;
        float used = t + misses * MissPenalty;
        if (used <= st.par) return 3;
        if (used <= (st.par + st.limit) / 2f) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    OiyoField field;
    Camera cam;
    Transform root, aimMark;
    Transform[] ringObj;
    readonly Dictionary<string, Material> solid = new Dictionary<string, Material>();
    readonly Dictionary<string, Material> catMats = new Dictionary<string, Material>();
    Texture2D catTex, peekTex;
    Material ringMat, aimMat, eyeMat;
    Bursts sparkle;
    Synth synth;
    bool showStages;
    Vector2? aim;
    string pop; float popT; Vector2 popAt;

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(360f, 560f, new Color(0.13f, 0.15f, 0.16f));
        cam = field.Cam;
        OiyoField.Lights(new Color(1f, 1f, 1f), 0f, 40f, -25f);
        sparkle = new Bursts(transform, 0.5f);
        synth = new Synth(gameObject);
        catTex = OiyoArcade.Art("RC/cat");
        peekTex = OiyoArcade.Art("RC/cat_peek");
        ringMat = OiyoField.Sprite("RC/ring");
        aimMat = OiyoField.Sprite("RC/aim");
        eyeMat = OiyoArcade.Glow(new Color(0.75f, 0.92f, 0.46f));
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    Material Solid(string hex)
    {
        if (!solid.TryGetValue(hex, out var m))
        {
            ColorUtility.TryParseHtmlString(hex, out var c);
            // opaque and unlit, so the depth buffer (not transparent sorting) keeps nearer props in front
            m = OiyoArcade.Glow(c);
            solid[hex] = m;
        }
        return m;
    }

    Material CatMat(string hex, bool peek)
    {
        string key = hex + (peek ? "p" : "");
        if (!catMats.TryGetValue(key, out var m))
        {
            ColorUtility.TryParseHtmlString(hex, out var c);
            m = OiyoArcade.Transparent(peek ? peekTex : catTex, c);
            catMats[key] = m;
        }
        return m;
    }

    void LoadStage(int i, bool ready = true)
    {
        stageIdx = Mathf.Clamp(i, 0, StageCount - 1);
        StopAllCoroutines();
        st = RooftopCatsStages.All[stageIdx];
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Town").transform;
        found = new bool[Cats];
        t = 0f; misses = 0; over = false; won = false; starsWon = 0;
        aim = null; pop = null;
        showStages = false;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Animate(0f);
    }

    Transform Flat(Material m, float x, float y, float w, float h, float z)
    {
        var q = OiyoField.Quad("Flat", m, root, w, h);
        q.position = field.W(x, y, z);
        return q;
    }

    void BuildScene()
    {
        Flat(Solid(st.sky), 180f, SceneTop + SceneH / 2f, 360f, SceneH, 0.2f);
        if (st.time == 2)
        {
            Flat(Solid("#fff3bf"), 309f, SceneTop + 29f, 18f, 18f, 0.15f);
            for (int k = 0; k < 14; k++) Flat(Solid("#fff3bf"), (k * 97) % 360 + 1f, SceneTop + 9f + (k * 53) % 90, 2f, 2f, 0.15f);
        }
        else if (st.time == 0) Flat(Solid("#ffe066"), 41f, SceneTop + 29f, 22f, 22f, 0.15f);
        // props back to front, each cat right after its host so later props stay in front
        for (int k = 0; k < Props; k++)
        {
            int kind = (int)st.props[k * 5];
            float x = st.props[k * 5 + 1], y = st.props[k * 5 + 2], w = st.props[k * 5 + 3], h = st.props[k * 5 + 4];
            float z = 0.1f - k * 0.0015f;
            var m = Solid(st.propColours[k]);
            if (kind == 8) Flat(m, x + w / 2f, y + 0.5f, w, 1f, z);
            else if (kind == 4) { Flat(m, x + w / 2f, y + 4f, w, 8f, z); Flat(m, x + w / 2f, y + 6f + (h - 6f) / 2f, w - 6f, h - 6f, z); }
            else Flat(m, x + w / 2f, y + h / 2f, w, h, z);
            for (int c = 0; c < Cats; c++)
            {
                if (Host(c) != k) continue;
                float s = Scale(c);
                bool peek = Peek(c);
                float ch = (peek ? 3f : 5f) * 2f * s;
                var q = Flat(CatMat(st.catColours[c], peek), CX(c), CY(c), 7f * 2f * s, ch, z - 0.0007f);
                if (st.time == 2)
                {
                    // eyes glow at night: two specks on the third row
                    Flat(eyeMat, CX(c) - 3f * s, CY(c) - ch / 2f + 5f * s, 2f * s, 2f * s, z - 0.0009f);
                    Flat(eyeMat, CX(c) + 3f * s, CY(c) - ch / 2f + 5f * s, 2f * s, 2f * s, z - 0.0009f);
                }
                q.name = "Cat";
            }
        }
        ringObj = new Transform[Cats];
        for (int c = 0; c < Cats; c++)
        {
            ringObj[c] = Flat(ringMat, CX(c), CY(c), 28f, 28f, -0.2f);
            ringObj[c].gameObject.SetActive(false);
        }
        aimMark = Flat(aimMat, 0f, 0f, CatW + 10f, CatH + 10f, -0.25f);
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("rooftop-cats", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        if (state == GameState.Playing && !over)
        {
            t += dt;
            if (TimeLeft <= 0f) { over = true; won = false; }
            if (over) End();
        }
        if (popT > 0f) popT -= dt;
        Animate(dt);
    }

    void DoTap(Vector2 f)
    {
        int r = Tap(f.x, f.y);
        if (r == 1)
        {
            int i = -1;
            for (int k = 0; k < Cats; k++) if (found[k] && !ringObj[k].gameObject.activeSelf) i = k;
            if (i >= 0) { ringObj[i].gameObject.SetActive(true); ringT[i] = 0f; sparkle.Emit(field.W(CX(i), CY(i), -0.5f), new Color(1f, 0.83f, 0.23f), 10, 2.5f, 0.06f, 0.5f); }
            synth.Tone(880f, 0.08f, Wave.Triangle, 0.14f, 1318f, 10f);
        }
        else if (r == 2)
        {
            pop = F("-{0}s", MissPenalty); popT = 0.8f; popAt = f;
            synth.Tone(196f, 0.12f, Wave.Square, 0.1f, 130f, 10f);
        }
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
                    // taps are read once per frame
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (OiyoArcade.OverUi(b.pos) || !field.ToField(b.pos, out Vector2 f)) continue;
                        if (state == GameState.Ready) { state = GameState.Playing; continue; }
                        if (f.y < SceneTop || f.y > SceneTop + SceneH) continue;
                        DoTap(f);
                        if (over) break;
                    }
                    // keyboard: arrows move a crosshair (Shift for big steps), Enter or Space taps under it
                    float d = Input.GetKey(KeyCode.LeftShift) || Input.GetKey(KeyCode.RightShift) ? 40f : 10f;
                    var a = aim ?? new Vector2(180f, SceneTop + SceneH / 2f);
                    bool moved = false;
                    if (Input.GetKeyDown(KeyCode.LeftArrow)) { a.x -= d; moved = true; }
                    if (Input.GetKeyDown(KeyCode.RightArrow)) { a.x += d; moved = true; }
                    if (Input.GetKeyDown(KeyCode.UpArrow)) { a.y -= d; moved = true; }
                    if (Input.GetKeyDown(KeyCode.DownArrow)) { a.y += d; moved = true; }
                    if (moved) { aim = new Vector2(Mathf.Clamp(a.x, 0f, 360f), Mathf.Clamp(a.y, SceneTop, SceneTop + SceneH)); if (state == GameState.Ready) state = GameState.Playing; }
                    if ((confirm || Input.GetKeyDown(KeyCode.Space)) && state == GameState.Ready) { state = GameState.Playing; return; }
                    if ((confirm || Input.GetKeyDown(KeyCode.Space)) && aim.HasValue) DoTap(aim.Value);
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
            OiyoArcade.Record(Slug, stageIdx, starsWon, Mathf.Max(0, Mathf.RoundToInt(TimeLeft)), StageCount);
            sparkle.Emit(field.W(180f, 300f, -1f), new Color(1f, 0.85f, 0.25f), 40, 5f, 0.1f, 1f);
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

    float[] ringT = new float[0];

    void Animate(float dt)
    {
        if (root == null) return;
        field.Fit(80f, 50f, 0f, SceneTop, SceneTop + SceneH);
        if (ringT.Length != Cats) ringT = new float[Cats];
        for (int i = 0; i < Cats; i++)
        {
            if (!found[i]) continue;
            ringT[i] += dt;
            float s = 28f + Mathf.Max(0f, 0.3f - ringT[i]) * 60f;
            ringObj[i].localScale = new Vector3(OiyoField.U(s), OiyoField.U(s), 1f);
        }
        aimMark.gameObject.SetActive(aim.HasValue && !over);
        if (aim.HasValue) aimMark.position = field.W(aim.Value.x, aim.Value.y, -0.25f);
    }

    // ?oiyotest=1 prints the state to the browser console for the automated play check: the clock, the cats found, and
    // the screen point (px from the top-left) of a cat still hiding.
    bool testLog; float testT;
    Vector2 Scr(Vector2 f) { var sp = cam.WorldToScreenPoint(field.W(f.x, f.y, 0f)); return new Vector2(sp.x, Screen.height - sp.y); }
    void TestTick(float dt)
    {
        if (!testLog || (testT -= dt) > 0f) return;
        testT = 0.05f;
        string next = "null";
        int n = 0;
        for (int i = 0; i < Cats; i++)
        {
            if (found[i]) { n++; continue; }
            if (next == "null") { var p = Scr(new Vector2(CX(i), CY(i))); next = $"[{p.x:F1},{p.y:F1}]"; }
        }
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"t\":{t:F2},\"par\":{st.par},\"limit\":{st.limit},\"found\":{n},\"cats\":{Cats},\"misses\":{misses},\"next\":{next},\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.94f, 0.55f, 0f, 0.97f);
    static readonly Color Dark = new Color(0.1f, 0.11f, 0.12f, 0.9f);

    Vector2 Gui(Vector2 f) => OiyoArcade.ToGui(cam.WorldToScreenPoint(field.W(f.x, f.y, -0.3f)));

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("{0} cats", RooftopCatsStages.All[i].cats.Length / 5);

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(1f, 0.92f, 0.8f), U("Rooftop Cats"),
                U("Cats are hiding all over the rooftops. Tap each one before the clock runs out; a tap on nothing costs 4 seconds."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        int n = 0;
        foreach (bool f in found) if (f) n++;
        var bar = new Rect(8f, 8f, w - 16f, 64f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 12f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>  " + F("Cats found {0}/{1}", n, Cats), 15, new Color(1f, 0.92f, 0.8f));
        float left = Mathf.Max(0f, TimeLeft);
        OiyoArcade.Bar(new Rect(20f, 40f, w - 160f, 12f), left / st.limit, new Color(0.2f, 0.23f, 0.25f), left < 10f ? new Color(0.98f, 0.32f, 0.32f) : new Color(0.32f, 0.81f, 0.4f));
        OiyoArcade.Text(new Rect(w - 134f, 34f, 70f, 24f), F("{0}s", Mathf.CeilToInt(left)), 14, Color.white);
        if (OiyoArcade.Button(new Rect(w - 60f, 14f, 44f, 44f), "<b>II</b>", OiyoScreens.Slate, 18))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (pop != null && popT > 0f && state == GameState.Playing)
        {
            var g = Gui(popAt);
            OiyoArcade.Shadowed(new Rect(g.x - 40f, g.y - 34f - (0.8f - popT) * 20f, 80f, 24f), pop, 16, new Color(1f, 0.42f, 0.42f), TextAnchor.MiddleCenter);
        }
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap to start"), U("Tap the cats hiding on the rooftops!"), 140f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            string detail = won ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : "";
            string body = $"<size=14>{F("Found {1} of {0} cats", Cats, n)}</size>";
            int r = OiyoScreens.Result(w, h, Dark, Accent, won, ResultLive, won ? U("You found every cat!") : U("Time's up"), detail, body,
                won && stageIdx < StageCount - 1 ? U("Next stage") : null, won && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
