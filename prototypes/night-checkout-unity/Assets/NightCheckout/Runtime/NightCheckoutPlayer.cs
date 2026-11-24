using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Night Checkout 3D: the web Night Checkout (src/components/games/NightCheckout.tsx, src/lib/games/night-checkout.ts)
// rebuilt in Unity on the web's own 360 × 560 px field (OiyoField). Customers queue at a corner shop's till at night.
// Tap each item to scan it (buy-one-get-one-free: every second one of a kind is free). Card payers just pay; for cash,
// tap notes and coins to count out the change and hand it over. From stage 11 the till hides the change due. Wrong
// change, or a customer who gives up waiting, is a complaint; three and the manager takes over. The 30 shifts are the
// web's own (NightCheckoutStages.cs).
public class NightCheckoutPlayer : MonoBehaviour
{
    const string Slug = "night-checkout";
    const int StageCount = 30;
    const int MaxComplaints = 3;
    static readonly int[] Denoms = { 10000, 5000, 1000, 500, 100 };
    static readonly string[] ItemColours = { "#ffd8a8", "#b2f2bb", "#a5d8ff", "#ffc9c9", "#d0bfff", "#99e9f2", "#ffec99", "#fcc2d7", "#c0eb75", "#e9ecef", "#ffa8a8", "#74c0fc", "#8ce99a", "#ffe066" };
    static readonly string[] Shirts = { "#f783ac", "#74c0fc", "#ffd43b", "#8ce99a", "#b197fc" };

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);
    static string Won(int n) => n.ToString("N0", System.Globalization.CultureInfo.InvariantCulture);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of night-checkout.ts) ----------------
    NightCheckoutStages.Level st;
    int stageIdx, starsWon, served, complaints, current, given;
    bool[] scanned, left, done;
    int[] itemStart;
    float t;
    bool over, won;

    int Customers => st.at.Length;
    int Count(int c) => st.count[c];
    int Price(int c, int k) => st.items[(itemStart[c] + k) * 3];
    int Kind(int c, int k) => st.items[(itemStart[c] + k) * 3 + 1];
    bool Deal(int c, int k) => st.items[(itemStart[c] + k) * 3 + 2] == 1;

    int TotalOf(int c)
    {
        int sum = 0;
        var seen = new Dictionary<int, int>();
        for (int k = 0; k < Count(c); k++)
        {
            if (Deal(c, k))
            {
                seen.TryGetValue(Kind(c, k), out int n);
                seen[Kind(c, k)] = ++n;
                if (n % 2 == 0) continue;
            }
            sum += Price(c, k);
        }
        return sum;
    }

    int ChangeDue(int c) => st.paid[c] > 0 ? st.paid[c] - TotalOf(c) : 0;

    bool AllScanned()
    {
        if (scanned == null || scanned.Length == 0) return false;
        foreach (bool s in scanned) if (!s) return false;
        return true;
    }

    List<int> Waiting()
    {
        var q = new List<int>();
        for (int i = 0; i < Customers; i++) if (!done[i] && !left[i] && i != current && st.at[i] <= t) q.Add(i);
        return q;
    }

    void NextCustomer()
    {
        var q = Waiting();
        if (q.Count == 0) { current = -1; scanned = new bool[0]; return; }
        current = q[0];
        scanned = new bool[Count(current)];
        given = 0;
    }

    void Finish()
    {
        for (int i = 0; i < Customers; i++) if (!done[i] && !left[i]) return;
        over = true;
        won = complaints < MaxComplaints;
    }

    void Complain()
    {
        complaints++;
        if (complaints >= MaxComplaints) { over = true; won = false; }
    }

    bool Scan(int k)
    {
        if (over || current < 0 || k < 0 || k >= scanned.Length || scanned[k]) return false;
        scanned[k] = true;
        return true;
    }

    bool CountIn(int d)
    {
        if (over || current < 0 || !AllScanned()) return false;
        given += d;
        return true;
    }

    // 0 nothing, 1 thanks, 2 wrong, 3 not yet
    int Pay()
    {
        if (over || current < 0) return 0;
        if (!AllScanned()) return 3;
        bool right = st.paid[current] == 0 || given == ChangeDue(current);
        done[current] = true;
        if (right) served++; else Complain();
        if (!over) { NextCustomer(); Finish(); }
        return right ? 1 : 2;
    }

    int StepShift(float dt)
    {
        int gone = 0;
        if (over) return 0;
        t += dt;
        for (int i = 0; i < Customers; i++)
        {
            if (done[i] || left[i] || i == current || st.at[i] > t) continue;
            if (t - st.at[i] > st.patience[i]) { left[i] = true; gone++; Complain(); }
        }
        if (!over && current < 0) NextCustomer();
        if (!over) Finish();
        return gone;
    }

    int StarsFor()
    {
        if (!won) return 0;
        if (complaints == 0 && t <= st.par) return 3;
        if (complaints <= 1) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    // hit boxes in field px (the same as the web canvas)
    static Rect ItemBox(int k) => new Rect(16f + (k % 4) * 84f, 132f + (k / 4) * 54f, 76f, 46f);
    static Rect DenomBox(int k) => new Rect(10f + k * 69f, 392f, 63f, 58f);
    static readonly Rect ClearBox = new Rect(16f, 466f, 150f, 60f);
    static readonly Rect PayBox = new Rect(180f, 466f, 164f, 60f);

    OiyoField field;
    Camera cam;
    Transform root, clerk;
    readonly List<Transform> itemObj = new List<Transform>();
    readonly List<Transform> queueObj = new List<Transform>();
    Transform payPlate;
    Material[] itemMat, shirtMat;
    Material counterMat, screenMat, scannedMat, dealMat, payOn, payOff, faceMat, barGood, barLow;
    Bursts sparkle;
    Synth synth;
    bool showStages;
    string pop; bool popGood; float popT;
    int shownFor = -2;

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(360f, 560f, new Color(0.11f, 0.12f, 0.23f));
        cam = field.Cam;
        OiyoField.Lights(new Color(0.42f, 0.43f, 0.5f), 0.6f, 35f, -20f);
        sparkle = new Bursts(transform, 0.5f);
        synth = new Synth(gameObject);
        itemMat = new Material[ItemColours.Length];
        for (int i = 0; i < ItemColours.Length; i++) { ColorUtility.TryParseHtmlString(ItemColours[i], out var c); itemMat[i] = OiyoArcade.Lit(c, 0.35f, OiyoArcade.Art("NC/label")); }
        shirtMat = new Material[Shirts.Length];
        for (int i = 0; i < Shirts.Length; i++) { ColorUtility.TryParseHtmlString(Shirts[i], out var c); shirtMat[i] = OiyoArcade.Lit(c, 0.2f); }
        counterMat = OiyoArcade.Lit(new Color(0.53f, 0.56f, 0.59f), 0.3f);
        screenMat = OiyoArcade.Lit(new Color(0.04f, 0.24f, 0.18f), 0.6f);
        scannedMat = OiyoArcade.Transparent(OiyoArcade.Solid(Color.white), new Color(1f, 1f, 1f, 0.25f));
        dealMat = OiyoArcade.Lit(new Color(0.88f, 0.19f, 0.19f), 0.3f);
        payOn = OiyoArcade.Lit(new Color(0.1f, 0.44f, 0.76f), 0.3f);
        payOff = OiyoArcade.Lit(new Color(0.2f, 0.23f, 0.25f), 0.3f);
        faceMat = OiyoArcade.Lit(new Color(1f, 0.91f, 0.8f), 0.2f);
        barGood = OiyoArcade.Lit(new Color(0.32f, 0.81f, 0.4f), 0.1f);
        barLow = OiyoArcade.Lit(new Color(0.98f, 0.32f, 0.32f), 0.1f);
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int i, bool ready = true)
    {
        stageIdx = Mathf.Clamp(i, 0, StageCount - 1);
        StopAllCoroutines();
        st = NightCheckoutStages.All[stageIdx];
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Shop").transform;
        itemStart = new int[Customers];
        for (int c = 1; c < Customers; c++) itemStart[c] = itemStart[c - 1] + st.count[c - 1];
        left = new bool[Customers];
        done = new bool[Customers];
        scanned = new bool[0];
        current = -1; given = 0; served = 0; complaints = 0;
        t = 0f; over = false; won = false;
        starsWon = 0;
        pop = null;
        shownFor = -2;
        showStages = false;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Animate(0f);
    }

    Transform Box(Material m, float x, float y, float w, float h, float z, float depth, Transform parent = null)
    {
        var q = OiyoArcade.Prim(PrimitiveType.Cube, "Box", m, parent ?? root).transform;
        q.position = field.W(x, y, z);
        q.localScale = new Vector3(OiyoField.U(w), OiyoField.U(h), depth);
        return q;
    }

    Transform BoxIn(Material m, Rect r, float z, float depth) => Box(m, r.center.x, r.center.y, r.width, r.height, z, depth);

    void BuildScene()
    {
        Box(counterMat, 180f, 205f, 344f, 170f, 0.2f, 0.3f);
        Box(screenMat, 180f, 341f, 344f, 82f, 0.05f, 0.2f);
        string[] notes = { "#a9e34b", "#ffa94d", "#74c0fc" };
        for (int k = 0; k < Denoms.Length; k++)
        {
            var r = DenomBox(k);
            if (k < 3) { ColorUtility.TryParseHtmlString(notes[k], out var c); BoxIn(OiyoArcade.Lit(c, 0.2f, OiyoArcade.Art("NC/note")), r, -0.1f, 0.12f); }
            else
            {
                var coin = OiyoArcade.Prim(PrimitiveType.Cylinder, "Coin", OiyoArcade.Lit(new Color(0.81f, 0.83f, 0.85f), 0.7f, null, 0.6f), root).transform;
                coin.position = field.W(r.center.x, r.center.y, -0.1f);
                coin.rotation = Quaternion.Euler(90f, 0f, 0f);
                coin.localScale = new Vector3(OiyoField.U(54f), 0.06f, OiyoField.U(54f));
            }
        }
        BoxIn(OiyoArcade.Lit(new Color(0.29f, 0.31f, 0.34f), 0.3f), ClearBox, -0.1f, 0.15f);
        payPlate = BoxIn(payOff, PayBox, -0.1f, 0.15f);
        clerk = new GameObject("Customer").transform;
        clerk.SetParent(root, false);
        itemObj.Clear();
        queueObj.Clear();
    }

    void ShowCustomer()
    {
        foreach (var o in itemObj) if (o != null) Destroy(o.gameObject);
        itemObj.Clear();
        foreach (Transform ch in clerk) Destroy(ch.gameObject);
        if (current < 0) return;
        Box(shirtMat[current % Shirts.Length], 60f, 81f, 40f, 50f, -0.1f, 0.4f, clerk);
        Box(faceMat, 60f, 43f, 28f, 26f, -0.1f, 0.4f, clerk);
        for (int k = 0; k < Count(current); k++)
        {
            var r = ItemBox(k);
            var it = BoxIn(itemMat[Kind(current, k) % itemMat.Length], r, -0.3f, 0.5f);
            if (Deal(current, k)) Box(dealMat, r.x + 15f, r.y + 7f, 30f, 14f, -0.56f, 0.02f, clerk);
            itemObj.Add(it);
        }
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("night-checkout", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        if (state == GameState.Playing && !over)
        {
            if (StepShift(dt) > 0) { Say(U("Got tired of waiting and left"), false); synth.Tone(200f, 0.2f, Wave.Square, 0.12f, 120f, 8f); }
            if (over) End();
        }
        if (popT > 0f) popT -= dt;
        Animate(dt);
    }

    void Say(string s, bool good) { pop = s; popGood = good; popT = 1.1f; }

    void Act(Vector2 f)
    {
        if (current >= 0)
            for (int k = 0; k < Count(current); k++)
                if (ItemBox(k).Contains(f))
                {
                    if (Scan(k)) { var c = ItemBox(k).center; sparkle.Emit(field.W(c.x, c.y, -0.8f), new Color(1f, 0.42f, 0.42f), 6, 2.5f, 0.06f, 0.4f); synth.Tone(1568f, 0.05f, Wave.Square, 0.06f, 0f, 20f); }
                    return;
                }
        for (int k = 0; k < Denoms.Length; k++)
            if (DenomBox(k).Contains(f))
            {
                if (CountIn(Denoms[k])) synth.Tone(660f, 0.05f, Wave.Triangle, 0.1f, 0f, 14f);
                else if (current >= 0 && !AllScanned()) Say(U("Some items aren't scanned"), false);
                return;
            }
        if (ClearBox.Contains(f)) { given = 0; return; }
        if (PayBox.Contains(f)) DoPay();
    }

    void DoPay()
    {
        int r = Pay();
        if (r == 1) { Say(U("Thank you!"), true); sparkle.Emit(field.W(60f, 60f, -1f), new Color(1f, 0.83f, 0.23f), 12, 3f, 0.08f, 0.6f); synth.Tone(988f, 0.12f, Wave.Triangle, 0.15f, 1319f, 8f); }
        else if (r == 2) { Say(U("Wrong change"), false); synth.Tone(180f, 0.2f, Wave.Square, 0.15f, 110f, 8f); }
        else if (r == 3) Say(U("Some items aren't scanned"), false);
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
                    // taps are read once per frame
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (OiyoArcade.OverUi(b.pos) || !field.ToField(b.pos, out Vector2 f)) continue;
                        if (state == GameState.Ready) { state = GameState.Playing; continue; }
                        Act(f);
                        if (over) break;
                    }
                    if (state == GameState.Ready) { if (confirm || Input.GetKeyDown(KeyCode.Space)) state = GameState.Playing; return; }
                    for (int k = 0; k < Denoms.Length; k++)
                        if (Input.GetKeyDown(KeyCode.Alpha1 + k)) Act(DenomBox(k).center);
                    if ((Input.GetKeyDown(KeyCode.S) || Input.GetKeyDown(KeyCode.Space)) && current >= 0)
                    {
                        int k = System.Array.IndexOf(scanned, false);
                        if (k >= 0) Act(ItemBox(k).center);
                    }
                    if (Input.GetKeyDown(KeyCode.Backspace)) given = 0;
                    if (confirm) DoPay();
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
            OiyoArcade.Record(Slug, stageIdx, starsWon, served * 10 - complaints * 5, StageCount);
            sparkle.Emit(field.W(180f, 280f, -1f), new Color(1f, 0.85f, 0.25f), 40, 5f, 0.1f, 1f);
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
        field.Fit(80f, 10f, 10f);
        if (shownFor != current) { shownFor = current; ShowCustomer(); }
        for (int k = 0; k < itemObj.Count && k < scanned.Length; k++)
        {
            var r = itemObj[k].GetComponent<Renderer>();
            r.sharedMaterial = scanned[k] ? scannedMat : itemMat[Kind(current, k) % itemMat.Length];
        }
        payPlate.GetComponent<Renderer>().sharedMaterial = current >= 0 && AllScanned() ? payOn : payOff;
        // the queue at the door, each with a patience bar
        foreach (var q in queueObj) if (q != null) Destroy(q.gameObject);
        queueObj.Clear();
        var wait = Waiting();
        for (int k = 0; k < wait.Count && k < 7; k++)
        {
            int i = wait[k];
            float x = 131f + k * 34f;
            queueObj.Add(Box(shirtMat[i % Shirts.Length], x, 61f, 22f, 26f, -0.1f, 0.3f));
            queueObj.Add(Box(faceMat, x, 41f, 16f, 14f, -0.1f, 0.3f));
            float lft = Mathf.Max(0f, 1f - (t - st.at[i]) / st.patience[i]);
            queueObj.Add(Box(lft < 0.3f ? barLow : barGood, x - 11f + 11f * lft, 80f, 22f * lft + 0.01f, 4f, -0.1f, 0.05f));
        }
    }

    // ?oiyotest=1 prints the state to the browser console for the automated play check: the clock, complaints, and the
    // screen point (px from the top-left) of the next right move: an unscanned item, a note or coin, or the pay plate.
    bool testLog; float testT;
    Vector2 Scr(Vector2 f, float z = -0.3f) { var sp = cam.WorldToScreenPoint(field.W(f.x, f.y, z)); return new Vector2(sp.x, Screen.height - sp.y); }
    void TestTick(float dt)
    {
        if (!testLog || (testT -= dt) > 0f) return;
        testT = 0.05f;
        string next = "null";
        if (current >= 0)
        {
            Vector2 at;
            int k = System.Array.IndexOf(scanned, false);
            if (k >= 0) at = ItemBox(k).center;
            else
            {
                int need = ChangeDue(current) - given;
                int d = -1;
                for (int j = 0; j < Denoms.Length && st.paid[current] > 0; j++) if (Denoms[j] <= need) { d = j; break; }
                at = d >= 0 ? DenomBox(d).center : PayBox.center;
            }
            var p = Scr(at);
            next = $"[{p.x:F1},{p.y:F1}]";
        }
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"t\":{t:F2},\"par\":{st.par},\"served\":{served},\"complaints\":{complaints},\"next\":{next},\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.1f, 0.44f, 0.76f, 0.97f);
    static readonly Color Dark = new Color(0.1f, 0.11f, 0.12f, 0.9f);

    // GUI point and scale for a field point, so labels sit on the 3D plates
    Vector2 Gui(Vector2 f, float z = -0.6f) => OiyoArcade.ToGui(cam.WorldToScreenPoint(field.W(f.x, f.y, z)));
    float GuiPerField => field.ScreenPerField() / OiyoArcade.ComputeScale();

    void Label(Rect r, string s, int size, Color c, float z = -0.6f)
    {
        var a = Gui(new Vector2(r.x, r.y), z); var b = Gui(new Vector2(r.xMax, r.yMax), z);
        OiyoArcade.Text(new Rect(a.x, a.y, b.x - a.x, b.y - a.y), s, Mathf.Max(9, Mathf.RoundToInt(size * GuiPerField)), c, TextAnchor.MiddleCenter, true);
    }

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("{0} customers", NightCheckoutStages.All[i].at.Length);

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(0.85f, 0.93f, 1f), U("Night Checkout"),
                U("Scan every item, then count out the change in notes and coins. Wrong change or a customer who leaves is a complaint; three and you're done."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        // labels on the counter, the till screen, the notes and the buttons
        if (current >= 0)
        {
            for (int k = 0; k < Count(current); k++)
            {
                var r = ItemBox(k);
                Label(r, Won(Price(current, k)), 13, scanned[k] ? new Color(0.2f, 0.55f, 0.25f) : new Color(0.13f, 0.15f, 0.16f), -0.56f);
                if (Deal(current, k)) Label(new Rect(r.x, r.y, 30f, 14f), "1+1", 10, Color.white, -0.58f);
            }
            bool all = AllScanned();
            int paid = st.paid[current];
            string line1 = U("Total") + " " + (all ? Won(TotalOf(current)) : "...") + "    " + U("Paid") + " " + (paid > 0 ? Won(paid) : U("Card"));
            string line2 = paid > 0 ? U("Change") + " " + (all ? (st.showChange ? Won(ChangeDue(current)) : "????") : "...") + "    <color=#ffd43b>" + U("Counting") + " " + Won(given) + "</color>" : "";
            Label(new Rect(14f, 304f, 332f, 24f), line1, 14, new Color(0.55f, 0.91f, 0.6f), -0.2f);
            Label(new Rect(14f, 330f, 332f, 24f), line2, 14, new Color(0.55f, 0.91f, 0.6f), -0.2f);
        }
        Label(new Rect(14f, 358f, 332f, 20f), F("{0} served", served) + "    " + F("Complaints {0}/{1}", complaints, MaxComplaints), 12, new Color(0.76f, 0.98f, 0.91f), -0.2f);
        for (int k = 0; k < Denoms.Length; k++) Label(DenomBox(k), Won(Denoms[k]), 13, new Color(0.13f, 0.15f, 0.16f), -0.25f);
        Label(ClearBox, U("Recount"), 16, Color.white, -0.25f);
        Label(PayBox, current >= 0 && st.paid[current] == 0 ? U("Take card") : U("Hand over"), 16, Color.white, -0.25f);

        var bar = new Rect(8f, 8f, w - 16f, 64f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 12f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>  " + F("Complaints {0}/{1}", complaints, MaxComplaints), 15, new Color(0.85f, 0.93f, 1f));
        OiyoArcade.Text(new Rect(20f, 36f, w - 90f, 24f), F("{0} served", served) + "   " + F("{0}s", Mathf.FloorToInt(t)) + $"   ★★★ <= {st.par}s", 14, Color.white);
        if (OiyoArcade.Button(new Rect(w - 60f, 14f, 44f, 44f), "<b>II</b>", OiyoScreens.Slate, 18))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (pop != null && popT > 0f && state == GameState.Playing)
            OiyoArcade.Shadowed(new Rect(0f, 80f, w, 30f), pop, 18, popGood ? new Color(0.55f, 1f, 0.6f) : new Color(1f, 0.6f, 0.3f), TextAnchor.MiddleCenter);
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap to start"), U("Tap items to scan them, then count out the change!"), 140f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            string detail = won ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : "";
            string body = $"<size=14>{F("{0} served · {1} complaints", served, complaints)}</size>";
            int r = OiyoScreens.Result(w, h, Dark, Accent, won, ResultLive, won ? U("Night shift done!") : U("The manager takes over"), detail, body,
                won && stageIdx < StageCount - 1 ? U("Next stage") : null, won && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
