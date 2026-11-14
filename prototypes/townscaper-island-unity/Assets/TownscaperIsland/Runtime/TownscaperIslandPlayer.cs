using System;
using System.Collections.Generic;
using UnityEngine;

public class TownscaperIslandPlayer : MonoBehaviour
{
    const int GridSize = 8;
    const int MaxHeight = 6;
    const float BlockWidth = 1.0f;
    const float BlockHeight = 0.75f;

    // Palette Colors (Pastel Townscaper Palette)
    static readonly Color[] PaletteColors = new Color[]
    {
        new Color(0.87f, 0.36f, 0.31f), // 0: Coral Red
        new Color(0.92f, 0.69f, 0.32f), // 1: Ochre Yellow
        new Color(0.25f, 0.56f, 0.61f), // 2: Mediterranean Teal
        new Color(0.91f, 0.90f, 0.86f), // 3: Whitewash Stone
        new Color(0.58f, 0.49f, 0.76f), // 4: Lavender Violet
        new Color(0.76f, 0.41f, 0.24f), // 5: Terracotta
    };

    static readonly string[] PaletteNames = new string[]
    {
        "코랄 레드", "황토 옐로우", "지중해 틸", "화이트 스톤", "라벤더 퍼플", "테라코타"
    };

    // Stage Definitions
    public struct StageDef
    {
        public int id;
        public string titleKo;
        public string titleEn;
        public string descKo;
        public string objectiveKo;
        public int reqBlocks;
        public int reqHeight;
        public int reqColors;
        public bool reqLighthouse;
        public bool reqArchBridge;
        public bool reqGarden;
        public int reqTowers; // towers at height >= 4
    }

    static readonly StageDef[] Stages = new StageDef[]
    {
        new StageDef { id = 1, titleKo = "석조 방파제", titleEn = "Stone Breakwater", descKo = "바다 위에 석조 부두 블록을 5개 연결하여 방파제를 축조하세요.", objectiveKo = "부두 블록 5개 이상 건설 (1층)", reqBlocks = 5, reqHeight = 1, reqColors = 1, reqLighthouse = false, reqArchBridge = false, reqGarden = false, reqTowers = 0 },
        new StageDef { id = 2, titleKo = "어촌 코티지", titleEn = "Fisherman Cottage", descKo = "블록을 위로 3층까지 쌓아 아담한 박공 지붕 주택을 완성하세요.", objectiveKo = "높이 3층 주택 1동 완성", reqBlocks = 3, reqHeight = 3, reqColors = 1, reqLighthouse = false, reqArchBridge = false, reqGarden = false, reqTowers = 0 },
        new StageDef { id = 3, titleKo = "해안 등대", titleEn = "Coastal Lighthouse", descKo = "바다 한가운데에 5층 이상 솟아오른 회전 조명 등대를 세우세요.", objectiveKo = "높이 5층 이상 등대 축조", reqBlocks = 5, reqHeight = 5, reqColors = 1, reqLighthouse = true, reqArchBridge = false, reqGarden = false, reqTowers = 0 },
        new StageDef { id = 4, titleKo = "운하 아치교", titleEn = "Canal Archway", descKo = "두 건물 사이에 물길을 둔 채 2층으로 연결하여 운하 아치를 만드세요.", objectiveKo = "수면 위 아치 다리 1개 형성", reqBlocks = 4, reqHeight = 2, reqColors = 1, reqLighthouse = false, reqArchBridge = true, reqGarden = false, reqTowers = 0 },
        new StageDef { id = 5, titleKo = "비밀 중정 정원", titleEn = "Courtyard Garden", descKo = "4면을 건물로 둘러싸아 잔디와 나무가 자라는 아늑한 중정을 만드세요.", objectiveKo = "폐쇄형 중정 정원 1개 조성", reqBlocks = 4, reqHeight = 1, reqColors = 1, reqLighthouse = false, reqArchBridge = false, reqGarden = true, reqTowers = 0 },
        new StageDef { id = 6, titleKo = "쌍둥이 첨탑", titleEn = "Twin Spires", descKo = "4층 이상 솟아오른 두 개의 고딕 첨탑 타워를 나란히 세우세요.", objectiveKo = "높이 4층 이상 타워 2동 건설", reqBlocks = 8, reqHeight = 4, reqColors = 1, reqLighthouse = false, reqArchBridge = false, reqGarden = false, reqTowers = 2 },
        new StageDef { id = 7, titleKo = "계단식 언덕마을", titleEn = "Terraced Hill Town", descKo = "1층, 2층, 3층, 4층 블록이 계단처럼 자연스럽게 이어지도록 축조하세요.", objectiveKo = "1~4층 층위가 모두 포함된 10블록 마을", reqBlocks = 10, reqHeight = 4, reqColors = 2, reqLighthouse = false, reqArchBridge = false, reqGarden = false, reqTowers = 0 },
        new StageDef { id = 8, titleKo = "오색 항구마을", titleEn = "Rainbow Port", descKo = "최소 4가지 이상의 파스텔 색상을 조화롭게 배치하여 다채로운 항구를 가꾸세요.", objectiveKo = "4색 이상 사용 및 12블록 건축", reqBlocks = 12, reqHeight = 2, reqColors = 4, reqLighthouse = false, reqArchBridge = false, reqGarden = false, reqTowers = 0 },
        new StageDef { id = 9, titleKo = "성채 요새", titleEn = "Citadel Fortress", descKo = "16개 이상의 블록과 5층 본성(Keep)을 갖춘 견고한 해상 요새를 세우세요.", objectiveKo = "총 16블록 이상 및 최고층 5층", reqBlocks = 16, reqHeight = 5, reqColors = 2, reqLighthouse = false, reqArchBridge = false, reqGarden = false, reqTowers = 1 },
        new StageDef { id = 10, titleKo = "물의 도시 베네치아", titleEn = "Water Venice", descKo = "수로를 가로지르는 운하 아치교를 2개 이상 축조하여 수변 도시를 완성하세요.", objectiveKo = "운하 아치교 2개 이상 건설", reqBlocks = 12, reqHeight = 2, reqColors = 2, reqLighthouse = false, reqArchBridge = true, reqGarden = false, reqTowers = 0 },
        new StageDef { id = 11, titleKo = "천공의 공중회랑", titleEn = "Sky Colonnade", descKo = "아치 기둥 위에 3층 이상의 높은 회랑 블록을 6개 이상 띄워 올리세요.", objectiveKo = "3층 이상 공중 블록 6개 건설", reqBlocks = 14, reqHeight = 3, reqColors = 2, reqLighthouse = false, reqArchBridge = true, reqGarden = false, reqTowers = 0 },
        new StageDef { id = 12, titleKo = "지중해 아크로폴리스", titleEn = "Mediterranean Acropolis", descKo = "총 24개 이상의 블록, 4색 이상, 등대와 중정, 아치교를 총망라한 대걸작을 완성하세요.", objectiveKo = "24블록, 4색, 등대+정원+아치교 완성", reqBlocks = 24, reqHeight = 5, reqColors = 4, reqLighthouse = true, reqArchBridge = true, reqGarden = true, reqTowers = 1 }
    };

