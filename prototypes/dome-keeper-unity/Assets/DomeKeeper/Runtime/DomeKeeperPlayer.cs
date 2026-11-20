using System;
using System.Collections.Generic;
using UnityEngine;

public class DomeKeeperPlayer : MonoBehaviour
{
    enum TileType { Empty = 0, Dirt = 1, Stone = 2, Basalt = 3, IronOre = 4, CobaltOre = 5, WaterOre = 6, Bedrock = 7 }
    enum GameMode { Title, Mining, Defense, GameOver }

    class OreDrop
    {
        public Vector2 pos;
        public Vector2 vel;
        public TileType kind;
        public bool tethered;
        public GameObject go;
    }

    class EnemyUnit
    {
        public Vector2 pos;
        public Vector2 vel;
        public float hp;
        public float maxHp;
        public float speed;
        public float dmg;
        public bool flyer;
        public float atkCd;
        public GameObject go;
    }

    class FxParticle
    {
        public Vector2 pos;
        public Vector2 vel;
        public float life;
        public float maxLife;
        public float size;
        public Color color;
        public GameObject go;
    }

    // Grid dimensions: 25 cols (-12..12), 26 rows (y = 0..-25)
    const int Cols = 25;
    const int HalfCols = 12;
    const int Rows = 26;

    TileType[,] _grid = new TileType[Cols, Rows];
    float[,] _tileHp = new float[Cols, Rows];
    float[,] _tileMaxHp = new float[Cols, Rows];
    SpriteRenderer[,] _tileSr = new SpriteRenderer[Cols, Rows];

    GameMode _mode = GameMode.Title;
    Camera _cam;
    GameObject _worldRoot;
    GameObject _minerGo;
    SpriteRenderer _minerSr;
    GameObject _domeGo;
    SpriteRenderer _domeShieldSr;
    GameObject _turretPivot;
    LineRenderer _laserLine;
    LineRenderer _tetherLine;

    Vector2 _minerPos;
    Vector2 _minerVel;
    float _drillCd;
    float _shakeTrauma;

    int _iron = 4;
    int _cobalt = 2;
    int _water = 1;
    int _domeHp = 100;
    int _domeMaxHp = 100;
    int _wave = 1;
    float _waveTimer = 28f;
    int _enemiesRemainingToSpawn;
    float _spawnCd;
    int _score;
    int _oresDelivered;

    int _drillLv = 1;
    int _jetLv = 1;
    int _laserLv = 1;
    int _armorLv = 1;

    float _turretAngleDeg = 90f;
    bool _laserFiring;

    readonly List<OreDrop> _ores = new List<OreDrop>();
    readonly List<EnemyUnit> _enemies = new List<EnemyUnit>();
    readonly List<FxParticle> _fx = new List<FxParticle>();

    Sprite _sqSprite;
    Sprite _circleSprite;
    Sprite _domeSprite;

    AudioSource _sfx;
    AudioClip _clipDrill;
    AudioClip _clipPickup;
    AudioClip _clipDeposit;
    AudioClip _clipLaser;
    AudioClip _clipHit;
    AudioClip _clipWave;
    float _laserSfxCd;

    GUIStyle _hudStyle;
    GUIStyle _titleStyle;
    GUIStyle _btnStyle;
    GUIStyle _subStyle;

    void Start()
    {
        Application.targetFrameRate = 60;
        _cam = Camera.main;
        if (_cam == null)
        {
            var camGo = new GameObject("Main Camera");
            _cam = camGo.AddComponent<Camera>();
            camGo.tag = "MainCamera";
        }
        _cam.orthographic = true;
        _cam.orthographicSize = 7.2f;
        _cam.backgroundColor = new Color(0.035f, 0.055f, 0.095f, 1f);
        _cam.transform.position = new Vector3(0, 1.5f, -10f);

        _sfx = gameObject.AddComponent<AudioSource>();
        _sfx.playOnAwake = false;

        BuildSprites();
        BuildAudioClips();
        BuildStaticScene();
        ResetRun(GameMode.Title);
    }

