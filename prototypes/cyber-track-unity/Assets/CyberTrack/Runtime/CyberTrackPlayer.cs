using System.Collections;
using System.Collections.Generic;
using System.Text;
using UnityEngine;

// CyberTrack 3D: the web CyberTrack (src/components/games/CyberTrack3D.tsx,
// src/lib/games/cyber-track.ts) rebuilt as a 30-stage Unity time-attack racer. The web car
// in metres and km/h: 55 km/h/s acceleration, 180 km/h top speed (x1.4 on boost), 18 km/h/s
// rolling drag, 90 km/h/s brakes, 2.4 rad/s steering that comes in fully above 60 km/h, and a
// drift that turns 1.4x sharper while it bleeds speed and earns drift points. Gates must be
// passed in order and the lap ends back at the start line, as on the web. The first three
// stages are the web's three circuits (Alpha, Neon Heights, Poly Roller); the rest are fixed
// seeded loops that get longer and twistier, and every five stages adds something: hairpins
// on a narrower road, boost pads, oil slicks, sliding barriers, then all of it at night.
// Here the throttle is automatic: steer with the screen halves (both = brake) or the keys.
// Your best lap on each stage races beside you as a ghost. Stars from the time against par;
// running out the clock (twice par) ends the run.
public class CyberTrackPlayer : MonoBehaviour
{
    const string Slug = "cyber-track";
    const int StageCount = 30;
    const float MaxSpeed = 180f, Accel = 55f, Brake = 90f, Rolling = 18f, SteerRate = 2.4f, OffRoadMax = 70f;
    const int Sub = 24;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    static readonly string[] ZoneNames = { "Neon circuits", "Hairpins", "Boost lanes", "Oil slicks", "Sliding gates", "Night sprint" };
    static readonly Color[] ZoneColor = { new Color(0.3f, 0.95f, 1f), new Color(1f, 0.45f, 0.85f), new Color(0.55f, 1f, 0.45f), new Color(1f, 0.75f, 0.3f), new Color(0.7f, 0.55f, 1f), new Color(1f, 0.35f, 0.35f) };
    static readonly string[] WebTracks = { "Circuit Alpha", "Neon Heights", "Poly Roller" };

    class Pad { public Vector2 p; public float r; }
    class Gate { public int sample; public float amp, speed, phase; public Vector2 pos; public Transform t; }

    int stageIdx;
    readonly List<Vector2> ctrl = new List<Vector2>();
    readonly List<Vector2> path = new List<Vector2>();
    readonly List<float> dist = new List<float>();
    readonly List<int> checkpoints = new List<int>();
    readonly List<Transform> cpGates = new List<Transform>();
    readonly List<Pad> boosts = new List<Pad>(), oils = new List<Pad>();
    readonly List<Gate> gates = new List<Gate>();
    float roadW, length, par, limit;
    // car
    Vector2 pos; float angle, speed, steer, slide, boostT, slipT, holdSteerT;
    bool drifting, offRoad;
    int nextCp, nearIdx, lastCpSample;
    float raceTime, driftScore;
    int score, stars;
    string endReason = "";
    // ghost
    readonly List<Vector3> ghost = new List<Vector3>();
    readonly StringBuilder record = new StringBuilder();
    float recordT;
    float bestTime;

    Camera cam;
    Transform root, car, carBody, ghostCar;
    readonly List<Transform> wheels = new List<Transform>();
    Bursts bursts;
    Synth synth;
    AudioSource engine;
    bool showStages;
    float shake;

