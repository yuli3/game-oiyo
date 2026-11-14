using System.Collections.Generic;
using UnityEngine;

public sealed class StacklandsPlayer : MonoBehaviour
{
    enum CardType
    {
        Villager,
        Militia,
        BerryBush,
        Berry,
        Tree,
        Wood,
        Rock,
        Stone,
        House,
        Goblin
    }

    sealed class Card
    {
        public int Id;
        public CardType Type;
        public GameObject Go;
        public Vector3 Pos;
        public Vector3 Vel;
        public Card Parent;
        public Card Child;
        public float WorkTimer;
        public float WorkDuration;
        public int Hp;
        public int MaxHp;
        public float AttackTimer;
    }

    Camera _cam;
    readonly List<Card> _cards = new List<Card>();
    int _nextId = 1;
    Card _dragged;
    Vector3 _dragOffset;

    int _moon = 1;
    const int MaxMoons = 8;
    float _moonTimer;
    const float MoonDuration = 35f;
    int _coins = 6;
    bool _gameOver;
    bool _victory;
    string _bannerMsg = "Drag Villagers onto Berry Bushes, Trees, or Rocks!";
    float _bannerTimer = 4f;

    readonly Vector3 _sellZonePos = new Vector3(7.5f, 0.05f, 2.5f);
    readonly Vector3 _packZonePos = new Vector3(-7.5f, 0.05f, 2.5f);

    readonly Dictionary<CardType, Material> _mats = new Dictionary<CardType, Material>();
    Material _tableMat;
    Material _sellMat;
    Material _packMat;

    void Start()
    {
        Application.targetFrameRate = 60;
        CreateMaterials();
        SetupCameraAndLight();
        BuildTable();
        ResetVillage();
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
        _tableMat = MakeMat(new Color(0.16f, 0.24f, 0.18f));
        _sellMat = MakeMat(new Color(0.78f, 0.58f, 0.14f));
        _packMat = MakeMat(new Color(0.42f, 0.24f, 0.65f));

        _mats[CardType.Villager] = MakeMat(new Color(0.24f, 0.54f, 0.88f));
        _mats[CardType.Militia] = MakeMat(new Color(0.16f, 0.36f, 0.72f));
        _mats[CardType.BerryBush] = MakeMat(new Color(0.22f, 0.58f, 0.28f));
        _mats[CardType.Berry] = MakeMat(new Color(0.88f, 0.26f, 0.38f));
        _mats[CardType.Tree] = MakeMat(new Color(0.18f, 0.44f, 0.22f));
        _mats[CardType.Wood] = MakeMat(new Color(0.58f, 0.36f, 0.18f));
        _mats[CardType.Rock] = MakeMat(new Color(0.48f, 0.50f, 0.54f));
        _mats[CardType.Stone] = MakeMat(new Color(0.66f, 0.68f, 0.72f));
        _mats[CardType.House] = MakeMat(new Color(0.84f, 0.62f, 0.34f));
        _mats[CardType.Goblin] = MakeMat(new Color(0.68f, 0.22f, 0.18f));
    }

    void SetupCameraAndLight()
    {
        var camGo = new GameObject("Main Camera");
        camGo.tag = "MainCamera";
        _cam = camGo.AddComponent<Camera>();
        _cam.clearFlags = CameraClearFlags.SolidColor;
        _cam.backgroundColor = new Color(0.09f, 0.13f, 0.10f);
        _cam.fieldOfView = 45f;
        camGo.transform.position = new Vector3(0f, 15.5f, -7.5f);
        camGo.transform.rotation = Quaternion.Euler(64f, 0f, 0f);

        var lightGo = new GameObject("Sun");
        var l = lightGo.AddComponent<Light>();
        l.type = LightType.Directional;
        l.intensity = 1.25f;
        l.color = new Color(1.0f, 0.96f, 0.88f);
        lightGo.transform.rotation = Quaternion.Euler(55f, -25f, 0f);
    }

