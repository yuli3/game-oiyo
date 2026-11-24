using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Blanket Battle 3D: the web Blanket Battle (src/components/games/BlanketBattle.tsx, src/lib/games/blanket-battle.ts)
// rebuilt in Unity on a 360 × 590 px field (OiyoField). Three picnic blankets, six turns, one more acorn of energy each
// turn. The rival lays its critter cards first, face up; you answer from your hand, then end the turn. After turn six
// whoever has more power on a blanket holds it; hold more of the three to win. Decks, quirks and the rival's luck are
// the web's own (BlanketBattleStages.cs; the same mulberry32 stream).
public class BlanketBattlePlayer : MonoBehaviour
{
    const string Slug = "blanket-battle";
    const int StageCount = 30;
    const int Turns = 6, Lanes = 3, HandStart = 3, MaxHand = 7, Capacity = 4;
    static readonly int[] Cost = { 1, 1, 2, 2, 3, 3, 4, 5, 6 };
    static readonly int[] Power = { 2, 1, 2, 3, 4, 3, 6, 8, 11 };
    static readonly string[] Names = { "ant", "snail", "sparrow", "rabbit", "hedgehog", "owl", "fox", "bear", "deer" };
    const int Snail = 1, Sparrow = 2, Hedgehog = 4, Owl = 5;
    // lane kinds: 0 plain, 1 sunny, 2 ants, 3 small
    static readonly string[] LaneColours = { "#e64980", "#fab005", "#868e96", "#4c6ef5" };

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of blanket-battle.ts) ----------------
    class Placed { public int card, bonus; }
    struct Staged { public int card, lane; }

    BlanketBattleStages.Level st;
    int stageIdx, starsWon, turn, drawn, rivalDrawn;
    uint rivalRng;
    readonly List<int> hand = new List<int>(), rivalHand = new List<int>();
    readonly List<Placed>[][] board = { new[] { new List<Placed>(), new List<Placed>(), new List<Placed>() }, new[] { new List<Placed>(), new List<Placed>(), new List<Placed>() } };
    readonly List<Staged> staged = new List<Staged>();
    readonly List<Staged> rivalLast = new List<Staged>();
    bool over, won;

    float NextRival()
    {
        unchecked
        {
            rivalRng += 0x6d2b79f5u;
            uint x = rivalRng;
            x = (uint)((int)(x ^ (x >> 15)) * (int)(x | 1u));
            x ^= x + (uint)((int)(x ^ (x >> 7)) * (int)(x | 61u));
            return (float)((x ^ (x >> 14)) / 4294967296.0);
        }
    }

    int CapacityOf(int lane) => st.lanes[lane] == 3 ? 2 : Capacity;
    int Energy => turn;
    int Spent() { int s = 0; foreach (var p in staged) s += Cost[p.card]; return s; }

    int CardPower(int side, int lane, int k)
    {
        var p = board[side][lane][k];
        int v = Power[p.card] + p.bonus;
        if (st.lanes[lane] == 1) v += 1;
        if (st.lanes[lane] == 2) v -= 1;
        if (p.card == Owl && board[side][lane].Count == 1) v += 3;
        return Mathf.Max(0, v);
    }

    int LanePower(int side, int lane)
    {
        int s = 0;
        for (int k = 0; k < board[side][lane].Count; k++) s += CardPower(side, lane, k);
        return s;
    }

    void Draw()
    {
        if (hand.Count < MaxHand && drawn < st.deck.Length) hand.Add(st.deck[drawn++]);
        if (rivalHand.Count < MaxHand && rivalDrawn < st.rivalDeck.Length) rivalHand.Add(st.rivalDeck[rivalDrawn++]);
    }

    void Reveal(int side, int card, int lane)
    {
        var mine = board[side][lane];
        var theirs = board[1 - side][lane];
        var p = new Placed { card = card };
        if (card == Sparrow) p.bonus += mine.Count;
        if (card == Snail) foreach (var q in mine) q.bonus += 1;
        if (card == Hedgehog) foreach (var q in theirs) q.bonus -= 1;
        mine.Add(p);
    }

    void RivalTurn()
    {
        rivalLast.Clear();
        int budget = Energy;
        var counts = new int[Lanes];
        for (int l = 0; l < Lanes; l++) counts[l] = board[1][l].Count;
        var order = new List<int>(rivalHand);
        // strongest first; ties keep hand order (a stable sort, as in the web)
        var idx = new List<int>();
        for (int i = 0; i < order.Count; i++) idx.Add(i);
        idx.Sort((a, b) => Power[order[b]] != Power[order[a]] ? Power[order[b]] - Power[order[a]] : a - b);
        var plan = new List<Staged>();
        foreach (int ii in idx)
        {
            int card = order[ii];
            if (Cost[card] > budget) continue;
            float r = NextRival();
            var open = new List<int>();
            for (int l = 0; l < Lanes; l++) if (counts[l] < CapacityOf(l)) open.Add(l);
            if (open.Count == 0) break;
            int lane;
            if (r < st.rivalSkill)
            {
                var sorted = new List<int>(open);
                sorted.Sort((a, b) => { int d = (LanePower(1, a) - LanePower(0, a)) - (LanePower(1, b) - LanePower(0, b)); return d != 0 ? d : open.IndexOf(a) - open.IndexOf(b); });
                lane = sorted[0];
            }
            else
            {
                r = NextRival();
                lane = open[Mathf.FloorToInt(r * open.Count)];
            }
            plan.Add(new Staged { card = card, lane = lane });
            counts[lane]++;
            budget -= Cost[card];
        }
        foreach (var p in plan)
        {
            Reveal(1, p.card, p.lane);
            rivalHand.RemoveAt(rivalHand.IndexOf(p.card));
            rivalLast.Add(p);
        }
    }

    bool StageCard(int handIndex, int lane)
    {
        if (over || handIndex < 0 || handIndex >= hand.Count || lane < 0 || lane >= Lanes) return false;
        int card = hand[handIndex];
        if (Spent() + Cost[card] > Energy) return false;
        int here = board[0][lane].Count;
        foreach (var s in staged) if (s.lane == lane) here++;
        if (here >= CapacityOf(lane)) return false;
        staged.Add(new Staged { card = card, lane = lane });
        hand.RemoveAt(handIndex);
        return true;
    }

    bool Unstage(int k)
    {
        if (over || k < 0 || k >= staged.Count) return false;
        hand.Add(staged[k].card);
        staged.RemoveAt(k);
        return true;
    }

    void EndTurn()
    {
        if (over) return;
        foreach (var s in staged) Reveal(0, s.card, s.lane);
        staged.Clear();
        if (turn >= Turns)
        {
            over = true;
            LanesWon(out int a, out int b);
            won = a > b;
            return;
        }
        turn++;
        Draw();
        RivalTurn();
    }

    void LanesWon(out int a, out int b)
    {
        a = 0; b = 0;
        for (int l = 0; l < Lanes; l++)
        {
            int x = LanePower(0, l), y = LanePower(1, l);
            if (x > y) a++; else if (y > x) b++;
        }
    }

    int StarsFor()
    {
        if (!won) return 0;
        LanesWon(out int a, out int b);
        if (b == 0) return 3;
        return a >= 2 ? 2 : 1;
    }

    // ---------------- Scene ----------------
    const float FW = 360f, FH = 590f, LaneW = 116f, HandY = 500f;
    static float LaneX(int l) => 6f + l * (LaneW + 2f);
    static float SlotY(int side, int k) => side == 1 ? 228f - k * 44f : 296f + k * 44f;
    float HandX(int i, int n) => 180f + (i - (n - 1) / 2f) * 50f;
    static readonly Rect EndBox = new Rect(80f, 540f, 200f, 40f);

    OiyoField field;
    Camera cam;
    Transform root, endPlate, laneMark;
    readonly List<Transform> cardObj = new List<Transform>();
    Material[] critterMat, laneMat;
    Material cardMine, cardRival, cardGlow, cardPending, endMat, grassMat, markMat;
    Bursts sparkle;
    Synth synth;
    bool showStages;
    int picked = -1, laneCursor;
    float fresh;
    struct CardView { public int card, power; public float x, y; public int kind; } // kind 0 mine, 1 rival, 2 rival new, 3 pending, 4 hand, 5 hand picked, 6 hand dim
    readonly List<CardView> views = new List<CardView>();

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(FW, FH, new Color(0.58f, 0.85f, 0.18f));
        cam = field.Cam;
        OiyoField.Lights(new Color(0.75f, 0.75f, 0.72f), 0.7f, 45f, -25f);
        sparkle = new Bursts(transform, 0.5f);
        synth = new Synth(gameObject);
        critterMat = new Material[Names.Length];
        for (int k = 0; k < Names.Length; k++) { critterMat[k] = OiyoField.Sprite("BB/" + Names[k]); critterMat[k].renderQueue = 3100; }
        laneMat = new Material[LaneColours.Length];
        var gingham = OiyoArcade.Art("BB/gingham", true);
        for (int k = 0; k < LaneColours.Length; k++) { ColorUtility.TryParseHtmlString(LaneColours[k], out var c); laneMat[k] = OiyoArcade.Lit(Color.Lerp(c, Color.white, 0.35f), 0.15f, gingham); }
        cardMine = OiyoArcade.Lit(new Color(0.91f, 0.96f, 1f), 0.3f);
        cardRival = OiyoArcade.Lit(new Color(1f, 0.89f, 0.89f), 0.3f);
        cardGlow = OiyoArcade.Lit(new Color(1f, 0.83f, 0.23f), 0.3f);
        cardPending = OiyoArcade.Lit(new Color(0.75f, 0.86f, 0.98f), 0.3f);
        endMat = OiyoArcade.Lit(new Color(0.1f, 0.44f, 0.76f), 0.4f);
        grassMat = OiyoArcade.Lit(new Color(0.51f, 0.79f, 0.12f), 0.1f);
        markMat = OiyoArcade.Transparent(OiyoArcade.Solid(Color.white), new Color(0.1f, 0.44f, 0.76f, 0.35f));
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int i, bool ready = true)
    {
        stageIdx = Mathf.Clamp(i, 0, StageCount - 1);
        StopAllCoroutines();
        st = BlanketBattleStages.All[stageIdx];
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Picnic").transform;
        hand.Clear(); rivalHand.Clear(); staged.Clear(); rivalLast.Clear();
        for (int s = 0; s < 2; s++) for (int l = 0; l < Lanes; l++) board[s][l].Clear();
        for (int k = 0; k < HandStart; k++) { hand.Add(st.deck[k]); rivalHand.Add(st.rivalDeck[k]); }
        drawn = HandStart; rivalDrawn = HandStart;
        rivalRng = st.rivalSeed;
        turn = 1; over = false; won = false; starsWon = 0;
        Draw();
        RivalTurn();
        picked = -1; laneCursor = 0; fresh = 1.2f;
        showStages = false;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Animate(0f);
    }

    Transform Box(Material m, Rect r, float z, float depth)
    {
        var q = OiyoArcade.Prim(PrimitiveType.Cube, "Box", m, root).transform;
        q.position = field.W(r.center.x, r.center.y, z);
        q.localScale = new Vector3(OiyoField.U(r.width), OiyoField.U(r.height), depth);
        return q;
    }

    void BuildScene()
    {
        Box(grassMat, new Rect(0f, 0f, FW, FH), 0.3f, 0.1f);
        for (int l = 0; l < Lanes; l++) Box(laneMat[st.lanes[l]], new Rect(LaneX(l), 54f, LaneW, 420f), 0.1f, 0.05f);
        endPlate = Box(endMat, EndBox, -0.05f, 0.2f);
        laneMark = Box(markMat, new Rect(0f, 276f, LaneW - 2f, 196f), 0f, 0.02f);
        cardObj.Clear();
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("blanket-battle", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        fresh = Mathf.Max(0f, fresh - dt);
        Animate(dt);
    }

    void TapLane(int l)
    {
        laneCursor = l;
        if (picked >= 0)
        {
            if (StageCard(picked, l)) { picked = -1; synth.Tone(660f, 0.06f, Wave.Triangle, 0.12f, 0f, 14f); }
            else synth.Tone(180f, 0.08f, Wave.Square, 0.08f, 0f, 14f);
            return;
        }
        for (int k = staged.Count - 1; k >= 0; k--) if (staged[k].lane == l) { Unstage(k); synth.Tone(392f, 0.05f, Wave.Triangle, 0.1f, 0f, 14f); return; }
    }

    void DoEnd()
    {
        EndTurn();
        picked = -1;
        fresh = 1.2f;
        sparkle.Emit(field.W(180f, 262f, -1f), new Color(1f, 0.83f, 0.23f), 10, 3f, 0.08f, 0.5f);
        synth.Tone(over ? 988f : 523f, 0.15f, Wave.Triangle, 0.14f, over ? 1319f : 659f, 8f);
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
                        if (EndBox.Contains(f)) { DoEnd(); if (over) break; continue; }
                        if (f.y > HandY - 26f && f.y < HandY + 26f)
                        {
                            for (int i = 0; i < hand.Count; i++)
                                if (Mathf.Abs(HandX(i, hand.Count) - f.x) < 24f) { picked = picked == i ? -1 : i; synth.Tone(523f, 0.04f, Wave.Triangle, 0.08f, 0f, 16f); break; }
                            continue;
                        }
                        if (f.y > 54f && f.y < 474f)
                        {
                            int l = Mathf.FloorToInt((f.x - 6f) / (LaneW + 2f));
                            if (l >= 0 && l < Lanes) TapLane(l);
                        }
                    }
                    if (state == GameState.Ready) { if (confirm || Input.GetKeyDown(KeyCode.Space)) state = GameState.Playing; return; }
                    for (int k = 0; k < MaxHand; k++) if (Input.GetKeyDown(KeyCode.Alpha1 + k) && k < hand.Count) picked = picked == k ? -1 : k;
                    if (Input.GetKeyDown(KeyCode.LeftArrow)) laneCursor = (laneCursor + Lanes - 1) % Lanes;
                    if (Input.GetKeyDown(KeyCode.RightArrow)) laneCursor = (laneCursor + 1) % Lanes;
                    if (confirm) TapLane(laneCursor);
                    if (Input.GetKeyDown(KeyCode.Space)) DoEnd();
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
            LanesWon(out int a, out int b);
            OiyoArcade.Record(Slug, stageIdx, starsWon, (a - b) * 10, StageCount);
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
        // collect every card to show this frame
        views.Clear();
        for (int l = 0; l < Lanes; l++)
        {
            float cx = LaneX(l) + LaneW / 2f;
            int newOnes = 0;
            foreach (var r in rivalLast) if (r.lane == l) newOnes++;
            for (int k = 0; k < board[1][l].Count; k++)
                views.Add(new CardView { card = board[1][l][k].card, power = CardPower(1, l, k), x = cx, y = SlotY(1, k), kind = fresh > 0f && k >= board[1][l].Count - newOnes ? 2 : 1 });
            for (int k = 0; k < board[0][l].Count; k++)
                views.Add(new CardView { card = board[0][l][k].card, power = CardPower(0, l, k), x = cx, y = SlotY(0, k), kind = 0 });
            int extra = 0;
            foreach (var s in staged)
                if (s.lane == l) { views.Add(new CardView { card = s.card, power = Power[s.card], x = cx, y = SlotY(0, board[0][l].Count + extra), kind = 3 }); extra++; }
        }
        for (int i = 0; i < hand.Count; i++)
            views.Add(new CardView { card = hand[i], power = Power[hand[i]], x = HandX(i, hand.Count), y = HandY + (picked == i ? -10f : 0f), kind = picked == i ? 5 : Spent() + Cost[hand[i]] <= Energy ? 4 : 6 });
        while (cardObj.Count < views.Count * 2)
        {
            cardObj.Add(OiyoArcade.Prim(PrimitiveType.Cube, "Card", cardMine, root).transform);
            cardObj.Add(OiyoField.Quad("Critter", critterMat[0], root, 30f, 30f));
        }
        for (int k = 0; k < cardObj.Count / 2; k++)
        {
            bool on = k < views.Count;
            var plate = cardObj[k * 2];
            var art = cardObj[k * 2 + 1];
            plate.gameObject.SetActive(on);
            art.gameObject.SetActive(on);
            if (!on) continue;
            var v = views[k];
            plate.GetComponent<Renderer>().sharedMaterial = v.kind == 1 ? cardRival : v.kind == 2 || v.kind == 5 ? cardGlow : v.kind == 3 ? cardPending : cardMine;
            plate.position = field.W(v.x, v.y, -0.12f);
            plate.localScale = new Vector3(OiyoField.U(44f), OiyoField.U(40f), v.kind == 6 ? 0.05f : 0.15f);
            art.GetComponent<Renderer>().sharedMaterial = critterMat[v.card];
            art.position = field.W(v.x - 4f, v.y - 1f, -0.25f);
            bool flip = v.kind == 1 || v.kind == 2;
            art.localScale = new Vector3(OiyoField.U(v.kind == 6 ? 20f : 26f) * (flip ? -1f : 1f), OiyoField.U(v.kind == 6 ? 20f : 26f), 1f);
        }
        laneMark.gameObject.SetActive(picked >= 0);
        laneMark.position = field.W(LaneX(laneCursor) + LaneW / 2f, 374f, 0.02f);
    }

    // ?oiyotest=1 prints the state to the browser console for the automated play check: the turn, the blankets, and
    // the screen point (px from the top-left) of the next press of a sensible player: a hand card (the strongest of the
    // best set for the acorns left), the blanket for it (the one trailing most of the two cheapest to hold), or End turn.
    bool testLog; float testT;
    Vector2 Scr(float x, float y) { var sp = cam.WorldToScreenPoint(field.W(x, y, -0.15f)); return new Vector2(sp.x, Screen.height - sp.y); }
    int BestCard()
    {
        int left = Energy - Spent();
        int n = hand.Count, bestPow = -1, bestMask = 0;
        for (int mask = 1; mask < 1 << n; mask++)
        {
            int cost = 0, pow = 0;
            for (int k = 0; k < n; k++) if ((mask & (1 << k)) != 0) { cost += Cost[hand[k]]; pow += Power[hand[k]]; }
            if (cost <= left && pow > bestPow) { bestPow = pow; bestMask = mask; }
        }
        int best = -1;
        for (int k = 0; k < n; k++) if ((bestMask & (1 << k)) != 0 && (best < 0 || Power[hand[k]] > Power[hand[best]])) best = k;
        return best;
    }
    int BestLane()
    {
        var open = new List<int>();
        for (int l = 0; l < Lanes; l++)
        {
            int here = board[0][l].Count;
            foreach (var s in staged) if (s.lane == l) here++;
            if (here < CapacityOf(l)) open.Add(l);
        }
        if (open.Count == 0) return -1;
        System.Func<int, int> gap = l => { int mine = LanePower(0, l); foreach (var s in staged) if (s.lane == l) mine += Power[s.card]; return LanePower(1, l) - mine + (st.lanes[l] == 3 ? 1 : 0); };
        open.Sort((a, b) => gap(a) != gap(b) ? gap(a) - gap(b) : a - b);
        var targets = open.GetRange(0, Mathf.Min(2, open.Count));
        targets.Sort((a, b) => gap(b) != gap(a) ? gap(b) - gap(a) : a - b);
        return targets[0];
    }
    void TestTick(float dt)
    {
        if (!testLog || (testT -= dt) > 0f) return;
        testT = 0.05f;
        Vector2 p;
        if (picked >= 0) { int l = BestLane(); p = l >= 0 ? Scr(LaneX(l) + LaneW / 2f, 380f) : Scr(EndBox.center.x, EndBox.center.y); }
        else { int k = BestCard(); p = k >= 0 && BestLane() >= 0 ? Scr(HandX(k, hand.Count), HandY) : Scr(EndBox.center.x, EndBox.center.y); }
        LanesWon(out int a, out int b);
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"turn\":{turn},\"picked\":{picked},\"lanes\":[{a},{b}],\"next\":[{p.x:F1},{p.y:F1}],\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.1f, 0.44f, 0.76f, 0.97f);
    static readonly Color Dark = new Color(0.1f, 0.11f, 0.12f, 0.9f);
    static readonly Color Ink = new Color(0.11f, 0.26f, 0.2f);

    Vector2 Gui(Vector2 f, float z = -0.3f) => OiyoArcade.ToGui(cam.WorldToScreenPoint(field.W(f.x, f.y, z)));
    float GuiPerField => field.ScreenPerField() / OiyoArcade.ComputeScale();
    void Label(Rect r, string s, float size, Color c, TextAnchor a = TextAnchor.MiddleCenter)
    {
        var p = Gui(new Vector2(r.x, r.y)); var q = Gui(new Vector2(r.xMax, r.yMax));
        OiyoArcade.Text(new Rect(p.x, p.y, q.x - p.x, q.y - p.y), s, Mathf.Max(8, Mathf.RoundToInt(size * GuiPerField)), c, a, true);
    }
    string LaneName(int k) => k == 1 ? U("Sunny +1") : k == 2 ? U("Ants −1") : k == 3 ? U("Small (2)") : U("Plain");

    string StageTitle(int i) => F("Stage {0}", i + 1);

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(0.85f, 1f, 0.88f), U("Blanket Battle"),
                U("The rival lays its cards first. Answer with yours, one more acorn each turn, and after six turns hold two of the three blankets."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        // blanket strips: quirk and rival : you (this turn's cards as +)
        for (int l = 0; l < Lanes; l++)
        {
            float x = LaneX(l);
            int pending = 0;
            foreach (var s in staged) if (s.lane == l) pending += Power[s.card];
            int mine = LanePower(0, l), theirs = LanePower(1, l);
            string col = mine + pending > theirs ? "#2b8a3e" : mine + pending < theirs ? "#c92a2a" : "#495057";
            OiyoArcade.Fill(GuiRect(new Rect(x + 4f, 248f, LaneW - 8f, 28f)), new Color(1f, 1f, 1f, 0.92f));
            Label(new Rect(x + 4f, 248f, LaneW - 8f, 13f), LaneName(st.lanes[l]), 10f, new Color(0.29f, 0.31f, 0.34f));
            Label(new Rect(x + 4f, 261f, LaneW - 8f, 15f), $"<color={col}>{theirs} : {mine}{(pending > 0 ? "+" + pending : "")}</color>", 13f, Color.black);
        }
        foreach (var v in views)
        {
            Label(new Rect(v.x + 4f, v.y + 6f, 18f, 14f), v.power.ToString(), 12f, Color.black);
            if (v.kind >= 4) Label(new Rect(v.x - 22f, v.y - 20f, 14f, 14f), $"<color=#6741d9>{Cost[v.card]}</color>", 11f, Color.black);
        }
        Label(new Rect(0f, 34f, FW, 16f), U("Rival"), 11f, Ink);
        Label(EndBox, U("End turn"), 16f, Color.white);

        var bar = new Rect(8f, 8f, w - 16f, 64f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 12f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>  " + F("Turn {0}/{1}", turn, Turns), 15, new Color(0.85f, 1f, 0.88f));
        OiyoArcade.Text(new Rect(20f, 36f, w - 90f, 24f), F("Acorns {0}/{1}", Energy - Spent(), Energy), 14, Color.white);
        if (OiyoArcade.Button(new Rect(w - 60f, 14f, 44f, 44f), "<b>II</b>", OiyoScreens.Slate, 18))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap to start"), U("Pick a card, then tap a blanket to play it!"), 140f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            LanesWon(out int a, out int b);
            string detail = won ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : "";
            string body = $"<size=14>{F("Blankets {0} : {1}", a, b)}</size>";
            int r = OiyoScreens.Result(w, h, Dark, Accent, won, ResultLive, won ? U("The picnic spot is yours!") : U("They took the spot"), detail, body,
                won && stageIdx < StageCount - 1 ? U("Next stage") : null, won && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }

    Rect GuiRect(Rect f)
    {
        var p = Gui(new Vector2(f.x, f.y)); var q = Gui(new Vector2(f.xMax, f.yMax));
        return new Rect(p.x, p.y, q.x - p.x, q.y - p.y);
    }
}
