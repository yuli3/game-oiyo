using System;
using System.Collections.Generic;
using UnityEngine;

public class DotDungeonRoguePlayer : MonoBehaviour
{
    const int MapW = 22;
    const int MapH = 16;
    const int MaxFloors = 10;
    const float TileSize = 1.2f;

    // Floor Theme Definitions
    public struct FloorDef
    {
        public int floor;
        public string nameKo;
        public string nameEn;
        public string enemyNameKo;
        public int enemyHp;
        public int enemyAtk;
        public int enemyDef;
        public Color wallColor;
        public Color floorColor;
        public Color enemyColor;
        public bool isBossFloor;
    }

    static readonly FloorDef[] FloorDefs = new FloorDef[]
    {
        new FloorDef { floor = 1, nameKo = "초록 슬라임 하수도", nameEn = "Slime Sewers", enemyNameKo = "슬라임", enemyHp = 12, enemyAtk = 4, enemyDef = 1, wallColor = new Color(0.2f, 0.3f, 0.25f), floorColor = new Color(0.12f, 0.18f, 0.15f), enemyColor = new Color(0.2f, 0.8f, 0.3f), isBossFloor = false },
        new FloorDef { floor = 2, nameKo = "쥐들의 납골당", nameEn = "Rat Crypt", enemyNameKo = "거대 쥐", enemyHp = 18, enemyAtk = 6, enemyDef = 2, wallColor = new Color(0.3f, 0.28f, 0.25f), floorColor = new Color(0.18f, 0.16f, 0.14f), enemyColor = new Color(0.6f, 0.45f, 0.35f), isBossFloor = false },
        new FloorDef { floor = 3, nameKo = "해골 병사의 묘지", nameEn = "Skeleton Catacombs", enemyNameKo = "스켈레톤", enemyHp = 25, enemyAtk = 8, enemyDef = 3, wallColor = new Color(0.35f, 0.35f, 0.38f), floorColor = new Color(0.16f, 0.16f, 0.18f), enemyColor = new Color(0.9f, 0.9f, 0.85f), isBossFloor = false },
        new FloorDef { floor = 4, nameKo = "맹독 거미 동굴", nameEn = "Venom Grotto", enemyNameKo = "독거미", enemyHp = 32, enemyAtk = 11, enemyDef = 4, wallColor = new Color(0.22f, 0.2f, 0.3f), floorColor = new Color(0.13f, 0.12f, 0.18f), enemyColor = new Color(0.7f, 0.2f, 0.8f), isBossFloor = false },
        new FloorDef { floor = 5, nameKo = "오크 족장 성채 (중간보스)", nameEn = "Orc Citadel", enemyNameKo = "오크 족장", enemyHp = 65, enemyAtk = 15, enemyDef = 6, wallColor = new Color(0.38f, 0.22f, 0.2f), floorColor = new Color(0.2f, 0.12f, 0.1f), enemyColor = new Color(0.9f, 0.3f, 0.2f), isBossFloor = true },
        new FloorDef { floor = 6, nameKo = "그림자 망령의 회랑", nameEn = "Wraith Corridor", enemyNameKo = "그림자 망령", enemyHp = 45, enemyAtk = 17, enemyDef = 5, wallColor = new Color(0.18f, 0.22f, 0.32f), floorColor = new Color(0.1f, 0.12f, 0.18f), enemyColor = new Color(0.4f, 0.6f, 0.9f), isBossFloor = false },
        new FloorDef { floor = 7, nameKo = "용암 대장간", nameEn = "Magma Foundry", enemyNameKo = "화염 골렘", enemyHp = 58, enemyAtk = 20, enemyDef = 7, wallColor = new Color(0.45f, 0.2f, 0.15f), floorColor = new Color(0.25f, 0.1f, 0.08f), enemyColor = new Color(1.0f, 0.45f, 0.1f), isBossFloor = false },
        new FloorDef { floor = 8, nameKo = "흑마법 강령원", nameEn = "Necromancer Sanctum", enemyNameKo = "사령술사", enemyHp = 70, enemyAtk = 23, enemyDef = 8, wallColor = new Color(0.28f, 0.15f, 0.35f), floorColor = new Color(0.15f, 0.08f, 0.2f), enemyColor = new Color(0.6f, 0.1f, 0.7f), isBossFloor = false },
        new FloorDef { floor = 9, nameKo = "흑요석 미노타우로스 미궁", nameEn = "Minotaur Labyrinth", enemyNameKo = "미노타우로스", enemyHp = 88, enemyAtk = 27, enemyDef = 9, wallColor = new Color(0.25f, 0.25f, 0.28f), floorColor = new Color(0.12f, 0.12f, 0.14f), enemyColor = new Color(0.85f, 0.2f, 0.2f), isBossFloor = false },
        new FloorDef { floor = 10, nameKo = "고대 화룡의 제단 (최종보스)", nameEn = "Ancient Dragon Lair", enemyNameKo = "고대 화룡 (Dragon)", enemyHp = 180, enemyAtk = 34, enemyDef = 12, wallColor = new Color(0.5f, 0.15f, 0.15f), floorColor = new Color(0.25f, 0.08f, 0.08f), enemyColor = new Color(1.0f, 0.15f, 0.15f), isBossFloor = true }
    };

