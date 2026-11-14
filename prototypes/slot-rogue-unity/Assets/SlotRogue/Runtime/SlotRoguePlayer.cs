using System;
using System.Collections.Generic;
using UnityEngine;

public class SlotRoguePlayer : MonoBehaviour
{
    const int GridRows = 4;
    const int GridCols = 4;
    const int TotalSlots = GridRows * GridCols;
    const int MaxStages = 10;
    const float SlotSpacingX = 1.35f;
    const float SlotSpacingY = 1.35f;

    // Symbol Types
    public enum SymbolType
    {
        Coin,     // 0: 🪙 1G
        Cat,      // 1: 🐱 1G, drinks Milk (+9G)
        Milk,     // 2: 🥛 1G
        Miner,    // 3: ⛏️ 1G, mines Ore (+15G -> Gem)
        Ore,      // 4: 🪨 1G
        Gem,      // 5: 💎 5G
        Flower,   // 6: 🌻 1G, +4G per Sun
        Sun,      // 7: ☀️ 3G, buffs Flower
        Thief,    // 8: 🦹 2G, opens Safe (+35G)
        Safe,     // 9: 🔐 1G
        King,     // 10: 🤴 4G, +5G per Crown
        Crown     // 11: 👑 5G
    }

    public struct SymbolSpec
    {
        public SymbolType type;
        public string icon;
        public string nameKo;
        public string nameEn;
        public string effectKo;
        public int baseValue;
        public Color color;
    }

    static readonly SymbolSpec[] SymbolCatalog = new SymbolSpec[]
    {
        new SymbolSpec { type = SymbolType.Coin, icon = "🪙", nameKo = "동전", nameEn = "Coin", effectKo = "기본 +1 골드 지급", baseValue = 1, color = new Color(0.95f, 0.8f, 0.2f) },
        new SymbolSpec { type = SymbolType.Cat, icon = "🐱", nameKo = "고양이", nameEn = "Cat", effectKo = "인접한 우유를 마시고 +9G (우유 소멸)", baseValue = 1, color = new Color(0.95f, 0.55f, 0.2f) },
        new SymbolSpec { type = SymbolType.Milk, icon = "🥛", nameKo = "우유", nameEn = "Milk", effectKo = "기본 +1 골드 (고양이가 마심)", baseValue = 1, color = new Color(0.92f, 0.94f, 0.98f) },
        new SymbolSpec { type = SymbolType.Miner, icon = "⛏️", nameKo = "광부", nameEn = "Miner", effectKo = "인접한 광석을 캐서 +15G 및 보석으로 변환", baseValue = 1, color = new Color(0.3f, 0.7f, 0.9f) },
        new SymbolSpec { type = SymbolType.Ore, icon = "🪨", nameKo = "광석", nameEn = "Ore", effectKo = "기본 +1 골드 (광부가 채굴)", baseValue = 1, color = new Color(0.55f, 0.55f, 0.6f) },
        new SymbolSpec { type = SymbolType.Gem, icon = "💎", nameKo = "보석", nameEn = "Gem", effectKo = "기본 +5 골드 지급", baseValue = 5, color = new Color(0.2f, 0.95f, 0.85f) },
        new SymbolSpec { type = SymbolType.Flower, icon = "🌻", nameKo = "꽃", nameEn = "Flower", effectKo = "인접한 태양 하나당 +4G 추가", baseValue = 1, color = new Color(0.95f, 0.85f, 0.15f) },
        new SymbolSpec { type = SymbolType.Sun, icon = "☀️", nameKo = "태양", nameEn = "Sun", effectKo = "기본 +3 골드 및 인접 꽃 강화", baseValue = 3, color = new Color(1.0f, 0.45f, 0.1f) },
        new SymbolSpec { type = SymbolType.Thief, icon = "🦹", nameKo = "도둑", nameEn = "Thief", effectKo = "인접한 금고를 열어 +35G (금고 소멸)", baseValue = 2, color = new Color(0.65f, 0.35f, 0.85f) },
        new SymbolSpec { type = SymbolType.Safe, icon = "🔐", nameKo = "금고", nameEn = "Safe", effectKo = "기본 +1 골드 (도둑이 해제)", baseValue = 1, color = new Color(0.3f, 0.35f, 0.4f) },
        new SymbolSpec { type = SymbolType.King, icon = "🤴", nameKo = "왕", nameEn = "King", effectKo = "인접한 왕관 하나당 +5G 추가", baseValue = 4, color = new Color(0.25f, 0.45f, 0.9f) },
        new SymbolSpec { type = SymbolType.Crown, icon = "👑", nameKo = "왕관", nameEn = "Crown", effectKo = "기본 +5 골드 지급", baseValue = 5, color = new Color(1.0f, 0.82f, 0.1f) }
    };

