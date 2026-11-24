using System;
using UnityEngine;

// Shared by the 2026-11-24 winter Unity wave (jwibul-spin, snowball-fight, snow-sled, neol-jump,
// tuho-toss). Each build keeps a byte-identical copy; edit
// prototypes/jwibul-spin-unity/Assets/JwibulSpin/Runtime/OiyoField.cs and copy.
// The web games run on a 360 px wide field with y pointing down. OiyoField maps that field onto
// the world's XY plane (30 px = 1 unit, y up) and fits a perspective camera around it, so the rules
// ported from src/lib/games/*.ts keep their own pixel numbers. It holds no translatable text.
public class OiyoField
{
    public const float PX = 30f;
    public readonly float FW, FH;
    public readonly Camera Cam;

    public OiyoField(float fieldW, float fieldH, Color sky)
    {
        FW = fieldW; FH = fieldH;
        Cam = new GameObject("Camera").AddComponent<Camera>();
        Cam.fieldOfView = 30f;
        Cam.clearFlags = CameraClearFlags.SolidColor;
        Cam.backgroundColor = sky;
        Cam.nearClipPlane = 0.3f; Cam.farClipPlane = 200f;
    }

    /// <summary>World point for a field point (x right, y down, in field px). z toward the camera is negative.</summary>
    public Vector3 W(float x, float y, float z = 0f) => new Vector3((x - FW * 0.5f) / PX, (FH * 0.5f - y) / PX, z);
    public static float U(float px) => px / PX;

    /// <summary>Field point under a screen point (Input.mousePosition style), on the z = 0 plane.</summary>
    public bool ToField(Vector2 screen, out Vector2 f)
    {
        f = default;
        var ray = Cam.ScreenPointToRay(screen);
        if (Mathf.Abs(ray.direction.z) < 1e-5f) return false;
        float t = -ray.origin.z / ray.direction.z;
        var p = ray.origin + ray.direction * t;
        f = new Vector2(p.x * PX + FW * 0.5f, FH * 0.5f - p.y * PX);
        return true;
    }

    /// <summary>Screen pixels per field pixel at z = 0 (for drag distances).</summary>
    public float ScreenPerField()
    {
        var a = Cam.WorldToScreenPoint(W(0f, FH * 0.5f));
        var b = Cam.WorldToScreenPoint(W(FW, FH * 0.5f));
        return Mathf.Max(0.01f, Mathf.Abs(b.x - a.x) / FW);
    }

    /// <summary>
    /// Looks straight at the field from the front (tilt in degrees leans the view down a little)
    /// with room in field px for the HUD at the top and buttons at the bottom.
    /// Only the part of the field from y0 to y1 has to fit (a scrolling game shows a window).
    /// </summary>
    public void Fit(float padTop, float padBottom, float tilt = 0f, float y0 = 0f, float y1 = -1f, float padSide = 6f)
    {
        if (y1 < 0f) y1 = FH;
        float needW = U(FW + padSide * 2f), needH = U(y1 - y0 + padTop + padBottom);
        float halfV = Cam.fieldOfView * 0.5f * Mathf.Deg2Rad;
        float dist = Mathf.Max(needH * 0.5f / Mathf.Tan(halfV), needW * 0.5f / (Mathf.Tan(halfV) * Cam.aspect));
        float cy = (FH * 0.5f - (y0 + y1) * 0.5f) / PX + U(padBottom - padTop) * 0.5f;
        var target = new Vector3(0f, cy, 0f);
        var rot = Quaternion.Euler(-tilt, 0f, 0f);
        Cam.transform.rotation = rot;
        Cam.transform.position = target - rot * Vector3.forward * dist;
        // A tilted view squeezes the far edge and stretches the near one, so the straight-on fit
        // above is off. Nudge it until the field fits, its bottom edge padBottom above the screen's
        // bottom; spare height (a phone held upright) goes to the top, where the sky is.
        float total = y1 - y0 + padTop + padBottom;
        for (int i = 0; i < 5; i++)
        {
            float top = Cam.WorldToViewportPoint(W(FW * 0.5f, y0)).y;
            float bot = Cam.WorldToViewportPoint(W(FW * 0.5f, y1)).y;
            float wl = Cam.WorldToViewportPoint(W(0f, y1)).x, wr = Cam.WorldToViewportPoint(W(FW, y1)).x;
            float spanH = Mathf.Max(0.01f, top - bot) / ((y1 - y0) / total);
            float spanW = Mathf.Max(0.01f, wr - wl) / (FW / (FW + padSide * 2f));
            dist *= Mathf.Max(spanH, spanW);
            Cam.transform.position = target - rot * Vector3.forward * dist;
            float viewH = 2f * dist * Mathf.Tan(halfV);
            bot = Cam.WorldToViewportPoint(W(FW * 0.5f, y1)).y;
            float shift = bot - U(padBottom) / viewH;
            Cam.transform.position += Cam.transform.up * shift * viewH;
            target = Cam.transform.position + rot * Vector3.forward * dist;
        }
    }