    void BuildSprites()
    {
        // Solid crisp square with subtle bevel border
        var sqTex = new Texture2D(32, 32, TextureFormat.RGBA32, false);
        sqTex.filterMode = FilterMode.Point;
        for (int y = 0; y < 32; y++)
        for (int x = 0; x < 32; x++)
        {
            bool border = x == 0 || y == 0 || x == 31 || y == 31;
            bool inner = x == 1 || y == 1 || x == 30 || y == 30;
            float shade = border ? 0.65f : inner ? 1.12f : (0.94f + 0.06f * Mathf.Sin(x * 0.4f + y * 0.3f));
            sqTex.SetPixel(x, y, new Color(shade, shade, shade, 1f));
        }
        sqTex.Apply();
        _sqSprite = Sprite.Create(sqTex, new Rect(0, 0, 32, 32), new Vector2(0.5f, 0.5f), 32f);

        // Smooth circle sprite
        var cTex = new Texture2D(32, 32, TextureFormat.RGBA32, false);
        for (int y = 0; y < 32; y++)
        for (int x = 0; x < 32; x++)
        {
            float dx = (x - 15.5f) / 14.5f;
            float dy = (y - 15.5f) / 14.5f;
            float d = Mathf.Sqrt(dx * dx + dy * dy);
            float a = Mathf.Clamp01((1f - d) * 6f);
            float hi = Mathf.Clamp01(1f - Mathf.Sqrt((dx + 0.35f) * (dx + 0.35f) + (dy - 0.35f) * (dy - 0.35f)) * 1.4f);
            cTex.SetPixel(x, y, new Color(1f, 1f, 1f, a) * (0.85f + 0.25f * hi));
        }
        cTex.Apply();
        _circleSprite = Sprite.Create(cTex, new Rect(0, 0, 32, 32), new Vector2(0.5f, 0.5f), 32f);

        // Semi-dome sprite
        var dTex = new Texture2D(64, 32, TextureFormat.RGBA32, false);
        for (int y = 0; y < 32; y++)
        for (int x = 0; x < 64; x++)
        {
            float dx = (x - 31.5f) / 30f;
            float dy = y / 30f;
            float d = Mathf.Sqrt(dx * dx + dy * dy);
            bool rim = d > 0.86f && d <= 1.0f;
            float a = d <= 1.0f ? (rim ? 0.95f : 0.38f) : 0f;
            Color col = rim ? new Color(0.45f, 0.88f, 1f, a) : new Color(0.18f, 0.52f, 0.82f, a);
            dTex.SetPixel(x, y, col);
        }
        dTex.Apply();
        _domeSprite = Sprite.Create(dTex, new Rect(0, 0, 64, 32), new Vector2(0.5f, 0f), 16f);
    }

    AudioClip MakeTone(float freqStart, float freqEnd, float dur, float amp, bool noise = false)
    {
        int sr = 22050;
        int samples = Mathf.Max(1, Mathf.RoundToInt(sr * dur));
        var data = new float[samples];
        float phase = 0f;
        var rng = new System.Random(Mathf.RoundToInt(freqStart * 13 + dur * 1000));
        for (int i = 0; i < samples; i++)
        {
            float t = (float)i / samples;
            float f = Mathf.Lerp(freqStart, freqEnd, t);
            phase += 2f * Mathf.PI * f / sr;
            float env = (1f - t) * (1f - t);
            float s = noise ? ((float)rng.NextDouble() * 2f - 1f) * 0.6f + Mathf.Sin(phase) * 0.4f : Mathf.Sin(phase);
            data[i] = s * env * amp;
        }
        var clip = AudioClip.Create("sfx", samples, 1, sr, false);
        clip.SetData(data, 0);
        return clip;
    }

    void BuildAudioClips()
    {
        _clipDrill = MakeTone(160f, 80f, 0.08f, 0.25f, true);
        _clipPickup = MakeTone(520f, 880f, 0.10f, 0.22f);
        _clipDeposit = MakeTone(440f, 1040f, 0.18f, 0.28f);
        _clipLaser = MakeTone(680f, 340f, 0.07f, 0.16f);
        _clipHit = MakeTone(210f, 70f, 0.14f, 0.28f, true);
        _clipWave = MakeTone(300f, 620f, 0.35f, 0.30f);
    }