    void BuildTable()
    {
        var table = GameObject.CreatePrimitive(PrimitiveType.Plane);
        table.transform.position = Vector3.zero;
        table.transform.localScale = new Vector3(2.2f, 1f, 1.4f);
        table.GetComponent<Renderer>().material = _tableMat;

        var sellPad = GameObject.CreatePrimitive(PrimitiveType.Cube);
        sellPad.transform.position = _sellZonePos;
        sellPad.transform.localScale = new Vector3(2.4f, 0.08f, 2.6f);
        sellPad.GetComponent<Renderer>().material = _sellMat;

        var packPad = GameObject.CreatePrimitive(PrimitiveType.Cube);
        packPad.transform.position = _packZonePos;
        packPad.transform.localScale = new Vector3(2.4f, 0.08f, 2.6f);
        packPad.GetComponent<Renderer>().material = _packMat;
    }

    void ResetVillage()
    {
        for (int i = 0; i < _cards.Count; i++) Destroy(_cards[i].Go);
        _cards.Clear();
        _nextId = 1;
        _dragged = null;
        _moon = 1;
        _moonTimer = 0f;
        _coins = 6;
        _gameOver = false;
        _victory = false;

        SpawnCard(CardType.Villager, new Vector3(-2.0f, 0.15f, -1.5f));
        SpawnCard(CardType.Villager, new Vector3(0.0f, 0.15f, -1.5f));
        SpawnCard(CardType.BerryBush, new Vector3(-3.0f, 0.15f, 1.2f));
        SpawnCard(CardType.Tree, new Vector3(0.0f, 0.15f, 1.4f));
        SpawnCard(CardType.Rock, new Vector3(3.0f, 0.15f, 1.2f));
        SpawnCard(CardType.Berry, new Vector3(2.0f, 0.15f, -1.8f));
        SpawnCard(CardType.Berry, new Vector3(3.2f, 0.15f, -1.8f));
        SetBanner("Stack Villagers on resources! Sell extras on the Gold Pad.");
    }

    Card SpawnCard(CardType type, Vector3 pos)
    {
        var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
        go.name = type.ToString();
        go.transform.position = pos;
        go.transform.localScale = new Vector3(1.35f, 0.16f, 1.85f);
        go.GetComponent<Renderer>().material = _mats[type];

        int hp = type == CardType.Villager ? 8 : (type == CardType.Militia ? 15 : (type == CardType.Goblin ? 7 + _moon * 2 : 99));
        var c = new Card
        {
            Id = _nextId++,
            Type = type,
            Go = go,
            Pos = new Vector3(pos.x, 0.12f, pos.z),
            Vel = new Vector3(Random.Range(-0.5f, 0.5f), 0f, Random.Range(-0.5f, 0.5f)),
            Hp = hp,
            MaxHp = hp
        };
        _cards.Add(c);
        return c;
    }

    void SetBanner(string msg)
    {
        _bannerMsg = msg;
        _bannerTimer = 3.2f;
    }

    Vector3 PointerOnTable()
    {
        var ray = _cam.ScreenPointToRay(Input.mousePosition);
        if (new Plane(Vector3.up, Vector3.zero).Raycast(ray, out float enter))
        {
            return ray.GetPoint(enter);
        }
        return Vector3.zero;
    }

    void Update()
    {
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        if (_bannerTimer > 0f) _bannerTimer -= dt;

        if (_gameOver || _victory)
        {
            if (Input.GetKeyDown(KeyCode.R)) ResetVillage();
            return;
        }

        HandlePointer();
        UpdateStacksAndCrafting(dt);
        UpdateCombat(dt);
        UpdatePhysics(dt);

        _moonTimer += dt;
        if (_moonTimer >= MoonDuration)
        {
            _moonTimer = 0f;
            ResolveMoonEnd();
        }
    }

