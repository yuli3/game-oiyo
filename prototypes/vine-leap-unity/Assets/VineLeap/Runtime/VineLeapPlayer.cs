using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Vine Leap 3D: the web Vine Leap (src/components/games/VineLeap.tsx, src/lib/games/vine-leap.ts) rebuilt in Unity on
// the web's own 360 × 560 px field (OiyoField), scrolling sideways. Hold to grab the nearest vine ahead and swing; let
// go to fly. Leap from vine to vine across the river, picking bananas on the way. The physics runs on the web's fixed
// 1/120 s steps; the 30 courses are the web's own (VineLeapStages.cs).
public class VineLeapPlayer : MonoBehaviour
{
    const string Slug = "vine-leap";
    const int StageCount = 30, Hearts = 3;
    const float Gravity = 900f, DT = 1f / 120f, Reach = 170f, BananaR = 22f, River = 540f;
    static readonly float[] Launch = { 60f, 400f, 250f, -480f };

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of vine-leap.ts) ----------------
    VineLeapStages.Level st;
    int stageIdx, starsWon, nHooks, nBananas, hook, lastHook, bananas, hearts, falls;
    float t, x, y, vx, vy, len;
    bool[] got;
    bool over, won;

    float HX(int k) => st.hooks[2 * k];
    float HY(int k) => st.hooks[2 * k + 1];

    int VineFor()
    {
        int best = -1;
        float bestD = Reach;
        for (int k = 0; k < nHooks; k++)
        {
            if (HX(k) < x - 30f) continue;
            float d = Mathf.Sqrt((HX(k) - x) * (HX(k) - x) + (HY(k) - y) * (HY(k) - y));
            if (d < bestD) { bestD = d; best = k; }
        }
        return best;
    }

    bool Hold()
    {
        if (over || hook >= 0) return false;
        int k = VineFor();
        if (k < 0) return false;
        hook = k; lastHook = k;
        len = Mathf.Max(50f, Mathf.Sqrt((HX(k) - x) * (HX(k) - x) + (HY(k) - y) * (HY(k) - y)));
        return true;
    }

    bool LetGo() { if (hook < 0) return false; hook = -1; return true; }

    float SwingAngle() => hook < 0 ? 0f : Mathf.Atan2(x - HX(hook), y - HY(hook));

    void Step(out bool banana, out bool splash)
    {
        banana = false; splash = false;
        if (over) return;
        t += DT;
        vy += Gravity * DT;
        x += vx * DT;
        y += vy * DT;
        if (hook >= 0)
        {
            float dx = x - HX(hook), dy = y - HY(hook), d = Mathf.Sqrt(dx * dx + dy * dy);
            if (d > len)
            {
                float nx = dx / d, ny = dy / d;
                x = HX(hook) + nx * len;
                y = HY(hook) + ny * len;
                float outV = vx * nx + vy * ny;
                if (outV > 0f) { vx -= outV * nx; vy -= outV * ny; }
            }
        }
        vx *= 0.9998f;
        vy *= 0.9998f;
        for (int k = 0; k < nBananas; k++)
        {
            float bx = st.bananas[2 * k] - x, by = st.bananas[2 * k + 1] - y;
            if (got[k] || Mathf.Sqrt(bx * bx + by * by) > BananaR) continue;
            got[k] = true; bananas++; banana = true;
        }
        if (x >= st.goal && y < River - 40f) { over = true; won = true; }
        else if (y > River) { splash = true; Splash(); }
    }

    void Splash()
    {
        hearts--; falls++; hook = -1;
        if (hearts <= 0) { over = true; return; }
        if (lastHook < 0) { x = Launch[0]; y = Launch[1]; vx = Launch[2]; vy = Launch[3]; }
        else { x = HX(lastHook) - 60f; y = HY(lastHook) + 140f; vx = 250f; vy = -480f; }
    }

    int StarsFor() => won ? Mathf.Max(1, Mathf.Min(3, bananas) - falls) : 0;

    // ---------------- Scene ----------------
    OiyoField field;
    Camera cam;
    Transform root, world, monkey, rope;
    Transform[] bananaObj;
    Bursts burst;
    Synth synth;
    bool showStages, down;
    int downId = -1;
    float acc, camX;

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(360f, 560f, new Color(0.83f, 0.98f, 0.85f));
        cam = field.Cam;
        OiyoField.Lights(new Color(0.78f, 0.78f, 0.76f), 0.7f, 50f, -25f);
        burst = new Bursts(transform, 0.5f);
        synth = new Synth(gameObject);
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int i, bool ready = true)
    {
        stageIdx = Mathf.Clamp(i, 0, StageCount - 1);
        StopAllCoroutines();
        st = VineLeapStages.All[stageIdx];
        nHooks = st.hooks.Length / 2; nBananas = st.bananas.Length / 2;
        got = new bool[nBananas];
        t = 0f; x = Launch[0]; y = Launch[1]; vx = Launch[2]; vy = Launch[3];
        hook = -1; lastHook = -1; bananas = 0; hearts = Hearts; falls = 0; over = false; won = false; starsWon = 0;
        acc = 0f; down = false; downId = -1; actAt = 0; camX = 0f;
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Jungle").transform;
        showStages = false;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Animate();
    }

    Transform Box(Transform parent, string name, Material m, float bx, float by, float w, float h, float z, float d)
    {
        var o = OiyoArcade.Prim(PrimitiveType.Cube, name, m, parent).transform;
        o.localScale = new Vector3(OiyoField.U(w), OiyoField.U(h), d);
        o.localPosition = field.W(bx, by, z);
        return o;
    }

    void BuildScene()
    {
        Box(root, "Sky", OiyoArcade.Glow(new Color(0.83f, 0.98f, 0.85f)), 180f, 280f, 1200f, 1600f, 0.9f, 0.2f);
        Box(root, "River", OiyoArcade.Lit(new Color(0.3f, 0.67f, 0.97f), 0.5f), 180f, 570f, 1200f, 60f, 0.3f, 0.2f);
        var foam = OiyoArcade.Glow(new Color(0.65f, 0.85f, 1f));
        for (int k = 0; k < 14; k++) Box(root, "Foam", foam, -40f + k * 34f, 546f, 14f, 2f, 0.25f, 0.02f);
        world = new GameObject("World").transform;
        world.SetParent(root, false);
        // tree trunks far behind, a thick canopy overhead, the two banks, the flag
        var trunk = OiyoArcade.Glow(new Color(0.62f, 0.8f, 0.6f));
        for (float tx = 80f; tx < st.goal + 600f; tx += 170f) Box(world, "Trunk", trunk, tx + (Mathf.Abs(tx * 13f) % 50f), 200f, 20f, 800f, 0.85f, 0.05f);
        var leafA = OiyoArcade.Glow(new Color(0.45f, 0.82f, 0.5f));
        var leafB = OiyoArcade.Glow(new Color(0.58f, 0.88f, 0.6f));
        for (float lx = -160f; lx < st.goal + 700f; lx += 36f)
        {
            float hgt = 70f + (Mathf.Abs(lx * 37f) % 60f);
            Box(world, "Canopy", (int)(lx / 36f) % 2 == 0 ? leafA : leafB, lx, -200f + hgt, 46f, 2f * hgt + 260f, 0.75f, 0.05f);
        }
        var bush = OiyoArcade.Lit(new Color(0.25f, 0.7f, 0.33f), 0.2f);
        for (int k = 0; k < 3; k++) Box(world, "Bush", bush, -20f + k * 34f, 404f, 30f, 22f, 0.05f, 0.2f);
        for (int k = 0; k < 6; k++) Box(world, "FarBush", bush, st.goal + 60f + k * 50f, 404f, 34f, 22f, 0.05f, 0.2f);
        var soil = OiyoArcade.Lit(new Color(0.54f, 0.35f, 0.17f), 0.2f);
        var grass = OiyoArcade.Lit(new Color(0.32f, 0.81f, 0.4f), 0.2f);
        Box(world, "Bank", soil, 20f, 490f, 120f, 140f, 0.2f, 0.3f);
        Box(world, "BankGrass", grass, 20f, 417f, 120f, 10f, 0.1f, 0.32f);
        Box(world, "FarBank", soil, st.goal + 200f, 490f, 400f, 140f, 0.2f, 0.3f);
        Box(world, "FarGrass", grass, st.goal + 200f, 417f, 400f, 10f, 0.1f, 0.32f);
        var flag = OiyoArcade.Glow(new Color(0.88f, 0.19f, 0.19f));
        Box(world, "Pole", flag, st.goal + 22f, 386f, 4f, 52f, 0f, 0.05f);
        Box(world, "Flag", flag, st.goal + 33f, 366f, 18f, 12f, 0f, 0.05f);
        // vines from the canopy down to their leafy knots
        var vine = OiyoArcade.Lit(new Color(0.18f, 0.62f, 0.27f), 0.2f);
        var knot = OiyoField.Sprite("VL/knot");
        for (int k = 0; k < nHooks; k++)
        {
            Box(world, "Vine", vine, HX(k), (HY(k) - 200f) / 2f, 4f, HY(k) + 200f, 0f, 0.03f);
            var kq = OiyoField.Quad("Knot", knot, world, 26f, 26f);
            kq.localPosition = field.W(HX(k), HY(k), -0.1f);
        }
        rope = Box(world, "Rope", vine, 0f, 0f, 3f, 10f, -0.15f, 0.03f);
        bananaObj = new Transform[nBananas];
        var banana = OiyoField.Sprite("VL/banana");
        for (int k = 0; k < nBananas; k++) bananaObj[k] = OiyoField.Quad("Banana", banana, world, 24f, 28f);
        monkey = OiyoField.Quad("Monkey", OiyoField.Sprite("VL/monkey"), world, 30f, 30f);
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("vine-leap", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick();
        ReadInput();
        if (state == GameState.Playing && !over)
        {
            acc += dt;
            while (acc >= DT && !over)
            {
                // the play check holds the swing at each planned hold and let-go until the bot has made it
                if (testLog && Due()) { acc = Mathf.Min(acc, DT); break; }
                acc -= DT;
                if (down && hook < 0 && Hold()) synth.Tone(660f, 0.04f, Wave.Triangle, 0.06f);
                Step(out bool banana, out bool splash);
                if (banana) { burst.Emit(world.TransformPoint(field.W(x, y, -0.5f)), new Color(1f, 0.83f, 0.23f), 10, 2f, 0.05f, 0.4f); synth.Tone(988f, 0.06f, Wave.Triangle, 0.1f); }
                if (splash) { burst.Emit(world.TransformPoint(field.W(x, River, -0.5f)), new Color(0.45f, 0.75f, 0.99f), 16, 2.5f, 0.06f, 0.5f); synth.Tone(196f, 0.15f, Wave.Square, 0.08f, 110f); down = false; }
                if (testLog) AdvanceActs();
            }
            if (over) End();
        }
        Animate();
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
                    // input is read once per frame: a held finger grabs, lifting lets go
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (state == GameState.Ready) { state = GameState.Playing; continue; }
                        if (OiyoArcade.OverUi(b.pos)) continue;
                        down = true; downId = b.id;
                    }
                    foreach (var e in OiyoArcade.Ended()) if (e.id == downId) { down = false; downId = -1; if (LetGo()) synth.Tone(440f, 0.04f, Wave.Triangle, 0.06f, 660f); }
                    if (Input.GetKeyDown(KeyCode.Space) || confirm)
                    {
                        if (state == GameState.Ready) state = GameState.Playing;
                        else down = true;
                    }
                    if (down && downId < 0 && !Input.GetKey(KeyCode.Space) && !Input.GetKey(KeyCode.Return)) { down = false; LetGo(); }
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
        down = false;
        if (won)
        {
            state = GameState.Victory;
            OiyoArcade.Record(Slug, stageIdx, starsWon, bananas * 10, StageCount);
            burst.Emit(world.TransformPoint(field.W(x, y, -1f)), new Color(1f, 0.83f, 0.23f), 40, 4f, 0.1f, 1f);
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
        field.Fit(56f, 10f, 0f, 0f, 560f);
        camX = Mathf.Clamp(x - 120f, 0f, Mathf.Max(0f, st.goal + 160f - 360f));
        world.localPosition = new Vector3(-OiyoField.U(camX), 0f, 0f);
        for (int k = 0; k < nBananas; k++)
        {
            bananaObj[k].gameObject.SetActive(!got[k]);
            bananaObj[k].localPosition = field.W(st.bananas[2 * k], st.bananas[2 * k + 1] + Mathf.Sin(Time.time * 3f + k) * 2f, -0.2f);
        }
        rope.gameObject.SetActive(hook >= 0);
        if (hook >= 0)
        {
            float dx = x - HX(hook), dy = y - HY(hook), d = Mathf.Sqrt(dx * dx + dy * dy);
            rope.localPosition = field.W((x + HX(hook)) / 2f, (y + HY(hook)) / 2f, -0.15f);
            rope.localScale = new Vector3(OiyoField.U(3f), OiyoField.U(d), 0.03f);
            rope.localRotation = Quaternion.Euler(0f, 0f, Mathf.Atan2(dx, dy) * Mathf.Rad2Deg);
        }
        monkey.gameObject.SetActive(!(over && !won));
        monkey.localPosition = field.W(x, y, -0.4f);
        float tilt = hook >= 0 ? SwingAngle() * 0.5f : -Mathf.Atan2(vy, Mathf.Max(80f, Mathf.Abs(vx))) * 0.4f;
        monkey.localRotation = Quaternion.Euler(0f, 0f, tilt * Mathf.Rad2Deg);
    }

    // ?oiyotest=1 prints the state to the browser console every frame for the automated play check. When the course's
    // own plan says to hold (or let go), "next" says "down" (or "up") and the swing waits for the bot.
    bool testLog; int actAt;
    bool ActDown(int k) => k % 2 == 0;
    float ActT(int k) => st.plan[4 * (k / 2) + (k % 2)];
    bool Due() => actAt < 2 * (st.plan.Length / 4) && t >= ActT(actAt) - 1e-6f && down != ActDown(actAt);
    void AdvanceActs() { while (actAt < 2 * (st.plan.Length / 4) && t >= ActT(actAt) - 1e-6f && down == ActDown(actAt)) actAt++; }

    void TestTick()
    {
        if (!testLog) return;
        if (state == GameState.Playing && !over) AdvanceActs();
        string nx = "null";
        if (state == GameState.Playing && !over && Due()) nx = ActDown(actAt) ? "\"down\"" : "\"up\"";
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"ev\":{actAt},\"t\":{t:F3},\"bananas\":{bananas},\"falls\":{falls},\"next\":{nx},\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.32f, 0.81f, 0.4f, 0.97f);
    static readonly Color Dark = new Color(0.07f, 0.2f, 0.1f, 0.9f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("Vines {0}", VineLeapStages.All[i].hooks.Length / 2);

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(0.9f, 1f, 0.9f), U("Vine Leap"),
                U("Hold to grab the nearest vine ahead and swing; let go to fly. Leap from vine to vine across the river to the far bank, picking bananas on the way."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        var bar = new Rect(8f, 8f, w - 16f, 44f);
        OiyoArcade.Panel(bar, Dark);
        string heartLine = $"<color=#ff6b6b>{new string('♥', Mathf.Max(0, hearts))}</color><color=#ffffff44>{new string('♥', Hearts - Mathf.Max(0, hearts))}</color>";
        OiyoArcade.Text(new Rect(20f, 18f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>  " + F("Bananas {0}", bananas + "/3") + "  " + heartLine, 15, new Color(0.9f, 1f, 0.9f));
        if (OiyoArcade.Button(new Rect(w - 56f, 12f, 40f, 36f), "<b>II</b>", OiyoScreens.Slate, 16))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap to leap"), U("Hold to swing, let go to fly!"), 120f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            string detail = won ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : "";
            string body = won ? $"<size=14>{F("Across with {0} bananas", bananas)}</size>" : "";
            int r = OiyoScreens.Result(w, h, Dark, Accent, won, ResultLive, won ? U("Made it to the far bank!") : U("Out of hearts"), detail, body,
                won && stageIdx < StageCount - 1 ? U("Next stage") : null, won && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
