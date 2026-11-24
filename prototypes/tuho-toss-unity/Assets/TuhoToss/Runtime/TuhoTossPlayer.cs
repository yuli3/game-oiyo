using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Tuho Toss 3D: the web Tuho Toss (src/components/games/TuhoToss.tsx, src/lib/games/tuho-toss.ts)
// rebuilt in Unity. The rules are the web's, in its own 360 x 600 px side view: pull back from
// anywhere and let go (velocity = -pull x 4.6, the pull capped at 140 px, gravity 900, the stage's
// wind along x), an arrow that drops through the jar's mouth scores 1 and one through an ear scores 2,
// the rims, neck and body bounce it away, and later stages add a folding screen, a low beam and a jar
// sliding on a cart. Score the stage's points within its arrows; stars for arrows to spare. The 30
// stages are the web's own (TuhoTossStages.cs). Keyboard: hold Space to aim, arrows set angle and power.
public class TuhoTossPlayer : MonoBehaviour
{
    const string Slug = "tuho-toss";
    const int StageCount = 30;
    const float FW = 360f, FH = 600f, Ground = 520f, HandX = 46f, HandY = 430f, Gravity = 900f;
    const float PullScale = 4.6f, PullMax = 140f, RimR = 4f, EarW = 10f, NeckH = 26f, BodyPad = 26f;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of tuho-toss.ts) ----------------
    const int Flying = 0, In = 1, Ear = 2, Miss = 3;
    class Arrow { public float x, y, vx, vy, angle, t, rest, dx; public int fate, bounced; public Transform tr; }
    TuhoTossStages.Level level;
    int stageIdx;
    readonly List<Arrow> arrows = new List<Arrow>();
    float time;
    int thrown, points, starsWon;
    bool over, won;

    float PotXAt(float t) => level.potX + (level.slide != 0f ? Mathf.Sin(t * level.slideSpeed) * level.slide : 0f);

    int EarCount => level.ears ? 2 : 0;
    Vector2 EarAt(int i, float px)
    {
        float off = level.mouthW / 2f + 15f;
        return new Vector2(i == 0 ? px - off : px + off, level.mouthY + 14f);
    }

    static Vector2 LaunchVelocity(float pullX, float pullY)
    {
        float len = Mathf.Sqrt(pullX * pullX + pullY * pullY);
        float k = len > PullMax ? PullMax / len : 1f;
        return new Vector2(-pullX * k * PullScale, -pullY * k * PullScale);
    }

    bool ThrowArrow(float vx, float vy)
    {
        if (over || thrown >= level.arrows) return false;
        foreach (var a in arrows) if (a.fate == Flying) return false;
        if (Mathf.Sqrt(vx * vx + vy * vy) < 60f) return false;
        var ar = new Arrow { x = HandX, y = HandY, vx = vx, vy = vy, angle = Mathf.Atan2(vy, vx), fate = Flying };
        ar.tr = MakeArrow();
        arrows.Add(ar);
        thrown++;
        return true;
    }

    static bool Inside(float[] r, float x, float y) => r != null && x >= r[0] && x <= r[0] + r[2] && y >= r[1] && y <= r[1] + r[3];

    bool evScored, evEar, evRim, evMiss; int evPoints;

    void StepArrow(Arrow a, float dt)
    {
        const float Sub = 1f / 240f;
        float left = dt;
        while (left > 1e-9f && a.fate == Flying)
        {
            float h = Mathf.Min(Sub, left);
            left -= h;
            float px = PotXAt(time - left);
            float prevY = a.y;
            a.vx += level.wind * h;
            a.vy += Gravity * h;
            a.x += a.vx * h;
            a.y += a.vy * h;
            a.t += h;
            a.angle = Mathf.Atan2(a.vy, a.vx);
            for (int i = 0; i < EarCount; i++)
            {
                var e = EarAt(i, px);
                if (a.vy > 0f && prevY < e.y && a.y >= e.y && Mathf.Abs(a.x - e.x) < EarW / 2f - 1f)
                {
                    a.fate = Ear; a.dx = a.x - px; points += 2; evPoints += 2; evScored = true; evEar = true;
                    return;
                }
            }
            float half = level.mouthW / 2f;
            if (a.vy > 0f && prevY < level.mouthY && a.y >= level.mouthY && Mathf.Abs(a.x - px) < half - RimR)
            {
                a.fate = In; a.dx = a.x - px; points += 1; evPoints += 1; evScored = true;
                return;
            }
            foreach (var rx in new[] { px - half, px + half })
            {
                float dx = a.x - rx, dy = a.y - level.mouthY;
                float d = Mathf.Sqrt(dx * dx + dy * dy);
                if (d < RimR + 1.5f && a.bounced < 6)
                {
                    float dd = d == 0f ? 1f : d;
                    float nx = dx / dd, ny = dy / dd;
                    float dot = a.vx * nx + a.vy * ny;
                    if (dot < 0f)
                    {
                        a.vx = (a.vx - 2f * dot * nx) * 0.45f;
                        a.vy = (a.vy - 2f * dot * ny) * 0.45f - 40f;
                        a.bounced++;
                        evRim = true;
                    }
                }
            }
            bool neck = a.y > level.mouthY + 4f && a.y < level.mouthY + NeckH && Mathf.Abs(a.x - px) < half + 4f;
            bool body = a.y >= level.mouthY + NeckH && a.y < Ground && Mathf.Abs(a.x - px) < half + BodyPad;
            if (neck || body)
            {
                float w = neck ? half + 4f : half + BodyPad;
                a.vx = (a.x < px ? -1f : 1f) * Mathf.Max(40f, Mathf.Abs(a.vx) * 0.35f);
                a.vy = -Mathf.Abs(a.vy) * 0.2f;
                a.x = px + (a.x < px ? -w - 1f : w + 1f);
                a.bounced++;
                evRim = true;
            }
            if (Inside(level.screen, a.x, a.y))
            {
                a.vx = -Mathf.Abs(a.vx) * 0.25f;
                a.vy = Mathf.Abs(a.vy) * 0.2f;
                a.x = level.screen[0] - 1f;
                a.bounced++;
                evRim = true;
            }
            if (Inside(level.beam, a.x, a.y))
            {
                a.vy = Mathf.Abs(a.vy) * 0.3f;
                a.vx *= 0.6f;
                a.y = level.beam[1] + level.beam[3] + 1f;
                a.bounced++;
                evRim = true;
            }
            if (a.y >= Ground || a.x > FW + 30f || a.x < -30f || a.y > FH)
            {
                a.y = Mathf.Min(a.y, Ground);
                a.fate = Miss; evMiss = true;
                return;
            }
        }
    }

    void Step(float dt)
    {
        evScored = evEar = evRim = evMiss = false; evPoints = 0;
        if (over) return;
        time += dt;
        foreach (var a in arrows)
        {
            if (a.fate == Flying) StepArrow(a, dt);
            else a.rest += dt;
        }
        bool flying = false;
        foreach (var a in arrows) if (a.fate == Flying) { flying = true; break; }
        if (!flying && points >= level.need) { over = true; won = true; }
        else if (!flying && thrown >= level.arrows) { over = true; won = false; }
    }

    int StarsFor()
    {
        int spare = level.arrows - thrown;
        return spare >= 2 ? 3 : spare >= 1 ? 2 : 1;
    }

    // ---------------- Scene ----------------
    OiyoField field;
    Transform root, pot, kid, cart;
    readonly List<Transform> ears = new List<Transform>();
    readonly List<Transform> aimDots = new List<Transform>();
    readonly List<Transform> quiver = new List<Transform>();
    readonly List<Transform> streaks = new List<Transform>();
    Transform pullA, pullB;
    Material kidMat, hanjiMat, floorMat, porcelainMat, rimMat, darkMat, shaftMat, featherMat, tipMat, woodMat, screenMat, frameMat, aimMat, aimHotMat;
    Bursts bursts;
    Synth synth;
    bool showStages;

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(FW, FH, new Color(0.93f, 0.86f, 0.71f));
        OiyoField.Lights(new Color(0.66f, 0.6f, 0.54f), 0.85f, 30f, -40f);
        bursts = new Bursts(transform, 0.7f);
        synth = new Synth(gameObject);
        kidMat = OiyoField.Sprite("TT/kid");
        hanjiMat = OiyoArcade.Lit(Color.white, 0.05f, OiyoArcade.Art("TT/hanji", true));
        floorMat = OiyoArcade.Lit(Color.white, 0.25f, OiyoArcade.Art("TT/floor", true));
        porcelainMat = OiyoArcade.Lit(Color.white, 0.75f, OiyoArcade.Art("TT/porcelain", true));
        rimMat = OiyoArcade.Lit(new Color(0.11f, 0.31f, 0.55f), 0.7f);
        darkMat = OiyoArcade.Glow(new Color(0.04f, 0.1f, 0.18f));
        shaftMat = OiyoArcade.Lit(new Color(0.75f, 0.54f, 0.29f), 0.35f);
        featherMat = OiyoArcade.Lit(new Color(0.88f, 0.19f, 0.19f), 0.2f);
        tipMat = OiyoArcade.Lit(new Color(0.29f, 0.31f, 0.34f), 0.7f, null, 0.6f);
        woodMat = OiyoArcade.Lit(new Color(0.54f, 0.35f, 0.23f), 0.25f);
        screenMat = OiyoArcade.Lit(Color.white, 0.05f, OiyoArcade.Art("TT/screen", true));
        frameMat = OiyoArcade.Lit(new Color(0.49f, 0.29f, 0.14f), 0.3f);
        aimMat = OiyoArcade.Glow(new Color(0.94f, 0.55f, 0f));
        aimHotMat = OiyoArcade.Glow(new Color(0.88f, 0.19f, 0.19f));
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int idx, bool ready = true)
    {
        stageIdx = Mathf.Clamp(idx, 0, StageCount - 1);
        StopAllCoroutines();
        level = TuhoTossStages.All[stageIdx];
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Room").transform;
        arrows.Clear(); ears.Clear(); aimDots.Clear(); quiver.Clear(); streaks.Clear();
        time = 0f; thrown = 0; points = 0; over = false; won = false; starsWon = 0;
        drag = false; kbdAim = false;
        showStages = false;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Fit();
        Animate(0f);
    }

    Transform Box(string name, Material m, float x, float y, float w, float h, float z, float depth)
    {
        var b = OiyoArcade.Prim(PrimitiveType.Cube, name, m, root);
        b.transform.position = field.W(x + w * 0.5f, y + h * 0.5f, z);
        b.transform.localScale = new Vector3(OiyoField.U(w), OiyoField.U(h), depth);
        return b.transform;
    }

    void BuildScene()
    {
        // the room: a hanji lattice wall, wooden posts and the floorboards
        var wall = OiyoArcade.Prim(PrimitiveType.Quad, "Wall", hanjiMat, root);
        wall.transform.position = field.W(FW * 0.5f, 220f, 3f);
        wall.transform.localScale = new Vector3(OiyoField.U(FW * 3f), OiyoField.U(640f), 1f);
        hanjiMat.mainTextureScale = new Vector2(9f, 2.5f);
        for (int k = -2; k <= 3; k++) Box("Post", frameMat, k * 150f - 8f, -200f, 16f, Ground + 200f, 2.7f, 0.5f);
        var floor = Box("Floor", floorMat, -FW, Ground, FW * 3f, 120f, 0f, 6f);
        floor.position += new Vector3(0f, 0f, 0f);
        floorMat.mainTextureScale = new Vector2(6f, 2f);
        var floorTop = OiyoArcade.Prim(PrimitiveType.Quad, "FloorTop", floorMat, root);
        floorTop.transform.rotation = Quaternion.Euler(90f, 0f, 0f);
        floorTop.transform.position = field.W(FW * 0.5f, Ground, 0f) + new Vector3(0f, 0.001f, 0f);
        floorTop.transform.localScale = new Vector3(OiyoField.U(FW * 3f), 6f, 1f);
        // beam and folding screen
        if (level.beam != null)
        {
            var b = level.beam;
            Box("Beam", woodMat, b[0], b[1], b[2], b[3], 0f, 1.6f);
            Box("Hanger", frameMat, b[0] + 8f, -200f, 8f, b[1] + 200f, 0.3f, 0.2f);
            Box("Hanger", frameMat, b[0] + b[2] - 16f, -200f, 8f, b[1] + 200f, 0.3f, 0.2f);
        }
        if (level.screen != null)
        {
            var r = level.screen;
            Box("ScreenFrame", frameMat, r[0] - 2f, r[1] - 4f, r[2] + 4f, r[3] + 4f, 0f, 1.5f);
            var panel = OiyoArcade.Prim(PrimitiveType.Quad, "ScreenPanel", screenMat, root);
            panel.transform.position = field.W(r[0] + r[2] * 0.5f, r[1] + r[3] * 0.5f, -0.76f);
            panel.transform.localScale = new Vector3(OiyoField.U(r[2]) * 0.8f, OiyoField.U(r[3]) * 0.95f, 1f);
            // the other leaves of the screen, folded back
            for (int k = 1; k <= 2; k++)
            {
                var leaf = Box("Leaf", screenMat, r[0] - 2f, r[1], r[2], r[3] - 4f, 0.5f + k * 0.55f, 0.08f);
                leaf.rotation = Quaternion.Euler(0f, k % 2 == 1 ? 50f : -50f, 0f);
            }
        }
        // the jar: a round porcelain body, a neck, a dark mouth with two lips, and the ears
        pot = new GameObject("Jar").transform; pot.SetParent(root, false);
        float half = level.mouthW / 2f;
        float bodyTop = level.mouthY + NeckH;
        float baseY = level.slide != 0f ? Ground - 10f : Ground;
        float bodyH = baseY - bodyTop, bodyW = (half + BodyPad) * 2f;
        var bodyGo = OiyoArcade.Prim(PrimitiveType.Sphere, "Body", porcelainMat, pot);
        bodyGo.transform.localPosition = new Vector3(0f, -OiyoField.U(bodyTop - level.mouthY + bodyH * 0.5f), 0f);
        bodyGo.transform.localScale = new Vector3(OiyoField.U(bodyW), OiyoField.U(bodyH * 1.05f), OiyoField.U(bodyW));
        var foot = OiyoArcade.Prim(PrimitiveType.Cylinder, "Foot", porcelainMat, pot);
        foot.transform.localPosition = new Vector3(0f, -OiyoField.U(baseY - level.mouthY - 3f), 0f);
        foot.transform.localScale = new Vector3(OiyoField.U(bodyW * 0.55f), OiyoField.U(3f), OiyoField.U(bodyW * 0.55f));
        var neck = OiyoArcade.Prim(PrimitiveType.Cylinder, "Neck", porcelainMat, pot);
        neck.transform.localPosition = new Vector3(0f, -OiyoField.U(NeckH * 0.5f + 2f), 0f);
        neck.transform.localScale = new Vector3(OiyoField.U((half + 4f) * 2f), OiyoField.U(NeckH * 0.5f + 2f), OiyoField.U((half + 4f) * 2f));
        var lip = OiyoArcade.Prim(PrimitiveType.Cylinder, "Lip", rimMat, pot);
        lip.transform.localPosition = new Vector3(0f, OiyoField.U(1f), 0f);
        lip.transform.localScale = new Vector3(OiyoField.U((half + 6f) * 2f), OiyoField.U(3f), OiyoField.U((half + 6f) * 2f));
        var hole = OiyoArcade.Prim(PrimitiveType.Cylinder, "Mouth", darkMat, pot);
        hole.transform.localPosition = new Vector3(0f, OiyoField.U(2.2f), 0f);
        hole.transform.localScale = new Vector3(OiyoField.U(level.mouthW - 6f), OiyoField.U(2f), OiyoField.U(level.mouthW - 6f));
        for (int i = 0; i < EarCount; i++)
        {
            var e = EarAt(i, level.potX);
            var ear = new GameObject("Ear").transform; ear.SetParent(pot, false);
            ear.localPosition = new Vector3(OiyoField.U(e.x - level.potX), -OiyoField.U(e.y - level.mouthY), 0f);
            var tube = OiyoArcade.Prim(PrimitiveType.Cylinder, "Tube", rimMat, ear);
            tube.transform.localPosition = new Vector3(0f, -OiyoField.U(7f), 0f);
            tube.transform.localScale = new Vector3(OiyoField.U(EarW + 4f), OiyoField.U(8f), OiyoField.U(EarW + 4f));
            var eh = OiyoArcade.Prim(PrimitiveType.Cylinder, "EarHole", darkMat, ear);
            eh.transform.localPosition = new Vector3(0f, OiyoField.U(1.2f), 0f);
            eh.transform.localScale = new Vector3(OiyoField.U(EarW - 2f), OiyoField.U(1f), OiyoField.U(EarW - 2f));
            var arm = OiyoArcade.Prim(PrimitiveType.Cube, "Arm", rimMat, ear);
            float span = Mathf.Abs(e.x - level.potX) - 8f;
            arm.transform.localPosition = new Vector3((i == 0 ? 1f : -1f) * OiyoField.U(span * 0.5f + 4f), -OiyoField.U(10f), 0f);
            arm.transform.localScale = new Vector3(OiyoField.U(span), OiyoField.U(4f), OiyoField.U(5f));
            ears.Add(ear);
        }
        if (level.slide != 0f)
        {
            cart = new GameObject("Cart").transform; cart.SetParent(root, false);
            var deck = OiyoArcade.Prim(PrimitiveType.Cube, "Deck", woodMat, cart);
            deck.transform.localScale = new Vector3(OiyoField.U((half + BodyPad + 6f) * 2f), OiyoField.U(8f), OiyoField.U(bodyW + 10f));
            for (int s = -1; s <= 1; s += 2)
            {
                var wheel = OiyoArcade.Prim(PrimitiveType.Cylinder, "Wheel", OiyoArcade.Lit(new Color(0.2f, 0.23f, 0.25f), 0.4f), cart);
                wheel.transform.localRotation = Quaternion.Euler(90f, 0f, 0f);
                wheel.transform.localPosition = new Vector3(s * OiyoField.U(half + BodyPad - 4f), -OiyoField.U(6f), -OiyoField.U(bodyW * 0.5f));
                wheel.transform.localScale = new Vector3(OiyoField.U(9f), OiyoField.U(3f), OiyoField.U(9f));
            }
        }
        kid = OiyoField.Quad("Kid", kidMat, root, 46f, 60f);
        kid.position = field.W(HandX - 10f, Ground - 30f, -0.4f);
        for (int k = 0; k < 7; k++)
        {
            var d = OiyoArcade.Prim(PrimitiveType.Sphere, "Aim", aimMat, root);
            d.transform.localScale = Vector3.one * OiyoField.U(5f);
            d.SetActive(false);
            aimDots.Add(d.transform);
        }
        pullA = OiyoArcade.GlowQuad("PullA", new Color(0.13f, 0.15f, 0.16f, 0.45f), OiyoField.U(14f), root).transform;
        pullB = OiyoArcade.GlowQuad("PullB", new Color(0.13f, 0.15f, 0.16f, 0.55f), OiyoField.U(20f), root).transform;
        for (int k = 0; k < level.arrows; k++)
        {
            var q = MakeArrow();
            q.position = field.W(10f + k * 6f, Ground + 30f, -1.6f);
            q.rotation = Quaternion.Euler(0f, 0f, 90f);
            q.localScale = Vector3.one * 0.85f;
            quiver.Add(q);
        }
        if (level.wind != 0f)
            for (int k = 0; k < 6; k++)
            {
                var s = OiyoArcade.Prim(PrimitiveType.Quad, "Wind", OiyoArcade.Transparent(OiyoArcade.GlowTexture(), new Color(1f, 1f, 1f, 0.8f)), root);
                streaks.Add(s.transform);
            }
    }

    // An arrow along +x: shaft, red fletching at the back, a metal tip at the front (38 px long).
    Transform MakeArrow()
    {
        var t = new GameObject("Arrow").transform; t.SetParent(root, false);
        var shaft = OiyoArcade.Prim(PrimitiveType.Cylinder, "Shaft", shaftMat, t);
        shaft.transform.localRotation = Quaternion.Euler(0f, 0f, 90f);
        shaft.transform.localPosition = new Vector3(-OiyoField.U(19f), 0f, 0f);
        shaft.transform.localScale = new Vector3(OiyoField.U(3f), OiyoField.U(19f), OiyoField.U(3f));
        var fl = OiyoArcade.Prim(PrimitiveType.Cube, "Fletch", featherMat, t);
        fl.transform.localPosition = new Vector3(-OiyoField.U(34f), 0f, 0f);
        fl.transform.localScale = new Vector3(OiyoField.U(8f), OiyoField.U(6f), OiyoField.U(1.5f));
        var fl2 = OiyoArcade.Prim(PrimitiveType.Cube, "Fletch2", featherMat, t);
        fl2.transform.localPosition = new Vector3(-OiyoField.U(34f), 0f, 0f);
        fl2.transform.localScale = new Vector3(OiyoField.U(8f), OiyoField.U(1.5f), OiyoField.U(6f));
        var tip = OiyoArcade.Prim(PrimitiveType.Sphere, "Tip", tipMat, t);
        tip.transform.localScale = new Vector3(OiyoField.U(6f), OiyoField.U(4f), OiyoField.U(4f));
        return t;
    }

    void Fit()
    {
        bool portrait = field.Cam.aspect < 1f;
        field.Fit(portrait ? 90f : 80f, portrait ? 10f : 4f, 4f, portrait ? 120f : 130f, Ground + 46f);
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("tuho-toss", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.033f);
        TestTick(dt);
        Fit();
        ReadInput(dt);
        // the cart keeps rolling before the first throw, as on the web
        if (state == GameState.Playing || state == GameState.Ready)
        {
            if (state == GameState.Ready) time += dt;
            else Step(dt);
            if (state == GameState.Playing)
            {
                float px = PotXAt(time);
                var last = arrows.Count > 0 ? arrows[arrows.Count - 1] : null;
                if (evScored)
                {
                    Toast(evEar ? U("Ear! +2") : U("In! +1"), evEar ? new Color(1f, 0.6f, 0.1f) : new Color(0.4f, 0.9f, 0.45f));
                    bursts.Emit(field.W(px, level.mouthY - 4f, -0.5f), new Color(1f, 0.83f, 0.23f), evEar ? 24 : 14, 3.2f, 0.25f, 0.6f);
                    bursts.Emit(field.W(px, level.mouthY - 4f, -0.5f), new Color(0.97f, 0.51f, 0.67f), evEar ? 12 : 6, 2.6f, 0.22f, 0.6f);
                    if (evEar) { synth.Tone(1047f, 0.12f, Wave.Triangle, 0.2f, 1568f, 8f); synth.Tone(1319f, 0.2f, Wave.Triangle, 0.14f, 0f, 6f); }
                    else synth.Tone(784f, 0.18f, Wave.Triangle, 0.2f, 1175f, 7f);
                }
                else if (evRim && last != null)
                {
                    if (msgT < 0.6f) Toast(U("Clack!"), new Color(0.8f, 0.82f, 0.85f));
                    synth.Tone(1600f, 0.05f, Wave.Square, 0.07f, 1200f, 30f);
                }
                if (evMiss) synth.Tone(160f, 0.12f, Wave.Noise, 0.08f, 0f, 16f);
                if (over) End();
            }
        }
        msgT = Mathf.Max(0f, msgT - dt);
        Animate(dt);
    }

    string msg = ""; float msgT; Color msgC = Color.white;
    void Toast(string s, Color c) { msg = s; msgT = 1.1f; msgC = c; }

    bool drag; int dragId; Vector2 dragFrom, dragTo;
    bool kbdAim; float kbdAngle = 50f, kbdPull = 0.7f;
    void ReadInput(float dt)
    {
        bool confirm = Input.GetKeyDown(KeyCode.Return);
        switch (state)
        {
            case GameState.Ready:
            case GameState.Playing:
                {
                    if (state == GameState.Playing && (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P))) { state = GameState.Paused; drag = false; kbdAim = false; return; }
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (drag || !field.ToField(b.pos, out var p)) continue;
                        drag = true; dragId = b.id; dragFrom = p; dragTo = p;
                        if (state == GameState.Ready) state = GameState.Playing;
                    }
                    if (drag)
                    {
                        foreach (var hd in OiyoArcade.Held()) if (hd.id == dragId && field.ToField(hd.pos, out var p)) dragTo = p;
                        foreach (var e in OiyoArcade.Ended())
                            if (e.id == dragId)
                            {
                                if (field.ToField(e.pos, out var p)) dragTo = p;
                                drag = false;
                                Fire(LaunchVelocity(dragTo.x - dragFrom.x, dragTo.y - dragFrom.y));
                            }
                    }
                    if (Input.GetKeyDown(KeyCode.Space)) { kbdAim = true; if (state == GameState.Ready) state = GameState.Playing; }
                    if (kbdAim)
                    {
                        if (Input.GetKey(KeyCode.UpArrow) || Input.GetKey(KeyCode.W)) kbdAngle = Mathf.Min(82f, kbdAngle + 30f * dt);
                        if (Input.GetKey(KeyCode.DownArrow) || Input.GetKey(KeyCode.S)) kbdAngle = Mathf.Max(10f, kbdAngle - 30f * dt);
                        if (Input.GetKey(KeyCode.RightArrow) || Input.GetKey(KeyCode.D)) kbdPull = Mathf.Min(1f, kbdPull + 0.35f * dt);
                        if (Input.GetKey(KeyCode.LeftArrow) || Input.GetKey(KeyCode.A)) kbdPull = Mathf.Max(0.3f, kbdPull - 0.35f * dt);
                        if (Input.GetKeyUp(KeyCode.Space)) { kbdAim = false; Fire(KbdVelocity()); }
                    }
                    return;
                }
            case GameState.Paused:
                if (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P)) state = GameState.Playing;
                return;
            case GameState.Victory:
            case GameState.GameOver:
                if (confirm && ResultLive) LoadStage(state == GameState.Victory ? Mathf.Min(stageIdx + 1, StageCount - 1) : stageIdx);
                return;
            case GameState.Menu:
                if (!showStages && (confirm || Input.GetKeyDown(KeyCode.Space))) LoadStage(stageIdx);
                return;
        }
    }

    Vector2 KbdVelocity()
    {
        float a = kbdAngle * Mathf.Deg2Rad;
        return LaunchVelocity(-Mathf.Cos(a) * kbdPull * PullMax, Mathf.Sin(a) * kbdPull * PullMax);
    }

    void Fire(Vector2 v)
    {
        if (state != GameState.Playing) return;
        if (ThrowArrow(v.x, v.y)) synth.Tone(420f, 0.1f, Wave.Noise, 0.08f, 0f, 14f);
    }

    float endTime;
    bool ResultLive => Time.unscaledTime - endTime > 0.45f;

    void End()
    {
        if (state != GameState.Playing) return;
        endTime = Time.unscaledTime;
        drag = false; kbdAim = false;
        if (won)
        {
            starsWon = StarsFor();
            state = GameState.Victory;
            OiyoArcade.Record(Slug, stageIdx, starsWon, points, StageCount);
            StartCoroutine(Arp(new[] { 523f, 659f, 784f, 1047f, 1319f }, 0.09f));
        }
        else
        {
            state = GameState.GameOver;
            synth.Tone(220f, 0.6f, Wave.Triangle, 0.2f, 110f, 3f);
        }
    }

    IEnumerator Arp(float[] fs, float gap)
    {
        foreach (var f in fs) { synth.Tone(f, 0.18f, Wave.Triangle, 0.22f, 0f, 6f); yield return new WaitForSeconds(gap); }
    }

    void Animate(float dt)
    {
        if (root == null) return;
        float px = PotXAt(time);
        pot.position = field.W(px, level.mouthY, 0f);
        if (cart != null) cart.position = field.W(px, Ground - 6f, 0f);
        foreach (var a in arrows)
        {
            float x = a.x, y = a.y, ang = a.angle, z = -0.05f;
            if (a.fate == In || a.fate == Ear)
            {
                // resting in the jar: the tip sunk inside, the fletching sticking out
                x = px + a.dx;
                y = (a.fate == Ear ? level.mouthY + 14f : level.mouthY) + 6f;
                ang = Mathf.PI / 2f + a.dx / 30f * 0.3f;
            }
            else if (a.fate == Miss && a.y >= Ground - 1f) { ang = 0.05f; y = Ground - 2f; z = -0.6f; }
            a.tr.position = field.W(x, y, z);
            a.tr.rotation = Quaternion.Euler(0f, 0f, -ang * Mathf.Rad2Deg);
        }
        for (int k = 0; k < quiver.Count; k++) quiver[k].gameObject.SetActive(k < level.arrows - thrown);
        // aim: a band from the press point and a short pointer from the hand (no trajectory, as on the web)
        bool aimOn = (drag || kbdAim) && state == GameState.Playing;
        pullA.gameObject.SetActive(aimOn && drag); pullB.gameObject.SetActive(aimOn && drag);
        if (aimOn)
        {
            var v = drag ? LaunchVelocity(dragTo.x - dragFrom.x, dragTo.y - dragFrom.y) : KbdVelocity();
            float power = drag ? Mathf.Min(1f, (dragTo - dragFrom).magnitude / PullMax) : kbdPull;
            if (drag) { pullA.position = field.W(dragFrom.x, dragFrom.y, -0.8f); pullB.position = field.W(dragTo.x, dragTo.y, -0.8f); }
            float n = Mathf.Max(0.001f, v.magnitude);
            for (int k = 0; k < aimDots.Count; k++)
            {
                float d = (k + 1) * (6f + power * 8f);
                aimDots[k].gameObject.SetActive(true);
                aimDots[k].position = field.W(HandX + v.x / n * d, HandY + v.y / n * d, -0.3f);
                aimDots[k].GetComponent<Renderer>().sharedMaterial = power > 0.95f ? aimHotMat : aimMat;
            }
        }
        else foreach (var d in aimDots) d.gameObject.SetActive(false);
        // the kid leans back while pulling
        float lean = aimOn ? 8f : 0f;
        kid.rotation = Quaternion.Euler(0f, 0f, Mathf.LerpAngle(kid.eulerAngles.z, lean, dt > 0f ? Mathf.Min(1f, dt * 10f) : 1f));
        for (int k = 0; k < streaks.Count; k++)
        {
            float span = FW + 60f;
            float x = Mathf.Repeat(Time.time * 125f * Mathf.Sign(level.wind) + k * 70f, span) - 30f;
            streaks[k].position = field.W(x, 160f + k * 40f, -0.9f);
            streaks[k].localScale = new Vector3(OiyoField.U(26f), OiyoField.U(4f), 1f);
        }
    }

    // ?oiyotest=1 prints the run state to the browser console for the automated play check.
    bool testLog; float testT;
    void TestTick(float dt)
    {
        if (!testLog || (testT -= dt) > 0f) return;
        testT = 0.1f;
        bool flying = false; foreach (var a in arrows) if (a.fate == Flying) flying = true;
        var o = field.Cam.WorldToScreenPoint(field.W(0f, 300f));
        var o2 = field.Cam.WorldToScreenPoint(field.W(100f, 400f));
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"t\":{time:F2},\"pts\":{points},\"need\":{level.need},\"thrown\":{thrown},\"arrows\":{level.arrows},\"flying\":{(flying ? 1 : 0)},\"pot\":{PotXAt(time):F1},\"o\":[{o.x:F1},{o.y:F1}],\"o2\":[{o2.x:F1},{o2.y:F1}],\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.11f, 0.31f, 0.55f, 0.97f);
    static readonly Color Dark = new Color(0.16f, 0.1f, 0.06f, 0.86f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("{0} points to win", TuhoTossStages.All[i].need);

    void OnGUI()
    {
        OiyoArcade.Begin();
        float w = OiyoArcade.W, h = OiyoArcade.H;
        if (state == GameState.Menu)
        {
            if (showStages)
            {
                int pick = OiyoScreens.Stages(w, h, Dark, Accent, Slug, StageCount, U("Choose a stage"), U("Back"), U("Stage"));
                if (pick == -2) showStages = false; else if (pick >= 0) LoadStage(pick);
                return;
            }
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(1f, 0.92f, 0.75f), U("Tuho Toss"),
                U("Pull back and let go to pitch arrows into the jar: the mouth scores 1, the little ears 2."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        var bar = new Rect(8f, 8f, w - 16f, 64f);
        OiyoArcade.Panel(bar, Dark);
        string extra = (level.wind != 0f ? "   <color=#a5d8ff>" + (level.wind < 0f ? "◀ " + U("Wind") : U("Wind") + " ▶") + "</color>" : "") + (level.slide != 0f ? "   <color=#ffd8a8>" + U("Cart") + "</color>" : "");
        OiyoArcade.Text(new Rect(20f, 12f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>" + extra, 15, new Color(1f, 0.92f, 0.78f));
        OiyoArcade.Text(new Rect(20f, 36f, w - 90f, 24f), $"{U("Points")} <b>{points}/{level.need}</b>   {U("Arrows")} <b>{level.arrows - thrown}</b>", 16, Color.white);
        if (OiyoArcade.Button(new Rect(w - 60f, 14f, 44f, 44f), "<b>II</b>", OiyoScreens.Slate, 18))
        {
            if (state == GameState.Playing) { state = GameState.Paused; drag = false; kbdAim = false; }
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (msgT > 0f) OiyoArcade.Shadowed(new Rect(8f, 80f, w - 16f, 36f), msg, 22, msgC, TextAnchor.MiddleCenter);
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Pull back and let go to throw"), F("Score {0} points with {1} arrows. The mouth is 1, an ear is 2.", level.need, level.arrows), 150f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            bool w0 = state == GameState.Victory;
            string detail = w0 ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : F("{0} of {1} points", points, level.need);
            string body = F("{0} of {1} points", points, level.need) + $"\n<size=14>{F("{0} arrows left", level.arrows - thrown)}</size>";
            int r = OiyoScreens.Result(w, h, Dark, Accent, w0, ResultLive, w0 ? U("Right in the jar!") : U("Out of arrows"), detail, body,
                w0 && stageIdx < StageCount - 1 ? U("Next stage") : null, w0 && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
