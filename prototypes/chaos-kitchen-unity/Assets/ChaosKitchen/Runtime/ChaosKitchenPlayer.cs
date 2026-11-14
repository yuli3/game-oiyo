using System;
using System.Collections.Generic;
using UnityEngine;

public class ChaosKitchenPlayer : MonoBehaviour
{
    enum Mode { Title, Playing, GameOver }
    enum ItemKind { None, Tomato, ChoppedTomato, RawPatty, CookedPatty, BurntPatty, Bun, Plate, SaladDish, BurgerDish, Extinguisher }
    enum StationKind { CrateTomato, CratePatty, CrateBun, CratePlate, ChoppingBoard, Stove, ServeBelt, Trash }

    class Station
    {
        public StationKind kind;
        public Vector2 pos;
        public ItemKind heldItem;
        public float progress;
        public bool onFire;
        public float fireTimer;
        public GameObject go;
        public SpriteRenderer itemSr;
        public SpriteRenderer barFillSr;
        public GameObject barRoot;
    }

    class OrderTicket
    {
        public string label;
        public ItemKind targetDish;
        public float timeLeft;
        public float maxTime;
        public int reward;
    }

    class ThrownItem
    {
        public ItemKind kind;
        public Vector2 pos;
        public Vector2 vel;
        public float life;
        public GameObject go;
    }

    class FxDot
    {
        public Vector2 pos;
        public Vector2 vel;
        public float life;
        public float maxLife;
        public float size;
        public GameObject go;
    }

    Mode _mode = Mode.Title;
    Camera _cam;
    GameObject _world;
    GameObject _chefGo;
    SpriteRenderer _chefItemSr;
    Vector2 _chefPos;
    Vector2 _chefFacing = Vector2.down;
    ItemKind _chefHand = ItemKind.None;
    float _dashCd;
    float _dashTime;
    float _shakeTrauma;

    float _roundTime = 90f;
    int _score;
    int _combo;
    int _servedCount;
    float _orderSpawnCd = 1f;

    readonly List<Station> _stations = new List<Station>();
    readonly List<OrderTicket> _orders = new List<OrderTicket>();
    readonly List<ThrownItem> _thrown = new List<ThrownItem>();
    readonly List<FxDot> _fx = new List<FxDot>();

    Sprite _sqSprite;
    Sprite _circleSprite;

    AudioSource _sfx;
    AudioClip _clipPick;
    AudioClip _clipChop;
    AudioClip _clipSizzle;
    AudioClip _clipServe;
    AudioClip _clipThrow;
    AudioClip _clipAlarm;
    float _chopSfxCd;

    GUIStyle _hudStyle;
    GUIStyle _titleStyle;
    GUIStyle _subStyle;
    GUIStyle _btnStyle;
    GUIStyle _ticketStyle;

    void Start()
    {
        Application.targetFrameRate = 60;
        _cam = Camera.main;
        if (_cam == null)
        {
            var c = new GameObject("Main Camera");
            _cam = c.AddComponent<Camera>();
            c.tag = "MainCamera";
        }
        _cam.orthographic = true;
        _cam.orthographicSize = 5.6f;
        _cam.backgroundColor = new Color(0.11f, 0.09f, 0.08f, 1f);
        _cam.transform.position = new Vector3(0, 0, -10f);

        _sfx = gameObject.AddComponent<AudioSource>();
        _sfx.playOnAwake = false;

        BuildSprites();
        BuildAudio();
        BuildKitchenWorld();
        ResetMatch(Mode.Title);
    }

