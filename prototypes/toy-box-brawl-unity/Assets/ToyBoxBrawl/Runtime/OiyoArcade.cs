using System;
using System.Collections.Generic;
using UnityEngine;

// Shared toolkit for the 2026-11-23 Unity arcade wave (snake-game, stack-tower, rhythm-tap,
// neon-katana, shadow-dodge). Each build keeps a byte-identical copy so a project opens on
// its own; edit prototypes/snake-game-unity/Assets/SnakeGame/Runtime/OiyoArcade.cs and copy.
// It holds no translatable text: callers pass strings already run through U().
public static class OiyoArcade
{
    // ---------------- Language ----------------
    public static readonly string[] Langs = { "ko", "en", "ja", "zh", "fr", "es" };
    static string lang;
    public static string Lang { get => lang ??= OiyoI18n.Page; set => lang = value; }
    public static void NextLang()
    {
        int i = Array.IndexOf(Langs, Lang);
        Lang = Langs[(i + 1) % Langs.Length];
    }

    // ---------------- GUI ----------------
    // IMGUI draws in device pixels, so on a DPR-3 phone 15px text was unreadably small.
    // Everything is laid out on a virtual canvas of at least 400x640 and scaled up.
    public static float Scale { get; private set; } = 1f;
    public static float W => Screen.width / Scale;
    public static float H => Screen.height / Scale;
    public static bool Portrait => Screen.height > Screen.width;

    static GUIStyle textStyle, buttonStyle;
    static readonly Dictionary<int, Texture2D> solid = new Dictionary<int, Texture2D>();
    static readonly Dictionary<int, Texture2D> rounded = new Dictionary<int, Texture2D>();
    static readonly List<Rect> uiRects = new List<Rect>();
    static readonly List<Rect> lastUiRects = new List<Rect>();
    static int uiFrame = -1;

    public static float ComputeScale() => Mathf.Max(0.75f, Mathf.Min(Screen.width / 400f, Screen.height / 640f));

    public static void Begin()
    {
        OiyoUiFont.Apply();
        Scale = ComputeScale();
        GUI.matrix = Matrix4x4.TRS(Vector3.zero, Quaternion.identity, new Vector3(Scale, Scale, 1f));
        if (textStyle == null || textStyle.font != GUI.skin.font)
        {
            textStyle = new GUIStyle(GUI.skin.label) { richText = true, wordWrap = true, font = GUI.skin.font };
            textStyle.padding = new RectOffset(0, 0, 0, 0);
            buttonStyle = new GUIStyle(GUI.skin.button) { richText = true, wordWrap = true, font = GUI.skin.font, alignment = TextAnchor.MiddleCenter };
            buttonStyle.border = new RectOffset(12, 12, 12, 12);
            buttonStyle.padding = new RectOffset(6, 6, 4, 4);
        }
        if (Event.current.type == EventType.Layout && uiFrame != Time.frameCount)
        {
            uiFrame = Time.frameCount;
            lastUiRects.Clear();
            lastUiRects.AddRange(uiRects);
            uiRects.Clear();
        }
    }

    public static Texture2D Solid(Color c)
    {
        int key = ((Color32)c).GetHashCode() ^ ((Color32)c).a << 24;
        Color32 k = c;
        key = (k.r << 24) | (k.g << 16) | (k.b << 8) | k.a;
        if (solid.TryGetValue(key, out var t) && t != null) return t;
        t = new Texture2D(1, 1) { hideFlags = HideFlags.DontSave };
        t.SetPixel(0, 0, c);
        t.Apply();
        solid[key] = t;
        return t;
    }

    // 32x32 rounded box used as a 9-slice background.
    public static Texture2D Rounded(Color c)
    {
        Color32 k = c;
        int key = (k.r << 24) | (k.g << 16) | (k.b << 8) | k.a;
        if (rounded.TryGetValue(key, out var t) && t != null) return t;
        const int n = 32; const float r = 11f;
        t = new Texture2D(n, n, TextureFormat.RGBA32, false) { hideFlags = HideFlags.DontSave, wrapMode = TextureWrapMode.Clamp };
        for (int y = 0; y < n; y++)
            for (int x = 0; x < n; x++)
            {
                float cx = Mathf.Clamp(x + 0.5f, r, n - r), cy = Mathf.Clamp(y + 0.5f, r, n - r);
                float d = Mathf.Sqrt((x + 0.5f - cx) * (x + 0.5f - cx) + (y + 0.5f - cy) * (y + 0.5f - cy));
                float a = Mathf.Clamp01(r - d + 0.5f);
                t.SetPixel(x, y, new Color(c.r, c.g, c.b, c.a * a));
            }
        t.Apply();
        rounded[key] = t;
        return t;
    }