    // Cell data structure
    public class CellData
    {
        public int height; // 0 = water, 1..6 = building
        public int palette;
        public bool isArch; // open archway on level 1
        public bool isGarden; // garden on ground level
    }

    CellData[,] grid = new CellData[GridSize, GridSize];

    // Visual Mesh Instances
    GameObject seaPlane;
    GameObject beaconBeam;
    List<GameObject> blockObjects = new List<GameObject>();
    List<GameObject> decoObjects = new List<GameObject>();

    // Camera Orbit State
    Camera mainCam;
    float camYaw = 45.0f;
    float camPitch = 38.0f;
    float camDist = 16.0f;
    Vector3 camTarget = new Vector3(0, 1.2f, 0);
    Vector2 lastMousePos;
    bool isDraggingCam = false;

    // Interaction State
    int currentStageIndex = 0; // 0 to 11 (Stage 1 to 12), -1 = Free Sandbox
    int selectedPalette = 0;
    bool isDemolishMode = false;
    bool stageCleared = false;
    int[] stageStars = new int[12];
    bool showStageSelectModal = false;

    // Audio
    AudioSource audioSource;

    // Materials
    Material seaMat;
    Material quayMat;
    Material[] buildingMats = new Material[PaletteColors.Length];
    Material roofMat;
    Material gardenMat;
    Material windowMat;
    Material beamMat;

    void Awake()
    {
        mainCam = Camera.main;
        if (mainCam == null)
        {
            var camGo = new GameObject("Main Camera");
            mainCam = camGo.AddComponent<Camera>();
            camGo.tag = "MainCamera";
        }
        mainCam.backgroundColor = new Color(0.63f, 0.77f, 0.88f); // Soft coastal sky
        mainCam.clearFlags = CameraClearFlags.SolidColor;
        mainCam.fieldOfView = 45f;
        mainCam.nearClipPlane = 0.3f;
        mainCam.farClipPlane = 100f;

        // Directional Sun Light
        var lightGo = new GameObject("SunLight");
        var light = lightGo.AddComponent<Light>();
        light.type = LightType.Directional;
        light.color = new Color(1.0f, 0.96f, 0.88f);
        light.intensity = 1.25f;
        lightGo.transform.rotation = Quaternion.Euler(48f, -35f, 0f);

        // Ambient Light
        RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat;
        RenderSettings.ambientLight = new Color(0.72f, 0.80f, 0.88f);

        // Audio
        audioSource = gameObject.AddComponent<AudioSource>();

        // Init Grid
        for (int x = 0; x < GridSize; x++)
        {
            for (int z = 0; z < GridSize; z++)
            {
                grid[x, z] = new CellData { height = 0, palette = 0 };
            }
        }

        CreateMaterials();
        BuildSea();
        BuildBeaconBeam();
        InitStage(0);
    }