    void BuildSprites()
    {
        var sq = new Texture2D(32, 32, TextureFormat.RGBA32, false);
        sq.filterMode = FilterMode.Point;
        for (int y = 0; y < 32; y++)
        for (int x = 0; x < 32; x++)
        {
            bool edge = x == 0 || y == 0 || x == 31 || y == 31;
            float s = edge ? 0.68f : 1f;
            sq.SetPixel(x, y, new Color(s, s, s, 1f));
        }
        sq.Apply();
        _sqSprite = Sprite.Create(sq, new Rect(0, 0, 32, 32), new Vector2(0.5f, 0.5f), 32f);

        var cir = new Texture2D(32, 32, TextureFormat.RGBA32, false);
        for (int y = 0; y < 32; y++)
        for (int x = 0; x < 32; x++)
        {
            float dx = (x - 15.5f) / 14.5f;
            float dy = (y - 15.5f) / 14.5f;
            float d = Mathf.Sqrt(dx * dx + dy * dy);
            float a = Mathf.Clamp01((1f - d) * 6f);
            cir.SetPixel(x, y, new Color(1f, 1f, 1f, a));
        }
        cir.Apply();
        _circleSprite = Sprite.Create(cir, new Rect(0, 0, 32, 32), new Vector2(0.5f, 0.5f), 32f);
    }

    AudioClip Tone(float f1, float f2, float dur, float amp, bool noise = false)
    {
        int sr = 22050;
        int len = Mathf.Max(1, Mathf.RoundToInt(sr * dur));
        var d = new float[len];
        float ph = 0f;
        var rng = new System.Random(Mathf.RoundToInt(f1 * 17 + dur * 500));
        for (int i = 0; i < len; i++)
        {
            float t = (float)i / len;
            ph += 2f * Mathf.PI * Mathf.Lerp(f1, f2, t) / sr;
            float s = noise ? ((float)rng.NextDouble() * 2f - 1f) * 0.5f + Mathf.Sin(ph) * 0.5f : Mathf.Sin(ph);
            d[i] = s * (1f - t) * amp;
        }
        var c = AudioClip.Create("k_sfx", len, 1, sr, false);
        c.SetData(d, 0);
        return c;
    }

    void BuildAudio()
    {
        _clipPick = Tone(420f, 640f, 0.08f, 0.22f);
        _clipChop = Tone(240f, 110f, 0.07f, 0.28f, true);
        _clipSizzle = Tone(320f, 190f, 0.14f, 0.18f, true);
        _clipServe = Tone(523f, 1046f, 0.24f, 0.30f);
        _clipThrow = Tone(340f, 520f, 0.10f, 0.22f);
        _clipAlarm = Tone(780f, 520f, 0.18f, 0.26f);
    }

    void BuildKitchenWorld()
    {
        _world = new GameObject("KitchenWorld");

        // Checkered floor tiles
        for (int gx = -7; gx <= 7; gx++)
        {
            for (int gy = -4; gy <= 4; gy++)
            {
                var fl = new GameObject($"Tile_{gx}_{gy}");
                fl.transform.SetParent(_world.transform);
                fl.transform.position = new Vector3(gx * 1.15f, gy * 1.15f, 0);
                fl.transform.localScale = new Vector3(1.13f, 1.13f, 1f);
                var sr = fl.AddComponent<SpriteRenderer>();
                sr.sprite = _sqSprite;
                sr.color = ((gx + gy) & 1) == 0 ? new Color(0.22f, 0.19f, 0.17f, 1f) : new Color(0.27f, 0.23f, 0.20f, 1f);
                sr.sortingOrder = -10;
            }
        }

        // Top crates
        AddStation(StationKind.CrateTomato, new Vector2(-4.5f, 2.8f), ItemKind.None);
        AddStation(StationKind.CratePatty, new Vector2(-2.2f, 2.8f), ItemKind.None);
        AddStation(StationKind.CrateBun, new Vector2(0.1f, 2.8f), ItemKind.None);
        AddStation(StationKind.CratePlate, new Vector2(2.4f, 2.8f), ItemKind.None);
        AddStation(StationKind.Trash, new Vector2(4.7f, 2.8f), ItemKind.None);

        // Center work island
        AddStation(StationKind.ChoppingBoard, new Vector2(-3.2f, 0.2f), ItemKind.None);
        AddStation(StationKind.ChoppingBoard, new Vector2(-1.4f, 0.2f), ItemKind.None);
        AddStation(StationKind.Stove, new Vector2(1.4f, 0.2f), ItemKind.None);
        AddStation(StationKind.Stove, new Vector2(3.2f, 0.2f), ItemKind.None);

        // Bottom serving belt
        AddStation(StationKind.ServeBelt, new Vector2(0f, -2.9f), ItemKind.None);

        // Chef character
        _chefGo = new GameObject("Chef");
        _chefGo.transform.SetParent(_world.transform);
        var chefSr = _chefGo.AddComponent<SpriteRenderer>();
        chefSr.sprite = _circleSprite;
        chefSr.color = new Color(0.98f, 0.96f, 0.92f, 1f);
        chefSr.sortingOrder = 10;
        _chefGo.transform.localScale = new Vector3(0.85f, 0.85f, 1f);

        var hat = new GameObject("ChefHat");
        hat.transform.SetParent(_chefGo.transform);
        hat.transform.localPosition = new Vector3(0, 0.22f, 0);
        hat.transform.localScale = new Vector3(0.7f, 0.45f, 1f);
        var hatSr = hat.AddComponent<SpriteRenderer>();
        hatSr.sprite = _sqSprite;
        hatSr.color = Color.white;
        hatSr.sortingOrder = 11;

        var held = new GameObject("ChefHeld");
        held.transform.SetParent(_chefGo.transform);
        held.transform.localPosition = new Vector3(0.55f, 0, 0);
        held.transform.localScale = new Vector3(0.55f, 0.55f, 1f);
        _chefItemSr = held.AddComponent<SpriteRenderer>();
        _chefItemSr.sprite = _circleSprite;
        _chefItemSr.sortingOrder = 12;
        _chefItemSr.enabled = false;
    }

