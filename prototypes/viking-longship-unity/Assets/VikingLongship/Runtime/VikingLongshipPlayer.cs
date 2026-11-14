using System.Collections.Generic;
using UnityEngine;

public sealed class VikingLongshipPlayer : MonoBehaviour
{
    struct WakeParticle
    {
        public GameObject Go;
        public float Life;
        public float MaxLife;
        public Vector3 Vel;
    }

    struct Projectile
    {
        public GameObject Go;
        public Vector3 Vel;
        public float Life;
        public bool FromPlayer;
    }

    struct EnemyShip
    {
        public GameObject Root;
        public int Hp;
        public int MaxHp;
        public bool IsSerpent;
        public float FireCooldown;
        public float Phase;
    }

    struct Pickup
    {
        public GameObject Go;
        public bool IsRepair;
        public float Phase;
    }

    Camera _cam;
    Transform _shipRoot;
    Transform _sail;
    readonly List<Transform> _oars = new List<Transform>();
    readonly List<WakeParticle> _particles = new List<WakeParticle>();
    readonly List<Projectile> _projectiles = new List<Projectile>();
    readonly List<EnemyShip> _enemies = new List<EnemyShip>();
    readonly List<Pickup> _pickups = new List<Pickup>();
    readonly List<Transform> _rocks = new List<Transform>();
    readonly List<Transform> _oceanTiles = new List<Transform>();

    Vector3 _shipPos;
    float _shipYaw;
    float _speed;
    float _windAngleDeg = 35f;
    float _windTimer;

    int _hull = 100;
    const int MaxHull = 100;
    int _silver;
    int _sunkCount;
    int _wave = 1;
    float _fireCooldown;
    float _boostCooldown;
    float _boostActiveTimer;
    float _shakeTimer;
    float _invulnTimer;
    bool _gameOver;

    Material _woodMat;
    Material _darkWoodMat;
    Material _sailMat;
    Material _goldMat;
    Material _enemyMat;
    Material _serpentMat;
    Material _rockMat;
    Material _foamMat;
    Material _fireMat;
    Material _greenMat;

    void Start()
    {
        Application.targetFrameRate = 60;
        CreateMaterials();
        SetupCameraAndLight();
        BuildOceanAndRocks();
        BuildLongship();
        SpawnWave(_wave);
        SpawnPickups(6);
    }

    void CreateMaterials()
    {
        _woodMat = MakeMat(new Color(0.55f, 0.34f, 0.16f));
        _darkWoodMat = MakeMat(new Color(0.32f, 0.19f, 0.09f));
        _sailMat = MakeMat(new Color(0.86f, 0.24f, 0.18f));
        _goldMat = MakeMat(new Color(0.98f, 0.80f, 0.22f));
        _enemyMat = MakeMat(new Color(0.24f, 0.22f, 0.28f));
        _serpentMat = MakeMat(new Color(0.14f, 0.62f, 0.45f));
        _rockMat = MakeMat(new Color(0.34f, 0.38f, 0.42f));
        _foamMat = MakeMat(new Color(0.82f, 0.94f, 1.0f));
        _fireMat = MakeMat(new Color(1.0f, 0.55f, 0.12f));
        _greenMat = MakeMat(new Color(0.24f, 0.82f, 0.42f));
    }

    static Material MakeMat(Color c)
    {
        var shader = Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Standard") ?? Shader.Find("Unlit/Color");
        var mat = new Material(shader);
        mat.color = c;
        return mat;
    }

    void SetupCameraAndLight()
    {
        var camGo = new GameObject("Main Camera");
        camGo.tag = "MainCamera";
        _cam = camGo.AddComponent<Camera>();
        _cam.clearFlags = CameraClearFlags.SolidColor;
        _cam.backgroundColor = new Color(0.05f, 0.15f, 0.26f);
        _cam.orthographic = false;
        _cam.fieldOfView = 48f;
        camGo.transform.position = new Vector3(0f, 22f, -15f);
        camGo.transform.rotation = Quaternion.Euler(55f, 0f, 0f);

        var lightGo = new GameObject("Sun");
        var light = lightGo.AddComponent<Light>();
        light.type = LightType.Directional;
        light.intensity = 1.25f;
        light.color = new Color(1.0f, 0.95f, 0.86f);
        lightGo.transform.rotation = Quaternion.Euler(50f, -30f, 0f);
    }