    /// <summary>A quad sized in field px, facing the camera.</summary>
    public static Transform Quad(string name, Material m, Transform parent, float wPx, float hPx)
    {
        var go = OiyoArcade.Prim(PrimitiveType.Quad, name, m, parent);
        go.transform.localScale = new Vector3(U(wPx), U(hPx), 1f);
        var r = go.GetComponent<Renderer>();
        r.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
        r.receiveShadows = false;
        return go.transform;
    }

    public static Material Sprite(string path) => OiyoArcade.Transparent(OiyoArcade.Art(path), Color.white);

    public static void Lights(Color ambient, float sun = 1f, float pitch = 40f, float yaw = -30f)
    {
        var l = new GameObject("Sun").AddComponent<Light>();
        l.type = LightType.Directional; l.intensity = sun;
        l.transform.rotation = Quaternion.Euler(pitch, yaw, 0f);
        RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat;
        RenderSettings.ambientLight = ambient;
    }

    /// <summary>?oiyotest=1&amp;oiyostage=N (1-based) opens stage N for the automated check and poster capture; -1 otherwise.</summary>
    public static int TestStage(int count)
    {
        string url = Application.absoluteURL ?? "";
        if (!url.Contains("oiyotest=1")) return -1;
        int i = url.IndexOf("oiyostage=", StringComparison.Ordinal);
        if (i < 0) return -1;
        int n = 0, k = i + 10;
        while (k < url.Length && char.IsDigit(url[k])) n = n * 10 + (url[k++] - '0');
        return n >= 1 && n <= count ? n - 1 : -1;
    }

    // ---------------- seeded random, the web's mulberry32 ----------------
    public static Func<double> Mulberry(uint seed)
    {
        uint a = seed;
        return () =>
        {
            a = unchecked(a + 0x6d2b79f5u);
            uint t = a;
            t = unchecked((t ^ (t >> 15)) * (t | 1u));
            t ^= unchecked(t + (t ^ (t >> 7)) * (t | 61u));
            return ((t ^ (t >> 14))) / 4294967296.0;
        };
    }
}

/// <summary>The menu, stage list, pause and result cards every wave-6 game shares. Callers pass translated text.</summary>
public static class OiyoScreens
{
    public static readonly Color Slate = new Color(0.17f, 0.22f, 0.33f, 0.95f);
    public static readonly Color Gold = new Color(1f, 0.83f, 0.29f, 0.97f);

    /// <summary>0 nothing, 1 play, 2 stage list, 3 language.</summary>
    public static int Menu(float w, float h, Color panel, Color accent, Color titleColor, string title, string blurb, string stageLine, string play, string all)
    {
        float cw = Mathf.Min(380f, w - 24f);
        var card = new Rect(w * 0.5f - cw * 0.5f, h * 0.5f - 180f, cw, 360f);
        OiyoArcade.Panel(card, panel);
        OiyoArcade.Shadowed(new Rect(card.x, card.y + 18f, cw, 40f), title, 30, titleColor, TextAnchor.MiddleCenter);
        OiyoArcade.Text(new Rect(card.x + 18f, card.y + 60f, cw - 36f, 66f), blurb, 14, new Color(1f, 1f, 1f, 0.9f), TextAnchor.MiddleCenter);
        OiyoArcade.Text(new Rect(card.x, card.y + 130f, cw, 24f), stageLine, 15, Gold, TextAnchor.MiddleCenter);
        int r = 0;
        if (OiyoArcade.Button(new Rect(card.x + 24f, card.y + 162f, cw - 48f, 58f), "<b>▶ " + play + "</b>", accent, 21)) r = 1;
        if (OiyoArcade.Button(new Rect(card.x + 24f, card.y + 230f, cw - 48f, 46f), all, Slate, 17)) r = 2;
        if (OiyoArcade.Button(new Rect(card.x + 24f, card.y + 286f, cw - 48f, 46f), "Aa  " + OiyoArcade.Lang.ToUpperInvariant(), Slate, 17)) { OiyoArcade.NextLang(); r = 3; }
        return r;
    }

