using System.Collections.Generic;
using UnityEngine;

public sealed class DarkestTorchPlayer : MonoBehaviour
{
    sealed class Hero
    {
        public string Name;
        public string Role;
        public int Hp;
        public int MaxHp;
        public int Stress;
        public bool Virtuous;
        public bool Afflicted;
        public GameObject Root;
        public float LungeOffset;
    }

    sealed class Enemy
    {
        public string Name;
        public int Hp;
        public int MaxHp;
        public int Blight;
        public bool IsBoss;
        public float X;
        public GameObject Root;
        public float LungeOffset;
        public float HitFlash;
    }

    sealed class Curio
    {
        public float X;
        public bool Opened;
        public GameObject Go;
    }

    sealed class Particle
    {
        public GameObject Go;
        public Vector3 Vel;
        public float Life;
        public float MaxLife;
    }

    Camera _cam;
    Light _torchLight;
    Transform _partyTorchFlame;

    readonly List<Hero> _heroes = new List<Hero>();
    readonly List<Enemy> _enemies = new List<Enemy>();
    readonly List<Curio> _curios = new List<Curio>();
    readonly List<Particle> _particles = new List<Particle>();

    float _partyX;
    float _torch = 100f;
    int _torchesLeft = 5;
    int _gold;
    int _corridor = 1;
    const int BossCorridor = 5;

    bool _inCombat;
    bool _playerTurn = true;
    int _activeHeroIdx;
    float _enemyActTimer;
    float _shakeTimer;
    float _hitStopTimer;
    int _selectedEnemyIdx;

    bool _victory;
    bool _gameOver;
    string _banner = "Hold D / Right Arrow to march deeper! Click Skills or 1-4 in combat.";
    float _bannerTimer = 4.5f;

    Material _stoneMat;
    Material _darkStoneMat;
    Material _flameMat;
    Material _goldMat;
    Material _bloodMat;
    Material _blightMat;
    Material _boneMat;
    Material _bossMat;

    void Start()
    {
        Application.targetFrameRate = 60;
        CreateMaterials();
        SetupCameraAndLight();
        BuildCorridorArchitecture();
        ResetExpedition();
    }

    static Material MakeMat(Color c)
    {
        var shader = Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Standard") ?? Shader.Find("Unlit/Color");
        var m = new Material(shader);
        m.color = c;
        return m;
    }

    void CreateMaterials()
    {
        _stoneMat = MakeMat(new Color(0.20f, 0.21f, 0.24f));
        _darkStoneMat = MakeMat(new Color(0.11f, 0.11f, 0.14f));
        _flameMat = MakeMat(new Color(1.0f, 0.54f, 0.14f));
        _goldMat = MakeMat(new Color(0.95f, 0.78f, 0.22f));
        _bloodMat = MakeMat(new Color(0.84f, 0.14f, 0.16f));
        _blightMat = MakeMat(new Color(0.28f, 0.85f, 0.34f));
        _boneMat = MakeMat(new Color(0.78f, 0.76f, 0.70f));
        _bossMat = MakeMat(new Color(0.56f, 0.16f, 0.62f));
    }

    void SetupCameraAndLight()
    {
        var camGo = new GameObject("Main Camera");
        camGo.tag = "MainCamera";
        _cam = camGo.AddComponent<Camera>();
        _cam.clearFlags = CameraClearFlags.SolidColor;
        _cam.backgroundColor = new Color(0.03f, 0.03f, 0.05f);
        _cam.fieldOfView = 42f;
        camGo.transform.position = new Vector3(0f, 3.6f, -11.5f);
        camGo.transform.rotation = Quaternion.Euler(10f, 0f, 0f);

        var ambientLightGo = new GameObject("CryptAmbient");
        var amb = ambientLightGo.AddComponent<Light>();
        amb.type = LightType.Directional;
        amb.intensity = 0.35f;
        amb.color = new Color(0.35f, 0.42f, 0.62f);
        ambientLightGo.transform.rotation = Quaternion.Euler(45f, 20f, 0f);

        var torchGo = new GameObject("PartyTorchLight");
        _torchLight = torchGo.AddComponent<Light>();
        _torchLight.type = LightType.Point;
        _torchLight.color = new Color(1.0f, 0.62f, 0.24f);
        _torchLight.range = 16f;
        _torchLight.intensity = 6.5f;
    }