    public static void Panel(Rect r, Color c)
    {
        var st = new GUIStyle { border = new RectOffset(12, 12, 12, 12), normal = { background = Rounded(c) } };
        if (Event.current.type == EventType.Repaint) st.Draw(r, false, false, false, false);
    }

    public static void Fill(Rect r, Color c) => GUI.DrawTexture(r, Solid(c));

    public static void Text(Rect r, string s, int size, Color c, TextAnchor a = TextAnchor.UpperLeft, bool bold = false)
    {
        textStyle.fontSize = size;
        textStyle.alignment = a;
        textStyle.fontStyle = bold ? FontStyle.Bold : FontStyle.Normal;
        textStyle.normal.textColor = c;
        GUI.Label(r, s, textStyle);
    }

    public static void Shadowed(Rect r, string s, int size, Color c, TextAnchor a = TextAnchor.UpperLeft, bool bold = true)
    {
        Text(new Rect(r.x + 1.5f, r.y + 1.5f, r.width, r.height), s, size, new Color(0, 0, 0, 0.6f), a, bold);
        Text(r, s, size, c, a, bold);
    }

    // Buttons read the same pointer data as the game instead of IMGUI's mouse events: in the
    // embedded WebGL player a touch's simulated mouse-up could go missing, leaving a button
    // pressed until the next tap (every button needed two taps on a phone, 2026-11-23).
    // A click is a press that starts and ends inside the button; it fires on the frame's Repaint.
    public static bool Button(Rect r, string s, Color bg, int size = 18, Color? fg = null, bool enabled = true)
    {
        uiRects.Add(r);
        if (Event.current.type != EventType.Repaint) return false;
        PollPointers();
        bool down = false, clicked = false;
        foreach (var h in held)
            if (starts.TryGetValue(h.id, out var sp) && r.Contains(ToGui(sp)) && r.Contains(ToGui(h.pos))) down = true;
        foreach (var e in releases)
            if (r.Contains(ToGui(e.start)) && r.Contains(ToGui(e.end))) clicked = true;
        bool hover = held.Count == 0 && Input.touchCount == 0 && r.Contains(ToGui(Input.mousePosition));
        buttonStyle.fontSize = size;
        Color f = fg ?? Color.white;
        Color b = enabled ? bg : new Color(bg.r * 0.45f, bg.g * 0.45f, bg.b * 0.45f, bg.a * 0.8f);
        if (enabled && down) b = Color.Lerp(b, Color.black, 0.25f);
        else if (enabled && hover) b = Color.Lerp(b, Color.white, 0.15f);
        buttonStyle.normal.background = Rounded(b);
        buttonStyle.normal.textColor = enabled ? f : new Color(f.r, f.g, f.b, 0.5f);
        buttonStyle.Draw(r, new GUIContent(s), false, false, false, false);
        return clicked && enabled;
    }

    public static void Bar(Rect r, float t, Color bg, Color fg)
    {
        // thin bars as plain fills: the 12px 9-slice corners turned a 4px bar into a blob
        Fill(r, bg);
        t = Mathf.Clamp01(t);
        if (t > 0.001f) Fill(new Rect(r.x, r.y, r.width * t, r.height), fg);
    }

    /// <summary>True when a screen-space point (Input.mousePosition style) is over a button drawn last frame.</summary>
    public static bool OverUi(Vector2 screen)
    {
        float s = ComputeScale();
        var g = new Vector2(screen.x / s, (Screen.height - screen.y) / s);
        foreach (var r in lastUiRects) if (r.Contains(g)) return true;
        foreach (var r in uiRects) if (r.Contains(g)) return true;
        return false;
    }

