using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Beaver Chop 3D: the web Beaver Chop (src/components/games/BeaverChop.tsx, src/lib/games/beaver-chop.ts) rebuilt in
// Unity on the web's own 360 × 560 px field (OiyoField). Tap a side: the beaver hops there and bites off the bottom log,
// and the tree drops a log. Walk into a branch, or let one drop on your head, and lose a heart (the branch snaps; a
// heart comes back every 20 logs). Each bite puts 0.32 s on a 6 s clock that drains faster and faster. The 30 trees
// are the web's own (BeaverChopStages.cs).
public class BeaverChopPlayer : MonoBehaviour
{
    const string Slug = "beaver-chop";
    const int StageCount = 30;
    const int Hearts = 3, HealEvery = 20;
    const float ClockMax = 6f, BiteTime = 0.32f;
    const float TX = 180f, TW = 64f, LOG = 58f, BASE = 470f;
    const int Shown = 7; // logs drawn: the tree's top stays below the clock

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of beaver-chop.ts) ----------------
    BeaverChopStages.Level st;
    int stageIdx, starsWon, at, side = -1, chopped, hearts, hits;
    float clock, t;
    readonly HashSet<int> snapped = new HashSet<int>();
    bool over, won;

    int BranchAt(int up)
    {
        int i = at + up;
        if (i >= st.branches.Length || snapped.Contains(i)) return 0;
        return st.branches[i];
    }

    void Bonk()
    {
        hearts--;
        hits++;
        if (hearts <= 0) over = true;
    }

    // bit 1 chopped, bit 2 bonked
    int Chop(int s)
    {
        if (over) return 0;
        int ev = 0;
        side = s;
        if (BranchAt(0) == s) { snapped.Add(at); Bonk(); ev |= 2; if (over) return ev; }
        at++;
        chopped++;
        clock = Mathf.Min(ClockMax, clock + BiteTime);
        if (chopped % HealEvery == 0 && hearts < Hearts) hearts++;
        ev |= 1;
        if (BranchAt(0) == s) { snapped.Add(at); Bonk(); ev |= 2; }
        if (!over && chopped >= st.target) { over = true; won = true; }
        return ev;
    }

    void Step(float dt)
    {
        if (over) return;
        t += dt;
        clock -= (st.drain + st.ramp * chopped) * dt;
        if (clock <= 0f) { clock = 0f; over = true; }
    }

    int StarsFor()
    {
        if (!won) return 0;
        if (hits == 0) return 3;
        if (hits <= 2) return 2;
        return 1;
    }

    int SafeSide()
    {
        int here = BranchAt(0), next = BranchAt(1);
        if (next != 0) return -next;
        if (here != 0) return -here;
        return side;
    }

    // ---------------- Scene ----------------
    OiyoField field;
    Camera cam;
    Transform root, beaver;
    Transform[] logs, branches, leaves;
    Renderer[] branchR;
    Material barkA, barkB, branchMat, leafMat, clockBack, clockFill, clockLow;
    Transform clockBar;
    Renderer clockR;
    readonly List<(Transform tr, Vector3 v, float life)> chips = new List<(Transform, Vector3, float)>();
    Bursts sparkle;
    Synth synth;
    bool showStages;
    float bite, flash;

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(360f, 560f, new Color(0.77f, 0.96f, 0.98f));
        cam = field.Cam;
        OiyoField.Lights(new Color(0.72f, 0.72f, 0.72f), 0.75f, 45f, -30f);
        sparkle = new Bursts(transform, 0.5f);
        synth = new Synth(gameObject);
        barkA = OiyoArcade.Lit(new Color(0.54f, 0.35f, 0.17f), 0.25f);
        barkB = OiyoArcade.Lit(new Color(0.61f, 0.42f, 0.24f), 0.25f);
        branchMat = OiyoArcade.Lit(new Color(0.42f, 0.27f, 0.14f), 0.25f);
        leafMat = OiyoField.Sprite("BC/leaves");
        leafMat.renderQueue = 3001;
        clockBack = OiyoArcade.Lit(new Color(0.2f, 0.23f, 0.25f), 0.2f);
        clockFill = OiyoArcade.Glow(new Color(0.99f, 0.77f, 0.1f));
        clockLow = OiyoArcade.Glow(new Color(0.98f, 0.32f, 0.32f));
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int i, bool ready = true)
    {
        stageIdx = Mathf.Clamp(i, 0, StageCount - 1);
        StopAllCoroutines();
        st = BeaverChopStages.All[stageIdx];
        at = 0; side = -1; chopped = 0; hearts = Hearts; hits = 0; clock = ClockMax * 0.6f; t = 0f;
        snapped.Clear(); over = false; won = false; starsWon = 0; bite = 0f; flash = 0f;
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Forest").transform;
        chips.Clear();
        showStages = false;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Animate(0f);
    }

    void BuildScene()
    {
        var hill = OiyoArcade.Lit(new Color(0.55f, 0.91f, 0.6f), 0.1f);
        for (int k = 0; k < 6; k++)
        {
            var b = OiyoArcade.Prim(PrimitiveType.Sphere, "Bush", hill, root).transform;
            b.localScale = new Vector3(OiyoField.U(110f), OiyoField.U(140f), 0.6f);
            b.position = field.W(-10f + k * 75f, 330f + (k % 3) * 14f, 1.4f);
        }
        var ground = OiyoArcade.Prim(PrimitiveType.Cube, "Ground", OiyoArcade.Lit(new Color(0.41f, 0.86f, 0.49f), 0.1f), root).transform;
        ground.localScale = new Vector3(OiyoField.U(420f), OiyoField.U(100f), 2f);
        ground.position = field.W(180f, BASE + 50f, 0.6f);
        logs = new Transform[Shown]; branches = new Transform[Shown]; leaves = new Transform[Shown]; branchR = new Renderer[Shown];
        for (int k = 0; k < Shown; k++)
        {
            logs[k] = OiyoArcade.Prim(PrimitiveType.Cylinder, "Log", k % 2 == 1 ? barkB : barkA, root).transform;
            logs[k].localScale = new Vector3(OiyoField.U(TW), OiyoField.U(LOG) / 2f, OiyoField.U(TW));
            branches[k] = OiyoArcade.Prim(PrimitiveType.Cube, "Branch", branchMat, root).transform;
            branches[k].localScale = new Vector3(OiyoField.U(78f), OiyoField.U(12f), OiyoField.U(14f));
            branchR[k] = branches[k].GetComponent<Renderer>();
            leaves[k] = OiyoField.Quad("Leaves", leafMat, root, 34f, 30f);
        }
        var beaverMat = OiyoField.Sprite("BC/beaver");
        beaverMat.renderQueue = 3002;
        beaver = OiyoField.Quad("Beaver", beaverMat, root, 64f, 64f);
        var back = OiyoArcade.Prim(PrimitiveType.Cube, "ClockBack", clockBack, root).transform;
        back.localScale = new Vector3(OiyoField.U(280f), OiyoField.U(18f), 0.1f);
        back.position = field.W(180f, 25f, -1.4f);
        clockR = OiyoArcade.Prim(PrimitiveType.Cube, "Clock", clockFill, root).GetComponent<Renderer>();
        clockBar = clockR.transform;
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("beaver-chop", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        if (state == GameState.Playing && !over)
        {
            Step(dt);
            if (over) End();
        }
        bite = Mathf.Max(0f, bite - dt * 8f);
        flash = Mathf.Max(0f, flash - dt);
        Animate(dt);
    }

    void Press(int s)
    {
        if (state != GameState.Playing || over) return;
        int ev = Chop(s);
        if ((ev & 1) != 0)
        {
            bite = 1f;
            var chip = OiyoArcade.Prim(PrimitiveType.Cylinder, "Chip", barkA, root).transform;
            chip.localScale = new Vector3(OiyoField.U(TW), OiyoField.U(LOG) / 4f, OiyoField.U(TW));
            chip.position = field.W(TX, BASE - LOG / 2f, -0.2f);
            chips.Add((chip, new Vector3(-s * 6f, 3f, -1f), 0.7f));
            sparkle.Emit(field.W(TX + s * TW * 0.5f, BASE - 20f, -0.6f), new Color(0.85f, 0.63f, 0.4f), 6, 2.5f, 0.06f, 0.3f);
            synth.Tone(300f + Random.Range(0f, 60f), 0.05f, Wave.Noise, 0.12f, 200f, 14f);
        }
        if ((ev & 2) != 0) { flash = 0.4f; synth.Tone(160f, 0.2f, Wave.Square, 0.14f, 90f, 8f); }
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
                    // input is read once per frame: each tap chops from its half of the screen
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (state == GameState.Ready) { state = GameState.Playing; continue; }
                        if (OiyoArcade.OverUi(b.pos) || !field.ToField(b.pos, out Vector2 f)) continue;
                        Press(f.x < TX ? -1 : 1);
                    }
                    if (Input.GetKeyDown(KeyCode.LeftArrow)) { if (state == GameState.Ready) state = GameState.Playing; Press(-1); }
                    if (Input.GetKeyDown(KeyCode.RightArrow)) { if (state == GameState.Ready) state = GameState.Playing; Press(1); }
                    if (state == GameState.Ready && (confirm || Input.GetKeyDown(KeyCode.Space))) state = GameState.Playing;
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
            OiyoArcade.Record(Slug, stageIdx, starsWon, Mathf.Max(0, Mathf.RoundToInt(clock * 100f)), StageCount);
            sparkle.Emit(field.W(TX, 200f, -1f), new Color(1f, 0.85f, 0.25f), 40, 5f, 0.1f, 1f);
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
        field.Fit(60f, 10f, 8f, 10f, 540f);
        for (int k = 0; k < Shown; k++)
        {
            float y = BASE - (k + 0.5f) * LOG - bite * LOG * 0.4f;
            logs[k].position = field.W(TX, y, 0f);
            int b = BranchAt(k);
            branches[k].gameObject.SetActive(b != 0);
            leaves[k].gameObject.SetActive(b != 0);
            if (b != 0)
            {
                branches[k].position = field.W(TX + b * (TW / 2f + 39f), y, -0.05f);
                leaves[k].position = field.W(TX + b * (TW / 2f + 82f), y - 8f, -0.4f);
            }
        }
        float bx = side < 0 ? TX - TW / 2f - 40f : TX + TW / 2f + 40f;
        beaver.position = field.W(bx + (bite > 0f ? -side * 6f : 0f), BASE - 30f, -0.5f);
        // the sprite shader draws both faces, so a mirrored scale turns the beaver to face the trunk from the right
        beaver.localScale = new Vector3(OiyoField.U(64f) * (side > 0 ? -1f : 1f), OiyoField.U(64f), 1f);
        float f = Mathf.Clamp01(clock / ClockMax);
        clockR.sharedMaterial = f < 0.25f ? clockLow : clockFill;
        clockBar.localScale = new Vector3(OiyoField.U(Mathf.Max(1f, 274f * f)), OiyoField.U(12f), 0.12f);
        clockBar.position = field.W(43f + 274f * f / 2f, 25f, -1.5f);
        for (int k = chips.Count - 1; k >= 0; k--)
        {
            var (tr, v, life) = chips[k];
            v.y -= 25f * dt;
            tr.position += v * dt;
            tr.Rotate(0f, 0f, 300f * dt);
            life -= dt;
            if (life <= 0f) { Destroy(tr.gameObject); chips.RemoveAt(k); }
            else chips[k] = (tr, v, life);
        }
    }

    // ?oiyotest=1 prints the state to the browser console for the automated play check, with the screen point (px from
    // the top-left) to tap for the safe side: away from the branch on the log just above, else away from the one here.
    bool testLog; float testT;
    void TestTick(float dt)
    {
        if (!testLog) return;
        if ((testT -= dt) > 0f) return;
        testT = 0.03f;
        string next = "null";
        if (state == GameState.Playing && !over)
        {
            var sp = cam.WorldToScreenPoint(field.W(SafeSide() < 0 ? 60f : 300f, 300f, 0f));
            next = $"[{sp.x:F1},{Screen.height - sp.y:F1}]";
        }
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"chopped\":{chopped},\"target\":{st.target},\"hearts\":{hearts},\"hits\":{hits},\"clock\":{clock:F2},\"next\":{next},\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.54f, 0.35f, 0.17f, 0.97f);
    static readonly Color Dark = new Color(0.1f, 0.11f, 0.12f, 0.9f);
    const string HeartGlyphs = "♥♥♥";

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("{0} logs", BeaverChopStages.All[i].target);

    void OnGUI()
    {
        OiyoArcade.Begin();
        float w = OiyoArcade.W, h = OiyoArcade.H;
        if (flash > 0f) OiyoArcade.Fill(new Rect(0f, 0f, w, h), new Color(0.98f, 0.32f, 0.32f, flash));
        if (state == GameState.Menu)
        {
            if (showStages)
            {
                int pick = OiyoScreens.Stages(w, h, Dark, Accent, Slug, StageCount, U("Choose a stage"), U("Back"), U("Stage"));
                if (pick == -2) showStages = false; else if (pick >= 0) LoadStage(pick);
                return;
            }
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(1f, 0.93f, 0.8f), U("Beaver Chop"),
                U("Tap left or right to gnaw the bottom log. Stand away from the branches, and gnaw every log before the clock runs dry."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        var bar = new Rect(8f, 8f, w - 16f, 44f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 18f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>  " + F("Logs {0}/{1}", chopped, st.target) + "   " + $"<color=#ff6b6b>{HeartGlyphs.Substring(0, Mathf.Max(0, hearts))}</color><color=#ffffff44>{HeartGlyphs.Substring(0, Hearts - Mathf.Max(0, hearts))}</color>", 15, new Color(1f, 0.93f, 0.8f));
        if (OiyoArcade.Button(new Rect(w - 56f, 12f, 40f, 36f), "<b>II</b>", OiyoScreens.Slate, 16))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap to start"), U("Tap left or right to gnaw the tree!"), 330f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            string detail = won ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : "";
            string body = $"<size=14>{F("Logs {0}/{1}", chopped, st.target)}</size>";
            int r = OiyoScreens.Result(w, h, Dark, Accent, won, ResultLive, won ? U("The tree is down!") : hearts <= 0 ? U("Out of hearts") : U("Time's up"), detail, body,
                won && stageIdx < StageCount - 1 ? U("Next stage") : null, won && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