    void BuildOceanAndRocks()
    {
        var seaMat = MakeMat(new Color(0.06f, 0.22f, 0.36f));
        for (int gx = -2; gx <= 2; gx++)
        {
            for (int gz = -2; gz <= 2; gz++)
            {
                var tile = GameObject.CreatePrimitive(PrimitiveType.Plane);
                tile.name = "SeaTile";
                tile.transform.position = new Vector3(gx * 24f, -0.4f, gz * 24f);
                tile.transform.localScale = new Vector3(2.4f, 1f, 2.4f);
                tile.GetComponent<Renderer>().material = seaMat;
                _oceanTiles.Add(tile.transform);
            }
        }

        // Reef rocks around arena
        for (int i = 0; i < 14; i++)
        {
            float ang = i * (360f / 14f) * Mathf.Deg2Rad + (i % 3) * 0.2f;
            float dist = 16f + (i % 4) * 7f;
            var rock = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            rock.name = "ReefRock";
            float s = 1.6f + (i % 3) * 0.8f;
            rock.transform.position = new Vector3(Mathf.Cos(ang) * dist, 0.1f, Mathf.Sin(ang) * dist);
            rock.transform.localScale = new Vector3(s * 1.3f, s * 0.8f, s);
            rock.GetComponent<Renderer>().material = _rockMat;
            _rocks.Add(rock.transform);
        }
    }

    void BuildLongship()
    {
        var root = new GameObject("PlayerLongship");
        _shipRoot = root.transform;

        var hull = GameObject.CreatePrimitive(PrimitiveType.Cube);
        hull.transform.SetParent(_shipRoot, false);
        hull.transform.localScale = new Vector3(1.5f, 0.65f, 3.8f);
        hull.GetComponent<Renderer>().material = _woodMat;

        var prow = GameObject.CreatePrimitive(PrimitiveType.Cube);
        prow.transform.SetParent(_shipRoot, false);
        prow.transform.localPosition = new Vector3(0f, 0.45f, 2.0f);
        prow.transform.localRotation = Quaternion.Euler(-28f, 0f, 0f);
        prow.transform.localScale = new Vector3(0.45f, 1.1f, 0.7f);
        prow.GetComponent<Renderer>().material = _goldMat;

        var mast = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        mast.transform.SetParent(_shipRoot, false);
        mast.transform.localPosition = new Vector3(0f, 1.6f, 0.1f);
        mast.transform.localScale = new Vector3(0.18f, 1.5f, 0.18f);
        mast.GetComponent<Renderer>().material = _darkWoodMat;

        var sailGo = GameObject.CreatePrimitive(PrimitiveType.Cube);
        _sail = sailGo.transform;
        _sail.SetParent(_shipRoot, false);
        _sail.localPosition = new Vector3(0f, 2.0f, 0.25f);
        _sail.localScale = new Vector3(2.2f, 1.6f, 0.1f);
        sailGo.GetComponent<Renderer>().material = _sailMat;

        // 6 oars
        for (int i = -1; i <= 1; i++)
        {
            for (int side = -1; side <= 1; side += 2)
            {
                var oar = GameObject.CreatePrimitive(PrimitiveType.Cube);
                oar.transform.SetParent(_shipRoot, false);
                oar.transform.localPosition = new Vector3(side * 1.15f, -0.05f, i * 0.9f);
                oar.transform.localScale = new Vector3(1.2f, 0.1f, 0.14f);
                oar.GetComponent<Renderer>().material = _darkWoodMat;
                _oars.Add(oar.transform);
            }
        }
    }

