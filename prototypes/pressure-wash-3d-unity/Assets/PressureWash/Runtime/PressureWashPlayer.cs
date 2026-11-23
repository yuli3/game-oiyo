using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Pressure Wash 3D: the web Pressure Wash 3D (src/components/games/PowerWash3D.tsx,
// src/lib/games/powerwash-3d.ts) rebuilt in Unity. The cleaning engine is the web's: every part has
// its own grid of 8 px dirt cells, the spray is an ellipse (0 deg 14x14 px at power 4.5, 15 deg
// 36x16 at 2.8, 40 deg 58x22 at 1.8, soap foam 44x44 at 1.8) that can be turned upright, cleaning
// falls off towards the rim, tar only gives way to the 0 deg jet, rust to soaped cells, moss to the
// 40 deg fan, soap softens any cell down to 35% and makes the next rinse 2.2x stronger, and a part
// at 95% snaps to 100% with a ding and its cash reward. The web's three jobs (the camper van, the
// fountain and the mecha guardian) open the 30 stages; three more objects of our own join them, and
// every six stages the grime gets thicker, tougher and more mixed. Stars: cleaned; within 1.6x the
// par time; within the par time.
public class PressureWashPlayer : MonoBehaviour
{
    const string Slug = "pressure-wash-3d";
    const int StageCount = 30;
    const float PX = 50f, CELL = 8f;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    enum Nozzle { Zero, Fifteen, Forty, Soap }
    static readonly float[] NRx = { 14f, 36f, 58f, 44f }, NRy = { 14f, 16f, 22f, 44f }, NPower = { 4.5f, 2.8f, 1.8f, 1.8f };
    static readonly Color[] NColor = { new Color(0.94f, 0.27f, 0.27f), new Color(0.92f, 0.7f, 0.03f), new Color(0.97f, 0.98f, 0.99f), new Color(0.22f, 0.74f, 0.97f) };
    static readonly string[] NLabel = { "0°", "15°", "40°", "SOAP" };

    enum Grime { Normal, Tar, Rust, Moss }
    class PartDef { public string name; public float x, y, w, h, tough; public int reward; public string baseHex, accentHex; public bool disc; }
    class Part
    {
        public PartDef d; public int cols, rows; public float[,] dirt; public bool[,] soap, mask; public Grime[,] grime;
        public int clean; public bool done; public Texture2D tex; public Material mat; public Transform slab; public bool dirty;
    }

    // i18n
    static readonly string[] ObjectNames = { "Vintage Camper Van", "Royal Fountain", "Mecha Guardian", "Garden Shed", "Harbour Rowboat", "Playground Slide" };
    // i18n
    static readonly string[] TierNames = { "Dusty", "Muddy", "Grimy", "Crusted", "Neglected" };

    static PartDef P(string name, float x, float y, float w, float h, string b, string a, float tough, int reward, bool disc = false)
        => new PartDef { name = name, x = x, y = y, w = w, h = h, baseHex = b, accentHex = a, tough = tough, reward = reward, disc = disc };

    static readonly PartDef[][] Objects =
    {
        new[] { // the web's camper van
            P("Roof rack", 130, 85, 340, 45, "#f8fafc", "#cbd5e1", 1.2f, 40), P("Windscreen", 145, 130, 145, 75, "#38bdf8", "#bae6fd", 1.0f, 35),
            P("Side window", 305, 130, 150, 75, "#38bdf8", "#bae6fd", 1.0f, 35), P("Upper body", 115, 205, 370, 55, "#fef3c7", "#fde68a", 1.3f, 50),
            P("Lower panel", 110, 260, 380, 80, "#10b981", "#059669", 1.6f, 65), P("Chrome bumper", 95, 330, 410, 26, "#e2e8f0", "#94a3b8", 1.8f, 40),
            P("Front wheel", 150, 340, 76, 76, "#334155", "#f8fafc", 2.2f, 45, true), P("Rear wheel", 370, 340, 76, 76, "#334155", "#f8fafc", 2.2f, 45, true) },
        new[] { // the web's fountain
            P("Golden spire", 260, 65, 80, 65, "#facc15", "#eab308", 1.4f, 45), P("Upper bowl", 190, 130, 220, 55, "#e2e8f0", "#cbd5e1", 1.5f, 55),
            P("Marble pillar", 240, 185, 120, 85, "#f1f5f9", "#94a3b8", 1.7f, 50), P("Main basin", 120, 270, 360, 75, "#cbd5e1", "#64748b", 1.8f, 75),
            P("Mossy steps", 90, 345, 420, 55, "#94a3b8", "#475569", 2.3f, 65) },
        new[] { // the web's mecha
            P("Sensor head", 245, 65, 110, 65, "#3b82f6", "#60a5fa", 1.3f, 50), P("Chest armour", 195, 130, 210, 95, "#ef4444", "#facc15", 1.6f, 70),
            P("Left gauntlet", 115, 140, 75, 140, "#64748b", "#38bdf8", 1.8f, 55), P("Right shield arm", 410, 140, 75, 140, "#64748b", "#38bdf8", 1.8f, 55),
            P("Booster legs", 185, 225, 230, 165, "#1e293b", "#3b82f6", 2.1f, 80) },
        new[] { // garden shed
            P("Shingle roof", 120, 90, 360, 60, "#7c3f2c", "#a0522d", 1.5f, 45), P("Plank wall", 140, 150, 320, 170, "#c9a27a", "#a47d55", 1.4f, 60),
            P("Shed door", 260, 190, 80, 130, "#6b4a2f", "#4e3420", 1.6f, 40), P("Left window", 160, 180, 80, 60, "#8fd3ff", "#d6f0ff", 1.0f, 30),
            P("Right window", 360, 180, 80, 60, "#8fd3ff", "#d6f0ff", 1.0f, 30), P("Stone step", 110, 320, 380, 40, "#8a8a8a", "#6b6b6b", 2.0f, 40),
            P("Flower box", 170, 245, 60, 22, "#4caf50", "#2e7d32", 1.8f, 25) },
        new[] { // rowboat
            P("Left oar", 120, 140, 30, 110, "#c49a6c", "#8d6e45", 1.6f, 25), P("Right oar", 450, 140, 30, 110, "#c49a6c", "#8d6e45", 1.6f, 25),
            P("Bench seat", 180, 205, 240, 25, "#a0703c", "#7a5229", 1.4f, 30), P("Gunwale trim", 100, 230, 400, 22, "#f5f5f5", "#cfd8dc", 1.3f, 35),
            P("Hull", 90, 252, 420, 90, "#2f6f9f", "#1e4f73", 1.7f, 70), P("Keel", 150, 342, 300, 30, "#24374a", "#162231", 2.2f, 40),
            P("Life ring", 270, 270, 60, 60, "#ff7043", "#ffffff", 1.5f, 30, true) },
        new[] { // slide
            P("Platform roof", 100, 70, 170, 34, "#ff7043", "#e64a19", 1.5f, 35), P("Ladder", 110, 104, 50, 266, "#e0e0e0", "#9e9e9e", 1.6f, 40),
            P("Upper chute", 250, 120, 250, 50, "#fdd835", "#f9a825", 1.4f, 55), P("Lower chute", 330, 170, 200, 50, "#fdd835", "#f9a825", 1.5f, 45),
            P("Climbing wall", 170, 200, 120, 160, "#42a5f5", "#1e88e5", 1.7f, 45), P("Base posts", 120, 370, 380, 30, "#8d6e63", "#5d4037", 2.0f, 40),
            P("Park sign", 420, 290, 80, 50, "#43a047", "#2e7d32", 1.3f, 25) },
    };

    int stageIdx;
    readonly List<Part> parts = new List<Part>();
    Nozzle nozzle = Nozzle.Fifteen;
    bool vertical, spraying;
    float time, highlight, cash, par, toastT;
    int total, starsWon, stripped;
    string toast = "";
    Vector2 aimPx; bool aimOn;

    Camera cam;
    Transform root, lance, ringT, stream;
    Material ringMat, streamMat;
    Bursts bursts;
    Synth synth;
    bool showStages;
    AudioSource hiss;

    int Obj => stageIdx % 6;
    int Tier => stageIdx / 6;

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        cam = new GameObject("Camera").AddComponent<Camera>();
        cam.fieldOfView = 40f;
        cam.clearFlags = CameraClearFlags.SolidColor;
        cam.farClipPlane = 120f;
        var sun = new GameObject("Sun").AddComponent<Light>();
        sun.type = LightType.Directional; sun.intensity = 1.05f;
        sun.transform.rotation = Quaternion.Euler(35f, -25f, 0f);
        RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat;
        RenderSettings.ambientLight = new Color(0.62f, 0.64f, 0.68f);
        bursts = new Bursts(transform, 1.2f);
        synth = new Synth(gameObject);
        // a looping noise for the jet
        hiss = gameObject.AddComponent<AudioSource>();
        var clip = AudioClip.Create("hiss", Synth.Rate, 1, Synth.Rate, false);
        var buf = new float[Synth.Rate]; uint rng = 12345;
        float lp = 0f;
        for (int i = 0; i < buf.Length; i++) { rng = rng * 1664525u + 1013904223u; float n = (rng >> 8) / 8388608f - 1f; lp += (n - lp) * 0.25f; buf[i] = lp * 0.5f; }
        clip.SetData(buf, 0);
        hiss.clip = clip; hiss.loop = true; hiss.volume = 0f; hiss.Play();
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        LoadStage(stageIdx, false);
    }

    static Color Hex(string h) { ColorUtility.TryParseHtmlString(h, out var c); return c; }
    static Vector3 W(float x, float y, float z = 0f) => new Vector3((x - 300f) / PX, (240f - y) / PX, z);

    // ---------------- Stage ----------------
    void LoadStage(int idx, bool ready = true)
    {
        stageIdx = Mathf.Clamp(idx, 0, StageCount - 1);
        if (root != null) Destroy(root.gameObject);
        foreach (var p in parts) if (p.tex != null) Destroy(p.tex);
        root = new GameObject("Job").transform;
        parts.Clear();
        int mod = new[] { 25, 18, 14, 11, 9 }[Tier];
        float toughMul = 1f + Tier * 0.12f;
        float work = 0f;
        foreach (var d in Objects[Obj])
        {
            var p = new Part { d = d, cols = Mathf.Max(1, Mathf.CeilToInt(d.w / CELL)), rows = Mathf.Max(1, Mathf.CeilToInt(d.h / CELL)) };
            p.dirt = new float[p.rows, p.cols]; p.soap = new bool[p.rows, p.cols]; p.grime = new Grime[p.rows, p.cols]; p.mask = new bool[p.rows, p.cols];
            int seedC = d.name[0];
            for (int r = 0; r < p.rows; r++)
                for (int c = 0; c < p.cols; c++)
                {
                    bool inside = true;
                    if (d.disc)
                    {
                        float nx = (c + 0.5f) / p.cols - 0.5f, ny = (r + 0.5f) / p.rows - 0.5f;
                        inside = nx * nx + ny * ny <= 0.25f;
                    }
                    p.mask[r, c] = inside;
                    p.dirt[r, c] = inside ? 1f : 0f;
                    int s = (r * 13 + c * 19 + seedC + stageIdx * 7) % mod;
                    p.grime[r, c] = s == 0 ? Grime.Tar : s == 1 ? Grime.Rust : s == 2 ? Grime.Moss : Grime.Normal;
                    if (inside) work += d.tough * toughMul;
                }
            parts.Add(p);
        }
        par = Mathf.Round(20f + work / 25f);
        nozzle = Nozzle.Fifteen; vertical = false; spraying = false;
        time = 0f; highlight = 0f; cash = 0f; total = 0; starsWon = 0; stripped = 0; toastT = 0f;
        showStages = false;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        UpdateCamera(1f, true);
    }

    float ToughOf(Part p) => p.d.tough * (1f + Tier * 0.12f);

    void BuildScene()
    {
        var sky = new[] { new Color(0.62f, 0.82f, 0.95f), new Color(0.75f, 0.85f, 0.72f), new Color(0.55f, 0.62f, 0.78f), new Color(0.72f, 0.84f, 0.78f), new Color(0.6f, 0.78f, 0.9f), new Color(0.88f, 0.82f, 0.68f) }[Obj];
        cam.backgroundColor = sky;
        var yardMat = OiyoArcade.Lit(Obj == 4 ? new Color(0.25f, 0.45f, 0.6f) : new Color(0.75f, 0.75f, 0.72f), 0.2f, OiyoArcade.Art("PW/tiles", true));
        yardMat.mainTextureScale = new Vector2(10f, 6f);
        var yard = OiyoArcade.Prim(PrimitiveType.Cube, "Yard", yardMat, root);
        yard.transform.position = new Vector3(0f, W(0, 420).y - 0.25f, 2f); yard.transform.localScale = new Vector3(30f, 0.5f, 10f);
        var back = OiyoArcade.Prim(PrimitiveType.Quad, "Backdrop", OiyoArcade.Lit(sky * 0.92f, 0f), root);
        back.transform.position = new Vector3(0f, 3f, 7f); back.transform.localScale = new Vector3(40f, 18f, 1f);
        var fence = OiyoArcade.Lit(new Color(0.85f, 0.82f, 0.76f), 0.1f);
        for (float x = -14f; x <= 14f; x += 1.2f)
        {
            var post = OiyoArcade.Prim(PrimitiveType.Cube, "Fence", fence, root);
            post.transform.position = new Vector3(x, W(0, 420).y + 0.7f, 5.5f); post.transform.localScale = new Vector3(0.3f, 1.4f, 0.1f);
        }
        for (int i = 0; i < parts.Count; i++)
        {
            var p = parts[i];
            var d = p.d;
            float z = -i * 0.06f;
            var center = W(d.x + d.w * 0.5f, d.y + d.h * 0.5f, z);
            GameObject slab;
            if (d.disc)
            {
                slab = OiyoArcade.Prim(PrimitiveType.Cylinder, d.name, OiyoArcade.Lit(Hex(d.baseHex), 0.5f), root);
                slab.transform.position = center + new Vector3(0f, 0f, 0.2f);
                slab.transform.rotation = Quaternion.Euler(90f, 0f, 0f);
                slab.transform.localScale = new Vector3(d.w / PX, 0.25f, d.h / PX);
                var hub = OiyoArcade.Prim(PrimitiveType.Cylinder, "Hub", OiyoArcade.Lit(Hex(d.accentHex), 0.6f, null, 0.4f), slab.transform);
                hub.transform.localScale = new Vector3(0.45f, 1.1f, 0.45f);
            }
            else
            {
                slab = OiyoArcade.Prim(PrimitiveType.Cube, d.name, OiyoArcade.Lit(Hex(d.baseHex), d.baseHex == "#38bdf8" || d.baseHex == "#8fd3ff" ? 0.85f : 0.35f), root);
                slab.transform.position = center + new Vector3(0f, 0f, 0.25f);
                slab.transform.localScale = new Vector3(d.w / PX, d.h / PX, 0.5f);
                var trim = OiyoArcade.Prim(PrimitiveType.Cube, "Trim", OiyoArcade.Lit(Hex(d.accentHex), 0.4f), slab.transform);
                trim.transform.localPosition = new Vector3(0f, -0.42f, -0.45f); trim.transform.localScale = new Vector3(1f, 0.12f, 0.1f);
            }
            p.slab = slab.transform;
            p.tex = new Texture2D(p.cols, p.rows, TextureFormat.RGBA32, false) { wrapMode = TextureWrapMode.Clamp, filterMode = FilterMode.Bilinear };
            p.mat = OiyoArcade.Transparent(p.tex, Color.white);
            var q = OiyoArcade.Prim(PrimitiveType.Quad, "Dirt", p.mat, root);
            q.transform.position = center + new Vector3(0f, 0f, -0.03f - 0.001f * i);
            q.transform.localScale = new Vector3(d.w / PX, d.h / PX, 1f);
            p.dirty = true;
            Repaint(p);
        }
        // the lance held at the bottom right of the view
        lance = new GameObject("Lance").transform; lance.SetParent(cam.transform, false);
        var gun = OiyoArcade.Prim(PrimitiveType.Cube, "Gun", OiyoArcade.Lit(new Color(0.95f, 0.75f, 0.1f), 0.5f), lance);
        gun.transform.localScale = new Vector3(0.12f, 0.16f, 0.3f);
        var tube = OiyoArcade.Prim(PrimitiveType.Cylinder, "Wand", OiyoArcade.Lit(new Color(0.2f, 0.2f, 0.22f), 0.7f, null, 0.6f), lance);
        tube.transform.localPosition = new Vector3(0f, 0.05f, 0.45f); tube.transform.localRotation = Quaternion.Euler(90f, 0f, 0f); tube.transform.localScale = new Vector3(0.035f, 0.35f, 0.035f);
        var tip = OiyoArcade.Prim(PrimitiveType.Cylinder, "Tip", OiyoArcade.Lit(NColor[1], 0.4f), lance);
        tip.transform.localPosition = new Vector3(0f, 0.05f, 0.8f); tip.transform.localRotation = Quaternion.Euler(90f, 0f, 0f); tip.transform.localScale = new Vector3(0.06f, 0.04f, 0.06f);
        ringMat = OiyoArcade.Transparent(OiyoArcade.Art("PW/ring"), new Color(1f, 1f, 1f, 0.8f));
        ringT = OiyoArcade.Prim(PrimitiveType.Quad, "Aim", ringMat, root).transform;
        streamMat = OiyoArcade.Transparent(OiyoArcade.GlowTexture(), new Color(0.8f, 0.92f, 1f, 0.55f));
        stream = OiyoArcade.Prim(PrimitiveType.Quad, "Stream", streamMat, root).transform;
    }

    static readonly Color32 Clear = new Color32(0, 0, 0, 0);
    Color32[] px;
    void Repaint(Part p)
    {
        if (!p.dirty) return;
        p.dirty = false;
        int n = p.cols * p.rows;
        if (px == null || px.Length < n) px = new Color32[Mathf.Max(n, 4096)];
        bool glow = highlight > 0f;
        float pulse = 0.6f + 0.4f * Mathf.Sin(Time.time * 10f);
        for (int r = 0; r < p.rows; r++)
            for (int c = 0; c < p.cols; c++)
            {
                int i = (p.rows - 1 - r) * p.cols + c;
                float d = p.dirt[r, c];
                if (d <= 0.001f || !p.mask[r, c]) { px[i] = Clear; continue; }
                Color col = p.grime[r, c] == Grime.Tar ? new Color(0.08f, 0.08f, 0.1f) : p.grime[r, c] == Grime.Rust ? new Color(0.62f, 0.3f, 0.1f) : p.grime[r, c] == Grime.Moss ? new Color(0.25f, 0.45f, 0.16f) : new Color(0.38f, 0.29f, 0.19f);
                float a = Mathf.Clamp01(d * 1.15f) * 0.94f;
                if (p.soap[r, c]) { col = Color.Lerp(col, new Color(0.85f, 0.95f, 1f), 0.65f); a = Mathf.Max(a, 0.6f); }
                if (glow) { col = Color.Lerp(col, new Color(1f, 0.2f, 0.9f), pulse); a = Mathf.Max(a, 0.85f); }
                col.a = a;
                px[i] = col;
            }
        var arr = new Color32[n];
        System.Array.Copy(px, arr, n);
        p.tex.SetPixels32(arr);
        p.tex.Apply(false);
    }

    // ---------------- Spray (the web's sprayAt) ----------------
    void SprayAt(float x, float y, float dt)
    {
        int nz = (int)nozzle;
        float rx = vertical ? NRy[nz] : NRx[nz], ry = vertical ? NRx[nz] : NRy[nz];
        float power = NPower[nz];
        foreach (var p in parts)
        {
            if (p.done) continue;
            var d = p.d;
            if (x + rx < d.x || x - rx > d.x + d.w || y + ry < d.y || y - ry > d.y + d.h) continue;
            int c0 = Mathf.Max(0, Mathf.FloorToInt((x - rx - d.x) / CELL)), c1 = Mathf.Min(p.cols - 1, Mathf.FloorToInt((x + rx - d.x) / CELL));
            int r0 = Mathf.Max(0, Mathf.FloorToInt((y - ry - d.y) / CELL)), r1 = Mathf.Min(p.rows - 1, Mathf.FloorToInt((y + ry - d.y) / CELL));
            bool modified = false;
            float tough = ToughOf(p);
            for (int r = r0; r <= r1; r++)
                for (int c = c0; c <= c1; c++)
                {
                    float cx = d.x + c * CELL + CELL * 0.5f, cy = d.y + r * CELL + CELL * 0.5f;
                    float ndx = (cx - x) / rx, ndy = (cy - y) / ry, dsq = ndx * ndx + ndy * ndy;
                    if (dsq > 1f || p.dirt[r, c] <= 0f) continue;
                    float fall = 1f - dsq * 0.4f;
                    var g = p.grime[r, c];
                    float typeMul = 1f;
                    if (g == Grime.Tar) typeMul = nozzle == Nozzle.Zero ? 1.6f : 0.35f;
                    else if (g == Grime.Rust) typeMul = p.soap[r, c] ? 2.5f : 0.45f;
                    else if (g == Grime.Moss) typeMul = nozzle == Nozzle.Forty ? 1.7f : 0.7f;
                    if (nozzle == Nozzle.Soap)
                    {
                        p.soap[r, c] = true;
                        p.dirt[r, c] = Mathf.Max(0.35f, p.dirt[r, c] - power * dt * fall);
                    }
                    else
                    {
                        float bonus = p.soap[r, c] ? 2.2f : 1f;
                        float prev = p.dirt[r, c];
                        p.dirt[r, c] = Mathf.Max(0f, p.dirt[r, c] - power * bonus * typeMul / tough * dt * fall);
                        if (prev > 0f && p.dirt[r, c] == 0f) { p.soap[r, c] = false; if (g != Grime.Normal) stripped++; }
                    }
                    modified = true;
                }
            if (!modified) continue;
            p.dirty = true;
            Recalc(p);
            if (p.done)
            {
                cash += p.d.reward;
                Toast(F("{0} 100%! +${1}", U(p.d.name), p.d.reward));
                StartCoroutine(Ding());
                bursts.Emit(W(d.x + d.w * 0.5f, d.y + d.h * 0.5f, -0.4f), new Color(1f, 1f, 0.7f), 30, 4f, 0.2f, 0.7f, Vector3.up * 1.5f);
            }
        }
        int sum = 0; bool all = true;
        foreach (var p in parts) { sum += p.clean; if (!p.done) all = false; }
        total = parts.Count > 0 ? sum / parts.Count : 0;
        if (all) Win();
    }

    void Recalc(Part p)
    {
        float dirt = 0f; int cells = 0;
        for (int r = 0; r < p.rows; r++) for (int c = 0; c < p.cols; c++) if (p.mask[r, c]) { dirt += p.dirt[r, c]; cells++; }
        float ratio = 1f - dirt / Mathf.Max(1, cells);
        if (ratio >= 0.95f)
        {
            for (int r = 0; r < p.rows; r++) for (int c = 0; c < p.cols; c++) { p.dirt[r, c] = 0f; p.soap[r, c] = false; }
            p.clean = 100; p.done = true;
        }
        else p.clean = Mathf.Min(99, Mathf.FloorToInt(ratio / 0.95f * 100f));
    }

    IEnumerator Ding()
    {
        synth.Tone(1568f, 0.5f, Wave.Sine, 0.25f, 0f, 5f);
        yield return new WaitForSeconds(0.08f);
        synth.Tone(2093f, 0.6f, Wave.Sine, 0.2f, 0f, 4f);
    }

    void Toast(string s) { toast = s; toastT = 1.8f; }

    void Win()
    {
        if (state != GameState.Playing) return;
        starsWon = 1 + (time <= par * 1.6f ? 1 : 0) + (time <= par ? 1 : 0);
        state = GameState.Victory;
        OiyoArcade.Record(Slug, stageIdx, starsWon, score, StageCount);
        StartCoroutine(Arp(new[] { 784f, 988f, 1175f, 1568f }, 0.09f));
        hiss.volume = 0f;
    }

    int score => Mathf.RoundToInt(cash * 10f + Mathf.Max(0f, par * 2f - time) * 10f + starsWon * 100);

    IEnumerator Arp(float[] fs, float gap)
    {
        foreach (var f in fs) { synth.Tone(f, 0.18f, Wave.Triangle, 0.22f, 0f, 6f); yield return new WaitForSeconds(gap); }
    }

    // ---------------- Loop ----------------
    int sprayId = int.MinValue;

    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("pressure-wash-3d", state, score);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        spraying = false;
        if (state == GameState.Playing)
        {
            time += dt;
            if (aimOn && (sprayId != int.MinValue || Input.GetKey(KeyCode.Space)))
            {
                spraying = true;
                int n = Mathf.CeilToInt(dt / (1f / 60f));
                for (int i = 0; i < n && state == GameState.Playing; i++) SprayAt(aimPx.x, aimPx.y, dt / n);
            }
        }
        float hl0 = highlight;
        highlight = Mathf.Max(0f, highlight - dt);
        foreach (var p in parts) { if (highlight > 0f || (hl0 > 0f && highlight <= 0f)) p.dirty = true; Repaint(p); }
        toastT = Mathf.Max(0f, toastT - dt);
        hiss.volume = Mathf.MoveTowards(hiss.volume, spraying && !synth.Muted ? (nozzle == Nozzle.Zero ? 0.32f : 0.22f) : 0f, dt * 4f);
        hiss.pitch = nozzle == Nozzle.Zero ? 1.4f : nozzle == Nozzle.Soap ? 0.7f : nozzle == Nozzle.Forty ? 0.9f : 1.1f;
        SyncView(dt);
        UpdateCamera(dt, false);
    }

    void ReadInput()
    {
        bool confirm = Input.GetKeyDown(KeyCode.Return);
        switch (state)
        {
            case GameState.Ready:
            case GameState.Playing:
                {
                    if (state == GameState.Playing && (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P))) { state = GameState.Paused; return; }
                    var began = OiyoArcade.Began();
                    foreach (var b in began) if (sprayId == int.MinValue) sprayId = b.id;
                    Vector2? at = null;
                    if (sprayId != int.MinValue)
                    {
                        bool held = false;
                        foreach (var h in OiyoArcade.Held()) if (h.id == sprayId) { held = true; at = h.pos; }
                        if (!held) sprayId = int.MinValue;
                    }
                    if (at == null && !Input.touchSupported && Input.mousePresent) at = Input.mousePosition;
                    aimOn = false;
                    if (at.HasValue)
                    {
                        var ray = cam.ScreenPointToRay(at.Value);
                        if (Mathf.Abs(ray.direction.z) > 1e-4f)
                        {
                            float t = (-0.05f - ray.origin.z) / ray.direction.z;
                            var p = ray.origin + ray.direction * t;
                            aimPx = new Vector2(p.x * PX + 300f, 240f - p.y * PX);
                            aimOn = true;
                        }
                    }
                    if (Input.GetKeyDown(KeyCode.Alpha1)) SetNozzle(Nozzle.Zero);
                    if (Input.GetKeyDown(KeyCode.Alpha2)) SetNozzle(Nozzle.Fifteen);
                    if (Input.GetKeyDown(KeyCode.Alpha3)) SetNozzle(Nozzle.Forty);
                    if (Input.GetKeyDown(KeyCode.Alpha4)) SetNozzle(Nozzle.Soap);
                    if (Input.GetKeyDown(KeyCode.R)) Rotate();
                    if (Input.GetKeyDown(KeyCode.T)) ShowDirt();
                    if (state == GameState.Ready && (began.Count > 0 || Input.anyKeyDown)) state = GameState.Playing;
                    return;
                }
            case GameState.Paused:
                if (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P)) state = GameState.Playing;
                return;
            case GameState.Victory:
            case GameState.GameOver:
                if (confirm) LoadStage(state == GameState.Victory ? Mathf.Min(stageIdx + 1, StageCount - 1) : stageIdx);
                return;
            case GameState.Menu:
                if (!showStages && (confirm || Input.GetKeyDown(KeyCode.Space))) LoadStage(stageIdx);
                return;
        }
    }

    void SetNozzle(Nozzle n)
    {
        nozzle = n;
        synth.Tone(n == Nozzle.Soap ? 500f : 700f + (int)n * 120f, 0.06f, Wave.Square, 0.06f, 0f, 20f);
        if (lance != null) lance.GetChild(2).GetComponent<Renderer>().sharedMaterial.color = NColor[(int)n];
    }
    void Rotate() { vertical = !vertical; synth.Tone(600f, 0.05f, Wave.Triangle, 0.06f, 800f, 20f); }
    void ShowDirt() { highlight = 2.5f; synth.Tone(1200f, 0.12f, Wave.Sine, 0.08f, 600f, 8f); }

    void SyncView(float dt)
    {
        if (ringT == null) return;
        bool show = aimOn && (state == GameState.Playing || state == GameState.Ready);
        ringT.gameObject.SetActive(show);
        int nz = (int)nozzle;
        float rx = (vertical ? NRy[nz] : NRx[nz]) / PX, ry = (vertical ? NRx[nz] : NRy[nz]) / PX;
        var hit = W(aimPx.x, aimPx.y, -0.6f);
        if (show)
        {
            ringT.position = hit;
            ringT.rotation = Quaternion.identity;
            ringT.localScale = new Vector3(rx * 2f, ry * 2f, 1f);
            ringMat.color = new Color(NColor[nz].r, NColor[nz].g, NColor[nz].b, spraying ? 0.95f : 0.6f);
        }
        stream.gameObject.SetActive(spraying);
        var tip = lance.TransformPoint(new Vector3(0f, 0.05f, 0.84f));
        if (spraying)
        {
            stream.position = (tip + hit) * 0.5f;
            var dir = hit - tip;
            stream.rotation = Quaternion.LookRotation(cam.transform.forward, Vector3.Cross(dir, cam.transform.forward).normalized);
            stream.localScale = new Vector3(dir.magnitude, nozzle == Nozzle.Forty || nozzle == Nozzle.Soap ? 0.45f : 0.22f, 1f);
            streamMat.color = nozzle == Nozzle.Soap ? new Color(0.75f, 0.92f, 1f, 0.75f) : new Color(0.8f, 0.92f, 1f, 0.5f);
            if (Random.value < 0.6f) bursts.Emit(hit, nozzle == Nozzle.Soap ? new Color(0.95f, 0.98f, 1f) : new Color(0.75f, 0.9f, 1f), 2, 2.5f, 0.12f, 0.35f, new Vector3(0f, 0f, -1.5f));
        }
        // the lance points at the aim
        if (show) lance.rotation = Quaternion.Slerp(lance.rotation, Quaternion.LookRotation(hit - lance.position), dt * 14f);
    }

    void UpdateCamera(float dt, bool snap)
    {
        bool portrait = cam.aspect < 1f;
        // frame the 600 x 480 px job area (12 x 9.6 units) under the HUD and above the nozzle bar
        float needW = 13.2f, needH = portrait ? 9.6f + 7.5f : 9.6f + 4.6f;
        float halfV = cam.fieldOfView * 0.5f * Mathf.Deg2Rad;
        float dist = Mathf.Max(needH * 0.5f / Mathf.Tan(halfV), needW * 0.5f / (Mathf.Tan(halfV) * cam.aspect));
        float sway = state == GameState.Menu ? Mathf.Sin(Time.time * 0.3f) * 2.5f : Mathf.Sin(Time.time * 0.15f) * 0.4f;
        var pos = new Vector3(sway, portrait ? 0.4f : 0.6f, -dist);
        cam.transform.position = snap ? pos : Vector3.Lerp(cam.transform.position, pos, 1f - Mathf.Exp(-dt * 3f));
        cam.transform.rotation = Quaternion.LookRotation(new Vector3(0f, portrait ? -0.2f : 0.1f, 0f) - cam.transform.position);
        if (lance != null)
        {
            lance.localPosition = portrait ? new Vector3(0.18f, -0.42f, 0.8f) : new Vector3(0.42f, -0.3f, 0.8f);
        }
    }

    // ?oiyotest=1 prints the run state to the browser console for the automated play check.
    bool testLog; float testT;
    void TestTick(float dt)
    {
        if (!testLog || (testT -= dt) > 0f) return;
        testT = 0.25f;
        var sb = new System.Text.StringBuilder();
        foreach (var p in parts) sb.Append($"[{p.d.x:F0},{p.d.y:F0},{p.d.w:F0},{p.d.h:F0},{p.clean}],");
        var s0 = cam.WorldToScreenPoint(W(0f, 0f, -0.05f)); var s1 = cam.WorldToScreenPoint(W(600f, 480f, -0.05f));
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"m\":[{s0.x:F1},{s0.y:F1},{s1.x:F1},{s1.y:F1}],\"t\":{time:F1},\"total\":{total},\"n\":{(int)nozzle},\"aim\":[{aimPx.x:F0},{aimPx.y:F0}],\"on\":{(aimOn ? 1 : 0)},\"p\":[{sb.ToString().TrimEnd(',')}]}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.15f, 0.6f, 0.95f, 0.97f);
    static readonly Color Dark = new Color(0.05f, 0.09f, 0.14f, 0.84f);
    static readonly Color Gold = new Color(1f, 0.82f, 0.25f, 0.97f);
    static readonly Color Slate = new Color(0.17f, 0.22f, 0.3f, 0.95f);

    string StageTitle(int i) => F("Job {0}", i + 1) + " · " + U(ObjectNames[i % 6]) + " · " + U(TierNames[i / 6]);
    static string Mmss(float s) => $"{Mathf.FloorToInt(s / 60f)}:{Mathf.FloorToInt(s % 60f):00}";

    Part HoverPart()
    {
        if (!aimOn) return null;
        for (int i = parts.Count - 1; i >= 0; i--)
        {
            var d = parts[i].d;
            if (aimPx.x >= d.x && aimPx.x <= d.x + d.w && aimPx.y >= d.y && aimPx.y <= d.y + d.h) return parts[i];
        }
        return null;
    }

    void OnGUI()
    {
        OiyoArcade.Begin();
        float w = OiyoArcade.W, h = OiyoArcade.H;
        if (state == GameState.Menu) { DrawMenu(w, h); return; }
        var bar = new Rect(8f, 8f, w - 16f, 70f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 12f, w - 140f, 22f), "<b>" + StageTitle(stageIdx) + "</b>", 14, new Color(0.85f, 0.95f, 1f));
        OiyoArcade.Text(new Rect(20f, 34f, w - 90f, 22f), $"{U("Clean")} <b>{total}%</b>   ${cash:F0}   {Mmss(time)} <size=12>/ {Mmss(par)}</size>", 15, Color.white);
        OiyoArcade.Bar(new Rect(20f, 60f, w - 96f, 7f), total / 100f, new Color(0f, 0f, 0f, 0.5f), new Color(0.4f, 0.85f, 1f));
        if (OiyoArcade.Button(new Rect(w - 64f, 14f, 46f, 46f), "<b>II</b>", Slate, 18))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        var hp = HoverPart();
        if (hp != null && (state == GameState.Playing || state == GameState.Ready))
            OiyoArcade.Text(new Rect(16f, 84f, w - 32f, 20f), $"{U(hp.d.name)} <b>{hp.clean}%</b>", 14, hp.done ? new Color(0.6f, 1f, 0.6f) : Color.white, TextAnchor.UpperCenter);
        if (toastT > 0f) OiyoArcade.Shadowed(new Rect(0f, 104f, w, 30f), toast, 19, Gold, TextAnchor.MiddleCenter);
        if (state == GameState.Playing || state == GameState.Ready) DrawTools(w, h);
        if (state == GameState.Ready)
        {
            var r = new Rect(w * 0.5f - 170f, h * 0.5f - 64f, 340f, 128f);
            OiyoArcade.Panel(r, Dark);
            OiyoArcade.Text(new Rect(r.x + 12f, r.y + 8f, r.width - 24f, r.height - 16f),
                $"<b>{U("Wash every part to 100%")}</b>\n<size=13>{U("Hold on the object to spray. 0° cuts tar, soap loosens rust, 40° clears moss. Keys: 1-4 nozzles, R turn the fan, T show dirt.")}</size>", 16, Color.white, TextAnchor.MiddleCenter);
        }
        if (state == GameState.Paused) DrawPause(w, h);
        if (state == GameState.Victory || state == GameState.GameOver) DrawResult(w, h);
    }

    void DrawTools(float w, float h)
    {
        // nozzle bar along the bottom, starting right of the page's exit button (bottom-left)
        float bs = Mathf.Clamp((w - 96f - 5f * 6f) / 6f, 44f, 64f);
        float x = w - 6f * (bs + 6f) - 8f, y = h - bs - 14f;
        x = Mathf.Max(x, 86f);
        for (int i = 0; i < 4; i++)
        {
            var r = new Rect(x + i * (bs + 6f), y, bs, bs);
            bool on = (int)nozzle == i;
            string label = i == 3 ? U("SOAP") : NLabel[i];
            if (OiyoArcade.Button(r, $"<b>{label}</b>", on ? new Color(NColor[i].r * 0.75f, NColor[i].g * 0.75f, NColor[i].b * 0.75f, 0.97f) : Slate, i == 3 ? 10 : 16, on && i == 2 ? new Color(0.1f, 0.1f, 0.1f) : Color.white)) SetNozzle((Nozzle)i);
        }
        if (OiyoArcade.Button(new Rect(x + 4 * (bs + 6f), y, bs, bs), vertical ? "↕" : "↔", Slate, 22)) Rotate();
        if (OiyoArcade.Button(new Rect(x + 5 * (bs + 6f), y, bs, bs), "<size=11>" + U("Dirt") + "</size>\n◎", highlight > 0f ? Accent : Slate, 16)) ShowDirt();
    }

    void DrawMenu(float w, float h)
    {
        if (showStages)
        {
            float bw = Mathf.Min(w - 16f, 760f);
            var box = new Rect(w * 0.5f - bw * 0.5f, 12f, bw, h - 24f);
            OiyoArcade.Panel(box, new Color(0.05f, 0.09f, 0.14f, 0.94f));
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
        OiyoArcade.Shadowed(new Rect(card.x, card.y + 18f, cw, 40f), U("Pressure Wash 3D"), 30, new Color(0.7f, 0.92f, 1f), TextAnchor.MiddleCenter);
        OiyoArcade.Text(new Rect(card.x + 20f, card.y + 60f, cw - 40f, 50f), U("Pick the right nozzle for mud, tar, rust and moss and make every part ding at 100%."), 15, new Color(1f, 1f, 1f, 0.85f), TextAnchor.MiddleCenter);
        OiyoArcade.Text(new Rect(card.x, card.y + 110f, cw, 24f), StageTitle(stageIdx), 14, Gold, TextAnchor.MiddleCenter);
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
        float cw = Mathf.Min(360f, w - 24f);
        float ch = 158f + 58f + 52f + 40f + 18f;
        var card = new Rect(w * 0.5f - cw * 0.5f, h * 0.5f - ch * 0.5f, cw, ch);
        OiyoArcade.Panel(card, Dark);
        OiyoArcade.Shadowed(new Rect(card.x, card.y + 14f, cw, 38f), U("Spotless!"), 28, new Color(0.6f, 0.95f, 1f), TextAnchor.MiddleCenter);
        OiyoArcade.Text(new Rect(card.x + 16f, card.y + 56f, cw - 32f, 44f), $"<size=30>{OiyoArcade.StarString(starsWon)}</size>", 16, Color.white, TextAnchor.MiddleCenter);
        OiyoArcade.Text(new Rect(card.x + 16f, card.y + 100f, cw - 32f, 52f),
            $"{U("Score")} <b>{score}</b>   ${cash:F0}\n<size=14>{U("Time")} {Mmss(time)} · {F("Par {0}", Mmss(par))} · {F("{0} tough spots", stripped)}</size>", 16, Color.white, TextAnchor.MiddleCenter);
        float y = card.y + 158f;
        if (stageIdx < StageCount - 1)
        {
            if (OiyoArcade.Button(new Rect(card.x + 24f, y, cw - 48f, 50f), "<b>" + U("Next stage") + " ▶</b>", Accent, 19)) LoadStage(stageIdx + 1);
        }
        else OiyoArcade.Text(new Rect(card.x, y, cw, 50f), "★ " + U("You cleared all 30 stages!") + " ★", 17, Gold, TextAnchor.MiddleCenter);
        y += 58f;
        if (OiyoArcade.Button(new Rect(card.x + 24f, y, cw - 48f, 44f), U("Retry"), Slate, 17)) LoadStage(stageIdx);
        y += 52f;
        if (OiyoArcade.Button(new Rect(card.x + 24f, y, cw - 48f, 40f), U("Stage list"), Slate, 16)) { LoadStage(stageIdx, false); showStages = true; }
    }
}