    // Stage Definitions (10 Boss Encounters)
    public struct StageDef
    {
        public int stage;
        public string bossNameKo;
        public string bossNameEn;
        public string titleKo;
        public int rentDue;
        public int spinsAllowed;
        public string quoteKo;
    }

    static readonly StageDef[] Stages = new StageDef[]
    {
        new StageDef { stage = 1, bossNameKo = "슬라임 사채업자", bossNameEn = "Slime Landlord", titleKo = "골목길 빈민가", rentDue = 25, spinsAllowed = 5, quoteKo = "\"월세 25골드 준비됐겠지? 슬라임이라고 얕보지 마라!\"" },
        new StageDef { stage = 2, bossNameKo = "고블린 전당포주", bossNameEn = "Goblin Pawnbroker", titleKo = "고블린 시장", rentDue = 55, spinsAllowed = 5, quoteKo = "\"보석이든 광석이든 가져와! 55골드 못 내면 쫓겨난다, 키킥!\"" },
        new StageDef { stage = 3, bossNameKo = "사막 도적단 두목", bossNameEn = "Bandit Chieftain", titleKo = "무법자 오아시스", rentDue = 110, spinsAllowed = 5, quoteKo = "\"금고를 털든 뭘 하든 110골드를 채워라. 안 그러면 모래에 묻힌다.\"" },
        new StageDef { stage = 4, bossNameKo = "태양의 드루이드", bossNameEn = "Solar Druid", titleKo = "태양의 신전", rentDue = 190, spinsAllowed = 5, quoteKo = "\"태양의 축복을 받은 꽃을 피워라. 190골드의 제물이 필요하다.\"" },
        new StageDef { stage = 5, bossNameKo = "황금 카지노 남작", bossNameEn = "Golden Casino Baron", titleKo = "네온 카지노 홀 (중간보스)", rentDue = 300, spinsAllowed = 5, quoteKo = "\"300골드! 카지노 하우스는 언제나 이긴다. 네 운을 증명해봐라!\"" },
        new StageDef { stage = 6, bossNameKo = "해적 선장 블랙비어드", bossNameEn = "Captain Blackbeard", titleKo = "보물섬 해적항", rentDue = 450, spinsAllowed = 5, quoteKo = "\"선실 임대료 450골드다! 못 내면 상어 밥으로 던져버릴 테다!\"" },
        new StageDef { stage = 7, bossNameKo = "고대 연금술 협회장", bossNameEn = "Alchemist Guildmaster", titleKo = "비전 연금 실험실", rentDue = 650, spinsAllowed = 5, quoteKo = "\"현자의 돌을 만들든 금을 연성하든 650골드의 연구비를 내시오.\"" },
        new StageDef { stage = 8, bossNameKo = "용암 드워프 대장장이 왕", bossNameEn = "Magma Forge King", titleKo = "지하 용암 대장간", rentDue = 920, spinsAllowed = 5, quoteKo = "\"우리의 모루를 쓰려면 920골드의 불값을 치러야 마땅하다!\"" },
        new StageDef { stage = 9, bossNameKo = "그림자 암시장 대부", bossNameEn = "Shadow Syndicate Boss", titleKo = "암흑 지하 신디케이트", rentDue = 1300, spinsAllowed = 5, quoteKo = "\"1300골드. 자비는 없다. 어둠의 빚은 반드시 갚아야 하지.\"" },
        new StageDef { stage = 10, bossNameKo = "탐욕의 악마 마몬", bossNameEn = "Mammon Arch-Demon", titleKo = "탐욕의 황금 제단 (최종보스)", rentDue = 1800, spinsAllowed = 5, quoteKo = "\"최후의 빚 1800골드! 영혼을 바치든 천문학적 잭팟을 터뜨리든 해봐라!\"" }
    };