    void CreateMaterials()
    {
        Shader unlitColor = Shader.Find("Mobile/Diffuse");
        if (unlitColor == null) unlitColor = Shader.Find("Standard");

        seaMat = new Material(unlitColor);
        seaMat.color = new Color(0.18f, 0.52f, 0.65f); // Azure ocean

        quayMat = new Material(unlitColor);
        quayMat.color = new Color(0.75f, 0.77f, 0.78f); // Grey stone quay

        for (int i = 0; i < PaletteColors.Length; i++)
        {
            buildingMats[i] = new Material(unlitColor);
            buildingMats[i].color = PaletteColors[i];
        }

        roofMat = new Material(unlitColor);
        roofMat.color = new Color(0.68f, 0.28f, 0.22f); // Terracotta shingle

        gardenMat = new Material(unlitColor);
        gardenMat.color = new Color(0.35f, 0.68f, 0.32f); // Lush courtyard green

        windowMat = new Material(unlitColor);
        windowMat.color = new Color(0.15f, 0.20f, 0.28f); // Dark reflective window

        beamMat = new Material(unlitColor);
        beamMat.color = new Color(1.0f, 0.95f, 0.5f);
    }

    void BuildSea()
    {
        seaPlane = GameObject.CreatePrimitive(PrimitiveType.Plane);
        seaPlane.name = "OceanPlane";
        seaPlane.transform.position = new Vector3(0, -0.05f, 0);
        seaPlane.transform.localScale = new Vector3(8f, 1f, 8f);
        seaPlane.GetComponent<MeshRenderer>().sharedMaterial = seaMat;
    }

    void BuildBeaconBeam()
    {
        beaconBeam = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        beaconBeam.name = "LighthouseBeaconBeam";
        beaconBeam.transform.localScale = new Vector3(0.08f, 4.0f, 0.08f);
        beaconBeam.GetComponent<MeshRenderer>().sharedMaterial = beamMat;
        beaconBeam.transform.rotation = Quaternion.Euler(90f, 0, 0);
        beaconBeam.SetActive(false);
    }

    void InitStage(int index)
    {
        currentStageIndex = index;
        stageCleared = false;

        // Clear existing grid
        for (int x = 0; x < GridSize; x++)
        {
            for (int z = 0; z < GridSize; z++)
            {
                grid[x, z].height = 0;
                grid[x, z].palette = 0;
                grid[x, z].isArch = false;
                grid[x, z].isGarden = false;
            }
        }

        // Add starter tiles based on stage
        if (index == 0) // Stone breakwater
        {
            grid[3, 3].height = 1; grid[3, 3].palette = 3;
            grid[3, 4].height = 1; grid[3, 4].palette = 3;
        }
        else if (index == 1) // Cottage
        {
            grid[3, 3].height = 1; grid[3, 3].palette = 0;
        }
        else if (index == 2) // Lighthouse
        {
            grid[2, 2].height = 2; grid[2, 2].palette = 3;
        }
        else if (index == 3) // Canal Arch
        {
            grid[3, 2].height = 2; grid[3, 2].palette = 1;
            grid[3, 4].height = 2; grid[3, 4].palette = 1;
        }
        else if (index == 4) // Garden Cloister
        {
            grid[2, 3].height = 2; grid[2, 3].palette = 2;
            grid[4, 3].height = 2; grid[4, 3].palette = 2;
            grid[3, 2].height = 2; grid[3, 2].palette = 2;
        }
        else if (index == 5) // Twin Spires
        {
            grid[2, 3].height = 2; grid[2, 3].palette = 4;
            grid[5, 3].height = 2; grid[5, 3].palette = 4;
        }

        RebuildCityMeshes();
        CheckObjectives();
    }

    void Update()
    {
        HandleCameraControls();
        HandleInteraction();
        AnimateEnvironment();
    }

    void AnimateEnvironment()
    {
        // Gentle wave pulsation
        if (seaPlane != null)
        {
            float wave = Mathf.Sin(Time.time * 1.5f) * 0.02f;
            seaPlane.transform.position = new Vector3(0, -0.05f + wave, 0);
        }

        // Rotating lighthouse beacon
        if (beaconBeam != null && beaconBeam.activeSelf)
        {
            beaconBeam.transform.Rotate(Vector3.forward, 60f * Time.deltaTime, Space.World);
        }
    }

