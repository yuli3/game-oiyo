using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public static class StringExtensions
{
    public static string Repeat(this string s, int n)
    {
        if (n <= 0) return "";
        var sb = new System.Text.StringBuilder(s.Length * n);
        for (int i = 0; i < n; i++) sb.Append(s);
        return sb.ToString();
    }
}

public class PaperFlightPlayer : MonoBehaviour
{
    public enum GameLang { KO, EN, JA, ES }
    public static GameLang CurrentLang = GameLang.KO;

    public enum GameState { Ready, Flying, Stalled, Landed, StageClear, GameOver }
    public GameState state = GameState.Ready;

    // --- Audio Synthesis ---
    private AudioSource sfxSource;
    private AudioSource windSource;
    private AudioClip windLoopClip;

    // --- Visual Materials ---
    private Material planeMat;
    private Material ringMat;
    private Material craneMat;
    private Material updraftMat;
    private Material obstacleMat;
    private Material groundMat;
    private Material trailMat;

    // --- Flight Aerodynamics & State ---
    private GameObject planeObj;
    private MeshFilter planeMeshFilter;
    private LineRenderer leftTrail;
    private LineRenderer rightTrail;
    private List<Vector3> leftTrailPts = new List<Vector3>();
    private List<Vector3> rightTrailPts = new List<Vector3>();

    private Vector3 planePos;
    private Vector3 planeVelocity;
    private float pitchAngle = 0f;  // Degrees (-60 to +60)
    private float rollAngle = 0f;   // Degrees (-75 to +75)
    private float yawAngle = 0f;    // Degrees

    private float currentSpeed = 16f;
    private const float MinFlySpeed = 6.0f;
    private const float MaxGlideSpeed = 38.0f;
    private const float BaseCruiseSpeed = 16.0f;
    private const float Gravity = 9.8f;
    private const float GlideRatio = 5.2f; // Altitude lost per distance traveled

    private float stamina = 100f;
    private const float MaxStamina = 100f;
    private float stallTimer = 0f;

    private int score = 0;
    private int ringStreak = 0;
    private int cranesCollected = 0;
    private int totalCranesInStage = 0;
    private float flightTime = 0f;
    private float distanceTraveled = 0f;

    // --- Camera ---
    private Camera mainCam;
    private Vector3 camVel;

    // --- Stages & Course ---
    public struct StageDef
    {
        public int id;
        public string nameKo;
        public string nameEn;
        public string nameJa;
        public string nameEs;
        public float courseLength;
        public Color skyColor;
        public Color groundColor;
        public Color themeColor;
        public float windStrength;
        public int ringCount;
        public int craneCount;
        public int updraftCount;
        public int obstacleCount;
    }

    private static readonly StageDef[] Stages = new StageDef[]
    {
        new StageDef { id = 1, nameKo = "햇살 비치는 서재", nameEn = "Sunlit Study Room", nameJa = "日差しの書斎", nameEs = "Estudio Soleado", courseLength = 800f, skyColor = new Color(0.95f, 0.90f, 0.82f), groundColor = new Color(0.35f, 0.22f, 0.12f), themeColor = new Color(1f, 0.82f, 0.4f), windStrength = 0.5f, ringCount = 14, craneCount = 6, updraftCount = 4, obstacleCount = 12 },
        new StageDef { id = 2, nameKo = "거실 장애물 코스", nameEn = "Living Room Slalom", nameJa = "リビングスラローム", nameEs = "Eslalon de Salón", courseLength = 950f, skyColor = new Color(0.92f, 0.88f, 0.85f), groundColor = new Color(0.28f, 0.18f, 0.14f), themeColor = new Color(0.9f, 0.65f, 0.35f), windStrength = 1.0f, ringCount = 18, craneCount = 7, updraftCount = 5, obstacleCount = 16 },
        new StageDef { id = 3, nameKo = "푸른 정원과 분수", nameEn = "Green Garden & Fountain", nameJa = "緑の庭園と噴水", nameEs = "Jardín Verde y Fuente", courseLength = 1100f, skyColor = new Color(0.65f, 0.85f, 0.98f), groundColor = new Color(0.18f, 0.42f, 0.18f), themeColor = new Color(0.3f, 0.85f, 0.45f), windStrength = 1.5f, ringCount = 22, craneCount = 8, updraftCount = 6, obstacleCount = 20 },
        new StageDef { id = 4, nameKo = "벚꽃 바람길", nameEn = "Cherry Blossom Pathway", nameJa = "桜舞う小道", nameEs = "Camino de Cerezos", courseLength = 1250f, skyColor = new Color(0.98f, 0.86f, 0.92f), groundColor = new Color(0.25f, 0.35f, 0.22f), themeColor = new Color(1f, 0.55f, 0.75f), windStrength = 2.0f, ringCount = 25, craneCount = 9, updraftCount = 7, obstacleCount = 22 },
        new StageDef { id = 5, nameKo = "도시 옥상 빌딩 숲", nameEn = "Metropolis Rooftops", nameJa = "都会の屋上ビル群", nameEs = "Tejados de la Metrópoli", courseLength = 1400f, skyColor = new Color(0.6f, 0.75f, 0.9f), groundColor = new Color(0.15f, 0.18f, 0.22f), themeColor = new Color(0.2f, 0.7f, 1f), windStrength = 2.5f, ringCount = 28, craneCount = 10, updraftCount = 8, obstacleCount = 26 },
        new StageDef { id = 6, nameKo = "뭉게구름 바다", nameEn = "Fluffy Cloud Sea", nameJa = "雲海の回廊", nameEs = "Mar de Nubes Esponjosas", courseLength = 1600f, skyColor = new Color(0.55f, 0.8f, 1f), groundColor = new Color(0.85f, 0.92f, 0.98f), themeColor = new Color(0.8f, 0.95f, 1f), windStrength = 3.0f, ringCount = 32, craneCount = 12, updraftCount = 10, obstacleCount = 28 },
        new StageDef { id = 7, nameKo = "번개 구름 회랑", nameEn = "Thunder Cloud Alley", nameJa = "雷雲の小道", nameEs = "Paso de Nubes de Tormenta", courseLength = 1800f, skyColor = new Color(0.18f, 0.2f, 0.28f), groundColor = new Color(0.12f, 0.14f, 0.18f), themeColor = new Color(1f, 0.9f, 0.2f), windStrength = 4.0f, ringCount = 36, craneCount = 14, updraftCount = 11, obstacleCount = 32 },
        new StageDef { id = 8, nameKo = "붉은 암벽 협곡", nameEn = "Grand Canyon Gorge", nameJa = "グランドキャニオン峡谷", nameEs = "Garganta del Gran Cañón", courseLength = 2000f, skyColor = new Color(0.95f, 0.65f, 0.45f), groundColor = new Color(0.52f, 0.22f, 0.12f), themeColor = new Color(0.95f, 0.45f, 0.2f), windStrength = 3.5f, ringCount = 40, craneCount = 15, updraftCount = 12, obstacleCount = 35 },
        new StageDef { id = 9, nameKo = "황혼의 석양 해안", nameEn = "Sunset Coastline", nameJa = "黄昏の夕暮れ海岸", nameEs = "Costa al Atardecer", courseLength = 2200f, skyColor = new Color(0.98f, 0.45f, 0.35f), groundColor = new Color(0.12f, 0.25f, 0.42f), themeColor = new Color(1f, 0.6f, 0.2f), windStrength = 3.0f, ringCount = 44, craneCount = 16, updraftCount = 14, obstacleCount = 38 },
        new StageDef { id = 10, nameKo = "빛나는 수정 동굴", nameEn = "Luminescent Crystal Caves", nameJa = "発光水晶の洞窟", nameEs = "Cuevas de Cristal Brillante", courseLength = 2500f, skyColor = new Color(0.08f, 0.05f, 0.18f), groundColor = new Color(0.1f, 0.08f, 0.2f), themeColor = new Color(0.6f, 0.3f, 1f), windStrength = 2.0f, ringCount = 48, craneCount = 18, updraftCount = 15, obstacleCount = 42 },
        new StageDef { id = 11, nameKo = "오로라 은하수 밤하늘", nameEn = "Aurora Galaxy Night", nameJa = "オーロラ銀河の夜空", nameEs = "Noche de Aurora y Galaxia", courseLength = 2800f, skyColor = new Color(0.05f, 0.12f, 0.18f), groundColor = new Color(0.04f, 0.08f, 0.12f), themeColor = new Color(0.2f, 1f, 0.7f), windStrength = 3.0f, ringCount = 52, craneCount = 20, updraftCount = 16, obstacleCount = 45 },
        new StageDef { id = 12, nameKo = "우주 성층권 최종 활공", nameEn = "Cosmic Stratosphere Finale", nameJa = "成層圏の最終飛行", nameEs = "Final de la Estratosfera Cósmica", courseLength = 3200f, skyColor = new Color(0.02f, 0.03f, 0.08f), groundColor = new Color(0.08f, 0.18f, 0.32f), themeColor = new Color(0.4f, 0.8f, 1f), windStrength = 4.5f, ringCount = 60, craneCount = 24, updraftCount = 20, obstacleCount = 50 }
    };

