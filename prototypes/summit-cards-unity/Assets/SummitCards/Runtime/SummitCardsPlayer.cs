using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Summit Cards 3D: the web Summit Cards (src/components/games/SummitCards.tsx, src/lib/games/summit-cards.ts) rebuilt in
// Unity on the web's own 360 × 560 px field (OiyoField). Twenty-eight cards in three peaks, tips on top. Play an
// uncovered card one rank above or below the camp card (King and Ace join); turn the stock when stuck. Clear the peaks
// before the stock runs out. The 30 deals are the web's own (SummitCardsStages.cs).
public class SummitCardsPlayer : MonoBehaviour
{
    const string Slug = "summit-cards";
    const int StageCount = 30;
    const int PeakCards = 28;
    const float CW = 32f, CH = 46f, PeakY = 72f, RowGap = 30f;
    static readonly Vector2 Camp = new Vector2(160f, 430f), Stock = new Vector2(270f, 430f);
    static readonly string[] Ranks = { "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K" };

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of summit-cards.ts) ----------------
    static readonly int[][] CoveredBy = BuildCover();
    static int[][] BuildCover()
    {
        var c = new List<int>[PeakCards];
        for (int i = 0; i < PeakCards; i++) c[i] = new List<int>();
        for (int k = 0; k < 3; k++) { c[3 + 2 * k].Add(k); c[4 + 2 * k].Add(k); }
        for (int j = 0; j < 6; j++) { int p = j / 2, i = j % 2; c[9 + 3 * p + i].Add(3 + j); c[10 + 3 * p + i].Add(3 + j); }
        for (int m = 0; m < 9; m++) { c[18 + m].Add(9 + m); c[19 + m].Add(9 + m); }
        var r = new int[PeakCards][];
        for (int i = 0; i < PeakCards; i++) r[i] = c[i].ToArray();
        return r;
    }
    static int RankOf(int c) => c % 13;
    static int SuitOf(int c) => c / 13;
    static bool Fits(int a, int b) { int d = Mathf.Abs(RankOf(a) - RankOf(b)); return d == 1 || d == 12; }

    SummitCardsStages.Level st;
    int stageIdx, starsWon, camp, chain, best, moves;
    bool[] gone;
    readonly List<int> stock = new List<int>();
    bool over, won;

    bool IsFree(int s)
    {
        if (gone[s]) return false;
        foreach (int c in CoveredBy[s]) if (!gone[c]) return false;
        return true;
    }
    bool AnyPlayable() { for (int s = 0; s < PeakCards; s++) if (IsFree(s) && Fits(st.peaks[s], camp)) return true; return false; }

    void Settle()
    {
        bool all = true;
        foreach (bool g in gone) if (!g) all = false;
        if (all) { over = true; won = true; }
        else if (stock.Count == 0 && !AnyPlayable()) over = true;
    }

    bool Play(int s)
    {
        if (over || s < 0 || !IsFree(s) || !Fits(st.peaks[s], camp)) return false;
        gone[s] = true; camp = st.peaks[s]; chain++; best = Mathf.Max(best, chain); moves++;
        Settle();
        return true;
    }

    bool Draw()
    {
        if (over || stock.Count == 0) return false;
        camp = stock[stock.Count - 1];
        stock.RemoveAt(stock.Count - 1);
        chain = 0; moves++;
        Settle();
        return true;
    }

    int StarsFor()
    {
        if (!won) return 0;
        if (stock.Count >= st.par) return 3;
        if (stock.Count >= st.par / 2) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    static readonly Vector2[] SlotXY = BuildSlots();
    static Vector2[] BuildSlots()
    {
        var xy = new Vector2[PeakCards];
        for (int m = 0; m < 10; m++) xy[18 + m] = new Vector2(10f + m * 34f, PeakY + 3 * RowGap);
        for (int s = 17; s >= 0; s--)
        {
            float sx = 0f; int n = 0;
            for (int c = 0; c < PeakCards; c++) if (System.Array.IndexOf(CoveredBy[c], s) >= 0) { sx += xy[c].x; n++; }
            int row = s < 3 ? 0 : s < 9 ? 1 : 2;
            xy[s] = new Vector2(sx / n, PeakY + row * RowGap);
        }
        return xy;
    }

    OiyoField field;
    Camera cam;
    Transform root;
    Transform[] cardObj, suitObj;
    Renderer[] cardR, suitR;
    Transform campCard, campSuit;
    Renderer campSuitR;
    Transform[] stockCards;
    Material faceMat, dimMat, backMat, glowMat;
    Material[] suitMat;
    Transform cursorObj;
    Bursts sparkle;
    Synth synth;
    bool showStages;
    int cursor = -1;

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(360f, 560f, new Color(1f, 0.91f, 0.8f));
        cam = field.Cam;
        OiyoField.Lights(new Color(0.75f, 0.75f, 0.75f), 0.6f, 50f, -25f);
        sparkle = new Bursts(transform, 0.5f);
        synth = new Synth(gameObject);
        faceMat = OiyoArcade.Lit(new Color(1f, 0.98f, 0.86f), 0.3f);
        dimMat = OiyoArcade.Lit(new Color(0.81f, 0.83f, 0.85f), 0.3f);
        backMat = OiyoArcade.Lit(new Color(0.1f, 0.39f, 0.67f), 0.4f);
        glowMat = OiyoArcade.Glow(new Color(0.96f, 0.62f, 0f));
        suitMat = new Material[4];
        for (int k = 0; k < 4; k++) { suitMat[k] = OiyoField.Sprite("SC/suit" + k); suitMat[k].renderQueue = 3001; }
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int i, bool ready = true)
    {
        stageIdx = Mathf.Clamp(i, 0, StageCount - 1);
        StopAllCoroutines();
        st = SummitCardsStages.All[stageIdx];
        gone = new bool[PeakCards];
        stock.Clear(); stock.AddRange(st.stock);
        camp = st.camp; chain = 0; best = 0; moves = 0; over = false; won = false; starsWon = 0; cursor = -1;
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Mountain").transform;
        showStages = false;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Animate(0f);
    }

    Material edgeMat;
    /** A card: its face (or back) with a dark edge behind it, so overlapping cards stay apart. */
    Transform Card(string name, Material m, out Renderer r)
    {
        var o = OiyoArcade.Prim(PrimitiveType.Cube, name, m, root);
        o.transform.localScale = new Vector3(OiyoField.U(CW - 2f), OiyoField.U(CH - 2f), 0.08f);
        r = o.GetComponent<Renderer>();
        edgeMat ??= OiyoArcade.Lit(new Color(0.2f, 0.23f, 0.25f), 0.2f);
        var edge = OiyoArcade.Prim(PrimitiveType.Cube, name + "Edge", edgeMat, o.transform);
        edge.transform.localScale = new Vector3((CW + 1f) / (CW - 2f), (CH + 1f) / (CH - 2f), 0.6f);
        edge.transform.localPosition = new Vector3(0f, 0f, 0.4f);
        return o.transform;
    }

    void BuildScene()
    {
        var meadow = OiyoArcade.Prim(PrimitiveType.Cube, "Meadow", OiyoArcade.Lit(new Color(0.7f, 0.95f, 0.73f), 0.1f), root).transform;
        meadow.localScale = new Vector3(OiyoField.U(420f), OiyoField.U(280f), 0.2f);
        meadow.position = field.W(180f, 440f, 1f);
        for (int k = 0; k < 3; k++)
        {
            var hill = OiyoArcade.Prim(PrimitiveType.Sphere, "Hill", OiyoArcade.Lit(new Color(0.99f, 0.75f, 0.47f), 0.1f), root).transform;
            hill.localScale = new Vector3(OiyoField.U(180f), OiyoField.U(220f), 0.3f);
            hill.position = field.W(60f + k * 120f, 260f, 1.2f);
        }
        cardObj = new Transform[PeakCards]; cardR = new Renderer[PeakCards]; suitObj = new Transform[PeakCards]; suitR = new Renderer[PeakCards];
        for (int s = 0; s < PeakCards; s++)
        {
            cardObj[s] = Card("Card", faceMat, out cardR[s]);
            suitObj[s] = OiyoField.Quad("Suit", suitMat[SuitOf(st.peaks[s])], root, 12f, 12f);
            suitR[s] = suitObj[s].GetComponent<Renderer>();
        }
        campCard = Card("Camp", faceMat, out _);
        campSuit = OiyoField.Quad("CampSuit", suitMat[0], root, 12f, 12f);
        campSuitR = campSuit.GetComponent<Renderer>();
        stockCards = new Transform[4];
        for (int k = 0; k < 4; k++) stockCards[k] = Card("Stock", backMat, out _);
        cursorObj = OiyoArcade.Prim(PrimitiveType.Cube, "Cursor", glowMat, root).transform;
        cursorObj.localScale = new Vector3(OiyoField.U(CW), OiyoField.U(4f), 0.05f);
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("summit-cards", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        Animate(dt);
    }

    void Move(int s)
    {
        if (state != GameState.Playing || over) return;
        if (s < 0)
        {
            if (Draw()) synth.Tone(440f, 0.06f, Wave.Triangle, 0.1f); else synth.Tone(180f, 0.08f, Wave.Square, 0.05f);
        }
        else if (Play(s))
        {
            var p = SlotXY[s];
            sparkle.Emit(field.W(p.x + CW / 2f, p.y + CH / 2f, -0.6f), new Color(1f, 0.83f, 0.23f), 8 + Mathf.Min(12, chain * 2), 3f, 0.07f, 0.4f);
            synth.Tone(523f + Mathf.Min(chain, 10) * 40f, 0.08f, Wave.Triangle, 0.12f);
        }
        else synth.Tone(180f, 0.08f, Wave.Square, 0.05f);
        if (over) End();
    }

    int CardAt(Vector2 f)
    {
        for (int s = 0; s < PeakCards; s++)
        {
            if (gone[s]) continue;
            var p = SlotXY[s];
            if (f.x >= p.x && f.x <= p.x + CW && f.y >= p.y && f.y <= p.y + CH && IsFree(s)) return s;
        }
        return -2;
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
                    // input is read once per frame: a card plays it, the stock turns a card
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (state == GameState.Ready) { state = GameState.Playing; continue; }
                        if (OiyoArcade.OverUi(b.pos) || !field.ToField(b.pos, out Vector2 f)) continue;
                        if (f.x >= Stock.x - 8f && f.x <= Stock.x + CW + 16f && f.y >= Stock.y - 16f && f.y <= Stock.y + CH + 8f) { Move(-1); continue; }
                        int s = CardAt(f);
                        if (s >= 0) Move(s);
                    }
                    int step = Input.GetKeyDown(KeyCode.RightArrow) ? 1 : Input.GetKeyDown(KeyCode.LeftArrow) ? -1 : 0;
                    if (step != 0)
                    {
                        if (state == GameState.Ready) state = GameState.Playing;
                        var open = new List<int>();
                        for (int s = 0; s < PeakCards; s++) if (IsFree(s)) open.Add(s);
                        open.Sort((a, b) => SlotXY[a].x.CompareTo(SlotXY[b].x));
                        if (open.Count > 0) { int at = open.IndexOf(cursor); cursor = open[((at < 0 ? (step > 0 ? -1 : 0) : at) + step + open.Count) % open.Count]; }
                    }
                    if (Input.GetKeyDown(KeyCode.Space)) { if (state == GameState.Ready) state = GameState.Playing; else if (cursor >= 0) Move(cursor); }
                    if (confirm) { if (state == GameState.Ready) state = GameState.Playing; else Move(-1); }
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
            OiyoArcade.Record(Slug, stageIdx, starsWon, stock.Count * 100 + best, StageCount);
            sparkle.Emit(field.W(180f, 200f, -1.5f), new Color(1f, 0.85f, 0.25f), 40, 5f, 0.1f, 1f);
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

    bool FaceUp(int s) => IsFree(s) || !st.faceDown;

    void Animate(float dt)
    {
        if (root == null) return;
        field.Fit(56f, 10f, 0f, 50f, 500f);
        for (int s = 0; s < PeakCards; s++)
        {
            cardObj[s].gameObject.SetActive(!gone[s]);
            suitObj[s].gameObject.SetActive(!gone[s] && FaceUp(s));
            if (gone[s]) continue;
            var p = SlotXY[s];
            // tips lie on top: smaller slot numbers sit nearer the camera
            float z = -0.1f * (PeakCards - s) / PeakCards - (s < 3 ? 0.2f : s < 9 ? 0.13f : s < 18 ? 0.06f : 0f);
            cardObj[s].position = field.W(p.x + CW / 2f, p.y + CH / 2f, z);
            bool free = IsFree(s);
            cardR[s].sharedMaterial = !FaceUp(s) ? backMat : free ? faceMat : dimMat;
            // rank and suit sit in the lower part, which stays in view under the card above
            suitObj[s].position = field.W(p.x + CW - 9f, p.y + CH - 24f, z - 0.05f);
        }
        campCard.position = field.W(Camp.x + CW / 2f, Camp.y + CH / 2f, 0f);
        campSuitR.sharedMaterial = suitMat[SuitOf(camp)];
        campSuit.position = field.W(Camp.x + CW - 9f, Camp.y + CH - 24f, -0.05f);
        for (int k = 0; k < 4; k++)
        {
            stockCards[k].gameObject.SetActive(k < stock.Count);
            stockCards[k].position = field.W(Stock.x + CW / 2f + k * 2f, Stock.y + CH / 2f - k * 2f, -0.05f * k);
        }
        cursorObj.gameObject.SetActive(cursor >= 0 && !gone[cursor]);
        if (cursor >= 0 && !gone[cursor]) cursorObj.position = field.W(SlotXY[cursor].x + CW / 2f, SlotXY[cursor].y + CH + 4f, -0.4f);
    }

    // ?oiyotest=1 prints the state to the browser console for the automated play check, with the screen point (px from
    // the top-left) of the card the web's careful climber plays next, or the stock (its moves come with the stage).
    bool testLog; float testT;
    Vector2 Scr(Vector2 f, float z) { var sp = cam.WorldToScreenPoint(field.W(f.x, f.y, z)); return new Vector2(sp.x, Screen.height - sp.y); }
    void TestTick(float dt)
    {
        if (!testLog) return;
        if ((testT -= dt) > 0f) return;
        testT = 0.05f;
        string next = "null";
        if (state == GameState.Playing && !over && moves < st.plan.Length)
        {
            int m = st.plan[moves];
            var p = m < 0 ? Scr(new Vector2(Stock.x + CW / 2f, Stock.y + CH / 2f), 0f) : Scr(new Vector2(SlotXY[m].x + CW / 2f, SlotXY[m].y + CH * 0.75f), -0.2f);
            next = $"[{p.x:F1},{p.y:F1}]";
        }
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"moves\":{moves},\"stock\":{stock.Count},\"par\":{st.par},\"next\":{next},\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.96f, 0.62f, 0f, 0.97f);
    static readonly Color Dark = new Color(0.1f, 0.11f, 0.12f, 0.9f);
    static readonly Color Ink = new Color(0.13f, 0.15f, 0.16f);
    static readonly Color Red = new Color(0.88f, 0.19f, 0.19f);

    Vector2 Gui(Vector2 f, float z) => OiyoArcade.ToGui(cam.WorldToScreenPoint(field.W(f.x, f.y, z)));
    float GuiPerField => field.ScreenPerField() / OiyoArcade.ComputeScale();
    void Rank(Vector2 topLeft, int card, float z)
    {
        var p = Gui(topLeft + new Vector2(2f, CH - 21f), z);
        int size = Mathf.Max(9, Mathf.RoundToInt(13f * GuiPerField));
        OiyoArcade.Text(new Rect(p.x, p.y, 40f, 24f), Ranks[RankOf(card)], size, SuitOf(card) == 1 || SuitOf(card) == 2 ? Red : Ink, TextAnchor.UpperLeft, true);
    }

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("Stock {0}", SummitCardsStages.All[i].stock.Length);

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(1f, 0.93f, 0.85f), U("Summit Cards"),
                U("Play uncovered cards one rank above or below the camp card to build runs. Turn the stock when stuck. Clear all three peaks before the stock runs out."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        // card ranks, drawn base first so the tips' labels sit on top
        for (int s = PeakCards - 1; s >= 0; s--) if (!gone[s] && FaceUp(s)) Rank(SlotXY[s], st.peaks[s], -0.3f);
        Rank(Camp, camp, -0.1f);
        var sp = Gui(new Vector2(Stock.x + CW / 2f, Stock.y + CH + 14f), 0f);
        OiyoArcade.Text(new Rect(sp.x - 30f, sp.y - 10f, 60f, 20f), stock.Count.ToString(), Mathf.Max(10, Mathf.RoundToInt(13f * GuiPerField)), Ink, TextAnchor.MiddleCenter, true);
        if (chain >= 2)
        {
            var cp = Gui(new Vector2(Camp.x + CW / 2f, Camp.y + CH + 14f), 0f);
            OiyoArcade.Text(new Rect(cp.x - 30f, cp.y - 10f, 60f, 20f), "×" + chain, Mathf.Max(10, Mathf.RoundToInt(13f * GuiPerField)), Ink, TextAnchor.MiddleCenter, true);
        }
        var bar = new Rect(8f, 8f, w - 16f, 44f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 18f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>  " + F("Stock {0}", stock.Count), 15, new Color(1f, 0.93f, 0.85f));
        if (OiyoArcade.Button(new Rect(w - 56f, 12f, 40f, 36f), "<b>II</b>", OiyoScreens.Slate, 16))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap to start"), U("Tap a card one above or below the camp card!"), 200f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            string detail = won ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : "";
            string body = won ? $"<size=14>{F("{0} left in stock · best run {1}", stock.Count, best)}</size>" : "";
            int r = OiyoScreens.Result(w, h, Dark, Accent, won, ResultLive, won ? U("All three peaks are clear!") : U("Out of stock"), detail, body,
                won && stageIdx < StageCount - 1 ? U("Next stage") : null, won && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