    void SpawnWave(int waveNum)
    {
        int enemyCount = 3 + waveNum * 2;
        for (int i = 0; i < enemyCount; i++)
        {
            float ang = (i * 360f / enemyCount) * Mathf.Deg2Rad;
            float dist = 20f + (i % 3) * 6f;
            bool isSerpent = (i % 3 == 2);
            var root = new GameObject(isSerpent ? "SeaSerpent" : "RaiderShip");
            root.transform.position = _shipPos + new Vector3(Mathf.Cos(ang) * dist, 0f, Mathf.Sin(ang) * dist);

            if (isSerpent)
            {
                for (int s = 0; s < 3; s++)
                {
                    var seg = GameObject.CreatePrimitive(PrimitiveType.Sphere);
                    seg.transform.SetParent(root.transform, false);
                    seg.transform.localPosition = new Vector3(0f, 0.25f, -s * 0.9f);
                    seg.transform.localScale = Vector3.one * (1.25f - s * 0.2f);
                    seg.GetComponent<Renderer>().material = _serpentMat;
                }
            }
            else
            {
                var hull = GameObject.CreatePrimitive(PrimitiveType.Cube);
                hull.transform.SetParent(root.transform, false);
                hull.transform.localScale = new Vector3(1.4f, 0.6f, 3.2f);
                hull.GetComponent<Renderer>().material = _enemyMat;

                var sail = GameObject.CreatePrimitive(PrimitiveType.Cube);
                sail.transform.SetParent(root.transform, false);
                sail.transform.localPosition = new Vector3(0f, 1.6f, 0f);
                sail.transform.localScale = new Vector3(1.8f, 1.3f, 0.1f);
                sail.GetComponent<Renderer>().material = _darkWoodMat;
            }

            _enemies.Add(new EnemyShip
            {
                Root = root,
                Hp = isSerpent ? 2 + waveNum : 3 + waveNum,
                MaxHp = isSerpent ? 2 + waveNum : 3 + waveNum,
                IsSerpent = isSerpent,
                FireCooldown = Random.Range(1.2f, 2.8f),
                Phase = Random.Range(0f, 6.28f)
            });
        }
    }

    void SpawnPickups(int count)
    {
        for (int i = 0; i < count; i++)
        {
            float ang = Random.Range(0f, 360f) * Mathf.Deg2Rad;
            float dist = Random.Range(8f, 28f);
            bool isRepair = (i % 4 == 0);
            var go = GameObject.CreatePrimitive(isRepair ? PrimitiveType.Cylinder : PrimitiveType.Cube);
            go.name = isRepair ? "RepairBarrel" : "SilverChest";
            go.transform.position = _shipPos + new Vector3(Mathf.Cos(ang) * dist, 0.35f, Mathf.Sin(ang) * dist);
            go.transform.localScale = isRepair ? new Vector3(0.75f, 0.55f, 0.75f) : new Vector3(0.85f, 0.65f, 0.85f);
            go.GetComponent<Renderer>().material = isRepair ? _greenMat : _goldMat;
            _pickups.Add(new Pickup { Go = go, IsRepair = isRepair, Phase = Random.Range(0f, 6.28f) });
        }
    }

    void Update()
    {
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        if (_gameOver)
        {
            if (Input.GetKeyDown(KeyCode.R)) Restart();
            return;
        }

        _windTimer += dt;
        _windAngleDeg += Mathf.Sin(_windTimer * 0.25f) * 8f * dt;
        _fireCooldown = Mathf.Max(0f, _fireCooldown - dt);
        _boostCooldown = Mathf.Max(0f, _boostCooldown - dt);
        _boostActiveTimer = Mathf.Max(0f, _boostActiveTimer - dt);
        _shakeTimer = Mathf.Max(0f, _shakeTimer - dt);
        _invulnTimer = Mathf.Max(0f, _invulnTimer - dt);

        HandleInput(dt);
        UpdateEnemies(dt);
        UpdateProjectiles(dt);
        UpdatePickups(dt);
        UpdateParticles(dt);
        UpdateCamera(dt);

        if (_enemies.Count == 0)
        {
            _wave++;
            _silver += 50 * _wave;
            SpawnWave(_wave);
            SpawnPickups(3);
        }
    }