    void BuildStaticScene()
    {
        _worldRoot = new GameObject("World");

        // Sky backdrop
        var sky = new GameObject("Sky");
        sky.transform.SetParent(_worldRoot.transform);
        var skySr = sky.AddComponent<SpriteRenderer>();
        skySr.sprite = _sqSprite;
        skySr.color = new Color(0.05f, 0.09f, 0.16f, 1f);
        skySr.sortingOrder = -20;
        sky.transform.position = new Vector3(0, 6.5f, 0);
        sky.transform.localScale = new Vector3(40f, 13f, 1f);

        // Surface ground bar
        var surf = new GameObject("Surface");
        surf.transform.SetParent(_worldRoot.transform);
        var surfSr = surf.AddComponent<SpriteRenderer>();
        surfSr.sprite = _sqSprite;
        surfSr.color = new Color(0.18f, 0.22f, 0.28f, 1f);
        surfSr.sortingOrder = -5;
        surf.transform.position = new Vector3(0, 0.55f, 0);
        surf.transform.localScale = new Vector3(36f, 0.22f, 1f);

        // Dome base
        _domeGo = new GameObject("Dome");
        _domeGo.transform.SetParent(_worldRoot.transform);
        _domeGo.transform.position = new Vector3(0, 0.6f, 0);
        _domeShieldSr = _domeGo.AddComponent<SpriteRenderer>();
        _domeShieldSr.sprite = _domeSprite;
        _domeShieldSr.sortingOrder = 6;

        // Turret barrel pivot
        _turretPivot = new GameObject("TurretPivot");
        _turretPivot.transform.SetParent(_domeGo.transform);
        _turretPivot.transform.localPosition = new Vector3(0, 1.85f, 0);
        var barrel = new GameObject("Barrel");
        barrel.transform.SetParent(_turretPivot.transform);
        barrel.transform.localPosition = new Vector3(0.45f, 0, 0);
        barrel.transform.localScale = new Vector3(0.9f, 0.18f, 1f);
        var bSr = barrel.AddComponent<SpriteRenderer>();
        bSr.sprite = _sqSprite;
        bSr.color = new Color(0.55f, 0.92f, 1f, 1f);
        bSr.sortingOrder = 7;

        // Laser LineRenderer
        var laserGo = new GameObject("DomeLaser");
        laserGo.transform.SetParent(_worldRoot.transform);
        _laserLine = laserGo.AddComponent<LineRenderer>();
        _laserLine.positionCount = 2;
        _laserLine.startWidth = 0.14f;
        _laserLine.endWidth = 0.08f;
        _laserLine.material = new Material(Shader.Find("Sprites/Default"));
        _laserLine.startColor = new Color(0.35f, 0.95f, 1f, 1f);
        _laserLine.endColor = new Color(1f, 0.35f, 0.55f, 1f);
        _laserLine.sortingOrder = 15;
        _laserLine.enabled = false;

        // Tether beam LineRenderer
        var tetherGo = new GameObject("TetherBeam");
        tetherGo.transform.SetParent(_worldRoot.transform);
        _tetherLine = tetherGo.AddComponent<LineRenderer>();
        _tetherLine.positionCount = 2;
        _tetherLine.startWidth = 0.05f;
        _tetherLine.endWidth = 0.03f;
        _tetherLine.material = new Material(Shader.Find("Sprites/Default"));
        _tetherLine.startColor = new Color(0.98f, 0.85f, 0.35f, 0.7f);
        _tetherLine.endColor = new Color(0.35f, 0.9f, 1f, 0.5f);
        _tetherLine.sortingOrder = 8;
        _tetherLine.enabled = false;

        // Miner character
        _minerGo = new GameObject("JetpackMiner");
        _minerGo.transform.SetParent(_worldRoot.transform);
        _minerSr = _minerGo.AddComponent<SpriteRenderer>();
        _minerSr.sprite = _circleSprite;
        _minerSr.color = new Color(0.98f, 0.80f, 0.25f, 1f);
        _minerSr.sortingOrder = 10;
        _minerGo.transform.localScale = new Vector3(0.7f, 0.7f, 1f);

        var visor = new GameObject("Visor");
        visor.transform.SetParent(_minerGo.transform);
        visor.transform.localPosition = new Vector3(0, 0.08f, 0);
        visor.transform.localScale = new Vector3(0.55f, 0.35f, 1f);
        var vSr = visor.AddComponent<SpriteRenderer>();
        vSr.sprite = _sqSprite;
        vSr.color = new Color(0.22f, 0.92f, 1f, 1f);
        vSr.sortingOrder = 11;

        // Underground tiles pool
        for (int x = 0; x < Cols; x++)
        {
            for (int y = 0; y < Rows; y++)
            {
                var tileGo = new GameObject($"T_{x}_{y}");
                tileGo.transform.SetParent(_worldRoot.transform);
                tileGo.transform.position = new Vector3(x - HalfCols, -y, 0);
                tileGo.transform.localScale = new Vector3(0.96f, 0.96f, 1f);
                var sr = tileGo.AddComponent<SpriteRenderer>();
                sr.sprite = _sqSprite;
                sr.sortingOrder = 1;
                _tileSr[x, y] = sr;
            }
        }
    }