    enum TileType { Wall, Floor, Stairs, Chest }

    struct Tile
    {
        public TileType type;
        public bool explored;
        public bool visible;
    }

    class Monster
    {
        public string name;
        public int x;
        public int y;
        public int hp;
        public int maxHp;
        public int atk;
        public int def;
        public bool isBoss;
        public GameObject visualObj;
    }

    class FloatingText
    {
        public string text;
        public Vector3 worldPos;
        public Color color;
        public float timer;
    }

    // Map & Entity Data
    Tile[,] map = new Tile[MapW, MapH];
    GameObject[,] tileObjects = new Tile[MapW, MapH] != null ? new GameObject[MapW, MapH] : null;
    List<Monster> monsters = new List<Monster>();
    List<FloatingText> floatingTexts = new List<FloatingText>();

    // Player Stats
    int playerX;
    int playerY;
    int playerHp = 100;
    int playerMaxHp = 100;
    int playerAtk = 10;
    int playerDef = 2;
    int playerGold = 0;
    int playerLevel = 1;
    int playerExp = 0;
    int potionCount = 3;
    int elixirCount = 1;

    // Movement interpolation
    Vector3 playerRenderPos;
    Vector3 playerTargetPos;

    // Game Flow
    int currentFloor = 1; // 1 to 10
    int turnCounter = 0;
    bool isGameOver = false;
    bool isGameVictory = false;
    bool showFloorSelectModal = false;
    string lastCombatLog = "던전에 진입했습니다. 계단을 찾아 아래층으로 내려가세요.";

    // Visuals & Light
    GameObject heroObj;
    Light torchLight;
    Camera mainCam;
    AudioSource audioSource;

    // Materials
    Material wallMat;
    Material floorMat;
    Material stairsMat;
    Material chestMat;
    Material heroMat;

    void Awake()
    {
        mainCam = Camera.main;
        if (mainCam == null)
        {
            var camGo = new GameObject("Main Camera");
            mainCam = camGo.AddComponent<Camera>();
            camGo.tag = "MainCamera";
        }
        mainCam.backgroundColor = new Color(0.06f, 0.08f, 0.12f);
        mainCam.clearFlags = CameraClearFlags.SolidColor;
        mainCam.fieldOfView = 50f;

        // Ambient Dark
        RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat;
        RenderSettings.ambientLight = new Color(0.12f, 0.14f, 0.2f);

        audioSource = gameObject.AddComponent<AudioSource>();

        CreateBaseMaterials();
        InitHeroVisual();
        GenerateFloor(1);
    }

    void CreateBaseMaterials()
    {
        Shader diffuse = Shader.Find("Mobile/Diffuse");
        if (diffuse == null) diffuse = Shader.Find("Standard");

        wallMat = new Material(diffuse);
        floorMat = new Material(diffuse);
        stairsMat = new Material(diffuse) { color = new Color(1.0f, 0.85f, 0.2f) };
        chestMat = new Material(diffuse) { color = new Color(0.95f, 0.6f, 0.15f) };
        heroMat = new Material(diffuse) { color = new Color(0.2f, 0.65f, 1.0f) };
    }

    void InitHeroVisual()
    {
        heroObj = new GameObject("Hero");
        var body = GameObject.CreatePrimitive(PrimitiveType.Capsule);
        body.transform.SetParent(heroObj.transform);
        body.transform.localPosition = new Vector3(0, 0.6f, 0);
        body.transform.localScale = new Vector3(0.55f, 0.55f, 0.55f);
        body.GetComponent<MeshRenderer>().sharedMaterial = heroMat;

        // Shield
        var shield = GameObject.CreatePrimitive(PrimitiveType.Cube);
        shield.transform.SetParent(heroObj.transform);
        shield.transform.localPosition = new Vector3(0.35f, 0.5f, 0.1f);
        shield.transform.localScale = new Vector3(0.1f, 0.4f, 0.35f);
        shield.GetComponent<MeshRenderer>().sharedMaterial = chestMat;

        // Torch Light
        var lightGo = new GameObject("TorchLight");
        lightGo.transform.SetParent(heroObj.transform);
        lightGo.transform.localPosition = new Vector3(0, 1.2f, 0);
        torchLight = lightGo.AddComponent<Light>();
        torchLight.type = LightType.Point;
        torchLight.range = 8.5f * TileSize;
        torchLight.color = new Color(1.0f, 0.82f, 0.55f);
        torchLight.intensity = 1.6f;
    }

