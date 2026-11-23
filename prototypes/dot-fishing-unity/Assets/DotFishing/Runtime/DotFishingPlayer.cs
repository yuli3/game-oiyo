using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Dot Fishing: the web Dot Fishing (src/components/games/DotFishing.tsx, src/lib/games/dot-fishing.ts)
// rebuilt in Unity. The 30-species catalog (zone, rarity, size range, value, stamina, struggle rate)
// and the line rules are the web's: a 1.5-4.2 s wait after the cast, a bite you must hook in time,
// then the tension game of stepReelingTick: the fish starts or stops struggling every 0.8-2.2 s
// (chance = its struggle rate); holding the reel raises tension by 28 (55 while it struggles) per s
// divided by the rod's durability, pulls the fish in at 20 x pull power / (1 + stamina share x 0.8)
// and drains 12 x pull power stamina; letting go drops tension by 45 per s while a struggling fish
// with stamina takes back 14 of distance per s. Tension 100 snaps the line, distance 0 lands the fish,
// worth its value x (1 + size share x 0.5). The web's 30 species become 30 trips in catalog order:
// each trip lands a few fish of its zone and ends with that trip's species, on a few baits.
// Stars count the baits you did not waste.
public class DotFishingPlayer : MonoBehaviour
{
    const string Slug = "dot-fishing";
    const int StageCount = 30;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;
    enum Phase { Idle, Waiting, Biting, Reeling, Landed, Lost }
    Phase phase = Phase.Idle;

    public enum Zone { Shallow, Coral, Deep, Abyss }
    public enum Rarity { Common, Uncommon, Rare, Epic, Legendary, Mythic }
    public class Species
    {
        public string id, shape; public string[] names; public Zone zone; public Rarity rarity;
        public float min, max, stamina, struggle; public int value; public Color color;
        public Species(string id, string[] names, Zone zone, Rarity rarity, float min, float max, int value, float stamina, float struggle, string color, string shape)
        {
            this.id = id; this.names = names; this.zone = zone; this.rarity = rarity; this.min = min; this.max = max;
            this.value = value; this.stamina = stamina; this.struggle = struggle; this.shape = shape;
            ColorUtility.TryParseHtmlString(color, out this.color);
        }
        public string Name => names[System.Math.Max(0, System.Array.IndexOf(new[] { "en", "ko", "ja", "zh", "fr", "es" }, OiyoArcade.Lang))];
    }