    void ResetRun(GameMode initialMode)
    {
        foreach (var o in _ores) if (o.go != null) Destroy(o.go);
        foreach (var e in _enemies) if (e.go != null) Destroy(e.go);
        foreach (var f in _fx) if (f.go != null) Destroy(f.go);
        _ores.Clear();
        _enemies.Clear();
        _fx.Clear();

        _mode = initialMode;
        _iron = 4;
        _cobalt = 2;
        _water = 1;
        _domeHp = 100;
        _domeMaxHp = 100;
        _wave = 1;
        _waveTimer = 28f;
        _enemiesRemainingToSpawn = 0;
        _score = 0;
        _oresDelivered = 0;
        _drillLv = 1;
        _jetLv = 1;
        _laserLv = 1;
        _armorLv = 1;
        _minerPos = new Vector2(0, 0.2f);
        _minerVel = Vector2.zero;
        _laserLine.enabled = false;
        _tetherLine.enabled = false;

        var rng = new System.Random((int)(DateTime.UtcNow.Ticks & 0x7FFFFFFF));
        for (int x = 0; x < Cols; x++)
        {
            for (int y = 0; y < Rows; y++)
            {
                // Central vertical shaft down to y = 3
                if (x == HalfCols && y <= 3)
                {
                    _grid[x, y] = TileType.Empty;
                    _tileHp[x, y] = 0;
                }
                else if (y == Rows - 1 || x == 0 || x == Cols - 1)
                {
                    _grid[x, y] = TileType.Bedrock;
                    _tileHp[x, y] = 999f;
                }
                else
                {
                    double roll = rng.NextDouble();
                    TileType t;
                    float hp;
                    if (y < 7)
                    {
                        t = roll < 0.14 ? TileType.IronOre : TileType.Dirt;
                        hp = t == TileType.IronOre ? 2.4f : 1.0f;
                    }
                    else if (y < 16)
                    {
                        t = roll < 0.11 ? TileType.IronOre : roll < 0.18 ? TileType.WaterOre : roll < 0.24 ? TileType.CobaltOre : TileType.Stone;
                        hp = t == TileType.Stone ? 2.2f : 3.2f;
                    }
                    else
                    {
                        t = roll < 0.16 ? TileType.CobaltOre : roll < 0.26 ? TileType.IronOre : roll < 0.34 ? TileType.WaterOre : TileType.Basalt;
                        hp = t == TileType.Basalt ? 4.0f : 4.8f;
                    }
                    _grid[x, y] = t;
                    _tileHp[x, y] = hp;
                }
                _tileMaxHp[x, y] = _tileHp[x, y];
                RefreshTileVisual(x, y);
            }
        }
    }

    void RefreshTileVisual(int x, int y)
    {
        var t = _grid[x, y];
        var sr = _tileSr[x, y];
        if (t == TileType.Empty)
        {
            sr.enabled = false;
            return;
        }
        sr.enabled = true;
        Color baseCol = t switch
        {
            TileType.Dirt => new Color(0.45f, 0.31f, 0.20f, 1f),
            TileType.Stone => new Color(0.35f, 0.39f, 0.45f, 1f),
            TileType.Basalt => new Color(0.20f, 0.22f, 0.29f, 1f),
            TileType.IronOre => new Color(0.90f, 0.65f, 0.25f, 1f),
            TileType.CobaltOre => new Color(0.24f, 0.72f, 0.98f, 1f),
            TileType.WaterOre => new Color(0.22f, 0.92f, 0.80f, 1f),
            _ => new Color(0.11f, 0.12f, 0.16f, 1f)
        };
        float dmgRatio = _tileMaxHp[x, y] > 0 ? Mathf.Clamp01(_tileHp[x, y] / _tileMaxHp[x, y]) : 1f;
        sr.color = baseCol * (0.45f + 0.55f * dmgRatio);
    }

    void Update()
    {
        float dt = Mathf.Min(0.05f, Time.deltaTime);
        UpdateParticles(dt);

        if (_mode == GameMode.Title || _mode == GameMode.GameOver)
        {
            if (Input.GetKeyDown(KeyCode.Space) || Input.GetKeyDown(KeyCode.Return))
            {
                ResetRun(GameMode.Mining);
            }
            UpdateCamera(dt);
            return;
        }

        HandleUpgradeHotkeys();

        if (_mode == GameMode.Mining)
        {
            UpdateMining(dt);
            _waveTimer -= dt;
            if (_waveTimer <= 0f)
            {
                StartDefenseWave();
            }
        }
        else if (_mode == GameMode.Defense)
        {
            UpdateDefense(dt);
        }

        // Toggle between Defense turret and Mining when on surface
        if (_mode == GameMode.Mining && _minerPos.y >= -0.2f && Input.GetKeyDown(KeyCode.E) && _enemies.Count > 0)
        {
            _mode = GameMode.Defense;
        }

        UpdateOres(dt);
        UpdateCamera(dt);
    }

    void HandleUpgradeHotkeys()
    {
        if (Input.GetKeyDown(KeyCode.Alpha1)) TryUpgrade(0);
        if (Input.GetKeyDown(KeyCode.Alpha2)) TryUpgrade(1);
        if (Input.GetKeyDown(KeyCode.Alpha3)) TryUpgrade(2);
        if (Input.GetKeyDown(KeyCode.Alpha4)) TryUpgrade(3);
    }

    void TryUpgrade(int idx)
    {
        if (idx == 0 && _iron >= _drillLv * 3)
        {
            _iron -= _drillLv * 3;
            _drillLv++;
            _sfx.PlayOneShot(_clipDeposit);
        }
        else if (idx == 1 && _iron >= _jetLv * 2 && _water >= 1)
        {
            _iron -= _jetLv * 2;
            _water -= 1;
            _jetLv++;
            _sfx.PlayOneShot(_clipDeposit);
        }
        else if (idx == 2 && _cobalt >= _laserLv * 2)
        {
            _cobalt -= _laserLv * 2;
            _laserLv++;
            _sfx.PlayOneShot(_clipDeposit);
        }
        else if (idx == 3 && _iron >= 2 && _cobalt >= 1)
        {
            _iron -= 2;
            _cobalt -= 1;
            _armorLv++;
            _domeMaxHp += 25;
            _domeHp = Mathf.Min(_domeMaxHp, _domeHp + 35);
            _sfx.PlayOneShot(_clipDeposit);
        }
    }