    public static Vector2 ToGui(Vector2 screen)
    {
        float s = ComputeScale();
        return new Vector2(screen.x / s, (Screen.height - screen.y) / s);
    }

    // ---------------- Pointer ----------------
    // Touch screens also fire simulated mouse events in the same frame, so a frame with
    // touches reads only the touches; the mouse is read only when no finger is down.
    public struct Press { public int id; public Vector2 pos; }
    static int pointerFrame = -1;
    static readonly List<Press> began = new List<Press>();
    static readonly List<Press> ended = new List<Press>();
    static readonly List<Press> held = new List<Press>();
    static readonly HashSet<int> activeFingers = new HashSet<int>();
    static readonly Dictionary<int, Vector2> starts = new Dictionary<int, Vector2>();
    struct Release { public Vector2 start, end; }
    static readonly List<Release> releases = new List<Release>();

    static void Track()
    {
        foreach (var p in began) starts[p.id] = p.pos;
        foreach (var p in ended)
        {
            if (starts.TryGetValue(p.id, out var sp)) releases.Add(new Release { start = sp, end = p.pos });
            starts.Remove(p.id);
        }
    }

#if UNITY_WEBGL && !UNITY_EDITOR
    [System.Runtime.InteropServices.DllImport("__Internal")] static extern void OiyoPointerInit();
    [System.Runtime.InteropServices.DllImport("__Internal")] static extern int OiyoPointerDrain(float[] buf, int maxEvents);
    static bool webInit;
    static readonly float[] webBuf = new float[256 * 4];
    static readonly Dictionary<int, Vector2> webDown = new Dictionary<int, Vector2>();

    // Plugins/WebGL/OiyoPointer.jslib: browser pointer events, which arrive even when the
    // embedded player drops a touch release.
    static void PollWeb()
    {
        if (!webInit) { webInit = true; OiyoPointerInit(); }
        int n = OiyoPointerDrain(webBuf, 256);
        for (int i = 0; i < n; i++)
        {
            int phase = (int)webBuf[i * 4];
            int id = (int)webBuf[i * 4 + 1];
            var pos = new Vector2(webBuf[i * 4 + 2], webBuf[i * 4 + 3]);
            if (phase == 0) { webDown[id] = pos; began.Add(new Press { id = id, pos = pos }); }
            else if (phase == 1) { if (webDown.ContainsKey(id)) webDown[id] = pos; }
            else
            {
                if (pos.x < 0f && webDown.TryGetValue(id, out var last)) pos = last;
                webDown.Remove(id);
                ended.Add(new Press { id = id, pos = pos });
            }
        }
        foreach (var kv in webDown) held.Add(new Press { id = kv.Key, pos = kv.Value });
        Track();
    }
#endif

    static void PollPointers()
    {
        if (pointerFrame == Time.frameCount) return;
        // Only trust "a finger we have not seen is new" when we also polled last frame; after a
        // menu (which does not poll) the finger that pressed its button is still down.
        bool continuous = pointerFrame == Time.frameCount - 1;
        pointerFrame = Time.frameCount;
        began.Clear(); ended.Clear(); held.Clear(); releases.Clear();
#if UNITY_WEBGL && !UNITY_EDITOR
        PollWeb();
        return;
#endif
        if (Input.touchCount > 0)
        {
            for (int i = 0; i < Input.touchCount; i++)
            {
                var t = Input.GetTouch(i);
                var p = new Press { id = t.fingerId, pos = t.position };
                bool over = t.phase == TouchPhase.Ended || t.phase == TouchPhase.Canceled;
                // A quick tap can start and end between two frames on a slow phone, so its
                // Began phase never shows up; a finger we have not seen before counts as a press.
                if (t.phase == TouchPhase.Began || (continuous && !activeFingers.Contains(t.fingerId))) began.Add(p);
                if (over) { ended.Add(p); activeFingers.Remove(t.fingerId); }
                else { held.Add(p); activeFingers.Add(t.fingerId); }
            }
            Track();
            return;
        }
        activeFingers.Clear();
        var m = new Press { id = -1, pos = Input.mousePosition };
        if (Input.GetMouseButtonDown(0)) began.Add(m);
        if (Input.GetMouseButtonUp(0)) ended.Add(m);
        else if (Input.GetMouseButton(0)) held.Add(m);
        Track();
    }

