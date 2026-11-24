using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Bounce Down 3D: the web Bounce Down (src/components/games/BounceDown.tsx, src/lib/games/bounce-down.ts) rebuilt in
// Unity, as a real 3D candy tower on the web's own 360 × 560 px field (OiyoField). Each floor is a ring of twelve slices
// with a gap; the jelly ball bounces every 0.55 s on the slice under it: over the gap it drops a floor, on a sour slice
// it loses a heart (three). Turn the tower (16 slices a second at most) by swiping, or by holding a side; letting go
// settles it on the nearest slice. Reach the bottom before the clock runs out. The 30 towers are the web's own
// (BounceDownStages.cs).
public class BounceDownPlayer : MonoBehaviour
{
    const string Slug = "bounce-down";
    const int StageCount = 30;
    const int Slices = 12, Hearts = 3;
    const float Period = 0.55f, TurnSpeed = 16f;
    const float CX = 180f, Gap = 120f, R = 120f, FloorTop = 200f;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of bounce-down.ts) ----------------
    struct Floor { public int gap, width; public int[] sour; }
    BounceDownStages.Level st;
    Floor[] floors;
    int stageIdx, starsWon, floor, hearts, target = -1, turn;
    float angle, clock, t;
    bool over, won;

    static float Mod(float a, float n) => ((a % n) + n) % n;
    int Under => Mathf.FloorToInt(Mod(angle, Slices));
    static bool IsGap(Floor f, int s) => Mod(s - f.gap, Slices) < f.width;
    static bool IsSour(Floor f, int s) { foreach (int x in f.sour) if (x == s) return true; return false; }

    void Twist(float slices) { if (over) return; angle += slices; target = -1; }
    void Hold(int dir) { if (over) return; turn = dir; target = -1; }
    void Aim(int slice) { if (over) return; target = slice; turn = 0; }

    // 1 drop, 2 sour, 3 bounce
    int Step(float dt)
    {
        if (over) return 0;
        t += dt;
        if (target >= 0)
        {
            float want = target + 0.5f;
            float d = Mod(want - Mod(angle, Slices) + Slices / 2f, Slices) - Slices / 2f;
            angle += Mathf.Sign(d) * Mathf.Min(Mathf.Abs(d), TurnSpeed * dt);
            if (Mathf.Abs(d) < 0.05f) target = -1;
        }
        else if (turn != 0) angle += turn * TurnSpeed * dt;
        int ev = 0;
        clock -= dt;
        if (clock <= 0f)
        {
            clock += Period;
            var f = floors[floor];
            int s = Under;
            if (IsGap(f, s))
            {
                floor++;
                ev = 1;
                if (floor >= floors.Length) { over = true; won = true; return ev; }
            }
            else if (IsSour(f, s))
            {
                hearts--;
                ev = 2;
                if (hearts <= 0) { over = true; return ev; }
            }
            else ev = 3;
        }
        if (t >= st.limit) over = true;
        return ev;
    }

    int StarsFor()
    {
        if (!won) return 0;
        if (hearts == Hearts && t <= st.par) return 3;
        if (hearts >= Hearts - 1) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    OiyoField field;
    Camera cam;
    Transform root, ball;
    Transform[] rings;
    Material poleMat, sourMat, ballMat, padMat;
    Material[] candy;
    Bursts sparkle;
    Synth synth;
    bool showStages;
    float camFloor, squash;
    static readonly Color[] Candy = { new Color(0.97f, 0.51f, 0.67f), new Color(0.45f, 0.75f, 0.99f), new Color(1f, 0.83f, 0.23f), new Color(0.55f, 0.91f, 0.6f), new Color(0.69f, 0.59f, 0.99f) };

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(360f, 560f, new Color(0.17f, 0.13f, 0.25f));
        cam = field.Cam;
        OiyoField.Lights(new Color(0.6f, 0.6f, 0.65f), 0.8f, 40f, -30f);
        sparkle = new Bursts(transform, 0.5f);
        synth = new Synth(gameObject);
        poleMat = OiyoArcade.Lit(new Color(0.97f, 0.94f, 0.99f), 0.6f);
        sourMat = OiyoArcade.Lit(new Color(0.98f, 0.32f, 0.32f), 0.6f);
        ballMat = OiyoArcade.Lit(new Color(0.9f, 0.6f, 0.97f), 0.8f);
        padMat = OiyoArcade.Lit(new Color(1f, 0.83f, 0.23f), 0.6f);
        candy = new Material[Candy.Length];
        for (int k = 0; k < Candy.Length; k++) candy[k] = OiyoArcade.Lit(Candy[k], 0.6f);
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int i, bool ready = true)
    {
        stageIdx = Mathf.Clamp(i, 0, StageCount - 1);
        StopAllCoroutines();
        st = BounceDownStages.All[stageIdx];
        floors = new Floor[st.count];
        for (int k = 0, p = 0; k < st.count; k++)
        {
            int gap = st.floors[p], width = st.floors[p + 1], n = st.floors[p + 2];
            var sour = new int[n];
            for (int j = 0; j < n; j++) sour[j] = st.floors[p + 3 + j];
            floors[k] = new Floor { gap = gap, width = width, sour = sour };
            p += 3 + n;
        }
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Tower").transform;
        floor = 0; hearts = Hearts; target = -1; turn = 0; angle = 0f; clock = Period; t = 0f;
        over = false; won = false; starsWon = 0; camFloor = 0f; squash = 0f;
        pressing = false; dragMode = false; botFloor = -1; botHold = 0;
        showStages = false;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Animate(0f);
    }

    float FloorY(int k) => FloorTop + k * Gap;

    void BuildScene()
    {
        var pole = OiyoArcade.Prim(PrimitiveType.Cylinder, "Pole", poleMat, root).transform;
        float len = FloorY(floors.Length) - FloorTop + 400f;
        pole.localScale = new Vector3(OiyoField.U(56f), OiyoField.U(len) / 2f, OiyoField.U(56f));
        pole.position = field.W(CX, FloorTop - 200f + len / 2f, 0f);
        rings = new Transform[floors.Length];
        float arc = 2f * Mathf.PI * R / Slices; // wide enough at the rim that neighbouring slices close into a disc
        for (int k = 0; k < floors.Length; k++)
        {
            var ring = new GameObject("Floor").transform;
            ring.SetParent(root, false);
            ring.position = field.W(CX, FloorY(k), 0f);
            for (int s = 0; s < Slices; s++)
            {
                if (IsGap(floors[k], s)) continue;
                var piece = OiyoArcade.Prim(PrimitiveType.Cube, "Slice", IsSour(floors[k], s) ? sourMat : candy[k % candy.Length], ring).transform;
                float a = (s + 0.5f) / Slices * Mathf.PI * 2f;
                piece.localPosition = new Vector3(Mathf.Sin(a) * OiyoField.U(R * 0.62f), 0f, -Mathf.Cos(a) * OiyoField.U(R * 0.62f));
                piece.localRotation = Quaternion.Euler(0f, -a * Mathf.Rad2Deg, 0f);
                piece.localScale = new Vector3(OiyoField.U(arc * 1.04f), OiyoField.U(16f), OiyoField.U(R * 0.76f));
            }
            rings[k] = ring;
        }
        var pad = OiyoArcade.Prim(PrimitiveType.Cylinder, "Pad", padMat, root).transform;
        pad.localScale = new Vector3(OiyoField.U(R * 2.3f), OiyoField.U(8f), OiyoField.U(R * 2.3f));
        pad.position = field.W(CX, FloorY(floors.Length), 0f);
        ball = OiyoArcade.Prim(PrimitiveType.Sphere, "Ball", ballMat, root).transform;
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("bounce-down", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        if (state == GameState.Playing && !over)
        {
            int ev = Step(dt);
            var bp = field.W(CX, FloorY(Mathf.Max(0, floor - 1)), -OiyoField.U(R * 0.62f));
            if (ev == 1) { sparkle.Emit(bp, Candy[(floor - 1 + Candy.Length) % Candy.Length], 16, 3f, 0.08f, 0.5f); synth.Tone(660f, 0.1f, Wave.Triangle, 0.14f, 990f, 8f); }
            if (ev == 2) { sparkle.Emit(field.W(CX, FloorY(floor), -OiyoField.U(R * 0.62f)), new Color(0.98f, 0.32f, 0.32f), 18, 3.5f, 0.09f, 0.5f); synth.Tone(160f, 0.2f, Wave.Square, 0.14f, 90f, 8f); }
            if (ev == 3) { squash = 0.12f; synth.Tone(330f, 0.05f, Wave.Sine, 0.08f, 440f, 12f); }
            if (over) End();
        }
        squash = Mathf.Max(0f, squash - dt);
        camFloor += (floor - camFloor) * Mathf.Min(1f, dt * 8f);
        Animate(dt);
    }

    // a press holds its side turning; once it moves it becomes a swipe; letting go settles on the nearest slice
    bool pressing, dragMode;
    int pressSide;
    float pressX, lastX, pressAngle, dragSum;

    void ReadInput()
    {
        bool confirm = Input.GetKeyDown(KeyCode.Return);
        switch (state)
        {
            case GameState.Ready:
            case GameState.Playing:
                {
                    if (state == GameState.Playing && (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P))) { state = GameState.Paused; return; }
                    // input is read once per frame
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (state == GameState.Ready) { state = GameState.Playing; continue; }
                        if (OiyoArcade.OverUi(b.pos) || !field.ToField(b.pos, out Vector2 f)) continue;
                        pressing = true; dragMode = false;
                        pressX = lastX = f.x; pressAngle = angle; dragSum = 0f;
                        pressSide = f.x < CX ? 1 : -1;
                        Hold(pressSide);
                    }
                    if (pressing)
                    {
                        var held = OiyoArcade.Held();
                        if (held.Count == 0) { pressing = false; if (dragMode) target = -1; turn = 0; Aim(Under); }
                        else if (field.ToField(held[0].pos, out Vector2 g))
                        {
                            if (!dragMode && Mathf.Abs(g.x - pressX) > 12f) { dragMode = true; turn = 0; angle = pressAngle; dragSum = -(g.x - pressX) / 26f; Twist(dragSum); lastX = g.x; }
                            else if (dragMode) { Twist(-(g.x - lastX) / 26f); lastX = g.x; }
                        }
                    }
                    bool l = Input.GetKey(KeyCode.LeftArrow), r = Input.GetKey(KeyCode.RightArrow);
                    if (Input.GetKeyDown(KeyCode.LeftArrow) || Input.GetKeyDown(KeyCode.RightArrow))
                    {
                        if (state == GameState.Ready) state = GameState.Playing;
                        Hold(l ? 1 : -1);
                    }
                    if ((Input.GetKeyUp(KeyCode.LeftArrow) || Input.GetKeyUp(KeyCode.RightArrow)) && !l && !r && !pressing) { turn = 0; Aim(Under); }
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
            OiyoArcade.Record(Slug, stageIdx, starsWon, Mathf.Max(0, Mathf.RoundToInt((st.limit - t) * 10f)), StageCount);
            sparkle.Emit(field.W(CX, FloorY(floors.Length) - 40f, -1f), new Color(1f, 0.85f, 0.25f), 40, 5f, 0.1f, 1f);
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
        float cy = FloorY(0) + camFloor * Gap;
        field.Fit(70f, 10f, 22f, cy - 140f, cy + 260f);
        for (int k = 0; k < rings.Length; k++)
        {
            rings[k].localRotation = Quaternion.Euler(0f, angle / Slices * 360f, 0f);
            rings[k].gameObject.SetActive(k >= floor - 1 && k <= floor + 4);
        }
        float hop = over && won ? 0f : Mathf.Sin(Mathf.PI * Mathf.Clamp01(clock / Period)) * 70f;
        float fall = (camFloor - floor) * Gap;
        float s = 1f - squash * 2f;
        ball.localScale = new Vector3(OiyoField.U(30f / s), OiyoField.U(30f * s), OiyoField.U(30f / s));
        ball.position = field.W(CX, FloorY(floor) - 23f - hop + fall, -OiyoField.U(R * 0.62f));
    }

    // ?oiyotest=1 prints the state to the browser console for the automated play check, with the screen point (px from
    // the top-left) to hold to turn the tower the way a careful spinner would: on each new floor, the short way to the
    // gap, starting just after a bounce so sour slices pass while the ball is in the air; null means let go.
    bool testLog; float testT;
    int botFloor, botHold;
    float botWait;
    Vector2 Scr(float fx, float fy) { var sp = cam.WorldToScreenPoint(field.W(fx, fy, 0f)); return new Vector2(sp.x, Screen.height - sp.y); }
    void TestTick(float dt)
    {
        if (!testLog) return;
        if (state == GameState.Playing && !over)
        {
            if (floor != botFloor) { botFloor = floor; botHold = 0; botWait = t + 0.25f; }
            var f = floors[floor];
            float goal = f.gap + Mathf.Floor((f.width - 1) / 2f) + 0.5f;
            float d = Mod(goal - Mod(angle, Slices) + Slices / 2f, Slices) - Slices / 2f;
            if (botHold == 0)
            {
                if (t >= botWait && !IsGap(f, Under) && clock > Period * 0.7f) botHold = d > 0 ? 1 : -1;
            }
            else if (botHold * d < 0.45f) botHold = 0;
        }
        else botHold = 0;
        if ((testT -= dt) > 0f && state != GameState.Playing) return;
        testT = 0.05f;
        string next = "null";
        if (botHold != 0) { var p = Scr(botHold > 0 ? 40f : 320f, 470f); next = $"[{p.x:F1},{p.y:F1}]"; }
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"t\":{t:F2},\"par\":{st.par},\"limit\":{st.limit},\"floor\":{floor},\"of\":{floors.Length},\"hearts\":{hearts},\"angle\":{angle:F2},\"next\":{next},\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.9f, 0.6f, 0.97f, 0.97f);
    static readonly Color Dark = new Color(0.1f, 0.08f, 0.14f, 0.9f);
    const string HeartGlyphs = "♥♥♥";

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("{0} floors", BounceDownStages.All[i].count);

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(1f, 0.9f, 1f), U("Bounce Down"),
                U("Turn the candy tower so the gap comes under the jelly ball. Dodge the red sour slices and reach the bottom in time."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        var bar = new Rect(8f, 8f, w - 16f, 64f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 12f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>  " + $"{Mathf.Min(floor, floors.Length)}/{floors.Length}" + "   " + F("{0}s", Mathf.Max(0, Mathf.CeilToInt(st.limit - t))) + "   " + $"<color=#ff6b6b>{HeartGlyphs.Substring(0, Mathf.Max(0, hearts))}</color><color=#ffffff44>{HeartGlyphs.Substring(0, Hearts - Mathf.Max(0, hearts))}</color>", 15, new Color(1f, 0.9f, 1f));
        OiyoArcade.Bar(new Rect(20f, 40f, w - 100f, 12f), floor / (float)floors.Length, new Color(0.2f, 0.17f, 0.27f), new Color(0.9f, 0.6f, 0.97f));
        if (OiyoArcade.Button(new Rect(w - 60f, 14f, 44f, 44f), "<b>II</b>", OiyoScreens.Slate, 18))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap to start"), U("Swipe sideways, or hold a side, to turn the tower!"), 140f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            string detail = won ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : "";
            string body = $"<size=14>{F("{0}/{1} floors · {2}s", Mathf.Min(floor, floors.Length), floors.Length, Mathf.CeilToInt(t))}</size>";
            int r = OiyoScreens.Result(w, h, Dark, Accent, won, ResultLive, won ? U("You reached the bottom!") : hearts <= 0 ? U("Out of hearts") : U("Time's up"), detail, body,
                won && stageIdx < StageCount - 1 ? U("Next stage") : null, won && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
