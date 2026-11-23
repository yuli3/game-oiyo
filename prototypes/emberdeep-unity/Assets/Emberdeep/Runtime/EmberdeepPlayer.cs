using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Emberdeep 3D: the web Emberdeep (src/components/games/Emberdeep.tsx, src/lib/games/emberdeep.ts)
// rebuilt in Unity as a 2.5D brawler. The fighting rules are the web's, in its pixel units: the three
// oaths (health, mana, speed, attack), the four-hit string (x1, 1.18, 1.42, 1.9, x1.25 in the air) that
// connects 12 px behind to 88 px ahead (125 for the finisher) within 48 px of lane, 22/62 px knockback,
// hit-stop of damage/8 frames (9 for a finisher), score = damage x 10 x (1 + chain x 0.08) + 500 a kill,
// spells that cost 24/32/45 mana for 31/38/52 damage in 135/175/250 px, mana back at 8 a second, a
// dodge of 0.52 s that also speeds you up, a 430 px/s jump, and raiders, hounds and knights that close
// to 65 px and strike every 1.1 s (12/8/22 damage) with 0.65 s of grace after a hit. The web's five
// rooms through two wings become 30 rooms through three wings (crypt, foundry, ember core); every
// tenth room ends with an Ash Warden. Clear a room by felling every foe; stars for the health you keep.
public class EmberdeepPlayer : MonoBehaviour
{
    const string Slug = "emberdeep";
    const int StageCount = 30;
    const float ArenaW = 1000f, LaneTop = 280f, LaneBottom = 538f;
    const float PxToWorld = 1f / 60f;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // HERO_STATS / SPELL_COST from src/lib/games/emberdeep.ts
    enum Hero { Spellblade, Warden, Arcanist }
    static readonly float[] MaxHealth = { 140f, 190f, 105f }, MaxMana = { 100f, 70f, 150f }, HeroSpeed = { 230f, 195f, 215f }, HeroAttack = { 18f, 22f, 14f };
    static readonly string[] HeroName = { "Maelin", "Brom", "Ilyra" };
    static readonly string[] HeroRole = { "Balanced spellblade", "Armored oath-warden", "High-mana arcanist" };
    static readonly Color[] HeroCloak = { new Color(0.22f, 0.33f, 0.17f), new Color(0.48f, 0.29f, 0.18f), new Color(0.14f, 0.29f, 0.35f) };
    enum Spell { Ember, Frost, Storm }
    static readonly float[] SpellCost = { 24f, 32f, 45f }, SpellRadius = { 135f, 175f, 250f }, SpellDamage = { 31f, 38f, 52f };
    static readonly string[] SpellName = { "Ember", "Frost", "Storm" };
    static readonly Color[] SpellColor = { new Color(1f, 0.45f, 0.22f), new Color(0.55f, 0.9f, 1f), new Color(0.85f, 0.72f, 1f) };

    enum Kind { Raider, Hound, Knight, Warden }
    class Enemy
    {
        public Kind kind; public float x, y, hp, maxHp, vx = -1f, hit, attack, speed, harm, reach; public bool entered;
        public Transform t, body, bar, barFill; public float scale = 1f, die;
    }

    int stageIdx;
    Hero hero = Hero.Spellblade;
    Spell spell = Spell.Ember;
    readonly List<Enemy> enemies = new List<Enemy>();
    readonly Queue<Enemy> reserve = new Queue<Enemy>();
    float px, py, jump, jumpV, facing = 1f, health, mana, comboT, attackT, invuln, hitStop, shake, castT;
    int attackStep, combo, bestCombo, kills, score, starsWon, foes;
    float msgT; string msg = "";
    System.Random rng;

