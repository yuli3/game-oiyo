using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public enum BlasterLanguage { KO, EN, JA, ES }

public static class StringExtensions
{
    public static string Repeat(this string s, int n)
    {
        if (n <= 0 || string.IsNullOrEmpty(s)) return "";
        var sb = new System.Text.StringBuilder(s.Length * n);
        for (int i = 0; i < n; i++) sb.Append(s);
        return sb.ToString();
    }
}

public class StarBlasterPlayer : MonoBehaviour
{
    public enum GameState { Ready, Playing, StageClear, GameOver, AllCleared }

    [System.Serializable]
    public class StageData
    {
        public int id;
        public string nameKo;
        public string nameEn;
        public string nameJa;
        public string nameEs;
        public string descKo;
        public string descEn;
        public string descJa;
        public string descEs;
        public int targetKills;
        public float spawnInterval;
        public float enemySpeed;
        public bool hasAsteroids;
        public bool hasStealth;
        public bool hasShieldDrones;
        public bool isBossStage;
        public Color nebulaColor;
    }

    public struct PlayerBullet
    {
        public Vector3 pos;
        public Vector3 vel;
        public int type; // 0: Dual, 1: Spread, 2: Missile, 3: Beam
        public float lifetime;
        public GameObject go;
    }

    public struct EnemyBullet
    {
        public Vector3 pos;
        public Vector3 vel;
        public GameObject go;
    }

    public struct EnemyShip
    {
        public Vector3 pos;
        public Vector3 vel;
        public int type; // 0: Drone, 1: Fast, 2: Cruiser, 3: Asteroid, 4: Stealth, 5: ShieldDrone, 10: Boss
        public float hp;
        public float maxHp;
        public float shootTimer;
        public bool isShielded;
        public GameObject go;
    }

    public struct PowerupItem
    {
        public Vector3 pos;
        public int type; // 0: Weapon Up, 1: Shield, 2: Bomb, 3: Score Gem
        public GameObject go;
    }

    // Audio clips
    private AudioSource audioSource;
    private AudioClip laserClip;
    private AudioClip spreadClip;
    private AudioClip missileClip;
    private AudioClip bombClip;
    private AudioClip explodeClip;
    private AudioClip powerupClip;
    private AudioClip clearClip;
    private AudioClip bossAlarmClip;

    // Game state
    private GameState state = GameState.Ready;
    private BlasterLanguage lang = BlasterLanguage.KO;
    private int currentStageIndex = 0;
    private bool isEndless = false;
    private bool showStageSelect = false;

    // Player stats
    private GameObject playerShip;
    private GameObject shieldBubble;
    private Vector3 playerPos = new Vector3(0, 0, -3.5f);
    private float bankRoll = 0f;
    private int weaponLevel = 1; // 1 to 4
    private int shields = 3;
    private int bombs = 2;
    private int score = 0;
    private int bestScore = 0;
    private int stageKills = 0;
    private float fireCooldown = 0f;
    private float invulnerableTimer = 0f;
    private float bombCooldown = 0f;

    // Collections
    private List<PlayerBullet> playerBullets = new List<PlayerBullet>();
    private List<EnemyBullet> enemyBullets = new List<EnemyBullet>();
    private List<EnemyShip> enemies = new List<EnemyShip>();
    private List<PowerupItem> powerups = new List<PowerupItem>();

    // Visual juice & Stars
    private Camera mainCam;
    private float camShake = 0f;
    private List<Transform> stars = new List<Transform>();
    private ParticleSystem engineParticles;
    private ParticleSystem explosionParticles;

    // Materials
    private Material shipMat;
    private Material bulletMat;
    private Material enemyBulletMat;
    private Material droneMat;
    private Material fastMat;
    private Material cruiserMat;
    private Material asteroidMat;
    private Material shieldMat;
    private Material bossMat;

    // Boss Data
    private GameObject bossObject;
    private float bossHp = 1000f;
    private float bossMaxHp = 1000f;
    private float bossAttackTimer = 0f;
    private int bossPhase = 1;

    private float enemySpawnTimer = 0f;

