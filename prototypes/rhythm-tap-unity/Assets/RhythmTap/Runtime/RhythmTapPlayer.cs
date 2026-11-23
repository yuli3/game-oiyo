using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Beat Lane 3D: the web Rhythm Tap (src/components/games/RhythmTap.tsx, src/lib/games/rhythm-beatmap.ts)
// rebuilt as a 30-stage Unity game. Same contract as the web beatmap: the chart is a list of
// {beat, lane}, note position comes from time until arrival, and judgement is in milliseconds
// (perfect 45 ms, good 95 ms) so scroll speed never widens the windows. The song is synthesized
// from the chart, so every stage has its own tune. Keys D F J K / arrows, or tap the lanes.
public class RhythmTapPlayer : MonoBehaviour
{
    const string Slug = "rhythm-tap";
    const int StageCount = 30;
    const float PerfectS = 0.045f, GoodS = 0.095f, MissS = 0.13f;
    const float LaneW = 1.7f, TrackLen = 34f;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    struct StageDef { public int zone, lanes, density, beats; public float bpm, approach, chord, required; }
    static readonly string[] ZoneNames = { "Warm-Up Street", "Neon Avenue", "Bass Bridge", "Chord Tunnel", "Overdrive", "Starlight Finale" };
    static readonly Color[] LaneColors = { new Color(1f, 0.35f, 0.55f), new Color(0.35f, 0.8f, 1f), new Color(0.55f, 1f, 0.45f), new Color(1f, 0.8f, 0.3f) };
    static readonly Color[] ZoneTint = { new Color(0.12f, 0.08f, 0.22f), new Color(0.1f, 0.04f, 0.2f), new Color(0.02f, 0.1f, 0.2f), new Color(0.16f, 0.04f, 0.14f), new Color(0.2f, 0.06f, 0.04f), new Color(0.02f, 0.02f, 0.1f) };

    StageDef[] stages;
    int stageIdx;
    StageDef S => stages[stageIdx];

    class Note { public float time; public int lane; public bool done; public GameObject go; }
    readonly List<Note> notes = new List<Note>();
    float songTime, songLength, leadIn, beatLen;
    double startClock;
    int perfect, good, miss, combo, maxCombo, score, stars;
    float life;
    string endReason = "";
    string judgeText = ""; float judgeTimer; Color judgeColor;

    Camera cam;
    Transform root;
    Material trackMat, backdropMat;
    readonly List<Material> noteMats = new List<Material>();
    readonly List<Transform> pads = new List<Transform>();
    readonly List<Material> padMats = new List<Material>();
    readonly float[] padFlash = new float[4];
    readonly List<Transform> pillars = new List<Transform>();
    Bursts bursts;
    Synth synth;
    AudioSource music;
    AudioClip songClip;
    bool showStages;
    float menuOrbit, beatPulse;

    static readonly KeyCode[][] Keys4 = {
        new[] { KeyCode.D, KeyCode.LeftArrow }, new[] { KeyCode.F, KeyCode.DownArrow },
        new[] { KeyCode.J, KeyCode.UpArrow }, new[] { KeyCode.K, KeyCode.RightArrow } };
    static readonly KeyCode[][] Keys3 = {
        new[] { KeyCode.D, KeyCode.LeftArrow }, new[] { KeyCode.F, KeyCode.J, KeyCode.DownArrow, KeyCode.UpArrow, KeyCode.Space }, new[] { KeyCode.K, KeyCode.RightArrow } };
    static readonly KeyCode[][] Keys2 = {
        new[] { KeyCode.D, KeyCode.F, KeyCode.LeftArrow }, new[] { KeyCode.J, KeyCode.K, KeyCode.RightArrow } };
    static readonly string[] KeyLabel4 = { "D", "F", "J", "K" }, KeyLabel3 = { "D", "F·J", "K" }, KeyLabel2 = { "F", "J" };

    void Awake()
    {
        Application.targetFrameRate = 60;
        BuildStages();
        SetupScene();
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        LoadStage(stageIdx, false);
    }