    void HandlePointer()
    {
        Vector3 pt = PointerOnTable();

        if (Input.GetMouseButtonDown(0))
        {
            // Check Booster Pack Pad click
            if (Vector3.Distance(new Vector3(pt.x, 0f, pt.z), new Vector3(_packZonePos.x, 0f, _packZonePos.z)) < 1.6f)
            {
                BuyBoosterPack();
                return;
            }

            Card best = null;
            float bestDist = 1.35f;
            for (int i = _cards.Count - 1; i >= 0; i--)
            {
                var c = _cards[i];
                if (c.Type == CardType.Goblin) continue;
                float d = Vector2.Distance(new Vector2(pt.x, pt.z), new Vector2(c.Pos.x, c.Pos.z));
                if (d < bestDist)
                {
                    bestDist = d;
                    best = c;
                }
            }

            if (best != null)
            {
                DetachFromParent(best);
                _dragged = best;
                _dragOffset = best.Pos - pt;
                _dragOffset.y = 0f;
            }
        }
        else if (Input.GetMouseButton(0) && _dragged != null)
        {
            Vector3 target = pt + _dragOffset;
            _dragged.Pos = new Vector3(Mathf.Clamp(target.x, -8.5f, 8.5f), 0.75f, Mathf.Clamp(target.z, -5.2f, 5.2f));
            _dragged.Vel = Vector3.zero;
            MoveChain(_dragged);
        }
        else if (Input.GetMouseButtonUp(0) && _dragged != null)
        {
            var dropped = _dragged;
            _dragged = null;
            dropped.Pos.y = 0.12f;

            // Check Sell Zone
            if (Vector3.Distance(new Vector3(dropped.Pos.x, 0f, dropped.Pos.z), new Vector3(_sellZonePos.x, 0f, _sellZonePos.z)) < 1.6f)
            {
                if (dropped.Type != CardType.Villager && dropped.Type != CardType.Militia)
                {
                    int val = SellValue(dropped.Type);
                    _coins += val;
                    SetBanner($"Sold {dropped.Type} for +{val} Coins!");
                    RemoveCard(dropped);
                    return;
                }
                else
                {
                    SetBanner("Cannot sell Villagers!");
                }
            }

            // Snap onto nearest compatible stack root/top
            Card targetCard = FindDropTarget(dropped);
            if (targetCard != null)
            {
                AttachStack(targetCard, dropped);
            }
        }
    }

    void BuyBoosterPack()
    {
        if (_coins < 3)
        {
            SetBanner("Need 3 Coins to open a Booster Pack!");
            return;
        }
        _coins -= 3;
        CardType[] pool = { CardType.BerryBush, CardType.Tree, CardType.Rock, CardType.Wood, CardType.Stone, CardType.Berry };
        for (int i = 0; i < 3; i++)
        {
            var t = pool[Random.Range(0, pool.Length)];
            var c = SpawnCard(t, new Vector3(-5.0f + i * 1.6f, 0.3f, 2.2f));
            c.Vel = new Vector3(Random.Range(-1.5f, 1.5f), 0f, Random.Range(-1.5f, 1.5f));
        }
        SetBanner("Opened Booster Pack! +3 Cards");
    }

    int SellValue(CardType t)
    {
        switch (t)
        {
            case CardType.Berry: return 1;
            case CardType.Wood: return 2;
            case CardType.Stone: return 3;
            case CardType.House: return 6;
            default: return 2;
        }
    }

    void DetachFromParent(Card c)
    {
        if (c.Parent != null)
        {
            c.Parent.Child = null;
            c.Parent.WorkTimer = 0f;
            c.Parent = null;
        }
    }

    void MoveChain(Card root)
    {
        Card cur = root.Child;
        int depth = 1;
        while (cur != null)
        {
            cur.Pos = root.Pos + new Vector3(0f, depth * 0.14f, -depth * 0.38f);
            cur = cur.Child;
            depth++;
        }
    }