    // 12 Defined Stages
    private StageData[] stages = new StageData[]
    {
        new StageData {
            id = 1,
            nameKo = "궤도 초소 외곽", nameEn = "Orbital Outpost Perimeter", nameJa = "軌道前哨基地 辺境", nameEs = "Perímetro del Puesto Orbital",
            descKo = "기본 플라즈마 블래스터 사격과 정찰 드론 편대를 요격하세요.",
            descEn = "Master plasma fire and intercept frontline scout drones.",
            descJa = "基本プラズマ射撃で偵察ドローン編隊を迎撃しましょう。",
            descEs = "Domina el disparo de plasma e intercepta drones exploradores.",
            targetKills = 25, spawnInterval = 1.3f, enemySpeed = 4.0f,
            nebulaColor = new Color(0.04f, 0.08f, 0.2f)
        },
        new StageData {
            id = 2,
            nameKo = "소행성 채굴 지대", nameEn = "Starlight Asteroid Belt", nameJa = "星光の小惑星帯", nameEs = "Cinturón de Asteroides",
            descKo = "회전하며 쏟아지는 단단한 소행성을 파괴하고 파워업을 획득하세요.",
            descEn = "Blast dense spinning asteroids and collect mineral powerups.",
            descJa = "回転しながら降り注ぐ小惑星を破壊し、強化カプセルを回収しましょう。",
            descEs = "Destruye asteroides densos y recolecta cápsulas de mejora.",
            targetKills = 35, spawnInterval = 1.15f, enemySpeed = 4.5f, hasAsteroids = true,
            nebulaColor = new Color(0.1f, 0.08f, 0.18f)
        },
        new StageData {
            id = 3,
            nameKo = "성운 요격기 전대", nameEn = "Nebula Interceptor Wing", nameJa = "星雲要撃機 戦隊", nameEs = "Escuadrón Interceptor Nebular",
            descKo = "고속으로 지그재그 회피 기동하는 날렵한 요격기 편대를 상대하세요.",
            descEn = "Counter high-speed interceptors performing agile evasive slaloms.",
            descJa = "高速でジグザグ回避機動を行う俊敏な要撃機編隊に対処しましょう。",
            descEs = "Enfréntate a interceptores de alta velocidad con vuelo evasivo.",
            targetKills = 45, spawnInterval = 1.0f, enemySpeed = 5.2f,
            nebulaColor = new Color(0.18f, 0.05f, 0.22f)
        },
        new StageData {
            id = 4,
            nameKo = "중순양함 전대", nameEn = "Heavy Cruiser Flotilla", nameJa = "重巡洋艦 艦隊", nameEs = "Flotilla de Cruceros Pesados",
            descKo = "단단한 중순양함의 부채꼴 탄막 세례를 회피하며 약점을 타격하세요.",
            descEn = "Evade fan-pattern bullet curtains from heavily armored cruisers.",
            descJa = "重巡洋艦の扇状弾幕を回避し、弱点を狙い撃ちましょう。",
            descEs = "Esquiva cortinas de balas en abanico de los cruceros blindados.",
            targetKills = 55, spawnInterval = 0.95f, enemySpeed = 4.2f,
            nebulaColor = new Color(0.05f, 0.18f, 0.25f)
        },
        new StageData {
            id = 5,
            nameKo = "스텔스 공습 편대", nameEn = "Stealth Strike Squadron", nameJa = "ステルス強襲編隊", nameEs = "Escuadrón de Asalto Sigiloso",
            descKo = "투명화 클로킹으로 접근해 기습 탄환을 발사하는 스텔스기를 격추하세요.",
            descEn = "Track and destroy cloaked stealth gunships executing surprise raids.",
            descJa = "クローキングで姿を隠し急襲するステルス戦闘機を撃破しましょう。",
            descEs = "Rastrea y destruye cazas sigilosos con camuflaje óptico.",
            targetKills = 65, spawnInterval = 0.9f, enemySpeed = 5.5f, hasStealth = true,
            nebulaColor = new Color(0.08f, 0.05f, 0.15f)
        },
        new StageData {
            id = 6,
            nameKo = "부유 기뢰 폭풍", nameEn = "Floating Mine Tempest", nameJa = "浮遊機雷の嵐", nameEs = "Tempestad de Minas Flotantes",
            descKo = "근접 시 연쇄 폭발하는 고압 기뢰와 소행성 복합 지대를 돌파하세요.",
            descEn = "Navigate high-explosive proximity mines and asteroid crossfire.",
            descJa = "接近すると連鎖爆発する高圧機雷群と小惑星地帯を突破しましょう。",
            descEs = "Navega a través de minas de proximidad y fuego cruzado.",
            targetKills = 75, spawnInterval = 0.85f, enemySpeed = 4.8f, hasAsteroids = true,
            nebulaColor = new Color(0.22f, 0.12f, 0.05f)
        },
        new StageData {
            id = 7,
            nameKo = "쉴드 방어 방진", nameEn = "Shield Phalanx Vanguard", nameJa = "シールド防御方陣", nameEs = "Vanguardia de Drones Escudo",
            descKo = "아군 적기에게 무적 쉴드를 공급하는 지원 드론을 먼저 격추하세요!",
            descEn = "Prioritize neutralizing support drones projecting invulnerable shields!",
            descJa = "敵機に無敵シールドを供給する支援ドローンを最優先で破壊しましょう！",
            descEs = "¡Destruye primero los drones de apoyo que proyectan escudos invulnerables!",
            targetKills = 85, spawnInterval = 0.8f, enemySpeed = 5.0f, hasShieldDrones = true,
            nebulaColor = new Color(0.05f, 0.15f, 0.35f)
        },
        new StageData {
            id = 8,
            nameKo = "태양 폭풍 폭격", nameEn = "Solar Flare Bombardment", nameJa = "太陽嵐の猛爆", nameEs = "Bombardeo de Llamarada Solar",
            descKo = "작열하는 태양풍 방전과 전방위 산탄을 쏟아내는 정예 함대 요격!",
            descEn = "Survive intense solar discharge waves and omnidirectional shrapnel.",
            descJa = "灼熱の太陽嵐放電と全方位散弾を浴びせる精鋭艦隊を迎撃！",
            descEs = "Sobrevive a descargas solares intensas y metralla omnidireccional.",
            targetKills = 100, spawnInterval = 0.75f, enemySpeed = 5.8f,
            nebulaColor = new Color(0.35f, 0.1f, 0.05f)
        },
        new StageData {
            id = 9,
            nameKo = "정예 에이스 함대", nameEn = "Elite Ace Armada", nameJa = "精鋭エース大艦隊", nameEs = "Armada de Ases de Élite",
            descKo = "유도 미사일과 급강하 전술을 구사하는 적군 베테랑 에이스 편대!",
            descEn = "Engage veteran ace pilots deploying homing micro-missiles and dive tactics.",
            descJa = "誘導ミサイルと急降下戦術を駆使するベテランエース編隊！",
            descEs = "Enfréntate a pilotos veteranos con micro-misiles teledirigidos.",
            targetKills = 115, spawnInterval = 0.7f, enemySpeed = 6.2f, hasStealth = true, hasShieldDrones = true,
            nebulaColor = new Color(0.2f, 0.05f, 0.3f)
        },
        new StageData {
            id = 10,
            nameKo = "보스: 드레드노트 레비아탄", nameEn = "Boss: Leviathan Dreadnought", nameJa = "ボス：リヴァイアサン巨艦", nameEs = "Jefe: Acorazado Leviatán",
            descKo = "좌우 주포 터렛을 먼저 파괴하고 노출된 중앙 원자로 코어를 타격하세요!",
            descEn = "Dismantle twin heavy cannons to expose and crush the glowing core!",
            descJa = "左右の主砲砲塔を先に破壊し、露出した中央動力炉コアを叩きましょう！",
            descEs = "¡Destruye las torretas laterales para exponer y aniquilar el núcleo!",
            targetKills = 140, spawnInterval = 1.2f, enemySpeed = 4.0f, isBossStage = true,
            nebulaColor = new Color(0.28f, 0.04f, 0.08f)
        },
        new StageData {
            id = 11,
            nameKo = "하이퍼워프 심연 강습", nameEn = "Hyperwarp Abyss Assault", nameJa = "超空間ワープ深淵強襲", nameEs = "Asalto Abisal Hiperespacial",
            descKo = "시공간 워프 터널 속에서 폭풍처럼 쏟아지는 초고속 함선 웨이브!",
            descEn = "Navigate relentless hyper-speed waves through the twisting warp vortex!",
            descJa = "時空ワープトンネルの中で嵐のように降り注ぐ超高速艦隊ウェーブ！",
            descEs = "¡Navega a través de oleadas implacables en el vórtice hiperespacial!",
            targetKills = 175, spawnInterval = 0.6f, enemySpeed = 7.0f, hasAsteroids = true, hasShieldDrones = true,
            nebulaColor = new Color(0.12f, 0.02f, 0.28f)
        },
        new StageData {
            id = 12,
            nameKo = "보이드 오버로드 총사령함", nameEn = "Void Overlord Flagship", nameJa = "虚空の覇者 旗艦最終決戦", nameEs = "Nave Insignia del Señor del Vacío",
            descKo = "3단계 변신과 전방위 360도 나선 탄막을 전개하는 최종 보스 총력전!",
            descEn = "The ultimate 3-phase climax against the colossal 360-degree spiral fortress!",
            descJa = "3段階変形と全方位360度螺旋弾幕を展開する最終ボス総力戦！",
            descEs = "¡El clímax definitivo en 3 fases contra la fortaleza espiral de 360 grados!",
            targetKills = 220, spawnInterval = 1.0f, enemySpeed = 5.0f, isBossStage = true,
            nebulaColor = new Color(0.35f, 0.25f, 0.05f)
        }
    };

    void Awake()
    {
        Application.targetFrameRate = 60;
        mainCam = Camera.main;
        if (mainCam == null)
        {
            var camGo = new GameObject("MainCamera");
            mainCam = camGo.AddComponent<Camera>();
            camGo.tag = "MainCamera";
        }
        mainCam.backgroundColor = new Color(0.015f, 0.025f, 0.05f);
        mainCam.clearFlags = CameraClearFlags.SolidColor;
        mainCam.transform.position = new Vector3(0, 16.5f, -2.5f);
        mainCam.transform.rotation = Quaternion.Euler(75f, 0, 0);

        audioSource = gameObject.AddComponent<AudioSource>();
        audioSource.playOnAwake = false;

        GenerateAudioClips();
        CreateMaterials();
        CreatePlayerShip();
        CreateStarfield();
        CreateParticleSystems();

        bestScore = PlayerPrefs.GetInt("StarBlaster_BestScore", 0);
        ResetToStage(0);
    }

    private void CreateMaterials()
    {
        var shader = Shader.Find("Mobile/Diffuse");
        if (shader == null) shader = Shader.Find("Diffuse");
        if (shader == null) shader = Shader.Find("Standard");

        shipMat = new Material(shader);
        shipMat.color = new Color(0.2f, 0.85f, 1f);

        bulletMat = new Material(shader);
        bulletMat.color = new Color(0.3f, 1f, 0.5f);

        enemyBulletMat = new Material(shader);
        enemyBulletMat.color = new Color(1f, 0.25f, 0.1f);

        droneMat = new Material(shader);
        droneMat.color = new Color(0.9f, 0.2f, 0.2f);

        fastMat = new Material(shader);
        fastMat.color = new Color(1f, 0.7f, 0.1f);

        cruiserMat = new Material(shader);
        cruiserMat.color = new Color(0.6f, 0.2f, 0.8f);

        asteroidMat = new Material(shader);
        asteroidMat.color = new Color(0.45f, 0.4f, 0.38f);

        shieldMat = new Material(shader);
        shieldMat.color = new Color(0.1f, 0.75f, 1f, 0.5f);

        bossMat = new Material(shader);
        bossMat.color = new Color(0.85f, 0.1f, 0.15f);
    }