    void BuildStages()
    {
        stages = new StageDef[StageCount];
        for (int i = 0; i < StageCount; i++)
        {
            int zone = i / 5, k = i % 5;
            stages[i] = new StageDef
            {
                zone = zone,
                lanes = zone == 0 ? 2 : zone == 1 ? 3 : 4,
                density = zone >= 2 && (k >= 2 || zone >= 4) ? 2 : 1,
                bpm = 92f + i * 2.2f,
                approach = Mathf.Lerp(2.0f, 1.15f, i / 29f),
                beats = 32 + k * 4 + zone * 4,
                chord = zone >= 3 ? 0.08f + (zone - 3) * 0.05f : 0f,
                required = 0.6f + zone * 0.04f,
            };
        }
    }

    // ---------------- Scene ----------------
    void SetupScene()
    {
        cam = new GameObject("Camera").AddComponent<Camera>();
        cam.fieldOfView = 55f;
        cam.clearFlags = CameraClearFlags.SolidColor;
        cam.farClipPlane = 300f;
        var light = new GameObject("Key").AddComponent<Light>();
        light.type = LightType.Directional;
        light.intensity = 0.8f;
        light.transform.rotation = Quaternion.Euler(60f, 10f, 0f);
        RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat;
        RenderSettings.ambientLight = new Color(0.4f, 0.4f, 0.5f);

        backdropMat = OiyoArcade.Textured(OiyoArcade.Art("RT/skyline"));
        var bd = OiyoArcade.Prim(PrimitiveType.Quad, "Backdrop", backdropMat);
        bd.transform.position = new Vector3(0f, 10f, 70f);
        bd.transform.localScale = new Vector3(160f, 60f, 1f);

        trackMat = OiyoArcade.Textured(OiyoArcade.Art("RT/track", true));
        bursts = new Bursts(transform, 0.3f);
        synth = new Synth(gameObject);
        music = gameObject.AddComponent<AudioSource>();
        music.playOnAwake = false;
        music.volume = 0.75f;
        for (int i = 0; i < 4; i++) noteMats.Add(OiyoArcade.Glow(Color.Lerp(LaneColors[i], Color.white, 0.25f)));
    }

    float LaneX(int lane) => (lane - (S.lanes - 1) * 0.5f) * LaneW;

    void LoadStage(int idx, bool ready = true)
    {
        stageIdx = Mathf.Clamp(idx, 0, StageCount - 1);
        music.Stop();
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Stage").transform;
        notes.Clear(); pads.Clear(); padMats.Clear(); pillars.Clear();

        cam.backgroundColor = ZoneTint[S.zone];
        backdropMat.color = Color.Lerp(Color.white, ZoneTint[S.zone] * 3f, 0.35f);

        float trackW = S.lanes * LaneW + 0.6f;
        var track = OiyoArcade.Prim(PrimitiveType.Quad, "Track", trackMat, root);
        track.transform.rotation = Quaternion.Euler(90f, 0f, 0f);
        track.transform.position = new Vector3(0f, 0f, TrackLen * 0.5f - 2f);
        track.transform.localScale = new Vector3(trackW, TrackLen + 4f, 1f);
        trackMat.mainTextureScale = new Vector2(S.lanes / 4f, 4f);

        for (int l = 0; l < S.lanes; l++)
        {
            var pm = OiyoArcade.LitGlow(LaneColors[l] * 0.5f, LaneColors[l] * 0.25f, 0.6f);
            padMats.Add(pm);
            var pad = OiyoArcade.Prim(PrimitiveType.Cube, "Pad", pm, root);
            pad.transform.position = new Vector3(LaneX(l), 0.08f, 0f);
            pad.transform.localScale = new Vector3(LaneW - 0.2f, 0.16f, 0.9f);
            pads.Add(pad.transform);
            if (l > 0)
            {
                var div = OiyoArcade.Prim(PrimitiveType.Cube, "Divider", OiyoArcade.Glow(new Color(1f, 1f, 1f, 1f) * 0.35f), root);
                div.transform.position = new Vector3((LaneX(l) + LaneX(l - 1)) * 0.5f, 0.01f, TrackLen * 0.5f - 2f);
                div.transform.localScale = new Vector3(0.04f, 0.02f, TrackLen + 4f);
            }
        }
        var hit = OiyoArcade.Prim(PrimitiveType.Cube, "HitLine", OiyoArcade.Glow(new Color(1f, 1f, 1f)), root);
        hit.transform.position = new Vector3(0f, 0.03f, 0.5f);
        hit.transform.localScale = new Vector3(trackW, 0.04f, 0.08f);
        for (int s = -1; s <= 1; s += 2)
            for (int i = 0; i < 9; i++)
            {
                var p = OiyoArcade.Prim(PrimitiveType.Cube, "Pillar", OiyoArcade.Glow(LaneColors[(i + (s > 0 ? 2 : 0)) % 4] * 0.85f), root);
                p.transform.position = new Vector3(s * (trackW * 0.5f + 1.2f + (i % 2) * 0.8f), 0f, 2f + i * 4f);
                p.transform.localScale = new Vector3(0.5f, 1f, 0.5f);
                pillars.Add(p.transform);
            }

        GenerateChart();
        perfect = good = miss = combo = maxCombo = score = stars = 0;
        life = 100f;
        songTime = -leadIn;
        endReason = "";
        judgeText = "";
        showStages = false;
        state = ready ? GameState.Ready : GameState.Menu;
        PositionNotes();
    }