    void HandleCameraControls()
    {
        // Mouse Right-Click or Middle-Click drag to orbit
        if (Input.GetMouseButtonDown(1) || Input.GetMouseButtonDown(2))
        {
            isDraggingCam = true;
            lastMousePos = Input.mousePosition;
        }
        else if (Input.GetMouseButtonUp(1) || Input.GetMouseButtonUp(2))
        {
            isDraggingCam = false;
        }

        if (isDraggingCam)
        {
            Vector2 delta = (Vector2)Input.mousePosition - lastMousePos;
            camYaw += delta.x * 0.35f;
            camPitch = Mathf.Clamp(camPitch - delta.y * 0.25f, 20f, 75f);
            lastMousePos = Input.mousePosition;
        }

        // Zoom with ScrollWheel
        float scroll = Input.GetAxis("Mouse ScrollWheel");
        if (Mathf.Abs(scroll) > 0.01f)
        {
            camDist = Mathf.Clamp(camDist - scroll * 6f, 8f, 26f);
        }

        // Keyboard Camera Rotation
        if (Input.GetKey(KeyCode.A) || Input.GetKey(KeyCode.LeftArrow)) camYaw -= 45f * Time.deltaTime;
        if (Input.GetKey(KeyCode.D) || Input.GetKey(KeyCode.RightArrow)) camYaw += 45f * Time.deltaTime;
        if (Input.GetKey(KeyCode.W) || Input.GetKey(KeyCode.UpArrow)) camPitch = Mathf.Clamp(camPitch + 30f * Time.deltaTime, 20f, 75f);
        if (Input.GetKey(KeyCode.S) || Input.GetKey(KeyCode.DownArrow)) camPitch = Mathf.Clamp(camPitch - 30f * Time.deltaTime, 20f, 75f);

        // Update Camera Position & Rotation
        Quaternion rot = Quaternion.Euler(camPitch, camYaw, 0);
        Vector3 offset = rot * new Vector3(0, 0, -camDist);
        mainCam.transform.position = camTarget + offset;
        mainCam.transform.LookAt(camTarget);
    }

    void HandleInteraction()
    {
        // Shortcut keys
        if (Input.GetKeyDown(KeyCode.Alpha1)) selectedPalette = 0;
        if (Input.GetKeyDown(KeyCode.Alpha2)) selectedPalette = 1;
        if (Input.GetKeyDown(KeyCode.Alpha3)) selectedPalette = 2;
        if (Input.GetKeyDown(KeyCode.Alpha4)) selectedPalette = 3;
        if (Input.GetKeyDown(KeyCode.Alpha5)) selectedPalette = 4;
        if (Input.GetKeyDown(KeyCode.Alpha6)) selectedPalette = 5;
        if (Input.GetKeyDown(KeyCode.B)) isDemolishMode = false;
        if (Input.GetKeyDown(KeyCode.X) || Input.GetKeyDown(KeyCode.E)) isDemolishMode = true;
        if (Input.GetKeyDown(KeyCode.R)) InitStage(currentStageIndex);
        if (Input.GetKeyDown(KeyCode.M)) showStageSelectModal = !showStageSelectModal;

        // Left Click to Build or Demolish
        if (Input.GetMouseButtonDown(0))
        {
            // Don't interact if clicking UI area
            if (Input.mousePosition.y < 120 || Input.mousePosition.y > Screen.height - 70 || showStageSelectModal)
            {
                return;
            }

            Ray ray = mainCam.ScreenPointToRay(Input.mousePosition);
            if (RaycastGrid(ray, out int hitX, out int hitZ, out bool hitBuilding))
            {
                if (isDemolishMode)
                {
                    DemolishBlock(hitX, hitZ);
                }
                else
                {
                    BuildBlock(hitX, hitZ);
                }
            }
        }
    }

    bool RaycastGrid(Ray ray, out int cellX, out int cellZ, out bool hitBuilding)
    {
        cellX = -1;
        cellZ = -1;
        hitBuilding = false;

        float bestDistance = float.MaxValue;
        float originOffset = (GridSize - 1) * BlockWidth * 0.5f;

        // First check existing building AABB boxes
        for (int x = 0; x < GridSize; x++)
        {
            for (int z = 0; z < GridSize; z++)
            {
                int h = grid[x, z].height;
                if (h <= 0) continue;

                float wx = x * BlockWidth - originOffset;
                float wz = z * BlockWidth - originOffset;
                Vector3 min = new Vector3(wx - BlockWidth * 0.48f, 0, wz - BlockWidth * 0.48f);
                Vector3 max = new Vector3(wx + BlockWidth * 0.48f, h * BlockHeight + 0.35f, wz + BlockWidth * 0.48f);
                Bounds b = new Bounds((min + max) * 0.5f, max - min);

                if (b.IntersectRay(ray, out float d))
                {
                    if (d < bestDistance)
                    {
                        bestDistance = d;
                        cellX = x;
                        cellZ = z;
                        hitBuilding = true;
                    }
                }
            }
        }

        if (hitBuilding) return true;

        // Otherwise raycast against Y = 0 water plane
        Plane waterPlane = new Plane(Vector3.up, Vector3.zero);
        if (waterPlane.Raycast(ray, out float dist))
        {
            Vector3 hitPoint = ray.GetPoint(dist);
            int gx = Mathf.RoundToInt((hitPoint.x + originOffset) / BlockWidth);
            int gz = Mathf.RoundToInt((hitPoint.z + originOffset) / BlockWidth);

            if (gx >= 0 && gx < GridSize && gz >= 0 && gz < GridSize)
            {
                cellX = gx;
                cellZ = gz;
                hitBuilding = false;
                return true;
            }
        }

        return false;
    }