    /// <summary>Presses that started this frame and are not on a GUI button.</summary>
    public static List<Press> Began()
    {
        PollPointers();
        var list = new List<Press>();
        foreach (var p in began) if (!OverUi(p.pos)) list.Add(p);
        return list;
    }
    public static List<Press> Ended() { PollPointers(); return ended; }
    public static List<Press> Held() { PollPointers(); return held; }

    // ---------------- Materials ----------------
    static Shader lit, unlit, unlitTex, unlitTransparent, sprite;
    public static Material Lit(Color c, float gloss = 0.25f, Texture tex = null, float metal = 0f)
    {
        lit ??= OiyoShaders.Safe(Shader.Find("Standard"));
        var m = new Material(lit) { color = c };
        if (tex != null) m.mainTexture = tex;
        if (m.HasProperty("_Glossiness")) m.SetFloat("_Glossiness", gloss);
        if (m.HasProperty("_Metallic")) m.SetFloat("_Metallic", metal);
        return m;
    }
    // Standard's _EMISSION is a shader_feature that the build strips (no material asset uses it),
    // so "glow" here is the emission folded into a brighter lit colour.
    public static Material LitGlow(Color c, Color emission, float gloss = 0.4f)
    {
        var m = Lit(new Color(Mathf.Clamp01(c.r + emission.r), Mathf.Clamp01(c.g + emission.g), Mathf.Clamp01(c.b + emission.b), 1f), gloss);
        return m;
    }
    public static Material Glow(Color c)
    {
        unlit ??= OiyoShaders.Safe(Shader.Find("Unlit/Color"));
        return new Material(unlit) { color = c };
    }
    public static Material Textured(Texture tex)
    {
        unlitTex ??= Shader.Find("Unlit/Texture") ?? OiyoShaders.Safe(null);
        return new Material(unlitTex) { mainTexture = tex };
    }
    public static Material Transparent(Texture tex, Color tint)
    {
        sprite ??= Shader.Find("Sprites/Default") ?? Shader.Find("Unlit/Transparent") ?? OiyoShaders.Safe(null);
        return new Material(sprite) { mainTexture = tex, color = tint };
    }

    public static Texture2D Art(string path, bool repeat = false)
    {
        var t = Resources.Load<Texture2D>(path);
        if (t != null) t.wrapMode = repeat ? TextureWrapMode.Repeat : TextureWrapMode.Clamp;
        return t;
    }

    static Texture2D glowTex;
    public static Texture2D GlowTexture()
    {
        if (glowTex != null) return glowTex;
        const int n = 64;
        glowTex = new Texture2D(n, n, TextureFormat.RGBA32, false) { wrapMode = TextureWrapMode.Clamp };
        for (int y = 0; y < n; y++)
            for (int x = 0; x < n; x++)
            {
                float dx = (x + 0.5f) / n - 0.5f, dy = (y + 0.5f) / n - 0.5f;
                float d = Mathf.Sqrt(dx * dx + dy * dy) * 2f;
                float a = Mathf.Clamp01(1f - d);
                a = a * a * (3f - 2f * a);
                glowTex.SetPixel(x, y, new Color(1, 1, 1, a));
            }
        glowTex.Apply();
        return glowTex;
    }

    public static GameObject Prim(PrimitiveType type, string name, Material mat, Transform parent = null, bool keepCollider = false)
    {
        var go = GameObject.CreatePrimitive(type);
        go.name = name;
        if (!keepCollider) UnityEngine.Object.Destroy(go.GetComponent<Collider>());
        go.GetComponent<Renderer>().sharedMaterial = mat;
        if (parent != null) go.transform.SetParent(parent, false);
        return go;
    }

    /// <summary>A camera-facing glow quad (additive-looking soft disc).</summary>
    public static GameObject GlowQuad(string name, Color c, float size, Transform parent = null)
    {
        var go = Prim(PrimitiveType.Quad, name, Transparent(GlowTexture(), c), parent);
        go.transform.localScale = Vector3.one * size;
        var r = go.GetComponent<Renderer>();
        r.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
        r.receiveShadows = false;
        return go;
    }