    private void CreatePlayerShip()
    {
        playerShip = new GameObject("PlayerStarfighter");
        playerShip.transform.position = playerPos;

        // Fuselage
        var fuselage = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        fuselage.transform.SetParent(playerShip.transform);
        fuselage.transform.localPosition = Vector3.zero;
        fuselage.transform.localScale = new Vector3(0.42f, 0.95f, 0.42f);
        fuselage.transform.localRotation = Quaternion.Euler(90, 0, 0);
        fuselage.GetComponent<Renderer>().material = shipMat;

        // Cockpit canopy
        var canopy = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        canopy.transform.SetParent(playerShip.transform);
        canopy.transform.localPosition = new Vector3(0, 0.18f, 0.2f);
        canopy.transform.localScale = new Vector3(0.35f, 0.22f, 0.55f);
        var cMat = new Material(shipMat);
        cMat.color = new Color(0.9f, 0.95f, 1f);
        canopy.GetComponent<Renderer>().material = cMat;

        // Left Wing
        var leftWing = GameObject.CreatePrimitive(PrimitiveType.Cube);
        leftWing.transform.SetParent(playerShip.transform);
        leftWing.transform.localPosition = new Vector3(-0.85f, 0, -0.2f);
        leftWing.transform.localRotation = Quaternion.Euler(0, -25, 0);
        leftWing.transform.localScale = new Vector3(1.1f, 0.08f, 0.6f);
        leftWing.GetComponent<Renderer>().material = shipMat;

        // Right Wing
        var rightWing = GameObject.CreatePrimitive(PrimitiveType.Cube);
        rightWing.transform.SetParent(playerShip.transform);
        rightWing.transform.localPosition = new Vector3(0.85f, 0, -0.2f);
        rightWing.transform.localRotation = Quaternion.Euler(0, 25, 0);
        rightWing.transform.localScale = new Vector3(1.1f, 0.08f, 0.6f);
        rightWing.GetComponent<Renderer>().material = shipMat;

        // Blaster Pods
        var gunL = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        gunL.transform.SetParent(playerShip.transform);
        gunL.transform.localPosition = new Vector3(-1.25f, 0, 0.15f);
        gunL.transform.localScale = new Vector3(0.12f, 0.45f, 0.12f);
        gunL.transform.localRotation = Quaternion.Euler(90, 0, 0);
        gunL.GetComponent<Renderer>().material = bulletMat;

        var gunR = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        gunR.transform.SetParent(playerShip.transform);
        gunR.transform.localPosition = new Vector3(1.25f, 0, 0.15f);
        gunR.transform.localScale = new Vector3(0.12f, 0.45f, 0.12f);
        gunR.transform.localRotation = Quaternion.Euler(90, 0, 0);
        gunR.GetComponent<Renderer>().material = bulletMat;

        // Shield Bubble
        shieldBubble = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        shieldBubble.transform.SetParent(playerShip.transform);
        shieldBubble.transform.localPosition = Vector3.zero;
        shieldBubble.transform.localScale = new Vector3(2.4f, 2.4f, 2.4f);
        shieldBubble.GetComponent<Renderer>().material = shieldMat;

        // Light
        var lightGo = new GameObject("ShipLight");
        lightGo.transform.SetParent(playerShip.transform);
        lightGo.transform.localPosition = new Vector3(0, 0.5f, 0);
        var l = lightGo.AddComponent<Light>();
        l.type = LightType.Point;
        l.range = 8f;
        l.intensity = 1.8f;
        l.color = new Color(0.3f, 0.9f, 1f);

        // Directional Sun Light
        var sunGo = new GameObject("StarSun");
        var sun = sunGo.AddComponent<Light>();
        sun.type = LightType.Directional;
        sun.intensity = 0.85f;
        sun.color = new Color(0.8f, 0.9f, 1f);
        sunGo.transform.rotation = Quaternion.Euler(55, 30, 0);
    }

    private void CreateStarfield()
    {
        for (int i = 0; i < 90; i++)
        {
            var s = GameObject.CreatePrimitive(PrimitiveType.Quad);
            s.name = "Star_" + i;
            float sz = UnityEngine.Random.Range(0.08f, 0.22f);
            s.transform.localScale = new Vector3(sz, sz, 1);
            s.transform.position = new Vector3(
                UnityEngine.Random.Range(-12f, 12f),
                -1f,
                UnityEngine.Random.Range(-10f, 15f)
            );
            s.transform.rotation = Quaternion.Euler(90, 0, 0);
            var m = new Material(shipMat);
            float b = UnityEngine.Random.Range(0.4f, 1f);
            m.color = new Color(b * 0.7f, b * 0.9f, b);
            s.GetComponent<Renderer>().material = m;
            stars.Add(s.transform);
        }
    }

    private void CreateParticleSystems()
    {
        // Engine trail
        var eGo = new GameObject("EngineTrail");
        eGo.transform.SetParent(playerShip.transform);
        eGo.transform.localPosition = new Vector3(0, 0, -1.0f);
        engineParticles = eGo.AddComponent<ParticleSystem>();
        var em = engineParticles.main;
        em.startSize = 0.25f;
        em.startLifetime = 0.35f;
        em.startSpeed = 6f;
        em.startColor = new Color(0.2f, 0.8f, 1f, 0.8f);
        em.simulationSpace = ParticleSystemSimulationSpace.World;
        var emission = engineParticles.emission;
        emission.rateOverTime = 40f;

        // Explosions
        var xGo = new GameObject("Explosions");
        explosionParticles = xGo.AddComponent<ParticleSystem>();
        var xm = explosionParticles.main;
        xm.startSize = 0.45f;
        xm.startLifetime = 0.5f;
        xm.startSpeed = 9f;
        xm.startColor = new Color(1f, 0.6f, 0.1f);
        xm.simulationSpace = ParticleSystemSimulationSpace.World;
        var xe = explosionParticles.emission;
        xe.rateOverTime = 0f;
    }

    private void ResetToStage(int index)
    {
        currentStageIndex = Mathf.Clamp(index, 0, stages.Length - 1);
        var stg = stages[currentStageIndex];

        mainCam.backgroundColor = stg.nebulaColor;

        playerPos = new Vector3(0, 0, -3.5f);
        playerShip.transform.position = playerPos;
        bankRoll = 0f;
        stageKills = 0;
        enemySpawnTimer = 0f;
        invulnerableTimer = 0.5f;
        camShake = 0f;

        // Clear existing bullets, enemies & powerups
        foreach (var b in playerBullets) if (b.go != null) Destroy(b.go);
        playerBullets.Clear();
        foreach (var b in enemyBullets) if (b.go != null) Destroy(b.go);
        enemyBullets.Clear();
        foreach (var e in enemies) if (e.go != null) Destroy(e.go);
        enemies.Clear();
        foreach (var p in powerups) if (p.go != null) Destroy(p.go);
        powerups.Clear();

        if (bossObject != null)
        {
            Destroy(bossObject);
            bossObject = null;
        }

        if (stg.isBossStage)
        {
            SpawnBoss();
        }

        state = GameState.Ready;
    }