    private int currentStageIndex = 0;
    private bool isEndlessMode = false;
    private bool showStageSelect = false;

    // --- Course Elements (Zero-Collider Math Objects) ---
    public class RingObj
    {
        public Vector3 center;
        public float radius = 3.2f;
        public bool passed = false;
        public GameObject viewGo;
    }

    public class CraneObj
    {
        public Vector3 pos;
        public float radius = 1.4f;
        public bool collected = false;
        public GameObject viewGo;
    }

    public class UpdraftObj
    {
        public Vector3 center;
        public float radius = 6.0f;
        public float minY = 0f;
        public float maxY = 35f;
        public float liftPower = 14f;
        public GameObject viewGo;
    }

    public class ObstacleObj
    {
        public Vector3 center;
        public Vector3 size; // AABB half-extents or cylinder radius/height
        public bool isPillar;
        public GameObject viewGo;
    }

    private List<RingObj> activeRings = new List<RingObj>();
    private List<CraneObj> activeCranes = new List<CraneObj>();
    private List<UpdraftObj> activeUpdrafts = new List<UpdraftObj>();
    private List<ObstacleObj> activeObstacles = new List<ObstacleObj>();
    private List<GameObject> decoObjects = new List<GameObject>();

    private float groundY = 0f;
    private float finishLineZ = 800f;
    private float lateralBoundary = 45f;

    // --- GUI Styling ---
    private GUIStyle headerTitleStyle;
    private GUIStyle headerSubStyle;
    private GUIStyle hudLabelStyle;
    private GUIStyle hudValueStyle;
    private GUIStyle btnStyle;
    private GUIStyle cardStyle;
    private GUIStyle stallAlertStyle;

    private void Awake()
    {
        switch (OiyoLang.Pick("ko", "en", "ja", "es")) { case "en": CurrentLang = GameLang.EN; break; case "ja": CurrentLang = GameLang.JA; break; case "es": CurrentLang = GameLang.ES; break; default: CurrentLang = GameLang.KO; break; }
        mainCam = Camera.main;
        if (mainCam == null)
        {
            var camGo = new GameObject("MainCamera");
            mainCam = camGo.AddComponent<Camera>();
            camGo.tag = "MainCamera";
        }
        mainCam.clearFlags = CameraClearFlags.SolidColor;
        mainCam.backgroundColor = Stages[0].skyColor;
        mainCam.fieldOfView = 65f;

        // Audio components
        sfxSource = gameObject.AddComponent<AudioSource>();
        windSource = gameObject.AddComponent<AudioSource>();
        windLoopClip = CreateWindAudioClip();
        windSource.clip = windLoopClip;
        windSource.loop = true;
        windSource.volume = 0f;
        windSource.Play();

        // Create Materials
        var unlitShader = Shader.Find("Hidden/Internal-Colored") ?? Shader.Find("Sprites/Default");
        // Painted paper art (scripts/make_art.py -> Resources/PF/Art)
        planeMat = ArtMat("notebook", Color.white);
        ringMat = ArtMat("hoop", Color.white);
        craneMat = ArtMat("crane", Color.white);
        updraftMat = new Material(unlitShader) { color = new Color(1f, 1f, 1f, 0.25f) };
        obstacleMat = ArtMat("books", Color.white);
        groundMat = ArtMat("floor", FloorTint(Stages[0].groundColor));
        groundMat.mainTexture.wrapMode = TextureWrapMode.Repeat;
        trailMat = new Material(unlitShader) { color = new Color(1f, 1f, 1f, 0.4f) };

        CreatePaperPlane();
        SetupStage(0);
    }

    private static Material ArtMat(string tex, Color tint)
    {
        var sh = Shader.Find("OIYO/UnlitCutout");
        var m = new Material(sh != null ? sh : Shader.Find("Sprites/Default"));
        var t = Resources.Load<Texture2D>("PF/Art/" + tex);
        if (t != null) { t.wrapMode = TextureWrapMode.Clamp; m.mainTexture = t; }
        m.color = tint;
        return m;
    }

    // stage ground colours are dark; the boards are pale, so lift the tint
    private static Color FloorTint(Color c) => new Color(Mathf.Min(1f, c.r * 2f + 0.1f), Mathf.Min(1f, c.g * 2f + 0.1f), Mathf.Min(1f, c.b * 2f + 0.1f), 1f);

    private static GameObject ArtQuad(string name, Vector3 pos, float w, float h, Material mat)
    {
        var go = GameObject.CreatePrimitive(PrimitiveType.Quad);
        go.name = name;
        Destroy(go.GetComponent<Collider>());
        go.transform.position = pos;
        go.transform.localScale = new Vector3(w, h, 1f);
        go.GetComponent<Renderer>().sharedMaterial = mat;
        return go;
    }