    void BuildBlock(int x, int z)
    {
        if (grid[x, z].height >= MaxHeight) return;

        grid[x, z].height++;
        grid[x, z].palette = selectedPalette;

        PlayMelodicPop(grid[x, z].height);
        RebuildCityMeshes();
        CheckObjectives();
    }

    void DemolishBlock(int x, int z)
    {
        if (grid[x, z].height <= 0) return;

        grid[x, z].height--;
        PlayDemolishSound();
        RebuildCityMeshes();
        CheckObjectives();
    }

    void RebuildCityMeshes()
    {
        // Destroy old blocks and decos
        foreach (var go in blockObjects) Destroy(go);
        blockObjects.Clear();
        foreach (var go in decoObjects) Destroy(go);
        decoObjects.Clear();

        float originOffset = (GridSize - 1) * BlockWidth * 0.5f;

        // Step 1: Detect Arch Bridges & Courtyard Gardens
        int archCount = 0;
        int gardenCount = 0;
        int maxH = 0;
        int totalBlocks = 0;
        HashSet<int> colorsUsed = new HashSet<int>();
        int towersCount = 0;
        bool hasLighthouse = false;
        Vector3 lighthousePos = Vector3.zero;

        for (int x = 0; x < GridSize; x++)
        {
            for (int z = 0; z < GridSize; z++)
            {
                var cell = grid[x, z];
                cell.isArch = false;
                cell.isGarden = false;

                if (cell.height > 0)
                {
                    totalBlocks += cell.height;
                    colorsUsed.Add(cell.palette);
                    if (cell.height > maxH) maxH = cell.height;
                    if (cell.height >= 4) towersCount++;
                    if (cell.height >= 5)
                    {
                        hasLighthouse = true;
                        lighthousePos = new Vector3(x * BlockWidth - originOffset, cell.height * BlockHeight, z * BlockWidth - originOffset);
                    }

                    // Check arch bridge condition: Level 2+ built, but East-West or North-South has gap over water
                    bool ewNeighbors = (x > 0 && grid[x - 1, z].height >= 1) && (x < GridSize - 1 && grid[x + 1, z].height >= 1);
                    bool nsNeighbors = (z > 0 && grid[x, z - 1].height >= 1) && (z < GridSize - 1 && grid[x, z + 1].height >= 1);
                    if (cell.height >= 2 && (ewNeighbors || nsNeighbors))
                    {
                        cell.isArch = true;
                        archCount++;
                    }
                }
                else
                {
                    // Check if water cell is enclosed on 4 sides (courtyard garden!)
                    bool enclosed = (x > 0 && grid[x - 1, z].height >= 1) &&
                                    (x < GridSize - 1 && grid[x + 1, z].height >= 1) &&
                                    (z > 0 && grid[x, z - 1].height >= 1) &&
                                    (z < GridSize - 1 && grid[x, z + 1].height >= 1);
                    if (enclosed)
                    {
                        cell.isGarden = true;
                        gardenCount++;
                    }
                }
            }
        }

        // Step 2: Instantiate 3D Meshes for all cells
        for (int x = 0; x < GridSize; x++)
        {
            for (int z = 0; z < GridSize; z++)
            {
                var cell = grid[x, z];
                float wx = x * BlockWidth - originOffset;
                float wz = z * BlockWidth - originOffset;

                // Courtyard garden tile
                if (cell.isGarden)
                {
                    var garden = GameObject.CreatePrimitive(PrimitiveType.Cube);
                    garden.transform.position = new Vector3(wx, 0.05f, wz);
                    garden.transform.localScale = new Vector3(0.95f, 0.1f, 0.95f);
                    garden.GetComponent<MeshRenderer>().sharedMaterial = gardenMat;
                    decoObjects.Add(garden);

                    // Add a tiny decorative tree
                    var treeTrunk = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                    treeTrunk.transform.position = new Vector3(wx, 0.25f, wz);
                    treeTrunk.transform.localScale = new Vector3(0.08f, 0.2f, 0.08f);
                    treeTrunk.GetComponent<MeshRenderer>().sharedMaterial = roofMat;
                    decoObjects.Add(treeTrunk);

                    var treeTop = GameObject.CreatePrimitive(PrimitiveType.Sphere);
                    treeTop.transform.position = new Vector3(wx, 0.5f, wz);
                    treeTop.transform.localScale = new Vector3(0.35f, 0.35f, 0.35f);
                    treeTop.GetComponent<MeshRenderer>().sharedMaterial = gardenMat;
                    decoObjects.Add(treeTop);
                }

                if (cell.height <= 0) continue;

                // Stack stories
                for (int h = 1; h <= cell.height; h++)
                {
                    // If it's an archway on ground level, skip solid block and build side pillars
                    if (cell.isArch && h == 1)
                    {
                        // Left pillar
                        var p1 = GameObject.CreatePrimitive(PrimitiveType.Cube);
                        p1.transform.position = new Vector3(wx - 0.38f, BlockHeight * 0.5f, wz);
                        p1.transform.localScale = new Vector3(0.2f, BlockHeight, 0.95f);
                        p1.GetComponent<MeshRenderer>().sharedMaterial = quayMat;
                        blockObjects.Add(p1);

                        // Right pillar
                        var p2 = GameObject.CreatePrimitive(PrimitiveType.Cube);
                        p2.transform.position = new Vector3(wx + 0.38f, BlockHeight * 0.5f, wz);
                        p2.transform.localScale = new Vector3(0.2f, BlockHeight, 0.95f);
                        p2.GetComponent<MeshRenderer>().sharedMaterial = quayMat;
                        blockObjects.Add(p2);
                        continue;
                    }

                    float wy = (h - 0.5f) * BlockHeight;
                    var block = GameObject.CreatePrimitive(PrimitiveType.Cube);
                    block.transform.position = new Vector3(wx, wy, wz);
                    block.transform.localScale = new Vector3(0.95f, BlockHeight * 0.95f, 0.95f);

                    Material mat = (h == 1 && !cell.isArch) ? quayMat : buildingMats[cell.palette];
                    block.GetComponent<MeshRenderer>().sharedMaterial = mat;
                    blockObjects.Add(block);

                    // Add windows for residential floors (h >= 2)
                    if (h >= 2)
                    {
                        var win = GameObject.CreatePrimitive(PrimitiveType.Cube);
                        win.transform.position = new Vector3(wx, wy, wz + 0.48f);
                        win.transform.localScale = new Vector3(0.25f, 0.3f, 0.05f);
                        win.GetComponent<MeshRenderer>().sharedMaterial = windowMat;
                        decoObjects.Add(win);
                    }

                    // Top story roof
                    if (h == cell.height)
                    {
                        if (h >= 5) // Lighthouse Top Spire
                        {
                            var dome = GameObject.CreatePrimitive(PrimitiveType.Sphere);
                            dome.transform.position = new Vector3(wx, wy + BlockHeight * 0.6f, wz);
                            dome.transform.localScale = new Vector3(0.45f, 0.45f, 0.45f);
                            dome.GetComponent<MeshRenderer>().sharedMaterial = beamMat;
                            decoObjects.Add(dome);
                        }
                        else // Gabled Shingle Roof
                        {
                            var roof = GameObject.CreatePrimitive(PrimitiveType.Cube);
                            roof.transform.position = new Vector3(wx, wy + BlockHeight * 0.52f, wz);
                            roof.transform.localScale = new Vector3(0.85f, 0.22f, 0.85f);
                            roof.transform.rotation = Quaternion.Euler(0, 45f, 0);
                            roof.GetComponent<MeshRenderer>().sharedMaterial = roofMat;
                            decoObjects.Add(roof);
                        }
                    }
                }
            }
        }

        // Update Lighthouse beacon beam
        if (hasLighthouse && beaconBeam != null)
        {
            beaconBeam.SetActive(true);
            beaconBeam.transform.position = lighthousePos + Vector3.up * 0.4f;
        }
        else if (beaconBeam != null)
        {
            beaconBeam.SetActive(false);
        }
    }