    void AddStation(StationKind kind, Vector2 pos, ItemKind startItem)
    {
        var go = new GameObject(kind.ToString());
        go.transform.SetParent(_world.transform);
        go.transform.position = pos;
        go.transform.localScale = kind == StationKind.ServeBelt ? new Vector3(3.6f, 1.05f, 1f) : new Vector3(1.15f, 1.15f, 1f);
        var sr = go.AddComponent<SpriteRenderer>();
        sr.sprite = _sqSprite;
        sr.sortingOrder = 1;
        sr.color = kind switch
        {
            StationKind.CrateTomato => new Color(0.82f, 0.24f, 0.22f, 1f),
            StationKind.CratePatty => new Color(0.62f, 0.28f, 0.24f, 1f),
            StationKind.CrateBun => new Color(0.86f, 0.68f, 0.34f, 1f),
            StationKind.CratePlate => new Color(0.75f, 0.82f, 0.88f, 1f),
            StationKind.ChoppingBoard => new Color(0.72f, 0.54f, 0.34f, 1f),
            StationKind.Stove => new Color(0.24f, 0.27f, 0.32f, 1f),
            StationKind.ServeBelt => new Color(0.18f, 0.55f, 0.42f, 1f),
            _ => new Color(0.32f, 0.32f, 0.36f, 1f)
        };

        var itemGo = new GameObject("HeldItem");
        itemGo.transform.SetParent(go.transform);
        itemGo.transform.localPosition = new Vector3(0, 0.08f, 0);
        itemGo.transform.localScale = kind == StationKind.ServeBelt ? new Vector3(0.16f, 0.55f, 1f) : new Vector3(0.55f, 0.55f, 1f);
        var itemSr = itemGo.AddComponent<SpriteRenderer>();
        itemSr.sprite = _circleSprite;
        itemSr.sortingOrder = 5;
        itemSr.enabled = false;

        var barRoot = new GameObject("Bar");
        barRoot.transform.SetParent(_world.transform);
        barRoot.transform.position = pos + new Vector2(0, 0.72f);
        var bg = barRoot.AddComponent<SpriteRenderer>();
        bg.sprite = _sqSprite;
        bg.color = new Color(0, 0, 0, 0.75f);
        bg.sortingOrder = 8;
        barRoot.transform.localScale = new Vector3(0.95f, 0.16f, 1f);

        var fillGo = new GameObject("Fill");
        fillGo.transform.SetParent(barRoot.transform);
        fillGo.transform.localPosition = Vector3.zero;
        fillGo.transform.localScale = new Vector3(0.9f, 0.7f, 1f);
        var fillSr = fillGo.AddComponent<SpriteRenderer>();
        fillSr.sprite = _sqSprite;
        fillSr.color = Color.green;
        fillSr.sortingOrder = 9;
        barRoot.SetActive(false);

        _stations.Add(new Station
        {
            kind = kind,
            pos = pos,
            heldItem = startItem,
            go = go,
            itemSr = itemSr,
            barRoot = barRoot,
            barFillSr = fillSr
        });
    }

