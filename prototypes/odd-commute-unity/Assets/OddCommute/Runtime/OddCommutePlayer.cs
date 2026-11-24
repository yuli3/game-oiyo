using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Odd Commute 3D: the web Odd Commute (src/components/games/OddCommute.tsx, src/lib/games/odd-commute.ts) rebuilt in
// Unity on the web's own 360 × 560 px field (OiyoField). The car is 360 × 300 px from y = 120, its things laid out as
// the web lays them. Each car in the stage's order is either the ordinary car or has one change: a thing gone, a
// second copy dx along, a new colour, scaled, mirrored, or moved dx. Turn back if anything changed, go on if not;
// a right call is a stop closer, a wrong one counts from the first stop again. Reach the stage's stops in a row
// before the line runs out of cars. The 30 lines are the web's own (OddCommuteStages.cs).
public class OddCommutePlayer : MonoBehaviour
{
    const string Slug = "odd-commute";
    const int StageCount = 30;
    const float CarTop = 120f;
    static readonly Rect BackRect = new Rect(10f, 500f, 160f, 50f), OnRect = new Rect(190f, 500f, 160f, 50f);
    static readonly string[] Palette = { "#e03131", "#1971c2", "#2f9e44", "#f08c00", "#7048e8", "#0c8599", "#d6336c", "#495057" };

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of odd-commute.ts) ----------------
    struct Thing { public int kind, colour, look; public float x, y, w, h; public bool flip; }
    OddCommuteStages.Level st;
    int stageIdx, starsWon, car, streak, wrong;
    bool over, won;

    int Cars => st.thing.Length;
    bool Odd(int k) => k >= 0 && k < Cars && st.thing[k] >= 0;

    List<Thing> CarWith(int k)
    {
        var things = new List<Thing>();
        for (int i = 0; i < st.kind.Length; i++)
            things.Add(new Thing { kind = st.kind[i], x = st.x[i], y = st.y[i], w = st.w[i], h = st.h[i], colour = st.colour[i], look = st.look[i] });
        if (!Odd(k)) return things;
        int ti = st.thing[k];
        var t = things[ti];
        switch (st.change[k])
        {
            case 0: things.RemoveAt(ti); break; // gone
            case 1: { var e = t; e.x += st.dx[k]; things.Add(e); break; } // extra
            case 2: t.colour = st.newColour[k]; things[ti] = t; break; // colour
            case 3: t.w = Mathf.Round(t.w * st.scale[k]); t.h = Mathf.Round(t.h * st.scale[k]); things[ti] = t; break; // size
            case 4: t.flip = !t.flip; things[ti] = t; break; // flip
            case 5: t.x += st.dx[k]; things[ti] = t; break; // move
        }
        return things;
    }

    void NewRide() { car = 0; streak = 0; wrong = 0; over = false; won = false; }

    bool Decide(bool back)
    {
        bool right = back == Odd(car);
        if (right) streak++; else { streak = 0; wrong++; }
        car++;
        if (streak >= st.need) { over = true; won = true; }
        else if (car >= Cars) over = true;
        return right;
    }

    int StarsFor()
    {
        if (!won) return 0;
        if (wrong == 0) return 3;
        if (wrong <= 2) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    OiyoField field;
    Camera cam;
    Transform root, carRoot, revealBox;
    Material wallMat, seatMat, floorMat, poleMat, skinMat, hairMat, legMat, whiteMat, windowMat, lightMat, greyMat, backMat, onMat, revealMat;
    readonly Material[] colMat = new Material[8];
    readonly List<Transform> stops = new List<Transform>();
    Material stopOn, stopOff;
    Synth synth;
    bool showStages;
    float slide, revealT;

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(360f, 560f, new Color(0.13f, 0.15f, 0.16f));
        cam = field.Cam;
        OiyoField.Lights(new Color(0.78f, 0.78f, 0.8f), 0.6f, 35f, -20f);
        synth = new Synth(gameObject);
        wallMat = OiyoArcade.Lit(new Color(0.91f, 0.93f, 0.94f), 0.2f, OiyoArcade.Art("OC/panel", true));
        seatMat = OiyoArcade.Lit(new Color(0.3f, 0.67f, 0.97f), 0.2f, OiyoArcade.Art("OC/seat", true));
        floorMat = OiyoArcade.Lit(new Color(0.68f, 0.71f, 0.74f), 0.2f);
        poleMat = OiyoArcade.Lit(new Color(0.53f, 0.56f, 0.59f), 0.8f, null, 0.6f);
        skinMat = OiyoArcade.Lit(new Color(0.95f, 0.79f, 0.63f), 0.2f);
        hairMat = OiyoArcade.Lit(new Color(0.13f, 0.15f, 0.16f), 0.2f);
        legMat = OiyoArcade.Lit(new Color(0.2f, 0.23f, 0.25f), 0.2f);
        whiteMat = OiyoArcade.Lit(Color.white, 0.2f);
        windowMat = OiyoArcade.Lit(new Color(0.11f, 0.16f, 0.29f), 0.7f);
        lightMat = OiyoArcade.Glow(new Color(1f, 0.95f, 0.75f));
        greyMat = OiyoArcade.Lit(new Color(0.68f, 0.71f, 0.74f), 0.4f);
        backMat = OiyoArcade.Lit(new Color(0.91f, 0.35f, 0.05f), 0.4f);
        onMat = OiyoArcade.Lit(new Color(0.1f, 0.44f, 0.76f), 0.4f);
        revealMat = OiyoArcade.Transparent(OiyoArcade.Solid(Color.white), new Color(1f, 0.83f, 0.23f, 0.35f));
        stopOn = OiyoArcade.Lit(new Color(0.25f, 0.75f, 0.34f), 0.4f);
        stopOff = OiyoArcade.Lit(new Color(0.35f, 0.37f, 0.4f), 0.3f);
        for (int i = 0; i < 8; i++) { ColorUtility.TryParseHtmlString(Palette[i], out var c); colMat[i] = OiyoArcade.Lit(c, 0.25f); }
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int i, bool ready = true)
    {
        stageIdx = Mathf.Clamp(i, 0, StageCount - 1);
        StopAllCoroutines();
        st = OddCommuteStages.All[stageIdx];
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Train").transform;
        NewRide();
        starsWon = 0;
        showStages = false;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Animate(0f);
    }

    Transform Box(Material m, float x, float y, float w, float h, float z, float depth, Transform parent)
    {
        var q = OiyoArcade.Prim(PrimitiveType.Cube, "Box", m, parent).transform;
        q.position = field.W(x, y, z);
        q.localScale = new Vector3(OiyoField.U(Mathf.Max(1f, w)), OiyoField.U(Mathf.Max(1f, h)), depth);
        return q;
    }

    void BuildScene()
    {
        Box(wallMat, 180f, CarTop + 150f, 1600f, 300f, 0.6f, 0.2f, root);
        Box(seatMat, 180f, CarTop + 217f, 1600f, 34f, 0.3f, 0.5f, root);
        Box(floorMat, 180f, CarTop + 275f, 1600f, 50f, 0.4f, 0.3f, root);
        Box(greyMat, 7f, CarTop + 135f, 14f, 230f, 0.2f, 0.4f, root);
        Box(greyMat, 353f, CarTop + 135f, 14f, 230f, 0.2f, 0.4f, root);
        Box(backMat, BackRect.center.x, BackRect.center.y, BackRect.width, BackRect.height, -0.2f, 0.3f, root);
        Box(onMat, OnRect.center.x, OnRect.center.y, OnRect.width, OnRect.height, -0.2f, 0.3f, root);
        stops.Clear();
        for (int k = 0; k < st.need; k++)
            stops.Add(Box(stopOff, 24f + k * 312f / Mathf.Max(1, st.need - 1), 60f, 14f, 14f, -0.1f, 0.2f, root));
        revealBox = Box(revealMat, 0f, 0f, 10f, 10f, -0.9f, 0.05f, root);
        BuildCar();
    }

    // one thing of the car from boxes, the same shapes as the web's drawThing
    void BuildThing(Thing t, Transform parent)
    {
        float x = t.x - t.w / 2f, y = CarTop + t.y, s = t.flip ? -1f : 1f;
        var col = colMat[t.colour];
        switch (t.kind)
        {
            case 0: // passenger
                Box(col, t.x, y + 18f + t.h * 0.25f, t.w - 12f, t.h * 0.5f, -0.3f, 0.3f, parent);
                Box(legMat, x + 11.5f, y + 18f + t.h * 0.66f, 7f, t.h * 0.32f, -0.3f, 0.3f, parent);
                Box(legMat, x + t.w - 11.5f, y + 18f + t.h * 0.66f, 7f, t.h * 0.32f, -0.3f, 0.3f, parent);
                Box(skinMat, t.x, y + 8f, 16f, 16f, -0.3f, 0.3f, parent);
                Box(hairMat, t.x, y + 2.5f, 16f, 5f, -0.35f, 0.3f, parent);
                Box(hairMat, t.x + 3f * s, y + 8f, 2f, 2f, -0.5f, 0.1f, parent);
                if (t.look == 1) Box(whiteMat, t.x + 12f * s, y + 33f, 12f, 14f, -0.5f, 0.1f, parent);
                else if (t.look == 2) Box(hairMat, t.x + 8f * s, y + 12f, 4f, 8f, -0.5f, 0.1f, parent);
                break;
            case 1: // poster
                Box(col, t.x, y + t.h / 2f, t.w, t.h, -0.2f, 0.05f, parent);
                Box(whiteMat, t.flip ? x + t.w - 9f : x + 9f, y + t.h / 2f, 10f, t.h - 8f, -0.25f, 0.05f, parent);
                break;
            case 2: // strap
                Box(poleMat, t.x, y + (t.h - 10f) / 2f, 2f, t.h - 10f, -0.2f, 0.05f, parent);
                Box(col, t.x, y + t.h - 5f, t.w, t.w, -0.2f, 0.1f, parent);
                break;
            case 3: // window
                Box(greyMat, t.x, y + t.h / 2f, t.w + 6f, t.h + 6f, -0.15f, 0.05f, parent);
                Box(windowMat, t.x, y + t.h / 2f, t.w, t.h, -0.2f, 0.05f, parent);
                for (int k = 0; k < 3 + t.look; k++) Box(col, x + 9f + ((k * 17) % (t.w - 10f)), y + t.h - 6f - ((k * 7) % 14), 6f, 8f, -0.25f, 0.05f, parent);
                break;
            case 4: // clock
                Box(col, t.x, y + t.h / 2f, t.w + 4f, t.w + 4f, -0.2f, 0.05f, parent);
                Box(whiteMat, t.x, y + t.h / 2f, t.w - 2f, t.w - 2f, -0.25f, 0.05f, parent);
                Box(hairMat, t.x, y + t.h / 2f - t.w / 4f, 2f, t.w / 2f - 2f, -0.3f, 0.05f, parent);
                {
                    var hand = Box(hairMat, t.x, y + t.h / 2f, t.w / 2f - 3f, 2f, -0.3f, 0.05f, parent);
                    float a = (-90f + (t.look + 1) * 74.5f) * s;
                    hand.rotation = Quaternion.Euler(0f, 0f, -a);
                    hand.position = field.W(t.x + Mathf.Cos(a * Mathf.Deg2Rad) * (t.w / 4f) * s, y + t.h / 2f + Mathf.Sin(a * Mathf.Deg2Rad) * (t.w / 4f), -0.3f);
                }
                break;
            case 5: // bag
                Box(col, t.x, y + 6f + (t.h - 6f) / 2f, t.w, t.h - 6f, -0.3f, 0.2f, parent);
                Box(col, t.x, y + 3f, 10f, 3f, -0.3f, 0.1f, parent);
                break;
            case 6: // light
                Box(lightMat, t.x, y + t.h / 2f, t.w, t.h, -0.2f, 0.05f, parent);
                Box(col, t.x, y + t.h + 1f, t.w, 2f, -0.2f, 0.05f, parent);
                break;
            case 7: // sign
                Box(col, t.x, y + t.h / 2f, t.w, t.h, -0.2f, 0.05f, parent);
                Box(whiteMat, t.flip ? x + 6f : x + t.w - 6f, y + t.h / 2f, 6f, t.h - 6f, -0.25f, 0.05f, parent);
                Box(whiteMat, t.flip ? x + 11f : x + t.w - 11f, y + t.h / 2f, 4f, t.h - 10f, -0.25f, 0.05f, parent);
                break;
        }
    }

    void BuildCar()
    {
        if (carRoot != null) Destroy(carRoot.gameObject);
        carRoot = new GameObject("Car").transform;
        carRoot.SetParent(root);
        foreach (var t in CarWith(over ? -1 : car)) BuildThing(t, carRoot);
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("odd-commute", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        slide = Mathf.Max(0f, slide - dt * 2.5f);
        revealT = Mathf.Max(0f, revealT - dt);
        msgT = Mathf.Max(0f, msgT - dt);
        Animate(dt);
    }

    string msg = ""; float msgT; Color msgC = Color.white;
    void Toast(string m, Color c) { msg = m; msgT = 1.1f; msgC = c; }

    void Call(bool back)
    {
        if (over || slide > 0f) return;
        int was = car;
        bool odd = Odd(was);
        bool right = Decide(back);
        if (odd)
        {
            // show where the change was
            int ti = st.thing[was];
            var t = CarWith(was);
            int idx = st.change[was] == 1 ? t.Count - 1 : st.change[was] == 0 ? -1 : ti;
            float tx = idx >= 0 ? t[idx].x : st.x[ti], ty = idx >= 0 ? t[idx].y : st.y[ti], tw = idx >= 0 ? t[idx].w : st.w[ti], th = idx >= 0 ? t[idx].h : st.h[ti];
            revealBox.position = field.W(tx, CarTop + ty + th / 2f, -0.9f);
            revealBox.localScale = new Vector3(OiyoField.U(tw + 8f), OiyoField.U(th + 8f), 0.05f);
            revealT = 1.2f;
        }
        Toast(right ? U("Right!") : U("Wrong - back to the first stop"), right ? new Color(0.6f, 1f, 0.6f) : new Color(1f, 0.45f, 0.45f));
        synth.Tone(right ? 880f : 200f, right ? 0.12f : 0.3f, right ? Wave.Triangle : Wave.Square, 0.14f, right ? 1175f : 120f, 6f);
        slide = 1f;
        BuildCar();
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
                    // taps are read once per frame: the left door turns back, the right one goes on
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (OiyoArcade.OverUi(b.pos) || !field.ToField(b.pos, out Vector2 f)) continue;
                        if (state == GameState.Ready) { state = GameState.Playing; continue; }
                        if (BackRect.Contains(f)) Call(true);
                        else if (OnRect.Contains(f)) Call(false);
                    }
                    if (Input.GetKeyDown(KeyCode.LeftArrow) || Input.GetKeyDown(KeyCode.RightArrow))
                    {
                        if (state == GameState.Ready) state = GameState.Playing;
                        else Call(Input.GetKeyDown(KeyCode.LeftArrow));
                    }
                    if (state == GameState.Ready && (confirm || Input.GetKeyDown(KeyCode.Space))) state = GameState.Playing;
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
            OiyoArcade.Record(Slug, stageIdx, starsWon, st.need, StageCount);
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
        if (carRoot != null) carRoot.localPosition = new Vector3(OiyoField.U(slide * 90f), 0f, 0f);
        for (int k = 0; k < stops.Count; k++) stops[k].GetComponent<Renderer>().sharedMaterial = k < streak ? stopOn : stopOff;
        revealBox.gameObject.SetActive(revealT > 0f);
    }

    // ?oiyotest=1 prints the state to the browser console for the automated play check: the car, the streak, whether
    // this car has a change (the answer), and the screen points (px from the top-left) of the two doors.
    bool testLog; float testT;
    Vector2 Scr(Vector2 f) { var sp = cam.WorldToScreenPoint(field.W(f.x, f.y, -0.3f)); return new Vector2(sp.x, Screen.height - sp.y); }
    void TestTick(float dt)
    {
        if (!testLog || (testT -= dt) > 0f) return;
        testT = 0.05f;
        var bk = Scr(BackRect.center); var on = Scr(OnRect.center);
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"car\":{car},\"cars\":{Cars},\"streak\":{streak},\"need\":{st.need},\"wrong\":{wrong},\"odd\":{(Odd(car) ? "true" : "false")},\"sliding\":{(slide > 0f ? "true" : "false")},\"back\":[{bk.x:F1},{bk.y:F1}],\"on\":[{on.x:F1},{on.y:F1}],\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.1f, 0.44f, 0.76f, 0.97f);
    static readonly Color Dark = new Color(0.08f, 0.09f, 0.1f, 0.9f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("Stop {0}/{1}", 0, OddCommuteStages.All[i].need);

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(0.97f, 0.98f, 0.98f), U("Odd Commute"),
                U("Learn the first car. Then turn back if anything changed, go on if nothing did. One wrong call and you count from the first stop."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        var bar = new Rect(8f, 8f, w - 16f, 64f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 12f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>  " + F("Stop {0}/{1}", streak, st.need), 15, new Color(0.97f, 0.98f, 0.98f));
        OiyoArcade.Text(new Rect(20f, 36f, w - 90f, 24f), F("Car {0}", Mathf.Min(car + 1, Cars)) + $" / {Cars}", 15, Color.white);
        if (OiyoArcade.Button(new Rect(w - 60f, 14f, 44f, 44f), "<b>II</b>", OiyoScreens.Slate, 18))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (state == GameState.Playing || state == GameState.Ready)
        {
            var bc = OiyoArcade.ToGui(cam.WorldToScreenPoint(field.W(BackRect.center.x, BackRect.center.y, -0.4f)));
            var oc = OiyoArcade.ToGui(cam.WorldToScreenPoint(field.W(OnRect.center.x, OnRect.center.y, -0.4f)));
            OiyoArcade.Shadowed(new Rect(bc.x - 80f, bc.y - 12f, 160f, 24f), "<b>< " + U("Turn back") + "</b>", 16, Color.white, TextAnchor.MiddleCenter);
            OiyoArcade.Shadowed(new Rect(oc.x - 80f, oc.y - 12f, 160f, 24f), "<b>" + U("Next car") + " ></b>", 16, Color.white, TextAnchor.MiddleCenter);
            if (car == 0)
            {
                var g = OiyoArcade.ToGui(cam.WorldToScreenPoint(field.W(180f, 96f, -0.4f)));
                OiyoArcade.Shadowed(new Rect(8f, g.y - 12f, w - 16f, 24f), U("Take a good look at this car. This is the ordinary one."), 14, new Color(1f, 0.83f, 0.23f), TextAnchor.MiddleCenter);
            }
            if (revealT > 0f)
            {
                var g = OiyoArcade.ToGui(cam.WorldToScreenPoint(field.W(180f, 110f, -0.9f)));
                OiyoArcade.Shadowed(new Rect(8f, g.y - 10f, w - 16f, 20f), U("This changed"), 13, new Color(1f, 0.83f, 0.23f), TextAnchor.MiddleCenter);
            }
        }
        if (msgT > 0f)
        {
            var g = OiyoArcade.ToGui(cam.WorldToScreenPoint(field.W(180f, 470f, -0.8f)));
            OiyoArcade.Shadowed(new Rect(8f, g.y - 14f, w - 16f, 28f), "<b>" + msg + "</b>", 18, msgC, TextAnchor.MiddleCenter);
        }
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap to start"), U("Something changed? Turn back. If not, go on."), 200f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            bool w0 = state == GameState.Victory;
            string detail = w0 ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : "";
            string body = $"<size=14>{F("{0} wrong calls", wrong)}</size>";
            int r = OiyoScreens.Result(w, h, Dark, Accent, w0, ResultLive, w0 ? U("Made it! Not late after all") : U("The train ran out of cars"), detail, body,
                w0 && stageIdx < StageCount - 1 ? U("Next stage") : null, w0 && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
