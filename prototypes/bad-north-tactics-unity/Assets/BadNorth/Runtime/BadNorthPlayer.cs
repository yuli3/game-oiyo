using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class BadNorthPlayer : MonoBehaviour
{
    public enum Language { KO, EN, JA, ES }
    private Language currentLang = Language.KO;

    public class LocalizedText
    {
        public string ko;
        public string en;
        public string ja;
        public string es;

        public LocalizedText(string ko, string en, string ja, string es)
        {
            this.ko = ko;
            this.en = en;
            this.ja = ja;
            this.es = es;
        }

        public string Get(Language lang)
        {
            switch (lang)
            {
                case Language.KO: return ko;
                case Language.EN: return en;
                case Language.JA: return ja;
                case Language.ES: return es;
                default: return en;
            }
        }
    }

    public enum SquadType { Swordsmen, Archers, Pikemen }
    public enum RaiderType { Militia, ShieldBearer, Berserker, JarlWarlord }

    public class Tile
    {
        public int x;
        public int z;
        public int heightLevel; // 0: Sea, 1: Beach, 2: Lowland, 3: High Cliff
        public Vector3 worldPos;
        public GameObject go;
        public bool hasHouse = false;
        public int houseIndex = -1;
    }

    public class House
    {
        public int id;
        public int tileX;
        public int tileZ;
        public Vector3 worldPos;
        public float hp = 100f;
        public float maxHp = 100f;
        public bool isBurning = false;
        public bool isDestroyed = false;
        public GameObject go;
        public GameObject roofGo;
    }

    public class Soldier
    {
        public Vector3 localOffset;
        public Vector3 currentPos;
        public float hp = 100f;
        public bool isDead = false;
        public GameObject go;
    }

    public class PlayerSquad
    {
        public int id;
        public SquadType type;
        public Vector3 centerPos;
        public Vector3 targetPos;
        public bool isMoving = false;
        public bool isBraced = false; // For Pikemen
        public float braceTimer = 0f;
        public List<Soldier> soldiers = new List<Soldier>();
        public float attackCooldown = 0f;
        public GameObject rootGo;
        public GameObject bannerGo;
    }

    public class RaiderUnit
    {
        public RaiderType type;
        public Vector3 pos;
        public float hp;
        public float maxHp;
        public float speed;
        public bool isDead = false;
        public int targetHouseId = -1;
        public float attackCooldown = 0f;
        public GameObject go;
    }

    public class Longship
    {
        public int id;
        public Vector3 spawnPos;
        public Vector3 beachPos;
        public float sailProgress = 0f;
        public bool isLanded = false;
        public List<RaiderUnit> passengers = new List<RaiderUnit>();
        public GameObject go;
    }

    public class ArrowProjectile
    {
        public Vector3 startPos;
        public Vector3 targetPos;
        public float progress = 0f;
        public float speed = 14f;
        public float damage = 45f;
        public GameObject go;
    }

    public class FloatingCombatText
    {
        public string text;
        public Vector3 pos;
        public Color color;
        public float timer = 0f;
        public float duration = 1.0f;
    }

    public class StageDef
    {
        public int islandNum;
        public LocalizedText name;
        public LocalizedText briefing;
        public int waveCount;
        public int houseCount;
        public bool hasBerserkers;
        public bool hasBoss;
    }

    // Grid Dimensions
    private const int MapSize = 10;
    private const float TilePitch = 1.4f;
    private Tile[,] islandTiles = new Tile[MapSize, MapSize];
    private List<House> houses = new List<House>();

    // Squads & Raiders
    private List<PlayerSquad> playerSquads = new List<PlayerSquad>();
    private int selectedSquadIdx = 0;
    private List<RaiderUnit> activeRaiders = new List<RaiderUnit>();
    private List<Longship> activeShips = new List<Longship>();
    private List<ArrowProjectile> activeArrows = new List<ArrowProjectile>();
    private List<FloatingCombatText> combatTexts = new List<FloatingCombatText>();

    // Wave System
    private int currentWave = 0;
    private int totalWavesInStage = 3;
    private float waveTimer = 0f;
    private float nextWaveDelay = 9f;
    private bool allWavesSpawned = false;

    // Camera & Visuals
    private Camera mainCam;
    private Light dirLight;
    private GameObject seaGo;
    private float waterBobTimer = 0f;

    // Materials
    private Material beachMat;
    private Material lowlandMat;
    private Material cliffMat;
    private Material waterMat;
    private Material houseWallMat;
    private Material houseRoofMat;
    private Material burningMat;
    private Material swordMat;
    private Material archerMat;
    private Material pikeMat;
    private Material raiderMat;
    private Material shieldMat;
    private Material berserkerMat;
    private Material bossMat;

    // State & Score
    public enum GameState { Playing, Victory, Defeat }
    private GameState state = GameState.Playing;
    private int coinsEarned = 0;
    private int raidersSlain = 0;
    private int currentStageIdx = 0;
    private bool showArchipelagoModal = false;
    private bool isEndlessMode = false;
    private float shakeTrauma = 0f;

    // Audio
    private AudioSource sfxSource;

    // Stages (12 Islands)
    private List<StageDef> stages = new List<StageDef>();

    private void Awake()
    {
        InitLocalization();
        InitStages();
        SetupCameraAndLighting();
        CreateMaterials();
        SetupAudio();
        LoadIsland(0);
    }

    private void InitLocalization()
    {
        if (Application.systemLanguage == SystemLanguage.Korean) currentLang = Language.KO;
        else if (Application.systemLanguage == SystemLanguage.Japanese) currentLang = Language.JA;
        else if (Application.systemLanguage == SystemLanguage.Spanish) currentLang = Language.ES;
        else currentLang = Language.EN;
    }

    private void InitStages()
    {
        stages.Clear();

        // Island 1
        stages.Add(new StageDef
        {
            islandNum = 1,
            name = new LocalizedText("Island 1: 에메랄드 암초", "Island 1: Emerald Shoal", "Island 1: エメラルド暗礁", "Isla 1: Arrecife Esmeralda"),
            briefing = new LocalizedText("작은 모래사장을 통해 침략하는 도끼 바이킹을 저지하세요!", "Repel initial axe raiders beaching on the southern shoal!", "南の浅瀬に上陸するバイキングを阻止しましょう！", "¡Repele a los invasores que desembarcan en la playa sur!"),
            waveCount = 2,
            houseCount = 1,
            hasBerserkers = false,
            hasBoss = false
        });

        // Island 2
        stages.Add(new StageDef
        {
            islandNum = 2,
            name = new LocalizedText("Island 2: 쌍둥이 바위섬", "Island 2: Twin Crags", "Island 2: 双子の岩礁", "Isla 2: Peñascos Gemelos"),
            briefing = new LocalizedText("동쪽과 서쪽 양방향 해변으로 접근하는 적선들을 막아내세요!", "Defend two separate landing beaches against dual-flank raids!", "東西両方向の砂浜から接近する敵船を防ぎましょう！", "¡Defiende dos playas de desembarco en ambos flancos!"),
            waveCount = 3,
            houseCount = 2,
            hasBerserkers = false,
            hasBoss = false
        });

        // Island 3
        stages.Add(new StageDef
        {
            islandNum = 3,
            name = new LocalizedText("Island 3: 등대 곶", "Island 3: Lighthouse Cape", "Island 3: 岬の灯台", "Isla 3: Cabo del Faro"),
            briefing = new LocalizedText("높은 절벽 위에 궁병을 배치하여 상륙하는 방패병을 제압하세요!", "Position archers on high cliffs to rain arrows on shield raiders!", "高台の崖に弓兵を配置し、上陸する盾兵を制圧しましょう！", "¡Ubica arqueros en los acantilados para abatir escuderos!"),
            waveCount = 3,
            houseCount = 2,
            hasBerserkers = false,
            hasBoss = false
        });

        // Island 4
        stages.Add(new StageDef
        {
            islandNum = 4,
            name = new LocalizedText("Island 4: 좁은 협곡", "Island 4: Narrow Gorge", "Island 4: 狭い峡谷", "Isla 4: Garganta Estrecha"),
            briefing = new LocalizedText("창병을 좁은 길목에 고정 방진(Braced)시켜 적의 돌격을 분쇄하세요!", "Brace pikemen in narrow corridors to impale charging waves!", "槍兵を狭い通路で構え(Braced)、敵の突撃を粉砕しましょう！", "¡Aposta piqueros en el cuello de botella para empalar cargas!"),
            waveCount = 4,
            houseCount = 2,
            hasBerserkers = false,
            hasBoss = false
        });

        // Island 5
        stages.Add(new StageDef
        {
            islandNum = 5,
            name = new LocalizedText("Island 5: 약탈 선봉 함대 [중간보스]", "Island 5: Raider Vanguard [Mid-Boss]", "Island 5: 略奪先鋒艦隊 [中ボス]", "Isla 5: Vanguardia Vikinga [Jefe Medio]"),
            briefing = new LocalizedText("동시에 접안하는 4척의 대형 상륙선을 막고 마을을 사수하세요!", "Defend against a 4-longship coordinated assault!", "同時に接岸する4隻の大型上陸船を防ぎ、村を死守しましょう！", "¡Resiste el asalto coordinado de 4 barcos drakkar!"),
            waveCount = 4,
            houseCount = 3,
            hasBerserkers = false,
            hasBoss = false
        });

        // Island 6
        stages.Add(new StageDef
        {
            islandNum = 6,
            name = new LocalizedText("Island 6: 세 자매 가옥", "Island 6: Three Sisters Isle", "Island 6: 三姉妹の家", "Isla 6: Tres Hermanas"),
            briefing = new LocalizedText("섬 전역에 분산된 3채의 가옥을 신속히 기동하며 방어하세요!", "Keep your squads mobile to protect 3 dispersed houses!", "島全体に分散した3軒の家を迅速に機動しながら防衛しましょう！", "¡Moviliza tropas para proteger 3 aldeas dispersas!"),
            waveCount = 4,
            houseCount = 3,
            hasBerserkers = true,
            hasBoss = false
        });

        // Island 7
        stages.Add(new StageDef
        {
            islandNum = 7,
            name = new LocalizedText("Island 7: 안개 낀 늪지", "Island 7: Mist Mire", "Island 7: 霧の湿地", "Isla 7: Ciénaga Neblinosa"),
            briefing = new LocalizedText("360도 전방위에서 불시에 안개를 뚫고 들어오는 기습선을 막으세요!", "Guard against surprise landings emerging from the thick ocean mist!", "全方位から霧を破って現れる奇襲船を防ぎましょう！", "¡Defiende contra desembarcos sorpresa entre la densa niebla!"),
            waveCount = 5,
            houseCount = 2,
            hasBerserkers = true,
            hasBoss = false
        });

        // Island 8
        stages.Add(new StageDef
        {
            islandNum = 8,
            name = new LocalizedText("Island 8: 버서커의 분노", "Island 8: Berserker's Wrath", "Island 8: バーサーカーの怒り", "Isla 8: Furia del Berserker"),
            briefing = new LocalizedText("절벽을 뛰어넘는 거대한 광전사 버서커의 도약을 차단하세요!", "Stop terrifying giant berserkers leaping over terrain!", "崖を飛び越える巨大な狂戦士バーサーカーの跳躍を阻止しましょう！", "¡Frena a los gigantescos berserkers que saltan riscos!"),
            waveCount = 5,
            houseCount = 2,
            hasBerserkers = true,
            hasBoss = false
        });

        // Island 9
        stages.Add(new StageDef
        {
            islandNum = 9,
            name = new LocalizedText("Island 9: 흑요석 암반 요새", "Island 9: Obsidian Atoll", "Island 9: 黒曜石の要塞", "Isla 9: Atolón de Obsidiana"),
            briefing = new LocalizedText("가파른 3단 절벽 위에서 낙하 밀치기(Knockback)로 적을 바다로 추락시키세요!", "Push enemies off steep cliffs into the icy sea with heavy knockback!", "急峻な崖の上からノックバックで敵を冷たい海へ突き落としましょう！", "¡Empuja a los invasores por los acantilados al mar gélido!"),
            waveCount = 5,
            houseCount = 3,
            hasBerserkers = true,
            hasBoss = false
        });

        // Island 10
        stages.Add(new StageDef
        {
            islandNum = 10,
            name = new LocalizedText("Island 10: 얄의 대함대 [최종보스]", "Island 10: Jarl Ragnar's Armada [Final Boss]", "Island 10: ヤールの巨大艦隊 [最終ボス]", "Isla 10: Armada del Jarl [Jefe Final]"),
            briefing = new LocalizedText("전설적인 바이킹 사령관 '얄 라그나르'의 본대 함대를 격파하세요!", "Defeat the legendary Viking commander Jarl Ragnar and his elite army!", "伝説的なバイキング総司令官『ヤール・ラグナル』の本隊を撃破しましょう！", "¡Derrota al legendario comandante Jarl Ragnar y su ejército!"),
            waveCount = 6,
            houseCount = 3,
            hasBerserkers = true,
            hasBoss = true
        });

        // Island 11
        stages.Add(new StageDef
        {
            islandNum = 11,
            name = new LocalizedText("Island 11: 얼음 빙하 절벽 [시크릿]", "Island 11: Glacial Bastion [Secret]", "Island 11: 氷河の絶壁 [シークレット]", "Isla 11: Bastión Glacial [Secreto]"),
            briefing = new LocalizedText("동결된 빙하 지대에서 끝없이 몰려드는 바이킹 정예 부대를 요격하세요!", "Intercept waves of elite raiders in the freezing glacial fjord!", "凍結した氷河地帯で押し寄せるバイキング精鋭部隊を迎撃しましょう！", "¡Intercepta a las tropas de élite en el fiordo helado!"),
            waveCount = 6,
            houseCount = 3,
            hasBerserkers = true,
            hasBoss = true
        });

        // Island 12
        stages.Add(new StageDef
        {
            islandNum = 12,
            name = new LocalizedText("Island 12: 발할라의 최후 항전 [마스터]", "Island 12: Valhalla's Last Stand [Master]", "Island 12: ヴァルハラの最終抗戦 [マスター]", "Isla 12: Última Resistencia en Valhalla"),
            briefing = new LocalizedText("모든 가옥을 온전히 보존하며 7파도의 초대형 침략군을 전멸시키세요!", "Achieve a perfect defense protecting all houses against 7 brutal waves!", "全家屋を無傷で守り抜き、7波の超大型侵略軍を全滅させましょう！", "¡Logra una defensa perfecta protegiendo todas las casas en 7 oleadas!"),
            waveCount = 7,
            houseCount = 3,
            hasBerserkers = true,
            hasBoss = true
        });
    }

    private void SetupCameraAndLighting()
    {
        var camGo = new GameObject("Tactics Camera");
        mainCam = camGo.AddComponent<Camera>();
        mainCam.transform.position = new Vector3(-9.5f, 15f, -9.5f);
        mainCam.transform.rotation = Quaternion.Euler(46f, 45f, 0f);
        mainCam.clearFlags = CameraClearFlags.SolidColor;
        mainCam.backgroundColor = new Color(0.12f, 0.16f, 0.24f, 1f); // Nordic Sea Dusk
        mainCam.orthographic = true;
        mainCam.orthographicSize = 9.8f;

        var lightGo = new GameObject("SunLight");
        dirLight = lightGo.AddComponent<Light>();
        dirLight.type = LightType.Directional;
        dirLight.color = new Color(1f, 0.96f, 0.90f);
        dirLight.intensity = 1.3f;
        lightGo.transform.rotation = Quaternion.Euler(52f, -38f, 0f);
    }

    private void CreateMaterials()
    {
        Shader lit = Shader.Find("Universal Render Pipeline/Lit");
        if (lit == null) lit = Shader.Find("Standard");

        beachMat = new Material(lit);
        beachMat.color = new Color(0.88f, 0.82f, 0.65f); // Nordic Sand

        lowlandMat = new Material(lit);
        lowlandMat.color = new Color(0.24f, 0.55f, 0.32f); // Island Grass

        cliffMat = new Material(lit);
        cliffMat.color = new Color(0.38f, 0.42f, 0.46f); // Grey Slate Cliff

        waterMat = new Material(lit);
        waterMat.color = new Color(0.14f, 0.36f, 0.52f, 0.9f);

        houseWallMat = new Material(lit);
        houseWallMat.color = new Color(0.58f, 0.48f, 0.38f);

        houseRoofMat = new Material(lit);
        houseRoofMat.color = new Color(0.82f, 0.32f, 0.22f);

        burningMat = new Material(lit);
        burningMat.color = new Color(0.95f, 0.45f, 0.10f);

        // Player Squad Mats
        swordMat = new Material(lit);
        swordMat.color = new Color(0.25f, 0.55f, 0.95f); // Blue Swords

        archerMat = new Material(lit);
        archerMat.color = new Color(0.18f, 0.82f, 0.44f); // Green Archers

        pikeMat = new Material(lit);
        pikeMat.color = new Color(0.95f, 0.72f, 0.12f); // Gold Pikes

        // Raider Mats
        raiderMat = new Material(lit);
        raiderMat.color = new Color(0.85f, 0.22f, 0.22f); // Red Militia

        shieldMat = new Material(lit);
        shieldMat.color = new Color(0.65f, 0.20f, 0.20f);

        berserkerMat = new Material(lit);
        berserkerMat.color = new Color(0.45f, 0.10f, 0.10f);

        bossMat = new Material(lit);
        bossMat.color = new Color(0.95f, 0.85f, 0.10f); // Gold Warlord
    }

    private void SetupAudio()
    {
        sfxSource = gameObject.AddComponent<AudioSource>();
        sfxSource.playOnAwake = false;
        sfxSource.volume = 0.85f;
    }

    private void PlayTone(float freq, float duration, string wave = "sine", float vol = 0.45f)
    {
        int sampleRate = 44100;
        int count = Mathf.CeilToInt(sampleRate * duration);
        float[] samples = new float[count];

        for (int i = 0; i < count; i++)
        {
            float t = (float)i / sampleRate;
            float env = Mathf.Exp(-t * 5.5f);
            float angle = 2f * Mathf.PI * freq * t;
            float val = 0f;

            if (wave == "sine") val = Mathf.Sin(angle);
            else if (wave == "triangle") val = Mathf.PingPong(t * freq * 4f, 2f) - 1f;
            else if (wave == "square") val = Mathf.Sin(angle) > 0f ? 0.5f : -0.5f;
            else val = (UnityEngine.Random.value * 2f - 1f);

            samples[i] = val * env * vol;
        }

        AudioClip clip = AudioClip.Create("SFX", count, 1, sampleRate, false);
        clip.SetData(samples, 0);
        sfxSource.PlayOneShot(clip);
    }

    private void PlayHornSound()
    {
        StartCoroutine(HornRoutine());
    }

    private IEnumerator HornRoutine()
    {
        PlayTone(220f, 0.55f, "sawtooth", 0.6f);
        yield return new WaitForSeconds(0.2f);
        PlayTone(330f, 0.85f, "sawtooth", 0.7f);
    }

    private void PlayClashSound()
    {
        PlayTone(420f, 0.15f, "square", 0.35f);
        PlayTone(880f, 0.08f, "triangle", 0.3f);
    }

    private void PlayArrowWhoosh()
    {
        PlayTone(580f, 0.12f, "sine", 0.25f);
    }

    private void PlayPikeBraceSound()
    {
        PlayTone(160f, 0.28f, "triangle", 0.65f);
    }

    public void LoadIsland(int stageIdx)
    {
        currentStageIdx = Mathf.Clamp(stageIdx, 0, stages.Count - 1);
        StageDef stage = stages[currentStageIdx];

        state = GameState.Playing;
        currentWave = 0;
        totalWavesInStage = stage.waveCount;
        waveTimer = 3.5f; // Initial grace period
        allWavesSpawned = false;
        raidersSlain = 0;
        coinsEarned = 0;
        showArchipelagoModal = false;

        ClearAllEntities();
        BuildIslandMesh(stage);
        SpawnHouses(stage);
        SpawnPlayerSquads();

        PlayHornSound();
        SpawnFloatingText(stage.name.Get(currentLang), new Vector3(0f, 4f, 0f), Color.cyan);
    }

    private void ClearAllEntities()
    {
        // Clear island tiles
        for (int x = 0; x < MapSize; x++)
        {
            for (int z = 0; z < MapSize; z++)
            {
                if (islandTiles[x, z] != null && islandTiles[x, z].go != null)
                {
                    Destroy(islandTiles[x, z].go);
                }
                islandTiles[x, z] = null;
            }
        }

        // Clear houses
        foreach (var h in houses)
        {
            if (h.go != null) Destroy(h.go);
        }
        houses.Clear();

        // Clear player squads
        foreach (var sq in playerSquads)
        {
            if (sq.rootGo != null) Destroy(sq.rootGo);
        }
        playerSquads.Clear();

        // Clear raiders
        foreach (var r in activeRaiders)
        {
            if (r.go != null) Destroy(r.go);
        }
        activeRaiders.Clear();

        // Clear ships
        foreach (var s in activeShips)
        {
            if (s.go != null) Destroy(s.go);
        }
        activeShips.Clear();

        // Clear arrows
        foreach (var a in activeArrows)
        {
            if (a.go != null) Destroy(a.go);
        }
        activeArrows.Clear();

        combatTexts.Clear();
    }

    private void BuildIslandMesh(StageDef stage)
    {
        // Water plane
        if (seaGo == null)
        {
            seaGo = GameObject.CreatePrimitive(PrimitiveType.Cube);
            seaGo.name = "Ocean";
            seaGo.transform.position = new Vector3(0f, -0.4f, 0f);
            seaGo.transform.localScale = new Vector3(36f, 0.4f, 36f);
            seaGo.GetComponent<Renderer>().material = waterMat;
        }

        float originOffset = (MapSize - 1) * TilePitch * 0.5f;

        for (int x = 0; x < MapSize; x++)
        {
            for (int z = 0; z < MapSize; z++)
            {
                // Island height topology (Island center is higher, edges are beaches or ocean)
                float distFromCenter = Vector2.Distance(new Vector2(x, z), new Vector2(MapSize * 0.5f - 0.5f, MapSize * 0.5f - 0.5f));
                int height = 0;

                if (distFromCenter < 2.0f) height = 3; // High Cliff
                else if (distFromCenter < 3.4f) height = 2; // Lowland
                else if (distFromCenter < 4.4f) height = 1; // Beach
                else height = 0; // Sea

                Vector3 pos = new Vector3(x * TilePitch - originOffset, (height * 0.6f) - 0.3f, z * TilePitch - originOffset);

                var t = new Tile();
                t.x = x;
                t.z = z;
                t.heightLevel = height;
                t.worldPos = pos;

                if (height > 0)
                {
                    var cube = GameObject.CreatePrimitive(PrimitiveType.Cube);
                    cube.name = string.Format("Tile_{0}_{1}_H{2}", x, z, height);
                    cube.transform.position = pos;
                    cube.transform.localScale = new Vector3(TilePitch * 0.96f, height * 0.6f + 0.6f, TilePitch * 0.96f);

                    Material mat = (height == 1) ? beachMat : (height == 2) ? lowlandMat : cliffMat;
                    cube.GetComponent<Renderer>().material = mat;
                    t.go = cube;
                }

                islandTiles[x, z] = t;
            }
        }
    }

    private void SpawnHouses(StageDef stage)
    {
        int count = stage.houseCount;
        int[,] houseCoords = { { 4, 4 }, { 3, 5 }, { 5, 3 } };

        for (int i = 0; i < count; i++)
        {
            int hx = houseCoords[i, 0];
            int hz = houseCoords[i, 1];
            Tile t = islandTiles[hx, hz];

            var h = new House();
            h.id = i;
            h.tileX = hx;
            h.tileZ = hz;
            h.worldPos = t.worldPos + new Vector3(0f, 0.4f, 0f);

            var houseBody = GameObject.CreatePrimitive(PrimitiveType.Cube);
            houseBody.name = "House_" + i;
            houseBody.transform.position = h.worldPos;
            houseBody.transform.localScale = new Vector3(0.9f, 0.7f, 0.9f);
            houseBody.GetComponent<Renderer>().material = houseWallMat;
            h.go = houseBody;

            var roof = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            roof.name = "Roof_" + i;
            roof.transform.position = h.worldPos + new Vector3(0f, 0.45f, 0f);
            roof.transform.localScale = new Vector3(1.1f, 0.25f, 1.1f);
            roof.GetComponent<Renderer>().material = houseRoofMat;
            roof.transform.SetParent(houseBody.transform);
            h.roofGo = roof;

            t.hasHouse = true;
            t.houseIndex = i;
            houses.Add(h);
        }
    }

    private void SpawnPlayerSquads()
    {
        // 3 Starting Squads: Swordsmen, Archers, Pikemen
        SquadType[] types = { SquadType.Swordsmen, SquadType.Archers, SquadType.Pikemen };
        Vector3[] spawnLocs =
        {
            islandTiles[4, 3].worldPos + new Vector3(0f, 0.5f, 0f),
            islandTiles[5, 5].worldPos + new Vector3(0f, 0.5f, 0f),
            islandTiles[3, 4].worldPos + new Vector3(0f, 0.5f, 0f)
        };

        for (int i = 0; i < 3; i++)
        {
            var sq = new PlayerSquad();
            sq.id = i;
            sq.type = types[i];
            sq.centerPos = spawnLocs[i];
            sq.targetPos = spawnLocs[i];
            sq.isMoving = false;
            sq.isBraced = (types[i] == SquadType.Pikemen);

            sq.rootGo = new GameObject("Squad_" + types[i]);
            sq.rootGo.transform.position = sq.centerPos;

            // Banner
            var banner = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            banner.transform.position = sq.centerPos + new Vector3(0f, 1.3f, 0f);
            banner.transform.localScale = new Vector3(0.18f, 0.5f, 0.18f);
            banner.transform.SetParent(sq.rootGo.transform);
            banner.GetComponent<Renderer>().material = GetMaterialForSquad(types[i]);
            sq.bannerGo = banner;

            // 9 Soldiers in 3x3 formation
            for (int r = -1; r <= 1; r++)
            {
                for (int c = -1; c <= 1; c++)
                {
                    var sol = new Soldier();
                    sol.localOffset = new Vector3(c * 0.32f, 0f, r * 0.32f);
                    sol.currentPos = sq.centerPos + sol.localOffset;

                    var solGo = GameObject.CreatePrimitive(PrimitiveType.Capsule);
                    solGo.name = "Soldier";
                    solGo.transform.position = sol.currentPos;
                    solGo.transform.localScale = new Vector3(0.24f, 0.38f, 0.24f);
                    solGo.transform.SetParent(sq.rootGo.transform);
                    solGo.GetComponent<Renderer>().material = GetMaterialForSquad(types[i]);
                    sol.go = solGo;

                    sq.soldiers.Add(sol);
                }
            }

            playerSquads.Add(sq);
        }

        selectedSquadIdx = 0;
    }

    private Material GetMaterialForSquad(SquadType type)
    {
        switch (type)
        {
            case SquadType.Swordsmen: return swordMat;
            case SquadType.Archers: return archerMat;
            case SquadType.Pikemen: return pikeMat;
            default: return swordMat;
        }
    }

    private void Update()
    {
        HandleTacticalInput();
        UpdateWaveSpawning();
        UpdateShips();
        UpdateSquadMovement();
        UpdateRaiders();
        UpdateCombat();
        UpdateArrows();
        UpdateFloatingCombatTexts();
        UpdateWaterAnimation();
        UpdateCameraTrauma();
    }

    private void HandleTacticalInput()
    {
        if (state != GameState.Playing) return;

        // Select Squad via Number Keys [1, 2, 3]
        if (Input.GetKeyDown(KeyCode.Alpha1)) SelectSquad(0);
        if (Input.GetKeyDown(KeyCode.Alpha2)) SelectSquad(1);
        if (Input.GetKeyDown(KeyCode.Alpha3)) SelectSquad(2);

        // Click interaction
        if (Input.GetMouseButtonDown(0))
        {
            Ray ray = mainCam.ScreenPointToRay(Input.mousePosition);
            Plane groundPlane = new Plane(Vector3.up, new Vector3(0f, 0.4f, 0f));
            float enter;

            if (groundPlane.Raycast(ray, out enter))
            {
                Vector3 hitPoint = ray.GetPoint(enter);

                // 1. Check if clicking on another squad
                bool clickedSquad = false;
                for (int i = 0; i < playerSquads.Count; i++)
                {
                    if (Vector3.Distance(hitPoint, playerSquads[i].centerPos) < 1.4f)
                    {
                        SelectSquad(i);
                        clickedSquad = true;
                        break;
                    }
                }

                // 2. Otherwise issue Move Order to closest valid land tile
                if (!clickedSquad && selectedSquadIdx >= 0 && selectedSquadIdx < playerSquads.Count)
                {
                    Tile closestTile = FindClosestLandTile(hitPoint);
                    if (closestTile != null && closestTile.heightLevel > 0)
                    {
                        IssueMoveOrder(playerSquads[selectedSquadIdx], closestTile.worldPos + new Vector3(0f, 0.4f, 0f));
                    }
                }
            }
        }
    }

    private void SelectSquad(int idx)
    {
        if (idx >= 0 && idx < playerSquads.Count)
        {
            selectedSquadIdx = idx;
            PlayTone(520f, 0.1f, "triangle");
            PlayerSquad sq = playerSquads[idx];
            string sqName = sq.type == SquadType.Swordsmen ? (currentLang == Language.KO ? "검보병 분대 선택" : "Swordsmen Squad") :
                            sq.type == SquadType.Archers ? (currentLang == Language.KO ? "궁병 분대 선택" : "Archers Squad") :
                            (currentLang == Language.KO ? "창병 분대 선택" : "Pikemen Squad");
            SpawnFloatingText(sqName, sq.centerPos + Vector3.up * 1.5f, Color.yellow);
        }
    }

    private Tile FindClosestLandTile(Vector3 pos)
    {
        Tile best = null;
        float minDist = float.MaxValue;

        for (int x = 0; x < MapSize; x++)
        {
            for (int z = 0; z < MapSize; z++)
            {
                Tile t = islandTiles[x, z];
                if (t != null && t.heightLevel > 0)
                {
                    float d = Vector3.Distance(pos, t.worldPos);
                    if (d < minDist)
                    {
                        minDist = d;
                        best = t;
                    }
                }
            }
        }
        return best;
    }

    private void IssueMoveOrder(PlayerSquad sq, Vector3 target)
    {
        sq.targetPos = target;
        sq.isMoving = true;
        sq.isBraced = false;
        sq.braceTimer = 0f;

        PlayTone(380f, 0.12f, "sine");
        SpawnFloatingText("➔ MOVE", target, Color.white);
    }

    private void UpdateWaveSpawning()
    {
        if (allWavesSpawned) return;

        waveTimer -= Time.deltaTime;
        if (waveTimer <= 0f)
        {
            currentWave++;
            SpawnWave(currentWave);

            if (currentWave >= totalWavesInStage)
            {
                allWavesSpawned = true;
            }
            else
            {
                waveTimer = nextWaveDelay;
            }
        }
    }

    private void SpawnWave(int waveNum)
    {
        StageDef stage = stages[currentStageIdx];
        PlayHornSound();

        // Pick beach landing spots
        List<Tile> beachTiles = new List<Tile>();
        for (int x = 0; x < MapSize; x++)
        {
            for (int z = 0; z < MapSize; z++)
            {
                if (islandTiles[x, z] != null && islandTiles[x, z].heightLevel == 1)
                {
                    beachTiles.Add(islandTiles[x, z]);
                }
            }
        }

        if (beachTiles.Count == 0) return;

        int shipCount = Mathf.Min(waveNum + 1, 4);

        for (int i = 0; i < shipCount; i++)
        {
            Tile targetBeach = beachTiles[UnityEngine.Random.Range(0, beachTiles.Count)];
            Vector3 dirFromCenter = (targetBeach.worldPos - Vector3.zero).normalized;
            Vector3 spawnSea = targetBeach.worldPos + dirFromCenter * 14f + new Vector3(UnityEngine.Random.Range(-2f, 2f), 0f, UnityEngine.Random.Range(-2f, 2f));
            spawnSea.y = -0.2f;

            var ship = new Longship();
            ship.id = UnityEngine.Random.Range(100, 9999);
            ship.spawnPos = spawnSea;
            ship.beachPos = targetBeach.worldPos;
            ship.sailProgress = 0f;
            ship.isLanded = false;

            // Longship Model
            var shipGo = GameObject.CreatePrimitive(PrimitiveType.Cube);
            shipGo.name = "Longship_" + ship.id;
            shipGo.transform.position = spawnSea;
            shipGo.transform.localScale = new Vector3(1.2f, 0.5f, 2.6f);
            shipGo.transform.rotation = Quaternion.LookRotation(targetBeach.worldPos - spawnSea);
            shipGo.GetComponent<Renderer>().material = houseRoofMat;
            ship.go = shipGo;

            // Prepare passengers
            int raiderCount = 4 + waveNum * 2;
            for (int r = 0; r < raiderCount; r++)
            {
                var unit = new RaiderUnit();
                if (stage.hasBoss && waveNum == totalWavesInStage && r == 0)
                {
                    unit.type = RaiderType.JarlWarlord;
                    unit.hp = 300f;
                    unit.maxHp = 300f;
                    unit.speed = 1.3f;
                }
                else if (stage.hasBerserkers && UnityEngine.Random.value < 0.28f)
                {
                    unit.type = RaiderType.Berserker;
                    unit.hp = 140f;
                    unit.maxHp = 140f;
                    unit.speed = 2.4f;
                }
                else if (waveNum >= 2 && UnityEngine.Random.value < 0.4f)
                {
                    unit.type = RaiderType.ShieldBearer;
                    unit.hp = 110f;
                    unit.maxHp = 110f;
                    unit.speed = 1.5f;
                }
                else
                {
                    unit.type = RaiderType.Militia;
                    unit.hp = 70f;
                    unit.maxHp = 70f;
                    unit.speed = 1.8f;
                }

                ship.passengers.Add(unit);
            }

            activeShips.Add(ship);
        }

        string waveAnnounce = string.Format(currentLang == Language.KO ? "★ 제 {0} 파도 바이킹 침공!" : "★ Wave {0} Viking Landing!", waveNum);
        SpawnFloatingText(waveAnnounce, new Vector3(0f, 5f, 0f), Color.red);
    }

    private void UpdateShips()
    {
        for (int i = activeShips.Count - 1; i >= 0; i--)
        {
            Longship ship = activeShips[i];
            if (!ship.isLanded)
            {
                ship.sailProgress += Time.deltaTime * 0.35f;
                Vector3 currentPos = Vector3.Lerp(ship.spawnPos, ship.beachPos, ship.sailProgress);
                ship.go.transform.position = currentPos;

                if (ship.sailProgress >= 1.0f)
                {
                    // Ship has beached! Disembark troops!
                    ship.isLanded = true;
                    DisembarkRaiders(ship);
                }
            }
        }
    }

    private void DisembarkRaiders(Longship ship)
    {
        PlayTone(180f, 0.4f, "noise");
        shakeTrauma = 0.25f;

        foreach (var unit in ship.passengers)
        {
            unit.pos = ship.beachPos + new Vector3(UnityEngine.Random.Range(-0.8f, 0.8f), 0.3f, UnityEngine.Random.Range(-0.8f, 0.8f));

            var go = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            go.name = "Raider_" + unit.type;
            go.transform.position = unit.pos;

            float scale = (unit.type == RaiderType.JarlWarlord) ? 0.48f : (unit.type == RaiderType.Berserker) ? 0.36f : 0.26f;
            go.transform.localScale = new Vector3(scale, scale * 1.5f, scale);

            Material mat = (unit.type == RaiderType.JarlWarlord) ? bossMat :
                           (unit.type == RaiderType.Berserker) ? berserkerMat :
                           (unit.type == RaiderType.ShieldBearer) ? shieldMat : raiderMat;
            go.GetComponent<Renderer>().material = mat;
            unit.go = go;

            // Target closest house
            unit.targetHouseId = FindClosestStandingHouseId(unit.pos);

            activeRaiders.Add(unit);
        }
    }

    private int FindClosestStandingHouseId(Vector3 pos)
    {
        int bestId = -1;
        float minDist = float.MaxValue;

        foreach (var h in houses)
        {
            if (!h.isDestroyed)
            {
                float d = Vector3.Distance(pos, h.worldPos);
                if (d < minDist)
                {
                    minDist = d;
                    bestId = h.id;
                }
            }
        }
        return bestId;
    }

    private void UpdateSquadMovement()
    {
        foreach (var sq in playerSquads)
        {
            if (sq.isMoving)
            {
                sq.centerPos = Vector3.MoveTowards(sq.centerPos, sq.targetPos, Time.deltaTime * 2.8f);
                sq.rootGo.transform.position = sq.centerPos;

                if (Vector3.Distance(sq.centerPos, sq.targetPos) < 0.05f)
                {
                    sq.isMoving = false;
                    if (sq.type == SquadType.Pikemen)
                    {
                        sq.braceTimer = 0.6f; // Take 0.6s to set brace
                    }
                }
            }
            else if (sq.type == SquadType.Pikemen)
            {
                if (!sq.isBraced)
                {
                    sq.braceTimer -= Time.deltaTime;
                    if (sq.braceTimer <= 0f)
                    {
                        sq.isBraced = true;
                        PlayPikeBraceSound();
                        SpawnFloatingText("🛡️ BRACED!", sq.centerPos + Vector3.up * 1.2f, Color.yellow);
                    }
                }
            }
        }
    }

    private void UpdateRaiders()
    {
        for (int i = activeRaiders.Count - 1; i >= 0; i--)
        {
            RaiderUnit r = activeRaiders[i];
            if (r.isDead) continue;

            // Target destination: Player squad if close, otherwise target house
            Vector3 targetDest = r.pos;
            PlayerSquad closeSquad = FindClosestPlayerSquad(r.pos, 3.2f);

            if (closeSquad != null)
            {
                targetDest = closeSquad.centerPos;
            }
            else
            {
                House h = GetHouseById(r.targetHouseId);
                if (h != null && !h.isDestroyed)
                {
                    targetDest = h.worldPos;
                }
                else
                {
                    r.targetHouseId = FindClosestStandingHouseId(r.pos);
                }
            }

            // Move towards target
            r.pos = Vector3.MoveTowards(r.pos, targetDest, Time.deltaTime * r.speed);
            r.go.transform.position = r.pos;

            // If reached house, torch it!
            House targetH = GetHouseById(r.targetHouseId);
            if (targetH != null && !targetH.isDestroyed && Vector3.Distance(r.pos, targetH.worldPos) < 1.1f)
            {
                targetH.hp -= Time.deltaTime * 25f;
                targetH.isBurning = true;
                targetH.roofGo.GetComponent<Renderer>().material = burningMat;

                if (targetH.hp <= 0f)
                {
                    targetH.isDestroyed = true;
                    targetH.go.SetActive(false);
                    PlayTone(120f, 0.45f, "noise");
                    shakeTrauma = 0.45f;
                    SpawnFloatingText("🔥 HOUSE RAZED!", targetH.worldPos, Color.red);
                    CheckDefeatConditions();
                }
            }
        }
    }

    private House GetHouseById(int id)
    {
        foreach (var h in houses)
        {
            if (h.id == id) return h;
        }
        return null;
    }

    private PlayerSquad FindClosestPlayerSquad(Vector3 pos, float range)
    {
        PlayerSquad best = null;
        float minDist = range;

        foreach (var sq in playerSquads)
        {
            int aliveCount = GetAliveSoldiersCount(sq);
            if (aliveCount > 0)
            {
                float d = Vector3.Distance(pos, sq.centerPos);
                if (d < minDist)
                {
                    minDist = d;
                    best = sq;
                }
            }
        }
        return best;
    }

    private int GetAliveSoldiersCount(PlayerSquad sq)
    {
        int c = 0;
        foreach (var s in sq.soldiers) if (!s.isDead) c++;
        return c;
    }

    private void UpdateCombat()
    {
        // 1. Archer Volleys
        foreach (var sq in playerSquads)
        {
            if (sq.type == SquadType.Archers && GetAliveSoldiersCount(sq) > 0)
            {
                sq.attackCooldown -= Time.deltaTime;
                if (sq.attackCooldown <= 0f)
                {
                    RaiderUnit targetRaider = FindClosestRaider(sq.centerPos, 9.5f);
                    if (targetRaider != null)
                    {
                        FireArrowVolley(sq, targetRaider);
                        sq.attackCooldown = 1.4f;
                    }
                }
            }
        }

        // 2. Melee Engagements (Swordsmen & Pikemen vs Raiders)
        foreach (var sq in playerSquads)
        {
            if (sq.type == SquadType.Swordsmen || sq.type == SquadType.Pikemen)
            {
                int alive = GetAliveSoldiersCount(sq);
                if (alive <= 0) continue;

                foreach (var raider in activeRaiders)
                {
                    if (raider.isDead) continue;

                    float dist = Vector3.Distance(sq.centerPos, raider.pos);
                    if (dist < 1.35f)
                    {
                        // Combat interaction!
                        if (sq.type == SquadType.Pikemen && sq.isBraced)
                        {
                            // Braced pikes impale charging raiders!
                            float damage = 180f;
                            raider.hp -= damage;
                            PlayPikeBraceSound();
                            SpawnFloatingText("⚡ IMPALED!", raider.pos, Color.yellow);

                            // Push raider back
                            Vector3 knockDir = (raider.pos - sq.centerPos).normalized;
                            raider.pos += knockDir * 1.8f;
                            raider.go.transform.position = raider.pos;
                        }
                        else
                        {
                            // Swordsmen clash
                            raider.attackCooldown -= Time.deltaTime;
                            if (raider.attackCooldown <= 0f)
                            {
                                DamageRandomSoldier(sq, 22f);
                                raider.attackCooldown = 0.8f;
                            }

                            raider.hp -= Time.deltaTime * 65f * (alive / 9f);
                            PlayClashSound();

                            // Knockback chance for swordsmen
                            if (sq.type == SquadType.Swordsmen && UnityEngine.Random.value < 0.25f)
                            {
                                Vector3 push = (raider.pos - sq.centerPos).normalized * 0.9f;
                                raider.pos += push;
                                raider.go.transform.position = raider.pos;
                            }
                        }

                        if (raider.hp <= 0f)
                        {
                            KillRaider(raider);
                        }
                    }
                }
            }
        }
    }

    private RaiderUnit FindClosestRaider(Vector3 pos, float range)
    {
        RaiderUnit best = null;
        float minDist = range;

        foreach (var r in activeRaiders)
        {
            if (!r.isDead)
            {
                float d = Vector3.Distance(pos, r.pos);
                if (d < minDist)
                {
                    minDist = d;
                    best = r;
                }
            }
        }
        return best;
    }

    private void FireArrowVolley(PlayerSquad sq, RaiderUnit target)
    {
        PlayArrowWhoosh();

        var arrow = new ArrowProjectile();
        arrow.startPos = sq.centerPos + Vector3.up * 0.8f;
        arrow.targetPos = target.pos;
        arrow.progress = 0f;

        var go = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        go.name = "Arrow";
        go.transform.position = arrow.startPos;
        go.transform.localScale = new Vector3(0.06f, 0.35f, 0.06f);
        go.GetComponent<Renderer>().material = pikeMat;
        arrow.go = go;

        activeArrows.Add(arrow);
    }

    private void UpdateArrows()
    {
        for (int i = activeArrows.Count - 1; i >= 0; i--)
        {
            ArrowProjectile a = activeArrows[i];
            a.progress += Time.deltaTime * (a.speed / Vector3.Distance(a.startPos, a.targetPos));

            // Parabolic Arc
            Vector3 current = Vector3.Lerp(a.startPos, a.targetPos, a.progress);
            float arcHeight = Mathf.Sin(a.progress * Mathf.PI) * 2.2f;
            current.y += arcHeight;
            a.go.transform.position = current;

            if (a.progress >= 1.0f)
            {
                // Impact! Check hit raider
                RaiderUnit hitRaider = FindClosestRaider(a.targetPos, 1.2f);
                if (hitRaider != null)
                {
                    float dmg = (hitRaider.type == RaiderType.ShieldBearer) ? a.damage * 0.3f : a.damage;
                    hitRaider.hp -= dmg;
                    PlayTone(820f, 0.08f, "triangle");

                    if (hitRaider.type == RaiderType.ShieldBearer)
                    {
                        SpawnFloatingText("🛡️ BLOCKED", hitRaider.pos, Color.gray);
                    }
                    else
                    {
                        SpawnFloatingText(string.Format("-{0:F0}", dmg), hitRaider.pos, Color.green);
                    }

                    if (hitRaider.hp <= 0f)
                    {
                        KillRaider(hitRaider);
                    }
                }

                Destroy(a.go);
                activeArrows.RemoveAt(i);
            }
        }
    }

    private void DamageRandomSoldier(PlayerSquad sq, float damage)
    {
        List<Soldier> aliveList = new List<Soldier>();
        foreach (var s in sq.soldiers) if (!s.isDead) aliveList.Add(s);

        if (aliveList.Count > 0)
        {
            Soldier s = aliveList[UnityEngine.Random.Range(0, aliveList.Count)];
            s.hp -= damage;
            if (s.hp <= 0f)
            {
                s.isDead = true;
                s.go.SetActive(false);
                PlayTone(220f, 0.15f, "square");
            }
        }

        CheckDefeatConditions();
    }

    private void KillRaider(RaiderUnit r)
    {
        r.isDead = true;
        if (r.go != null) Destroy(r.go);
        raidersSlain++;
        coinsEarned += (r.type == RaiderType.JarlWarlord) ? 25 : (r.type == RaiderType.Berserker) ? 10 : 4;

        SpawnFloatingText(string.Format("+{0}G", (r.type == RaiderType.JarlWarlord) ? 25 : 4), r.pos, Color.yellow);
        CheckVictoryConditions();
    }

    private void CheckVictoryConditions()
    {
        if (state != GameState.Playing) return;

        if (allWavesSpawned)
        {
            bool anyAlive = false;
            foreach (var r in activeRaiders)
            {
                if (!r.isDead)
                {
                    anyAlive = true;
                    break;
                }
            }

            if (!anyAlive)
            {
                state = GameState.Victory;
                PlayFanfare();
            }
        }
    }

    private void CheckDefeatConditions()
    {
        if (state != GameState.Playing) return;

        // 1. All houses destroyed?
        bool anyHouseStanding = false;
        foreach (var h in houses)
        {
            if (!h.isDestroyed)
            {
                anyHouseStanding = true;
                break;
            }
        }

        if (!anyHouseStanding)
        {
            state = GameState.Defeat;
            PlayTone(110f, 0.8f, "square");
            return;
        }

        // 2. All soldiers dead?
        bool anySoldierAlive = false;
        foreach (var sq in playerSquads)
        {
            if (GetAliveSoldiersCount(sq) > 0)
            {
                anySoldierAlive = true;
                break;
            }
        }

        if (!anySoldierAlive)
        {
            state = GameState.Defeat;
            PlayTone(110f, 0.8f, "square");
        }
    }

    private void PlayFanfare()
    {
        StartCoroutine(FanfareRoutine());
    }

    private IEnumerator FanfareRoutine()
    {
        float[] notes = { 392.00f, 523.25f, 659.25f, 783.99f };
        foreach (var n in notes)
        {
            PlayTone(n, 0.28f, "triangle");
            yield return new WaitForSeconds(0.12f);
        }
    }

    private void SpawnFloatingText(string text, Vector3 pos, Color color)
    {
        var fb = new FloatingCombatText();
        fb.text = text;
        fb.pos = pos;
        fb.color = color;
        combatTexts.Add(fb);
    }

    private void UpdateFloatingCombatTexts()
    {
        for (int i = combatTexts.Count - 1; i >= 0; i--)
        {
            FloatingCombatText fb = combatTexts[i];
            fb.timer += Time.deltaTime;
            fb.pos += Vector3.up * 1.4f * Time.deltaTime;

            if (fb.timer >= fb.duration)
            {
                combatTexts.RemoveAt(i);
            }
        }
    }

    private void UpdateWaterAnimation()
    {
        waterBobTimer += Time.deltaTime;
        if (seaGo != null)
        {
            seaGo.transform.position = new Vector3(0f, -0.4f + Mathf.Sin(waterBobTimer * 1.8f) * 0.08f, 0f);
        }
    }

    private void UpdateCameraTrauma()
    {
        if (shakeTrauma > 0f)
        {
            Vector3 baseCamPos = new Vector3(-9.5f, 15f, -9.5f);
            mainCam.transform.position = baseCamPos + new Vector3(UnityEngine.Random.Range(-shakeTrauma, shakeTrauma), UnityEngine.Random.Range(-shakeTrauma, shakeTrauma), UnityEngine.Random.Range(-shakeTrauma, shakeTrauma));
            shakeTrauma = Mathf.Max(0f, shakeTrauma - Time.deltaTime * 1.4f);
        }
    }

    // GUI HUD & Modals
    private void OnGUI()
    {
        GUI.skin.label.fontSize = 15;
        GUI.skin.button.fontSize = 14;

        // Top Navigation Bar
        GUILayout.BeginArea(new Rect(16, 14, Screen.width - 32, 60));
        GUILayout.BeginHorizontal();

        StageDef def = stages[currentStageIdx];
        GUILayout.Label(string.Format("<b><color=#00f0ff>{0}</color></b>", def.name.Get(currentLang)), GUILayout.Width(280));

        // Waves & Gold
        string waveTxt = string.Format(currentLang == Language.KO ? "🌊 파도: {0}/{1}" : "🌊 Wave: {0}/{1}", currentWave, totalWavesInStage);
        GUILayout.Label(waveTxt, GUILayout.Width(130));

        string goldTxt = string.Format("💰 {0}G", coinsEarned);
        GUILayout.Label(string.Format("<b><color=#ffd700>{0}</color></b>", goldTxt), GUILayout.Width(100));

        string slainTxt = string.Format("⚔️ {0}", raidersSlain);
        GUILayout.Label(slainTxt, GUILayout.Width(100));

        GUILayout.FlexibleSpace();

        // Archipelago Modal Button
        string mapBtn = currentLang == Language.KO ? "🗺️ 군도 지도" : currentLang == Language.JA ? "🗺️ 群島マップ" : currentLang == Language.ES ? "🗺️ Archipiélago" : "🗺️ Archipelago";
        if (GUILayout.Button(mapBtn, GUILayout.Width(120), GUILayout.Height(34)))
        {
            showArchipelagoModal = !showArchipelagoModal;
        }

        // Language Switcher Button
        string langText = string.Format("🌐 {0}", currentLang);
        if (GUILayout.Button(langText, GUILayout.Width(88), GUILayout.Height(34)))
        {
            currentLang = (Language)(((int)currentLang + 1) % 4);
        }

        GUILayout.EndHorizontal();
        GUILayout.EndArea();

        // Bottom Squad Control Panel
        GUILayout.BeginArea(new Rect(16, Screen.height - 75, Screen.width - 32, 65));
        GUILayout.BeginHorizontal();

        for (int i = 0; i < playerSquads.Count; i++)
        {
            PlayerSquad sq = playerSquads[i];
            int alive = GetAliveSoldiersCount(sq);
            bool isSel = (i == selectedSquadIdx);

            string squadName = (sq.type == SquadType.Swordsmen) ? (currentLang == Language.KO ? "검보병" : "Swords") :
                               (sq.type == SquadType.Archers) ? (currentLang == Language.KO ? "궁병" : "Archers") :
                               (currentLang == Language.KO ? "창병" : "Pikes");

            string btnLabel = string.Format("[{0}] {1}\n({2}/9) {3}", i + 1, squadName, alive, (sq.type == SquadType.Pikemen && sq.isBraced ? "🛡️" : ""));

            GUI.color = isSel ? Color.cyan : (alive > 0 ? Color.white : Color.gray);
            if (GUILayout.Button(btnLabel, GUILayout.Width(140), GUILayout.Height(55)))
            {
                SelectSquad(i);
            }
            GUI.color = Color.white;
        }

        GUILayout.FlexibleSpace();

        // Retry Button
        string retryText = currentLang == Language.KO ? "다시하기" : currentLang == Language.JA ? "リトライ" : currentLang == Language.ES ? "Reintentar" : "Retry";
        if (GUILayout.Button(retryText, GUILayout.Width(95), GUILayout.Height(50)))
        {
            LoadIsland(currentStageIdx);
        }

        GUILayout.EndHorizontal();
        GUILayout.EndArea();

        // Floating In-Game Text
        foreach (var fb in combatTexts)
        {
            Vector3 sPos = mainCam.WorldToScreenPoint(fb.pos);
            if (sPos.z > 0f)
            {
                Rect r = new Rect(sPos.x - 140, Screen.height - sPos.y - 25, 280, 45);
                GUI.color = fb.color;
                GUI.skin.label.alignment = TextAnchor.MiddleCenter;
                GUI.skin.label.fontSize = 18;
                GUI.Label(r, string.Format("<b>{0}</b>", fb.text));
                GUI.skin.label.alignment = TextAnchor.UpperLeft;
                GUI.color = Color.white;
            }
        }

        // Archipelago Modal
        if (showArchipelagoModal)
        {
            RenderArchipelagoModal();
        }

        // Victory Modal
        if (state == GameState.Victory)
        {
            RenderVictoryModal();
        }

        // Defeat Modal
        if (state == GameState.Defeat)
        {
            RenderDefeatModal();
        }
    }

    private void RenderArchipelagoModal()
    {
        GUI.Box(new Rect(Screen.width * 0.5f - 240, Screen.height * 0.5f - 230, 480, 460), "");
        GUILayout.BeginArea(new Rect(Screen.width * 0.5f - 220, Screen.height * 0.5f - 210, 440, 420));

        string mapHeader = currentLang == Language.KO ? "<b><color=#00f0ff>군도 지도 - 12개 섬 선택</color></b>" : "<b><color=#00f0ff>Archipelago - Select Island (12 Stages)</color></b>";
        GUILayout.Label(mapHeader, GUILayout.Height(30));

        for (int i = 0; i < stages.Count; i++)
        {
            if (i % 2 == 0) GUILayout.BeginHorizontal();

            StageDef s = stages[i];
            string btnLabel = string.Format("#{0} {1}", s.islandNum, s.name.Get(currentLang).Split(':')[1].Trim());
            if (GUILayout.Button(btnLabel, GUILayout.Height(42)))
            {
                isEndlessMode = false;
                LoadIsland(i);
            }

            if (i % 2 == 1 || i == stages.Count - 1) GUILayout.EndHorizontal();
        }

        GUILayout.Space(8);

        if (GUILayout.Button(currentLang == Language.KO ? "닫기" : "Close", GUILayout.Height(36)))
        {
            showArchipelagoModal = false;
        }

        GUILayout.EndArea();
    }

    private void RenderVictoryModal()
    {
        GUI.Box(new Rect(Screen.width * 0.5f - 190, Screen.height * 0.5f - 140, 380, 280), "");
        GUILayout.BeginArea(new Rect(Screen.width * 0.5f - 170, Screen.height * 0.5f - 120, 340, 240));

        GUILayout.Label("<b><color=#22c55e>★ ISLAND DEFENDED! ★</color></b>", GUILayout.Height(32));
        GUILayout.Label(string.Format("Slain: <b><color=#ef4444>{0}</color></b>", raidersSlain));
        GUILayout.Label(string.Format("Gold Earned: <b><color=#ffd700>{0}G</color></b>", coinsEarned));

        GUILayout.Space(12);

        if (currentStageIdx < stages.Count - 1)
        {
            string nextTxt = currentLang == Language.KO ? "다음 섬으로 항해 ➔" : "Sail to Next Island ➔";
            if (GUILayout.Button(nextTxt, GUILayout.Height(42)))
            {
                LoadIsland(currentStageIdx + 1);
            }
        }
        else
        {
            string finaleTxt = currentLang == Language.KO ? "★ 12개 전 군도 수호 완결! ★" : "★ All 12 Islands Saved! Victory! ★";
            GUILayout.Label(finaleTxt, GUILayout.Height(36));
        }

        string retryTxt = currentLang == Language.KO ? "이 섬 다시 방어하기" : "Replay Island";
        if (GUILayout.Button(retryTxt, GUILayout.Height(36)))
        {
            LoadIsland(currentStageIdx);
        }

        GUILayout.EndArea();
    }

    private void RenderDefeatModal()
    {
        GUI.Box(new Rect(Screen.width * 0.5f - 180, Screen.height * 0.5f - 130, 360, 260), "");
        GUILayout.BeginArea(new Rect(Screen.width * 0.5f - 160, Screen.height * 0.5f - 110, 320, 220));

        GUILayout.Label("<b><color=#ef4444>ISLAND FALLEN</color></b>", GUILayout.Height(32));
        GUILayout.Label(currentLang == Language.KO ? "마을이 약탈당하고 방어선이 무너졌습니다." : "The village was raided and the defense collapsed.");

        GUILayout.Space(14);

        string retryTxt = currentLang == Language.KO ? "재도전" : "Retry";
        if (GUILayout.Button(retryTxt, GUILayout.Height(40)))
        {
            LoadIsland(currentStageIdx);
        }

        string mapTxt = currentLang == Language.KO ? "군도 지도" : "Archipelago Map";
        if (GUILayout.Button(mapTxt, GUILayout.Height(36)))
        {
            showArchipelagoModal = true;
        }

        GUILayout.EndArea();
    }
}