    Color ItemColor(ItemKind k) => k switch
    {
        ItemKind.Tomato => new Color(0.96f, 0.24f, 0.22f, 1f),
        ItemKind.ChoppedTomato => new Color(1f, 0.45f, 0.35f, 1f),
        ItemKind.RawPatty => new Color(0.75f, 0.28f, 0.32f, 1f),
        ItemKind.CookedPatty => new Color(0.48f, 0.25f, 0.14f, 1f),
        ItemKind.BurntPatty => new Color(0.14f, 0.14f, 0.15f, 1f),
        ItemKind.Bun => new Color(0.95f, 0.75f, 0.38f, 1f),
        ItemKind.Plate => Color.white,
        ItemKind.SaladDish => new Color(0.32f, 0.92f, 0.42f, 1f),
        ItemKind.BurgerDish => new Color(0.98f, 0.68f, 0.22f, 1f),
        _ => Color.gray
    };

    void ResetMatch(Mode startMode)
    {
        foreach (var t in _thrown) if (t.go != null) Destroy(t.go);
        foreach (var f in _fx) if (f.go != null) Destroy(f.go);
        _thrown.Clear();
        _fx.Clear();
        _orders.Clear();

        foreach (var st in _stations)
        {
            st.heldItem = ItemKind.None;
            st.progress = 0f;
            st.onFire = false;
            st.fireTimer = 0f;
            st.itemSr.enabled = false;
            st.barRoot.SetActive(false);
        }

        _mode = startMode;
        _chefPos = new Vector2(0, -1.2f);
        _chefHand = ItemKind.None;
        _chefItemSr.enabled = false;
        _roundTime = 90f;
        _score = 0;
        _combo = 0;
        _servedCount = 0;
        _orderSpawnCd = 0.5f;
        SpawnOrder();
        SpawnOrder();
    }

    void SpawnOrder()
    {
        if (_orders.Count >= 4) return;
        bool burger = UnityEngine.Random.value < 0.55f;
        _orders.Add(new OrderTicket
        {
            label = burger ? "BURGER (Patty->Stove + Bun + Plate)" : "SALAD (Tomato->Chop + Plate)",
            targetDish = burger ? ItemKind.BurgerDish : ItemKind.SaladDish,
            timeLeft = burger ? 38f : 28f,
            maxTime = burger ? 38f : 28f,
            reward = burger ? 140 : 90
        });
    }

    void Update()
    {
        float dt = Mathf.Min(0.05f, Time.deltaTime);
        UpdateFx(dt);

        if (_mode == Mode.Title || _mode == Mode.GameOver)
        {
            if (Input.GetKeyDown(KeyCode.Space) || Input.GetKeyDown(KeyCode.Return))
            {
                ResetMatch(Mode.Playing);
            }
            UpdateCamera(dt);
            return;
        }

        _roundTime -= dt;
        if (_roundTime <= 0f)
        {
            _roundTime = 0f;
            _mode = Mode.GameOver;
            return;
        }

        // Orders countdown
        _orderSpawnCd -= dt;
        if (_orderSpawnCd <= 0f)
        {
            _orderSpawnCd = 9.5f;
            SpawnOrder();
        }
        for (int i = _orders.Count - 1; i >= 0; i--)
        {
            _orders[i].timeLeft -= dt;
            if (_orders[i].timeLeft <= 0f)
            {
                _orders.RemoveAt(i);
                _combo = 0;
                _sfx.PlayOneShot(_clipAlarm);
            }
        }

        UpdateChefMovement(dt);
        UpdateStations(dt);
        UpdateThrownItems(dt);

        if (Input.GetKeyDown(KeyCode.Space) || Input.GetKeyDown(KeyCode.E))
        {
            InteractNearestStation();
        }
        if (Input.GetKeyDown(KeyCode.Q) || Input.GetMouseButtonDown(1))
        {
            ThrowHeldItem();
        }

        UpdateCamera(dt);
    }