    void HandleInput(float dt)
    {
        float turn = 0f;
        float throttle = 0f;
        if (Input.GetKey(KeyCode.A) || Input.GetKey(KeyCode.LeftArrow)) turn -= 1f;
        if (Input.GetKey(KeyCode.D) || Input.GetKey(KeyCode.RightArrow)) turn += 1f;
        if (Input.GetKey(KeyCode.W) || Input.GetKey(KeyCode.UpArrow)) throttle += 1f;
        if (Input.GetKey(KeyCode.S) || Input.GetKey(KeyCode.DownArrow)) throttle -= 0.5f;

        // Pointer steering fallback
        if (Input.GetMouseButton(1) || (Input.GetMouseButton(0) && Mathf.Abs(turn) < 0.01f && Mathf.Abs(throttle) < 0.01f))
        {
            var ray = _cam.ScreenPointToRay(Input.mousePosition);
            if (new Plane(Vector3.up, Vector3.zero).Raycast(ray, out float enter))
            {
                Vector3 target = ray.GetPoint(enter);
                Vector3 toTarget = target - _shipPos;
                if (toTarget.sqrMagnitude > 1.5f)
                {
                    float desiredYaw = Mathf.Atan2(toTarget.x, toTarget.z) * Mathf.Rad2Deg;
                    float delta = Mathf.DeltaAngle(_shipYaw, desiredYaw);
                    turn = Mathf.Clamp(delta / 35f, -1f, 1f);
                    throttle = 1f;
                }
            }
        }

        if ((Input.GetKeyDown(KeyCode.LeftShift) || Input.GetKeyDown(KeyCode.E)) && _boostCooldown <= 0f)
        {
            _boostActiveTimer = 0.75f;
            _boostCooldown = 3.2f;
            SpawnFoamBurst(_shipPos, 10);
        }

        _shipYaw += turn * 135f * dt;
        Vector3 fwd = Quaternion.Euler(0f, _shipYaw, 0f) * Vector3.forward;
        Vector3 windDir = Quaternion.Euler(0f, _windAngleDeg, 0f) * Vector3.forward;
        float windAlign = Vector3.Dot(fwd, windDir); // -1..1
        float maxSpd = 8.5f + windAlign * 3.0f + (_boostActiveTimer > 0f ? 8.5f : 0f);
        float targetSpd = throttle > 0f ? maxSpd * throttle : (throttle < 0f ? -3.0f : 2.2f);
        _speed = Mathf.Lerp(_speed, targetSpd, dt * 3.5f);

        _shipPos += fwd * (_speed * dt);
        _shipPos.x = Mathf.Clamp(_shipPos.x, -44f, 44f);
        _shipPos.z = Mathf.Clamp(_shipPos.z, -44f, 44f);

        // Reef rock collision
        for (int i = 0; i < _rocks.Count; i++)
        {
            Vector3 d = _shipPos - _rocks[i].position;
            d.y = 0f;
            if (d.magnitude < 2.3f)
            {
                _shipPos = _rocks[i].position + d.normalized * 2.4f;
                _shipPos.y = 0f;
                DamageHull(8);
            }
        }

        // Bobbing & rowing animation
        float bob = Mathf.Sin(Time.time * 2.6f) * 0.12f;
        _shipRoot.position = new Vector3(_shipPos.x, bob, _shipPos.z);
        _shipRoot.rotation = Quaternion.Euler(Mathf.Sin(Time.time * 2.1f) * 2.5f, _shipYaw, -turn * 6f);
        if (_sail != null)
        {
            float sailRel = Mathf.DeltaAngle(_shipYaw, _windAngleDeg) * 0.35f;
            _sail.localRotation = Quaternion.Euler(0f, Mathf.Clamp(sailRel, -35f, 35f), 0f);
        }

        for (int i = 0; i < _oars.Count; i++)
        {
            float side = (i % 2 == 0) ? -1f : 1f;
            float stroke = Mathf.Sin(Time.time * (5f + Mathf.Abs(_speed) * 0.6f) + i) * 22f;
            _oars[i].localRotation = Quaternion.Euler(0f, stroke * side, side * 12f);
        }

        if (Time.frameCount % 4 == 0 && Mathf.Abs(_speed) > 2f)
        {
            SpawnFoamBurst(_shipPos - fwd * 1.9f, 1);
        }

        if ((Input.GetKey(KeyCode.Space) || Input.GetMouseButton(0)) && _fireCooldown <= 0f)
        {
            FireVolley();
            _fireCooldown = 0.32f;
        }
    }

    void FireVolley()
    {
        Vector3 aimDir = Quaternion.Euler(0f, _shipYaw, 0f) * Vector3.forward;
        var ray = _cam.ScreenPointToRay(Input.mousePosition);
        if (new Plane(Vector3.up, Vector3.zero).Raycast(ray, out float enter))
        {
            Vector3 pt = ray.GetPoint(enter) - _shipPos;
            pt.y = 0f;
            if (pt.sqrMagnitude > 0.5f) aimDir = pt.normalized;
        }

        for (int spread = -1; spread <= 1; spread += 2)
        {
            Vector3 dir = Quaternion.Euler(0f, spread * 7f, 0f) * aimDir;
            SpawnProjectile(_shipPos + Vector3.up * 0.6f + dir * 1.4f, dir * 24f, true);
        }
    }

