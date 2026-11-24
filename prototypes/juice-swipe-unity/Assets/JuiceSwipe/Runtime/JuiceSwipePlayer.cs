using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Juice Swipe 3D: the web Juice Swipe (src/components/games/JuiceSwipe.tsx, src/lib/games/juice-swipe.ts) rebuilt in
// Unity on the web's own 360 × 560 px field (OiyoField, y down). Fruit and bees are tossed up from below the counter
// under 600 px/s² of gravity; every stroke of the finger is a blade segment that slices fruit within reach and stings on
// bees (three hearts). Slice the stage's fruit. The 30 stands are the web's own (JuiceSwipeStages.cs).
public class JuiceSwipePlayer : MonoBehaviour
{
    const string Slug = "juice-swipe";
    const int StageCount = 30;
    const int Hearts = 3;
    const float Gravity = 600f, FruitR = 22f, BeeR = 16f, Blade = 6f;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of juice-swipe.ts) ----------------
    class Flyer { public Vector2 p, v; public bool bee, cut; public int kind; public Transform obj; }
    JuiceSwipeStages.Level st;
    int tossCount, stageIdx, starsWon, next, sliced, hearts, combo;
    float t;
    readonly List<Flyer> flying = new List<Flyer>();
    bool over, won;

    float TossF(int k, int f) => st.tosses[k * 6 + f];

    static float SegDist(Vector2 p, Vector2 a, Vector2 b)
    {
        var d = b - a;
        float l = d.sqrMagnitude;
        float k = l == 0f ? 0f : Mathf.Clamp01(Vector2.Dot(p - a, d) / l);
        return (p - (a + d * k)).magnitude;
    }

    // returns fruit sliced; bees counted in stung
    int Swipe(Vector2 a, Vector2 b, out int stung)
    {
        stung = 0;
        if (over) return 0;
        int fruit = 0;
        foreach (var f in flying)
        {
            if (f.cut) continue;
            if (SegDist(f.p, a, b) < (f.bee ? BeeR : FruitR) + Blade)
            {
                f.cut = true;
                if (f.bee) { stung++; hearts--; } else { fruit++; sliced++; }
            }
        }
        if (fruit >= 2) combo++;
        if (hearts <= 0) over = true;
        return fruit;
    }

    void Step(float dt)
    {
        if (over) return;
        t += dt;
        while (next < tossCount && TossF(next, 0) <= t)
        {
            bool bee = TossF(next, 4) > 0.5f;
            int kind = Mathf.RoundToInt(TossF(next, 5));
            var f = new Flyer { p = new Vector2(TossF(next, 1), 580f), v = new Vector2(TossF(next, 2), TossF(next, 3)), bee = bee, kind = kind };
            f.obj = Sprite(bee ? beeMat : fruitMat[kind], bee ? 40f : 44f, 0.2f);
            flying.Add(f);
            next++;
        }
        for (int k = flying.Count - 1; k >= 0; k--)
        {
            var f = flying[k];
            f.v.y += Gravity * dt;
            f.p += f.v * dt;
            if (f.v.y > 0f && f.p.y > 600f) { Destroy(f.obj.gameObject); flying.RemoveAt(k); }
        }
        if (next >= tossCount && flying.Count == 0) { over = true; won = sliced >= st.need; }
    }

    int StarsFor()
    {
        if (!won) return 0;
        if (sliced >= st.par && hearts == Hearts) return 3;
        if (sliced >= Mathf.CeilToInt((st.need + st.par) / 2f)) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    OiyoField field;
    Camera cam;
    Transform root, blenderFill;
    Material[] fruitMat;
    Material beeMat, trailMat;
    readonly List<(Transform tr, float life)> trail = new List<(Transform, float)>();
    readonly List<(Transform tr, Vector3 v, float spin, float life)> halves = new List<(Transform, Vector3, float, float)>();
    Bursts sparkle;
    Synth synth;
    bool showStages, pressing;
    Vector2 lastPos;
    Vector2 keyBlade = new Vector2(180f, 300f);

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(360f, 560f, new Color(1f, 0.96f, 0.9f));
        cam = field.Cam;
        OiyoField.Lights(new Color(0.75f, 0.75f, 0.75f), 0.6f, 50f, -25f);
        sparkle = new Bursts(transform, 0.5f);
        synth = new Synth(gameObject);
        fruitMat = new Material[6];
        for (int k = 0; k < 6; k++) { fruitMat[k] = OiyoField.Sprite("JS/fruit" + k); fruitMat[k].renderQueue = 3001; }
        beeMat = OiyoField.Sprite("JS/bee");
        beeMat.renderQueue = 3002;
        trailMat = OiyoArcade.Glow(Color.white);
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    Transform Sprite(Material m, float size, float z)
    {
        var q = OiyoField.Quad("Sprite", m, root, size, size);
        q.position = field.W(0f, 700f, -z);
        return q;
    }

    void LoadStage(int i, bool ready = true)
    {
        stageIdx = Mathf.Clamp(i, 0, StageCount - 1);
        StopAllCoroutines();
        st = JuiceSwipeStages.All[stageIdx];
        tossCount = st.tosses.Length / 6;
        flying.Clear(); trail.Clear(); halves.Clear();
        t = 0f; next = 0; sliced = 0; hearts = Hearts; combo = 0; over = false; won = false; starsWon = 0; pressing = false;
        botNext = 0f;
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Stand").transform;
        showStages = false;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Animate(0f);
    }

    void BuildScene()
    {
        for (int k = 0; k < 9; k++)
        {
            var a = OiyoArcade.Prim(PrimitiveType.Cube, "Awning", OiyoArcade.Lit(k % 2 == 1 ? new Color(1f, 0.53f, 0.53f) : Color.white, 0.2f), root).transform;
            a.localScale = new Vector3(OiyoField.U(40f), OiyoField.U(34f), 0.3f);
            a.position = field.W(20f + k * 40f, 17f, 0.4f);
        }
        var counter = OiyoArcade.Prim(PrimitiveType.Cube, "Counter", OiyoArcade.Lit(new Color(1f, 0.85f, 0.66f), 0.3f), root).transform;
        counter.localScale = new Vector3(OiyoField.U(420f), OiyoField.U(60f), 0.6f);
        counter.position = field.W(180f, 530f, -0.3f);
        var blender = OiyoArcade.Prim(PrimitiveType.Cube, "Blender", OiyoArcade.Lit(new Color(0.68f, 0.71f, 0.74f), 0.6f), root).transform;
        blender.localScale = new Vector3(OiyoField.U(40f), OiyoField.U(54f), 0.4f);
        blender.position = field.W(320f, 473f, -0.7f);
        blenderFill = OiyoArcade.Prim(PrimitiveType.Cube, "Juice", OiyoArcade.Lit(new Color(1f, 0.57f, 0.17f), 0.4f), root).transform;
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("juice-swipe", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        if (state == GameState.Playing && !over)
        {
            Step(dt);
            if (over) End();
        }
        Animate(dt);
    }

    void Stroke(Vector2 a, Vector2 b)
    {
        if (state != GameState.Playing || over) return;
        var before = new HashSet<Flyer>();
        foreach (var f in flying) if (f.cut) before.Add(f);
        int fruit = Swipe(a, b, out int stung);
        foreach (var f in flying)
        {
            if (!f.cut || before.Contains(f)) continue;
            if (f.bee) { sparkle.Emit(field.W(f.p.x, f.p.y, -0.5f), new Color(0.98f, 0.32f, 0.32f), 10, 3f, 0.07f, 0.4f); continue; }
            for (int s = -1; s <= 1; s += 2)
            {
                var hq = OiyoField.Quad("Half", fruitMat[f.kind], root, 40f, 40f);
                hq.position = field.W(f.p.x + s * 6f, f.p.y, -0.3f);
                halves.Add((hq, new Vector3(s * 2f + f.v.x / 30f, 1f, 0f), s * 300f, 1f));
            }
            sparkle.Emit(field.W(f.p.x, f.p.y, -0.5f), new Color(1f, 0.83f, 0.23f), 8, 3f, 0.06f, 0.4f);
            f.obj.gameObject.SetActive(false);
        }
        if (fruit > 0) synth.Tone(fruit >= 2 ? 880f : 660f, 0.08f, Wave.Triangle, 0.12f, 990f, 10f);
        if (stung > 0) synth.Tone(160f, 0.2f, Wave.Square, 0.14f, 90f, 8f);
        // a glowing line along the stroke
        var seg = OiyoArcade.Prim(PrimitiveType.Cube, "Trail", trailMat, root).transform;
        var mid = (a + b) / 2f;
        seg.position = field.W(mid.x, mid.y, -0.6f);
        seg.localScale = new Vector3(OiyoField.U(Mathf.Max(2f, (b - a).magnitude)), OiyoField.U(5f), 0.02f);
        seg.rotation = Quaternion.Euler(0f, 0f, -Mathf.Atan2(b.y - a.y, b.x - a.x) * Mathf.Rad2Deg);
        trail.Add((seg, 0.2f));
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
                    // input is read once per frame: while a finger is down, each frame's movement is a blade stroke
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (state == GameState.Ready) { state = GameState.Playing; continue; }
                        if (OiyoArcade.OverUi(b.pos) || !field.ToField(b.pos, out Vector2 f)) continue;
                        pressing = true; lastPos = f;
                    }
                    if (pressing)
                    {
                        var held = OiyoArcade.Held();
                        if (held.Count > 0 && field.ToField(held[0].pos, out Vector2 g))
                        {
                            if ((g - lastPos).magnitude > 1f) Stroke(lastPos, g);
                            lastPos = g;
                        }
                        foreach (var e in OiyoArcade.Ended())
                        {
                            if (field.ToField(e.pos, out Vector2 g2) && (g2 - lastPos).magnitude > 1f) Stroke(lastPos, g2);
                            pressing = false;
                        }
                        if (held.Count == 0) pressing = false;
                    }
                    if (Input.GetKeyDown(KeyCode.UpArrow)) keyBlade.y = Mathf.Max(60f, keyBlade.y - 20f);
                    if (Input.GetKeyDown(KeyCode.DownArrow)) keyBlade.y = Mathf.Min(540f, keyBlade.y + 20f);
                    if (Input.GetKeyDown(KeyCode.LeftArrow)) keyBlade.x = Mathf.Max(20f, keyBlade.x - 20f);
                    if (Input.GetKeyDown(KeyCode.RightArrow)) keyBlade.x = Mathf.Min(340f, keyBlade.x + 20f);
                    if (Input.GetKeyDown(KeyCode.Space) || confirm)
                    {
                        if (state == GameState.Ready) state = GameState.Playing;
                        else Stroke(keyBlade - new Vector2(70f, 0f), keyBlade + new Vector2(70f, 0f));
                    }
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
            OiyoArcade.Record(Slug, stageIdx, starsWon, sliced * 10 + combo, StageCount);
            sparkle.Emit(field.W(320f, 450f, -1f), new Color(1f, 0.57f, 0.17f), 40, 5f, 0.1f, 1f);
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
        field.Fit(56f, 10f, 0f, 20f, 560f);
        foreach (var f in flying) if (!f.cut) f.obj.position = field.W(f.p.x, f.p.y, -0.2f);
        for (int k = trail.Count - 1; k >= 0; k--)
        {
            var (tr, life) = trail[k];
            life -= dt;
            if (life <= 0f) { Destroy(tr.gameObject); trail.RemoveAt(k); } else trail[k] = (tr, life);
        }
        for (int k = halves.Count - 1; k >= 0; k--)
        {
            var (tr, v, spin, life) = halves[k];
            v.y -= 20f * dt;
            tr.position += v * dt;
            tr.Rotate(0f, 0f, spin * dt);
            life -= dt;
            if (life <= 0f) { Destroy(tr.gameObject); halves.RemoveAt(k); } else halves[k] = (tr, v, spin, life);
        }
        float fill = Mathf.Clamp01(sliced / (float)Mathf.Max(1, st.need));
        blenderFill.localScale = new Vector3(OiyoField.U(32f), OiyoField.U(Mathf.Max(1f, 44f * fill)), 0.42f);
        blenderFill.position = field.W(320f, 495f - 22f * fill, -0.72f);
    }

    // ?oiyotest=1 prints the state to the browser console for the automated play check, with a stroke (screen px from
    // the top-left, from and to) through as many fruit as possible and clear of every bee, a moment ahead (the web's
    // chooseSwipe).
    bool testLog; float testT, botNext;
    Vector2 Ahead(Flyer f, float dt) => new Vector2(f.p.x + f.v.x * dt, f.p.y + f.v.y * dt + Gravity * dt * dt / 2f);
    bool Choose(float dt, float care, out Vector2 a, out Vector2 b)
    {
        a = b = Vector2.zero;
        var fruit = new List<Vector2>(); var bees = new List<Vector2>();
        foreach (var f in flying)
        {
            if (f.cut) continue;
            var p = Ahead(f, dt);
            if (f.bee) bees.Add(p); else if (p.y < 540f && p.x > 10f && p.x < 350f) fruit.Add(p);
        }
        int best = 0;
        Vector2 ba = Vector2.zero, bb = Vector2.zero;
        System.Action<Vector2, Vector2> tryLine = (p, q) =>
        {
            foreach (var be in bees) if (SegDist(be, p, q) < BeeR + Blade + care) return;
            int n = 0;
            foreach (var fp in fruit) if (SegDist(fp, p, q) < FruitR + Blade - 6f) n++;
            if (n > best) { best = n; ba = p; bb = q; }
        };
        for (int i = 0; i < fruit.Count; i++)
        {
            var p = fruit[i];
            for (int k = 0; k < 4; k++)
            {
                float ang = k * Mathf.PI / 4f;
                var d = new Vector2(Mathf.Cos(ang), Mathf.Sin(ang)) * 30f;
                tryLine(p - d, p + d);
            }
            for (int j = i + 1; j < fruit.Count; j++) tryLine(p, fruit[j]);
        }
        a = ba; b = bb;
        return best > 0;
    }
    Vector2 Scr(Vector2 f) { var sp = cam.WorldToScreenPoint(field.W(f.x, f.y, 0f)); return new Vector2(sp.x, Screen.height - sp.y); }
    void TestTick(float dt)
    {
        if (!testLog) return;
        string next = "null";
        if (state == GameState.Playing && !over && t >= botNext && Choose(0.07f, 22f, out Vector2 a, out Vector2 b))
        {
            botNext = t + 0.3f;
            var sa = Scr(a); var sb = Scr(b);
            next = $"[{sa.x:F1},{sa.y:F1},{sb.x:F1},{sb.y:F1}]";
        }
        else if ((testT -= dt) > 0f) return;
        testT = 0.05f;
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"sliced\":{sliced},\"need\":{st.need},\"par\":{st.par},\"hearts\":{hearts},\"next\":{next},\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(1f, 0.57f, 0.17f, 0.97f);
    static readonly Color Dark = new Color(0.1f, 0.11f, 0.12f, 0.9f);
    const string HeartGlyphs = "♥♥♥";

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("Goal {0}", JuiceSwipeStages.All[i].need);

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(1f, 0.93f, 0.85f), U("Juice Swipe"),
                U("Swipe through the fruit tossed into the air to slice it into the blender. Touch a bee and you lose a heart. Slice the goal before the last toss falls."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        var bar = new Rect(8f, 8f, w - 16f, 44f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 18f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>  " + F("Fruit {0}/{1}", sliced, st.need) + "   " + $"<color=#ff6b6b>{HeartGlyphs.Substring(0, Mathf.Max(0, hearts))}</color><color=#ffffff44>{HeartGlyphs.Substring(0, Hearts - Mathf.Max(0, hearts))}</color>", 15, new Color(1f, 0.93f, 0.85f));
        if (OiyoArcade.Button(new Rect(w - 56f, 12f, 40f, 36f), "<b>II</b>", OiyoScreens.Slate, 16))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap to start"), U("Swipe through the flying fruit!"), 200f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            string detail = won ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : "";
            string body = $"<size=14>{F("{0} fruit · {1} combos", sliced, combo)}</size>";
            int r = OiyoScreens.Result(w, h, Dark, Accent, won, ResultLive, won ? U("Smoothie done!") : hearts <= 0 ? U("Stung by a bee") : U("Not enough fruit"), detail, body,
                won && stageIdx < StageCount - 1 ? U("Next stage") : null, won && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