    int Zone => stageIdx / 5;
    Color AccentZ => ZoneColor[Zone];

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
        cam.fieldOfView = 58f;
        cam.clearFlags = CameraClearFlags.SolidColor;
        cam.farClipPlane = 420f;
        cam.nearClipPlane = 0.3f;
        var key = new GameObject("Key").AddComponent<Light>();
        key.type = LightType.Directional;
        key.intensity = 0.9f;
        key.color = new Color(0.9f, 0.9f, 1f);
        key.transform.rotation = Quaternion.Euler(50f, 30f, 0f);
        RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat;
        RenderSettings.fog = true;
        RenderSettings.fogMode = FogMode.Linear;
        bursts = new Bursts(transform, 0.3f);
        synth = new Synth(gameObject);
        // a looping engine hum whose pitch follows the speed
        engine = gameObject.AddComponent<AudioSource>();
        var buf = new float[Synth.Rate / 2];
        for (int i = 0; i < buf.Length; i++)
        {
            float t = i / (float)Synth.Rate;
            buf[i] = (Mathf.Sin(t * 110f * 6.2832f) * 0.5f + Mathf.Sin(t * 220f * 6.2832f) * 0.25f + (Mathf.Repeat(t * 55f, 1f) - 0.5f) * 0.3f) * 0.18f;
        }
        var clip = AudioClip.Create("engine", buf.Length, 1, Synth.Rate, false);
        clip.SetData(buf, 0);
        engine.clip = clip; engine.loop = true; engine.volume = 0f; engine.Play();
    }

    // ---------------- Track ----------------
    void BuildTrack()
    {
        ctrl.Clear();
        int z = Zone;
        if (stageIdx == 0) ctrl.AddRange(new[] { new Vector2(0, 0), new Vector2(0, 60), new Vector2(50, 100), new Vector2(100, 50), new Vector2(80, -30), new Vector2(20, -20) });
        else if (stageIdx == 1) ctrl.AddRange(new[] { new Vector2(-40, 0), new Vector2(-40, 70), new Vector2(20, 120), new Vector2(80, 80), new Vector2(60, -20), new Vector2(-20, -60) });
        else if (stageIdx == 2) ctrl.AddRange(new[] { new Vector2(0, -50), new Vector2(0, 30), new Vector2(-60, 80), new Vector2(-30, 140), new Vector2(60, 120), new Vector2(80, 20), new Vector2(30, -40) });
        else
        {
            var rnd = new System.Random(4100 + stageIdx * 53);
            float R(float a, float b) => a + (float)rnd.NextDouble() * (b - a);
            int n = 7 + z + (stageIdx % 5 >= 3 ? 1 : 0);
            float rad = 58f + stageIdx * 1.6f;
            float lo = z == 1 || z == 5 ? 0.5f : 0.68f, hi = z == 1 || z == 5 ? 1.35f : 1.25f;
            for (int i = 0; i < n; i++)
            {
                float a = (i + R(-0.22f, 0.22f)) / n * Mathf.PI * 2f;
                float r = rad * R(lo, hi);
                ctrl.Add(new Vector2(Mathf.Sin(a) * r * 1.15f, Mathf.Cos(a) * r));
            }
        }
        roadW = z == 0 ? 14f : z == 1 ? 11f : z == 5 ? 10.5f : 12f;
        // closed Catmull-Rom through the control points
        path.Clear(); dist.Clear(); checkpoints.Clear();
        int m = ctrl.Count;
        for (int i = 0; i < m; i++)
        {
            Vector2 p0 = ctrl[(i - 1 + m) % m], p1 = ctrl[i], p2 = ctrl[(i + 1) % m], p3 = ctrl[(i + 2) % m];
            for (int k = 0; k < Sub; k++)
            {
                float t = k / (float)Sub, t2 = t * t, t3 = t2 * t;
                path.Add(0.5f * (2f * p1 + (-p0 + p2) * t + (2f * p0 - 5f * p1 + 4f * p2 - p3) * t2 + (-p0 + 3f * p1 - 3f * p2 + p3) * t3));
            }
            if (i > 0) checkpoints.Add(i * Sub);
        }
        float acc = 0f;
        for (int i = 0; i < path.Count; i++)
        {
            dist.Add(acc);
            acc += (path[(i + 1) % path.Count] - path[i]).magnitude;
        }
        length = acc;
        // par: about 32 m/s on average plus the start; the clock runs out at twice par
        par = Mathf.Round(length / (31f + Mathf.Min(4f, stageIdx * 0.15f)) + 3f);
        limit = par * 2f;

        boosts.Clear(); oils.Clear(); gates.Clear();
        var hz = new System.Random(5200 + stageIdx * 71);
        int count = path.Count;
        for (int i = Sub; i < count - Sub / 2; i += Sub / 2)
        {
            double roll = hz.NextDouble();
            Vector2 tng = Tangent(i), nrm = new Vector2(-tng.y, tng.x);
            if ((z == 2 || z == 5) && roll < 0.3) boosts.Add(new Pad { p = path[i], r = 2.6f });
            else if ((z == 3 || z == 5) && roll < 0.55) oils.Add(new Pad { p = path[i] + nrm * (float)(hz.NextDouble() - 0.5) * roadW * 0.5f, r = 2.6f });
            else if ((z == 4 || z == 5) && roll < 0.78) gates.Add(new Gate { sample = i, amp = roadW * 0.32f, speed = 0.9f + (float)hz.NextDouble() * 0.8f, phase = (float)hz.NextDouble() * 6.28f });
        }
    }

    Vector2 Tangent(int i)
    {
        int n = path.Count;
        var d = path[(i + 1) % n] - path[(i - 1 + n) % n];
        return d.sqrMagnitude > 1e-6f ? d.normalized : Vector2.up;
    }

    Mesh Ribbon(float inner, float outer, float vScale)
    {
        int n = path.Count;
        var verts = new Vector3[(n + 1) * 2];
        var uvs = new Vector2[(n + 1) * 2];
        var tris = new int[n * 6];
        for (int i = 0; i <= n; i++)
        {
            int k = i % n;
            var t = Tangent(k);
            var nr = new Vector2(-t.y, t.x);
            var a = path[k] + nr * inner; var b = path[k] + nr * outer;
            verts[i * 2] = new Vector3(a.x, 0f, a.y);
            verts[i * 2 + 1] = new Vector3(b.x, 0f, b.y);
            float v = (i == n ? length : dist[k]) / vScale;
            uvs[i * 2] = new Vector2(0f, v); uvs[i * 2 + 1] = new Vector2(1f, v);
            if (i < n)
            {
                int o = i * 6, q = i * 2;
                tris[o] = q; tris[o + 1] = q + 2; tris[o + 2] = q + 1;
                tris[o + 3] = q + 1; tris[o + 4] = q + 2; tris[o + 5] = q + 3;
            }
        }
        var mesh = new Mesh { indexFormat = UnityEngine.Rendering.IndexFormat.UInt32 };
        mesh.vertices = verts; mesh.uv = uvs; mesh.triangles = tris;
        mesh.RecalculateNormals();
        mesh.RecalculateBounds();
        // the strip winds either way round; make it face up
        var nm = mesh.normals;
        bool down = false;
        foreach (var v in nm) { if (v.y < 0f) down = true; break; }
        if (down)
        {
            for (int i = 0; i < tris.Length; i += 3) { int t = tris[i + 1]; tris[i + 1] = tris[i + 2]; tris[i + 2] = t; }
            mesh.triangles = tris;
            mesh.RecalculateNormals();
        }
        return mesh;
    }

    GameObject MeshObject(string name, Mesh mesh, Material mat, float y)
    {
        var go = new GameObject(name);
        go.transform.SetParent(root, false);
        go.transform.position = new Vector3(0f, y, 0f);
        go.AddComponent<MeshFilter>().sharedMesh = mesh;
        var r = go.AddComponent<MeshRenderer>();
        r.sharedMaterial = mat;
        r.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
        return go;
    }

    void BuildScene()
    {
        var accent = AccentZ;
        bool night = Zone == 5;
        var sky = night ? new Color(0.02f, 0.02f, 0.06f) : new Color(0.08f, 0.05f, 0.18f);
        cam.backgroundColor = sky;
        RenderSettings.fogColor = sky;
        RenderSettings.fogStartDistance = night ? 60f : 110f;
        RenderSettings.fogEndDistance = night ? 200f : 320f;
        RenderSettings.ambientLight = night ? new Color(0.3f, 0.3f, 0.42f) : new Color(0.45f, 0.42f, 0.6f);
        Vector2 c = Vector2.zero;
        foreach (var p in path) c += p;
        c /= path.Count;
        var groundMat = OiyoArcade.Lit(new Color(0.55f, 0.5f, 0.8f), 0.1f, OiyoArcade.Art("CT/grid", true));
        groundMat.mainTextureScale = new Vector2(80f, 80f);
        var ground = OiyoArcade.Prim(PrimitiveType.Plane, "Ground", groundMat, root);
        ground.transform.position = new Vector3(c.x, -0.02f, c.y);
        ground.transform.localScale = new Vector3(80f, 1f, 80f);
        var roadMat = OiyoArcade.Lit(Color.white, 0.35f, OiyoArcade.Art("CT/road", true));
        MeshObject("Road", Ribbon(-roadW * 0.5f, roadW * 0.5f, 10f), roadMat, 0.02f);
        var edgeMat = OiyoArcade.Glow(accent);
        MeshObject("EdgeL", Ribbon(-roadW * 0.5f - 0.6f, -roadW * 0.5f, 4f), edgeMat, 0.03f);
        MeshObject("EdgeR", Ribbon(roadW * 0.5f, roadW * 0.5f + 0.6f, 4f), OiyoArcade.Glow(Color.Lerp(accent, Color.white, 0.35f)), 0.03f);
        // start line and checkpoint gates
        var startT = Tangent(0);
        var line = OiyoArcade.Prim(PrimitiveType.Quad, "Start", OiyoArcade.Textured(OiyoArcade.Art("CT/checker", true)), root);
        line.transform.position = new Vector3(path[0].x, 0.05f, path[0].y);
        line.transform.rotation = Quaternion.LookRotation(Vector3.down, new Vector3(startT.x, 0f, startT.y)) ;
        line.transform.localScale = new Vector3(roadW, 2f, 1f);
        line.GetComponent<Renderer>().sharedMaterial.mainTextureScale = new Vector2(roadW / 2f, 1f);
        cpGates.Clear();
        var pylon = OiyoArcade.Lit(new Color(0.25f, 0.25f, 0.35f), 0.5f, null, 0.4f);
        for (int g = 0; g <= checkpoints.Count; g++)
        {
            int si = g < checkpoints.Count ? checkpoints[g] : 0;
            var t = Tangent(si); var nr = new Vector2(-t.y, t.x);
            var gate = new GameObject(g < checkpoints.Count ? "Gate" : "Finish").transform;
            gate.SetParent(root, false);
            gate.position = new Vector3(path[si].x, 0f, path[si].y);
            gate.rotation = Quaternion.LookRotation(new Vector3(t.x, 0f, t.y));
            for (int s = -1; s <= 1; s += 2)
            {
                var p = OiyoArcade.Prim(PrimitiveType.Cube, "Pylon", pylon, gate);
                p.transform.localPosition = new Vector3(s * (roadW * 0.5f + 0.9f), 2.2f, 0f);
                p.transform.localScale = new Vector3(0.6f, 4.4f, 0.6f);
            }
            var bar = OiyoArcade.Prim(PrimitiveType.Cube, "Bar", OiyoArcade.Glow(g < checkpoints.Count ? accent : Color.white), gate);
            bar.transform.localPosition = new Vector3(0f, 4.5f, 0f);
            bar.transform.localScale = new Vector3(roadW + 2.4f, 0.35f, 0.35f);
            cpGates.Add(gate);
        }
        // pads, oil and sliding gates
        var padMat = OiyoArcade.Transparent(OiyoArcade.Art("CT/boost"), Color.white);
        foreach (var b in boosts)
        {
            int si = NearestSample(b.p, 0, path.Count);
            var t = Tangent(si);
            var q = OiyoArcade.Prim(PrimitiveType.Quad, "Boost", padMat, root);
            q.transform.position = new Vector3(b.p.x, 0.06f, b.p.y);
            q.transform.rotation = Quaternion.LookRotation(Vector3.down, new Vector3(t.x, 0f, t.y));
            q.transform.localScale = new Vector3(4f, 5f, 1f);
        }
        var oilMat = OiyoArcade.Transparent(OiyoArcade.Art("CT/oil"), Color.white);
        foreach (var o in oils)
        {
            var q = OiyoArcade.Prim(PrimitiveType.Quad, "Oil", oilMat, root);
            q.transform.position = new Vector3(o.p.x, 0.05f, o.p.y);
            q.transform.rotation = Quaternion.Euler(90f, o.p.x * 37f, 0f);
            q.transform.localScale = Vector3.one * 5.6f;
        }
        var blockMat = OiyoArcade.LitGlow(new Color(0.9f, 0.3f, 0.5f), new Color(0.15f, 0.02f, 0.06f), 0.5f);
        foreach (var g in gates)
        {
            var b = OiyoArcade.Prim(PrimitiveType.Cube, "Barrier", blockMat, root);
            var t = Tangent(g.sample);
            b.transform.rotation = Quaternion.LookRotation(new Vector3(t.x, 0f, t.y));
            b.transform.localScale = new Vector3(3.2f, 1.4f, 1.2f);
            var stripe = OiyoArcade.Prim(PrimitiveType.Cube, "Stripe", OiyoArcade.Glow(new Color(1f, 0.9f, 0.4f)), b.transform);
            stripe.transform.localScale = new Vector3(1.02f, 0.18f, 1.02f);
            stripe.transform.localPosition = new Vector3(0f, 0.25f, 0f);
            g.t = b.transform;
        }
        // scenery: neon towers off the road
        var rs = new System.Random(stageIdx * 31 + 9);
        var towerMat = OiyoArcade.Lit(new Color(0.16f, 0.14f, 0.28f), 0.4f, OiyoArcade.Art("CT/tower", true));
        int placed = 0;
        for (int tries = 0; tries < 400 && placed < 70; tries++)
        {
            float a = (float)rs.NextDouble() * Mathf.PI * 2f, r = 30f + (float)rs.NextDouble() * 220f;
            var p = c + new Vector2(Mathf.Sin(a), Mathf.Cos(a)) * r;
            int ni = NearestSample(p, 0, path.Count);
            if ((path[ni] - p).magnitude < roadW * 0.5f + 9f) continue;
            float h = 6f + (float)rs.NextDouble() * (r > 150f ? 40f : 18f);
            float w = 3f + (float)rs.NextDouble() * 5f;
            var tw = OiyoArcade.Prim(PrimitiveType.Cube, "Tower", towerMat, root);
            tw.transform.position = new Vector3(p.x, h * 0.5f, p.y);
            tw.transform.localScale = new Vector3(w, h, w);
            tw.GetComponent<Renderer>().sharedMaterial.mainTextureScale = new Vector2(1f, Mathf.Max(1f, h / 8f));
            var cap = OiyoArcade.Prim(PrimitiveType.Cube, "Cap", OiyoArcade.Glow(OiyoArcade.Hsv(0.5f + (float)rs.NextDouble() * 0.4f, 0.7f, 1f)), tw.transform);
            cap.transform.localPosition = new Vector3(0f, 0.5f, 0f);
            cap.transform.localScale = new Vector3(1.04f, 0.04f, 1.04f);
            placed++;
        }
        for (int i = 0; i < 24; i++)
        {
            float a = i / 24f * Mathf.PI * 2f;
            var m = OiyoArcade.Prim(PrimitiveType.Cube, "Ridge", OiyoArcade.Glow(new Color(0.18f, 0.08f, 0.3f)), root);
            float r = 300f;
            m.transform.position = new Vector3(c.x + Mathf.Sin(a) * r, 0f, c.y + Mathf.Cos(a) * r);
            m.transform.rotation = Quaternion.Euler(0f, a * Mathf.Rad2Deg + 45f, 45f);
            float s = 40f + (i * 37 % 30);
            m.transform.localScale = new Vector3(s, s, s);
        }

        car = BuildCar("Car", accent, false, out carBody);
        ghostCar = null;
        LoadGhost();
        if (ghost.Count > 1) ghostCar = BuildCar("Ghost", new Color(0.7f, 0.9f, 1f), true, out _);
    }

    Transform BuildCar(string name, Color paint, bool isGhost, out Transform bodyOut)
    {
        var t = new GameObject(name).transform;
        t.SetParent(root, false);
        var body = new GameObject("Body").transform;
        body.SetParent(t, false);
        bodyOut = body;
        Material Mat(Color c, float g = 0.5f) => isGhost ? OiyoArcade.Transparent(OiyoArcade.GlowTexture(), new Color(c.r, c.g, c.b, 0.35f)) : OiyoArcade.Lit(c, g, null, 0.3f);
        if (isGhost)
        {
            var shellG = OiyoArcade.Prim(PrimitiveType.Cube, "Ghost", OiyoArcade.Transparent(OiyoArcade.Solid(Color.white), new Color(0.6f, 0.9f, 1f, 0.3f)), body);
            shellG.transform.localScale = new Vector3(1.9f, 0.9f, 4.1f);
            shellG.transform.localPosition = new Vector3(0f, 0.7f, 0f);
            return t;
        }
        var chassis = OiyoArcade.Prim(PrimitiveType.Cube, "Chassis", Mat(paint, 0.7f), body);
        chassis.transform.localScale = new Vector3(1.9f, 0.5f, 4.1f);
        chassis.transform.localPosition = new Vector3(0f, 0.55f, 0f);
        var nose = OiyoArcade.Prim(PrimitiveType.Cube, "Nose", Mat(paint * 0.85f, 0.7f), body);
        nose.transform.localScale = new Vector3(1.7f, 0.3f, 1.1f);
        nose.transform.localPosition = new Vector3(0f, 0.45f, 2.3f);
        var cabin = OiyoArcade.Prim(PrimitiveType.Cube, "Cabin", Mat(new Color(0.08f, 0.1f, 0.18f), 0.9f), body);
        cabin.transform.localScale = new Vector3(1.45f, 0.5f, 1.8f);
        cabin.transform.localPosition = new Vector3(0f, 1.02f, -0.3f);
        var wing = OiyoArcade.Prim(PrimitiveType.Cube, "Wing", Mat(new Color(0.12f, 0.12f, 0.2f)), body);
        wing.transform.localScale = new Vector3(2f, 0.1f, 0.5f);
        wing.transform.localPosition = new Vector3(0f, 1.15f, -1.9f);
        for (int s = -1; s <= 1; s += 2)
        {
            var tail = OiyoArcade.Prim(PrimitiveType.Cube, "Tail", OiyoArcade.Glow(new Color(1f, 0.2f, 0.3f)), body);
            tail.transform.localScale = new Vector3(0.5f, 0.12f, 0.05f);
            tail.transform.localPosition = new Vector3(s * 0.6f, 0.65f, -2.06f);
            var head = OiyoArcade.Prim(PrimitiveType.Cube, "Head", OiyoArcade.Glow(new Color(0.9f, 0.95f, 1f)), body);
            head.transform.localScale = new Vector3(0.45f, 0.1f, 0.05f);
            head.transform.localPosition = new Vector3(s * 0.55f, 0.5f, 2.86f);
            for (int f = -1; f <= 1; f += 2)
            {
                var w = OiyoArcade.Prim(PrimitiveType.Cylinder, "Wheel", OiyoArcade.Lit(new Color(0.08f, 0.08f, 0.1f), 0.3f), t);
                w.transform.localScale = new Vector3(0.7f, 0.18f, 0.7f);
                w.transform.localRotation = Quaternion.Euler(0f, 0f, 90f);
                w.transform.localPosition = new Vector3(s * 1.0f, 0.35f, f * 1.35f);
                wheels.Add(w.transform);
            }
        }
        var glow = OiyoArcade.GlowQuad("Underglow", new Color(paint.r, paint.g, paint.b, 0.55f), 5f, t);
        glow.transform.localPosition = new Vector3(0f, 0.05f, 0f);
        glow.transform.localRotation = Quaternion.Euler(90f, 0f, 0f);
        return t;
    }

    int NearestSample(Vector2 p, int from, int span)
    {
        int n = path.Count, best = 0; float bd = float.MaxValue;
        for (int k = 0; k < span; k++)
        {
            int i = ((from + k) % n + n) % n;
            float d = (path[i] - p).sqrMagnitude;
            if (d < bd) { bd = d; best = i; }
        }
        return best;
    }

    void LoadStage(int idx, bool ready = true)
    {
        stageIdx = Mathf.Clamp(idx, 0, StageCount - 1);
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Track").transform;
        wheels.Clear();
        BuildTrack();
        BuildScene();
        var t = Tangent(0);
        pos = path[0] - t * 6f; angle = Mathf.Atan2(t.x, t.y);
        speed = 0f; steer = 0f; slide = 0f; boostT = slipT = holdSteerT = 0f;
        drifting = offRoad = false;
        nextCp = 0; nearIdx = path.Count - 3; lastCpSample = 0;
        raceTime = 0f; driftScore = 0f; score = 0; stars = 0; endReason = "";
        record.Clear(); recordT = 0f;
        showStages = false;
        state = ready ? GameState.Ready : GameState.Menu;
        Sync(0f);
        UpdateCamera(1f, true);
    }

    // ---------------- Ghost ----------------
    string GhostKey => Slug + ".ghost." + stageIdx;
    void LoadGhost()
    {
        ghost.Clear();
        bestTime = PlayerPrefs.GetFloat(Slug + ".time." + stageIdx, 0f);
        string s = PlayerPrefs.GetString(GhostKey, "");
        if (string.IsNullOrEmpty(s)) return;
        foreach (var part in s.Split(';'))
        {
            var f = part.Split(',');
            if (f.Length != 3) continue;
            if (float.TryParse(f[0], System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out float x) &&
                float.TryParse(f[1], System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out float zz) &&
                float.TryParse(f[2], System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out float a))
                ghost.Add(new Vector3(x, zz, a));
        }
    }

    void Record(float dt)
    {
        recordT -= dt;
        if (recordT > 0f) return;
        recordT = 0.1f;
        if (record.Length > 0) record.Append(';');
        record.Append(pos.x.ToString("F1", System.Globalization.CultureInfo.InvariantCulture)).Append(',')
              .Append(pos.y.ToString("F1", System.Globalization.CultureInfo.InvariantCulture)).Append(',')
              .Append(angle.ToString("F2", System.Globalization.CultureInfo.InvariantCulture));
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("cyber-track", state, score);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        ReadInput(dt);
        if (state == GameState.Playing)
        {
            int n = Mathf.CeilToInt(dt / (1f / 120f));
            for (int i = 0; i < n && state == GameState.Playing; i++) Step(dt / n);
        }
        else if (state == GameState.Menu)
        {
            // the car idles round the first stretch behind the menu
            int k = Mathf.FloorToInt(Time.time * 18f) % path.Count;
            pos = path[k]; var t = Tangent(k); angle = Mathf.Atan2(t.x, t.y); speed = 120f;
        }
        MoveGates();
        Sync(dt);
        UpdateCamera(dt, false);
        engine.volume = state == GameState.Playing ? 0.35f : 0f;
        engine.pitch = 0.6f + Mathf.Abs(speed) / MaxSpeed * 1.4f;
    }

    float inSteer; bool inBrake, inDrift;

    void ReadInput(float dt)
    {
        bool confirm = Input.GetKeyDown(KeyCode.Return);
        switch (state)
        {
            case GameState.Ready:
                {
                    // the first press (or key) starts the clock
                    bool go = OiyoArcade.Began().Count > 0 || Input.anyKeyDown;
                    if (go) { state = GameState.Playing; synth.Tone(660f, 0.25f, Wave.Square, 0.15f, 0f, 6f); }
                    ReadDriving();
                    return;
                }
            case GameState.Playing:
                if (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P)) { state = GameState.Paused; return; }
                ReadDriving();
                return;
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

    void ReadDriving()
    {
        bool left = false, right = false;
        foreach (var h in OiyoArcade.Held())
        {
            if (OiyoArcade.OverUi(h.pos)) continue;
            if (h.pos.x < Screen.width * 0.5f) left = true; else right = true;
        }
        bool kl = Input.GetKey(KeyCode.LeftArrow) || Input.GetKey(KeyCode.A);
        bool kr = Input.GetKey(KeyCode.RightArrow) || Input.GetKey(KeyCode.D);
        inBrake = (left && right) || Input.GetKey(KeyCode.DownArrow) || Input.GetKey(KeyCode.S);
        inSteer = 0f;
        if (!(left && right)) { if (left) inSteer -= 1f; if (right) inSteer += 1f; }
        if (kl) inSteer -= 1f; if (kr) inSteer += 1f;
        inSteer = Mathf.Clamp(inSteer, -1f, 1f);
        inDrift = Input.GetKey(KeyCode.Space) || Input.GetKey(KeyCode.LeftShift);
    }

    void MoveGates()
    {
        foreach (var g in gates)
        {
            var t = Tangent(g.sample); var nr = new Vector2(-t.y, t.x);
            g.pos = path[g.sample] + nr * Mathf.Sin(Time.time * g.speed + g.phase) * g.amp;
        }
    }

    void Step(float dt)
    {
        raceTime += dt;
        // steering eases in; holding a full lock at speed slides into a drift on touch screens too
        steer = Mathf.MoveTowards(steer, inSteer, dt * 6f);
        holdSteerT = Mathf.Abs(inSteer) > 0.9f ? holdSteerT + dt : 0f;
        bool wantDrift = inDrift || (holdSteerT > 0.35f && speed > 110f);
        drifting = wantDrift && Mathf.Abs(speed) > 30f;
        float boostMul = boostT > 0f ? 1.4f : 1f;
        float top = (offRoad ? OffRoadMax : MaxSpeed) * boostMul;
        if (inBrake)
        {
            if (speed > 5f) speed = Mathf.Max(0f, speed - Brake * dt);
            else speed = Mathf.Max(-45f, speed - Accel * 0.6f * dt);
        }
        else if (speed < top) speed = Mathf.Min(top, speed + Accel * boostMul * dt);
        else speed = Mathf.Max(top, speed - (offRoad ? 160f : Rolling * 3f) * dt);
        if (drifting) speed = Mathf.Max(20f, speed - Rolling * 1.5f * dt);
        float steerAngle = steer * (drifting ? 1.4f : 1f) * (slipT > 0f ? 0.3f : 1f);
        if (Mathf.Abs(speed) > 1f)
        {
            float ratio = Mathf.Min(1f, Mathf.Abs(speed) / 60f);
            angle += SteerRate * steerAngle * ratio * Mathf.Sign(speed) * dt;
        }
        if (slipT > 0f) { slipT -= dt; angle += Mathf.Sin(raceTime * 17f) * 0.9f * dt; }
        boostT -= dt;
        // the body swings out while drifting
        slide = Mathf.MoveTowards(slide, drifting ? -steer * 0.45f : 0f, dt * 2.5f);
        float mps = speed / 3.6f;
        var fwd = new Vector2(Mathf.Sin(angle), Mathf.Cos(angle));
        pos += fwd * mps * dt;
        if (drifting && Mathf.Abs(steer) > 0.2f)
        {
            driftScore += Mathf.Abs(speed) * dt * 2f;
            if (Random.value < dt * 30f) bursts.Emit(new Vector3(pos.x - fwd.x * 1.8f, 0.3f, pos.y - fwd.y * 1.8f), new Color(0.85f, 0.85f, 1f, 0.6f), 1, 1f, 0.6f, 0.6f);
        }
        // where am I on the track
        nearIdx = NearestSample(pos, nearIdx - 30, 61);
        float off = (path[nearIdx] - pos).magnitude;
        bool wasOff = offRoad;
        offRoad = off > roadW * 0.5f + 0.3f;
        if (offRoad && !wasOff) synth.Tone(120f, 0.12f, Wave.Noise, 0.12f, 0f, 10f);
        if (offRoad && Random.value < dt * 25f && speed > 20f) bursts.Emit(new Vector3(pos.x, 0.2f, pos.y), new Color(0.6f, 0.45f, 0.9f), 1, 1.5f, 0.3f, 0.5f, Vector3.up);
        if (off > roadW * 0.5f + 26f)
        {
            // far off course: back on the road at the nearest point, stopped, two seconds lost
            pos = path[nearIdx]; var tt = Tangent(nearIdx); angle = Mathf.Atan2(tt.x, tt.y); speed = 0f; raceTime += 2f;
            shake = 0.3f;
            synth.Tone(200f, 0.3f, Wave.Saw, 0.15f, 90f, 6f);
        }
        foreach (var b in boosts)
            if ((b.p - pos).sqrMagnitude < b.r * b.r)
            {
                if (boostT < 1.2f) { synth.Tone(500f, 0.25f, Wave.Saw, 0.12f, 1200f, 6f); bursts.Emit(new Vector3(pos.x, 0.5f, pos.y), new Color(0.5f, 1f, 0.5f), 10, 3f, 0.3f, 0.4f); }
                boostT = 1.5f;
            }
        foreach (var o in oils)
            if ((o.p - pos).sqrMagnitude < o.r * o.r)
            {
                if (slipT <= 0f) synth.Tone(240f, 0.3f, Wave.Sine, 0.12f, 120f, 5f);
                slipT = 1f;
            }
        foreach (var g in gates)
        {
            var d = pos - g.pos;
            if (d.sqrMagnitude < 2.2f * 2.2f && speed > 10f)
            {
                speed *= 0.35f;
                pos += d.normalized * 1.2f;
                shake = 0.35f;
                bursts.Emit(new Vector3(pos.x, 0.8f, pos.y), new Color(1f, 0.5f, 0.6f), 16, 4f, 0.3f, 0.4f);
                synth.Tone(110f, 0.25f, Wave.Noise, 0.22f, 0f, 8f);
            }
        }
        // gates in order, then back over the start line
        int target = nextCp < checkpoints.Count ? checkpoints[nextCp] : 0;
        if ((path[target] - pos).magnitude < roadW * 0.75f + 2f && (nextCp < checkpoints.Count || lastCpSample > path.Count / 2))
        {
            if (nextCp < checkpoints.Count)
            {
                lastCpSample = target; nextCp++;
                synth.Tone(1046f, 0.12f, Wave.Triangle, 0.2f, 0f, 8f);
                bursts.Emit(new Vector3(path[target].x, 4.5f, path[target].y), AccentZ, 20, 4f, 0.3f, 0.5f);
            }
            else { Finish(); return; }
        }
        Record(dt);
        if (raceTime >= limit) { TimeUp(); return; }
    }

    void Finish()
    {
        stars = 1 + (raceTime <= par * 1.15f ? 1 : 0) + (raceTime <= par ? 1 : 0);
        score = Mathf.RoundToInt(driftScore) + Mathf.Max(0, Mathf.RoundToInt((limit - raceTime) * 100f)) + stars * 100 + stageIdx * 10;
        state = GameState.Victory;
        OiyoArcade.Record(Slug, stageIdx, stars, score, StageCount);
        if (bestTime <= 0f || raceTime < bestTime)
        {
            bestTime = raceTime;
            PlayerPrefs.SetFloat(Slug + ".time." + stageIdx, raceTime);
            PlayerPrefs.SetString(GhostKey, record.ToString());
            PlayerPrefs.Save();
            newBest = true;
        }
        else newBest = false;
        bursts.Emit(new Vector3(path[0].x, 4.5f, path[0].y), Color.white, 60, 6f, 0.35f, 1f);
        StartCoroutine(Arp(new[] { 523f, 659f, 784f, 1047f, 1319f }, 0.09f));
    }

    bool newBest;

    void TimeUp()
    {
        endReason = U("Time is up!");
        score = Mathf.RoundToInt(driftScore);
        state = GameState.GameOver;
        synth.Tone(300f, 0.6f, Wave.Saw, 0.2f, 80f, 3f);
    }

    IEnumerator Arp(float[] fs, float gap)
    {
        foreach (var f in fs) { synth.Tone(f, 0.2f, Wave.Triangle, 0.3f, 0f, 6f); yield return new WaitForSeconds(gap); }
    }

    // ---------------- View ----------------
    void Sync(float dt)
    {
        if (car == null) return;
        car.position = new Vector3(pos.x, 0f, pos.y);
        car.rotation = Quaternion.Euler(0f, angle * Mathf.Rad2Deg, 0f);
        carBody.localRotation = Quaternion.Euler(0f, slide * Mathf.Rad2Deg, -steer * Mathf.Clamp01(speed / 120f) * 4f);
        float spin = speed / 3.6f / 0.35f * Mathf.Rad2Deg * dt;
        for (int i = 0; i < wheels.Count; i++)
        {
            var w = wheels[i];
            bool front = w.localPosition.z > 0f;
            w.localRotation = Quaternion.Euler(0f, front ? steer * 22f : 0f, 90f) * Quaternion.Euler(0f, 0f, 0f);
            w.Rotate(Vector3.up, spin, Space.Self);
        }
        for (int g = 0; g < cpGates.Count; g++)
        {
            bool isNext = g == nextCp || (g == cpGates.Count - 1 && nextCp >= checkpoints.Count);
            bool done = g < nextCp && g < checkpoints.Count;
            cpGates[g].localScale = Vector3.one * (isNext ? 1f + Mathf.Sin(Time.time * 6f) * 0.03f : 1f);
            cpGates[g].gameObject.SetActive(!done);
        }
        foreach (var g in gates) if (g.t != null) g.t.position = new Vector3(g.pos.x, 0.7f, g.pos.y);
        if (ghostCar != null)
        {
            bool on = state == GameState.Playing || state == GameState.Ready;
            ghostCar.gameObject.SetActive(on);
            if (on)
            {
                float f = raceTime / 0.1f;
                int i0 = Mathf.Clamp(Mathf.FloorToInt(f), 0, ghost.Count - 1), i1 = Mathf.Min(ghost.Count - 1, i0 + 1);
                float a = Mathf.Clamp01(f - i0);
                var gp = Vector3.Lerp(ghost[i0], ghost[i1], a);
                ghostCar.position = new Vector3(gp.x, 0f, gp.y);
                ghostCar.rotation = Quaternion.Euler(0f, Mathf.LerpAngle(ghost[i0].z * Mathf.Rad2Deg, ghost[i1].z * Mathf.Rad2Deg, a), 0f);
            }
        }
    }

    void UpdateCamera(float dt, bool snap)
    {
        bool portrait = cam.aspect < 1f;
        cam.fieldOfView = portrait ? 64f : 56f;
        var fwd = new Vector3(Mathf.Sin(angle), 0f, Mathf.Cos(angle));
        float back = portrait ? 10.5f : 9f, up = portrait ? 5.8f : 4.2f;
        back += Mathf.Abs(speed) / MaxSpeed * 2f;
        var target = car.position - fwd * back + Vector3.up * up;
        var p = snap ? target : Vector3.Lerp(cam.transform.position, target, 1f - Mathf.Exp(-dt * 6f));
        var look = car.position + fwd * (portrait ? 9f : 7f) + Vector3.up * 0.8f;
        var shakeOff = Vector3.zero;
        if (shake > 0f) { shakeOff = Random.insideUnitSphere * shake * 0.4f; shake = Mathf.MoveTowards(shake, 0f, dt); }
        cam.transform.position = p + shakeOff;
        cam.transform.rotation = Quaternion.LookRotation(look - p);
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.85f, 0.25f, 0.65f, 0.97f);
    static readonly Color Dark = new Color(0.04f, 0.03f, 0.1f, 0.84f);
    static readonly Color Gold = new Color(1f, 0.8f, 0.25f, 0.97f);
    static readonly Color Slate = new Color(0.2f, 0.18f, 0.32f, 0.95f);

    string TrackName(int i) => i < 3 ? U(WebTracks[i]) : U(ZoneNames[i / 5]);
    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + TrackName(i);
    static string Clock(float s) => $"{Mathf.FloorToInt(s / 60f):00}:{Mathf.FloorToInt(s % 60f):00}.{Mathf.FloorToInt(s * 100f % 100f):00}";

    void OnGUI()
    {
        OiyoArcade.Begin();
        float w = OiyoArcade.W, h = OiyoArcade.H;
        if (state == GameState.Menu) { DrawMenu(w, h); return; }
        var bar = new Rect(8f, 8f, w - 16f, 58f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 12f, w - 140f, 24f), "<b>" + StageTitle(stageIdx) + "</b>", 16, new Color(1f, 0.75f, 0.95f));
        string tcol = raceTime > par ? "#ffb070" : "#ffffff";
        OiyoArcade.Text(new Rect(20f, 36f, w - 90f, 24f), $"<color={tcol}><b>{Clock(raceTime)}</b></color> <color=#ffffff88>/ {Clock(par)}</color>  {U("Gates")} <b>{Mathf.Min(nextCp, checkpoints.Count)}/{checkpoints.Count}</b>", 14, Color.white);
        if (OiyoArcade.Button(new Rect(w - 64f, 14f, 46f, 46f), "<b>II</b>", Slate, 18))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        // speed and the little map
        OiyoArcade.Panel(new Rect(w - 116f, 72f, 108f, 108f), new Color(0.03f, 0.03f, 0.08f, 0.6f));
        DrawMap(new Rect(w - 110f, 78f, 96f, 96f));
        OiyoArcade.Shadowed(new Rect(16f, 72f, 160f, 40f), $"{Mathf.RoundToInt(Mathf.Abs(speed))}<size=14> km/h</size>", 30, boostT > 0f ? new Color(0.6f, 1f, 0.5f) : Color.white);
        if (driftScore > 0f) OiyoArcade.Text(new Rect(16f, 110f, 200f, 20f), $"{U("Drift")} <b>{Mathf.RoundToInt(driftScore)}</b>", 13, new Color(1f, 0.85f, 0.5f));
        if (bestTime > 0f) OiyoArcade.Text(new Rect(16f, 128f, 200f, 20f), $"{U("Best")} {Clock(bestTime)}", 12, new Color(0.7f, 0.9f, 1f, 0.9f));
        if (state == GameState.Playing || state == GameState.Ready)
        {
            // where to press; the left pad sits above the page's exit button in the bottom-left corner
            float py = h - 176f;
            OiyoArcade.Panel(new Rect(14f, py, 74f, 64f), new Color(1f, 1f, 1f, inSteer < -0.1f ? 0.25f : 0.1f));
            OiyoArcade.Text(new Rect(14f, py, 74f, 64f), "◀", 30, new Color(1f, 1f, 1f, 0.8f), TextAnchor.MiddleCenter);
            OiyoArcade.Panel(new Rect(w - 88f, py, 74f, 64f), new Color(1f, 1f, 1f, inSteer > 0.1f ? 0.25f : 0.1f));
            OiyoArcade.Text(new Rect(w - 88f, py, 74f, 64f), "▶", 30, new Color(1f, 1f, 1f, 0.8f), TextAnchor.MiddleCenter);
        }
        if (state == GameState.Ready)
        {
            var r = new Rect(w * 0.5f - 175f, h * 0.5f - 20f, 350f, 112f);
            OiyoArcade.Panel(r, Dark);
            OiyoArcade.Text(new Rect(r.x + 12f, r.y + 8f, r.width - 24f, r.height - 16f),
                $"<b>{U("Tap to start. The car drives itself.")}</b>\n<size=14>{U("Hold the left or right half to steer, both halves to brake. Hold a full turn at speed to drift. Keys: arrows, Space drifts.")}</size>", 16, Color.white, TextAnchor.MiddleCenter);
        }
        if (offRoad && state == GameState.Playing) OiyoArcade.Shadowed(new Rect(0f, h * 0.32f, w, 30f), U("Off the road!"), 18, new Color(1f, 0.7f, 0.5f), TextAnchor.MiddleCenter);
        if (state == GameState.Paused) DrawPause(w, h);
        if (state == GameState.Victory || state == GameState.GameOver) DrawResult(w, h);
    }

    void DrawMap(Rect r)
    {
        if (Event.current.type != EventType.Repaint || path.Count == 0) return;
        float minX = float.MaxValue, maxX = float.MinValue, minY = float.MaxValue, maxY = float.MinValue;
        foreach (var p in ctrl) { minX = Mathf.Min(minX, p.x); maxX = Mathf.Max(maxX, p.x); minY = Mathf.Min(minY, p.y); maxY = Mathf.Max(maxY, p.y); }
        float span = Mathf.Max(maxX - minX, maxY - minY) * 1.15f + 1f;
        float cx = (minX + maxX) * 0.5f, cy = (minY + maxY) * 0.5f;
        Vector2 M(Vector2 p) => new Vector2(r.center.x + (p.x - cx) / span * r.width, r.center.y - (p.y - cy) / span * r.height);
        for (int i = 0; i < path.Count; i += 4) { var q = M(path[i]); OiyoArcade.Fill(new Rect(q.x - 1.5f, q.y - 1.5f, 3f, 3f), new Color(1f, 1f, 1f, 0.55f)); }
        int tgt = nextCp < checkpoints.Count ? checkpoints[nextCp] : 0;
        var tq = M(path[tgt]); OiyoArcade.Fill(new Rect(tq.x - 3f, tq.y - 3f, 6f, 6f), AccentZ);
        var cq = M(pos); OiyoArcade.Fill(new Rect(cq.x - 3.5f, cq.y - 3.5f, 7f, 7f), new Color(1f, 0.9f, 0.3f));
    }

    void DrawMenu(float w, float h)
    {
        if (showStages)
        {
            float bw = Mathf.Min(w - 16f, 760f);
            var box = new Rect(w * 0.5f - bw * 0.5f, 12f, bw, h - 24f);
            OiyoArcade.Panel(box, new Color(0.04f, 0.03f, 0.1f, 0.94f));
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
        OiyoArcade.Shadowed(new Rect(card.x, card.y + 18f, cw, 40f), U("CyberTrack 3D"), 30, new Color(1f, 0.7f, 0.95f), TextAnchor.MiddleCenter);
        OiyoArcade.Text(new Rect(card.x + 20f, card.y + 62f, cw - 40f, 46f), U("Neon time attack. Race through every gate and back to the line before the clock runs out."), 15, new Color(1f, 1f, 1f, 0.85f), TextAnchor.MiddleCenter);
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
        string detail = won ? $"<size=30>{OiyoArcade.StarString(stars)}</size>" + (newBest ? $"\n<size=13><color=#9fe8ff>{U("New best lap!")}</color></size>" : "") : endReason;
        OiyoArcade.Text(new Rect(card.x + 16f, card.y + 52f, cw - 32f, 50f), detail, 16, Color.white, TextAnchor.MiddleCenter);
        OiyoArcade.Text(new Rect(card.x + 16f, card.y + 102f, cw - 32f, 48f),
            $"{U("Time")} <b>{Clock(raceTime)}</b> <size=13>({U("Par")} {Clock(par)})</size>\n<size=14>{U("Score")} {score}   {U("Drift")} {Mathf.RoundToInt(driftScore)}</size>", 16, Color.white, TextAnchor.MiddleCenter);
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
