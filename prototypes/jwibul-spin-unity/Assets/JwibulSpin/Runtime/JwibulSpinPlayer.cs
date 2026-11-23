using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Jwibul Spin 3D: the web Jwibul Spin (src/components/games/JwibulSpin.tsx, src/lib/games/jwibul-spin.ts)
// rebuilt in Unity. The rules are the web's, in its own 360 x 560 px field: the child walks toward the
// slow-moving middle of the finger's path (at most 520 px/s), circling the finger around the child spins
// the can on a 58 px rope, the spin decays with the night wind, the can lights a dry tuft it brushes at
// 340 px/s or more, touching a haystack ends the run, and the embers cool below 260 px/s. The 30 stages
// are the web's own (JwibulSpinStages.cs, exported from the web stage builder), and so are the stars.
// Keyboard: arrows/WASD walk, Space (or any arrow) whirls the can.
public class JwibulSpinPlayer : MonoBehaviour
{
    const string Slug = "jwibul-spin";
    const int StageCount = 30;
    const float FW = 360f, FH = 560f;
    const float Rope = 58f, TuftR = 16f, PivotSpeed = 520f, LightSpeed = 340f, EmberSpeed = 260f;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of jwibul-spin.ts) ----------------
    class Tuft { public float x, y; public bool lit; public Transform t, flame, glow; public float litT; }
    JwibulSpinStages.Level level;
    int stageIdx;
    readonly List<Tuft> tufts = new List<Tuft>();
    Vector2 pivot, centre, can;
    bool hasFinger; Vector2 finger;
    float fingerAngle; bool hasFingerAngle;
    float fingerSpin, angle, omega, speed, heat, time;
    bool over, won;
    string cause = "";
    int starsWon;

    void NewRun()
    {
        pivot = new Vector2(level.sx, level.sy);
        centre = pivot; hasFinger = false; hasFingerAngle = false;
        fingerSpin = 0f; angle = Mathf.PI / 2f; omega = 0f;
        can = new Vector2(pivot.x, pivot.y + Rope);
        speed = 0f; heat = 1f; time = 0f; over = false; won = false; cause = "";
    }

    void Lead(bool down, float x, float y)
    {
        if (!down) { hasFinger = false; hasFingerAngle = false; fingerSpin = 0f; return; }
        if (!hasFinger) centre = pivot;
        hasFinger = true;
        finger = new Vector2(Mathf.Clamp(x, 4f, FW - 4f), Mathf.Clamp(y, 4f, FH - 4f));
    }

    readonly List<string> events = new List<string>();
    void Step(float dt)
    {
        events.Clear();
        if (over) return;
        int n = Mathf.Max(1, Mathf.CeilToInt(dt / (1f / 240f)));
        float h = dt / n;
        if (hasFinger && Vector2.Distance(finger, pivot) > 8f)
        {
            float a = Mathf.Atan2(finger.y - pivot.y, finger.x - pivot.x);
            if (hasFingerAngle && dt > 0f)
            {
                float da = a - fingerAngle;
                while (da > Mathf.PI) da -= Mathf.PI * 2f;
                while (da < -Mathf.PI) da += Mathf.PI * 2f;
                float raw = Mathf.Clamp(da / dt, -18f, 18f);
                fingerSpin += (raw - fingerSpin) * Mathf.Min(1f, dt * 10f);
            }
            fingerAngle = a; hasFingerAngle = true;
        }
        else
        {
            hasFingerAngle = false;
            if (!hasFinger) fingerSpin = 0f;
        }
        float spin = fingerSpin;
        for (int k = 0; k < n && !over; k++)
        {
            time += h;
            if (hasFinger)
            {
                centre += (finger - centre) * Mathf.Min(1f, h * 2.5f);
                var dd = centre - pivot;
                float d = dd.magnitude;
                float step = Mathf.Min(d, PivotSpeed * h);
                if (d > 0f) pivot += dd / d * step;
                if (Mathf.Abs(spin) > Mathf.Abs(omega) * 0.6f || Sign(spin) != Sign(omega)) omega += (spin - omega) * Mathf.Min(1f, h * 4f);
            }
            omega *= Mathf.Exp(-(0.5f + level.wind) * h);
            angle += omega * h;
            can = new Vector2(pivot.x + Mathf.Cos(angle) * Rope, pivot.y + Mathf.Sin(angle) * Rope);
            speed = Mathf.Abs(omega) * Rope;
            if (speed >= EmberSpeed) heat = Mathf.Min(1f, heat + h * 0.6f);
            else if (time > 2.5f) heat -= h * (0.2f + stageIdx * 0.004f);
            if (heat <= 0f) { heat = 0f; over = true; cause = "cold"; events.Add("cold"); break; }
            if (speed >= LightSpeed)
                foreach (var t in tufts)
                    if (!t.lit && Vector2.Distance(new Vector2(t.x, t.y), can) < TuftR + 6f) { t.lit = true; events.Add("light"); }
            for (int i = 0; i + 2 < level.stacks.Length; i += 3)
                if (Vector2.Distance(new Vector2(level.stacks[i], level.stacks[i + 1]), can) < level.stacks[i + 2] + 5f) { over = true; cause = "stack"; events.Add("stack"); break; }
            if (over) break;
            bool all = true;
            foreach (var t in tufts) if (!t.lit) { all = false; break; }
            if (all) { over = true; won = true; events.Add("win"); break; }
            if (time > level.timeLimit) { over = true; cause = "time"; events.Add("time"); }
        }
    }

    // JS Math.sign: 0 for 0
    static int Sign(float v) => v > 0f ? 1 : v < 0f ? -1 : 0;

    int StarsFor()
    {
        if (!won) return 0;
        if (time <= level.par * 1.25f + 2f) return 3;
        if (time <= level.par * 1.7f + 4f) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    OiyoField field;
    Transform root, kid, canT, rope, moon, skyWall;
    Renderer canGlow;
    Material kidMat, canMat, tuftMat, tuftBurntMat, flameMat, glowMat, moonMat, paddyMat, strawMat, ropeMat, ridgeMat;
    readonly List<Transform> trail = new List<Transform>();
    readonly List<float> trailT = new List<float>();
    int trailNext;
    Bursts embers, sparks;
    Synth synth;
    bool showStages;
    const float Tilt = 24f;

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(FW, FH, new Color(0.05f, 0.08f, 0.2f));
        OiyoField.Lights(new Color(0.38f, 0.4f, 0.55f), 0.55f, 50f, -20f);
        embers = new Bursts(transform, -0.25f);
        sparks = new Bursts(transform, 0.5f);
        synth = new Synth(gameObject);
        kidMat = OiyoField.Sprite("JS/kid");
        canMat = OiyoArcade.Lit(new Color(0.68f, 0.71f, 0.74f), 0.6f, null, 0.4f);
        tuftMat = OiyoField.Sprite("JS/tuft");
        tuftBurntMat = OiyoArcade.Transparent(OiyoArcade.Art("JS/tuft"), new Color(0.45f, 0.3f, 0.2f));
        flameMat = OiyoField.Sprite("JS/flame");
        glowMat = OiyoArcade.Transparent(OiyoArcade.Art("JS/glow"), new Color(1f, 0.65f, 0.3f, 0.7f));
        moonMat = OiyoField.Sprite("JS/moon");
        paddyMat = OiyoArcade.Lit(Color.white, 0.05f, OiyoArcade.Art("JS/paddy", true));
        strawMat = OiyoArcade.Lit(Color.white, 0.1f, OiyoArcade.Art("JS/straw", true));
        ropeMat = OiyoArcade.Glow(new Color(0.85f, 0.87f, 0.9f));
        ridgeMat = OiyoArcade.Lit(new Color(0.3f, 0.24f, 0.16f), 0.05f);
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int idx, bool ready = true)
    {
        stageIdx = Mathf.Clamp(idx, 0, StageCount - 1);
        StopAllCoroutines();
        level = JwibulSpinStages.All[stageIdx];
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Field").transform;
        trail.Clear(); trailT.Clear(); trailNext = 0;
        tufts.Clear();
        for (int i = 0; i + 1 < level.tufts.Length; i += 2) tufts.Add(new Tuft { x = level.tufts[i], y = level.tufts[i + 1] });
        NewRun();
        kbdCentre = pivot; kbdOn = false;
        showStages = false;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Fit();
        Animate(0f);
    }

    Quaternion Up => Quaternion.Euler(-Tilt, 0f, 0f);

    void BuildScene()
    {
        // the paddy: a wide textured board, the playable field marked by low earth ridges
        var ground = OiyoArcade.Prim(PrimitiveType.Quad, "Paddy", paddyMat, root);
        ground.transform.position = field.W(FW * 0.5f, FH * 0.5f, 0.02f);
        ground.transform.localScale = new Vector3(OiyoField.U(FW * 3f), OiyoField.U(FH * 1.6f), 1f);
        paddyMat.mainTextureScale = new Vector2(5f, 4f);
        Ridge(FW * 0.5f, 0f, FW + 8f, 6f); Ridge(FW * 0.5f, FH, FW + 8f, 6f);
        Ridge(0f, FH * 0.5f, 6f, FH); Ridge(FW, FH * 0.5f, 6f, FH);
        // the night sky stands up behind the far ridge; the moon crosses it as the clock
        skyWall = new GameObject("Sky").transform; skyWall.SetParent(root, false);
        var sky = OiyoArcade.Prim(PrimitiveType.Quad, "SkyQuad", OiyoArcade.Glow(new Color(0.09f, 0.14f, 0.3f)), skyWall);
        sky.transform.localScale = new Vector3(OiyoField.U(FW * 4f), OiyoField.U(420f), 1f);
        sky.transform.localPosition = new Vector3(0f, OiyoField.U(210f), 0f);
        var rs = new System.Random(stageIdx * 17 + 3);
        for (int i = 0; i < 40; i++)
        {
            var st = OiyoArcade.GlowQuad("Star", new Color(1f, 1f, 0.9f, 0.6f + (float)rs.NextDouble() * 0.4f), OiyoField.U(4f + (float)rs.NextDouble() * 5f), skyWall);
            st.transform.localPosition = new Vector3(OiyoField.U(((float)rs.NextDouble() - 0.5f) * FW * 2.6f), OiyoField.U(40f + (float)rs.NextDouble() * 360f), -0.01f);
        }
        moon = OiyoField.Quad("Moon", moonMat, skyWall, 54f, 54f);
        var moonGlow = OiyoArcade.GlowQuad("MoonGlow", new Color(1f, 0.95f, 0.7f, 0.35f), OiyoField.U(150f), moon);
        moonGlow.transform.localScale = Vector3.one * 2.6f; moonGlow.transform.localPosition = new Vector3(0f, 0f, 0.01f);
        skyWall.position = field.W(FW * 0.5f, -6f, 0f);
        skyWall.rotation = Quaternion.Euler(-90f + 6f, 0f, 0f);
        // haystacks: straw domes with a little top knot
        for (int i = 0; i + 2 < level.stacks.Length; i += 3)
        {
            float x = level.stacks[i], y = level.stacks[i + 1], r = level.stacks[i + 2];
            var st = new GameObject("Stack").transform; st.SetParent(root, false);
            st.position = field.W(x, y, 0f);
            var dome = OiyoArcade.Prim(PrimitiveType.Sphere, "Dome", strawMat, st);
            dome.transform.localScale = new Vector3(OiyoField.U(r * 2.1f), OiyoField.U(r * 2.1f), OiyoField.U(r * 2.6f));
            dome.transform.localPosition = new Vector3(0f, 0f, -OiyoField.U(r * 0.55f));
            var knot = OiyoArcade.Prim(PrimitiveType.Cylinder, "Knot", strawMat, st);
            knot.transform.localScale = new Vector3(OiyoField.U(r * 0.5f), OiyoField.U(r * 0.35f), OiyoField.U(r * 0.5f));
            knot.transform.localRotation = Quaternion.Euler(90f, 0f, 0f);
            knot.transform.localPosition = new Vector3(0f, 0f, -OiyoField.U(r * 1.75f));
            var band = OiyoArcade.Prim(PrimitiveType.Cylinder, "Band", OiyoArcade.Lit(new Color(0.45f, 0.3f, 0.12f), 0.1f), st);
            band.transform.localScale = new Vector3(OiyoField.U(r * 1.9f), OiyoField.U(2f), OiyoField.U(r * 1.9f));
            band.transform.localRotation = Quaternion.Euler(90f, 0f, 0f);
            band.transform.localPosition = new Vector3(0f, 0f, -OiyoField.U(r * 0.9f));
        }
        foreach (var t in tufts)
        {
            t.t = OiyoField.Quad("Tuft", tuftMat, root, 40f, 34f);
            t.glow = OiyoField.Quad("TuftGlow", glowMat, root, 70f, 70f);
            t.glow.gameObject.SetActive(false);
            t.flame = OiyoField.Quad("Flame", flameMat, root, 38f, 34f);
            t.flame.gameObject.SetActive(false);
            Stand(t.t, t.x, t.y, 34f, 0f);
        }
        kid = OiyoField.Quad("Kid", kidMat, root, 32f, 40f);
        canT = new GameObject("Can").transform; canT.SetParent(root, false);
        var body = OiyoArcade.Prim(PrimitiveType.Cylinder, "Tin", canMat, canT);
        body.transform.localScale = new Vector3(OiyoField.U(13f), OiyoField.U(8f), OiyoField.U(13f));
        body.transform.localRotation = Quaternion.Euler(90f, 0f, 0f);
        var coal = OiyoArcade.Prim(PrimitiveType.Sphere, "Coals", OiyoArcade.Glow(new Color(1f, 0.6f, 0.2f)), canT);
        coal.transform.localScale = new Vector3(OiyoField.U(11f), OiyoField.U(11f), OiyoField.U(5f));
        coal.transform.localPosition = new Vector3(0f, 0f, -OiyoField.U(8f));
        canGlow = OiyoArcade.GlowQuad("CanGlow", new Color(1f, 0.6f, 0.25f, 0.8f), OiyoField.U(60f), canT).GetComponent<Renderer>();
        canGlow.transform.localPosition = new Vector3(0f, 0f, -OiyoField.U(10f));
        rope = OiyoArcade.Prim(PrimitiveType.Cube, "Rope", ropeMat, root).transform;
        for (int i = 0; i < 36; i++)
        {
            var q = OiyoArcade.GlowQuad("Trail", new Color(1f, 0.7f, 0.3f, 0f), OiyoField.U(12f), root);
            q.SetActive(false);
            trail.Add(q.transform); trailT.Add(0f);
        }
    }

    void Ridge(float x, float y, float w, float h)
    {
        var r = OiyoArcade.Prim(PrimitiveType.Cube, "Ridge", ridgeMat, root);
        r.transform.position = field.W(x, y, -OiyoField.U(3f));
        r.transform.localScale = new Vector3(OiyoField.U(w), OiyoField.U(h), OiyoField.U(6f));
    }

    // A billboard standing on field point (x, y): its bottom edge on the ground, leaning toward the camera.
    void Stand(Transform t, float x, float y, float hPx, float lift)
    {
        t.rotation = Up;
        t.position = field.W(x, y, 0f) + Up * new Vector3(0f, OiyoField.U(hPx * 0.5f + lift), 0f) + new Vector3(0f, 0f, -0.02f);
    }

    void Fit()
    {
        bool portrait = field.Cam.aspect < 1f;
        field.Fit(portrait ? 190f : 130f, portrait ? 24f : 14f, Tilt);
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("jwibul-spin", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        Fit();
        ReadInput(dt);
        if (state == GameState.Playing)
        {
            Step(dt);
            foreach (var e in events)
            {
                if (e == "light") OnLight();
                else if (e == "stack") { sparks.Emit(field.W(can.x, can.y, -0.4f), new Color(1f, 0.55f, 0.15f), 40, 5f, 0.35f, 0.9f); synth.Tone(120f, 0.6f, Wave.Noise, 0.22f, 60f, 4f); }
                else if (e == "cold") synth.Tone(300f, 0.5f, Wave.Triangle, 0.14f, 120f, 4f);
                else if (e == "time") synth.Tone(240f, 0.6f, Wave.Triangle, 0.16f, 110f, 3f);
            }
            if (over) End();
        }
        Animate(dt);
    }

    void OnLight()
    {
        Tuft best = null; float bd = float.MaxValue;
        foreach (var t in tufts) if (t.lit && t.litT == 0f) { float d = Vector2.Distance(new Vector2(t.x, t.y), can); if (d < bd) { bd = d; best = t; } }
        foreach (var t in tufts) if (t.lit && t.litT == 0f) t.litT = 0.0001f;
        if (best != null) embers.Emit(field.W(best.x, best.y, -0.5f), new Color(1f, 0.75f, 0.3f), 26, 3.2f, 0.3f, 1.1f);
        int lit = 0; foreach (var t in tufts) if (t.lit) lit++;
        synth.Tone(520f + lit * 60f, 0.18f, Wave.Triangle, 0.2f, 880f + lit * 60f, 7f);
        synth.Tone(90f, 0.25f, Wave.Noise, 0.08f, 0f, 9f);
    }

    // keyboard: a virtual finger that circles a centre the arrows move, like the web's scripted player
    bool kbdOn; Vector2 kbdCentre; float kbdPhase;
    void ReadInput(float dt)
    {
        bool confirm = Input.GetKeyDown(KeyCode.Return);
        switch (state)
        {
            case GameState.Ready:
            case GameState.Playing:
                {
                    if (state == GameState.Playing && (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P))) { state = GameState.Paused; Lead(false, 0, 0); return; }
                    var dir = new Vector2((Input.GetKey(KeyCode.RightArrow) || Input.GetKey(KeyCode.D) ? 1 : 0) - (Input.GetKey(KeyCode.LeftArrow) || Input.GetKey(KeyCode.A) ? 1 : 0),
                                          (Input.GetKey(KeyCode.DownArrow) || Input.GetKey(KeyCode.S) ? 1 : 0) - (Input.GetKey(KeyCode.UpArrow) || Input.GetKey(KeyCode.W) ? 1 : 0));
                    bool keys = dir != Vector2.zero || Input.GetKey(KeyCode.Space);
                    var held = OiyoArcade.Held();
                    var began = OiyoArcade.Began();
                    bool touching = false; Vector2 fp = default;
                    foreach (var h in held) if (!OiyoArcade.OverUi(h.pos) && field.ToField(h.pos, out fp)) { touching = true; break; }
                    if (!touching) foreach (var b in began) if (field.ToField(b.pos, out fp)) { touching = true; break; }
                    if (state == GameState.Ready && (touching || keys)) state = GameState.Playing;
                    if (state != GameState.Playing) return;
                    if (touching) { kbdOn = false; Lead(true, fp.x, fp.y); }
                    else if (keys)
                    {
                        if (!kbdOn) { kbdOn = true; kbdCentre = pivot; }
                        if (dir != Vector2.zero) kbdCentre += dir.normalized * 150f * dt;
                        kbdCentre = new Vector2(Mathf.Clamp(kbdCentre.x, 14f, FW - 14f), Mathf.Clamp(kbdCentre.y, 14f, FH - 14f));
                        kbdPhase += 9.5f * dt;
                        Lead(true, kbdCentre.x + Mathf.Cos(kbdPhase) * 22f, kbdCentre.y + Mathf.Sin(kbdPhase) * 22f);
                    }
                    else { kbdOn = false; Lead(false, 0, 0); }
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

    void End()
    {
        if (state != GameState.Playing) return;
        endTime = Time.unscaledTime;
        Lead(false, 0, 0);
        if (won)
        {
            starsWon = StarsFor();
            state = GameState.Victory;
            OiyoArcade.Record(Slug, stageIdx, starsWon, starsWon, StageCount);
            StartCoroutine(Arp(new[] { 523f, 659f, 784f, 1047f, 1319f }, 0.09f));
        }
        else
        {
            starsWon = 0;
            state = GameState.GameOver;
        }
    }

    IEnumerator Arp(float[] fs, float gap)
    {
        foreach (var f in fs) { synth.Tone(f, 0.18f, Wave.Triangle, 0.22f, 0f, 6f); yield return new WaitForSeconds(gap); }
    }

    void Animate(float dt)
    {
        if (root == null) return;
        float t = Time.time;
        // moon: rises across the sky as the clock runs (web: 40 + frac * 280, climbing 70 px)
        float frac = state == GameState.Menu ? 0.2f : Mathf.Min(1f, time / Mathf.Max(1f, level.timeLimit));
        moon.localPosition = new Vector3(OiyoField.U(-140f + frac * 280f), OiyoField.U(90f + Mathf.Sin(frac * Mathf.PI * 0.5f) * 150f), -0.02f);
        foreach (var tf in tufts)
        {
            if (!tf.lit) continue;
            if (tf.litT > 0f) tf.litT += dt;
            if (!tf.flame.gameObject.activeSelf)
            {
                tf.flame.gameObject.SetActive(true); tf.glow.gameObject.SetActive(true);
                tf.t.GetComponent<Renderer>().sharedMaterial = tuftBurntMat;
            }
            float grow = Mathf.Clamp01(tf.litT / 0.25f + (tf.litT == 0f ? 1f : 0f));
            float flick = 1f + Mathf.Sin(t * 12f + tf.y) * 0.08f;
            tf.flame.localScale = new Vector3(OiyoField.U(38f) * grow * flick, OiyoField.U(34f) * grow / flick, 1f);
            Stand(tf.flame, tf.x, tf.y, 34f * grow, 14f);
            tf.glow.rotation = Quaternion.identity;
            tf.glow.position = field.W(tf.x, tf.y, -0.05f);
            tf.glow.localScale = Vector3.one * OiyoField.U(70f + Mathf.Sin(t * 9f + tf.x) * 6f);
            if (Random.value < dt * 6f) embers.Emit(field.W(tf.x + Random.Range(-8f, 8f), tf.y, -1.1f), new Color(1f, 0.7f, 0.25f), 1, 0.8f, 0.16f, 1.2f, new Vector3(0f, 0.6f, -0.6f));
        }
        // the child and the whirling can
        Stand(kid, pivot.x, pivot.y, 40f, 0f);
        float bob = hasFinger && state == GameState.Playing ? Mathf.Abs(Mathf.Sin(t * 10f)) * 0.06f : 0f;
        kid.position += Up * new Vector3(0f, bob, 0f);
        var canPos = field.W(can.x, can.y, -OiyoField.U(16f));
        canT.position = canPos;
        canT.Rotate(0f, 0f, omega * Mathf.Rad2Deg * dt, Space.World);
        var hand = field.W(pivot.x, pivot.y, 0f) + Up * new Vector3(0f, OiyoField.U(22f), 0f) + new Vector3(0f, 0f, -0.05f);
        var mid = (hand + canPos) * 0.5f;
        var span = canPos - hand;
        rope.position = mid;
        rope.rotation = Quaternion.LookRotation(span.normalized == Vector3.zero ? Vector3.forward : span.normalized, Vector3.back);
        rope.localScale = new Vector3(0.035f, 0.035f, span.magnitude);
        var gc = speed >= LightSpeed ? new Color(1f, 0.72f, 0.28f, 0.9f) : speed >= EmberSpeed ? new Color(1f, 0.55f, 0.2f, 0.7f) : new Color(1f, 0.4f, 0.2f, 0.2f + heat * 0.4f);
        canGlow.material.color = gc;
        canGlow.transform.localScale = Vector3.one * OiyoField.U(40f + heat * 30f + (speed >= LightSpeed ? 16f : 0f));
        canGlow.transform.rotation = Quaternion.identity;
        // spark trail behind the can (web: a trail while it moves faster than 60 px/s)
        if (state == GameState.Playing && speed > 60f && trail.Count > 0)
        {
            var q = trail[trailNext]; trailT[trailNext] = 0.35f;
            q.gameObject.SetActive(true); q.position = canPos + new Vector3(0f, 0f, 0.05f);
            trailNext = (trailNext + 1) % trail.Count;
        }
        for (int i = 0; i < trail.Count; i++)
        {
            if (trailT[i] <= 0f) continue;
            trailT[i] -= dt;
            if (trailT[i] <= 0f) { trail[i].gameObject.SetActive(false); continue; }
            float a = trailT[i] / 0.35f;
            var m = trail[i].GetComponent<Renderer>().material;
            m.color = speed >= LightSpeed ? new Color(1f, 0.63f + a * 0.3f, 0.24f, a) : new Color(1f, 0.47f, 0.24f, a * 0.6f);
            trail[i].localScale = Vector3.one * OiyoField.U(8f + a * 10f);
        }
    }

    // ?oiyotest=1 prints the run state to the browser console for the automated play check.
    bool testLog; float testT;
    void TestTick(float dt)
    {
        if (!testLog || (testT -= dt) > 0f) return;
        testT = 0.1f;
        var sb = new System.Text.StringBuilder();
        foreach (var tf in tufts)
        {
            if (tf.lit) continue;
            var s = field.Cam.WorldToScreenPoint(field.W(tf.x, tf.y));
            if (sb.Length > 0) sb.Append(',');
            sb.Append($"[{s.x:F0},{s.y:F0}]");
        }
        var p = field.Cam.WorldToScreenPoint(field.W(pivot.x, pivot.y));
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"t\":{time:F1},\"heat\":{heat:F2},\"speed\":{speed:F0},\"pivot\":[{p.x:F0},{p.y:F0}],\"ppf\":{field.ScreenPerField():F3},\"tufts\":[{sb}],\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.95f, 0.45f, 0.15f, 0.97f);
    static readonly Color Dark = new Color(0.04f, 0.06f, 0.16f, 0.86f);
    static readonly Color Gold = new Color(1f, 0.82f, 0.25f, 0.97f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("{0} tufts", JwibulSpinStages.All[i].tufts.Length / 2);

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(1f, 0.78f, 0.45f), U("Jwibul Spin"),
                U("Whirl the fire can and light every dry tuft before the moon climbs high. Keep it off the haystacks."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        var bar = new Rect(8f, 8f, w - 16f, 78f);
        OiyoArcade.Panel(bar, Dark);
        int lit = 0; foreach (var tf in tufts) if (tf.lit) lit++;
        string wind = level.wind > 0f ? "   <color=#a5d8ff>" + U("Night wind") + "</color>" : "";
        OiyoArcade.Text(new Rect(20f, 12f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>" + wind, 15, new Color(1f, 0.9f, 0.7f));
        float left = Mathf.Max(0f, level.timeLimit - time);
        OiyoArcade.Text(new Rect(20f, 34f, w - 90f, 24f), $"{U("Lit")} <b>{lit}/{tufts.Count}</b>   {U("Time")} <b>{Mathf.CeilToInt(left)}</b>", 16, Color.white);
        OiyoArcade.Text(new Rect(20f, 58f, 70f, 18f), U("Embers"), 12, new Color(1f, 1f, 1f, 0.7f));
        OiyoArcade.Bar(new Rect(90f, 62f, w - 166f, 9f), heat, new Color(0f, 0f, 0f, 0.45f), speed >= EmberSpeed ? new Color(1f, 0.57f, 0.17f) : new Color(0.8f, 0.83f, 0.85f));
        if (OiyoArcade.Button(new Rect(w - 64f, 14f, 46f, 46f), "<b>II</b>", OiyoScreens.Slate, 18))
        {
            if (state == GameState.Playing) { state = GameState.Paused; Lead(false, 0, 0); }
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (state == GameState.Playing && time < 4f && speed < EmberSpeed)
            OiyoArcade.Shadowed(new Rect(8f, 92f, w - 16f, 40f), U("Circle your finger to whirl the fire can"), w < 520f ? 15 : 18, Gold, TextAnchor.MiddleCenter);
        if (state == GameState.Ready)
        {
            string extra = level.stacks.Length > 0 ? "\n<color=#ffd27a>" + U("Keep the can off the haystacks!") + "</color>" : "";
            OiyoScreens.Hint(w, h, Dark, F("Light {0} tufts in {1} s", tufts.Count, Mathf.RoundToInt(level.timeLimit)),
                U("Hold and draw small circles: the child whirls the can and walks after your finger.") + extra, h - 96f, 116f);
        }
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            bool w0 = state == GameState.Victory;
            string head = w0 ? U("The whole field is alight!") : cause == "stack" ? U("The fire caught a haystack") : cause == "cold" ? U("The embers went out") : U("The moon rose too high");
            string detail = w0 ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : F("{0} tufts left", tufts.Count - lit);
            string body = w0 ? F("All lit in {0} s", Mathf.CeilToInt(time)) : F("Lit {0} of {1}", lit, tufts.Count);
            int r = OiyoScreens.Result(w, h, Dark, Accent, w0, ResultLive, head, detail, body,
                w0 && stageIdx < StageCount - 1 ? U("Next stage") : null, w0 && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