    // Game State
    int currentStageIndex = 0; // 0 to 9
    int playerCoins = 10;
    int spinsRemaining = 5;
    List<SymbolType> playerDeck = new List<SymbolType>();
    SymbolType[,] gridSymbols = new SymbolType[GridRows, GridCols];

    // Spin Animation State
    bool isSpinning = false;
    float spinTimer = 0f;
    float[] colStopTimes = new float[GridCols];
    bool[] colStopped = new bool[GridCols];
    GameObject[,] slotMeshes = new GameObject[GridRows, GridCols];
    GameObject leverArm;
    float leverAngle = 0f;

    // Draft State
    bool isDrafting = false;
    SymbolType[] draftChoices = new SymbolType[3];

    // Modals & Banners
    bool isGameOver = false;
    bool isVictory = false;
    bool showStageSelectModal = false;
    string lastActionLog = "레버를 당겨 슬롯을 회전시키세요!";
    int lastSpinPayout = 0;

    // Audio & Camera
    Camera mainCam;
    AudioSource audioSource;
    Material cabinetMat;
    Material frameMat;
    Material[] symbolMats = new Material[SymbolCatalog.Length];

    void Awake()
    {
        mainCam = Camera.main;
        if (mainCam == null)
        {
            var camGo = new GameObject("Main Camera");
            mainCam = camGo.AddComponent<Camera>();
            camGo.tag = "MainCamera";
        }
        mainCam.backgroundColor = new Color(0.09f, 0.07f, 0.14f);
        mainCam.clearFlags = CameraClearFlags.SolidColor;
        mainCam.fieldOfView = 48f;
        mainCam.transform.position = new Vector3(0, 0, -9.5f);
        mainCam.transform.rotation = Quaternion.identity;

        // Spot & Directional Lights
        var lightGo = new GameObject("CasinoSun");
        var light = lightGo.AddComponent<Light>();
        light.type = LightType.Directional;
        light.color = new Color(1.0f, 0.95f, 0.85f);
        light.intensity = 1.3f;
        lightGo.transform.rotation = Quaternion.Euler(40f, -25f, 0);

        audioSource = gameObject.AddComponent<AudioSource>();

        CreateMaterials();
        BuildCabinet();
        InitStage(0);
    }

    void CreateMaterials()
    {
        Shader diffuse = Shader.Find("Mobile/Diffuse") ?? Shader.Find("Standard");

        cabinetMat = new Material(diffuse) { color = new Color(0.2f, 0.12f, 0.28f) };
        frameMat = new Material(diffuse) { color = new Color(0.95f, 0.75f, 0.2f) };

        for (int i = 0; i < SymbolCatalog.Length; i++)
        {
            symbolMats[i] = new Material(diffuse) { color = SymbolCatalog[i].color };
        }
    }

