using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Sky Stack 3D: the web Stack Tower (src/components/games/StackTower.tsx, src/lib/games/stack-tower.ts)
// rebuilt as a 30-stage Unity game. Same core rule: a slab slides over the tower, you drop it,
// the overhang is sliced off and falls, a near-exact drop is "perfect" and keeps the full size.
// Three perfects in a row grow the slab back. Space, click or tap anywhere to drop.
public class StackTowerPlayer : MonoBehaviour
{
    const string Slug = "stack-tower";
    const int StageCount = 30;
    const float BlockH = 0.5f;
    const float Range = 4.6f;
    const float PerfectTol = 0.14f;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    struct StageDef { public int goal, zone, perfectsNeeded; public float speed, size, accel, sway; }
    static readonly string[] ZoneNames = { "Meadow Base", "Lantern Market", "Cloud Line", "Windy Spire", "Needle Tower", "Sky Crown" };
    static readonly Color[] SkyLow = { new Color(0.55f, 0.8f, 0.98f), new Color(0.98f, 0.72f, 0.55f), new Color(0.7f, 0.82f, 0.98f), new Color(0.6f, 0.75f, 0.85f), new Color(0.45f, 0.4f, 0.7f), new Color(0.2f, 0.18f, 0.4f) };
    static readonly Color[] SkyHigh = { new Color(0.3f, 0.55f, 0.9f), new Color(0.55f, 0.35f, 0.6f), new Color(0.35f, 0.55f, 0.95f), new Color(0.3f, 0.45f, 0.65f), new Color(0.15f, 0.12f, 0.35f), new Color(0.04f, 0.04f, 0.14f) };

    StageDef[] stages;
    int stageIdx;
    StageDef S => stages[stageIdx];

    class Block { public Transform t; public float x, z, w, d; }
    readonly List<Block> tower = new List<Block>();
    Block moving;
    char axis = 'x';
    float movePos, moveDir = 1f, curSpeed, swayT;
    int height, perfects, streak, score, stars;
    string endReason = "";

    Camera cam;
    Light sun;
    Transform root;
    GameObject backdrop;
    Material backdropMat, islandMat, cloudMat;
    Texture2D blockTex;
    readonly List<Transform> clouds = new List<Transform>();
    readonly List<GameObject> debris = new List<GameObject>();
    readonly List<(Transform t, float age)> rings = new List<(Transform, float)>();
    Bursts bursts;
    Synth synth;
    float camY, shake, menuOrbit;
    bool showStages;

    void Awake()
    {
        Application.targetFrameRate = 60;
        BuildStages();
        SetupScene();
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        LoadStage(stageIdx, false);
    }

    void BuildStages()
    {
        stages = new StageDef[StageCount];
        for (int i = 0; i < StageCount; i++)
        {
            int zone = i / 5, k = i % 5;
            stages[i] = new StageDef
            {
                zone = zone,
                goal = 8 + i,
                speed = 3.0f + i * 0.09f,
                size = zone == 4 ? 2.7f : zone == 5 ? 3.0f : 3.6f,
                accel = zone == 2 || zone >= 4 ? 0.035f : 0f,
                sway = zone == 3 || zone == 5 ? 0.35f : 0f,
                perfectsNeeded = zone == 5 ? 2 + k : 0,
            };
        }
    }