    public static Color Hsv(float h, float s, float v) => Color.HSVToRGB(Mathf.Repeat(h, 1f), s, v);

    // ---------------- Progress ----------------
    public static int Unlocked(string slug) => Mathf.Max(1, PlayerPrefs.GetInt(slug + ".unlocked", 1));
    public static int Stars(string slug, int stage) => PlayerPrefs.GetInt(slug + ".stars." + stage, 0);
    public static int Best(string slug, int stage) => PlayerPrefs.GetInt(slug + ".best." + stage, 0);
    public static void Record(string slug, int stage, int stars, int score, int total)
    {
        if (stars > Stars(slug, stage)) PlayerPrefs.SetInt(slug + ".stars." + stage, stars);
        if (score > Best(slug, stage)) PlayerPrefs.SetInt(slug + ".best." + stage, score);
        if (stage + 2 > Unlocked(slug)) PlayerPrefs.SetInt(slug + ".unlocked", Mathf.Min(total, stage + 2));
        PlayerPrefs.Save();
    }
    public static int TotalStars(string slug, int total)
    {
        int s = 0;
        for (int i = 0; i < total; i++) s += Stars(slug, i);
        return s;
    }

    /// <summary>
    /// 30-stage picker that fits without scrolling (5x6 portrait, 10x3 landscape).
    /// Returns the picked stage index or -1.
    /// </summary>
    public static int StageGrid(Rect area, string slug, int count, Color accent, string stageWord)
    {
        int cols = area.width > area.height * 1.2f ? 10 : 5;
        int rows = Mathf.CeilToInt(count / (float)cols);
        float gap = 6f;
        float cw = (area.width - gap * (cols - 1)) / cols;
        float ch = Mathf.Min(74f, (area.height - gap * (rows - 1)) / rows);
        int unlocked = Unlocked(slug);
        int picked = -1;
        for (int i = 0; i < count; i++)
        {
            int cx = i % cols, cy = i / cols;
            var r = new Rect(area.x + cx * (cw + gap), area.y + cy * (ch + gap), cw, ch);
            bool open = i < unlocked;
            int stars = Stars(slug, i);
            string label = open
                ? $"<b>{i + 1}</b>\n<size={Mathf.RoundToInt(ch * 0.2f)}><color=#ffd54a>{new string('★', stars)}</color><color=#ffffff55>{new string('★', 3 - stars)}</color></size>"
                : $"<color=#ffffff66>{i + 1}</color>";
            Color bg = open ? (i == unlocked - 1 && stars == 0 ? accent : new Color(0.16f, 0.2f, 0.3f, 0.95f)) : new Color(0.1f, 0.12f, 0.17f, 0.9f);
            if (Button(r, label, bg, Mathf.RoundToInt(Mathf.Min(22f, ch * 0.34f)), null, open)) picked = i;
        }
        return picked;
    }

    public static string StarString(int stars) => $"<color=#ffd54a>{new string('★', stars)}</color><color=#ffffff44>{new string('★', 3 - stars)}</color>";
}

public enum Wave { Sine, Square, Triangle, Saw, Noise }

/// <summary>Procedural sound effects (no audio files ship with these builds).</summary>
public class Synth
{
    public const int Rate = 22050;
    readonly AudioSource src;
    readonly Dictionary<string, AudioClip> cache = new Dictionary<string, AudioClip>();
    public bool Muted;

    public Synth(GameObject host)
    {
        src = host.AddComponent<AudioSource>();
        src.playOnAwake = false;
        src.volume = 0.8f;
    }

    public AudioSource Source => src;

    public void Tone(float freq, float dur, Wave wave = Wave.Sine, float vol = 0.4f, float slideTo = 0f, float decay = 6f)
    {
        if (Muted) return;
        string key = $"{freq:F1}|{dur:F2}|{wave}|{vol:F2}|{slideTo:F1}|{decay:F1}";
        if (!cache.TryGetValue(key, out var clip) || clip == null)
        {
            int n = Mathf.Max(1, Mathf.CeilToInt(Rate * dur));
            var buf = new float[n];
            Render(buf, 0f, freq, dur, wave, vol, slideTo, decay, 1);
            clip = AudioClip.Create("sfx", n, 1, Rate, false);
            clip.SetData(buf, 0);
            cache[key] = clip;
        }
        src.PlayOneShot(clip);
    }