    void GenerateFloor(int floorNum)
    {
        currentFloor = Mathf.Clamp(floorNum, 1, MaxFloors);
        isGameOver = false;
        isGameVictory = false;

        FloorDef def = FloorDefs[currentFloor - 1];
        wallMat.color = def.wallColor;
        floorMat.color = def.floorColor;

        // Clear old tile visuals and monsters
        if (tileObjects != null)
        {
            for (int x = 0; x < MapW; x++)
            {
                for (int y = 0; y < MapH; y++)
                {
                    if (tileObjects[x, y] != null) Destroy(tileObjects[x, y]);
                }
            }
        }
        tileObjects = new GameObject[MapW, MapH];

        foreach (var m in monsters)
        {
            if (m.visualObj != null) Destroy(m.visualObj);
        }
        monsters.Clear();

        // 1. Fill solid walls
        for (int x = 0; x < MapW; x++)
        {
            for (int y = 0; y < MapH; y++)
            {
                map[x, y] = new Tile { type = TileType.Wall, explored = false, visible = false };
            }
        }

        // 2. Carve Rooms & Corridors
        int roomCols = 3;
        int roomRows = 2;
        int cellW = (MapW - 2) / roomCols;
        int cellH = (MapH - 2) / roomRows;
        List<Vector2Int> roomCenters = new List<Vector2Int>();

        for (int rx = 0; rx < roomCols; rx++)
        {
            for (int ry = 0; ry < roomRows; ry++)
            {
                int rw = UnityEngine.Random.Range(4, cellW - 1);
                int rh = UnityEngine.Random.Range(3, cellH - 1);
                int left = 1 + rx * cellW + UnityEngine.Random.Range(0, cellW - rw);
                int top = 1 + ry * cellH + UnityEngine.Random.Range(0, cellH - rh);

                for (int x = left; x < left + rw; x++)
                {
                    for (int y = top; y < top + rh; y++)
                    {
                        if (x > 0 && x < MapW - 1 && y > 0 && y < MapH - 1)
                        {
                            map[x, y].type = TileType.Floor;
                        }
                    }
                }
                roomCenters.Add(new Vector2Int(left + rw / 2, top + rh / 2));
            }
        }

        // Connect rooms with corridors
        for (int i = 0; i < roomCenters.Count - 1; i++)
        {
            Vector2Int a = roomCenters[i];
            Vector2Int b = roomCenters[i + 1];

            // Horizontal
            int startX = Mathf.Min(a.x, b.x);
            int endX = Mathf.Max(a.x, b.x);
            for (int x = startX; x <= endX; x++) map[x, a.y].type = TileType.Floor;

            // Vertical
            int startY = Mathf.Min(a.y, b.y);
            int endY = Mathf.Max(a.y, b.y);
            for (int y = startY; y <= endY; y++) map[b.x, y].type = TileType.Floor;
        }

        // 3. Player Spawn at Room 0
        playerX = roomCenters[0].x;
        playerY = roomCenters[0].y;
        playerRenderPos = new Vector3(playerX * TileSize, 0, playerY * TileSize);
        playerTargetPos = playerRenderPos;
        heroObj.transform.position = playerRenderPos;

        // 4. Stairs Down at Last Room
        Vector2Int stairsPos = roomCenters[roomCenters.Count - 1];
        map[stairsPos.x, stairsPos.y].type = TileType.Stairs;

        // 5. Spawn Chests
        int chestCount = UnityEngine.Random.Range(2, 4);
        for (int i = 0; i < chestCount; i++)
        {
            Vector2Int pos = GetRandomFloorTile();
            if (pos != new Vector2Int(playerX, playerY) && pos != stairsPos)
            {
                map[pos.x, pos.y].type = TileType.Chest;
            }
        }

        // 6. Spawn Monsters
        int enemyCount = def.isBossFloor ? 4 : 5;
        for (int i = 0; i < enemyCount; i++)
        {
            Vector2Int pos = GetRandomFloorTile();
            if (pos == new Vector2Int(playerX, playerY) || pos == stairsPos) continue;

            bool isBoss = def.isBossFloor && (i == 0);
            SpawnMonster(def.enemyNameKo, pos.x, pos.y, isBoss ? def.enemyHp * 2 : def.enemyHp, isBoss ? def.enemyAtk + 6 : def.enemyAtk, def.enemyDef, isBoss, def.enemyColor);
        }

        // 7. Instantiate 3D Map Tiles
        BuildMapVisuals();
        ComputeFOV();

        lastCombatLog = "B" + currentFloor + "F: " + def.nameKo + " (" + def.nameEn + ")에 도착했습니다.";
        PlaySound(440f, 0.15f);
    }

    Vector2Int GetRandomFloorTile()
    {
        for (int attempts = 0; attempts < 200; attempts++)
        {
            int x = UnityEngine.Random.Range(1, MapW - 1);
            int y = UnityEngine.Random.Range(1, MapH - 1);
            if (map[x, y].type == TileType.Floor) return new Vector2Int(x, y);
        }
        return new Vector2Int(playerX, playerY);
    }

