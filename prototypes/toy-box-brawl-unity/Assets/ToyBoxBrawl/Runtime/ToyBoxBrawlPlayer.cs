using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Toy Box Brawl 3D: the web Toy Box Brawl (src/components/games/ToyBoxBrawl.tsx, src/lib/games/toy-box-brawl.ts)
// rebuilt in Unity on the web's own 360 × 560 px field (OiyoField). Buy toys from the shelf with coins (five at most),
// order them, and press Fight: the battle then plays itself, front toy against front toy. Catapults lob 3 at the
// enemy's back toy and drummers give friends +1 attack at the start; a wind-up robot hands +2/+2 to the toy behind
// when it falls, a knight's shield blocks the first hit, a roly-poly stands back up once. The 30 shelves and enemy
// boxes are the web's own (ToyBoxBrawlStages.cs).
public class ToyBoxBrawlPlayer : MonoBehaviour
{
    const string Slug = "toy-box-brawl";
    const int StageCount = 30;
    const int MaxLine = 5;
    // soldier, teddy, catapult, robot, drum, knight, rocket, doll
    static readonly string[] Kinds = { "soldier", "teddy", "catapult", "robot", "drum", "knight", "rocket", "doll" };
    static readonly int[] Atk = { 3, 1, 1, 2, 1, 4, 6, 2 };
    static readonly int[] Hp = { 3, 7, 3, 4, 3, 2, 1, 2 };
    static readonly int[] Cost = { 2, 3, 3, 3, 2, 3, 3, 2 };
    const int Catapult = 2, Robot = 3, Drum = 4, Knight = 5, Doll = 7;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of toy-box-brawl.ts) ----------------
    struct Toy { public int kind, atk, hp; public bool shield, revived; }
    struct Frame { public int ev, side, index; public Toy[][] lines; } // ev 0 hit, 1 lob, 2 drum, 3 pass, 4 rise, 5 fall, 6 end

    ToyBoxBrawlStages.Level st;
    int stageIdx, starsWon, left;
    readonly List<int> line = new List<int>(); // shelf offer indices, front first
    bool won;

    static Toy Make(int kind, int atk, int hp) => new Toy { kind = kind, atk = atk, hp = hp, shield = kind == Knight };

    static List<Frame> Battle(List<Toy> mine, List<Toy> theirs, out bool win, out int keep)
    {
        var sides = new[] { new List<Toy>(mine), new List<Toy>(theirs) };
        var frames = new List<Frame>();
        void Log(int ev, int side, int index) => frames.Add(new Frame { ev = ev, side = side, index = index, lines = new[] { sides[0].ToArray(), sides[1].ToArray() } });
        void Damage(int s, int i, int n)
        {
            if (n <= 0) return;
            var f = sides[s][i];
            if (f.shield) f.shield = false; else f.hp -= n;
            sides[s][i] = f;
        }
        for (int s = 0; s < 2; s++)
            for (int i = 0; i < sides[s].Count; i++)
            {
                if (sides[s][i].kind != Drum) continue;
                for (int j = 0; j < sides[s].Count; j++) { var g = sides[s][j]; g.atk += 1; sides[s][j] = g; }
                Log(2, s, i);
            }
        for (int s = 0; s < 2; s++)
            for (int i = 0; i < sides[s].Count; i++)
            {
                if (sides[s][i].kind != Catapult || sides[1 - s].Count == 0) continue;
                Damage(1 - s, sides[1 - s].Count - 1, 3);
                Log(1, s, i);
            }
        void Sweep()
        {
            for (int s = 0; s < 2; s++)
                for (int i = 0; i < sides[s].Count; i++)
                {
                    var f = sides[s][i];
                    if (f.hp > 0) continue;
                    if (f.kind == Doll && !f.revived) { f.revived = true; f.hp = 1; sides[s][i] = f; Log(4, s, i); continue; }
                    Log(5, s, i);
                    if (f.kind == Robot && i + 1 < sides[s].Count) { var g = sides[s][i + 1]; g.atk += 2; g.hp += 2; sides[s][i + 1] = g; Log(3, s, i + 1); }
                    sides[s].RemoveAt(i);
                    i--;
                }
        }
        Sweep();
        int rounds = 0;
        while (sides[0].Count > 0 && sides[1].Count > 0 && rounds < 200)
        {
            rounds++;
            int da = sides[0][0].atk, db = sides[1][0].atk;
            Damage(1, 0, da);
            Damage(0, 0, db);
            Log(0, 0, 0);
            Log(0, 1, 0);
            Sweep();
        }
        win = sides[0].Count > 0 && sides[1].Count == 0;
        keep = sides[0].Count;
        Log(6, 0, -1);
        return frames;
    }

    int Spent() { int s = 0; foreach (int i in line) s += Cost[st.shop[i]]; return s; }

    int StarsFor()
    {
        if (!won) return 0;
        if (left >= st.best) return 3;
        if (left >= st.best - 1) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    static float LineX(int i) => 32f + i * 74f;
    static Rect ShelfBox(int i) => new Rect(8f + (i % 4) * 87f, 418f + (i / 4) * 66f, 82f, 60f);
    static readonly Rect FightBox = new Rect(110f, 206f, 140f, 46f);

    OiyoField field;
    Camera cam;
    Transform root, fightPlate, selMark;
    readonly List<Transform> shelfObj = new List<Transform>();
    readonly Transform[] mineObj = new Transform[MaxLine], theirObj = new Transform[MaxLine];
    readonly Transform[] slotObj = new Transform[MaxLine];
    Material[] toyMat;
    Material plateMat, plateDim, slotMat, floorMat, fightOn, fightOff, selMat;
    Bursts sparkle;
    Synth synth;
    bool showStages;
    int selected = -1;
    List<Frame> frames;
    int at; float frameT;
    string caption;

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(360f, 560f, new Color(0.17f, 0.13f, 0.25f));
        cam = field.Cam;
        OiyoField.Lights(new Color(0.62f, 0.6f, 0.7f), 0.7f, 40f, -25f);
        sparkle = new Bursts(transform, 0.5f);
        synth = new Synth(gameObject);
        toyMat = new Material[Kinds.Length];
        for (int k = 0; k < Kinds.Length; k++) toyMat[k] = OiyoField.Sprite("TB/" + Kinds[k]);
        plateMat = OiyoArcade.Lit(new Color(0.37f, 0.29f, 0.55f), 0.3f);
        plateDim = OiyoArcade.Lit(new Color(0.22f, 0.18f, 0.3f), 0.3f);
        slotMat = OiyoArcade.Transparent(OiyoArcade.Solid(Color.white), new Color(0.9f, 0.86f, 1f, 0.18f));
        floorMat = OiyoArcade.Lit(new Color(0.79f, 0.64f, 0.48f), 0.2f, OiyoArcade.Art("TB/wood", true));
        fightOn = OiyoArcade.Lit(new Color(0.88f, 0.19f, 0.19f), 0.4f);
        fightOff = OiyoArcade.Lit(new Color(0.29f, 0.31f, 0.34f), 0.3f);
        selMat = OiyoArcade.Transparent(OiyoArcade.Solid(Color.white), new Color(1f, 0.83f, 0.23f, 0.4f));
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int i, bool ready = true, bool keep = false)
    {
        stageIdx = Mathf.Clamp(i, 0, StageCount - 1);
        StopAllCoroutines();
        st = ToyBoxBrawlStages.All[stageIdx];
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Box").transform;
        if (!keep) line.Clear();
        won = false; left = 0; starsWon = 0;
        selected = -1;
        frames = null; at = 0; frameT = 0f; caption = null;
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

    Transform Sprite(int kind, float x, float y, float size, bool flip)
    {
        var q = OiyoField.Quad("Toy", toyMat[kind], root, size, size);
        q.position = field.W(x, y, -0.4f);
        if (flip) q.localScale = new Vector3(-q.localScale.x, q.localScale.y, 1f);
        return q;
    }

    void BuildScene()
    {
        Box(floorMat, 180f, 109f, 360f, 6f, 0f, 0.3f);
        Box(floorMat, 180f, 355f, 360f, 6f, 0f, 0.3f);
        Box(plateDim, 180f, 472f, 360f, 176f, 0.2f, 0.2f);
        shelfObj.Clear();
        for (int k = 0; k < st.shop.Length; k++)
        {
            var b = ShelfBox(k);
            shelfObj.Add(Box(plateMat, b.center.x, b.center.y, b.width, b.height, -0.05f, 0.2f));
            Sprite(st.shop[k], b.x + 22f, b.y + 26f, 32f, false);
        }
        for (int k = 0; k < MaxLine; k++)
        {
            slotObj[k] = Box(slotMat, LineX(k), 296f, 52f, 52f, 0.05f, 0.02f);
            mineObj[k] = Sprite(0, LineX(k), 294f, 40f, false);
            theirObj[k] = Sprite(0, LineX(k), 144f, 40f, true);
        }
        fightPlate = Box(fightOff, FightBox.center.x, FightBox.center.y, FightBox.width, FightBox.height, -0.1f, 0.25f);
        selMark = Box(selMat, 0f, 0f, 60f, 60f, -0.02f, 0.02f);
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("toy-box-brawl", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        StepFight(dt);
        Animate(dt);
    }

    void Buy(int i)
    {
        if (frames != null || i < 0 || i >= st.shop.Length || line.Contains(i) || line.Count >= MaxLine || Spent() + Cost[st.shop[i]] > st.coins)
        {
            synth.Tone(180f, 0.08f, Wave.Square, 0.08f, 0f, 14f);
            return;
        }
        line.Add(i);
        synth.Tone(660f, 0.06f, Wave.Triangle, 0.12f, 0f, 14f);
    }

    void PickSlot(int j)
    {
        if (frames != null || j < 0 || j >= line.Count) return;
        if (selected == j) { line.RemoveAt(j); selected = -1; synth.Tone(392f, 0.06f, Wave.Triangle, 0.1f, 0f, 14f); }
        else if (selected >= 0 && selected < line.Count) { int t = line[selected]; line[selected] = line[j]; line[j] = t; selected = -1; synth.Tone(784f, 0.06f, Wave.Triangle, 0.1f, 0f, 14f); }
        else { selected = j; synth.Tone(523f, 0.05f, Wave.Triangle, 0.08f, 0f, 14f); }
    }

    void Fight()
    {
        if (frames != null || line.Count == 0) return;
        var mine = new List<Toy>();
        foreach (int i in line) mine.Add(Make(st.shop[i], Atk[st.shop[i]], Hp[st.shop[i]]));
        var theirs = new List<Toy>();
        for (int k = 0; k < st.enemy.Length / 3; k++) theirs.Add(Make(st.enemy[k * 3], st.enemy[k * 3 + 1], st.enemy[k * 3 + 2]));
        frames = Battle(mine, theirs, out won, out left);
        at = 0; frameT = 0f; selected = -1;
        synth.Tone(220f, 0.25f, Wave.Saw, 0.12f, 440f, 6f);
    }

    void StepFight(float dt)
    {
        if (frames == null || state != GameState.Playing) return;
        frameT += dt;
        while (frameT > 0.45f && at < frames.Count - 1)
        {
            frameT -= 0.45f;
            at++;
            var fr = frames[at];
            float x = fr.index >= 0 ? LineX(fr.index) : 180f, y = fr.side == 0 ? 294f : 144f;
            caption = fr.ev == 1 ? U("The catapult hits their back toy!") : fr.ev == 2 ? U("Drums: +1 attack!") : fr.ev == 3 ? U("The robot hands on +2/+2") : fr.ev == 4 ? U("The roly-poly stands back up!") : fr.ev == 5 ? U("Down!") : null;
            if (fr.ev == 0) synth.Tone(fr.side == 0 ? 330f : 262f, 0.05f, Wave.Noise, 0.08f, 0f, 20f);
            if (fr.ev == 5) { sparkle.Emit(field.W(x, y, -1f), new Color(1f, 0.42f, 0.42f), 10, 3f, 0.08f, 0.5f); synth.Tone(160f, 0.15f, Wave.Square, 0.1f, 90f, 8f); }
            if (fr.ev >= 1 && fr.ev <= 4) synth.Tone(880f, 0.1f, Wave.Triangle, 0.12f, 1175f, 8f);
        }
        if (at >= frames.Count - 1 && frameT > 0.6f) End();
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
                        if (frames != null) continue;
                        if (FightBox.Contains(f)) { Fight(); continue; }
                        bool hit = false;
                        for (int k = 0; k < st.shop.Length; k++) if (ShelfBox(k).Contains(f)) { Buy(k); hit = true; break; }
                        if (!hit && f.y > 262f && f.y < 345f) PickSlot(Mathf.RoundToInt((f.x - 32f) / 74f));
                    }
                    if (state == GameState.Ready) { if (confirm || Input.GetKeyDown(KeyCode.Space)) state = GameState.Playing; return; }
                    if (frames != null) return;
                    for (int k = 0; k < 8; k++) if (Input.GetKeyDown(KeyCode.Alpha1 + k)) Buy(k);
                    if (Input.GetKeyDown(KeyCode.Backspace) && selected >= 0) PickSlot(selected);
                    int step = Input.GetKeyDown(KeyCode.RightArrow) ? 1 : Input.GetKeyDown(KeyCode.LeftArrow) ? -1 : 0;
                    if (step != 0 && line.Count > 0)
                    {
                        if (selected < 0) selected = 0;
                        else
                        {
                            int to = selected + step;
                            if (to >= 0 && to < line.Count) { int t = line[selected]; line[selected] = line[to]; line[to] = t; selected = to; }
                        }
                    }
                    if ((Input.GetKeyDown(KeyCode.UpArrow) || Input.GetKeyDown(KeyCode.DownArrow)) && line.Count > 0)
                        selected = (Mathf.Max(0, selected) + (Input.GetKeyDown(KeyCode.DownArrow) ? 1 : -1) + line.Count) % line.Count;
                    if (confirm) Fight();
                    return;
                }
            case GameState.Paused:
                if (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P)) state = GameState.Playing;
                return;
            case GameState.Victory:
            case GameState.GameOver:
                if (confirm && ResultLive) { if (won) LoadStage(Mathf.Min(stageIdx + 1, StageCount - 1)); else LoadStage(stageIdx, true, true); }
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
            OiyoArcade.Record(Slug, stageIdx, starsWon, left * 20 + (st.coins - Spent()), StageCount);
            sparkle.Emit(field.W(180f, 230f, -1f), new Color(1f, 0.85f, 0.25f), 40, 5f, 0.1f, 1f);
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

    Toy[][] Shown()
    {
        if (frames != null) return frames[at].lines;
        var mine = new Toy[line.Count];
        for (int k = 0; k < line.Count; k++) mine[k] = Make(st.shop[line[k]], Atk[st.shop[line[k]]], Hp[st.shop[line[k]]]);
        var theirs = new Toy[st.enemy.Length / 3];
        for (int k = 0; k < theirs.Length; k++) theirs[k] = Make(st.enemy[k * 3], st.enemy[k * 3 + 1], st.enemy[k * 3 + 2]);
        return new[] { mine, theirs };
    }

    void Animate(float dt)
    {
        if (root == null) return;
        field.Fit(80f, 10f, 0f);
        var shown = Shown();
        for (int k = 0; k < MaxLine; k++)
        {
            SetToy(mineObj[k], shown[0], k, 294f, false);
            SetToy(theirObj[k], shown[1], k, 144f, true);
            slotObj[k].gameObject.SetActive(frames == null && k >= line.Count);
        }
        for (int k = 0; k < shelfObj.Count; k++) shelfObj[k].GetComponent<Renderer>().sharedMaterial = line.Contains(k) ? plateDim : plateMat;
        fightPlate.gameObject.SetActive(frames == null);
        fightPlate.GetComponent<Renderer>().sharedMaterial = line.Count > 0 ? fightOn : fightOff;
        bool hot = frames != null && frames[at].index >= 0;
        selMark.gameObject.SetActive((frames == null && selected >= 0 && selected < line.Count) || hot);
        if (hot) selMark.position = field.W(LineX(frames[at].index), frames[at].side == 0 ? 294f : 144f, -0.02f);
        else if (selected >= 0) selMark.position = field.W(LineX(selected), 294f, -0.02f);
    }

    void SetToy(Transform q, Toy[] toys, int k, float y, bool flip)
    {
        bool on = k < toys.Length;
        q.gameObject.SetActive(on);
        if (!on) return;
        q.GetComponent<Renderer>().sharedMaterial = toyMat[toys[k].kind];
        bool down = toys[k].hp <= 0;
        q.position = field.W(LineX(k), y + (down ? 10f : 0f), -0.4f);
        q.localScale = new Vector3(OiyoField.U(40f) * (flip ? -1f : 1f), OiyoField.U(down ? 20f : 40f), 1f);
    }

    // ?oiyotest=1 prints the state to the browser console for the automated play check: the line so far, and the
    // screen point (px from the top-left) of the next press on the way to the stage's best line.
    bool testLog; float testT;
    Vector2 Scr(Vector2 f) { var sp = cam.WorldToScreenPoint(field.W(f.x, f.y, -0.2f)); return new Vector2(sp.x, Screen.height - sp.y); }
    void TestTick(float dt)
    {
        if (!testLog || (testT -= dt) > 0f) return;
        testT = 0.05f;
        string next = "null";
        if (frames == null)
        {
            Vector2 p = line.Count < st.answer.Length ? Scr(ShelfBox(st.answer[line.Count]).center) : Scr(FightBox.center);
            next = $"[{p.x:F1},{p.y:F1}]";
        }
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"line\":{line.Count},\"fight\":{(frames != null ? 1 : 0)},\"left\":{left},\"best\":{st.best},\"next\":{next},\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.88f, 0.19f, 0.19f, 0.97f);
    static readonly Color Dark = new Color(0.1f, 0.11f, 0.12f, 0.9f);

    Vector2 Gui(Vector2 f, float z = -0.6f) => OiyoArcade.ToGui(cam.WorldToScreenPoint(field.W(f.x, f.y, z)));
    float GuiPerField => field.ScreenPerField() / OiyoArcade.ComputeScale();
    void Label(Rect r, string s, int size, Color c, TextAnchor a = TextAnchor.MiddleCenter)
    {
        var p = Gui(new Vector2(r.x, r.y)); var q = Gui(new Vector2(r.xMax, r.yMax));
        OiyoArcade.Text(new Rect(p.x, p.y, q.x - p.x, q.y - p.y), s, Mathf.Max(9, Mathf.RoundToInt(size * GuiPerField)), c, a, true);
    }

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("{0} coins", ToyBoxBrawlStages.All[i].coins);

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(0.9f, 0.86f, 1f), U("Toy Box Brawl"),
                U("Buy toys with coins, line up to five, and press Fight: the battle plays itself, front toy against front toy."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        // stats under each toy, prices and names on the shelf, the Fight plate's label
        var shown = Shown();
        for (int s = 0; s < 2; s++)
            for (int k = 0; k < shown[s].Length; k++)
            {
                float y = s == 0 ? 294f : 144f;
                Label(new Rect(LineX(k) - 34f, y + 24f, 68f, 18f), $"<color=#ffd43b>{shown[s][k].atk}</color> / <color=#ff8787>{Mathf.Max(0, shown[s][k].hp)}</color>", 12, Color.white);
            }
        Label(new Rect(10f, 90f, 200f, 16f), U("Enemy box"), 12, new Color(0.9f, 0.86f, 1f), TextAnchor.MiddleLeft);
        Label(new Rect(10f, 364f, 200f, 16f), U("Your line (front first)"), 12, new Color(0.9f, 0.86f, 1f), TextAnchor.MiddleLeft);
        Label(new Rect(200f, 364f, 150f, 16f), F("{0} coins", st.coins - Spent()), 12, new Color(1f, 0.83f, 0.23f), TextAnchor.MiddleRight);
        for (int k = 0; k < st.shop.Length; k++)
        {
            var b = ShelfBox(k);
            int kind = st.shop[k];
            Label(new Rect(b.x + 44f, b.y + 8f, 36f, 18f), $"●{Cost[kind]}", 13, new Color(1f, 0.83f, 0.23f), TextAnchor.MiddleLeft);
            Label(new Rect(b.x + 44f, b.y + 26f, 36f, 16f), $"{Atk[kind]}/{Hp[kind]}", 11, new Color(0.9f, 0.86f, 1f), TextAnchor.MiddleLeft);
            Label(new Rect(b.x + 2f, b.y + 44f, 78f, 14f), U(ToyName(kind)), 10, new Color(0.9f, 0.86f, 1f), TextAnchor.MiddleLeft);
        }
        if (frames == null) Label(FightBox, U("Fight"), 18, Color.white);
        if (caption != null && frames != null && at < frames.Count - 1) Label(new Rect(0f, 186f, 360f, 20f), caption, 14, new Color(1f, 0.83f, 0.23f));

        var bar = new Rect(8f, 8f, w - 16f, 64f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 12f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>  " + F("{0} coins", st.coins - Spent()), 15, new Color(0.9f, 0.86f, 1f));
        OiyoArcade.Text(new Rect(20f, 36f, w - 90f, 24f), F("Toys {0}/{1}", line.Count, MaxLine) + $"   ★★★ = {st.best}", 14, Color.white);
        if (OiyoArcade.Button(new Rect(w - 60f, 14f, 44f, 44f), "<b>II</b>", OiyoScreens.Slate, 18))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap to start"), U("Buy toys from the shelf and line them up!"), 140f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            string detail = won ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : "";
            string body = $"<size=14>{F("Toys standing {0} / best {1}", left, st.best)}</size>";
            int r = OiyoScreens.Result(w, h, Dark, Accent, won, ResultLive, won ? U("You win!") : U("You lost"), detail, body,
                won && stageIdx < StageCount - 1 ? U("Next stage") : null, won && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Rearrange"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx, true, true); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }

    static string ToyName(int k) => k switch
    {
        0 => "Soldier", 1 => "Teddy", 2 => "Catapult", 3 => "Wind-up robot", 4 => "Drummer", 5 => "Knight", 6 => "Rocket", _ => "Roly-poly",
    };
}