    Card FindDropTarget(Card dropped)
    {
        Card best = null;
        float bestDist = 1.5f;
        for (int i = 0; i < _cards.Count; i++)
        {
            var c = _cards[i];
            if (c == dropped || c.Child != null || c.Type == CardType.Goblin) continue;
            if (IsDescendant(dropped, c)) continue;
            float d = Vector2.Distance(new Vector2(dropped.Pos.x, dropped.Pos.z), new Vector2(c.Pos.x, c.Pos.z));
            if (d < bestDist)
            {
                bestDist = d;
                best = c;
            }
        }
        return best;
    }

    bool IsDescendant(Card parent, Card maybeChild)
    {
        Card cur = parent.Child;
        while (cur != null)
        {
            if (cur == maybeChild) return true;
            cur = cur.Child;
        }
        return false;
    }

    void AttachStack(Card bottom, Card top)
    {
        bottom.Child = top;
        top.Parent = bottom;
        top.WorkTimer = 0f;
        bottom.WorkTimer = 0f;
        MoveChain(GetRoot(bottom));
    }

    Card GetRoot(Card c)
    {
        while (c.Parent != null) c = c.Parent;
        return c;
    }

    void UpdateStacksAndCrafting(float dt)
    {
        for (int i = _cards.Count - 1; i >= 0; i--)
        {
            var bottom = _cards[i];
            if (bottom.Child == null) continue;
            var top = bottom.Child;

            bool valid = false;
            float duration = 3.0f;
            CardType result = CardType.Berry;
            bool consumeTop = false;
            bool consumeBottom = false;
            bool upgradeTopToMilitia = false;

            // Worker on Resource
            if ((top.Type == CardType.Villager || top.Type == CardType.Militia) &&
                (bottom.Type == CardType.BerryBush || bottom.Type == CardType.Tree || bottom.Type == CardType.Rock))
            {
                valid = true;
                duration = top.Type == CardType.Militia ? 3.2f : 2.4f;
                result = bottom.Type == CardType.BerryBush ? CardType.Berry : (bottom.Type == CardType.Tree ? CardType.Wood : CardType.Stone);
            }
            // Wood + Stone -> House (if Villager on top or direct)
            else if ((bottom.Type == CardType.Wood && top.Type == CardType.Stone) || (bottom.Type == CardType.Stone && top.Type == CardType.Wood))
            {
                valid = true;
                duration = 2.5f;
                result = CardType.House;
                consumeBottom = true;
                consumeTop = true;
            }
            // Villager + Stone -> Militia!
            else if ((bottom.Type == CardType.Villager && top.Type == CardType.Stone) || (bottom.Type == CardType.Stone && top.Type == CardType.Villager))
            {
                valid = true;
                duration = 2.2f;
                upgradeTopToMilitia = true;
            }

            if (!valid)
            {
                bottom.WorkDuration = 0f;
                continue;
            }

            bottom.WorkDuration = duration;
            bottom.WorkTimer += dt;
            if (bottom.WorkTimer >= duration)
            {
                bottom.WorkTimer = 0f;
                if (upgradeTopToMilitia)
                {
                    Card v = bottom.Type == CardType.Villager ? bottom : top;
                    Card s = bottom.Type == CardType.Stone ? bottom : top;
                    DetachFromParent(top);
                    v.Type = CardType.Militia;
                    v.Hp = 15;
                    v.MaxHp = 15;
                    v.Go.GetComponent<Renderer>().material = _mats[CardType.Militia];
                    RemoveCard(s);
                    SetBanner("Trained a Militia Defender!");
                }
                else if (consumeBottom && consumeTop)
                {
                    Vector3 spawnPos = bottom.Pos;
                    DetachFromParent(top);
                    RemoveCard(top);
                    RemoveCard(bottom);
                    SpawnCard(result, spawnPos);
                    if (result == CardType.House)
                    {
                        SpawnCard(CardType.Villager, spawnPos + new Vector3(1.5f, 0f, 0f));
                        SetBanner("Built a House! +1 Villager joined!");
                    }
                }
                else
                {
                    var spawned = SpawnCard(result, bottom.Pos + new Vector3(Random.Range(-1.4f, 1.4f), 0.3f, -1.6f));
                    spawned.Vel = new Vector3(Random.Range(-2f, 2f), 0f, Random.Range(-2f, -0.5f));
                }
            }
        }
    }