    void BuildCabinet()
    {
        // 3D Cabinet Frame
        var cabinet = GameObject.CreatePrimitive(PrimitiveType.Cube);
        cabinet.name = "SlotCabinet";
        cabinet.transform.position = new Vector3(0, 0, 0.6f);
        cabinet.transform.localScale = new Vector3(6.5f, 6.5f, 0.8f);
        cabinet.GetComponent<MeshRenderer>().sharedMaterial = cabinetMat;

        // Golden Outer Rim
        var rim = GameObject.CreatePrimitive(PrimitiveType.Cube);
        rim.name = "GoldenRim";
        rim.transform.position = new Vector3(0, 0, 0.1f);
        rim.transform.localScale = new Vector3(5.8f, 5.8f, 0.1f);
        rim.GetComponent<MeshRenderer>().sharedMaterial = frameMat;

        // Lever Base & Arm
        var leverBase = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        leverBase.transform.position = new Vector3(3.4f, 0, 0.2f);
        leverBase.transform.localScale = new Vector3(0.35f, 0.35f, 0.35f);
        leverBase.GetComponent<MeshRenderer>().sharedMaterial = frameMat;

        leverArm = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        leverArm.name = "LeverArm";
        leverArm.transform.position = new Vector3(3.4f, 0.8f, 0.2f);
        leverArm.transform.localScale = new Vector3(0.12f, 0.8f, 0.12f);
        leverArm.GetComponent<MeshRenderer>().sharedMaterial = frameMat;

        var knob = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        knob.transform.SetParent(leverArm.transform);
        knob.transform.localPosition = new Vector3(0, 1.0f, 0);
        knob.transform.localScale = new Vector3(2.5f, 0.4f, 2.5f);
        knob.GetComponent<MeshRenderer>().sharedMaterial = symbolMats[(int)SymbolType.Sun];

        // 4x4 Slot Tumbler Meshes
        float startX = -(GridCols - 1) * SlotSpacingX * 0.5f;
        float startY = (GridRows - 1) * SlotSpacingY * 0.5f;

        for (int r = 0; r < GridRows; r++)
        {
            for (int c = 0; c < GridCols; c++)
            {
                var slot = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                slot.name = "Slot_" + r + "_" + c;
                slot.transform.position = new Vector3(startX + c * SlotSpacingX, startY - r * SlotSpacingY, 0);
                slot.transform.localScale = new Vector3(0.95f, 0.2f, 0.95f);
                slot.transform.rotation = Quaternion.Euler(90f, 0, 0);
                slot.GetComponent<MeshRenderer>().sharedMaterial = symbolMats[(int)SymbolType.Coin];
                slotMeshes[r, c] = slot;
            }
        }
    }

    void InitStage(int stageIdx)
    {
        currentStageIndex = Mathf.Clamp(stageIdx, 0, MaxStages - 1);
        StageDef def = Stages[currentStageIndex];

        spinsRemaining = def.spinsAllowed;
        isGameOver = false;
        isVictory = false;
        isDrafting = false;
        isSpinning = false;
        lastSpinPayout = 0;

        // Initialize starter deck
        if (stageIdx == 0 || playerDeck.Count < 10)
        {
            playerDeck.Clear();
            playerDeck.Add(SymbolType.Coin);
            playerDeck.Add(SymbolType.Coin);
            playerDeck.Add(SymbolType.Coin);
            playerDeck.Add(SymbolType.Cat);
            playerDeck.Add(SymbolType.Milk);
            playerDeck.Add(SymbolType.Miner);
            playerDeck.Add(SymbolType.Ore);
            playerDeck.Add(SymbolType.Flower);
            playerDeck.Add(SymbolType.Sun);
            playerDeck.Add(SymbolType.Thief);
            playerDeck.Add(SymbolType.Safe);
        }

        // Fill initial grid
        for (int r = 0; r < GridRows; r++)
        {
            for (int c = 0; c < GridCols; c++)
            {
                gridSymbols[r, c] = playerDeck[UnityEngine.Random.Range(0, playerDeck.Count)];
            }
        }
        UpdateSlotVisuals();

        lastActionLog = "Stage " + (currentStageIndex + 1) + ": " + def.bossNameKo + " 등장! 월세 " + def.rentDue + "G 목표.";
        PlaySound(440f, 0.15f);
    }

    void Update()
    {
        HandleKeyboardInput();
        AnimateLever();
        AnimateSpinReels();
    }

    void HandleKeyboardInput()
    {
        if (Input.GetKeyDown(KeyCode.Space) || Input.GetKeyDown(KeyCode.Return))
        {
            if (!isSpinning && !isDrafting && !isGameOver && !isVictory && !showStageSelectModal)
            {
                TriggerSpin();
            }
        }
        if (Input.GetKeyDown(KeyCode.M)) showStageSelectModal = !showStageSelectModal;
        if (Input.GetKeyDown(KeyCode.R) && isGameOver) InitStage(currentStageIndex);
    }