    private void SpawnBoss()
    {
        var stg = stages[currentStageIndex];
        bossObject = new GameObject("BossLeviathan");
        bossObject.transform.position = new Vector3(0, 0, 7.5f);

        bossMaxHp = stg.id == 12 ? 3000f : 1500f;
        bossHp = bossMaxHp;
        bossPhase = 1;
        bossAttackTimer = 0f;

        // Main Hull
        var hull = GameObject.CreatePrimitive(PrimitiveType.Cube);
        hull.transform.SetParent(bossObject.transform);
        hull.transform.localPosition = Vector3.zero;
        hull.transform.localScale = new Vector3(5.5f, 1.2f, 3.2f);
        hull.GetComponent<Renderer>().material = bossMat;

        // Glowing Reactor Core
        var core = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        core.transform.SetParent(bossObject.transform);
        core.transform.localPosition = new Vector3(0, 0.4f, 0);
        core.transform.localScale = new Vector3(1.6f, 1.2f, 1.6f);
        var cMat = new Material(bossMat);
        cMat.color = Color.yellow;
        core.GetComponent<Renderer>().material = cMat;

        // Left Heavy Turret
        var turretL = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        turretL.transform.SetParent(bossObject.transform);
        turretL.transform.localPosition = new Vector3(-2.2f, 0.3f, -0.6f);
        turretL.transform.localScale = new Vector3(0.6f, 0.8f, 0.6f);
        turretL.transform.localRotation = Quaternion.Euler(90, 0, 0);
        turretL.GetComponent<Renderer>().material = cruiserMat;

        // Right Heavy Turret
        var turretR = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        turretR.transform.SetParent(bossObject.transform);
        turretR.transform.localPosition = new Vector3(2.2f, 0.3f, -0.6f);
        turretR.transform.localScale = new Vector3(0.6f, 0.8f, 0.6f);
        turretR.transform.localRotation = Quaternion.Euler(90, 0, 0);
        turretR.GetComponent<Renderer>().material = cruiserMat;

        PlaySound(bossAlarmClip, 0.9f);
    }

    void Update()
    {
        float dt = Time.deltaTime;

        if (Input.GetKeyDown(KeyCode.Escape))
        {
            showStageSelect = !showStageSelect;
        }

        // Camera Shake decay
        if (camShake > 0)
        {
            camShake = Mathf.Max(0, camShake - dt * 2.5f);
            mainCam.transform.position = new Vector3(
                UnityEngine.Random.Range(-camShake, camShake),
                16.5f + UnityEngine.Random.Range(-camShake, camShake) * 0.4f,
                -2.5f
            );
        }

        UpdateStars(dt);

        if (state == GameState.Ready)
        {
            if (Input.GetKeyDown(KeyCode.Space) || Input.GetMouseButtonDown(0))
            {
                state = GameState.Playing;
            }
        }
        else if (state == GameState.Playing)
        {
            UpdatePlayer(dt);
            UpdatePlayerBullets(dt);
            UpdateEnemySpawns(dt);
            UpdateEnemies(dt);
            UpdateEnemyBullets(dt);
            UpdatePowerups(dt);
            CheckCollisions();
            CheckStageProgression();
        }

        UpdateVisuals();
    }

    private void UpdateStars(float dt)
    {
        float starSpeed = (state == GameState.Playing ? 8.5f : 3.5f) * dt;
        for (int i = 0; i < stars.Count; i++)
        {
            var s = stars[i];
            s.position -= new Vector3(0, 0, starSpeed);
            if (s.position.z < -10f)
            {
                s.position = new Vector3(s.position.x, s.position.y, 14f);
            }
        }
    }

    private void UpdatePlayer(float dt)
    {
        // Controls: WASD, Arrow keys, or Mouse Drag
        float moveX = 0f;
        float moveZ = 0f;

        if (Input.GetKey(KeyCode.LeftArrow) || Input.GetKey(KeyCode.A)) moveX -= 1f;
        if (Input.GetKey(KeyCode.RightArrow) || Input.GetKey(KeyCode.D)) moveX += 1f;
        if (Input.GetKey(KeyCode.UpArrow) || Input.GetKey(KeyCode.W)) moveZ += 1f;
        if (Input.GetKey(KeyCode.DownArrow) || Input.GetKey(KeyCode.S)) moveZ -= 1f;

        // Mouse or Touch control
        if (Input.GetMouseButton(0) || Input.touchCount > 0)
        {
            Vector3 mouseScreen = Input.mousePosition;
            Ray ray = mainCam.ScreenPointToRay(mouseScreen);
            Plane plane = new Plane(Vector3.up, Vector3.zero);
            float dist;
            if (plane.Raycast(ray, out dist))
            {
                Vector3 target = ray.GetPoint(dist);
                float dx = target.x - playerPos.x;
                float dz = target.z - playerPos.z;
                moveX = Mathf.Clamp(dx * 4.5f, -1f, 1f);
                moveZ = Mathf.Clamp(dz * 4.5f, -1f, 1f);
            }
        }

        float speed = 10.5f;
        playerPos.x += moveX * speed * dt;
        playerPos.z += moveZ * speed * dt;

        playerPos.x = Mathf.Clamp(playerPos.x, -7.5f, 7.5f);
        playerPos.z = Mathf.Clamp(playerPos.z, -5.5f, 5.0f);

        // Bank Roll
        float targetRoll = -moveX * 35f;
        bankRoll = Mathf.Lerp(bankRoll, targetRoll, dt * 10f);

        // Auto Firing
        fireCooldown -= dt;
        if (fireCooldown <= 0f)
        {
            FireWeapons();
            fireCooldown = 0.14f;
        }

        // Nova Bomb (Space or B)
        bombCooldown -= dt;
        if ((Input.GetKeyDown(KeyCode.Space) || Input.GetKeyDown(KeyCode.B)) && bombs > 0 && bombCooldown <= 0f)
        {
            TriggerNovaBomb();
        }

        if (invulnerableTimer > 0) invulnerableTimer -= dt;
    }

    private void FireWeapons()
    {
        float bulletSpeed = 24f;

        if (weaponLevel == 1) // Dual Plasma
        {
            SpawnPlayerBullet(playerPos + new Vector3(-0.45f, 0, 0.4f), new Vector3(0, 0, bulletSpeed), 0);
            SpawnPlayerBullet(playerPos + new Vector3(0.45f, 0, 0.4f), new Vector3(0, 0, bulletSpeed), 0);
            PlaySound(laserClip, 0.35f);
        }
        else if (weaponLevel == 2) // Triple Spread
        {
            SpawnPlayerBullet(playerPos + new Vector3(0, 0, 0.5f), new Vector3(0, 0, bulletSpeed), 1);
            SpawnPlayerBullet(playerPos + new Vector3(-0.45f, 0, 0.3f), new Vector3(-3.5f, 0, bulletSpeed), 1);
            SpawnPlayerBullet(playerPos + new Vector3(0.45f, 0, 0.3f), new Vector3(3.5f, 0, bulletSpeed), 1);
            PlaySound(spreadClip, 0.4f);
        }
        else if (weaponLevel == 3) // Plasma Gatling + Homing Micro-Missiles
        {
            SpawnPlayerBullet(playerPos + new Vector3(-0.35f, 0, 0.5f), new Vector3(0, 0, bulletSpeed * 1.1f), 0);
            SpawnPlayerBullet(playerPos + new Vector3(0.35f, 0, 0.5f), new Vector3(0, 0, bulletSpeed * 1.1f), 0);
            SpawnPlayerBullet(playerPos + new Vector3(-1.1f, 0, 0), new Vector3(-2.5f, 0, bulletSpeed * 0.85f), 2);
            SpawnPlayerBullet(playerPos + new Vector3(1.1f, 0, 0), new Vector3(2.5f, 0, bulletSpeed * 0.85f), 2);
            PlaySound(missileClip, 0.45f);
        }
        else // Level 4 Hyper Particle Beam
        {
            for (int i = -2; i <= 2; i++)
            {
                SpawnPlayerBullet(playerPos + new Vector3(i * 0.35f, 0, 0.5f), new Vector3(i * 1.8f, 0, bulletSpeed * 1.25f), 3);
            }
            PlaySound(spreadClip, 0.5f);
        }
    }

    private void SpawnPlayerBullet(Vector3 pos, Vector3 vel, int type)
    {
        var go = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        go.transform.position = pos;
        go.transform.rotation = Quaternion.Euler(90, 0, 0);

        if (type == 2) // Missile
        {
            go.transform.localScale = new Vector3(0.2f, 0.5f, 0.2f);
            var m = new Material(bulletMat);
            m.color = Color.yellow;
            go.GetComponent<Renderer>().material = m;
        }
        else
        {
            go.transform.localScale = new Vector3(0.12f, 0.4f, 0.12f);
            go.GetComponent<Renderer>().material = bulletMat;
        }

        playerBullets.Add(new PlayerBullet { pos = pos, vel = vel, type = type, lifetime = 1.6f, go = go });
    }