    void UpdateCombat(float dt)
    {
        for (int i = _cards.Count - 1; i >= 0; i--)
        {
            var g = _cards[i];
            if (g.Type != CardType.Goblin) continue;

            // Find nearest Villager or Militia
            Card target = null;
            float minD = 999f;
            for (int j = 0; j < _cards.Count; j++)
            {
                var c = _cards[j];
                if (c.Type != CardType.Villager && c.Type != CardType.Militia) continue;
                float d = Vector3.Distance(g.Pos, c.Pos);
                if (d < minD)
                {
                    minD = d;
                    target = c;
                }
            }

            if (target != null)
            {
                Vector3 dir = (target.Pos - g.Pos);
                dir.y = 0f;
                if (dir.magnitude > 1.3f)
                {
                    g.Pos += dir.normalized * (1.8f * dt);
                }
                else
                {
                    g.AttackTimer += dt;
                    if (g.AttackTimer >= 1.1f)
                    {
                        g.AttackTimer = 0f;
                        target.Hp -= 2;
                        g.Hp -= (target.Type == CardType.Militia ? 3 : 1);
                        target.Vel += dir.normalized * 2.5f;
                        g.Vel -= dir.normalized * 2.5f;
                        if (target.Hp <= 0)
                        {
                            RemoveCard(target);
                        }
                        if (g.Hp <= 0)
                        {
                            _coins += 3;
                            SetBanner("Goblin defeated! +3 Coins");
                            RemoveCard(g);
                            continue;
                        }
                    }
                }
            }
        }
    }

    void UpdatePhysics(float dt)
    {
        // Soft card separation & damping
        for (int i = 0; i < _cards.Count; i++)
        {
            var a = _cards[i];
            if (a == _dragged || a.Parent != null) continue;

            for (int j = i + 1; j < _cards.Count; j++)
            {
                var b = _cards[j];
                if (b == _dragged || b.Parent != null) continue;
                Vector3 d = a.Pos - b.Pos;
                d.y = 0f;
                float dist = d.magnitude;
                if (dist > 0.001f && dist < 1.35f)
                {
                    Vector3 push = d.normalized * ((1.35f - dist) * 6.0f * dt);
                    a.Vel += push;
                    b.Vel -= push;
                }
            }

            a.Pos += a.Vel * dt;
            a.Vel *= Mathf.Exp(-7f * dt);
            a.Pos.x = Mathf.Clamp(a.Pos.x, -8.2f, 8.2f);
            a.Pos.z = Mathf.Clamp(a.Pos.z, -5.0f, 5.0f);
            a.Pos.y = 0.12f;
            MoveChain(a);
        }

        for (int i = 0; i < _cards.Count; i++)
        {
            var c = _cards[i];
            c.Go.transform.position = c.Pos;
            float tilt = (c == _dragged) ? -10f : 0f;
            c.Go.transform.rotation = Quaternion.Euler(tilt, 0f, 0f);
        }
    }

    void ResolveMoonEnd()
    {
        int villagers = 0;
        int foodNeeded = 0;
        var berries = new List<Card>();
        for (int i = 0; i < _cards.Count; i++)
        {
            var c = _cards[i];
            if (c.Type == CardType.Villager) { villagers++; foodNeeded += 2; }
            else if (c.Type == CardType.Militia) { villagers++; foodNeeded += 1; }
            else if (c.Type == CardType.Berry) berries.Add(c);
        }

        if (villagers == 0)
        {
            _gameOver = true;
            return;
        }

        int fed = Mathf.Min(berries.Count, foodNeeded);
        for (int i = 0; i < fed; i++) RemoveCard(berries[i]);

        if (fed < foodNeeded)
        {
            SetBanner("Starvation! Not enough Berries for all Villagers!");
            _gameOver = true;
            return;
        }

        _moon++;
        if (_moon > MaxMoons)
        {
            _victory = true;
            return;
        }

        // Spawn goblin raid from Moon 2+
        int goblins = _moon >= 2 ? (_moon / 2) : 0;
        for (int i = 0; i < goblins; i++)
        {
            SpawnCard(CardType.Goblin, new Vector3(Random.Range(-5f, 5f), 0.12f, 4.4f));
        }
        SetBanner($"Moon {_moon} dawned! {(goblins > 0 ? $"Goblin raid ({goblins})!" : "Peaceful sunrise.")}");
    }

