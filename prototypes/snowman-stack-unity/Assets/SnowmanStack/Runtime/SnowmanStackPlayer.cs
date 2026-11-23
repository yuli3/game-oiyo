using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Snowman Stack 3D: the web Snowman Stack (src/components/games/SnowmanStack.tsx,
// src/lib/games/snowman-stack.ts) rebuilt as a 30-stage Unity game. A trolley swings left and
// right above the stack; tap to drop the snowball it carries. Sticky snow welds a piece to
// whatever part of the snowman it touches first, and the snowman rocks on a packed-snow pivot
// at its base: a centred stick barely moves it, a lopsided one sets it rocking, and past the
// tip angle it falls. Wind drifts falling pieces and leans tall snowmen. A piece that misses
// the snowman, or a base that misses the field, stump or pond, ends the stage. Every piece
// placed and the snowman standing still for 1.5 s clears it; stars come from how centred the
// sticks were, as on the web. The web's 20 stages plus 10 more (taller, windier, icier).
// The web uses matter-js; this build keeps the same world (480x720 px, platform top at 640)
// with a small rigid-body model of the same pin-and-spring snowman so it runs the same on phones.
public class SnowmanStackPlayer : MonoBehaviour
{
    const string Slug = "snowman-stack";
    const int StageCount = 30;
    const float WorldW = 480f, PlatY = 640f, DropGap = 100f, RailMinY = 70f;
    const float HatW = 46f, HatH = 32f, TipAngle = 0.42f;
    const float FallG = 1000f;          // px/s^2, as matter-js gravity 1
    const float SettleTime = 1.5f, Reload = 0.4f;
    const float K = 0.01f;              // world units per px

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    enum Ground { Field, Stump, Ice }
    struct Spring { public float k, damp, tip; public Spring(float k, float d, float t) { this.k = k; damp = d; tip = t; } }
    static Spring SpringOf(Ground g) => g == Ground.Stump ? new Spring(0.0034f, 0.93f, TipAngle * 0.85f) : g == Ground.Ice ? new Spring(0.003f, 0.95f, TipAngle) : new Spring(0.0042f, 0.93f, TipAngle);

    // radius > 0 is a snowball, 0 is the hat
    struct Row { public Ground g; public float w, amp, omega, wind; public int[] pieces; public Row(Ground g, float w, float a, float o, float wind, params int[] p) { this.g = g; this.w = w; amp = a; omega = o; this.wind = wind; pieces = p; } }
    static readonly Row[] Rows =
    {
        new Row(Ground.Field, 300, 120, 1.5f, 0, 52, 40, 30),
        new Row(Ground.Field, 300, 125, 1.6f, 0, 52, 40, 30, 0),
        new Row(Ground.Field, 280, 130, 1.7f, 0, 50, 42, 34, 26),
        new Row(Ground.Field, 280, 140, 1.9f, 0, 54, 40, 30, 0),
        new Row(Ground.Stump, 110, 130, 1.8f, 0, 50, 38, 28),
        new Row(Ground.Field, 280, 140, 1.9f, 0.35f, 50, 40, 32, 0),
        new Row(Ground.Field, 280, 145, 2.0f, 0, 42, 52, 30, 0),
        new Row(Ground.Field, 260, 150, 2.0f, 0.25f, 52, 44, 36, 28, 0),
        new Row(Ground.Ice, 300, 140, 1.9f, 0.25f, 50, 40, 30, 0),
        new Row(Ground.Stump, 100, 145, 2.1f, 0, 48, 38, 30, 0),
        new Row(Ground.Field, 260, 150, 2.1f, 0.2f, 54, 46, 40, 34, 28, 0),
        new Row(Ground.Field, 260, 150, 2.2f, 0.55f, 52, 40, 30, 0),
        new Row(Ground.Field, 260, 150, 2.2f, 0.3f, 44, 52, 44, 30, 0),
        new Row(Ground.Ice, 280, 150, 2.2f, 0.45f, 50, 42, 32, 24, 0),
        new Row(Ground.Stump, 96, 150, 2.3f, 0.2f, 46, 40, 34, 28),
        new Row(Ground.Field, 250, 155, 2.4f, 0.35f, 54, 46, 38, 30, 24, 0),
        new Row(Ground.Field, 250, 155, 2.4f, 0.3f, 38, 50, 38, 50, 30, 0),
        new Row(Ground.Ice, 260, 155, 2.5f, 0.55f, 52, 44, 36, 28, 0),
        new Row(Ground.Stump, 104, 155, 2.5f, 0.2f, 54, 46, 38, 30, 24, 0),
        new Row(Ground.Field, 240, 160, 2.6f, 0.25f, 58, 50, 44, 38, 32, 26, 20, 0),
        // stages 21-30 (Unity only)
        new Row(Ground.Ice, 250, 160, 2.6f, 0.4f, 54, 46, 38, 30, 0),
        new Row(Ground.Stump, 96, 160, 2.6f, 0.3f, 50, 42, 34, 26, 0),
        new Row(Ground.Field, 240, 165, 2.7f, 0.5f, 56, 48, 40, 34, 28, 22, 0),
        new Row(Ground.Ice, 240, 165, 2.7f, 0.35f, 52, 52, 40, 30, 0),
        new Row(Ground.Stump, 92, 165, 2.8f, 0.35f, 48, 40, 34, 28, 22, 0),
        new Row(Ground.Field, 230, 170, 2.8f, 0.6f, 54, 44, 36, 30, 24, 0),
        new Row(Ground.Ice, 230, 170, 2.9f, 0.5f, 56, 48, 40, 34, 28, 22, 0),
        new Row(Ground.Stump, 90, 170, 2.9f, 0.4f, 52, 44, 38, 32, 26, 20, 0),
        new Row(Ground.Field, 220, 175, 3.0f, 0.65f, 58, 50, 44, 38, 32, 26, 20, 0),
        new Row(Ground.Ice, 220, 175, 3.1f, 0.55f, 58, 50, 44, 38, 32, 26, 20, 0),
    };
    static readonly string[] ZoneNames = { "Snowy field", "Tree stump", "Frozen pond" };

    int stageIdx;
    Row S => Rows[stageIdx];
    float Grip => 0.8f - 0.35f * stageIdx / (StageCount - 1);
    float Phase => (stageIdx * 1.3f) % (Mathf.PI * 2f);

    class Piece { public float r; public bool hat; public float lx, ly; public float x, y, vx, vy; public bool stuck, falling; public float offset = -1f; public Transform t; }
    readonly List<Piece> pieces = new List<Piece>();
    Piece carried;
    int next;
    bool pinned;
    float pivotX, theta, omega, clock, sinceDrop, still, stepAcc;
    bool won, tipping;
    int score, stars;
    string endReason = "";
    string popup = ""; float popupTimer; Color popupColor;

    Camera cam;
    Transform root, trolley, rail, platformT, backdrop, guide;
    Material snowMat;
    Bursts bursts;
    Synth synth;
    bool showStages;
    float shake, camTop = 300f, camBottom = 720f;
    readonly List<Transform> flakes = new List<Transform>();

    void Awake()
    {
        Application.targetFrameRate = 60;
        SetupScene();
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        LoadStage(stageIdx, false);
    }

    void SetupScene()
    {
        cam = new GameObject("Camera").AddComponent<Camera>();
        cam.fieldOfView = 34f;
        cam.clearFlags = CameraClearFlags.SolidColor;
        cam.backgroundColor = new Color(0.17f, 0.23f, 0.4f);
        var key = new GameObject("Key").AddComponent<Light>();
        key.type = LightType.Directional;
        key.intensity = 0.95f;
        key.color = new Color(1f, 0.92f, 0.86f);
        key.transform.rotation = Quaternion.Euler(35f, 40f, 0f);
        RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat;
        RenderSettings.ambientLight = new Color(0.55f, 0.6f, 0.72f);
        snowMat = OiyoArcade.Lit(Color.white, 0.35f, OiyoArcade.Art("SM/snow", true));
        bursts = new Bursts(transform, 0.8f);
        synth = new Synth(gameObject);
    }

    // px (y down) -> world
    static Vector3 W(float x, float y, float z = 0f) => new Vector3((x - WorldW / 2f) * K, (PlatY - y) * K, z);

    void BuildScene()
    {
        backdrop = OiyoArcade.Prim(PrimitiveType.Quad, "Backdrop", OiyoArcade.Textured(OiyoArcade.Art("SM/backdrop")), root).transform;
        backdrop.localScale = new Vector3(24f, 12f, 1f);
        backdrop.position = new Vector3(0f, 3.4f, 9f);
        var field = OiyoArcade.Prim(PrimitiveType.Quad, "Snowfield", OiyoArcade.Lit(new Color(0.62f, 0.7f, 0.86f), 0.2f, OiyoArcade.Art("SM/snow", true)), root);
        field.transform.rotation = Quaternion.Euler(90f, 0f, 0f);
        field.transform.position = new Vector3(0f, -0.8f, 0f);
        field.transform.localScale = new Vector3(40f, 40f, 1f);
        var g = S.g;
        float pw = S.w * K;
        if (g == Ground.Stump)
        {
            var bark = OiyoArcade.Prim(PrimitiveType.Cylinder, "Stump", OiyoArcade.Lit(new Color(0.36f, 0.24f, 0.15f), 0.2f), root);
            bark.transform.position = new Vector3(0f, -0.4f, 0f);
            bark.transform.localScale = new Vector3(pw, 0.4f, pw);
            var top = OiyoArcade.Prim(PrimitiveType.Quad, "Rings", OiyoArcade.Lit(Color.white, 0.2f, OiyoArcade.Art("SM/stump")), root);
            top.transform.rotation = Quaternion.Euler(90f, 0f, 0f);
            top.transform.position = new Vector3(0f, 0.002f, 0f);
            top.transform.localScale = new Vector3(pw * 1.02f, pw * 1.02f, 1f);
            platformT = bark.transform;
        }
        else
        {
            var mat = g == Ground.Ice ? OiyoArcade.Lit(Color.white, 0.95f, OiyoArcade.Art("SM/ice")) : OiyoArcade.Lit(new Color(0.86f, 0.92f, 1f), 0.3f, OiyoArcade.Art("SM/snow", true));
            var block = OiyoArcade.Prim(PrimitiveType.Cube, "Platform", mat, root);
            block.transform.position = new Vector3(0f, -0.4f, 0f);
            block.transform.localScale = new Vector3(pw, 0.8f, 1.6f);
            platformT = block.transform;
            for (int s = -1; s <= 1; s += 2)
            {
                var lip = OiyoArcade.Prim(PrimitiveType.Sphere, "Drift", snowMat, root);
                lip.transform.position = new Vector3(s * pw * 0.5f, -0.3f, 0f);
                lip.transform.localScale = new Vector3(0.7f, 0.6f, 1.7f);
            }
        }
        rail = OiyoArcade.Prim(PrimitiveType.Cylinder, "Rail", OiyoArcade.Lit(new Color(0.55f, 0.35f, 0.25f), 0.4f), root).transform;
        rail.rotation = Quaternion.Euler(0f, 0f, 90f);
        rail.localScale = new Vector3(0.05f, (S.amp * 2f + 120f) * K * 0.5f, 0.05f);
        trolley = new GameObject("Trolley").transform;
        trolley.SetParent(root, false);
        var cart = OiyoArcade.Prim(PrimitiveType.Cube, "Cart", OiyoArcade.Lit(new Color(0.85f, 0.25f, 0.22f), 0.5f), trolley);
        cart.transform.localScale = new Vector3(0.36f, 0.14f, 0.2f);
        cart.transform.localPosition = new Vector3(0f, 0.05f, 0f);
        for (int s = -1; s <= 1; s += 2)
        {
            var arm = OiyoArcade.Prim(PrimitiveType.Cube, "Claw", OiyoArcade.Lit(new Color(0.3f, 0.3f, 0.35f), 0.6f, null, 0.5f), trolley);
            arm.transform.localScale = new Vector3(0.04f, 0.22f, 0.04f);
            arm.transform.localPosition = new Vector3(s * 0.16f, -0.1f, 0f);
        }
        // a faint line from the carried piece straight down, to help line up the drop
        guide = OiyoArcade.Prim(PrimitiveType.Quad, "Guide", OiyoArcade.Transparent(OiyoArcade.GlowTexture(), new Color(1f, 1f, 1f, 0.35f)), root).transform;
        flakes.Clear();
        var flakeMat = OiyoArcade.Transparent(OiyoArcade.GlowTexture(), new Color(1f, 1f, 1f, 0.85f));
        for (int i = 0; i < 46; i++)
        {
            var f = OiyoArcade.Prim(PrimitiveType.Quad, "Flake", flakeMat, root).transform;
            f.localScale = Vector3.one * Random.Range(0.04f, 0.1f);
            f.position = new Vector3(Random.Range(-4f, 4f), Random.Range(-0.5f, 8f), Random.Range(-1.5f, 3f));
            flakes.Add(f);
        }
    }

    Piece MakePiece(int spec)
    {
        var p = new Piece { r = spec > 0 ? spec : HatH / 2f + 2f, hat = spec == 0 };
        p.t = new GameObject(p.hat ? "Hat" : "Ball").transform;
        p.t.SetParent(root, false);
        if (p.hat)
        {
            var black = OiyoArcade.Lit(new Color(0.08f, 0.08f, 0.1f), 0.5f);
            var brim = OiyoArcade.Prim(PrimitiveType.Cylinder, "Brim", black, p.t);
            brim.transform.localPosition = new Vector3(0f, -HatH * 0.42f * K, 0f);
            brim.transform.localScale = new Vector3(HatW * 1.25f * K, 0.02f, HatW * 1.25f * K);
            var crown = OiyoArcade.Prim(PrimitiveType.Cylinder, "Crown", black, p.t);
            crown.transform.localScale = new Vector3(HatW * 0.8f * K, HatH * 0.5f * K, HatW * 0.8f * K);
            var band = OiyoArcade.Prim(PrimitiveType.Cylinder, "Band", OiyoArcade.Lit(new Color(0.85f, 0.2f, 0.2f), 0.5f), p.t);
            band.transform.localPosition = new Vector3(0f, -HatH * 0.25f * K, 0f);
            band.transform.localScale = new Vector3(HatW * 0.82f * K, 0.03f, HatW * 0.82f * K);
        }
        else
        {
            var ball = OiyoArcade.Prim(PrimitiveType.Sphere, "Snow", snowMat, p.t);
            ball.transform.localScale = Vector3.one * spec * 2f * K;
            ball.transform.localRotation = Random.rotation;
        }
        return p;
    }

    float HalfH(Piece p) => p.hat ? HatH / 2f : p.r * 0.96f;

    void LoadStage(int idx, bool ready = true)
    {
        stageIdx = Mathf.Clamp(idx, 0, StageCount - 1);
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("World").transform;
        pieces.Clear();
        BuildScene();
        next = 0; pinned = false; won = tipping = false;
        theta = omega = clock = still = stepAcc = 0f;
        sinceDrop = Reload;
        score = stars = 0;
        endReason = ""; popup = "";
        carried = null;
        LoadCarried();
        camTop = TrolleyY() - 80f;
        showStages = false;
        state = ready ? GameState.Ready : GameState.Menu;
        Sync(0f);
    }

    void LoadCarried()
    {
        carried = next < S.pieces.Length ? MakePiece(S.pieces[next]) : null;
    }

    // ---------------- Model ----------------
    float TrolleyX() => WorldW / 2f + S.amp * Mathf.Sin(S.omega * clock + Phase);
    float StackTop()
    {
        float top = PlatY;
        foreach (var p in pieces) if (p.stuck) top = Mathf.Min(top, p.y - HalfH(p));
        return top;
    }
    float TrolleyY()
    {
        float half = carried != null ? HalfH(carried) : 20f;
        return Mathf.Max(RailMinY + half, StackTop() - DropGap + half);
    }
    float WindAt()
    {
        if (S.wind <= 0f) return 0f;
        return S.wind * (0.55f + 0.45f * Mathf.Sin(clock * 0.9f + stageIdx)) * (Mathf.Sin(clock * 0.23f + stageIdx * 2) >= -0.2f ? 1f : -1f);
    }

    bool CanDrop()
    {
        if (state != GameState.Playing || carried == null || sinceDrop < Reload) return false;
        foreach (var p in pieces) if (p.falling) return false;
        return true;
    }

    void Drop()
    {
        if (!CanDrop()) return;
        var p = carried;
        p.x = TrolleyX(); p.y = TrolleyY(); p.vx = 0f; p.vy = 0f; p.falling = true;
        pieces.Add(p);
        next++;
        sinceDrop = 0f;
        still = 0f;
        LoadCarried();
        synth.Tone(660f, 0.08f, Wave.Triangle, 0.2f, 440f, 18f);
    }

    void PlaceWorld(Piece p)
    {
        float c = Mathf.Cos(theta), s = Mathf.Sin(theta);
        p.x = pivotX + p.lx * c - p.ly * s;
        p.y = PlatY + p.lx * s + p.ly * c;
    }

    // one 60 Hz step, so the web's per-step spring constants carry over
    void Step()
    {
        const float dt = 1f / 60f;
        clock += dt;
        sinceDrop += dt;
        float wind = WindAt();
        foreach (var p in pieces)
        {
            if (!p.falling) continue;
            p.vy += FallG * dt;
            p.vx += wind * 40f * dt;
            p.x += p.vx * dt; p.y += p.vy * dt;
            if (state == GameState.Playing) Contact(p);
            if (state != GameState.Playing) return;
        }
        if (pinned && !tipping)
        {
            var sp = SpringOf(S.g);
            float height = PlatY - StackTop();
            float num = 0f, den = 0f, c = Mathf.Cos(theta), s = Mathf.Sin(theta);
            foreach (var p in pieces)
            {
                if (!p.stuck) continue;
                float m = p.r * p.r;
                num += m * (p.lx * c - p.ly * s);
                den += m * (4f * (p.lx * p.lx + p.ly * p.ly) + 0.5f * p.r * p.r);
            }
            float gravity = den > 0f ? FallG * 1.6f * num / den / 3600f : 0f;
            omega = omega * sp.damp - sp.k * Grip * theta + gravity + wind * 0.00009f * (height / 100f);
            theta += omega;
            foreach (var p in pieces) if (p.stuck) PlaceWorld(p);
            if (Mathf.Abs(theta) > sp.tip) { TipOver(); return; }
            if (next >= S.pieces.Length && carried == null)
            {
                bool allStuck = true;
                foreach (var p in pieces) if (!p.stuck) allStuck = false;
                still = allStuck && Mathf.Abs(omega) < 0.0015f ? still + dt : 0f;
                if (still >= SettleTime) Win();
            }
        }
    }

    void Contact(Piece p)
    {
        float half = HalfH(p);
        if (!pinned)
        {
            if (p.y + half < PlatY) return;
            if (Mathf.Abs(p.x - WorldW / 2f) <= S.w / 2f)
            {
                // the base packs into the snow and becomes the pivot
                p.falling = false; p.stuck = true;
                p.offset = Mathf.Abs(p.x - WorldW / 2f);
                pinned = true; pivotX = p.x; theta = 0f; omega = 0f;
                p.lx = 0f; p.ly = -half; p.y = PlatY - half;
                Thud(p, 0.5f);
                return;
            }
            if (p.y - half > PlatY + 10f) Miss(p);
            return;
        }
        // touches the snowman?
        Piece hit = null; float best = float.MaxValue;
        foreach (var q in pieces)
        {
            if (!q.stuck) continue;
            float dx = p.x - q.x, dy = p.y - q.y;
            float d = Mathf.Sqrt(dx * dx + dy * dy);
            float reach = (p.hat ? HatH / 2f + 4f : p.r) + (q.hat ? HatH / 2f : q.r * 0.96f);
            if (d < reach && d < best) { best = d; hit = q; }
        }
        if (hit != null)
        {
            float dx = p.x - hit.x, dy = p.y - hit.y;
            float d = Mathf.Max(0.001f, Mathf.Sqrt(dx * dx + dy * dy));
            float reach = (p.hat ? HatH / 2f + 2f : p.r * 0.96f) + (hit.hat ? HatH / 2f : hit.r * 0.96f) - 2f;
            p.x = hit.x + dx / d * reach; p.y = hit.y + dy / d * reach;
            // into the snowman's frame
            float c = Mathf.Cos(-theta), s = Mathf.Sin(-theta);
            float wx = p.x - pivotX, wy = p.y - PlatY;
            p.lx = wx * c - wy * s; p.ly = wx * s + wy * c;
            p.falling = false; p.stuck = true;
            p.offset = Mathf.Abs(p.x - hit.x);
            float mass = 0f; foreach (var q in pieces) if (q.stuck) mass += q.r * q.r;
            float vyStep = Mathf.Min(6f, p.vy / 60f);
            // a lopsided stick sets the snowman rocking (lighter pieces less)
            omega += (p.x - hit.x) / 4000f * vyStep * 0.5f * (p.r * p.r / mass) * 3f;
            Thud(p, Mathf.Clamp01(p.offset / 30f));
            return;
        }
        if (p.y + half >= PlatY && Mathf.Abs(p.x - WorldW / 2f) <= S.w / 2f + half) Miss(p);
        else if (p.y - half > PlatY + 60f || p.x < -100f || p.x > WorldW + 100f) Miss(p);
    }

    void Thud(Piece p, float off)
    {
        bursts.Emit(W(p.x, p.y + HalfH(p) * 0.8f, -0.1f), Color.white, 14, 1.6f, 0.12f, 0.5f);
        synth.Tone(130f + p.r, 0.16f, Wave.Noise, 0.25f, 0f, 14f);
        synth.Tone(220f - off * 60f, 0.12f, Wave.Sine, 0.25f, 140f, 10f);
        if (off < 0.25f) Popup(U("Perfect!"), new Color(0.6f, 0.95f, 1f));
        shake = Mathf.Max(shake, 0.08f + off * 0.12f);
    }

    void Miss(Piece p)
    {
        endReason = U("A snowball missed the snowman.");
        state = GameState.GameOver;
        p.falling = true;
        synth.Tone(300f, 0.4f, Wave.Saw, 0.22f, 120f, 5f);
    }

    void TipOver()
    {
        tipping = true;
        endReason = U("The snowman tipped over!");
        state = GameState.GameOver;
        shake = 0.3f;
        synth.Tone(180f, 0.6f, Wave.Saw, 0.25f, 70f, 3f);
    }

    void Win()
    {
        won = true;
        float sum = 0f; int n = 0;
        foreach (var p in pieces) if (p.offset >= 0f) { sum += p.offset; n++; }
        float avg = n > 0 ? sum / n : 0f;
        stars = avg <= 7f ? 3 : avg <= 16f ? 2 : 1;
        float precision = 0f; foreach (var p in pieces) precision += Mathf.Max(0f, 40f - Mathf.Max(0f, p.offset) * 2f);
        score = 100 + Mathf.RoundToInt(precision) + Mathf.RoundToInt(PlatY - StackTop()) + stars * 50;
        state = GameState.Victory;
        OiyoArcade.Record(Slug, stageIdx, stars, score, StageCount);
        Decorate();
        StartCoroutine(Arp(new[] { 523f, 659f, 784f, 1047f, 1319f }, 0.09f));
    }

    // coal eyes, a carrot nose and twig arms appear once the snowman stands
    void Decorate()
    {
        Piece head = null, body = null;
        foreach (var p in pieces) if (!p.hat) { body = head; head = p; }
        if (head == null) return;
        var coal = OiyoArcade.Lit(new Color(0.06f, 0.06f, 0.07f), 0.3f);
        float r = head.r * K;
        for (int s = -1; s <= 1; s += 2)
        {
            var eye = OiyoArcade.Prim(PrimitiveType.Sphere, "Eye", coal, head.t);
            eye.transform.localPosition = new Vector3(s * r * 0.35f, r * 0.25f, -r * 0.88f);
            eye.transform.localScale = Vector3.one * r * 0.18f;
        }
        var nose = OiyoArcade.Prim(PrimitiveType.Cylinder, "Carrot", OiyoArcade.Lit(new Color(1f, 0.5f, 0.1f), 0.4f), head.t);
        nose.transform.localPosition = new Vector3(0f, 0f, -r * 1.1f);
        nose.transform.localRotation = Quaternion.Euler(90f, 0f, 0f);
        nose.transform.localScale = new Vector3(r * 0.16f, r * 0.3f, r * 0.16f);
        if (body != null && body != head)
        {
            float br = body.r * K;
            var twig = OiyoArcade.Lit(new Color(0.35f, 0.22f, 0.12f), 0.2f);
            for (int s = -1; s <= 1; s += 2)
            {
                var arm = OiyoArcade.Prim(PrimitiveType.Cylinder, "Arm", twig, body.t);
                arm.transform.localPosition = new Vector3(s * br * 1.15f, br * 0.25f, 0f);
                arm.transform.localRotation = Quaternion.Euler(0f, 0f, s * 60f);
                arm.transform.localScale = new Vector3(0.025f, br * 0.55f, 0.025f);
            }
        }
        bursts.Emit(W(head.x, head.y), new Color(1f, 0.9f, 0.5f), 40, 3f, 0.2f, 0.9f);
    }

    void Popup(string t, Color c) { popup = t; popupColor = c; popupTimer = 0.8f; }

    IEnumerator Arp(float[] fs, float gap)
    {
        foreach (var f in fs) { synth.Tone(f, 0.2f, Wave.Triangle, 0.3f, 0f, 6f); yield return new WaitForSeconds(gap); }
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("snowman-stack", state, score);
        float dt = Mathf.Min(Time.deltaTime, 0.1f);
        ReadInput();
        if (state == GameState.Playing)
        {
            stepAcc += dt;
            while (stepAcc >= 1f / 60f && state == GameState.Playing) { stepAcc -= 1f / 60f; Step(); }
        }
        else if (state == GameState.Menu || state == GameState.Ready) clock += dt;
        else if (state == GameState.GameOver) AfterLoss(dt);
        Sync(dt);
        UpdateCamera(dt);
    }

    // the fall plays out after a loss
    void AfterLoss(float dt)
    {
        if (tipping && Mathf.Abs(theta) < 1.7f)
        {
            omega += Mathf.Sign(theta == 0f ? 1f : theta) * 6f * dt * dt;
            theta += omega * 60f * dt * 0.5f;
            foreach (var p in pieces) if (p.stuck) PlaceWorld(p);
        }
        foreach (var p in pieces)
        {
            if (!p.falling) continue;
            if (p.y > PlatY + 400f) continue;
            p.vy += FallG * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        }
    }

    void ReadInput()
    {
        bool confirm = Input.GetKeyDown(KeyCode.Space) || Input.GetKeyDown(KeyCode.Return) || Input.GetKeyDown(KeyCode.DownArrow);
        var presses = OiyoArcade.Began();
        switch (state)
        {
            case GameState.Ready:
                // the first tap both starts the stage and drops the first snowball
                if (confirm || presses.Count > 0) { state = GameState.Playing; sinceDrop = Reload; Drop(); }
                return;
            case GameState.Playing:
                if (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P)) { state = GameState.Paused; return; }
                if (confirm || presses.Count > 0) Drop();
                return;
            case GameState.Paused:
                if (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P)) state = GameState.Playing;
                return;
            case GameState.Victory:
            case GameState.GameOver:
                if (Input.GetKeyDown(KeyCode.Space) || Input.GetKeyDown(KeyCode.Return)) LoadStage(state == GameState.Victory ? Mathf.Min(stageIdx + 1, StageCount - 1) : stageIdx);
                return;
            case GameState.Menu:
                if (!showStages && confirm) LoadStage(stageIdx);
                return;
        }
    }

    // ---------------- View ----------------
    void Sync(float dt)
    {
        popupTimer -= dt;
        if (trolley == null) return;
        float tx = TrolleyX(), ty = TrolleyY();
        trolley.position = W(tx, ty - (carried != null ? HalfH(carried) : 20f) - 10f, 0f);
        rail.position = W(WorldW / 2f, ty - (carried != null ? HalfH(carried) : 20f) - 6f, 0.05f);
        if (carried != null) carried.t.position = W(tx, ty, 0f);
        bool aiming = carried != null && (state == GameState.Playing || state == GameState.Ready);
        guide.gameObject.SetActive(aiming);
        if (aiming)
        {
            float from = ty + HalfH(carried), to = StackTop();
            guide.position = W(tx, (from + to) * 0.5f, 0.02f);
            guide.localScale = new Vector3(0.05f, Mathf.Max(0.05f, (to - from) * K), 1f);
        }
        foreach (var p in pieces)
        {
            p.t.position = W(p.x, p.y, 0f);
            if (p.stuck) p.t.rotation = Quaternion.Euler(0f, 0f, -theta * Mathf.Rad2Deg);
            else if (p.falling && !p.hat) p.t.Rotate(0f, 0f, -p.vx * dt * 0.8f);
        }
        float windNow = WindAt();
        foreach (var f in flakes)
        {
            f.position += new Vector3(windNow * 1.4f + Mathf.Sin(Time.time + f.position.y) * 0.1f, -0.6f, 0f) * dt;
            if (f.position.y < -0.8f) f.position = new Vector3(Random.Range(-4f, 4f), cam.transform.position.y + 4f, f.position.z);
            if (f.position.x > 5f) f.position -= new Vector3(10f, 0f, 0f);
            if (f.position.x < -5f) f.position += new Vector3(10f, 0f, 0f);
            f.rotation = cam.transform.rotation;
        }
    }

    void UpdateCamera(float dt)
    {
        // keep the trolley and the platform in view; follow the stack as it grows
        float wantTop = TrolleyY() - (carried != null ? HalfH(carried) : 20f) - 70f;
        camTop = dt <= 0f ? wantTop : Mathf.Lerp(camTop, wantTop, 1f - Mathf.Exp(-dt * 3f));
        camBottom = PlatY + 110f;
        float hud = Mathf.Min(0.22f, 100f * OiyoArcade.ComputeScale() / Mathf.Max(1f, Screen.height));
        float spanY = (camBottom - camTop) * K / (1f - hud);
        float spanX = (S.amp * 2f + 160f) * K;
        float vfov = cam.fieldOfView * Mathf.Deg2Rad;
        float needY = spanY * 0.5f / Mathf.Tan(vfov * 0.5f);
        float needX = spanX * 0.5f / (Mathf.Tan(vfov * 0.5f) * cam.aspect);
        float dist = Mathf.Max(needY, needX);
        float cy = (PlatY - (camTop + camBottom) * 0.5f) * K + spanY * hud * 0.5f;
        var pos = new Vector3(0f, cy + dist * 0.06f, -dist);
        if (shake > 0f) { pos += Random.insideUnitSphere * shake * 0.15f; shake = Mathf.MoveTowards(shake, 0f, dt); }
        cam.transform.position = pos;
        cam.transform.rotation = Quaternion.Euler(3.4f, 0f, 0f);
        if (backdrop != null) { backdrop.position = new Vector3(0f, cy + 1.2f, 9f + dist * 0.3f); backdrop.localScale = new Vector3(24f + dist * 1.2f, 12f + dist * 0.6f, 1f); }
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.25f, 0.55f, 0.9f, 0.97f);
    static readonly Color Dark = new Color(0.06f, 0.08f, 0.16f, 0.82f);
    static readonly Color Gold = new Color(1f, 0.8f, 0.25f, 0.97f);
    static readonly Color Slate = new Color(0.22f, 0.27f, 0.4f, 0.95f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + U(ZoneNames[(int)Rows[i].g]);
    int HeightCm => Mathf.RoundToInt((PlatY - StackTop()) / 2f);

    void OnGUI()
    {
        OiyoArcade.Begin();
        float w = OiyoArcade.W, h = OiyoArcade.H;
        if (state == GameState.Menu) { DrawMenu(w, h); return; }
        var bar = new Rect(8f, 8f, w - 16f, 58f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 12f, w - 140f, 24f), "<b>" + StageTitle(stageIdx) + "</b>", 16, new Color(0.8f, 0.9f, 1f));
        int left = S.pieces.Length - next;
        string wind = S.wind > 0f ? $"   {U("Wind")} <b>{(WindAt() >= 0f ? "→" : "←")}</b>" : "";
        OiyoArcade.Text(new Rect(20f, 36f, w - 140f, 24f), $"{U("Pieces left")} <b>{left}</b>   {U("Height")} <b>{HeightCm} cm</b>{wind}", 14, Color.white);
        if (OiyoArcade.Button(new Rect(w - 64f, 14f, 46f, 46f), "<b>II</b>", Slate, 18))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        // tilt meter: how close the snowman is to falling
        if (pinned && (state == GameState.Playing || state == GameState.Ready))
        {
            float tip = SpringOf(S.g).tip;
            float t = Mathf.Clamp01(Mathf.Abs(theta) / tip);
            OiyoArcade.Text(new Rect(16f, 70f, 160f, 18f), U("Wobble"), 12, Color.white);
            OiyoArcade.Bar(new Rect(16f, 88f, 140f, 7f), t, new Color(0f, 0f, 0f, 0.35f), Color.Lerp(new Color(0.5f, 0.9f, 1f), new Color(1f, 0.35f, 0.3f), t));
        }
        if (popupTimer > 0f && state == GameState.Playing)
            OiyoArcade.Shadowed(new Rect(0f, h * 0.5f, w, 40f), popup, Mathf.RoundToInt(22 + popupTimer * 10f), popupColor, TextAnchor.MiddleCenter);
        if (state == GameState.Ready)
        {
            var r = new Rect(w * 0.5f - 175f, h - 150f, 350f, 104f);
            OiyoArcade.Panel(r, Dark);
            OiyoArcade.Text(new Rect(r.x + 12f, r.y + 8f, r.width - 24f, r.height - 16f),
                $"<b>{U("Tap to drop the snowball from the trolley")}</b>\n<size=14>{U("Centre each piece on the one below. The snowman must stand still at the end.")}</size>", 16, Color.white, TextAnchor.MiddleCenter);
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
            OiyoArcade.Panel(box, new Color(0.06f, 0.08f, 0.16f, 0.94f));
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
        OiyoArcade.Shadowed(new Rect(card.x, card.y + 18f, cw, 40f), U("Snowman Stack 3D"), 30, new Color(0.85f, 0.95f, 1f), TextAnchor.MiddleCenter);
        OiyoArcade.Text(new Rect(card.x + 20f, card.y + 62f, cw - 40f, 46f), U("Drop snowballs from a swinging trolley and build a snowman that stands."), 15, new Color(1f, 1f, 1f, 0.85f), TextAnchor.MiddleCenter);
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
        bool isWin = state == GameState.Victory;
        float cw = Mathf.Min(360f, w - 24f);
        float ch = 158f + (isWin ? 58f : 0f) + 52f + 40f + 18f;
        var card = new Rect(w * 0.5f - cw * 0.5f, Mathf.Max(70f, h * 0.36f - ch * 0.5f), cw, ch);
        OiyoArcade.Panel(card, Dark);
        OiyoArcade.Shadowed(new Rect(card.x, card.y + 14f, cw, 38f), isWin ? U("Stage clear!") : U("Game over"), 28, isWin ? new Color(0.6f, 1f, 0.65f) : new Color(1f, 0.55f, 0.5f), TextAnchor.MiddleCenter);
        string detail = isWin ? $"<size=30>{OiyoArcade.StarString(stars)}</size>" : endReason;
        OiyoArcade.Text(new Rect(card.x + 16f, card.y + 56f, cw - 32f, 44f), detail, 16, Color.white, TextAnchor.MiddleCenter);
        OiyoArcade.Text(new Rect(card.x + 16f, card.y + 100f, cw - 32f, 48f),
            $"{U("Height")} <b>{HeightCm} cm</b>\n<size=14>{U("Score")} <b>{score}</b></size>", 17, Color.white, TextAnchor.MiddleCenter);
        float y = card.y + 158f;
        if (isWin && stageIdx < StageCount - 1)
        {
            if (OiyoArcade.Button(new Rect(card.x + 24f, y, cw - 48f, 50f), "<b>" + U("Next stage") + " ▶</b>", Accent, 19)) LoadStage(stageIdx + 1);
            y += 58f;
        }
        else if (isWin)
        {
            OiyoArcade.Text(new Rect(card.x, y, cw, 50f), "★ " + U("You cleared all 30 stages!") + " ★", 17, Gold, TextAnchor.MiddleCenter);
            y += 58f;
        }
        if (OiyoArcade.Button(new Rect(card.x + 24f, y, cw - 48f, 44f), U("Retry"), isWin ? Slate : Accent, 17)) LoadStage(stageIdx);
        y += 52f;
        if (OiyoArcade.Button(new Rect(card.x + 24f, y, cw - 48f, 40f), U("Stage list"), Slate, 16)) { LoadStage(stageIdx, false); showStages = true; }
    }
}
