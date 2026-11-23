using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Charge Climb 3D: the web Charge Climb (src/components/games/DotJumpKing.tsx,
// src/lib/games/dot-jumpking.ts) rebuilt as a 30-stage Unity climber. Hold to gather power,
// aim at a point left or right of the climber, let go to leap; land on the ledges and reach
// the summit flag. The web feel in world units (1 unit = 50 px): an 8-unit shaft (400 px),
// gravity 0.35 px/frame^2, launch speed 7 + 9 x power px/frame up and 2 + 4 x power sideways
// toward the aim, side walls that bounce at 60%, a full charge in about a second. As on the
// web, a fall that drops the climber off the bottom of the screen ends the climb.
// Each stage is a fixed tower (seeded, so it can be learned); every five stages adds a hazard:
// narrow ledges, drifting ledges, crumbling stones, gusts of wind, then ice. Stars come from
// the number of jumps against the stage's par.
public class ChargeClimbPlayer : MonoBehaviour
{
    const string Slug = "charge-climb";
    const int StageCount = 30;
    const float Wall = 3.76f, Half = 0.24f, Gravity = 25.2f, ChargeRate = 95f;
    float viewHalf = 9f;
    // off the bottom of the screen (the camera only climbs, so this is the web rule)
    float FallLimit => viewHalf * 0.6f + 0.6f;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    enum Kind { Ground, Stone, Drift, Crumble, Ice, Summit }
    class Ledge
    {
        public Kind kind; public float x, y, w, baseX, amp, speed, phase, timer; public bool gone, touched;
        public Transform t; public Renderer r;
    }
    static readonly string[] ZoneNames = { "Cloud steps", "Narrow ledges", "Drifting ledges", "Crumbling stones", "Gusty peaks", "Icy summit" };
    static readonly Color[] ZoneColor = { new Color(0.55f, 0.85f, 1f), new Color(0.6f, 1f, 0.6f), new Color(0.5f, 0.7f, 1f), new Color(1f, 0.7f, 0.4f), new Color(0.85f, 0.75f, 1f), new Color(0.6f, 0.95f, 1f) };

    int stageIdx;
    readonly List<Ledge> ledges = new List<Ledge>();
    Ledge summit, standing;
    float px, py, vx, vy, charge, aimX, wind, windPhase;
    bool onGround, charging, keyAim;
    int chargePointer = int.MinValue;
    float bestY, camY;
    int jumps, par, score, stars;
    string endReason = "";

    Camera cam;
    Transform root, climber, body, arrow, sky, wallBack;
    readonly List<Transform> dots = new List<Transform>();
    Bursts bursts;
    Synth synth;
    bool showStages;
    float shake, squash, chargeTick;
    readonly List<Transform> streaks = new List<Transform>();

    int Zone => stageIdx / 5;
    float GoalY => summit != null ? summit.y : 1f;
    int Meters(float y) => Mathf.Max(0, Mathf.FloorToInt(y * 5f));

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
        cam.fieldOfView = 50f;
        cam.clearFlags = CameraClearFlags.SolidColor;
        cam.backgroundColor = new Color(0.08f, 0.1f, 0.2f);
        cam.farClipPlane = 200f;
        var key = new GameObject("Key").AddComponent<Light>();
        key.type = LightType.Directional;
        key.intensity = 0.95f;
        key.color = new Color(1f, 0.95f, 0.85f);
        key.transform.rotation = Quaternion.Euler(35f, -25f, 0f);
        RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat;
        RenderSettings.ambientLight = new Color(0.45f, 0.48f, 0.6f);
        bursts = new Bursts(transform, 0.8f);
        synth = new Synth(gameObject);
    }

    // ---------------- Tower ----------------
    void BuildTower()
    {
        var rnd = new System.Random(7000 + stageIdx * 97);
        float R(float a, float b) => a + (float)rnd.NextDouble() * (b - a);
        ledges.Clear();
        int z = Zone;
        int count = 11 + stageIdx;
        ledges.Add(new Ledge { kind = Kind.Ground, x = 0f, y = 0f, w = Wall * 2f });
        float x = 0f, y = 0f;
        for (int i = 0; i < count; i++)
        {
            bool last = i == count - 1;
            float w = last ? 2.6f : Mathf.Max(1.05f, (z == 0 ? R(2.0f, 2.5f) : R(1.35f, 1.95f)) - Mathf.Max(0, z - 1) * 0.07f);
            float gap = R(1.45f, 1.85f + z * 0.07f);
            float reach = 1.9f + z * 0.22f;
            float dx = R(0.5f, reach) * (rnd.NextDouble() < 0.5 ? -1f : 1f);
            float lim = Wall - w * 0.5f - 0.05f;
            float nx = x + dx;
            if (nx > lim || nx < -lim) nx = x - dx;
            nx = Mathf.Clamp(nx, -lim, lim);
            y += gap;
            var l = new Ledge { kind = last ? Kind.Summit : Kind.Stone, x = nx, baseX = nx, y = y, w = w };
            if (!last && i > 0)
            {
                double roll = rnd.NextDouble();
                if (z >= 5 && roll < 0.25) l.kind = Kind.Ice;
                else if (z >= 3 && roll < (z == 3 ? 0.4 : 0.5)) l.kind = Kind.Crumble;
                else if (z >= 2 && roll < (z == 2 ? 0.45 : 0.68))
                {
                    l.kind = Kind.Drift;
                    l.amp = R(0.6f, 1.5f);
                    l.speed = R(0.55f, 0.95f + z * 0.06f);
                    l.phase = R(0f, 6.28f);
                }
            }
            ledges.Add(l);
            x = nx;
        }
        summit = ledges[ledges.Count - 1];
        // par: one jump a ledge plus a little slack for the hazards
        par = count + z;
        windPhase = (float)rnd.NextDouble() * 6.28f;
    }

    void BuildScene()
    {
        var accent = ZoneColor[Zone];
        float top = GoalY + 14f;
        sky = OiyoArcade.Prim(PrimitiveType.Quad, "Sky", OiyoArcade.Textured(OiyoArcade.Art("CC/sky")), root).transform;
        // the shaft: a cliff face behind and two stone pillars
        var cliffMat = OiyoArcade.Lit(new Color(0.78f, 0.8f, 0.92f), 0.15f, OiyoArcade.Art("CC/cliff", true));
        cliffMat.mainTextureScale = new Vector2(1f, (top + 6f) / 8.5f);
        wallBack = OiyoArcade.Prim(PrimitiveType.Quad, "Cliff", cliffMat, root).transform;
        wallBack.position = new Vector3(0f, (top - 6f) * 0.5f, 1.2f);
        wallBack.localScale = new Vector3(Wall * 2f + 0.6f, top + 6f, 1f);
        var pillarMat = OiyoArcade.Lit(new Color(0.55f, 0.55f, 0.68f), 0.2f, OiyoArcade.Art("CC/stone", true));
        pillarMat.mainTextureScale = new Vector2(1f, (top + 6f) / 2f);
        for (int s = -1; s <= 1; s += 2)
        {
            var p = OiyoArcade.Prim(PrimitiveType.Cube, "Pillar", pillarMat, root);
            p.transform.position = new Vector3(s * (Wall + 0.3f), (top - 6f) * 0.5f, 0.3f);
            p.transform.localScale = new Vector3(0.6f, top + 6f, 2f);
            var rim = OiyoArcade.Prim(PrimitiveType.Cube, "Rim", OiyoArcade.Glow(new Color(accent.r, accent.g, accent.b, 1f) * 0.8f), root);
            rim.transform.position = new Vector3(s * Wall, (top - 6f) * 0.5f, -0.72f);
            rim.transform.localScale = new Vector3(0.04f, top + 6f, 0.04f);
            // height notches every 10 m
            for (float hy = 2f; hy < top; hy += 2f)
            {
                var n = OiyoArcade.Prim(PrimitiveType.Cube, "Notch", OiyoArcade.Glow(new Color(1f, 1f, 1f, 1f) * (Mathf.Repeat(hy, 10f) < 0.1f ? 0.9f : 0.45f)), root);
                n.transform.position = new Vector3(s * (Wall - 0.06f), hy, -0.72f);
                n.transform.localScale = new Vector3(Mathf.Repeat(hy, 10f) < 0.1f ? 0.3f : 0.14f, 0.03f, 0.03f);
            }
        }
        var stoneTex = OiyoArcade.Art("CC/stone", true);
        foreach (var l in ledges)
        {
            Color c; float gloss = 0.2f;
            switch (l.kind)
            {
                case Kind.Ground: c = new Color(0.5f, 0.55f, 0.5f); break; // a thick base block
                case Kind.Drift: c = new Color(0.62f, 0.78f, 1f); break;
                case Kind.Crumble: c = new Color(0.92f, 0.68f, 0.45f); break;
                case Kind.Ice: c = new Color(0.8f, 0.97f, 1f); gloss = 0.85f; break;
                case Kind.Summit: c = new Color(1f, 0.85f, 0.4f); gloss = 0.6f; break;
                default: c = new Color(0.85f, 0.85f, 0.9f); break;
            }
            var mat = OiyoArcade.Lit(c, gloss, l.kind == Kind.Ice ? null : stoneTex);
            if (l.kind != Kind.Ice) mat.mainTextureScale = new Vector2(Mathf.Max(1f, l.w / 1.2f), 0.3f);
            var b = OiyoArcade.Prim(PrimitiveType.Cube, l.kind.ToString(), mat, root);
            float depth = l.kind == Kind.Ground ? 2f : 1.4f;
            float thick = l.kind == Kind.Ground ? 12f : 0.34f;
            b.transform.localScale = new Vector3(l.w, thick, depth);
            l.t = b.transform; l.r = b.GetComponent<Renderer>();
            if (l.kind != Kind.Ground)
            {
                Color edge = l.kind == Kind.Drift ? new Color(0.4f, 0.75f, 1f) : l.kind == Kind.Crumble ? new Color(1f, 0.55f, 0.25f) : l.kind == Kind.Ice ? new Color(0.7f, 1f, 1f) : l.kind == Kind.Summit ? new Color(1f, 0.85f, 0.3f) : accent;
                var e = OiyoArcade.Prim(PrimitiveType.Cube, "Edge", OiyoArcade.Glow(edge), b.transform);
                e.transform.localScale = new Vector3(1f, 0.12f, 0.03f / depth);
                e.transform.localPosition = new Vector3(0f, 0.44f, -0.5f);
            }
        }
        // summit flag
        var pole = OiyoArcade.Prim(PrimitiveType.Cylinder, "Pole", OiyoArcade.Lit(new Color(0.92f, 0.92f, 0.96f), 0.8f, null, 0.5f), root);
        pole.transform.localScale = new Vector3(0.06f, 0.9f, 0.06f);
        pole.transform.position = new Vector3(summit.x + summit.w * 0.3f, summit.y + 0.9f, 0.2f);
        var cloth = OiyoArcade.Prim(PrimitiveType.Cube, "Cloth", OiyoArcade.Glow(accent), pole.transform);
        cloth.transform.localScale = new Vector3(8f, 0.3f, 0.3f);
        cloth.transform.localPosition = new Vector3(4.2f, 0.75f, 0f);
        var halo = OiyoArcade.GlowQuad("SummitGlow", new Color(1f, 0.85f, 0.4f, 0.5f), 4f, root);
        halo.transform.position = new Vector3(summit.x, summit.y + 0.8f, 0.9f);
        // soft clouds drifting through the shaft
        var rs = new System.Random(stageIdx * 13 + 5);
        for (float cy = 3f; cy < top; cy += 4.5f)
        {
            var cl = OiyoArcade.Prim(PrimitiveType.Quad, "Cloud", OiyoArcade.Transparent(OiyoArcade.Art("CC/cloud"), new Color(1f, 1f, 1f, 0.35f)), root);
            cl.transform.position = new Vector3(((float)rs.NextDouble() - 0.5f) * 6f, cy + (float)rs.NextDouble() * 2f, 0.9f);
            cl.transform.localScale = new Vector3(3.6f, 1.6f, 1f);
        }
        // wind streaks (gusty peaks and the icy summit)
        streaks.Clear();
        if (Zone >= 4)
            for (int i = 0; i < 14; i++)
            {
                var st = OiyoArcade.Prim(PrimitiveType.Quad, "Gust", OiyoArcade.Transparent(OiyoArcade.GlowTexture(), new Color(0.85f, 0.95f, 1f, 0.45f)), root);
                st.transform.localScale = new Vector3(1.4f, 0.05f, 1f);
                st.transform.position = new Vector3(Random.Range(-Wall, Wall), Random.Range(0f, 12f), -0.3f);
                streaks.Add(st.transform);
            }

        // the climber: a round little body with eyes, a halo and an aim arrow
        climber = new GameObject("Climber").transform;
        climber.SetParent(root, false);
        body = new GameObject("Body").transform;
        body.SetParent(climber, false);
        var torso = OiyoArcade.Prim(PrimitiveType.Sphere, "Torso", OiyoArcade.LitGlow(new Color(1f, 0.55f, 0.3f), new Color(0.15f, 0.05f, 0f), 0.55f), body);
        torso.transform.localScale = new Vector3(0.5f, 0.5f, 0.5f);
        torso.transform.localPosition = new Vector3(0f, 0.25f, 0f);
        var cap = OiyoArcade.Prim(PrimitiveType.Sphere, "Cap", OiyoArcade.Lit(new Color(0.25f, 0.35f, 0.9f), 0.4f), body);
        cap.transform.localScale = new Vector3(0.44f, 0.2f, 0.44f);
        cap.transform.localPosition = new Vector3(0f, 0.44f, 0f);
        var eyeMat = OiyoArcade.Glow(new Color(0.08f, 0.06f, 0.12f));
        for (int s = -1; s <= 1; s += 2)
        {
            var eye = OiyoArcade.Prim(PrimitiveType.Sphere, "Eye", eyeMat, body);
            eye.transform.localScale = new Vector3(0.07f, 0.1f, 0.05f);
            eye.transform.localPosition = new Vector3(s * 0.09f, 0.3f, -0.23f);
        }
        var glow = OiyoArcade.GlowQuad("Halo", new Color(1f, 0.7f, 0.4f, 0.4f), 1.3f, climber);
        glow.transform.localPosition = new Vector3(0f, 0.25f, 0.3f);
        arrow = OiyoArcade.Prim(PrimitiveType.Quad, "Arrow", OiyoArcade.Transparent(OiyoArcade.Art("CC/arrow"), new Color(1f, 1f, 1f, 0.9f)), root).transform;
        arrow.localScale = new Vector3(0.9f, 0.9f, 1f);
        dots.Clear();
        for (int i = 0; i < 9; i++)
        {
            var d = OiyoArcade.GlowQuad("Aim", new Color(1f, 0.95f, 0.7f, 0.9f), 0.2f, root);
            dots.Add(d.transform);
        }
    }

    void LoadStage(int idx, bool ready = true)
    {
        stageIdx = Mathf.Clamp(idx, 0, StageCount - 1);
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Tower").transform;
        BuildTower();
        BuildScene();
        px = 0f; py = 0f; vx = vy = 0f; onGround = true; standing = ledges[0];
        charge = 0f; charging = false; chargePointer = int.MinValue; aimX = 0f;
        bestY = 0f; camY = 0f; jumps = 0; score = 0; stars = 0;
        endReason = ""; showStages = false;
        state = ready ? GameState.Ready : GameState.Menu;
        Sync(0f);
        UpdateCamera(1f, true);
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("charge-climb", state, score);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        ReadInput(dt);
        if (state == GameState.Playing)
        {
            int n = Mathf.CeilToInt(dt / (1f / 120f));
            for (int i = 0; i < n && state == GameState.Playing; i++) Step(dt / n);
        }
        else if (state == GameState.Menu)
        {
            // a little warm-up hop on the ground behind the menu
            py = Mathf.Max(0f, Mathf.Sin(Time.time * 2.4f)) * 0.8f;
            px = Mathf.Sin(Time.time * 0.6f) * 1.5f;
        }
        else if (state == GameState.Ready || state == GameState.Paused) MoveLedges(0f);
        Sync(dt);
        UpdateCamera(dt, false);
    }

    Vector2 PointerWorld(Vector2 screen)
    {
        var ray = cam.ScreenPointToRay(new Vector3(screen.x, screen.y, 0f));
        if (Mathf.Abs(ray.direction.z) < 1e-4f) return new Vector2(px, py);
        float t = -ray.origin.z / ray.direction.z;
        var p = ray.origin + ray.direction * t;
        return new Vector2(p.x, p.y);
    }

    // Holding: a finger or the mouse that started off the buttons, or Space/Up/W.
    bool HeldNow(out bool pointerAim, out Vector2 aimScreen)
    {
        pointerAim = false; aimScreen = Vector2.zero;
        foreach (var p in OiyoArcade.Began())
            if (chargePointer == int.MinValue) chargePointer = p.id;
        bool held = false;
        if (chargePointer != int.MinValue)
        {
            foreach (var p in OiyoArcade.Held())
                if (p.id == chargePointer) { held = true; pointerAim = true; aimScreen = p.pos; }
            if (!held) chargePointer = int.MinValue;
        }
        bool keys = Input.GetKey(KeyCode.Space) || Input.GetKey(KeyCode.UpArrow) || Input.GetKey(KeyCode.W);
        return held || keys;
    }

    void ReadInput(float dt)
    {
        bool confirm = Input.GetKeyDown(KeyCode.Return);
        switch (state)
        {
            case GameState.Ready:
                {
                    // the first press starts the climb and already gathers power
                    // a fresh press (not a key still held from the menu)
                    bool fresh = OiyoArcade.Began().Count > 0 || Input.GetKeyDown(KeyCode.Space) || Input.GetKeyDown(KeyCode.UpArrow) || Input.GetKeyDown(KeyCode.W);
                    if (!fresh) return;
                    bool held = HeldNow(out bool pa, out Vector2 sp);
                    state = GameState.Playing;
                    ChargeInput(held, pa, sp, dt);
                    return;
                }
            case GameState.Playing:
                {
                    if (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P)) { state = GameState.Paused; charging = false; charge = 0f; return; }
                    bool held = HeldNow(out bool pa, out Vector2 sp);
                    ChargeInput(held, pa, sp, dt);
                    return;
                }
            case GameState.Paused:
                if (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P)) state = GameState.Playing;
                return;
            case GameState.Victory:
            case GameState.GameOver:
                if (confirm || Input.GetKeyDown(KeyCode.Space)) LoadStage(state == GameState.Victory ? Mathf.Min(stageIdx + 1, StageCount - 1) : stageIdx);
                return;
            case GameState.Menu:
                if (!showStages && (confirm || Input.GetKeyDown(KeyCode.Space))) LoadStage(stageIdx);
                return;
        }
    }

    void ChargeInput(bool held, bool pointerAim, Vector2 aimScreen, float dt)
    {
        // aim: the point pressed (as on the web), or the arrow keys
        bool left = Input.GetKey(KeyCode.LeftArrow) || Input.GetKey(KeyCode.A);
        bool right = Input.GetKey(KeyCode.RightArrow) || Input.GetKey(KeyCode.D);
        if (pointerAim) { aimX = PointerWorld(aimScreen).x; keyAim = false; }
        else if (left || right) { aimX = px + (right ? 4f : 0f) - (left ? 4f : 0f); keyAim = true; }
        else if (keyAim || !charging) aimX = px;
        if (held)
        {
            if (onGround)
            {
                if (!charging) { charging = true; charge = 0f; chargeTick = 0f; }
                charge = Mathf.Min(100f, charge + ChargeRate * dt);
                if (charge >= chargeTick + 20f && chargeTick < 100f)
                {
                    chargeTick += 20f;
                    synth.Tone(300f + chargeTick * 6f, 0.05f, Wave.Triangle, 0.1f, 0f, 20f);
                }
            }
        }
        else if (charging)
        {
            charging = false;
            if (onGround && charge > 0f) Leap();
            charge = 0f;
        }
    }

    float Dir => Mathf.Clamp((aimX - px) / 4f, -1f, 1f);

    void Leap()
    {
        float power = charge / 100f;
        vy = 8.4f + power * 10.8f;
        vx = Dir * (2.4f + power * 4.8f);
        onGround = false; standing = null;
        jumps++;
        squash = -0.35f;
        bursts.Emit(new Vector3(px, py + 0.05f, -0.2f), new Color(0.85f, 0.85f, 0.95f), 8, 1.5f, 0.12f, 0.35f);
        synth.Tone(420f + power * 300f, 0.12f, Wave.Square, 0.14f, 900f + power * 500f, 12f);
    }

    float WindAt(float y) => Zone < 4 ? 0f : (Zone == 4 ? 2.6f : 3.1f) * Mathf.Sin(y * 0.33f + windPhase + Time.time * 0.25f);

    void MoveLedges(float dt)
    {
        foreach (var l in ledges)
        {
            if (l.kind == Kind.Drift)
            {
                float nx = l.baseX + Mathf.Sin(Time.time * l.speed + l.phase) * l.amp;
                float lim = Wall - l.w * 0.5f;
                nx = Mathf.Clamp(nx, -lim, lim);
                if (standing == l && onGround) px += nx - l.x;
                l.x = nx;
            }
        }
    }

    void Step(float dt)
    {
        MoveLedges(dt);
        wind = WindAt(py);
        // crumbling stones give way a moment after you land on them
        foreach (var l in ledges)
        {
            if (l.kind != Kind.Crumble || l.gone || !l.touched) continue;
            l.timer -= dt;
            if (l.timer <= 0f)
            {
                l.gone = true;
                bursts.Emit(new Vector3(l.x, l.y, -0.2f), new Color(0.9f, 0.6f, 0.35f), 18, 2.5f, 0.18f, 0.6f);
                synth.Tone(140f, 0.25f, Wave.Noise, 0.18f, 0f, 8f);
                if (standing == l) { onGround = false; standing = null; vy = 0f; }
            }
        }
        if (onGround)
        {
            if (standing != null && standing.kind == Kind.Ice && Mathf.Abs(vx) > 0.01f)
            {
                // ice keeps some of the landing speed and lets you slide off
                px += vx * dt;
                vx = Mathf.MoveTowards(vx, 0f, 1.6f * dt);
            }
            else vx = 0f;
            if (standing != null && (px < standing.x - standing.w * 0.5f - 0.1f || px > standing.x + standing.w * 0.5f + 0.1f))
            {
                onGround = false; standing = null; vy = 0f; charging = false; charge = 0f;
            }
            Walls();
        }
        else
        {
            float prevY = py;
            vy -= Gravity * dt;
            vx += wind * dt;
            py += vy * dt;
            px += vx * dt;
            Walls();
            if (vy <= 0f)
            {
                foreach (var l in ledges)
                {
                    if (l.gone) continue;
                    float topY = l.y;
                    if (prevY >= topY - 0.001f && py <= topY && px >= l.x - l.w * 0.5f - 0.12f && px <= l.x + l.w * 0.5f + 0.12f)
                    {
                        Land(l);
                        break;
                    }
                }
            }
        }
        if (onGround) bestY = Mathf.Max(bestY, py);
        if (py < bestY - FallLimit) { Fall(); return; }
    }

    void Walls()
    {
        if (px < -Wall + Half) { px = -Wall + Half; vx = Mathf.Abs(vx) * 0.6f; Bump(); }
        if (px > Wall - Half) { px = Wall - Half; vx = -Mathf.Abs(vx) * 0.6f; Bump(); }
    }

    float bumpCool;
    void Bump()
    {
        if (onGround || Time.time < bumpCool) return;
        bumpCool = Time.time + 0.15f;
        synth.Tone(220f, 0.06f, Wave.Square, 0.1f, 0f, 20f);
        bursts.Emit(new Vector3(px, py + 0.25f, -0.2f), Color.white, 5, 1.2f, 0.08f, 0.25f);
    }

    void Land(Ledge l)
    {
        py = l.y; vy = 0f; onGround = true; standing = l;
        if (l.kind != Kind.Ice) vx = 0f; else vx *= 0.8f;
        squash = 0.3f;
        bursts.Emit(new Vector3(px, py + 0.02f, -0.2f), new Color(0.9f, 0.9f, 1f), 7, 1.3f, 0.12f, 0.35f);
        synth.Tone(l.kind == Kind.Ice ? 900f : 180f, 0.08f, l.kind == Kind.Ice ? Wave.Triangle : Wave.Sine, 0.18f, 0f, 14f);
        if (l.kind == Kind.Crumble && !l.touched) { l.touched = true; l.timer = 0.85f; }
        if (l == summit) Win();
    }

    int Score => Meters(bestY) * 10;

    void Fall()
    {
        endReason = U("You fell off the bottom of the screen.");
        score = Score;
        state = GameState.GameOver;
        shake = 0.3f;
        synth.Tone(300f, 0.6f, Wave.Saw, 0.2f, 60f, 3f);
    }

    void Win()
    {
        stars = 1 + (jumps <= Mathf.CeilToInt(par * 1.4f) ? 1 : 0) + (jumps <= par ? 1 : 0);
        score = Score + stars * 100 + stageIdx * 10;
        state = GameState.Victory;
        OiyoArcade.Record(Slug, stageIdx, stars, score, StageCount);
        bursts.Emit(new Vector3(summit.x, summit.y + 1.5f, -0.3f), ZoneColor[Zone], 50, 5f, 0.25f, 1f, Vector3.up * 2f);
        StartCoroutine(Arp(new[] { 523f, 659f, 784f, 1047f, 1319f }, 0.09f));
    }

    IEnumerator Arp(float[] fs, float gap)
    {
        foreach (var f in fs) { synth.Tone(f, 0.2f, Wave.Triangle, 0.3f, 0f, 6f); yield return new WaitForSeconds(gap); }
    }

    // ---------------- View ----------------
    void Sync(float dt)
    {
        if (climber == null) return;
        foreach (var l in ledges)
        {
            if (l.t == null) continue;
            if (l.gone) { if (l.t.gameObject.activeSelf) l.t.gameObject.SetActive(false); continue; }
            float thick = l.kind == Kind.Ground ? 12f : 0.34f;
            var pos = new Vector3(l.x, l.y - thick * 0.5f, 0f);
            if (l.kind == Kind.Crumble && l.touched) pos += new Vector3(Mathf.Sin(Time.time * 70f) * 0.04f, 0f, 0f);
            l.t.position = pos;
        }
        squash = Mathf.MoveTowards(squash, 0f, dt * 2.2f);
        float c = charging ? charge / 100f : 0f;
        climber.position = new Vector3(px, py, 0f);
        body.localScale = new Vector3(1f + c * 0.25f + squash * 0.5f, 1f - c * 0.35f - squash * 0.6f, 1f + c * 0.25f);
        if (!onGround && state == GameState.Playing) body.localRotation = Quaternion.Euler(0f, 0f, -vx * 6f);
        else body.localRotation = Quaternion.identity;
        // aim arrow and the first part of the arc while charging
        bool show = charging && onGround && (state == GameState.Playing);
        arrow.gameObject.SetActive(show);
        float power = Mathf.Max(0.05f, c);
        float lvx = Dir * (2.4f + power * 4.8f), lvy = 8.4f + power * 10.8f;
        if (show)
        {
            float ang = Mathf.Atan2(lvy, lvx) * Mathf.Rad2Deg - 90f;
            arrow.position = new Vector3(px + lvx * 0.06f, py + 0.75f, -0.4f);
            arrow.rotation = Quaternion.Euler(0f, 0f, ang);
            arrow.localScale = new Vector3(0.7f, 0.7f + c * 0.6f, 1f);
        }
        for (int i = 0; i < dots.Count; i++)
        {
            dots[i].gameObject.SetActive(show);
            if (!show) continue;
            float t = (i + 1) * 0.05f;
            float x = px + lvx * t, y = py + 0.25f + lvy * t - 0.5f * Gravity * t * t;
            x = Mathf.Clamp(x, -Wall + Half, Wall - Half);
            dots[i].position = new Vector3(x, y, -0.4f);
            dots[i].localScale = Vector3.one * (0.2f - i * 0.012f);
        }
        if (streaks.Count > 0)
        {
            foreach (var s in streaks)
            {
                float w = WindAt(s.position.y);
                var p = s.position;
                p.x += w * dt * 2.2f;
                if (p.x > Wall + 1f) p.x = -Wall - 1f;
                if (p.x < -Wall - 1f) p.x = Wall + 1f;
                if (p.y < camY - 9f) p.y += 18f;
                if (p.y > camY + 9f) p.y -= 18f;
                s.position = p;
                s.localScale = new Vector3(0.4f + Mathf.Abs(w) * 0.45f, 0.05f, 1f);
            }
        }
    }

    void UpdateCamera(float dt, bool snap)
    {
        float aspect = Mathf.Max(0.3f, cam.aspect);
        float tan = Mathf.Tan(cam.fieldOfView * 0.5f * Mathf.Deg2Rad);
        // keep the whole shaft (plus the pillars) in view on an upright phone, and about 12 units of height on a wide screen
        float dist = Mathf.Max((Wall + 0.9f) / (tan * aspect), 6.8f / tan);
        float view = tan * dist;
        viewHalf = view;
        // as on the web the view only climbs: the best ledge sits 30% up the screen
        float target = Mathf.Max(view * 0.4f, bestY + view * 0.4f);
        if (state == GameState.Menu) target = view * 0.4f;
        camY = snap ? target : Mathf.Lerp(camY, target, 1f - Mathf.Exp(-dt * 4f));
        var pos = new Vector3(0f, camY - 0.8f, -dist);
        if (shake > 0f) { pos += Random.insideUnitSphere * shake * 0.3f; shake = Mathf.MoveTowards(shake, 0f, dt); }
        cam.transform.position = pos;
        cam.transform.rotation = Quaternion.LookRotation(new Vector3(0f, camY, 0f) - pos);
        if (sky != null)
        {
            sky.position = new Vector3(0f, camY * 0.6f + 6f, 60f);
            sky.localScale = new Vector3(160f, 110f, 1f);
        }
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.95f, 0.5f, 0.25f, 0.97f);
    static readonly Color Dark = new Color(0.04f, 0.05f, 0.12f, 0.84f);
    static readonly Color Gold = new Color(1f, 0.8f, 0.25f, 0.97f);
    static readonly Color Slate = new Color(0.18f, 0.2f, 0.32f, 0.95f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + U(ZoneNames[i / 5]);

    void OnGUI()
    {
        OiyoArcade.Begin();
        float w = OiyoArcade.W, h = OiyoArcade.H;
        if (state == GameState.Menu) { DrawMenu(w, h); return; }
        var bar = new Rect(8f, 8f, w - 16f, 58f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 12f, w - 140f, 24f), "<b>" + StageTitle(stageIdx) + "</b>", 16, new Color(1f, 0.85f, 0.7f));
        OiyoArcade.Text(new Rect(20f, 36f, w - 140f, 24f), $"{U("Height")} <b>{Meters(Mathf.Max(bestY, py))}/{Meters(GoalY)} m</b>  {U("Jumps")} <b>{jumps}</b><color=#ffffff99>/{par}</color>", 14, Color.white);
        if (OiyoArcade.Button(new Rect(w - 64f, 14f, 46f, 46f), "<b>II</b>", Slate, 18))
        {
            if (state == GameState.Playing) { state = GameState.Paused; charging = false; charge = 0f; }
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        OiyoArcade.Bar(new Rect(16f, 70f, w - 32f, 8f), Mathf.Clamp01(bestY / Mathf.Max(1f, GoalY)), new Color(0f, 0f, 0f, 0.4f), ZoneColor[Zone]);
        if (Zone >= 4 && state == GameState.Playing)
        {
            float wnd = WindAt(py);
            string dir = wnd > 0.3f ? "»" : wnd < -0.3f ? "«" : "·";
            OiyoArcade.Text(new Rect(16f, 80f, w - 32f, 20f), $"{U("Wind")} {dir}", 13, new Color(0.85f, 0.95f, 1f, 0.85f), TextAnchor.UpperRight);
        }
        // the power meter sits bottom centre, clear of the page's exit button in the bottom-left corner
        if (state == GameState.Playing || state == GameState.Ready)
        {
            float mw = Mathf.Min(220f, w - 180f);
            var m = new Rect(w * 0.5f - mw * 0.5f, h - 84f, mw, 16f);
            OiyoArcade.Panel(new Rect(m.x - 6f, m.y - 22f, m.width + 12f, 44f), Dark);
            OiyoArcade.Text(new Rect(m.x, m.y - 20f, m.width, 18f), U("Power"), 12, new Color(1f, 1f, 1f, 0.75f), TextAnchor.UpperCenter);
            float c = charging ? charge / 100f : 0f;
            OiyoArcade.Bar(m, c, new Color(0f, 0f, 0f, 0.5f), Color.Lerp(new Color(1f, 0.85f, 0.3f), new Color(1f, 0.3f, 0.2f), c));
        }
        if (state == GameState.Ready)
        {
            var r = new Rect(w * 0.5f - 175f, h * 0.5f - 10f, 350f, 112f);
            OiyoArcade.Panel(r, Dark);
            OiyoArcade.Text(new Rect(r.x + 12f, r.y + 8f, r.width - 24f, r.height - 16f),
                $"<b>{U("Hold to charge, let go to jump")}</b>\n<size=14>{U("Press left or right of the climber to aim that way. Space and the arrow keys work too.")}</size>", 16, Color.white, TextAnchor.MiddleCenter);
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
            OiyoArcade.Panel(box, new Color(0.04f, 0.05f, 0.12f, 0.94f));
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
        OiyoArcade.Shadowed(new Rect(card.x, card.y + 18f, cw, 40f), U("Charge Climb 3D"), 30, new Color(1f, 0.8f, 0.6f), TextAnchor.MiddleCenter);
        OiyoArcade.Text(new Rect(card.x + 20f, card.y + 62f, cw - 40f, 46f), U("Hold to charge, aim and leap from ledge to ledge up to the summit flag."), 15, new Color(1f, 1f, 1f, 0.85f), TextAnchor.MiddleCenter);
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
        float ch = 158f + (won ? 58f : 0f) + 52f + 40f + 18f;
        var card = new Rect(w * 0.5f - cw * 0.5f, h * 0.5f - ch * 0.5f, cw, ch);
        OiyoArcade.Panel(card, Dark);
        OiyoArcade.Shadowed(new Rect(card.x, card.y + 14f, cw, 38f), won ? U("Stage clear!") : U("Game over"), 28, won ? new Color(0.6f, 1f, 0.65f) : new Color(1f, 0.55f, 0.5f), TextAnchor.MiddleCenter);
        string detail = won ? $"<size=30>{OiyoArcade.StarString(stars)}</size>" : endReason;
        OiyoArcade.Text(new Rect(card.x + 16f, card.y + 56f, cw - 32f, 44f), detail, 16, Color.white, TextAnchor.MiddleCenter);
        OiyoArcade.Text(new Rect(card.x + 16f, card.y + 100f, cw - 32f, 48f),
            $"{U("Score")} <b>{score}</b>   {U("Jumps")} <b>{jumps}</b><size=14> ({U("Par")} {par})</size>\n<size=14>{U("Height")} {Meters(bestY)} / {Meters(GoalY)} m</size>", 16, Color.white, TextAnchor.MiddleCenter);
        float y = card.y + 158f;
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