    void UpdateMining(float dt)
    {
        float ix = Input.GetAxisRaw("Horizontal");
        float iy = Input.GetAxisRaw("Vertical");

        // Also support click/drag steering toward pointer when holding mouse button
        if (Input.GetMouseButton(0) && GUIUtility.hotControl == 0 && Input.mousePosition.y > 72f)
        {
            Vector3 wp = _cam.ScreenToWorldPoint(Input.mousePosition);
            Vector2 dir = new Vector2(wp.x - _minerPos.x, wp.y - _minerPos.y);
            if (dir.magnitude > 0.35f)
            {
                dir.Normalize();
                ix = dir.x;
                iy = dir.y;
            }
        }

        float tetherCount = 0;
        foreach (var o in _ores) if (o.tethered) tetherCount++;
        float weightMult = Mathf.Max(0.55f, 1f - tetherCount * 0.07f);
        float thrust = (12f + _jetLv * 2.2f) * weightMult;

        _minerVel += new Vector2(ix * thrust, iy * thrust - 3.5f) * dt;
        _minerVel *= Mathf.Pow(0.06f, dt);

        if (Mathf.Abs(ix) > 0.1f || iy > 0.1f)
        {
            if (UnityEngine.Random.value < 0.45f)
            {
                SpawnFx(_minerPos + new Vector2(0, -0.3f), new Vector2(-ix * 1.2f + UnityEngine.Random.Range(-0.5f, 0.5f), -2.2f), 0.22f, 0.18f, new Color(0.45f, 0.92f, 1f, 0.85f));
            }
        }

        Vector2 next = _minerPos + _minerVel * dt;
        next.x = Mathf.Clamp(next.x, -HalfCols + 1f, HalfCols - 1f);
        next.y = Mathf.Clamp(next.y, -(Rows - 2f), 1.4f);

        // Collision & auto-drilling into adjacent tile
        int gx = Mathf.Clamp(Mathf.RoundToInt(next.x + HalfCols), 0, Cols - 1);
        int gy = Mathf.Clamp(Mathf.RoundToInt(-next.y), 0, Rows - 1);

        if (next.y <= 0.3f && _grid[gx, gy] != TileType.Empty)
        {
            if (_grid[gx, gy] != TileType.Bedrock)
            {
                _drillCd -= dt;
                if (_drillCd <= 0f)
                {
                    _drillCd = 0.08f;
                    float drillDmg = (1.1f + _drillLv * 0.75f) * 0.22f;
                    _tileHp[gx, gy] -= drillDmg;
                    _shakeTrauma = Mathf.Max(_shakeTrauma, 0.10f);
                    _sfx.PlayOneShot(_clipDrill);
                    SpawnFx(new Vector2(gx - HalfCols, -gy), UnityEngine.Random.insideUnitCircle * 2.4f, 0.25f, 0.15f, new Color(0.95f, 0.8f, 0.45f, 1f));
                    if (_tileHp[gx, gy] <= 0f)
                    {
                        var broken = _grid[gx, gy];
                        _grid[gx, gy] = TileType.Empty;
                        _score += 10;
                        if (broken == TileType.IronOre || broken == TileType.CobaltOre || broken == TileType.WaterOre)
                        {
                            SpawnOre(new Vector2(gx - HalfCols, -gy), broken);
                        }
                    }
                    RefreshTileVisual(gx, gy);
                }
            }
            _minerVel *= 0.2f;
        }
        else
        {
            _minerPos = next;
        }

        _minerGo.transform.position = _minerPos;
    }

    void SpawnOre(Vector2 pos, TileType kind)
    {
        var go = new GameObject("Ore");
        go.transform.SetParent(_worldRoot.transform);
        go.transform.position = pos;
        go.transform.localScale = new Vector3(0.42f, 0.42f, 1f);
        var sr = go.AddComponent<SpriteRenderer>();
        sr.sprite = _circleSprite;
        sr.sortingOrder = 9;
        sr.color = kind switch
        {
            TileType.IronOre => new Color(1f, 0.72f, 0.25f, 1f),
            TileType.CobaltOre => new Color(0.28f, 0.78f, 1f, 1f),
            _ => new Color(0.25f, 0.98f, 0.82f, 1f)
        };
        _ores.Add(new OreDrop { pos = pos, vel = UnityEngine.Random.insideUnitCircle * 1.5f, kind = kind, go = go });
    }

