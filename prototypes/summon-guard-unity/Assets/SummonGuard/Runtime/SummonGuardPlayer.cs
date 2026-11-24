using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Summon Guard 3D: the web Summon Guard (src/components/games/SummonGuard.tsx, src/lib/games/summon-guard.ts) rebuilt
// in Unity on the web's own 360 × 560 px field (OiyoField). Monsters loop the track round the camp. Summon pays coins
// for a random guard on an empty post (archer, mage, frost caster, cannon); two guards of the same kind and rank merge
// into the next rank, of a random kind again. 25 monsters on the track and the camp is overrun. The waves and the luck
// of every summon and merge are the web's own (SummonGuardStages.cs; the same mulberry32 stream).
public class SummonGuardPlayer : MonoBehaviour
{
    const string Slug = "summon-guard";
    const int StageCount = 30;
    const int Cols = 4, Rows = 3, Posts = Cols * Rows, Overrun = 25, MaxRank = 4;
    const float Track = 1000f, SpawnGap = 0.8f, WaveGap = 4f;
    static readonly float[] Dmg = { 10f, 7f, 5f, 36f };
    static readonly float[] Every = { 0.5f, 0.8f, 0.6f, 1.6f };
    static readonly int[] Targets = { 1, 3, 1, 1 };
    static readonly float[] Slow = { 0f, 0f, 1.5f, 0f };
    static readonly string[] Names = { "archer", "mage", "frost", "cannon" };
    static readonly Color[] RankColours = { new Color(0.81f, 0.83f, 0.85f), new Color(0.41f, 0.86f, 0.49f), new Color(0.3f, 0.67f, 0.97f), new Color(0.85f, 0.47f, 0.95f) };
    static readonly Color[] ShotColours = { new Color(1f, 0.88f, 0.4f), new Color(0.69f, 0.59f, 0.99f), new Color(0.65f, 0.85f, 1f), new Color(1f, 0.57f, 0.17f) };

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of summon-guard.ts) ----------------
    class Guard { public int kind, rank; public float cool; }
    class Monster { public float hp, max, pos, speed, slowed; public bool boss; public int reward; }

    SummonGuardStages.Level st;
    int stageIdx, starsWon, coins, summons, wave, spawned, peak;
    float t, nextSpawn;
    uint rngState;
    readonly Guard[] posts = new Guard[Posts];
    readonly List<Monster> monsters = new List<Monster>();
    bool over, won;

    float Next()
    {
        unchecked
        {
            rngState += 0x6d2b79f5u;
            uint x = rngState;
            x = (uint)((int)(x ^ (x >> 15)) * (int)(x | 1u));
            x ^= x + (uint)((int)(x ^ (x >> 7)) * (int)(x | 61u));
            return (float)((x ^ (x >> 14)) / 4294967296.0);
        }
    }

    static float RankScale(int rank) => Mathf.Pow(3f, rank - 1);
    int SummonCost => 10 + summons * 2;

    int Summon()
    {
        if (over) return -1;
        int post = System.Array.IndexOf(posts, null);
        if (post < 0 || coins < SummonCost) return -1;
        coins -= SummonCost;
        summons++;
        posts[post] = new Guard { kind = Mathf.FloorToInt(Next() * 4f), rank = 1, cool = 0.3f };
        return post;
    }

    bool CanMerge(int a, int b) => a != b && a >= 0 && b >= 0 && posts[a] != null && posts[b] != null && posts[a].kind == posts[b].kind && posts[a].rank == posts[b].rank && posts[a].rank < MaxRank;

    bool Merge(int a, int b)
    {
        if (over || !CanMerge(a, b)) return false;
        int rank = posts[a].rank + 1;
        posts[b] = null;
        posts[a] = new Guard { kind = Mathf.FloorToInt(Next() * 4f), rank = rank, cool = 0.3f };
        return true;
    }

    int Partner(int a)
    {
        for (int b = 0; b < Posts; b++) if (CanMerge(a, b)) return b;
        return -1;
    }

    void Spawn()
    {
        bool boss = wave == st.waves && spawned == st.perWave - 1;
        float hp = boss ? st.bossHp : Mathf.Round(st.hp * Mathf.Pow(st.growth, wave - 1));
        monsters.Add(new Monster { hp = hp, max = hp, pos = 0f, speed = boss ? st.speed * 0.6f : st.speed, boss = boss, reward = boss ? 30 : 3 });
    }

    int Step(float dt)
    {
        if (over) return 0;
        t += dt;
        if (t >= nextSpawn && wave <= st.waves)
        {
            if (wave == 0 || spawned >= st.perWave) { if (wave < st.waves) { wave++; spawned = 0; } }
            if (spawned < st.perWave && wave >= 1)
            {
                Spawn();
                spawned++;
                nextSpawn = t + (spawned >= st.perWave ? WaveGap : SpawnGap);
            }
        }
        foreach (var m in monsters)
        {
            float v = m.slowed > 0f ? m.speed * 0.5f : m.speed;
            m.pos = (m.pos + v * dt) % Track;
            m.slowed = Mathf.Max(0f, m.slowed - dt);
        }
        for (int p = 0; p < Posts; p++)
        {
            var g = posts[p];
            if (g == null) continue;
            g.cool -= dt;
            if (g.cool > 0f || monsters.Count == 0) continue;
            g.cool += Every[g.kind];
            float d = Dmg[g.kind] * RankScale(g.rank);
            for (int k = 0; k < Mathf.Min(Targets[g.kind], monsters.Count); k++)
            {
                monsters[k].hp -= d;
                if (Slow[g.kind] > 0f) monsters[k].slowed = Slow[g.kind];
                if (shots.Count < 24) shots.Add(new Shot { post = p, monster = k, t = 0.08f, kind = g.kind });
            }
        }
        int kills = 0;
        for (int k = monsters.Count - 1; k >= 0; k--)
        {
            if (monsters[k].hp > 0f) continue;
            coins += monsters[k].reward;
            monsters.RemoveAt(k);
            kills++;
        }
        peak = Mathf.Max(peak, monsters.Count);
        if (monsters.Count >= Overrun) over = true;
        else if (wave == st.waves && spawned >= st.perWave && monsters.Count == 0) { over = true; won = true; }
        return kills;
    }

    int StarsFor()
    {
        if (!won) return 0;
        if (peak <= st.peakPar) return 3;
        if (peak <= Mathf.RoundToInt((st.peakPar + Overrun) / 2f)) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    const float Cell = 64f, BY = 214f;
    static readonly float BX = (360f - Cell * Cols) / 2f;
    static Vector2 PostXY(int p) => new Vector2(BX + (p % Cols) * Cell + Cell / 2f, BY + (p / Cols) * Cell + Cell / 2f);
    static readonly Rect TrackRect = new Rect(22f, 140f, 316f, 330f);
    static readonly Rect SummonBox = new Rect(70f, 490f, 220f, 56f);
    static Vector2 TrackXY(float pos)
    {
        float per = 2f * (TrackRect.width + TrackRect.height);
        float d = pos / Track * per;
        if (d < TrackRect.width) return new Vector2(TrackRect.x + d, TrackRect.y);
        d -= TrackRect.width;
        if (d < TrackRect.height) return new Vector2(TrackRect.xMax, TrackRect.y + d);
        d -= TrackRect.height;
        if (d < TrackRect.width) return new Vector2(TrackRect.xMax - d, TrackRect.yMax);
        d -= TrackRect.width;
        return new Vector2(TrackRect.x, TrackRect.yMax - d);
    }

    struct Shot { public int post, monster, kind; public float t; }
    readonly List<Shot> shots = new List<Shot>();

    OiyoField field;
    Camera cam;
    Transform root, selMark, summonPlate;
    readonly Transform[] guardObj = new Transform[Posts], postObj = new Transform[Posts];
    readonly Transform[][] rankPips = new Transform[Posts][];
    readonly List<Transform> monObj = new List<Transform>(), barObj = new List<Transform>(), shotObj = new List<Transform>();
    Material[] guardMat, pipMat, shotMat;
    Material postMat, glowMat, trackMat, grassMat, monMat, monSlow, bossMat, barMat, summonOn, summonOff, selMat;
    Bursts sparkle;
    Synth synth;
    bool showStages;
    int selected = -1;

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(360f, 560f, new Color(0.12f, 0.18f, 0.12f));
        cam = field.Cam;
        OiyoField.Lights(new Color(0.6f, 0.62f, 0.6f), 0.75f, 45f, -25f);
        sparkle = new Bursts(transform, 0.5f);
        synth = new Synth(gameObject);
        guardMat = new Material[4];
        for (int k = 0; k < 4; k++) guardMat[k] = OiyoField.Sprite("SG/" + Names[k]);
        pipMat = new Material[MaxRank];
        for (int k = 0; k < MaxRank; k++) pipMat[k] = OiyoArcade.Lit(RankColours[k], 0.4f);
        shotMat = new Material[4];
        for (int k = 0; k < 4; k++) shotMat[k] = OiyoArcade.Glow(ShotColours[k]);
        postMat = OiyoArcade.Lit(new Color(0.17f, 0.29f, 0.17f), 0.2f);
        glowMat = OiyoArcade.Lit(new Color(0.27f, 0.42f, 0.27f), 0.2f);
        trackMat = OiyoArcade.Lit(new Color(0.54f, 0.42f, 0.27f), 0.15f, OiyoArcade.Art("SG/dirt", true));
        grassMat = OiyoArcade.Lit(new Color(0.18f, 0.3f, 0.18f), 0.1f);
        monMat = OiyoArcade.Lit(new Color(0.91f, 0.35f, 0.05f), 0.4f);
        monSlow = OiyoArcade.Lit(new Color(0.45f, 0.75f, 0.99f), 0.4f);
        bossMat = OiyoArcade.Lit(new Color(0.79f, 0.16f, 0.16f), 0.5f);
        barMat = OiyoArcade.Lit(new Color(0.32f, 0.81f, 0.4f), 0.1f);
        summonOn = OiyoArcade.Lit(new Color(0.94f, 0.55f, 0f), 0.4f);
        summonOff = OiyoArcade.Lit(new Color(0.29f, 0.31f, 0.34f), 0.3f);
        selMat = OiyoArcade.Lit(new Color(1f, 0.83f, 0.23f), 0.3f);
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int i, bool ready = true)
    {
        stageIdx = Mathf.Clamp(i, 0, StageCount - 1);
        StopAllCoroutines();
        st = SummonGuardStages.All[stageIdx];
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Camp").transform;
        for (int p = 0; p < Posts; p++) posts[p] = null;
        monsters.Clear();
        shots.Clear();
        t = 0f; coins = st.coins; summons = 0; wave = 0; spawned = 0; nextSpawn = 2f; peak = 0;
        rngState = st.seed;
        over = false; won = false; starsWon = 0;
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
        Box(grassMat, 180f, 305f, 360f, 380f, 0.3f, 0.2f);
        var r = TrackRect;
        Box(trackMat, r.center.x, r.y, r.width + 22f, 22f, 0.1f, 0.1f);
        Box(trackMat, r.center.x, r.yMax, r.width + 22f, 22f, 0.1f, 0.1f);
        Box(trackMat, r.x, r.center.y, 22f, r.height, 0.1f, 0.1f);
        Box(trackMat, r.xMax, r.center.y, 22f, r.height, 0.1f, 0.1f);
        for (int p = 0; p < Posts; p++)
        {
            var q = PostXY(p);
            postObj[p] = Box(postMat, q.x, q.y, Cell - 6f, Cell - 6f, 0.05f, 0.12f);
            var g = OiyoField.Quad("Guard", guardMat[0], root, 40f, 40f);
            g.position = field.W(q.x, q.y - 4f, -0.3f);
            guardObj[p] = g;
            rankPips[p] = new Transform[MaxRank];
            for (int k = 0; k < MaxRank; k++) rankPips[p][k] = Box(pipMat[0], 0f, 0f, 8f, 6f, -0.3f, 0.05f);
        }
        summonPlate = Box(summonOff, SummonBox.center.x, SummonBox.center.y, SummonBox.width, SummonBox.height, -0.05f, 0.25f);
        selMark = Box(selMat, 0f, 0f, Cell - 2f, Cell - 2f, 0.1f, 0.1f);
        monObj.Clear(); barObj.Clear(); shotObj.Clear();
        for (int k = 0; k < Overrun + 2; k++)
        {
            monObj.Add(Box(monMat, 0f, 0f, 14f, 14f, -0.2f, 0.3f));
            barObj.Add(Box(barMat, 0f, 0f, 14f, 2f, -0.4f, 0.02f));
        }
        for (int k = 0; k < 24; k++)
        {
            var s = OiyoArcade.Prim(PrimitiveType.Cube, "Shot", shotMat[0], root).transform;
            shotObj.Add(s);
        }
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("summon-guard", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        if (state == GameState.Playing && !over)
        {
            if (Step(dt) > 0) synth.Tone(1046f, 0.03f, Wave.Square, 0.05f, 0f, 30f);
            if (over) End();
        }
        for (int k = shots.Count - 1; k >= 0; k--) { var s = shots[k]; s.t -= dt; if (s.t <= 0f) shots.RemoveAt(k); else shots[k] = s; }
        Animate(dt);
    }

    void DoSummon()
    {
        int p = Summon();
        if (p >= 0) { var q = PostXY(p); sparkle.Emit(field.W(q.x, q.y, -0.6f), Color.white, 8, 2.5f, 0.06f, 0.4f); synth.Tone(660f, 0.08f, Wave.Triangle, 0.12f, 990f, 10f); }
        else synth.Tone(180f, 0.08f, Wave.Square, 0.08f, 0f, 14f);
    }

    void DoPost(int p)
    {
        if (p < 0 || p >= Posts) return;
        if (posts[p] == null) { selected = -1; return; }
        if (selected == p) { selected = -1; return; }
        if (selected >= 0 && CanMerge(selected, p))
        {
            Merge(selected, p);
            var q = PostXY(selected);
            sparkle.Emit(field.W(q.x, q.y, -0.6f), RankColours[posts[selected].rank - 1], 16, 4f, 0.08f, 0.6f);
            synth.Tone(784f, 0.18f, Wave.Triangle, 0.15f, 1568f, 6f);
            selected = -1;
            return;
        }
        selected = p;
        synth.Tone(523f, 0.04f, Wave.Triangle, 0.08f, 0f, 16f);
    }

    void AutoMerge()
    {
        int best = -1;
        for (int p = 0; p < Posts; p++) if (posts[p] != null && Partner(p) >= 0 && (best < 0 || posts[p].rank > posts[best].rank)) best = p;
        if (best < 0) return;
        selected = -1;
        DoPost(best);
        DoPost(Partner(best));
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
                        if (state == GameState.Ready) state = GameState.Playing;
                        if (SummonBox.Contains(f)) { DoSummon(); continue; }
                        int col = Mathf.FloorToInt((f.x - BX) / Cell), row = Mathf.FloorToInt((f.y - BY) / Cell);
                        if (col >= 0 && col < Cols && row >= 0 && row < Rows) DoPost(row * Cols + col);
                    }
                    if (Input.GetKeyDown(KeyCode.Space) || Input.GetKeyDown(KeyCode.S)) { if (state == GameState.Ready) state = GameState.Playing; DoSummon(); }
                    if (Input.GetKeyDown(KeyCode.M)) { if (state == GameState.Ready) state = GameState.Playing; AutoMerge(); }
                    int d = Input.GetKeyDown(KeyCode.RightArrow) ? 1 : Input.GetKeyDown(KeyCode.LeftArrow) ? -1 : Input.GetKeyDown(KeyCode.DownArrow) ? Cols : Input.GetKeyDown(KeyCode.UpArrow) ? -Cols : 0;
                    if (d != 0) selected = (Mathf.Max(0, selected) + d + Posts) % Posts;
                    if (confirm && selected >= 0) { int b2 = Partner(selected); if (b2 >= 0) DoPost(b2); }
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
            OiyoArcade.Record(Slug, stageIdx, starsWon, Mathf.Max(0, (Overrun - peak) * 10), StageCount);
            sparkle.Emit(field.W(180f, 300f, -1f), new Color(1f, 0.85f, 0.25f), 40, 5f, 0.1f, 1f);
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
        field.Fit(80f, 10f, 14f, 120f, 550f);
        for (int p = 0; p < Posts; p++)
        {
            var g = posts[p];
            guardObj[p].gameObject.SetActive(g != null);
            postObj[p].GetComponent<Renderer>().sharedMaterial = g != null && Partner(p) >= 0 ? glowMat : postMat;
            var q = PostXY(p);
            for (int k = 0; k < MaxRank; k++)
            {
                bool on = g != null && k < g.rank;
                rankPips[p][k].gameObject.SetActive(on);
                if (!on) continue;
                rankPips[p][k].GetComponent<Renderer>().sharedMaterial = pipMat[g.rank - 1];
                rankPips[p][k].position = field.W(q.x - g.rank * 5f + k * 10f + 5f, q.y + 23f, -0.3f);
            }
            if (g != null) guardObj[p].GetComponent<Renderer>().sharedMaterial = guardMat[g.kind];
        }
        selMark.gameObject.SetActive(selected >= 0);
        if (selected >= 0) { var q = PostXY(selected); selMark.position = field.W(q.x, q.y, 0.04f); }
        summonPlate.GetComponent<Renderer>().sharedMaterial = coins >= SummonCost && System.Array.IndexOf(posts, null) >= 0 ? summonOn : summonOff;
        for (int k = 0; k < monObj.Count; k++)
        {
            bool on = k < monsters.Count;
            monObj[k].gameObject.SetActive(on);
            barObj[k].gameObject.SetActive(on);
            if (!on) continue;
            var m = monsters[k];
            var p = TrackXY(m.pos);
            float r = m.boss ? 26f : 14f;
            monObj[k].GetComponent<Renderer>().sharedMaterial = m.boss ? bossMat : m.slowed > 0f ? monSlow : monMat;
            monObj[k].position = field.W(p.x, p.y, -0.2f - Mathf.Abs(Mathf.Sin(Time.time * 8f + k)) * 0.15f);
            monObj[k].localScale = new Vector3(OiyoField.U(r), OiyoField.U(r), 0.3f);
            float frac = Mathf.Clamp01(m.hp / m.max);
            barObj[k].position = field.W(p.x - r / 2f + r * frac / 2f, p.y - r / 2f - 4f, -0.45f);
            barObj[k].localScale = new Vector3(OiyoField.U(r * frac + 0.01f), OiyoField.U(2f), 0.02f);
        }
        for (int k = 0; k < shotObj.Count; k++)
        {
            bool on = k < shots.Count && shots[k].monster < monsters.Count;
            shotObj[k].gameObject.SetActive(on);
            if (!on) continue;
            var a = PostXY(shots[k].post);
            var b = TrackXY(monsters[shots[k].monster].pos);
            var wa = field.W(a.x, a.y, -0.35f); var wb = field.W(b.x, b.y, -0.35f);
            shotObj[k].GetComponent<Renderer>().sharedMaterial = shotMat[shots[k].kind];
            shotObj[k].position = (wa + wb) / 2f;
            shotObj[k].rotation = Quaternion.FromToRotation(Vector3.right, wb - wa);
            shotObj[k].localScale = new Vector3((wb - wa).magnitude, 0.05f, 0.05f);
        }
    }

    // ?oiyotest=1 prints the state to the browser console for the automated play check: waves, coins, monsters, and
    // the screen point (px from the top-left) of the next sensible press: the partner of the chosen guard, the top
    // guard of a pair, or the summon plate.
    bool testLog; float testT;
    Vector2 Scr(Vector2 f) { var sp = cam.WorldToScreenPoint(field.W(f.x, f.y, -0.2f)); return new Vector2(sp.x, Screen.height - sp.y); }
    void TestTick(float dt)
    {
        if (!testLog || (testT -= dt) > 0f) return;
        testT = 0.05f;
        string next = "null";
        Vector2? at = null;
        if (selected >= 0 && Partner(selected) >= 0) at = PostXY(Partner(selected));
        else
        {
            int best = -1;
            for (int p = 0; p < Posts; p++) if (posts[p] != null && Partner(p) >= 0 && (best < 0 || posts[p].rank > posts[best].rank)) best = p;
            if (best >= 0) at = PostXY(best);
            else if (coins >= SummonCost && System.Array.IndexOf(posts, null) >= 0) at = SummonBox.center;
        }
        if (at.HasValue) { var p = Scr(at.Value); next = $"[{p.x:F1},{p.y:F1}]"; }
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"t\":{t:F2},\"wave\":{wave},\"waves\":{st.waves},\"coins\":{coins},\"monsters\":{monsters.Count},\"peak\":{peak},\"par\":{st.peakPar},\"next\":{next},\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.94f, 0.55f, 0f, 0.97f);
    static readonly Color Dark = new Color(0.1f, 0.11f, 0.12f, 0.9f);

    Vector2 Gui(Vector2 f, float z = -0.3f) => OiyoArcade.ToGui(cam.WorldToScreenPoint(field.W(f.x, f.y, z)));
    float GuiPerField => field.ScreenPerField() / OiyoArcade.ComputeScale();

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("{0} waves", SummonGuardStages.All[i].waves);

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(1f, 0.92f, 0.8f), U("Summon Guard"),
                U("Summon random guards, merge two alike into the next rank, and hold the camp until the boss falls. 25 monsters on the track and it's over."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        var a = Gui(new Vector2(SummonBox.x, SummonBox.y)); var b = Gui(new Vector2(SummonBox.xMax, SummonBox.yMax));
        OiyoArcade.Text(new Rect(a.x, a.y, b.x - a.x, b.y - a.y), F("Summon ●{0}", SummonCost), Mathf.Max(10, Mathf.RoundToInt(18 * GuiPerField)), Color.white, TextAnchor.MiddleCenter, true);
        var bar = new Rect(8f, 8f, w - 16f, 64f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 12f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>  " + F("Wave {0}/{1}", Mathf.Max(1, wave), st.waves) + "  " + F("{0} coins", coins), 15, new Color(1f, 0.92f, 0.8f));
        string mons = F("Monsters {0}/{1}", monsters.Count, Overrun);
        if (monsters.Count >= Overrun - 5) mons = "<color=#ff6b6b>" + mons + "</color>";
        bool boss = false;
        foreach (var mo in monsters) if (mo.boss) boss = true;
        OiyoArcade.Text(new Rect(20f, 36f, w - 90f, 24f), mons + (boss ? "  <color=#ff6b6b>" + U("Boss!") + "</color>" : ""), 14, Color.white);
        if (OiyoArcade.Button(new Rect(w - 60f, 14f, 44f, 44f), "<b>II</b>", OiyoScreens.Slate, 18))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap to start"), U("Tap Summon to call a guard!"), 140f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            string detail = won ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : "";
            string body = $"<size=14>{F("Most monsters on the track at once: {0}", peak)}</size>";
            int r = OiyoScreens.Result(w, h, Dark, Accent, won, ResultLive, won ? U("The camp held!") : U("The camp was overrun"), detail, body,
                won && stageIdx < StageCount - 1 ? U("Next stage") : null, won && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