    /// <summary>-2 back, -1 nothing, else the picked stage.</summary>
    public static int Stages(float w, float h, Color panel, Color accent, string slug, int count, string title, string back, string stageWord)
    {
        float bw = Mathf.Min(w - 16f, 760f);
        var box = new Rect(w * 0.5f - bw * 0.5f, 12f, bw, Mathf.Min(h - 24f, 520f));
        OiyoArcade.Panel(box, panel);
        OiyoArcade.Text(new Rect(box.x + 16f, box.y + 12f, box.width - 120f, 30f), "<b>" + title + "</b>", 20, Color.white);
        OiyoArcade.Text(new Rect(box.x + 16f, box.y + 40f, box.width - 32f, 22f), $"★ {OiyoArcade.TotalStars(slug, count)}/{count * 3}", 15, Gold);
        if (OiyoArcade.Button(new Rect(box.xMax - 100f, box.y + 12f, 86f, 40f), back, Slate, 16)) return -2;
        return OiyoArcade.StageGrid(new Rect(box.x + 14f, box.y + 70f, box.width - 28f, box.height - 84f), slug, count, accent, stageWord);
    }

    /// <summary>0 nothing, 1 resume, 2 restart, 3 stage list.</summary>
    public static int Pause(float w, float h, Color panel, Color accent, string paused, string resume, string restart, string list)
    {
        float cw = Mathf.Min(340f, w - 24f);
        var card = new Rect(w * 0.5f - cw * 0.5f, h * 0.5f - 130f, cw, 260f);
        OiyoArcade.Panel(card, panel);
        OiyoArcade.Shadowed(new Rect(card.x, card.y + 16f, cw, 36f), paused, 26, Color.white, TextAnchor.MiddleCenter);
        if (OiyoArcade.Button(new Rect(card.x + 24f, card.y + 70f, cw - 48f, 52f), "▶ " + resume, accent, 19)) return 1;
        if (OiyoArcade.Button(new Rect(card.x + 24f, card.y + 132f, cw - 48f, 46f), restart, Slate, 17)) return 2;
        if (OiyoArcade.Button(new Rect(card.x + 24f, card.y + 188f, cw - 48f, 46f), list, Slate, 17)) return 3;
        return 0;
    }

    /// <summary>0 nothing, 1 next, 2 retry, 3 stage list. next null = no next button; finale shown instead when set.</summary>
    public static int Result(float w, float h, Color panel, Color accent, bool won, bool live, string heading, string detail, string body, string next, string finale, string retry, string list)
    {
        float cw = Mathf.Min(360f, w - 24f);
        bool row = next != null || finale != null;
        float ch = 158f + (row ? 58f : 0f) + 52f + 40f + 18f;
        var card = new Rect(w * 0.5f - cw * 0.5f, h * 0.5f - ch * 0.5f, cw, ch);
        OiyoArcade.Panel(card, panel);
        OiyoArcade.Shadowed(new Rect(card.x, card.y + 14f, cw, 38f), heading, 28, won ? new Color(0.6f, 1f, 0.65f) : new Color(1f, 0.6f, 0.5f), TextAnchor.MiddleCenter);
        OiyoArcade.Text(new Rect(card.x + 16f, card.y + 56f, cw - 32f, 44f), detail, 16, Color.white, TextAnchor.MiddleCenter);
        OiyoArcade.Text(new Rect(card.x + 16f, card.y + 100f, cw - 32f, 52f), body, 16, Color.white, TextAnchor.MiddleCenter);
        float y = card.y + 158f;
        int r = 0;
        if (next != null)
        {
            if (live & OiyoArcade.Button(new Rect(card.x + 24f, y, cw - 48f, 50f), "<b>" + next + " ▶</b>", accent, 19)) r = 1;
            y += 58f;
        }
        else if (finale != null)
        {
            OiyoArcade.Text(new Rect(card.x, y, cw, 50f), "★ " + finale + " ★", 17, Gold, TextAnchor.MiddleCenter);
            y += 58f;
        }
        if (live & OiyoArcade.Button(new Rect(card.x + 24f, y, cw - 48f, 44f), retry, won ? Slate : accent, 17)) r = 2;
        y += 52f;
        if (live & OiyoArcade.Button(new Rect(card.x + 24f, y, cw - 48f, 40f), list, Slate, 16)) r = 3;
        return r;
    }

    /// <summary>The "how to play" card shown before the first touch of a stage.</summary>
    public static void Hint(float w, float h, Color panel, string head, string body, float fromBottom = 170f, float height = 100f)
    {
        float cw = Mathf.Min(340f, w - 24f);
        var r = new Rect(w * 0.5f - cw * 0.5f, h - fromBottom, cw, height);
        OiyoArcade.Panel(r, panel);
        OiyoArcade.Text(new Rect(r.x + 12f, r.y + 6f, r.width - 24f, r.height - 12f), $"<b>{head}</b>\n<size=14>{body}</size>", 16, Color.white, TextAnchor.MiddleCenter);
    }
}