    void GenerateChart()
    {
        var rng = new System.Random(4242 + stageIdx * 131);
        beatLen = 60f / S.bpm;
        leadIn = Mathf.Max(S.approach + 0.6f, beatLen * 4f);
        int slotsPerBeat = S.density;
        int lastLane = -1;
        for (int b = 0; b < S.beats * slotsPerBeat; b++)
        {
            float beat = b / (float)slotsPerBeat;
            bool onBeat = b % slotsPerBeat == 0;
            double p = onBeat ? 0.82 : 0.38;
            if ((int)beat % 8 == 7 && !onBeat) p = 0.7; // fills at phrase ends
            if (rng.NextDouble() > p) continue;
            int lane = rng.Next(S.lanes);
            if (lane == lastLane && rng.NextDouble() < 0.55) lane = (lane + 1 + rng.Next(S.lanes - 1)) % S.lanes;
            lastLane = lane;
            AddNote(beat, lane);
            if (S.chord > 0f && onBeat && rng.NextDouble() < S.chord * 2.2)
            {
                int other = (lane + 1 + rng.Next(S.lanes - 1)) % S.lanes;
                AddNote(beat, other);
            }
        }
        songLength = (S.beats + 2) * beatLen;
        BuildSong();
    }

    void AddNote(float beat, int lane)
    {
        var go = OiyoArcade.Prim(PrimitiveType.Cube, "Note", noteMats[lane], root);
        go.transform.localScale = new Vector3(LaneW - 0.35f, 0.32f, 0.5f);
        var halo = OiyoArcade.GlowQuad("Glow", new Color(LaneColors[lane].r, LaneColors[lane].g, LaneColors[lane].b, 0.5f), 2.2f, go.transform);
        halo.transform.localRotation = Quaternion.Euler(90f, 0f, 0f);
        halo.transform.localPosition = new Vector3(0f, -0.4f, 0f);
        halo.transform.localScale = new Vector3(1.2f, 2.4f, 1f);
        notes.Add(new Note { time = beat * beatLen, lane = lane, go = go });
    }