    private void CreatePaperPlane()
    {
        planeObj = new GameObject("OrigamiPaperPlane");
        planeMeshFilter = planeObj.AddComponent<MeshFilter>();
        var mr = planeObj.AddComponent<MeshRenderer>();
        mr.sharedMaterial = planeMat;

        // Build procedural aerodynamic origami paper plane mesh
        Mesh mesh = new Mesh();
        mesh.name = "PaperPlaneMesh";

        // Vertices for classic fold:
        // 0: Nose (0, 0, 1.4f)
        // 1: Left Wing Tip (-1.6f, 0.25f, -0.6f)
        // 2: Right Wing Tip (1.6f, 0.25f, -0.6f)
        // 3: Keel Bottom (0, -0.45f, -0.2f)
        // 4: Central Top Spine (0, 0.08f, -0.5f)
        // 5: Left Wing Fold (-0.45f, -0.05f, -0.5f)
        // 6: Right Wing Fold (0.45f, -0.05f, -0.5f)
        Vector3[] verts = new Vector3[]
        {
            new Vector3(0f, 0f, 1.4f),               // 0 Nose
            new Vector3(-1.6f, 0.25f, -0.6f),        // 1 L Wingtip
            new Vector3(1.6f, 0.25f, -0.6f),         // 2 R Wingtip
            new Vector3(0f, -0.45f, -0.2f),          // 3 Keel
            new Vector3(0f, 0.08f, -0.5f),           // 4 Top Spine
            new Vector3(-0.45f, -0.05f, -0.5f),      // 5 L Fold
            new Vector3(0.45f, -0.05f, -0.5f)        // 6 R Fold
        };

        // Triangles (two-sided for paper effect)
        List<int> tris = new List<int>();

        // Top Left Wing: 0, 1, 5 & reverse
        AddDoubleTri(tris, 0, 1, 5);
        // Top Right Wing: 0, 6, 2 & reverse
        AddDoubleTri(tris, 0, 6, 2);
        // Left Fold Slope: 0, 5, 4 & reverse
        AddDoubleTri(tris, 0, 5, 4);
        // Right Fold Slope: 0, 4, 6 & reverse
        AddDoubleTri(tris, 0, 4, 6);
        // Left Keel Underbelly: 0, 3, 5 & reverse
        AddDoubleTri(tris, 0, 3, 5);
        // Right Keel Underbelly: 0, 6, 3 & reverse
        AddDoubleTri(tris, 0, 6, 3);
        // Back Cover: 4, 5, 3 & 4, 3, 6
        AddDoubleTri(tris, 4, 5, 3);
        AddDoubleTri(tris, 4, 3, 6);

        mesh.vertices = verts;
        // plan-view UVs so the notebook paper lies across the wings
        var uvs = new Vector2[verts.Length];
        for (int i = 0; i < verts.Length; i++) uvs[i] = new Vector2(verts[i].x / 3.2f + 0.5f, verts[i].z / 2f + 0.3f);
        mesh.uv = uvs;
        mesh.triangles = tris.ToArray();
        mesh.RecalculateNormals();
        mesh.RecalculateBounds();
        planeMeshFilter.sharedMesh = mesh;

        // Trail Renderers on wingtips
        leftTrail = CreateWingTrail("LeftTrail");
        rightTrail = CreateWingTrail("RightTrail");
    }

    private LineRenderer CreateWingTrail(string name)
    {
        var go = new GameObject(name);
        go.transform.SetParent(planeObj.transform);
        var lr = go.AddComponent<LineRenderer>();
        lr.sharedMaterial = trailMat;
        lr.startWidth = 0.14f;
        lr.endWidth = 0.02f;
        lr.positionCount = 0;
        lr.useWorldSpace = true;
        return lr;
    }

    private void AddDoubleTri(List<int> list, int a, int b, int c)
    {
        list.Add(a); list.Add(b); list.Add(c);
        list.Add(c); list.Add(b); list.Add(a);
    }

    private void SetupStage(int index)
    {
        currentStageIndex = Mathf.Clamp(index, 0, Stages.Length - 1);
        StageDef s = Stages[currentStageIndex];

        mainCam.backgroundColor = s.skyColor;
        groundMat.color = FloorTint(s.groundColor);

        finishLineZ = isEndlessMode ? 999999f : s.courseLength;

        // Reset flight parameters
        planePos = new Vector3(0f, 15f, 0f);
        planeVelocity = Vector3.forward * BaseCruiseSpeed;
        pitchAngle = 0f;
        rollAngle = 0f;
        yawAngle = 0f;
        currentSpeed = BaseCruiseSpeed;
        stamina = MaxStamina;
        stallTimer = 0f;
        ringStreak = 0;
        cranesCollected = 0;
        flightTime = 0f;
        distanceTraveled = 0f;

        if (planeObj != null)
        {
            planeObj.transform.position = planePos;
            planeObj.transform.rotation = Quaternion.identity;
        }

        leftTrailPts.Clear();
        rightTrailPts.Clear();
        if (leftTrail != null) leftTrail.positionCount = 0;
        if (rightTrail != null) rightTrail.positionCount = 0;

        // Clear existing world elements
        ClearWorld();

        // Generate course elements
        GenerateCourse(s);

        state = GameState.Ready;
    }

    private void ClearWorld()
    {
        foreach (var r in activeRings) if (r.viewGo) Destroy(r.viewGo);
        activeRings.Clear();

        foreach (var c in activeCranes) if (c.viewGo) Destroy(c.viewGo);
        activeCranes.Clear();

        foreach (var u in activeUpdrafts) if (u.viewGo) Destroy(u.viewGo);
        activeUpdrafts.Clear();

        foreach (var o in activeObstacles) if (o.viewGo) Destroy(o.viewGo);
        activeObstacles.Clear();

        foreach (var d in decoObjects) if (d) Destroy(d);
        decoObjects.Clear();
    }

    private void GenerateCourse(StageDef s)
    {
        float length = isEndlessMode ? 3500f : s.courseLength;
        totalCranesInStage = s.craneCount;

        // 1. Boost Rings
        float ringStep = length / (s.ringCount + 1);
        for (int i = 1; i <= s.ringCount; i++)
        {
            float z = i * ringStep + UnityEngine.Random.Range(-10f, 10f);
            float x = Mathf.Sin(i * 0.7f) * 16f + UnityEngine.Random.Range(-4f, 4f);
            float y = 14f + Mathf.Cos(i * 0.9f) * 7f;

            var ring = new RingObj
            {
                center = new Vector3(x, y, z),
                radius = 3.2f,
                passed = false,
                viewGo = CreateRingVisual(new Vector3(x, y, z), 3.2f, s.themeColor)
            };
            activeRings.Add(ring);
        }

        // 2. Origami Cranes
        float craneStep = length / (s.craneCount + 1);
        for (int i = 1; i <= s.craneCount; i++)
        {
            float z = i * craneStep + UnityEngine.Random.Range(-12f, 12f);
            float x = Mathf.Sin(i * 1.3f) * 20f;
            float y = 16f + Mathf.Sin(i * 1.5f) * 8f;

            var crane = new CraneObj
            {
                pos = new Vector3(x, y, z),
                radius = 1.6f,
                collected = false,
                viewGo = CreateCraneVisual(new Vector3(x, y, z))
            };
            activeCranes.Add(crane);
        }

        // 3. Thermal Updrafts
        float updraftStep = length / (s.updraftCount + 1);
        for (int i = 1; i <= s.updraftCount; i++)
        {
            float z = i * updraftStep + UnityEngine.Random.Range(-15f, 15f);
            float x = Mathf.Cos(i * 0.8f) * 18f;
            float y = 0f;

            var updraft = new UpdraftObj
            {
                center = new Vector3(x, y, z),
                radius = 6.5f,
                minY = 0f,
                maxY = 38f,
                liftPower = 15f,
                viewGo = CreateUpdraftVisual(new Vector3(x, y, z), 6.5f, 38f, s.themeColor)
            };
            activeUpdrafts.Add(updraft);
        }

        // 4. Obstacles & Scenic Decor
        float obsStep = length / (s.obstacleCount + 1);
        for (int i = 1; i <= s.obstacleCount; i++)
        {
            float z = i * obsStep + UnityEngine.Random.Range(-8f, 8f);
            float x = UnityEngine.Random.Range(-24f, 24f);
            float height = UnityEngine.Random.Range(18f, 32f);

            var obs = new ObstacleObj
            {
                center = new Vector3(x, height * 0.5f, z),
                size = new Vector3(2.5f, height, 2.5f),
                isPillar = true,
                viewGo = CreateObstacleVisual(new Vector3(x, height * 0.5f, z), new Vector3(2.5f, height, 2.5f), s.groundColor)
            };
            activeObstacles.Add(obs);
        }

        // Ground visual strip
        CreateGroundCorridor(length, s.groundColor);
    }