    void UpdateOres(float dt)
    {
        bool anyTethered = false;
        Vector2 firstTetherPos = _minerPos;

        for (int i = _ores.Count - 1; i >= 0; i--)
        {
            var o = _ores[i];
            float distToMiner = Vector2.Distance(o.pos, _minerPos);
            if (!o.tethered && distToMiner < 1.35f)
            {
                o.tethered = true;
                _sfx.PlayOneShot(_clipPickup);
            }

            if (o.tethered)
            {
                anyTethered = true;
                firstTetherPos = o.pos;
                Vector2 target = _minerPos + new Vector2(0, -0.45f);
                o.vel = Vector2.Lerp(o.vel, (target - o.pos) * 7.5f, 8f * dt);
                o.pos += o.vel * dt;
            }
            else
            {
                o.vel.y -= 6f * dt;
                Vector2 np = o.pos + o.vel * dt;
                int gx = Mathf.Clamp(Mathf.RoundToInt(np.x + HalfCols), 0, Cols - 1);
                int gy = Mathf.Clamp(Mathf.RoundToInt(-np.y), 0, Rows - 1);
                if (np.y <= 0.2f && _grid[gx, gy] != TileType.Empty)
                {
                    o.vel *= 0.2f;
                }
                else
                {
                    o.pos = np;
                }
            }

            o.go.transform.position = o.pos;

            // Delivered into Dome center shaft!
            if (Mathf.Abs(o.pos.x) < 1.6f && o.pos.y > 0.1f)
            {
                if (o.kind == TileType.IronOre) _iron += 1;
                else if (o.kind == TileType.CobaltOre) _cobalt += 1;
                else _water += 1;
                _oresDelivered++;
                _score += 35;
                _sfx.PlayOneShot(_clipDeposit);
                SpawnFx(o.pos, Vector2.up * 2f, 0.35f, 0.25f, new Color(0.45f, 1f, 0.72f, 1f));
                Destroy(o.go);
                _ores.RemoveAt(i);
            }
        }

        if (anyTethered)
        {
            _tetherLine.enabled = true;
            _tetherLine.SetPosition(0, _minerPos);
            _tetherLine.SetPosition(1, firstTetherPos);
        }
        else
        {
            _tetherLine.enabled = false;
        }
    }

    void StartDefenseWave()
    {
        _mode = GameMode.Defense;
        _minerPos = new Vector2(0, 0.8f);
        _minerVel = Vector2.zero;
        _minerGo.transform.position = _minerPos;
        _enemiesRemainingToSpawn = 3 + _wave * 2;
        _spawnCd = 0.4f;
        _sfx.PlayOneShot(_clipWave);
        _shakeTrauma = 0.25f;
    }

    void UpdateDefense(float dt)
    {
        // Aim turret toward mouse
        Vector3 wp = _cam.ScreenToWorldPoint(Input.mousePosition);
        Vector2 origin = _turretPivot.transform.position;
        Vector2 dir = new Vector2(wp.x - origin.x, Mathf.Max(0.15f, wp.y - origin.y)).normalized;
        _turretAngleDeg = Mathf.Atan2(dir.y, dir.x) * Mathf.Rad2Deg;
        _turretPivot.transform.rotation = Quaternion.Euler(0, 0, _turretAngleDeg);

        _laserFiring = Input.GetMouseButton(0) || Input.GetKey(KeyCode.Space);
        if (_laserFiring && GUIUtility.hotControl == 0)
        {
            Vector2 endPos = origin + dir * 18f;
            float bestDist = 18f;
            EnemyUnit hitEnemy = null;

            foreach (var e in _enemies)
            {
                Vector2 toE = e.pos - origin;
                float proj = Vector2.Dot(toE, dir);
                if (proj > 0 && proj < bestDist)
                {
                    float perp = Vector2.Distance(origin + dir * proj, e.pos);
                    if (perp < 0.75f)
                    {
                        bestDist = proj;
                        hitEnemy = e;
                    }
                }
            }

            if (hitEnemy != null)
            {
                endPos = hitEnemy.pos;
                float dps = 18f + _laserLv * 9f;
                hitEnemy.hp -= dps * dt;
                hitEnemy.pos += dir * (1.8f * dt);
                if (UnityEngine.Random.value < 0.35f)
                {
                    SpawnFx(endPos, UnityEngine.Random.insideUnitCircle * 3f, 0.22f, 0.14f, new Color(1f, 0.4f, 0.65f, 1f));
                }
            }

            _laserLine.enabled = true;
            _laserLine.SetPosition(0, origin + dir * 0.7f);
            _laserLine.SetPosition(1, endPos);

            _laserSfxCd -= dt;
            if (_laserSfxCd <= 0f)
            {
                _laserSfxCd = 0.11f;
                _sfx.PlayOneShot(_clipLaser);
            }
        }
        else
        {
            _laserLine.enabled = false;
        }

        // Spawn wave enemies
        if (_enemiesRemainingToSpawn > 0)
        {
            _spawnCd -= dt;
            if (_spawnCd <= 0f)
            {
                _spawnCd = Mathf.Max(0.45f, 1.4f - _wave * 0.08f);
                _enemiesRemainingToSpawn--;
                SpawnEnemy();
            }
        }

        // Update enemies
        for (int i = _enemies.Count - 1; i >= 0; i--)
        {
            var e = _enemies[i];
            if (e.hp <= 0f)
            {
                _score += 50;
                _sfx.PlayOneShot(_clipHit);
                _shakeTrauma = Mathf.Max(_shakeTrauma, 0.18f);
                for (int k = 0; k < 8; k++) SpawnFx(e.pos, UnityEngine.Random.insideUnitCircle * 4f, 0.35f, 0.2f, new Color(1f, 0.45f, 0.3f, 1f));
                Destroy(e.go);
                _enemies.RemoveAt(i);
                continue;
            }

            Vector2 target = e.flyer ? new Vector2(0, 2.2f) : new Vector2(0, 0.9f);
            float dist = Vector2.Distance(e.pos, target);
            if (dist > 1.85f)
            {
                Vector2 step = (target - e.pos).normalized * e.speed * dt;
                e.pos += step;
            }
            else
            {
                e.atkCd -= dt;
                if (e.atkCd <= 0f)
                {
                    e.atkCd = 1.15f;
                    _domeHp -= Mathf.RoundToInt(e.dmg);
                    _shakeTrauma = Mathf.Max(_shakeTrauma, 0.35f);
                    _sfx.PlayOneShot(_clipHit);
                    SpawnFx(e.pos, UnityEngine.Random.insideUnitCircle * 2.5f, 0.25f, 0.22f, Color.cyan);
                    if (_domeHp <= 0)
                    {
                        _domeHp = 0;
                        _mode = GameMode.GameOver;
                        _laserLine.enabled = false;
                        return;
                    }
                }
            }
            e.go.transform.position = e.pos;
        }

        // Wave cleared!
        if (_enemiesRemainingToSpawn == 0 && _enemies.Count == 0)
        {
            _laserLine.enabled = false;
            _wave++;
            _waveTimer = 30f;
            _score += 120;
            _domeHp = Mathf.Min(_domeMaxHp, _domeHp + 10);
            _mode = GameMode.Mining;
        }
    }