    void BuildCorridorArchitecture()
    {
        var floor = GameObject.CreatePrimitive(PrimitiveType.Cube);
        floor.transform.position = new Vector3(45f, -0.5f, 0f);
        floor.transform.localScale = new Vector3(130f, 1f, 6f);
        floor.GetComponent<Renderer>().material = _stoneMat;

        var backWall = GameObject.CreatePrimitive(PrimitiveType.Cube);
        backWall.transform.position = new Vector3(45f, 3.2f, 2.8f);
        backWall.transform.localScale = new Vector3(130f, 7.5f, 0.6f);
        backWall.GetComponent<Renderer>().material = _darkStoneMat;

        // Crypt pillars and wall torches every 7 units
        for (int i = -1; i <= 15; i++)
        {
            float px = i * 7f;
            var pillar = GameObject.CreatePrimitive(PrimitiveType.Cube);
            pillar.transform.position = new Vector3(px, 3.0f, 2.3f);
            pillar.transform.localScale = new Vector3(0.9f, 6.5f, 0.8f);
            pillar.GetComponent<Renderer>().material = _stoneMat;

            var sconce = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            sconce.transform.position = new Vector3(px, 3.3f, 1.8f);
            sconce.transform.localScale = Vector3.one * 0.32f;
            sconce.GetComponent<Renderer>().material = _flameMat;
        }
    }

    void ResetExpedition()
    {
        for (int i = 0; i < _heroes.Count; i++) Destroy(_heroes[i].Root);
        for (int i = 0; i < _enemies.Count; i++) Destroy(_enemies[i].Root);
        for (int i = 0; i < _curios.Count; i++) Destroy(_curios[i].Go);
        _heroes.Clear();
        _enemies.Clear();
        _curios.Clear();

        _partyX = 0f;
        _torch = 100f;
        _torchesLeft = 5;
        _gold = 0;
        _corridor = 1;
        _inCombat = false;
        _playerTurn = true;
        _activeHeroIdx = 0;
        _victory = false;
        _gameOver = false;

        // 4 Heroes: Vestal (Rank 4, left), Plague (Rank 3), Highwayman (Rank 2), Crusader (Rank 1, right)
        Color[] heroColors =
        {
            new Color(0.86f, 0.72f, 0.24f), // Crusader front
            new Color(0.45f, 0.48f, 0.65f), // Highwayman
            new Color(0.22f, 0.68f, 0.46f), // Plague Doctor
            new Color(0.88f, 0.42f, 0.56f)  // Vestal back
        };
        string[] names = { "Crusader", "Highwayman", "Plague Doc", "Vestal" };
        string[] roles = { "Smite", "Pistol", "Blight", "Heal" };
        int[] maxHps = { 34, 26, 22, 24 };

        for (int i = 0; i < 4; i++)
        {
            var root = new GameObject(names[i]);
            var body = GameObject.CreatePrimitive(PrimitiveType.Cube);
            body.transform.SetParent(root.transform, false);
            body.transform.localPosition = new Vector3(0f, 0.9f, 0f);
            body.transform.localScale = new Vector3(0.85f, 1.6f, 0.7f);
            body.GetComponent<Renderer>().material = MakeMat(heroColors[i]);

            var head = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            head.transform.SetParent(root.transform, false);
            head.transform.localPosition = new Vector3(0f, 1.95f, 0f);
            head.transform.localScale = Vector3.one * 0.55f;
            head.GetComponent<Renderer>().material = _boneMat;

            if (i == 0)
            {
                var flame = GameObject.CreatePrimitive(PrimitiveType.Sphere);
                flame.transform.SetParent(root.transform, false);
                flame.transform.localPosition = new Vector3(0.55f, 1.65f, 0f);
                flame.transform.localScale = Vector3.one * 0.38f;
                flame.GetComponent<Renderer>().material = _flameMat;
                _partyTorchFlame = flame.transform;
            }

            _heroes.Add(new Hero
            {
                Name = names[i],
                Role = roles[i],
                Hp = maxHps[i],
                MaxHp = maxHps[i],
                Root = root
            });
        }

        // Spawn curios & ambush waves along corridor X = 12, 26, 40, 54, 70 (Boss)
        float[] chestXs = { 8f, 20f, 34f, 48f, 62f };
        for (int i = 0; i < chestXs.Length; i++)
        {
            var chest = GameObject.CreatePrimitive(PrimitiveType.Cube);
            chest.transform.position = new Vector3(chestXs[i], 0.45f, 0.8f);
            chest.transform.localScale = new Vector3(1.1f, 0.8f, 0.85f);
            chest.GetComponent<Renderer>().material = _goldMat;
            _curios.Add(new Curio { X = chestXs[i], Go = chest });
        }

        SetBanner("March forward (D / →) through the crypt! Open golden chests with Space.");
    }

