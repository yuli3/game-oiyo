using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Bead Parade 3D: the web Bead Parade (src/components/games/BeadParade.tsx, src/lib/games/bead-parade.ts) rebuilt in
// Unity on the web's own 360 × 560 px field (OiyoField). A parade of beads rolls along a spiral toward the burrow;
// tap where to shoot from the flower launcher in the middle, and make three of a colour to pop them. The physics runs
// on the web's fixed 1/120 s steps, in doubles like the web; the 30 parades are the web's own (BeadParadeStages.cs).
public class BeadParadePlayer : MonoBehaviour
{
    const string Slug = "bead-parade";
    const int StageCount = 30;
    const double R = 11, D = 22, DT = 1.0 / 120, ShotSpeed = 720, Reload = 0.22, Rush = 1.4;
    const double SX = 180, SY = 320;
    static readonly Color[] BeadColors = { C("#fa5252"), C("#fcc419"), C("#339af0"), C("#51cf66"), C("#cc5de8") };
    static Color C(string hex) { ColorUtility.TryParseHtmlString(hex, out Color c); return c; }

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of bead-parade.ts) ----------------
    class Bead { public double s; public int c; }
    class Shot { public double x, y, vx, vy; public int c; }
    BeadParadeStages.Level st;
    int stageIdx, starsWon, shots, popped, current, next, nPts;
    double t, reload, reach, total;
    double[] lens;
    List<Bead> beads;
    Shot shot;
    Func<double> rng;
    bool over, won;

    void PointAt(double s, out double x, out double y)
    {
        if (s <= 0) { x = st.track[0]; y = st.track[1]; return; }
        if (s >= total) { x = st.track[2 * (nPts - 1)]; y = st.track[2 * (nPts - 1) + 1]; return; }
        int lo = 0, hi = nPts - 1;
        while (hi - lo > 1) { int mid = (lo + hi) >> 1; if (lens[mid] <= s) lo = mid; else hi = mid; }
        double k = (s - lens[lo]) / Math.Max(1e-9, lens[hi] - lens[lo]);
        x = st.track[2 * lo] + (st.track[2 * hi] - st.track[2 * lo]) * k;
        y = st.track[2 * lo + 1] + (st.track[2 * hi + 1] - st.track[2 * lo + 1]) * k;
    }

    List<int> Present()
    {
        var set = new SortedSet<int>();
        foreach (var b in beads) set.Add(b.c);
        return new List<int>(set);
    }

    int Draw()
    {
        var cs = Present();
        if (cs.Count == 0) return 0;
        return cs[(int)Math.Floor(rng() * cs.Count)];
    }

    bool CanShoot() => !over && shot == null && reload <= 0;

    bool Shoot(double x, double y)
    {
        if (!CanShoot()) return false;
        double d = Math.Sqrt((x - SX) * (x - SX) + (y - SY) * (y - SY));
        if (d < 1) return false;
        shot = new Shot { x = SX, y = SY, vx = (x - SX) / d * ShotSpeed, vy = (y - SY) / d * ShotSpeed, c = current };
        current = next;
        next = Draw();
        reload = Reload;
        shots++;
        return true;
    }

    int PopAt(int i)
    {
        int c = beads[i].c, a = i, b = i;
        while (a > 0 && beads[a - 1].c == c && beads[a].s - beads[a - 1].s <= D + 0.5) a--;
        while (b < beads.Count - 1 && beads[b + 1].c == c && beads[b + 1].s - beads[b].s <= D + 0.5) b++;
        int n = b - a + 1;
        if (n < 3) return 0;
        beads.RemoveRange(a, n);
        popped += n;
        return n;
    }

    void Step(out int poppedNow, out bool landed)
    {
        poppedNow = 0; landed = false;
        if (over) return;
        t += DT;
        reload = Math.Max(0, reload - DT);
        // groups of touching beads, back to front
        var g = new List<int[]>();
        int start = 0;
        for (int i = 1; i <= beads.Count; i++)
            if (i == beads.Count || beads[i].s - beads[i - 1].s > D + 0.5) { g.Add(new[] { start, i - 1 }); start = i; }
        if (g.Count > 0)
        {
            double v = t < Rush ? st.speed * 5 : st.speed;
            for (int i = g[0][0]; i <= g[0][1]; i++) beads[i].s += v * DT;
            for (int i = g[0][1] + 1; i < beads.Count; i++) if (beads[i].s - beads[i - 1].s < D) beads[i].s = beads[i - 1].s + D;
            for (int k = 1; k < g.Count; k++)
            {
                int ga = g[k][0], behind = ga - 1;
                if (behind < 0 || beads[behind].c != beads[ga].c) continue;
                double pull = Math.Min(260 * DT, beads[ga].s - beads[behind].s - D);
                if (pull <= 0) continue;
                for (int i = ga; i <= g[k][1]; i++) beads[i].s -= pull;
            }
            for (int i = 1; i < beads.Count; i++)
            {
                if (beads[i].s - beads[i - 1].s <= D + 0.5 && beads[i].c == beads[i - 1].c)
                {
                    int before = beads.Count;
                    int n = PopAt(i);
                    if (n > 0)
                    {
                        poppedNow += n;
                        i = Math.Max(0, i - n);
                        if (beads.Count != before) continue;
                    }
                }
            }
        }
        if (shot != null)
        {
            shot.x += shot.vx * DT;
            shot.y += shot.vy * DT;
            int hit = -1;
            double best = 2 * R;
            for (int i = 0; i < beads.Count; i++)
            {
                if (beads[i].s < 0) continue;
                PointAt(beads[i].s, out double bx, out double by);
                double d = Math.Sqrt((bx - shot.x) * (bx - shot.x) + (by - shot.y) * (by - shot.y));
                if (d < best) { best = d; hit = i; }
            }
            if (hit >= 0)
            {
                var hb = beads[hit];
                PointAt(hb.s, out double hx, out double hy);
                PointAt(hb.s + 4, out double ax, out double ay);
                bool ahead = (shot.x - hx) * (ax - hx) + (shot.y - hy) * (ay - hy) > 0;
                int at = ahead ? hit + 1 : hit;
                double s = ahead ? hb.s + D : hb.s;
                int end = at;
                while (end < beads.Count && (end == at || beads[end].s - beads[end - 1].s <= D + 0.5)) end++;
                for (int i = at; i < end; i++) beads[i].s += D;
                beads.Insert(at, new Bead { s = s, c = shot.c });
                for (int i = end + 1; i < beads.Count; i++) if (beads[i].s - beads[i - 1].s < D) beads[i].s = beads[i - 1].s + D;
                shot = null;
                landed = true;
                poppedNow += PopAt(at);
                var pr = Present();
                if (!pr.Contains(current)) current = Draw();
                if (!Present().Contains(next)) next = Draw();
            }
            else if (shot.x < -20 || shot.x > 380 || shot.y < -20 || shot.y > 580) shot = null;
        }
        double front = beads.Count > 0 ? beads[beads.Count - 1].s : 0;
        reach = Math.Max(reach, front / total);
        if (beads.Count == 0) { over = true; won = true; }
        else if (front >= total) over = true;
    }

    int StarsFor()
    {
        if (!won) return 0;
        if (reach < 0.7) return 3;
        if (reach < 0.88) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    OiyoField field;
    Camera cam;
    Transform root, shotObj, curObj, nextObj, aimObj;
    readonly List<Transform> beadObj = new List<Transform>();
    Material[] beadMat;
    Bursts burst;
    Synth synth;
    bool showStages, keyed;
    double acc, aimA = -Math.PI / 2;

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(360f, 560f, new Color(0.83f, 0.98f, 0.85f));
        cam = field.Cam;
        OiyoField.Lights(new Color(0.72f, 0.72f, 0.72f), 0.8f, 50f, -25f);
        burst = new Bursts(transform, 0.5f);
        synth = new Synth(gameObject);
        beadMat = new Material[BeadColors.Length];
        for (int k = 0; k < BeadColors.Length; k++) beadMat[k] = OiyoArcade.Lit(BeadColors[k], 0.7f);
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int i, bool ready = true)
    {
        stageIdx = Mathf.Clamp(i, 0, StageCount - 1);
        StopAllCoroutines();
        st = BeadParadeStages.All[stageIdx];
        nPts = st.track.Length / 2;
        lens = new double[nPts];
        for (int k = 1; k < nPts; k++)
        {
            double dx = st.track[2 * k] - st.track[2 * k - 2], dy = st.track[2 * k + 1] - st.track[2 * k - 1];
            lens[k] = lens[k - 1] + Math.Sqrt(dx * dx + dy * dy);
        }
        total = lens[nPts - 1];
        // the whole parade queued up behind the entrance, front bead first in
        beads = new List<Bead>();
        for (int k = st.beads.Length - 1; k >= 0; k--) beads.Add(new Bead { s = -(k * D), c = st.beads[k] });
        rng = OiyoField.Mulberry(st.seed);
        t = 0; shot = null; reload = 0; shots = 0; popped = 0; reach = 0; over = false; won = false; starsWon = 0; acc = 0; planAt = 0; keyed = false;
        current = Draw();
        next = Draw();
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Lawn").transform;
        beadObj.Clear();
        showStages = false;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Animate();
    }

    Transform Box(string name, Material m, float x, float y, float w, float h, float z, float d)
    {
        var o = OiyoArcade.Prim(PrimitiveType.Cube, name, m, root).transform;
        o.localScale = new Vector3(OiyoField.U(w), OiyoField.U(h), d);
        o.position = field.W(x, y, z);
        return o;
    }

    void BuildScene()
    {
        Box("Lawn", OiyoArcade.Glow(new Color(0.83f, 0.98f, 0.85f)), 180f, 280f, 1200f, 1600f, 0.8f, 0.2f);
        var dot = OiyoArcade.Glow(new Color(0.7f, 0.95f, 0.73f));
        for (int y = 0; y < 600; y += 28) for (int x = (y / 28) % 2 == 0 ? 14 : 0; x < 380; x += 28) Box("Dot", dot, x + 3f, y + 3f, 6f, 6f, 0.7f, 0.02f);
        // the dirt track, as short pieces between its points
        var dirt = OiyoArcade.Glow(new Color(0.91f, 0.77f, 0.42f));
        for (int k = 1; k < nPts; k += 2)
        {
            float x0 = (float)st.track[2 * k - 2], y0 = (float)st.track[2 * k - 1], x1 = (float)st.track[2 * Math.Min(nPts - 1, k + 1)], y1 = (float)st.track[2 * Math.Min(nPts - 1, k + 1) + 1];
            float len = Mathf.Sqrt((x1 - x0) * (x1 - x0) + (y1 - y0) * (y1 - y0));
            var seg = Box("Track", dirt, (x0 + x1) / 2f, (y0 + y1) / 2f, len + 26f, 28f, 0.5f, 0.02f);
            seg.rotation = Quaternion.Euler(0f, 0f, -Mathf.Atan2(y1 - y0, x1 - x0) * Mathf.Rad2Deg);
        }
        OiyoField.Quad("Burrow", OiyoField.Sprite("BD/burrow"), root, 40f, 40f).position = field.W((float)st.track[2 * (nPts - 1)], (float)st.track[2 * (nPts - 1) + 1], 0.3f);
        OiyoField.Quad("Launcher", OiyoField.Sprite("BD/launcher"), root, 48f, 48f).position = field.W((float)SX, (float)SY, -0.2f);
        curObj = OiyoArcade.Prim(PrimitiveType.Sphere, "Current", beadMat[0], root).transform;
        curObj.localScale = Vector3.one * OiyoField.U(18f);
        curObj.position = field.W((float)SX, (float)SY - 2f, -0.4f);
        nextObj = OiyoArcade.Prim(PrimitiveType.Sphere, "Next", beadMat[0], root).transform;
        nextObj.localScale = Vector3.one * OiyoField.U(10f);
        nextObj.position = field.W((float)SX, (float)SY + 34f, -0.4f);
        shotObj = OiyoArcade.Prim(PrimitiveType.Sphere, "Shot", beadMat[0], root).transform;
        shotObj.localScale = Vector3.one * OiyoField.U((float)(2 * R));
        aimObj = Box("Aim", OiyoArcade.Glow(new Color(0.29f, 0.31f, 0.34f)), 0f, 0f, 120f, 2f, -0.1f, 0.02f);
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("bead-parade", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick();
        ReadInput();
        if (state == GameState.Playing && !over)
        {
            acc += dt;
            while (acc >= DT && !over)
            {
                // the play check holds the parade at each planned shot until the bot has fired it
                if (testLog && Due()) { acc = Math.Min(acc, DT); break; }
                acc -= DT;
                Step(out int n, out bool landed);
                if (n > 0) { synth.Tone(n > 3 ? 1175f : 988f, 0.08f, Wave.Triangle, 0.12f); }
                else if (landed) synth.Tone(523f, 0.04f, Wave.Triangle, 0.06f);
            }
            if (over) End();
        }
        Animate();
    }

    void Fire(double x, double y)
    {
        if (state != GameState.Playing) return;
        // the play check's taps land on the plan's own aim (a screen pixel can't carry it exactly)
        if (testLog && planAt < st.plan.Length / 3)
        {
            double px = st.plan[3 * planAt + 1], py = st.plan[3 * planAt + 2];
            if (Math.Abs(px - x) < 6 && Math.Abs(py - y) < 6) { x = px; y = py; }
        }
        if (Shoot(x, y)) { planAt++; synth.Tone(660f, 0.04f, Wave.Triangle, 0.08f, 880f); }
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
                    // input is read once per frame: a tap is a shot toward it
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (state == GameState.Ready) { state = GameState.Playing; continue; }
                        if (OiyoArcade.OverUi(b.pos) || !field.ToField(b.pos, out Vector2 f)) continue;
                        keyed = false;
                        aimA = Math.Atan2(f.y - SY, f.x - SX);
                        Fire(f.x, f.y);
                    }
                    if (Input.GetKey(KeyCode.LeftArrow)) { aimA -= Math.PI / 60 * Time.deltaTime * 20; keyed = true; }
                    if (Input.GetKey(KeyCode.RightArrow)) { aimA += Math.PI / 60 * Time.deltaTime * 20; keyed = true; }
                    if (Input.GetKeyDown(KeyCode.Space) || confirm)
                    {
                        if (state == GameState.Ready) state = GameState.Playing;
                        else { keyed = true; Fire(SX + Math.Cos(aimA) * 100, SY + Math.Sin(aimA) * 100); }
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
            OiyoArcade.Record(Slug, stageIdx, starsWon, popped * 10, StageCount);
            burst.Emit(field.W((float)SX, (float)SY, -1f), new Color(1f, 0.83f, 0.23f), 40, 4f, 0.1f, 1f);
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
        field.Fit(56f, 60f, 0f, 90f, 545f);
        while (beadObj.Count < beads.Count + 4)
        {
            var o = OiyoArcade.Prim(PrimitiveType.Sphere, "Bead", beadMat[0], root).transform;
            o.localScale = Vector3.one * OiyoField.U((float)(2 * R));
            beadObj.Add(o);
        }
        for (int k = 0; k < beadObj.Count; k++)
        {
            bool on = k < beads.Count && beads[k].s >= 0;
            beadObj[k].gameObject.SetActive(on);
            if (!on) continue;
            PointAt(beads[k].s, out double x, out double y);
            beadObj[k].position = field.W((float)x, (float)y, -0.3f);
            beadObj[k].GetComponent<Renderer>().sharedMaterial = beadMat[beads[k].c];
        }
        shotObj.gameObject.SetActive(shot != null);
        if (shot != null) { shotObj.position = field.W((float)shot.x, (float)shot.y, -0.35f); shotObj.GetComponent<Renderer>().sharedMaterial = beadMat[shot.c]; }
        curObj.GetComponent<Renderer>().sharedMaterial = beadMat[current];
        nextObj.GetComponent<Renderer>().sharedMaterial = beadMat[next];
        aimObj.gameObject.SetActive(keyed && !over);
        aimObj.position = field.W((float)(SX + Math.Cos(aimA) * 60), (float)(SY + Math.Sin(aimA) * 60), -0.1f);
        aimObj.rotation = Quaternion.Euler(0f, 0f, (float)(-aimA * Mathf.Rad2Deg));
    }

    // ?oiyotest=1 prints the state to the browser console every frame for the automated play check. When the parade's
    // own plan says to shoot, it gives the screen point to tap, and the parade waits for it.
    bool testLog; int planAt;
    bool Due() => planAt < st.plan.Length / 3 && t >= st.plan[3 * planAt] - 1e-9 && CanShoot();
    void TestTick()
    {
        if (!testLog) return;
        string nx = "null";
        if (state == GameState.Playing && !over && Due())
        {
            var sp = cam.WorldToScreenPoint(field.W((float)st.plan[3 * planAt + 1], (float)st.plan[3 * planAt + 2], 0f));
            nx = $"[{sp.x:F2},{Screen.height - sp.y:F2}]";
        }
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"taps\":{shots},\"left\":{beads.Count},\"reach\":{reach:F3},\"next\":{nx},\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.97f, 0.51f, 0.67f, 0.97f);
    static readonly Color Dark = new Color(0.07f, 0.2f, 0.1f, 0.9f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("{0} beads", BeadParadeStages.All[i].beads.Length);

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(0.95f, 1f, 0.95f), U("Bead Parade"),
                U("A parade of beads rolls along the spiral toward the burrow. Tap where to shoot from the launcher; three of a colour pop. Clear the parade before the front bead gets there."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        var bar = new Rect(8f, 8f, w - 16f, 44f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 18f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>  " + F("Beads left {0}", beads.Count), 15, new Color(0.95f, 1f, 0.95f));
        float rr = (float)Math.Min(1, beads.Count > 0 ? Math.Max(0, beads[beads.Count - 1].s) / total : 0);
        OiyoArcade.Bar(new Rect(16f, 58f, w - 32f, 6f), rr, new Color(0.2f, 0.23f, 0.25f), rr > 0.88f ? new Color(0.98f, 0.32f, 0.32f) : rr > 0.7f ? new Color(0.98f, 0.69f, 0.02f) : new Color(0.32f, 0.81f, 0.4f));
        if (OiyoArcade.Button(new Rect(w - 56f, 12f, 40f, 36f), "<b>II</b>", OiyoScreens.Slate, 16))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap to start"), U("Tap where to shoot!"), 110f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            string detail = won ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : "";
            string body = won ? $"<size=14>{F("Cleared with {0} shots", shots)}</size>" : "";
            int r = OiyoScreens.Result(w, h, Dark, Accent, won, ResultLive, won ? U("The whole parade popped!") : U("A bead reached the burrow"), detail, body,
                won && stageIdx < StageCount - 1 ? U("Next stage") : null, won && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
