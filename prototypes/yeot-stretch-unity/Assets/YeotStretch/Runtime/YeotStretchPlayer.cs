using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Yeot Stretch 3D: the web Yeot Taffy Stretch (src/components/games/YeotStretch.tsx, src/lib/games/yeot-stretch.ts)
// rebuilt in Unity. The rules are the web's, in its own px: the taffy hangs 40 px off a peg; dragging
// right stretches it by as much as the finger moves (moving back never shortens it); letting go past
// 280 px folds it (folds +1, back to 40 px). The strain is the pull rate per length (1/s) averaged over
// 0.1 s; past the snap limit rate × heat^0.7 × 0.965^folds it snaps. Heat = exp(−t / cool); below 0.35 it
// sets and the round ends. The 30 stages are the web's own (YeotStretchStages.cs). Keyboard: hold →.
public class YeotStretchPlayer : MonoBehaviour
{
    const string Slug = "yeot-stretch";
    const int StageCount = 30;
    const float L0 = 40f, LFold = 280f, SetTemp = 0.35f, FoldStiff = 0.965f, Smooth = 0.1f, Warn = 0.8f, KeyRate = 1.5f;
    const float PX = 30f, PegX = 34f;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of yeot-stretch.ts) ----------------
    YeotStretchStages.Level stage;
    int stageIdx;
    float t, len, strain;
    bool grabbing, over, won, snapped;
    int folds, starsWon;

    void NewYeot() { t = 0f; len = L0; strain = 0f; grabbing = false; folds = 0; over = false; won = false; snapped = false; }
    float Heat => Mathf.Exp(-t / stage.cool);
    float Limit => stage.rate * Mathf.Pow(Heat, 0.7f) * Mathf.Pow(FoldStiff, folds);

    void Grab() { if (!over) grabbing = true; }
    bool LetGo()
    {
        if (over || !grabbing) return false;
        grabbing = false;
        strain = 0f;
        if (len >= LFold) { folds++; len = L0; return true; }
        return false;
    }

    // returns "snap", "set" or null
    string StepYeot(float dx, float dt)
    {
        if (over) return null;
        t += dt;
        float pull = grabbing ? Mathf.Max(0f, dx) : 0f;
        float rate = dt > 0f ? pull / dt / len : 0f;
        float k = Mathf.Min(1f, dt / Smooth);
        strain += (rate - strain) * k;
        len = Mathf.Min(LFold + 60f, len + pull);
        if (strain > Limit) { over = true; snapped = true; won = false; return "snap"; }
        if (Heat < SetTemp) { over = true; won = folds >= stage.need; return "set"; }
        return null;
    }

    int StarsFor()
    {
        if (!won) return 0;
        if (folds >= stage.need + 2) return 3;
        if (folds >= stage.need + 1) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    Camera cam;
    Transform root, hand, peg, mark;
    readonly List<Transform> rope = new List<Transform>();
    Material handMat, ropeMat, pegMat, boardMat, wallMat, markMat;
    Bursts bursts;
    Synth synth;
    bool showStages;
    const int Segs = 28;
    const float RopeY = 120f; // px above the board

    // web px across (0..360), px up, depth -> world
    static Vector3 P(float xx, float yy, float zz = 0f) => new Vector3((xx - 180f) / PX, yy / PX, zz / PX);

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        cam = new GameObject("Camera").AddComponent<Camera>();
        cam.fieldOfView = 45f; cam.nearClipPlane = 0.1f; cam.farClipPlane = 100f;
        cam.clearFlags = CameraClearFlags.SolidColor;
        cam.backgroundColor = new Color(1f, 0.96f, 0.9f);
        OiyoField.Lights(new Color(0.72f, 0.66f, 0.6f), 0.85f, 40f, -20f);
        bursts = new Bursts(transform, 0.5f);
        synth = new Synth(gameObject);
        handMat = OiyoField.Sprite("YS/hand");
        ropeMat = OiyoArcade.Lit(new Color(0.84f, 0.5f, 0.16f), 0.7f);
        pegMat = OiyoArcade.Lit(Color.white, 0.2f, OiyoArcade.Art("YS/wood", true));
        boardMat = OiyoArcade.Lit(Color.white, 0.25f, OiyoArcade.Art("YS/wood", true));
        wallMat = OiyoArcade.Lit(Color.white, 0.05f, OiyoArcade.Art("YS/hanji", true));
        markMat = OiyoArcade.Lit(new Color(0.18f, 0.62f, 0.27f), 0.3f);
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int idx, bool ready = true)
    {
        stageIdx = Mathf.Clamp(idx, 0, StageCount - 1);
        StopAllCoroutines();
        stage = YeotStretchStages.All[stageIdx];
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Kitchen").transform;
        NewYeot();
        starsWon = 0;
        showStages = false;
        grabId = int.MinValue;
        keyHeld = false;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Animate(0f);
    }

    void BuildScene()
    {
        var wall = OiyoArcade.Prim(PrimitiveType.Quad, "Wall", wallMat, root);
        wall.transform.position = P(180f, 160f, 160f);
        wall.transform.localScale = new Vector3(40f, 24f, 1f);
        var board = OiyoArcade.Prim(PrimitiveType.Cube, "Board", boardMat, root);
        board.transform.position = P(180f, -12f, 30f);
        board.transform.localScale = new Vector3(18f, 0.8f, 5f);
        peg = OiyoArcade.Prim(PrimitiveType.Cylinder, "Peg", pegMat, root).transform;
        peg.position = P(PegX - 6f, RopeY * 0.5f, 0f);
        peg.localScale = new Vector3(0.7f, RopeY * 0.5f / PX + 0.4f, 0.7f);
        mark = OiyoArcade.Prim(PrimitiveType.Cube, "FoldMark", markMat, root).transform;
        mark.position = P(PegX + LFold, RopeY, 6f);
        mark.localScale = new Vector3(0.08f, 6f, 0.08f);
        rope.Clear();
        for (int i = 0; i < Segs; i++)
        {
            var seg = OiyoArcade.Prim(PrimitiveType.Capsule, "Taffy", ropeMat, root).transform;
            rope.Add(seg);
        }
        hand = OiyoField.Quad("Hand", handMat, root, 1f, 1f);
        hand.localScale = new Vector3(1.6f, 1.6f, 1f);
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("yeot-stretch", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        float dx = ReadInput(dt);
        if (state == GameState.Playing)
        {
            string ev = StepYeot(dx, dt);
            if (grabbing && strain > Limit * Warn && (creakT -= dt) <= 0f)
            {
                creakT = 0.35f;
                Toast(U("About to snap!"), new Color(1f, 0.45f, 0.4f));
                synth.Tone(240f, 0.05f, Wave.Square, 0.06f, 300f, 20f);
            }
            if (ev == "snap") bursts.Emit(P(PegX + len * 0.5f, RopeY), new Color(0.95f, 0.6f, 0.2f), 30, 3f, 0.18f, 0.6f);
            if (ev != null) End();
        }
        msgT = Mathf.Max(0f, msgT - dt);
        Animate(dt);
    }
    float creakT;

    string msg = ""; float msgT; Color msgC = Color.white;
    void Toast(string m, Color c) { msg = m; msgT = 0.6f; msgC = c; }

    int grabId = int.MinValue;
    float lastX;
    bool keyHeld;
    // screen px -> the web's px (a drag across a phone screen is about the web canvas width)
    float ToPx(float screenDx) => screenDx * 400f / Mathf.Max(1f, Mathf.Min(Screen.width, Screen.height));

    // The finger is read once per frame: presses, releases, and how far right it moved.
    float ReadInput(float dt)
    {
        bool confirm = Input.GetKeyDown(KeyCode.Return);
        float dx = 0f;
        switch (state)
        {
            case GameState.Ready:
            case GameState.Playing:
                {
                    if (state == GameState.Playing && (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P))) { state = GameState.Paused; LetGo(); grabId = int.MinValue; keyHeld = false; return 0f; }
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (grabId != int.MinValue) continue;
                        if (state == GameState.Ready) state = GameState.Playing;
                        grabId = b.id; lastX = b.pos.x;
                        Grab();
                    }
                    foreach (var hp in OiyoArcade.Held())
                        if (hp.id == grabId) { dx += Mathf.Max(0f, ToPx(hp.pos.x - lastX)); lastX = hp.pos.x; }
                    foreach (var e in OiyoArcade.Ended())
                        if (e.id == grabId)
                        {
                            dx += Mathf.Max(0f, ToPx(e.pos.x - lastX));
                            grabId = int.MinValue;
                            pendingRelease = true;
                        }
                    if (Input.GetKeyDown(KeyCode.RightArrow)) { if (state == GameState.Ready) state = GameState.Playing; keyHeld = true; Grab(); }
                    if (keyHeld && grabbing) dx = KeyRate * len * dt;
                    if (Input.GetKeyUp(KeyCode.RightArrow) && keyHeld) { keyHeld = false; pendingRelease = true; }
                    return dx;
                }
            case GameState.Paused:
                if (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P)) state = GameState.Playing;
                return 0f;
            case GameState.Victory:
            case GameState.GameOver:
                if (confirm && ResultLive) LoadStage(state == GameState.Victory ? Mathf.Min(stageIdx + 1, StageCount - 1) : stageIdx);
                return 0f;
            case GameState.Menu:
                if (!showStages && (confirm || Input.GetKeyDown(KeyCode.Space))) LoadStage(stageIdx);
                return 0f;
        }
        return 0f;
    }
    bool pendingRelease;

    void LateUpdate()
    {
        // a release lands after this frame's pull, as on the web (the move, then the let-go)
        if (!pendingRelease) return;
        pendingRelease = false;
        if (state != GameState.Playing) { grabbing = false; return; }
        if (LetGo())
        {
            Toast(U("Folded! ×2"), new Color(0.55f, 1f, 0.6f));
            bursts.Emit(P(PegX + 20f, RopeY), new Color(1f, 0.95f, 0.75f), 14, 2f, 0.14f, 0.5f);
            synth.Tone(784f, 0.14f, Wave.Triangle, 0.18f, 1175f, 7f);
        }
    }

    float endTime;
    bool ResultLive => Time.unscaledTime - endTime > 0.45f;

    void End()
    {
        if (state != GameState.Playing) return;
        endTime = Time.unscaledTime;
        grabId = int.MinValue; keyHeld = false;
        if (won)
        {
            starsWon = StarsFor();
            state = GameState.Victory;
            OiyoArcade.Record(Slug, stageIdx, starsWon, folds, StageCount);
            StartCoroutine(Arp(new[] { 523f, 659f, 784f, 1047f, 1319f }, 0.09f));
        }
        else
        {
            starsWon = 0;
            state = GameState.GameOver;
            if (snapped) synth.Tone(160f, 0.3f, Wave.Noise, 0.2f, 80f, 8f);
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
        // the taffy: whiter with each fold, thinner as it stretches, sagging when nobody holds it
        float endX = PegX + Mathf.Min(len, 360f - PegX - 10f);
        float sag = grabbing ? 6f : 30f;
        float thick = Mathf.Clamp(1000f / len * (1f + folds * 0.06f), 3f, 16f);
        var col = Color.Lerp(new Color(0.84f, 0.5f, 0.16f), new Color(1f, 0.97f, 0.9f), Mathf.Clamp01(folds / 8f + (1f - Heat) * 0.15f));
        ropeMat.color = col;
        bool visible = !snapped;
        for (int i = 0; i < Segs; i++)
        {
            float a = (float)i / Segs, b = (float)(i + 1) / Segs;
            Vector3 pa = RopePoint(a, endX, sag), pb = RopePoint(b, endX, sag);
            var seg = rope[i];
            seg.gameObject.SetActive(visible || (i < Segs / 2 - 1 || i > Segs / 2 + 1));
            seg.position = (pa + pb) * 0.5f;
            seg.rotation = Quaternion.FromToRotation(Vector3.up, (pb - pa).normalized);
            float th = thick / PX;
            seg.localScale = new Vector3(th, (pb - pa).magnitude * 0.5f + th * 0.25f, th);
        }
        hand.gameObject.SetActive(grabbing && !snapped);
        hand.position = P(endX + 12f, RopeY, -4f);
        // camera: square on to the table, far enough back to see peg and fold mark at any aspect
        float halfH = Mathf.Atan(Mathf.Tan(cam.fieldOfView * 0.5f * Mathf.Deg2Rad) * cam.aspect);
        float dist = Mathf.Max(9f, (13.2f / 2f) / Mathf.Tan(halfH));
        cam.transform.position = P(180f, RopeY + 20f, 0f) + new Vector3(0f, dist * 0.12f, -dist);
        cam.transform.LookAt(P(180f, RopeY - 10f, 0f));
        hand.rotation = cam.transform.rotation;
    }

    Vector3 RopePoint(float u, float endX, float sag)
    {
        float x = Mathf.Lerp(PegX, endX, u);
        float y = RopeY - sag * 4f * u * (1f - u);
        return P(x, y);
    }

    // ?oiyotest=1 prints the state to the browser console for the automated play check.
    bool testLog; float testT;
    void TestTick(float dt)
    {
        if (!testLog || (testT -= dt) > 0f) return;
        testT = 0.02f;
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"t\":{t:F3},\"len\":{len:F1},\"strain\":{strain:F3},\"limit\":{Limit:F3},\"heat\":{Heat:F3},\"grab\":{(grabbing ? 1 : 0)},\"folds\":{folds},\"need\":{stage.need},\"snapped\":{(snapped ? 1 : 0)},\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.85f, 0.45f, 0.1f, 0.97f);
    static readonly Color Dark = new Color(0.25f, 0.15f, 0.08f, 0.86f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("{0} folds", YeotStretchStages.All[i].need);

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(1f, 0.9f, 0.7f), U("Yeot Stretch"),
                U("Drag right to stretch the warm taffy, let go past the mark to fold it. Pull too fast and it snaps."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        var bar = new Rect(8f, 8f, w - 16f, 64f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 12f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>   " + F("Folds {0}/{1}", folds, stage.need), 15, new Color(1f, 0.92f, 0.75f));
        OiyoArcade.Text(new Rect(20f, 36f, w - 90f, 24f), F("{0} strands", 1 << Mathf.Min(folds, 20)), 16, Color.white);
        if (OiyoArcade.Button(new Rect(w - 60f, 14f, 44f, 44f), "<b>II</b>", OiyoScreens.Slate, 18))
        {
            if (state == GameState.Playing) { state = GameState.Paused; LetGo(); grabId = int.MinValue; keyHeld = false; }
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (msgT > 0f) OiyoArcade.Shadowed(new Rect(8f, 80f, w - 16f, 36f), msg, 22, msgC, TextAnchor.MiddleCenter);
        if (state == GameState.Playing || state == GameState.Ready)
        {
            float by = h - 96f;
            OiyoArcade.Shadowed(new Rect(20f, by - 22f, 200f, 20f), U("Heat"), 14, Color.white);
            OiyoArcade.Bar(new Rect(20f, by, w - 40f, 14f), Mathf.Clamp01((Heat - SetTemp) / (1f - SetTemp)), new Color(0f, 0f, 0f, 0.35f), Heat > SetTemp + 0.15f ? new Color(0.97f, 0.4f, 0.03f) : new Color(0.98f, 0.32f, 0.32f));
            float sr = Mathf.Min(1f, strain / Limit);
            OiyoArcade.Shadowed(new Rect(20f, by + 22f, 200f, 20f), U("Strain"), 14, Color.white);
            OiyoArcade.Bar(new Rect(20f, by + 44f, w - 40f, 14f), sr, new Color(0f, 0f, 0f, 0.35f), sr > Warn ? new Color(0.88f, 0.19f, 0.19f) : sr > 0.55f ? new Color(0.96f, 0.62f, 0f) : new Color(0.22f, 0.7f, 0.3f));
        }
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Drag right, let go past the mark"), U("Gently while it is short, faster as it grows. Fold it before it sets."), 230f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            bool w0 = state == GameState.Victory;
            string detail = w0 ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : F("Folds {0}/{1}", folds, stage.need);
            string body = $"<b>{F("{0} folds", folds)}</b>\n<size=14>{F("{0} strands", 1 << Mathf.Min(folds, 20))}</size>";
            int r = OiyoScreens.Result(w, h, Dark, Accent, w0, ResultLive, w0 ? U("All folded before it set!") : snapped ? U("Snap! The taffy broke") : U("The taffy set"), detail, body,
                w0 && stageIdx < StageCount - 1 ? U("Next stage") : null, w0 && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
