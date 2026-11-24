using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Coin Slide 3D: the web Coin Slide (src/components/games/CoinSlide.tsx, src/lib/games/coin-slide.ts) rebuilt in Unity
// on the web's own 360 × 560 px field (OiyoField, y down, the far end at the top). A swipe slides a token (× 3.2 per px,
// at most 1100 px/s) that slows by 600 px/s², knocks other tokens and bounces off sugar-pot posts. It scores 3/2/1 by
// the band it rests in, and drops off the end or the sides. The 30 tables are the web's own (CoinSlideStages.cs).
public class CoinSlidePlayer : MonoBehaviour
{
    const string Slug = "coin-slide";
    const int StageCount = 30;
    const float Token = 14f, PostR = 10f, Friction = 600f, Left = 40f, Right = 320f, Edge = 40f, MaxSpeed = 1100f, Push = 3.2f, Foul = 220f;
    static readonly Vector2 Start = new Vector2(180f, 520f);
    static readonly float[][] Bands = { new[] { 40f, 92f, 3f }, new[] { 92f, 152f, 2f }, new[] { 152f, 220f, 1f } };

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of coin-slide.ts) ----------------
    class Puck { public Vector2 p, v; public bool on; public Transform obj; }
    CoinSlideStages.Level st;
    readonly List<Puck> pucks = new List<Puck>();
    Vector2[] posts;
    int stageIdx, starsWon, thrown;
    bool over, won;

    static int PointsAt(float y) { foreach (var b in Bands) if (y >= b[0] && y < b[1]) return (int)b[2]; return 0; }
    int Score() { int s = 0; foreach (var k in pucks) if (k.on) s += PointsAt(k.p.y); return s; }
    bool Moving() { foreach (var k in pucks) if (k.on && k.v != Vector2.zero) return true; return false; }

    bool Slide(Vector2 v)
    {
        if (over || Moving() || thrown >= st.tokens) return false;
        float sp = v.magnitude;
        if (sp > MaxSpeed) v *= MaxSpeed / sp;
        var k = new Puck { p = Start, v = v, on = true };
        k.obj = Sprite(coinMat, Token * 2.4f, 0.2f);
        pucks.Add(k);
        thrown++;
        return true;
    }

    static bool Collide(Puck a, Puck b)
    {
        var d = b.p - a.p;
        float m = d.magnitude;
        if (m >= Token * 2f || m == 0f) return false;
        var n = d / m;
        float rel = Vector2.Dot(a.v - b.v, n);
        if (rel > 0f) { float j = rel * 0.92f; a.v -= j * n; b.v += j * n; }
        float push = (Token * 2f - m) / 2f;
        a.p -= n * push; b.p += n * push;
        return true;
    }

    // bit 1 knock, 2 post, 4 drop, 8 stop
    int Step(float dt)
    {
        int ev = 0;
        if (over) return 0;
        bool was = Moving();
        for (int s = 0; s < 4; s++)
        {
            float h = dt / 4f;
            foreach (var k in pucks)
            {
                if (!k.on) continue;
                float sp = k.v.magnitude;
                if (sp == 0f) continue;
                float slow = Mathf.Max(0f, sp - Friction * h);
                k.v *= slow / sp;
                if (slow < 2f) k.v = Vector2.zero;
                k.p += k.v * h;
                foreach (var q in posts)
                {
                    var d = k.p - q;
                    float m = d.magnitude;
                    if (m < Token + PostR && m > 0f)
                    {
                        var n = d / m;
                        float vn = Vector2.Dot(k.v, n);
                        if (vn < 0f) { k.v -= 1.8f * vn * n; ev |= 2; }
                        k.p = q + n * (Token + PostR);
                    }
                }
                if (k.p.x < Left - Token * 0.5f || k.p.x > Right + Token * 0.5f || k.p.y < Edge) { k.on = false; k.v = Vector2.zero; ev |= 4; }
            }
            for (int i = 0; i < pucks.Count; i++)
                for (int j = i + 1; j < pucks.Count; j++)
                    if (pucks[i].on && pucks[j].on && Collide(pucks[i], pucks[j])) ev |= 1;
        }
        if (was && !Moving())
        {
            ev |= 8;
            if (thrown >= st.tokens) { over = true; won = Score() >= st.need; }
        }
        return ev;
    }

    int StarsFor()
    {
        if (!won) return 0;
        int s = Score();
        if (s >= st.par) return 3;
        if (s >= Mathf.CeilToInt((st.need + st.par) / 2f)) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    OiyoField field;
    Camera cam;
    Transform root, waiting, aimRing;
    Transform[] guideDots, spare;
    Material coinMat, potMat;
    Bursts sparkle;
    Synth synth;
    bool showStages;
    bool dragging; Vector2 dragFrom, dragTo;
    float keyDeg = -1f, keyPower = 800f;

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(360f, 560f, new Color(0.36f, 0.23f, 0.12f));
        cam = field.Cam;
        OiyoField.Lights(new Color(0.72f, 0.7f, 0.68f), 0.75f, 50f, -25f);
        sparkle = new Bursts(transform, 0.5f);
        synth = new Synth(gameObject);
        coinMat = OiyoField.Sprite("CL/coin");
        coinMat.renderQueue = 3002;
        potMat = OiyoField.Sprite("CL/pot");
        potMat.renderQueue = 3001;
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    Transform Sprite(Material m, float size, float z)
    {
        var q = OiyoField.Quad("Sprite", m, root, size, size);
        q.position = field.W(0f, 0f, -z);
        return q;
    }

    void LoadStage(int i, bool ready = true)
    {
        stageIdx = Mathf.Clamp(i, 0, StageCount - 1);
        StopAllCoroutines();
        st = CoinSlideStages.All[stageIdx];
        posts = new Vector2[st.posts.Length / 2];
        for (int k = 0; k < posts.Length; k++) posts[k] = new Vector2(st.posts[k * 2], st.posts[k * 2 + 1]);
        pucks.Clear();
        thrown = 0; over = false; won = false; starsWon = 0; dragging = false; keyDeg = -1f; botReady = 0.6f;
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Cafe").transform;
        showStages = false;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Animate(0f);
    }

    Transform Slab(string name, Color c, float x, float y, float w, float h, float z, float depth = 0.1f)
    {
        var o = OiyoArcade.Prim(PrimitiveType.Cube, name, OiyoArcade.Lit(c, 0.3f), root).transform;
        o.localScale = new Vector3(OiyoField.U(w), OiyoField.U(h), depth);
        o.position = field.W(x + w / 2f, y + h / 2f, z);
        return o;
    }

    void BuildScene()
    {
        Slab("Rail", new Color(0.77f, 0.49f, 0.2f), Left - 8f, 20f, Right - Left + 16f, 560f, 0.25f, 0.4f);
        Slab("Top", new Color(0.88f, 0.66f, 0.43f), Left, Edge, Right - Left, 560f - Edge, 0.12f);
        var tones = new[] { new Color(1f, 0.85f, 0.66f), new Color(1f, 0.91f, 0.8f), new Color(1f, 0.96f, 0.9f) };
        // the bands, the line and the end strip sit just in front of the table top
        for (int k = 0; k < 3; k++) Slab("Band", tones[k], Left, Bands[k][0], Right - Left, Bands[k][1] - Bands[k][0], 0.04f, 0.02f);
        Slab("Foul", new Color(0.53f, 0.18f, 0.61f), Left, Foul, Right - Left, 3f, 0.02f, 0.02f);
        Slab("End", new Color(0.13f, 0.15f, 0.16f), Left, Edge - 4f, Right - Left, 4f, 0.02f, 0.04f);
        foreach (var q in posts) { var s = Sprite(potMat, 28f, 0.15f); s.position = field.W(q.x, q.y, -0.15f); }
        waiting = Sprite(coinMat, Token * 2.4f, 0.2f);
        guideDots = new Transform[40];
        var dot = OiyoArcade.Glow(new Color(0.13f, 0.15f, 0.16f));
        for (int k = 0; k < guideDots.Length; k++) { guideDots[k] = OiyoArcade.Prim(PrimitiveType.Cube, "Dot", dot, root).transform; guideDots[k].localScale = Vector3.one * OiyoField.U(4f); }
        aimRing = OiyoArcade.Prim(PrimitiveType.Cube, "Stop", OiyoArcade.Glow(new Color(0.13f, 0.15f, 0.16f)), root).transform;
        aimRing.localScale = new Vector3(OiyoField.U(Token * 2f), OiyoField.U(3f), 0.02f);
        spare = new Transform[8];
        for (int k = 0; k < spare.Length; k++) spare[k] = Sprite(coinMat, 18f, 0.1f);
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("coin-slide", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        if (state == GameState.Playing && !over)
        {
            int ev = Step(dt);
            if ((ev & 3) != 0) synth.Tone(700f, 0.04f, Wave.Square, 0.08f);
            if ((ev & 4) != 0) synth.Tone(160f, 0.15f, Wave.Square, 0.1f, 110f, 8f);
            if ((ev & 8) != 0)
            {
                botReady = botClock + 0.4f;
                var last = pucks.Count > 0 ? pucks[pucks.Count - 1] : null;
                if (last != null && last.on && PointsAt(last.p.y) == 3) sparkle.Emit(field.W(last.p.x, last.p.y, -0.5f), new Color(1f, 0.83f, 0.23f), 16, 3f, 0.07f, 0.5f);
                synth.Tone(last != null && last.on && PointsAt(last.p.y) > 0 ? 660f : 330f, 0.1f, Wave.Triangle, 0.12f);
            }
            if (over) End();
        }
        botClock += dt;
        Animate(dt);
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
                    // input is read once per frame: a press starts the swipe, letting go slides the token along it
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (state == GameState.Ready) { state = GameState.Playing; continue; }
                        if (OiyoArcade.OverUi(b.pos) || !field.ToField(b.pos, out Vector2 f)) continue;
                        dragging = true; dragFrom = dragTo = f;
                    }
                    if (dragging)
                    {
                        var held = OiyoArcade.Held();
                        if (held.Count > 0 && field.ToField(held[0].pos, out Vector2 g)) dragTo = g;
                        foreach (var e in OiyoArcade.Ended())
                        {
                            if (field.ToField(e.pos, out Vector2 g2)) dragTo = g2;
                            dragging = false;
                            if ((dragTo - dragFrom).magnitude >= 12f && Slide((dragTo - dragFrom) * Push)) synth.Tone(520f, 0.05f, Wave.Noise, 0.08f, 300f, 12f);
                        }
                        if (held.Count == 0 && dragging) dragging = false;
                    }
                    if (Input.GetKeyDown(KeyCode.LeftArrow)) { if (keyDeg < 0f) keyDeg = 90f; keyDeg = Mathf.Min(120f, keyDeg + 0.5f); }
                    if (Input.GetKeyDown(KeyCode.RightArrow)) { if (keyDeg < 0f) keyDeg = 90f; keyDeg = Mathf.Max(60f, keyDeg - 0.5f); }
                    if (Input.GetKeyDown(KeyCode.UpArrow)) { if (keyDeg < 0f) keyDeg = 90f; keyPower = Mathf.Min(MaxSpeed, keyPower + 8f); }
                    if (Input.GetKeyDown(KeyCode.DownArrow)) { if (keyDeg < 0f) keyDeg = 90f; keyPower = Mathf.Max(100f, keyPower - 8f); }
                    if (Input.GetKeyDown(KeyCode.Space) || confirm)
                    {
                        if (state == GameState.Ready) state = GameState.Playing;
                        else
                        {
                            float d = (keyDeg < 0f ? 90f : keyDeg) * Mathf.Deg2Rad;
                            if (Slide(new Vector2(Mathf.Cos(d), -Mathf.Sin(d)) * keyPower)) synth.Tone(520f, 0.05f, Wave.Noise, 0.08f, 300f, 12f);
                        }
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
            OiyoArcade.Record(Slug, stageIdx, starsWon, Score() * 10, StageCount);
            sparkle.Emit(field.W(180f, 150f, -1f), new Color(1f, 0.85f, 0.25f), 40, 5f, 0.1f, 1f);
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
        field.Fit(56f, 10f, 14f, 20f, 560f);
        foreach (var k in pucks)
        {
            k.obj.gameObject.SetActive(k.on);
            if (k.on) k.obj.position = field.W(k.p.x, k.p.y, -0.2f);
        }
        bool ready = !Moving() && thrown < st.tokens && !over;
        waiting.gameObject.SetActive(ready);
        waiting.position = field.W(Start.x, Start.y, -0.2f);
        Vector2? aim = null;
        if (ready)
        {
            if (dragging) aim = (dragTo - dragFrom) * Push;
            else if (keyDeg >= 0f) aim = new Vector2(Mathf.Cos(keyDeg * Mathf.Deg2Rad), -Mathf.Sin(keyDeg * Mathf.Deg2Rad)) * keyPower;
        }
        float dist = 0f; Vector2 dir = Vector2.up;
        if (aim.HasValue && aim.Value.magnitude > 1f)
        {
            float sp = Mathf.Min(MaxSpeed, aim.Value.magnitude);
            dist = sp * sp / (2f * Friction);
            dir = aim.Value.normalized;
        }
        for (int k = 0; k < guideDots.Length; k++)
        {
            float d = 20f + k * 14f;
            bool on = aim.HasValue && d < dist;
            guideDots[k].gameObject.SetActive(on);
            if (on) guideDots[k].position = field.W(Start.x + dir.x * d, Start.y + dir.y * d, -0.1f);
        }
        aimRing.gameObject.SetActive(aim.HasValue && dist > 0f);
        if (aim.HasValue) aimRing.position = field.W(Start.x + dir.x * dist, Start.y + dir.y * dist + Token, -0.1f);
        for (int k = 0; k < spare.Length; k++)
        {
            bool on = k < st.tokens - thrown - (ready ? 1 : 0);
            spare[k].gameObject.SetActive(on);
            spare[k].position = field.W(18f, 540f - k * 22f, -0.1f);
        }
    }

    // ?oiyotest=1 prints the state to the browser console for the automated play check, with the swipe (screen px from
    // the top-left, from and to) that stops a token deep in the 3 band on the first lane clear of posts and tokens.
    bool testLog; float testT, botReady, botClock;
    // the web's pickTarget: the 3 band, then the 2 band, then the 1 band, lanes from the middle outward
    static readonly float[] TargetYs = { 66f, 122f, 186f };
    Vector2 PickTarget()
    {
        foreach (float ty in TargetYs)
            for (int k = 0; k < 13; k++)
            {
                float x = 180f + (k % 2 == 1 ? 1 : -1) * Mathf.Ceil(k / 2f) * 18f;
                bool blocked = false;
                foreach (var q in posts) blocked |= Blocks(q, PostR, x, ty);
                foreach (var pk in pucks) if (pk.on) blocked |= Blocks(pk.p, Token, x, ty);
                if (!blocked) return new Vector2(x, ty);
            }
        return new Vector2(180f, 186f);
    }
    static bool Blocks(Vector2 o, float r, float x, float ty)
    {
        if (o.y < ty - Token * 2f || o.y > Start.y) return false;
        float f = Mathf.Min(1f, (Start.y - o.y) / (Start.y - ty));
        float lx = Start.x + (x - Start.x) * f;
        return Mathf.Abs(o.x - lx) < Token + r + 4f;
    }
    Vector2 Scr(Vector2 f) { var sp = cam.WorldToScreenPoint(field.W(f.x, f.y, 0f)); return new Vector2(sp.x, Screen.height - sp.y); }
    void TestTick(float dt)
    {
        if (!testLog) return;
        if ((testT -= dt) > 0f) return;
        testT = 0.05f;
        string next = "null";
        if (state == GameState.Playing && !over && !Moving() && thrown < st.tokens && botClock >= botReady)
        {
            var target = PickTarget();
            var d = target - Start;
            var v = d.normalized * Mathf.Sqrt(2f * Friction * d.magnitude);
            var from = new Vector2(180f, 500f);
            var to = from + v / Push;
            var a = Scr(from); var b = Scr(to);
            next = $"[{a.x:F1},{a.y:F1},{b.x:F1},{b.y:F1}]";
        }
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"thrown\":{thrown},\"of\":{st.tokens},\"score\":{Score()},\"need\":{st.need},\"par\":{st.par},\"next\":{next},\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.99f, 0.77f, 0.1f, 0.97f);
    static readonly Color Dark = new Color(0.1f, 0.11f, 0.12f, 0.9f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("Goal {0}", CoinSlideStages.All[i].need);

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(1f, 0.95f, 0.85f), U("Coin Slide"),
                U("Swipe up to slide tokens along the café table. Stop right at the edge for 3, but slide too hard and they drop off. Reach the goal with your tokens."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        // each band's points, at its left end
        foreach (var b in Bands)
        {
            var p = OiyoArcade.ToGui(cam.WorldToScreenPoint(field.W(Left + 14f, (b[0] + b[1]) / 2f, -0.1f)));
            OiyoArcade.Text(new Rect(p.x - 16f, p.y - 14f, 32f, 28f), ((int)b[2]).ToString(), 18, new Color(0.65f, 0.38f, 0.1f), TextAnchor.MiddleCenter, true);
        }
        var bar = new Rect(8f, 8f, w - 16f, 44f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 18f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>  " + F("Goal {0}", st.need) + "   " + F("Points {0}", Score()) + "   " + F("Tokens {0}", st.tokens - thrown), 15, new Color(1f, 0.95f, 0.85f));
        if (OiyoArcade.Button(new Rect(w - 56f, 12f, 40f, 36f), "<b>II</b>", OiyoScreens.Slate, 16))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap to start"), U("Swipe up to slide the token!"), 200f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            string detail = won ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : "";
            string body = $"<size=14>{F("{0} points", Score())}</size>";
            int r = OiyoScreens.Result(w, h, Dark, Accent, won, ResultLive, won ? U("Goal reached!") : U("Not enough points"), detail, body,
                won && stageIdx < StageCount - 1 ? U("Next stage") : null, won && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