    void SpawnProjectile(Vector3 pos, Vector3 vel, bool fromPlayer)
    {
        var go = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        go.transform.position = pos;
        go.transform.localScale = Vector3.one * (fromPlayer ? 0.35f : 0.45f);
        go.GetComponent<Renderer>().material = fromPlayer ? _fireMat : _enemyMat;
        _projectiles.Add(new Projectile { Go = go, Vel = vel, Life = 2.0f, FromPlayer = fromPlayer });
    }

    void UpdateEnemies(float dt)
    {
        for (int i = _enemies.Count - 1; i >= 0; i--)
        {
            var e = _enemies[i];
            Vector3 toPlayer = _shipPos - e.Root.transform.position;
            toPlayer.y = 0f;
            float dist = toPlayer.magnitude;
            Vector3 dir = dist > 0.01f ? toPlayer / dist : Vector3.forward;

            float spd = e.IsSerpent ? 5.6f : 3.6f;
            e.Root.transform.position += dir * (spd * dt);
            e.Root.transform.position = new Vector3(
                e.Root.transform.position.x,
                Mathf.Sin(Time.time * 2.5f + e.Phase) * 0.14f,
                e.Root.transform.position.z
            );
            e.Root.transform.rotation = Quaternion.LookRotation(dir, Vector3.up);

            if (!e.IsSerpent)
            {
                e.FireCooldown -= dt;
                if (e.FireCooldown <= 0f && dist < 24f)
                {
                    e.FireCooldown = Random.Range(2.0f, 3.4f);
                    SpawnProjectile(e.Root.transform.position + Vector3.up * 0.5f, dir * 13f, false);
                }
            }

            if (dist < 2.2f)
            {
                if (_boostActiveTimer > 0f)
                {
                    e.Hp -= 3;
                    SpawnFoamBurst(e.Root.transform.position, 8);
                    _shakeTimer = 0.2f;
                }
                else
                {
                    DamageHull(14);
                }
            }

            if (e.Hp <= 0)
            {
                SpawnFoamBurst(e.Root.transform.position, 12);
                Destroy(e.Root);
                _enemies.RemoveAt(i);
                _silver += e.IsSerpent ? 35 : 25;
                _sunkCount++;
            }
            else
            {
                _enemies[i] = e;
            }
        }
    }

    void UpdateProjectiles(float dt)
    {
        for (int i = _projectiles.Count - 1; i >= 0; i--)
        {
            var p = _projectiles[i];
            p.Life -= dt;
            p.Go.transform.position += p.Vel * dt;
            bool hit = false;

            if (p.FromPlayer)
            {
                for (int j = _enemies.Count - 1; j >= 0; j--)
                {
                    var e = _enemies[j];
                    Vector3 d = p.Go.transform.position - e.Root.transform.position;
                    d.y = 0f;
                    if (d.magnitude < 1.8f)
                    {
                        e.Hp--;
                        _enemies[j] = e;
                        SpawnFoamBurst(p.Go.transform.position, 4);
                        hit = true;
                        break;
                    }
                }
            }
            else
            {
                Vector3 d = p.Go.transform.position - _shipPos;
                d.y = 0f;
                if (d.magnitude < 1.5f)
                {
                    DamageHull(10);
                    hit = true;
                }
            }

            if (hit || p.Life <= 0f)
            {
                Destroy(p.Go);
                _projectiles.RemoveAt(i);
            }
            else
            {
                _projectiles[i] = p;
            }
        }
    }

    void UpdatePickups(float dt)
    {
        for (int i = _pickups.Count - 1; i >= 0; i--)
        {
            var pk = _pickups[i];
            pk.Go.transform.Rotate(0f, 65f * dt, 0f);
            Vector3 d = pk.Go.transform.position - _shipPos;
            d.y = 0f;
            if (d.magnitude < 2.0f)
            {
                if (pk.IsRepair)
                {
                    _hull = Mathf.Min(MaxHull, _hull + 25);
                }
                else
                {
                    _silver += 20;
                }
                Destroy(pk.Go);
                _pickups.RemoveAt(i);
            }
        }
    }