    void SetupScene()
    {
        cam = new GameObject("Camera").AddComponent<Camera>();
        cam.fieldOfView = 40f;
        cam.clearFlags = CameraClearFlags.SolidColor;
        cam.farClipPlane = 400f;

        sun = new GameObject("Sun").AddComponent<Light>();
        sun.type = LightType.Directional;
        sun.shadows = LightShadows.Soft;
        sun.shadowStrength = 0.45f;
        sun.intensity = 1.1f;
        sun.transform.rotation = Quaternion.Euler(50f, 30f, 0f);
        RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat;
        RenderSettings.ambientLight = new Color(0.55f, 0.55f, 0.62f);

        backdropMat = OiyoArcade.Textured(OiyoArcade.Art("ST/sky"));
        backdrop = OiyoArcade.Prim(PrimitiveType.Quad, "Backdrop", backdropMat, cam.transform);
        backdrop.transform.localPosition = new Vector3(0f, 0f, 300f);
        backdrop.transform.localScale = new Vector3(700f, 420f, 1f);

        blockTex = OiyoArcade.Art("ST/block");
        islandMat = OiyoArcade.Lit(Color.white, 0.1f, OiyoArcade.Art("ST/island", true));
        cloudMat = OiyoArcade.Transparent(OiyoArcade.Art("ST/cloud"), new Color(1f, 1f, 1f, 0.9f));
        for (int i = 0; i < 14; i++)
        {
            var c = OiyoArcade.Prim(PrimitiveType.Quad, "Cloud", cloudMat).transform;
            c.localScale = new Vector3(7f, 3.5f, 1f) * (0.7f + (i % 4) * 0.25f);
            clouds.Add(c);
        }
        bursts = new Bursts(transform, 0.9f);
        synth = new Synth(gameObject);
    }

    Color BlockColor(int i)
    {
        float baseHue = new[] { 0.02f, 0.1f, 0.55f, 0.45f, 0.75f, 0.9f }[S.zone];
        return OiyoArcade.Hsv(baseHue + i * 0.045f, 0.5f, 0.97f);
    }

    Block MakeBlock(float x, float z, float w, float d, int level, bool physics = false)
    {
        var mat = OiyoArcade.Lit(BlockColor(level), 0.35f, blockTex);
        var go = OiyoArcade.Prim(PrimitiveType.Cube, "Block" + level, mat, root, true);
        go.transform.position = new Vector3(x, level * BlockH + BlockH * 0.5f, z);
        go.transform.localScale = new Vector3(w, BlockH, d);
        return new Block { t = go.transform, x = x, z = z, w = w, d = d };
    }

    void LoadStage(int idx, bool ready = true)
    {
        stageIdx = Mathf.Clamp(idx, 0, StageCount - 1);
        if (root != null) Destroy(root.gameObject);
        foreach (var g in debris) if (g != null) Destroy(g);
        debris.Clear();
        rings.Clear();
        root = new GameObject("Tower").transform;
        tower.Clear();

        // floating island + pedestal (level 0 is the base slab)
        var island = OiyoArcade.Prim(PrimitiveType.Cylinder, "Island", islandMat, root);
        island.transform.position = new Vector3(0f, -1.6f, 0f);
        island.transform.localScale = new Vector3(7.5f, 1.6f, 7.5f);
        var under = OiyoArcade.Prim(PrimitiveType.Sphere, "Rock", OiyoArcade.Lit(new Color(0.45f, 0.36f, 0.3f), 0.1f), root);
        under.transform.position = new Vector3(0f, -3.6f, 0f);
        under.transform.localScale = new Vector3(7f, 4.5f, 7f);
        var ped = OiyoArcade.Prim(PrimitiveType.Cube, "Pedestal", OiyoArcade.Lit(new Color(0.9f, 0.88f, 0.84f), 0.2f, blockTex), root, true);
        ped.transform.position = new Vector3(0f, -0.4f, 0f);
        ped.transform.localScale = new Vector3(S.size + 0.6f, 0.8f, S.size + 0.6f);
        tower.Add(MakeBlock(0f, 0f, S.size, S.size, 0));

        height = 0; perfects = 0; streak = 0; score = 0; stars = 0;
        curSpeed = S.speed;
        axis = 'x';
        camY = 0f;
        endReason = "";
        SpawnMoving();
        for (int i = 0; i < clouds.Count; i++)
        {
            float a = i * 2.39f;
            float r = 11f + (i % 3) * 4f;
            clouds[i].position = new Vector3(Mathf.Cos(a) * r, 2f + i * 2.2f, Mathf.Sin(a) * r + 6f);
        }
        showStages = false;
        state = ready ? GameState.Ready : GameState.Menu;
    }