    void SpawnMonster(string name, int x, int y, int hp, int atk, int def, bool isBoss, Color col)
    {
        var m = new Monster
        {
            name = name,
            x = x,
            y = y,
            hp = hp,
            maxHp = hp,
            atk = atk,
            def = def,
            isBoss = isBoss
        };

        var go = GameObject.CreatePrimitive(isBoss ? PrimitiveType.Cylinder : PrimitiveType.Cube);
        go.name = "Monster_" + name;
        float scale = isBoss ? 1.0f : 0.65f;
        go.transform.localScale = new Vector3(scale, scale, scale);
        go.transform.position = new Vector3(x * TileSize, scale * 0.5f, y * TileSize);

        Material mat = new Material(Shader.Find("Mobile/Diffuse") ?? Shader.Find("Standard"));
        mat.color = col;
        go.GetComponent<MeshRenderer>().sharedMaterial = mat;

        m.visualObj = go;
        monsters.Add(m);
    }

    void BuildMapVisuals()
    {
        for (int x = 0; x < MapW; x++)
        {
            for (int y = 0; y < MapH; y++)
            {
                Tile t = map[x, y];
                Vector3 pos = new Vector3(x * TileSize, 0, y * TileSize);

                GameObject go;
                if (t.type == TileType.Wall)
                {
                    go = GameObject.CreatePrimitive(PrimitiveType.Cube);
                    go.transform.position = pos + Vector3.up * 0.6f;
                    go.transform.localScale = new Vector3(TileSize * 0.98f, 1.2f, TileSize * 0.98f);
                    go.GetComponent<MeshRenderer>().sharedMaterial = wallMat;
                }
                else
                {
                    go = GameObject.CreatePrimitive(PrimitiveType.Cube);
                    go.transform.position = pos;
                    go.transform.localScale = new Vector3(TileSize * 0.98f, 0.1f, TileSize * 0.98f);

                    if (t.type == TileType.Stairs)
                    {
                        go.GetComponent<MeshRenderer>().sharedMaterial = stairsMat;
                        // Add a small portal arch
                        var portal = GameObject.CreatePrimitive(PrimitiveType.Sphere);
                        portal.transform.SetParent(go.transform);
                        portal.transform.localPosition = new Vector3(0, 4.0f, 0);
                        portal.transform.localScale = new Vector3(0.5f, 0.5f, 0.5f);
                        portal.GetComponent<MeshRenderer>().sharedMaterial = stairsMat;
                    }
                    else if (t.type == TileType.Chest)
                    {
                        go.GetComponent<MeshRenderer>().sharedMaterial = floorMat;
                        // 3D Chest box
                        var chest = GameObject.CreatePrimitive(PrimitiveType.Cube);
                        chest.transform.SetParent(go.transform);
                        chest.transform.localPosition = new Vector3(0, 3.5f, 0);
                        chest.transform.localScale = new Vector3(0.5f, 0.4f, 0.4f);
                        chest.GetComponent<MeshRenderer>().sharedMaterial = chestMat;
                    }
                    else
                    {
                        go.GetComponent<MeshRenderer>().sharedMaterial = floorMat;
                    }
                }

                tileObjects[x, y] = go;
                go.SetActive(false); // Managed by FOV
            }
        }
    }

    void ComputeFOV()
    {
        // Reset visibility
        for (int x = 0; x < MapW; x++)
        {
            for (int y = 0; y < MapH; y++)
            {
                map[x, y].visible = false;
            }
        }

        // Raycasting FOV from player
        int fovRadius = 7;
        for (int deg = 0; deg < 360; deg += 3)
        {
            float rad = deg * Mathf.Deg2Rad;
            float cos = Mathf.Cos(rad);
            float sin = Mathf.Sin(rad);

            for (float r = 0; r <= fovRadius; r += 0.5f)
            {
                int tx = Mathf.RoundToInt(playerX + cos * r);
                int ty = Mathf.RoundToInt(playerY + sin * r);

                if (tx >= 0 && tx < MapW && ty >= 0 && ty < MapH)
                {
                    map[tx, ty].visible = true;
                    map[tx, ty].explored = true;

                    if (map[tx, ty].type == TileType.Wall) break;
                }
            }
        }

        // Update 3D Tile Visibility and Monster Visibility
        for (int x = 0; x < MapW; x++)
        {
            for (int y = 0; y < MapH; y++)
            {
                var go = tileObjects[x, y];
                if (go == null) continue;

                if (map[x, y].visible)
                {
                    go.SetActive(true);
                    go.GetComponent<MeshRenderer>().material.color = (map[x, y].type == TileType.Wall) ? FloorDefs[currentFloor - 1].wallColor : (map[x, y].type == TileType.Stairs ? stairsMat.color : (map[x, y].type == TileType.Chest ? chestMat.color : FloorDefs[currentFloor - 1].floorColor));
                }
                else if (map[x, y].explored)
                {
                    go.SetActive(true);
                    go.GetComponent<MeshRenderer>().material.color = new Color(0.12f, 0.12f, 0.15f); // Dim explored shadow
                }
                else
                {
                    go.SetActive(false);
                }
            }
        }

        foreach (var m in monsters)
        {
            if (m.visualObj != null)
            {
                bool vis = map[m.x, m.y].visible;
                m.visualObj.SetActive(vis);
            }
        }
    }

