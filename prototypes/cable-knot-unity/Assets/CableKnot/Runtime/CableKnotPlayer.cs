using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Cable Knot 3D: the web Cable Knot (src/components/games/CableKnot.tsx, src/lib/games/cable-knot.ts) rebuilt in
// Unity on a 360 × 520 px field (OiyoField). Plugs sit in sockets with straight cables between them; a red cable
// crosses another. Tap a plug, then an empty socket, to move it. No crossings left clears the desk; the move limit ends
// it. The 30 desks are the web's own (CableKnotStages.cs).
public class CableKnotPlayer : MonoBehaviour
{
    const string Slug = "cable-knot";
    const int StageCount = 30;
    static readonly string[] PlugColours = { "#1971c2", "#e8590c", "#2f9e44", "#7048e8", "#c2255c", "#0c8599", "#f08c00", "#495057" };

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of cable-knot.ts) ----------------
    CableKnotStages.Level st;
    int stageIdx, starsWon, moves;
    int[] at;
    bool over, won;

    int Sockets => st.sockets.Length / 2;
    Vector2 Sock(int s) => new Vector2(st.sockets[s * 2], st.sockets[s * 2 + 1]);
    int Edges => st.edges.Length / 2;

    static int Orient(Vector2 p, Vector2 q, Vector2 r) => System.Math.Sign((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x));
    static bool Cross(Vector2 a, Vector2 b, Vector2 c, Vector2 d) => Orient(a, b, c) * Orient(a, b, d) < 0 && Orient(c, d, a) * Orient(c, d, b) < 0;

    bool Crosses(int[] pos, int i, int j)
    {
        int a = st.edges[i * 2], b = st.edges[i * 2 + 1], c = st.edges[j * 2], d = st.edges[j * 2 + 1];
        if (a == c || a == d || b == c || b == d) return false;
        return Cross(Sock(pos[a]), Sock(pos[b]), Sock(pos[c]), Sock(pos[d]));
    }

    int CrossCount(int[] pos)
    {
        int t = 0;
        for (int i = 0; i < Edges; i++) for (int j = i + 1; j < Edges; j++) if (Crosses(pos, i, j)) t++;
        return t;
    }

    bool Tangled(int i)
    {
        for (int j = 0; j < Edges; j++) if (j != i && Crosses(at, i, j)) return true;
        return false;
    }

    bool Taken(int s) { foreach (int x in at) if (x == s) return true; return false; }

    bool Move(int plug, int socket)
    {
        if (over || plug < 0 || plug >= st.plugs || socket < 0 || socket >= Sockets || Taken(socket)) return false;
        at[plug] = socket;
        moves++;
        if (CrossCount(at) == 0) { over = true; won = true; }
        else if (moves >= st.limit) over = true;
        return true;
    }

    int StarsFor()
    {
        if (!won) return 0;
        if (moves <= st.par) return 3;
        if (moves <= Mathf.CeilToInt((st.par + st.limit) / 2f)) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    const float FW = 360f, FH = 520f;
    OiyoField field;
    Camera cam;
    Transform root, selMark;
    Transform[] plugObj, ringObj, cableObj;
    Vector2[] plugPos;
    Material[] plugMat;
    Material redMat, greenMat, deskMat, ringMat, ringOn, selMat, pinMat;
    Bursts sparkle;
    Synth synth;
    bool showStages;
    int picked = -1, target = -1;
    readonly List<Vector2Int> recent = new List<Vector2Int>();

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(FW, FH, new Color(0.78f, 0.64f, 0.48f));
        cam = field.Cam;
        OiyoField.Lights(new Color(0.72f, 0.7f, 0.68f), 0.7f, 50f, -25f);
        sparkle = new Bursts(transform, 0.5f);
        synth = new Synth(gameObject);
        plugMat = new Material[PlugColours.Length];
        for (int k = 0; k < PlugColours.Length; k++) { ColorUtility.TryParseHtmlString(PlugColours[k], out var c); plugMat[k] = OiyoArcade.Lit(c, 0.5f); }
        redMat = OiyoArcade.Lit(new Color(0.88f, 0.19f, 0.19f), 0.4f);
        greenMat = OiyoArcade.Lit(new Color(0.17f, 0.54f, 0.24f), 0.4f);
        deskMat = OiyoArcade.Lit(new Color(0.78f, 0.64f, 0.48f), 0.2f, OiyoArcade.Art("CN/wood", true));
        ringMat = OiyoField.Sprite("CN/ring");
        ringOn = OiyoArcade.Transparent(OiyoArcade.Art("CN/ring"), new Color(0.1f, 0.44f, 0.76f));
        selMat = OiyoArcade.Lit(new Color(1f, 0.83f, 0.23f), 0.3f);
        pinMat = OiyoArcade.Lit(new Color(0.95f, 0.95f, 0.96f), 0.6f, null, 0.5f);
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int i, bool ready = true)
    {
        stageIdx = Mathf.Clamp(i, 0, StageCount - 1);
        StopAllCoroutines();
        st = CableKnotStages.All[stageIdx];
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Desk").transform;
        at = (int[])st.start.Clone();
        moves = 0; over = false; won = false; starsWon = 0;
        picked = -1; target = -1;
        recent.Clear();
        showStages = false;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Animate(0f);
    }

    Transform Box(Material m, float x, float y, float w, float h, float z, float depth)
    {
        var q = OiyoArcade.Prim(PrimitiveType.Cube, "Box", m, root).transform;
        q.position = field.W(x, y, z);
        q.localScale = new Vector3(OiyoField.U(w), OiyoField.U(h), depth);
        return q;
    }

    void BuildScene()
    {
        Box(deskMat, FW / 2f, FH / 2f + 20f, FW, FH, 0.3f, 0.2f);
        ringObj = new Transform[Sockets];
        for (int s = 0; s < Sockets; s++)
        {
            ringObj[s] = OiyoField.Quad("Socket", ringMat, root, 30f, 30f);
            ringObj[s].position = field.W(Sock(s).x, Sock(s).y, 0.15f);
        }
        cableObj = new Transform[Edges];
        for (int e = 0; e < Edges; e++) cableObj[e] = OiyoArcade.Prim(PrimitiveType.Cube, "Cable", greenMat, root).transform;
        plugObj = new Transform[st.plugs];
        plugPos = new Vector2[st.plugs];
        for (int p = 0; p < st.plugs; p++)
        {
            plugObj[p] = Box(plugMat[p % plugMat.Length], 0f, 0f, 24f, 24f, -0.2f, 0.4f);
            var pin1 = Box(pinMat, 0f, 0f, 3f, 8f, -0.45f, 0.1f);
            var pin2 = Box(pinMat, 0f, 0f, 3f, 8f, -0.45f, 0.1f);
            pin1.SetParent(plugObj[p], true);
            pin2.SetParent(plugObj[p], true);
            pin1.localPosition = new Vector3(-0.2f, 0f, -0.6f);
            pin2.localPosition = new Vector3(0.2f, 0f, -0.6f);
            plugPos[p] = Sock(at[p]);
        }
        selMark = Box(selMat, 0f, 0f, 32f, 32f, -0.1f, 0.2f);
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("cable-knot", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        Animate(dt);
    }

    void DoMove(int plug, int socket)
    {
        int before = CrossCount(at);
        int from = at[plug];
        if (Move(plug, socket))
        {
            recent.Add(new Vector2Int(plug, from));
            if (recent.Count > 4) recent.RemoveAt(0);
            int after = CrossCount(at);
            synth.Tone(after < before ? 880f : 440f, 0.08f, Wave.Triangle, 0.12f, after < before ? 1175f : 0f, 12f);
            picked = -1; target = -1;
            if (over) End();
        }
        else synth.Tone(180f, 0.08f, Wave.Square, 0.08f, 0f, 14f);
    }

    void Tap(Vector2 f)
    {
        for (int p = 0; p < st.plugs; p++)
            if (Vector2.Distance(Sock(at[p]), f) < 22f) { picked = picked == p ? -1 : p; synth.Tone(523f, 0.04f, Wave.Triangle, 0.08f, 0f, 16f); return; }
        for (int s = 0; s < Sockets; s++)
            if (!Taken(s) && Vector2.Distance(Sock(s), f) < 22f && picked >= 0) { DoMove(picked, s); return; }
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
                    // taps are read once per frame
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (OiyoArcade.OverUi(b.pos) || !field.ToField(b.pos, out Vector2 f)) continue;
                        if (state == GameState.Ready) { state = GameState.Playing; continue; }
                        Tap(f);
                        if (over) break;
                    }
                    if (state == GameState.Ready) { if (confirm || Input.GetKeyDown(KeyCode.Space)) state = GameState.Playing; return; }
                    if (Input.GetKeyDown(KeyCode.RightArrow)) picked = (Mathf.Max(0, picked) + 1) % st.plugs;
                    if (Input.GetKeyDown(KeyCode.LeftArrow)) picked = (Mathf.Max(0, picked) + st.plugs - 1) % st.plugs;
                    if (Input.GetKeyDown(KeyCode.UpArrow) || Input.GetKeyDown(KeyCode.DownArrow))
                    {
                        var empty = new List<int>();
                        for (int s = 0; s < Sockets; s++) if (!Taken(s)) empty.Add(s);
                        int k = empty.IndexOf(target);
                        target = empty[(k + (Input.GetKeyDown(KeyCode.DownArrow) ? 1 : empty.Count - 1) + empty.Count) % empty.Count];
                    }
                    if (confirm && picked >= 0 && target >= 0) DoMove(picked, target);
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
            OiyoArcade.Record(Slug, stageIdx, starsWon, Mathf.Max(0, (st.limit - moves) * 10), StageCount);
            sparkle.Emit(field.W(180f, 300f, -1f), new Color(1f, 0.85f, 0.25f), 40, 5f, 0.1f, 1f);
            StartCoroutine(Arp(new[] { 523f, 659f, 784f, 1047f, 1319f }, 0.09f));
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
        field.Fit(80f, 10f, 0f, 100f, FH);
        for (int p = 0; p < st.plugs; p++)
        {
            plugPos[p] = Vector2.Lerp(plugPos[p], Sock(at[p]), Mathf.Min(1f, dt * 14f));
            plugObj[p].position = field.W(plugPos[p].x, plugPos[p].y, -0.2f);
        }
        for (int e = 0; e < Edges; e++)
        {
            var a = field.W(plugPos[st.edges[e * 2]].x, plugPos[st.edges[e * 2]].y, -0.05f);
            var b = field.W(plugPos[st.edges[e * 2 + 1]].x, plugPos[st.edges[e * 2 + 1]].y, -0.05f);
            var c = cableObj[e];
            c.position = (a + b) / 2f;
            c.rotation = Quaternion.FromToRotation(Vector3.right, b - a);
            c.localScale = new Vector3((b - a).magnitude, OiyoField.U(5f), OiyoField.U(5f));
            c.GetComponent<Renderer>().sharedMaterial = Tangled(e) ? redMat : greenMat;
        }
        for (int s = 0; s < Sockets; s++)
        {
            ringObj[s].gameObject.SetActive(!Taken(s));
            ringObj[s].GetComponent<Renderer>().sharedMaterial = s == target ? ringOn : ringMat;
        }
        selMark.gameObject.SetActive(picked >= 0 && !over);
        if (picked >= 0) selMark.position = field.W(plugPos[picked].x, plugPos[picked].y, -0.1f);
    }

    // ?oiyotest=1 prints the state to the browser console for the automated play check: crossings, moves, and the
    // screen point (px from the top-left) of the next press of a careful solver: the plug to pick, then its new socket.
    bool testLog; float testT;
    Vector2 Scr(Vector2 f) { var sp = cam.WorldToScreenPoint(field.W(f.x, f.y, -0.2f)); return new Vector2(sp.x, Screen.height - sp.y); }
    Vector2Int BestMove()
    {
        int now = CrossCount(at);
        var best = new Vector2Int(-1, -1);
        int bestC = int.MaxValue;
        var fallback = new Vector2Int(-1, -1);
        int fallC = int.MaxValue;
        for (int p = 0; p < st.plugs; p++)
            for (int s = 0; s < Sockets; s++)
            {
                if (Taken(s)) continue;
                int was = at[p];
                at[p] = s;
                int c = CrossCount(at);
                at[p] = was;
                bool tabu = recent.Contains(new Vector2Int(p, s));
                if (!tabu && c < bestC) { bestC = c; best = new Vector2Int(p, s); }
                if (c < fallC) { fallC = c; fallback = new Vector2Int(p, s); }
            }
        return best.x >= 0 ? best : fallback;
    }
    void TestTick(float dt)
    {
        if (!testLog || (testT -= dt) > 0f) return;
        testT = 0.05f;
        string next = "null";
        if (state == GameState.Playing && !over)
        {
            var mv = BestMove();
            if (mv.x >= 0) { var p = Scr(picked == mv.x ? Sock(mv.y) : Sock(at[mv.x])); next = $"[{p.x:F1},{p.y:F1}]"; }
        }
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"moves\":{moves},\"limit\":{st.limit},\"par\":{st.par},\"crossings\":{CrossCount(at)},\"next\":{next},\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.1f, 0.44f, 0.76f, 0.97f);
    static readonly Color Dark = new Color(0.1f, 0.11f, 0.12f, 0.9f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("{0} plugs", CableKnotStages.All[i].plugs);

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(0.9f, 0.95f, 1f), U("Cable Knot"),
                U("Tap a plug, then an empty socket, to move it. Leave no cable crossing another before the moves run out."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        var bar = new Rect(8f, 8f, w - 16f, 64f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 12f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>  " + F("Crossings {0}", CrossCount(at)), 15, new Color(0.9f, 0.95f, 1f));
        OiyoArcade.Text(new Rect(20f, 36f, w - 90f, 24f), F("Moves {0}/{1}", moves, st.limit) + $"   ★★★ <= {st.par}", 14, Color.white);
        if (OiyoArcade.Button(new Rect(w - 60f, 14f, 44f, 44f), "<b>II</b>", OiyoScreens.Slate, 18))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap to start"), U("Tap a plug, then an empty socket to move it!"), 140f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            string detail = won ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : "";
            string body = won ? $"<size=14>{F("Untangled in {0} moves", moves)}</size>" : "";
            int r = OiyoScreens.Result(w, h, Dark, Accent, won, ResultLive, won ? U("All untangled!") : U("Out of moves"), detail, body,
                won && stageIdx < StageCount - 1 ? U("Next stage") : null, won && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