    private GameObject CreateRingVisual(Vector3 center, float radius, Color color)
    {
        // striped paper hoop, facing the oncoming plane
        return ArtQuad("RingVisual", center, radius * 2.3f, radius * 2.3f, ringMat);
    }

    private GameObject CreateCraneVisual(Vector3 pos)
    {
        return ArtQuad("CraneVisual", pos, 2.4f, 2.4f, craneMat);
    }

    private GameObject CreateUpdraftVisual(Vector3 center, float radius, float height, Color themeColor)
    {
        var go = new GameObject("UpdraftVisual");
        go.transform.position = center;

        // Visual swirl rings at different heights
        int levels = 4;
        for (int l = 0; l < levels; l++)
        {
            float y = l * (height / levels) + 2f;
            var ringGo = new GameObject("SwirlRing");
            ringGo.transform.SetParent(go.transform);
            ringGo.transform.localPosition = new Vector3(0, y, 0);

            var lr = ringGo.AddComponent<LineRenderer>();
            lr.sharedMaterial = updraftMat;
            lr.startWidth = 0.16f;
            lr.endWidth = 0.16f;
            lr.useWorldSpace = false;
            lr.loop = true;

            int segs = 16;
            lr.positionCount = segs;
            for (int i = 0; i < segs; i++)
            {
                float ang = i * Mathf.PI * 2f / segs;
                lr.SetPosition(i, new Vector3(Mathf.Cos(ang) * radius, 0, Mathf.Sin(ang) * radius));
            }
        }
        return go;
    }

    private GameObject CreateObstacleVisual(Vector3 center, Vector3 size, Color baseCol)
    {
        var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
        go.name = "ObstacleVisual";
        go.transform.position = center;
        go.transform.localScale = size;
        var r = go.GetComponent<Renderer>();
        if (r)
        {
            // a tall stack of books: repeat the painted stack up the pillar
            var m = new Material(obstacleMat);
            m.mainTexture.wrapMode = TextureWrapMode.Repeat;
            m.mainTextureScale = new Vector2(1f, Mathf.Max(1f, size.y / 3f));
            r.sharedMaterial = m;
        }
        return go;
    }

    private void CreateGroundCorridor(float length, Color col)
    {
        var ground = GameObject.CreatePrimitive(PrimitiveType.Plane);
        ground.name = "GroundCorridor";
        ground.transform.position = new Vector3(0f, 0f, length * 0.5f);
        ground.transform.localScale = new Vector3(lateralBoundary * 0.2f, 1f, length * 0.1f);
        var r = ground.GetComponent<Renderer>();
        if (r) r.sharedMaterial = groundMat;
        groundMat.mainTextureScale = new Vector2(lateralBoundary * 2f / 6f, length / 6f);
        decoObjects.Add(ground);
    }

    private void Update()
    {
        // Global Keyboard Shortcut: L to cycle language
        if (Input.GetKeyDown(KeyCode.L))
        {
            CurrentLang = (GameLang)(((int)CurrentLang + 1) % 4);
        }

        switch (state)
        {
            case GameState.Ready:
                UpdateReady();
                break;
            case GameState.Flying:
            case GameState.Stalled:
                UpdateFlying();
                break;
            case GameState.Landed:
            case GameState.StageClear:
            case GameState.GameOver:
                UpdatePostFlight();
                break;
        }

        UpdateCamera();
    }

    private void UpdateReady()
    {
        // Gentle hover bob
        float hoverY = 15f + Mathf.Sin(Time.time * 2.5f) * 0.4f;
        planePos.y = hoverY;
        planeObj.transform.position = planePos;
        planeObj.transform.rotation = Quaternion.Euler(0f, 0f, Mathf.Sin(Time.time * 2f) * 3f);

        // Click / Space / Enter to launch
        if (Input.GetKeyDown(KeyCode.Space) || Input.GetKeyDown(KeyCode.Return) || Input.GetMouseButtonDown(0))
        {
            state = GameState.Flying;
            currentSpeed = BaseCruiseSpeed;
            PlaySoundGliderLaunch();
        }
    }