    void Update()
    {
        HandleInput();
        AnimateSmoothMotion();
        UpdateFloatingTexts();
        UpdateCameraFollow();
    }

    void AnimateSmoothMotion()
    {
        playerRenderPos = Vector3.Lerp(playerRenderPos, playerTargetPos, Time.deltaTime * 14f);
        if (heroObj != null) heroObj.transform.position = playerRenderPos;

        // Torchlight flicker
        if (torchLight != null)
        {
            torchLight.intensity = 1.5f + Mathf.Sin(Time.time * 8f) * 0.15f;
        }

        // Smooth monster visuals
        foreach (var m in monsters)
        {
            if (m.visualObj != null)
            {
                Vector3 target = new Vector3(m.x * TileSize, m.isBoss ? 0.5f : 0.35f, m.y * TileSize);
                m.visualObj.transform.position = Vector3.Lerp(m.visualObj.transform.position, target, Time.deltaTime * 12f);
            }
        }
    }

    void UpdateCameraFollow()
    {
        if (heroObj == null || mainCam == null) return;
        Vector3 camOffset = new Vector3(0, 11f, -7.5f);
        Vector3 targetCamPos = playerRenderPos + camOffset;
        mainCam.transform.position = Vector3.Lerp(mainCam.transform.position, targetCamPos, Time.deltaTime * 8f);
        mainCam.transform.LookAt(playerRenderPos + Vector3.up * 0.5f);
    }

    void HandleInput()
    {
        if (isGameOver || isGameVictory || showFloorSelectModal)
        {
            if (Input.GetKeyDown(KeyCode.R)) GenerateFloor(currentFloor);
            if (Input.GetKeyDown(KeyCode.M)) showFloorSelectModal = !showFloorSelectModal;
            return;
        }

        int dx = 0;
        int dy = 0;

        if (Input.GetKeyDown(KeyCode.W) || Input.GetKeyDown(KeyCode.UpArrow)) dy = 1;
        else if (Input.GetKeyDown(KeyCode.S) || Input.GetKeyDown(KeyCode.DownArrow)) dy = -1;
        else if (Input.GetKeyDown(KeyCode.A) || Input.GetKeyDown(KeyCode.LeftArrow)) dx = -1;
        else if (Input.GetKeyDown(KeyCode.D) || Input.GetKeyDown(KeyCode.RightArrow)) dx = 1;
        else if (Input.GetKeyDown(KeyCode.Space) || Input.GetKeyDown(KeyCode.Period))
        {
            // Wait turn
            AdvanceTurn("용사가 한 턴 대기하며 호흡을 가다듬었습니다.");
            return;
        }
        else if (Input.GetKeyDown(KeyCode.Alpha1)) { UsePotion(); return; }
        else if (Input.GetKeyDown(KeyCode.Alpha2)) { UseElixir(); return; }
        else if (Input.GetKeyDown(KeyCode.M)) { showFloorSelectModal = !showFloorSelectModal; return; }

        if (dx != 0 || dy != 0)
        {
            TryMoveOrAttack(dx, dy);
        }
    }

    void TryMoveOrAttack(int dx, int dy)
    {
        int targetX = playerX + dx;
        int targetY = playerY + dy;

        if (targetX < 0 || targetX >= MapW || targetY < 0 || targetY >= MapH) return;

        // Check monster bump combat
        Monster monster = monsters.Find(m => m.x == targetX && m.y == targetY);
        if (monster != null)
        {
            AttackMonster(monster);
            AdvanceTurn("");
            return;
        }

        // Check wall collision
        if (map[targetX, targetY].type == TileType.Wall)
        {
            PlaySound(180f, 0.08f);
            return;
        }

        // Move player
        playerX = targetX;
        playerY = targetY;
        playerTargetPos = new Vector3(playerX * TileSize, 0, playerY * TileSize);
        PlaySound(320f, 0.05f);

        // Check Tile interactions
        if (map[playerX, playerY].type == TileType.Chest)
        {
            OpenChest(playerX, playerY);
        }
        else if (map[playerX, playerY].type == TileType.Stairs)
        {
            DescendStairs();
            return;
        }

        AdvanceTurn("");
    }