    void SpawnEncounter(int corridorNum)
    {
        _inCombat = true;
        _playerTurn = true;
        _activeHeroIdx = 0;
        _selectedEnemyIdx = 0;
        bool isBoss = corridorNum >= BossCorridor;
        int count = isBoss ? 3 : (2 + (corridorNum % 2));

        for (int i = 0; i < count; i++)
        {
            bool makeBoss = isBoss && i == 1;
            var root = new GameObject(makeBoss ? "NecromancerLord" : "Skeleton");
            float ex = _partyX + 5.2f + i * 1.85f;
            root.transform.position = new Vector3(ex, 0f, 0f);

            var body = GameObject.CreatePrimitive(PrimitiveType.Cube);
            body.transform.SetParent(root.transform, false);
            body.transform.localPosition = new Vector3(0f, makeBoss ? 1.25f : 0.9f, 0f);
            body.transform.localScale = makeBoss ? new Vector3(1.25f, 2.3f, 0.95f) : new Vector3(0.8f, 1.55f, 0.7f);
            body.GetComponent<Renderer>().material = makeBoss ? _bossMat : _boneMat;

            _enemies.Add(new Enemy
            {
                Name = makeBoss ? "Necromancer Lord" : (i % 2 == 0 ? "Bone Soldier" : "Cultist"),
                Hp = makeBoss ? 58 : (14 + corridorNum * 3),
                MaxHp = makeBoss ? 58 : (14 + corridorNum * 3),
                IsBoss = makeBoss,
                X = ex,
                Root = root
            });
        }
        SetBanner(isBoss ? "THE NECROMANCER LORD APPEARS!" : $"Ambush in Corridor {corridorNum}!");
    }

    void SetBanner(string msg)
    {
        _banner = msg;
        _bannerTimer = 3.2f;
    }

    void Update()
    {
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        if (_bannerTimer > 0f) _bannerTimer -= dt;
        _shakeTimer = Mathf.Max(0f, _shakeTimer - dt);

        if (_hitStopTimer > 0f)
        {
            _hitStopTimer -= dt;
            UpdateParticles(dt);
            return;
        }

        if (_victory || _gameOver)
        {
            if (Input.GetKeyDown(KeyCode.R)) ResetExpedition();
            return;
        }

        if (Input.GetKeyDown(KeyCode.T)) RelightTorch();

        if (!_inCombat)
        {
            HandleExploration(dt);
        }
        else
        {
            HandleCombatInput(dt);
        }

        UpdatePositionsAndTorch(dt);
        UpdateParticles(dt);
        UpdateCamera(dt);
    }

    void RelightTorch()
    {
        if (_torchesLeft <= 0)
        {
            SetBanner("No torches left in pack!");
            return;
        }
        _torchesLeft--;
        _torch = Mathf.Min(100f, _torch + 32f);
        SpawnBurst(_partyX + 0.5f, 1.8f, _flameMat, 10);
        SetBanner("Torch reignited! +32 Torchlight");
    }