    void UpdateChefMovement(float dt)
    {
        float ix = Input.GetAxisRaw("Horizontal");
        float iy = Input.GetAxisRaw("Vertical");

        if (Input.GetMouseButton(0) && GUIUtility.hotControl == 0 && Input.mousePosition.y < Screen.height - 68f)
        {
            Vector3 wp = _cam.ScreenToWorldPoint(Input.mousePosition);
            Vector2 d = new Vector2(wp.x - _chefPos.x, wp.y - _chefPos.y);
            if (d.magnitude > 0.25f)
            {
                d.Normalize();
                ix = d.x;
                iy = d.y;
            }
        }

        _dashCd -= dt;
        if ((Input.GetKeyDown(KeyCode.LeftShift) || Input.GetKeyDown(KeyCode.RightShift)) && _dashCd <= 0f)
        {
            _dashCd = 0.7f;
            _dashTime = 0.14f;
            for (int k = 0; k < 5; k++) SpawnFx(_chefPos, UnityEngine.Random.insideUnitCircle * 2f, 0.22f, 0.18f, Color.white);
        }

        float spd = _dashTime > 0f ? 12.5f : 5.6f;
        if (_dashTime > 0f) _dashTime -= dt;

        Vector2 dir = new Vector2(ix, iy);
        if (dir.sqrMagnitude > 0.01f)
        {
            dir.Normalize();
            _chefFacing = dir;
            _chefPos += dir * spd * dt;
        }

        _chefPos.x = Mathf.Clamp(_chefPos.x, -6.2f, 6.2f);
        _chefPos.y = Mathf.Clamp(_chefPos.y, -3.9f, 3.9f);
        _chefGo.transform.position = _chefPos;

        if (_chefHand != ItemKind.None)
        {
            _chefItemSr.enabled = true;
            _chefItemSr.color = ItemColor(_chefHand);
            _chefItemSr.transform.localPosition = _chefFacing * 0.55f;
        }
        else
        {
            _chefItemSr.enabled = false;
        }
    }

    Station FindNearestStation(float maxDist)
    {
        Station best = null;
        float bestD = maxDist;
        foreach (var st in _stations)
        {
            float d = Vector2.Distance(_chefPos, st.pos);
            if (d < bestD)
            {
                bestD = d;
                best = st;
            }
        }
        return best;
    }