    Camera cam;
    Transform root, heroT, heroBody, swordPivot;
    Material ringMat;
    readonly List<Transform> rings = new List<Transform>();
    readonly List<float> ringT = new List<float>();
    Bursts bursts;
    Synth synth;
    bool showStages, pickHero;
    readonly List<Transform> torches = new List<Transform>();

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        cam = new GameObject("Camera").AddComponent<Camera>();
        cam.fieldOfView = 40f;
        cam.clearFlags = CameraClearFlags.SolidColor;
        cam.backgroundColor = new Color(0.03f, 0.04f, 0.05f);
        var sun = new GameObject("Sun").AddComponent<Light>();
        sun.type = LightType.Directional; sun.intensity = 0.75f;
        sun.transform.rotation = Quaternion.Euler(40f, -30f, 0f);
        RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat;
        bursts = new Bursts(transform, 1.4f);
        synth = new Synth(gameObject);
        ringMat = OiyoArcade.Transparent(OiyoArcade.Art("ED/ring"), Color.white);
        hero = (Hero)Mathf.Clamp(PlayerPrefs.GetInt(Slug + ".hero", 0), 0, 2);
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        LoadStage(stageIdx, false);
    }

    // ---------------- Rooms ----------------
    int Wing(int i) => i / 10;                         // 0 crypt, 1 foundry, 2 ember core
    static readonly string[] WingName = { "Crypt of Whispers", "Ashen Foundry", "Ember Core" };
    static readonly Color[] WingWall = { new Color(0.42f, 0.5f, 0.6f), new Color(0.66f, 0.42f, 0.32f), new Color(0.58f, 0.36f, 0.6f) };
    static readonly Color[] WingFloor = { new Color(0.48f, 0.5f, 0.52f), new Color(0.56f, 0.46f, 0.38f), new Color(0.5f, 0.42f, 0.5f) };
    static readonly Color[] WingFog = { new Color(0.03f, 0.07f, 0.1f), new Color(0.12f, 0.04f, 0.02f), new Color(0.07f, 0.03f, 0.1f) };
    static readonly Color[] WingFlame = { new Color(0.5f, 0.85f, 1f), new Color(1f, 0.6f, 0.2f), new Color(1f, 0.4f, 0.85f) };
    bool BossRoom(int i) => (i + 1) % 10 == 0;

    void LoadStage(int idx, bool ready = true)
    {
        stageIdx = Mathf.Clamp(idx, 0, StageCount - 1);
        StopAllCoroutines();
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Hall").transform;
        rings.Clear(); ringT.Clear(); torches.Clear();
        rng = new System.Random(20261123 + stageIdx * 7919);
        enemies.Clear(); reserve.Clear();
        px = 180f; py = 410f; jump = 0f; jumpV = 0f; facing = 1f;
        health = MaxHealth[(int)hero]; mana = MaxMana[(int)hero];
        comboT = attackT = invuln = hitStop = shake = castT = 0f;
        attackStep = combo = bestCombo = kills = score = starsWon = 0;
        msgT = 0f; showStages = false; pickHero = false;
        BuildScene();
        SpawnRoom();
        state = ready ? GameState.Ready : GameState.Menu;
        UpdateCamera(0f, true);
    }

    void SpawnRoom()
    {
        // spawnRoom from the web: 3 + room foes, every third a hound, the last one a knight from room 4
        int n = stageIdx + 1;
        int count = 4 + stageIdx / 3;
        float hpScale = 1f + stageIdx * 0.03f, dmgScale = 1f + stageIdx * 0.02f;
        int extraKnights = stageIdx / 8;
        var list = new List<Enemy>();
        for (int i = 0; i < count; i++)
        {
            Kind k = n >= 4 && i == count - 1 ? Kind.Knight : i % 3 == 1 ? Kind.Hound : Kind.Raider;
            if (k == Kind.Raider && extraKnights > 0 && i % 4 == 3) { k = Kind.Knight; extraKnights--; }
            list.Add(MakeEnemy(k, hpScale, dmgScale));
        }
        if (BossRoom(stageIdx)) list.Add(MakeEnemy(Kind.Warden, 1f + (stageIdx / 10) * 0.6f, dmgScale));
        foes = list.Count;
        for (int i = 0; i < list.Count; i++)
        {
            var e = list[i];
            e.x = ArenaW + 80f + (i % 6) * 105f;
            e.y = 315f + (i % 3) * 70f;
            if (i < 6) Enter(e); else reserve.Enqueue(e);
        }
    }

    Enemy MakeEnemy(Kind k, float hpScale, float dmgScale)
    {
        var e = new Enemy { kind = k };
        e.maxHp = (k == Kind.Warden ? 420f : k == Kind.Knight ? 190f : k == Kind.Hound ? 45f : 75f) * hpScale;
        e.hp = e.maxHp;
        e.speed = k == Kind.Warden ? 40f : k == Kind.Hound ? 92f : k == Kind.Knight ? 42f : 58f;
        e.harm = (k == Kind.Warden ? 28f : k == Kind.Knight ? 22f : k == Kind.Hound ? 8f : 12f) * dmgScale;
        e.reach = k == Kind.Warden ? 85f : 65f;
        e.scale = k == Kind.Warden ? 1.6f : k == Kind.Knight ? 1.2f : 1f;
        return e;
    }

    void Enter(Enemy e)
    {
        e.entered = true;
        enemies.Add(e);
        BuildEnemy(e);
    }

    // ---------------- World mapping (web px -> world) ----------------
    // web y grows toward the viewer, so the far lane (y = 280) is the back of the hall
    Vector3 W(float x, float y, float up = 0f) => new Vector3(x * PxToWorld, up * PxToWorld, (LaneBottom - y) * PxToWorld * 1.15f);
    const float Back = 5.4f;

    void BuildScene()
    {
        int wing = Wing(stageIdx);
        cam.backgroundColor = WingFog[wing];
        RenderSettings.ambientLight = Color.Lerp(new Color(0.35f, 0.35f, 0.4f), WingWall[wing], 0.3f);
        var floorMat = OiyoArcade.Lit(WingFloor[wing], 0.15f, OiyoArcade.Art("ED/flags", true));
        floorMat.mainTextureScale = new Vector2(8f, 3f);
        var floor = OiyoArcade.Prim(PrimitiveType.Cube, "Floor", floorMat, root);
        floor.transform.position = new Vector3(ArenaW * 0.5f * PxToWorld, -0.25f, 1.2f);
        floor.transform.localScale = new Vector3(ArenaW * PxToWorld + 8f, 0.5f, 10.5f);
        var wallMat = OiyoArcade.Lit(WingWall[wing], 0.1f, OiyoArcade.Art("ED/bricks", true));
        wallMat.mainTextureScale = new Vector2(7f, 1.6f);
        var wall = OiyoArcade.Prim(PrimitiveType.Cube, "Wall", wallMat, root);
        wall.transform.position = new Vector3(ArenaW * 0.5f * PxToWorld, 2.6f, Back + 0.9f);
        wall.transform.localScale = new Vector3(ArenaW * PxToWorld + 8f, 6f, 0.6f);
        // pillars and torches along the back wall
        var stone = OiyoArcade.Lit(WingWall[wing] * 0.8f, 0.2f);
        for (int i = 0; i < 6; i++)
        {
            float x = -1f + i * 3.5f;
            var pil = OiyoArcade.Prim(PrimitiveType.Cube, "Pillar", stone, root);
            pil.transform.position = new Vector3(x, 2.4f, Back + 0.45f);
            pil.transform.localScale = new Vector3(0.7f, 5.6f, 0.5f);
            if (i == 5) continue;
            var tx = x + 1.75f;
            var bracket = OiyoArcade.Prim(PrimitiveType.Cylinder, "Torch", OiyoArcade.Lit(new Color(0.25f, 0.18f, 0.12f), 0.2f), root);
            bracket.transform.position = new Vector3(tx, 1.9f, Back + 0.5f);
            bracket.transform.localScale = new Vector3(0.12f, 0.3f, 0.12f);
            var flame = OiyoArcade.GlowQuad("Flame", WingFlame[wing], 0.7f, root);
            flame.transform.position = new Vector3(tx, 2.3f, Back + 0.4f);
            torches.Add(flame.transform);
            var halo = OiyoArcade.GlowQuad("Halo", WingFlame[wing] * new Color(1f, 1f, 1f, 0.28f), 3.2f, root);
            halo.transform.position = new Vector3(tx, 2.25f, Back + 0.45f);
        }
        // rubble and bones on the floor edge
        var rubble = OiyoArcade.Lit(WingFloor[wing] * 0.7f, 0.1f);
        var rs = new System.Random(stageIdx + 3);
        for (int i = 0; i < 14; i++)
        {
            var r = OiyoArcade.Prim(PrimitiveType.Cube, "Rubble", rubble, root);
            r.transform.position = new Vector3((float)rs.NextDouble() * ArenaW * PxToWorld, 0.08f, Back + 0.15f + (float)rs.NextDouble() * 0.2f);
            r.transform.localScale = new Vector3(0.25f + (float)rs.NextDouble() * 0.4f, 0.18f + (float)rs.NextDouble() * 0.2f, 0.25f);
            r.transform.localRotation = Quaternion.Euler(0f, (float)rs.NextDouble() * 90f, 0f);
        }
        // hero
        heroT = new GameObject("Hero").transform; heroT.SetParent(root, false);
        heroBody = new GameObject("Body").transform; heroBody.SetParent(heroT, false);
        int h = (int)hero;
        var cloak = OiyoArcade.Lit(HeroCloak[h], 0.2f);
        var armor = OiyoArcade.Lit(h == 1 ? new Color(0.6f, 0.6f, 0.62f) : new Color(0.72f, 0.69f, 0.63f), 0.5f, null, h == 1 ? 0.4f : 0.1f);
        var skin = OiyoArcade.Lit(new Color(0.82f, 0.63f, 0.44f), 0.3f);
        Part(heroBody, PrimitiveType.Cube, cloak, new Vector3(-0.08f, 0.62f, 0.05f), new Vector3(0.5f, 0.75f, 0.42f));
        Part(heroBody, PrimitiveType.Cube, armor, new Vector3(0f, 0.75f, 0f), new Vector3(0.42f, 0.5f, 0.36f));
        Part(heroBody, PrimitiveType.Cube, OiyoArcade.Lit(new Color(0.1f, 0.1f, 0.1f), 0.2f), new Vector3(0f, 0.25f, 0f), new Vector3(0.34f, 0.5f, 0.3f));
        Part(heroBody, PrimitiveType.Sphere, skin, new Vector3(0.02f, 1.16f, 0f), Vector3.one * 0.32f);
        Part(heroBody, PrimitiveType.Cube, OiyoArcade.Lit(h == 2 ? new Color(0.2f, 0.5f, 0.7f) : new Color(0.15f, 0.1f, 0.08f), 0.3f), new Vector3(0f, 1.3f, 0f), new Vector3(0.36f, 0.1f, 0.36f));
        swordPivot = new GameObject("Sword").transform; swordPivot.SetParent(heroBody, false);
        swordPivot.localPosition = new Vector3(0.22f, 0.82f, -0.22f);
        Part(swordPivot, PrimitiveType.Cube, OiyoArcade.Lit(new Color(0.15f, 0.15f, 0.15f), 0.3f), new Vector3(0.18f, 0f, 0f), new Vector3(0.36f, 0.07f, 0.07f));
        Part(swordPivot, PrimitiveType.Cube, OiyoArcade.LitGlow(new Color(0.85f, 0.75f, 0.45f), new Color(0.25f, 0.2f, 0.05f), 0.8f), new Vector3(0.75f, 0f, 0f), new Vector3(0.9f, 0.09f, 0.04f));
        var shadow = OiyoArcade.Prim(PrimitiveType.Quad, "Shadow", OiyoArcade.Transparent(OiyoArcade.GlowTexture(), new Color(0f, 0f, 0f, 0.55f)), heroT);
        shadow.transform.localPosition = new Vector3(0f, 0.02f, 0f);
        shadow.transform.localRotation = Quaternion.Euler(90f, 0f, 0f);
        shadow.transform.localScale = new Vector3(0.9f, 0.5f, 1f);
        shadow.name = "Shadow";
    }

    static GameObject Part(Transform parent, PrimitiveType t, Material m, Vector3 pos, Vector3 scale)
    {
        var g = OiyoArcade.Prim(t, "Part", m, parent);
        g.transform.localPosition = pos; g.transform.localScale = scale;
        return g;
    }

    void BuildEnemy(Enemy e)
    {
        e.t = new GameObject(e.kind.ToString()).transform; e.t.SetParent(root, false);
        e.body = new GameObject("Body").transform; e.body.SetParent(e.t, false);
        e.body.localScale = Vector3.one * e.scale;
        switch (e.kind)
        {
            case Kind.Hound:
                {
                    var fur = OiyoArcade.Lit(new Color(0.36f, 0.2f, 0.15f), 0.2f);
                    Part(e.body, PrimitiveType.Cube, fur, new Vector3(0f, 0.42f, 0f), new Vector3(0.85f, 0.38f, 0.34f));
                    Part(e.body, PrimitiveType.Cube, fur, new Vector3(0.5f, 0.6f, 0f), new Vector3(0.34f, 0.3f, 0.28f));
                    Part(e.body, PrimitiveType.Cube, OiyoArcade.Glow(new Color(1f, 0.45f, 0.2f)), new Vector3(0.62f, 0.66f, -0.15f), new Vector3(0.06f, 0.05f, 0.02f));
                    foreach (var lx in new[] { -0.28f, 0.28f }) Part(e.body, PrimitiveType.Cube, fur, new Vector3(lx, 0.14f, 0f), new Vector3(0.1f, 0.3f, 0.1f));
                    Part(e.body, PrimitiveType.Cube, fur, new Vector3(0.48f, 0.82f, 0f), new Vector3(0.08f, 0.16f, 0.08f));
                    break;
                }
            default:
                {
                    bool armored = e.kind != Kind.Raider;
                    var body = OiyoArcade.Lit(e.kind == Kind.Warden ? new Color(0.25f, 0.22f, 0.22f) : armored ? new Color(0.32f, 0.29f, 0.27f) : new Color(0.43f, 0.2f, 0.16f), armored ? 0.5f : 0.2f, null, armored ? 0.4f : 0f);
                    Part(e.body, PrimitiveType.Cube, body, new Vector3(0f, 0.72f, 0f), new Vector3(0.5f, 0.62f, 0.38f));
                    Part(e.body, PrimitiveType.Cube, OiyoArcade.Lit(new Color(0.12f, 0.1f, 0.1f), 0.2f), new Vector3(0f, 0.24f, 0f), new Vector3(0.4f, 0.48f, 0.3f));
                    Part(e.body, PrimitiveType.Sphere, OiyoArcade.Lit(new Color(0.13f, 0.11f, 0.1f), 0.3f), new Vector3(0f, 1.2f, 0f), Vector3.one * 0.36f);
                    Part(e.body, PrimitiveType.Cube, OiyoArcade.Glow(e.kind == Kind.Warden ? new Color(1f, 0.3f, 0.1f) : new Color(0.9f, 0.36f, 0.19f)), new Vector3(0.12f, 1.22f, -0.17f), new Vector3(0.12f, 0.05f, 0.02f));
                    var weapon = OiyoArcade.Lit(new Color(0.55f, 0.5f, 0.45f), 0.6f, null, 0.5f);
                    Part(e.body, PrimitiveType.Cube, weapon, new Vector3(0.34f, 0.7f, -0.2f), new Vector3(0.08f, armored ? 0.9f : 0.6f, 0.06f));
                    if (armored)
                    {
                        var horn = OiyoArcade.Lit(new Color(0.55f, 0.48f, 0.37f), 0.4f);
                        var h1 = Part(e.body, PrimitiveType.Cube, horn, new Vector3(-0.12f, 1.42f, 0f), new Vector3(0.06f, 0.26f, 0.06f));
                        h1.transform.localRotation = Quaternion.Euler(0f, 0f, 30f);
                        Part(e.body, PrimitiveType.Cube, body, new Vector3(-0.32f, 0.75f, 0f), new Vector3(0.12f, 0.7f, 0.5f));
                    }
                    break;
                }
        }
        var shadow = OiyoArcade.Prim(PrimitiveType.Quad, "Shadow", OiyoArcade.Transparent(OiyoArcade.GlowTexture(), new Color(0f, 0f, 0f, 0.5f)), e.t);
        shadow.transform.localPosition = new Vector3(0f, 0.02f, 0f);
        shadow.transform.localRotation = Quaternion.Euler(90f, 0f, 0f);
        shadow.transform.localScale = new Vector3(e.kind == Kind.Hound ? 1.1f : 0.8f, 0.45f, 1f) * e.scale;
        e.bar = OiyoArcade.Prim(PrimitiveType.Quad, "Bar", OiyoArcade.Glow(new Color(0.09f, 0.03f, 0.03f)), e.t).transform;
        e.bar.localScale = new Vector3(0.84f, 0.1f, 1f);
        e.barFill = OiyoArcade.Prim(PrimitiveType.Quad, "Fill", OiyoArcade.Glow(new Color(0.7f, 0.2f, 0.15f)), e.t).transform;
        e.barFill.localScale = new Vector3(0.8f, 0.07f, 1f);
    }

    // ---------------- Input ----------------
    float mx, my;
    bool tAttack, tSpell, tDodge, tJump, tCycle;
    int stickId = int.MinValue; Vector2 stickStart, stickNow;

    Rect BtnAttack, BtnSpell, BtnDodge, BtnJump, BtnCycle;
    Vector2 StickHome;
    void Layout(float w, float h)
    {
        float s = Mathf.Clamp(Mathf.Min(w, h) * 0.17f, 58f, 82f);
        BtnAttack = new Rect(w - s * 1.3f - 14f, h - s * 1.3f - 22f, s * 1.3f, s * 1.3f);
        BtnJump = new Rect(BtnAttack.x - s - 12f, h - s - 24f, s, s);
        BtnDodge = new Rect(BtnAttack.x + s * 0.3f, BtnAttack.y - s - 12f, s, s);
        BtnSpell = new Rect(BtnJump.x, BtnJump.y - s - 12f, s, s);
        BtnCycle = new Rect(BtnSpell.x - s * 0.75f - 10f, BtnSpell.y + s * 0.2f, s * 0.75f, s * 0.6f);
        // the stick's resting place sits above the page's full-window exit button in the bottom-left corner
        StickHome = new Vector2(16f + s * 1.05f, h - s - 92f);
    }

    bool TappedIn(Rect r, List<OiyoArcade.Press> began)
    {
        foreach (var p in began) if (r.Contains(OiyoArcade.ToGui(p.pos))) return true;
        return false;
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
                    float w = OiyoArcade.W, h = OiyoArcade.H;
                    Layout(w, h);
                    // keyboard
                    mx = (Input.GetKey(KeyCode.D) || Input.GetKey(KeyCode.RightArrow) ? 1f : 0f) - (Input.GetKey(KeyCode.A) || Input.GetKey(KeyCode.LeftArrow) ? 1f : 0f);
                    my = (Input.GetKey(KeyCode.S) || Input.GetKey(KeyCode.DownArrow) ? 1f : 0f) - (Input.GetKey(KeyCode.W) || Input.GetKey(KeyCode.UpArrow) ? 1f : 0f);
                    tAttack |= Input.GetKeyDown(KeyCode.J) || Input.GetKeyDown(KeyCode.Z);
                    tSpell |= Input.GetKeyDown(KeyCode.K) || Input.GetKeyDown(KeyCode.X);
                    tDodge |= Input.GetKeyDown(KeyCode.L) || Input.GetKeyDown(KeyCode.C);
                    tJump |= Input.GetKeyDown(KeyCode.Space);
                    if (Input.GetKeyDown(KeyCode.Alpha1)) spell = Spell.Ember;
                    if (Input.GetKeyDown(KeyCode.Alpha2)) spell = Spell.Frost;
                    if (Input.GetKeyDown(KeyCode.Alpha3)) spell = Spell.Storm;
                    // touch: buttons on the right, a floating stick on the left half
                    var began = OiyoArcade.Began();
                    var raw = new List<OiyoArcade.Press>();
                    foreach (var p in began) raw.Add(p);
                    tAttack |= TappedIn(BtnAttack, raw); tSpell |= TappedIn(BtnSpell, raw); tDodge |= TappedIn(BtnDodge, raw);
                    tJump |= TappedIn(BtnJump, raw); tCycle |= TappedIn(BtnCycle, raw);
                    foreach (var p in began)
                    {
                        var g = OiyoArcade.ToGui(p.pos);
                        if (g.x < w * 0.5f && g.y > 110f && !InButtons(g)) { stickId = p.id; stickStart = g; stickNow = g; }
                    }
                    bool held = false;
                    foreach (var p in OiyoArcade.Held()) if (p.id == stickId) { held = true; stickNow = OiyoArcade.ToGui(p.pos); }
                    if (!held) stickId = int.MinValue;
                    if (stickId != int.MinValue)
                    {
                        var d = stickNow - stickStart;
                        if (d.magnitude > 12f) { mx = Mathf.Clamp(d.x / 40f, -1f, 1f); my = Mathf.Clamp(d.y / 40f, -1f, 1f); }
                    }
                    bool any = began.Count > 0 || Input.anyKeyDown || mx != 0f || my != 0f;
                    if (state == GameState.Ready && any) state = GameState.Playing;
                    if (tCycle) { spell = (Spell)(((int)spell + 1) % 3); tCycle = false; }
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
                if (!showStages && !pickHero && (confirm || Input.GetKeyDown(KeyCode.Space))) LoadStage(stageIdx);
                return;
        }
    }

    bool InButtons(Vector2 g) => BtnAttack.Contains(g) || BtnSpell.Contains(g) || BtnDodge.Contains(g) || BtnJump.Contains(g) || BtnCycle.Contains(g);

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("emberdeep", state, score);
        float dt = Mathf.Min(Time.deltaTime, 0.033f);
        TestTick(dt);
        ReadInput();
        if (state == GameState.Playing)
        {
            if (hitStop > 0f) hitStop -= dt;
            else Step(dt);
        }
        if (state != GameState.Ready && state != GameState.Playing) tAttack = tSpell = tDodge = tJump = false;
        msgT = Mathf.Max(0f, msgT - dt);
        Sync(dt);
        UpdateCamera(dt, false);
    }

    int Hi => (int)hero;

    void Step(float dt)
    {
        float speed = HeroSpeed[Hi] * (invuln > 0.35f ? 2.25f : 1f);
        px = Mathf.Clamp(px + Mathf.Sign(mx) * (Mathf.Abs(mx) > 0.25f ? 1f : 0f) * speed * dt, 55f, ArenaW - 55f);
        py = Mathf.Clamp(py + Mathf.Sign(my) * (Mathf.Abs(my) > 0.25f ? 1f : 0f) * speed * 0.62f * dt, LaneTop, LaneBottom);
        if (Mathf.Abs(mx) > 0.25f) facing = Mathf.Sign(mx);
        if (tAttack) Attack();
        if (tSpell) Cast();
        if (tDodge && invuln <= 0f) { invuln = 0.52f; synth.Tone(300f, 0.1f, Wave.Noise, 0.06f, 0f, 20f); }
        if (tJump && jump == 0f) { jumpV = 430f; synth.Tone(420f, 0.08f, Wave.Square, 0.06f, 700f, 18f); }
        tAttack = tSpell = tDodge = tJump = false;
        if (jumpV != 0f || jump != 0f) { jump += jumpV * dt; jumpV -= 980f * dt; if (jump <= 0f) { jump = 0f; jumpV = 0f; } }
        attackT = Mathf.Max(0f, attackT - dt); comboT = Mathf.Max(0f, comboT - dt);
        if (comboT <= 0f) { combo = 0; attackStep = 0; }
        invuln = Mathf.Max(0f, invuln - dt);
        castT = Mathf.Max(0f, castT - dt);
        mana = Mathf.Min(MaxMana[Hi], mana + 8f * dt);
        shake *= Mathf.Pow(0.86f, dt * 60f);
        foreach (var e in enemies)
        {
            e.hit = Mathf.Max(0f, e.hit - dt); e.attack = Mathf.Max(0f, e.attack - dt);
            if (e.hp <= 0f) continue;
            float dx = px - e.x, dy = py - e.y, dist = Mathf.Sqrt(dx * dx + dy * 1.7f * dy * 1.7f);
            if (dist > e.reach)
            {
                e.x += Mathf.Sign(dx) * e.speed * dt; e.y += Mathf.Sign(dy) * e.speed * 0.45f * dt; e.vx = Mathf.Sign(dx);
            }
            else if (e.attack <= 0f && invuln <= 0f)
            {
                health -= e.harm;
                combo = 0; attackStep = 0;
                invuln = 0.65f;
                e.attack = e.kind == Kind.Warden ? 1.5f : 1.1f;
                shake = 11f;
                bursts.Emit(W(px, py, 45f + jump), new Color(0.94f, 0.42f, 0.31f), 14, 4f, 0.18f, 0.4f);
                synth.Tone(120f, 0.16f, Wave.Square, 0.16f, 70f, 10f);
            }
        }
        // fallen foes make room for the ones waiting outside
        int alive = 0; foreach (var e in enemies) if (e.hp > 0f) alive++;
        while (alive < 6 && reserve.Count > 0) { var e = reserve.Dequeue(); e.x = ArenaW + 80f; Enter(e); alive++; }
        if (alive == 0 && reserve.Count == 0) End(true);
        else if (health <= 0f) { health = 0f; End(false); }
    }

    // attack() from the web
    void Attack()
    {
        if (attackT > 0f) return;
        attackStep = comboT > 0f ? (attackStep + 1) % 4 : 0;
        attackT = 0.22f; comboT = 0.55f;
        float[] mult = { 1f, 1.18f, 1.42f, 1.9f };
        float damage = Mathf.Round(HeroAttack[Hi] * mult[attackStep] * (jump > 4f ? 1.25f : 1f));
        float range = attackStep == 3 ? 125f : 88f;
        bool any = false;
        foreach (var e in enemies)
        {
            if (e.hp <= 0f) continue;
            float ahead = (e.x - px) * facing;
            if (ahead < -12f || ahead > range || Mathf.Abs(e.y - py) > 48f) continue;
            any = true;
            e.hp -= damage; e.hit = 0.13f;
            // knockback, but never through the hall's end walls
            e.x = Mathf.Clamp(e.x + facing * (attackStep == 3 ? 62f : 22f), 30f, Mathf.Max(e.x, ArenaW - 30f));
            combo++; bestCombo = Mathf.Max(bestCombo, combo);
            score += ScoreForHit(damage, combo, e.hp <= 0f);
            hitStop = (attackStep == 3 ? 9 : Mathf.Clamp(Mathf.RoundToInt(damage / 8f), 2, 7)) / 60f;
            shake = attackStep == 3 ? 14f : 6f;
            bursts.Emit(W(e.x, e.y, 45f), new Color(1f, 0.83f, 0.42f), attackStep == 3 ? 22 : 10, 5f, 0.16f, 0.35f);
            if (e.hp <= 0f) Fell(e);
        }
        if (any) synth.Tone(90f + Random.value * 40f, 0.12f, Wave.Square, 0.2f, 50f, 14f);
        else synth.Tone(700f, 0.06f, Wave.Noise, 0.05f, 0f, 30f);
    }

    static int ScoreForHit(float damage, int combo, bool killed)
    {
        float chain = 1f + Mathf.Min(20, Mathf.Max(0, combo)) * 0.08f;
        return Mathf.RoundToInt(Mathf.Max(0f, damage) * 10f * chain + (killed ? 500 : 0));
    }

    void Fell(Enemy e)
    {
        kills++;
        e.die = 0.01f;
        bursts.Emit(W(e.x, e.y, 40f), WingFlame[Wing(stageIdx)], 20, 4f, 0.22f, 0.6f);
        if (e.kind == Kind.Warden) { Toast(U("The Ash Warden falls!")); shake = 18f; }
    }

    void Cast()
    {
        int s = (int)spell;
        if (mana < SpellCost[s]) { Toast(U("Not enough mana")); synth.Tone(160f, 0.12f, Wave.Triangle, 0.1f, 0f, 12f); return; }
        mana -= SpellCost[s]; attackT = 0.2f; castT = 0.45f;
        float radius = SpellRadius[s], damage = SpellDamage[s];
        foreach (var e in enemies)
        {
            if (e.hp <= 0f) continue;
            float dx = e.x - px, dy = (e.y - py) * 1.5f;
            if (Mathf.Sqrt(dx * dx + dy * dy) >= radius) continue;
            e.hp -= damage; e.hit = 0.22f;
            score += ScoreForHit(damage, combo, e.hp <= 0f);
            bursts.Emit(W(e.x, e.y, 40f), SpellColor[s], 18, 4f, 0.18f, 0.5f);
            if (e.hp <= 0f) { combo++; Fell(e); }
        }
        hitStop = 5f / 60f; shake = 10f;
        Ring(radius, SpellColor[s]);
        synth.Tone(280f, 0.18f, Wave.Sine, 0.16f, 560f, 6f);
        synth.Tone(560f, 0.2f, Wave.Triangle, 0.1f, 1120f, 6f);
    }

    void Ring(float radius, Color c)
    {
        Transform r = null; int idx = -1;
        for (int i = 0; i < rings.Count; i++) if (ringT[i] <= 0f) { r = rings[i]; idx = i; break; }
        if (r == null)
        {
            r = OiyoArcade.Prim(PrimitiveType.Quad, "Ring", OiyoArcade.Transparent(ringMat.mainTexture, c), root).transform;
            r.localRotation = Quaternion.Euler(90f, 0f, 0f);
            rings.Add(r); ringT.Add(0f); idx = rings.Count - 1;
        }
        r.gameObject.SetActive(true);
        r.GetComponent<Renderer>().material.color = c;
        r.position = W(px, py, 4f);
        ringT[idx] = 0.45f;
        ringR = radius;
    }
    float ringR;

    void Toast(string s) { msg = s; msgT = 1.3f; }

    float endTime;
    // the press that fells the last foe must not also press a result button under the finger
    bool ResultLive => Time.unscaledTime - endTime > 0.45f;

    void End(bool won)
    {
        if (state != GameState.Playing) return;
        endTime = Time.unscaledTime;
        if (won)
        {
            float share = health / MaxHealth[Hi];
            starsWon = share >= 0.7f ? 3 : share >= 0.35f ? 2 : 1;
            score += 500 + Mathf.RoundToInt(health * 10f) + (stageIdx == StageCount - 1 ? 2500 : 0);
            state = GameState.Victory;
            OiyoArcade.Record(Slug, stageIdx, starsWon, score, StageCount);
            StartCoroutine(Arp(new[] { 392f, 523f, 659f, 784f, 1047f }, 0.1f));
        }
        else
        {
            state = GameState.GameOver;
            synth.Tone(196f, 0.8f, Wave.Saw, 0.18f, 82f, 2.5f);
        }
    }

    IEnumerator Arp(float[] fs, float gap)
    {
        foreach (var f in fs) { synth.Tone(f, 0.2f, Wave.Triangle, 0.22f, 0f, 6f); yield return new WaitForSeconds(gap); }
    }

    void Sync(float dt)
    {
        float t = Time.time;
        heroT.position = W(px, py);
        heroBody.localPosition = new Vector3(0f, jump * PxToWorld, 0f);
        heroBody.localRotation = Quaternion.Euler(0f, facing > 0f ? 0f : 180f, 0f);
        bool moving = state == GameState.Playing && (Mathf.Abs(mx) > 0.25f || Mathf.Abs(my) > 0.25f);
        heroBody.localScale = new Vector3(1f, 1f + (moving ? Mathf.Abs(Mathf.Sin(t * 14f)) * 0.05f : 0f), 1f);
        // the web's swing: -1.2 + attack x 0.24 rad while swinging, 0.42 at rest
        float swing = attackT > 0f ? (-1.2f + (attackStep + 1) * 0.24f) - (attackT / 0.22f) * 1.6f : 0.42f;
        swordPivot.localRotation = Quaternion.Euler(0f, 0f, -swing * Mathf.Rad2Deg * 0.8f + (castT > 0f ? 70f : 0f));
        bool blink = invuln > 0f && Mathf.Repeat(t * 18f, 1f) < 0.35f;
        heroBody.gameObject.SetActive(!blink || state != GameState.Playing);
        foreach (var e in enemies)
        {
            if (e.t == null) continue;
            if (e.hp <= 0f)
            {
                e.die += dt;
                e.body.localRotation = Quaternion.Euler(0f, e.vx < 0f ? 180f : 0f, Mathf.Min(90f, e.die * 300f));
                e.bar.gameObject.SetActive(false); e.barFill.gameObject.SetActive(false);
                if (e.die > 0.9f) e.t.gameObject.SetActive(false);
                e.t.position = W(e.x, e.y);
                continue;
            }
            e.t.position = W(e.x, e.y);
            float bob = Mathf.Abs(Mathf.Sin(t * (e.kind == Kind.Hound ? 16f : 9f) + e.x)) * 0.05f;
            e.body.localPosition = new Vector3(0f, bob, 0f);
            e.body.localRotation = Quaternion.Euler(0f, e.vx < 0f ? 180f : 0f, e.attack > 0.9f ? -15f : 0f);
            float k = e.hit > 0f ? 1.15f : 1f;
            e.body.localScale = Vector3.one * e.scale * k;
            float top = (e.kind == Kind.Hound ? 1.05f : 1.65f) * e.scale;
            e.bar.localPosition = new Vector3(0f, top, -0.3f);
            float frac = Mathf.Clamp01(e.hp / e.maxHp);
            e.barFill.localPosition = new Vector3(-0.4f * (1f - frac), top, -0.31f);
            e.barFill.localScale = new Vector3(0.8f * frac, 0.07f, 1f);
        }
        foreach (var tr in torches) tr.localScale = Vector3.one * (0.6f + Mathf.Sin(t * 13f + tr.position.x) * 0.08f + Mathf.Sin(t * 7f) * 0.05f);
        for (int i = 0; i < rings.Count; i++)
        {
            if (ringT[i] <= 0f) { rings[i].gameObject.SetActive(false); continue; }
            ringT[i] -= dt;
            float k = 1f - ringT[i] / 0.45f;
            float d = ringR * 2f * PxToWorld * (0.3f + k * 0.7f);
            rings[i].localScale = new Vector3(d, d / 1.5f * 1.15f, 1f);
            var c = rings[i].GetComponent<Renderer>().material.color; c.a = 1f - k;
            rings[i].GetComponent<Renderer>().material.color = c;
        }
    }

    void UpdateCamera(float dt, bool snap)
    {
        // follow the hero along the hall; keep the whole lane depth in view
        float halfV = cam.fieldOfView * 0.5f * Mathf.Deg2Rad;
        // about 14 world units (840 px of the 1000 px hall) across in landscape, closer on a phone
        float dist = Mathf.Clamp(7f / (Mathf.Tan(halfV) * cam.aspect), 9f, 14f);
        float halfWorld = Mathf.Tan(halfV) * cam.aspect * dist;
        float minX = -0.6f + halfWorld, maxX = ArenaW * PxToWorld + 0.6f - halfWorld;
        float tx = minX > maxX ? ArenaW * PxToWorld * 0.5f : Mathf.Clamp(px * PxToWorld, minX, maxX);
        // look at the middle of the lanes from 18 degrees up; on a phone the scene sits higher, above the touch controls
        var look = new Vector3(tx, cam.aspect < 1f ? -0.9f : 0.5f, 2.4f);
        var fwd = Quaternion.Euler(18f, 0f, 0f) * Vector3.forward;
        var target = look - fwd * dist;
        cam.transform.position = snap ? target : Vector3.Lerp(cam.transform.position, target, 1f - Mathf.Exp(-dt * 6f));
        cam.transform.rotation = Quaternion.Euler(18f, 0f, 0f);
        if (shake > 0.3f) cam.transform.position += new Vector3(Random.Range(-1f, 1f), Random.Range(-1f, 1f), 0f) * shake * 0.004f;
    }

    // ?oiyotest=1 prints the run state to the browser console for the automated play check.
    bool testLog; float testT;
    void TestTick(float dt)
    {
        if (!testLog || (testT -= dt) > 0f) return;
        testT = 0.1f;
        Debug.Log("OIYOTEST " + TestState());
    }
    string TestState()
    {
        var sb = new System.Text.StringBuilder();
        foreach (var e in enemies)
        {
            if (e.hp <= 0f) continue;
            if (sb.Length > 0) sb.Append(',');
            sb.Append($"[{e.x:F0},{e.y:F0},{e.hp:F0}]");
        }
        return $"{{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"score\":{score},\"hp\":{health:F0},\"mana\":{mana:F0},\"x\":{px:F0},\"y\":{py:F0},\"face\":{facing:F0},\"left\":{foes - kills},\"foes\":[{sb}],\"sw\":{Screen.width},\"sh\":{Screen.height}}}";
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.86f, 0.42f, 0.18f, 0.97f);
    static readonly Color Dark = new Color(0.04f, 0.035f, 0.03f, 0.84f);
    static readonly Color Gold = new Color(1f, 0.83f, 0.42f, 0.97f);
    static readonly Color Slate = new Color(0.22f, 0.2f, 0.18f, 0.95f);

    string StageTitle(int i) => F("Room {0}", i + 1) + " · " + U(WingName[Wing(i)]);

    void OnGUI()
    {
        OiyoArcade.Begin();
        float w = OiyoArcade.W, h = OiyoArcade.H;
        if (state == GameState.Menu) { DrawMenu(w, h); return; }
        var bar = new Rect(8f, 8f, w - 16f, 84f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 12f, w - 140f, 22f), "<b>" + StageTitle(stageIdx) + "</b>", 15, new Color(0.85f, 0.77f, 0.6f));
        string cb = combo > 1 ? $"   <color=#ffd36b><b>{combo} {U("CHAIN")}</b></color>" : "";
        OiyoArcade.Text(new Rect(20f, 32f, w - 90f, 22f), $"{U("Foes")} <b>{foes - kills}</b>   {U("Score")} <b>{score:N0}</b>{cb}", 15, Color.white);
        float bw = w - 96f;
        OiyoArcade.Bar(new Rect(20f, 58f, bw, 11f), health / MaxHealth[Hi], new Color(0.2f, 0.07f, 0.05f, 0.9f), new Color(0.72f, 0.26f, 0.18f));
        OiyoArcade.Bar(new Rect(20f, 73f, bw, 8f), mana / MaxMana[Hi], new Color(0.06f, 0.16f, 0.2f, 0.9f), new Color(0.3f, 0.66f, 0.77f));
        if (OiyoArcade.Button(new Rect(w - 64f, 14f, 46f, 46f), "<b>II</b>", Slate, 18))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (msgT > 0f) OiyoArcade.Shadowed(new Rect(8f, 98f, w - 16f, 36f), msg, w < 520f ? 17 : 21, Gold, TextAnchor.MiddleCenter);
        if (state == GameState.Ready || state == GameState.Playing) DrawControls(w, h);
        if (state == GameState.Ready)
        {
            float cw = Mathf.Min(360f, w - 24f);
            var r = new Rect(w * 0.5f - cw * 0.5f, 140f, cw, 104f);
            OiyoArcade.Panel(r, Dark);
            string boss = BossRoom(stageIdx) ? "\n<color=#ff9a6a>" + U("An Ash Warden guards this room.") + "</color>" : "";
            OiyoArcade.Text(new Rect(r.x + 12f, r.y + 6f, r.width - 24f, r.height - 12f),
                $"<b>{F("Defeat all {0} foes", foes)}</b>{boss}\n<size=13>{U("Keys: WASD move · J attack · K spell · L dodge · Space jump · 1-3 spell")}</size>", 15, Color.white, TextAnchor.MiddleCenter);
        }
        if (state == GameState.Paused) DrawPause(w, h);
        if (state == GameState.Victory || state == GameState.GameOver) DrawResult(w, h);
    }

    void DrawControls(float w, float h)
    {
        Layout(w, h);
        var pad = new Color(0.1f, 0.08f, 0.07f, 0.55f);
        OiyoArcade.Panel(BtnAttack, new Color(0.62f, 0.24f, 0.12f, 0.8f));
        OiyoArcade.Text(BtnAttack, "<b>" + U("ATTACK") + "</b>", 15, Color.white, TextAnchor.MiddleCenter);
        int s = (int)spell;
        OiyoArcade.Panel(BtnSpell, new Color(SpellColor[s].r * 0.55f, SpellColor[s].g * 0.55f, SpellColor[s].b * 0.55f, mana >= SpellCost[s] ? 0.85f : 0.4f));
        OiyoArcade.Text(BtnSpell, $"<b>{U("SPELL")}</b>\n<size=11>{U(SpellName[s])} {SpellCost[s]:F0}</size>", 13, Color.white, TextAnchor.MiddleCenter);
        OiyoArcade.Panel(BtnDodge, pad); OiyoArcade.Text(BtnDodge, "<b>" + U("DODGE") + "</b>", 12, Color.white, TextAnchor.MiddleCenter);
        OiyoArcade.Panel(BtnJump, pad); OiyoArcade.Text(BtnJump, "<b>" + U("JUMP") + "</b>", 13, Color.white, TextAnchor.MiddleCenter);
        OiyoArcade.Panel(BtnCycle, pad); OiyoArcade.Text(BtnCycle, "1-2-3", 11, new Color(1f, 1f, 1f, 0.8f), TextAnchor.MiddleCenter);
        // the stick: at rest above the exit-button corner, or under the thumb while held
        var c = stickId != int.MinValue ? stickStart : StickHome;
        float r = 46f;
        OiyoArcade.Panel(new Rect(c.x - r, c.y - r, r * 2f, r * 2f), new Color(0.1f, 0.08f, 0.07f, 0.4f));
        var knob = stickId != int.MinValue ? stickStart + Vector2.ClampMagnitude(stickNow - stickStart, 40f) : c;
        OiyoArcade.Panel(new Rect(knob.x - 20f, knob.y - 20f, 40f, 40f), new Color(0.85f, 0.75f, 0.6f, 0.6f));
    }

    void DrawMenu(float w, float h)
    {
        if (showStages)
        {
            float bw = Mathf.Min(w - 16f, 760f);
            var box = new Rect(w * 0.5f - bw * 0.5f, 12f, bw, Mathf.Min(h - 24f, 520f));
            OiyoArcade.Panel(box, new Color(0.05f, 0.04f, 0.035f, 0.95f));
            OiyoArcade.Text(new Rect(box.x + 16f, box.y + 12f, box.width - 120f, 30f), "<b>" + U("Choose a room") + "</b>", 20, Color.white);
            OiyoArcade.Text(new Rect(box.x + 16f, box.y + 40f, box.width - 32f, 22f), $"★ {OiyoArcade.TotalStars(Slug, StageCount)}/{StageCount * 3}", 15, Gold);
            if (OiyoArcade.Button(new Rect(box.xMax - 100f, box.y + 12f, 86f, 40f), U("Back"), Slate, 16)) showStages = false;
            int pick = OiyoArcade.StageGrid(new Rect(box.x + 14f, box.y + 70f, box.width - 28f, box.height - 84f), Slug, StageCount, Accent, U("Room"));
            if (pick >= 0) LoadStage(pick);
            return;
        }
        if (pickHero)
        {
            float cw2 = Mathf.Min(380f, w - 24f);
            var box = new Rect(w * 0.5f - cw2 * 0.5f, h * 0.5f - 170f, cw2, 340f);
            OiyoArcade.Panel(box, Dark);
            OiyoArcade.Shadowed(new Rect(box.x, box.y + 14f, cw2, 34f), U("Choose your oath"), 24, Gold, TextAnchor.MiddleCenter);
            for (int i = 0; i < 3; i++)
            {
                string label = $"<b>{U(HeroName[i])}</b>\n<size=13>{U(HeroRole[i])} · HP {MaxHealth[i]:F0} · MP {MaxMana[i]:F0}</size>";
                if (OiyoArcade.Button(new Rect(box.x + 20f, box.y + 60f + i * 82f, cw2 - 40f, 72f), label, i == Hi ? Accent : Slate, 18))
                {
                    hero = (Hero)i; PlayerPrefs.SetInt(Slug + ".hero", i); PlayerPrefs.Save();
                    LoadStage(stageIdx, false);
                }
            }
            return;
        }
        float cw = Mathf.Min(380f, w - 24f);
        var card = new Rect(w * 0.5f - cw * 0.5f, h * 0.5f - 175f, cw, 350f);
        OiyoArcade.Panel(card, Dark);
        OiyoArcade.Shadowed(new Rect(card.x, card.y + 18f, cw, 40f), U("Emberdeep"), 30, new Color(1f, 0.72f, 0.4f), TextAnchor.MiddleCenter);
        OiyoArcade.Text(new Rect(card.x + 20f, card.y + 62f, cw - 40f, 46f), U("Fight down through 30 rooms of the ash fortress with four-hit strings, spells and dodges."), 15, new Color(1f, 1f, 1f, 0.88f), TextAnchor.MiddleCenter);
        OiyoArcade.Text(new Rect(card.x, card.y + 108f, cw, 24f), StageTitle(stageIdx), 15, Gold, TextAnchor.MiddleCenter);
        if (OiyoArcade.Button(new Rect(card.x + 24f, card.y + 140f, cw - 48f, 58f), "<b>▶ " + F("Enter room {0}", stageIdx + 1) + "</b>", Accent, 21)) LoadStage(stageIdx);
        if (OiyoArcade.Button(new Rect(card.x + 24f, card.y + 206f, cw - 48f, 40f), U("Oath") + ": " + U(HeroName[Hi]), Slate, 16)) pickHero = true;
        if (OiyoArcade.Button(new Rect(card.x + 24f, card.y + 252f, cw - 48f, 40f), U("All 30 rooms") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}", Slate, 16)) showStages = true;
        if (OiyoArcade.Button(new Rect(card.x + 24f, card.y + 298f, cw - 48f, 40f), "Aa  " + OiyoArcade.Lang.ToUpperInvariant(), Slate, 16)) OiyoArcade.NextLang();
    }

    void DrawPause(float w, float h)
    {
        float cw = Mathf.Min(340f, w - 24f);
        var card = new Rect(w * 0.5f - cw * 0.5f, h * 0.5f - 130f, cw, 260f);
        OiyoArcade.Panel(card, Dark);
        OiyoArcade.Shadowed(new Rect(card.x, card.y + 16f, cw, 36f), U("Paused"), 26, Color.white, TextAnchor.MiddleCenter);
        if (OiyoArcade.Button(new Rect(card.x + 24f, card.y + 70f, cw - 48f, 52f), "▶ " + U("Resume"), Accent, 19)) state = GameState.Playing;
        if (OiyoArcade.Button(new Rect(card.x + 24f, card.y + 132f, cw - 48f, 46f), U("Restart"), Slate, 17)) LoadStage(stageIdx);
        if (OiyoArcade.Button(new Rect(card.x + 24f, card.y + 188f, cw - 48f, 46f), U("Room list"), Slate, 17)) { LoadStage(stageIdx, false); showStages = true; }
    }

    void DrawResult(float w, float h)
    {
        bool won = state == GameState.Victory;
        float cw = Mathf.Min(360f, w - 24f);
        float ch = 158f + (won ? 58f : 0f) + 52f + 40f + 18f;
        var card = new Rect(w * 0.5f - cw * 0.5f, h * 0.5f - ch * 0.5f, cw, ch);
        OiyoArcade.Panel(card, Dark);
        OiyoArcade.Shadowed(new Rect(card.x, card.y + 14f, cw, 38f), won ? U("Room cleared!") : U("The deep claims another"), won ? 28 : 22, won ? new Color(0.6f, 1f, 0.65f) : new Color(1f, 0.6f, 0.5f), TextAnchor.MiddleCenter);
        string detail = won ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : F("{0} foes still standing", foes - kills);
        OiyoArcade.Text(new Rect(card.x + 16f, card.y + 56f, cw - 32f, 44f), detail, 16, Color.white, TextAnchor.MiddleCenter);
        OiyoArcade.Text(new Rect(card.x + 16f, card.y + 100f, cw - 32f, 52f),
            $"{U("Score")} <b>{score:N0}</b>\n<size=14>{F("{0} felled", kills)} · {F("Longest chain {0}", bestCombo)} · {F("{0} health left", Mathf.CeilToInt(health))}</size>", 16, Color.white, TextAnchor.MiddleCenter);
        float y = card.y + 158f;
        if (won && stageIdx < StageCount - 1)
        {
            if (ResultLive & OiyoArcade.Button(new Rect(card.x + 24f, y, cw - 48f, 50f), "<b>" + U("Next room") + " ▶</b>", Accent, 19)) LoadStage(stageIdx + 1);
            y += 58f;
        }
        else if (won)
        {
            OiyoArcade.Text(new Rect(card.x, y, cw, 50f), "★ " + U("Oath fulfilled: all 30 rooms cleared!") + " ★", 16, Gold, TextAnchor.MiddleCenter);
            y += 58f;
        }
        if (ResultLive & OiyoArcade.Button(new Rect(card.x + 24f, y, cw - 48f, 44f), U("Retry"), won ? Slate : Accent, 17)) LoadStage(stageIdx);
        y += 52f;
        if (ResultLive & OiyoArcade.Button(new Rect(card.x + 24f, y, cw - 48f, 40f), U("Room list"), Slate, 16)) { LoadStage(stageIdx, false); showStages = true; }
    }
}