    void TriggerSpin()
    {
        if (spinsRemaining <= 0 || isSpinning || isDrafting) return;

        isSpinning = true;
        spinTimer = 0f;
        spinsRemaining--;
        leverAngle = 55f; // Pull lever

        // Set staggered stop times per column
        for (int c = 0; c < GridCols; c++)
        {
            colStopTimes[c] = 0.6f + c * 0.35f;
            colStopped[c] = false;
        }

        PlaySound(220f, 0.35f);
    }

    void AnimateLever()
    {
        if (leverArm != null)
        {
            leverAngle = Mathf.Lerp(leverAngle, 0f, Time.deltaTime * 6f);
            leverArm.transform.localRotation = Quaternion.Euler(leverAngle, 0, 0);
        }
    }

    void AnimateSpinReels()
    {
        if (!isSpinning) return;

        spinTimer += Time.deltaTime;

        for (int c = 0; c < GridCols; c++)
        {
            if (!colStopped[c])
            {
                // Rapid spinning rotation
                for (int r = 0; r < GridRows; r++)
                {
                    slotMeshes[r, c].transform.Rotate(Vector3.up, 1200f * Time.deltaTime, Space.Self);
                }

                // Check stop time
                if (spinTimer >= colStopTimes[c])
                {
                    colStopped[c] = true;
                    // Assign random symbols from deck
                    for (int r = 0; r < GridRows; r++)
                    {
                        gridSymbols[r, c] = playerDeck[UnityEngine.Random.Range(0, playerDeck.Count)];
                        slotMeshes[r, c].transform.rotation = Quaternion.Euler(90f, 0, 0);
                        slotMeshes[r, c].GetComponent<MeshRenderer>().sharedMaterial = symbolMats[(int)gridSymbols[r, c]];
                    }
                    PlaySound(520f + c * 90f, 0.1f);
                }
            }
        }

        // All columns stopped
        if (spinTimer >= colStopTimes[GridCols - 1] + 0.1f)
        {
            isSpinning = false;
            ResolveSpinSynergies();
        }
    }

    void UpdateSlotVisuals()
    {
        for (int r = 0; r < GridRows; r++)
        {
            for (int c = 0; c < GridCols; c++)
            {
                slotMeshes[r, c].transform.rotation = Quaternion.Euler(90f, 0, 0);
                slotMeshes[r, c].GetComponent<MeshRenderer>().sharedMaterial = symbolMats[(int)gridSymbols[r, c]];
            }
        }
    }