    // FISH_CATALOG from src/lib/games/dot-fishing.ts (names in en, ko, ja, zh, fr, es)
    static readonly Species[] Catalog =
    {
        new Species("anchovy", new[] { "Anchovy", "멸치", "カタクチイワシ", "凤尾鱼", "Anchois", "Boquerón" }, Zone.Shallow, Rarity.Common, 8f, 15f, 10, 20f, 0.2f, "#94a3b8", "small"),
        new Species("mackerel", new[] { "Mackerel", "고등어", "サバ", "鲭鱼", "Maquereau", "Caballa" }, Zone.Shallow, Rarity.Common, 25f, 45f, 25, 30f, 0.35f, "#38bdf8", "torpedo"),
        new Species("flounder", new[] { "Flounder", "넙치 (광어)", "ヒラメ", "比目鱼", "Flet", "Lenguado" }, Zone.Shallow, Rarity.Uncommon, 30f, 70f, 50, 40f, 0.3f, "#78716c", "flat"),
        new Species("squid", new[] { "Squid", "오징어", "スルメイカ", "鱿鱼", "Calmar", "Calamar" }, Zone.Shallow, Rarity.Uncommon, 20f, 40f, 60, 35f, 0.5f, "#f43f5e", "squid"),
        new Species("sea_bass", new[] { "Sea Bass", "농어", "スズキ", "海鲈鱼", "Bar commun", "Lubina" }, Zone.Shallow, Rarity.Rare, 40f, 90f, 120, 55f, 0.45f, "#cbd5e1", "torpedo"),
        new Species("golden_carp", new[] { "Golden Carp", "황금 잉어", "黄金コイ", "锦鲤金鳞", "Carpe Dorée", "Carpa Dorada" }, Zone.Shallow, Rarity.Epic, 45f, 85f, 350, 65f, 0.6f, "#fbbf24", "round"),
        new Species("shallow_guardian", new[] { "Coast Titan Turtle", "연안의 수호거북", "沿岸の守護亀", "浅海守卫巨龟", "Tortue Gardienne", "Tortuga Guardiana" }, Zone.Shallow, Rarity.Legendary, 110f, 180f, 800, 85f, 0.4f, "#10b981", "turtle"),
        new Species("clownfish", new[] { "Clownfish", "흰동가리", "カクレクマノミ", "小丑鱼", "Poisson-clown", "Pez payaso" }, Zone.Coral, Rarity.Common, 6f, 14f, 30, 25f, 0.3f, "#f97316", "small"),
        new Species("blue_tang", new[] { "Blue Tang", "블루탱", "ナンヨウハギ", "蓝唐王鱼", "Chirurgien bleu", "Cirujano azul" }, Zone.Coral, Rarity.Common, 15f, 30f, 45, 30f, 0.4f, "#2563eb", "round"),
        new Species("parrotfish", new[] { "Parrotfish", "비늘돔 (앵무치)", "ブダイ", "鹦嘴鱼", "Poisson-perroquet", "Pez loro" }, Zone.Coral, Rarity.Uncommon, 30f, 60f, 75, 45f, 0.35f, "#06b6d4", "round"),
        new Species("lionfish", new[] { "Lionfish", "쏠배감펭 (사자고기)", "ミノカサゴ", "狮子鱼", "Poisson-lion", "Pez león" }, Zone.Coral, Rarity.Rare, 20f, 38f, 140, 50f, 0.55f, "#e11d48", "angler"),
        new Species("moray_eel", new[] { "Moray Eel", "곰치", "ウツボ", "海鳝", "Murène", "Morena" }, Zone.Coral, Rarity.Rare, 80f, 150f, 200, 60f, 0.65f, "#854d0e", "eel"),
        new Species("coral_empress", new[] { "Coral Empress", "산호 여제어", "サンゴの女帝", "珊瑚女皇鱼", "Impératrice du Corail", "Emperatriz del Coral" }, Zone.Coral, Rarity.Epic, 50f, 95f, 450, 75f, 0.6f, "#ec4899", "round"),
        new Species("rainbow_manta", new[] { "Rainbow Manta", "무지개 만타가오리", "虹色マンタ", "彩虹蝠鲼", "Manta Arc-en-ciel", "Manta Arcoíris" }, Zone.Coral, Rarity.Legendary, 180f, 320f, 1000, 95f, 0.5f, "#a855f7", "ray"),
        new Species("yellowfin_tuna", new[] { "Yellowfin Tuna", "황다랑어", "キハダマグロ", "黄鳍金枪鱼", "Thon albacore", "Atún de aleta amarilla" }, Zone.Deep, Rarity.Uncommon, 80f, 180f, 180, 70f, 0.6f, "#eab308", "torpedo"),
        new Species("swordfish", new[] { "Swordfish", "황새치", "メカジキ", "剑鱼", "Espadon", "Pez espada" }, Zone.Deep, Rarity.Rare, 150f, 300f, 320, 80f, 0.7f, "#475569", "sword"),
        new Species("hammerhead", new[] { "Hammerhead Shark", "귀상어", "シュモクザメ", "双髻鲨", "Requin-marteau", "Tiburón martillo" }, Zone.Deep, Rarity.Rare, 180f, 350f, 400, 85f, 0.65f, "#64748b", "shark"),
        new Species("bluefin_tuna", new[] { "Giant Bluefin Tuna", "참다랑어 (블루핀)", "クロマグロ", "蓝鳍金枪鱼", "Thon rouge géant", "Atún rojo gigante" }, Zone.Deep, Rarity.Epic, 160f, 280f, 700, 90f, 0.75f, "#1e3a8a", "torpedo"),
        new Species("giant_squid", new[] { "Giant Squid", "대왕오징어", "ダイオウイカ", "大王乌贼", "Calmar géant", "Calamar gigante" }, Zone.Deep, Rarity.Epic, 400f, 900f, 850, 95f, 0.8f, "#be123c", "squid"),
        new Species("oarfish", new[] { "Giant Oarfish", "산갈치", "リュウグウノツカイ", "皇带鱼", "Régalec géant", "Pez remo gigante" }, Zone.Deep, Rarity.Legendary, 300f, 700f, 1200, 100f, 0.6f, "#e2e8f0", "eel"),
        new Species("leviathan_pup", new[] { "Leviathan Spawn", "심해 리바이어던 치어", "リヴァイアサンの幼体", "利维坦幼兽", "Rejeton de Léviathan", "Cría de Leviatán" }, Zone.Deep, Rarity.Legendary, 250f, 480f, 1500, 110f, 0.85f, "#1e293b", "dragon"),
        new Species("anglerfish", new[] { "Abyssal Anglerfish", "초롱아귀", "チョウチンアンコウ", "深海鮟鱇鱼", "Baudroie des abysses", "Pez rape abisal" }, Zone.Abyss, Rarity.Rare, 35f, 75f, 350, 70f, 0.5f, "#581c87", "angler"),
        new Species("viperfish", new[] { "Viperfish", "심해 독사물고기", "ホウライエソ", "蝰鱼", "Poisson-vipère", "Pez víbora" }, Zone.Abyss, Rarity.Rare, 25f, 45f, 400, 65f, 0.7f, "#312e81", "angler"),
        new Species("blobfish", new[] { "Blobfish", "블롭피쉬", "ブロブフィッシュ", "水滴鱼", "Blobfish", "Pez gota" }, Zone.Abyss, Rarity.Rare, 20f, 35f, 380, 50f, 0.25f, "#f472b6", "round"),
        new Species("goblin_shark", new[] { "Goblin Shark", "고블린 상어 (마귀상어)", "ミツクリザメ", "欧氏尖吻鲛", "Requin lutin", "Tiburón duende" }, Zone.Abyss, Rarity.Epic, 200f, 380f, 900, 90f, 0.65f, "#fda4af", "shark"),
        new Species("coelacanth", new[] { "Coelacanth", "실러캔스", "シーラカンス", "腔棘鱼", "Cœlacanthe", "Celacanto" }, Zone.Abyss, Rarity.Legendary, 120f, 200f, 1600, 105f, 0.6f, "#0f766e", "torpedo"),
        new Species("dunkleosteus", new[] { "Dunkleosteus", "던클레오스테우스", "ダンクルオステウス", "邓氏鱼", "Dunkleosteus", "Dunkleosteus" }, Zone.Abyss, Rarity.Legendary, 450f, 750f, 2200, 115f, 0.8f, "#713f12", "shark"),
        new Species("neon_abyss_jelly", new[] { "Neon Abyssal Medusa", "네온 심연 해파리", "深海ネオンクラゲ", "深渊霓虹水母", "Méduse Néon Abyssale", "Medusa Neón Abisal" }, Zone.Abyss, Rarity.Epic, 90f, 170f, 1100, 80f, 0.75f, "#06b6d4", "jelly"),
        new Species("golden_dragonfish", new[] { "Golden Abyssal Dragon", "심연의 황금 용어", "深淵の黄金龍魚", "深渊金龙神鱼", "Dragon Doré Abyssal", "Dragón Dorado Abisal" }, Zone.Abyss, Rarity.Mythic, 300f, 550f, 3500, 120f, 0.9f, "#eab308", "dragon"),
        new Species("cosmic_leviathan", new[] { "Cosmic Leviathan", "우주 심연의 레비아탄", "宇宙深淵のレヴィアタン", "星穹深渊巨兽", "Léviathan Cosmique", "Leviatán Cósmico" }, Zone.Abyss, Rarity.Mythic, 800f, 1500f, 5000, 130f, 0.95f, "#818cf8", "dragon"),
    };

    // ROD_UPGRADES (durability, pull power): the bamboo rod in the shallows, fiberglass beyond
    static readonly string[] RodNames = { "Bamboo Rod", "Fiberglass Rod" };
    static readonly float[] RodDurability = { 1f, 1.25f }, RodPull = { 1f, 1.3f };
    static readonly Dictionary<Rarity, float> Weight = new Dictionary<Rarity, float>
    { { Rarity.Common, 50f }, { Rarity.Uncommon, 30f }, { Rarity.Rare, 14f }, { Rarity.Epic, 5f }, { Rarity.Legendary, 0.9f }, { Rarity.Mythic, 0.1f } };