    void DamageHull(int dmg)
    {
        if (_invulnTimer > 0f) return;
        _hull = Mathf.Max(0, _hull - dmg);
        _invulnTimer = 0.55f;
        _shakeTimer = 0.25f;
        if (_hull <= 0)
        {
            _gameOver = true;
        }
    }

    void SpawnFoamBurst(Vector3 pos, int count)
    {
        for (int i = 0; i < count; i++)
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            go.transform.position = pos + new Vector3(Random.Range(-0.5f, 0.5f), 0.1f, Random.Range(-0.5f, 0.5f));
            go.transform.localScale = Vector3.one * Random.Range(0.22f, 0.45f);
            go.GetComponent<Renderer>().material = _foamMat;
            _particles.Add(new WakeParticle
            {
                Go = go,
                Life = 0.55f,
                MaxLife = 0.55f,
                Vel = new Vector3(Random.Range(-2f, 2f), Random.Range(0.4f, 1.5f), Random.Range(-2f, 2f))
            });
        }
    }

    void UpdateParticles(float dt)
    {
        for (int i = _particles.Count - 1; i >= 0; i--)
        {
            var pt = _particles[i];
            pt.Life -= dt;
            pt.Go.transform.position += pt.Vel * dt;
            float s = Mathf.Max(0.01f, (pt.Life / pt.MaxLife) * 0.4f);
            pt.Go.transform.localScale = Vector3.one * s;
            if (pt.Life <= 0f)
            {
                Destroy(pt.Go);
                _particles.RemoveAt(i);
            }
            else
            {
                _particles[i] = pt;
            }
        }
    }

    void UpdateCamera(float dt)
    {
        Vector3 fwd = Quaternion.Euler(0f, _shipYaw, 0f) * Vector3.forward;
        Vector3 desired = _shipPos + fwd * 3.0f + new Vector3(0f, 22f, -15f);
        if (_shakeTimer > 0f)
        {
            desired += Random.insideUnitSphere * 0.45f;
        }
        _cam.transform.position = Vector3.Lerp(_cam.transform.position, desired, dt * 5f);
    }

    void Restart()
    {
        for (int i = 0; i < _enemies.Count; i++) Destroy(_enemies[i].Root);
        for (int i = 0; i < _projectiles.Count; i++) Destroy(_projectiles[i].Go);
        for (int i = 0; i < _pickups.Count; i++) Destroy(_pickups[i].Go);
        _enemies.Clear();
        _projectiles.Clear();
        _pickups.Clear();

        _shipPos = Vector3.zero;
        _shipYaw = 0f;
        _speed = 0f;
        _hull = MaxHull;
        _silver = 0;
        _sunkCount = 0;
        _wave = 1;
        _gameOver = false;
        SpawnWave(_wave);
        SpawnPickups(6);
    }

    void OnGUI()
    {
        var boxStyle = new GUIStyle(GUI.skin.box) { fontSize = 15, fontStyle = FontStyle.Bold };
        GUI.Box(new Rect(14, 14, 340, 92), "");
        GUI.Label(new Rect(26, 22, 320, 24), $"VIKING LONGSHIP  |  WAVE {_wave}  |  SILVER {_silver}", boxStyle);
        GUI.Label(new Rect(26, 48, 320, 22), $"HULL: {_hull}/{MaxHull}   SUNK: {_sunkCount}   WIND: {Mathf.RoundToInt(_windAngleDeg)}°");
        string boostTxt = _boostCooldown <= 0f ? "READY (SHIFT / E)" : $"{_boostCooldown:0.0}s";
        GUI.Label(new Rect(26, 72, 320, 22), $"WASD/Click Steer • Space/Click Fire • Surge: {boostTxt}");

        if (_gameOver)
        {
            GUI.Box(new Rect(Screen.width * 0.5f - 170, Screen.height * 0.5f - 55, 340, 110), "");
            GUI.Label(new Rect(Screen.width * 0.5f - 140, Screen.height * 0.5f - 35, 280, 30), "SHIPWRECKED IN VALHALLA SEAS", boxStyle);
            GUI.Label(new Rect(Screen.width * 0.5f - 140, Screen.height * 0.5f - 5, 280, 24), $"Wave {_wave} • Silver {_silver} • Ships Sunk {_sunkCount}");
            if (GUI.Button(new Rect(Screen.width * 0.5f - 70, Screen.height * 0.5f + 22, 140, 28), "Sail Again (R)"))
            {
                Restart();
            }
        }
    }
}