    void ResolveSpinSynergies()
    {
        int totalPayout = 0;
        List<string> synergyLogs = new List<string>();

        // 1. Calculate Base Values
        for (int r = 0; r < GridRows; r++)
        {
            for (int c = 0; c < GridCols; c++)
            {
                SymbolSpec spec = SymbolCatalog[(int)gridSymbols[r, c]];
                totalPayout += spec.baseValue;
            }
        }

        // 2. Adjacency Synergy Checks
        int[] dr = { -1, 1, 0, 0, -1, -1, 1, 1 };
        int[] dc = { 0, 0, -1, 1, -1, 1, -1, 1 };

        for (int r = 0; r < GridRows; r++)
        {
            for (int c = 0; c < GridCols; c++)
            {
                SymbolType current = gridSymbols[r, c];

                // Cat + Milk
                if (current == SymbolType.Cat)
                {
                    for (int i = 0; i < 8; i++)
                    {
                        int nr = r + dr[i];
                        int nc = c + dc[i];
                        if (nr >= 0 && nr < GridRows && nc >= 0 && nc < GridCols && gridSymbols[nr, nc] == SymbolType.Milk)
                        {
                            totalPayout += 9;
                            synergyLogs.Add("🐱 고양이가 우유를 마심! (+9G)");
                            gridSymbols[nr, nc] = SymbolType.Coin; // Consumed to coin
                            break;
                        }
                    }
                }
                // Miner + Ore
                else if (current == SymbolType.Miner)
                {
                    for (int i = 0; i < 8; i++)
                    {
                        int nr = r + dr[i];
                        int nc = c + dc[i];
                        if (nr >= 0 && nr < GridRows && nc >= 0 && nc < GridCols && gridSymbols[nr, nc] == SymbolType.Ore)
                        {
                            totalPayout += 15;
                            synergyLogs.Add("⛏️ 광부가 광석을 캐서 보석 발견! (+15G)");
                            gridSymbols[nr, nc] = SymbolType.Gem; // Turned into Gem
                            break;
                        }
                    }
                }
                // Thief + Safe
                else if (current == SymbolType.Thief)
                {
                    for (int i = 0; i < 8; i++)
                    {
                        int nr = r + dr[i];
                        int nc = c + dc[i];
                        if (nr >= 0 && nr < GridRows && nc >= 0 && nc < GridCols && gridSymbols[nr, nc] == SymbolType.Safe)
                        {
                            totalPayout += 35;
                            synergyLogs.Add("🦹 도둑이 금고를 털었습니다! (+35G)");
                            gridSymbols[nr, nc] = SymbolType.Coin;
                            break;
                        }
                    }
                }
                // Flower + Sun
                else if (current == SymbolType.Flower)
                {
                    for (int i = 0; i < 8; i++)
                    {
                        int nr = r + dr[i];
                        int nc = c + dc[i];
                        if (nr >= 0 && nr < GridRows && nc >= 0 && nc < GridCols && gridSymbols[nr, nc] == SymbolType.Sun)
                        {
                            totalPayout += 4;
                            synergyLogs.Add("🌻 꽃이 햇빛을 받아 만개! (+4G)");
                        }
                    }
                }
                // King + Crown
                else if (current == SymbolType.King)
                {
                    for (int i = 0; i < 8; i++)
                    {
                        int nr = r + dr[i];
                        int nc = c + dc[i];
                        if (nr >= 0 && nr < GridRows && nc >= 0 && nc < GridCols && gridSymbols[nr, nc] == SymbolType.Crown)
                        {
                            totalPayout += 5;
                            synergyLogs.Add("🤴 왕이 왕관을 착용! (+5G)");
                        }
                    }
                }
            }
        }

        playerCoins += totalPayout;
        lastSpinPayout = totalPayout;
        UpdateSlotVisuals();

        if (synergyLogs.Count > 0)
        {
            lastActionLog = string.Join(" | ", synergyLogs.ToArray()) + " => 총 +" + totalPayout + "G 획득!";
            PlaySound(880f, 0.25f);
        }
        else
        {
            lastActionLog = "스핀 완료: +" + totalPayout + "G 획득!";
            PlaySound(660f, 0.15f);
        }

        // Open Draft Phase
        PrepareDraft();
    }

    void PrepareDraft()
    {
        isDrafting = true;
        for (int i = 0; i < 3; i++)
        {
            draftChoices[i] = (SymbolType)UnityEngine.Random.Range(0, SymbolCatalog.Length);
        }
    }

    void SelectDraft(int choiceIdx)
    {
        if (choiceIdx >= 0 && choiceIdx < 3)
        {
            SymbolType chosen = draftChoices[choiceIdx];
            playerDeck.Add(chosen);
            lastActionLog = SymbolCatalog[(int)chosen].nameKo + " 심볼을 덱에 추가했습니다!";
            PlaySound(784f, 0.15f);
        }
        isDrafting = false;

        // Check Rent Due Condition
        if (spinsRemaining <= 0)
        {
            CheckRentDue();
        }
    }