    // Synthesized backing track: kick, snare, hats, a bass line and a pluck on every chart note.
    void BuildSong()
    {
        float total = leadIn + songLength + 1f;
        var buf = new float[Mathf.CeilToInt(total * Synth.Rate)];
        int[] scale = { 0, 2, 4, 7, 9, 12, 14, 16 };
        int[][] prog = { new[] { 0, 7, 9, 5 }, new[] { 9, 5, 0, 7 }, new[] { 0, 5, 9, 7 } };
        int[] chords = prog[stageIdx % 3];
        float root = 110f * Mathf.Pow(2f, ((stageIdx * 5) % 12) / 12f);
        int totalBeats = S.beats + 2;
        for (int b = -4; b < totalBeats; b++)
        {
            float t = leadIn + b * beatLen;
            if (t < 0f) continue;
            bool lead = b < 0;
            Synth.Render(buf, t, 120f, 0.18f, Wave.Sine, lead ? 0.25f : 0.5f, 45f, 18f, b);
            if (lead) { Synth.Render(buf, t, 1400f, 0.05f, Wave.Noise, 0.12f, 0f, 60f, b + 3); continue; }
            if (b % 2 == 1) Synth.Render(buf, t, 200f, 0.16f, Wave.Noise, 0.22f, 0f, 22f, b + 7);
            Synth.Render(buf, t + beatLen * 0.5f, 6000f, 0.04f, Wave.Noise, 0.08f, 0f, 80f, b + 11);
            int ch = chords[(b / 4) % 4];
            float bass = root * Mathf.Pow(2f, ch / 12f) * 0.5f;
            Synth.Render(buf, t, bass, beatLen * 0.9f, Wave.Triangle, 0.22f, 0f, 3f, 1);
        }
        foreach (var n in notes)
        {
            int ch = chords[((int)(n.time / beatLen) / 4) % 4];
            int deg = scale[(n.lane * 2 + (int)(n.time / beatLen)) % scale.Length];
            float f = root * 2f * Mathf.Pow(2f, (ch + deg) / 12f);
            Synth.Render(buf, leadIn + n.time, f, 0.28f, Wave.Square, 0.08f, 0f, 9f, 2);
        }
        float peak = 0f;
        foreach (var v in buf) peak = Mathf.Max(peak, Mathf.Abs(v));
        if (peak > 0.95f) for (int i = 0; i < buf.Length; i++) buf[i] *= 0.95f / peak;
        if (songClip != null) Destroy(songClip);
        songClip = AudioClip.Create("song", buf.Length, 1, Synth.Rate, false);
        songClip.SetData(buf, 0);
        music.clip = songClip;
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("rhythm-tap", state, score);
        float dt = Time.deltaTime;
        ReadInput();
        if (state == GameState.Playing)
        {
            songTime = (float)(Time.realtimeSinceStartupAsDouble - startClock) - leadIn;
            foreach (var n in notes)
            {
                if (n.done || songTime - n.time <= MissS) continue;
                n.done = true;
                n.go.SetActive(false);
                Miss();
                if (state != GameState.Playing) break;
            }
            if (state == GameState.Playing && songTime > songLength) Finish();
            float beatPhase = Mathf.Repeat((songTime) / beatLen, 1f);
            beatPulse = Mathf.Exp(-beatPhase * 6f);
        }
        PositionNotes();
        for (int l = 0; l < pads.Count; l++)
        {
            padFlash[l] = Mathf.MoveTowards(padFlash[l], 0f, dt * 5f);
            var c = LaneColors[l];
            padMats[l].color = Color.Lerp(c * 0.55f, Color.Lerp(c, Color.white, 0.5f), padFlash[l]);
            pads[l].localScale = new Vector3(LaneW - 0.2f, 0.16f + padFlash[l] * 0.12f, 0.9f);
        }
        for (int i = 0; i < pillars.Count; i++)
            pillars[i].localScale = new Vector3(0.5f, 1f + beatPulse * (2f + (i % 3)), 0.5f);
        judgeTimer -= dt;
        trackMat.mainTextureOffset = new Vector2(0f, -songTime * 0.5f);
        UpdateCamera(dt);
    }

    void PositionNotes()
    {
        float speed = TrackLen / S.approach;
        foreach (var n in notes)
        {
            if (n.done) continue;
            float z = (n.time - songTime) * speed + 0.5f;
            bool vis = z < TrackLen && z > -2f;
            n.go.SetActive(vis);
            if (vis) n.go.transform.position = new Vector3(LaneX(n.lane), 0.3f, z);
        }
    }