    void AttackMonster(Monster m)
    {
        int dmg = Mathf.Max(1, playerAtk - m.def + UnityEngine.Random.Range(-2, 3));
        m.hp -= dmg;
        SpawnFloatingText("-" + dmg, m.visualObj.transform.position + Vector3.up * 1f, Color.yellow);
        PlaySound(600f, 0.1f);

        lastCombatLog = m.name + "에게 " + dmg + "의 피해를 입혔습니다! (남은 HP: " + Mathf.Max(0, m.hp) + ")";

        if (m.hp <= 0)
        {
            OnMonsterKilled(m);
        }
    }

    void OnMonsterKilled(Monster m)
    {
        monsters.Remove(m);
        if (m.visualObj != null) Destroy(m.visualObj);

        int goldGain = m.isBoss ? 50 : UnityEngine.Random.Range(5, 15);
        int expGain = m.isBoss ? 60 : 15;
        playerGold += goldGain;
        playerExp += expGain;

        SpawnFloatingText("+" + goldGain + " Gold", playerRenderPos + Vector3.up * 1.5f, new Color(1f, 0.85f, 0.2f));
        PlaySound(880f, 0.18f);

        // Level Up check
        if (playerExp >= playerLevel * 30)
        {
            playerLevel++;
            playerExp = 0;
            playerMaxHp += 15;
            playerHp = playerMaxHp;
            playerAtk += 3;
            playerDef += 1;
            SpawnFloatingText("LEVEL UP! (Lv." + playerLevel + ")", playerRenderPos + Vector3.up * 2f, Color.cyan);
            PlaySound(1046f, 0.3f);
        }

        if (m.isBoss && currentFloor == MaxFloors)
        {
            isGameVictory = true;
            PlayFanfare();
        }
    }

    void OpenChest(int x, int y)
    {
        map[x, y].type = TileType.Floor;
        if (tileObjects[x, y] != null)
        {
            tileObjects[x, y].GetComponent<MeshRenderer>().sharedMaterial = floorMat;
        }

        int rewardType = UnityEngine.Random.Range(0, 3);
        if (rewardType == 0)
        {
            potionCount++;
            lastCombatLog = "보물상자를 열어 [생명력 회복 포션]을 획득했습니다!";
            SpawnFloatingText("+1 Potion", playerRenderPos + Vector3.up * 1.5f, Color.green);
        }
        else if (rewardType == 1)
        {
            elixirCount++;
            lastCombatLog = "보물상자를 열어 [힘의 엘릭서]를 획득했습니다!";
            SpawnFloatingText("+1 Elixir", playerRenderPos + Vector3.up * 1.5f, new Color(0.8f, 0.4f, 1f));
        }
        else
        {
            int gold = UnityEngine.Random.Range(20, 45);
            playerGold += gold;
            lastCombatLog = "보물상자를 열어 " + gold + " 골드를 획득했습니다!";
            SpawnFloatingText("+" + gold + " Gold", playerRenderPos + Vector3.up * 1.5f, Color.yellow);
        }
        PlaySound(784f, 0.2f);
    }

    void DescendStairs()
    {
        if (currentFloor < MaxFloors)
        {
            GenerateFloor(currentFloor + 1);
        }
        else
        {
            isGameVictory = true;
            PlayFanfare();
        }
    }

    void AdvanceTurn(string logMsg)
    {
        turnCounter++;
        if (!string.IsNullOrEmpty(logMsg)) lastCombatLog = logMsg;

        ComputeFOV();

        // Monsters turn: Chase or Attack player if visible
        foreach (var m in monsters)
        {
            int dist = Mathf.Abs(m.x - playerX) + Mathf.Abs(m.y - playerY);
            if (dist == 1)
            {
                // Monster attacks player
                int mDmg = Mathf.Max(1, m.atk - playerDef + UnityEngine.Random.Range(-1, 2));
                playerHp -= mDmg;
                SpawnFloatingText("-" + mDmg, playerRenderPos + Vector3.up * 1.2f, Color.red);
                PlaySound(220f, 0.12f);
                lastCombatLog = m.name + "의 공격! 용사가 " + mDmg + "의 피해를 입었습니다.";

                if (playerHp <= 0)
                {
                    playerHp = 0;
                    isGameOver = true;
                    PlaySound(150f, 0.4f);
                    break;
                }
            }
            else if (dist <= 6 && map[m.x, m.y].visible)
            {
                // Step towards player
                int stepX = 0;
                int stepY = 0;
                if (Mathf.Abs(playerX - m.x) > Mathf.Abs(playerY - m.y))
                {
                    stepX = (playerX > m.x) ? 1 : -1;
                }
                else
                {
                    stepY = (playerY > m.y) ? 1 : -1;
                }

                int nx = m.x + stepX;
                int ny = m.y + stepY;
                if (nx >= 0 && nx < MapW && ny >= 0 && ny < MapH && map[nx, ny].type != TileType.Wall && (nx != playerX || ny != playerY))
                {
                    if (!monsters.Exists(other => other != m && other.x == nx && other.y == ny))
                    {
                        m.x = nx;
                        m.y = ny;
                    }
                }
            }
        }
    }