    private void TriggerNovaBomb()
    {
        bombs--;
        bombCooldown = 1.0f;
        camShake = 0.8f;
        PlaySound(bombClip, 0.9f);

        // Wipe all enemy bullets
        foreach (var b in enemyBullets)
        {
            if (b.go != null) Destroy(b.go);
        }
        enemyBullets.Clear();

        // Damage all on-screen enemies
        for (int i = 0; i < enemies.Count; i++)
        {
            var e = enemies[i];
            e.hp -= 200f;
            enemies[i] = e;
        }

        if (bossObject != null)
        {
            bossHp -= 350f;
        }

        explosionParticles.transform.position = playerPos;
        explosionParticles.Emit(80);
    }

    private void UpdatePlayerBullets(float dt)
    {
        for (int i = playerBullets.Count - 1; i >= 0; i--)
        {
            var b = playerBullets[i];
            b.lifetime -= dt;

            // Homing logic for missiles (type 2)
            if (b.type == 2 && enemies.Count > 0)
            {
                Vector3 target = enemies[0].pos;
                Vector3 toTarget = (target - b.pos).normalized;
                b.vel = Vector3.Lerp(b.vel, toTarget * 20f, dt * 6f);
            }

            b.pos += b.vel * dt;

            if (b.go != null) b.go.transform.position = b.pos;

            if (b.lifetime <= 0f || b.pos.z > 9.0f)
            {
                if (b.go != null) Destroy(b.go);
                playerBullets.RemoveAt(i);
            }
            else
            {
                playerBullets[i] = b;
            }
        }
    }

    private void UpdateEnemySpawns(float dt)
    {
        var stg = stages[currentStageIndex];
        enemySpawnTimer += dt;

        if (enemySpawnTimer >= stg.spawnInterval)
        {
            enemySpawnTimer = 0f;

            float spawnX = UnityEngine.Random.Range(-6.8f, 6.8f);
            Vector3 pos = new Vector3(spawnX, 0, 8.5f);

            int type = 0;
            float roll = UnityEngine.Random.value;

            if (stg.hasAsteroids && roll < 0.25f) type = 3; // Asteroid
            else if (stg.hasStealth && roll < 0.45f) type = 4; // Stealth
            else if (stg.hasShieldDrones && roll < 0.6f) type = 5; // Shield Drone
            else if (roll < 0.45f) type = 1; // Fast
            else if (roll < 0.75f) type = 2; // Cruiser
            else type = 0; // Drone

            SpawnEnemy(pos, type, stg.enemySpeed);
        }
    }

    private void SpawnEnemy(Vector3 pos, int type, float baseSpeed)
    {
        var go = GameObject.CreatePrimitive(type == 3 ? PrimitiveType.Sphere : PrimitiveType.Cube);
        go.transform.position = pos;

        float hp = 20f;
        Vector3 vel = new Vector3(0, 0, -baseSpeed);

        if (type == 0) // Drone
        {
            go.transform.localScale = new Vector3(0.9f, 0.4f, 0.9f);
            go.GetComponent<Renderer>().material = droneMat;
            hp = 25f;
        }
        else if (type == 1) // Fast Interceptor
        {
            go.transform.localScale = new Vector3(0.7f, 0.35f, 1.2f);
            go.GetComponent<Renderer>().material = fastMat;
            vel = new Vector3(Mathf.Sin(Time.time * 4f) * 3f, 0, -baseSpeed * 1.35f);
            hp = 18f;
        }
        else if (type == 2) // Heavy Cruiser
        {
            go.transform.localScale = new Vector3(1.8f, 0.6f, 1.6f);
            go.GetComponent<Renderer>().material = cruiserMat;
            vel = new Vector3(0, 0, -baseSpeed * 0.7f);
            hp = 75f;
        }
        else if (type == 3) // Asteroid
        {
            float sz = UnityEngine.Random.Range(1.0f, 1.8f);
            go.transform.localScale = new Vector3(sz, sz, sz);
            go.GetComponent<Renderer>().material = asteroidMat;
            vel = new Vector3(UnityEngine.Random.Range(-1.2f, 1.2f), 0, -baseSpeed * 0.9f);
            hp = 60f;
        }
        else if (type == 4) // Stealth
        {
            go.transform.localScale = new Vector3(0.8f, 0.3f, 1.1f);
            var m = new Material(droneMat);
            m.color = new Color(0.3f, 0.1f, 0.4f, 0.4f);
            go.GetComponent<Renderer>().material = m;
            hp = 30f;
        }
        else if (type == 5) // Shield Drone
        {
            go.transform.localScale = new Vector3(1.2f, 0.5f, 1.2f);
            go.GetComponent<Renderer>().material = shieldMat;
            hp = 45f;
        }

        enemies.Add(new EnemyShip {
            pos = pos, vel = vel, type = type, hp = hp, maxHp = hp,
            shootTimer = UnityEngine.Random.Range(0.4f, 1.5f), isShielded = false, go = go
        });
    }

    private void UpdateEnemies(float dt)
    {
        for (int i = enemies.Count - 1; i >= 0; i--)
        {
            var e = enemies[i];
            e.pos += e.vel * dt;
            if (e.go != null) e.go.transform.position = e.pos;

            // Enemy firing
            e.shootTimer -= dt;
            if (e.shootTimer <= 0f && e.type != 3) // Asteroids don't shoot
            {
                e.shootTimer = UnityEngine.Random.Range(1.2f, 2.4f);
                if (e.type == 2) // Cruiser fires 3 spread shots
                {
                    SpawnEnemyBullet(e.pos, new Vector3(0, 0, -8.5f));
                    SpawnEnemyBullet(e.pos, new Vector3(-2f, 0, -8f));
                    SpawnEnemyBullet(e.pos, new Vector3(2f, 0, -8f));
                }
                else
                {
                    Vector3 dir = (playerPos - e.pos).normalized * 7.5f;
                    SpawnEnemyBullet(e.pos, dir);
                }
            }

            if (e.hp <= 0f)
            {
                // Destroyed!
                stageKills++;
                score += (int)e.maxHp * 5;
                if (score > bestScore)
                {
                    bestScore = score;
                    PlayerPrefs.SetInt("StarBlaster_BestScore", bestScore);
                }

                PlaySound(explodeClip, 0.65f);
                explosionParticles.transform.position = e.pos;
                explosionParticles.Emit(20);

                // Chance to drop powerup
                if (UnityEngine.Random.value < 0.22f)
                {
                    SpawnPowerup(e.pos);
                }

                if (e.go != null) Destroy(e.go);
                enemies.RemoveAt(i);
            }
            else if (e.pos.z < -6.5f)
            {
                if (e.go != null) Destroy(e.go);
                enemies.RemoveAt(i);
            }
            else
            {
                enemies[i] = e;
            }
        }

        // Update Boss (if active)
        if (bossObject != null)
        {
            bossAttackTimer += dt;
            // Boss side-to-side hovering
            float bx = Mathf.Sin(Time.time * 1.5f) * 4.5f;
            bossObject.transform.position = new Vector3(bx, 0, 5.5f);

            if (bossAttackTimer >= 1.4f)
            {
                bossAttackTimer = 0f;
                Vector3 bpos = bossObject.transform.position;

                // Spiral / Fan Barrage
                for (int a = -3; a <= 3; a++)
                {
                    SpawnEnemyBullet(bpos + new Vector3(a * 0.8f, 0, -1.0f), new Vector3(a * 1.8f, 0, -8.0f));
                }
                PlaySound(spreadClip, 0.5f);
            }

            if (bossHp <= 0f)
            {
                // Boss Defeated!
                PlaySound(explodeClip, 1.0f);
                PlaySound(clearClip, 0.9f);
                camShake = 1.2f;
                explosionParticles.transform.position = bossObject.transform.position;
                explosionParticles.Emit(120);

                Destroy(bossObject);
                bossObject = null;
                stageKills += 50;
                score += 5000;

                if (currentStageIndex >= stages.Length - 1)
                {
                    state = GameState.AllCleared;
                }
                else
                {
                    state = GameState.StageClear;
                }
            }
        }
    }