    private void UpdateFlying()
    {
        float dt = Time.deltaTime;
        flightTime += dt;

        // 1. Controls (Arrow keys, WASD, Mouse)
        float steerX = 0f;
        float pitchInput = 0f;

        if (Input.GetKey(KeyCode.A) || Input.GetKey(KeyCode.LeftArrow)) steerX -= 1f;
        if (Input.GetKey(KeyCode.D) || Input.GetKey(KeyCode.RightArrow)) steerX += 1f;
        if (Input.GetKey(KeyCode.W) || Input.GetKey(KeyCode.UpArrow)) pitchInput -= 1f; // Pitch down (dive)
        if (Input.GetKey(KeyCode.S) || Input.GetKey(KeyCode.DownArrow)) pitchInput += 1f; // Pitch up (climb)

        // Mouse steering when dragging or button held
        if (Input.GetMouseButton(0))
        {
            float normMouseX = (Input.mousePosition.x / Screen.width - 0.5f) * 2f;
            float normMouseY = (Input.mousePosition.y / Screen.height - 0.5f) * 2f;
            if (Mathf.Abs(normMouseX) > 0.15f) steerX = Mathf.Clamp(normMouseX * 1.5f, -1f, 1f);
            if (Mathf.Abs(normMouseY) > 0.15f) pitchInput = Mathf.Clamp(-normMouseY * 1.5f, -1f, 1f);
        }

        // Paper Flap Boost (Space / Click tap)
        if (Input.GetKeyDown(KeyCode.Space) && stamina >= 22f)
        {
            stamina -= 22f;
            currentSpeed = Mathf.Min(currentSpeed + 7.5f, MaxGlideSpeed);
            planePos.y += 0.8f;
            PlaySoundFlap();
        }
        else
        {
            // Passive stamina regeneration
            stamina = Mathf.Min(stamina + dt * 14f, MaxStamina);
        }

        // 2. Aerodynamics Calculation
        // Pitch: diving decreases pitch angle (-35 deg), climbing increases (+35 deg)
        float targetPitch = pitchInput * 35f;
        pitchAngle = Mathf.Lerp(pitchAngle, targetPitch, dt * 4f);

        // Roll: banking turns plane into turn
        float targetRoll = -steerX * 55f;
        rollAngle = Mathf.Lerp(rollAngle, targetRoll, dt * 5f);

        // Yaw: turn rate depends on roll angle
        float turnRate = -rollAngle * 1.2f;
        yawAngle += turnRate * dt;

        // Speed dynamics:
        // Diving (pitch < 0) accelerates forward speed, Climbing (pitch > 0) decelerates
        float gravityAccel = -Mathf.Sin(pitchAngle * Mathf.Deg2Rad) * Gravity * 1.8f;
        float drag = 0.08f * currentSpeed * currentSpeed * 0.025f;
        currentSpeed += (gravityAccel - drag) * dt;
        currentSpeed = Mathf.Clamp(currentSpeed, 4.0f, MaxGlideSpeed);

        // Stall Check: If speed falls below MinFlySpeed
        if (currentSpeed < MinFlySpeed)
        {
            state = GameState.Stalled;
            stallTimer += dt;
            // Stall causes uncontrollable nose drop
            pitchAngle = Mathf.Lerp(pitchAngle, -45f, dt * 3f);
        }
        else
        {
            if (state == GameState.Stalled && currentSpeed >= MinFlySpeed + 2.0f)
            {
                state = GameState.Flying;
                stallTimer = 0f;
            }
        }

        // 3. Vertical Rate (Climb/Descent)
        // Normal glide sink rate = currentSpeed / GlideRatio
        float baseSinkRate = currentSpeed / GlideRatio;
        float climbRate = Mathf.Sin(-pitchAngle * Mathf.Deg2Rad) * currentSpeed;
        float verticalVelocity = climbRate - (pitchAngle >= 0 ? baseSinkRate * 0.8f : 0f);

        // Stage Wind factor
        StageDef s = Stages[currentStageIndex];
        float crosswind = Mathf.Sin(planePos.z * 0.02f) * s.windStrength;

        // 4. Update Position
        Vector3 forwardDir = Quaternion.Euler(pitchAngle, yawAngle, rollAngle) * Vector3.forward;
        Vector3 displacement = forwardDir * currentSpeed * dt;
        displacement.x += crosswind * dt;
        displacement.y = verticalVelocity * dt;

        Vector3 prevPos = planePos;
        planePos += displacement;
        distanceTraveled = planePos.z;

        // Keep within lateral corridors
        planePos.x = Mathf.Clamp(planePos.x, -lateralBoundary, lateralBoundary);

        // 5. Environmental Checks (Zero-Collider Math)
        CheckThermalUpdrafts(dt);
        CheckBoostRings(prevPos, planePos);
        CheckOrigamiCranes(planePos);
        CheckObstacleCollisions(planePos);

        // Ground landing / crash check
        if (planePos.y <= groundY + 0.3f)
        {
            planePos.y = groundY + 0.3f;
            if (currentSpeed < 10f && pitchAngle > -15f)
            {
                // Soft Glide Landing
                state = GameState.Landed;
                PlaySoundLanding();
            }
            else
            {
                // Crash
                state = GameState.GameOver;
                PlaySoundCrash();
            }
        }

        // Finish line check
        if (!isEndlessMode && planePos.z >= finishLineZ)
        {
            state = GameState.StageClear;
            score += 1500 + (int)(stamina * 10f) + (cranesCollected * 500);
            PlaySoundClear();
        }

        // Update Plane Object
        planeObj.transform.position = planePos;
        planeObj.transform.rotation = Quaternion.Euler(pitchAngle, yawAngle, rollAngle);

        // Update Wingtip Trails
        UpdateTrails();

        // Update Wind Sound volume & pitch based on airspeed
        if (windSource != null)
        {
            float normSpeed = Mathf.InverseLerp(MinFlySpeed, MaxGlideSpeed, currentSpeed);
            windSource.volume = Mathf.Lerp(0.05f, 0.45f, normSpeed);
            windSource.pitch = Mathf.Lerp(0.7f, 1.4f, normSpeed);
        }

        // Passive scoring for distance
        score += Mathf.RoundToInt(displacement.z * 0.4f);
    }

    private void CheckThermalUpdrafts(float dt)
    {
        foreach (var u in activeUpdrafts)
        {
            float dx = planePos.x - u.center.x;
            float dz = planePos.z - u.center.z;
            float distSq = dx * dx + dz * dz;

            if (distSq <= u.radius * u.radius && planePos.y >= u.minY && planePos.y <= u.maxY)
            {
                // Plane is inside rising thermal column!
                float centerFactor = 1f - Mathf.Sqrt(distSq) / u.radius;
                float lift = u.liftPower * centerFactor * dt;
                planePos.y += lift;
                stamina = Mathf.Min(stamina + dt * 25f, MaxStamina);
                PlaySoundUpdraftHum();
            }
        }
    }

    private void CheckBoostRings(Vector3 prev, Vector3 curr)
    {
        foreach (var r in activeRings)
        {
            if (r.passed) continue;

            // Check if plane crossed ring's Z coordinate
            if ((prev.z <= r.center.z && curr.z >= r.center.z) || (Mathf.Abs(curr.z - r.center.z) < 2.0f))
            {
                float dx = curr.x - r.center.x;
                float dy = curr.y - r.center.y;
                float distSq = dx * dx + dy * dy;

                if (distSq <= r.radius * r.radius)
                {
                    r.passed = true;
                    ringStreak++;
                    int bonus = 150 * ringStreak;
                    score += bonus;
                    currentSpeed = Mathf.Min(currentSpeed + 8f, MaxGlideSpeed);
                    stamina = Mathf.Min(stamina + 30f, MaxStamina);
                    if (r.viewGo) r.viewGo.SetActive(false);
                    PlaySoundRingPass(ringStreak);
                }
            }
        }
    }

    private void CheckOrigamiCranes(Vector3 pos)
    {
        foreach (var c in activeCranes)
        {
            if (c.collected) continue;

            float distSq = (pos - c.pos).sqrMagnitude;
            if (distSq <= (c.radius + 1.2f) * (c.radius + 1.2f))
            {
                c.collected = true;
                cranesCollected++;
                score += 350;
                stamina = MaxStamina;
                if (c.viewGo) c.viewGo.SetActive(false);
                PlaySoundCraneCollect();
            }
        }
    }

    private void CheckObstacleCollisions(Vector3 pos)
    {
        foreach (var o in activeObstacles)
        {
            // Cylinder distance check for pillars
            float dx = pos.x - o.center.x;
            float dz = pos.z - o.center.z;
            float r = o.size.x * 0.5f + 1.0f; // Plane radius allowance

            if (dx * dx + dz * dz <= r * r && pos.y <= o.size.y)
            {
                // Crash into obstacle!
                state = GameState.GameOver;
                PlaySoundCrash();
                break;
            }
        }
    }

    private void UpdateTrails()
    {
        Vector3 leftTip = planeObj.transform.TransformPoint(new Vector3(-1.6f, 0.25f, -0.6f));
        Vector3 rightTip = planeObj.transform.TransformPoint(new Vector3(1.6f, 0.25f, -0.6f));

        leftTrailPts.Add(leftTip);
        rightTrailPts.Add(rightTip);

        if (leftTrailPts.Count > 30) leftTrailPts.RemoveAt(0);
        if (rightTrailPts.Count > 30) rightTrailPts.RemoveAt(0);

        if (leftTrail)
        {
            leftTrail.positionCount = leftTrailPts.Count;
            leftTrail.SetPositions(leftTrailPts.ToArray());
        }
        if (rightTrail)
        {
            rightTrail.positionCount = rightTrailPts.Count;
            rightTrail.SetPositions(rightTrailPts.ToArray());
        }
    }

