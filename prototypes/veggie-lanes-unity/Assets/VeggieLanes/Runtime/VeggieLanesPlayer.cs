using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Veggie Lanes 3D: the web Veggie Lanes (src/components/games/VeggieLanes.tsx, src/lib/games/veggie-lanes.ts) rebuilt
// in Unity on the web's own 360 × 560 px field (OiyoField). Snails, beetles and slugs creep across a 5 × 8 garden toward
// the shed; dew falls (25 every 8 s, 75 to start) and dewflowers make more. Plant dewflowers, radish shooters, pumpkin
// walls and chilis; a pest at the shed ends the day. The 30 days are the web's own (VeggieLanesStages.cs).
public class VeggieLanesPlayer : MonoBehaviour
{
    const string Slug = "veggie-lanes";
    const int StageCount = 30;
    const int Rows = 5, Cols = 8;
    const float SkyDew = 25f, SkyEvery = 8f, StartDew = 75f;
    const float GX = 12f, GY = 96f, CW = 42f, CH = 64f, CardY = 432f;
    static readonly int[] Cost = { 50, 100, 50, 125 };
    static readonly float[] PlantHp = { 100f, 100f, 600f, 100f };
    static readonly float[] Recharge = { 4f, 5f, 15f, 20f };
    static readonly float[] PestHp = { 120f, 300f, 80f };
    static readonly float[] PestSpeed = { 0.22f, 0.18f, 0.42f };
    static readonly float[] Bite = { 25f, 30f, 20f };

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of veggie-lanes.ts) ----------------
    class Plant { public int kind, row, col; public float hp, timer; public Transform obj; }
    class Pest { public int kind, row; public float x, hp, max; public bool eating; public Transform obj; }
    class Seed { public int row; public float x; public Transform obj; }

    VeggieLanesStages.Level st;
    int stageIdx, starsWon, next, lost, pick, curRow = 2, curCol = 1;
    float t, dew, skyT;
    readonly float[] ready = new float[4];
    readonly List<Plant> plants = new List<Plant>();
    readonly List<Pest> pests = new List<Pest>();
    readonly List<Seed> seeds = new List<Seed>();
    bool over, won;
    int SpawnCount => st.spawns.Length / 3;

    bool Locked(int k) { foreach (int l in st.locked) if (l == k) return true; return false; }
    Plant PlantAt(int row, int col) { foreach (var p in plants) if (p.row == row && p.col == col) return p; return null; }
    bool CanPlant(int kind, int row, int col) => !over && !Locked(kind) && row >= 0 && row < Rows && col >= 0 && col < Cols && PlantAt(row, col) == null && dew >= Cost[kind] && ready[kind] <= 0f;

    bool DoPlant(int kind, int row, int col)
    {
        if (!CanPlant(kind, row, col)) return false;
        dew -= Cost[kind];
        ready[kind] = Recharge[kind];
        var p = new Plant { kind = kind, row = row, col = col, hp = PlantHp[kind], timer = kind == 0 ? 4f : kind == 1 ? 0.5f : kind == 3 ? 0.8f : 0f };
        p.obj = Sprite(plantMat[kind], 34f, 0.02f * kind + 0.1f);
        plants.Add(p);
        return true;
    }

    // events: bit 1 burst, 2 eaten, 4 killed
    int Step(float dt)
    {
        int ev = 0;
        if (over) return 0;
        t += dt;
        for (int k = 0; k < 4; k++) ready[k] = Mathf.Max(0f, ready[k] - dt);
        skyT += dt;
        if (skyT >= SkyEvery) { skyT -= SkyEvery; dew += SkyDew; }
        while (next < SpawnCount && st.spawns[next * 3] <= t)
        {
            int kind = Mathf.RoundToInt(st.spawns[next * 3 + 2]);
            float hp = Mathf.Round(PestHp[kind] * st.hpScale);
            var e = new Pest { kind = kind, row = Mathf.RoundToInt(st.spawns[next * 3 + 1]), x = Cols + 0.4f, hp = hp, max = hp };
            e.obj = Sprite(pestMat[kind], 36f, 0.3f);
            pests.Add(e);
            next++;
        }
        foreach (var p in plants)
        {
            p.timer -= dt;
            if (p.timer > 0f) continue;
            if (p.kind == 0) { dew += 25f; p.timer += 7f; }
            else if (p.kind == 1)
            {
                bool any = false;
                foreach (var e in pests) if (e.row == p.row && e.x > p.col) any = true;
                if (any) { var s = new Seed { row = p.row, x = p.col + 0.6f }; s.obj = OiyoArcade.Prim(PrimitiveType.Sphere, "Seed", seedMat, root).transform; s.obj.localScale = Vector3.one * OiyoField.U(9f); seeds.Add(s); }
                p.timer += 1.5f;
            }
            else if (p.kind == 3)
            {
                foreach (var e in pests) if (Mathf.Abs(e.row - p.row) <= 1 && Mathf.Abs(e.x - (p.col + 0.5f)) <= 1.5f) e.hp -= 300f;
                sparkle.Emit(field.W(GX + (p.col + 0.5f) * CW, GY + (p.row + 0.5f) * CH, -0.6f), new Color(1f, 0.42f, 0.42f), 36, 5f, 0.12f, 0.6f);
                ev |= 1;
                p.hp = 0f;
            }
        }
        foreach (var s in seeds) s.x += 6f * dt;
        for (int i = seeds.Count - 1; i >= 0; i--)
        {
            var s = seeds[i];
            bool gone = s.x > Cols + 1;
            if (!gone)
                foreach (var e in pests)
                    if (e.row == s.row && e.hp > 0f && Mathf.Abs(e.x - s.x) < 0.3f) { e.hp -= 20f; gone = true; break; }
            if (gone) { Destroy(s.obj.gameObject); seeds.RemoveAt(i); }
        }
        foreach (var e in pests)
        {
            if (e.hp <= 0f) continue;
            int col = Mathf.FloorToInt(e.x);
            Plant food = null;
            foreach (var p in plants) if (p.row == e.row && p.col == col && p.hp > 0f) { food = p; break; }
            e.eating = food != null;
            if (food != null) food.hp -= Bite[e.kind] * dt;
            else e.x -= PestSpeed[e.kind] * dt;
        }
        for (int i = pests.Count - 1; i >= 0; i--)
            if (pests[i].hp <= 0f)
            {
                sparkle.Emit(pests[i].obj.position, new Color(0.55f, 0.9f, 0.6f), 10, 3f, 0.08f, 0.4f);
                Destroy(pests[i].obj.gameObject); pests.RemoveAt(i); ev |= 4;
            }
        for (int i = plants.Count - 1; i >= 0; i--)
            if (plants[i].hp <= 0f)
            {
                if (plants[i].kind == 0 || plants[i].kind == 1) lost++;
                if (plants[i].kind != 3) ev |= 2;
                Destroy(plants[i].obj.gameObject); plants.RemoveAt(i);
            }
        bool reached = false;
        foreach (var e in pests) if (e.x < 0f) reached = true;
        if (reached) { over = true; won = false; }
        else if (next >= SpawnCount && pests.Count == 0) { over = true; won = true; }
        return ev;
    }

    int StarsFor()
    {
        if (!won) return 0;
        if (lost == 0) return 3;
        if (lost <= 3) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    OiyoField field;
    Camera cam;
    Transform root, cursor;
    Transform[] cards, cardShade;
    Material[] plantMat, pestMat;
    Material seedMat, cardMat, cardPick, cardLock, shadeMat, cursorOk, cursorNo;
    Renderer cursorR;
    Renderer[] cardR;
    Bursts sparkle;
    Synth synth;
    bool showStages;

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(360f, 560f, new Color(0.65f, 0.85f, 1f));
        cam = field.Cam;
        OiyoField.Lights(new Color(0.75f, 0.75f, 0.75f), 0.6f, 50f, -25f);
        sparkle = new Bursts(transform, 0.5f);
        synth = new Synth(gameObject);
        string[] pn = { "dewflower", "radish", "pumpkin", "chili" };
        string[] en = { "snail", "beetle", "slug" };
        plantMat = new Material[4];
        for (int k = 0; k < 4; k++) { plantMat[k] = OiyoField.Sprite("VL/" + pn[k]); plantMat[k].renderQueue = 3001; }
        pestMat = new Material[3];
        for (int k = 0; k < 3; k++) { pestMat[k] = OiyoField.Sprite("VL/" + en[k]); pestMat[k].renderQueue = 3003; }
        seedMat = OiyoArcade.Glow(new Color(1f, 1f, 0.85f));
        cardMat = OiyoArcade.Lit(new Color(0.95f, 0.95f, 0.96f), 0.3f);
        cardPick = OiyoArcade.Lit(new Color(1f, 0.95f, 0.75f), 0.3f);
        cardLock = OiyoArcade.Lit(new Color(0.53f, 0.56f, 0.59f), 0.3f);
        shadeMat = OiyoArcade.Glow(new Color(0.13f, 0.15f, 0.16f));
        cursorOk = OiyoArcade.Glow(new Color(1f, 1f, 1f));
        cursorNo = OiyoArcade.Glow(new Color(0.98f, 0.32f, 0.32f));
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    Transform Sprite(Material m, float size, float z)
    {
        var q = OiyoField.Quad("Sprite", m, root, size, size);
        q.position = field.W(0f, 0f, -z);
        return q;
    }

    void LoadStage(int i, bool ready = true)
    {
        stageIdx = Mathf.Clamp(i, 0, StageCount - 1);
        StopAllCoroutines();
        st = VeggieLanesStages.All[stageIdx];
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Garden").transform;
        plants.Clear(); pests.Clear(); seeds.Clear();
        t = 0f; dew = StartDew; skyT = 0f; next = 0; lost = 0;
        for (int k = 0; k < 4; k++) this.ready[k] = 0f;
        over = false; won = false; starsWon = 0;
        pick = Locked(0) ? 1 : 0;
        curRow = 2; curCol = 1;
        botT = 0.5f;
        showStages = false;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Animate(0f);
    }

    void BuildScene()
    {
        var light = OiyoArcade.Lit(new Color(0.55f, 0.91f, 0.6f), 0.2f);
        var dark = OiyoArcade.Lit(new Color(0.41f, 0.86f, 0.49f), 0.2f);
        for (int r = 0; r < Rows; r++)
            for (int k = 0; k < Cols; k++)
            {
                var c = OiyoArcade.Prim(PrimitiveType.Cube, "Bed", (r + k) % 2 == 1 ? dark : light, root).transform;
                c.localScale = new Vector3(OiyoField.U(CW), OiyoField.U(CH), 0.3f);
                c.position = field.W(GX + (k + 0.5f) * CW, GY + (r + 0.5f) * CH, 0.15f);
            }
        var shed = OiyoArcade.Prim(PrimitiveType.Cube, "Shed", OiyoArcade.Lit(new Color(0.53f, 0.18f, 0.61f), 0.3f), root).transform;
        shed.localScale = new Vector3(OiyoField.U(GX + 4f), OiyoField.U(Rows * CH), 0.8f);
        shed.position = field.W(GX / 2f - 2f, GY + Rows * CH / 2f, -0.1f);
        cursorR = OiyoArcade.Prim(PrimitiveType.Cube, "Cursor", cursorOk, root).GetComponent<Renderer>();
        cursor = cursorR.transform;
        cursor.localScale = new Vector3(OiyoField.U(CW - 6f), OiyoField.U(4f), 0.05f);
        cards = new Transform[4]; cardShade = new Transform[4]; cardR = new Renderer[4];
        for (int k = 0; k < 4; k++)
        {
            var c = OiyoArcade.Prim(PrimitiveType.Cube, "Card", cardMat, root);
            cardR[k] = c.GetComponent<Renderer>();
            cards[k] = c.transform;
            cards[k].localScale = new Vector3(OiyoField.U(80f), OiyoField.U(112f), 0.2f);
            cards[k].position = field.W(10f + k * 86f + 40f, CardY + 56f, 0.1f);
            if (!Locked(k)) { var s = Sprite(plantMat[k], 44f, 0.15f); s.position = field.W(10f + k * 86f + 40f, CardY + 36f, -0.15f); }
            cardShade[k] = OiyoArcade.Prim(PrimitiveType.Cube, "Shade", shadeMat, root).transform;
        }
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("veggie-lanes", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        if (state == GameState.Playing && !over)
        {
            int ev = Step(dt);
            if ((ev & 1) != 0) synth.Tone(120f, 0.3f, Wave.Noise, 0.16f, 60f, 6f);
            if ((ev & 4) != 0) synth.Tone(660f, 0.08f, Wave.Triangle, 0.1f, 880f, 10f);
            if ((ev & 2) != 0) synth.Tone(200f, 0.12f, Wave.Square, 0.08f, 140f, 10f);
            if (over) End();
        }
        Animate(dt);
    }

    void TapCell(int row, int col)
    {
        curRow = row; curCol = col;
        if (DoPlant(pick, row, col))
        {
            sparkle.Emit(field.W(GX + (col + 0.5f) * CW, GY + (row + 0.8f) * CH, -0.5f), new Color(0.55f, 0.91f, 0.6f), 10, 2.5f, 0.07f, 0.4f);
            synth.Tone(523f, 0.08f, Wave.Triangle, 0.12f, 784f, 10f);
        }
        else synth.Tone(180f, 0.08f, Wave.Square, 0.06f);
    }

    void PickCard(int k)
    {
        if (k < 0 || k > 3 || Locked(k)) return;
        pick = k;
        synth.Tone(880f, 0.04f, Wave.Square, 0.06f);
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
                    // input is read once per frame: a tap on a card picks it, a tap on the garden plants there
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (state == GameState.Ready) { state = GameState.Playing; continue; }
                        if (OiyoArcade.OverUi(b.pos) || !field.ToField(b.pos, out Vector2 f)) continue;
                        if (f.y >= CardY) { PickCard(Mathf.FloorToInt((f.x - 10f) / 86f)); continue; }
                        int col = Mathf.FloorToInt((f.x - GX) / CW), row = Mathf.FloorToInt((f.y - GY) / CH);
                        if (row >= 0 && row < Rows && col >= 0 && col < Cols) TapCell(row, col);
                    }
                    bool any = false;
                    for (int k = 0; k < 4; k++) if (Input.GetKeyDown(KeyCode.Alpha1 + k)) { PickCard(k); any = true; }
                    if (Input.GetKeyDown(KeyCode.UpArrow)) { curRow = Mathf.Max(0, curRow - 1); any = true; }
                    if (Input.GetKeyDown(KeyCode.DownArrow)) { curRow = Mathf.Min(Rows - 1, curRow + 1); any = true; }
                    if (Input.GetKeyDown(KeyCode.LeftArrow)) { curCol = Mathf.Max(0, curCol - 1); any = true; }
                    if (Input.GetKeyDown(KeyCode.RightArrow)) { curCol = Mathf.Min(Cols - 1, curCol + 1); any = true; }
                    if (Input.GetKeyDown(KeyCode.Space)) { if (state == GameState.Playing) TapCell(curRow, curCol); any = true; }
                    if (state == GameState.Ready && (any || confirm)) state = GameState.Playing;
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
            OiyoArcade.Record(Slug, stageIdx, starsWon, Mathf.Max(0, 1000 - lost * 100), StageCount);
            sparkle.Emit(field.W(180f, 260f, -1f), new Color(1f, 0.85f, 0.25f), 40, 5f, 0.1f, 1f);
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
        field.Fit(60f, 10f, 0f, 40f, 548f);
        float now = Time.time;
        foreach (var p in plants)
        {
            float bob = p.kind == 2 ? 0f : Mathf.Sin(now * 3f + p.col) * 1.5f;
            float s = p.kind == 3 && p.timer > 0f ? 1f + (0.8f - p.timer) * 0.4f : 1f;
            p.obj.localScale = new Vector3(OiyoField.U(34f * s), OiyoField.U(34f * s), 1f);
            p.obj.position = field.W(GX + (p.col + 0.5f) * CW, GY + (p.row + 0.55f) * CH + bob, -0.12f - 0.01f * p.kind);
        }
        foreach (var e in pests)
        {
            float wig = Mathf.Sin(now * (e.eating ? 14f : 5f)) * 2f;
            e.obj.position = field.W(GX + e.x * CW + 14f + wig, GY + (e.row + 0.6f) * CH, -0.3f);
        }
        foreach (var s in seeds) s.obj.position = field.W(GX + s.x * CW, GY + s.row * CH + 28f, -0.35f);
        cursorR.sharedMaterial = CanPlant(pick, curRow, curCol) ? cursorOk : cursorNo;
        cursor.position = field.W(GX + (curCol + 0.5f) * CW, GY + (curRow + 1f) * CH - 6f, -0.05f);
        for (int k = 0; k < 4; k++)
        {
            cardR[k].sharedMaterial = Locked(k) ? cardLock : pick == k ? cardPick : cardMat;
            float wait = Locked(k) ? 0f : ready[k] / Recharge[k];
            // the recharge shade covers the plant picture only, so the cost and name stay readable
            cardShade[k].localScale = new Vector3(OiyoField.U(80f), OiyoField.U(Mathf.Max(0.01f, 64f * wait)), 0.05f);
            cardShade[k].position = field.W(10f + k * 86f + 40f, CardY + 32f * wait, wait > 0f ? -0.3f : 1f);
        }
    }

    // ?oiyotest=1 prints the state to the browser console for the automated play check, with the screen point (px
    // from the top-left) the sensible gardener of the web game (nextPlanting) taps next: a card first, then a square.
    bool testLog; float testT, botT;
    int[] botWant;
    Vector2 Scr(float fx, float fy) { var sp = cam.WorldToScreenPoint(field.W(fx, fy, 0f)); return new Vector2(sp.x, Screen.height - sp.y); }
    float Threat(int row) { float s = 0f; foreach (var e in pests) if (e.row == row) s += e.hp; return s; }
    int Shooters(int row) { int n = 0; foreach (var p in plants) if (p.row == row && p.kind == 1) n++; return n; }
    int Free(int row, int from, int to) { for (int c = from; c <= to; c++) if (PlantAt(row, c) == null) return c; return -1; }
    int[] NextPlanting(int flowers)
    {
        Pest close = null;
        foreach (var e in pests) if (e.x < 2.6f && (close == null || e.x < close.x)) close = e;
        if (close != null)
        {
            int col = Mathf.Max(0, Mathf.FloorToInt(close.x));
            if (!Locked(3) && CanPlant(3, close.row, col)) return new[] { 3, close.row, col };
            for (int c = col; c >= 0; c--) if (!Locked(2) && CanPlant(2, close.row, c)) return new[] { 2, close.row, c };
        }
        var rows = new List<int> { 0, 1, 2, 3, 4 };
        rows.Sort((a, b) => { int d = (Threat(b) - Shooters(b) * 200f).CompareTo(Threat(a) - Shooters(a) * 200f); return d != 0 ? d : a.CompareTo(b); });
        foreach (int r in rows)
        {
            int need = Mathf.CeilToInt(Threat(r) / 220f);
            if (Threat(r) > 0f && Shooters(r) < Mathf.Max(1, need))
            {
                int c = Free(r, 1, 4);
                if (c >= 0 && CanPlant(1, r, c)) return new[] { 1, r, c };
                if (c >= 0) return null;
            }
        }
        foreach (int r in rows)
        {
            if (Locked(2) || Threat(r) < 200f) continue;
            bool hasPumpkin = false; int front = -1;
            foreach (var p in plants) { if (p.row == r && p.kind == 2) hasPumpkin = true; if (p.row == r && p.kind == 1) front = Mathf.Max(front, p.col); }
            if (hasPumpkin) continue;
            front++;
            if (front > 0 && front < Cols && CanPlant(2, r, front)) return new[] { 2, r, front };
        }
        int flowersNow = 0;
        foreach (var p in plants) if (p.kind == 0) flowersNow++;
        if (flowersNow < flowers)
            for (int k = 0; k < Rows; k++) { int r = (k * 2) % Rows; if (CanPlant(0, r, 0)) return new[] { 0, r, 0 }; }
        for (int want = 1; want <= 2; want++)
            for (int r = 0; r < Rows; r++)
                if (Shooters(r) < want)
                {
                    int c = Free(r, 1, 4);
                    if (c >= 0 && CanPlant(1, r, c)) return new[] { 1, r, c };
                    if (c >= 0) return null;
                }
        return null;
    }
    void TestTick(float dt)
    {
        if (!testLog) return;
        if (state == GameState.Playing && !over)
        {
            if (botWant != null && PlantAt(botWant[1], botWant[2]) != null) botWant = null;
            if ((botT -= dt) <= 0f) { botT = 0.4f; botWant = NextPlanting(5); }
        }
        else botWant = null;
        if ((testT -= dt) > 0f) return;
        testT = 0.05f;
        string nx = "null";
        if (botWant != null)
        {
            var p = pick != botWant[0] ? Scr(10f + botWant[0] * 86f + 40f, CardY + 56f) : Scr(GX + (botWant[2] + 0.5f) * CW, GY + (botWant[1] + 0.5f) * CH);
            nx = $"[{p.x:F1},{p.y:F1}]";
        }
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"t\":{t:F1},\"dew\":{dew:F0},\"pests\":{pests.Count},\"next\":{nx},\"spawned\":{next},\"of\":{SpawnCount},\"lost\":{lost},\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.97f, 0.4f, 0.03f, 0.97f);
    static readonly Color Dark = new Color(0.1f, 0.11f, 0.12f, 0.9f);

    Vector2 Gui(Vector2 f, float z = -0.4f) => OiyoArcade.ToGui(cam.WorldToScreenPoint(field.W(f.x, f.y, z)));
    float GuiPerField => field.ScreenPerField() / OiyoArcade.ComputeScale();
    void Label(Rect r, string s, float size, Color c, float z = -0.4f)
    {
        var p = Gui(new Vector2(r.x, r.y), z); var q = Gui(new Vector2(r.xMax, r.yMax), z);
        OiyoArcade.Text(new Rect(p.x, p.y, q.x - p.x, q.y - p.y), s, Mathf.Max(9, Mathf.RoundToInt(size * GuiPerField)), c, TextAnchor.MiddleCenter, true);
    }

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("Pests {0}", VeggieLanesStages.All[i].spawns.Length / 3);
    static readonly string[] PlantNames = { "Dewflower", "Radish", "Pumpkin", "Chili" };

    void OnGUI()
    {
        OiyoArcade.Begin();
        float w = OiyoArcade.W, h = OiyoArcade.H;
        if (state == GameState.Menu)
        {
            if (showStages)
            {
                int pick2 = OiyoScreens.Stages(w, h, Dark, Accent, Slug, StageCount, U("Choose a stage"), U("Back"), U("Stage"));
                if (pick2 == -2) showStages = false; else if (pick2 >= 0) LoadStage(pick2);
                return;
            }
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(0.85f, 1f, 0.85f), U("Veggie Lanes"),
                U("Gather dew and plant radish shooters, pumpkin walls and chilis to stop the snails, beetles and slugs before they reach the shed."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        for (int k = 0; k < 4; k++)
        {
            float x = 10f + k * 86f;
            Label(new Rect(x, CardY + 66f, 80f, 20f), Locked(k) ? "—" : Cost[k].ToString(), 15f, dew >= Cost[k] ? new Color(0.13f, 0.15f, 0.16f) : new Color(0.79f, 0.16f, 0.16f), -0.5f);
            Label(new Rect(x, CardY + 88f, 80f, 18f), U(PlantNames[k]), 11f, new Color(0.13f, 0.15f, 0.16f), -0.5f);
        }
        foreach (var e in pests)
            if (e.hp < e.max)
            {
                var a = Gui(new Vector2(GX + e.x * CW, GY + e.row * CH + 10f)); var b = Gui(new Vector2(GX + e.x * CW + 28f, GY + e.row * CH + 14f));
                OiyoArcade.Fill(new Rect(a.x, a.y, b.x - a.x, Mathf.Max(3f, b.y - a.y)), new Color(0.13f, 0.15f, 0.16f));
                OiyoArcade.Fill(new Rect(a.x, a.y, (b.x - a.x) * Mathf.Clamp01(e.hp / e.max), Mathf.Max(3f, b.y - a.y)), new Color(0.98f, 0.32f, 0.32f));
            }
        var bar = new Rect(8f, 8f, w - 16f, 64f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 12f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>  " + F("Dew {0}", Mathf.FloorToInt(dew)) + "   " + F("Pests {0}/{1}", next, SpawnCount), 15, new Color(0.85f, 1f, 0.85f));
        OiyoArcade.Bar(new Rect(20f, 40f, w - 100f, 12f), next / (float)Mathf.Max(1, SpawnCount), new Color(0.2f, 0.23f, 0.25f), new Color(0.97f, 0.4f, 0.03f));
        if (OiyoArcade.Button(new Rect(w - 60f, 14f, 44f, 44f), "<b>II</b>", OiyoScreens.Slate, 18))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap to start"), U("Pick a seed card, then tap a square to plant!"), 330f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            string detail = won ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : "";
            string body = $"<size=14>{F("Crops lost: {0}", lost)}</size>";
            int r = OiyoScreens.Result(w, h, Dark, Accent, won, ResultLive, won ? U("The garden is safe!") : U("A pest reached the shed"), detail, body,
                won && stageIdx < StageCount - 1 ? U("Next stage") : null, won && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
