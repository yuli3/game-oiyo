using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Snowball Roll 3D: the web Snowball Roll (src/components/games/SnowRoll.tsx, src/lib/games/snow-roll.ts)
// rebuilt in Unity. The rules are the web's, in its own 360 x 560 px yard of 12 px snow cells: the ball
// chases the finger (speed (finger - ball) x 4, at most 170 (7 / r)^0.35 px/s), picks up the snow under
// its contact patch (radius = 7 x cbrt(volume)), loses snow in mud, bounces off rocks, fences and the
// yard's edge, and the body must reach its size on the snowman spot; from stage 11 the head must stay
// inside its size window and be pushed onto the body. The 30 yards are the web's own (SnowRollStages.cs;
// snow depth stored to 1/255). Keyboard: arrow keys roll the ball.
public class SnowRollPlayer : MonoBehaviour
{
    const string Slug = "snow-roll";
    const int StageCount = 30;
    const float FW = 360f, FH = 560f, Cell = 12f, R0 = 7f, Gain = 0.3f, SpotR = 22f;
    const int Cols = 30, Rows = 47;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of snow-roll.ts) ----------------
    SnowRollStages.Level level;
    int stageIdx;
    readonly float[] snow = new float[Cols * Rows];
    float bx, by, bvx, bvy, vol, time, bodyR;
    int phase; // 0 body, 1 head, 2 done
    bool fingerOn; Vector2 finger;
    bool over, won, big;
    int starsWon;
    bool HasHead => level.head != null && level.head.Length == 4;

    static float RadiusOf(float v) => R0 * Mathf.Pow(v, 1f / 3f);
    static float MaxSpeed(float r) => 170f * Mathf.Pow(R0 / r, 0.35f);
    float BallR => RadiusOf(vol);

    void NewRun()
    {
        for (int i = 0; i < snow.Length; i++) snow[i] = System.Convert.ToInt32(level.snow.Substring(i * 2, 2), 16) / 255f;
        bx = level.sx; by = level.sy; bvx = bvy = 0f; vol = 1f; time = 0f; bodyR = 0f; phase = 0;
        fingerOn = false; over = false; won = false; big = false;
    }

    float SnowAt(float x, float y)
    {
        int c = Mathf.FloorToInt(x / Cell), r = Mathf.FloorToInt(y / Cell);
        if (c < 0 || r < 0 || c >= Cols || r >= Rows) return 0f;
        return snow[r * Cols + c];
    }

    bool Collide(float r)
    {
        bool hit = false;
        if (bx < r) { bx = r; bvx = Mathf.Abs(bvx) * 0.3f; hit = true; }
        if (bx > FW - r) { bx = FW - r; bvx = -Mathf.Abs(bvx) * 0.3f; hit = true; }
        if (by < r) { by = r; bvy = Mathf.Abs(bvy) * 0.3f; hit = true; }
        if (by > FH - r) { by = FH - r; bvy = -Mathf.Abs(bvy) * 0.3f; hit = true; }
        for (int i = 0; i + 2 < level.rocks.Length; i += 3)
        {
            float kx = level.rocks[i], ky = level.rocks[i + 1], kr = level.rocks[i + 2];
            float dx = bx - kx, dy = by - ky, d = Mathf.Sqrt(dx * dx + dy * dy);
            if (d < kr + r && d > 0f)
            {
                float nx = dx / d, ny = dy / d;
                bx = kx + nx * (kr + r); by = ky + ny * (kr + r);
                float dot = bvx * nx + bvy * ny;
                if (dot < 0f) { bvx -= 1.3f * dot * nx; bvy -= 1.3f * dot * ny; }
                hit = true;
            }
        }
        for (int i = 0; i + 3 < level.fences.Length; i += 4)
        {
            float fx = level.fences[i], fy = level.fences[i + 1], fw = level.fences[i + 2], fh = level.fences[i + 3];
            float cx = Mathf.Max(fx, Mathf.Min(fx + fw, bx)), cy = Mathf.Max(fy, Mathf.Min(fy + fh, by));
            float dx = bx - cx, dy = by - cy, d = Mathf.Sqrt(dx * dx + dy * dy);
            if (d < r)
            {
                float nx = d > 0f ? dx / d : 0f, ny = d > 0f ? dy / d : -1f;
                bx = cx + nx * r; by = cy + ny * r;
                float dot = bvx * nx + bvy * ny;
                if (dot < 0f) { bvx -= 1.3f * dot * nx; bvy -= 1.3f * dot * ny; }
                hit = true;
            }
        }
        return hit;
    }

    float grewThisFrame; bool mudThisFrame, bumpThisFrame;
    void Step(float dt)
    {
        grewThisFrame = 0f; mudThisFrame = false; bumpThisFrame = false;
        if (over) return;
        time += dt;
        int n = Mathf.Max(1, Mathf.CeilToInt(dt / (1f / 120f)));
        float h = dt / n;
        // the finger is read once per frame; the ball chases it over the substeps
        bool f = fingerOn; Vector2 fp = finger;
        for (int k = 0; k < n; k++)
        {
            float r = RadiusOf(vol);
            float vmax = MaxSpeed(r);
            if (f)
            {
                float wx = (fp.x - bx) * 4f, wy = (fp.y - by) * 4f;
                float wl = Mathf.Sqrt(wx * wx + wy * wy);
                if (wl > vmax) { wx *= vmax / wl; wy *= vmax / wl; }
                float a = Mathf.Min(1f, h * 6f);
                bvx += (wx - bvx) * a; bvy += (wy - bvy) * a;
            }
            else { float damp = Mathf.Exp(-2.5f * h); bvx *= damp; bvy *= damp; }
            float ox = bx, oy = by;
            bx += bvx * h; by += bvy * h;
            if (Collide(r)) bumpThisFrame = true;
            float m = Mathf.Sqrt((bx - ox) * (bx - ox) + (by - oy) * (by - oy));
            if (m <= 0f) continue;
            float c = Mathf.Max(5f, r * 0.55f);
            int c0 = Mathf.Max(0, Mathf.FloorToInt((bx - c) / Cell)), c1 = Mathf.Min(Cols - 1, Mathf.FloorToInt((bx + c) / Cell));
            int r0 = Mathf.Max(0, Mathf.FloorToInt((by - c) / Cell)), r1 = Mathf.Min(Rows - 1, Mathf.FloorToInt((by + c) / Cell));
            float got = 0f;
            for (int rr = r0; rr <= r1; rr++)
                for (int cc = c0; cc <= c1; cc++)
                {
                    float px = cc * Cell + Cell / 2f, py = rr * Cell + Cell / 2f;
                    if (Mathf.Sqrt((px - bx) * (px - bx) + (py - by) * (py - by)) > c + Cell * 0.35f) continue;
                    int i = rr * Cols + cc;
                    float take = Mathf.Min(snow[i], m / Cell * 0.6f);
                    if (take <= 0f) continue;
                    snow[i] -= take; got += take; snowDirty = true;
                }
            vol += got * Gain;
            grewThisFrame += got * Gain;
            for (int i = 0; i + 2 < level.mud.Length; i += 3)
                if (Mathf.Sqrt((level.mud[i] - bx) * (level.mud[i] - bx) + (level.mud[i + 1] - by) * (level.mud[i + 1] - by)) < level.mud[i + 2])
                {
                    vol = Mathf.Max(1f, vol - m * 0.015f * Mathf.Sqrt(vol));
                    mudThisFrame = true;
                }
        }
        float rad = RadiusOf(vol);
        float spd = Mathf.Sqrt(bvx * bvx + bvy * bvy);
        float toSpot = Mathf.Sqrt((bx - level.spotX) * (bx - level.spotX) + (by - level.spotY) * (by - level.spotY));
        if (phase == 0)
        {
            if (rad >= level.body && toSpot < SpotR && spd < 90f)
            {
                bodyR = rad;
                OnParked();
                if (HasHead) { phase = 1; bx = level.head[0]; by = level.head[1]; bvx = bvy = 0f; vol = 1f; }
                else { phase = 2; over = true; won = true; }
            }
        }
        else if (phase == 1)
        {
            if (rad > level.head[3]) { over = true; big = true; }
            else if (rad >= level.head[2] && toSpot < bodyR * 0.6f) { phase = 2; over = true; won = true; OnParked(); }
        }
        if (!over && time >= level.timeLimit) over = true;
    }

    int StarsFor()
    {
        if (!won) return 0;
        if (time <= level.par * 1.25f + 3f) return 3;
        if (time <= level.par * 1.6f + 6f) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    OiyoField field;
    Transform root, ball, kid, bodyT, headT, faceT, scarfT, ring;
    Texture2D snowTex; Color32[] snowPx; bool snowDirty;
    Material packedMat, groundMat, mudMat, ringMat, plankMat, stoneMat, kidMat, faceMat, snowMat, scarfMat;
    Bursts puffs;
    Synth synth;
    bool showStages;
    const float Tilt = 30f;

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(FW, FH, new Color(0.73f, 0.84f, 0.94f));
        OiyoField.Lights(new Color(0.62f, 0.66f, 0.72f), 0.85f, 45f, -25f);
        puffs = new Bursts(transform, 0.6f);
        synth = new Synth(gameObject);
        packedMat = OiyoArcade.Lit(Color.white, 0.25f, OiyoArcade.Art("SR/packed", true));
        groundMat = OiyoArcade.Lit(Color.white, 0.05f, OiyoArcade.Art("SR/ground", true));
        mudMat = OiyoField.Sprite("SR/mud");
        ringMat = OiyoField.Sprite("SR/ring");
        plankMat = OiyoArcade.Lit(Color.white, 0.2f, OiyoArcade.Art("SR/plank", true));
        stoneMat = OiyoArcade.Lit(Color.white, 0.2f, OiyoArcade.Art("SR/stone", true));
        kidMat = OiyoField.Sprite("SR/kid");
        faceMat = OiyoField.Sprite("SR/face");
        scarfMat = OiyoArcade.Lit(new Color(0.88f, 0.19f, 0.19f), 0.2f);
        snowTex = new Texture2D(Cols, Rows, TextureFormat.RGBA32, false) { wrapMode = TextureWrapMode.Clamp, filterMode = FilterMode.Bilinear };
        snowPx = new Color32[Cols * Rows];
        snowMat = OiyoArcade.Transparent(snowTex, Color.white);
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int idx, bool ready = true)
    {
        stageIdx = Mathf.Clamp(idx, 0, StageCount - 1);
        StopAllCoroutines();
        level = SnowRollStages.All[stageIdx];
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Yard").transform;
        NewRun();
        snowDirty = true;
        showStages = false;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Fit();
        Animate(0f);
    }

    Quaternion Up => Quaternion.Euler(-Tilt, 0f, 0f);

    void Stand(Transform t, float x, float y, float hPx, float lift)
    {
        t.rotation = Up;
        t.position = field.W(x, y, 0f) + Up * new Vector3(0f, OiyoField.U(hPx * 0.5f + lift), 0f) + new Vector3(0f, 0f, -0.03f);
    }

    void BuildScene()
    {
        var ground = OiyoArcade.Prim(PrimitiveType.Quad, "Ground", groundMat, root);
        ground.transform.position = field.W(FW * 0.5f, FH * 0.5f, 0.02f);
        ground.transform.localScale = new Vector3(OiyoField.U(FW * 3f), OiyoField.U(FH * 1.8f), 1f);
        groundMat.mainTextureScale = new Vector2(6f, 5f);
        var sn = OiyoArcade.Prim(PrimitiveType.Quad, "Snow", snowMat, root);
        sn.transform.position = field.W(FW * 0.5f, FH * 0.5f, 0.01f);
        sn.transform.localScale = new Vector3(OiyoField.U(FW), OiyoField.U(FH), 1f);
        // a low snowy wall around the yard
        foreach (var e in new[] { new Vector4(FW * 0.5f, -6f, FW + 24f, 12f), new Vector4(FW * 0.5f, FH + 6f, FW + 24f, 12f), new Vector4(-6f, FH * 0.5f, 12f, FH), new Vector4(FW + 6f, FH * 0.5f, 12f, FH) })
        {
            var wall = OiyoArcade.Prim(PrimitiveType.Cube, "Wall", packedMat, root);
            wall.transform.position = field.W(e.x, e.y, -OiyoField.U(8f));
            wall.transform.localScale = new Vector3(OiyoField.U(e.z), OiyoField.U(e.w), OiyoField.U(16f));
        }
        for (int i = 0; i + 2 < level.mud.Length; i += 3)
        {
            var q = OiyoField.Quad("Mud", mudMat, root, level.mud[i + 2] * 2.2f, level.mud[i + 2] * 1.8f);
            q.position = field.W(level.mud[i], level.mud[i + 1], 0.005f);
        }
        for (int i = 0; i + 2 < level.rocks.Length; i += 3)
        {
            var rk = OiyoArcade.Prim(PrimitiveType.Sphere, "Rock", stoneMat, root);
            float r = level.rocks[i + 2];
            rk.transform.position = field.W(level.rocks[i], level.rocks[i + 1], -OiyoField.U(r * 0.4f));
            rk.transform.localScale = new Vector3(OiyoField.U(r * 2.1f), OiyoField.U(r * 1.9f), OiyoField.U(r * 1.6f));
            var cap = OiyoArcade.Prim(PrimitiveType.Sphere, "SnowCap", packedMat, rk.transform);
            cap.transform.localPosition = new Vector3(0f, 0.12f, -0.3f);
            cap.transform.localScale = new Vector3(0.8f, 0.6f, 0.5f);
        }
        for (int i = 0; i + 3 < level.fences.Length; i += 4)
        {
            float fx = level.fences[i], fy = level.fences[i + 1], fw = level.fences[i + 2], fh = level.fences[i + 3];
            var rail = OiyoArcade.Prim(PrimitiveType.Cube, "Rail", plankMat, root);
            rail.transform.position = field.W(fx + fw * 0.5f, fy + fh * 0.5f, -OiyoField.U(14f));
            rail.transform.localScale = new Vector3(OiyoField.U(fw), OiyoField.U(fh), OiyoField.U(8f));
            bool horiz = fw > fh;
            for (float t = 0f; t <= (horiz ? fw : fh); t += 18f)
            {
                var post = OiyoArcade.Prim(PrimitiveType.Cube, "Post", plankMat, root);
                post.transform.position = field.W(horiz ? fx + t : fx + fw * 0.5f, horiz ? fy + fh * 0.5f : fy + t, -OiyoField.U(12f));
                post.transform.localScale = new Vector3(OiyoField.U(6f), OiyoField.U(6f), OiyoField.U(24f));
            }
        }
        ring = OiyoField.Quad("Spot", ringMat, root, Mathf.Max(SpotR, level.body) * 2.2f, Mathf.Max(SpotR, level.body) * 2.2f);
        ring.position = field.W(level.spotX, level.spotY, 0.004f);
        ball = OiyoArcade.Prim(PrimitiveType.Sphere, "Ball", packedMat, root).transform;
        kid = OiyoField.Quad("Kid", kidMat, root, 30f, 30f);
        bodyT = OiyoArcade.Prim(PrimitiveType.Sphere, "Body", packedMat, root).transform;
        headT = OiyoArcade.Prim(PrimitiveType.Sphere, "Head", packedMat, root).transform;
        scarfT = OiyoArcade.Prim(PrimitiveType.Cylinder, "Scarf", scarfMat, root).transform;
        faceT = OiyoField.Quad("Face", faceMat, root, 20f, 20f);
        bodyT.gameObject.SetActive(false); headT.gameObject.SetActive(false); scarfT.gameObject.SetActive(false); faceT.gameObject.SetActive(false);
    }

    void Fit()
    {
        bool portrait = field.Cam.aspect < 1f;
        field.Fit(portrait ? 120f : 96f, portrait ? 16f : 8f, Tilt);
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("snow-roll", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        Fit();
        ReadInput();
        if (state == GameState.Playing)
        {
            float before = BallR;
            Step(dt);
            if (grewThisFrame > 0f && Random.value < dt * 10f) puffs.Emit(field.W(bx, by + BallR * 0.6f, -0.1f), Color.white, 2, 0.8f, 0.14f, 0.4f);
            if (mudThisFrame && Random.value < dt * 6f) puffs.Emit(field.W(bx, by, -0.2f), new Color(0.45f, 0.3f, 0.18f), 2, 1f, 0.14f, 0.4f);
            if (bumpThisFrame && Random.value < 0.3f) synth.Tone(160f, 0.08f, Wave.Noise, 0.08f, 0f, 20f);
            if (Mathf.FloorToInt(BallR) > Mathf.FloorToInt(before) && Mathf.FloorToInt(BallR) % 3 == 0) synth.Tone(400f + BallR * 18f, 0.08f, Wave.Triangle, 0.08f, 0f, 14f);
            if (over) End();
        }
        msgT = Mathf.Max(0f, msgT - dt);
        Animate(dt);
    }

    string msg = ""; float msgT; Color msgC = Color.white;
    void Toast(string s, Color c) { msg = s; msgT = 1.2f; msgC = c; }

    void OnParked()
    {
        Toast(phase == 0 ? U("Body in place!") : U("Snowman built!"), new Color(0.6f, 0.85f, 1f));
        puffs.Emit(field.W(level.spotX, level.spotY, -0.5f), Color.white, 24, 3f, 0.24f, 0.6f);
        synth.Tone(784f, 0.16f, Wave.Triangle, 0.2f, 1175f, 7f);
    }

    void ReadInput()
    {
        bool confirm = Input.GetKeyDown(KeyCode.Return);
        switch (state)
        {
            case GameState.Ready:
            case GameState.Playing:
                {
                    if (state == GameState.Playing && (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P))) { state = GameState.Paused; fingerOn = false; return; }
                    bool touching = false; Vector2 fp = default;
                    foreach (var h in OiyoArcade.Held()) if (!OiyoArcade.OverUi(h.pos) && field.ToField(h.pos, out fp)) { touching = true; break; }
                    if (!touching) foreach (var b in OiyoArcade.Began()) if (field.ToField(b.pos, out fp)) { touching = true; break; }
                    var dir = new Vector2((Input.GetKey(KeyCode.RightArrow) || Input.GetKey(KeyCode.D) ? 1 : 0) - (Input.GetKey(KeyCode.LeftArrow) || Input.GetKey(KeyCode.A) ? 1 : 0),
                                          (Input.GetKey(KeyCode.DownArrow) || Input.GetKey(KeyCode.S) ? 1 : 0) - (Input.GetKey(KeyCode.UpArrow) || Input.GetKey(KeyCode.W) ? 1 : 0));
                    if (state == GameState.Ready && (touching || dir != Vector2.zero)) state = GameState.Playing;
                    if (touching) { fingerOn = true; finger = fp; }
                    else if (dir != Vector2.zero) { fingerOn = true; finger = new Vector2(bx + dir.x * 80f, by + dir.y * 80f); }
                    else fingerOn = false;
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

    float endTime;
    bool ResultLive => Time.unscaledTime - endTime > 0.45f;

    void End()
    {
        if (state != GameState.Playing) return;
        endTime = Time.unscaledTime;
        fingerOn = false;
        if (won)
        {
            starsWon = StarsFor();
            state = GameState.Victory;
            OiyoArcade.Record(Slug, stageIdx, starsWon, starsWon, StageCount);
            StartCoroutine(Arp(new[] { 523f, 659f, 784f, 1047f, 1319f }, 0.09f));
        }
        else
        {
            starsWon = 0;
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
        if (snowDirty)
        {
            snowDirty = false;
            for (int r = 0; r < Rows; r++)
                for (int c = 0; c < Cols; c++)
                {
                    float d = snow[r * Cols + c];
                    byte a = (byte)Mathf.RoundToInt(Mathf.Clamp01(d * 1.6f) * 255f);
                    byte v = (byte)(232 + Mathf.RoundToInt(d * 23f));
                    snowPx[(Rows - 1 - r) * Cols + c] = new Color32((byte)(v - 6), (byte)(v - 2), v, a);
                }
            snowTex.SetPixels32(snowPx);
            snowTex.Apply();
        }
        float r0 = BallR;
        bool rolling = phase < 2 || (!won && !big);
        ball.gameObject.SetActive(rolling && !(phase == 2));
        ball.position = field.W(bx, by, -OiyoField.U(r0));
        ball.localScale = Vector3.one * OiyoField.U(r0 * 2f);
        var vw = new Vector3(bvx, -bvy, 0f) / OiyoField.PX;
        if (dt > 0f && vw.sqrMagnitude > 1e-6f)
        {
            var axis = Vector3.Cross(Vector3.back, vw.normalized);
            ball.Rotate(axis, vw.magnitude * dt / OiyoField.U(r0) * Mathf.Rad2Deg, Space.World);
        }
        // the kid pushes from behind the ball
        float sp = Mathf.Sqrt(bvx * bvx + bvy * bvy);
        float dx = sp > 5f ? -bvx / sp : 0f, dy = sp > 5f ? -bvy / sp : 1f;
        kid.gameObject.SetActive(ball.gameObject.activeSelf);
        Stand(kid, bx + dx * (r0 + 12f), by + dy * (r0 + 12f), 30f, 0f);
        ring.gameObject.SetActive(phase == 0);
        // the parked body, and the head once it is lifted on
        bool body = phase >= 1;
        bodyT.gameObject.SetActive(body);
        scarfT.gameObject.SetActive(body);
        if (body)
        {
            bodyT.position = field.W(level.spotX, level.spotY, -OiyoField.U(bodyR));
            bodyT.localScale = Vector3.one * OiyoField.U(bodyR * 2f);
            scarfT.position = field.W(level.spotX, level.spotY, -OiyoField.U(bodyR * 1.9f));
            scarfT.rotation = Quaternion.Euler(90f, 0f, 0f);
            scarfT.localScale = new Vector3(OiyoField.U(bodyR * 1.1f), OiyoField.U(3f), OiyoField.U(bodyR * 1.1f));
        }
        bool headOn = phase == 2 && won;
        headT.gameObject.SetActive(headOn && HasHead);
        faceT.gameObject.SetActive(headOn);
        if (headOn)
        {
            float hr = HasHead ? r0 : bodyR * 0.55f;
            float top = HasHead ? bodyR * 2f + hr * 0.8f : bodyR * 1.2f;
            headT.position = field.W(level.spotX, level.spotY, -OiyoField.U(top));
            headT.localScale = Vector3.one * OiyoField.U(hr * 2f);
            faceT.rotation = field.Cam.transform.rotation;
            faceT.position = field.W(level.spotX, level.spotY, -OiyoField.U(top)) - field.Cam.transform.forward * OiyoField.U(hr + 1f);
            faceT.localScale = new Vector3(OiyoField.U(hr * 1.3f), OiyoField.U(hr * 1.3f), 1f);
        }
    }

    // ?oiyotest=1 prints the run state to the browser console for the automated play check.
    bool testLog; float testT;
    void TestTick(float dt)
    {
        if (!testLog || (testT -= dt) > 0f) return;
        testT = 0.1f;
        var o = field.Cam.WorldToScreenPoint(field.W(0f, 0f));
        var o2 = field.Cam.WorldToScreenPoint(field.W(FW, FH));
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"t\":{time:F1},\"phase\":{phase},\"r\":{BallR:F1},\"ball\":[{bx:F0},{by:F0}],\"spot\":[{level.spotX:F0},{level.spotY:F0}],\"body\":{level.body:F0},\"o\":[{o.x:F0},{o.y:F0}],\"o2\":[{o2.x:F0},{o2.y:F0}],\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.11f, 0.49f, 0.84f, 0.97f);
    static readonly Color Dark = new Color(0.08f, 0.16f, 0.26f, 0.86f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + (SnowRollStages.All[i].head.Length == 4 ? U("Body and head") : U("Body only"));

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(0.85f, 0.95f, 1f), U("Snowball Roll"),
                U("Roll a snowball over fresh snow to grow it, park the body on the spot and lift on a head that isn't too big."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        var bar = new Rect(8f, 8f, w - 16f, 64f);
        OiyoArcade.Panel(bar, Dark);
        float r = BallR;
        string size = phase == 1 && HasHead
            ? F("Head {0} ({1}–{2})", Mathf.RoundToInt(r), level.head[2], level.head[3])
            : F("Body {0}/{1}", Mathf.RoundToInt(phase == 0 ? r : bodyR), level.body);
        Color sc = phase == 1 && HasHead && r > level.head[3] * 0.92f ? new Color(1f, 0.5f, 0.45f) : Color.white;
        OiyoArcade.Text(new Rect(20f, 12f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>   " + F("{0} s left", Mathf.CeilToInt(Mathf.Max(0f, level.timeLimit - time))), 15, new Color(0.85f, 0.95f, 1f));
        OiyoArcade.Text(new Rect(20f, 36f, w - 90f, 24f), size, 16, sc);
        if (OiyoArcade.Button(new Rect(w - 60f, 14f, 44f, 44f), "<b>II</b>", OiyoScreens.Slate, 18))
        {
            if (state == GameState.Playing) { state = GameState.Paused; fingerOn = false; }
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (msgT > 0f) OiyoArcade.Shadowed(new Rect(8f, 80f, w - 16f, 36f), msg, 22, msgC, TextAnchor.MiddleCenter);
        else if (state == GameState.Playing && phase == 1) OiyoArcade.Shadowed(new Rect(8f, 80f, w - 16f, 30f), U("Now the head! Too big and you can't lift it"), 15, new Color(1f, 0.9f, 0.6f), TextAnchor.MiddleCenter);
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Hold and drag to roll the snowball"), U("Fresh snow makes it grow. Mud shrinks it, rocks and fences block it. Park the body on the blue circle."), 150f, 110f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            bool w0 = state == GameState.Victory;
            string detail = w0 ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : "";
            string body = w0 ? F("Built in {0} s", Mathf.CeilToInt(time)) : F("Body {0}/{1}", Mathf.RoundToInt(phase == 0 ? r : bodyR), level.body);
            int res = OiyoScreens.Result(w, h, Dark, Accent, w0, ResultLive, w0 ? U("Snowman built!") : big ? U("The head got too big to lift") : U("Out of time"), detail, body,
                w0 && stageIdx < StageCount - 1 ? U("Next stage") : null, w0 && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (res == 1) LoadStage(stageIdx + 1); else if (res == 2) LoadStage(stageIdx); else if (res == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