    void UsePotion()
    {
        if (potionCount <= 0) return;
        potionCount--;
        int heal = 40;
        playerHp = Mathf.Min(playerMaxHp, playerHp + heal);
        SpawnFloatingText("+" + heal + " HP", playerRenderPos + Vector3.up * 1.5f, Color.green);
        PlaySound(523f, 0.2f);
        AdvanceTurn("치유 물약을 마셔 HP " + heal + "을 회복했습니다.");
    }

    void UseElixir()
    {
        if (elixirCount <= 0) return;
        elixirCount--;
        playerAtk += 4;
        SpawnFloatingText("+4 ATK!", playerRenderPos + Vector3.up * 1.5f, Color.magenta);
        PlaySound(659f, 0.25f);
        AdvanceTurn("힘의 엘릭서를 마셔 영구 공격력이 +4 증가했습니다!");
    }

    void SpawnFloatingText(string txt, Vector3 wpos, Color col)
    {
        floatingTexts.Add(new FloatingText { text = txt, worldPos = wpos, color = col, timer = 1.2f });
    }

    void UpdateFloatingTexts()
    {
        for (int i = floatingTexts.Count - 1; i >= 0; i--)
        {
            floatingTexts[i].timer -= Time.deltaTime;
            floatingTexts[i].worldPos += Vector3.up * Time.deltaTime * 0.8f;
            if (floatingTexts[i].timer <= 0) floatingTexts.RemoveAt(i);
        }
    }

    void PlaySound(float freq, float dur)
    {
        if (audioSource == null) return;
        int sampleRate = 44100;
        int count = (int)(sampleRate * dur);
        float[] samples = new float[count];
        for (int i = 0; i < count; i++)
        {
            float t = (float)i / sampleRate;
            float env = Mathf.Exp(-t * (1f / dur) * 3f);
            samples[i] = Mathf.Sin(2 * Mathf.PI * freq * t) * env * 0.25f;
        }
        AudioClip clip = AudioClip.Create("SFX", count, 1, sampleRate, false);
        clip.SetData(samples, 0);
        audioSource.PlayOneShot(clip);
    }

    void PlayFanfare()
    {
        if (audioSource == null) return;
        int sampleRate = 44100;
        int count = (int)(sampleRate * 0.6f);
        float[] samples = new float[count];
        float[] notes = new float[] { 523.25f, 659.25f, 783.99f, 1046.50f };
        for (int i = 0; i < count; i++)
        {
            float t = (float)i / sampleRate;
            float env = Mathf.Exp(-t * 4f);
            float s = 0;
            foreach (var n in notes) s += Mathf.Sin(2 * Mathf.PI * n * t);
            samples[i] = (s / notes.Length) * env * 0.3f;
        }
        AudioClip clip = AudioClip.Create("Victory", count, 1, sampleRate, false);
        clip.SetData(samples, 0);
        audioSource.PlayOneShot(clip);
    }

    void OnGUI()
    {
        DrawHUD();
        DrawFloatingTexts();

        if (isGameOver) DrawGameOverBanner();
        if (isGameVictory) DrawVictoryBanner();
        if (showFloorSelectModal) DrawFloorSelectModal();
    }

    void DrawHUD()
    {
        int w = Screen.width;
        int h = Screen.height;

        // Top Status Bar
        GUI.Box(new Rect(10, 10, w - 20, 52), GUIContent.none);

        GUIStyle floorStyle = new GUIStyle(GUI.skin.label)
        {
            fontSize = 17,
            fontStyle = FontStyle.Bold,
            normal = { textColor = new Color(1f, 0.85f, 0.3f) }
        };

        GUIStyle subStyle = new GUIStyle(GUI.skin.label)
        {
            fontSize = 12,
            normal = { textColor = Color.white }
        };

        FloorDef def = FloorDefs[currentFloor - 1];
        GUI.Label(new Rect(20, 12, 380, 24), "B" + currentFloor + "F: " + def.nameKo + " (" + def.nameEn + ")", floorStyle);
        GUI.Label(new Rect(20, 34, 380, 22), "HP: " + playerHp + "/" + playerMaxHp + " | ATK: " + playerAtk + " | DEF: " + playerDef + " | Lv." + playerLevel + " | 💰 " + playerGold + "G", subStyle);

        // Quick Stage Select button
        if (GUI.Button(new Rect(w - 180, 15, 75, 40), "🗺️ 층 선택"))
        {
            showFloorSelectModal = !showFloorSelectModal;
        }

        // Restart floor
        if (GUI.Button(new Rect(w - 95, 15, 75, 40), "🔄 재도전"))
        {
            GenerateFloor(currentFloor);
        }

        // Bottom Action Bar
        int barH = 65;
        GUI.Box(new Rect(10, h - barH - 10, w - 20, barH), GUIContent.none);

        // Combat Log
        GUIStyle logStyle = new GUIStyle(GUI.skin.label)
        {
            fontSize = 13,
            normal = { textColor = new Color(0.9f, 0.95f, 1f) }
        };
        GUI.Label(new Rect(20, h - barH - 6, w - 270, 30), lastCombatLog, logStyle);

        GUIStyle keyHintStyle = new GUIStyle(GUI.skin.label)
        {
            fontSize = 11,
            normal = { textColor = new Color(0.7f, 0.75f, 0.85f) }
        };
        GUI.Label(new Rect(20, h - barH + 18, w - 270, 20), "이동/공격: 방향키, WASD | 대기: Space | 포션: [1] | 엘릭서: [2]", keyHintStyle);

        // Potions / Elixirs Buttons
        if (GUI.Button(new Rect(w - 240, h - barH + 5, 105, 45), "🧪 포션 (" + potionCount + ")"))
        {
            UsePotion();
        }
        if (GUI.Button(new Rect(w - 125, h - barH + 5, 105, 45), "⚡ 엘릭서 (" + elixirCount + ")"))
        {
            UseElixir();
        }
    }

