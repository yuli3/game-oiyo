using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Trio Tray 3D: the web Trio Tray (src/components/games/TrioTray.tsx, src/lib/games/trio-tray.ts) rebuilt in Unity on
// the web's own 360 × 560 px field (OiyoField). Snack tiles lie in layers on a picnic blanket (a tile covers 2 × 2
// half-tiles); tap one nothing rests on and it moves to the seven-slot tray, lining up with its kind; three of a kind
// pop. Seven in the tray ends the picnic. The 30 blankets are the web's own (TrioTrayStages.cs).
public class TrioTrayPlayer : MonoBehaviour
{
    const string Slug = "trio-tray";
    const int StageCount = 30;
    const int TraySize = 7;
    const float Half = 24f, BX = 12f, BY = 36f, TrayY = 470f, Slot = 48f, Layer = 0.35f;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of trio-tray.ts) ----------------
    TrioTrayStages.Level st;
    int n, stageIdx, starsWon, picks, peak;
    bool[] gone;
    readonly List<int> tray = new List<int>();
    bool over, won;

    int TX(int i) => st.tiles[i * 4];
    int TY(int i) => st.tiles[i * 4 + 1];
    int TZ(int i) => st.tiles[i * 4 + 2];
    int Kind(int i) => st.tiles[i * 4 + 3];
    bool Overlaps(int a, int b) => Mathf.Abs(TX(a) - TX(b)) < 2 && Mathf.Abs(TY(a) - TY(b)) < 2;

    bool IsFree(int i)
    {
        if (gone[i]) return false;
        for (int j = 0; j < n; j++) if (j != i && !gone[j] && TZ(j) > TZ(i) && Overlaps(i, j)) return false;
        return true;
    }

    // 1 matched, 2 placed, 3 blocked
    int Pick(int i)
    {
        if (over) return 0;
        if (!IsFree(i)) return 3;
        int kind = Kind(i);
        gone[i] = true;
        picks++;
        int at = tray.LastIndexOf(kind);
        if (at >= 0) tray.Insert(at + 1, kind); else tray.Add(kind);
        peak = Mathf.Max(peak, tray.Count);
        int res = 2;
        int same = 0;
        foreach (int k in tray) if (k == kind) same++;
        if (same >= 3) { tray.RemoveAll(k => k == kind); res = 1; }
        bool all = true;
        foreach (bool g in gone) if (!g) all = false;
        if (all && tray.Count == 0) { over = true; won = true; }
        else if (tray.Count >= TraySize) over = true;
        return res;
    }

    int StarsFor()
    {
        if (!won) return 0;
        if (peak <= st.par) return 3;
        if (peak <= st.par + 1) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    OiyoField field;
    Camera cam;
    Transform root;
    Transform[] tileObj, tileIcon;
    Renderer[] tileFace;
    Transform[] slotIcon;
    Renderer[] slotIconR;
    Renderer[] slotR;
    Material[] snackMat, snackDim;
    Material faceFree, faceCovered, slotMat, slotWarn, cursorMat;
    Transform cursorObj;
    Bursts sparkle;
    Synth synth;
    bool showStages;
    int cursor = -1;

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(360f, 560f, new Color(1f, 0.53f, 0.53f));
        cam = field.Cam;
        OiyoField.Lights(new Color(0.72f, 0.72f, 0.72f), 0.65f, 50f, -25f);
        sparkle = new Bursts(transform, 0.5f);
        synth = new Synth(gameObject);
        snackMat = new Material[12];
        snackDim = new Material[12];
        for (int k = 0; k < 12; k++)
        {
            snackMat[k] = OiyoField.Sprite("TT/snack" + k);
            snackMat[k].renderQueue = 3001;
            snackDim[k] = OiyoArcade.Transparent(OiyoArcade.Art("TT/snack" + k), new Color(1f, 1f, 1f, 0.45f));
            snackDim[k].renderQueue = 3000;
        }
        faceFree = OiyoArcade.Lit(new Color(1f, 0.98f, 0.86f), 0.4f);
        faceCovered = OiyoArcade.Lit(new Color(0.75f, 0.77f, 0.79f), 0.3f);
        slotMat = OiyoArcade.Lit(new Color(0.95f, 0.95f, 0.96f), 0.3f);
        slotWarn = OiyoArcade.Lit(new Color(1f, 0.79f, 0.79f), 0.3f);
        cursorMat = OiyoArcade.Glow(new Color(0.1f, 0.44f, 0.76f));
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int i, bool ready = true)
    {
        stageIdx = Mathf.Clamp(i, 0, StageCount - 1);
        StopAllCoroutines();
        st = TrioTrayStages.All[stageIdx];
        n = st.tiles.Length / 4;
        gone = new bool[n];
        tray.Clear();
        picks = 0; peak = 0; over = false; won = false; starsWon = 0; cursor = -1;
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Blanket").transform;
        showStages = false;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Animate(0f);
    }

    float OX => BX + (14 - st.cols) * Half / 2f;
    Vector2 TileCentre(int i) => new Vector2(OX + TX(i) * Half - TZ(i) * 2f + Half, BY + TY(i) * Half - TZ(i) * 3f + Half);

    void BuildScene()
    {
        // the blanket: red and white checks under everything
        var tex = new Texture2D(15, 19, TextureFormat.RGBA32, false) { filterMode = FilterMode.Point, wrapMode = TextureWrapMode.Clamp };
        var px = new Color32[15 * 19];
        for (int y = 0; y < 19; y++) for (int x = 0; x < 15; x++) px[y * 15 + x] = (x + y) % 2 == 1 ? new Color32(255, 227, 227, 255) : new Color32(255, 135, 135, 255);
        tex.SetPixels32(px); tex.Apply(false);
        var cloth = OiyoField.Quad("Cloth", OiyoArcade.Textured(tex), root, 360f, 456f);
        cloth.position = field.W(180f, 228f, 0.3f);
        tileObj = new Transform[n]; tileIcon = new Transform[n]; tileFace = new Renderer[n];
        var edge = OiyoArcade.Lit(new Color(0.5f, 0.33f, 0.22f), 0.3f);
        for (int i = 0; i < n; i++)
        {
            var c = TileCentre(i);
            float z = -TZ(i) * Layer;
            var body = OiyoArcade.Prim(PrimitiveType.Cube, "Tile", edge, root).transform;
            body.localScale = new Vector3(OiyoField.U(Half * 2f - 2f), OiyoField.U(Half * 2f - 2f), Layer * 0.9f);
            body.position = field.W(c.x + 1f, c.y + 3f, z + 0.05f);
            var face = OiyoArcade.Prim(PrimitiveType.Cube, "Face", faceFree, root);
            face.transform.localScale = new Vector3(OiyoField.U(Half * 2f - 4f), OiyoField.U(Half * 2f - 4f), 0.06f);
            face.transform.position = field.W(c.x, c.y, z - Layer * 0.45f);
            tileFace[i] = face.GetComponent<Renderer>();
            var icon = OiyoField.Quad("Snack", snackMat[Kind(i)], root, 38f, 38f);
            icon.position = field.W(c.x, c.y, z - Layer * 0.45f - 0.04f);
            tileObj[i] = body; tileIcon[i] = icon;
            body.SetParent(face.transform, true);
            icon.SetParent(face.transform, true);
            tileObj[i] = face.transform;
        }
        var trayBody = OiyoArcade.Prim(PrimitiveType.Cube, "Tray", OiyoArcade.Lit(new Color(0.66f, 0.46f, 0.27f), 0.3f), root).transform;
        trayBody.localScale = new Vector3(OiyoField.U(352f), OiyoField.U(76f), 0.3f);
        trayBody.position = field.W(180f, TrayY + 30f, 0.1f);
        slotR = new Renderer[TraySize]; slotIcon = new Transform[TraySize]; slotIconR = new Renderer[TraySize];
        for (int k = 0; k < TraySize; k++)
        {
            var s = OiyoArcade.Prim(PrimitiveType.Cube, "Slot", slotMat, root);
            s.transform.localScale = new Vector3(OiyoField.U(Slot - 4f), OiyoField.U(58f), 0.1f);
            s.transform.position = field.W(12f + k * Slot + (Slot - 4f) / 2f, TrayY + 29f, -0.1f);
            slotR[k] = s.GetComponent<Renderer>();
            slotIcon[k] = OiyoField.Quad("TraySnack", snackMat[0], root, 38f, 38f);
            slotIcon[k].position = field.W(12f + k * Slot + (Slot - 4f) / 2f, TrayY + 29f, -0.2f);
            slotIconR[k] = slotIcon[k].GetComponent<Renderer>();
        }
        cursorObj = OiyoArcade.Prim(PrimitiveType.Cube, "Cursor", cursorMat, root).transform;
        cursorObj.localScale = new Vector3(OiyoField.U(Half * 2f), OiyoField.U(4f), 0.05f);
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("trio-tray", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        Animate(dt);
    }

    void Tap(int i)
    {
        if (state != GameState.Playing || over || i < 0) return;
        var c = TileCentre(i);
        int r = Pick(i);
        if (r == 3) { synth.Tone(180f, 0.08f, Wave.Square, 0.06f); return; }
        if (r == 1)
        {
            sparkle.Emit(field.W(180f, TrayY + 28f, -0.6f), new Color(1f, 0.83f, 0.23f), 20, 4f, 0.09f, 0.5f);
            synth.Tone(784f, 0.15f, Wave.Triangle, 0.14f, 1175f, 8f);
        }
        else
        {
            sparkle.Emit(field.W(c.x, c.y, -1.2f), new Color(1f, 0.98f, 0.86f), 6, 2f, 0.06f, 0.3f);
            synth.Tone(523f, 0.06f, Wave.Triangle, 0.1f);
        }
        if (over) End();
    }

    int TileAt(Vector2 f)
    {
        int best = -1;
        for (int i = 0; i < n; i++)
        {
            if (gone[i]) continue;
            var c = TileCentre(i);
            if (Mathf.Abs(f.x - c.x) < Half && Mathf.Abs(f.y - c.y) < Half && (best < 0 || TZ(i) > TZ(best))) best = i;
        }
        return best;
    }

    List<int> FreeSorted()
    {
        var free = new List<int>();
        for (int i = 0; i < n; i++) if (IsFree(i)) free.Add(i);
        free.Sort((a, b) => TY(a) != TY(b) ? TY(a).CompareTo(TY(b)) : TX(a).CompareTo(TX(b)));
        return free;
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
                    // input is read once per frame: a tap takes the topmost tile under the finger
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (state == GameState.Ready) { state = GameState.Playing; continue; }
                        if (OiyoArcade.OverUi(b.pos) || !field.ToField(b.pos, out Vector2 f)) continue;
                        Tap(TileAt(f));
                    }
                    int step = Input.GetKeyDown(KeyCode.RightArrow) || Input.GetKeyDown(KeyCode.DownArrow) ? 1 : Input.GetKeyDown(KeyCode.LeftArrow) || Input.GetKeyDown(KeyCode.UpArrow) ? -1 : 0;
                    if (step != 0)
                    {
                        if (state == GameState.Ready) state = GameState.Playing;
                        var free = FreeSorted();
                        if (free.Count > 0) { int at = free.IndexOf(cursor); cursor = free[((at < 0 ? (step > 0 ? -1 : 0) : at) + step + free.Count) % free.Count]; }
                    }
                    if (Input.GetKeyDown(KeyCode.Space) || confirm)
                    {
                        if (state == GameState.Ready) state = GameState.Playing;
                        else if (cursor >= 0 && IsFree(cursor)) Tap(cursor);
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
            OiyoArcade.Record(Slug, stageIdx, starsWon, Mathf.Max(0, (TraySize - peak) * 100), StageCount);
            sparkle.Emit(field.W(180f, 240f, -1.5f), new Color(1f, 0.85f, 0.25f), 40, 5f, 0.1f, 1f);
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
        field.Fit(70f, 10f, 12f, 30f, 540f);
        for (int i = 0; i < n; i++)
        {
            tileObj[i].gameObject.SetActive(!gone[i]);
            if (gone[i]) continue;
            bool free = IsFree(i);
            tileFace[i].sharedMaterial = free ? faceFree : faceCovered;
            tileIcon[i].GetComponent<Renderer>().sharedMaterial = free ? snackMat[Kind(i)] : snackDim[Kind(i)];
        }
        for (int k = 0; k < TraySize; k++)
        {
            slotR[k].sharedMaterial = k == TraySize - 1 && tray.Count >= TraySize - 1 ? slotWarn : slotMat;
            slotIcon[k].gameObject.SetActive(k < tray.Count);
            if (k < tray.Count) slotIconR[k].sharedMaterial = snackMat[tray[k]];
        }
        bool showCursor = cursor >= 0 && !gone[cursor];
        cursorObj.gameObject.SetActive(showCursor);
        if (showCursor) { var c = TileCentre(cursor); cursorObj.position = field.W(c.x, c.y + Half + 2f, -TZ(cursor) * Layer - 0.3f); }
    }

    // ?oiyotest=1 prints the state to the browser console for the automated play check, with the screen point (px from
    // the top-left) of the tile the web's careful player takes next (its picks are exported with the stage).
    bool testLog; float testT;
    Vector2 Scr(Vector2 f, float z) { var sp = cam.WorldToScreenPoint(field.W(f.x, f.y, z)); return new Vector2(sp.x, Screen.height - sp.y); }
    void TestTick(float dt)
    {
        if (!testLog) return;
        if ((testT -= dt) > 0f) return;
        testT = 0.05f;
        string next = "null";
        if (state == GameState.Playing && !over && picks < st.plan.Length)
        {
            int i = st.plan[picks];
            var p = Scr(TileCentre(i), -TZ(i) * Layer - Layer * 0.5f);
            next = $"[{p.x:F1},{p.y:F1}]";
        }
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"picks\":{picks},\"tray\":{tray.Count},\"peak\":{peak},\"par\":{st.par},\"next\":{next},\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.88f, 0.19f, 0.19f, 0.97f);
    static readonly Color Dark = new Color(0.1f, 0.11f, 0.12f, 0.9f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("{0} snacks", TrioTrayStages.All[i].tiles.Length / 4);

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(1f, 0.9f, 0.9f), U("Trio Tray"),
                U("Tap snacks with nothing on them to move them to the seven-slot tray. Three of a kind pop. Clear the blanket before the tray fills."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        int left = 0;
        foreach (bool g in gone) if (!g) left++;
        var bar = new Rect(8f, 8f, w - 16f, 44f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 18f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>  " + F("{0} snacks left", left) + "   " + F("Tray {0}/{1}", tray.Count, TraySize), 15, new Color(1f, 0.9f, 0.9f));
        if (OiyoArcade.Button(new Rect(w - 56f, 12f, 40f, 36f), "<b>II</b>", OiyoScreens.Slate, 16))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap to start"), U("Tap a snack on top to put it on the tray!"), 200f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            string detail = won ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : "";
            string body = $"<size=14>{F("Tray peaked at {0}", peak)}</size>";
            int r = OiyoScreens.Result(w, h, Dark, Accent, won, ResultLive, won ? U("The blanket is clear!") : U("The tray is full"), detail, body,
                won && stageIdx < StageCount - 1 ? U("Next stage") : null, won && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
