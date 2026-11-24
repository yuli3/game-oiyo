using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Cork Spin 3D: the web Cork Spin (src/components/games/CorkSpin.tsx, src/lib/games/cork-spin.ts) rebuilt in Unity on
// the web's own 360 × 560 px field (OiyoField). A cork board spins (steadily, with a wobble in its speed, or swinging
// back and forth further than a full turn). A tap sends a pin up; 0.12 s later it sticks at the bottom of the board and
// turns with it. Closer than 0.22 rad to a pin already in, it bounces off: a heart lost, the pin back in the box.
// Push in every pin before the clock runs out. The 30 boards are the web's own (CorkSpinStages.cs).
public class CorkSpinPlayer : MonoBehaviour
{
    const string Slug = "cork-spin";
    const int StageCount = 30;
    const int Hearts = 3;
    const float Flight = 0.12f, Cooldown = 0.2f, Gap = 0.22f, Tau = Mathf.PI * 2f;
    const float CX = 180f, CY = 220f, R = 104f, PinLen = 46f, LaunchY = 470f;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of cork-spin.ts) ----------------
    CorkSpinStages.Level st;
    int stageIdx, starsWon, left, hearts;
    float t, cool;
    readonly List<float> stuck = new List<float>();
    readonly List<float> flying = new List<float>();
    bool over, won;

    static float Mod(float a, float n) => ((a % n) + n) % n;
    static float Dist(float a, float b) { float d = Mod(a - b, Tau); return Mathf.Min(d, Tau - d); }

    float SpinAt(float time)
    {
        float b;
        if (st.reverse > 0f)
        {
            int k = Mathf.FloorToInt(time / st.reverse);
            float r = time - k * st.reverse;
            b = (k % 2 == 0 ? r : st.reverse - r) * st.speed;
        }
        else b = time * st.speed;
        float wob = st.wobble != 0f ? st.wobble / st.wobbleRate * (1f - Mathf.Cos(st.wobbleRate * time)) : 0f;
        return b + wob;
    }
    float LandAt(float time) => Mod(-SpinAt(time), Tau);

    bool Shoot()
    {
        if (over || left <= 0 || cool > 0f) return false;
        left--;
        cool = Cooldown;
        flying.Add(t + Flight);
        return true;
    }

    // events: 1 stuck, 2 bounced
    int Step(float dt)
    {
        int ev = 0;
        if (over) return 0;
        t += dt;
        cool = Mathf.Max(0f, cool - dt);
        while (flying.Count > 0 && flying[0] <= t)
        {
            float at = flying[0];
            flying.RemoveAt(0);
            float a = LandAt(at);
            bool clear = true;
            foreach (float s in stuck) if (Dist(s, a) < Gap) clear = false;
            if (clear) { stuck.Add(a); ev |= 1; }
            else
            {
                hearts--;
                left++;
                ev |= 2;
                if (hearts <= 0) { over = true; return ev; }
            }
        }
        if (left == 0 && flying.Count == 0) { over = true; won = true; }
        else if (t >= st.limit) over = true;
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
    Transform root, board, waiting;
    readonly List<Transform> pinObj = new List<Transform>();
    readonly List<Transform> flyObj = new List<Transform>();
    readonly List<(Transform tr, Vector3 v, float life)> fallers = new List<(Transform, Vector3, float)>();
    Material shaftMat, greyHead, corkMat;
    Material[] heads;
    Transform[] boxPins;
    Bursts sparkle;
    Synth synth;
    bool showStages;
    float shake;
    static readonly Color[] HeadColours = { new Color(0.88f, 0.19f, 0.19f), new Color(0.1f, 0.44f, 0.76f), new Color(0.18f, 0.62f, 0.27f), new Color(0.94f, 0.55f, 0f), new Color(0.44f, 0.28f, 0.91f), new Color(0.05f, 0.52f, 0.6f) };

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(360f, 560f, new Color(0.91f, 0.93f, 0.94f));
        cam = field.Cam;
        OiyoField.Lights(new Color(0.7f, 0.7f, 0.7f), 0.75f, 45f, -30f);
        sparkle = new Bursts(transform, 0.5f);
        synth = new Synth(gameObject);
        shaftMat = OiyoArcade.Lit(new Color(0.68f, 0.71f, 0.74f), 0.9f, null, 0.8f);
        greyHead = OiyoArcade.Lit(new Color(0.29f, 0.31f, 0.34f), 0.6f);
        heads = new Material[HeadColours.Length];
        for (int k = 0; k < heads.Length; k++) heads[k] = OiyoArcade.Lit(HeadColours[k], 0.7f);
        corkMat = OiyoArcade.Lit(Color.white, 0.15f, CorkTexture());
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    static Texture2D CorkTexture()
    {
        const int S = 64;
        var tex = new Texture2D(S, S, TextureFormat.RGBA32, false) { filterMode = FilterMode.Point, wrapMode = TextureWrapMode.Clamp };
        var px = new Color32[S * S];
        var rng = OiyoField.Mulberry(29);
        for (int y = 0; y < S; y++)
            for (int x = 0; x < S; x++)
            {
                float d = Mathf.Sqrt((x - S / 2f + 0.5f) * (x - S / 2f + 0.5f) + (y - S / 2f + 0.5f) * (y - S / 2f + 0.5f));
                bool speck = rng() > 0.82;
                px[y * S + x] = d > S / 2f - 3f ? new Color32(127, 85, 57, 255) : speck ? new Color32(176, 125, 62, 255) : new Color32(217, 160, 102, 255);
            }
        tex.SetPixels32(px); tex.Apply(false);
        return tex;
    }

    void LoadStage(int i, bool ready = true)
    {
        stageIdx = Mathf.Clamp(i, 0, StageCount - 1);
        StopAllCoroutines();
        st = CorkSpinStages.All[stageIdx];
        stuck.Clear(); stuck.AddRange(st.fixedPins);
        flying.Clear();
        left = st.pins; hearts = Hearts; t = 0f; cool = 0f; over = false; won = false; starsWon = 0; shake = 0f;
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Wall").transform;
        pinObj.Clear(); flyObj.Clear(); fallers.Clear();
        showStages = false;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Animate(0f);
    }

    Transform MakePin(Material head)
    {
        var pin = new GameObject("Pin").transform;
        pin.SetParent(root, false);
        var shaft = OiyoArcade.Prim(PrimitiveType.Cylinder, "Shaft", shaftMat, pin).transform;
        shaft.localScale = new Vector3(OiyoField.U(4f), OiyoField.U(PinLen - 12f) / 2f, OiyoField.U(4f));
        shaft.localPosition = new Vector3(0f, OiyoField.U((PinLen - 12f) / 2f), 0f);
        var cap = OiyoArcade.Prim(PrimitiveType.Cylinder, "Head", head, pin).transform;
        cap.localScale = new Vector3(OiyoField.U(16f), OiyoField.U(6f), OiyoField.U(16f));
        cap.localPosition = new Vector3(0f, OiyoField.U(PinLen - 8f), 0f);
        return pin;
    }

    void BuildScene()
    {
        board = OiyoArcade.Prim(PrimitiveType.Cylinder, "Cork", corkMat, root).transform;
        board.localScale = new Vector3(OiyoField.U(R * 2f), 0.25f, OiyoField.U(R * 2f));
        board.position = field.W(CX, CY, 0f);
        var hub = OiyoArcade.Prim(PrimitiveType.Cube, "Hub", OiyoArcade.Lit(new Color(0.5f, 0.33f, 0.22f), 0.3f), root).transform;
        hub.localScale = new Vector3(OiyoField.U(20f), OiyoField.U(20f), 0.1f);
        hub.position = field.W(CX, CY, -0.3f);
        for (int k = 0; k < stuck.Count; k++) pinObj.Add(MakePin(greyHead));
        waiting = MakePin(heads[0]);
        boxPins = new Transform[16];
        for (int k = 0; k < boxPins.Length; k++)
        {
            boxPins[k] = OiyoArcade.Prim(PrimitiveType.Cube, "BoxPin", greyHead, root).transform;
            boxPins[k].localScale = new Vector3(OiyoField.U(18f), OiyoField.U(8f), 0.1f);
            boxPins[k].position = field.W(25f, 520f - k * 14f, -0.1f);
        }
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("cork-spin", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        if (state == GameState.Playing && !over)
        {
            int before = stuck.Count;
            int ev = Step(dt);
            if ((ev & 1) != 0)
            {
                for (int k = before; k < stuck.Count; k++) pinObj.Add(MakePin(heads[k % heads.Length]));
                sparkle.Emit(field.W(CX, CY + R, -0.4f), new Color(0.85f, 0.63f, 0.4f), 8, 2f, 0.06f, 0.3f);
                synth.Tone(880f, 0.06f, Wave.Triangle, 0.12f, 660f, 10f);
            }
            if ((ev & 2) != 0)
            {
                var f = MakePin(heads[stuck.Count % heads.Length]);
                fallers.Add((f, new Vector3(Random.Range(-3f, 3f), -2f, 0f), 0.8f));
                shake = 0.25f;
                synth.Tone(160f, 0.2f, Wave.Square, 0.14f, 90f, 8f);
            }
            if (over) End();
        }
        shake = Mathf.Max(0f, shake - dt);
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
                    // input is read once per frame: any tap throws a pin
                    bool throwIt = false;
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (state == GameState.Ready) { state = GameState.Playing; continue; }
                        if (OiyoArcade.OverUi(b.pos)) continue;
                        throwIt = true;
                    }
                    if (Input.GetKeyDown(KeyCode.Space) || Input.GetKeyDown(KeyCode.UpArrow) || confirm)
                    {
                        if (state == GameState.Ready) state = GameState.Playing;
                        else throwIt = true;
                    }
                    if (throwIt && state == GameState.Playing && Shoot()) synth.Tone(520f, 0.05f, Wave.Square, 0.06f, 700f, 12f);
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
            sparkle.Emit(field.W(CX, CY, -1f), new Color(1f, 0.85f, 0.25f), 40, 5f, 0.1f, 1f);
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

    // a pin with its point at a field point, pointing outward along the screen angle w (y down)
    void PlacePin(Transform pin, float fx, float fy, float w, float z)
    {
        pin.position = field.W(fx, fy, z);
        pin.rotation = Quaternion.FromToRotation(Vector3.up, new Vector3(Mathf.Cos(w), -Mathf.Sin(w), 0f));
    }

    void Animate(float dt)
    {
        if (root == null) return;
        field.Fit(70f, 10f, 0f, 60f, 540f);
        float spin = SpinAt(t);
        float jx = shake > 0f ? Mathf.Sin(Time.time * 60f) * 3f : 0f;
        board.rotation = Quaternion.Euler(-90f, 0f, 0f) * Quaternion.Euler(0f, spin * Mathf.Rad2Deg, 0f);
        board.position = field.W(CX + jx, CY, 0f);
        for (int k = 0; k < pinObj.Count && k < stuck.Count; k++)
        {
            float w = stuck[k] + spin + Mathf.PI / 2f;
            PlacePin(pinObj[k], CX + jx + Mathf.Cos(w) * (R - 6f), CY + Mathf.Sin(w) * (R - 6f), w, -0.1f);
        }
        // the pin in flight (one at most at a time, by the cooldown) rides up from the launcher
        while (flyObj.Count < flying.Count) flyObj.Add(MakePin(heads[(stuck.Count + flyObj.Count) % heads.Length]));
        while (flyObj.Count > flying.Count) { Destroy(flyObj[0].gameObject); flyObj.RemoveAt(0); }
        for (int k = 0; k < flying.Count; k++)
        {
            float f = Mathf.Clamp01(1f - (flying[k] - t) / Flight);
            float y = LaunchY - (LaunchY - (CY + R + PinLen - 6f)) * f;
            PlacePin(flyObj[k], CX, y - PinLen + 6f, Mathf.PI / 2f, -0.1f);
        }
        waiting.gameObject.SetActive(!over && left > 0 && cool <= 0f);
        PlacePin(waiting, CX, LaunchY - PinLen + 6f, Mathf.PI / 2f, -0.1f);
        for (int k = 0; k < boxPins.Length; k++) boxPins[k].gameObject.SetActive(k < left);
        for (int k = fallers.Count - 1; k >= 0; k--)
        {
            var (tr, v, life) = fallers[k];
            v.y -= 25f * dt;
            tr.position += v * dt;
            tr.Rotate(0f, 0f, 400f * dt);
            life -= dt;
            if (life <= 0f) { Destroy(tr.gameObject); fallers.RemoveAt(k); }
            else fallers[k] = (tr, v, life);
        }
    }

    // ?oiyotest=1 prints the state to the browser console for the automated play check, with the screen point to tap
    // when a careful thrower would: the spot coming to the bottom as the pin lands is clear, with room either side
    // (less room once the board is crowded, aiming into the widest gap).
    bool testLog; float testT;
    float Widest()
    {
        if (stuck.Count < 2) return Tau;
        var xs = new List<float>();
        foreach (float a in stuck) xs.Add(Mod(a, Tau));
        xs.Sort();
        float w = Tau - xs[xs.Count - 1] + xs[0];
        for (int i = 1; i < xs.Count; i++) w = Mathf.Max(w, xs[i] - xs[i - 1]);
        return w;
    }
    void TestTick(float dt)
    {
        if (!testLog) return;
        bool go = false;
        if (state == GameState.Playing && !over && left > 0 && cool <= 0f && flying.Count == 0)
        {
            // the tap lands a frame or three after it is sent; check the spot over that whole window
            float m = Mathf.Max(0.02f, Mathf.Min(0.3f, (Widest() / 2f - Gap) * 0.5f));
            go = true;
            for (float lag = 0.017f; lag <= 0.052f && go; lag += 0.0175f)
            {
                float a = LandAt(t + lag + Flight);
                foreach (float s in stuck) if (Dist(s, a) < Gap + m) go = false;
            }
        }
        if ((testT -= dt) > 0f && !go) return;
        testT = 0.05f;
        string next = "null";
        if (go) { var sp = cam.WorldToScreenPoint(field.W(CX, 400f, 0f)); next = $"[{sp.x:F1},{Screen.height - sp.y:F1}]"; }
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"t\":{t:F2},\"par\":{st.par},\"limit\":{st.limit},\"left\":{left},\"hearts\":{hearts},\"next\":{next},\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.69f, 0.49f, 0.24f, 0.97f);
    static readonly Color Dark = new Color(0.1f, 0.11f, 0.12f, 0.9f);
    const string HeartGlyphs = "♥♥♥";

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("{0} pins", CorkSpinStages.All[i].pins);

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(1f, 0.93f, 0.85f), U("Cork Spin"),
                U("Tap to push pins into the spinning cork board. Land one too close to another and it bounces off. Push in every pin before time runs out."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        var bar = new Rect(8f, 8f, w - 16f, 44f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 18f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>  " + F("{0} pins left", left) + "   " + F("{0}s", Mathf.Max(0, Mathf.CeilToInt(st.limit - t))) + "   " + $"<color=#ff6b6b>{HeartGlyphs.Substring(0, Mathf.Max(0, hearts))}</color><color=#ffffff44>{HeartGlyphs.Substring(0, Hearts - Mathf.Max(0, hearts))}</color>", 15, new Color(1f, 0.93f, 0.85f));
        if (OiyoArcade.Button(new Rect(w - 56f, 12f, 40f, 36f), "<b>II</b>", OiyoScreens.Slate, 16))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap to start"), U("Tap to push a pin in!"), 150f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            string detail = won ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : "";
            string body = $"<size=14>{F("{0}s", Mathf.CeilToInt(t))}</size>";
            int r = OiyoScreens.Result(w, h, Dark, Accent, won, ResultLive, won ? U("Every pin is in!") : hearts <= 0 ? U("Out of hearts") : U("Time's up"), detail, body,
                won && stageIdx < StageCount - 1 ? U("Next stage") : null, won && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
