using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public enum DefenseLanguage { KO, EN, JA, ES }

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

public class OrbitalDefensePlayer : MonoBehaviour
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
        public int targetEnemies;
        public float spawnInterval;
        public float enemySpeed;
        public bool hasHeavy;
        public bool hasFast;
        public bool isBossStage;
        public float bossHealth; // 0 = the hand-made sectors' 2200 / 4000
        public Color spaceColor;
        public Color planetColor;
    }

    public class TurretSlot
    {
        public int id;
        public int ringIndex;
        public float angle;
        public Vector3 pos;
        public int turretType; // 0: None, 1: Laser, 2: Missile, 3: Flak, 4: Plasma Beam
        public int level;
        public float fireCooldown;
        public GameObject slotGo;
        public GameObject turretGo;
    }

    public struct DefenseBullet
    {
        public Vector3 pos;
        public Vector3 vel;
        public int type; // 0: Laser, 1: Missile, 2: Flak, 3: Beam
        public int targetEnemyIdx;
        public float lifetime;
        public GameObject go;
    }

    public struct OrbitalThreat
    {
        public Vector3 pos;
        public Vector3 vel;
        public int type; // 0: Meteor, 1: Scout, 2: Heavy Cruiser, 10: Boss
        public float hp;
        public float maxHp;
        public float radius;
        public GameObject go;
    }

    // Audio clips
    private AudioSource audioSource;
    private AudioClip laserClip;
    private AudioClip missileClip;
    private AudioClip flakClip;
    private AudioClip explodeClip;
    private AudioClip buildClip;
    private AudioClip warningClip;
    private AudioClip clearClip;

    // Game state
    private GameState state = GameState.Ready;
    private DefenseLanguage lang = DefenseLanguage.KO;

    // Page language beyond the game's own four (scripts/unity/oiyo-i18n).
    string LangCode() => lang == DefenseLanguage.EN ? OiyoI18n.ForEnglish : lang.ToString().ToLowerInvariant();
    string U(string en) => OiyoI18n.Ui(en, LangCode());
    string F(string en, params object[] args) => string.Format(U(en), args);
    private int currentStageIndex = 0;
    private bool isEndless = false;
    private bool showStageSelect = false;
    private Vector2 stageSelectScroll;

    // Planet Stats
    private GameObject planetRoot;
    private GameObject planetSphere;
    private GameObject shieldBubble;
    private float planetHp = 100f;
    private float maxPlanetHp = 100f;
    private float shieldHp = 50f;
    private float maxShieldHp = 50f;
    private int credits = 250;
    private int score = 0;
    private int bestScore = 0;
    private int enemiesDestroyed = 0;
    private int totalSpawned = 0;
    private int selectedSlotId = -1;

    // Collections
    private List<TurretSlot> slots = new List<TurretSlot>();
    private List<DefenseBullet> bullets = new List<DefenseBullet>();
    private List<OrbitalThreat> threats = new List<OrbitalThreat>();
    private List<Transform> orbitalRings = new List<Transform>();

    // Boss Data
    private GameObject bossMothership;
    private float bossHp = 2500f;
    private float bossMaxHp = 2500f;
    private float bossAngle = 0f;

    // Visual juice
    private Camera mainCam;
    private float camShake = 0f;
    private ParticleSystem sparkParticles;

    // Materials
    private Material planetMat;
    private Material ringMat;
    private Material slotMat;
    private Material laserMat;
    private Material missileMat;
    private Material flakMat;
    private Material meteorMat;
    private Material alienMat;
    private Material shieldMat;
    private Material bossMat;

    private float threatSpawnTimer = 0f;

    // 12 hand-made sectors; 13-30 are appended by AddAdvancedStages()
    private StageData[] stages = new StageData[]
    {
        new StageData {
            id = 1,
            nameKo = "달 궤도 외곽", nameEn = "Moon Orbit Perimeter", nameJa = "月軌道 外郭", nameEs = "Perímetro Lunar",
            descKo = "접근하는 우주 유성우를 요격하고 방어 포탑을 건설하세요.",
            descEn = "Intercept incoming meteor showers and construct defense turrets.",
            descJa = "接近する宇宙流星群を迎撃し、防衛砲塔を建設しましょう。",
            descEs = "Intercepta lluvias de meteoros y construye torretas defensivas.",
            targetEnemies = 20, spawnInterval = 1.6f, enemySpeed = 2.4f,
            spaceColor = new Color(0.02f, 0.04f, 0.12f), planetColor = new Color(0.1f, 0.6f, 0.9f)
        },
        new StageData {
            id = 2,
            nameKo = "소행성 유입 지대", nameEn = "Asteroid Influx Zone", nameJa = "小惑星流入地帯", nameEs = "Afluencia de Asteroides",
            descKo = "밀집된 암석 파편을 파쇄하고 채굴 크레딧을 확보하세요.",
            descEn = "Blast dense clusters of tumbling asteroids and secure mineral credits.",
            descJa = "密集した岩石破片を粉砕し、採掘クレジットを確保しましょう。",
            descEs = "Destruye cúmulos densos de asteroides y obtén créditos.",
            targetEnemies = 30, spawnInterval = 1.4f, enemySpeed = 2.8f,
            spaceColor = new Color(0.05f, 0.08f, 0.15f), planetColor = new Color(0.2f, 0.8f, 0.6f)
        },
        new StageData {
            id = 3,
            nameKo = "외계 정찰 드론 편대", nameEn = "Alien Recon Scouts", nameJa = "異星偵察ドローン編隊", nameEs = "Drones de Reconocimiento",
            descKo = "지그재그로 선회하며 침투하는 고속 정찰 편대를 미사일로 요격하세요.",
            descEn = "Counter agile recon drones executing evasive orbital maneuvers.",
            descJa = "ジグザグに旋回侵入する高速偵察編隊をミサイルで迎撃！",
            descEs = "Intercepta drones de reconocimiento ágiles con misiles guiados.",
            targetEnemies = 42, spawnInterval = 1.25f, enemySpeed = 3.6f, hasFast = true,
            spaceColor = new Color(0.12f, 0.04f, 0.18f), planetColor = new Color(0.8f, 0.2f, 0.9f)
        },
        new StageData {
            id = 4,
            nameKo = "플라즈마 드롭 포드", nameEn = "Plasma Drop Pods", nameJa = "プラズマ降下ポッド", nameEs = "Cápsulas de Plasma",
            descKo = "행성 표면으로 직하강하는 고중량 침투 포드를 선제 파괴하세요.",
            descEn = "Destroy high-impact assault pods diving straight toward the core.",
            descJa = "惑星表面へ垂直降下する高重量侵入ポッドを先制破壊！",
            descEs = "Destruye cápsulas de asalto que caen directamente hacia el núcleo.",
            targetEnemies = 55, spawnInterval = 1.15f, enemySpeed = 3.2f,
            spaceColor = new Color(0.04f, 0.12f, 0.2f), planetColor = new Color(0.1f, 0.9f, 0.8f)
        },
        new StageData {
            id = 5,
            nameKo = "태양 복사 폭풍", nameEn = "Solar Radiation Tempest", nameJa = "太陽放射嵐", nameEs = "Tormenta de Radiación",
            descKo = "작열하는 고열 플라즈마 파편과 대형 운석 복합 공습 방어!",
            descEn = "Defend against blistering solar plasma flares and heavy meteor storms.",
            descJa = "灼熱の高熱プラズマ破片と大型隕石の複合空襲を防衛！",
            descEs = "Defiéndete de llamaradas de plasma solar y densos meteoros.",
            targetEnemies = 68, spawnInterval = 1.05f, enemySpeed = 3.5f,
            spaceColor = new Color(0.2f, 0.08f, 0.04f), planetColor = new Color(1.0f, 0.6f, 0.1f)
        },
        new StageData {
            id = 6,
            nameKo = "중폭격기 함대", nameEn = "Heavy Siege Bombers", nameJa = "重爆撃機 艦隊", nameEs = "Bombarderos Pesados",
            descKo = "강력한 장갑을 두른 외계 공성 폭격함의 집중 포격을 막아내세요.",
            descEn = "Withstand heavy artillery barrages from heavily armored siege cruisers.",
            descJa = "強固な装甲を誇る異星攻城爆撃艦の集中砲火を食い止めよ。",
            descEs = "Resiste bombardeos de artillería de cruceros pesados blindados.",
            targetEnemies = 82, spawnInterval = 1.0f, enemySpeed = 2.6f, hasHeavy = true,
            spaceColor = new Color(0.18f, 0.04f, 0.08f), planetColor = new Color(0.9f, 0.2f, 0.3f)
        },
        new StageData {
            id = 7,
            nameKo = "EMP 교란 전자기파", nameEn = "EMP Disruption Wave", nameJa = "EMP電磁波妨害", nameEs = "Onda de Disrupción EMP",
            descKo = "교란체 침투로 쉴드가 일시 정지됩니다. 플랙 대공포로 제압하세요!",
            descEn = "EMP disruptors scramble orbital shields. Rely on flak cannons!",
            descJa = "妨害波でシールドが一時停止。高角対空砲で制圧せよ！",
            descEs = "Interferencias EMP desactivan escudos. ¡Confía en cañones flak!",
            targetEnemies = 98, spawnInterval = 0.9f, enemySpeed = 3.8f, hasFast = true,
            spaceColor = new Color(0.08f, 0.04f, 0.25f), planetColor = new Color(0.5f, 0.2f, 1.0f)
        },
        new StageData {
            id = 8,
            nameKo = "모함 강습 공습", nameEn = "Carrier Swarm Onslaught", nameJa = "空母強襲大編隊", nameEs = "Asalto de Enjambres",
            descKo = "사방에서 쏟아지는 수십 대의 소형 자폭 드론 세례를 격퇴하세요.",
            descEn = "Repel massive waves of fast kamikaze drones swarming from all angles.",
            descJa = "四方から押し寄せる数十機の小型自爆ドローンを撃滅せよ。",
            descEs = "Repele enjambres masivos de drones suicidas en todos los ángulos.",
            targetEnemies = 115, spawnInterval = 0.8f, enemySpeed = 4.2f, hasFast = true, hasHeavy = true,
            spaceColor = new Color(0.04f, 0.16f, 0.16f), planetColor = new Color(0.2f, 1.0f, 0.5f)
        },
        new StageData {
            id = 9,
            nameKo = "반물질 집속 유성군", nameEn = "Antimatter Cluster", nameJa = "反物質集束流星群", nameEs = "Cúmulo de Antimateria",
            descKo = "폭발 시 광역 충격을 가하는 불안정한 반물질 코어 유성을 원거리 격추!",
            descEn = "Snipe unstable antimatter asteroids before they detonate near the orbit.",
            descJa = "爆発時に広域衝撃波を放つ不安定な反物質コア隕石を遠距離撃破！",
            descEs = "Destruye asteroides de antimateria inestables a gran distancia.",
            targetEnemies = 135, spawnInterval = 0.75f, enemySpeed = 3.4f,
            spaceColor = new Color(0.22f, 0.05f, 0.15f), planetColor = new Color(1.0f, 0.3f, 0.7f)
        },
        new StageData {
            id = 10,
            nameKo = "보스: 외계 침공 모함", nameEn = "Boss: Dread Mothership", nameJa = "ボス：異星侵攻母艦", nameEs = "Jefe: Nave Nodriza Abisal",
            descKo = "회전 쉴드와 대구경 궤도 레이저를 발사하는 거대 외계 모함 격침!",
            descEn = "Annihilate the colossal Alien Mothership bristling with heavy lasers!",
            descJa = "回転シールドと大口径ビーム砲を装備した超巨大異星母艦を撃沈せよ！",
            descEs = "¡Destruye la titánica Nave Nodriza alienígena y sus rayos orbitales!",
            targetEnemies = 160, spawnInterval = 1.1f, enemySpeed = 2.8f, isBossStage = true,
            spaceColor = new Color(0.3f, 0.02f, 0.05f), planetColor = new Color(1.0f, 0.1f, 0.2f)
        },
        new StageData {
            id = 11,
            nameKo = "심연의 공허 침공", nameEn = "Deep Void Swarm", nameJa = "深淵の虚空大侵攻", nameEs = "Invasión del Vacío Profundo",
            descKo = "360도 전방위에서 쏟아지는 초고밀도 포위망을 뚫고 생존하세요.",
            descEn = "Survive an overwhelming 360-degree siege from deep void armada.",
            descJa = "360度全方位から押し寄せる超高密度包囲網を突破し生き残れ。",
            descEs = "Sobrevive a un asedio abrumador en 360 grados desde el vacío profundo.",
            targetEnemies = 200, spawnInterval = 0.65f, enemySpeed = 4.4f, hasFast = true, hasHeavy = true,
            spaceColor = new Color(0.1f, 0.02f, 0.22f), planetColor = new Color(0.7f, 0.4f, 1.0f)
        },
        new StageData {
            id = 12,
            nameKo = "은하 핵 최종 방어전", nameEn = "Galactic Core Finale", nameJa = "銀河中核 最終防衛戦", nameEs = "Gran Final del Núcleo Galáctico",
            descKo = "은하계의 운명이 걸린 12단계 궁극의 행성 수호 피날레!",
            descEn = "The ultimate 12th sector climax to defend the cradle of the galaxy!",
            descJa = "銀河の運命が懸かった全12セクター究極の惑星防衛完結編！",
            descEs = "¡El clímax supremo para defender la cuna de la galaxia!",
            targetEnemies = 250, spawnInterval = 0.6f, enemySpeed = 4.6f, hasFast = true, hasHeavy = true, isBossStage = true,
            spaceColor = new Color(0.35f, 0.2f, 0.04f), planetColor = new Color(1.0f, 0.85f, 0.2f)
        }
    };

    void Awake()
    {
        switch (OiyoLang.Pick("ko", "en", "ja", "es")) { case "en": lang = DefenseLanguage.EN; break; case "ja": lang = DefenseLanguage.JA; break; case "es": lang = DefenseLanguage.ES; break; default: lang = DefenseLanguage.KO; break; }
        Application.targetFrameRate = 60;
        mainCam = Camera.main;
        if (mainCam == null)
        {
            var camGo = new GameObject("MainCamera");
            mainCam = camGo.AddComponent<Camera>();
            camGo.tag = "MainCamera";
        }
        mainCam.backgroundColor = new Color(0.02f, 0.03f, 0.08f);
        mainCam.clearFlags = CameraClearFlags.SolidColor;
        mainCam.transform.position = new Vector3(0, 22.0f, -0.5f);
        mainCam.transform.rotation = Quaternion.Euler(90f, 0, 0);

        audioSource = gameObject.AddComponent<AudioSource>();
        audioSource.playOnAwake = false;

        GenerateAudioClips();
        CreateMaterials();
        CreatePlanetAndRings();
        CreateTurretSlots();
        CreateParticleSystems();

        bestScore = PlayerPrefs.GetInt("OrbitalDefense_BestScore", 0);
        AddAdvancedStages();
        ResetToStage(0);
    }

    // ---- Painted art (scripts/make_art.py -> Resources/OD/Art) ----
    private static readonly Dictionary<string, Material> artMats = new Dictionary<string, Material>();
    private Material spaceMat;
    private GameObject planetArt;

    private static Material ArtMat(string tex, bool blended = false)
    {
        string key = tex + (blended ? "#b" : "");
        if (!artMats.TryGetValue(key, out var m))
        {
            var sh = blended ? null : Shader.Find("OIYO/UnlitCutout");
            m = new Material(sh != null ? sh : Shader.Find("Sprites/Default"));
            var t = Resources.Load<Texture2D>("OD/Art/" + tex);
            if (t != null) { t.wrapMode = TextureWrapMode.Clamp; m.mainTexture = t; }
            m.color = Color.white;
            artMats[key] = m;
        }
        return m;
    }

    // Flat sprite seen by the top-down camera; art "up" points along +z, turned by yawDeg.
    private static GameObject FlatSprite(string name, string tex, float size, float yawDeg = 0f, bool blended = false)
    {
        var go = GameObject.CreatePrimitive(PrimitiveType.Quad);
        go.name = name;
        Destroy(go.GetComponent<Collider>());
        go.transform.rotation = Quaternion.Euler(90f, yawDeg, 0f);
        go.transform.localScale = new Vector3(size, size, 1f);
        go.GetComponent<Renderer>().material = ArtMat(tex, blended);
        return go;
    }

    private static float Yaw(Vector3 v) => Mathf.Atan2(v.x, v.z) * Mathf.Rad2Deg;

    private void CreateMaterials()
    {
        var shader = Shader.Find("Mobile/Diffuse");
        if (shader == null) shader = Shader.Find("Diffuse");
        if (shader == null) shader = Shader.Find("Standard");

        planetMat = new Material(shader);
        planetMat.color = stages[0].planetColor;

        ringMat = new Material(shader);
        ringMat.color = new Color(0.2f, 0.4f, 0.8f, 0.35f);

        slotMat = new Material(shader);
        slotMat.color = new Color(0.3f, 0.35f, 0.45f);

        laserMat = new Material(shader);
        laserMat.color = new Color(0.0f, 0.95f, 1.0f);

        missileMat = new Material(shader);
        missileMat.color = new Color(1.0f, 0.85f, 0.1f);

        flakMat = new Material(shader);
        flakMat.color = new Color(1.0f, 0.4f, 0.1f);

        meteorMat = new Material(shader);
        meteorMat.color = new Color(0.45f, 0.35f, 0.3f);

        alienMat = new Material(shader);
        alienMat.color = new Color(0.9f, 0.15f, 0.25f);

        shieldMat = new Material(shader);
        shieldMat.color = new Color(0.1f, 0.8f, 1.0f, 0.4f);

        bossMat = new Material(shader);
        bossMat.color = new Color(0.6f, 0.1f, 0.15f);
    }

    private void CreatePlanetAndRings()
    {
        planetRoot = new GameObject("PlanetRoot");
        planetRoot.transform.position = Vector3.zero;

        // Central Planet Sphere (Radius 2.2m)
        planetSphere = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        planetSphere.name = "PlanetSphere";
        planetSphere.transform.SetParent(planetRoot.transform);
        planetSphere.transform.localPosition = Vector3.zero;
        planetSphere.transform.localScale = new Vector3(4.4f, 4.4f, 4.4f);
        planetSphere.GetComponent<Renderer>().material = planetMat;
        var ptex = Resources.Load<Texture2D>("OD/Art/planet");
        if (ptex != null) planetMat.mainTexture = ptex;

        // Painted star field far below the playfield
        spaceMat = ArtMat("space");
        spaceMat.renderQueue = 1000;
        var sky = FlatSprite("SpaceBackdrop", "space", 60f);
        sky.transform.position = new Vector3(0f, -12f, 0f);

        // Shield Bubble
        shieldBubble = FlatSprite("ShieldRing", "shield", 5.2f, 0f, true);
        shieldBubble.transform.SetParent(planetRoot.transform);
        shieldBubble.transform.localPosition = new Vector3(0f, 2.4f, 0f);

        // 3 Orbital Wire Rings
        float[] ringRadii = new float[] { 3.6f, 5.4f, 7.2f };
        for (int r = 0; r < 3; r++)
        {
            float rad = ringRadii[r];
            var ringGo = new GameObject("Ring_" + r);
            ringGo.transform.SetParent(planetRoot.transform);

            // Approximate ring with 32 small cylinder segments
            int segs = 32;
            for (int s = 0; s < segs; s++)
            {
                float a1 = (float)s / segs * Mathf.PI * 2f;
                float a2 = (float)(s + 1) / segs * Mathf.PI * 2f;
                Vector3 p1 = new Vector3(Mathf.Cos(a1) * rad, 0, Mathf.Sin(a1) * rad);
                Vector3 p2 = new Vector3(Mathf.Cos(a2) * rad, 0, Mathf.Sin(a2) * rad);

                var seg = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                seg.transform.SetParent(ringGo.transform);
                seg.transform.position = (p1 + p2) * 0.5f;
                seg.transform.localScale = new Vector3(0.04f, Vector3.Distance(p1, p2) * 0.5f, 0.04f);
                seg.transform.rotation = Quaternion.FromToRotation(Vector3.up, p2 - p1);
                seg.GetComponent<Renderer>().material = ringMat;
            }
            orbitalRings.Add(ringGo.transform);
        }

        // Directional Light
        var sunGo = new GameObject("SpaceLight");
        var sun = sunGo.AddComponent<Light>();
        sun.type = LightType.Directional;
        sun.intensity = 0.8f;
        sun.color = new Color(0.85f, 0.9f, 1f);
        sunGo.transform.rotation = Quaternion.Euler(50, -30, 0);
    }

    private void CreateTurretSlots()
    {
        // Ring 1 (Radius 3.6m): 4 slots
        // Ring 2 (Radius 5.4m): 6 slots
        // Ring 3 (Radius 7.2m): 8 slots
        int[] counts = new int[] { 4, 6, 8 };
        float[] radii = new float[] { 3.6f, 5.4f, 7.2f };
        int slotId = 0;

        for (int r = 0; r < 3; r++)
        {
            int n = counts[r];
            float rad = radii[r];
            for (int i = 0; i < n; i++)
            {
                float angle = (float)i / n * Mathf.PI * 2f;
                Vector3 pos = new Vector3(Mathf.Cos(angle) * rad, 0.15f, Mathf.Sin(angle) * rad);

                var slotGo = FlatSprite("Slot_" + slotId, "pad", 0.95f);
                slotGo.transform.position = pos;

                slots.Add(new TurretSlot
                {
                    id = slotId++,
                    ringIndex = r,
                    angle = angle,
                    pos = pos,
                    turretType = 0,
                    level = 1,
                    fireCooldown = 0f,
                    slotGo = slotGo,
                    turretGo = null
                });
            }
        }
    }

    private void CreateParticleSystems()
    {
        var sGo = new GameObject("SparkParticles");
        sparkParticles = sGo.AddComponent<ParticleSystem>();
        var sm = sparkParticles.main;
        sm.startSize = 0.35f;
        sm.startLifetime = 0.5f;
        sm.startSpeed = 9f;
        sm.startColor = Color.cyan;
        sm.simulationSpace = ParticleSystemSimulationSpace.World;
        sGo.GetComponent<ParticleSystemRenderer>().material = ArtMat("spark", true); // WebGL has no default particle material
        var se = sparkParticles.emission;
        se.rateOverTime = 0f;
    }

    private void ResetToStage(int index)
    {
        currentStageIndex = Mathf.Clamp(index, 0, stages.Length - 1);
        var stg = stages[currentStageIndex];

        mainCam.backgroundColor = stg.spaceColor;
        planetMat.color = Color.Lerp(Color.white, stg.planetColor, 0.45f); // tint the painted globe toward the sector colour

        planetHp = maxPlanetHp;
        shieldHp = maxShieldHp;
        credits = 250;
        enemiesDestroyed = 0;
        totalSpawned = 0;
        selectedSlotId = -1;
        camShake = 0f;

        // Clear existing threats & bullets
        foreach (var t in threats) if (t.go != null) Destroy(t.go);
        threats.Clear();
        foreach (var b in bullets) if (b.go != null) Destroy(b.go);
        bullets.Clear();

        if (bossMothership != null)
        {
            Destroy(bossMothership);
            bossMothership = null;
        }

        if (stg.isBossStage)
        {
            SpawnBoss();
        }

        // Grant initial starter turrets if empty
        if (slots[0].turretType == 0) BuildTurret(0, 1);
        if (slots[1].turretType == 0) BuildTurret(1, 2);

        state = GameState.Ready;
    }

    private void SpawnBoss()
    {
        bossMothership = new GameObject("BossMothership");
        bossAngle = 0f;
        bossMothership.transform.position = new Vector3(0, 0, 13.5f);
        var bossStage = stages[currentStageIndex];
        bossMaxHp = bossStage.bossHealth > 0f ? bossStage.bossHealth : (bossStage.id == 12 ? 4000f : 2200f);
        bossHp = bossMaxHp;

        // Painted saucer (child of the root, so the root's turning spins it)
        var hull = FlatSprite("MothershipArt", "mothership", 5.2f);
        hull.transform.SetParent(bossMothership.transform, false);
        hull.transform.localPosition = new Vector3(0f, 0.4f, 0f);
        hull.transform.localRotation = Quaternion.Euler(90f, 0f, 0f);

        PlaySound(warningClip, 0.9f);
    }

    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("orbital-defense-3d", state, score);
        float dt = Time.deltaTime;

        if (Input.GetKeyDown(KeyCode.Escape))
        {
            showStageSelect = !showStageSelect;
        }

        // Camera Shake decay
        if (camShake > 0)
        {
            camShake = Mathf.Max(0, camShake - dt * 3.5f);
            mainCam.transform.position = new Vector3(
                UnityEngine.Random.Range(-camShake, camShake),
                22.0f,
                -0.5f + UnityEngine.Random.Range(-camShake, camShake)
            );
        }

        // Rotate Planet & Rings slowly
        planetRoot.transform.Rotate(0, 3.5f * dt, 0);

        if (state == GameState.Ready)
        {
            if (Input.GetKeyDown(KeyCode.Space) || OiyoPointerInput.GetMouseButtonDown(0))
            {
                state = GameState.Playing;
            }
        }
        else if (state == GameState.Playing)
        {
            UpdateTurretAimAndFire(dt);
            UpdateBullets(dt);
            UpdateThreatSpawns(dt);
            UpdateThreats(dt);
            CheckCollisions();
            CheckStageProgression();
        }

        HandleInput();
        UpdateVisuals();
    }

    private void HandleInput()
    {
        if (OiyoPointerInput.GetMouseButtonDown(0))
        {
            Ray ray = mainCam.ScreenPointToRay(OiyoPointerInput.mousePosition);
            Plane plane = new Plane(Vector3.up, Vector3.zero);
            float dist;
            if (plane.Raycast(ray, out dist))
            {
                Vector3 hitPoint = ray.GetPoint(dist);

                // Check click on Turret Slots
                bool clickedSlot = false;
                for (int i = 0; i < slots.Count; i++)
                {
                    if (Vector3.Distance(slots[i].pos, hitPoint) < 0.8f)
                    {
                        selectedSlotId = i;
                        clickedSlot = true;
                        break;
                    }
                }

                // If clicked on space, fire manual orbital strike / select target
                if (!clickedSlot)
                {
                    selectedSlotId = -1;
                }
            }
        }
    }

    private void UpdateTurretAimAndFire(float dt)
    {
        for (int i = 0; i < slots.Count; i++)
        {
            var s = slots[i];
            if (s.turretType == 0) continue;

            s.fireCooldown -= dt;

            // Find closest threat
            int targetIdx = -1;
            float closestDist = 999f;
            for (int t = 0; t < threats.Count; t++)
            {
                float d = Vector3.Distance(s.pos, threats[t].pos);
                if (d < closestDist)
                {
                    closestDist = d;
                    targetIdx = t;
                }
            }

            // Also check boss
            if (bossMothership != null)
            {
                float bd = Vector3.Distance(s.pos, bossMothership.transform.position);
                if (bd < closestDist)
                {
                    closestDist = bd;
                    targetIdx = 9999;
                }
            }

            if (closestDist < 12.0f && s.fireCooldown <= 0f)
            {
                Vector3 targetPos = targetIdx == 9999 ? bossMothership.transform.position : threats[targetIdx].pos;
                FireTurret(s, targetPos, targetIdx);
                s.fireCooldown = s.turretType == 1 ? 0.45f : (s.turretType == 2 ? 1.1f : 0.8f);
            }

            slots[i] = s;
        }
    }

    private void FireTurret(TurretSlot s, Vector3 targetPos, int targetIdx)
    {
        Vector3 dir = (targetPos - s.pos).normalized;
        if (s.turretGo != null) s.turretGo.transform.rotation = Quaternion.Euler(90f, Yaw(dir), 0f); // aim the barrel

        if (s.turretType == 1) // Pulse Laser
        {
            SpawnBullet(s.pos, dir * 26f, 0, targetIdx);
            PlaySound(laserClip, 0.4f);
        }
        else if (s.turretType == 2) // Homing Missile
        {
            SpawnBullet(s.pos, dir * 18f, 1, targetIdx);
            PlaySound(missileClip, 0.45f);
        }
        else if (s.turretType == 3) // Flak Cannon (Area Burst)
        {
            SpawnBullet(s.pos, dir * 22f, 2, targetIdx);
            PlaySound(flakClip, 0.5f);
        }
    }

    private void SpawnBullet(Vector3 pos, Vector3 vel, int type, int targetIdx)
    {
        var go = FlatSprite("Shot", type == 1 ? "shot_missile" : type == 2 ? "shot_flak" : "shot_laser", 1f, Yaw(vel), true);
        go.transform.position = pos + Vector3.up * 0.3f;
        if (type == 1) go.transform.localScale = new Vector3(0.35f, 0.7f, 1f);
        else if (type == 2) go.transform.localScale = new Vector3(0.4f, 0.8f, 1f);
        else go.transform.localScale = new Vector3(0.25f, 0.8f, 1f);

        bullets.Add(new DefenseBullet
        {
            pos = pos, vel = vel, type = type, targetEnemyIdx = targetIdx, lifetime = 1.4f, go = go
        });
    }

    private void UpdateBullets(float dt)
    {
        for (int i = bullets.Count - 1; i >= 0; i--)
        {
            var b = bullets[i];
            b.lifetime -= dt;

            // Homing for missiles
            if (b.type == 1 && b.targetEnemyIdx >= 0 && b.targetEnemyIdx < threats.Count)
            {
                Vector3 toTarget = (threats[b.targetEnemyIdx].pos - b.pos).normalized;
                b.vel = Vector3.Lerp(b.vel, toTarget * 20f, dt * 6f);
                if (b.go != null) b.go.transform.rotation = Quaternion.Euler(90f, Yaw(b.vel), 0f);
            }

            b.pos += b.vel * dt;
            if (b.go != null) b.go.transform.position = b.pos;

            if (b.lifetime <= 0f || b.pos.magnitude > 22f)
            {
                if (b.go != null) Destroy(b.go);
                bullets.RemoveAt(i);
            }
            else
            {
                bullets[i] = b;
            }
        }
    }

    private void UpdateThreatSpawns(float dt)
    {
        var stg = stages[currentStageIndex];
        threatSpawnTimer += dt;

        if (threatSpawnTimer >= stg.spawnInterval)
        {
            threatSpawnTimer = 0f;
            if (totalSpawned < stg.targetEnemies || isEndless)
            {
                totalSpawned++;
                SpawnThreat();
            }
        }
    }

    private void SpawnThreat()
    {
        var stg = stages[currentStageIndex];
        float angle = UnityEngine.Random.Range(0f, Mathf.PI * 2f);
        float radius = 18.5f;
        Vector3 pos = new Vector3(Mathf.Cos(angle) * radius, 0, Mathf.Sin(angle) * radius);

        int type = 0;
        float roll = UnityEngine.Random.value;
        if (stg.hasHeavy && roll < 0.25f) type = 2; // Heavy Cruiser
        else if (stg.hasFast && roll < 0.55f) type = 1; // Scout Drone
        else type = 0; // Meteor

        var go = FlatSprite("Threat", type == 0 ? "meteor" : type == 1 ? "raider" : "cruiser", 1f, Yaw(-pos));
        go.transform.position = pos;

        float hp = 25f;
        float r = 0.6f;
        Vector3 vel = (Vector3.zero - pos).normalized * stg.enemySpeed;

        if (type == 0) // Meteor
        {
            float sz = UnityEngine.Random.Range(0.8f, 1.4f);
            go.transform.localScale = new Vector3(sz * 1.15f, sz * 1.15f, 1f);
            go.transform.rotation = Quaternion.Euler(90f, UnityEngine.Random.Range(0f, 360f), 0f);
            hp = 30f;
            r = sz * 0.5f;
        }
        else if (type == 1) // Scout Drone
        {
            go.transform.localScale = new Vector3(1.2f, 1.2f, 1f);
            hp = 18f;
            vel *= 1.35f;
            r = 0.55f;
        }
        else if (type == 2) // Heavy Cruiser
        {
            go.transform.localScale = new Vector3(2.0f, 2.0f, 1f);
            hp = 95f;
            vel *= 0.7f;
            r = 0.95f;
        }

        threats.Add(new OrbitalThreat
        {
            pos = pos, vel = vel, type = type, hp = hp, maxHp = hp, radius = r, go = go
        });
    }

    private void UpdateThreats(float dt)
    {
        for (int i = threats.Count - 1; i >= 0; i--)
        {
            var t = threats[i];
            t.pos += t.vel * dt;
            if (t.go != null) t.go.transform.position = t.pos;

            // Threat reaches planet impact (Radius < 2.5m)
            if (t.pos.magnitude < 2.6f)
            {
                PlanetImpactDamage(t.hp);
                if (t.go != null) Destroy(t.go);
                threats.RemoveAt(i);
                continue;
            }

            if (t.hp <= 0f)
            {
                // Destroyed by defense fire!
                enemiesDestroyed++;
                credits += (int)t.maxHp / 2;
                score += (int)t.maxHp * 10;
                if (score > bestScore)
                {
                    bestScore = score;
                    PlayerPrefs.SetInt("OrbitalDefense_BestScore", bestScore);
                }

                PlaySound(explodeClip, 0.65f);
                sparkParticles.transform.position = t.pos;
                sparkParticles.Emit(25);

                if (t.go != null) Destroy(t.go);
                threats.RemoveAt(i);
            }
            else
            {
                threats[i] = t;
            }
        }

        // Update Boss
        if (bossMothership != null)
        {
            bossAngle += dt * 0.45f;
            bossMothership.transform.position = new Vector3(Mathf.Cos(bossAngle) * 12.5f, 0, Mathf.Sin(bossAngle) * 12.5f);
            bossMothership.transform.rotation = Quaternion.Euler(0, -bossAngle * Mathf.Rad2Deg + 90f, 0);

            if (bossHp <= 0f)
            {
                PlaySound(explodeClip, 1.0f);
                PlaySound(clearClip, 0.9f);
                camShake = 1.0f;
                sparkParticles.transform.position = bossMothership.transform.position;
                sparkParticles.Emit(100);

                Destroy(bossMothership);
                bossMothership = null;
                enemiesDestroyed += 50;
                score += 5000;

                if (currentStageIndex >= stages.Length - 1) state = GameState.AllCleared;
                else state = GameState.StageClear;
            }
        }
    }

    private void CheckCollisions()
    {
        // Bullets vs Threats
        for (int b = bullets.Count - 1; b >= 0; b--)
        {
            var blt = bullets[b];
            bool hit = false;

            for (int t = 0; t < threats.Count; t++)
            {
                var tr = threats[t];
                if (Vector3.Distance(blt.pos, tr.pos) < (tr.radius + 0.35f))
                {
                    float dmg = blt.type == 0 ? 25f : (blt.type == 1 ? 55f : 40f);
                    tr.hp -= dmg;
                    threats[t] = tr;
                    hit = true;
                    break;
                }
            }

            // Bullet vs Boss
            if (!hit && bossMothership != null)
            {
                if (Vector3.Distance(blt.pos, bossMothership.transform.position) < 2.8f)
                {
                    float dmg = blt.type == 0 ? 25f : (blt.type == 1 ? 55f : 40f);
                    bossHp -= dmg;
                    hit = true;
                }
            }

            if (hit)
            {
                if (blt.go != null) Destroy(blt.go);
                bullets.RemoveAt(b);
            }
        }
    }

    private void PlanetImpactDamage(float dmg)
    {
        camShake = 0.7f;
        PlaySound(explodeClip, 0.85f);

        if (shieldHp > 0f)
        {
            shieldHp = Mathf.Max(0f, shieldHp - dmg);
        }
        else
        {
            planetHp = Mathf.Max(0f, planetHp - dmg);
            if (planetHp <= 0f)
            {
                state = GameState.GameOver;
            }
        }
    }

    private void CheckStageProgression()
    {
        if (isEndless) return;

        var stg = stages[currentStageIndex];
        if (stg.isBossStage) return; // Clears on boss kill

        if (enemiesDestroyed >= stg.targetEnemies)
        {
            PlaySound(clearClip, 0.9f);
            if (currentStageIndex >= stages.Length - 1) state = GameState.AllCleared;
            else state = GameState.StageClear;
        }
    }

    public void BuildTurret(int slotId, int type)
    {
        var s = slots[slotId];
        int cost = type == 1 ? 100 : (type == 2 ? 160 : 220);
        if (credits < cost) return;

        credits -= cost;
        s.turretType = type;
        s.level = 1;

        if (s.turretGo != null) Destroy(s.turretGo);

        var tg = FlatSprite("Turret_" + slotId, type == 1 ? "turret_laser" : (type == 2 ? "turret_missile" : "turret_flak"), 0.95f, Yaw(s.pos));
        tg.transform.position = s.pos + new Vector3(0, 0.35f, 0);
        s.turretGo = tg;

        PlaySound(buildClip, 0.8f);
        slots[slotId] = s;
        selectedSlotId = -1;
    }

    private void UpdateVisuals()
    {
        if (planetSphere != null) planetSphere.transform.Rotate(0f, 8f * Time.deltaTime, 0f, Space.World);
        if (shieldBubble != null)
        {
            shieldBubble.SetActive(shieldHp > 0f);
            if (shieldHp > 0f)
            {
                float sc = 5.2f + Mathf.Sin(Time.time * 5f) * 0.1f;
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
        laserClip = CreateSynthClip("laser", 0.12f, (t) => Mathf.Sin((1400f - t * 5000f) * Mathf.PI * 2f * t));
        missileClip = CreateSynthClip("missile", 0.3f, (t) => (Mathf.PerlinNoise(t * 100f, 0) - 0.5f) * 0.7f + Mathf.Sin(t * 240f) * 0.3f);
        flakClip = CreateSynthClip("flak", 0.25f, (t) => (UnityEngine.Random.value - 0.5f) * Mathf.Exp(-t * 6f));
        explodeClip = CreateSynthClip("explode", 0.55f, (t) => (UnityEngine.Random.value - 0.5f) * Mathf.Exp(-t * 4.5f));
        buildClip = CreateSynthClip("build", 0.25f, (t) => Mathf.Sin((440f + t * 880f) * Mathf.PI * 2f * t));
        warningClip = CreateSynthClip("alarm", 0.35f, (t) => Mathf.Sin(650f * Mathf.PI * 2f * t));
        clearClip = CreateSynthClip("clear", 0.85f, (t) => Mathf.Sin((523.25f + t * 440f) * Mathf.PI * 2f * t) * 0.7f);
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
        OiyoUiFont.Apply();
        int w = Screen.width;
        int h = Screen.height;

        GUI.skin.label.fontSize = 14;
        GUI.skin.button.fontSize = 14;

        // Top Navigation Bar
        GUILayout.BeginArea(new Rect(15, 12, w - 30, 42));
        GUILayout.BeginHorizontal();

        GUI.color = Color.white;
        GUILayout.Label($"<b>ORBITAL DEFENSE 3D</b>", GUILayout.Width(180));

        // Language Buttons
        GUI.color = lang == DefenseLanguage.KO ? Color.cyan : Color.white;
        if (GUILayout.Button("KO", GUILayout.Width(45), GUILayout.Height(28))) lang = DefenseLanguage.KO;
        GUI.color = lang == DefenseLanguage.EN ? Color.cyan : Color.white;
        if (GUILayout.Button(OiyoI18n.ForEnglish.ToUpperInvariant(), GUILayout.Width(45), GUILayout.Height(28))) lang = DefenseLanguage.EN;
        GUI.color = lang == DefenseLanguage.JA ? Color.cyan : Color.white;
        if (GUILayout.Button("JA", GUILayout.Width(45), GUILayout.Height(28))) lang = DefenseLanguage.JA;
        GUI.color = lang == DefenseLanguage.ES ? Color.cyan : Color.white;
        if (GUILayout.Button("ES", GUILayout.Width(45), GUILayout.Height(28))) lang = DefenseLanguage.ES;

        GUILayout.FlexibleSpace();

        // Stage Select
        GUI.color = showStageSelect ? Color.yellow : Color.white;
        string stagesLabel = GetText("섹터 선택", "Sectors", "セクター選択", "Sectores");
        if (GUILayout.Button(stagesLabel, GUILayout.Width(110), GUILayout.Height(28)))
        {
            showStageSelect = !showStageSelect;
        }

        // Endless Toggle
        GUI.color = isEndless ? Color.green : Color.white;
        string endlessLabel = GetText("무한 방어", "Endless", "エンドレス", "Infinito");
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
            string stageTitle = isEndless ? GetText("무한 행성 방어전", "Endless Defense", "無限惑星防衛戦", "Defensa Infinita")
                                          : $"{U("Sector")} {stg.id}: {GetStageName(stg)}";
            GUILayout.Label($"<size=17><b>{stageTitle}</b></size>");

            GUILayout.Space(4);
            string enemiesLabel = GetText("요격 수", "Intercepts", "迎撃数", "Bajas");
            string targetLabel = isEndless ? "∞" : $"{stg.targetEnemies}";
            GUILayout.Label($"{enemiesLabel}: <b>{enemiesDestroyed} / {targetLabel}</b>");

            GUILayout.Label($"{U("Credits")}: <b>💰 {credits}G</b> | {U("Score")}: <b>{score}</b>");

            // Planet HP Bar
            string hpLabel = GetText("행성 내구도", "Planet HP", "惑星耐久力", "Vida Planetaria");
            GUILayout.Label($"{hpLabel}: {planetHp:0} / {maxPlanetHp:0}");
            Rect hpRect = GUILayoutUtility.GetRect(220, 10);
            GUI.Box(hpRect, "");
            GUI.color = planetHp > 30f ? Color.green : Color.red;
            GUI.Box(new Rect(hpRect.x, hpRect.y, hpRect.width * (planetHp / maxPlanetHp), hpRect.height), "");
            GUI.color = Color.white;

            // Shield Bar
            string shieldLabel = GetText("궤도 쉴드", "Orbital Shield", "軌道シールド", "Escudo");
            GUILayout.Label($"{shieldLabel}: {shieldHp:0} / {maxShieldHp:0}");
            Rect shieldRect = GUILayoutUtility.GetRect(220, 10);
            GUI.Box(shieldRect, "");
            GUI.color = Color.cyan;
            GUI.Box(new Rect(shieldRect.x, shieldRect.y, shieldRect.width * (shieldHp / maxShieldHp), shieldRect.height), "");
            GUI.color = Color.white;

            // Boss HP Bar
            if (bossMothership != null)
            {
                GUILayout.Space(6);
                GUI.color = Color.red;
                GUILayout.Label($"<b>⚠️ {U("BOSS HP")}: {bossHp:0} / {bossMaxHp:0}</b>");
                Rect barRect = GUILayoutUtility.GetRect(220, 10);
                GUI.Box(barRect, "");
                GUI.Box(new Rect(barRect.x, barRect.y, barRect.width * (bossHp / bossMaxHp), barRect.height), "");
                GUI.color = Color.white;
            }

            GUILayout.EndArea();

            // Turret Build Menu (when slot is selected)
            if (selectedSlotId >= 0 && selectedSlotId < slots.Count)
            {
                RenderTurretBuildMenu(w, h);
            }
        }

        // Modals
        if (showStageSelect) RenderStageSelectModal(w, h);
        else if (state == GameState.Ready) RenderReadyModal(w, h);
        else if (state == GameState.StageClear) RenderStageClearModal(w, h);
        else if (state == GameState.GameOver) RenderGameOverModal(w, h);
        else if (state == GameState.AllCleared) RenderAllClearedModal(w, h);
    }

    private void RenderTurretBuildMenu(int w, int h)
    {
        var slot = slots[selectedSlotId];
        float mw = 360;
        float mh = 160;
        Rect r = new Rect((w - mw) * 0.5f, h - mh - 20, mw, mh);
        GUI.Box(r, "");

        GUILayout.BeginArea(new Rect(r.x + 15, r.y + 10, r.width - 30, r.height - 20));
        GUILayout.BeginHorizontal();
        GUI.color = Color.cyan;
        GUILayout.Label($"<b>{GetText("포탑 배치/업그레이드", "Build / Upgrade Turret", "砲塔建設/強化", "Construir / Mejorar")} (Slot #{slot.id})</b>");
        GUI.color = Color.white;
        GUILayout.FlexibleSpace();
        if (GUILayout.Button("×", GUILayout.Width(30), GUILayout.Height(24))) selectedSlotId = -1;
        GUILayout.EndHorizontal();

        GUILayout.Space(6);
        GUILayout.BeginHorizontal();

        // Option 1: Pulse Laser (100G)
        GUI.color = credits >= 100 ? Color.cyan : Color.gray;
        if (GUILayout.Button($"<b>{GetText("레이저", "Laser", "レーザー", "Láser")}</b>\n100G", GUILayout.Height(55), GUILayout.Width(100)))
        {
            BuildTurret(selectedSlotId, 1);
        }

        // Option 2: Missile (160G)
        GUI.color = credits >= 160 ? Color.yellow : Color.gray;
        if (GUILayout.Button($"<b>{GetText("미사일", "Missile", "ミサイル", "Misil")}</b>\n160G", GUILayout.Height(55), GUILayout.Width(100)))
        {
            BuildTurret(selectedSlotId, 2);
        }

        // Option 3: Flak (220G)
        GUI.color = credits >= 220 ? new Color(1f, 0.4f, 0.1f) : Color.gray;
        if (GUILayout.Button($"<b>{GetText("플랙포", "Flak", "対空砲", "Flak")}</b>\n220G", GUILayout.Height(55), GUILayout.Width(100)))
        {
            BuildTurret(selectedSlotId, 3);
        }

        GUILayout.EndHorizontal();
        GUI.color = Color.white;
        GUILayout.EndArea();
    }

    private void RenderReadyModal(int w, int h)
    {
        var stg = stages[currentStageIndex];
        float mw = 440;
        float mh = 265;
        Rect r = new Rect((w - mw) * 0.5f, (h - mh) * 0.5f, mw, mh);
        GUI.Box(r, "");

        GUILayout.BeginArea(new Rect(r.x + 20, r.y + 15, r.width - 40, r.height - 30));
        GUI.color = Color.cyan;
        GUILayout.Label($"<size=22><b>{U("SECTOR")} {stg.id}: {GetStageName(stg)}</b></size>", GUILayout.Height(32));
        GUI.color = Color.white;

        GUILayout.Space(8);
        GUILayout.Label(GetStageDesc(stg));

        GUILayout.Space(8);
        string targetText = stg.isBossStage ? GetText("목표: 외계 침공 모함 격침!", "Goal: Slay Alien Dread Mothership!", "目標：異星侵攻母艦を撃沈せよ！", "Meta: ¡Destruye la Nave Nodriza!")
                                            : $"{GetText("목표 요격 수", "Target Intercepts", "目標迎撃数", "Bajas Requeridas")}: <b>{stg.targetEnemies}</b>";
        GUILayout.Label(targetText);

        string controlInfo = GetText("조작: [궤도 슬롯 클릭] 포탑 건설 • 포탑이 사거리 내 적을 자동 요격",
                                     "Controls: [Click Orbital Slot] to build turrets • Auto-fires on targets",
                                     "操作：[軌道スロットをクリック] 砲塔建設 • 射程内の敵を自動迎撃",
                                     "Controles: [Clic en Ranura] para construir torretas • Fuego automático");
        GUILayout.Label($"<color=#aaa>{controlInfo}</color>");

        GUILayout.FlexibleSpace();
        GUI.color = Color.green;
        string startBtn = GetText("방어 개시 (Defend)", "Begin Defense", "防衛開始", "Iniciar Defensa");
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
        GUILayout.Label($"<size=22><b>🎉 SECTOR {stg.id} {GetText("방어 성공!", "SECTOR DEFENDED!", "防衛成功！", "¡SECTOR DEFENDIDO!")}</b></size>", GUILayout.Height(32));
        GUI.color = Color.white;

        GUILayout.Space(8);
        GUILayout.Label($"{GetText("요격한 적", "Enemies Destroyed", "迎撃数", "Bajas")}: <b>{enemiesDestroyed}</b>");
        GUILayout.Label($"{U("Credits")}: <b>💰 {credits}G</b> | {U("Score")}: <b>{score}</b> ({U("Best")}: {bestScore})");

        GUILayout.FlexibleSpace();
        GUI.color = Color.green;
        string nextBtn = GetText("다음 섹터로 출격 ▶", "Next Sector ▶", "次セクターへ出撃 ▶", "Siguiente Sector ▶");
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
        GUILayout.Label($"<size=22><b>💥 {GetText("행성 멸망!", "PLANET DESTROYED!", "惑星壊滅！", "¡PLANETA DESTRUIDO!")}</b></size>", GUILayout.Height(32));
        GUI.color = Color.white;

        GUILayout.Space(8);
        GUILayout.Label($"{GetText("최종 격추수", "Final Intercepts", "最終迎撃数", "Bajas Finales")}: <b>{enemiesDestroyed}</b>");
        GUILayout.Label($"{U("Score")}: <b>{score}</b> ({U("Best")}: {bestScore})");

        GUILayout.FlexibleSpace();
        GUILayout.BeginHorizontal();

        GUI.color = Color.yellow;
        string retryBtn = GetText("재도전 (Retry)", "Retry Defense", "リトライ", "Reintentar");
        if (GUILayout.Button($"<b>{retryBtn}</b>", GUILayout.Height(44)))
        {
            ResetToStage(currentStageIndex);
            state = GameState.Playing;
        }

        GUI.color = Color.white;
        string menuBtn = GetText("섹터 목록", "Sectors", "セクター一覧", "Sectores");
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
        GUILayout.Label($"<size=23><b>🏆 {GetText("30섹터 은하계 완전 수호!", "ALL 30 SECTORS DEFENDED!", "全30セクター完全防衛！", "¡LOS 30 SECTORES DEFENDIDOS!")}</b></size>", GUILayout.Height(34));
        GUI.color = Color.white;

        GUILayout.Space(8);
        GUILayout.Label(GetText("축하합니다! 은하 핵 외계 침공 모함을 격침하고 인류의 모성을 완벽히 지켜냈습니다.",
                                "Incredible defense! You destroyed the Alien Dread Mothership and saved humanity.",
                                "大勝利おめでとうございます！異星侵攻母艦を撃滅し、母星を完璧に守り抜きました。",
                                "¡Defensa legendaria! Has destruido la Nave Nodriza alienígena y salvado a la humanidad."));

        GUILayout.Space(8);
        GUILayout.Label($"{U("Final Score")}: <b>{score}</b> | {U("Intercepts")}: <b>{enemiesDestroyed}</b>");

        GUILayout.FlexibleSpace();
        GUI.color = Color.green;
        string endlessBtn = GetText("무한 방어전 도전 ▶", "Endless Assault Mode ▶", "無限防衛戦挑戦 ▶", "Modo Infinito ▶");
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
        GUILayout.Label($"<size=20><b>{GetText("섹터 선택 (30 Sectors)", "Select Sector (30 Sectors)", "セクター選択 (全30セクター)", "Seleccionar Sector (30 Sectores)")}</b></size>");
        GUI.color = Color.white;
        GUILayout.FlexibleSpace();
        if (GUILayout.Button("×", GUILayout.Width(35), GUILayout.Height(28)))
        {
            showStageSelect = false;
        }
        GUILayout.EndHorizontal();

        GUILayout.Space(10);

        // 4 columns, scrolling for all 30 sectors
        float btnW = (r.width - 30f - 24f - 4 * 6f) / 4f;
        stageSelectScroll = GUILayout.BeginScrollView(stageSelectScroll, false, true);
        for (int row = 0; row * 4 < stages.Length; row++)
        {
            GUILayout.BeginHorizontal();
            for (int col = 0; col < 4; col++)
            {
                int idx = row * 4 + col;
                if (idx < stages.Length)
                {
                    var stg = stages[idx];
                    GUI.color = idx == currentStageIndex ? Color.cyan : Color.white;

                    string btnText = $"<b>{U("Sector")} {stg.id}</b>\n<size=11>{GetStageName(stg)}</size>\n<size=10>{F("{0} Kills", stg.targetEnemies)}</size>";
                    if (GUILayout.Button(btnText, GUILayout.Height(72), GUILayout.Width(btnW)))
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

        GUILayout.EndScrollView();

        GUI.color = Color.white;
        GUILayout.EndArea();
    }

    // Sectors 13-30 keep climbing from sector 12: more kills, faster spawns and threats.
    // Every fifth sector is a mothership fight with a tougher hull (4600 .. 7000 HP).
    private void AddAdvancedStages()
    {
        if (stages.Length > 12) return;
        string[][] names = new string[][]
        {
            new[] { "Ion Storm Frontier", "이온 폭풍 전선", "イオン嵐の前線", "Frontera de Tormenta Iónica" },
            new[] { "Shattered Moonbelt", "부서진 달띠", "砕けた月の帯", "Cinturón Lunar Roto" },
            new[] { "Boss: Twin Dread Carrier", "보스: 쌍둥이 공포 모함", "ボス：双子の恐怖母艦", "Jefe: Portanaves Gemelo" },
            new[] { "Comet Tail Gauntlet", "혜성 꼬리 시련", "彗星の尾の試練", "Desafío de la Cola de Cometa" },
            new[] { "Raider Picket Line", "약탈선 경계선", "略奪艦の哨戒線", "Línea de Piquete Saqueadora" },
            new[] { "Cruiser Phalanx", "순양함 방진", "巡洋艦の方陣", "Falange de Cruceros" },
            new[] { "Nebula Blackout", "성운 정전", "星雲ブラックアウト", "Apagón Nebular" },
            new[] { "Boss: Siege Mothership", "보스: 공성 모함", "ボス：攻城母艦", "Jefe: Nave Nodriza de Asedio" },
            new[] { "Red Giant Flare", "적색거성 플레어", "赤色巨星のフレア", "Llamarada de Gigante Roja" },
            new[] { "Hailstorm Barrage", "우박 폭격", "雹の弾幕", "Andanada de Granizo" },
            new[] { "Phantom Drone Tide", "유령 드론 물결", "幻影ドローンの潮流", "Marea de Drones Fantasma" },
            new[] { "Iron Wall Armada", "철벽 함대", "鉄壁艦隊", "Armada Muro de Hierro" },
            new[] { "Boss: Void Leviathan", "보스: 공허의 리바이어선", "ボス：虚空のリヴァイアサン", "Jefe: Leviatán del Vacío" },
            new[] { "Pulsar Crossfire", "펄서 십자포화", "パルサー十字砲火", "Fuego Cruzado de Púlsar" },
            new[] { "Wormhole Spillway", "웜홀 배수로", "ワームホールの放水路", "Aliviadero de Agujero de Gusano" },
            new[] { "Dark Matter Rain", "암흑물질 비", "暗黒物質の雨", "Lluvia de Materia Oscura" },
            new[] { "Last Orbit Line", "최후의 궤도선", "最後の軌道線", "Última Línea Orbital" },
            new[] { "Boss: Galaxy Devourer", "보스: 은하 포식자", "ボス：銀河を喰らう者", "Jefe: Devorador de Galaxias" },
        };
        var list = new List<StageData>(stages);
        for (int k = 1; k <= names.Length; k++)
        {
            int n = 12 + k;
            bool boss = n % 5 == 0;
            var src = stages[(k - 1) % 12];
            var stg = new StageData
            {
                id = n,
                nameEn = names[k - 1][0], nameKo = names[k - 1][1], nameJa = names[k - 1][2], nameEs = names[k - 1][3],
                targetEnemies = 210 + k * 10,                          // 220 .. 390
                spawnInterval = (0.62f - k * 0.008f) * (boss ? 1.25f : 1f), // 0.61 .. 0.48 (bosses slower)
                enemySpeed = 4.4f + k * 0.05f,                         // 4.45 .. 5.3
                hasFast = true,
                hasHeavy = true,
                isBossStage = boss,
                bossHealth = boss ? 4000f + (n / 5 - 2) * 600f + (n == 30 ? 600f : 0f) : 0f, // 4600, 5200, 5800, 7000
                spaceColor = boss ? new Color(0.3f, 0.03f, 0.06f) : src.spaceColor,
                planetColor = src.planetColor
            };
            if (boss)
            {
                stg.descEn = string.Format(OiyoI18n.En("Sector {0}: sink a mothership with {1} HP while {2} threats close in."), n, stg.bossHealth, stg.targetEnemies);
                stg.descKo = string.Format("{0}섹터: 적 {2}기가 몰려오는 동안 HP {1} 모함을 격침하세요.", n, stg.bossHealth, stg.targetEnemies);
                stg.descJa = string.Format("セクター{0}：敵{2}機が迫る中、HP {1}の母艦を撃沈せよ。", n, stg.bossHealth, stg.targetEnemies);
                stg.descEs = string.Format("Sector {0}: hunde una nave nodriza de {1} PV mientras llegan {2} amenazas.", n, stg.bossHealth, stg.targetEnemies);
            }
            else
            {
                stg.descEn = string.Format(OiyoI18n.En("Sector {0}: intercept {1} threats arriving every {2:0.00} s at speed {3:0.0}."), n, stg.targetEnemies, stg.spawnInterval, stg.enemySpeed);
                stg.descKo = string.Format("{0}섹터: {2:0.00}초마다 속도 {3:0.0}로 오는 적 {1}기를 요격하세요.", n, stg.targetEnemies, stg.spawnInterval, stg.enemySpeed);
                stg.descJa = string.Format("セクター{0}：{2:0.00}秒ごとに速度{3:0.0}で来る敵{1}機を迎撃せよ。", n, stg.targetEnemies, stg.spawnInterval, stg.enemySpeed);
                stg.descEs = string.Format("Sector {0}: intercepta {1} amenazas cada {2:0.00} s a velocidad {3:0.0}.", n, stg.targetEnemies, stg.spawnInterval, stg.enemySpeed);
            }
            list.Add(stg);
        }
        stages = list.ToArray();
    }

    private string GetText(string ko, string en, string ja, string es)
    {
        switch (lang)
        {
            case DefenseLanguage.KO: return ko;
            case DefenseLanguage.EN: return OiyoI18n.En(en);
            case DefenseLanguage.JA: return ja;
            case DefenseLanguage.ES: return es;
            default: return en;
        }
    }

    private string GetStageName(StageData s)
    {
        switch (lang)
        {
            case DefenseLanguage.KO: return s.nameKo;
            case DefenseLanguage.EN: return OiyoI18n.En(s.nameEn);
            case DefenseLanguage.JA: return s.nameJa;
            case DefenseLanguage.ES: return s.nameEs;
            default: return s.nameEn;
        }
    }

    private string GetStageDesc(StageData s)
    {
        switch (lang)
        {
            case DefenseLanguage.KO: return s.descKo;
            case DefenseLanguage.EN: return OiyoI18n.En(s.descEn);
            case DefenseLanguage.JA: return s.descJa;
            case DefenseLanguage.ES: return s.descEs;
            default: return s.descEn;
        }
    }
}