    void DrawFloatingTexts()
    {
        if (mainCam == null) return;
        GUIStyle floatStyle = new GUIStyle(GUI.skin.label)
        {
            fontSize = 15,
            fontStyle = FontStyle.Bold,
            alignment = TextAnchor.MiddleCenter
        };

        foreach (var ft in floatingTexts)
        {
            Vector3 screenPos = mainCam.WorldToScreenPoint(ft.worldPos);
            if (screenPos.z > 0)
            {
                floatStyle.normal.textColor = ft.color;
                GUI.Label(new Rect(screenPos.x - 70, Screen.height - screenPos.y - 15, 140, 30), ft.text, floatStyle);
            }
        }
    }

    void DrawGameOverBanner()
    {
        int w = Screen.width;
        int h = Screen.height;
        Rect r = new Rect(w / 2 - 180, h / 2 - 80, 360, 160);
        GUI.Box(r, GUIContent.none);

        GUIStyle title = new GUIStyle(GUI.skin.label)
        {
            fontSize = 22,
            fontStyle = FontStyle.Bold,
            alignment = TextAnchor.MiddleCenter,
            normal = { textColor = new Color(1f, 0.35f, 0.35f) }
        };
        GUI.Label(new Rect(r.x, r.y + 15, r.width, 35), "던전에서 쓰러졌습니다...", title);

        if (GUI.Button(new Rect(r.x + 90, r.y + 90, 180, 45), "현재 층 재도전 (R)"))
        {
            playerHp = playerMaxHp;
            GenerateFloor(currentFloor);
        }
    }

    void DrawVictoryBanner()
    {
        int w = Screen.width;
        int h = Screen.height;
        Rect r = new Rect(w / 2 - 220, h / 2 - 90, 440, 180);
        GUI.Box(r, GUIContent.none);

        GUIStyle title = new GUIStyle(GUI.skin.label)
        {
            fontSize = 22,
            fontStyle = FontStyle.Bold,
            alignment = TextAnchor.MiddleCenter,
            normal = { textColor = new Color(1f, 0.85f, 0.2f) }
        };
        GUIStyle sub = new GUIStyle(GUI.skin.label)
        {
            fontSize = 13,
            alignment = TextAnchor.MiddleCenter,
            normal = { textColor = Color.white }
        };

        GUI.Label(new Rect(r.x, r.y + 15, r.width, 35), "★ B10F 고대 화룡 정복 완료! ★", title);
        GUI.Label(new Rect(r.x, r.y + 55, r.width, 25), "고대 드래곤의 아뮬렛을 획득하고 지상으로 귀환했습니다!", sub);

        if (GUI.Button(new Rect(r.x + 130, r.y + 105, 180, 45), "새로운 던전 탐험 시작"))
        {
            playerHp = 100;
            playerMaxHp = 100;
            playerAtk = 10;
            playerDef = 2;
            GenerateFloor(1);
        }
    }

    void DrawFloorSelectModal()
    {
        int w = Screen.width;
        int h = Screen.height;
        GUI.Box(new Rect(30, 70, w - 60, h - 140), "🗺️ 던전 층 선택 (Dungeon Floor Select: B1F ~ B10F)");

        int cols = 2;
        int itemW = (w - 110) / cols;
        int itemH = 48;

        for (int i = 0; i < FloorDefs.Length; i++)
        {
            int row = i / cols;
            int col = i % cols;
            Rect btnRect = new Rect(45 + col * (itemW + 10), 105 + row * (itemH + 8), itemW, itemH);

            FloorDef f = FloorDefs[i];
            string bossTag = f.isBossFloor ? " [BOSS!]" : "";
            string text = "B" + f.floor + "F: " + f.nameKo + bossTag + " (" + f.enemyNameKo + ")";

            if (GUI.Button(btnRect, text))
            {
                showFloorSelectModal = false;
                GenerateFloor(f.floor);
            }
        }
    }
}