    void CheckObjectives()
    {
        if (currentStageIndex < 0 || currentStageIndex >= Stages.Length) return;

        StageDef def = Stages[currentStageIndex];

        int totalBlocks = 0;
        int maxH = 0;
        HashSet<int> colorsUsed = new HashSet<int>();
        int towersCount = 0;
        bool hasLighthouse = false;
        bool hasArchBridge = false;
        bool hasGarden = false;
        int quayBlocks = 0;

        for (int x = 0; x < GridSize; x++)
        {
            for (int z = 0; z < GridSize; z++)
            {
                var cell = grid[x, z];
                if (cell.isGarden) hasGarden = true;

                if (cell.height > 0)
                {
                    totalBlocks += cell.height;
                    colorsUsed.Add(cell.palette);
                    if (cell.height > maxH) maxH = cell.height;
                    if (cell.height >= 4) towersCount++;
                    if (cell.height >= 5) hasLighthouse = true;
                    if (cell.isArch) hasArchBridge = true;
                    if (cell.height == 1 && !cell.isArch) quayBlocks++;
                }
            }
        }

        bool satisfied = true;
        if (def.id == 1 && quayBlocks < def.reqBlocks) satisfied = false;
        if (totalBlocks < def.reqBlocks) satisfied = false;
        if (maxH < def.reqHeight) satisfied = false;
        if (colorsUsed.Count < def.reqColors) satisfied = false;
        if (def.reqLighthouse && !hasLighthouse) satisfied = false;
        if (def.reqArchBridge && !hasArchBridge) satisfied = false;
        if (def.reqGarden && !hasGarden) satisfied = false;
        if (def.reqTowers > 0 && towersCount < def.reqTowers) satisfied = false;

        if (satisfied && !stageCleared)
        {
            stageCleared = true;
            stageStars[currentStageIndex] = 3;
            PlayFanfareSound();
        }
    }

