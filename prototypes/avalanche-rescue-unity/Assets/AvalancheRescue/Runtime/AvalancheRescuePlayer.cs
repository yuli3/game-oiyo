using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Avalanche Rescue 3D: the web Avalanche Rescue (src/components/games/AvalancheRescue.tsx,
// src/lib/games/avalanche-rescue.ts) rebuilt in Unity. The rules are the web's: the rescuer walks at
// 3.2 m/s to where you tap and digs while you hold on them. The transceiver hears the nearest unfound
// skier within 60 m and shows the distance (to the half metre) and a bearing that wavers by a fresh
// seeded error every 0.4 s, up to the stage's noise × min(1.6, distance / 30). Digging reaches only within
// 1.5 m and takes 1 s per metre of depth. Find everyone before the air runs out. The 30 slides are the
// web's own (AvalancheRescueStages.cs). Keyboard: arrows walk 3 m, hold Space to dig.
public class AvalancheRescuePlayer : MonoBehaviour
{
    const string Slug = "avalanche-rescue";
    const int StageCount = 30;
    const float Walk = 3.2f, DigReach = 1.5f, DigRate = 1f, Range = 60f;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of avalanche-rescue.ts) ----------------
    AvalancheRescueStages.Level st;
    int stageIdx, buriedCount;
    float t, x, y, dug, wobble, wobbleT;
    bool digging, over, won, hasTarget;
    Vector2 target;
    bool[] found;
    uint rng;
    int starsWon;

    float BX(int i) => st.buried[i * 3];
    float BY(int i) => st.buried[i * 3 + 1];
    float Depth(int i) => st.buried[i * 3 + 2];

    void NewRescue()
    {
        t = 0f; x = st.startX; y = st.startY; dug = 0f; digging = false; hasTarget = false; wobble = 0f; wobbleT = 0f;
        buriedCount = st.buried.Length / 3; found = new bool[buriedCount]; rng = st.seed; over = false; won = false;
    }
    double NextRand()
    {
        rng = unchecked(rng + 0x6d2b79f5u);
        uint q = rng;
        q = unchecked((q ^ (q >> 15)) * (q | 1u));
        q ^= unchecked(q + (q ^ (q >> 7)) * (q | 61u));
        return (q ^ (q >> 14)) / 4294967296.0;
    }
    int Nearest(out float dist)
    {
        int best = -1; dist = 0f;
        for (int i = 0; i < buriedCount; i++)
        {
            if (found[i]) continue;
            float d = Mathf.Sqrt((BX(i) - x) * (BX(i) - x) + (BY(i) - y) * (BY(i) - y));
            if (d <= Range && (best < 0 || d < dist)) { best = i; dist = d; }
        }
        return best;
    }
    bool Reading(out float dist, out float bearing)
    {
        int i = Nearest(out float d);
        dist = Mathf.Floor(d * 2f) / 2f; bearing = 0f;
        if (i < 0) return false;
        bearing = Mathf.Atan2(BY(i) - y, BX(i) - x) + wobble;
        return true;
    }
    static float BeepGap(float dist) => 0.12f + Mathf.Min(1.2f, dist * 0.03f);

    void WalkTo(float tx, float ty) { if (over) return; digging = false; hasTarget = true; target = new Vector2(Mathf.Clamp(tx, 0f, st.w), Mathf.Clamp(ty, 0f, st.h)); }
    void Dig() { if (over) return; hasTarget = false; digging = true; }
    void Stop() { hasTarget = false; digging = false; }

    // "found", "end" or null
    string Step(float dt)
    {
        if (over) return null;
        t += dt;
        if ((wobbleT -= dt) <= 0f)
        {
            float scale = Nearest(out float nd) >= 0 ? Mathf.Min(1.6f, nd / 30f) : 1f;
            wobble = (float)((NextRand() - 0.5) * 2.0) * st.noise * scale;
            wobbleT = 0.4f;
        }
        string ev = null;
        if (hasTarget)
        {
            float dx = target.x - x, dy = target.y - y, d = Mathf.Sqrt(dx * dx + dy * dy), step = Walk * dt;
            if (d <= step) { x = target.x; y = target.y; hasTarget = false; }
            else { x += dx / d * step; y += dy / d * step; }
            dug = 0f;
        }
        else if (digging)
        {
            int i = Nearest(out float nd);
            if (i >= 0 && nd <= DigReach)
            {
                dug += DigRate * dt;
                if (dug >= Depth(i)) { found[i] = true; dug = 0f; digging = false; ev = "found"; }
            }
            else dug = Mathf.Min(dug + DigRate * dt, 0.5f);
        }
        bool all = true; foreach (var f in found) if (!f) { all = false; break; }
        if (all) { over = true; won = true; return "end"; }
        if (t >= st.limit) { over = true; won = false; return "end"; }
        return ev;
    }

    int StarsFor()
    {
        if (!won) return 0;
        float left = (st.limit - t) / st.limit;
        if (left >= 0.2f) return 3;
        if (left >= 0.1f) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    Camera cam;
    Transform root, rescuer, arrow, hole;
    readonly List<Transform> skiers = new List<Transform>();
    Material rescuerMat, skierMat, snowMat, debrisMat, arrowMat, holeMat, rockMat;
    Bursts bursts;
    Synth synth;
    bool showStages;
    float beepT, flashT;

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        cam = new GameObject("Camera").AddComponent<Camera>();
        cam.fieldOfView = 50f; cam.nearClipPlane = 0.1f; cam.farClipPlane = 300f;
        cam.clearFlags = CameraClearFlags.SolidColor;
        cam.backgroundColor = new Color(0.11f, 0.24f, 0.42f);
        OiyoField.Lights(new Color(0.66f, 0.7f, 0.8f), 0.85f, 50f, -20f);
        bursts = new Bursts(transform, 0.5f);
        synth = new Synth(gameObject);
        rescuerMat = OiyoField.Sprite("AR/rescuer");
        skierMat = OiyoField.Sprite("AR/skier");
        snowMat = OiyoArcade.Lit(Color.white, 0.35f, OiyoArcade.Art("AR/snow", true));
        debrisMat = OiyoArcade.Lit(new Color(0.86f, 0.89f, 0.94f), 0.3f);
        arrowMat = OiyoArcade.Glow(new Color(0.91f, 0.35f, 0.05f));
        holeMat = OiyoArcade.Lit(new Color(0.56f, 0.65f, 0.76f), 0.2f);
        rockMat = OiyoArcade.Lit(new Color(0.33f, 0.36f, 0.4f), 0.2f);
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int idx, bool ready = true)
    {
        stageIdx = Mathf.Clamp(idx, 0, StageCount - 1);
        StopAllCoroutines();
        st = AvalancheRescueStages.All[stageIdx];
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Slide").transform;
        NewRescue();
        starsWon = 0;
        showStages = false;
        pressing = 0; beepT = 0f;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Animate(0f);
    }

    void BuildScene()
    {
        var field = OiyoArcade.Prim(PrimitiveType.Cube, "Debris field", snowMat, root);
        field.transform.position = new Vector3(st.w * 0.5f, -0.1f, st.h * 0.5f);
        field.transform.localScale = new Vector3(st.w + 40f, 0.2f, st.h + 40f);
        var rnd = OiyoField.Mulberry(st.seed + 99u);
        for (int i = 0; i < 90; i++)
        {
            var blk = OiyoArcade.Prim(PrimitiveType.Cube, "Block", debrisMat, root);
            float s = 0.4f + (float)rnd() * 1.1f;
            blk.transform.position = new Vector3((float)rnd() * st.w, s * 0.3f, (float)rnd() * st.h);
            blk.transform.rotation = Quaternion.Euler(0f, (float)rnd() * 90f, (float)rnd() * 20f);
            blk.transform.localScale = new Vector3(s * 1.4f, s * 0.7f, s);
        }
        for (int sd = -1; sd <= 1; sd += 2)
        {
            var rock = OiyoArcade.Prim(PrimitiveType.Cube, "Rock", rockMat, root);
            rock.transform.position = new Vector3(sd < 0 ? -8f : st.w + 8f, 3f, st.h * 0.5f);
            rock.transform.localScale = new Vector3(6f, 6f, st.h + 40f);
        }
        skiers.Clear();
        for (int i = 0; i < buriedCount; i++)
        {
            var sk = OiyoField.Quad("Skier", skierMat, root, 1f, 1f);
            sk.localScale = new Vector3(1.4f, 1.4f, 1f);
            sk.position = new Vector3(BX(i), 0.7f, BY(i));
            sk.gameObject.SetActive(false);
            skiers.Add(sk);
        }
        hole = OiyoArcade.Prim(PrimitiveType.Cylinder, "Hole", holeMat, root).transform;
        arrow = new GameObject("Arrow").transform;
        arrow.SetParent(root, false);
        var shaft = OiyoArcade.Prim(PrimitiveType.Cube, "Shaft", arrowMat, arrow);
        shaft.transform.localPosition = new Vector3(0f, 0f, 1.6f);
        shaft.transform.localScale = new Vector3(0.18f, 0.06f, 1.2f);
        var tip = OiyoArcade.Prim(PrimitiveType.Cube, "Tip", arrowMat, arrow);
        tip.transform.localPosition = new Vector3(0f, 0f, 2.3f);
        tip.transform.localRotation = Quaternion.Euler(0f, 45f, 0f);
        tip.transform.localScale = new Vector3(0.45f, 0.06f, 0.45f);
        rescuer = OiyoField.Quad("Rescuer", rescuerMat, root, 1f, 1f);
        rescuer.localScale = new Vector3(1.6f, 1.6f, 1f);
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("avalanche-rescue", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        if (state == GameState.Playing)
        {
            string ev = Step(dt);
            if (Reading(out float dist, out _) && (beepT -= dt) <= 0f)
            {
                beepT = BeepGap(dist); flashT = 0.12f;
                synth.Tone(dist <= DigReach ? 1760f : 1320f, 0.04f, Wave.Square, 0.06f, 0f, 30f);
            }
            if (digging && Mathf.FloorToInt(t * 6f) != Mathf.FloorToInt((t - dt) * 6f)) bursts.Emit(new Vector3(x, 0.3f, y), Color.white, 4, 1.5f, 0.1f, 0.3f);
            if (ev == "found" || (ev == "end" && won))
            {
                Toast(U("Found them!"), new Color(0.55f, 1f, 0.6f));
                synth.Tone(784f, 0.16f, Wave.Triangle, 0.2f, 1175f, 7f);
            }
            if (ev == "end") End();
        }
        flashT = Mathf.Max(0f, flashT - dt);
        msgT = Mathf.Max(0f, msgT - dt);
        Animate(dt);
    }

    string msg = ""; float msgT; Color msgC = Color.white;
    void Toast(string m, Color c) { msg = m; msgT = 1f; msgC = c; }

    int pressing; // 0 none, 1 walking (target follows the finger), 2 digging
    int pressId = int.MinValue;

    bool GroundPoint(Vector2 screen, out Vector3 hit)
    {
        var ray = cam.ScreenPointToRay(screen);
        var plane = new Plane(Vector3.up, Vector3.zero);
        hit = Vector3.zero;
        if (!plane.Raycast(ray, out float enter)) return false;
        hit = ray.GetPoint(enter);
        return true;
    }

    void ReadInput()
    {
        bool confirm = Input.GetKeyDown(KeyCode.Return);
        switch (state)
        {
            case GameState.Ready:
            case GameState.Playing:
                {
                    if (state == GameState.Playing && (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P))) { state = GameState.Paused; Stop(); pressing = 0; return; }
                    // the finger is read once per frame: on the rescuer it digs, elsewhere it walks there
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (state == GameState.Ready) state = GameState.Playing;
                        // only a press on the rescuer's own figure digs, so a short step just ahead still walks
                        var me = cam.WorldToScreenPoint(rescuer.position);
                        float near = 26f * OiyoArcade.Scale;
                        if (me.z > 0f && Vector2.Distance(b.pos, new Vector2(me.x, me.y)) <= near) { pressing = 2; pressId = b.id; Dig(); }
                        else if (GroundPoint(b.pos, out var g)) { pressing = 1; pressId = b.id; WalkTo(g.x, g.z); }
                    }
                    if (pressing == 1)
                        foreach (var hp in OiyoArcade.Held()) if (hp.id == pressId && GroundPoint(hp.pos, out var g)) WalkTo(g.x, g.z);
                    foreach (var e in OiyoArcade.Ended())
                        if (e.id == pressId) { if (pressing == 2) Stop(); pressing = 0; pressId = int.MinValue; }
                    float kx = 0f, ky = 0f;
                    if (Input.GetKeyDown(KeyCode.LeftArrow)) kx = -3f;
                    if (Input.GetKeyDown(KeyCode.RightArrow)) kx = 3f;
                    if (Input.GetKeyDown(KeyCode.UpArrow)) ky = 3f;
                    if (Input.GetKeyDown(KeyCode.DownArrow)) ky = -3f;
                    if (kx != 0f || ky != 0f) { if (state == GameState.Ready) state = GameState.Playing; WalkTo(x + kx, y + ky); }
                    if (Input.GetKeyDown(KeyCode.Space)) { if (state == GameState.Ready) state = GameState.Playing; Dig(); }
                    if (Input.GetKeyUp(KeyCode.Space)) Stop();
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
                if (!showStages && (confirm || Input.GetKeyDown(KeyCode.Space))) LoadStage(stageIdx);
                return;
        }
    }

    float endTime;
    bool ResultLive => Time.unscaledTime - endTime > 0.45f;

    int FoundCount() { int n = 0; foreach (var f in found) if (f) n++; return n; }

    void End()
    {
        if (state != GameState.Playing) return;
        endTime = Time.unscaledTime;
        Stop();
        if (won)
        {
            starsWon = StarsFor();
            state = GameState.Victory;
            OiyoArcade.Record(Slug, stageIdx, starsWon, Mathf.RoundToInt(st.limit - t), StageCount);
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
        rescuer.position = new Vector3(x, 0.85f, y);
        for (int i = 0; i < skiers.Count; i++) skiers[i].gameObject.SetActive(found[i]);
        hole.gameObject.SetActive(digging || dug > 0f);
        hole.position = new Vector3(x, 0.02f, y - 0.3f);
        hole.localScale = new Vector3(0.6f + dug * 0.8f, 0.02f, 0.6f + dug * 0.8f);
        bool has = Reading(out _, out float bearing);
        arrow.gameObject.SetActive(has && (state == GameState.Playing || state == GameState.Ready));
        arrow.position = new Vector3(x, 0.15f, y);
        // field bearing (x east, y north) -> world yaw (z forward)
        arrow.rotation = Quaternion.Euler(0f, 90f - bearing * Mathf.Rad2Deg, 0f);
        bool portrait = cam.aspect < 1f;
        var camPos = new Vector3(x, portrait ? 21f : 12f, y - (portrait ? 11f : 8f));
        cam.transform.position = dt <= 0f ? camPos : Vector3.Lerp(cam.transform.position, camPos, 1f - Mathf.Exp(-dt * 4f));
        cam.transform.LookAt(new Vector3(x, 0f, y + 2f));
        rescuer.rotation = cam.transform.rotation;
        foreach (var sk in skiers) sk.rotation = cam.transform.rotation;
    }

    // ?oiyotest=1 prints the state to the browser console for the automated play check, with the
    // rescuer's feet and figure on screen (px from the top-left), the dig zone radius, and the screen px
    // per metre east and north at the rescuer.
    bool testLog; float testT;
    void TestTick(float dt)
    {
        if (!testLog || (testT -= dt) > 0f) return;
        testT = 0.02f;
        bool has = Reading(out float dist, out float bearing);
        var me = cam.WorldToScreenPoint(new Vector3(x, 0f, y));
        var fig = cam.WorldToScreenPoint(new Vector3(x, 0.85f, y));
        var east = cam.WorldToScreenPoint(new Vector3(x + 1f, 0f, y));
        var north = cam.WorldToScreenPoint(new Vector3(x, 0f, y + 1f));
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"t\":{t:F3},\"x\":{x:F2},\"y\":{y:F2},\"sig\":{(has ? 1 : 0)},\"dist\":{dist:F1},\"bearing\":{bearing:F3},\"digging\":{(digging ? 1 : 0)},\"walking\":{(hasTarget ? 1 : 0)},\"found\":{FoundCount()},\"n\":{buriedCount},\"limit\":{st.limit:F0},\"w\":{st.w:F1},\"h\":{st.h:F1},\"mx\":{me.x:F1},\"my\":{Screen.height - me.y:F1},\"cx\":{fig.x:F1},\"cy\":{Screen.height - fig.y:F1},\"near\":{26f * OiyoArcade.Scale:F1},\"ex\":{east.x - me.x:F2},\"ey\":{me.y - east.y:F2},\"nx\":{north.x - me.x:F2},\"ny\":{me.y - north.y:F2},\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.88f, 0.19f, 0.19f, 0.97f);
    static readonly Color Dark = new Color(0.05f, 0.14f, 0.27f, 0.88f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("{0} buried", AvalancheRescueStages.All[i].buried.Length / 3);

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(0.8f, 0.9f, 1f), U("Avalanche Rescue"),
                U("Tap the snow to walk, hold on the rescuer to dig. Follow the arrow; the beeps quicken as you close in."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        var bar = new Rect(8f, 8f, w - 16f, 64f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 12f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>   " + F("Air {0}s", Mathf.Max(0f, st.limit - t).ToString("F0")), 15, new Color(1f, 0.92f, 0.75f));
        bool has = Reading(out float dist, out _);
        string readout = has ? $"<b><size=22>{dist:F1} m</size></b>" : U("No signal: head up the slide");
        OiyoArcade.Text(new Rect(20f, 36f, w - 90f, 30f), F("Found {0}/{1}", FoundCount(), buriedCount) + "   " + readout, 15, flashT > 0f ? new Color(1f, 0.85f, 0.3f) : Color.white);
        if (OiyoArcade.Button(new Rect(w - 60f, 14f, 44f, 44f), "<b>II</b>", OiyoScreens.Slate, 18))
        {
            if (state == GameState.Playing) { state = GameState.Paused; Stop(); pressing = 0; }
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (state == GameState.Playing && has && dist <= DigReach && !digging)
            OiyoArcade.Shadowed(new Rect(8f, 80f, w - 16f, 28f), U("Hold on the rescuer to dig here"), 17, new Color(0.55f, 1f, 0.6f), TextAnchor.MiddleCenter);
        if (msgT > 0f) OiyoArcade.Shadowed(new Rect(8f, 110f, w - 16f, 36f), msg, 24, msgC, TextAnchor.MiddleCenter);
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap to walk, hold the rescuer to dig"), U("Far away the arrow wavers: walk short legs and look again."), 200f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            bool w0 = state == GameState.Victory;
            string detail = w0 ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : F("Found {0}/{1}", FoundCount(), buriedCount);
            string body = $"<b>{t:F0}s</b>";
            int r = OiyoScreens.Result(w, h, Dark, Accent, w0, ResultLive, w0 ? U("Everyone is out!") : U("The air ran out"), detail, body,
                w0 && stageIdx < StageCount - 1 ? U("Next stage") : null, w0 && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