    private void SpawnEnemyBullet(Vector3 pos, Vector3 vel)
    {
        var go = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        go.transform.position = pos;
        go.transform.localScale = new Vector3(0.32f, 0.32f, 0.32f);
        go.GetComponent<Renderer>().material = enemyBulletMat;

        enemyBullets.Add(new EnemyBullet { pos = pos, vel = vel, go = go });
    }

    private void UpdateEnemyBullets(float dt)
    {
        for (int i = enemyBullets.Count - 1; i >= 0; i--)
        {
            var b = enemyBullets[i];
            b.pos += b.vel * dt;
            if (b.go != null) b.go.transform.position = b.pos;

            if (b.pos.z < -6.5f || b.pos.z > 10f || Mathf.Abs(b.pos.x) > 9.5f)
            {
                if (b.go != null) Destroy(b.go);
                enemyBullets.RemoveAt(i);
            }
            else
            {
                enemyBullets[i] = b;
            }
        }
    }

    private void SpawnPowerup(Vector3 pos)
    {
        float roll = UnityEngine.Random.value;
        int type = 0; // 0: Weapon Up, 1: Shield, 2: Bomb, 3: Score Gem
        if (roll < 0.4f) type = 0;
        else if (roll < 0.65f) type = 1;
        else if (roll < 0.85f) type = 2;
        else type = 3;

        var go = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        go.transform.position = pos;
        go.transform.localScale = new Vector3(0.55f, 0.15f, 0.55f);
        go.transform.rotation = Quaternion.Euler(90, 0, 0);

        var m = new Material(shipMat);
        if (type == 0) m.color = Color.green;
        else if (type == 1) m.color = Color.cyan;
        else if (type == 2) m.color = Color.red;
        else m.color = Color.yellow;
        go.GetComponent<Renderer>().material = m;

        powerups.Add(new PowerupItem { pos = pos, type = type, go = go });
    }

    private void UpdatePowerups(float dt)
    {
        for (int i = powerups.Count - 1; i >= 0; i--)
        {
            var p = powerups[i];
            p.pos += new Vector3(0, 0, -3.2f * dt);
            if (p.go != null)
            {
                p.go.transform.position = p.pos;
                p.go.transform.Rotate(0, 120f * dt, 0);
            }

            // Collection Check
            if (Vector3.Distance(p.pos, playerPos) < 1.3f)
            {
                PlaySound(powerupClip, 0.75f);
                if (p.type == 0) weaponLevel = Mathf.Min(4, weaponLevel + 1);
                else if (p.type == 1) shields = Mathf.Min(4, shields + 1);
                else if (p.type == 2) bombs = Mathf.Min(5, bombs + 1);
                else score += 1000;

                if (p.go != null) Destroy(p.go);
                powerups.RemoveAt(i);
            }
            else if (p.pos.z < -6.5f)
            {
                if (p.go != null) Destroy(p.go);
                powerups.RemoveAt(i);
            }
            else
            {
                powerups[i] = p;
            }
        }
    }

    private void CheckCollisions()
    {
        float shipRadius = 0.45f;

        // Player Bullets vs Enemies
        for (int b = playerBullets.Count - 1; b >= 0; b--)
        {
            var pb = playerBullets[b];
            bool bulletConsumed = false;

            for (int e = 0; e < enemies.Count; e++)
            {
                var en = enemies[e];
                float enRadius = en.type == 2 ? 1.0f : (en.type == 3 ? 0.9f : 0.6f);

                if (Vector3.Distance(pb.pos, en.pos) < (enRadius + 0.2f))
                {
                    float dmg = pb.type == 3 ? 45f : (pb.type == 2 ? 65f : 25f);
                    en.hp -= dmg;
                    enemies[e] = en;
                    bulletConsumed = true;
                    break;
                }
            }

            // Player Bullets vs Boss
            if (!bulletConsumed && bossObject != null)
            {
                if (Vector3.Distance(pb.pos, bossObject.transform.position) < 2.5f)
                {
                    float dmg = pb.type == 3 ? 45f : (pb.type == 2 ? 65f : 25f);
                    bossHp -= dmg;
                    bulletConsumed = true;
                }
            }

            if (bulletConsumed)
            {
                if (pb.go != null) Destroy(pb.go);
                playerBullets.RemoveAt(b);
            }
        }

        if (invulnerableTimer > 0f) return;

        // Enemy Bullets vs Player
        for (int b = enemyBullets.Count - 1; b >= 0; b--)
        {
            if (Vector3.Distance(enemyBullets[b].pos, playerPos) < (shipRadius + 0.25f))
            {
                if (enemyBullets[b].go != null) Destroy(enemyBullets[b].go);
                enemyBullets.RemoveAt(b);
                HitPlayer();
                return;
            }
        }

        // Enemies vs Player Body Collision
        for (int e = 0; e < enemies.Count; e++)
        {
            if (Vector3.Distance(enemies[e].pos, playerPos) < (shipRadius + 0.5f))
            {
                HitPlayer();
                return;
            }
        }
    }

    private void HitPlayer()
    {
        if (shields > 0)
        {
            shields--;
            invulnerableTimer = 1.4f;
            camShake = 0.55f;
            PlaySound(powerupClip, 0.8f);
            return;
        }

        // Fatal crash
        state = GameState.GameOver;
        camShake = 1.0f;
        PlaySound(explodeClip, 1.0f);
        explosionParticles.transform.position = playerPos;
        explosionParticles.Emit(60);
    }

    private void CheckStageProgression()
    {
        if (isEndless) return;

        var stg = stages[currentStageIndex];
        if (stg.isBossStage) return; // Boss stage clears on boss kill

        if (stageKills >= stg.targetKills)
        {
            PlaySound(clearClip, 0.9f);
            if (currentStageIndex >= stages.Length - 1)
            {
                state = GameState.AllCleared;
            }
            else
            {
                state = GameState.StageClear;
            }
        }
    }

    private void UpdateVisuals()
    {
        playerShip.transform.position = playerPos;
        playerShip.transform.rotation = Quaternion.Euler(0, 0, bankRoll);

        if (shieldBubble != null)
        {
            shieldBubble.SetActive(shields > 0);
            if (shields > 0)
            {
                float sc = 2.4f + Mathf.Sin(Time.time * 8f) * 0.12f;
                shieldBubble.transform.localScale = new Vector3(sc, sc, sc);
            }
        }
    }

    private void PlaySound(AudioClip clip, float vol = 1.0f)
    {
        if (clip != null) audioSource.PlayOneShot(clip, vol);
    }

    private void GenerateAudioClips()
    {
        laserClip = CreateSynthClip("laser", 0.15f, (t) => Mathf.Sin((1200f - t * 6000f) * Mathf.PI * 2f * t));
        spreadClip = CreateSynthClip("spread", 0.2f, (t) => Mathf.Sin((950f - t * 3500f) * Mathf.PI * 2f * t) * 0.8f);
        missileClip = CreateSynthClip("missile", 0.28f, (t) => (Mathf.PerlinNoise(t * 80f, 0) - 0.5f) * 0.7f + Mathf.Sin(t * 300f) * 0.3f);
        bombClip = CreateSynthClip("bomb", 0.65f, (t) => (UnityEngine.Random.value - 0.5f) * Mathf.Exp(-t * 3.5f));
        explodeClip = CreateSynthClip("boom", 0.45f, (t) => (UnityEngine.Random.value - 0.5f) * Mathf.Exp(-t * 5.5f));
        powerupClip = CreateSynthClip("prup", 0.35f, (t) => Mathf.Sin((440f + t * 880f) * Mathf.PI * 2f * t) * 0.6f);
        clearClip = CreateSynthClip("fanfare", 0.7f, (t) => Mathf.Sin((523.25f + t * 500f) * Mathf.PI * 2f * t) * 0.7f);
        bossAlarmClip = CreateSynthClip("alarm", 0.3f, (t) => Mathf.Sin(700f * Mathf.PI * 2f * t));
    }

