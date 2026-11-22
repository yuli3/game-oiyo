using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public enum BeatLanguage { KO, EN, JA, ES }

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

public class BeatSlicePlayer : MonoBehaviour
{
    public enum GameState { Ready, Playing, StageClear, GameOver, AllCleared }

    [System.Serializable]
    public class TrackData
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
        public float bpm;
        public int targetNotes;
        public float scrollSpeed;
        public bool hasBombs;
        public bool isBossTrack;
        public Color tunnelColor;
        public Color accentColor;
    }

    public struct BeatNote
    {
        public int id;
        public float laneX;
        public float z;
        public int type; // 0: Cyan, 1: Magenta, 2: Gold, 3: Bomb
        public int cutDir; // 0: Any, 1: Down, 2: Up, 3: Left, 4: Right
        public bool sliced;
        public GameObject go;
        public GameObject arrowGo;
    }

    public struct SlicedHalf
    {
        public Vector3 pos;
        public Vector3 vel;
        public Vector3 rotVel;
        public float life;
        public GameObject go;
    }

    // Audio clips
    private AudioSource audioSource;
    private AudioSource musicSource;
    private AudioClip sliceClip;
    private AudioClip perfectClip;
    private AudioClip bombClip;
    private AudioClip feverClip;
    private AudioClip fanfareClip;

    // Game state
    private GameState state = GameState.Ready;
    private BeatLanguage lang = BeatLanguage.KO;
    private int currentStageIndex = 0;
    private bool isEndless = false;
    private bool showStageSelect = false;

    // Scoring & Stats
    private int score = 0;
    private int bestScore = 0;
    private int combo = 0;
    private int maxCombo = 0;
    private int multiplier = 1;
    private int notesHit = 0;
    private int notesTotal = 0;
    private int perfectCount = 0;
    private int greatCount = 0;
    private int goodCount = 0;
    private int missCount = 0;
    private float health = 100f;
    private bool isFever = false;
    private float feverTimer = 0f;

    // Sabers
    private GameObject saberLeftGo;
    private GameObject saberRightGo;
    private Vector3 saberLeftPos = new Vector3(-1.2f, 1.2f, -1.0f);
    private Vector3 saberRightPos = new Vector3(1.2f, 1.2f, -1.0f);
    private Vector3 saberLeftPrevPos;
    private Vector3 saberRightPrevPos;
    private Vector3 saberLeftVel;
    private Vector3 saberRightVel;

    // Collections
    private List<BeatNote> notes = new List<BeatNote>();
    private List<SlicedHalf> slicedHalves = new List<SlicedHalf>();
    private List<Transform> tunnelPillars = new List<Transform>();

    // Visual juice
    private Camera mainCam;
    private float camShake = 0f;
    private ParticleSystem sparkParticles;
    private string lastJudgment = "";
    private Color lastJudgmentColor = Color.white;
    private float judgmentAlpha = 0f;

    // Materials
    private Material cyanMat;
    private Material magentaMat;
    private Material goldMat;
    private Material bombMat;
    private Material runwayMat;
    private Material saberLeftMat;
    private Material saberRightMat;
    private Material pillarMat;
    private float runwayScroll;

    // Rhythm sequencing
    private float beatTimer = 0f;
    private float songTime = 0f;
    private int nextNoteId = 0;

    // 12 Defined Stages (BPM 110 to 200)
    private TrackData[] stages = new TrackData[]
    {
        new TrackData {
            id = 1,
            nameKo = "네온 제네시스", nameEn = "Neon Genesis", nameJa = "ネオン・ジェネシス", nameEs = "Génesis de Neón",
            descKo = "완만한 하우스 템포에서 양손 레이저 세이버의 기본 슬라이스를 익히세요.",
            descEn = "Master basic dual-saber slicing to a steady house groove.",
            descJa = "穏やかなハウステンポで両手セーバーの基本スライスを習得しましょう。",
            descEs = "Domina el corte básico con sables duales a ritmo house constante.",
            bpm = 110f, targetNotes = 30, scrollSpeed = 16f,
            tunnelColor = new Color(0.08f, 0.2f, 0.4f), accentColor = Color.cyan
        },
        new TrackData {
            id = 2,
            nameKo = "사이버 러시", nameEn = "Cyber Rush", nameJa = "サイバー・ラッシュ", nameEs = "Asalto Cibernético",
            descKo = "정석 128 BPM 일렉트로 비트에 맞춘 연속 8분음표 교차 슬라이스!",
            descEn = "Continuous 8th-note alternating slices to classic 128 BPM electro.",
            descJa = "定番の128 BPMエレクトロビートに合わせた連続8分音符スライス！",
            descEs = "Cortes alternos continuos al clásico ritmo electro de 128 BPM.",
            bpm = 128f, targetNotes = 45, scrollSpeed = 18f,
            tunnelColor = new Color(0.2f, 0.08f, 0.35f), accentColor = Color.magenta
        },
        new TrackData {
            id = 3,
            nameKo = "글리치 홉 시티", nameEn = "Glitch Hop City", nameJa = "グリッチホップ・シティ", nameEs = "Ciudad Glitch Hop",
            descKo = "통통 튀는 당김음 싱코페이션 리듬과 트릭 비트 블록을 정밀 타격하세요.",
            descEn = "Strike syncopated off-beat rhythms and unexpected trick blocks.",
            descJa = "跳ねるシンコペーションリズムと不意打ちブロックを正確に斬撃！",
            descEs = "Golpea ritmos sincopados y bloques trampa inesperados.",
            bpm = 135f, targetNotes = 60, scrollSpeed = 19f,
            tunnelColor = new Color(0.1f, 0.35f, 0.25f), accentColor = new Color(0.2f, 1f, 0.6f)
        },
        new TrackData {
            id = 4,
            nameKo = "신스웨이브 석양", nameEn = "Synthwave Sunset", nameJa = "シンセウェーブの夕暮れ", nameEs = "Atardecer Synthwave",
            descKo = "감미로운 레트로 신스 멜로디와 연속 4단 아르페지오 슬라이스 런웨이.",
            descEn = "Lush retro-synth melodies paired with rapid 4-lane arpeggios.",
            descJa = "甘美なレトロシンセメロディと連続4レーンアルペジオスライス。",
            descEs = "Melodías retro-synth emparejadas con arpegios rápidos de 4 carriles.",
            bpm = 124f, targetNotes = 75, scrollSpeed = 18f,
            tunnelColor = new Color(0.35f, 0.12f, 0.25f), accentColor = new Color(1f, 0.4f, 0.7f)
        },
        new TrackData {
            id = 5,
            nameKo = "드럼앤베이스 블리츠", nameEn = "Drum & Bass Blitz", nameJa = "ドラムンベース・電撃戦", nameEs = "Relámpago Drum & Bass",
            descKo = "160 BPM 초고속 브레이크비트 폭풍 속에서 극한의 손맛을 느껴보세요!",
            descEn = "Experience intense tactile frenzy amid 160 BPM breakbeat torrents!",
            descJa = "160 BPM超高速ブレイクビートの嵐の中で極上の爽快感を体感！",
            descEs = "¡Experimenta un frenesí táctil intenso en torrentes de breakbeat a 160 BPM!",
            bpm = 160f, targetNotes = 90, scrollSpeed = 22f,
            tunnelColor = new Color(0.05f, 0.25f, 0.35f), accentColor = Color.cyan
        },
        new TrackData {
            id = 6,
            nameKo = "일렉트로 볼텍스", nameEn = "Electro Vortex", nameJa = "エレクトロ・ヴォルテックス", nameEs = "Vórtice Electro",
            descKo = "양손이 쉴 새 없이 교차하는 크로스오버 나선 패턴 챌린지.",
            descEn = "Master dynamic crossover patterns demanding relentless hand coordination.",
            descJa = "両手が絶え間なく交差するクロスオーバー螺旋パターンに挑戦。",
            descEs = "Domina patrones cruzados dinámicos que exigen coordinación constante.",
            bpm = 145f, targetNotes = 105, scrollSpeed = 21f,
            tunnelColor = new Color(0.3f, 0.05f, 0.35f), accentColor = Color.yellow
        },
        new TrackData {
            id = 7,
            nameKo = "하드스타일 오버드라이브", nameEn = "Hardstyle Overdrive", nameJa = "ハードスタイル・過負荷", nameEs = "Sobrecarga Hardstyle",
            descKo = "묵직한 디스토션 킥 사운드와 위험천만한 스파이크 폭탄 회피!",
            descEn = "Heavy distorted kick drums paired with lethal spiked bomb obstacles!",
            descJa = "重厚な歪みキックと危険なトゲ爆弾を回避しながらスライス！",
            descEs = "¡Bombos distorsionados pesados junto con peligrosas bombas de pinchos!",
            bpm = 150f, targetNotes = 120, scrollSpeed = 23f, hasBombs = true,
            tunnelColor = new Color(0.35f, 0.1f, 0.05f), accentColor = Color.red
        },
        new TrackData {
            id = 8,
            nameKo = "더브스텝 디스트로이어", nameEn = "Dubstep Destroyer", nameJa = "ダブステップ・デストロイヤー", nameEs = "Destructor Dubstep",
            descKo = "헤비 베이스 드롭과 불규칙 워블 베이스 타이밍 정밀 베기!",
            descEn = "Drop the heavy sub-bass and slice through erratic wobble rhythms!",
            descJa = "ヘビーベースドロップと不規則ウォブルベースの精密スラッシュ！",
            descEs = "¡Suelta el sub-bajo pesado y corta a través de ritmos wobble irregulares!",
            bpm = 140f, targetNotes = 140, scrollSpeed = 22f, hasBombs = true,
            tunnelColor = new Color(0.18f, 0.05f, 0.3f), accentColor = new Color(0.5f, 0.2f, 1f)
        },
        new TrackData {
            id = 9,
            nameKo = "스피드코어 나이트메어", nameEn = "Speedcore Nightmare", nameJa = "スピードコア・悪夢", nameEs = "Pesadilla Speedcore",
            descKo = "175 BPM 극한의 속도전! 쉴 틈 없이 쏟아지는 폭풍 릴레이.",
            descEn = "Extreme 175 BPM supersonic assault with zero room for error.",
            descJa = "175 BPM極限の超高速戦！休む間もなく押し寄せる嵐の連打。",
            descEs = "Asalto supersónico extremo a 175 BPM sin margen de error.",
            bpm = 175f, targetNotes = 165, scrollSpeed = 25f, hasBombs = true,
            tunnelColor = new Color(0.35f, 0.05f, 0.1f), accentColor = Color.white
        },
        new TrackData {
            id = 10,
            nameKo = "보스 트랙: 네온 타이탄", nameEn = "Boss: Neon Titan", nameJa = "ボストラック：ネオンタイタン", nameEs = "Jefe: Titán de Neón",
            descKo = "거대 사이버 네온 타이탄이 전방에서 탄막 비트 큐브를 폭사합니다!",
            descEn = "Face the colossal Neon Titan unleashing relentless rhythmic barrages!",
            descJa = "巨大サイバータイタンが正面から弾幕ビートキューブを一斉発射！",
            descEs = "¡Enfréntate al titánico Jefe de Neón y sus implacables ráfagas rítmicas!",
            bpm = 165f, targetNotes = 190, scrollSpeed = 24f, hasBombs = true, isBossTrack = true,
            tunnelColor = new Color(0.4f, 0.15f, 0.05f), accentColor = Color.red
        },
        new TrackData {
            id = 11,
            nameKo = "초차원 레이브", nameEn = "Hyperdimension Rave", nameJa = "超次元レイヴ", nameEs = "Rave Hiperdimensional",
            descKo = "185 BPM 변박자 폴리리듬과 초광속 네온 블록의 극한 시험대!",
            descEn = "Hyper-speed polyrhythmic madness testing the limits of human reflexes!",
            descJa = "185 BPM変拍子ポリリズムと超光速ネオンブロックの極限試練！",
            descEs = "¡Locura polirrítmica a 185 BPM que pondrá a prueba tus reflejos!",
            bpm = 185f, targetNotes = 220, scrollSpeed = 27f, hasBombs = true,
            tunnelColor = new Color(0.1f, 0.05f, 0.35f), accentColor = Color.cyan
        },
        new TrackData {
            id = 12,
            nameKo = "코스믹 심포니 피날레", nameEn = "Cosmic Symphony Finale", nameJa = "コズミック・シンフォニー 終曲", nameEs = "Sinfonía Cósmica Final",
            descKo = "200 BPM 궁극의 마스터 피날레! 모든 테크닉을 쏟아부어 완주하세요.",
            descEn = "The ultimate 200 BPM climax! Unleash every skill to achieve perfection.",
            descJa = "200 BPM究極のマスター終曲！全技術を注ぎ込み完全制覇を達成せよ。",
            descEs = "¡El clímax definitivo a 200 BPM! Despliega toda tu maestría rítmica.",
            bpm = 200f, targetNotes = 260, scrollSpeed = 29f, hasBombs = true, isBossTrack = true,
            tunnelColor = new Color(0.4f, 0.25f, 0.05f), accentColor = Color.yellow
        }
    };

    void Awake()
    {
        switch (OiyoLang.Pick("ko", "en", "ja", "es")) { case "en": lang = BeatLanguage.EN; break; case "ja": lang = BeatLanguage.JA; break; case "es": lang = BeatLanguage.ES; break; default: lang = BeatLanguage.KO; break; }
        Application.targetFrameRate = 60;
        mainCam = Camera.main;
        if (mainCam == null)
        {
            var camGo = new GameObject("MainCamera");
            mainCam = camGo.AddComponent<Camera>();
            camGo.tag = "MainCamera";
        }
        mainCam.backgroundColor = new Color(0.02f, 0.03f, 0.07f);
        mainCam.clearFlags = CameraClearFlags.SolidColor;
        mainCam.transform.position = new Vector3(0, 2.4f, -4.8f);
        mainCam.transform.rotation = Quaternion.Euler(15f, 0, 0);

        audioSource = gameObject.AddComponent<AudioSource>();
        audioSource.playOnAwake = false;

        musicSource = gameObject.AddComponent<AudioSource>();
        musicSource.playOnAwake = false;
        musicSource.loop = true;

        GenerateAudioClips();
        CreateMaterials();
        CreateRunwayAndTunnel();
        CreateSabers();
        CreateParticleSystems();

        bestScore = PlayerPrefs.GetInt("BeatSlice_BestScore", 0);
        ResetToStage(0);
    }

    // ---- Painted art (scripts/make_art.py -> Resources/BS/Art) ----
    private Material hiltMat;
    private Material backdropMat;

    private static Material ArtMat(string tex, Color tint, float tileY = 1f)
    {
        var sh = Shader.Find("OIYO/UnlitCutout");
        var m = new Material(sh != null ? sh : Shader.Find("Sprites/Default"));
        var t = Resources.Load<Texture2D>("BS/Art/" + tex);
        if (t != null)
        {
            t.wrapMode = tileY != 1f ? TextureWrapMode.Repeat : TextureWrapMode.Clamp;
            m.mainTexture = t;
        }
        m.mainTextureScale = new Vector2(1f, tileY);
        m.color = tint;
        return m;
    }

    private static Material FlatMat(Color c)
    {
        var m = new Material(Shader.Find("Sprites/Default"));
        m.color = c;
        return m;
    }

    private void CreateMaterials()
    {
        // Notes glow on their own, so they are unlit painted glass tiles.
        cyanMat = ArtMat("note_cyan", Color.white);
        magentaMat = ArtMat("note_magenta", Color.white);
        goldMat = ArtMat("note_gold", Color.white);
        bombMat = ArtMat("note_bomb", Color.white);
        runwayMat = ArtMat("runway", Color.white, 14f);
        saberLeftMat = ArtMat("blade", new Color(0.35f, 0.97f, 1.0f));
        saberRightMat = ArtMat("blade", new Color(1.0f, 0.42f, 0.78f));
        pillarMat = ArtMat("pillar", stages[0].tunnelColor);
        hiltMat = ArtMat("hilt", Color.white);
        backdropMat = ArtMat("horizon", Color.white);
        backdropMat.renderQueue = 1000; // sky: drawn first
    }

    private void CreateRunwayAndTunnel()
    {
        // 4-lane Floor Runway
        var floor = GameObject.CreatePrimitive(PrimitiveType.Cube);
        floor.name = "RunwayFloor";
        floor.transform.position = new Vector3(0, -0.1f, 25f);
        floor.transform.localScale = new Vector3(6.2f, 0.2f, 70f);
        floor.GetComponent<Renderer>().material = runwayMat;

        // Lane Separator Lines
        for (int i = -1; i <= 1; i++)
        {
            var line = GameObject.CreatePrimitive(PrimitiveType.Cube);
            line.transform.position = new Vector3(i * 1.5f, 0.02f, 25f);
            line.transform.localScale = new Vector3(0.06f, 0.05f, 70f);
            line.GetComponent<Renderer>().material = FlatMat(new Color(0.3f, 0.5f, 0.95f));
        }

        // Tunnel Neon Arches / Pillars along the track
        for (int i = 0; i < 20; i++)
        {
            float z = i * 4.0f;
            // Left pillar
            var pL = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            pL.transform.position = new Vector3(-3.4f, 2.5f, z);
            pL.transform.localScale = new Vector3(0.18f, 2.8f, 0.18f);
            pL.GetComponent<Renderer>().material = pillarMat;
            tunnelPillars.Add(pL.transform);

            // Right pillar
            var pR = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            pR.transform.position = new Vector3(3.4f, 2.5f, z);
            pR.transform.localScale = new Vector3(0.18f, 2.8f, 0.18f);
            pR.GetComponent<Renderer>().material = pillarMat;
            tunnelPillars.Add(pR.transform);

            // Top Arch Crossbar
            var bar = GameObject.CreatePrimitive(PrimitiveType.Cube);
            bar.transform.position = new Vector3(0, 5.2f, z);
            bar.transform.localScale = new Vector3(7.0f, 0.15f, 0.15f);
            bar.GetComponent<Renderer>().material = pillarMat;
            tunnelPillars.Add(bar.transform);
        }

        // Painted night sky and skyline behind the far end of the runway
        var sky = GameObject.CreatePrimitive(PrimitiveType.Quad);
        sky.name = "Horizon";
        Destroy(sky.GetComponent<Collider>());
        sky.transform.position = new Vector3(0f, 3f, 64f);
        sky.transform.localScale = new Vector3(150f, 75f, 1f);
        sky.GetComponent<Renderer>().material = backdropMat;

        // Directional Light
        var sunGo = new GameObject("RunwayLight");
        var sun = sunGo.AddComponent<Light>();
        sun.type = LightType.Directional;
        sun.intensity = 0.85f;
        sun.color = new Color(0.7f, 0.85f, 1f);
        sunGo.transform.rotation = Quaternion.Euler(35, 20, 0);
    }

    private void CreateSabers()
    {
        // Left Saber (Cyan)
        saberLeftGo = new GameObject("SaberLeft");
        saberLeftGo.transform.position = saberLeftPos;

        var bladeL = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        bladeL.transform.SetParent(saberLeftGo.transform);
        bladeL.transform.localPosition = new Vector3(0, 0.8f, 0.4f);
        bladeL.transform.localRotation = Quaternion.Euler(45, 0, 0);
        bladeL.transform.localScale = new Vector3(0.1f, 0.9f, 0.1f);
        bladeL.GetComponent<Renderer>().material = saberLeftMat;

        var hiltL = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        hiltL.transform.SetParent(saberLeftGo.transform);
        hiltL.transform.localPosition = Vector3.zero;
        hiltL.transform.localRotation = Quaternion.Euler(45, 0, 0);
        hiltL.transform.localScale = new Vector3(0.14f, 0.25f, 0.14f);
        hiltL.GetComponent<Renderer>().material = hiltMat;

        // Right Saber (Magenta)
        saberRightGo = new GameObject("SaberRight");
        saberRightGo.transform.position = saberRightPos;

        var bladeR = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        bladeR.transform.SetParent(saberRightGo.transform);
        bladeR.transform.localPosition = new Vector3(0, 0.8f, 0.4f);
        bladeR.transform.localRotation = Quaternion.Euler(45, 0, 0);
        bladeR.transform.localScale = new Vector3(0.1f, 0.9f, 0.1f);
        bladeR.GetComponent<Renderer>().material = saberRightMat;

        var hiltR = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        hiltR.transform.SetParent(saberRightGo.transform);
        hiltR.transform.localPosition = Vector3.zero;
        hiltR.transform.localRotation = Quaternion.Euler(45, 0, 0);
        hiltR.transform.localScale = new Vector3(0.14f, 0.25f, 0.14f);
        hiltR.GetComponent<Renderer>().material = hiltMat;
    }

    private void CreateParticleSystems()
    {
        var pGo = new GameObject("SparkParticles");
        sparkParticles = pGo.AddComponent<ParticleSystem>();
        var pm = sparkParticles.main;
        pm.startSize = 0.25f;
        pm.startLifetime = 0.45f;
        pm.startSpeed = 8f;
        pm.startColor = Color.cyan;
        pm.simulationSpace = ParticleSystemSimulationSpace.World;
        // WebGL has no default particle material (it rendered as magenta squares)
        var pr = pGo.GetComponent<ParticleSystemRenderer>();
        var spark = new Material(Shader.Find("Sprites/Default"));
        spark.mainTexture = Resources.Load<Texture2D>("BS/Art/spark");
        pr.material = spark;
        var pe = sparkParticles.emission;
        pe.rateOverTime = 0f;
    }

    private void ResetToStage(int index)
    {
        currentStageIndex = Mathf.Clamp(index, 0, stages.Length - 1);
        var trk = stages[currentStageIndex];

        pillarMat.color = trk.tunnelColor;
        backdropMat.color = Color.Lerp(Color.white, trk.tunnelColor, 0.3f);
        mainCam.backgroundColor = new Color(trk.tunnelColor.r * 0.2f, trk.tunnelColor.g * 0.2f, trk.tunnelColor.b * 0.2f);

        score = 0;
        combo = 0;
        multiplier = 1;
        notesHit = 0;
        notesTotal = 0;
        perfectCount = 0;
        greatCount = 0;
        goodCount = 0;
        missCount = 0;
        health = 100f;
        isFever = false;
        feverTimer = 0f;
        beatTimer = 0f;
        songTime = 0f;
        nextNoteId = 0;
        lastJudgment = "";
        judgmentAlpha = 0f;
        camShake = 0f;

        // Clear existing notes & sliced halves
        foreach (var n in notes)
        {
            if (n.go != null) Destroy(n.go);
        }
        notes.Clear();

        foreach (var h in slicedHalves)
        {
            if (h.go != null) Destroy(h.go);
        }
        slicedHalves.Clear();

        state = GameState.Ready;
    }

    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("beat-slice-3d", state, score);
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
                2.4f + UnityEngine.Random.Range(-camShake, camShake) * 0.5f,
                -4.8f
            );
        }

        // Judgment fade
        if (judgmentAlpha > 0)
        {
            judgmentAlpha = Mathf.Max(0, judgmentAlpha - dt * 2.0f);
        }

        // Fever decay
        if (isFever)
        {
            feverTimer -= dt;
            if (feverTimer <= 0)
            {
                isFever = false;
                multiplier = Mathf.Max(1, multiplier / 2);
            }
        }

        UpdateTunnel(dt);

        if (state == GameState.Ready)
        {
            if (Input.GetKeyDown(KeyCode.Space) || Input.GetMouseButtonDown(0))
            {
                state = GameState.Playing;
            }
        }
        else if (state == GameState.Playing)
        {
            songTime += dt;
            UpdateSabers(dt);
            UpdateRhythmSpawns(dt);
            UpdateNotes(dt);
            UpdateSlicedHalves(dt);
            CheckStageProgression();
        }

        UpdateVisuals();
    }

    private void UpdateTunnel(float dt)
    {
        var trk = stages[currentStageIndex];
        float speed = trk.scrollSpeed * dt;
        runwayScroll += speed;
        runwayMat.mainTextureOffset = new Vector2(0f, runwayScroll * 14f / 70f);

        for (int i = 0; i < tunnelPillars.Count; i++)
        {
            var p = tunnelPillars[i];
            p.position -= new Vector3(0, 0, speed);
            if (p.position.z < -4.0f)
            {
                p.position = new Vector3(p.position.x, p.position.y, p.position.z + 80f);
            }
        }
    }

    private void UpdateSabers(float dt)
    {
        saberLeftPrevPos = saberLeftPos;
        saberRightPrevPos = saberRightPos;

        // Mouse & Touch Control
        Vector3 mouseScreen = Input.mousePosition;
        Ray ray = mainCam.ScreenPointToRay(mouseScreen);
        Plane plane = new Plane(Vector3.forward, new Vector3(0, 0, -1.0f));
        float dist;

        if (plane.Raycast(ray, out dist))
        {
            Vector3 hitPoint = ray.GetPoint(dist);
            // If mouse left button held or cursor in left half
            if (hitPoint.x < 0)
            {
                saberLeftPos = Vector3.Lerp(saberLeftPos, new Vector3(Mathf.Clamp(hitPoint.x, -2.8f, -0.3f), Mathf.Clamp(hitPoint.y, 0.4f, 2.6f), -1.0f), dt * 25f);
            }
            else
            {
                saberRightPos = Vector3.Lerp(saberRightPos, new Vector3(Mathf.Clamp(hitPoint.x, 0.3f, 2.8f), Mathf.Clamp(hitPoint.y, 0.4f, 2.6f), -1.0f), dt * 25f);
            }
        }

        // Keyboard Quick Cuts (A/S for Left, K/L for Right)
        if (Input.GetKeyDown(KeyCode.A)) { saberLeftPos = new Vector3(-2.25f, 1.2f, -1.0f); TriggerManualCut(saberLeftPos, 0); }
        if (Input.GetKeyDown(KeyCode.S)) { saberLeftPos = new Vector3(-0.75f, 1.2f, -1.0f); TriggerManualCut(saberLeftPos, 0); }
        if (Input.GetKeyDown(KeyCode.K)) { saberRightPos = new Vector3(0.75f, 1.2f, -1.0f); TriggerManualCut(saberRightPos, 1); }
        if (Input.GetKeyDown(KeyCode.L)) { saberRightPos = new Vector3(2.25f, 1.2f, -1.0f); TriggerManualCut(saberRightPos, 1); }

        saberLeftGo.transform.position = saberLeftPos;
        saberRightGo.transform.position = saberRightPos;

        saberLeftVel = (saberLeftPos - saberLeftPrevPos) / Mathf.Max(0.001f, dt);
        saberRightVel = (saberRightPos - saberRightPrevPos) / Mathf.Max(0.001f, dt);
    }

    private void TriggerManualCut(Vector3 cutPos, int saberSide)
    {
        // Check collision against nearby notes in strike zone
        for (int i = 0; i < notes.Count; i++)
        {
            var n = notes[i];
            if (!n.sliced && Mathf.Abs(n.z - cutPos.z) < 1.4f && Mathf.Abs(n.laneX - cutPos.x) < 0.9f)
            {
                SliceNote(i, cutPos);
                break;
            }
        }
    }

    private void UpdateRhythmSpawns(float dt)
    {
        var trk = stages[currentStageIndex];
        float beatInterval = 60f / trk.bpm;
        beatTimer += dt;

        if (beatTimer >= beatInterval * 0.5f) // 8th note resolution
        {
            beatTimer = 0f;
            if (notesTotal < trk.targetNotes || isEndless)
            {
                SpawnRhythmNote();
            }
        }
    }

    private void SpawnRhythmNote()
    {
        var trk = stages[currentStageIndex];
        notesTotal++;

        // 4 Lanes: -2.25 (Left Outer), -0.75 (Left Inner), +0.75 (Right Inner), +2.25 (Right Outer)
        float[] lanes = new float[] { -2.25f, -0.75f, 0.75f, 2.25f };
        int laneIdx = UnityEngine.Random.Range(0, 4);
        float laneX = lanes[laneIdx];

        int type = laneX < 0 ? 0 : 1; // 0: Cyan, 1: Magenta
        if (trk.hasBombs && UnityEngine.Random.value < 0.16f) type = 3; // Bomb
        else if (UnityEngine.Random.value < 0.08f) type = 2; // Gold Star

        var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
        go.transform.position = new Vector3(laneX, 1.15f, 38f);
        go.transform.localScale = new Vector3(0.85f, 0.85f, 0.85f);

        var r = go.GetComponent<Renderer>();
        if (type == 0) r.material = cyanMat;
        else if (type == 1) r.material = magentaMat;
        else if (type == 2) r.material = goldMat;
        else r.material = bombMat;

        // The cut glyph is painted on the tile itself (note_*.png).
        GameObject arrow = null;

        notes.Add(new BeatNote
        {
            id = nextNoteId++,
            laneX = laneX,
            z = 38f,
            type = type,
            cutDir = 0,
            sliced = false,
            go = go,
            arrowGo = arrow
        });
    }

    private void UpdateNotes(float dt)
    {
        var trk = stages[currentStageIndex];
        float speed = trk.scrollSpeed;

        for (int i = notes.Count - 1; i >= 0; i--)
        {
            var n = notes[i];
            n.z -= speed * dt;

            if (n.go != null)
            {
                n.go.transform.position = new Vector3(n.laneX, 1.15f, n.z);
            }

            // Saber Slice Check in Strike Zone (Z between -1.8 and -0.2)
            if (!n.sliced && n.z < 0.2f && n.z > -2.0f)
            {
                // Check Left Saber
                if ((n.type == 0 || n.type == 2) && Vector3.Distance(new Vector3(n.laneX, 1.15f, n.z), saberLeftPos) < 1.15f)
                {
                    SliceNote(i, saberLeftPos);
                    continue;
                }
                // Check Right Saber
                else if ((n.type == 1 || n.type == 2) && Vector3.Distance(new Vector3(n.laneX, 1.15f, n.z), saberRightPos) < 1.15f)
                {
                    SliceNote(i, saberRightPos);
                    continue;
                }
                // Bomb cut (hazard)
                else if (n.type == 3 && (Vector3.Distance(new Vector3(n.laneX, 1.15f, n.z), saberLeftPos) < 1.0f || Vector3.Distance(new Vector3(n.laneX, 1.15f, n.z), saberRightPos) < 1.0f))
                {
                    SliceBomb(i);
                    continue;
                }
            }

            // Note missed past the player
            if (!n.sliced && n.z < -3.0f)
            {
                if (n.type != 3) // Missed normal note
                {
                    missCount++;
                    combo = 0;
                    multiplier = 1;
                    health = Mathf.Max(0f, health - 12f);
                    ShowJudgment("MISS", Color.red);
                    if (health <= 0f)
                    {
                        state = GameState.GameOver;
                    }
                }

                if (n.go != null) Destroy(n.go);
                notes.RemoveAt(i);
            }
            else
            {
                notes[i] = n;
            }
        }
    }

    private void SliceNote(int index, Vector3 cutPos)
    {
        var n = notes[index];
        n.sliced = true;
        notesHit++;

        float zAccuracy = Mathf.Abs(n.z - (-1.0f));
        int pts = 350;

        if (zAccuracy < 0.35f)
        {
            pts = 1000;
            perfectCount++;
            ShowJudgment("PERFECT", Color.cyan);
            PlaySound(perfectClip, 0.7f);
        }
        else if (zAccuracy < 0.75f)
        {
            pts = 650;
            greatCount++;
            ShowJudgment("GREAT", Color.green);
            PlaySound(sliceClip, 0.6f);
        }
        else
        {
            pts = 350;
            goodCount++;
            ShowJudgment("GOOD", Color.yellow);
            PlaySound(sliceClip, 0.5f);
        }

        combo++;
        if (combo > maxCombo) maxCombo = combo;
        multiplier = 1 + (combo / 10);
        if (multiplier > 8) multiplier = 8;

        // Fever activation
        if (n.type == 2 || (combo >= 20 && !isFever))
        {
            isFever = true;
            feverTimer = 8.0f;
            multiplier *= 2;
            PlaySound(feverClip, 0.9f);
        }

        score += pts * multiplier;
        if (score > bestScore)
        {
            bestScore = score;
            PlayerPrefs.SetInt("BeatSlice_BestScore", bestScore);
        }

        health = Mathf.Min(100f, health + 4f);

        // Spawn 2 tumbling halved slices
        SpawnHalves(n.go.transform.position, n.type);

        // Spark explosion
        sparkParticles.transform.position = cutPos;
        sparkParticles.Emit(25);

        if (n.go != null) Destroy(n.go);
        notes.RemoveAt(index);
    }

    private void SliceBomb(int index)
    {
        var n = notes[index];
        n.sliced = true;

        camShake = 0.8f;
        PlaySound(bombClip, 0.9f);
        ShowJudgment("BOMB HIT!", Color.red);

        combo = 0;
        multiplier = 1;
        health = Mathf.Max(0f, health - 25f);

        sparkParticles.transform.position = n.go.transform.position;
        sparkParticles.Emit(40);

        if (n.go != null) Destroy(n.go);
        notes.RemoveAt(index);

        if (health <= 0f)
        {
            state = GameState.GameOver;
        }
    }

    private void SpawnHalves(Vector3 center, int type)
    {
        for (int i = 0; i < 2; i++)
        {
            var h = GameObject.CreatePrimitive(PrimitiveType.Cube);
            h.transform.position = center + new Vector3((i == 0 ? -0.22f : 0.22f), 0, 0);
            h.transform.localScale = new Vector3(0.4f, 0.85f, 0.85f);
            var m = new Material(type == 0 ? cyanMat : (type == 1 ? magentaMat : goldMat));
            h.GetComponent<Renderer>().material = m;

            Vector3 vel = new Vector3((i == 0 ? -4.5f : 4.5f), UnityEngine.Random.Range(2f, 5f), -8f);
            Vector3 rotVel = new Vector3(UnityEngine.Random.Range(-300f, 300f), UnityEngine.Random.Range(-300f, 300f), UnityEngine.Random.Range(-300f, 300f));

            slicedHalves.Add(new SlicedHalf { pos = h.transform.position, vel = vel, rotVel = rotVel, life = 0.7f, go = h });
        }
    }

    private void UpdateSlicedHalves(float dt)
    {
        for (int i = slicedHalves.Count - 1; i >= 0; i--)
        {
            var h = slicedHalves[i];
            h.life -= dt;
            h.vel += new Vector3(0, -18f * dt, 0); // Gravity
            h.pos += h.vel * dt;

            if (h.go != null)
            {
                h.go.transform.position = h.pos;
                h.go.transform.Rotate(h.rotVel * dt);
            }

            if (h.life <= 0f)
            {
                if (h.go != null) Destroy(h.go);
                slicedHalves.RemoveAt(i);
            }
            else
            {
                slicedHalves[i] = h;
            }
        }
    }

    private void ShowJudgment(string text, Color col)
    {
        lastJudgment = text;
        lastJudgmentColor = col;
        judgmentAlpha = 1.0f;
    }

    private void CheckStageProgression()
    {
        if (isEndless) return;

        var trk = stages[currentStageIndex];
        if (notesHit >= trk.targetNotes)
        {
            PlaySound(fanfareClip, 0.9f);
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
        // Fever pulse colors
        if (isFever)
        {
            float hue = Mathf.PingPong(Time.time * 2f, 1f);
            Color feverCol = Color.HSVToRGB(hue, 0.8f, 1f);
            pillarMat.color = feverCol;
        }
    }

    private void PlaySound(AudioClip clip, float vol = 1.0f)
    {
        if (clip != null) audioSource.PlayOneShot(clip, vol);
    }

    private void GenerateAudioClips()
    {
        sliceClip = CreateSynthClip("slice", 0.12f, (t) => Mathf.Sin((900f - t * 4500f) * Mathf.PI * 2f * t));
        perfectClip = CreateSynthClip("perfect", 0.18f, (t) => Mathf.Sin(1760f * Mathf.PI * 2f * t) * 0.7f + Mathf.Sin(880f * Mathf.PI * 2f * t) * 0.3f);
        bombClip = CreateSynthClip("bomb", 0.45f, (t) => (UnityEngine.Random.value - 0.5f) * Mathf.Exp(-t * 4.0f));
        feverClip = CreateSynthClip("fever", 0.55f, (t) => Mathf.Sin((523.25f + t * 659.25f) * Mathf.PI * 2f * t));
        fanfareClip = CreateSynthClip("fanfare", 0.8f, (t) => Mathf.Sin((440f + t * 440f) * Mathf.PI * 2f * t) * 0.6f);
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
        GUILayout.Label($"<b>BEAT SLICE 3D</b>", GUILayout.Width(150));

        // Language Buttons
        GUI.color = lang == BeatLanguage.KO ? Color.cyan : Color.white;
        if (GUILayout.Button("KO", GUILayout.Width(45), GUILayout.Height(28))) lang = BeatLanguage.KO;
        GUI.color = lang == BeatLanguage.EN ? Color.cyan : Color.white;
        if (GUILayout.Button("EN", GUILayout.Width(45), GUILayout.Height(28))) lang = BeatLanguage.EN;
        GUI.color = lang == BeatLanguage.JA ? Color.cyan : Color.white;
        if (GUILayout.Button("JA", GUILayout.Width(45), GUILayout.Height(28))) lang = BeatLanguage.JA;
        GUI.color = lang == BeatLanguage.ES ? Color.cyan : Color.white;
        if (GUILayout.Button("ES", GUILayout.Width(45), GUILayout.Height(28))) lang = BeatLanguage.ES;

        GUILayout.FlexibleSpace();

        // Stage Select
        GUI.color = showStageSelect ? Color.yellow : Color.white;
        string stagesLabel = GetText("트랙 선택", "Tracks", "トラック選択", "Pistas");
        if (GUILayout.Button(stagesLabel, GUILayout.Width(110), GUILayout.Height(28)))
        {
            showStageSelect = !showStageSelect;
        }

        // Endless Toggle
        GUI.color = isEndless ? Color.green : Color.white;
        string endlessLabel = GetText("무한 스트림", "Endless", "エンドレス", "Infinito");
        if (GUILayout.Button(endlessLabel, GUILayout.Width(95), GUILayout.Height(28)))
        {
            isEndless = !isEndless;
            ResetToStage(currentStageIndex);
        }

        GUILayout.EndHorizontal();
        GUILayout.EndArea();

        // Floating Judgment Banner
        if (judgmentAlpha > 0f)
        {
            GUI.color = new Color(lastJudgmentColor.r, lastJudgmentColor.g, lastJudgmentColor.b, judgmentAlpha);
            GUI.skin.label.alignment = TextAnchor.MiddleCenter;
            GUI.Label(new Rect(w * 0.5f - 150, h * 0.38f, 300, 50), $"<size=28><b>{lastJudgment}</b></size>");
            GUI.skin.label.alignment = TextAnchor.UpperLeft;
            GUI.color = Color.white;
        }

        // HUD Overlay
        if (state == GameState.Playing || state == GameState.Ready)
        {
            var trk = stages[currentStageIndex];
            GUILayout.BeginArea(new Rect(20, 60, 320, 240));

            GUI.color = Color.white;
            string trackTitle = isEndless ? GetText("무한 네온 런웨이", "Endless Neon Runway", "エンドレス・ネオンランウェイ", "Pista Neón Infinita")
                                          : $"Track {trk.id}: {GetTrackName(trk)}";
            GUILayout.Label($"<size=17><b>{trackTitle}</b></size>");

            GUILayout.Space(4);
            string notesLabel = GetText("노트 완주", "Notes", "ノーツ", "Notas");
            string targetLabel = isEndless ? "∞" : $"{trk.targetNotes}";
            GUILayout.Label($"{notesLabel}: <b>{notesHit} / {targetLabel}</b> (BPM: {trk.bpm:0})");

            GUILayout.Label($"Score: <b>{score:N0}</b> (Best: {bestScore:N0})");

            string comboText = isFever ? $"🔥 FEVER COMBO: <b>{combo}x (x{multiplier})</b>" : $"COMBO: <b>{combo}x (x{multiplier})</b>";
            GUI.color = isFever ? Color.yellow : (combo > 10 ? Color.green : Color.white);
            GUILayout.Label($"<size=16><b>{comboText}</b></size>");
            GUI.color = Color.white;

            // Health Bar
            string hpLabel = GetText("체력", "Health", "ライフ", "Vida");
            GUILayout.Label($"{hpLabel}: {health:0}%");
            Rect hpRect = GUILayoutUtility.GetRect(220, 10);
            GUI.Box(hpRect, "");
            GUI.color = health > 30f ? Color.cyan : Color.red;
            GUI.Box(new Rect(hpRect.x, hpRect.y, hpRect.width * (health / 100f), hpRect.height), "");
            GUI.color = Color.white;

            GUILayout.EndArea();

            // Mobile Slicing Buttons (Optional touch aids on bottom corners)
            Rect leftCutBtn = new Rect(20, h - 85, 110, 65);
            GUI.color = new Color(0f, 0.9f, 1f, 0.8f);
            if (GUI.Button(leftCutBtn, $"<b>⚔️ LEFT\n[A / S]</b>"))
            {
                TriggerManualCut(saberLeftPos, 0);
            }

            Rect rightCutBtn = new Rect(w - 130, h - 85, 110, 65);
            GUI.color = new Color(1f, 0.1f, 0.65f, 0.8f);
            if (GUI.Button(rightCutBtn, $"<b>⚔️ RIGHT\n[K / L]</b>"))
            {
                TriggerManualCut(saberRightPos, 1);
            }
            GUI.color = Color.white;
        }

        // Modals
        if (showStageSelect) RenderStageSelectModal(w, h);
        else if (state == GameState.Ready) RenderReadyModal(w, h);
        else if (state == GameState.StageClear) RenderStageClearModal(w, h);
        else if (state == GameState.GameOver) RenderGameOverModal(w, h);
        else if (state == GameState.AllCleared) RenderAllClearedModal(w, h);
    }

    private void RenderReadyModal(int w, int h)
    {
        var trk = stages[currentStageIndex];
        float mw = 440;
        float mh = 270;
        Rect r = new Rect((w - mw) * 0.5f, (h - mh) * 0.5f, mw, mh);
        GUI.Box(r, "");

        GUILayout.BeginArea(new Rect(r.x + 20, r.y + 15, r.width - 40, r.height - 30));
        GUI.color = Color.cyan;
        GUILayout.Label($"<size=22><b>TRACK {trk.id}: {GetTrackName(trk)}</b></size>", GUILayout.Height(32));
        GUI.color = Color.white;

        GUILayout.Space(8);
        GUILayout.Label(GetTrackDesc(trk));

        GUILayout.Space(8);
        GUILayout.Label($"BPM: <b>{trk.bpm:0}</b> | {GetText("목표 슬라이스", "Target Slices", "目標スライス", "Meta")}: <b>{trk.targetNotes}</b>");

        string controlInfo = GetText("조작: [마우스 좌/우 드래그] 또는 [A/S/K/L 키]로 세이버 슬라이스",
                                     "Controls: [Mouse Left/Right Drag] or [A/S/K/L keys] to slice",
                                     "操作：[マウス左右ドラッグ] または [A/S/K/Lキー] でセーバースライス",
                                     "Controles: [Arrastrar Ratón] o [Teclas A/S/K/L] para cortar");
        GUILayout.Label($"<color=#aaa>{controlInfo}</color>");

        GUILayout.FlexibleSpace();
        GUI.color = Color.green;
        string startBtn = GetText("비트 스타트 (Start Beat)", "Start Beat", "ビート開始", "Iniciar Ritmo");
        if (GUILayout.Button($"<b>{startBtn}</b>", GUILayout.Height(44)))
        {
            state = GameState.Playing;
        }
        GUI.color = Color.white;

        GUILayout.EndArea();
    }

    private void RenderStageClearModal(int w, int h)
    {
        var trk = stages[currentStageIndex];
        float mw = 430;
        float mh = 280;
        Rect r = new Rect((w - mw) * 0.5f, (h - mh) * 0.5f, mw, mh);
        GUI.Box(r, "");

        GUILayout.BeginArea(new Rect(r.x + 20, r.y + 15, r.width - 40, r.height - 30));
        GUI.color = Color.yellow;
        GUILayout.Label($"<size=22><b>🎉 TRACK {trk.id} {GetText("완주 성공!", "STAGE CLEARED!", "ステージ完走！", "¡PISTA SUPERADA!")}</b></size>", GUILayout.Height(32));
        GUI.color = Color.white;

        GUILayout.Space(8);
        GUILayout.Label($"Score: <b>{score:N0}</b> (Best: {bestScore:N0})");
        GUILayout.Label($"Max Combo: <b>{maxCombo}x</b>");
        GUILayout.Label($"PERFECT: <color=#00f0ff><b>{perfectCount}</b></color> | GREAT: <color=#00ff88><b>{greatCount}</b></color> | GOOD: <b>{goodCount}</b>");

        GUILayout.FlexibleSpace();
        GUI.color = Color.green;
        string nextBtn = GetText("다음 트랙 도전 ▶", "Next Track ▶", "次のトラック ▶", "Siguiente Pista ▶");
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
        GUILayout.Label($"<size=22><b>💀 {GetText("트랙 실패 (TRACK FAILED)", "TRACK FAILED", "トラック失敗", "PISTA FALLIDA")}</b></size>", GUILayout.Height(32));
        GUI.color = Color.white;

        GUILayout.Space(8);
        GUILayout.Label($"Score: <b>{score:N0}</b> | Max Combo: <b>{maxCombo}x</b>");
        GUILayout.Label($"Miss: <color=red><b>{missCount}</b></color>");

        GUILayout.FlexibleSpace();
        GUILayout.BeginHorizontal();

        GUI.color = Color.yellow;
        string retryBtn = GetText("다시 도전 (Retry)", "Retry Track", "リトライ", "Reintentar");
        if (GUILayout.Button($"<b>{retryBtn}</b>", GUILayout.Height(44)))
        {
            ResetToStage(currentStageIndex);
            state = GameState.Playing;
        }

        GUI.color = Color.white;
        string menuBtn = GetText("트랙 목록", "Tracks", "トラック一覧", "Pistas");
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
        GUILayout.Label($"<size=23><b>🏆 {GetText("12트랙 전곡 완전 제패!", "ALL 12 TRACKS CONQUERED!", "全12トラック完全制覇！", "¡TODAS LAS PISTAS SUPERADAS!")}</b></size>", GUILayout.Height(34));
        GUI.color = Color.white;

        GUILayout.Space(8);
        GUILayout.Label(GetText("축하합니다! 200 BPM 코스믹 심포니를 정복하고 비트 슬라이스 마스터로 등극했습니다.",
                                "Incredible rhythm mastery! You conquered the 200 BPM Cosmic Symphony.",
                                "おめでとうございます！200 BPMコズミック・シンフォニーを制覇し、ビートスライスマスターとなりました。",
                                "¡Maestría rítmica absoluta! Has conquistado la Sinfonía Cósmica de 200 BPM."));

        GUILayout.Space(8);
        GUILayout.Label($"Final Score: <b>{score:N0}</b> | Max Combo: <b>{maxCombo}x</b>");

        GUILayout.FlexibleSpace();
        GUI.color = Color.green;
        string endlessBtn = GetText("무한 스트림 모드 ▶", "Endless Stream Mode ▶", "無限ストリームモード ▶", "Modo Stream Infinito ▶");
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
        GUILayout.Label($"<size=20><b>{GetText("트랙 선택 (12 Tracks)", "Select Track (12 Tracks)", "トラック選択 (全12曲)", "Seleccionar Pista (12 Pistas)")}</b></size>");
        GUI.color = Color.white;
        GUILayout.FlexibleSpace();
        if (GUILayout.Button("×", GUILayout.Width(35), GUILayout.Height(28)))
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
                    var trk = stages[idx];
                    GUI.color = idx == currentStageIndex ? Color.cyan : Color.white;

                    string btnText = $"<b>Track {trk.id}</b>\n<size=11>{GetTrackName(trk)}</size>\n<size=10>{trk.bpm:0} BPM</size>";
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
            case BeatLanguage.KO: return ko;
            case BeatLanguage.EN: return en;
            case BeatLanguage.JA: return ja;
            case BeatLanguage.ES: return es;
            default: return en;
        }
    }

    private string GetTrackName(TrackData t)
    {
        switch (lang)
        {
            case BeatLanguage.KO: return t.nameKo;
            case BeatLanguage.EN: return t.nameEn;
            case BeatLanguage.JA: return t.nameJa;
            case BeatLanguage.ES: return t.nameEs;
            default: return t.nameEn;
        }
    }

    private string GetTrackDesc(TrackData t)
    {
        switch (lang)
        {
            case BeatLanguage.KO: return t.descKo;
            case BeatLanguage.EN: return t.descEn;
            case BeatLanguage.JA: return t.descJa;
            case BeatLanguage.ES: return t.descEs;
            default: return t.descEn;
        }
    }
}