    void HandleExploration(float dt)
    {
        float move = 0f;
        if (Input.GetKey(KeyCode.D) || Input.GetKey(KeyCode.RightArrow)) move += 1f;
        if (Input.GetKey(KeyCode.A) || Input.GetKey(KeyCode.LeftArrow)) move -= 0.7f;

        if (Mathf.Abs(move) > 0.01f)
        {
            _partyX = Mathf.Max(0f, _partyX + move * 5.2f * dt);
            _torch = Mathf.Max(0f, _torch - 2.6f * dt);

            // Ambient torch stress in pitch darkness
            if (_torch < 20f && Time.frameCount % 60 == 0)
            {
                for (int i = 0; i < _heroes.Count; i++)
                {
                    if (_heroes[i].Hp > 0) AddStress(_heroes[i], 3);
                }
            }
        }

        // Loot curios nearby
        if (Input.GetKeyDown(KeyCode.Space) || Input.GetKeyDown(KeyCode.E))
        {
            for (int i = 0; i < _curios.Count; i++)
            {
                if (!_curios[i].Opened && Mathf.Abs(_curios[i].X - _partyX) < 3.2f)
                {
                    _curios[i].Opened = true;
                    _curios[i].Go.transform.localScale = new Vector3(1.1f, 0.35f, 0.85f);
                    _gold += 120;
                    _torchesLeft++;
                    SpawnBurst(_curios[i].X, 0.8f, _goldMat, 12);
                    SetBanner("Looted Chest: +120 Gold & +1 Torch!");
                    break;
                }
            }
        }

        // Trigger corridor combat wave
        float nextWaveX = _corridor * 14f;
        if (_partyX >= nextWaveX)
        {
            SpawnEncounter(_corridor);
        }
    }

    void HandleCombatInput(float dt)
    {
        if (!_playerTurn)
        {
            _enemyActTimer -= dt;
            if (_enemyActTimer <= 0f)
            {
                ExecuteEnemyRound();
            }
            return;
        }

        // Target cycling
        if (Input.GetKeyDown(KeyCode.Tab) && _enemies.Count > 0)
        {
            _selectedEnemyIdx = (_selectedEnemyIdx + 1) % _enemies.Count;
        }
        if (Input.GetKeyDown(KeyCode.Alpha1)) ExecuteHeroSkill(0);
        if (Input.GetKeyDown(KeyCode.Alpha2)) ExecuteHeroSkill(1);
        if (Input.GetKeyDown(KeyCode.Alpha3)) ExecuteHeroSkill(2);
        if (Input.GetKeyDown(KeyCode.Alpha4)) ExecuteHeroSkill(3);
    }