    // ---------------- Trip ----------------
    int stageIdx;
    Species target;
    int quota, baitMax, baitLeft, landed, snaps, wasted, gold, rod, newInBook;
    float biteWindow;
    System.Random rng;

    // line state (FishingGameState / FishBiteInfo)
    float tension, distance, timer, staminaMax, staminaCur, struggleTimer, size;
    bool struggling, reelHeld;
    Species hooked;
    float phaseT, msgT; string msg = "";
    Species lastCatch; float lastSize; int lastValue; bool lastNew;

    // ---------------- Scene ----------------
    Camera cam;
    Transform root, boat, bobber, fishT, rodT;
    Renderer fishR, seaR;
    LineRenderer line;
    readonly Dictionary<string, Material> fishMats = new Dictionary<string, Material>();
    readonly Dictionary<string, Texture2D> shapes = new Dictionary<string, Texture2D>();
    Material seaMat;
    Bursts bursts;
    Synth synth;
    bool showStages;
    float halfW = 4f;
    const float Ppu = 0.06f;   // world units per art pixel

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        cam = new GameObject("Camera").AddComponent<Camera>();
        cam.orthographic = true;
        cam.clearFlags = CameraClearFlags.SolidColor;
        cam.transform.position = new Vector3(0f, -3.4f, -20f);
        bursts = new Bursts(transform, 1.2f);
        synth = new Synth(gameObject);
        foreach (var s in new[] { "small", "torpedo", "flat", "squid", "turtle", "ray", "eel", "shark", "sword", "angler", "jelly", "dragon", "round" })
            shapes[s] = Pixel("DF/fish_" + s);
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        LoadStage(stageIdx, false);
    }

    static Texture2D Pixel(string path)
    {
        var t = OiyoArcade.Art(path);
        if (t != null) t.filterMode = FilterMode.Point;
        return t;
    }

    static int RodFor(int i) => Catalog[i].zone == Zone.Shallow ? 0 : 1;

    void LoadStage(int idx, bool ready = true)
    {
        stageIdx = Mathf.Clamp(idx, 0, StageCount - 1);
        StopAllCoroutines();
        target = Catalog[stageIdx];
        rod = RodFor(stageIdx);
        quota = 2 + stageIdx / 10;
        baitMax = quota + 2; baitLeft = baitMax;
        landed = snaps = wasted = gold = newInBook = 0;
        biteWindow = Mathf.Lerp(2.5f, 1.3f, stageIdx / 29f);
        rng = new System.Random(19930711 + stageIdx * 7919);
        phase = Phase.Idle; phaseT = 0f; msgT = 0f; hooked = null; lastCatch = null;
        tension = 0f; distance = 100f; reelHeld = false;
        showStages = false;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
    }

    static readonly Color[] SkyTop = { new Color(0.53f, 0.82f, 1f), new Color(0.6f, 0.88f, 0.98f), new Color(0.98f, 0.66f, 0.45f), new Color(0.1f, 0.08f, 0.24f) };
    static readonly Color[] SeaTop = { new Color(0.36f, 0.78f, 0.9f), new Color(0.23f, 0.7f, 0.79f), new Color(0.11f, 0.31f, 0.54f), new Color(0.06f, 0.1f, 0.24f) };
    static readonly Color[] SeaBot = { new Color(0.1f, 0.43f, 0.6f), new Color(0.07f, 0.35f, 0.48f), new Color(0.03f, 0.1f, 0.23f), new Color(0.01f, 0.015f, 0.05f) };
    static readonly float[] ZoneDepth = { -3f, -4.6f, -6.4f, -8.2f };

    float Depth => ZoneDepth[(int)target.zone];
    float BoatX => -halfW + (halfW < 6f ? 1.9f : 3.2f);
    Vector3 RodTip => new Vector3(BoatX + 1.75f, 1.75f, -0.2f);
    float CastX => BoatX + Mathf.Min(halfW * 2f - 4.2f, 8.5f);

    void BuildScene()
    {
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Sea").transform;
        int z = (int)target.zone;
        cam.backgroundColor = SkyTop[z];
        var grad = new Texture2D(1, 64, TextureFormat.RGBA32, false) { wrapMode = TextureWrapMode.Clamp, filterMode = FilterMode.Bilinear };
        for (int y = 0; y < 64; y++) grad.SetPixel(0, y, Color.Lerp(SeaBot[z], SeaTop[z], y / 63f));
        grad.Apply();
        seaMat = OiyoArcade.Textured(grad);
        var sea = OiyoArcade.Prim(PrimitiveType.Quad, "Water", seaMat, root);
        sea.transform.position = new Vector3(0f, -6.5f, 1f);
        sea.transform.localScale = new Vector3(80f, 13f, 1f);
        seaR = sea.GetComponent<Renderer>();
        var wavesMat = OiyoArcade.Transparent(Pixel("DF/wave"), new Color(1f, 1f, 1f, 0.9f));
        wavesMat.mainTexture.wrapMode = TextureWrapMode.Repeat;
        wavesMat.mainTextureScale = new Vector2(40f, 1f);
        var waves = OiyoArcade.Prim(PrimitiveType.Quad, "Waves", wavesMat, root);
        waves.transform.position = new Vector3(0f, 0.02f, 0.5f);
        waves.transform.localScale = new Vector3(80f, 0.5f, 1f);
        var bedMat = OiyoArcade.Transparent(Pixel("DF/seabed"), z == 3 ? new Color(0.45f, 0.42f, 0.5f) : z == 2 ? new Color(0.7f, 0.66f, 0.6f) : Color.white);
        bedMat.mainTexture.wrapMode = TextureWrapMode.Repeat;
        bedMat.mainTextureScale = new Vector2(20f, 1f);
        var bed = OiyoArcade.Prim(PrimitiveType.Quad, "Seabed", bedMat, root);
        bed.transform.position = new Vector3(0f, -10.5f, 0.6f);
        bed.transform.localScale = new Vector3(80f, 2.4f, 1f);
        if (z < 2)
        {
            var cloudMat = OiyoArcade.Transparent(Pixel("DF/cloud"), Color.white);
            for (int i = 0; i < 5; i++)
            {
                var c = OiyoArcade.Prim(PrimitiveType.Quad, "Cloud", cloudMat, root);
                c.transform.position = new Vector3(-14f + i * 7f, 2.4f + (i % 2) * 0.9f, 1.2f);
                c.transform.localScale = new Vector3(48f * Ppu * 1.4f, 20f * Ppu * 1.4f, 1f);
            }
        }
        else
        {
            // stars over the deep and the abyss
            var star = OiyoArcade.Glow(new Color(1f, 1f, 0.9f));
            var rs = new System.Random(z);
            for (int i = 0; i < 40; i++)
            {
                var s = OiyoArcade.Prim(PrimitiveType.Quad, "Star", star, root);
                s.transform.position = new Vector3(-18f + (float)rs.NextDouble() * 36f, 0.6f + (float)rs.NextDouble() * 3.6f, 1.2f);
                s.transform.localScale = Vector3.one * 0.06f;
            }
        }
        // abyss glows: drifting lights in the dark water
        if (z == 3)
        {
            var rs = new System.Random(77);
            for (int i = 0; i < 18; i++)
            {
                var g = OiyoArcade.GlowQuad("Glow", OiyoArcade.Hsv(0.5f + (float)rs.NextDouble() * 0.3f, 0.6f, 1f) * new Color(1, 1, 1, 0.5f), 0.4f + (float)rs.NextDouble() * 0.5f, root);
                g.transform.position = new Vector3(-16f + (float)rs.NextDouble() * 32f, -1.5f - (float)rs.NextDouble() * 9f, 0.8f);
            }
        }
        boat = OiyoArcade.Prim(PrimitiveType.Quad, "Boat", OiyoArcade.Transparent(Pixel("DF/boat"), Color.white), root).transform;
        boat.localScale = new Vector3(64f * Ppu, 32f * Ppu, 1f);
        rodT = OiyoArcade.Prim(PrimitiveType.Cube, "Rod", OiyoArcade.Glow(new Color(0.42f, 0.28f, 0.16f)), root).transform;
        bobber = OiyoArcade.Prim(PrimitiveType.Quad, "Bobber", OiyoArcade.Transparent(Pixel("DF/bobber"), Color.white), root).transform;
        bobber.localScale = new Vector3(12f * Ppu, 20f * Ppu, 1f);
        fishT = OiyoArcade.Prim(PrimitiveType.Quad, "Fish", OiyoArcade.Transparent(shapes["small"], Color.white), root).transform;
        fishR = fishT.GetComponent<Renderer>();
        line = new GameObject("Line").AddComponent<LineRenderer>();
        line.transform.SetParent(root, false);
        line.material = OiyoArcade.Glow(new Color(0.95f, 0.95f, 0.95f));
        line.widthMultiplier = 0.035f;
        line.positionCount = 3;
        line.useWorldSpace = true;
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("dot-fishing", state, gold);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        FitCamera();
        ReadInput();
        if (state == GameState.Playing) Step(dt);
        msgT = Mathf.Max(0f, msgT - dt);
        Animate(dt);
    }

    void FitCamera()
    {
        // sky above the surface for the HUD, the whole water column below
        float top = 3.8f, bottom = -11.2f;
        float size = (top - bottom) * 0.5f;
        halfW = size * cam.aspect;
        if (halfW < 3.9f) { size = 3.9f / cam.aspect; halfW = 3.9f; }
        cam.orthographicSize = size;
        cam.transform.position = new Vector3(0f, (top + bottom) * 0.5f + (size - (top - bottom) * 0.5f) * 0.4f, -20f);
    }

    Rect ReelButton(float w, float h)
    {
        // bottom right, clear of the page's full-window exit button in the bottom-left corner
        float s = Mathf.Clamp(Mathf.Min(w, h) * 0.26f, 84f, 120f);
        return new Rect(w - s - 16f, h - s - 22f, s, s);
    }

    bool HeldIn(Rect r)
    {
        foreach (var p in OiyoArcade.Held()) if (r.Contains(OiyoArcade.ToGui(p.pos))) return true;
        return false;
    }

    bool AnyHeldOnWater()
    {
        foreach (var p in OiyoArcade.Held()) if (!OiyoArcade.OverUi(p.pos)) return true;
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
                    var began = OiyoArcade.Began();
                    bool press = began.Count > 0 || Input.GetKeyDown(KeyCode.Space) || Input.GetKeyDown(KeyCode.Return);
                    if (state == GameState.Ready && (press || Input.anyKeyDown)) { state = GameState.Playing; press = true; }
                    var rb = ReelButton(OiyoArcade.W, OiyoArcade.H);
                    reelHeld = Input.GetKey(KeyCode.Space) || Input.GetKey(KeyCode.Return) || AnyHeldOnWater() || HeldIn(rb);
                    if (press || tapButton) Act();
                    tapButton = false;
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
    bool tapButton;

    // one tap: cast, strike too early, or hook the bite
    void Act()
    {
        switch (phase)
        {
            case Phase.Idle:
            case Phase.Landed:
            case Phase.Lost:
                if (landed >= quota || (phase != Phase.Idle && phaseT < 0.5f)) return;
                Cast();
                break;
            case Phase.Waiting:
                // striking before the bite spooks the fish: the bait is gone
                Waste(U("Too early! The fish got spooked"));
                break;
            case Phase.Biting:
                Hook();
                break;
        }
    }

    void Cast()
    {
        if (baitLeft <= 0) return;
        baitLeft--;
        phase = Phase.Waiting; phaseT = 0f;
        timer = 1.5f + (float)rng.NextDouble() * 2.7f;           // startCast: 1500..4200 ms
        tension = 15f; distance = 100f; hooked = null;
        synth.Tone(520f, 0.2f, Wave.Triangle, 0.12f, 260f, 6f);
        bursts.Emit(new Vector3(CastX, 0f, 0f), new Color(0.85f, 0.97f, 1f), 10, 2.5f, 0.12f, 0.5f, new Vector3(0f, 2f, 0f));
    }

    // triggerBite: everyday fish of the zone bite first (weighted by rarity as on the web); the last bite is the trip's fish
    void Bite()
    {
        Species pick;
        if (landed >= quota - 1) pick = target;
        else
        {
            var pool = new List<Species>(); var w = new List<float>(); float tot = 0f;
            foreach (var s in Catalog)
                if (s.zone == target.zone && s != target && s.rarity <= Rarity.Rare)
                { pool.Add(s); float x = Weight[s.rarity]; w.Add(x); tot += x; }
            if (pool.Count == 0) pick = target;
            else
            {
                double r = rng.NextDouble() * tot; pick = pool[pool.Count - 1];
                for (int i = 0; i < pool.Count; i++) { r -= w[i]; if (r <= 0) { pick = pool[i]; break; } }
            }
        }
        hooked = pick;
        size = Mathf.Round(Mathf.Lerp(pick.min, pick.max, (float)rng.NextDouble()) * 10f) / 10f;
        staminaMax = staminaCur = pick.stamina;
        struggleTimer = 0f; struggling = false;
        phase = Phase.Biting; phaseT = 0f; timer = biteWindow;
        synth.Tone(880f, 0.08f, Wave.Square, 0.12f, 0f, 20f);
        synth.Tone(1175f, 0.1f, Wave.Square, 0.1f, 0f, 20f);
        bursts.Emit(new Vector3(CastX, 0f, 0f), Color.white, 12, 3f, 0.14f, 0.4f, new Vector3(0f, 2f, 0f));
    }

    void Hook()
    {
        phase = Phase.Reeling; phaseT = 0f;
        tension = 35f; distance = 100f;                         // hookFish
        Toast(F("Hooked: {0}!", hooked.Name));
        synth.Tone(330f, 0.18f, Wave.Saw, 0.14f, 660f, 8f);
    }

    void Waste(string why)
    {
        wasted++;
        phase = Phase.Lost; phaseT = 0f; hooked = null;
        Toast(why);
        synth.Tone(200f, 0.3f, Wave.Triangle, 0.14f, 120f, 6f);
        CheckOut();
    }

    void CheckOut()
    {
        if (baitLeft <= 0 && landed < quota && phase != Phase.Waiting && phase != Phase.Biting && phase != Phase.Reeling) End(false);
    }

    void Step(float dt)
    {
        phaseT += dt;
        switch (phase)
        {
            case Phase.Waiting:
                timer -= dt;
                if (timer <= 0f) Bite();
                break;
            case Phase.Biting:
                timer -= dt;
                if (timer <= 0f) Waste(U("Too late! It stole the bait"));
                break;
            case Phase.Reeling:
                Reel(dt);
                break;
            case Phase.Landed:
                if (phaseT > 1.4f && landed >= quota) End(true);
                break;
        }
    }

    // stepReelingTick from the web
    void Reel(float dt)
    {
        float dur = RodDurability[rod], pull = RodPull[rod];
        struggleTimer -= dt;
        if (struggleTimer <= 0f)
        {
            struggling = rng.NextDouble() < hooked.struggle;
            struggleTimer = 0.8f + (float)rng.NextDouble() * 1.4f;
        }
        if (reelHeld)
        {
            tension += (struggling ? 55f : 28f) / dur * dt;
            distance -= 20f * pull / (1f + staminaCur / hooked.stamina * 0.8f) * dt;
            staminaCur = Mathf.Max(0f, staminaCur - 12f * pull * dt);
        }
        else
        {
            tension = Mathf.Max(10f, tension - 45f * dt);
            if (struggling && staminaCur > 0f) distance = Mathf.Min(100f, distance + 14f * dt);
        }
        if (struggling && Random.value < dt * 10f) bursts.Emit(FishPos(), new Color(0.85f, 0.97f, 1f, 0.8f), 1, 1.5f, 0.1f, 0.4f);
        if (tension >= 100f)
        {
            snaps++;
            tension = 0f;
            Waste(U("Snap! The line broke"));
            return;
        }
        if (distance <= 0f) Land();
    }

    void Land()
    {
        var f = hooked;
        float share = (size - f.min) / Mathf.Max(0.01f, f.max - f.min);
        int value = Mathf.RoundToInt(f.value * (1f + share * 0.5f));
        gold += value; landed++;
        string key = Slug + ".book." + f.id;
        lastNew = PlayerPrefs.GetInt(key, 0) == 0;
        if (lastNew) newInBook++;
        PlayerPrefs.SetInt(key, Mathf.Max(PlayerPrefs.GetInt(key, 0), Mathf.RoundToInt(size * 10f)));
        PlayerPrefs.Save();
        lastCatch = f; lastSize = size; lastValue = value;
        phase = Phase.Landed; phaseT = 0f;
        tension = 0f;
        bursts.Emit(RodTip + new Vector3(0.4f, -1f, 0f), f.color, 24, 4f, 0.2f, 0.7f, new Vector3(0f, 3f, 0f));
        bursts.Emit(RodTip + new Vector3(0.4f, -1f, 0f), new Color(1f, 0.85f, 0.3f), 14, 3f, 0.15f, 0.6f, new Vector3(0f, 3f, 0f));
        StartCoroutine(Arp(f == target ? new[] { 523f, 659f, 784f, 1047f } : new[] { 659f, 880f }, 0.08f));
        if (landed >= quota) { hooked = null; return; }
        hooked = null;
        CheckOut();
    }

    void Toast(string s) { msg = s; msgT = 1.6f; }

    float endTime;
    // the press that lands the last fish must not also press a result button under the finger
    bool ResultLive => Time.unscaledTime - endTime > 0.45f;

    int starsWon;
    void End(bool won)
    {
        if (state != GameState.Playing) return;
        endTime = Time.unscaledTime;
        if (won)
        {
            starsWon = wasted == 0 ? 3 : wasted == 1 ? 2 : 1;
            gold += baitLeft * 50;
            state = GameState.Victory;
            OiyoArcade.Record(Slug, stageIdx, starsWon, gold, StageCount);
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
        foreach (var f in fs) { synth.Tone(f, 0.16f, Wave.Square, 0.14f, 0f, 8f); yield return new WaitForSeconds(gap); }
    }

    Vector3 FishPos()
    {
        float k = distance / 100f;
        var near = new Vector3(BoatX + 2f, -0.7f, 0f);
        var far = new Vector3(CastX, Depth, 0f);
        var p = Vector3.Lerp(near, far, k);
        if (struggling) p += new Vector3(Mathf.Sin(Time.time * 23f) * 0.22f, Mathf.Sin(Time.time * 17f) * 0.12f, 0f);
        return p;
    }

    void Animate(float dt)
    {
        float t = Time.time;
        boat.position = new Vector3(BoatX, 0.55f + Mathf.Sin(t * 1.4f) * 0.06f, 0f);
        boat.localRotation = Quaternion.Euler(0f, 0f, Mathf.Sin(t * 1.1f) * 2f);
        var hand = new Vector3(BoatX + 0.55f, 0.95f, -0.1f);
        var tip = RodTip + new Vector3(0f, Mathf.Sin(t * 1.4f) * 0.06f, 0f);
        if (phase == Phase.Reeling) tip += new Vector3(-0.1f, -tension / 100f * 0.5f, 0f);
        rodT.position = (hand + tip) * 0.5f;
        rodT.localRotation = Quaternion.FromToRotation(Vector3.right, tip - hand);
        rodT.localScale = new Vector3((tip - hand).magnitude, 0.06f, 0.06f);
        bool lineOut = state != GameState.Menu && (phase == Phase.Waiting || phase == Phase.Biting || phase == Phase.Reeling);
        line.enabled = lineOut;
        bobber.gameObject.SetActive(lineOut && phase != Phase.Reeling);
        var bob = new Vector3(CastX, 0.15f + Mathf.Sin(t * 2f) * 0.05f, -0.1f);
        if (phase == Phase.Biting) bob += new Vector3(0f, -0.18f - Mathf.Abs(Mathf.Sin(t * 18f)) * 0.22f, 0f);
        bobber.position = bob;
        var hookAt = phase == Phase.Reeling ? FishPos() : new Vector3(CastX, Depth, 0f);
        if (lineOut)
        {
            line.SetPosition(0, tip);
            line.SetPosition(1, phase == Phase.Reeling ? Vector3.Lerp(tip, hookAt, 0.5f) : bob);
            line.SetPosition(2, hookAt);
            line.material.color = phase == Phase.Reeling ? Color.Lerp(Color.white, new Color(1f, 0.3f, 0.25f), Mathf.Clamp01((tension - 60f) / 40f)) : new Color(0.95f, 0.95f, 0.95f);
        }
        // the fish on the line, or the one just landed held up over the boat
        var show = phase == Phase.Reeling ? hooked : phase == Phase.Landed ? lastCatch : (phase == Phase.Biting ? hooked : null);
        fishT.gameObject.SetActive(show != null);
        if (show != null)
        {
            var tex = shapes[show.shape];
            if (!fishMats.TryGetValue(show.id, out var m)) { m = OiyoArcade.Transparent(tex, show.color); fishMats[show.id] = m; }
            fishR.sharedMaterial = m;
            // log-scaled size so a 1500 cm leviathan still fits on screen
            float len = Mathf.Clamp(0.6f + Mathf.Log10(Mathf.Max(5f, phase == Phase.Landed ? lastSize : size)) * 0.55f, 1f, 2.6f);
            float aspect = tex.height / (float)tex.width;
            if (phase == Phase.Landed)
            {
                fishT.position = RodTip + new Vector3(0.2f, -0.6f + Mathf.Min(1f, phaseT * 3f) * 0.6f, -0.3f);
                fishT.localRotation = Quaternion.Euler(0f, 0f, 90f + Mathf.Sin(t * 12f) * 12f);
            }
            else if (phase == Phase.Biting)
            {
                fishT.position = new Vector3(CastX + 0.5f, Depth - 0.2f, 0f);
                fishT.localRotation = Quaternion.Euler(0f, 0f, Mathf.Sin(t * 20f) * 10f);
                fishT.localScale = new Vector3(-len, len * aspect, 1f);
            }
            else
            {
                fishT.position = FishPos() + new Vector3(0.45f, 0f, 0f);
                // swims away from the boat; faces it while being pulled in calmly
                fishT.localRotation = Quaternion.Euler(0f, 0f, Mathf.Sin(t * (struggling ? 30f : 8f)) * 8f);
            }
            // sprites face right: a struggling fish swims away from the boat, a tired one is pulled in head first
            if (phase == Phase.Reeling) fishT.localScale = new Vector3(struggling ? len : -len, len * aspect, 1f);
            else if (phase == Phase.Landed) fishT.localScale = new Vector3(len, len * aspect, 1f);
            if (phase == Phase.Biting) fishR.sharedMaterial.color = new Color(show.color.r, show.color.g, show.color.b, 0.35f);
            else fishR.sharedMaterial.color = show.color;
        }
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
        var sea = cam.WorldToScreenPoint(new Vector3(0f, -5f, 0f));
        return $"{{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"phase\":\"{phase}\",\"score\":{gold},\"tension\":{tension:F0},\"dist\":{distance:F0},\"strug\":{(struggling ? 1 : 0)},\"reel\":{(reelHeld ? 1 : 0)},\"bait\":{baitLeft},\"landed\":{landed},\"quota\":{quota},\"wasted\":{wasted},\"sea\":[{sea.x:F0},{sea.y:F0}],\"sw\":{Screen.width},\"sh\":{Screen.height}}}";
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.95f, 0.42f, 0.3f, 0.97f);
    static readonly Color Dark = new Color(0.04f, 0.08f, 0.16f, 0.86f);
    static readonly Color Gold = new Color(1f, 0.82f, 0.25f, 0.97f);
    static readonly Color Slate = new Color(0.15f, 0.25f, 0.4f, 0.95f);
    static readonly Color Sea = new Color(0.2f, 0.62f, 0.85f, 0.97f);

    static readonly string[] ZoneNames = { "Shallow Coast", "Coral Reef", "Deep Sea", "Abyssal Trench" };
    string StageTitle(int i) => F("Trip {0}", i + 1) + " · " + U(ZoneNames[(int)Catalog[i].zone]);
    int BookCount() { int n = 0; foreach (var s in Catalog) if (PlayerPrefs.GetInt(Slug + ".book." + s.id, 0) > 0) n++; return n; }

    void OnGUI()
    {
        OiyoArcade.Begin();
        float w = OiyoArcade.W, h = OiyoArcade.H;
        if (state == GameState.Menu) { DrawMenu(w, h); return; }
        var bar = new Rect(8f, 8f, w - 16f, 78f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 12f, w - 140f, 22f), "<b>" + StageTitle(stageIdx) + "</b>  <size=13><color=#9fd8ff>" + U(RodNames[rod]) + "</color></size>", 15, new Color(0.85f, 0.95f, 1f));
        OiyoArcade.Text(new Rect(20f, 34f, w - 90f, 24f), $"{U("Target")} <b><color=#ffd54a>{target.Name}</color></b>", 15, Color.white);
        OiyoArcade.Text(new Rect(20f, 56f, w - 90f, 24f), $"{U("Fish")} <b>{landed}/{quota}</b>   {U("Bait")} <b>{baitLeft}</b>   {U("Gold")} <b>{gold:N0}</b>", 15, Color.white);
        if (OiyoArcade.Button(new Rect(w - 64f, 14f, 46f, 46f), "<b>II</b>", Slate, 18))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (msgT > 0f) OiyoArcade.Shadowed(new Rect(8f, 92f, w - 16f, 40f), msg, w < 520f ? 16 : 20, Gold, TextAnchor.MiddleCenter);
        if (state == GameState.Playing || state == GameState.Ready)
        {
            string hint = phase == Phase.Waiting ? U("Wait for the bite...")
                : phase == Phase.Biting ? "<color=#ff6a5a><b>" + U("BITE! Tap now!") + "</b></color>"
                : phase == Phase.Reeling ? (struggling ? "<color=#ff9a7a>" + U("It's fighting! Ease off the reel") + "</color>" : U("Hold to reel it in"))
                : phase == Phase.Landed ? (lastCatch != null ? $"<color=#ffd54a>{lastCatch.Name}</color> {lastSize:0.#} cm  +{lastValue}G" + (lastNew ? "  <color=#7dffb0>" + U("New in your fish book!") + "</color>" : "") : "")
                : U("Tap the sea to cast");
            OiyoArcade.Shadowed(new Rect(8f, 132f, w - 16f, 30f), hint, w < 520f ? 15 : 18, Color.white, TextAnchor.MiddleCenter);
            if (phase == Phase.Reeling) DrawGauges(w, h);
            var rb = ReelButton(w, h);
            string label = phase == Phase.Reeling ? $"<b>{U("REEL")}</b>\n<size=12>{U("hold")}</size>" : phase == Phase.Biting ? $"<b>{U("HOOK")}</b>" : $"<b>{U("CAST")}</b>";
            if (OiyoArcade.Button(rb, label, phase == Phase.Biting ? Accent : Sea, 20)) tapButton = phase != Phase.Reeling;
        }
        if (state == GameState.Ready)
        {
            float cw = Mathf.Min(340f, w - 24f);
            var r = new Rect(w * 0.5f - cw * 0.5f, h * 0.5f - 60f, cw, 120f);
            OiyoArcade.Panel(r, Dark);
            OiyoArcade.Text(new Rect(r.x + 12f, r.y + 6f, r.width - 24f, r.height - 12f),
                $"<b>{F("Land {0} fish. The last one is the {1}.", quota, target.Name)}</b>\n<size=13>{F("{0} baits. Tap to cast, tap again when it bites, then hold to reel and let go when it fights.", baitMax)}</size>", 15, Color.white, TextAnchor.MiddleCenter);
        }
        if (state == GameState.Paused) DrawPause(w, h);
        if (state == GameState.Victory || state == GameState.GameOver) DrawResult(w, h);
    }

    void DrawGauges(float w, float h)
    {
        // tension (red past 75), distance to the boat, and the fish's stamina
        float gx = 16f, gw = Mathf.Min(260f, w - 160f), gy = h - 150f;
        if (gy < 200f) gy = 200f;
        OiyoArcade.Panel(new Rect(gx - 6f, gy - 8f, gw + 12f, 104f), Dark);
        Color tc = tension > 75f ? new Color(1f, 0.3f, 0.25f) : tension > 50f ? new Color(1f, 0.78f, 0.3f) : new Color(0.45f, 0.95f, 0.5f);
        OiyoArcade.Text(new Rect(gx, gy - 4f, gw, 18f), $"{U("Tension")} <b>{tension:F0}</b>", 13, Color.white);
        OiyoArcade.Bar(new Rect(gx, gy + 14f, gw, 12f), tension / 100f, new Color(0f, 0f, 0f, 0.5f), tc);
        OiyoArcade.Fill(new Rect(gx + gw * 0.75f, gy + 14f, 2f, 12f), new Color(1f, 1f, 1f, 0.6f));
        OiyoArcade.Text(new Rect(gx, gy + 28f, gw, 18f), $"{U("Distance")} <b>{distance:F0} m</b>", 13, Color.white);
        OiyoArcade.Bar(new Rect(gx, gy + 46f, gw, 8f), 1f - distance / 100f, new Color(0f, 0f, 0f, 0.5f), new Color(0.5f, 0.85f, 1f));
        OiyoArcade.Text(new Rect(gx, gy + 56f, gw, 18f), $"{U("Stamina")}" + (struggling ? "  <color=#ff8a70><b>" + U("FIGHTING") + "</b></color>" : ""), 13, Color.white);
        OiyoArcade.Bar(new Rect(gx, gy + 74f, gw, 8f), staminaCur / Mathf.Max(1f, staminaMax), new Color(0f, 0f, 0f, 0.5f), new Color(1f, 0.6f, 0.3f));
    }

    void DrawMenu(float w, float h)
    {
        if (showStages)
        {
            float bw = Mathf.Min(w - 16f, 760f);
            var box = new Rect(w * 0.5f - bw * 0.5f, 12f, bw, Mathf.Min(h - 24f, 520f));
            OiyoArcade.Panel(box, new Color(0.04f, 0.08f, 0.16f, 0.95f));
            OiyoArcade.Text(new Rect(box.x + 16f, box.y + 12f, box.width - 120f, 30f), "<b>" + U("Choose a trip") + "</b>", 20, Color.white);
            OiyoArcade.Text(new Rect(box.x + 16f, box.y + 40f, box.width - 32f, 22f), $"★ {OiyoArcade.TotalStars(Slug, StageCount)}/{StageCount * 3}   " + F("Fish book {0}/30", BookCount()), 15, Gold);
            if (OiyoArcade.Button(new Rect(box.xMax - 100f, box.y + 12f, 86f, 40f), U("Back"), Slate, 16)) showStages = false;
            int pick = OiyoArcade.StageGrid(new Rect(box.x + 14f, box.y + 70f, box.width - 28f, box.height - 84f), Slug, StageCount, Accent, U("Trip"));
            if (pick >= 0) LoadStage(pick);
            return;
        }
        float cw = Mathf.Min(380f, w - 24f);
        var card = new Rect(w * 0.5f - cw * 0.5f, h * 0.5f - 175f, cw, 350f);
        OiyoArcade.Panel(card, Dark);
        OiyoArcade.Shadowed(new Rect(card.x, card.y + 18f, cw, 40f), U("Dot Fishing"), 30, new Color(0.7f, 0.92f, 1f), TextAnchor.MiddleCenter);
        OiyoArcade.Text(new Rect(card.x + 20f, card.y + 62f, cw - 40f, 46f), U("Cast, hook the bite and win the tug of war: 30 trips from the shallows to the abyss."), 15, new Color(1f, 1f, 1f, 0.88f), TextAnchor.MiddleCenter);
        OiyoArcade.Text(new Rect(card.x, card.y + 108f, cw, 24f), StageTitle(stageIdx) + " · " + Catalog[stageIdx].Name, 15, Gold, TextAnchor.MiddleCenter);
        OiyoArcade.Text(new Rect(card.x, card.y + 130f, cw, 20f), F("Fish book {0}/30", BookCount()), 13, new Color(0.7f, 0.9f, 1f), TextAnchor.MiddleCenter);
        if (OiyoArcade.Button(new Rect(card.x + 24f, card.y + 154f, cw - 48f, 58f), "<b>▶ " + F("Start trip {0}", stageIdx + 1) + "</b>", Accent, 21)) LoadStage(stageIdx);
        if (OiyoArcade.Button(new Rect(card.x + 24f, card.y + 222f, cw - 48f, 46f), U("All 30 trips") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}", Slate, 17)) showStages = true;
        if (OiyoArcade.Button(new Rect(card.x + 24f, card.y + 278f, cw - 48f, 46f), "Aa  " + OiyoArcade.Lang.ToUpperInvariant(), Slate, 17)) OiyoArcade.NextLang();
    }

    void DrawPause(float w, float h)
    {
        float cw = Mathf.Min(340f, w - 24f);
        var card = new Rect(w * 0.5f - cw * 0.5f, h * 0.5f - 130f, cw, 260f);
        OiyoArcade.Panel(card, Dark);
        OiyoArcade.Shadowed(new Rect(card.x, card.y + 16f, cw, 36f), U("Paused"), 26, Color.white, TextAnchor.MiddleCenter);
        if (OiyoArcade.Button(new Rect(card.x + 24f, card.y + 70f, cw - 48f, 52f), "▶ " + U("Resume"), Accent, 19)) state = GameState.Playing;
        if (OiyoArcade.Button(new Rect(card.x + 24f, card.y + 132f, cw - 48f, 46f), U("Restart"), Slate, 17)) LoadStage(stageIdx);
        if (OiyoArcade.Button(new Rect(card.x + 24f, card.y + 188f, cw - 48f, 46f), U("Trip list"), Slate, 17)) { LoadStage(stageIdx, false); showStages = true; }
    }

    void DrawResult(float w, float h)
    {
        bool won = state == GameState.Victory;
        float cw = Mathf.Min(360f, w - 24f);
        float ch = 158f + (won ? 58f : 0f) + 52f + 40f + 18f;
        var card = new Rect(w * 0.5f - cw * 0.5f, h * 0.5f - ch * 0.5f, cw, ch);
        OiyoArcade.Panel(card, Dark);
        OiyoArcade.Shadowed(new Rect(card.x, card.y + 14f, cw, 38f), won ? U("Trip complete!") : U("Out of bait!"), 28, won ? new Color(0.6f, 1f, 0.65f) : new Color(1f, 0.6f, 0.5f), TextAnchor.MiddleCenter);
        string detail = won ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : F("{0} more fish needed", quota - landed);
        OiyoArcade.Text(new Rect(card.x + 16f, card.y + 56f, cw - 32f, 44f), detail, 16, Color.white, TextAnchor.MiddleCenter);
        OiyoArcade.Text(new Rect(card.x + 16f, card.y + 100f, cw - 32f, 52f),
            $"{U("Gold")} <b>{gold:N0}</b>\n<size=13>{F("{0} baits wasted", wasted)} · {F("{0} snapped lines", snaps)} · {F("{0} new in the book", newInBook)}</size>", 16, Color.white, TextAnchor.MiddleCenter);
        float y = card.y + 158f;
        if (won && stageIdx < StageCount - 1)
        {
            if (ResultLive & OiyoArcade.Button(new Rect(card.x + 24f, y, cw - 48f, 50f), "<b>" + U("Next trip") + " ▶</b>", Accent, 19)) LoadStage(stageIdx + 1);
            y += 58f;
        }
        else if (won)
        {
            OiyoArcade.Text(new Rect(card.x, y, cw, 50f), "★ " + U("You finished all 30 trips!") + " ★", 17, Gold, TextAnchor.MiddleCenter);
            y += 58f;
        }
        if (ResultLive & OiyoArcade.Button(new Rect(card.x + 24f, y, cw - 48f, 44f), U("Retry"), won ? Slate : Accent, 17)) LoadStage(stageIdx);
        y += 52f;
        if (ResultLive & OiyoArcade.Button(new Rect(card.x + 24f, y, cw - 48f, 40f), U("Trip list"), Slate, 16)) { LoadStage(stageIdx, false); showStages = true; }
    }
}