    void SpawnEnemy()
    {
        bool left = UnityEngine.Random.value < 0.5f;
        bool flyer = UnityEngine.Random.value < 0.42f;
        float x = left ? -13.5f : 13.5f;
        float y = flyer ? UnityEngine.Random.Range(4.2f, 7.5f) : 0.95f;
        float hp = (16f + _wave * 7f) * (flyer ? 0.8f : 1.25f);

        var go = new GameObject("Hostile");
        go.transform.SetParent(_worldRoot.transform);
        go.transform.position = new Vector3(x, y, 0);
        go.transform.localScale = flyer ? new Vector3(0.75f, 0.55f, 1f) : new Vector3(0.85f, 0.85f, 1f);
        var sr = go.AddComponent<SpriteRenderer>();
        sr.sprite = flyer ? _circleSprite : _sqSprite;
        sr.color = flyer ? new Color(0.95f, 0.32f, 0.72f, 1f) : new Color(0.95f, 0.28f, 0.28f, 1f);
        sr.sortingOrder = 12;

        _enemies.Add(new EnemyUnit
        {
            pos = new Vector2(x, y),
            hp = hp,
            maxHp = hp,
            speed = (flyer ? 2.4f : 1.7f) + _wave * 0.14f,
            dmg = 6f + _wave * 1.5f,
            flyer = flyer,
            atkCd = 0.5f,
            go = go
        });
    }

    void SpawnFx(Vector2 pos, Vector2 vel, float maxLife, float size, Color color)
    {
        if (_fx.Count > 90) return;
        var go = new GameObject("Fx");
        go.transform.SetParent(_worldRoot.transform);
        go.transform.position = pos;
        go.transform.localScale = Vector3.one * size;
        var sr = go.AddComponent<SpriteRenderer>();
        sr.sprite = _circleSprite;
        sr.color = color;
        sr.sortingOrder = 14;
        _fx.Add(new FxParticle { pos = pos, vel = vel, life = 0, maxLife = maxLife, size = size, color = color, go = go });
    }

    void UpdateParticles(float dt)
    {
        for (int i = _fx.Count - 1; i >= 0; i--)
        {
            var p = _fx[i];
            p.life += dt;
            if (p.life >= p.maxLife)
            {
                Destroy(p.go);
                _fx.RemoveAt(i);
                continue;
            }
            p.pos += p.vel * dt;
            p.go.transform.position = p.pos;
            float fade = 1f - p.life / p.maxLife;
            p.go.transform.localScale = Vector3.one * p.size * fade;
        }
    }

    void UpdateCamera(float dt)
    {
        Vector3 target = _mode == GameMode.Defense
            ? new Vector3(0, 3.2f, -10f)
            : new Vector3(Mathf.Clamp(_minerPos.x * 0.45f, -5f, 5f), Mathf.Clamp(_minerPos.y + 1.2f, -Rows + 5f, 3.0f), -10f);

        _shakeTrauma = Mathf.Max(0f, _shakeTrauma - dt * 1.8f);
        float shake = _shakeTrauma * _shakeTrauma * 0.35f;
        Vector3 jitter = new Vector3(UnityEngine.Random.Range(-shake, shake), UnityEngine.Random.Range(-shake, shake), 0);

        _cam.transform.position = Vector3.Lerp(_cam.transform.position, target, 6f * dt) + jitter;
        _cam.orthographicSize = Mathf.Lerp(_cam.orthographicSize, _mode == GameMode.Defense ? 8.2f : 6.8f, 4f * dt);
    }