    void ExecuteHeroSkill(int skillSlot)
    {
        if (!_playerTurn || _enemies.Count == 0) return;

        // Skip dead heroes
        while (_activeHeroIdx < _heroes.Count && _heroes[_activeHeroIdx].Hp <= 0) _activeHeroIdx++;
        if (_activeHeroIdx >= _heroes.Count)
        {
            BeginEnemyTurn();
            return;
        }

        var actor = _heroes[_activeHeroIdx];
        actor.LungeOffset = 0.85f;
        int dmgBonus = actor.Virtuous ? 4 : (actor.Afflicted ? -2 : 0);

        if (skillSlot == 3)
        {
            // Divine Comfort (heal party + relieve stress)
            for (int i = 0; i < _heroes.Count; i++)
            {
                if (_heroes[i].Hp > 0)
                {
                    _heroes[i].Hp = Mathf.Min(_heroes[i].MaxHp, _heroes[i].Hp + 6);
                    _heroes[i].Stress = Mathf.Max(0, _heroes[i].Stress - 8);
                }
            }
            SpawnBurst(_partyX - 1.5f, 1.6f, _goldMat, 10);
            SetBanner($"{actor.Name} casts Divine Comfort (+6 HP, -8 Stress)!");
        }
        else if (skillSlot == 2)
        {
            // Plague Grenade hits up to 2 enemies + blight
            int hitCount = Mathf.Min(2, _enemies.Count);
            for (int i = _enemies.Count - 1; i >= _enemies.Count - hitCount; i--)
            {
                var target = _enemies[i];
                int dmg = Mathf.Max(3, 5 + dmgBonus);
                target.Hp -= dmg;
                target.Blight += 4;
                target.HitFlash = 0.2f;
                SpawnBurst(target.X, 1.3f, _blightMat, 8);
            }
            CleanupDeadEnemies();
            SetBanner($"{actor.Name} hurled Plague Grenade!");
        }
        else
        {
            // Single target Smite / Pistol Shot
            _selectedEnemyIdx = Mathf.Clamp(_selectedEnemyIdx, 0, _enemies.Count - 1);
            var target = _enemies[_selectedEnemyIdx];
            int baseDmg = (skillSlot == 0 ? 11 : 9) + dmgBonus + (_torch > 70f ? 2 : 0);
            target.Hp -= baseDmg;
            target.HitFlash = 0.25f;
            _hitStopTimer = 0.05f;
            _shakeTimer = 0.14f;
            SpawnBurst(target.X, 1.2f, _bloodMat, 12);
            CleanupDeadEnemies();
            SetBanner($"{actor.Name} struck for {baseDmg} DMG!");
        }

        if (_enemies.Count == 0)
        {
            _inCombat = false;
            _gold += 80 * _corridor;
            if (_corridor >= BossCorridor)
            {
                _victory = true;
                SetBanner("VICTORY! The Necromancer Lord has fallen!");
            }
            else
            {
                _corridor++;
                SetBanner($"Wave Cleared! +Gold. March forward to Corridor {_corridor}!");
            }
            return;
        }

        _activeHeroIdx++;
        while (_activeHeroIdx < _heroes.Count && _heroes[_activeHeroIdx].Hp <= 0) _activeHeroIdx++;
        if (_activeHeroIdx >= _heroes.Count)
        {
            BeginEnemyTurn();
        }
    }

    void CleanupDeadEnemies()
    {
        for (int i = _enemies.Count - 1; i >= 0; i--)
        {
            if (_enemies[i].Hp <= 0)
            {
                SpawnBurst(_enemies[i].X, 1.2f, _boneMat, 14);
                Destroy(_enemies[i].Root);
                _enemies.RemoveAt(i);
            }
        }
        _selectedEnemyIdx = Mathf.Clamp(_selectedEnemyIdx, 0, Mathf.Max(0, _enemies.Count - 1));
    }

    void BeginEnemyTurn()
    {
        _playerTurn = false;
        _enemyActTimer = 0.55f;
    }

    void ExecuteEnemyRound()
    {
        // Tick blight & attacks
        for (int i = _enemies.Count - 1; i >= 0; i--)
        {
            var e = _enemies[i];
            if (e.Blight > 0)
            {
                e.Hp -= e.Blight;
                e.Blight = Mathf.Max(0, e.Blight - 1);
                SpawnBurst(e.X, 1.3f, _blightMat, 4);
            }
        }
        CleanupDeadEnemies();

        if (_enemies.Count == 0)
        {
            _inCombat = false;
            if (_corridor >= BossCorridor) _victory = true;
            else _corridor++;
            return;
        }

        for (int i = 0; i < _enemies.Count; i++)
        {
            var e = _enemies[i];
            e.LungeOffset = -0.8f;
            var alive = new List<Hero>();
            for (int h = 0; h < _heroes.Count; h++) if (_heroes[h].Hp > 0) alive.Add(_heroes[h]);
            if (alive.Count == 0) break;

            var target = alive[Random.Range(0, Mathf.Min(2, alive.Count))];
            int dmg = e.IsBoss ? 9 : 6;
            int stressDmg = (_torch < 35f ? 12 : 7) + (e.IsBoss ? 6 : 0);
            target.Hp = Mathf.Max(0, target.Hp - dmg);
            AddStress(target, stressDmg);
            SpawnBurst(target.Root.transform.position.x, 1.2f, _bloodMat, 6);
            _shakeTimer = 0.16f;
        }

        bool anyAlive = false;
        for (int i = 0; i < _heroes.Count; i++) if (_heroes[i].Hp > 0) anyAlive = true;
        if (!anyAlive)
        {
            _gameOver = true;
            return;
        }

        _playerTurn = true;
        _activeHeroIdx = 0;
        while (_activeHeroIdx < _heroes.Count && _heroes[_activeHeroIdx].Hp <= 0) _activeHeroIdx++;
    }

