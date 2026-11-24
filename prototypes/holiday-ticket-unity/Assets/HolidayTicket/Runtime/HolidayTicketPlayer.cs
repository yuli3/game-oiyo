using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Holiday Ticket 3D: the web Holiday Ticket (src/components/games/HolidayTicket.tsx, src/lib/games/holiday-ticket.ts)
// rebuilt in Unity on the web's own 360 × 560 px field (OiyoField). The carriage has four seats a row (A B | aisle | C D).
// Each seat goes to another buyer at its own moment of the rush (0 = sold already). Parties book in order: tap as many
// free seats as the party has people and press Book. A pair must sit side by side on one side of the aisle; three or
// four must share a row. A picked seat someone else buys first drops out. Book every party before the clock runs out.
// The 30 trains are the web's own (HolidayTicketStages.cs).
public class HolidayTicketPlayer : MonoBehaviour
{
    const string Slug = "holiday-ticket";
    const int StageCount = 30, Side = 2, PerRow = 4;
    const float Top = 112f, Bottom = 488f, SeatW = 54f;
    static readonly float[] SeatX = { 44f, 102f, 204f, 262f };
    static readonly Rect BookRect = new Rect(60f, 500f, 240f, 48f);

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of holiday-ticket.ts) ----------------
    HolidayTicketStages.Level st;
    int stageIdx, starsWon, party, lost, wrong;
    float t;
    bool over, won;
    readonly HashSet<int> mine = new HashSet<int>();
    readonly List<int> picked = new List<int>();

    int SeatCount => st.rows * PerRow;
    static int SeatRow(int i) => i / PerRow;
    static int SeatCol(int i) => i % PerRow;
    static int SideOf(int i) => SeatCol(i) < Side ? 0 : 1;
    bool Taken(int i) => mine.Contains(i) || st.soldAt[i] <= t;

    void NewBooking() { t = 0f; mine.Clear(); picked.Clear(); party = 0; lost = 0; wrong = 0; over = false; won = false; }

    static bool Together(List<int> seats)
    {
        if (seats.Count == 0) return false;
        int row = SeatRow(seats[0]);
        foreach (int s in seats) if (SeatRow(s) != row) return false;
        if (seats.Count == 1) return true;
        if (seats.Count == 2) return SideOf(seats[0]) == SideOf(seats[1]) && Mathf.Abs(SeatCol(seats[0]) - SeatCol(seats[1])) == 1;
        return true;
    }

    // "picked", "unpicked", "taken", "full" or null
    string Pick(int seat)
    {
        if (over || seat < 0 || seat >= SeatCount) return null;
        int k = picked.IndexOf(seat);
        if (k >= 0) { picked.RemoveAt(k); return "unpicked"; }
        if (Taken(seat)) return "taken";
        if (picked.Count >= st.parties[party]) return "full";
        picked.Add(seat);
        return "picked";
    }

    // "booked", "apart", "short" or null
    string Book()
    {
        if (over) return null;
        int size = st.parties[party];
        if (picked.Count != size) { wrong++; return "short"; }
        if (!Together(picked)) { wrong++; return "apart"; }
        foreach (int s in picked) mine.Add(s);
        picked.Clear();
        party++;
        if (party >= st.parties.Length) { over = true; won = true; }
        return "booked";
    }

    readonly List<int> lostNow = new List<int>();
    void Step(float dt)
    {
        lostNow.Clear();
        if (over) return;
        t += dt;
        for (int k = picked.Count - 1; k >= 0; k--)
            if (st.soldAt[picked[k]] <= t) { lost++; lostNow.Add(picked[k]); picked.RemoveAt(k); }
        if (t >= st.time) over = true;
    }

    int StarsFor()
    {
        if (!won) return 0;
        if (wrong == 0 && lost == 0 && t <= st.par) return 3;
        if (wrong + lost <= 2) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    OiyoField field;
    Camera cam;
    Transform root;
    Renderer[] seatR;
    GameObject[] folk;
    readonly Dictionary<int, float> flash = new Dictionary<int, float>();
    Material freeMat, soldMat, mineMat, pickMat, flashMat, floorMat, aisleMat, bookMat, folkMat, wallMat;
    Bursts confetti;
    Synth synth;
    bool showStages;

    float RowH => (Bottom - Top) / st.rows;
    Rect SeatRect(int i) => new Rect(SeatX[SeatCol(i)], Top + SeatRow(i) * RowH + 2f, SeatW, RowH - 4f);

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(360f, 560f, new Color(0.11f, 0.24f, 0.35f));
        cam = field.Cam;
        OiyoField.Lights(new Color(0.72f, 0.74f, 0.78f), 0.6f, 30f, -20f);
        confetti = new Bursts(transform, 0.6f);
        synth = new Synth(gameObject);
        var fabric = OiyoArcade.Art("HT/fabric", true);
        freeMat = OiyoArcade.Lit(new Color(0.3f, 0.67f, 0.97f), 0.2f, fabric);
        soldMat = OiyoArcade.Lit(new Color(0.53f, 0.56f, 0.59f), 0.2f, fabric);
        mineMat = OiyoArcade.Lit(new Color(0.25f, 0.75f, 0.34f), 0.2f, fabric);
        pickMat = OiyoArcade.Lit(new Color(0.99f, 0.77f, 0.1f), 0.2f, fabric);
        flashMat = OiyoArcade.Lit(new Color(0.88f, 0.19f, 0.19f), 0.2f);
        floorMat = OiyoArcade.Lit(new Color(0.91f, 0.93f, 0.94f), 0.1f);
        aisleMat = OiyoArcade.Lit(Color.white, 0.1f, OiyoArcade.Art("HT/floor", true));
        bookMat = OiyoArcade.Lit(new Color(0.79f, 0.16f, 0.16f), 0.4f);
        wallMat = OiyoArcade.Lit(new Color(0.95f, 0.92f, 0.85f), 0.2f);
        folkMat = OiyoField.Sprite("HT/folk");
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int i, bool ready = true)
    {
        stageIdx = Mathf.Clamp(i, 0, StageCount - 1);
        StopAllCoroutines();
        st = HolidayTicketStages.All[stageIdx];
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Carriage").transform;
        NewBooking();
        flash.Clear();
        starsWon = 0;
        showStages = false;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Animate(0f);
    }

    void BuildScene()
    {
        var wall = OiyoArcade.Prim(PrimitiveType.Cube, "Car body", wallMat, root);
        wall.transform.position = field.W(180f, (Top + Bottom) / 2f, 0.45f);
        wall.transform.localScale = new Vector3(OiyoField.U(300f), OiyoField.U(Bottom - Top + 30f), 0.3f);
        var floor = OiyoArcade.Prim(PrimitiveType.Cube, "Floor", floorMat, root);
        floor.transform.position = field.W(180f, (Top + Bottom) / 2f, 0.3f);
        floor.transform.localScale = new Vector3(OiyoField.U(286f), OiyoField.U(Bottom - Top + 14f), 0.1f);
        var aisle = OiyoArcade.Prim(PrimitiveType.Cube, "Aisle", aisleMat, root);
        aisle.transform.position = field.W(180f, (Top + Bottom) / 2f, 0.25f);
        aisle.transform.localScale = new Vector3(OiyoField.U(40f), OiyoField.U(Bottom - Top + 14f), 0.1f);
        seatR = new Renderer[SeatCount];
        folk = new GameObject[SeatCount];
        for (int i = 0; i < SeatCount; i++)
        {
            var r = SeatRect(i);
            var seat = OiyoArcade.Prim(PrimitiveType.Cube, "Seat", freeMat, root);
            seat.transform.position = field.W(r.center.x, r.center.y, 0f);
            seat.transform.localScale = new Vector3(OiyoField.U(r.width), OiyoField.U(r.height), 0.35f);
            seatR[i] = seat.GetComponent<Renderer>();
            var head = OiyoArcade.Prim(PrimitiveType.Cube, "Headrest", soldMat, root);
            head.transform.position = field.W(r.center.x, r.y + 3f, -0.2f);
            head.transform.localScale = new Vector3(OiyoField.U(r.width - 6f), OiyoField.U(5f), 0.1f);
            float s = Mathf.Min(r.height - 4f, 26f);
            var f = OiyoField.Quad("Passenger", folkMat, root, s * 0.8f, s);
            f.position = field.W(r.center.x, r.center.y + 1f, -0.3f);
            folk[i] = f.gameObject;
        }
        var book = OiyoArcade.Prim(PrimitiveType.Cube, "Book", bookMat, root);
        book.transform.position = field.W(BookRect.center.x, BookRect.center.y, -0.1f);
        book.transform.localScale = new Vector3(OiyoField.U(BookRect.width), OiyoField.U(BookRect.height), 0.3f);
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("holiday-ticket", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        if (state == GameState.Playing)
        {
            Step(dt);
            foreach (int s in lostNow)
            {
                flash[s] = 0.6f;
                Toast(U("Someone beat you to it!"), new Color(1f, 0.5f, 0.45f));
                synth.Tone(300f, 0.2f, Wave.Square, 0.1f, 150f, 6f);
            }
            if (over) End();
        }
        var keys = new List<int>(flash.Keys);
        foreach (int k in keys) { flash[k] -= dt; if (flash[k] <= 0f) flash.Remove(k); }
        msgT = Mathf.Max(0f, msgT - dt);
        Animate(dt);
    }

    string msg = ""; float msgT; Color msgC = Color.white;
    void Toast(string m, Color c) { msg = m; msgT = 1f; msgC = c; }

    int cursor;
    bool cursorShown;

    void DoPick(int seat)
    {
        string r = Pick(seat);
        if (r == "picked" || r == "unpicked") synth.Tone(r == "picked" ? 620f : 460f, 0.05f, Wave.Triangle, 0.12f, 0f, 14f);
        else if (r == "taken") flash[seat] = 0.4f;
    }

    void DoBook()
    {
        int before = party;
        string r = Book();
        if (r == "booked")
        {
            Toast(U("Booked!"), new Color(0.6f, 1f, 0.6f));
            confetti.Emit(field.W(180f, 300f, -0.6f), new Color(0.25f, 0.75f, 0.34f), 12, 3f, 0.08f, 0.7f);
            synth.Tone(880f, 0.12f, Wave.Triangle, 0.18f, 1175f, 8f);
            if (over) End();
        }
        else if (r != null)
        {
            Toast(r == "apart" ? U("They must sit together") : F("Pick {0} seats", st.parties[before]), new Color(1f, 0.7f, 0.45f));
            synth.Tone(240f, 0.2f, Wave.Triangle, 0.14f, 180f, 6f);
        }
    }

    void Tap(Vector2 f)
    {
        if (state == GameState.Ready) state = GameState.Playing;
        if (BookRect.Contains(f)) { DoBook(); return; }
        for (int i = 0; i < SeatCount; i++)
        {
            var r = SeatRect(i);
            if (f.x >= r.x - 3f && f.x <= r.xMax + 3f && f.y >= r.y - 2f && f.y <= r.yMax + 2f) { cursor = i; DoPick(i); return; }
        }
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
                    // taps are read once per frame: a seat is picked or dropped, the plate books
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (OiyoArcade.OverUi(b.pos) || !field.ToField(b.pos, out Vector2 f)) continue;
                        Tap(f);
                    }
                    int move = Input.GetKeyDown(KeyCode.LeftArrow) ? -1 : Input.GetKeyDown(KeyCode.RightArrow) ? 1 : Input.GetKeyDown(KeyCode.UpArrow) ? -PerRow : Input.GetKeyDown(KeyCode.DownArrow) ? PerRow : 0;
                    if (move != 0) { cursor = Mathf.Clamp(cursor + move, 0, SeatCount - 1); cursorShown = true; }
                    if (Input.GetKeyDown(KeyCode.Space)) { if (state == GameState.Ready) state = GameState.Playing; cursorShown = true; DoPick(cursor); }
                    if (confirm) { if (state == GameState.Ready) state = GameState.Playing; DoBook(); }
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
            OiyoArcade.Record(Slug, stageIdx, starsWon, Mathf.Max(0, Mathf.RoundToInt((st.time - t) * 10f)), StageCount);
            confetti.Emit(field.W(180f, 200f, -0.8f), new Color(1f, 0.83f, 0.23f), 30, 4f, 0.1f, 1f);
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
        bool blink = Mathf.FloorToInt(Time.time * 12f) % 2 == 0;
        for (int i = 0; i < SeatCount; i++)
        {
            bool m = mine.Contains(i), gone = !m && Taken(i);
            seatR[i].sharedMaterial = flash.ContainsKey(i) && blink ? flashMat : m ? mineMat : picked.Contains(i) ? pickMat : gone ? soldMat : freeMat;
            folk[i].SetActive(gone || m);
        }
    }

    // ?oiyotest=1 prints the state to the browser console for the automated play check: the clock, the party being
    // booked and its size, every seat as [state (0 free, 1 sold, 2 ours, 3 picked), row, col, screen x, screen y]
    // (px from the top-left), and the Book plate's screen point.
    bool testLog; float testT;
    Vector2 Scr(Vector2 f) { var sp = cam.WorldToScreenPoint(field.W(f.x, f.y, -0.2f)); return new Vector2(sp.x, Screen.height - sp.y); }
    void TestTick(float dt)
    {
        if (!testLog || (testT -= dt) > 0f) return;
        testT = 0.05f;
        var seats = new System.Text.StringBuilder();
        for (int i = 0; i < SeatCount; i++)
        {
            if (i > 0) seats.Append(',');
            int s = mine.Contains(i) ? 2 : picked.Contains(i) ? 3 : Taken(i) ? 1 : 0;
            var p = Scr(SeatRect(i).center);
            seats.Append('[').Append(s).Append(',').Append(SeatRow(i)).Append(',').Append(SeatCol(i)).Append(',').Append(p.x.ToString("F1")).Append(',').Append(p.y.ToString("F1")).Append(']');
        }
        var bk = Scr(BookRect.center);
        int size = party < st.parties.Length ? st.parties[party] : 0;
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"t\":{t:F3},\"time\":{st.time:F1},\"party\":{party},\"parties\":{st.parties.Length},\"size\":{size},\"lost\":{lost},\"wrong\":{wrong},\"seats\":[{seats}],\"book\":[{bk.x:F1},{bk.y:F1}],\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.79f, 0.16f, 0.16f, 0.97f);
    static readonly Color Dark = new Color(0.07f, 0.15f, 0.24f, 0.9f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("{0} parties", HolidayTicketStages.All[i].parties.Length) + " · " + F("{0}s", Mathf.RoundToInt(HolidayTicketStages.All[i].time));

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(1f, 0.95f, 0.88f), U("Holiday Ticket"),
                U("Tap free seats that keep each family party together, then Book. Seats keep selling while you pick: book everyone before the train sells out!"),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        var bar = new Rect(8f, 8f, w - 16f, 64f);
        OiyoArcade.Panel(bar, Dark);
        string head = over ? "" : F("Party {0}/{1} · {2}", party + 1, st.parties.Length, st.parties[Mathf.Min(party, st.parties.Length - 1)]);
        OiyoArcade.Text(new Rect(20f, 12f, w - 150f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>  " + head, 15, new Color(1f, 0.95f, 0.88f));
        OiyoArcade.Text(new Rect(w - 130f, 12f, 60f, 22f), F("{0}s", Mathf.Max(0, Mathf.CeilToInt(st.time - t))), 15, Color.white, TextAnchor.UpperRight);
        // the parties in order: booked green, the current one gold, the rest faint; a block per person
        float px = 20f;
        for (int k = 0; k < st.parties.Length; k++)
        {
            var c = k < party ? new Color(0.25f, 0.75f, 0.34f) : k == party ? new Color(0.99f, 0.77f, 0.1f) : new Color(1f, 1f, 1f, 0.3f);
            for (int p = 0; p < st.parties[k]; p++) OiyoArcade.Fill(new Rect(px + p * 8f, 40f, 6f, 12f), c);
            px += st.parties[k] * 8f + 8f;
        }
        OiyoArcade.Bar(new Rect(20f, 58f, w - 100f, 6f), Mathf.Clamp01(1f - t / st.time), new Color(1f, 1f, 1f, 0.2f), new Color(1f, 0.53f, 0.53f));
        if (OiyoArcade.Button(new Rect(w - 60f, 14f, 44f, 44f), "<b>II</b>", OiyoScreens.Slate, 18))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (state == GameState.Playing || state == GameState.Ready)
        {
            var bc = OiyoArcade.ToGui(cam.WorldToScreenPoint(field.W(BookRect.center.x, BookRect.center.y, -0.3f)));
            OiyoArcade.Shadowed(new Rect(bc.x - 100f, bc.y - 12f, 200f, 24f), "<b>" + U("Book") + "</b>", 20, Color.white, TextAnchor.MiddleCenter);
            if (cursorShown)
            {
                var r = SeatRect(cursor);
                var g = OiyoArcade.ToGui(cam.WorldToScreenPoint(field.W(r.center.x, r.yMax, -0.4f)));
                OiyoArcade.Fill(new Rect(g.x - 16f, g.y - 3f, 32f, 4f), Color.white);
            }
        }
        if (msgT > 0f) OiyoArcade.Shadowed(new Rect(8f, 76f, w - 16f, 30f), msg, 18, msgC, TextAnchor.MiddleCenter);
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap to start"), U("Seat the family together before it sells out."), 200f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            bool w0 = state == GameState.Victory;
            string detail = w0 ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : "";
            string body = $"<size=14>{F("{1} of {0} parties booked · {2} seats lost", st.parties.Length, party, lost)}</size>";
            int r = OiyoScreens.Result(w, h, Dark, Accent, w0, ResultLive, w0 ? U("Booked! Home for Seollal") : U("Sold out…"), detail, body,
                w0 && stageIdx < StageCount - 1 ? U("Next stage") : null, w0 && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