    void PlayMelodicPop(int height)
    {
        if (audioSource == null) return;
        int sampleRate = 44100;
        int sampleCount = (int)(sampleRate * 0.1f);
        float[] samples = new float[sampleCount];
        float freq = 260f + Mathf.Min(height, 6) * 60f;

        for (int i = 0; i < sampleCount; i++)
        {
            float t = (float)i / sampleRate;
            float env = Mathf.Exp(-t * 30f);
            samples[i] = Mathf.Sin(2 * Mathf.PI * freq * t) * env * 0.25f;
        }

        AudioClip clip = AudioClip.Create("Pop", sampleCount, 1, sampleRate, false);
        clip.SetData(samples, 0);
        audioSource.PlayOneShot(clip);
    }

    void PlayDemolishSound()
    {
        if (audioSource == null) return;
        int sampleRate = 44100;
        int sampleCount = (int)(sampleRate * 0.12f);
        float[] samples = new float[sampleCount];

        for (int i = 0; i < sampleCount; i++)
        {
            float t = (float)i / sampleRate;
            float env = Mathf.Exp(-t * 22f);
            float noise = (UnityEngine.Random.value * 2f - 1f) * 0.2f;
            samples[i] = noise * env;
        }

        AudioClip clip = AudioClip.Create("Demolish", sampleCount, 1, sampleRate, false);
        clip.SetData(samples, 0);
        audioSource.PlayOneShot(clip);
    }

    void PlayFanfareSound()
    {
        if (audioSource == null) return;
        int sampleRate = 44100;
        int sampleCount = (int)(sampleRate * 0.4f);
        float[] samples = new float[sampleCount];
        float[] chord = new float[] { 523.25f, 659.25f, 783.99f, 1046.50f }; // C Major

        for (int i = 0; i < sampleCount; i++)
        {
            float t = (float)i / sampleRate;
            float env = Mathf.Exp(-t * 6f);
            float s = 0;
            foreach (float f in chord) s += Mathf.Sin(2 * Mathf.PI * f * t);
            samples[i] = (s / chord.Length) * env * 0.35f;
        }

        AudioClip clip = AudioClip.Create("Fanfare", sampleCount, 1, sampleRate, false);
        clip.SetData(samples, 0);
        audioSource.PlayOneShot(clip);
    }

    void OnGUI()
    {
        DrawTopHeader();
        DrawBottomBar();

        if (stageCleared)
        {
            DrawClearBanner();
        }

        if (showStageSelectModal)
        {
            DrawStageSelectModal();
        }
    }

    void DrawTopHeader()
    {
        int w = Screen.width;
        GUI.Box(new Rect(10, 10, w - 20, 50), GUIContent.none);

        GUIStyle titleStyle = new GUIStyle(GUI.skin.label)
        {
            fontSize = 16,
            fontStyle = FontStyle.Bold,
            alignment = TextAnchor.MiddleLeft,
            normal = { textColor = Color.white }
        };

        GUIStyle subStyle = new GUIStyle(GUI.skin.label)
        {
            fontSize = 12,
            alignment = TextAnchor.MiddleLeft,
            normal = { textColor = new Color(0.9f, 0.95f, 1.0f) }
        };

        string stageTitle = currentStageIndex >= 0
            ? "Stage " + (currentStageIndex + 1) + ". " + Stages[currentStageIndex].titleKo + " (" + Stages[currentStageIndex].titleEn + ")"
            : "자유 창작 샌드박스 (Free Sandbox)";

        string objective = currentStageIndex >= 0
            ? "목표: " + Stages[currentStageIndex].objectiveKo
            : "원하는 지중해 섬마을을 자유롭게 건축하세요.";

        GUI.Label(new Rect(20, 12, 450, 24), stageTitle, titleStyle);
        GUI.Label(new Rect(20, 32, 450, 22), objective, subStyle);

        // Stage Select Button
        if (GUI.Button(new Rect(w - 180, 15, 75, 40), "🗺️ 스테이지"))
        {
            showStageSelectModal = !showStageSelectModal;
        }

        // Reset Button
        if (GUI.Button(new Rect(w - 95, 15, 75, 40), "🔄 초기화"))
        {
            InitStage(currentStageIndex);
        }
    }