    private AudioClip CreateSynthClip(string name, float duration, Func<float, float> waveFunc)
    {
        int sampleRate = 22050;
        int sampleCount = (int)(duration * sampleRate);
        var clip = AudioClip.Create(name, sampleCount, 1, sampleRate, false);
        float[] data = new float[sampleCount];
        for (int i = 0; i < sampleCount; i++)
        {
            float t = (float)i / sampleRate;
            data[i] = Mathf.Clamp(waveFunc(t), -1f, 1f);
        }
        clip.SetData(data, 0);
        return clip;
    }

    void OnGUI()
    {
        int w = Screen.width;
        int h = Screen.height;

        GUI.skin.label.fontSize = 14;
        GUI.skin.button.fontSize = 14;

        // Top Navigation Bar
        GUILayout.BeginArea(new Rect(15, 12, w - 30, 42));
        GUILayout.BeginHorizontal();

        GUI.color = Color.white;
        GUILayout.Label($"<b>STAR BLASTER 3D</b>", GUILayout.Width(150));

        // Language Switcher
        GUI.color = lang == BlasterLanguage.KO ? Color.cyan : Color.white;
        if (GUILayout.Button("KO", GUILayout.Width(45), GUILayout.Height(28))) lang = BlasterLanguage.KO;
        GUI.color = lang == BlasterLanguage.EN ? Color.cyan : Color.white;
        if (GUILayout.Button("EN", GUILayout.Width(45), GUILayout.Height(28))) lang = BlasterLanguage.EN;
        GUI.color = lang == BlasterLanguage.JA ? Color.cyan : Color.white;
        if (GUILayout.Button("JA", GUILayout.Width(45), GUILayout.Height(28))) lang = BlasterLanguage.JA;
        GUI.color = lang == BlasterLanguage.ES ? Color.cyan : Color.white;
        if (GUILayout.Button("ES", GUILayout.Width(45), GUILayout.Height(28))) lang = BlasterLanguage.ES;

        GUILayout.FlexibleSpace();

        // Stage Select
        GUI.color = showStageSelect ? Color.yellow : Color.white;
        string stagesLabel = GetText("스테이지 선택", "Stages", "ステージ選択", "Etapas");
        if (GUILayout.Button(stagesLabel, GUILayout.Width(110), GUILayout.Height(28)))
        {
            showStageSelect = !showStageSelect;
        }

        // Endless Toggle
        GUI.color = isEndless ? Color.green : Color.white;
        string endlessLabel = GetText("무한 모드", "Endless", "エンドレス", "Infinito");
        if (GUILayout.Button(endlessLabel, GUILayout.Width(95), GUILayout.Height(28)))
        {
            isEndless = !isEndless;
            ResetToStage(currentStageIndex);
        }

        GUILayout.EndHorizontal();
        GUILayout.EndArea();

        // HUD Overlay
        if (state == GameState.Playing || state == GameState.Ready)
        {
            var stg = stages[currentStageIndex];
            GUILayout.BeginArea(new Rect(20, 60, 320, 240));

            GUI.color = Color.white;
            string stageTitle = isEndless ? GetText("무한 성간 전투", "Endless Star War", "無限星間戦闘", "Guerra Estelar Infinita")
                                          : $"Stage {stg.id}: {GetStageName(stg)}";
            GUILayout.Label($"<size=17><b>{stageTitle}</b></size>");

            GUILayout.Space(4);
            string killsLabel = GetText("격추", "Kills", "撃墜", "Bajas");
            string targetLabel = isEndless ? "∞" : $"{stg.targetKills}";
            GUILayout.Label($"{killsLabel}: <b>{stageKills} / {targetLabel}</b>");

            GUILayout.Label($"Score: <b>{score}</b> (Best: {bestScore})");

            string shieldLabel = GetText("쉴드", "Shields", "シールド", "Escudos");
            string shieldIcons = shields > 0 ? "🛡️".Repeat(shields) : GetText("없음", "None", "なし", "Ninguno");
            GUILayout.Label($"{shieldLabel}: {shieldIcons}");

            string bombLabel = GetText("EMP 폭탄", "EMP Bombs", "EMP爆弾", "Bombas EMP");
            string bombIcons = bombs > 0 ? "💣".Repeat(bombs) : GetText("없음", "None", "なし", "Ninguno");
            GUILayout.Label($"{bombLabel}: {bombIcons}");

            string weaponLabel = GetText("무기", "Weapon", "武器", "Arma");
            GUILayout.Label($"{weaponLabel}: Lv.<b>{weaponLevel}</b>");

            // Boss HP Bar
            if (bossObject != null)
            {
                GUILayout.Space(6);
                GUI.color = Color.red;
                GUILayout.Label($"<b>⚠️ BOSS HP: {bossHp:0} / {bossMaxHp:0}</b>");
                Rect barRect = GUILayoutUtility.GetRect(220, 10);
                GUI.Box(barRect, "");
                GUI.Box(new Rect(barRect.x, barRect.y, barRect.width * (bossHp / bossMaxHp), barRect.height), "");
                GUI.color = Color.white;
            }

            GUILayout.EndArea();

            // Mobile Bomb Button
            if (bombs > 0)
            {
                Rect bombBtnRect = new Rect(w - 110, h - 85, 95, 65);
                GUI.color = Color.red;
                if (GUI.Button(bombBtnRect, $"<b>💣 BOMB\n({bombs})</b>"))
                {
                    TriggerNovaBomb();
                }
                GUI.color = Color.white;
            }
        }

        // Center Modals
        if (showStageSelect) RenderStageSelectModal(w, h);
        else if (state == GameState.Ready) RenderReadyModal(w, h);
        else if (state == GameState.StageClear) RenderStageClearModal(w, h);
        else if (state == GameState.GameOver) RenderGameOverModal(w, h);
        else if (state == GameState.AllCleared) RenderAllClearedModal(w, h);
    }

    private void RenderReadyModal(int w, int h)
    {
        var stg = stages[currentStageIndex];
        float mw = 430;
        float mh = 260;
        Rect r = new Rect((w - mw) * 0.5f, (h - mh) * 0.5f, mw, mh);
        GUI.Box(r, "");

        GUILayout.BeginArea(new Rect(r.x + 20, r.y + 15, r.width - 40, r.height - 30));
        GUI.color = Color.cyan;
        GUILayout.Label($"<size=22><b>STAGE {stg.id}: {GetStageName(stg)}</b></size>", GUILayout.Height(32));
        GUI.color = Color.white;

        GUILayout.Space(8);
        GUILayout.Label(GetStageDesc(stg));

        GUILayout.Space(8);
        string targetText = stg.isBossStage ? GetText("목표: 거대 보스 격침!", "Goal: Slay the Colossal Boss!", "目標：巨大ボス撃沈！", "Meta: ¡Destruye al Jefe Colosal!")
                                            : $"{GetText("목표 격추수", "Target Kills", "目標撃墜数", "Bajas Requeridas")}: <b>{stg.targetKills}</b>";
        GUILayout.Label(targetText);

        string controlInfo = GetText("조작: [마우스/터치 드래그] 이동 • [스페이스] EMP 폭탄",
                                     "Controls: [Mouse/Touch Drag] Move • [Space] EMP Bomb",
                                     "操作：[マウス/タッチドラッグ] 移動 • [Space] EMP爆弾",
                                     "Controles: [Arrastrar Ratón/Táctil] Mover • [Espacio] Bomba EMP");
        GUILayout.Label($"<color=#aaa>{controlInfo}</color>");

        GUILayout.FlexibleSpace();
        GUI.color = Color.green;
        string startBtn = GetText("출격 시작 (Launch)", "Launch Sortie", "出撃開始", "Iniciar Salida");
        if (GUILayout.Button($"<b>{startBtn}</b>", GUILayout.Height(44)))
        {
            state = GameState.Playing;
        }
        GUI.color = Color.white;

        GUILayout.EndArea();
    }