    private void UpdatePostFlight()
    {
        // Smoothly fade wind
        if (windSource && windSource.volume > 0.01f)
        {
            windSource.volume = Mathf.Lerp(windSource.volume, 0f, Time.deltaTime * 3f);
        }
    }

    private void UpdateCamera()
    {
        if (mainCam == null || planeObj == null) return;

        // Third-person spring-arm follow camera
        Vector3 targetCamPos;
        if (state == GameState.Ready)
        {
            targetCamPos = planePos + new Vector3(0f, 3.5f, -8.0f);
        }
        else
        {
            // Dynamic distance based on speed
            float camDist = Mathf.Lerp(7.0f, 11.0f, Mathf.InverseLerp(MinFlySpeed, MaxGlideSpeed, currentSpeed));
            float camHeight = Mathf.Lerp(3.2f, 4.8f, Mathf.InverseLerp(MinFlySpeed, MaxGlideSpeed, currentSpeed));
            targetCamPos = planePos - planeObj.transform.forward * camDist + Vector3.up * camHeight;
            // Add subtle bank look-ahead
            targetCamPos.x += Mathf.Sin(rollAngle * Mathf.Deg2Rad) * 1.5f;
        }

        mainCam.transform.position = Vector3.SmoothDamp(mainCam.transform.position, targetCamPos, ref camVel, 0.08f);
        Vector3 lookTarget = planePos + planeObj.transform.forward * 8f + Vector3.up * 0.8f;
        mainCam.transform.LookAt(lookTarget);

        // Speed FOV expansion (62 -> 76)
        float targetFov = Mathf.Lerp(62f, 76f, Mathf.InverseLerp(MinFlySpeed, MaxGlideSpeed, currentSpeed));
        mainCam.fieldOfView = Mathf.Lerp(mainCam.fieldOfView, targetFov, Time.deltaTime * 3f);
    }

    // --- Procedural Sound Synthesis ---
    private AudioClip CreateWindAudioClip()
    {
        int sampleRate = 22050;
        int length = sampleRate * 2;
        float[] samples = new float[length];
        System.Random rnd = new System.Random(42);

        // Low-pass filtered noise for soothing rush of air
        float lastVal = 0f;
        for (int i = 0; i < length; i++)
        {
            float white = (float)(rnd.NextDouble() * 2.0 - 1.0);
            lastVal = Mathf.Lerp(lastVal, white, 0.08f);
            samples[i] = lastVal * 0.4f;
        }

        AudioClip clip = AudioClip.Create("ProceduralWindLoop", length, 1, sampleRate, false);
        clip.SetData(samples, 0);
        return clip;
    }

    private void PlaySoundGliderLaunch()
    {
        PlayProceduralTone(440f, 660f, 0.35f, 0.25f, true);
    }

    private void PlaySoundFlap()
    {
        PlayProceduralTone(220f, 140f, 0.18f, 0.28f, false);
    }

    private void PlaySoundRingPass(int streak)
    {
        float baseFreq = 520f + Mathf.Min(streak, 8) * 80f;
        PlayProceduralTone(baseFreq, baseFreq * 1.5f, 0.28f, 0.3f, true);
    }

    private void PlaySoundCraneCollect()
    {
        PlayProceduralTone(880f, 1320f, 0.32f, 0.35f, true);
    }

    private void PlaySoundUpdraftHum()
    {
        // Low pleasant airy hum
        if (!sfxSource.isPlaying)
        {
            PlayProceduralTone(180f, 240f, 0.2f, 0.15f, false);
        }
    }

    private void PlaySoundLanding()
    {
        PlayProceduralTone(330f, 220f, 0.45f, 0.25f, false);
    }

    private void PlaySoundCrash()
    {
        PlayProceduralTone(120f, 45f, 0.5f, 0.4f, false);
    }

    private void PlaySoundClear()
    {
        StartCoroutine(PlayClearFanfare());
    }

    private IEnumerator PlayClearFanfare()
    {
        PlayProceduralTone(523.25f, 523.25f, 0.18f, 0.3f, true); // C5
        yield return new WaitForSeconds(0.18f);
        PlayProceduralTone(659.25f, 659.25f, 0.18f, 0.3f, true); // E5
        yield return new WaitForSeconds(0.18f);
        PlayProceduralTone(783.99f, 783.99f, 0.22f, 0.3f, true); // G5
        yield return new WaitForSeconds(0.22f);
        PlayProceduralTone(1046.50f, 1046.50f, 0.45f, 0.35f, true); // C6
    }

    private void PlayProceduralTone(float startFreq, float endFreq, float duration, float volume, bool sine)
    {
        int sampleRate = 22050;
        int sampleCount = Mathf.CeilToInt(sampleRate * duration);
        float[] samples = new float[sampleCount];

        for (int i = 0; i < sampleCount; i++)
        {
            float t = (float)i / sampleCount;
            float freq = Mathf.Lerp(startFreq, endFreq, t);
            float phase = 2f * Mathf.PI * freq * (i / (float)sampleRate);
            float envelope = Mathf.Sin(t * Mathf.PI);

            float s = sine ? Mathf.Sin(phase) : (Mathf.Sin(phase) > 0 ? 0.6f : -0.6f);
            samples[i] = s * envelope * volume;
        }

        AudioClip clip = AudioClip.Create("Tone", sampleCount, 1, sampleRate, false);
        clip.SetData(samples, 0);
        sfxSource.PlayOneShot(clip);
    }

