using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Twin Rooms 3D: the web Twin Rooms (src/components/games/TwinRooms.tsx, src/lib/games/twin-rooms.ts) rebuilt in Unity
// on the web's own 360 × 560 px field (OiyoField). Two pictures of the same cosy room, a few things different: tap a
// difference in either picture to circle it in both, before five wrong taps. The 30 rooms are the web's own
// (TwinRoomsStages.cs).
public class TwinRoomsPlayer : MonoBehaviour
{
    const string Slug = "twin-rooms";
    const int StageCount = 30, Misses = 5;
    const float PanelX = 10f, TopY = 64f, BotY = 306f, PanelW = 340f, PanelH = 230f, HitR = 24f, ItemPx = 30f;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of twin-rooms.ts) ----------------
    struct Thing { public int item, v, x, y; public bool flip; }
    TwinRoomsStages.Level st;
    int stageIdx, starsWon, nThings, nDiffs, misses, taps;
    Thing[] things;
    bool[] found;
    bool over, won;

    int Kind(int k) => st.diffs[7 * k];
    int DiffThing(int k) => st.diffs[7 * k + 1];
    Thing Extra(int k) => new Thing { item = st.diffs[7 * k + 2], v = st.diffs[7 * k + 3], flip = st.diffs[7 * k + 4] == 1, x = st.diffs[7 * k + 5], y = st.diffs[7 * k + 6] };

    Vector2 DiffAt(int k)
    {
        var t = Kind(k) == 3 ? Extra(k) : things[DiffThing(k)];
        return new Vector2(t.x, t.y);
    }

    List<Thing> BottomThings()
    {
        var outL = new List<Thing>();
        for (int i = 0; i < nThings; i++)
        {
            int d = -1;
            for (int k = 0; k < nDiffs; k++) if (Kind(k) != 3 && DiffThing(k) == i) d = k;
            var t = things[i];
            if (d < 0) outL.Add(t);
            else if (Kind(d) == 1) { t.v = 1 - t.v; outL.Add(t); }
            else if (Kind(d) == 2) { t.flip = !t.flip; outL.Add(t); }
        }
        for (int k = 0; k < nDiffs; k++) if (Kind(k) == 3) outL.Add(Extra(k));
        return outL;
    }

    int Tap(float x, float y)
    {
        if (over) return -2;
        taps++;
        int best = -1;
        float bestD = HitR;
        for (int k = 0; k < nDiffs; k++)
        {
            float d = Vector2.Distance(DiffAt(k), new Vector2(x, y));
            if (d < bestD) { bestD = d; best = k; }
        }
        if (best >= 0 && found[best]) return -3;
        if (best < 0) { misses++; if (misses >= Misses) over = true; return -1; }
        found[best] = true;
        bool all = true;
        foreach (bool f in found) if (!f) all = false;
        if (all) { over = true; won = true; }
        return best;
    }

    int StarsFor()
    {
        if (!won) return 0;
        if (misses <= 1) return 3;
        if (misses <= 3) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    OiyoField field;
    Camera cam;
    Transform root, markTop, markBot;
    Transform[][] rings;
    readonly List<(Transform t, float life)> crosses = new List<(Transform, float)>();
    Material ringMat, crossMat;
    Bursts burst;
    Synth synth;
    bool showStages, keyed;
    Vector2 marker = new Vector2(170f, 115f);

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(360f, 560f, new Color(0.97f, 0.98f, 0.98f));
        cam = field.Cam;
        OiyoField.Lights(new Color(0.8f, 0.8f, 0.78f), 0.7f, 50f, -25f);
        burst = new Bursts(transform, 0.5f);
        synth = new Synth(gameObject);
        ringMat = OiyoArcade.Glow(new Color(0.88f, 0.19f, 0.19f));
        crossMat = OiyoArcade.Glow(new Color(0.53f, 0.56f, 0.59f));
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int i, bool ready = true)
    {
        stageIdx = Mathf.Clamp(i, 0, StageCount - 1);
        StopAllCoroutines();
        st = TwinRoomsStages.All[stageIdx];
        nThings = st.things.Length / 5; nDiffs = st.diffs.Length / 7;
        things = new Thing[nThings];
        for (int t = 0; t < nThings; t++) things[t] = new Thing { item = st.things[5 * t], v = st.things[5 * t + 1], flip = st.things[5 * t + 2] == 1, x = st.things[5 * t + 3], y = st.things[5 * t + 4] };
        found = new bool[nDiffs];
        misses = 0; taps = 0; over = false; won = false; starsWon = 0; keyed = false; marker = new Vector2(170f, 115f);
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Rooms").transform;
        crosses.Clear();
        showStages = false;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Animate(0f);
    }

    Transform Box(string name, Material m, float x, float y, float w, float h, float z, float d)
    {
        var o = OiyoArcade.Prim(PrimitiveType.Cube, name, m, root).transform;
        o.localScale = new Vector3(OiyoField.U(w), OiyoField.U(h), d);
        o.position = field.W(x, y, z);
        return o;
    }

    void Room(float oy, List<Thing> list)
    {
        Color[] walls = { new Color(1f, 0.96f, 0.9f), new Color(0.91f, 0.96f, 1f), new Color(0.95f, 0.94f, 1f), new Color(0.92f, 0.98f, 0.93f) };
        Color[] floors = { new Color(0.91f, 0.77f, 0.42f), new Color(0.82f, 0.64f, 0.42f), new Color(0.79f, 0.64f, 0.48f), new Color(0.88f, 0.72f, 0.52f) };
        int tone = stageIdx % 4;
        Box("Frame", OiyoArcade.Lit(new Color(0.29f, 0.31f, 0.34f), 0.2f), PanelX + PanelW / 2f, oy + PanelH / 2f, PanelW + 6f, PanelH + 6f, 0.5f, 0.05f);
        Box("Wall", OiyoArcade.Glow(walls[tone]), PanelX + PanelW / 2f, oy + 65f, PanelW, 130f, 0.4f, 0.05f);
        var stripe = OiyoArcade.Glow(Color.Lerp(walls[tone], Color.black, 0.04f));
        for (float x = 0; x < PanelW; x += 20f) Box("Stripe", stripe, PanelX + x + 5f, oy + 65f, 10f, 130f, 0.35f, 0.02f);
        Box("Floor", OiyoArcade.Glow(floors[tone]), PanelX + PanelW / 2f, oy + 130f + (PanelH - 130f) / 2f, PanelW, PanelH - 130f, 0.4f, 0.05f);
        var board = OiyoArcade.Glow(Color.Lerp(floors[tone], Color.black, 0.06f));
        for (float y = 140f; y < PanelH; y += 18f) Box("Board", board, PanelX + PanelW / 2f, oy + y, PanelW, 2f, 0.35f, 0.02f);
        Box("Shelf", OiyoArcade.Lit(new Color(0.54f, 0.35f, 0.17f), 0.3f), PanelX + PanelW / 2f, oy + 116f + 7f, PanelW - 16f, 6f, 0.2f, OiyoField.U(14f));
        foreach (var t in list)
        {
            var q = OiyoField.Quad("Thing", OiyoField.Sprite($"TW/item{t.item}_{t.v}"), root, ItemPx, ItemPx);
            q.position = field.W(PanelX + t.x, oy + t.y, -0.1f);
            if (t.flip) q.localScale = new Vector3(-q.localScale.x, q.localScale.y, q.localScale.z);
        }
    }

    Transform[] Ring(float cx, float cy)
    {
        var parts = new Transform[20];
        for (int j = 0; j < 20; j++)
        {
            float a = j / 20f * Mathf.PI * 2f;
            parts[j] = Box("Ring", ringMat, cx + Mathf.Cos(a) * HitR, cy + Mathf.Sin(a) * HitR, 8f, 3f, -0.4f, 0.02f);
            parts[j].rotation = Quaternion.Euler(0f, 0f, -a * Mathf.Rad2Deg + 90f);
        }
        return parts;
    }

    void BuildScene()
    {
        Box("Back", OiyoArcade.Glow(new Color(0.97f, 0.98f, 0.98f)), 180f, 280f, 1200f, 1600f, 0.8f, 0.2f);
        var top = new List<Thing>(things);
        Room(TopY, top);
        Room(BotY, BottomThings());
        rings = new Transform[nDiffs][];
        for (int k = 0; k < nDiffs; k++)
        {
            var d = DiffAt(k);
            var a = Ring(PanelX + d.x, TopY + d.y);
            var b = Ring(PanelX + d.x, BotY + d.y);
            rings[k] = new Transform[a.Length + b.Length];
            a.CopyTo(rings[k], 0);
            b.CopyTo(rings[k], a.Length);
        }
        var mk = OiyoArcade.Glow(new Color(0.11f, 0.49f, 0.84f));
        markTop = Box("Marker", mk, 0f, 0f, 20f, 3f, -0.5f, 0.02f);
        markBot = Box("Marker", mk, 0f, 0f, 20f, 3f, -0.5f, 0.02f);
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("twin-rooms", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        Animate(dt);
    }

    void Look(float px, float py, float oy)
    {
        if (state != GameState.Playing || over) return;
        int k = Tap(px, py);
        if (k >= 0)
        {
            burst.Emit(field.W(PanelX + px, oy + py, -0.8f), new Color(1f, 0.83f, 0.23f), 12, 2.5f, 0.05f, 0.5f);
            synth.Tone(880f, 0.08f, Wave.Triangle, 0.1f, 1175f);
        }
        else if (k == -1)
        {
            var a = Box("Cross", crossMat, PanelX + px, oy + py, 20f, 3f, -0.6f, 0.02f);
            a.rotation = Quaternion.Euler(0f, 0f, 45f);
            var b = Box("Cross", crossMat, 0f, 0f, 20f, 3f, -0.6f, 0.02f);
            b.SetParent(a, true);
            b.position = a.position;
            b.rotation = Quaternion.Euler(0f, 0f, -45f);
            crosses.Add((a, 0.6f));
            synth.Tone(196f, 0.1f, Wave.Square, 0.06f);
        }
        if (over) End();
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
                    // input is read once per frame: a tap in either picture
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (state == GameState.Ready) { state = GameState.Playing; continue; }
                        if (OiyoArcade.OverUi(b.pos) || !field.ToField(b.pos, out Vector2 f)) continue;
                        keyed = false;
                        float oy = f.y >= BotY ? BotY : TopY;
                        float px = f.x - PanelX, py = f.y - oy;
                        if (px < 0f || px > PanelW || py < 0f || py > PanelH) continue;
                        Look(px, py, oy);
                    }
                    float stepPx = Input.GetKey(KeyCode.LeftShift) || Input.GetKey(KeyCode.RightShift) ? 30f : 10f;
                    Vector2 dv = Vector2.zero;
                    if (Input.GetKeyDown(KeyCode.LeftArrow)) dv.x = -stepPx;
                    else if (Input.GetKeyDown(KeyCode.RightArrow)) dv.x = stepPx;
                    else if (Input.GetKeyDown(KeyCode.UpArrow)) dv.y = -stepPx;
                    else if (Input.GetKeyDown(KeyCode.DownArrow)) dv.y = stepPx;
                    if (dv != Vector2.zero)
                    {
                        if (state == GameState.Ready) state = GameState.Playing;
                        if (!keyed) keyed = true;
                        else marker = new Vector2(Mathf.Clamp(marker.x + dv.x, 0f, PanelW), Mathf.Clamp(marker.y + dv.y, 0f, PanelH));
                    }
                    if (Input.GetKeyDown(KeyCode.Space) || confirm)
                    {
                        if (state == GameState.Ready) state = GameState.Playing;
                        else if (!keyed) keyed = true;
                        else Look(marker.x, marker.y, TopY);
                    }
                    return;
                }
            case GameState.Paused:
                if (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P)) state = GameState.Playing;
                return;
            case GameState.Victory:
            case GameState.GameOver:
                if (confirm && ResultLive) LoadStage(won ? Mathf.Min(stageIdx + 1, StageCount - 1) : stageIdx);
                return;
            case GameState.Menu:
                if (!showStages && confirm) LoadStage(stageIdx);
                return;
        }
    }

    float endTime;
    bool ResultLive => Time.unscaledTime - endTime > 0.45f;

    void End()
    {
        if (state != GameState.Playing) return;
        endTime = Time.unscaledTime;
        starsWon = StarsFor();
        if (won)
        {
            state = GameState.Victory;
            OiyoArcade.Record(Slug, stageIdx, starsWon, Mathf.Max(0, (Misses - misses) * 10), StageCount);
            StartCoroutine(Arp(new[] { 523f, 659f, 784f, 1047f }, 0.1f));
        }
        else
        {
            state = GameState.GameOver;
            StartCoroutine(Arp(new[] { 392f, 330f, 262f }, 0.14f));
        }
    }

    IEnumerator Arp(float[] fs, float gap)
    {
        foreach (var f in fs) { synth.Tone(f, 0.18f, Wave.Triangle, 0.22f, 0f, 6f); yield return new WaitForSeconds(gap); }
    }

    void Animate(float dt)
    {
        if (root == null) return;
        field.Fit(56f, 10f, 0f, TopY - 6f, BotY + PanelH + 6f);
        for (int k = 0; k < nDiffs; k++) foreach (var r in rings[k]) r.gameObject.SetActive(found[k]);
        for (int j = crosses.Count - 1; j >= 0; j--)
        {
            var (t, life) = crosses[j];
            life -= dt;
            if (life <= 0f) { Destroy(t.gameObject); crosses.RemoveAt(j); }
            else crosses[j] = (t, life);
        }
        markTop.gameObject.SetActive(keyed && !over);
        markBot.gameObject.SetActive(keyed && !over);
        markTop.position = field.W(PanelX + marker.x, TopY + marker.y + 12f, -0.5f);
        markBot.position = field.W(PanelX + marker.x, BotY + marker.y + 12f, -0.5f);
    }

    // ?oiyotest=1 prints the state to the browser console for the automated play check, with the screen point of the
    // next difference still to find (in the top picture).
    bool testLog; float testT;
    void TestTick(float dt)
    {
        if (!testLog) return;
        if ((testT -= dt) > 0f) return;
        testT = 0.05f;
        string nx = "null";
        int got = 0;
        foreach (bool f in found) if (f) got++;
        if (state == GameState.Playing && !over)
        {
            for (int k = 0; k < nDiffs; k++)
            {
                if (found[k]) continue;
                var d = DiffAt(k);
                var sp = cam.WorldToScreenPoint(field.W(PanelX + d.x, TopY + d.y, 0f));
                nx = $"[{sp.x:F1},{Screen.height - sp.y:F1}]";
                break;
            }
        }
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"taps\":{got},\"misses\":{misses},\"next\":{nx},\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.88f, 0.19f, 0.19f, 0.97f);
    static readonly Color Dark = new Color(0.16f, 0.12f, 0.12f, 0.9f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("{0} differences", TwinRoomsStages.All[i].diffs.Length / 7);

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(1f, 0.95f, 0.92f), U("Twin Rooms"),
                U("Two pictures of the same cosy room, but a few things differ: missing, new, recoloured or turned around. Tap each difference in either picture before five wrong taps."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        var bar = new Rect(8f, 8f, w - 16f, 44f);
        OiyoArcade.Panel(bar, Dark);
        int got = 0;
        foreach (bool f in found) if (f) got++;
        OiyoArcade.Text(new Rect(20f, 18f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>  " + F("Found {0}/{1}", got, nDiffs) + "  " + F("Misses {0}/{1}", misses, Misses), 15, new Color(1f, 0.95f, 0.92f));
        if (OiyoArcade.Button(new Rect(w - 56f, 12f, 40f, 36f), "<b>II</b>", OiyoScreens.Slate, 16))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap to start"), U("Tap what's different!"), 120f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            string detail = won ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : "";
            string body = won ? $"<size=14>{F("Found them all with {0} wrong taps", misses)}</size>" : "";
            int r = OiyoScreens.Result(w, h, Dark, Accent, won, ResultLive, won ? U("You found every difference!") : U("Five wrong taps"), detail, body,
                won && stageIdx < StageCount - 1 ? U("Next stage") : null, won && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