    void InteractNearestStation()
    {
        var st = FindNearestStation(1.85f);
        if (st == null) return;

        // Crates dispense when hand is empty
        if (_chefHand == ItemKind.None)
        {
            if (st.kind == StationKind.CrateTomato) _chefHand = ItemKind.Tomato;
            else if (st.kind == StationKind.CratePatty) _chefHand = ItemKind.RawPatty;
            else if (st.kind == StationKind.CrateBun) _chefHand = ItemKind.Bun;
            else if (st.kind == StationKind.CratePlate) _chefHand = ItemKind.Plate;
            else if (st.heldItem != ItemKind.None)
            {
                _chefHand = st.heldItem;
                st.heldItem = ItemKind.None;
                st.progress = 0f;
            }
            if (_chefHand != ItemKind.None) _sfx.PlayOneShot(_clipPick);
            return;
        }

        // Trash discards anything
        if (st.kind == StationKind.Trash)
        {
            _chefHand = ItemKind.None;
            _sfx.PlayOneShot(_clipThrow);
            return;
        }

        // Serving belt submits completed dishes
        if (st.kind == StationKind.ServeBelt)
        {
            if (_chefHand == ItemKind.SaladDish || _chefHand == ItemKind.BurgerDish)
            {
                ServeDish(_chefHand);
                _chefHand = ItemKind.None;
            }
            return;
        }

        // Combine ingredients on station or plate!
        if (st.heldItem == ItemKind.None)
        {
            st.heldItem = _chefHand;
            _chefHand = ItemKind.None;
            st.progress = 0f;
            _sfx.PlayOneShot(_clipPick);
            if (st.kind == StationKind.Stove && st.heldItem == ItemKind.RawPatty)
            {
                _sfx.PlayOneShot(_clipSizzle);
            }
        }
        else
        {
            // Plating recipes
            ItemKind combined = TryCombine(st.heldItem, _chefHand);
            if (combined != ItemKind.None)
            {
                st.heldItem = combined;
                _chefHand = ItemKind.None;
                _sfx.PlayOneShot(_clipPick);
                SpawnFx(st.pos, Vector2.up * 1.5f, 0.25f, 0.2f, Color.yellow);
            }
        }
    }

    ItemKind TryCombine(ItemKind a, ItemKind b)
    {
        if ((a == ItemKind.Plate && b == ItemKind.ChoppedTomato) || (b == ItemKind.Plate && a == ItemKind.ChoppedTomato))
            return ItemKind.SaladDish;
        if ((a == ItemKind.Plate && b == ItemKind.CookedPatty) || (b == ItemKind.Plate && a == ItemKind.CookedPatty))
            return ItemKind.BurgerDish;
        if ((a == ItemKind.Bun && b == ItemKind.CookedPatty) || (b == ItemKind.Bun && a == ItemKind.CookedPatty))
            return ItemKind.BurgerDish;
        return ItemKind.None;
    }

    void ServeDish(ItemKind dish)
    {
        int matchIdx = _orders.FindIndex(o => o.targetDish == dish);
        if (matchIdx >= 0)
        {
            var ticket = _orders[matchIdx];
            _combo++;
            int pts = ticket.reward + _combo * 25;
            _score += pts;
            _servedCount++;
            _orders.RemoveAt(matchIdx);
            _sfx.PlayOneShot(_clipServe);
            _shakeTrauma = 0.2f;
            for (int k = 0; k < 12; k++) SpawnFx(new Vector2(0, -2.5f), UnityEngine.Random.insideUnitCircle * 4f, 0.4f, 0.22f, Color.green);
            SpawnOrder();
        }
        else
        {
            _score += 30;
            _sfx.PlayOneShot(_clipPick);
        }
    }

    void ThrowHeldItem()
    {
        if (_chefHand == ItemKind.None) return;
        var go = new GameObject("Thrown");
        go.transform.SetParent(_world.transform);
        go.transform.position = _chefPos;
        go.transform.localScale = new Vector3(0.45f, 0.45f, 1f);
        var sr = go.AddComponent<SpriteRenderer>();
        sr.sprite = _circleSprite;
        sr.color = ItemColor(_chefHand);
        sr.sortingOrder = 13;
        _thrown.Add(new ThrownItem { kind = _chefHand, pos = _chefPos, vel = _chefFacing * 10.5f, life = 0.35f, go = go });
        _chefHand = ItemKind.None;
        _sfx.PlayOneShot(_clipThrow);
    }

    void UpdateThrownItems(float dt)
    {
        for (int i = _thrown.Count - 1; i >= 0; i--)
        {
            var t = _thrown[i];
            t.life -= dt;
            t.pos += t.vel * dt;
            t.go.transform.position = t.pos;

            foreach (var st in _stations)
            {
                if (Vector2.Distance(t.pos, st.pos) < 0.7f && st.heldItem == ItemKind.None && st.kind != StationKind.ServeBelt)
                {
                    st.heldItem = t.kind;
                    st.progress = 0f;
                    t.life = 0f;
                    _sfx.PlayOneShot(_clipPick);
                    break;
                }
            }

            if (t.life <= 0f)
            {
                Destroy(t.go);
                _thrown.RemoveAt(i);
            }
        }
    }