    // --- Localization Texts ---
    private string GetText(string key)
    {
        switch (CurrentLang)
        {
            case GameLang.EN:
                switch (key)
                {
                    case "title": return "Paper Flight 3D: Origami Glider";
                    case "ready_prompt": return "PRESS SPACE OR CLICK TO LAUNCH!";
                    case "altitude": return "Altitude";
                    case "speed": return "Airspeed";
                    case "stamina": return "Stamina";
                    case "score": return "Score";
                    case "streak": return "Streak";
                    case "cranes": return "Cranes";
                    case "stage": return "Stage";
                    case "endless": return "Endless Flight";
                    case "stall_warning": return "STALL WARNING! NOSE DOWN OR BOOST!";
                    case "landed_title": return "SOFT GLIDE LANDING";
                    case "clear_title": return "STAGE COMPLETED!";
                    case "gameover_title": return "CRASHED INTO OBSTACLE";
                    case "restart": return "FLY AGAIN [R]";
                    case "next_stage": return "NEXT STAGE";
                    case "stage_select": return "SELECT STAGE";
                    case "controls_hint": return "WASD / Arrows: Steer & Pitch | Space: Paper Flap Boost | L: Language";
                }
                break;
            case GameLang.JA:
                switch (key)
                {
                    case "title": return "ペーパーフライト3D：折り紙グライダー";
                    case "ready_prompt": return "SPACEキーまたはクリックでテイクオフ！";
                    case "altitude": return "高度";
                    case "speed": return "対気速度";
                    case "stamina": return "スタミナ";
                    case "score": return "スコア";
                    case "streak": return "連続リング";
                    case "cranes": return "折り鶴";
                    case "stage": return "ステージ";
                    case "endless": return "エンドレス飛行";
                    case "stall_warning": return "失速警告！機首を下げるか羽ばたけ！";
                    case "landed_title": return "滑공 着陸 成功";
                    case "clear_title": return "ステージクリア！";
                    case "gameover_title": return "障害物に衝突！";
                    case "restart": return "再挑戦 [R]";
                    case "next_stage": return "次のステージ";
                    case "stage_select": return "ステージ選択";
                    case "controls_hint": return "WASD / 矢印: 旋回とピッチ | Space: 羽ばたき加速 | L: 言語切替";
                }
                break;
            case GameLang.ES:
                switch (key)
                {
                    case "title": return "Vuelo de Papel 3D: Planeador Origami";
                    case "ready_prompt": return "¡PULSA ESPACIO O HAZ CLIC PARA DESPEGAR!";
                    case "altitude": return "Altitud";
                    case "speed": return "Velocidad";
                    case "stamina": return "Estamina";
                    case "score": return "Puntos";
                    case "streak": return "Racha";
                    case "cranes": return "Grullas";
                    case "stage": return "Fase";
                    case "endless": return "Vuelo Infinito";
                    case "stall_warning": return "¡PELIGRO DE ENTRADA EN PÉRDIDA! ¡BAJA MORRO!";
                    case "landed_title": return "ATERRIZAJE SUAVE CON ÉXITO";
                    case "clear_title": return "¡FASE COMPLETADA!";
                    case "gameover_title": return "COLISIÓN CON OBSTÁCULO";
                    case "restart": return "VOLAR DE NUEVO [R]";
                    case "next_stage": return "SIGUIENTE FASE";
                    case "stage_select": return "ELEGIR FASE";
                    case "controls_hint": return "WASD / Flechas: Girar y cabeceo | Espacio: Aleteo impulso | L: Idioma";
                }
                break;
            default: // KO
                switch (key)
                {
                    case "title": return "종이비행기 3D: 오리가미 글라이더";
                    case "ready_prompt": return "SPACE 키 또는 클릭으로 활공 시작!";
                    case "altitude": return "고도";
                    case "speed": return "비행 속도";
                    case "stamina": return "스태미나";
                    case "score": return "점수";
                    case "streak": return "링 스트릭";
                    case "cranes": return "종이학";
                    case "stage": return "스테이지";
                    case "endless": return "무한 자유 비행";
                    case "stall_warning": return "실속(Stall) 경고! 기수를 낮추거나 부스트 사용!";
                    case "landed_title": return "부드러운 활공 착륙 성공";
                    case "clear_title": return "스테이지 완주 성공!";
                    case "gameover_title": return "장애물 충돌!";
                    case "restart": return "다시 비행 [R]";
                    case "next_stage": return "다음 스테이지";
                    case "stage_select": return "스테이지 선택";
                    case "controls_hint": return "WASD / 방향키: 선회 및 피치 조종 | Space: 날개 플랩 가속 | L: 언어 변경";
                }
                break;
        }
        return key;
    }

    private string GetStageName(int index)
    {
        if (index < 0 || index >= Stages.Length) return "";
        StageDef s = Stages[index];
        switch (CurrentLang)
        {
            case GameLang.EN: return s.nameEn;
            case GameLang.JA: return s.nameJa;
            case GameLang.ES: return s.nameEs;
            default: return s.nameKo;
        }
    }

    private void InitGUIStyles()
    {
        if (headerTitleStyle != null) return;

        headerTitleStyle = new GUIStyle(GUI.skin.label)
        {
            fontSize = 18,
            fontStyle = FontStyle.Bold,
            alignment = TextAnchor.MiddleLeft
        };
        headerTitleStyle.normal.textColor = Color.white;

        headerSubStyle = new GUIStyle(GUI.skin.label)
        {
            fontSize = 11,
            alignment = TextAnchor.MiddleLeft
        };
        headerSubStyle.normal.textColor = new Color(0.85f, 0.85f, 0.95f);

        hudLabelStyle = new GUIStyle(GUI.skin.label)
        {
            fontSize = 12,
            fontStyle = FontStyle.Normal,
            alignment = TextAnchor.MiddleCenter
        };
        hudLabelStyle.normal.textColor = new Color(0.8f, 0.85f, 0.95f);

        hudValueStyle = new GUIStyle(GUI.skin.label)
        {
            fontSize = 15,
            fontStyle = FontStyle.Bold,
            alignment = TextAnchor.MiddleCenter
        };
        hudValueStyle.normal.textColor = Color.white;

        btnStyle = new GUIStyle(GUI.skin.button)
        {
            fontSize = 13,
            fontStyle = FontStyle.Bold,
            alignment = TextAnchor.MiddleCenter
        };

        cardStyle = new GUIStyle(GUI.skin.box)
        {
            alignment = TextAnchor.UpperCenter
        };

        stallAlertStyle = new GUIStyle(GUI.skin.label)
        {
            fontSize = 16,
            fontStyle = FontStyle.Bold,
            alignment = TextAnchor.MiddleCenter
        };
        stallAlertStyle.normal.textColor = new Color(1f, 0.25f, 0.25f);
    }

    // Dark backing panel so the header reads on any background.
    static Texture2D _hudPanelTex;
    static void DrawHudPanel(Rect r)
    {
        if (_hudPanelTex == null)
        {
            _hudPanelTex = new Texture2D(1, 1);
            _hudPanelTex.SetPixel(0, 0, new Color(0.06f, 0.08f, 0.12f, 0.78f));
            _hudPanelTex.Apply();
        }
        GUI.DrawTexture(r, _hudPanelTex);
    }