    void DrawBottomBar()
    {
        int w = Screen.width;
        int h = Screen.height;
        int barH = 75;
        GUI.Box(new Rect(10, h - barH - 10, w - 20, barH), GUIContent.none);

        // Build vs Demolish Mode Toggle
        string modeLabel = isDemolishMode ? "⛏️ 철거 모드" : "🔨 건축 모드";
        Color modeCol = isDemolishMode ? new Color(1f, 0.6f, 0.6f) : new Color(0.6f, 0.9f, 1f);
        GUI.color = modeCol;
        if (GUI.Button(new Rect(20, h - barH, 110, 55), modeLabel))
        {
            isDemolishMode = !isDemolishMode;
        }
        GUI.color = Color.white;

        // Palette Color Buttons
        int startX = 145;
        int btnW = Mathf.Min(75, (w - startX - 30) / PaletteColors.Length);

        for (int i = 0; i < PaletteColors.Length; i++)
        {
            GUI.color = PaletteColors[i];
            bool isSel = (selectedPalette == i && !isDemolishMode);
            string label = (isSel ? "✓ " : "") + PaletteNames[i];

            if (GUI.Button(new Rect(startX + i * (btnW + 6), h - barH, btnW, 55), label))
            {
                selectedPalette = i;
                isDemolishMode = false;
            }
        }
        GUI.color = Color.white;
    }

    void DrawClearBanner()
    {
        int w = Screen.width;
        int h = Screen.height;

        Rect bannerRect = new Rect(w / 2 - 200, h / 2 - 80, 400, 160);
        GUI.Box(bannerRect, GUIContent.none);

        GUIStyle clearStyle = new GUIStyle(GUI.skin.label)
        {
            fontSize = 22,
            fontStyle = FontStyle.Bold,
            alignment = TextAnchor.MiddleCenter,
            normal = { textColor = new Color(1f, 0.88f, 0.35f) }
        };

        GUIStyle msgStyle = new GUIStyle(GUI.skin.label)
        {
            fontSize = 13,
            alignment = TextAnchor.MiddleCenter,
            normal = { textColor = Color.white }
        };

        GUI.Label(new Rect(bannerRect.x, bannerRect.y + 15, bannerRect.width, 35), "★ STAGE CLEAR! ★", clearStyle);
        GUI.Label(new Rect(bannerRect.x, bannerRect.y + 55, bannerRect.width, 25), "지중해 섬마을 과제를 완벽히 달성했습니다!", msgStyle);

        if (currentStageIndex < Stages.Length - 1)
        {
            if (GUI.Button(new Rect(bannerRect.x + 110, bannerRect.y + 95, 180, 45), "다음 스테이지 ▶"))
            {
                InitStage(currentStageIndex + 1);
            }
        }
        else
        {
            if (GUI.Button(new Rect(bannerRect.x + 110, bannerRect.y + 95, 180, 45), "자유 샌드박스 시작"))
            {
                InitStage(-1);
            }
        }
    }

    void DrawStageSelectModal()
    {
        int w = Screen.width;
        int h = Screen.height;

        GUI.Box(new Rect(30, 70, w - 60, h - 140), "🗺️ 스테이지 선택 (Stage Select)");

        int cols = 4;
        int itemW = (w - 120) / cols;
        int itemH = 65;

        for (int i = 0; i < Stages.Length; i++)
        {
            int row = i / cols;
            int col = i % cols;
            Rect btnRect = new Rect(50 + col * (itemW + 10), 110 + row * (itemH + 12), itemW, itemH);

            string stars = stageStars[i] > 0 ? " ★★★" : "";
            string text = (i + 1) + ". " + Stages[i].titleKo + stars + "\n" + Stages[i].objectiveKo;

            if (GUI.Button(btnRect, text))
            {
                showStageSelectModal = false;
                InitStage(i);
            }
        }

        // Free Sandbox Button
        Rect sandRect = new Rect(50, 110 + 3 * (itemH + 12), w - 100, 45);
        if (GUI.Button(sandRect, "🏖️ 자유 창작 샌드박스 모드 (제약 없이 마음껏 건축)"))
        {
            showStageSelectModal = false;
            InitStage(-1);
        }
    }
}