    void UpdateStations(float dt)
    {
        _chopSfxCd -= dt;
        foreach (var st in _stations)
        {
            // Auto chop when Chef stands close to ChoppingBoard holding nothing or pressing F/Space
            if (st.kind == StationKind.ChoppingBoard && st.heldItem == ItemKind.Tomato)
            {
                if (Vector2.Distance(_chefPos, st.pos) < 1.65f)
                {
                    st.progress += dt * 0.75f;
                    if (_chopSfxCd <= 0f)
                    {
                        _chopSfxCd = 0.22f;
                        _sfx.PlayOneShot(_clipChop);
                        SpawnFx(st.pos, UnityEngine.Random.insideUnitCircle * 1.8f, 0.2f, 0.14f, Color.red);
                    }
                    if (st.progress >= 1f)
                    {
                        st.heldItem = ItemKind.ChoppedTomato;
                        st.progress = 0f;
                    }
                }
            }

            // Stove auto cooks RawPatty -> CookedPatty -> BurntPatty
            if (st.kind == StationKind.Stove && st.heldItem == ItemKind.RawPatty)
            {
                st.progress += dt * 0.32f;
                if (UnityEngine.Random.value < 0.15f) SpawnFx(st.pos, Vector2.up * 1.5f, 0.25f, 0.12f, new Color(1f, 0.75f, 0.3f, 0.8f));
                if (st.progress >= 1f)
                {
                    st.heldItem = ItemKind.CookedPatty;
                    st.progress = 0f;
                    _sfx.PlayOneShot(_clipServe);
                }
            }
            else if (st.kind == StationKind.Stove && st.heldItem == ItemKind.CookedPatty)
            {
                st.fireTimer += dt;
                if (st.fireTimer >= 7.5f)
                {
                    st.heldItem = ItemKind.BurntPatty;
                    st.onFire = true;
                    _sfx.PlayOneShot(_clipAlarm);
                    _shakeTrauma = 0.25f;
                }
            }

            // Visuals
            if (st.heldItem != ItemKind.None)
            {
                st.itemSr.enabled = true;
                st.itemSr.color = ItemColor(st.heldItem);
            }
            else
            {
                st.itemSr.enabled = false;
            }

            if (st.progress > 0.01f)
            {
                st.barRoot.SetActive(true);
                st.barFillSr.transform.localScale = new Vector3(0.9f * Mathf.Clamp01(st.progress), 0.7f, 1f);
                st.barFillSr.color = st.kind == StationKind.Stove ? new Color(1f, 0.6f, 0.2f, 1f) : Color.green;
            }
            else
            {
                st.barRoot.SetActive(false);
            }
        }
    }

    void SpawnFx(Vector2 pos, Vector2 vel, float maxLife, float size, Color c)
    {
        if (_fx.Count > 60) return;
        var go = new GameObject("KFx");
        go.transform.SetParent(_world.transform);
        go.transform.position = pos;
        go.transform.localScale = Vector3.one * size;
        var sr = go.AddComponent<SpriteRenderer>();
        sr.sprite = _circleSprite;
        sr.color = c;
        sr.sortingOrder = 15;
        _fx.Add(new FxDot { pos = pos, vel = vel, life = 0f, maxLife = maxLife, size = size, go = go });
    }

    void UpdateFx(float dt)
    {
        for (int i = _fx.Count - 1; i >= 0; i--)
        {
            var f = _fx[i];
            f.life += dt;
            if (f.life >= f.maxLife)
            {
                Destroy(f.go);
                _fx.RemoveAt(i);
                continue;
            }
            f.pos += f.vel * dt;
            f.go.transform.position = f.pos;
            float s = f.size * (1f - f.life / f.maxLife);
            f.go.transform.localScale = Vector3.one * s;
        }
    }

