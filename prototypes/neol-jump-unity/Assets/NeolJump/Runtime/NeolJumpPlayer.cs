using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Neol Jump 3D: the web Neol Jump (src/components/games/NeolJump.tsx, src/lib/games/neol-jump.ts)
// rebuilt in Unity. The rules are the web's, in its own px: you (x 92) and your friend (x 268) stand on
// the two ends of the board; whoever lands launches the other with 0.9 of the landing speed (330..1400
// px/s, gravity 1200). A tap within 60 ms of a landing adds 150 px/s, within 140 ms adds 70, a late or
// missing tap adds nothing. In the air you drag sideways (steer at most 240 px/s, the stage's wind
// pushing) through the lucky pouches, magpies knock you aside, and landing off your end of the board is
// a fall. Collect every pouch within the jumps. The 30 stages are the web's own (NeolJumpStages.cs).
// Keyboard: Space taps, left/right arrows steer.
public class NeolJumpPlayer : MonoBehaviour
{
    const string Slug = "neol-jump";
    const int StageCount = 30;
    const float FW = 360f, FH = 600f, BoardY = 500f, LeftX = 92f, RightX = 268f;
    const float Gravity = 1200f, Rest = 0.9f, MinV = 330f, MaxV = 1400f, Perfect = 0.06f, Good = 0.14f;
    const float BonusPerfect = 150f, BonusGood = 70f, SteerSpeed = 240f, CharmR = 20f, PlayerR = 12f, WallH = 120f;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of neol-jump.ts) ----------------
    const int None = 0, Player = 1, Friend = 2;
    enum Q { Perfect, Good, Miss }
    class Charm { public float x, h; public bool got; public Transform t; }
    NeolJumpStages.Level level;
    int stageIdx;
    readonly List<Charm> charms = new List<Charm>();
    float time, h, vy, px, pvx, lastTap, fallen, apex;
    int air;
    bool steering; float steerX;
    bool pending; int pLaunch; float pAt, pBase;
    int jumps, falls, streak, starsWon;
    bool over, won;

    void NewRun()
    {
        charms.Clear();
        for (int i = 0; i + 1 < level.charms.Length; i += 2) charms.Add(new Charm { x = level.charms[i], h = level.charms[i + 1] });
        time = 0f; air = None; h = 0f; vy = 0f; px = LeftX; pvx = 0f; steering = false;
        pending = true; pLaunch = Player; pAt = float.PositiveInfinity; pBase = MinV;
        lastTap = float.NegativeInfinity; jumps = 0; falls = 0; fallen = 0f; apex = 0f; streak = 0; over = false; won = false;
    }

    static Q Quality(float dt) { float a = Mathf.Abs(dt); return a <= Perfect ? Q.Perfect : a <= Good ? Q.Good : Q.Miss; }
    static float ApexOf(float v) => v * v / (2f * Gravity);
    float BirdX(int i, float t)
    {
        float span = FW + 80f;
        float x0 = level.birds[i * 3 + 1], speed = level.birds[i * 3 + 2];
        return (((x0 + speed * t + 40f) % span) + span) % span - 40f;
    }
    int BirdCount => level.birds.Length / 3;

    void Launch(int who, float baseV, Q q)
    {
        float bonus = q == Q.Perfect ? BonusPerfect : q == Q.Good ? BonusGood : 0f;
        streak = q == Q.Perfect ? streak + 1 : 0;
        air = who;
        vy = Mathf.Min(MaxV, Mathf.Max(MinV, baseV + bonus));
        h = 0f;
        pending = false;
        if (who == Player) { jumps++; pvx = 0f; }
        OnLaunch(who, q);
    }

    void Tap()
    {
        if (over || fallen > 0f) return;
        if (pending)
        {
            if (float.IsPositiveInfinity(pAt)) { Launch(pLaunch, pBase, Q.Good); return; }
            Launch(pLaunch, pBase, Quality(time - pAt));
            return;
        }
        lastTap = time;
    }

    void SetSteer(bool on, float x) { steering = on; steerX = Mathf.Clamp(x, 16f, FW - 16f); }

    void Step(float dt)
    {
        if (over) return;
        time += dt;
        if (fallen > 0f)
        {
            fallen -= dt;
            if (fallen <= 0f) { fallen = 0f; px = LeftX; pending = true; pLaunch = Player; pAt = float.PositiveInfinity; pBase = MinV; }
            return;
        }
        if (pending && !float.IsPositiveInfinity(pAt) && time - pAt > Good) Launch(pLaunch, pBase, Q.Miss);
        if (air == None) return;
        float prevH = h;
        vy -= Gravity * dt;
        h += vy * dt;
        if (air == Player)
        {
            apex = Mathf.Max(apex, h);
            if (steering)
            {
                float want = Mathf.Clamp((steerX - px) * 8f, -SteerSpeed, SteerSpeed);
                pvx += (want - pvx) * Mathf.Min(1f, dt * 10f);
            }
            else pvx *= Mathf.Max(0f, 1f - dt * 2f);
            pvx += level.wind * dt;
            px = Mathf.Clamp(px + pvx * dt, 10f, FW - 10f);
            foreach (var c in charms)
                if (!c.got && Mathf.Sqrt((c.x - px) * (c.x - px) + (c.h - h) * (c.h - h)) < CharmR + PlayerR) { c.got = true; OnCharm(c); }
            for (int i = 0; i < BirdCount; i++)
            {
                float bx = BirdX(i, time), bh = level.birds[i * 3], sp = level.birds[i * 3 + 2];
                if (Mathf.Abs(bx - px) < 18f && Mathf.Abs(bh - h) < 16f && Sign(prevH - bh) != Sign(h - bh))
                {
                    pvx += Sign(sp) * 260f;
                    vy = Mathf.Min(vy, 0f);
                    OnBird(bx, bh);
                }
            }
        }
        if (h <= 0f && vy < 0f)
        {
            float vLand = -vy;
            int who = air;
            air = None; h = 0f; vy = 0f;
            if (who == Player && Mathf.Abs(px - LeftX) > level.zone)
            {
                falls++; fallen = 1.2f; streak = 0;
                OnFall();
            }
            else
            {
                if (who == Player) px = LeftX + (px - LeftX) * 0.5f;
                OnLand(who);
                int next = who == Player ? Friend : Player;
                pending = true; pLaunch = next; pAt = time; pBase = vLand * Rest;
                if (time - lastTap <= Good)
                {
                    var q = Quality(time - lastTap);
                    lastTap = float.NegativeInfinity;
                    Launch(next, vLand * Rest, q);
                }
            }
        }
        bool all = true;
        foreach (var c in charms) if (!c.got) { all = false; break; }
        if (all) { over = true; won = true; }
        else if (falls >= level.falls || (jumps >= level.jumps && air != Player && fallen <= 0f)) { over = true; won = false; }
    }

    static int Sign(float v) => v > 0f ? 1 : v < 0f ? -1 : 0;

    int StarsFor()
    {
        int left = level.jumps - jumps;
        if (falls == 0 && left >= level.jumps * 0.3f) return 3;
        return falls <= 1 ? 2 : 1;
    }

    float TimeToLand()
    {
        if (air == None) return 0f;
        return (vy + Mathf.Sqrt(vy * vy + 2f * Gravity * Mathf.Max(0f, h))) / Gravity;
    }

    // ---------------- Scene ----------------
    OiyoField field;
    Transform root, board, girl, friend, ring, zone;
    readonly List<Transform> birds = new List<Transform>();
    Renderer ringR;
    Material girlMat, friendMat, pouchMat, magAMat, magBMat, roofMat, wallMat, woodMat, snowMat, strawMat, zoneMat;
    Bursts bursts;
    Synth synth;
    bool showStages;
    float camH;

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(FW, FH, new Color(0.62f, 0.78f, 0.95f));
        OiyoField.Lights(new Color(0.62f, 0.64f, 0.7f), 0.8f, 35f, -30f);
        bursts = new Bursts(transform, 0.9f);
        synth = new Synth(gameObject);
        girlMat = OiyoField.Sprite("NJ/girl"); friendMat = OiyoField.Sprite("NJ/friend"); pouchMat = OiyoField.Sprite("NJ/pouch");
        magAMat = OiyoField.Sprite("NJ/magpie_a"); magBMat = OiyoField.Sprite("NJ/magpie_b"); roofMat = OiyoField.Sprite("NJ/roof");
        wallMat = OiyoArcade.Lit(Color.white, 0.1f, OiyoArcade.Art("NJ/wall", true));
        woodMat = OiyoArcade.Lit(Color.white, 0.3f, OiyoArcade.Art("NJ/wood", true));
        snowMat = OiyoArcade.Lit(Color.white, 0.2f, OiyoArcade.Art("NJ/snow", true));
        strawMat = OiyoArcade.Lit(Color.white, 0.1f, OiyoArcade.Art("NJ/straw", true));
        zoneMat = OiyoArcade.Glow(new Color(0.18f, 0.62f, 0.27f));
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int idx, bool ready = true)
    {
        stageIdx = Mathf.Clamp(idx, 0, StageCount - 1);
        StopAllCoroutines();
        level = NeolJumpStages.All[stageIdx];
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Yard").transform;
        birds.Clear();
        NewRun();
        drag = false; camH = 0f;
        showStages = false;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Fit();
        Animate(0f);
    }

    // Field y for a height above the board.
    static float Y(float height) => BoardY - height;

    void BuildScene()
    {
        // the village wall behind the board, roofs peeking over it
        var wall = OiyoArcade.Prim(PrimitiveType.Cube, "Wall", wallMat, root);
        wall.transform.position = field.W(FW * 0.5f, Y(WallH * 0.5f - 20f), 2.2f);
        wall.transform.localScale = new Vector3(OiyoField.U(FW * 3f), OiyoField.U(WallH + 40f), 0.8f);
        wallMat.mainTextureScale = new Vector3(9f, 1.3f);
        var cap = OiyoArcade.Prim(PrimitiveType.Cube, "Cap", OiyoArcade.Lit(new Color(0.29f, 0.31f, 0.34f), 0.3f), root);
        cap.transform.position = field.W(FW * 0.5f, Y(WallH) - 4f, 2.2f);
        cap.transform.localScale = new Vector3(OiyoField.U(FW * 3f), OiyoField.U(12f), 1.1f);
        for (int k = -3; k < 8; k++)
        {
            var roof = OiyoField.Quad("Roof", roofMat, root, 96f, 40f);
            roof.position = field.W(45f + k * 92f, Y(WallH) - 26f + (k & 1) * 8f, 3.2f + (k & 1) * 0.3f);
        }
        // a snowy yard in front
        var yard = OiyoArcade.Prim(PrimitiveType.Cube, "Yard", snowMat, root);
        yard.transform.position = field.W(FW * 0.5f, Y(-80f), 0f);
        yard.transform.localScale = new Vector3(OiyoField.U(FW * 3f), OiyoField.U(140f), 4f);
        snowMat.mainTextureScale = new Vector2(10f, 1f);
        // the straw bundle and the board on it
        var bundle = OiyoArcade.Prim(PrimitiveType.Cylinder, "Bundle", strawMat, root);
        bundle.transform.rotation = Quaternion.Euler(90f, 0f, 0f);
        bundle.transform.position = field.W(180f, Y(-12f), 0f);
        bundle.transform.localScale = new Vector3(OiyoField.U(30f), 0.5f, OiyoField.U(30f));
        board = new GameObject("Board").transform; board.SetParent(root, false);
        board.position = field.W(180f, Y(2f), 0f);
        var plank = OiyoArcade.Prim(PrimitiveType.Cube, "Plank", woodMat, board);
        plank.transform.localScale = new Vector3(OiyoField.U(RightX - LeftX + 64f), OiyoField.U(7f), 0.7f);
        woodMat.mainTextureScale = new Vector2(4f, 1f);
        zone = OiyoArcade.Prim(PrimitiveType.Cube, "Zone", zoneMat, root).transform;
        zone.position = field.W(LeftX, Y(-1f), -0.37f);
        zone.localScale = new Vector3(OiyoField.U(level.zone * 2f), OiyoField.U(3f), 0.02f);
        ring = OiyoArcade.GlowQuad("Ring", new Color(1f, 0.55f, 0f, 0.7f), 1f, root).transform;
        ringR = ring.GetComponent<Renderer>();
        foreach (var c in charms) c.t = OiyoField.Quad("Pouch", pouchMat, root, 34f, 34f);
        for (int i = 0; i < BirdCount; i++) birds.Add(OiyoField.Quad("Magpie", magAMat, root, 40f, 26f));
        girl = OiyoField.Quad("Girl", girlMat, root, 40f, 56f);
        friend = OiyoField.Quad("Friend", friendMat, root, 40f, 56f);
        // height marks along the left edge
        for (int hh = 100; hh < 1000; hh += 100)
        {
            var m = OiyoArcade.Prim(PrimitiveType.Quad, "Mark", OiyoArcade.Glow(new Color(0.2f, 0.25f, 0.35f)), root);
            m.transform.position = field.W(6f, Y(hh), -0.1f);
            m.transform.localScale = new Vector3(OiyoField.U(10f), OiyoField.U(2f), 1f);
        }
    }

    void Fit()
    {
        bool portrait = field.Cam.aspect < 1f;
        // the web's camera: follows the player up once higher than 230 px
        field.Fit(portrait ? 120f : 96f, portrait ? 40f : 8f, 6f, Y(400f + camH), Y(-50f + camH));
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("neol-jump", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        if (state == GameState.Playing)
        {
            Step(dt);
            if (over) End();
        }
        float ph = air == Player ? h : 0f;
        float want = Mathf.Max(0f, ph - 230f);
        camH += (want - camH) * Mathf.Min(1f, dt * 6f);
        Fit();
        msgT = Mathf.Max(0f, msgT - dt);
        Animate(dt);
    }

    string msg = ""; float msgT; Color msgC = Color.white;
    void Toast(string s, Color c) { msg = s; msgT = 0.8f; msgC = c; }

    void OnLaunch(int who, Q q)
    {
        float x = who == Player ? px : RightX;
        if (q == Q.Perfect) { Toast(U("Perfect!") + (streak >= 2 ? $"  x{streak}" : ""), new Color(1f, 0.6f, 0.1f)); synth.Tone(880f + Mathf.Min(streak, 6) * 80f, 0.14f, Wave.Triangle, 0.2f, 1320f, 8f); bursts.Emit(field.W(x, Y(0f), -0.4f), new Color(1f, 0.85f, 0.3f), 14, 3f, 0.24f, 0.5f); }
        else if (q == Q.Good) { Toast(U("Good"), new Color(0.5f, 0.9f, 0.55f)); synth.Tone(660f, 0.12f, Wave.Triangle, 0.16f, 880f, 9f); }
        else { Toast(U("Late"), new Color(0.75f, 0.8f, 0.85f)); synth.Tone(330f, 0.12f, Wave.Sine, 0.12f, 300f, 10f); }
        synth.Tone(120f, 0.12f, Wave.Noise, 0.08f, 0f, 16f);
    }
    void OnLand(int who) => synth.Tone(180f, 0.08f, Wave.Square, 0.06f, 120f, 18f);
    void OnFall()
    {
        Toast(U("Oops! You fell"), new Color(1f, 0.45f, 0.4f));
        bursts.Emit(field.W(px, Y(0f), -0.4f), Color.white, 24, 3.5f, 0.3f, 0.6f);
        synth.Tone(200f, 0.4f, Wave.Triangle, 0.2f, 90f, 5f);
    }
    void OnCharm(Charm c)
    {
        bursts.Emit(field.W(c.x, Y(c.h), -0.4f), new Color(1f, 0.84f, 0.23f), 18, 3.6f, 0.26f, 0.55f);
        int got = 0; foreach (var k in charms) if (k.got) got++;
        synth.Tone(1047f + got * 40f, 0.16f, Wave.Triangle, 0.2f, 1568f, 7f);
    }
    void OnBird(float x, float hh)
    {
        Toast(U("A magpie!"), new Color(0.65f, 0.8f, 1f));
        bursts.Emit(field.W(x, Y(hh), -0.4f), new Color(0.15f, 0.17f, 0.3f), 10, 3f, 0.2f, 0.5f);
        synth.Tone(1200f, 0.08f, Wave.Square, 0.08f, 900f, 14f);
    }

    bool drag; int dragId; float dragX0, dragP0;
    void ReadInput()
    {
        bool confirm = Input.GetKeyDown(KeyCode.Return);
        switch (state)
        {
            case GameState.Ready:
            case GameState.Playing:
                {
                    if (state == GameState.Playing && (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P))) { state = GameState.Paused; drag = false; SetSteer(false, 0f); return; }
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (!field.ToField(b.pos, out var p)) continue;
                        if (state == GameState.Ready) state = GameState.Playing;
                        Tap();
                        drag = true; dragId = b.id; dragX0 = p.x; dragP0 = air == Player ? px : LeftX;
                    }
                    if (drag)
                    {
                        foreach (var hd in OiyoArcade.Held())
                            if (hd.id == dragId && air == Player && field.ToField(hd.pos, out var p)) SetSteer(true, dragP0 + (p.x - dragX0) * 1.3f);
                        foreach (var e in OiyoArcade.Ended()) if (e.id == dragId) { drag = false; SetSteer(false, 0f); }
                    }
                    if (Input.GetKeyDown(KeyCode.Space) || Input.GetKeyDown(KeyCode.UpArrow) || Input.GetKeyDown(KeyCode.W))
                    {
                        if (state == GameState.Ready) state = GameState.Playing;
                        Tap();
                    }
                    if (!drag)
                    {
                        int dir = (Input.GetKey(KeyCode.RightArrow) || Input.GetKey(KeyCode.D) ? 1 : 0) - (Input.GetKey(KeyCode.LeftArrow) || Input.GetKey(KeyCode.A) ? 1 : 0);
                        if (dir != 0 && air == Player) SetSteer(true, px + dir * 80f);
                        else if (Input.GetKeyUp(KeyCode.LeftArrow) || Input.GetKeyUp(KeyCode.RightArrow) || Input.GetKeyUp(KeyCode.A) || Input.GetKeyUp(KeyCode.D)) SetSteer(false, 0f);
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
        drag = false; SetSteer(false, 0f);
        if (won)
        {
            starsWon = StarsFor();
            state = GameState.Victory;
            OiyoArcade.Record(Slug, stageIdx, starsWon, starsWon, StageCount);
            StartCoroutine(Arp(new[] { 523f, 659f, 784f, 1047f, 1319f }, 0.09f));
        }
        else
        {
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
        float t = Time.time;
        // the board tips toward whoever is down
        int tilt = air == Friend ? 1 : air == Player ? -1 : 0;
        float ang = Mathf.LerpAngle(board.localEulerAngles.z, tilt * 7f, dt > 0f ? Mathf.Min(1f, dt * 14f) : 1f);
        board.localRotation = Quaternion.Euler(0f, 0f, ang);
        float endDrop(float x) => (x - 180f) * Mathf.Tan(ang * Mathf.Deg2Rad);
        // jumpers: crouched on the board, stretched in the air
        if (fallen > 0f)
        {
            girl.rotation = Quaternion.Euler(0f, 0f, 90f);
            girl.position = field.W(px, Y(-14f), -0.3f);
            girl.localScale = new Vector3(OiyoField.U(40f), OiyoField.U(56f), 1f);
        }
        else
        {
            bool up = air == Player;
            float gx = up ? px : LeftX;
            float gh = up ? h : endDrop(LeftX) + 4f;
            girl.rotation = Quaternion.Euler(0f, 0f, up ? Mathf.Clamp(-pvx * 0.05f, -14f, 14f) : 0f);
            float sq = up ? 1f + Mathf.Clamp(vy / 3000f, -0.08f, 0.12f) : 0.9f;
            girl.localScale = new Vector3(OiyoField.U(40f) / Mathf.Sqrt(sq), OiyoField.U(56f) * sq, 1f);
            girl.position = field.W(gx, Y(gh + 28f * sq), -0.3f);
        }
        {
            bool up = air == Friend;
            float fh = up ? h : -endDrop(RightX) + 4f;
            float sq = up ? 1f : 0.9f;
            friend.localScale = new Vector3(OiyoField.U(40f) / Mathf.Sqrt(sq), OiyoField.U(56f) * sq, 1f);
            friend.position = field.W(RightX, Y(fh + 28f * sq), -0.3f);
        }
        foreach (var c in charms)
        {
            c.t.gameObject.SetActive(!c.got);
            c.t.position = field.W(c.x, Y(c.h) + Mathf.Sin(t * 3.3f + c.h) * 3f, -0.3f);
            c.t.rotation = Quaternion.Euler(0f, Mathf.Sin(t * 2f + c.x) * 25f, 0f);
        }
        for (int i = 0; i < birds.Count; i++)
        {
            float bx = BirdX(i, time), sp = level.birds[i * 3 + 2];
            birds[i].position = field.W(bx, Y(level.birds[i * 3]), -0.35f);
            birds[i].GetComponent<Renderer>().sharedMaterial = Mathf.FloorToInt(t / 0.16f) % 2 == 0 ? magAMat : magBMat;
            birds[i].localScale = new Vector3(OiyoField.U(40f) * (sp < 0f ? -1f : 1f), OiyoField.U(26f), 1f);
        }
        // landing ring: shrinks onto the end about to be landed on
        float ttl = TimeToLand();
        bool showRing = air != None && ttl < 0.8f && state == GameState.Playing;
        ring.gameObject.SetActive(showRing);
        if (showRing)
        {
            float rx = air == Player ? LeftX : RightX;
            ring.position = field.W(rx, Y(0f), -0.4f);
            ring.localScale = Vector3.one * OiyoField.U((10f + ttl * 70f) * 2f);
            ringR.material.color = ttl < 0.06f ? new Color(1f, 0.55f, 0f, 0.95f) : new Color(1f, 0.55f, 0f, 0.5f);
        }
        zone.position = field.W(LeftX, Y(endDrop(LeftX) - 6f), -0.37f);
    }

    // ?oiyotest=1 prints the run state to the browser console for the automated play check.
    bool testLog; float testT;
    void TestTick(float dt)
    {
        if (!testLog || (testT -= dt) > 0f) return;
        testT = 0.05f;
        int got = 0; foreach (var c in charms) if (c.got) got++;
        var lp = field.Cam.WorldToScreenPoint(field.W(LeftX, Y(0f)));
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"t\":{time:F2},\"air\":{air},\"h\":{h:F0},\"vy\":{vy:F0},\"px\":{px:F0},\"land\":{TimeToLand():F3},\"pend\":{(pending && !float.IsPositiveInfinity(pAt) ? 1 : 0)},\"got\":{got},\"n\":{charms.Count},\"jumps\":{jumps},\"falls\":{falls},\"left\":[{lp.x:F0},{lp.y:F0}],\"ppf\":{field.ScreenPerField():F3},\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.88f, 0.19f, 0.19f, 0.97f);
    static readonly Color Dark = new Color(0.1f, 0.1f, 0.2f, 0.86f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("{0} pouches", NeolJumpStages.All[i].charms.Length / 2);

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
            int m = OiyoScreens.Menu(w, hh, Dark, Accent, new Color(1f, 0.85f, 0.85f), U("Neol Jump"),
                U("Tap right as someone lands on the seesaw to jump higher, then drag through the lucky pouches above the wall."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        var bar = new Rect(8f, 8f, w - 16f, 64f);
        OiyoArcade.Panel(bar, Dark);
        int got = 0; foreach (var c in charms) if (c.got) got++;
        string wind = level.wind != 0f ? "   <color=#a5d8ff>" + (level.wind < 0f ? "◀ " + U("Wind") : U("Wind") + " ▶") + "</color>" : "";
        OiyoArcade.Text(new Rect(20f, 12f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>" + wind, 15, new Color(1f, 0.9f, 0.85f));
        OiyoArcade.Text(new Rect(20f, 36f, w - 90f, 24f), $"{U("Pouches")} <b>{got}/{charms.Count}</b>   {U("Jumps")} <b>{Mathf.Max(0, level.jumps - jumps)}</b>   {U("Falls")} <b>{falls}/{level.falls}</b>", 15, Color.white);
        if (OiyoArcade.Button(new Rect(w - 60f, 14f, 44f, 44f), "<b>II</b>", OiyoScreens.Slate, 18))
        {
            if (state == GameState.Playing) { state = GameState.Paused; drag = false; SetSteer(false, 0f); }
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (msgT > 0f) OiyoArcade.Shadowed(new Rect(8f, 80f, w - 16f, 36f), msg, 22, msgC, TextAnchor.MiddleCenter);
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, hh, Dark, U("Tap to jump up"), U("Tap the moment someone lands for a higher jump. In the air, hold and drag sideways, and come back down on your end."), hh - 84f, 124f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, hh, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            bool w0 = state == GameState.Victory;
            string detail = w0 ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : F("Pouches {0}/{1}", got, charms.Count);
            string body = F("Highest {0} ja", Mathf.RoundToInt(apex / 20f)) + $"\n<size=14>{F("{0} jumps", jumps)} · {F("{0} falls", falls)}</size>";
            int r = OiyoScreens.Result(w, hh, Dark, Accent, w0, ResultLive, w0 ? U("Over the wall and away!") : U("Your legs gave out"), detail, body,
                w0 && stageIdx < StageCount - 1 ? U("Next stage") : null, w0 && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