    /// <summary>Adds one note into buf starting at `start` seconds (soft attack, exponential decay).</summary>
    public static void Render(float[] buf, float start, float freq, float dur, Wave wave, float vol, float slideTo = 0f, float decay = 6f, int seed = 1)
    {
        int s0 = Mathf.Max(0, Mathf.RoundToInt(start * Rate));
        int n = Mathf.CeilToInt(dur * Rate);
        uint rng = (uint)(seed * 2654435761u + 12345u);
        float phase = 0f;
        for (int i = 0; i < n && s0 + i < buf.Length; i++)
        {
            float t = i / (float)Rate;
            float f = slideTo > 0f ? Mathf.Lerp(freq, slideTo, t / dur) : freq;
            phase += f / Rate;
            float p = phase - Mathf.Floor(phase);
            float v;
            switch (wave)
            {
                case Wave.Square: v = p < 0.5f ? 0.6f : -0.6f; break;
                case Wave.Triangle: v = 4f * Mathf.Abs(p - 0.5f) - 1f; break;
                case Wave.Saw: v = (2f * p - 1f) * 0.7f; break;
                case Wave.Noise: rng = rng * 1664525u + 1013904223u; v = (rng >> 8) / 8388608f - 1f; break;
                default: v = Mathf.Sin(p * Mathf.PI * 2f); break;
            }
            float env = Mathf.Min(1f, t / 0.004f) * Mathf.Exp(-t * decay) * Mathf.Clamp01((dur - t) / 0.01f);
            buf[s0 + i] += v * env * vol;
        }
    }
}

/// <summary>One pooled particle system for sparks and bursts.</summary>
public class Bursts
{
    readonly ParticleSystem ps;
    public Bursts(Transform parent, float gravity = 0.6f)
    {
        var go = new GameObject("Bursts");
        go.transform.SetParent(parent, false);
        ps = go.AddComponent<ParticleSystem>();
        ps.Stop(true, ParticleSystemStopBehavior.StopEmittingAndClear);
        var main = ps.main;
        main.playOnAwake = false;
        main.loop = false;
        main.maxParticles = 600;
        main.simulationSpace = ParticleSystemSimulationSpace.World;
        main.gravityModifier = gravity;
        main.startLifetime = 0.6f;
        var em = ps.emission; em.enabled = false;
        var shape = ps.shape; shape.enabled = false;
        var col = ps.colorOverLifetime;
        col.enabled = true;
        var g = new Gradient();
        g.SetKeys(new[] { new GradientColorKey(Color.white, 0f), new GradientColorKey(Color.white, 1f) },
                  new[] { new GradientAlphaKey(1f, 0f), new GradientAlphaKey(0.8f, 0.5f), new GradientAlphaKey(0f, 1f) });
        col.color = new ParticleSystem.MinMaxGradient(g);
        var size = ps.sizeOverLifetime;
        size.enabled = true;
        size.size = new ParticleSystem.MinMaxCurve(1f, AnimationCurve.Linear(0f, 1f, 1f, 0.2f));
        var r = go.GetComponent<ParticleSystemRenderer>();
        r.sharedMaterial = OiyoArcade.Transparent(OiyoArcade.GlowTexture(), Color.white);
        r.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
        r.receiveShadows = false;
        ps.Play();
    }

    public void Emit(Vector3 pos, Color c, int count, float speed = 4f, float size = 0.3f, float life = 0.6f, Vector3? bias = null)
    {
        var p = new ParticleSystem.EmitParams { applyShapeToPosition = false };
        for (int i = 0; i < count; i++)
        {
            p.position = pos;
            p.velocity = UnityEngine.Random.insideUnitSphere.normalized * speed * UnityEngine.Random.Range(0.4f, 1f) + (bias ?? Vector3.zero);
            p.startColor = c;
            p.startSize = size * UnityEngine.Random.Range(0.6f, 1.2f);
            p.startLifetime = life * UnityEngine.Random.Range(0.6f, 1.1f);
            ps.Emit(p, 1);
        }
    }
}