    private void OnGUI()
    {
        OiyoUiFont.Apply();
        InitGUIStyles();

        // 1. Top Header Bar
        DrawHudPanel(new Rect(8, 8, 356, 70));
        GUILayout.BeginArea(new Rect(16, 14, Screen.width - 32, 60));
        GUILayout.BeginHorizontal();

        // Title & Subtitle
        GUILayout.BeginVertical(GUILayout.Width(340));
        GUILayout.Label("✈️ " + GetText("title"), headerTitleStyle, GUILayout.Height(28));
        string modeStr = isEndlessMode ? GetText("endless") : $"{GetText("stage")} {currentStageIndex + 1}: {GetStageName(currentStageIndex)}";
        GUILayout.Label(modeStr, headerSubStyle, GUILayout.Height(18));
        GUILayout.EndVertical();

        GUILayout.FlexibleSpace();

        // Stage Select Button
        if (GUILayout.Button($"📋 {GetText("stage_select")}", btnStyle, GUILayout.Width(130), GUILayout.Height(36)))
        {
            showStageSelect = !showStageSelect;
        }

        GUILayout.Space(8);

        // Language Switcher (KO / EN / JA / ES)
        string[] langs = { "KO", "EN", "JA", "ES" };
        for (int i = 0; i < langs.Length; i++)
        {
            bool isCurrent = ((int)CurrentLang == i);
            GUI.backgroundColor = isCurrent ? new Color(0.2f, 0.7f, 1f) : new Color(0.25f, 0.28f, 0.35f);
            if (GUILayout.Button(langs[i], btnStyle, GUILayout.Width(42), GUILayout.Height(36)))
            {
                CurrentLang = (GameLang)i;
            }
        }
        GUI.backgroundColor = Color.white;

        GUILayout.EndHorizontal();
        GUILayout.EndArea();

        // 2. Flight Instruments HUD (Altitude, Speed, Stamina, Score, Cranes, Streak)
        float hudWidth = 620f;
        float hudX = (Screen.width - hudWidth) * 0.5f;
        GUILayout.BeginArea(new Rect(hudX, 80, hudWidth, 68), GUI.skin.box);
        GUILayout.BeginHorizontal();

        // Speed
        GUILayout.BeginVertical(GUILayout.Width(90));
        GUILayout.Label(GetText("speed"), hudLabelStyle);
        GUILayout.Label($"{currentSpeed:F1} m/s", hudValueStyle);
        GUILayout.EndVertical();

        // Altitude
        GUILayout.BeginVertical(GUILayout.Width(90));
        GUILayout.Label(GetText("altitude"), hudLabelStyle);
        GUILayout.Label($"{planePos.y:F1} m", hudValueStyle);
        GUILayout.EndVertical();

        // Stamina
        GUILayout.BeginVertical(GUILayout.Width(110));
        GUILayout.Label(GetText("stamina"), hudLabelStyle);
        string bar = "[" + "|".Repeat(Mathf.RoundToInt(stamina / 10f)) + ".".Repeat(10 - Mathf.RoundToInt(stamina / 10f)) + "]";
        GUILayout.Label(bar, hudValueStyle);
        GUILayout.EndVertical();

        // Cranes Collected
        GUILayout.BeginVertical(GUILayout.Width(85));
        GUILayout.Label(GetText("cranes"), hudLabelStyle);
        GUILayout.Label($"🕊️ {cranesCollected}/{totalCranesInStage}", hudValueStyle);
        GUILayout.EndVertical();

        // Streak
        GUILayout.BeginVertical(GUILayout.Width(85));
        GUILayout.Label(GetText("streak"), hudLabelStyle);
        GUILayout.Label($"x{ringStreak}", hudValueStyle);
        GUILayout.EndVertical();

        // Score
        GUILayout.BeginVertical(GUILayout.Width(110));
        GUILayout.Label(GetText("score"), hudLabelStyle);
        GUILayout.Label($"{score}", hudValueStyle);
        GUILayout.EndVertical();

        GUILayout.EndHorizontal();
        GUILayout.EndArea();

        // 3. Central Prompts (Ready / Stall / Stage Clear / Game Over)
        if (state == GameState.Ready)
        {
            float rw = 480f;
            float rx = (Screen.width - rw) * 0.5f;
            float ry = Screen.height * 0.45f;
            GUILayout.BeginArea(new Rect(rx, ry, rw, 100), GUI.skin.box);
            GUILayout.Label(GetText("ready_prompt"), stallAlertStyle);
            GUILayout.Space(8);
            GUILayout.Label(GetText("controls_hint"), hudLabelStyle);
            GUILayout.EndArea();
        }
        else if (state == GameState.Stalled)
        {
            float sw = 440f;
            float sx = (Screen.width - sw) * 0.5f;
            GUILayout.BeginArea(new Rect(sx, Screen.height * 0.32f, sw, 50), GUI.skin.box);
            GUILayout.Label("⚠️ " + GetText("stall_warning"), stallAlertStyle);
            GUILayout.EndArea();
        }
        else if (state == GameState.StageClear || state == GameState.Landed || state == GameState.GameOver)
        {
            float modalW = 460f;
            float modalH = 260f;
            float mx = (Screen.width - modalW) * 0.5f;
            float my = (Screen.height - modalH) * 0.5f;

            GUILayout.BeginArea(new Rect(mx, my, modalW, modalH), GUI.skin.window);
            GUILayout.Space(12);

            string titleStr = state == GameState.StageClear ? "🏆 " + GetText("clear_title")
                            : state == GameState.Landed ? "🛬 " + GetText("landed_title")
                            : "💥 " + GetText("gameover_title");

            GUILayout.Label(titleStr, headerTitleStyle);
            GUILayout.Space(10);

            GUILayout.Label($"{GetText("score")}: {score}", hudValueStyle);
            GUILayout.Label($"{GetText("cranes")}: {cranesCollected}/{totalCranesInStage} | {GetText("streak")}: x{ringStreak}", hudLabelStyle);
            GUILayout.Label($"Flight Time: {flightTime:F1}s | Distance: {distanceTraveled:F0}m", hudLabelStyle);
            GUILayout.Space(14);

            GUILayout.BeginHorizontal();
            if (GUILayout.Button(GetText("restart"), btnStyle, GUILayout.Height(40)))
            {
                SetupStage(currentStageIndex);
            }

            if (state == GameState.StageClear && currentStageIndex + 1 < Stages.Length)
            {
                if (GUILayout.Button(GetText("next_stage"), btnStyle, GUILayout.Height(40)))
                {
                    SetupStage(currentStageIndex + 1);
                }
            }
            GUILayout.EndHorizontal();

            GUILayout.EndArea();
        }

        // 4. Stage Select Modal Window
        if (showStageSelect)
        {
            float ssw = 540f;
            float ssh = 420f;
            float ssx = (Screen.width - ssw) * 0.5f;
            float ssy = (Screen.height - ssh) * 0.5f;

            GUILayout.BeginArea(new Rect(ssx, ssy, ssw, ssh), GUI.skin.window);
            GUILayout.Label($"📋 {GetText("stage_select")} (12 Stages)", headerTitleStyle);
            GUILayout.Space(8);

            // 12 Stage Buttons in 2 columns
            for (int r = 0; r < 6; r++)
            {
                GUILayout.BeginHorizontal();
                for (int c = 0; c < 2; c++)
                {
                    int idx = r * 2 + c;
                    if (idx < Stages.Length)
                    {
                        bool isCur = (!isEndlessMode && currentStageIndex == idx);
                        GUI.backgroundColor = isCur ? new Color(0.2f, 0.8f, 0.4f) : Color.white;
                        if (GUILayout.Button($"Stage {idx + 1}: {GetStageName(idx)}", btnStyle, GUILayout.Height(32)))
                        {
                            isEndlessMode = false;
                            showStageSelect = false;
                            SetupStage(idx);
                        }
                    }
                }
                GUILayout.EndHorizontal();
                GUILayout.Space(3);
            }

            GUILayout.Space(8);

            // Endless Flight Mode Button
            GUI.backgroundColor = isEndlessMode ? new Color(1f, 0.6f, 0.2f) : new Color(0.3f, 0.5f, 0.9f);
            if (GUILayout.Button($"♾️ {GetText("endless")}", btnStyle, GUILayout.Height(36)))
            {
                isEndlessMode = true;
                showStageSelect = false;
                SetupStage(0);
            }
            GUI.backgroundColor = Color.white;

            GUILayout.Space(6);
            if (GUILayout.Button("Close", btnStyle, GUILayout.Height(28)))
            {
                showStageSelect = false;
            }

            GUILayout.EndArea();
        }

        // Restart shortcut
        if (Input.GetKeyDown(KeyCode.R))
        {
            SetupStage(currentStageIndex);
        }
    }
}