    void EnsureStyles()
    {
        if (_hudStyle != null) return;
        _hudStyle = new GUIStyle(GUI.skin.label) { fontSize = 15, fontStyle = FontStyle.Bold };
        _hudStyle.normal.textColor = Color.white;
        _titleStyle = new GUIStyle(GUI.skin.label) { fontSize = 34, fontStyle = FontStyle.Bold, alignment = TextAnchor.MiddleCenter };
        _titleStyle.normal.textColor = new Color(0.45f, 0.92f, 1f, 1f);
        _subStyle = new GUIStyle(GUI.skin.label) { fontSize = 16, alignment = TextAnchor.MiddleCenter, wordWrap = true };
        _subStyle.normal.textColor = new Color(0.85f, 0.92f, 1f, 0.9f);
        _btnStyle = new GUIStyle(GUI.skin.button) { fontSize = 14, fontStyle = FontStyle.Bold };
    }

    void OnGUI()
    {
        EnsureStyles();
        float w = Screen.width;
        float h = Screen.height;

        if (_mode == GameMode.Title)
        {
            GUI.Box(new Rect(w * 0.5f - 250, h * 0.5f - 140, 500, 280), "");
            GUI.Label(new Rect(w * 0.5f - 230, h * 0.5f - 120, 460, 50), "DOME KEEPER — UNITY", _titleStyle);
            GUI.Label(new Rect(w * 0.5f - 230, h * 0.5f - 60, 460, 80),
                "WASD / Drag: Jetpack Drill & Tether Ore back to Center Shaft\nMouse Aim + Click/Space: Fire Dome Laser during Wave Defense\n1-4 Keys: Live Upgrades (Drill / Jetpack / Laser / Armor)",
                _subStyle);
            if (GUI.Button(new Rect(w * 0.5f - 110, h * 0.5f + 50, 220, 48), "START EXPEDITION", _btnStyle))
            {
                ResetRun(GameMode.Mining);
            }
            return;
        }

        // Top HUD Bar
        GUI.Box(new Rect(12, 10, w - 24, 44), "");
        string modeTxt = _mode == GameMode.Defense
            ? $"WAVE {_wave} DEFENSE! ({_enemies.Count + _enemiesRemainingToSpawn} Hostiles)"
            : $"WAVE {_wave} MINING · NEXT WAVE IN {Mathf.CeilToInt(_waveTimer)}s";
        GUI.Label(new Rect(24, 20, 420, 26), modeTxt, _hudStyle);
        GUI.Label(new Rect(w * 0.5f - 160, 20, 340, 26),
            $"DOME HP {_domeHp}/{_domeMaxHp}   IRON {_iron}   COBALT {_cobalt}   WATER {_water}",
            _hudStyle);
        GUI.Label(new Rect(w - 150, 20, 130, 26), $"SCORE {_score}", _hudStyle);

        // Bottom Upgrade Bar
        float by = h - 54;
        if (GUI.Button(new Rect(14, by, 175, 42), $"[1] Drill Lv.{_drillLv} ({_drillLv * 3} Fe)", _btnStyle)) TryUpgrade(0);
        if (GUI.Button(new Rect(197, by, 190, 42), $"[2] Jet Lv.{_jetLv} ({_jetLv * 2} Fe,1 W)", _btnStyle)) TryUpgrade(1);
        if (GUI.Button(new Rect(395, by, 180, 42), $"[3] Laser Lv.{_laserLv} ({_laserLv * 2} Co)", _btnStyle)) TryUpgrade(2);
        if (GUI.Button(new Rect(583, by, 185, 42), $"[4] Armor Lv.{_armorLv} (2 Fe,1 Co)", _btnStyle)) TryUpgrade(3);

        if (_mode == GameMode.GameOver)
        {
            GUI.Box(new Rect(w * 0.5f - 210, h * 0.5f - 110, 420, 220), "");
            GUI.Label(new Rect(w * 0.5f - 190, h * 0.5f - 90, 380, 46), "DOME BREACHED", _titleStyle);
            GUI.Label(new Rect(w * 0.5f - 190, h * 0.5f - 36, 380, 56),
                $"Reached Wave {_wave} · Ores Delivered: {_oresDelivered}\nFinal Score: {_score}",
                _subStyle);
            if (GUI.Button(new Rect(w * 0.5f - 100, h * 0.5f + 38, 200, 44), "PLAY AGAIN", _btnStyle))
            {
                ResetRun(GameMode.Mining);
            }
        }
    }
}