    void AddStress(Hero h, int delta)
    {
        h.Stress += delta;
        if (h.Stress >= 100 && !h.Virtuous && !h.Afflicted)
        {
            if (Random.value < 0.35f)
            {
                h.Virtuous = true;
                h.Stress = 45;
                SetBanner($"{h.Name}'s RESOLVE IS VIRTUOUS! (+DMG, Stress halved)");
            }
            else
            {
                h.Afflicted = true;
                SetBanner($"{h.Name} suffers AFFLICTION!");
            }
        }
        if (h.Stress >= 200)
        {
            h.Hp = 0;
            h.Stress = 200;
            SetBanner($"{h.Name} suffered a HEART ATTACK!");
        }
    }

    void UpdatePositionsAndTorch(float dt)
    {
        for (int i = 0; i < _heroes.Count; i++)
        {
            var h = _heroes[i];
            h.LungeOffset = Mathf.Lerp(h.LungeOffset, 0f, dt * 10f);
            float targetX = _partyX - i * 1.45f + h.LungeOffset;
            float aliveScale = h.Hp > 0 ? 1f : 0.25f;
            h.Root.transform.position = new Vector3(targetX, 0f, 0f);
            h.Root.transform.localScale = Vector3.one * aliveScale;
        }

        for (int i = 0; i < _enemies.Count; i++)
        {
            var e = _enemies[i];
            e.LungeOffset = Mathf.Lerp(e.LungeOffset, 0f, dt * 10f);
            e.HitFlash = Mathf.Max(0f, e.HitFlash - dt);
            e.Root.transform.position = new Vector3(e.X + e.LungeOffset, 0f, 0f);
        }

        float tRatio = Mathf.Clamp01(_torch / 100f);
        float flicker = 0.9f + Mathf.Sin(Time.time * 14f) * 0.12f;
        _torchLight.transform.position = new Vector3(_partyX + 0.6f, 2.4f, -1.2f);
        _torchLight.range = Mathf.Lerp(6f, 22f, tRatio) * flicker;
        _torchLight.intensity = Mathf.Lerp(1.8f, 8.5f, tRatio) * flicker;
        if (_partyTorchFlame != null)
        {
            _partyTorchFlame.localScale = Vector3.one * Mathf.Lerp(0.15f, 0.45f, tRatio) * flicker;
        }
    }