    void UpdateCamera(float dt)
    {
        _shakeTrauma = Mathf.Max(0f, _shakeTrauma - dt * 2f);
        float sh = _shakeTrauma * _shakeTrauma * 0.25f;
        _cam.transform.position = new Vector3(UnityEngine.Random.Range(-sh, sh), UnityEngine.Random.Range(-sh, sh), -10f);
    }

    void EnsureStyles()
    {
        if (_hudStyle != null) return;
        _hudStyle = new GUIStyle(GUI.skin.label) { fontSize = 15, fontStyle = FontStyle.Bold };
        _hudStyle.normal.textColor = Color.white;
        _titleStyle = new GUIStyle(GUI.skin.label) { fontSize = 32, fontStyle = FontStyle.Bold, alignment = TextAnchor.MiddleCenter };
        _titleStyle.normal.textColor = new Color(1f, 0.78f, 0.28f, 1f);
        _subStyle = new GUIStyle(GUI.skin.label) { fontSize = 15, alignment = TextAnchor.MiddleCenter, wordWrap = true };
        _subStyle.normal.textColor = Color.white;
        _btnStyle = new GUIStyle(GUI.skin.button) { fontSize = 14, fontStyle = FontStyle.Bold };
        _ticketStyle = new GUIStyle(GUI.skin.box) { fontSize = 12, fontStyle = FontStyle.Bold, alignment = TextAnchor.MiddleCenter };
    }

    void OnGUI()
    {
        EnsureStyles();
        float w = Screen.width;
        float h = Screen.height;

        if (_mode == Mode.Title)
        {
            GUI.Box(new Rect(w * 0.5f - 260, h * 0.5f - 145, 520, 290), "");
            GUI.Label(new Rect(w * 0.5f - 240, h * 0.5f - 125, 480, 48), "CHAOS KITCHEN — UNITY", _titleStyle);
            GUI.Label(new Rect(w * 0.5f - 240, h * 0.5f - 68, 480, 96),
                "WASD / Drag: Run & Dash (Shift)\nSpace / E: Pick Up, Place, Plate & Serve on Bottom Belt\nQ / Right-Click: Throw Ingredients Across Kitchen!",
                _subStyle);
            if (GUI.Button(new Rect(w * 0.5f - 110, h * 0.5f + 56, 220, 48), "OPEN KITCHEN", _btnStyle))
            {
                ResetMatch(Mode.Playing);
            }
            return;
        }

        // Top Order & Score Bar
        GUI.Box(new Rect(10, 8, w - 20, 52), "");
        GUI.Label(new Rect(22, 18, 220, 28), $"TIME {Mathf.CeilToInt(_roundTime)}s · SCORE {_score} (x{_combo})", _hudStyle);

        for (int i = 0; i < _orders.Count; i++)
        {
            var o = _orders[i];
            GUI.Box(new Rect(270 + i * 190, 12, 182, 42), $"{o.label.Split(' ')[0]} ({Mathf.CeilToInt(o.timeLeft)}s)", _ticketStyle);
        }

        // Mobile / Mouse friendly Interact & Throw buttons at bottom corners
        if (GUI.Button(new Rect(14, h - 54, 150, 42), "[Space] Interact", _btnStyle)) InteractNearestStation();
        if (GUI.Button(new Rect(174, h - 54, 140, 42), "[Q] Throw", _btnStyle)) ThrowHeldItem();

        if (_mode == Mode.GameOver)
        {
            GUI.Box(new Rect(w * 0.5f - 200, h * 0.5f - 105, 400, 210), "");
            GUI.Label(new Rect(w * 0.5f - 180, h * 0.5f - 85, 360, 46), "SHIFT COMPLETE!", _titleStyle);
            GUI.Label(new Rect(w * 0.5f - 180, h * 0.5f - 32, 360, 50), $"Dishes Served: {_servedCount}\nFinal Score: {_score}", _subStyle);
            if (GUI.Button(new Rect(w * 0.5f - 100, h * 0.5f + 36, 200, 44), "PLAY AGAIN", _btnStyle))
            {
                ResetMatch(Mode.Playing);
            }
        }
    }
}