    void ReadInput()
    {
        bool any = Input.GetKeyDown(KeyCode.Space) || Input.GetKeyDown(KeyCode.Return);
        var presses = OiyoArcade.Began();
        switch (state)
        {
            case GameState.Ready:
                if (any || presses.Count > 0 || AnyLaneKey()) StartSong();
                return;
            case GameState.Playing:
                if (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P)) { Pause(); return; }
                var keys = S.lanes == 4 ? Keys4 : S.lanes == 3 ? Keys3 : Keys2;
                for (int l = 0; l < keys.Length; l++)
                    foreach (var k in keys[l]) if (Input.GetKeyDown(k)) { Hit(l); break; }
                foreach (var p in presses) Hit(LaneAtScreen(p.pos));
                return;
            case GameState.Paused:
                if (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P)) Resume();
                return;
            case GameState.Victory:
            case GameState.GameOver:
                if (any) LoadStage(state == GameState.Victory ? Mathf.Min(stageIdx + 1, StageCount - 1) : stageIdx);
                return;
            case GameState.Menu:
                if (!showStages && any) LoadStage(stageIdx);
                return;
        }
    }

    bool AnyLaneKey()
    {
        foreach (var set in Keys4) foreach (var k in set) if (Input.GetKeyDown(k)) return true;
        return false;
    }

    int LaneAtScreen(Vector2 screen)
    {
        int best = 0; float bestD = float.MaxValue;
        for (int l = 0; l < pads.Count; l++)
        {
            var sp = cam.WorldToScreenPoint(pads[l].position);
            float d = Mathf.Abs(sp.x - screen.x);
            if (d < bestD) { bestD = d; best = l; }
        }
        return best;
    }

    void StartSong()
    {
        startClock = Time.realtimeSinceStartupAsDouble;
        songTime = -leadIn;
        music.time = 0f;
        music.Play();
        state = GameState.Playing;
    }

    double pausedAt;
    void Pause()
    {
        pausedAt = Time.realtimeSinceStartupAsDouble;
        music.Pause();
        state = GameState.Paused;
    }
    void Resume()
    {
        startClock += Time.realtimeSinceStartupAsDouble - pausedAt;
        music.time = Mathf.Clamp(songTime + leadIn, 0f, songClip.length - 0.01f);
        music.UnPause();
        state = GameState.Playing;
    }

    void Hit(int lane)
    {
        if (lane < 0 || lane >= S.lanes) return;
        padFlash[lane] = 0.6f;
        Note best = null; float bestD = float.MaxValue;
        foreach (var n in notes)
        {
            if (n.done || n.lane != lane) continue;
            float d = Mathf.Abs(n.time - songTime);
            if (d < bestD) { bestD = d; best = n; }
            if (n.time - songTime > MissS) break;
        }
        if (best == null || bestD > GoodS)
        {
            synth.Tone(180f, 0.05f, Wave.Noise, 0.08f, 0f, 40f);
            return;
        }
        best.done = true;
        best.go.SetActive(false);
        padFlash[lane] = 1f;
        combo++;
        maxCombo = Mathf.Max(maxCombo, combo);
        float mult = 1f + Mathf.Min(combo, 100) / 50f;
        var pos = new Vector3(LaneX(lane), 0.4f, 0.5f);
        if (bestD <= PerfectS)
        {
            perfect++;
            score += Mathf.RoundToInt(300 * mult);
            life = Mathf.Min(100f, life + 2f);
            Judge(U("PERFECT"), new Color(1f, 0.9f, 0.35f));
            bursts.Emit(pos, LaneColors[lane], 20, 5f, 0.35f, 0.5f, Vector3.up * 2f);
        }
        else
        {
            good++;
            score += Mathf.RoundToInt(120 * mult);
            life = Mathf.Min(100f, life + 1f);
            Judge(U("GOOD"), new Color(0.5f, 0.9f, 1f));
            bursts.Emit(pos, LaneColors[lane], 10, 3.5f, 0.28f, 0.4f, Vector3.up * 1.5f);
        }
    }

    void Miss()
    {
        miss++;
        combo = 0;
        life -= S.zone >= 3 ? 13f : 10f;
        Judge(U("MISS"), new Color(1f, 0.4f, 0.4f));
        if (life <= 0f)
        {
            life = 0f;
            endReason = U("Your energy ran out!");
            Lose();
        }
    }

    void Judge(string t, Color c) { judgeText = t; judgeColor = c; judgeTimer = 0.5f; }

    float Accuracy => notes.Count == 0 ? 0f : (perfect + good * 0.6f) / notes.Count;

    void Finish()
    {
        float acc = Accuracy;
        if (acc >= S.required)
        {
            state = GameState.Victory;
            stars = 1 + (acc >= 0.85f ? 1 : 0) + (acc >= 0.95f ? 1 : 0);
            OiyoArcade.Record(Slug, stageIdx, stars, score, StageCount);
            StartCoroutine(Arp(new[] { 523f, 659f, 784f, 1047f, 1319f }, 0.09f));
            for (int l = 0; l < S.lanes; l++) bursts.Emit(new Vector3(LaneX(l), 0.5f, 1f), LaneColors[l], 30, 6f, 0.35f);
        }
        else
        {
            endReason = F("Accuracy {0}% · you needed {1}%", Mathf.RoundToInt(acc * 100f), Mathf.RoundToInt(S.required * 100f));
            Lose();
        }
    }

    void Lose()
    {
        state = GameState.GameOver;
        music.Stop();
        synth.Tone(260f, 0.5f, Wave.Saw, 0.25f, 80f, 3f);
    }

    IEnumerator Arp(float[] fs, float gap)
    {
        foreach (var f in fs) { synth.Tone(f, 0.2f, Wave.Triangle, 0.3f, 0f, 6f); yield return new WaitForSeconds(gap); }
    }

    void UpdateCamera(float dt)
    {
        float trackW = S.lanes * LaneW + 0.6f;
        float vfov = cam.fieldOfView * Mathf.Deg2Rad;
        float hfov = 2f * Mathf.Atan(Mathf.Tan(vfov * 0.5f) * cam.aspect);
        // keep the whole hit line in view on a narrow portrait phone
        float back = Mathf.Max(6f, (trackW * 0.5f + 0.8f) / Mathf.Tan(hfov * 0.5f) * 0.75f);
        float yaw = 0f;
        if (state == GameState.Menu) { menuOrbit += dt; yaw = Mathf.Sin(menuOrbit * 0.5f) * 12f; }
        Vector3 look = new Vector3(0f, 0f, 9f);
        Vector3 pos = Quaternion.Euler(0f, yaw, 0f) * new Vector3(0f, back * 0.75f + 1.5f, -back) + Vector3.up * beatPulse * 0.08f;
        cam.transform.position = pos;
        cam.transform.LookAt(look);
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.85f, 0.25f, 0.6f, 0.97f);
    static readonly Color Dark = new Color(0.05f, 0.03f, 0.12f, 0.84f);
    static readonly Color Gold = new Color(1f, 0.8f, 0.25f, 0.97f);
    static readonly Color Slate = new Color(0.22f, 0.2f, 0.4f, 0.95f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + U(ZoneNames[stages[i].zone]);

    void OnGUI()
    {
        OiyoArcade.Begin();
        float w = OiyoArcade.W, h = OiyoArcade.H;
        if (state == GameState.Menu) { DrawMenu(w, h); return; }
        var bar = new Rect(8f, 8f, w - 16f, 58f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 12f, w - 140f, 24f), "<b>" + StageTitle(stageIdx) + "</b>", 16, new Color(1f, 0.7f, 0.9f));
        OiyoArcade.Text(new Rect(20f, 36f, w - 140f, 24f), $"{U("Score")} <b>{score}</b>   {U("Combo")} <b>{combo}</b>   {U("Accuracy")} <b>{Mathf.RoundToInt(LiveAccuracy() * 100f)}%</b>", 15, Color.white);
        if (OiyoArcade.Button(new Rect(w - 64f, 14f, 46f, 46f), "<b>II</b>", Slate, 18))
        {
            if (state == GameState.Playing) Pause();
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        OiyoArcade.Bar(new Rect(16f, 70f, w - 32f, 10f), life / 100f, new Color(0f, 0f, 0f, 0.4f), life < 30f ? new Color(1f, 0.35f, 0.35f) : new Color(0.4f, 1f, 0.6f));
        float prog = Mathf.Clamp01((songTime) / songLength);
        OiyoArcade.Bar(new Rect(16f, 84f, w - 32f, 4f), prog, new Color(0f, 0f, 0f, 0.3f), new Color(1f, 1f, 1f, 0.7f));

        if (judgeTimer > 0f && state == GameState.Playing)
        {
            float s = 1f + judgeTimer * 0.5f;
            OiyoArcade.Shadowed(new Rect(0f, h * 0.36f, w, 50f), judgeText, Mathf.RoundToInt(30 * s), judgeColor, TextAnchor.MiddleCenter);
            if (combo >= 5) OiyoArcade.Shadowed(new Rect(0f, h * 0.36f + 44f, w, 30f), F("{0} combo", combo), 18, Color.white, TextAnchor.MiddleCenter);
        }
        if (state == GameState.Playing && songTime < 0f)
        {
            int count = Mathf.CeilToInt(-songTime / beatLen);
            if (count <= 4) OiyoArcade.Shadowed(new Rect(0f, h * 0.3f, w, 80f), count.ToString(), 60, Color.white, TextAnchor.MiddleCenter);
        }
        if (state == GameState.Ready || (state == GameState.Playing && songTime < 0f))
        {
            var labels = S.lanes == 4 ? KeyLabel4 : S.lanes == 3 ? KeyLabel3 : KeyLabel2;
            for (int l = 0; l < pads.Count; l++)
            {
                var sp = cam.WorldToScreenPoint(pads[l].position + Vector3.back * 0.6f);
                var g = OiyoArcade.ToGui(sp);
                OiyoArcade.Shadowed(new Rect(g.x - 40f, g.y, 80f, 30f), labels[l], 20, LaneColors[l], TextAnchor.MiddleCenter);
            }
        }
        if (state == GameState.Ready)
        {
            var r = new Rect(w * 0.5f - 170f, h * 0.45f, 340f, 92f);
            OiyoArcade.Panel(r, Dark);
            OiyoArcade.Text(new Rect(r.x + 12f, r.y + 8f, r.width - 24f, r.height - 16f),
                $"<b>{U("Tap a lane or press a key to start")}</b>\n<size=14>{F("Hit the notes on the line · reach {0}% accuracy", Mathf.RoundToInt(S.required * 100f))}</size>", 17, Color.white, TextAnchor.MiddleCenter);
        }
        if (state == GameState.Paused) DrawPause(w, h);
        if (state == GameState.Victory || state == GameState.GameOver) DrawResult(w, h);
    }

    float LiveAccuracy()
    {
        int judged = perfect + good + miss;
        return judged == 0 ? 1f : (perfect + good * 0.6f) / judged;
    }

    void DrawMenu(float w, float h)
    {
        if (showStages)
        {
            float bw = Mathf.Min(w - 16f, 760f);
            var box = new Rect(w * 0.5f - bw * 0.5f, 12f, bw, h - 24f);
            OiyoArcade.Panel(box, new Color(0.05f, 0.03f, 0.12f, 0.93f));
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
        OiyoArcade.Shadowed(new Rect(card.x, card.y + 18f, cw, 40f), U("Beat Lane 3D"), 30, new Color(1f, 0.7f, 0.9f), TextAnchor.MiddleCenter);
        OiyoArcade.Text(new Rect(card.x + 20f, card.y + 62f, cw - 40f, 46f), U("Hit each note as it crosses the line. Every stage plays its own tune."), 15, new Color(1f, 1f, 1f, 0.85f), TextAnchor.MiddleCenter);
        OiyoArcade.Text(new Rect(card.x, card.y + 110f, cw, 24f), StageTitle(stageIdx) + $" · {Mathf.RoundToInt(S.bpm)} BPM", 15, Gold, TextAnchor.MiddleCenter);
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
        if (OiyoArcade.Button(new Rect(card.x + 24f, card.y + 70f, cw - 48f, 52f), "▶ " + U("Resume"), Accent, 19)) Resume();
        if (OiyoArcade.Button(new Rect(card.x + 24f, card.y + 132f, cw - 48f, 46f), U("Restart"), Slate, 17)) LoadStage(stageIdx);
        if (OiyoArcade.Button(new Rect(card.x + 24f, card.y + 188f, cw - 48f, 46f), U("Stage list"), Slate, 17)) { LoadStage(stageIdx, false); showStages = true; }
    }

    void DrawResult(float w, float h)
    {
        bool won = state == GameState.Victory;
        float cw = Mathf.Min(360f, w - 24f);
        // sized to its buttons so a loss card has no empty band at the bottom
        float ch = 158f + (won ? 58f : 0f) + 52f + 40f + 18f;
        var card = new Rect(w * 0.5f - cw * 0.5f, h * 0.5f - ch * 0.5f, cw, ch);
        OiyoArcade.Panel(card, Dark);
        OiyoArcade.Shadowed(new Rect(card.x, card.y + 14f, cw, 38f), won ? U("Stage clear!") : U("Game over"), 28, won ? new Color(0.6f, 1f, 0.65f) : new Color(1f, 0.55f, 0.5f), TextAnchor.MiddleCenter);
        string detail = won ? $"<size=30>{OiyoArcade.StarString(stars)}</size>" : endReason;
        OiyoArcade.Text(new Rect(card.x + 16f, card.y + 56f, cw - 32f, 44f), detail, 16, Color.white, TextAnchor.MiddleCenter);
        OiyoArcade.Text(new Rect(card.x + 16f, card.y + 100f, cw - 32f, 48f),
            $"{U("Score")} <b>{score}</b>   {U("Accuracy")} <b>{Mathf.RoundToInt(Accuracy * 100f)}%</b>\n<size=14>{U("PERFECT")} {perfect} · {U("GOOD")} {good} · {U("MISS")} {miss} · {U("Best combo")} {maxCombo}</size>", 16, Color.white, TextAnchor.MiddleCenter);
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