    void CheckRentDue()
    {
        StageDef def = Stages[currentStageIndex];

        if (playerCoins >= def.rentDue)
        {
            playerCoins -= def.rentDue;
            PlayFanfare();

            if (currentStageIndex < MaxStages - 1)
            {
                lastActionLog = "★ 월세 " + def.rentDue + "G 납부 성공! 다음 보스에게 도전합니다. ★";
                currentStageIndex++;
                spinsRemaining = Stages[currentStageIndex].spinsAllowed;
            }
            else
            {
                isVictory = true;
                lastActionLog = "★ 탐욕의 악마 마몬을 꺾고 카지노를 정복했습니다! ★";
            }
        }
        else
        {
            isGameOver = true;
            lastActionLog = "월세 " + def.rentDue + "G 부족으로 파산했습니다...";
            PlaySound(150f, 0.4f);
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
        int count = (int)(sampleRate * 0.5f);
        float[] samples = new float[count];
        float[] chord = new float[] { 523.25f, 659.25f, 783.99f, 1046.50f };
        for (int i = 0; i < count; i++)
        {
            float t = (float)i / sampleRate;
            float env = Mathf.Exp(-t * 5f);
            float s = 0;
            foreach (float f in chord) s += Mathf.Sin(2 * Mathf.PI * f * t);
            samples[i] = (s / chord.Length) * env * 0.35f;
        }
        AudioClip clip = AudioClip.Create("Fanfare", count, 1, sampleRate, false);
        clip.SetData(samples, 0);
        audioSource.PlayOneShot(clip);
    }

    void OnGUI()
    {
        DrawHeaderHUD();
        DrawSymbolsOverlay();

        if (isDrafting && !isGameOver && !isVictory)
        {
            DrawDraftModal();
        }

        if (isGameOver) DrawGameOverBanner();
        if (isVictory) DrawVictoryBanner();
        if (showStageSelectModal) DrawStageSelectModal();
    }

    void DrawHeaderHUD()
    {
        int w = Screen.width;
        int h = Screen.height;

        // Top Status Header
        GUI.Box(new Rect(10, 10, w - 20, 56), GUIContent.none);

        StageDef def = Stages[currentStageIndex];

        GUIStyle stageTitle = new GUIStyle(GUI.skin.label)
        {
            fontSize = 17,
            fontStyle = FontStyle.Bold,
            normal = { textColor = new Color(1f, 0.85f, 0.2f) }
        };

        GUIStyle subTitle = new GUIStyle(GUI.skin.label)
        {
            fontSize = 12,
            normal = { textColor = Color.white }
        };

        GUI.Label(new Rect(20, 12, 400, 24), "Stage " + (currentStageIndex + 1) + ". " + def.bossNameKo + " (" + def.titleKo + ")", stageTitle);
        GUI.Label(new Rect(20, 34, 450, 22), "💰 보유: " + playerCoins + "G | 🎯 목표 월세: " + def.rentDue + "G | ⏳ 남은 스핀: " + spinsRemaining + "회 | 🃏 덱: " + playerDeck.Count + "장", subTitle);

        if (GUI.Button(new Rect(w - 180, 15, 75, 42), "🗺️ 스테이지"))
        {
            showStageSelectModal = !showStageSelectModal;
        }

        if (GUI.Button(new Rect(w - 95, 15, 75, 42), "🔄 재시작"))
        {
            InitStage(currentStageIndex);
        }

        // Bottom Controls Bar
        int barH = 65;
        GUI.Box(new Rect(10, h - barH - 10, w - 20, barH), GUIContent.none);

        GUIStyle logStyle = new GUIStyle(GUI.skin.label)
        {
            fontSize = 13,
            normal = { textColor = new Color(0.9f, 0.95f, 1f) }
        };
        GUI.Label(new Rect(20, h - barH - 4, w - 200, 26), lastActionLog, logStyle);

        GUIStyle quoteStyle = new GUIStyle(GUI.skin.label)
        {
            fontSize = 11,
            normal = { textColor = new Color(1f, 0.7f, 0.5f) }
        };
        GUI.Label(new Rect(20, h - barH + 20, w - 200, 20), def.quoteKo, quoteStyle);

        // Spin Button
        GUI.enabled = (!isSpinning && !isDrafting && spinsRemaining > 0 && !isGameOver && !isVictory);
        Color oldCol = GUI.backgroundColor;
        GUI.backgroundColor = new Color(1f, 0.75f, 0.2f);
        if (GUI.Button(new Rect(w - 160, h - barH - 2, 140, 52), "🎰 스핀 (SPIN)"))
        {
            TriggerSpin();
        }
        GUI.backgroundColor = oldCol;
        GUI.enabled = true;
    }

    void DrawSymbolsOverlay()
    {
        if (mainCam == null || isSpinning) return;

        GUIStyle iconStyle = new GUIStyle(GUI.skin.label)
        {
            fontSize = 20,
            alignment = TextAnchor.MiddleCenter
        };

        for (int r = 0; r < GridRows; r++)
        {
            for (int c = 0; c < GridCols; c++)
            {
                Vector3 wpos = slotMeshes[r, c].transform.position;
                Vector3 spos = mainCam.WorldToScreenPoint(wpos);
                if (spos.z > 0)
                {
                    SymbolSpec spec = SymbolCatalog[(int)gridSymbols[r, c]];
                    GUI.Label(new Rect(spos.x - 25, Screen.height - spos.y - 25, 50, 50), spec.icon, iconStyle);
                }
            }
        }
    }

    void DrawDraftModal()
    {
        int w = Screen.width;
        int h = Screen.height;

        Rect r = new Rect(w / 2 - 240, h / 2 - 120, 480, 240);
        GUI.Box(r, "🃏 새 심볼 획득 (덱빌딩)");

        GUIStyle cardTitle = new GUIStyle(GUI.skin.label)
        {
            fontSize = 13,
            fontStyle = FontStyle.Bold,
            alignment = TextAnchor.MiddleCenter,
            normal = { textColor = Color.yellow }
        };

        GUIStyle cardDesc = new GUIStyle(GUI.skin.label)
        {
            fontSize = 11,
            alignment = TextAnchor.MiddleCenter,
            wordWrap = true,
            normal = { textColor = Color.white }
        };

        int cardW = 140;
        int cardH = 120;

        for (int i = 0; i < 3; i++)
        {
            SymbolSpec spec = SymbolCatalog[(int)draftChoices[i]];
            Rect cardRect = new Rect(r.x + 20 + i * (cardW + 10), r.y + 40, cardW, cardH);
            GUI.Box(cardRect, GUIContent.none);

            GUI.Label(new Rect(cardRect.x, cardRect.y + 8, cardW, 25), spec.icon + " " + spec.nameKo, cardTitle);
            GUI.Label(new Rect(cardRect.x + 5, cardRect.y + 32, cardW - 10, 50), spec.effectKo, cardDesc);

            if (GUI.Button(new Rect(cardRect.x + 15, cardRect.y + 85, cardW - 30, 28), "선택"))
            {
                SelectDraft(i);
            }
        }

        // Skip Button
        if (GUI.Button(new Rect(r.x + 180, r.y + 185, 120, 36), "스킵 (Skip)"))
        {
            SelectDraft(-1);
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
        GUI.Label(new Rect(r.x, r.y + 15, r.width, 35), "월세를 내지 못해 파산했습니다!", title);

        if (GUI.Button(new Rect(r.x + 90, r.y + 85, 180, 45), "현재 스테이지 재도전"))
        {
            InitStage(currentStageIndex);
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

        GUI.Label(new Rect(r.x, r.y + 15, r.width, 35), "★ ALL STAGES CLEAR! ★", title);
        GUI.Label(new Rect(r.x, r.y + 55, r.width, 25), "탐욕의 악마 마몬의 1800G 빚을 모두 갚고 카지노를 정복했습니다!", sub);

        if (GUI.Button(new Rect(r.x + 130, r.y + 105, 180, 45), "새로운 카지노 런 시작"))
        {
            playerCoins = 10;
            InitStage(0);
        }
    }

    void DrawStageSelectModal()
    {
        int w = Screen.width;
        int h = Screen.height;

        GUI.Box(new Rect(30, 70, w - 60, h - 140), "🗺️ 스테이지 선택 (Stage Select: Stage 1 ~ 10)");

        int cols = 2;
        int itemW = (w - 110) / cols;
        int itemH = 50;

        for (int i = 0; i < Stages.Length; i++)
        {
            int row = i / cols;
            int col = i % cols;
            Rect btnRect = new Rect(45 + col * (itemW + 10), 105 + row * (itemH + 8), itemW, itemH);

            StageDef s = Stages[i];
            string text = "Stage " + s.stage + ". " + s.bossNameKo + " [월세 " + s.rentDue + "G] (" + s.titleKo + ")";

            if (GUI.Button(btnRect, text))
            {
                showStageSelectModal = false;
                InitStage(i);
            }
        }
    }
}