    void SpawnBurst(float x, float y, Material mat, int count)
    {
        for (int i = 0; i < count; i++)
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
            go.transform.position = new Vector3(x, y, Random.Range(-0.3f, 0.3f));
            go.transform.localScale = Vector3.one * Random.Range(0.12f, 0.24f);
            go.GetComponent<Renderer>().material = mat;
            _particles.Add(new Particle
            {
                Go = go,
                Vel = new Vector3(Random.Range(-3.2f, 3.2f), Random.Range(1.2f, 4.5f), Random.Range(-1.5f, 1.5f)),
                Life = 0.45f,
                MaxLife = 0.45f
            });
        }
    }

    void UpdateParticles(float dt)
    {
        for (int i = _particles.Count - 1; i >= 0; i--)
        {
            var p = _particles[i];
            p.Life -= dt;
            p.Vel.y -= 9.5f * dt;
            p.Go.transform.position += p.Vel * dt;
            if (p.Life <= 0f)
            {
                Destroy(p.Go);
                _particles.RemoveAt(i);
            }
            else
            {
                _particles[i] = p;
            }
        }
    }

    void UpdateCamera(float dt)
    {
        float focusX = _inCombat ? _partyX + 3.2f : _partyX + 1.2f;
        Vector3 desired = new Vector3(focusX, 3.4f, -11.2f);
        if (_shakeTimer > 0f) desired += Random.insideUnitSphere * 0.25f;
        _cam.transform.position = Vector3.Lerp(_cam.transform.position, desired, dt * 5f);
    }

    void OnGUI()
    {
        var bold = new GUIStyle(GUI.skin.box) { fontSize = 14, fontStyle = FontStyle.Bold };
        GUI.Box(new Rect(14, 12, Screen.width - 28, 56), "");
        GUI.Label(new Rect(26, 18, 600, 24),
            $"DARKEST TORCH UNITY  |  CORRIDOR {_corridor}/{BossCorridor}  |  TORCH: {Mathf.RoundToInt(_torch)}/100  |  GOLD: {_gold}", bold);
        GUI.Label(new Rect(26, 40, 620, 20),
            _inCombat ? (_playerTurn ? $"COMBAT: {_heroes[Mathf.Clamp(_activeHeroIdx, 0, 3)].Name}'s Turn — Press 1-4 or Click Skill" : "ENEMIES ACTING...") : "EXPLORATION: Hold D/→ to March • Space to Loot Chest • T to Light Torch");

        if (GUI.Button(new Rect(Screen.width - 175, 18, 148, 36), $"Light Torch (T) [{_torchesLeft}]"))
        {
            RelightTorch();
        }

        // Hero & Enemy Status Strips
        for (int i = 0; i < _heroes.Count; i++)
        {
            var h = _heroes[i];
            float bx = 18 + i * 155;
            string mark = (_inCombat && _playerTurn && i == _activeHeroIdx) ? "▶ " : "";
            GUI.Box(new Rect(bx, Screen.height - 96, 148, 42),
                $"{mark}{h.Name}\nHP {h.Hp}/{h.MaxHp} | St {h.Stress}");
        }

        if (_inCombat && _playerTurn)
        {
            string[] skills = { "1: Smite", "2: Pistol", "3: Blight AoE", "4: Party Heal" };
            for (int s = 0; s < 4; s++)
            {
                if (GUI.Button(new Rect(18 + s * 155, Screen.height - 48, 148, 36), skills[s]))
                {
                    ExecuteHeroSkill(s);
                }
            }
            for (int e = 0; e < _enemies.Count; e++)
            {
                var en = _enemies[e];
                string sel = (e == _selectedEnemyIdx) ? " [TARGET]" : "";
                if (GUI.Button(new Rect(Screen.width - 190, 80 + e * 44, 172, 38), $"{en.Name}{sel}\nHP {en.Hp}/{en.MaxHp}"))
                {
                    _selectedEnemyIdx = e;
                }
            }
        }

        if (_bannerTimer > 0f)
        {
            GUI.Box(new Rect(Screen.width * 0.5f - 240, 76, 480, 30), _banner, bold);
        }

        if (_victory || _gameOver)
        {
            GUI.Box(new Rect(Screen.width * 0.5f - 175, Screen.height * 0.5f - 55, 350, 110), "");
            GUI.Label(new Rect(Screen.width * 0.5f - 150, Screen.height * 0.5f - 36, 300, 28),
                _victory ? "NECROMANCER VANQUISHED!" : "EXPEDITION LOST TO DARKNESS", bold);
            GUI.Label(new Rect(Screen.width * 0.5f - 150, Screen.height * 0.5f - 8, 300, 24), $"Corridor {_corridor}/{BossCorridor} • Gold Plundered: {_gold}");
            if (GUI.Button(new Rect(Screen.width * 0.5f - 70, Screen.height * 0.5f + 20, 140, 28), "New Expedition (R)"))
            {
                ResetExpedition();
            }
        }
    }
}
