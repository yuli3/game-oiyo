using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Icicle Knock 3D: the web Icicle Knock (src/components/games/IcicleKnock.tsx, src/lib/games/icicle-knock.ts)
// rebuilt in Unity on the web's own 360 × 560 px field (OiyoField). Five icicles hang from the eaves
// (y 150) in 72 px lanes. Each grows at its lane's rate; at 1 it can be knocked off, at 1.6 it snaps by
// itself. A falling icicle lands 0.45 s later on the ground (y 470); anyone within 26 px of the lane's
// middle then is bonked. A safe knock scores 1, a bonk costs 2. The 30 stages are the web's own
// (IcicleKnockStages.cs).
public class IcicleKnockPlayer : MonoBehaviour
{
    const string Slug = "icicle-knock";
    const int StageCount = 30, Lanes = 5;
    const float LaneW = 72f, Drop = 0.45f, Break = 1f, Snap = 1.6f, WalkerW = 26f, EaveY = 150f, GroundY = 470f, IceLen = 120f;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of icicle-knock.ts) ----------------
    IcicleKnockStages.Level st;
    int stageIdx;
    float t;
    readonly float[] size = new float[Lanes], wait = new float[Lanes];
    struct Fall { public int lane; public float hitAt; public bool knocked; }
    readonly List<Fall> falling = new List<Fall>();
    int knocked, bonks, snapped, starsWon;
    bool over, won;

    static float LaneX(int l) => (l + 0.5f) * LaneW;
    int WalkerCount => st.walkers.Length / 3;
    bool WalkerX(int i, float at, out float x)
    {
        float t0 = st.walkers[i * 3], from = st.walkers[i * 3 + 1], sp = st.walkers[i * 3 + 2];
        x = 0f;
        if (at < t0) return false;
        x = from + sp * (at - t0);
        return x >= -20f && x <= Lanes * LaneW + 20f;
    }
    bool Occupied(int lane, float at)
    {
        float cx = LaneX(lane);
        for (int i = 0; i < WalkerCount; i++) if (WalkerX(i, at, out float x) && Mathf.Abs(x - cx) <= WalkerW) return true;
        return false;
    }
    int Score => knocked - 2 * bonks;

    void NewEaves()
    {
        t = 0f;
        for (int l = 0; l < Lanes; l++) { size[l] = 0.2f; wait[l] = 0f; }
        falling.Clear();
        knocked = 0; bonks = 0; snapped = 0; over = false; won = false;
    }

    // "knocked", "too-small" or null
    string Knock(int lane)
    {
        if (over || wait[lane] > 0f) return null;
        if (size[lane] < Break) return "too-small";
        size[lane] = 0f; wait[lane] = st.regrow;
        falling.Add(new Fall { lane = lane, hitAt = t + Drop, knocked = true });
        return "knocked";
    }

    struct Landed { public int lane; public bool bonk, knocked; }
    readonly List<Landed> landedNow = new List<Landed>();
    readonly List<int> snappedNow = new List<int>();
    bool Step(float dt)
    {
        landedNow.Clear(); snappedNow.Clear();
        if (over) return false;
        t += dt;
        for (int l = 0; l < Lanes; l++)
        {
            if (wait[l] > 0f) { wait[l] = Mathf.Max(0f, wait[l] - dt); continue; }
            size[l] += st.grow[l] * dt;
            if (size[l] >= Snap)
            {
                size[l] = 0f; wait[l] = st.regrow;
                falling.Add(new Fall { lane = l, hitAt = t + Drop, knocked = false });
                snapped++; snappedNow.Add(l);
            }
        }
        for (int k = falling.Count - 1; k >= 0; k--)
        {
            var f = falling[k];
            if (t < f.hitAt) continue;
            bool bonk = Occupied(f.lane, f.hitAt);
            if (bonk) bonks++; else if (f.knocked) knocked++;
            landedNow.Add(new Landed { lane = f.lane, bonk = bonk, knocked = f.knocked });
            falling.RemoveAt(k);
        }
        if (t >= st.length && falling.Count == 0) { over = true; won = Score >= st.need; return true; }
        return false;
    }

    int StarsFor()
    {
        if (!won) return 0;
        if (bonks == 0 && Score >= st.need + 3) return 3;
        if (Score >= st.need + 1) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    OiyoField field;
    Camera cam;
    Transform root;
    readonly Transform[] ice = new Transform[Lanes];
    readonly Renderer[] iceR = new Renderer[Lanes];
    readonly List<Transform> drops = new List<Transform>();
    readonly List<Transform> walkers = new List<Transform>();
    Material doorMat, iceMat, readyMat, dangerMat, roofMat, beamMat, snowMat, wallMat, walkerA, walkerB, markMat;
    Bursts bursts;
    Synth synth;
    bool showStages;

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(360f, 560f, new Color(0.11f, 0.15f, 0.25f));
        RenderSettings.fog = false;
        cam = field.Cam;
        OiyoField.Lights(new Color(0.55f, 0.6f, 0.7f), 0.9f, 35f, -25f);
        bursts = new Bursts(transform, 0.9f);
        synth = new Synth(gameObject);
        iceMat = OiyoField.Sprite("IK/icicle");
        readyMat = OiyoField.Sprite("IK/cracked");
        dangerMat = OiyoField.Sprite("IK/danger");
        walkerA = OiyoField.Sprite("IK/walker_a");
        walkerB = OiyoField.Sprite("IK/walker_b");
        roofMat = OiyoArcade.Lit(Color.white, 0.3f, OiyoArcade.Art("IK/tiles", true));
        beamMat = OiyoArcade.Lit(new Color(0.42f, 0.27f, 0.14f), 0.2f);
        snowMat = OiyoArcade.Lit(new Color(0.93f, 0.95f, 0.97f), 0.1f);
        wallMat = OiyoArcade.Lit(new Color(0.36f, 0.27f, 0.2f), 0.1f);
        doorMat = OiyoArcade.Lit(new Color(0.96f, 0.88f, 0.66f), 0.05f);
        markMat = OiyoArcade.Transparent(OiyoArcade.Solid(Color.white), new Color(0.98f, 0.32f, 0.32f, 0.5f));
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int idx, bool ready = true)
    {
        stageIdx = Mathf.Clamp(idx, 0, StageCount - 1);
        StopAllCoroutines();
        st = IcicleKnockStages.All[stageIdx];
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Lane").transform;
        NewEaves();
        starsWon = 0;
        showStages = false;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Animate(0f);
    }

    void BuildScene()
    {
        // the hanok wall behind, the tiled roof and the wooden eave, the snowy lane in front
        var wall = OiyoArcade.Prim(PrimitiveType.Cube, "Wall", wallMat, root);
        wall.transform.position = field.W(180f, 300f, 1.2f);
        wall.transform.localScale = new Vector3(OiyoField.U(420f), OiyoField.U(340f), 0.4f);
        for (int k = 0; k < 4; k++)
        {
            var door = OiyoArcade.Prim(PrimitiveType.Cube, "Door", doorMat, root);
            door.transform.position = field.W(45f + k * 90f, 330f, 0.95f);
            door.transform.localScale = new Vector3(OiyoField.U(60f), OiyoField.U(170f), 0.1f);
            for (int g = 1; g < 3; g++)
            {
                var bar = OiyoArcade.Prim(PrimitiveType.Cube, "Lattice", beamMat, root);
                bar.transform.position = field.W(45f + k * 90f, 330f - 85f + g * 56f, 0.9f);
                bar.transform.localScale = new Vector3(OiyoField.U(60f), OiyoField.U(3f), 0.05f);
            }
        }
        var roof = OiyoArcade.Prim(PrimitiveType.Cube, "Roof", roofMat, root);
        roof.transform.position = field.W(180f, EaveY - 40f, 0.2f);
        roof.transform.localScale = new Vector3(OiyoField.U(440f), OiyoField.U(70f), 2.4f);
        roof.transform.rotation = Quaternion.Euler(-18f, 0f, 0f);
        var beam = OiyoArcade.Prim(PrimitiveType.Cube, "Eave", beamMat, root);
        beam.transform.position = field.W(180f, EaveY - 6f, -0.3f);
        beam.transform.localScale = new Vector3(OiyoField.U(440f), OiyoField.U(12f), 0.6f);
        var ground = OiyoArcade.Prim(PrimitiveType.Cube, "Snow", snowMat, root);
        ground.transform.position = field.W(180f, GroundY + 40f, 0f);
        ground.transform.localScale = new Vector3(OiyoField.U(460f), OiyoField.U(80f), 4f);
        for (int l = 0; l < Lanes; l++)
        {
            ice[l] = OiyoField.Quad("Icicle", iceMat, root, 32f, IceLen);
            iceR[l] = ice[l].GetComponent<Renderer>();
        }
        drops.Clear(); walkers.Clear();
        for (int i = 0; i < 8; i++)
        {
            var d = OiyoField.Quad("Falling", readyMat, root, 22f, 44f);
            d.gameObject.SetActive(false);
            drops.Add(d);
            var m = OiyoField.Quad("Mark", markMat, root, 44f, 6f);
            m.gameObject.SetActive(false);
            drops.Add(m);
        }
        for (int i = 0; i < WalkerCount; i++)
        {
            var w = OiyoField.Quad("Walker", i % 2 == 1 ? walkerB : walkerA, root, 46f, 56f);
            w.gameObject.SetActive(false);
            walkers.Add(w);
        }
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("icicle-knock", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        if (state == GameState.Playing)
        {
            bool end = Step(dt);
            foreach (var l in landedNow)
            {
                var at = field.W(LaneX(l.lane), GroundY - 4f, -0.4f);
                bursts.Emit(at, new Color(0.85f, 0.93f, 1f), 12, 2.4f, 0.12f, 0.5f, Vector3.up * 2f);
                if (l.bonk) { Toast(U("Ouch!"), new Color(1f, 0.45f, 0.4f)); synth.Tone(200f, 0.3f, Wave.Square, 0.12f, 110f, 6f); }
                else if (l.knocked) { Toast(U("Clink!"), new Color(0.55f, 0.85f, 1f)); synth.Tone(1175f, 0.12f, Wave.Triangle, 0.18f, 1568f, 9f); }
                else synth.Tone(300f, 0.15f, Wave.Noise, 0.08f, 200f, 10f);
            }
            if (snappedNow.Count > 0) Toast(U("Snap…"), new Color(0.75f, 0.78f, 0.82f));
            if (end) End();
        }
        msgT = Mathf.Max(0f, msgT - dt);
        Animate(dt);
    }

    string msg = ""; float msgT; Color msgC = Color.white;
    void Toast(string m, Color c) { msg = m; msgT = 0.8f; msgC = c; }

    void Tap(int lane)
    {
        string r = Knock(lane);
        if (r == "knocked") synth.Tone(660f, 0.08f, Wave.Triangle, 0.14f, 880f, 12f);
        else if (r == "too-small") Toast(U("Too small yet"), new Color(0.75f, 0.78f, 0.82f));
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
                    // taps are read once per frame: a tap knocks the icicle in that lane
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (state == GameState.Ready) { state = GameState.Playing; continue; }
                        if (field.ToField(b.pos, out Vector2 f)) Tap(Mathf.Clamp(Mathf.FloorToInt(f.x / LaneW), 0, Lanes - 1));
                    }
                    for (int l = 0; l < Lanes; l++)
                        if (Input.GetKeyDown(KeyCode.Alpha1 + l))
                        {
                            if (state == GameState.Ready) state = GameState.Playing;
                            Tap(l);
                        }
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
        if (won)
        {
            starsWon = StarsFor();
            state = GameState.Victory;
            OiyoArcade.Record(Slug, stageIdx, starsWon, Mathf.Max(0, Score), StageCount);
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
        field.Fit(90f, 40f, 4f);
        for (int l = 0; l < Lanes; l++)
        {
            bool show = wait[l] <= 0f;
            ice[l].gameObject.SetActive(show);
            if (!show) continue;
            float len = Mathf.Max(4f, Mathf.Min(size[l], Snap) / Snap * IceLen);
            ice[l].localScale = new Vector3(OiyoField.U(32f), OiyoField.U(len), 1f);
            ice[l].position = field.W(LaneX(l), EaveY + len * 0.5f, -0.4f);
            iceR[l].sharedMaterial = size[l] >= Snap - 0.18f ? dangerMat : size[l] >= Break ? readyMat : iceMat;
        }
        for (int k = 0; k < drops.Count / 2; k++)
        {
            bool on = k < falling.Count;
            drops[k * 2].gameObject.SetActive(on);
            drops[k * 2 + 1].gameObject.SetActive(on);
            if (!on) continue;
            var f = falling[k];
            float p = 1f - Mathf.Max(0f, f.hitAt - t) / Drop;
            float y = EaveY + 22f + (GroundY - EaveY - 44f) * p * p;
            drops[k * 2].position = field.W(LaneX(f.lane), y, -0.4f);
            drops[k * 2 + 1].position = field.W(LaneX(f.lane), GroundY - 3f, -0.45f);
        }
        for (int i = 0; i < walkers.Count; i++)
        {
            bool on = WalkerX(i, t, out float x);
            walkers[i].gameObject.SetActive(on);
            if (!on) continue;
            float bob = (Mathf.FloorToInt(t * 6f + i) % 2) * 2f;
            walkers[i].position = field.W(x, GroundY - 28f - bob, -0.8f);
        }
    }

    // ?oiyotest=1 prints the state to the browser console for the automated play check: each lane's
    // growth and regrow wait, every walker on screen (x and signed speed, field px), the score, and the
    // screen point of each lane's icicle (px from the top-left) to tap.
    bool testLog; float testT;
    void TestTick(float dt)
    {
        if (!testLog || (testT -= dt) > 0f) return;
        testT = 0.02f;
        var ws = new System.Text.StringBuilder();
        for (int i = 0; i < WalkerCount; i++)
        {
            if (!WalkerX(i, t, out float x)) continue;
            if (ws.Length > 0) ws.Append(',');
            ws.Append('[').Append(x.ToString("F1")).Append(',').Append(st.walkers[i * 3 + 2].ToString("F2")).Append(']');
        }
        var sz = new System.Text.StringBuilder();
        var lp = new System.Text.StringBuilder();
        for (int l = 0; l < Lanes; l++)
        {
            if (l > 0) { sz.Append(','); lp.Append(','); }
            sz.Append('[').Append(size[l].ToString("F3")).Append(',').Append(wait[l].ToString("F3")).Append(',').Append(st.grow[l].ToString("F4")).Append(']');
            var sp = cam.WorldToScreenPoint(field.W(LaneX(l), EaveY + 40f, -0.4f));
            lp.Append('[').Append(sp.x.ToString("F1")).Append(',').Append((Screen.height - sp.y).ToString("F1")).Append(']');
        }
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"t\":{t:F3},\"lanes\":[{sz}],\"walkers\":[{ws}],\"falling\":{falling.Count},\"knocked\":{knocked},\"bonks\":{bonks},\"score\":{Score},\"need\":{st.need},\"length\":{st.length:F2},\"tap\":[{lp}],\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.25f, 0.55f, 0.85f, 0.97f);
    static readonly Color Dark = new Color(0.07f, 0.1f, 0.18f, 0.88f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("Goal {0}", IcicleKnockStages.All[i].need);

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(0.75f, 0.9f, 1f), U("Icicle Knock"),
                U("Tap a cracked icicle to knock it down, but only when nobody will be under it when it lands."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        var bar = new Rect(8f, 8f, w - 16f, 64f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 12f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>  " + F("{0}s left", Mathf.Max(0, Mathf.CeilToInt(st.length - t))), 15, new Color(0.8f, 0.92f, 1f));
        OiyoArcade.Text(new Rect(20f, 36f, w - 90f, 24f), F("Score {0}/{1}", Score, st.need), 16, Color.white);
        if (OiyoArcade.Button(new Rect(w - 60f, 14f, 44f, 44f), "<b>II</b>", OiyoScreens.Slate, 18))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        // a growth bar over each icicle, with the knock-off tick
        if (state == GameState.Playing || state == GameState.Ready)
            for (int l = 0; l < Lanes; l++)
            {
                if (wait[l] > 0f) continue;
                var sp = cam.WorldToScreenPoint(field.W(LaneX(l), EaveY - 22f, -0.6f));
                var g = OiyoArcade.ToGui(new Vector2(sp.x, sp.y));
                var col = size[l] >= Snap - 0.18f ? new Color(0.98f, 0.32f, 0.32f) : size[l] >= Break ? new Color(0.25f, 0.75f, 0.34f) : new Color(0.45f, 0.75f, 0.99f);
                OiyoArcade.Bar(new Rect(g.x - 20f, g.y, 40f, 6f), Mathf.Min(1f, size[l] / Snap), new Color(0f, 0f, 0f, 0.55f), col);
                OiyoArcade.Fill(new Rect(g.x - 20f + 40f * Break / Snap, g.y - 2f, 1.5f, 10f), Color.white);
            }
        if (msgT > 0f) OiyoArcade.Shadowed(new Rect(8f, 80f, w - 16f, 36f), msg, 22, msgC, TextAnchor.MiddleCenter);
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap to start"), U("Knock icicles when the path below will be clear."), 200f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            bool w0 = state == GameState.Victory;
            string detail = w0 ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : F("Score {0}/{1}", Score, st.need);
            string body = $"<size=14>{F("{0} knocked · {1} bonked · {2} fell by themselves", knocked, bonks, snapped)}</size>";
            int r = OiyoScreens.Result(w, h, Dark, Accent, w0, ResultLive, w0 ? U("The lane is safe!") : U("Not enough points"), detail, body,
                w0 && stageIdx < StageCount - 1 ? U("Next stage") : null, w0 && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
