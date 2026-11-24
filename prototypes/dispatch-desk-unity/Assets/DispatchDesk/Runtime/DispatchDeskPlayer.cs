using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Dispatch Desk 3D: the web Dispatch Desk (src/components/games/DispatchDesk.tsx, src/lib/games/dispatch-desk.ts)
// rebuilt in Unity on the web's own 360 × 560 px field (OiyoField). The station is at (180, 300). Each call appears at
// its time with a kind (fire needs power, rescue care, chase speed), a level and a wait. A crew drives from the station
// at 70 + 16 × speed px/s; on arrival their matching skill adds to the call, which is handled once it reaches the
// level before the wait runs out. Everyone sent then drives back and rests 2 s. Handle the mark's worth of calls by
// the end of the shift. The 30 shifts are the web's own (DispatchDeskStages.cs).
public class DispatchDeskPlayer : MonoBehaviour
{
    const string Slug = "dispatch-desk";
    const int StageCount = 30;
    const float HQX = 180f, HQY = 300f, Rest = 2f, CardY = 484f, CardH = 68f;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of dispatch-desk.ts) ----------------
    // call status: 0 future, 1 waiting, 2 pending, 3 done, 4 missed; crew phase: 0 home, 1 out, 2 back
    DispatchDeskStages.Level st;
    int stageIdx, starsWon, handled, missed, crewN;
    float t;
    bool over, won;
    int[] status, arrived, phase, callOf;
    float[] arrive, until;
    List<int>[] sent;

    int Skill(int crew, int s) => st.skills[crew * 3 + s];
    float DriveSpeed(int crew) => 70f + Skill(crew, 2) * 16f;
    float DriveTime(int crew, int call) => Mathf.Sqrt((st.x[call] - HQX) * (st.x[call] - HQX) + (st.y[call] - HQY) * (st.y[call] - HQY)) / DriveSpeed(crew);
    float Deadline(int call) => st.at[call] + st.wait[call];
    bool Open(int i) => status[i] == 1 || status[i] == 2;
    bool Free(int c) => phase[c] == 0;

    void NewDesk()
    {
        crewN = st.skills.Length / 3;
        int n = st.at.Length;
        status = new int[n]; arrived = new int[n]; sent = new List<int>[n];
        for (int i = 0; i < n; i++) { status[i] = st.at[i] <= 0f ? 1 : 0; sent[i] = new List<int>(); }
        phase = new int[crewN]; callOf = new int[crewN]; arrive = new float[crewN]; until = new float[crewN];
        t = 0f; handled = 0; missed = 0; over = false; won = false;
    }

    // "sent", "busy", "closed"
    string Send(int crew, int call)
    {
        if (over || crew < 0 || crew >= crewN || call < 0 || call >= status.Length) return null;
        if (!Open(call)) return "closed";
        if (!Free(crew)) return "busy";
        phase[crew] = 1; callOf[crew] = call; arrive[crew] = t + DriveTime(crew, call);
        sent[call].Add(crew);
        status[call] = 2;
        return "sent";
    }

    void HomeFrom(int crew, int call, float from) { phase[crew] = 2; until[crew] = from + DriveTime(crew, call) + Rest; }

    readonly List<int> handledNow = new List<int>(), missedNow = new List<int>();
    bool Step(float dt)
    {
        handledNow.Clear(); missedNow.Clear();
        if (over) return false;
        t += dt;
        int n = status.Length;
        for (int i = 0; i < n; i++) if (status[i] == 0 && st.at[i] <= t) status[i] = 1;
        for (int c = 0; c < crewN; c++)
        {
            if (phase[c] == 1 && arrive[c] <= t)
            {
                int i = callOf[c];
                if (Open(i))
                {
                    arrived[i] += Skill(c, st.kind[i]);
                    if (arrived[i] >= st.level[i])
                    {
                        status[i] = 3;
                        handled++;
                        handledNow.Add(i);
                        foreach (int k in sent[i])
                            if (phase[k] == 1 && callOf[k] == i) HomeFrom(k, i, arrive[k] <= t ? t : arrive[k]);
                    }
                }
                if (phase[c] == 1) HomeFrom(c, i, t);
            }
            else if (phase[c] == 2 && until[c] <= t) phase[c] = 0;
        }
        for (int i = 0; i < n; i++)
            if (Open(i) && Deadline(i) <= t) { status[i] = 4; missed++; missedNow.Add(i); }
        bool allDone = true;
        for (int i = 0; i < n; i++) if (status[i] != 3 && status[i] != 4) allDone = false;
        if (t >= st.shift || allDone) { over = true; won = handled >= st.need; return true; }
        return false;
    }

    int StarsFor()
    {
        if (!won) return 0;
        if (handled >= st.par) return 3;
        if (handled > st.need) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    OiyoField field;
    Camera cam;
    Transform root, ring;
    readonly Dictionary<int, Transform> callIcons = new Dictionary<int, Transform>();
    readonly Dictionary<int, Transform> timers = new Dictionary<int, Transform>();
    Transform[] vans;
    Renderer[] cardR;
    Material blockMat, streetMat, cardHome, cardAway, ringMat, timerMat, timerLow, vanMat;
    readonly Material[] kindMat = new Material[3];
    Bursts sparks;
    Synth synth;
    bool showStages;
    int selected = -1;

    Rect CardRect(int k)
    {
        float w = (360f - 16f - (crewN - 1) * 6f) / crewN;
        return new Rect(8f + k * (w + 6f), CardY, w, CardH);
    }

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(360f, 560f, new Color(0.11f, 0.14f, 0.2f));
        cam = field.Cam;
        OiyoField.Lights(new Color(0.55f, 0.58f, 0.68f), 0.6f, 40f, -20f);
        sparks = new Bursts(transform, 0.5f);
        synth = new Synth(gameObject);
        blockMat = OiyoArcade.Lit(new Color(0.16f, 0.2f, 0.28f), 0.2f);
        streetMat = OiyoArcade.Lit(Color.white, 0.1f, OiyoArcade.Art("DD/street", true));
        cardHome = OiyoArcade.Lit(new Color(0.94f, 0.95f, 0.96f), 0.3f);
        cardAway = OiyoArcade.Lit(new Color(0.29f, 0.31f, 0.34f), 0.3f);
        ringMat = OiyoArcade.Lit(new Color(0.99f, 0.83f, 0.23f), 0.4f);
        timerMat = OiyoArcade.Lit(new Color(0.3f, 0.67f, 0.97f), 0.3f);
        timerLow = OiyoArcade.Lit(new Color(1f, 0.42f, 0.42f), 0.3f);
        vanMat = OiyoField.Sprite("DD/van");
        kindMat[0] = OiyoField.Sprite("DD/fire");
        kindMat[1] = OiyoField.Sprite("DD/rescue");
        kindMat[2] = OiyoField.Sprite("DD/chase");
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int i, bool ready = true)
    {
        stageIdx = Mathf.Clamp(i, 0, StageCount - 1);
        StopAllCoroutines();
        st = DispatchDeskStages.All[stageIdx];
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("City").transform;
        callIcons.Clear();
        timers.Clear();
        NewDesk();
        starsWon = 0;
        selected = -1;
        showStages = false;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Animate(0f);
    }

    Transform Box(Material m, float x, float y, float w, float h, float z, float depth)
    {
        var q = OiyoArcade.Prim(PrimitiveType.Cube, "Box", m, root).transform;
        q.position = field.W(x, y, z);
        q.localScale = new Vector3(OiyoField.U(w), OiyoField.U(h), depth);
        return q;
    }

    void BuildScene()
    {
        Box(streetMat, 180f, 280f, 2400f, 460f, 0.4f, 0.1f);
        for (int gx = -12; gx < 18; gx++)
            for (int gy = 0; gy < 7; gy++)
                Box(blockMat, 37f + gx * 58f, 117f + gy * 54f, 46f, 42f, 0.1f, 0.4f + ((gx * 7 + gy * 3) % 4) * 0.15f);
        var station = OiyoField.Quad("Station", OiyoField.Sprite("DD/station"), root, 40f, 34f);
        station.position = field.W(HQX, HQY, -0.5f);
        vans = new Transform[crewN];
        cardR = new Renderer[crewN];
        for (int k = 0; k < crewN; k++)
        {
            vans[k] = OiyoField.Quad("Van", vanMat, root, 24f, 18f);
            var r = CardRect(k);
            cardR[k] = Box(cardHome, r.center.x, r.center.y, r.width, r.height, -0.2f, 0.2f).GetComponent<Renderer>();
            for (int s = 0; s < 3; s++)
            {
                var col = s == 0 ? new Color(0.98f, 0.32f, 0.32f) : s == 1 ? new Color(0.25f, 0.75f, 0.34f) : new Color(0.3f, 0.67f, 0.97f);
                float bw = (r.width - 8f) * Skill(k, s) / 5f;
                Box(OiyoArcade.Lit(col, 0.3f), r.x + 4f + bw / 2f, r.y + 25f + s * 15f, bw, 10f, -0.35f, 0.05f);
            }
        }
        ring = Box(ringMat, 0f, 0f, 46f, 46f, 0.05f, 0.05f);
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("dispatch-desk", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        if (state == GameState.Playing)
        {
            bool end = Step(dt);
            foreach (int i in handledNow)
            {
                sparks.Emit(field.W(st.x[i], st.y[i], -0.6f), new Color(0.41f, 0.86f, 0.49f), 12, 3f, 0.07f, 0.6f);
                synth.Tone(880f, 0.12f, Wave.Triangle, 0.16f, 1175f, 8f);
                Toast(U("Handled!"), new Color(0.6f, 1f, 0.6f));
                if (selected == i) selected = -1;
            }
            foreach (int i in missedNow)
            {
                synth.Tone(200f, 0.3f, Wave.Square, 0.1f, 120f, 5f);
                Toast(U("Missed"), new Color(1f, 0.5f, 0.45f));
                if (selected == i) selected = -1;
            }
            if (selected < 0 || !Open(selected)) selected = MostUrgent();
            if (end) End();
        }
        msgT = Mathf.Max(0f, msgT - dt);
        Animate(dt);
    }

    int MostUrgent()
    {
        int best = -1;
        for (int i = 0; i < status.Length; i++) if (status[i] == 1 && (best < 0 || Deadline(i) < Deadline(best))) best = i;
        return best;
    }

    string msg = ""; float msgT; Color msgC = Color.white;
    void Toast(string m, Color c) { msg = m; msgT = 0.9f; msgC = c; }

    void DoSend(int crew)
    {
        if (selected < 0 || !Open(selected)) { Toast(U("Pick a call first"), new Color(1f, 0.6f, 0.3f)); return; }
        string r = Send(crew, selected);
        if (r == "sent") synth.Tone(620f, 0.06f, Wave.Triangle, 0.12f, 820f, 10f);
        else if (r == "busy") Toast(U("Already out"), new Color(1f, 0.6f, 0.3f));
    }

    void Tap(Vector2 f)
    {
        if (state == GameState.Ready) state = GameState.Playing;
        for (int k = 0; k < crewN; k++)
        {
            var r = CardRect(k);
            if (f.x >= r.x && f.x <= r.xMax && f.y >= r.y - 6f && f.y <= r.yMax) { DoSend(k); return; }
        }
        int best = -1; float bestD = 30f;
        for (int i = 0; i < status.Length; i++)
        {
            if (!Open(i)) continue;
            float d = Vector2.Distance(new Vector2(st.x[i], st.y[i]), f);
            if (d < bestD) { best = i; bestD = d; }
        }
        if (best >= 0) selected = best;
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
                    // taps are read once per frame: a call is picked, a crew card sends that crew
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (OiyoArcade.OverUi(b.pos) || !field.ToField(b.pos, out Vector2 f)) continue;
                        Tap(f);
                    }
                    if (Input.GetKeyDown(KeyCode.LeftArrow) || Input.GetKeyDown(KeyCode.RightArrow))
                    {
                        if (state == GameState.Ready) state = GameState.Playing;
                        var live = new List<int>();
                        for (int i = 0; i < status.Length; i++) if (Open(i)) live.Add(i);
                        if (live.Count > 0)
                        {
                            int at = live.IndexOf(selected), by = Input.GetKeyDown(KeyCode.LeftArrow) ? -1 : 1;
                            selected = live[((at < 0 ? 0 : at) + by + live.Count) % live.Count];
                        }
                    }
                    for (int k = 0; k < Mathf.Min(6, crewN); k++) if (Input.GetKeyDown(KeyCode.Alpha1 + k)) { if (state == GameState.Ready) state = GameState.Playing; DoSend(k); }
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
            OiyoArcade.Record(Slug, stageIdx, starsWon, handled, StageCount);
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
        for (int i = 0; i < status.Length; i++)
        {
            bool open = Open(i);
            if (open && !callIcons.ContainsKey(i))
            {
                var ic = OiyoField.Quad("Call", kindMat[st.kind[i]], root, 26f, 26f);
                ic.position = field.W(st.x[i], st.y[i] - 2f, -0.6f);
                callIcons[i] = ic;
                timers[i] = Box(timerMat, st.x[i], st.y[i] + 20f, 34f, 5f, -0.6f, 0.05f);
                synth.Tone(980f, 0.05f, Wave.Square, 0.06f, 0f, 16f);
            }
            if (!open && callIcons.ContainsKey(i))
            {
                Destroy(callIcons[i].gameObject); Destroy(timers[i].gameObject);
                callIcons.Remove(i); timers.Remove(i);
            }
            if (open)
            {
                float left = Mathf.Clamp01((Deadline(i) - t) / st.wait[i]);
                var tm = timers[i];
                tm.localScale = new Vector3(OiyoField.U(Mathf.Max(1f, 34f * left)), OiyoField.U(5f), 0.05f);
                tm.position = field.W(st.x[i] - 17f + 17f * left, st.y[i] + 20f, -0.6f);
                tm.GetComponent<Renderer>().sharedMaterial = left < 0.3f ? timerLow : timerMat;
                callIcons[i].localScale = Vector3.one * OiyoField.U(26f) * (1f + (left < 0.3f ? Mathf.Sin(Time.time * 14f) * 0.08f : 0f));
            }
        }
        ring.gameObject.SetActive(selected >= 0 && Open(selected));
        if (selected >= 0 && Open(selected)) ring.position = field.W(st.x[selected], st.y[selected], 0.05f);
        for (int k = 0; k < crewN; k++)
        {
            cardR[k].sharedMaterial = phase[k] == 0 ? cardHome : cardAway;
            bool out_ = phase[k] == 1;
            vans[k].gameObject.SetActive(out_);
            if (out_)
            {
                int c = callOf[k];
                float tt = DriveTime(k, c), p = Mathf.Clamp01(1f - (arrive[k] - t) / tt);
                vans[k].position = field.W(HQX + (st.x[c] - HQX) * p, HQY + (st.y[c] - HQY) * p, -0.7f - k * 0.01f);
                vans[k].localScale = new Vector3(OiyoField.U(24f) * (st.x[c] < HQX ? -1f : 1f), OiyoField.U(18f), 1f);
            }
        }
    }

    // ---------------- Test hints (the web's dispatcher, for the automated play check) ----------------
    // the crew the web's dispatcher would send to a call now: one good enough (least overqualified), else the best pair
    List<int> ChooseCrew(int call)
    {
        int skill = st.kind[call], need = st.level[call] - arrived[call];
        var idle = new List<int>();
        for (int k = 0; k < crewN; k++) if (Free(k) && t + DriveTime(k, call) < Deadline(call)) idle.Add(k);
        int single = -1;
        foreach (int k in idle)
            if (Skill(k, skill) >= need && (single < 0 || Skill(k, skill) < Skill(single, skill) || (Skill(k, skill) == Skill(single, skill) && DriveTime(k, call) < DriveTime(single, call)))) single = k;
        if (single >= 0) return new List<int> { single };
        idle.Sort((a, b) => Skill(b, skill) - Skill(a, skill));
        if (idle.Count >= 2 && Skill(idle[0], skill) + Skill(idle[1], skill) >= need) return new List<int> { idle[0], idle[1] };
        return new List<int>();
    }

    // ?oiyotest=1 prints the state to the browser console for the automated play check: the clock, the counts, the call
    // the dispatcher would handle next with the crew it would send, and screen points (px from the top-left) of that
    // call and of every crew card.
    bool testLog; float testT;
    Vector2 Scr(Vector2 f) { var sp = cam.WorldToScreenPoint(field.W(f.x, f.y, -0.3f)); return new Vector2(sp.x, Screen.height - sp.y); }
    void TestTick(float dt)
    {
        if (!testLog || (testT -= dt) > 0f) return;
        testT = 0.05f;
        int call = -1; List<int> crew = new List<int>();
        var order = new List<int>();
        for (int i = 0; i < status.Length; i++) if (status[i] == 1) order.Add(i);
        order.Sort((a, b) => Deadline(a).CompareTo(Deadline(b)));
        foreach (int i in order) { var c = ChooseCrew(i); if (c.Count > 0) { call = i; crew = c; break; } }
        var cp = call >= 0 ? Scr(new Vector2(st.x[call], st.y[call])) : Vector2.zero;
        var cards = new System.Text.StringBuilder();
        for (int k = 0; k < crewN; k++) { if (k > 0) cards.Append(','); var p = Scr(CardRect(k).center); cards.Append('[').Append(p.x.ToString("F1")).Append(',').Append(p.y.ToString("F1")).Append(']'); }
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"t\":{t:F2},\"handled\":{handled},\"missed\":{missed},\"need\":{st.need},\"selected\":{selected},\"call\":{call},\"crew\":[{string.Join(",", crew)}],\"callAt\":[{cp.x:F1},{cp.y:F1}],\"cards\":[{cards}],\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.79f, 0.16f, 0.16f, 0.97f);
    static readonly Color Dark = new Color(0.07f, 0.1f, 0.16f, 0.9f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("Handled {0}/{1}", DispatchDeskStages.All[i].need, DispatchDeskStages.All[i].at.Length);

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(0.95f, 0.96f, 0.98f), U("Dispatch Desk"),
                U("Tap a call, then the crew to send. Power for fires, care for rescues, speed for chases. Crews rest after every call."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        var bar = new Rect(8f, 8f, w - 16f, 64f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 12f, w - 150f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>  " + F("Handled {0}/{1}", handled, st.need), 15, new Color(0.95f, 0.96f, 0.98f));
        OiyoArcade.Text(new Rect(w - 130f, 12f, 60f, 22f), F("{0}s", Mathf.Max(0, Mathf.CeilToInt(st.shift - t))), 15, Color.white, TextAnchor.UpperRight);
        OiyoArcade.Text(new Rect(20f, 38f, w - 90f, 22f), $"<color=#ff6b6b><b>|</b></color> {U("Power")}   <color=#51cf66><b>|</b></color> {U("Care")}   <color=#4dabf7><b>|</b></color> {U("Speed")}", 13, Color.white);
        if (OiyoArcade.Button(new Rect(w - 60f, 14f, 44f, 44f), "<b>II</b>", OiyoScreens.Slate, 18))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (state == GameState.Playing || state == GameState.Ready)
        {
            for (int i = 0; i < status.Length; i++)
            {
                if (!Open(i)) continue;
                var g = OiyoArcade.ToGui(cam.WorldToScreenPoint(field.W(st.x[i] + 15f, st.y[i] - 14f, -0.7f)));
                OiyoArcade.Shadowed(new Rect(g.x - 12f, g.y - 10f, 24f, 20f), $"<b>{st.level[i] - arrived[i]}</b>", 14, Color.white, TextAnchor.MiddleCenter);
            }
            for (int k = 0; k < crewN; k++)
            {
                var r = CardRect(k);
                var g = OiyoArcade.ToGui(cam.WorldToScreenPoint(field.W(r.x + 4f, r.y + 2f, -0.4f)));
                string ph = phase[k] == 0 ? U("Ready") : phase[k] == 1 ? U("Out") : U("Back");
                OiyoArcade.Text(new Rect(g.x, g.y, 80f, 18f), $"<b>{k + 1}</b> {ph}", 11, phase[k] == 0 ? new Color(0.13f, 0.15f, 0.16f) : Color.white);
            }
        }
        if (msgT > 0f) OiyoArcade.Shadowed(new Rect(8f, 76f, w - 16f, 30f), msg, 18, msgC, TextAnchor.MiddleCenter);
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap to start"), U("The right crew, right on time."), 200f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            bool w0 = state == GameState.Victory;
            string detail = w0 ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : "";
            string body = $"<size=14>{F("{0} handled · {1} missed", handled, missed)}</size>";
            int r = OiyoScreens.Result(w, h, Dark, Accent, w0, ResultLive, w0 ? U("Shift over! The city is safe") : U("Too many calls missed"), detail, body,
                w0 && stageIdx < StageCount - 1 ? U("Next stage") : null, w0 && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
