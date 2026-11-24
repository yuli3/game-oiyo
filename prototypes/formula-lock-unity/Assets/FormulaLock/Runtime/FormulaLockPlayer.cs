using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Formula Lock 3D: the web Formula Lock (src/components/games/FormulaLock.tsx, src/lib/games/formula-lock.ts) rebuilt
// in Unity on the web's own 360 × 560 px field (OiyoField). A safe opens to one true equation; type any true equation
// of the same length on the keypad and each square lights green (right place), yellow (elsewhere) or grey (not
// there, repeats counted). × and ÷ come before + and −, results are whole and never negative, no leading zeros. Six
// tries. The 30 safes are the web's own (FormulaLockStages.cs).
public class FormulaLockPlayer : MonoBehaviour
{
    const string Slug = "formula-lock";
    const int StageCount = 30;
    const int Tries = 6;
    const float BoardTop = 64f, KeyTop = 430f;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of formula-lock.ts) ----------------
    FormulaLockStages.Level st;
    int stageIdx, starsWon;
    readonly List<string> guesses = new List<string>();
    readonly List<int[]> marks = new List<int[]>();
    string typed = "";
    bool over, won;

    static bool IsOp(char c) => c == '+' || c == '-' || c == '*' || c == '/';

    /// <summary>The left side's value with × ÷ first; -1 if it isn't whole and non-negative all the way.</summary>
    static long Evaluate(string expr)
    {
        var toks = new List<string>();
        int i = 0;
        while (i < expr.Length)
        {
            if (char.IsDigit(expr[i])) { int j = i; while (j < expr.Length && char.IsDigit(expr[j])) j++; toks.Add(expr.Substring(i, j - i)); i = j; }
            else if (IsOp(expr[i])) { toks.Add(expr[i].ToString()); i++; }
            else return -1;
        }
        if (toks.Count % 2 == 0) return -1;
        for (int k = 0; k < toks.Count; k++)
        {
            bool num = char.IsDigit(toks[k][0]);
            if (num != (k % 2 == 0)) return -1;
            if (num && toks[k].Length > 1 && toks[k][0] == '0') return -1;
            if (num && toks[k].Length > 9) return -1;
        }
        var terms = new List<long>();
        var ops = new List<char>();
        long cur = long.Parse(toks[0]);
        for (int k = 1; k < toks.Count; k += 2)
        {
            char op = toks[k][0];
            long n = long.Parse(toks[k + 1]);
            if (op == '*') cur *= n;
            else if (op == '/') { if (n == 0 || cur % n != 0) return -1; cur /= n; }
            else { terms.Add(cur); ops.Add(op); cur = n; }
        }
        terms.Add(cur);
        long v = terms[0];
        for (int k = 0; k < ops.Count; k++)
        {
            v = ops[k] == '+' ? v + terms[k + 1] : v - terms[k + 1];
            if (v < 0) return -1;
        }
        return v;
    }

    static bool IsTrue(string eq)
    {
        var parts = eq.Split('=');
        if (parts.Length != 2 || parts[0].Length == 0 || parts[1].Length == 0) return false;
        foreach (char c in parts[1]) if (!char.IsDigit(c)) return false;
        if (parts[1].Length > 1 && parts[1][0] == '0') return false;
        if (parts[1].Length > 9) return false;
        bool hasOp = false;
        foreach (char c in parts[0]) if (IsOp(c)) hasOp = true;
        if (!hasOp) return false;
        long v = Evaluate(parts[0]);
        return v >= 0 && v == long.Parse(parts[1]);
    }

    static int[] Score(string guess, string answer)
    {
        var m = new int[guess.Length];
        var left = new Dictionary<char, int>();
        for (int i = 0; i < answer.Length; i++)
        {
            if (guess[i] == answer[i]) m[i] = 2;
            else left[answer[i]] = (left.TryGetValue(answer[i], out int n) ? n : 0) + 1;
        }
        for (int i = 0; i < guess.Length; i++)
        {
            if (m[i] == 2) continue;
            if (left.TryGetValue(guess[i], out int n) && n > 0) { m[i] = 1; left[guess[i]] = n - 1; }
        }
        return m;
    }

    // returns 1 opened, 2 marked, 3 not true, 4 too short
    int Enter()
    {
        if (over) return 0;
        if (typed.Length < st.length) return 4;
        if (!IsTrue(typed)) return 3;
        var m = Score(typed, st.answer);
        guesses.Add(typed);
        marks.Add(m);
        typed = "";
        bool all = true;
        foreach (int x in m) if (x != 2) all = false;
        if (all) { over = true; won = true; return 1; }
        if (guesses.Count >= Tries) over = true;
        return 2;
    }

    int StarsFor()
    {
        if (!won) return 0;
        if (guesses.Count <= st.par) return 3;
        if (guesses.Count <= st.par + 1) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    static readonly string[][] Keys =
    {
        new[] { "1", "2", "3", "4", "5", "6", "7", "8", "9", "0" },
        new[] { "+", "-", "*", "/", "=", "del", "enter" },
    };
    static readonly float[] Row2W = { 40f, 40f, 40f, 40f, 40f, 56f, 70f };
    static Rect KeyBox(int r, int k)
    {
        if (r == 0) return new Rect(6f + k * 34.8f, KeyTop, 32f, 50f);
        float x = 6f;
        for (int j = 0; j < k; j++) x += Row2W[j] + 4f;
        return new Rect(x, KeyTop + 58f, Row2W[k], 50f);
    }
    static string Show(string k) => k == "*" ? "×" : k == "/" ? "÷" : k == "-" ? "−" : k == "del" ? "←" : k == "enter" ? "OK" : k;
    static string Show(char c) => Show(c.ToString());

    float Size => Mathf.Min(40f, Mathf.Floor((360f - 40f) / st.length) - 4f);
    float X0 => (360f - st.length * (Size + 4f)) / 2f;
    Rect Cell(int row, int k) => new Rect(X0 + k * (Size + 4f), BoardTop + row * (Size + 8f), Size, Size);

    OiyoField field;
    Camera cam;
    Transform root;
    Renderer[,] cells;
    Renderer[][] keyObj;
    Material[] markMat; // grey, yellow, green
    Material emptyMat, typingMat, keyMat, keyDark, enterMat, delMat, doorMat, rimMat;
    Bursts sparkle;
    Synth synth;
    bool showStages;
    float shake, flashT;
    string flash;

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(360f, 560f, new Color(0.2f, 0.23f, 0.25f));
        cam = field.Cam;
        OiyoField.Lights(new Color(0.7f, 0.7f, 0.72f), 0.7f, 45f, -25f);
        sparkle = new Bursts(transform, 0.5f);
        synth = new Synth(gameObject);
        markMat = new[] { OiyoArcade.Lit(new Color(0.53f, 0.56f, 0.59f), 0.4f), OiyoArcade.Lit(new Color(0.96f, 0.62f, 0f), 0.4f), OiyoArcade.Lit(new Color(0.17f, 0.54f, 0.24f), 0.4f) };
        emptyMat = OiyoArcade.Lit(new Color(0.13f, 0.15f, 0.16f), 0.3f);
        typingMat = OiyoArcade.Lit(new Color(0.25f, 0.28f, 0.31f), 0.3f);
        keyMat = OiyoArcade.Lit(new Color(0.53f, 0.56f, 0.59f), 0.3f);
        keyDark = OiyoArcade.Lit(new Color(0.2f, 0.23f, 0.25f), 0.3f);
        enterMat = OiyoArcade.Lit(new Color(0.1f, 0.44f, 0.76f), 0.4f);
        delMat = OiyoArcade.Lit(new Color(0.29f, 0.31f, 0.34f), 0.3f);
        doorMat = OiyoArcade.Lit(new Color(0.29f, 0.31f, 0.34f), 0.6f, null, 0.5f);
        rimMat = OiyoArcade.Lit(new Color(0.68f, 0.71f, 0.74f), 0.8f, null, 0.7f);
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int i, bool ready = true)
    {
        stageIdx = Mathf.Clamp(i, 0, StageCount - 1);
        StopAllCoroutines();
        st = FormulaLockStages.All[stageIdx];
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Safe").transform;
        guesses.Clear(); marks.Clear(); typed = "";
        over = false; won = false; starsWon = 0; shake = 0f; flashT = 0f;
        showStages = false;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Animate(0f);
    }

    Renderer Box(string name, Material m, Rect r, float depth, float z)
    {
        var o = OiyoArcade.Prim(PrimitiveType.Cube, name, m, root).GetComponent<Renderer>();
        o.transform.localScale = new Vector3(OiyoField.U(r.width), OiyoField.U(r.height), depth);
        o.transform.position = field.W(r.center.x, r.center.y, z);
        return o;
    }

    void BuildScene()
    {
        Box("Door", doorMat, new Rect(10f, 40f, 340f, 370f), 0.6f, 0.4f);
        Box("Rim", rimMat, new Rect(14f, 44f, 332f, 6f), 0.2f, 0.05f);
        Box("Panel", OiyoArcade.Lit(new Color(0.16f, 0.18f, 0.2f), 0.3f), new Rect(2f, KeyTop - 6f, 356f, 122f), 0.3f, 0.3f);
        cells = new Renderer[Tries, st.length];
        for (int r = 0; r < Tries; r++)
            for (int k = 0; k < st.length; k++) cells[r, k] = Box("Cell", emptyMat, Cell(r, k), 0.25f, 0f);
        keyObj = new Renderer[2][];
        for (int r = 0; r < 2; r++)
        {
            keyObj[r] = new Renderer[Keys[r].Length];
            for (int k = 0; k < Keys[r].Length; k++) keyObj[r][k] = Box("Key", keyMat, KeyBox(r, k), 0.3f, 0f);
        }
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("formula-lock", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        shake = Mathf.Max(0f, shake - dt);
        if (flashT > 0f) flashT -= dt;
        Animate(dt);
    }

    void Press(string k)
    {
        if (state != GameState.Playing || over) return;
        if (k == "del") { if (typed.Length > 0) typed = typed.Substring(0, typed.Length - 1); synth.Tone(440f, 0.05f, Wave.Square, 0.06f); return; }
        if (k == "enter")
        {
            int row = guesses.Count;
            int r = Enter();
            if (r == 4 || r == 3)
            {
                flash = r == 4 ? U("Fill every square") : U("That equation isn't true");
                flashT = 1.2f; shake = 0.3f;
                synth.Tone(160f, 0.18f, Wave.Square, 0.12f, 110f, 8f);
                return;
            }
            for (int k2 = 0; k2 < st.length; k2++)
            {
                var c = Cell(row, k2);
                if (marks[row][k2] == 2) sparkle.Emit(field.W(c.center.x, c.center.y, -0.4f), new Color(0.4f, 0.9f, 0.5f), 4, 2f, 0.06f, 0.4f);
            }
            if (r == 1) { synth.Tone(784f, 0.15f, Wave.Triangle, 0.14f, 1175f, 8f); End(); }
            else { synth.Tone(523f, 0.1f, Wave.Triangle, 0.1f); if (over) End(); }
            return;
        }
        if (typed.Length < st.length) { typed += k; synth.Tone(660f, 0.04f, Wave.Square, 0.06f); }
    }

    void ReadInput()
    {
        bool confirm = Input.GetKeyDown(KeyCode.Return) || Input.GetKeyDown(KeyCode.KeypadEnter);
        switch (state)
        {
            case GameState.Ready:
            case GameState.Playing:
                {
                    if (state == GameState.Playing && Input.GetKeyDown(KeyCode.Escape)) { state = GameState.Paused; return; }
                    // input is read once per frame: a tap on a key presses it
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (state == GameState.Ready) { state = GameState.Playing; continue; }
                        if (OiyoArcade.OverUi(b.pos) || !field.ToField(b.pos, out Vector2 f)) continue;
                        for (int r = 0; r < 2; r++)
                            for (int k = 0; k < Keys[r].Length; k++)
                                if (KeyBox(r, k).Contains(f)) Press(Keys[r][k]);
                    }
                    if (state == GameState.Ready) { if (confirm || Input.anyKeyDown) state = GameState.Playing; return; }
                    foreach (char c in Input.inputString)
                    {
                        if (char.IsDigit(c) || IsOp(c) || c == '=') Press(c.ToString());
                        else if (c == 'x' || c == 'X') Press("*");
                        else if (c == '\b') Press("del");
                        else if (c == '\n' || c == '\r') Press("enter");
                    }
                    return;
                }
            case GameState.Paused:
                if (Input.GetKeyDown(KeyCode.Escape)) state = GameState.Playing;
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
            OiyoArcade.Record(Slug, stageIdx, starsWon, (Tries - guesses.Count + 1) * 100, StageCount);
            sparkle.Emit(field.W(180f, 200f, -1f), new Color(1f, 0.85f, 0.25f), 40, 5f, 0.1f, 1f);
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

    int Best(string key)
    {
        int b = -1;
        for (int r = 0; r < guesses.Count; r++)
            for (int k = 0; k < guesses[r].Length; k++)
                if (guesses[r][k].ToString() == key) b = Mathf.Max(b, marks[r][k]);
        return b;
    }

    void Animate(float dt)
    {
        if (root == null) return;
        field.Fit(70f, 10f, 0f, 36f, 540f);
        float jig = shake > 0f ? Mathf.Sin(Time.time * 50f) * 4f : 0f;
        for (int r = 0; r < Tries; r++)
            for (int k = 0; k < st.length; k++)
            {
                var c = Cell(r, k);
                var o = cells[r, k];
                o.sharedMaterial = r < guesses.Count ? markMat[marks[r][k]] : r == guesses.Count && !over ? typingMat : emptyMat;
                o.transform.position = field.W(c.center.x + (r == guesses.Count ? jig : 0f), c.center.y, 0f);
            }
        for (int r = 0; r < 2; r++)
            for (int k = 0; k < Keys[r].Length; k++)
            {
                string key = Keys[r][k];
                int m = key.Length == 1 ? Best(key) : -1;
                keyObj[r][k].sharedMaterial = key == "enter" ? enterMat : key == "del" ? delMat : m < 0 ? keyMat : m == 0 ? keyDark : markMat[m];
            }
    }

    // ?oiyotest=1 prints the state to the browser console for the automated play check, with the screen point (px
    // from the top-left) of the next key a careful cracker presses: the web's careful solver's guesses for this safe.
    bool testLog; float testT;
    Vector2 Scr(float fx, float fy) { var sp = cam.WorldToScreenPoint(field.W(fx, fy, 0f)); return new Vector2(sp.x, Screen.height - sp.y); }
    string NextKey()
    {
        if (over || guesses.Count >= st.plan.Length) return null;
        string want = st.plan[guesses.Count];
        if (!want.StartsWith(typed)) return "del";
        if (typed.Length == want.Length) return "enter";
        return want[typed.Length].ToString();
    }
    void TestTick(float dt)
    {
        if (!testLog) return;
        if ((testT -= dt) > 0f) return;
        testT = 0.05f;
        string next = "null";
        string key = state == GameState.Playing ? NextKey() : null;
        if (key != null)
            for (int r = 0; r < 2; r++)
                for (int k = 0; k < Keys[r].Length; k++)
                    if (Keys[r][k] == key) { var p = Scr(KeyBox(r, k).center.x, KeyBox(r, k).center.y); next = $"[{p.x:F1},{p.y:F1}]"; }
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"tries\":{guesses.Count},\"par\":{st.par},\"typed\":\"{typed}\",\"next\":{next},\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.1f, 0.44f, 0.76f, 0.97f);
    static readonly Color Dark = new Color(0.1f, 0.11f, 0.12f, 0.9f);

    Vector2 Gui(Vector2 f, float z = -0.2f) => OiyoArcade.ToGui(cam.WorldToScreenPoint(field.W(f.x, f.y, z)));
    float GuiPerField => field.ScreenPerField() / OiyoArcade.ComputeScale();
    void Label(Rect r, string s, float size, Color c, float z = -0.2f)
    {
        var p = Gui(new Vector2(r.x, r.y), z); var q = Gui(new Vector2(r.xMax, r.yMax), z);
        OiyoArcade.Text(new Rect(p.x, p.y, q.x - p.x, q.y - p.y), s, Mathf.Max(9, Mathf.RoundToInt(size * GuiPerField)), c, TextAnchor.MiddleCenter, true);
    }

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("{0}-symbol equation", FormulaLockStages.All[i].length);

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(0.85f, 0.92f, 1f), U("Formula Lock"),
                U("Type true equations to crack the safe. Green is the right symbol in the right place, yellow is elsewhere, grey isn't there. Six tries."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        // the symbols on the squares and keys
        float jig = shake > 0f ? Mathf.Sin(Time.time * 50f) * 4f : 0f;
        for (int r = 0; r < Tries; r++)
            for (int k = 0; k < st.length; k++)
            {
                string s = r < guesses.Count ? Show(guesses[r][k]) : r == guesses.Count && k < typed.Length ? Show(typed[k]) : null;
                if (s == null) continue;
                var c = Cell(r, k);
                Label(new Rect(c.x + (r == guesses.Count ? jig : 0f), c.y, c.width, c.height), s, Size * 0.55f, Color.white);
            }
        for (int r = 0; r < 2; r++)
            for (int k = 0; k < Keys[r].Length; k++) Label(KeyBox(r, k), Show(Keys[r][k]), 18f, Color.white);

        var bar = new Rect(8f, 8f, w - 16f, 44f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 18f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>  " + F("{0}-symbol equation", st.length) + "   " + F("Try {0}/{1}", Mathf.Min(guesses.Count + 1, Tries), Tries), 15, new Color(0.85f, 0.92f, 1f));
        if (OiyoArcade.Button(new Rect(w - 56f, 12f, 40f, 36f), "<b>II</b>", OiyoScreens.Slate, 16))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (flashT > 0f && flash != null)
        {
            var p = Gui(new Vector2(180f, 22f));
            OiyoArcade.Panel(new Rect(p.x - 140f, p.y + 36f, 280f, 30f), new Color(1f, 1f, 1f, 0.95f));
            OiyoArcade.Text(new Rect(p.x - 140f, p.y + 36f, 280f, 30f), flash, 15, new Color(0.79f, 0.16f, 0.16f), TextAnchor.MiddleCenter, true);
        }
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap to start"), U("Type a true equation on the keypad and press OK!"), 300f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            string detail = won ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : "";
            string ans = "";
            foreach (char ch in st.answer) ans += Show(ch);
            string body = $"<size=14>{(won ? F("Opened in {0} tries", guesses.Count) : F("Answer: {0}", ans))}</size>";
            int r = OiyoScreens.Result(w, h, Dark, Accent, won, ResultLive, won ? U("The safe is open!") : U("The safe stays shut"), detail, body,
                won && stageIdx < StageCount - 1 ? U("Next stage") : null, won && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