    Block Top => tower[tower.Count - 1];

    void SpawnMoving()
    {
        var top = Top;
        int level = tower.Count;
        movePos = -Range;
        moveDir = 1f;
        moving = axis == 'x' ? MakeBlock(movePos, top.z, top.w, top.d, level) : MakeBlock(top.x, movePos, top.w, top.d, level);
        Destroy(moving.t.GetComponent<Collider>());
    }

    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("stack-tower", state, score);
        ReadInput();
        float dt = Time.deltaTime;
        if (state == GameState.Playing && moving != null)
        {
            swayT += dt;
            float sp = curSpeed * (1f + S.sway * Mathf.Sin(swayT * 2.3f));
            movePos += moveDir * sp * dt;
            if (movePos > Range) { movePos = Range; moveDir = -1f; }
            if (movePos < -Range) { movePos = -Range; moveDir = 1f; }
            var p = moving.t.position;
            if (axis == 'x') { p.x = movePos; moving.x = movePos; } else { p.z = movePos; moving.z = movePos; }
            moving.t.position = p;
        }
        for (int i = rings.Count - 1; i >= 0; i--)
        {
            var (t, age) = rings[i];
            age += dt;
            if (t == null || age > 0.6f) { if (t != null) Destroy(t.gameObject); rings.RemoveAt(i); continue; }
            t.localScale = Vector3.one * (1f + age * 5f) * t.localScale.z;
            var r = t.GetComponent<Renderer>();
            var c = r.material.color; c.a = 1f - age / 0.6f; r.material.color = c;
            rings[i] = (t, age);
        }
        for (int i = debris.Count - 1; i >= 0; i--)
            if (debris[i] == null || debris[i].transform.position.y < -30f) { if (debris[i] != null) Destroy(debris[i]); debris.RemoveAt(i); }
        UpdateCamera(dt);
    }

    void ReadInput()
    {
        bool tap = Input.GetKeyDown(KeyCode.Space) || Input.GetKeyDown(KeyCode.Return) || OiyoArcade.Began().Count > 0;
        switch (state)
        {
            case GameState.Ready:
                if (tap) { state = GameState.Playing; swayT = 0f; }
                break;
            case GameState.Playing:
                if (Input.GetKeyDown(KeyCode.P) || Input.GetKeyDown(KeyCode.Escape)) { state = GameState.Paused; break; }
                if (tap) Drop();
                break;
            case GameState.Paused:
                if (Input.GetKeyDown(KeyCode.P) || Input.GetKeyDown(KeyCode.Escape)) state = GameState.Playing;
                break;
            case GameState.Victory:
            case GameState.GameOver:
                if (Input.GetKeyDown(KeyCode.Space) || Input.GetKeyDown(KeyCode.Return))
                    LoadStage(state == GameState.Victory ? Mathf.Min(stageIdx + 1, StageCount - 1) : stageIdx);
                break;
            case GameState.Menu:
                if (!showStages && (Input.GetKeyDown(KeyCode.Space) || Input.GetKeyDown(KeyCode.Return))) LoadStage(stageIdx);
                break;
        }
    }

    void Drop()
    {
        var top = Top;
        bool isX = axis == 'x';
        float pos = isX ? moving.x : moving.z;
        float topPos = isX ? top.x : top.z;
        float size = isX ? moving.w : moving.d;
        float diff = pos - topPos;
        float overlap = size - Mathf.Abs(diff);
        int level = tower.Count;

        if (overlap <= 0.02f)
        {
            // whole slab misses and falls
            var rb = moving.t.gameObject.AddComponent<BoxCollider>();
            var body = moving.t.gameObject.AddComponent<Rigidbody>();
            body.AddTorque(new Vector3(Random.Range(-3f, 3f), 0f, Random.Range(-3f, 3f)), ForceMode.VelocityChange);
            debris.Add(moving.t.gameObject);
            moving = null;
            endReason = U("The slab missed the tower!");
            Lose();
            return;
        }

        if (Mathf.Abs(diff) <= PerfectTol)
        {
            streak++;
            perfects++;
            float grow = streak >= 3 ? 0.18f : 0f;
            float nw = moving.w, nd = moving.d;
            if (isX) nw = Mathf.Min(S.size, top.w + grow); else nd = Mathf.Min(S.size, top.d + grow);
            moving.x = isX ? top.x : moving.x;
            moving.z = isX ? moving.z : top.z;
            moving.w = nw; moving.d = nd;
            moving.t.position = new Vector3(moving.x, level * BlockH + BlockH * 0.5f, moving.z);
            moving.t.localScale = new Vector3(nw, BlockH, nd);
            score += 10 + 15 * streak;
            Ring(moving);
            synth.Tone(440f * Mathf.Pow(1.06f, Mathf.Min(streak, 14)), 0.25f, Wave.Triangle, 0.35f, 0f, 5f);
            bursts.Emit(moving.t.position, new Color(1f, 1f, 0.8f), 14, 3.5f, 0.25f);
        }
        else
        {
            streak = 0;
            float newCenter = topPos + diff * 0.5f;
            float cutSize = Mathf.Abs(diff);
            float cutCenter = newCenter + Mathf.Sign(diff) * (overlap * 0.5f + cutSize * 0.5f);
            if (isX) { moving.x = newCenter; moving.w = overlap; } else { moving.z = newCenter; moving.d = overlap; }
            moving.t.position = new Vector3(moving.x, level * BlockH + BlockH * 0.5f, moving.z);
            moving.t.localScale = new Vector3(moving.w, BlockH, moving.d);
            var cut = isX ? MakeBlock(cutCenter, moving.z, cutSize, moving.d, level) : MakeBlock(moving.x, cutCenter, moving.w, cutSize, level);
            cut.t.SetParent(null, true);
            var rb = cut.t.gameObject.AddComponent<Rigidbody>();
            rb.AddForce(new Vector3(isX ? Mathf.Sign(diff) * 1.5f : 0f, 0.5f, isX ? 0f : Mathf.Sign(diff) * 1.5f), ForceMode.VelocityChange);
            rb.AddTorque(Random.insideUnitSphere * 4f, ForceMode.VelocityChange);
            debris.Add(cut.t.gameObject);
            score += 10;
            synth.Tone(180f, 0.12f, Wave.Noise, 0.2f, 0f, 18f);
            synth.Tone(260f, 0.15f, Wave.Triangle, 0.25f, 200f, 9f);
        }
        moving.t.gameObject.AddComponent<BoxCollider>();
        tower.Add(moving);
        height++;
        curSpeed += S.accel;
        shake = 0.08f;
        if (height >= S.goal)
        {
            moving = null;
            if (perfects >= S.perfectsNeeded) { Win(); return; }
            endReason = F("You needed {0} perfect drops", S.perfectsNeeded);
            Lose();
            return;
        }
        axis = axis == 'x' ? 'z' : 'x';
        SpawnMoving();
    }

    void Ring(Block b)
    {
        var q = OiyoArcade.Prim(PrimitiveType.Quad, "Ring", OiyoArcade.Transparent(OiyoArcade.Art("ST/ring"), new Color(1f, 1f, 1f, 1f)));
        q.transform.position = b.t.position + Vector3.down * (BlockH * 0.45f);
        q.transform.rotation = Quaternion.Euler(90f, 0f, 0f);
        float s = Mathf.Max(b.w, b.d) * 1.1f;
        q.transform.localScale = new Vector3(s, s, s);
        rings.Add((q.transform, 0f));
    }

    void Win()
    {
        state = GameState.Victory;
        stars = 1 + (perfects >= Mathf.CeilToInt(S.goal * 0.25f) ? 1 : 0) + (perfects >= Mathf.CeilToInt(S.goal * 0.5f) ? 1 : 0);
        OiyoArcade.Record(Slug, stageIdx, stars, score, StageCount);
        Vector3 top = Top.t.position + Vector3.up;
        bursts.Emit(top, new Color(1f, 0.85f, 0.3f), 40, 7f, 0.35f);
        bursts.Emit(top, new Color(0.5f, 0.9f, 1f), 40, 7f, 0.35f);
        StartCoroutine(Arp(new[] { 523f, 659f, 784f, 1047f, 1319f }, 0.09f));
    }

    void Lose()
    {
        state = GameState.GameOver;
        shake = 0.4f;
        synth.Tone(220f, 0.5f, Wave.Saw, 0.28f, 70f, 3f);
    }

    IEnumerator Arp(float[] notes, float gap)
    {
        foreach (var f in notes) { synth.Tone(f, 0.2f, Wave.Triangle, 0.3f, 0f, 6f); yield return new WaitForSeconds(gap); }
    }

    void UpdateCamera(float dt)
    {
        float targetY = Mathf.Max(0f, tower.Count * BlockH - 1f);
        bool overview = state == GameState.Victory || state == GameState.GameOver;
        float dist = 15f + (cam.aspect < 1f ? 9f : 0f);
        if (overview) { dist += tower.Count * BlockH * 0.9f; targetY = tower.Count * BlockH * 0.45f; }
        camY = Mathf.Lerp(camY, targetY, dt * 3f);
        float yaw = 45f;
        if (state == GameState.Menu) { menuOrbit += dt * 12f; yaw += menuOrbit; }
        var rot = Quaternion.Euler(28f, yaw, 0f);
        Vector3 pos = new Vector3(0f, camY + 1.5f, 0f) + rot * new Vector3(0f, 0f, -dist);
        if (shake > 0f) { pos += Random.insideUnitSphere * shake; shake = Mathf.MoveTowards(shake, 0f, dt); }
        cam.transform.SetPositionAndRotation(pos, rot);

        float h01 = Mathf.Clamp01(tower.Count / 40f);
        var sky = Color.Lerp(SkyLow[S.zone], SkyHigh[S.zone], h01);
        cam.backgroundColor = sky;
        // keep the sky quad just larger than the view so it is never stretched past its pixels
        float viewH = 2f * 300f * Mathf.Tan(cam.fieldOfView * 0.5f * Mathf.Deg2Rad) * 1.08f;
        backdrop.transform.localScale = new Vector3(Mathf.Max(viewH * cam.aspect * 1.08f, viewH * 1.25f), viewH, 1f);
        backdropMat.color = Color.Lerp(Color.white, SkyHigh[S.zone] * 1.4f, h01 * 0.6f);
        foreach (var c in clouds)
        {
            c.rotation = cam.transform.rotation;
            c.position += Vector3.right * dt * 0.4f;
            if (c.position.x > 22f) c.position -= Vector3.right * 44f;
        }
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.95f, 0.45f, 0.3f, 0.97f);
    static readonly Color Dark = new Color(0.06f, 0.07f, 0.14f, 0.82f);
    static readonly Color Gold = new Color(1f, 0.8f, 0.25f, 0.97f);
    static readonly Color Slate = new Color(0.22f, 0.27f, 0.4f, 0.95f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + U(ZoneNames[stages[i].zone]);
    string GoalText()
    {
        string g = F("Stack {0} floors", S.goal);
        if (S.perfectsNeeded > 0) g += " · " + F("{0} perfect drops", S.perfectsNeeded);
        return g;
    }

    void OnGUI()
    {
        OiyoArcade.Begin();
        float w = OiyoArcade.W, h = OiyoArcade.H;
        if (state == GameState.Menu) { DrawMenu(w, h); return; }
        var bar = new Rect(8f, 8f, w - 16f, 58f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 12f, w - 140f, 24f), "<b>" + StageTitle(stageIdx) + "</b>", 16, new Color(1f, 0.85f, 0.7f));
        string info = $"{U("Floors")} <b>{height}/{S.goal}</b>   {U("Perfect")} <b>{perfects}</b>   {U("Score")} <b>{score}</b>";
        OiyoArcade.Text(new Rect(20f, 36f, w - 140f, 24f), info, 15, Color.white);
        if (OiyoArcade.Button(new Rect(w - 64f, 14f, 46f, 46f), "<b>II</b>", Slate, 18))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        OiyoArcade.Bar(new Rect(16f, 70f, w - 32f, 8f), height / (float)S.goal, new Color(0f, 0f, 0f, 0.35f), Gold);
        if (streak >= 2 && state == GameState.Playing)
            OiyoArcade.Shadowed(new Rect(0f, 86f, w, 30f), F("Perfect x{0}", streak), 22, Gold, TextAnchor.MiddleCenter);

        if (state == GameState.Ready)
        {
            var r = new Rect(w * 0.5f - 170f, h - 150f, 340f, 84f);
            OiyoArcade.Panel(r, Dark);
            OiyoArcade.Text(new Rect(r.x + 12f, r.y + 8f, r.width - 24f, r.height - 16f),
                $"<b>{U("Tap or press Space to drop the slab")}</b>\n<size=14>{GoalText()}</size>", 17, Color.white, TextAnchor.MiddleCenter);
        }
        if (state == GameState.Paused) DrawPause(w, h);
        if (state == GameState.Victory || state == GameState.GameOver) DrawResult(w, h);
    }

    void DrawMenu(float w, float h)
    {
        if (showStages)
        {
            float bw = Mathf.Min(w - 16f, 760f);
            var box = new Rect(w * 0.5f - bw * 0.5f, 12f, bw, h - 24f);
            OiyoArcade.Panel(box, new Color(0.05f, 0.06f, 0.12f, 0.93f));
            OiyoArcade.Text(new Rect(box.x + 16f, box.y + 12f, box.width - 120f, 30f), "<b>" + U("Choose a stage") + "</b>", 20, Color.white);
            OiyoArcade.Text(new Rect(box.x + 16f, box.y + 40f, box.width - 32f, 22f), $"★ {OiyoArcade.TotalStars(Slug, StageCount)}/{StageCount * 3}", 15, Gold);
            if (OiyoArcade.Button(new Rect(box.xMax - 100f, box.y + 12f, 86f, 40f), U("Back"), Slate, 16)) showStages = false;
            int pick = OiyoArcade.StageGrid(new Rect(box.x + 14f, box.y + 70f, box.width - 28f, box.height - 84f), Slug, StageCount, Accent, U("Stage"));
            if (pick >= 0) LoadStage(pick);
            return;
        }
        float cw = Mathf.Min(380f, w - 24f);
        var card = new Rect(w * 0.5f - cw * 0.5f, h * 0.5f - 170f, cw, 340f);
        OiyoArcade.Panel(card, Dark);
        OiyoArcade.Shadowed(new Rect(card.x, card.y + 18f, cw, 40f), U("Sky Stack 3D"), 30, new Color(1f, 0.85f, 0.65f), TextAnchor.MiddleCenter);
        OiyoArcade.Text(new Rect(card.x + 20f, card.y + 62f, cw - 40f, 46f), U("Drop each slab right on top. Whatever hangs over gets sliced off."), 15, new Color(1f, 1f, 1f, 0.85f), TextAnchor.MiddleCenter);
        OiyoArcade.Text(new Rect(card.x, card.y + 110f, cw, 24f), StageTitle(stageIdx), 15, Gold, TextAnchor.MiddleCenter);
        if (OiyoArcade.Button(new Rect(card.x + 24f, card.y + 142f, cw - 48f, 58f), "<b>▶ " + F("Play stage {0}", stageIdx + 1) + "</b>", Accent, 21)) LoadStage(stageIdx);
        if (OiyoArcade.Button(new Rect(card.x + 24f, card.y + 210f, cw - 48f, 46f), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}", Slate, 17)) showStages = true;
        if (OiyoArcade.Button(new Rect(card.x + 24f, card.y + 266f, cw - 48f, 46f), "Aa  " + OiyoArcade.Lang.ToUpperInvariant(), Slate, 17)) OiyoArcade.NextLang();
    }

    void DrawPause(float w, float h)
    {
        float cw = Mathf.Min(340f, w - 24f);
        var card = new Rect(w * 0.5f - cw * 0.5f, h * 0.5f - 130f, cw, 260f);
        OiyoArcade.Panel(card, Dark);
        OiyoArcade.Shadowed(new Rect(card.x, card.y + 16f, cw, 36f), U("Paused"), 26, Color.white, TextAnchor.MiddleCenter);
        if (OiyoArcade.Button(new Rect(card.x + 24f, card.y + 70f, cw - 48f, 52f), "▶ " + U("Resume"), Accent, 19)) state = GameState.Playing;
        if (OiyoArcade.Button(new Rect(card.x + 24f, card.y + 132f, cw - 48f, 46f), U("Restart"), Slate, 17)) LoadStage(stageIdx);
        if (OiyoArcade.Button(new Rect(card.x + 24f, card.y + 188f, cw - 48f, 46f), U("Stage list"), Slate, 17)) { LoadStage(stageIdx, false); showStages = true; }
    }

    void DrawResult(float w, float h)
    {
        bool won = state == GameState.Victory;
        float cw = Mathf.Min(360f, w - 24f);
        // sized to its buttons so a loss card has no empty band at the bottom
        float ch = 140f + (won ? 58f : 0f) + 52f + 40f + 18f;
        var card = new Rect(w * 0.5f - cw * 0.5f, h - ch - 30f, cw, ch);
        OiyoArcade.Panel(card, Dark);
        OiyoArcade.Shadowed(new Rect(card.x, card.y + 14f, cw, 38f), won ? U("Stage clear!") : U("Game over"), 28, won ? new Color(0.6f, 1f, 0.65f) : new Color(1f, 0.55f, 0.5f), TextAnchor.MiddleCenter);
        string detail = won ? $"<size=30>{OiyoArcade.StarString(stars)}</size>" : endReason;
        OiyoArcade.Text(new Rect(card.x + 16f, card.y + 56f, cw - 32f, 44f), detail, 16, Color.white, TextAnchor.MiddleCenter);
        OiyoArcade.Text(new Rect(card.x + 16f, card.y + 102f, cw - 32f, 24f), $"{U("Score")} <b>{score}</b>   {U("Floors")} <b>{height}/{S.goal}</b>", 16, Color.white, TextAnchor.MiddleCenter);
        float y = card.y + 140f;
        if (won && stageIdx < StageCount - 1)
        {
            if (OiyoArcade.Button(new Rect(card.x + 24f, y, cw - 48f, 50f), "<b>" + U("Next stage") + " ▶</b>", Accent, 19)) LoadStage(stageIdx + 1);
            y += 58f;
        }
        else if (won)
        {
            OiyoArcade.Text(new Rect(card.x, y, cw, 50f), "★ " + U("You cleared all 30 stages!") + " ★", 17, Gold, TextAnchor.MiddleCenter);
            y += 58f;
        }
        if (OiyoArcade.Button(new Rect(card.x + 24f, y, cw - 48f, 44f), U("Retry"), won ? Slate : Accent, 17)) LoadStage(stageIdx);
        y += 52f;
        if (OiyoArcade.Button(new Rect(card.x + 24f, y, cw - 48f, 40f), U("Stage list"), Slate, 16)) { LoadStage(stageIdx, false); showStages = true; }
    }
}