    void RemoveCard(Card c)
    {
        if (c.Child != null)
        {
            c.Child.Parent = null;
            c.Child = null;
        }
        DetachFromParent(c);
        Destroy(c.Go);
        _cards.Remove(c);
    }

    void OnGUI()
    {
        var bold = new GUIStyle(GUI.skin.box) { fontSize = 14, fontStyle = FontStyle.Bold };
        int berries = 0, villagers = 0;
        for (int i = 0; i < _cards.Count; i++)
        {
            if (_cards[i].Type == CardType.Berry) berries++;
            if (_cards[i].Type == CardType.Villager || _cards[i].Type == CardType.Militia) villagers++;
        }

        GUI.Box(new Rect(14, 12, 430, 62), "");
        GUI.Label(new Rect(24, 18, 410, 24), $"STACKLANDS UNITY  |  MOON {_moon}/{MaxMoons}  |  COINS: {_coins}  |  FOOD: {berries}", bold);
        GUI.Label(new Rect(24, 44, 410, 22), $"Villagers: {villagers}  •  Next Moon: {Mathf.CeilToInt(MoonDuration - _moonTimer)}s  •  Click Purple Pad (3c) for Pack");

        if (_bannerTimer > 0f)
        {
            GUI.Box(new Rect(Screen.width * 0.5f - 210, 14, 420, 30), _bannerMsg, bold);
        }

        // World-space card labels & progress bars
        var labelStyle = new GUIStyle(GUI.skin.label) { alignment = TextAnchor.MiddleCenter, fontSize = 11, fontStyle = FontStyle.Bold };
        for (int i = 0; i < _cards.Count; i++)
        {
            var c = _cards[i];
            Vector3 sp = _cam.WorldToScreenPoint(c.Pos + new Vector3(0f, 0.25f, 0.5f));
            if (sp.z <= 0f) continue;
            float sx = sp.x;
            float sy = Screen.height - sp.y;
            string txt = c.Type.ToString();
            if (c.Type == CardType.Villager || c.Type == CardType.Militia || c.Type == CardType.Goblin)
            {
                txt += $" ({c.Hp})";
            }
            GUI.Label(new Rect(sx - 50, sy - 10, 100, 20), txt, labelStyle);

            if (c.WorkDuration > 0f && c.WorkTimer > 0f)
            {
                float pct = Mathf.Clamp01(c.WorkTimer / c.WorkDuration);
                GUI.Box(new Rect(sx - 30, sy - 24, 60, 8), "");
                GUI.DrawTexture(new Rect(sx - 29, sy - 23, 58 * pct, 6), Texture2D.whiteTexture);
            }
        }

        if (_gameOver || _victory)
        {
            GUI.Box(new Rect(Screen.width * 0.5f - 160, Screen.height * 0.5f - 50, 320, 100), "");
            GUI.Label(new Rect(Screen.width * 0.5f - 140, Screen.height * 0.5f - 32, 280, 28), _victory ? "VILLAGE SURVIVED ALL 8 MOONS!" : "VILLAGE FELL", bold);
            if (GUI.Button(new Rect(Screen.width * 0.5f - 65, Screen.height * 0.5f + 8, 130, 28), "Play Again (R)"))
            {
                ResetVillage();
            }
        }
    }
}