    private void RenderStageClearModal(int w, int h)
    {
        var stg = stages[currentStageIndex];
        float mw = 420;
        float mh = 260;
        Rect r = new Rect((w - mw) * 0.5f, (h - mh) * 0.5f, mw, mh);
        GUI.Box(r, "");

        GUILayout.BeginArea(new Rect(r.x + 20, r.y + 15, r.width - 40, r.height - 30));
        GUI.color = Color.yellow;
        GUILayout.Label($"<size=22><b>🎉 STAGE {stg.id} {GetText("완료!", "CLEARED!", "クリア！", "¡COMPLETADA!")}</b></size>", GUILayout.Height(32));
        GUI.color = Color.white;

        GUILayout.Space(8);
        GUILayout.Label($"{GetText("적기 격추수", "Enemies Destroyed", "撃墜数", "Enemigos Destruidos")}: <b>{stageKills}</b>");
        GUILayout.Label($"Score: <b>{score}</b> (Best: {bestScore})");

        GUILayout.FlexibleSpace();
        GUI.color = Color.green;
        string nextBtn = GetText("다음 스테이지 출격 ▶", "Next Sortie ▶", "次ステージ出撃 ▶", "Siguiente Salida ▶");
        if (GUILayout.Button($"<b>{nextBtn}</b>", GUILayout.Height(44)))
        {
            ResetToStage(currentStageIndex + 1);
            state = GameState.Playing;
        }
        GUI.color = Color.white;

        GUILayout.EndArea();
    }

    private void RenderGameOverModal(int w, int h)
    {
        float mw = 420;
        float mh = 260;
        Rect r = new Rect((w - mw) * 0.5f, (h - mh) * 0.5f, mw, mh);
        GUI.Box(r, "");

        GUILayout.BeginArea(new Rect(r.x + 20, r.y + 15, r.width - 40, r.height - 30));
        GUI.color = Color.red;
        GUILayout.Label($"<size=22><b>💥 {GetText("함선 격침!", "SHIP DESTROYED!", "撃沈破!", "¡NAVE DESTRUIDA!")}</b></size>", GUILayout.Height(32));
        GUI.color = Color.white;

        GUILayout.Space(8);
        GUILayout.Label($"{GetText("최종 격추수", "Final Kills", "最終撃墜数", "Bajas Finales")}: <b>{stageKills}</b>");
        GUILayout.Label($"Score: <b>{score}</b> (Best: {bestScore})");

        GUILayout.FlexibleSpace();
        GUILayout.BeginHorizontal();

        GUI.color = Color.yellow;
        string retryBtn = GetText("재출격 (Retry)", "Sortie Again", "再出撃", "Reintentar");
        if (GUILayout.Button($"<b>{retryBtn}</b>", GUILayout.Height(44)))
        {
            ResetToStage(currentStageIndex);
            state = GameState.Playing;
        }

        GUI.color = Color.white;
        string menuBtn = GetText("스테이지 목록", "Stage Select", "ステージ選択", "Etapas");
        if (GUILayout.Button($"<b>{menuBtn}</b>", GUILayout.Height(44)))
        {
            showStageSelect = true;
        }

        GUILayout.EndHorizontal();
        GUILayout.EndArea();
    }

    private void RenderAllClearedModal(int w, int h)
    {
        float mw = 460;
        float mh = 290;
        Rect r = new Rect((w - mw) * 0.5f, (h - mh) * 0.5f, mw, mh);
        GUI.Box(r, "");

        GUILayout.BeginArea(new Rect(r.x + 20, r.y + 15, r.width - 40, r.height - 30));
        GUI.color = Color.yellow;
        GUILayout.Label($"<size=23><b>🏆 {GetText("12스테이지 전 은하 제패!", "ALL 12 STAGES CONQUERED!", "全12星域制覇！", "¡TODAS LAS ETAPAS SUPERADAS!")}</b></size>", GUILayout.Height(34));
        GUI.color = Color.white;

        GUILayout.Space(8);
        GUILayout.Label(GetText("축하합니다! 보이드 오버로드 총사령함을 격침하고 은하계의 평화를 되찾았습니다.",
                                "Incredible victory! You crushed the Void Overlord and restored peace to the galaxy.",
                                "大勝利おめでとうございます！虚空の旗艦を撃沈し、銀河に平和を取り戻しました。",
                                "¡Victoria suprema! Has destruido la nave insignia del Vacío y liberado la galaxia."));

        GUILayout.Space(8);
        GUILayout.Label($"Final Score: <b>{score}</b>");

        GUILayout.FlexibleSpace();
        GUI.color = Color.green;
        string endlessBtn = GetText("무한 모드 도전 ▶", "Challenge Endless Mode ▶", "無限モード挑戦 ▶", "Modo Infinito ▶");
        if (GUILayout.Button($"<b>{endlessBtn}</b>", GUILayout.Height(44)))
        {
            isEndless = true;
            ResetToStage(0);
            state = GameState.Playing;
        }
        GUI.color = Color.white;

        GUILayout.EndArea();
    }

    private void RenderStageSelectModal(int w, int h)
    {
        float mw = Mathf.Min(680, w - 30);
        float mh = Mathf.Min(480, h - 30);
        Rect r = new Rect((w - mw) * 0.5f, (h - mh) * 0.5f, mw, mh);
        GUI.Box(r, "");

        GUILayout.BeginArea(new Rect(r.x + 15, r.y + 15, r.width - 30, r.height - 30));
        GUILayout.BeginHorizontal();
        GUI.color = Color.cyan;
        GUILayout.Label($"<size=20><b>{GetText("스테이지 선택 (12 Stages)", "Select Stage (12 Stages)", "ステージ選択 (全12ステージ)", "Seleccionar Etapa (12 Etapas)")}</b></size>");
        GUI.color = Color.white;
        GUILayout.FlexibleSpace();
        if (GUILayout.Button("✕", GUILayout.Width(35), GUILayout.Height(28)))
        {
            showStageSelect = false;
        }
        GUILayout.EndHorizontal();

        GUILayout.Space(10);

        for (int row = 0; row < 3; row++)
        {
            GUILayout.BeginHorizontal();
            for (int col = 0; col < 4; col++)
            {
                int idx = row * 4 + col;
                if (idx < stages.Length)
                {
                    var stg = stages[idx];
                    GUI.color = idx == currentStageIndex ? Color.cyan : Color.white;

                    string btnText = $"<b>Stage {stg.id}</b>\n<size=11>{GetStageName(stg)}</size>";
                    if (GUILayout.Button(btnText, GUILayout.Height(85), GUILayout.Width((r.width - 50) / 4f)))
                    {
                        showStageSelect = false;
                        isEndless = false;
                        ResetToStage(idx);
                        state = GameState.Ready;
                    }
                }
            }
            GUILayout.EndHorizontal();
            GUILayout.Space(6);
        }

        GUI.color = Color.white;
        GUILayout.EndArea();
    }

    private string GetText(string ko, string en, string ja, string es)
    {
        switch (lang)
        {
            case BlasterLanguage.KO: return ko;
            case BlasterLanguage.EN: return en;
            case BlasterLanguage.JA: return ja;
            case BlasterLanguage.ES: return es;
            default: return en;
        }
    }

    private string GetStageName(StageData s)
    {
        switch (lang)
        {
            case BlasterLanguage.KO: return s.nameKo;
            case BlasterLanguage.EN: return s.nameEn;
            case BlasterLanguage.JA: return s.nameJa;
            case BlasterLanguage.ES: return s.nameEs;
            default: return s.nameEn;
        }
    }

    private string GetStageDesc(StageData s)
    {
        switch (lang)
        {
            case BlasterLanguage.KO: return s.descKo;
            case BlasterLanguage.EN: return s.descEn;
            case BlasterLanguage.JA: return s.descJa;
            case BlasterLanguage.ES: return s.descEs;
            default: return s.descEn;
        }
    }
}
