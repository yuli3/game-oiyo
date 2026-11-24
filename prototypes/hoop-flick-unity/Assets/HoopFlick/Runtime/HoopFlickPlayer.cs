using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Hoop Flick 3D: the web Hoop Flick (src/components/games/HoopFlick.tsx, src/lib/games/hoop-flick.ts) rebuilt in Unity
// on the web's own 360 × 560 px field (OiyoField, y down). A swipe throws the ball: its direction and length (× 3.2 per
// px, at most 950 px/s) set the velocity. Gravity 1000 px/s²; the ball bounces off the rim points and the backboard and
// scores dropping down through the ring: 2, or 3 for a clean swish. The 30 courts are the web's own (HoopFlickStages.cs).
public class HoopFlickPlayer : MonoBehaviour
{
    const string Slug = "hoop-flick";
    const int StageCount = 30;
    const float Gravity = 1000f, Ball = 12f, Rim = 27f, RimR = 3f, BoardGap = 32f, BoardTop = 74f, MaxSpeed = 950f, FlightMax = 3.2f, Flick = 3.2f;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of hoop-flick.ts) ----------------
    HoopFlickStages.Level st;
    int stageIdx, starsWon, shot, points, makes, swishes, shotCount;
    float t, flight;
    bool flying, touched, over, won;
    Vector2 pos, vel;

    float HoopX(float time) => st.hx + st.amp * Mathf.Sin(st.rate * time);
    Vector2 Spot(int k) => new Vector2(st.shots[k * 2], st.shots[k * 2 + 1]);
    int BoardSide(int k) => Spot(k).x < st.hx ? 1 : -1;

    bool Throw(Vector2 v)
    {
        if (over || flying || shot >= shotCount) return false;
        float sp = v.magnitude;
        if (sp > MaxSpeed) v *= MaxSpeed / sp;
        pos = Spot(shot); vel = v; flying = true; touched = false; flight = 0f;
        return true;
    }

    bool Bounce(float px, float py, float r)
    {
        var d = pos - new Vector2(px, py);
        float m = d.magnitude;
        if (m >= Ball + r || m == 0f) return false;
        var nrm = d / m;
        float vn = Vector2.Dot(vel, nrm);
        if (vn < 0f) vel -= 1.55f * vn * nrm;
        pos = new Vector2(px, py) + nrm * (Ball + r);
        return true;
    }

    // bit 1 swish, 2 score, 4 rim, 8 miss
    int Step(float dt)
    {
        int ev = 0;
        if (over) return 0;
        t += dt;
        if (!flying) return 0;
        bool done = false;
        for (int k = 0; k < 4; k++)
        {
            float h = dt / 4f;
            float py = pos.y;
            vel.y += Gravity * h;
            pos += vel * h;
            float hx = HoopX(t);
            if (py < st.hy && pos.y >= st.hy && vel.y > 0f && Mathf.Abs(pos.x - hx) < Rim - 2f)
            {
                bool clean = !touched;
                points += clean ? 3 : 2; makes++; if (clean) swishes++;
                ev |= clean ? 1 : 2;
                flying = false; done = true;
                break;
            }
            bool hit = Bounce(hx - Rim, st.hy, RimR) | Bounce(hx + Rim, st.hy, RimR);
            float bx = hx + BoardSide(shot) * BoardGap;
            if (pos.y > st.hy - BoardTop - Ball && pos.y < st.hy + 10f + Ball && Mathf.Abs(pos.x - bx) < Ball + 2f)
                hit = Bounce(bx, Mathf.Clamp(pos.y, st.hy - BoardTop, st.hy + 10f), 2f) || hit;
            if (hit && !touched) { touched = true; ev |= 4; }
        }
        if (flying)
        {
            flight += dt;
            if (pos.y > 620f || pos.x < -60f || pos.x > 420f || flight > FlightMax) { flying = false; done = true; ev |= 8; }
        }
        if (done)
        {
            shot++;
            if (shot >= shotCount) { over = true; won = points >= st.need; }
        }
        return ev;
    }

    int StarsFor()
    {
        if (!won) return 0;
        if (points >= st.par) return 3;
        if (points >= Mathf.CeilToInt((st.need + st.par) / 2f)) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    OiyoField field;
    Camera cam;
    Transform root, ball, board, rimBar, rimL, rimR;
    Transform[] net, guideDots, spare;
    Bursts sparkle;
    Synth synth;
    bool showStages;
    float banner; string bannerText;
    bool dragging; Vector2 dragFrom, dragTo;
    float keyDeg = -1f, keyPower = 700f;

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(360f, 560f, new Color(0.91f, 0.96f, 1f));
        cam = field.Cam;
        OiyoField.Lights(new Color(0.72f, 0.72f, 0.72f), 0.75f, 45f, -30f);
        sparkle = new Bursts(transform, 0.5f);
        synth = new Synth(gameObject);
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int i, bool ready = true)
    {
        stageIdx = Mathf.Clamp(i, 0, StageCount - 1);
        StopAllCoroutines();
        st = HoopFlickStages.All[stageIdx];
        shotCount = st.shots.Length / 2;
        shot = 0; points = 0; makes = 0; swishes = 0; t = 0f; flight = 0f; flying = false; touched = false; over = false; won = false; starsWon = 0;
        banner = 0f; dragging = false; keyDeg = -1f; botReady = 0.6f;
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Gym").transform;
        showStages = false;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Animate(0f);
    }

    void BuildScene()
    {
        var floor = OiyoArcade.Prim(PrimitiveType.Cube, "Floor", OiyoArcade.Lit(new Color(0.91f, 0.72f, 0.49f), 0.3f), root).transform;
        floor.localScale = new Vector3(OiyoField.U(420f), OiyoField.U(200f), 0.3f);
        floor.position = field.W(180f, 480f, 0.4f);
        var wall = OiyoArcade.Prim(PrimitiveType.Cube, "Wall", OiyoArcade.Lit(new Color(0.82f, 0.92f, 1f), 0.1f), root).transform;
        wall.localScale = new Vector3(OiyoField.U(420f), OiyoField.U(400f), 0.1f);
        wall.position = field.W(180f, 180f, 1.2f);
        board = OiyoArcade.Prim(PrimitiveType.Cube, "Board", OiyoArcade.Lit(new Color(0.97f, 0.98f, 0.98f), 0.5f), root).transform;
        board.localScale = new Vector3(OiyoField.U(6f), OiyoField.U(BoardTop + 10f), OiyoField.U(70f));
        var orange = OiyoArcade.Lit(new Color(0.91f, 0.35f, 0.05f), 0.6f, null, 0.3f);
        rimBar = OiyoArcade.Prim(PrimitiveType.Cylinder, "Rim", orange, root).transform;
        rimBar.localScale = new Vector3(OiyoField.U(4f), OiyoField.U(Rim), OiyoField.U(4f));
        rimBar.rotation = Quaternion.Euler(0f, 0f, 90f);
        rimL = OiyoArcade.Prim(PrimitiveType.Sphere, "RimL", orange, root).transform;
        rimR = OiyoArcade.Prim(PrimitiveType.Sphere, "RimR", orange, root).transform;
        rimL.localScale = rimR.localScale = Vector3.one * OiyoField.U(RimR * 2.4f);
        net = new Transform[5];
        var white = OiyoArcade.Lit(Color.white, 0.2f);
        for (int k = 0; k < 5; k++) { net[k] = OiyoArcade.Prim(PrimitiveType.Cube, "Net", white, root).transform; net[k].localScale = new Vector3(OiyoField.U(Rim * 2f - 8f - k * 4f), OiyoField.U(2f), 0.02f); }
        ball = OiyoArcade.Prim(PrimitiveType.Sphere, "Ball", OiyoArcade.Lit(new Color(0.97f, 0.4f, 0.03f), 0.5f), root).transform;
        ball.localScale = Vector3.one * OiyoField.U(Ball * 2f);
        guideDots = new Transform[14];
        var dot = OiyoArcade.Glow(new Color(0.53f, 0.56f, 0.59f));
        for (int k = 0; k < guideDots.Length; k++) { guideDots[k] = OiyoArcade.Prim(PrimitiveType.Cube, "Dot", dot, root).transform; guideDots[k].localScale = Vector3.one * OiyoField.U(4f); }
        spare = new Transform[12];
        for (int k = 0; k < spare.Length; k++) { spare[k] = OiyoArcade.Prim(PrimitiveType.Sphere, "Spare", OiyoArcade.Lit(new Color(0.97f, 0.4f, 0.03f), 0.5f), root).transform; spare[k].localScale = Vector3.one * OiyoField.U(12f); }
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("hoop-flick", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        if (state == GameState.Playing && !over)
        {
            int was = shot;
            int ev = Step(dt);
            float hx = HoopX(t);
            if ((ev & 1) != 0) { sparkle.Emit(field.W(hx, st.hy + 10f, -0.6f), new Color(1f, 0.83f, 0.23f), 24, 4f, 0.08f, 0.6f); synth.Tone(880f, 0.15f, Wave.Triangle, 0.15f, 1320f, 8f); banner = 0.9f; bannerText = "+3"; }
            if ((ev & 2) != 0) { sparkle.Emit(field.W(hx, st.hy + 10f, -0.6f), Color.white, 12, 3f, 0.07f, 0.5f); synth.Tone(660f, 0.12f, Wave.Triangle, 0.12f, 880f, 8f); banner = 0.9f; bannerText = "+2"; }
            if ((ev & 4) != 0) synth.Tone(300f, 0.05f, Wave.Square, 0.08f);
            if ((ev & 8) != 0) synth.Tone(160f, 0.15f, Wave.Square, 0.1f, 110f, 8f);
            if (shot != was) botReady = t + 0.5f;
            if (over) End();
        }
        banner = Mathf.Max(0f, banner - dt);
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
                    // input is read once per frame: a press starts the swipe, letting go throws along it
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
                            if ((dragTo - dragFrom).magnitude >= 12f && Throw((dragTo - dragFrom) * Flick)) synth.Tone(520f, 0.05f, Wave.Sine, 0.08f, 700f, 12f);
                        }
                        if (held.Count == 0 && dragging) dragging = false;
                    }
                    int toward = shot < shotCount && Spot(shot).x > st.hx ? 110 : 70;
                    if (Input.GetKeyDown(KeyCode.LeftArrow)) { if (keyDeg < 0f) keyDeg = toward; keyDeg = Mathf.Min(170f, keyDeg + 1f); }
                    if (Input.GetKeyDown(KeyCode.RightArrow)) { if (keyDeg < 0f) keyDeg = toward; keyDeg = Mathf.Max(10f, keyDeg - 1f); }
                    if (Input.GetKeyDown(KeyCode.UpArrow)) { if (keyDeg < 0f) keyDeg = toward; keyPower = Mathf.Min(MaxSpeed, keyPower + 10f); }
                    if (Input.GetKeyDown(KeyCode.DownArrow)) { if (keyDeg < 0f) keyDeg = toward; keyPower = Mathf.Max(100f, keyPower - 10f); }
                    if (Input.GetKeyDown(KeyCode.Space) || confirm)
                    {
                        if (state == GameState.Ready) state = GameState.Playing;
                        else
                        {
                            float d = (keyDeg < 0f ? toward : keyDeg) * Mathf.Deg2Rad;
                            if (Throw(new Vector2(Mathf.Cos(d), -Mathf.Sin(d)) * keyPower)) { synth.Tone(520f, 0.05f, Wave.Sine, 0.08f, 700f, 12f); keyDeg = -1f; }
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
            OiyoArcade.Record(Slug, stageIdx, starsWon, points * 10 + swishes, StageCount);
            sparkle.Emit(field.W(180f, 200f, -1f), new Color(1f, 0.85f, 0.25f), 40, 5f, 0.1f, 1f);
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
        field.Fit(56f, 10f, 0f, 40f, 560f);
        float hx = HoopX(t);
        int side = BoardSide(Mathf.Min(shot, shotCount - 1));
        board.position = field.W(hx + side * BoardGap, st.hy - BoardTop / 2f + 5f, 0.3f);
        rimBar.position = field.W(hx, st.hy, 0f);
        rimL.position = field.W(hx - Rim, st.hy, 0f);
        rimR.position = field.W(hx + Rim, st.hy, 0f);
        for (int k = 0; k < net.Length; k++) net[k].position = field.W(hx, st.hy + 6f + k * 6f, 0.05f);
        bool show = flying || shot < shotCount;
        ball.gameObject.SetActive(show);
        var bp = flying ? pos : (shot < shotCount ? Spot(shot) : Vector2.zero);
        ball.position = field.W(bp.x, bp.y, -0.2f);
        if (flying) ball.Rotate(0f, 0f, -vel.x * dt * 2f);
        // the guide: where the throw would go (no bounces)
        Vector2? aim = null;
        if (!flying && shot < shotCount)
        {
            if (dragging) aim = (dragTo - dragFrom) * Flick;
            else if (keyDeg >= 0f) aim = new Vector2(Mathf.Cos(keyDeg * Mathf.Deg2Rad), -Mathf.Sin(keyDeg * Mathf.Deg2Rad)) * keyPower;
        }
        for (int k = 0; k < guideDots.Length; k++)
        {
            guideDots[k].gameObject.SetActive(aim.HasValue);
            if (!aim.HasValue) continue;
            var v = aim.Value;
            if (v.magnitude > MaxSpeed) v *= MaxSpeed / v.magnitude;
            float tt = (k + 1) * 0.07f;
            guideDots[k].position = field.W(bp.x + v.x * tt, bp.y + v.y * tt + Gravity * tt * tt / 2f, -0.3f);
        }
        for (int k = 0; k < spare.Length; k++)
        {
            bool on = k < shotCount - shot - 1;
            spare[k].gameObject.SetActive(on);
            spare[k].position = field.W(20f + k * 26f, 540f, -0.1f);
        }
    }

    // ?oiyotest=1 prints the state to the browser console for the automated play check, with the swipe (screen px from
    // the top-left, from and to) that drops the ball through the ring's middle from a high arc, leading a sliding hoop.
    bool testLog; float testT, botReady;
    Vector2 Aim()
    {
        var s = Spot(shot);
        float up = s.y - st.hy, arc = 70f;
        float vy = -Mathf.Sqrt(2f * Gravity * (up + arc));
        float tf = -vy / Gravity + Mathf.Sqrt(2f * arc / Gravity);
        // the swipe lands a frame or two after it is sent
        float tx = HoopX(t + 0.04f + tf);
        return new Vector2((tx - s.x) / tf, vy);
    }
    Vector2 Scr(Vector2 f) { var sp = cam.WorldToScreenPoint(field.W(f.x, f.y, 0f)); return new Vector2(sp.x, Screen.height - sp.y); }
    void TestTick(float dt)
    {
        if (!testLog) return;
        if ((testT -= dt) > 0f) return;
        testT = 0.05f;
        string next = "null";
        if (state == GameState.Playing && !over && !flying && shot < shotCount && t >= botReady)
        {
            var from = new Vector2(180f, 300f);
            var to = from + Aim() / Flick;
            var a = Scr(from); var b = Scr(to);
            next = $"[{a.x:F1},{a.y:F1},{b.x:F1},{b.y:F1}]";
        }
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"shot\":{shot},\"of\":{shotCount},\"points\":{points},\"need\":{st.need},\"par\":{st.par},\"next\":{next},\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.91f, 0.35f, 0.05f, 0.97f);
    static readonly Color Dark = new Color(0.1f, 0.11f, 0.12f, 0.9f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("Goal {0}", HoopFlickStages.All[i].need);

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(1f, 0.92f, 0.85f), U("Hoop Flick"),
                U("Swipe from the ball toward the hoop to throw. Drop it down through the ring for 2, or touch nothing but net for 3. Reach the goal with your balls."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        if (banner > 0f)
        {
            var p = OiyoArcade.ToGui(cam.WorldToScreenPoint(field.W(HoopX(t), st.hy - 40f - (0.9f - banner) * 40f, -0.5f)));
            OiyoArcade.Shadowed(new Rect(p.x - 40f, p.y - 20f, 80f, 40f), bannerText, 26, new Color(0.94f, 0.55f, 0f), TextAnchor.MiddleCenter);
        }
        var bar = new Rect(8f, 8f, w - 16f, 44f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 18f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>  " + F("Goal {0}", st.need) + "   " + F("Points {0}", points) + "   " + F("Balls {0}", shotCount - shot), 15, new Color(1f, 0.92f, 0.85f));
        if (OiyoArcade.Button(new Rect(w - 56f, 12f, 40f, 36f), "<b>II</b>", OiyoScreens.Slate, 16))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap to start"), U("Flick from the ball toward the hoop!"), 200f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            string detail = won ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : "";
            string body = $"<size=14>{F("{0} points · {1} swishes", points, swishes)}</size>";
            int r = OiyoScreens.Result(w, h, Dark, Accent, won, ResultLive, won ? U("Goal reached!") : U("Not enough points"), detail, body,
                won && stageIdx < StageCount - 1 ? U("Next stage") : null, won && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
