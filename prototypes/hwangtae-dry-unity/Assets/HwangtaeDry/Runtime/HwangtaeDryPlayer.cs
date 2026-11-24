using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Hwangtae Dry 3D: the web Hwangtae Dry (src/components/games/HwangtaeDry.tsx, src/lib/games/hwangtae-dry.ts)
// rebuilt in Unity on the web's own 360 × 560 px field (OiyoField). Six game hours pass each second. The air
// is the day's mean minus its swing × cos(2π(hour − 3)/24), blended toward the next day. An open rack feels the
// air (frost × its exposure); a covered one feels −2 + (air + 2) × 0.4. Fish follow at 0.35 per hour. Below −4
// they freeze; a frozen fish above 0.5 counts a cycle. Above +4 they spoil (0.05 per °C-hour), below −14 they
// freeze white (0.03 per °C-hour); either reaching 1 ends the run. The 30 winters are the web's own
// (HwangtaeDryStages.cs).
public class HwangtaeDryPlayer : MonoBehaviour
{
    const string Slug = "hwangtae-dry";
    const int StageCount = 30;
    const float HoursPerSec = 6f, Freeze = -4f, Thaw = 0.5f, Warm = 4f, Hard = -14f, Settle = 0.35f, CoverMid = -2f, CoverKeep = 0.4f;
    const float RackTop = 150f, RackBottom = 330f;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of hwangtae-dry.ts) ----------------
    HwangtaeDryStages.Level st;
    int stageIdx, starsWon, racks;
    float h;
    float[] fish, spoil, white;
    int[] cycles;
    bool[] frozen, covered;
    bool over, won;
    string fail = "";

    float Air(float hour)
    {
        int d = Mathf.Min(st.days - 1, Mathf.Max(0, Mathf.FloorToInt(hour / 24f)));
        int nd = Mathf.Min(st.days - 1, d + 1);
        float f = (hour % 24f) / 24f;
        float mean = st.mean[d] * (1f - f) + st.mean[nd] * f;
        float amp = st.amp[d] * (1f - f) + st.amp[nd] * f;
        return mean - amp * Mathf.Cos(2f * Mathf.PI * ((hour % 24f) - 3f) / 24f);
    }
    float Felt(int r, float hour, bool cov)
    {
        float a = Air(hour);
        if (cov) return CoverMid + (a - CoverMid) * CoverKeep;
        return a < 0f ? a * st.exposure[r] : a;
    }
    float Season => st.days * 24f;

    void NewYard()
    {
        racks = st.exposure.Length;
        h = 0f;
        float start = Air(0f);
        fish = new float[racks]; spoil = new float[racks]; white = new float[racks]; cycles = new int[racks]; frozen = new bool[racks]; covered = new bool[racks];
        for (int r = 0; r < racks; r++) { fish[r] = start; frozen[r] = start < Freeze; }
        over = false; won = false; fail = "";
    }

    void Toggle(int r) { if (!over && r >= 0 && r < racks) covered[r] = !covered[r]; }

    readonly List<int> cycledNow = new List<int>();
    bool Step(float dt)
    {
        cycledNow.Clear();
        if (over) return false;
        float left = dt * HoursPerSec;
        while (left > 1e-6f && !over)
        {
            float dh = Mathf.Min(0.1f, left);
            left -= dh;
            h += dh;
            for (int r = 0; r < racks; r++)
            {
                float target = Felt(r, h, covered[r]);
                fish[r] += (target - fish[r]) * Mathf.Min(1f, Settle * dh);
                float f = fish[r];
                if (f < Freeze) frozen[r] = true;
                else if (frozen[r] && f > Thaw) { frozen[r] = false; cycles[r]++; cycledNow.Add(r); }
                if (f > Warm) spoil[r] += (f - Warm) * 0.05f * dh;
                if (f < Hard) white[r] += (Hard - f) * 0.03f * dh;
                if (spoil[r] >= 1f) return Finish(false, "spoil");
                if (white[r] >= 1f) return Finish(false, "white");
            }
            bool all = true;
            for (int r = 0; r < racks; r++) if (cycles[r] < st.need) all = false;
            if (all) return Finish(true, "");
            if (h >= Season) return Finish(false, "short");
        }
        return false;
    }
    bool Finish(bool w, string f) { over = true; won = w; fail = f; return true; }

    int StarsFor()
    {
        if (!won) return 0;
        float worst = 0f;
        for (int r = 0; r < racks; r++) worst = Mathf.Max(worst, Mathf.Max(spoil[r], white[r]));
        bool fast = h <= Season * 0.8f;
        if (worst < 0.35f && fast) return 3;
        if (worst < 0.7f || fast) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    OiyoField field;
    Camera cam;
    Transform root;
    readonly List<List<Renderer>> fishR = new List<List<Renderer>>();
    readonly List<Transform> mats = new List<Transform>(), rolls = new List<Transform>();
    Material fishMat, goldMat, poleMat, matMat, hillMat, snowMat;
    Bursts bursts;
    Synth synth;
    bool showStages;

    float RackW => 360f / racks;

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(360f, 560f, new Color(0.07f, 0.09f, 0.2f));
        cam = field.Cam;
        OiyoField.Lights(new Color(0.55f, 0.58f, 0.65f), 0.8f, 35f, -25f);
        bursts = new Bursts(transform, 0.6f);
        synth = new Synth(gameObject);
        fishMat = OiyoField.Sprite("HD/fish");
        goldMat = OiyoField.Sprite("HD/fish_gold");
        poleMat = OiyoArcade.Lit(new Color(0.42f, 0.27f, 0.14f), 0.2f);
        matMat = OiyoArcade.Lit(Color.white, 0.1f, OiyoArcade.Art("HD/straw", true));
        hillMat = OiyoArcade.Lit(new Color(0.29f, 0.31f, 0.34f), 0.1f);
        snowMat = OiyoArcade.Lit(new Color(0.94f, 0.95f, 0.97f), 0.1f);
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int i, bool ready = true)
    {
        stageIdx = Mathf.Clamp(i, 0, StageCount - 1);
        StopAllCoroutines();
        st = HwangtaeDryStages.All[stageIdx];
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Yard").transform;
        NewYard();
        starsWon = 0;
        showStages = false;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Animate(0f);
    }

    void BuildScene()
    {
        // the valley behind, the snow in front, and the wooden racks hung with fish
        for (int k = 0; k < 4; k++)
        {
            var hill = OiyoArcade.Prim(PrimitiveType.Cube, "Hill", hillMat, root);
            hill.transform.position = field.W(-40f + k * 140f, 200f, 3f + k * 0.3f);
            hill.transform.rotation = Quaternion.Euler(0f, 0f, 45f);
            hill.transform.localScale = new Vector3(OiyoField.U(170f), OiyoField.U(170f), 0.5f);
        }
        var snow = OiyoArcade.Prim(PrimitiveType.Cube, "Snow", snowMat, root);
        snow.transform.position = field.W(180f, 420f, 0.5f);
        snow.transform.localScale = new Vector3(OiyoField.U(520f), OiyoField.U(200f), 2f);
        fishR.Clear(); mats.Clear(); rolls.Clear();
        for (int r = 0; r < racks; r++)
        {
            float x0 = r * RackW + 10f, x1 = (r + 1) * RackW - 10f;
            foreach (float px in new[] { x0 + 3f, x1 - 3f })
            {
                var pole = OiyoArcade.Prim(PrimitiveType.Cube, "Pole", poleMat, root);
                pole.transform.position = field.W(px, (RackTop + RackBottom) * 0.5f + 10f, 0f);
                pole.transform.localScale = new Vector3(OiyoField.U(6f), OiyoField.U(RackBottom - RackTop + 50f), 0.2f);
            }
            foreach (float py in new[] { RackTop - 8f, RackTop + 82f })
            {
                var bar = OiyoArcade.Prim(PrimitiveType.Cube, "Bar", poleMat, root);
                bar.transform.position = field.W((x0 + x1) * 0.5f, py, 0f);
                bar.transform.localScale = new Vector3(OiyoField.U(x1 - x0), OiyoField.U(6f), 0.2f);
            }
            var list = new List<Renderer>();
            for (int row = 0; row < 2; row++)
                for (float fx = x0 + 18f; fx < x1 - 10f; fx += 22f)
                {
                    var q = OiyoField.Quad("Fish", fishMat, root, 18f, 40f);
                    q.position = field.W(fx, RackTop + 30f + row * 90f, -0.1f);
                    list.Add(q.GetComponent<Renderer>());
                }
            fishR.Add(list);
            var mat = OiyoArcade.Prim(PrimitiveType.Cube, "Mat", matMat, root).transform;
            mat.position = field.W((x0 + x1) * 0.5f, (RackTop + RackBottom) * 0.5f - 6f, -0.35f);
            mat.localScale = new Vector3(OiyoField.U(x1 - x0 + 8f), OiyoField.U(RackBottom - RackTop + 20f), 0.08f);
            mats.Add(mat);
            var roll = OiyoArcade.Prim(PrimitiveType.Cylinder, "Rolled mat", matMat, root).transform;
            roll.position = field.W((x0 + x1) * 0.5f, RackTop - 18f, -0.3f);
            roll.rotation = Quaternion.Euler(0f, 0f, 90f);
            roll.localScale = new Vector3(OiyoField.U(14f), OiyoField.U((x1 - x0 + 8f) * 0.5f), OiyoField.U(14f));
            rolls.Add(roll);
        }
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("hwangtae-dry", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        if (state == GameState.Playing)
        {
            bool end = Step(dt);
            foreach (int r in cycledNow)
            {
                Toast(U("Froze and thawed +1"), new Color(1f, 0.8f, 0.3f));
                bursts.Emit(field.W((r + 0.5f) * RackW, RackTop + 60f, -0.6f), new Color(1f, 0.83f, 0.25f), 8, 1.5f, 0.1f, 0.5f, Vector3.up);
                synth.Tone(660f, 0.08f, Wave.Triangle, 0.12f, 880f, 12f);
            }
            if (end) End();
        }
        msgT = Mathf.Max(0f, msgT - dt);
        Animate(dt);
    }

    string msg = ""; float msgT; Color msgC = Color.white;
    void Toast(string m, Color c) { msg = m; msgT = 0.8f; msgC = c; }

    void Tap(int r)
    {
        Toggle(r);
        synth.Tone(covered[r] ? 300f : 420f, 0.08f, Wave.Noise, 0.08f, 200f, 10f);
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
                    // taps are read once per frame: a tap on a rack rolls its mat down or up
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (OiyoArcade.OverUi(b.pos)) continue;
                        if (state == GameState.Ready) { state = GameState.Playing; continue; }
                        if (field.ToField(b.pos, out Vector2 f)) Tap(Mathf.Clamp(Mathf.FloorToInt(f.x / RackW), 0, racks - 1));
                    }
                    for (int r = 0; r < racks; r++)
                        if (Input.GetKeyDown(KeyCode.Alpha1 + r))
                        {
                            if (state == GameState.Ready) state = GameState.Playing;
                            Tap(r);
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
            OiyoArcade.Record(Slug, stageIdx, starsWon, Mathf.CeilToInt(h / 24f), StageCount);
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
        field.Fit(80f, 30f, 6f);
        float hour = h % 24f;
        float day = Mathf.Max(0f, Mathf.Cos((hour - 13f) / 24f * Mathf.PI * 2f));
        cam.backgroundColor = Color.Lerp(new Color(0.07f, 0.09f, 0.2f), new Color(0.65f, 0.82f, 0.94f), day);
        for (int r = 0; r < racks; r++)
        {
            bool gold = cycles[r] * 2 >= st.need;
            foreach (var fr in fishR[r]) fr.sharedMaterial = gold ? goldMat : fishMat;
            mats[r].gameObject.SetActive(covered[r]);
            rolls[r].gameObject.SetActive(!covered[r]);
        }
    }

    // ?oiyotest=1 prints the state to the browser console for the automated play check: the hour, every
    // rack (fish °C, frozen, cycles, covered, spoil, white, the open air's highest and lowest over the next
    // 10 hours, and the screen point to tap), and the count.
    bool testLog; float testT;
    void TestTick(float dt)
    {
        if (!testLog || (testT -= dt) > 0f) return;
        testT = 0.02f;
        var sb = new System.Text.StringBuilder();
        for (int r = 0; r < racks; r++)
        {
            float hot = -99f, cold = 99f;
            for (float k = 0f; k <= 10f; k += 0.5f) { float t = Felt(r, h + k, false); hot = Mathf.Max(hot, t); cold = Mathf.Min(cold, t); }
            var sp = cam.WorldToScreenPoint(field.W((r + 0.5f) * RackW, (RackTop + RackBottom) * 0.5f, -0.4f));
            if (r > 0) sb.Append(',');
            sb.Append('[').Append(fish[r].ToString("F2")).Append(',').Append(frozen[r] ? 1 : 0).Append(',').Append(cycles[r]).Append(',').Append(covered[r] ? 1 : 0).Append(',')
              .Append(spoil[r].ToString("F3")).Append(',').Append(white[r].ToString("F3")).Append(',').Append(hot.ToString("F2")).Append(',').Append(cold.ToString("F2")).Append(',')
              .Append(sp.x.ToString("F1")).Append(',').Append((Screen.height - sp.y).ToString("F1")).Append(']');
        }
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"h\":{h:F2},\"racks\":[{sb}],\"need\":{st.need},\"season\":{Season:F0},\"fail\":\"{fail}\",\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.9f, 0.47f, 0f, 0.97f);
    static readonly Color Dark = new Color(0.08f, 0.1f, 0.18f, 0.88f);

    static Color TempColor(float t) => t > Warm ? new Color(0.98f, 0.32f, 0.32f) : t < Hard ? new Color(0.45f, 0.75f, 0.99f) : t < Freeze ? new Color(0.3f, 0.67f, 0.97f) : t > Thaw ? new Color(1f, 0.83f, 0.23f) : new Color(0.91f, 0.93f, 0.94f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("{0} times on every rack", HwangtaeDryStages.All[i].need);

    void OnGUI()
    {
        OiyoArcade.Begin();
        float w = OiyoArcade.W, hh = OiyoArcade.H;
        if (state == GameState.Menu)
        {
            if (showStages)
            {
                int pick = OiyoScreens.Stages(w, hh, Dark, Accent, Slug, StageCount, U("Choose a stage"), U("Back"), U("Stage"));
                if (pick == -2) showStages = false; else if (pick >= 0) LoadStage(pick);
                return;
            }
            int m = OiyoScreens.Menu(w, hh, Dark, Accent, new Color(1f, 0.9f, 0.6f), U("Hwangtae Dry"),
                U("Freeze by night, thaw by day. Tap a rack to roll its straw mat down for warm spells and hard frosts, and up again for the good days."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        var bar = new Rect(8f, 8f, w - 16f, 64f);
        OiyoArcade.Panel(bar, Dark);
        int dayNo = Mathf.FloorToInt(h / 24f) + 1;
        OiyoArcade.Text(new Rect(20f, 12f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>  " + F("Day {0} · {1} days left", dayNo, Mathf.Max(0, st.days - dayNo)), 15, new Color(1f, 0.9f, 0.6f));
        OiyoArcade.Text(new Rect(20f, 36f, w - 90f, 24f), $"{Mathf.FloorToInt(h % 24f):00}:00 · {Air(h):F1}°C   " + F("{0} times on every rack", st.need), 14, Color.white);
        if (OiyoArcade.Button(new Rect(w - 60f, 14f, 44f, 44f), "<b>II</b>", OiyoScreens.Slate, 18))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (state == GameState.Playing || state == GameState.Ready || state == GameState.Paused)
        {
            // each rack's dial under it
            for (int r = 0; r < racks; r++)
            {
                var a = OiyoArcade.ToGui(cam.WorldToScreenPoint(field.W(r * RackW + 10f, 350f, -0.4f)));
                var b = OiyoArcade.ToGui(cam.WorldToScreenPoint(field.W((r + 1) * RackW - 10f, 350f, -0.4f)));
                float rw = b.x - a.x;
                var box = new Rect(a.x, a.y, rw, 62f);
                OiyoArcade.Panel(box, Dark);
                OiyoArcade.Text(new Rect(box.x, box.y + 4f, rw, 20f), $"<b>{fish[r]:F1}°C {(frozen[r] ? "*" : "")}</b>", 14, TempColor(fish[r]), TextAnchor.UpperCenter);
                OiyoArcade.Text(new Rect(box.x, box.y + 22f, rw, 20f), $"<b>{cycles[r]}/{st.need}</b>", 15, Color.white, TextAnchor.UpperCenter);
                OiyoArcade.Bar(new Rect(box.x + 6f, box.y + 46f, rw * 0.5f - 9f, 7f), Mathf.Min(1f, spoil[r]), new Color(0f, 0f, 0f, 0.4f), new Color(0.98f, 0.32f, 0.32f));
                OiyoArcade.Bar(new Rect(box.x + rw * 0.5f + 3f, box.y + 46f, rw * 0.5f - 9f, 7f), Mathf.Min(1f, white[r]), new Color(0f, 0f, 0f, 0.4f), new Color(0.45f, 0.75f, 0.99f));
            }
            // the forecast: the windiest rack's open air for the next 24 hours, with the warm and frost zones
            var fr = new Rect(14f, hh - 110f, w - 28f, 86f);
            OiyoArcade.Panel(fr, Dark);
            OiyoArcade.Text(new Rect(fr.x + 8f, fr.y + 2f, fr.width, 16f), U("Next 24 hours"), 12, Color.white);
            float gx = fr.x + 8f, gw = fr.width - 16f, gy = fr.y + 20f, gh = fr.height - 26f;
            System.Func<float, float> ty = tt => gy + gh - (Mathf.Clamp(tt, -26f, 14f) + 26f) / 40f * gh;
            OiyoArcade.Fill(new Rect(gx, gy, gw, ty(Warm) - gy), new Color(0.98f, 0.32f, 0.32f, 0.3f));
            OiyoArcade.Fill(new Rect(gx, ty(Hard), gw, gy + gh - ty(Hard)), new Color(0.45f, 0.75f, 0.99f, 0.3f));
            OiyoArcade.Fill(new Rect(gx, ty(0f), gw, 1f), new Color(1f, 1f, 1f, 0.4f));
            for (int k = 0; k < 48; k++)
            {
                float tt = Felt(racks - 1, h + k * 0.5f, false);
                OiyoArcade.Fill(new Rect(gx + k / 48f * gw, ty(tt) - 1.5f, gw / 48f + 0.5f, 3f), new Color(1f, 0.83f, 0.23f));
            }
        }
        if (msgT > 0f) OiyoArcade.Shadowed(new Rect(8f, 80f, w - 16f, 36f), msg, 18, msgC, TextAnchor.MiddleCenter);
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, hh, Dark, U("Tap to start"), U("Mats down for warm spells and hard frosts, up for the rest."), 240f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, hh, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            bool w0 = state == GameState.Victory;
            string detail = w0 ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : "";
            string body = w0 ? $"<size=14>{F("Done in {0} days", Mathf.CeilToInt(h / 24f))}</size>" : "";
            string head = w0 ? U("Golden hwangtae, perfectly dried!") : fail == "spoil" ? U("A warm spell spoiled the fish") : fail == "white" ? U("A hard frost froze them white") : U("Winter ended before they dried");
            int r = OiyoScreens.Result(w, hh, Dark, Accent, w0, ResultLive, head, detail, body,
                w0 && stageIdx < StageCount - 1 ? U("Next stage") : null, w0 && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
